/**
 * PLAIN UCT MCTS — Stage 2 core, step 2 of GH issue #6's own 8-step build order (design doc §62):
 * "Decision + terminal nodes, deterministic transitions (EXPECTED_OUTCOMES), plain UCT, leaf =
 * evaluateState. Test: converges to the oracle on the design doc §52 puzzles." Built ONE component
 * at a time (Ingram's own explicit instruction, 2026-09-02) — this is deliberately NOT yet PUCT
 * (priors are #12), NOT yet chance nodes (#7/Phase B), NOT yet MCTS-Solver (later in #6's own build
 * order). A plain, textbook-shape UCT tree search, checked against the Phase-A exactness oracle
 * (`expectiminimax.mjs`) this file shares its own node-taxonomy mechanics with (`tree-shared.mjs`).
 *
 * "leaf = evaluateState" (the build order's own words) means there is NO rollout/simulation phase in
 * this step — when a new node is expanded, its value estimate is `evaluateState` at that node
 * DIRECTLY, not a played-out game. A real rollout policy is #8's own later, separate step ("reuse
 * decide() and evaluateState, don't replace them") — building one now would be scope creep on an
 * already real, testable component.
 *
 * DEPTH-CAPPED, on purpose, unlike a "real" production MCTS: `maxDepth` bounds expansion the same way
 * the oracle's own `depth` does, so the two search the IDENTICAL horizon and "converges to the oracle"
 * is a fair, apples-to-apples comparison rather than one search exploring a different-shaped tree than
 * the other. A node at the depth cutoff becomes a HORIZON leaf — evaluated directly, never expanded
 * further, exactly like the oracle's own `depthRemaining <= 0` case.
 *
 * Values are kept ROOT-RELATIVE throughout (never per-node "current mover's own perspective," the
 * more common textbook negamax-MCTS convention) — matching `expectiminimax.mjs`'s own convention
 * exactly, and reusing its own `outcomeValue`/`nextActorAfterAction` helpers unmodified. Selection
 * MAXIMIZES the UCT score for a node owned by `rootSide`'s own team, MINIMIZES (mirrored) for the
 * opponent — the same two-team negamax reduction, just applied at selection time instead of via a
 * backprop sign flip.
 */
import { generateProposals } from "../decide.mjs";
import { forkTurnSandbox, checkOutcome } from "../engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../evaluate/state-value.mjs";
import { outcomeValue, nextActorAfterAction, proposalKey } from "./tree-shared.mjs";

const EXPLORATION_CONSTANT = Math.SQRT2; // standard UCT c = sqrt(2); tuning c/tau is issue #12's own job

function makeNode(state, actor, rootSide, maxDepth, depth) {
  const outcome = checkOutcome(state);
  if (outcome) {
    return { state, actor, depth, visits: 0, valueSum: 0, children: new Map(), terminal: true, terminalValue: outcomeValue(outcome, rootSide), untriedProposals: [] };
  }
  const horizon = depth >= maxDepth;
  return {
    state, actor, depth, visits: 0, valueSum: 0, children: new Map(),
    terminal: false, horizon,
    untriedProposals: horizon ? [] : generateProposals(state, actor.actingId, actor.turn)
  };
}

/** UCT among an ALREADY-EXPANDED node's real children — maximizes for `rootSide`'s own team,
 * minimizes (mirrored) for the opponent, exactly the oracle's own two-team negamax reduction applied
 * at selection time. An unvisited child (should not occur given expand-before-reselect ordering, but
 * defended against anyway) gets infinite priority, standard MCTS practice. */
function selectChild(node, rootSide) {
  const isMaximizing = node.state.combatants.get(node.actor.actingId).side === rootSide;
  let best = null, bestScore = -Infinity;
  for (const child of node.children.values()) {
    if (child.visits === 0) return child;
    const exploit = child.valueSum / child.visits;
    const explore = EXPLORATION_CONSTANT * Math.sqrt(Math.log(node.visits) / child.visits);
    const score = (isMaximizing ? exploit : -exploit) + explore;
    if (score > bestScore) { bestScore = score; best = child; }
  }
  return best;
}

/** Expands exactly one untried proposal into a real new child, skipping any that turn out illegal
 * (legality is the engine's own, never re-derived). Returns the new child, or `null` if every
 * remaining untried proposal was illegal (a real, if rare, structural dead end). A child whose own
 * next actor hits a Phase-A `stochasticGap`/`noActor` (design doc §61) becomes an immediate horizon
 * leaf of its own — registered as a real child so it can still be selected/reported, just never
 * expanded further. */
function expandOneChild(node, rootSide, maxDepth, initiativeOrder) {
  while (node.untriedProposals.length > 0) {
    const proposal = node.untriedProposals.pop();
    const sandbox = forkTurnSandbox({ state: node.state, turn: node.actor.turn });
    const result = sandbox.apply(node.actor.actingId, proposal);
    if (!result.legal) continue;
    const nextActor = nextActorAfterAction({ childState: sandbox.state, childTurn: sandbox.turn, actor: node.actor, initiativeOrder });
    let child;
    if (nextActor.stochasticGap || nextActor.noActor) {
      child = { state: sandbox.state, actor: node.actor, depth: node.depth + 1, visits: 0, valueSum: 0, children: new Map(), terminal: false, horizon: true, untriedProposals: [] };
    } else {
      child = makeNode(sandbox.state, nextActor, rootSide, maxDepth, node.depth + 1);
    }
    child.proposal = proposal;
    node.children.set(proposalKey(proposal), child);
    return child;
  }
  return null;
}

/** One real MCTS iteration: SELECT down to an expandable/terminal/horizon node, EXPAND one real
 * child if applicable, read its leaf value ("leaf = evaluateState" — no rollout), BACKPROPAGATE that
 * value (root-relative, no sign flip) up the real path just walked. */
function runIteration(root, rootSide, weights, maxDepth, initiativeOrder) {
  let node = root;
  const path = [node];
  while (!node.terminal && !node.horizon && node.untriedProposals.length === 0 && node.children.size > 0) {
    node = selectChild(node, rootSide);
    path.push(node);
  }

  let leafValue;
  if (node.terminal) {
    leafValue = node.terminalValue;
  } else if (node.horizon) {
    leafValue = evaluateState(node.state, rootSide, weights);
  } else {
    const expanded = expandOneChild(node, rootSide, maxDepth, initiativeOrder);
    if (expanded) {
      path.push(expanded);
      leafValue = expanded.terminal ? expanded.terminalValue : evaluateState(expanded.state, rootSide, weights);
    } else {
      leafValue = evaluateState(node.state, rootSide, weights); // every remaining untried proposal was illegal
    }
  }

  for (const n of path) {
    n.visits += 1;
    n.valueSum += leafValue;
  }
}

/**
 * The real public entry point. `state`/`combatantId`/`turn` mean exactly what they mean for
 * `decide()`/the oracle's own `solve()`. `iterations` bounds real search effort (a real iteration
 * budget, design doc §59/#5's own concept — this file doesn't yet wire `createBudgetTracker` itself,
 * since #11's own "two-mode split" is where wall-clock-vs-iteration budgets get decided for real
 * table play vs. tournament use; a plain iteration count is the right anytime-agnostic unit for THIS
 * step's own tests). `maxDepth` caps expansion depth, matching the oracle's own `depth` parameter so
 * the two search the identical horizon.
 *
 * Returns `{ bestProposal, visits, meanValue, iterations, root }` — `bestProposal` is the ROBUST
 * child (most real visits, issue #6's own stated anytime rule: "return the robust child when the
 * budget expires"), not necessarily the highest-mean-value one (the standard, well-established MCTS
 * choice — visit count is a more stable signal than a possibly-under-sampled mean). `root` is exposed
 * for tests that need to inspect real visit counts/tree shape directly, not just the final pick.
 */
export function search({ state, combatantId, turn, iterations = 500, maxDepth = 4, weights = DEFAULT_WEIGHTS }) {
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
  const root = makeNode(state, actor, rootSide, maxDepth, 0);

  if (root.terminal || root.untriedProposals.length === 0) {
    return { bestProposal: null, visits: 0, meanValue: root.terminal ? root.terminalValue : evaluateState(state, rootSide, weights), iterations: 0, root };
  }

  let realIterations = 0;
  for (let i = 0; i < iterations; i++) {
    runIteration(root, rootSide, weights, maxDepth, initiativeOrder);
    realIterations += 1;
    if (root.untriedProposals.length === 0 && root.children.size === 0) break; // every real root candidate was illegal
  }

  if (root.children.size === 0) {
    return { bestProposal: null, visits: 0, meanValue: evaluateState(state, rootSide, weights), iterations: realIterations, root };
  }
  let best = null;
  for (const child of root.children.values()) {
    if (!best || child.visits > best.visits) best = child;
  }
  return {
    bestProposal: best.proposal,
    visits: best.visits,
    meanValue: best.visits ? best.valueSum / best.visits : 0,
    iterations: realIterations,
    root
  };
}
