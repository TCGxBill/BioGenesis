"""
Protein Data Preprocessing Module
Handles PDB file parsing, feature extraction, and graph construction
"""

import numpy as np
from Bio.PDB import PDBParser, DSSP, NACCESS
from Bio.PDB.Polypeptide import is_aa
import warnings
warnings.filterwarnings('ignore')


def is_het(residue):
    """Check if residue is a hetero-residue (ligand/water/ion)"""
    res_id = residue.get_id()
    het_flag = res_id[0]
    return het_flag != " " and het_flag != "W"


class ProteinPreprocessor:
    """Main class for preprocessing protein structures"""
    
    def __init__(self, config):
        self.config = config
        self.parser = PDBParser(QUIET=True)
        
        # Amino acid properties
        self.aa_properties = self._init_aa_properties()
        
    def _init_aa_properties(self):
        """Initialize amino acid properties"""
        return {
            'hydrophobicity': {
                'A': 1.8, 'R': -4.5, 'N': -3.5, 'D': -3.5, 'C': 2.5,
                'Q': -3.5, 'E': -3.5, 'G': -0.4, 'H': -3.2, 'I': 4.5,
                'L': 3.8, 'K': -3.9, 'M': 1.9, 'F': 2.8, 'P': -1.6,
                'S': -0.8, 'T': -0.7, 'W': -0.9, 'Y': -1.3, 'V': 4.2
            },
            'charge': {
                'A': 0, 'R': 1, 'N': 0, 'D': -1, 'C': 0,
                'Q': 0, 'E': -1, 'G': 0, 'H': 0.5, 'I': 0,
                'L': 0, 'K': 1, 'M': 0, 'F': 0, 'P': 0,
                'S': 0, 'T': 0, 'W': 0, 'Y': 0, 'V': 0
            },
            'polarity': {
                'A': 0, 'R': 1, 'N': 1, 'D': 1, 'C': 0,
                'Q': 1, 'E': 1, 'G': 0, 'H': 1, 'I': 0,
                'L': 0, 'K': 1, 'M': 0, 'F': 0, 'P': 0,
                'S': 1, 'T': 1, 'W': 0, 'Y': 1, 'V': 0
            }
        }
    
    def process_pdb(self, pdb_file, ligand_coords=None):
        """
        Process a PDB file and extract features
        
        Args:
            pdb_file: Path to PDB file
            ligand_coords: Ligand coordinates for labeling binding sites
            
        Returns:
            Dictionary containing protein data
        """
        try:
            structure = self.parser.get_structure('protein', pdb_file)
            model = structure[0]
            
            # Extract residues
            residues = self._extract_residues(model)
            
            # DSSP calculation (optional)
            dssp_dict = self._get_dssp_features(model, pdb_file)

            # Extract features
            node_features = self._extract_node_features(residues, dssp_dict)
            
            # Extract coordinates
            coords = self._extract_coordinates(residues)
            
            # Label binding sites if ligand provided
            labels = None
            if ligand_coords is not None:
                labels = self._label_binding_sites(coords, ligand_coords)
            else:
                # Try to automatically extract ligand
                ligand_coords_extracted = self._extract_ligand_from_pdb(model)
                if ligand_coords_extracted is not None:
                    #print(f"  Auto-detected ligand with {len(ligand_coords_extracted)} atoms")
                    labels = self._label_binding_sites(coords, ligand_coords_extracted)
            
            return {
                'residues': residues,
                'node_features': node_features,
                'coordinates': coords,
                'labels': labels,
                'num_residues': len(residues)
            }
            
        except Exception as e:
            print(f"Error processing {pdb_file}: {str(e)}")
            return None
    
    def _extract_residues(self, model):
        """Extract valid residues from structure"""
        residues = []
        
        for chain in model:
            for residue in chain:
                if is_aa(residue, standard=True):
                    residues.append(residue)
        
        return residues

    def _get_dssp_features(self, model, pdb_file):
        """
        Calculate DSSP features if mkdssp is available.
        Returns a dict mapping (chain_id, res_id) -> (ss_code, exposure)
        """
        dssp_dict = {}
        try:
            # Note: DSSP requires the 'mkdssp' executable to be in the system path.
            # Biopython might need a specific structure object, sometimes re-parsing is safer or using the model directly.
            # Using model directly often works.
            dssp = DSSP(model, pdb_file, dssp='mkdssp') 
            
            for key in dssp.keys():
                # key is usually (chain_id, res_id) tuple from Biopython's DSSP
                # structure of key in recent biopython: (chain_id, (' ', resseq, ' '))
                chain_id = key[0]
                res_id = key[1] 
                
                # DSSP data: (aa, ss, exposure_rel, ...)
                # properties[2] is secondary structure, properties[3] is relative accessibility
                properties = dssp[key]
                ss = properties[2]
                exposure = properties[3]
                
                dssp_dict[(chain_id, res_id)] = (ss, exposure)
                
        except Exception:
            # DSSP failed or not installed, return empty dict to fallback
            # print(f"  DSSP failed or not installed: {e}")
            pass
            
        return dssp_dict
    
    def _extract_node_features(self, residues, dssp_dict=None):
        """
        Extract node features for each residue
        
        Features:
        - Amino acid type (one-hot, 20 dim)
        - Hydrophobicity (1 dim)
        - Charge (1 dim)
        - Polarity (1 dim)
        - Secondary structure (3 dim)
        """
        features = []
        
        aa_list = ['A', 'R', 'N', 'D', 'C', 'Q', 'E', 'G', 'H', 'I',
                   'L', 'K', 'M', 'F', 'P', 'S', 'T', 'W', 'Y', 'V']
        
        for residue in residues:
            aa = residue.get_resname()
            
            # Convert 3-letter to 1-letter code
            aa_code = self._three_to_one(aa)
            
            # One-hot encoding for amino acid type
            aa_onehot = np.zeros(20)
            if aa_code in aa_list:
                aa_onehot[aa_list.index(aa_code)] = 1
            
            # Biochemical properties
            hydrophob = self.aa_properties['hydrophobicity'].get(aa_code, 0)
            charge = self.aa_properties['charge'].get(aa_code, 0)
            polarity = self.aa_properties['polarity'].get(aa_code, 0)
            
            # DSSP features override
            ss_onehot = np.zeros(3) # Helix, Sheet, Coil
            exposure = 0.5 # Default
            
            if dssp_dict:
                chain_id = residue.get_parent().id
                res_id = residue.get_id()
                key = (chain_id, res_id)
                
                if key in dssp_dict:
                    ss, acc = dssp_dict[key]
                    
                    # Map SS to 3 classes
                    # H, G, I -> Helix
                    # B, E -> Sheet
                    # Others -> Coil
                    if ss in ['H', 'G', 'I']:
                        ss_onehot[0] = 1.0
                    elif ss in ['B', 'E']:
                        ss_onehot[1] = 1.0
                    else:
                        ss_onehot[2] = 1.0
                        
                    exposure = float(acc) if acc != 'NA' else 0.5
            
            # Combine features
            # Original: aa(20) + hydro(1) + charge(1) + polarity(1) = 23
            # We want to replace or augment secondary structure placeholders if they existed?
            # Looking at previous code, it had:
            # feat = np.concatenate([aa_onehot, [hydrophob, charge, polarity]])
            # It seems the docstring mentioned "Secondary structure (3 dim)" but the code didn't implement it!
            # The original code only returned 23 dims.
            # The config says inputs:
            # - "secondary_structure"  # Helix, Sheet, Coil
            # - "surface_accessibility"
            # So we should Append these.
            
            feat = np.concatenate([
                aa_onehot,
                [hydrophob, charge, polarity],
                ss_onehot,
                [exposure]
            ])
            
            features.append(feat)
        
        return np.array(features, dtype=np.float32)
    
    def _extract_coordinates(self, residues):
        """Extract CA atom coordinates"""
        coords = []
        
        for residue in residues:
            if 'CA' in residue:
                ca_atom = residue['CA']
                coords.append(ca_atom.get_coord())
            else:
                # Use center of mass if CA not available
                atoms = [atom for atom in residue.get_atoms()]
                coord = np.mean([atom.get_coord() for atom in atoms], axis=0)
                coords.append(coord)
        
        return np.array(coords, dtype=np.float32)
    
    def _label_binding_sites(self, protein_coords, ligand_coords, threshold=6.0):
        """
        Label residues as binding sites based on distance to ligand
        
        Args:
            protein_coords: Protein residue coordinates (N, 3)
            ligand_coords: Ligand atom coordinates (M, 3)
            threshold: Distance threshold in Angstroms
            
        Returns:
            Binary labels (N,)
        """
        labels = np.zeros(len(protein_coords), dtype=np.float32)
        
        for i, protein_coord in enumerate(protein_coords):
            # Calculate minimum distance to any ligand atom
            distances = np.linalg.norm(ligand_coords - protein_coord, axis=1)
            min_distance = np.min(distances)
            
            if min_distance <= threshold:
                labels[i] = 1.0
        
        return labels
    
    @staticmethod
    def _three_to_one(three_letter):
        """Convert 3-letter amino acid code to 1-letter"""
        conversion = {
            'ALA': 'A', 'ARG': 'R', 'ASN': 'N', 'ASP': 'D', 'CYS': 'C',
            'GLN': 'Q', 'GLU': 'E', 'GLY': 'G', 'HIS': 'H', 'ILE': 'I',
            'LEU': 'L', 'LYS': 'K', 'MET': 'M', 'PHE': 'F', 'PRO': 'P',
            'SER': 'S', 'THR': 'T', 'TRP': 'W', 'TYR': 'Y', 'VAL': 'V'
        }
        return conversion.get(three_letter, 'X')
    
    def _extract_ligand_from_pdb(self, model):
        """
        Heuristic to find the main ligand in a PDB model.
        Strategy: Find largest connected HETATM component that is not water/ion.
        """
        ligand_atoms = []
        
        # Candidate residues
        candidates = []
        for chain in model:
            for residue in chain:
                if is_het(residue):
                    resname = residue.get_resname().strip().upper()
                    # Filter common non-ligands
                    if resname in ['HOH', 'WAT', 'TIP3', 'SOL', 'NA', 'CL', 'K', 'MG', 'CA', 'ZN', 'MN', 'FE', 'SO4', 'PO4']:
                        continue
                    # Also ignore small fragments if needed, but for now just collect valid het residues
                    candidates.append(residue)
        
        if not candidates:
            return None
            
        # Select the 'largest' residue by atom count as the primary ligand
        # (This assumes the ligand is a single residue/molecule in PDB format, which is common for PDBbind)
        best_ligand = max(candidates, key=lambda res: len(list(res.get_atoms())))
        
        # Check if it has enough atoms to be a valid ligand (e.g. > 3 atoms)
        atoms = list(best_ligand.get_atoms())
        if len(atoms) < 3:
            return None
            
        coords = np.array([atom.get_coord() for atom in atoms], dtype=np.float32)
        return coords

    def save_processed(self, data, output_file):
        """Save processed data to file"""
        np.savez_compressed(
            output_file,
            node_features=data['node_features'],
            coordinates=data['coordinates'],
            labels=data['labels'],
            num_residues=data['num_residues']
        )
    
    @staticmethod
    def load_processed(input_file):
        """Load processed data from file"""
        data = np.load(input_file, allow_pickle=True)
        return {
            'node_features': data['node_features'],
            'coordinates': data['coordinates'],
            'labels': data['labels'],
            'num_residues': int(data['num_residues'])
        }


if __name__ == "__main__":
    # Test preprocessing
    config = {'distance_threshold': 6.0}
    preprocessor = ProteinPreprocessor(config)
    
    print("Protein Preprocessor initialized successfully!")
    print(f"Amino acid types: 20")
    print(f"Biochemical properties: hydrophobicity, charge, polarity")
    print(f"Total node features: 23 dimensions")
