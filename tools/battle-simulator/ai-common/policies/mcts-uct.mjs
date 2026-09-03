/**
 * `mcts-uct-v1` (design doc §62, GH issue #6, step 2 of its own build order) — registers the plain-
 * UCT tree search (`personnel-engine/search/mcts.mjs`) through the policy interface.
 *
 * DELIBERATELY NOT "mcts-v1": that id is reserved for `mcts-puct.mjs`'s own COMPLETE, composed system
 * (§70) — this is plain UCT with a depth cap and no rollout, kept frozen as a comparison baseline, not
 * the direction of travel PUCT/solver/trap-insurance/reuse/determinization were all built on top of.
 *
 * DUAL-SCALE (design doc §73, GH issue #20): `personnel-engine/search/mcts.mjs`'s own `search()` now
 * accepts any real `EngineAdapter` with tree-search capability (`isDead`/`isUnconscious`/
 * `resolveEffectiveStats` — optional fields, not every adapter provides them; `search()` itself throws
 * a clear, specific error if the one it's handed doesn't). No more hardcoded personnel-only guard here
 * — this policy runs against whichever real adapter it's actually given, `PERSONNEL_ADAPTER` or
 * `FRAME_ADAPTER` alike, the first search policy in this whole family to do so.
 */
import { registerPolicy } from "../engine-adapter.mjs";
import { search } from "../../personnel-engine/search/mcts.mjs";

registerPolicy({
  id: "mcts-uct-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    const iterations = options.iterations ?? 500;
    const maxDepth = options.maxDepth ?? 4;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const result = search({ state, combatantId, turn, iterations, maxDepth, weights, adapter });
    if (!result.bestProposal) return null;
    return {
      ...result.bestProposal,
      score: result.meanValue,
      reason: `mcts-uct-v1: ${result.visits} visits, mean value ${result.meanValue.toFixed(3)} (${result.iterations} iterations, maxDepth ${maxDepth})`
    };
  }
});
