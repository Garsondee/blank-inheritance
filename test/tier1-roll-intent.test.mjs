// Tier 1 — turning a click into roll parameters.
//
// This module is a line-for-line reimplementation of a function that lives
// inside sf2e's bundle and is not exported (`eventToRollParams`). The reason
// to test it this hard is that the failure mode is silent: a wrong inversion
// here means the console's buttons behave subtly differently from the same
// buttons on the character sheet, which nobody reports as a bug — they just
// stop trusting the console.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CONSOLE_SHOWS_DIALOG_BY_DEFAULT,
  enricherFor,
  isRelevantEvent,
  rollParamsFromEvent
} from "../module/blank-inheritance/scripts/core/roll-intent.mjs";

/** A click event carries all three modifier flags; that is sf2e's own test. */
function click({ shift = false, ctrl = false, meta = false } = {}) {
  return { shiftKey: shift, ctrlKey: ctrl, metaKey: meta };
}

test("only an object carrying all three modifier flags counts as a real event", () => {
  assert.equal(isRelevantEvent(click()), true);
  assert.equal(isRelevantEvent(null), false);
  assert.equal(isRelevantEvent(undefined), false);
  assert.equal(isRelevantEvent({}), false);
  assert.equal(isRelevantEvent({ shiftKey: false }), false);
  assert.equal(isRelevantEvent({ shiftKey: false, ctrlKey: false }), false, "metaKey missing");
});

test("with dialogs ON, a plain click shows the dialog and shift skips it", () => {
  const on = { showCheckDialogs: true };
  assert.deepEqual(rollParamsFromEvent(click(), on), { skipDialog: false });
  assert.deepEqual(rollParamsFromEvent(click({ shift: true }), on), { skipDialog: true });
});

test("with dialogs OFF, a plain click skips and shift brings the dialog BACK", () => {
  // The inversion is of the player's own setting, not of a fixed value. A
  // player who turned dialogs off still needs a way to reach one for the roll
  // where the DC matters.
  const off = { showCheckDialogs: false };
  assert.deepEqual(rollParamsFromEvent(click(), off), { skipDialog: true });
  assert.deepEqual(rollParamsFromEvent(click({ shift: true }), off), { skipDialog: false });
});

test("a non-event uses the setting and never reads modifiers", () => {
  assert.deepEqual(rollParamsFromEvent(null, { showCheckDialogs: true }), { skipDialog: false });
  assert.deepEqual(rollParamsFromEvent(undefined, { showCheckDialogs: false }), { skipDialog: true });
});

test("ctrl or meta makes the roll secret, and who it hides from depends on the seat", () => {
  const on = { showCheckDialogs: true };
  assert.deepEqual(rollParamsFromEvent(click({ ctrl: true }), on), { skipDialog: false, messageMode: "blind" });
  assert.deepEqual(rollParamsFromEvent(click({ meta: true }), on), { skipDialog: false, messageMode: "blind" });
  assert.deepEqual(
    rollParamsFromEvent(click({ ctrl: true }), { ...on, isGM: true }),
    { skipDialog: false, messageMode: "gm" }
  );
});

test("shift and ctrl compose", () => {
  assert.deepEqual(
    rollParamsFromEvent(click({ shift: true, ctrl: true }), { showCheckDialogs: true, isGM: true }),
    { skipDialog: true, messageMode: "gm" }
  );
});

test("an unreadable setting defaults to SHOWING the dialog", () => {
  // A dialog the player can cancel is a recoverable surprise; a roll that has
  // already happened is not.
  assert.deepEqual(rollParamsFromEvent(click(), {}), { skipDialog: false });
  assert.deepEqual(rollParamsFromEvent(click()), { skipDialog: false });
});

test("messageMode is absent, not undefined, when no modifier is held", () => {
  // deepEqual would pass either way; the console reads this object straight
  // into sf2e, so an explicit undefined key is a different thing to send.
  assert.equal("messageMode" in rollParamsFromEvent(click(), { showCheckDialogs: true }), false);
});

/* ---------------------------------------------------------------- */
/*  The enricher fallback                                            */
/* ---------------------------------------------------------------- */

test("enricherFor builds the documented @Check syntax", () => {
  assert.equal(enricherFor({ slug: "computers" }), "@Check[computers]");
  assert.equal(enricherFor({ slug: "computers", dc: 18 }), "@Check[computers|dc:18]");
  assert.equal(enricherFor({ slug: "warfare-lore", dc: 20 }), "@Check[warfare-lore|dc:20]");
});

test("enricherFor refuses a slug that would break out of the enricher", () => {
  // Lore slugs derive from player-created Items and this string is handed to a
  // parser that treats | and ] as syntax.
  assert.throws(() => enricherFor({ slug: "x|dc:1]@UUID[Actor.evil]" }), /unsafe slug/);
  assert.throws(() => enricherFor({ slug: "has space" }), /unsafe slug/);
  assert.throws(() => enricherFor({ slug: "Capitals" }), /unsafe slug/);
  assert.throws(() => enricherFor({ slug: "" }), /unsafe slug/);
  assert.throws(() => enricherFor({ slug: null }), /unsafe slug/);
  assert.throws(() => enricherFor({}), /unsafe slug/);
});

test("enricherFor refuses a non-integer DC rather than emitting nonsense", () => {
  assert.throws(() => enricherFor({ slug: "athletics", dc: "18" }), /whole number/);
  assert.throws(() => enricherFor({ slug: "athletics", dc: 18.5 }), /whole number/);
});

/* ---------------------------------------------------------------- */
/*  The console's own dialog default                                 */
/* ---------------------------------------------------------------- */

test("the console defaults to NOT showing sf2e's roll dialog — the opposite of the sheet", () => {
  // sf2e's own default is true (UserPF2e#prepareBaseData, tier3-roll-contract
  // pins it). Found live 2026-09-07: that dialog is a real, un-owned popup
  // that defaults to vertical-centering and can land on top of our fixed
  // bottom bar, so a console whose entire point is one-click rolling should
  // not force it open on every click. If this ever flips back to true,
  // every plain click on the console reopens that dialog.
  assert.equal(CONSOLE_SHOWS_DIALOG_BY_DEFAULT, false);
});

test("wired through rollParamsFromEvent: a plain console click skips the dialog, shift shows it", () => {
  const opts = { showCheckDialogs: CONSOLE_SHOWS_DIALOG_BY_DEFAULT };
  assert.deepEqual(rollParamsFromEvent(click(), opts), { skipDialog: true });
  assert.deepEqual(rollParamsFromEvent(click({ shift: true }), opts), { skipDialog: false });
});
