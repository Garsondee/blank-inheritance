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
 * Whether a plain click on the CONSOLE shows sf2e's roll-modifiers dialog:
 * no.
 *
 * The sheet's own default is the opposite — `UserPF2e#prepareBaseData` in
 * `gamesystems/sf2e/sf2e.mjs` sets `showCheckDialogs: true` for every user,
 * verified 2026-09-07 (test/tier3-roll-contract.test.mjs pins this). That
 * dialog is a real, un-owned `Application` at `--z-index-window` (100) —
 * comfortably above our bar — and it defaults to vertical-centering on the
 * viewport (`application-v1.mjs`'s `setPosition`), which on anything but a
 * tall window reaches down into our bar's fixed bottom band. Found live: a
 * console whose entire purpose is one-click rolling should not force that
 * dialog open on every single click regardless of where it lands, so the
 * console feeds `rollParamsFromEvent` this constant instead of the user's
 * real setting.
 *
 * Shift still reaches it. `rollParamsFromEvent` inverts around whatever
 * "setting" it is given, so a plain click skips and shift shows — the exact
 * mechanism the sheet uses, aimed at the opposite baseline. On the Director's
 * bar shift already means "post this as an inline check for someone else to
 * roll" (see foundry/director-bar.mjs), consumed before a roll ever reaches
 * here, so the two meanings never collide.
 */
export const CONSOLE_SHOWS_DIALOG_BY_DEFAULT = false;

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
 * The one lever left for skipping a STRIKE's own roll dialog.
 *
 * Found live 2026-09-17: unlike `Statistic#roll`, a strike variant's own
 * `roll({event, ...})` wrapper builds a fresh options object for the
 * underlying `Check.roll` call and never forwards a caller's `skipDialog`
 * into it — passing `{event, skipDialog: true}` is silently ignored, and a
 * console button calling it that way just opens an unanswered dialog.
 * `Check.roll` DOES still read the event, but only to re-derive
 * `skipDialog` itself via this same `eventToRollParams`-shaped formula
 * (`skipDialog = event.shiftKey ? !r : r`, `r = !game.user.settings.showCheckDialogs`)
 * — using the REAL live user setting, not this console's own
 * CONSOLE_SHOWS_DIALOG_BY_DEFAULT. So the only way left to force a
 * particular outcome is choosing the right `shiftKey` for a synthetic
 * event, solved for here rather than left for a caller to re-derive badly:
 * given the formula above, `shiftKey = (baselineSkip !== desiredSkipDialog)`
 * makes `skipDialog` land on `desiredSkipDialog` regardless of what the
 * real setting currently is.
 */
export function strikeEventShiftKeyFor(desiredSkipDialog, realShowCheckDialogs) {
  const baselineSkip = !realShowCheckDialogs;
  return baselineSkip !== desiredSkipDialog;
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
