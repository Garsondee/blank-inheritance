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
 * Boundary convention: flow leaves the model only through OUTLET cells. By
 * default those are the seaward edge (x = 0, the left column) — a coastal
 * mountain front draining west into the sea, which is what puts every river
 * mouth on one coast where a port town can exist.
 *
 * The outlet set is a parameter rather than a constant because the generator
 * runs the landscape TWICE against two different base levels: first against a
 * glacial lowstand at the map edge, then — after the sea has risen over the
 * result — against the new shoreline. Sea level is not a fixed fact of a
 * landscape, and the second pass is what builds the alluvial ground a town can
 * actually stand on. See terrain/generate.mjs.
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
export function fillDepressions(elevation, { epsilon = 1e-5, outlets = null } = {}) {
  const { width, height } = elevation;
  const filled = elevation.clone();
  const h = filled.data;
  const n = h.length;
  const closed = new Uint8Array(n);
  const heap = new MinHeap(n);

  // Seed with the outlet set: the cells water is allowed to leave through.
  if (outlets) {
    for (let i = 0; i < n; i++) {
      if (!outlets[i]) continue;
      closed[i] = 1;
      heap.push(h[i], i);
    }
  } else {
    for (let y = 0; y < height; y++) {
      const i = y * width;
      closed[i] = 1;
      heap.push(h[i], i);
    }
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
 * Outlet cells drain out of the model; everything else must find a downhill
 * neighbour, which fillDepressions has guaranteed exists.
 */
export function computeReceivers(filled, { outlets = null } = {}) {
  const { width, height } = filled;
  const h = filled.data;
  const n = h.length;
  const receivers = new Int32Array(n);
  const distances = new Float64Array(n);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (outlets ? outlets[i] : x === 0) {
        // This cell is where water leaves the model.
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
 * its receiver has already been updated this timestep, and drainage
 * accumulation needs the same order reversed.
 *
 * This is Braun & Willett (2013)'s own O(n) construction: invert the receiver
 * array into per-cell donor lists (CSR-style, one flat array plus offsets),
 * then depth-first traverse outward from every outlet. A node is emitted before
 * any of its donors by construction.
 *
 * It replaced a far simpler implementation that just sorted every cell by
 * elevation — also a valid ordering, but an O(n log n) comparator sort run
 * every iteration, which measurably dominated the whole simulation and made
 * erosion scale as roughly O(n^2.6) instead of O(n log n). That was the single
 * thing standing between this generator and the fine resolutions the map
 * actually needs. Sorting is also why the old version took the filled elevation
 * field as its argument; this one needs only the receivers.
 */
export function computeStack(receivers) {
  const n = receivers.length;

  // Donor counts, then a prefix sum into CSR offsets.
  const offset = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) {
    const r = receivers[i];
    if (r !== i) offset[r + 1]++;
  }
  for (let i = 0; i < n; i++) offset[i + 1] += offset[i];

  // Scatter donors into the flat list. Every non-outlet cell donates to exactly
  // one receiver, so the list is at most n long.
  const cursor = Int32Array.from(offset.subarray(0, n));
  const donors = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const r = receivers[i];
    if (r !== i) donors[cursor[r]++] = i;
  }

  // Iterative DFS from every outlet. An explicit work array rather than
  // recursion: a long river is a deep tree, and recursion would blow the stack.
  const stack = new Int32Array(n);
  const work = new Int32Array(n);
  let top = 0;
  let wt = 0;
  for (let i = 0; i < n; i++) if (receivers[i] === i) work[wt++] = i;
  while (wt > 0) {
    const node = work[--wt];
    stack[top++] = node;
    for (let k = offset[node]; k < offset[node + 1]; k++) work[wt++] = donors[k];
  }

  return stack;
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
  const stack = computeStack(receivers);
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
  const { receivers, distances } = computeReceivers(filled, opts);
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
