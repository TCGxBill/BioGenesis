// ============================================
// BioGenesis — Linear Map View Component
// ============================================

export function renderLinearMap(seq) {
    const len = seq.sequence.length;
    const annotations = seq.annotations || [];

    if (annotations.length === 0) {
        return `
      <div class="panel active">
        <div class="panel-header"><h2>Linear Map</h2><p>${escapeHtml(seq.name)} — ${len.toLocaleString()} ${seq.type === 'protein' ? 'aa' : 'bp'}</p></div>
        <div class="panel-body">
          ${buildLinearMapSVG(seq, [])}
          <div style="margin-top:12px;color:var(--text-muted);font-size:12px;">No annotations to display. Use the Sequence Editor to add features.</div>
        </div>
      </div>`;
    }

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Linear Map</h2>
        <p>${escapeHtml(seq.name)} — ${len.toLocaleString()} ${seq.type === 'protein' ? 'aa' : 'bp'} | ${annotations.length} feature${annotations.length !== 1 ? 's' : ''}</p>
      </div>
      <div class="panel-body">
        ${buildLinearMapSVG(seq, annotations)}
        ${buildFeatureTable(annotations, len)}
      </div>
    </div>
  `;
}

function buildLinearMapSVG(seq, annotations) {
    const len = seq.sequence.length;
    const width = 900;
    const margin = 40;
    const trackW = width - margin * 2;
    const backboneY = 60;
    const featureHeight = 16;
    const featureGap = 3;

    // Assign tracks to features (avoid overlaps)
    const tracks = assignTracks(annotations, len, trackW);
    const numTracks = Math.max(1, ...tracks.map(t => t.track + 1));
    const svgHeight = backboneY + numTracks * (featureHeight + featureGap) + 80;

    // Color palette for feature types
    const typeColors = {
        'gene': '#3fb950',
        'CDS': '#58a6ff',
        'promoter': '#f85149',
        'terminator': '#f85149',
        'rep_origin': '#8b5cf6',
        'misc_feature': '#e3b341',
        'regulatory': '#f778ba',
        'primer_bind': '#d29922',
        'exon': '#06b6d4'
    };

    // Ruler ticks
    let ruler = '';
    const numTicks = Math.min(20, Math.max(5, Math.ceil(len / 200)));
    for (let i = 0; i <= numTicks; i++) {
        const pos = Math.round(i / numTicks * len);
        const x = margin + (pos / len) * trackW;
        ruler += `<line x1="${x}" y1="${backboneY - 10}" x2="${x}" y2="${backboneY + 4}" stroke="var(--text-muted)" stroke-width="0.5" opacity="0.5"/>`;
        ruler += `<text x="${x}" y="${backboneY - 14}" text-anchor="middle" font-size="9" fill="var(--text-muted)" font-family="var(--font-mono)">${pos === 0 ? 1 : pos}</text>`;
    }

    // Backbone
    let backbone = `<line x1="${margin}" y1="${backboneY}" x2="${margin + trackW}" y2="${backboneY}" stroke="var(--text-muted)" stroke-width="2"/>`;
    if (seq.topology === 'circular') {
        backbone += `<circle cx="${margin}" cy="${backboneY}" r="3" fill="var(--text-muted)"/>`;
        backbone += `<circle cx="${margin + trackW}" cy="${backboneY}" r="3" fill="var(--text-muted)"/>`;
    } else {
        backbone += `<rect x="${margin - 2}" y="${backboneY - 3}" width="4" height="6" rx="1" fill="var(--text-muted)"/>`;
        backbone += `<rect x="${margin + trackW - 2}" y="${backboneY - 3}" width="4" height="6" rx="1" fill="var(--text-muted)"/>`;
    }

    // Features
    let features = '';
    for (const feat of tracks) {
        const x = margin + (feat.start / len) * trackW;
        const w = Math.max(4, ((feat.end - feat.start) / len) * trackW);
        const y = backboneY + 10 + feat.track * (featureHeight + featureGap);
        const color = typeColors[feat.type] || typeColors['misc_feature'];

        // Arrow shape for directionality
        if (feat.direction === 'forward' || !feat.direction) {
            const arrowW = Math.min(8, w * 0.3);
            features += `<path d="M${x} ${y} L${x + w - arrowW} ${y} L${x + w} ${y + featureHeight / 2} L${x + w - arrowW} ${y + featureHeight} L${x} ${y + featureHeight} Z" fill="${color}" opacity="0.7" class="linear-map-feature">
        <title>${escapeHtml(feat.name)} (${feat.type}) ${feat.start + 1}..${feat.end}</title>
      </path>`;
        } else {
            const arrowW = Math.min(8, w * 0.3);
            features += `<path d="M${x + arrowW} ${y} L${x + w} ${y} L${x + w} ${y + featureHeight} L${x + arrowW} ${y + featureHeight} L${x} ${y + featureHeight / 2} Z" fill="${color}" opacity="0.7" class="linear-map-feature">
        <title>${escapeHtml(feat.name)} (${feat.type}) ${feat.start + 1}..${feat.end}</title>
      </path>`;
        }

        // Label
        if (w > 30) {
            features += `<text x="${x + w / 2}" y="${y + featureHeight / 2 + 3.5}" text-anchor="middle" font-size="9" fill="var(--text-primary)" font-family="var(--font-sans)" pointer-events="none">${escapeHtml(feat.name.substring(0, Math.floor(w / 6)))}</text>`;
        }
    }

    // Sequence name label
    const nameLabel = `<text x="${width / 2}" y="${svgHeight - 8}" text-anchor="middle" font-size="11" fill="var(--text-secondary)" font-family="var(--font-sans)">${escapeHtml(seq.name)} — ${len.toLocaleString()} ${seq.type === 'protein' ? 'aa' : 'bp'}${seq.topology ? ' (' + seq.topology + ')' : ''}</text>`;

    return `
    <div class="linear-map-container">
      <svg width="${width}" height="${svgHeight}" class="linear-map-svg" viewBox="0 0 ${width} ${svgHeight}">
        ${ruler}
        ${backbone}
        ${features}
        ${nameLabel}
      </svg>
    </div>
  `;
}

function assignTracks(annotations, seqLen, trackW) {
    const features = annotations.map(a => ({
        name: a.name || a.label || 'feature',
        type: a.type || 'misc_feature',
        start: a.start || 0,
        end: a.end || 0,
        direction: a.direction || a.strand || 'forward',
        track: 0
    })).sort((a, b) => a.start - b.start);

    const trackEnds = [0];
    for (const feat of features) {
        let placed = false;
        for (let t = 0; t < trackEnds.length; t++) {
            if (feat.start >= trackEnds[t]) {
                feat.track = t;
                trackEnds[t] = feat.end;
                placed = true;
                break;
            }
        }
        if (!placed) {
            feat.track = trackEnds.length;
            trackEnds.push(feat.end);
        }
    }

    return features;
}

function buildFeatureTable(annotations, len) {
    if (annotations.length === 0) return '';

    let rows = annotations.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td style="font-weight:500;">${escapeHtml(a.name || a.label || 'unnamed')}</td>
      <td>${a.type || 'misc_feature'}</td>
      <td style="font-family:var(--font-mono);">${(a.start || 0) + 1}</td>
      <td style="font-family:var(--font-mono);">${a.end || 0}</td>
      <td>${((a.end || 0) - (a.start || 0)).toLocaleString()} ${len > 0 ? 'bp' : ''}</td>
      <td>${a.direction || a.strand || 'fwd'}</td>
    </tr>
  `).join('');

    return `
    <div style="margin-top:20px;">
      <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Feature Table</h3>
      <div style="overflow-x:auto;">
        <table class="blast-results-table">
          <thead><tr><th>#</th><th>Name</th><th>Type</th><th>Start</th><th>End</th><th>Length</th><th>Strand</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
