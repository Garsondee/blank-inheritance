// Tier 1 — footprint shape and scale, browser side.
//
// The claim: tools/gazetteer/core/shape.mjs agrees with core/shape.py on every
// case in the shared fixture, down to the advice sentences. Both suites read
// the same file, so neither half can be quietly "fixed" into agreement with
// itself.
//
// Why the sentences are in the contract and not just the numbers: this is what
// the inspector prints next to a shape while somebody decides how much to
// write about it. If the browser says "there is no room in there" and the
// server-side check says the same building will carry a scene, the tool is
// arguing with itself in front of the person using it.
//
// Python half: test/gazetteer/test_shape.py, which also carries the measured
// spread the thresholds were calibrated against.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  metrics, capacity, check, minAreaRect, convexHull, classify,
  SHAPES, STRIP_ELONGATION, SLIVER_WIDTH_M, LEVEL_HEIGHT_M,
  CIRCLE_COMPACTNESS,
} from "../tools/gazetteer/core/shape.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(
  readFileSync(join(here, "fixtures", "gazetteer-shape-cases.json"), "utf8"));

/** The fixture is written by Python, so its option keys are snake_case. */
function toOpts(opts) {
  const out = {};
  if ("metres_per_px" in opts) out.metresPerPx = opts.metres_per_px;
  if ("height_m" in opts) out.heightM = opts.height_m;
  if ("levels" in opts) out.levels = opts.levels;
  if ("height_source" in opts) out.heightSource = opts.height_source;
  return out;
}

const rotate = (ring, deg) => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return ring.map(([x, y]) => [x * c - y * s, x * s + y * c]);
};

test("the fixture is not empty", () => {
  assert.ok(FIXTURE.cases.length >= 8, "too few shared cases to be a contract");
});

test("every shared case reproduces, metric for metric", () => {
  for (const c of FIXTURE.cases) {
    assert.deepEqual(metrics(c.ring, toOpts(c.opts)), c.metrics, c.name);
  }
});

test("every shared case reproduces its capacity verdict and its wording", () => {
  for (const c of FIXTURE.cases) {
    const got = capacity(metrics(c.ring, toOpts(c.opts)));
    assert.deepEqual(got, c.capacity, c.name);
  }
});

test("a square is 1:1, fills its rectangle, and has compactness pi/4", () => {
  const m = metrics([[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.equal(m.areaM2, 100);
  assert.equal(m.perimeterM, 40);
  assert.equal(m.elongation, 1);
  assert.equal(m.rectangularity, 1);
  assert.ok(Math.abs(m.compactness - Math.PI / 4) < 1e-3);
});

test("a rotated terrace is measured as a terrace, not as its bounding box", () => {
  // The case the whole minimum-area rectangle exists for: this ring's
  // axis-aligned box is 49.8 x 43.2, near enough square to read as a block.
  const ring = rotate([[0, 0], [60, 0], [60, 6], [0, 6]], 40);
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const aabbRatio = (Math.max(...xs) - Math.min(...xs))
    / (Math.max(...ys) - Math.min(...ys));
  assert.ok(aabbRatio < 1.3, "the trap this test guards is gone");

  const [length, width, angle] = minAreaRect(ring);
  assert.ok(Math.abs(length - 60) < 1e-6);
  assert.ok(Math.abs(width - 6) < 1e-6);
  assert.ok(Math.abs((angle * 180) / Math.PI - 40) < 1e-4);
});

test("the minimum-area rectangle is rotation invariant", () => {
  const ring = [[0, 0], [40, 0], [40, 12], [0, 12]];
  const [baseLength, baseWidth] = minAreaRect(ring);
  for (const deg of [7, 31, 90, 137, 180, 271]) {
    const [length, width] = minAreaRect(rotate(ring, deg));
    assert.ok(Math.abs(length - baseLength) < 1e-6, `deg=${deg}`);
    assert.ok(Math.abs(width - baseWidth) < 1e-6, `deg=${deg}`);
  }
});

test("the minimum-area rectangle is never worse than the bounding box", () => {
  const ring = [[0, 0], [30, 4], [26, 19], [11, 22], [2, 14]];
  for (let deg = 0; deg < 180; deg += 13) {
    const rotated = rotate(ring, deg);
    const xs = rotated.map((p) => p[0]);
    const ys = rotated.map((p) => p[1]);
    const aabb = (Math.max(...xs) - Math.min(...xs))
      * (Math.max(...ys) - Math.min(...ys));
    const [length, width] = minAreaRect(rotated);
    assert.ok(length * width <= aabb + 1e-6, `deg=${deg}`);
  }
});

test("collinear points give a hull rather than throwing", () => {
  const hull = convexHull([[0, 0], [5, 0], [10, 0]]);
  assert.equal(hull.length, 3);
  const [length, width] = minAreaRect([[0, 0], [5, 0], [10, 0]]);
  assert.equal(width, 0);
  assert.ok(Math.abs(length - 10) < 1e-9);
});

test("winding direction changes nothing", () => {
  const cw = metrics([[0, 0], [0, 10], [10, 10], [10, 0]]);
  const ccw = metrics([[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.deepEqual(cw, ccw);
});

test("a repeated closing point is dropped from the vertex count", () => {
  assert.equal(metrics([[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]).vertexCount, 4);
});

test("metres per pixel scales lengths once, areas twice, ratios not at all", () => {
  const ring = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const one = metrics(ring);
  const two = metrics(ring, { metresPerPx: 2 });
  assert.equal(two.areaM2, one.areaM2 * 4);
  assert.equal(two.lengthM, one.lengthM * 2);
  for (const key of ["elongation", "rectangularity", "compactness"]) {
    assert.equal(one[key], two[key], key);
  }
});

test("fewer than three distinct points throws instead of returning zeroes", () => {
  assert.throws(() => metrics([[0, 0], [1, 1]]));
  assert.throws(() => metrics([[0, 0], [0, 0], [0, 0]]));
});

test("narrow and long is a sliver; narrow and short is not", () => {
  assert.equal(metrics([[0, 0], [100, 0], [100, 4], [0, 4]]).shape, "sliver");
  // 5 x 5 m: under SLIVER_WIDTH_M and still a shed rather than a wall.
  assert.notEqual(metrics([[0, 0], [5, 0], [5, 5], [0, 5]]).shape, "sliver");
});

test("a hand-drawn circle is recognised", () => {
  // The same 32-point construction draw.js's own Circle tool produces,
  // for a bunker-sized 8 m radius.
  const ring = Array.from({ length: 32 }, (_, i) =>
    [8 * Math.cos((2 * Math.PI * i) / 32), 8 * Math.sin((2 * Math.PI * i) / 32)]);
  assert.equal(metrics(ring).shape, "circle");
});

test("an elongated oval is not a circle", () => {
  // 10 x 7: compactness 0.951 clears CIRCLE_COMPACTNESS on its own, so this
  // proves CIRCLE_MAX_ELONGATION is doing real independent work rather than
  // never actually triggering.
  const ring = Array.from({ length: 32 }, (_, i) =>
    [10 * Math.cos((2 * Math.PI * i) / 32), 7 * Math.sin((2 * Math.PI * i) / 32)]);
  const m = metrics(ring);
  assert.ok(m.compactness > CIRCLE_COMPACTNESS);
  assert.notEqual(m.shape, "circle");
});

test("a plain square is not reclassified as a circle", () => {
  // Elongation 1.0 clears CIRCLE_MAX_ELONGATION, but compactness pi/4
  // (~0.785) sits under CIRCLE_COMPACTNESS -- both thresholds must hold.
  const m = metrics([[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.ok(m.compactness < CIRCLE_COMPACTNESS);
  assert.notEqual(m.shape, "circle");
});

test("elongation alone does not cap a wide building", () => {
  // The Permit Office: 82 x 13 m, three storeys, 6.3:1. An earlier draft
  // capped this at a one-line entry on the ratio. It is an office block.
  const m = metrics([[0, 0], [82, 0], [82, 13], [0, 13]],
    { levels: 3, heightSource: "levels" });
  assert.ok(m.elongation > STRIP_ELONGATION);
  assert.ok(m.widthM > SLIVER_WIDTH_M);
  assert.equal(capacity(m).maxDepth, "standing");
});

test("a wall is capped however much floor area it has", () => {
  const m = metrics([[0, 0], [400, 0], [400, 4], [0, 4]]);
  assert.equal(m.shape, "sliver");
  assert.equal(m.rooms, 0);
  assert.equal(capacity(m).maxDepth, "sketch");
  const joined = capacity(m).reasons.join(" ");
  assert.match(joined, /no room in there/);
  assert.doesNotMatch(joined, /several distinct spaces/);
});

test("the ladder rises with floor area", () => {
  const seen = [4, 9, 20, 45].map((side) =>
    capacity(metrics([[0, 0], [side, 0], [side, side], [0, side]])).maxDepth);
  assert.deepEqual(seen, ["named", "sketch", "scene", "standing"]);
});

test("storeys multiply the footprint and a missing count says so", () => {
  const ring = [[0, 0], [20, 0], [20, 20], [0, 20]];
  const tagged = metrics(ring, { levels: 3, heightSource: "levels" });
  assert.equal(tagged.floorAreaM2, 1200);
  assert.equal(tagged.floorAreaEstimated, false);

  const unknown = metrics(ring);
  assert.equal(unknown.levels, 1);
  assert.equal(unknown.heightSource, "typical");
  assert.equal(unknown.floorAreaEstimated, true);
  assert.match(capacity(unknown).reasons.join(" "), /No storey count/);
});

test("a defaulted height never becomes storeys", () => {
  // The store fills height_m in for every building, using a per-type default
  // where nothing is tagged. Read as a measurement it doubles the floor area
  // of a shed — which is how a 24 m² bicycle store was reported live as 48 m²
  // across two levels, both numbers invented by the tool.
  const ring = [[0, 0], [20, 0], [20, 20], [0, 20]];
  const guessed = metrics(ring, { heightM: 8, heightSource: "typical" });
  assert.equal(guessed.levels, 1);
  assert.equal(guessed.floorAreaM2, guessed.areaM2);
  assert.equal(guessed.floorAreaEstimated, true);
  assert.equal(guessed.heightM, 8);

  // The same number, actually tagged, is a measurement and does count.
  const real = metrics(ring, { heightM: 8, heightSource: "tagged" });
  assert.equal(real.levels, 2);
  assert.equal(real.floorAreaEstimated, false);
});

test("a tagged height infers storeys at the shared constant", () => {
  const m = metrics([[0, 0], [20, 0], [20, 20], [0, 20]],
    { heightM: 22, heightSource: "tagged" });
  assert.equal(m.levels, Math.round(22 / LEVEL_HEIGHT_M));
  assert.equal(m.floorAreaEstimated, false);
});

test("check compares a declaration against the ceiling", () => {
  const big = metrics([[0, 0], [45, 0], [45, 45], [0, 45]]);
  assert.equal(check("scene", big).ok, true);

  const tiny = metrics([[0, 0], [4, 0], [4, 4], [0, 4]]);
  const failed = check("standing", tiny);
  assert.equal(failed.ok, false);
  assert.equal(failed.maxDepth, "named");
  assert.ok(failed.reasons.length > 0);
});

test("an unknown declared depth reads as the cheapest rung", () => {
  const m = metrics([[0, 0], [45, 0], [45, 45], [0, 45]]);
  assert.equal(check(null, m).declared, "named");
  assert.equal(check("epic", m).declared, "named");
});

test("classify only ever returns a name the vocabulary knows", () => {
  for (const [e, r, w] of [[1, 1, 10], [12, 0.9, 3], [4, 0.3, 20],
    [1.2, 0.7, 40], [Infinity, 0, 0], [null, 0, 0]]) {
    assert.ok(SHAPES.includes(classify(e, r, w)), `${e}/${r}/${w}`);
  }
});

test("every advice sentence is prose, not a field name", () => {
  // design/testing-strategy.md's GM-facing prose rule applies to tool output
  // that gets read while writing.
  for (const side of [4, 20, 60]) {
    for (const reason of capacity(metrics(
      [[0, 0], [side, 0], [side, side], [0, side]])).reasons) {
      assert.ok(reason.endsWith("."), reason);
      assert.doesNotMatch(reason, /_/, reason);
    }
  }
});
