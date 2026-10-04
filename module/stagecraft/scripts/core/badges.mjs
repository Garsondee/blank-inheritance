/**
 * Badges: the little labels on a card's face that say what is the matter with its person (Frightened 2, Prone, Dying 1). The
 * caller decides what they say; Stagecraft only keeps them short, few and in order. Pure: no Foundry, no DOM.
 */

export const MAX_BADGES = 4;
export const MAX_BADGE_LENGTH = 16;

const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const graphemes = (s) => (seg ? [...seg.segment(s)].map((g) => g.segment) : [...s]);

/** One badge's words, trimmed and cut to a length that fits a pill (an ellipsis shows it was cut). */
export function badgeText(value) {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  const g = graphemes(s);
  return g.length <= MAX_BADGE_LENGTH ? s : `${g.slice(0, MAX_BADGE_LENGTH - 1).join("")}\u{2026}`;
}

/** A list of badges as a card may carry it: text only, empty and repeated ones dropped, at most MAX_BADGES. */
export function cleanBadges(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const v of list) {
    const t = badgeText(typeof v === "string" || typeof v === "number" ? v : v?.label);
    if (t && !out.includes(t)) out.push(t);
    if (out.length === MAX_BADGES) break;
  }
  return out;
}

/** Whether two lists of badges would read the same. */
export const sameBadges = (a, b) => JSON.stringify(cleanBadges(a)) === JSON.stringify(cleanBadges(b));
