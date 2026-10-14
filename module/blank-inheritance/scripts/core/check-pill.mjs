/**
 * A check, where the prose asks for it (2026-10-05). Ingram: "When a scene includes a skill check we put it all into the
 * same pill shaped cartouche with the dice symbol ... I find a section of text which might say '... you could bluff or
 * intimidate your way out of here...' and the bluff or intimidate is a hyperlink in the pill which opens up a new
 * dialogue". The pill replaces the check card that sat under every beat; pressing it opens the check console
 * (core/check-console.mjs, foundry/check-console.mjs).
 *
 * WHERE THE PILL GOES, first that applies:
 *   1. An authored `<chk>words</chk>` in the beat's text: the pill carries those words ("bluff or intimidate").
 *   2. The words that ask for it, "the check" or "the knowledge check" ("offer the check"): the pill takes the place of
 *      "check" and its few words before it, and says the check's own ways ("Perception or Society check").
 *   3. Otherwise the end of the beat's text.
 *
 * Everything outside the pill is decorated exactly as before (core/inline-triggers.mjs), so trigger chips and emphasis
 * still work on either side of it. Pure: no Foundry, no DOM.
 */

import { escapeHtml } from "./inline-triggers.mjs";

const CHK_TAG = /<chk>([\s\S]*?)<\/chk>/i;
/** "the check", "the knowledge check", "the very hard knowledge check"; never "check-in". */
const CHECK_PHRASE = /\bthe\s+((?:[a-z]+\s+){0,3}?check)\b(?!-)/i;

/** Where the pill goes in one piece of text: the text before it, its own words (null: say the skills), the text after. */
export function findCheckSpot(text) {
  const source = String(text ?? "");
  const tag = CHK_TAG.exec(source);
  if (tag) {
    return {
      before: source.slice(0, tag.index),
      words: tag[1].trim() || null,
      after: source.slice(tag.index + tag[0].length),
      authored: true
    };
  }
  const phrase = CHECK_PHRASE.exec(source);
  if (phrase) {
    const start = phrase.index + phrase[0].length - phrase[1].length;
    return { before: source.slice(0, start), words: null, after: source.slice(start + phrase[1].length), authored: false };
  }
  return null;
}

/** Any `<chk>` tag left in a piece of text, taken out (its words kept): for a field that never carries the pill. */
export const stripCheckTags = (text) => String(text ?? "").replace(/<chk>([\s\S]*?)<\/chk>/gi, "$1");

/** The ways a check can be met, in words: "Perception or Society", "Deception, Diplomacy or Intimidation". */
export function waysInWords(labels = [], or = "or") {
  const list = labels.filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  return `${list.slice(0, -1).join(", ")} ${or} ${list[list.length - 1]}`;
}

const LIGHT_STATES = new Set(["waiting", "rolled", "criticalFailure", "failure", "success", "criticalSuccess"]);

/**
 * The pill itself: a die, the words, the DC (an eye struck through when it is rolled blind) and a small light for each
 * result in so far, in the bank's own colours (D062). One press opens the console on this check.
 *
 * @param o.key    which check it opens, as foundry/scene-runner.mjs reads it back (`beat:<id>` or `topic:<castId>:<index>`)
 * @param o.words  what it says, already decided (an authored phrase, or the ways plus "check")
 * @param o.dc     the DC, or null
 * @param o.blind  rolled blind
 * @param o.lights [{ state, name }] — each player's result so far
 * @param o.open   its console is open now
 * @param o.title  the check's own name, for the hover
 */
export function checkPillHtml({ key, words, dc = null, blind = false, lights = [], open = false, title = "", blindLabel = "Rolled blind" }) {
  const attr = (value) => escapeHtml(value).replace(/"/g, "&quot;");
  const lit = lights
    .filter((l) => LIGHT_STATES.has(l?.state))
    .map((l) => `<i class="bi-led-mini" data-state="${l.state}"${l.name ? ` title="${attr(l.name)}"` : ""}></i>`)
    .join("");
  const number = Number.isFinite(dc)
    ? `<span class="bi-chk__dc">${blind ? `<i class="fa-solid fa-eye-slash" aria-label="${attr(blindLabel)}"></i> ` : ""}${dc}</span>`
    : blind
      ? `<span class="bi-chk__dc"><i class="fa-solid fa-eye-slash" aria-label="${attr(blindLabel)}"></i></span>`
      : "";
  return (
    `<button type="button" class="bi-chk${open ? " is-open" : ""}" data-action="openCheck" data-check-key="${attr(key)}"` +
    `${title ? ` data-tooltip="${attr(title)}"` : ""}>` +
    `<span class="bi-chk__die" aria-hidden="true"><i class="fa-solid fa-dice-d20"></i></span>` +
    `<span class="bi-chk__words">${escapeHtml(words)}</span>${number}` +
    `${lit ? `<span class="bi-chk__lights">${lit}</span>` : ""}</button>`
  );
}

/**
 * One piece of text with the pill in it. `decorate` turns plain text into safe HTML and reports unknown trigger ids
 * (core/inline-triggers.mjs#decorateInlineTriggers, bound to the beat); `pill(words)` draws the pill with the words the
 * spot calls for. With no spot, the pill goes at the end when `append` is set, and not at all otherwise.
 *
 * @returns {{ html: string, unknownIds: string[], placed: boolean }}
 */
export function decorateWithCheck(text, decorate, pill, { append = true } = {}) {
  const spot = findCheckSpot(text);
  if (!spot) {
    const plain = decorate(String(text ?? ""));
    if (!append) return { html: plain.html, unknownIds: plain.unknownIds ?? [], placed: false };
    const glue = plain.html && !/\s$/.test(plain.html) ? " " : "";
    return { html: `${plain.html}${glue}${pill(null)}`, unknownIds: plain.unknownIds ?? [], placed: true };
  }
  const before = decorate(spot.before);
  const after = decorate(spot.after);
  return {
    html: `${before.html}${pill(spot.words)}${after.html}`,
    unknownIds: [...(before.unknownIds ?? []), ...(after.unknownIds ?? [])],
    placed: true
  };
}
