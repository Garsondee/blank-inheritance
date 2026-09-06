// Tier 1 — the Character Card's model.
//
// The assertion that matters most in this file is the leak test: a player's
// card must not CONTAIN the text of a fact they have not learned. Not hidden
// with a class, not filtered in the template — absent from the object, so
// there is nothing in the DOM or in a socket payload to go looking for. That
// is doctrine Law 11, and it is the kind of rule that is easy to satisfy on
// the day it is written and easy to quietly break six months later.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ATTITUDES,
  DEFAULT_ATTITUDE,
  SOCIAL_ACTIONS,
  attitudeIndex,
  attitudeLabelKey,
  buildCard,
  describeTrigger,
  isAttitude,
  leaksUnrevealedText,
  shiftAttitude
} from "../module/blank-inheritance/scripts/core/social-intel.mjs";

const PROFILE = {
  attitude: "unfriendly",
  facts: [
    { id: "bribe", text: "Easily bribed", revealTrigger: { skill: "society", dc: 18 }, revealed: false },
    { id: "grudge", text: "Never forgets an insult", revealTrigger: { narrative: "Insult them once" }, revealed: false },
    { id: "sister", text: "Has a sister in the Directorate", revealTrigger: null, revealed: false }
  ]
};

/* ---------------------------------------------------------------- */
/*  The attitude scale                                               */
/* ---------------------------------------------------------------- */

test("the scale is SF2E's real five steps, in order, worst to best", () => {
  assert.deepEqual(ATTITUDES, ["hostile", "unfriendly", "indifferent", "friendly", "helpful"]);
  assert.equal(ATTITUDES.length, 5);
});

test("order is the mechanic — the three social actions move a target along it by steps", () => {
  assert.equal(attitudeIndex("hostile"), 0);
  assert.equal(attitudeIndex("helpful"), 4);
  assert.equal(attitudeIndex("indifferent"), 2);
});

test("an unknown attitude reads as indifferent rather than throwing", () => {
  assert.equal(attitudeIndex("furious"), attitudeIndex(DEFAULT_ATTITUDE));
  assert.equal(attitudeIndex(undefined), attitudeIndex(DEFAULT_ATTITUDE));
  assert.equal(isAttitude("furious"), false);
  assert.equal(isAttitude("helpful"), true);
});

test("shifting clamps at both ends — a crit success on someone Helpful does not wrap to Hostile", () => {
  assert.equal(shiftAttitude("helpful", 2), "helpful");
  assert.equal(shiftAttitude("hostile", -2), "hostile");
  assert.equal(shiftAttitude("indifferent", 1), "friendly");
  assert.equal(shiftAttitude("indifferent", -1), "unfriendly");
  assert.equal(shiftAttitude("indifferent", 2), "helpful");
});

test("shifting by nothing is a no-op, and fractions do not create half-steps", () => {
  assert.equal(shiftAttitude("friendly", 0), "friendly");
  assert.equal(shiftAttitude("friendly"), "friendly");
  assert.equal(shiftAttitude("indifferent", 1.9), "friendly");
});

test("every attitude has a real localisation key", () => {
  for (const attitude of ATTITUDES) {
    assert.match(attitudeLabelKey(attitude), /^BLANKINHERITANCE\.Console\.Card\.Attitude\.[A-Z]/);
  }
  assert.equal(attitudeLabelKey("nonsense"), attitudeLabelKey(DEFAULT_ATTITUDE));
});

test("the three RAW actions are present with the right shape", () => {
  assert.deepEqual(SOCIAL_ACTIONS.map((a) => a.id), ["make-an-impression", "request", "coerce"]);

  // Make an Impression's plain Failure has NO listed effect — that silent
  // no-op is the real "neutral" the design doc went and found, rather than an
  // invented fifth degree of success.
  const impression = SOCIAL_ACTIONS.find((a) => a.id === "make-an-impression");
  assert.equal(impression.steps.failure, 0);
  assert.equal(impression.steps.criticalSuccess, 2);
  assert.equal(impression.steps.criticalFailure, -1);

  // Request SPENDS an attitude rather than moving it; only a crit failure moves it.
  const request = SOCIAL_ACTIONS.find((a) => a.id === "request");
  assert.equal(request.steps.success, 0);
  assert.equal(request.steps.criticalFailure, -1);
});

/* ---------------------------------------------------------------- */
/*  Law 11 — removal, not hiding                                     */
/* ---------------------------------------------------------------- */

test("a player's card contains ONLY facts they have learned", () => {
  const card = buildCard({ name: "Caretaker", profile: PROFILE, revealedIds: ["bribe"], isGM: false });
  assert.deepEqual(card.facts.map((f) => f.id), ["bribe"]);
});

test("no unrevealed fact TEXT appears anywhere in a player's card, at any depth", () => {
  // The real assertion: serialise the whole object and search it. A future
  // refactor that adds unrevealed facts back under some other key — for a
  // count, a tooltip, a sort — fails here rather than in a session.
  const card = buildCard({ name: "Caretaker", profile: PROFILE, revealedIds: ["bribe"], isGM: false });
  assert.equal(leaksUnrevealedText(card, PROFILE), false);

  const serialised = JSON.stringify(card);
  assert.equal(serialised.includes("Never forgets an insult"), false);
  assert.equal(serialised.includes("Has a sister in the Directorate"), false);
  assert.ok(serialised.includes("Easily bribed"), "the revealed fact should be there");
});

test("a player learns HOW MANY facts remain, but never what they are", () => {
  const card = buildCard({ profile: PROFILE, revealedIds: ["bribe"], isGM: false });
  assert.equal(card.unlearned, 2);
  assert.equal(card.facts.length, 1);
});

test("a player with nothing revealed gets an empty fact list, not a redacted one", () => {
  const card = buildCard({ profile: PROFILE, revealedIds: [], isGM: false });
  assert.deepEqual(card.facts, []);
  assert.equal(card.unlearned, 3);
  assert.equal(leaksUnrevealedText(card, PROFILE), false);
});

test("a player never receives reveal triggers, even for facts they HAVE learned", () => {
  // The trigger is how to learn it, which is GM planning, not player knowledge.
  const card = buildCard({ profile: PROFILE, revealedIds: ["bribe"], isGM: false });
  assert.equal(card.facts[0].trigger, null);
  assert.equal(JSON.stringify(card).includes("society"), false);
});

test("the leak detector actually detects a leak — it is not vacuously true", () => {
  // Guard against the guard. The scenario worth catching is not a card that
  // lists an unrevealed fact outright — that is obvious — but one where a
  // refactor stashes the text somewhere else: a tooltip, a search index, a
  // sort key. The detector searches the whole serialised object precisely so
  // it does not care WHERE the text ended up.
  const leaky = {
    facts: [{ id: "bribe", text: "Easily bribed" }],
    tooltip: "Never forgets an insult"
  };
  assert.equal(leaksUnrevealedText(leaky, PROFILE), true, "unrevealed text hidden under another key must be caught");

  // And a card that genuinely omits it passes.
  assert.equal(leaksUnrevealedText({ facts: [{ id: "bribe", text: "Easily bribed" }] }, PROFILE), false);
});

/* ---------------------------------------------------------------- */
/*  The GM's view                                                    */
/* ---------------------------------------------------------------- */

test("a GM sees every fact, flagged by whether the table has learned it", () => {
  const card = buildCard({ profile: PROFILE, revealedIds: ["bribe"], isGM: true });
  assert.deepEqual(card.facts.map((f) => f.id), ["bribe", "grudge", "sister"]);
  assert.deepEqual(card.facts.map((f) => f.revealed), [true, false, false]);
  assert.equal(card.unlearned, 2);
});

test("a GM sees how each fact is learned", () => {
  const card = buildCard({ profile: PROFILE, revealedIds: [], isGM: true });
  const [bribe, grudge, sister] = card.facts;
  assert.deepEqual(bribe.trigger, { kind: "check", skill: "society", dc: 18 });
  assert.deepEqual(grudge.trigger, { kind: "narrative", text: "Insult them once" });
  assert.equal(sister.trigger, null, "a fact revealed by GM judgement is normal, not unfinished");
});

/* ---------------------------------------------------------------- */
/*  Degrading gracefully                                             */
/* ---------------------------------------------------------------- */

test("an NPC with no authored profile still gets a usable card", () => {
  // This is the common case today and for a long time: attitude is useful for
  // any NPC in any scene without a word of authoring.
  const card = buildCard({ name: "A stranger", isGM: true });
  assert.equal(card.attitude, DEFAULT_ATTITUDE);
  assert.deepEqual(card.facts, []);
  assert.equal(card.unlearned, 0);
  assert.equal(card.hasProfile, false);
});

test("buildCard survives being handed nothing at all", () => {
  const card = buildCard();
  assert.equal(card.attitude, DEFAULT_ATTITUDE);
  assert.deepEqual(card.facts, []);
});

test("a stored attitude on the profile wins over the default", () => {
  assert.equal(buildCard({ profile: PROFILE, isGM: true }).attitude, "unfriendly");
  assert.equal(buildCard({ profile: { attitude: "bogus" }, isGM: true }).attitude, DEFAULT_ATTITUDE);
});

test("describeTrigger reports nothing rather than a placeholder when there is nothing", () => {
  assert.equal(describeTrigger(null), null);
  assert.equal(describeTrigger({}), null);
  assert.equal(describeTrigger({ narrative: "   " }), null);
  assert.equal(describeTrigger("society"), null);
  assert.deepEqual(describeTrigger({ skill: "computers" }), { kind: "check", skill: "computers", dc: null });
});
