/**
 * The party side's tactical policy. As of design doc §15j this is a thin
 * wrapper over the shared decide() decision layer (sandbox scoring against
 * evaluateState) — the hand-written if-chains that used to live here
 * (Vesper spots only, Runabout only evacuates, everyone else
 * moves-then-strikes) are emergent behavior from real state evaluation
 * under one shared evaluator, not scripted per id. Kept as a named,
 * separately-testable entry point (matching claimant-ai.mjs's own wrapper)
 * rather than inlining the call at the scenario's dispatch site, so
 * party-side behavior stays independently documented and covered by
 * test/battle-simulator/party-ai.test.mjs.
 */
import { decide } from "./decide.mjs";

export function partyAI(state, combatantId, turnState) {
  return decide(state, combatantId, turnState);
}
