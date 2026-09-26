/**
 * Tests for this session's two additions to the shared `terrain.mjs` (design doc §22; moved from
 * `engine/terrain.mjs` to `shared/terrain.mjs` 2026-09-19 when the frame-scale engine it used to
 * sit alongside was deleted):
 * standard cover (`hasCover`/`STANDARD_COVER_AC_BONUS`, Player Core pg. 416) and the
 * `moveBlockedBetween` performance fix (a cached edge index replacing an O(walls) linear scan).
 * Kept in a new file rather than appended to terrain.test.mjs, which has its own real, separately
 * in-progress work on disk right now — this file only ever touches what's new here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { hasCover, STANDARD_COVER_AC_BONUS, moveBlockedBetween, lineOfEffect, wallBlocksMove, wallBlocksSight } from "../../tools/battle-simulator/shared/terrain.mjs";

// --- hasCover ---

test("hasCover: false with no walls at all", () => {
  assert.equal(hasCover({ col: 0, row: 0 }, { col: 5, row: 0 }, []), false);
  assert.equal(hasCover({ col: 0, row: 0 }, { col: 5, row: 0 }, undefined), false);
});

test("hasCover: false when the line between attacker and target crosses no cover-marked wall", () => {
  const walls = [{ c: [2, 5, 2, 6], cover: true }]; // well off the (0,0)->(5,0) line
  assert.equal(hasCover({ col: 0, row: 0 }, { col: 5, row: 0 }, walls), false);
});

test("hasCover: true when the line crosses a real cover-marked wall segment", () => {
  const walls = [{ c: [2, -1, 2, 2], cover: true }]; // vertical segment crossing row 0 between col 1 and 2
  assert.equal(hasCover({ col: 0, row: 0 }, { col: 5, row: 0 }, walls), true);
});

test("hasCover: independent of move/sight — an ordinary sight-and-move-blocking wall grants NO cover unless it's also marked cover:true (a solid wall and a cover object are different things, not the same slider)", () => {
  const solidWall = [{ c: [2, -1, 2, 2], move: 20, sight: 20 }]; // no `cover` field at all
  assert.equal(hasCover({ col: 0, row: 0 }, { col: 5, row: 0 }, solidWall), false);
});

test("hasCover: a cover object does NOT block line of effect — you can still see and target a creature behind cover, that's the whole point of a circumstance bonus instead of an illegal shot", () => {
  const coverOnly = [{ c: [2, -1, 2, 2], move: 20, sight: 0, cover: true }]; // sight explicitly NOT blocking
  assert.equal(lineOfEffect({ col: 0, row: 0 }, { col: 5, row: 0 }, coverOnly), true);
  assert.equal(hasCover({ col: 0, row: 0 }, { col: 5, row: 0 }, coverOnly), true);
});

test("hasCover: a real window (move-blocking, sight-open, per design doc §22) still blocks movement but grants no cover of its own — a window and a cover object are two independent, separately-opted-in properties on a wall segment", () => {
  // moveBlockedBetween matches a UNIT edge exactly (terrain.mjs's own documented authoring rule) —
  // the crossing from (1,0)->(2,0) is the unit edge [2,0,2,1]. lineOfEffect/hasCover, in contrast,
  // use real 2D intersection, so the same longer segment used in the other tests above would also
  // work for those two calls; a unit edge is used throughout here for one consistent wall object.
  const window = [{ c: [2, 0, 2, 1], move: 20, sight: 0 }]; // move blocks, sight doesn't, no cover flag
  assert.equal(moveBlockedBetween({ col: 1, row: 0 }, { col: 2, row: 0 }, window), true, "a window still physically blocks a Stride through it");
  assert.equal(lineOfEffect({ col: 0, row: 0 }, { col: 5, row: 0 }, window), true, "but not sight/targeting");
  assert.equal(hasCover({ col: 0, row: 0 }, { col: 5, row: 0 }, window), false, "and grants no cover bonus on its own");
});

test("STANDARD_COVER_AC_BONUS is the real Player Core number (+2), not an invented placeholder", () => {
  assert.equal(STANDARD_COVER_AC_BONUS, 2);
});

test("hasCover: real cover, authored the way the actual map now does (move:0 — design doc §24), does NOT block movement — the fix for a real bug where a 4-sided cover perimeter with move:20 sealed a spawn point inside it with no way out", () => {
  const realCover = [{ c: [2, 0, 2, 1], move: 0, sight: 0, cover: true }]; // unit edge, matching the actual coverBlock() shape
  assert.equal(moveBlockedBetween({ col: 1, row: 0 }, { col: 2, row: 0 }, realCover), false, "cover must be walkable through, unlike a window or a wall");
  assert.equal(wallBlocksMove(realCover[0]), false);
  assert.equal(hasCover({ col: 0, row: 0 }, { col: 5, row: 0 }, realCover), true, "still grants the circumstance bonus — cover blocks neither movement nor sight, only makes you harder to hit");
});

// --- moveBlockedBetween performance fix: correctness of the cached index, not just its speed ---

test("moveBlockedBetween: the cached index produces identical answers across repeated calls with the SAME walls array reference, including for edges added conceptually 'after' an earlier call already built the cache", () => {
  const walls = [
    { c: [1, 0, 1, 1], move: 20 },
    { c: [3, 0, 3, 1], move: 20, sight: 20 }
  ];
  // First call builds the index; later calls must still see every wall in it, not just the first queried.
  assert.equal(moveBlockedBetween({ col: 0, row: 0 }, { col: 1, row: 0 }, walls), true);
  assert.equal(moveBlockedBetween({ col: 2, row: 0 }, { col: 3, row: 0 }, walls), true);
  assert.equal(moveBlockedBetween({ col: 5, row: 0 }, { col: 6, row: 0 }, walls), false);
  // Re-querying the FIRST edge again after the index is warm must still be correct, not stale.
  assert.equal(moveBlockedBetween({ col: 0, row: 0 }, { col: 1, row: 0 }, walls), true);
});

test("moveBlockedBetween: two DIFFERENT walls arrays (even with identical contents) are indexed independently — the cache keys on array identity, and must never leak one battle's terrain into another's", () => {
  const wallsA = [{ c: [1, 0, 1, 1], move: 20 }];
  const wallsB = [{ c: [1, 0, 1, 1], move: 20 }]; // same content, different array
  assert.equal(moveBlockedBetween({ col: 0, row: 0 }, { col: 1, row: 0 }, wallsA), true);
  assert.equal(moveBlockedBetween({ col: 0, row: 0 }, { col: 1, row: 0 }, wallsB), true);
  const wallsC = []; // a real empty scenario must never see another scenario's cached walls
  assert.equal(moveBlockedBetween({ col: 0, row: 0 }, { col: 1, row: 0 }, wallsC), false);
});

test("moveBlockedBetween: a wall added to the SAME array reference after it's already been queried is a real cache-staleness trap by design (walls are documented as immutable for a battle's lifetime) — this test pins the assumption, not a recommendation to mutate walls in real code", () => {
  const walls = [{ c: [1, 0, 1, 1], move: 20 }];
  assert.equal(moveBlockedBetween({ col: 5, row: 0 }, { col: 6, row: 0 }, walls), false); // warms the cache without this edge
  walls.push({ c: [5, 0, 5, 1], move: 20 }); // mutating a walls array is never done by real scenario code
  assert.equal(moveBlockedBetween({ col: 5, row: 0 }, { col: 6, row: 0 }, walls), false, "documents the real tradeoff: the cache trusts walls arrays not to mutate, matching state.walls's own established never-mutated contract");
});

test("moveBlockedBetween performance: cost does not scale with wall count once the index is warm (the actual regression this session's fix addresses — a 256-wall map made one pathfinding flood take ~258ms before this fix)", () => {
  const manyWalls = Array.from({ length: 300 }, (_, i) => ({ c: [i, 0, i, 1], move: 20 }));
  moveBlockedBetween({ col: -1, row: 0 }, { col: -2, row: 0 }, manyWalls); // warm the index once
  const t0 = performance.now();
  for (let i = 0; i < 5000; i++) moveBlockedBetween({ col: -1, row: 0 }, { col: -2, row: 0 }, manyWalls);
  const elapsed = performance.now() - t0;
  assert.ok(elapsed < 200, `5000 calls against a 300-wall array took ${elapsed.toFixed(1)}ms — expected well under 200ms once indexed (an O(walls) scan would take vastly longer here)`);
});
