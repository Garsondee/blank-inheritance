/**
 * Attack resolution: the actual d20-vs-AC roll, degree of success, damage
 * roll, and Hardness reduction. Everything here assumes the action has
 * ALREADY passed legality.mjs — this module never rejects an action, it
 * only resolves one that's already known to be legal.
 */

import { rollD20, rollFormula } from "./rng.mjs";

/** SF2E degree-of-success rule, including the natural-20/natural-1 one-step shift. */
export function degreeOfSuccess(d20, totalResult, dc) {
  let degree;
  if (totalResult >= dc + 10) degree = "criticalSuccess";
  else if (totalResult >= dc) degree = "success";
  else if (totalResult > dc - 10) degree = "failure";
  else degree = "criticalFailure";

  if (d20 === 20) degree = shiftUp(degree);
  else if (d20 === 1) degree = shiftDown(degree);
  return degree;
}

function shiftUp(degree) {
  if (degree === "criticalFailure") return "failure";
  if (degree === "failure") return "success";
  if (degree === "success") return "criticalSuccess";
  return degree;
}
function shiftDown(degree) {
  if (degree === "criticalSuccess") return "success";
  if (degree === "success") return "failure";
  if (degree === "failure") return "criticalFailure";
  return degree;
}

/**
 * Resolve one Strike. mapPenalty is a flat modifier already computed by
 * legality.multipleAttackPenalty for this attempt.
 */
export function resolveStrike(rng, { attacker, strike, targetAc, mapPenalty }) {
  const d20 = rollD20(rng);
  const attackTotal = d20 + strike.attackBonus + mapPenalty;
  const degree = degreeOfSuccess(d20, attackTotal, targetAc);

  const result = {
    d20,
    attackBonus: strike.attackBonus,
    mapPenalty,
    total: attackTotal,
    targetAc,
    degree,
    damage: null
  };

  if (degree === "criticalFailure" || degree === "failure") return result;

  const damageEntries = (strike.damage ?? []).map((d) => rollFormula(rng, `${d.dice}${d.bonus >= 0 ? "+" : ""}${d.bonus}`));
  let rawDamage = damageEntries.reduce((sum, e) => sum + e.total, 0);
  if (degree === "criticalSuccess") rawDamage *= 2;

  result.damage = { entries: damageEntries, raw: rawDamage };
  return result;
}

/**
 * Apply Hardness: reduce raw damage by hardness, floored at 0. This is the
 * standard SF2E object rule — Hardness is a flat subtraction per hit, not
 * a percentage and not a resistance-with-exceptions.
 */
export function applyHardness(rawDamage, hardness) {
  return Math.max(0, rawDamage - hardness);
}

/**
 * THE single implementation of "how much of this raw damage actually lands"
 * (design doc §15e). Player Core p.399 order: immunity first, then weakness
 * ADDED, then Hardness subtracted — then Scale-Hardness (design doc §14b)
 * subtracted separately, and only for a "mounted"-trait Strike.
 *
 * WHY THIS EXISTS. This logic was written twice — once in engine.mjs's
 * applyStrikeDamage (what really happens) and once in considerations.mjs's
 * afterMitigation (what the AI predicts). Two implementations of one rule is
 * exactly the shape of the weakness/Hardness ordering bug this project
 * already fixed once; the AI silently mispredicting damage is far worse than
 * a loud crash, because it degrades decisions without ever failing a test.
 *
 * `targetEffective` is a REQUIRED separate argument rather than something the
 * caller folds into `target`, because Hardness must be the damage-state-adjusted
 * value (resolveEffectiveStats halves it at Critical). The old AI-side call had
 * to remember `{ ...target, hardness: targetEffective.hardness }` and would
 * silently compute hardness-of-0 if it forgot. Now forgetting is impossible.
 */
export function mitigateDamage(rawDamage, { target, targetEffective, strike }) {
  if (target.immuneToAllDamage) return 0;
  const withWeakness = rawDamage + (target.weaknessAll || 0);
  let applied = applyHardness(withWeakness, targetEffective.hardness ?? 0);
  if (strike?.traits?.includes("mounted") && target.scaleHardness) {
    applied = applyHardness(applied, target.scaleHardness);
  }
  return applied;
}

/** A basic saving throw (Reflex, typically) against an area effect's DC. */
export function resolveSave(rng, { saveBonus, dc }) {
  const d20 = rollD20(rng);
  const total = d20 + saveBonus;
  const degree = degreeOfSuccess(d20, total, dc);
  return { d20, saveBonus, total, dc, degree };
}

/**
 * Field Repair check (design/scale-and-chassis.md §6): a Crafting check
 * against the rig's own Handling DC — a personnel-scale DC, per §2's rule
 * that a DC is set by the task, never by the enemy's level.
 */
export function resolveFieldRepair(rng, { repairBonus, handlingDC }) {
  const d20 = rollD20(rng);
  const total = d20 + repairBonus;
  const degree = degreeOfSuccess(d20, total, handlingDC);
  const healing = { criticalSuccess: 40, success: 25, failure: 10, criticalFailure: 0 }[degree];
  return { d20, repairBonus, total, dc: handlingDC, degree, healing };
}

/**
 * Evacuate (design/scale-and-chassis.md §14d): a flavor/texture roll for
 * how many civilians a vehicle gets clear this action, not a
 * success/failure check — there's no DC here, the legality gate (distance
 * from the fight) is what makes this a real choice, not a die roll.
 */
export function resolveEvacuation(rng) {
  const civilians = rollFormula(rng, "2d6+2");
  return { civilians: civilians.total, rolls: civilians.rolls };
}

/** Basic-save damage multiplier per SF2E: crit success none, success half, failure full, crit failure double. */
export function basicSaveDamage(rawDamage, degree) {
  switch (degree) {
    case "criticalSuccess": return 0;
    case "success": return Math.floor(rawDamage / 2);
    case "criticalFailure": return rawDamage * 2;
    default: return rawDamage;
  }
}

// ---------------------------------------------------------------------------
// EXPECTED-VALUE RESOLUTION (design doc §15f)
//
// These are the deterministic twins of the roll-the-dice functions above, used
// by the AI's lookahead sandbox. They live HERE, next to the real resolvers,
// rather than in the AI layer, for two reasons:
//   1. Dependency direction. The engine must never import from ai/. Putting the
//      expectation math here keeps it ai/ -> engine/, one way, always.
//   2. Drift. A real resolver and its expectation twin are two statements of one
//      rule. Side by side in one file, a change to one makes the other's
//      staleness obvious; a file apart, it does not.
//
// WHY EXPECTED VALUE AND NOT SAMPLED ROLLOUTS. Scoring candidate plans by
// running one simulated roll each and taking the best is the optimizer's curse:
// you systematically select the plan whose dice were luckiest, not the plan that
// is best. With ~9 mean damage and ~13 standard deviation against the Claimant,
// that is a random number generator with a search attached. Multi-sample fixes
// the bias but costs N x and still leaves sqrt-N noise.
//
// And you cannot cheat by feeding the real roller a 0.5 stream: rollDie(rng, 6)
// with rng() = 0.5 returns floor(0.5*6)+1 = 4, not 3.5, which inflates 3d6 from
// 10.5 to 12 — a silent 14% damage overstatement. Integer dice do not have their
// mean as a face. Analytic expectation is the only correct option, and it is also
// the cheapest (~0.18us vs ~0.89us for a single real roll).
//
// KNOWN BIAS, BOUNDED AND DOCUMENTED: mitigateDamage's max(0, X - hardness) is
// convex, so plugging in mean dice slightly under-counts when Hardness sits near
// the mean damage (Jensen's inequality). Measured against 200k real trials: under
// 0.5% for every configuration this project actually produces, ~3.6% in the
// pathological case where hardness is almost exactly half the mean. resolve.test.mjs's
// DRIFT ALARM pins this.
// ---------------------------------------------------------------------------

/** Average result of an "NdX" formula plus a flat bonus — 3d6+10 -> 3*3.5+10 = 20.5. */
export function averageDamage(dice, bonus) {
  const match = /^(\d+)d(\d+)$/.exec(dice);
  if (!match) throw new Error(`Not a dice formula: "${dice}"`);
  const [, count, sides] = match.map(Number);
  return count * ((sides + 1) / 2) + bonus;
}

export function averageStrikeDamage(strike) {
  return (strike.damage ?? []).reduce((sum, d) => sum + averageDamage(d.dice, d.bonus), 0);
}

/**
 * The probability of each degree of success, found by asking the REAL
 * degreeOfSuccess for all 20 d20 faces rather than deriving a closed form.
 * That makes the nat-20/nat-1 shift and every DC edge case exact by
 * construction instead of approximated.
 */
export function degreeProbabilities(modifier, dc) {
  const counts = { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0 };
  for (let d20 = 1; d20 <= 20; d20++) counts[degreeOfSuccess(d20, d20 + modifier, dc)] += 1;
  return {
    criticalSuccess: counts.criticalSuccess / 20,
    success: counts.success / 20,
    failure: counts.failure / 20,
    criticalFailure: counts.criticalFailure / 20
  };
}

/**
 * Expected damage of one Strike attempt, folding hit probability together with
 * post-mitigation damage. Critically this mitigates the HIT and CRIT amounts
 * SEPARATELY before weighting them — mitigation is per-hit and non-linear, so
 * mitigating a probability-weighted average would be wrong.
 */
export function expectedStrikeDamage({ attackModifier, targetAc, strike, target, targetEffective }) {
  if (target.immuneToAllDamage || target.currentHP <= 0) return 0;
  const effective = targetEffective ?? { hardness: target.hardness ?? 0 };
  const avgRaw = averageStrikeDamage(strike);
  const probs = degreeProbabilities(attackModifier, targetAc);
  const onHit = mitigateDamage(avgRaw, { target, targetEffective: effective, strike });
  const onCrit = mitigateDamage(avgRaw * 2, { target, targetEffective: effective, strike });
  return probs.success * onHit + probs.criticalSuccess * onCrit;
}

/** P(this attack lands at all — success or better). */
export function hitProbability(attackModifier, targetAc) {
  const p = degreeProbabilities(attackModifier, targetAc);
  return p.success + p.criticalSuccess;
}

/**
 * P(this attack reduces the target to 0 HP). Expected damage alone systematically
 * under-values finishing blows: applying 9.2 expected damage to a target on 10 HP
 * leaves it "alive" on 0.8, so a planner keeps chipping and never sees the
 * terminal payoff. Lethality has to be its own term.
 */
export function killProbability({ attackModifier, targetAc, strike, target, targetEffective }) {
  if (target.immuneToAllDamage || target.currentHP <= 0) return 0;
  const effective = targetEffective ?? { hardness: target.hardness ?? 0 };
  const avgRaw = averageStrikeDamage(strike);
  const probs = degreeProbabilities(attackModifier, targetAc);
  let p = 0;
  if (mitigateDamage(avgRaw, { target, targetEffective: effective, strike }) >= target.currentHP) p += probs.success;
  if (mitigateDamage(avgRaw * 2, { target, targetEffective: effective, strike }) >= target.currentHP) p += probs.criticalSuccess;
  return p;
}

/** Expected HP restored by one Field Repair — mirrors resolveFieldRepair's own healing table. */
export function expectedRepairHealing({ repairBonus, handlingDC }) {
  const p = degreeProbabilities(repairBonus, handlingDC);
  return p.criticalSuccess * 40 + p.success * 25 + p.failure * 10 + p.criticalFailure * 0;
}

/** Expected civilians cleared by one Evacuate — mirrors resolveEvacuation's "2d6+2". */
export function expectedEvacuationCivilians() {
  return averageDamage("2d6", 2);
}
