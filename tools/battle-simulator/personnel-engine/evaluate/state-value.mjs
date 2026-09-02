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
 *
 * ADDED, not a port of anything Frame-scale: `stunDenial` (design doc §22/§24, Erabryth's Forced
 * Reflection) prices a stunned combatant's still-owed actions (Player Core pg. 421's real Stunned
 * VALUE, not a number of whole rounds — see engine.mjs's own header for the bug this corrected),
 * symmetric for allies/enemies. `lowHpCaution`
 * and `outnumberedCaution` (also §22, Ingram's direct ask about retreating when hurt/outnumbered)
 * are MULTIPLIERS applied to threatExposure at the point of use in evaluateState, not new additive
 * terms of their own — see the comment there for why.
 */
import { resolveEffectiveStats } from "../combatant.mjs";
import { expectedStrikeDamage, expectedSaveDamage, degreeProbabilities } from "../../engine/resolve.mjs";
import { distanceFeet, reachFeetForStrike, FEET_PER_SQUARE } from "../grid.mjs";
import { lineOfEffect, hasCover, STANDARD_COVER_AC_BONUS } from "../terrain.mjs";
import { pathCost } from "../world/pathfind.mjs";
import { splitByRelation } from "../factions.mjs";
import { isRestrained, isImmobilized, isOffGuardFromConditions, attackerConditionPenalty } from "../conditions.mjs";

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
 * The TRUE legal maximum range — as opposed to usefulRangeFeet's "worth using without a range
 * penalty" — for a ranged Strike this is the real 6th-increment cap (Player Core pg. 254,
 * legality.mjs's own checkStrikeRange: `increment * 6`), not just the first, no-penalty increment.
 * Spells/saveAttacks/melee are identical to usefulRangeFeet (a flat `.range` or melee reach has no
 * increment concept to widen).
 *
 * Design doc §27 (Ingram's adversarial-audit finding #2): decide.mjs's cover-seeking search
 * (bestCoverDestination) used usefulRangeFeet as its own range gate, which is STRICTER than the
 * range the AI is otherwise perfectly willing to fight at — real logs show 2nd-increment shots
 * (a real, if -2-penalized, legal attack) fired constantly, while cover-seeking would refuse to
 * walk that same real distance for a reachable covered position. Exists as its own function,
 * not a usefulRangeFeet change, because usefulRangeFeet's OTHER callers (the closing gradient,
 * bestExpectedDamage, the myRanges standoff candidates) are about "worth approaching to without a
 * penalty," a genuinely different, already-correct question this fix must not disturb.
 */
export function maxLegalRangeFeet(item) {
  if (item.range != null) return item.range;
  if (item.strikeType === "melee") return reachFeetForStrike(item);
  return item.rangeIncrement != null ? item.rangeIncrement * 6 : Infinity;
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
 * The attacker's own Frightened AND Prone penalties ARE folded in here, via the shared
 * attackerConditionPenalty (unlike MAP, which bestExpectedDamage deliberately excludes as a
 * transient per-attempt penalty), because both are genuinely persistent state changes — "how good
 * is this combatant right now" — that the evaluator needs to see to correctly value inflicting them
 * on an enemy (or suffering them on an ally). This is the whole mechanism behind the
 * Demoralize/Trip-then-attack tactics scoring correctly: the moment a target's `frightened` is set
 * or `prone` becomes true, EVERY subsequent evaluateState call sees their AC drop (combatant.mjs's
 * resolveEffectiveStats, via isOffGuardFromConditions) and their own outgoing attackModifier drop
 * (here) — both directions automatically, with no separate weight term needed.
 *
 * REGRESSION FIX (design doc §41, Stage 0): this function used to hand-roll only the frightened
 * half of attackerConditionPenalty inline (`- (attacker.frightened ?? 0)`) instead of calling the
 * real shared function — the exact "two statements of one rule" drift class resolve.mjs's own
 * header warns about. A prone attacker's real -2 was invisible to threatExposure/offensiveReach
 * from the moment Trip shipped until this fix; conditions.mjs's own attackerConditionPenalty was
 * always the correct, complete source of truth and is now the one this function actually calls.
 *
 * NOT threaded into a saveAttack's own `dc`,
 * even though a frightened attacker's DC should technically also drop ("a penalty to all your
 * checks and DCs") — a deliberate, small, stated scope cut: saveAttack DCs are precomputed at
 * fixture-generation time (deriveClassDC), not re-derived live from a rank+ability pair, and
 * neither real fixture in play depends on this edge case.
 *
 * `walls` (design doc §22): folds in the same standard-cover check (+2 AC / +2 Reflex, Player Core
 * pg. 416) the real engine applies at resolution time (personnel-engine/engine.mjs), so a position
 * that would grant cover against a threat is automatically priced as safer here too -- no separate
 * evaluator weight needed, the same "elegant, not bolted on" shape as Frightened's own evaluator
 * integration above: cover lowers the estimated damage a target behind it would take, which
 * threatExposure/offensiveReach already turn into a real positional preference on their own.
 */
export function bestExpectedDamage(attacker, fromPos, target, targetPos, walls) {
  const targetEffective = resolveEffectiveStats(target);
  const coverBonus = hasCover(fromPos, targetPos, walls) ? STANDARD_COVER_AC_BONUS : 0;
  let best = 0;
  const dist = distanceFeet(fromPos, targetPos);
  for (const option of attackOptions(attacker)) {
    // Restrained (condition-34-restrained.json): "can't use any attack ... actions" — an
    // attack-ROLL option (Strike/spellAttack; distinguished the same way this function already
    // does one line below — carries attackBonus, not saveType) is impossible for a restrained
    // attacker to actually use. A save-based option (saveAttack) isn't an attack-roll action at
    // all and stays available, matching legality.mjs's own checkNotRestrained scope exactly — this
    // is the piece that makes a successful Grapple's real tactical value ("this enemy mostly can't
    // hurt us now") visible to threatExposure/offensiveReach with no new evaluator weight needed.
    if (option.attackBonus != null && isRestrained(attacker)) continue;
    if (dist > usefulRangeFeet(option)) continue; // out of useful range from here
    const value = option.saveType != null
      ? expectedSaveDamage({
          saveBonus: target.saves[option.saveType] + (option.saveType === "ref" ? coverBonus : 0), dc: option.dc,
          damage: option.damage, target, targetEffective
        })
      : expectedStrikeDamage({
          attackModifier: option.attackBonus + attackerConditionPenalty(attacker),
          targetAc: targetEffective.ac + coverBonus,
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
  resource: 3.0,           // HP-equivalent of keeping one limited-use item unspent
  // NOT YET MEASURED (design doc §22) — a reasoned starting point, not a guess pulled from nowhere:
  // roughly the same order of magnitude as `resource` (a comparably "temporary tactical value, not
  // permanent HP" concept), well below what a real kill is worth. Flagged exactly like `closing`
  // above so a future ablation pass has something concrete to correct rather than silently drift.
  // Priced PER ACTION lost, not per round (design doc §24 — Stunned carries a VALUE, the number of
  // actions lost, Player Core pg. 421; a real "Stunned 2" costs exactly 2 actions, not two whole
  // rounds). Rescaled from an earlier 3.0-per-ROUND figure to keep the same rough magnitude at the
  // unit that actually matters now — 3 actions lost (≈ one full round) still prices out to ≈3.0.
  //
  // RENAMED from stunDenial (design doc §42, Stage 1): originally generalized beyond Stunned to
  // price every "owed action" state at this SAME rate — Prone and Grabbed/Restrained included. Design
  // doc §44 SPLIT that back apart: `tempoDenial` now prices ONLY Stunned, a CERTAIN, immediate,
  // uncontested loss (Player Core pg. 421 — the value IS the actions lost, no further roll needed).
  // Prone/Grabbed's own "owed" value is fundamentally different in kind — CONTESTED by a real future
  // roll (Stand is one free action any time; Escape can simply succeed) and, for Grapple specifically,
  // dependent on someone actually following up before it lapses — see `maneuverTempoDenial` below for
  // why pricing it at this SAME certain-loss rate was the real bug. Deliberately does NOT re-price
  // Restrained's own "can't attack" half a second time either way — that's already priced via
  // bestExpectedDamage's restrained exclusion (design doc §40) through threatExposure/offensiveReach;
  // re-adding it here would double-count the same real fact through two different mechanisms.
  tempoDenial: 1.0,        // HP-equivalent of one CERTAIN lost action (Stunned only)
  // NOT YET MEASURED — split out of tempoDenial (design doc §44), found chasing a real, measured
  // win-rate regression: the no-maneuvers baseline (§43) won 66.7% of fights to the maneuver-capable
  // party's 40.0%, despite 96%+ real conversion. Root cause, confirmed by direct probe against real
  // fixtures: Trip/Grapple are skill checks, NEVER subject to Multiple Attack Penalty — so their
  // FLAT tempo credit doesn't shrink on a turn's 2nd/3rd action the way a real Strike's own MAP-
  // discounted expected damage does, making a fresh Grapple (dealing zero damage) look worth MORE
  // than continuing to attack (Vorza vs. Erabryth, 3rd action of a turn, real fixtures: Strike 1.225,
  // Grapple 1.958 — a 60% premium for doing nothing). Priced at setupValue's own existing rate (0.3)
  // on purpose: both terms represent the SAME kind of thing — real value that depends on a future
  // event (an ally's follow-up; the target's own failed escape roll) rather than Stunned's certain,
  // already-resolved loss — reusing an established "conditional future value" rate rather than
  // inventing a new one. Re-measured against the same no-maneuvers comparison after this change —
  // see §44's own numbers; still flagged NOT YET MEASURED beyond that one real data point.
  maneuverTempoDenial: 0.3,
  // NOT YET MEASURED (design doc §22 — Ingram's direct ask: "give PCs a greater reason to get out
  // of line of sight of baddies" when hurt, "and the same logic could apply to enemies"). Both are
  // MULTIPLIERS on threatExposure, not separate additive terms — see evaluateState's own comment at
  // the point of use for why. 1.0 at full health/parity (no change from today's behavior); scales
  // up smoothly, no threshold/cliff. Reasoned starting points, same "flag for a future ablation
  // pass" status as closing/tempoDenial above, not pre-tuned against real data yet.
  // design doc §35: raised from 2.0, and the ramp changed from linear to cubic (see the point of
  // use) — the old 3x ceiling (0.36 effective) never got remotely close to competing with a real
  // attack's 1.0-per-HP scale; at 0 HP this now reaches 9x (1.08 effective), just past parity.
  lowHpCaution: 8.0,
  outnumberedCaution: 1.0, // seeing 2 enemies per visible ally doubles it; 3 per ally triples it
  // NOT YET MEASURED (design doc §42, Stage 1 — "setup value"). A debuff that lowers an enemy's
  // effective AC is worth MORE the sooner someone can capitalize on it — a Trip with 3 allies still
  // to act this round is a genuinely different play than the identical Trip on the round's last
  // turn, even though offensiveReach alone scores them identically (it has no notion of initiative
  // position at all). Reuses offensiveReach's own bestExpectedDamage / per-enemy-HP-cap machinery
  // exactly, restricted to allies who haven't acted yet this round — additive ON TOP of
  // offensiveReach on purpose (a still-to-act ally's potential is real AND immediate, so it's
  // correctly worth strictly more than an already-acted ally's, with no need to subtract anything
  // from the already-proven, monotonicity-safe term this borrows its structure from). Strictly below
  // enemyDamage for the identical monotonicity reason offensiveReach already is — see the WEIGHTS
  // test asserting this directly.
  setupValue: 0.3,
  // NOT YET MEASURED (design doc §42, Stage 1 — "mobility denial"). The symmetric counterpart to
  // `closing`, scored about the ENEMY's own frustrated mobility rather than mine: closing only ever
  // prices MY OWN side's need to approach, so an enemy pinned out of its own useful range by
  // Grapple/Immobilized was previously invisible to this evaluator entirely — grappling a melee
  // attacker who was already out of reach scored no differently than grappling one already adjacent.
  // Same unit as closing (squares short of range), same starting magnitude, for the same "a denied
  // approach is worth roughly what an urgent approach costs" intuition. Capped at the enemy's own
  // remaining HP for the identical monotonicity reason as offensiveReach/setupValue — a naive
  // currentHP<=0 gate here (rather than a smooth per-HP cap) would make the killing blow on a
  // far-pinned enemy score WORSE than a graze, the exact bug class §17/§32 already found and fixed
  // elsewhere; caught here by hand before it ever shipped, not by a failing test.
  mobilityDenial: 0.75,
  // NOT YET MEASURED (design doc §55 — the roster-generalization sweep's own real, diagnosed loss:
  // baseline-v1 lost 75% of the time to aggressive-v1 on a roster with real hard-hitting melee
  // weapons, from a Trip converted by TWO attackers in one round before the target could Stand).
  // Unlike closing/setupValue/mobilityDenial above, this one's own inner computation already folds
  // in a real success probability (degreeProbabilities, the same math maneuverTempoOwed uses) and a
  // real probability-weighted damage delta (bestExpectedDamage, prone vs. not) — so the raw number
  // per ally is already a genuine expected-HP figure, not a hand-picked unit. Started at roughly
  // threatExposure's own order of magnitude (both are "real expected damage, discounted for being
  // about a hypothetical future attack rather than the current turn") — a reasoned starting point
  // for the search to correct, exactly the role closing/setupValue/mobilityDenial already play.
  pileOnRisk: 0.25
};

/**
 * How many actions this combatant CERTAINLY, immediately owes — Stunned alone (design doc §44 split
 * this apart from the maneuver-applied conditions below; see `tempoDenial`'s own comment for why).
 * A real, exact, already-tracked count (Player Core pg. 421).
 */
function tempoOwed(combatant) {
  return combatant.stunnedValue ?? 0;
}

/**
 * How much CONTESTED, future-dependent tempo this combatant owes — priced separately from
 * `tempoOwed` at `maneuverTempoDenial`'s own, lower rate (design doc §44; see that weight's own
 * comment for the real win-rate regression that motivated the split). Prone owes exactly 1 (the real
 * cost of Stand — but Stand is a free action available any time, unlike Stunned's own no-choice
 * loss). Grabbed/Restrained owes the REAL expected number of Escape attempts before freedom —
 * computed from the actual Athletics-vs-DC odds (engine.mjs's own real Escape formula, design doc
 * §41's regression fix: the grappler's Athletics DC only, never Fortitude), not a flat guess —
 * capped at 4 attempts so a near-impossible escape doesn't send this term toward infinity. Both are
 * CONTESTED by a real future roll the target might simply win, unlike Stunned's own already-resolved
 * certainty. Deliberately does NOT price Restrained's own "can't attack" half a second time — see
 * `tempoDenial`'s own comment on why.
 */
function maneuverTempoOwed(combatant, combatantsMap) {
  let owed = 0;
  if (combatant.prone) owed += 1;
  if (combatant.grappledBy) {
    const grappler = combatantsMap.get(combatant.grappledBy.attackerId);
    const dc = 10 + (grappler?.athleticsModifier ?? 0);
    const modifier = combatant.athleticsModifier ?? 0;
    const probs = degreeProbabilities(modifier, dc);
    const pFree = probs.success + probs.criticalSuccess;
    owed += pFree > 0 ? Math.min(4, 1 / pFree) : 4;
  }
  return owed;
}

/**
 * Evaluate `state` from `side`'s point of view, in hit-point-equivalents. Higher is better for
 * that side. Absolute magnitude is meaningless; only DIFFERENCES between two states matter, which
 * is how it is always used.
 *
 * `actingCombatantId` (design doc §42, Stage 1) is OPTIONAL and defaults to null — every existing
 * caller that omits it (every test, decide.mjs's own callers before this change) gets exactly the
 * same score as before this parameter existed; only the new setupValue term below ever reads it.
 */
export function evaluateState(state, side, weights = DEFAULT_WEIGHTS, actingCombatantId = null) {
  const all = [...state.combatants.values()];
  // Faction-aware (factions.mjs), not a raw side filter — see that file's own header.
  const { allies, enemies } = splitByRelation({ id: null, side }, all);

  let score = 0;

  for (const ally of allies) {
    score += weights.allyDamage * ally.currentHP;
    score -= weights.tempoDenial * tempoOwed(ally); // Stunned only — a certain, already-resolved lost action
    score -= weights.maneuverTempoDenial * maneuverTempoOwed(ally, state.combatants); // Prone/Grabbed — contested by a real future roll, priced lower (design doc §44)
    for (const s of [...(ally.strikes ?? []), ...(ally.spells ?? []), ...(ally.healAbilities ?? []), ...(ally.saveAttacks ?? []), ...(ally.conditionSaves ?? [])]) {
      if (s.usesRemaining != null) score += weights.resource * s.usesRemaining;
    }
  }
  for (const enemy of enemies) {
    score -= weights.enemyDamage * enemy.currentHP;
    score += weights.tempoDenial * tempoOwed(enemy); // symmetric: an enemy's own certain lost action is exactly as valuable to us as our own would be costly
    score += weights.maneuverTempoDenial * maneuverTempoOwed(enemy, state.combatants);
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

    // Deferred, not applied inline: the low-HP/outnumbered caution factors below need this ally's
    // FULL visible-enemy count first, so threatExposure's actual cost is applied in a second pass
    // once both factors are known, not threaded mid-loop. Keeps enemy IDENTITY (not just the
    // damage number) alongside each entry — pileOnRisk below needs to know WHICH enemy is which to
    // separate "the one who might trip me" from "everyone else who'd cash in on it".
    const visibleEnemies = [];
    for (const enemy of enemies) {
      if (enemy.currentHP <= 0) continue;
      const enemyPos = state.positions.get(enemy.id);
      if (!enemyPos) continue;
      if (state.walls?.length && !lineOfEffect(allyPos, enemyPos, state.walls)) continue; // no real shot exists from here
      reachByEnemy.set(enemy.id, (reachByEnemy.get(enemy.id) ?? 0) + bestExpectedDamage(ally, allyPos, enemy, enemyPos, state.walls));
      visibleEnemies.push({ enemy, enemyPos, damage: bestExpectedDamage(enemy, enemyPos, ally, allyPos, state.walls) });
    }

    // LOW-HP CAUTION (design doc §22 — "give PCs a greater reason to get out of line of sight of
    // baddies" when hurt). Scales the SAME threatExposure cost just collected above, rather than
    // adding a separate mechanism: a position that grants an enemy LOS already costs
    // threatExposure*theirExpectedDamage; this just makes that cost weigh more heavily as
    // currentHP falls, so the "disengage" move candidate decide.mjs already offers every turn
    // (bestDestinationAway) starts scoring better once staying visible is genuinely dangerous.
    // Symmetric by construction: this loop runs once per side (whichever side `allies` currently
    // means), so a low-HP enemy gets the identical treatment when evaluateState is called from ITS
    // side's perspective — "the same logic could apply to enemies" falls out for free, no separate
    // branch needed.
    //
    // REGRESSION FIX (design doc §35 — Ingram's own report, watching real play: "tokens still don't
    // run for cover... everything stops being a simulation and ends up looking very strange"; §31's
    // audit had already measured the same thing directly: 72% of real low-HP turns show ZERO
    // movement, 0% show a pure retreat, even at 1 HP). Root cause: the OLD linear curve capped out
    // at a mere 3x even at 0 HP (1 + lowHpCaution=2.0) — threatExposure's own base weight (0.12) is
    // so heavily discounted that even its maximum possible value (0.36) never got remotely close to
    // enemyDamage/allyDamage's 1.0-per-HP scale, so a real, mediocre attack routinely outscored full
    // retreat regardless of how badly hurt anyone was. Two changes, together: `lowHpCaution` raised
    // (2.0 -> 8.0) so the CEILING can actually compete with a real attack near death's door, and the
    // ramp changed from linear to CUBIC in (1-hpFraction) so that higher ceiling only actually bites
    // in roughly the last quarter of HP — deliberately still continuous, no threshold/cliff (exactly
    // the kind of discontinuity the §22 "moving 3x is an alarm" bug taught this project to avoid),
    // just a curve shaped so caution stays close to baseline through most of the HP range and climbs
    // sharply only once things are genuinely dire. Measured, not guessed — see design doc §35's own
    // before/after real-log comparison.
    const hpFraction = ally.maxHP > 0 ? ally.currentHP / ally.maxHP : 1;
    const lowHpFactor = 1 + weights.lowHpCaution * Math.pow(1 - hpFraction, 3);

    // OUTNUMBERED CAUTION (design doc §22 — "enemies which feel like they are outnumbered because
    // they can see more enemies than they can see friends"). PERCEIVED local balance from this
    // exact position, not the global roster count — matches ai/knowledge/belief.mjs's own "only
    // what can actually be perceived" epistemic framing already used everywhere else in this
    // engine. Neutral (1x) at parity or better (seeing at least as many allies+self as enemies);
    // scales up only once visible enemies genuinely outnumber visible allies+self.
    // visibleEnemies.length IS this ally's visible-enemy count (identical LOS gate already
    // applied above) — only visibleAllies needs its own small pass.
    let visibleAllies = 0;
    for (const other of allies) {
      if (other.id === ally.id || other.currentHP <= 0) continue;
      const otherPos = state.positions.get(other.id);
      if (otherPos && (!state.walls?.length || lineOfEffect(allyPos, otherPos, state.walls))) visibleAllies++;
    }
    const outnumberedRatio = visibleEnemies.length / (visibleAllies + 1);
    const outnumberedFactor = 1 + weights.outnumberedCaution * Math.max(0, outnumberedRatio - 1);

    // AGGRESSION (design doc §35 — Ingram's own ask: "maybe we could have some characters act more
    // aggressive, moving towards enemies"). A real, opt-in per-combatant field (`ally.aggression`,
    // default 1 — every existing fixture is completely unaffected until one is deliberately given a
    // different value) that dampens THIS combatant's OWN caution, and only their own: it's read
    // inside the per-ally loop, so an aggressive combatant's teammates keep their own normal
    // caution unchanged. A value above 1 divides the caution factor down (less afraid of exposure,
    // so closing/attacking options naturally start outscoring retreat more often — an emergent
    // consequence of reduced fear, not a second, separate "want to attack" mechanism); a value
    // below 1 would do the reverse for a deliberately skittish combatant, though nothing in the
    // current roster uses that direction.
    const cautionFactor = (lowHpFactor * outnumberedFactor) / (ally.aggression ?? 1);
    for (const { damage } of visibleEnemies) score -= weights.threatExposure * cautionFactor * damage;

    // PILE-ON RISK (design doc §55 — a real, diagnosed loss: baseline-v1 lost 75% of the time to
    // aggressive-v1 on a roster with real hard-hitting melee weapons, because one enemy's Trip let a
    // SECOND enemy also capitalize on the SAME off-guard window before the target could Stand — 18
    // damage in one round on a 24-HP combatant, read directly from a real transcript). Nothing above
    // catches this: threatExposure only prices each visible enemy's CURRENT independent damage, with
    // no notion that a maneuver landing hands every OTHER attacker a shared bonus at once, and
    // outnumberedCaution's own headcount ratio is neutral at the ordinary 2-enemies-vs-2-allies case
    // even when both enemies are about to focus the SAME target.
    //
    // Skipped once already off-guard (isOffGuardFromConditions) — at that point the risk has already
    // materialized into the CURRENT state, and threatExposure above already prices it correctly via
    // bestExpectedDamage's own real prone/off-guard AC read; adding this on top would double-count.
    if (!isOffGuardFromConditions(ally)) {
      // Trip and Grapple share the IDENTICAL real DC formula (engine.mjs's own outcomes.trip/
      // outcomes.grapple: Athletics modifier vs 10 + target's Fortitude save) — one probability
      // covers "would some maneuver against this ally, from this enemy, land" for either.
      let pileOnRisk = 0;
      for (const { enemy: maneuverer, enemyPos: maneuvererPos } of visibleEnemies) {
        if (maneuverer.athleticsModifier == null) continue; // opt-in, matching decide.mjs's own trip/shove/grapple gating
        if (distanceFeet(allyPos, maneuvererPos) > FEET_PER_SQUARE) continue; // Trip/Grapple are both melee-range Athletics checks
        const dc = 10 + ally.saves.fort;
        const probs = degreeProbabilities(maneuverer.athleticsModifier, dc);
        const pLands = probs.success + probs.criticalSuccess;
        if (pLands <= 0) continue;
        const proneAlly = { ...ally, prone: true };
        for (const { enemy: other, enemyPos: otherPos, damage: normalDamage } of visibleEnemies) {
          if (other.id === maneuverer.id) continue; // their OWN follow-up is already priced by threatExposure above
          const offGuardDamage = bestExpectedDamage(other, otherPos, proneAlly, allyPos, state.walls);
          pileOnRisk += pLands * Math.max(0, offGuardDamage - normalDamage);
        }
      }
      score -= weights.pileOnRisk * cautionFactor * pileOnRisk;
    }
  }
  for (const enemy of enemies) {
    const raw = reachByEnemy.get(enemy.id);
    if (!raw) continue;
    score += weights.offensiveReach * Math.min(raw, enemy.currentHP);
  }

  // SETUP VALUE (design doc §42, Stage 1) — see DEFAULT_WEIGHTS' own comment for the full
  // reasoning. Structurally identical to offensiveReach just above (same bestExpectedDamage
  // currency, same per-enemy-HP cap, same monotonicity proof by inheritance), restricted to allies
  // who come AFTER actingCombatantId in this round's real initiative order — i.e. who haven't acted
  // yet and can genuinely capitalize on a debuff applied right now. Deliberately additive on top of
  // offensiveReach, not a replacement for it: an already-acted ally's potential is still real (worth
  // something next round), just not worth AS much as an about-to-act ally's immediate one.
  if (actingCombatantId && state.initiativeOrder) {
    const myIndex = state.initiativeOrder.indexOf(actingCombatantId);
    if (myIndex !== -1) {
      const stillToActIds = new Set(state.initiativeOrder.slice(myIndex + 1));
      const setupByEnemy = new Map();
      for (const ally of allies) {
        if (ally.currentHP <= 0 || !stillToActIds.has(ally.id)) continue;
        const allyPos = state.positions.get(ally.id);
        if (!allyPos) continue;
        for (const enemy of enemies) {
          if (enemy.currentHP <= 0) continue;
          const enemyPos = state.positions.get(enemy.id);
          if (!enemyPos) continue;
          if (state.walls?.length && !lineOfEffect(allyPos, enemyPos, state.walls)) continue;
          setupByEnemy.set(enemy.id, (setupByEnemy.get(enemy.id) ?? 0) + bestExpectedDamage(ally, allyPos, enemy, enemyPos, state.walls));
        }
      }
      for (const enemy of enemies) {
        const raw = setupByEnemy.get(enemy.id);
        if (!raw) continue;
        score += weights.setupValue * Math.min(raw, enemy.currentHP);
      }
    }
  }

  // CLOSING GRADIENT — the fix for a flat evaluator. offensiveReach and threatExposure are both
  // exactly 0 while out of weapon range, so without this term every distant position scores
  // IDENTICALLY and the evaluator provides no reason to approach anything. GATED: applies only
  // while a combatant is short of its own best useful range, and vanishes at zero the moment it is
  // in range — an ungated "closer is better" term is farmable (a unit already in range would keep
  // walking forever to harvest more of it).
  //
  // REGRESSION FIX (design doc §32, adversarial-audit finding): this used to filter to
  // `enemy.currentHP <= 0` LIVING enemies only when searching for "nearest" — so killing the
  // currently-nearest enemy (even one already well within range, contributing nothing here) made
  // the search jump to whoever was next, often much farther away, and RETROACTIVELY penalized the
  // ally for "not closing" on a fight a teammate just finished — a direct violation of this file's
  // own §17 monotonicity requirement (proven directly: killing an already-in-range 1-HP enemy
  // dropped a real evaluated score by over 10 points). Fix: don't exclude dead enemies from the
  // search at all. `state.positions` keeps every combatant's position forever, alive or dead (see
  // engine.mjs's own livingPositions comment), and dying doesn't move anyone — so a dead enemy's
  // entry here is IDENTICAL before and after their own death, meaning `nearest` (a min over a set
  // whose membership and values are now both unchanged by any kill) can only ever stay exactly the
  // same, never jump. A genuinely closer LIVING enemy is still correctly picked over a farther
  // corpse, same as before — only the "reassign to someone farther on death" discontinuity is gone.
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

  // MOBILITY DENIAL (design doc §42, Stage 1) — see DEFAULT_WEIGHTS' own comment for the full
  // reasoning. The symmetric counterpart to closing just above: the first term in this file to
  // score an ENEMY's own positional frustration from my side's perspective, since closing only ever
  // prices MY side's need to approach. Deliberately does NOT gate on `enemy.currentHP <= 0` the way
  // an early draft of this term did — that would create exactly the discontinuous-cliff monotonicity
  // bug §17/§32 already found and fixed for offensiveReach/closing (a far-pinned enemy's own credit
  // here could be large; a hard cutoff at death would make the killing blow score WORSE than a
  // graze). The `Math.min(denied, enemy.currentHP)` cap below is the same real fix, reused.
  for (const enemy of enemies) {
    if (!isImmobilized(enemy)) continue;
    const enemyPos = state.positions.get(enemy.id);
    if (!enemyPos) continue;
    const ranges = proactiveAttackOptions(enemy).map(usefulRangeFeet).filter((r) => Number.isFinite(r));
    if (!ranges.length) continue;
    const reach = Math.max(...ranges);
    let nearest = Infinity;
    for (const ally of allies) {
      const aPos = state.positions.get(ally.id);
      if (aPos) nearest = Math.min(nearest, effectiveDistance(state, enemyPos, aPos));
    }
    if (nearest === Infinity || nearest <= reach) continue; // already in its own range — nothing meaningfully denied
    const denied = (nearest - reach) / FEET_PER_SQUARE;
    score += weights.mobilityDenial * Math.min(denied, enemy.currentHP);
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
