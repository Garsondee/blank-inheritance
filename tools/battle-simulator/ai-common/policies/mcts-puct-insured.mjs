/**
 * `mcts-puct-insured-v1` (design doc §66, GH issue #6 step 6) — `mcts-puct-v1`'s own real search,
 * PLUS the real root trap-insurance check (`personnel-engine/search/trap-insurance.mjs`) applied to
 * its own top candidates before committing. The first policy in this whole search family that
 * correctly avoids the real tough+xenowarden trip-pile-on trap — verified directly (design doc §66's
 * own tests): `mcts-puct-v1` alone walks into it confidently, even at 800 iterations; this doesn't.
 *
 * DELIBERATELY NOT "mcts-v1": chance-node consumption inside the tree search itself (as opposed to
 * the insurance check's own oracle, which already has it), MCTS-Solver, and subtree reuse are all
 * still real, separate, unstarted work.
 *
 * DUAL-SCALE (design doc §75, GH issue #20): both `search()` (§74) and `applyTrapInsurance()`/
 * `evaluateProposal()` (§75) now accept any real `EngineAdapter` — no more hardcoded personnel-only
 * guard here, matching every other policy in this search family.
 */
import { registerPolicy } from "../engine-adapter.mjs";
import { search } from "../../personnel-engine/search/mcts-puct.mjs";
import { applyTrapInsurance } from "../../personnel-engine/search/trap-insurance.mjs";

registerPolicy({
  id: "mcts-puct-insured-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    const {
      iterations = 500, maxDepth = 4, cPuct, tau, wideningK, wideningAlpha,
      oracleDepth = 3, topK = 2, budget
    } = options;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const mctsResult = search({ state, combatantId, turn, iterations, maxDepth, weights, cPuct, tau, wideningK, wideningAlpha, budget, adapter });
    const insured = applyTrapInsurance({ mctsResult, state, combatantId, turn, weights, oracleDepth, topK, adapter });
    if (!insured.bestProposal) return null;
    return {
      ...insured.bestProposal,
      score: insured.meanValue,
      reason: insured.trapInsurance
        ? `mcts-puct-insured-v1: ${insured.trapInsurance.overridden ? "trap insurance OVERRODE MCTS's own pick" : "MCTS's own pick confirmed"} (checked ${insured.trapInsurance.checked.length} real candidates at oracle depth ${oracleDepth})`
        : `mcts-puct-insured-v1: ${mctsResult.visits} visits, mean value ${mctsResult.meanValue.toFixed(3)} (insurance found nothing to check)`
    };
  }
});
