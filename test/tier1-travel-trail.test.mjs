// Tier 1 — core/travel-trail.mjs: splitting a planned route into what a
// token has already ridden and what it has yet to ride, per real hop, so
// each can be drawn (and coloured) independently.

import { test } from "node:test";
import assert from "node:assert/strict";

import { MODE_COLOR, progressIndex, splitTrail } from "../module/blank-inheritance/scripts/core/travel-trail.mjs";

const PATH = [
  { x: 0, y: 0, mode: null },
  { x: 10, y: 0, mode: "walk" },
  { x: 10, y: 100, mode: "car" },
  { x: 110, y: 100, mode: "train" }
];

test("progressIndex finds an exact point match, and -1 for a point not on the path", () => {
  assert.equal(progressIndex(PATH, { x: 10, y: 100 }), 2);
  assert.equal(progressIndex(PATH, { x: 0, y: 0 }), 0);
  assert.equal(progressIndex(PATH, { x: 999, y: 999 }), -1);
});

test("the exact regression this was built to fix, found live 2026-09-23: a real token's OWN persisted x/y is never bit-exact with the hop target that produced it (Foundry rounds a Token's x/y on write — a stored 10043.75 came back live as 10044), so a few px of drift must still match the point it obviously is", () => {
  assert.equal(progressIndex(PATH, { x: 10.25, y: 99.7 }), 2, "0.3px of real Foundry rounding drift must still resolve to the point it clearly is");
  assert.equal(progressIndex(PATH, { x: 0.4, y: -0.4 }), 0);
});

test("progressIndex never matches a point genuinely further away than a real sub-hop could drift, even if it happens to be the nearest candidate", () => {
  // A point 50px off must never silently claim to be "on" the path -- that
  // would read as real progress that never actually happened.
  assert.equal(progressIndex(PATH, { x: 60, y: 100 }), -1);
});

test("splitTrail at the very start: nothing traveled yet, every hop remaining", () => {
  const { traveled, remaining } = splitTrail(PATH, { x: 0, y: 0 });
  assert.equal(traveled.length, 0);
  assert.equal(remaining.length, 3);
  assert.deepEqual(remaining[0], { from: { x: 0, y: 0, mode: null }, to: { x: 10, y: 0, mode: "walk" }, mode: "walk" });
});

test("splitTrail partway through: hops up to the current point are traveled, the rest remain, and they share the boundary point with no gap", () => {
  const { traveled, remaining } = splitTrail(PATH, { x: 10, y: 100 });
  assert.equal(traveled.length, 2);
  assert.equal(remaining.length, 1);
  assert.deepEqual(traveled[1].to, remaining[0].from, "the last travelled segment's end must be the first remaining segment's start");
});

test("splitTrail at the destination: everything traveled, nothing remaining", () => {
  const { traveled, remaining } = splitTrail(PATH, { x: 110, y: 100 });
  assert.equal(traveled.length, 3);
  assert.equal(remaining.length, 0);
});

test("splitTrail never throws for a current point that isn't actually on the path — the whole route reads as untravelled rather than guessing", () => {
  const { traveled, remaining } = splitTrail(PATH, { x: 12345, y: 6789 });
  assert.equal(traveled.length, 0);
  assert.equal(remaining.length, 3);
});

test("each segment carries the mode of the hop that rides it, not the mode of the point it starts from", () => {
  const { remaining } = splitTrail(PATH, { x: 0, y: 0 });
  assert.equal(remaining[0].mode, "walk");
  assert.equal(remaining[1].mode, "car");
  assert.equal(remaining[2].mode, "train");
});

test("every real travel-speed mode has its own distinct colour, and none of them reuse a faction colour from core/generators/token-ring.mjs", () => {
  const modes = ["walk", "bike", "motorbike", "car", "train"];
  for (const mode of modes) {
    assert.ok(Number.isInteger(MODE_COLOR[mode]), `${mode} has no MODE_COLOR entry`);
  }
  const colors = new Set(Object.values(MODE_COLOR));
  assert.equal(colors.size, modes.length, "two modes share the same colour");
  const factionColors = new Set([0xd1402a, 0xa986e8, 0x4fc8d8, 0xf0a830]); // token-ring.mjs's RING_HEX values
  for (const [mode, color] of Object.entries(MODE_COLOR)) {
    assert.ok(!factionColors.has(color), `${mode}'s colour reuses a faction identity colour — a trail segment must never look like it means something about the Directorate/a Claimant/the party`);
  }
});
