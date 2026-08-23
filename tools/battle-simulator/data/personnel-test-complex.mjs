/**
 * A larger, more complex synthetic battlemap for the PERSONNEL-SCALE engine (design doc §21) —
 * TWO buildings (6 rooms each, 12 rooms total) separated by an open courtyard, real 5ft grid,
 * Foundry Wall schema throughout. Same "TEST FIXTURE, not derived from the campaign map" status as
 * `data/personnel-test-facility.mjs` (the original, smaller 3-room map — kept as-is, not replaced;
 * this is a second, bigger map for testing multi-combatant fights at real distance, not a
 * replacement for the simpler single-matchup validation the original still serves well).
 *
 * Direct instruction behind this: "the best version was the one where the two sides started
 * further away from each other and with line of sight blocking things... make the map much
 * larger, more buildings, more walls, more rooms, more doorways."
 *
 * Layout (cols 0-35, rows 0-23):
 *
 *   Building A (West, cols 0-15)       Courtyard        Building B (East, cols 20-35)
 *   +--------+--------+                (cols 16-19,      +--------+--------+
 *   |   NW   |   NE   |                 open ground,     |   NW   |   NE   |
 *   +---.----+---.----+                 no walls)        +---.----+---.----+
 *   |   CW   |   CE   |.<-- external door (east wall)     .-->|   CW   |   CE   |  <-- external door (west wall)
 *   +---.----+---.----+                                  +---.----+---.----+
 *   |   SW   |   SE   |                                  |   SW   |   SE   |
 *   +--------+--------+                                  +--------+--------+
 *
 * Each building: a 2(cols)x3(rows) grid of 8x8 rooms, fully enclosed perimeter except one external
 * doorway (Building A's faces east into the courtyard; Building B's faces west, mirrored), and six
 * internal doorways connecting every room to at least one neighbor (verified connected by
 * `test/battle-simulator/personnel-test-complex.test.mjs`'s own real pathfinding checks, not
 * eyeballed against this diagram — the same discipline that caught a real coordinate bug building
 * the original, smaller map).
 *
 * Every wall run is built as a loop of UNIT-LENGTH edges via the wallRun()/hWall()/vWall() helpers
 * below — never a single long multi-cell segment — for the same reason documented in
 * `data/personnel-test-facility.mjs`'s own header: moveBlockedBetween matches a wall's `c` array
 * against one specific unit edge via exact endpoint equality, so a long segment would silently fail
 * to block movement almost everywhere along its own length even though it blocks sight correctly.
 */

const EDGE = { move: 20, sight: 20 };

/** One horizontal wall run along row `r`, spanning columns [c0, c1), skipping any door columns. */
function hWall(r, c0, c1, doorCols = []) {
  const segs = [];
  for (let c = c0; c < c1; c++) {
    if (doorCols.includes(c)) continue;
    segs.push({ c: [c, r, c + 1, r], ...EDGE });
  }
  return segs;
}

/** One vertical wall run along column `c`, spanning rows [r0, r1), skipping any door rows. */
function vWall(c, r0, r1, doorRows = []) {
  const segs = [];
  for (let r = r0; r < r1; r++) {
    if (doorRows.includes(r)) continue;
    segs.push({ c: [c, r, c, r + 1], ...EDGE });
  }
  return segs;
}

/**
 * One building: a 2x3 grid of 8x8 rooms inside footprint [x0,x0+16) x [0,24), fully enclosed
 * except one external doorway on `externalWall` ("east" or "west") at `externalDoorRow`, plus six
 * internal doorways (one between every pair of row/column-adjacent rooms) at the given door
 * coordinates relative to the footprint.
 */
function building(x0, { externalWall, externalDoorRow, colDoorRows, rowDoorCols }) {
  const xMid = x0 + 8, xEnd = x0 + 16;
  const walls = [
    // Perimeter
    ...hWall(0, x0, xEnd),           // north
    ...hWall(24, x0, xEnd),          // south
    ...vWall(x0, 0, 24, externalWall === "west" ? [externalDoorRow] : []),   // west
    ...vWall(xEnd, 0, 24, externalWall === "east" ? [externalDoorRow] : []), // east
    // Internal vertical wall (splits each row-band into west/east rooms), one door per band
    ...vWall(xMid, 0, 8, [colDoorRows[0]]),
    ...vWall(xMid, 8, 16, [colDoorRows[1]]),
    ...vWall(xMid, 16, 24, [colDoorRows[2]]),
    // Internal horizontal walls (split into 3 row-bands), one door per half
    ...hWall(8, x0, xMid, [rowDoorCols[0]]), ...hWall(8, xMid, xEnd, [rowDoorCols[1]]),
    ...hWall(16, x0, xMid, [rowDoorCols[2]]), ...hWall(16, xMid, xEnd, [rowDoorCols[3]])
  ];
  return walls;
}

export const GRID_SIZE = { cols: 36, rows: 24 };

const BUILDING_A = building(0, { externalWall: "east", externalDoorRow: 11, colDoorRows: [3, 11, 19], rowDoorCols: [3, 11, 3, 11] });
const BUILDING_B = building(20, { externalWall: "west", externalDoorRow: 11, colDoorRows: [3, 11, 19], rowDoorCols: [23, 31, 23, 31] });

export const WALLS = [...BUILDING_A, ...BUILDING_B];

// Named room-center points, staggered off every door's row/column on purpose (the original,
// smaller map's own lesson: a "center" point sitting exactly on a doorway's row silently hands it
// an open sightline that defeats the point of a room — verified here the same way, by test, not by
// eye).
export const POINTS = {
  A_NW: { col: 2, row: 5 }, A_NE: { col: 12, row: 5 },
  A_CW: { col: 2, row: 13 }, A_CE: { col: 12, row: 13 },
  A_SW: { col: 2, row: 21 }, A_SE: { col: 12, row: 21 },
  B_NW: { col: 23, row: 5 }, B_NE: { col: 33, row: 5 },
  B_CW: { col: 23, row: 13 }, B_CE: { col: 33, row: 13 },
  B_SW: { col: 23, row: 21 }, B_SE: { col: 33, row: 21 },
  COURTYARD_CENTER: { col: 17, row: 12 },
  COURTYARD_NORTH: { col: 17, row: 2 },
  COURTYARD_SOUTH: { col: 17, row: 22 },
  // Both buildings' external doors sit at the SAME row (11) on purpose — these two points are
  // deliberately ALIGNED with that row, unlike every A_*/B_* room-center point above, so a straight
  // line between them crosses both doorways and nothing else: the one genuine "see straight through
  // two open doors across the courtyard" sightline this map has.
  A_CE_NEAR_DOOR: { col: 14, row: 11 }, B_CW_NEAR_DOOR: { col: 21, row: 11 }
};

/**
 * Starting configurations spanning the full range from "close, open sightline" to "as far apart
 * as this map gets, real building-to-building pathfinding required" — the far end deliberately
 * mirrors the smaller map's own praised FAR_ROOMS setup, now across a genuinely large distance.
 *
 * Each side gets TWO real spawn points (not one) — for a 2-vs-2 fight (design doc §21's "more
 * allies and enemies" expansion), one square off its own named POINTS entry so a scenario builder
 * placing a second combatant never has to guess an offset by hand. Both offsets were checked to
 * stay inside the same room/area as their anchor point, not accidentally across a wall.
 */
export const SETUPS = {
  // Real open sightline straight across the courtyard, through both external doors — see
  // A_CE_NEAR_DOOR/B_CW_NEAR_DOOR's own comment for why these two points specifically (not the
  // plain A_CE/B_CW room-center points, which are deliberately off the doorway's row).
  SAME_ROOM: {
    partyPositions: [POINTS.A_CE_NEAR_DOOR, { col: 14, row: 12 }],
    oppositionPositions: [POINTS.B_CW_NEAR_DOOR, { col: 21, row: 12 }]
  },
  SAME_BUILDING_FAR_ROOMS: { // opposite corners of ONE building
    partyPositions: [POINTS.A_NW, { col: 3, row: 5 }],
    oppositionPositions: [POINTS.A_SE, { col: 13, row: 21 }]
  },
  ACROSS_THE_COMPLEX: { // the two farthest rooms in the whole map, opposite buildings
    partyPositions: [POINTS.A_SW, { col: 3, row: 21 }],
    oppositionPositions: [POINTS.B_NE, { col: 32, row: 5 }]
  }
};
