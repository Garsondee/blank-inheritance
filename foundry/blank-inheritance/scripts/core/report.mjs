/** Pure report summarization and HTML rendering — no Foundry globals. */

export function summarizeReport(report) {
  let total = 0;
  let passed = 0;
  for (const result of report.results) {
    for (const c of result.checks) {
      total += 1;
      if (c.pass) passed += 1;
    }
  }
  return { total, passed, failed: total - passed };
}

export function reportToHtml(report, summary) {
  const rows = report.results
    .map((result) => {
      const checkRows = result.checks
        .map(
          (c) =>
            `<tr style="color:${c.pass ? "inherit" : "#c0392b"}"><td>${c.label}</td><td>${JSON.stringify(c.expected)}</td><td>${JSON.stringify(c.actual)}</td><td>${c.pass ? "✓" : "✗ FAIL"}</td></tr>`
        )
        .join("");
      return `<tr><td colspan="4"><strong>${result.foundryType}: ${result.sourceId}</strong> (id ${result.actualId === result.expectedId ? "OK" : "MISMATCH"})</td></tr>${checkRows}`;
    })
    .join("");
  return `
    <div class="blank-inheritance-report">
      <h3>Blank Inheritance — Diagnostic Test Sync</h3>
      <p><strong>${summary.passed}/${summary.total}</strong> checks passed${summary.failed ? `, <strong style="color:#c0392b">${summary.failed} failed</strong>` : ""}.</p>
      ${report.fatalError ? `<p style="color:#c0392b"><strong>Did not complete:</strong> ${report.fatalError}</p>` : ""}
      <table style="width:100%; font-size: 0.85em;">
        <tr><th>Check</th><th>Expected</th><th>Actual</th><th></th></tr>
        ${rows}
      </table>
      ${report.reportFileWritten ? `<p>Full JSON report written to <code>storage/${report.reportPath}</code>.</p>` : `<p><em>Could not write the report file (see console) — results above are from this session only.</em></p>`}
    </div>
  `;
}
