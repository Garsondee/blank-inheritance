// Tier 1 — pure logic for the Director's panel (core/director-panel.mjs).
// Milliseconds, no Foundry, no network.

import { test } from "node:test";
import assert from "node:assert/strict";

import { TRANSITION_TYPES, transitionOptions, sceneRows, DEFAULT_TRANSITION_DURATION_MS } from "../module/blank-inheritance/scripts/core/director-panel.mjs";

test("TRANSITION_TYPES has exactly the 13 real TextureTransitionFilter types, each with a distinct id and a real localisation key", () => {
  assert.equal(TRANSITION_TYPES.length, 13);
  const ids = TRANSITION_TYPES.map((t) => t.id);
  assert.equal(new Set(ids).size, 13, "every transition id must be unique");
  for (const t of TRANSITION_TYPES) {
    assert.match(t.labelKey, /^BLANKINHERITANCE\.Director\.Transition\./);
  }
  // Spot-check a few real values rather than the whole list, so this test
  // doesn't just restate the source file verbatim.
  assert.ok(ids.includes("fade"));
  assert.ok(ids.includes("glitch"));
  assert.ok(ids.includes("holeSwirl"), "camelCase id must be preserved exactly -- Foundry's own shader keys off this string");
});

test("transitionOptions: no type means no override (undefined, not an empty object)", () => {
  assert.equal(transitionOptions(null), undefined);
  assert.equal(transitionOptions(""), undefined);
  assert.equal(transitionOptions(undefined), undefined);
});

test("transitionOptions: a chosen type produces the real {type, duration} shape SceneViewOptions expects", () => {
  assert.deepEqual(transitionOptions("fade"), { type: "fade", duration: DEFAULT_TRANSITION_DURATION_MS });
  assert.deepEqual(transitionOptions("glitch", 2500), { type: "glitch", duration: 2500 });
});

test("sceneRows: shapes real Scene-like objects, degrading a missing thumbnail to null rather than a fabricated URL", () => {
  const scenes = [
    { id: "s1", name: "The Road In", thumb: "path/to/thumb.webp", active: true },
    { id: "s2", name: "Intake Medicals", thumb: null, active: false }
  ];
  const rows = sceneRows(scenes);
  assert.deepEqual(rows, [
    { id: "s1", name: "The Road In", thumbUrl: "path/to/thumb.webp", active: true },
    { id: "s2", name: "Intake Medicals", thumbUrl: null, active: false }
  ]);
});

test("sceneRows: a nameless scene falls back to its id, active is always a real boolean", () => {
  const rows = sceneRows([{ id: "s3", active: undefined }]);
  assert.equal(rows[0].name, "s3");
  assert.equal(rows[0].active, false);
});

test("sceneRows: empty input is safe", () => {
  assert.deepEqual(sceneRows([]), []);
  assert.deepEqual(sceneRows(), []);
});
