// The real buildings of the campaign map for the Location Editor (module/blank-inheritance/scripts/core/buildings-index.mjs): reading
// the exported file, finding the footprint under a click, and adopting one as a draft place.

import { test } from "node:test";
import assert from "node:assert/strict";
import { adoptBuilding, adoptedBuildingIds, adoptedNote, buildingAsShape, buildingPick, decodeIndex, layOutBuildings, SOURCE_FLAG } from "../module/blank-inheritance/scripts/core/buildings-index.mjs";
import { emptySession } from "../module/blank-inheritance/scripts/core/location-editor.mjs";

// two image px per scene px 2, so image (100, 100) is scene (200, 200)
const scene2 = ({ x, y }) => ({ x: x * 2, y: y * 2 });
const DOC = {
  kind: "buildings-index", version: 1, image: [1000, 1000], units: "image px", kinds: ["house", "yes", "school"],
  buildings: [
    ["b1", 0, "The Corner House", 400, [100, 100, 20, 0, 0, 20, -20, 0]],     // 100..120 square
    ["b2", 1, null, 90000, [50, 50, 300, 0, 0, 300, -300, 0]],              // a big compound 50..350
    ["b3", 2, "North School", 1200, [600, 600, 40, 0, 0, 30, -40, 0]]         // 600..640 x 600..630
  ]
};

test("the file's delta-coded rings are read back into image-px polygons, with kinds by index and names or null", () => {
  const d = decodeIndex(DOC);
  assert.equal(d.buildings.length, 3);
  assert.deepEqual(d.buildings[0].ring, [[100, 100], [120, 100], [120, 120], [100, 120]]);
  assert.deepEqual(d.buildings[1].ring, [[50, 50], [350, 50], [350, 350], [50, 350]]);
  assert.equal(d.buildings[0].kind, "house");
  assert.equal(d.buildings[1].name, null);
  assert.equal(d.buildings[2].kind, "school");
  assert.equal(d.buildings[0].area, 400);
  assert.deepEqual(d.image, [1000, 1000]);
  assert.equal(d.skipped, 0);
});

test("a file that is not a buildings index of this version is refused loudly; a bad row is skipped and counted", () => {
  assert.throws(() => decodeIndex(null), /not a buildings index/);
  assert.throws(() => decodeIndex({ kind: "location" }), /not a buildings index/);
  assert.throws(() => decodeIndex({ ...DOC, version: 2 }), /version 2/);
  assert.throws(() => decodeIndex({ kind: "buildings-index", version: 1 }), /needs `kinds` and `buildings`/);
  const d = decodeIndex({ ...DOC, buildings: [...DOC.buildings, ["bad", 0, null, 1, [1, 2, 3]], "junk", ["short", 0, null, 1, [1, 2]]] });
  assert.equal(d.buildings.length, 3);
  assert.equal(d.skipped, 3);
});

test("laid on the scene, each building has its ring in scene px, its box and its area; the grid finds what is in a box", () => {
  const field = layOutBuildings(decodeIndex(DOC), scene2, { cell: 64 });
  assert.equal(field.count, 3);
  const house = field.all.find((b) => b.id === "b1");
  assert.deepEqual(house.ringScene[0], { x: 200, y: 200 });
  assert.deepEqual(house.bounds, { x0: 200, y0: 200, x1: 240, y1: 240 });
  assert.equal(house.area, 1600);
  assert.equal(house.areaM2, 400, "the file's own area, in metres, is kept");
  assert.deepEqual(field.inBox({ x0: 190, y0: 190, x1: 250, y1: 250 }).map((b) => b.id).sort(), ["b1", "b2"], "the house and the compound round it");
  assert.deepEqual(field.inBox({ x0: 1100, y0: 1100, x1: 1300, y1: 1300 }).map((b) => b.id), ["b3"]);
  assert.deepEqual(field.inBox({ x0: 5000, y0: 5000, x1: 6000, y1: 6000 }), []);
  const once = field.inBox({ x0: 0, y0: 0, x1: 2000, y1: 2000 });
  assert.equal(new Set(once).size, once.length, "a building that spans several grid cells is returned once");
});

test("the building under a point is the SMALLEST footprint containing it: the house in the compound, not the compound", () => {
  const field = layOutBuildings(decodeIndex(DOC), scene2, { cell: 64 });
  assert.equal(field.hit(220, 220).id, "b1");
  assert.equal(field.hit(400, 400).id, "b2", "inside the compound but not the house");
  assert.equal(field.hit(1230, 1230).id, "b3");
  assert.equal(field.hit(3000, 3000), null);
  assert.equal(field.hit(220, 220, { include: (b) => b.id !== "b1" }).id, "b2", "a filter can take one out");
});

test("with slop, a click a hair outside a building takes the nearest edge; without it, only the inside counts", () => {
  const field = layOutBuildings(decodeIndex(DOC), scene2, { cell: 64 });
  assert.equal(field.hit(1300, 1230), null, "20 scene px right of the school, no slop: nothing");
  assert.equal(field.hit(1300, 1230, { slop: 30 }).id, "b3");
  assert.equal(field.hit(1300, 1230, { slop: 10 }), null, "too far for this much slop");
  assert.equal(field.hit(250, 230, { slop: 15 }).id, "b2", "10 px outside the house but inside the compound: an exact hit beats the nearest edge");
});

test("a building as the draw layer's hover wants it: a shape with a tier of building, never mistaken for a place", () => {
  const field = layOutBuildings(decodeIndex(DOC), scene2);
  const shape = buildingAsShape(field.all[0]);
  assert.equal(shape.tier, "building");
  assert.equal(shape.id, "building:b1");
  assert.equal(shape.name, "The Corner House");
  assert.equal(shape.kind, "house");
  assert.equal(shape.ringsScene[0].length, 4);
  assert.equal(shape.pointScene, null);
  assert.equal(buildingAsShape(field.all[1]).name, "Unnamed building");
  assert.equal(buildingAsShape(field.all[1]).kind, "", "the plain building=yes is not worth saying");
});

test("a pick hands over enough to adopt the building, as plain numbers", () => {
  const field = layOutBuildings(decodeIndex(DOC), scene2);
  const pick = buildingPick(field.all[0]);
  assert.deepEqual(pick, { building: { id: "b1", kind: "house", name: "The Corner House", areaM2: 400, ringScene: [[200, 200], [240, 200], [240, 240], [200, 240]] }, tier: "site", name: "The Corner House" });
  assert.equal(buildingPick(field.all[1]).name, "", "unnamed: the name is left for the GM");
});

test("adopting a building makes a new draft site with its exact footprint, name and the note of where it came from", () => {
  const field = layOutBuildings(decodeIndex(DOC), scene2);
  const { session, item, adopted } = adoptBuilding(emptySession(), buildingPick(field.all[0]).building);
  assert.equal(adopted, true);
  assert.equal(item.tier, "site");
  assert.equal(item.locationId, null);
  assert.equal(item.name, "The Corner House");
  assert.deepEqual(item.geometry, { kind: "polygon", ringPx: [[200, 200], [240, 200], [240, 240], [200, 240]], holesPx: [] });
  assert.equal(item.fields.name, "The Corner House");
  assert.equal(item.fields.note, adoptedNote({ kind: "house", areaM2: 400, id: "b1" }));
  assert.match(item.fields.note, /^A real house building of the map \(footprint 400 m2, store id b1\), adopted as it stands\.$/);
  assert.deepEqual(item[SOURCE_FLAG], { buildingId: "b1", kind: "house", areaM2: 400 });
  assert.equal(session.items[item.localId], item);
  assert.deepEqual([...adoptedBuildingIds(session)], ["b1"]);
});

test("adopting the same building again finds the first; an unnamed one starts unnamed; a plain building=yes is just a building", () => {
  const field = layOutBuildings(decodeIndex(DOC), scene2);
  const first = adoptBuilding(emptySession(), buildingPick(field.all[0]).building);
  const again = adoptBuilding(first.session, buildingPick(field.all[0]).building);
  assert.equal(again.adopted, false);
  assert.equal(again.item.localId, first.item.localId);
  assert.equal(Object.keys(again.session.items).length, 1);
  const unnamed = adoptBuilding(first.session, buildingPick(field.all[1]).building);
  assert.equal(unnamed.item.name, null);
  assert.equal(unnamed.item.fields.name, null);
  assert.match(unnamed.item.fields.note, /^A real building of the map \(footprint 90000 m2/);
  assert.equal(Object.keys(unnamed.session.items).length, 2);
});
