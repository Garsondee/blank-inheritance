/**
 * Verifies the bigger, two-building battlemap's own geometry directly (design doc §21) — same
 * discipline as personnel-test-facility.test.mjs: every claim about reachability/sightline is
 * checked against the real lineOfEffect/pathCost functions, not eyeballed against the file's own
 * layout diagram. The original map was caught with a real coordinate bug this same way (two
 * "center" points sitting exactly on a doorway's row); this file exists specifically so a bigger,
 * hand-authored 12-room layout gets the same scrutiny, not less.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GRID_SIZE, WALLS, POINTS, SETUPS } from "../../tools/battle-simulator/data/personnel-test-complex.mjs";
import { lineOfEffect } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";
import { pathCost, reachableCells } from "../../tools/battle-simulator/personnel-engine/world/pathfind.mjs";
import { isInBounds } from "../../tools/battle-simulator/personnel-engine/grid.mjs";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";

test("every named point is in-bounds on the map's own 36x24 grid", () => {
  for (const [name, pos] of Object.entries(POINTS)) {
    assert.ok(isInBounds(pos, GRID_SIZE), `${name} (${pos.col},${pos.row}) is out of bounds for a ${GRID_SIZE.cols}x${GRID_SIZE.rows} grid`);
  }
});

test("CONNECTIVITY: every one of the 12 room-center points can reach every other one via a real path — the hand-authored 6-door-per-building layout is actually fully connected, not just eyeballed as such", () => {
  // ONE real Dijkstra flood per room (12 total), not one per PAIR (132) — reachableCells already
  // returns the full reachable set from a single source in one pass, so checking all 11 other rooms
  // against that one result is exactly as rigorous as 11 separate pathCost calls would be, just
  // ~11x cheaper. maxFeet 1000 (200 squares) comfortably covers this map's longest real route.
  const rooms = Object.entries(POINTS).filter(([name]) => name.match(/^[AB]_(NW|NE|CW|CE|SW|SE)$/));
  assert.equal(rooms.length, 12, "expected exactly the 12 real room-center points, not an accidental subset");
  for (const [nameA, posA] of rooms) {
    const reachable = reachableCells({ from: posA, maxFeet: 1000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
    for (const [nameB, posB] of rooms) {
      if (nameA === nameB) continue;
      assert.ok(reachable.has(`${posB.col},${posB.row}`), `${nameA} -> ${nameB}: expected a real path to exist (a door is missing or misplaced somewhere on this route)`);
    }
  }
});

test("SAME_ROOM setup: real, unobstructed line of effect across the open courtyard, through both external doors", () => {
  const { partyPositions, oppositionPositions } = SETUPS.SAME_ROOM;
  assert.ok(lineOfEffect(partyPositions[0], oppositionPositions[0], WALLS), "A_CE_NEAR_DOOR and B_CW_NEAR_DOOR must see each other straight through both open doorways");
});

test("SAME_BUILDING_FAR_ROOMS setup: NO initial line of effect (opposite corners of one building), but a real internal path exists", () => {
  const { partyPositions, oppositionPositions } = SETUPS.SAME_BUILDING_FAR_ROOMS;
  assert.equal(lineOfEffect(partyPositions[0], oppositionPositions[0], WALLS), false);
  const cost = pathCost({ from: partyPositions[0], to: oppositionPositions[0], maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  assert.ok(Number.isFinite(cost));
});

test("ACROSS_THE_COMPLEX setup: NO initial line of effect, and the real path is genuinely the longest of the three setups (crosses an entire building plus the courtyard plus into the second building)", () => {
  const { partyPositions, oppositionPositions } = SETUPS.ACROSS_THE_COMPLEX;
  assert.equal(lineOfEffect(partyPositions[0], oppositionPositions[0], WALLS), false);
  const acrossCost = pathCost({ from: partyPositions[0], to: oppositionPositions[0], maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  const sameBuildingCost = pathCost({ from: SETUPS.SAME_BUILDING_FAR_ROOMS.partyPositions[0], to: SETUPS.SAME_BUILDING_FAR_ROOMS.oppositionPositions[0], maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  assert.ok(Number.isFinite(acrossCost));
  assert.ok(acrossCost > sameBuildingCost, `expected ACROSS_THE_COMPLEX (${acrossCost}ft) to be a longer real route than SAME_BUILDING_FAR_ROOMS (${sameBuildingCost}ft)`);
});

test("the external doorways themselves have a genuine open sightline straight through them", () => {
  // Building A's external door sits on its east wall (col 16) at row 11; standing just inside vs.
  // just outside it must see straight through, exactly like the smaller map's own doorway test.
  assert.ok(lineOfEffect({ col: 15, row: 11 }, { col: 17, row: 11 }, WALLS));
});

test("a fully solid stretch of a building's perimeter (not a doorway row) genuinely blocks a close-range shot", () => {
  assert.equal(lineOfEffect({ col: 15, row: 5 }, { col: 17, row: 5 }, WALLS), false, "row 5 is not the external door's row (11) — must be solid wall");
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

test("END TO END on the real exported complex: ACROSS_THE_COMPLEX resolves with zero illegal attacks, requiring real multi-building pathfinding to ever engage", () => {
  const { partyPositions, oppositionPositions } = SETUPS.ACROSS_THE_COMPLEX;
  const a = makeCombatant("a", "party", partyPositions[0]);
  const b = makeCombatant("b", "opposition", oppositionPositions[0], { speed: 0 });
  const log = runBattle({ seed: 31, gridSize: GRID_SIZE, roundLimit: 30, combatants: [a, b], ai, walls: WALLS });

  let sawIllegal = false;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if ((action.type === "strike" || action.type === "spellAttack" || action.type === "saveAttack") && !action.legal) sawIllegal = true;
  }
  assert.equal(sawIllegal, false, "no illegal attack should ever be proposed-and-committed even on the longest cross-complex route");
});

test("every SETUP's second (index-1) spawn point is a real, in-bounds, distinct square from its own first spawn point — the 2-vs-2 expansion's own offsets weren't just eyeballed", () => {
  for (const [name, setup] of Object.entries(SETUPS)) {
    for (const side of ["partyPositions", "oppositionPositions"]) {
      const [first, second] = setup[side];
      assert.ok(isInBounds(second, GRID_SIZE), `${name}.${side}[1] (${second.col},${second.row}) is out of bounds`);
      assert.notDeepEqual(second, first, `${name}.${side}: the second spawn point must not coincide with the first`);
    }
  }
});

test("END TO END, 2-vs-2 on the real exported complex: SAME_ROOM resolves with zero illegal attacks across all four real combatants", () => {
  const { partyPositions, oppositionPositions } = SETUPS.SAME_ROOM;
  const party = partyPositions.map((pos, i) => makeCombatant(`party-${i}`, "party", pos));
  const opposition = oppositionPositions.map((pos, i) => makeCombatant(`opp-${i}`, "opposition", pos));
  const log = runBattle({ seed: 7, gridSize: GRID_SIZE, roundLimit: 20, combatants: [...party, ...opposition], ai, walls: WALLS });

  let sawIllegal = false;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if ((action.type === "strike" || action.type === "spellAttack" || action.type === "saveAttack" || action.type === "demoralize") && !action.legal) sawIllegal = true;
  }
  assert.equal(sawIllegal, false);
  assert.ok(["party-victory", "party-defeat", "timeout"].includes(log.outcome.result));
});
