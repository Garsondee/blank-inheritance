/**
 * The travel trail — pure half. Ingram's own brief, 2026-09-23: "a trail
 * behind the tokens and a faded version of the path they will take in
 * front of them, so that the user can easily see the token, its intended
 * route and progress."
 *
 * `path` is a token's whole planned journey, scene-space, as
 * `[{x, y, mode}]` — point 0 is the start (`mode: null`, nothing led into
 * it yet); every later point carries the REAL mode
 * (core/travel-speed.mjs's own walk/bike/motorbike/car/train) of the hop
 * that reached it. Splitting on the token's own CURRENT position turns
 * that into two lists of drawable segments — foundry/travel-trail.mjs's
 * own job is only to actually draw them, one PIXI Graphics call per
 * segment, styled by MODE_COLOR so the path itself shows what kind of
 * journey each stretch is: "inject different... movement textures... to
 * bring the city to life" (Ingram, same brief), done here as the path's
 * own colour rather than swapping a real portrait's texture mid-journey —
 * the whole point of the art fix earlier the same day was to make each
 * candidate's own face legible, and losing that mid-journey would undo it.
 */

/** A real transit-mode colour, common-map-convention where one exists (rail red, road blue, cycleway green) — orthogonal to core/generators/token-ring.mjs's own faction colours, deliberately not reusing them (a red trail segment must read as "this is rail", never as "this is the Directorate"). */
export const MODE_COLOR = Object.freeze({
  walk: 0xc9a227,
  bike: 0x4caf50,
  motorbike: 0xff8c3c,
  car: 0x4a90d9,
  train: 0xd94a4a
});

// Found live 2026-09-23 (the exact bug behind Ingram's own report, "Trails
// behind tokens are not brighter than the path in front of them"): a real
// token's persisted x/y never exactly equals the hop target that produced
// it -- Foundry rounds a Token's own x/y on write (confirmed directly: a
// stored travelPath point of 10043.75 comes back as the live token's own x
// of 10044, off by 0.25px), so an exact-equality match here NEVER succeeds,
// for any token, on any journey -- the trail always read as 100% remaining,
// never once as travelled, regardless of real progress. 5px is comfortably
// under the shortest realistic hop spacing (even the slowest mode, walk at
// 45px/s, covers at least tens of pixels per sub-hop) so this can never
// mismatch to the WRONG point, only fail to match a genuinely different one.
const MATCH_TOLERANCE_PX = 5;

/** Index of the path point closest to `point`, within MATCH_TOLERANCE_PX — or -1 if nothing is close enough to count as "here". */
export function progressIndex(path, point) {
  let bestIndex = -1;
  let bestDist = Infinity;
  for (let i = 0; i < path.length; i++) {
    const dist = Math.hypot(path[i].x - point.x, path[i].y - point.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
    }
  }
  return bestDist <= MATCH_TOLERANCE_PX ? bestIndex : -1;
}

/**
 * `path` as described above. `currentPoint` is where the token actually is
 * right now (its live x/y). Returns `{traveled, remaining}`, each a list of
 * `{from, to, mode}` segments — one per hop, so every segment can be drawn
 * in its own mode's colour. The two lists always share their boundary hop
 * cleanly: `traveled` holds every hop already completed, `remaining` every
 * hop not yet started.
 *
 * If `currentPoint` isn't found in `path` at all (should not happen for a
 * real hop target mid-journey, but never throws), the whole route reads as
 * not yet travelled rather than guessing.
 */
export function splitTrail(path, currentPoint) {
  const segments = [];
  for (let i = 1; i < path.length; i++) {
    segments.push({ from: path[i - 1], to: path[i], mode: path[i].mode });
  }
  const idx = progressIndex(path, currentPoint);
  if (idx < 0) return { traveled: [], remaining: segments };
  return { traveled: segments.slice(0, idx), remaining: segments.slice(idx) };
}
