/**
 * Tests for real Dijkstra pathfinding (design doc §15q). The single most
 * important test in this file is the distanceFeet cross-check: it proves the
 * diagonal-parity state-doubling trick reproduces SF2E's real 5-10-5
 * alternating-diagonal rule exactly, against the engine's own ALREADY-TRUSTED
 * distance function, rather than trusting a from-scratch reimplementation of
 * a genuinely fiddly rule.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { reachableCells, pathCost } from "../../tools/battle-simulator/ai/world/pathfind.mjs";
import { distanceFeet, FEET_PER_SQUARE } from "../../tools/battle-simulator/engine/grid.mjs";
import { EDGE_SENSE } from "../../tools/battle-simulator/engine/terrain.mjs";

const gridSize = { cols: 20, rows: 20 };

test("CROSS-CHECK: on an open grid, pathCost to any nearby cell exactly matches distanceFeet's real 5-10-5 rule", () => {
  const from = { col: 10, row: 10 };
  const targets = [
    { col: 11, row: 10 }, // 1 straight
    { col: 11, row: 11 }, // 1 diagonal (cheap)
    { col: 12, row: 12 }, // 2 diagonals (cheap + expensive = 150ft, not 100ft)
    { col: 13, row: 13 }, // 3 diagonals (cheap+expensive+cheap = 200ft)
    { col: 15, row: 12 }, // mixed: 2 diagonal + 3 straight
    { col: 10, row: 15 }  // 5 straight
  ];
  for (const to of targets) {
    const cost = pathCost({ from, to, maxFeet: 10000, gridSize, occupiedPositions: [], walls: [] });
    assert.equal(cost, distanceFeet(from, to), `mismatch for (${to.col},${to.row})`);
  }
});

test("reachableCells: an open grid within budget reaches every cell within that many feet, and no farther", () => {
  const cells = reachableCells({ from: { col: 10, row: 10 }, maxFeet: 100, gridSize, occupiedPositions: [], walls: [] });
  assert.ok(cells.has("11,10"), "1 square (50ft) must be reachable within a 100ft budget");
  assert.ok(cells.has("12,10"), "2 squares (100ft) must be reachable exactly at budget");
  assert.ok(!cells.has("13,10"), "3 squares (150ft) must NOT be reachable within a 100ft budget");
});

test("reachableCells: every returned path starts at `from` and ends at the target cell", () => {
  const cells = reachableCells({ from: { col: 5, row: 5 }, maxFeet: 200, gridSize, occupiedPositions: [], walls: [] });
  const entry = cells.get("7,5");
  assert.ok(entry, "expected (7,5) to be reachable");
  assert.deepEqual(entry.path[0], { col: 5, row: 5 });
  assert.deepEqual(entry.path[entry.path.length - 1], { col: 7, row: 5 });
});

test("reachableCells: another combatant's position blocks that cell, exactly like isOccupied elsewhere", () => {
  const cells = reachableCells({ from: { col: 0, row: 0 }, maxFeet: 500, gridSize, occupiedPositions: [{ col: 1, row: 0 }], walls: [] });
  assert.ok(!cells.has("1,0"), "an occupied cell must not appear as reachable");
  assert.ok(cells.has("2,0"), "a route AROUND the occupied cell must still be found");
});

test("REGRESSION: a straight wall blocks the direct route but pathfinding finds the way around it — this is the whole point of building pathfinding", () => {
  // A wall running the full length of column-boundary x=5, from row 0 to row 10 — a straight
  // barrier splitting the grid in two, with a gap only past row 10.
  const walls = [];
  for (let row = 0; row < 10; row++) walls.push({ c: [5, row, 5, row + 1], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NORMAL });
  const from = { col: 4, row: 5 }, to = { col: 6, row: 5 };
  const directDistance = distanceFeet(from, to); // 100ft — 2 squares, if the wall weren't there

  // A budget that covers the direct line exactly, but nowhere near enough for any detour: proves
  // the wall genuinely blocks the straight route, rather than pathCost just finding SOME route.
  assert.equal(pathCost({ from, to, maxFeet: directDistance, gridSize, occupiedPositions: [], walls }), Infinity,
    "with only enough budget for the direct line, the target must be unreachable — the wall really is in the way");

  // A generous budget finds the detour around the wall's open end (past row 10), and it must
  // cost strictly more than the blocked direct line — otherwise it isn't really a detour.
  const detourCost = pathCost({ from, to, maxFeet: 10000, gridSize, occupiedPositions: [], walls });
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
  const cells = reachableCells({ from: { col: 0, row: 0 }, maxFeet: 10000, gridSize, occupiedPositions: [], walls });
  assert.ok(!cells.has(`${c},${r}`), "a cell walled on all four sides must be unreachable from outside");
});

test("pathCost: returns Infinity for a target outside the budget or beyond any wall, never throws", () => {
  assert.equal(pathCost({ from: { col: 0, row: 0 }, to: { col: 19, row: 19 }, maxFeet: 50, gridSize, occupiedPositions: [], walls: [] }), Infinity);
});

test("a move-only wall (sight: NONE) still blocks pathfinding — pathfinding cares about the move axis, not sight", () => {
  // The wall sits exactly on the shared edge between (4,5) and (5,5) — the single ADJACENT step
  // it governs, so there's no possibility of a cheaper route "around" a lone edge muddying this.
  const walls = [{ c: [5, 5, 5, 6], move: EDGE_SENSE.NORMAL, sight: EDGE_SENSE.NONE }];
  const cost = pathCost({ from: { col: 4, row: 5 }, to: { col: 5, row: 5 }, maxFeet: FEET_PER_SQUARE, gridSize, occupiedPositions: [], walls });
  assert.equal(cost, Infinity, "sight:NONE must not exempt a move-blocking wall from blocking movement");
});
