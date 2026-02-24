// ============================================
// BioGenesis — Phylogenetic Tree Utilities
// ============================================

import { needlemanWunsch } from './alignment.js';

// Calculate distance matrix from sequences
export function calculateDistanceMatrix(sequences, names) {
    const n = sequences.length;
    const matrix = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const aln = needlemanWunsch(sequences[i], sequences[j]);
            const distance = 1 - (aln.identity / 100);
            matrix[i][j] = distance;
            matrix[j][i] = distance;
        }
    }

    return { matrix, names: names || sequences.map((_, i) => `Seq${i + 1}`) };
}

// Neighbor-Joining algorithm
export function neighborJoining(distMatrix, names) {
    const n = names.length;
    if (n < 2) return { name: names[0] || 'root', length: 0 };
    if (n === 2) {
        return {
            name: '',
            children: [
                { name: names[0], length: distMatrix[0][1] / 2 },
                { name: names[1], length: distMatrix[0][1] / 2 }
            ]
        };
    }

    // Working copies
    let d = distMatrix.map(row => [...row]);
    let nodeNames = [...names];
    let nodes = names.map(name => ({ name, length: 0 }));

    while (nodes.length > 2) {
        const size = nodes.length;

        // Calculate r values
        const r = new Array(size).fill(0);
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                r[i] += d[i][j];
            }
        }

        // Find minimum Q value
        let minQ = Infinity, minI = 0, minJ = 1;
        for (let i = 0; i < size; i++) {
            for (let j = i + 1; j < size; j++) {
                const q = (size - 2) * d[i][j] - r[i] - r[j];
                if (q < minQ) {
                    minQ = q;
                    minI = i;
                    minJ = j;
                }
            }
        }

        // Calculate branch lengths
        const branchI = d[minI][minJ] / 2 + (r[minI] - r[minJ]) / (2 * (size - 2));
        const branchJ = d[minI][minJ] - branchI;

        // Create new node
        const newNode = {
            name: '',
            children: [
                { ...nodes[minI], length: Math.max(0, branchI) },
                { ...nodes[minJ], length: Math.max(0, branchJ) }
            ]
        };

        // Calculate new distances
        const newDist = [];
        const keep = [];
        for (let k = 0; k < size; k++) {
            if (k !== minI && k !== minJ) {
                keep.push(k);
                newDist.push((d[k][minI] + d[k][minJ] - d[minI][minJ]) / 2);
            }
        }

        // Build new distance matrix
        const newSize = keep.length + 1;
        const newD = Array.from({ length: newSize }, () => new Array(newSize).fill(0));

        for (let i = 0; i < keep.length; i++) {
            for (let j = i + 1; j < keep.length; j++) {
                newD[i][j] = d[keep[i]][keep[j]];
                newD[j][i] = d[keep[i]][keep[j]];
            }
            newD[i][keep.length] = newDist[i];
            newD[keep.length][i] = newDist[i];
        }

        // Update arrays
        const newNodes = keep.map(k => nodes[k]);
        newNodes.push(newNode);

        d = newD;
        nodes = newNodes;
    }

    // Final join
    return {
        name: '',
        children: [
            { ...nodes[0], length: d[0][1] / 2 },
            { ...nodes[1], length: d[0][1] / 2 }
        ]
    };
}

// Parse Newick format
export function parseNewick(str) {
    let i = 0;

    function parseNode() {
        const node = { name: '', children: [], length: 0 };

        if (str[i] === '(') {
            i++; // skip (
            node.children.push(parseNode());
            while (str[i] === ',') {
                i++;
                node.children.push(parseNode());
            }
            i++; // skip )
        }

        // Parse name
        let name = '';
        while (i < str.length && str[i] !== ':' && str[i] !== ',' && str[i] !== ')' && str[i] !== ';') {
            name += str[i];
            i++;
        }
        node.name = name.trim();

        // Parse length
        if (str[i] === ':') {
            i++;
            let len = '';
            while (i < str.length && str[i] !== ',' && str[i] !== ')' && str[i] !== ';') {
                len += str[i];
                i++;
            }
            node.length = parseFloat(len) || 0;
        }

        return node;
    }

    const tree = parseNode();
    return tree;
}

// Convert tree to Newick format
export function toNewick(node) {
    if (!node.children || node.children.length === 0) {
        return node.name + (node.length ? ':' + node.length.toFixed(4) : '');
    }
    const children = node.children.map(c => toNewick(c)).join(',');
    return '(' + children + ')' + node.name + (node.length ? ':' + node.length.toFixed(4) : '');
}

// Render phylogenetic tree as SVG
export function renderTreeSVG(tree, width = 700, height = 400) {
    const leaves = getLeafNodes(tree);
    const numLeaves = leaves.length;
    if (numLeaves === 0) return '<svg></svg>';

    const margin = { top: 30, right: 150, bottom: 30, left: 30 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const maxDepth = getMaxDepth(tree);
    const xScale = maxDepth > 0 ? plotWidth / maxDepth : plotWidth;
    const yStep = plotHeight / Math.max(numLeaves - 1, 1);

    let leafIndex = 0;
    const paths = [];
    const labels = [];
    const dots = [];

    function layout(node, x = 0) {
        if (!node.children || node.children.length === 0) {
            const y = margin.top + leafIndex * yStep;
            leafIndex++;
            node._x = margin.left + x * xScale;
            node._y = y;

            labels.push(`<text class="phylo-label" x="${node._x + 8}" y="${node._y + 4}">${escapeHtml(node.name)}</text>`);
            dots.push(`<circle class="phylo-node-dot" cx="${node._x}" cy="${node._y}" r="3"/>`);
            return y;
        }

        const childYs = node.children.map(child => layout(child, x + (child.length || 0.1)));
        const midY = (Math.min(...childYs) + Math.max(...childYs)) / 2;

        node._x = margin.left + x * xScale;
        node._y = midY;

        // Horizontal lines to children
        for (const child of node.children) {
            paths.push(`<path class="phylo-branch" d="M${node._x},${node._y} H${child._x} V${child._y}"/>`);
        }

        dots.push(`<circle class="phylo-node-dot" cx="${node._x}" cy="${node._y}" r="2.5"/>`);
        return midY;
    }

    layout(tree);

    // Scale bar
    const scaleLen = maxDepth > 0 ? maxDepth * 0.2 : 0.1;
    const scaleX = margin.left;
    const scaleY = height - 10;
    const scalePx = scaleLen * xScale;
    const scaleBar = `
    <line x1="${scaleX}" y1="${scaleY}" x2="${scaleX + scalePx}" y2="${scaleY}" stroke="var(--text-muted)" stroke-width="1.5"/>
    <text x="${scaleX + scalePx / 2}" y="${scaleY - 5}" text-anchor="middle" font-size="10" fill="var(--text-muted)">${scaleLen.toFixed(2)}</text>
  `;

    return `<svg class="phylo-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${paths.join('\n')}
    ${dots.join('\n')}
    ${labels.join('\n')}
    ${scaleBar}
  </svg>`;
}

function getLeafNodes(node) {
    if (!node.children || node.children.length === 0) return [node];
    return node.children.flatMap(getLeafNodes);
}

function getMaxDepth(node, depth = 0) {
    if (!node.children || node.children.length === 0) return depth;
    return Math.max(...node.children.map(c => getMaxDepth(c, depth + (c.length || 0.1))));
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
