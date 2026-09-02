/**
 * `greedy-v1` (design doc §57/#4) — the deliberately conservative Stage 0 policy: a real,
 * adapter-agnostic wrapper around WHICHEVER engine's own `nativeGreedyDecide` the caller resolved,
 * completely unmodified. Registering this is pure dispatch — zero new decision logic, so it is safe
 * to register against BOTH adapters with byte-identical code: `personnel-engine/decide.mjs`'s own
 * `decide()` keeps its exact real behavior when resolved via `PERSONNEL_ADAPTER` (golden sequences
 * unaffected — see `test/ai-common/greedy-policy.test.mjs`), and `ai/decide.mjs`'s own `decide()`
 * keeps ITS exact real behavior when resolved via `FRAME_ADAPTER` (the 438-test Frame-scale suite
 * unaffected). This is what "one AI, both scales" starts from: the SAME policy id means something
 * real and correct on either engine, not a coincidence of naming.
 *
 * A future, genuinely shared decision algorithm (the 2-ply lookahead in #1, MCTS in #6) registers
 * its OWN policy id here the same way, written once against `EngineAdapter`'s contract — never
 * importing `personnel-engine/` or `engine/` directly, only ever touching the engine through
 * whichever adapter it's handed.
 */
import { registerPolicy } from "../engine-adapter.mjs";

registerPolicy({
  id: "greedy-v1",
  decide(adapter, state, combatantId, turn, options) {
    return adapter.nativeGreedyDecide(state, combatantId, turn, options);
  }
});
