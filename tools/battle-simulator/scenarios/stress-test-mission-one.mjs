/**
 * STRESS-TEST MISSION ONE (design doc §16) — NOT a proposal for the real Day 1 episode.
 *
 * Built on explicit direction: "Build a new mission 1, maximum complexity, with the goal of
 * stress testing your AI to find out what it fails at and then patching the system to try and
 * fill that gap... That comes first, then the fun lore/story." The real Day 1 episode stayed
 * exactly as designed — simple, tutorial-shaped, one Frame — and this is deliberately the
 * opposite: everything the engine currently supports, in one battle, on purpose. (That episode
 * was deleted 2026-09-13 with every drafted beat beyond Session 0/1; this file is unaffected,
 * being an engineering construct rather than campaign content, and the encounter/subsystem it
 * leans on survive as simulator fixtures.)
 *
 * Four factions on one map, engine/factions.mjs's new relations doing real work for the first
 * time outside a unit test:
 *   - PARTY (7): two player Frames (melee + caster archetypes) plus the full five-chassis escort
 *     fleet — real multi-unit coordination surface, not a solo pilot.
 *   - OPPOSITION, Claimant sub-thread (1): the real contact-unclassified Claimant, Interdiction
 *     Field/Scale-Blind/Advance/Claim intact, restrained (2026-08-23 fix) to never proactively
 *     Strike — see data/combatants.mjs's loadClaimant.
 *   - OPPOSITION, raider sub-thread (3): scavengers exploiting the chaos — a normal, killable,
 *     opportunistic threat running the SAME general decide() AI as everyone else, so the fight
 *     has a winnable half alongside the scripted-immune half.
 *   - NEUTRAL (3): a civilian convoy fleeing toward extraction — never runs decide() (see
 *     ai/neutral-ai.mjs) — that the party's evaluator now values protecting (isAlliedWith) and
 *     the raiders are free to prey on (isHostileTo's widened opposition rule). This is the Frame-
 *     scale, ON-MAP version of the trolley-problem tension day-1-ground-layer.json already proves
 *     works at personnel scale — same shape, different actors.
 *
 * Terrain: two real obstacle clusters (not authored city terrain — that stays out of scope per
 * Ingram's own "a separate AI is thinking about terrain... for now temporary walls for testing
 * purposes" direction) placed specifically to force a real routing choice between the convoy's
 * extraction path and the raiders' interception position.
 *
 * The ground layer (day-1-ground-layer.json's real personnel-scale simulation) still runs
 * unmodified via ground-layer/resolve-ground-layer.mjs, exactly as five-vehicles-one-frame.mjs
 * already does — reused, not reinvented, per the scale-separation rule (§2).
 *
 * Competence: "assume players and opponents will be trying to act optimally with few complete
 * misplays, but not no misplays" — every side runs decide() at competence 0.88 (not 1.0), the
 * existing softmax-temperature knob, applied uniformly rather than inventing a new mechanism.
 */
import { decide } from "../ai/decide.mjs";
import { neutralAI } from "../ai/neutral-ai.mjs";
import {
  loadClaimant, makeReferenceFrame, makeMysticFrame,
  makeKingfisher, makeHod, makeLadle, makeVesper, makeRunabout,
  makeScavengerRaider, makeScavengerTechnical, makeConvoyVehicle
} from "../data/combatants.mjs";
import { runGroundLayer } from "../ground-layer/resolve-ground-layer.mjs";
import { loadGroundTeam } from "../ground-layer/load-kids.mjs";

const COMPETENCE = 0.88; // near-optimal, not perfect — Ingram's explicit direction, not a default

/** Four axis-aligned wall segments bounding [c0,r0]-[c1,r1], in grid-vertex coordinates. */
function buildingWalls(c0, r0, c1, r1, { move = 20, sight = 20 } = {}) {
  return [
    { c: [c0, r0, c1, r0], move, sight },
    { c: [c1, r0, c1, r1], move, sight },
    { c: [c1, r1, c0, r1], move, sight },
    { c: [c0, r1, c0, r0], move, sight }
  ];
}

export function buildScenario({ seed = 20260823, fieldBreaksAtRound, roundLimit = 12 } = {}) {
  const claimantObjective = { col: 2, row: 22 };
  const extractionPoint = { col: 6, row: 30 };

  const claimant = loadClaimant({ position: { col: 38, row: 12 }, objective: claimantObjective });
  const referenceFrame = makeReferenceFrame();
  const mysticFrame = makeMysticFrame({ position: { col: 11, row: 26 } });
  const kingfisher = makeKingfisher();
  const hod = makeHod();
  const ladle = makeLadle();
  const vesper = makeVesper();
  const runabout = makeRunabout();

  const raiderA = makeScavengerRaider({ id: "scavenger-raider-a", position: { col: 17, row: 22 } });
  const raiderB = makeScavengerRaider({ id: "scavenger-raider-b", position: { col: 19, row: 25 } });
  const technical = makeScavengerTechnical({ position: { col: 16, row: 24 } });

  const convoyBusAlpha = makeConvoyVehicle({ id: "convoy-bus-alpha", name: "Evacuation Bus Alpha", maxHP: 45, currentHP: 45, position: { col: 28, row: 16 }, extractionPoint });
  const convoyBusBeta = makeConvoyVehicle({ id: "convoy-bus-beta", name: "Evacuation Bus Beta", maxHP: 45, currentHP: 45, position: { col: 29, row: 17 }, extractionPoint });
  const convoyTruck = makeConvoyVehicle({ id: "convoy-truck", name: "Transit Supply Truck", maxHP: 60, currentHP: 60, position: { col: 28, row: 18 }, extractionPoint });

  const combatants = [
    claimant, referenceFrame, mysticFrame, kingfisher, hod, ladle, vesper, runabout,
    raiderA, raiderB, technical,
    convoyBusAlpha, convoyBusBeta, convoyTruck
  ];

  // Two obstacle clusters, deliberately placed to force a routing choice rather than as city
  // dressing: RUBBLE sits on the Claimant's own advance line (broken elevated roadway, per
  // data/encounters/day-1-the-fight.json's stated environment); WAREHOUSE sits directly between
  // the convoy's start and its extraction point, astride the raiders' interception position — the
  // party (or the convoy fleeing on its own) must go around it, through the raiders' engagement
  // range, or the long way past the Claimant's line. No route is free.
  const walls = [
    ...buildingWalls(30, 13, 34, 17),
    ...buildingWalls(20, 20, 24, 24)
  ];

  function ai(state, combatantId, turn) {
    const combatant = state.combatants.get(combatantId);
    if (combatant.side === "neutral") return neutralAI(state, combatantId, turn);
    return decide(state, combatantId, turn, { competence: COMPETENCE });
  }

  const groundLayerLog = fieldBreaksAtRound === undefined ? runGroundLayer({ kids: loadGroundTeam(), seed }) : null;
  const resolvedFieldBreaksAtRound = fieldBreaksAtRound !== undefined ? fieldBreaksAtRound : groundLayerLog.fieldBreaksAtRound;

  const scriptedEvents = resolvedFieldBreaksAtRound
    ? {
        [resolvedFieldBreaksAtRound]: (state) => {
          const target = state.combatants.get("claimant-one");
          target.immuneToAllDamage = false;
          target.stunnedRounds = 2;
          target.weaknessAll = 15;
          return "Ground team fills Field Integrity — Interdiction Field collapses. Claimant is Stunned 2 and gains weakness 15 to all damage.";
        }
      }
    : {};

  return {
    seed,
    gridSize: { cols: 44, rows: 44 },
    roundLimit,
    combatants,
    walls,
    ai,
    scriptedEvents,
    stalemateNotBeforeRound: 3,
    groundLayerLog
  };
}
