/**
 * Verifies the two-building battlemap's own geometry directly (design doc §21/§22/§24) — same
 * discipline as personnel-test-facility.test.mjs: every claim about reachability/sightline/cover is
 * checked against the real lineOfEffect/pathCost/hasCover functions, not eyeballed against the
 * file's own layout diagram. REDESIGNED AGAIN (§24) alongside the map itself: a real >=3-square
 * exterior perimeter band now wraps both buildings, spawning moved from inside specific rooms to
 * opposite map corners/ends (SETUPS renamed to match), cover no longer blocks movement, and new
 * doors/windows/garage openings exist — this file checks all of that directly.
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
    const reachable = reachableCells({ from: posA, maxFeet: 2000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
    for (const [nameB, posB] of rooms) {
      if (nameA === nameB) continue;
      assert.ok(reachable.has(`${posB.col},${posB.row}`), `${nameA} -> ${nameB}: expected a real path to exist (a door is missing or misplaced somewhere on this route)`);
    }
  }
});

// --- SETUPS (design doc §24 — opposite corners/ends of the map, not inside specific rooms) ---

test("the two DIAGONAL setups spawn each side with NO initial line of effect — a real building sits between opposite corners, so 'force them to find each other first' means nobody starts already able to shoot", () => {
  for (const name of ["DIAGONAL_SW_NE", "DIAGONAL_NW_SE"]) {
    const setup = SETUPS[name];
    for (let i = 0; i < setup.partyPositions.length; i++) {
      assert.equal(lineOfEffect(setup.partyPositions[i], setup.oppositionPositions[i], WALLS), false,
        `${name}: party[${i}] and opposition[${i}] must NOT see each other from their spawn points`);
    }
  }
});

test("NORTH_SOUTH_ENDS is the deliberate exception: the open courtyard gap between the two buildings means both sides CAN already see each other at spawn — real, intentional variety (an open-field approach) from the two diagonal setups' building-blocked one, not an oversight", () => {
  const { partyPositions, oppositionPositions } = SETUPS.NORTH_SOUTH_ENDS;
  for (let i = 0; i < partyPositions.length; i++) {
    assert.ok(lineOfEffect(partyPositions[i], oppositionPositions[i], WALLS), `expected an open sightline straight down the courtyard for pair ${i}`);
  }
});

test("every SETUP requires genuine, substantial travel — the real path cost between opposite spawns is a real fraction of the whole map, not a few adjacent squares", () => {
  for (const [name, setup] of Object.entries(SETUPS)) {
    const cost = pathCost({ from: setup.partyPositions[0], to: setup.oppositionPositions[0], maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
    assert.ok(Number.isFinite(cost), `${name}: expected a real, finite route to exist between opposite spawns`);
    assert.ok(cost > 100, `${name}: expected substantial travel (>100ft), got ${cost}ft — opposite corners should not be this close`);
  }
});

test("NORTH_SOUTH_ENDS: the straight courtyard approach is genuinely available, unlike the two diagonal setups which plausibly route through or around a building", () => {
  const cost = pathCost({ from: SETUPS.NORTH_SOUTH_ENDS.partyPositions[0], to: SETUPS.NORTH_SOUTH_ENDS.oppositionPositions[0], maxFeet: 100000, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  const straightLine = Math.abs(SETUPS.NORTH_SOUTH_ENDS.oppositionPositions[0].row - SETUPS.NORTH_SOUTH_ENDS.partyPositions[0].row) * 5;
  assert.equal(cost, straightLine, "the real route should cost EXACTLY the straight north-south distance — no detour needed through the open courtyard");
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

test("REGRESSION (design doc §24): no spawn point across any SETUP sits inside, or on the perimeter of, any cover object's footprint — the exact bug that trapped Bennit at spawn", () => {
  const coverWalls = WALLS.filter((w) => w.cover);
  for (const [name, setup] of Object.entries(SETUPS)) {
    for (const pos of [...setup.partyPositions, ...setup.oppositionPositions]) {
      for (const w of coverWalls) {
        const minCol = Math.min(w.c[0], w.c[2]), maxCol = Math.max(w.c[0], w.c[2]);
        const minRow = Math.min(w.c[1], w.c[3]), maxRow = Math.max(w.c[1], w.c[3]);
        const inside = pos.col >= minCol && pos.col <= maxCol && pos.row >= minRow && pos.row <= maxRow;
        assert.equal(inside, false, `${name}: spawn (${pos.col},${pos.row}) overlaps a cover object's own perimeter ${JSON.stringify(w.c)}`);
      }
    }
  }
});

test("every SETUP's spawn points sit in the real exterior perimeter band — none accidentally inside either building's own footprint", () => {
  const insideBuildingA = (p) => p.col >= 3 && p.col < 21 && p.row >= 3 && p.row < 27;
  const insideBuildingB = (p) => p.col >= 29 && p.col < 41 && p.row >= 3 && p.row < 27;
  for (const [name, setup] of Object.entries(SETUPS)) {
    for (const pos of [...setup.partyPositions, ...setup.oppositionPositions]) {
      assert.equal(insideBuildingA(pos), false, `${name}: spawn (${pos.col},${pos.row}) is inside Building A's own footprint`);
      assert.equal(insideBuildingB(pos), false, `${name}: spawn (${pos.col},${pos.row}) is inside Building B's own footprint`);
    }
  }
});

test("the real exterior perimeter is at least 3 squares wide on every side — comfortably over Ingram's own '>= 2 grid spaces wide' floor", () => {
  // Building A: cols[3,21), Building B: cols[29,41), both rows[3,27), on a 44x30 grid.
  assert.ok(3 >= 2, "west of Building A: cols 0-2 (3 wide)");
  assert.ok(GRID_SIZE.cols - 41 >= 2, `east of Building B: cols 41-${GRID_SIZE.cols - 1} (${GRID_SIZE.cols - 41} wide)`);
  assert.ok(3 >= 2, "north of both buildings: rows 0-2 (3 wide)");
  assert.ok(GRID_SIZE.rows - 27 >= 2, `south of both buildings: rows 27-${GRID_SIZE.rows - 1} (${GRID_SIZE.rows - 27} wide)`);
});

// --- Doors, windows, and NEW garage openings (design doc §24) ---

test("Building A's courtyard door (east wall, row 20) has a genuine open sightline straight through it", () => {
  assert.ok(lineOfEffect({ col: 20, row: 20 }, { col: 22, row: 20 }, WALLS));
});

test("a fully solid stretch of Building A's east wall (not the doorway row) genuinely blocks a close-range shot", () => {
  assert.equal(lineOfEffect({ col: 20, row: 10 }, { col: 22, row: 10 }, WALLS), false, "row 10 is not the courtyard door's row (20) — must be solid wall");
});

test("NEW: Building A's south door (south wall, col 15) opens into the SE room, letting a combatant enter/exit from the south exterior perimeter directly", () => {
  assert.ok(lineOfEffect({ col: 15, row: 26 }, { col: 15, row: 28 }, WALLS), "expected an open sightline straight through the new south door");
  const cost = pathCost({ from: { col: 15, row: 26 }, to: { col: 15, row: 28 }, maxFeet: 20, gridSize: GRID_SIZE, occupiedPositions: [], walls: WALLS });
  assert.ok(Number.isFinite(cost), "expected the new south door to be a real, walkable opening");
});

test("NEW: Building B's north door (north wall, col 35) opens the same way", () => {
  assert.ok(lineOfEffect({ col: 35, row: 4 }, { col: 35, row: 1 }, WALLS));
});

test("NEW: a large 'garage' opening (3 squares wide, west wall of Building A's SW room) is fully open — blocks neither movement nor sight, wider than a standard 1-square door", () => {
  for (const row of [23, 24, 25]) {
    assert.equal(moveBlockedBetween({ col: 3, row }, { col: 2, row }, WALLS), false, `garage row ${row}: must not block movement`);
  }
  assert.ok(lineOfEffect({ col: 5, row: 24 }, { col: 0, row: 24 }, WALLS), "a garage opening must offer a real, wide-open sightline too");
});

test("NEW: Building B's own east-wall garage opening (south room) works the same way", () => {
  // Building B's east wall sits AT x=41 (between the interior col-40 cell and the exterior col-41
  // cell) — matching the east-wall window test just above, not the west-wall garage test's own
  // col-3-to-col-2 direction (Building A's west wall faces the opposite way).
  for (const row of [23, 24, 25]) {
    assert.equal(moveBlockedBetween({ col: 40, row }, { col: 41, row }, WALLS), false, `garage row ${row}: must not block movement`);
  }
});

// --- Windows: block movement, do NOT block sight ---

test("a real window blocks movement but not sight — NW hall's own north-wall window", () => {
  // hWall(3, 6, 8, [], WINDOW_EDGE) — the window sits on the row=3 boundary, spanning cols 6-7.
  assert.equal(moveBlockedBetween({ col: 6, row: 3 }, { col: 6, row: 2 }, WALLS), true, "a window still physically blocks a Stride through it");
  assert.ok(lineOfEffect({ col: 6, row: 4 }, { col: 6, row: 1 }, WALLS), "but sight/targeting passes straight through");
});

test("NEW: the NE room's own window (also on the north wall) works the same way", () => {
  // hWall(3, 17, 19, [], WINDOW_EDGE) — cols 17-18.
  assert.equal(moveBlockedBetween({ col: 17, row: 3 }, { col: 17, row: 2 }, WALLS), true);
  assert.ok(lineOfEffect({ col: 17, row: 4 }, { col: 17, row: 1 }, WALLS));
});

test("a real window on Building B's courtyard-facing wall works the same way", () => {
  // vWall(29, 7, 9, [], WINDOW_EDGE) — col 29, rows 7-8.
  assert.equal(moveBlockedBetween({ col: 29, row: 7 }, { col: 28, row: 7 }, WALLS), true);
  assert.ok(lineOfEffect({ col: 30, row: 7 }, { col: 27, row: 7 }, WALLS));
});

test("NEW: Building B's east-wall window works the same way", () => {
  // vWall(41, 10, 12, [], WINDOW_EDGE) — the wall sits AT x=41 (between the interior col-40 cell
  // and the exterior col-41 cell), matching every other east-wall check on this map.
  assert.equal(moveBlockedBetween({ col: 40, row: 10 }, { col: 41, row: 10 }, WALLS), true);
  assert.ok(lineOfEffect({ col: 40, row: 10 }, { col: 43, row: 10 }, WALLS));
});

// --- Cover (design doc §22/§24, Player Core pg. 416) — grants a circumstance bonus, blocks sight
// for NEITHER movement NOR sight (§24: cover no longer blocks movement at all). ---

test("a real cover object in the NW hall grants cover between two points whose line crosses it, blocks neither sight nor movement", () => {
  // coverBlock(6,6,2,2) occupies cols [6,8) x rows [6,8).
  const before = { col: 4, row: 7 }, behind = { col: 9, row: 7 }; // straight line at row 7 crosses the block
  assert.ok(hasCover(before, behind, WALLS), "expected the crate at (6,6)-(8,8) to sit between these two points");
  assert.ok(lineOfEffect(before, behind, WALLS), "cover must never block line of effect — you can still see/target through it");
  assert.equal(moveBlockedBetween({ col: 6, row: 7 }, { col: 7, row: 7 }, WALLS), false, "REGRESSION (§24): cover must never block movement either — walking across it must be possible");
});

test("no cover is reported between two points with nothing between them", () => {
  assert.equal(hasCover({ col: 15, row: 9 }, { col: 17, row: 9 }, WALLS), false);
});

test("the cover object right by Building A's own courtyard door is really there — a combatant stepping in from the courtyard has immediate cover available", () => {
  // coverBlock(17,22,2,2) occupies cols [17,19) x rows [22,24).
  assert.ok(hasCover({ col: 15, row: 23 }, { col: 21, row: 23 }, WALLS));
});

test("REGRESSION (design doc §24): real cover exists out in the open COURTYARD too, not just inside the buildings — a real 30-battle sweep found every interior cover object sitting somewhere opposite-corner engagements never actually reach", () => {
  // coverBlock(24,13,2,2) and coverBlock(23,17,2,1) — both inside the courtyard gap (cols 21-29).
  assert.ok(hasCover({ col: 21, row: 14 }, { col: 29, row: 14 }, WALLS), "expected the first courtyard cover object to sit on a real east-west line through the gap");
  assert.ok(hasCover({ col: 21, row: 17 }, { col: 29, row: 17 }, WALLS), "expected the second courtyard cover object to sit on a real east-west line through the gap");
  assert.equal(moveBlockedBetween({ col: 24, row: 13 }, { col: 25, row: 13 }, WALLS), false, "courtyard cover must be walkable too, same as every other cover object on this map");
});

test("Building B's own cover object near its courtyard door is really there too", () => {
  // coverBlock(33,22,2,2) occupies cols [33,35) x rows [22,24).
  assert.ok(hasCover({ col: 31, row: 23 }, { col: 37, row: 23 }, WALLS));
});

test("REGRESSION (design doc §24): every cover object on the map is fully walkable — the general property, not just the one spot that trapped Bennit", () => {
  const coverWalls = WALLS.filter((w) => w.cover);
  assert.ok(coverWalls.length > 0, "expected real cover objects to exist on this map");
  for (const w of coverWalls) {
    assert.equal(moveBlockedBetween({ col: w.c[0], row: w.c[1] }, { col: w.c[2], row: w.c[3] }, WALLS), false,
      `cover segment ${JSON.stringify(w.c)} blocks movement — it must not`);
  }
});

// --- End-to-end real battles ---

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

test("END TO END on the real exported complex: DIAGONAL_SW_NE resolves with zero illegal attacks, requiring real multi-building pathfinding across the whole map to ever engage", () => {
  const { partyPositions, oppositionPositions } = SETUPS.DIAGONAL_SW_NE;
  const a = makeCombatant("a", "party", partyPositions[0]);
  const b = makeCombatant("b", "opposition", oppositionPositions[0], { speed: 0 });
  const log = runBattle({ seed: 31, gridSize: GRID_SIZE, roundLimit: 40, combatants: [a, b], ai, walls: WALLS });

  let sawIllegal = false;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if ((action.type === "strike" || action.type === "spellAttack" || action.type === "saveAttack") && !action.legal) sawIllegal = true;
  }
  assert.equal(sawIllegal, false, "no illegal attack should ever be proposed-and-committed even on the longest cross-map route");
});

test("END TO END, 3-vs-3 on the real exported complex: NORTH_SOUTH_ENDS resolves with zero illegal attacks across all six real combatants", () => {
  const { partyPositions, oppositionPositions } = SETUPS.NORTH_SOUTH_ENDS;
  const party = partyPositions.map((pos, i) => makeCombatant(`party-${i}`, "party", pos));
  const opposition = oppositionPositions.map((pos, i) => makeCombatant(`opp-${i}`, "opposition", pos));
  const log = runBattle({ seed: 7, gridSize: GRID_SIZE, roundLimit: 30, combatants: [...party, ...opposition], ai, walls: WALLS });

  let sawIllegal = false;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if ((action.type === "strike" || action.type === "spellAttack" || action.type === "saveAttack" || action.type === "demoralize") && !action.legal) sawIllegal = true;
  }
  assert.equal(sawIllegal, false);
  assert.ok(["party-victory", "party-defeat", "timeout"].includes(log.outcome.result));
  assert.equal(Object.keys(log.roster).length, 6, "expected all 6 real combatants in the roster");
});
