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
import { lineOfEffect } from "../../engine/terrain.mjs";
import { pathCost } from "../world/pathfind.mjs";
import { splitByRelation } from "../../engine/factions.mjs";

/**
 * REGRESSION (design doc §15q, found by running a real synthetic-wall battle, not by
 * inspection): straight-line distanceFeet becomes actively MISLEADING once a wall sits
 * between two combatants — it reports them as nearly touching through a wall that fully
 * separates them, which sent the closing-gradient term below into genuine infinite
 * oscillation (verified: two combatants cycling the exact same four-round position
 * sequence forever, never converging, every synthetic-wall battle timing out).
 *
 * The fix is gated on a CHEAP check first: lineOfEffect is a handful of line-segment
 * intersection tests, not a search. Only when it reports the direct line is actually
 * blocked does this reach for real Dijkstra path cost — expensive, but rare, and only
 * ever paid when a scenario defines walls at all (every scenario in this project does
 * not, today, so this function is a straight distanceFeet passthrough for all of them).
 */
// MEASURED PERFORMANCE FIX (design doc §16, stress-test mission's first real run): decide() calls
// evaluateState once per candidate proposal (potentially dozens), and this function sits inside
// evaluateState's O(allies x enemies) closing-gradient loop — every LOS-blocked pair pays for a
// fresh full-grid Dijkstra flood via pathCost, uncached, every single time. Measured contributing
// several SECONDS per decide() call on an 11-combatant, 2-building scenario, on top of (and
// separate from) ai/decide.mjs's own destination-cache fix.
//
// Cached keyed on `state.walls` itself, not per-call: pathCost's inputs here are `from`, `to`,
// `state.gridSize`, and `state.walls` — occupiedPositions is hardcoded empty (see the call below),
// so occupancy changes between a battle's `before` state and any sandboxed `after` clone are
// irrelevant to this specific calculation. gridSize/walls never change for the life of one battle,
// and cloneStateForPlanning shares `state.walls` BY REFERENCE across every sandbox fork of it
// (engine.mjs's own documented contract) — so a WeakMap keyed on that one shared array correctly
// scopes the cache to exactly one battle's terrain and is never reused across a different scenario
// with a different walls array, without needing any explicit cache lifecycle management at all.
const distanceCache = new WeakMap();

function effectiveDistance(state, from, to) {
  if (!state.walls?.length || lineOfEffect(from, to, state.walls)) return distanceFeet(from, to);
  let cache = distanceCache.get(state.walls);
  if (!cache) { cache = new Map(); distanceCache.set(state.walls, cache); }
  // Distance is symmetric — normalize so A->B and B->A share one cache entry.
  const [a, b] = `${from.col},${from.row}` <= `${to.col},${to.row}` ? [from, to] : [to, from];
  const key = `${a.col},${a.row}|${b.col},${b.row}`;
  if (cache.has(key)) return cache.get(key);
  const cost = pathCost({ from: a, to: b, maxFeet: 100000, gridSize: state.gridSize, occupiedPositions: [], walls: state.walls });
  const result = Number.isFinite(cost) ? cost : distanceFeet(from, to) * 10; // unreachable at all — treat as very far, not infinite (keeps the term finite and comparable)
  cache.set(key, result);
  return result;
}

/** Every attack option a combatant has, strikes and attack spells alike. */
export function attackOptions(combatant) {
  const out = [];
  for (const s of combatant.strikes ?? []) if (s.usesRemaining == null || s.usesRemaining > 0) out.push(s);
  for (const s of combatant.spells ?? []) if (s.usesRemaining == null || s.usesRemaining > 0) out.push(s);
  return out;
}

/**
 * attackOptions minus anything reactionOnly (design doc §16) — the subset a combatant would ever
 * proactively seek RANGE for. A reaction-only weapon (the Claimant's Sweep, fired only through its
 * Claim reaction) is still a completely real threat when evaluated from the OTHER direction — see
 * bestExpectedDamage, which deliberately keeps using unfiltered attackOptions so everyone else's
 * threatExposure still respects it. This filtered view exists only for "what should I move toward
 * to use MY OWN weapon," where a reaction-only strike must never register as a reason to close in.
 */
export function proactiveAttackOptions(combatant) {
  return attackOptions(combatant).filter((s) => !s.reactionOnly);
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
  // MEASURED CORRECTION (design doc §17). This was 0.75, and at that value the AI would not fight.
  // Head-to-head against a trivial "always take the best attack" baseline, the real AI lost 0-12 in
  // the swarm archetype; the action mix showed why — on one seed it spent 37 of 42 actions moving,
  // took TWO attacks in a nine-round battle, and dealt 16 total damage against the baseline's 959.
  //
  // The cause is a currency error, not a movement bug. offensiveReach pays for *being able to deal*
  // damage, and enemyDamage pays for *actually dealing* it. At 0.75-vs-1.0 those are nearly the
  // same price — but threatening is far cheaper to buy, because one reposition can bring several
  // enemies into range at once while an attack can only ever hurt one. Worse, once an enemy's
  // remaining HP is the binding constraint (the monotonicity cap above), an attack's NET value
  // falls to (enemyDamage - offensiveReach) = 0.25 per point of damage, while a move that opens a
  // new firing line still pays the full 0.75. Repositioning therefore dominated attacking by
  // roughly 3:1 in exactly the situations where attacking was the whole point.
  //
  // 0.2 restores the intended hierarchy: dealing damage is the primary currency, and position is a
  // tiebreaker that decides WHERE to be when two options are otherwise close. The closing gradient
  // below — which is gated and vanishes on arrival — remains the term responsible for making the
  // AI approach at all, which is the job offensiveReach was wrongly being asked to share.
  offensiveReach: 0.2,     // positional tiebreaker: expected outgoing damage available from here
  actionDenial: 8.0,       // ~HP-equivalent of costing an enemy one action per round via a damage-state breakpoint
  objective: 2.5,          // per square of progress toward/away from a scripted objective — the party's real win condition
  civilians: 2.5,          // HP-equivalent of one civilian evacuated; explicit and arguable, not hidden in a curve
  // MEASURED CORRECTION (design doc §18, the ablation harness's first real catch). Was 3.0.
  // run-ablation.mjs isolates one weight at a time and re-measures head-to-head win rate against
  // `greedy` — on range-asymmetry, REMOVING closing entirely raised the win rate from 25% to 50%
  // (+25 percentage points). A term that helps more by being deleted is not a tiebreaker, it is
  // actively steering the wrong direction, and the mechanism is the same currency error offensiveReach
  // was just fixed for above: at 3.0/square, closing paid MORE for approaching than offensiveReach
  // (0.2) pays for actually threatening once arrived, let alone what enemyDamage (1.0) pays for
  // really dealing damage — so a unit already close enough to fight could still be pulled further
  // by a "one more square closer" credit worth more than acting. 1.0 keeps the term's original job
  // (giving a genuinely stranded unit SOME reason to approach, since offensiveReach/threatExposure
  // are both exactly 0 outside weapon range and would otherwise make every distant position look
  // identical — see the original §15k note below) without letting it outbid the actions it exists
  // to lead into. Re-measured after this change: range-asymmetry's full-strength win rate rose from
  // 25% to 42%, and ablating closing at the new weight no longer improves on removing it (~flat) —
  // the sign of the bug is gone, not just its magnitude reduced.
  closing: 0.75,
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
  // Faction-aware (engine/factions.mjs), not a raw side filter: a scenario with a neutral side (a
  // civilian convoy) must fold into the PARTY's allies bucket — allyDamage's existing "an HP off
  // us is worth exactly as much as an HP off them" scoring is exactly "the party wants this
  // protected," no new term needed — while never appearing in a party evaluation's enemies bucket,
  // where enemyDamage would otherwise price the party as WANTING its HP down.
  const { allies, enemies } = splitByRelation({ id: null, side }, all);

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
  //
  // REGRESSION (design doc §15q): bestExpectedDamage is range-only — it has no idea a wall
  // sits between the two positions. That let the evaluator see a phantom "I can hit them!"
  // through solid terrain (the real sandbox/legality layer would correctly reject the strike,
  // but the STATIC evaluation driving move selection never got that far), which combined with
  // offensiveReach's high weight (0.75) to actively pull combatants toward positions pressed
  // up against a wall for a shot that could never actually be taken — the real cause of the
  // infinite oscillation effectiveDistance() alone didn't fix. Gated the same way: a cheap
  // lineOfEffect check first, only paid at all when a scenario actually defines walls.
  //
  // THE MONOTONICITY REQUIREMENT (design doc §17) — the single most important structural property
  // in this file, and the one two separate measured bugs have now violated:
  //
  //     Reducing an enemy's HP must NEVER reduce this side's score.
  //
  // offensiveReach is the term that keeps breaking it, because it pays for *having a live enemy
  // in range* — so anything that kills enemies destroys its own reward. Formally, the requirement
  // is d(score)/d(enemyHP) <= 0, and the enemy-HP-dependent terms are:
  //     -weights.enemyDamage * HP        (gradient -1.0)
  //     +offensiveReach contribution     (gradient +? — this is the dangerous one)
  //
  // FIRST BUG (§16): offensiveReach credited each ally with the target's FULL damage potential
  // regardless of remaining HP, so killing a 7-HP Claimant three allies could reach destroyed 44
  // points of phantom overkill credit against +7 enemyDamage and +8 actionDenial. Striking scored
  // -24.47 versus +4.00 for a pointless Spot. Fixed by capping each pair's credit at the enemy's
  // currentHP.
  //
  // SECOND BUG (§17, found by the tactical benchmark, NOT by that fix's own tests): capping
  // PER PAIR is still wrong, because the caps then sum. With N allies in range of one enemy the
  // gradient is +weights.offensiveReach * N, which beats enemyDamage's -1.0 as soon as N >= 2.
  // At the 0.75 weight that means every fight with two or more allies converging on one target
  // still punished hurting it — precisely the multi-unit case the archetype battery exercises,
  // and precisely why the AI spread damage (61% mid-turn target-switch rate in the swarm
  // archetype) and lost head-to-head to a trivial "attack the nearest thing" baseline.
  //
  // THE FIX: cap the TOTAL offensiveReach credit for each enemy at that enemy's remaining HP,
  // once, after summing across allies. The gradient is then at most +weights.offensiveReach
  // (0.75) regardless of how many allies are in range, which is strictly less than enemyDamage's
  // 1.0 — so the invariant holds by construction for any party size, and continues to hold at the
  // moment of death (the credit tends to 0 as HP does, so there is no discontinuity to exploit).
  // value-function-sanity.test.mjs asserts the invariant directly rather than trusting this note.
  //
  // threatExposure keeps its per-pair SUM deliberately: being shot at by four enemies really is
  // four times as dangerous as one, and that term shrinking when an enemy dies is a *gain*, so it
  // pushes in the right direction already and cannot violate the requirement above.
  const reachByEnemy = new Map();
  for (const ally of allies) {
    if (ally.currentHP <= 0) continue;
    const allyPos = state.positions.get(ally.id);
    if (!allyPos) continue;
    for (const enemy of enemies) {
      if (enemy.currentHP <= 0) continue;
      const enemyPos = state.positions.get(enemy.id);
      if (!enemyPos) continue;
      if (state.walls?.length && !lineOfEffect(allyPos, enemyPos, state.walls)) continue; // no real shot exists from here
      reachByEnemy.set(enemy.id, (reachByEnemy.get(enemy.id) ?? 0) + bestExpectedDamage(ally, allyPos, enemy, enemyPos));
      score -= weights.threatExposure * bestExpectedDamage(enemy, enemyPos, ally, allyPos);
    }
  }
  for (const enemy of enemies) {
    const raw = reachByEnemy.get(enemy.id);
    if (!raw) continue;
    score += weights.offensiveReach * Math.min(raw, enemy.currentHP);
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
  //
  // REGRESSION FIX (GH issue #24 — found chasing design doc §57's own Frame-scale research pass,
  // the exact monotonicity bug personnel-engine's own evaluate/state-value.mjs already fixed for
  // this identical term, design doc §32): this used to filter to LIVING enemies only when searching
  // for "nearest" — so killing the currently-nearest enemy (even one already well within range,
  // contributing nothing here) made the search jump to whoever was next, often much farther away,
  // and RETROACTIVELY penalized the ally for "not closing" on a fight a teammate just finished, a
  // direct violation of the monotonicity requirement (reducing an enemy's HP must never reduce this
  // side's score). Fix: don't exclude dead enemies from the search at all. `state.positions` keeps
  // every combatant's position forever, alive or dead (confirmed directly: this engine never calls
  // `state.positions.delete`), and dying doesn't move anyone — so a dead enemy's entry here is
  // IDENTICAL before and after their own death, meaning `nearest` (a min over a set whose membership
  // and values are now both unchanged by any kill) can only ever stay exactly the same, never jump.
  // A genuinely closer LIVING enemy is still correctly picked over a farther corpse, same as before
  // — only the "reassign to someone farther on death" discontinuity is gone.
  for (const ally of allies) {
    if (ally.currentHP <= 0) continue;
    const allyPos = state.positions.get(ally.id);
    if (!allyPos) continue;
    const ranges = proactiveAttackOptions(ally).map(usefulRangeFeet).filter((r) => Number.isFinite(r));
    if (!ranges.length) continue;
    const reach = Math.max(...ranges);
    let nearest = Infinity;
    for (const enemy of enemies) {
      const ePos = state.positions.get(enemy.id);
      if (ePos) nearest = Math.min(nearest, effectiveDistance(state, allyPos, ePos));
    }
    if (nearest === Infinity || nearest <= reach) continue; // in range already — no credit to farm
    score -= weights.closing * ((nearest - reach) / FEET_PER_SQUARE); // squares still short of a shot
  }

  // Objective progress. A combatant with a scripted `objective` is trying to reach
  // it; its own side gains as it closes, the other side loses. Measured in squares
  // so the term does not swamp everything at this map's 50ft scale.
  //
  // FIX (design doc §16, stress-test mission): this used to also skip DEAD combatants
  // (`|| c.currentHP <= 0`), which meant killing an objective-pursuing enemy DELETED the
  // credit for however far it still was from that objective, rather than locking it in — on a
  // real transcript this cost the party 27.5 points for killing a 7-HP Claimant, on top of the
  // offensiveReach overkill problem fixed just above, together enough to make finishing it off
  // score worse than Spot. A dead combatant's position is frozen forever, so its distance from
  // an objective it will now never reach again is not a fact that should vanish — if anything
  // it is the BEST possible version of "still far away," permanently. Keeping the term (using
  // wherever it died) means killing an objective-holder can never score worse than leaving it
  // alive at that same position, which is the actual invariant this term should guarantee.
  for (const c of all) {
    if (!c.objective) continue;
    const pos = state.positions.get(c.id);
    if (!pos) continue;
    const squaresAway = distanceFeet(pos, c.objective) / FEET_PER_SQUARE;
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
