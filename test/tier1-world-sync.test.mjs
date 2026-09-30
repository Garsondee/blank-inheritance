// Tier 1 — core/world-sync.mjs: deciding when the world brings itself up to
// date with the content on the server, what changed, and what old documents
// it may remove. Written 2026-09-27 with the system itself (Ingram: "Add to
// the module a system which keeps the Foundry server updated automatically").

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  BUILD_STAMP_PATH,
  changesSince,
  decideWorldSync,
  describeChanges,
  episodePathsFor,
  FALLBACK_EPISODE_PATHS,
  isDisposableDuplicateScene,
  normalizeManifestFiles,
  noticeText,
  orphanedSyncedDocuments,
  sameManifestFiles,
  sourceIdFromPath,
  worldSyncCardHtml,
  worldSyncToast
} from "../module/blank-inheritance/scripts/core/world-sync.mjs";
import { STAMP_PATH_IN_MODULE } from "../tools/module-sync/build-stamp.mjs";

const MANIFEST = { esmodules: ["scripts/blank-inheritance.mjs"], styles: ["styles/a.css", "styles/b.css"], languages: ["lang/en.json"] };

function stamp({ id = "b2", code = "c1", manifest = MANIFEST, history = [] } = {}) {
  return { id, deployedAt: "2026-09-27T15:10:00.000Z", module: { code, manifest }, episodes: ["episodes/episode-c1e1-mothers-maiden-name.json"], warnings: [], history };
}

/* ------------------------------------------------------------------ */
/*  The stamp's address is the same on both sides                      */
/* ------------------------------------------------------------------ */

test("the module reads the stamp from exactly where the deploy writes it", () => {
  assert.equal(BUILD_STAMP_PATH, STAMP_PATH_IN_MODULE);
});

/* ------------------------------------------------------------------ */
/*  Manifests                                                          */
/* ------------------------------------------------------------------ */

test("normalizeManifestFiles: a live v14 package (Sets, {src}, {path}, route prefixes) matches the stamp's plain lists", () => {
  const live = {
    esmodules: new Set(["scripts/blank-inheritance.mjs"]),
    styles: [{ src: "modules/blank-inheritance/styles/b.css" }, { src: "styles/a.css", layer: null }],
    languages: new Set([{ lang: "en", path: "/modules/blank-inheritance/lang/en.json" }])
  };
  assert.deepEqual(normalizeManifestFiles(live), { esmodules: ["scripts/blank-inheritance.mjs"], styles: ["styles/a.css", "styles/b.css"], languages: ["lang/en.json"] });
  assert.ok(sameManifestFiles(live, MANIFEST));
  assert.ok(!sameManifestFiles(live, { ...MANIFEST, styles: ["styles/a.css", "styles/b.css", "styles/bi-agreement.css"] }));
});

/* ------------------------------------------------------------------ */
/*  Deciding                                                           */
/* ------------------------------------------------------------------ */

test("login: a new build is applied; the same build again is not", () => {
  assert.deepEqual(decideWorldSync({ trigger: "login", serverBuild: stamp(), appliedBuildId: "b1", loadedManifest: MANIFEST }).apply, true);
  const again = decideWorldSync({ trigger: "login", serverBuild: stamp(), appliedBuildId: "b2", loadedManifest: MANIFEST });
  assert.equal(again.apply, false);
  assert.equal(again.notice, null);
});

test("login: with no stamp on the server the world is still updated, as it always was before stamps existed", () => {
  const d = decideWorldSync({ trigger: "login", serverBuild: null, appliedBuildId: null });
  assert.equal(d.apply, true);
});

test("login: a manifest file list newer than the one the world launched with asks for a relaunch, and still applies the content", () => {
  const d = decideWorldSync({ trigger: "login", serverBuild: stamp(), appliedBuildId: "b1", loadedManifest: { ...MANIFEST, styles: ["styles/a.css"] } });
  assert.equal(d.apply, true);
  assert.equal(d.notice, "relaunch");
});

test("poll: new content with the SAME code is applied straight away", () => {
  const d = decideWorldSync({ trigger: "poll", serverBuild: stamp({ id: "b3", code: "c1" }), appliedBuildId: "b2", loadedBuild: stamp({ id: "b2", code: "c1" }), loadedManifest: MANIFEST });
  assert.deepEqual(d, { apply: true, notice: null, reason: "new content: build b3" });
});

test("poll: new content with NEW code is never applied by the old code -- the GM is asked to reload", () => {
  const d = decideWorldSync({ trigger: "poll", serverBuild: stamp({ id: "b3", code: "c2" }), appliedBuildId: "b2", loadedBuild: stamp({ id: "b2", code: "c1" }), loadedManifest: MANIFEST });
  assert.equal(d.apply, false);
  assert.equal(d.notice, "reload");
});

test("poll: a page that loaded before any stamp existed asks for a reload rather than guessing", () => {
  const d = decideWorldSync({ trigger: "poll", serverBuild: stamp({ id: "b3" }), appliedBuildId: null, loadedBuild: null, loadedManifest: MANIFEST });
  assert.equal(d.apply, false);
  assert.equal(d.notice, "reload");
});

test("poll: a changed manifest file list asks for a relaunch, which beats a reload", () => {
  const d = decideWorldSync({
    trigger: "poll",
    serverBuild: stamp({ id: "b3", code: "c2", manifest: { ...MANIFEST, styles: [...MANIFEST.styles, "styles/new.css"] } }),
    appliedBuildId: "b2",
    loadedBuild: stamp({ id: "b2", code: "c1" }),
    loadedManifest: MANIFEST
  });
  assert.equal(d.apply, false);
  assert.equal(d.notice, "relaunch");
});

test("poll: nothing new, or no stamp at all, does nothing", () => {
  assert.equal(decideWorldSync({ trigger: "poll", serverBuild: stamp({ id: "b2" }), appliedBuildId: "b2", loadedBuild: stamp({ id: "b2" }), loadedManifest: MANIFEST }).apply, false);
  assert.equal(decideWorldSync({ trigger: "poll", serverBuild: null, appliedBuildId: "b2" }).apply, false);
});

test("manual: always applies when the code is current, even at the same build", () => {
  const d = decideWorldSync({ trigger: "manual", serverBuild: stamp({ id: "b2" }), appliedBuildId: "b2", loadedBuild: stamp({ id: "b2" }), loadedManifest: MANIFEST });
  assert.equal(d.apply, true);
});

test("manual: still refuses to run old code against new content", () => {
  const d = decideWorldSync({ trigger: "manual", serverBuild: stamp({ id: "b3", code: "c2" }), appliedBuildId: "b2", loadedBuild: stamp({ id: "b2", code: "c1" }), loadedManifest: MANIFEST });
  assert.equal(d.apply, false);
  assert.equal(d.notice, "reload");
});

/* ------------------------------------------------------------------ */
/*  What changed                                                       */
/* ------------------------------------------------------------------ */

test("changesSince: collects every deploy newer than the world's own build", () => {
  const s = stamp({
    id: "b4",
    history: [
      { id: "b4", changed: ["data:scene-briefs/a.json"], removed: [] },
      { id: "b3", changed: ["data:scene-briefs/b.json", "data:scene-briefs/a.json"], removed: ["data:campaign/ground-roles.json"] },
      { id: "b2", changed: ["data:npcs/nobu.json"], removed: [] }
    ]
  });
  assert.deepEqual(changesSince(s, "b2"), { known: true, changed: ["data:scene-briefs/a.json", "data:scene-briefs/b.json"], removed: ["data:campaign/ground-roles.json"] });
  assert.equal(changesSince(s, "b1").known, false, "a build older than the history is unknown, not 'nothing changed'");
  assert.equal(changesSince(s, "b4").changed.length, 0);
});

test("describeChanges: groups paths the way a GM names them, scene briefs by their scene's name", () => {
  const out = describeChanges(
    [
      "data:scene-briefs/episode-c1e1--from-up-here.json",
      "data:scene-briefs/episode-c1e1--kit-issue.json",
      "data:episodes/episode-c1e2-scheduled-exercise.json",
      "data:campaign/scene-set.json",
      "data:audio/soundscapes/episode-c1e1--from-up-here.json",
      "data:npcs/nobu.json",
      "data:locations/the-drain-head.json",
      "module:scripts/core/world-sync.mjs",
      "module:assets/scenes/x.webp",
      "video:opening-full.mp4",
      "data:campaign/config.json"
    ],
    { names: new Map([["episode-c1e1--from-up-here", "From Up Here"]]) }
  );
  assert.deepEqual(out, {
    scenes: ["From Up Here", "episode-c1e1--kit-issue"],
    episodes: ["episode-c1e2-scheduled-exercise"],
    sceneList: true,
    soundscapes: ["episode-c1e1--from-up-here"],
    people: ["nobu"],
    places: 1,
    code: true,
    art: 1,
    video: ["opening-full.mp4"],
    other: 1
  });
});

/* ------------------------------------------------------------------ */
/*  Which content, which old documents                                 */
/* ------------------------------------------------------------------ */

test("episodePathsFor: the stamp's own list when it has one, both real episodes when it does not", () => {
  assert.deepEqual(episodePathsFor(stamp()), ["data/campaign/episodes/episode-c1e1-mothers-maiden-name.json"]);
  assert.deepEqual(episodePathsFor(null), FALLBACK_EPISODE_PATHS.map((p) => `data/campaign/${p}`));
  assert.ok(FALLBACK_EPISODE_PATHS.includes("episodes/episode-c1e2-scheduled-exercise.json"), "Episode Two must never again be left out of the journal sync");
});

test("sourceIdFromPath: filename is the id", () => {
  assert.equal(sourceIdFromPath("data/campaign/npcs/shucks-mordant.json"), "shucks-mordant");
});

test("orphanedSyncedDocuments: exactly the content sync's own documents whose source is gone -- the real stale set on the live world", () => {
  // Taken from the live remote world, read directly on 2026-09-27.
  const live = new Set(["shucks-mordant", "nobu", "intake-medicals-clerk", "episode-c1e1-mothers-maiden-name", "episode-c1e2-scheduled-exercise"]);
  const documents = [
    { id: "0cd7", name: "Contact, Unclassified", sourceId: "episode-01-contact-unclassified", sourceHash: "h" },
    { id: "9611", name: "Second Contact", sourceId: "episode-02-second-contact", sourceHash: "h" },
    { id: "9ac3", name: "The Squeeze", sourceId: "interlude-days-2-5-the-squeeze", sourceHash: "h" },
    { id: "4f82", name: "Mother's Maiden Name (Again)", sourceId: "episode-c1s1-mothers-maiden-name", sourceHash: "h" },
    { id: "c02a", name: "Mother's Maiden Name (Again)", sourceId: "episode-c1e1-mothers-maiden-name", sourceHash: "h" },
    { id: "3699", name: "Contact, Unclassified", sourceId: "contact-unclassified", sourceHash: "h" },
    { id: "3ff4", name: "Nobu", sourceId: "nobu", sourceHash: "h" },
    // The diagnostic's own fixtures: rebuilt on demand, never retired here.
    { id: "dd82", name: "TEST FIXTURE — Diagnostic Character", sourceId: "test-fixture-kid-001", sourceHash: "h" },
    // Vault journals carry a sourceId but no sourceHash: runtime stores, not synced content.
    { id: "717c", name: "Blank Inheritance — Private Downtime (GM only)", sourceId: "downtime-private-vault" },
    { id: "ae9f", name: "Blank Inheritance — Staged Casts (GM only)", sourceId: "stage-cast-vault" },
    // The demo party and anything hand-made carry neither.
    { id: "71a2", name: "Candidate 1" }
  ];
  assert.deepEqual(
    orphanedSyncedDocuments(documents, live).map((d) => d.id),
    ["0cd7", "9611", "9ac3", "4f82", "3699"]
  );
});

test("isDisposableDuplicateScene: an EMPTY copy carrying a managed scene's name goes; one with anything on it stays", () => {
  const ctx = { knownSourceIds: new Set(["hq-lobby"]), knownCleanNames: new Set(["Directorate HQ — Lobby"]) };
  assert.equal(isDisposableDuplicateScene({ name: "Directorate HQ — Lobby", sourceId: null, placeables: 0 }, ctx), true);
  assert.equal(isDisposableDuplicateScene({ name: "Directorate HQ — Lobby", sourceId: null, placeables: 2 }, ctx), false);
  assert.equal(isDisposableDuplicateScene({ name: "Directorate HQ — Lobby", sourceId: "hq-lobby", placeables: 0 }, ctx), false, "the managed scene itself is never a duplicate");
  assert.equal(isDisposableDuplicateScene({ name: "A GM's own scene", sourceId: null, placeables: 0 }, ctx), false);
  assert.equal(isDisposableDuplicateScene({ name: "Directorate HQ — Lobby", sourceId: null }, ctx), false, "an unknown placeable count is never assumed empty");
});

/* ------------------------------------------------------------------ */
/*  The report                                                         */
/* ------------------------------------------------------------------ */

test("worldSyncCardHtml: names new and removed scenes, what changed, and anything that needs a look -- escaped", () => {
  const html = worldSyncCardHtml({
    trigger: "login",
    build: { id: "abc123", deployedAt: "2026-09-27T15:10:00.000Z", warnings: ["scene \"x\" has no picture"] },
    appliedBuildId: "old",
    scenes: { created: ["00. From Up Here"], removed: [], temporary: [], duplicates: ["Directorate HQ — Lobby"], quarantined: [], updated: 38, pinsRetired: 14 },
    documents: { removed: ["The Squeeze", "Second <Contact>"] },
    changes: { known: true, ...describeChanges(["data:scene-briefs/episode-c1e1--from-up-here.json", "module:scripts/a.mjs"], { names: new Map([["episode-c1e1--from-up-here", "From Up Here"]]) }) },
    audio: { created: [], updated: ["From Up Here"], removed: ["Playful"] },
    problems: []
  });
  assert.match(html, /New scenes:<\/strong> 00\. From Up Here/);
  assert.match(html, /Removed scenes:<\/strong> Directorate HQ — Lobby/);
  assert.match(html, /Removed old documents:<\/strong> The Squeeze, Second &lt;Contact&gt;/);
  assert.match(html, /Scenes whose content changed:<\/strong> From Up Here/);
  assert.match(html, /Module code changed/);
  assert.match(html, /38 scenes checked/);
  // The map's old Note pins were retired 2026-09-28; the first sync after says it cleared them.
  assert.match(html, /14 old map pins removed/);
  assert.match(html, /Needs a look/);
  assert.match(html, /build <code>abc123<\/code>/);
  // Found live 2026-09-27: a changed soundscape used to verify clean and show up here, with nothing then rebuilding
  // the Playlist documents Foundry actually plays from. Now it does, and the card says so.
  assert.match(html, /Audio playlists rebuilt:<\/strong> From Up Here/);
  assert.match(html, /Audio playlists removed \(their whole pool is gone\):<\/strong> Playful/);
});

test("worldSyncCardHtml: a relaunch notice is spelled out", () => {
  const html = worldSyncCardHtml({ trigger: "login", build: stamp(), scenes: {}, documents: {}, notice: "relaunch" });
  assert.match(html, /Relaunch the world/);
});

test("worldSyncToast and noticeText: short, plain, and say what to press", () => {
  assert.equal(
    worldSyncToast({ scenes: { created: ["00. From Up Here"], removed: [], temporary: [], duplicates: ["x"] }, documents: { removed: ["a", "b"] } }),
    "Blank Inheritance: the world is up to date — 1 new scene, 1 scene removed, 2 old documents removed. Details in chat."
  );
  assert.match(
    worldSyncToast({ scenes: {}, documents: {}, audio: { created: [], updated: ["From Up Here", "Playful"], removed: [] } }),
    /2 audio playlists rebuilt/
  );
  assert.match(noticeText("reload", stamp()), /Reload Foundry \(F5\)/);
  assert.match(noticeText("relaunch", stamp()), /Return to Setup and launch the world again/);
});
