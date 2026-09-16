#!/usr/bin/env node
/**
 * Verified push of the campaign's real content onto the Foundry server,
 * alongside (but separate from) the module code push done by
 * sync-module.mjs. Reuses the exact same checksum/upload building blocks --
 * checksums.mjs, local-hash.mjs, remote.mjs are already fully generic, no
 * changes needed there.
 *
 * Kept as a separate script rather than folding into sync-module.mjs: the
 * module code and the campaign data are different things with different
 * change cadences (code changes when the pipeline itself changes; data
 * changes every time a scene/episode/NPC is authored), and sync-module.mjs's
 * single localDir/remoteDir pair would need restructuring to carry two
 * independent directory pairs for no real benefit over just running two
 * small scripts.
 *
 * Doesn't push repo-root data/ wholesale: stage-campaign-data.mjs first
 * copies an explicit allow-list of data/ subdirectories into a fresh, single
 * "sync content" staging folder (see that file for why -- data/ also holds
 * things Foundry has no use for, like tools/city-map's 115MB+ GIS data
 * root), and this script pushes THAT.
 *
 * Lands under the module's own directory tree (Data/modules/blank-inheritance/data/campaign/)
 * so scripts/foundry/io.mjs's existing fetchModuleJson (relative to the
 * module root) can reach it with zero changes -- e.g.
 * fetchModuleJson("data/campaign/episodes/episode-c1s1-mothers-maiden-name.json").
 *
 * Usage: node tools/module-sync/sync-campaign-data.mjs [--dry-run] [--local-dir ...] [--remote-dir ...] [--remote-host ...] [--key-path ...] [--host-key ...]
 */
import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeLocalChecksums } from "./local-hash.mjs";
import { uploadDirectory, remoteChecksums } from "./remote.mjs";
import { diffChecksums, summarizeDiff } from "./checksums.mjs";
import { stageCampaignData, cleanupStagedData } from "./stage-campaign-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    "local-dir": { type: "string", default: path.join(repoRoot, "data") },
    "remote-dir": { type: "string", default: "/home/ubuntu/foundrydata/Data/modules/blank-inheritance/data/campaign" },
    "remote-host": { type: "string", default: "ubuntu@132.145.38.144" },
    "key-path": { type: "string", default: path.join(repoRoot, "SSH.ppk") },
    "host-key": { type: "string", default: "SHA256:7EsvSGvu2DqJfokfzaVnysbx/Ehf52fij/M9DLHo9cE" },
  },
});

const config = {
  remoteDir: values["remote-dir"],
  remoteHost: values["remote-host"],
  keyPath: values["key-path"],
  hostKey: values["host-key"],
};

async function main() {
  const stagingDir = await stageCampaignData(values["local-dir"]);
  console.log(`=== Staged sync content into ${stagingDir} ===`);
  try {
    config.localDir = stagingDir;

    console.log(`=== 1. Local checksums (${stagingDir}) ===`);
    const localMap = await computeLocalChecksums(stagingDir);
    console.log(`${localMap.size} files staged`);

    if (values["dry-run"]) {
      console.log("=== --dry-run: comparing against remote WITHOUT uploading ===");
    } else {
      console.log(`=== 2. Uploading to ${config.remoteHost}:${config.remoteDir} (${localMap.size} files, one at a time) ===`);
      await uploadDirectory({ ...config, localMap });
    }

    console.log("=== 3. Remote checksums ===");
    const remoteMap = await remoteChecksums(config);
    console.log(`${remoteMap.size} files remotely`);

    console.log("=== 4. Comparing (path + content hash together, not hashes alone) ===");
    const diff = diffChecksums(localMap, remoteMap);
    console.log(summarizeDiff(diff));
    for (const p of diff.changed) console.log(`  changed:      ${p}`);
    for (const p of diff.onlyLocal) console.log(`  only local:   ${p}`);
    for (const p of diff.onlyRemote) console.log(`  only remote:  ${p}`);

    if (!diff.isVerified) process.exitCode = 1;
  } finally {
    await cleanupStagedData(stagingDir);
  }
}

main().catch((err) => {
  console.error("sync-campaign-data failed:", err);
  process.exitCode = 1;
});
