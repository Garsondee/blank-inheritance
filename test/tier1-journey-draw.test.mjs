// Tier 1 -- the geometry the journey overlay draws with (core/journey-draw.mjs): dashes, arrows, a point along a line, boxes, and the colours.

import { test } from "node:test";
import assert from "node:assert/strict";
import { arrowsAlong, boundsOf, dashPolyline, FALLBACK_STYLE, MODE_STYLE, pointAtDistance, polylineLength, polylineUpTo, PROBLEM_COLORS, styleForMode, unionBox } from "../module/blank-inheritance/scripts/core/journey-draw.mjs";

const L = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];            // an L, 20 long
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

test("a polyline's length is the sum of its stretches, and nothing for fewer than two points", () => {
  assert.equal(polylineLength(L), 20);
  assert.equal(polylineLength([{ x: 1, y: 1 }]), 0);
  assert.equal(polylineLength([]), 0);
});

test("a point a given distance along a line, with the heading there, clamped to the ends", () => {
  const start = pointAtDistance(L, 0);
  assert.deepEqual([start.x, start.y], [0, 0]);
  assert.ok(near(start.angle, 0), "heading east");
  const corner = pointAtDistance(L, 10);
  assert.deepEqual([corner.x, corner.y], [10, 0]);
  const up = pointAtDistance(L, 15);
  assert.deepEqual([up.x, up.y], [10, 5]);
  assert.ok(near(up.angle, Math.PI / 2), "heading south on the screen (y grows downward)");
  const past = pointAtDistance(L, 99);
  assert.deepEqual([past.x, past.y], [10, 10], "clamped to the end");
  assert.deepEqual([pointAtDistance(L, -4).x, pointAtDistance(L, -4).y], [0, 0], "and to the start");
  assert.equal(pointAtDistance([{ x: 0, y: 0 }], 3), null);
});

test("dashes carry the pattern across corners and add up to the right amount of line", () => {
  const dashes = dashPolyline(L, 3, 2);
  // 20 long at 5 per cycle: four cycles, 3 drawn in each
  const drawn = dashes.reduce((n, [a, b]) => n + Math.hypot(b.x - a.x, b.y - a.y), 0);
  assert.ok(near(drawn, 12), `${drawn}`);
  assert.deepEqual(dashes[0], [{ x: 0, y: 0 }, { x: 3, y: 0 }]);
  assert.deepEqual(dashes[1], [{ x: 5, y: 0 }, { x: 8, y: 0 }]);
  // the third dash starts at 10, exactly the corner, and runs down
  assert.deepEqual(dashes[2], [{ x: 10, y: 0 }, { x: 10, y: 3 }]);
  // a dash that spans the corner is two pieces, one each side of it (6 on, 2 off: the third dash starts at 8 and runs 6, so 2 along the top then 4 down)
  const across = dashPolyline(L, 6, 2);
  assert.ok(across.some(([a, b]) => a.x === 8 && a.y === 0 && b.x === 10 && b.y === 0), "up to the corner");
  assert.ok(across.some(([a, b]) => a.x === 10 && a.y === 0 && b.x === 10 && b.y === 4), "and on round it");
});

test("a phase shifts where the pattern begins, so dashes can crawl", () => {
  const plain = dashPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2, 3, 0);
  const shifted = dashPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2, 3, 1);
  assert.deepEqual(plain[0], [{ x: 0, y: 0 }, { x: 2, y: 0 }]);
  assert.deepEqual(shifted[0], [{ x: 0, y: 0 }, { x: 1, y: 0 }], "one unit into the first dash");
  const wrapped = dashPolyline([{ x: 0, y: 0 }, { x: 10, y: 0 }], 2, 3, 5 + 4);
  assert.deepEqual(wrapped[0][0], { x: 1, y: 0 }, "a phase past the pattern wraps round: 9 is 4 into the cycle, in the gap, so the first dash starts a unit in");
});

test("a degenerate pattern draws the line whole, and a line of one point draws nothing", () => {
  assert.equal(dashPolyline(L, 0, 0).length, 2);
  assert.equal(dashPolyline(L, 3, -1).length, 2);
  assert.deepEqual(dashPolyline([{ x: 0, y: 0 }], 3, 2), []);
  assert.deepEqual(dashPolyline(null, 3, 2), []);
  assert.deepEqual(dashPolyline([{ x: 1, y: 1 }, { x: 1, y: 1 }], 3, 2), [], "a zero-length stretch has no dash");
});

test("direction arrows are spaced along the line, half a space in, each pointing the way the line goes", () => {
  const arrows = arrowsAlong(L, 8);
  assert.deepEqual(arrows.map((a) => [a.x, a.y]), [[4, 0], [10, 2]], "at 4 and 12 along");
  assert.ok(near(arrows[0].angle, 0));
  assert.ok(near(arrows[1].angle, Math.PI / 2));
  assert.deepEqual(arrowsAlong(L, 0), []);
  assert.deepEqual(arrowsAlong([{ x: 0, y: 0 }, { x: 3, y: 0 }], 10, 5), [], "none on a line shorter than the first arrow");
  assert.equal(arrowsAlong(L, 5, 2.5).length, 4);
});

test("the box round some points ignores anything that is not a point, and two boxes join", () => {
  assert.deepEqual(boundsOf([{ x: 3, y: 4 }, { x: -1, y: 9 }, { x: 5, y: 0 }]), { x0: -1, y0: 0, x1: 5, y1: 9 });
  assert.equal(boundsOf([]), null);
  assert.equal(boundsOf(null), null);
  assert.deepEqual(boundsOf([{ x: 1, y: 2 }, null, { x: NaN, y: 1 }, undefined]), { x0: 1, y0: 2, x1: 1, y1: 2 });
  assert.deepEqual(unionBox({ x0: 0, y0: 0, x1: 2, y1: 2 }, { x0: 1, y0: -1, x1: 5, y1: 1 }), { x0: 0, y0: -1, x1: 5, y1: 2 });
  assert.deepEqual(unionBox(null, { x0: 1, y0: 1, x1: 2, y1: 2 }), { x0: 1, y0: 1, x1: 2, y1: 2 });
  assert.equal(unionBox(null, null), null);
});

test("the part of a line travelled so far ends exactly at the token", () => {
  assert.deepEqual(polylineUpTo(L, 0), [{ x: 0, y: 0 }]);
  assert.deepEqual(polylineUpTo(L, 4), [{ x: 0, y: 0 }, { x: 4, y: 0 }]);
  assert.deepEqual(polylineUpTo(L, 10), [{ x: 0, y: 0 }, { x: 10, y: 0 }]);
  assert.deepEqual(polylineUpTo(L, 14), [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4 }]);
  assert.deepEqual(polylineUpTo(L, 500), L, "past the end is all of it");
  assert.deepEqual(polylineUpTo([], 3), []);
});

test("every way of moving has a style; walking is dotted and a train is the heaviest line; an unknown way falls back to walking", () => {
  for (const mode of ["walk", "bike", "car", "motorbike", "train"]) {
    const s = styleForMode(mode);
    assert.ok(Number.isInteger(s.color) && s.weight > 0, mode);
  }
  assert.ok(MODE_STYLE.walk.dash && MODE_STYLE.walk.dash.length === 2);
  assert.equal(MODE_STYLE.car.dash, null);
  assert.ok(MODE_STYLE.train.weight > MODE_STYLE.car.weight && MODE_STYLE.car.weight > MODE_STYLE.walk.weight);
  assert.equal(styleForMode("ferry"), FALLBACK_STYLE);
  assert.equal(styleForMode(undefined), FALLBACK_STYLE);
  assert.ok(PROBLEM_COLORS.error !== PROBLEM_COLORS.warn && PROBLEM_COLORS.warn !== PROBLEM_COLORS.info);
  assert.ok(Object.isFrozen(MODE_STYLE) && Object.isFrozen(PROBLEM_COLORS));
});
