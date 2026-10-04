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
  checkLabel,
  checkSkills,
  enricherFor,
  enrichersFor,
  isRelevantEvent,
  rollParamsFromEvent,
  strikeEventShiftKeyFor
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
/*  enrichersFor -- every listed skill, not just the first           */
/* ---------------------------------------------------------------- */

test("enrichersFor posts every skill option as its own real inline check, joined by \"or\"", () => {
  // The real regression case: The Errand's read-the-old-man check offers
  // perception/medicine/society at one DC. Posting only the first silently
  // denied a Society-trained character their own best roll.
  assert.equal(
    enrichersFor({ skillOptions: ["perception", "medicine", "society"], dc: 17 }),
    "@Check[perception|dc:17] or @Check[medicine|dc:17] or @Check[society|dc:17]"
  );
});

test("enrichersFor works for a single skill exactly like enricherFor alone", () => {
  assert.equal(enrichersFor({ skillOptions: ["athletics"], dc: 15 }), enricherFor({ slug: "athletics", dc: 15 }));
});

test("enrichersFor with no dc omits it from every posted check, same as enricherFor", () => {
  assert.equal(enrichersFor({ skillOptions: ["stealth", "acrobatics"] }), "@Check[stealth] or @Check[acrobatics]");
});

test("enrichersFor returns an empty string for no skill options, rather than posting a blank check", () => {
  assert.equal(enrichersFor({ skillOptions: [], dc: 15 }), "");
  assert.equal(enrichersFor({}), "");
});

test("enrichersFor still refuses an unsafe slug anywhere in the list, exactly like enricherFor", () => {
  assert.throws(() => enrichersFor({ skillOptions: ["athletics", "has space"], dc: 15 }), /unsafe slug/);
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

/* ---------------------------------------------------------------- */
/*  Strikes: the one lever sf2e leaves for skipping their dialog     */
/* ---------------------------------------------------------------- */

/**
 * sf2e's own formula (gamesystems/sf2e/sf2e.mjs, `Check.roll`'s
 * `eventToRollParams` call), reproduced here so this test proves
 * `strikeEventShiftKeyFor` actually round-trips through the real thing
 * rather than just agreeing with itself.
 */
function sf2eOwnSkipDialog(shiftKey, realShowCheckDialogs) {
  const r = !realShowCheckDialogs;
  return shiftKey ? !r : r;
}

test("strikeEventShiftKeyFor round-trips: feeding its shiftKey back through sf2e's real formula always yields the desired skipDialog, at every combination", () => {
  for (const desired of [true, false]) {
    for (const realSetting of [true, false]) {
      const shiftKey = strikeEventShiftKeyFor(desired, realSetting);
      assert.equal(
        sf2eOwnSkipDialog(shiftKey, realSetting),
        desired,
        `desired=${desired} realShowCheckDialogs=${realSetting} -> shiftKey=${shiftKey} did not land on the desired outcome`
      );
    }
  }
});

test("strikeEventShiftKeyFor needs no shiftKey trick when the real setting already agrees", () => {
  // showCheckDialogs:true (sf2e's real default) -> baseline (shiftKey:false) already skips nothing;
  // wanting skipDialog:false needs no override.
  assert.equal(strikeEventShiftKeyFor(false, true), false);
  // showCheckDialogs:false -> baseline already skips; wanting skipDialog:true needs no override either.
  assert.equal(strikeEventShiftKeyFor(true, false), false);
});

test("strikeEventShiftKeyFor forces shiftKey:true exactly when the desired outcome fights the real setting — this is the actual bug found live", () => {
  // The console's own default is skipDialog:true (CONSOLE_SHOWS_DIALOG_BY_DEFAULT),
  // but sf2e's real per-user default is showCheckDialogs:true, whose baseline
  // (a shiftKey:false event) computes skipDialog:false — the exact mismatch
  // that left every strike click hanging on an unanswered dialog.
  assert.equal(strikeEventShiftKeyFor(true, true), true);
});

/* ---------------------------------------------------------------- */
/*  options -- the Scene Runner's roll tag rides along (2026-09-24)   */
/* ---------------------------------------------------------------- */

test("enricherFor carries extra roll options as sf2e's own `options:` parameter", () => {
  // sf2e's inline check turns `options:` into extraRollOptions, which land in
  // the rolled message's flags.sf2e.context.options -- how the Scene Runner
  // recognises the result of a check it posted.
  assert.equal(
    enricherFor({ slug: "society", dc: 16, options: ["bi-runner:episode-c1e1--intake-medicals:form-12b"] }),
    "@Check[society|dc:16|options:bi-runner:episode-c1e1--intake-medicals:form-12b]"
  );
  assert.equal(enricherFor({ slug: "society", options: ["a:b", "c"] }), "@Check[society|options:a:b,c]");
});

test("no options means the exact enricher it always was", () => {
  assert.equal(enricherFor({ slug: "computers", dc: 18, options: [] }), "@Check[computers|dc:18]");
  assert.equal(enricherFor({ slug: "computers", dc: 18, options: null }), "@Check[computers|dc:18]");
});

test("enricherFor refuses a roll option that could break out of the enricher", () => {
  for (const bad of ["x|dc:1", "x]@UUID[Actor.evil]", "a,b", "Capital", "has space", "", 7]) {
    assert.throws(() => enricherFor({ slug: "society", dc: 16, options: [bad] }), /unsafe roll option/, JSON.stringify(bad));
  }
});

/* ---------------------------------------------------------------- */
/*  secret -- checks whose critical failure is a belief roll blind   */
/*  (D058, 2026-10-04)                                               */
/* ---------------------------------------------------------------- */

test("a secret check carries sf2e's own traits:secret, before the roll tag", () => {
  assert.equal(enricherFor({ slug: "perception", dc: 17, secret: true }), "@Check[perception|dc:17|traits:secret]");
  assert.equal(
    enricherFor({ slug: "society", dc: 15, secret: true, options: ["bi-runner:b:k"] }),
    "@Check[society|dc:15|traits:secret|options:bi-runner:b:k]"
  );
});

test("a check that isn't secret is the exact enricher it always was", () => {
  assert.equal(enricherFor({ slug: "computers", dc: 18, secret: false }), "@Check[computers|dc:18]");
  assert.equal(enricherFor({ slug: "computers", dc: 18 }), "@Check[computers|dc:18]");
  // Only a real true counts: a stray string or 1 from hand-edited data never makes a roll blind by accident.
  assert.equal(enricherFor({ slug: "computers", dc: 18, secret: "yes" }), "@Check[computers|dc:18]");
});

test("enrichersFor marks every posted skill secret", () => {
  assert.equal(
    enrichersFor({ skillOptions: ["perception", "medicine"], dc: 17, secret: true }),
    "@Check[perception|dc:17|traits:secret] or @Check[medicine|dc:17|traits:secret]"
  );
});

test("enrichersFor tags every posted skill the same way", () => {
  assert.equal(
    enrichersFor({ skillOptions: ["perception", "society"], dc: 17, options: ["bi-runner:b:k"] }),
    "@Check[perception|dc:17|options:bi-runner:b:k] or @Check[society|dc:17|options:bi-runner:b:k]"
  );
});

/* ---------------------------------------------------------------- */

// An any-skill check (Ingram, 2026-09-24: The Road In's small problem -- the
// player names the skill they used). Its skillOptions are empty on purpose,
// so without checkSkills the runner would post an empty chat message and the
// player would have nothing to click.
test("checkSkills: a normal check rolls on its own listed skills, in order", () => {
  assert.deepEqual(checkSkills({ skillOptions: ["stealth", "society"] }), ["stealth", "society"]);
  assert.deepEqual(checkSkills({}), []);
  assert.deepEqual(checkSkills(null), []);
});

test("checkSkills: an anySkill check offers all eighteen SF2E skills, so the posted message is never empty", () => {
  const skills = checkSkills({ anySkill: true, skillOptions: [] });
  assert.equal(skills.length, 18);
  assert.ok(skills.includes("piloting") && skills.includes("computers"), "the two Starfinder skills are there");
  const posted = enrichersFor({ skillOptions: skills, dc: 15, options: ["bi-runner:b:k"] });
  assert.equal(posted.split(" or ").length, 18);
  assert.match(posted, /^@Check\[acrobatics\|dc:15\|options:bi-runner:b:k\]/, "each one still carries the runner's tag, so the roll records itself");
});

test("checkLabel: slugs for a normal check, the any-skill label for an anySkill one", () => {
  assert.equal(checkLabel({ skillOptions: ["athletics", "acrobatics"] }, 13), "athletics / acrobatics 13");
  assert.equal(checkLabel({ anySkill: true, skillOptions: [] }, 15, "Any skill"), "Any skill 15");
  assert.equal(checkLabel({ anySkill: true }, null), "Any skill");
});

/* ---------------------------------------------------------------- */
/*  2026-10-04 (D059): an any-skill check as one compact card        */
/* ---------------------------------------------------------------- */

import { anySkillCard } from "../module/blank-inheritance/scripts/core/roll-intent.mjs";

test("an any-skill check is one heading and one short labelled link per skill, each still a tagged check", () => {
  const html = anySkillCard({ skillOptions: ["acrobatics", "athletics"], dc: 15, options: ["bi-runner:episode-x:the-beat"], labels: { athletics: "Athletics!" } });
  assert.match(html, /^<div class="bi-anyskill">/);
  assert.match(html, /<p class="bi-anyskill__head">DC 15 · Roll the skill you named<\/p>/);
  assert.match(html, /@Check\[acrobatics\|dc:15\|options:bi-runner:episode-x:the-beat\]\{Acrobatics\}/, "a missing label falls back to the slug's own label");
  assert.match(html, /@Check\[athletics\|dc:15\|options:bi-runner:episode-x:the-beat\]\{Athletics!\}/);
  assert.doesNotMatch(html, / or /, "no wall of 'or'");
});

test("a secret any-skill card leaves the DC out of its heading and posts every link blind", () => {
  const html = anySkillCard({ skillOptions: ["society"], dc: 17, secret: true, heading: "Roll it" });
  assert.match(html, /<p class="bi-anyskill__head">Roll it<\/p>/);
  assert.match(html, /@Check\[society\|dc:17\|traits:secret\]\{Society\}/);
});

test("a label cannot break out of sf2e's inline label, and the heading is escaped", () => {
  const html = anySkillCard({ skillOptions: ["stealth"], dc: 12, labels: { stealth: "Ste}al[th]" }, heading: "<b>x</b>" });
  assert.match(html, /\{Stealth\}/);
  assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
});
