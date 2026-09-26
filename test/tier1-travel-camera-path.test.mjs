// Tier 1 — core/travel-camera-path.mjs: the single smooth camera curve for
// one travel journey. The claim this file holds up, verbatim from Ingram's
// own 2026-09-23 brief: "start zoomed in on the starting point, we zoom out
// to show the token and end point, then we end zoomed in on the end point -
// all done in a single smooth Bezier curved camera animation" and "keep the
// destination in view from about 50% of the way through the movement."

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildCameraKeyframes, cameraAtProgress } from "../module/blank-inheritance/scripts/core/travel-camera-path.mjs";

const VIEW_W = 1600;
const VIEW_H = 900;

/** Is `point` visible in the rectangle implied by a camera `{x, y, scale}` frame, for a viewport of the given pixel size? */
function inView(camera, point, viewportWidth, viewportHeight) {
  const halfW = viewportWidth / camera.scale / 2;
  const halfH = viewportHeight / camera.scale / 2;
  return Math.abs(point.x - camera.x) <= halfW && Math.abs(point.y - camera.y) <= halfH;
}

test("buildCameraKeyframes returns null if any keyframe can't be computed (empty points, or no known viewport) — matches camera-fit.mjs's own null contract", () => {
  assert.equal(buildCameraKeyframes([{ x: 0, y: 0 }], [{ x: 100, y: 100 }], 0, 0), null);
  assert.equal(buildCameraKeyframes([], [{ x: 100, y: 100 }], VIEW_W, VIEW_H), null);
});

test("buildCameraKeyframes' mid keyframe covers every start AND end point together, not just the two nearest ones", () => {
  const keyframes = buildCameraKeyframes(
    [{ x: 0, y: 0 }, { x: 2000, y: 0 }],
    [{ x: 1000, y: 2000 }],
    VIEW_W,
    VIEW_H
  );
  assert.ok(keyframes);
  for (const p of [{ x: 0, y: 0 }, { x: 2000, y: 0 }, { x: 1000, y: 2000 }]) {
    assert.ok(inView(keyframes.mid, p, VIEW_W, VIEW_H), `mid keyframe must reveal ${JSON.stringify(p)}`);
  }
});

test("cameraAtProgress(t=0) is exactly the start keyframe, and t=1 is exactly the end keyframe — the journey's own two hard endpoints", () => {
  const keyframes = buildCameraKeyframes([{ x: 100, y: 200 }], [{ x: 5000, y: 6000 }], VIEW_W, VIEW_H);
  assert.deepEqual(cameraAtProgress(keyframes, 0), keyframes.start);
  assert.deepEqual(cameraAtProgress(keyframes, 1), keyframes.end);
});

test("cameraAtProgress(t=0.5) is exactly the mid (wide reveal) keyframe — a real guarantee, not an approximation the curve merely tends toward", () => {
  const keyframes = buildCameraKeyframes([{ x: 100, y: 200 }], [{ x: 5000, y: 6000 }], VIEW_W, VIEW_H);
  const at = cameraAtProgress(keyframes, 0.5);
  assert.ok(Math.abs(at.x - keyframes.mid.x) < 1e-9);
  assert.ok(Math.abs(at.y - keyframes.mid.y) < 1e-9);
  assert.ok(Math.abs(at.scale - keyframes.mid.scale) < 1e-9);
});

test("the exact regression this system was built to fix: the destination stays in view continuously from t=0.5 onward, for a real long cross-map journey", () => {
  // A genuinely long crossing (~8.4km on this 12400px sheet) so the wide
  // reveal keyframe is meaningfully zoomed out from either tight end.
  const start = { x: 8975, y: 797 };
  const end = { x: 6962, y: 6486 };
  const keyframes = buildCameraKeyframes([start], [end], VIEW_W, VIEW_H);
  assert.ok(keyframes);
  for (let t = 0.5; t <= 1; t += 0.02) {
    const camera = cameraAtProgress(keyframes, t);
    assert.ok(inView(camera, end, VIEW_W, VIEW_H), `destination left frame at t=${t.toFixed(2)}: camera=${JSON.stringify(camera)}`);
  }
});

test("the start point stays in view up to t=0.5, symmetric to the destination guarantee above", () => {
  const start = { x: 8975, y: 797 };
  const end = { x: 6962, y: 6486 };
  const keyframes = buildCameraKeyframes([start], [end], VIEW_W, VIEW_H);
  for (let t = 0; t <= 0.5; t += 0.02) {
    const camera = cameraAtProgress(keyframes, t);
    assert.ok(inView(camera, start, VIEW_W, VIEW_H), `start point left frame at t=${t.toFixed(2)}: camera=${JSON.stringify(camera)}`);
  }
});

test("a short journey (start and end close together) still produces a valid, finite curve at every progress value", () => {
  const keyframes = buildCameraKeyframes([{ x: 500, y: 500 }], [{ x: 560, y: 540 }], VIEW_W, VIEW_H);
  assert.ok(keyframes);
  for (let t = 0; t <= 1; t += 0.1) {
    const camera = cameraAtProgress(keyframes, t);
    assert.ok(Number.isFinite(camera.x) && Number.isFinite(camera.y) && Number.isFinite(camera.scale));
    assert.ok(camera.scale > 0);
  }
});

test("a GM's multi-leg reveal (several travellers, several destinations) puts every one of them in view at the midpoint", () => {
  const starts = [{ x: 8975, y: 797 }, { x: 6914, y: 785 }, { x: 1716, y: 11554 }];
  const ends = [{ x: 6962, y: 6486 }];
  const keyframes = buildCameraKeyframes(starts, ends, VIEW_W, VIEW_H);
  assert.ok(keyframes);
  for (const p of [...starts, ...ends]) {
    assert.ok(inView(keyframes.mid, p, VIEW_W, VIEW_H), `mid keyframe must reveal every traveller and destination together, missed ${JSON.stringify(p)}`);
  }
});

test("the GM view for a real six-candidate convergence (the actual production demo, not a synthetic 3-point stand-in) keeps EVERY scattered origin in frame across the whole reveal half, t=0 to t=0.5 — not just at the exact midpoint sample", () => {
  // Real core/demo-party.mjs DEMO_PARTY_ORIGINS px values, converted to the
  // same scene-space toScenePoint already produces (identity here — the
  // pure math doesn't care about the +3100 padding offset, only relative
  // spread) — all six converging on the real candidate-gate destination.
  const starts = [
    { x: 8975, y: 797 },   // north-shore-town
    { x: 6914, y: 785 },   // upper-wards
    { x: 5369, y: 3478 },  // flats
    { x: 5195, y: 5146 },  // old-landing
    { x: 3647, y: 10482 }, // southern-reach
    { x: 1716, y: 11554 }  // far-quarter
  ];
  const ends = [{ x: 6962.06, y: 6486.33 }]; // candidate-gate
  const keyframes = buildCameraKeyframes(starts, ends, VIEW_W, VIEW_H);
  assert.ok(keyframes);

  for (let t = 0; t <= 0.5; t += 0.02) {
    const camera = cameraAtProgress(keyframes, t);
    for (const origin of starts) {
      assert.ok(inView(camera, origin, VIEW_W, VIEW_H), `a scattered candidate origin left the GM's own frame at t=${t.toFixed(2)}: origin=${JSON.stringify(origin)} camera=${JSON.stringify(camera)}`);
    }
  }
});

test("the GM view for the same real six-candidate convergence keeps the shared destination in frame across the whole approach half, t=0.5 to t=1", () => {
  const starts = [
    { x: 8975, y: 797 }, { x: 6914, y: 785 }, { x: 5369, y: 3478 },
    { x: 5195, y: 5146 }, { x: 3647, y: 10482 }, { x: 1716, y: 11554 }
  ];
  const ends = [{ x: 6962.06, y: 6486.33 }];
  const keyframes = buildCameraKeyframes(starts, ends, VIEW_W, VIEW_H);

  for (let t = 0.5; t <= 1; t += 0.02) {
    const camera = cameraAtProgress(keyframes, t);
    assert.ok(inView(camera, ends[0], VIEW_W, VIEW_H), `candidate-gate left the GM's own frame at t=${t.toFixed(2)}: camera=${JSON.stringify(camera)}`);
  }
});

test("the camera curve is genuinely smooth, not jerky: consecutive samples 33ms apart (this file's own real tick rate) never move by more than a small fraction of the viewport in one step, across a real ~85s six-candidate journey", () => {
  // Ingram's own live report: "about 10 small sharp jerky camera moves."
  // A jerky camera is one whose frame-to-frame DELTA is large relative to
  // the viewport -- a real jump the eye reads as a cut, not a pan. This
  // samples the curve at the exact real tick interval
  // (foundry/travel-camera.mjs's own TICK_MS=33) across a realistic
  // 85000ms journey (core/demo-party.mjs's own longest real candidate leg)
  // and asserts every step is small — the actual, falsifiable definition of
  // "smooth" rather than a claim about it.
  const starts = [
    { x: 8975, y: 797 }, { x: 6914, y: 785 }, { x: 5369, y: 3478 },
    { x: 5195, y: 5146 }, { x: 3647, y: 10482 }, { x: 1716, y: 11554 }
  ];
  const ends = [{ x: 6962.06, y: 6486.33 }];
  const keyframes = buildCameraKeyframes(starts, ends, VIEW_W, VIEW_H);
  const durationMs = 85000;
  const tickMs = 33;

  let prev = cameraAtProgress(keyframes, 0);
  let maxPanDeltaFraction = 0;
  let maxScaleRatio = 1;
  for (let elapsed = tickMs; elapsed <= durationMs; elapsed += tickMs) {
    const camera = cameraAtProgress(keyframes, elapsed / durationMs);
    const panDeltaPx = Math.hypot(camera.x - prev.x, camera.y - prev.y);
    // Measured in on-SCREEN pixels (pan delta x current scale), since that's
    // what a viewer actually perceives moving, not raw scene-space px.
    const panDeltaFraction = (panDeltaPx * camera.scale) / VIEW_W;
    maxPanDeltaFraction = Math.max(maxPanDeltaFraction, panDeltaFraction);
    const scaleRatio = Math.max(camera.scale / prev.scale, prev.scale / camera.scale);
    maxScaleRatio = Math.max(maxScaleRatio, scaleRatio);
    prev = camera;
  }

  assert.ok(maxPanDeltaFraction < 0.02, `a single 33ms tick panned by ${(maxPanDeltaFraction * 100).toFixed(2)}% of the viewport width — that reads as a jump, not a pan`);
  assert.ok(maxScaleRatio < 1.02, `a single 33ms tick changed zoom by a factor of ${maxScaleRatio.toFixed(4)} — that reads as a snap-zoom, not a smooth one`);
});
