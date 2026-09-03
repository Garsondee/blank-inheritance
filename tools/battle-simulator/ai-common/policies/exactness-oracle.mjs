/**
 * `exactness-oracle-v1` (design doc §61, GH issue #21) — registers the real expectiminimax oracle
 * (`personnel-engine/search/expectiminimax.mjs`) through the policy interface, exactly as that
 * issue's own text asks: "it should still be registered in the policy registry (#4) so it can be
 * tournamented at tiny depths as a sanity anchor." Not a general-purpose policy — a TEST INSTRUMENT,
 * exponential in depth, meant for tiny 2v2 positions at depth 2-3, never a real tournament sweep.
 *
 * DUAL-SCALE (design doc §75, GH issue #20): `expectiminimax.mjs`'s own `solve()` now accepts any real
 * `EngineAdapter` with tree-search capability — no more hardcoded personnel-only guard here, matching
 * every other policy in this search family (§73/§74).
 */
import { registerPolicy } from "../engine-adapter.mjs";
import { solve } from "../../personnel-engine/search/expectiminimax.mjs";

registerPolicy({
  id: "exactness-oracle-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    const depth = options.depth ?? 2;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const result = solve({ state, combatantId, turn, depth, weights, adapter });
    if (!result.bestProposal) return null;
    return {
      ...result.bestProposal,
      score: result.value,
      reason: `exactness-oracle-v1: exact minimax value ${result.value.toFixed(3)} at depth ${depth} (${result.nodesExplored} nodes explored)`
    };
  }
});
