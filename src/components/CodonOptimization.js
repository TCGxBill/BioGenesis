// ============================================
// BioGenesis — Codon Optimization Component
// ============================================

import { translate, CODON_TABLE, getNucleotideClass } from '../utils/bioUtils.js';

// Codon usage tables for common organisms (frequency per 1000 codons)
const CODON_USAGE = {
    ecoli: {
        name: 'E. coli K12',
        table: {
            'TTT': 22.0, 'TTC': 16.2, 'TTA': 13.8, 'TTG': 13.5, 'CTT': 11.6, 'CTC': 10.9, 'CTA': 3.9, 'CTG': 51.3,
            'ATT': 30.6, 'ATC': 24.5, 'ATA': 4.7, 'ATG': 27.3, 'GTT': 18.3, 'GTC': 15.0, 'GTA': 10.8, 'GTG': 25.7,
            'TAT': 16.2, 'TAC': 12.1, 'TAA': 2.0, 'TAG': 0.3, 'TGT': 5.2, 'TGC': 6.3, 'TGA': 1.0, 'TGG': 15.2,
            'TCT': 8.6, 'TCC': 8.7, 'TCA': 7.6, 'TCG': 8.7, 'CCT': 7.2, 'CCC': 5.5, 'CCA': 8.4, 'CCG': 22.6,
            'ACT': 9.0, 'ACC': 22.9, 'ACA': 7.6, 'ACG': 14.4, 'GCT': 15.5, 'GCC': 25.3, 'GCA': 20.3, 'GCG': 32.7,
            'GAT': 32.4, 'GAC': 19.0, 'GAA': 39.3, 'GAG': 18.3, 'CAT': 12.8, 'CAC': 9.4, 'CAA': 15.3, 'CAG': 28.8,
            'AAT': 18.3, 'AAC': 21.4, 'AAA': 33.9, 'AAG': 10.7, 'CGT': 20.7, 'CGC': 21.5, 'CGA': 3.7, 'CGG': 5.7,
            'AGT': 9.0, 'AGC': 15.9, 'AGA': 2.3, 'AGG': 1.5, 'GGT': 24.5, 'GGC': 28.5, 'GGA': 8.1, 'GGG': 11.2
        }
    },
    human: {
        name: 'Homo sapiens',
        table: {
            'TTT': 17.6, 'TTC': 20.3, 'TTA': 7.7, 'TTG': 12.9, 'CTT': 13.2, 'CTC': 19.6, 'CTA': 7.2, 'CTG': 39.6,
            'ATT': 16.0, 'ATC': 20.8, 'ATA': 7.5, 'ATG': 22.0, 'GTT': 11.0, 'GTC': 14.5, 'GTA': 7.1, 'GTG': 28.1,
            'TAT': 12.2, 'TAC': 15.3, 'TAA': 1.0, 'TAG': 0.8, 'TGT': 10.6, 'TGC': 12.6, 'TGA': 1.6, 'TGG': 13.2,
            'TCT': 15.2, 'TCC': 17.7, 'TCA': 12.2, 'TCG': 4.4, 'CCT': 17.5, 'CCC': 19.8, 'CCA': 16.9, 'CCG': 6.9,
            'ACT': 13.1, 'ACC': 18.9, 'ACA': 15.1, 'ACG': 6.1, 'GCT': 18.4, 'GCC': 27.7, 'GCA': 15.8, 'GCG': 7.4,
            'GAT': 21.8, 'GAC': 25.1, 'GAA': 29.0, 'GAG': 39.6, 'CAT': 10.9, 'CAC': 15.1, 'CAA': 12.3, 'CAG': 34.2,
            'AAT': 17.0, 'AAC': 19.1, 'AAA': 24.4, 'AAG': 31.9, 'CGT': 4.5, 'CGC': 10.4, 'CGA': 6.2, 'CGG': 11.4,
            'AGT': 12.1, 'AGC': 19.5, 'AGA': 12.2, 'AGG': 12.0, 'GGT': 10.8, 'GGC': 22.2, 'GGA': 16.5, 'GGG': 16.5
        }
    },
    yeast: {
        name: 'S. cerevisiae',
        table: {
            'TTT': 26.1, 'TTC': 18.2, 'TTA': 26.2, 'TTG': 27.1, 'CTT': 12.3, 'CTC': 5.4, 'CTA': 13.4, 'CTG': 10.4,
            'ATT': 30.1, 'ATC': 17.1, 'ATA': 17.8, 'ATG': 20.9, 'GTT': 22.1, 'GTC': 11.7, 'GTA': 11.8, 'GTG': 10.7,
            'TAT': 18.8, 'TAC': 14.7, 'TAA': 1.1, 'TAG': 0.5, 'TGT': 8.0, 'TGC': 4.7, 'TGA': 0.7, 'TGG': 10.4,
            'TCT': 23.5, 'TCC': 14.2, 'TCA': 18.7, 'TCG': 8.5, 'CCT': 13.5, 'CCC': 6.8, 'CCA': 18.2, 'CCG': 5.3,
            'ACT': 20.3, 'ACC': 12.7, 'ACA': 17.8, 'ACG': 8.0, 'GCT': 21.1, 'GCC': 12.5, 'GCA': 16.2, 'GCG': 6.1,
            'GAT': 37.6, 'GAC': 20.2, 'GAA': 45.6, 'GAG': 19.4, 'CAT': 13.6, 'CAC': 7.8, 'CAA': 27.3, 'CAG': 12.1,
            'AAT': 35.7, 'AAC': 24.8, 'AAA': 41.9, 'AAG': 30.8, 'CGT': 6.3, 'CGC': 2.6, 'CGA': 3.0, 'CGG': 1.7,
            'AGT': 14.2, 'AGC': 9.9, 'AGA': 21.3, 'AGG': 9.2, 'GGT': 23.7, 'GGC': 9.8, 'GGA': 10.9, 'GGG': 6.0
        }
    }
};

export function renderCodonOptimization(seq) {
    if (seq.type === 'protein') {
        return `
      <div class="panel active">
        <div class="panel-header"><h2>Codon Optimization</h2><p>Requires a DNA sequence</p></div>
        <div class="panel-body"><div class="empty-state"><p class="empty-state-text">Please select a DNA sequence</p></div></div>
      </div>`;
    }

    const organisms = Object.entries(CODON_USAGE).map(([key, val]) =>
        `<option value="${key}">${val.name}</option>`
    ).join('');

    const seqStr = seq.sequence.toUpperCase();
    const currentProtein = translate(seqStr);

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Codon Optimization</h2>
        <p>Optimize codon usage for expression in a target organism — ${escapeHtml(seq.name)}</p>
      </div>
      <div class="panel-controls">
        <div class="form-group">
          <label class="form-label">Target Organism</label>
          <select class="form-select" id="codon-organism">${organisms}</select>
        </div>
        <button class="btn btn-primary" id="run-codon-btn">Optimize</button>
      </div>
      <div class="panel-body" id="codon-result">
        ${renderCodonAnalysis(seqStr, 'ecoli')}
      </div>
    </div>
  `;
}

export function renderCodonAnalysis(dnaSeq, organismKey) {
    const usage = CODON_USAGE[organismKey];
    if (!usage) return '<p>Unknown organism</p>';

    const upper = dnaSeq.toUpperCase();

    // Current codon usage
    const codonCounts = {};
    let totalCodons = 0;
    for (let i = 0; i + 2 < upper.length; i += 3) {
        const codon = upper.substring(i, i + 3);
        if (codon.length === 3 && !codon.includes('N')) {
            codonCounts[codon] = (codonCounts[codon] || 0) + 1;
            totalCodons++;
        }
    }

    // Calculate CAI (Codon Adaptation Index) approximation
    let caiSum = 0, caiCount = 0;
    // Group codons by amino acid
    const aaGroups = {};
    for (const [codon, aa] of Object.entries(CODON_TABLE)) {
        if (!aaGroups[aa]) aaGroups[aa] = [];
        aaGroups[aa].push(codon);
    }

    for (const [codon, count] of Object.entries(codonCounts)) {
        const aa = CODON_TABLE[codon];
        if (!aa || aa === '*') continue;
        const synonyms = aaGroups[aa] || [];
        const maxFreq = Math.max(...synonyms.map(c => usage.table[c] || 0));
        const thisFreq = usage.table[codon] || 0.1;
        if (maxFreq > 0) {
            caiSum += count * Math.log(thisFreq / maxFreq);
            caiCount += count;
        }
    }
    const cai = caiCount > 0 ? Math.exp(caiSum / caiCount) : 0;

    // Optimize sequence
    let optimizedSeq = '';
    const protein = translate(upper);
    for (let i = 0; i < protein.length; i++) {
        const aa = protein[i];
        if (aa === '*') {
            optimizedSeq += getOptimalCodon('*', usage.table);
            continue;
        }
        optimizedSeq += getOptimalCodon(aa, usage.table);
    }

    const optimizedCai = calculateCAI(optimizedSeq, usage.table);

    // Changed codons count
    let changedCodons = 0;
    for (let i = 0; i < Math.min(upper.length, optimizedSeq.length) - 2; i += 3) {
        if (upper.substring(i, i + 3) !== optimizedSeq.substring(i, i + 3)) changedCodons++;
    }

    // Build codon usage comparison table
    const aas = [...new Set(Object.values(CODON_TABLE))].filter(a => a !== '*').sort();

    let tableHtml = '';
    for (const aa of aas) {
        const codons = aaGroups[aa] || [];
        if (codons.length === 0) continue;
        const rows = codons.map(codon => {
            const orgFreq = usage.table[codon] || 0;
            const seqCount = codonCounts[codon] || 0;
            const seqFreq = totalCodons > 0 ? (seqCount / totalCodons * 1000) : 0;
            const maxFreq = Math.max(...codons.map(c => usage.table[c] || 0));
            const isOptimal = orgFreq === maxFreq && maxFreq > 0;

            return `<div class="codon-cell${isOptimal ? ' style="border-left:2px solid var(--accent-green);"' : ''}">
        <span class="codon-triplet">${colorCodeDNA(codon)}</span>
        <span class="codon-aa">${aa}</span>
        <div class="codon-freq-bar"><div class="codon-freq-fill" style="width:${Math.min(100, orgFreq / Math.max(maxFreq, 1) * 100)}%;${isOptimal ? 'background:var(--accent-green);' : ''}"></div></div>
        <span class="codon-freq">${orgFreq.toFixed(1)}</span>
      </div>`;
        }).join('');
        tableHtml += rows;
    }

    return `
    <div class="stats-grid" style="margin-bottom:20px;">
      <div class="stat-card">
        <div class="stat-title">Current CAI</div>
        <div class="stat-value" style="color:${cai > 0.7 ? 'var(--accent-green)' : cai > 0.4 ? 'var(--accent-orange)' : 'var(--accent-red)'};">${cai.toFixed(3)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Optimized CAI</div>
        <div class="stat-value" style="color:var(--accent-green);">${optimizedCai.toFixed(3)}</div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Changed Codons</div>
        <div class="stat-value">${changedCodons}<span class="stat-unit">/ ${totalCodons}</span></div>
      </div>
      <div class="stat-card">
        <div class="stat-title">Target Organism</div>
        <div class="stat-value" style="font-size:14px;">${usage.name}</div>
      </div>
    </div>
    
    <div style="margin-bottom:20px;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Optimized Sequence</h3>
      <div class="sequence-display" style="font-size:12px;max-height:200px;overflow:auto;">
        ${formatOptimizedSeq(upper, optimizedSeq)}
      </div>
      <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">
        Red = changed codons | Same protein sequence is preserved
      </p>
    </div>
    
    <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Codon Usage Table — ${usage.name} (freq/1000)</h3>
    <div class="codon-table-grid">${tableHtml}</div>
  `;
}

function getOptimalCodon(aa, usageTable) {
    const candidates = Object.entries(CODON_TABLE).filter(([_, a]) => a === aa);
    if (candidates.length === 0) return 'NNN';
    let best = candidates[0][0], bestFreq = 0;
    for (const [codon] of candidates) {
        const freq = usageTable[codon] || 0;
        if (freq > bestFreq) {
            bestFreq = freq;
            best = codon;
        }
    }
    return best;
}

function calculateCAI(seq, usageTable) {
    const aaGroups = {};
    for (const [codon, aa] of Object.entries(CODON_TABLE)) {
        if (!aaGroups[aa]) aaGroups[aa] = [];
        aaGroups[aa].push(codon);
    }
    let sum = 0, count = 0;
    for (let i = 0; i + 2 < seq.length; i += 3) {
        const codon = seq.substring(i, i + 3);
        const aa = CODON_TABLE[codon];
        if (!aa || aa === '*') continue;
        const synonyms = aaGroups[aa];
        const maxFreq = Math.max(...synonyms.map(c => usageTable[c] || 0));
        const thisFreq = usageTable[codon] || 0.1;
        if (maxFreq > 0) {
            sum += Math.log(thisFreq / maxFreq);
            count++;
        }
    }
    return count > 0 ? Math.exp(sum / count) : 0;
}

function formatOptimizedSeq(original, optimized) {
    let html = '';
    const lineLen = 60;
    const maxLen = Math.max(original.length, optimized.length);
    for (let i = 0; i < maxLen; i += 3) {
        if (i > 0 && i % lineLen === 0) html += '\n';
        const orig = original.substring(i, i + 3);
        const opt = optimized.substring(i, i + 3);
        if (orig !== opt) {
            html += `<span style="color:var(--accent-red);font-weight:600;">${opt}</span>`;
        } else {
            html += colorCodeDNA(opt);
        }
        html += ' ';
    }
    return html;
}

function colorCodeDNA(seq) {
    return seq.split('').map(c => `<span class="${getNucleotideClass(c)}">${c}</span>`).join('');
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
