// ============================================
// BioGenesis — Plasmid Map Component
// ============================================

export function renderPlasmidMap(seq) {
    const seqStr = seq.sequence;
    const len = seqStr.length;
    const features = seq.features || [];

    const featureColors = {
        'gene': '#3fb950', 'CDS': '#58a6ff', 'promoter': '#f85149',
        'misc_feature': '#e3b341', 'rep_origin': '#8b5cf6', 'terminator': '#f778ba'
    };

    // SVG parameters
    const size = 500;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 180;
    const featureRadius = radius + 25;
    const labelRadius = radius + 55;

    // Draw backbone circle
    let svg = `<svg class="plasmid-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <defs>
      <linearGradient id="plasmid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#30363d"/>
        <stop offset="100%" stop-color="#21262d"/>
      </linearGradient>
    </defs>`;

    // Backbone circle
    svg += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#6e7681" stroke-width="3" opacity="0.6"/>`;

    // Center text
    svg += `<text x="${cx}" y="${cy - 16}" text-anchor="middle" fill="var(--text-primary)" font-size="16" font-weight="700" font-family="var(--font-sans)">${escapeHtml(seq.name)}</text>`;
    svg += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-family="var(--font-sans)">${len.toLocaleString()} bp</text>`;
    if (seq.circular) {
        svg += `<text x="${cx}" y="${cy + 20}" text-anchor="middle" fill="var(--text-muted)" font-size="10" font-family="var(--font-sans)">Circular</text>`;
    }

    // Tick marks every 500 bp
    const tickInterval = len > 5000 ? 1000 : len > 2000 ? 500 : len > 500 ? 100 : 50;
    for (let i = 0; i < len; i += tickInterval) {
        const angle = (i / len) * 2 * Math.PI - Math.PI / 2;
        const x1 = cx + Math.cos(angle) * (radius - 5);
        const y1 = cy + Math.sin(angle) * (radius - 5);
        const x2 = cx + Math.cos(angle) * (radius + 5);
        const y2 = cy + Math.sin(angle) * (radius + 5);
        svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6e7681" stroke-width="1"/>`;

        // Label every other tick
        if (i % (tickInterval * 2) === 0 || i === 0) {
            const lx = cx + Math.cos(angle) * (radius - 18);
            const ly = cy + Math.sin(angle) * (radius - 18);
            svg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="var(--text-muted)" font-size="8" font-family="var(--font-mono)">${i > 0 ? i : '1'}</text>`;
        }
    }

    // Draw features as arcs
    features.forEach((feat, idx) => {
        const color = featureColors[feat.type] || '#6e7681';
        const startAngle = (feat.start / len) * 360 - 90;
        const endAngle = (feat.end / len) * 360 - 90;
        const label = feat.qualifiers?.gene || feat.qualifiers?.product || feat.type;

        // Draw arc
        const startRad = startAngle * Math.PI / 180;
        const endRad = endAngle * Math.PI / 180;

        const x1 = cx + Math.cos(startRad) * featureRadius;
        const y1 = cy + Math.sin(startRad) * featureRadius;
        const x2 = cx + Math.cos(endRad) * featureRadius;
        const y2 = cy + Math.sin(endRad) * featureRadius;

        const largeArc = (endAngle - startAngle) > 180 ? 1 : 0;

        svg += `<path d="M${x1},${y1} A${featureRadius},${featureRadius} 0 ${largeArc} 1 ${x2},${y2}" 
      fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" opacity="0.8">
      <title>${escapeHtml(label)}: ${feat.start + 1}..${feat.end} (${feat.type})</title>
    </path>`;

        // Arrow direction
        if (!feat.complement) {
            const arrowAngle = endRad - 0.02;
            const ax = cx + Math.cos(arrowAngle) * featureRadius;
            const ay = cy + Math.sin(arrowAngle) * featureRadius;
            const ax2 = cx + Math.cos(endRad) * (featureRadius + 6);
            const ay2 = cy + Math.sin(endRad) * (featureRadius + 6);
            svg += `<polygon points="${x2},${y2} ${ax},${ay} ${ax2},${ay2}" fill="${color}" opacity="0.8"/>`;
        }

        // Label
        const midAngle = ((startAngle + endAngle) / 2) * Math.PI / 180;
        const lx = cx + Math.cos(midAngle) * labelRadius;
        const ly = cy + Math.sin(midAngle) * labelRadius;
        const textAnchor = Math.cos(midAngle) > 0 ? 'start' : 'end';

        svg += `<text x="${lx}" y="${ly}" text-anchor="${textAnchor}" dominant-baseline="middle" 
      fill="${color}" font-size="10" font-weight="600" font-family="var(--font-sans)">${escapeHtml(label)}</text>`;
    });

    svg += '</svg>';

    // Feature legend
    let legendHtml = '';
    if (features.length > 0) {
        legendHtml = `<div class="plasmid-feature-list">
      ${features.map(feat => {
            const color = featureColors[feat.type] || '#6e7681';
            const label = feat.qualifiers?.gene || feat.qualifiers?.product || feat.type;
            return `<div class="plasmid-feature-item">
          <span class="feature-color-dot" style="background:${color};"></span>
          <span style="font-weight:500;">${escapeHtml(label)}</span>
          <span style="color:var(--text-muted);font-size:11px;">${feat.type} (${feat.start + 1}..${feat.end})</span>
        </div>`;
        }).join('')}
    </div>`;
    }

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Plasmid Map</h2>
        <p>${escapeHtml(seq.name)} — ${len.toLocaleString()} bp ${seq.circular ? '(Circular)' : '(Linear)'}</p>
      </div>
      <div class="panel-body">
        <div class="plasmid-container">${svg}</div>
        ${legendHtml}
      </div>
    </div>
  `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
