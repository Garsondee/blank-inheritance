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
    "local-dir": { type: "string", default: path.join(repoRoot, "module", "mythica-machina-blank-inheritance-adventure-module") },
    "remote-dir": { type: "string", default: "/home/ubuntu/foundrydata/Data/modules/mythica-machina-blank-inheritance-adventure-module" },
    "remote-host": { type: "string", default: "ubuntu@132.145.38.144" },
    "key-path": { type: "string", default: path.join(repoRoot, "SSH.ppk") },
    "host-key": { type: "string", default: "SHA256:7EsvSGvu2DqJfokfzaVnysbx/Ehf52fij/M9DLHo9cE" },
  },
});

const config = {
  localDir: values["local-dir"],
  remoteDir: values["remote-dir"],
  remoteHost: values["remote-host"],
  keyPath: values["key-path"],
  hostKey: values["host-key"],
};

async function main() {
  console.log(`=== 1. Local checksums (${config.localDir}) ===`);
  const localMap = await computeLocalChecksums(config.localDir);
  console.log(`${localMap.size} files locally`);

  if (values["dry-run"]) {
    console.log("=== --dry-run: comparing against remote WITHOUT uploading ===");
  } else {
    console.log(`=== 2. Uploading to ${config.remoteHost}:${config.remoteDir} ===`);
    await uploadDirectory(config);
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
}

main().catch((err) => {
  console.error("module-sync failed:", err);
  process.exitCode = 1;
});
