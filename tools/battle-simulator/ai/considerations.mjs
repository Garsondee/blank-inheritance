/**
 * COMPATIBILITY SHIM (design doc §15e/§15f).
 *
 * This module used to own the AI's expected-value maths. All of it has moved
 * into `engine/resolve.mjs`, next to the real dice-rolling resolvers it is the
 * deterministic twin of, for two reasons:
 *
 *   1. **Dependency direction.** The lookahead sandbox lives in the engine and
 *      needs expectation maths. If that maths lived here, the engine would have
 *      to import from `ai/` — backwards, and a cycle waiting to happen. Keeping
 *      it in `engine/` makes the dependency `ai/ -> engine/`, one way, always.
 *
 *   2. **Drift.** A real resolver and its expectation twin are two statements of
 *      one rule. Side by side in one file, a change to one makes the other's
 *      staleness visible. A file apart, it does not — which is exactly how
 *      `afterMitigation` came to be a second, hand-copied implementation of
 *      `applyStrikeDamage` (see §15e).
 *
 * Kept as re-exports rather than deleted outright only so the existing AI and
 * its tests keep working through the rebuild. This file goes away with the rest
 * of the old AI layer once the new evaluator lands.
 */
export {
  averageDamage,
  averageStrikeDamage,
  degreeProbabilities,
  expectedStrikeDamage,
  hitProbability,
  expectedRepairHealing,
  killProbability
} from "../engine/resolve.mjs";

import { expectedEvacuationCivilians } from "../engine/resolve.mjs";

/** Average civilians gotten clear by one Evacuate action (resolveEvacuation rolls "2d6+2"). */
export const AVERAGE_EVACUATION_CIVILIANS = expectedEvacuationCivilians();
