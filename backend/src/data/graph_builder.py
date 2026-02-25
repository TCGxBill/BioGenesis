"""
Graph Construction Module
Builds protein graphs from residue coordinates and features
"""

import numpy as np
import torch
from scipy.spatial import distance_matrix
from torch_geometric.data import Data
try:
    from sklearn.neighbors import NearestNeighbors
except:
    NearestNeighbors = None


class ProteinGraphBuilder:
    """Constructs graph representation of proteins"""
    
    def __init__(self, config):
        self.config = config
        self.distance_threshold = config.get('distance_threshold', 8.0)
        self.k_neighbors = config.get('k_neighbors', 15)
    
    def build_graph(self, node_features, coordinates, labels=None):
        """
        Build protein graph from features and coordinates
        
        Args:
            node_features: Node features (N, F)
            coordinates: 3D coordinates (N, 3)
            labels: Binary labels (N,) - optional
            
        Returns:
            PyTorch Geometric Data object
        """
        # Build edges
        edge_index, edge_attr = self._build_edges(coordinates)
        
        # Compute geometric node features
        angles = self.compute_angles(coordinates)  # (N,)
        dihedrals = self.compute_dihedrals(coordinates)  # (N,)
        
        # Concatenate to node features
        # geometric_feats = np.stack([angles, dihedrals], axis=1) # (N, 2)
        # node_features = np.concatenate([node_features, geometric_feats], axis=1)
        
        # NOTE: For now, avoiding changing input_dim abruptly without config update.
        # But per plan, we WANT to include them. 
        # Let's concatenate them.
        geometric_feats = np.stack([angles, dihedrals], axis=1)
        node_features = np.concatenate([node_features, geometric_feats], axis=1)

        # Convert to tensors
        x = torch.tensor(node_features, dtype=torch.float)
        edge_index = torch.tensor(edge_index, dtype=torch.long)
        edge_attr = torch.tensor(edge_attr, dtype=torch.float)
        pos = torch.tensor(coordinates, dtype=torch.float)
        
        # Create data object
        data = Data(
            x=x,
            edge_index=edge_index,
            edge_attr=edge_attr,
            pos=pos
        )
        
        if labels is not None:
            data.y = torch.tensor(labels, dtype=torch.float)
        
        return data
    
    def _build_edges(self, coordinates):
        """
        Build edges using distance threshold and k-NN
        
        Args:
            coordinates: Node coordinates (N, 3)
            
        Returns:
            edge_index: (2, E) - edge connectivity
            edge_attr: (E, D) - edge features
        """
        n_nodes = len(coordinates)
        
        # Method 1: Distance-based edges
        dist_matrix = distance_matrix(coordinates, coordinates)
        
        # Method 2: K-nearest neighbors
        if NearestNeighbors is not None:
            knn = NearestNeighbors(n_neighbors=min(self.k_neighbors + 1, n_nodes))
            knn.fit(coordinates)
            distances, indices = knn.kneighbors(coordinates)
        else:
            # Fallback: use distance-based only
            indices = np.argsort(dist_matrix, axis=1)[:, :self.k_neighbors+1]
            distances = np.sort(dist_matrix, axis=1)[:, :self.k_neighbors+1]
        
        # Combine both methods
        edge_list = []
        edge_features = []
        
        for i in range(n_nodes):
            # Add distance-based edges
            neighbors_dist = np.where(
                (dist_matrix[i] < self.distance_threshold) & 
                (dist_matrix[i] > 0)
            )[0]
            
            # Add k-NN edges (excluding self)
            neighbors_knn = indices[i][1:]
            
            # Combine and remove duplicates
            neighbors = np.unique(np.concatenate([neighbors_dist, neighbors_knn]))
            
            for j in neighbors:
                if i != j:
                    edge_list.append([i, j])
                    
                    # Compute edge features
                    edge_feat = self._compute_edge_features(
                        coordinates[i], 
                        coordinates[j]
                    )
                    edge_features.append(edge_feat)
        
        if len(edge_list) == 0:
            # If no edges, create self-loops
            edge_list = [[i, i] for i in range(n_nodes)]
            edge_features = [np.zeros(5) for _ in range(n_nodes)]
        
        edge_index = np.array(edge_list).T  # (2, E)
        edge_attr = np.array(edge_features)  # (E, D)
        
        return edge_index, edge_attr
    
    def _compute_edge_features(self, coord_i, coord_j):
        """
        Compute edge features between two residues
        
        Features:
        - Euclidean distance (1)
        - Distance bins (16) - for distance buckets
        - Normalized direction (3)
        """
        # Distance
        distance = np.linalg.norm(coord_j - coord_i)
        
        # Distance bins (16 bins from 0 to 20 Angstroms)
        bins = np.linspace(0, 20, 17)
        distance_binned = np.histogram([distance], bins=bins)[0].astype(np.float32)
        
        # Normalized direction vector
        direction = (coord_j - coord_i) / (distance + 1e-8)
        
        # Combine features
        edge_feat = np.concatenate([
            [distance],
            distance_binned,
            direction
        ])
        
        return edge_feat
    
    def add_sequential_edges(self, data, sequence_distance=1):
        """
        Add sequential edges between consecutive residues
        
        Args:
            data: PyTorch Geometric Data object
            sequence_distance: Maximum sequence distance
        """
        n_nodes = data.x.size(0)
        seq_edges = []
        
        for i in range(n_nodes - sequence_distance):
            for j in range(i + 1, min(i + sequence_distance + 1, n_nodes)):
                seq_edges.append([i, j])
                seq_edges.append([j, i])  # Bidirectional
        
        if len(seq_edges) > 0:
            seq_edge_index = torch.tensor(seq_edges, dtype=torch.long).T
            
            # Combine with existing edges
            data.edge_index = torch.cat([data.edge_index, seq_edge_index], dim=1)
            
            # Add edge features for sequential edges
            n_seq_edges = len(seq_edges)
            seq_edge_attr = torch.zeros(n_seq_edges, data.edge_attr.size(1))
            data.edge_attr = torch.cat([data.edge_attr, seq_edge_attr], dim=0)
        
        return data
    
        return np.array(angles)

    def compute_angles(self, coordinates):
        """
        Compute bond angles for triplets of consecutive residues
        Returns (N,) array with padding
        """
        n_nodes = len(coordinates)
        angles = np.zeros(n_nodes, dtype=np.float32)
        
        if n_nodes < 3:
            return angles
            
        for i in range(n_nodes - 2):
            v1 = coordinates[i] - coordinates[i+1] # Vector from i+1 to i
            v2 = coordinates[i+2] - coordinates[i+1] # Vector from i+1 to i+2
            
            # Normalize
            n1 = np.linalg.norm(v1)
            n2 = np.linalg.norm(v2)
            
            if n1 < 1e-6 or n2 < 1e-6:
                continue
                
            cos_angle = np.dot(v1, v2) / (n1 * n2)
            angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
            angles[i+1] = angle # Assign to middle residue
            
        return angles
    
        return np.array(dihedrals)
        
    def compute_dihedrals(self, coordinates):
        """
        Compute dihedral angles for quadruplets of consecutive residues
        Returns (N,) array with padding
        """
        n_nodes = len(coordinates)
        dihedrals = np.zeros(n_nodes, dtype=np.float32)
        
        if n_nodes < 4:
            return dihedrals
            
        for i in range(n_nodes - 3):
            p1, p2, p3, p4 = coordinates[i:i+4]
            
            b1 = p2 - p1
            b2 = p3 - p2
            b3 = p4 - p3
            
            # Normalize b2
            n_b2 = np.linalg.norm(b2)
            if n_b2 < 1e-6:
                continue
                
            b2_u = b2 / n_b2
            
            # Normals
            v1 = np.cross(b1, b2)
            v2 = np.cross(b2, b3)
            
            # Calculate torsion
            # atan2( (b1 x b2) . (b2_unit), (b1 x b2) . (b2 x b3) ) ?
            # Standard definition:
            # n1 = b1 x b2
            # n2 = b2 x b3
            # x = n1 . n2 * |b2|
            # y = |b2| * (n1 x n2) . b2 / |b2|?? No
            
            # Praxeolitic formula:
            # angle = atan2( |b2| * (b1 x b2) . b3 , (b1 x b2) . (b2 x b3) ) 
            # Note: b1 x b2 is normal to plane 123
            # b2 x b3 is normal to plane 234
            
            n1 = np.cross(b1, b2)
            n2 = np.cross(b2, b3)
            
            if np.linalg.norm(n1) < 1e-6 or np.linalg.norm(n2) < 1e-6:
                continue
            
            m1 = np.cross(n1, b2_u)
            
            x = np.dot(n1, n2)
            y = np.dot(m1, n2)
            
            dihedral = np.arctan2(y, x)
            dihedrals[i+1] = dihedral # Assign to 2nd residue in quadruplet
            
        return dihedrals
    
    def batch_graphs(self, graph_list):
        """
        Batch multiple protein graphs
        
        Args:
            graph_list: List of Data objects
            
        Returns:
            Batched Data object
        """
        from torch_geometric.data import Batch
        return Batch.from_data_list(graph_list)


if __name__ == "__main__":
    # Test graph building
    config = {
        'distance_threshold': 8.0,
        'k_neighbors': 15
    }
    
    builder = ProteinGraphBuilder(config)
    
    # Create dummy data
    n_residues = 100
    node_features = np.random.randn(n_residues, 23)
    coordinates = np.random.randn(n_residues, 3) * 10
    labels = np.random.randint(0, 2, n_residues).astype(np.float32)
    
    # Build graph
    graph = builder.build_graph(node_features, coordinates, labels)
    
    print(f"Graph built successfully!")
    print(f"Nodes: {graph.x.shape}")
    print(f"Edges: {graph.edge_index.shape}")
    print(f"Edge features: {graph.edge_attr.shape}")
    print(f"Positions: {graph.pos.shape}")
    print(f"Labels: {graph.y.shape}")