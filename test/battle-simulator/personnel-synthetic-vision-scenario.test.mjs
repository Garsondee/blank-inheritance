/**
 * End-to-end proof that the PERSONNEL-SCALE vision/pathfinding/belief engine works as a WHOLE
 * (design doc §19), not just in isolated unit tests — a real runBattle using the real, unscripted
 * decide() AI is what actually proves a mechanism works together. This is the direct test design
 * doc §19's own plan calls for by name, and it's the whole reason Ingram asked for a real building
 * with rooms and doorways rather than open-field blindness: "test pathfinding, how the AI reacts
 * to being able to see things to attack vs not being able to see anything to attack."
 *
 * The building here is a minimal 2-room layout: a wall along the row-5 boundary spanning every
 * column except col=5 (the doorway) — the same convention already proven in
 * personnel-pathfind.test.mjs's own doorway test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";

function twoRoomWall({ doorCol = 5, cols = 10 } = {}) {
  const walls = [];
  for (let col = 0; col < cols; col++) {
    if (col === doorCol) continue; // the doorway
    walls.push({ c: [col, 5, col + 1, 5], move: 20, sight: 20 });
  }
  return walls;
}

function makeCombatant(id, side, position, overrides = {}) {
  return {
    id, name: id, side, maxHP: 16, currentHP: 16, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Sidearm", strikeType: "ranged", attackBonus: 8, rangeIncrement: 30, traits: [], damage: [{ dice: "1d6", bonus: 2 }] }],
    position,
    ...overrides
  };
}

function ai(state, combatantId, turnState) {
  return decide(state, combatantId, turnState);
}

test("HEADLINE: a pursuer with NO line of sight to the only enemy — a solid wall between two rooms — proposes zero illegal strikes, pathfinds through the one open doorway, and eventually lands real damage", () => {
  const walls = twoRoomWall({ cols: 15 }); // spans the FULL grid width — the doorway is the only way through, not an accident of a narrower wall on a wider grid
  // Pursuer starts in the "north" room, off-axis from the doorway (col 5). Enemy sits in the
  // "south" room, also off-axis, so the straight line between them crosses the SOLID part of the
  // wall, not the gap — genuinely no shot exists at deployment.
  const pursuer = makeCombatant("pursuer", "party", { col: 2, row: 2 });
  const enemy = makeCombatant("enemy", "opposition", { col: 2, row: 8 }, { speed: 0 }); // stays put — isolates the pursuer's own pathfinding behavior

  const log = runBattle({ seed: 11, gridSize: { cols: 15, rows: 12 }, roundLimit: 15, combatants: [pursuer, enemy], ai, walls });

  let sawIllegalAttack = false, sawRealDamage = false, everMoved = false;
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      if (turn.combatantId !== "pursuer") continue;
      for (const action of turn.actions ?? []) {
        if ((action.type === "strike" || action.type === "spellAttack") && !action.legal) sawIllegalAttack = true;
        if (action.legal && typeof action.damageApplied === "number" && action.damageApplied > 0) sawRealDamage = true;
        if (action.legal && (action.type === "move" || action.type === "step")) everMoved = true;
      }
    }
  }

  assert.equal(sawIllegalAttack, false, "the AI must never even PROPOSE a strike the engine has to reject as illegal — legality-first design means the AI discovers illegality via the sandbox before committing, not by trial and error against the live battle");
  assert.ok(everMoved, "the pursuer must have moved at all — with no LOS and no belief-driven destination, it would have nothing to do");
  assert.ok(sawRealDamage, "the pursuer must eventually route through the one open doorway, gain a real sightline, and land real damage — proving pathfinding through a real gap in a wall run actually works end to end");
});

test("PURSUIT: an enemy that retreats out of sight around a corner is still chased toward its LAST KNOWN position, not abandoned instantly", () => {
  // Open room, no walls for this one — isolates belief/pursuit from the pathfinding-through-a-door
  // mechanism already covered above. The enemy starts visible but OUT OF WEAPON RANGE (40ft, beyond
  // the 30ft sidearm) so the scout's best first action is genuinely "move toward it", not "shoot
  // it" — then it bolts far away on round 1.
  const scout = makeCombatant("scout", "party", { col: 2, row: 2 }, { vision: { range: 60 } });
  const enemy = makeCombatant("enemy", "opposition", { col: 10, row: 2 }, { speed: 300 });
  function fleeingAi(state, combatantId, turnState) {
    if (combatantId === "enemy" && turnState.actionsUsed === 0 && state.round === 1) {
      return { type: "move", to: { col: 19, row: 19 } }; // bolt for the far corner, once, round 1
    }
    return decide(state, combatantId, turnState);
  }
  const log = runBattle({ seed: 3, gridSize: { cols: 20, rows: 20 }, roundLimit: 2, combatants: [scout, enemy], ai: fleeingAi });

  const scoutRound1 = log.rounds[0].turns.find((t) => t.combatantId === "scout");
  const firstMove = (scoutRound1?.actions ?? []).find((a) => a.legal && (a.type === "move" || a.type === "step"));
  assert.ok(firstMove, "the scout must have a real move candidate even after the enemy vanishes from sight this same round");
  if (firstMove) {
    // The scout's belief still points at the enemy's PRE-flight position (10,2).
    const startDist = Math.hypot(2 - 10, 2 - 2);
    const afterDist = Math.hypot(firstMove.to.col - 10, firstMove.to.row - 2);
    assert.ok(afterDist <= startDist, `expected the scout to move TOWARD the enemy's last-known square (10,2), went from dist ${startDist} to ${afterDist}`);
  }
});

test("a fully enclosed room (no doorway at all) never produces a phantom engagement — the pursuer moves but never illegally attacks, and the battle times out honestly rather than faking a resolution", () => {
  // Same two rooms, but the doorway is walled off too — genuinely no path exists.
  const walls = twoRoomWall({ doorCol: -1, cols: 15 }); // no col matches -1, so every column gets walled — fully solid, spanning the full grid width
  const pursuer = makeCombatant("pursuer", "party", { col: 2, row: 2 });
  const enemy = makeCombatant("enemy", "opposition", { col: 2, row: 8 }, { speed: 0 });
  const log = runBattle({ seed: 5, gridSize: { cols: 15, rows: 12 }, roundLimit: 6, combatants: [pursuer, enemy], ai, walls });

  let sawIllegalAttack = false, sawAnyDamage = false;
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      for (const action of turn.actions ?? []) {
        if ((action.type === "strike" || action.type === "spellAttack") && !action.legal) sawIllegalAttack = true;
        if (action.legal && typeof action.damageApplied === "number" && action.damageApplied > 0) sawAnyDamage = true;
      }
    }
  }
  assert.equal(sawIllegalAttack, false, "even with genuinely no path, the AI must never propose an illegal attack");
  assert.equal(sawAnyDamage, false, "with no path between the two fully sealed rooms, no real combat should ever occur");
  assert.equal(log.outcome.result, "timeout", "a genuinely unreachable enemy must end in an honest timeout, not a fabricated victory/defeat");
});
