/**
 * The demonstration scenario: one Frame plus five vehicles (all four named
 * chassis from design/scale-and-chassis.md, plus the always-available
 * Runabout) against the real Day 1 Claimant statblock, INCLUDING its
 * Interdiction Field.
 *
 * The field-break itself (data/subsystems/day-1-ground-layer.json — five
 * level-1 kids filling a Field Integrity pool) is personnel-scale and out
 * of this simulator's scope (it's a Frame/vehicle-scale tool, per §2's
 * scale-separation rule). It's abstracted here as a scripted event at the
 * start of round 2, standing in for "the ground team did their job" —
 * the SAME assumption Branch B of data/encounters/day-1-the-fight.json's
 * own notes already treats as the expected case. A first run WITHOUT the
 * field (2026-08-22) showed exactly why it can't be skipped: six combined
 * attackers alpha-strike a Moderate-defense, Low-HP target to 19 HP inside
 * a single round with no tactical texture at all — real information (it
 * validates the field is doing necessary defensive work in the actual
 * script, not just narrative flavor), but a boring demonstration.
 *
 * REVISED 2026-08-22 per design doc §14: every combatant except the
 * Claimant now uses combatants.mjs's own default starting position rather
 * than an override here — those defaults ARE the intercept points §14a
 * derived from real-world approximate vehicle speeds, so overriding them
 * per-scenario would silently undo the arrival-wave story the position
 * data is meant to tell.
 *
 * REVISED AGAIN 2026-08-22: the field-break is no longer a flat assumption.
 * ground-layer/resolve-ground-layer.mjs now actually simulates the five
 * non-piloting kids (real stat blocks, see tools/character-builder) rolling
 * against the subsystem's real DCs, and the round the field breaks — if it
 * breaks at all within the ground team's 3-round window — comes from that
 * roll. `fieldBreaksAtRound` can still be passed explicitly (existing tests
 * rely on this for determinism); omit it to let the ground layer decide.
 */
import { claimantAI } from "../ai/claimant-ai.mjs";
import { partyAI } from "../ai/party-ai.mjs";
import { loadClaimant, makeReferenceFrame, makeKingfisher, makeHod, makeLadle, makeVesper, makeRunabout } from "../data/combatants.mjs";
import { runGroundLayer } from "../ground-layer/resolve-ground-layer.mjs";
import { loadGroundTeam } from "../ground-layer/load-kids.mjs";

export function buildScenario({ seed = 20260822, fieldBreaksAtRound, roundLimit = 8 } = {}) {
  const claimant = loadClaimant({ position: { col: 40, row: 22 }, objective: { col: 2, row: 22 } });
  const frame = makeReferenceFrame();
  const kingfisher = makeKingfisher();
  const hod = makeHod();
  const ladle = makeLadle();
  const vesper = makeVesper();
  const runabout = makeRunabout();

  const combatants = [claimant, frame, kingfisher, hod, ladle, vesper, runabout];

  function ai(state, combatantId, turnState) {
    const combatant = state.combatants.get(combatantId);
    return combatant.side === "opposition" ? claimantAI(state, combatantId, turnState) : partyAI(state, combatantId, turnState);
  }

  // fieldBreaksAtRound === undefined means "not explicitly overridden" — run the
  // real personnel-scale simulation and use whatever it actually produces,
  // including "never" (the ground team can genuinely fail to fill the pool
  // within their 3-round window; that's a real possible outcome now, not a
  // case this scenario forecloses by always assuming success).
  const groundLayerLog = fieldBreaksAtRound === undefined ? runGroundLayer({ kids: loadGroundTeam(), seed }) : null;
  const resolvedFieldBreaksAtRound = fieldBreaksAtRound !== undefined ? fieldBreaksAtRound : groundLayerLog.fieldBreaksAtRound;

  const scriptedEvents = resolvedFieldBreaksAtRound
    ? {
        [resolvedFieldBreaksAtRound]: (state) => {
          const target = state.combatants.get("claimant-one");
          target.immuneToAllDamage = false;
          target.stunnedRounds = 2;
          target.weaknessAll = 15; // max level-appropriate value at level 12, reference/tables/dc-and-check-math.json
          return "Ground team fills Field Integrity — Interdiction Field collapses. Claimant is Stunned 2 and gains weakness 15 to all damage.";
        }
      }
    : {};

  return {
    seed,
    gridSize: { cols: 44, rows: 44 },
    roundLimit,
    combatants,
    ai,
    scriptedEvents,
    // Tells engine.mjs's stalemate check not to fire before the ground team's own fixed 3-round
    // window (ground-layer/resolve-ground-layer.mjs's ROUNDS) has actually played out — without
    // this, a failed ground-layer roll (scriptedEvents already empty at round 1) got detected as
    // a permanent stalemate immediately, before the in-fiction window that failure came from had
    // even happened yet. Only meaningful when the roll genuinely failed; harmless otherwise (the
    // field-break scriptedEvent, if any, already prevents the stalemate check from matching).
    stalemateNotBeforeRound: 3,
    groundLayerLog // metadata for callers (run-scenario.mjs, the artifact) — runBattle() itself never reads this
  };
}
