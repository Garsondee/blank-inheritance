#!/usr/bin/env node
/**
 * Verified push of the Foundry module directory to the live server --
 * replaces manual WinSCP for this half of the content pipeline (see GitHub
 * issue #112 / epic #118). Uploads, then independently re-hashes every file
 * on BOTH sides and reports exactly what matches, never trusting a "the
 * copy succeeded" exit code alone.
 *
 * This only pushes files onto the server's Data/modules/ folder -- it does
 * NOT touch any live Foundry document. See design/foundry-module-design.md's
 * Safety section for why that's a meaningfully different (much lower) risk
 * level than the in-Foundry Sync step, which still has to go through
 * Foundry's own Document API.
 *
 * Known limitation: this is an overwrite-and-verify push, not a mirror --
 * a file deleted locally is reported as "only remote" but is NOT deleted
 * from the server. Deleting a file that turns out to still matter is a much
 * worse failure mode than a stale extra file sitting there, so this is
 * deliberate, not an oversight. Delete stale remote files by hand if you
 * confirm they're really gone for good.
 *
 * Usage: node tools/module-sync/sync-module.mjs [--dry-run] [--local-dir ...] [--remote-dir ...] [--remote-host ...] [--key-path ...] [--host-key ...]
 */
import { parseArgs } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeLocalChecksums } from "./local-hash.mjs";
import { uploadDirectory, remoteChecksums } from "./remote.mjs";
import { diffChecksums, summarizeDiff } from "./checksums.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    "local-dir": { type: "string", default: path.join(repoRoot, "module", "blank-inheritance") },
    "remote-dir": { type: "string", default: "/home/ubuntu/foundrydata/Data/modules/blank-inheritance" },
    "remote-host": { type: "string", default: "ubuntu@132.145.38.144" },
    "key-path": { type: "string", default: path.join(repoRoot, "SSH.ppk") },
    "host-key": { type: "string", default: "SHA256:7EsvSGvu2DqJfokfzaVnysbx/Ehf52fij/M9DLHo9cE" },
  },
});

const config = {
  dryRun: values["dry-run"],
  localDir: values["local-dir"],
  remoteDir: values["remote-dir"],
  remoteHost: values["remote-host"],
  keyPath: values["key-path"],
  hostKey: values["host-key"],
};

/**
 * The actual push logic, pulled out of the CLI entry point below so it's
 * testable without a real server -- see test/support/mock-remote.mjs and
 * test/module-sync/sync-module.test.mjs. `remote` defaults to the real
 * remote.mjs functions; a test passes a mock instead (parameter injection,
 * not `node:test`'s `mock.module()` -- see sync-harvest.mjs's runHarvest for
 * why that isn't available on this project's Node 18.16 target).
 */
export async function runModuleSync(config, remote = { uploadDirectory, remoteChecksums }) {
  console.log(`=== 1. Local checksums (${config.localDir}) ===`);
  const localMap = await computeLocalChecksums(config.localDir);
  console.log(`${localMap.size} files locally`);

  if (config.dryRun) {
    console.log("=== --dry-run: comparing against remote WITHOUT uploading ===");
  } else {
    console.log(`=== 2. Uploading to ${config.remoteHost}:${config.remoteDir} (${localMap.size} files, one at a time -- see remote.mjs for why) ===`);
    await remote.uploadDirectory({ ...config, localMap });
  }

  console.log("=== 3. Remote checksums ===");
  const remoteMap = await remote.remoteChecksums(config);
  for (const relativePath of [...remoteMap.keys()]) {
    // storage/ is Foundry's own write channel (test reports, harvested GM
    // edits) -- never part of this git-tracked folder, never pushed FROM
    // local, per the module README's own table. Without this exclusion,
    // the very first report Foundry ever writes makes every push from then
    // on permanently report a false "only remote" mismatch, since nothing
    // local can ever match a directory that's never supposed to exist here.
    if (relativePath.startsWith("storage/")) remoteMap.delete(relativePath);
  }
  console.log(`${remoteMap.size} files remotely (excluding storage/, Foundry's own write channel)`);

  console.log("=== 4. Comparing (path + content hash together, not hashes alone) ===");
  const diff = diffChecksums(localMap, remoteMap);
  console.log(summarizeDiff(diff));
  for (const p of diff.changed) console.log(`  changed:      ${p}`);
  for (const p of diff.onlyLocal) console.log(`  only local:   ${p}`);
  for (const p of diff.onlyRemote) console.log(`  only remote:  ${p}`);

  if (!diff.isVerified) process.exitCode = 1;
}

async function main() {
  await runModuleSync(config);
}

// Only run when this file is executed directly, never when imported (e.g. by a test importing
// runModuleSync above) -- see sync-harvest.mjs's identical guard for the reasoning and how it
// was verified on this project's actual Node/Windows setup.
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => {
    console.error("module-sync failed:", err);
    process.exitCode = 1;
  });
}
