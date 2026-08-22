import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../../tools/battle-simulator/engine/rng.mjs";
import { degreeOfSuccess, resolveStrike, applyHardness, mitigateDamage, resolveSave, basicSaveDamage, resolveFieldRepair, resolveEvacuation } from "../../tools/battle-simulator/engine/resolve.mjs";

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
  const { expectedStrikeDamage } = await import("../../tools/battle-simulator/ai/considerations.mjs");
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
