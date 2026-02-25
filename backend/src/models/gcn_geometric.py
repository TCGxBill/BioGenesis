"""
Geometric Graph Neural Network for Binding Site Prediction
Upgraded architecture using GATv2 with edge features
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch_geometric.nn import GATv2Conv, global_mean_pool, global_max_pool
from torch.nn import Sequential, Linear, ReLU, BatchNorm1d, Dropout

class GeometricGNN(nn.Module):
    """
    Geometric GNN with GATv2 layers and Spatial Attention
    """
    
    def __init__(self, config):
        super().__init__()
        
        self.config = config
        
        # Dimensions
        input_dim = config.get('input_dim', 29)
        hidden_dims = config.get('hidden_dims', [128, 128, 64])
        edge_dim = config.get('edge_dim', 20)
        output_dim = config.get('output_dim', 1)
        
        dropout = config.get('dropout', 0.3)
        heads = config.get('attention_heads', 4)
        
        # Input embedding
        self.input_emb = Sequential(
            Linear(input_dim, hidden_dims[0]),
            BatchNorm1d(hidden_dims[0]),
            ReLU(),
            Dropout(dropout)
        )
        
        # GATv2 Layers
        self.convs = nn.ModuleList()
        self.bns = nn.ModuleList()
        self.skips = nn.ModuleList()
        
        in_dim = hidden_dims[0]
        for out_dim in hidden_dims:
            # GATv2Conv with edge features
            self.convs.append(
                GATv2Conv(in_dim, out_dim // heads, heads=heads, edge_dim=edge_dim, dropout=dropout)
            )
            self.bns.append(BatchNorm1d(out_dim))
            
            # Skip connection adapter if dimensions change
            if in_dim != out_dim:
                self.skips.append(Linear(in_dim, out_dim))
            else:
                self.skips.append(nn.Identity())
                
            in_dim = out_dim
            
        # Output layers
        self.output_head = Sequential(
            Linear(hidden_dims[-1], hidden_dims[-1] // 2),
            ReLU(),
            Dropout(dropout),
            Linear(hidden_dims[-1] // 2, output_dim)
        )
        
        self.dropout = Dropout(dropout)
        
    def forward(self, data):
        x, edge_index, edge_attr = data.x, data.edge_index, data.edge_attr
        
        # Input encoding
        x = self.input_emb(x)
        
        # Message Passing
        for conv, bn, skip in zip(self.convs, self.bns, self.skips):
            x_in = x
            
            # GATv2 Convolution
            x = conv(x, edge_index, edge_attr=edge_attr)
            x = bn(x)
            x = F.elu(x)
            x = self.dropout(x)
            
            # Residual connection
            x = x + skip(x_in)
            
        # Output
        out = self.output_head(x)
        
        return out, None # Attention weights not returned for now to keep interface simple

    def predict_proba(self, data):
        logits, _ = self.forward(data)
        return torch.sigmoid(logits)

if __name__ == "__main__":
    # Test
    from torch_geometric.data import Data
    config = {
        'input_dim': 29, 
        'hidden_dims': [64, 32],
        'edge_dim': 20,
        'attention_heads': 2,
        'dropout': 0.1
    }
    model = GeometricGNN(config)
    print("Model initialized:", model)
    
    # Dummy data
    x = torch.randn(10, 29)
    edge_index = torch.tensor([[0, 1, 1, 2], [1, 0, 2, 1]], dtype=torch.long)
    edge_attr = torch.randn(4, 20)
    data = Data(x=x, edge_index=edge_index, edge_attr=edge_attr)
    
    out, _ = model(data)
    print("Output shape:", out.shape)
