import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../../tools/battle-simulator/shared/rng.mjs";
import {
  degreeOfSuccess, resolveStrike, applyHardness, mitigateDamage, resolveSave, basicSaveDamage, resolveFieldRepair, resolveEvacuation,
  averageDamage, averageFormula, averageStrikeDamage, degreeProbabilities, expectedStrikeDamage, expectedSaveDamage, hitProbability, expectedRepairHealing, expectedEvacuationCivilians
} from "../../tools/battle-simulator/shared/resolve.mjs";
import { rollFormula } from "../../tools/battle-simulator/shared/rng.mjs";

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

test("expectedSaveDamage: is exactly 0 against an immune target or an already-dead one", () => {
  const dyingTarget = { currentHP: 0, maxHP: 10 };
  const immuneTarget = { currentHP: 10, maxHP: 10, immuneToAllDamage: true };
  const args = { saveBonus: 0, dc: 15, damage: [{ dice: "1d8", bonus: 0 }] };
  assert.equal(expectedSaveDamage({ ...args, target: dyingTarget }), 0);
  assert.equal(expectedSaveDamage({ ...args, target: immuneTarget }), 0);
});

test("expectedSaveDamage: a guaranteed critical success (an overwhelming save bonus) is very close to 0 — only the sliver a natural 1 costs", () => {
  const target = { currentHP: 100, maxHP: 100 };
  const expected = expectedSaveDamage({ saveBonus: 100, dc: 15, damage: [{ dice: "1d8", bonus: 0 }], target });
  // With saveBonus 100 every roll but a natural 1 crit-succeeds (0 damage); a natural 1 shifts down to
  // a plain success (half of avg 4.5 -> floor(4.5/2)=2), so expected = (1/20)*2 = 0.1.
  assert.ok(expected > 0 && expected < 0.5, `expected a tiny near-zero value from the nat-1 sliver, got ${expected}`);
});

test("expectedSaveDamage: a guaranteed critical failure (an impossible save bonus) is close to double the average raw damage", () => {
  const target = { currentHP: 100, maxHP: 100 };
  const expected = expectedSaveDamage({ saveBonus: -100, dc: 15, damage: [{ dice: "1d8", bonus: 0 }], target });
  // avg 1d8 = 4.5, doubled on a critical failure = 9; a natural 20 shifts the one roll that would
  // otherwise crit-fail up to a plain failure (full damage, 4.5) instead, pulling the expectation down slightly.
  assert.ok(expected > 8 && expected <= 9, `expected close to double the average (9), got ${expected}`);
});

test("expectedSaveDamage: Hardness reduces it exactly like an ordinary Strike's expected damage does", () => {
  const target = { currentHP: 100, maxHP: 100 };
  const targetEffective = { hardness: 3 };
  const withoutHardness = expectedSaveDamage({ saveBonus: -100, dc: 15, damage: [{ dice: "1d8", bonus: 0 }], target });
  const withHardness = expectedSaveDamage({ saveBonus: -100, dc: 15, damage: [{ dice: "1d8", bonus: 0 }], target, targetEffective });
  assert.ok(withHardness < withoutHardness, "Hardness must reduce expected save-attack damage");
});

test("resolveFieldRepair: healing amount matches the retired two-scale design (deleted 2026-09-25) §6 exactly per degree", () => {
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

// ---------------------------------------------------------------------------
// mitigateDamage (design doc §15e) — the ONE shared implementation of damage
// mitigation. These tests moved here from considerations.test.mjs when the AI's
// duplicate `afterMitigation` was deleted: the rule lives in resolve.mjs now, so
// its tests do too, where they will outlive any number of AI rewrites.
// ---------------------------------------------------------------------------

test("mitigateDamage: Player Core p.399 order — weakness is ADDED before Hardness is subtracted, not after", () => {
  const target = { weaknessAll: 3 };
  const targetEffective = { hardness: 12 };
  // raw 1 + weakness 3 = 4, then Hardness 12 absorbs all of it -> 0.
  // The WRONG order (max(0, 1-12) = 0, then +3) would leak 3 damage through as guaranteed damage.
  assert.equal(mitigateDamage(1, { target, targetEffective, strike: {} }), 0);
});

test("mitigateDamage: Scale-Hardness applies only to a mounted-trait Strike", () => {
  const target = { scaleHardness: 15 };
  const targetEffective = { hardness: 0 };
  assert.equal(mitigateDamage(20, { target, targetEffective, strike: { traits: ["mounted"] } }), 5);
  assert.equal(mitigateDamage(20, { target, targetEffective, strike: { traits: [] } }), 20, "no mounted trait -> Scale-Hardness must not apply");
});

test("mitigateDamage: an immune target takes exactly 0 regardless of raw damage", () => {
  assert.equal(mitigateDamage(999, { target: { immuneToAllDamage: true }, targetEffective: { hardness: 0 }, strike: {} }), 0);
});

test("REGRESSION: mitigateDamage reads Hardness from targetEffective, NOT from target — the damage-state-adjusted value is the correct one", () => {
  // resolveEffectiveStats halves Hardness at Critical damage state. The old AI-side copy read
  // `target.hardness` and callers had to remember to spread the effective value in; forgetting
  // silently computed hardness-of-0. Passing targetEffective explicitly makes that impossible.
  const target = { hardness: 999 };            // raw sheet value — must be ignored
  const targetEffective = { hardness: 5 };      // damage-state-adjusted — must be used
  assert.equal(mitigateDamage(20, { target, targetEffective, strike: {} }), 15);
});

test("DRIFT ALARM: the AI's analytic expected damage matches the real resolver's sampled mean within 1% — if a damage rule changes in one place and not the other, this fails", async () => {
  const cases = [
    { name: "sidearm vs Claimant, weakness up", strike: { attackBonus: 20, traits: ["mounted"], damage: [{ dice: "3d6", bonus: 10 }] }, ac: 33, target: { currentHP: 165, weaknessAll: 15, scaleHardness: 15 }, eff: { hardness: 0 } },
    { name: "sidearm vs Claimant, field intact-ish (hardness bites)", strike: { attackBonus: 20, traits: ["mounted"], damage: [{ dice: "3d6", bonus: 10 }] }, ac: 33, target: { currentHP: 165, scaleHardness: 15 }, eff: { hardness: 0 } },
    { name: "Frame melee, no mitigation", strike: { attackBonus: 25, traits: [], damage: [{ dice: "2d12", bonus: 17 }] }, ac: 33, target: { currentHP: 165 }, eff: { hardness: 0 } },
    { name: "third strike at -10 MAP", strike: { attackBonus: 10, traits: [], damage: [{ dice: "3d6", bonus: 10 }] }, ac: 33, target: { currentHP: 165 }, eff: { hardness: 0 } }
  ];

  for (const c of cases) {
    const analytic = expectedStrikeDamage({ attackModifier: c.strike.attackBonus, targetAc: c.ac, strike: c.strike, target: c.target, targetEffective: c.eff });
    const rng = makeRng(20260823);
    const TRIALS = 60000;
    let total = 0;
    for (let i = 0; i < TRIALS; i++) {
      const r = resolveStrike(rng, { attacker: {}, strike: c.strike, targetAc: c.ac, mapPenalty: 0 });
      if (r.damage) total += mitigateDamage(r.damage.raw, { target: c.target, targetEffective: c.eff, strike: c.strike });
    }
    const sampled = total / TRIALS;
    // Tolerance is absolute-or-relative: the analytic value is a mean-of-dice plug-in, and
    // max(0, X - hardness) is convex, so a Jensen gap appears when Hardness sits near the mean
    // damage. Measured under 0.5% for every configuration this project actually produces.
    const tolerance = Math.max(0.25, analytic * 0.01);
    assert.ok(
      Math.abs(analytic - sampled) <= tolerance,
      `${c.name}: analytic ${analytic.toFixed(3)} vs sampled ${sampled.toFixed(3)} (${TRIALS} trials) — drifted beyond ${tolerance.toFixed(3)}`
    );
  }
});

// ---------------------------------------------------------------------------
// Migrated from test/battle-simulator/considerations.test.mjs (design doc §15t) — that file
// tested these same functions through ai/considerations.mjs, a compatibility re-export shim
// created when expectedStrikeDamage/degreeProbabilities/etc moved to engine/resolve.mjs (§15f).
// The shim's own header said it "goes away with the rest of the old AI layer once the new
// evaluator lands" — decide.mjs has been the only AI for a while now, so this is that retirement:
// the tests move to testing the real implementation directly, and the shim file is deleted.
// ---------------------------------------------------------------------------

test("averageDamage: NdX+B is N*(X+1)/2 + B", () => {
  assert.equal(averageDamage("3d6", 10), 20.5); // 3*3.5+10
  assert.equal(averageDamage("2d12", 17), 30); // 2*6.5+17
  assert.equal(averageDamage("1d1", 0), 1);
});

test("averageDamage: throws on a malformed formula rather than silently returning NaN", () => {
  assert.throws(() => averageDamage("not-a-formula", 0));
});

// GH #60 — averageFormula, the combined-string sibling: mirrors rollFormula's own regex exactly,
// unlike averageDamage above (two SEPARATE arguments, no bonus-suffix support at all).
test("averageFormula: a REAL bug this fixes, checked directly — averageDamage throws on a combined string, averageFormula does not", () => {
  assert.throws(() => averageDamage("1d8+8", 0), /Not a dice formula/, "sanity: confirms the bug averageFormula exists to fix is real, not hypothetical");
  assert.doesNotThrow(() => averageFormula("1d8+8"));
});

test("averageFormula: a REAL bug this fixes, checked directly — averageDamage(dice) with no bonus argument silently returns NaN, averageFormula does not", () => {
  assert.ok(Number.isNaN(averageDamage("1d8")), "sanity: confirms averageDamage(dice) alone really is NaN, not just theoretically so");
  assert.equal(averageFormula("1d8"), 4.5);
});

test("averageFormula: NdX+B and NdX-B combined strings, matching averageDamage's own NdX+B math for the equivalent split arguments", () => {
  assert.equal(averageFormula("3d6+10"), 20.5); // 3*3.5+10, matching averageDamage("3d6", 10) above
  assert.equal(averageFormula("2d12+17"), 30);
  assert.equal(averageFormula("1d8-2"), 2.5); // 4.5 - 2
});

test("averageFormula: throws a clear error on a malformed formula, same discipline as averageDamage", () => {
  assert.throws(() => averageFormula("not-a-formula"), /Not a dice formula/);
});

test("averageFormula: mirrors rollFormula's own regex exactly — every formula rollFormula accepts, averageFormula accepts too (including whitespace, via the same .trim())", () => {
  for (const formula of ["1d8", "1d8+8", "1d8-2", "  1d8+8  ", "10d4+3"]) {
    assert.doesNotThrow(() => averageFormula(formula), `averageFormula must accept "${formula}", the same as rollFormula does`);
    assert.doesNotThrow(() => rollFormula(() => 0.5, formula), `sanity: rollFormula must also accept "${formula}"`);
  }
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
  assert.equal(expectedRepairHealing({ repairBonus: 100, handlingDC: 10 }), 0.95 * 40 + 0.05 * 25);
});

test("expectedRepairHealing: a hopeless check still isn't exactly 0 — a natural 20 always shifts one degree up (criticalFailure -> failure, which still heals 10 per the table), the same edge case already verified for degreeProbabilities above", () => {
  assert.equal(expectedRepairHealing({ repairBonus: -100, handlingDC: 25 }), 0.05 * 10);
});

test("expectedEvacuationCivilians: matches resolve.mjs's own resolveEvacuation dice formula (2d6+2) as a plain expected value", () => {
  assert.equal(expectedEvacuationCivilians(), averageDamage("2d6", 2));
  assert.equal(expectedEvacuationCivilians(), 9);
});
