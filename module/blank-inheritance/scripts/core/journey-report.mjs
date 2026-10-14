/**
 * A journey analysis as plain text (design/location-editor.md section 16): what the Location Editor's "Copy report" key puts on the clipboard for the chat, and
 * what `npm run journeys` prints. One function, so the words the GM pastes and the words the terminal shows can never disagree.
 *
 * Written to be read by a person AND acted on by Claude: every problem names the scene, the slot it is about (the key `core/siting.mjs` addresses it by) and what
 * would help, so a pasted report is enough to say "fix the three warnings".
 */

import { formatMetres, formatMinutes, legBadge } from "./journey-checks.mjs";

const SEVERITY_ORDER = ["error", "warn", "info"];
const SEVERITY_WORD = Object.freeze({ error: "Errors", warn: "Warnings", info: "Notes" });
const VERDICT_WORD = Object.freeze({ continuous: "continuous: the party can walk every journey", attention: "needs attention", broken: "broken: the party cannot complete it" });

const seconds = (s) => (s >= 90 ? `${Math.floor(s / 60)} min ${Math.round(s % 60)} s` : `${Math.max(1, Math.round(s))} s`);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "12 scenes · 29 journeys (27 routed, 1 at one place) · 0 errors · 1 warning · 11 notes": the count line under an episode's name. */
export function summaryLine(s) {
  const routed = `${s.routed} routed${s.same ? `, ${s.same} at one place` : ""}${s.offmap ? `, ${s.offmap} off the map` : ""}`;
  return `${plural(s.scenes, "scene")} · ${plural(s.legs, "journey")} (${routed}) · ${plural(s.errors, "error")} · ${plural(s.warns, "warning")} · ${plural(s.infos, "note")}`;
}

/** The main road (the scene-to-scene cuts) in words, or null when there is none to walk. */
export function mainRoadLine(s) {
  if (!s.main?.legs) return null;
  return `${plural(s.main.legs, "journey")} · ${formatMetres(s.main.metres)} · ${seconds(s.main.seconds)} to watch · about ${formatMinutes(s.main.realMinutes)} in the story`;
}

/**
 * @param world   `{ story, model, analysis }` (core/siting.mjs#buildStory, core/journey.mjs#buildJourneyModel, core/journey-checks.mjs#analyseJourneys)
 * @param options `{ groupId, notes, legs }`: one episode (default: all), whether to list the notes (default: just counted), whether to list every leg
 * @returns the report text, and `{ errors, warns, infos }` for whoever wants an exit code
 */
export function formatJourneyReport({ story, model, analysis }, { groupId = null, notes = false, legs = false } = {}) {
  const lines = [];
  const totals = { errors: 0, warns: 0, infos: 0 };
  const rowTitle = new Map();
  for (const group of story?.groups ?? []) for (const row of group.rows) rowTitle.set(row.key, row.title);
  const groups = model.groups.filter((g) => !groupId || g.id === groupId);

  for (const group of groups) {
    const summary = analysis.groups.find((g) => g.id === group.id);
    if (!summary) continue;
    totals.errors += summary.errors;
    totals.warns += summary.warns;
    totals.infos += summary.infos;
    lines.push(`# Journeys: ${group.title}`);
    lines.push(`Verdict: ${VERDICT_WORD[summary.verdict] ?? summary.verdict}`);
    lines.push(summaryLine(summary));
    if (summary.unplaced) lines.push(`${summary.unplaced} scene${summary.unplaced === 1 ? " has" : "s have"} no place yet.`);
    if (mainRoadLine(summary)) lines.push(`Main road (scene to scene): ${mainRoadLine(summary)}`);
    if (summary.optionLegs) lines.push(`Players' choices add ${plural(summary.optionLegs, "more journey", "more journeys")}, one per option.`);

    for (const severity of SEVERITY_ORDER) {
      if (severity === "info" && !notes) continue;
      const found = analysis.issues.filter((i) => i.groupId === group.id && i.severity === severity);
      if (!found.length) continue;
      lines.push("", `## ${SEVERITY_WORD[severity]} (${found.length})`);
      for (const issue of found) {
        lines.push(`- [${issue.id}] ${issue.text}`);
        const where = [rowTitle.get(issue.rowKey) ? `scene "${rowTitle.get(issue.rowKey)}"` : null, issue.slotKey ? `slot ${issue.slotKey}` : null].filter(Boolean).join(" · ");
        if (where) lines.push(`    where: ${where}`);
        if (issue.hint) lines.push(`    try: ${issue.hint}`);
      }
    }
    if (!notes && summary.infos) lines.push("", `(${plural(summary.infos, "note")} not listed; ask for them with --notes)`);

    if (legs) {
      lines.push("", "## Every journey, in play order");
      group.legs.forEach((leg, i) => {
        const result = analysis.legs.get(leg.id);
        const badge = legBadge(result);
        const detail = badge.status === "routed" ? [badge.distance, badge.time, badge.modes].filter(Boolean).join(" · ") : badge.status;
        lines.push(`${String(i + 1).padStart(2)}. ${leg.label}  [${leg.kind}]  ${detail}${badge.worst ? `  (${badge.worst})` : ""}`);
      });
    }
    lines.push("");
  }
  return { text: lines.join("\n").replace(/\n+$/, "\n"), ...totals };
}
