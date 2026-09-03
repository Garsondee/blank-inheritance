/**
 * `mcts-puct-v1` (design doc §65, GH issue #6, step 5 of its own build order) — registers PUCT +
 * progressive widening (`personnel-engine/search/mcts-puct.mjs`) through the policy interface.
 *
 * DELIBERATELY NOT "mcts-v1": chance-node consumption, MCTS-Solver, and subtree reuse all still need
 * to land first (issue #6's own steps 4-consumption/6/7) before the complete system exists. Naming
 * this now would overstate how far Stage 2 has gotten, exactly like `mcts-uct-v1` before it.
 *
 * DUAL-SCALE (design doc §74, GH issue #20): `mcts-puct.mjs`'s own `search()` now accepts any real
 * `EngineAdapter` with tree-search capability — no more hardcoded personnel-only guard here, matching
 * `mcts-uct-v1`'s own precedent (§73). `weights` was already sourced from `adapter.DEFAULT_WEIGHTS`
 * here, not a personnel-only default, so this policy needed no other change.
 */
import { registerPolicy } from "../engine-adapter.mjs";
import { search } from "../../personnel-engine/search/mcts-puct.mjs";

registerPolicy({
  id: "mcts-puct-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    const {
      iterations = 500, maxDepth = 4, cPuct, tau, wideningK, wideningAlpha, budget
    } = options;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const result = search({ state, combatantId, turn, iterations, maxDepth, weights, cPuct, tau, wideningK, wideningAlpha, budget, adapter });
    if (!result.bestProposal) return null;
    return {
      ...result.bestProposal,
      score: result.meanValue,
      reason: `mcts-puct-v1: ${result.visits} visits, mean value ${result.meanValue.toFixed(3)} (${result.iterations} iterations, ${result.elapsedMs}ms, maxDepth ${maxDepth})`
    };
  }
});
