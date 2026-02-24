// ============================================
// BioGenesis — Restriction Analysis Component
// ============================================

import { findRestrictionSites, simulateDigest, renderGelSVG } from '../utils/restriction.js';

export function renderRestrictionAnalysis(seq) {
    if (seq.type === 'protein') {
        return `
      <div class="panel active">
        <div class="panel-header"><h2>Restriction Analysis</h2><p>Requires a DNA sequence</p></div>
        <div class="panel-body"><div class="empty-state"><span class="empty-state-icon"></span><p class="empty-state-text">Please select a DNA sequence</p></div></div>
      </div>`;
    }

    const results = findRestrictionSites(seq.sequence);
    const totalCuts = results.reduce((sum, r) => sum + r.numCuts, 0);

    // Enzyme list
    let enzymeListHtml = results.map(r => `
    <div class="enzyme-item" data-enzyme="${r.name}">
      <span class="enzyme-name">${r.name}</span>
      <span class="enzyme-site" style="letter-spacing:1px;">${r.site}</span>
      <span class="enzyme-cuts">${r.numCuts} cut${r.numCuts > 1 ? 's' : ''}</span>
    </div>
  `).join('');

    // Non-cutters
    const nonCutters = 30 - results.length;

    // Cut map visualization
    let cutMapHtml = '';
    if (results.length > 0) {
        const allCuts = results.flatMap(r => r.positions.map(p => ({ pos: p, enzyme: r.name, site: r.site })));
        allCuts.sort((a, b) => a.pos - b.pos);

        cutMapHtml = `
      <div style="margin-bottom:16px;">
        <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Restriction Map</h3>
        <div style="position:relative;height:60px;background:var(--bg-tertiary);border-radius:var(--radius-md);padding:16px;border:1px solid var(--border-muted);">
          <!-- Sequence line -->
          <div style="position:absolute;top:30px;left:20px;right:20px;height:2px;background:var(--text-muted);"></div>
          ${allCuts.slice(0, 50).map(cut => {
            const pct = (cut.pos / seq.sequence.length * 100).toFixed(2);
            return `<div style="position:absolute;top:18px;left:calc(20px + ${pct}% * (100% - 40px) / 100);width:1px;height:24px;background:var(--accent-red);" title="${cut.enzyme} cuts at ${cut.pos + 1}">
              <div style="position:absolute;top:-14px;left:-10px;font-size:8px;color:var(--accent-red);white-space:nowrap;transform:rotate(-45deg);transform-origin:bottom left;">${cut.enzyme}</div>
            </div>`;
        }).join('')}
        </div>
      </div>
    `;
    }

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>Restriction Analysis</h2>
        <p>${escapeHtml(seq.name)} — ${seq.sequence.length.toLocaleString()} bp | ${results.length} enzymes found ${totalCuts} cut sites</p>
      </div>
      <div class="panel-body">
        <div class="stats-grid" style="margin-bottom:16px;">
          <div class="stat-card">
            <div class="stat-title">Cutting Enzymes</div>
            <div class="stat-value">${results.length}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Total Cut Sites</div>
            <div class="stat-value">${totalCuts}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Non-cutters</div>
            <div class="stat-value">${nonCutters}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">Unique Cutters</div>
            <div class="stat-value">${results.filter(r => r.numCuts === 1).length}</div>
          </div>
        </div>
        
        ${cutMapHtml}
        
        <div class="gel-container">
          <div style="flex:1;">
            <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Enzyme List (click to select for digest)</h3>
            <div class="enzyme-list">${enzymeListHtml || '<p style="color:var(--text-muted);font-size:12px;">No restriction sites found</p>'}</div>
          </div>
          <div>
            <h3 style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text-secondary);">Virtual Gel</h3>
            <div id="digest-result">${renderDigestResult(seq, [])}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderDigestResult(seq, selectedEnzymeNames) {
    if (selectedEnzymeNames.length === 0) {
        return `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px;">
      <p>Select enzymes to simulate digest</p>
      ${renderGelSVG([{ size: seq.sequence.length, start: 0, end: seq.sequence.length }], seq.sequence.length)}
    </div>`;
    }

    const allResults = findRestrictionSites(seq.sequence);
    const selectedEnzymes = allResults.filter(r => selectedEnzymeNames.includes(r.name));
    const fragments = simulateDigest(seq.sequence, selectedEnzymes);

    let html = renderGelSVG(fragments, seq.sequence.length);

    html += `<div style="margin-top:12px;font-size:11px;">
    <strong style="color:var(--text-primary);">${fragments.length} fragments:</strong><br>
    ${fragments.map(f => `<span style="color:var(--text-secondary);">${f.size} bp</span>`).join(', ')}
  </div>`;

    return html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
