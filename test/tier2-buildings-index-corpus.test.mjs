// The real exported buildings (data/map/buildings-index.json, tools/location-sync/export_buildings.py) holds to the contract the Location
// Editor reads it by: a valid file of this version, every footprint a real polygon on the map image, ids unique, small enough to ship,
// and shipped with the campaign data. `python tools/location-sync/export_buildings.py --check` says whether it is current (it needs the
// 123 MB store, so that is a command and not a test).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decodeIndex, layOutBuildings } from "../module/blank-inheritance/scripts/core/buildings-index.mjs";
import { pointInRing } from "../module/blank-inheritance/scripts/core/location-editor.mjs";
import { SYNCED_MAP_FILES } from "../tools/module-sync/stage-campaign-data.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(repo, "data", "map", "buildings-index.json");
const present = existsSync(file);
const doc = present ? JSON.parse(readFileSync(file, "utf8")) : null;

test("the buildings index exists, is small enough to ship with the module, and is shipped", { skip: !present && "data/map/buildings-index.json is not here: run python tools/location-sync/export_buildings.py" }, () => {
  assert.ok(statSync(file).size < 8 * 1024 * 1024, "under 8 MB (the travel graph is 4.4 MB and ships)");
  assert.ok(SYNCED_MAP_FILES.includes("buildings-index.json"), "it must be in the campaign data push, or the editor has no buildings to show on the server");
});

test("it is a valid index of the version the editor reads, with tens of thousands of buildings", { skip: !present }, () => {
  const d = decodeIndex(doc);
  assert.equal(d.skipped, 0, "no row is malformed");
  assert.deepEqual(d.image, [12400, 12400]);
  assert.ok(d.buildings.length > 30000, `${d.buildings.length} buildings`);
  assert.ok(d.kinds.includes("house") && d.kinds.includes("yes"));
});

test("every footprint is a real polygon on the map image, with a unique id and a sane area", { skip: !present }, () => {
  const d = decodeIndex(doc);
  const ids = new Set();
  for (const b of d.buildings) {
    assert.ok(!ids.has(b.id), `duplicate id ${b.id}`);
    ids.add(b.id);
    assert.ok(b.ring.length >= 3, `${b.id} has ${b.ring.length} vertices`);
    for (const [x, y] of b.ring) assert.ok(x > -200 && x < 12600 && y > -200 && y < 12600, `${b.id} vertex (${x}, ${y}) is off the map`);
    assert.ok(b.area >= 0 && b.area < 2_000_000, `${b.id} area ${b.area}`);
  }
  assert.ok(d.buildings.filter((b) => b.name).length > 1000, "the named buildings are there");
});

test("laid on a scene it can be asked what is at a point; the middle of a known building answers with it", { skip: !present }, () => {
  const d = decodeIndex(doc);
  const field = layOutBuildings(d, ({ x, y }) => ({ x, y }), { cell: 200 });
  assert.equal(field.count, d.buildings.length);
  let tested = 0;
  for (const b of field.all.filter((x) => x.area > 200).slice(0, 400)) {
    const cx = (b.bounds.x0 + b.bounds.x1) / 2;
    const cy = (b.bounds.y0 + b.bounds.y1) / 2;
    if (!pointInRing(cx, cy, b.ringScene)) continue;      // a concave footprint's box middle can lie outside it
    const hit = field.hit(cx, cy);
    assert.ok(hit && hit.area <= b.area + 1e-6, `at the middle of ${b.id} the answer is ${hit?.id}, not the smallest footprint there`);
    tested++;
  }
  assert.ok(tested > 100);
});
