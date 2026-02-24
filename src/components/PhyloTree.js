// ============================================
// BioGenesis — Phylogenetic Tree Component
// ============================================

import { calculateDistanceMatrix, neighborJoining, renderTreeSVG } from '../utils/phylo.js';

export function renderPhyloTree(sequences) {
    const dnaSeqs = sequences.filter(s => s.type === 'dna' || s.type === 'rna');
    const proteinSeqs = sequences.filter(s => s.type === 'protein');
    const allSeqs = [...dnaSeqs, ...proteinSeqs];

    const checkboxes = allSeqs.map((s, i) => `
    <label style="display:flex;align-items:center;gap:6px;padding:4px 8px;cursor:pointer;font-size:12px;">
      <input type="checkbox" class="phylo-seq-check" value="${sequences.indexOf(s)}" ${i < Math.min(4, allSeqs.length) ? 'checked' : ''}>
      ${escapeHtml(s.name)} <span style="color:var(--text-muted);font-size:10px;">(${s.sequence.length} ${s.type === 'protein' ? 'aa' : 'bp'})</span>
    </label>
  `).join('');

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Phylogenetic Tree</h2>
        <p>Construct a Neighbor-Joining tree from selected sequences</p>
      </div>
      <div class="panel-controls">
        <div class="form-group">
          <label class="form-label">Select Sequences (min. 3)</label>
          <div style="max-height:150px;overflow-y:auto;background:var(--bg-tertiary);border-radius:var(--radius-sm);padding:4px;border:1px solid var(--border-muted);">
            ${checkboxes}
          </div>
        </div>
        <button class="btn btn-primary" id="build-tree-btn">Build Tree</button>
      </div>
      <div class="panel-body" id="phylo-result">
        <div class="empty-state">
          <span class="empty-state-icon"></span>
          <p class="empty-state-text">Select at least 3 sequences and click "Build Tree"</p>
        </div>
      </div>
    </div>
  `;
}

export function computeAndRenderTree(seqs) {
    if (seqs.length < 3) {
        return '<div class="empty-state"><span class="empty-state-icon"></span><p class="empty-state-text">Need at least 3 sequences</p></div>';
    }

    try {
        // Use short sequences for alignment speed
        const maxLen = 500;
        const trimmedSeqs = seqs.map(s => s.sequence.substring(0, maxLen));
        const names = seqs.map(s => s.name);

        const { matrix } = calculateDistanceMatrix(trimmedSeqs, names);
        const tree = neighborJoining(matrix, names);
        const height = Math.max(300, seqs.length * 50);
        const svg = renderTreeSVG(tree, 700, height);

        // Distance matrix table
        let matrixHtml = '<h3 style="font-size:13px;font-weight:600;margin:16px 0 8px;color:var(--text-secondary);">Distance Matrix</h3>';
        matrixHtml += '<div style="overflow-x:auto;"><table class="blast-results-table"><thead><tr><th></th>';
        for (const n of names) matrixHtml += `<th>${escapeHtml(n)}</th>`;
        matrixHtml += '</tr></thead><tbody>';
        for (let i = 0; i < names.length; i++) {
            matrixHtml += `<tr><td style="font-weight:600;">${escapeHtml(names[i])}</td>`;
            for (let j = 0; j < names.length; j++) {
                const val = matrix[i][j];
                const bg = i === j ? 'transparent' : `rgba(6,182,212,${Math.min(val * 2, 0.3)})`;
                matrixHtml += `<td style="background:${bg};font-family:var(--font-mono);font-size:11px;">${val.toFixed(3)}</td>`;
            }
            matrixHtml += '</tr>';
        }
        matrixHtml += '</tbody></table></div>';

        return `
      <div class="phylo-container">${svg}</div>
      ${matrixHtml}
    `;
    } catch (e) {
        return `<div class="empty-state"><span class="empty-state-icon"></span><p class="empty-state-text">Error building tree: ${e.message}</p></div>`;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
