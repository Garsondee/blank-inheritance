// Tier 3 — foundry/world-sync.mjs, the half of the automatic world sync that
// talks to Foundry (2026-09-27). Its deciding is unit-tested in
// tier1-world-sync.test.mjs; this pins the wiring by reading the source, the
// same way tier3-scene-build-contract.test.mjs pins scene-build.mjs, and for
// the same reason: the steps it drives (Scene#update/delete, embedded
// collections, world settings) are not modelled by test/support/mock-foundry.mjs,
// and a mock of them would prove the mock rather than the module. The whole
// chain is verified live instead (design/testing-strategy.md tier 5).
//
// Each test below is a property whose loss would do real damage: two GMs
// racing into the same scene, old code applying new content, an old-document
// clean-up acting on a half-finished content sync, a clipboard overwritten at
// every login.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = path.resolve(here, "..", "module", "blank-inheritance", "scripts");
const src = readFileSync(path.join(scripts, "foundry", "world-sync.mjs"), "utf8");
const entry = readFileSync(path.join(scripts, "blank-inheritance.mjs"), "utf8");
const lang = JSON.parse(readFileSync(path.resolve(here, "..", "module", "blank-inheritance", "lang", "en.json"), "utf8"));

const fnBody = (name) => {
  const match = src.match(new RegExp(`(?:export )?async function ${name}\\([\\s\\S]*?\\n\\}`));
  assert.ok(match, `${name} is missing from foundry/world-sync.mjs`);
  return match[0];
};

test("only a GM runs it, and an automatic run happens on the ONE active GM's page only", () => {
  const body = fnBody("runWorldSync");
  assert.match(body, /if \(!game\.user\?\.isGM\) \{/);
  assert.match(body, /if \(trigger !== "manual" && game\.users\?\.activeGM && !game\.users\.activeGM\.isSelf\) return null;/, "two GMs' pages could both rebuild the same scenes at once");
});

test("a second trigger while one run is in flight joins it instead of starting another", () => {
  const body = fnBody("runWorldSync");
  assert.match(body, /if \(inFlight\) return inFlight;/);
  assert.match(body, /inFlight = syncOnce\(trigger\)\.finally\(\(\) => \{\s*\n\s*inFlight = null;/);
});

test("the decision is core/world-sync.mjs's, fed the stamp, the world's own build, and what this page loaded with", () => {
  const body = fnBody("syncOnce");
  assert.match(body, /decideWorldSync\(\{ trigger, serverBuild, appliedBuildId, loadedBuild, loadedManifest: game\.modules\.get\(MODULE_ID\) \}\)/);
});

test("a page that must reload or relaunch says so ONCE per build, and applies nothing", () => {
  const body = fnBody("syncOnce");
  const noApply = body.match(/if \(!decision\.apply\) \{[\s\S]*?\n {2}\}/);
  assert.ok(noApply, "the no-apply branch is missing");
  assert.match(noApply[0], /if \(decision\.notice && noticedBuildId !== serverBuild\?\.id\) \{/);
  assert.match(noApply[0], /ui\.notifications\.warn\(text, \{ permanent: true \}\);/, "a reload/relaunch notice must stay on screen until dismissed");
  assert.match(noApply[0], /return null;/);
  assert.doesNotMatch(noApply[0], /applyBuild\(/);
});

test("the applied build is recorded after the update runs, and the GM gets one card and one toast", () => {
  const body = fnBody("syncOnce");
  const applyIndex = body.indexOf("await applyBuild(");
  const recordIndex = body.indexOf("await game.settings.set(MODULE_ID, SETTING,");
  const cardIndex = body.indexOf("worldSyncCardHtml(report)");
  assert.ok(applyIndex > -1 && recordIndex > applyIndex && cardIndex > recordIndex, "apply, then record, then report -- in that order");
  assert.match(body, /whisper: \[game\.user\.id\]/, "the card is for the GM alone");
});

test("the update runs every step in order, each in its own try, caches first", () => {
  const body = fnBody("applyBuild");
  const order = [
    'step("refreshing the audio library"',
    'step("syncing the audio playlists"',
    'step("clearing the Scene Runner\'s cache"',
    'step("the content sync"',
    'step("building the scenes"',
    'step("removing scenes the adventure no longer has"',
    'step("removing temporary scenes"',
    'step("removing empty duplicate scenes"',
    'step("setting aside stray scenes"',
    'step("removing old documents"',
    'step("updating the macro"'
  ];
  let last = -1;
  for (const call of order) {
    const at = body.indexOf(call);
    assert.ok(at > last, `${call} is missing or out of order`);
    last = at;
  }
  const stepFn = body.match(/const step = async \(label, fn\) => \{[\s\S]*?\n {2}\};/);
  assert.ok(stepFn, "the per-step isolation helper is missing");
  assert.match(stepFn[0], /try \{\s*\n\s*return await fn\(\);\s*\n\s*\} catch \(err\) \{/);
  assert.match(stepFn[0], /report\.problems\.push/, "a failed step must be reported, not swallowed");
});

test("a change to a soundscape or a reservation reaches the actual Playlist documents, not only the deployed files -- found live 2026-09-27", () => {
  // Before this, syncAudioPlaylists ran once (audio-playlists.mjs#ensureAudioPlaylists, only when no generated
  // playlist existed yet) or by a GM's own hand in the Sound Desk. A deploy that changed which track a moment or a
  // scene played verified clean and even showed up in the world-sync card's "Soundscapes changed" line, but the
  // Playlist/PlaylistSound documents Foundry actually plays from were never rebuilt, so the old track kept playing
  // through any number of reloads. syncAudioPlaylists() already only writes what changed, so running it here on
  // every sync is free when nothing did.
  const body = fnBody("applyBuild");
  assert.match(body, /const audio = await step\("syncing the audio playlists", \(\) => syncAudioPlaylists\(\{ notify: false \}\)\);/);
  assert.match(body, /report\.audio = \{ created: audio\?\.created \?\? \[\], updated: audio\?\.updated \?\? \[\], removed: audio\?\.removed \?\? \[\] \};/);
  assert.match(body, /report\.problems\.push\(\.\.\.\(audio\?\.problems \?\? \[\]\)\);/, "a broken audio blueprint must show up as a problem, not go silent");
  assert.match(src, /import \{ syncAudioPlaylists \} from "\.\/audio-playlists\.mjs";/);
});

test("the content sync runs quietly (no clipboard, no chat card of its own) over the stamp's own episode list", () => {
  const body = fnBody("applyBuild");
  assert.match(body, /const episodePaths = episodePathsFor\(serverBuild\);/);
  assert.match(body, /runRealContentSync\(\{ quiet: true, episodePaths \}\)/);
});

test("every scene step runs with notify: false -- the card reports for all of them", () => {
  const body = fnBody("applyBuild");
  for (const fn of ["buildSceneSet", "retireOrphanedScenes", "retireTemporaryScenes", "retireDuplicateScenes", "quarantineStrayScenes"]) {
    assert.match(body, new RegExp(`${fn}\\(\\{ notify: false \\}\\)`), `${fn} would post its own toasts`);
  }
});

test("nothing in the world sync ever activates a scene -- an update must never move the table", () => {
  assert.doesNotMatch(src, /\.activate\(\)/);
  assert.doesNotMatch(src, /activateLanding: true/);
});

test("old documents are left alone whenever the content sync did not finish cleanly", () => {
  const body = fnBody("retireOrphanedDocuments");
  assert.match(body, /if \(!content \|\| content\.fatalError \|\| \(content\.results \?\? \[\]\)\.some\(\(r\) => r\.foundryType === "Case"\)\) \{/);
  const guardIndex = body.indexOf("content.fatalError");
  const deleteIndex = body.indexOf(".delete()");
  assert.ok(guardIndex > -1 && deleteIndex > guardIndex, "the fail-safe must come before any delete");
  assert.match(body, /orphanedSyncedDocuments\(candidates, live\)/, "which documents go is core/world-sync.mjs's decision, not an inline guess");
  assert.match(body, /const live = managedSourceIds\(episodePaths\);/);
});

test("the stamp is fetched fresh every time, never from a cache", () => {
  const body = fnBody("readBuildStamp");
  assert.match(body, /fetch\(foundry\.utils\.getRoute\(`modules\/\$\{MODULE_ID\}\/\$\{BUILD_STAMP_PATH\}`\), \{ cache: "no-cache" \}\)/);
  assert.match(body, /if \(!response\.ok\) return null;/, "a server with no stamp must read as 'no stamp', not an error");
});

test("the macro keeps the old 'Build the scene set' macro's id, so the one already in a hotbar is retargeted in place", () => {
  assert.match(src, /const MACRO_SOURCE_ID = "scene-set-macro";/);
  const body = fnBody("ensureWorldSyncMacro");
  assert.match(body, /command: `await game\.modules\.get\("\$\{MODULE_ID\}"\)\.api\.runWorldSync\(\);`/);
  assert.match(body, /if \(existing\.name !== data\.name \|\| existing\.command !== data\.command\) await existing\.update\(\{ name: data\.name, command: data\.command \}\);/);
});

test("it starts from the ready hook, GM only, and then keeps watching", () => {
  const body = fnBody("startWorldSync");
  assert.match(body, /if \(!game\.user\?\.isGM\) return;/);
  assert.match(body, /loadedBuild = await readBuildStamp\(\);/, "the page must remember which build it loaded with, or it cannot tell when its own code is stale");
  assert.match(body, /await runWorldSync\(\{ trigger: "login" \}\);/);
  assert.match(body, /setInterval\(\(\) => \{\s*\n\s*runWorldSync\(\{ trigger: "poll" \}\)/);
  assert.match(body, /\}, WATCH_INTERVAL_MS\);/);

  const ready = entry.match(/Hooks\.once\("ready", async \(\) => \{[\s\S]*?\n\}\);/);
  assert.ok(ready, "could not find the ready hook");
  const gmGate = ready[0].lastIndexOf("if (!game.user.isGM) return;");
  const start = ready[0].indexOf("startWorldSync(");
  assert.ok(gmGate > -1 && start > gmGate, "the world sync must start after the ready hook's own GM gate");
  assert.match(entry, /registerWorldSyncSettings\(\);/, "the world setting must be registered in init");
});

test("every string it shows exists in lang/en.json", () => {
  for (const key of ["MacroName", "Updating", "AlreadyCurrent", "NotGM"]) {
    assert.ok(lang.BLANKINHERITANCE.WorldSync?.[key], `BLANKINHERITANCE.WorldSync.${key} is missing`);
    if (key !== "MacroName") assert.match(src, new RegExp(`BLANKINHERITANCE\\.WorldSync\\.${key}`));
  }
  assert.ok(lang.BLANKINHERITANCE.Scenes.DuplicatesRetired, "BLANKINHERITANCE.Scenes.DuplicatesRetired is missing");
});
