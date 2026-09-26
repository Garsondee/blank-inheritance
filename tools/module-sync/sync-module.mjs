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

// Never even WALK the local campaign mirror: this push already refuses to
// upload it (see the comment further down), and walking it meant hashing the
// 13,182 files left by the 2026-09-20/21 `cp -r /*` accident on every single
// run -- enough that a module push stopped completing at all. Same rule as the
// upload exclusion, applied one stage earlier so the cost is never paid.
const SKIP_FROM_HASH = (relativePath) =>
  relativePath === "data/campaign" || relativePath.startsWith("data/campaign/");
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
  const rawLocalMap = await computeLocalChecksums(config.localDir, { skip: SKIP_FROM_HASH });
  // storage/ is Foundry's own write channel (test reports, harvested GM
  // edits) -- never part of this git-tracked folder, never meant to be
  // pushed FROM local, per the module README's own table. This EXCLUSION,
  // not just the remote-side one below, is what actually enforces that:
  // computeLocalChecksums's own contract is "hash everything found, skip
  // nothing" (see local-hash.mjs), so a local Foundry install's storage/
  // directory -- reachable here through the same junction a developer uses
  // for local testing (see reference_local_foundry_test_environment) -- was
  // being uploaded right alongside real module code with nothing to stop
  // it. Found live 2026-09-16: a local scene-close-dialogue test session
  // log leaked onto the production server's storage/sessions/ this way,
  // silently, because the comparison step's OWN storage/ exclusion (below)
  // made the false "only local" result LOOK like confirmation nothing had
  // been sent, when the upload step had already sent it minutes earlier.
  const withoutStorage = new Map([...rawLocalMap].filter(([relativePath]) => !relativePath.startsWith("storage/")));
  // data/campaign/ is a SEPARATE, manually-refreshed local mirror of
  // repo-root data/ (see reference_local_foundry_test_environment) -- real
  // campaign content belongs on the server too, but it already has its own
  // dedicated, allow-listed push (sync-campaign-data.mjs / stage-campaign-
  // data.mjs), which copies from the actual source of truth rather than
  // whatever happens to be sitting in this local, gitignored, dev-only copy.
  // Found live 2026-09-20/21: this local mirror had been corrupted by an
  // unrelated shell accident (a stray `cp -r /*` had dumped tens of
  // thousands of files -- fragments of the Windows registry and a temp
  // directory -- into it), and this wholesale module push was about to
  // upload every one of them to the production server before failing on an
  // OS command-line-length limit first. Excluding data/campaign/ here isn't
  // just a fix for that one incident: this push should never have been the
  // thing carrying campaign data in the first place, so the exclusion stays
  // even once the local mirror is clean, the same way storage/ stays
  // excluded even on a server with nothing GM-written in it yet.
  const localMap = new Map([...withoutStorage].filter(([relativePath]) => !relativePath.startsWith("data/campaign/")));
  const skippedLocalStorage = rawLocalMap.size - withoutStorage.size;
  const skippedLocalCampaignData = withoutStorage.size - localMap.size;
  console.log(
    `${localMap.size} files locally` +
      (skippedLocalStorage > 0 ? ` (${skippedLocalStorage} under storage/ excluded -- never pushed from local)` : "") +
      ` (data/campaign/ excluded -- not walked at all, and pushed separately by sync-campaign-data.mjs)` +
      // Defence in depth: the walk above should already have skipped these, so
      // anything counted here means the two rules have drifted apart and the
      // upload filter is the only thing still catching it.
      (skippedLocalCampaignData > 0 ? ` [${skippedLocalCampaignData} slipped past the walk skip and were filtered at upload]` : "")
  );

  if (config.dryRun) {
    console.log("=== --dry-run: comparing against remote WITHOUT uploading ===");
  } else {
    console.log(`=== 2. Uploading to ${config.remoteHost}:${config.remoteDir} (${localMap.size} files, one at a time -- see remote.mjs for why) ===`);
    await remote.uploadDirectory({ ...config, localMap });
  }

  console.log("=== 3. Remote checksums ===");
  const remoteMap = await remote.remoteChecksums(config);
  for (const relativePath of [...remoteMap.keys()]) {
    // The comparison must ALSO ignore storage/ on the remote side: Foundry
    // itself writes there independently of anything this script pushes (its
    // own session logs, harvested content), so a real remote-only file under
    // storage/ is expected and not a "missing from local" fault the way an
    // unexplained one anywhere else in the module tree would be.
    if (relativePath.startsWith("storage/")) remoteMap.delete(relativePath);
    // Same reasoning as the local-side exclusion above: the real remote
    // data/campaign/ is sync-campaign-data.mjs's territory, verified by its
    // own run, not this one's -- comparing against it here would just be
    // re-litigating a different script's job with a different (and, for
    // local testing, possibly stale or corrupted) source map.
    if (relativePath.startsWith("data/campaign/")) remoteMap.delete(relativePath);
  }
  console.log(`${remoteMap.size} files remotely (excluding storage/ and data/campaign/, pushed/managed elsewhere)`);

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
