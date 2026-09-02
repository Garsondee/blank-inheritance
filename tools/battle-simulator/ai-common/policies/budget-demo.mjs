/**
 * `budget-demo-v1` (design doc §59, GH issue #5) — a real, minimal, HONEST proof that the shared
 * `options.budget` contract (`createBudgetTracker`, `../engine-adapter.mjs`) actually works end to
 * end, adapter-agnostic, ahead of any real search policy (2-ply lookahead #1, MCTS #6) existing to
 * exercise it for real.
 *
 * WHAT IT IS NOT: a strength improvement over `greedy-v1`. Given an unlimited budget it converges to
 * the exact same 1-ply-optimal choice `greedy-v1` already makes every time — `greedy-v1`'s own
 * `nativeGreedyDecide` already scores EVERY legal candidate in one pass, so there is no extra signal
 * left to extract by revisiting the same candidate set. Issues #1 and #6 are where genuine additional
 * STRENGTH from spending a larger budget comes from; this policy exists purely to prove the budget
 * mechanism itself — real anytime behavior, stop-when-exhausted, always return a real legal action —
 * before either of those land, so their own tests inherit an already-proven contract instead of
 * discovering budget bugs for the first time alongside real search-algorithm bugs.
 *
 * HOW: rather than scoring every legal candidate in one shot the way `nativeGreedyDecide` does, this
 * examines candidates ONE AT A TIME — via the real `adapter.forkTurnSandbox`/`adapter.evaluateState`
 * machinery, never invented scoring — tracking the best-scored LEGAL one seen so far, and checks the
 * budget tracker after each real unit of work (one candidate examined = one `tick()`). A small budget
 * genuinely cuts it off early, returning the best of whatever it had time to examine; a budget large
 * enough to cover every candidate converges to the same answer `greedy-v1` gives immediately.
 *
 * A budget can never make this policy return null when a real legal action exists: it keeps examining
 * candidates past an exhausted budget until it has found its first LEGAL one, then stops at the next
 * check — the same real guarantee a genuine anytime search (MCTS included) needs anyway, since "the
 * budget ran out and proposal #1 happened to be illegal" is not a legitimate reason to report no
 * decision. This can overshoot a very small budget slightly on an unlucky candidate order; it never
 * overshoots once a legal candidate is already in hand.
 */
import { registerPolicy, createBudgetTracker } from "../engine-adapter.mjs";

registerPolicy({
  id: "budget-demo-v1",
  decide(adapter, state, combatantId, turn, options = {}) {
    const me = state.combatants.get(combatantId);
    if (!me) return null;
    const weights = options.weights ?? adapter.DEFAULT_WEIGHTS;
    const before = adapter.evaluateState(state, me.side, weights, combatantId);
    const proposals = adapter.generateProposals(state, combatantId, turn);
    if (!proposals.length) return null;

    const tracker = createBudgetTracker(options.budget);
    let best = null;
    for (const proposal of proposals) {
      const sandbox = adapter.forkTurnSandbox({ state, turn });
      const result = sandbox.apply(combatantId, proposal);
      tracker.tick();
      if (result.legal) {
        const gain = adapter.evaluateState(sandbox.state, me.side, weights, combatantId) - before;
        if (!best || gain > best.gain) best = { proposal, gain, result };
      }
      if (tracker.exhausted() && best) break; // anytime: stop once the budget is out AND we have a real, legal answer
    }
    if (!best) return null;
    return {
      ...best.proposal,
      score: Number(best.gain.toFixed(3)),
      reason: `budget-demo-v1: best of ${tracker.iterations}/${proposals.length} real candidates examined (budget: ${JSON.stringify(options.budget ?? {})})`
    };
  }
});
