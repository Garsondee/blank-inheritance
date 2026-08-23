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
 */
import { forkTurnSandbox } from "./engine.mjs";
import { makeRng } from "../engine/rng.mjs";
import { distanceFeet, isInBounds, isOccupied, blocksPassage, FEET_PER_SQUARE } from "./grid.mjs";
import { splitByRelation } from "./factions.mjs";
import { evaluateState, attackOptions, proactiveAttackOptions, usefulRangeFeet, maxLegalRangeFeet } from "./evaluate/state-value.mjs";
import { reachableCells } from "./world/pathfind.mjs";
import { refreshBelief, believedEnemies } from "./knowledge/belief.mjs";
import { isDead } from "./conditions.mjs";
import { hasCover, lineOfEffect } from "./terrain.mjs";

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
  return cachedReachableCells(cache, key, { from: to, maxFeet: span, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls, moverSide: state.combatants.get(moverId).side });
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
 * Every action worth considering. Deliberately generous — the evaluator decides what is good,
 * this only decides what is *conceivable*.
 */
export function generateProposals(state, combatantId, turn) {
  const me = state.combatants.get(combatantId);
  const myPos = state.positions.get(combatantId);
  const proposals = [];
  if (!me || !myPos) return proposals;

  const speed = turn.effective?.speed ?? me.speed ?? 0;
  // Design doc §25: a downed-but-not-dead PC (isDead false, currentHP<=0) is still a real target —
  // both to an enemy looking to finish them off, and to an ally who might path over to heal them.
  // Filtering on currentHP>0 here would silently make the entire dying/revival mechanic invisible
  // to the AI's own candidate generation, the same shape of gap checkTargetAlive/
  // checkHealAbilityLegal both had before this pass (an unconscious PC being a real, legal target
  // is the actual point of the feature, not just an incidental detail).
  const living = [...state.combatants.values()].filter((c) => !isDead(c));
  const { allies, enemies } = splitByRelation(me, living);

  // Belief (design doc §15s): refreshed from the WHOLE side's combined current vision, not just
  // this one combatant.
  refreshBelief(state, me.side);
  const believedPositions = new Map(
    believedEnemies(state, me.side).filter((b) => b.position).map((b) => [b.id, b.position])
  );

  // --- Attacks: every option against every living enemy ---
  (me.strikes ?? []).forEach((s, i) => {
    if (s.reactionOnly) return;
    for (const e of enemies) proposals.push({ type: "strike", targetId: e.id, strikeIndex: i });
  });
  (me.spells ?? []).forEach((_, i) => {
    for (const e of enemies) proposals.push({ type: "spellAttack", targetId: e.id, spellIndex: i });
  });
  (me.saveAttacks ?? []).forEach((_, i) => {
    for (const e of enemies) proposals.push({ type: "saveAttack", targetId: e.id, saveAttackIndex: i });
  });

  // --- Demoralize (Intimidation): only offered if this combatant actually has an Intimidation
  // modifier extracted (opt-in, matching vision/walls' own pattern) and hasn't already tried this
  // specific target this battle (checkDemoralizeLegal would reject it anyway, but filtering here
  // keeps the candidate list honest rather than generating a proposal doomed to fail). ---
  if (me.intimidationModifier != null) {
    for (const e of enemies) {
      if (me.demoralizedTargets?.includes(e.id)) continue;
      proposals.push({ type: "demoralize", targetId: e.id });
    }
  }

  // --- Condition-only saves (design doc §22, e.g. Forced Reflection): same "skip an
  // already-doomed-to-fail proposal" filtering as Demoralize above, keyed per-ability since a
  // combatant could have more than one (checkConditionSaveLegal's own gate key). ---
  (me.conditionSaves ?? []).forEach((cs, i) => {
    for (const e of enemies) {
      if (me.conditionSaveTargets?.includes(`${cs.name}|${e.id}`)) continue;
      proposals.push({ type: "conditionSave", targetId: e.id, conditionSaveIndex: i });
    }
  });

  // --- Support ---
  (me.healAbilities ?? []).forEach((_, i) => {
    for (const t of [me, ...allies]) if (t.currentHP < t.maxHP) proposals.push({ type: "healAbility", targetId: t.id, abilityIndex: i });
  });

  // --- Movement: ALWAYS offered, and at several distinct standoffs ---
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
  // occupancy are all constant for the whole burst.
  const destCache = new Map();
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
  if (me.objective) addDest(bestDestinationToward(state, combatantId, myPos, me.objective, speed, 0, destCache));

  for (const d of destinations.values()) proposals.push({ type: "move", to: d });

  return proposals;
}

/**
 * Choose one action. Returns a proposal (with `reason` and `score`) or null when genuinely nothing
 * improves the position.
 *
 * `competence` in [0,1] is the tunable skill knob: 1 picks the best action every time, lower
 * values sample more loosely among the good ones via a softmax temperature.
 */
export function decide(state, combatantId, turn, { competence = 1, weights } = {}) {
  const me = state.combatants.get(combatantId);
  if (!me) return null;
  if (turn.actionsAvailable - turn.actionsUsed <= 0) return null;

  const before = evaluateState(state, me.side, weights);
  const proposals = generateProposals(state, combatantId, turn);
  if (!proposals.length) return null;

  const scored = [];
  for (const proposal of proposals) {
    const sandbox = forkTurnSandbox({ state, turn });
    const result = sandbox.apply(combatantId, proposal);
    if (!result.legal) continue; // the ENGINE decides legality; we never re-derive it
    const after = evaluateState(sandbox.state, me.side, weights);
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
    case "healAbility": return `Heal ${proposal.targetId} with ${result?.abilityName ?? "ability"}`;
    default: return proposal.type;
  }
}
