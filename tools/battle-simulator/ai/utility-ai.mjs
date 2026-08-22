/**
 * The utility-AI orchestrator (design doc §14h): generate every legal
 * candidate (candidates.mjs), weight each by the acting combatant's
 * profile (profiles.mjs), and propose whichever scores highest. This is
 * the single decision-making entry point for BOTH sides of the fight —
 * scenarios/five-vehicles-one-frame.mjs's `ai` function calls this same
 * function for the Claimant and for every party combatant; the only
 * difference between "an enemy's goals" and "the players' goals" is which
 * weight profile applies, exactly per Ingram's framing that both sides
 * need "good ways to generate decisions that make sense and work towards
 * either the enemies goals or the players."
 *
 * Deliberately NOT a lookahead/planning system — every candidate is
 * scored for its value on THIS action, not simulated forward across
 * future turns. That scope is enough to replace the hand-written
 * if-chains this project had before (see git history for party-ai.mjs
 * and claimant-ai.mjs, now thin wrappers around this) with something
 * genuinely comparative and auditable, without building a full game-tree
 * search nothing here currently needs.
 */
import { generateCandidates } from "./candidates.mjs";
import { profileFor } from "./profiles.mjs";

export function utilityAI(state, combatantId, turnState) {
  const combatant = state.combatants.get(combatantId);
  const remaining = turnState.actionsAvailable - turnState.actionsUsed;
  if (remaining <= 0) return null;

  const profile = profileFor(combatant);
  const candidates = generateCandidates(state, combatantId, turnState);
  if (!candidates.length) return null;

  let best = null;
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score = (profile[candidate.weightKey] ?? 0) * candidate.value;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  // A candidate scoring 0 (e.g. a Strike against a target that turns out to be immune, or a
  // Spot that would gain an ally nothing) isn't worth taking over simply holding the action —
  // "no legal action worth spending the point on" is itself a meaningful, already-tested outcome
  // (see engine.mjs's heldReason accounting) and a more honest log entry than a doomed action.
  if (!best || bestScore <= 0) return null;

  // eslint-disable-next-line no-unused-vars
  const { weightKey, value, ...proposal } = best;
  return { ...proposal, score: bestScore };
}
