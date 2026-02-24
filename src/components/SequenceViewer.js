// ============================================
// BioGenesis — Sequence Viewer Component
// Optimized: chunked rendering, line-level coloring
// ============================================

import { getNucleotideClass, getAminoAcidClass, gcContent, complement, reverseComplement, translate, nucleotideComposition } from '../utils/bioUtils.js';

// How many characters to render per chunk
const INITIAL_LINES = 80;     // ~80 lines * 60 chars = 4800 chars
const LINES_PER_CHUNK = 40;   // ~2400 chars per additional chunk
const LINE_WIDTH = 60;

export function renderSequenceViewer(seq) {
    const seqStr = seq.sequence;
    const type = seq.type;
    const len = seqStr.length;
    const comp = type !== 'protein' ? nucleotideComposition(seqStr) : null;
    const gc = type !== 'protein' ? gcContent(seqStr).toFixed(1) : null;

    // Build info bar
    let infoBar = `<div class="seq-info-bar">
    <div class="seq-info-item"><span class="label">Name:</span><span class="value">${escapeHtml(seq.name)}</span></div>
    <div class="seq-info-item"><span class="label">Length:</span><span class="value">${len.toLocaleString()} ${type === 'protein' ? 'aa' : 'bp'}</span></div>
    <div class="seq-info-item"><span class="label">Type:</span><span class="value">${type.toUpperCase()}</span></div>`;

    if (gc !== null) {
        infoBar += `<div class="seq-info-item"><span class="label">GC%:</span><span class="value">${gc}%</span></div>`;
    }
    if (seq.circular || seq.topology === 'circular') {
        infoBar += `<div class="seq-info-item"><span class="label">Topology:</span><span class="value">Circular</span></div>`;
    }
    infoBar += '</div>';

    // Build only the first chunk of sequence (lazy rendering)
    const totalLines = Math.ceil(len / LINE_WIDTH);
    const initialLineCount = Math.min(INITIAL_LINES, totalLines);
    const seqDisplay = buildSequenceChunk(seqStr, type, 0, initialLineCount);
    const hasMore = initialLineCount < totalLines;

    // Annotations if present
    let annotationsHtml = '';
    if (seq.features && seq.features.length > 0) {
        annotationsHtml = buildAnnotations(seq.features, len);
    }

    // Composition bar for nucleotides
    let compositionHtml = '';
    if (comp) {
        compositionHtml = buildCompositionBar(comp);
    }

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Sequence Viewer</h2>
        <p>${escapeHtml(seq.description || seq.name)}</p>
      </div>
      <div class="panel-body">
        ${infoBar}
        ${compositionHtml}
        ${annotationsHtml}
        <div class="sequence-display" id="seq-display"
             data-type="${type}" data-total-lines="${totalLines}" data-loaded-lines="${initialLineCount}">${seqDisplay}</div>
        ${hasMore ? `<div id="seq-load-more" style="text-align:center;padding:12px;">
          <button class="btn" id="seq-load-more-btn" style="padding:6px 20px;font-size:12px;">
            Load more (${(totalLines - initialLineCount).toLocaleString()} lines remaining)
          </button>
          <span style="margin-left:12px;color:var(--text-muted);font-size:11px;">
            Showing ${(initialLineCount * LINE_WIDTH).toLocaleString()} / ${len.toLocaleString()} ${type === 'protein' ? 'aa' : 'bp'}
          </span>
        </div>` : ''}
      </div>
    </div>
  `;
}

/**
 * Build sequence HTML for a range of lines.
 * Uses line-level grouping: one <span> per 10-char block instead of per-character.
 */
function buildSequenceChunk(seqStr, type, startLine, lineCount) {
    const len = seqStr.length;
    let html = '';

    for (let line = startLine; line < startLine + lineCount; line++) {
        const i = line * LINE_WIDTH;
        if (i >= len) break;
        const lineEnd = Math.min(i + LINE_WIDTH, len);

        html += `<span class="line-number">${i + 1}</span>`;

        // Group characters by class — emit one <span> per contiguous class group
        let currentClass = '';
        let buffer = '';

        for (let j = i; j < lineEnd; j++) {
            const char = seqStr[j];
            const cls = type === 'protein' ? getAminoAcidClass(char) : getNucleotideClass(char);

            // Space every 10 characters
            const needsSpace = (j - i + 1) % 10 === 0 && j < lineEnd - 1;

            if (cls !== currentClass) {
                if (buffer) html += `<span class="${currentClass}">${buffer}</span>`;
                currentClass = cls;
                buffer = char;
            } else {
                buffer += char;
            }

            if (needsSpace) {
                if (buffer) html += `<span class="${currentClass}">${buffer}</span>`;
                html += ' ';
                buffer = '';
                currentClass = '';
            }
        }
        if (buffer) html += `<span class="${currentClass}">${buffer}</span>`;
        html += '\n';
    }
    return html;
}

/**
 * Bind "load more" button — appends next chunk without re-rendering existing DOM
 */
export function bindSequenceViewerEvents(seq) {
    const loadMoreBtn = document.getElementById('seq-load-more-btn');
    if (!loadMoreBtn || !seq) return;

    loadMoreBtn.addEventListener('click', () => {
        const display = document.getElementById('seq-display');
        const loadMoreContainer = document.getElementById('seq-load-more');
        if (!display) return;

        const loadedLines = parseInt(display.dataset.loadedLines || '0');
        const totalLines = parseInt(display.dataset.totalLines || '0');
        const newChunkLines = Math.min(LINES_PER_CHUNK, totalLines - loadedLines);

        if (newChunkLines <= 0) {
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            return;
        }

        // Append chunk HTML
        const chunkHtml = buildSequenceChunk(seq.sequence, seq.type, loadedLines, newChunkLines);
        display.insertAdjacentHTML('beforeend', chunkHtml);

        const newLoaded = loadedLines + newChunkLines;
        display.dataset.loadedLines = newLoaded.toString();

        // Update or hide button
        const remaining = totalLines - newLoaded;
        if (remaining <= 0) {
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        } else {
            loadMoreBtn.textContent = `Load more (${remaining.toLocaleString()} lines remaining)`;
            const info = loadMoreContainer?.querySelector('span');
            if (info) {
                info.textContent = `Showing ${(newLoaded * LINE_WIDTH).toLocaleString()} / ${seq.sequence.length.toLocaleString()} ${seq.type === 'protein' ? 'aa' : 'bp'}`;
            }
        }
    });
}

function buildAnnotations(features, len) {
    const featureColors = {
        'gene': '#3fb950', 'CDS': '#58a6ff', 'promoter': '#f85149',
        'misc_feature': '#e3b341', 'rep_origin': '#8b5cf6', 'terminator': '#f778ba'
    };

    // Only render first 50 features max
    const visibleFeatures = features.slice(0, 50);

    let tracks = '';
    for (const feat of visibleFeatures) {
        const color = feat.color || featureColors[feat.type] || '#6e7681';
        const leftPct = (feat.start / len * 100).toFixed(2);
        const widthPct = (Math.max(feat.end - feat.start, 1) / len * 100).toFixed(2);
        const label = feat.name || feat.qualifiers?.gene || feat.qualifiers?.product || feat.type;

        tracks += `<div class="annotation-track">
        <div class="annotation-block" style="left:${leftPct}%;width:${widthPct}%;background:${color};" title="${escapeHtml(label)}: ${feat.start + 1}..${feat.end} (${feat.type})">
          ${escapeHtml(label)}
        </div>
      </div>`;
    }

    const moreNote = features.length > 50 ? `<p style="color:var(--text-muted);font-size:11px;">Showing 50 of ${features.length} annotations</p>` : '';

    return `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Annotations (${features.length})</h3>
        ${tracks}
        ${moreNote}
      </div>
    `;
}

function buildCompositionBar(comp) {
    const total = comp.A + comp.T + comp.C + comp.G + (comp.U || 0);
    if (total <= 0) return '';

    const segments = [
        { label: 'A', count: comp.A, color: 'var(--nt-a)' },
        { label: 'T', count: comp.T, color: 'var(--nt-t)' },
        { label: 'C', count: comp.C, color: 'var(--nt-c)' },
        { label: 'G', count: comp.G, color: 'var(--nt-g)' },
    ];
    if (comp.U > 0) segments.push({ label: 'U', count: comp.U, color: 'var(--nt-u)' });

    return `
        <div style="margin-bottom:16px;">
          <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Composition</h3>
          <div class="composition-bar">
            ${segments.filter(s => s.count > 0).map(s =>
        `<div class="composition-segment" style="flex-grow:${s.count};background:${s.color};" title="${s.label}: ${s.count} (${(s.count / total * 100).toFixed(1)}%)">${s.label}</div>`
    ).join('')}
          </div>
          <div class="composition-legend">
            ${segments.filter(s => s.count > 0).map(s =>
        `<span class="legend-item"><span class="legend-dot" style="background:${s.color};"></span>${s.label}: ${s.count} (${(s.count / total * 100).toFixed(1)}%)</span>`
    ).join('')}
          </div>
        </div>
      `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
