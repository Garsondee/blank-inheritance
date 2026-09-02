/**
 * Amplification: coarse physics grid -> fine detail grid.
 *
 * Stage 2. Erosion can afford roughly 3–6 m cells (measured; see
 * design/map-generation.md §2), but the map has to be drawn and played at 1–2 m
 * for individual buildings and survey-accurate contours to mean anything. This
 * module covers that last factor of two to four.
 *
 * Three steps, and the ORDER is the whole design:
 *
 *   1. UPSAMPLE       Catmull-Rom to the fine grid. Smooth, and on its own,
 *                     lifeless — a blurred version of the coarse terrain.
 *   2. DETAIL         Add flow-aligned noise, modulated by terrain descriptors,
 *                     so hillsides get rill-like grain running downslope while
 *                     alluvial floors stay flat.
 *   3. RESTORE        Put the coarse structure back, keeping only what step 2
 *                     added at fine scale.
 *
 * Step 3 is what makes step 2 safe. Without it, synthesised detail is free to
 * shift a ridge crest or a shoreline, and every downstream stage that keyed off
 * the coarse model — the coastline, the harbour sites, the town site — would
 * silently disagree with the terrain it was chosen from. With it, the coarse
 * structure survives to within centimetres, so step 2 can be as aggressive as
 * the art direction wants.
 *
 * THERE WAS A FOURTH STEP, and measuring it is why it is gone. The design
 * called for a short erosion pass AT fine resolution, to turn the synthetic
 * grain into real connected draining rills. It does the opposite. Measured
 * roughness gain over a plain upsample: 2.24x with refinement OFF, 1.86x at the
 * intended settings, 1.51x with the timestep cranked fifty-fold (2026-08-23).
 *
 * The reason is structural rather than a tuning miss. The refinement pass runs
 * with no uplift and a fixed base level, so it has no driving force at all, and
 * erosion under those conditions can only relax a surface toward grade — it has
 * no mechanism to CREATE relief. All it did was smooth away the detail step 2
 * had just added. Making it work means giving it something to cut toward: a
 * small base-level fall, or continued uplift across the refinement interval.
 * That is a real follow-up; the code is still here behind `refineIterations`,
 * which now defaults to 0.
 *
 * On the patch-synthesis question: this deliberately does NOT use exemplar
 * synthesis (Zhou et al. 2007 and successors). The argument from the first
 * design conversation still applies — patch methods are locally constrained and
 * excellent at texture — but a physics refinement pass produces detail that is
 * causally correct and self-consistent with the drainage network, which no
 * amount of borrowed texture can guarantee. Exemplar transfer stays available
 * as a later polish layer if hillsides still read as too uniform; it is not
 * needed to get a fine grid at all. See design/map-generation.md §3.
 */

import { Field } from '../core/field.mjs';
import { fbm } from '../core/noise.mjs';
import { subSeed } from '../core/rng.mjs';
import { computeDescriptors } from './descriptors.mjs';
import { erode } from './erode.mjs';
import { routeFlow } from './flow.mjs';
import { LAND, floodWorld } from './sealevel.mjs';

export const DEFAULT_AMPLIFY = {
  factor: 4, // Fine cells per coarse cell, per axis.

  // Detail synthesis.
  detailAmplitude: 9.0, // Metres of relief added on a fully-rough hillside.
  detailOctaves: 5,

  // Detail scale is expressed PER COARSE CELL, not per fine cell, and that is
  // not a convenience — it is forced by how the restore step works.
  //
  // restoreCoarseStructure removes anything whose block average differs from
  // the coarse grid, so synthesised detail only survives if it averages to
  // roughly zero within one coarse block. Detail at a wavelength near or above
  // the block size does not, and is simply deleted again.
  //
  // That leaves a usable band between the fine grid's Nyquist limit (2 fine
  // cells) and about half a coarse block. At factor 4 that band is 2 to 2 cells
  // wide — i.e. empty, and measurably so: amplification at factor 4 produced
  // almost no visible change (2026-08-23). Amplification is only meaningful at
  // a LARGE factor. Factor 8 gives a real band; 16 gives a generous one.
  detailCyclesPerCoarseCell: 3.0,
  streakLengthCoarseCells: 0.9, // LIC smear length, each way.
  streakGain: 2.6, // Smearing averages amplitude away; this puts it back.

  // Refinement is switched off below this gradient. Flats are where
  // depression-filling leaves artificial parallel flow paths, and letting
  // erosion run there incises them into long straight false valleys — visible
  // as ruled lines across the terrain (found 2026-08-23). Physically it is also
  // just right: floodplains do not grow rills.
  refineMinSlope: 0.08,
  slopeOnset: 0.05, // Below this gradient, no detail at all.
  slopeSaturation: 0.45, // At and above this gradient, full detail.
  alluvialHand: 8.0, // Metres above drainage below which ground reads alluvial.
  // The seafloor sculptor (bathymetry.mjs) already gives the sea bed its own
  // shelter-weighted texture, so this stays low. At 0.35 the streaked detail read
  // as fur over the whole shelf rather than as a sea floor (2026-08-23).
  submarineDetailScale: 0.1,

  // Fine erosion refinement. OFF by default — see the module header: with no
  // uplift and a fixed base level it has no driving force, so it smooths the
  // synthesised detail away instead of sharpening it into rills. Kept because
  // giving it a base-level fall would plausibly make it work.
  refineIterations: 0,
  refineDt: 400,
  refineK: 4.0e-6,
  refineD: 0.0015,
  refineG: 2.0,
  refineSlopeScale: 0.02,

  // Structure restoration.
  // Correction passes. Each roughly halves the residual: measured 3.54 / 1.65 /
  // 0.83 / 0.43 / 0.13 m mean block error at 1/2/3/4/6 passes against a
  // deliberately violent disturbance (2026-08-23). Four sits comfortably inside
  // decimetre storage precision and costs one downsample plus one upsample each.
  restoreIterations: 4,
};

/**
 * Catmull-Rom upsample. C1-continuous and interpolating, so coarse cell values
 * are reproduced exactly at their fine-grid positions and nothing overshoots
 * the way a plain cubic can on a cliff edge.
 */
export function upsample(field, factor) {
  const { width: cw, height: ch } = field;
  const fw = cw * factor;
  const fh = ch * factor;
  const out = new Field(fw, fh);
  const src = field.data;

  const clampX = (x) => (x < 0 ? 0 : x >= cw ? cw - 1 : x);
  const clampY = (y) => (y < 0 ? 0 : y >= ch ? ch - 1 : y);
  const at = (x, y) => src[clampY(y) * cw + clampX(x)];

  const catmull = (p0, p1, p2, p3, t) => {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  };

  for (let fy = 0; fy < fh; fy++) {
    // Fine cell centres map to coarse coordinates offset by half a cell each
    // way, otherwise the whole grid shifts by half a coarse cell.
    const cy = (fy + 0.5) / factor - 0.5;
    const y0 = Math.floor(cy);
    const ty = cy - y0;
    for (let fx = 0; fx < fw; fx++) {
      const cx = (fx + 0.5) / factor - 0.5;
      const x0 = Math.floor(cx);
      const tx = cx - x0;
      let acc = 0;
      const rows = [];
      for (let r = -1; r <= 2; r++) {
        rows.push(catmull(at(x0 - 1, y0 + r), at(x0, y0 + r), at(x0 + 1, y0 + r), at(x0 + 2, y0 + r), tx));
      }
      acc = catmull(rows[0], rows[1], rows[2], rows[3], ty);
      out.data[fy * fw + fx] = acc;
    }
  }
  return out;
}

/**
 * Bilinear upsample of a descriptor field.
 *
 * NOT nearest-neighbour, which was the first implementation and was wrong in a
 * way that showed: a descriptor held constant across each coarse block jumps at
 * every block boundary, and since these fields MODULATE synthesised detail,
 * those jumps came through as straight seams ruled across the terrain on a
 * coarse-cell grid (found 2026-08-23).
 */
function upsampleBilinear(data, cw, ch, factor) {
  const fw = cw * factor;
  const fh = ch * factor;
  const out = new Float32Array(fw * fh);
  const at = (x, y) => data[Math.min(ch - 1, Math.max(0, y)) * cw + Math.min(cw - 1, Math.max(0, x))];
  for (let fy = 0; fy < fh; fy++) {
    const cy = (fy + 0.5) / factor - 0.5;
    const y0 = Math.floor(cy);
    const ty = cy - y0;
    for (let fx = 0; fx < fw; fx++) {
      const cx = (fx + 0.5) / factor - 0.5;
      const x0 = Math.floor(cx);
      const tx = cx - x0;
      out[fy * fw + fx] =
        at(x0, y0) * (1 - tx) * (1 - ty) + at(x0 + 1, y0) * tx * (1 - ty) +
        at(x0, y0 + 1) * (1 - tx) * ty + at(x0 + 1, y0 + 1) * tx * ty;
    }
  }
  return out;
}

/**
 * Upsample an ANGLE field by interpolating its unit vector, not the angle.
 *
 * Interpolating radians directly averages across the +/-pi wrap, so a boundary
 * between two cells facing nearly due west resolves to a cell facing due east —
 * a hard reversal in the middle of a smooth slope.
 */
function upsampleAngle(angles, cw, ch, factor) {
  const cos = new Float64Array(angles.length);
  const sin = new Float64Array(angles.length);
  for (let i = 0; i < angles.length; i++) {
    cos[i] = Math.cos(angles[i]);
    sin[i] = Math.sin(angles[i]);
  }
  return { cos: upsampleBilinear(cos, cw, ch, factor), sin: upsampleBilinear(sin, cw, ch, factor) };
}

const smootherstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/**
 * Add erosional grain to the upsampled surface.
 *
 * Two things make this read as terrain rather than as noise:
 *
 * ANISOTROPY. Real hillslope detail runs DOWNHILL — rills, gullies, creep
 * lineations and terracette treads all share the slope's own direction.
 * Isotropic noise, at any amplitude or octave count, reads as static sprinkled
 * over a landform.
 *
 * The first attempt got that by rotating the noise sample frame into the local
 * slope azimuth per pixel. That does not work: the rotation angle varies across
 * space, so the sampled pattern tears wherever it changes, and the output came
 * out ruled with straight seams. This version uses LINE INTEGRAL CONVOLUTION
 * instead — generate ordinary isotropic noise once, then smear each pixel along
 * the flow line running through it. The underlying field stays continuous and
 * only the FILTER varies, so neighbouring pixels average nearly the same samples
 * and there is nothing to tear. Following the aspect field step by step rather
 * than in a straight line also makes the streaks curve with the terrain, which
 * is what real rills do.
 *
 * MODULATION. Amplitude is scaled by where the cell is, not applied uniformly:
 * near-flat ground gets nothing, steep ground gets everything, ground close
 * above its drainage is suppressed because that is alluvium and alluvium is
 * flat, and submerged cells are damped because the seafloor sculptor has already
 * given bathymetry its own texture.
 */
export function addErosionalDetail(fine, descriptors, coarseSize, factor, seed, seaLevel, opts = {}) {
  const o = { ...DEFAULT_AMPLIFY, ...opts };
  const { width: fw, height: fh } = fine;
  const [cw, ch] = coarseSize;
  const noiseSeed = subSeed(seed, 'amplify', 'detail');

  const slope = upsampleBilinear(descriptors.slope, cw, ch, factor);
  const hand = upsampleBilinear(descriptors.hand, cw, ch, factor);
  const { cos: aspectCos, sin: aspectSin } = upsampleAngle(descriptors.aspect, cw, ch, factor);

  // Scale-independent: both are specified against the coarse cell, so changing
  // the amplification factor changes how much detail fits, not what it is.
  const frequency = o.detailCyclesPerCoarseCell / factor;
  const streakLength = o.streakLengthCoarseCells * factor;
  const steps = Math.max(1, Math.round(streakLength));
  const stepSize = streakLength / steps;

  // 1. Isotropic noise, evaluated once into a buffer so the convolution below is
  //    array lookups rather than tens of millions of fBm evaluations.
  const noise = new Float32Array(fw * fh);
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      noise[y * fw + x] =
        fbm(noiseSeed, x * frequency, y * frequency, {
          octaves: o.detailOctaves,
          frequency: 1,
        }) - 0.5;
    }
  }

  // 2. Smear along flow lines, both up- and downslope from each pixel.
  const sampleNoise = (x, y) => {
    const xi = x < 0 ? 0 : x >= fw ? fw - 1 : x | 0;
    const yi = y < 0 ? 0 : y >= fh ? fh - 1 : y | 0;
    return noise[yi * fw + xi];
  };
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const i = y * fw + x;

      const rough = smootherstep(o.slopeOnset, o.slopeSaturation, slope[i]);
      if (rough <= 0) continue;
      const alluvial = 1 - smootherstep(0, o.alluvialHand, hand[i]);
      let amplitude = o.detailAmplitude * rough * (1 - 0.85 * alluvial);
      if (fine.data[i] < seaLevel) amplitude *= o.submarineDetailScale;
      if (amplitude < 1e-6) continue;

      let sum = noise[i];
      let count = 1;
      for (const direction of [1, -1]) {
        let px = x + 0.5;
        let py = y + 0.5;
        for (let s = 0; s < steps; s++) {
          const xi = px < 0 ? 0 : px >= fw ? fw - 1 : px | 0;
          const yi = py < 0 ? 0 : py >= fh ? fh - 1 : py | 0;
          const j = yi * fw + xi;
          px += aspectCos[j] * direction * stepSize;
          py += aspectSin[j] * direction * stepSize;
          sum += sampleNoise(px, py);
          count++;
        }
      }

      fine.data[i] += (sum / count) * 2 * amplitude * o.streakGain;
    }
  }
  return fine;
}

/**
 * Restore the coarse structure, keeping only fine-scale additions.
 *
 * The guarantee wanted here is specific: **block-averaging the fine grid back
 * down must reproduce the coarse grid.** If that holds, every downstream
 * consumer that keyed off the coarse physics — the coastline, harbour sites,
 * river mouths, the town site — still agrees with the terrain, and the
 * refinement pass is free to be as aggressive as it likes.
 *
 * The first implementation tried to get there with a Laplacian detail transfer
 * against a repeated box blur, and it did not work: measured mean error 5.13 m
 * and max 41.6 m against the coarse surface (2026-08-23). A box blur at coarse
 * cell radius removes content near and above that wavelength, but the erosion
 * refinement also moves material at scales well ABOVE one coarse cell, and none
 * of that was being taken back out.
 *
 * This version measures the actual quantity the invariant is about and corrects
 * it directly: block-average the fine grid, take the difference from the coarse
 * grid, and add that difference back smoothly (Catmull-Rom, so no block seams).
 * The residual after one pass is second-order, so a couple of iterations drives
 * it to essentially nothing.
 */
export function restoreCoarseStructure(fine, coarse, factor, iterations = 2) {
  for (let it = 0; it < iterations; it++) {
    const averaged = blockDownsample(fine, factor);
    const delta = new Field(coarse.width, coarse.height);
    for (let i = 0; i < delta.data.length; i++) {
      delta.data[i] = coarse.data[i] - averaged.data[i];
    }
    const correction = upsample(delta, factor);
    for (let i = 0; i < fine.data.length; i++) fine.data[i] += correction.data[i];
  }
  return fine;
}

/** Mean of each factor x factor block — the exact quantity the invariant is about. */
export function blockDownsample(fine, factor) {
  const cw = Math.floor(fine.width / factor);
  const ch = Math.floor(fine.height / factor);
  const out = new Field(cw, ch);
  const inv = 1 / (factor * factor);
  for (let cy = 0; cy < ch; cy++) {
    for (let cx = 0; cx < cw; cx++) {
      let sum = 0;
      for (let j = 0; j < factor; j++) {
        const row = (cy * factor + j) * fine.width + cx * factor;
        for (let i = 0; i < factor; i++) sum += fine.data[row + i];
      }
      out.data[cy * cw + cx] = sum * inv;
    }
  }
  return out;
}

/**
 * The full amplification pass.
 *
 * Takes a stage-1 terrain model and returns a fine-resolution elevation field
 * plus the water mask and flow solution recomputed at that resolution.
 *
 * Sea level is NOT recomputed. It is a property of the world, already fixed by
 * the coarse run, and re-deriving it from a fine-grid quantile would silently
 * move the entire coastline every time the amplification factor changed.
 */
export function amplifyTerrain(terrain, seed, opts = {}) {
  const o = { ...DEFAULT_AMPLIFY, ...opts };
  const factor = o.factor;
  const { elevation: coarse, seaLevel, meta } = terrain;
  const coarseSize = [coarse.width, coarse.height];
  const fineMetresPerCell = meta.metresPerCell / factor;

  // 1. Descriptors at the coarse scale, where they are meaningful.
  const descriptors = computeDescriptors(coarse, terrain.flow, {
    metresPerCell: meta.metresPerCell,
  });

  // 2. Upsample.
  const fine = upsample(coarse, factor);

  // 3. Synthetic grain.
  addErosionalDetail(fine, descriptors, coarseSize, factor, seed, seaLevel, o);

  // 4. Fine-scale erosion refinement, so the grain becomes real drainage.
  if (o.refineIterations > 0) {
    const water = floodWorld(fine, seaLevel);
    const n = fine.data.length;
    const outlets = new Uint8Array(n);
    const erodibility = new Float64Array(n);
    const fineSlope = upsampleBilinear(descriptors.slope, coarse.width, coarse.height, factor);
    for (let i = 0; i < n; i++) {
      const submerged = water[i] !== LAND;
      outlets[i] = submerged ? 1 : 0;
      erodibility[i] = submerged || fineSlope[i] < o.refineMinSlope ? 0 : 1;
    }
    for (let y = 0; y < fine.height; y++) outlets[y * fine.width] = 1;

    erode(fine, new Field(fine.width, fine.height), {
      iterations: o.refineIterations,
      dt: o.refineDt,
      K: o.refineK,
      m: 0.5,
      D: o.refineD,
      G: o.refineG,
      dx: fineMetresPerCell,
      fillEvery: 5,
      outlets,
      erodibility,
      depositionSlopeScale: o.refineSlopeScale,
      onProgress: o.onProgress ?? null,
    });
  }

  // 5. Put the coarse structure back.
  restoreCoarseStructure(fine, coarse, factor, o.restoreIterations);

  // 6. Re-derive everything that depends on elevation, at the new resolution.
  const water = floodWorld(fine, seaLevel);
  const flow = routeFlow(fine, { cellArea: fineMetresPerCell * fineMetresPerCell });

  return {
    elevation: fine,
    water,
    flow,
    seaLevel,
    descriptors,
    meta: {
      ...meta,
      width: fine.width,
      height: fine.height,
      metresPerCell: fineMetresPerCell,
      amplifiedFrom: { width: coarse.width, metresPerCell: meta.metresPerCell, factor },
    },
  };
}

/**
 * Pack an elevation field into Int16 decimetres.
 *
 * Measured (design/map-generation.md §2): a 1 m grid over 12.8 km is 0.31 GB as
 * Int16 against 1.22 GB as Float64. Decimetre precision is far finer than the
 * terrain is meaningful to, and the range (±3276.7 m) covers everything from
 * the shelf floor to the highest peak with room to spare.
 */
export function toDecimetres(field) {
  const out = new Int16Array(field.data.length);
  for (let i = 0; i < field.data.length; i++) {
    const v = Math.round(field.data[i] * 10);
    out[i] = v < -32768 ? -32768 : v > 32767 ? 32767 : v;
  }
  return out;
}

/** Inverse of toDecimetres, for tests and for reloading a stored DTM. */
export function fromDecimetres(data, width, height) {
  const f = new Field(width, height);
  for (let i = 0; i < data.length; i++) f.data[i] = data[i] / 10;
  return f;
}
