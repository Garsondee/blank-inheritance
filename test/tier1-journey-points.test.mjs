// Tier 1 -- where a token stands for a place that is only a drawing so far (core/journey-points.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultPinName, pointForCreateRecord, pointsForPendingCreates, quickPinFields } from "../module/blank-inheritance/scripts/core/journey-points.mjs";
import { emptyFields, makeRecord, validateRecord } from "../module/blank-inheritance/scripts/core/location-editor.mjs";

test("a pin stands at its own point; a building at the middle of its outline", () => {
  assert.deepEqual(pointForCreateRecord({ geometry: { rings: [], point: [120.5, 300] } }), { x: 120.5, y: 300 });
  const square = [[0, 0], [100, 0], [100, 60], [0, 60]];
  assert.deepEqual(pointForCreateRecord({ geometry: { rings: [square], point: null } }), { x: 50, y: 30 });
  const l = [[0, 0], [100, 0], [100, 20], [20, 20], [20, 100], [0, 100]];
  const c = pointForCreateRecord({ geometry: { rings: [l], point: null } });
  assert.ok(c.x > 20 && c.x < 40 && c.y > 20 && c.y < 40, "the area-weighted middle of an L sits in its elbow, not at the middle of its box");
});

test("a record with nothing usable has no point, and nothing here throws on rubbish", () => {
  for (const bad of [null, undefined, {}, { geometry: null }, { geometry: { rings: [], point: null } }, { geometry: { point: [NaN, 3] } }, { geometry: { point: [1] } }, { geometry: { rings: [[[0, 0], [1, 1]]] } }]) {
    assert.equal(pointForCreateRecord(bad), null, JSON.stringify(bad));
  }
});

test("the pending places of a session are a map from the record that drew each, skipping any with no point", () => {
  const points = pointsForPendingCreates([
    { id: "r1", geometry: { rings: [], point: [10, 20] } },
    { id: "r2", geometry: null },
    { id: "r3", geometry: { rings: [[[0, 0], [10, 0], [10, 10], [0, 10]]], point: null } },
    { geometry: { point: [1, 1] } }
  ]);
  assert.deepEqual(points, { r1: { x: 10, y: 20 }, r3: { x: 5, y: 5 } });
  assert.deepEqual(pointsForPendingCreates(undefined), {});
});

test("a quick pin's fields give it a name, a kind and the note the pull insists on, and keep the rest of the blank form", () => {
  const fields = quickPinFields({ name: "  Gate queue  ", note: "", scene: "The Road In", base: emptyFields() });
  assert.equal(fields.name, "Gate queue");
  assert.equal(fields.kind, "meeting point");
  assert.equal(fields.depth, "named");
  assert.match(fields.note, /pin dropped in the Location Editor for The Road In/);
  assert.deepEqual(fields.lore, emptyFields().lore);
  assert.equal(quickPinFields({ name: "", note: "Because the tokens must queue.", base: emptyFields() }).note, "Because the tokens must queue.");
  assert.equal(quickPinFields({ name: "   ", base: emptyFields() }).name, null, "no name is no name: the panel supplies the default");
  assert.match(quickPinFields({ name: "x", base: emptyFields() }).note, /^A pin dropped in the Location Editor, where/);
});

test("a quick pin makes a record the pull accepts: a create for a point with the geometry in image pixels and fields with a note", () => {
  const record = makeRecord({
    at: "2026-10-06T10:00:00.000Z", rand: "abc123", by: "GM", op: "create", tier: "point", locationId: null, draftId: "quick-pin-1",
    geometry: { rings: [], point: [4210, 3377] }, fields: quickPinFields({ name: "Gate queue", base: emptyFields() }), before: null
  });
  assert.deepEqual(validateRecord(record), []);
  assert.deepEqual(pointForCreateRecord(record), { x: 4210, y: 3377 }, "and the editor can stand a token on it at once");
});

test("the name a pin gets when none is typed reads as a place for the scene it is for", () => {
  assert.equal(defaultPinName("The Road In", "Happens at"), "The Road In (meeting point)");
  assert.equal(defaultPinName("The Yard", "The roof"), "The Yard: the roof (meeting point)");
  assert.equal(defaultPinName("", "Happens at"), "Meeting point");
  assert.equal(defaultPinName(undefined, undefined), "Meeting point");
  assert.equal(defaultPinName("Kit Issue", ""), "Kit Issue (meeting point)");
});
