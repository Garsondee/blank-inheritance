// Tier 1 — pure arithmetic for placing a freshly-created character's token
// on the landing scene (core/token-layout.mjs). No Foundry.

import { test } from "node:test";
import assert from "node:assert/strict";

import { nextTokenPosition } from "../module/blank-inheritance/scripts/core/token-layout.mjs";

test("nextTokenPosition: the first arrival (index 0) sits left of scene-center, the row centered around it", () => {
  const { x, y } = nextTokenPosition(0, 3072, 1536);
  assert.ok(x < 3072 / 2, "index 0 of a centered 6-wide row must sit left of center");
  assert.equal(y, Math.round(1536 * 0.78));
});

test("nextTokenPosition: successive indices step right by a fixed spacing, never overlapping", () => {
  const a = nextTokenPosition(0, 3072, 1536);
  const b = nextTokenPosition(1, 3072, 1536);
  const c = nextTokenPosition(2, 3072, 1536);
  assert.equal(b.x - a.x, c.x - b.x, "the spacing between consecutive slots must be constant");
  assert.ok(b.x > a.x, "each next index must sit strictly to the right of the previous one");
});

test("nextTokenPosition: a 6-wide run (indices 0-5) is symmetric around scene-center", () => {
  const positions = [0, 1, 2, 3, 4, 5].map((i) => nextTokenPosition(i, 3072, 1536).x);
  const center = 3072 / 2;
  for (let i = 0; i < 3; i++) {
    const left = positions[i];
    const right = positions[5 - i];
    assert.equal(center - left, right - center, `slot ${i} and its mirror slot ${5 - i} must be equidistant from center`);
  }
});

test("nextTokenPosition: y never depends on index -- every arrival lands on the same row", () => {
  const ys = [0, 1, 2, 5, 10].map((i) => nextTokenPosition(i, 3072, 1536).y);
  assert.ok(ys.every((y) => y === ys[0]));
});

test("nextTokenPosition: scales with whatever scene dimensions it's given, not a hardcoded size", () => {
  const small = nextTokenPosition(0, 1000, 500);
  const large = nextTokenPosition(0, 2000, 1000);
  assert.equal(large.y, small.y * 2);
});
