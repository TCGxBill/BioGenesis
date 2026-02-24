// ============================================
// BioGenesis — 3D Protein Structure Viewer
// Uses 3Dmol.js — supports RCSB PDB + AlphaFold DB
// ============================================

import * as $3Dmol from '3dmol';

// Known PDB IDs for demo proteins
const KNOWN_PDBS = {
  '1EMA': 'GFP',
  '1AKI': 'Lysozyme',
  '4EY1': 'Insulin',
  '1HHO': 'Hemoglobin',
  '2XWR': 'p53 DBD',
  '6VXX': 'SARS-CoV-2 Spike',
  '6LU7': 'SARS-CoV-2 Mpro',
  '1BNA': 'B-DNA Dodecamer',
  '4HHB': 'Hemoglobin (deoxy)',
  '1CRN': 'Crambin',
  '1D66': 'Trans FactorDNA',
};

export function renderProteinViewer3D(seq) {
  const pdbId = seq?.pdbId || '';
  const isProtein = seq?.type === 'protein';
  const uniprotId = seq?.uniprotId || seq?.accession || '';

  return `
    <div class="panel-section">
      <div class="panel-header">
        <h2>3D Structure Viewer</h2>
        <p>${seq ? `${seq.name} — ${isProtein ? 'Protein' : seq.type?.toUpperCase()} (${seq.sequence.length} ${isProtein ? 'aa' : 'bp'})` : 'Interactive 3D molecular visualization'}</p>
      </div>
      <div class="panel-body" style="padding:16px;">

        <!-- Source Tabs -->
        <div style="display:flex;gap:0;margin-bottom:16px;">
          <button id="src-pdb-tab" class="struct-src-tab active" style="flex:1;padding:8px 12px;background:rgba(6,182,212,0.1);border:1px solid var(--accent-cyan);border-radius:var(--radius-sm) 0 0 var(--radius-sm);color:var(--accent-cyan);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font-sans);">
            RCSB PDB
          </button>
          <button id="src-af-tab" class="struct-src-tab" style="flex:1;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-default);border-left:none;border-radius:0 var(--radius-sm) var(--radius-sm) 0;color:var(--text-secondary);font-size:11px;font-weight:600;cursor:pointer;font-family:var(--font-sans);">
            AlphaFold (UniProt)
          </button>
        </div>

        <!-- PDB input -->
        <div id="pdb-input-section">
          <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;">
              <label class="form-label" style="display:block;margin-bottom:6px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">PDB ID</label>
              <input id="pdb-id-input" type="text" value="${pdbId}" placeholder="e.g., 1EMA, 1AKI, 4EY1"
                style="width:100%;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-mono);font-size:13px;outline:none;text-transform:uppercase;" />
            </div>
            <button id="load-pdb-btn" class="btn btn-primary" style="padding:8px 20px;white-space:nowrap;">Load Structure</button>
          </div>
          <!-- Gallery -->
          <div style="margin-bottom:16px;">
            <label class="form-label" style="display:block;margin-bottom:8px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Gallery</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;" id="pdb-gallery">
              ${Object.entries(KNOWN_PDBS).map(([id, name]) => `
                <button class="pdb-gallery-btn" data-pdb="${id}"
                  style="padding:5px 12px;background:var(--bg-tertiary);border:1px solid var(--border-muted);border-radius:var(--radius-sm);color:var(--text-secondary);font-size:11px;cursor:pointer;transition:all 0.15s;font-family:var(--font-sans);"
                  onmouseover="this.style.borderColor='var(--accent-cyan)';this.style.color='var(--accent-cyan)'"
                  onmouseout="this.style.borderColor='var(--border-muted)';this.style.color='var(--text-secondary)'"
                >${id} <span style="opacity:0.6;font-size:10px;">${name}</span></button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- AlphaFold input (hidden by default) -->
        <div id="af-input-section" style="display:none;">
          <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:12px;flex-wrap:wrap;">
            <div style="flex:1;min-width:200px;">
              <label class="form-label" style="display:block;margin-bottom:6px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">UniProt Accession</label>
              <input id="af-id-input" type="text" value="${uniprotId}" placeholder="e.g., P04637, P69905, P01308"
                style="width:100%;padding:8px 12px;background:var(--bg-tertiary);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-mono);font-size:13px;outline:none;text-transform:uppercase;" />
            </div>
            <button id="load-af-btn" class="btn btn-primary" style="padding:8px 20px;white-space:nowrap;">Load AlphaFold</button>
          </div>
          <div style="margin-bottom:16px;">
            <p style="color:var(--text-muted);font-size:11px;line-height:1.5;">
              AlphaFold DB provides AI-predicted structures for proteins by UniProt accession.
              <br/>Enter a UniProt ID (e.g. <strong>P04637</strong> for p53, <strong>P01308</strong> for Insulin).
              <br/>Fetched NCBI proteins will auto-fill the accession if detected.
            </p>
          </div>
        </div>

        <!-- Style controls -->
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap;">
          <div>
            <label class="form-label" style="display:block;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Style</label>
            <select id="mol-style" style="padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;">
              <option value="cartoon">Cartoon</option>
              <option value="stick">Stick</option>
              <option value="sphere">Space-Fill</option>
              <option value="line">Wireframe</option>
              <option value="cross">Ball & Cross</option>
            </select>
          </div>
          <div>
            <label class="form-label" style="display:block;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Color</label>
            <select id="mol-color" style="padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;">
              <option value="spectrum">Rainbow Spectrum</option>
              <option value="chain">By Chain</option>
              <option value="ss">By Secondary Structure</option>
              <option value="residue">By Residue Type</option>
              <option value="element">By Element (CPK)</option>
              <option value="confidence">By Confidence (pLDDT)</option>
              <option value="cyan">Cyan</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;align-items:flex-end;">
            <button id="mol-spin-btn" style="padding:6px 12px;background:var(--bg-tertiary);border:1px solid var(--border-muted);border-radius:var(--radius-sm);color:var(--text-secondary);font-size:11px;cursor:pointer;">Spin</button>
            <button id="mol-reset-btn" style="padding:6px 12px;background:var(--bg-tertiary);border:1px solid var(--border-muted);border-radius:var(--radius-sm);color:var(--text-secondary);font-size:11px;cursor:pointer;">Reset View</button>
            <button id="mol-surface-btn" style="padding:6px 12px;background:var(--bg-tertiary);border:1px solid var(--border-muted);border-radius:var(--radius-sm);color:var(--text-secondary);font-size:11px;cursor:pointer;">Surface</button>
          </div>
        </div>

        <!-- 3D viewer container -->
        <div id="viewer-3d-container" style="width:100%;height:520px;background:#0a0a0a;border-radius:var(--radius-md);border:1px solid var(--border-default);position:relative;overflow:hidden;">
          <div id="viewer-3d-loading" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:10;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="1.5" opacity="0.4">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            <p style="color:var(--text-muted);font-size:13px;">Enter a PDB ID or UniProt accession</p>
            <p style="color:var(--text-muted);font-size:11px;opacity:0.6;">or select from the gallery above</p>
          </div>
          <div id="viewer-3d" style="width:100%;height:100%;"></div>
        </div>

        <!-- Structure info panel -->
        <div id="structure-info" style="margin-top:16px;display:none;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;" id="structure-stats"></div>
        </div>

      </div>
    </div>
  `;
}

let currentViewer = null;
let isSpinning = false;
let hasSurface = false;
let currentSource = 'pdb'; // 'pdb' or 'alphafold'

export function bindProteinViewerEvents(seq) {
  const loadBtn = document.getElementById('load-pdb-btn');
  const loadAfBtn = document.getElementById('load-af-btn');
  const input = document.getElementById('pdb-id-input');
  const afInput = document.getElementById('af-id-input');
  const styleSelect = document.getElementById('mol-style');
  const colorSelect = document.getElementById('mol-color');
  const spinBtn = document.getElementById('mol-spin-btn');
  const resetBtn = document.getElementById('mol-reset-btn');
  const surfaceBtn = document.getElementById('mol-surface-btn');
  const pdbTab = document.getElementById('src-pdb-tab');
  const afTab = document.getElementById('src-af-tab');
  const pdbSection = document.getElementById('pdb-input-section');
  const afSection = document.getElementById('af-input-section');

  // Source tabs
  pdbTab?.addEventListener('click', () => {
    currentSource = 'pdb';
    pdbTab.style.background = 'rgba(6,182,212,0.1)';
    pdbTab.style.borderColor = 'var(--accent-cyan)';
    pdbTab.style.color = 'var(--accent-cyan)';
    afTab.style.background = 'var(--bg-tertiary)';
    afTab.style.borderColor = 'var(--border-default)';
    afTab.style.color = 'var(--text-secondary)';
    if (pdbSection) pdbSection.style.display = '';
    if (afSection) afSection.style.display = 'none';
  });

  afTab?.addEventListener('click', () => {
    currentSource = 'alphafold';
    afTab.style.background = 'rgba(6,182,212,0.1)';
    afTab.style.borderColor = 'var(--accent-cyan)';
    afTab.style.color = 'var(--accent-cyan)';
    pdbTab.style.background = 'var(--bg-tertiary)';
    pdbTab.style.borderColor = 'var(--border-default)';
    pdbTab.style.color = 'var(--text-secondary)';
    if (pdbSection) pdbSection.style.display = 'none';
    if (afSection) afSection.style.display = '';
  });

  // Gallery buttons
  document.querySelectorAll('.pdb-gallery-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (input) input.value = btn.dataset.pdb;
      // Switch to PDB tab
      pdbTab?.click();
      loadStructure(btn.dataset.pdb, 'pdb');
    });
  });

  // Load PDB button
  loadBtn?.addEventListener('click', () => {
    const pdbId = input?.value?.trim();
    if (pdbId) loadStructure(pdbId, 'pdb');
  });

  // Load AlphaFold button
  loadAfBtn?.addEventListener('click', () => {
    const afId = afInput?.value?.trim();
    if (afId) loadStructure(afId, 'alphafold');
  });

  // Enter key in inputs
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = input.value.trim();
      if (v) loadStructure(v, 'pdb');
    }
  });
  afInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = afInput.value.trim();
      if (v) loadStructure(v, 'alphafold');
    }
  });

  // Style change
  styleSelect?.addEventListener('change', () => {
    if (currentViewer) applyStyle(currentViewer, styleSelect.value, colorSelect?.value || 'spectrum');
  });

  // Color change
  colorSelect?.addEventListener('change', () => {
    if (currentViewer) applyStyle(currentViewer, styleSelect?.value || 'cartoon', colorSelect.value);
  });

  // Spin toggle
  spinBtn?.addEventListener('click', () => {
    if (currentViewer) {
      isSpinning = !isSpinning;
      currentViewer.spin(isSpinning ? 'y' : false);
      spinBtn.style.borderColor = isSpinning ? 'var(--accent-cyan)' : 'var(--border-muted)';
      spinBtn.style.color = isSpinning ? 'var(--accent-cyan)' : 'var(--text-secondary)';
    }
  });

  // Reset view
  resetBtn?.addEventListener('click', () => {
    if (currentViewer) { currentViewer.zoomTo(); currentViewer.render(); }
  });

  // Surface toggle
  surfaceBtn?.addEventListener('click', () => {
    if (currentViewer) {
      hasSurface = !hasSurface;
      if (hasSurface) {
        currentViewer.addSurface($3Dmol.SurfaceType.VDW, {
          opacity: 0.7, color: 'white',
          colorscheme: { prop: 'b', gradient: 'rwb' }
        });
      } else {
        currentViewer.removeAllSurfaces();
      }
      currentViewer.render();
      surfaceBtn.style.borderColor = hasSurface ? 'var(--accent-cyan)' : 'var(--border-muted)';
      surfaceBtn.style.color = hasSurface ? 'var(--accent-cyan)' : 'var(--text-secondary)';
    }
  });

  // Auto-load: PDB ID takes priority, then try AlphaFold with accession/uniprotId
  if (seq?.pdbId) {
    setTimeout(() => loadStructure(seq.pdbId, 'pdb'), 100);
  } else if (seq?.type === 'protein' && (seq?.uniprotId || seq?.accession)) {
    const afId = seq.uniprotId || seq.accession;
    if (afInput) afInput.value = afId;
    afTab?.click();
    setTimeout(() => loadStructure(afId, 'alphafold'), 100);
  }
}

async function loadStructure(id, source) {
  id = id.toUpperCase().trim();
  const container = document.getElementById('viewer-3d');
  const loadingEl = document.getElementById('viewer-3d-loading');

  if (!container) return;

  const sourceLabel = source === 'alphafold' ? 'AlphaFold DB' : 'RCSB PDB';
  if (loadingEl) {
    loadingEl.innerHTML = `
      <div class="spinner"></div>
      <p style="color:var(--text-secondary);font-size:13px;">Loading ${id} from ${sourceLabel}...</p>
      <p style="color:var(--text-muted);font-size:11px;opacity:0.6;">This may take a few seconds...</p>
    `;
    loadingEl.style.display = 'flex';
  }

  try {
    let pdbData = null;
    let format = 'pdb';

    if (source === 'alphafold') {
      // Try AlphaFold v4 PDB, then v3, then CIF
      const urls = [
        `https://alphafold.ebi.ac.uk/files/AF-${id}-F1-model_v4.pdb`,
        `https://alphafold.ebi.ac.uk/files/AF-${id}-F1-model_v3.pdb`,
        `https://alphafold.ebi.ac.uk/files/AF-${id}-F1-model_v4.cif`,
      ];
      for (const url of urls) {
        try {
          pdbData = await fetchWithTimeout(url, 15000);
          if (url.endsWith('.cif')) format = 'mmcif';
          break;
        } catch (e) {
          continue;
        }
      }
      if (!pdbData) {
        throw new Error(`Could not fetch AlphaFold structure for ${id}. Check the UniProt accession or your network.`);
      }
    } else {
      // RCSB PDB — try PDB, then CIF
      try {
        pdbData = await fetchWithTimeout(`https://files.rcsb.org/download/${id}.pdb`, 15000);
      } catch (e) {
        try {
          pdbData = await fetchWithTimeout(`https://files.rcsb.org/download/${id}.cif`, 15000);
          format = 'mmcif';
        } catch (e2) {
          throw new Error(`Could not load ${id} from RCSB PDB. Check your connection.`);
        }
      }
    }

    // Validate
    if (!pdbData || (!pdbData.includes('ATOM') && !pdbData.includes('_atom_site'))) {
      throw new Error('Invalid structure data received');
    }

    container.innerHTML = '';
    isSpinning = false;
    hasSurface = false;

    currentViewer = $3Dmol.createViewer(container, {
      backgroundColor: '0x0a0a0a',
      antialias: true,
    });

    currentViewer.addModel(pdbData, format);

    const styleSelect = document.getElementById('mol-style');
    const colorSelect = document.getElementById('mol-color');
    applyStyle(currentViewer, styleSelect?.value || 'cartoon', colorSelect?.value || 'spectrum');

    currentViewer.zoomTo();
    currentViewer.render();

    if (loadingEl) loadingEl.style.display = 'none';
    showStructureInfo(id, pdbData, source);

  } catch (error) {
    const suggestion = source === 'pdb' && /^[A-Z][0-9][A-Z0-9]{3}[0-9]$/i.test(id)
      ? '<br><span style="color:var(--accent-cyan);font-size:11px;">This looks like a UniProt ID — try the AlphaFold tab instead.</span>'
      : '';

    if (loadingEl) {
      loadingEl.innerHTML = `
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.5" opacity="0.6">
          <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <p style="color:#ef4444;font-size:13px;">Failed to load: ${id}</p>
        <p style="color:var(--text-muted);font-size:11px;text-align:center;max-width:400px;">${error.message}${suggestion}</p>
      `;
      loadingEl.style.display = 'flex';
    }
  }
}

// Fetch with timeout
async function fetchWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    if (!text || text.length < 50) throw new Error('Empty response');
    return text;
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Request timed out (15s)');
    throw err;
  }
}

function applyStyle(viewer, styleName, colorScheme) {
  const models = viewer.getModel();
  if (!models) return;

  viewer.setStyle({}, {});
  const colorOpts = getColorOptions(colorScheme);
  const styleOpts = { ...colorOpts };

  switch (styleName) {
    case 'cartoon':
      viewer.setStyle({}, { cartoon: { ...styleOpts, arrows: true, tubes: true, thickness: 0.2 } });
      break;
    case 'stick':
      viewer.setStyle({}, { stick: { ...styleOpts, radius: 0.15 } });
      break;
    case 'sphere':
      viewer.setStyle({}, { sphere: { ...styleOpts, scale: 0.3 } });
      break;
    case 'line':
      viewer.setStyle({}, { line: styleOpts });
      break;
    case 'cross':
      viewer.setStyle({}, { sphere: { ...styleOpts, scale: 0.2 }, stick: { ...styleOpts, radius: 0.1 } });
      break;
    default:
      viewer.setStyle({}, { cartoon: { ...styleOpts } });
  }
  viewer.render();
}

function getColorOptions(scheme) {
  switch (scheme) {
    case 'spectrum': return { color: 'spectrum' };
    case 'chain': return { colorscheme: 'chainHetatm' };
    case 'ss': return { colorscheme: 'ssJmol' };
    case 'residue': return { colorscheme: 'amino' };
    case 'element': return { colorscheme: 'default' };
    case 'confidence': return { colorscheme: { prop: 'b', gradient: new $3Dmol.Gradient.RWB(50, 90) } };
    case 'cyan': return { color: '0x06b6d4' };
    default: return { color: 'spectrum' };
  }
}

function showStructureInfo(id, pdbData, source) {
  const infoEl = document.getElementById('structure-info');
  const statsEl = document.getElementById('structure-stats');
  if (!infoEl || !statsEl) return;

  const lines = pdbData.split('\n');
  const atomCount = lines.filter(l => l.startsWith('ATOM')).length;
  const chains = new Set(lines.filter(l => l.startsWith('ATOM')).map(l => l[21]).filter(Boolean));
  const residues = new Set(lines.filter(l => l.startsWith('ATOM')).map(l => l.substring(17, 26).trim()));

  const titleLine = lines.find(l => l.startsWith('TITLE'));
  const title = titleLine ? titleLine.substring(10).trim() : id;

  const expLine = lines.find(l => l.startsWith('EXPDTA'));
  const method = expLine ? expLine.substring(10).trim() : (source === 'alphafold' ? 'AI Prediction (AlphaFold2)' : 'Unknown');

  const resLine = lines.find(l => l.startsWith('REMARK   2 RESOLUTION'));
  const resolution = resLine ? resLine.replace(/.*RESOLUTION[\.\s]*/i, '').replace(/ANGSTROMS.*/i, '').trim() : 'N/A';

  const sourceLabel = source === 'alphafold'
    ? `<span style="color:#4ade80;">AlphaFold DB</span>`
    : `<span style="color:var(--accent-cyan);">RCSB PDB</span>`;

  statsEl.innerHTML = `
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${source === 'alphafold' ? 'UniProt' : 'PDB'} ID</div>
      <div style="font-size:20px;font-weight:700;color:var(--accent-cyan);">${id}</div>
    </div>
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Source</div>
      <div style="font-size:14px;font-weight:600;">${sourceLabel}</div>
    </div>
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Atoms</div>
      <div style="font-size:20px;font-weight:700;color:var(--text-primary);">${atomCount.toLocaleString()}</div>
    </div>
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Chains</div>
      <div style="font-size:20px;font-weight:700;color:var(--text-primary);">${chains.size}</div>
    </div>
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Residues</div>
      <div style="font-size:20px;font-weight:700;color:var(--text-primary);">${residues.size.toLocaleString()}</div>
    </div>
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Method</div>
      <div style="font-size:12px;color:var(--text-secondary);">${method}</div>
    </div>
    ${source !== 'alphafold' ? `
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Resolution</div>
      <div style="font-size:12px;color:var(--text-secondary);">${resolution} ${resolution !== 'N/A' ? 'Å' : ''}</div>
    </div>` : `
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Confidence</div>
      <div style="font-size:12px;color:var(--text-secondary);">Use "By Confidence" color to view pLDDT scores</div>
    </div>`}
  `;
  infoEl.style.display = 'block';
}
