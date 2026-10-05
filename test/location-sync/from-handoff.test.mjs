// tools/location-sync/from-handoff.mjs: one shape from a Location Editor hand-off becomes a real, drafted data/locations/<id>.json through the
// apply_geometry.py bridge, and can site a scene at it. Run against a scratch data root (never the repo's own), with a REAL building of the
// map for the outline. The Python half needs shapely and pyproj; without them the build cases are skipped loudly, the argument cases still run.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildHandoff, serialiseHandoff } from "../../module/blank-inheritance/scripts/core/location-handoff.mjs";
import { decodeIndex } from "../../module/blank-inheritance/scripts/core/buildings-index.mjs";
import { emptyFields } from "../../module/blank-inheritance/scripts/core/location-editor.mjs";
import { sceneTarget } from "../../module/blank-inheritance/scripts/core/siting.mjs";
import { fieldsFor, fromHandoff } from "../../tools/location-sync/from-handoff.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const python = process.env.BI_PYTHON || (process.platform === "win32" ? "python" : "python3");
let haveBridge = true;
try { execFileSync(python, ["-c", "import shapely, pyproj, numpy"], { stdio: "ignore" }); } catch { haveBridge = false; }
const haveBuildings = existsSync(path.join(repo, "data", "map", "buildings-index.json"));
const skipBuild = (!haveBridge && "shapely, pyproj and numpy are needed (python -m pip install shapely pyproj numpy)") || (!haveBuildings && "data/map/buildings-index.json has not been exported");

/** A real, named-or-big building from the index, as the editor would hand it over (image px used as scene px: the calibration is not needed here). */
function realHandoff(fields = null) {
  const index = decodeIndex(JSON.parse(readFileSync(path.join(repo, "data", "map", "buildings-index.json"), "utf8")));
  const b = index.buildings.filter((x) => x.area > 150 && x.area < 600 && x.ring.length >= 4).sort((a, c) => a.id.localeCompare(c.id))[0];
  const item = { localId: "draft-9", tier: "site", locationId: null, geometry: { kind: "polygon", ringPx: b.ring, holesPx: [] }, source: { buildingId: b.id, kind: b.kind, areaM2: b.area } };
  return { b, text: serialiseHandoff(buildHandoff({ at: "2026-10-05T00:00:00Z", scene: { id: "s", name: "01. The City" }, items: [{ item, fields }], toImage: (p) => p, published: [], metresPerPixel: 0.5 })) };
}

function scratch() {
  const root = mkdtempSync(path.join(os.tmpdir(), "bi-handoff-"));
  mkdirSync(path.join(root, "locations"), { recursive: true });
  mkdirSync(path.join(root, "campaign"), { recursive: true });
  writeFileSync(path.join(root, "campaign", "scene-set.json"), JSON.stringify({ scenes: [{ id: "haunt-the-paper-lantern", name: "The Paper Lantern", kind: "place" }] }, null, 2) + "\n");
  return root;
}

test("the form's fields are the editor's, with the command line laid over them, and a lore line goes into lore", () => {
  const item = { name: "Draft name", fields: { ...emptyFields(), name: "From the form", kind: "bar", note: "form note", lore: { summary: "s", playerFacing: "p", gmOnly: "g" } } };
  const f = fieldsFor(item, { name: "The Paper Lantern", tags: ["izakaya"], summary: "new summary" });
  assert.equal(f.name, "The Paper Lantern");
  assert.equal(f.kind, "bar", "what the editor had stays");
  assert.deepEqual(f.tags, ["izakaya"]);
  assert.deepEqual(f.lore, { summary: "new summary", playerFacing: "p", gmOnly: "g" });
  assert.equal(fieldsFor({ name: "Only the draft", fields: null }).name, "Only the draft");
});

test("bad input is refused before anything is written: not a hand-off, a saved item, a bad or taken id, no name", () => {
  const root = scratch();
  try {
    assert.match(fromHandoff({ text: "nope", id: "x-y", dataRoot: root }).error, /not JSON/);
    const base = buildHandoff({ at: "t", items: [{ item: { localId: "d", tier: "site", geometry: { kind: "polygon", ringPx: [[0, 0], [10, 0], [10, 10]] } }, fields: null }], toImage: (p) => p, published: [] });
    const text = serialiseHandoff(base);
    assert.match(fromHandoff({ text, id: "Bad Id", dataRoot: root }).error, /lowercase-kebab/);
    assert.match(fromHandoff({ text, id: "x-y", dataRoot: root }).error, /needs a name/);
    assert.match(fromHandoff({ text, itemIndex: 4, id: "x-y", dataRoot: root, overrides: { name: "X" } }).error, /no item 4/);
    const saved = serialiseHandoff({ ...base, items: [{ ...base.items[0], saved: true, locationId: "old-place" }] });
    assert.match(fromHandoff({ text: saved, id: "x-y", dataRoot: root, overrides: { name: "X" } }).error, /existing location "old-place"/);
    writeFileSync(path.join(root, "locations", "taken.json"), "{}");
    assert.match(fromHandoff({ text, id: "taken", dataRoot: root, overrides: { name: "X" } }).error, /already exists/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a real building becomes a drafted site with its exact footprint, and a dry run writes nothing", { skip: skipBuild }, () => {
  const root = scratch();
  try {
    const { text } = realHandoff();
    const dry = fromHandoff({ text, id: "the-paper-lantern", overrides: { name: "The Paper Lantern", kind: "izakaya", tags: ["izakaya"], summary: "A side-street izakaya." }, dataRoot: root, dryRun: true });
    assert.equal(dry.ok, true, dry.error);
    assert.equal(dry.written, false);
    assert.equal(existsSync(path.join(root, "locations", "the-paper-lantern.json")), false);
    const real = fromHandoff({ text, id: "the-paper-lantern", overrides: { name: "The Paper Lantern", kind: "izakaya", tags: ["izakaya"], summary: "A side-street izakaya." }, dataRoot: root, date: "2026-10-05" });
    assert.equal(real.ok, true, real.error);
    const doc = JSON.parse(readFileSync(path.join(root, "locations", "the-paper-lantern.json"), "utf8"));
    assert.equal(doc.id, "the-paper-lantern");
    assert.equal(doc.tier, "site");
    assert.equal(doc.name, "The Paper Lantern");
    assert.equal(doc.authoring.status, "drafted", "never above drafted");
    assert.equal(doc.lore.summary, "A side-street izakaya.");
    assert.ok(doc.derived.imagePx[0].length >= 4, "the outline is carried into derived.imagePx");
    assert.match(doc.authoring.note ?? "", /real building/, "the note says where it came from");
    assert.equal(fromHandoff({ text, id: "the-paper-lantern", overrides: { name: "Again" }, dataRoot: root }).ok, false, "a second run does not overwrite it");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("a fields file (--fields) fills the whole form, and the cross-references the editor has no form for reach the document", { skip: skipBuild }, () => {
  const root = scratch();
  try {
    const { text } = realHandoff();
    const fields = {
      name: "The Paper Lantern", kind: "commercial", tags: ["amenity", "civilian"], rank: 3, depth: "scene",
      lore: { summary: "A civilian izakaya.", playerFacing: "A noren curtain.", gmOnly: "Run it as a haunt." },
      scene: { hooks: ["A hook."], activities: ["One.", "Two."] },
      npcRefs: ["kiku", "sanzo"], episodeRefs: ["episode-c1e1-mothers-maiden-name"], assetRefs: ["rest--the-paper-lantern"], playlistRefs: [], factionRefs: []
    };
    const done = fromHandoff({ text, id: "the-paper-lantern", overrides: { fields }, dataRoot: root, date: "2026-10-05" });
    assert.equal(done.ok, true, done.error);
    const doc = JSON.parse(readFileSync(path.join(root, "locations", "the-paper-lantern.json"), "utf8"));
    assert.deepEqual([doc.kind, doc.rank, doc.depth, doc.tags], ["commercial", 3, "scene", ["amenity", "civilian"]]);
    assert.deepEqual(doc.scene.hooks, ["A hook."]);
    assert.deepEqual(doc.scene.activities, ["One.", "Two."]);
    assert.deepEqual(doc.lore, { summary: "A civilian izakaya.", playerFacing: "A noren curtain.", gmOnly: "Run it as a haunt." });
    assert.deepEqual(doc.npcRefs, ["kiku", "sanzo"]);
    assert.deepEqual(doc.episodeRefs, ["episode-c1e1-mothers-maiden-name"]);
    assert.deepEqual(doc.assetRefs, ["rest--the-paper-lantern"]);
    // the flags still win over the file
    const flagged = fromHandoff({ text, id: "another-place", overrides: { fields, name: "Flag Wins" }, dataRoot: root });
    assert.equal(flagged.doc.name, "Flag Wins");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("with --scene it also puts that scene at the new place, and says nothing changed when the slot is unknown", { skip: skipBuild }, () => {
  const root = scratch();
  try {
    const { text } = realHandoff();
    const ok = fromHandoff({ text, id: "the-paper-lantern", overrides: { name: "The Paper Lantern" }, target: sceneTarget("haunt-the-paper-lantern"), dataRoot: root, date: "2026-10-05" });
    assert.equal(ok.ok, true, ok.error);
    assert.equal(ok.placed.state, "merged");
    const set = JSON.parse(readFileSync(path.join(root, "campaign", "scene-set.json"), "utf8"));
    assert.equal(set.scenes[0].locationRef, "the-paper-lantern");
    assert.match(set.scenes[0].locationNote, /Placed at The Paper Lantern/);
    const bad = fromHandoff({ text, id: "second-place", overrides: { name: "Second" }, target: sceneTarget("no-such-scene"), dataRoot: root });
    assert.equal(bad.ok, false);
    assert.match(bad.error, /placement failed/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
