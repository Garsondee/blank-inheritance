/**
 * Tests for the landscape-evolution physics, the marine transgression, and
 * contour extraction.
 *
 * The erosion tests are mostly about STABILITY and directionality rather than
 * exact elevations: the implicit stream-power solver's entire justification
 * over an explicit one is that it cannot blow up at a large timestep, so that
 * claim is tested directly with an absurd timestep. If it ever stops being
 * true, a run would not fail loudly — it would quietly produce garbage terrain.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Field } from '../../tools/map-generator/core/field.mjs';
import { makeRng, gaussian } from '../../tools/map-generator/core/rng.mjs';
import { erode, slopeField } from '../../tools/map-generator/terrain/erode.mjs';
import { routeFlow } from '../../tools/map-generator/terrain/flow.mjs';
import {
  chooseSeaLevel,
  floodWorld,
  coastDistance,
  depthBandOf,
  landFraction,
  LAND,
  OCEAN,
  LAKE,
  DEPTH_BANDS,
} from '../../tools/map-generator/terrain/sealevel.mjs';
import { marchingSquares, simplify, polylineLength, ringArea } from '../../tools/map-generator/terrain/contour.mjs';
import { makeUpliftField, makeInitialSurface, makePrecipitationField } from '../../tools/map-generator/terrain/uplift.mjs';

const W = 48;
const H = 48;

function surface(seed = 5) {
  const rng = makeRng(seed);
  return Field.from(W, H, (x) => x * 3 + gaussian(rng) * 4);
}

function allFinite(field) {
  for (let i = 0; i < field.length; i++) if (!Number.isFinite(field.data[i])) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Erosion
// ---------------------------------------------------------------------------

test('the implicit stream-power solver is UNCONDITIONALLY STABLE: an absurd timestep produces finite, bounded terrain rather than blowing up (this is the whole reason for using Braun & Willett 2013 over an explicit scheme)', () => {
  for (const dt of [1e3, 1e5, 1e7, 1e9]) {
    const elev = surface();
    const uplift = Field.from(W, H, () => 1e-4);
    erode(elev, uplift, { iterations: 20, dt, K: 5e-6, m: 0.5, D: 0.004, G: 1, dx: 50 });
    assert.ok(allFinite(elev), `dt=${dt} produced non-finite elevations`);
    assert.ok(elev.max() < 1e9, `dt=${dt} produced runaway elevation ${elev.max()}`);
  }
});

test('erosion never inverts flow: after a run, every cell still sits at or above its receiver', () => {
  const elev = surface();
  const uplift = Field.from(W, H, () => 2e-4);
  erode(elev, uplift, { iterations: 60, dt: 10000, K: 8e-6, m: 0.5, D: 0.004, G: 40, dx: 50, depositionSlopeScale: 0.02 });
  const { receivers, filled } = routeFlow(elev);
  for (let i = 0; i < filled.length; i++) {
    const r = receivers[i];
    if (r === i) continue;
    assert.ok(filled.data[i] >= filled.data[r], `cell ${i} ended up below its receiver — deposition inverted the flow`);
  }
});

test('uplift raises the landscape and erosion cuts it back: more erodibility means lower relief', () => {
  const relief = [];
  for (const K of [1e-6, 8e-6, 4e-5]) {
    const elev = surface();
    const uplift = Field.from(W, H, () => 3e-4);
    erode(elev, uplift, { iterations: 80, dt: 10000, K, m: 0.5, D: 0.004, G: 1, dx: 50 });
    relief.push(elev.max());
  }
  assert.ok(relief[0] > relief[1], `K=1e-6 relief ${relief[0]} should exceed K=8e-6 relief ${relief[1]}`);
  assert.ok(relief[1] > relief[2], `K=8e-6 relief ${relief[1]} should exceed K=4e-5 relief ${relief[2]}`);
});

test('the outlet column is pinned at base level throughout', () => {
  const elev = surface();
  const uplift = Field.from(W, H, () => 1e-3);
  erode(elev, uplift, { iterations: 40, dt: 10000, K: 8e-6, m: 0.5, D: 0.004, G: 1, dx: 50, baseLevel: 0 });
  for (let y = 0; y < H; y++) {
    assert.equal(elev.get(0, y), 0, `outlet cell (0,${y}) drifted off base level`);
  }
});

test('REGRESSION: a custom outlet set pins those cells at their OWN elevation, not at zero (found 2026-08-23 while building phase 2 — the alluviation pass grades to a shoreline that sits well above the map-edge base level, and flattening it to zero would drain the sea out through the seabed)', () => {
  const elev = Field.from(W, H, (x) => x * 3 + 100);
  const outlets = new Uint8Array(W * H);
  const pinnedValues = [];
  for (let y = 0; y < H; y++) {
    outlets[y * W + 5] = 1;
    pinnedValues.push(elev.get(5, y));
  }
  const uplift = Field.from(W, H, () => 1e-3);
  erode(elev, uplift, { iterations: 30, dt: 10000, K: 8e-6, m: 0.5, D: 0.004, G: 1, dx: 50, outlets });
  for (let y = 0; y < H; y++) {
    assert.equal(elev.get(5, y), pinnedValues[y], `outlet cell (5,${y}) was not held at its own elevation`);
  }
});

test('REGRESSION: transport-limited deposition targets flat ground instead of blanketing hillsides (found 2026-08-23: with the bare Davy & Lague term, raising G to build a floodplain deposited at nearly the same rate everywhere and dissolved the terrain — deposition on steep cells must be far smaller than on flat ones)', () => {
  // A surface with a steep upper half and a near-flat lower half.
  const elev = Field.from(W, H, (x) => (x > W / 2 ? 200 + (x - W / 2) * 20 : x * 0.4));
  const before = Float64Array.from(elev.data);
  const uplift = new Field(W, H);
  erode(elev, uplift, {
    iterations: 30,
    dt: 5000,
    K: 8e-6,
    m: 0.5,
    D: 0.0001,
    G: 40,
    dx: 50,
    depositionSlopeScale: 0.02,
  });

  let flatGain = 0;
  let flatCells = 0;
  let steepGain = 0;
  let steepCells = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const delta = elev.data[i] - before[i];
      if (x > W / 2 + 2) {
        steepGain += Math.max(0, delta);
        steepCells++;
      } else if (x > 2 && x < W / 2 - 2) {
        flatGain += Math.max(0, delta);
        flatCells++;
      }
    }
  }
  const flatMean = flatGain / flatCells;
  const steepMean = steepGain / steepCells;
  assert.ok(
    flatMean > steepMean * 3,
    `deposition should strongly prefer flat ground: flat mean +${flatMean.toFixed(3)}m vs steep mean +${steepMean.toFixed(3)}m`
  );
});

test('an erodibility multiplier of zero freezes incision on those cells', () => {
  const elev = surface();
  const before = Float64Array.from(elev.data);
  const uplift = new Field(W, H);
  const erodibility = new Float64Array(W * H); // all zero: nothing may incise
  erode(elev, uplift, { iterations: 20, dt: 10000, K: 8e-6, m: 0.5, D: 0, G: 0, dx: 50, erodibility });
  for (let y = 0; y < H; y++) {
    for (let x = 1; x < W; x++) {
      const i = y * W + x;
      assert.ok(Math.abs(elev.data[i] - before[i]) < 1e-9, `cell ${i} eroded despite zero erodibility`);
    }
  }
});

test('slopeField reports the true gradient of a constant ramp', () => {
  const elev = Field.from(W, H, (x) => x * 10); // 10 m rise per cell
  const slope = slopeField(elev);
  // Interior cells: steepest descent is the orthogonal step, 10 over 1.
  assert.ok(Math.abs(slope[10 * W + 10] - 10) < 1e-9, `expected slope 10, got ${slope[10 * W + 10]}`);
});

// ---------------------------------------------------------------------------
// Sea level and flooding
// ---------------------------------------------------------------------------

test('chooseSeaLevel drowns approximately the requested fraction of the map', () => {
  const rng = makeRng(4);
  const elev = Field.from(W, H, () => rng() * 1000);
  for (const target of [0.25, 0.42, 0.6]) {
    const sea = chooseSeaLevel(elev, { waterFraction: target });
    let below = 0;
    for (let i = 0; i < elev.length; i++) if (elev.data[i] < sea) below++;
    const got = below / elev.length;
    assert.ok(Math.abs(got - target) < 0.02, `asked for ${target} water, got ${got.toFixed(3)}`);
  }
});

test('floodWorld distinguishes OCEAN from an inland LAKE by connectivity, not by elevation alone', () => {
  // High plateau with a deep hole in the middle, and low ground at the seaward
  // edge. Both the hole and the edge are below sea level; only one is the sea.
  const elev = Field.from(W, H, (x, y) => {
    if (x < 6) return -50; // seaward lowland
    if (Math.hypot(x - 30, y - 24) < 5) return -80; // enclosed basin
    return 100;
  });
  const water = floodWorld(elev, 0);

  assert.equal(water[24 * W + 2], OCEAN, 'the seaward lowland should be ocean');
  assert.equal(water[24 * W + 30], LAKE, 'the enclosed basin must be a lake, not ocean');
  assert.equal(water[24 * W + 20], LAND, 'the plateau should be land');
});

test('landFraction agrees with the sea level that produced it', () => {
  const rng = makeRng(6);
  const elev = Field.from(W, H, () => rng() * 100);
  const sea = chooseSeaLevel(elev, { waterFraction: 0.4 });
  const water = floodWorld(elev, sea);
  assert.ok(Math.abs(landFraction(water) - 0.6) < 0.03, `land fraction was ${landFraction(water)}`);
});

test('coastDistance is signed correctly and zero on the waterline', () => {
  const elev = Field.from(W, H, (x) => x - 20); // sea to the left of x=20
  const water = floodWorld(elev, 0);
  const dist = coastDistance(water, W, H);
  assert.ok(dist[24 * W + 5] < 0, 'a cell at sea should have negative coast distance');
  assert.ok(dist[24 * W + 40] > 0, 'a cell inland should have positive coast distance');
  assert.ok(Math.abs(dist[24 * W + 20]) < 1.5, 'a cell on the waterline should be near zero');
});

test('depth bands are ordered, exhaustive, and map depths to the right band', () => {
  assert.equal(depthBandOf(0.2), 'foreshore');
  assert.equal(depthBandOf(1.0), 'wadeable');
  assert.equal(depthBandOf(3), 'swimmable');
  assert.equal(depthBandOf(10), 'boat');
  assert.equal(depthBandOf(50), 'deep');
  assert.equal(depthBandOf(5000), 'abyssal');
  for (let i = 1; i < DEPTH_BANDS.length; i++) {
    assert.ok(DEPTH_BANDS[i].maxDepth > DEPTH_BANDS[i - 1].maxDepth, 'depth bands must be strictly increasing');
  }
});

// ---------------------------------------------------------------------------
// Contours
// ---------------------------------------------------------------------------

test('marchingSquares on a cone produces a closed ring of the correct radius', () => {
  const N = 101;
  const cone = Field.from(N, N, (x, y) => 50 - Math.hypot(x - 50, y - 50));
  const lines = marchingSquares(cone, 30); // radius 20 contour
  assert.equal(lines.length, 1, `expected one ring, got ${lines.length}`);
  const ring = lines[0];
  for (const [x, y] of ring) {
    const r = Math.hypot(x - 50, y - 50);
    assert.ok(Math.abs(r - 20) < 0.6, `contour point at radius ${r.toFixed(2)}, expected 20`);
  }
  // A closed ring returns to its start.
  const first = ring[0];
  const last = ring[ring.length - 1];
  assert.ok(Math.hypot(first[0] - last[0], first[1] - last[1]) < 1e-6, 'the ring should be closed');
});

test('marchingSquares returns nothing when the level is outside the field range', () => {
  const cone = Field.from(40, 40, () => 5);
  assert.equal(marchingSquares(cone, 100).length, 0);
  assert.equal(marchingSquares(cone, -100).length, 0);
});

test('contour length scales as expected: a larger circle has a proportionally longer contour', () => {
  const N = 101;
  const cone = Field.from(N, N, (x, y) => 50 - Math.hypot(x - 50, y - 50));
  const inner = polylineLength(marchingSquares(cone, 40)[0]); // radius 10
  const outer = polylineLength(marchingSquares(cone, 20)[0]); // radius 30
  assert.ok(Math.abs(inner - 2 * Math.PI * 10) < 2, `inner ring length ${inner}`);
  assert.ok(Math.abs(outer - 2 * Math.PI * 30) < 4, `outer ring length ${outer}`);
});

test('simplify keeps the endpoints and reduces a nearly-straight line to two points', () => {
  const line = Array.from({ length: 50 }, (_, i) => [i, 0.01 * Math.sin(i)]);
  const out = simplify(line, 0.5);
  assert.deepEqual(out[0], line[0]);
  assert.deepEqual(out[out.length - 1], line[line.length - 1]);
  assert.equal(out.length, 2, `expected a near-straight line to collapse to 2 points, got ${out.length}`);
});

test('simplify preserves genuine corners', () => {
  const line = [[0, 0], [10, 0], [10, 10], [20, 10]];
  assert.equal(simplify(line, 0.1).length, 4, 'real corners must survive simplification');
});

test('ringArea is signed and matches the true area of a square', () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
  assert.ok(Math.abs(Math.abs(ringArea(square)) - 100) < 1e-9, `area was ${ringArea(square)}`);
  const reversed = [...square].reverse();
  assert.ok(ringArea(square) * ringArea(reversed) < 0, 'reversing a ring should flip the sign');
});

// ---------------------------------------------------------------------------
// Uplift / climate setup
// ---------------------------------------------------------------------------

test('the uplift field rises from the coast inland and stays within its stated bounds', () => {
  const u = makeUpliftField(64, 64, 1950, { baseRate: 1e-3, coastRate: 1e-5, massifCount: 0 });
  let coastMean = 0;
  let inlandMean = 0;
  for (let y = 0; y < 64; y++) {
    coastMean += u.get(1, y);
    inlandMean += u.get(62, y);
  }
  assert.ok(inlandMean > coastMean * 5, `inland uplift ${inlandMean / 64} should far exceed coastal ${coastMean / 64}`);
  assert.ok(u.min() >= 0, 'uplift must never be negative');
});

test('massifs add uplift above the base rate, and asking for none adds none', () => {
  const plain = makeUpliftField(64, 64, 1950, { baseRate: 1e-3, coastRate: 1e-5, massifCount: 0 });
  const withMassifs = makeUpliftField(64, 64, 1950, { baseRate: 1e-3, coastRate: 1e-5, massifCount: 3, massifStrength: 0.8 });
  assert.ok(withMassifs.max() > plain.max(), 'massifs should raise the peak uplift rate');
  assert.ok(plain.max() <= 1e-3 + 1e-12, `without massifs, uplift should not exceed the base rate; got ${plain.max()}`);
});

test('precipitation is wetter on the seaward side and never zero', () => {
  const p = makePrecipitationField(64, 64, 1950);
  let windward = 0;
  let lee = 0;
  for (let y = 0; y < 64; y++) {
    windward += p.get(2, y);
    lee += p.get(61, y);
  }
  assert.ok(windward > lee, `windward rainfall ${windward / 64} should exceed lee ${lee / 64}`);
  assert.ok(p.min() > 0, 'precipitation must stay positive or drainage area collapses');
});

test('makeInitialSurface is deterministic and low-relief (the landscape is meant to be BUILT by uplift, not sculpted here)', () => {
  const a = makeInitialSurface(64, 64, 1950);
  const b = makeInitialSurface(64, 64, 1950);
  assert.deepEqual(Array.from(a.data), Array.from(b.data));
  assert.ok(a.max() - a.min() < 200, `initial relief ${a.max() - a.min()} is too dramatic to be reorganised by erosion`);
});
