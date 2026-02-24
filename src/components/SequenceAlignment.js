// ============================================
// BioGenesis — Sequence Alignment Component
// ============================================

import { needlemanWunsch, smithWaterman, generateConsensus } from '../utils/alignment.js';
import { getNucleotideClass } from '../utils/bioUtils.js';

export function renderAlignment(sequences, activeIdx) {
    const dnaSequences = sequences.filter(s => s.type === 'dna' || s.type === 'rna');
    const proteinSequences = sequences.filter(s => s.type === 'protein');
    const allSequences = sequences;

    // Sequence selectors
    const options = allSequences.map((s, i) =>
        `<option value="${i}" ${i === activeIdx ? 'selected' : ''}>${escapeHtml(s.name)} (${s.sequence.length} ${s.type === 'protein' ? 'aa' : 'bp'})</option>`
    ).join('');

    const secondIdx = activeIdx < allSequences.length - 1 ? activeIdx + 1 : 0;
    const options2 = allSequences.map((s, i) =>
        `<option value="${i}" ${i === secondIdx ? 'selected' : ''}>${escapeHtml(s.name)} (${s.sequence.length} ${s.type === 'protein' ? 'aa' : 'bp'})</option>`
    ).join('');

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Sequence Alignment</h2>
        <p>Pairwise sequence alignment using Needleman-Wunsch or Smith-Waterman algorithms</p>
      </div>
      <div class="panel-controls">
        <div class="form-group">
          <label class="form-label">Sequence 1</label>
          <select class="form-select" id="align-seq1">${options}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Sequence 2</label>
          <select class="form-select" id="align-seq2">${options2}</select>
        </div>
        <div class="form-group">
          <label class="form-label">Algorithm</label>
          <select class="form-select" id="align-algo">
            <option value="nw">Needleman-Wunsch (Global)</option>
            <option value="sw">Smith-Waterman (Local)</option>
          </select>
        </div>
        <button class="btn btn-primary" id="run-alignment-btn">▶ Run Alignment</button>
      </div>
      <div class="panel-body" id="alignment-result">
        <div class="empty-state">
          <span class="empty-state-icon"></span>
          <p class="empty-state-text">Select two sequences and click "Run Alignment" to begin</p>
        </div>
      </div>
    </div>
  `;
}

export function computeAndRenderAlignment(seq1, seq2, algo = 'nw') {
    const isProtein = seq1.type === 'protein' || seq2.type === 'protein';

    // Limit sequence length for browser performance
    const maxLen = 2000;
    const s1 = seq1.sequence.substring(0, maxLen);
    const s2 = seq2.sequence.substring(0, maxLen);

    let result;
    if (algo === 'sw') {
        result = smithWaterman(s1, s2, isProtein);
    } else {
        result = needlemanWunsch(s1, s2, isProtein);
    }

    const consensus = generateConsensus([result.aligned1, result.aligned2]);

    // Render aligned sequences in blocks of 60
    const blockSize = 60;
    let blocks = '';

    for (let i = 0; i < result.aligned1.length; i += blockSize) {
        const end = Math.min(i + blockSize, result.aligned1.length);
        const block1 = result.aligned1.substring(i, end);
        const block2 = result.aligned2.substring(i, end);
        const blockCons = consensus.substring(i, end);

        // Match line
        let matchLine = '';
        for (let j = i; j < end; j++) {
            const a = result.aligned1[j]?.toUpperCase();
            const b = result.aligned2[j]?.toUpperCase();
            if (a === '-' || b === '-') matchLine += ' ';
            else if (a === b) matchLine += '|';
            else matchLine += '·';
        }

        blocks += `
      <div class="alignment-container" style="margin-bottom:8px;">
        <div class="alignment-row">
          <div class="alignment-label">${escapeHtml(seq1.name)}</div>
          <div class="alignment-seq">${colorCode(block1, isProtein ? 'protein' : seq1.type)}</div>
        </div>
        <div class="alignment-row">
          <div class="alignment-label" style="color:var(--text-muted);font-size:10px;">Match</div>
          <div class="alignment-seq" style="color:var(--text-muted);letter-spacing:1px;">${matchLine}</div>
        </div>
        <div class="alignment-row">
          <div class="alignment-label">${escapeHtml(seq2.name)}</div>
          <div class="alignment-seq">${colorCode(block2, isProtein ? 'protein' : seq2.type)}</div>
        </div>
      </div>
    `;
    }

    // Stats
    return `
    <div class="stats-grid" style="margin-bottom:16px;">
      <div class="stat-card">
        <div class="stat-title">Score</div>
        <div class="stat-value">${result.score}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Identity</div>
        <div class="stat-value">${result.identity.toFixed(1)}<span class="stat-unit">%</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Gaps</div>
        <div class="stat-value">${result.gaps}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Length</div>
        <div class="stat-value">${result.aligned1.length}<span class="stat-unit">${isProtein ? 'aa' : 'bp'}</span></div>
      </div>
    </div>
    ${blocks}
  `;
}

function colorCode(seq, type) {
    return seq.split('').map(c => {
        if (c === '-') return `<span class="nt-gap">-</span>`;
        const cls = type === 'protein'
            ? (c.match(/[AILMFWVP]/i) ? 'aa-hydrophobic' : c.match(/[RK]/i) ? 'aa-positive' : c.match(/[DE]/i) ? 'aa-negative' : 'aa-polar')
            : getNucleotideClass(c);
        return `<span class="${cls}">${c}</span>`;
    }).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
