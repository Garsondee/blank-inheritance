/**
 * The report skeleton: everything of the final report that is DATA, laid out in the order the process promises (design/playtest-process.md,
 * section 8). Pure. The orchestrator writes the verdict and the judgement calls; this fills in the tables so none of them is typed by hand
 * and none can disagree with the run's own files.
 *
 * Placeholders the orchestrator must replace are marked `<<WRITE: ...>>`, and `unfilled()` says whether any remain: a report with one is
 * not finished.
 */

import { SEVERITIES, clusterFindings, sortFindings, tally } from "./findings.mjs";

const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const table = (head, rows) => (rows.length ? [`| ${head.join(" | ")} |`, `|${head.map(() => "---").join("|")}|`, ...rows.map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n") : "_none_");

/** The improvisation inventory: how often the GM had to invent, by scene and beat. */
export function improvInventory(improv) {
  const by = new Map();
  for (const i of improv) {
    const key = `${i.scene ?? "?"}#${i.beat ?? "(scene)"}`;
    const e = by.get(key) ?? { scene: i.scene ?? "?", beat: i.beat ?? "(scene)", count: 0, whys: [] };
    e.count++;
    if (i.why) e.whys.push(i.why);
    by.set(key, e);
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}

export const LAUNCH_CHECKS = [
  ["A-6", "The Confirm relay with a GM online, and the message with none"],
  ["A-7", "Portrait upload as a plain Player"],
  ["A-9", "A full induction as a real Player (local half; the item itself is on the live server)"],
  ["B-5", "Both versions of the opening and the title card"],
  ["B-6", "Audio, functionally"],
  ["B-9", "A dry run with several connected clients"],
  ["B-14", "The founders, a player who remembers the old campaign"]
];

export function unfilled(markdown) {
  return [...markdown.matchAll(/<<WRITE:[^>]*>>/g)].map((m) => m[0]);
}

/**
 * @param {object} d
 * @param {object} d.run         { name, build, seed, startedAt, endedAt }
 * @param {object} d.roster      the roster
 * @param {object[]} d.findings
 * @param {object[]} d.improv
 * @param {object} [d.coverage]  coverage.summarize()
 * @param {object} [d.telemetry] telemetry.summarizeEvents()
 * @param {object} [d.dice]      dice.summarizeTape()
 * @param {object} [d.actions]   { bySeat: { P2: n } }
 * @param {string[]} [d.audits]  audit.summarizeAudits()
 * @param {object[]} [d.predictions] [{ scene, text, result }]
 */
export function buildReport(d) {
  const findings = sortFindings(d.findings ?? []);
  const t = tally(findings);
  const ui = findings.filter((f) => ["bug", "ux-friction", "a11y", "perf", "leak", "sync"].includes(f.kind));
  const material = findings.filter((f) => ["material-gap", "material-weak", "continuity", "rules", "pacing"].includes(f.kind));
  const praise = findings.filter((f) => f.kind === "praise");
  const rig = findings.filter((f) => f.kind === "rig");
  const out = [];
  out.push(`# Playtest report: ${d.run.name}`);
  out.push(`*Build ${d.run.build ?? "?"}, seed ${d.run.seed ?? "?"}. ${d.run.startedAt ?? ""} to ${d.run.endedAt ?? ""}. Generated from the run's own files; the sections marked <<WRITE: ...>> are the orchestrator's.*`);

  out.push("## 1. Verdict");
  out.push("<<WRITE: what to fix before the first Session, then what can wait, in plain words>>");
  out.push(table(["Launch item", "What it asks", "Result"], LAUNCH_CHECKS.map(([id, what]) => [id, what, "<<WRITE: result and the finding ids behind it>>"])));

  out.push("## 2. Run facts");
  out.push(table(["Seat", "User", "Persona", "Brain", "Screen", "Actions"], (d.roster?.seats ?? []).map((s) => [s.seat, s.user, s.persona ?? "", s.brain === "bot" ? `bot (${s.bot})` : s.brain, `${s.profile.viewport.join("x")}${s.profile.scale && s.profile.scale !== 1 ? ` @${s.profile.scale}` : ""}${s.profile.keyboardOnly ? " keyboard-only" : ""}${s.profile.reducedMotion ? " reduced-motion" : ""}${s.profile.network ? " slow-link" : ""}`, d.actions?.bySeat?.[s.seat] ?? 0])));
  if (d.coverage) {
    const c = d.coverage;
    out.push(`**Coverage.** Scenes ${c.scenes.seen}/${c.scenes.total}; beats ${c.beats.seen}/${c.beats.total} (mandatory ${c.mandatoryBeats.seen}/${c.mandatoryBeats.total}); checks seen both ways ${c.checks.seenBothWays}/${c.checks.total}; choice options taken ${c.choices.seen}/${c.choices.total}; handouts ${c.handouts.seen}/${c.handouts.total}.`);
    if (c.gaps.mandatoryBeats.length) out.push(`Mandatory beats never ticked: ${c.gaps.mandatoryBeats.join(", ")}.`);
  }
  if (d.dice) out.push(`**Dice.** ${d.dice.rolls} roll(s): ${d.dice.natural} natural, ${d.dice.forced} forced (every forced roll is marked in the tape); degrees ${Object.entries(d.dice.byDegree).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}.`);
  if (d.telemetry) out.push(`**Telemetry.** ${SEVERITIES.map((s) => `${s} ${d.telemetry.bySeverity[s]}`).join(", ")} classified events; known noise kept apart: ${Object.entries(d.telemetry.noisy).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}.`);
  out.push(`**Findings.** ${t.total} (${SEVERITIES.map((s) => `${s} ${t.bySeverity[s]}`).join(", ")}).`);

  out.push("## 3. UI and UX findings");
  out.push(table(["Id", "Sev", "Kind", "Seat", "Scene", "Summary", "Evidence"], clusterFindings(ui).map((c) => [c.members.map((m) => m.id).join(", "), c.severity, c.kind, [...new Set(c.members.map((m) => m.seat).filter(Boolean))].join(", "), c.scene ?? "", c.summary, c.members[0].evidence.slice(0, 2).join("; ")])));

  out.push("## 4. Material findings, scene by scene");
  out.push(table(["Id", "Sev", "Kind", "Scene", "Beat", "Summary", "Ref"], material.map((f) => [f.id, f.severity, f.kind, f.scene ?? "", f.beat ?? "", f.summary, f.ref ?? ""])));
  out.push("**The improvisation inventory** (the strongest single signal: a cluster of improvisations on one beat is a hole in the scene).");
  out.push(table(["Scene", "Beat", "Times the GM invented", "Why"], improvInventory(d.improv ?? []).map((i) => [i.scene, i.beat, i.count, i.whys.slice(0, 3).join(" / ")])));
  if (d.predictions?.length) {
    out.push("**The prediction scoreboard** (written before each scene was played).");
    out.push(table(["Scene", "Prediction", "Result"], d.predictions.map((p) => [p.scene, p.text, p.result ?? "<<WRITE: held / wrong, and what happened>>"])));
  }

  out.push("## 5. What worked");
  out.push(table(["Id", "Seat", "Scene", "Summary"], praise.map((f) => [f.id, f.seat ?? "", f.scene ?? "", f.summary])));

  out.push("## 6. Per-persona view");
  out.push(table(["Seat", "Persona", "Findings", "S0/S1"], (d.roster?.seats ?? []).map((s) => { const mine = findings.filter((f) => f.seat === s.seat); return [s.seat, s.persona ?? "", mine.length, mine.filter((f) => f.severity === "S0" || f.severity === "S1").length]; })));

  out.push("## 7. Calls that are Ingram's");
  out.push("<<WRITE: the judgement questions the run raised, listed and not resolved>>");

  out.push("## 8. The lock plan");
  out.push("Every finding ends in a lock: an automated check, else a feature, else a sharper re-read question, else a memory note.");
  out.push(table(["Finding", "Sev", "Proposed lock"], findings.filter((f) => f.kind !== "praise" && f.kind !== "rig").map((f) => [f.id, f.severity, f.lock ?? "<<WRITE: lock>>"])));

  out.push("## 9. Appendix");
  if (rig.length) out.push(`**Faults in the rig itself** (not the game's): ${rig.map((f) => `${f.id} ${f.summary}`).join("; ")}`);
  out.push(`**Contamination audit.** ${d.audits?.length ? d.audits.join("; ") : "<<WRITE: audit result>>"}`);
  out.push("**Seeded defects** (how far to trust the silence): <<WRITE: found / missed, from the shakedown>>");
  return out.join("\n\n") + "\n";
}
