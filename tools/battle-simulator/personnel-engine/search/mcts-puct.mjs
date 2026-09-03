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
 *
 * MCTS-SOLVER (design doc §67, GH issue #6 step 6's other half — Winands, Bjornsson & Saito 2008):
 * OPT-IN via `useSolver` (default `false` — every existing caller, including the real `mcts-puct-v1`
 * policy and every one of this file's own already-shipped tests, is completely unaffected; a real,
 * verified zero-behavior-change default, matching every other widening this whole stage has done). A
 * node reduced to a real, PROVEN win or loss — either a genuine `checkOutcome` terminal, or PROVEN by
 * propagation (every real candidate at a node has been tried and every one of them proves the same
 * fate, or even ONE candidate already proves the good fate) — stops being explored further: it's
 * treated exactly like a real terminal node (reusing the same `node.terminal` short-circuit), so the
 * tree never wastes a real iteration re-confirming a line that is already certain. Selection also
 * deprioritizes a candidate PROVEN bad for the node's own mover, so budget goes to genuinely
 * undecided lines instead. "Cheap and decisive near the end of a fight," per the issue's own words —
 * this is a real efficiency mechanism, not a correctness change: a solved node's real value is exact
 * either way, `useSolver` just stops paying for redundant confirmation of it.
 *
 * BUDGET AWARENESS (design doc §68, GH issue #6 step 7, the "budgets" third of it — #5/#11): an
 * OPTIONAL `budget: {maxIterations, maxMs}` param, the exact same shape as `ai-common`'s own
 * documented `options.budget` policy contract, composes with (never replaces) the existing plain
 * `iterations` cap — omitted entirely (every existing caller), behavior is byte-for-byte unchanged.
 * Gives real wall-clock cutoff for live table play, on top of the iteration-exact cap tests/tournaments
 * already rely on for reproducibility.
 */
import { generateProposals } from "../decide.mjs";
import { forkTurnSandbox, checkOutcome } from "../engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../evaluate/state-value.mjs";
import { outcomeValue, nextActorAfterAction, WIN_VALUE, LOSS_VALUE, createBudgetTracker } from "./tree-shared.mjs";

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
  if (outcome) {
    const terminalValue = outcomeValue(outcome, rootSide);
    return { state, actor, depth, terminal: true, terminalValue, proven: terminalValue === WIN_VALUE ? "win" : "loss", candidates: [] };
  }
  const horizon = depth >= maxDepth;
  return { state, actor, depth, terminal: false, horizon, proven: null, candidates: horizon ? [] : computeCandidates(state, actor, weights, tau) };
}

/** MCTS-Solver (design doc §67): `node` becomes PROVEN either directly (it's a real `checkOutcome`
 * terminal, handled in `makeNode` above) or here, by propagation from a deeper proven descendant, once
 * `runIteration`'s own backprop has finished walking `path` bottom-up. Mirrors real minimax proof
 * propagation: ONE candidate proven good for the node's own mover proves the node immediately (that
 * mover would simply take the winning line); the node is proven bad only once EVERY real candidate has
 * been tried at least once and every single one of them is proven bad (no untried candidate could still
 * rescue it). A proven node is marked exactly like a real terminal (`terminal = true`, real WIN/LOSS
 * `terminalValue`) so it reuses the SAME short-circuit `runIteration`'s own selection loop already has
 * for real terminals — no separate check needed there. */
function markProven(node, value) {
  node.proven = value;
  node.terminal = true;
  node.terminalValue = value === "win" ? WIN_VALUE : LOSS_VALUE;
}

function propagateProven(path, rootSide) {
  for (let i = path.length - 1; i >= 0; i--) {
    const { parentNode, candidate } = path[i];
    const childProven = candidate.child.proven;
    if (!childProven) return; // this line isn't proven yet, so nothing propagates further up either

    const isMaximizing = parentNode.state.combatants.get(parentNode.actor.actingId).side === rootSide;
    const goodValue = isMaximizing ? "win" : "loss";
    if (childProven === goodValue) {
      markProven(parentNode, goodValue);
      continue;
    }
    const badValue = isMaximizing ? "loss" : "win";
    if (!parentNode.candidates.every((c) => c.child && c.child.proven === badValue)) return;
    markProven(parentNode, badValue);
  }
}

/** PUCT selection among the real, progressive-widening-eligible candidates of `node` (already sorted
 * prior-descending) — maximizes for `rootSide`'s own team, mirrors for the opponent, the same
 * two-team negamax reduction every search in this directory already uses. With `useSolver`, a
 * candidate already PROVEN bad for this node's own mover is excluded before widening is even applied —
 * it can never provide new information again, so re-selecting it would be pure waste; widening then
 * opens up over the real REMAINING candidates, not the original full count, so a node is never stuck
 * with nothing eligible just because its currently-widened window happens to be all proven-bad. */
function selectCandidate(node, rootSide, cPuct, wideningK, wideningAlpha, useSolver) {
  const isMaximizing = node.state.combatants.get(node.actor.actingId).side === rootSide;
  const totalVisits = node.candidates.reduce((sum, c) => sum + c.visits, 0);
  const eligible = useSolver
    ? node.candidates.filter((c) => !(c.child && c.child.proven === (isMaximizing ? "loss" : "win")))
    : node.candidates;
  const allowedCount = Math.max(1, Math.min(eligible.length, Math.ceil(wideningK * Math.pow(totalVisits + 1, wideningAlpha))));

  let best = null, bestScore = -Infinity;
  for (let i = 0; i < allowedCount; i++) {
    const c = eligible[i];
    const q = c.visits ? c.valueSum / c.visits : 0;
    const u = cPuct * c.prior * Math.sqrt(totalVisits) / (1 + c.visits);
    const score = (isMaximizing ? q : -q) + u;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

function runIteration(root, rootSide, weights, maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha, useSolver) {
  let node = root;
  const path = []; // { parentNode, candidate } pairs, shallowest first — MCTS-Solver walks this back to front

  while (!node.terminal && !node.horizon && node.candidates.length > 0) {
    const candidate = selectCandidate(node, rootSide, cPuct, wideningK, wideningAlpha, useSolver);
    path.push({ parentNode: node, candidate });
    if (!candidate.child) {
      const nextActor = nextActorAfterAction({ childState: candidate.sandboxState, childTurn: candidate.sandboxTurn, actor: node.actor, initiativeOrder });
      candidate.child = (nextActor.stochasticGap || nextActor.noActor)
        ? { state: candidate.sandboxState, actor: node.actor, depth: node.depth + 1, terminal: false, horizon: true, proven: null, candidates: [] }
        : makeNode(candidate.sandboxState, nextActor, rootSide, weights, maxDepth, node.depth + 1, tau);
      node = candidate.child;
      break; // "leaf = evaluateState": a freshly-expanded node is this iteration's own leaf, no further descent
    }
    node = candidate.child;
  }

  const leafValue = node.terminal ? node.terminalValue : evaluateState(node.state, rootSide, weights);
  for (const { candidate } of path) {
    candidate.visits += 1;
    candidate.valueSum += leafValue;
  }

  if (useSolver) propagateProven(path, rootSide);
}

/**
 * The real public entry point — same shape as `mcts.mjs`'s own `search()`. Returns
 * `{ bestProposal, visits, meanValue, iterations, root }`; `bestProposal` is the ROBUST candidate
 * (most real visits, issue #6's own stated anytime rule), not the raw highest-prior or highest-mean
 * one. `cPuct`/`tau`/`wideningK`/`wideningAlpha` are real, overridable, but default to the
 * deliberately-untuned values documented above.
 *
 * `useSolver` (default `false`, MCTS-Solver, design doc §67) opts into proven win/loss propagation:
 * once the root itself is proven, further iterations can't change the real answer, so the loop stops
 * early — "cheap and decisive near the end of a fight," issue #6's own words for this mechanism. Final
 * selection is solver-aware too: the root's own actor is always on `rootSide` (the root is always a
 * maximizing node — the whole reason the "most-visited candidate" heuristic works everywhere else in
 * this file), so if the root is proven a real WIN, `bestProposal` is chosen from among the candidates
 * that are THEMSELVES proven WIN (most-visited among those, real ties broken the same way as always) —
 * a certified-winning line beats a merely well-explored one. Any other outcome (not proven, or proven
 * a real LOSS — every line equally lost) falls back to the existing plain most-visited rule untouched.
 *
 * `budget` (design doc §68, GH issues #5/#11/#6 step 7) is the same real `{maxIterations, maxMs}`
 * shape as `ai-common/engine-adapter.mjs`'s own documented `options.budget` policy contract — an
 * iteration-exact cap for reproducible tests/tournaments, or a real wall-clock cap for live table
 * play, or both at once (tightest of the two wins). It COMPOSES with `iterations` rather than
 * replacing it — `iterations` always still applies as an outer ceiling, so omitting `budget` (every
 * existing caller) reproduces the exact previous behavior byte-for-byte, verified. `elapsedMs` is
 * always reported on the result so a caller (`battle-history.md` entries included, #11's own ask) can
 * record what a search actually cost, not just how it was configured.
 */
export function search({
  state, combatantId, turn, iterations = 500, maxDepth = 4, weights = DEFAULT_WEIGHTS,
  cPuct = DEFAULT_C_PUCT, tau = DEFAULT_TAU, wideningK = DEFAULT_WIDENING_K, wideningAlpha = DEFAULT_WIDENING_ALPHA,
  useSolver = false, budget = null
}) {
  const me = state.combatants.get(combatantId);
  if (!me) return { bestProposal: null, visits: 0, meanValue: 0, iterations: 0, elapsedMs: 0, root: null };
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
    return { bestProposal: null, visits: 0, meanValue: root.terminal ? root.terminalValue : evaluateState(state, rootSide, weights), iterations: 0, elapsedMs: 0, root };
  }

  const tracker = createBudgetTracker({ maxIterations: Math.min(iterations, budget?.maxIterations ?? Infinity), maxMs: budget?.maxMs ?? Infinity });
  while (!tracker.exhausted()) {
    runIteration(root, rootSide, weights, maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha, useSolver);
    tracker.tick();
    if (useSolver && root.terminal) break; // proven — no further iteration can change the real answer
  }

  const pool = (useSolver && root.proven === "win")
    ? root.candidates.filter((c) => c.child && c.child.proven === "win")
    : root.candidates;
  let best = null;
  for (const c of pool) {
    if (!best || c.visits > best.visits) best = c;
  }
  return {
    bestProposal: best.proposal,
    visits: best.visits,
    meanValue: best.visits ? best.valueSum / best.visits : 0,
    iterations: tracker.iterations,
    elapsedMs: tracker.elapsedMs,
    root
  };
}
