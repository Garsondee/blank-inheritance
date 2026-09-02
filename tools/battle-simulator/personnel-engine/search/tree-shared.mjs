/**
 * SHARED NODE-TAXONOMY MECHANICS (design doc §61/§62, GH issues #6/#21) — the real decision/terminal/
 * forced-node handling every tree search over this engine needs identically, extracted so the exact
 * same forced-node logic isn't reimplemented (and re-risked) per search algorithm. First consumer:
 * `expectiminimax.mjs` (the exactness oracle). Second: `mcts.mjs`. Both trust this file for exactly
 * the same real rules, verified once.
 *
 * Same Phase-A scope as everywhere else in `search/`: DETERMINISTIC transitions only
 * (`forkTurnSandbox`'s own `EXPECTED_OUTCOMES` path). See `expectiminimax.mjs`'s own header for the
 * full reasoning; nothing here is specific to exhaustive search, so nothing here needs to change when
 * chance nodes (Phase B) eventually land — chance-node expansion would be a NEW function here,
 * alongside these, not a rewrite of them.
 */
import { isDead, isUnconscious, releaseGrapple } from "../conditions.mjs";
import { resolveEffectiveStats } from "../combatant.mjs";

export const WIN_VALUE = 1e6; // dominates any real evaluateState magnitude (bounded by real HP pools) by construction
export const LOSS_VALUE = -WIN_VALUE;

/** `outcome` is a real `checkOutcome(state)` result — `{result: "party-victory"|"party-defeat"}`.
 * Returns the real WIN/LOSS sentinel in `rootSide`'s own terms. */
export function outcomeValue(outcome, rootSide) {
  if (outcome.result === "party-victory") return rootSide === "party" ? WIN_VALUE : LOSS_VALUE;
  if (outcome.result === "party-defeat") return rootSide === "party" ? LOSS_VALUE : WIN_VALUE;
  return 0; // checkOutcome only ever returns one of the two results above, or null (never reached)
}

/** The deterministic subset of `runBattle`'s own end-of-turn forced effects — Frightened decay,
 * Grapple expiry — applied directly to `state`, which by the time this runs is always a fresh fork
 * this search node already owns exclusively (never the shared parent state). */
export function applyEndOfTurnEffects(state, actorId) {
  const actor = state.combatants.get(actorId);
  if (actor.frightened > 0) actor.frightened -= 1;
  for (const c of state.combatants.values()) {
    if (c.grappledBy?.attackerId === actorId && state.round >= c.grappledBy.expiresEndOfRound) {
      releaseGrapple(c);
    }
  }
}

/**
 * Advances from just after `fromIndex`'s own turn to the next real actor with real actions to take,
 * applying the SAME deterministic forced effects `runBattle`'s own loop applies for everything short
 * of a real dice roll: dead combatants are skipped (matching `if (isDead(combatant)) continue`),
 * Stunned's real action-loss arithmetic is applied (matching `resolveEffectiveStats(combatant).actionsAvailable`
 * minus `stunnedValue`, mutating `stunnedValue` down the same way), and a combatant whose whole turn
 * is consumed by Stun is itself skipped with no decision node at all — exactly `runBattle`'s own
 * `continue` path.
 *
 * Returns `{ actingId, initiativeIndex, round, turn }` for the next real decision node, or
 * `{ stochasticGap: true }` if the next real turn belongs to an UNCONSCIOUS combatant (a real
 * recovery-check chance node Phase A does not model — see `expectiminimax.mjs`'s own header), or
 * `{ noActor: true }` if no combatant can ever act again (every remaining combatant dead, or the
 * bounded search guard below was exhausted — a real, structural end-of-search condition, not a bug).
 */
export function advanceToNextActor(state, initiativeOrder, fromIndex, round) {
  let index = fromIndex;
  let currentRound = round;
  for (let guard = 0; guard < initiativeOrder.length * 4 + 4; guard++) {
    index += 1;
    if (index >= initiativeOrder.length) { index = 0; currentRound += 1; }
    const id = initiativeOrder[index];
    const combatant = state.combatants.get(id);
    if (isDead(combatant)) continue;
    if (isUnconscious(combatant)) return { stochasticGap: true };
    let actionsAvailable = resolveEffectiveStats(combatant).actionsAvailable;
    if (combatant.stunnedValue > 0) {
      const lost = Math.min(actionsAvailable, combatant.stunnedValue);
      combatant.stunnedValue -= lost;
      actionsAvailable -= lost;
      if (actionsAvailable <= 0) continue;
    }
    return {
      actingId: id, initiativeIndex: index, round: currentRound,
      turn: { actionsAvailable, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 }
    };
  }
  return { noActor: true };
}

/** Given the acting combatant's own turn just after a real applied action, decide who acts at the
 * NEXT decision node: the SAME actor (if they still have real actions left this turn) or the next
 * real actor in initiative order (applying end-of-turn effects and forced-node advancement). Shared
 * by every search algorithm in this directory so "whose turn is it now" is computed identically
 * everywhere — a real, previously-duplicated piece of logic, now written once. */
export function nextActorAfterAction({ childState, childTurn, actor, initiativeOrder }) {
  if (childTurn.actionsAvailable - childTurn.actionsUsed > 0) {
    return { actingId: actor.actingId, initiativeIndex: actor.initiativeIndex, round: actor.round, turn: childTurn };
  }
  applyEndOfTurnEffects(childState, actor.actingId);
  return advanceToNextActor(childState, initiativeOrder, actor.initiativeIndex, actor.round);
}

/** The same real proposal-identity key `decide.mjs`'s own module-private `proposalKey` uses
 * (`JSON.stringify`) — not imported directly since that one is module-private there and this is a
 * one-line, already-shared convention, not real logic worth an export-widening. */
export function proposalKey(proposal) {
  return JSON.stringify(proposal);
}
