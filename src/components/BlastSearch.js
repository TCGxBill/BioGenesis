// ============================================
// BioGenesis — BLAST Search Component
// ============================================

export function renderBlastSearch(seq) {
    const queryDefault = seq ? seq.sequence.substring(0, 1000) : '';
    const isProtein = seq?.type === 'protein';

    return `
    <div class="panel active">
      <div class="panel-header">
        <h2>BLAST Search</h2>
        <p>Search the NCBI database using Basic Local Alignment Search Tool</p>
      </div>
      <div class="panel-controls" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div class="form-group" style="flex:1;min-width:120px;">
            <label class="form-label">Program</label>
            <select class="form-select" id="blast-program">
              <option value="blastn" ${!isProtein ? 'selected' : ''}>blastn (nucleotide)</option>
              <option value="blastp" ${isProtein ? 'selected' : ''}>blastp (protein)</option>
              <option value="blastx">blastx (translated nt)</option>
              <option value="tblastn">tblastn (protein vs nt)</option>
            </select>
          </div>
          <div class="form-group" style="flex:1;min-width:120px;">
            <label class="form-label">Database</label>
            <select class="form-select" id="blast-db">
              <option value="nt" ${!isProtein ? 'selected' : ''}>nt (Nucleotide)</option>
              <option value="nr" ${isProtein ? 'selected' : ''}>nr (Non-redundant protein)</option>
              <option value="refseq_rna">RefSeq RNA</option>
              <option value="swissprot">SwissProt</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Query Sequence</label>
          <textarea class="form-textarea" id="blast-query" rows="4" placeholder="Paste sequence here...">${queryDefault}</textarea>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="btn btn-primary" id="run-blast-btn">Run BLAST</button>
          <span style="font-size:11px;color:var(--text-muted);">Connects to NCBI BLAST API (requires internet)</span>
        </div>
      </div>
      <div class="panel-body" id="blast-result">
        <div class="empty-state">
          <span class="empty-state-icon"></span>
          <p class="empty-state-text">Enter a query sequence and click "Run BLAST" to search</p>
          <p style="font-size:11px;color:var(--text-muted);margin-top:8px;">Results typically take 30-60 seconds from NCBI</p>
        </div>
      </div>
    </div>
  `;
}

// Execute a BLAST search via NCBI API
export async function runBlast(query, program = 'blastn', database = 'nt') {
    // Step 1: Submit the search
    const putUrl = 'https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi';

    const params = new URLSearchParams({
        CMD: 'Put',
        PROGRAM: program,
        DATABASE: database,
        QUERY: query.substring(0, 2000), // limit query length
        FORMAT_TYPE: 'JSON2',
    });

    try {
        const putResponse = await fetch(putUrl, {
            method: 'POST',
            body: params,
        });

        const putText = await putResponse.text();

        // Extract RID
        const ridMatch = putText.match(/RID = (\S+)/);
        if (!ridMatch) {
            throw new Error('Failed to submit BLAST query. Could not get RID.');
        }

        const rid = ridMatch[1];

        // Step 2: Poll for results
        let attempts = 0;
        const maxAttempts = 30;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            const checkUrl = `${putUrl}?CMD=Get&FORMAT_OBJECT=SearchInfo&RID=${rid}`;
            const checkResponse = await fetch(checkUrl);
            const checkText = await checkResponse.text();

            if (checkText.includes('Status=READY')) {
                // Get results
                const resultUrl = `${putUrl}?CMD=Get&FORMAT_TYPE=JSON2&RID=${rid}`;
                const resultResponse = await fetch(resultUrl);
                const resultText = await resultResponse.text();

                try {
                    const resultJson = JSON.parse(resultText);
                    return formatBlastResults(resultJson);
                } catch {
                    // Fallback: try to parse XML-ish results
                    return formatBlastTextResults(resultText);
                }
            } else if (checkText.includes('Status=FAILED')) {
                throw new Error('BLAST search failed on NCBI server');
            }

            attempts++;
        }

        throw new Error('BLAST search timed out. Try again with a shorter sequence.');

    } catch (error) {
        if (error.message.includes('fetch')) {
            // Network error - show demo results
            return renderDemoBlastResults();
        }
        throw error;
    }
}

function formatBlastResults(json) {
    try {
        const results = json?.BlastOutput2?.[0]?.report?.results;
        if (!results?.search?.hits?.length) {
            return '<div class="empty-state"><span class="empty-state-icon"></span><p class="empty-state-text">No significant matches found</p></div>';
        }

        const hits = results.search.hits.slice(0, 20);

        let html = `
      <div style="margin-bottom:12px;font-size:12px;color:var(--text-secondary);">
        Found <strong>${results.search.hits.length}</strong> hits. Showing top ${hits.length}.
      </div>
      <div style="overflow-x:auto;">
        <table class="blast-results-table">
          <thead><tr><th>#</th><th>Accession</th><th>Description</th><th>Score</th><th>E-value</th><th>Identity</th><th>Coverage</th></tr></thead>
          <tbody>
    `;

        hits.forEach((hit, i) => {
            const desc = hit.description?.[0];
            const hsp = hit.hsps?.[0];
            if (!hsp) return;

            const identity = hsp.identity ? ((hsp.identity / hsp.align_len * 100).toFixed(1)) : 'N/A';
            const coverage = hsp.query_to && hsp.query_from
                ? ((hsp.query_to - hsp.query_from + 1) / (results.search.query_len || 1) * 100).toFixed(0)
                : 'N/A';

            html += `<tr>
        <td>${i + 1}</td>
        <td><a href="https://www.ncbi.nlm.nih.gov/nuccore/${desc?.accession}" target="_blank" style="color:var(--accent-blue);text-decoration:none;">${desc?.accession || 'N/A'}</a></td>
        <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(desc?.title || '')}">${escapeHtml(desc?.title || 'N/A')}</td>
        <td>${hsp.bit_score?.toFixed(1) || 'N/A'}</td>
        <td class="evalue">${hsp.evalue?.toExponential(1) || 'N/A'}</td>
        <td>${identity}%</td>
        <td>${coverage}%</td>
      </tr>`;
        });

        html += '</tbody></table></div>';
        return html;
    } catch (e) {
        return `<div class="empty-state"><span class="empty-state-icon"></span><p class="empty-state-text">Error parsing BLAST results: ${e.message}</p></div>`;
    }
}

function formatBlastTextResults(text) {
    return `
    <div style="margin-bottom:12px;font-size:12px;color:var(--text-secondary);">
      Raw BLAST output received. Parsing not fully supported for this format.
    </div>
    <div class="sequence-display" style="font-size:11px;max-height:400px;overflow:auto;">${escapeHtml(text.substring(0, 5000))}</div>
  `;
}

function renderDemoBlastResults() {
    const demoHits = [
        { acc: 'L09137.2', title: 'Cloning vector pUC19, complete sequence', score: 5365, evalue: 0.0, identity: 100, coverage: 100 },
        { acc: 'M77789.1', title: 'Cloning vector pUC19 (improved), complete sequence', score: 5200, evalue: 0.0, identity: 99.8, coverage: 100 },
        { acc: 'X02514.1', title: 'E. coli plasmid pUC18 DNA', score: 4800, evalue: 0.0, identity: 98.5, coverage: 97 },
        { acc: 'EU104789.1', title: 'Cloning vector pBR322, complete sequence', score: 2100, evalue: 0.0, identity: 95.2, coverage: 45 },
        { acc: 'AY234330.1', title: 'Synthetic construct cloning vector pET-28a(+)', score: 1800, evalue: 1e-120, identity: 92.1, coverage: 35 },
    ];

    let html = `
    <div style="margin-bottom:12px;padding:8px 12px;background:rgba(210,153,34,0.1);border:1px solid rgba(210,153,34,0.3);border-radius:var(--radius-sm);font-size:12px;color:var(--accent-orange);">
      Demo mode — Unable to connect to NCBI. Showing simulated results.
    </div>
    <div style="overflow-x:auto;">
      <table class="blast-results-table">
        <thead><tr><th>#</th><th>Accession</th><th>Description</th><th>Score</th><th>E-value</th><th>Identity</th><th>Coverage</th></tr></thead>
        <tbody>
  `;

    demoHits.forEach((hit, i) => {
        html += `<tr>
      <td>${i + 1}</td>
      <td style="color:var(--accent-blue);">${hit.acc}</td>
      <td>${hit.title}</td>
      <td>${hit.score}</td>
      <td class="evalue">${hit.evalue === 0 ? '0.0' : hit.evalue.toExponential(1)}</td>
      <td>${hit.identity}%</td>
      <td>${hit.coverage}%</td>
    </tr>`;
    });

    html += '</tbody></table></div>';
    return html;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
