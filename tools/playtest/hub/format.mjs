/**
 * Text for the operator: the status board and the findings list, as the CLI prints them. Pure.
 */

import { SEVERITIES } from "../core/findings.mjs";

const pad = (s, n) => String(s ?? "").padEnd(n).slice(0, n);

export function formatStatus(status) {
  const lines = [];
  if (!status.run) {
    lines.push(`No run in progress. Foundry (playtest): ${status.foundry?.up ? `up, world ${status.foundry.world ?? "?"}` : "NOT running"}.`);
    return lines.join("\n");
  }
  lines.push(`RUN ${status.run.name}  seed ${status.run.seed}  started ${status.run.startedAt}${status.run.paused ? `  ** PAUSED: ${status.run.paused} **` : ""}`);
  lines.push(`Foundry ${status.foundry?.up ? `up (${status.foundry.usersActive ?? "?"} connected)` : "DOWN"}  Runner at ${status.run.brief ?? "(no scene)"}`);
  lines.push("");
  lines.push(`${pad("seat", 5)}${pad("user", 14)}${pad("brain", 10)}${pad("persona", 16)}${pad("state", 9)}${pad("character", 20)}${pad("acts", 6)}${pad("errs", 5)}scene`);
  for (const s of status.seats) lines.push(`${pad(s.id, 5)}${pad(s.user, 14)}${pad(s.brain === "bot" ? `bot` : s.brain, 10)}${pad(s.persona ?? "", 16)}${pad(s.state, 9)}${pad(s.character ?? "-", 20)}${pad(s.actions, 6)}${pad(s.errors, 5)}${s.scene ?? "-"}`);
  const f = status.findings?.tally;
  if (f) lines.push("", `Findings ${f.total}: ${SEVERITIES.map((s) => `${s} ${f.bySeverity[s]}`).join("  ")}${f.rig ? `  (+${f.rig} rig)` : ""}`);
  if (status.dice) lines.push(`Dice ${status.dice.rolls} rolls (${status.dice.forced} forced)`);
  if (status.events?.length) {
    lines.push("", "Latest notable events:");
    for (const e of status.events.slice(0, 6)) lines.push(`  ${e.severity} ${e.seat} ${e.category}: ${String(e.text ?? e.message ?? e.url ?? (e.durationMs ? e.durationMs + " ms" : "")).slice(0, 110)}`);
  }
  return lines.join("\n");
}

export function formatFinding(f) {
  const where = [f.seat, f.scene, f.beat].filter(Boolean).join(" / ");
  return `${f.id} ${f.severity} ${f.kind}${f.occurrences > 1 ? ` x${f.occurrences}` : ""} [${f.channel}${where ? ` ${where}` : ""}${f.seats?.length > 1 ? ` seats ${f.seats.join(",")}` : ""}] ${f.summary}`;
}

export function formatFindings(findings, { limit = 60 } = {}) {
  if (!findings.length) return "No findings yet.";
  const shown = findings.slice(-limit);
  return `${shown.length < findings.length ? `(latest ${shown.length} of ${findings.length})\n` : ""}${shown.map(formatFinding).join("\n")}`;
}
