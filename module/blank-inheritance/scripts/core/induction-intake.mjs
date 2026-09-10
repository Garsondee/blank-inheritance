/**
 * Pure logic for the induction terminal's Pages 7-8 (design/induction-terminal.md
 * §4): the suggestion-chip + free-text pattern shared by every RP-response
 * field (pronouns, gender identity, appearance, the banal texture questions,
 * and bible §20's eight core questions), plus the separate multi-value
 * language tag list. No new chargen math here -- Page 7's languages map
 * straight onto tools/character-builder/derive.mjs's existing input shape
 * with zero transformation; everything else is narrative record-keeping,
 * never mechanical.
 *
 * Suggestion content itself is illustrative only, never a real answer for
 * any of the six actual kids -- see data/campaign/induction-intake-prompts.json's
 * own description and data/characters/kids/README.md.
 */

/**
 * Insert a suggestion into a field's current text. An empty/whitespace-only
 * field is SET directly; a field with real content gets the suggestion
 * APPENDED with `separator` -- so clicking several chips in a row builds up
 * an answer instead of overwriting the last one. This is the whole point of
 * the pattern: "make it easy to generate something without much effort"
 * without ever discarding what a player already wrote.
 */
export function insertSuggestion(current, suggestion, separator = ", ") {
  const trimmed = (current ?? "").trim();
  if (!trimmed) return suggestion;
  return `${trimmed}${separator}${suggestion}`;
}

/** Page 7's only required field. Whitespace-only doesn't count as a name. */
export function isFinishingComplete(finishing) {
  return Boolean((finishing?.name ?? "").trim());
}

/** Case-insensitive identity for language matching -- "Common" and "common" are the same entry. */
function languageKey(label) {
  return (label ?? "").trim().toLowerCase();
}

/**
 * Add a language if it isn't blank and isn't already present
 * (case-insensitive). Returns a NEW array -- same immutable-update idiom as
 * induction-ancestry.mjs's #setFreePick, since the template's {{#each}}
 * reads this array directly across renders.
 */
export function addLanguage(languages, entry) {
  const trimmed = (entry ?? "").trim();
  if (!trimmed) return languages;
  const key = languageKey(trimmed);
  if (languages.some((l) => languageKey(l) === key)) return languages;
  return [...languages, trimmed];
}

/** Remove a language by case-insensitive match. A no-op if it isn't present. */
export function removeLanguage(languages, entry) {
  const key = languageKey(entry);
  return languages.filter((l) => languageKey(l) !== key);
}

/**
 * Suggestion chips for the language widget: whichever languages the
 * character's own chosen ancestry already grants (Page 2's selection, read
 * first so they surface before the generic list), then the curated common
 * list -- deduped against each other, and each flagged `alreadyAdded`
 * against the character's current picks so the template can grey out a chip
 * rather than let it add a duplicate.
 */
export function buildLanguageSuggestions(ancestryLanguages, curated, current) {
  const seen = new Set();
  const suggestions = [];
  for (const label of [...(ancestryLanguages ?? []), ...(curated ?? [])]) {
    const key = languageKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    suggestions.push({ label, alreadyAdded: (current ?? []).some((l) => languageKey(l) === key) });
  }
  return suggestions;
}

/**
 * Read a dotted path ("finishing.pronouns", "intake.questions.q1") off a
 * plain object. A missing segment reads as "" (not undefined) so a template
 * value binding never has to null-guard.
 */
export function getPath(obj, path) {
  const value = path.split(".").reduce((node, key) => (node == null ? undefined : node[key]), obj);
  return value ?? "";
}

/**
 * Write a dotted path, creating intermediate plain objects as needed.
 * Mutates `obj` in place -- state.finishing/state.intake are fresh
 * sub-objects owned by this application instance, not shared or read by
 * identity across renders, so a scalar leaf write here is the same idiom
 * #bindFilter already uses for state.ancestry.filter. (The ancestry picks
 * arrays are reassigned immutably instead, because those ARE iterated by
 * identity in a template {{#each}} across renders -- a different case.)
 */
export function setPath(obj, path, value) {
  const segments = path.split(".");
  const last = segments.pop();
  const target = segments.reduce((node, key) => {
    if (node[key] == null || typeof node[key] !== "object") node[key] = {};
    return node[key];
  }, obj);
  target[last] = value;
}
