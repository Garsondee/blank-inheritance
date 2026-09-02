/**
 * Stage 1 orchestrator: seed in, terrain model out.
 *
 * The return value is deliberately a MODEL, not a picture. Everything the
 * renderer draws, and everything the later city stages will consume (buildable
 * land, harbour sites, river mouths, the coastline itself), is data here first.
 * That is the architectural commitment the whole idea rests on: when an
 * explosion carves a chunk out of the map mid-campaign, it edits a model and
 * re-renders, rather than painting over pixels.
 *
 * Pipeline order, each stage consuming the last:
 *
 *   uplift field  ->  PHASE 1: erode against a glacial lowstand
 *                 ->  flood to sea level      [the coastline appears here]
 *                 ->  sculpt the seafloor     [shelter, shore platform, shelf]
 *                 ->  PHASE 2: alluviate against the NEW shoreline
 *                 ->  re-flood                [deltas become land]
 *                 ->  extract vectors         [coastline, rivers, contours]
 *
 * The two erosion phases are not a refinement pass — they are two different
 * base levels, and the second one exists because of a real problem the first
 * one creates. Phase 1 builds its coastal plain down at the lowstand shoreline,
 * and the transgression then drowns exactly that plain, leaving mountains
 * dropping straight into deep water and nowhere flat for a town to stand.
 * Which is correct physics and a useless map.
 *
 * The fix is also the real history: after the sea rose, rivers spent the
 * Holocene refilling the drowned valleys, silting the bay heads into flat
 * ground and building deltas out across the shallows. Every major Japanese
 * coastal city stands on that post-transgression alluvium. Phase 2 is that
 * period, and it is what produces both the harbour (a drowned valley still deep
 * enough to float ships) and the town site (its head, filled flat) as two parts
 * of one landform instead of two unrelated decisions.
 */

import { Field } from '../core/field.mjs';
import { subSeed } from '../core/rng.mjs';
import { sculptSeafloor, findHarbourSites } from './bathymetry.mjs';
import { marchingSquares, simplify, polylineLength } from './contour.mjs';
import { erode, slopeField } from './erode.mjs';
import { routeFlow } from './flow.mjs';
import {
  chooseSeaLevel,
  coastDistance,
  depthBandOf,
  floodWorld,
  landFraction,
  LAND,
  OCEAN,
} from './sealevel.mjs';
import { makeInitialSurface, makePrecipitationField, makeUpliftField } from './uplift.mjs';

/**
 * Default parameters, chosen for a Japanese Pacific coastal range.
 *
 * These are tuned, not guessed, and the tuning target is the stream power law's
 * own equilibrium slope, S = U / (K * A^m), evaluated at both ends of the
 * drainage network:
 *
 *   - On a hillslope (one cell of catchment, ~2500 m^2):
 *       S = 1.5e-4 / (8e-6 * 50) = 0.375  -> a 37% slope.
 *   - In a channel with a 1 km^2 catchment:
 *       S = 1.5e-4 / (8e-6 * 1000) = 0.019 -> a 2% river gradient.
 *
 * Steep forested hillsides draining into short, comparatively gentle valley
 * floors is exactly the Japanese coastal profile, and it is what makes the town
 * site legible: the flat ground is scarce, obviously bounded, and therefore
 * worth fighting over. A softer K or a slower uplift silently produces rolling
 * English downs instead, and no amount of colour grading rescues that.
 *
 * Measured output at these settings (256 cells at 50 m, seed 1950): ~920 m of
 * relief, 3.0 km^2 of ground under 5% slope, 16 km^2 under 15%, and 64 km of
 * coastline across a 12.8 km map — a roughly 5:1 indentation ratio, which is
 * ria-coast territory.
 */
export const DEFAULT_PARAMS = {
  width: 512,
  height: 512,
  metresPerCell: 25, // 512 * 25 m = 12.8 km across.

  // Tectonics.
  upliftInland: 1.5e-4, // m/yr — brisk, as an active margin should be.
  upliftCoast: 7.5e-6,
  massifCount: 3,

  // Erosion.
  iterations: 400,
  dt: 10000, // years per step; 400 * 10 kyr = 4 Myr of landscape evolution.
  K: 8.0e-6, // Fluvial erodibility.
  m: 0.5, // With n = 1, the standard m/n = 0.5.
  D: 0.004, // Hillslope diffusivity, m^2/yr. Higher smothers the drainage network.
  G: 1.0, // Deposition coefficient; this is what builds the coastal plain.
  fillEvery: 3,

  // The marine transgression.
  waterFraction: 0.42,

  // Phase 2: Holocene alluviation against the new shoreline. Short (a few
  // hundred kyr against phase 1's few Myr) and deposition-dominated.
  alluvialIterations: 300,
  alluvialDt: 2000,
  alluvialG: 40, // Strongly depositional: this phase fills, it does not carve.
  alluvialUpliftFactor: 0.0, // Tectonics are irrelevant over this phase's span.
  alluvialSlopeScale: 0.02, // Critical gradient: alluvium fills flats, not hillsides.
  alluvialSinkDepth: 25, // Water deeper than this exports sediment out of the model.
  submarineErodibility: 0.03, // There is no river below sea level.

  // Vector extraction.
  riverAreaThreshold: 3.0e5, // m^2 of catchment before a channel is drawn.
  contourInterval: 50, // metres
  simplifyTolerance: 0.3, // grid units
  minCoastRingLength: 6, // grid units; drops single-cell speckle islands
};

export function generateTerrain(seed, overrides = {}) {
  const params = { ...DEFAULT_PARAMS, ...overrides };
  const { width, height, metresPerCell: dx } = params;
  const startedAt = process.hrtime.bigint();

  // --- Tectonic setup ------------------------------------------------------
  const uplift = makeUpliftField(width, height, seed, {
    baseRate: params.upliftInland,
    coastRate: params.upliftCoast,
    massifCount: params.massifCount,
  });
  const precipitation = makePrecipitationField(width, height, seed);
  const elevation = makeInitialSurface(width, height, seed);

  // --- Phase 1: subaerial landscape evolution at the lowstand --------------
  const totalSteps = params.iterations + params.alluvialIterations;
  const report = params.onProgress
    ? (offset) => (step) => params.onProgress(offset + step, totalSteps)
    : () => null;

  erode(elevation, uplift, {
    iterations: params.iterations,
    dt: params.dt,
    K: params.K,
    m: params.m,
    D: params.D,
    G: params.G,
    dx,
    precipitation,
    fillEvery: params.fillEvery,
    onProgress: report(0),
  });

  const subaerialRelief = { min: elevation.min(), max: elevation.max() };

  // --- The marine transgression --------------------------------------------
  // Everything above was a landscape draining to a LOW base level. Raising the
  // sea over it is the post-glacial transgression, and the drowned valley
  // network it leaves behind is the ria coastline.
  const seaLevel = chooseSeaLevel(elevation, { waterFraction: params.waterFraction });
  let water = floodWorld(elevation, seaLevel);
  let coastDist = coastDistance(water, width, height);

  // --- Sculpt the seafloor -------------------------------------------------
  const { exposure } = sculptSeafloor(elevation, water, coastDist, seaLevel, seed);

  // --- Phase 2: alluviation against the new shoreline ----------------------
  if (params.alluvialIterations > 0) {
    const n = width * height;
    const outlets = new Uint8Array(n);
    const erodibility = new Float64Array(n);
    const ceiling = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const submerged = water[i] !== LAND;
      const depth = seaLevel - elevation.data[i];
      // Sediment reaching water deeper than the sink depth is gone for good;
      // shallower water can be filled in, which is how a delta advances.
      outlets[i] = submerged && depth > params.alluvialSinkDepth ? 1 : 0;
      erodibility[i] = submerged ? params.submarineErodibility : 1;
      ceiling[i] = submerged ? seaLevel : -Infinity;
    }
    for (let y = 0; y < height; y++) outlets[y * width] = 1; // Map edge always drains.

    // Uplift is switched off (or nearly) for this phase. Phase 1 spans millions
    // of years and is uplift-driven; this one is the tail end of a glacial
    // cycle, over which tectonics move the land by a metre or two and are
    // simply not the story. Leaving phase 1's uplift rate running here does not
    // add realism, it just lifts the whole map bodily and drowns the effect
    // this phase exists to produce.
    const alluvialUplift = new Field(width, height);
    if (params.alluvialUpliftFactor > 0) {
      for (let i = 0; i < n; i++) alluvialUplift.data[i] = uplift.data[i] * params.alluvialUpliftFactor;
    }

    erode(elevation, alluvialUplift, {
      iterations: params.alluvialIterations,
      dt: params.alluvialDt,
      K: params.K,
      m: params.m,
      D: params.D,
      G: params.alluvialG,
      dx,
      precipitation,
      fillEvery: params.fillEvery,
      outlets,
      erodibility,
      ceiling,
      depositionSlopeScale: params.alluvialSlopeScale,
      onProgress: report(params.iterations),
    });

    // Re-flood at the SAME sea level: anything the rivers built up past the
    // waterline is now land, and the coastline has advanced there.
    water = floodWorld(elevation, seaLevel);
    coastDist = coastDistance(water, width, height);
  }

  // --- Final hydrology on the finished surface -----------------------------
  const flow = routeFlow(elevation, { precipitation, cellArea: dx * dx });
  const slope = slopeField(elevation);

  // --- Vector extraction ---------------------------------------------------
  const relativeElevation = new Field(width, height);
  for (let i = 0; i < elevation.length; i++) relativeElevation.data[i] = elevation.data[i] - seaLevel;

  const coastline = marchingSquares(relativeElevation, 0, { minLength: 3 })
    .map((line) => simplify(line, params.simplifyTolerance))
    .filter((line) => polylineLength(line) >= params.minCoastRingLength);

  const contours = extractContours(relativeElevation, params);
  const rivers = extractRivers(elevation, flow, water, params);
  const harbours = findHarbourSites(water, exposure, elevation, coastDist, seaLevel).slice(0, 24);
  const mouths = findRiverMouths(rivers, water, width);

  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;

  return {
    meta: {
      seed,
      width,
      height,
      metresPerCell: dx,
      extentMetres: [width * dx, height * dx],
      seaLevel,
      generatedAt: null, // Stamped by the caller; the generator itself is time-free.
      elapsedMs,
      params,
    },
    stats: {
      landFraction: landFraction(water),
      subaerialRelief,
      elevationAboveSea: { min: seaLevel, max: elevation.max() },
      deepest: seaLevel - elevation.min(),
      coastlineLengthKm: (coastline.reduce((a, l) => a + polylineLength(l), 0) * dx) / 1000,
      coastlineRings: coastline.length,
      riverSegments: rivers.length,
      harbourSites: harbours.length,
    },
    // Raw fields, for the renderer and for later stages.
    elevation,
    uplift,
    precipitation,
    water,
    coastDist,
    exposure,
    slope,
    flow,
    seaLevel,
    // Extracted vectors.
    coastline,
    contours,
    rivers,
    harbours,
    mouths,
  };
}

/** Topographic contours above sea level and bathymetric contours below it. */
function extractContours(relative, params) {
  const { contourInterval, simplifyTolerance } = params;
  const maxAbove = relative.max();
  const maxBelow = -relative.min();
  const land = [];
  const sea = [];

  for (let level = contourInterval; level < maxAbove; level += contourInterval) {
    const lines = marchingSquares(relative, level, { minLength: 4 })
      .map((l) => simplify(l, simplifyTolerance))
      .filter((l) => polylineLength(l) > 3);
    if (lines.length) land.push({ level, lines, major: level % (contourInterval * 5) === 0 });
  }

  // Bathymetric contours at gameplay-meaningful depths rather than a regular
  // interval — these lines are also the depth bands, so they should sit where
  // the rules change, not every 50 m.
  for (const depth of [2, 5, 10, 20, 50, 100, 200, 500]) {
    if (depth > maxBelow) break;
    const lines = marchingSquares(relative, -depth, { minLength: 4 })
      .map((l) => simplify(l, simplifyTolerance))
      .filter((l) => polylineLength(l) > 3);
    if (lines.length) sea.push({ depth, lines, band: depthBandOf(depth) });
  }

  return { land, sea };
}

/**
 * The channel network, as segments carrying their discharge.
 *
 * Each cell whose catchment exceeds the threshold contributes one segment to
 * its receiver. Width is set by the square root of drainage area, which is
 * hydraulic geometry's actual scaling (channel width goes roughly as the square
 * root of discharge) rather than an arbitrary taper.
 *
 * Rivers stop at the waterline — below it they are estuaries and belong to the
 * sea, not the drainage network.
 */
function extractRivers(elevation, flow, water, params) {
  const { width, metresPerCell: dx } = params;
  const { area, receivers } = flow;
  const segments = [];
  const maxArea = area.reduce((a, b) => (b > a ? b : a), 0);

  for (let i = 0; i < area.length; i++) {
    if (water[i] !== LAND) continue;
    if (area[i] < params.riverAreaThreshold) continue;
    const r = receivers[i];
    if (r === i) continue;
    const x1 = i % width;
    const y1 = (i / width) | 0;
    const x2 = r % width;
    const y2 = (r / width) | 0;
    segments.push({
      from: [x1, y1],
      to: [x2, y2],
      area: area[i],
      // Normalised 0..1 for rendering; sqrt because width ~ sqrt(discharge).
      strength: Math.sqrt(area[i] / maxArea),
      reachesSea: water[r] === OCEAN,
      catchmentKm2: area[i] / 1e6,
      dx,
    });
  }
  return segments;
}

/**
 * River mouths: where a channel meets the sea.
 *
 * These are the sites that matter most to the city stage — a river mouth is
 * where the flat alluvial ground is, where a bridge has to go, and where a port
 * town historically grows. Sorted by catchment, so the first entry is the main
 * river and therefore the town's own channel.
 */
function findRiverMouths(rivers, water, width) {
  const mouths = rivers
    .filter((s) => s.reachesSea)
    .map((s) => ({
      x: s.to[0],
      y: s.to[1],
      catchmentKm2: s.catchmentKm2,
      index: s.to[1] * width + s.to[0],
    }))
    .sort((a, b) => b.catchmentKm2 - a.catchmentKm2);

  // Deduplicate mouths that land on the same estuary.
  const kept = [];
  for (const m of mouths) {
    if (kept.some((k) => Math.hypot(k.x - m.x, k.y - m.y) < 8)) continue;
    kept.push(m);
    if (kept.length >= 12) break;
  }
  return kept;
}
