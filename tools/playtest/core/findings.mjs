/**
 * Findings: the one log every instrument and every observer writes to (design/playtest-process.md, section 7). Pure.
 *
 * The rules the process set, held here so the log cannot drift from them:
 *   - NO EVIDENCE, NO FINDING. A finding an agent or the Scribe files must carry at least one evidence reference (the hub attaches a
 *     screenshot and the last actions when a seat files one, so a seat never has to remember to); a script's finding carries its own.
 *   - `praise` is a kind, so what worked is defended as well as what failed.
 *   - `rig` is a kind, so a fault in the playtest harness itself is never counted as a defect of the game.
 *   - Material findings are filed against the project's own vocabulary (scene-audit categories, Sign-Off checks, re-read questions)
 *     through the optional `ref` field, so they land where the project already files such things.
 */

export const KINDS = ["bug", "ux-friction", "a11y", "perf", "leak", "sync", "material-gap", "material-weak", "continuity", "rules", "pacing", "praise", "rig"];
export const SEVERITIES = ["S0", "S1", "S2", "S3"];
export const CHANNELS = ["instrument", "agent", "scribe", "orchestrator", "human", "walker"];

/** S0 stops play, loses work, corrupts the world or shows a player something GM-only. S1 gives wrong or missing information, or needs a workaround. S2 is friction. S3 is polish. */
export const SEVERITY_MEANING = {
  S0: "stops play, loses data or work, corrupts the world, or shows a player something GM-only",
  S1: "gives wrong or missing information, or needs a workaround to go on",
  S2: "friction or confusion that costs time",
  S3: "polish"
};

/** "s1", "1", "S1", "blocker", "major" ... -> "S0".."S3", or null. */
export function parseSeverity(input) {
  if (input === undefined || input === null) return null;
  const text = String(input).trim().toLowerCase();
  const words = { blocker: "S0", critical: "S0", major: "S1", high: "S1", moderate: "S2", medium: "S2", minor: "S3", low: "S3", polish: "S3" };
  if (text in words) return words[text];
  const match = /^s?([0-3])$/.exec(text);
  return match ? `S${match[1]}` : null;
}

export function parseKind(input) {
  if (typeof input !== "string") return null;
  const text = input.trim().toLowerCase().replace(/_/g, "-");
  const aliases = { friction: "ux-friction", ux: "ux-friction", gap: "material-gap", weak: "material-weak", weakness: "material-weak", good: "praise", worked: "praise", harness: "rig" };
  const kind = aliases[text] ?? text;
  return KINDS.includes(kind) ? kind : null;
}

/** F-0001, F-0002 ... the next id after the existing findings. */
export function nextId(existing) {
  let max = 0;
  for (const f of existing) {
    const m = /^F-(\d+)$/.exec(f.id ?? "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `F-${String(max + 1).padStart(4, "0")}`;
}

/**
 * A complete finding from what a seat typed plus what the hub knows.
 * @returns {{ok:true, finding:object}|{ok:false, errors:string[]}}
 */
export function makeFinding(input, { id, run, now, channel, seat = null, scene = null, beat = null, autoEvidence = [] }) {
  const kind = parseKind(input.kind);
  const severity = parseSeverity(input.severity);
  const errors = [];
  if (!kind) errors.push(`kind must be one of: ${KINDS.join(", ")}`);
  if (!severity) errors.push("severity must be S0, S1, S2 or S3 (S0 stops play; S3 is polish)");
  const summary = typeof input.summary === "string" ? input.summary.trim() : "";
  if (!summary) errors.push("a summary is required");
  if (summary.length > 300) errors.push("the summary is too long (300 characters); put the detail in expected / actual / repro");
  if (!CHANNELS.includes(channel)) errors.push(`channel must be one of ${CHANNELS.join(", ")}`);
  const evidence = [...new Set([...(input.evidence ?? []), ...autoEvidence].filter(Boolean))];
  if (["agent", "scribe"].includes(channel) && evidence.length === 0) errors.push("no evidence, no finding: attach a screenshot or telemetry line");
  if (errors.length) return { ok: false, errors };
  const list = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v.map(String) : [String(v)]);
  return {
    ok: true,
    finding: {
      id,
      run,
      t: now,
      channel,
      seat,
      scene: input.scene ?? scene,
      beat: input.beat ?? beat,
      kind,
      severity,
      summary,
      expected: input.expected ?? "",
      actual: input.actual ?? "",
      repro: list(input.repro),
      evidence,
      ref: input.ref ?? null,
      lock: null
    }
  };
}

/**
 * The orchestrator's correction of a finding it has since understood better: most often an instrument that cried wolf, which becomes
 * `rig` (a fault in the harness, never counted as the game's). The history stays on the finding and a reason is required, so a
 * finding is never quietly made to go away.
 * @returns {{ok:true, finding:object}|{ok:false, errors:string[]}}
 */
export function reclassify(finding, input, { now }) {
  const errors = [];
  const kind = input.kind === undefined ? finding.kind : parseKind(input.kind);
  const severity = input.severity === undefined ? finding.severity : parseSeverity(input.severity);
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!kind) errors.push(`kind must be one of: ${KINDS.join(", ")}`);
  if (!severity) errors.push("severity must be S0, S1, S2 or S3");
  if (!reason) errors.push("a reason is required: a finding is corrected on the record, never quietly");
  if (kind === finding.kind && severity === finding.severity) errors.push("nothing to change: give a different --kind or --severity");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    finding: { ...finding, kind, severity, reclassified: [...(finding.reclassified ?? []), { at: now, from: { kind: finding.kind, severity: finding.severity }, to: { kind, severity }, reason }] }
  };
}

/** Order: severity (S0 first), then kind, then time. */
export function sortFindings(findings) {
  const rank = (f) => SEVERITIES.indexOf(f.severity);
  return [...findings].sort((a, b) => rank(a) - rank(b) || a.kind.localeCompare(b.kind) || String(a.t).localeCompare(String(b.t)));
}

const STOP = new Set(["the", "a", "an", "of", "to", "and", "or", "in", "on", "is", "it", "was", "for", "with", "that", "this", "at", "not", "no", "but", "as", "by", "be", "are", "from"]);

/** The significant lowercase words of a summary. */
export function tokens(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9\s]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
}

/** Jaccard similarity of two summaries' words, 0..1. */
export function similarity(a, b) {
  const sa = new Set(tokens(a));
  const sb = new Set(tokens(b));
  if (!sa.size || !sb.size) return 0;
  let common = 0;
  for (const w of sa) if (sb.has(w)) common++;
  return common / (sa.size + sb.size - common);
}

/**
 * Group findings that are probably one cause: the same kind, and either the same scene with a similar summary or the same summary text
 * anywhere. Greedy and order-stable, so the same log always clusters the same way. The orchestrator still reads every cluster; this only
 * stops the report listing one defect nine times.
 */
export function clusterFindings(findings, { threshold = 0.55 } = {}) {
  const clusters = [];
  for (const f of sortFindings(findings)) {
    const home = clusters.find((c) => c.kind === f.kind && (similarity(c.summary, f.summary) >= threshold || (c.scene === f.scene && f.scene && similarity(c.summary, f.summary) >= threshold - 0.2)));
    if (home) {
      home.members.push(f);
      if (SEVERITIES.indexOf(f.severity) < SEVERITIES.indexOf(home.severity)) home.severity = f.severity;
    } else {
      clusters.push({ kind: f.kind, severity: f.severity, summary: f.summary, scene: f.scene, members: [f] });
    }
  }
  return clusters;
}

/** Counts by severity and by kind, for the control room and the report header. A fault in the rig is counted on its own, never as the game's. */
export function tally(findings) {
  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
  const byKind = {};
  let rig = 0;
  for (const f of findings) {
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
    if (f.kind === "rig") {
      rig++;
      continue;
    }
    bySeverity[f.severity]++;
  }
  return { total: findings.length - rig, rig, bySeverity, byKind };
}
