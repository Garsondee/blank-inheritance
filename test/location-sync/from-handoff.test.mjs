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
import { fieldsFor, fromHandoff, linkIntoRegion, referencesTo, unlinkFromRegions } from "../../tools/location-sync/from-handoff.mjs";

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
  // <scratch>/data is the data root, so <scratch> stands in for the repo (canon/ beside data/) and nothing outside it is ever touched
  const root = path.join(mkdtempSync(path.join(os.tmpdir(), "bi-handoff-")), "data");
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
  } finally { rmSync(path.resolve(root, ".."), { recursive: true, force: true }); }
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
  } finally { rmSync(path.resolve(root, ".."), { recursive: true, force: true }); }
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
  } finally { rmSync(path.resolve(root, ".."), { recursive: true, force: true }); }
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
  } finally { rmSync(path.resolve(root, ".."), { recursive: true, force: true }); }
});

/* ---------------------------------------------------------------- keeping the rest of the map in step */

/** A region file as the Python bridge writes it: floats like 5665.0 that JSON.stringify would silently turn into 5665. */
const regionText = (id, contains) => `{
  "id": "${id}",
  "tier": "region",
  "derived": {
    "imagePx": [
      [
        [5665.0, 6472.0],
        [5700.0, 6500.0]
      ]
    ],
    "containsRefs": [${contains.map((c) => `\n      ${JSON.stringify(c)}`).join(",")}${contains.length ? "\n    " : ""}]
  }
}
`;

test("a new place is added to its region's contents list, and ONLY that list changes: the rest of the file is byte for byte what it was", () => {
  const root = scratch();
  try {
    const file = path.join(root, "locations", "slope.json");
    writeFileSync(file, regionText("slope", ["home-the-slope-terrace"]));
    assert.equal(linkIntoRegion({ id: "the-paper-lantern", tier: "site", derived: { withinRegionRef: "slope" } }, { dataRoot: root }), "slope");
    const after = readFileSync(file, "utf8");
    assert.equal(after, regionText("slope", ["home-the-slope-terrace", "the-paper-lantern"]), "the list grew, sorted, in the file's own layout; 5665.0 is still 5665.0");
    assert.equal(linkIntoRegion({ id: "the-paper-lantern", tier: "site", derived: { withinRegionRef: "slope" } }, { dataRoot: root }), "slope");
    assert.equal(readFileSync(file, "utf8"), after, "listing it twice changes nothing");
    assert.equal(linkIntoRegion({ id: "x", tier: "site", derived: { withinRegionRef: null } }, { dataRoot: root }), null, "no region: nothing to list it in");
    assert.equal(linkIntoRegion({ id: "x", tier: "region", derived: { withinRegionRef: "slope" } }, { dataRoot: root }), null, "a region is not listed in a region");
  } finally { rmSync(path.resolve(root, ".."), { recursive: true, force: true }); }
});

test("a retired place leaves every region's contents list, and an empty list stays a valid empty list", () => {
  const root = scratch();
  try {
    writeFileSync(path.join(root, "locations", "a.json"), regionText("a", ["old", "keep"]));
    writeFileSync(path.join(root, "locations", "b.json"), regionText("b", ["old"]));
    writeFileSync(path.join(root, "locations", "c.json"), regionText("c", ["keep"]));
    assert.deepEqual(unlinkFromRegions("old", { dataRoot: root }).sort(), ["a", "b"]);
    assert.equal(readFileSync(path.join(root, "locations", "a.json"), "utf8"), regionText("a", ["keep"]));
    assert.equal(readFileSync(path.join(root, "locations", "b.json"), "utf8"), regionText("b", []));
    assert.equal(readFileSync(path.join(root, "locations", "c.json"), "utf8"), regionText("c", ["keep"]), "a region that never held it is untouched");
    assert.deepEqual(unlinkFromRegions("old", { dataRoot: root, dryRun: true }), [], "a dry run on what is already done finds nothing");
  } finally { rmSync(path.resolve(root, ".."), { recursive: true, force: true }); }
});

test("what still names a place is found in data/ and canon/, not in a decision record or the retired drafts", () => {
  const root = scratch();
  const repo = path.resolve(root, "..");
  try {
    mkdirSync(path.join(repo, "canon", "scenes"), { recursive: true });
    mkdirSync(path.join(repo, "canon", "decisions"), { recursive: true });
    mkdirSync(path.join(root, "map", "gazetteer-drafts"), { recursive: true });
    writeFileSync(path.join(root, "locations", "old-shed.json"), "{}");
    writeFileSync(path.join(repo, "canon", "scenes", "s.json"), '{"locationRef": "old-shed"}');
    writeFileSync(path.join(repo, "canon", "decisions", "D1.md"), "old-shed was a shed");
    writeFileSync(path.join(root, "map", "gazetteer-drafts", "d.json"), '{"id": "old-shed"}');
    writeFileSync(path.join(root, "campaign", "near.json"), '{"locationRef": "old-shed-2"}');
    assert.deepEqual(referencesTo("old-shed", { dataRoot: root }), [path.relative(repo, path.join(repo, "canon", "scenes", "s.json")).split(path.sep).join("/")], "the longer id old-shed-2 is a different place");
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test("--retire refuses while anything names the old place, replaces it when nothing does, and --within fixes a centre that lies in no region", { skip: skipBuild }, () => {
  const root = scratch();
  const repo = path.resolve(root, "..");
  try {
    const { text } = realHandoff();
    writeFileSync(path.join(root, "locations", "old-shed.json"), "{}");
    writeFileSync(path.join(root, "locations", "edge.json"), regionText("edge", ["old-shed"]));
    writeFileSync(path.join(root, "campaign", "uses.json"), '{"locationRef": "old-shed"}');
    const fields = { name: "Seaward Platform" };
    const refused = fromHandoff({ text, id: "seaward-platform", overrides: { fields }, retire: "old-shed", dataRoot: root });
    assert.equal(refused.ok, false);
    assert.match(refused.error, /still named by .*uses\.json/);
    assert.equal(existsSync(path.join(root, "locations", "seaward-platform.json")), false, "nothing was written");
    assert.match(fromHandoff({ text, id: "seaward-platform", overrides: { fields }, retire: "no-such", dataRoot: root }).error, /no such location/);
    rmSync(path.join(root, "campaign", "uses.json"));
    const dry = fromHandoff({ text, id: "seaward-platform", overrides: { fields }, retire: "old-shed", within: "edge", dryRun: true, dataRoot: root });
    assert.equal(dry.ok, true, dry.error);
    assert.equal(existsSync(path.join(root, "locations", "old-shed.json")), true, "a dry run retires nothing");
    const done = fromHandoff({ text, id: "seaward-platform", overrides: { fields }, retire: "old-shed", within: "edge", dataRoot: root });
    assert.equal(done.ok, true, done.error);
    assert.equal(existsSync(path.join(root, "locations", "old-shed.json")), false, "the old place is gone");
    assert.equal(JSON.parse(readFileSync(path.join(root, "locations", "seaward-platform.json"), "utf8")).derived.withinRegionRef, "edge");
    assert.equal(readFileSync(path.join(root, "locations", "edge.json"), "utf8"), regionText("edge", ["seaward-platform"]), "the region lists the new place and not the old");
    assert.deepEqual(done.warnings, []);
    assert.match(fromHandoff({ text, id: "other", overrides: { fields }, within: "no-region", dataRoot: root }).error, /no such region/);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});
