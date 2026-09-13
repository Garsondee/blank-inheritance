// Tier 1 — page-relative compass bearing, browser side.
//
// The claim: tools/gazetteer/core/bearing.mjs agrees with
// tools/gazetteer/core/bearing.py on every case in the shared fixture. See
// that fixture's own _comment, and bearing.py's module docstring, for the
// real incident this exists to close off — a live description that had a
// building's bearing from a landmark backwards (NW written where SE was
// true), because the breadcrumb's own distanceAndBearing(self, landmark)
// was phrased in prose as if it were landmark-to-self.
//
// See test/gazetteer/test_bearing.py for the Python half.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  POINTS_8, POINTS_16, bearingDeg, compassPoint, describe, distanceM,
} from "../tools/gazetteer/core/bearing.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(
  readFileSync(join(here, "fixtures", "gazetteer-bearing-cases.json"), "utf8"));

test("the fixture is not empty", () => {
  assert.ok(FIXTURE.cases.length >= 8, "too few shared cases to be a contract");
});

test("every shared case reproduces exactly", () => {
  for (const c of FIXTURE.cases) {
    const result = describe(c.fromPx, c.toPx, c.metresPerPx, POINTS_8);
    assert.ok(Math.abs(result.distanceM - c.distanceM) < 0.1, `${c.why}: distanceM`);
    assert.ok(Math.abs(result.bearingDeg - c.bearingDeg) < 0.1, `${c.why}: bearingDeg`);
    assert.equal(result.compass, c.compass, c.why);
  }
});

test("the two real-incident cases are genuine opposites", () => {
  const forward = FIXTURE.cases.find((c) => c.why.includes("forward"));
  const reversed = FIXTURE.cases.find((c) => c.why.includes("reversed"));
  assert.deepEqual(forward.fromPx, reversed.toPx);
  assert.deepEqual(forward.toPx, reversed.fromPx);
  assert.notEqual(forward.compass, reversed.compass,
    "the whole bug was that these two were reported as the same thing");
});

test("reversing the two points flips the bearing by 180 degrees", () => {
  const a = [0, 0], b = [100, -50];
  const forward = bearingDeg(a, b);
  const backward = bearingDeg(b, a);
  assert.ok(Math.abs(((forward + 180) % 360) - backward) < 1e-6);
});

test("the same point twice is zero", () => {
  assert.equal(bearingDeg([10, 10], [10, 10]), 0);
});

test("16-point table matches the 8-point table at the cardinals", () => {
  for (const [deg, point] of [[0, "N"], [90, "E"], [180, "S"], [270, "W"]]) {
    assert.equal(compassPoint(deg, POINTS_8), point);
    assert.equal(compassPoint(deg, POINTS_16), point);
  }
});

test("16-point table resolves the intermediate points", () => {
  assert.equal(compassPoint(22.5, POINTS_16), "NNE");
  assert.equal(compassPoint(67.5, POINTS_16), "ENE");
});

test("wraps at 360", () => {
  assert.equal(compassPoint(359.9, POINTS_8), "N");
});

test("zero distance between identical points", () => {
  assert.equal(distanceM([5, 5], [5, 5]), 0);
});

test("distance scales by metresPerPx", () => {
  assert.equal(distanceM([0, 0], [10, 0], 0.5), 5);
});
