/**
 * Real Dijkstra pathfinding for the PERSONNEL-SCALE engine (design doc §19) — the same algorithm
 * as ai/world/pathfind.mjs, byte-for-byte, with only the grid/terrain import swapped (see that
 * file's own header). The single most important test here, exactly as at Frame-scale: the
 * distanceFeet cross-check, proving the diagonal-parity state-doubling trick reproduces SF2E's
 * real 5-10-5 alternating-diagonal rule exactly, against the ALREADY-TRUSTED distance function
 * from personnel-grid.test.mjs, at the real 5ft grid this whole initiative exists to test at.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { reachableCells, pathCost } from "../../tools/battle-simulator/personnel-engine/world/pathfind.mjs";
import { distanceFeet, FEET_PER_SQUARE } from "../../tools/battle-simulator/personnel-engine/grid.mjs";
import { EDGE_SENSE } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";

const gridSize = { cols: 20, rows: 20 };

test("CROSS-CHECK: on an open grid, pathCost to any nearby cell exactly matches distanceFeet's real 5-10-5 rule", () => {
  const from = { col: 10, row: 10 };
  const targets = [
    { col: 11, row: 10 }, // 1 straight
    { col: 11, row: 11 }, // 1 diagonal (cheap)
    { col: 12, row: 12 }, // 2 diagonals (cheap + expensive = 15ft, not 10ft)
    { col: 13, row: 13 }, // 3 diagonals (cheap+expensive+cheap = 20ft)
    { col: 15, row: 12 }, // mixed: 2 diagonal + 3 straight
    { col: 10, row: 15 }  // 5 straight
  ];
  for (const to of targets) {
    const cost = pathCost({ from, to, maxFeet: 1000, gridSize, occupiedPositions: [], walls: [] });
    assert.equal(cost, distanceFeet(from, to), `mismatch for (${to.col},${to.row})`);
  }
});

test("reachableCells: an open grid within budget reaches every cell within that many feet, and no farther", () => {
  const cells = reachableCells({ from: { col: 10, row: 10 }, maxFeet: 10, gridSize, occupiedPositions: [], walls: [] });
  assert.ok(cells.has("11,10"), "1 square (5ft) must be reachable within a 10ft budget");
  assert.ok(cells.has("12,10"), "2 squares (10ft) must be reachable exactly at budget");
  assert.ok(!cells.has("13,10"), "3 squares (15ft) must NOT be reachable within a 10ft budget");
});

test("reachableCells: every returned path starts at `from` and ends at the target cell", () => {
  const cells = reachableCells({ from: { col: 5, row: 5 }, maxFeet: 20, gridSize, occupiedPositions: [], walls: [] });
  const entry = cells.get("7,5");
  assert.ok(entry, "expected (7,5) to be reachable");
  assert.deepEqual(entry.path[0], { col: 5, row: 5 });
  assert.deepEqual(entry.path[entry.path.length - 1], { col: 7, row: 5 });
});

// GH #62 (design doc §76.4): a full-grid flood's own path reconstruction was measured at 32-76% of
// that flood's total cost, and both of its real callers (trueDistanceField, pathCost) only ever
// read `.cost`. `includePath: false` skips reconstruction. These tests are the load-bearing proof
// that skipping it changes NOTHING a caller can observe except the discarded field itself.
test("reachableCells: includePath:false returns null paths but the EXACT SAME reachable set and costs as includePath:true, on a map with real walls", () => {
  const walls = [];
  for (let row = 0; row < 8; row++) walls.push({ c: [5, row, 5, row + 1], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL });
  const args = { from: { col: 2, row: 5 }, maxFeet: 400, gridSize, occupiedPositions: [{ col: 3, row: 6 }], walls, moverSide: "party" };

  const withPath = reachableCells(args);
  const withoutPath = reachableCells({ ...args, includePath: false });

  assert.ok(withPath.size > 10, "sanity: this scenario must actually reach a real number of cells");
  assert.equal(withoutPath.size, withPath.size, "includePath must never change WHICH cells are reachable");
  for (const [cellKey, { cost }] of withPath) {
    assert.equal(withoutPath.get(cellKey)?.cost, cost, `cost for ${cellKey} must be identical either way`);
    assert.equal(withoutPath.get(cellKey).path, null, `path for ${cellKey} must be explicitly null, not a real route, when includePath is false`);
  }
});

test("pathCost: always returns the same number regardless of the (irrelevant, since pathCost never returns a route) includePath default — proves the internal includePath:false wiring is behavior-neutral", () => {
  const walls = [];
  for (let row = 0; row < 8; row++) walls.push({ c: [5, row, 5, row + 1], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL });
  const from = { col: 2, row: 5 }, to = { col: 8, row: 5 };
  const cost = pathCost({ from, to, maxFeet: 400, gridSize, occupiedPositions: [], walls });
  const viaExplicitPath = reachableCells({ from, maxFeet: 400, gridSize, occupiedPositions: [], walls }).get("8,5")?.cost;
  assert.equal(cost, viaExplicitPath, "pathCost's own includePath:false optimization must not change the cost it reports");
});

test("reachableCells: another combatant's position blocks that cell, exactly like isOccupied elsewhere", () => {
  const cells = reachableCells({ from: { col: 0, row: 0 }, maxFeet: 50, gridSize, occupiedPositions: [{ col: 1, row: 0 }], walls: [] });
  assert.ok(!cells.has("1,0"), "an occupied cell must not appear as reachable");
  assert.ok(cells.has("2,0"), "a route AROUND the occupied cell must still be found");
});

test("REGRESSION-GUARD: a straight wall blocks the direct route but pathfinding finds the way around it — this is the whole point of building pathfinding, and exactly what Phase 1b's building depends on", () => {
  const walls = [];
  for (let row = 0; row < 10; row++) walls.push({ c: [5, row, 5, row + 1], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL });
  const from = { col: 4, row: 5 }, to = { col: 6, row: 5 };
  const directDistance = distanceFeet(from, to); // 10ft — 2 squares, if the wall weren't there

  assert.equal(pathCost({ from, to, maxFeet: directDistance, gridSize, occupiedPositions: [], walls }), Infinity,
    "with only enough budget for the direct line, the target must be unreachable — the wall really is in the way");

  const detourCost = pathCost({ from, to, maxFeet: 1000, gridSize, occupiedPositions: [], walls });
  assert.ok(Number.isFinite(detourCost), "a route around the wall's open end must exist at a generous budget");
  assert.ok(detourCost > directDistance, `the detour (${detourCost}ft) must cost more than the blocked direct line (${directDistance}ft)`);
});

test("reachableCells: a fully enclosed cell (walls on all four sides) is unreachable", () => {
  const r = 5, c = 5;
  const walls = [
    { c: [c, r, c + 1, r], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL },
    { c: [c, r + 1, c + 1, r + 1], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL },
    { c: [c, r, c, r + 1], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL },
    { c: [c + 1, r, c + 1, r + 1], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL }
  ];
  const cells = reachableCells({ from: { col: 0, row: 0 }, maxFeet: 1000, gridSize, occupiedPositions: [], walls });
  assert.ok(!cells.has(`${c},${r}`), "a cell walled on all four sides must be unreachable from outside — a room with no door");
});

test("pathCost: returns Infinity for a target outside the budget, never throws", () => {
  assert.equal(pathCost({ from: { col: 0, row: 0 }, to: { col: 19, row: 19 }, maxFeet: 5, gridSize, occupiedPositions: [], walls: [] }), Infinity);
});

test("a move-only wall (sight: NONE) still blocks pathfinding — pathfinding cares about the move axis, not sight", () => {
  const walls = [{ c: [5, 5, 5, 6], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NONE }];
  const cost = pathCost({ from: { col: 4, row: 5 }, to: { col: 5, row: 5 }, maxFeet: FEET_PER_SQUARE, gridSize, occupiedPositions: [], walls });
  assert.equal(cost, Infinity, "sight:NONE must not exempt a move-blocking wall from blocking movement");
});

// --- Faction-aware occupancy (design doc §24 — Ingram's own direct correction: "Characters can
// move through friendly character spaces per the rules") ---

test("reachableCells: a DIFFERENT-side occupant still fully blocks — both unreachable itself AND unpassable (exactly the pre-existing rule, now scoped to real enemies only)", () => {
  const cells = reachableCells({ from: { col: 0, row: 0 }, maxFeet: 50, gridSize, occupiedPositions: [{ col: 1, row: 0, side: "opposition" }], moverSide: "party", walls: [] });
  assert.ok(!cells.has("1,0"), "an enemy-occupied cell must not appear as reachable");
  assert.ok(cells.has("2,0"), "a route around the enemy must still be found");
});

test("reachableCells: a SAME-side occupant's cell is never itself a valid destination, but cells BEYOND it are reachable at the true (through-the-ally) cost, not routed around", () => {
  // A single ally sits directly between (0,0) and (2,0) — with the old any-occupant-blocks rule,
  // reaching (2,0) required detouring around; the real rule says walking straight through costs
  // exactly the straight-line distance.
  const cells = reachableCells({ from: { col: 0, row: 0 }, maxFeet: 50, gridSize, occupiedPositions: [{ col: 1, row: 0, side: "party" }], moverSide: "party", walls: [] });
  assert.ok(!cells.has("1,0"), "the ally's own square must never be a selectable destination");
  assert.ok(cells.has("2,0"), "the cell beyond the ally must be reachable");
  assert.equal(cells.get("2,0").cost, distanceFeet({ col: 0, row: 0 }, { col: 2, row: 0 }), "walking straight through an ally costs the true straight-line distance, not a detour");
});

test("reachableCells: with no moverSide supplied, an occupant blocks regardless of its own side — the safe default, matching isOccupied's original behavior", () => {
  const cells = reachableCells({ from: { col: 0, row: 0 }, maxFeet: 50, gridSize, occupiedPositions: [{ col: 1, row: 0, side: "party" }], walls: [] }); // no moverSide
  assert.ok(!cells.has("1,0"));
});

test("an open doorway (a gap in an otherwise-solid wall run) IS traversable through the gap — the actual mechanism Phase 1b's rooms use", () => {
  // A wall spanning columns 0-10 at row=5, except a 1-square gap at column 5 (the "doorway").
  const walls = [];
  for (let col = 0; col < 10; col++) {
    if (col === 5) continue; // the doorway
    walls.push({ c: [col, 5, col + 1, 5], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL });
  }
  const from = { col: 5, row: 3 }, to = { col: 5, row: 7 }; // straight through the gap
  const cost = pathCost({ from, to, maxFeet: 1000, gridSize: { cols: 20, rows: 20 }, occupiedPositions: [], walls });
  assert.equal(cost, distanceFeet(from, to), "the doorway must be exactly as cheap as open ground — no detour needed when walking straight through it");
});
