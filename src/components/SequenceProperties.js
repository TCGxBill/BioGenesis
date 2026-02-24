// ============================================
// BioGenesis — GC Content & Sequence Properties Plot
// Sliding-window analysis with interactive canvas
// ============================================

export function renderSequenceProperties(seq) {
    if (!seq) return '<div class="empty-state"><p class="empty-state-text">Select a sequence to view properties</p></div>';

    const isProtein = seq.type === 'protein';
    const len = seq.sequence.length;

    // Pre-compute data for the initial render
    const windowSize = Math.min(50, Math.floor(len / 4) || 10);

    return `
    <div class="panel-section">
      <div class="panel-header">
        <h2>Sequence Properties</h2>
        <p>${seq.name} — Sliding window analysis (${len} ${isProtein ? 'aa' : 'bp'})</p>
      </div>
      <div class="panel-body" style="padding:16px;">

        <!-- Controls -->
        <div style="display:flex;gap:16px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;">
          <div>
            <label class="form-label" style="display:block;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Window Size</label>
            <input id="prop-window" type="number" value="${windowSize}" min="5" max="${Math.floor(len / 2)}" step="5"
              style="width:80px;padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;outline:none;" />
          </div>
          <div>
            <label class="form-label" style="display:block;margin-bottom:4px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">Plot</label>
            <select id="prop-type"
              style="padding:6px 10px;background:var(--bg-tertiary);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:12px;">
              ${isProtein ? `
                <option value="hydrophobicity">Hydrophobicity (Kyte-Doolittle)</option>
                <option value="charge">Net Charge</option>
                <option value="molecular_weight">Molecular Weight</option>
                <option value="flexibility">Flexibility (B-factor)</option>
              ` : `
                <option value="gc_content">GC Content</option>
                <option value="at_skew">AT Skew</option>
                <option value="gc_skew">GC Skew</option>
                <option value="complexity">Sequence Complexity</option>
                <option value="cpg">CpG Observed/Expected</option>
              `}
            </select>
          </div>
          <button id="prop-compute-btn" class="btn btn-primary" style="padding:8px 20px;">Analyze</button>
        </div>

        <!-- Plot canvas -->
        <div style="background:var(--bg-secondary);border:1px solid var(--border-default);border-radius:var(--radius-md);padding:16px;margin-bottom:16px;">
          <canvas id="prop-canvas" width="900" height="280" style="width:100%;height:280px;display:block;"></canvas>
        </div>

        <!-- Summary stats -->
        <div id="prop-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;"></div>

      </div>
    </div>
  `;
}

// ─── Hydrophobicity scales ───
const KYTE_DOOLITTLE = {
    A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, E: -3.5, Q: -3.5, G: -0.4, H: -3.2, I: 4.5,
    L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9, Y: -1.3, V: 4.2
};

const FLEXIBILITY = {
    A: 0.36, R: 0.53, N: 0.46, D: 0.51, C: 0.35, E: 0.50, Q: 0.49, G: 0.54, H: 0.32, I: 0.46,
    L: 0.40, K: 0.47, M: 0.30, F: 0.31, P: 0.51, S: 0.51, T: 0.44, W: 0.31, Y: 0.42, V: 0.39
};

const AA_MW = {
    A: 89.1, R: 174.2, N: 132.1, D: 133.1, C: 121.2, E: 147.1, Q: 146.2, G: 75.0, H: 155.2, I: 131.2,
    L: 131.2, K: 146.2, M: 149.2, F: 165.2, P: 115.1, S: 105.1, T: 119.1, W: 204.2, Y: 181.2, V: 117.1
};

const AA_CHARGE = {
    A: 0, R: 1, N: 0, D: -1, C: 0, E: -1, Q: 0, G: 0, H: 0.5, I: 0,
    L: 0, K: 1, M: 0, F: 0, P: 0, S: 0, T: 0, W: 0, Y: 0, V: 0
};

export function bindSequencePropertiesEvents(seq) {
    const btn = document.getElementById('prop-compute-btn');
    const render = () => {
        const windowSize = parseInt(document.getElementById('prop-window')?.value || '50');
        const plotType = document.getElementById('prop-type')?.value || 'gc_content';
        computeAndRenderPlot(seq, windowSize, plotType);
    };

    btn?.addEventListener('click', render);

    // Auto-render on load
    setTimeout(render, 100);
}

function computeAndRenderPlot(seq, windowSize, plotType) {
    const canvas = document.getElementById('prop-canvas');
    const statsEl = document.getElementById('prop-stats');
    if (!canvas || !statsEl) return;

    const ctx = canvas.getContext('2d');
    // Set actual pixel dimensions for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const W = rect.width;
    const H = rect.height;

    const s = seq.sequence.toUpperCase();
    const len = s.length;
    const isProtein = seq.type === 'protein';

    // Compute values
    const values = [];
    let label = '', unit = '', color1 = '#06b6d4', color2 = '#0891b2';
    let globalStat = {};

    switch (plotType) {
        case 'gc_content': {
            label = 'GC Content';
            unit = '%';
            color1 = '#06b6d4'; color2 = '#0e7490';
            let totalGC = 0;
            for (let i = 0; i <= len - windowSize; i++) {
                const w = s.substring(i, i + windowSize);
                const gc = (w.split('G').length - 1 + w.split('C').length - 1) / windowSize;
                values.push(gc * 100);
            }
            for (let c of s) if (c === 'G' || c === 'C') totalGC++;
            globalStat = { 'Overall GC': (totalGC / len * 100).toFixed(1) + '%', 'AT/GC Ratio': ((len - totalGC) / totalGC).toFixed(2), 'Length': len + ' bp' };
            break;
        }
        case 'at_skew': {
            label = 'AT Skew (A-T)/(A+T)';
            unit = '';
            color1 = '#4ade80'; color2 = '#ef4444';
            for (let i = 0; i <= len - windowSize; i++) {
                const w = s.substring(i, i + windowSize);
                const a = (w.split('A').length - 1), t = (w.split('T').length - 1);
                values.push(a + t > 0 ? (a - t) / (a + t) : 0);
            }
            break;
        }
        case 'gc_skew': {
            label = 'GC Skew (G-C)/(G+C)';
            unit = '';
            color1 = '#3b82f6'; color2 = '#f59e0b';
            for (let i = 0; i <= len - windowSize; i++) {
                const w = s.substring(i, i + windowSize);
                const g = (w.split('G').length - 1), c = (w.split('C').length - 1);
                values.push(g + c > 0 ? (g - c) / (g + c) : 0);
            }
            break;
        }
        case 'complexity': {
            label = 'Linguistic Complexity';
            unit = '';
            color1 = '#8b5cf6'; color2 = '#6d28d9';
            for (let i = 0; i <= len - windowSize; i++) {
                const w = s.substring(i, i + windowSize);
                const unique = new Set();
                for (let k = 1; k <= 3; k++) {
                    for (let j = 0; j <= w.length - k; j++) unique.add(w.substring(j, j + k));
                }
                values.push(unique.size / windowSize);
            }
            break;
        }
        case 'cpg': {
            label = 'CpG Observed/Expected';
            unit = '';
            color1 = '#ec4899'; color2 = '#be185d';
            for (let i = 0; i <= len - windowSize; i++) {
                const w = s.substring(i, i + windowSize);
                const cg_count = (w.match(/CG/g) || []).length;
                const c_count = (w.split('C').length - 1);
                const g_count = (w.split('G').length - 1);
                const expected = (c_count * g_count) / windowSize;
                values.push(expected > 0 ? cg_count / expected : 0);
            }
            let totalCpG = (s.match(/CG/g) || []).length;
            globalStat = { 'CpG sites': totalCpG.toString(), 'CpG density': (totalCpG / (len / 100)).toFixed(1) + '/100bp' };
            break;
        }
        case 'hydrophobicity': {
            label = 'Hydrophobicity (Kyte-Doolittle)';
            unit = '';
            color1 = '#f59e0b'; color2 = '#3b82f6';
            for (let i = 0; i <= len - windowSize; i++) {
                let sum = 0;
                for (let j = i; j < i + windowSize; j++) sum += (KYTE_DOOLITTLE[s[j]] || 0);
                values.push(sum / windowSize);
            }
            const avgH = values.reduce((a, b) => a + b, 0) / values.length;
            globalStat = { 'Avg Hydrophobicity': avgH.toFixed(2), 'GRAVY': avgH.toFixed(3), 'Length': len + ' aa' };
            break;
        }
        case 'charge': {
            label = 'Net Charge (pH 7)';
            unit = '';
            color1 = '#3b82f6'; color2 = '#ef4444';
            for (let i = 0; i <= len - windowSize; i++) {
                let sum = 0;
                for (let j = i; j < i + windowSize; j++) sum += (AA_CHARGE[s[j]] || 0);
                values.push(sum / windowSize);
            }
            let totalCharge = 0;
            for (let c of s) totalCharge += (AA_CHARGE[c] || 0);
            globalStat = { 'Net Charge': totalCharge.toFixed(1), 'pI (est.)': estimatePi(s) };
            break;
        }
        case 'molecular_weight': {
            label = 'Molecular Weight';
            unit = 'Da';
            color1 = '#4ade80'; color2 = '#16a34a';
            for (let i = 0; i <= len - windowSize; i++) {
                let sum = 0;
                for (let j = i; j < i + windowSize; j++) sum += (AA_MW[s[j]] || 110);
                values.push(sum / windowSize);
            }
            let totalMW = 0;
            for (let c of s) totalMW += (AA_MW[c] || 110);
            globalStat = { 'MW': (totalMW / 1000).toFixed(1) + ' kDa', 'Avg Residue MW': (totalMW / len).toFixed(1) + ' Da' };
            break;
        }
        case 'flexibility': {
            label = 'Flexibility (B-factor scale)';
            unit = '';
            color1 = '#a855f7'; color2 = '#7c3aed';
            for (let i = 0; i <= len - windowSize; i++) {
                let sum = 0;
                for (let j = i; j < i + windowSize; j++) sum += (FLEXIBILITY[s[j]] || 0.4);
                values.push(sum / windowSize);
            }
            break;
        }
    }

    if (values.length === 0) return;

    // Draw plot
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const padTop = 35, padBot = 40, padL = 55, padR = 20;
    const plotW = W - padL - padR;
    const plotH = H - padTop - padBot;

    ctx.clearRect(0, 0, W, H);

    // Background grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 0.5;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
        const y = padTop + (plotH / gridLines) * i;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        const val = maxVal - (range / gridLines) * i;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(val.toFixed(plotType === 'gc_content' ? 0 : 2), padL - 8, y + 4);
    }

    // Zero line for skew/charge
    if (minVal < 0 && maxVal > 0) {
        const zeroY = padTop + plotH * (maxVal / range);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(W - padR, zeroY); ctx.stroke();
        ctx.setLineDash([]);
    }

    // Data line with gradient fill
    const grad = ctx.createLinearGradient(0, padTop, 0, H - padBot);
    grad.addColorStop(0, color1 + '40');
    grad.addColorStop(1, color1 + '05');

    ctx.beginPath();
    ctx.moveTo(padL, padTop + plotH);
    for (let i = 0; i < values.length; i++) {
        const x = padL + (i / (values.length - 1)) * plotW;
        const y = padTop + plotH - ((values[i] - minVal) / range) * plotH;
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.lineTo(padL + plotW, padTop + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Data line
    ctx.beginPath();
    for (let i = 0; i < values.length; i++) {
        const x = padL + (i / (values.length - 1)) * plotW;
        const y = padTop + plotH - ((values[i] - minVal) / range) * plotH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = color1;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 13px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, padL, 18);

    // X-axis label
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Position (window=${document.getElementById('prop-window')?.value || windowSize})`, W / 2, H - 5);

    // X-axis ticks
    const xticks = 5;
    for (let i = 0; i <= xticks; i++) {
        const x = padL + (plotW / xticks) * i;
        const pos = Math.round((len / xticks) * i);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.textAlign = 'center';
        ctx.fillText(pos.toString(), x, H - padBot + 18);
    }

    // Stats
    if (Object.keys(globalStat).length === 0) {
        globalStat = {
            'Min': minVal.toFixed(2),
            'Max': maxVal.toFixed(2),
            'Mean': (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2),
        };
    }

    statsEl.innerHTML = Object.entries(globalStat).map(([k, v]) => `
    <div style="background:var(--bg-tertiary);padding:14px;border-radius:var(--radius-sm);border:1px solid var(--border-muted);">
      <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${k}</div>
      <div style="font-size:20px;font-weight:700;color:var(--accent-cyan);">${v}</div>
    </div>
  `).join('');
}

function estimatePi(seq) {
    let pos = 0, neg = 0;
    for (const c of seq) {
        if (c === 'K' || c === 'R') pos++;
        else if (c === 'D' || c === 'E') neg++;
        else if (c === 'H') pos += 0.5;
    }
    // Very rough pI estimation
    if (pos > neg) return '> 7.0 (basic)';
    if (neg > pos) return '< 7.0 (acidic)';
    return '~7.0 (neutral)';
}
