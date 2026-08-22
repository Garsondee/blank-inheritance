/**
 * Pure scoring primitives for the utility-AI framework (design doc §14h).
 * Every function here is mechanically grounded in the SAME functions the
 * engine actually resolves rolls with (degreeOfSuccess from resolve.mjs) —
 * an AI that privately estimated hit chance a different way than the
 * engine actually rolls it would silently drift from reality the moment
 * either one changed. There is exactly one source of truth for "how
 * likely is this attack to land," and both the resolver and the AI read
 * it from the same place.
 *
 * No RNG here — everything is an EXPECTED VALUE (probability-weighted
 * average), not a simulated roll. That's the whole point of scoring
 * candidates before committing to one.
 */
import { degreeOfSuccess, mitigateDamage } from "../engine/resolve.mjs";

/** Average result of an "NdX+B" formula — 3d6+10 -> 3*3.5+10 = 20.5. */
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
 * P(criticalSuccess) and P(success) for a roll at the given total modifier
 * against a DC, found the same way the real engine will roll it: try
 * every d20 face and ask degreeOfSuccess. Not a closed-form approximation
 * — this automatically gets the nat-20/nat-1 shift and edge cases
 * (DC so low/high a face changes category) exactly right because it's
 * asking the real function, not reimplementing its logic.
 */
export function degreeProbabilities(modifier, dc) {
  const counts = { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0 };
  for (let d20 = 1; d20 <= 20; d20++) {
    counts[degreeOfSuccess(d20, d20 + modifier, dc)] += 1;
  }
  return {
    criticalSuccess: counts.criticalSuccess / 20,
    success: counts.success / 20,
    failure: counts.failure / 20,
    criticalFailure: counts.criticalFailure / 20
  };
}

/**
 * REMOVED 2026-08-23 (design doc §15e): `afterMitigation` used to live here
 * as a second, hand-copied implementation of engine.mjs's damage-mitigation
 * rule. Two implementations of one rule is precisely the shape of the
 * weakness/Hardness ordering bug this project already fixed once — and an AI
 * that silently mispredicts damage is worse than a crash, because it degrades
 * every decision without ever failing a test. The single implementation now
 * lives in engine/resolve.mjs as `mitigateDamage`, and both the engine and
 * this module call it.
 */

/**
 * Expected damage of one Strike attempt, folding in hit probability AND
 * post-mitigation damage — the single most important number for scoring
 * "is this attack worth taking." An immune target correctly scores exactly
 * 0 here (afterMitigation always returns 0 for it via the immuneToAllDamage
 * check below) — this is what lets the AI naturally avoid wasting a
 * limited-use weapon on a shielded target, as a CONSEQUENCE of honest
 * expected-value math, not a special-cased "don't do that" rule.
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

/** P(this Strike lands at all — success or better), for non-damage considerations like "is this worth the action." */
export function hitProbability(attackModifier, targetAc) {
  const probs = degreeProbabilities(attackModifier, targetAc);
  return probs.success + probs.criticalSuccess;
}

/**
 * Healing-by-degree for a Field Repair check — MUST stay in sync with
 * resolve.mjs's resolveFieldRepair, which rolls this same table for real
 * (Player Core-style Crafting check against the rig's own Handling DC).
 * Kept here, not re-derived, so the two can never silently diverge.
 */
const REPAIR_HEALING_BY_DEGREE = { criticalSuccess: 40, success: 25, failure: 10, criticalFailure: 0 };

/** Expected HP restored by one Field Repair attempt — the Ladle's equivalent of expectedStrikeDamage. */
export function expectedRepairHealing({ repairBonus, handlingDC }) {
  const probs = degreeProbabilities(repairBonus, handlingDC);
  return probs.criticalSuccess * REPAIR_HEALING_BY_DEGREE.criticalSuccess
    + probs.success * REPAIR_HEALING_BY_DEGREE.success
    + probs.failure * REPAIR_HEALING_BY_DEGREE.failure
    + probs.criticalFailure * REPAIR_HEALING_BY_DEGREE.criticalFailure;
}

/** Average civilians gotten clear by one Evacuate action — resolve.mjs's resolveEvacuation rolls "2d6+2" for real; this is its expected value, no RNG. */
export const AVERAGE_EVACUATION_CIVILIANS = averageDamage("2d6", 2);
