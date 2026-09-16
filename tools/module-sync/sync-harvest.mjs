#!/usr/bin/env node
/**
 * The return leg: pulls the module's storage/ directory OFF the live server
 * and into this repo, verified the same way the two push scripts verify.
 *
 * Everything the table produces lands in storage/ -- the GM's own session
 * log (foundry/session-log.mjs writes storage/sessions/<date>.json), and any
 * other harvested content the module writes there. Until this existed,
 * nothing brought any of it home: tools/module-sync/ could push content to a
 * session and never read anything back, so the bridge ran one way and the
 * record of what actually happened stayed on a server nobody reads.
 *
 * Why storage/ specifically: it is the ONE directory a Foundry module update
 * does not delete (manifest `persistentStorage: true`), which is exactly why
 * design/foundry-module-design.md §4 put harvested content there. data/ is
 * push-only and safely wiped on every deploy; storage/ is the opposite.
 *
 * READ-ONLY against the server. This never deletes, moves or rewrites
 * anything remote -- promotable content travels Foundry-to-repo only, and a
 * human decides what to merge, because "did the GM's version improve on the
 * authored one" is a judgement call and not a merge algorithm's job.
 *
 * Usage: node tools/module-sync/sync-harvest.mjs [--local-dir ...] [--remote-dir ...] [--remote-host ...] [--key-path ...] [--host-key ...]
 */
import { parseArgs } from "node:util";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeLocalChecksums } from "./local-hash.mjs";
import { downloadDirectory, remoteChecksums, remoteDirectoryExists } from "./remote.mjs";
import { diffChecksums } from "./checksums.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

const { values } = parseArgs({
  options: {
    "local-dir": { type: "string", default: path.join(repoRoot, "harvest") },
    "remote-dir": { type: "string", default: "/home/ubuntu/foundrydata/Data/modules/blank-inheritance/storage" },
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
  console.log(`=== 1. Looking for ${config.remoteHost}:${config.remoteDir} ===`);
  // A missing storage/ is an ordinary state, not a failure: Foundry only
  // creates it once something has written there. Distinguished from a real
  // connection problem before anything tries to cd into it.
  if (!(await remoteDirectoryExists(config))) {
    console.log("No storage/ on the server yet — nothing has been written there. Nothing to harvest.");
    return;
  }

  console.log("=== 2. Remote checksums ===");
  const remoteMap = await remoteChecksums(config);
  console.log(`${remoteMap.size} files remotely`);
  if (remoteMap.size === 0) {
    console.log("storage/ exists but is empty. Nothing to harvest.");
    return;
  }

  console.log(`=== 3. Downloading into ${config.localDir} (${remoteMap.size} files, one at a time) ===`);
  await mkdir(config.localDir, { recursive: true });
  await downloadDirectory({ ...config, remoteMap });

  console.log("=== 4. Local checksums ===");
  const localMap = await computeLocalChecksums(config.localDir);
  console.log(`${localMap.size} files locally`);

  // Same comparison as the push scripts, with the sides SWAPPED -- the
  // server is the source of truth here, not the destination. So remoteMap
  // goes in the first position, and diffChecksums' own field names read
  // inverted from what they mean on a push:
  //
  //   onlyLocal   -> on the server, NOT pulled down.  A failed download.
  //   onlyRemote  -> in the repo, no longer on the server. An older harvest
  //                  of something since deleted. History, not a fault.
  //
  // summarizeDiff is deliberately NOT used for that reason: its wording is
  // written for a push and would state the exact opposite of the truth here.
  console.log("=== 5. Comparing (path + content hash together, not hashes alone) ===");
  const diff = diffChecksums(remoteMap, localMap);
  const missed = diff.onlyLocal;
  const stale = diff.onlyRemote;

  if (!diff.changed.length && !missed.length) {
    console.log(`VERIFIED: all ${diff.unchanged.length} files pulled down match the server exactly.`);
  } else {
    console.log(`MISMATCH: ${diff.changed.length} arrived with different content, ${missed.length} did not arrive at all. Do not treat this harvest as complete.`);
  }
  for (const p of diff.changed) console.log(`  differs:        ${p}`);
  for (const p of missed) console.log(`  did not arrive: ${p}`);
  for (const p of stale) console.log(`  kept in repo:   ${p}  (an earlier harvest; no longer on the server)`);

  if (diff.changed.length || missed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error("sync-harvest failed:", err);
  process.exitCode = 1;
});
