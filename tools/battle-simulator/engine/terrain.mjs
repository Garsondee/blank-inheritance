/**
 * Terrain: wall segments that block movement and/or sight (design doc §15p).
 *
 * Authored against Foundry VTT's own Wall document schema — `c: [x0,y0,x1,y1]`
 * in grid-vertex coordinates, `move`/`sight` as CONST.EDGE_SENSE_TYPES values
 * (`foundryvtt/.../common/documents/wall.mjs`) — on purpose, so a wall
 * authored here is the SAME shape a wall authored in the Foundry module would
 * be; no translation step, no format to drift out of sync. `light`/`sound`/
 * `door` are real Foundry fields too but nothing in this project models
 * lighting, sound, or doors, so they're simply absent rather than stubbed.
 *
 * SCOPE (deliberately bounded — see design doc §15p for the full reasoning):
 * a wall is a binary blocker for movement and Line of Effect. SF2E's
 * circumstance-bonus COVER (+1/+2/+4 AC from partial obstruction, Player
 * Core pg. 416) is NOT implemented here — that needs to distinguish a
 * partially-obstructing sliver from a fully-blocking wall, which is real
 * nuance not worth guessing at ahead of any real terrain to validate it
 * against. What's built is the higher-leverage half: can you even path to
 * or target something at all.
 *
 * AUTHORING TRAP, verified and regression-tested (found while building
 * data/personnel-test-facility.mjs, design doc §19 Phase 1b): movement and
 * Line of Effect check a wall's `c` segment in two genuinely different ways,
 * and a wall spanning more than one grid unit is NOT handled the same by
 * both. `lineOfEffect` does true 2D geometric line-segment intersection
 * (`segmentsIntersect`) against the whole segment, so a sight line crossing
 * anywhere along its length is correctly blocked no matter how long the
 * segment is. `moveBlockedBetween` instead matches `c` against one candidate
 * step's edge via EXACT endpoint equality (`segmentsEqual`) — and every
 * candidate edge (`edgesBetween`/`orthogonalEdge`) is always exactly one
 * grid unit long. The two can therefore only ever agree when a wall's `c` is
 * itself exactly one unit long. A convenient-looking single segment meant to
 * read as "one wall spanning N rows" — e.g. `{c:[6,0,6,8], move:20,
 * sight:20}` for an 8-row span — blocks Line of Effect correctly across the
 * whole thing, but blocks MOVEMENT NOWHERE along it: not "everywhere except
 * one edge," but zero edges, since no unit-length step edge can ever equal
 * an 8-unit segment's endpoints. The wall looks solid — you can't see
 * through it — but is walkable through everywhere, silently, with no error
 * or warning. ALWAYS author a multi-cell wall run as a LOOP OF UNIT-LENGTH
 * EDGES, one segment per row/column crossed (see
 * `data/personnel-test-facility.mjs` for a real worked example, and
 * `test/battle-simulator/terrain.test.mjs`'s "documentation trap" test for a
 * runnable proof of both the failure and the fix). This costs nothing in
 * practice — Foundry's own Wall documents are typically authored as
 * individual polygon edges too — but nothing here enforces or validates it,
 * so a new wall run can still get it wrong silently.
 *
 * No terrain is authored anywhere in this project yet (a separate effort is
 * building the real city map) — every scenario's `state.walls` is empty
 * today, and every function here is written so that an empty wall list is
 * IDENTICAL to no terrain code existing at all. That equivalence is what
 * every wall-aware test in this pass verifies before testing anything else.
 */

export const EDGE_SENSE = { NONE: 0, LIMITED: 10, NORMAL: 20, PROXIMITY: 30, DISTANCE: 40 };

function blocks(value) {
  return (value ?? EDGE_SENSE.NONE) >= EDGE_SENSE.NORMAL;
}

/** True if a wall's `move` sense is high enough to block movement across it. */
export function wallBlocksMove(wall) {
  return blocks(wall.move);
}

/** True if a wall's `sight` sense is high enough to block Line of Effect through it. */
export function wallBlocksSight(wall) {
  return blocks(wall.sight);
}

/** The single edge shared by two ORTHOGONALLY adjacent cells (one differs by exactly 1 in exactly one axis). */
function orthogonalEdge(a, b) {
  const dCol = b.col - a.col, dRow = b.row - a.row;
  if (dCol === 1) return [b.col, a.row, b.col, a.row + 1];
  if (dCol === -1) return [a.col, a.row, a.col, a.row + 1];
  if (dRow === 1) return [a.col, b.row, a.col + 1, b.row];
  if (dRow === -1) return [a.col, a.row, a.col + 1, a.row];
  return null;
}

/**
 * The wall-edge(s) a mover would cross going from cell `a` to an ADJACENT
 * cell `b`. Orthogonal: the one shared edge. Diagonal: FOUR edges, not two —
 * both cells adjacent to the corner being cut, on BOTH sides of it. A
 * diagonal from (4,4) to (5,5) passes through the vertex shared by four
 * cells: (4,4), (5,4), (4,5), (5,5); a wall on ANY of the four edges meeting
 * at that vertex — (4,4)-(5,4), (4,4)-(4,5), (5,5)-(5,4), (5,5)-(4,5) —
 * represents a real obstruction at that corner and blocks the cut. Checking
 * only the two edges adjacent to the DEPARTURE cell (an earlier version of
 * this function) missed walls sitting on the ARRIVAL cell's own edges — a
 * cell walled on all four sides was still reachable by cutting diagonally
 * into it, since none of its own edges were ever checked. Caught by
 * terrain.test.mjs's "fully enclosed cell" case, not by inspection.
 */
export function edgesBetween(a, b) {
  const dCol = b.col - a.col, dRow = b.row - a.row;
  if (Math.abs(dCol) + Math.abs(dRow) === 1) return [orthogonalEdge(a, b)];
  const corner1 = { col: b.col, row: a.row }; // e.g. NE if travelling NW->SE
  const corner2 = { col: a.col, row: b.row }; // e.g. SW if travelling NW->SE
  return [
    orthogonalEdge(a, corner1), orthogonalEdge(a, corner2), // departure cell's two edges at this corner
    orthogonalEdge(b, corner1), orthogonalEdge(b, corner2)  // arrival cell's two edges at this corner
  ].filter(Boolean);
}

function segmentsEqual(s1, s2) {
  const [ax1, ay1, ax2, ay2] = s1, [bx1, by1, bx2, by2] = s2;
  return (ax1 === bx1 && ay1 === by1 && ax2 === bx2 && ay2 === by2) || (ax1 === bx2 && ay1 === by2 && ax2 === bx1 && ay2 === by1);
}

/**
 * `segmentsEqual` treats a unit edge and its reverse as the same edge — canonicalize by direction
 * so both orderings hash to one key, letting a Set stand in for the O(walls) `segmentsEqual` scan.
 */
function edgeKey([x1, y1, x2, y2]) {
  return (x1 < x2 || (x1 === x2 && y1 <= y2)) ? `${x1},${y1},${x2},${y2}` : `${x2},${y2},${x1},${y1}`;
}

/**
 * Every `moveBlockedBetween` call used to linear-scan the FULL wall list (`walls.some(...)`) for
 * every candidate edge — fine on the original ~20-wall test facility, a real performance cliff once
 * a bigger map existed: reachableCells' Dijkstra flood calls this once per (node, direction) pair,
 * so a 256-wall map (data/personnel-test-complex.mjs, design doc §21) turned one large flood into
 * roughly 1700 nodes x 8 directions x 256 walls ~= 3.5M comparisons — measured directly at ~258ms
 * for a single flood, the dominant cost behind a real 2v2 fight taking ~7 SECONDS PER ROUND. Indexed
 * once per distinct `walls` array (keyed by reference — `state.walls` is a stable array shared by
 * reference across a whole battle, including every sandboxed lookahead fork, exactly like
 * evaluate/state-value.mjs's own `distanceCache` WeakMap already relies on) into an O(1)-lookup Set,
 * turning the same flood's wall-checking cost from O(nodes x directions x walls) into
 * O(nodes x directions) — walls.length no longer matters at all once the index is built.
 */
const moveBlockingIndexCache = new WeakMap();
function moveBlockingIndex(walls) {
  let index = moveBlockingIndexCache.get(walls);
  if (index) return index;
  index = new Set();
  for (const w of walls) if (wallBlocksMove(w)) index.add(edgeKey(w.c));
  moveBlockingIndexCache.set(walls, index);
  return index;
}

/** Is the single step from cell `a` to adjacent cell `b` blocked by any move-blocking wall? */
export function moveBlockedBetween(a, b, walls) {
  if (!walls?.length) return false;
  const index = moveBlockingIndex(walls);
  return edgesBetween(a, b).some((e) => index.has(edgeKey(e)));
}

/**
 * Real 2D line-segment intersection (not the grid-edge special case above) —
 * needed for Line of Effect, where the sight line spans an arbitrary
 * distance, not just one adjacent step. Standard orientation/straddle test;
 * treats a shared endpoint as NOT an intersection (a wall that only touches
 * the line at its exact tip doesn't block sight past it — matches SF2E's
 * "a 1-foot-square gap is enough" allowance for Line of Effect).
 */
function orientation(ax, ay, bx, by, cx, cy) {
  const v = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}
function onSegment(ax, ay, bx, by, px, py) {
  return Math.min(ax, bx) <= px && px <= Math.max(ax, bx) && Math.min(ay, by) <= py && py <= Math.max(ay, by);
}
export function segmentsIntersect([ax1, ay1, ax2, ay2], [bx1, by1, bx2, by2]) {
  const o1 = orientation(ax1, ay1, ax2, ay2, bx1, by1);
  const o2 = orientation(ax1, ay1, ax2, ay2, bx2, by2);
  const o3 = orientation(bx1, by1, bx2, by2, ax1, ay1);
  const o4 = orientation(bx1, by1, bx2, by2, ax2, ay2);
  if (o1 !== o2 && o3 !== o4) {
    // Reject a crossing that occurs exactly at a shared endpoint — a wall whose tip merely
    // touches the sight line shouldn't block it (SF2E's own "a small gap is enough" allowance).
    const touchesEndpoint =
      (ax1 === bx1 && ay1 === by1) || (ax1 === bx2 && ay1 === by2) ||
      (ax2 === bx1 && ay2 === by1) || (ax2 === bx2 && ay2 === by2);
    return !touchesEndpoint;
  }
  // Collinear overlap cases are deliberately NOT treated as a block — a wall running exactly
  // along the sight line (edge-on) doesn't occlude it, matching how a real wall has no
  // thickness in this model.
  if (o1 === 0 && onSegment(ax1, ay1, ax2, ay2, bx1, by1)) return false;
  if (o2 === 0 && onSegment(ax1, ay1, ax2, ay2, bx2, by2)) return false;
  if (o3 === 0 && onSegment(bx1, by1, bx2, by2, ax1, ay1)) return false;
  if (o4 === 0 && onSegment(bx1, by1, bx2, by2, ax2, ay2)) return false;
  return false;
}

/**
 * Player Core pg. 418: "You have line of effect unless a creature is
 * entirely behind a solid physical barrier." Modeled here as a hard binary:
 * a straight line from the center of cell `a` to the center of cell `b`,
 * blocked if it crosses any sight-blocking wall. (Real SF2E's softer COVER
 * gradations from a PARTIAL obstruction are the deferred half — see this
 * file's header.)
 */
export function lineOfEffect(a, b, walls) {
  if (!walls?.length) return true;
  const line = [a.col + 0.5, a.row + 0.5, b.col + 0.5, b.row + 0.5];
  return !walls.some((w) => wallBlocksSight(w) && segmentsIntersect(line, w.c));
}
