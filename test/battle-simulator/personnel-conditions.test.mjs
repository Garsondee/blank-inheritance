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
  attackerConditionPenalty, applyKnockout, worsenDyingFromDamage, resolveRecoveryCheck, applyRevival
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
