/**
 * The Director's log — the pure half.
 *
 * design/ux-doctrine.md §10.3 and Law 15: running the session and recording it
 * are ONE act. The GM types the meaning; the console attaches the context. So
 * everything here is about turning a typed line plus ambient state into a
 * durable entry, and nothing here asks the GM to fill in a form.
 *
 * Ingram's exact framing, which the tag handling below is built to respect:
 * tags are "an optional accelerator via a leading token, NEVER a required
 * form — if they ever feel like a form they have failed."
 */

/**
 * The entry kinds the doctrine names. A leading `word:` matching one of these
 * is lifted into a tag; anything else stays part of the text, including a
 * colon the GM meant literally.
 */
export const LOG_TAGS = Object.freeze([
  "decision",
  "reaction",
  "thread",
  "anchor",
  "setup",
  "npc",
  "rule"
]);

/**
 * Split an optional leading tag off a typed line.
 *
 * Deliberately conservative: only a recognised word, only at the start, only
 * followed by a colon. "npc: the caretaker lies" is tagged; "note: whatever"
 * is not, and neither is "10:32 he finally asked" — because a GM typing fast
 * must never have their sentence silently eaten by a parser being clever.
 */
export function parseLogLine(raw) {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return { tag: null, text: "" };

  const match = text.match(/^([a-z]+):\s*(.*)$/i);
  if (!match) return { tag: null, text };

  const candidate = match[1].toLowerCase();
  if (!LOG_TAGS.includes(candidate)) return { tag: null, text };

  const remainder = match[2].trim();
  // "npc:" with nothing after it is a typo, not a tagged empty entry.
  if (!remainder) return { tag: null, text };

  return { tag: candidate, text: remainder };
}

/**
 * Build the durable record.
 *
 * `at` is passed in rather than read from a clock so this stays pure and
 * testable. Context is attached wholesale because the expensive thing to
 * recover later is not what the GM typed, it is what was happening when they
 * typed it — and only the console knows that at the moment of typing.
 */
export function stampEntry({ text, at, scene = null, mode = null, subject = null, author = null } = {}) {
  const parsed = parseLogLine(text);
  if (!parsed.text) return null;

  return {
    at,
    tag: parsed.tag,
    text: parsed.text,
    context: { scene, mode, subject, author }
  };
}

/**
 * Append an entry to a session's records.
 *
 * Returns a NEW array rather than mutating: the caller holds the buffer that
 * gets written to disk, and an accidental in-place mutation of something a
 * failed write still needs to retry is exactly the bug that loses a GM's notes.
 */
export function appendEntry(entries = [], entry) {
  if (!entry) return entries;
  return [...entries, entry];
}

/**
 * The filename a session's log lives under, derived from its date.
 *
 * One file per real-world day rather than per session: a session has no
 * machine-detectable start or end, and a GM who reloads mid-evening must land
 * back in the same file rather than starting a second one.
 */
export function sessionFileName(isoTimestamp) {
  const day = String(isoTimestamp ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    throw new Error(`Expected an ISO timestamp to derive a session file from, got ${JSON.stringify(isoTimestamp)}.`);
  }
  return `${day}.json`;
}
