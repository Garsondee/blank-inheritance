/**
 * Unit tests for the utility-AI's scoring primitives — these are the
 * foundation everything else in the framework is built on, so they get
 * the most exhaustive direct coverage, including a cross-check against
 * degreeOfSuccess itself (the actual resolver) to prove the AI's
 * probability model can never silently drift from what really gets rolled.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  averageDamage, averageStrikeDamage, degreeProbabilities, expectedStrikeDamage, hitProbability,
  expectedRepairHealing, AVERAGE_EVACUATION_CIVILIANS
} from "../../tools/battle-simulator/ai/considerations.mjs";
import { degreeOfSuccess } from "../../tools/battle-simulator/engine/resolve.mjs";

test("averageDamage: NdX+B is N*(X+1)/2 + B", () => {
  assert.equal(averageDamage("3d6", 10), 20.5); // 3*3.5+10
  assert.equal(averageDamage("2d12", 17), 30); // 2*6.5+17
  assert.equal(averageDamage("1d1", 0), 1);
});

test("averageDamage: throws on a malformed formula rather than silently returning NaN", () => {
  assert.throws(() => averageDamage("not-a-formula", 0));
});

test("averageStrikeDamage: sums every damage entry on a strike", () => {
  const strike = { damage: [{ dice: "3d6", bonus: 10 }] };
  assert.equal(averageStrikeDamage(strike), 20.5);
  const multiEntry = { damage: [{ dice: "1d6", bonus: 0 }, { dice: "1d4", bonus: 2 }] };
  assert.equal(averageStrikeDamage(multiEntry), 3.5 + 4.5);
});

test("degreeProbabilities: cross-checked directly against degreeOfSuccess for every one of the 20 faces (the model must never diverge from the real resolver)", () => {
  const modifier = 24;
  const dc = 33;
  const probs = degreeProbabilities(modifier, dc);
  let manualCounts = { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0 };
  for (let d20 = 1; d20 <= 20; d20++) manualCounts[degreeOfSuccess(d20, d20 + modifier, dc)] += 1;
  assert.equal(probs.criticalSuccess, manualCounts.criticalSuccess / 20);
  assert.equal(probs.success, manualCounts.success / 20);
  assert.equal(probs.failure, manualCounts.failure / 20);
  assert.equal(probs.criticalFailure, manualCounts.criticalFailure / 20);
});

test("degreeProbabilities: the four bands always sum to exactly 1", () => {
  for (const [modifier, dc] of [[24, 33], [0, 20], [50, 10], [-10, 25]]) {
    const p = degreeProbabilities(modifier, dc);
    const total = p.criticalSuccess + p.success + p.failure + p.criticalFailure;
    assert.ok(Math.abs(total - 1) < 1e-9, `probabilities for mod ${modifier} vs DC ${dc} summed to ${total}, not 1`);
  }
});

test("degreeProbabilities: an overwhelming modifier is critical success on 19/20 faces (a natural 1 always shifts one degree down, even here) and a hopeless one is critical failure on 19/20 (a natural 20 always shifts one degree up)", () => {
  assert.deepEqual(degreeProbabilities(100, 10), { criticalSuccess: 0.95, success: 0.05, failure: 0, criticalFailure: 0 });
  assert.deepEqual(degreeProbabilities(-100, 10), { criticalSuccess: 0, success: 0, failure: 0.05, criticalFailure: 0.95 });
});

test("expectedStrikeDamage: is exactly 0 against an immune target, regardless of attack bonus (the mechanism that replaces the old special-cased 'don't fire the missile at an immune target' check with honest expected-value math)", () => {
  const strike = { damage: [{ dice: "3d8", bonus: 12 }] };
  const target = { immuneToAllDamage: true, currentHP: 100 };
  assert.equal(expectedStrikeDamage({ attackModifier: 100, targetAc: 1, strike, target }), 0);
});

test("expectedStrikeDamage: is exactly 0 against an already-dead target", () => {
  const strike = { damage: [{ dice: "3d8", bonus: 12 }] };
  const target = { immuneToAllDamage: false, currentHP: 0 };
  assert.equal(expectedStrikeDamage({ attackModifier: 100, targetAc: 1, strike, target }), 0);
});

test("expectedStrikeDamage: a guaranteed miss (impossible attack bonus) is 0 even against a vulnerable target", () => {
  const strike = { damage: [{ dice: "3d8", bonus: 12 }] };
  const target = { immuneToAllDamage: false, currentHP: 100, hardness: 0 };
  assert.equal(expectedStrikeDamage({ attackModifier: -100, targetAc: 10, strike, target }), 0);
});

test("expectedStrikeDamage: a near-guaranteed hit (overwhelming attack bonus) scores close to the full critical-doubled average, post-mitigation, minus the sliver a natural 1 always costs", () => {
  const strike = { damage: [{ dice: "1d1", bonus: 5 }] }; // avg 6
  const target = { immuneToAllDamage: false, currentHP: 100, hardness: 0 };
  // 19/20 crit (6*2=12), 1/20 shifted down to a plain success (6): (19*12 + 1*6) / 20 = 11.7
  assert.equal(expectedStrikeDamage({ attackModifier: 100, targetAc: 1, strike, target }), 11.7);
});

test("expectedStrikeDamage: correctly prefers the target/strike combo with higher real expected value — the actual decision the AI needs to make between a sidearm and a long-range weapon", () => {
  const target = { immuneToAllDamage: false, currentHP: 165, hardness: 0, scaleHardness: 15 };
  const sidearm = { attackBonus: 20, damage: [{ dice: "3d6", bonus: 10 }], traits: ["mounted"] }; // avg 20.5
  const longRange = { attackBonus: 24, damage: [{ dice: "3d8", bonus: 12 }], traits: ["mounted"] }; // avg 25.5, better bonus too
  const sidearmValue = expectedStrikeDamage({ attackModifier: sidearm.attackBonus, targetAc: 33, strike: sidearm, target });
  const longRangeValue = expectedStrikeDamage({ attackModifier: longRange.attackBonus, targetAc: 33, strike: longRange, target });
  assert.ok(longRangeValue > sidearmValue, `expected the higher-tier weapon to score higher expected damage: sidearm=${sidearmValue}, longRange=${longRangeValue}`);
});

test("hitProbability: is success+criticalSuccess, matches degreeProbabilities directly", () => {
  const p = degreeProbabilities(24, 33);
  assert.equal(hitProbability(24, 33), p.success + p.criticalSuccess);
});

test("expectedRepairHealing: cross-checked against resolve.mjs's own healing-by-degree table (40/25/10/0), weighted by the real degree probabilities — must never silently diverge from resolveFieldRepair", () => {
  const repairBonus = 24, handlingDC = 20;
  const p = degreeProbabilities(repairBonus, handlingDC);
  const manual = p.criticalSuccess * 40 + p.success * 25 + p.failure * 10 + p.criticalFailure * 0;
  assert.equal(expectedRepairHealing({ repairBonus, handlingDC }), manual);
});

test("expectedRepairHealing: a near-guaranteed check (matching the earlier-verified overwhelming-modifier distribution) lands close to full critical-success healing, minus the sliver a natural 1 always costs", () => {
  // degreeProbabilities(100, 10) is already established above as {criticalSuccess:0.95, success:0.05, failure:0, criticalFailure:0}
  assert.equal(expectedRepairHealing({ repairBonus: 100, handlingDC: 10 }), 0.95 * 40 + 0.05 * 25);
});

test("expectedRepairHealing: a hopeless check still isn't exactly 0 — a natural 20 always shifts one degree up (criticalFailure -> failure, which still heals 10 per the table), the same edge case already verified for degreeProbabilities above", () => {
  // degreeProbabilities(-100, 25): 19/20 criticalFailure (heals 0), 1/20 nat-20-shifted failure (heals 10)
  assert.equal(expectedRepairHealing({ repairBonus: -100, handlingDC: 25 }), 0.05 * 10);
});

test("AVERAGE_EVACUATION_CIVILIANS: matches resolve.mjs's resolveEvacuation dice formula (2d6+2) as a plain expected value", () => {
  assert.equal(AVERAGE_EVACUATION_CIVILIANS, averageDamage("2d6", 2));
  assert.equal(AVERAGE_EVACUATION_CIVILIANS, 9);
});
