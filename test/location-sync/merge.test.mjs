// tools/location-sync's repo-side merge logic (design/location-editor.md §5).
// Covers the pure JS paths (id minting, metadata clash detection against a
// real scratch data/locations/ directory) -- the geometry paths (op "create",
// "geometry" and "split") call out to apply_geometry.py and are covered live,
// per design/location-editor.md §9, since they need the real campaign-map
// manifest and frame. apply_geometry.py's own _apply_split is covered
// directly, and thoroughly, in test/location-sync/test_apply_geometry.py --
// what's left to cover here is this file's OWN orchestration (mint an id,
// refuse before ever reaching Python), the same split the "geometry" tests
// below already draw.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { applyRecord, existingLocationIds, mintLocationId, mintSplitLocationId, slugify } from "../../tools/location-sync/merge.mjs";
import { emptyFields, fieldsFromLocationDoc } from "../../module/blank-inheritance/scripts/core/location-editor.mjs";

function scratch() {
  const root = mkdtempSync(path.join(os.tmpdir(), "bi-location-sync-"));
  mkdirSync(path.join(root, "locations"), { recursive: true });
  return root;
}

function writeLocation(root, id, overrides = {}) {
  const doc = {
    $schema: "../schema/location.schema.json", id, type: "location", tier: "site",
    name: "Old Name", nameJa: null, namingPlaceholderRef: null, kind: "civic", tags: [],
    classification: null, rank: null, depth: "named",
    geometry: { rings: [[[135.2, 34.6], [135.21, 34.6], [135.21, 34.61]]], point: null },
    pinAnchor: null,
    derived: {
      imagePx: null, centroidPx: [0, 0], cells: [], ref: null, areaM2: null,
      withinRegionRef: null, containsRefs: [], neighbourRefs: [],
      sourceSession: null, sourceLocalId: null, promotedDate: null
    },
    authoring: { note: "a test place", status: "drafted" },
    lore: { summary: "old summary", playerFacing: "", gmOnly: "" },
    scene: { hooks: [], activities: [] },
    realWorld: {},
    factionRefs: [], npcRefs: [], episodeRefs: [], openQuestionRefs: [],
    bibleRef: null, assetRefs: [], playlistRefs: [],
    ...overrides
  };
  writeFileSync(path.join(root, "locations", `${id}.json`), JSON.stringify(doc, null, 2) + "\n");
  return doc;
}

test("slugify matches the kebab-case convention every existing data/locations/*.json id already uses", () => {
  assert.equal(slugify("The Drill Hall"), "the-drill-hall");
  assert.equal(slugify("Central Fortification!"), "central-fortification");
  assert.equal(slugify("  leading and trailing  "), "leading-and-trailing");
});

test("mintLocationId prefers the name, falls back to the note, falls back to the draft id -- and never collides", () => {
  const existing = new Set(["the-drill-hall"]);
  assert.equal(mintLocationId({ fields: { name: "The Drill Hall" }, draftId: "draft-1", id: "r1" }, existing), "the-drill-hall-2");
  assert.equal(mintLocationId({ fields: { note: "a small tea house" }, draftId: "draft-2", id: "r2" }, new Set()), "a-small-tea-house");
  assert.equal(mintLocationId({ fields: {}, draftId: "draft-9", id: "r3" }, new Set()), "location-draft-9");
});

test("applyRecord('update'): a clean save writes only the panel fields, leaving geometry/derived/authoring.status untouched", () => {
  const root = scratch();
  try {
    const original = writeLocation(root, "test-place");
    const before = fieldsFromLocationDoc(original);
    const record = { id: "rec-1", op: "update", locationId: "test-place", tier: "site", before, fields: { ...before, name: "New Name" } };
    const result = applyRecord(record, { dataRoot: root, existingIds: existingLocationIds(root) });
    assert.deepEqual(result, { state: "merged", locationId: "test-place" });
    const after = JSON.parse(readFileSync(path.join(root, "locations", "test-place.json"), "utf8"));
    assert.equal(after.name, "New Name");
    assert.equal(after.authoring.status, "drafted", "an update record must never touch authoring.status -- that's the Desk's field");
    assert.deepEqual(after.geometry, original.geometry);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyRecord('update'): a genuine clash writes nothing for the clashing field, but still applies a different field cleanly in the same record", () => {
  const root = scratch();
  try {
    const original = writeLocation(root, "test-place");
    const before = fieldsFromLocationDoc(original); // what the panel actually loaded
    // Simulate Claude having renamed it after the panel loaded, before the save arrived.
    const current = JSON.parse(readFileSync(path.join(root, "locations", "test-place.json"), "utf8"));
    current.name = "Claude's Rename";
    writeFileSync(path.join(root, "locations", "test-place.json"), JSON.stringify(current, null, 2) + "\n");

    const record = { id: "rec-2", op: "update", locationId: "test-place", tier: "site", before, fields: { ...before, name: "Ingram's Rename", kind: "military" } };
    const result = applyRecord(record, { dataRoot: root, existingIds: existingLocationIds(root) });
    assert.equal(result.state, "clash");
    assert.deepEqual(result.clashes, ["name"]);
    const after = JSON.parse(readFileSync(path.join(root, "locations", "test-place.json"), "utf8"));
    assert.equal(after.name, "Claude's Rename", "a clashing field is never overwritten by a machine");
    assert.equal(after.kind, "military", "a field in the SAME record that does not clash still applies");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyRecord('update') against a location that doesn't exist reports an error rather than creating a stray file", () => {
  const root = scratch();
  try {
    const record = { id: "rec-3", op: "update", locationId: "nonexistent", tier: "site", before: emptyFields(), fields: emptyFields() };
    const result = applyRecord(record, { dataRoot: root, existingIds: existingLocationIds(root) });
    assert.equal(result.state, "error");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyRecord('geometry') against a non-region tier is refused before ever shelling out to Python", () => {
  const root = scratch();
  try {
    writeLocation(root, "test-place"); // tier: "site"
    const record = { id: "rec-4", op: "geometry", locationId: "test-place", tier: "site", geometry: { rings: [[[0, 0], [1, 0], [1, 1]]], point: null } };
    const result = applyRecord(record, { dataRoot: root, existingIds: existingLocationIds(root) });
    assert.equal(result.state, "error");
    assert.match(result.error, /region/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("mintSplitLocationId keys off the target's own id, never a name -- a fresh split has none yet -- and never collides", () => {
  assert.equal(mintSplitLocationId("the-district", new Set()), "the-district-2");
  assert.equal(mintSplitLocationId("the-district", new Set(["the-district-2"])), "the-district-3");
  assert.equal(mintSplitLocationId("the-district", new Set(["the-district-2", "the-district-3"])), "the-district-4");
});

test("applyRecord('split') against a non-region tier is refused before ever shelling out to Python", () => {
  const root = scratch();
  try {
    writeLocation(root, "test-place"); // tier: "site"
    const record = { id: "rec-5", op: "split", locationId: "test-place", tier: "site", geometry: { cutPointsImagePx: [[0, 0], [1, 1]] } };
    const result = applyRecord(record, { dataRoot: root, existingIds: existingLocationIds(root) });
    assert.equal(result.state, "error");
    assert.match(result.error, /region/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("applyRecord('split') against a location that doesn't exist reports an error rather than shelling out to Python", () => {
  const root = scratch();
  try {
    const record = { id: "rec-6", op: "split", locationId: "nonexistent", tier: "region", geometry: { cutPointsImagePx: [[0, 0], [1, 1]] } };
    const result = applyRecord(record, { dataRoot: root, existingIds: existingLocationIds(root) });
    assert.equal(result.state, "error");
    assert.match(result.error, /no such location file/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
