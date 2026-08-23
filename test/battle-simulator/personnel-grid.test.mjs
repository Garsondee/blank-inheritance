/**
 * Personnel-scale grid math (design doc §19) — the real, unscaled SF2E 5ft grid, structurally
 * identical in shape to engine/grid.mjs (see grid.test.mjs) but at 1/10th the distance unit. The
 * numbers here are the actual real-table numbers a physical SF2E session would use.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceFeet, isAdjacent, isOccupied, blocksPassage, isInBounds, reachFeetForStrike, FEET_PER_SQUARE } from "../../tools/battle-simulator/personnel-engine/grid.mjs";

test("FEET_PER_SQUARE is the real, unscaled SF2E grid (5ft), not this project's 10x campaign rescale", () => {
  assert.equal(FEET_PER_SQUARE, 5);
});

test("distanceFeet: straight orthogonal movement is plain 5ft/square", () => {
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 3, row: 0 }), 15);
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 0, row: 4 }), 20);
});

test("distanceFeet: pure diagonal uses PF2e/SF2e's real 5-10-5 rule, not flat 5ft/step", () => {
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 1, row: 1 }), 5);   // 1st diagonal: cheap
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 2, row: 2 }), 15);  // 5 + 10
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 3, row: 3 }), 20);  // 5 + 10 + 5
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 4, row: 4 }), 30);  // 5 + 10 + 5 + 10
});

test("distanceFeet: mixed diagonal + straight", () => {
  // 2 diagonal (15ft) + 3 straight (15ft) = 30ft
  assert.equal(distanceFeet({ col: 0, row: 0 }, { col: 5, row: 2 }), 30);
});

test("distanceFeet is symmetric", () => {
  const a = { col: 3, row: 7 };
  const b = { col: 9, row: 1 };
  assert.equal(distanceFeet(a, b), distanceFeet(b, a));
});

test("isAdjacent: true only at exactly 1 square Chebyshev distance, including diagonals", () => {
  const center = { col: 5, row: 5 };
  assert.equal(isAdjacent(center, { col: 6, row: 5 }), true);
  assert.equal(isAdjacent(center, { col: 6, row: 6 }), true);
  assert.equal(isAdjacent(center, { col: 5, row: 5 }), false);
  assert.equal(isAdjacent(center, { col: 7, row: 5 }), false);
});

test("isOccupied / isInBounds behave the same as the Frame-scale versions, independent of the distance unit", () => {
  const others = [{ col: 1, row: 1 }, { col: 2, row: 2 }];
  assert.equal(isOccupied({ col: 1, row: 1 }, others), true);
  assert.equal(isOccupied({ col: 3, row: 3 }, others), false);
  const grid = { cols: 10, rows: 10 };
  assert.equal(isInBounds({ col: 9, row: 9 }, grid), true);
  assert.equal(isInBounds({ col: 10, row: 5 }, grid), false);
});

test("reachFeetForStrike: default melee reach is exactly one 5ft square (real SF2E melee reach), not the Frame-scale 50ft", () => {
  assert.equal(reachFeetForStrike({ traits: [] }), 5);
  assert.equal(reachFeetForStrike({ traits: ["magical"] }), 5, "an unrelated trait must not be misread as a reach value");
});

test("reachFeetForStrike: an explicit reach-N trait overrides the default with its own real feet value", () => {
  assert.equal(reachFeetForStrike({ traits: ["reach-10"] }), 10, "e.g. a real SF2E reach weapon's +5ft over standard melee");
  assert.equal(reachFeetForStrike({ traits: ["reach-15"] }), 15);
});

// --- blocksPassage (design doc §24 — Ingram's own direct correction: "Characters can move through
// friendly character spaces per the rules") ---

test("blocksPassage: a DIFFERENT-side occupant blocks passage, same as isOccupied", () => {
  const others = [{ col: 4, row: 0, side: "opposition" }];
  assert.equal(blocksPassage({ col: 4, row: 0 }, others, "party"), true);
});

test("blocksPassage: a SAME-side occupant does NOT block passage — the whole point of the fix", () => {
  const others = [{ col: 4, row: 0, side: "party" }];
  assert.equal(blocksPassage({ col: 4, row: 0 }, others, "party"), false);
});

test("blocksPassage: an empty square never blocks, regardless of side", () => {
  const others = [{ col: 4, row: 0, side: "party" }];
  assert.equal(blocksPassage({ col: 9, row: 9 }, others, "party"), false);
});

test("blocksPassage: with moverSide == null (no side info supplied anywhere), falls back to isOccupied's original any-occupant rule rather than silently treating every occupant as passable", () => {
  const others = [{ col: 4, row: 0, side: "party" }];
  assert.equal(blocksPassage({ col: 4, row: 0 }, others, null), true, "no side info must not silently become 'nothing ever blocks'");
  assert.equal(blocksPassage({ col: 4, row: 0 }, others, undefined), true);
});
