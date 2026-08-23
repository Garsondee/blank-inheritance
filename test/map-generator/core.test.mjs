/**
 * Tests for the map generator's core primitives: seeded RNG and hierarchical
 * sub-seeding, the priority-flood heap, and the exact Euclidean distance
 * transform.
 *
 * These are the pieces everything else is built on, and two of them carry
 * load-bearing GUARANTEES rather than just behaviour: subSeed is what makes
 * "regenerate one block of the city identically" possible at all, and the EDT's
 * exactness is what keeps directional bias out of every field derived from
 * distance-to-water.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeRng, subSeed, gaussian, uniform } from '../../tools/map-generator/core/rng.mjs';
import { MinHeap } from '../../tools/map-generator/core/heap.mjs';
import { euclideanDistanceTransform } from '../../tools/map-generator/core/distance.mjs';
import { Field } from '../../tools/map-generator/core/field.mjs';

// ---------------------------------------------------------------------------
// RNG and hierarchical seeding
// ---------------------------------------------------------------------------

test('makeRng is deterministic: the same seed replays the identical sequence', () => {
  const a = makeRng(1950);
  const b = makeRng(1950);
  const seqA = Array.from({ length: 200 }, () => a());
  const seqB = Array.from({ length: 200 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test('makeRng: different seeds diverge, and output stays inside [0, 1)', () => {
  const a = makeRng(1);
  const b = makeRng(2);
  let differences = 0;
  for (let i = 0; i < 500; i++) {
    const va = a();
    const vb = b();
    assert.ok(va >= 0 && va < 1, `out of range: ${va}`);
    if (va !== vb) differences++;
  }
  assert.ok(differences > 490, `expected two seeds to diverge, only ${differences}/500 draws differed`);
});

test('subSeed is stable: the same path always yields the same child seed', () => {
  assert.equal(subSeed(1950, 'city', 'block', 42), subSeed(1950, 'city', 'block', 42));
});

test('subSeed is ORDER-INDEPENDENT of unrelated work: generating a sibling first cannot change a child seed (this is what lets one city block regenerate identically without a global counter)', () => {
  const before = subSeed(1950, 'city', 'block', 42);
  // Simulate a whole lot of unrelated generation happening in between.
  for (let i = 0; i < 1000; i++) subSeed(1950, 'city', 'block', i);
  subSeed(1950, 'terrain', 'rivers');
  const after = subSeed(1950, 'city', 'block', 42);
  assert.equal(after, before);
});

test('subSeed: different paths, different parents, and different path SPLITS all separate', () => {
  assert.notEqual(subSeed(1950, 'a'), subSeed(1950, 'b'));
  assert.notEqual(subSeed(1950, 'a'), subSeed(1951, 'a'));
  // The separator byte exists to make these two differ; without it both hash
  // the same character stream.
  assert.notEqual(subSeed(1950, 'ab', 'c'), subSeed(1950, 'a', 'bc'));
});

test('subSeed returns a usable uint32 seed for makeRng', () => {
  const s = subSeed(1950, 'terrain', 'initial');
  assert.ok(Number.isInteger(s) && s >= 0 && s <= 0xffffffff, `not a uint32: ${s}`);
  const rng = makeRng(s);
  assert.ok(rng() >= 0 && rng() < 1);
});

test('gaussian: mean near 0, standard deviation near 1, and always finite', () => {
  const rng = makeRng(7);
  let sum = 0;
  let sumSq = 0;
  const n = 20000;
  for (let i = 0; i < n; i++) {
    const g = gaussian(rng);
    assert.ok(Number.isFinite(g), 'gaussian produced a non-finite value (log(0) guard failed)');
    sum += g;
    sumSq += g * g;
  }
  const mean = sum / n;
  const sd = Math.sqrt(sumSq / n - mean * mean);
  assert.ok(Math.abs(mean) < 0.05, `mean ${mean} not near 0`);
  assert.ok(Math.abs(sd - 1) < 0.05, `sd ${sd} not near 1`);
});

test('uniform respects its bounds', () => {
  const rng = makeRng(11);
  for (let i = 0; i < 500; i++) {
    const v = uniform(rng, -3, 7);
    assert.ok(v >= -3 && v < 7, `out of range: ${v}`);
  }
});

// ---------------------------------------------------------------------------
// MinHeap
// ---------------------------------------------------------------------------

test('MinHeap pops in ascending key order', () => {
  const rng = makeRng(3);
  const n = 2000;
  const heap = new MinHeap(n);
  const keys = [];
  for (let i = 0; i < n; i++) {
    const k = rng() * 1000;
    keys.push(k);
    heap.push(k, i);
  }
  keys.sort((a, b) => a - b);
  for (let i = 0; i < n; i++) {
    const key = heap.peekKey();
    assert.ok(Math.abs(key - keys[i]) < 1e-9, `pop ${i}: expected key ${keys[i]}, got ${key}`);
    heap.pop();
  }
  assert.equal(heap.size, 0);
  assert.equal(heap.pop(), -1, 'popping an empty heap should return -1');
});

test('MinHeap keeps keys and values paired through sifting', () => {
  const heap = new MinHeap(8);
  const pairs = [[5, 50], [1, 10], [9, 90], [3, 30], [7, 70]];
  for (const [k, v] of pairs) heap.push(k, v);
  const out = [];
  while (heap.size) out.push(heap.pop());
  assert.deepEqual(out, [10, 30, 50, 70, 90]);
});

// ---------------------------------------------------------------------------
// Euclidean distance transform
// ---------------------------------------------------------------------------

function bruteForceDistance(seeds, width, height) {
  const out = new Float64Array(width * height);
  const pts = [];
  for (let i = 0; i < seeds.length; i++) if (seeds[i]) pts.push([i % width, (i / width) | 0]);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let best = Infinity;
      for (const [sx, sy] of pts) {
        const d = (x - sx) ** 2 + (y - sy) ** 2;
        if (d < best) best = d;
      }
      out[y * width + x] = Math.sqrt(best);
    }
  }
  return out;
}

test('EDT is EXACT: it matches brute-force Euclidean distance on random seed sets (a chamfer transform does not — it is biased along its 8 propagation directions)', () => {
  const rng = makeRng(23);
  const W = 37;
  const H = 29;
  for (let trial = 0; trial < 6; trial++) {
    const seeds = new Uint8Array(W * H);
    let count = 0;
    while (count < 4 + trial * 3) {
      const i = Math.floor(rng() * seeds.length);
      if (!seeds[i]) {
        seeds[i] = 1;
        count++;
      }
    }
    const got = euclideanDistanceTransform(seeds, W, H);
    const want = bruteForceDistance(seeds, W, H);
    for (let i = 0; i < got.length; i++) {
      assert.ok(
        Math.abs(got[i] - want[i]) < 1e-9,
        `trial ${trial} cell ${i}: EDT gave ${got[i]}, brute force ${want[i]}`
      );
    }
  }
});

test('REGRESSION: EDT level sets are isotropic, not octagonal (found 2026-08-23: the original 3-4 chamfer transform left directional ridges in coastDistance, which the shelf-break bathymetry then contoured into straight-edged polygonal terraces in deep water)', () => {
  // One seed at the centre: every level set must be a true circle.
  const W = 81;
  const H = 81;
  const seeds = new Uint8Array(W * H);
  seeds[40 * W + 40] = 1;
  const dist = euclideanDistanceTransform(seeds, W, H);

  // Sample the distance at radius 30 in many directions; an isotropic field
  // reports 30 in every one of them.
  for (let a = 0; a < 64; a++) {
    const th = (a / 64) * Math.PI * 2;
    const x = Math.round(40 + 30 * Math.cos(th));
    const y = Math.round(40 + 30 * Math.sin(th));
    const d = dist[y * W + x];
    const trueDist = Math.hypot(x - 40, y - 40);
    assert.ok(
      Math.abs(d - trueDist) < 1e-9,
      `direction ${a}: distance ${d} but true distance ${trueDist} — the field is anisotropic`
    );
  }
});

test('EDT: seed cells are zero and distance grows monotonically away from a single seed', () => {
  const W = 20;
  const H = 20;
  const seeds = new Uint8Array(W * H);
  seeds[0] = 1;
  const dist = euclideanDistanceTransform(seeds, W, H);
  assert.equal(dist[0], 0);
  for (let x = 1; x < W; x++) {
    assert.ok(dist[x] > dist[x - 1], `distance should increase along the row at x=${x}`);
  }
});

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

test('Field: index round-trips and quantile is correct on a known distribution', () => {
  const f = Field.from(10, 10, (x, y) => y * 10 + x); // values 0..99
  assert.equal(f.get(3, 4), 43);
  assert.equal(f.xOf(f.idx(3, 4)), 3);
  assert.equal(f.yOf(f.idx(3, 4)), 4);
  assert.equal(f.min(), 0);
  assert.equal(f.max(), 99);
  // 100 values 0..99: the median sits between 49 and 50.
  assert.ok(Math.abs(f.quantile(0.5) - 49.5) < 1e-9, `median was ${f.quantile(0.5)}`);
  assert.equal(f.quantile(0), 0);
  assert.equal(f.quantile(1), 99);
});

test('Field.sample: bilinear interpolation is exact at cell centres and midpoints, and clamps outside', () => {
  const f = Field.from(4, 4, (x) => x * 10);
  assert.equal(f.sample(1, 1), 10);
  assert.ok(Math.abs(f.sample(1.5, 1) - 15) < 1e-9);
  assert.equal(f.sample(-5, -5), 0, 'should clamp to the corner value');
  assert.equal(f.sample(99, 99), 30, 'should clamp to the corner value');
});

test('Field.clone is a deep copy', () => {
  const a = Field.from(5, 5, () => 1);
  const b = a.clone();
  b.set(2, 2, 99);
  assert.equal(a.get(2, 2), 1, 'mutating the clone must not touch the original');
});
