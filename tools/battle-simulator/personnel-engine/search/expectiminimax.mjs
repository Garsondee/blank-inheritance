/**
 * THE EXACTNESS ORACLE (design doc §61, GH issue #21) — "every serious MCTS implementation is
 * validated against an exact search on positions small enough to solve. Without it, 'the search
 * works' is a feeling; with it, it is a test." This is a TEST INSTRUMENT, not a policy meant to win
 * real tournaments: it enumerates every real legal candidate, exhaustively, to a fixed ply depth, and
 * returns the true minimax value and the true best action for that depth — no pruning, no sampling,
 * no heuristics inside the search itself (the only heuristic is `evaluateState` at the depth cutoff,
 * exactly like every other policy already uses it).
 *
 * PHASE A (this file, as shipped): DETERMINISTIC transitions only — every action resolves through
 * the real `forkTurnSandbox`, which already uses `EXPECTED_OUTCOMES` (deterministic expected-value
 * damage/effects, never real dice — engine.mjs's own documented sandbox contract). This is not a
 * shortcut invented for this file: `decide()`'s own candidate scoring, `greedy-v1`, and `lookahead-v1`
 * all already work this same way, and design doc §52's own tactical puzzles are explicitly verified
 * against this exact deterministic path ("every candidate scored inside decide() is expected-value
 * only... which is precisely why a single seed is enough here"). A real oracle needs to agree with
 * those same puzzles, so a Phase-A oracle scoped to the SAME deterministic transitions they already
 * use is a genuine, correct ground truth for them — not a lesser approximation.
 *
 * PHASE B (NOT built here, a real and separate future increment): stochastic CHANCE NODES — expanding
 * a proposal into its real crit/hit/miss/crit-miss branches via `degreeProbabilities`, each weighted
 * by its real probability, needed once GH issue #6's own MCTS build order reaches its chance-node step
 * (step 4). Building it now would be scope creep on top of an already substantial first component;
 * see the module's own `solve()` docs for exactly what this means in practice.
 *
 * FORCED NODES (design doc §61/#6's own node taxonomy) — the deterministic subset IS handled, matching
 * `engine.mjs`'s own `runBattle` loop exactly: Stunned's real action-loss arithmetic (`resolveEffectiveStats`),
 * Frightened's end-of-turn decay, Grapple's round-based expiry, dead combatants skipped in initiative
 * order. The one genuinely STOCHASTIC forced event — an unconscious combatant's own recovery check
 * (`resolveRecoveryCheck`, a real d20 flat check) — is NOT modeled yet (that's a Phase B chance node
 * too); encountering one mid-search stops that branch at its current value rather than guessing.
 *
 * SCOPE: personnels-scale only, matching issue #21's own suggested file path (inside `personnel-engine/`,
 * not `ai-common/`). Frame-scale support is real, separate future work, not attempted here.
 */
import { generateProposals } from "../decide.mjs";
import { forkTurnSandbox, checkOutcome } from "../engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../evaluate/state-value.mjs";
import { isDead, isUnconscious, releaseGrapple } from "../conditions.mjs";
import { resolveEffectiveStats } from "../combatant.mjs";

const WIN_VALUE = 1e6; // dominates any real evaluateState magnitude (bounded by real HP pools) by construction
const LOSS_VALUE = -WIN_VALUE;

function outcomeValue(outcome, rootSide) {
  if (outcome.result === "party-victory") return rootSide === "party" ? WIN_VALUE : LOSS_VALUE;
  if (outcome.result === "party-defeat") return rootSide === "party" ? LOSS_VALUE : WIN_VALUE;
  return 0; // checkOutcome only ever returns one of the two results above, or null (never reached)
}

/** The deterministic subset of `runBattle`'s own end-of-turn forced effects (design doc §61) —
 * Frightened decay, Grapple expiry — applied directly to `state`, which by the time this runs is
 * always a fresh fork this search node already owns exclusively (never the shared parent state). */
function applyEndOfTurnEffects(state, actorId) {
  const actor = state.combatants.get(actorId);
  if (actor.frightened > 0) actor.frightened -= 1;
  for (const c of state.combatants.values()) {
    if (c.grappledBy?.attackerId === actorId && state.round >= c.grappledBy.expiresEndOfRound) {
      releaseGrapple(c);
    }
  }
}

/**
 * Advances from just after `fromIndex`'s own turn to the next real actor with real actions to take,
 * applying the SAME deterministic forced effects `runBattle`'s own loop applies for everything short
 * of a real dice roll: dead combatants are skipped (matching `if (isDead(combatant)) continue`),
 * Stunned's real action-loss arithmetic is applied (matching `resolveEffectiveStats(combatant).actionsAvailable`
 * minus `stunnedValue`, mutating `stunnedValue` down the same way), and a combatant whose whole turn
 * is consumed by Stun is itself skipped with no decision node at all — exactly `runBattle`'s own
 * `continue` path.
 *
 * Returns `{ actingId, initiativeIndex, round, turn }` for the next real decision node, or
 * `{ stochasticGap: true }` if the next real turn belongs to an UNCONSCIOUS combatant (a real
 * recovery-check chance node this Phase-A oracle does not model — see this file's own header), or
 * `{ noActor: true }` if no combatant can ever act again (every remaining combatant dead, or the
 * bounded search guard below was exhausted — a real, structural end-of-search condition, not a bug).
 */
function advanceToNextActor(state, initiativeOrder, fromIndex, round) {
  let index = fromIndex;
  let currentRound = round;
  for (let guard = 0; guard < initiativeOrder.length * 4 + 4; guard++) {
    index += 1;
    if (index >= initiativeOrder.length) { index = 0; currentRound += 1; }
    const id = initiativeOrder[index];
    const combatant = state.combatants.get(id);
    if (isDead(combatant)) continue;
    if (isUnconscious(combatant)) return { stochasticGap: true };
    let actionsAvailable = resolveEffectiveStats(combatant).actionsAvailable;
    if (combatant.stunnedValue > 0) {
      const lost = Math.min(actionsAvailable, combatant.stunnedValue);
      combatant.stunnedValue -= lost;
      actionsAvailable -= lost;
      if (actionsAvailable <= 0) continue;
    }
    return {
      actingId: id, initiativeIndex: index, round: currentRound,
      turn: { actionsAvailable, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 }
    };
  }
  return { noActor: true };
}

/**
 * The real recursive search. `actor = { actingId, initiativeIndex, round, turn }` is the combatant
 * whose real decision this node explores. Returns `{ value, bestProposal, nodesExplored }` — `value`
 * is always in `rootSide`'s own terms (never flipped at the leaf; only the max/min choice at each
 * node flips as ownership changes between `rootSide` and the opponent — the real negamax reduction
 * design doc §61/#6 specifies for two teams with per-team shared, side-relative, symmetric utility).
 */
function searchNode({ state, actor, weights, rootSide, depthRemaining, initiativeOrder }) {
  const outcome = checkOutcome(state);
  if (outcome) return { value: outcomeValue(outcome, rootSide), bestProposal: null, nodesExplored: 1 };
  if (depthRemaining <= 0) return { value: evaluateState(state, rootSide, weights), bestProposal: null, nodesExplored: 1 };

  const me = state.combatants.get(actor.actingId);
  const isMaximizing = me.side === rootSide;
  const proposals = generateProposals(state, actor.actingId, actor.turn);

  let nodesExplored = 1;
  let best = null;
  const consider = (value, proposal) => {
    if (!best || (isMaximizing ? value > best.value : value < best.value)) best = { value, bestProposal: proposal };
  };

  for (const proposal of proposals) {
    const sandbox = forkTurnSandbox({ state, turn: actor.turn });
    const result = sandbox.apply(actor.actingId, proposal);
    if (!result.legal) continue;

    const childState = sandbox.state;
    const childTurn = sandbox.turn;
    let nextActor;
    if (childTurn.actionsAvailable - childTurn.actionsUsed > 0) {
      nextActor = { actingId: actor.actingId, initiativeIndex: actor.initiativeIndex, round: actor.round, turn: childTurn };
    } else {
      applyEndOfTurnEffects(childState, actor.actingId);
      const advanced = advanceToNextActor(childState, initiativeOrder, actor.initiativeIndex, actor.round);
      if (advanced.stochasticGap || advanced.noActor) {
        nodesExplored += 1;
        consider(evaluateState(childState, rootSide, weights), proposal);
        continue;
      }
      nextActor = advanced;
    }
    const child = searchNode({ state: childState, actor: nextActor, weights, rootSide, depthRemaining: depthRemaining - 1, initiativeOrder });
    nodesExplored += child.nodesExplored;
    consider(child.value, proposal);
  }

  if (!best) return { value: evaluateState(state, rootSide, weights), bestProposal: null, nodesExplored };
  return { value: best.value, bestProposal: best.bestProposal, nodesExplored };
}

/**
 * The real public entry point. `state`/`combatantId`/`turn` mean exactly what they mean for
 * `decide()` — `turn` reflects however many of `combatantId`'s own actions are already spent THIS
 * turn, so the oracle can be asked "what's exactly correct right now," mid-turn, same as any other
 * policy. `depth` is real ply count (one action-decision = one ply, matching design doc §61/#6's own
 * "nodes are action slots, not turns" — the SAME actor continuing their own turn still costs a ply).
 *
 * Returns `{ value, bestProposal, nodesExplored }` — `value` is exact for the given depth (not an
 * estimate), in `combatantId`'s OWN side's terms. `nodesExplored` is the real total decision-node
 * count actually visited, so a caller can see the real exhaustive-enumeration cost before running
 * this at a depth that would take an unreasonable amount of time (issue #21's own explicit test
 * requirement — "cost recorded so nobody accidentally runs it at depth 6").
 */
export function solve({ state, combatantId, turn, depth = 2, weights = DEFAULT_WEIGHTS }) {
  const me = state.combatants.get(combatantId);
  if (!me) return { value: 0, bestProposal: null, nodesExplored: 0 };
  const actor = {
    actingId: combatantId,
    initiativeIndex: state.initiativeOrder ? state.initiativeOrder.indexOf(combatantId) : 0,
    round: state.round ?? 1,
    turn
  };
  const initiativeOrder = state.initiativeOrder ?? [combatantId];
  return searchNode({ state, actor, weights, rootSide: me.side, depthRemaining: depth, initiativeOrder });
}
