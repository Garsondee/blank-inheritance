/**
 * The neutral side's "policy" (design doc §16) — deliberately NOT decide().
 *
 * A civilian convoy fleeing toward extraction has exactly one goal (get there) and zero combat
 * capability (no strikes/spells — attackOptions() is always empty for it). Running it through the
 * full decide()/evaluateState stack was considered and rejected: evaluateState(state, "neutral")
 * would build its OWN allies/enemies split from ITS OWN side, which folds every Frame, vehicle, and
 * the Claimant alike into one undifferentiated "enemies" bucket (engine/factions.mjs's relations are
 * asymmetric on purpose — party protects neutral, but neutral has no reciprocal "party protects me
 * so they're not scary" case to special on). That would price a party escort Frame as exactly as
 * threatening as a scavenger raider, which is wrong, and would do it silently. A convoy's actual
 * goal is simple enough not to need a state evaluator at all: move toward extraction, every action,
 * full stop.
 *
 * Reuses bestDestinationToward directly (ai/decide.mjs) rather than reimplementing wall-aware
 * "walk toward a point" — same wall-gated pathfinding fallback every other mover on the map gets.
 */
import { bestDestinationToward } from "./decide.mjs";

export function neutralAI(state, combatantId, turn) {
  const me = state.combatants.get(combatantId);
  const myPos = state.positions.get(combatantId);
  if (!me?.extractionPoint || !myPos) return null;

  const speed = turn.effective?.speed ?? me.speed ?? 0;
  if (speed <= 0) return null;

  const dest = bestDestinationToward(state, combatantId, myPos, me.extractionPoint, speed, 0);
  if (!dest || (dest.col === myPos.col && dest.row === myPos.row)) return null; // already there, or nowhere useful to go

  return { type: "move", to: dest, reason: "Flee toward extraction" };
}
