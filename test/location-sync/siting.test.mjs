// tools/location-sync/siting.mjs -- applying a "site" record: placing a scene, an option or a travel point at a
// location (design/location-editor.md §12). Runs against a scratch copy of the data layout, never the real files.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { applyRecord, existingLocationIds } from "../../tools/location-sync/merge.mjs";
import { applySiteRecord } from "../../tools/location-sync/siting.mjs";
import { destinationTarget, positionTarget, sceneTarget, THEN } from "../../module/blank-inheritance/scripts/core/siting.mjs";

const json = (doc, eol = "\n") => `${JSON.stringify(doc, null, 2)}\n`.replace(/\n/g, eol);

function sceneSet() {
  return {
    id: "scene-set",
    scenes: [
      { id: "e1-road", name: "The Road", art: "x", group: "g", kind: "beat", order: 1, briefRef: "brief-road", locationRef: "gate", locationNote: "Because.", approximate: true },
      { id: "e1-rest", name: "The Night", art: "x", group: "g", kind: "beat", order: 2, briefRef: "brief-night", locationRef: null }
    ]
  };
}

function brief(id) {
  return {
    id,
    outro: {
      position: { locationRef: null, state: "together" },
      departure: { kind: "free", destinations: [{ id: "bath", label: "Bath", placeRef: "bath", briefRef: "rest" }], then: { kind: "muster", placeRef: "gate", briefRef: "x" } }
    }
  };
}

/** A scratch repo: data/ always, canon/scenes/ for the briefs named in `canonBriefs`. */
function scratch({ canonBriefs = [] } = {}) {
  const root = mkdtempSync(path.join(os.tmpdir(), "bi-siting-"));
  const data = path.join(root, "data");
  mkdirSync(path.join(data, "locations"), { recursive: true });
  mkdirSync(path.join(data, "campaign"), { recursive: true });
  mkdirSync(path.join(data, "scene-briefs"), { recursive: true });
  for (const id of ["gate", "hall", "bath"]) writeFileSync(path.join(data, "locations", `${id}.json`), json({ id, name: `The ${id}`, tier: "site" }));
  writeFileSync(path.join(data, "campaign", "scene-set.json"), json(sceneSet()));
  for (const id of ["brief-road", "brief-night"]) writeFileSync(path.join(data, "scene-briefs", `${id}.json`), json(brief(id)));
  if (canonBriefs.length) {
    mkdirSync(path.join(root, "canon", "scenes"), { recursive: true });
    for (const id of canonBriefs) writeFileSync(path.join(root, "canon", "scenes", `${id}.json`), json(brief(id)));
  }
  return { root, data, ids: () => existingLocationIds(data) };
}

const read = (file) => JSON.parse(readFileSync(file, "utf8"));
const record = (over) => ({ id: "2026-10-01T120000000Z-abc123", at: "2026-10-01T12:00:00.000Z", op: "site", tier: null, locationId: "hall", viaRecord: null, beforeVia: null, note: null, before: null, ...over });

test("placing a scene writes scene-set.json: the place, 'approximate' cleared, the old reasoning replaced", () => {
  const s = scratch();
  try {
    const result = applyRecord(record({ target: sceneTarget("e1-road"), before: "gate" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(result.state, "merged");
    assert.equal(result.locationId, "hall");
    assert.deepEqual(result.files, ["data/campaign/scene-set.json"]);
    const entry = read(path.join(s.data, "campaign", "scene-set.json")).scenes[0];
    assert.equal(entry.locationRef, "hall");
    assert.equal("approximate" in entry, false);
    assert.match(entry.locationNote, /The hall \(hall\)/);
    assert.match(entry.locationNote, /2026-10-01/);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("the file is rewritten the way the repo stores it, and only the placed scene changed", () => {
  const s = scratch();
  try {
    const before = read(path.join(s.data, "campaign", "scene-set.json"));
    applyRecord(record({ target: sceneTarget("e1-rest") }), { dataRoot: s.data, existingIds: s.ids() });
    const text = readFileSync(path.join(s.data, "campaign", "scene-set.json"), "utf8");
    const after = JSON.parse(text);
    assert.equal(text, json(after), "two-space JSON and a final newline, like every other data file");
    assert.deepEqual(after.scenes[0], before.scenes[0], "the other scene is untouched");
    assert.equal(after.scenes[1].locationRef, "hall");
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("a file with Windows line endings keeps them", () => {
  const s = scratch();
  try {
    const file = path.join(s.data, "campaign", "scene-set.json");
    writeFileSync(file, json(sceneSet(), "\r\n"));
    applyRecord(record({ target: sceneTarget("e1-rest") }), { dataRoot: s.data, existingIds: s.ids() });
    const text = readFileSync(file, "utf8");
    assert.ok(text.includes("\r\n") && !/[^\r]\n/.test(text));
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("placing an option or a travel point changes the scene brief", () => {
  const s = scratch();
  try {
    const a = applyRecord(record({ target: destinationTarget("brief-night", "bath"), before: "bath" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.deepEqual(a.files, ["data/scene-briefs/brief-night.json"]);
    assert.deepEqual(a.canonChanged, []);
    assert.equal(read(path.join(s.data, "scene-briefs", "brief-night.json")).outro.departure.destinations[0].placeRef, "hall");
    applyRecord(record({ id: "2026-10-01T120000001Z-abc124", target: destinationTarget("brief-night", THEN), before: "gate" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(read(path.join(s.data, "scene-briefs", "brief-night.json")).outro.departure.then.placeRef, "hall");
    applyRecord(record({ id: "2026-10-01T120000002Z-abc125", target: positionTarget("brief-road", "outro") }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(read(path.join(s.data, "scene-briefs", "brief-road.json")).outro.position.locationRef, "hall");
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("a brief that has a canon copy is changed THERE, and its data copy is rewritten to match; the pull says which scene changed", () => {
  const s = scratch({ canonBriefs: ["brief-night"] });
  try {
    const result = applyRecord(record({ target: destinationTarget("brief-night", "bath"), before: "bath" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.deepEqual(result.canonChanged, ["brief-night"]);
    const canon = readFileSync(path.join(s.root, "canon", "scenes", "brief-night.json"), "utf8");
    const live = readFileSync(path.join(s.data, "scene-briefs", "brief-night.json"), "utf8");
    assert.equal(canon, live, "story check fails if the two differ");
    assert.equal(JSON.parse(canon).outro.departure.destinations[0].placeRef, "hall");
    const other = readFileSync(path.join(s.data, "scene-briefs", "brief-road.json"), "utf8");
    assert.equal(other, json(brief("brief-road")), "a brief with no canon copy and no record is untouched");
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("a record at a location drawn in the same session resolves through the ledger", () => {
  const s = scratch();
  try {
    writeFileSync(path.join(s.data, "locations", "the-new-shed.json"), json({ id: "the-new-shed", name: "The New Shed", tier: "site" }));
    const ledger = { entries: { "create-1": { state: "merged", locationId: "the-new-shed" } } };
    const result = applyRecord(record({ target: sceneTarget("e1-rest"), locationId: null, viaRecord: "create-1" }), { dataRoot: s.data, existingIds: s.ids(), ledger });
    assert.equal(result.state, "merged");
    assert.equal(read(path.join(s.data, "campaign", "scene-set.json")).scenes[1].locationRef, "the-new-shed");
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("a record at a drawing that never reached the repo is an error, and writes nothing", () => {
  const s = scratch();
  try {
    const before = readFileSync(path.join(s.data, "campaign", "scene-set.json"), "utf8");
    for (const ledger of [{ entries: {} }, { entries: { "create-1": { state: "error", error: "x" } } }]) {
      const result = applyRecord(record({ target: sceneTarget("e1-rest"), locationId: null, viaRecord: "create-1" }), { dataRoot: s.data, existingIds: s.ids(), ledger });
      assert.equal(result.state, "error");
      assert.match(result.error, /never merged/);
    }
    assert.equal(readFileSync(path.join(s.data, "campaign", "scene-set.json"), "utf8"), before);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("a place that is not a location file is refused", () => {
  const s = scratch();
  try {
    const result = applySiteRecord(record({ target: sceneTarget("e1-rest"), locationId: "no-such-place" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(result.state, "error");
    assert.match(result.error, /no location file/);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("if the repo moved the slot since the editor looked, nothing is written over it (a clash)", () => {
  const s = scratch();
  try {
    const file = path.join(s.data, "campaign", "scene-set.json");
    const before = readFileSync(file, "utf8");
    const result = applyRecord(record({ target: sceneTarget("e1-road"), before: "bath" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(result.state, "clash");
    assert.match(result.clashes[0], /scene:e1-road is now gate, the editor saw bath/);
    assert.equal(readFileSync(file, "utf8"), before);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("a second change to the same slot before a pull chains: it expects what the first one wrote", () => {
  const s = scratch();
  try {
    const ids = s.ids();
    const first = applyRecord(record({ target: sceneTarget("e1-rest"), locationId: "hall", before: null }), { dataRoot: s.data, existingIds: ids });
    const second = applyRecord(record({ id: "2026-10-01T120000009Z-zzz999", target: sceneTarget("e1-rest"), locationId: "bath", before: "hall" }), { dataRoot: s.data, existingIds: ids });
    assert.equal(first.state, "merged");
    assert.equal(second.state, "merged");
    assert.equal(read(path.join(s.data, "campaign", "scene-set.json")).scenes[1].locationRef, "bath");
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("the editor having seen a not-yet-pulled drawing is matched by the record that drew it", () => {
  const s = scratch();
  try {
    writeFileSync(path.join(s.data, "locations", "the-new-shed.json"), json({ id: "the-new-shed", name: "The New Shed", tier: "site" }));
    const ledger = { entries: { "create-1": { state: "merged", locationId: "the-new-shed" } } };
    const file = path.join(s.data, "campaign", "scene-set.json");
    const doc = read(file); doc.scenes[1].locationRef = "the-new-shed"; writeFileSync(file, json(doc));
    const result = applyRecord(record({ target: sceneTarget("e1-rest"), locationId: "bath", before: null, beforeVia: "create-1" }), { dataRoot: s.data, existingIds: s.ids(), ledger });
    assert.equal(result.state, "merged");
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("placing something where it already is writes nothing and says so; emptying a slot works", () => {
  const s = scratch();
  try {
    const file = path.join(s.data, "campaign", "scene-set.json");
    const before = readFileSync(file, "utf8");
    const same = applyRecord(record({ target: sceneTarget("e1-road"), locationId: "gate", before: "gate" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.deepEqual([same.state, same.noChange, same.files], ["merged", true, []]);
    assert.equal(readFileSync(file, "utf8"), before);
    const clear = applyRecord(record({ id: "2026-10-01T120000003Z-clr000", target: sceneTarget("e1-road"), locationId: null, before: "gate" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(clear.state, "merged");
    assert.equal(read(file).scenes[0].locationRef, null);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("a slot that is no longer in the file is an error, never invented", () => {
  const s = scratch();
  try {
    const result = applyRecord(record({ target: positionTarget("brief-road", "intro") }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(result.state, "error");
    assert.match(result.error, /no such slot/);
    assert.equal(existsSync(path.join(s.root, "canon")), false);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("a brief that exists nowhere is an error", () => {
  const s = scratch();
  try {
    const result = applyRecord(record({ target: destinationTarget("ghost-brief", "x") }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(result.state, "error");
    assert.match(result.error, /no scene brief ghost-brief/);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});

test("marking a scene off the map writes offMap and clears the place; it is a change even though the place was already empty", () => {
  const s = scratch();
  try {
    const result = applyRecord(record({ target: sceneTarget("e1-rest"), locationId: null, offMap: "remote" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(result.state, "merged");
    assert.equal(result.noChange, undefined);
    const entry = read(path.join(s.data, "campaign", "scene-set.json")).scenes[1];
    assert.deepEqual(entry.offMap, { reason: "remote" });
    assert.equal(entry.locationRef, null);
    const again = applyRecord(record({ id: "2026-10-01T120000007Z-again1", target: sceneTarget("e1-rest"), locationId: null, offMap: "remote" }), { dataRoot: s.data, existingIds: s.ids() });
    assert.equal(again.noChange, true);
  } finally { rmSync(s.root, { recursive: true, force: true }); }
});
