import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stageCampaignData, cleanupStagedData } from "../../tools/module-sync/stage-campaign-data.mjs";
import { computeLocalChecksums } from "../../tools/module-sync/local-hash.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures", "campaign-data-sample");

test("stageCampaignData: copies only the allow-listed directories, not everything under the data root", async () => {
  const stagingDir = await stageCampaignData(fixtureRoot);
  try {
    assert.ok(existsSync(path.join(stagingDir, "episodes", "ep1.json")), "an allow-listed directory (episodes/) must be staged");
    assert.ok(existsSync(path.join(stagingDir, "npcs", "commander.json")), "an allow-listed directory (npcs/) must be staged");
    assert.ok(!existsSync(path.join(stagingDir, "map")), "map/ is not on the allow-list -- must never be staged, regardless of what it contains");
    assert.ok(!existsSync(path.join(stagingDir, "README.md")), "a loose top-level file outside any allow-listed directory must not be staged either");
  } finally {
    await cleanupStagedData(stagingDir);
  }
});

test("stageCampaignData: staged content is byte-identical to the source, not just present", async () => {
  const stagingDir = await stageCampaignData(fixtureRoot);
  try {
    const staged = readFileSync(path.join(stagingDir, "episodes", "ep1.json"), "utf8");
    const source = readFileSync(path.join(fixtureRoot, "episodes", "ep1.json"), "utf8");
    assert.equal(staged, source);

    const stagedChecksums = await computeLocalChecksums(stagingDir);
    assert.equal(stagedChecksums.size, 2, "exactly the two allow-listed files -- episodes/ep1.json and npcs/commander.json");
  } finally {
    await cleanupStagedData(stagingDir);
  }
});

test("stageCampaignData: a missing allow-listed directory is skipped silently, not an error", async () => {
  // fixtureRoot has no "antagonists"/"campaign"/etc. -- most allow-listed
  // dirs simply won't exist for this small fixture, which must be fine.
  const stagingDir = await stageCampaignData(fixtureRoot);
  try {
    assert.ok(!existsSync(path.join(stagingDir, "antagonists")));
  } finally {
    await cleanupStagedData(stagingDir);
  }
});

test("stageCampaignData: two separate stagings don't collide -- each gets its own fresh temp directory", async () => {
  const first = await stageCampaignData(fixtureRoot);
  const second = await stageCampaignData(fixtureRoot);
  try {
    assert.notEqual(first, second);
    assert.ok(existsSync(path.join(first, "episodes", "ep1.json")));
    assert.ok(existsSync(path.join(second, "episodes", "ep1.json")));
  } finally {
    await cleanupStagedData(first);
    await cleanupStagedData(second);
  }
});

test("cleanupStagedData: actually removes the staging directory", async () => {
  const stagingDir = await stageCampaignData(fixtureRoot);
  assert.ok(existsSync(stagingDir));
  await cleanupStagedData(stagingDir);
  assert.ok(!existsSync(stagingDir));
});
