// Tests tools/module-sync/build-stamp.mjs -- the small file every deploy
// writes last, which the module watches to bring the world up to date by
// itself (module/blank-inheritance/scripts/core/world-sync.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  codeMap,
  composeStamp,
  episodePaths,
  fingerprint,
  HISTORY_LIMIT,
  isModuleCodePath,
  manifestFiles
} from "../../tools/module-sync/build-stamp.mjs";

const NOW = new Date("2026-09-27T15:00:00Z");
const GIT = { commit: "abc1234", uncommitted: 3 };
const MANIFEST = { id: "blank-inheritance", esmodules: ["scripts/blank-inheritance.mjs"], styles: ["styles/b.css", "styles/a.css"], languages: [{ lang: "en", path: "lang/en.json" }] };

function maps(overrides = {}) {
  return {
    module: new Map([["scripts/blank-inheritance.mjs", "h1"], ["assets/scenes/x.webp", "h2"], ["module.json", "h3"]]),
    data: new Map([["episodes/episode-c1e1-mothers-maiden-name.json", "d1"], ["episodes/episode-c1e2-scheduled-exercise.json", "d2"], ["campaign/scene-set.json", "d3"]]),
    video: new Map([["opening-full.mp4", "v1"]]),
    ...overrides
  };
}

const SENT = { module: ["scripts/blank-inheritance.mjs"], data: ["campaign/scene-set.json"], video: [] };

test("fingerprint: the same files give the same answer whatever order they were read in", () => {
  const a = new Map([["b", "2"], ["a", "1"]]);
  const b = new Map([["a", "1"], ["b", "2"]]);
  assert.equal(fingerprint(a), fingerprint(b));
  assert.notEqual(fingerprint(a), fingerprint(new Map([["a", "1"], ["b", "3"]])));
  assert.match(fingerprint(a), /^[0-9a-f]{16}$/);
});

test("isModuleCodePath/codeMap: scripts, templates, styles, lang and module.json are code; assets are not", () => {
  for (const p of ["module.json", "scripts/x.mjs", "templates/a.hbs", "styles/a.css", "lang/en.json"]) assert.ok(isModuleCodePath(p), p);
  for (const p of ["assets/scenes/x.webp", "data/srd-index.json", "README.md"]) assert.ok(!isModuleCodePath(p), p);
  assert.deepEqual([...codeMap(maps().module).keys()].sort(), ["module.json", "scripts/blank-inheritance.mjs"]);
});

test("manifestFiles: lists what the manifest names, sorted, whatever shape each entry takes", () => {
  assert.deepEqual(manifestFiles(MANIFEST), {
    esmodules: ["scripts/blank-inheritance.mjs"],
    styles: ["styles/a.css", "styles/b.css"],
    languages: ["lang/en.json"]
  });
  assert.deepEqual(manifestFiles(null), { esmodules: [], styles: [], languages: [] });
});

test("episodePaths: every episode file in the data, so no hand-kept list can fall behind", () => {
  assert.deepEqual(episodePaths(maps().data), [
    "episodes/episode-c1e1-mothers-maiden-name.json",
    "episodes/episode-c1e2-scheduled-exercise.json"
  ]);
});

test("composeStamp: a first deploy records what was sent and starts the history", () => {
  const { stamp, unchanged } = composeStamp({ now: NOW, git: GIT, maps: maps(), manifest: MANIFEST, sent: SENT });
  assert.equal(unchanged, false);
  assert.match(stamp.id, /^[0-9a-f]{16}$/);
  assert.equal(stamp.deployedAt, "2026-09-27T15:00:00.000Z");
  assert.deepEqual(stamp.git, GIT);
  assert.equal(stamp.module.files, 3);
  assert.equal(stamp.data.files, 3);
  assert.equal(stamp.video.files, 1);
  assert.deepEqual(stamp.episodes.length, 2);
  assert.equal(stamp.history.length, 1);
  assert.deepEqual(stamp.history[0].changed, ["data:campaign/scene-set.json", "module:scripts/blank-inheritance.mjs"]);
});

test("composeStamp: the same content again is UNCHANGED -- no new history entry, the old deploy time kept", () => {
  const first = composeStamp({ now: NOW, git: GIT, maps: maps(), manifest: MANIFEST, sent: SENT }).stamp;
  const later = new Date("2026-09-27T16:00:00Z");
  const { stamp, unchanged } = composeStamp({ now: later, git: GIT, maps: maps(), manifest: MANIFEST, sent: { module: [], data: [], video: [] }, previous: first });
  assert.equal(unchanged, true);
  assert.equal(stamp.id, first.id);
  assert.equal(stamp.deployedAt, first.deployedAt);
  assert.equal(stamp.history.length, 1);
});

test("composeStamp: any content change gives a new id and a new history entry, newest first", () => {
  const first = composeStamp({ now: NOW, git: GIT, maps: maps(), manifest: MANIFEST, sent: SENT }).stamp;
  const changedData = new Map(maps().data).set("campaign/scene-set.json", "d3-new");
  const { stamp, unchanged } = composeStamp({
    now: new Date("2026-09-27T16:00:00Z"),
    git: GIT,
    maps: maps({ data: changedData }),
    manifest: MANIFEST,
    sent: { module: [], data: ["campaign/scene-set.json"], video: [] },
    previous: first
  });
  assert.equal(unchanged, false);
  assert.notEqual(stamp.id, first.id);
  assert.equal(stamp.history.length, 2);
  assert.equal(stamp.history[0].id, stamp.id);
  assert.equal(stamp.history[1].id, first.id);
});

test("composeStamp: a prune alone is a change worth recording, even if the kept files are identical", () => {
  const first = composeStamp({ now: NOW, git: GIT, maps: maps(), manifest: MANIFEST, sent: SENT }).stamp;
  const { stamp, unchanged } = composeStamp({
    now: NOW, git: GIT, maps: maps(), manifest: MANIFEST, sent: { module: [], data: [], video: [] }, removed: ["data:campaign/ground-roles.json"], previous: first
  });
  assert.equal(unchanged, false);
  assert.deepEqual(stamp.history[0].removed, ["data:campaign/ground-roles.json"]);
});

test("composeStamp: the history is capped, dropping the oldest", () => {
  let previous = null;
  for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
    const data = new Map(maps().data).set("campaign/scene-set.json", `d-${i}`);
    previous = composeStamp({ now: NOW, git: GIT, maps: maps({ data }), manifest: MANIFEST, sent: SENT, previous }).stamp;
  }
  assert.equal(previous.history.length, HISTORY_LIMIT);
});

test("composeStamp: the code fingerprint moves only when code moves, never for art", () => {
  const base = composeStamp({ now: NOW, git: GIT, maps: maps(), manifest: MANIFEST, sent: SENT }).stamp;
  const newArt = new Map(maps().module).set("assets/scenes/x.webp", "h2-new");
  const newCode = new Map(maps().module).set("scripts/blank-inheritance.mjs", "h1-new");
  assert.equal(composeStamp({ now: NOW, git: GIT, maps: maps({ module: newArt }), manifest: MANIFEST, sent: SENT }).stamp.module.code, base.module.code);
  assert.notEqual(composeStamp({ now: NOW, git: GIT, maps: maps({ module: newCode }), manifest: MANIFEST, sent: SENT }).stamp.module.code, base.module.code);
});

test("composeStamp: a deploy that changes only Stagecraft is new code: a new id and a new code fingerprint", () => {
  // regression, 2026-10-03: Stagecraft was not in the stamp, so a fix to it alone left every open page as it was, with no
  // prompt to reload
  const sc = new Map([["dist/stagecraft.js", "s1"], ["lang/en.json", "s2"]]);
  const first = composeStamp({ now: NOW, git: GIT, maps: maps({ stagecraft: sc }), manifest: MANIFEST, sent: SENT }).stamp;
  assert.equal(first.stagecraft.files, 2);
  const fixed = new Map(sc).set("dist/stagecraft.js", "s1-new");
  const { stamp, unchanged } = composeStamp({
    now: NOW, git: GIT, maps: maps({ stagecraft: fixed }), manifest: MANIFEST, sent: { module: [], data: [], video: [], stagecraft: ["dist/stagecraft.js"] }, previous: first
  });
  assert.equal(unchanged, false);
  assert.notEqual(stamp.id, first.id);
  assert.notEqual(stamp.module.code, first.module.code, "an open page is told to reload");
  assert.deepEqual(stamp.history[0].changed, ["stagecraft:dist/stagecraft.js"]);
  // and with Stagecraft unchecked, its last fingerprint is carried, so nothing moves
  const carried = composeStamp({ now: NOW, git: GIT, maps: maps({ stagecraft: null }), manifest: MANIFEST, sent: { module: [], data: [], video: [] }, previous: stamp });
  assert.equal(carried.unchanged, true);
  assert.deepEqual(carried.stamp.stagecraft, stamp.stagecraft);
});

test("composeStamp: with the videos unchecked (--no-video) the previous video fingerprint is carried, so the id does not move", () => {
  const first = composeStamp({ now: NOW, git: GIT, maps: maps(), manifest: MANIFEST, sent: SENT }).stamp;
  const { stamp, unchanged } = composeStamp({ now: NOW, git: GIT, maps: maps({ video: null }), manifest: MANIFEST, sent: { module: [], data: [], video: [] }, previous: first });
  assert.equal(unchanged, true);
  assert.deepEqual(stamp.video, first.video);
});
