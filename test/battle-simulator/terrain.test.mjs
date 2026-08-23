/**
 * Tests for the wall/terrain primitives (design doc §15p). Authored against
 * Foundry's own Wall schema on purpose — c:[x0,y0,x1,y1] in grid-vertex
 * coordinates, move/sight as EDGE_SENSE values — so these tests double as
 * the contract that a wall authored here round-trips into the Foundry
 * module unchanged.
 *
 * The single most important property under test: an EMPTY wall list must be
 * indistinguishable from no terrain code existing at all, since every
 * scenario in this project has zero walls today and will until real city
 * terrain is authored elsewhere.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { EDGE_SENSE, wallBlocksMove, wallBlocksSight, edgesBetween, moveBlockedBetween, segmentsIntersect, lineOfEffect } from "../../tools/battle-simulator/engine/terrain.mjs";

test("wallBlocksMove/wallBlocksSight: NONE and LIMITED do not block, NORMAL and above do", () => {
  assert.equal(wallBlocksMove({ move: EDGE_SENSE.NONE }), false);
  assert.equal(wallBlocksMove({ move: EDGE_SENSE.LIMITED }), false);
  assert.equal(wallBlocksMove({ move: EDGE_SENSE.NORMAL }), true);
  assert.equal(wallBlocksSight({ sight: EDGE_SENSE.NORMAL }), true);
  assert.equal(wallBlocksMove({}), false, "a missing field defaults to NONE, not a crash");
});

test("edgesBetween: an orthogonal step crosses exactly one edge, on the shared boundary — the SAME edge regardless of which direction you cross it (an edge has no direction of its own)", () => {
  assert.deepEqual(edgesBetween({ col: 2, row: 2 }, { col: 3, row: 2 }), [[3, 2, 3, 3]]); // moving right (+col)
  assert.deepEqual(edgesBetween({ col: 3, row: 2 }, { col: 2, row: 2 }), [[3, 2, 3, 3]]); // moving left (-col) — same edge
  assert.deepEqual(edgesBetween({ col: 2, row: 2 }, { col: 2, row: 3 }), [[2, 3, 3, 3]]); // moving down (+row)
  assert.deepEqual(edgesBetween({ col: 2, row: 3 }, { col: 2, row: 2 }), [[2, 3, 3, 3]]); // moving up (-row) — same edge
});

function sortedEdges(edges) {
  return edges.map((e) => e.join(",")).sort();
}

test("edgesBetween: a diagonal step crosses all FOUR edges around the shared corner, not just the two adjacent to the departure cell", () => {
  // Both diagonals of the 2x2 block {(2,2),(3,2),(2,3),(3,3)} pass through the same corner
  // (3,3) and must therefore check the SAME four edges — a wall on any one of them represents
  // a real obstruction at that corner, regardless of which diagonal direction is cutting it.
  const expected = sortedEdges([[3, 2, 3, 3], [2, 3, 3, 3], [3, 3, 4, 3], [3, 3, 3, 4]]);
  assert.deepEqual(sortedEdges(edgesBetween({ col: 2, row: 3 }, { col: 3, row: 2 })), expected);
  assert.deepEqual(sortedEdges(edgesBetween({ col: 2, row: 2 }, { col: 3, row: 3 })), expected);
});

test("REGRESSION: edgesBetween includes the ARRIVAL cell's own edges, not just the departure cell's — a wall exactly on the destination cell's border must still block a diagonal cut into it", () => {
  // The wall sits on cell (5,5)'s own top edge — not touched by (4,4)'s edges at all.
  const arrivalEdge = [5, 5, 6, 5];
  const edges = sortedEdges(edgesBetween({ col: 4, row: 4 }, { col: 5, row: 5 }));
  assert.ok(edges.includes(arrivalEdge.join(",")), `expected the arrival cell's own edge ${arrivalEdge} to be checked, got ${edges}`);
});

test("REGRESSION: edgesBetween is symmetric — the same four edges regardless of travel direction", () => {
  const forward = sortedEdges(edgesBetween({ col: 4, row: 4 }, { col: 5, row: 5 }));
  const backward = sortedEdges(edgesBetween({ col: 5, row: 5 }, { col: 4, row: 4 }));
  assert.deepEqual(forward, backward);
});

test("moveBlockedBetween: an empty wall list never blocks anything — the required equivalence to 'no terrain exists'", () => {
  assert.equal(moveBlockedBetween({ col: 2, row: 2 }, { col: 3, row: 2 }, []), false);
  assert.equal(moveBlockedBetween({ col: 2, row: 2 }, { col: 3, row: 2 }, undefined), false);
});

test("moveBlockedBetween: a wall exactly on the shared edge blocks an orthogonal step", () => {
  const walls = [{ c: [3, 2, 3, 3], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];
  assert.equal(moveBlockedBetween({ col: 2, row: 2 }, { col: 3, row: 2 }, walls), true);
});

test("moveBlockedBetween: a wall on an UNRELATED edge does not block a different step", () => {
  const walls = [{ c: [3, 2, 3, 3], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];
  assert.equal(moveBlockedBetween({ col: 5, row: 5 }, { col: 6, row: 5 }, walls), false);
});

test("moveBlockedBetween: a sight-only wall (move: NONE) does not block movement", () => {
  const walls = [{ c: [3, 2, 3, 3], move: EDGE_SENSE.NONE, sight: EDGE_SENSE.NORMAL }]; // a window
  assert.equal(moveBlockedBetween({ col: 2, row: 2 }, { col: 3, row: 2 }, walls), false);
});

test("moveBlockedBetween: a diagonal is blocked if EITHER flanking edge has a wall (no corner-cutting)", () => {
  const wallOnH = [{ c: [3, 3, 3, 4], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];
  const wallOnV = [{ c: [2, 3, 3, 3], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];
  assert.equal(moveBlockedBetween({ col: 2, row: 3 }, { col: 3, row: 2 }, wallOnH), true);
  assert.equal(moveBlockedBetween({ col: 2, row: 3 }, { col: 3, row: 2 }, wallOnV), true);
});

test("segmentsIntersect: two crossing segments intersect; two that merely touch endpoints do not (SF2E's 'a small gap is enough')", () => {
  assert.equal(segmentsIntersect([0, 0, 10, 10], [0, 10, 10, 0]), true, "a real X crossing");
  assert.equal(segmentsIntersect([0, 0, 5, 5], [5, 5, 10, 0]), false, "segments that only touch at a shared endpoint");
  assert.equal(segmentsIntersect([0, 0, 10, 0], [20, 0, 30, 0]), false, "collinear but not overlapping");
});

test("lineOfEffect: an empty wall list never blocks sight — the same required equivalence to 'no terrain'", () => {
  assert.equal(lineOfEffect({ col: 0, row: 0 }, { col: 10, row: 10 }, []), true);
});

test("lineOfEffect: a wall directly between two cells' centers blocks line of effect", () => {
  // Cells (2,5) and (7,5) share row 5; a wall spanning the full row-5 corridor between them blocks it.
  const walls = [{ c: [4, 4, 4, 6], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];
  assert.equal(lineOfEffect({ col: 2, row: 5 }, { col: 7, row: 5 }, walls), false);
});

test("lineOfEffect: a wall NOT between the two cells leaves line of effect intact", () => {
  const walls = [{ c: [4, 20, 4, 22], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }]; // far away
  assert.equal(lineOfEffect({ col: 2, row: 5 }, { col: 7, row: 5 }, walls), true);
});

test("lineOfEffect: a move-only wall (move: NORMAL, sight: NONE) — a plain physical block with no sight component — does not block sight (e.g. a low barrier)", () => {
  const walls = [{ c: [4, 4, 4, 6], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NONE }];
  assert.equal(lineOfEffect({ col: 2, row: 5 }, { col: 7, row: 5 }, walls), true);
});

test("REGRESSION: lineOfEffect is symmetric — order of the two cells must not change the result", () => {
  const walls = [{ c: [4, 4, 4, 6], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];
  const a = { col: 2, row: 5 }, b = { col: 7, row: 5 };
  assert.equal(lineOfEffect(a, b, walls), lineOfEffect(b, a, walls));
});

test("DOCUMENTATION TRAP: a single long multi-cell wall segment blocks Line of Effect across its whole span but blocks movement at ZERO edges along that span (not 'everywhere except one edge' — moveBlockedBetween's exact-endpoint match can never equal a longer segment's endpoints, no matter where along it you step)", () => {
  // The tempting-but-wrong shorthand for "one wall spanning 8 rows" — see terrain.mjs's own
  // header for the full explanation of why this is a trap.
  const longWall = [{ c: [6, 0, 6, 8], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }];

  // Line of Effect: true geometric intersection doesn't care how long the segment is.
  assert.equal(lineOfEffect({ col: 2, row: 4 }, { col: 10, row: 4 }, longWall), false, "sight should be blocked crossing anywhere along the span");

  // Movement: NOT ONE of the 8 unit-length steps along the wall's span is blocked — the wall is
  // fully walkable through, silently, despite correctly blocking sight.
  for (let row = 0; row < 8; row++) {
    assert.equal(moveBlockedBetween({ col: 5, row }, { col: 6, row }, longWall), false, `row ${row}: the long segment should NOT block this step (that's the trap)`);
  }

  // The fix is an authoring convention, not a code change: the identical span authored as a loop
  // of unit-length edges (one per row crossed — see data/personnel-test-facility.mjs for a real
  // example) blocks movement correctly at every row, while still blocking Line of Effect exactly
  // as before.
  const loopWall = [];
  for (let row = 0; row < 8; row++) loopWall.push({ c: [6, row, 6, row + 1], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL });
  for (let row = 0; row < 8; row++) {
    assert.equal(moveBlockedBetween({ col: 5, row }, { col: 6, row }, loopWall), true, `row ${row}: should block once authored as unit-length edges`);
  }
  assert.equal(lineOfEffect({ col: 2, row: 4 }, { col: 10, row: 4 }, loopWall), false, "sight should still be blocked with the loop authoring");
});
