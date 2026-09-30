// Tests tools/module-sync/sync-campaign-data.mjs's runCampaignDataSync() --
// entirely offline, via test/support/mock-remote.mjs and
// test/support/capture-console.mjs. See sync-harvest.test.mjs's header for
// the shared reasoning.
//
// Reuses fixtures/campaign-data-sample/ (already committed for
// stage-campaign-data.test.mjs) as the data root to stage from -- staging
// (stageCampaignData) is real, unmocked filesystem logic; only the two
// remote.mjs calls (uploadDirectory, remoteChecksums) are mocked.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCampaignDataSync } from "../../tools/module-sync/sync-campaign-data.mjs";
import { createMockRemote } from "../support/mock-remote.mjs";
import { captureConsole } from "../support/capture-console.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures", "campaign-data-sample");

/** Unlike sync-harvest/sync-module's callers, this one can legitimately reject (see the
 * "staging dir is cleaned up even if remoteChecksums throws" test below) -- so this helper
 * catches rather than propagates, returning the error alongside the captured lines/exit code. */
async function runCampaignDataSyncCaptured(config, remote) {
  const capture = captureConsole();
  const savedExitCode = process.exitCode;
  process.exitCode = undefined;
  let error = null;
  try {
    await runCampaignDataSync(config, remote);
  } catch (err) {
    error = err;
  }
  const lines = capture.lines;
  const exitCode = process.exitCode;
  capture.restore();
  process.exitCode = savedExitCode;
  return { lines, exitCode, error };
}

function extractStagingDir(lines) {
  const line = lines.find((l) => l.startsWith("=== Staged sync content into "));
  assert.ok(line, "expected the 'Staged sync content into ...' line to be present");
  return line.slice("=== Staged sync content into ".length, line.lastIndexOf(" ==="));
}

function baseConfig(overrides = {}) {
  return {
    dataRoot: fixtureRoot,
    dryRun: false,
    remoteDir: "/home/ubuntu/foundrydata/Data/modules/blank-inheritance/data/campaign",
    remoteHost: "ubuntu@test-host",
    keyPath: "unused-in-tests.ppk",
    hostKey: "SHA256:unused",
    ...overrides,
  };
}

test("runCampaignDataSync: stages the allow-listed data first, then a matching remote is VERIFIED, and the staging dir is cleaned up after", async () => {
  // The exact two files stage-campaign-data.test.mjs already documents this fixture producing.
  const knownStagedPaths = ["episodes/ep1.json", "npcs/commander.json"];

  // remoteChecksums's response is canned up front, so rather than
  // hand-computing real hashes for the fixture, build it from whatever
  // uploadDirectory actually received -- that localMap IS the real staged
  // checksums (computeLocalChecksums already ran for real before this was
  // called), so echoing it back is a faithful "the server now has exactly
  // what was just pushed" simulation, not a shortcut around real hashing.
  let uploadedLocalMap = null;
  const { remote, calls } = createMockRemote({
    uploadDirectory: (arg) => {
      uploadedLocalMap = arg.localMap;
      return undefined;
    },
    remoteChecksums: () => new Map(uploadedLocalMap),
  });

  const { lines, exitCode } = await runCampaignDataSyncCaptured(baseConfig(), remote);

  assert.equal(calls.uploadDirectory.length, 1);
  assert.deepEqual([...calls.uploadDirectory[0].localMap.keys()].sort(), knownStagedPaths.sort());
  assert.ok(lines.some((l) => l.includes("VERIFIED")));
  assert.equal(exitCode, undefined);

  const stagingDir = extractStagingDir(lines);
  assert.ok(!existsSync(stagingDir), "the staging directory must be removed once the sync finishes");
});

test("runCampaignDataSync: --dry-run never calls uploadDirectory, and still cleans up the staging dir", async () => {
  const { remote, calls } = createMockRemote({ remoteChecksums: new Map() });
  const { lines, exitCode } = await runCampaignDataSyncCaptured(baseConfig({ dryRun: true }), remote);

  assert.equal(calls.uploadDirectory.length, 0, "--dry-run must never call uploadDirectory");
  assert.ok(lines.some((l) => l.includes("--dry-run")));

  const stagingDir = extractStagingDir(lines);
  assert.ok(!existsSync(stagingDir));
  // Two real local files vs. an empty remote -- a genuine mismatch, expected here.
  assert.equal(exitCode, 1);
});

test("runCampaignDataSync: a real mismatch is reported and fails the exit code", async () => {
  const { remote } = createMockRemote({ remoteChecksums: new Map([["episodes/ep1.json", "wrong-hash"]]) });
  const { lines, exitCode } = await runCampaignDataSyncCaptured(baseConfig(), remote);

  assert.equal(exitCode, 1);
  assert.ok(lines.some((l) => l.includes("changed:") && l.includes("episodes/ep1.json")));
  assert.ok(lines.some((l) => l.includes("only local:") && l.includes("npcs/commander.json")));
});

test("runCampaignDataSync: the staging directory is cleaned up even when remoteChecksums throws mid-run", async () => {
  const { remote } = createMockRemote({ remoteChecksums: new Error("simulated connection drop") });
  const { lines, error } = await runCampaignDataSyncCaptured(baseConfig(), remote);

  assert.ok(error, "expected runCampaignDataSync to reject when remoteChecksums throws");
  assert.match(error.message, /simulated connection drop/);

  const stagingDir = extractStagingDir(lines);
  assert.ok(!existsSync(stagingDir), "the finally block must clean up the staging dir even on a thrown error");
});

test("runCampaignDataSync: CRITICAL -- refuses before staging or sending anything if the repo holds older words than Ingram's edits", async () => {
  const { remote, calls } = createMockRemote({ remoteChecksums: new Map() });
  const reverted = [{ file: "scene-briefs/episode-x", path: "title", kind: "field", recordId: "r" }];
  const { lines, exitCode } = await runCampaignDataSyncCaptured(baseConfig({ checkReversions: () => reverted }), remote);
  assert.equal(exitCode, 1);
  assert.equal(calls.uploadDirectory.length, 0);
  assert.equal(calls.remoteChecksums.length, 0);
  assert.ok(lines.some((l) => l.startsWith("REFUSED") && l.includes("npm run edits -- restore")), lines.join("\n"));
  assert.ok(!lines.some((l) => l.startsWith("=== Staged")), "nothing was even staged");
});
