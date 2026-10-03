// Tests tools/module-sync/deploy.mjs's runDeploy() -- offline, against a
// small in-memory server that behaves like the real one where the deploy can
// tell: files land where they are sent, a checksum listing of a directory
// includes everything nested under it, deletions delete. Passed in by
// parameter injection, the same way every other script in tools/module-sync
// is tested (see sync-harvest.test.mjs's header for why not mock.module()).
//
// The repo is a throwaway tree built per test: a minimal loadable module, a
// few campaign-data files and two small stand-in videos.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { runDeploy, videoSources } from "../../tools/module-sync/deploy.mjs";
import { captureConsole } from "../support/capture-console.mjs";

const MODULE_REMOTE = "/srv/Data/modules/blank-inheritance";
const DATA_REMOTE = `${MODULE_REMOTE}/data/campaign`;
const VIDEO_REMOTE = "/srv/Data/blank-inheritance-video";
const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

/** An in-memory server: absolute remote path -> file contents. */
function fakeServer(seed = {}) {
  const files = new Map(Object.entries(seed).map(([p, content]) => [p, Buffer.from(content)]));
  const calls = { uploadFiles: [], deleteRemoteFiles: [] };
  // Paths whose next upload arrives corrupted, to prove a mismatch is caught.
  const corruptNext = new Set();
  const under = (dir) => [...files.keys()].filter((p) => p.startsWith(`${dir}/`));
  return {
    files,
    calls,
    corruptNext,
    remote: {
      async uploadFiles({ remoteDir, files: sources }) {
        calls.uploadFiles.push({ remoteDir, paths: [...sources.keys()] });
        for (const [relative, local] of sources) {
          const target = `${remoteDir}/${relative}`;
          files.set(target, corruptNext.delete(target) ? Buffer.from("corrupted") : readFileSync(local));
        }
      },
      async remoteChecksums({ remoteDir }) {
        return new Map(under(remoteDir).map((p) => [p.slice(remoteDir.length + 1), sha(files.get(p))]));
      },
      async remoteDirectoryExists({ remoteDir }) {
        return under(remoteDir).length > 0;
      },
      async deleteRemoteFiles({ remoteDir, paths }) {
        calls.deleteRemoteFiles.push({ remoteDir, paths: [...paths] });
        for (const p of paths) files.delete(`${remoteDir}/${p}`);
      },
      async readRemoteText({ remotePath }) {
        return files.has(remotePath) ? files.get(remotePath).toString("utf8") : null;
      }
    }
  };
}

async function repoTree(extra = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "bi-deploy-"));
  const layout = {
    "module/blank-inheritance/module.json": JSON.stringify({ id: "blank-inheritance", esmodules: ["scripts/main.mjs"], styles: ["styles/a.css"] }),
    "module/blank-inheritance/scripts/main.mjs": "export const x = 1;\n",
    "module/blank-inheritance/styles/a.css": "body {}\n",
    "module/blank-inheritance/assets/scenes/e1-scene.webp": "art",
    // Never pushed: Foundry's own write channel, and the data channel's local mirror.
    "module/blank-inheritance/storage/sessions/local.json": "{}",
    "module/blank-inheritance/data/campaign/episodes/stale-local-copy.json": "{}",
    "data/campaign/scene-set.json": JSON.stringify({ scenes: [{ id: "e1-scene", art: "e1-scene" }] }),
    "data/episodes/episode-c1e1-mothers-maiden-name.json": "{}",
    "data/scene-briefs/episode-c1e1--from-up-here.json": "{}",
    // Not on the allow-list: must never be pushed.
    "data/schema/scene-set.schema.json": "{}",
    "artwork/title-sequences/opening/renders/opening-full.mp4": "full",
    "artwork/title-sequences/opening/renders/opening-reduced.mp4": "reduced",
    "artwork/title-sequences/opening/renders/opening-so-far-14.mp4": "a draft",
    "artwork/title-sequences/episode-titles/episode-c1e1-mothers-maiden-name.mp4": "card",
    ...extra
  };
  for (const [relative, content] of Object.entries(layout)) {
    const file = path.join(root, relative);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
  }
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

function config(root, overrides = {}) {
  return {
    repoRoot: root,
    remoteHost: "ubuntu@test",
    keyPath: "unused.ppk",
    hostKey: "SHA256:unused",
    moduleRemoteDir: MODULE_REMOTE,
    videoRemoteDir: VIDEO_REMOTE,
    recordPath: path.join(root, ".last-deploy.json"),
    dryRun: false,
    prune: false,
    video: true,
    syntax: false,
    // Off by default here, same reasoning as syntax: false above -- this
    // suite's throwaway repo tree has no tools/token-ring/ at all, and the
    // real stageNpcArt would shell out to python against a real registry
    // that doesn't exist in it. Tests that want to exercise the art step
    // pass their own deps.stageNpcArt (or the reverse, art: true with no
    // mock, to prove a real failure is caught) explicitly.
    art: false,
    ...overrides
  };
}

const DEPS = { gitInfo: async () => ({ commit: "abc1234", uncommitted: 0 }), now: () => new Date("2026-09-27T15:00:00Z") };

async function deploy(cfg, server, deps = DEPS) {
  const capture = captureConsole();
  const saved = process.exitCode;
  process.exitCode = undefined;
  try {
    const result = await runDeploy(cfg, server.remote, { ...deps, log: console.log });
    return { result, lines: capture.lines, exitCode: process.exitCode };
  } finally {
    capture.restore();
    process.exitCode = saved;
  }
}

const stampOn = (server) => JSON.parse(server.files.get(`${DATA_REMOTE}/build.json`).toString("utf8"));

test("deploy: a first deploy sends module, data and videos, verifies them, and writes the stamp last", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  try {
    const { result, exitCode } = await deploy(config(repo.root), server);
    assert.equal(result.ok, true);
    assert.equal(exitCode, undefined);

    assert.deepEqual([...server.files.keys()].filter((p) => p.startsWith(`${MODULE_REMOTE}/`) && !p.startsWith(`${DATA_REMOTE}/`)).sort(), [
      `${MODULE_REMOTE}/assets/scenes/e1-scene.webp`,
      `${MODULE_REMOTE}/module.json`,
      `${MODULE_REMOTE}/scripts/main.mjs`,
      `${MODULE_REMOTE}/styles/a.css`
    ]);
    assert.deepEqual([...server.files.keys()].filter((p) => p.startsWith(`${DATA_REMOTE}/`)).sort(), [
      `${DATA_REMOTE}/build.json`,
      `${DATA_REMOTE}/campaign/scene-set.json`,
      `${DATA_REMOTE}/episodes/episode-c1e1-mothers-maiden-name.json`,
      `${DATA_REMOTE}/scene-briefs/episode-c1e1--from-up-here.json`
    ]);
    // The two finals under the names Foundry plays; never the draft.
    assert.deepEqual([...server.files.keys()].filter((p) => p.startsWith(`${VIDEO_REMOTE}/`)).sort(), [
      `${VIDEO_REMOTE}/episode-titles/episode-c1e1-mothers-maiden-name.mp4`,
      `${VIDEO_REMOTE}/opening-full.mp4`,
      `${VIDEO_REMOTE}/opening-reduced.mp4`
    ]);

    // The stamp is the very last upload.
    const last = server.calls.uploadFiles.at(-1);
    assert.deepEqual(last, { remoteDir: DATA_REMOTE, paths: ["build.json"] });
    const stamp = stampOn(server);
    assert.equal(stamp.id, result.stamp.id);
    assert.deepEqual(stamp.episodes, ["episodes/episode-c1e1-mothers-maiden-name.json"]);
    assert.ok(stamp.history[0].changed.includes("data:scene-briefs/episode-c1e1--from-up-here.json"));

    // And this machine's record, for the session-start line.
    const record = JSON.parse(readFileSync(path.join(repo.root, ".last-deploy.json"), "utf8"));
    assert.equal(record.id, stamp.id);
    assert.ok("scripts/main.mjs" in record.module);
    assert.ok("opening-full.mp4" in record.video);
  } finally {
    await repo.cleanup();
  }
});

test("deploy: a preflight error sends NOTHING and writes no stamp", async () => {
  const repo = await repoTree({
    "module/blank-inheritance/module.json": JSON.stringify({ id: "blank-inheritance", esmodules: ["scripts/main.mjs"], styles: ["styles/a.css", "styles/bi-agreement.css"] })
  });
  const server = fakeServer();
  try {
    const { result, lines, exitCode } = await deploy(config(repo.root), server);
    assert.equal(result.ok, false);
    assert.equal(exitCode, 1);
    assert.equal(server.calls.uploadFiles.length, 0);
    assert.equal(server.files.size, 0);
    assert.ok(lines.some((l) => l.includes("REFUSED")));
    assert.ok(result.errors.some((e) => e.includes("styles/bi-agreement.css")));
  } finally {
    await repo.cleanup();
  }
});

test("deploy: a second deploy with nothing changed sends nothing and leaves the stamp alone", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  try {
    await deploy(config(repo.root), server);
    const stampBefore = server.files.get(`${DATA_REMOTE}/build.json`).toString("utf8");
    server.calls.uploadFiles.length = 0;

    const { result } = await deploy(config(repo.root), server);
    assert.equal(result.ok, true);
    assert.equal(server.calls.uploadFiles.length, 0, "an unchanged tree must not re-upload anything, the stamp included");
    assert.equal(server.files.get(`${DATA_REMOTE}/build.json`).toString("utf8"), stampBefore);
  } finally {
    await repo.cleanup();
  }
});

test("deploy: only what changed is sent, and the new stamp says what it was", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  try {
    const first = (await deploy(config(repo.root), server)).result.stamp;
    await writeFile(path.join(repo.root, "data/scene-briefs/episode-c1e1--from-up-here.json"), '{"edited":true}');
    server.calls.uploadFiles.length = 0;

    const { result } = await deploy(config(repo.root), server);
    assert.deepEqual(server.calls.uploadFiles, [
      { remoteDir: DATA_REMOTE, paths: ["scene-briefs/episode-c1e1--from-up-here.json"] },
      { remoteDir: DATA_REMOTE, paths: ["build.json"] }
    ]);
    const stamp = stampOn(server);
    assert.notEqual(stamp.id, first.id);
    assert.deepEqual(stamp.history[0].changed, ["data:scene-briefs/episode-c1e1--from-up-here.json"]);
    assert.equal(stamp.history[1].id, first.id);
    assert.equal(result.ok, true);
  } finally {
    await repo.cleanup();
  }
});

test("deploy: a file that arrives wrong is a MISMATCH -- exit 1 and no stamp, so the world never updates to half a build", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  server.corruptNext.add(`${MODULE_REMOTE}/scripts/main.mjs`);
  try {
    const { result, lines, exitCode } = await deploy(config(repo.root), server);
    assert.equal(result.ok, false);
    assert.equal(exitCode, 1);
    assert.equal(server.files.has(`${DATA_REMOTE}/build.json`), false);
    assert.ok(lines.some((l) => l.includes("MISMATCH")));
    assert.ok(lines.some((l) => l.includes("NOT DEPLOYED")));
  } finally {
    await repo.cleanup();
  }
});

test("deploy: server-only files are reported, deleted only with --prune, and storage/, the stamp and videos are never touched", async () => {
  const repo = await repoTree();
  const server = fakeServer({
    [`${MODULE_REMOTE}/assets/scenes/old-lobby.png`]: "stale",
    [`${MODULE_REMOTE}/storage/sessions/2026-09-23.json`]: "{}",
    [`${DATA_REMOTE}/campaign/ground-roles.json`]: "{}",
    [`${VIDEO_REMOTE}/hand-placed.mp4`]: "someone's own"
  });
  try {
    const plain = await deploy(config(repo.root), server);
    assert.equal(plain.result.ok, true);
    assert.equal(server.calls.deleteRemoteFiles.length, 0, "no --prune, no deletions");
    assert.deepEqual(plain.result.channels.module.onlyRemote, ["assets/scenes/old-lobby.png"]);
    assert.deepEqual(plain.result.channels.data.onlyRemote, ["campaign/ground-roles.json"]);

    const pruned = await deploy(config(repo.root, { prune: true }), server);
    assert.equal(pruned.result.ok, true);
    assert.deepEqual(server.calls.deleteRemoteFiles, [
      { remoteDir: MODULE_REMOTE, paths: ["assets/scenes/old-lobby.png"] },
      { remoteDir: DATA_REMOTE, paths: ["campaign/ground-roles.json"] }
    ]);
    assert.ok(!server.files.has(`${MODULE_REMOTE}/assets/scenes/old-lobby.png`));
    assert.ok(!server.files.has(`${DATA_REMOTE}/campaign/ground-roles.json`));
    assert.ok(server.files.has(`${MODULE_REMOTE}/storage/sessions/2026-09-23.json`), "storage/ must never be pruned");
    assert.ok(server.files.has(`${DATA_REMOTE}/build.json`), "the stamp must never be pruned");
    assert.ok(server.files.has(`${VIDEO_REMOTE}/hand-placed.mp4`), "videos must never be pruned");
    assert.deepEqual(stampOn(server).history[0].removed, ["data:campaign/ground-roles.json", "module:assets/scenes/old-lobby.png"]);
  } finally {
    await repo.cleanup();
  }
});

test("deploy: --dry-run sends, deletes and stamps nothing", async () => {
  const repo = await repoTree();
  const server = fakeServer({ [`${DATA_REMOTE}/campaign/ground-roles.json`]: "{}" });
  try {
    const { result, lines } = await deploy(config(repo.root, { dryRun: true, prune: true }), server);
    assert.equal(result.ok, true);
    assert.equal(server.calls.uploadFiles.length, 0);
    assert.equal(server.calls.deleteRemoteFiles.length, 0);
    assert.equal(server.files.has(`${DATA_REMOTE}/build.json`), false);
    assert.ok(lines.some((l) => l.includes("would send")));
  } finally {
    await repo.cleanup();
  }
});

test("deploy: a changed manifest file list says the world must be relaunched", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  try {
    await deploy(config(repo.root), server);
    await writeFile(path.join(repo.root, "module/blank-inheritance/styles/b.css"), "p {}\n");
    await writeFile(
      path.join(repo.root, "module/blank-inheritance/module.json"),
      JSON.stringify({ id: "blank-inheritance", esmodules: ["scripts/main.mjs"], styles: ["styles/a.css", "styles/b.css"] })
    );
    const { lines } = await deploy(config(repo.root), server);
    assert.ok(lines.some((l) => l.includes("Foundry reads it only when a world launches")), lines.join("\n"));
    assert.ok(lines.some((l) => l.includes("sudo systemctl restart foundryvtt")), "the note must name the fix that works, not just the problem");
  } finally {
    await repo.cleanup();
  }
});

test("videoSources: the two finals by the names the module plays, every episode card, never a draft", async () => {
  const repo = await repoTree();
  try {
    assert.deepEqual([...videoSources(repo.root).keys()], [
      "opening-full.mp4",
      "opening-reduced.mp4",
      "episode-titles/episode-c1e1-mothers-maiden-name.mp4"
    ]);
  } finally {
    await repo.cleanup();
  }
});

/* --- Ingram's scene edits come first (design/scene-edits.md) ------------------ */

test("deploy: Ingram's scene edits are pulled and merged before anything is gathered to send", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  const order = [];
  try {
    const { result } = await deploy(config(repo.root, { sceneEdits: true }), server, {
      ...DEPS,
      sceneEdits: async ({ dryRun, repoRoot }) => {
        order.push(`edits dryRun=${dryRun} root=${repoRoot === repo.root}`);
        // What a merge does: her words land in the data file this deploy then sends.
        await writeFile(path.join(repo.root, "data/scene-briefs/episode-c1e1--from-up-here.json"), JSON.stringify({ title: "Her title" }));
        return { pulled: 1, reversions: [], unsettled: 0 };
      },
      preflight: async (...args) => {
        order.push("preflight");
        return { errors: [], warnings: [] };
      }
    });
    assert.equal(result.ok, true);
    assert.deepEqual(order, ["edits dryRun=false root=true", "preflight"]);
    const sent = server.files.get(`${DATA_REMOTE}/scene-briefs/episode-c1e1--from-up-here.json`).toString("utf8");
    assert.equal(JSON.parse(sent).title, "Her title", "the deploy carried her merged words");
  } finally {
    await repo.cleanup();
  }
});

test("deploy: CRITICAL -- if the repo holds older words than any of hers, NOTHING is sent", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  try {
    const { result, exitCode, lines } = await deploy(config(repo.root, { sceneEdits: true }), server, {
      ...DEPS,
      sceneEdits: async () => ({ pulled: 0, reversions: [{ file: "scene-briefs/episode-c1e1--from-up-here", path: "beats[come-east].readAloud", kind: "field", recordId: "x" }], unsettled: 0 })
    });
    assert.equal(result.ok, false);
    assert.equal(exitCode, 1);
    assert.equal(server.calls.uploadFiles.length, 0);
    assert.ok(lines.some((l) => l.includes("REFUSED") && l.includes("npm run edits -- restore")), lines.join("\n"));
  } finally {
    await repo.cleanup();
  }
});

test("deploy: with the pull switched off (--no-edits), the check that the repo holds her words still runs", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  let checked = false;
  try {
    const { result } = await deploy(config(repo.root, { sceneEdits: false }), server, {
      ...DEPS,
      checkReversions: () => {
        checked = true;
        return [{ file: "scene-briefs/x", path: "title", kind: "field", recordId: "y" }];
      }
    });
    assert.equal(checked, true);
    assert.equal(result.ok, false);
    assert.equal(server.calls.uploadFiles.length, 0);
  } finally {
    await repo.cleanup();
  }
});

test("deploy: the scene-edits ledger is sent LAST in the data channel, after the files whose edits it calls merged", async () => {
  const repo = await repoTree({
    "data/campaign/scene-edits.json": JSON.stringify({ id: "scene-edits", entries: {} }),
    "data/scene-briefs/episode-c1e2--zeta.json": "{}"
  });
  const server = fakeServer();
  try {
    const { result } = await deploy(config(repo.root), server);
    assert.equal(result.ok, true);
    const dataUpload = server.calls.uploadFiles.find((c) => c.remoteDir === DATA_REMOTE && c.paths.includes("campaign/scene-edits.json"));
    assert.equal(dataUpload.paths.at(-1), "campaign/scene-edits.json", dataUpload.paths.join(", "));
  } finally {
    await repo.cleanup();
  }
});

// 2026-09-29: art staging (tools/token-ring/'s two scripts). Real Python
// invocation is never exercised offline here -- deps.stageNpcArt is always
// injected, same parameter-injection reasoning as every other external call
// in this file (git, the scene-edits pull, preflight).

test("deploy: the art step runs BEFORE the module channel gathers its files, so whatever it just staged is actually sent", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  const order = [];
  try {
    const { result } = await deploy(config(repo.root, { art: true }), server, {
      ...DEPS,
      stageNpcArt: async (repoRoot) => {
        order.push("art");
        await mkdir(path.join(repoRoot, "module", "blank-inheritance", "assets", "tokens"), { recursive: true });
        await writeFile(path.join(repoRoot, "module", "blank-inheritance", "assets", "tokens", "manako.webp"), "ring-subject");
      }
    });
    assert.equal(result.ok, true);
    const moduleUpload = server.calls.uploadFiles.find((c) => c.remoteDir === MODULE_REMOTE);
    assert.ok(
      moduleUpload.paths.includes("assets/tokens/manako.webp"),
      "a file the art step wrote must be picked up by the module channel's own file listing, not require a second run"
    );
  } finally {
    await repo.cleanup();
  }
});

test("deploy: art step OFF (default in this suite, --no-art for real use) never calls stageNpcArt at all", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  let called = false;
  try {
    const { result } = await deploy(config(repo.root), server, { ...DEPS, stageNpcArt: async () => { called = true; } });
    assert.equal(result.ok, true);
    assert.equal(called, false);
  } finally {
    await repo.cleanup();
  }
});

test("deploy: CRITICAL -- a failed art step refuses the whole deploy, same as a failed preflight; nothing is sent", async () => {
  const repo = await repoTree();
  const server = fakeServer();
  try {
    const { result, exitCode } = await deploy(config(repo.root, { art: true }), server, {
      ...DEPS,
      stageNpcArt: async () => {
        throw new Error("1 staged, 1 missing -> assets/tokens (a registered portrait file does not exist on disk)");
      }
    });
    assert.equal(result.ok, false);
    assert.equal(exitCode, 1);
    assert.match(result.errors.join(" "), /staging npc\/creature art failed/);
    assert.equal(server.calls.uploadFiles.length, 0, "nothing must be sent once the art step has failed");
  } finally {
    await repo.cleanup();
  }
});

// ---------------------------------------------------------------------------
// The Stagecraft module is a second module the adventure uses; one deploy carries it.

import { gatherChannels, stagecraftSources, staleStagecraftBundle, DEFAULT_CONFIG, REPO_ROOT } from "../../tools/module-sync/deploy.mjs";

test("the real repo's Stagecraft release is its manifest, licence, built bundle, language and style, and nothing else", async () => {
  const sources = await stagecraftSources(REPO_ROOT);
  assert.deepEqual([...sources.keys()].sort(), ["LICENSE", "dist/stagecraft.js", "lang/en.json", "module.json", "styles/stagecraft.css"]);
});

test("a deploy has a stagecraft channel, to its own folder, that is never pruned; a repo without the module has none", async () => {
  const channels = await gatherChannels({ ...DEFAULT_CONFIG, video: false });
  const c = channels.find((x) => x.name === "stagecraft");
  assert.ok(c, "the channel is there");
  assert.match(c.remoteDir, /\/modules\/stagecraft$/);
  assert.equal(c.prunable, false);
  const bare = await mkdtemp(path.join(os.tmpdir(), "no-stagecraft-"));
  try {
    await mkdir(path.join(bare, "module", "blank-inheritance"), { recursive: true });
    await mkdir(path.join(bare, "data"), { recursive: true });
    assert.equal((await gatherChannels({ ...DEFAULT_CONFIG, repoRoot: bare, video: false })).some((x) => x.name === "stagecraft"), false);
    assert.equal(await staleStagecraftBundle(bare), null, "nothing to be stale");
  } finally {
    await rm(bare, { recursive: true, force: true });
  }
});

test("the repo's own bundle is fresh, and a missing or dev bundle is refused with a sentence that says what to run", async () => {
  assert.equal(await staleStagecraftBundle(REPO_ROOT), null, "run npm run build:stagecraft if this fails");
  const fake = await mkdtemp(path.join(os.tmpdir(), "stale-stagecraft-"));
  try {
    await mkdir(path.join(fake, "module", "stagecraft", "dist"), { recursive: true });
    await writeFile(path.join(fake, "module", "stagecraft", "module.json"), "{}");
    assert.match(await staleStagecraftBundle(fake), /no bundle: run npm run build:stagecraft/);
  } finally {
    await rm(fake, { recursive: true, force: true });
  }
});
