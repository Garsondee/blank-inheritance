/**
 * Hydrology: depression filling, D8 flow routing, and drainage accumulation.
 *
 * This is the module that makes the terrain look like terrain. Erosion only
 * produces realistic landforms if it knows where the water GOES, and "where the
 * water goes" is a global property of the whole surface — which is precisely
 * the thing local/patch-based methods (WaveFunctionCollapse and friends) cannot
 * give you, and the reason this generator computes structure from physics and
 * saves patch synthesis for texture. See the idea entry for that argument in
 * full.
 *
 * Three steps, in order:
 *   1. fillDepressions  — Priority-Flood (Barnes, Lehman & Mulla 2014), so
 *      every cell has a downhill path to the sea and no water is stranded.
 *   2. computeReceivers — D8 steepest descent on the filled surface.
 *   3. drainageArea     — accumulate contributing area downstream.
 *
 * Boundary convention: only the SEAWARD edge (x = 0, the left column) is an
 * open outlet. The other three edges are walls. That is not an implementation
 * shortcut — it is the physical setup being modelled: a coastal mountain front
 * draining west into the sea, which is what puts every river mouth on one coast
 * where a port town can exist.
 */

import { D8, D8_DIST, Field } from '../core/field.mjs';
import { MinHeap } from '../core/heap.mjs';

/**
 * Priority-Flood depression filling with an epsilon gradient.
 *
 * Returns a NEW field; the input is not modified. Every cell ends up with at
 * least `epsilon` of drop to some neighbour on the path to an outlet, so flats
 * (former lake floors) still route water instead of trapping it.
 *
 * The epsilon matters more than it looks: without it, a filled depression is a
 * perfectly level plateau, D8 routing has no steepest descent to pick, and the
 * drainage network develops a hole exactly where a lake or an estuary should be
 * — which is visible in the final map as a river that stops in mid-valley.
 */
export function fillDepressions(elevation, { epsilon = 1e-5 } = {}) {
  const { width, height } = elevation;
  const filled = elevation.clone();
  const h = filled.data;
  const n = h.length;
  const closed = new Uint8Array(n);
  const heap = new MinHeap(n);

  // Seed with the open seaward edge only.
  for (let y = 0; y < height; y++) {
    const i = y * width;
    closed[i] = 1;
    heap.push(h[i], i);
  }

  while (heap.size > 0) {
    const c = heap.pop();
    const cx = c % width;
    const cy = (c / width) | 0;
    for (let d = 0; d < 8; d++) {
      const nx = cx + D8[d][0];
      const ny = cy + D8[d][1];
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (closed[ni]) continue;
      closed[ni] = 1;
      // Raise the neighbour just above the cell we spilled from, if needed.
      if (h[ni] <= h[c]) h[ni] = h[c] + epsilon;
      heap.push(h[ni], ni);
    }
  }

  return filled;
}

/**
 * D8 steepest-descent receivers on a (depression-free) surface.
 *
 * receivers[i] is the index of the neighbour cell i drains into, or i itself
 * for an outlet. distances[i] is the along-flow distance to that receiver in
 * cells (1 or sqrt(2)) — needed because a diagonal step is longer, and slope is
 * rise over run.
 *
 * Outlets are the seaward-edge cells; everything else must find a downhill
 * neighbour, which fillDepressions has guaranteed exists.
 */
export function computeReceivers(filled) {
  const { width, height } = filled;
  const h = filled.data;
  const n = h.length;
  const receivers = new Int32Array(n);
  const distances = new Float64Array(n);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x === 0) {
        // Open seaward boundary: this cell is where water leaves the model.
        receivers[i] = i;
        distances[i] = 1;
        continue;
      }
      let best = i;
      let bestSlope = 0;
      let bestDist = 1;
      for (let d = 0; d < 8; d++) {
        const nx = x + D8[d][0];
        const ny = y + D8[d][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const ni = ny * width + nx;
        const drop = h[i] - h[ni];
        if (drop <= 0) continue;
        const slope = drop / D8_DIST[d];
        if (slope > bestSlope) {
          bestSlope = slope;
          best = ni;
          bestDist = D8_DIST[d];
        }
      }
      receivers[i] = best;
      distances[i] = bestDist;
    }
  }

  return { receivers, distances };
}

/**
 * A topological ordering of cells from base level upward.
 *
 * Braun & Willett's implicit erosion solver needs to visit each cell only after
 * its receiver has already been updated this timestep. Sorting by filled
 * elevation ascending gives exactly that ordering, because fillDepressions
 * guarantees every cell sits strictly above its receiver.
 *
 * Returns Int32Array of cell indices, lowest first. Reverse it to walk
 * downstream-to-upstream (which is what drainage accumulation wants).
 */
export function computeStack(filled) {
  const n = filled.length;
  const order = new Int32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  const h = filled.data;
  // Int32Array.prototype.sort with a comparator is a numeric sort, not lexical.
  order.sort((a, b) => h[a] - h[b]);
  return order;
}

/**
 * Upstream contributing area per cell, in cell units.
 *
 * Walking the stack from high to low and pushing each cell's accumulated area
 * into its receiver visits every cell exactly once and is O(n): by the time a
 * cell is processed, everything draining into it already has been.
 *
 * `precipitation` optionally weights each cell's contribution — the "A" in the
 * stream power law is really discharge, and a wetter windward slope should cut
 * harder than a dry lee one. Japan's Pacific coast is very wet, which is half
 * the reason its terrain is so aggressively dissected.
 */
export function drainageArea(filled, receivers, { precipitation = null, cellArea = 1 } = {}) {
  const n = filled.length;
  const area = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    area[i] = cellArea * (precipitation ? precipitation.data[i] : 1);
  }
  const stack = computeStack(filled);
  for (let s = n - 1; s >= 0; s--) {
    const i = stack[s];
    const r = receivers[i];
    if (r !== i) area[r] += area[i];
  }
  return { area, stack };
}

/**
 * Convenience: run the whole hydrology pass on an elevation field.
 *
 * Returns everything downstream stages need, including the filled surface —
 * erosion operates on the filled surface so that lake floors erode coherently
 * rather than being frozen out of the simulation.
 */
export function routeFlow(elevation, opts = {}) {
  const filled = fillDepressions(elevation, opts);
  const { receivers, distances } = computeReceivers(filled);
  const { area, stack } = drainageArea(filled, receivers, opts);
  return { filled, receivers, distances, area, stack };
}

/**
 * Extract the channel network as cell indices where drainage area exceeds a
 * threshold — the standard geomorphological definition of "where a river is",
 * and what the renderer draws as blue lines.
 */
export function channelCells(area, threshold) {
  const out = [];
  for (let i = 0; i < area.length; i++) if (area[i] >= threshold) out.push(i);
  return out;
}

/** Wrap a raw Float64Array back into a Field, for stages that want field ops. */
export function asField(data, width, height) {
  const f = new Field(width, height);
  f.data.set(data);
  return f;
}
