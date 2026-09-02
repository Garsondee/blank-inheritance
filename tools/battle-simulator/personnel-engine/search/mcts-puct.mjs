/**
 * PUCT + PROGRESSIVE WIDENING — Stage 2, step 5 of GH issue #6's own 8-step build order (design doc
 * §65): "PUCT priors + progressive widening + move-groups. Test: same-budget win over plain UCT on
 * the puzzles." Built as its own module alongside `mcts.mjs` (plain UCT, kept unmodified — its own
 * tests and `mcts-uct-v1` registration stay exactly as real and correct as they already were), not a
 * rewrite of it, matching every other step this stage has taken: a genuinely new algorithm variant
 * gets its own file and its own policy id, never silently changing what an already-tested one does.
 *
 * PUCT ("Predictor + UCT," the AlphaZero selection rule, issue #6's own §4): instead of plain UCT's
 * "every unvisited child is infinitely interesting," PUCT scores a candidate by
 * `Q(c) + c_puct * P(c) * sqrt(N) / (1 + n(c))` — its own empirical mean value PLUS an exploration
 * bonus shaped by a real PRIOR `P(c)`, so a low-prior candidate genuinely can lose to a high-prior,
 * already-decent one even while still unvisited. The prior here is exactly what issue #6 specifies:
 * `P(a) = softmax(greedyGain(a) / tau)`, where `greedyGain` is the SAME real one-ply
 * `evaluateState(after) - evaluateState(before)` `decide()`'s own competence<1 fallback already
 * computes — "the hand evaluator standing in for the policy network." `c_puct`/`tau` are real,
 * reasonable, DELIBERATELY UNTUNED defaults; tuning them for real strength is issue #12's own job,
 * not this step's.
 *
 * PROGRESSIVE WIDENING: rather than every candidate being eligible for selection from move one (which
 * wastes budget spreading thin over a large branching factor before the prior has had any chance to
 * matter), only the top `ceil(k * N^alpha)` candidates BY PRIOR are eligible at a node with `N` real
 * visits so far — more candidates unlock as the node accumulates real visits. `k`/`alpha` are real,
 * untuned defaults (also issue #12's own tuning job).
 *
 * NOT ATTEMPTED THIS STEP (real, explicit, deferred): "move-groups" — collapsing near-duplicate
 * movement proposals (closing/standoff/disengage/cover) into one representative candidate before
 * scoring. A real, separate simplification issue #6's own step 5 also names; progressive widening
 * already bounds branching-factor cost numerically without it, so this is additive future work, not
 * a prerequisite. Chance-node consumption (real stochastic strike/trip branching during simulation,
 * as opposed to the deterministic one-ply gain used for the PRIOR only) is likewise NOT wired in here
 * — `mcts-uct-v1` doesn't have it either; it's real, separate, still-unstarted work for this whole
 * search family, tracked separately from PUCT itself.
 */
import { generateProposals } from "../decide.mjs";
import { forkTurnSandbox, checkOutcome } from "../engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../evaluate/state-value.mjs";
import { outcomeValue, nextActorAfterAction } from "./tree-shared.mjs";

const DEFAULT_C_PUCT = 1.5; // real, reasonable, UNTUNED — issue #12 owns tuning this
const DEFAULT_TAU = 10; // softmax temperature over real evaluateState gains — also untuned
const DEFAULT_WIDENING_K = 2;
const DEFAULT_WIDENING_ALPHA = 0.5;

/**
 * Real one-ply candidates for `actor`, each pre-scored with its own real `evaluateState` gain (via
 * the SAME deterministic `forkTurnSandbox` path `decide()`'s own fallback and `mcts.mjs`'s own leaf
 * evaluation already use — chance-node branching is deliberately NOT consulted for the prior, matching
 * issue #6's own "the one-ply gain decide() already computes"), then converted to a real softmax
 * prior and sorted highest-prior-first (the order progressive widening's own top-`m` rule needs).
 * Each candidate carries its own already-forked `sandboxState`/`sandboxTurn` so a later expansion
 * never re-forks the same proposal twice.
 */
function computeCandidates(state, actor, weights, tau) {
  const me = state.combatants.get(actor.actingId);
  const before = evaluateState(state, me.side, weights, actor.actingId);
  const proposals = generateProposals(state, actor.actingId, actor.turn);

  const scored = [];
  for (const proposal of proposals) {
    const sandbox = forkTurnSandbox({ state, turn: actor.turn });
    const result = sandbox.apply(actor.actingId, proposal);
    if (!result.legal) continue;
    const gain = evaluateState(sandbox.state, me.side, weights, actor.actingId) - before;
    scored.push({ proposal, gain, sandboxState: sandbox.state, sandboxTurn: sandbox.turn });
  }
  if (!scored.length) return [];

  const maxGain = Math.max(...scored.map((s) => s.gain));
  const expWeights = scored.map((s) => Math.exp((s.gain - maxGain) / tau));
  const sumExp = expWeights.reduce((a, b) => a + b, 0);
  return scored
    .map((s, i) => ({ proposal: s.proposal, prior: expWeights[i] / sumExp, sandboxState: s.sandboxState, sandboxTurn: s.sandboxTurn, visits: 0, valueSum: 0, child: null }))
    .sort((a, b) => b.prior - a.prior);
}

function makeNode(state, actor, rootSide, weights, maxDepth, depth, tau) {
  const outcome = checkOutcome(state);
  if (outcome) return { state, actor, depth, terminal: true, terminalValue: outcomeValue(outcome, rootSide), candidates: [] };
  const horizon = depth >= maxDepth;
  return { state, actor, depth, terminal: false, horizon, candidates: horizon ? [] : computeCandidates(state, actor, weights, tau) };
}

/** PUCT selection among the real, progressive-widening-eligible candidates of `node` (already sorted
 * prior-descending) — maximizes for `rootSide`'s own team, mirrors for the opponent, the same
 * two-team negamax reduction every search in this directory already uses. */
function selectCandidate(node, rootSide, cPuct, wideningK, wideningAlpha) {
  const isMaximizing = node.state.combatants.get(node.actor.actingId).side === rootSide;
  const totalVisits = node.candidates.reduce((sum, c) => sum + c.visits, 0);
  const allowedCount = Math.max(1, Math.min(node.candidates.length, Math.ceil(wideningK * Math.pow(totalVisits + 1, wideningAlpha))));

  let best = null, bestScore = -Infinity;
  for (let i = 0; i < allowedCount; i++) {
    const c = node.candidates[i];
    const q = c.visits ? c.valueSum / c.visits : 0;
    const u = cPuct * c.prior * Math.sqrt(totalVisits) / (1 + c.visits);
    const score = (isMaximizing ? q : -q) + u;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

function runIteration(root, rootSide, weights, maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha) {
  let node = root;
  const path = [];

  while (!node.terminal && !node.horizon && node.candidates.length > 0) {
    const candidate = selectCandidate(node, rootSide, cPuct, wideningK, wideningAlpha);
    path.push(candidate);
    if (!candidate.child) {
      const nextActor = nextActorAfterAction({ childState: candidate.sandboxState, childTurn: candidate.sandboxTurn, actor: node.actor, initiativeOrder });
      candidate.child = (nextActor.stochasticGap || nextActor.noActor)
        ? { state: candidate.sandboxState, actor: node.actor, depth: node.depth + 1, terminal: false, horizon: true, candidates: [] }
        : makeNode(candidate.sandboxState, nextActor, rootSide, weights, maxDepth, node.depth + 1, tau);
      node = candidate.child;
      break; // "leaf = evaluateState": a freshly-expanded node is this iteration's own leaf, no further descent
    }
    node = candidate.child;
  }

  const leafValue = node.terminal ? node.terminalValue : evaluateState(node.state, rootSide, weights);
  for (const c of path) {
    c.visits += 1;
    c.valueSum += leafValue;
  }
}

/**
 * The real public entry point — same shape as `mcts.mjs`'s own `search()`. Returns
 * `{ bestProposal, visits, meanValue, iterations, root }`; `bestProposal` is the ROBUST candidate
 * (most real visits, issue #6's own stated anytime rule), not the raw highest-prior or highest-mean
 * one. `cPuct`/`tau`/`wideningK`/`wideningAlpha` are real, overridable, but default to the
 * deliberately-untuned values documented above.
 */
export function search({
  state, combatantId, turn, iterations = 500, maxDepth = 4, weights = DEFAULT_WEIGHTS,
  cPuct = DEFAULT_C_PUCT, tau = DEFAULT_TAU, wideningK = DEFAULT_WIDENING_K, wideningAlpha = DEFAULT_WIDENING_ALPHA
}) {
  const me = state.combatants.get(combatantId);
  if (!me) return { bestProposal: null, visits: 0, meanValue: 0, iterations: 0, root: null };
  const rootSide = me.side;
  const actor = {
    actingId: combatantId,
    initiativeIndex: state.initiativeOrder ? state.initiativeOrder.indexOf(combatantId) : 0,
    round: state.round ?? 1,
    turn
  };
  const initiativeOrder = state.initiativeOrder ?? [combatantId];
  const root = makeNode(state, actor, rootSide, weights, maxDepth, 0, tau);

  if (root.terminal || root.candidates.length === 0) {
    return { bestProposal: null, visits: 0, meanValue: root.terminal ? root.terminalValue : evaluateState(state, rootSide, weights), iterations: 0, root };
  }

  let realIterations = 0;
  for (let i = 0; i < iterations; i++) {
    runIteration(root, rootSide, weights, maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha);
    realIterations += 1;
  }

  let best = null;
  for (const c of root.candidates) {
    if (!best || c.visits > best.visits) best = c;
  }
  return {
    bestProposal: best.proposal,
    visits: best.visits,
    meanValue: best.visits ? best.valueSum / best.visits : 0,
    iterations: realIterations,
    root
  };
}
