/**
 * Which way to walk, on the map you are actually looking at.
 *
 * Browser-side twin of tools/gazetteer/core/bearing.py -- see that module's
 * docstring for why this exists at all: a real wrong description ("270 m NW
 * of General Hospital" that should have read SE), traced to the breadcrumb
 * calling distanceAndBearing(self, landmark) and phrasing the result as if
 * it were the bearing FROM the landmark, when it is the bearing TO it.
 * Every compass direction that reaches prose is computed here, page-
 * relative (up on the image = north), never through the real-world
 * rotated frame. Held to bearing.py by a shared fixture
 * (test/fixtures/gazetteer-bearing-cases.json).
 *
 * Pure module: no DOM, no globals, no imports. Enforced by
 * test/gazetteer-tier0-architecture.test.mjs.
 */

export const POINTS_16 = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
];

export const POINTS_8 = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/**
 * Compass bearing FROM fromPx TO toPx, in page-relative degrees, 0 = north
 * (up on the image), clockwise. Image y increases downward, so "south" is
 * +y. The argument order is the whole contract: "A is 200m NW of B" is a
 * claim about B's bearing to A (start at B, head NW, arrive at A), so
 * writing that sentence calls bearingDeg(b, a), not (a, b) -- reversing it
 * silently flips every direction 180 degrees.
 */
export function bearingDeg(fromPx, toPx) {
  const dx = toPx[0] - fromPx[0];
  const dy = toPx[1] - fromPx[1];
  if (dx === 0 && dy === 0) {
    // Two coincident points have no real direction between them.
    // Math.atan2(0, -0) is IEEE 754-defined as +pi, not 0 (unary `-dy` on
    // a `dy` of `0` produces the negative-zero that triggers it) -- a
    // platform-dependent trap rather than a meaningful bearing, so it is
    // short-circuited here instead of trusted.
    return 0;
  }
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI; // atan2(east, north); north = -y
  return deg < 0 ? deg + 360 : deg;
}

/** A bearing in degrees as one of `points` (POINTS_8 or POINTS_16), for prose. */
export function compassPoint(deg, points = POINTS_8) {
  const step = 360 / points.length;
  return points[Math.floor(((deg % 360) / step) + 0.5) % points.length];
}

/** Straight-line ground distance between two image pixels. */
export function distanceM(aPx, bPx, metresPerPx = 1) {
  return Math.hypot(bPx[0] - aPx[0], bPx[1] - aPx[1]) * metresPerPx;
}

/**
 * `{distanceM, bearingDeg, compass}` FROM fromPx TO toPx -- the one call
 * most callers actually want, bundling the three numbers a description
 * needs so the argument-order contract only has to be honoured once.
 */
export function describe(fromPx, toPx, metresPerPx = 1, points = POINTS_8) {
  const deg = bearingDeg(fromPx, toPx);
  return {
    distanceM: Math.round(distanceM(fromPx, toPx, metresPerPx) * 10) / 10,
    bearingDeg: Math.round(deg * 10) / 10,
    compass: compassPoint(deg, points),
  };
}
