<p align="center">
  <img src="https://img.shields.io/badge/BioGenesis-Bioinformatics%20Suite-06b6d4?style=for-the-badge&logo=dna&logoColor=white" alt="BioGenesis" />
</p>

<h1 align="center">🧬 BioGenesis</h1>

<p align="center">
  <strong>A premium, browser-based bioinformatics suite for DNA, RNA, and protein analysis — with integrated AI-powered binding site prediction.</strong>
  <br/>
  Built with vanilla JavaScript + Vite — no backend required for core features.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES2024-f7df1e?logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-7.x-646cff?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/3Dmol.js-Molecular%20Viz-00d4aa" />
  <a href="https://doi.org/10.5281/zenodo.18061054">
    <img src="https://zenodo.org/badge/DOI/10.5281/zenodo.18061054.svg" alt="DOI" />
  </a>
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## ✨ Features

### 📁 Sequence Management
- Import/export FASTA and GenBank files
- 20+ built-in sample sequences (plasmids, genes, proteins, RNA)
- **NCBI Fetch** — search and import sequences directly from NCBI databases (DNA/Protein)
- Scrollable document browser with real-time search filter

### 🔬 Viewer & Editor
- **Sequence Viewer** — color-coded nucleotide/amino acid display with chunked rendering for large sequences
- **Sequence Editor** — edit, insert, delete, and annotate sequences
- **Linear Map** — linear genome/gene map with annotated features
- **Plasmid Map** — circular plasmid map visualization

### 📊 Analysis Tools
- **Sequence Alignment** — Needleman-Wunsch (global) & Smith-Waterman (local) pairwise alignment
- **Dot Plot** — visual sequence comparison matrix
- **Phylogenetic Tree** — UPGMA distance-based phylogeny with interactive dendrograms
- **Statistics** — GC%, composition, codon usage, sequence length distribution
- **Motif Finder** — regex-based motif/pattern search with highlighting
- **Sequence Properties** — sliding window GC, hydrophobicity, charge, flexibility plots

### 🧪 Molecular Biology
- **Restriction Analysis** — digest simulation with 20+ restriction enzymes
- **Primer Design** — automated primer pair design with Tm calculation
- **6-Frame Translation** — all reading frame translations with start/stop codon display
- **Codon Optimization** — codon usage analysis and optimization for host expression

### 🔬 3D Structure & AI Binding Site Prediction
- **3D Protein Viewer** — interactive molecular visualization powered by [3Dmol.js](https://3dmol.csb.pitt.edu/)
  - **RCSB PDB** — load experimental structures from the Protein Data Bank
  - **AlphaFold DB** — load AI-predicted structures via UniProt accession
  - Style controls: Cartoon, Stick, Space-Fill, Wireframe, Ball & Cross
  - Color schemes: Rainbow, Chain, Secondary Structure, Residue, Confidence (pLDDT)
- **🧠 GGNN2025 Binding Site Prediction** *(requires Python backend)*
  - Predict ligand-binding residues using a Geometric Graph Neural Network
  - Configurable confidence threshold (0.20–0.95), top-N results, and color modes
  - **Heatmap** (yellow→orange→red gradient by confidence), **Flat red**, **Pocket clusters** coloring
  - Based on the paper: *GGNN 2025: A Lightweight Geometric GNN for Protein-Ligand Binding Site Prediction*

---

## 🧠 GGNN2025 — AI Binding Site Prediction

BioGenesis integrates **GGNN2025**, a lightweight Geometric Graph Neural Network (276K parameters) for protein-ligand binding site prediction.

### Key Stats
| Metric | Value |
|--------|-------|
| AUC (combined test) | **0.949** |
| Parameters | **276K** (36× smaller than PLM-based methods) |
| Benchmark datasets | 9 (COACH420, Holo4k, PDBbind, scPDB, ...) |
| Loss function | Combined (0.3 BCE + 0.7 Dice) |
| Architecture | GATv2 + Geometric Edge Encoding |

### Paper & Code
- 📄 **Paper (Zenodo):** [https://doi.org/10.5281/zenodo.18061054](https://doi.org/10.5281/zenodo.18061054)
- 💻 **GGNN2025 Repository:** [https://github.com/TCGxBill/GGNN2025](https://github.com/TCGxBill/GGNN2025)

### Citation
If you use GGNN2025 in your research, please cite:

```bibtex
@software{nguyen_vu_trong_nhan_2025_18061054,
  author       = {Nguyen Vu, Trong Nhan},
  title        = {GGNN 2025: A Lightweight Geometric Graph Neural Network 
                  for Protein-Ligand Binding Site Prediction},
  year         = 2025,
  publisher    = {Zenodo},
  doi          = {10.5281/zenodo.18061054},
  url          = {https://doi.org/10.5281/zenodo.18061054}
}
```

### Running the Backend
```bash
# Install dependencies
pip install -r backend/requirements.txt

# Start the prediction server
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
/usr/bin/python3 backend/server.py
# Backend runs at http://localhost:8000
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- npm or yarn
- Python 3.9+ (optional — only for GGNN2025 binding site prediction)

### Installation

```bash
# Clone the repository
git clone https://github.com/TCGxBill/BioGenesis.git
cd BioGenesis

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build for Production
```bash
npm run build
npm run preview
```

---

## 📂 Project Structure

```
BioGenesis/
├── index.html                    # Main HTML (sidebar, toolbar, layout)
├── package.json
├── README.md
├── LICENSE
├── src/
│   ├── main.js                   # App controller (routing, state, events)
│   ├── style.css                 # Full design system & component styles
│   ├── data/
│   │   └── sampleSequences.js    # 20+ built-in sample sequences
│   ├── components/
│   │   ├── SequenceViewer.js     # Chunked sequence display
│   │   ├── SequenceEditor.js     # Edit & annotate sequences
│   │   ├── SequenceAlignment.js  # Pairwise alignment (NW & SW)
│   │   ├── PlasmidMap.js         # Circular plasmid visualization
│   │   ├── LinearMap.js          # Linear genome map
│   │   ├── PhyloTree.js          # Phylogenetic tree (UPGMA)
│   │   ├── DotPlot.js            # Dot plot comparison
│   │   ├── Statistics.js         # Sequence statistics
│   │   ├── MotifFinder.js        # Pattern/motif search
│   │   ├── SequenceProperties.js # Sliding window analysis
│   │   ├── RestrictionAnalysis.js# Restriction enzyme digest
│   │   ├── PrimerDesign.js       # Primer pair design
│   │   ├── SixFrameTranslation.js# 6-frame translation
│   │   ├── CodonOptimization.js  # Codon usage analysis
│   │   ├── BlastSearch.js        # BLAST-like search
│   │   └── ProteinViewer3D.js    # 3D viewer + GGNN2025 binding predictor
│   └── utils/
│       ├── bioUtils.js           # Core bioinformatics utilities
│       ├── restriction.js        # Restriction enzyme database
│       ├── storage.js            # Local storage persistence
│       └── autoAnnotate.js       # Auto-annotation utilities
└── backend/                      # Python backend for GGNN2025
    ├── server.py                 # FastAPI server (POST /predict)
    ├── config_optimized.yaml     # Model configuration
    ├── requirements.txt          # Python dependencies
    ├── checkpoints_optimized/    # Trained model weights
    └── src/
        ├── models/               # GeometricGNN architecture
        └── data/                 # Preprocessor & graph builder
```

---

## 🛠 Tech Stack

| Technology | Purpose |
|---|---|
| **Vanilla JS (ES2024)** | Core application logic |
| **HTML5 Canvas** | Plasmid maps, dot plots, property plots |
| **CSS3** | Custom dark theme design system |
| **Vite 7** | Dev server & build tool |
| **3Dmol.js** | Interactive 3D molecular visualization |
| **FastAPI + PyTorch** | GGNN2025 binding site prediction backend |
| **NCBI E-Utilities** | Sequence fetching from NCBI databases |
| **AlphaFold DB** | AI-predicted protein structures |
| **RCSB PDB** | Experimental protein structures |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for full details.

### What the MIT License Allows ✅
- **Commercial use** — You can use this in commercial products
- **Modification** — You can change the source code
- **Distribution** — You can distribute your copy
- **Private use** — You can use and modify privately

### What You Must Do 📋
- **Include copyright** — Keep the original copyright notice in all copies
- **Include license** — Include the MIT License text with any substantial copy

### What Is Not Covered ⚠️
- **Liability** — No warranty is provided; use at your own risk
- **GGNN2025 model weights** — The trained model checkpoints are covered by separate academic use terms (see [GGNN2025 repo](https://github.com/TCGxBill/GGNN2025))

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

- [3Dmol.js](https://3dmol.csb.pitt.edu/) — 3D molecular visualization library
- [RCSB PDB](https://www.rcsb.org/) — Protein Data Bank
- [AlphaFold DB](https://alphafold.ebi.ac.uk/) — DeepMind AI protein structure predictions
- [NCBI](https://www.ncbi.nlm.nih.gov/) — National Center for Biotechnology Information
- **GGNN2025** — [10.5281/zenodo.18061054](https://doi.org/10.5281/zenodo.18061054) — Geometric GNN for binding site prediction

---

<p align="center">
  Made with 🧬 by <a href="https://github.com/TCGxBill">TCGxBill</a> &nbsp;|&nbsp;
  <a href="https://doi.org/10.5281/zenodo.18061054">GGNN2025 Paper</a> &nbsp;|&nbsp;
  <a href="https://github.com/TCGxBill/GGNN2025">GGNN2025 Code</a>
</p>
