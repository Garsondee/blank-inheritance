/**
 * THE EXACTNESS ORACLE (design doc §61/§64, GH issue #21) — "every serious MCTS implementation is
 * validated against an exact search on positions small enough to solve. Without it, 'the search
 * works' is a feeling; with it, it is a test." This is a TEST INSTRUMENT, not a policy meant to win
 * real tournaments: it enumerates every real legal candidate, exhaustively, to a fixed ply depth, and
 * returns the true minimax-over-expectation value and the true best action for that depth — no
 * pruning, no sampling, no heuristics inside the search itself (the only heuristic is `evaluateState`
 * at the depth cutoff, exactly like every other policy already uses it).
 *
 * PHASE A: DETERMINISTIC transitions for most action types — resolved through the real
 * `forkTurnSandbox`'s own default `EXPECTED_OUTCOMES` path (deterministic expected-value damage,
 * never real dice). Not a shortcut invented for this file: `decide()`'s own candidate scoring,
 * `greedy-v1`, `lookahead-v1`, and design doc §52's own tactical puzzles all already work this same
 * way — a Phase-A oracle scoped to that path is a genuine ground truth for them, not a lesser
 * approximation.
 *
 * PHASE B (design doc §64): real stochastic CHANCE NODES for `strike`/`trip` — `search/chance.mjs`'s
 * own `expandChanceNode` branches such a proposal into its real crit/hit/miss/crit-fail children, each
 * weighted by its real `degreeProbabilities`, and this file's own value for that proposal is the true
 * probability-weighted average of the recursively-searched value of every branch — the actual
 * "expectiminimax" the module's own name promises, not just "minimax over deterministic transitions."
 * Every OTHER stochastic action type (shove, grapple, saveAttack, demoralize, conditionSave,
 * areaAttack) still resolves through the deterministic `EXPECTED_OUTCOMES` path — `isStochasticProposal`
 * names exactly what's covered; extending it is real, separate, additive future work, not a redesign.
 *
 * FORCED NODES (design doc §61/#6's own node taxonomy) — the deterministic subset IS handled, matching
 * `engine.mjs`'s own `runBattle` loop exactly: Stunned's real action-loss arithmetic (`resolveEffectiveStats`),
 * Frightened's end-of-turn decay, Grapple's round-based expiry, dead combatants skipped in initiative
 * order. The one genuinely STOCHASTIC forced event — an unconscious combatant's own recovery check
 * (`resolveRecoveryCheck`, a real d20 flat check) — is NOT modeled yet; encountering one mid-search
 * stops that branch at its current value rather than guessing.
 *
 * SCOPE: personnels-scale only, matching issue #21's own suggested file path (inside `personnel-engine/`,
 * not `ai-common/`). Frame-scale support is real, separate future work, not attempted here.
 */
import { generateProposals } from "../decide.mjs";
import { forkTurnSandbox, checkOutcome } from "../engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../evaluate/state-value.mjs";
import { outcomeValue, nextActorAfterAction } from "./tree-shared.mjs";
import { isStochasticProposal, expandChanceNode } from "./chance.mjs";

/** The real, recursively-searched value of one already-resolved branch state (deterministic child
 * OR one real chance-node branch) — advances to the next real actor, or falls back to a direct
 * `evaluateState` leaf on a Phase-A gap (`stochasticGap`/`noActor`), exactly like the deterministic
 * path already does. Shared by both the plain and chance-node loops below so "what happens after one
 * real resolved outcome" is written once. */
function valueOfBranch({ branchState, branchTurn, actor, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored }) {
  const nextActor = nextActorAfterAction({ childState: branchState, childTurn: branchTurn, actor, initiativeOrder });
  if (nextActor.stochasticGap || nextActor.noActor) {
    addNodesExplored(1);
    return evaluateState(branchState, rootSide, weights);
  }
  const child = searchNode({ state: branchState, actor: nextActor, weights, rootSide, depthRemaining: depthRemaining - 1, initiativeOrder });
  addNodesExplored(child.nodesExplored);
  return child.value;
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

  const addNodesExplored = (n) => { nodesExplored += n; };

  for (const proposal of proposals) {
    if (isStochasticProposal(proposal)) {
      // A REAL chance node (design doc §64): branch into every real degree of success with
      // probability > 0, and this proposal's own value is the TRUE probability-weighted average of
      // each branch's own recursively-searched value — the real "expectiminimax," not an estimate.
      const branches = expandChanceNode({ state, turn: actor.turn, combatantId: actor.actingId, proposal });
      if (branches.length === 1 && !branches[0].legal) continue; // illegal — same as any other illegal proposal
      nodesExplored += branches.length;
      let weightedValue = 0;
      let anyLegalBranch = false;
      for (const branch of branches) {
        if (!branch.legal) continue; // defensive: legality shouldn't vary by degree, but never assume
        anyLegalBranch = true;
        const branchValue = valueOfBranch({ branchState: branch.state, branchTurn: branch.turn, actor, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored });
        weightedValue += branch.probability * branchValue;
      }
      if (!anyLegalBranch) continue;
      consider(weightedValue, proposal);
      continue;
    }

    const sandbox = forkTurnSandbox({ state, turn: actor.turn });
    const result = sandbox.apply(actor.actingId, proposal);
    if (!result.legal) continue;
    const branchValue = valueOfBranch({ branchState: sandbox.state, branchTurn: sandbox.turn, actor, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored });
    consider(branchValue, proposal);
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
