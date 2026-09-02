/**
 * The marine transgression: flooding the eroded landscape to make a coastline.
 *
 * THE CENTRAL TRICK OF THIS GENERATOR. We never draw a coastline. We erode a
 * fully subaerial landscape down to a low base level, then raise the sea and
 * take whatever contour results.
 *
 * That is not a stylistic choice, it is what actually happened. A ria coast
 * (リアス式海岸 — Sanriku, Shima, Wakasa Bay, and the drowned-valley coasts that
 * define most of Japan's non-plain shoreline) is literally a river valley
 * network flooded by post-glacial sea level rise. Erode, then drown, and you
 * get for free, and causally rather than by imitation:
 *
 *   - a deeply indented, branching coastline
 *   - a sheltered natural harbour at every drowned valley mouth
 *   - headlands between them, where the interfluves survived
 *   - offshore islands wherever a hilltop was isolated by the flood
 *   - and submarine canyons continuing the valleys out under the water
 *
 * Trying to author that shape directly — with noise, or by hand — is both
 * harder and worse, because the parts would not be consistent with each other.
 */

import { euclideanDistanceTransform } from '../core/distance.mjs';
import { D8 } from '../core/field.mjs';

export const LAND = 0;
export const OCEAN = 1;
export const LAKE = 2;

/**
 * Choose a sea level that drowns a target fraction of the map.
 *
 * Expressed as a fraction rather than an absolute elevation because the
 * absolute numbers move whenever erosion parameters change, whereas "about 45%
 * of this map should be water" is a stable art direction that survives
 * retuning.
 */
export function chooseSeaLevel(elevation, { waterFraction = 0.45 } = {}) {
  return elevation.quantile(waterFraction);
}

/**
 * Classify every cell as land, ocean, or inland lake.
 *
 * Ocean is defined by CONNECTIVITY, not just by elevation: a cell is ocean only
 * if it is below sea level and reachable from the open seaward edge through
 * other below-sea-level cells. Everything else below sea level is an inland
 * lake or a closed basin — which Japan genuinely has, and which should render
 * and play differently from the sea.
 */
export function floodWorld(elevation, seaLevel) {
  const { width, height } = elevation;
  const h = elevation.data;
  const n = h.length;
  const water = new Uint8Array(n); // LAND by default.

  for (let i = 0; i < n; i++) if (h[i] < seaLevel) water[i] = LAKE;

  // BFS from the open seaward edge through submerged cells.
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  for (let y = 0; y < height; y++) {
    const i = y * width;
    if (water[i] === LAKE) {
      water[i] = OCEAN;
      queue[qt++] = i;
    }
  }
  while (qh < qt) {
    const c = queue[qh++];
    const cx = c % width;
    const cy = (c / width) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = cx + D8[d][0];
      const ny = cy + D8[d][1];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (water[ni] === LAKE) {
        water[ni] = OCEAN;
        queue[qt++] = ni;
      }
    }
  }

  return water;
}

/**
 * Signed distance to the coastline, in cells: positive on land, negative at
 * sea.
 *
 * Exact Euclidean, not a chamfer approximation — see core/distance.mjs for why
 * that distinction is worth the extra code. The shelf-break bathymetry contours
 * this field directly, and the city stage will zone off it.
 */
export function coastDistance(water, width, height) {
  const n = width * height;
  const isSea = (i) => water[i] === OCEAN;

  // Seed the transform with the cells that straddle the waterline.
  const seeds = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const s = isSea(i);
      if (
        (x > 0 && isSea(i - 1) !== s) ||
        (x < width - 1 && isSea(i + 1) !== s) ||
        (y > 0 && isSea(i - width) !== s) ||
        (y < height - 1 && isSea(i + width) !== s)
      ) {
        seeds[i] = 1;
      }
    }
  }

  const dist = euclideanDistanceTransform(seeds, width, height);
  for (let i = 0; i < n; i++) if (isSea(i)) dist[i] = -dist[i];
  return dist;
}

/**
 * Gameplay depth bands.
 *
 * The map is a game object, so every physical layer emits a rules layer beside
 * its beauty layer. Depth below sea level maps to what can actually happen in a
 * square: whether a kid can wade it, whether a boat can cross it, whether a
 * Frame is standing on the bottom with its head clear or has walked off a
 * shelf into open water.
 *
 * Thresholds are in metres of depth. A Frame is building-sized, so "submerged"
 * for a Frame is a completely different number from "submerged" for a kid, and
 * both matter — the two scales share this map.
 */
export const DEPTH_BANDS = [
  { id: 'foreshore', maxDepth: 0.5, label: 'Foreshore', note: 'Ankle deep. Walkable by anyone at low water.' },
  { id: 'wadeable', maxDepth: 1.5, label: 'Shallows', note: 'Wadeable by a kid; trivial for a Frame.' },
  { id: 'swimmable', maxDepth: 4, label: 'Swimmable', note: 'A kid must swim. A Frame still has footing.' },
  { id: 'boat', maxDepth: 12, label: 'Navigable', note: 'Small craft and ferries. A Frame is submerged to the shoulder.' },
  { id: 'deep', maxDepth: 60, label: 'Deep water', note: 'Shipping channel. A Frame walking here is fully submerged.' },
  { id: 'abyssal', maxDepth: Infinity, label: 'Open sea', note: 'Beyond the shelf break. Nothing walks out of this.' },
];

export function depthBandOf(depth) {
  for (const band of DEPTH_BANDS) if (depth <= band.maxDepth) return band.id;
  return DEPTH_BANDS[DEPTH_BANDS.length - 1].id;
}

/** Fraction of the map that ended up as land — a sanity check on sea level. */
export function landFraction(water) {
  let land = 0;
  for (let i = 0; i < water.length; i++) if (water[i] === LAND) land++;
  return land / water.length;
}
