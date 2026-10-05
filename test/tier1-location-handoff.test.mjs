// The Location Editor's hand-off to Claude (module/blank-inheritance/scripts/core/location-handoff.mjs): the JSON copied from the editor says which
// shape was picked -- exact outline in map-image pixels, the real building it was adopted from, the form's fields, its district and neighbours --
// and reads back, even if a chat window wrapped it in a code fence.

import { test } from "node:test";
import assert from "node:assert/strict";
import { HANDOFF_KIND, HANDOFF_VERSION, NEAREST_LIMIT, buildHandoff, itemImageGeometry, parseHandoff, serialiseHandoff } from "../module/blank-inheritance/scripts/core/location-handoff.mjs";
import { emptyFields } from "../module/blank-inheritance/scripts/core/location-editor.mjs";

// scene px are twice the image px, so image (100, 100) is scene (200, 200)
const toImage = ({ x, y }) => ({ x: x / 2, y: y / 2 });
const MPP = 0.5;                                                     // half a metre to an image pixel

const house = {
  localId: "draft-1", tier: "site", locationId: null, name: "The Corner House",
  geometry: { kind: "polygon", ringPx: [[200, 200], [240, 200], [240, 240], [200, 240]], holesPx: [] },       // image 100..120 square: 20 x 20 px
  source: { buildingId: "way/123", kind: "house", areaM2: 100 }
};
const district = { id: "old-quarter", name: "Old Quarter", tier: "region", kind: "district", rings: [[[0, 0], [400, 0], [400, 400], [0, 400]]], point: null };
const block = { id: "tea-row", name: "Tea Row", tier: "site", kind: "street", rings: [[[90, 90], [130, 90], [130, 130], [90, 130]]], point: null };
const pin = { id: "shrine-pin", name: "Shrine", tier: "point", kind: "shrine", rings: [], point: [160, 110] };
const far = { id: "far-away", name: "Far Away", tier: "site", kind: "", rings: [[[900, 900], [950, 900], [950, 950], [900, 950]]], point: null };

test("an item's geometry is its outline in image px, with its centre, box and size in metres", () => {
  const g = itemImageGeometry(house, toImage, MPP);
  assert.deepEqual(g.geometry.rings, [[[100, 100], [120, 100], [120, 120], [100, 120]]]);
  assert.equal(g.geometry.point, null);
  assert.deepEqual(g.bounds, { x0: 100, y0: 100, x1: 120, y1: 120 });
  assert.deepEqual([g.centre.x, g.centre.y], [110, 110]);
  assert.equal(g.areaPx2, 400);
  assert.equal(g.areaM2, 100, "400 px2 at half a metre a pixel");
  assert.equal(itemImageGeometry({ geometry: { kind: "polygon", ringPx: [[1, 1], [2, 2]] } }, toImage), null, "fewer than three points: nothing to hand over");
  const pinned = itemImageGeometry({ geometry: { kind: "point", pointPx: [300, 300] } }, toImage, MPP);
  assert.deepEqual(pinned.geometry, { rings: [], point: [150, 150] });
});

test("the hand-off names the shape, what it was adopted from, the form's fields, its district (smallest first) and its neighbours by distance", () => {
  const fields = { ...emptyFields(), name: "The Paper Lantern", kind: "izakaya", note: "A side-street izakaya." };
  const h = buildHandoff({ at: "2026-10-05T12:00:00Z", scene: { id: "scene1", name: "01. The City" }, items: [{ item: house, fields }], toImage, published: [district, block, pin, far], metresPerPixel: MPP, drawFor: { label: "The Paper Lantern · the place" } });
  assert.equal(h.kind, HANDOFF_KIND);
  assert.equal(h.version, HANDOFF_VERSION);
  assert.equal(h.map.sceneName, "01. The City");
  assert.equal(h.drawingFor, "The Paper Lantern · the place");
  assert.equal(h.items.length, 1);
  const item = h.items[0];
  assert.equal(item.index, 0);
  assert.equal(item.name, "The Paper Lantern", "the form's name wins over the draft's");
  assert.equal(item.tier, "site");
  assert.equal(item.saved, false);
  assert.deepEqual(item.adoptedFrom, { buildingId: "way/123", kind: "house", areaM2: 100 });
  assert.equal(item.fields.kind, "izakaya");
  assert.deepEqual(item.centreImagePx, [110, 110]);
  assert.deepEqual(item.containedIn.map((c) => c.id), ["tea-row", "old-quarter"], "the street block, then the district round it");
  assert.deepEqual(item.nearest.map((n) => n.id).slice(0, 2).sort(), ["old-quarter", "tea-row"], "inside both: distance 0, so they come first");
  assert.equal(item.nearest[0].distancePx, 0);
  assert.equal(item.nearest.find((n) => n.id === "shrine-pin").distancePx, 50);
  assert.equal(item.nearest.find((n) => n.id === "shrine-pin").distanceM, 25);
  assert.ok(item.nearest.length <= NEAREST_LIMIT);
  assert.ok(h.howToUse.some((l) => /from-handoff\.mjs/.test(l)), "it says how it is to be used");
});

test("a location that is already saved is not offered to itself as a neighbour or a district, and says it is saved", () => {
  const saved = { ...house, locationId: "tea-row" };
  const h = buildHandoff({ at: null, items: [{ item: saved, fields: null }], toImage, published: [district, block], metresPerPixel: MPP });
  assert.equal(h.items[0].saved, true);
  assert.equal(h.items[0].locationId, "tea-row");
  assert.deepEqual(h.items[0].containedIn.map((c) => c.id), ["old-quarter"]);
  assert.ok(!h.items[0].nearest.some((n) => n.id === "tea-row"));
});

test("several shapes become several items, numbered; one with nothing drawn is left out; a hole is respected", () => {
  const ring = [[0, 0], [100, 0], [100, 100], [0, 100]];
  const holed = { ...district, id: "ring-district", rings: [[[0, 0], [400, 0], [400, 400], [0, 400]], [[90, 90], [130, 90], [130, 130], [90, 130]]] };
  const empty = { localId: "x", tier: "site", geometry: { kind: "polygon", ringPx: [[0, 0], [1, 1]] } };
  const h = buildHandoff({ items: [{ item: empty }, { item: house }, { item: { ...house, localId: "draft-2", geometry: { kind: "polygon", ringPx: ring } } }], toImage, published: [holed], metresPerPixel: null });
  assert.deepEqual(h.items.map((i) => i.index), [0, 1]);
  assert.deepEqual(h.items[0].containedIn, [], "the house stands in the district's hole: it is not in the district");
  assert.equal(h.items[0].areaM2, null, "no scale known: no metres claimed");
  assert.equal(h.map.metresPerPixel, null);
});

test("what is copied reads back, bare or inside a Markdown fence, and a wrong paste is refused plainly", () => {
  const h = buildHandoff({ at: "t", items: [{ item: house, fields: emptyFields() }], toImage, published: [], metresPerPixel: MPP });
  const text = serialiseHandoff(h);
  assert.equal(parseHandoff(text).ok, true);
  assert.deepEqual(parseHandoff(text).handoff, h);
  assert.deepEqual(parseHandoff("```json\n" + text + "\n```").handoff, h);
  assert.match(parseHandoff("hello").error, /not JSON/);
  assert.match(parseHandoff('{"kind":"location-edit"}').error, /not a location hand-off/);
  assert.match(parseHandoff(JSON.stringify({ kind: HANDOFF_KIND, version: 9, items: [{}] })).error, /version 9/);
  assert.match(parseHandoff(JSON.stringify({ kind: HANDOFF_KIND, version: HANDOFF_VERSION, items: [] })).error, /no items/);
});
