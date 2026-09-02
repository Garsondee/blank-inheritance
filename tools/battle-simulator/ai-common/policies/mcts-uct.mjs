/**
 * `mcts-uct-v1` (design doc §62, GH issue #6, step 2 of its own build order) — registers the plain-
 * UCT tree search (`personnel-engine/search/mcts.mjs`) through the policy interface.
 *
 * DELIBERATELY NOT "mcts-v1": that id is reserved for the COMPLETE system issue #6's own build order
 * produces at step 7, once PUCT priors (#12), real chance nodes (#7/Phase B), MCTS-Solver, and subtree
 * reuse (#9) all land. This is plain UCT with a depth cap and no rollout — a real, tested, but
 * intentionally partial step, not the finished policy. Naming it "mcts-v1" now would misrepresent how
 * far Stage 2 has actually gotten to anyone reading the registry later.
 *
 * PERSONNEL-SCALE ONLY, matching the underlying search module's own Phase-A scope.
 */
import { registerPolicy } from "../engine-adapter.mjs";
import { search } from "../../personnel-engine/search/mcts.mjs";

registerPolicy({
  id: "mcts-uct-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    if (adapter.id !== "personnel") {
      throw new Error(`mcts-uct-v1: personnel-scale only for now (design doc §62) — got adapter "${adapter.id}".`);
    }
    const iterations = options.iterations ?? 500;
    const maxDepth = options.maxDepth ?? 4;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const result = search({ state, combatantId, turn, iterations, maxDepth, weights });
    if (!result.bestProposal) return null;
    return {
      ...result.bestProposal,
      score: result.meanValue,
      reason: `mcts-uct-v1: ${result.visits} visits, mean value ${result.meanValue.toFixed(3)} (${result.iterations} iterations, maxDepth ${maxDepth})`
    };
  }
});
