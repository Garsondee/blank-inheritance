/**
 * State evaluation for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../../ai/evaluate/state-value.mjs. "How good is this position, for this side?" — action is
 * worth exactly the difference between the state it produces and the state you were in, which is
 * what makes moving, attacking, and healing comparable in one currency (hit points).
 *
 * WHAT'S DROPPED, and why:
 *  - actionDenial and its actionsLost() helper: rewards pushing an enemy across a damage-state
 *    action-cap breakpoint (3->2->1 actions). combatant.mjs's personnel-scale resolveEffectiveStats
 *    has no such breakpoints — a real PC/NPC has exactly ONE threshold, alive (3 actions) vs. dead
 *    (0), already fully priced by enemyDamage/allyDamage and the win condition itself. Nothing left
 *    for this term to reward.
 *  - spotted: the Spot mechanic (design/scale-and-chassis.md §14d) doesn't exist for ordinary SF2E
 *    creatures — Frame-scale's whole "vehicle spots for the Frame" relationship has no personnel-
 *    scale equivalent.
 *  - civilians and evaluateWithObjectives: Evacuate-specific (state.civiliansEvacuated), which
 *    personnel-engine's engine.mjs never produces at all (no Evacuate action exists here).
 *
 * KEPT, unchanged in shape: enemyDamage/allyDamage (the fundamental currency), threatExposure and
 * offensiveReach (including the hard-won §17 monotonicity fix — capping TOTAL offensiveReach
 * credit per enemy at that enemy's remaining HP, summed across allies, so the invariant
 * "reducing an enemy's HP must never reduce this side's score" holds regardless of party size),
 * the closing gradient (gated, vanishes on arrival), the objective-progress term (still a real,
 * opt-in general mechanism — decide.mjs still offers move-toward-objective candidates even with
 * no proposal type spending an action on it directly), and resource (limited-use tracking,
 * directly relevant to Lunar-17's Transfer Vitality and any ordnance either combatant carries).
 *
 * ONE REAL FIX, not just a port: the objective-progress term below divides by a literal `50`
 * feet-per-square in the Frame-scale original (`distanceFeet(pos, c.objective) / 50`) rather than
 * the FEET_PER_SQUARE constant that same file imports and uses correctly in the closing-gradient
 * term just above it — harmless there only because FEET_PER_SQUARE happens to equal 50 in that
 * tree. Blindly copying the literal `50` here would silently score objective progress in
 * Frame-scale squares on a 5ft grid — a real 10x error, not a cosmetic one. This port uses the
 * imported FEET_PER_SQUARE constant instead.
 *
 * A NOTED, NOT YET RESOLVED, scale-sensitivity: the closing-gradient term divides a real foot-gap
 * by FEET_PER_SQUARE to get "squares still short of a shot" — at 5ft that's 10x more squares for
 * the same foot-gap than the Frame-scale 50ft grid produced, so `closing`'s DEFAULT_WEIGHTS value
 * (carried over unchanged below) is NOT assumed to behave the same way here. This is exactly the
 * kind of thing design doc §19's own plan calls for a fresh measurement pass on, once a real
 * personnel-scale fight exists to test against (§17-§18's ablation-harness discipline) — not
 * pre-emptively re-tuned now without data.
 */
import { resolveEffectiveStats } from "../combatant.mjs";
import { expectedStrikeDamage, expectedSaveDamage } from "../../engine/resolve.mjs";
import { distanceFeet, reachFeetForStrike, FEET_PER_SQUARE } from "../grid.mjs";
import { lineOfEffect } from "../terrain.mjs";
import { pathCost } from "../world/pathfind.mjs";
import { splitByRelation } from "../factions.mjs";

/**
 * Straight-line distanceFeet becomes actively MISLEADING once a wall sits between two combatants —
 * it reports them as nearly touching through a wall that fully separates them. Gated on a CHEAP
 * check first: lineOfEffect is a handful of line-segment intersection tests, not a search. Only
 * when it reports the direct line is actually blocked does this reach for real Dijkstra path cost.
 *
 * Cached keyed on `state.walls` itself: pathCost's inputs here are `from`, `to`, `state.gridSize`,
 * and `state.walls` — occupiedPositions is hardcoded empty (see the call below), so occupancy
 * changes between a battle's `before` state and any sandboxed `after` clone are irrelevant.
 * gridSize/walls never change for the life of one battle, and cloneStateForPlanning shares
 * `state.walls` BY REFERENCE across every sandbox fork (engine.mjs's own documented contract), so
 * a WeakMap keyed on that one shared array correctly scopes the cache to exactly one battle's
 * terrain with no explicit lifecycle management needed.
 */
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
  const result = Number.isFinite(cost) ? cost : distanceFeet(from, to) * 10; // unreachable at all — treat as very far, not infinite
  cache.set(key, result);
  return result;
}

/** Every attack option a combatant has — Strikes, attack spells, and save-based attacks (a saveAttack is distinguished by carrying `saveType`, never `attackBonus`; see bestExpectedDamage below). */
export function attackOptions(combatant) {
  const out = [];
  for (const s of combatant.strikes ?? []) if (s.usesRemaining == null || s.usesRemaining > 0) out.push(s);
  for (const s of combatant.spells ?? []) if (s.usesRemaining == null || s.usesRemaining > 0) out.push(s);
  for (const s of combatant.saveAttacks ?? []) if (s.usesRemaining == null || s.usesRemaining > 0) out.push(s);
  return out;
}

/**
 * attackOptions minus anything reactionOnly — the subset a combatant would ever proactively seek
 * RANGE for. This filtered view exists only for "what should I move toward to use MY OWN weapon";
 * bestExpectedDamage deliberately keeps using unfiltered attackOptions so everyone else's
 * threatExposure still respects a reaction-only weapon as a real threat.
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
 * Best expected damage this attacker could do to this target from `fromPos`, at zero multiple-
 * attack-penalty. Used both for "what can I threaten from here" and "what can they threaten me
 * with" — the same function, arguments swapped, so threat and opportunity can never be priced on
 * different scales.
 *
 * Branches on shape, not a `type` field — an attack-roll option (Strike/spell) carries
 * `attackBonus`; a save-based option (saveAttack) carries `saveType`/`dc` and no `attackBonus` at
 * all, since the TARGET rolls, not the attacker (see personnel-engine/engine.mjs's own header on
 * why this also means it's never subject to MAP).
 *
 * The attacker's own Frightened value IS folded in here (unlike MAP, which bestExpectedDamage
 * deliberately excludes as a transient per-attempt penalty) because Frightened is a genuinely
 * persistent state change — "how good is this combatant right now" — that the evaluator needs to
 * see to correctly value inflicting it on an enemy (or suffering it on an ally). This is the whole
 * mechanism behind the Demoralize-then-attack tactic scoring correctly: the moment a target's
 * `frightened` is set, EVERY subsequent evaluateState call sees their AC drop (combatant.mjs's
 * resolveEffectiveStats) and their own outgoing attackModifier drop (here) — both directions
 * automatically, with no separate weight term needed. NOT threaded into a saveAttack's own `dc`,
 * even though a frightened attacker's DC should technically also drop ("a penalty to all your
 * checks and DCs") — a deliberate, small, stated scope cut: saveAttack DCs are precomputed at
 * fixture-generation time (deriveClassDC), not re-derived live from a rank+ability pair, and
 * neither real fixture in play depends on this edge case.
 */
export function bestExpectedDamage(attacker, fromPos, target, targetPos) {
  const targetEffective = resolveEffectiveStats(target);
  let best = 0;
  const dist = distanceFeet(fromPos, targetPos);
  for (const option of attackOptions(attacker)) {
    if (dist > usefulRangeFeet(option)) continue; // out of useful range from here
    const value = option.saveType != null
      ? expectedSaveDamage({
          saveBonus: target.saves[option.saveType], dc: option.dc,
          damage: option.damage, target, targetEffective
        })
      : expectedStrikeDamage({
          attackModifier: option.attackBonus - (attacker.frightened ?? 0),
          targetAc: targetEffective.ac,
          strike: option, target, targetEffective
        });
    if (value > best) best = value;
  }
  return best;
}

export const DEFAULT_WEIGHTS = {
  enemyDamage: 1.0,        // an HP off an enemy is the unit everything else is priced against
  allyDamage: 1.0,         // an HP off us is worth exactly as much as an HP off them
  threatExposure: 0.12,    // probabilistic future cost — heavily discounted, see the Frame-scale history this was measured against
  offensiveReach: 0.2,     // positional tiebreaker: expected outgoing damage available from here
  objective: 2.5,          // per square of progress toward/away from a scripted objective, if any combatant carries one
  // NOT YET RE-MEASURED at this scale — see this file's own header. Carried over as a starting
  // point only, per design doc §19's own explicit plan to re-measure once real fights exist.
  closing: 0.75,
  resource: 3.0            // HP-equivalent of keeping one limited-use item unspent
};

/**
 * Evaluate `state` from `side`'s point of view, in hit-point-equivalents. Higher is better for
 * that side. Absolute magnitude is meaningless; only DIFFERENCES between two states matter, which
 * is how it is always used.
 */
export function evaluateState(state, side, weights = DEFAULT_WEIGHTS) {
  const all = [...state.combatants.values()];
  // Faction-aware (factions.mjs), not a raw side filter — see that file's own header.
  const { allies, enemies } = splitByRelation({ id: null, side }, all);

  let score = 0;

  for (const ally of allies) {
    score += weights.allyDamage * ally.currentHP;
    for (const s of [...(ally.strikes ?? []), ...(ally.spells ?? []), ...(ally.healAbilities ?? []), ...(ally.saveAttacks ?? [])]) {
      if (s.usesRemaining != null) score += weights.resource * s.usesRemaining;
    }
  }
  for (const enemy of enemies) {
    score -= weights.enemyDamage * enemy.currentHP;
  }

  // Positional terms — computed for LIVING combatants only, and always as a symmetric pair so
  // "I can hit them" and "they can hit me" share one scale.
  //
  // THE MONOTONICITY REQUIREMENT (design doc §17) — the single most important structural property
  // in this file, and the one two separate measured bugs at Frame-scale violated:
  //
  //     Reducing an enemy's HP must NEVER reduce this side's score.
  //
  // offensiveReach is the term that keeps breaking it, because it pays for *having a live enemy in
  // range* — so anything that kills enemies destroys its own reward. THE FIX: cap the TOTAL
  // offensiveReach credit for each enemy at that enemy's remaining HP, once, after summing across
  // allies (not capped per-pair, which still lets N allies' capped credits sum past enemyDamage's
  // gradient). The gradient is then at most +weights.offensiveReach regardless of party size,
  // strictly less than enemyDamage's 1.0 — so the invariant holds by construction, and continues
  // to hold at the moment of death (the credit tends to 0 as HP does). value-function-sanity tests
  // assert this invariant directly rather than trusting this comment.
  //
  // threatExposure keeps its per-pair SUM deliberately: being shot at by four enemies really is
  // four times as dangerous as one, and that term shrinking when an enemy dies is a *gain*, so it
  // cannot violate the requirement above.
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

  // CLOSING GRADIENT — the fix for a flat evaluator. offensiveReach and threatExposure are both
  // exactly 0 while out of weapon range, so without this term every distant position scores
  // IDENTICALLY and the evaluator provides no reason to approach anything. GATED: applies only
  // while a combatant is short of its own best useful range, and vanishes at zero the moment it is
  // in range — an ungated "closer is better" term is farmable (a unit already in range would keep
  // walking forever to harvest more of it).
  for (const ally of allies) {
    if (ally.currentHP <= 0) continue;
    const allyPos = state.positions.get(ally.id);
    if (!allyPos) continue;
    const ranges = proactiveAttackOptions(ally).map(usefulRangeFeet).filter((r) => Number.isFinite(r));
    if (!ranges.length) continue;
    const reach = Math.max(...ranges);
    let nearest = Infinity;
    for (const enemy of enemies) {
      if (enemy.currentHP <= 0) continue;
      const ePos = state.positions.get(enemy.id);
      if (ePos) nearest = Math.min(nearest, effectiveDistance(state, allyPos, ePos));
    }
    if (nearest === Infinity || nearest <= reach) continue; // in range already — no credit to farm
    score -= weights.closing * ((nearest - reach) / FEET_PER_SQUARE); // squares still short of a shot
  }

  // Objective progress. A combatant with a scripted `objective` is trying to reach it; its own
  // side gains as it closes, the other side loses. Measured in squares via FEET_PER_SQUARE (see
  // this file's own header for why this must not be a hardcoded `50`).
  //
  // A dead combatant's position is frozen forever, so its distance from an objective it will now
  // never reach again is not a fact that should vanish on death — keeping the term (using wherever
  // it died) means killing an objective-holder can never score worse than leaving it alive at that
  // same position.
  for (const c of all) {
    if (!c.objective) continue;
    const pos = state.positions.get(c.id);
    if (!pos) continue;
    const squaresAway = distanceFeet(pos, c.objective) / FEET_PER_SQUARE;
    const progress = weights.objective * squaresAway;
    if (c.side === side) score -= progress; else score += progress;
  }

  return score;
}
