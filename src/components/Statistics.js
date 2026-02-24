// ============================================
// BioGenesis — Statistics Component
// ============================================

import { gcContent, nucleotideComposition, molecularWeight, meltingTemp, findORFs, translate, getNucleotideClass, getAminoAcidClass } from '../utils/bioUtils.js';

export function renderStatistics(seq) {
    const seqStr = seq.sequence;
    const len = seqStr.length;
    const type = seq.type;

    // Basic stats
    const gc = type !== 'protein' ? gcContent(seqStr) : null;
    const mw = molecularWeight(seqStr, type);
    const tm = type !== 'protein' ? meltingTemp(seqStr) : null;
    const comp = type !== 'protein' ? nucleotideComposition(seqStr) : aminoAcidComposition(seqStr);

    // Stats cards
    let cardsHtml = `
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-title">Length</div>
        <div class="stat-value">${len.toLocaleString()}<span class="stat-unit">${type === 'protein' ? 'aa' : 'bp'}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Molecular Weight</div>
        <div class="stat-value">${mw > 1000 ? (mw / 1000).toFixed(1) : mw.toFixed(0)}<span class="stat-unit">${mw > 1000 ? 'kDa' : 'Da'}</span></div>
      </div>`;

    if (gc !== null) {
        cardsHtml += `
      <div class="stat-card">
        <div class="stat-title">GC Content</div>
        <div class="stat-value">${gc.toFixed(1)}<span class="stat-unit">%</span></div>
      </div>`;
    }

    if (tm !== null) {
        cardsHtml += `
      <div class="stat-card">
        <div class="stat-title">Melting Temp (Tm)</div>
        <div class="stat-value">${tm.toFixed(1)}<span class="stat-unit">°C</span></div>
      </div>`;
    }

    cardsHtml += '</div>';

    // Composition chart
    let compositionHtml = '';
    if (type !== 'protein') {
        const total = comp.A + comp.T + comp.C + comp.G + comp.U;
        const segments = [
            { label: 'A', count: comp.A, color: 'var(--nt-a)', pct: (comp.A / total * 100) },
            { label: 'T', count: comp.T, color: 'var(--nt-t)', pct: (comp.T / total * 100) },
            { label: 'C', count: comp.C, color: 'var(--nt-c)', pct: (comp.C / total * 100) },
            { label: 'G', count: comp.G, color: 'var(--nt-g)', pct: (comp.G / total * 100) },
        ];
        if (comp.U > 0) segments.push({ label: 'U', count: comp.U, color: 'var(--nt-u)', pct: (comp.U / total * 100) });

        compositionHtml = `
      <div class="composition-chart" style="margin-bottom:20px;">
        <h3 style="font-size:13px;font-weight:600;color:var(--text-secondary);">Nucleotide Composition</h3>
        <div class="composition-bar">
          ${segments.filter(s => s.count > 0).map(s =>
            `<div class="composition-segment" style="flex-grow:${s.count};background:${s.color};">${s.label} ${s.pct.toFixed(1)}%</div>`
        ).join('')}
        </div>
        <div style="margin-top:12px;">
          ${segments.filter(s => s.count > 0).map(s => `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span class="legend-dot" style="background:${s.color};"></span>
              <span style="font-size:12px;font-weight:600;width:20px;">${s.label}</span>
              <div style="flex:1;height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden;">
                <div style="width:${s.pct}%;height:100%;background:${s.color};border-radius:4px;transition:width 0.5s;"></div>
              </div>
              <span style="font-size:11px;color:var(--text-secondary);min-width:90px;text-align:right;">${s.count.toLocaleString()} (${s.pct.toFixed(1)}%)</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    } else {
        // Amino acid composition
        const entries = Object.entries(comp).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((s, [_, v]) => s + v, 0);

        const aaColors = {
            'A': '#3fb950', 'I': '#3fb950', 'L': '#3fb950', 'M': '#3fb950', 'F': '#3fb950', 'W': '#3fb950', 'V': '#3fb950', 'P': '#3fb950',
            'S': '#58a6ff', 'T': '#58a6ff', 'Y': '#58a6ff', 'N': '#58a6ff', 'Q': '#58a6ff', 'H': '#58a6ff', 'C': '#58a6ff',
            'R': '#f85149', 'K': '#f85149',
            'D': '#f778ba', 'E': '#f778ba',
            'G': '#e3b341'
        };

        compositionHtml = `
      <div class="composition-chart" style="margin-bottom:20px;">
        <h3 style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">Amino Acid Composition</h3>
        ${entries.map(([aa, count]) => {
            const pct = (count / total * 100);
            const color = aaColors[aa] || '#6e7681';
            return `
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
              <span style="font-size:12px;font-weight:600;width:16px;color:${color};">${aa}</span>
              <div style="flex:1;height:8px;background:var(--bg-tertiary);border-radius:4px;overflow:hidden;">
                <div style="width:${Math.max(pct, 0.5)}%;height:100%;background:${color};border-radius:4px;opacity:0.7;"></div>
              </div>
              <span style="font-size:11px;color:var(--text-secondary);min-width:80px;text-align:right;">${count} (${pct.toFixed(1)}%)</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
    }

    // ORF finder for DNA
    let orfHtml = '';
    if (type === 'dna' || type === 'rna') {
        const orfs = findORFs(seqStr, 90);
        if (orfs.length > 0) {
            orfHtml = `
        <div style="margin-bottom:20px;">
          <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Open Reading Frames (≥ 90 bp)</h3>
          <div class="orf-container">
            ${[1, 2, 3].map(frame => {
                const frameOrfs = orfs.filter(o => o.frame === frame);
                return `
                <div class="orf-track">
                  <span class="orf-track-label">Frame +${frame}</span>
                  <div class="orf-track-bar">
                    ${frameOrfs.map(orf => {
                    const left = (orf.start / len * 100).toFixed(2);
                    const width = ((orf.end - orf.start) / len * 100).toFixed(2);
                    return `<div class="orf-block" style="left:${left}%;width:${width}%;" title="ORF: ${orf.start + 1}..${orf.end} (${orf.length} bp, ${orf.protein.length} aa)"></div>`;
                }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <div style="margin-top:12px;overflow-x:auto;">
            <table class="blast-results-table">
              <thead><tr><th>Frame</th><th>Start</th><th>End</th><th>Length (bp)</th><th>Length (aa)</th><th>Protein (first 30 aa)</th></tr></thead>
              <tbody>
                ${orfs.slice(0, 10).map(orf => `
                  <tr>
                    <td>+${orf.frame}</td>
                    <td>${orf.start + 1}</td>
                    <td>${orf.end}</td>
                    <td>${orf.length}</td>
                    <td>${orf.protein.length}</td>
                    <td style="font-family:var(--font-mono);font-size:11px;">${orf.protein.substring(0, 30)}${orf.protein.length > 30 ? '...' : ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
        } else {
            orfHtml = `
        <div style="margin-bottom:20px;">
          <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Open Reading Frames</h3>
          <p style="color:var(--text-muted);font-size:12px;">No ORFs ≥ 90 bp found.</p>
        </div>
      `;
        }
    }

    // Codon usage for DNA
    let codonHtml = '';
    if ((type === 'dna' || type === 'rna') && len >= 3) {
        const codonCounts = {};
        const upper = seqStr.toUpperCase();
        for (let i = 0; i + 2 < upper.length; i += 3) {
            const codon = upper.substring(i, i + 3);
            codonCounts[codon] = (codonCounts[codon] || 0) + 1;
        }
        const totalCodons = Object.values(codonCounts).reduce((s, v) => s + v, 0);
        const topCodons = Object.entries(codonCounts).sort((a, b) => b[1] - a[1]).slice(0, 16);

        codonHtml = `
      <div class="composition-chart">
        <h3 style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:12px;">Top Codon Usage (Frame +1)</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;">
          ${topCodons.map(([codon, count]) => {
            const pct = (count / totalCodons * 100).toFixed(1);
            return `<div style="display:flex;align-items:center;gap:6px;font-size:11px;">
              <span style="font-family:var(--font-mono);font-weight:600;color:var(--text-primary);width:36px;">${codon}</span>
              <div style="flex:1;height:6px;background:var(--bg-tertiary);border-radius:3px;overflow:hidden;">
                <div style="width:${Math.max(parseFloat(pct) * 2, 1)}%;height:100%;background:var(--accent-cyan);border-radius:3px;"></div>
              </div>
              <span style="color:var(--text-muted);min-width:50px;text-align:right;">${count} (${pct}%)</span>
            </div>`;
        }).join('')}
        </div>
      </div>
    `;
    }

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Sequence Statistics</h2>
        <p>${escapeHtml(seq.name)} — Comprehensive analysis</p>
      </div>
      <div class="panel-body">
        ${cardsHtml}
        ${compositionHtml}
        ${orfHtml}
        ${codonHtml}
      </div>
    </div>
  `;
}

function aminoAcidComposition(seq) {
    const comp = {};
    for (const c of seq.toUpperCase()) {
        if (c.match(/[A-Z]/)) {
            comp[c] = (comp[c] || 0) + 1;
        }
    }
    return comp;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
