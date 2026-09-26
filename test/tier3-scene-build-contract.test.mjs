// Tier 3 — scene-build.mjs's adoption contract.
//
// Found live 2026-09-18, against a full local copy of the real remote world:
// the real production "Campaign Map" Scene was built by hand in Foundry
// before this pipeline's own hub concept existed, so it carries NO
// blank-inheritance flags at all (confirmed by pulling its real document
// down and reading it directly, tools/pack-extractor). A first attempt at
// fixing this (match an existing scene by its OWN sourceId flag) does
// nothing for a scene that has never had one — proven wrong live the moment
// buildSceneSet() actually ran against the real world's copy and created a
// second, empty, duplicate "The City" scene right next to the real map.
//
// The real fix needed an explicit, authored bridge (scene-set.json's own
// `adoptSceneNamed`, schema's own doc comment) — AND, found live the same
// pass, adopting a scene must never touch its own content: `plan.data` is a
// full single-background picture-scene payload built for scenes THIS
// pipeline constructs, and forcing it onto the real Campaign Map's own
// 12400x12400, four-Tile construction would have silently shrunk its
// declared bounds to the manifest's 6200x6200 assumption and layered a wrong
// background image under its real Tiles. Caught before it ever reached
// anything but a local test copy.
//
// Foundry's real Scene#update/embedded-collection API isn't modelled by
// test/support/mock-foundry.mjs (see tier3-deck-contract.test.mjs and
// tier3-travel-contract.test.mjs for the established reason and pattern);
// this reads the real source and pins the specific facts that make adoption
// both possible and safe, rather than mounting it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance", "scripts");
const src = readFileSync(path.join(moduleRoot, "foundry", "scene-build.mjs"), "utf8");
const generator = readFileSync(path.join(moduleRoot, "core", "generators", "scene-set.mjs"), "utf8");
const manifest = JSON.parse(readFileSync(path.join(here, "..", "data", "campaign", "scene-set.json"), "utf8"));
const schema = JSON.parse(readFileSync(path.join(here, "..", "data", "schema", "scene-set.schema.json"), "utf8"));

test("an existing scene is found by its own sourceId flag once a prior adoption stamped one", () => {
  assert.match(
    src,
    /const bySourceId = byId \? null : game\.scenes\.find\(\(s\) => s\.getFlag\(MODULE_ID, "sourceId"\) === plan\.sourceId\);/
  );
});

test("a scene with NO prior flag at all can still be found, by the explicit adoptSceneNamed bridge", () => {
  assert.match(
    src,
    /const byName = byId \|\| bySourceId \|\| !plan\.adoptSceneNamed \? null : game\.scenes\.getName\(plan\.adoptSceneNamed\);/,
    "the name-based fallback is missing — a virgin hand-built scene (no flags yet) can no longer be adopted at all"
  );
});

test("core/generators/scene-set.mjs passes adoptSceneNamed through from the manifest, and the real manifest's hub actually uses it", () => {
  assert.match(generator, /adoptSceneNamed:\s*scene\.adoptSceneNamed\s*\?\?\s*null/, "sceneSetPlan no longer threads adoptSceneNamed through to the adapter");
  const hub = manifest.scenes.find((s) => s.kind === "hub");
  assert.ok(hub, "no hub scene in the real manifest");
  assert.equal(hub.adoptSceneNamed, "Campaign Map", "the-city's own adoptSceneNamed no longer points at the real production scene's name");
});

test("the schema actually allows adoptSceneNamed (additionalProperties: false everywhere else in this file)", () => {
  const sceneItemSchema = schema.properties.scenes.items;
  assert.ok(sceneItemSchema.properties.adoptSceneNamed, "scene-set.schema.json has no adoptSceneNamed property — the real manifest's own field would fail validation");
});

test("an adopted scene's CONTENT is never touched — the only update() reaching it is a bare {name}, never plan.data's geometry payload", () => {
  const ifBlock = src.match(/if \(adopted\) \{[\s\S]*?\n {6}\} else if \(byId\)/);
  assert.ok(ifBlock, "could not find the adopted-branch of the main scene-build loop");
  // The one sanctioned update: a rename, guarded, and passing ONLY {name} --
  // never `...plan.data` or `...updateData`, which is exactly what would
  // reintroduce the live bug this file exists to catch (width/height/
  // background silently overwritten).
  assert.match(ifBlock[0], /if \(adoptedOriginalName !== plan\.data\.name\) await adopted\.update\(\{ name: plan\.data\.name \}\);/, "the adopted branch's one sanctioned rename call is missing or no longer scoped to just {name}");
  assert.doesNotMatch(ifBlock[0], /adopted\.update\(\{\s*\.\.\./, "the adopted branch spreads a larger object into update() — this WILL overwrite a hand-built scene's real geometry (width/height/background) with this pipeline's own single-background assumptions, exactly the live bug this test exists to catch");
});

test("a scene THIS pipeline built (found by its own deterministic id) still gets its content refreshed normally", () => {
  const elseIfBlock = src.match(/\} else if \(byId\) \{[\s\S]*?\n {6}\} else \{/);
  assert.ok(elseIfBlock, "could not find the byId branch");
  assert.match(elseIfBlock[0], /const \{ _id, \.\.\.updateData \} = plan\.data;/);
  assert.match(elseIfBlock[0], /await existing\.update\(\{ \.\.\.updateData, folder: folder\?\.id \?\? null \}\);/);
});

test("every downstream lookup (hub pins, pin targets, landing activation) prefers the REAL id an adoption produced, not just the deterministic one", () => {
  assert.match(src, /realIdFor\.set\(plan\.sourceId, scene\.id\);/, "realIdFor is no longer populated — nothing downstream can find an adopted scene by its real id");
  assert.match(src, /game\.scenes\.get\(realIdFor\.get\(hub\.id\) \?\? idFor\.get\(hub\.id\)\)/, "the hub-pin loop no longer checks realIdFor first — an adopted hub's pins would silently go nowhere");
  assert.match(src, /targetSceneId: realIdFor\.get\(pin\.sceneRef\) \?\? idFor\.get\(pin\.sceneRef\) \?\? null/, "a pin's own target scene id no longer prefers realIdFor — a pin to an adopted scene would open nothing");
  assert.match(src, /game\.scenes\.get\(realIdFor\.get\(landing\.sourceId\) \?\? landing\.data\._id\)/, "activateLanding no longer checks realIdFor first — an adopted landing scene could never be auto-activated");
});

test("an adoption is reported, not silent — a GM should be told a hand-built scene was just claimed", () => {
  assert.match(src, /report\.adopted = \[\.\.\.\(report\.adopted \?\? \[\]\),/);
  assert.match(src, /for \(const adoption of report\.adopted \?\? \[\]\) ui\.notifications\.info/);
});

test("quarantineStrayScenes is exported and reachable from the console, matching retireTemporaryScenes' own established pattern (2026-09-18: 'get rid of... and/or move into a special folder')", () => {
  assert.match(src, /export async function quarantineStrayScenes\(/);
  const entry = readFileSync(path.join(moduleRoot, "blank-inheritance.mjs"), "utf8");
  assert.match(entry, /import\s*\{[^}]*quarantineStrayScenes[^}]*\}\s*from\s*"\.\/foundry\/scene-build\.mjs"/, "blank-inheritance.mjs no longer imports quarantineStrayScenes");
  assert.match(entry, /^\s*quarantineStrayScenes,\s*$/m, "quarantineStrayScenes no longer sits on mod.api, alongside retireTemporaryScenes");
});

// --- retireOrphanedScenes (2026-09-19) -------------------------------------
//
// Ingram's own request: "every time I load Foundry it just updates, adds or
// removes scenes to get us to the current state of the adventure." Same
// reasoning as the file header above for why this is pinned via source text
// rather than mounted -- Scene#delete/#activate aren't modelled by
// mock-foundry.mjs either. Three safety properties matter more here than for
// any other function in this file, because getting one wrong means silently
// destroying either (a) a scene that still matters or (b) a human's own
// hand-built work -- so each is pinned as its own explicit assertion rather
// than inferred from one broad regex.

test("buildSceneSet stamps an `adopted` flag distinct from sourceId, true only on the adoption branch — the fact retireOrphanedScenes' entire safety case rests on", () => {
  assert.match(
    src,
    /await scene\.setFlag\(MODULE_ID, "adopted", Boolean\(adopted\)\);/,
    "the adopted flag is no longer stamped every time sourceId is -- retireOrphanedScenes can no longer tell a created scene from an adopted one"
  );
});

test("retireOrphanedScenes never touches a scene with no sourceId flag at all (a hand-built scene this pipeline has never seen)", () => {
  const fn = src.match(/export async function retireOrphanedScenes\([\s\S]*?\n\}/);
  assert.ok(fn, "retireOrphanedScenes is missing");
  assert.match(fn[0], /if \(!sourceId \|\| knownSourceIds\.has\(sourceId\) \|\| scene\.getFlag\(MODULE_ID, "adopted"\)\) \{/, "the three-way keep-check (no flag / still known / adopted) is no longer one guard clause");
});

test("retireOrphanedScenes never deletes an ADOPTED scene, even if its sourceId has dropped out of the manifest — a human's real work, never ours to destroy", () => {
  const fn = src.match(/export async function retireOrphanedScenes\([\s\S]*?\n\}/);
  assert.match(fn[0], /scene\.getFlag\(MODULE_ID, "adopted"\)/, "the adopted check is gone from the keep-guard");
  // The guard must run BEFORE scene.delete() is ever reached, not after.
  const guardIndex = fn[0].indexOf('scene.getFlag(MODULE_ID, "adopted")');
  const deleteIndex = fn[0].indexOf("scene.delete()");
  assert.ok(guardIndex > -1 && deleteIndex > -1 && guardIndex < deleteIndex, "the adopted guard must short-circuit before delete() is reached");
});

test("retireOrphanedScenes rescues the table off an active scene before deleting it, same as retireTemporaryScenes", () => {
  const fn = src.match(/export async function retireOrphanedScenes\([\s\S]*?\n\}/);
  assert.match(fn[0], /if \(scene\.active\) \{/);
  assert.match(fn[0], /landing\.activate\(\)/);
});

test("retireOrphanedScenes is GM-gated and reachable from the console, wired alongside its siblings", () => {
  assert.match(src, /export async function retireOrphanedScenes\(\{ notify = true \} = \{\}\) \{\s*\n\s*if \(!game\.user\.isGM\) return \{ removed: \[\], kept: \[\] \};/);
  const entry = readFileSync(path.join(moduleRoot, "blank-inheritance.mjs"), "utf8");
  assert.match(entry, /import\s*\{[^}]*retireOrphanedScenes[^}]*\}\s*from\s*"\.\/foundry\/scene-build\.mjs"/, "blank-inheritance.mjs no longer imports retireOrphanedScenes");
  assert.match(entry, /^\s*retireOrphanedScenes,\s*$/m, "retireOrphanedScenes no longer sits on mod.api");
});

// --- runAutomaticSync (blank-inheritance.mjs, 2026-09-19) ------------------
//
// Ingram's own request, same session as retireOrphanedScenes above: "I
// wouldn't even see a dialogue that I have to confirm... it just updates,
// adds or removes scenes." This is the orchestration that replaced the old
// confirm-first promptToRunSync (sync-dialog.mjs, deleted the same day --
// nothing imports it any more, checked by grep across the whole repo before
// removal). Same reason as everything else in this file for reading source
// text rather than mounting a mock: Hooks.once/canvasReady and the module's
// own top-level hook wiring aren't something test/support/mock-foundry.mjs
// models at all.

const entry = readFileSync(path.join(moduleRoot, "blank-inheritance.mjs"), "utf8");

test("runAutomaticSync runs content sync, then the scene set, then orphan cleanup, in that order", () => {
  const fn = entry.match(/async function runAutomaticSync\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fn, "runAutomaticSync is missing from blank-inheritance.mjs");
  const contentIndex = fn[0].indexOf("runRealContentSync()");
  const sceneIndex = fn[0].indexOf("buildSceneSet(");
  const orphanIndex = fn[0].indexOf("retireOrphanedScenes(");
  assert.ok(contentIndex > -1 && sceneIndex > -1 && orphanIndex > -1, "runAutomaticSync no longer calls all three steps");
  assert.ok(contentIndex < sceneIndex && sceneIndex < orphanIndex, "the three steps are no longer called in content -> scenes -> orphans order");
});

test("runAutomaticSync isolates each of its three steps in its own try, so one failing step cannot cancel the others", () => {
  const fn = entry.match(/async function runAutomaticSync\(\)\s*\{[\s\S]*?\n\}/);
  const tryCount = (fn[0].match(/\btry\s*\{/g) ?? []).length;
  assert.equal(tryCount, 3, "runAutomaticSync no longer wraps each of its three steps in its own try/catch");
});

test("the canvasReady hook is GM-gated and calls runAutomaticSync, not the deleted promptToRunSync", () => {
  // A historical mention of promptToRunSync in a comment (why this changed)
  // is fine and expected; an import of it is not -- that's the part that
  // would mean sync-dialog.mjs's deletion broke the module.
  assert.doesNotMatch(entry, /import\s*\{[^}]*promptToRunSync[^}]*\}/, "blank-inheritance.mjs still imports the deleted promptToRunSync");
  assert.match(
    entry,
    /Hooks\.once\("canvasReady", \(\) => \{\s*\n\s*if \(!game\.user\.isGM\) return;\s*\n\s*runAutomaticSync\(\)\.catch/,
    "the canvasReady hook no longer calls runAutomaticSync"
  );
});

test("runAutomaticSync is exposed on mod.api, so a GM can re-trigger a full sync from the console without reloading", () => {
  assert.match(entry, /^\s*runAutomaticSync,\s*$/m, "runAutomaticSync no longer sits on mod.api");
});

test("sync-dialog.mjs is actually gone, not just unused (this project deletes dead code rather than keeping a shim)", () => {
  const syncDialogPath = path.join(moduleRoot, "foundry", "sync-dialog.mjs");
  assert.ok(!existsSync(syncDialogPath), "sync-dialog.mjs still exists on disk");
});
