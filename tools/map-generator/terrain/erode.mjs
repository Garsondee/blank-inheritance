/**
 * Landscape evolution: tectonic uplift, fluvial incision, hillslope diffusion,
 * and sediment deposition.
 *
 * The reference is Cordonnier et al., "Large Scale Terrain Generation from
 * Tectonic Uplift and Fluvial Erosion" (Eurographics 2016), which is itself
 * built on Braun & Willett (2013)'s implicit solver for the stream power law.
 * The deposition term follows Davy & Lague (2009).
 *
 * Why not Perlin/fBm: noise produces cloud-shaped blobs with no drainage
 * structure. Real land is organised by water — rivers cut valleys, valleys
 * separate ridges, and the SPACING of those ridges is set by the ratio of
 * incision to hillslope creep. The eye reads that structure as "real" long
 * before it can articulate why, and no amount of octave-stacking fakes it.
 *
 * The governing equation, per cell:
 *
 *     dh/dt  =  U  -  K * A^m * S^n  +  G * Qs / A
 *               ^     ^^^^^^^^^^^^^     ^^^^^^^^^^
 *            uplift   fluvial incision   deposition
 *
 * plus a separate hillslope diffusion pass, dh/dt = D * laplacian(h), which is
 * what rounds ridge crests into convex hilltops instead of leaving them as
 * knife edges.
 */

import { D8, D8_DIST } from '../core/field.mjs';
import { routeFlow } from './flow.mjs';

/**
 * One implicit stream-power step, in Braun & Willett's formulation.
 *
 * Fixing n = 1 makes the update linear and therefore exactly solvable in closed
 * form, rather than needing a Newton iteration per cell per step. n = 1 is also
 * the standard choice in the literature (with m/n = 0.5, so m = 0.5), so this
 * is not a shortcut that costs realism. The scheme is UNCONDITIONALLY STABLE —
 * that is the entire point of the implicit form, and it is what lets a whole
 * mountain range evolve in a few hundred steps instead of a few hundred
 * thousand.
 *
 * Cells are visited in stack order (base level first), so by the time cell i is
 * updated, its receiver's new elevation is already known.
 */
function streamPowerStep(h, { receivers, distances, area, stack }, { K, m, dt, dx }) {
  for (let s = 0; s < stack.length; s++) {
    const i = stack[s];
    const r = receivers[i];
    if (r === i) continue; // Outlet: held at base level.
    const f = (K * Math.pow(area[i], m) * dt) / (distances[i] * dx);
    // h_i_new = (h_i + f * h_r_new) / (1 + f)
    const next = (h[i] + f * h[r]) / (1 + f);
    // The solver cannot push a cell below its receiver; guard against float
    // drift doing it anyway, which would invert flow on the next iteration.
    h[i] = next < h[r] ? h[r] : next;
  }
}

/**
 * Sediment routing and deposition.
 *
 * Walks downstream accumulating the volume stripped by the incision step, and
 * drops a share of it at each cell. This is what produces the landform the
 * whole city stage depends on: where a steep mountain river hits the low
 * gradient near base level, incision falls off, the load it is carrying can no
 * longer be moved, and it aggrades into an ALLUVIAL FAN and a flat-floored
 * coastal plain. That flat pocket between hills and sea is exactly — and
 * non-coincidentally — where a Japanese coastal town sits.
 *
 * `eroded` is the thickness removed by the incision step, per cell.
 */
function depositStep(h, eroded, { receivers, area, stack }, { G, cellArea, maxFillFraction }) {
  const n = h.length;
  const carried = new Float64Array(n); // Volume arriving from upstream.

  // High to low: every donor is processed before its receiver.
  for (let s = n - 1; s >= 0; s--) {
    const i = stack[s];
    const r = receivers[i];
    const available = carried[i] + eroded[i] * cellArea;
    if (r === i) continue; // At the outlet, sediment leaves the model entirely.

    // Davy & Lague: deposition thickness = G * Qs / A.
    let dep = (G * available) / area[i];

    // Cap 1: cannot deposit more sediment than is actually present.
    const maxByMass = available / cellArea;
    if (dep > maxByMass) dep = maxByMass;

    // Cap 2: cannot aggrade a cell to or above its receiver, which would
    // invert the flow direction and make the next iteration's routing
    // nonsensical. Filling most of the way is allowed and is precisely how a
    // near-flat reach levels itself out.
    const headroom = (h[i] - h[r]) * maxFillFraction;
    if (dep > headroom) dep = headroom;
    if (dep < 0) dep = 0;

    h[i] += dep;
    carried[r] += available - dep * cellArea;
  }
}

/**
 * Explicit hillslope diffusion, sub-stepped for stability.
 *
 * 2D explicit diffusion is stable only while D*dt/dx^2 <= 0.25, so rather than
 * silently producing garbage at aggressive settings, this splits the requested
 * dt into as many safe sub-steps as it needs.
 */
function diffuseStep(h, width, height, { D, dt, dx }) {
  const courant = (D * dt) / (dx * dx);
  const substeps = Math.max(1, Math.ceil(courant / 0.2));
  const sdt = dt / substeps;
  const c = (D * sdt) / (dx * dx);
  const tmp = new Float64Array(h.length);

  for (let s = 0; s < substeps; s++) {
    tmp.set(h);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        // Neumann (zero-flux) at the closed edges; the seaward edge is held at
        // base level by the caller, so its value is overwritten anyway.
        const l = x > 0 ? tmp[i - 1] : tmp[i];
        const r = x < width - 1 ? tmp[i + 1] : tmp[i];
        const u = y > 0 ? tmp[i - width] : tmp[i];
        const d = y < height - 1 ? tmp[i + width] : tmp[i];
        h[i] = tmp[i] + c * (l + r + u + d - 4 * tmp[i]);
      }
    }
  }
}

/**
 * Run a full landscape evolution simulation.
 *
 * @param {Field}  elevation   Initial surface (modified in place and returned).
 * @param {Field}  uplift      Per-cell uplift rate.
 * @param {object} opts
 * @param {number} opts.iterations  Number of timesteps.
 * @param {number} opts.dt          Timestep length.
 * @param {number} opts.K           Fluvial erodibility.
 * @param {number} opts.m           Drainage-area exponent (0.5 with n = 1).
 * @param {number} opts.D           Hillslope diffusivity.
 * @param {number} opts.G           Deposition coefficient (0 disables it).
 * @param {number} opts.dx          Cell size in metres.
 * @param {Field}  [opts.precipitation]  Optional per-cell rainfall weighting.
 * @param {number} [opts.fillEvery] Re-run depression filling every N steps.
 * @param {function} [opts.onProgress] Called as (step, iterations).
 *
 * Returns the final elevation plus the last hydrology solution, so callers get
 * drainage area (for drawing rivers) without paying to recompute it.
 */
export function erode(elevation, uplift, opts) {
  const {
    iterations = 200,
    dt = 20000,
    K = 5e-6,
    m = 0.5,
    D = 0.05,
    G = 1,
    dx = 50,
    precipitation = null,
    fillEvery = 1,
    maxFillFraction = 0.85,
    baseLevel = 0,
    onProgress = null,
  } = opts;

  const { width, height } = elevation;
  const h = elevation.data;
  const cellArea = dx * dx;
  const before = new Float64Array(h.length);
  let flow = null;

  for (let step = 0; step < iterations; step++) {
    // Uplift. The seaward column is the fixed base level the whole landscape
    // is cutting down toward, so it never rises.
    for (let y = 0; y < height; y++) {
      for (let x = 1; x < width; x++) {
        const i = y * width + x;
        h[i] += uplift.data[i] * dt;
      }
      h[y * width] = baseLevel;
    }

    // Re-route flow. Depression filling dominates the cost, so it can be run
    // less often than every step: pits form slowly once the network is
    // integrated, and the receivers from a step or two ago are still valid.
    if (!flow || step % fillEvery === 0) {
      flow = routeFlow(elevation, { precipitation, cellArea });
    }

    before.set(h);
    streamPowerStep(h, flow, { K, m, dt, dx });

    if (G > 0) {
      const eroded = new Float64Array(h.length);
      for (let i = 0; i < h.length; i++) eroded[i] = before[i] - h[i];
      depositStep(h, eroded, flow, { G, cellArea, maxFillFraction });
    }

    diffuseStep(h, width, height, { D, dt, dx });

    // Re-clamp base level after diffusion smeared into it.
    for (let y = 0; y < height; y++) h[y * width] = baseLevel;

    if (onProgress) onProgress(step + 1, iterations);
  }

  // Final hydrology on the finished surface, so rivers are drawn from the same
  // terrain the renderer shades.
  flow = routeFlow(elevation, { precipitation, cellArea });
  return { elevation, flow };
}

/**
 * Local slope magnitude per cell (steepest D8 drop / distance).
 *
 * Used by the bathymetry and render stages; kept here beside the physics that
 * defines it rather than duplicated in each consumer.
 */
export function slopeField(elevation) {
  const { width, height } = elevation;
  const h = elevation.data;
  const out = new Float64Array(h.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let best = 0;
      for (let d = 0; d < 8; d++) {
        const nx = x + D8[d][0];
        const ny = y + D8[d][1];
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const s = (h[i] - h[ny * width + nx]) / D8_DIST[d];
        if (s > best) best = s;
      }
      out[i] = best;
    }
  }
  return out;
}
