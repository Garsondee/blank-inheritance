/**
 * How a click becomes roll parameters — the pure half.
 *
 * This is a deliberate line-for-line reimplementation of sf2e's own
 * `eventToRollParams` (`gamesystems/sf2e/sf2e.mjs`, read 2026-09-06), because
 * that function is not exported anywhere we can reach — it is a module-private
 * helper inside the bundle. Copying four lines is the honest option; the
 * alternative is guessing at modifier-key behaviour and quietly diverging from
 * what every other button in the system does.
 *
 * The original, for comparison when checking this against a system upgrade:
 *
 *   function eventToRollParams(e, t) {
 *     let n = t.type === `check` ? `showCheckDialogs` : `showDamageDialogs`,
 *         r = !game.user.settings[n];
 *     if (!isRelevantEvent(e)) return { skipDialog: r };
 *     let i = { skipDialog: e.shiftKey ? !r : r };
 *     return (e.ctrlKey || e.metaKey) && (i.messageMode = game.user.isGM ? `gm` : `blind`), i;
 *   }
 */

import { isSafeSlug } from "./skills.mjs";

/**
 * sf2e's own guard: a real user event carries all three modifier flags.
 * Anything else (a synthetic call, a keyboard shortcut, undefined) is treated
 * as "no modifiers held" rather than as an error.
 */
export function isRelevantEvent(event) {
  return !!event && "ctrlKey" in event && "metaKey" in event && "shiftKey" in event;
}

/**
 * Roll parameters for a check, matching the character sheet exactly.
 *
 * `showCheckDialogs` is the user's own Foundry setting, so the default is
 * whatever they already chose; shift inverts it for one roll; ctrl/meta makes
 * the roll secret. Note the inversion is of the *setting*, not a fixed value —
 * a player who has dialogs turned off gets one WITH shift, and vice versa.
 *
 * Defaults to showing the dialog when the setting cannot be read: a dialog the
 * player can cancel is a recoverable surprise, a roll that already happened is
 * not.
 */
export function rollParamsFromEvent(event, { showCheckDialogs = true, isGM = false } = {}) {
  const skipByDefault = !showCheckDialogs;
  if (!isRelevantEvent(event)) return { skipDialog: skipByDefault };

  const params = { skipDialog: event.shiftKey ? !skipByDefault : skipByDefault };
  if (event.ctrlKey || event.metaKey) params.messageMode = isGM ? "gm" : "blind";
  return params;
}

/**
 * The fallback path: an `@Check[...]` enricher string to post as a message.
 *
 * Kept because the direct `Statistic#roll` call reaches into a bundled system
 * internal, whereas this syntax has 1,586 uses across the shipped compendium
 * packs and therefore cannot quietly disappear in a system update. Two clicks
 * instead of one, and it never breaks.
 *
 * The slug is validated rather than trusted: lore slugs derive from
 * player-created Items, and this string is handed to an enricher that parses
 * `|` and `]` as syntax. An unvalidated lore called `x|dc:1]@UUID[...]` would
 * be an injection into that parser.
 */
export function enricherFor({ slug, dc = null } = {}) {
  if (!isSafeSlug(slug)) throw new Error(`Refusing to build an enricher for unsafe slug ${JSON.stringify(slug)}.`);
  if (dc === null || dc === undefined) return `@Check[${slug}]`;
  if (!Number.isInteger(dc)) throw new Error(`A check DC must be a whole number, got ${JSON.stringify(dc)}.`);
  return `@Check[${slug}|dc:${dc}]`;
}
