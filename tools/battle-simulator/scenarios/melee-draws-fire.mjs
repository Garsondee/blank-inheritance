/**
 * A second comparison scenario, built after both five-vehicle runs showed
 * the same thing: a Frame with a reach-100 weapon can engage from 100ft —
 * outside the Claimant's Claim reaction trigger range (which requires
 * ending a move ADJACENT, i.e. within one square) — and never draws a
 * counter-attack at all. That's a real, legitimate emergent finding, not a
 * bug, but it means neither run ever exercised the Claim reaction, the
 * damage-state degradation curve, or the Ladle's Field Repair.
 *
 * This scenario swaps the Frame's weapon for a plain adjacency-only melee
 * Strike (no reach trait) — everything else about the ruleset is
 * identical — specifically to show what the SAME fight looks like when
 * melee actually has to close the distance. Direct evidence for the
 * reach-vs-adjacency trade a player would weigh when building a Frame.
 * Positions here are deliberately close (unlike the escort scenario's
 * round-0 shared-deployment start) — this scenario is isolating "what
 * happens once melee is already engaged," not testing approach distance.
 */
import { claimantAI } from "../ai/claimant-ai.mjs";
import { partyAI } from "../ai/party-ai.mjs";
import { loadClaimant, makeReferenceFrame, makeHod, makeLadle } from "../data/combatants.mjs";

export function buildScenario({ seed = 20260822, fieldBreaksAtRound = 3, roundLimit = 10 } = {}) {
  const claimant = loadClaimant({ position: { col: 20, row: 22 }, objective: { col: 2, row: 22 } });
  const frame = makeReferenceFrame({
    position: { col: 16, row: 22 },
    strikes: [{ name: "Melee Weapon (no reach)", strikeType: "melee", attackBonus: 25, traits: [], damage: [{ dice: "2d12", bonus: 17, damageType: "slashing" }] }]
  });
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
