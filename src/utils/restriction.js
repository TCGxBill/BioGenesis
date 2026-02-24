// ============================================
// BioGenesis — Restriction Enzyme Database
// ============================================

// Common restriction enzymes with recognition sites and cut positions
export const RESTRICTION_ENZYMES = [
    { name: 'EcoRI', site: 'GAATTC', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'BamHI', site: 'GGATCC', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'HindIII', site: 'AAGCTT', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'XhoI', site: 'CTCGAG', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'NdeI', site: 'CATATG', cut: 2, cutComplement: 4, overhang: '5prime' },
    { name: 'XbaI', site: 'TCTAGA', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'SalI', site: 'GTCGAC', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'PstI', site: 'CTGCAG', cut: 5, cutComplement: 1, overhang: '3prime' },
    { name: 'SphI', site: 'GCATGC', cut: 5, cutComplement: 1, overhang: '3prime' },
    { name: 'KpnI', site: 'GGTACC', cut: 5, cutComplement: 1, overhang: '3prime' },
    { name: 'NotI', site: 'GCGGCCGC', cut: 2, cutComplement: 6, overhang: '5prime' },
    { name: 'SmaI', site: 'CCCGGG', cut: 3, cutComplement: 3, overhang: 'blunt' },
    { name: 'EcoRV', site: 'GATATC', cut: 3, cutComplement: 3, overhang: 'blunt' },
    { name: 'StuI', site: 'AGGCCT', cut: 3, cutComplement: 3, overhang: 'blunt' },
    { name: 'NcoI', site: 'CCATGG', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'BglII', site: 'AGATCT', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'ClaI', site: 'ATCGAT', cut: 2, cutComplement: 4, overhang: '5prime' },
    { name: 'ApaI', site: 'GGGCCC', cut: 5, cutComplement: 1, overhang: '3prime' },
    { name: 'SacI', site: 'GAGCTC', cut: 5, cutComplement: 1, overhang: '3prime' },
    { name: 'SacII', site: 'CCGCGG', cut: 4, cutComplement: 2, overhang: '3prime' },
    { name: 'NheI', site: 'GCTAGC', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'MluI', site: 'ACGCGT', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'AvrII', site: 'CCTAGG', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'ScaI', site: 'AGTACT', cut: 3, cutComplement: 3, overhang: 'blunt' },
    { name: 'BsaI', site: 'GGTCTC', cut: 7, cutComplement: 11, overhang: '5prime' },
    { name: 'AgeI', site: 'ACCGGT', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'AflII', site: 'CTTAAG', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'SpeI', site: 'ACTAGT', cut: 1, cutComplement: 5, overhang: '5prime' },
    { name: 'PvuI', site: 'CGATCG', cut: 4, cutComplement: 2, overhang: '3prime' },
    { name: 'PvuII', site: 'CAGCTG', cut: 3, cutComplement: 3, overhang: 'blunt' },
];

// Find restriction sites in a sequence
export function findRestrictionSites(sequence, enzymes = RESTRICTION_ENZYMES) {
    const upper = sequence.toUpperCase();
    const results = [];

    for (const enzyme of enzymes) {
        const sites = [];
        const site = enzyme.site.toUpperCase();
        let pos = upper.indexOf(site);
        while (pos !== -1) {
            sites.push(pos);
            pos = upper.indexOf(site, pos + 1);
        }
        if (sites.length > 0) {
            results.push({
                ...enzyme,
                positions: sites,
                numCuts: sites.length
            });
        }
    }

    return results.sort((a, b) => a.name.localeCompare(b.name));
}

// Simulate restriction digest — returns fragment sizes
export function simulateDigest(sequence, enzymes) {
    const seqLen = sequence.length;
    const cutPositions = new Set([0, seqLen]);

    for (const enzyme of enzymes) {
        if (enzyme.positions) {
            for (const pos of enzyme.positions) {
                cutPositions.add(pos + enzyme.cut);
            }
        }
    }

    const sorted = [...cutPositions].sort((a, b) => a - b);
    const fragments = [];

    for (let i = 0; i < sorted.length - 1; i++) {
        const size = sorted[i + 1] - sorted[i];
        if (size > 0) {
            fragments.push({
                start: sorted[i],
                end: sorted[i + 1],
                size,
                sequence: sequence.substring(sorted[i], sorted[i + 1])
            });
        }
    }

    return fragments.sort((a, b) => b.size - a.size);
}

// Render virtual gel electrophoresis
export function renderGelSVG(fragments, seqLength, width = 160, height = 400) {
    const margin = { top: 40, bottom: 20 };
    const plotHeight = height - margin.top - margin.bottom;

    // Log scale for migration distance
    const maxSize = seqLength;
    const minSize = Math.min(...fragments.map(f => f.size), 100);

    const bands = fragments.map(f => {
        const logPos = (Math.log(maxSize) - Math.log(f.size)) / (Math.log(maxSize) - Math.log(Math.max(minSize, 10)));
        const y = margin.top + Math.min(logPos, 1) * plotHeight;
        return { ...f, y };
    });

    // Marker sizes
    const markers = [10000, 8000, 6000, 5000, 4000, 3000, 2000, 1500, 1000, 750, 500, 250, 100]
        .filter(s => s <= maxSize * 1.5);

    const markerBands = markers.map(size => {
        const logPos = (Math.log(maxSize) - Math.log(size)) / (Math.log(maxSize) - Math.log(Math.max(minSize, 10)));
        const y = margin.top + Math.min(Math.max(logPos, 0), 1) * plotHeight;
        return { size, y };
    });

    let svg = `<svg width="${width}" height="${height}" style="background: #0a0a0a; border-radius: 8px;">`;

    // Labels
    svg += `<text x="${width / 4}" y="20" text-anchor="middle" fill="#666" font-size="10">Marker</text>`;
    svg += `<text x="${width * 3 / 4}" y="20" text-anchor="middle" fill="#666" font-size="10">Digest</text>`;

    // Well
    svg += `<rect x="${width / 4 - 15}" y="28" width="30" height="6" fill="#333" rx="1"/>`;
    svg += `<rect x="${width * 3 / 4 - 15}" y="28" width="30" height="6" fill="#333" rx="1"/>`;

    // Marker bands
    for (const m of markerBands) {
        svg += `<rect x="${width / 4 - 12}" y="${m.y}" width="24" height="3" fill="rgba(0,200,255,0.4)" rx="1"/>`;
        svg += `<text x="4" y="${m.y + 3}" fill="#555" font-size="8" font-family="monospace">${m.size >= 1000 ? (m.size / 1000) + 'k' : m.size}</text>`;
    }

    // Sample bands
    for (const b of bands) {
        const intensity = Math.min(1, b.size / maxSize + 0.3);
        svg += `<rect x="${width * 3 / 4 - 15}" y="${b.y}" width="30" height="4" fill="rgba(0,255,100,${intensity})" rx="1">
      <title>${b.size} bp</title>
    </rect>`;
        svg += `<text x="${width - 4}" y="${b.y + 3}" fill="#555" font-size="8" font-family="monospace" text-anchor="end">${b.size}</text>`;
    }

    svg += '</svg>';
    return svg;
}
