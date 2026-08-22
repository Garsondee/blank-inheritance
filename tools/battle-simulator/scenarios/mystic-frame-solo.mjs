/**
 * A focused, single-Frame scenario (design doc §14k) built specifically to
 * answer Ingram's direct question — "Can you cast a spell? Do you know
 * your spell list? Can you use a character ability?" — with a real
 * combatant that has both, not just a weapon Strike. The TEST FIXTURE
 * Mystic Frame (makeMysticFrame(), data/combatants.mjs) carries a real
 * extracted spell (Eldritch Lance, an attack cantrip) and a real class
 * ability (Transfer Vitality, a heal), so a full battle here exercises
 * generateStrikeCandidates' spell-attack path and generateHealAbilityCandidates
 * — genuinely different decisions from the escort scenario's five-vehicle
 * roster, not just the same Strike-only choices with a different name.
 *
 * Deliberately a clean 1v1 (no vehicles): the point is to see the caster's
 * own decision-making read clearly in the transcript, not to re-test the
 * already-verified vehicle roles. Positions start closer than the escort
 * scenario's full-map deployment (matching melee-draws-fire.mjs's
 * precedent) since Eldritch Lance's real range (30ft) is short and this
 * scenario exists to exercise spellcasting choices, not another
 * approach-distance saga.
 */
import { claimantAI } from "../ai/claimant-ai.mjs";
import { partyAI } from "../ai/party-ai.mjs";
import { loadClaimant, makeMysticFrame } from "../data/combatants.mjs";

export function buildScenario({ seed = 20260822, fieldBreaksAtRound = 3, roundLimit = 10 } = {}) {
  const claimant = loadClaimant({ position: { col: 20, row: 22 }, objective: { col: 2, row: 22 } });
  const mystic = makeMysticFrame({ position: { col: 14, row: 22 } });

  const combatants = [claimant, mystic];

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

  return { seed, gridSize: { cols: 44, rows: 44 }, roundLimit, combatants, ai, scriptedEvents, stalemateNotBeforeRound: fieldBreaksAtRound ?? 0 };
}
