/**
 * The party side's tactical policy. As of design doc §14h this is a thin
 * wrapper over the shared utility-AI framework (utility-ai.mjs +
 * candidates.mjs + profiles.mjs) — the hand-written if-chains that used
 * to live here (Vesper spots only, Runabout only evacuates, everyone else
 * moves-then-strikes) are now emergent behavior from real expected-value
 * scoring under each combatant's weight profile, not scripted per id.
 * Kept as a named, separately-testable entry point (matching
 * claimant-ai.mjs's own wrapper) rather than inlining the call at the
 * scenario's dispatch site, so party-side behavior stays independently
 * documented and covered by test/battle-simulator/party-ai.test.mjs.
 *
 * computeDestination moved to candidates.mjs (2026-08-22) — it's a
 * candidate-generation primitive now, used by every move-toward-a-goal
 * candidate, not something specific to the party side. Re-exported here
 * so existing imports keep working.
 */
import { utilityAI } from "./utility-ai.mjs";

export { computeDestination } from "./candidates.mjs";

export function partyAI(state, combatantId, turnState) {
  return utilityAI(state, combatantId, turnState);
}
