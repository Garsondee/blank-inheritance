/**
 * `pt build`: make the playtest's Foundry data root a verified copy of everything the live server would have, from this working
 * tree, in one command (design/playtest-process.md, section 6, Phase 0).
 *
 * It is the real deploy aimed at a folder. `runDeploy` (tools/module-sync/deploy.mjs) does the module, the campaign data, the
 * Stagecraft module and the opening videos, behind the same preflight, with the same hash check on both sides and the same build
 * stamp, written last, which is what makes the module's world-sync bring a world up to date by itself. The two things a deploy does
 * not own are added here in the same send-then-verify way: the system (a read-only copy of gamesystems/sf2e) and the audio library
 * (audio-pipeline owns the live upload; here it is a mirror). Nothing is ever sent to the live server, nothing the deploy records
 * about "what this machine last pushed" is touched, and Ingram's live scene edits are not pulled (the tree already holds the last
 * ones; deploy-status says so at session start).
 *
 *   node tools/playtest/pt.mjs build [--check] [--no-art] [--no-video] [--no-audio] [--no-system] [--keep-extra]
 *
 * --check   compare only: say whether the playtest copy is current and send nothing.
 * --no-art  skip the python art staging (slow, silent for minutes). Use it only when no art has changed.
 */

import { copyFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { diffChecksums } from "../../module-sync/checksums.mjs";
import { campaignDataSources } from "../../module-sync/stage-campaign-data.mjs";
import { hashSources, listSources } from "../../module-sync/local-hash.mjs";
import { DEFAULT_CONFIG, runDeploy } from "../../module-sync/deploy.mjs";
import { DEFAULT_VIDEO_FOLDER } from "../../../module/blank-inheritance/scripts/core/opening-titles.mjs";
import { AUDIO_DIR, DATA_DIR, MODULE_DIR, REPO, STAGECRAFT_DIR, SYSTEM_DIR } from "../paths.mjs";
import { createLocalRemote } from "./local-remote.mjs";
import { bootstrapDataRoot } from "./bootstrap.mjs";

const SKIP_JUNK = (p) => /(^|\/)(node_modules|\.git)(\/|$)/.test(p);

/**
 * Bring one plain folder to match another: send what is new or different, verify both sides by hash, and (with prune) remove what
 * the source no longer has. The deploy's own channel discipline, for the folders `runDeploy` does not own.
 *
 * @returns {Promise<{name:string, local:number, sent:number, pruned:number, verified:boolean}>}
 */
export async function syncChannel({ name, sourceDir = null, sources: given = null, destDir, remote = createLocalRemote(), prune = true, dryRun = false, skip = SKIP_JUNK, log = console.log }) {
  if (!given && !existsSync(sourceDir)) {
    log(`  ${name}: ${sourceDir} does not exist here; skipped`);
    return { name, local: 0, sent: 0, pruned: 0, verified: false, missing: true };
  }
  const sources = given ?? (await listSources(sourceDir, { skip }));
  const localMap = await hashSources(sources);
  const there = async () => new Map([...(await remote.remoteChecksums({ remoteDir: destDir }))].filter(([p]) => !skip(p)));
  const before = diffChecksums(localMap, await there());
  const toSend = [...before.changed, ...before.onlyLocal];
  log(`  ${name}: ${localMap.size} file(s); ${before.changed.length} changed, ${before.onlyLocal.length} new, ${before.onlyRemote.length} only in the copy`);
  if (dryRun) return { name, local: localMap.size, sent: toSend.length, pruned: 0, verified: toSend.length === 0 };
  if (toSend.length) await remote.uploadFiles({ files: new Map(toSend.map((p) => [p, sources.get(p)])), remoteDir: destDir });
  let pruned = 0;
  if (prune && before.onlyRemote.length) {
    await remote.deleteRemoteFiles({ remoteDir: destDir, paths: before.onlyRemote });
    pruned = before.onlyRemote.length;
  }
  const after = diffChecksums(localMap, await there());
  const verified = after.changed.length === 0 && after.onlyLocal.length === 0 && (!prune || after.onlyRemote.length === 0);
  log(`  ${name}: ${verified ? "VERIFIED" : "MISMATCH"} (${toSend.length} sent, ${pruned} removed)`);
  return { name, local: localMap.size, sent: toSend.length, pruned, verified };
}

/**
 * Copy each compendium pack folder that is not in the copy yet, and leave every one that is. Returns a channel-shaped report.
 */
export async function ensurePacks({ sourceDir, destDir, remote = createLocalRemote(), dryRun = false, log = console.log }) {
  if (!existsSync(sourceDir)) return { name: "system packs", local: 0, sent: 0, pruned: 0, verified: false, missing: true };
  const names = readdirSync(sourceDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  const missing = names.filter((n) => !existsSync(path.join(destDir, n)));
  log(`  system packs: ${names.length} compendium(s), ${names.length - missing.length} already there (left alone), ${missing.length} to copy`);
  let sent = 0;
  let verified = true;
  if (!dryRun) {
    for (const name of missing) {
      const r = await syncChannel({ name: `pack ${name}`, sourceDir: path.join(sourceDir, name), destDir: path.join(destDir, name), remote, prune: false, log: () => {} });
      sent += r.sent;
      verified = verified && r.verified;
    }
  }
  return { name: "system packs", local: names.length, sent: dryRun ? missing.length : sent, pruned: 0, verified: dryRun ? missing.length === 0 : verified };
}

/** The deploy configuration aimed at the playtest data root. */
export function localDeployConfig({ art = true, video = true, dryRun = false, prune = true } = {}) {
  return {
    ...DEFAULT_CONFIG,
    repoRoot: REPO,
    moduleRemoteDir: MODULE_DIR,
    stagecraftRemoteDir: STAGECRAFT_DIR,
    videoRemoteDir: path.join(DATA_DIR, DEFAULT_VIDEO_FOLDER),
    dryRun,
    prune,
    video,
    art,
    syntax: true,
    // Her live edits are not pulled for a local copy; the offline reversion check (the tree must hold every word of hers) still runs.
    sceneEdits: false
  };
}

/**
 * @param {object} [options]
 * @returns {Promise<{ok:boolean, deploy:object, extras:object[], stamp:object|null, errors:string[]}>}
 */
export async function buildLocal({ art = true, video = true, audio = true, system = true, dryRun = false, prune = true, log = console.log } = {}) {
  bootstrapDataRoot({ log });
  const remote = createLocalRemote();
  const errors = [];

  log("=== the playtest copy: the real deploy, aimed at a folder ===");
  const deploy = await runDeploy(localDeployConfig({ art, video, dryRun, prune }), remote, {
    log,
    // The record deploy-status reads is "what this machine last pushed to the live server". A local build is not that.
    writeRecord: async () => {}
  });
  if (!deploy.ok) errors.push(...(deploy.errors.length ? deploy.errors : ["the deploy to the playtest copy did not complete"]));

  const extras = [];
  if (system) {
    log("=== the system (read-only copy of gamesystems/sf2e) ===");
    const systemSource = path.join(REPO, "gamesystems", "sf2e");
    // The compendium packs are LevelDB folders Foundry opens, locks, rewrites and compacts once it runs: they are copied when missing and
    // never compared or pruned afterwards (the system is a pinned, read-only copy). Everything else in the system is held to the tree.
    const notPacks = (p) => SKIP_JUNK(p) || p === "packs" || p.startsWith("packs/");
    extras.push(await syncChannel({ name: "system", sourceDir: systemSource, destDir: SYSTEM_DIR, remote, prune, dryRun, log, skip: notPacks }));
    extras.push(await ensurePacks({ sourceDir: path.join(systemSource, "packs"), destDir: path.join(SYSTEM_DIR, "packs"), remote, dryRun, log }));
  }
  if (audio) {
    log("=== the audio library (audio/library -> blank-inheritance-audio) ===");
    extras.push(await syncChannel({ name: "audio", sourceDir: path.join(REPO, "audio", "library"), destDir: AUDIO_DIR, remote, prune, dryRun, log }));
  }
  for (const extra of extras) if (!dryRun && !extra.verified && !extra.missing) errors.push(`${extra.name} did not verify`);

  const stamp = readStamp();
  const current = dryRun ? isCurrent(deploy, extras) : null;
  return { ok: errors.length === 0, deploy, extras, stamp, errors, current };
}

/** The build stamp the copy carries (what the module's world-sync watches), or null before the first build. */
export function readStamp() {
  const file = path.join(MODULE_DIR, "data", "campaign", "build.json");
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

/** After a dry run: does the copy already match the tree in every channel? */
export function isCurrent(deploy, extras = []) {
  const channels = Object.values(deploy.channels ?? {});
  return channels.length > 0 && channels.every((c) => c.sent.length === 0) && extras.every((e) => e.sent === 0 || e.missing);
}

/**
 * The OTHER local copy: module/blank-inheritance/data/campaign/ inside the repo's own module folder, which the other local world's
 * junctioned module reads (it is gitignored, "campaign JSON staged into the module for LOCAL Foundry testing"). It had drifted (its build
 * stamp was a week old). This brings it to match the tree, from the same allow-list the deploy uses, and gives it the playtest copy's stamp,
 * so that world also brings itself up to date at its next GM login. It is a mirror of gitignored files: nothing the repo tracks changes.
 */
export async function refreshRepoStaging({ log = console.log, dryRun = false } = {}) {
  const dest = path.join(REPO, "module", "blank-inheritance", "data", "campaign");
  const sources = await campaignDataSources(path.join(REPO, "data"));
  const report = await syncChannel({ name: "repo staging (module/blank-inheritance/data/campaign)", sources, destDir: dest, prune: true, dryRun, log, skip: () => false });
  const stamp = path.join(MODULE_DIR, "data", "campaign", "build.json");
  if (!dryRun && existsSync(stamp)) copyFileSync(stamp, path.join(dest, "build.json"));
  return report;
}
