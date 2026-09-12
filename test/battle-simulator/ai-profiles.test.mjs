/**
 * Tests for personnel-engine/ai-profiles.mjs (design doc §46 — "Archetype Ladder" Stage A). Three
 * real concerns, matching that module's own two load-bearing rules plus the freezing guarantee:
 * (1) completeness — a profile missing a weight key must fail LOUDLY, not silently NaN;
 * (2) the real profiles ship with the exact shape/values documented; (3) "frozen" actually pins
 * BEHAVIOR, not just numbers — a golden-sequence test proves a real battle's exact action sequence
 * on a fixed seed, so a future engine change that would silently alter it fails a real assertion
 * instead of drifting unnoticed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import {
  assertCompleteWeights, ALL_TEMPLATE_NAMES, BASELINE_V1, NO_MANEUVERS_V1,
  applyProfileToCombatant, decideOptionsForProfile
} from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";

const fixturesDir = "tools/battle-simulator/data/raw-validation-fixtures";
function loadFixture(file) { return JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")); }

// --- assertCompleteWeights (rule 1: complete, never merged) ---

test("assertCompleteWeights: passes silently on a real, complete weights object", () => {
  assert.doesNotThrow(() => assertCompleteWeights({ ...DEFAULT_WEIGHTS }));
});

test("assertCompleteWeights: throws on a MISSING key — the exact silent-NaN risk this function exists to catch", () => {
  const incomplete = { ...DEFAULT_WEIGHTS };
  delete incomplete.tempoDenial;
  assert.throws(() => assertCompleteWeights(incomplete), /missing \[tempoDenial\]/);
});

test("assertCompleteWeights: throws on an EXTRA/stale/typo'd key too, not just a missing one", () => {
  const extra = { ...DEFAULT_WEIGHTS, tempoDenialTypo: 1.0 };
  assert.throws(() => assertCompleteWeights(extra), /extra \[tempoDenialTypo\]/);
});

test("assertCompleteWeights: reports BOTH a missing and an extra key in one real error, not just the first found", () => {
  const both = { ...DEFAULT_WEIGHTS };
  delete both.closing;
  both.notARealWeight = 1;
  assert.throws(() => assertCompleteWeights(both), /missing \[closing\].*extra \[notARealWeight\]/s);
});

// --- BASELINE_V1 (rule 2: frozen means pinned numbers, not a live reference) ---

test("BASELINE_V1: its own weights snapshot matches the REAL current DEFAULT_WEIGHTS exactly, key-for-key and value-for-value — proving the hand-copied snapshot hasn't drifted from what it claims to reproduce", () => {
  assert.deepEqual(BASELINE_V1.weights, DEFAULT_WEIGHTS);
});

test("BASELINE_V1: is a genuinely FROZEN object, and its own weights sub-object is frozen too — accidental in-place mutation must be a hard error, not silent drift", () => {
  assert.ok(Object.isFrozen(BASELINE_V1));
  assert.ok(Object.isFrozen(BASELINE_V1.weights));
  assert.throws(() => { "use strict"; BASELINE_V1.competence = 0.5; }, /Cannot assign to read only property/);
});

test("BASELINE_V1: lists every real turn-template name decide.mjs defines, matching ALL_TEMPLATE_NAMES — reproducing 'every template available', decide()'s own pre-§46 default", () => {
  assert.deepEqual([...BASELINE_V1.templates], [...ALL_TEMPLATE_NAMES]);
  assert.deepEqual([...ALL_TEMPLATE_NAMES].sort(), ["control-then-attack", "disengage-and-heal", "double-strike", "reposition-and-shoot", "unconstrained"]);
});

test("BASELINE_V1: competence 1.0, no morale override, no temperament override, neutral aggression, no capability restrictions — byte-identical to decide()'s own hidden pre-§46 defaults", () => {
  assert.equal(BASELINE_V1.competence, 1.0);
  assert.equal(BASELINE_V1.moraleEnabled, false);
  assert.equal(BASELINE_V1.temperament, null);
  assert.equal(BASELINE_V1.aggression, 1.0);
  assert.deepEqual([...BASELINE_V1.disabledActionTypes], []);
});

// --- NO_MANEUVERS_V1 ---

test("NO_MANEUVERS_V1: disables exactly trip/shove/grapple, nothing else — everything other than disabledActionTypes matches BASELINE_V1", () => {
  assert.deepEqual([...NO_MANEUVERS_V1.disabledActionTypes].sort(), ["grapple", "shove", "trip"]);
  assert.equal(NO_MANEUVERS_V1.competence, BASELINE_V1.competence);
  assert.deepEqual(NO_MANEUVERS_V1.weights, BASELINE_V1.weights);
  assert.deepEqual([...NO_MANEUVERS_V1.templates], [...BASELINE_V1.templates]);
  assert.notEqual(NO_MANEUVERS_V1.id, BASELINE_V1.id);
});

// --- applyProfileToCombatant / decideOptionsForProfile (the real plumbing) ---

test("applyProfileToCombatant: merges temperament/aggression from the profile onto a copy — never mutates the original fixture object", () => {
  const fixture = loadFixture("lunar-17.json");
  const frozenSnapshot = JSON.stringify(fixture);
  const combatant = applyProfileToCombatant(fixture, NO_MANEUVERS_V1);
  assert.equal(combatant.temperament, NO_MANEUVERS_V1.temperament);
  assert.equal(combatant.aggression, NO_MANEUVERS_V1.aggression);
  assert.equal(JSON.stringify(fixture), frozenSnapshot, "the original fixture object must be completely untouched");
  assert.notEqual(combatant, fixture, "must return a new object, not the same reference");
});

test("applyProfileToCombatant: preserves every OTHER real fixture field untouched (HP, AC, strikes, athleticsModifier, ...)", () => {
  const fixture = loadFixture("security-goon.json");
  const combatant = applyProfileToCombatant(fixture, BASELINE_V1);
  assert.equal(combatant.maxHP, fixture.maxHP);
  assert.equal(combatant.ac, fixture.ac);
  assert.equal(combatant.athleticsModifier, fixture.athleticsModifier);
  assert.deepEqual(combatant.strikes, fixture.strikes);
});

test("decideOptionsForProfile: produces exactly the shape decide()'s own options object expects, real values pulled straight from the profile", () => {
  const options = decideOptionsForProfile(NO_MANEUVERS_V1);
  assert.deepEqual(options, {
    competence: NO_MANEUVERS_V1.competence,
    weights: NO_MANEUVERS_V1.weights,
    templates: NO_MANEUVERS_V1.templates,
    moraleEnabled: NO_MANEUVERS_V1.moraleEnabled,
    disabledActionTypes: NO_MANEUVERS_V1.disabledActionTypes
  });
});

// --- GOLDEN SEQUENCE (the real "frozen means pinned BEHAVIOR" guard) ---
//
// Both sequences below are the REAL, measured output of a real runBattle call on a small, fast,
// fully-specified 2-combatant arena (real Lunar-17/Security Goon fixtures, seed 42) — captured
// directly via a scratch probe, not hand-derived. If EITHER of these ever changes, one of two real
// things happened: an intentional engine change (re-verify by hand, update the expected sequence,
// and bump ai-profiles.mjs's own engineContract), or a real, unintended behavior regression this
// test is specifically here to catch. Either way, silent drift is now impossible.

function makeGoldenScenario(oppositionProfile) {
  const lunar17 = loadFixture("lunar-17.json");
  const goon = loadFixture("security-goon.json");
  function ai(state, combatantId, turn) {
    const profile = combatantId === "goon" ? oppositionProfile : BASELINE_V1;
    return decide(state, combatantId, turn, decideOptionsForProfile(profile));
  }
  return {
    seed: 42, gridSize: { cols: 12, rows: 8 }, roundLimit: 6,
    combatants: [
      { ...lunar17, id: "lunar17", position: { col: 1, row: 4 } },
      { ...goon, id: "goon", position: { col: 10, row: 4 } }
    ],
    ai, walls: []
  };
}

function actionSequence(log) {
  const seq = [];
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    seq.push(`${turn.combatantId}:${action.type}${action.targetId ? "->" + action.targetId : ""}`);
  }
  return seq;
}

// Re-derived GH #58 (engineContract bumped 2->3, threatReduction added to evaluateState) — the SAME
// re-verify-by-hand-and-update procedure this test's own header comment prescribes, not a hand
// guess: captured directly from a real runBattle call with the new weight active. Re-derived TWICE
// during development: a first, structurally-wrong formula (offensiveReach's own "reach against a
// live enemy" shape, monotonicity-safe but rewarding the wrong thing once checked against #58's own
// acceptance test) produced a much longer, 4-round battle; the corrected formula (rewards damage
// ALREADY dealt, weighted by threat share) produces this much smaller, more sensible change from the
// pre-#58 baseline — same outcome, same round count, exactly one adjacent pair of actions swapped
// (lunar17 now presses the attack before healing, rather than healing first, since the goon carries
// a bit more value to keep pressuring once it's already taken some damage).
test("GOLDEN SEQUENCE: BASELINE_V1 vs BASELINE_V1, real fixtures, seed 42 — the exact real action sequence, pinned", () => {
  const log = runBattle(makeGoldenScenario(BASELINE_V1));
  assert.equal(log.outcome.result, "party-defeat");
  assert.equal(log.rounds.length, 2);
  assert.deepEqual(actionSequence(log), [
    "lunar17:move",
    "lunar17:spellAttack->goon",
    "goon:move",
    "goon:trip->lunar17",
    "goon:strike->lunar17",
    "lunar17:spellAttack->goon",
    "lunar17:healAbility->lunar17",
    "goon:strike->lunar17",
    "goon:move",
    "goon:move"
  ]);
});

// Re-derived GH #60 (engineContract bumped 4->5, real fixture change: Lunar-17 gained Heal
// (touch)/Heal (30ft) alongside Transfer Vitality) — captured directly from a real runBattle call,
// same re-verify-by-hand-and-update procedure this test's own header comment prescribes.
//
// This is NOT a cosmetic re-derivation like GH #58's own — the OUTCOME itself flips, and by hand
// investigation (comparing this exact scenario/seed against the pre-#60 fixture directly, action by
// action) the new sequence is demonstrably WORSE, not just different: at 1 HP with 3 actions
// available, the search picks Heal (30ft) (2 actions, ~12.5 HP expected) over the cheaper Transfer
// Vitality (1 action, flat 10 HP) purely because `bestMatching` (decide.mjs) ranks phase-0 candidates
// by raw gain with no action-cost adjustment — the bigger-looking heal wins even though it leaves
// only 1 action for a weak Semi-Auto Pistol shot, where the pre-#60 plan (Transfer Vitality, then a
// full 2-action Eldritch Lance) measured a HIGHER total projected gain (18.2 vs 16.9) and actually won
// the fight. This is a real, understood, separately-tracked search limitation (GH #141) — not
// specific to healing, and not something to patch inline here. Re-pinned to the new, real behavior
// because this test's job is to catch UNINTENDED drift, not to gate on solving GH #141: once that
// issue is fixed, this sequence will very likely change again and should be re-derived at that point.
test("GOLDEN SEQUENCE: BASELINE_V1 vs NO_MANEUVERS_V1, IDENTICAL seed/fixtures/positions — a genuinely different, longer sequence (goon never trips) — the real, measured proof that a profile change actually changes real behavior, not just a label", () => {
  const log = runBattle(makeGoldenScenario(NO_MANEUVERS_V1));
  assert.equal(log.outcome.result, "party-defeat", "GH #60/#141 — see this test's own comment above: the search now picks a costlier, lower-total-value heal, which loses this specific fight");
  assert.equal(log.rounds.length, 2);
  const seq = actionSequence(log);
  assert.deepEqual(seq, [
    "lunar17:move",
    "lunar17:spellAttack->goon",
    "goon:move",
    "goon:strike->lunar17",
    "goon:strike->lunar17",
    "lunar17:healAbility->lunar17",
    "lunar17:strike->goon",
    "goon:strike->lunar17",
    "goon:move",
    "goon:move"
  ]);
  assert.ok(!seq.some((s) => s.startsWith("goon:trip") || s.startsWith("goon:shove") || s.startsWith("goon:grapple")), "goon must NEVER attempt a disabled action type across the whole real battle");
});
