/**
 * Tests for the randomized arc-based deployment generator (design doc §35).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { rayToBoxEdge, clusterPositions, generateRandomArcDeployment } from "../../tools/battle-simulator/scenarios/random-deployment.mjs";
import { makeRng } from "../../tools/battle-simulator/shared/rng.mjs";
import { lineOfEffect } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";

// ---------------------------------------------------------------------------
// rayToBoxEdge
// ---------------------------------------------------------------------------

test("rayToBoxEdge: straight along +x lands exactly on the right edge", () => {
  const p = rayToBoxEdge({ col: 10, row: 10 }, 0, 8, 5);
  assert.equal(p.col, 18);
  assert.equal(p.row, 10);
});

test("rayToBoxEdge: straight along -y (up) lands exactly on the top edge", () => {
  const p = rayToBoxEdge({ col: 10, row: 10 }, -Math.PI / 2, 8, 5);
  assert.ok(Math.abs(p.col - 10) < 1e-9);
  assert.ok(Math.abs(p.row - 5) < 1e-9);
});

test("rayToBoxEdge: a diagonal angle stays within the box on both axes (real intersection, not an overshoot)", () => {
  const p = rayToBoxEdge({ col: 10, row: 10 }, Math.PI / 4, 8, 5);
  assert.ok(p.col <= 18 + 1e-6 && p.col >= 2 - 1e-6);
  assert.ok(p.row <= 15 + 1e-6 && p.row >= 5 - 1e-6);
  // +col/+row at PI/4 (standard math angle, row increasing downward like the rest of this grid) is
  // down-right — a narrower box (halfH < halfW) hit going down-right must exit through the BOTTOM
  // edge (row = 10+halfH = 15) before it ever reaches the right edge (col = 10+halfW = 18).
  assert.ok(Math.abs(p.row - 15) < 1e-6, `expected the shorter (row) edge to be hit first, got row=${p.row}`);
});

// ---------------------------------------------------------------------------
// clusterPositions
// ---------------------------------------------------------------------------

test("clusterPositions: places the requested count, one per cell, starting at the anchor itself", () => {
  const gridSize = { cols: 20, rows: 20 };
  const positions = clusterPositions({ col: 5, row: 5 }, 3, gridSize, [], []);
  assert.equal(positions.length, 3);
  assert.deepEqual(positions[0], { col: 5, row: 5 });
  const keys = new Set(positions.map((p) => `${p.col},${p.row}`));
  assert.equal(keys.size, 3, "every placed cell must be distinct");
});

test("clusterPositions: never reuses a cell already given in `avoid`", () => {
  const gridSize = { cols: 20, rows: 20 };
  const positions = clusterPositions({ col: 5, row: 5 }, 1, gridSize, [{ col: 5, row: 5 }], []);
  assert.notDeepEqual(positions[0], { col: 5, row: 5 });
});

test("clusterPositions: returns null (never a partial result) when it can't fit everyone within the offset ring", () => {
  const gridSize = { cols: 20, rows: 20 };
  // Occupy every cell the offset ring could possibly reach except a couple — asking for more than
  // that must fail cleanly, not silently return fewer combatants than requested.
  const avoid = [];
  for (let dc = -3; dc <= 3; dc++) for (let dr = -3; dr <= 3; dr++) avoid.push({ col: 5 + dc, row: 5 + dr });
  const positions = clusterPositions({ col: 5, row: 5 }, 1, gridSize, avoid, []);
  assert.equal(positions, null);
});

test("clusterPositions: a wall sealing off an adjacent cell from the anchor is skipped, not silently used", () => {
  const gridSize = { cols: 20, rows: 20 };
  // Seal the (6,5) cell's shared edge with the anchor at (5,5) — a real Foundry Wall segment.
  const walls = [{ c: [6, 5, 6, 6], move: 20, sight: 20 }];
  const positions = clusterPositions({ col: 5, row: 5 }, 2, gridSize, [], walls);
  assert.equal(positions.length, 2);
  assert.ok(!positions.some((p) => p.col === 6 && p.row === 5), "the sealed-off neighbor must never be chosen");
});

// ---------------------------------------------------------------------------
// generateRandomArcDeployment
// ---------------------------------------------------------------------------

const OPEN_GRID = { cols: 60, rows: 40 };
// A single solid wall straight down the vertical center — real Foundry Wall segments, unit-length
// edges (matching this project's own wall-authoring convention elsewhere).
function centerDividerWalls(gridSize) {
  const segs = [];
  for (let r = 0; r < gridSize.rows; r++) segs.push({ c: [gridSize.cols / 2, r, gridSize.cols / 2, r + 1], move: 20, sight: 20 });
  return segs;
}

test("generateRandomArcDeployment: with a real dividing wall, produces a deployment with genuinely ZERO cross-side Line of Effect", () => {
  const walls = centerDividerWalls(OPEN_GRID);
  const { partyPositions, oppositionPositions } = generateRandomArcDeployment({
    gridSize: OPEN_GRID, walls, partyCount: 3, oppositionCount: 3, rng: makeRng(1)
  });
  for (const p of partyPositions) {
    for (const o of oppositionPositions) {
      assert.equal(lineOfEffect(p, o, walls), false, `expected NO line of effect between party ${JSON.stringify(p)} and opposition ${JSON.stringify(o)}`);
    }
  }
});

test("generateRandomArcDeployment: every placed combatant is in-bounds and no two combatants (either side) share a cell", () => {
  const walls = centerDividerWalls(OPEN_GRID);
  const { partyPositions, oppositionPositions } = generateRandomArcDeployment({
    gridSize: OPEN_GRID, walls, partyCount: 3, oppositionCount: 3, rng: makeRng(42)
  });
  const all = [...partyPositions, ...oppositionPositions];
  for (const p of all) {
    assert.ok(p.col >= 0 && p.col < OPEN_GRID.cols && p.row >= 0 && p.row < OPEN_GRID.rows, `${JSON.stringify(p)} out of bounds`);
  }
  const keys = new Set(all.map((p) => `${p.col},${p.row}`));
  assert.equal(keys.size, all.length, "no two combatants may share a starting cell");
});

test("generateRandomArcDeployment: fully reproducible — the SAME seed produces the IDENTICAL deployment every time", () => {
  const walls = centerDividerWalls(OPEN_GRID);
  const build = () => generateRandomArcDeployment({ gridSize: OPEN_GRID, walls, partyCount: 3, oppositionCount: 3, rng: makeRng(777) });
  const a = build();
  const b = build();
  assert.deepEqual(a.partyPositions, b.partyPositions);
  assert.deepEqual(a.oppositionPositions, b.oppositionPositions);
});

test("generateRandomArcDeployment: different seeds produce genuinely different deployments — real variety, not a fixed lineup", () => {
  const walls = centerDividerWalls(OPEN_GRID);
  const seen = new Set();
  for (let seed = 1; seed <= 8; seed++) {
    const { partyPositions } = generateRandomArcDeployment({ gridSize: OPEN_GRID, walls, partyCount: 3, oppositionCount: 3, rng: makeRng(seed) });
    seen.add(JSON.stringify(partyPositions[0]));
  }
  assert.ok(seen.size > 1, `expected real variety across 8 seeds, got only ${seen.size} distinct opening position(s)`);
});

test("generateRandomArcDeployment: the two sides' anchor directions are always at least minArcSeparationDeg apart — checked structurally across many seeds, not just eyeballed", () => {
  const walls = centerDividerWalls(OPEN_GRID);
  const center = { col: OPEN_GRID.cols / 2, row: OPEN_GRID.rows / 2 };
  for (let seed = 1; seed <= 20; seed++) {
    const { partyPositions, oppositionPositions } = generateRandomArcDeployment({ gridSize: OPEN_GRID, walls, partyCount: 1, oppositionCount: 1, rng: makeRng(seed), minArcSeparationDeg: 90 });
    const angleA = Math.atan2(partyPositions[0].row - center.row, partyPositions[0].col - center.col);
    const angleB = Math.atan2(oppositionPositions[0].row - center.row, oppositionPositions[0].col - center.col);
    let deltaDeg = Math.abs(((angleA - angleB) * 180) / Math.PI) % 360;
    if (deltaDeg > 180) deltaDeg = 360 - deltaDeg;
    assert.ok(deltaDeg >= 85, `seed ${seed}: expected >=90° separation (allowing for anchor rounding), got ${deltaDeg.toFixed(1)}°`);
  }
});

test("generateRandomArcDeployment: on a map with NO walls at all, Line of Effect can never be blocked (lineOfEffect's own documented no-walls-means-always-clear rule) — deployment must exhaust its attempts and throw a clear error, never silently return a deployment that violates its own guarantee", () => {
  assert.throws(
    () => generateRandomArcDeployment({ gridSize: OPEN_GRID, walls: [], partyCount: 3, oppositionCount: 3, rng: makeRng(1), maxAttempts: 5 }),
    /no valid no-initial-Line-of-Effect deployment/
  );
});
