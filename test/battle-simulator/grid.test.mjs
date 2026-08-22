import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceFeet, isAdjacent, isOccupied, isInBounds, reachFeetForStrike } from "../../tools/battle-simulator/engine/grid.mjs";

test("distanceFeet: straight orthogonal movement is plain 50ft/square (design doc §14f: 10x the PF2e/SF2e default 5ft)", () => {
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 3, row: 0 }), 150);
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 0, row: 4 }), 200);
});

test("distanceFeet: pure diagonal uses PF2e/SF2e's 5-10-5 rule at 10x scale (50-100-50-...), not flat 50ft/step", () => {
  // 1 diagonal step: 50ft (the first diagonal is always cheap)
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 1, row: 1 }), 50);
  // 2 diagonal steps: 50 + 100 = 150ft, NOT 100ft (flat) and NOT the D&D5e "diagonal=orthogonal" rule
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 2, row: 2 }), 150);
  // 3 diagonal steps: 50 + 100 + 50 = 200ft
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 3, row: 3 }), 200);
  // 4 diagonal steps: 50 + 100 + 50 + 100 = 300ft
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 4, row: 4 }), 300);
});

test("distanceFeet: mixed diagonal + straight (the real combat-grid case)", () => {
  // 2 diagonal (150ft) + 3 straight (150ft) = 300ft
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 5, row: 2 }), 300);
});

test("distanceFeet is symmetric", () => {
  const a = { col: 3, row: 7 };
  const b = { col: 9, row: 1 };
  assert.equal(distanceFeet(a, b), distanceFeet(b, a));
});

test("isAdjacent: true only at exactly 1 square Chebyshev distance, including diagonals", () => {
  const center = { col: 5, row: 5 };
  assert.equal(isAdjacent(center, { col: 6, row: 5 }), true);
  assert.equal(isAdjacent(center, { col: 6, row: 6 }), true); // diagonal adjacency counts
  assert.equal(isAdjacent(center, { col: 5, row: 5 }), false); // same square isn't "adjacent"
  assert.equal(isAdjacent(center, { col: 7, row: 5 }), false); // 2 squares away, not adjacent
});

test("isOccupied", () => {
  const others = [{ col: 1, row: 1 }, { col: 2, row: 2 }];
  assert.equal(isOccupied({ col: 1, row: 1 }, others), true);
  assert.equal(isOccupied({ col: 3, row: 3 }, others), false);
});

test("isInBounds respects the grid's actual size, not a hardcoded assumption", () => {
  const grid = { cols: 10, rows: 10 };
  assert.equal(isInBounds({ col: 0, row: 0 }, grid), true);
  assert.equal(isInBounds({ col: 9, row: 9 }, grid), true);
  assert.equal(isInBounds({ col: 10, row: 5 }, grid), false, "col 10 is out of bounds for a 10-wide grid (valid range 0-9)");
  assert.equal(isInBounds({ col: -1, row: 5 }, grid), false);
});

test("reachFeetForStrike: default melee reach is one square (adjacent) with no reach trait", () => {
  assert.equal(reachFeetForStrike({ traits: [] }), 50);
  assert.equal(reachFeetForStrike({ traits: ["magical"] }), 50, "an unrelated trait must not be misread as a reach value");
});

test("reachFeetForStrike: an explicit reach-N trait overrides the default", () => {
  assert.equal(reachFeetForStrike({ traits: ["reach-30"] }), 30);
  assert.equal(reachFeetForStrike({ traits: ["reach-10"] }), 10);
});
