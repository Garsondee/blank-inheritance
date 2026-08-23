/**
 * The decision layer (design doc §15j). Replaces the old
 * generate-candidates → `weight × value` → argmax pipeline.
 *
 * HOW THIS DIFFERS, and why each difference was necessary:
 *
 *  1. **Actions are scored by the STATE they produce**, not by a hand-assigned
 *     magnitude. Every candidate is applied to a private sandbox running the real
 *     engine, and its score is `evaluate(after) − evaluate(before)`. That puts
 *     movement, attacking, healing and evacuating into one currency for the first
 *     time — previously every move scored a flat `1` and the weights table WAS the
 *     entire normalisation mechanism.
 *
 *  2. **Movement candidates are always generated.** The old generator returned
 *     `null` the moment a combatant was already in "clean range" of something,
 *     so an in-range combatant had literally zero move options. Combined with
 *     rounds 1-2 where the Claimant is immune (making every attack score exactly
 *     0) and a rule that held the turn whenever the best score was ≤ 0, that
 *     produced guaranteed do-nothing turns. Measured: 25% of all turns spent zero
 *     action points, and `vesper` idled 59% of its turns having never moved once.
 *
 *  3. **Legality is never re-derived.** A candidate is "legal" iff the real engine
 *     accepts it in the sandbox. The AI proposes; the engine judges. This is why
 *     illegal-proposal count can stay at zero without the AI knowing any rules.
 *
 *  4. **Randomness comes from its own stream.** See `decisionRng` below.
 *
 * Depth is deliberately 1 (apply one action, evaluate, choose). Instrumenting the
 * old system showed the median decision had TWO candidates — a beam search over
 * two options is not a search. Fix the generator and the evaluator first, measure,
 * and only then decide whether deeper lookahead earns its cost.
 */
import { forkTurnSandbox } from "../engine/engine.mjs";
import { makeRng } from "../engine/rng.mjs";
import { distanceFeet, isInBounds, isOccupied, FEET_PER_SQUARE } from "../engine/grid.mjs";
import { evaluateState, attackOptions, usefulRangeFeet } from "./evaluate/state-value.mjs";
import { reachableCells } from "./world/pathfind.mjs";
import { refreshBelief, believedEnemies } from "./knowledge/belief.mjs";

/**
 * A per-decision RNG derived from (battle seed, round, combatant, decision index).
 *
 * It must NOT be the engine's rng. If the AI drew from the battle's stream, then
 * changing the AI at all — one more candidate, a different beam width — would
 * re-align every subsequent d20, and you could never tell whether a new AI won
 * because it played better or because the dice fell differently. Deriving an
 * independent stream preserves common random numbers across AI versions, which is
 * what makes before/after comparison meaningful.
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
 * Walk one straight line from `from` toward `to`, stopping at the last square that
 * is in bounds, unoccupied, within `maxFeet` of the start, and no further from the
 * goal than the previous step. Straight-line-only is deliberate: the engine
 * validates a move as ONE straight hop from the turn's start position, so a bent
 * path would be generated and then rejected — a bug this project has already hit.
 */
/** Walk a SINGLE fixed (dx,dy) direction from `from`, stopping at bounds/occupied/budget/standoff/overshoot. */
function extend(state, others, from, to, dx, dy, maxFeet, standoffFeet) {
  let cur = { ...from };
  let curDist = distanceFeet(cur, to);
  for (;;) {
    if (curDist <= standoffFeet) break;
    const next = { col: cur.col + dx, row: cur.row + dy };
    if (!isInBounds(next, state.gridSize)) break;
    if (isOccupied(next, others)) break;
    if (distanceFeet(from, next) > maxFeet) break;
    const nextDist = distanceFeet(next, to);
    if (nextDist >= curDist) break; // never overshoot past the closest approach (design doc §14i)
    cur = next; curDist = nextDist;
  }
  return (cur.col === from.col && cur.row === from.row) ? null : cur;
}

/**
 * REGRESSION (found migrating this project's test suite, not by inspection): a single-heading-only
 * version of this function returns null the instant its ONE direction is blocked on the very first
 * step — a teammate parked directly on the heading toward the only target on the map left a
 * combatant with zero move candidates ("the Frame got stuck at spawn for multiple rounds," §14h's
 * own documented bug). A full Dijkstra fallback was tried and MEASURED to be far too expensive to
 * use this often: generateProposals calls this once per weapon-range per enemy plus contact/melee,
 * and a full flow-field search averages ~17ms — a 20-seed sweep that normally runs in ~800ms took
 * over 90 SECONDS once nearly every "already adjacent, standoff=0 wants the literal same occupied
 * square" call triggered it. Fixed instead with the same cheap, proven approach this project's
 * original computeDestination used before decide.mjs replaced it: try up to 7 nearby compass
 * headings, not just the one exact bearing to the target, and take the first that makes real
 * progress. A handful of straight-line walks costs microseconds, not milliseconds — reserving the
 * expensive real-pathfinding path (bestDestinationToward's OWN wall-gated branch, still Dijkstra
 * where it's genuinely needed) for when a scenario actually defines walls.
 */
function stepToward(state, moverId, from, to, maxFeet, standoffFeet) {
  const others = [...state.positions.entries()].filter(([id]) => id !== moverId).map(([, p]) => p);
  const primaryDx = Math.sign(to.col - from.col);
  const primaryDy = Math.sign(to.row - from.row);
  if (primaryDx === 0 && primaryDy === 0) return null;
  const headings = [
    [primaryDx, primaryDy], [primaryDx, 0], [0, primaryDy],
    [primaryDx, 1], [primaryDx, -1], [1, primaryDy], [-1, primaryDy]
  ];
  for (const [dx, dy] of headings) {
    if (dx === 0 && dy === 0) continue;
    const result = extend(state, others, from, to, dx, dy, maxFeet, standoffFeet);
    if (result) return result;
  }
  return null;
}

/** Straight line directly AWAY from a point, for disengaging. */
function stepAway(state, moverId, from, threat, maxFeet) {
  const others = [...state.positions.entries()].filter(([id]) => id !== moverId).map(([, p]) => p);
  const dx = Math.sign(from.col - threat.col) || 1;
  const dy = Math.sign(from.row - threat.row) || 0;
  let cur = { ...from };
  for (;;) {
    const next = { col: cur.col + dx, row: cur.row + dy };
    if (!isInBounds(next, state.gridSize)) break;
    if (isOccupied(next, others)) break;
    if (distanceFeet(from, next) > maxFeet) break;
    cur = next;
  }
  return (cur.col === from.col && cur.row === from.row) ? null : cur;
}

/**
 * Wall-aware destination selection (design doc §15q). stepToward's straight-line walk simply
 * gives up — returns null — the moment a wall blocks its one path, even when a route exists two
 * squares to the side; that degrades gracefully (this destination candidate just doesn't appear)
 * rather than crashing, but it can't discover a route that requires going around something.
 *
 * Real Dijkstra fixes that, so this reaches for it — but ONLY when the scenario actually defines
 * walls. Every scenario in this project has none today, and pathfind.mjs's flood-fill is
 * meaningfully more expensive than a straight-line walk, so paying that cost on every single
 * candidate for the overwhelming common case would be waste for zero behavioural benefit. The
 * gate keeps stepToward/stepAway themselves completely untouched — zero risk to the path every
 * existing scenario actually runs.
 */
/**
 * REGRESSION (found running a real synthetic-wall battle, not by inspection): the first version
 * of this function found reachable cells correctly (real Dijkstra) but still SCORED them by
 * straight-line distanceFeet — which stops correlating with true proximity right next to a wall,
 * where the straight-line-closest reachable cell can be a dead end. That produced a genuine
 * infinite oscillation: two combatants cycling the exact same position sequence forever, because
 * each turn's fresh candidate generation, from a position where the straight-line metric was
 * already "locally best," found nothing better and returned null — leaving stepAway's
 * flee-to-the-farthest-reachable-corner as the only other candidate on offer, which the AI (by
 * design, see decide()'s no-hold-gate) then had to take even though it scored deeply negative.
 *
 * Fixed with a proper flow field: a SECOND Dijkstra run, from the TARGET this time, gives true
 * path-distance-to-target for every cell in one search — movement/occupancy blocking is
 * direction-agnostic (moveBlockedBetween and isOccupied are both symmetric, verified in
 * terrain.test.mjs), so "distance from X to the target" computed this way is exactly the number
 * "distance from the target to X" would be. Candidates are then scored by TRUE path distance,
 * not straight-line — the metric now actually decreases as a mover makes real progress around
 * an obstacle, which is what makes each turn's fresh candidate generation converge instead of
 * getting stuck re-discovering the same "locally best by the wrong metric" dead end.
 */
function trueDistanceField(state, moverId, to, others) {
  const span = Math.max(state.gridSize.cols, state.gridSize.rows) * FEET_PER_SQUARE * 4; // generous — covers any plausible detour on this map
  return reachableCells({ from: to, maxFeet: span, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls });
}

function pathfindingDestinationToward(state, moverId, from, to, maxFeet, standoffFeet) {
  const others = [...state.positions.entries()].filter(([id]) => id !== moverId).map(([, p]) => p);
  const reachable = reachableCells({ from, maxFeet, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls });
  const distField = trueDistanceField(state, moverId, to, others);
  const trueDist = (col, row) => distField.get(`${col},${row}`)?.cost ?? distanceFeet({ col, row }, to) * 10; // unreachable at all — treat as very far, not infinite

  let best = null, bestScore = Math.max(trueDist(from.col, from.row), standoffFeet), bestCost = 0;
  for (const [cellKey, { cost }] of reachable) {
    const [col, row] = cellKey.split(",").map(Number);
    const score = Math.max(trueDist(col, row), standoffFeet);
    if (score < bestScore || (score === bestScore && cost < bestCost)) {
      best = { col, row }; bestScore = score; bestCost = cost;
    }
  }
  return best;
}

/**
 * Wall-gated only — see stepToward's own header for why a Dijkstra-on-null fallback here was
 * tried, measured, and reverted (a 20-seed sweep going from ~800ms to 90+ seconds). stepToward's
 * 7-heading retry handles ordinary sidestepping-around-an-occupied-cell cheaply on its own now;
 * real pathfinding is reserved for when a scenario genuinely defines walls, which is rare and
 * deliberately opt-in.
 */
function bestDestinationToward(state, moverId, from, to, maxFeet, standoffFeet) {
  if (state.walls?.length) return pathfindingDestinationToward(state, moverId, from, to, maxFeet, standoffFeet);
  return stepToward(state, moverId, from, to, maxFeet, standoffFeet);
}

function pathfindingDestinationAway(state, moverId, from, threat, maxFeet) {
  const others = [...state.positions.entries()].filter(([id]) => id !== moverId).map(([, p]) => p);
  const reachable = reachableCells({ from, maxFeet, gridSize: state.gridSize, occupiedPositions: others, walls: state.walls });
  const distField = trueDistanceField(state, moverId, threat, others);
  const trueDist = (col, row) => distField.get(`${col},${row}`)?.cost ?? distanceFeet({ col, row }, threat) * 10;

  let best = null, bestDist = trueDist(from.col, from.row), bestCost = 0;
  for (const [cellKey, { cost }] of reachable) {
    const [col, row] = cellKey.split(",").map(Number);
    const dist = trueDist(col, row);
    if (dist > bestDist || (dist === bestDist && cost < bestCost)) {
      best = { col, row }; bestDist = dist; bestCost = cost;
    }
  }
  return best;
}

/**
 * The wall-aware sibling of stepAway — gated on walls ONLY, deliberately NOT given the same
 * null-triggers-a-fallback behavior bestDestinationToward has.
 *
 * MEASURED, NOT ASSUMED: stepAway has no cheap "already satisfied" exit the way stepToward does
 * (standoffFeet) — it unconditionally tries to move as far away as budget allows, so its ONLY
 * null case is "the very first step in the away direction is blocked" (an edge or an occupied
 * cell). That turned out to be common in ordinary, non-adversarial positions — a combatant near
 * any map boundary fleeing toward it hits this on nearly every disengage candidate, of which
 * generateProposals generates one per living enemy per decision. Falling back to a full Dijkstra
 * flood-fill on every one of those took a 20-seed sweep from ~800ms to well over 90 SECONDS.
 * Unlike bestDestinationToward's fallback — which fixes a real, previously-documented bug
 * ("the Frame got stuck at spawn for multiple rounds") — a slightly weaker disengage option in an
 * edge-adjacent position has no comparable cost to justify paying for it here.
 */
function bestDestinationAway(state, moverId, from, threat, maxFeet) {
  if (state.walls?.length) return pathfindingDestinationAway(state, moverId, from, threat, maxFeet);
  return stepAway(state, moverId, from, threat, maxFeet);
}

/**
 * Every action worth considering. Deliberately generous — the evaluator decides
 * what is good, this only decides what is *conceivable*. A starved generator
 * cannot be rescued by any amount of clever scoring downstream.
 */
export function generateProposals(state, combatantId, turn) {
  const me = state.combatants.get(combatantId);
  const myPos = state.positions.get(combatantId);
  const proposals = [];
  if (!me || !myPos) return proposals;

  const speed = turn.effective?.speed ?? me.speed ?? 0;
  const living = [...state.combatants.values()].filter((c) => c.currentHP > 0);
  const enemies = living.filter((c) => c.side !== me.side);
  const allies = living.filter((c) => c.side === me.side && c.id !== combatantId);

  // Belief (design doc §15s): refreshed from the WHOLE side's combined current vision, not just
  // this one combatant — a Sensor Operator's good vision covers for a near-blind Frame teammate.
  // Cheap and unconditional (O(allies x enemies)), matching every other opt-in mechanism this
  // pass added: when nothing anywhere defines a `vision` field, every enemy is trivially
  // perceivable by everyone, so believedPositions ends up identical to ground truth — a provable
  // no-op for every scenario today, not a special-cased fast path that could drift from the slow one.
  refreshBelief(state, me.side);
  const believedPositions = new Map(
    believedEnemies(state, me.side).filter((b) => b.position).map((b) => [b.id, b.position])
  );

  // --- Attacks: every option against every living enemy ---
  (me.strikes ?? []).forEach((_, i) => {
    for (const e of enemies) proposals.push({ type: "strike", targetId: e.id, strikeIndex: i });
  });
  (me.spells ?? []).forEach((_, i) => {
    for (const e of enemies) proposals.push({ type: "spellAttack", targetId: e.id, spellIndex: i });
  });

  // --- Support ---
  (me.healAbilities ?? []).forEach((_, i) => {
    for (const t of [me, ...allies]) if (t.currentHP < t.maxHP) proposals.push({ type: "healAbility", targetId: t.id, abilityIndex: i });
  });
  if (me.repairBonus != null && me.handlingDC != null) {
    for (const a of allies) if (a.currentHP < a.maxHP) proposals.push({ type: "repair", targetId: a.id });
  }
  for (const a of allies) if (!a.spotted && attackOptions(a).length) proposals.push({ type: "spot", targetId: a.id });
  if (me.canEvacuate) proposals.push({ type: "evacuate" });
  if (me.objective) proposals.push({ type: "advance", towards: me.objective });

  // --- Movement: ALWAYS offered, and at several distinct standoffs ---
  // The old generator produced at most one destination and only when out of range.
  // These aim at the ranges that actually matter: each of my weapons' useful reach
  // against each enemy, plus closing to contact and disengaging entirely.
  const destinations = new Map(); // keyed by cell so duplicates collapse
  const addDest = (d) => { if (d) destinations.set(`${d.col},${d.row}`, d); };

  const myRanges = [...new Set(attackOptions(me).map(usefulRangeFeet).filter((r) => Number.isFinite(r)))];
  // Step (design doc §15o): a one-square hop that never provokes a reaction, offered ONLY for the
  // specific case Step actually exists for — closing the last square onto a reaction-capable
  // (Large+, per the engine's own reaction-eligibility check) enemy. The sandbox evaluator prices
  // the alternative honestly: a plain "move" candidate that ends adjacent already has the real
  // Claim reaction fire inside the sandbox, so its evaluated score already reflects that
  // risk — offering Step alongside it is what lets the AI discover "close via Step instead" as
  // the better play, rather than something hardcoded to always prefer one over the other.
  const stepCandidates = [];
  for (const e of enemies) {
    // Believed position, not ground truth (design doc §15s) — an enemy with no belief entry at
    // all has never been perceived by anyone on this side, and this is deliberately the ONE place
    // that matters: proposing a move toward its true secret position would be omniscient cheating.
    // Attacks don't need the same guard here — they're separately, correctly gated by REAL-TIME
    // perception in checkStrikeLegal/checkSpellAttackLegal, so an attack candidate against
    // something not currently visible is simply rejected as illegal downstream, same as any other
    // illegal proposal.
    const ePos = believedPositions.get(e.id);
    if (!ePos) continue;
    for (const r of myRanges) addDest(bestDestinationToward(state, combatantId, myPos, ePos, speed, r));
    addDest(bestDestinationToward(state, combatantId, myPos, ePos, speed, FEET_PER_SQUARE)); // close to contact
    addDest(bestDestinationToward(state, combatantId, myPos, ePos, speed, 0));
    addDest(bestDestinationAway(state, combatantId, myPos, ePos, speed));                    // disengage

    if (["large", "huge", "gargantuan"].includes(e.size)) {
      const hop = bestDestinationToward(state, combatantId, myPos, ePos, FEET_PER_SQUARE, 0);
      if (hop) stepCandidates.push(hop);
    }
  }
  for (const a of allies) {
    const aPos = state.positions.get(a.id);
    if (aPos && a.currentHP < a.maxHP) addDest(bestDestinationToward(state, combatantId, myPos, aPos, speed, FEET_PER_SQUARE));
  }
  if (me.objective) addDest(bestDestinationToward(state, combatantId, myPos, me.objective, speed, 0));

  for (const d of destinations.values()) proposals.push({ type: "move", to: d });
  for (const d of stepCandidates) proposals.push({ type: "step", to: d });

  return proposals;
}

/**
 * Choose one action. Returns a proposal (with `reason` and `score`) or null when
 * genuinely nothing improves the position.
 *
 * `competence` in [0,1] is the tunable skill knob: 1 picks the best action every
 * time, lower values sample more loosely among the good ones via a softmax
 * temperature. This is how "simulate good and bad tactical choices by the players"
 * becomes a dial rather than a rewrite.
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

  // NO "hold if nothing scores positive" GATE — deliberately (design doc §15k).
  //
  // The old AI returned null whenever its best candidate scored <= 0, and that single
  // line produced a quarter of all turns being spent motionless. It is wrong for this
  // game on two counts. Mechanically, SF2E gives you three actions and almost always
  // something to spend them on; a real combatant repositions, Seeks, Aids or takes
  // cover rather than standing still, and Ingram's own framing is that running out of
  // things to do should be "very very very rare." Numerically, "0" is not a neutral
  // baseline here — an evaluator that prices incoming threat at all makes *approaching
  // a dangerous enemy* score slightly negative, so gating on > 0 systematically
  // punishes exactly the aggressive play the fight needs.
  //
  // So: if any action is LEGAL, take the best one. Holding is what happens when the
  // engine offers nothing at all, which is the only honest reason to hold.

  const chosen = competence >= 1 ? best : sampleByCompetence(scored, competence, state, combatantId, turn);
  return {
    ...chosen.proposal,
    score: Number(chosen.gain.toFixed(3)),
    reason: `${describe(chosen.proposal, chosen.result)} — improves this side's position by ${chosen.gain.toFixed(1)} (best of ${scored.length} legal options)`
  };
}

/**
 * Softmax over candidate gains at a temperature set by competence. Sampling
 * happens over the FULL scored set rather than a pruned shortlist: capping the
 * pool first would mean a low-competence pilot structurally cannot make the kind
 * of mediocre choice that low competence is supposed to model.
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
    case "advance": return "Advance toward the objective";
    case "strike": return `Strike with ${result?.strikeName ?? "weapon " + (proposal.strikeIndex ?? 0)}`;
    case "spellAttack": return `Cast ${result?.spellName ?? "spell " + (proposal.spellIndex ?? 0)}`;
    case "healAbility": return `Heal ${proposal.targetId} with ${result?.abilityName ?? "ability"}`;
    case "repair": return `Field Repair ${proposal.targetId}`;
    case "spot": return `Spot for ${proposal.targetId}`;
    case "evacuate": return "Evacuate civilians";
    default: return proposal.type;
  }
}
