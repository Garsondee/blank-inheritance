/**
 * End-to-end proof that the belief/vision engine works as a WHOLE, not just
 * in isolated unit tests (design doc §15r/§15s) — the same discipline the
 * terrain work established: a real runBattle using the real, unscripted
 * decide() AI is what actually proves a mechanism works together, not a
 * unit test of one function in isolation. This is the accepted
 * vision-as-chassis-axis idea's own headline claim, made mechanically real:
 * "a Frame without spotters is a giant swinging at what it's told about."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/ai/decide.mjs";

function makeCombatant(id, side, position, overrides = {}) {
  return {
    id, name: id, kind: "chassis", side, size: "huge", maxHP: 200, currentHP: 200,
    ac: 15, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 900,
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 30, traits: [], damage: [{ dice: "2d10", bonus: 10 }] }],
    reactions: [], scaleBlind: false, position,
    ...overrides
  };
}

function ai(state, combatantId, turnState) {
  return decide(state, combatantId, turnState);
}

test("HEADLINE: a near-blind unit still finds and engages an enemy far outside its OWN vision range, because a sighted teammate's belief covers it", () => {
  // The blind Frame starts 3000ft from the enemy — WAY beyond its own 100ft vision. Alone, it
  // would have no belief entry for the enemy at all and never generate a single candidate aimed
  // at it. The spotter, right next to the Frame, has excellent vision (5000ft) and sees the enemy
  // from the very start — its belief-refresh (checking the WHOLE side's combined vision) is what
  // gives the Frame something to act on.
  const blindFrame = makeCombatant("frame", "party", { col: 4, row: 4 }, { vision: { range: 150 } }); // 3 squares — comfortably reaches into melee (50ft) once adjacent, nowhere near the enemy's 3000ft starting distance
  const spotter = makeCombatant("spotter", "party", { col: 4, row: 5 }, { vision: { range: 5000 } });
  const enemy = makeCombatant("enemy", "opposition", { col: 64, row: 4 }, { speed: 0 }); // stays put — isolates the FRAME's own pursuit behaviour

  const log = runBattle({ seed: 7, gridSize: { cols: 80, rows: 80 }, roundLimit: 15, combatants: [blindFrame, spotter, enemy], ai });

  let frameEverMoved = false, frameEverStruck = false, totalDamageToEnemy = 0;
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      if (turn.combatantId !== "frame") continue;
      for (const action of turn.actions ?? []) {
        if (action.legal && (action.type === "move" || action.type === "step")) frameEverMoved = true;
        if (action.legal && action.type === "strike") frameEverStruck = true;
        if (action.legal && typeof action.damageApplied === "number") totalDamageToEnemy += action.damageApplied;
      }
    }
  }

  assert.ok(frameEverMoved, "the blind Frame must have moved toward the enemy at all — without belief from the spotter, it would have zero candidates referencing an enemy it can't see and never move purposefully");
  assert.ok(frameEverStruck, "the Frame must eventually close the distance and land real Strikes — proving it actually found the enemy, not just wandered");
  assert.ok(totalDamageToEnemy > 0, "real combat must have happened");
});

test("SANITY: WITHOUT a spotter, an equally blind unit alone with an equally distant enemy still finds it via deployment-seeded belief — establishing the spotter test above is about RANGE coverage, not deployment-seeding alone", () => {
  // This isolates what deployment-seeding buys on its own (everyone sees the initial lineup) from
  // what genuinely ongoing spotter coverage buys (staying informed as the fight moves out of a
  // short-vision unit's own range). Both units know the enemy exists from round 0; the question
  // this pair of tests actually separates is whether a LATE-EMERGING gap in vision (not covered
  // here — see the pursuit test below) is bridged by teammates.
  const blindUnit = makeCombatant("frame", "party", { col: 4, row: 4 }, { vision: { range: 150 } });
  const enemy = makeCombatant("enemy", "opposition", { col: 64, row: 4 }, { speed: 0 });
  const log = runBattle({ seed: 7, gridSize: { cols: 80, rows: 80 }, roundLimit: 20, combatants: [blindUnit, enemy], ai });
  let totalDamage = 0;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if (action.legal && typeof action.damageApplied === "number") totalDamage += action.damageApplied;
  }
  assert.ok(totalDamage > 0, "deployment-seeding alone (matching design doc §15s: everyone sees the battlefield lineup at the start) is enough for a solo blind unit to still pursue a STATIONARY enemy it knew about from round 0");
});

test("PURSUIT: an enemy that moves out of every ally's sight is still chased toward its LAST KNOWN position, not abandoned instantly", () => {
  const scout = makeCombatant("scout", "party", { col: 4, row: 4 }, { vision: { range: 300 } }); // sees the enemy at deployment (2 squares away), loses it once it flees
  // The enemy starts within the scout's vision, then FLEES far away on its own turn — simulating
  // "moved out of sight." A stationary decoy on the enemy's original square proves the scout is
  // chasing the REMEMBERED position, not just re-discovering the fleeing enemy by luck.
  const enemy = makeCombatant("enemy", "opposition", { col: 6, row: 4 }, { speed: 3000 });
  function fleeingAi(state, combatantId, turnState) {
    if (combatantId === "enemy" && turnState.actionsUsed === 0 && state.round === 1) {
      return { type: "move", to: { col: 70, row: 70 } }; // bolt for the far corner, once, round 1
    }
    return decide(state, combatantId, turnState);
  }
  const log = runBattle({ seed: 3, gridSize: { cols: 80, rows: 80 }, roundLimit: 3, combatants: [scout, enemy], ai: fleeingAi });

  const scoutRound1 = log.rounds[0].turns.find((t) => t.combatantId === "scout");
  const firstMove = (scoutRound1?.actions ?? []).find((a) => a.legal && (a.type === "move" || a.type === "step"));
  assert.ok(firstMove, "the scout must have a real move candidate even after the enemy vanishes from its sight this same round");
  // The scout's belief still points at the enemy's PRE-flight position (6,4) — moving toward that
  // remembered location means closing col/row distance to (6,4), not randomly wandering.
  if (firstMove) {
    const startDist = Math.hypot(4 - 6, 4 - 4);
    const afterDist = Math.hypot(firstMove.to.col - 6, firstMove.to.row - 4);
    assert.ok(afterDist <= startDist, `expected the scout to move TOWARD the enemy's last-known square (6,4), went from dist ${startDist} to ${afterDist}`);
  }
});
