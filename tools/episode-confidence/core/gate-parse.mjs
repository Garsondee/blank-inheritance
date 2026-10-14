/**
 * The gate's parsers: each machine check's real output turned into findings in the shared shape (core/findings.mjs). Pure.
 * The gate itself (tools/episode-confidence/gate.mjs) runs the tools; this file only reads what they printed, so every parser is
 * tested against output captured from the real tool (test/episode-confidence/gate.test.mjs).
 *
 * The gate never stops a run. What it finds is handed to the desk reviewers so they do not spend judgement re-finding it.
 */

const gate = (source, severity, summary, extra = {}) => ({ channel: "gate", source, kind: extra.kind ?? "bug", severity, summary, scene: extra.scene ?? null, beat: null, quote: null, file: extra.file ?? null, expected: "", actual: extra.actual ?? "", proposal: extra.proposal ?? null });

/**
 * `node tools/story/story.mjs check`: lines `error  scenes/<file>.json: ...` and `note   ...`. Errors in this episode's scenes (or
 * anywhere, since a story error anywhere can break the build) are S1; notes are counted, never filed (there are a hundred, mostly
 * about places not yet in canon, and they are the story tool's own to-do list).
 */
export function parseStoryCheck(stdout, exit, { briefIds = [] } = {}) {
  const lines = String(stdout).split(/\r?\n/);
  const errors = lines.filter((l) => /^error\b/.test(l.trim()));
  const notes = lines.filter((l) => /^note\b/.test(l.trim()));
  const sceneOf = (l) => briefIds.find((id) => l.includes(`${id}.json`)) ?? null;
  const findings = errors.map((l) => gate("story check", "S1", l.trim().replace(/^error\s+/, ""), { scene: sceneOf(l), kind: "continuity" }));
  if (exit !== 0 && !errors.length) findings.push(gate("story check", "S1", `story check exited ${exit} without naming an error`, { actual: lines.slice(-5).join(" ") }));
  const ours = notes.filter((l) => sceneOf(l));
  return { findings, summary: `${errors.length} error(s), ${notes.length} note(s), ${ours.length} of them on this episode's scenes` };
}

/**
 * `node tools/scene-audit/audit.mjs --episode <id>`: "=== N findings across M scenes ===", with each scene's findings under a
 * `<title> — N findings` head as `  [category] message`. A scene rebuilt in canon/ is skipped by the audit ("checked by its re-read"),
 * which is every Episode One scene today: then the audit has nothing to say and the summary says why.
 */
export function parseSceneAudit(stdout, exit, { titleToBrief = {} } = {}) {
  const text = String(stdout);
  const m = text.match(/=== (\d+) findings? across (\d+) scenes? ===/);
  const n = m ? Number(m[1]) : null;
  const inCanon = (text.match(/ — in canon\/: checked by its re-read/g) ?? []).length;
  const findings = [];
  if (n === null) findings.push(gate("scene audit", "S2", `the scene audit's output had no total line (exit ${exit})`));
  else if (n > 0) {
    let scene = null;
    for (const line of text.split(/\r?\n/)) {
      const head = line.match(/^(.+) — \d+ findings?$/);
      if (head) scene = titleToBrief[head[1].trim()] ?? head[1].trim();
      const item = line.match(/^\s+\[([a-z-]+)\] (.*)$/);
      if (item) findings.push(gate("scene audit", "S3", `[${item[1]}] ${item[2].trim()}`, { scene, kind: "craft" }));
    }
  }
  return { findings, summary: n === null ? "no total" : `${n} finding(s) across ${m[2]} scenes${inCanon ? `; ${inCanon} scene(s) are in canon/ and answer to their re-read instead` : ""}` };
}

/**
 * `node tools/location-sync/journeys.mjs --episode <id>`: a verdict, then `## Errors (n)` / `## Warnings (n)` sections of
 * `- [code] message` with indented `where:` and `try:` lines. Errors are S1 (the party cannot make the journey), warnings S2.
 */
export function parseJourneys(stdout, exit, { titleToBrief = {} } = {}) {
  const lines = String(stdout).split(/\r?\n/);
  const verdict = (lines.find((l) => /^Verdict:/.test(l)) ?? "").replace(/^Verdict:\s*/, "");
  const findings = [];
  let section = null;
  let current = null;
  for (const line of lines) {
    const head = line.match(/^## (Errors|Warnings|Notes)\b/);
    if (head) {
      section = head[1];
      current = null;
      continue;
    }
    if (section === "Notes" || !section) continue;
    const item = line.match(/^- \[([a-z0-9-]+)\] (.*)$/);
    if (item) {
      current = gate("journeys", section === "Errors" ? "S1" : "S2", item[2].trim(), { kind: "bug", actual: `[${item[1]}]` });
      findings.push(current);
      continue;
    }
    const where = line.match(/^\s+where: (.*)$/);
    if (where && current) {
      current.actual = `${current.actual} ${where[1].trim()}`.trim();
      const scene = where[1].match(/scene "([^"]+)"/);
      if (scene && titleToBrief[scene[1]]) current.scene = titleToBrief[scene[1]];
    }
    const tryLine = line.match(/^\s+try: (.*)$/);
    if (tryLine && current) current.proposal = { type: "fix", text: tryLine[1].trim() };
  }
  if (exit !== 0 && !findings.some((f) => f.severity === "S1")) findings.push(gate("journeys", "S1", `the journey check exited ${exit}`));
  return { findings, summary: verdict || `exit ${exit}` };
}

/** `node tools/npc-generator/apply.mjs --check --quiet`: exit 0 and "all N statblocks are what the roster generates", or a list. */
export function parseNpcCheck(stdout, exit) {
  const text = String(stdout).trim();
  if (exit === 0) return { findings: [], summary: text.split(/\r?\n/).pop() ?? "ok" };
  return { findings: [gate("npc check", "S2", "Some NPC statblocks differ from what the roster generates (npm run npcs to rewrite them)", { kind: "rules", actual: text.slice(0, 600) })], summary: `exit ${exit}` };
}

/**
 * `node tools/scene-signoff/console.mjs --json`: the board. Every REQUIRED check failing on one of this episode's scenes becomes an S2
 * gate finding (the Sign-Off's own machine-checkable half); recommended ones are counted only.
 */
export function parseSignoffBoard(json, { episodeId }) {
  const board = typeof json === "string" ? JSON.parse(json) : json;
  const rows = (board.rows ?? []).filter((r) => r.episodeId === episodeId);
  const findings = [];
  let recommended = 0;
  for (const r of rows) {
    for (const b of r.checks?.blockers ?? []) {
      if (b.state !== "fail") continue;
      if (b.severity !== "required") {
        recommended++;
        continue;
      }
      findings.push(gate("sign-off board", "S2", `Sign-Off ${b.id} fails: ${b.question}${b.detail ? ` (${b.detail})` : ""}`, { scene: r.briefRef, kind: "content", actual: b.why ?? "" }));
    }
    if (!r.sited && !r.locationWaived) findings.push(gate("sign-off board", "S2", `"${r.title}" has no location on the map`, { scene: r.briefRef, kind: "content" }));
  }
  return { findings, summary: `${rows.length} scenes on the board, ${rows.filter((r) => r.live).length} live; ${findings.length} required failure(s), ${recommended} recommended`, checklistVersion: board.checklistVersion ?? null };
}

/** `npm test` (node --test underneath): the `ℹ fail N` line, and the names after "failing tests:". */
export function parseTestRun(stdout, exit) {
  const text = String(stdout);
  const fail = Number((text.match(/\u{2139} fail (\d+)/u) ?? text.match(/# fail (\d+)/) ?? [])[1] ?? NaN);
  const pass = Number((text.match(/\u{2139} pass (\d+)/u) ?? text.match(/# pass (\d+)/) ?? [])[1] ?? NaN);
  const failing = [];
  const at = text.indexOf("failing tests:");
  if (at >= 0) for (const line of text.slice(at).split(/\r?\n/).slice(1)) {
    const m = line.match(/^\u{2716} (.+?) \(\d/u);
    if (m && !/^test[\\/]/.test(m[1])) failing.push(m[1]);
  }
  const findings = [];
  if (fail > 0 || (exit !== 0 && Number.isNaN(fail))) findings.push(gate("npm test", "S1", `The test suite fails${fail > 0 ? ` (${fail} test(s))` : ""}: ${[...new Set(failing)].slice(0, 6).join("; ") || "see its output"}`, { actual: text.slice(-600) }));
  return { findings, summary: Number.isNaN(pass) ? `exit ${exit}` : `${pass} passed, ${Number.isNaN(fail) ? "?" : fail} failed` };
}
