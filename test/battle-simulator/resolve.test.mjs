import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../../tools/battle-simulator/engine/rng.mjs";
import { degreeOfSuccess, resolveStrike, applyHardness, resolveSave, basicSaveDamage, resolveFieldRepair, resolveEvacuation } from "../../tools/battle-simulator/engine/resolve.mjs";

test("degreeOfSuccess: the four bands, no natural-roll shift", () => {
  assert.equal(degreeOfSuccess(10, 30, 20), "criticalSuccess"); // >= DC+10
  assert.equal(degreeOfSuccess(10, 25, 20), "success"); // >= DC, < DC+10
  assert.equal(degreeOfSuccess(10, 15, 20), "failure"); // < DC, > DC-10
  assert.equal(degreeOfSuccess(10, 10, 20), "criticalFailure"); // <= DC-10
});

test("degreeOfSuccess: natural 20 shifts one degree better, even from a failure", () => {
  assert.equal(degreeOfSuccess(20, 15, 20), "success", "total 15 vs DC 20 is a plain failure (>DC-10); nat 20 shifts it up to success");
  assert.equal(degreeOfSuccess(20, 25, 20), "criticalSuccess", "nat 20 on a success shifts up to critical success");
});

test("degreeOfSuccess: natural 1 shifts one degree worse, even from a success", () => {
  assert.equal(degreeOfSuccess(1, 25, 20), "failure", "nat 1 on what would be a success shifts down to failure");
  assert.equal(degreeOfSuccess(1, 35, 20), "success", "nat 1 on a critical success shifts down to plain success");
});

test("degreeOfSuccess: a natural 20 against a wildly high DC can still land on failure, never skip past criticalSuccess incorrectly", () => {
  // total 5 vs DC 100 -> criticalFailure numerically; nat20 shifts ONE step to failure, not all the way to success.
  assert.equal(degreeOfSuccess(20, 5, 100), "failure");
});

test("resolveStrike: attack bonus 100 vs AC 10 is always at least a success, and crit doubles the flat damage total", () => {
  const rng = makeRng(42);
  const result = resolveStrike(rng, { attacker: {}, strike: { attackBonus: 100, damage: [{ dice: "1d1", bonus: 5 }] }, targetAc: 10, mapPenalty: 0 });
  assert.ok(result.degree === "success" || result.degree === "criticalSuccess");
  if (result.degree === "criticalSuccess") {
    assert.equal(result.damage.raw, 12, "1d1(=1)+5=6 raw, doubled to 12 on a crit");
  } else {
    assert.equal(result.damage.raw, 6);
  }
});

test("resolveStrike: a guaranteed miss (attackBonus very negative) deals no damage", () => {
  const rng = makeRng(7);
  const result = resolveStrike(rng, { attacker: {}, strike: { attackBonus: -100, damage: [{ dice: "1d1", bonus: 5 }] }, targetAc: 10, mapPenalty: 0 });
  assert.ok(result.degree === "failure" || result.degree === "criticalFailure");
  assert.equal(result.damage, null, "no damage object at all on a miss — not a damage of 0, genuinely absent");
});

test("applyHardness: reduces damage by a flat amount, floored at 0 (never negative)", () => {
  assert.equal(applyHardness(30, 12), 18);
  assert.equal(applyHardness(5, 12), 0, "damage less than Hardness deals zero, not negative damage");
  assert.equal(applyHardness(12, 12), 0);
});

test("resolveSave + basicSaveDamage: the four standard multipliers", () => {
  assert.equal(basicSaveDamage(40, "criticalSuccess"), 0);
  assert.equal(basicSaveDamage(40, "success"), 20);
  assert.equal(basicSaveDamage(41, "success"), 20, "half rounds down");
  assert.equal(basicSaveDamage(40, "failure"), 40);
  assert.equal(basicSaveDamage(40, "criticalFailure"), 80);
});

test("resolveFieldRepair: healing amount matches design/scale-and-chassis.md §6 exactly per degree", () => {
  // repairBonus so high it guarantees critical success against any real DC
  const rng = makeRng(3);
  const result = resolveFieldRepair(rng, { repairBonus: 100, handlingDC: 16 });
  assert.equal(result.degree, "criticalSuccess");
  assert.equal(result.healing, 40);
});

test("resolveFieldRepair: a guaranteed failure heals 0 and does not throw", () => {
  const rng = makeRng(3);
  const result = resolveFieldRepair(rng, { repairBonus: -100, handlingDC: 16 });
  assert.equal(result.healing, 0);
});

test("resolveEvacuation: rolls 2d6+2, so civilians is always in [4, 14], and is deterministic for a given seed", () => {
  const rng = makeRng(11);
  const result = resolveEvacuation(rng);
  assert.equal(result.rolls.length, 2);
  assert.ok(result.civilians >= 4 && result.civilians <= 14, `${result.civilians} out of 2d6+2 range`);
  assert.equal(result.civilians, result.rolls.reduce((a, b) => a + b, 0) + 2);

  const rngAgain = makeRng(11);
  const resultAgain = resolveEvacuation(rngAgain);
  assert.deepEqual(resultAgain, result, "same seed must reproduce the same evacuation roll");
});

test("rng: makeRng is deterministic for a given seed — same seed, same sequence", () => {
  const a = makeRng(20260822);
  const b = makeRng(20260822);
  const seqA = Array.from({ length: 20 }, () => a());
  const seqB = Array.from({ length: 20 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test("rng: different seeds produce different sequences (real, not curated, variance)", () => {
  const a = makeRng(1);
  const b = makeRng(2);
  const seqA = Array.from({ length: 10 }, () => a());
  const seqB = Array.from({ length: 10 }, () => b());
  assert.notDeepEqual(seqA, seqB);
});
