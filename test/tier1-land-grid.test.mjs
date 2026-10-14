// Tier 1 -- the land grid (core/land-grid.mjs): where the water is on the painted map, for the Location Editor's journey checks.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { crossing, crossingAlong, decodeLandGrid, nearestLand } from "../module/blank-inheritance/scripts/core/land-grid.mjs";
import { SYNCED_MAP_FILES } from "../tools/module-sync/stage-campaign-data.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 8 x 4 samples of 10 px whose first sample is centred at (105, 205), so the grid covers x 100..180, y 200..240.
// row 0: land land land land water water water water
// row 1: land land land land water water water water
// row 2: land land water land land land land land         (a pond one sample wide)
// row 3: land land land land land land land land
const doc = {
  kind: "land-grid", version: 1, cols: 8, rows: 4, step: 10, origin: [105, 205],
  runs: [[0, 4], [1, 4], [0, 4], [1, 4], [0, 2], [1, 1], [0, 5], [0, 8]]
};

test("a grid reads back as water, land, or unknown outside it; a sample's edges belong to the sample they open", () => {
  const g = decodeLandGrid(doc);
  assert.deepEqual([g.cols, g.rows, g.step, g.x0, g.y0, g.x1, g.y1], [8, 4, 10, 100, 200, 180, 240]);
  assert.equal(g.isWater(110, 205), false);
  assert.equal(g.isWater(150, 205), true);
  assert.equal(g.isLand(150, 205), false);
  assert.equal(g.isWater(125, 225), true, "the pond");
  assert.equal(g.isWater(100, 200), false, "the top-left corner is the first sample");
  assert.equal(g.isWater(180, 200), null, "x1 is outside: the grid ends at 180");
  assert.equal(g.isWater(50, 205), null);
  assert.equal(g.isWater(150, 999), null);
  assert.equal(g.isLand(50, 205), null, "outside is unknown, never land");
});

test("a bad file is refused loudly: not a land grid, another version, runs that do not fill the grid", () => {
  assert.throws(() => decodeLandGrid(null), /not a land grid/);
  assert.throws(() => decodeLandGrid({ kind: "buildings-index" }), /not a land grid/);
  assert.throws(() => decodeLandGrid({ ...doc, version: 2 }), /version 2/);
  assert.throws(() => decodeLandGrid({ ...doc, runs: [[0, 10]] }), /cover 10 samples/);
  assert.throws(() => decodeLandGrid({ ...doc, runs: [[0, 40]] }), /longer than the grid/);
  assert.throws(() => decodeLandGrid({ kind: "land-grid", version: 1, cols: 2, rows: 2 }), /missing/);
});

test("crossing measures how much of a straight stretch is over water: along a row, across the pond, and not at all over land", () => {
  const g = decodeLandGrid(doc);
  const along = crossing(g, { x: 105, y: 205 }, { x: 175, y: 205 });
  assert.equal(along.total, 70);
  assert.ok(Math.abs(along.water - 40) <= 6, `about the four water samples, 40 m: ${along.water}`);
  assert.ok(Math.abs(along.land - 30) <= 6);
  assert.equal(along.unknown, 0);
  const pond = crossing(g, { x: 105, y: 225 }, { x: 145, y: 225 });
  assert.ok(pond.water >= 5 && pond.water <= 15, `the one-sample pond is not stepped over: ${pond.water}`);
  assert.deepEqual(crossing(g, { x: 105, y: 235 }, { x: 175, y: 235 }), { total: 70, water: 0, land: 70, unknown: 0 });
  const out = crossing(g, { x: 60, y: 205 }, { x: 100, y: 205 });
  assert.equal(out.unknown, 40, "the border is unknown, not water");
  assert.equal(out.water, 0);
  assert.deepEqual(crossing(g, { x: 1, y: 1 }, { x: 1, y: 1 }), { total: 0, water: 0, land: 0, unknown: 0 });
});

test("crossingAlong adds the stretches of a polyline", () => {
  const g = decodeLandGrid(doc);
  const sum = crossingAlong(g, [{ x: 105, y: 235 }, { x: 175, y: 235 }, { x: 175, y: 205 }]);
  assert.equal(sum.total, 100);
  assert.ok(sum.water >= 15 && sum.water <= 25, `the second stretch runs up the water side: ${sum.water}`);
  assert.equal(crossingAlong(g, [{ x: 1, y: 1 }]).total, 0, "a single point is no journey");
});

test("nearestLand finds the shore for a point in the water, and nothing for a point that is not", () => {
  const g = decodeLandGrid(doc);
  const shore = nearestLand(g, { x: 142, y: 205 });
  assert.ok(shore.distance <= 12, JSON.stringify(shore));
  assert.equal(g.isWater(shore.x, shore.y), false);
  assert.equal(nearestLand(g, { x: 105, y: 205 }), null, "already on land");
  assert.equal(nearestLand(g, { x: 50, y: 205 }), null, "outside the grid is not in the water");
  assert.equal(nearestLand(g, { x: 170, y: 205 }, 5), null, "none within reach");
});

/* ---------------------------------------------------------------- the real file */

const file = path.join(repo, "data", "map", "land-grid.json");
const present = existsSync(file);

test("the exported land grid is a valid grid of the painted map, mostly land and sea in plausible shares, with the border outside it", { skip: !present && "data/map/land-grid.json is not here: run python tools/location-sync/export_land_grid.py" }, () => {
  const g = decodeLandGrid(JSON.parse(readFileSync(file, "utf8")));
  assert.deepEqual([g.cols, g.rows, g.step], [480, 480, 25]);
  const wet = g.water.reduce((n, v) => n + v, 0) / g.water.length;
  assert.ok(wet > 0.3 && wet < 0.6, `${(wet * 100).toFixed(1)}% water`);
  assert.equal(g.isWater(50, 50), null, "the painted border is outside the content area");
  assert.ok(SYNCED_MAP_FILES.includes("land-grid.json"), "it ships with the campaign data, or the journey checks have no coastline on the server");
});

test("on the real grid the places the campaign stands on are land and the harbour is water", { skip: !present }, () => {
  const g = decodeLandGrid(JSON.parse(readFileSync(file, "utf8")));
  const centre = (id) => JSON.parse(readFileSync(path.join(repo, "data", "locations", `${id}.json`), "utf8")).derived.centroidPx;
  for (const id of ["candidate-gate", "long-hall", "main-mech-hangar", "the-plot-room", "island-platforms", "mainland-platforms", "the-paper-lantern", "seaward-platform"]) {
    const [x, y] = centre(id);
    assert.equal(g.isWater(x, y), false, `${id} stands on land`);
  }
  const [hx, hy] = centre("inner-harbour");
  assert.equal(g.isWater(hx, hy), true, "the inner harbour is water");
});

test("on the real grid a straight walk from the island platforms to the proving ground crosses the water, and one along a street does not", { skip: !present }, () => {
  const g = decodeLandGrid(JSON.parse(readFileSync(file, "utf8")));
  const centre = (id) => { const c = JSON.parse(readFileSync(path.join(repo, "data", "locations", `${id}.json`), "utf8")).derived.centroidPx; return { x: c[0], y: c[1] }; };
  const harbour = crossing(g, centre("the-paper-lantern"), centre("main-mech-hangar"));
  assert.ok(harbour.water > 500, `across the bay: ${Math.round(harbour.water)} m of water`);
  const near = crossing(g, centre("candidate-gate"), centre("long-hall"));
  assert.equal(near.water, 0, "a short walk on the island is dry");
});
