/**
 * Verifies the two-building battlemap's own geometry directly (design doc §21/§22) — same
 * discipline as personnel-test-facility.test.mjs: every claim about reachability/sightline/cover is
 * checked against the real lineOfEffect/pathCost/hasCover functions, not eyeballed against the
 * file's own layout diagram. REDESIGNED (§22) alongside the map itself — asymmetric rooms, real
 * windows, real cover objects — so this file checks the new properties directly, not just carries
 * the old room-grid assumptions forward.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { GRID_SIZE, WALLS, POINTS, SETUPS } from "../../tools/battle-simulator/data/personnel-test-complex.mjs";
import { lineOfEffect, hasCover, moveBlockedBetween } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";
import { pathCost, reachableCells } from "../../tools/battle-simulator/personnel-engine/world/pathfind.mjs";
import { isInBounds } from "../../tools/battle-simulator/personnel-engine/grid.mjs";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";

test("every named point is in-bounds on the map's own grid", () => {
  for (const [name, pos] of Object.entries(POINTS)) {
    assert.ok(isInBounds(pos, GRID_SIZE), `${name} (${pos.col},${pos.row}) is out of bounds for a ${GRID_SIZE.cols}x${GRID_SIZE.rows} grid`);
  }
});

test("CONNECTIVITY: every one of the room/area anchor points can reach every other one via a real path — the hand-authored asymmetric layout is actually fully connected, not just eyeballed as such", () => {
  const rooms = Object.entries(POINTS).filter(([name]) => name.match(/^(A|B)_(NW|NE|SW|SE|NORTH|SOUTH)$/));
  assert.equal(rooms.length, 6, "expected exactly the 6 real room anchor points (4 in Building A, 2 in Building B), not an accidental subset");
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
  assert.ok(lineOfEffect(partyPositions[0], oppositionPositions[0], WALLS), "A_SE_NEAR_DOOR and B_SOUTH_NEAR_DOOR must see each other straight through both open doorways");
});

test("SAME_BUILDING_FAR_ROOMS setup: NO initial line of effect (opposite corners of Building A), but a real internal path exists", () => {
  const { partyPositions, oppositionPositions } = SETUPS.SAME_BUILDING_FAR_ROOMS;
  assert.equal(lineOfEffect(partyPositions[0], oppositionPositions[0], WALLS), false);
  const cost = pathCost({ from: partyPositions[0], to: oppositionPositions[0], maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  assert.ok(Number.isFinite(cost));
});

test("ACROSS_THE_COMPLEX setup: NO initial line of effect, and the real path is genuinely the longest of the three setups", () => {
  const { partyPositions, oppositionPositions } = SETUPS.ACROSS_THE_COMPLEX;
  assert.equal(lineOfEffect(partyPositions[0], oppositionPositions[0], WALLS), false);
  const acrossCost = pathCost({ from: partyPositions[0], to: oppositionPositions[0], maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  const sameBuildingCost = pathCost({ from: SETUPS.SAME_BUILDING_FAR_ROOMS.partyPositions[0], to: SETUPS.SAME_BUILDING_FAR_ROOMS.oppositionPositions[0], maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  assert.ok(Number.isFinite(acrossCost));
  assert.ok(acrossCost > sameBuildingCost, `expected ACROSS_THE_COMPLEX (${acrossCost}ft) to be a longer real route than SAME_BUILDING_FAR_ROOMS (${sameBuildingCost}ft)`);
});

test("the external doorways themselves have a genuine open sightline straight through them", () => {
  // Building A's external door sits on its east wall (col 18) at row 17; standing just inside vs.
  // just outside it must see straight through.
  assert.ok(lineOfEffect({ col: 17, row: 17 }, { col: 19, row: 17 }, WALLS));
});

test("a fully solid stretch of a building's perimeter (not a doorway row) genuinely blocks a close-range shot", () => {
  assert.equal(lineOfEffect({ col: 17, row: 5 }, { col: 19, row: 5 }, WALLS), false, "row 5 is not the external door's row (17) — must be solid wall");
});

// --- Windows (design doc §22): block movement, do NOT block sight ---

test("a real window blocks movement but not sight — NW hall's own north-wall window", () => {
  // The window run sits on row 0 between cols 3 and 5 (hWall(0,3,5,[],WINDOW_EDGE)).
  assert.equal(moveBlockedBetween({ col: 3, row: 0 }, { col: 3, row: -1 }, WALLS), true, "a window still physically blocks a Stride through it");
  assert.ok(lineOfEffect({ col: 3, row: 1 }, { col: 3, row: -1 }, WALLS), "but sight/targeting passes straight through");
});

test("a real window on Building B's courtyard-facing wall works the same way", () => {
  assert.equal(moveBlockedBetween({ col: 26, row: 4 }, { col: 25, row: 4 }, WALLS), true);
  assert.ok(lineOfEffect({ col: 27, row: 4 }, { col: 24, row: 4 }, WALLS));
});

// --- Cover (design doc §22, Player Core pg. 416) ---

test("a real cover object in the NW hall grants cover between two points whose line crosses it, and does not block sight", () => {
  // coverBlock(3,3,2,2) occupies cols [3,5) x rows [3,5).
  const before = { col: 1, row: 4 }, behind = { col: 6, row: 4 }; // straight line at row 4 crosses the block
  assert.ok(hasCover(before, behind, WALLS), "expected the crate at (3,3)-(5,5) to sit between these two points");
  assert.ok(lineOfEffect(before, behind, WALLS), "cover must never block line of effect — you can still see/target through it");
});

test("no cover is reported between two points with nothing between them", () => {
  assert.equal(hasCover({ col: 12, row: 3 }, { col: 14, row: 3 }, WALLS), false);
});

test("the cover object right by Building A's own external door is really there — a combatant stepping in from the courtyard has immediate cover available", () => {
  // coverBlock(14,19,2,2) occupies cols [14,16) x rows [19,21), close to the door at (18,17).
  assert.ok(hasCover({ col: 12, row: 20 }, { col: 17, row: 20 }, WALLS));
});

test("Building B's own cover object near its external door is really there too", () => {
  // coverBlock(30,19,2,2) occupies cols [30,32) x rows [19,21).
  assert.ok(hasCover({ col: 28, row: 20 }, { col: 34, row: 20 }, WALLS));
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

test("every SETUP defines exactly THREE spawn points per side (design doc §22's 3v3 expansion), all in-bounds and mutually distinct", () => {
  for (const [name, setup] of Object.entries(SETUPS)) {
    for (const side of ["partyPositions", "oppositionPositions"]) {
      const positions = setup[side];
      assert.equal(positions.length, 3, `${name}.${side}: expected exactly 3 spawn points for a real 3v3`);
      for (const pos of positions) assert.ok(isInBounds(pos, GRID_SIZE), `${name}.${side}: (${pos.col},${pos.row}) is out of bounds`);
      const keys = positions.map((p) => `${p.col},${p.row}`);
      assert.equal(new Set(keys).size, keys.length, `${name}.${side}: all 3 spawn points must be mutually distinct squares, got ${keys.join(" | ")}`);
    }
  }
});

test("END TO END, 3-vs-3 on the real exported complex: SAME_ROOM resolves with zero illegal attacks across all six real combatants", () => {
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
  assert.equal(Object.keys(log.roster).length, 6, "expected all 6 real combatants in the roster");
});
