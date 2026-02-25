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

app = FastAPI(title="BioGenesis - GGNN2025 API", version="1.0.0")

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

# Find model weights — check multiple locations:
# 1. best_model.pth at repo root   (HF Spaces — file lives at root)
# 2. checkpoints_optimized/        (local dev)
# 3. Download from HF Hub          (fallback)
_candidates = [
    os.path.join(base_dir, 'best_model.pth'),
    os.path.join(base_dir, 'checkpoints_optimized', 'best_model.pth'),
]
checkpoint_path = next((p for p in _candidates if os.path.exists(p)), None)

if checkpoint_path is None:
    print("Model weights not found locally — downloading from HuggingFace Hub...")
    checkpoint_path = _candidates[1]  # save to checkpoints_optimized/
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)
    try:
        from huggingface_hub import hf_hub_download
        hf_hub_download(
            repo_id="TCGxDreams/GGNN2025",
            filename="best_model.pth",
            local_dir=os.path.dirname(checkpoint_path),
        )
    except Exception as e:
        print(f"HF Hub download failed: {e}")

print(f"Loading weights from: {checkpoint_path}")

# Initialize Model
model = GeometricGNN(config['model'])
checkpoint = torch.load(checkpoint_path, map_location='cpu', weights_only=False)
model.load_state_dict(checkpoint['model_state_dict'])
model.eval()
print("Model loaded successfully!")


# Initialize Data Processors
preprocessor = ProteinPreprocessor(config['data'])
graph_builder = ProteinGraphBuilder(config['data'])

@app.get("/health")
async def health_check():
    """Health check endpoint for Render/Railway/Fly.io"""
    return {"status": "ok", "model": "GGNN2025", "version": "1.0.0"}

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
    port = int(os.environ.get("PORT", 7860))
    print(f"Starting BioGenesis AI Backend on http://0.0.0.0:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
