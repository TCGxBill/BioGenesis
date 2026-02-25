import sys
import os
import tempfile
import yaml
import torch
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Ensure src/ is in the python path
base_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, base_dir)

from src.models.gcn_geometric import GeometricGNN
from src.data.preprocessor import ProteinPreprocessor
from src.data.graph_builder import ProteinGraphBuilder

app = FastAPI(title="BioGenesis - GGNN2025 API")

# Allow CORS for the local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Loading GGNN2025 Model...")
with open(os.path.join(base_dir, 'config_optimized.yaml'), 'r') as f:
    config = yaml.safe_load(f)

# Initialize Model
model = GeometricGNN(config['model'])
checkpoint_path = os.path.join(base_dir, 'checkpoints_optimized', 'best_model.pth')
checkpoint = torch.load(checkpoint_path, map_location='cpu', weights_only=False)
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()
print("Model loaded successfully!")

# Initialize Data Processors
preprocessor = ProteinPreprocessor(config['data'])
graph_builder = ProteinGraphBuilder(config['data'])

@app.post("/predict")
async def predict_binding_sites(
    pdb_data: str = Form(...),
    threshold: float = Form(0.50),
    top_n: int = Form(0),
):
    """Receives raw PDB string, runs it through GGNN2025, and returns binding residues.
    
    Args:
        pdb_data: Raw PDB file content
        threshold: Minimum probability to include a residue (default: 0.50)
        top_n: Maximum number of results to return, 0 = all (default: 0)
    """
    fd, temp_path = tempfile.mkstemp(suffix=".pdb")
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(pdb_data)
        
        # Process the PDB
        data = preprocessor.process_pdb(temp_path)
        if data is None or 'node_features' not in data:
            return {"error": "Failed to process PDB. Ensure it is a valid protein structure."}
            
        # Build graph
        graph = graph_builder.build_graph(
            data['node_features'], 
            data['coordinates'], 
            data.get('labels')
        )

        # Inference
        with torch.no_grad():
            output = model(graph)
            # Handle tuple output from GeometricGNN (out, attention_weights)
            logits = output[0] if isinstance(output, tuple) else output
            
            predictions = torch.sigmoid(logits)
            binding_probs = predictions.squeeze().numpy()
            
            # Handle single residue edge case
            if binding_probs.ndim == 0:
                binding_probs = np.array([binding_probs])
                
        # Filter by threshold — was hardcoded to 0.85, now uses param
        results = []
        for i, (prob, res) in enumerate(zip(binding_probs, data['residues'])):
            if prob >= threshold:
                chain = res.get_parent().id
                resNum = res.get_id()[1]
                resName = res.get_resname()
                results.append({
                    "chain": chain,
                    "resi": resNum,
                    "resn": resName,
                    "probability": float(prob),  # use 'probability' so frontend reads it
                })

        # Sort by confidence descending so top-N gives the best sites
        results.sort(key=lambda x: x['probability'], reverse=True)

        # Apply top_n limit (0 = all)
        if top_n > 0:
            results = results[:top_n]

        return {"success": True, "binding_sites": results, "total_residues": len(data['residues'])}

    except Exception as e:
        return {"error": str(e)}
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    print("Starting BioGenesis AI Backend on http://localhost:8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)
