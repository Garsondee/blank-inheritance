/**
 * The ocean floor.
 *
 * Below sea level the eroded surface is already right in one important way —
 * it carries the drowned valleys straight out under the water as submarine
 * canyons, because they were cut by the same rivers. But a subaerial surface
 * that has simply been flooded is still wrong in three ways, and this module
 * fixes each:
 *
 *   1. SHELTER. Sheltered bays silt up. Wave-exposed headlands stay rocky and
 *      steep. Modelled by computing wave exposure (fetch) per cell and
 *      diffusing/infilling the sea bed in inverse proportion to it. This is the
 *      step that turns a drowned valley into an actual usable HARBOUR — a flat,
 *      shallow, silted, sheltered floor — which is the single most important
 *      thing the city stage will need from the sea.
 *   2. THE SHORE PLATFORM. Wave action cuts a bench at the waterline rather
 *      than leaving the land profile continuing unbroken into the sea.
 *   3. THE SHELF BREAK. Beyond the shelf the bottom falls away fast. For Japan
 *      this is dramatic and close inshore — the Nankai Trough and the Japan
 *      Trench are right there — so deep water arrives sooner than intuition
 *      from a gentler coast would suggest.
 */

import { D8 } from '../core/field.mjs';
import { fbm } from '../core/noise.mjs';
import { subSeed } from '../core/rng.mjs';
import { OCEAN } from './sealevel.mjs';

/**
 * Wave exposure per ocean cell, in [0, 1].
 *
 * Casts rays in `directions` evenly-spaced compass directions and measures how
 * far each travels over open water before hitting land or leaving the map. A
 * cell deep inside a narrow bay sees land in almost every direction and scores
 * near 0; a cell off an exposed headland scores near 1.
 *
 * This is a real, cheap proxy for the physics — fetch is exactly what
 * oceanographers use to predict wave energy at a site.
 */
export function waveExposure(water, width, height, { directions = 16, maxRange = 64 } = {}) {
  const n = width * height;
  const exposure = new Float64Array(n);
  const dirs = [];
  for (let d = 0; d < directions; d++) {
    const a = (d / directions) * Math.PI * 2;
    dirs.push([Math.cos(a), Math.sin(a)]);
  }
  // Seaward is -x, so weight westerly rays more: waves arrive from open ocean.
  const weights = dirs.map(([dx]) => 0.35 + 0.65 * Math.max(0, -dx));
  const weightSum = weights.reduce((a, b) => a + b, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (water[i] !== OCEAN) continue;
      let total = 0;
      for (let d = 0; d < dirs.length; d++) {
        const [dx, dy] = dirs[d];
        let reach = maxRange;
        for (let s = 1; s <= maxRange; s++) {
          const sx = Math.round(x + dx * s);
          const sy = Math.round(y + dy * s);
          if (sx < 0 || sy < 0 || sx >= width || sy >= height) break; // Open ocean: full fetch.
          if (water[sy * width + sx] !== OCEAN) {
            reach = s;
            break;
          }
        }
        total += weights[d] * (reach / maxRange);
      }
      exposure[i] = total / weightSum;
    }
  }
  return exposure;
}

/**
 * Sculpt the submarine surface.
 *
 * Modifies `elevation` in place, below sea level only. Land is never touched —
 * the coastline that flooding produced stays exactly where it was, because it
 * is the one line every other stage keys off.
 */
export function sculptSeafloor(elevation, water, coastDist, seaLevel, seed, opts = {}) {
  const {
    shelterSmoothing = 12, // Diffusion passes applied at full shelter.
    siltFill = 0.55, // How far a fully-sheltered cell is pulled toward sea level.
    platformWidth = 3, // Cells over which the wave-cut bench extends.
    platformDepth = 1.2, // Depth of that bench, in metres.
    shelfBreakDistance = 0.34, // Fraction of width offshore where the shelf ends.
    shelfDropoff = 900, // Extra metres of depth beyond the break.
    shelfSteepness = 5.5,
    roughness = 2.5, // Metres of residual seabed texture.
  } = opts;

  const { width, height } = elevation;
  const h = elevation.data;
  const n = h.length;
  const exposure = waveExposure(water, width, height);
  const noiseSeed = subSeed(seed, 'bathymetry', 'texture');

  // 1. Shelter-weighted silt infill. Sheltered floors rise toward sea level;
  //    exposed ones keep their eroded relief.
  for (let i = 0; i < n; i++) {
    if (water[i] !== OCEAN) continue;
    const shelter = 1 - exposure[i];
    const depth = seaLevel - h[i];
    if (depth <= 0) continue;
    // Only shallow water silts meaningfully — a 300 m deep basin does not fill.
    const shallowness = Math.exp(-depth / 25);
    h[i] += depth * siltFill * shelter * shelter * shallowness;
  }

  // 2. Shelter-weighted diffusion, so silted bays are genuinely FLAT rather
  //    than merely raised. A flat sheltered floor is what a harbour is.
  const tmp = new Float64Array(n);
  const maxPasses = Math.max(1, Math.round(shelterSmoothing));
  for (let pass = 0; pass < maxPasses; pass++) {
    tmp.set(h);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (water[i] !== OCEAN) continue;
        const shelter = 1 - exposure[i];
        // Each pass acts only on cells sheltered enough to still be smoothing.
        const rate = 0.22 * shelter;
        if (rate <= 0.001) continue;
        let sum = 0;
        let count = 0;
        for (let d = 0; d < 8; d++) {
          const nx = x + D8[d][0];
          const ny = y + D8[d][1];
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const ni = ny * width + nx;
          if (water[ni] !== OCEAN) continue;
          sum += tmp[ni];
          count++;
        }
        if (count === 0) continue;
        h[i] = tmp[i] + rate * (sum / count - tmp[i]);
      }
    }
  }

  // 3. Wave-cut shore platform: a shallow bench just offshore, cut across
  //    whatever the land profile was doing.
  for (let i = 0; i < n; i++) {
    if (water[i] !== OCEAN) continue;
    const offshore = -coastDist[i]; // Positive, in cells.
    if (offshore > platformWidth) continue;
    const t = 1 - offshore / platformWidth;
    const benchElev = seaLevel - platformDepth * (1 - t * 0.6);
    if (h[i] < benchElev) h[i] += (benchElev - h[i]) * 0.55 * t;
  }

  // 4. Shelf break. Past a knee distance offshore, the floor falls away.
  const breakCells = shelfBreakDistance * width;
  for (let i = 0; i < n; i++) {
    if (water[i] !== OCEAN) continue;
    const offshore = -coastDist[i];
    if (offshore <= breakCells) continue;
    const t = (offshore - breakCells) / (width - breakCells);
    h[i] -= shelfDropoff * (1 - Math.exp(-shelfSteepness * t));
  }

  // 5. Residual seabed texture — sand waves, scour, ripples. Small, and scaled
  //    by exposure so sheltered mud stays smooth.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (water[i] !== OCEAN) continue;
      const t = fbm(noiseSeed, (x / width) * 14, (y / height) * 14, { octaves: 3 }) - 0.5;
      h[i] += t * 2 * roughness * exposure[i];
    }
  }

  return { exposure };
}

/**
 * Identify sheltered, shallow, flat water: candidate harbour sites.
 *
 * Returned sorted best-first. The city stage will want this — a 1950s port town
 * exists because of its harbour, so the harbour should be found in the terrain
 * and the town placed around it, never the other way round.
 */
export function findHarbourSites(water, exposure, elevation, coastDist, seaLevel, { minDepth = 2, maxDepth = 14 } = {}) {
  const { width, height } = elevation;
  const h = elevation.data;
  const sites = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (water[i] !== OCEAN) continue;
      const depth = seaLevel - h[i];
      if (depth < minDepth || depth > maxDepth) continue;
      const offshore = -coastDist[i];
      if (offshore > 6) continue; // Must be close inshore to build against.
      // Shelter is the whole point; weight it heavily, then prefer sites with
      // usable depth right against the shore.
      const shelter = 1 - exposure[i];
      const score = shelter * shelter * (1 - Math.abs(depth - 7) / 10) * (1 - offshore / 8);
      if (score > 0) sites.push({ x, y, index: i, depth, shelter, score });
    }
  }
  sites.sort((a, b) => b.score - a.score);
  return sites;
}
