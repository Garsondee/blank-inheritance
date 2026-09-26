// Tests tools/module-sync/sync-module.mjs's runModuleSync() -- entirely
// offline, via test/support/mock-remote.mjs and test/support/capture-console.mjs.
// See sync-harvest.test.mjs's header for the shared reasoning (parameter
// injection instead of `node:test`'s `mock.module()`, why the mock isn't a
// simulation of SSH/SCP).
//
// Reuses fixtures/local-hash-sample/ (already committed for
// local-hash.test.mjs) as the "module directory" being pushed, rather than
// adding a second near-identical fixture -- it's just two real files with
// known real hashes, which is all a push needs on the local side.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";

import { runModuleSync } from "../../tools/module-sync/sync-module.mjs";
import { computeLocalChecksums } from "../../tools/module-sync/local-hash.mjs";
import { createMockRemote } from "../support/mock-remote.mjs";
import { captureConsole } from "../support/capture-console.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(here, "fixtures", "local-hash-sample");

async function runModuleSyncCaptured(config, remote) {
  const capture = captureConsole();
  const savedExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    await runModuleSync(config, remote);
    return { lines: capture.lines, exitCode: process.exitCode };
  } finally {
    capture.restore();
    process.exitCode = savedExitCode;
  }
}

function baseConfig(overrides = {}) {
  return {
    dryRun: false,
    localDir: fixtureDir,
    remoteDir: "/home/ubuntu/foundrydata/Data/modules/blank-inheritance",
    remoteHost: "ubuntu@test-host",
    keyPath: "unused-in-tests.ppk",
    hostKey: "SHA256:unused",
    ...overrides,
  };
}

test("runModuleSync: --dry-run compares without uploading, and a matching remote is VERIFIED", async () => {
  const localMap = await computeLocalChecksums(fixtureDir);
  const { remote, calls } = createMockRemote({ remoteChecksums: new Map(localMap) });

  const { lines, exitCode } = await runModuleSyncCaptured(baseConfig({ dryRun: true }), remote);

  assert.equal(calls.uploadDirectory.length, 0, "--dry-run must never call uploadDirectory");
  assert.ok(lines.some((l) => l.includes("--dry-run")));
  assert.ok(lines.some((l) => l.includes("VERIFIED")));
  assert.equal(exitCode, undefined);
});

test("runModuleSync: a normal push uploads exactly the local files, and a matching remote afterward is VERIFIED", async () => {
  const localMap = await computeLocalChecksums(fixtureDir);
  const { remote, calls } = createMockRemote({ remoteChecksums: new Map(localMap) });

  const { lines, exitCode } = await runModuleSyncCaptured(baseConfig({ dryRun: false }), remote);

  assert.equal(calls.uploadDirectory.length, 1);
  assert.deepEqual(
    [...calls.uploadDirectory[0].localMap.keys()].sort(),
    ["greeting.txt", "subdir/nested.json"],
    "uploadDirectory must be called with exactly the local fixture's files"
  );
  assert.ok(lines.some((l) => l.includes("VERIFIED")));
  assert.equal(exitCode, undefined);
});

test("runModuleSync: a remote-only storage/ entry is excluded before comparing (regression guard, see the script's own comment)", async () => {
  const localMap = await computeLocalChecksums(fixtureDir);
  const remoteMap = new Map(localMap);
  // Foundry's own write channel -- never pushed from local, must never count
  // as an "only remote" mismatch just because it exists on the server.
  remoteMap.set("storage/sessions/2026-09-09.json", "irrelevant-hash-never-compared");

  const { remote } = createMockRemote({ remoteChecksums: remoteMap });
  const { lines, exitCode } = await runModuleSyncCaptured(baseConfig(), remote);

  assert.ok(
    lines.some((l) => l.includes("2 files remotely (excluding storage/")),
    "expected the storage/ entry to be excluded from the reported remote count"
  );
  assert.ok(lines.some((l) => l.includes("VERIFIED")), "a storage/-only difference must not break verification");
  assert.equal(exitCode, undefined);
});

test("runModuleSync: a LOCAL storage/ file is excluded from the upload itself, not just from the comparison (regression, found live 2026-09-16)", async () => {
  // The bug this guards: computeLocalChecksums's own contract is "hash
  // everything, skip nothing" (local-hash.mjs), and the ONLY storage/
  // exclusion that existed before this fix was applied to the REMOTE map,
  // for the comparison step -- nothing stopped a local storage/ file (e.g.
  // one reachable through the same junction a developer uses for local
  // Foundry testing) from being handed to uploadDirectory and genuinely
  // sent to the server. Confirmed live: a local scene-close-dialogue test
  // session log leaked into the production server's storage/sessions/ this
  // exact way.
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "bi-sync-module-storage-test-"));
  try {
    await writeFile(path.join(tempDir, "module.json"), "{}");
    await mkdir(path.join(tempDir, "storage", "sessions"), { recursive: true });
    await writeFile(path.join(tempDir, "storage", "sessions", "2026-09-16.json"), '{"entries":["local test junk"]}');

    const localMap = await computeLocalChecksums(tempDir);
    assert.ok(localMap.has("storage/sessions/2026-09-16.json"), "sanity check: the raw local map (pre-fix input) really does contain the storage/ file");

    const { remote, calls } = createMockRemote({ remoteChecksums: new Map() });
    const { lines } = await runModuleSyncCaptured(baseConfig({ localDir: tempDir }), remote);

    assert.equal(calls.uploadDirectory.length, 1);
    assert.equal(
      calls.uploadDirectory[0].localMap.has("storage/sessions/2026-09-16.json"),
      false,
      "the storage/ file must never reach uploadDirectory's localMap"
    );
    assert.deepEqual([...calls.uploadDirectory[0].localMap.keys()], ["module.json"]);
    assert.ok(
      lines.some((l) => l.includes("1 files locally") && l.includes("1 under storage/ excluded")),
      "the local-file-count line should say so plainly, not just silently drop it"
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("runModuleSync: a remote-only data/campaign/ entry is excluded before comparing (that tree is sync-campaign-data.mjs's own job)", async () => {
  const localMap = await computeLocalChecksums(fixtureDir);
  const remoteMap = new Map(localMap);
  remoteMap.set("data/campaign/scene-briefs/whatever.json", "irrelevant-hash-never-compared");

  const { remote } = createMockRemote({ remoteChecksums: remoteMap });
  const { lines, exitCode } = await runModuleSyncCaptured(baseConfig(), remote);

  assert.ok(
    lines.some((l) => l.includes("2 files remotely (excluding storage/ and data/campaign/")),
    "expected the data/campaign/ entry to be excluded from the reported remote count"
  );
  assert.ok(lines.some((l) => l.includes("VERIFIED")), "a data/campaign/-only difference must not break verification");
  assert.equal(exitCode, undefined);
});

test("runModuleSync: a LOCAL data/campaign/ file is excluded from the upload itself (regression, found live 2026-09-20/21)", async () => {
  // The bug this guards: a shell accident had dumped tens of thousands of
  // unrelated files into a developer's local module/blank-inheritance/data/
  // campaign/ (a manually-refreshed mirror, not the git-tracked module
  // itself), and nothing stopped computeLocalChecksums's "hash everything,
  // skip nothing" contract from handing all of it straight to
  // uploadDirectory alongside real module code -- the push only failed
  // (loudly, before anything left the machine) because the OS's own
  // command-line-length limit was hit first. data/campaign/ has its own
  // dedicated, allow-listed push (sync-campaign-data.mjs) and should never
  // be part of this wholesale one regardless of what's sitting in the local
  // copy at push time.
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "bi-sync-module-campaign-test-"));
  try {
    await writeFile(path.join(tempDir, "module.json"), "{}");
    await mkdir(path.join(tempDir, "data", "campaign", "scene-briefs"), { recursive: true });
    await writeFile(path.join(tempDir, "data", "campaign", "scene-briefs", "whatever.json"), '{"not":"actually pushed from here"}');

    // The raw walk, with no skip, still sees it -- that is the unguarded input.
    const localMap = await computeLocalChecksums(tempDir);
    assert.ok(localMap.has("data/campaign/scene-briefs/whatever.json"), "sanity check: the raw local map (pre-fix input) really does contain the data/campaign/ file");

    // With the skip sync-module now passes, it is never even read. 2026-09-22:
    // the original fix excluded data/campaign/ from the UPLOAD but still walked
    // and SHA-256'd it, which meant 13,182 junk files were hashed on every push
    // and the push stopped completing at all.
    const skipped = await computeLocalChecksums(tempDir, {
      skip: (rel) => rel === "data/campaign" || rel.startsWith("data/campaign/")
    });
    assert.deepEqual([...skipped.keys()], ["module.json"], "the skip predicate must prevent the walk, not just the upload");

    const { remote, calls } = createMockRemote({ remoteChecksums: new Map() });
    const { lines } = await runModuleSyncCaptured(baseConfig({ localDir: tempDir }), remote);

    assert.equal(calls.uploadDirectory.length, 1);
    assert.equal(
      calls.uploadDirectory[0].localMap.has("data/campaign/scene-briefs/whatever.json"),
      false,
      "the data/campaign/ file must never reach uploadDirectory's localMap"
    );
    assert.deepEqual([...calls.uploadDirectory[0].localMap.keys()], ["module.json"]);
    assert.ok(
      lines.some((l) => l.includes("1 files locally") && l.includes("data/campaign/ excluded")),
      "the local-file-count line should say so plainly, not just silently drop it"
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("runModuleSync: a real mismatch (remote missing a file) is reported and fails the exit code", async () => {
  const localMap = await computeLocalChecksums(fixtureDir);
  const remoteMap = new Map(localMap);
  remoteMap.delete("subdir/nested.json"); // never made it to the server

  const { remote } = createMockRemote({ remoteChecksums: remoteMap });
  const { lines, exitCode } = await runModuleSyncCaptured(baseConfig(), remote);

  assert.equal(exitCode, 1);
  assert.ok(lines.some((l) => l.includes("only local:") && l.includes("subdir/nested.json")));
  assert.ok(lines.some((l) => l.includes("MISMATCH")));
});
