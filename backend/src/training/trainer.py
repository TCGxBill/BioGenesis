"""
Training Pipeline for Binding Site Prediction
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.tensorboard import SummaryWriter
from tqdm import tqdm
import numpy as np
import os
import json
from pathlib import Path


class BindingSiteTrainer:
    """Main trainer class"""
    
    def __init__(self, model, config, device='cuda'):
        self.model = model.to(device)
        self.config = config
        self.device = device
        
        # Loss function
        self.criterion = self._get_loss_function()
        
        # Optimizer
        self.optimizer = self._get_optimizer()
        
        # Scheduler
        self.scheduler = self._get_scheduler()
        
        # Tracking
        self.best_val_loss = float('inf')
        self.best_val_auc = 0.0
        self.patience_counter = 0
        
        # Logging
        if config.get('use_tensorboard', True):
            log_dir = config.get('tensorboard_dir', './runs')
            self.writer = SummaryWriter(log_dir)
        else:
            self.writer = None
        
        # Checkpoint directory
        self.checkpoint_dir = Path(config.get('checkpoint_dir', './checkpoints'))
        self.checkpoint_dir.mkdir(exist_ok=True)
    
    def _get_loss_function(self):
        """Initialize loss function"""
        loss_type = self.config.get('loss_fn', 'weighted_bce')
        
        if loss_type == 'bce':
            return nn.BCEWithLogitsLoss()
        
        elif loss_type == 'weighted_bce':
            # Use dynamic pos_weight from config or default to aggressive 10.0
            pos_weight = torch.tensor([self.config.get('pos_weight', 10.0)])
            print(f"   Using pos_weight: {pos_weight.item():.1f}")
            return nn.BCEWithLogitsLoss(pos_weight=pos_weight.to(self.device))
        
        elif loss_type == 'focal':
            # More aggressive alpha for binding sites (rare class)
            alpha = self.config.get('focal_alpha', 0.75)  # Higher weight for positive class
            gamma = self.config.get('focal_gamma', 2.0)
            print(f"   Using Focal Loss (alpha={alpha}, gamma={gamma})")
            return FocalLoss(alpha=alpha, gamma=gamma)
        
        elif loss_type == 'dice':
            # Dice Loss - directly optimizes F1
            smooth = self.config.get('dice_smooth', 1.0)
            print(f"   Using Dice Loss (smooth={smooth})")
            return DiceLoss(smooth=smooth)
        
        elif loss_type == 'tversky':
            # Tversky Loss - tune precision/recall
            alpha = self.config.get('tversky_alpha', 0.3)  # FP weight
            beta = self.config.get('tversky_beta', 0.7)    # FN weight
            print(f"   Using Tversky Loss (alpha={alpha}, beta={beta})")
            return TverskyLoss(alpha=alpha, beta=beta)
        
        elif loss_type == 'combined':
            # Combined BCE + Dice
            bce_weight = self.config.get('bce_weight', 0.5)
            dice_weight = self.config.get('dice_weight', 0.5)
            pos_weight = self.config.get('pos_weight', 10.0)
            print(f"   Using Combined Loss (BCE:{bce_weight}, Dice:{dice_weight})")
            return CombinedLoss(bce_weight=bce_weight, dice_weight=dice_weight, pos_weight=pos_weight)
        
        else:
            raise ValueError(f"Unknown loss function: {loss_type}")
    
    def _get_optimizer(self):
        """Initialize optimizer"""
        optimizer_type = self.config.get('optimizer', 'adam')
        lr = self.config.get('learning_rate', 0.001)
        weight_decay = self.config.get('weight_decay', 0.0001)
        
        if optimizer_type == 'adam':
            return optim.Adam(
                self.model.parameters(),
                lr=lr,
                weight_decay=weight_decay
            )
        elif optimizer_type == 'adamw':
            return optim.AdamW(
                self.model.parameters(),
                lr=lr,
                weight_decay=weight_decay
            )
        elif optimizer_type == 'sgd':
            return optim.SGD(
                self.model.parameters(),
                lr=lr,
                momentum=0.9,
                weight_decay=weight_decay
            )
        else:
            raise ValueError(f"Unknown optimizer: {optimizer_type}")
    
    def _get_scheduler(self):
        """Initialize learning rate scheduler"""
        scheduler_type = self.config.get('scheduler', 'reduce_on_plateau')
        
        if scheduler_type == 'reduce_on_plateau':
            return optim.lr_scheduler.ReduceLROnPlateau(
                self.optimizer,
                mode='min',
                factor=self.config.get('factor', 0.5),
                patience=self.config.get('patience', 10)
            )
        elif scheduler_type == 'cosine':
            return optim.lr_scheduler.CosineAnnealingLR(
                self.optimizer,
                T_max=self.config.get('num_epochs', 100)
            )
        elif scheduler_type == 'step':
            return optim.lr_scheduler.StepLR(
                self.optimizer,
                step_size=30,
                gamma=0.1
            )
        else:
            return None
    
    def train_epoch(self, train_loader):
        """Train for one epoch"""
        self.model.train()
        
        total_loss = 0
        predictions = []
        targets = []
        
        pbar = tqdm(train_loader, desc='Training')
        
        for batch_idx, data in enumerate(pbar):
            data = data.to(self.device)
            
            # Forward pass
            self.optimizer.zero_grad()
            output, _ = self.model(data)
            
            # Compute loss
            loss = self.criterion(output.squeeze(), data.y)
            
            # Backward pass
            loss.backward()
            
            # Gradient clipping
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), max_norm=1.0)
            
            self.optimizer.step()
            
            # Track metrics
            total_loss += loss.item()
            
            with torch.no_grad():
                pred = torch.sigmoid(output).cpu().numpy()
                predictions.extend(pred.squeeze())
                targets.extend(data.y.cpu().numpy())
            
            # Update progress bar
            pbar.set_postfix({'loss': loss.item()})
        
        avg_loss = total_loss / len(train_loader)
        
        return avg_loss, np.array(predictions), np.array(targets)
    
    def validate(self, val_loader):
        """Validate model"""
        self.model.eval()
        
        total_loss = 0
        predictions = []
        targets = []
        
        with torch.no_grad():
            for data in tqdm(val_loader, desc='Validation'):
                data = data.to(self.device)
                
                # Forward pass
                output, _ = self.model(data)
                
                # Compute loss
                loss = self.criterion(output.squeeze(), data.y)
                total_loss += loss.item()
                
                # Collect predictions
                pred = torch.sigmoid(output).cpu().numpy()
                predictions.extend(pred.squeeze())
                targets.extend(data.y.cpu().numpy())
        
        avg_loss = total_loss / len(val_loader)
        
        return avg_loss, np.array(predictions), np.array(targets)
    
    def train(self, train_loader, val_loader, num_epochs):
        """Main training loop"""
        
        print(f"\n{'='*50}")
        print(f"Starting Training")
        print(f"{'='*50}\n")
        
        history = {
            'train_loss': [],
            'val_loss': [],
            'train_auc': [],
            'val_auc': []
        }
        
        for epoch in range(num_epochs):
            print(f"\nEpoch {epoch+1}/{num_epochs}")
            print("-" * 50)
            
            # Train
            train_loss, train_preds, train_targets = self.train_epoch(train_loader)
            
            # Validate
            val_loss, val_preds, val_targets = self.validate(val_loader)
            
            # Compute metrics
            from sklearn.metrics import roc_auc_score, f1_score, precision_recall_curve
            
            train_auc = roc_auc_score(train_targets, train_preds)
            val_auc = roc_auc_score(val_targets, val_preds)
            
            # Find optimal threshold using F1 score on validation set
            precision, recall, thresholds = precision_recall_curve(val_targets, val_preds)
            # Compute F1 for each threshold
            f1_scores = 2 * (precision * recall) / (precision + recall + 1e-8)
            best_idx = np.argmax(f1_scores)
            optimal_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5
            best_f1 = f1_scores[best_idx]
            
            # Log metrics with optimal threshold
            print(f"\nTrain Loss: {train_loss:.4f} | Train AUC: {train_auc:.4f}")
            print(f"Val Loss: {val_loss:.4f} | Val AUC: {val_auc:.4f} | Best F1: {best_f1:.4f} (thresh={optimal_threshold:.3f})")
            
            # Tensorboard logging
            if self.writer:
                self.writer.add_scalar('Loss/train', train_loss, epoch)
                self.writer.add_scalar('Loss/val', val_loss, epoch)
                self.writer.add_scalar('AUC/train', train_auc, epoch)
                self.writer.add_scalar('AUC/val', val_auc, epoch)
                self.writer.add_scalar('LR', self.optimizer.param_groups[0]['lr'], epoch)
            
            # Save history
            history['train_loss'].append(train_loss)
            history['val_loss'].append(val_loss)
            history['train_auc'].append(train_auc)
            history['val_auc'].append(val_auc)
            
            # Learning rate scheduling
            if self.scheduler:
                if isinstance(self.scheduler, optim.lr_scheduler.ReduceLROnPlateau):
                    self.scheduler.step(val_loss)
                else:
                    self.scheduler.step()
            
            # Save best model
            if val_auc > self.best_val_auc:
                self.best_val_auc = val_auc
                self.best_val_loss = val_loss
                self.patience_counter = 0
                
                self.save_checkpoint(epoch, is_best=True)
                print(f"> Best model saved! (AUC: {val_auc:.4f})")
            else:
                self.patience_counter += 1
            
            # Early stopping
            early_stopping_patience = self.config.get('early_stopping_patience', 20)
            if self.patience_counter >= early_stopping_patience:
                print(f"\nEarly stopping triggered after {epoch+1} epochs")
                break
            
            # Regular checkpoint
            if (epoch + 1) % self.config.get('save_frequency', 5) == 0:
                self.save_checkpoint(epoch, is_best=False)
        
        # Save training history
        history_path = self.checkpoint_dir / 'training_history.json'
        with open(history_path, 'w') as f:
            json.dump(history, f, indent=2)
        
        print(f"\n{'='*50}")
        print(f"Training completed!")
        print(f"Best Val AUC: {self.best_val_auc:.4f}")
        print(f"{'='*50}\n")
        
        return history
    
    def save_checkpoint(self, epoch, is_best=False):
        """Save model checkpoint"""
        checkpoint = {
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'best_val_loss': self.best_val_loss,
            'best_val_auc': self.best_val_auc,
            'config': self.config
        }
        
        if is_best:
            path = self.checkpoint_dir / 'best_model.pth'
        else:
            path = self.checkpoint_dir / f'checkpoint_epoch_{epoch+1}.pth'
        
        torch.save(checkpoint, path)
    
    def load_checkpoint(self, checkpoint_path):
        """Load model checkpoint"""
        checkpoint = torch.load(checkpoint_path, map_location=self.device, weights_only=False)
        
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.best_val_loss = checkpoint['best_val_loss']
        self.best_val_auc = checkpoint['best_val_auc']
        
        return checkpoint['epoch']


class FocalLoss(nn.Module):
    """Focal Loss for handling class imbalance"""
    
    def __init__(self, alpha=0.25, gamma=2.0):
        super().__init__()
        self.alpha = alpha
        self.gamma = gamma
    
    def forward(self, inputs, targets):
        bce_loss = nn.functional.binary_cross_entropy_with_logits(
            inputs, targets, reduction='none'
        )
        
        pt = torch.exp(-bce_loss)
        focal_loss = self.alpha * (1 - pt) ** self.gamma * bce_loss
        
        return focal_loss.mean()


class DiceLoss(nn.Module):
    """Dice Loss - directly optimizes F1 score"""
    
    def __init__(self, smooth=1.0):
        super().__init__()
        self.smooth = smooth
    
    def forward(self, inputs, targets):
        # Apply sigmoid to get probabilities
        probs = torch.sigmoid(inputs)
        
        # Flatten
        probs = probs.view(-1)
        targets = targets.view(-1)
        
        # Dice coefficient
        intersection = (probs * targets).sum()
        dice = (2. * intersection + self.smooth) / (probs.sum() + targets.sum() + self.smooth)
        
        return 1 - dice


class TverskyLoss(nn.Module):
    """
    Tversky Loss - allows tuning precision/recall trade-off
    alpha > beta: emphasizes precision (fewer false positives)
    alpha < beta: emphasizes recall (fewer false negatives)
    alpha = beta = 0.5: equivalent to Dice Loss
    """
    
    def __init__(self, alpha=0.3, beta=0.7, smooth=1.0):
        super().__init__()
        self.alpha = alpha  # Weight for false positives
        self.beta = beta    # Weight for false negatives
        self.smooth = smooth
    
    def forward(self, inputs, targets):
        # Apply sigmoid to get probabilities
        probs = torch.sigmoid(inputs)
        
        # Flatten
        probs = probs.view(-1)
        targets = targets.view(-1)
        
        # True positives, false positives, false negatives
        TP = (probs * targets).sum()
        FP = ((1 - targets) * probs).sum()
        FN = (targets * (1 - probs)).sum()
        
        # Tversky index
        tversky = (TP + self.smooth) / (TP + self.alpha * FP + self.beta * FN + self.smooth)
        
        return 1 - tversky


class CombinedLoss(nn.Module):
    """Combined BCE + Dice Loss for both AUC and F1 optimization"""
    
    def __init__(self, bce_weight=0.5, dice_weight=0.5, pos_weight=10.0):
        super().__init__()
        self.bce_weight = bce_weight
        self.dice_weight = dice_weight
        self.bce = nn.BCEWithLogitsLoss(pos_weight=torch.tensor([pos_weight]))
        self.dice = DiceLoss()
    
    def forward(self, inputs, targets):
        bce_loss = self.bce(inputs, targets)
        dice_loss = self.dice(inputs, targets)
        return self.bce_weight * bce_loss + self.dice_weight * dice_loss


if __name__ == "__main__":
    print("Trainer module loaded successfully!")
    print("Ready to train binding site prediction models!")