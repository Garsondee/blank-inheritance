/**
 * `mcts-puct-solver-v1` (design doc §67, GH issue #6, the other half of step 6 — MCTS-Solver, Winands,
 * Bjornsson & Saito 2008) — registers PUCT + progressive widening WITH proven win/loss propagation
 * opted in (`personnel-engine/search/mcts-puct.mjs`'s own `useSolver: true`) through the policy
 * interface. `mcts-puct-v1` (this file's own sibling) is completely untouched by this policy's
 * existence — `useSolver` defaults to `false` there, matching every other step this stage has taken:
 * a genuinely new, separately-tested variant gets its own registered policy id, never a silent change
 * to what an already-tested one does.
 *
 * DELIBERATELY NOT "mcts-v1": chance-node consumption inside the tree itself and subtree reuse across
 * real decisions both still need to land first (issue #6's own remaining steps) before the complete
 * system exists.
 *
 * DUAL-SCALE (design doc §74, GH issue #20): `mcts-puct.mjs`'s own `search()` now accepts any real
 * `EngineAdapter` with tree-search capability, including MCTS-Solver's own proven-propagation logic —
 * verified generic, zero personnel-specific code (design doc §74's own review). No more hardcoded
 * personnel-only guard here, matching `mcts-uct-v1`'s own precedent (§73).
 */
import { registerPolicy } from "../engine-adapter.mjs";
import { search } from "../../personnel-engine/search/mcts-puct.mjs";

registerPolicy({
  id: "mcts-puct-solver-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    const {
      iterations = 500, maxDepth = 4, cPuct, tau, wideningK, wideningAlpha, budget
    } = options;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const result = search({ state, combatantId, turn, iterations, maxDepth, weights, cPuct, tau, wideningK, wideningAlpha, useSolver: true, budget, adapter });
    if (!result.bestProposal) return null;
    return {
      ...result.bestProposal,
      score: result.meanValue,
      reason: `mcts-puct-solver-v1: ${result.visits} visits, mean value ${result.meanValue.toFixed(3)} (${result.iterations} iterations, ${result.elapsedMs}ms, maxDepth ${maxDepth}, proven=${result.root?.proven ?? "no"})`
    };
  }
});
