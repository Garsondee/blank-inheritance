/**
 * A beat's note as labelled lines (design/gm-facing-prose-style.md §0, D056).
 *
 * A note is written as a few lines, each starting with one of five labels: `Do`, `Plant`, `Secret`,
 * `Watch for`, or `If <condition>`. The Scene Runner lays them out as a list, label beside line, with a
 * Secret line marked so it is never read aloud by mistake. A note that isn't entirely labelled lines is
 * returned as null, and the Runner shows it as ordinary paragraphs instead.
 *
 * Pure module: no Foundry globals (design/testing-strategy.md §1).
 */

export const NOTE_LABELS = Object.freeze(["Do", "Plant", "Secret", "Watch for"]);

const LINE = /^([^:]{1,90}):\s+(\S[\s\S]*)$/;

/**
 * The kind of one labelled line, or null if the line has no recognised label.
 * @param {string} label the text before the first colon
 * @returns {"do"|"plant"|"secret"|"watch-for"|"if"|null}
 */
export function labelKind(label) {
  const l = String(label ?? "").trim();
  if (NOTE_LABELS.includes(l)) return l.toLowerCase().replace(/\s+/g, "-");
  if (/^If\s\S/.test(l)) return "if";
  return null;
}

/**
 * Splits a note into labelled lines.
 * @param {string|null|undefined} note
 * @returns {Array<{label: string, kind: string, text: string}>|null} null unless every non-empty line is labelled
 */
export function parseNoteLines(note) {
  const lines = String(note ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const out = [];
  for (const line of lines) {
    const m = line.match(LINE);
    if (!m) return null;
    const kind = labelKind(m[1]);
    if (!kind) return null;
    out.push({ label: m[1].trim(), kind, text: m[2].trim() });
  }
  return out;
}
