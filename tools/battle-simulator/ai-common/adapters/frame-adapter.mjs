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
import { forkTurnSandbox, checkOutcome, resetSandboxForkCount, getSandboxForkCount } from "../../engine/engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../../ai/evaluate/state-value.mjs";
import { FEET_PER_SQUARE } from "../../engine/grid.mjs";
import { resolveEffectiveStats } from "../../engine/combatant.mjs";
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
  nativeGreedyDecide: decide,
  // OPTIONAL, not part of assertValidAdapter's REQUIRED_FIELDS (design doc §59, GH issue #5) — see
  // personnel-adapter.mjs's own identical fields for the real reasoning.
  resetSandboxForkCount,
  getSandboxForkCount,
  // OPTIONAL, real tree-search capability (design doc §73, GH issue #20 — see personnel-adapter.mjs's
  // own identical fields for the shared reasoning). Frame-scale has NO condition system at all
  // (confirmed directly: no dying/unconscious concept anywhere in `engine/`, `engine/engine.mjs`'s own
  // native battle loop just checks `combatant.currentHP <= 0` inline) — `isDead` reuses Frame's own
  // already-computed HP-band signal rather than a second, hand-rolled check (verified identical to a
  // raw currentHP<=0 check today: `resolveEffectiveStats`'s own `disabled` is `damageStateFor(...) ===
  // HULKED`, which is unconditionally `currentHP<=0`, regardless of combatant kind). `isUnconscious`
  // is always false — Frame has no "might still recover" state distinct from simply being done.
  resolveEffectiveStats,
  isDead: (c) => resolveEffectiveStats(c).disabled,
  isUnconscious: () => false
});
assertValidAdapter(FRAME_ADAPTER); // real, immediate self-check — a missing field fails at import time
