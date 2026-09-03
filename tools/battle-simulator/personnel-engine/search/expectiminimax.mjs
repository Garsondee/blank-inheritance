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
 * SCOPE: was personnel-scale only through design doc §74; now scale-agnostic (design doc §75, GH
 * issue #20) — see `resolveEngine`'s own header comment below for how.
 */
import { generateProposals } from "../decide.mjs";
import { forkTurnSandbox, checkOutcome } from "../engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../evaluate/state-value.mjs";
import { outcomeValue, nextActorAfterAction } from "./tree-shared.mjs";
import { isStochasticProposal, expandChanceNode } from "./chance.mjs";

/** Builds the real engine-function bundle `solve()`/`evaluateProposal()` both search against — same
 * shape and reasoning as `mcts-puct.mjs`'s own `resolveEngine` (design doc §74), minus `adapterId`/
 * node-stamping (this file has no persistent tree or subtree-reuse concept at all — every call is a
 * fresh, stateless exhaustive search). `adapter` omitted: this file's own real, direct imports,
 * `conditions: undefined` (falls back to `tree-shared.mjs`'s own real personnel default). Supplied:
 * sourced from the adapter instead, throwing a clear error if it lacks real tree-search capability. */
function resolveEngine(adapter) {
  if (adapter && (!adapter.isDead || !adapter.isUnconscious || !adapter.resolveEffectiveStats)) {
    throw new Error(`expectiminimax.mjs: adapter "${adapter.id ?? "unknown"}" is missing real tree-search capability — needs isDead/isUnconscious/resolveEffectiveStats, optional EngineAdapter fields not every adapter provides (design doc §75).`);
  }
  return adapter
    ? {
        generateProposals: adapter.generateProposals, forkTurnSandbox: adapter.forkTurnSandbox,
        checkOutcome: adapter.checkOutcome, evaluateState: adapter.evaluateState,
        conditions: { isDead: adapter.isDead, isUnconscious: adapter.isUnconscious, resolveEffectiveStats: adapter.resolveEffectiveStats }
      }
    : { generateProposals, forkTurnSandbox, checkOutcome, evaluateState, conditions: undefined };
}

/** The real, recursively-searched value of one already-resolved branch state (deterministic child
 * OR one real chance-node branch) — advances to the next real actor, or falls back to a direct
 * `evaluateState` leaf on a Phase-A gap (`stochasticGap`/`noActor`), exactly like the deterministic
 * path already does. Shared by both the plain and chance-node loops below so "what happens after one
 * real resolved outcome" is written once.
 *
 * `engine` is REQUIRED here, deliberately with no default (design doc §75, a real finding from
 * adversarial review): this is an internal function, never called except from an already-resolved
 * public entry point below. Giving it a convenience default would mean a single missed thread-through
 * at this function's own recursive call into `searchNode` would silently and correctly resolve to
 * personnel's own functions for every existing test (since that default happens to be right for
 * them), while a real Frame-adapter search would silently recurse using the WRONG engine's functions
 * against Frame-shaped state two or more plies deep — wrong values, no crash, no signal. With no
 * default, a missed thread-through throws immediately, in any test, turning a silent-wrong-answer bug
 * class into an unmissable one. */
function valueOfBranch({ branchState, branchTurn, actor, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored, engine }) {
  const nextActor = nextActorAfterAction({ childState: branchState, childTurn: branchTurn, actor, initiativeOrder, conditions: engine.conditions });
  if (nextActor.stochasticGap || nextActor.noActor) {
    addNodesExplored(1);
    return engine.evaluateState(branchState, rootSide, weights);
  }
  const child = searchNode({ state: branchState, actor: nextActor, weights, rootSide, depthRemaining: depthRemaining - 1, initiativeOrder, engine });
  addNodesExplored(child.nodesExplored);
  return child.value;
}

/** The real logic behind the exported `evaluateProposal` below, taking an ALREADY-RESOLVED `engine`
 * (required, no default — same reasoning as `valueOfBranch` above) so `searchNode`'s own per-candidate
 * loop never pays for a repeated `resolveEngine` call across a potentially large exhaustive search
 * tree. `expandChanceNode`'s own new `engine` parameter is satisfied directly by this file's own
 * (richer) `engine` object — it only ever reads `.forkTurnSandbox` off it, so the extra fields this
 * file's own `engine` carries are simply unused there, not a shape mismatch. */
function evaluateProposalWithEngine({ state, actor, proposal, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored, engine }) {
  if (isStochasticProposal(proposal)) {
    const branches = expandChanceNode({ state, turn: actor.turn, combatantId: actor.actingId, proposal, engine });
    if (branches.length === 1 && !branches[0].legal) return null;
    addNodesExplored(branches.length);
    let weightedValue = 0;
    let anyLegalBranch = false;
    for (const branch of branches) {
      if (!branch.legal) continue;
      anyLegalBranch = true;
      const branchValue = valueOfBranch({ branchState: branch.state, branchTurn: branch.turn, actor, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored, engine });
      weightedValue += branch.probability * branchValue;
    }
    return anyLegalBranch ? { value: weightedValue } : null;
  }

  const sandbox = engine.forkTurnSandbox({ state, turn: actor.turn });
  const result = sandbox.apply(actor.actingId, proposal);
  if (!result.legal) return null;
  const value = valueOfBranch({ branchState: sandbox.state, branchTurn: sandbox.turn, actor, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored, engine });
  return { value };
}

/**
 * The real, exact value of committing to ONE SPECIFIC `proposal` at `actor`'s node, then searching
 * `depthRemaining - 1` plies deeper — dispatches the same real stochastic-vs-deterministic handling
 * `searchNode`'s own loop uses per-candidate, exposed here so a caller outside this file (design doc
 * §66's own root trap-insurance check) can ask "what does the oracle really think of THIS ONE move"
 * without re-deriving decision-node iteration logic. Returns `null` if `proposal` turns out illegal —
 * the same real legality check every other path here already trusts, never re-derived.
 *
 * `adapter` (optional, design doc §75): a real `EngineAdapter` to search against instead of this
 * file's own personnel-engine imports — resolves `engine` once via `resolveEngine`, then delegates to
 * the internal `evaluateProposalWithEngine` (which `searchNode` also calls directly, with its own
 * already-resolved `engine`, to avoid resolving it twice per node). No `weights` default here — none
 * existed before this port either, and no caller relies on one (confirmed directly).
 */
export function evaluateProposal({ state, actor, proposal, weights, rootSide, depthRemaining, initiativeOrder, adapter = null }) {
  const engine = resolveEngine(adapter);
  let nodesExplored = 0;
  const addNodesExplored = (n) => { nodesExplored += n; };
  const evaluated = evaluateProposalWithEngine({ state, actor, proposal, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored, engine });
  return evaluated ? { value: evaluated.value, nodesExplored } : null;
}

/**
 * The real recursive search. `actor = { actingId, initiativeIndex, round, turn }` is the combatant
 * whose real decision this node explores. Returns `{ value, bestProposal, nodesExplored }` — `value`
 * is always in `rootSide`'s own terms (never flipped at the leaf; only the max/min choice at each
 * node flips as ownership changes between `rootSide` and the opponent — the real negamax reduction
 * design doc §61/#6 specifies for two teams with per-team shared, side-relative, symmetric utility).
 *
 * `engine` is REQUIRED, no default — see `valueOfBranch`'s own header comment for why.
 */
function searchNode({ state, actor, weights, rootSide, depthRemaining, initiativeOrder, engine }) {
  const outcome = engine.checkOutcome(state);
  if (outcome) return { value: outcomeValue(outcome, rootSide), bestProposal: null, nodesExplored: 1 };
  if (depthRemaining <= 0) return { value: engine.evaluateState(state, rootSide, weights), bestProposal: null, nodesExplored: 1 };

  const me = state.combatants.get(actor.actingId);
  const isMaximizing = me.side === rootSide;
  const proposals = engine.generateProposals(state, actor.actingId, actor.turn);

  let nodesExplored = 1;
  let best = null;
  const consider = (value, proposal) => {
    if (!best || (isMaximizing ? value > best.value : value < best.value)) best = { value, bestProposal: proposal };
  };

  for (const proposal of proposals) {
    let evaluatedNodes = 0;
    const evaluated = evaluateProposalWithEngine({ state, actor, proposal, weights, rootSide, depthRemaining, initiativeOrder, addNodesExplored: (n) => { evaluatedNodes += n; }, engine });
    if (!evaluated) continue; // illegal
    nodesExplored += evaluatedNodes;
    consider(evaluated.value, proposal);
  }

  if (!best) return { value: engine.evaluateState(state, rootSide, weights), bestProposal: null, nodesExplored };
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
 *
 * `adapter` (optional, design doc §75): a real `EngineAdapter` to search against instead of this
 * file's own personnel-engine imports. `weights`'s own default reads `adapter.DEFAULT_WEIGHTS` when
 * an adapter is supplied, matching every other file in this search family — confirmed extensively
 * relied upon by existing tests that call `solve()` with `weights` omitted.
 */
export function solve({ state, combatantId, turn, depth = 2, adapter = null, weights = adapter?.DEFAULT_WEIGHTS ?? DEFAULT_WEIGHTS }) {
  const engine = resolveEngine(adapter);
  const me = state.combatants.get(combatantId);
  if (!me) return { value: 0, bestProposal: null, nodesExplored: 0 };
  const actor = {
    actingId: combatantId,
    initiativeIndex: state.initiativeOrder ? state.initiativeOrder.indexOf(combatantId) : 0,
    round: state.round ?? 1,
    turn
  };
  const initiativeOrder = state.initiativeOrder ?? [combatantId];
  return searchNode({ state, actor, weights, rootSide: me.side, depthRemaining: depth, initiativeOrder, engine });
}
