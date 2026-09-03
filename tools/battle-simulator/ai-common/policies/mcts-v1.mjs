/**
 * `mcts-v1` (design doc §70, GH issue #6 step 7's own third part — "registration as the mcts-v1
 * policy") — the COMPLETE system issue #6's own build order has been assembling since step 2: PUCT +
 * progressive widening (`mcts-puct.mjs`, §65) with MCTS-Solver's proven win/loss propagation opted IN
 * (`useSolver: true`, §67), PLUS the real root trap-insurance check (`trap-insurance.mjs`, §66)
 * applied to its own top candidates before committing, PLUS real budget awareness (§68). Every one of
 * these four pieces is already independently built and independently tested — this file is
 * composition, not new algorithmic work, matching how `mcts-puct-insured-v1` already combines PUCT +
 * insurance; the only real difference from that sibling is `useSolver: true` threaded into the
 * underlying `search()` call. `mcts-puct-insured-v1`, `mcts-puct-solver-v1`, `mcts-puct-v1`, and
 * `mcts-uct-v1` all stay exactly as they are — this is a NEW, separately-registered policy, never a
 * silent change to what an already-tested one does.
 *
 * WHY "mcts-v1" NOW, when three earlier sibling files each said "deliberately not mcts-v1": that name
 * was reserved specifically for the moment every algorithmic piece the build order lists exists and
 * is independently proven — as of §69, that's true. Two real, honestly-scoped things this name does
 * NOT yet mean:
 * - Subtree reuse (§69) is NOT wired into this policy's own live decision-making. Reuse's core
 *   mechanism is built and tested (`subtree-reuse.mjs`), but actually EXERCISING it across repeated
 *   real decide() calls needs some caller to carry `{root, hops-since}` forward — the whole policy
 *   layer is confirmed 100% stateless today (no persistent per-combatant object anywhere, no 6th
 *   "session" argument on any registered policy's own `decide()`). Extending the policy contract with
 *   an opt-in session/memory convention is real, separate architecture work, left for its own future
 *   step — naming this "mcts-v1" is about the SEARCH ALGORITHM being complete, not about every
 *   possible efficiency this whole search family could eventually gain.
 * - Chance-node consumption INSIDE the tree itself (as opposed to the trap-insurance oracle, which
 *   already has it) is still not wired into MCTS's own simulation — `computeCandidates`'s own PRIOR
 *   is still the deterministic one-ply gain `decide()` already computes, matching every PUCT-family
 *   sibling before it.
 *
 * DUAL-SCALE (design doc §75, GH issue #20): every one of the four underlying modules now accepts a
 * real `EngineAdapter` — no more hardcoded personnel-only guard here. This completes issue #20's
 * whole MCTS search family; `mcts-v1` is now the complete, tournament-strength policy on EITHER
 * scale. Step 8 (determinization for fog, #10) remains real, separate, unstarted work on either
 * scale, deliberately gated to run only after this policy is proven on the open (full-information)
 * arena.
 */
import { registerPolicy } from "../engine-adapter.mjs";
import { search } from "../../personnel-engine/search/mcts-puct.mjs";
import { applyTrapInsurance } from "../../personnel-engine/search/trap-insurance.mjs";

registerPolicy({
  id: "mcts-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    const {
      iterations = 500, maxDepth = 4, cPuct, tau, wideningK, wideningAlpha,
      oracleDepth = 3, topK = 2, budget
    } = options;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const mctsResult = search({ state, combatantId, turn, iterations, maxDepth, weights, cPuct, tau, wideningK, wideningAlpha, useSolver: true, budget, adapter });
    const insured = applyTrapInsurance({ mctsResult, state, combatantId, turn, weights, oracleDepth, topK, adapter });
    if (!insured.bestProposal) return null;
    const provenNote = mctsResult.root?.proven ? `, solver-proven=${mctsResult.root.proven}` : "";
    return {
      ...insured.bestProposal,
      score: insured.meanValue,
      reason: insured.trapInsurance
        ? `mcts-v1: ${insured.trapInsurance.overridden ? "trap insurance OVERRODE MCTS's own pick" : "MCTS's own pick confirmed"} (checked ${insured.trapInsurance.checked.length} real candidates at oracle depth ${oracleDepth}${provenNote})`
        : `mcts-v1: ${mctsResult.visits} visits, mean value ${mctsResult.meanValue.toFixed(3)}, ${mctsResult.iterations} iterations, ${mctsResult.elapsedMs}ms (insurance found nothing to check${provenNote})`
    };
  }
});
