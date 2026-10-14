/**
 * Turn the page's `look` result into the text an agent reads. Pure, so it is tested without a browser.
 *
 * The shape is chosen for a reader that has no eyes on the screen: where it is (seat, user, scene), then each window front to back with
 * the words it shows and every control by its ref, then the adventure's own always-on parts, then Foundry's own interface, then the
 * toasts and the last chat lines. A control below the fold of its window says so. Long lists are compressed and say how to see the rest.
 */

const STATE_SHOWN = new Set(["disabled", "checked", "on", "open", "closed", "read-only", "invalid", "focused"]);

function controlLine(c) {
  const states = c.state.filter((s) => STATE_SHOWN.has(s) || /^(value|chosen|at) /.test(s) || s === "empty");
  const label = c.label ? `"${c.label}"` : "(unlabelled)";
  const where = c.where === "scroll" ? " [below the fold: scroll]" : "";
  const context = c.context ? ` - in "${c.context}"` : "";
  return `  [${c.ref}] ${c.role} ${label}${states.length ? ` (${states.join(", ")})` : ""}${context}${where}`;
}

function groupBlock(g, { showText }) {
  const rect = g.rect ? ` at ${g.rect[0]},${g.rect[1]} ${g.rect[2]}x${g.rect[3]}` : "";
  const head = g.kind === "window" ? `WINDOW "${g.title}"${g.front ? " (front)" : ""}${rect}` : g.kind === "hud" ? `PART "${g.title}"${rect}` : `FOUNDRY ${g.title}${rect}`;
  const lines = [head];
  if (showText && g.text) lines.push(`  says: ${g.text}${g.textLength > g.text.length ? ` (… ${g.textLength - g.text.length} more characters)` : ""}`);
  for (const c of g.controls) lines.push(controlLine(c));
  if (g.hiddenControls) lines.push(`  … ${g.hiddenControls} more controls like these (look --all, or look --find "<words>")`);
  if (!g.controls.length && !g.text) lines.push("  (nothing to press here)");
  return lines.join("\n");
}

/**
 * @param {object} result  what look.js returned
 * @param {{seat:string, persona?:string, user?:string, noText?:boolean}} who
 */
export function formatLook(result, who) {
  const { meta, groups, toasts, chat } = result;
  const lines = [];
  const user = meta.user ? `${meta.user.name}${meta.user.gm ? " (GM)" : ""}${meta.user.character ? `, playing ${meta.user.character}` : ", no character yet"}` : who.user ?? "?";
  lines.push(`SEAT ${who.seat}${who.persona ? ` (${who.persona})` : ""} - ${user}`);
  lines.push(`screen ${meta.viewport[0]}x${meta.viewport[1]}${meta.zoom !== 1 ? ` at ${Math.round(meta.zoom * 100)}% zoom` : ""} - ${meta.scene ? `scene "${meta.scene.name}"` : "no scene shown"}${meta.ready ? "" : " - GAME NOT READY YET"}`);
  const windows = groups.filter((g) => g.kind === "window");
  const parts = groups.filter((g) => g.kind === "hud");
  const ui = groups.filter((g) => g.kind === "ui");
  if (toasts.length) lines.push("", `NOTICES: ${toasts.map((t) => `"${t}"`).join(" | ")}`);
  if (windows.length) lines.push("", ...windows.map((g) => groupBlock(g, { showText: !who.noText })));
  else lines.push("", "No windows are open.");
  if (parts.length) lines.push("", ...parts.map((g) => groupBlock(g, { showText: !who.noText })));
  if (ui.length) lines.push("", ...ui.map((g) => groupBlock(g, { showText: false })));
  if (chat.length) lines.push("", "CHAT (latest):", ...chat.map((c) => `  ${c}`));
  lines.push("", "(Anything drawn on the scene canvas, the stage and its cards, is not text: use `shot` to see it.)");
  return lines.join("\n");
}

/** Which refs does a look result offer, in order? For the hub to validate a click. */
export function refsOf(result) {
  return result.groups.flatMap((g) => g.controls.map((c) => c.ref));
}

/** Find controls by their words: exact, then starts-with, then contains (case-insensitive), front window first. */
export function findControls(result, words) {
  const needle = String(words).trim().toLowerCase();
  const all = result.groups.flatMap((g) => g.controls.map((c) => ({ ...c, group: g.title })));
  for (const test of [(l) => l === needle, (l) => l.startsWith(needle), (l) => l.includes(needle)]) {
    const hits = all.filter((c) => test(c.label.toLowerCase()));
    if (hits.length) return hits;
  }
  return [];
}
