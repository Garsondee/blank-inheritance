/**
 * Verifies the Phase 1b synthetic battlemap's own geometry directly (design doc §19) — every claim
 * `data/personnel-test-facility.mjs`'s comments make about which setups have/lack an initial
 * sightline is checked here against the real lineOfEffect/pathCost functions, not just eyeballed
 * against the layout diagram. Also runs a real end-to-end battle on the actual exported map (not a
 * test-local stand-in), proving the Phase 1b artifact itself works, not just the general mechanism
 * personnel-synthetic-vision-scenario.test.mjs already proved on an ad hoc 2-room fixture.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GRID_SIZE, WALLS, POINTS, SETUPS } from "../../tools/battle-simulator/data/personnel-test-facility.mjs";
import { lineOfEffect } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";
import { pathCost } from "../../tools/battle-simulator/personnel-engine/world/pathfind.mjs";
import { isInBounds } from "../../tools/battle-simulator/personnel-engine/grid.mjs";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";

test("every named point is in-bounds on the map's own grid", () => {
  for (const [name, pos] of Object.entries(POINTS)) {
    assert.ok(isInBounds(pos, GRID_SIZE), `${name} (${pos.col},${pos.row}) is out of bounds for a ${GRID_SIZE.cols}x${GRID_SIZE.rows} grid`);
  }
});

test("SAME_ROOM setup: attacker and defender have real, unobstructed line of effect", () => {
  const { attacker, defender } = SETUPS.SAME_ROOM;
  assert.ok(lineOfEffect(attacker, defender, WALLS), "SAME_ROOM must start with an open sightline — both points sit in the same open room");
});

test("ADJACENT_ROOMS setup: NO initial line of effect (the wall is genuinely in the way), but a real path exists through the doorway", () => {
  const { attacker, defender } = SETUPS.ADJACENT_ROOMS;
  assert.equal(lineOfEffect(attacker, defender, WALLS), false, "ADJACENT_ROOMS must start BLOCKED — this is the setup that specifically exercises 'wall in the way, doorway nearby'");
  const cost = pathCost({ from: attacker, to: defender, maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  assert.ok(Number.isFinite(cost), "a real path through the A<->B doorway must exist even though the direct line is blocked");
});

test("FAR_ROOMS setup: NO initial line of effect, and a real path exists but must route through BOTH doorways", () => {
  const { attacker, defender } = SETUPS.FAR_ROOMS;
  assert.equal(lineOfEffect(attacker, defender, WALLS), false, "FAR_ROOMS must start BLOCKED — two full rooms apart");
  const directDistance = Math.hypot(defender.col - attacker.col, defender.row - attacker.row);
  const cost = pathCost({ from: attacker, to: defender, maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  assert.ok(Number.isFinite(cost), "a real path from Room A to Room C, through both doorways, must exist");
  assert.ok(cost > directDistance * 5, `expected a real detour through two doorways (got ${cost}ft path vs ${directDistance.toFixed(1)} squares direct) — too cheap a route suggests the walls aren't really blocking the direct path`);
});

test("the two doorways themselves have a genuine open sightline straight through them (the 'engagement through an open door' case)", () => {
  assert.ok(lineOfEffect(POINTS.ROOM_A_NEAR_DOOR, POINTS.ROOM_B_NEAR_DOOR_A, WALLS), "standing on either side of the A<->B doorway must see straight through it");
});

test("a fully solid stretch of the dividing wall (NOT the doorway row) genuinely blocks a close-range shot — the wall is real, not a formality", () => {
  // Both at row 6 (a walled row, not the door row 3) on opposite sides of the A<->B wall.
  assert.equal(lineOfEffect({ col: 5, row: 6 }, { col: 7, row: 6 }, WALLS), false);
});

function makeCombatant(id, side, position, overrides = {}) {
  return {
    id, name: id, side, maxHP: 16, currentHP: 16, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Sidearm", strikeType: "ranged", attackBonus: 8, rangeIncrement: 30, traits: [], damage: [{ dice: "1d6", bonus: 2 }] }],
    position,
    ...overrides
  };
}
function ai(state, combatantId, turnState) { return decide(state, combatantId, turnState); }

test("END TO END on the real exported map: ADJACENT_ROOMS produces zero illegal attacks and real eventual engagement", () => {
  const { attacker, defender } = SETUPS.ADJACENT_ROOMS;
  const a = makeCombatant("a", "party", attacker);
  const b = makeCombatant("b", "opposition", defender, { speed: 0 });
  const log = runBattle({ seed: 21, gridSize: GRID_SIZE, roundLimit: 15, combatants: [a, b], ai, walls: WALLS });

  let sawIllegal = false, sawDamage = false;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if ((action.type === "strike" || action.type === "spellAttack") && !action.legal) sawIllegal = true;
    if (action.legal && typeof action.damageApplied === "number" && action.damageApplied > 0) sawDamage = true;
  }
  assert.equal(sawIllegal, false, "no illegal attack should ever be proposed-and-committed on the real map");
  assert.ok(sawDamage, "the two combatants must eventually find each other through the real doorway and actually fight");
});

test("END TO END on the real exported map: FAR_ROOMS still resolves with zero illegal attacks (routing through two real doorways)", () => {
  const { attacker, defender } = SETUPS.FAR_ROOMS;
  const a = makeCombatant("a", "party", attacker);
  const b = makeCombatant("b", "opposition", defender, { speed: 0 });
  const log = runBattle({ seed: 22, gridSize: GRID_SIZE, roundLimit: 20, combatants: [a, b], ai, walls: WALLS });

  let sawIllegal = false;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if ((action.type === "strike" || action.type === "spellAttack") && !action.legal) sawIllegal = true;
  }
  assert.equal(sawIllegal, false, "no illegal attack should ever be proposed-and-committed even on the longest, two-doorway route");
});
