// Tier 1 — the Location Editor's rules (module/blank-inheritance/scripts/core/location-editor.mjs).
// design/location-editor.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { check as checkDepthModule } from "../module/blank-inheritance/scripts/core/depth.mjs";
import { check as checkDepthTools } from "../tools/location-sync/core/depth.mjs";
import { metrics as shapeMetricsModule } from "../module/blank-inheritance/scripts/core/shape.mjs";
import { metrics as shapeMetricsTools } from "../tools/location-sync/core/shape.mjs";
import {
  addDraftItem,
  applyCleanPaths,
  applyFieldsToDoc,
  cutBoundaryMeetings,
  emptyFields,
  emptySession,
  fieldClashes,
  fieldsFromLocationDoc,
  geometryForRecord,
  isValidSession,
  itemAnchorPoint,
  itemsInPolygon,
  itemsInRect,
  linkItemToLocation,
  makeRecord,
  MODE_TIERS,
  modeForTier,
  pointInRing,
  recordFilename,
  recordIdFromFilename,
  removeItem,
  ringCentroid,
  sessionItemList,
  sortRecords,
  updateItemFields,
  updateItemGeometry,
  validateRecord
} from "../module/blank-inheritance/scripts/core/location-editor.mjs";

/* ------------------------------------------------------------------ */
/*  Modes                                                               */
/* ------------------------------------------------------------------ */

test("modeForTier maps every tier to exactly the mode design doc §2 assigns it", () => {
  assert.equal(modeForTier("region"), "areas");
  assert.equal(modeForTier("site"), "places");
  assert.equal(modeForTier("point"), "places");
  assert.equal(modeForTier("nonsense"), null);
  assert.deepEqual([...MODE_TIERS.areas], ["region"]);
  assert.deepEqual([...MODE_TIERS.places], ["site", "point"]);
});

/* ------------------------------------------------------------------ */
/*  Panel fields                                                       */
/* ------------------------------------------------------------------ */

test("fieldsFromLocationDoc round-trips through applyFieldsToDoc without touching untouched keys", () => {
  const doc = {
    id: "the-drill-hall", type: "location", tier: "site",
    name: "The Drill Hall", nameJa: null, kind: "civic", tags: ["pc-adoptable"],
    rank: 3, classification: null, depth: "sketch",
    geometry: { rings: [[[1, 2], [3, 4], [5, 6]]], point: null },
    derived: { centroidPx: [3, 4] },
    authoring: { status: "drafted", note: "a drill hall" },
    lore: { summary: "A hall.", playerFacing: "", gmOnly: "" },
    scene: { hooks: ["assembly"], activities: [] },
    npcRefs: ["nobu"], factionRefs: [], realWorld: { character: "industrial" }
  };
  const fields = fieldsFromLocationDoc(doc);
  assert.equal(fields.name, "The Drill Hall");
  assert.equal(fields.rank, 3);
  assert.deepEqual(fields.tags, ["pc-adoptable"]);
  assert.equal(fields.note, "a drill hall");

  const next = applyFieldsToDoc(doc, fields);
  assert.deepEqual(next.geometry, doc.geometry, "geometry is not a panel field and must pass through untouched");
  assert.deepEqual(next.derived, doc.derived);
  assert.equal(next.authoring.status, "drafted", "applyFieldsToDoc must never touch authoring.status -- that's the Desk's field");
  assert.deepEqual(next.npcRefs, ["nobu"], "cross-refs are Claude's own field, never a panel field");
  assert.deepEqual(next.realWorld, doc.realWorld);
});

test("fieldsFromLocationDoc is defined even for a doc with nothing filled in yet", () => {
  assert.deepEqual(fieldsFromLocationDoc(null), emptyFields());
  assert.deepEqual(fieldsFromLocationDoc({}), emptyFields());
});

/* ------------------------------------------------------------------ */
/*  Clash detection -- the "update" merge's whole job                  */
/* ------------------------------------------------------------------ */

test("fieldClashes: the repo unchanged since the panel loaded -> every touched field is clean", () => {
  const before = emptyFields();
  const after = { ...before, name: "The Rock", lore: { ...before.lore, summary: "A silo." } };
  const record = { fields: after, before };
  const { clean, clashes } = fieldClashes(before, record);
  assert.deepEqual(clashes, []);
  assert.ok(clean.includes("name"));
  assert.ok(clean.includes("lore.summary"));
  assert.ok(!clean.includes("kind"), "a field this save never touched must not be reported as clean either -- nothing to apply");
});

test("fieldClashes: the repo moved since the panel loaded on a field this save also touched -> a clash", () => {
  const before = emptyFields();
  const panelSave = { ...before, name: "The Rock" };
  const repoNow = { ...before, name: "The Silo" }; // Claude renamed it after the panel loaded, before she saved
  const record = { fields: panelSave, before };
  const { clean, clashes } = fieldClashes(repoNow, record);
  assert.deepEqual(clashes, ["name"]);
  assert.deepEqual(clean, []);
});

test("fieldClashes: the repo moved on a field this save did NOT touch -> not a clash, and not reapplied either", () => {
  const before = emptyFields();
  const panelSave = { ...before, name: "The Rock" }; // only touched `name`
  const repoNow = { ...before, kind: "military" }; // Claude touched a different field meanwhile
  const record = { fields: panelSave, before };
  const { clean, clashes } = fieldClashes(repoNow, record);
  assert.deepEqual(clashes, []);
  assert.deepEqual(clean, ["name"]);
});

test("applyCleanPaths only writes the listed paths, leaving everything else exactly as the repo had it", () => {
  const repoFields = { ...emptyFields(), kind: "military", rank: 2 };
  const record = { fields: { ...emptyFields(), name: "The Rock", kind: "civic" } };
  const applied = applyCleanPaths(repoFields, record, ["name"]);
  assert.equal(applied.name, "The Rock");
  assert.equal(applied.kind, "military", "kind was not in cleanPaths and must be untouched even though the record's own fields object has a different value");
  assert.equal(applied.rank, 2);
});

/* ------------------------------------------------------------------ */
/*  Geometry shaping                                                    */
/* ------------------------------------------------------------------ */

test("ringCentroid: a square's centroid is its middle", () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const c = ringCentroid(square);
  assert.ok(Math.abs(c.x - 5) < 1e-6);
  assert.ok(Math.abs(c.y - 5) < 1e-6);
});

test("ringCentroid falls back to the plain average for a degenerate (near-zero-area) ring instead of throwing", () => {
  const line = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  const c = ringCentroid(line);
  assert.ok(Math.abs(c.x - 1) < 1e-6);
  assert.equal(c.y, 0);
});

test("geometryForRecord: a region/site polygon keeps its rings, shell then holes, GeoJSON order", () => {
  const shell = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  const hole = [{ x: 4, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 6 }, { x: 4, y: 6 }];
  const result = geometryForRecord("region", [{ shell, holes: [hole] }]);
  assert.equal(result.ok, true);
  assert.equal(result.geometry.point, null);
  assert.equal(result.geometry.rings.length, 2, "shell + one hole");
  assert.deepEqual(result.geometry.rings[0][0], [0, 0]);
});

test("geometryForRecord: a point tier reduces its drawn shape to a single centroid, discarding the ring", () => {
  const circleStandingInForAPin = [{ x: 8, y: 0 }, { x: 0, y: 8 }, { x: -8, y: 0 }, { x: 0, y: -8 }];
  const result = geometryForRecord("point", [{ shell: circleStandingInForAPin, holes: [] }]);
  assert.equal(result.ok, true);
  assert.deepEqual(result.geometry.rings, []);
  assert.ok(Math.abs(result.geometry.point[0]) < 1e-6);
  assert.ok(Math.abs(result.geometry.point[1]) < 1e-6);
});

test("geometryForRecord refuses more than one disconnected shell rather than guessing which one was meant", () => {
  const a = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }];
  const b = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }];
  const result = geometryForRecord("site", [{ shell: a, holes: [] }, { shell: b, holes: [] }]);
  assert.equal(result.ok, false);
  assert.match(result.problems[0], /more than one disconnected shape/);
});

test("geometryForRecord refuses an empty draw and a too-small ring, each with a distinct message", () => {
  assert.equal(geometryForRecord("site", []).ok, false);
  const tooFew = geometryForRecord("site", [{ shell: [{ x: 0, y: 0 }, { x: 1, y: 1 }], holes: [] }]);
  assert.equal(tooFew.ok, false);
  assert.match(tooFew.problems[0], /fewer than 3/);
});

/* ------------------------------------------------------------------ */
/*  Marquee/lasso multi-select (design doc §3.2/§8's ported gap)        */
/* ------------------------------------------------------------------ */

function polygonItem(localId, ring) {
  return { localId, tier: "site", geometry: { kind: "polygon", ringPx: ring, holesPx: [] } };
}

function pointItem(localId, point) {
  return { localId, tier: "point", geometry: { kind: "point", pointPx: point } };
}

test("pointInRing: the even-odd rule, inside/outside/on-an-edge-ish", () => {
  const square = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  assert.equal(pointInRing(5, 5, square), true);
  assert.equal(pointInRing(50, 50, square), false);
});

test("itemAnchorPoint: a point-tier item's own point, a polygon's ring centroid", () => {
  const region = polygonItem("draft-1", [[0, 0], [10, 0], [10, 10], [0, 10]]);
  const point = pointItem("draft-2", [3, 4]);
  const a = itemAnchorPoint(region);
  assert.ok(Math.abs(a.x - 5) < 1e-6 && Math.abs(a.y - 5) < 1e-6);
  assert.deepEqual(itemAnchorPoint(point), { x: 3, y: 4 });
});

test("itemsInRect: the Select tool's drag-box picks up items whose anchor falls inside, and only those", () => {
  const inside = polygonItem("draft-1", [[0, 0], [10, 0], [10, 10], [0, 10]]); // centroid (5,5)
  const outside = polygonItem("draft-2", [[100, 100], [110, 100], [110, 110], [100, 110]]); // centroid (105,105)
  const pinInside = pointItem("draft-3", [6, 6]);
  const ids = itemsInRect([inside, outside, pinInside], { x0: 0, y0: 0, x1: 20, y1: 20 });
  assert.deepEqual(ids.sort(), ["draft-1", "draft-3"]);
});

test("itemsInPolygon: the Lasso tool, same anchor-point rule over a freehand ring instead of a rect", () => {
  const inside = polygonItem("draft-1", [[0, 0], [4, 0], [4, 4], [0, 4]]); // centroid (2,2)
  const outside = polygonItem("draft-2", [[100, 100], [104, 100], [104, 104], [100, 104]]);
  const lasso = [{ x: -5, y: -5 }, { x: 20, y: -5 }, { x: 20, y: 20 }, { x: -5, y: 20 }];
  assert.deepEqual(itemsInPolygon([inside, outside], lasso), ["draft-1"]);
});

test("itemsInPolygon refuses to guess for a degenerate (fewer than 3 point) ring", () => {
  assert.deepEqual(itemsInPolygon([polygonItem("draft-1", [[0, 0], [1, 0], [1, 1]])], [{ x: 0, y: 0 }]), []);
});

/* ------------------------------------------------------------------ */
/*  Records                                                             */
/* ------------------------------------------------------------------ */

test("makeRecord + recordFilename + recordIdFromFilename round-trip, and validateRecord accepts the result", () => {
  const record = makeRecord({
    at: "2026-09-29T16:18:22.114Z", rand: "Xq2v9k", by: "Ingram",
    op: "create", tier: "site", locationId: null, draftId: "draft-4",
    geometry: { rings: [[[0, 0], [1, 0], [1, 1]]], point: null },
    fields: { ...emptyFields(), note: "a shed" }
  });
  assert.equal(validateRecord(record).length, 0);
  const filename = recordFilename(record);
  assert.equal(filename, `location-edit-${record.id}.json`);
  assert.equal(recordIdFromFilename(filename), record.id);
});

test("validateRecord: each op's own required-field shape (design doc §4)", () => {
  const base = { at: "2026-09-29T00:00:00.000Z", rand: "abc123", tier: "region" };
  // create: no locationId, needs geometry AND fields
  assert.equal(validateRecord(makeRecord({ ...base, op: "create", geometry: { rings: [], point: null }, fields: emptyFields() })).length, 0);
  assert.ok(validateRecord(makeRecord({ ...base, op: "create", locationId: "x", geometry: { rings: [], point: null }, fields: emptyFields() })).length > 0);
  // geometry: needs locationId AND geometry, fields must be null
  assert.equal(validateRecord(makeRecord({ ...base, op: "geometry", locationId: "the-rock", geometry: { rings: [], point: null } })).length, 0);
  assert.ok(validateRecord(makeRecord({ ...base, op: "geometry", geometry: { rings: [], point: null } })).length > 0, "geometry op with no locationId must be invalid");
  // update: needs locationId AND fields, geometry must be null
  assert.equal(validateRecord(makeRecord({ ...base, op: "update", locationId: "the-rock", fields: emptyFields() })).length, 0);
  assert.ok(validateRecord(makeRecord({ ...base, op: "update", locationId: "the-rock", fields: emptyFields(), geometry: { rings: [], point: null } })).length > 0);
  // split: needs locationId AND geometry, fields must be null -- same shape as geometry, design doc §10 phase 2c
  assert.equal(validateRecord(makeRecord({ ...base, op: "split", locationId: "the-district", geometry: { cutPointsImagePx: [[0, 0], [1, 1]] } })).length, 0);
  assert.ok(validateRecord(makeRecord({ ...base, op: "split", geometry: { cutPointsImagePx: [[0, 0], [1, 1]] } })).length > 0, "split op with no locationId must be invalid");
  assert.ok(validateRecord(makeRecord({ ...base, op: "split", locationId: "the-district", geometry: { cutPointsImagePx: [[0, 0], [1, 1]] }, fields: emptyFields() })).length > 0, "split op must have fields null");
});

test("validateRecord rejects an unknown tier or op rather than accepting it silently", () => {
  assert.throws(() => makeRecord({ at: "x", rand: "y", op: "create", tier: "nonsense", geometry: {}, fields: {} }));
  assert.throws(() => makeRecord({ at: "x", rand: "y", op: "nonsense", tier: "region", geometry: {}, fields: {} }));
});

test("sortRecords orders by `at` then `id`, so two records made in the same millisecond still sort deterministically", () => {
  const a = makeRecord({ at: "2026-09-29T00:00:00.000Z", rand: "aaa", op: "update", tier: "site", locationId: "x", fields: emptyFields() });
  const b = makeRecord({ at: "2026-09-29T00:00:00.000Z", rand: "bbb", op: "update", tier: "site", locationId: "x", fields: emptyFields() });
  const c = makeRecord({ at: "2026-09-28T00:00:00.000Z", rand: "zzz", op: "update", tier: "site", locationId: "x", fields: emptyFields() });
  assert.deepEqual(sortRecords([b, a, c]).map((r) => r.id), [c, a, b].map((r) => r.id));
});

/* ------------------------------------------------------------------ */
/*  The session                                                         */
/* ------------------------------------------------------------------ */

test("emptySession is a valid session, and grows a stable, incrementing localId per item", () => {
  let session = emptySession();
  assert.equal(isValidSession(session), true);
  let item1, item2;
  ({ session, item: item1 } = addDraftItem(session, { tier: "region", geometry: { kind: "polygon", ringPx: [[0, 0], [1, 0], [1, 1]], holesPx: [] } }));
  ({ session, item: item2 } = addDraftItem(session, { tier: "point", geometry: { kind: "point", pointPx: [5, 5] } }));
  assert.equal(item1.localId, "draft-1");
  assert.equal(item2.localId, "draft-2");
  assert.equal(sessionItemList(session).length, 2);
  assert.equal(item1.locked, false);
  assert.equal(item1.locationId, null);
});

test("addDraftItem refuses an unknown tier -- a bug in the draw layer must not silently create an unusable item", () => {
  assert.throws(() => addDraftItem(emptySession(), { tier: "nonsense", geometry: {} }));
});

test("updateItemGeometry / updateItemFields / linkItemToLocation / removeItem each touch only the named item", () => {
  let session = emptySession();
  let item;
  ({ session, item } = addDraftItem(session, { tier: "site", geometry: { kind: "polygon", ringPx: [[0, 0], [1, 0], [1, 1]], holesPx: [] } }));
  const otherGeometry = { kind: "polygon", ringPx: [[2, 2], [3, 2], [3, 3]], holesPx: [] };
  session = updateItemGeometry(session, item.localId, otherGeometry);
  assert.deepEqual(session.items[item.localId].geometry, otherGeometry);

  const fields = { ...emptyFields(), name: "The Shed" };
  session = updateItemFields(session, item.localId, fields);
  assert.equal(session.items[item.localId].name, "The Shed", "the item's own display name follows fields.name");

  session = linkItemToLocation(session, item.localId, "the-shed");
  assert.equal(session.items[item.localId].locationId, "the-shed");
  assert.equal(session.items[item.localId].locked, true);

  session = removeItem(session, item.localId);
  assert.equal(sessionItemList(session).length, 0);

  // Operating on a localId that doesn't exist is a no-op, not a throw --
  // the panel can race a delete against a stale selection callback.
  const unchanged = updateItemFields(session, "draft-999", emptyFields());
  assert.deepEqual(unchanged, session);
});

test("isValidSession rejects garbage rather than letting a corrupt autosave silently wipe a real session", () => {
  assert.equal(isValidSession(null), false);
  assert.equal(isValidSession({}), false);
  assert.equal(isValidSession({ kind: "location-draw-session", version: 1, items: {}, nextLocalId: 1 }), true);
  assert.equal(isValidSession({ kind: "location-draw-session", version: 99, items: {}, nextLocalId: 1 }), false);
});

/* ------------------------------------------------------------------ */
/*  depth.mjs/shape.mjs's deployed twin (design doc §8/§10) -- the module   */
/*  cannot import from tools/, so it keeps a second, byte-identical copy.   */
/*  Both files' own header comments say so; this is what makes it true.    */
/* ------------------------------------------------------------------ */

function readRepoFile(relativePath) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

test("depth.mjs is byte-identical between tools/location-sync/core/ and the deployed module copy", () => {
  assert.equal(
    readRepoFile("module/blank-inheritance/scripts/core/depth.mjs"),
    readRepoFile("tools/location-sync/core/depth.mjs")
  );
});

test("shape.mjs is byte-identical between tools/location-sync/core/ and the deployed module copy", () => {
  assert.equal(
    readRepoFile("module/blank-inheritance/scripts/core/shape.mjs"),
    readRepoFile("tools/location-sync/core/shape.mjs")
  );
});

test("the module's own depth.mjs import actually resolves and behaves (not just text-identical)", () => {
  const doc = { name: "The Shed", kind: "storage", depth: "named", lore: { summary: "A shed." } };
  assert.deepEqual(checkDepthModule(doc), checkDepthTools(doc));
  assert.equal(checkDepthModule(doc).ok, true);
});

test("the module's own shape.mjs import actually resolves and behaves (not just text-identical)", () => {
  const ring = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.deepEqual(
    shapeMetricsModule(ring, { metresPerPx: 1 }),
    shapeMetricsTools(ring, { metresPerPx: 1 })
  );
});

test("cutBoundaryMeetings: a line straight through a square meets its border twice; one that misses or stops inside does not", () => {
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
  assert.equal(cutBoundaryMeetings(square, [[50, -20], [50, 120]]), 2);
  assert.equal(cutBoundaryMeetings(square, [[200, 200], [300, 300]]), 0);
  assert.equal(cutBoundaryMeetings(square, [[50, -20], [50, 50]]), 1, "starts outside, stops inside");
  assert.equal(cutBoundaryMeetings(square, [[20, 20], [80, 80]]), 0, "entirely inside never reaches the border");
});

test("cutBoundaryMeetings: ends resting on the border count (bisect_region snaps them), and a cut through a corner counts once", () => {
  const square = [[0, 0], [100, 0], [100, 100], [0, 100]];
  assert.equal(cutBoundaryMeetings(square, [[50, 1], [50, 99]]), 2);
  assert.equal(cutBoundaryMeetings(square, [[-10, -10], [50, 50]]), 1);
});
