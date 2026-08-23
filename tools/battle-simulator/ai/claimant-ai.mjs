/**
 * The Claimant's tactical policy. As of design doc §15j this is a thin
 * wrapper over the shared decide() decision layer — the same sandbox-scored
 * evaluator that drives the party side, with no separate weight profile:
 * "Advance toward the objective, Strike whatever is in reach" emerges from
 * evaluateState's own objective-progress and offensive-reach terms, not a
 * bespoke RELENTLESS_ADVANCER control path.
 *
 * Kept as a named, separately-testable entry point rather than inlining
 * the call at the scenario's dispatch site, so this side's behavior stays
 * independently documented and covered by
 * test/battle-simulator/claimant-ai.test.mjs.
 */
import { decide } from "./decide.mjs";

export function claimantAI(state, combatantId, turnState) {
  return decide(state, combatantId, turnState);
}
