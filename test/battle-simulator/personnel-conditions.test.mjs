/**
 * Direct tests for personnel-engine/conditions.mjs (design doc §25 — "research the rules then
 * implement conditions, death/dying for PCs and off guard/flanking"). Every real number here is
 * cited against reference/srd/player-core/367-hit-points-healing-and-dying.json (the full,
 * directly-scraped dying/wounded/unconscious text) and the individual condition-N-*.json mirrors.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyValuedCondition, isDead, isUnconscious, isOffGuardFromConditions,
  attackerConditionPenalty, applyKnockout, worsenDyingFromDamage, resolveRecoveryCheck, applyRevival,
  isGrabbedOrRestrained, isRestrained, isImmobilized, applyGrapple, releaseGrapple, releaseGrapplesHeldBy,
  trySpendHeroPointToAvoidDeath, usesDyingRules
} from "../../tools/battle-simulator/personnel-engine/conditions.mjs";

function makePC(overrides = {}) {
  return { id: "pc", name: "PC", side: "party", currentHP: 10, maxHP: 15, ...overrides };
}
function makeNPC(overrides = {}) {
  return { id: "npc", name: "NPC", side: "opposition", currentHP: 10, maxHP: 15, ...overrides };
}

// --- applyValuedCondition (Player Core pg. 435, "Redundant Conditions With Values") ---

test("applyValuedCondition: reapplying a LOWER value than current does nothing — the real 'max wins' rule, never additive", () => {
  const c = makePC({ frightened: 3 });
  applyValuedCondition(c, "frightened", 1);
  assert.equal(c.frightened, 3, "a lower reapplication must never reduce the existing value");
});

test("applyValuedCondition: reapplying a HIGHER value replaces it", () => {
  const c = makePC({ frightened: 1 });
  applyValuedCondition(c, "frightened", 3);
  assert.equal(c.frightened, 3);
});

test("applyValuedCondition: from nothing, applies the given value", () => {
  const c = makePC();
  applyValuedCondition(c, "stunnedValue", 2);
  assert.equal(c.stunnedValue, 2);
});

// --- isDead / isUnconscious (Player Core pg. 402, real PC-vs-NPC asymmetry) ---

test("isDead: an ordinary NPC at 0 HP is just dead — no dying spiral for opposition, matching the real 'significant characters' RAW default", () => {
  assert.equal(isDead(makeNPC({ currentHP: 0 })), true);
});

test("isDead: a PC at 0 HP with dyingValue below 4 is NOT dead", () => {
  assert.equal(isDead(makePC({ currentHP: 0, dyingValue: 3 })), false);
});

test("isDead: a PC at 0 HP who has reached dying 4 IS dead", () => {
  assert.equal(isDead(makePC({ currentHP: 0, dyingValue: 4 })), true);
});

test("isDead: nobody above 0 HP is dead, PC or NPC", () => {
  assert.equal(isDead(makePC({ currentHP: 1 })), false);
  assert.equal(isDead(makeNPC({ currentHP: 1 })), false);
});

test("isUnconscious: a PC at 0 HP, not yet dead, is unconscious", () => {
  assert.equal(isUnconscious(makePC({ currentHP: 0, dyingValue: 1 })), true);
});

test("isUnconscious: an NPC at 0 HP is never 'unconscious' in this engine's sense — it's just dead", () => {
  assert.equal(isUnconscious(makeNPC({ currentHP: 0 })), false);
});

test("isUnconscious: a PC who reached dying 4 (actually dead) is not unconscious", () => {
  assert.equal(isUnconscious(makePC({ currentHP: 0, dyingValue: 4 })), false);
});

test("isUnconscious: a PC above 0 HP is never unconscious, regardless of any leftover dyingValue", () => {
  assert.equal(isUnconscious(makePC({ currentHP: 5, dyingValue: 2 })), false);
});

// --- usesDyingRules / pcDeathRules override (design doc §49 erratum — found via personnel-mirror.mjs
// silently giving "party" real survivability an identical "opposition" combatant didn't get) ---

test("usesDyingRules: defaults to the side-keyed rule when pcDeathRules is unset — byte-identical to every pre-§49 caller", () => {
  assert.equal(usesDyingRules(makePC()), true);
  assert.equal(usesDyingRules(makeNPC()), false);
});

test("usesDyingRules: pcDeathRules: true grants real dying rules to an 'opposition' combatant — the actual §49 fix", () => {
  assert.equal(usesDyingRules(makeNPC({ pcDeathRules: true })), true);
});

test("usesDyingRules: pcDeathRules: false denies dying rules to a 'party' combatant — the override works in both directions", () => {
  assert.equal(usesDyingRules(makePC({ pcDeathRules: false })), false);
});

test("isDead/isUnconscious: an 'opposition' combatant with pcDeathRules: true gets the REAL dying spiral, not an instant death — the exact fix personnel-mirror.mjs relies on", () => {
  const opponent = makeNPC({ pcDeathRules: true, currentHP: 0, dyingValue: 2 });
  assert.equal(isDead(opponent), false, "dying 2 must not be dead yet, exactly like a real PC");
  assert.equal(isUnconscious(opponent), true);
});

test("isDead: an 'opposition' combatant with pcDeathRules: true still dies for real once dyingValue reaches 4 — the override grants PC rules, not immortality", () => {
  assert.equal(isDead(makeNPC({ pcDeathRules: true, currentHP: 0, dyingValue: 4 })), true);
});

test("isDead: a 'party' combatant with pcDeathRules: false dies outright at 0 HP like an ordinary NPC, regardless of dyingValue", () => {
  assert.equal(isDead(makePC({ pcDeathRules: false, currentHP: 0, dyingValue: 1 })), true);
});

// --- isOffGuardFromConditions (condition-28-off-guard.json) ---

test("isOffGuardFromConditions: prone grants it", () => {
  assert.equal(isOffGuardFromConditions(makePC({ prone: true })), true);
});

test("isOffGuardFromConditions: unconscious grants it (Player Core: 'you... have the... off-guard condition')", () => {
  assert.equal(isOffGuardFromConditions(makePC({ currentHP: 0, dyingValue: 1 })), true);
});

test("isOffGuardFromConditions: neither source present -> false", () => {
  assert.equal(isOffGuardFromConditions(makePC()), false);
});

test("isOffGuardFromConditions: both sources present is still just true, not double — a condition either applies or it doesn't", () => {
  assert.equal(isOffGuardFromConditions(makePC({ currentHP: 0, dyingValue: 1, prone: true })), true);
});

// --- attackerConditionPenalty ---

test("attackerConditionPenalty: frightened alone", () => {
  assert.equal(attackerConditionPenalty(makePC({ frightened: 2 })), -2);
});

test("attackerConditionPenalty: prone alone is exactly -2 (condition-32-prone.json: '-2 circumstance penalty to attack rolls')", () => {
  assert.equal(attackerConditionPenalty(makePC({ prone: true })), -2);
});

test("attackerConditionPenalty: frightened and prone stack additively — they're different penalty SOURCES, not the same named condition", () => {
  assert.equal(attackerConditionPenalty(makePC({ frightened: 1, prone: true })), -3);
});

test("attackerConditionPenalty: neither present -> 0", () => {
  assert.equal(attackerConditionPenalty(makePC()), 0);
});

// --- applyKnockout (Player Core pg. 402-403) ---

test("applyKnockout: a non-critical knockout grants dying 1", () => {
  const c = makePC({ currentHP: 0 });
  applyKnockout(c, { critical: false });
  assert.equal(c.dyingValue, 1);
});

test("applyKnockout: a critical knockout grants dying 2", () => {
  const c = makePC({ currentHP: 0 });
  applyKnockout(c, { critical: true });
  assert.equal(c.dyingValue, 2);
});

test("applyKnockout: 'if you have the wounded condition, increase your dying value by your wounded value' — real worked-example numbers", () => {
  const c = makePC({ currentHP: 0, woundedValue: 2 });
  applyKnockout(c, { critical: false });
  assert.equal(c.dyingValue, 3, "dying 1 + wounded 2 = dying 3");
});

test("applyKnockout: a critical knockout while wounded 2 -> dying 4, instant death", () => {
  const c = makePC({ currentHP: 0, woundedValue: 2 });
  applyKnockout(c, { critical: true });
  assert.equal(c.dyingValue, 4, "dying 2 + wounded 2 = dying 4 -- exactly the real rule's own cited example");
});

test("applyKnockout: knocks the combatant prone (Player Core: 'you fall prone' when knocked out)", () => {
  const c = makePC({ currentHP: 0 });
  applyKnockout(c, { critical: false });
  assert.equal(c.prone, true);
});

// --- worsenDyingFromDamage (Player Core pg. 403, "Taking Damage" while already dying) ---

test("worsenDyingFromDamage: normal damage increases dying by 1", () => {
  const c = makePC({ currentHP: 0, dyingValue: 1 });
  worsenDyingFromDamage(c, { critical: false });
  assert.equal(c.dyingValue, 2);
});

test("worsenDyingFromDamage: a critical hit increases dying by 2", () => {
  const c = makePC({ currentHP: 0, dyingValue: 1 });
  worsenDyingFromDamage(c, { critical: true });
  assert.equal(c.dyingValue, 3);
});

test("worsenDyingFromDamage: works the same starting from a stabilized (dyingValue 0) target — a fresh hit on an unconscious-but-stable PC is a real, dangerous event, not a no-op", () => {
  const c = makePC({ currentHP: 0, dyingValue: 0 });
  worsenDyingFromDamage(c, { critical: false });
  assert.equal(c.dyingValue, 1);
});

// --- resolveRecoveryCheck (Player Core pg. 403 -- flat check, DC 10 + current dying value) ---

function makeRng(sequence) {
  let i = 0;
  return () => sequence[i++ % sequence.length];
}

test("resolveRecoveryCheck: a real critical success (nat 20) reduces dying by 2", () => {
  const c = makePC({ currentHP: 0, dyingValue: 3 });
  // rollD20 reads Math.floor(rng() * 20) + 1 -- rng() just under 1 gives a nat 20.
  const result = resolveRecoveryCheck(makeRng([0.999999]), c);
  assert.equal(result.degree, "criticalSuccess");
  assert.equal(result.delta, -2);
  assert.equal(c.dyingValue, 1);
});

test("resolveRecoveryCheck: a real critical failure (nat 1) increases dying by 2", () => {
  const c = makePC({ currentHP: 0, dyingValue: 1 });
  const result = resolveRecoveryCheck(makeRng([0]), c);
  assert.equal(result.degree, "criticalFailure");
  assert.equal(result.delta, 2);
  assert.equal(c.dyingValue, 3);
});

test("resolveRecoveryCheck: dying value can never go below 0 even after a big reduction", () => {
  const c = makePC({ currentHP: 0, dyingValue: 1 });
  const result = resolveRecoveryCheck(makeRng([0.999999]), c); // crit success, -2
  assert.equal(c.dyingValue, 0, "1 - 2 floors at 0, not -1");
  assert.equal(result.stabilized, true);
});

test("resolveRecoveryCheck: reaching dyingValue 0 gains wounded 1 (fresh) or increases an existing wounded value by 1 -- Player Core's own wording, real numbers", () => {
  const noWoundYet = makePC({ currentHP: 0, dyingValue: 1 });
  resolveRecoveryCheck(makeRng([0.999999]), noWoundYet); // crit success -> dying 0
  assert.equal(noWoundYet.woundedValue, 1);

  const alreadyWounded = makePC({ currentHP: 0, dyingValue: 1, woundedValue: 2 });
  resolveRecoveryCheck(makeRng([0.999999]), alreadyWounded);
  assert.equal(alreadyWounded.woundedValue, 3, "increases by 1, does NOT take the max — a real increment, not a reapplication");
});

test("resolveRecoveryCheck: reaching dyingValue 4 is reported as died", () => {
  const c = makePC({ currentHP: 0, dyingValue: 3 });
  const result = resolveRecoveryCheck(makeRng([0]), c); // crit failure, +2 -> dyingValue 5, floored nowhere (no ceiling in this function itself)
  assert.equal(result.died, true);
});

test("resolveRecoveryCheck: an ordinary success/failure (not crit) moves the value by exactly 1", () => {
  // DC for dyingValue=2 is 12. A d20 of 12 is an ordinary success (12 >= 12, but short of DC+10=22).
  const success = makePC({ currentHP: 0, dyingValue: 2 });
  const successResult = resolveRecoveryCheck(makeRng([11 / 20]), success); // rollD20: floor(0.55*20)+1 = 12
  assert.equal(successResult.degree, "success");
  assert.equal(successResult.delta, -1);

  // A d20 of 11 against DC 12 is an ordinary failure.
  const failure = makePC({ currentHP: 0, dyingValue: 2 });
  const failureResult = resolveRecoveryCheck(makeRng([10 / 20]), failure); // rollD20: floor(0.50*20)+1 = 11
  assert.equal(failureResult.degree, "failure");
  assert.equal(failureResult.delta, 1);
});

// --- applyRevival (Player Core pg. 403 -- restored to 1+ HP) ---

test("applyRevival: clears dyingValue and prone", () => {
  const c = makePC({ currentHP: 5, dyingValue: 2, prone: true });
  applyRevival(c);
  assert.equal(c.dyingValue, 0);
  assert.equal(c.prone, false);
  assert.equal(isUnconscious(c), false, "restored HP alone already makes isUnconscious false, confirms the derivation is consistent");
});

test("applyRevival: does NOT clear woundedValue -- Player Core is explicit wounded persists ('ends if... Treat Wounds... or rest 10 minutes'), neither of which happens by just being healed back up mid-fight", () => {
  const c = makePC({ currentHP: 5, dyingValue: 1, woundedValue: 2 });
  applyRevival(c);
  assert.equal(c.woundedValue, 2, "wounded must survive a mid-combat revival");
});

// ---------------------------------------------------------------------------
// Grabbed / Restrained (design doc §31 — Athletics' Grapple): the first RELATIONAL condition in
// this file. Real numbers cited against condition-20-grabbed.json, condition-34-restrained.json,
// condition-24-immobilized.json.
// ---------------------------------------------------------------------------

test("isGrabbedOrRestrained: false with no grappledBy at all", () => {
  assert.equal(isGrabbedOrRestrained(makePC()), false);
});

test("isGrabbedOrRestrained: true when grabbed", () => {
  assert.equal(isGrabbedOrRestrained(makePC({ grappledBy: { attackerId: "x", state: "grabbed", expiresEndOfRound: 3 } })), true);
});

test("isGrabbedOrRestrained: true when restrained", () => {
  assert.equal(isGrabbedOrRestrained(makePC({ grappledBy: { attackerId: "x", state: "restrained", expiresEndOfRound: 3 } })), true);
});

test("isRestrained: true only for the 'restrained' state, never for 'grabbed' — a real, meaningful distinction (condition-34-restrained.json's own extra restrictions don't apply to a merely-grabbed target)", () => {
  assert.equal(isRestrained(makePC({ grappledBy: { attackerId: "x", state: "restrained", expiresEndOfRound: 3 } })), true);
  assert.equal(isRestrained(makePC({ grappledBy: { attackerId: "x", state: "grabbed", expiresEndOfRound: 3 } })), false);
  assert.equal(isRestrained(makePC()), false);
});

test("isImmobilized: true whenever grabbed OR restrained — condition-24-immobilized.json is granted by both", () => {
  assert.equal(isImmobilized(makePC({ grappledBy: { attackerId: "x", state: "grabbed", expiresEndOfRound: 3 } })), true);
  assert.equal(isImmobilized(makePC({ grappledBy: { attackerId: "x", state: "restrained", expiresEndOfRound: 3 } })), true);
  assert.equal(isImmobilized(makePC()), false);
});

test("applyGrapple: sets grappledBy with the real 'until the end of your next turn' expiry — current round + 1", () => {
  const c = makePC();
  applyGrapple(c, { attackerId: "goon", state: "grabbed", round: 4 });
  assert.deepEqual(c.grappledBy, { attackerId: "goon", state: "grabbed", expiresEndOfRound: 5 });
});

test("applyGrapple: a fresh application (e.g. a critical success on a re-grapple) overwrites wholesale — matches the real 'Restrained overrides grabbed' rule without tracking two conditions at once", () => {
  const c = makePC({ grappledBy: { attackerId: "goon", state: "grabbed", expiresEndOfRound: 3 } });
  applyGrapple(c, { attackerId: "goon", state: "restrained", round: 4 });
  assert.deepEqual(c.grappledBy, { attackerId: "goon", state: "restrained", expiresEndOfRound: 5 });
});

test("releaseGrapple: clears grappledBy entirely", () => {
  const c = makePC({ grappledBy: { attackerId: "goon", state: "restrained", expiresEndOfRound: 5 } });
  releaseGrapple(c);
  assert.equal(c.grappledBy, null);
});

test("releaseGrapplesHeldBy: releases every combatant held BY the given attacker, leaves everyone else's own hold on someone else, and anyone never held at all, untouched", () => {
  const heldByGoon = makePC({ id: "held-by-goon", grappledBy: { attackerId: "goon", state: "grabbed", expiresEndOfRound: 5 } });
  const heldBySomeoneElse = makeNPC({ id: "held-by-other", grappledBy: { attackerId: "other-attacker", state: "restrained", expiresEndOfRound: 5 } });
  const notHeldAtAll = makePC({ id: "free" });
  releaseGrapplesHeldBy([heldByGoon, heldBySomeoneElse, notHeldAtAll], "goon");
  assert.equal(heldByGoon.grappledBy, null, "released — was held by goon");
  assert.deepEqual(heldBySomeoneElse.grappledBy, { attackerId: "other-attacker", state: "restrained", expiresEndOfRound: 5 }, "untouched — held by a DIFFERENT attacker");
  assert.equal(notHeldAtAll.grappledBy, undefined, "untouched — was never held at all");
});

// --- isOffGuardFromConditions, extended: Grabbed/Restrained now grants Off-Guard too — both
// condition-20-grabbed.json and condition-34-restrained.json list it. ---

test("isOffGuardFromConditions: grabbed grants it", () => {
  assert.equal(isOffGuardFromConditions(makePC({ grappledBy: { attackerId: "x", state: "grabbed", expiresEndOfRound: 3 } })), true);
});

test("isOffGuardFromConditions: restrained grants it too", () => {
  assert.equal(isOffGuardFromConditions(makePC({ grappledBy: { attackerId: "x", state: "restrained", expiresEndOfRound: 3 } })), true);
});

test("isOffGuardFromConditions: still false with none of the four real sources present (prone/unconscious/grabbed/restrained)", () => {
  assert.equal(isOffGuardFromConditions(makePC()), false);
});

// ---------------------------------------------------------------------------
// Hero Points (design doc §42, Stage 1 — Player Core pg. 405): "Spend all your Hero Points
// (minimum 1) to avoid death... You lose the dying condition entirely and stabilize with 0 Hit
// Points." Every test below also proves the WITHOUT-a-Hero-Point path is completely unchanged from
// before this feature existed — a real safety net, not a silent rewrite of existing behavior.
// ---------------------------------------------------------------------------

test("trySpendHeroPointToAvoidDeath: spends ALL remaining points at once, clears dying, floors HP at 0", () => {
  const c = makePC({ heroPoints: 2, dyingValue: 3 });
  const result = trySpendHeroPointToAvoidDeath(c);
  assert.equal(result, true);
  assert.equal(c.heroPoints, 0, "ALL remaining points are spent — Player Core's own text, not just 1");
  assert.equal(c.dyingValue, 0);
  assert.equal(c.currentHP, 0);
});

test("trySpendHeroPointToAvoidDeath: works with exactly 1 point — Player Core's own 'minimum 1'", () => {
  const c = makePC({ heroPoints: 1, dyingValue: 3 });
  assert.equal(trySpendHeroPointToAvoidDeath(c), true);
  assert.equal(c.heroPoints, 0);
});

test("trySpendHeroPointToAvoidDeath: fails and changes nothing with 0 points or no field at all", () => {
  const noneAtAll = makePC({ dyingValue: 3 });
  assert.equal(trySpendHeroPointToAvoidDeath(noneAtAll), false);
  assert.equal(noneAtAll.dyingValue, 3, "must not touch dyingValue on a failed attempt");

  const zero = makePC({ heroPoints: 0, dyingValue: 3 });
  assert.equal(trySpendHeroPointToAvoidDeath(zero), false);
  assert.equal(zero.dyingValue, 3);
});

test("applyKnockout: a critical knockout while wounded 2 (the real dying-4 instant-death example this file already pins) is averted by a real Hero Point", () => {
  const c = makePC({ currentHP: 0, woundedValue: 2, heroPoints: 1 });
  applyKnockout(c, { critical: true });
  assert.equal(c.dyingValue, 0, "Hero Point clears dying entirely, not just caps it below 4");
  assert.equal(c.heroPoints, 0);
  assert.equal(c.prone, true, "still falls prone either way — Player Core's own knockout text, unaffected by the Hero Point");
  assert.equal(isDead(c), false);
});

test("applyKnockout: the SAME lethal case with NO Hero Point available still dies exactly as before — a real, unavoidable death, not accidentally always-saved", () => {
  const c = makePC({ currentHP: 0, woundedValue: 2 }); // no heroPoints field at all
  applyKnockout(c, { critical: true });
  assert.equal(c.dyingValue, 4, "dying 2 + wounded 2 = dying 4 -- exactly the real rule's own cited example, unchanged");
  assert.equal(isDead(c), true);
});

test("applyKnockout: an ORDINARY (non-lethal) knockout never touches heroPoints at all, even when some are available", () => {
  const c = makePC({ currentHP: 0, heroPoints: 1 });
  applyKnockout(c, { critical: false });
  assert.equal(c.dyingValue, 1, "an ordinary dying 1 knockout is nowhere near death — no reason to spend anything");
  assert.equal(c.heroPoints, 1, "must be untouched");
});

test("worsenDyingFromDamage: a hit that would push dying to 4 is averted by a real Hero Point", () => {
  const c = makePC({ currentHP: 0, dyingValue: 2, heroPoints: 1 });
  worsenDyingFromDamage(c, { critical: true }); // +2 would reach dying 4
  assert.equal(c.dyingValue, 0);
  assert.equal(c.heroPoints, 0);
});

test("worsenDyingFromDamage: the same hit with no Hero Point available still kills exactly as before", () => {
  const c = makePC({ currentHP: 0, dyingValue: 2 });
  worsenDyingFromDamage(c, { critical: true });
  assert.equal(c.dyingValue, 4);
});

test("worsenDyingFromDamage: a hit that does NOT reach 4 never touches heroPoints", () => {
  const c = makePC({ currentHP: 0, dyingValue: 1, heroPoints: 1 });
  worsenDyingFromDamage(c, { critical: false }); // +1 -> dying 2, nowhere near death
  assert.equal(c.dyingValue, 2);
  assert.equal(c.heroPoints, 1);
});

test("resolveRecoveryCheck: a critical failure that would push dying to 4 is averted by a real Hero Point — reports heroPointSpent/stabilized true, died false", () => {
  const c = makePC({ currentHP: 0, dyingValue: 2, heroPoints: 1 });
  const result = resolveRecoveryCheck(makeRng([0]), c); // nat 1 -> criticalFailure, delta +2 -> would reach 4
  assert.equal(result.degree, "criticalFailure");
  assert.equal(result.heroPointSpent, true);
  assert.equal(result.stabilized, true);
  assert.equal(result.died, false);
  assert.equal(c.dyingValue, 0);
  assert.equal(c.heroPoints, 0);
});

test("resolveRecoveryCheck: Hero-Point stabilization does NOT grant or increase Wounded — Player Core's own explicit exception, unlike a natural recovery-check stabilization", () => {
  const c = makePC({ currentHP: 0, dyingValue: 2, heroPoints: 1, woundedValue: 1 });
  resolveRecoveryCheck(makeRng([0]), c);
  assert.equal(c.woundedValue, 1, "must stay exactly as it was — Hero Point grants no wounded at all");
});

test("resolveRecoveryCheck: the identical critical failure with NO Hero Point available dies exactly as before — existing behavior fully preserved", () => {
  const c = makePC({ currentHP: 0, dyingValue: 2 });
  const result = resolveRecoveryCheck(makeRng([0]), c);
  assert.equal(result.heroPointSpent, false);
  assert.equal(result.died, true);
  assert.equal(c.dyingValue, 4);
});

test("resolveRecoveryCheck: an ordinary recovery that doesn't reach 4 never touches heroPoints, even when available, and still grants the real wounded increase on a NATURAL stabilization", () => {
  const c = makePC({ currentHP: 0, dyingValue: 1, heroPoints: 1 });
  const result = resolveRecoveryCheck(makeRng([0.999999]), c); // crit success, delta -2 -> dyingValue 0 (natural stabilization)
  assert.equal(result.heroPointSpent, false);
  assert.equal(c.heroPoints, 1, "must be untouched by a natural stabilization");
  assert.equal(c.woundedValue, 1, "a NATURAL stabilization still grants the real wounded increase, unaffected by this feature");
});
