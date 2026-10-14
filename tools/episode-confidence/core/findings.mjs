/**
 * The episode confidence run's findings: one shape for all four layers, the check that a reviewer's quote is really in the file it
 * cites, de-duplication, and the scorecard. Pure: no file is read here except through the `read` function a caller passes in.
 * (design/playtest-process.md section 13; the shape is also tools/episode-confidence/finding.schema.json.)
 *
 * Why a quote check: a reviewer that invents the words it is criticising is the cheapest way for an LLM co-author to look useful and be
 * wrong. Every desk finding must quote the exact words it means; a quote that is not in the cited file (whitespace and typographic
 * quotes aside) is dropped and counted as a fabricated quote. That count is the first precision number on the scorecard.
 */

export const CHANNELS = ["gate", "desk", "walker", "table"];
export const KINDS = ["bug", "content", "rules", "continuity", "craft"];
export const SEVERITIES = ["S0", "S1", "S2", "S3"];
export const GRADES = ["useful", "wrong", "nitpick", "knew"];

const s = (v) => (typeof v === "string" ? v.trim() : "");

/**
 * Normalise one raw finding (a reviewer's JSON, a gate line, a rig finding) into the shared shape. Returns { ok, finding, errors }.
 * @param {object} raw
 * @param {{ channel: string, source?: string, model?: string|null }} ctx
 */
export function normalizeFinding(raw, { channel, source = null, model = null } = {}) {
  const errors = [];
  if (!CHANNELS.includes(channel)) errors.push(`channel must be one of ${CHANNELS.join(", ")}`);
  const kind = KINDS.includes(raw?.kind) ? raw.kind : mapKind(raw?.kind);
  if (!kind) errors.push(`kind must be one of ${KINDS.join(", ")} (got ${JSON.stringify(raw?.kind)})`);
  const severity = SEVERITIES.includes(raw?.severity) ? raw.severity : null;
  if (!severity) errors.push("severity must be S0..S3");
  const summary = s(raw?.summary);
  if (!summary) errors.push("a finding needs a summary");
  const proposal = raw?.proposal && typeof raw.proposal === "object" ? { type: raw.proposal.type === "question" ? "question" : "fix", text: s(raw.proposal.text) } : raw?.fix ? { type: "fix", text: s(raw.fix) } : null;
  const finding = {
    id: null,
    channel,
    source: s(raw?.source) || source,
    model: s(raw?.model) || model,
    scene: s(raw?.scene) || null,
    beat: s(raw?.beat) || null,
    lens: s(raw?.lens) || null,
    kind,
    severity,
    summary,
    quote: s(raw?.quote) || null,
    file: s(raw?.file).replace(/\\/g, "/") || null,
    expected: s(raw?.expected),
    actual: s(raw?.actual),
    proposal,
    verified: null,
    duplicates: []
  };
  return { ok: errors.length === 0, finding, errors };
}

/** The rig's own kinds (tools/playtest/core/findings.mjs) mapped onto the confidence run's five. */
export function mapKind(kind) {
  const table = {
    bug: "bug", "ux-friction": "bug", a11y: "bug", perf: "bug", leak: "bug", sync: "bug",
    "material-gap": "content", "material-weak": "content", continuity: "continuity", rules: "rules", pacing: "craft", craft: "craft", content: "content"
  };
  return table[kind] ?? null;
}

/** Whitespace, quotes and dashes folded, so a quote copied out of JSON still matches the file it came from. */
export function foldText(text) {
  return String(text ?? "")
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Is the finding's quote really in its file? Sets `verified` (true/false; null when the finding has no quote, which only gate,
 * walker and table findings may lack). `read(path)` returns the file's text or null.
 * A desk finding with no quote or no file is unverifiable and counts as not verified.
 */
export function verifyQuote(finding, read) {
  if (!finding.quote || !finding.file) {
    finding.verified = finding.channel === "desk" ? false : null;
    finding.verifyNote = finding.channel === "desk" ? "no quote, or no file to find it in" : null;
    return finding;
  }
  const candidates = [finding.file];
  // A canon scene is copied into data/ by `story build`; a reviewer may cite either twin.
  if (finding.file.startsWith("canon/scenes/")) candidates.push(finding.file.replace("canon/scenes/", "data/scene-briefs/"));
  if (finding.file.startsWith("data/scene-briefs/")) candidates.push(finding.file.replace("data/scene-briefs/", "canon/scenes/"));
  const needle = foldText(finding.quote);
  for (const file of candidates) {
    const text = read(file);
    if (text !== null && text !== undefined && foldText(text).includes(needle)) {
      finding.verified = true;
      finding.verifyNote = null;
      return finding;
    }
  }
  finding.verified = false;
  finding.verifyNote = candidates.some((f) => read(f) !== null && read(f) !== undefined) ? "the quote is not in the cited file" : "the cited file does not exist";
  return finding;
}

const words = (text) => new Set(foldText(text).split(/[^a-z0-9]+/).filter((w) => w.length > 3));
function overlap(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / Math.min(x.size, y.size);
}

/**
 * Merge findings that say the same thing about the same place: same scene, and either the same quote (one inside the other) or
 * summaries sharing most of their words. The most severe copy stays; the others are listed in its `duplicates` with their channel,
 * which is how the scorecard knows a find was made by more than one layer.
 */
export function dedupe(findings, { threshold = 0.7 } = {}) {
  const kept = [];
  for (const f of findings) {
    const home = kept.find((k) => {
      if ((k.scene ?? null) !== (f.scene ?? null)) return false;
      const qa = foldText(k.quote);
      const qb = foldText(f.quote);
      if (qa && qb && qa.length > 12 && qb.length > 12 && (qa.includes(qb) || qb.includes(qa))) return true;
      return overlap(k.summary, f.summary) >= threshold;
    });
    if (!home) {
      kept.push(f);
      continue;
    }
    const keepNew = SEVERITIES.indexOf(f.severity) < SEVERITIES.indexOf(home.severity);
    const [winner, loser] = keepNew ? [f, home] : [home, f];
    winner.duplicates = [...(winner.duplicates ?? []), { channel: loser.channel, source: loser.source, summary: loser.summary }, ...(loser.duplicates ?? [])];
    if (keepNew) kept[kept.indexOf(home)] = winner;
  }
  return kept;
}

/** Number the findings in a stable order: severity, then play order of the scene, then channel. */
export function numberFindings(findings, sceneOrder = []) {
  const order = (f) => (f.scene && sceneOrder.includes(f.scene) ? sceneOrder.indexOf(f.scene) : sceneOrder.length);
  const sorted = [...findings].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || order(a) - order(b) || CHANNELS.indexOf(a.channel) - CHANNELS.indexOf(b.channel));
  sorted.forEach((f, i) => (f.id = `C-${String(i + 1).padStart(4, "0")}`));
  return sorted;
}

/**
 * The scorecard for one run: per channel (and per model inside the desk), how many findings, how many Ingram graded useful, how many
 * fabricated quotes were dropped, and how many finds no other layer made. `grades` maps finding id to one of GRADES.
 */
export function scorecard(findings, grades = {}, { dropped = [], costs = {} } = {}) {
  const rows = new Map();
  const row = (key) => {
    if (!rows.has(key)) rows.set(key, { key, findings: 0, graded: 0, useful: 0, wrong: 0, nitpick: 0, knew: 0, unique: 0, fabricated: 0, minutes: costs[key]?.minutes ?? null, tokens: costs[key]?.tokens ?? null });
    return rows.get(key);
  };
  const keyOf = (f) => (f.channel === "desk" && f.model ? `desk (${f.model})` : f.channel);
  for (const f of findings) {
    const r = row(keyOf(f));
    r.findings++;
    if (!(f.duplicates ?? []).some((d) => d.channel !== f.channel)) r.unique++;
    const g = grades[f.id];
    if (GRADES.includes(g)) {
      r.graded++;
      r[g]++;
    }
  }
  for (const d of dropped) row(keyOf(d)).fabricated++;
  return [...rows.values()].map((r) => ({ ...r, precision: r.graded ? r.useful / r.graded : null }));
}

/** The scorecard as a markdown table, for design/playtests/copilot-scorecard.md. */
export function scorecardMarkdown(rows, { run, date }) {
  const pct = (v) => (v === null ? "-" : `${Math.round(v * 100)}%`);
  const lines = [`### ${run} (${date})`, "", "| Layer | Findings | Graded | Useful | Wrong | Nitpick | Knew | Precision | Only this layer | Fabricated quotes | Minutes | Tokens |", "|---|---|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of rows) lines.push(`| ${r.key} | ${r.findings} | ${r.graded} | ${r.useful} | ${r.wrong} | ${r.nitpick} | ${r.knew} | ${pct(r.precision)} | ${r.unique} | ${r.fabricated} | ${r.minutes ?? "-"} | ${r.tokens ?? "-"} |`);
  return lines.join("\n");
}
