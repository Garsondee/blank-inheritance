/**
 * State evaluation (design doc §15i) — "how good is this position, for this side?"
 *
 * THIS IS THE PIECE THE OLD AI DID NOT HAVE, and its absence is why movement was
 * broken. The previous system scored every move candidate at a flat `value: 1`,
 * so a brilliant flanking manoeuvre and a pointless shuffle were numerically
 * identical, and an in-range combatant generated no move candidate at all. There
 * was no way to ask "is standing there better than standing here?"
 *
 * Design rules this obeys, each learned from a specific failure:
 *
 *  - **Score STATES, not actions.** An action is worth exactly the difference
 *    between the state it produces and the state you were in. That is what makes
 *    "reposition to where my gun reaches" and "shoot" comparable in one currency.
 *
 *  - **Potential-based positional terms.** Positional value is a potential Φ(s),
 *    and an action's positional worth is Φ(s') − Φ(s). A round trip therefore nets
 *    exactly zero and oscillation cannot profit — this project has a documented
 *    five-round instance of a combatant bouncing between two points because a
 *    re-derived positional gradient rewarded each leg (§14i).
 *
 *  - **Everything is in one currency: hit points.** Not normalized [0,1] weights.
 *    Normalizing hides the exchange rate between a civilian and a hit point inside
 *    curve shapes where nobody can review it. Here every term is "worth about this
 *    many HP of damage," which is arguable in the open.
 *
 *  - **Damage-state breakpoints are kept as STEPS, not smoothed.** resolveEffectiveStats
 *    drops a combatant's action cap 3→2→1 at 2/3 and 1/3 HP. Pushing an enemy over
 *    one of those edges costs it a whole action next round, which is worth far more
 *    than the raw HP suggests. Smoothing HP into a monotone ramp would delete the
 *    single most interesting thing lookahead can find.
 */
import { resolveEffectiveStats, damageStateFor, DAMAGE_STATES } from "../../engine/combatant.mjs";
import { expectedStrikeDamage } from "../../engine/resolve.mjs";
import { distanceFeet, reachFeetForStrike, FEET_PER_SQUARE } from "../../engine/grid.mjs";

/** Every attack option a combatant has, strikes and attack spells alike. */
export function attackOptions(combatant) {
  const out = [];
  for (const s of combatant.strikes ?? []) if (s.usesRemaining == null || s.usesRemaining > 0) out.push(s);
  for (const s of combatant.spells ?? []) if (s.usesRemaining == null || s.usesRemaining > 0) out.push(s);
  return out;
}

/** The distance at which an option is actually worth using — flat range for a spell, reach for melee, one increment for a gun. */
export function usefulRangeFeet(item) {
  if (item.range != null) return item.range;
  if (item.strikeType === "melee") return reachFeetForStrike(item);
  return item.rangeIncrement ?? Infinity;
}

/**
 * Best expected damage this attacker could do to this target from `fromPos`,
 * at zero multiple-attack-penalty. Used both for "what can I threaten from here"
 * and "what can they threaten me with" — the same function, arguments swapped,
 * so threat and opportunity can never be priced on different scales.
 */
export function bestExpectedDamage(attacker, fromPos, target, targetPos) {
  const targetEffective = resolveEffectiveStats(target);
  let best = 0;
  const dist = distanceFeet(fromPos, targetPos);
  for (const option of attackOptions(attacker)) {
    if (dist > usefulRangeFeet(option)) continue; // out of useful range from here
    const value = expectedStrikeDamage({
      attackModifier: option.attackBonus,
      targetAc: targetEffective.ac,
      strike: option, target, targetEffective
    });
    if (value > best) best = value;
  }
  return best;
}

/** Numeric penalty a damage state imposes, expressed as "actions lost per round". */
function actionsLost(state) {
  if (state === DAMAGE_STATES.HULKED) return 3;
  if (state === DAMAGE_STATES.CRITICAL) return 2;
  if (state === DAMAGE_STATES.DEGRADED) return 1;
  return 0;
}

export const DEFAULT_WEIGHTS = {
  enemyDamage: 1.0,        // an HP off an enemy is the unit everything else is priced against
  allyDamage: 1.0,         // an HP off us is worth exactly as much as an HP off them
  // MEASURED CORRECTION (design doc §15k). This started at 0.55 — symmetric with
  // offensiveReach — and produced a party that refused to fight. A vehicle computed
  // `0.75 x its own ~9 damage - 0.55 x the Claimant's ~30 damage` and rationally
  // concluded it should never approach; utilization FELL to 40.9% and party victories
  // collapsed from 61/80 to 13/80. The error was treating "damage I might take next
  // round, if they target me, if they hit" as commensurate with "damage I will deal
  // now." It is a probabilistic future cost against one of several possible targets,
  // and belongs heavily discounted.
  threatExposure: 0.12,
  offensiveReach: 0.75,    // expected outgoing damage available from here — the whole reason to reposition
  actionDenial: 8.0,       // ~HP-equivalent of costing an enemy one action per round via a damage-state breakpoint
  objective: 2.5,          // per square of progress toward/away from a scripted objective — the party's real win condition
  civilians: 2.5,          // HP-equivalent of one civilian evacuated; explicit and arguable, not hidden in a curve
  closing: 3.0,          // per square short of weapon range — the gradient that makes approaching worth doing at all
  spotted: 4.0,            // HP-equivalent of an ally holding a +2 circumstance bonus for its next attack
  resource: 3.0            // HP-equivalent of keeping one limited-use item unspent
};

/**
 * Evaluate `state` from `side`'s point of view, in hit-point-equivalents.
 * Higher is better for that side. Absolute magnitude is meaningless; only
 * DIFFERENCES between two states matter, which is how it is always used.
 */
export function evaluateState(state, side, weights = DEFAULT_WEIGHTS) {
  const all = [...state.combatants.values()];
  const allies = all.filter((c) => c.side === side);
  const enemies = all.filter((c) => c.side !== side);

  let score = 0;

  for (const ally of allies) {
    score += weights.allyDamage * ally.currentHP;
    score -= weights.actionDenial * actionsLost(damageStateFor(ally.currentHP, ally.maxHP));
    // A Spot that has not been cashed in yet is real stored value. Without this term the
    // evaluator cannot see ANY benefit from Spot, so a dedicated spotter scores it at exactly
    // 0 and never does its job — which is precisely what happened on the first measured run.
    if (ally.spotted) score += weights.spotted;
    for (const s of [...(ally.strikes ?? []), ...(ally.spells ?? []), ...(ally.healAbilities ?? [])]) {
      if (s.usesRemaining != null) score += weights.resource * s.usesRemaining;
    }
  }
  for (const enemy of enemies) {
    score -= weights.enemyDamage * enemy.currentHP;
    score += weights.actionDenial * actionsLost(damageStateFor(enemy.currentHP, enemy.maxHP));
  }

  // Positional terms — computed for LIVING combatants only, and always as a
  // symmetric pair so "I can hit them" and "they can hit me" share one scale.
  for (const ally of allies) {
    if (ally.currentHP <= 0) continue;
    const allyPos = state.positions.get(ally.id);
    if (!allyPos) continue;
    for (const enemy of enemies) {
      if (enemy.currentHP <= 0) continue;
      const enemyPos = state.positions.get(enemy.id);
      if (!enemyPos) continue;
      score += weights.offensiveReach * bestExpectedDamage(ally, allyPos, enemy, enemyPos);
      score -= weights.threatExposure * bestExpectedDamage(enemy, enemyPos, ally, allyPos);
    }
  }

  // CLOSING GRADIENT (design doc §15k) — the fix for a flat evaluator.
  //
  // offensiveReach and threatExposure are both exactly 0 while out of weapon range,
  // so without this term every distant position scores IDENTICALLY and the evaluator
  // provides no reason to approach anything. Measured symptom: the Frame spent four
  // consecutive rounds on move/move/move, 900ft per round, never attacking — it was
  // choosing arbitrarily among a set of tied options.
  //
  // The term is GATED: it applies only while a combatant is short of its own best
  // useful range, and vanishes at zero the moment it is in range. That matters. An
  // ungated "closer is better" term is farmable — a unit already in range would keep
  // walking toward the enemy forever to harvest more of it, and the mirror-image
  // "further is safer" term would produce infinite kiting. Gating makes approach
  // worth exactly as much as it needs to be and not one point more.
  for (const ally of allies) {
    if (ally.currentHP <= 0) continue;
    const allyPos = state.positions.get(ally.id);
    if (!allyPos) continue;
    const ranges = attackOptions(ally).map(usefulRangeFeet).filter((r) => Number.isFinite(r));
    if (!ranges.length) continue;
    const reach = Math.max(...ranges);
    let nearest = Infinity;
    for (const enemy of enemies) {
      if (enemy.currentHP <= 0) continue;
      const ePos = state.positions.get(enemy.id);
      if (ePos) nearest = Math.min(nearest, distanceFeet(allyPos, ePos));
    }
    if (nearest === Infinity || nearest <= reach) continue; // in range already — no credit to farm
    score -= weights.closing * ((nearest - reach) / FEET_PER_SQUARE); // squares still short of a shot
  }

  // Objective progress. A combatant with a scripted `objective` is trying to reach
  // it; its own side gains as it closes, the other side loses. Measured in squares
  // so the term does not swamp everything at this map's 50ft scale.
  for (const c of all) {
    if (!c.objective || c.currentHP <= 0) continue;
    const pos = state.positions.get(c.id);
    if (!pos) continue;
    const squaresAway = distanceFeet(pos, c.objective) / 50;
    const progress = weights.objective * squaresAway;
    if (c.side === side) score -= progress; else score += progress;
  }

  // Civilians already gotten clear. Read straight off state so Evacuate has a price at all —
  // without this the action scores exactly 0 and the Runabout, whose entire designed role is
  // evacuation, simply stops doing it.
  score += weights.civilians * (state.civiliansEvacuated ?? 0);

  return score;
}

/**
 * The value of a state to `side`, PLUS credit for civilians already gotten clear.
 * Kept separate from evaluateState because civilians live on the scenario's own
 * running tally rather than on combatant state.
 */
export function evaluateWithObjectives(state, side, { civiliansEvacuated = 0 } = {}, weights = DEFAULT_WEIGHTS) {
  return evaluateState(state, side, weights) + weights.civilians * civiliansEvacuated;
}
