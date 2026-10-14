// Tests tools/module-sync/autosync-plan.mjs -- the pure half of the auto-sync
// watcher. Written 2026-10-07 with the watcher itself, at Ingram's standing
// instruction that local changes always reach the server without anyone
// running a deploy. The daemon (autosync.mjs) is the adapter and is exercised
// live; everything that decides WHEN and WHAT is here.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyPath,
  createChangeFilter,
  createScheduler,
  daemonAlive,
  DEFAULT_TIMING,
  deployFlags,
  kindsFromDiff,
  statusLine,
  summariseDeployOutput,
  WATCH_ROOTS
} from "../../tools/module-sync/autosync-plan.mjs";

const T = DEFAULT_TIMING;

// -- what counts as a change -------------------------------------------------

test("classifyPath: module files ship, except storage/ and data/campaign/, which are not this repo's to send", () => {
  assert.deepEqual(classifyPath("module/blank-inheritance/scripts/core/admin.mjs"), { lane: "deploy", kind: "module" });
  assert.deepEqual(classifyPath("module\\blank-inheritance\\styles\\bi-check.css"), { lane: "deploy", kind: "module" });
  assert.equal(classifyPath("module/blank-inheritance/storage/notebook.json"), null);
  assert.equal(classifyPath("module/blank-inheritance/data/campaign/scene-set.json"), null);
});

test("classifyPath: only the files the server needs from Stagecraft count, and not its tests or node_modules", () => {
  for (const f of ["scripts/core/stage.mjs", "dist/stagecraft.js", "module.json", "lang/en.json", "styles/stagecraft.css", "LICENSE"]) {
    assert.deepEqual(classifyPath(`module/stagecraft/${f}`), { lane: "deploy", kind: "stagecraft" }, f);
  }
  for (const f of ["test/feel.test.mjs", "dist/BUILD.json", "node_modules/three/build/three.js", "API.md", "package.json"]) {
    assert.equal(classifyPath(`module/stagecraft/${f}`), null, f);
  }
});

test("classifyPath: data counts only inside the allow-list, the registry is its own kind, and the stamp is never ours", () => {
  assert.deepEqual(classifyPath("data/scene-briefs/the-road-in.json"), { lane: "deploy", kind: "data" });
  assert.deepEqual(classifyPath("data/campaign/scene-set.json"), { lane: "deploy", kind: "data" });
  assert.deepEqual(classifyPath("data/campaign/asset-registry.json"), { lane: "deploy", kind: "registry" });
  assert.deepEqual(classifyPath("data/map/travel-graph.json"), { lane: "deploy", kind: "data" });
  assert.equal(classifyPath("data/map/campaign-map.gpkg"), null, "115 MB of GIS source is not synced");
  assert.equal(classifyPath("data/generated/node-index.json"), null);
  assert.equal(classifyPath("data/campaign/build.json"), null);
});

test("classifyPath: canon text is a reason to rebuild data; the opening renders count only as mp4; audio is its own lane", () => {
  assert.deepEqual(classifyPath("canon/scenes/episode-c1e1--canteen.json"), { lane: "deploy", kind: "canon" });
  assert.deepEqual(classifyPath("canon/world/watcher.md"), { lane: "deploy", kind: "canon" }, "told-facts.json is built from world facts");
  assert.equal(classifyPath("canon/sources/some-scan.pdf"), null);
  assert.deepEqual(classifyPath("artwork/title-sequences/opening/renders/opening-full.mp4"), { lane: "deploy", kind: "video" });
  assert.equal(classifyPath("artwork/title-sequences/opening/renders/opening-so-far-14.log"), null);
  assert.deepEqual(classifyPath("audio/library/music/theme.ogg"), { lane: "audio", kind: "audio" });
});

test("classifyPath: editor droppings, git internals, our own state and everything unrelated are ignored", () => {
  for (const f of [
    "module/blank-inheritance/scripts/core/admin.mjs~",
    "module/blank-inheritance/scripts/.#admin.mjs",
    "module/blank-inheritance/scripts/core/admin.mjs.swp",
    "data/campaign/overview.json.tmp",
    "data/campaign/~$overview.json",
    ".git/index",
    "tools/module-sync/.autosync/state.json",
    "design/ux-doctrine.md",
    "tools/battle-simulator/shared/rng.mjs",
    "",
    null
  ]) {
    assert.equal(classifyPath(f), null, String(f));
  }
});

test("every watch root is a place classifyPath can produce a lane for", () => {
  const probes = { "module/blank-inheritance": "scripts/a.mjs", "module/stagecraft": "scripts/a.mjs", data: "scene-briefs/a.json", canon: "scenes/a.json", "artwork/title-sequences/opening/renders": "a.mp4", "artwork/title-sequences/episode-titles": "a.mp4", "audio/library": "a.ogg" };
  assert.deepEqual([...WATCH_ROOTS].sort(), Object.keys(probes).sort());
  for (const [root, file] of Object.entries(probes)) assert.ok(classifyPath(`${root}/${file}`), root);
});

// -- what flags a deploy gets ------------------------------------------------

test("deployFlags: a plain edit skips the slow video and art steps; touching either brings it back; --prune is never added", () => {
  assert.deepEqual(deployFlags(new Set(["module", "data"])), ["--no-video", "--no-art"]);
  assert.deepEqual(deployFlags(new Set(["video"])), ["--no-art"]);
  assert.deepEqual(deployFlags(new Set(["registry"])), ["--no-video"]);
  assert.deepEqual(deployFlags(new Set(["video", "registry"])), []);
  for (const kinds of [new Set(), new Set(["module"]), new Set(["video", "registry"])]) assert.ok(!deployFlags(kinds).includes("--prune"));
});

test("kindsFromDiff: the startup comparison implies the same kinds a live edit would", () => {
  const kinds = kindsFromDiff({
    changed: ["module:scripts/a.mjs", "data:campaign/asset-registry.json"],
    added: ["stagecraft:dist/stagecraft.js", "video:opening-full.mp4"],
    removed: ["data:scene-briefs/x.json"]
  });
  assert.deepEqual([...kinds].sort(), ["data", "module", "registry", "stagecraft", "video"]);
  assert.deepEqual([...kindsFromDiff({ changed: [], added: [], removed: [] })], []);
  assert.deepEqual([...kindsFromDiff(null)], []);
});

// -- reads are not changes ------------------------------------------------------

test("createChangeFilter: an event for a file nobody wrote to (a last-access report from our own hashing) is not a change", () => {
  // Regression, 2026-10-07: with NTFS last-access updates on, reading a file to hash it fires a watcher event, and the
  // daemon woke itself to re-check the files it had just read.
  const disk = new Map([["data/a.json", "100:5"], ["audio/library/a.ogg", "200:900"]]);
  const filter = createChangeFilter((rel) => disk.get(rel) ?? null);
  filter.know("data/a.json");
  filter.know("audio/library/a.ogg");
  assert.equal(filter.changed("data/a.json"), false, "an access-time event: size and mtime are as they were");
  assert.equal(filter.changed("audio/library/a.ogg"), false);
});

test("createChangeFilter: a real write, a new file and a deletion each count, once", () => {
  const disk = new Map([["data/a.json", "100:5"]]);
  const filter = createChangeFilter((rel) => disk.get(rel) ?? null);
  filter.know("data/a.json");
  disk.set("data/a.json", "250:5");
  assert.equal(filter.changed("data/a.json"), true, "mtime moved");
  assert.equal(filter.changed("data/a.json"), false, "the same write reported twice is one change");
  disk.set("data/a.json", "250:9");
  assert.equal(filter.changed("data/a.json"), true, "size moved");
  disk.set("data/new.json", "300:1");
  assert.equal(filter.changed("data/new.json"), true, "a file never seen before");
  disk.delete("data/a.json");
  assert.equal(filter.changed("data/a.json"), true, "a file we knew has gone");
  assert.equal(filter.changed("data/a.json"), false, "and a second report of its absence is nothing");
});

test("createChangeFilter: directories and files that came and went unseen are not changes", () => {
  const disk = new Map([["data/sub", "dir"]]);
  const filter = createChangeFilter((rel) => disk.get(rel) ?? null);
  assert.equal(filter.changed("data/sub"), false, "a directory's mtime moves whenever a child does; the child reports itself");
  assert.equal(filter.changed("data/draft.json.tmp"), false, "never existed as far as we know");
});

// -- when a burst of changes has settled -------------------------------------

test("scheduler: nothing runs until the tree has been quiet, and every new edit restarts the wait", () => {
  const s = createScheduler();
  assert.deepEqual(s.next(0), { run: null, wakeAt: null }, "idle with nothing pending");
  s.noteEvent("deploy", "module", 1000);
  assert.deepEqual(s.next(1000 + T.quietMs - 1), { run: null, wakeAt: 1000 + T.quietMs });
  s.noteEvent("deploy", "data", 1000 + T.quietMs - 1);
  assert.equal(s.next(1000 + T.quietMs).run, null, "a second edit pushed the quiet window out");
  assert.equal(s.next(1000 + T.quietMs - 1 + T.quietMs).run, "deploy");
});

test("scheduler: start() hands over every kind that was pending and leaves nothing behind", () => {
  const s = createScheduler();
  s.noteEvent("deploy", "module", 0);
  s.noteEvent("deploy", "registry", 5);
  assert.deepEqual([...s.start("deploy", 100_000)].sort(), ["module", "registry"]);
  assert.equal(s.snapshot().deploy.pending, false);
  assert.equal(s.next(500_000).run, null);
});

test("scheduler: an edit DURING a deploy is not lost -- it is pending again once the deploy ends", () => {
  const s = createScheduler();
  s.noteEvent("deploy", "module", 0);
  s.start("deploy", T.quietMs);
  s.noteEvent("deploy", "data", T.quietMs + 5000);
  assert.equal(s.next(T.quietMs + 6000).run, null, "never two deploys at once");
  s.finish("deploy", true, T.quietMs + 20_000);
  assert.equal(s.snapshot().deploy.pending, true);
  assert.equal(s.next(T.quietMs + 5000 + T.quietMs).run, null, "but the minimum gap since the last start still holds");
  assert.equal(s.next(T.quietMs + T.minGapMs).run, "deploy");
});

test("scheduler: two deploys never start closer together than the minimum gap, however busy the tree is", () => {
  const s = createScheduler();
  s.noteEvent("deploy", "module", 0);
  s.start("deploy", T.quietMs);
  s.finish("deploy", true, T.quietMs + 1000);
  s.noteEvent("deploy", "module", T.quietMs + 2000);
  assert.deepEqual(s.next(T.quietMs + 2000 + T.quietMs), { run: null, wakeAt: T.quietMs + T.minGapMs });
  assert.equal(s.next(T.quietMs + T.minGapMs).run, "deploy");
});

test("scheduler: a failure keeps what it took, waits a growing delay, and a success forgets the failures", () => {
  const s = createScheduler();
  s.noteEvent("deploy", "registry", 0);
  let now = T.quietMs;
  s.start("deploy", now);
  s.finish("deploy", false, now + 1000);
  assert.deepEqual(s.snapshot().deploy.kinds, ["registry"], "the failed deploy's needs are still pending");
  assert.equal(s.snapshot().deploy.failures, 1);
  const first = s.snapshot().deploy.retryAt;
  assert.equal(first, now + 1000 + T.retryMs[0]);
  assert.equal(s.next(first - 1).run, null);
  now = Math.max(first, T.quietMs + T.minGapMs);
  assert.equal(s.next(now).run, "deploy", "retries on its own, with no new edit");
  s.start("deploy", now);
  s.finish("deploy", false, now + 1000);
  assert.equal(s.snapshot().deploy.retryAt, now + 1000 + T.retryMs[1]);
  for (let i = 0; i < 10; i++) {
    s.start("deploy", now);
    s.finish("deploy", false, now);
  }
  assert.equal(s.snapshot().deploy.retryAt, now + T.retryMs.at(-1), "the delay stops growing at the last step");
  s.start("deploy", now);
  s.finish("deploy", true, now);
  assert.equal(s.snapshot().deploy.failures, 0);
  assert.equal(s.snapshot().deploy.retryAt, null);
});

test("scheduler: a new edit cancels the backoff -- the person may just have fixed what was refused", () => {
  const s = createScheduler();
  s.noteEvent("deploy", "module", 0);
  s.start("deploy", T.quietMs);
  s.finish("deploy", false, T.quietMs + 500);
  assert.ok(s.snapshot().deploy.retryAt > T.quietMs + 500);
  const edited = T.quietMs + 5000;
  s.noteEvent("deploy", "module", edited);
  assert.equal(s.snapshot().deploy.retryAt, null);
  assert.equal(s.next(Math.max(edited + T.quietMs, T.quietMs + T.minGapMs)).run, "deploy");
});

test("scheduler: pause holds everything and loses nothing; resume lets it run", () => {
  const s = createScheduler();
  s.noteEvent("deploy", "module", 0);
  s.noteEvent("audio", "audio", 0);
  assert.deepEqual(s.next(10 * 60_000, { paused: true }), { run: null, wakeAt: null });
  assert.equal(s.snapshot().deploy.pending, true);
  assert.equal(s.next(10 * 60_000, { paused: false }).run, "deploy");
});

test("scheduler: audio waits its own, longer quiet period and is not held back by the deploy gap; deploy goes first when both are ready", () => {
  const s = createScheduler();
  s.noteEvent("audio", "audio", 0);
  assert.equal(s.next(T.quietMs).run, null, "ffmpeg is probably still writing");
  assert.equal(s.next(T.audioQuietMs).run, "audio");
  s.noteEvent("deploy", "module", 0);
  assert.equal(s.next(T.audioQuietMs).run, "deploy");
});

test("scheduler: a stale comparison queues a deploy but does not keep pushing an open quiet window later", () => {
  const s = createScheduler();
  s.markStale("deploy", new Set(["module"]), 1000);
  s.markStale("deploy", new Set(["data"]), 1000 + T.quietMs - 1);
  assert.equal(s.next(1000 + T.quietMs).run, "deploy");
  assert.deepEqual([...s.start("deploy", 1000 + T.quietMs)].sort(), ["data", "module"]);
});

// -- the daemon describing itself --------------------------------------------

test("daemonAlive: needs a live pid AND a recent heartbeat, so a reused pid after a reboot is not mistaken for the daemon", () => {
  const state = { pid: 4242, heartbeat: 100_000 };
  assert.equal(daemonAlive(state, 110_000, () => true), true);
  assert.equal(daemonAlive(state, 110_000, () => false), false, "pid gone");
  assert.equal(daemonAlive(state, 100_000 + 61_000, () => true), false, "heartbeat stale");
  assert.equal(daemonAlive(null, 0, () => true), false);
  assert.equal(daemonAlive({ pid: 1 }, 0, () => true), false, "no heartbeat");
});

test("summariseDeployOutput: keeps the verdict and the reason a refusal gave, drops the file-by-file noise", () => {
  const out = [
    "=== 0. Preflight: can the module about to be pushed actually load? ===",
    "  ERROR: styles/bi-agreement.css is named in module.json but is not there",
    "REFUSED: 1 preflight error(s). Nothing was sent.",
    "=== 1. module: 900 local file(s) -> /x ===",
    "    changed  scripts/a.mjs"
  ].join("\n");
  assert.deepEqual(summariseDeployOutput(out), ["ERROR: styles/bi-agreement.css is named in module.json but is not there", "REFUSED: 1 preflight error(s). Nothing was sent."]);
  assert.deepEqual(summariseDeployOutput("DEPLOYED build 0123456789abcdef. The module brings the world up to date by itself"), ["DEPLOYED build 0123456789abcdef. The module brings the world up to date by itself"]);
  assert.deepEqual(summariseDeployOutput(""), []);
});

test("statusLine: says whether it is running, paused, waiting, or failed, and why", () => {
  const now = Date.UTC(2026, 9, 7, 12, 0);
  const alive = { alive: true, paused: false, now };
  assert.match(statusLine(null, { alive: false, paused: false, now }), /not running/);
  assert.match(statusLine({ pid: 7, deploy: {} }, alive), /watching, pid 7; no deploy yet this run\.$/);
  assert.match(statusLine({ pid: 7, deploy: { lastAt: now - 60_000, ok: true, build: "abc123" } }, alive), /last deploy 2026-10-07 11:59 UTC, pushed build abc123\.$/);
  assert.match(statusLine({ pid: 7, deploy: { lastAt: now - 60_000, ok: false, summary: ["REFUSED: 1 preflight error(s)."] } }, alive), /FAILED \(REFUSED: 1 preflight error\(s\)\.\)/);
  assert.match(statusLine({ pid: 7, deploy: { pending: true, retryAt: now + 30_000 } }, alive), /changes waiting, retry 2026-10-07 12:00 UTC/);
  assert.match(statusLine({ pid: 7, deploy: { running: true } }, alive), /deploying now/);
  assert.match(statusLine({ pid: 7, deploy: {} }, { ...alive, paused: true }), /PAUSED/);
  assert.match(statusLine({ pid: 7, deploy: {}, audio: { lastAt: now, ok: false } }, alive), /audio upload FAILED/);
});
