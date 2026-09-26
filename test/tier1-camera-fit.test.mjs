// Tier 1 — core/camera-fit.mjs's own framing math.

import { test } from "node:test";
import assert from "node:assert/strict";

import { fitPointsToViewport } from "../module/blank-inheritance/scripts/core/camera-fit.mjs";

test("a single point is centred at the fixed ideal close-in scale, not derived from a zero-size box", () => {
  const fit = fitPointsToViewport([{ x: 500, y: 700 }], 1600, 900);
  assert.deepEqual(fit, { x: 500, y: 700, scale: 1.2 });
});

test("two points are centred on their midpoint, with a real margin around their own bounding box", () => {
  const fit = fitPointsToViewport([{ x: 0, y: 0 }, { x: 1000, y: 0 }], 2000, 2000, { marginPx: 200 });
  // box: 1000 + 2*200 = 1400 wide, 0 + 2*200 = 400 tall -> scale = min(2000/1400, 2000/400) = min(1.43, 5) = 1.43, clamped to maxScale.
  assert.equal(fit.x, 500);
  assert.equal(fit.y, 0);
  assert.ok(fit.scale <= 1.5, "clamped to the default maxScale");
});

test("a widely scattered set of points never zooms out past the minScale floor", () => {
  const points = [{ x: -50000, y: -50000 }, { x: 50000, y: 50000 }];
  const fit = fitPointsToViewport(points, 1600, 900);
  assert.equal(fit.scale, 0.5, "should clamp to minScale rather than zoom out to fit the whole spread");
});

test("two nearly-coincident points never zoom in past the maxScale ceiling", () => {
  // The default 400px margin alone caps a 2-point fit's scale well under
  // 1.5 on an ordinary viewport regardless of spread, so this needs a
  // tighter margin to actually exercise the ceiling rather than coincide
  // with it.
  const points = [{ x: 100, y: 100 }, { x: 101, y: 100 }];
  const fit = fitPointsToViewport(points, 1600, 900, { marginPx: 10 });
  assert.equal(fit.scale, 1.5, "should clamp to maxScale rather than zoom in absurdly tight");
});

test("the midpoint is always the geometric centre of the bounding box, not the average of many clustered points plus one outlier", () => {
  const points = [{ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 0 }, { x: 100, y: 0 }];
  const fit = fitPointsToViewport(points, 2000, 2000);
  assert.equal(fit.x, 50, "midpoint of the bounding box (0..100), not the mean of four points (25)");
});

test("returns null for an empty point list or a non-positive viewport, rather than throwing or dividing by zero", () => {
  assert.equal(fitPointsToViewport([], 1600, 900), null);
  assert.equal(fitPointsToViewport([{ x: 0, y: 0 }], 0, 900), null);
  assert.equal(fitPointsToViewport([{ x: 0, y: 0 }], 1600, 0), null);
  assert.equal(fitPointsToViewport(null, 1600, 900), null);
});

test("a caller-supplied opts object overrides every default independently", () => {
  const fit = fitPointsToViewport([{ x: 0, y: 0 }], 1600, 900, { singlePointScale: 2.4 });
  assert.equal(fit.scale, 2.4);
});

/* ---------------------------------------------------------------- */
/*  coverFrame -- a staged scene beside the Scene Runner (2026-09-24) */
/* ---------------------------------------------------------------- */

import { coverFrame } from "../module/blank-inheritance/scripts/core/camera-fit.mjs";

test("with nothing covering the window it is the plain cover fit every player gets", () => {
  // A 2:1 picture on a 16:9 window: height-bound, centred on the picture.
  const frame = coverFrame({ sceneWidth: 4000, sceneHeight: 2000, viewportWidth: 2560, viewportHeight: 1440 });
  assert.equal(frame.scale, Math.max(2560 / 4000, 1440 / 2000));
  assert.equal(frame.x, 2000);
  assert.equal(frame.y, 1000);
});

test("beside an open drawer the picture covers the band the GM can see, centred in it", () => {
  const inset = 1100;
  const frame = coverFrame({ sceneWidth: 4000, sceneHeight: 2000, viewportWidth: 2560, viewportHeight: 1440, leftInset: inset });
  assert.equal(frame.scale, Math.max((2560 - inset) / 4000, 1440 / 2000));
  // The picture's centre (scene x 2000) must land at the middle of the visible
  // band on screen: screen x = window centre + (sceneX - pivotX) * scale.
  const screenX = 2560 / 2 + (2000 - frame.x) * frame.scale;
  assert.ok(Math.abs(screenX - (inset + (2560 - inset) / 2)) < 1e-9, `picture centre lands at ${screenX}`);
});

test("a narrow visible band that is taller than it is wide still covers it -- no letterbox", () => {
  const frame = coverFrame({ sceneWidth: 1000, sceneHeight: 1000, viewportWidth: 1600, viewportHeight: 1000, leftInset: 1200 });
  assert.ok(frame.scale * 1000 >= 1000 && frame.scale * 1000 >= 400);
});

test("an inset wider than the window is clamped rather than dividing by zero or flipping the picture", () => {
  const frame = coverFrame({ sceneWidth: 1000, sceneHeight: 500, viewportWidth: 800, viewportHeight: 600, leftInset: 5000 });
  assert.ok(Number.isFinite(frame.x) && Number.isFinite(frame.scale) && frame.scale > 0);
});

test("a degenerate scene or window answers null instead of NaN", () => {
  assert.equal(coverFrame({ sceneWidth: 0, sceneHeight: 100, viewportWidth: 100, viewportHeight: 100 }), null);
  assert.equal(coverFrame({ sceneWidth: 100, sceneHeight: 100, viewportWidth: 0, viewportHeight: 100 }), null);
});
