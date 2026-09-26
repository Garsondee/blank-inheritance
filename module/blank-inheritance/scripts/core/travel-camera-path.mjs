/**
 * A single smooth camera path across one whole travel journey — the pure half.
 *
 * Built 2026-09-23 from Ingram's own live reaction to the newly-fixed
 * crossing: "the camera keeps the token roughly in view but it does so by
 * making about 10 small sharp jerky camera moves. Ideally we'd have a
 * smooth camera move and zoom... all done in a single smooth Bezier curved
 * camera animation." foundry/travel-camera.mjs's OLD design re-fit the
 * camera independently on every single hop update — a fresh, unrelated
 * target every ~100-1500ms, each one interrupting whatever pan was already
 * mid-flight, which is exactly what reads as jerky. This file exists so the
 * camera can instead be driven by ONE precomputed curve and elapsed wall-clock
 * time across the whole journey — every frame is a point on the SAME
 * continuous path, not a race between competing short tweens.
 *
 * Three keyframes (camera-fit.mjs's own `{x, y, scale}` shape) — tight on
 * the start, wide enough to reveal every relevant point, tight on the end —
 * and a quadratic curve THROUGH all three. This is Lagrange interpolation
 * at t=0/0.5/1, deliberately not a Bezier control-point blend: a quadratic
 * Bezier's middle control point is never actually reached by the curve
 * (it's an attractor, not a waypoint), which would only ever APPROXIMATE
 * "the destination is in view by 50%." Lagrange interpolation passes
 * through `mid` EXACTLY at t=0.5, so it's a guarantee, not an approximation
 * — from t=0.5 onward the camera is only ever interpolating FROM a frame
 * that already contains the destination TOWARD one centred on it, never
 * away from it, so the destination never leaves view for the second half of
 * the journey — see cameraAtProgress's own clamp for why passing through
 * `mid` exactly isn't quite enough on its own to promise that.
 */

import { fitPointsToViewport } from "./camera-fit.mjs";

/**
 * Tight-start / wide-reveal / tight-end keyframes for one journey, plus the
 * raw point lists themselves (cameraAtProgress's own containment clamp
 * needs the ACTUAL points, not just the fitted `{x,y,scale}` triples).
 * `startPoints`/`endPoints` are each a non-empty array of `{x, y}` — usually
 * one point, but the GM's combined view passes every concurrently-travelling
 * leg's own start/end together, same "everyone in frame" contract
 * camera-fit.mjs's own multi-point case already has. Returns `null` if any
 * keyframe can't be computed (camera-fit.mjs's own null-input contract —
 * an empty points array, or a not-yet-known viewport).
 */
export function buildCameraKeyframes(startPoints, endPoints, viewportWidth, viewportHeight) {
  const start = fitPointsToViewport(startPoints, viewportWidth, viewportHeight);
  const end = fitPointsToViewport(endPoints, viewportWidth, viewportHeight);
  // minScale: 0 — camera-fit.mjs's own default 0.5 floor exists to keep an
  // ad-hoc establishing shot legible (foundry/demo-runner.mjs's scatter
  // shot), but it can refuse to zoom out far enough to fit BOTH ends of a
  // tall/narrow journey into a wide viewport (found live 2026-09-23,
  // writing this file's own tests: a start/end pair spanning 2013x5689px
  // clamped to scale 0.5 on a 1600x900 viewport, which still left the
  // destination outside the frame). The reveal keyframe's only job is to
  // actually contain every point — legibility is what the tight start/end
  // keyframes are for.
  const mid = fitPointsToViewport([...startPoints, ...endPoints], viewportWidth, viewportHeight, { minScale: 0 });
  if (!start || !end || !mid) return null;
  return { start, mid, end, startPoints, endPoints, viewportWidth, viewportHeight };
}

function clamp01(t) {
  return Math.max(0, Math.min(1, t));
}

/** Smoothstep ease — the camera's own PACE along the curve breathes (slow, fast, slow) rather than moving at a constant rate; the curve's shape (below) is exactly the same regardless of how `t` is eased. */
function ease(t) {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

// A guaranteed point is kept at 95% of the viewport's own containing
// radius, not 100% — the bare minimum scale places it exactly on the frame
// edge, which floating-point rounding alone can then push a fraction of a
// pixel outside (found writing this file's own tests) and which would look
// wrong on a real screen regardless (a token sprite has its own width; a
// "guaranteed visible" point sitting on the literal edge pixel reads as
// half cut off). A flat 5% margin is plenty at any scale.
const CONTAINMENT_MARGIN = 0.95;

/**
 * The largest scale a viewport centred at `(cx, cy)` can use while still
 * containing every one of `points`, with a safety margin — Infinity if
 * `points` is empty (nothing to guarantee) or every point sits exactly on
 * the centre (any scale works).
 */
function maxScaleContaining(points, cx, cy, viewportWidth, viewportHeight) {
  let maxScale = Infinity;
  for (const p of points) {
    const dx = Math.abs(p.x - cx);
    const dy = Math.abs(p.y - cy);
    if (dx > 0) maxScale = Math.min(maxScale, viewportWidth / (2 * dx));
    if (dy > 0) maxScale = Math.min(maxScale, viewportHeight / (2 * dy));
  }
  return maxScale === Infinity ? maxScale : maxScale * CONTAINMENT_MARGIN;
}

/**
 * The camera's `{x, y, scale}` at journey progress `t` (0..1, raw —
 * eased internally before the curve is evaluated). Position comes straight
 * off a single quadratic curve through `keyframes.start` (t=0),
 * `keyframes.mid` (t=0.5) and `keyframes.end` (t=1) — Lagrange basis
 * polynomials, so the curve passes through all three EXACTLY at those
 * parameters (see this file's own header for why that matters more here
 * than a Bezier blend would).
 *
 * Scale gets the same curve, THEN CLAMPED — passing through `mid` exactly
 * at t=0.5 guarantees the destination is in view AT that instant, but
 * position and scale are independent curves, so nothing stops scale from
 * zooming in faster than position pans across for a few frames either side
 * (found live 2026-09-23, writing this file's own tests: a real journey's
 * curve zoomed in from mid to end quickly enough that the destination
 * dropped out of frame again for a stretch around t=0.6, before position
 * caught up). The fix is a floor, not a redesign: past t=0.5, scale is
 * never allowed past whatever a viewport centred at the CURVE'S OWN current
 * (x,y) needs to keep every `endPoints` member inside it — symmetrically,
 * a ceiling on scale before t=0.5 for `startPoints`. The curve still drives
 * the shot; this only ever pulls it back out when it would otherwise break
 * the one promise Ingram actually asked for.
 */
export function cameraAtProgress(keyframes, t) {
  const et = ease(t);
  const l0 = 2 * (et - 0.5) * (et - 1);
  const l1 = 4 * et * (1 - et);
  const l2 = 2 * et * (et - 0.5);
  const { start, mid, end, startPoints, endPoints, viewportWidth, viewportHeight } = keyframes;
  const x = l0 * start.x + l1 * mid.x + l2 * end.x;
  const y = l0 * start.y + l1 * mid.y + l2 * end.y;
  const curveScale = l0 * start.scale + l1 * mid.scale + l2 * end.scale;

  const guardPoints = t <= 0.5 ? startPoints : endPoints;
  const allowedScale = maxScaleContaining(guardPoints ?? [], x, y, viewportWidth, viewportHeight);
  return { x, y, scale: Math.min(curveScale, allowedScale) };
}
