/**
 * The decision layer for the PERSONNEL-SCALE engine (design doc §19) — ported from
 * ../ai/decide.mjs. Actions are scored by the STATE they produce, not a hand-assigned magnitude:
 * every candidate is applied to a private sandbox running the real engine, and its score is
 * `evaluate(after) - evaluate(before)`. Movement candidates are always generated (an in-range
 * combatant still gets real move options, not zero). Legality is never re-derived — a candidate is
 * "legal" iff the real engine accepts it in the sandbox. Randomness comes from its own stream (see
 * decisionRng), never the battle's own rng.
 *
 * WHAT'S DROPPED, and why — Field Repair / Spot / Evacuate / Advance proposals: none of those
 * action types exist in this tree's engine.mjs at all (Ladle/vehicle/Day-1/Claimant-specific — see
 * that file's own header), so nothing here can legally propose them either.
 *
 * The Large+-only `stepCandidates` special case (offering Step specifically to close the last
 * square onto a reaction-capable enemy) is ALSO dropped, for a different reason: it existed
 * entirely to let the AI discover "close via Step instead of Move" as the way to avoid provoking
 * the Claimant's Claim reaction. This tree's engine.mjs fires NO reactions at all right now (see
 * its header — a real NPC reaction needs its own real trigger condition, not yet extracted), so
 * Step and Move currently produce IDENTICAL sandbox outcomes; generating both would only double
 * the sandbox forks per decision for zero behavioral difference. checkStepLegality/the "step"
 * action type both still exist in legality.mjs/engine.mjs — an AI or a future extension can still
 * propose one directly — this is only about what generateProposals bothers to manufacture on its
 * own. Revisit once a real reaction with a real trigger condition is wired up (design doc §19
 * Phase 2/3).
 *
 * KEPT as a genuinely general mechanism, unlike the above: objective-directed movement
 * (`me.objective` — "move toward this point," with no dedicated action type spending a point on
 * it, since Advance itself is Claimant-only). Nothing in the current plan's fixtures sets it, but
 * it costs nothing while unset (same opt-in-field pattern as `vision`/`walls`) and could plausibly
 * matter for a scripted NPC in a later personnel-scale scenario (e.g. "run for the alarm").
 *
 * WHOLE-TURN PLANNING (design doc §43, Stage 2 of the tactical-planning report): at full competence,
 * `decide()` no longer scores one action at a time. Trip's own immediate delta is small — it spends
 * an action for no direct HP/positional payoff — so a purely greedy, called-fresh-each-action
 * chooser routinely misses "Trip, then Strike, Strike" even though the SEQUENCE is far stronger than
 * any of its parts scored alone: by the time greedy re-evaluates after Trip, it has no memory of why
 * Trip was worth it. `planTurn` searches a small, named portfolio of TURN TEMPLATES over the real
 * remaining action budget instead — see TURN_TEMPLATES' own comment for why templates rather than a
 * full branching search. `competence < 1` is deliberately untouched by any of this — see decide()'s
 * own comment for the scoping reason.
 */
import { forkTurnSandbox } from "./engine.mjs";
import { makeRng } from "../engine/rng.mjs";
import { distanceFeet, isInBounds, isOccupied, blocksPassage, FEET_PER_SQUARE } from "./grid.mjs";
import { splitByRelation } from "./factions.mjs";
import { evaluateState, attackOptions, proactiveAttackOptions, usefulRangeFeet, maxLegalRangeFeet } from "./evaluate/state-value.mjs";
import { reachableCells } from "./world/pathfind.mjs";
import { refreshBelief, believedEnemies } from "./knowledge/belief.mjs";
import { isDead, isUnconscious } from "./conditions.mjs";
import { hasCover, lineOfEffect } from "./terrain.mjs";
import { isFlanking, meleeReachFeet } from "./flanking.mjs";

/**
 * A per-decision RNG derived from (battle seed, round, combatant, decision index). Must NOT be the
 * engine's rng — drawing from the battle's stream would re-align every subsequent d20 the instant
 * the AI itself changes, destroying the common-random-numbers property that makes two AI versions
 * comparable on the same seed.
 */
export function decisionRng(state, combatantId, decisionIndex) {
  let h = (state.seed ?? 0) >>> 0;
  const mix = (n) => { h = (Math.imul(h ^ n, 0x9e3779b1) + 0x85ebca6b) >>> 0; };
  mix((state.round ?? 0) + 1);
  mix(decisionIndex + 1);
  for (let i = 0; i < combatantId.length; i++) mix(combatantId.charCodeAt(i));
  return makeRng(h);
}

/**
 * Every OTHER living combatant's position. A dead combatant's square must never count as an
 * obstacle here — see engine.mjs's own `livingPositions` for the full story: a combatant who dies
 * standing in a one-square doorway was permanently sealing that doorway for the rest of the battle,
 * because every one of THIS file's own destination-finding calls also rebuilt its occupancy list
 * straight off `state.positions` with no HP filter. Fixing only the real engine-side legality gate
 * (engine.mjs) would not have been enough on its own — the AI's own route-planning here independently
 * decides what to even PROPOSE, so it needed the identical fix.
 */
/** Every OTHER living combatant's position, each carrying its own `.side` — design doc §24: a
 * SAME-side occupant no longer fully blocks passage (blocksPassage, grid.mjs), only a different-
 * side one does; the final destination square still can't be occupied by anyone at all (still a
 * plain isOccupied check, unaffected by side). */
function otherLivingPositions(state, excludeId) {
  return [...state.positions.entries()]
    .filter(([id]) => id !== excludeId && (state.combatants.get(id)?.currentHP ?? 0) > 0)
    .map(([id, p]) => ({ ...p, side: state.combatants.get(id).side }));
}

/** The plain average of a list of {col,row} points — design doc §36's own "center of mass," used
 * by the blind-exploration candidate below. Deliberately allowed to land on a non-integer cell;
 * it's a DIRECTION reference for bestDestinationToward to aim at, not itself a destination. */
function averagePosition(positions) {
  return {
    col: positions.reduce((sum, p) => sum + p.col, 0) / positions.length,
    row: positions.reduce((sum, p) => sum + p.row, 0) / positions.length
  };
}

/** Walk a SINGLE fixed (dx,dy) direction from `from`, stopping at bounds/occupied/budget/standoff/overshoot. */
function extend(state, others, moverSide, from, to, dx, dy, maxFeet, standoffFeet) {
  let cur = { ...from };
  let curDist = distanceFeet(cur, to);
  let lastOpen = null; // walking THROUGH an ally's square is fine; stopping there never is
  for (;;) {
    if (curDist <= standoffFeet) break;
    const next = { col: cur.col + dx, row: cur.row + dy };
    if (!isInBounds(next, state.gridSize)) break;
    if (blocksPassage(next, others, moverSide)) break;
    if (distanceFeet(from, next) > maxFeet) break;
    const nextDist = distanceFeet(next, to);
    if (nextDist >= curDist) break; // never overshoot past the closest approach
    cur = next; curDist = nextDist;
    if (!isOccupied(cur, others)) lastOpen = cur;
  }
  return lastOpen;
}

/**
 * Try up to 7 nearby compass headings, not just the one exact bearing to the target, and take the
 * first that makes real progress — cheap (microseconds), and avoids the "one blocked heading
 * returns null forever" trap a single-direction walk falls into the moment a teammate is parked on
 * the direct line to the only target on the map.
 */
function stepToward(state, moverId, from, to, maxFeet, standoffFeet) {
  const others = otherLivingPositions(state, moverId);
  const moverSide = state.combatants.get(moverId).side;
  const primaryDx = Math.sign(to.col - from.col);
  const primaryDy = Math.sign(to.row - from.row);
  if (primaryDx === 0 && primaryDy === 0) return null;
  const headings = [
    [primaryDx, primaryDy], [primaryDx, 0], [0, primaryDy],
    [primaryDx, 1], [primaryDx, -1], [1, primaryDy], [-1, primaryDy]
  ];
  for (const [dx, dy] of headings) {
    if (dx === 0 && dy === 0) continue;
    const result = extend(state, others, moverSide, from, to, dx, dy, maxFeet, standoffFeet);
    if (result) return result;
  }
  return null;
}

/** Straight line directly AWAY from a point, for disengaging. */
function stepAway(state, moverId, from, threat, maxFeet) {
  const others = otherLivingPositions(state, moverId);
  const moverSide = state.combatants.get(moverId).side;
  const dx = Math.sign(from.col - threat.col) || 1;
  const dy = Math.sign(from.row - threat.row) || 0;
  let cur = { ...from };
  let lastOpen = null;
  for (;;) {
    const next = { col: cur.col + dx, row: cur.row + dy };
    if (!isInBounds(next, state.gridSize)) break;
    if (blocksPassage(next, others, moverSide)) break;
    if (distanceFeet(from, next) > maxFeet) break;
    cur = next;
    if (!isOccupied(cur, others)) lastOpen = cur; // walk THROUGH an ally's square, but only ever stop on an empty one
  }
  return lastOpen;
}

/**
 * Wall-aware destination selection (design doc §15q/§16, ported verbatim). stepToward's
 * straight-line walk gives up the moment a wall blocks its one path, even when a route exists two
 * squares to the side — real Dijkstra fixes that, so this reaches for it, but ONLY when the
 * scenario actually defines walls (this is exactly what Phase 1b's building exists to exercise).
 *
 * `cache` is threaded through by generateProposals (one shared Map per call, see below) — the
 * flood-fill result only needs to be keyed on (moverId, origin cell, budget), not recomputed per
 * destination candidate, which is what keeps a wall-heavy scenario affordable.
 */
function cachedReachableCells(cache, key, args) {
  if (cache.has(key)) return cache.get(key);
  const result = reachableCells(args);
  cache.set(key, result);
  return result;
}

function trueDistanceField(state, moverId, to, others, cache) {
  const span = Math.max(state.gridSize.cols, state.gridSize.rows) * FEET_PER_SQUARE * 4; // generous — covers any plausible detour on this map
  const key = `field|${moverId}|${to.col},${to.row}`;
  // includePath: false (GH #62) — this floods the WHOLE grid (span is 4x the map diagonal), and
  // every consumer of this field (both call sites below, via `trueDist`) reads only `.cost`, never
  // `.path` — confirmed directly, not assumed. Profiled: reconstructing a route for every one of
  // the ~1,300+ cells a full-grid flood reaches is 32-76% of that flood's own cost, thrown away
  // unread every single time. The Speed-bounded `reach|` flood below (`pathfindingDestinationToward`)
  // keeps the default and its own `.path` — that one genuinely needs the route.
  return cachedReachableCells(cache, key, { from: to, maxFeet: span, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls, moverSide: state.combatants.get(moverId).side, includePath: false });
}

/**
 * design doc §27 (adversarial-audit finding #3): trueDist alone (real Dijkstra walking distance to
 * `to`) routinely TIES between several reachable cells — most commonly right at the start of a
 * fight, before anyone has line of effect at all, when threatExposure/offensiveReach are still zero
 * everywhere and the closing gradient is the only live term, itself keyed off the SAME trueDist.
 * Previously, a tie fell straight through to `cost` (cheapest to reach) and then, if THAT also tied,
 * to decide()'s own final tiebreak — a plain string comparison on "Move to (COL,ROW)" — with zero
 * awareness that one tied cell might actually open a sightline to the target and another might be a
 * dead-end pocket with no LOS at all. A real battle log showed exactly this: an opening turn spent
 * its whole 3-action budget walking INTO a windowless side room, away from the only doorway, purely
 * because that room's own cells happened to tie on raw walking distance and sort earlier
 * alphabetically. Fixed by making "does this cell actually see the target" a real tiebreaker,
 * ahead of cost — ONLY a tiebreaker, never overriding a strictly better trueDist, so the existing,
 * already-correct "get closer" behavior for the non-tied case is untouched.
 */
function pathfindingDestinationToward(state, moverId, from, to, maxFeet, standoffFeet, cache) {
  const others = otherLivingPositions(state, moverId);
  const moverSide = state.combatants.get(moverId).side;
  const reachableKey = `reach|${moverId}|${from.col},${from.row}|${maxFeet}`;
  const reachable = cachedReachableCells(cache, reachableKey, { from, maxFeet, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls, moverSide });
  const distField = trueDistanceField(state, moverId, to, others, cache);
  const trueDist = (col, row) => distField.get(`${col},${row}`)?.cost ?? distanceFeet({ col, row }, to) * 10; // unreachable at all — treat as very far, not infinite

  let best = null, bestScore = Math.max(trueDist(from.col, from.row), standoffFeet), bestCost = 0;
  let bestHasLos = lineOfEffect(from, to, state.walls);
  // Carries the REAL Dijkstra-found route along with the winning cell — checkMoveLegality validates
  // THAT rather than re-deriving a straight line, which would wrongly reject a detour-reached
  // destination forever (the straight line crosses whatever the detour was routing around).
  for (const [cellKey, { cost, path }] of reachable) {
    const [col, row] = cellKey.split(",").map(Number);
    const score = Math.max(trueDist(col, row), standoffFeet);
    const hasLos = lineOfEffect({ col, row }, to, state.walls);
    const better = score < bestScore
      || (score === bestScore && hasLos && !bestHasLos)
      || (score === bestScore && hasLos === bestHasLos && cost < bestCost);
    if (better) {
      best = { col, row, path }; bestScore = score; bestCost = cost; bestHasLos = hasLos;
    }
  }
  return best;
}

/**
 * Exported so any future personnel-scale scripted-movement AI (mirroring ai/neutral-ai.mjs's own
 * reuse of the Frame-scale version) can reuse this directly rather than reimplementing wall-aware
 * "walk toward a point" from scratch. `cache` is optional — a caller making one-off calls gets a
 * fresh, single-use Map; generateProposals creates and threads one shared cache through its whole
 * burst of calls.
 */
export function bestDestinationToward(state, moverId, from, to, maxFeet, standoffFeet, cache = new Map()) {
  if (state.walls?.length) return pathfindingDestinationToward(state, moverId, from, to, maxFeet, standoffFeet, cache);
  return stepToward(state, moverId, from, to, maxFeet, standoffFeet);
}

/**
 * design doc §27: the same tie-breaking gap as pathfindingDestinationToward, mirrored — a
 * disengage candidate that ACTUALLY BREAKS line of effect to the threat is a meaningfully better
 * escape than one that merely stands farther away in the open, so it wins any tie on raw distance
 * before falling through to cost/an arbitrary pick. Only a tiebreaker, same as above — never
 * overrides a strictly farther cell.
 */
function pathfindingDestinationAway(state, moverId, from, threat, maxFeet, cache) {
  const others = otherLivingPositions(state, moverId);
  const moverSide = state.combatants.get(moverId).side;
  const reachableKey = `reach|${moverId}|${from.col},${from.row}|${maxFeet}`;
  const reachable = cachedReachableCells(cache, reachableKey, { from, maxFeet, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls, moverSide });
  const distField = trueDistanceField(state, moverId, threat, others, cache);
  const trueDist = (col, row) => distField.get(`${col},${row}`)?.cost ?? distanceFeet({ col, row }, threat) * 10;

  let best = null, bestDist = trueDist(from.col, from.row), bestCost = 0;
  let bestBreaksLos = !lineOfEffect(from, threat, state.walls);
  for (const [cellKey, { cost, path }] of reachable) {
    const [col, row] = cellKey.split(",").map(Number);
    const dist = trueDist(col, row);
    const breaksLos = !lineOfEffect({ col, row }, threat, state.walls);
    const better = dist > bestDist
      || (dist === bestDist && breaksLos && !bestBreaksLos)
      || (dist === bestDist && breaksLos === bestBreaksLos && cost < bestCost);
    if (better) {
      best = { col, row, path }; bestDist = dist; bestCost = cost; bestBreaksLos = breaksLos;
    }
  }
  return best;
}

/** The wall-aware sibling of stepAway — gated on walls ONLY, no fallback-on-null (see the Frame-scale file's own measured cost note: a full Dijkstra flood on every edge-adjacent disengage candidate is not worth paying for). Exported for the same reason bestDestinationToward is (direct reuse / direct testing). */
export function bestDestinationAway(state, moverId, from, threat, maxFeet, cache = new Map()) {
  if (state.walls?.length) return pathfindingDestinationAway(state, moverId, from, threat, maxFeet, cache);
  return stepAway(state, moverId, from, threat, maxFeet);
}

/**
 * Design doc §26 — Ingram's own ask: "once in contact with the enemy it would be smart for all AIs
 * to consider the value of placing themselves behind cover if they are ranged... this new being
 * behind cover move would still allow them to be involved in the fight, no point hiding behind
 * cover if your enemy outranges you or is currently not visible to you."
 *
 * The EVALUATOR already prices a covered position correctly (state-value.mjs's own bestExpectedDamage
 * folds `hasCover`'s +2 AC/Reflex into threatExposure — a real, if quiet, existing mechanism). What
 * was actually missing is that nothing ever PROPOSED a covered position as a move candidate in the
 * first place — decide() can only ever choose among what generateProposals hands it. This is that
 * missing candidate: the cheapest reachable cell that (a) still keeps `threat` within `myRangeFeet`
 * — "still allow them to be involved in the fight" — (b) still has real line of effect to `threat` —
 * the same requirement, from the other direction — and (c) actually grants real cover from `threat`
 * specifically (terrain.mjs's own `hasCover`, the identical check engine.mjs applies at resolution
 * time). Gated by the caller on `state.walls?.length` (hasCover is unconditionally false with no
 * walls at all — nothing to search for) and on the mover actually having a ranged option (a
 * melee-only combatant has no reason to fight from range in the first place).
 */
function bestCoverDestination(state, moverId, from, threatPos, maxFeet, myRangeFeet, cache) {
  const others = otherLivingPositions(state, moverId);
  const moverSide = state.combatants.get(moverId).side;
  const reachableKey = `reach|${moverId}|${from.col},${from.row}|${maxFeet}`;
  const reachable = cachedReachableCells(cache, reachableKey, { from, maxFeet, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls, moverSide });

  let best = null, bestCost = Infinity;
  for (const [cellKey, { cost, path }] of reachable) {
    const [col, row] = cellKey.split(",").map(Number);
    const cell = { col, row };
    if (distanceFeet(cell, threatPos) > myRangeFeet) continue; // must stay within MY OWN useful range
    if (!lineOfEffect(cell, threatPos, state.walls)) continue; // must still be able to see/hit them
    if (!hasCover(cell, threatPos, state.walls)) continue; // must actually BE covered, not just nearby cover
    if (cost < bestCost) { best = { col, row, path }; bestCost = cost; }
  }
  return best;
}

/**
 * GH #59 — Ingram's/the report's own diagnosis: "a rogue has no way to seek a flank." For a melee
 * ally already engaged with a specific, reachable enemy, searches for the cheapest cell I can
 * reach that would put ME on the exact opposite compass heading from that enemy — a real flank,
 * off-guarding it for both of us. Reuses isFlanking directly for the per-cell check, the same
 * predicate engine.mjs applies at real resolution time, rather than reimplementing the geometry —
 * so a "would flank if I stood here" check here can never drift from the "does flank" check that
 * actually fires when a Strike resolves.
 *
 * The caller gates on `meleeReachFeet(me) != null` BEFORE calling this at all (mirroring
 * bestCoverDestination's own call-site gate on having a real ranged option, `decide.mjs`'s own
 * established pattern) — an adversarial review of this design flagged that relying solely on
 * isFlanking's own internal meleeReachFeet(attacker) check would recompute that same filter+map+max
 * over `me.strikes` on every reachable cell, for every (engaged ally x enemy) pair, even when `me`
 * is provably ranged-only and could never produce a single valid candidate — real, avoidable waste
 * given planTurn's own whole-turn search calls generateProposals repeatedly per decision.
 */
function bestFlankingDestination(state, moverId, me, ally, allyPos, enemy, enemyPos, maxFeet, cache) {
  const others = otherLivingPositions(state, moverId);
  const moverSide = state.combatants.get(moverId).side;
  const myPos = state.positions.get(moverId);
  const reachableKey = `reach|${moverId}|${myPos.col},${myPos.row}|${maxFeet}`;
  const reachable = cachedReachableCells(cache, reachableKey, { from: myPos, maxFeet, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls, moverSide });
  const alliesOfMe = [{ id: ally.id, pos: allyPos, combatant: ally }];

  let best = null, bestCost = Infinity;
  for (const [cellKey, { cost, path }] of reachable) {
    const [col, row] = cellKey.split(",").map(Number);
    const cell = { col, row };
    if (!isFlanking(me, cell, enemy, enemyPos, alliesOfMe, state.walls)) continue;
    if (cost < bestCost) { best = { col, row, path }; bestCost = cost; }
  }
  return best;
}

/**
 * Every action worth considering. Deliberately generous — the evaluator decides what is good,
 * this only decides what is *conceivable*.
 *
 * `externalDestCache` (design doc §43, Stage 2 performance fix) is OPTIONAL — every pre-Stage-2
 * caller omits it and gets a fresh, single-use Map exactly as before. `planTurn` is the one caller
 * that threads a cache it owns, SHARED across every `generateProposals` call in one whole-turn
 * search: the expensive part of this function is real Dijkstra pathfinding
 * (`reachableCells`/`trueDistanceField`, keyed by mover+origin+budget/target — see
 * `cachedReachableCells`'s own key shape), and that geometry is identical across every template that
 * hasn't moved THIS combatant to a new square, even when their non-movement conditions (HP, prone,
 * grappled, MAP) differ. The one known, deliberately accepted imprecision: a Shove earlier in the
 * SAME plan can move a DIFFERENT combatant, changing occupancy in a way this cache's key doesn't
 * capture — a stale hit could offer a cell that's no longer actually reachable, or fail to offer one
 * that newly is. Never a correctness risk either way: `attemptAction` is still the sole authority on
 * legality, so a stale-optimistic candidate is simply rejected (`result.legal === false`) like any
 * other illegal proposal, not silently accepted; the cost is, at most, a missed opportunity in the
 * rare Shove-then-reposition case, not a wrong action taken.
 *
 * `includeMovement` (design doc §43, Stage 2 performance fix) is also OPTIONAL, default true —
 * every pre-Stage-2 caller is unaffected. `planTurn` passes false for any phase whose filter could
 * never select a "move" proposal in the first place (isControlType/isAttackType/isHealType, never
 * isMoveType/anyType) — skipping the movement block entirely skips its real Dijkstra pathfinding
 * cost, the dominant expense this function has, for a search phase that was always going to filter
 * every "move" candidate straight back out regardless.
 */
export function generateProposals(state, combatantId, turn, externalDestCache, includeMovement = true) {
  const me = state.combatants.get(combatantId);
  const myPos = state.positions.get(combatantId);
  const proposals = [];
  if (!me || !myPos) return proposals;

  const speed = turn.effective?.speed ?? me.speed ?? 0;
  // Design doc §25: a downed-but-not-dead PC (isDead false, currentHP<=0) is still a real
  // combatant in the world — an ally can path over to heal them, so filtering on currentHP>0 here
  // would silently make the whole dying/revival mechanic invisible to the AI's own candidate
  // generation. `enemies`/`allies` below therefore still include unconscious combatants; only
  // `isDead` ones are ever dropped.
  const living = [...state.combatants.values()].filter((c) => !isDead(c));
  const { allies, enemies } = splitByRelation(me, living);
  // Design doc §32 — a direct instruction, not a RAW question (Player Core fully permits attacking
  // an unconscious creature; §25's own research already confirmed that): "we will not actually
  // build an AI which kills downed players deliberately... the only reason to target a downed
  // unconscious character would be to heal them." This is deliberately a PROPOSAL-layer policy
  // choice, not a legality.mjs rule — legality stays an accurate mirror of what SF2E actually
  // permits; this is this project's own choice about what the AI will ever attempt. Used only by
  // the five offense/social candidate loops just below; `enemies` itself (unconscious included)
  // still feeds movement/positioning further down, and healing below deliberately targets `allies`
  // (and `me`) directly, never this filtered list — an unconscious ally is exactly who should still
  // be healed.
  const targetableEnemies = enemies.filter((e) => !isUnconscious(e));

  // Belief (design doc §15s): refreshed from the WHOLE side's combined current vision, not just
  // this one combatant.
  refreshBelief(state, me.side);
  const believedPositions = new Map(
    believedEnemies(state, me.side).filter((b) => b.position).map((b) => [b.id, b.position])
  );

  // --- Attacks: every option against every living, targetable enemy ---
  (me.strikes ?? []).forEach((s, i) => {
    if (s.reactionOnly) return;
    for (const e of targetableEnemies) proposals.push({ type: "strike", targetId: e.id, strikeIndex: i });
  });
  (me.spells ?? []).forEach((_, i) => {
    for (const e of targetableEnemies) proposals.push({ type: "spellAttack", targetId: e.id, spellIndex: i });
  });
  (me.saveAttacks ?? []).forEach((_, i) => {
    for (const e of targetableEnemies) proposals.push({ type: "saveAttack", targetId: e.id, saveAttackIndex: i });
  });

  // --- Demoralize (Intimidation): only offered if this combatant actually has an Intimidation
  // modifier extracted (opt-in, matching vision/walls' own pattern) and hasn't already tried this
  // specific target this battle (checkDemoralizeLegal would reject it anyway, but filtering here
  // keeps the candidate list honest rather than generating a proposal doomed to fail). Also never
  // offered against an unconscious target (design doc §32 — Ingram's own question: "why would
  // someone demoralise a downed target anyways? That's completely illogical" — and mechanically,
  // Player Core requires the target to be able to hear/understand you, which an unconscious
  // creature categorically cannot). ---
  if (me.intimidationModifier != null) {
    for (const e of targetableEnemies) {
      if (me.demoralizedTargets?.includes(e.id)) continue;
      proposals.push({ type: "demoralize", targetId: e.id });
    }
  }

  // --- Condition-only saves (design doc §22, e.g. Forced Reflection): same "skip an
  // already-doomed-to-fail proposal" filtering as Demoralize above. Design doc §34: checked on the
  // TARGET's own conditionSaveImmunities, not the attacker's — Forced Reflection's real text makes
  // the target immune to anyone, not just this one attacker (contrast Demoralize just above, which
  // really is attacker-scoped, per its own real "you can't... again" wording). ---
  (me.conditionSaves ?? []).forEach((cs, i) => {
    for (const e of targetableEnemies) {
      if (e.conditionSaveImmunities?.includes(cs.name)) continue;
      proposals.push({ type: "conditionSave", targetId: e.id, conditionSaveIndex: i });
    }
  });

  // --- Athletics maneuvers: Trip/Shove/Grapple (design doc §31's rules-gap sweep, priority 1) —
  // only offered if this combatant actually has an Athletics modifier extracted, opt-in matching
  // intimidationModifier's own pattern above. Against every targetable (conscious) enemy, same
  // policy as every other offensive candidate loop in this function. ---
  if (me.athleticsModifier != null) {
    for (const e of targetableEnemies) {
      proposals.push({ type: "trip", targetId: e.id });
      proposals.push({ type: "shove", targetId: e.id });
      proposals.push({ type: "grapple", targetId: e.id });
    }
  }

  // --- Escape: offered whenever this combatant is currently grabbed/restrained — no target needed,
  // it always targets whoever's holding it (combatant.mjs/legality.mjs read that off grappledBy
  // directly). Not gated on athleticsModifier != null: Player Core allows attempting Escape with
  // "an Athletics check (or another appropriate check)" — everyone can always try, even untrained
  // (checkEscapeLegal/engine.mjs's own resolver default a missing modifier to 0, not to "can't try"). ---
  if (me.grappledBy) {
    proposals.push({ type: "escape" });
  }

  // --- Stand: offered whenever prone, unconditionally (no target, no requirement beyond being
  // prone) — condition-32-prone.json's own real cost (-2 attack, off-guard) makes it worth
  // considering every single time. Crawl is deliberately NOT generated here, mirroring this file's
  // own existing precedent for Step (see this file's own header): with no Take Cover action and no
  // difficult terrain yet, Crawl is dominated by Stand in literally every case this engine can
  // currently produce — checkCrawlLegal/the "crawl" action type both still exist for a hand-authored
  // AI or a future extension to use directly; this is only about what generateProposals bothers to
  // manufacture on its own. Revisit once Take Cover or difficult terrain exist to make Crawl a real,
  // distinct choice from simply standing back up. ---
  if (me.prone) {
    proposals.push({ type: "stand" });
  }

  // --- Area/burst attacks (design doc §38, e.g. a thrown grenade) — one candidate per enemy square
  // to aim at, same shape as every other targeted candidate above. No hand-built "avoid allies"
  // filtering here on purpose: the sandbox (engine.mjs's areaAttack, both outcome tables) genuinely
  // damages EVERY combatant the blast catches, so evaluateState's existing allyDamage term already
  // prices an origin that would also catch a nearby ally exactly as unfavorably as any other
  // ally-damaging proposal — the friendly-fire awareness comes for free from correct simulation,
  // not a bespoke heuristic. ---
  (me.areaAttacks ?? []).forEach((_, i) => {
    for (const e of targetableEnemies) proposals.push({ type: "areaAttack", originId: e.id, areaAttackIndex: i });
  });

  // --- Support ---
  (me.healAbilities ?? []).forEach((_, i) => {
    for (const t of [me, ...allies]) if (t.currentHP < t.maxHP) proposals.push({ type: "healAbility", targetId: t.id, abilityIndex: i });
  });

  // --- Movement: ALWAYS offered (unless the caller already knows a "move" could never be picked
  // this phase — see includeMovement's own header note), at several distinct standoffs ---
  if (includeMovement) {
  const destinations = new Map(); // keyed by cell so duplicates collapse
  const addDest = (d) => { if (d) destinations.set(`${d.col},${d.row}`, d); };

  const myRanges = [...new Set(proactiveAttackOptions(me).map(usefulRangeFeet).filter((r) => Number.isFinite(r)))];
  // design doc §26: "if they are ranged" — a real non-melee option (spells/saveAttacks have no
  // strikeType at all, so they count as ranged here same as a gun would; a melee-only combatant has
  // no ranged range to defend and never gets a cover-seeking candidate at all).
  //
  // design doc §27 (adversarial-audit finding #2): the cover-seeking gate itself uses the real
  // LEGAL max range (maxLegalRangeFeet — up to the 6th increment, -2/increment penalty), not
  // usefulRangeFeet's stricter no-penalty range — a combatant who's willing to fire a real,
  // penalized 2nd/3rd-increment shot (which real logs show happening constantly) should be equally
  // willing to WALK that same real distance for a reachable covered position, not refuse to search
  // past a stricter bound it doesn't actually respect for its own attacks.
  const rangedOptionRanges = proactiveAttackOptions(me).filter((o) => o.strikeType !== "melee").map(maxLegalRangeFeet).filter((r) => Number.isFinite(r));
  const myRangedRange = rangedOptionRanges.length ? Math.max(...rangedOptionRanges) : 0;
  // Shared across every destination query this ONE generateProposals call makes — `from`/`walls`/
  // occupancy are all constant for the whole burst. Reuses the caller's own cache when one is
  // threaded in (see this function's own header) rather than always starting fresh.
  const destCache = externalDestCache ?? new Map();
  for (const e of enemies) {
    // Believed position, not ground truth (design doc §15s) — an enemy with no belief entry at
    // all has never been perceived by anyone on this side; proposing a move toward its true secret
    // position would be omniscient cheating. Attacks don't need the same guard — they're
    // separately, correctly gated by REAL-TIME perception in checkStrikeLegal/checkSpellAttackLegal.
    const ePos = believedPositions.get(e.id);
    if (!ePos) continue;
    for (const r of myRanges) addDest(bestDestinationToward(state, combatantId, myPos, ePos, speed, r, destCache));
    addDest(bestDestinationToward(state, combatantId, myPos, ePos, speed, FEET_PER_SQUARE, destCache)); // close to contact
    addDest(bestDestinationToward(state, combatantId, myPos, ePos, speed, 0, destCache));
    addDest(bestDestinationAway(state, combatantId, myPos, ePos, speed, destCache));                    // disengage
    // design doc §26: cover-seeking — only searched when there's real terrain to hide behind and a
    // real ranged option to protect; "still allow them to be involved in the fight" is enforced
    // inside bestCoverDestination itself (myRangedRange + a real line of effect requirement).
    if (state.walls?.length && myRangedRange > 0) addDest(bestCoverDestination(state, combatantId, myPos, ePos, speed, myRangedRange, destCache));
  }
  for (const a of allies) {
    const aPos = state.positions.get(a.id);
    if (aPos && a.currentHP < a.maxHP) addDest(bestDestinationToward(state, combatantId, myPos, aPos, speed, FEET_PER_SQUARE, destCache));
  }
  // GH #59: flank-seeking — only searched when I have a melee option at all (mirroring the
  // cover-seeking gate's own "only if there's a real ranged option to protect" shape, one line
  // above but for the opposite weapon type), gated at the CALL SITE rather than relying solely on
  // bestFlankingDestination's own internal isFlanking check — see that function's own header for
  // why the up-front gate matters for cost, not just correctness.
  if (meleeReachFeet(me) != null) {
    for (const a of allies) {
      if (a.currentHP <= 0) continue;
      const aPos = state.positions.get(a.id);
      if (!aPos) continue;
      const allyMeleeReach = meleeReachFeet(a);
      if (allyMeleeReach == null) continue; // this ally has no melee option, so it can never flank with anyone
      for (const e of enemies) {
        const ePos = believedPositions.get(e.id); // belief, not ground truth — matches every other enemy-directed candidate above
        if (!ePos) continue;
        if (distanceFeet(aPos, ePos) > allyMeleeReach) continue; // this ally isn't actually engaged with THIS enemy
        addDest(bestFlankingDestination(state, combatantId, me, a, aPos, e, ePos, speed, destCache));
      }
    }
  }
  if (me.objective) addDest(bestDestinationToward(state, combatantId, myPos, me.objective, speed, 0, destCache));

  // design doc §36 — Ingram's own rethink, after watching purely random exploration (§35) take
  // "ages" for the two sides to find each other: with a genuinely blind deployment (no starting
  // Line of Effect either side — engine.mjs's own `blindDeployment`), a side that's never
  // perceived a single enemy gets no enemy-directed destination from the loop above at all
  // (believedPositions is empty), and with no hurt ally or scripted objective either,
  // `destinations` would otherwise stay completely empty. Two real candidates now, not one:
  //
  // (1) A BLENDED target — mostly toward the true center of mass of the living opposing side,
  //     partly toward this side's OWN center of mass, so the whole party advances TOGETHER rather
  //     than each member computing its own independent beeline ("try to stick together as a
  //     group"). Using true positions here isn't new or specially omniscient for THIS file —
  //     state-value.mjs's own `closing` gradient already scores movement against true enemy
  //     positions regardless of belief (see that file's own header); this candidate is the
  //     movement-generation side of the identical, already-accepted "true position informs
  //     movement, real perception still gates every actual attack" split. The exact blend ratio
  //     gets a small seeded jitter (decisionRng, never the battle's own dice) each turn — a
  //     consistent beeline toward the same fixed point every turn wouldn't read as "almost
  //     randomly" the way Ingram asked for, even though the overall DIRECTION is now deliberate.
  // (2) A genuinely random reachable cell, same as before — kept in the running so a blocked or
  //     currently-unreachable blended point never leaves a combatant with only one brittle option.
  if (believedPositions.size === 0) {
    const rng = decisionRng(state, combatantId, turn.decisionIndex ?? 0);
    const livingAllyPositions = [me, ...allies].filter((c) => c.currentHP > 0).map((c) => state.positions.get(c.id)).filter(Boolean);
    const livingEnemyPositions = enemies.filter((c) => c.currentHP > 0).map((c) => state.positions.get(c.id)).filter(Boolean);
    if (livingAllyPositions.length && livingEnemyPositions.length) {
      const allyCentroid = averagePosition(livingAllyPositions);
      const enemyCentroid = averagePosition(livingEnemyPositions);
      const towardEnemyWeight = 0.55 + rng() * 0.2; // 55%-75% of the way toward the opponent's centroid, jittered
      // design doc §37 (Ingram's own bug report: PCs "moving backwards and forwards" near a long
      // wall, "can't play multiple turns ahead") — root cause traced to THIS blend, not a missing
      // planning horizon. `bestDestinationToward` already scores candidates by real wall-aware
      // Dijkstra distance-to-target (trueDistanceField floods outward from `to` across the WHOLE
      // map, not just this turn's reach — genuinely multi-turn-aware already), but that field is
      // keyed by exact integer "col,row" strings. A raw centroid blend is a float, so its flood
      // lands on off-grid keys ("33.7,0" etc.) that the mover's own integer-keyed reachable-cells
      // lookup can NEVER match — trueDist() silently falls through to the naive `distanceFeet * 10`
      // straight-line fallback for every candidate, EVERY time, which is exactly the myopic
      // "walk straight at the wall" behavior being reported. Rounding to the nearest real cell
      // before searching is the whole fix — it restores the wall-aware field this was always meant
      // to use, no new pathfinding machinery required.
      const blended = {
        col: Math.round(allyCentroid.col + (enemyCentroid.col - allyCentroid.col) * towardEnemyWeight),
        row: Math.round(allyCentroid.row + (enemyCentroid.row - allyCentroid.row) * towardEnemyWeight)
      };
      addDest(bestDestinationToward(state, combatantId, myPos, blended, speed, 0, destCache));
    }

    const exploreCells = [...reachableCells({
      from: myPos, maxFeet: speed, gridSize: state.gridSize,
      occupiedPositions: otherLivingPositions(state, combatantId), walls: state.walls, moverSide: me.side
    }).values()];
    if (exploreCells.length) {
      const pick = exploreCells[Math.floor(rng() * exploreCells.length)];
      const last = pick.path[pick.path.length - 1];
      addDest({ col: last.col, row: last.row, path: pick.path });
    }
  }

  for (const d of destinations.values()) proposals.push({ type: "move", to: d });
  } // includeMovement

  return proposals;
}

/**
 * Choose one action. Returns a proposal (with `reason` and `score`) or null when genuinely nothing
 * improves the position.
 *
 * `competence` in [0,1] is the tunable skill knob: 1 picks the best action every time, lower
 * values sample more loosely among the good ones via a softmax temperature.
 */
/**
 * Retreat / morale (design doc §42, Stage 1; GM Core §791 pg. 78 "Morale", verbatim): "While PCs
 * occasionally encounter truly fanatical zealots or single-minded creatures that would never back
 * down from a fight, most creatures — even non-sapient creatures like animals — back down from a
 * battle they're obviously losing." The temperament check below recognizes "fanatical" and
 * "single-minded" as GM Core's own two named exceptions, verbatim; "mindless" is added as this
 * project's own reasonable extension beyond the quoted text (a Mindless creature — no intelligence,
 * immune to mental effects — has no self-preservation concept to invoke in the first place), flagged
 * here as an addition, not a citation. OPT-IN via `state.moraleEnabled` (default falsy/undefined) —
 * deliberately NOT part of this
 * engine's own honest, competence-driven baseline used to validate whether an encounter's XP budget
 * means what GM Core says it means; this is explicitly a separate, table-assist-mode behavior, per
 * the tactical-planning report's own "two modes" argument. When it fires, it's a DECISIVE override,
 * not one more candidate competing in the normal evaluator race — §31's own audit already found a
 * losing "disengage" candidate routinely loses that exact competition to a mediocre attack even at
 * 1 HP, which is precisely the failure mode a real fleeing creature wouldn't exhibit (it doesn't
 * re-litigate "fight or flee" every single action once it's already decided). No numeric threshold
 * exists in the mirrored rules — GM Core leaves the exact judgment to whoever's running the fight —
 * so the two conditions below are a real, stated judgment call, not a guess dressed up as one:
 * personally bloodied (own HP at or below a third) AND this side clearly worse off than the
 * opposition (mean living-HP fraction strictly lower).
 *
 * `moraleEnabledOverride` (design doc §46 — AI profiles): OPTIONAL. When omitted (`undefined`), the
 * only pre-§46 source of truth — `state.moraleEnabled` — still applies, so every existing caller is
 * unaffected. A profile's own `moraleEnabled` flows in here as a real per-COMBATANT override,
 * letting two combatants in the SAME battle differ (an aggressive archetype that never routs
 * standing next to a cautious one that does) — something a single state-level flag structurally
 * cannot express.
 */
function checkShouldFlee(state, combatantId, moraleEnabledOverride) {
  const moraleEnabled = moraleEnabledOverride ?? state.moraleEnabled;
  if (!moraleEnabled) return false;
  const me = state.combatants.get(combatantId);
  if (!me || me.currentHP <= 0) return false;
  if (me.temperament === "mindless" || me.temperament === "fanatical" || me.temperament === "single-minded") return false; // "fanatical"/"single-minded" are GM Core's own named exceptions (pg. 78); "mindless" is this project's own extension — see doc comment above
  const hpFraction = me.maxHP > 0 ? me.currentHP / me.maxHP : 1;
  if (hpFraction > 1 / 3) return false;
  const { allies, enemies } = splitByRelation(me, [...state.combatants.values()]);
  const meanFraction = (list) => {
    const living = list.filter((c) => c.currentHP > 0);
    if (!living.length) return 0;
    return living.reduce((sum, c) => sum + (c.maxHP > 0 ? c.currentHP / c.maxHP : 0), 0) / living.length;
  };
  return meanFraction([me, ...allies]) < meanFraction(enemies);
}

/**
 * The actual flee move: directly away from the living enemy side's own center of mass, reusing the
 * exact same real, wall-aware bestDestinationAway every ordinary disengage candidate already uses —
 * a fleeing creature isn't inventing new movement, it's just always choosing this one.
 *
 * REGRESSION FIX (design doc §53, found by the systematic transcript audit): a PRONE fleeing
 * combatant used to get this same plain "move" proposal regardless — but Player Core's own real rule
 * (condition-32-prone.json, pg. 439) is "the only move actions you can use while prone are Crawl and
 * Stand," which checkMoveLegality already enforces. The decisive flee override in decide() below
 * returns whatever this function hands back WITHOUT the usual sandbox-legality check every other
 * candidate in this file goes through (deliberately — see decide()'s own comment on why flee is a
 * decisive override, not one more scored candidate) — so a prone flee attempt was a real, silent,
 * guaranteed-illegal proposal, discovered live in the audit sample as 17 illegal proposals in one
 * six-seed cautious-v1 run, all identical: prone, routing, rejected every time. Standing up is the
 * real, necessary FIRST step toward actually escaping (Crawl only manages 5ft and stays prone,
 * exactly the target profile morale is trying to get away from) — and with action economy usually
 * still remaining this same turn, decide() is called again immediately afterward with prone now
 * false, at which point this function correctly returns a real move away.
 */
function proposeFlee(state, combatantId, turn) {
  const me = state.combatants.get(combatantId);
  const myPos = state.positions.get(combatantId);
  const speed = turn.effective?.speed ?? me.speed ?? 0;
  if (speed <= 0 || !myPos) return null;
  const { enemies } = splitByRelation(me, [...state.combatants.values()]);
  const livingEnemyPositions = enemies.filter((e) => e.currentHP > 0).map((e) => state.positions.get(e.id)).filter(Boolean);
  if (!livingEnemyPositions.length) return null;
  if (me.prone) {
    return {
      type: "stand", score: null,
      reason: `${me.name} is routing but prone — Player Core only allows Crawl or Stand while prone, and standing up is the real first step toward actually escaping (GM Core: most creatures back down from a battle they're obviously losing)`
    };
  }
  const threat = averagePosition(livingEnemyPositions);
  const destination = bestDestinationAway(state, combatantId, myPos, threat, speed);
  if (!destination) return null;
  return {
    type: "move", to: destination, score: null,
    reason: `${me.name} is routing — this side is clearly losing a fight it can't win, and ${me.name} isn't willing to die for it (GM Core: most creatures back down from a battle they're obviously losing)`
  };
}

/**
 * TURN TEMPLATES (design doc §43, Stage 2 — the tactical-planning report's own four named shapes,
 * verbatim: "control-then-attack, double-strike, reposition-and-shoot, disengage-and-heal"). Each
 * template is an ordered list of per-action TYPE FILTERS; the LAST filter repeats for any remaining
 * actions once the list runs out, so a 2-phase template still fills a full 3-action turn ("Trip,
 * Strike, Strike" — not "Trip, Strike, hold"). This is the report's own answer to the branching-
 * factor risk it flags directly ("candidates cubed is not affordable... there is already a
 * documented performance cliff here" — design doc §22 Bug 3): a handful of named shapes, filled by
 * the existing per-action scoring machinery, instead of a full search over every combination of
 * every proposal at every depth.
 *
 * `unconstrained` is this project's own fifth addition, not one of the report's four — a filter
 * matching every proposal type, phase after phase. It reproduces the OLD single-action-at-a-time
 * decide() exactly, and because `planTurn` always takes the max score across the whole portfolio,
 * its presence is what guarantees the search can never settle on a worse plan than the pre-Stage-2
 * baseline would have played — flagged as an addition, not a citation, same honesty convention §42
 * already used for "mindless."
 */
const isControlType = (p) => p.type === "trip" || p.type === "shove" || p.type === "grapple" || p.type === "demoralize" || p.type === "conditionSave";
const isAttackType = (p) => p.type === "strike" || p.type === "spellAttack" || p.type === "saveAttack" || p.type === "areaAttack";
const isMoveType = (p) => p.type === "move";
const isHealType = (p) => p.type === "healAbility";
const anyType = () => true;

const TURN_TEMPLATES = [
  { name: "unconstrained", phases: [anyType] },
  { name: "control-then-attack", phases: [isControlType, isAttackType] },
  { name: "double-strike", phases: [isAttackType] },
  { name: "reposition-and-shoot", phases: [isMoveType, isAttackType] },
  { name: "disengage-and-heal", phases: [isMoveType, isHealType] }
];

/** A cheap, stable per-proposal key — every proposal generateProposals produces is a small, plain
 * object with a fixed field layout per type, so plain JSON.stringify is a safe, fast fingerprint. */
function proposalKey(proposal) {
  return JSON.stringify(proposal);
}

/**
 * GH #62 (design doc §76.4 fix 2): a cheap fingerprint of "everything a `field|` flood's own inputs
 * could depend on that can actually change mid-battle" — real occupancy — used to decide whether
 * `turn.destCache`'s persistent map still describes the current battlefield. Deliberately built from
 * `otherLivingPositions`' OWN return shape (`{col, row, side}` — it does not carry `id` at all, so
 * this cannot sort by id) rather than re-deriving one: `state.positions` is a Map whose iteration
 * order is stable across the mutations that happen mid-battle (`.set()` on an already-present key
 * never reorders a Map — verified directly, not assumed), and `cloneStateForPlanning` preserves that
 * same order into every sandbox fork, so this string is already deterministic without an explicit
 * sort. `walls`/`gridSize`/`moverSide` never change mid-battle (confirmed by reading every
 * `attemptAction` branch) — occupancy is the only real input this needs to track.
 */
function occupancyFingerprint(state, combatantId) {
  return otherLivingPositions(state, combatantId).map((p) => `${p.col},${p.row},${p.side}`).join("|");
}

/**
 * Design doc §43, Stage 2: search over whole-turn action SEQUENCES instead of one action at a time.
 * Runs every TURN_TEMPLATES entry, scores each COMPLETE plan by the total gain across the whole
 * turn (`evaluateState(finalState) - evaluateState(startState)`, both from `me`'s own side), and
 * returns the single best plan. Returns null only when every template filled zero actions — i.e.
 * nothing at all is legal, the same honest condition the pre-Stage-2 decide() returned null for.
 *
 * PERFORMANCE (design doc §43 — profiled directly after a real run took over an hour and never
 * finished, matching this project's own §22 Bug 3 precedent of measuring rather than guessing): a
 * naive "fork one sandbox per template, run all 3 phases independently" implementation pays for
 * `generateProposals` (a real pathfinding cost) and its own full candidate scoring ONCE PER
 * TEMPLATE PER PHASE — up to 15 times for 5 templates × 3 phases — even though every template
 * starts from the exact same (state, turn) at phase 0, and several templates share IDENTICAL
 * filters at later phases too (`reposition-and-shoot` and `disengage-and-heal` both filter phase 0
 * on `isMoveType` — they are GUARANTEED to reach the identical state after it). Measured: ~2.66s per
 * decide() call on the real 8-combatant walled map (vs. ~0.68s pre-Stage-2) — enough to turn a
 * single blind-opening (up to 60-round) battle into the better part of an hour.
 *
 * Fixed with `scoredCache`, keyed on the exact SEQUENCE of proposals applied so far (a plain string
 * built from `proposalKey`). Two templates that have applied the identical sequence are PROVABLY in
 * the identical state — `EXPECTED_OUTCOMES` is fully deterministic, no rng, the same guarantee
 * `forkTurnSandbox`'s own header already documents — so reusing one template's scored candidate list
 * for another that reaches the same sequence is exact, not an approximation. This captures sharing
 * at EVERY phase depth, not just phase 0, with no hardcoded knowledge of which templates happen to
 * overlap; the win falls out of how much the templates actually converge in a given real situation.
 */
function planTurn(state, combatantId, turn, weights, templates = TURN_TEMPLATES, disabledActionTypes) {
  const me = state.combatants.get(combatantId);
  if (!me) return null;
  if (turn.actionsAvailable - turn.actionsUsed <= 0) return null;
  const before = evaluateState(state, me.side, weights, combatantId);

  // GH #62 fix 2: a PERSISTENT cache for candidate generation scored against REAL, current, unmutated
  // occupancy (plan.length === 0 below — before this call's own hypothetical exploration has applied
  // anything), so it can safely survive across a turn's real, separate decide() calls, not just within
  // one. `turn.destCache` (engine.mjs's makeTurnProgress) is absent for the ~30 test call sites that
  // hand-build a `turn` object rather than going through the real runTurn/makeTurnProgress path — a
  // local, un-persisted fallback for those is correct and matches this file's own existing convention
  // for optional turn fields (e.g. `turn.decisionIndex ?? 0` below): it behaves exactly as this cache
  // did before this fix existed (a fresh Map, thrown away), never a crash, never written back onto a
  // caller's own object. `.map` and `.fingerprint` live on ONE shared container object specifically so
  // both survive engine.mjs's own `{...turnProgress, effective}` copy every call — a Map already
  // survives a shallow copy by reference; wrapping the fingerprint alongside it gives that plain field
  // the same property, rather than leaving it a doomed-to-reset primitive directly on `turn` itself.
  const destCacheContainer = turn.destCache ?? { map: new Map(), fingerprint: null };
  const currentFingerprint = occupancyFingerprint(state, combatantId);
  if (destCacheContainer.fingerprint !== currentFingerprint) {
    destCacheContainer.map.clear();
    destCacheContainer.fingerprint = currentFingerprint;
  }

  const scoredCache = new Map(); // "sequenceKey::includeMovement" -> [{proposal, gain}]
  // Shared pathfinding cache across the WHOLE search (every template, every phase) — see
  // generateProposals' own header for exactly what this does and does not assume safe to reuse.
  // UNCHANGED by fix 2: still per-call, still thrown away at the end, still mixes real-phase-0 and
  // hypothetical-phase-1+ computations exactly as before — this is deliberate (design doc §76.4 fix 2,
  // Finding 3), so nothing computed against a sandboxed, not-yet-real state can ever reach
  // `destCacheContainer.map`, which persists across real actions and must stay real-occupancy-only.
  const sharedDestCache = new Map();
  function scoredCandidatesFor(sequenceKey, sandboxState, sandboxTurn, includeMovement, isRealOccupancy) {
    const cacheKey = `${sequenceKey}::${includeMovement}`;
    if (scoredCache.has(cacheKey)) return scoredCache.get(cacheKey);
    const destCache = isRealOccupancy ? destCacheContainer.map : sharedDestCache;
    const rawProposals = generateProposals(sandboxState, combatantId, sandboxTurn, destCache, includeMovement);
    // §46 (AI profiles): a real CAPABILITY restriction, not a preference — filtered out before
    // scoring even begins, so a disabled action type is never a candidate at all, in either the
    // whole-turn search here or the competence<1 fallback below (both call this same helper).
    const proposals = filterDisabledTypes(rawProposals, disabledActionTypes);
    const localBefore = evaluateState(sandboxState, me.side, weights, combatantId);
    const scored = [];
    for (const proposal of proposals) {
      const trial = forkTurnSandbox({ state: sandboxState, turn: sandboxTurn });
      const result = trial.apply(combatantId, proposal);
      if (!result.legal) continue; // the ENGINE decides legality; we never re-derive it
      const gain = evaluateState(trial.state, me.side, weights, combatantId) - localBefore;
      scored.push({ proposal, gain });
    }
    scoredCache.set(cacheKey, scored);
    return scored;
  }
  function bestMatching(scored, filter) {
    if (!scored.length) return null;
    const matching = filter === anyType ? scored : scored.filter((s) => filter(s.proposal));
    const pool = matching.length ? matching : scored;
    return pool.reduce((best, cur) => (!best || cur.gain > best.gain ? cur : best), null);
  }

  const results = templates.map((template) => {
    const sandbox = forkTurnSandbox({ state, turn });
    const plan = [];
    let sequenceKey = "";
    while (sandbox.actionsRemaining() > 0) {
      const filter = template.phases[Math.min(plan.length, template.phases.length - 1)];
      // §43 performance: skip real pathfinding entirely for a phase whose filter could never
      // select "move" anyway (isControlType/isAttackType/isHealType) — the dominant cost in
      // generateProposals, paid for nothing on a phase that would just filter it back out.
      // isMoveType/anyType are the only two filters that can ever match a "move" proposal.
      const includeMovement = filter === anyType || filter === isMoveType;
      // plan.length === 0: this template hasn't applied any hypothetical action of its own yet, so
      // sandbox.state is still a fresh, unmutated fork of the real state (forkTurnSandbox wraps for
      // potential mutation; it does not itself change positions/HP) — genuinely real-occupancy-safe
      // to cache into destCacheContainer.map, regardless of which template this is (GH #62 fix 2).
      const isRealOccupancy = plan.length === 0;
      const scored = scoredCandidatesFor(sequenceKey, sandbox.state, sandbox.turn, includeMovement, isRealOccupancy);
      const picked = bestMatching(scored, filter);
      if (!picked) break;
      const result = sandbox.apply(combatantId, picked.proposal);
      plan.push({ proposal: picked.proposal, result, gain: picked.gain });
      sequenceKey += `|${proposalKey(picked.proposal)}`;
    }
    return { templateName: template.name, plan, finalState: sandbox.state };
  }).filter((r) => r.plan.length > 0);

  if (!results.length) return null;
  const scored = results.map((r) => ({ ...r, totalGain: evaluateState(r.finalState, me.side, weights, combatantId) - before }));
  scored.sort((a, b) => (b.totalGain - a.totalGain) || a.templateName.localeCompare(b.templateName));
  return scored[0];
}

/** Readable multi-action rationale — the report's own "readable rationales for free" benefit of
 * the template approach: names the winning template and shows every action still queued behind the
 * one actually being taken this call, not just that one action in isolation. */
function describePlan(planned) {
  const steps = planned.plan.map((s) => describe(s.proposal, s.result)).join(" → ");
  const actionWord = planned.plan.length === 1 ? "action" : "actions";
  return `${planned.templateName} plan (${planned.plan.length} ${actionWord}, projected total gain ${planned.totalGain.toFixed(1)}): ${steps}`;
}

/** design doc §46 (AI profiles): a real, honest capability restriction — proposals of a disabled
 * TYPE are removed before anything ever scores them, not merely deprioritized. `undefined`/empty
 * is the default, zero-cost path every pre-§46 caller takes. */
function filterDisabledTypes(proposals, disabledActionTypes) {
  if (!disabledActionTypes?.length) return proposals;
  return proposals.filter((p) => !disabledActionTypes.includes(p.type));
}

/**
 * `templates` (design doc §46 — AI profiles) is an OPTIONAL array of TURN_TEMPLATES entry NAMES
 * (plain strings — a profile is data, not function references), resolved here against this file's
 * own real template objects. Omitted means every named template is available, byte-identical to
 * every pre-§46 caller. `moraleEnabled`/`disabledActionTypes` are the other two real per-profile
 * overrides — see `checkShouldFlee`'s and `filterDisabledTypes`'s own headers for what each does.
 */
export function decide(state, combatantId, turn, { competence = 1, weights, templates: templateNames, moraleEnabled, disabledActionTypes } = {}) {
  const me = state.combatants.get(combatantId);
  if (!me) return null;
  if (turn.actionsAvailable - turn.actionsUsed <= 0) return null;

  if (checkShouldFlee(state, combatantId, moraleEnabled)) {
    const flee = proposeFlee(state, combatantId, turn);
    if (flee) return flee;
  }

  // Whole-turn planning (design doc §43, Stage 2) only at full competence. competence < 1 is
  // deliberately left on the exact pre-Stage-2 single-action greedy-then-softmax path below,
  // unchanged: competence already models an IMPERFECT actor sampling among single-action choices,
  // and stacking multi-action lookahead on top of that is a real, separate design question (how
  // should "imperfect play" behave over a whole plan?) this pass doesn't invent an answer to. A
  // skilled tactician planning several actions ahead and a middling one reacting one action at a
  // time is also the more natural reading of what "competence" already means in this file's own
  // header ("1 picks the best action every time, lower values sample more loosely").
  if (competence >= 1) {
    const activeTemplates = templateNames ? TURN_TEMPLATES.filter((t) => templateNames.includes(t.name)) : TURN_TEMPLATES;
    const planned = planTurn(state, combatantId, turn, weights, activeTemplates, disabledActionTypes);
    if (planned) {
      const first = planned.plan[0];
      return {
        ...first.proposal,
        score: Number(first.gain.toFixed(3)),
        reason: `${describe(first.proposal, first.result)} — ${describePlan(planned)}`
      };
    }
    // Falls through only when NOTHING at all was legal (every template filled zero actions) — the
    // loop below will independently discover the same thing and return null, same as always.
  }

  const before = evaluateState(state, me.side, weights, combatantId);
  const proposals = filterDisabledTypes(generateProposals(state, combatantId, turn), disabledActionTypes);
  if (!proposals.length) return null;

  const scored = [];
  for (const proposal of proposals) {
    const sandbox = forkTurnSandbox({ state, turn });
    const result = sandbox.apply(combatantId, proposal);
    if (!result.legal) continue; // the ENGINE decides legality; we never re-derive it
    const after = evaluateState(sandbox.state, me.side, weights, combatantId);
    scored.push({ proposal, gain: after - before, result });
  }
  if (!scored.length) return null;

  scored.sort((a, b) => (b.gain - a.gain) || describe(a.proposal, a.result).localeCompare(describe(b.proposal, b.result)));
  const best = scored[0];

  // NO "hold if nothing scores positive" GATE — deliberately (design doc §15k). If any action is
  // LEGAL, take the best one. Holding is what happens when the engine offers nothing at all, which
  // is the only honest reason to hold.

  const chosen = competence >= 1 ? best : sampleByCompetence(scored, competence, state, combatantId, turn);
  return {
    ...chosen.proposal,
    score: Number(chosen.gain.toFixed(3)),
    reason: `${describe(chosen.proposal, chosen.result)} — improves this side's position by ${chosen.gain.toFixed(1)} (best of ${scored.length} legal options)`
  };
}

/**
 * Softmax over candidate gains at a temperature set by competence. Sampling happens over the FULL
 * scored set rather than a pruned shortlist: capping the pool first would mean a low-competence
 * pilot structurally cannot make the kind of mediocre choice low competence is supposed to model.
 */
function sampleByCompetence(scored, competence, state, combatantId, turn) {
  const spread = Math.max(1e-6, scored[0].gain - scored[scored.length - 1].gain);
  const temperature = Math.max(1e-6, (1 - competence)) * spread;
  const weightsArr = scored.map((s) => Math.exp((s.gain - scored[0].gain) / temperature));
  const total = weightsArr.reduce((a, b) => a + b, 0);
  const rng = decisionRng(state, combatantId, turn.decisionIndex ?? 0);
  let roll = rng() * total;
  for (let i = 0; i < scored.length; i++) {
    roll -= weightsArr[i];
    if (roll <= 0) return scored[i];
  }
  return scored[0];
}

/** Human-readable action label, used for both the log reason and the deterministic tiebreak. */
function describe(proposal, result) {
  switch (proposal.type) {
    case "move": return `Move to (${proposal.to.col},${proposal.to.row})`;
    case "step": return `Step to (${proposal.to.col},${proposal.to.row}) — no reaction provoked`;
    case "strike": return `Strike with ${result?.strikeName ?? "weapon " + (proposal.strikeIndex ?? 0)}`;
    case "spellAttack": return `Cast ${result?.spellName ?? "spell " + (proposal.spellIndex ?? 0)}`;
    case "saveAttack": return `Use ${result?.saveAttackName ?? "ability " + (proposal.saveAttackIndex ?? 0)} against ${proposal.targetId}`;
    case "demoralize": return `Demoralize ${proposal.targetId}`;
    case "conditionSave": return `Use ${result?.conditionSaveName ?? "ability " + (proposal.conditionSaveIndex ?? 0)} against ${proposal.targetId}`;
    case "areaAttack": return `Throw ${result?.areaAttackName ?? "ability " + (proposal.areaAttackIndex ?? 0)} at ${proposal.originId}'s position`;
    case "healAbility": return `Heal ${proposal.targetId} with ${result?.abilityName ?? "ability"}`;
    case "trip": return `Trip ${proposal.targetId}`;
    case "shove": return `Shove ${proposal.targetId}`;
    case "grapple": return `Grapple ${proposal.targetId}`;
    case "escape": return "Escape";
    case "stand": return "Stand";
    case "crawl": return `Crawl to (${proposal.to.col},${proposal.to.row})`;
    default: return proposal.type;
  }
}
