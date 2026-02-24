// ============================================
// BioGenesis — 6-Frame Translation Component
// ============================================

import { translate, reverseComplement, getAminoAcidClass, getNucleotideClass, CODON_TABLE } from '../utils/bioUtils.js';

export function renderSixFrameTranslation(seq) {
    if (seq.type === 'protein') {
        return `
      <div class="panel active">
        <div class="panel-header"><h2>6-Frame Translation</h2><p>Requires a DNA or RNA sequence</p></div>
        <div class="panel-body"><div class="empty-state"><p class="empty-state-text">Please select a DNA/RNA sequence</p></div></div>
      </div>`;
    }

    const seqStr = seq.sequence.toUpperCase();
    const rc = reverseComplement(seqStr);
    const displayLen = Math.min(seqStr.length, 600); // limit for display
    const dna = seqStr.substring(0, displayLen);
    const rcDna = rc.substring(0, displayLen);

    // Forward frames
    const frames = [];
    for (let f = 0; f < 3; f++) {
        const protein = translate(dna, f);
        frames.push({ label: `+${f + 1}`, frame: f, protein, direction: 'forward' });
    }

    // Reverse frames
    for (let f = 0; f < 3; f++) {
        const protein = translate(rcDna, f);
        frames.push({ label: `-${f + 1}`, frame: f, protein, direction: 'reverse' });
    }

    // Render DNA sequence line
    const dnaLine = dna.split('').map(c => `<span class="${getNucleotideClass(c)}">${c}</span>`).join('');

    // Render each frame
    const frameBlocks = frames.map(fr => {
        const aaHtml = fr.protein.split('').map(aa => {
            if (aa === '*') return `<span class="stop-codon">*</span>`;
            if (aa === 'M') return `<span class="met-codon">M</span>`;
            return `<span class="${getAminoAcidClass(aa)}">${aa}</span>`;
        }).join('');

        // Space amino acids to align with codons
        const spacedAa = fr.protein.split('').map((aa, i) => {
            const cls = aa === '*' ? 'stop-codon' : aa === 'M' ? 'met-codon' : getAminoAcidClass(aa);
            return `<span class="${cls}"> ${aa} </span>`;
        }).join('');

        return `
      <div class="frame-row">
        <div class="frame-label">${fr.direction === 'forward' ? 'Forward' : 'Reverse'} Frame ${fr.label}</div>
        <div class="frame-sequence">${spacedAa}</div>
      </div>
    `;
    });

    // ORF summary across all frames
    let orfSummary = '';
    const allOrfs = [];
    for (const fr of frames) {
        let inOrf = false, orfStart = 0;
        for (let i = 0; i < fr.protein.length; i++) {
            if (fr.protein[i] === 'M' && !inOrf) {
                inOrf = true;
                orfStart = i;
            } else if (fr.protein[i] === '*' && inOrf) {
                const orfLen = i - orfStart;
                if (orfLen >= 10) { // at least 10 aa
                    allOrfs.push({
                        frame: fr.label,
                        start: orfStart,
                        end: i,
                        length: orfLen,
                        protein: fr.protein.substring(orfStart, i + 1)
                    });
                }
                inOrf = false;
            }
        }
    }
    allOrfs.sort((a, b) => b.length - a.length);

    if (allOrfs.length > 0) {
        orfSummary = `
      <div style="margin-top:20px;">
        <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">ORFs Found Across All Frames (min 10 aa)</h3>
        <table class="blast-results-table">
          <thead><tr><th>Frame</th><th>Start (aa)</th><th>End (aa)</th><th>Length (aa)</th><th>First 30 residues</th></tr></thead>
          <tbody>
            ${allOrfs.slice(0, 15).map(orf => `
              <tr>
                <td style="font-weight:600;color:var(--accent-cyan);">${orf.frame}</td>
                <td>${orf.start + 1}</td>
                <td>${orf.end + 1}</td>
                <td>${orf.length}</td>
                <td style="font-family:var(--font-mono);font-size:11px;">${orf.protein.substring(0, 30)}${orf.protein.length > 30 ? '...' : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    }

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>6-Frame Translation</h2>
        <p>${escapeHtml(seq.name)} — showing ${displayLen > seqStr.length ? '' : 'first '}${displayLen} bp${displayLen < seqStr.length ? ` of ${seqStr.length} bp` : ''}</p>
      </div>
      <div class="panel-body">
        <div class="stats-grid" style="margin-bottom:16px;">
          <div class="stat-card"><div class="stat-title">Sequence Length</div><div class="stat-value">${seqStr.length}<span class="stat-unit">bp</span></div></div>
          <div class="stat-card"><div class="stat-title">ORFs Found</div><div class="stat-value">${allOrfs.length}</div></div>
          <div class="stat-card"><div class="stat-title">Longest ORF</div><div class="stat-value">${allOrfs.length > 0 ? allOrfs[0].length : 0}<span class="stat-unit">aa</span></div></div>
        </div>
        
        <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Forward Strand DNA</h3>
        <div class="frame-sequence" style="margin-bottom:16px;">${dnaLine.substring(0, 3000)}</div>
        
        <div class="frame-divider"></div>
        
        <div class="frame-translation-container">
          ${frameBlocks.slice(0, 3).join('<div class="frame-divider"></div>')}
        </div>
        
        <div class="frame-divider" style="margin:16px 0;height:2px;background:var(--border-default);"></div>
        
        <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Reverse Complement Frames</h3>
        <div class="frame-translation-container">
          ${frameBlocks.slice(3).join('<div class="frame-divider"></div>')}
        </div>
        
        ${orfSummary}
        
        <div style="margin-top:16px;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-sm);font-size:11px;color:var(--text-muted);">
          <strong>Legend:</strong> 
          <span class="met-codon" style="margin:0 4px;">M</span> = Start codon (Met) &nbsp;
          <span class="stop-codon" style="margin:0 4px;">*</span> = Stop codon &nbsp;
          <span class="aa-hydrophobic" style="margin:0 4px;">Hydrophobic</span> &nbsp;
          <span class="aa-polar" style="margin:0 4px;">Polar</span> &nbsp;
          <span class="aa-positive" style="margin:0 4px;">Positive</span> &nbsp;
          <span class="aa-negative" style="margin:0 4px;">Negative</span>
        </div>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
