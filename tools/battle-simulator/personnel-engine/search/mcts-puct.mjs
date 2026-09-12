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
 *
 * SUBTREE REUSE (design doc §69, GH issue #6 step 7, part 2 of 3 — `search/subtree-reuse.mjs` owns
 * the pure, VERIFIED matching logic; `continueSearch` below is this file's own resume-from-a-reused-
 * node entry point). Three small, additive changes make this sound, each provably inert for every
 * EXISTING (non-reuse) caller: (1) `makeNode` stamps `builtWeights`/`builtTau` onto every node so a
 * later `continueSearch` can refuse to mix two different evaluation scales into one running average;
 * (2) a `horizon`-frozen node reached under a LARGER effective ceiling than originally built it
 * (only possible via `continueSearch`'s own depth-offset — a fresh search's `maxDepth` never changes
 * within one call, so a node can never be horizon under a SMALLER ceiling than the one deciding
 * whether to reopen it) gets reopened in place instead of staying stuck forever at a stale depth —
 * without this, the highest-value lines (exactly where MCTS concentrates visits, and so exactly
 * where a horizon gets hit first) would silently lose lookahead depth every time they're reused; (3)
 * `search()`'s own tail is extracted into a shared, module-private `runSearchToCompletion`, with its
 * early-return guard rewritten from `root.terminal || root.candidates.length===0` to just
 * `root.candidates.length===0` — the two conditions have always co-occurred for a FRESH root
 * (`makeNode`'s terminal branch always sets `candidates:[]`), but MCTS-Solver's `markProven` sets
 * `terminal=true` WITHOUT touching `candidates` (already true and already shipped, §67), so a REUSED
 * root that the ORIGINAL search already proved would otherwise be silently discarded by the old
 * guard — precisely the case reuse most needs to handle well.
 *
 * SCALE-AGNOSTIC (design doc §74, GH issue #20 — the second search file ported off personnel-only
 * imports, after `mcts.mjs`'s own first slice, §73). `search()`/`continueSearch()` both take an
 * optional `adapter` naming a real `EngineAdapter` to search against instead of this file's own
 * direct personnel-engine imports. Unlike `mcts.mjs` (one public entry point), this file has TWO —
 * `resolveEngine(adapter)` below is a shared helper so both build the identical `engine` object and
 * run the identical adapter-capability-check throw, rather than duplicating that logic twice. Omitted
 * (every existing caller today): every internal call uses this file's own real, direct imports exactly
 * as before, verified byte-for-byte unchanged. `mcts-puct.mjs`/everything composed on it that ALSO
 * needs chance-node expansion (`trap-insurance.mjs`, `mcts-v1`'s own `mcts-puct-insured-v1` sibling) is
 * explicitly NOT covered by this — `chance.mjs` calls `forkTurnSandbox({..., outcomes: ...})`, a third
 * parameter Frame's own `forkTurnSandbox({state, turn})` doesn't have at all; that whole branch is a
 * separate, larger, still-blocked problem.
 */
import { isDeepStrictEqual } from "node:util";
import { generateProposals, occupancyFingerprint } from "../decide.mjs";
import { forkTurnSandbox, checkOutcome } from "../engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../evaluate/state-value.mjs";
import { outcomeValue, nextActorAfterAction, WIN_VALUE, LOSS_VALUE, createBudgetTracker, scopedDestCache } from "./tree-shared.mjs";

const DEFAULT_C_PUCT = 1.5; // real, reasonable, UNTUNED — issue #12 owns tuning this
const DEFAULT_TAU = 10; // softmax temperature over real evaluateState gains — also untuned
const DEFAULT_WIDENING_K = 2;
const DEFAULT_WIDENING_ALPHA = 0.5;

/** Builds the real engine-function bundle `search()`/`continueSearch()` both search against — see the
 * header's own SCALE-AGNOSTIC paragraph. `adapter` omitted: this file's own real, direct imports,
 * `conditions: undefined` (so `tree-shared.mjs`'s own `nextActorAfterAction` falls back to its own
 * real personnel default), `adapterId: "personnel"`. Supplied: sourced from the adapter instead —
 * throws a clear, specific error if it lacks real tree-search capability (`isDead`/`isUnconscious`/
 * `resolveEffectiveStats` — optional `EngineAdapter` fields, not every adapter provides them), exactly
 * mirroring `mcts.mjs`'s own established check. `adapterId` is always a real string either way — used
 * by `nodeBuildMeta` below to stamp every node with which engine built it (design doc §74's own
 * `builtAdapterId`, `continueSearch`'s new cross-scale-mismatch guard). */
function resolveEngine(adapter) {
  if (adapter && (!adapter.isDead || !adapter.isUnconscious || !adapter.resolveEffectiveStats)) {
    throw new Error(`mcts-puct.mjs: adapter "${adapter.id ?? "unknown"}" is missing real tree-search capability — needs isDead/isUnconscious/resolveEffectiveStats, optional EngineAdapter fields not every adapter provides (design doc §74).`);
  }
  return adapter
    ? {
        generateProposals: adapter.generateProposals, forkTurnSandbox: adapter.forkTurnSandbox,
        checkOutcome: adapter.checkOutcome, evaluateState: adapter.evaluateState,
        conditions: { isDead: adapter.isDead, isUnconscious: adapter.isUnconscious, resolveEffectiveStats: adapter.resolveEffectiveStats },
        adapterId: adapter.id,
        // OPTIONAL (GH #62) — see tree-shared.mjs's own scopedDestCache header. Absence degrades
        // gracefully to today's exact behavior; never gated by the throw above, unlike isDead/etc.
        occupancyFingerprint: adapter.occupancyFingerprint
      }
    : { generateProposals, forkTurnSandbox, checkOutcome, evaluateState, conditions: undefined, adapterId: "personnel", occupancyFingerprint };
}

/** The `builtWeights`/`builtTau`/`builtAdapterId` triple every real node in this tree carries (design
 * doc §69's own stamping, extended by §74) — factored here because there are TWO real places a node
 * gets built (`makeNode`'s own two return branches, and `runIteration`'s own inline forced-node
 * object for the `stochasticGap`/`noActor` case) and `builtAdapterId` genuinely needs to land at BOTH,
 * not just `makeNode` — a node reached via the forced-node path that skipped this stamp would carry
 * `builtAdapterId: undefined`, and `continueSearch`'s own new mismatch guard would then throw a
 * false-positive caller-error on a completely legitimate, adapter-less, personnel-only continuation
 * (found by adversarial review before this shipped — `stochasticGap` is a mainline personnel-scale
 * occurrence, not an edge case, since dying rules are central to this engine). */
function nodeBuildMeta(weights, tau, engine) {
  return { builtWeights: weights, builtTau: tau, builtAdapterId: engine.adapterId };
}

/**
 * Real one-ply candidates for `actor`, each pre-scored with its own real `evaluateState` gain (via
 * the SAME deterministic `forkTurnSandbox` path `decide()`'s own fallback and `mcts.mjs`'s own leaf
 * evaluation already use — chance-node branching is deliberately NOT consulted for the prior, matching
 * issue #6's own "the one-ply gain decide() already computes"), then converted to a real softmax
 * prior and sorted highest-prior-first (the order progressive widening's own top-`m` rule needs).
 * Each candidate carries its own already-forked `sandboxState`/`sandboxTurn` so a later expansion
 * never re-forks the same proposal twice.
 */
function computeCandidates(state, actor, weights, tau, engine, searchDestCache) {
  const me = state.combatants.get(actor.actingId);
  const before = engine.evaluateState(state, me.side, weights, actor.actingId);
  const proposals = engine.generateProposals(state, actor.actingId, actor.turn, scopedDestCache(searchDestCache, engine, state, actor.actingId));

  const scored = [];
  for (const proposal of proposals) {
    const sandbox = engine.forkTurnSandbox({ state, turn: actor.turn });
    const result = sandbox.apply(actor.actingId, proposal);
    if (!result.legal) continue;
    const gain = engine.evaluateState(sandbox.state, me.side, weights, actor.actingId) - before;
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

function makeNode(state, actor, rootSide, weights, maxDepth, depth, tau, engine, searchDestCache) {
  const outcome = engine.checkOutcome(state);
  if (outcome) {
    const terminalValue = outcomeValue(outcome, rootSide);
    return { state, actor, depth, terminal: true, terminalValue, proven: terminalValue === WIN_VALUE ? "win" : "loss", candidates: [], ...nodeBuildMeta(weights, tau, engine) };
  }
  const horizon = depth >= maxDepth;
  return { state, actor, depth, terminal: false, horizon, proven: null, candidates: horizon ? [] : computeCandidates(state, actor, weights, tau, engine, searchDestCache), ...nodeBuildMeta(weights, tau, engine) };
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

function runIteration(root, rootSide, weights, maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha, useSolver, engine, searchDestCache) {
  let node = root;
  const path = []; // { parentNode, candidate } pairs, shallowest first — MCTS-Solver walks this back to front

  while (!node.terminal && !node.horizon && node.candidates.length > 0) {
    const candidate = selectCandidate(node, rootSide, cPuct, wideningK, wideningAlpha, useSolver);
    path.push({ parentNode: node, candidate });
    if (!candidate.child) {
      const nextActor = nextActorAfterAction({ childState: candidate.sandboxState, childTurn: candidate.sandboxTurn, actor: node.actor, initiativeOrder, conditions: engine.conditions });
      candidate.child = (nextActor.stochasticGap || nextActor.noActor)
        ? { state: candidate.sandboxState, actor: node.actor, depth: node.depth + 1, terminal: false, horizon: true, forcedHorizon: true, proven: null, candidates: [], ...nodeBuildMeta(weights, tau, engine) }
        : makeNode(candidate.sandboxState, nextActor, rootSide, weights, maxDepth, node.depth + 1, tau, engine, searchDestCache);
      node = candidate.child;
      break; // "leaf = evaluateState": a freshly-expanded node is this iteration's own leaf, no further descent
    }
    node = candidate.child;
  }

  // Subtree reuse (design doc §69): a node frozen `horizon:true` under an OLDER, SMALLER ceiling
  // than THIS call's own `maxDepth` — only reachable via continueSearch's own depth-offset; for a
  // fresh, non-reused search `maxDepth` never changes within one call, so a node only ever becomes
  // horizon because `depth >= maxDepth` under that SAME constant, making `depth < maxDepth` here
  // impossible — provably inert for every existing caller. Reopened exactly once, treated as THIS
  // iteration's own leaf (the same "freshly-expanded node = leaf, no further descent this
  // iteration" convention already used above), not descended into further until a later iteration.
  //
  // REAL PRE-EXISTING BUG, found and fixed here (design doc §74, GH issue #20) — NOT introduced by
  // this port, dates back to §69 itself, just never exercised by any existing test: the ORIGINAL
  // §69 comment's own claim ("a node only ever becomes horizon because depth>=maxDepth") missed
  // that the FORCED node built just above (`stochasticGap`/`noActor`) is ALSO built with
  // `horizon:true`, unconditionally, regardless of `depth` — so whenever that forced node's own
  // `depth < maxDepth` (the common case, not rare: any unconscious-combatant-in-initiative-order
  // situation reached with real budget left under the depth cap), this check would immediately
  // "reopen" it using `node.actor` — which for THIS shape is the PARENT's own actor, inherited by
  // reference, carrying the PARENT's OWN turn object exactly as it was BEFORE the action that
  // produced this forced node — silently computing real, populated candidates for an actor who has
  // already used up that exact turn, using stale, already-spent action-economy numbers. The new
  // `forcedHorizon` marker (set only on the inline forced-node literal above) distinguishes the two
  // shapes explicitly, so this reopen path is now reserved for what it was actually designed for —
  // a genuine depth-cap horizon reached via `continueSearch`'s own depth-offset.
  if (!node.terminal && node.horizon && !node.forcedHorizon && node.depth < maxDepth) {
    node.horizon = false;
    node.candidates = computeCandidates(node.state, node.actor, weights, tau, engine, searchDestCache);
  }

  const leafValue = node.terminal ? node.terminalValue : engine.evaluateState(node.state, rootSide, weights);
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
 *
 * `adapter` (optional, design doc §74): a real `EngineAdapter` to search against instead of this
 * file's own personnel-engine imports — see `resolveEngine`'s own header comment. `weights`'s own
 * default reads `adapter.DEFAULT_WEIGHTS` when an adapter is supplied, exactly matching `mcts.mjs`'s
 * own established fix — a caller who passes `adapter: FRAME_ADAPTER` but omits `weights` must NOT
 * silently fall back to personnel's own static weight terms, which Frame's real evaluator doesn't
 * share.
 */
export function search({
  state, combatantId, turn, iterations = 500, maxDepth = 4, adapter = null, weights = adapter?.DEFAULT_WEIGHTS ?? DEFAULT_WEIGHTS,
  cPuct = DEFAULT_C_PUCT, tau = DEFAULT_TAU, wideningK = DEFAULT_WIDENING_K, wideningAlpha = DEFAULT_WIDENING_ALPHA,
  useSolver = false, budget = null
}) {
  const engine = resolveEngine(adapter);
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
  // GH #62 — ONE shared cache for this ENTIRE search() call, bucketed by occupancy fingerprint
  // (scopedDestCache, tree-shared.mjs) so sibling/cousin tree nodes with matching occupancy reuse
  // real pathfinding-flood results, never a different branch's. Freshly instantiated per call —
  // never persists into a different search() or continueSearch() invocation.
  const searchDestCache = new Map();
  const root = makeNode(state, actor, rootSide, weights, maxDepth, 0, tau, engine, searchDestCache);
  return runSearchToCompletion({ root, rootSide, weights, maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha, useSolver, budget, iterations, engine, searchDestCache });
}

/**
 * The shared tail of both `search()` (fresh root) and `continueSearch()` (a verified-reused root) —
 * the real budget-tracked iteration loop plus final candidate selection, extracted once so both entry
 * points get identical, single-source-of-truth behavior (design doc §69). Pure, behavior-preserving
 * extraction for `search()`'s own existing inputs — hand-verified against every `{terminal,
 * candidates.length}` combination a FRESH root can produce, and re-confirmed by the full existing
 * mcts-puct.mjs/trap-insurance.mjs/mcts-solver.mjs/mcts-puct-budget.mjs suite passing unchanged.
 *
 * The early guard is `root.candidates.length === 0` alone now, NOT the old `root.terminal ||
 * root.candidates.length === 0` — those two conditions have always co-occurred for a fresh root
 * (`makeNode`'s terminal branch always sets `candidates: []`), so this is byte-identical for every
 * existing caller, but a REUSED root can be `terminal` (MCTS-Solver's own `markProven`, §67) while
 * still carrying its full real candidate list — exactly the case reuse needs to handle correctly
 * (skip the now-pointless iteration loop entirely, since the proof already stands, but still run the
 * real "pick best" selection below using the root's own already-accumulated statistics, rather than
 * discarding a subtree that already contains the certified-correct answer).
 */
function runSearchToCompletion({ root, rootSide, weights, maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha, useSolver, budget, iterations, engine, searchDestCache }) {
  // Same `forcedHorizon` guard as runIteration's own reopen-check, and the same real bug it fixes
  // (design doc §74) — a REUSED root (via `continueSearch`) can itself be a forced node (`hop.node`
  // from `findReusableNode`/`advanceRoot` is whatever `candidate.child` actually was, forced shape
  // included), so this root-level reopen needed the identical fix, not just runIteration's own.
  if (!root.terminal && root.horizon && !root.forcedHorizon && root.depth < maxDepth) {
    root.horizon = false;
    root.candidates = computeCandidates(root.state, root.actor, weights, tau, engine, searchDestCache);
  }

  if (root.candidates.length === 0) {
    return { bestProposal: null, visits: 0, meanValue: root.terminal ? root.terminalValue : engine.evaluateState(root.state, rootSide, weights), iterations: 0, elapsedMs: 0, root };
  }

  const tracker = createBudgetTracker({ maxIterations: Math.min(iterations, budget?.maxIterations ?? Infinity), maxMs: budget?.maxMs ?? Infinity });
  if (!root.terminal) { // an already-proven root (reused, MCTS-Solver) has nothing left to learn — skip straight to selection
    while (!tracker.exhausted()) {
      runIteration(root, rootSide, weights, maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha, useSolver, engine, searchDestCache);
      tracker.tick();
      if (useSolver && root.terminal) break; // proven — no further iteration can change the real answer
    }
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

/**
 * Resume a VERIFIED-reusable node (`subtree-reuse.mjs`'s own `findReusableNode`/`advanceRoot` —
 * `reused` is exactly one of their return values) as the new root, instead of building fresh. No
 * `state`/`turn` params: everything needed is already self-contained on `reused.node` (its own
 * `.state`, `.actor.turn`) — that's the whole point of having already verified it. `maxDepth` here
 * means the SAME thing it means to `search()` — "how many more plies from here" — via the depth-
 * offset trick (`root.depth + maxDepth` passed to the shared tail, not the raw `maxDepth`): the
 * reused node's own `depth` already records how many real hops it took to reach this point, so
 * offsetting by it is what makes "how much MORE depth from here" consistent with what a completely
 * fresh search starting at this exact point would give, rather than silently eroding lookahead every
 * time reuse happens.
 *
 * `adapter` (optional, design doc §74): same real `EngineAdapter`/`weights`-default meaning as
 * `search()`'s own, above — see `resolveEngine`. Resuming a subtree built against one engine with a
 * DIFFERENT one would silently apply the wrong scale's `generateProposals`/`forkTurnSandbox`/
 * `evaluateState` to an already-built tree — the same class of silent corruption the existing
 * weights/tau check below already guards against — so this is checked too (third throw, below).
 *
 * Three throws, all real caller-error guards (matching this file's own established pattern — the
 * adapter-mismatch throws elsewhere in this search family), never a legitimate-divergence path
 * (those already fail closed, silently, inside `findReusableNode`/`advanceRoot` themselves — nothing
 * about a real, ordinary "the dice didn't match" case ever reaches here):
 * - `reused.node` missing: call `advanceRoot`/`findReusableNode` first, and only call this when one
 *   of them actually found something real to reuse.
 * - `weights`/`tau` mismatch against `reused.node.builtWeights`/`builtTau`: silently continuing with
 *   different values would mix two different evaluation scales into the SAME running `valueSum`
 *   average and make old/new `prior`s inconsistent at the same node — real, silent statistic
 *   corruption, not just an exploration-balance nuance. `cPuct`/`wideningK`/`wideningAlpha` are
 *   deliberately NOT checked — they only shape future SELECTION, never stored data, so a mismatch
 *   there is the same kind of caller-trusted, untuned knob every other part of this file already is.
 * - `adapter` mismatch against `reused.node.builtAdapterId`: see above.
 */
export function continueSearch({
  reused, combatantId, iterations = 500, maxDepth = 4, adapter = null, weights = adapter?.DEFAULT_WEIGHTS ?? DEFAULT_WEIGHTS,
  cPuct = DEFAULT_C_PUCT, tau = DEFAULT_TAU, wideningK = DEFAULT_WIDENING_K, wideningAlpha = DEFAULT_WIDENING_ALPHA,
  useSolver = false, budget = null
}) {
  if (!reused?.node) {
    throw new Error("continueSearch: reused.node is required — call advanceRoot/findReusableNode first and only continue when it found something real to reuse.");
  }
  const root = reused.node;
  if (root.actor.actingId !== combatantId) {
    throw new Error(`continueSearch: reused node belongs to "${root.actor.actingId}", not the requested "${combatantId}" — a caller mismatch, not a legitimate divergence.`);
  }
  if (!isDeepStrictEqual(root.builtWeights, weights) || root.builtTau !== tau) {
    throw new Error("continueSearch: weights/tau must match what the reused subtree was originally built with — mixing them would silently corrupt its accumulated statistics.");
  }
  const engine = resolveEngine(adapter);
  if (root.builtAdapterId !== engine.adapterId) {
    throw new Error(`continueSearch: the reused subtree was built against adapter "${root.builtAdapterId}", not "${engine.adapterId}" — resuming it with a different engine would silently apply the wrong scale's rules to an already-built tree.`);
  }
  const rootSide = root.state.combatants.get(combatantId).side;
  const initiativeOrder = root.state.initiativeOrder ?? [combatantId];
  // GH #62 — a FRESH cache for this resumed call, never the original search's now-stale one: a
  // real action has happened since that tree was built, so occupancy has genuinely moved on.
  const searchDestCache = new Map();
  return runSearchToCompletion({ root, rootSide, weights, maxDepth: root.depth + maxDepth, initiativeOrder, cPuct, tau, wideningK, wideningAlpha, useSolver, budget, iterations, engine, searchDestCache });
}
