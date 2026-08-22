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
 *   uplift field  ->  erode (uplift + incision + diffusion + deposition)
 *                 ->  flood to sea level   [the coastline appears here]
 *                 ->  sculpt the seafloor  [shelter, shore platform, shelf]
 *                 ->  extract vectors      [coastline, rivers, contours]
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
 * The numbers are not arbitrary — they are set so the stream power law's
 * equilibrium slope, S = U / (K * A^m), lands where Japanese terrain actually
 * sits. At a 1 km^2 catchment: S = 1e-3 / (3e-6 * 1000) = 0.33, i.e. a 33%
 * hillslope, which is the steep, densely dissected terrain the setting wants.
 * A gentler K or a slower uplift would silently produce rolling English downs
 * instead, and no amount of colour grading would rescue it.
 */
export const DEFAULT_PARAMS = {
  width: 512,
  height: 512,
  metresPerCell: 25, // 512 * 25 m = 12.8 km across.

  // Tectonics.
  upliftInland: 1.0e-3, // m/yr — fast, as an active margin should be.
  upliftCoast: 5.0e-5,
  massifCount: 3,

  // Erosion.
  iterations: 300,
  dt: 10000, // years per step; 300 * 10 kyr = 3 Myr of landscape evolution.
  K: 3.0e-6, // Fluvial erodibility.
  m: 0.5, // With n = 1, the standard m/n = 0.5.
  D: 0.02, // Hillslope diffusivity, m^2/yr.
  G: 1.0, // Deposition coefficient; this is what builds the coastal plain.
  fillEvery: 3,

  // The marine transgression.
  waterFraction: 0.42,

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

  // --- Landscape evolution -------------------------------------------------
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
    onProgress: params.onProgress ?? null,
  });

  const subaerialRelief = { min: elevation.min(), max: elevation.max() };

  // --- Flood it ------------------------------------------------------------
  // Everything above was a landscape draining to a LOW base level. Raising the
  // sea over it is the Holocene marine transgression, and the drowned valley
  // network it leaves behind is the ria coastline.
  const seaLevel = chooseSeaLevel(elevation, { waterFraction: params.waterFraction });
  const water = floodWorld(elevation, seaLevel);
  const coastDist = coastDistance(water, width, height);

  // --- Sculpt the seafloor -------------------------------------------------
  const { exposure } = sculptSeafloor(elevation, water, coastDist, seaLevel, seed);

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
