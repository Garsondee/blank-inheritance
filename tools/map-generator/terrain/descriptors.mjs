/**
 * Terrain descriptors: the per-cell measurements that tell every later stage
 * what KIND of place each cell is.
 *
 * Amplification needs them to decide where fine detail belongs (a steep
 * hillside is rough; an alluvial valley floor is not). Biomes will classify off
 * them. The city stage will site off them — floodplain, terrace, bluff, ridge
 * are all descriptor thresholds, not new computations.
 *
 * They are collected here rather than recomputed in each consumer because they
 * are all derived from the same elevation-plus-flow solution, and because
 * having them agree exactly matters: a cell the amplifier treats as valley
 * floor and the city generator treats as hillside would put a flat noiseless
 * patch under a terraced house.
 */

import { D8, D8_DIST } from '../core/field.mjs';

/**
 * Height Above Nearest Drainage.
 *
 * For each cell, how far it sits above the channel its water eventually reaches.
 * This is the single most useful terrain descriptor there is, and it is much
 * better than raw elevation for the questions that actually get asked: a cell
 * 2 m above its stream is floodplain whether it is at sea level or 400 m up a
 * mountain valley, and that is exactly the distinction that decides whether
 * alluvium settles there, whether it floods, and whether anyone would build on
 * it.
 *
 * Computed in O(n) by walking the stack downstream-first: a channel cell is its
 * own drainage reference, and every other cell simply inherits its receiver's.
 */
export function heightAboveDrainage(elevation, { receivers, area, stack }, channelThreshold) {
  const h = elevation.data;
  const n = h.length;
  const reference = new Float64Array(n);
  const hand = new Float64Array(n);

  // Stack order is receivers-before-donors, so a cell's reference is always
  // already resolved by the time it is read.
  for (let s = 0; s < n; s++) {
    const i = stack[s];
    const r = receivers[i];
    if (area[i] >= channelThreshold || r === i) {
      reference[i] = h[i]; // This cell IS drainage.
    } else {
      reference[i] = reference[r];
    }
    hand[i] = h[i] - reference[i];
    if (hand[i] < 0) hand[i] = 0;
  }
  return hand;
}

/**
 * Slope magnitude and aspect by Horn's 3x3 method.
 *
 * Horn rather than a simple two-cell difference because it averages over the
 * full neighbourhood, which is markedly less noisy — and slope here is used to
 * MODULATE synthesised detail, so noise in the modulator would show up directly
 * as noise in the output.
 *
 * `aspect` is the downslope azimuth in radians, which is what the amplifier
 * aligns its anisotropic detail to.
 */
export function slopeAndAspect(elevation, metresPerCell) {
  const { width, height } = elevation;
  const h = elevation.data;
  const slope = new Float64Array(h.length);
  const aspect = new Float64Array(h.length);
  const at = (x, y) =>
    h[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  const cell8 = 8 * metresPerCell;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dzdx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) -
          (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1))) / cell8;
      const dzdy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) -
          (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1))) / cell8;
      const i = y * width + x;
      slope[i] = Math.hypot(dzdx, dzdy);
      // Downslope direction: the gradient points uphill, so negate it.
      aspect[i] = Math.atan2(-dzdy, -dzdx);
    }
  }
  return { slope, aspect };
}

/**
 * Profile curvature: positive on convex ground (ridges, spurs, hilltops),
 * negative in concave ground (hollows, valley floors).
 *
 * Distinguishes the two places that look similar to a slope measurement but
 * behave completely differently — a convex spur sheds material and stays rough,
 * a concave hollow collects it and goes smooth.
 */
export function curvature(elevation, metresPerCell) {
  const { width, height } = elevation;
  const h = elevation.data;
  const out = new Float64Array(h.length);
  const at = (x, y) =>
    h[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  const d2 = metresPerCell * metresPerCell;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const c = at(x, y);
      // Laplacian: the sign convention here makes convex ground positive.
      const lap = 4 * c - at(x - 1, y) - at(x + 1, y) - at(x, y - 1) - at(x, y + 1);
      out[y * width + x] = lap / d2;
    }
  }
  return out;
}

/**
 * Everything at once, for a terrain model that already carries a flow solution.
 *
 * `channelThresholdCells` is expressed in cells rather than square metres so it
 * means the same thing across resolutions — "a channel is where at least this
 * many cells' worth of catchment has collected".
 */
export function computeDescriptors(elevation, flow, { metresPerCell, channelThresholdCells = 40 } = {}) {
  const cellArea = metresPerCell * metresPerCell;
  const { slope, aspect } = slopeAndAspect(elevation, metresPerCell);
  return {
    slope,
    aspect,
    curvature: curvature(elevation, metresPerCell),
    hand: heightAboveDrainage(elevation, flow, channelThresholdCells * cellArea),
    area: flow.area,
  };
}

/** Steepest-descent drop to a neighbour, in metres — used by sanity checks. */
export function maxDrop(elevation) {
  const { width, height } = elevation;
  const h = elevation.data;
  let worst = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      for (let d = 0; d < 8; d++) {
        const nx = x + D8[d][0];
        const ny = y + D8[d][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const drop = (h[i] - h[ny * width + nx]) / D8_DIST[d];
        if (drop > worst) worst = drop;
      }
    }
  }
  return worst;
}
