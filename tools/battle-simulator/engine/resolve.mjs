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
