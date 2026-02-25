"""
Evaluation Metrics for Binding Site Prediction
"""

import numpy as np
from sklearn.metrics import (
    roc_auc_score, 
    accuracy_score,
    precision_score, 
    recall_score,
    f1_score,
    matthews_corrcoef,
    confusion_matrix,
    roc_curve,
    precision_recall_curve,
    average_precision_score
)
from scipy.spatial.distance import cdist


class BindingSiteMetrics:
    """Comprehensive metrics for binding site prediction"""
    
    def __init__(self, threshold=0.5):
        self.threshold = threshold
    
    def compute_all_metrics(self, y_true, y_pred, y_proba=None):
        """
        Compute all evaluation metrics
        
        Args:
            y_true: Ground truth labels (N,)
            y_pred: Predicted labels (N,)
            y_proba: Predicted probabilities (N,) - optional
            
        Returns:
            Dictionary of metrics
        """
        metrics = {}
        
        # Basic classification metrics
        metrics['accuracy'] = accuracy_score(y_true, y_pred)
        metrics['precision'] = precision_score(y_true, y_pred, zero_division=0)
        metrics['recall'] = recall_score(y_true, y_pred, zero_division=0)
        metrics['f1'] = f1_score(y_true, y_pred, zero_division=0)
        metrics['mcc'] = matthews_corrcoef(y_true, y_pred)
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        metrics['true_positive'] = int(tp)
        metrics['false_positive'] = int(fp)
        metrics['true_negative'] = int(tn)
        metrics['false_negative'] = int(fn)
        
        # Specificity
        metrics['specificity'] = tn / (tn + fp) if (tn + fp) > 0 else 0
        
        # Probability-based metrics
        if y_proba is not None:
            metrics['auc'] = roc_auc_score(y_true, y_proba)
            metrics['average_precision'] = average_precision_score(y_true, y_proba)
        
        return metrics
    
    def compute_dcc(self, predicted_coords, true_coords, threshold=4.0):
        """
        Distance to Closest Center (DCC)
        Measures geometric accuracy of predictions
        
        Args:
            predicted_coords: Predicted binding site coordinates (N_pred, 3)
            true_coords: True binding site coordinates (N_true, 3)
            threshold: Distance threshold in Angstroms
            
        Returns:
            DCC value and success rate
        """
        if len(predicted_coords) == 0 or len(true_coords) == 0:
            return float('inf'), 0.0
        
        # Compute pairwise distances
        distances = cdist(predicted_coords, true_coords)
        
        # Minimum distance from each predicted to any true
        min_distances = distances.min(axis=1)
        
        # DCC is the mean of minimum distances
        dcc = np.mean(min_distances)
        
        # Success rate: fraction of predictions within threshold
        success_rate = np.mean(min_distances <= threshold)
        
        return dcc, success_rate
    
    def compute_coverage(self, predicted_sites, true_sites):
        """
        Binding site coverage
        
        Args:
            predicted_sites: Set of predicted binding site indices
            true_sites: Set of true binding site indices
            
        Returns:
            Coverage fraction
        """
        if len(true_sites) == 0:
            return 0.0
        
        intersection = len(predicted_sites & true_sites)
        coverage = intersection / len(true_sites)
        
        return coverage
    
    def compute_roc_curve(self, y_true, y_proba):
        """Compute ROC curve"""
        fpr, tpr, thresholds = roc_curve(y_true, y_proba)
        auc = roc_auc_score(y_true, y_proba)
        
        return {
            'fpr': fpr,
            'tpr': tpr,
            'thresholds': thresholds,
            'auc': auc
        }
    
    def compute_pr_curve(self, y_true, y_proba):
        """Compute Precision-Recall curve"""
        precision, recall, thresholds = precision_recall_curve(y_true, y_proba)
        ap = average_precision_score(y_true, y_proba)
        
        return {
            'precision': precision,
            'recall': recall,
            'thresholds': thresholds,
            'average_precision': ap
        }
    
    def compute_topk_accuracy(self, y_true, y_proba, k=10):
        """
        Top-K accuracy
        Check if true binding sites are in top-k predictions
        
        Args:
            y_true: Ground truth labels
            y_proba: Predicted probabilities
            k: Number of top predictions to consider
        """
        # Get indices of top-k predictions
        top_k_indices = np.argsort(y_proba)[-k:]
        
        # Check if any true binding site is in top-k
        true_indices = np.where(y_true == 1)[0]
        
        if len(true_indices) == 0:
            return 0.0
        
        hits = len(set(top_k_indices) & set(true_indices))
        accuracy = hits / min(k, len(true_indices))
        
        return accuracy
    
    def compute_balanced_accuracy(self, y_true, y_pred):
        """Balanced accuracy (average of sensitivity and specificity)"""
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        
        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
        
        balanced_acc = (sensitivity + specificity) / 2
        
        return balanced_acc


class CrossValidationMetrics:
    """Metrics for cross-validation results"""
    
    def __init__(self):
        self.fold_metrics = []
    
    def add_fold(self, metrics):
        """Add metrics from one fold"""
        self.fold_metrics.append(metrics)
    
    def compute_summary(self):
        """Compute mean and std across folds"""
        if not self.fold_metrics:
            return {}
        
        summary = {}
        
        # Get all metric names
        metric_names = self.fold_metrics[0].keys()
        
        for name in metric_names:
            values = [fold[name] for fold in self.fold_metrics]
            
            summary[f'{name}_mean'] = np.mean(values)
            summary[f'{name}_std'] = np.std(values)
            summary[f'{name}_min'] = np.min(values)
            summary[f'{name}_max'] = np.max(values)
        
        return summary
    
    def print_summary(self):
        """Print summary statistics"""
        summary = self.compute_summary()
        
        print("\n" + "="*60)
        print("Cross-Validation Results")
        print("="*60)
        
        # Group by metric type
        metric_types = set([k.rsplit('_', 1)[0] for k in summary.keys()])
        
        for metric in sorted(metric_types):
            mean = summary.get(f'{metric}_mean', 0)
            std = summary.get(f'{metric}_std', 0)
            
            print(f"{metric:20s}: {mean:.4f} ± {std:.4f}")
        
        print("="*60 + "\n")


def evaluate_model(model, test_loader, device='cuda'):
    """
    Evaluate model on test set with optimal threshold
    
    Args:
        model: Trained model
        test_loader: Test data loader
        device: Device to run on
        
    Returns:
        Dictionary of metrics
    """
    import torch
    
    model.eval()
    
    all_predictions = []
    all_probabilities = []
    all_targets = []
    all_coords = []
    
    with torch.no_grad():
        for data in test_loader:
            data = data.to(device)
            
            # Get predictions
            output, _ = model(data)
            probs = torch.sigmoid(output).cpu().numpy()
            
            all_probabilities.extend(probs.squeeze())
            all_targets.extend(data.y.cpu().numpy())
            
            if hasattr(data, 'pos'):
                all_coords.append(data.pos.cpu().numpy())
    
    # Convert to arrays
    y_proba = np.array(all_probabilities)
    y_true = np.array(all_targets)
    
    # Find optimal threshold using F1 score
    precision, recall, thresholds = precision_recall_curve(y_true, y_proba)
    f1_scores = 2 * (precision * recall) / (precision + recall + 1e-8)
    best_idx = np.argmax(f1_scores)
    optimal_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5
    
    # Apply optimal threshold
    y_pred = (y_proba >= optimal_threshold).astype(int)
    
    # Compute metrics
    evaluator = BindingSiteMetrics()
    metrics = evaluator.compute_all_metrics(y_true, y_pred, y_proba)
    metrics['optimal_threshold'] = float(optimal_threshold)
    
    # ROC and PR curves
    roc_data = evaluator.compute_roc_curve(y_true, y_proba)
    pr_data = evaluator.compute_pr_curve(y_true, y_proba)
    
    metrics['roc_curve'] = roc_data
    metrics['pr_curve'] = pr_data
    
    return metrics


if __name__ == "__main__":
    # Test metrics
    evaluator = BindingSiteMetrics()
    
    # Generate dummy data
    np.random.seed(42)
    y_true = np.random.randint(0, 2, 1000)
    y_proba = np.random.rand(1000)
    y_pred = (y_proba >= 0.5).astype(int)
    
    # Compute metrics
    metrics = evaluator.compute_all_metrics(y_true, y_pred, y_proba)
    
    print("Evaluation Metrics:")
    print("-" * 40)
    for key, value in metrics.items():
        if isinstance(value, (int, float)):
            print(f"{key:20s}: {value:.4f}")
