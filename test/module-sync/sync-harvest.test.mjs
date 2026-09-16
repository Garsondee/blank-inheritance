// Tests tools/module-sync/sync-harvest.mjs's runHarvest() -- the pull-down
// orchestration around remote.mjs's four network calls -- entirely offline,
// via test/support/mock-remote.mjs (a parameter-injected stand-in for
// remote.mjs, not a simulation of SSH/SCP itself) and
// test/support/capture-console.mjs (this script reports its result as
// printed lines + process.exitCode, not a return value, so that's what these
// tests read). See remote.mjs's own header comment for why the real
// pscp/plink adapter has no test of its own, and sync-harvest.mjs's own
// runHarvest doc comment for why parameter injection rather than
// `node:test`'s `mock.module()` (not available on this project's Node 18.16
// target -- verified directly, not assumed).
//
// downloadDirectory's mock default (see mock-remote.mjs) actually writes
// files to a real temp directory, so these tests exercise the REAL
// local-hash.mjs/checksums.mjs logic on real bytes, not a faked diff --
// only what the "server" claims (remoteChecksums' canned Map) and what
// actually lands on disk (the `files` given to the mock) are synthetic.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runHarvest } from "../../tools/module-sync/sync-harvest.mjs";
import { createMockRemote } from "../support/mock-remote.mjs";
import { captureConsole } from "../support/capture-console.mjs";

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

async function makeTempDir() {
  return mkdtemp(path.join(os.tmpdir(), "bi-sync-harvest-test-"));
}

/** Runs runHarvest() with console.log captured and process.exitCode isolated from the rest of the suite. */
async function runHarvestCaptured(config, remote) {
  const capture = captureConsole();
  const savedExitCode = process.exitCode;
  process.exitCode = undefined;
  try {
    await runHarvest(config, remote);
    return { lines: capture.lines, exitCode: process.exitCode };
  } finally {
    capture.restore();
    process.exitCode = savedExitCode;
  }
}

function baseConfig(localDir) {
  return {
    remoteHost: "ubuntu@test-host",
    remoteDir: "/home/ubuntu/foundrydata/Data/modules/blank-inheritance/storage",
    localDir,
    keyPath: "unused-in-tests.ppk",
    hostKey: "SHA256:unused",
  };
}

test("runHarvest: no storage/ on the server yet -- friendly message, no further calls, exit code stays success", async () => {
  const { remote, calls } = createMockRemote({ remoteDirectoryExists: false });
  const { lines, exitCode } = await runHarvestCaptured(baseConfig("/unused"), remote);

  assert.ok(
    lines.some((l) => l.includes("Nothing to harvest")),
    "expected the friendly 'nothing to harvest' message"
  );
  assert.equal(calls.remoteChecksums.length, 0, "remoteChecksums must not be called when the directory doesn't exist");
  assert.equal(calls.downloadDirectory.length, 0, "downloadDirectory must not be called when the directory doesn't exist");
  assert.equal(exitCode, undefined, "a missing storage/ is not a failure");
});

test("runHarvest: remoteChecksums reports an empty map -- 'empty' message, no download, exit code stays success", async () => {
  const { remote, calls } = createMockRemote({
    remoteDirectoryExists: true,
    remoteChecksums: new Map(),
  });
  const { lines, exitCode } = await runHarvestCaptured(baseConfig("/unused"), remote);

  assert.ok(
    lines.some((l) => l.includes("empty") && l.includes("Nothing to harvest")),
    "expected the 'exists but is empty' message"
  );
  assert.equal(calls.downloadDirectory.length, 0, "downloadDirectory must not be called when there's nothing to pull");
  assert.equal(exitCode, undefined, "an empty storage/ is not a failure");
});

test("runHarvest: a normal successful pull -- downloadDirectory gets exactly what remoteChecksums reported, clean diff, VERIFIED", async () => {
  const localDir = await makeTempDir();
  try {
    const fileContents = {
      "sessions/2026-09-09.json": JSON.stringify({ ok: true }),
      "runs/head-height.json": "plain text content",
    };
    const remoteMap = new Map(Object.entries(fileContents).map(([p, c]) => [p, sha256(c)]));
    const { remote, calls } = createMockRemote({
      remoteDirectoryExists: true,
      remoteChecksums: remoteMap,
      files: fileContents,
    });

    const { lines, exitCode } = await runHarvestCaptured(baseConfig(localDir), remote);

    assert.equal(calls.downloadDirectory.length, 1);
    assert.deepEqual(
      [...calls.downloadDirectory[0].remoteMap.keys()].sort(),
      Object.keys(fileContents).sort(),
      "downloadDirectory must be called with exactly the files remoteChecksums reported"
    );
    assert.ok(existsSync(path.join(localDir, "sessions", "2026-09-09.json")), "expected the file to actually land on disk");
    assert.ok(existsSync(path.join(localDir, "runs", "head-height.json")));

    assert.equal(exitCode, undefined, "a clean pull must not set a failing exit code");
    assert.ok(lines.some((l) => l.includes("VERIFIED")), "expected the VERIFIED summary line");
  } finally {
    await rm(localDir, { recursive: true, force: true });
  }
});

test("runHarvest: a file that arrives with different content is reported under 'differs:' and fails the exit code", async () => {
  const localDir = await makeTempDir();
  try {
    const claimedContent = "what the server's sha256sum said this file hashes to";
    const actualContent = "what actually landed locally -- deliberately different";
    const remoteMap = new Map([["a.json", sha256(claimedContent)]]);
    const { remote } = createMockRemote({
      remoteDirectoryExists: true,
      remoteChecksums: remoteMap,
      files: { "a.json": actualContent },
    });

    const { lines, exitCode } = await runHarvestCaptured(baseConfig(localDir), remote);

    assert.equal(exitCode, 1, "content that differs after download must fail the harvest");
    assert.ok(
      lines.some((l) => l.includes("differs:") && l.includes("a.json")),
      "expected a 'differs:' line naming the file"
    );
    assert.ok(lines.some((l) => l.includes("MISMATCH")));
  } finally {
    await rm(localDir, { recursive: true, force: true });
  }
});

test("runHarvest: a file the server reported but that never landed locally is reported under 'did not arrive:' and fails the exit code", async () => {
  const localDir = await makeTempDir();
  try {
    const remoteMap = new Map([["b.json", sha256("anything, never actually written")]]);
    const { remote } = createMockRemote({
      remoteDirectoryExists: true,
      remoteChecksums: remoteMap,
      files: {}, // b.json deliberately absent -- simulates a single failed pscp
    });

    const { lines, exitCode } = await runHarvestCaptured(baseConfig(localDir), remote);

    assert.equal(exitCode, 1, "a file that never arrived must fail the harvest");
    assert.ok(
      lines.some((l) => l.includes("did not arrive:") && l.includes("b.json")),
      "expected a 'did not arrive:' line naming the file"
    );
  } finally {
    await rm(localDir, { recursive: true, force: true });
  }
});

test("runHarvest: a file kept locally from an earlier harvest but no longer on the server is reported under 'kept in repo:' and does NOT fail the exit code", async () => {
  const localDir = await makeTempDir();
  try {
    // Pre-seed the harvest destination with a leftover from an earlier run --
    // downloadDirectory only ever touches paths in remoteMap, but
    // computeLocalChecksums walks the whole directory, so a stray file like
    // this is exactly how "history, not a fault" actually arises in practice.
    await mkdir(path.join(localDir, "sessions"), { recursive: true });
    await writeFile(path.join(localDir, "sessions", "2026-08-01.json"), "an older session, already harvested once");

    const currentContent = "the one file the server currently reports";
    const remoteMap = new Map([["sessions/2026-09-09.json", sha256(currentContent)]]);
    const { remote } = createMockRemote({
      remoteDirectoryExists: true,
      remoteChecksums: remoteMap,
      files: { "sessions/2026-09-09.json": currentContent },
    });

    const { lines, exitCode } = await runHarvestCaptured(baseConfig(localDir), remote);

    assert.equal(exitCode, undefined, "a stale local file must never fail the harvest -- this file's own comments are emphatic about this");
    assert.ok(
      lines.some((l) => l.includes("kept in repo:") && l.includes("2026-08-01.json")),
      "expected a 'kept in repo:' line naming the stale file"
    );
    assert.ok(
      lines.some((l) => l.includes("VERIFIED")),
      "changed and missed are both empty, so the overall read must still be VERIFIED despite the stale file"
    );
  } finally {
    await rm(localDir, { recursive: true, force: true });
  }
});

test("runHarvest: changed + missing + stale can all be reported from the same run, independently", async () => {
  const localDir = await makeTempDir();
  try {
    await mkdir(path.join(localDir, "old"), { recursive: true });
    await writeFile(path.join(localDir, "old", "stale.json"), "an old harvest, no longer on the server");

    const goodContent = "unchanged file, matches on both sides";
    const wrongContent = "locally different from what the server claims";
    const remoteMap = new Map([
      ["good.json", sha256(goodContent)],
      ["changed.json", sha256("what the server says changed.json hashes to")],
      ["missing.json", sha256("never arrives")],
    ]);
    const { remote } = createMockRemote({
      remoteDirectoryExists: true,
      remoteChecksums: remoteMap,
      files: {
        "good.json": goodContent,
        "changed.json": wrongContent,
        // missing.json deliberately omitted
      },
    });

    const { lines, exitCode } = await runHarvestCaptured(baseConfig(localDir), remote);

    assert.equal(exitCode, 1, "at least one real failure (changed + missing) must fail the run");
    assert.ok(lines.some((l) => l.includes("differs:") && l.includes("changed.json")));
    assert.ok(lines.some((l) => l.includes("did not arrive:") && l.includes("missing.json")));
    assert.ok(lines.some((l) => l.includes("kept in repo:") && l.includes("stale.json")));
    // good.json shouldn't be named as a problem anywhere.
    assert.ok(!lines.some((l) => /differs:|did not arrive:/.test(l) && l.includes("good.json")));
  } finally {
    await rm(localDir, { recursive: true, force: true });
  }
});
