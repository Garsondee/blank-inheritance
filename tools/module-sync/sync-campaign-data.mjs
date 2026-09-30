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
 * fetchModuleJson("data/campaign/episodes/episode-c1e1-mothers-maiden-name.json").
 *
 * Usage: node tools/module-sync/sync-campaign-data.mjs [--dry-run] [--local-dir ...] [--remote-dir ...] [--remote-host ...] [--key-path ...] [--host-key ...]
 */
import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeLocalChecksums } from "./local-hash.mjs";
import { uploadDirectory, remoteChecksums } from "./remote.mjs";
import { diffChecksums, summarizeDiff } from "./checksums.mjs";
import { stageCampaignData, cleanupStagedData, ledgerLast } from "./stage-campaign-data.mjs";
import { checkReversions, pathsFor } from "../scene-edits/edits.mjs";

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
  dataRoot: values["local-dir"],
  dryRun: values["dry-run"],
  remoteDir: values["remote-dir"],
  remoteHost: values["remote-host"],
  keyPath: values["key-path"],
  hostKey: values["host-key"],
};

/**
 * The actual push logic, pulled out of the CLI entry point below so it's
 * testable without a real server -- see test/support/mock-remote.mjs and
 * test/module-sync/sync-campaign-data.test.mjs. `remote` defaults to the
 * real remote.mjs functions; a test passes a mock instead (parameter
 * injection, not `node:test`'s `mock.module()` -- see sync-harvest.mjs's
 * runHarvest for why that isn't available on this project's Node 18.16
 * target). Builds its own `runConfig` (config + the staging dir as
 * `localDir`) rather than mutating the `config` object a caller passed in.
 */
export async function runCampaignDataSync(config, remote = { uploadDirectory, remoteChecksums }) {
  // Ingram's critical requirement (design/scene-edits.md §5.3): no push may
  // carry older words than hers. `npm run deploy` checks this too; this older,
  // standalone push must not be the way round it.
  const reversions = (config.checkReversions ?? checkReversions)(pathsFor(path.resolve(config.dataRoot, "..")));
  if (reversions.length) {
    console.log(`REFUSED: the repo has gone back to older words than Ingram's in ${reversions.map((r) => `${r.file} ${r.path}`).join("; ")}. Run \`npm run edits -- restore\` first.`);
    process.exitCode = 1;
    return;
  }

  const stagingDir = await stageCampaignData(config.dataRoot);
  console.log(`=== Staged sync content into ${stagingDir} ===`);
  try {
    const runConfig = { ...config, localDir: stagingDir };

    console.log(`=== 1. Local checksums (${stagingDir}) ===`);
    // The scene-edits ledger goes up last, so it never says an edit of hers
    // is merged before the file holding her words has arrived.
    const localMap = ledgerLast(await computeLocalChecksums(stagingDir));
    console.log(`${localMap.size} files staged`);

    if (config.dryRun) {
      console.log("=== --dry-run: comparing against remote WITHOUT uploading ===");
    } else {
      console.log(`=== 2. Uploading to ${config.remoteHost}:${config.remoteDir} (${localMap.size} files, one at a time) ===`);
      await remote.uploadDirectory({ ...runConfig, localMap });
    }

    console.log("=== 3. Remote checksums ===");
    const remoteMap = await remote.remoteChecksums(runConfig);
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

async function main() {
  await runCampaignDataSync(config);
}

// Only run when this file is executed directly, never when imported (e.g. by a test importing
// runCampaignDataSync above) -- see sync-harvest.mjs's identical guard for the reasoning and how
// it was verified on this project's actual Node/Windows setup.
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => {
    console.error("sync-campaign-data failed:", err);
    process.exitCode = 1;
  });
}
