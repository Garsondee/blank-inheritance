#!/usr/bin/env node
/**
 * `npm run deploy` -- one command that puts everything the campaign needs on
 * the live Foundry server, proves it arrived, and tells the running module
 * about it.
 *
 * WHY ONE COMMAND, 2026-09-27. Three pushes existed (module code, campaign
 * data, audio) and a fourth kind of file (the opening titles) had none. Each
 * session pushed whichever part it had touched, sometimes as a hand-picked
 * subset. The server drifted days behind the repo: Scene 0 ("From Up Here")
 * was authored on 24 September and never reached it, the opening-title videos
 * never reached it, and a subset push on 26 September sent a module.json
 * naming a stylesheet it did not send, which made Foundry reject the whole
 * module at the next launch. This pushes all of it, every time, as one
 * consistent set:
 *
 *   0. edits       -- pull Ingram's Scene Runner edits off the server and merge
 *                     them into data/ first, so this deploy carries them; and
 *                     REFUSE if the repo has gone back to older words than any
 *                     of hers (tools/scene-edits, design/scene-edits.md). Her
 *                     critical requirement, 2026-09-27: "things I rewrite
 *                     don't get overwritten by the old content."
 *      preflight   -- refuse a module that could not load (preflight.mjs)
 *      art         -- tools/token-ring/'s two staging scripts, run against
 *                     data/campaign/asset-registry.json before anything is
 *                     gathered to send: an NPC's token-ring subject and its
 *                     Actor/frame portrait, so registering a portrait and
 *                     running this one command is genuinely the whole
 *                     process (Ingram, 2026-09-29 -- see the block comment
 *                     in scripts/foundry/sync.mjs, where REAL_NPC_PATHS used
 *                     to live, for the full reasoning). REFUSES the deploy on
 *                     failure, same as preflight: a silent partial miss here
 *                     is exactly the unreliable result this exists to end.
 *   1. module      -- module/blank-inheritance/ -> Data/modules/blank-inheritance/
 *   2. data        -- the campaign-data allow-list -> .../data/campaign/
 *   3. video       -- the finished opening titles and episode title cards
 *                     -> Data/blank-inheritance-video/
 *      stagecraft  -- module/stagecraft/'s release files (manifest, licence,
 *                     the built bundle, language and style) -> Data/modules/
 *                     stagecraft/. A second, separate module the adventure
 *                     uses through its bridge (design/stagecraft/module.md).
 *                     REFUSED if the bundle is older than its sources.
 *   4. prune       -- only with --prune: delete server files the repo no
 *                     longer has (never storage/, never video)
 *   5. stamp       -- data/campaign/build.json, written LAST and only if every
 *                     channel verified. The module watches it and brings the
 *                     world up to date by itself (core/world-sync.mjs).
 *
 * Each channel sends only what differs, then re-hashes BOTH sides and fails
 * loudly on any mismatch -- the same "never trust an exit code" rule as the
 * rest of this directory. Audio is not a channel here: tools/audio-pipeline
 * owns it (process, verify, upload) and it already sends only what changed.
 *
 * Usage: node tools/module-sync/deploy.mjs [--dry-run] [--prune] [--no-video] [--skip-syntax] [--no-edits] [--no-art]
 */

import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs, promisify } from "node:util";

import { diffChecksums } from "./checksums.mjs";
import { hashSources, listSources } from "./local-hash.mjs";
import { deleteRemoteFiles, readRemoteText, remoteChecksums, remoteDirectoryExists, uploadFiles } from "./remote.mjs";
import { campaignDataSources, ledgerLast } from "./stage-campaign-data.mjs";
import { composeStamp, manifestFiles, STAMP_PATH_IN_DATA } from "./build-stamp.mjs";
import { runPreflight } from "./preflight.mjs";
import { DEFAULT_VIDEO_FOLDER, EPISODE_TITLE_FOLDER, OPENING_FILES } from "../../module/blank-inheritance/scripts/core/opening-titles.mjs";
import { checkReversions, pathsFor, sceneEditsForDeploy } from "../scene-edits/edits.mjs";

const execFileAsync = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..", "..");
export const RECORD_PATH = path.join(here, ".last-deploy.json");

const REMOTE_DATA_ROOT = "/home/ubuntu/foundrydata/Data";
export const DEFAULT_CONFIG = Object.freeze({
  repoRoot: REPO_ROOT,
  remoteHost: "ubuntu@132.145.38.144",
  keyPath: path.join(REPO_ROOT, "SSH.ppk"),
  hostKey: "SHA256:7EsvSGvu2DqJfokfzaVnysbx/Ehf52fij/M9DLHo9cE",
  moduleRemoteDir: `${REMOTE_DATA_ROOT}/modules/blank-inheritance`,
  stagecraftRemoteDir: `${REMOTE_DATA_ROOT}/modules/stagecraft`,
  stagecraft: true,
  videoRemoteDir: `${REMOTE_DATA_ROOT}/${DEFAULT_VIDEO_FOLDER}`,
  dryRun: false,
  prune: false,
  video: true,
  syntax: true,
  // Pull and merge Ingram's Scene Runner edits before sending anything. On in
  // the real command; a config built without it (the offline tests) skips it.
  sceneEdits: true,
  // Stage npc/creature art from the registry before gathering the module
  // channel's file list. On in the real command; off by default is not an
  // option the offline tests need (they never touch the real registry or a
  // real Python interpreter) -- see runDeploy's own art step.
  art: true
});

/**
 * The module files a push carries: everything under module/blank-inheritance/
 * except storage/ (Foundry's own write channel, never pushed from here) and
 * data/campaign/ (the data channel's, pushed from repo-root data/ instead --
 * see sync-module.mjs for the 2026-09-20 incident that made this local copy
 * untrustworthy).
 */
export const isLocalOnlyModulePath = (p) =>
  p === "storage" || p.startsWith("storage/") || p === "data/campaign" || p.startsWith("data/campaign/");

/**
 * The finished opening titles, under the names the module plays them by, and
 * every episode title card. The renders directory also holds drafts
 * (opening-so-far-14.mp4 and the like); only the two finals named in
 * core/opening-titles.mjs are ever taken from it.
 */
export function videoSources(repoRoot) {
  const sources = new Map();
  const renders = path.join(repoRoot, "artwork", "title-sequences", "opening", "renders");
  for (const name of Object.values(OPENING_FILES)) {
    const file = path.join(renders, name);
    if (existsSync(file)) sources.set(name, file);
  }
  const cards = path.join(repoRoot, "artwork", "title-sequences", "episode-titles");
  if (existsSync(cards)) {
    for (const name of readdirSync(cards).filter((n) => n.endsWith(".mp4")).sort()) {
      sources.set(`${EPISODE_TITLE_FOLDER}/${name}`, path.join(cards, name));
    }
  }
  return sources;
}

/**
 * The files of the Stagecraft module that a server needs, and nothing else: no tests, no node_modules, no source (the
 * bundle is built from it), no dev source map. Empty when the repo has no such module.
 */
export async function stagecraftSources(repoRoot) {
  const dir = path.join(repoRoot, "module", "stagecraft");
  const sources = new Map();
  if (!existsSync(path.join(dir, "module.json"))) return sources;
  for (const rel of ["module.json", "LICENSE", "dist/stagecraft.js", "lang/en.json", "styles/stagecraft.css"]) {
    const abs = path.join(dir, rel);
    if (existsSync(abs)) sources.set(rel, abs);
  }
  return sources;
}

/**
 * Is Stagecraft's bundle the one its sources make? A bundle older than its sources is the quiet kind of mistake: the tests
 * pass and the server runs something else. Returns a sentence when it is stale, else null.
 */
export async function staleStagecraftBundle(repoRoot) {
  const dir = path.join(repoRoot, "module", "stagecraft");
  if (!existsSync(path.join(dir, "module.json"))) return null;
  const stampFile = path.join(dir, "dist", "BUILD.json");
  if (!existsSync(stampFile) || !existsSync(path.join(dir, "dist", "stagecraft.js"))) return "module/stagecraft/dist has no bundle: run npm run build:stagecraft";
  const { sourcesHash } = await import(pathToFileURL(path.join(dir, "tools", "build.mjs")).href);
  const stamp = JSON.parse(readFileSync(stampFile, "utf8"));
  if (stamp.dev) return "module/stagecraft/dist holds a dev build: run npm run build:stagecraft";
  return stamp.sources === sourcesHash().hash ? null : "module/stagecraft/dist is older than its sources: run npm run build:stagecraft";
}

/** The channels, with everything each needs to push and to be checked. */
export async function gatherChannels(config) {
  const moduleDir = path.join(config.repoRoot, "module", "blank-inheritance");
  const channels = [
    {
      name: "module",
      sources: await listSources(moduleDir, { skip: isLocalOnlyModulePath }),
      remoteDir: config.moduleRemoteDir,
      // storage/ is written by Foundry; data/campaign/ is the data channel's.
      ignoreRemote: (p) => p.startsWith("storage/") || p.startsWith("data/campaign/"),
      prunable: true
    },
    {
      name: "data",
      sources: await campaignDataSources(path.join(config.repoRoot, "data")),
      remoteDir: `${config.moduleRemoteDir}/data/campaign`,
      // The stamp is written by this script's last step, not by the channel.
      ignoreRemote: (p) => p === STAMP_PATH_IN_DATA,
      prunable: true
    }
  ];
  if (config.stagecraft !== false) {
    const sources = await stagecraftSources(config.repoRoot);
    if (sources.size) {
      channels.push({
        name: "stagecraft",
        sources,
        remoteDir: config.stagecraftRemoteDir,
        ignoreRemote: () => false,
        // A second module is not this deploy's to tidy: whatever else is in its folder stays.
        prunable: false
      });
    }
  }
  if (config.video !== false) {
    channels.push({
      name: "video",
      sources: videoSources(config.repoRoot),
      remoteDir: config.videoRemoteDir,
      ignoreRemote: () => false,
      // Never pruned: a video someone placed in this folder by hand is not
      // this repo's to delete.
      prunable: false
    });
  }
  return channels;
}

async function readRemoteMap(remote, config, channel) {
  const connection = { remoteHost: config.remoteHost, keyPath: config.keyPath, hostKey: config.hostKey, remoteDir: channel.remoteDir };
  if (!(await remote.remoteDirectoryExists(connection))) return new Map();
  const map = await remote.remoteChecksums(connection);
  return new Map([...map].filter(([p]) => !channel.ignoreRemote(p)));
}

/**
 * Run both tools/token-ring/ staging scripts against the real registry,
 * before anything is gathered to send -- so the module channel's own
 * directory walk (isLocalOnlyModulePath has no opinion on assets/tokens/ or
 * assets/stage/, it's just more of module/blank-inheritance/) picks up
 * whatever they just wrote. Unlike preflight, a non-zero exit here throws
 * (execFile's own default) rather than returning a checked result -- both
 * scripts already exit 1 on ANY registered portrait missing from disk
 * (their own `main()`), so a thrown error here is already specific enough to
 * act on without this function re-parsing stdout for it.
 */
export async function stageNpcArt(repoRoot, log) {
  // The scene stager is here too (added 2026-10-01): a new Scene's backdrop is
  // read from the asset registry like a portrait, and without this step it only
  // reached the server if someone remembered to run it by hand.
  for (const script of ["token-ring/crop_ring_subject.py", "token-ring/stage_npc_portraits.py", "stage-scenes/stage_scenes.py"]) {
    const scriptPath = path.join(repoRoot, "tools", script);
    const { stdout } = await execFileAsync("python", [scriptPath], { cwd: repoRoot });
    for (const line of stdout.trim().split("\n").filter(Boolean)) log(`  ${line}`);
  }
}

/** git's view of the tree being pushed, for the stamp. Never fatal. */
export async function gitInfo(repoRoot) {
  try {
    const { stdout: commit } = await execFileAsync("git", ["-C", repoRoot, "rev-parse", "--short", "HEAD"]);
    const { stdout: status } = await execFileAsync("git", ["-C", repoRoot, "status", "--porcelain"], { maxBuffer: 16 * 1024 * 1024 });
    return { commit: commit.trim() || null, uncommitted: status.split("\n").filter(Boolean).length };
  } catch {
    return { commit: null, uncommitted: null };
  }
}

/**
 * The whole deploy. `remote` and `deps` are injectable so the orchestration is
 * tested offline (test/module-sync/deploy.test.mjs), the same parameter
 * injection every other script in this directory uses.
 *
 * @returns {Promise<object>} what happened, channel by channel
 */
export async function runDeploy(
  config = DEFAULT_CONFIG,
  remote = { uploadFiles, remoteChecksums, remoteDirectoryExists, deleteRemoteFiles, readRemoteText },
  deps = {}
) {
  const log = deps.log ?? console.log;
  const now = deps.now ?? (() => new Date());
  const preflight = deps.preflight ?? runPreflight;
  const stageArt = deps.stageNpcArt ?? stageNpcArt;
  const git = deps.gitInfo ?? gitInfo;
  const writeRecord = deps.writeRecord ?? writeDeployRecord;
  const connection = { remoteHost: config.remoteHost, keyPath: config.keyPath, hostKey: config.hostKey };
  const result = { ok: false, dryRun: Boolean(config.dryRun), channels: {}, pruned: [], stamp: null, warnings: [], errors: [] };

  // 0. Ingram's edits --------------------------------------------------------
  // Before anything is gathered to send: her Scene Runner edits come home and
  // into data/ first, so the files this deploy sends already hold her words.
  // Then the one hard rule -- the repo may never hold older words than hers.
  // (Her text on the server is safe either way; the Runner lays it over
  // whatever is deployed. This keeps the REPO honest, which is what every
  // later conversation builds on.)
  // `--no-edits` skips only the PULL (working offline, say); the check that the
  // repo still holds every word of hers is offline and runs on every deploy.
  let reversions;
  if (config.sceneEdits === true || deps.sceneEdits) {
    log("=== 0. Ingram's scene edits: pull and merge before anything is sent ===");
    const edits = await (deps.sceneEdits ?? sceneEditsForDeploy)({ dryRun: Boolean(config.dryRun), repoRoot: config.repoRoot, log });
    result.sceneEdits = edits;
    reversions = edits.reversions ?? [];
  } else {
    reversions = (deps.checkReversions ?? checkReversions)(pathsFor(config.repoRoot));
  }
  if (reversions.length) {
    const where = reversions.map((r) => `${r.file} ${r.path}`).join("; ");
    const error = `the repo has gone back to older words than Ingram's in ${reversions.length} place(s): ${where}. Run \`npm run edits -- restore\`, then deploy again.`;
    log(`REFUSED: ${error}`);
    result.errors.push(error);
    process.exitCode = 1;
    return result;
  }

  // 0. Preflight -------------------------------------------------------------
  const moduleDir = path.join(config.repoRoot, "module", "blank-inheritance");
  let sceneSet = null;
  try {
    sceneSet = JSON.parse(readFileSync(path.join(config.repoRoot, "data", "campaign", "scene-set.json"), "utf8"));
  } catch {
    // The art warning simply has nothing to check; the data push reports a missing manifest its own way.
  }
  log("=== 0. Preflight: can the module about to be pushed actually load? ===");
  const checks = await preflight({ moduleDir, sceneSet, syntax: config.syntax !== false });
  result.warnings.push(...checks.warnings);
  for (const warning of checks.warnings) log(`  warning: ${warning}`);
  if (checks.errors.length) {
    for (const error of checks.errors) log(`  ERROR: ${error}`);
    log(`REFUSED: ${checks.errors.length} preflight error(s). Nothing was sent.`);
    result.errors.push(...checks.errors);
    process.exitCode = 1;
    return result;
  }
  log(`  clean${checks.warnings.length ? ` (${checks.warnings.length} warning(s))` : ""}`);

  // 0. Stagecraft's bundle -----------------------------------------------------
  if (config.stagecraft !== false) {
    const stale = await (deps.staleStagecraftBundle ?? staleStagecraftBundle)(config.repoRoot);
    if (stale) {
      log(`REFUSED: ${stale}. Nothing was sent.`);
      result.errors.push(stale);
      process.exitCode = 1;
      return result;
    }
  }

  // 0. Art ---------------------------------------------------------------------
  if (config.art !== false) {
    log("=== 0. Art: staging npc/creature token-ring subjects, Actor/frame portraits and scene backdrops ===");
    try {
      await stageArt(config.repoRoot, log);
    } catch (err) {
      const error = `staging npc/creature art failed: ${err?.message ?? err}`;
      log(`REFUSED: ${error}`);
      result.errors.push(error);
      process.exitCode = 1;
      return result;
    }
  }

  // 1-3. Channels ------------------------------------------------------------
  const channels = await gatherChannels(config);
  const finalMaps = {};
  let allVerified = true;
  for (const [index, channel] of channels.entries()) {
    log(`=== ${index + 1}. ${channel.name}: ${channel.sources.size} local file(s) -> ${channel.remoteDir} ===`);
    const localMap = await hashSources(channel.sources);
    const before = diffChecksums(localMap, await readRemoteMap(remote, config, channel));
    // The scene-edits ledger goes last, so it never says an edit of Ingram's
    // is merged before the file holding her words has arrived.
    const toSend = channel.name === "data" ? ledgerLast([...before.changed, ...before.onlyLocal]) : [...before.changed, ...before.onlyLocal];
    const report = { local: localMap.size, sent: toSend, changed: before.changed.length, added: before.onlyLocal.length, onlyRemote: before.onlyRemote, verified: false };
    result.channels[channel.name] = report;

    if (config.dryRun) {
      log(`  would send ${toSend.length} (${before.changed.length} changed, ${before.onlyLocal.length} new)`);
      for (const p of toSend) log(`    ${before.changed.includes(p) ? "changed" : "new    "}  ${p}`);
      for (const p of before.onlyRemote) log(`    only on the server: ${p}`);
      finalMaps[channel.name] = localMap;
      continue;
    }

    if (toSend.length) {
      log(`  sending ${toSend.length} (${before.changed.length} changed, ${before.onlyLocal.length} new)`);
      await remote.uploadFiles({ ...connection, remoteDir: channel.remoteDir, files: new Map(toSend.map((p) => [p, channel.sources.get(p)])) });
    } else {
      log("  nothing to send");
    }

    const after = diffChecksums(localMap, await readRemoteMap(remote, config, channel));
    report.onlyRemote = after.onlyRemote;
    report.verified = after.changed.length === 0 && after.onlyLocal.length === 0;
    if (report.verified) {
      log(`  VERIFIED: all ${localMap.size} match on both sides${after.onlyRemote.length ? `; ${after.onlyRemote.length} file(s) exist only on the server` : ""}`);
    } else {
      allVerified = false;
      log(`  MISMATCH: ${after.changed.length} differ, ${after.onlyLocal.length} missing on the server`);
      for (const p of [...after.changed, ...after.onlyLocal]) log(`    ${p}`);
    }
    for (const p of after.onlyRemote) log(`    only on the server: ${p}`);
    finalMaps[channel.name] = localMap;
  }

  if (config.dryRun) {
    log("=== --dry-run: nothing was sent, pruned or stamped ===");
    result.ok = true;
    return result;
  }
  if (!allVerified) {
    log("NOT DEPLOYED: a channel did not verify, so no build stamp was written and the world will not update to it. Re-run.");
    process.exitCode = 1;
    return result;
  }

  // 4. Prune -------------------------------------------------------------------
  for (const channel of channels.filter((c) => c.prunable)) {
    const stale = result.channels[channel.name].onlyRemote;
    if (!stale.length) continue;
    if (!config.prune) {
      log(`  (${stale.length} ${channel.name} file(s) exist only on the server; --prune would delete them)`);
      continue;
    }
    log(`=== prune: deleting ${stale.length} ${channel.name} file(s) the repo no longer has ===`);
    for (const p of stale) log(`    delete ${p}`);
    await remote.deleteRemoteFiles({ ...connection, remoteDir: channel.remoteDir, paths: stale });
    const still = [...(await readRemoteMap(remote, config, channel)).keys()].filter((p) => stale.includes(p));
    if (still.length) {
      log(`  PRUNE INCOMPLETE: ${still.join(", ")} still on the server`);
      process.exitCode = 1;
      return result;
    }
    result.pruned.push(...stale.map((p) => `${channel.name}:${p}`));
    result.channels[channel.name].onlyRemote = [];
  }

  // 5. Stamp -------------------------------------------------------------------
  const dataChannel = channels.find((c) => c.name === "data");
  const stampRemotePath = `${dataChannel.remoteDir}/${STAMP_PATH_IN_DATA}`;
  let previous = null;
  try {
    const text = await remote.readRemoteText({ ...connection, remotePath: stampRemotePath });
    previous = text ? JSON.parse(text) : null;
  } catch {
    previous = null; // an unreadable stamp is replaced, not trusted
  }
  const manifest = JSON.parse(readFileSync(path.join(moduleDir, "module.json"), "utf8"));
  const { stamp, unchanged } = composeStamp({
    now: now(),
    git: await git(config.repoRoot),
    // null with --no-video: the stamp then carries the server's previous video
    // fingerprint forward instead of treating "not checked" as "no videos".
    maps: { module: finalMaps.module, data: finalMaps.data, video: finalMaps.video ?? null, stagecraft: finalMaps.stagecraft ?? null },
    manifest,
    sent: { module: result.channels.module.sent, data: result.channels.data.sent, video: result.channels.video?.sent ?? [], stagecraft: result.channels.stagecraft?.sent ?? [] },
    removed: result.pruned,
    warnings: result.warnings,
    previous
  });
  result.stamp = stamp;

  if (unchanged) {
    log(`=== stamp: the server already has build ${stamp.id}; nothing changed ===`);
  } else {
    log(`=== stamp: build ${stamp.id} ===`);
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "blank-inheritance-stamp-"));
    try {
      const file = path.join(tempDir, "build.json");
      const text = `${JSON.stringify(stamp, null, 2)}\n`;
      await writeFile(file, text);
      await remote.uploadFiles({ ...connection, remoteDir: dataChannel.remoteDir, files: new Map([[STAMP_PATH_IN_DATA, file]]) });
      const [written] = [...(await hashSources(new Map([[STAMP_PATH_IN_DATA, file]]))).values()];
      const onServer = (await remote.remoteChecksums({ ...connection, remoteDir: dataChannel.remoteDir })).get(STAMP_PATH_IN_DATA);
      if (onServer !== written) {
        log("  STAMP NOT VERIFIED: the files are on the server, but the world will not update itself until a deploy writes the stamp. Re-run.");
        process.exitCode = 1;
        return result;
      }
      log("  VERIFIED");
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  const newModule = channels.find((c) => c.name === "stagecraft" && result.channels.stagecraft && result.channels.stagecraft.added === result.channels.stagecraft.local);
  if (newModule) {
    log("NOTE: the Stagecraft module is new on this server. Foundry finds a new module folder only when it starts, so restart it:");
    log("      plink ... ubuntu@<server> \"sudo systemctl restart foundryvtt\"   (it opens the campaign world at startup)");
    log("      The adventure switches the module on by itself when a GM next loads the world.");
  }
  const manifestChanged = previous && JSON.stringify(previous.module?.manifest) !== JSON.stringify(manifestFiles(manifest));
  if (manifestChanged) {
    // Found live 2026-09-27: a fixed module.json stayed rejected through every
    // browser refresh until the world launched again. The server auto-launches
    // the campaign world at startup since that day (Config/options.json
    // "world"), so a service restart is the whole fix and needs no admin login.
    log("NOTE: module.json's list of scripts, styles or languages changed. Foundry reads it only when a world launches,");
    log("      and a browser refresh is not enough. Restart Foundry so the world relaunches with it:");
    log("      plink ... ubuntu@<server> \"sudo systemctl restart foundryvtt\"   (it opens the campaign world at startup)");
  }

  await writeRecord(config, stamp, finalMaps, channels);
  result.ok = true;
  log(`DEPLOYED build ${stamp.id}. The module brings the world up to date by itself when the GM next loads it, or within a couple of minutes if a GM is already in.`);
  return result;
}

/**
 * What this machine last deployed, for deploy-status.mjs to compare the
 * working tree against at session start. Local only and gitignored: it
 * records this machine's pushes, and the server's own stamp stays the truth.
 */
async function writeDeployRecord(config, stamp, maps, channels) {
  const video = channels.find((c) => c.name === "video");
  const record = {
    id: stamp.id,
    deployedAt: stamp.deployedAt,
    module: Object.fromEntries(maps.module),
    data: Object.fromEntries(maps.data),
    // Size and modification time rather than a hash: the session-start check
    // must stay fast, and re-reading 400 MB of video to notice a re-render
    // would not be.
    video: video ? Object.fromEntries([...video.sources].map(([p, abs]) => [p, videoFingerprint(abs)])) : null
  };
  await writeFile(config.recordPath ?? RECORD_PATH, `${JSON.stringify(record, null, 2)}\n`);
}

export function videoFingerprint(absolutePath) {
  const s = statSync(absolutePath);
  return `${s.size}:${Math.round(s.mtimeMs)}`;
}

// CLI ------------------------------------------------------------------------
// Only when executed directly, never when a test imports runDeploy -- the same
// guard as sync-module.mjs and sync-harvest.mjs.
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      prune: { type: "boolean", default: false },
      "no-video": { type: "boolean", default: false },
      "skip-syntax": { type: "boolean", default: false },
      "no-edits": { type: "boolean", default: false },
      "no-art": { type: "boolean", default: false }
    }
  });
  const config = {
    ...DEFAULT_CONFIG,
    dryRun: values["dry-run"],
    prune: values.prune,
    video: !values["no-video"],
    syntax: !values["skip-syntax"],
    sceneEdits: !values["no-edits"],
    art: !values["no-art"]
  };
  runDeploy(config).catch((err) => {
    console.error("DEPLOY FAILED:", err);
    process.exitCode = 1;
  });
}
