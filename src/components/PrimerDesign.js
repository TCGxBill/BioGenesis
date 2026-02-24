// ============================================
// BioGenesis — Primer Design Component
// ============================================

import { gcContent, meltingTemp, complement, reverseComplement, getNucleotideClass } from '../utils/bioUtils.js';

export function renderPrimerDesign(seq) {
    if (seq.type === 'protein') {
        return `
      <div class="panel active">
        <div class="panel-header"><h2>Primer Design</h2><p>Primer design requires a DNA sequence</p></div>
        <div class="panel-body"><div class="empty-state"><span class="empty-state-icon"></span><p class="empty-state-text">Please select a DNA sequence for primer design</p></div></div>
      </div>`;
    }

    const seqStr = seq.sequence;
    const len = seqStr.length;

    // Auto-design primers
    const primers = designPrimers(seqStr);

    let primersHtml = '';
    if (primers.length > 0) {
        primersHtml = `<div class="primer-results">
      ${primers.map((p, i) => `
        <div class="primer-card">
          <h4>${p.direction === 'forward' ? '→ Forward' : '← Reverse'} Primer ${Math.ceil((i + 1) / 2)}</h4>
          <div class="primer-seq">${colorCodeDNA(p.sequence)}</div>
          <div class="primer-stats">
            <div class="primer-stat"><span class="stat-label">Tm:</span><span class="stat-value">${p.tm.toFixed(1)}°C</span></div>
            <div class="primer-stat"><span class="stat-label">GC%:</span><span class="stat-value">${p.gc.toFixed(1)}%</span></div>
            <div class="primer-stat"><span class="stat-label">Length:</span><span class="stat-value">${p.sequence.length} nt</span></div>
            <div class="primer-stat"><span class="stat-label">Position:</span><span class="stat-value">${p.start + 1}..${p.end}</span></div>
            ${p.hairpin ? `<div class="primer-stat"><span class="stat-label">Hairpin:</span><span class="stat-value" style="color:var(--accent-orange);">Yes</span></div>` : ''}
            ${p.selfDimer ? `<div class="primer-stat"><span class="stat-label">Self-dimer:</span><span class="stat-value" style="color:var(--accent-orange);">Yes</span></div>` : ''}
          </div>
        </div>
      `).join('')}
    </div>`;
    }

    // Primer binding visualization
    let bindingViz = '';
    if (primers.length >= 2) {
        const fwd = primers.find(p => p.direction === 'forward');
        const rev = primers.find(p => p.direction === 'reverse');
        if (fwd && rev) {
            const fwdLeft = (fwd.start / len * 100).toFixed(1);
            const fwdWidth = ((fwd.end - fwd.start) / len * 100).toFixed(1);
            const revLeft = (rev.start / len * 100).toFixed(1);
            const revWidth = ((rev.end - rev.start) / len * 100).toFixed(1);
            const ampLeft = fwdLeft;
            const ampWidth = (parseFloat(revLeft) + parseFloat(revWidth) - parseFloat(fwdLeft)).toFixed(1);

            bindingViz = `
        <div style="margin-top:20px;">
          <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Primer Binding Map</h3>
          <div style="background:var(--bg-tertiary);border-radius:var(--radius-md);padding:16px;border:1px solid var(--border-muted);">
            <div style="position:relative;height:60px;">
              <!-- Template -->
              <div style="position:absolute;top:25px;left:0;right:0;height:2px;background:var(--text-muted);"></div>
              <!-- Amplicon -->
              <div style="position:absolute;top:22px;left:${ampLeft}%;width:${ampWidth}%;height:8px;background:rgba(6,182,212,0.2);border-radius:2px;"></div>
              <!-- Forward primer -->
              <div style="position:absolute;top:15px;left:${fwdLeft}%;width:${fwdWidth}%;height:6px;background:var(--accent-green);border-radius:2px;" title="Forward primer"></div>
              <div style="position:absolute;top:3px;left:${fwdLeft}%;font-size:10px;color:var(--accent-green);">→ Fwd</div>
              <!-- Reverse primer -->
              <div style="position:absolute;top:32px;left:${revLeft}%;width:${revWidth}%;height:6px;background:var(--accent-red);border-radius:2px;" title="Reverse primer"></div>
              <div style="position:absolute;top:42px;left:${revLeft}%;font-size:10px;color:var(--accent-red);">← Rev</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:8px;">
              Amplicon size: <strong style="color:var(--text-primary);">${rev.end - fwd.start} bp</strong>
            </div>
          </div>
        </div>
      `;
        }
    }

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Primer Design</h2>
        <p>Auto-designed primers for ${escapeHtml(seq.name)} (${len.toLocaleString()} bp)</p>
      </div>
      <div class="panel-body">
        <div class="stats-grid" style="margin-bottom:20px;">
          <div class="stat-card">
            <div class="stat-title">Sequence Length</div>
            <div class="stat-value">${len.toLocaleString()}<span class="stat-unit">bp</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Primer Pairs Found</div>
            <div class="stat-value">${Math.floor(primers.length / 2)}</div>
          </div>
        </div>
        ${primersHtml}
        ${bindingViz}
      </div>
    </div>
  `;
}

function designPrimers(seq, primerLength = 20, targetRegionStart = null, targetRegionEnd = null) {
    const upper = seq.toUpperCase();
    const len = upper.length;
    const primers = [];

    // Default: design primers for the whole sequence
    const start = targetRegionStart || 0;
    const end = targetRegionEnd || len;

    // Try multiple forward primer positions near the start
    for (let pLen = 18; pLen <= 25; pLen++) {
        if (start + pLen > len) continue;
        const fwdSeq = upper.substring(start, start + pLen);
        const tm = meltingTemp(fwdSeq);
        const gc = gcContent(fwdSeq);

        if (tm >= 50 && tm <= 65 && gc >= 40 && gc <= 60) {
            primers.push({
                sequence: fwdSeq,
                direction: 'forward',
                start: start,
                end: start + pLen,
                tm, gc,
                hairpin: checkHairpin(fwdSeq),
                selfDimer: checkSelfDimer(fwdSeq)
            });
            break;
        }
    }

    // If no ideal primer found, just use 20bp
    if (primers.length === 0 && len >= 20) {
        const fwdSeq = upper.substring(start, start + 20);
        primers.push({
            sequence: fwdSeq,
            direction: 'forward',
            start: start,
            end: start + 20,
            tm: meltingTemp(fwdSeq),
            gc: gcContent(fwdSeq),
            hairpin: checkHairpin(fwdSeq),
            selfDimer: checkSelfDimer(fwdSeq)
        });
    }

    // Reverse primer near the end
    for (let pLen = 18; pLen <= 25; pLen++) {
        if (end - pLen < 0) continue;
        const revTemplate = upper.substring(end - pLen, end);
        const revSeq = reverseComplement(revTemplate);
        const tm = meltingTemp(revSeq);
        const gc = gcContent(revSeq);

        if (tm >= 50 && tm <= 65 && gc >= 40 && gc <= 60) {
            primers.push({
                sequence: revSeq,
                direction: 'reverse',
                start: end - pLen,
                end: end,
                tm, gc,
                hairpin: checkHairpin(revSeq),
                selfDimer: checkSelfDimer(revSeq)
            });
            break;
        }
    }

    if (primers.length === 1 && len >= 40) {
        const pLen = 20;
        const revTemplate = upper.substring(end - pLen, end);
        const revSeq = reverseComplement(revTemplate);
        primers.push({
            sequence: revSeq,
            direction: 'reverse',
            start: end - pLen,
            end: end,
            tm: meltingTemp(revSeq),
            gc: gcContent(revSeq),
            hairpin: checkHairpin(revSeq),
            selfDimer: checkSelfDimer(revSeq)
        });
    }

    return primers;
}

function checkHairpin(seq) {
    const len = seq.length;
    if (len < 8) return false;
    // Simple check: look for complementary regions
    for (let i = 0; i < len - 6; i++) {
        for (let j = i + 4; j < len - 2; j++) {
            let matches = 0;
            for (let k = 0; k < 3; k++) {
                if (isComplement(seq[i + k], seq[j + 2 - k])) matches++;
            }
            if (matches >= 3) return true;
        }
    }
    return false;
}

function checkSelfDimer(seq) {
    const len = seq.length;
    if (len < 6) return false;
    const rc = reverseComplement(seq);
    let maxRun = 0, run = 0;
    for (let offset = 0; offset < len; offset++) {
        run = 0;
        for (let i = 0; i < len - offset; i++) {
            if (seq[i + offset] === rc[i]) {
                run++;
                maxRun = Math.max(maxRun, run);
            } else {
                run = 0;
            }
        }
    }
    return maxRun >= 4;
}

function isComplement(a, b) {
    const pairs = { 'A': 'T', 'T': 'A', 'C': 'G', 'G': 'C' };
    return pairs[a.toUpperCase()] === b.toUpperCase();
}

function colorCodeDNA(seq) {
    return seq.split('').map(c => `<span class="${getNucleotideClass(c)}">${c}</span>`).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
