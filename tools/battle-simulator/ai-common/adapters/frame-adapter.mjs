/**
 * The Frame-scale EngineAdapter (design doc §57/#20) — see `../engine-adapter.mjs`'s own header for
 * the real contract every field here satisfies. A thin, zero-logic wrapper over `ai/`/`engine/`'s
 * existing, unmodified exports — same discipline as `personnel-adapter.mjs`.
 *
 * Two real, documented asymmetries versus the personnel adapter (both confirmed by directly reading
 * the source, not assumed — design doc §57's own research note on issue #20 has the full comparison):
 *
 * 1. `nativeGreedyDecide` here only understands `{competence, weights}` — no whole-turn templates, no
 *    morale override, no disabled-action-types (Frame-scale's own `decide()` predates all three;
 *    design doc §43/§46 were personnel-scale-only additions never back-ported). A caller that passes
 *    the extra personnel-only option fields gets them silently ignored here, not an error — Frame's
 *    real `decide()` simply never destructures them.
 * 2. `evaluateState` here has no `actingCombatantId` 4th parameter (no setupValue-equivalent term),
 *    and the underlying `bestExpectedDamage` this engine's own evaluator uses takes no `walls`
 *    parameter at all — Frame-scale's evaluator has no cover-AC awareness. Calling `evaluateState`
 *    with a 4th argument anyway is safe (JS silently drops an argument a function doesn't declare).
 */
import { decisionRng, generateProposals, decide } from "../../ai/decide.mjs";
import { forkTurnSandbox, checkOutcome } from "../../engine/engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../../ai/evaluate/state-value.mjs";
import { FEET_PER_SQUARE } from "../../engine/grid.mjs";
import { assertValidAdapter } from "../engine-adapter.mjs";

export const FRAME_ADAPTER = Object.freeze({
  id: "frame",
  feetPerSquare: FEET_PER_SQUARE,
  decisionRng,
  generateProposals,
  forkTurnSandbox,
  checkOutcome,
  evaluateState,
  DEFAULT_WEIGHTS,
  nativeGreedyDecide: decide
});
assertValidAdapter(FRAME_ADAPTER); // real, immediate self-check — a missing field fails at import time
