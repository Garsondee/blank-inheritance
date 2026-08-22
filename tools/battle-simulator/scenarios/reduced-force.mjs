/**
 * A harder comparison scenario: the Frame plus only two vehicles (Hod as a
 * durable anchor, Ladle for support) instead of the full five-vehicle
 * escort. Built after the two five-vehicle runs both ended before the
 * damage-state degradation curve (design/scale-and-chassis.md §8) or the
 * Ladle's Field Repair ever got meaningfully exercised — five vehicles of
 * ranged firepower is simply enough to end the fight before the Claimant's
 * own offense matters. This is "test different approaches" in practice:
 * same rules, same Claimant, deliberately less party firepower, to see
 * what the system does under real pressure instead of only in the
 * decisive case.
 */
import { claimantAI } from "../ai/claimant-ai.mjs";
import { partyAI } from "../ai/party-ai.mjs";
import { loadClaimant, makeReferenceFrame, makeHod, makeLadle } from "../data/combatants.mjs";

export function buildScenario({ seed = 20260822, fieldBreaksAtRound = 3, roundLimit = 10 } = {}) {
  const claimant = loadClaimant({ position: { col: 20, row: 22 }, objective: { col: 2, row: 22 } });
  const frame = makeReferenceFrame({ position: { col: 16, row: 22 } }); // starts closer — this scenario is about sustained engagement, not the chase problem
  const hod = makeHod({ position: { col: 15, row: 24 } });
  const ladle = makeLadle({ position: { col: 13, row: 22 } });

  const combatants = [claimant, frame, hod, ladle];

  function ai(state, combatantId, turnState) {
    const combatant = state.combatants.get(combatantId);
    return combatant.side === "opposition" ? claimantAI(state, combatantId, turnState) : partyAI(state, combatantId, turnState);
  }

  const scriptedEvents = fieldBreaksAtRound
    ? {
        [fieldBreaksAtRound]: (state) => {
          const target = state.combatants.get("claimant-one");
          target.immuneToAllDamage = false;
          target.stunnedRounds = 2;
          target.weaknessAll = 15;
          return "Ground team (abstracted) fills Field Integrity — Interdiction Field collapses. Claimant is Stunned 2 and gains weakness 15.";
        }
      }
    : {};

  return { seed, gridSize: { cols: 44, rows: 44 }, roundLimit, combatants, ai, scriptedEvents };
}
