/**
 * The Claimant's tactical policy. As of design doc §14h this is a thin
 * wrapper over the shared utility-AI framework (utility-ai.mjs +
 * candidates.mjs + profiles.mjs) — the same engine that drives the party
 * side, just under the RELENTLESS_ADVANCER weight profile (profiles.mjs),
 * which is how "Advance is scripted and near-mandatory, Strike is
 * opportunistic" ends up expressed as numbers instead of bespoke control
 * flow. See candidates.mjs's generateAdvanceCandidate/generateStrikeCandidates
 * for the actual behavior: Advance whenever it can afford the 2 actions
 * (directive's weight dwarfs everything else), then Strike whatever
 * Large+ target is already within Sweep's reach with what's left — "does
 * not pursue, retreat, or change target," per its own statblock.
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
