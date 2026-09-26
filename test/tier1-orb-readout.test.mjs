// Tier 1 — what the deck's central instrument says, and to whom
// (scripts/core/orb-readout.mjs). Law 1 (show the number that will be
// rolled), Law 2 (show the margin, not the verdict) and Law 11 (never show a
// player what their character has not learned) all land here.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ORB_ROLL_HOLD_MS,
  orbMode,
  readoutTitle,
  rollFromMessage,
  rollSummary,
  signed
} from "../module/blank-inheritance/scripts/core/orb-readout.mjs";

test("readoutTitle keeps the subject of an sf2e 'Kind: Subject' title, which is what a glance at the window needs", () => {
  // Both titles copied from real chat messages rolled from the deck, 2026-09-17.
  assert.equal(readoutTitle("Skill Check: Zon-Shelyn Lore"), "Zon-Shelyn Lore");
  assert.equal(readoutTitle("Melee Strike: Unarmed Attack"), "Unarmed Attack");
  assert.equal(readoutTitle("Perception Check"), "Perception Check", "no prefix, shown whole");
  assert.equal(readoutTitle("Saving Throw: "), "Saving Throw:", "an empty subject keeps the whole title rather than going blank");
  assert.equal(readoutTitle(undefined), "");
});

test("rollSummary titles the readout with the subject, not sf2e's kind prefix", () => {
  const roll = rollFromMessage(sf2eMessage({ title: "Skill Check: Zon-Shelyn Lore" }));
  assert.equal(roll.title, "Skill Check: Zon-Shelyn Lore", "the extracted roll keeps sf2e's own title untouched");
  assert.equal(rollSummary(roll).title, "Zon-Shelyn Lore");
});

test("signed always carries a sign, including zero", () => {
  assert.equal(signed(4), "+4");
  assert.equal(signed(-2), "-2");
  assert.equal(signed(0), "+0");
});

test("orbMode: a hand on a control beats a recent roll, which beats idle, which returns once the roll goes stale", () => {
  const lastRoll = { at: 1000 };
  assert.equal(orbMode({ now: 2000, hover: { title: "Athletics" }, lastRoll }), "hover");
  assert.equal(orbMode({ now: 2000, lastRoll }), "roll");
  assert.equal(orbMode({ now: 1000 + ORB_ROLL_HOLD_MS + 1, lastRoll }), "idle");
  assert.equal(orbMode({ now: 500, lastRoll }), "idle", "a roll stamped in the future is clock skew, not a reading");
  assert.equal(orbMode({ now: 2000 }), "idle");
});

/** A plain-data message shaped like the sf2e chat messages verified live 2026-09-17. */
function sf2eMessage({ title = "Acrobatics Check", type = "skill-check", total = 22, natural = 15, dc = null, outcome = null } = {}) {
  return {
    flags: { sf2e: { context: { title, type, dc, outcome } } },
    rolls: [{ total, dice: [{ faces: 20, results: [{ result: natural, active: true }] }] }],
    speakerActorId: "actor-1",
    at: 5
  };
}

test("rollFromMessage reads the title, total, natural d20, DC and outcome sf2e writes to its context", () => {
  const roll = rollFromMessage(sf2eMessage({ dc: { value: 18 }, outcome: "success" }));
  assert.deepEqual(roll, {
    at: 5,
    actorId: "actor-1",
    title: "Acrobatics Check",
    type: "skill-check",
    total: 22,
    natural: 15,
    dc: 18,
    dcVisible: true,
    outcome: "success"
  });
});

test("rollFromMessage ignores damage rolls and anything with no check context", () => {
  assert.equal(rollFromMessage(sf2eMessage({ type: "damage-roll" })), null);
  assert.equal(rollFromMessage({ flags: {}, rolls: [{ total: 7, dice: [] }] }), null);
  assert.equal(rollFromMessage({ flags: { sf2e: { context: { title: "x" } } }, rolls: [] }), null);
});

test("rollFromMessage takes a discarded die's sibling for rolled-twice checks, not the discarded one", () => {
  const msg = sf2eMessage();
  msg.rolls[0].dice[0].results = [{ result: 3, active: false, discarded: true }, { result: 17, active: true }];
  assert.equal(rollFromMessage(msg).natural, 17);
});

test("rollSummary shows the GM the margin and outcome against a DC (Law 2)", () => {
  const roll = rollFromMessage(sf2eMessage({ total: 22, dc: { value: 18 }, outcome: "success" }));
  const summary = rollSummary(roll, { isGM: true });
  assert.equal(summary.margin, 4);
  assert.equal(summary.marginLabel, "+4");
  assert.equal(summary.outcome, "success");
  assert.equal(summary.outcomeKey, "BLANKINHERITANCE.Deck.Outcome.success");
  assert.equal(summary.tone, "good");
});

test("rollSummary never shows a player a DC the table was not shown, nor an outcome the metagame setting hides (Law 11)", () => {
  const hidden = rollFromMessage(sf2eMessage({ total: 12, dc: { value: 18, visible: false }, outcome: "failure" }));
  const player = rollSummary(hidden, { isGM: false, showResults: false });
  assert.equal(player.dc, null, "a hidden DC reached the player's orb");
  assert.equal(player.margin, null, "a margin against a hidden DC reached the player's orb");
  assert.equal(player.outcome, null, "a hidden outcome reached the player's orb");
  assert.equal(player.total, 12, "the player still sees their own total");

  const gm = rollSummary(hidden, { isGM: true, showResults: false });
  assert.equal(gm.dc, 18, "the GM always sees the DC");
  assert.equal(gm.outcome, "failure");
});

test("rollSummary with no DC falls back to the natural die for its tone", () => {
  assert.equal(rollSummary(rollFromMessage(sf2eMessage({ natural: 20 }))).tone, "good");
  assert.equal(rollSummary(rollFromMessage(sf2eMessage({ natural: 1 }))).tone, "bad");
  assert.equal(rollSummary(rollFromMessage(sf2eMessage({ natural: 11 }))).tone, "neutral");
  assert.equal(rollSummary(null), null);
});

test("readoutTitle reads an ACTION's markup title as the action's name (regression: the orb printed raw <h4> tags, 2026-09-23)", () => {
  // Copied from the real context title of a Seek used from the deck's Action selector.
  const seek = '<h4 class="action"> <strong>Seek</strong> <span class="action-glyph">1</span> <span class="subtitle degree-of-success"> (<span>Perception Check</span>) </span> </h4>';
  assert.equal(readoutTitle(seek), "Seek");
  assert.equal(readoutTitle("<span>Plain <em>markup</em></span>"), "Plain markup", "markup with no <strong> is stripped to its words");
  assert.doesNotMatch(readoutTitle(seek), /[<>]/);
});
