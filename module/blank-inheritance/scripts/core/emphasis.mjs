/**
 * Minimal emphasis for authored GM-facing prose — `**bold**` and `*italic*`,
 * and nothing else.
 *
 * WHY THIS EXISTS. `design/gm-facing-prose-style.md` §8 rule 9 sanctions a bold
 * span in a scene brief: "One bold span per field at most, reserved for an
 * instruction that breaks the scene if missed." The corpus took that at its word
 * and now holds 80 of them across 16 files. Nothing rendered any of it. Every
 * `direction` and `note` reached the GM's screen through a double-stache
 * (`{{direction}}`), and `text`/`readAloud` through `escapeHtml`, so a GM
 * skimming a beat mid-scene saw literal asterisks around the one instruction the
 * author had marked as the one that must not be missed.
 *
 * SAFETY. This runs on text that has ALREADY been HTML-escaped, and it emits
 * only `<strong>` and `<em>`. It cannot introduce an attribute, a tag name, a
 * URL or an event handler, because by the time it sees the string every `<`, `>`
 * and `&` is already an entity. That ordering is the whole security argument and
 * `applyEmphasis` must never be called on raw authored text -- see the test.
 *
 * SCOPE. Deliberately not a Markdown renderer. No links, no headings, no lists,
 * no code spans. The corpus does not use them, `notes` uses ALL-CAPS labels
 * rather than headings by house style, and every feature added here is a feature
 * a GM could trip over at speed.
 *
 * Pure module: no Foundry globals. See design/testing-strategy.md §1.
 */

// Bold first: `**x**` would otherwise be read as an empty italic wrapping `*x*`.
// Both are non-greedy, both refuse to span a blank line (a run of asterisks in
// two different paragraphs is a typo, not an emphasis pair), and both require a
// non-space, non-asterisk character at each inner edge so that a literal
// asterisk used as a bullet or a footnote marker is left alone.
const BOLD = /\*\*(?!\s)((?:(?!\*\*)[^\n])+?)(?<!\s)\*\*/g;
const ITALIC = /(?<!\*)\*(?!\s|\*)((?:[^*\n])+?)(?<!\s)\*(?!\*)/g;

/**
 * Converts emphasis markers in ALREADY-ESCAPED html to `<strong>`/`<em>`.
 *
 * @param {string} escapedHtml text that has already been through escapeHtml
 * @returns {string} the same text with emphasis markers replaced
 */
export function applyEmphasis(escapedHtml) {
  return String(escapedHtml ?? "")
    .replace(BOLD, "<strong>$1</strong>")
    .replace(ITALIC, "<em>$1</em>");
}

/** True if `text` contains anything applyEmphasis would change. */
export function hasEmphasis(text) {
  const s = String(text ?? "");
  BOLD.lastIndex = 0;
  ITALIC.lastIndex = 0;
  return BOLD.test(s) || ITALIC.test(s);
}

/**
 * Escape-then-emphasise, for a plain-prose field going straight into a
 * triple-stache. The only correct order: escaping after emphasis would eat the
 * tags this just added.
 *
 * @param {string} text raw authored prose
 * @param {(s: string) => string} escapeHtml the caller's own escaper, passed in
 *   so this module stays free of a second copy of it
 */
export function renderProse(text, escapeHtml) {
  return applyEmphasis(escapeHtml(String(text ?? "")));
}
