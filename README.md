<p align="center">
  <img src="https://img.shields.io/badge/BioGenesis-Bioinformatics%20Suite-06b6d4?style=for-the-badge&logo=dna&logoColor=white" alt="BioGenesis" />
</p>

<h1 align="center">🧬 BioGenesis</h1>

<p align="center">
  <strong>A premium, browser-based bioinformatics suite for DNA, RNA, and protein analysis.</strong>
  <br/>
  Built with vanilla JavaScript + Vite — no backend required.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES2024-f7df1e?logo=javascript&logoColor=black" />
  <img src="https://img.shields.io/badge/Vite-7.x-646cff?logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/3Dmol.js-Molecular%20Viz-00d4aa" />
  <img src="https://img.shields.io/badge/License-MIT-green" />
</p>

---

## ✨ Features

### 📁 Sequence Management
- Import/export FASTA and GenBank files
- 20+ built-in sample sequences (plasmids, genes, proteins, RNA)
- **NCBI Fetch** — search and import sequences directly from NCBI databases
- Scrollable document browser with real-time search

### 🔬 Viewer & Editor
- **Sequence Viewer** — color-coded nucleotide/amino acid display with chunked rendering for large sequences
- **Sequence Editor** — edit, insert, delete, and annotate sequences
- **Linear Map** — linear genome/gene map visualization
- **Plasmid Map** — circular plasmid map with annotated features

### 📊 Analysis Tools
- **Sequence Alignment** — Needleman-Wunsch (global) & Smith-Waterman (local) pairwise alignment
- **Dot Plot** — visual sequence comparison matrix
- **Phylogenetic Tree** — UPGMA distance-based phylogeny with interactive visualization
- **Statistics** — comprehensive sequence statistics (length, GC%, composition, codon usage)
- **Motif Finder** — regex-based motif/pattern search with highlighting
- **Sequence Properties** — sliding window plots (GC content, hydrophobicity, charge, flexibility)

### 🧪 Molecular Biology
- **Restriction Analysis** — digest simulation with 20+ common enzymes
- **Primer Design** — automated primer pair design with Tm calculation
- **6-Frame Translation** — all reading frame translations with start/stop codon highlighting
- **Codon Optimization** — codon usage analysis and optimization for expression hosts

### 🔍 Search & Structure
- **BLAST Search** — simulated BLAST-like sequence search
- **3D Protein Viewer** — interactive 3D molecular visualization powered by [3Dmol.js](https://3dmol.csb.pitt.edu/)
  - **RCSB PDB** — load experimental structures from the Protein Data Bank
  - **AlphaFold DB** — load AI-predicted structures via UniProt accession
  - Style controls: Cartoon, Stick, Space-Fill, Wireframe, Ball & Cross
  - Color schemes: Rainbow, Chain, Secondary Structure, Residue, Element, Confidence (pLDDT)
  - Interactive controls: Spin, Reset View, Surface toggle

### 🎨 UI/UX
- Dark theme with premium aesthetics
- Cross-tool Quick Actions for seamless workflow
- Responsive sidebar with collapsible document panel
- Real-time search bar and keyboard shortcuts

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/TCGxBill/BioGenesis.git
cd BioGenesis

# Install dependencies
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
├── index.html                  # Main HTML (sidebar, toolbar, layout)
├── package.json
├── src/
│   ├── main.js                 # App controller (routing, state, events)
│   ├── style.css               # Full design system & component styles
│   ├── data/
│   │   └── sampleSequences.js  # 20+ built-in sample sequences
│   ├── components/
│   │   ├── SequenceViewer.js   # Chunked sequence display
│   │   ├── SequenceEditor.js   # Edit & annotate sequences
│   │   ├── SequenceAlignment.js# Pairwise alignment (NW & SW)
│   │   ├── PlasmidMap.js       # Circular plasmid visualization
│   │   ├── LinearMap.js        # Linear genome map
│   │   ├── PhyloTree.js        # Phylogenetic tree (UPGMA)
│   │   ├── DotPlot.js          # Dot plot comparison
│   │   ├── Statistics.js       # Sequence statistics
│   │   ├── MotifFinder.js      # Pattern/motif search
│   │   ├── SequenceProperties.js # Sliding window analysis
│   │   ├── RestrictionAnalysis.js # Restriction enzyme digest
│   │   ├── PrimerDesign.js     # Primer pair design
│   │   ├── SixFrameTranslation.js # 6-frame translation
│   │   ├── CodonOptimization.js# Codon usage analysis
│   │   ├── BlastSearch.js      # BLAST-like search
│   │   └── ProteinViewer3D.js  # 3D structure viewer (PDB + AlphaFold)
│   └── utils/
│       ├── bioUtils.js         # Core bioinformatics utilities
│       └── restriction.js      # Restriction enzyme database
└── public/
    └── vite.svg
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
| **NCBI E-Utilities** | Sequence fetching from NCBI databases |
| **AlphaFold DB** | AI-predicted protein structures |
| **RCSB PDB** | Experimental protein structures |

---

## 📸 Screenshots

<details>
<summary>Click to expand</summary>

### Welcome Screen
The main dashboard with quick access cards for common actions.

### Sequence Viewer
Color-coded nucleotide display with composition bar and annotations.

### Plasmid Map
Interactive circular plasmid visualization with annotated features.

### 3D Protein Viewer
Interactive molecular visualization with PDB and AlphaFold support.

### Sequence Alignment
Pairwise alignment with identity scoring and color-coded matches.

</details>

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [3Dmol.js](https://3dmol.csb.pitt.edu/) — molecular visualization library
- [RCSB PDB](https://www.rcsb.org/) — Protein Data Bank
- [AlphaFold DB](https://alphafold.ebi.ac.uk/) — AI protein structure predictions by DeepMind
- [NCBI](https://www.ncbi.nlm.nih.gov/) — National Center for Biotechnology Information

---

<p align="center">
  Made with 🧬 by <a href="https://github.com/TCGxBill">TCGxBill</a>
</p>
