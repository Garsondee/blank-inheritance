// Tier 1 -- the Location Editor's view of what already exists
// (module/blank-inheritance/scripts/core/location-published.mjs). design/location-editor.md §10 phase 7.
//
// The first version of the editor only ever drew the session's own drafts, so
// a GM who opened it saw an empty map. These tests are what keeps "every real
// location can be drawn, found under the cursor, and opened" true.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  adoptPublished,
  boxesOverlap,
  fitView,
  hitTestPublished,
  itemGeometryChanged,
  pointInShape,
  publishedBounds,
  publishedShapeFromDoc,
  publishedVisible,
  releasePeeked,
  shapeToScene
} from "../module/blank-inheritance/scripts/core/location-published.mjs";
import { emptyFields, emptySession, sessionItemList, updateItemFields, updateItemGeometry } from "../module/blank-inheritance/scripts/core/location-editor.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SQUARE = [[100, 100], [200, 100], [200, 200], [100, 200]];

function doc(over = {}) {
  return { id: "the-hall", name: "The Hall", tier: "site", kind: "civic", rank: 2, depth: "named", authoring: { status: "drafted" }, derived: { imagePx: [SQUARE], centroidPx: [150, 150] }, ...over };
}

// A calibration the way travel-animation.mjs builds one: scale + origin.
const toScene = ({ x, y }) => ({ x: x * 2 + 1000, y: y * 2 + 500 });
const scene = (over) => shapeToScene(publishedShapeFromDoc(doc(over)), toScene);

/* ------------------------------------------------------------------ */
/*  Reading a document                                                  */
/* ------------------------------------------------------------------ */

test("a site or region becomes a shape from derived.imagePx, carrying what the map labels it with", () => {
  const shape = publishedShapeFromDoc(doc());
  assert.deepEqual(shape.rings, [SQUARE]);
  assert.equal(shape.point, null);
  assert.equal(shape.id, "the-hall");
  assert.equal(shape.name, "The Hall");
  assert.equal(shape.tier, "site");
  assert.equal(shape.status, "drafted");
});

test("it reads image px, never geometry.rings -- that is lon/lat, and a map in pixels would draw it as a speck", () => {
  const shape = publishedShapeFromDoc(doc({ geometry: { rings: [[[135.2, 34.6], [135.21, 34.6], [135.21, 34.61]]], point: null } }));
  assert.deepEqual(shape.rings, [SQUARE]);
});

test("a region's holes survive, and a hole without a usable shell does not make a ring out of nothing", () => {
  const island = [[120, 120], [140, 120], [140, 140], [120, 140]];
  assert.deepEqual(publishedShapeFromDoc(doc({ tier: "region", derived: { imagePx: [SQUARE, island] } })).rings, [SQUARE, island]);
  assert.equal(publishedShapeFromDoc(doc({ derived: { imagePx: [[[1, 1], [2, 2]], island] } })), null, "a two-point shell is not a shell");
});

test("a point is its centroid, and a point with no centroid has nothing to draw", () => {
  const shape = publishedShapeFromDoc(doc({ tier: "point", derived: { imagePx: null, centroidPx: [7044.2, 6205.7] } }));
  assert.deepEqual(shape.point, [7044.2, 6205.7]);
  assert.deepEqual(shape.rings, []);
  assert.equal(publishedShapeFromDoc(doc({ tier: "point", derived: {} })), null);
});

test("junk in is null out, never a throw -- one bad file must not stop the other 235 appearing", () => {
  for (const bad of [null, undefined, 7, "x", {}, { id: "" }, { id: "x", tier: "region" }, { id: "x", tier: "site", derived: { imagePx: "no" } }, { id: "x", tier: "mystery", derived: { imagePx: [SQUARE] } }]) {
    assert.equal(publishedShapeFromDoc(bad), null, JSON.stringify(bad));
  }
});

/* ------------------------------------------------------------------ */
/*  Scene px                                                            */
/* ------------------------------------------------------------------ */

test("shapeToScene moves every ring through the calibration and works out bounds and the ground actually covered", () => {
  const island = [[120, 120], [140, 120], [140, 140], [120, 140]];
  const shape = scene({ tier: "region", derived: { imagePx: [SQUARE, island] } });
  assert.deepEqual(shape.ringsScene[0][0], { x: 1200, y: 700 });
  assert.deepEqual(shape.bounds, { x0: 1200, y0: 700, x1: 1400, y1: 900 });
  // 200x200 shell minus a 40x40 island, in scene px
  assert.equal(shape.area, 200 * 200 - 40 * 40);
});

test("a point's scene position and bounds are its own", () => {
  const shape = shapeToScene(publishedShapeFromDoc(doc({ tier: "point", derived: { centroidPx: [10, 20] } })), toScene);
  assert.deepEqual(shape.pointScene, { x: 1020, y: 540 });
  assert.deepEqual(shape.bounds, { x0: 1020, y0: 540, x1: 1020, y1: 540 });
});

/* ------------------------------------------------------------------ */
/*  Finding one under the cursor                                        */
/* ------------------------------------------------------------------ */

test("pointInShape: inside, outside, and inside a hole (which is not inside the region)", () => {
  const island = [[120, 120], [140, 120], [140, 140], [120, 140]];
  const region = scene({ tier: "region", derived: { imagePx: [SQUARE, island] } });
  assert.equal(pointInShape(region, 1350, 850), true);
  assert.equal(pointInShape(region, 5000, 5000), false);
  assert.equal(pointInShape(region, 1260, 760), false, "(130,130) image px is on the island");
});

test("the smallest polygon under the cursor wins, so a building inside a district is the answer, not the district", () => {
  const district = scene({ id: "district", tier: "region", derived: { imagePx: [[[0, 0], [500, 0], [500, 500], [0, 500]]] } });
  const hall = scene({ id: "hall" });
  assert.equal(hitTestPublished([district, hall], 1300, 800).id, "hall");
  assert.equal(hitTestPublished([hall, district], 1300, 800).id, "hall", "order of the list does not matter");
  assert.equal(hitTestPublished([district, hall], 1100, 600).id, "district", "outside the hall, still inside the district");
  assert.equal(hitTestPublished([district, hall], 9000, 9000), null);
});

test("a pin within reach beats any polygon under it, nearest pin first", () => {
  const district = scene({ id: "district", tier: "region", derived: { imagePx: [[[0, 0], [500, 0], [500, 500], [0, 500]]] } });
  const near = shapeToScene(publishedShapeFromDoc(doc({ id: "near", tier: "point", derived: { centroidPx: [100, 100] } })), toScene);
  const nearer = shapeToScene(publishedShapeFromDoc(doc({ id: "nearer", tier: "point", derived: { centroidPx: [101, 100] } })), toScene);
  assert.equal(hitTestPublished([district, near], 1203, 703, { pinRadius: 10 }).id, "near");
  assert.equal(hitTestPublished([near, nearer], 1203, 703, { pinRadius: 10 }).id, "nearer", "(1202 vs 1200: the closer pin)");
  assert.equal(hitTestPublished([district, near], 1203, 703, { pinRadius: 1 }).id, "district", "out of pin reach it is only the district");
});

test("hidden tiers and locations already open in the session are skipped, so you can click through to what is underneath", () => {
  const district = scene({ id: "district", tier: "region", derived: { imagePx: [[[0, 0], [500, 0], [500, 500], [0, 500]]] } });
  const hall = scene({ id: "hall" });
  assert.equal(hitTestPublished([district, hall], 1300, 800, { include: (s) => s.id !== "hall" }).id, "district");
  assert.equal(hitTestPublished([district, hall], 1300, 800, { include: (s) => publishedVisible(s, { site: false }) }).id, "district");
});

test("publishedVisible shows anything not explicitly switched off", () => {
  assert.equal(publishedVisible({ tier: "site" }, undefined), true);
  assert.equal(publishedVisible({ tier: "site" }, {}), true);
  assert.equal(publishedVisible({ tier: "site" }, { site: false }), false);
  assert.equal(publishedVisible({ tier: "region" }, { site: false }), true);
});

/* ------------------------------------------------------------------ */
/*  Opening one                                                         */
/* ------------------------------------------------------------------ */

test("opening a building links it to its file, locks it, marks it as only looked at, and remembers its outline", () => {
  const { session, item, adopted } = adoptPublished(emptySession(), scene());
  assert.equal(adopted, true);
  assert.equal(item.locationId, "the-hall");
  assert.equal(item.locked, true);
  assert.equal(item.peek, true);
  assert.equal(item.tier, "site");
  assert.equal(item.name, "The Hall");
  assert.deepEqual(item.geometry.ringPx[0], [1200, 700]);
  assert.deepEqual(item.baselineGeometry, item.geometry);
  assert.notEqual(item.baselineGeometry, item.geometry, "a copy, so reshaping the item cannot rewrite what it started as");
  assert.equal(sessionItemList(session).length, 1);
});

test("opening a pin keeps it a pin", () => {
  const pin = shapeToScene(publishedShapeFromDoc(doc({ id: "drain", tier: "point", derived: { centroidPx: [10, 20] } })), toScene);
  const { item } = adoptPublished(emptySession(), pin);
  assert.deepEqual(item.geometry, { kind: "point", pointPx: [1020, 540] });
});

test("opening a region keeps its islands as holes", () => {
  const island = [[120, 120], [140, 120], [140, 140], [120, 140]];
  const { item } = adoptPublished(emptySession(), scene({ tier: "region", derived: { imagePx: [SQUARE, island] } }));
  assert.equal(item.geometry.holesPx.length, 1);
  assert.deepEqual(item.geometry.holesPx[0][0], [1240, 740]);
});

test("opening a location that is already open returns the same item and adds nothing", () => {
  const first = adoptPublished(emptySession(), scene());
  const again = adoptPublished(first.session, scene());
  assert.equal(again.adopted, false);
  assert.equal(again.item.localId, first.item.localId);
  assert.equal(sessionItemList(again.session).length, 1);
});

test("an item that was only looked at is let go of when something else is selected; one that was changed is not", () => {
  let { session, item } = adoptPublished(emptySession(), scene({ id: "a" }));
  ({ session } = adoptPublished(session, scene({ id: "b" })));
  const b = sessionItemList(session).find((i) => i.locationId === "b");
  // b is touched: its outline is reshaped
  session = updateItemGeometry(session, b.localId, { ...b.geometry, ringPx: [[0, 0], [5, 0], [5, 5]] });
  const released = releasePeeked(session, []);
  assert.deepEqual(released.released, [item.localId], "only the untouched one goes");
  assert.deepEqual(sessionItemList(released.session).map((i) => i.locationId), ["b"]);
});

test("an item that is still selected is kept even though it was only looked at", () => {
  const { session, item } = adoptPublished(emptySession(), scene());
  assert.deepEqual(releasePeeked(session, [item.localId]).released, []);
});

test("editing a field also counts as touching it", () => {
  let { session, item } = adoptPublished(emptySession(), scene());
  session = updateItemFields(session, item.localId, { ...emptyFields(), name: "Renamed" });
  assert.equal(session.items[item.localId].peek, false);
  assert.deepEqual(releasePeeked(session, []).released, []);
});

test("releasePeeked never touches a drawing that was never peeked", () => {
  const session = { ...emptySession(), nextLocalId: 2, items: { "draft-1": { localId: "draft-1", tier: "site", geometry: { kind: "polygon", ringPx: SQUARE, holesPx: [] }, locationId: null } } };
  assert.deepEqual(releasePeeked(session, []).released, []);
});

test("itemGeometryChanged: opened-and-read is unchanged, reshaped is changed, a fresh drawing always counts as changed", () => {
  const { session, item } = adoptPublished(emptySession(), scene());
  assert.equal(itemGeometryChanged(item), false);
  const moved = updateItemGeometry(session, item.localId, { ...item.geometry, ringPx: item.geometry.ringPx.map(([x, y], i) => (i === 0 ? [x + 3, y] : [x, y])) }).items[item.localId];
  assert.equal(itemGeometryChanged(moved), true);
  assert.equal(itemGeometryChanged({ geometry: { kind: "polygon", ringPx: SQUARE } }), true);
});

/* ------------------------------------------------------------------ */
/*  The real files                                                      */
/* ------------------------------------------------------------------ */

test("every real location in data/locations/ can be drawn, and each one is found when you point at it", () => {
  const dir = path.join(repoRoot, "data", "locations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.ok(files.length > 200, "the corpus is the whole campaign gazetteer");
  const shapes = [];
  const undrawable = [];
  for (const file of files) {
    const loaded = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    const shape = publishedShapeFromDoc(loaded);
    if (shape) shapes.push(shapeToScene(shape, toScene)); else undrawable.push(file);
  }
  assert.deepEqual(undrawable, [], "a location with nothing to draw is invisible on the map and cannot be opened");
  assert.equal(shapes.length, files.length);
  // Pointing at each polygon's own first vertex-averaged interior point finds a polygon that contains it.
  let found = 0;
  for (const shape of shapes.filter((s) => !s.pointScene)) {
    const ring = shape.ringsScene[0];
    // a point guaranteed inside a simple ring: midpoint of the first edge nudged toward the centroid
    const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length, cy = ring.reduce((s, p) => s + p.y, 0) / ring.length;
    const mx = (ring[0].x + ring[1].x) / 2, my = (ring[0].y + ring[1].y) / 2;
    const x = mx + (cx - mx) * 0.02, y = my + (cy - my) * 0.02;
    if (!pointInShape(shape, x, y)) continue; // concave shapes can put that probe outside; the rule is still tested above
    const hit = hitTestPublished(shapes, x, y);
    assert.ok(hit && pointInShape(hit, x, y), `${shape.id}: whatever is found there must really contain the point`);
    found++;
  }
  assert.ok(found > 150, `expected to probe most of the ${shapes.length} shapes, probed ${found}`);
  for (const pin of shapes.filter((s) => s.pointScene)) {
    assert.equal(hitTestPublished(shapes, pin.pointScene.x, pin.pointScene.y).id, pin.id);
  }
});

/* ------------------------------------------------------------------ */
/*  Framing the camera                                                  */
/* ------------------------------------------------------------------ */

test("publishedBounds: the box that holds every shape; none for no shapes", () => {
  assert.equal(publishedBounds([]), null);
  const hall = scene({ id: "hall" });
  const far = shapeToScene(publishedShapeFromDoc(doc({ id: "far", tier: "point", derived: { centroidPx: [3000, 50] } })), toScene);
  assert.deepEqual(publishedBounds([hall]), hall.bounds);
  // hall: image 100..200 -> scene 1200..1400 x, 700..900 y (toScene: x2 + offset); far pin: image (3000,50) -> scene (7000, 600)
  assert.deepEqual(publishedBounds([hall, far]), { x0: 1200, y0: 600, x1: 7000, y1: 900 });
});

test("boxesOverlap: overlapping and touching boxes overlap; separated ones do not", () => {
  const a = { x0: 0, y0: 0, x1: 10, y1: 10 };
  assert.equal(boxesOverlap(a, { x0: 5, y0: 5, x1: 20, y1: 20 }), true);
  assert.equal(boxesOverlap(a, { x0: 10, y0: 10, x1: 20, y1: 20 }), true, "touching counts");
  assert.equal(boxesOverlap(a, { x0: 11, y0: 0, x1: 20, y1: 10 }), false);
  assert.equal(boxesOverlap(a, { x0: 0, y0: 11, x1: 10, y1: 20 }), false);
});

test("fitView: centred on the box, the tighter axis decides the zoom, the margin is left empty", () => {
  const view = fitView({ x0: 0, y0: 0, x1: 2000, y1: 1000 }, 1000, 800, { margin: 0.1 });
  assert.deepEqual({ x: view.x, y: view.y }, { x: 1000, y: 500 });
  assert.ok(Math.abs(view.scale - 0.5 * 0.9) < 1e-12, "width is the tighter axis: 1000/2000, less the margin");
  assert.ok(Math.abs(fitView({ x0: 0, y0: 0, x1: 1000, y1: 2000 }, 1000, 800, { margin: 0 }).scale - 0.4) < 1e-12, "height is the tighter axis: 800/2000");
  assert.equal(fitView(null, 1000, 800), null);
  assert.equal(fitView({ x0: 0, y0: 0, x1: 10, y1: 10 }, 0, 800), null);
  assert.ok(Number.isFinite(fitView({ x0: 5, y0: 5, x1: 5, y1: 5 }, 100, 100).scale), "a single point has no zero-size division");
});

test("fitView with a window over the left of the screen fits and centres the box in what is left", () => {
  const box = { x0: 0, y0: 0, x1: 1000, y1: 1000 };
  const view = fitView(box, 1200, 800, { margin: 0, insetLeft: 400 });
  // 800px of room to the right of the window, 800px tall: the box fills it at scale 0.8
  assert.ok(Math.abs(view.scale - 0.8) < 1e-12);
  // The box's centre must land at screen x = 400 + 400 = 800. The camera x is the scene point at screen x 600:
  // so the camera sits (800 - 600) / 0.8 = 250 scene px to the box centre's left.
  assert.ok(Math.abs(view.x - (500 - 250)) < 1e-9, `x ${view.x}`);
  assert.equal(view.y, 500);
  // a silly inset cannot push the box off the screen: it is capped at 70% of the width
  const capped = fitView(box, 1000, 1000, { margin: 0, insetLeft: 5000 });
  assert.ok(capped.scale > 0 && Number.isFinite(capped.x));
});
