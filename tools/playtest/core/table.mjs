/**
 * The table channel: what is SAID at the table, kept apart from Foundry's chat (design/playtest-process.md, section 4).
 *
 * A real table talks aloud; here that talk is a list of entries the hub keeps. It is deliberately not Foundry's chat: chat carries
 * rolls and whispers the module reads (the Runner reads old rolls from it, the log exports it), and a run's speech must not feed those.
 *
 * The rule that matters most is visibility, because it is what keeps the minds separate. A player's `read` can never return a GM-private
 * entry or a whisper they are not part of; the staff seats (orchestrator, scribe, auditor) see everything. test/playtest/table.test.mjs
 * holds it, including a canary: a GM-private entry carrying a secret string is never in any player's output.
 *
 * Pure. The hub persists entries to table.jsonl; nothing here touches a file.
 */

/** Entry kinds. `private` is the GM's own thinking aloud to the log, never shown to a player. */
export const KINDS = ["say", "do", "gm", "ruling", "system", "whisper", "private", "ooc"];

/** Seats that see the whole table, whisper and private entries included. They never play. */
export const STAFF = new Set(["ORCH", "SCRIBE", "AUDIT"]);

/**
 * Build the next entry. `n` is its place in the table (1-based), `now` an ISO time. A whisper needs recipients; only a whisper has them.
 * @returns {{ok:true, entry:object}|{ok:false, error:string}}
 */
export function makeEntry({ seat, kind, text, to = null, who = null, meta = null }, { n, now }) {
  if (!KINDS.includes(kind)) return { ok: false, error: `unknown kind ${JSON.stringify(kind)} (one of ${KINDS.join(", ")})` };
  const body = typeof text === "string" ? text.trim() : "";
  if (!body) return { ok: false, error: "nothing to say" };
  if (body.length > 4000) return { ok: false, error: "too long for one entry (4000 characters)" };
  const recipients = Array.isArray(to) ? [...new Set(to.filter(Boolean))] : to ? [to] : [];
  if (kind === "whisper" && !recipients.length) return { ok: false, error: "a whisper needs someone to whisper to" };
  if (kind !== "whisper" && recipients.length) return { ok: false, error: `only a whisper has recipients (got ${kind} with to)` };
  return { ok: true, entry: { n, t: now, seat, who: who ?? seat, kind, to: recipients.length ? recipients : null, text: body, meta } };
}

/** May this viewer see this entry? */
export function visibleTo(entry, viewer) {
  if (STAFF.has(viewer)) return true;
  if (entry.kind === "private") return entry.seat === viewer;
  if (entry.kind === "whisper") return entry.seat === viewer || (entry.to ?? []).includes(viewer);
  return true;
}

/** Entries after `since` that `viewer` may see, oldest first, at most `limit` (the latest ones when there are more). */
export function readFor(entries, viewer, { since = 0, limit = 60 } = {}) {
  const visible = entries.filter((e) => e.n > since && visibleTo(e, viewer));
  const skipped = Math.max(0, visible.length - limit);
  const shown = skipped ? visible.slice(visible.length - limit) : visible;
  return { entries: shown, skipped, last: entries.length ? entries[entries.length - 1].n : since };
}

/** One entry as a line of text, the way an agent reads it. */
export function render(entry) {
  const who = entry.who && entry.who !== entry.seat ? `${entry.who} (${entry.seat})` : entry.seat;
  switch (entry.kind) {
    case "say": return `[${entry.n}] ${who} says: ${entry.text}`;
    case "do": return `[${entry.n}] ${who} ${entry.text}`;
    case "gm": return `[${entry.n}] GM: ${entry.text}`;
    case "ruling": return `[${entry.n}] GM (ruling): ${entry.text}`;
    case "system": return `[${entry.n}] * ${entry.text}`;
    case "whisper": return `[${entry.n}] ${who} whispers to ${(entry.to ?? []).join(", ")}: ${entry.text}`;
    case "private": return `[${entry.n}] (GM-private) ${entry.text}`;
    case "ooc": return `[${entry.n}] ${who} (out of character): ${entry.text}`;
    default: return `[${entry.n}] ${who}: ${entry.text}`;
  }
}

/** Entries as text, trimmed from the front to fit `maxChars`, saying how many were left out. */
export function renderMany(entries, { maxChars = 8000 } = {}) {
  const lines = entries.map(render);
  let total = 0;
  let from = lines.length;
  while (from > 0 && total + lines[from - 1].length + 1 <= maxChars) {
    total += lines[from - 1].length + 1;
    from--;
  }
  const left = from;
  return (left ? `(${left} earlier entr${left === 1 ? "y" : "ies"} not shown)\n` : "") + lines.slice(from).join("\n");
}
