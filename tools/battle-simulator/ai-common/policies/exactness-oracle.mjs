/**
 * `exactness-oracle-v1` (design doc §61, GH issue #21) — registers the real expectiminimax oracle
 * (`personnel-engine/search/expectiminimax.mjs`) through the policy interface, exactly as that
 * issue's own text asks: "it should still be registered in the policy registry (#4) so it can be
 * tournamented at tiny depths as a sanity anchor." Not a general-purpose policy — a TEST INSTRUMENT,
 * exponential in depth, meant for tiny 2v2 positions at depth 2-3, never a real tournament sweep.
 *
 * PERSONNEL-SCALE ONLY (Phase A's own documented scope — see the oracle module's own header). Throws
 * a clear, real error rather than silently misbehaving if resolved against any other adapter; Frame-
 * scale support is real, separate future work.
 */
import { registerPolicy } from "../engine-adapter.mjs";
import { solve } from "../../personnel-engine/search/expectiminimax.mjs";

registerPolicy({
  id: "exactness-oracle-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    if (adapter.id !== "personnel") {
      throw new Error(`exactness-oracle-v1: Phase A (design doc §61) is personnel-scale only — got adapter "${adapter.id}". Frame-scale support is real, separate future work, not yet built.`);
    }
    const depth = options.depth ?? 2;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const result = solve({ state, combatantId, turn, depth, weights });
    if (!result.bestProposal) return null;
    return {
      ...result.bestProposal,
      score: result.value,
      reason: `exactness-oracle-v1: exact minimax value ${result.value.toFixed(3)} at depth ${depth} (${result.nodesExplored} nodes explored)`
    };
  }
});
