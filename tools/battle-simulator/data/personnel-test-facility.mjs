/**
 * A small, purpose-built synthetic battlemap for the PERSONNEL-SCALE engine (design doc §19,
 * Phase 1b) — three rooms connected by two open doorways, real 5ft grid, Foundry Wall schema
 * (`c:[x0,y0,x1,y1]` in grid-vertex coordinates, same as ../../engine/terrain.mjs's own header
 * documents). Deliberately NOT derived from the campaign map image or any real location in this
 * campaign — a TEST FIXTURE, exactly like data/kid-fixtures/'s own "not one of the six real kids"
 * convention. Its only job is to give the personnel-scale pathfinding/vision/belief stack a real
 * building to be tested against: "test pathfinding, how the AI reacts to being able to see things
 * to attack vs not being able to see anything to attack" (Ingram's own framing).
 *
 * Layout (cols 0-13, rows 0-15):
 *
 *   Room A (West)      Room B (Central)
 *   cols 0-5, rows 0-7  cols 7-13, rows 0-7
 *          |  door@row3  |
 *          +-------------+
 *                        |  door@col10
 *                        |
 *                 Room C (South)
 *                 cols 7-13, rows 9-15
 *
 * Every wall run is authored as a LOOP OF UNIT-LENGTH EDGES, one per row/column crossed, never a
 * single long multi-cell segment — confirmed necessary while building this: engine/terrain.mjs's
 * moveBlockedBetween matches a wall's `c` array against one SPECIFIC unit edge via exact endpoint
 * equality (segmentsEqual), not a general "is this edge covered by a longer span" test. A single
 * `c:[6,0,6,8]` segment would correctly block sight (lineOfEffect uses real geometric intersection)
 * but would silently NOT block movement at all except at the one exact edge that happens to match
 * — a real, easy-to-miss trap for hand-authoring a wall run, worth documenting here since a solid
 * wall in a real building obviously needs to block both.
 */

export const GRID_SIZE = { cols: 14, rows: 16 };

const DOOR_ROW_AB = 3;   // the one open row in the Room A <-> Room B dividing wall (x=6)
const DOOR_COL_BC = 10;  // the one open column in the Room B <-> Room C dividing wall (y=8)

function wallAB() {
  const segments = [];
  for (let row = 0; row <= 7; row++) {
    if (row === DOOR_ROW_AB) continue; // the doorway
    segments.push({ c: [6, row, 6, row + 1], move: 20, sight: 20 });
  }
  return segments;
}

function wallBC() {
  const segments = [];
  for (let col = 7; col <= 13; col++) {
    if (col === DOOR_COL_BC) continue; // the doorway
    segments.push({ c: [col, 8, col + 1, 8], move: 20, sight: 20 });
  }
  return segments;
}

export const WALLS = [...wallAB(), ...wallBC()];

// Named, readable spawn points — real cell coordinates on this specific map, so a scenario builder
// never has to hand-count grid squares against the layout diagram above. Deliberately staggered so
// no two "CENTER"/"FAR_CORNER" points accidentally share a row/column with a doorway (which would
// silently hand them an open sightline that was never verified on purpose — checked by hand and
// pinned by this file's own test, not just eyeballed).
export const POINTS = {
  ROOM_A_CENTER: { col: 2, row: 6 },
  ROOM_A_FAR_CORNER: { col: 1, row: 1 },
  ROOM_A_NEAR_DOOR: { col: 5, row: DOOR_ROW_AB },
  ROOM_B_CENTER: { col: 9, row: 6 },
  ROOM_B_NEAR_DOOR_A: { col: 7, row: DOOR_ROW_AB },
  ROOM_B_NEAR_DOOR_C: { col: DOOR_COL_BC, row: 7 },
  ROOM_C_CENTER: { col: 9, row: 12 },
  ROOM_C_FAR_CORNER: { col: 12, row: 14 }
};

/**
 * Three pre-built starting configurations, matching the three behaviors Ingram named explicitly:
 * an open sightline (same room), a wall in the way but a nearby doorway (adjacent rooms), and no
 * plausible sightline at all requiring real multi-room pathfinding and belief-driven pursuit (two
 * doorways apart). Every claim about which of these has/lacks an initial sightline is verified
 * directly, not just asserted — see test/battle-simulator/personnel-test-facility.test.mjs.
 */
export const SETUPS = {
  SAME_ROOM: { attacker: POINTS.ROOM_B_NEAR_DOOR_A, defender: POINTS.ROOM_B_CENTER },
  ADJACENT_ROOMS: { attacker: POINTS.ROOM_A_CENTER, defender: POINTS.ROOM_B_CENTER },
  FAR_ROOMS: { attacker: POINTS.ROOM_A_FAR_CORNER, defender: POINTS.ROOM_C_FAR_CORNER }
};
