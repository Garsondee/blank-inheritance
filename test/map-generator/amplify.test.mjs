/**
 * Tests for stage 2: terrain descriptors and amplification.
 *
 * The load-bearing test here is the structure-preservation invariant —
 * block-averaging the fine grid must reproduce the coarse grid. Everything
 * downstream of the physics (coastline, harbour sites, river mouths, and
 * eventually the whole city) is sited against the coarse solution, so if
 * amplification is free to move a ridge, all of it silently drifts out of
 * agreement with the terrain it was chosen from.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Field } from '../../tools/map-generator/core/field.mjs';
import { makeRng, gaussian } from '../../tools/map-generator/core/rng.mjs';
import { routeFlow } from '../../tools/map-generator/terrain/flow.mjs';
import {
  computeDescriptors,
  heightAboveDrainage,
  slopeAndAspect,
  curvature,
} from '../../tools/map-generator/terrain/descriptors.mjs';
import {
  upsample,
  blockDownsample,
  restoreCoarseStructure,
  addErosionalDetail,
  amplifyTerrain,
  toDecimetres,
  fromDecimetres,
  DEFAULT_AMPLIFY,
} from '../../tools/map-generator/terrain/amplify.mjs';
import { generateTerrain } from '../../tools/map-generator/terrain/generate.mjs';

// ---------------------------------------------------------------------------
// Descriptors
// ---------------------------------------------------------------------------

test('slopeAndAspect reports the true gradient of a constant ramp, and points downhill', () => {
  const N = 20;
  const dx = 10;
  const ramp = Field.from(N, N, (x) => x * 5); // rises to the +x direction
  const { slope, aspect } = slopeAndAspect(ramp, dx);
  const i = 10 * N + 10;
  assert.ok(Math.abs(slope[i] - 0.5) < 1e-9, `expected slope 0.5, got ${slope[i]}`);
  // Downhill is -x, i.e. an azimuth of pi.
  assert.ok(Math.abs(Math.abs(aspect[i]) - Math.PI) < 1e-9, `expected aspect +/-pi, got ${aspect[i]}`);
});

test('curvature is positive on a hilltop and negative in a hollow', () => {
  const N = 21;
  const hill = Field.from(N, N, (x, y) => -(((x - 10) ** 2 + (y - 10) ** 2)));
  const bowl = Field.from(N, N, (x, y) => ((x - 10) ** 2 + (y - 10) ** 2));
  assert.ok(curvature(hill, 1)[10 * N + 10] > 0, 'a convex hilltop should read positive');
  assert.ok(curvature(bowl, 1)[10 * N + 10] < 0, 'a concave hollow should read negative');
});

test('heightAboveDrainage is zero in channels and rises up the hillslope', () => {
  const N = 40;
  // A V-shaped valley draining to -x, with the floor along y = 20.
  const elev = Field.from(N, N, (x, y) => x * 2 + Math.abs(y - 20) * 6);
  const flow = routeFlow(elev, { cellArea: 1 });
  const hand = heightAboveDrainage(elev, flow, 20);

  const onFloor = hand[20 * N + 20];
  const upSlope = hand[10 * N + 20];
  assert.ok(onFloor < upSlope, `valley floor HAND (${onFloor}) should be below hillslope HAND (${upSlope})`);
  assert.ok(onFloor >= 0 && upSlope >= 0, 'HAND is never negative');
});

test('heightAboveDrainage never exceeds the cell elevation above base level', () => {
  const rng = makeRng(3);
  const elev = Field.from(30, 30, (x) => x * 4 + gaussian(rng) * 2);
  const flow = routeFlow(elev, { cellArea: 1 });
  const hand = heightAboveDrainage(elev, flow, 25);
  for (let i = 0; i < hand.length; i++) {
    assert.ok(Number.isFinite(hand[i]) && hand[i] >= 0, `bad HAND at ${i}: ${hand[i]}`);
  }
});

test('computeDescriptors returns every field the amplifier needs, all finite', () => {
  const rng = makeRng(9);
  const elev = Field.from(32, 32, (x) => x * 3 + gaussian(rng) * 2);
  const flow = routeFlow(elev, { cellArea: 625 });
  const d = computeDescriptors(elev, flow, { metresPerCell: 25 });
  for (const key of ['slope', 'aspect', 'curvature', 'hand', 'area']) {
    assert.ok(d[key], `missing descriptor ${key}`);
    assert.equal(d[key].length, elev.length, `${key} is the wrong length`);
    for (let i = 0; i < d[key].length; i++) {
      assert.ok(Number.isFinite(d[key][i]), `${key}[${i}] is not finite`);
    }
  }
});

// ---------------------------------------------------------------------------
// Resampling
// ---------------------------------------------------------------------------

test('upsample produces the right dimensions and reproduces a linear ramp exactly (Catmull-Rom is interpolating)', () => {
  const coarse = Field.from(8, 8, (x, y) => x * 10 + y * 3);
  const fine = upsample(coarse, 4);
  assert.equal(fine.width, 32);
  assert.equal(fine.height, 32);
  // On a linear field, interior fine samples must lie on the same plane.
  for (let y = 8; y < 24; y++) {
    for (let x = 8; x < 24; x++) {
      const cx = (x + 0.5) / 4 - 0.5;
      const cy = (y + 0.5) / 4 - 0.5;
      const expected = cx * 10 + cy * 3;
      assert.ok(
        Math.abs(fine.get(x, y) - expected) < 1e-6,
        `fine(${x},${y}) = ${fine.get(x, y)}, expected ${expected}`
      );
    }
  }
});

test('upsample does not overshoot wildly at a step edge', () => {
  const coarse = Field.from(8, 8, (x) => (x < 4 ? 0 : 100));
  const fine = upsample(coarse, 4);
  // Catmull-Rom rings a little at a discontinuity; bound it rather than forbid it.
  assert.ok(fine.min() > -20, `undershoot to ${fine.min()}`);
  assert.ok(fine.max() < 120, `overshoot to ${fine.max()}`);
});

test('blockDownsample computes exact block means', () => {
  const fine = Field.from(4, 4, (x, y) => y * 4 + x); // 0..15
  const coarse = blockDownsample(fine, 2);
  assert.equal(coarse.width, 2);
  // Top-left block holds 0,1,4,5 -> mean 2.5
  assert.ok(Math.abs(coarse.get(0, 0) - 2.5) < 1e-12, `got ${coarse.get(0, 0)}`);
  // Bottom-right block holds 10,11,14,15 -> mean 12.5
  assert.ok(Math.abs(coarse.get(1, 1) - 12.5) < 1e-12, `got ${coarse.get(1, 1)}`);
});

test('blockDownsample(upsample(x)) round-trips a smooth field closely', () => {
  const coarse = Field.from(16, 16, (x, y) => Math.sin(x / 3) * 20 + Math.cos(y / 4) * 15);
  const back = blockDownsample(upsample(coarse, 4), 4);
  for (let i = 0; i < coarse.length; i++) {
    assert.ok(Math.abs(back.data[i] - coarse.data[i]) < 1.0, `cell ${i}: ${back.data[i]} vs ${coarse.data[i]}`);
  }
});

// ---------------------------------------------------------------------------
// Structure preservation — the invariant everything downstream depends on
// ---------------------------------------------------------------------------

test('REGRESSION: restoreCoarseStructure makes the fine grid block-average back to the coarse grid (found 2026-08-23: the original Laplacian-detail-transfer-against-a-box-blur implementation left 5.13 m mean and 41.6 m max error, because a blur at coarse-cell radius does not remove the content the refinement pass moves at scales ABOVE one coarse cell)', () => {
  const rng = makeRng(17);
  const coarse = Field.from(24, 24, (x, y) => x * 12 + y * 4 + gaussian(rng) * 30);
  const factor = 8;

  // Take an upsampled surface and violently disturb it at every scale.
  const fine = upsample(coarse, factor);
  const noiseRng = makeRng(23);
  for (let i = 0; i < fine.length; i++) fine.data[i] += gaussian(noiseRng) * 25;
  for (let k = 0; k < 3; k++) {
    const prev = Float64Array.from(fine.data);
    for (let y = 1; y < fine.height - 1; y++) {
      for (let x = 1; x < fine.width - 1; x++) {
        const i = y * fine.width + x;
        fine.data[i] =
          (prev[i - 1] + prev[i + 1] + prev[i - fine.width] + prev[i + fine.width] + prev[i]) / 5;
      }
    }
  }

  restoreCoarseStructure(fine, coarse, factor, 4);

  const back = blockDownsample(fine, factor);
  let maxErr = 0;
  let sumErr = 0;
  for (let i = 0; i < coarse.length; i++) {
    const e = Math.abs(back.data[i] - coarse.data[i]);
    if (e > maxErr) maxErr = e;
    sumErr += e;
  }
  // Measured 0.43 m mean / 2.11 m max at 4 passes against this disturbance,
  // which is far more violent than anything the real pipeline does (0.15 m mean
  // end to end).
  const meanErr = sumErr / coarse.length;
  assert.ok(meanErr < 0.7, `mean block error ${meanErr.toFixed(3)} m is too high`);
  assert.ok(maxErr < 4, `max block error ${maxErr.toFixed(3)} m is too high`);
});

test('restoreCoarseStructure keeps fine-scale detail rather than flattening everything back', () => {
  const coarse = Field.from(16, 16, (x, y) => x * 8 + y * 2);
  const factor = 8;
  const fine = upsample(coarse, factor);
  const flat = fine.clone();

  const rng = makeRng(5);
  for (let i = 0; i < fine.length; i++) fine.data[i] += gaussian(rng) * 4;
  restoreCoarseStructure(fine, coarse, factor, 2);

  let deviation = 0;
  for (let i = 0; i < fine.length; i++) deviation += Math.abs(fine.data[i] - flat.data[i]);
  deviation /= fine.length;
  assert.ok(deviation > 1.0, `detail was erased: mean deviation from the plain upsample is only ${deviation.toFixed(3)} m`);
});

// ---------------------------------------------------------------------------
// Detail synthesis
// ---------------------------------------------------------------------------

function detailFixture(N, slopeValue, handValue) {
  const descriptors = {
    slope: new Float64Array(N * N).fill(slopeValue),
    aspect: new Float64Array(N * N).fill(0),
    hand: new Float64Array(N * N).fill(handValue),
  };
  return descriptors;
}

test('detail is added on steep ground and NOT on flat ground', () => {
  const factor = 8;
  const N = 8;
  const flatBefore = upsample(new Field(N, N, 0), factor);
  const flatAfter = flatBefore.clone();
  addErosionalDetail(flatAfter, detailFixture(N, 0.0, 50), [N, N], factor, 1950, -1000);

  const steepAfter = flatBefore.clone();
  addErosionalDetail(steepAfter, detailFixture(N, 0.6, 50), [N, N], factor, 1950, -1000);

  let flatEnergy = 0;
  let steepEnergy = 0;
  for (let i = 0; i < flatAfter.length; i++) {
    flatEnergy += Math.abs(flatAfter.data[i]);
    steepEnergy += Math.abs(steepAfter.data[i]);
  }
  assert.ok(flatEnergy < 1e-9, `flat ground picked up ${flatEnergy} m of detail it should not have`);
  assert.ok(steepEnergy > 0, 'steep ground picked up no detail at all');
});

test('detail is suppressed on alluvial ground — low height above drainage means a floodplain, and floodplains are flat', () => {
  const factor = 8;
  const N = 8;
  const base = upsample(new Field(N, N, 0), factor);

  const upland = base.clone();
  addErosionalDetail(upland, detailFixture(N, 0.5, 100), [N, N], factor, 1950, -1000);
  const floodplain = base.clone();
  addErosionalDetail(floodplain, detailFixture(N, 0.5, 0), [N, N], factor, 1950, -1000);

  const energy = (f) => f.data.reduce((a, v) => a + Math.abs(v), 0);
  assert.ok(
    energy(floodplain) < energy(upland) * 0.35,
    `alluvial detail (${energy(floodplain).toFixed(1)}) should be far below upland detail (${energy(upland).toFixed(1)})`
  );
});

test('detail synthesis is deterministic for a given seed', () => {
  const factor = 8;
  const N = 8;
  const a = upsample(new Field(N, N, 0), factor);
  const b = a.clone();
  addErosionalDetail(a, detailFixture(N, 0.5, 50), [N, N], factor, 1950, -1000);
  addErosionalDetail(b, detailFixture(N, 0.5, 50), [N, N], factor, 1950, -1000);
  assert.deepEqual(Array.from(a.data), Array.from(b.data));
});

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

test('toDecimetres round-trips to within 5 cm and is a quarter the size of Float64', () => {
  const rng = makeRng(31);
  const f = Field.from(40, 40, () => (rng() - 0.35) * 1800);
  const packed = toDecimetres(f);
  assert.equal(packed.byteLength, f.data.byteLength / 4);
  const back = fromDecimetres(packed, f.width, f.height);
  for (let i = 0; i < f.length; i++) {
    assert.ok(Math.abs(back.data[i] - f.data[i]) <= 0.05, `cell ${i}: ${back.data[i]} vs ${f.data[i]}`);
  }
});

test('toDecimetres clamps rather than wrapping at the Int16 boundary', () => {
  const f = Field.from(2, 2, () => 9999); // 99,990 dm, far past Int16
  const packed = toDecimetres(f);
  for (const v of packed) assert.equal(v, 32767, 'out-of-range elevation must clamp, not wrap to a negative');
});

// ---------------------------------------------------------------------------
// End to end
// ---------------------------------------------------------------------------

/**
 * Small but STEEP. An earlier version used 267 m cells so the map still spanned
 * 12.8 km, and at that cell size the coarse mean slope was 0.036 - below the
 * amplifier's own slope onset, so almost no cell qualified for detail and the
 * whole stage measured as doing nothing. 60 m cells over 2.9 km is a real
 * hillslope landscape, which is what these tests are about.
 */
const COARSE = { width: 48, height: 48, metresPerCell: 60, iterations: 60, alluvialIterations: 60 };

test('amplifyTerrain produces the right resolution and leaves sea level alone', () => {
  const coarse = generateTerrain(1950, COARSE);
  const fine = amplifyTerrain(coarse, 1950, { factor: 8 });
  assert.equal(fine.meta.width, 48 * 8);
  assert.ok(Math.abs(fine.meta.metresPerCell - 60 / 8) < 1e-9);
  assert.equal(
    fine.seaLevel,
    coarse.seaLevel,
    'sea level is a property of the world; re-deriving it at fine resolution would move the whole coastline'
  );
});

test('amplifyTerrain preserves the coarse structure end to end', () => {
  const coarse = generateTerrain(1950, COARSE);
  const factor = 8;
  const fine = amplifyTerrain(coarse, 1950, { factor, refineIterations: 4 });
  const back = blockDownsample(fine.elevation, factor);
  let maxErr = 0;
  for (let i = 0; i < coarse.elevation.length; i++) {
    maxErr = Math.max(maxErr, Math.abs(back.data[i] - coarse.elevation.data[i]));
  }
  assert.ok(maxErr < 8, `amplification moved the coarse surface by up to ${maxErr.toFixed(2)} m`);
});

test('amplifyTerrain adds real fine-scale relief that a plain upsample does not have', () => {
  const coarse = generateTerrain(1950, COARSE);
  const factor = 8;
  const plain = upsample(coarse.elevation, factor);
  const fine = amplifyTerrain(coarse, 1950, { factor, refineIterations: 4 });

  const roughness = (f) => {
    const { width: W, height: H } = f;
    let sum = 0;
    let n = 0;
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        sum += Math.abs(f.data[i] - (f.data[i - 1] + f.data[i + 1] + f.data[i - W] + f.data[i + W]) / 4);
        n++;
      }
    }
    return sum / n;
  };
  // Measured 2.24x at these settings. The bar sits below that but well above the
  // 1.43x that upsample-plus-restore alone produces at zero detail amplitude, so
  // this fails if detail synthesis ever stops contributing.
  assert.ok(
    roughness(fine.elevation) > roughness(plain) * 1.8,
    `amplified roughness ${roughness(fine.elevation).toFixed(4)} should clearly exceed the plain upsample's ${roughness(plain).toFixed(4)}`
  );
});

test('amplifyTerrain is deterministic', () => {
  const coarse = generateTerrain(1950, COARSE);
  const a = amplifyTerrain(coarse, 1950, { factor: 8 });
  const b = amplifyTerrain(generateTerrain(1950, COARSE), 1950, { factor: 8 });
  assert.deepEqual(Array.from(a.elevation.data), Array.from(b.elevation.data));
});

test('amplifyTerrain leaves every elevation finite and the water mask consistent', () => {
  const coarse = generateTerrain(1950, COARSE);
  const fine = amplifyTerrain(coarse, 1950, { factor: 8 });
  for (let i = 0; i < fine.elevation.length; i++) {
    assert.ok(Number.isFinite(fine.elevation.data[i]), `cell ${i} is not finite`);
    const submerged = fine.elevation.data[i] < fine.seaLevel;
    if (fine.water[i] !== 0) assert.ok(submerged, `cell ${i} is marked water but sits above sea level`);
  }
});

test('DEFAULT_AMPLIFY documents a factor large enough for detail to survive the restore step', () => {
  // The usable detail band runs from the fine Nyquist limit (2 cells) to about
  // half a coarse block. At factor 4 that band is empty, which is why
  // amplification at factor 4 measurably did nothing (2026-08-23).
  assert.ok(
    DEFAULT_AMPLIFY.detailCyclesPerCoarseCell >= 2,
    'detail must sit well inside a coarse block or the restore step deletes it'
  );
});

const ROUGHNESS = (f) => {
  const { width: W, height: H } = f;
  let sum = 0;
  let n = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      sum += Math.abs(f.data[i] - (f.data[i - 1] + f.data[i + 1] + f.data[i - W] + f.data[i + W]) / 4);
      n++;
    }
  }
  return sum / n;
};

test('REGRESSION: the fine erosion refinement pass does not improve detail and is off by default (found 2026-08-23: measured roughness gain was 2.24x with refinement off, 1.86x at the intended settings, and 1.51x with the timestep cranked 50x - it runs with no uplift and a fixed base level, so it has no driving force, can only relax the surface toward grade, and smooths away the detail the synthesis step just added)', () => {
  assert.equal(DEFAULT_AMPLIFY.refineIterations, 0, 'refinement stays off until it has something to cut toward');

  const coarse = generateTerrain(1950, COARSE);
  const off = ROUGHNESS(amplifyTerrain(coarse, 1950, { factor: 8, refineIterations: 0 }).elevation);
  const on = ROUGHNESS(amplifyTerrain(coarse, 1950, { factor: 8, refineIterations: 25, refineDt: 400 }).elevation);
  assert.ok(
    off > on,
    `refinement should still measure as counterproductive (off ${off.toFixed(4)}, on ${on.toFixed(4)}). If this ever flips, it has been given a driving force and the default should be revisited.`
  );
});

test('detail amplitude scales the result monotonically, so it works as an art-direction dial', () => {
  const coarse = generateTerrain(1950, COARSE);
  const values = [0, 4.5, 9, 18].map((a) =>
    ROUGHNESS(amplifyTerrain(coarse, 1950, { factor: 8, detailAmplitude: a }).elevation)
  );
  for (let i = 1; i < values.length; i++) {
    assert.ok(values[i] > values[i - 1], `roughness must rise with amplitude: ${values.join(' -> ')}`);
  }
});
