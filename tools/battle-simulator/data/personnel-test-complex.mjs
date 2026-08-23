/**
 * The larger, two-building synthetic battlemap for the PERSONNEL-SCALE engine (design doc §21/§22/§24),
 * real 5ft grid, Foundry Wall schema throughout. Same "TEST FIXTURE, not derived from the campaign
 * map" status as `data/personnel-test-facility.mjs`.
 *
 * REDESIGNED AGAIN (design doc §24) after a second, specific critique of the §22 version, this time
 * of the SPAWNING itself, not the buildings: *"Nitpick's first turn is three 5ft moves in a row...
 * They start on top of a table... Are they stuck? Moving across cover should be possible, spawning
 * inside shouldn't happen. Spawn the two sides at opposite corners of the map, together so that they
 * have access to a full band of space outside the buildings at least two grid spaces wide. By putting
 * them in opposite corners we force them to find each other first... Add more external doors to both
 * buildings, add more windows. Add some large garage like openings."* Two real, confirmed bugs and
 * one structural redesign came out of that:
 *
 *  1. **A real trap, not a metaphor.** The §22 version's `coverBlock` used `move:20` (fully solid,
 *     same as a wall) for all four sides of a cover object's perimeter — a small object with no
 *     doorway is a SEALED BOX, walkable INTO but never back OUT of. The SAME_ROOM setup's own Bennit
 *     spawn point landed exactly inside `coverBlock(14,19,2,2)`'s 2x2 interior, permanently trapped
 *     from turn 1 — the actual mechanism behind "three 5ft moves in a row" and "are they stuck."
 *     Fixed at the root, not just at that one spawn point: `coverBlock` no longer blocks movement at
 *     all (`move:0`) — this engine has no difficult-terrain cost model to charge for climbing real
 *     waist-high cover, so full permeability is the honest simplification, not `move:20` with
 *     hand-placed gaps that would only reintroduce the same trap under different coordinates. See
 *     `coverBlock`'s own comment below.
 *  2. **The map had NO exterior space at all.** Both buildings spanned the grid's FULL height with
 *     zero buffer north/south, and the outer buildings were flush against the west/east edges too —
 *     there was no "outside" for a real opposite-corners spawn to exist in. The grid grew from
 *     38x24 to 44x30 and both buildings shifted +3 cols/+3 rows so a real, uniform >=3-square
 *     exterior perimeter band now wraps every side — comfortably over Ingram's own ">= 2 grid
 *     spaces wide" floor.
 *  3. **Spawning moved from inside specific rooms to opposite map corners** (SETUPS below), in the
 *     new exterior band — each side starts with real room to maneuver and has to actually route
 *     toward the other, through or around the buildings, rather than beginning already adjacent to
 *     a shared doorway.
 *  4. **More doors, more windows, and real "garage" openings** — a wide (3-square) gap in an
 *     exterior wall, mechanically just an extra-large doorway (fully open, blocks neither move nor
 *     sight) but visually and tactically distinct from a standard 1-square door.
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
 * [c0,c0+w) x [r0,r0+h) — its own full unit-edge perimeter, marked `cover: true` (engine/terrain.mjs's
 * `hasCover`) so it grants a circumstance bonus, and explicitly NOT `sight`-blocking (you can still
 * see and target someone behind it, you just have a harder time hitting them).
 *
 * NOT `move`-blocking either (design doc §24 — Ingram's own direct correction: "Moving across cover
 * should be possible"). An earlier version used move:20 (fully solid, same as a wall), which turned
 * every cover object into a sealed box with no doorway — walkable INTO but never back OUT of, since
 * its own 4-sided perimeter blocked every edge with no gap. That's the actual mechanism behind a
 * real, confirmed bug this map shipped with: the SAME_ROOM setup's own Bennit spawn point landed
 * INSIDE a cover block's sealed interior, permanently trapped from turn 1. This engine has no
 * difficult-terrain cost model to charge for climbing over real waist-high cover, so leaving it
 * fully open (move:0) is the honest simplification, not move:20 with hand-placed gaps that would
 * only reintroduce the same trap under different coordinates.
 */
function coverBlock(c0, r0, w, h) {
  const edge = { move: 0, sight: 0, cover: true };
  return [
    ...hWall(r0, c0, c0 + w, [], edge),
    ...hWall(r0 + h, c0, c0 + w, [], edge),
    ...vWall(c0, r0, r0 + h, [], edge),
    ...vWall(c0 + w, r0, r0 + h, [], edge)
  ];
}

// 38x24 (design doc §22) + a 3-square exterior margin on every side (design doc §24) = 44x30.
export const GRID_SIZE = { cols: 44, rows: 30 };
const MARGIN = 3;

/**
 * Building A (west, cols 3-21 — MARGIN=3 in from the map's own west/north edges): four genuinely
 * unequal rooms in a 2x2 grid — a big NW hall, a smaller NE room, a tall SW room, and the SE room
 * the original courtyard-facing door opens into. Geometrically identical in shape to the §22
 * version, uniformly shifted +3 cols/+3 rows, with new doors/windows/a garage opening layered on
 * top (design doc §24).
 *
 *   +------------------+--------+
 *   |                  |        |
 *   |    NW (hall)     |   NE   |
 *   |                  |        |
 *   +--------.---------+---.----+
 *   |        |                  .<- courtyard door (east wall, row 20)
 *   |  SW    |        SE        .<- south door (south wall, col 15) — NEW
 *   G        |                  |
 *   +--------+------------------+
 *   ^ GARAGE opening, west wall rows 23-25 — NEW
 */
const BUILDING_A = [
  // Perimeter — window/door/garage cols/rows are excluded here the same way an ordinary door's
  // would be: a separately-authored run (a different `edge`, or nothing at all) owns that stretch
  // instead, and must never be shadowed by a duplicate solid segment sitting at the identical
  // coordinates (walls.some() would then always find the solid one and the opening would silently
  // never work — the exact bug §22 found and fixed once already for the original window).
  ...hWall(3, 3, 21, [6, 7, 17, 18]),          // north — cols 6-7: NW hall's window; cols 17-18: NEW NE room window
  ...hWall(27, 3, 21, [15]),                    // south — col 15: NEW south door into the SE room
  ...vWall(3, 3, 27, [18, 19, 23, 24, 25]),     // west — rows 18-19: SW room's window; rows 23-25: NEW garage opening
  ...vWall(21, 3, 27, [20]),                    // east — courtyard door at row 20
  // Internal walls, one door each
  ...vWall(14, 3, 13, [8]),                    // NW | NE
  ...hWall(13, 3, 11, [7]),                    // NW | SW
  ...hWall(13, 11, 21, [16]),                  // NE | SE
  ...vWall(11, 13, 27, [20]),                  // SW | SE
  // Windows: real, see-through-but-not-walkable openings
  ...hWall(3, 6, 8, [], WINDOW_EDGE),          // NW hall's own window onto the outside north
  ...hWall(3, 17, 19, [], WINDOW_EDGE),        // NEW — NE room's own window onto the outside north
  ...vWall(3, 18, 20, [], WINDOW_EDGE),        // SW room's window onto the outside west
  // Cover
  ...coverBlock(6, 6, 2, 2),                   // a crate in the NW hall
  ...coverBlock(9, 6, 2, 1),                   // a second, smaller obstacle nearby — real choice of cover, not just one spot
  ...coverBlock(5, 22, 3, 1),                  // a low barrier in the SW room
  ...coverBlock(17, 22, 2, 2)                  // cover right by the SE room's own courtyard door
];

/**
 * Building B (east, cols 29-41 — narrower and taller than Building A, matching the sketch's own
 * tall/narrow second building): just TWO rooms, split by one real dividing wall, not a repeated
 * grid — a big north room and the south room the courtyard-facing door opens into. Shifted +3,+3
 * from §22's version, with new doors/windows/a garage opening layered on top (design doc §24).
 */
const BUILDING_B = [
  ...hWall(3, 29, 41, [35]),                   // north — col 35: NEW north door
  ...hWall(27, 29, 41),                        // south
  ...vWall(29, 3, 27, [20, 7, 8]),             // west — courtyard door at row 20, window rows 7-8
  ...vWall(41, 3, 27, [10, 11, 23, 24, 25]),   // east — rows 10-11: NEW window; rows 23-25: NEW garage opening
  ...hWall(16, 29, 41, [35]),                  // north | south, one door
  // Windows: the courtyard-facing wall gets a second, real see-through opening besides the door
  ...vWall(29, 7, 9, [], WINDOW_EDGE),
  ...vWall(41, 10, 12, [], WINDOW_EDGE),       // NEW — the east wall's own window
  // Cover, right inside the courtyard door the way Building A's own SE room has it
  ...coverBlock(33, 22, 2, 2)
];

/**
 * Real cover out in the open courtyard itself (design doc §24) — every interior cover object above
 * predates the opposite-corners spawn redesign and sits deep inside a specific room, which a real
 * end-to-end battle confirmed never actually gets crossed once combatants spawn at opposite map
 * corners/ends instead of already inside those rooms: 30 real battles across all three SETUPS
 * showed a real fight resolving, start to finish, without a single attack's line ever crossing a
 * cover object — not because cover stopped working, but because none of it sat anywhere a real
 * opposite-corner engagement actually happens. The courtyard (cols 21-29) is the one area every
 * setup's own travel genuinely passes through or near regardless of which corner/end it starts
 * from, so real cover belongs there now too, not just inside the buildings.
 */
const COURTYARD = [
  ...coverBlock(24, 13, 2, 2),
  ...coverBlock(23, 17, 2, 1)
];

export const WALLS = [...BUILDING_A, ...BUILDING_B, ...COURTYARD];

/**
 * Named interior points (design doc §22, shifted +3/+3 for §24's new margin) — kept for
 * connectivity tests and anything that wants a specific room rather than an exterior spawn.
 * Staggered off every door's row/column on purpose (an earlier version's own lesson: a "center"
 * point sitting exactly on a doorway's row silently hands it an open sightline that defeats the
 * point of a room — verified by test, not by eye).
 */
export const POINTS = {
  A_NW: { col: 5, row: 6 }, A_NW_ALT: { col: 11, row: 5 },
  A_NE: { col: 17, row: 6 }, A_NE_ALT: { col: 18, row: 10 },
  A_SW: { col: 5, row: 24 }, A_SW_ALT: { col: 8, row: 24 },
  A_SE: { col: 15, row: 24 }, A_SE_ALT: { col: 18, row: 18 },
  B_NORTH: { col: 35, row: 8 }, B_NORTH_ALT: { col: 33, row: 12 },
  B_SOUTH: { col: 35, row: 24 }, B_SOUTH_ALT: { col: 38, row: 24 },
  COURTYARD_CENTER: { col: 25, row: 15 },
  COURTYARD_NORTH: { col: 25, row: 5 },
  COURTYARD_SOUTH: { col: 25, row: 25 },
  // Both buildings' courtyard doors sit on the SAME row (20) on purpose — these two points are
  // deliberately ALIGNED with that row, unlike every other named interior point above, so a
  // straight line between them crosses both doorways and nothing else: the one genuine "see
  // straight through two open doors across the courtyard" sightline this map has.
  A_SE_NEAR_DOOR: { col: 19, row: 20 }, B_SOUTH_NEAR_DOOR: { col: 30, row: 20 },
  // Cover-adjacent points, for tests/scenarios that specifically want a combatant starting in real
  // cover rather than open ground.
  A_NW_BY_COVER: { col: 7, row: 7 }, COURTYARD_BY_COVER: { col: 23, row: 15 }
};

/**
 * Starting configurations (design doc §24 — a full redesign of what a "setup" even means, not a
 * shift of the old ones). Every setup now spawns each side in the new EXTERIOR perimeter band —
 * never inside a room, never inside or adjacent to a cover object — at opposite corners or ends of
 * the whole map: *"Spawn the two sides at opposite corners of the map... so that they have access
 * to a full band of space outside the buildings at least two grid spaces wide. By putting them in
 * opposite corners we force them to find each other first."* Real variety across the three comes
 * from WHICH pair of corners/ends, not from proximity — every setup now makes both sides cover
 * real ground before any shot is possible, verified by connectivity test, not by eye.
 */
export const SETUPS = {
  // The long diagonal: Building A's SW exterior corner vs. Building B's NE exterior corner —
  // routing between them plausibly goes through or around BOTH buildings.
  DIAGONAL_SW_NE: {
    partyPositions: [{ col: 1, row: 26 }, { col: 2, row: 27 }, { col: 1, row: 28 }],
    oppositionPositions: [{ col: 42, row: 1 }, { col: 43, row: 1 }, { col: 42, row: 2 }]
  },
  // The mirror diagonal: NW vs. SE.
  DIAGONAL_NW_SE: {
    partyPositions: [{ col: 1, row: 1 }, { col: 2, row: 1 }, { col: 1, row: 2 }],
    oppositionPositions: [{ col: 42, row: 28 }, { col: 43, row: 28 }, { col: 42, row: 27 }]
  },
  // Opposite ends along the NORTH-SOUTH axis, centered on the courtyard gap between the two
  // buildings — a genuinely different shape from the two diagonals: a straight approach through
  // the courtyard is available without needing to enter either building at all.
  NORTH_SOUTH_ENDS: {
    partyPositions: [{ col: 23, row: 1 }, { col: 25, row: 1 }, { col: 27, row: 1 }],
    oppositionPositions: [{ col: 23, row: 28 }, { col: 25, row: 28 }, { col: 27, row: 28 }]
  }
};
