/**
 * The larger, two-building synthetic battlemap for the PERSONNEL-SCALE engine (design doc §21/§22),
 * real 5ft grid, Foundry Wall schema throughout. Same "TEST FIXTURE, not derived from the campaign
 * map" status as `data/personnel-test-facility.mjs`.
 *
 * REDESIGNED (design doc §22) after direct, specific critique of the original version: "your
 * buildings are very dull... add walls with both windows (see through, fire through but can't move
 * through) and doors (see through and move through)... include value in the idea of staying behind
 * cover." The original map was a uniform 2x3 grid of identically-sized 8x8 rooms in both buildings —
 * mechanically fine, visually and tactically repetitive. This version keeps the same overall
 * footprint (two buildings flanking an open courtyard) but:
 *  - Rooms are genuinely UNEQUAL in size and count per building (4 asymmetric rooms in Building A,
 *    2 in the taller, narrower Building B) instead of a repeated identical grid cell.
 *  - Real WINDOWS exist (`hWall`/`vWall`'s new `edge` param, passed WINDOW_EDGE) — a window blocks
 *    movement but not sight, exactly Foundry's own move/sight axes already made this representable
 *    with zero new mechanism, just never actually authored anywhere until now.
 *  - Real COVER objects exist (`coverBlock`, engine/terrain.mjs's new `hasCover`) — small freestanding
 *    obstacles (crates, barriers) placed inside rooms AND in the open courtyard, each granting
 *    standard cover (+2 AC/Reflex, Player Core pg. 416) to a creature using them as a shield, without
 *    blocking line of effect the way a real wall does — you can still see and target someone behind
 *    a crate, you just have a harder time hitting them.
 *
 * Every wall/window run is still built as a loop of UNIT-LENGTH edges (never one long segment) —
 * see `data/personnel-test-facility.mjs`'s own header for exactly why (moveBlockedBetween's
 * exact-endpoint-equality matching).
 */

const WALL_EDGE = { move: 20, sight: 20 };
const WINDOW_EDGE = { move: 20, sight: 0 }; // blocks movement, NOT sight — see and shoot through, can't walk through

/** One horizontal wall/window run along row `r`, spanning columns [c0, c1), skipping any door columns. */
function hWall(r, c0, c1, doorCols = [], edge = WALL_EDGE) {
  const segs = [];
  for (let c = c0; c < c1; c++) {
    if (doorCols.includes(c)) continue;
    segs.push({ c: [c, r, c + 1, r], ...edge });
  }
  return segs;
}

/** One vertical wall/window run along column `c`, spanning rows [r0, r1), skipping any door rows. */
function vWall(c, r0, r1, doorRows = [], edge = WALL_EDGE) {
  const segs = [];
  for (let r = r0; r < r1; r++) {
    if (doorRows.includes(r)) continue;
    segs.push({ c: [c, r, c, r + 1], ...edge });
  }
  return segs;
}

/**
 * A small freestanding cover object (a crate, low barrier, furniture) occupying the cells
 * [c0,c0+w) x [r0,r0+h) — its own full unit-edge perimeter, `move`-blocking (you have to go around
 * it, same as any solid obstacle) but explicitly NOT `sight`-blocking and marked `cover: true`
 * (engine/terrain.mjs's `hasCover`) so it grants a circumstance bonus instead of hiding its user
 * entirely. Genuinely independent of a plain wall or a window — see terrain.mjs's own header.
 */
function coverBlock(c0, r0, w, h) {
  const edge = { move: 20, sight: 0, cover: true };
  return [
    ...hWall(r0, c0, c0 + w, [], edge),
    ...hWall(r0 + h, c0, c0 + w, [], edge),
    ...vWall(c0, r0, r0 + h, [], edge),
    ...vWall(c0 + w, r0, r0 + h, [], edge)
  ];
}

export const GRID_SIZE = { cols: 38, rows: 24 };

/**
 * Building A (west, cols 0-18): four genuinely unequal rooms in a 2x2 grid — a big NW hall, a
 * smaller NE room, a tall SW room, and the SE room the external door opens into (so anyone entering
 * from the courtyard has real cover immediately available, not an empty welcome mat).
 *
 *   +------------------+--------+
 *   |                  |        |
 *   |    NW (hall)     |   NE   |
 *   |                  |        |
 *   +--------.---------+---.----+
 *   |        |                  .<- external door (east wall, row 17)
 *   |  SW    |        SE        |
 *   |        |                  |
 *   +--------+------------------+
 */
const BUILDING_A = [
  // Perimeter — window cols/rows are excluded here the same way a door's would be: the window
  // segments below (a different `edge`) own that stretch instead, and must never be shadowed by a
  // duplicate solid segment sitting at the identical coordinates (walls.some() would then always
  // find the solid one and the window would silently never work).
  ...hWall(0, 0, 18, [3, 4]),             // north — cols 3-4 are the NW hall's window, not solid wall
  ...hWall(24, 0, 18),                    // south
  ...vWall(0, 0, 24, [15, 16]),           // west — rows 15-16 are the SW room's window
  ...vWall(18, 0, 24, [17]),              // east — external door at row 17
  // Internal walls, one door each
  ...vWall(11, 0, 10, [5]),              // NW | NE
  ...hWall(10, 0, 8, [4]),               // NW | SW
  ...hWall(10, 8, 18, [13]),             // NE | SE
  ...vWall(8, 10, 24, [17]),             // SW | SE
  // Windows: real, see-through-but-not-walkable openings
  ...hWall(0, 3, 5, [], WINDOW_EDGE),    // NW hall's own window onto the outside north
  ...vWall(0, 15, 17, [], WINDOW_EDGE),  // SW room's window onto the outside west
  // Cover
  ...coverBlock(3, 3, 2, 2),             // a crate in the NW hall
  ...coverBlock(6, 3, 2, 1),             // a second, smaller obstacle nearby — real choice of cover, not just one spot
  ...coverBlock(2, 19, 3, 1),            // a low barrier in the SW room
  ...coverBlock(14, 19, 2, 2)            // cover right by the SE room's own external door
];

/**
 * Building B (east, cols 26-38 — narrower and taller than Building A, matching the sketch's own
 * tall/narrow second building): just TWO rooms, split by one real dividing wall, not a repeated
 * grid — a big north room and the south room the external door opens into.
 */
const BUILDING_B = [
  ...hWall(0, 26, 38),                   // north
  ...hWall(24, 26, 38),                  // south
  ...vWall(26, 0, 24, [17, 4, 5]),       // west — row 17 is the external door, rows 4-5 are a real window
  ...vWall(38, 0, 24),                   // east
  ...hWall(13, 26, 38, [32]),            // north | south, one door
  // Windows: the courtyard-facing wall gets a second, real see-through opening besides the door
  ...vWall(26, 4, 6, [], WINDOW_EDGE),
  // Cover, right inside the door the way Building A's own SE room has it
  ...coverBlock(30, 19, 2, 2)
];

export const WALLS = [...BUILDING_A, ...BUILDING_B];

// Named points, staggered off every door's row/column on purpose (an earlier version of this map's
// own lesson: a "center" point sitting exactly on a doorway's row silently hands it an open
// sightline that defeats the point of a room — verified by test, not by eye).
export const POINTS = {
  A_NW: { col: 2, row: 3 }, A_NW_ALT: { col: 8, row: 2 },
  A_NE: { col: 14, row: 3 }, A_NE_ALT: { col: 15, row: 7 },
  A_SW: { col: 2, row: 21 }, A_SW_ALT: { col: 5, row: 21 },
  A_SE: { col: 12, row: 21 }, A_SE_ALT: { col: 15, row: 15 },
  B_NORTH: { col: 32, row: 5 }, B_NORTH_ALT: { col: 30, row: 9 },
  B_SOUTH: { col: 32, row: 21 }, B_SOUTH_ALT: { col: 35, row: 21 },
  COURTYARD_CENTER: { col: 22, row: 12 },
  COURTYARD_NORTH: { col: 22, row: 2 },
  COURTYARD_SOUTH: { col: 22, row: 22 },
  // Both buildings' external doors sit on the SAME row (17) on purpose — these two points are
  // deliberately ALIGNED with that row, unlike every other named point above, so a straight line
  // between them crosses both doorways and nothing else: the one genuine "see straight through two
  // open doors across the courtyard" sightline this map has.
  A_SE_NEAR_DOOR: { col: 16, row: 17 }, B_SOUTH_NEAR_DOOR: { col: 27, row: 17 },
  // Cover-adjacent points, for tests/scenarios that specifically want a combatant starting in real
  // cover rather than open ground.
  A_NW_BY_COVER: { col: 4, row: 4 }, COURTYARD_BY_COVER: { col: 20, row: 12 }
};

/**
 * Starting configurations spanning "close, open sightline" through "as far apart as this map gets."
 * Each side gets THREE real spawn points now (design doc §22's 3v3 expansion, up from two for 2v2),
 * one square or more off its own named POINTS entry so a scenario builder placing more combatants
 * never has to guess an offset by hand. Every offset was checked to stay inside the same room/area
 * as its anchor point, not accidentally across a wall — by real connectivity test, not by eye.
 */
export const SETUPS = {
  SAME_ROOM: {
    partyPositions: [POINTS.A_SE_NEAR_DOOR, { col: 16, row: 18 }, { col: 15, row: 20 }],
    oppositionPositions: [POINTS.B_SOUTH_NEAR_DOOR, { col: 27, row: 18 }, { col: 28, row: 20 }]
  },
  SAME_BUILDING_FAR_ROOMS: { // opposite corners of Building A
    partyPositions: [POINTS.A_NW, POINTS.A_NW_ALT, { col: 4, row: 6 }],
    oppositionPositions: [POINTS.A_SE, POINTS.A_SE_ALT, { col: 10, row: 20 }]
  },
  ACROSS_THE_COMPLEX: { // the two farthest rooms in the whole map, opposite buildings
    partyPositions: [POINTS.A_SW, POINTS.A_SW_ALT, { col: 3, row: 19 }],
    oppositionPositions: [POINTS.B_NORTH, POINTS.B_NORTH_ALT, { col: 34, row: 5 }]
  }
};
