// Tier 1 — which region a building stands in, and which regions border
// each other — browser side.
//
// The claim: tools/location-sync/core/containment.mjs agrees with
// core/containment.py on every case in the shared fixture. Both suites read
// the same file, so neither half can be quietly "fixed" into agreement with
// itself.
//
// Written 2026-09-12 (Gazetteer V2). The finding that led to this module:
// the map has forty regions tessellating it exactly, so every building
// already knows its own district by geometry alone, and nothing in the UI
// used that anywhere. This is what makes the tree-structured session list,
// the inspector breadcrumb and district focus mode possible.
//
// Python half: test/location-sync/test_containment.py, which also carries the
// real regression this was built to catch (see areAdjacent's own comment
// and the "real island in a hole" test below).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  pointInRing, pointInPolygon, polygonArea, centroidOf, areAdjacent, compute,
  PROXIMATE_TOLERANCE_PX,
} from "../../tools/location-sync/core/containment.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(
  readFileSync(join(here, "..", "fixtures", "gazetteer-containment-cases.json"), "utf8"));

test("the fixture is not empty", () => {
  assert.ok(FIXTURE.cases.length >= 4, "too few shared cases to be a contract");
});

test("every shared case reproduces exactly", () => {
  for (const c of FIXTURE.cases) {
    assert.deepEqual(compute(c.items), c.result, c.name);
  }
});

test("a point inside a square is inside", () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(pointInRing(5, 5, square), true);
  assert.equal(pointInRing(50, 50, square), false);
});

test("a point in a hole is excluded from the donut", () => {
  const outer = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const hole = [[40, 40], [60, 40], [60, 60], [40, 60]];
  assert.equal(pointInRing(50, 50, outer), true);
  assert.equal(pointInPolygon(50, 50, outer, [hole]), false);
  assert.equal(pointInPolygon(5, 5, outer, [hole]), true);
});

test("winding direction does not change containment", () => {
  const cw = [[0, 0], [0, 10], [10, 10], [10, 0]];
  const ccw = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(pointInRing(5, 5, cw), pointInRing(5, 5, ccw));
});

test("polygon area matches the shoelace formula", () => {
  assert.equal(polygonArea([[0, 0], [10, 0], [10, 10], [0, 10]]), 100);
});

test("centroidOf handles both a point and a polygon", () => {
  assert.deepEqual(centroidOf({ kind: "point", pointPx: [5, 9] }), [5, 9]);
  const [cx, cy] = centroidOf({ kind: "polygon", ringPx: [[0, 0], [10, 0], [10, 10], [0, 10]] });
  assert.equal(cx, 5);
  assert.equal(cy, 5);
});

test("a shared edge is adjacent; a distant square is not", () => {
  const a = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const b = [[10, 0], [20, 0], [20, 10], [10, 10]];
  const c = [[1000, 1000], [1010, 1000], [1010, 1010], [1000, 1010]];
  assert.equal(areAdjacent(a, b), true);
  assert.equal(areAdjacent(a, c), false);
});

test("adjacency respects the tolerance boundary both ways", () => {
  const a = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const near = 10.0 + PROXIMATE_TOLERANCE_PX * 0.5;
  const b = [[near, 0], [20, 0], [20, 10], [near, 10]];
  assert.equal(areAdjacent(a, b), true);

  const far = 10.0 + PROXIMATE_TOLERANCE_PX + 5.0;
  const c = [[far, 0], [far + 10, 0], [far + 10, 10], [far, 10]];
  assert.equal(areAdjacent(a, c), false);
});

test("adjacency is symmetric", () => {
  const a = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const b = [[10, 0], [20, 0], [20, 10], [10, 10]];
  assert.equal(areAdjacent(a, b), areAdjacent(b, a));
});

test("compute: every site is assigned to exactly one region or none", () => {
  const items = [
    { localId: "a", tier: "region", geometry: { kind: "polygon", ringPx: [[0, 0], [10, 0], [10, 10], [0, 10]] } },
    { localId: "s1", tier: "site", geometry: { kind: "polygon", ringPx: [[2, 2], [4, 2], [4, 4], [2, 4]] } },
    { localId: "p1", tier: "point", geometry: { kind: "point", pointPx: [500, 500] } },
  ];
  const result = compute(items);
  assert.equal(result.s1.withinRegionRef, "a");
  assert.equal(result.p1.withinRegionRef, null);
  assert.deepEqual(result.a.containsRefs, ["s1"]);
});

test("compute: an overlap is won by the smaller region", () => {
  const big = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const small = [[40, 40], [60, 40], [60, 60], [40, 60]];
  const items = [
    { localId: "big", tier: "region", geometry: { kind: "polygon", ringPx: big } },
    { localId: "small", tier: "region", geometry: { kind: "polygon", ringPx: small } },
    { localId: "s", tier: "site", geometry: { kind: "polygon", ringPx: [[48, 48], [52, 48], [52, 52], [48, 52]] } },
  ];
  assert.equal(compute(items).s.withinRegionRef, "small");
});

test("compute: a region never appears in its own neighbours", () => {
  const items = [
    { localId: "a", tier: "region", geometry: { kind: "polygon", ringPx: [[0, 0], [10, 0], [10, 10], [0, 10]] } },
  ];
  assert.ok(!compute(items).a.neighbourRefs.includes("a"));
});

test("compute: a degenerate geometry gets no region rather than throwing", () => {
  const items = [
    { localId: "a", tier: "region", geometry: { kind: "polygon", ringPx: [[0, 0], [10, 0], [10, 10], [0, 10]] } },
    { localId: "bad", tier: "site", geometry: { kind: "polygon", ringPx: [] } },
  ];
  assert.deepEqual(compute(items).bad, { withinRegionRef: null });
});

test("compute: the real island-in-a-hole regression stays fixed", () => {
  // See containment.py's _boundary_rings and the module docstring: a first
  // version tested only exterior-to-exterior pairs and reported a real
  // region sitting in another region's hole as having zero neighbours.
  const outer = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const hole = [[40, 40], [60, 40], [60, 60], [40, 60]];
  const items = [
    { localId: "sea", tier: "region", geometry: { kind: "polygon", ringPx: outer, holesPx: [hole] } },
    { localId: "island", tier: "region", geometry: { kind: "polygon", ringPx: hole } },
  ];
  const result = compute(items);
  assert.deepEqual(result.island.neighbourRefs, ["sea"]);
  assert.deepEqual(result.sea.neighbourRefs, ["island"]);
});
