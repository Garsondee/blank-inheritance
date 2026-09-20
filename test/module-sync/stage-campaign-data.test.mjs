import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { stageCampaignData, cleanupStagedData, SYNCED_MAP_FILES } from "../../tools/module-sync/stage-campaign-data.mjs";
import { computeLocalChecksums } from "../../tools/module-sync/local-hash.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(here, "fixtures", "campaign-data-sample");

test("stageCampaignData: copies only the allow-listed directories, not everything under the data root", async () => {
  const stagingDir = await stageCampaignData(fixtureRoot);
  try {
    assert.ok(existsSync(path.join(stagingDir, "episodes", "ep1.json")), "an allow-listed directory (episodes/) must be staged");
    assert.ok(existsSync(path.join(stagingDir, "npcs", "commander.json")), "an allow-listed directory (npcs/) must be staged");
    // The fixture's own map/ holds style/theme.json, not any of
    // SYNCED_MAP_FILES's named files -- so this also proves the bulk of
    // map/ (the 115MB+ GIS root this fixture stands in for) is still never
    // staged, even though specific named files under it now are (see
    // the dedicated tests below).
    assert.ok(!existsSync(path.join(stagingDir, "map")), "map/ holds no SYNCED_MAP_FILES entry in this fixture -- nothing should be staged from it");
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

/* ------------------------------------------------------------------ */
/*  data/map/ -- exactly the named files, never the directory wholesale */
/* ------------------------------------------------------------------ */

/** A throwaway data root with a map/ that mixes SYNCED_MAP_FILES with everything else that lives there in the real repo (bulk GIS content this pipeline must never touch). */
async function makeMapDataRoot() {
  const root = await mkdtemp(path.join(os.tmpdir(), "blank-inheritance-map-fixture-"));
  await mkdir(path.join(root, "map"), { recursive: true });
  for (const name of SYNCED_MAP_FILES) await writeFile(path.join(root, "map", name), JSON.stringify({ name }));
  await writeFile(path.join(root, "map", "kurose.gpkg"), "not really a 115MB GIS store, but stands in for one");
  return root;
}

test("stageCampaignData: every SYNCED_MAP_FILES entry is staged under map/ when present", async () => {
  const dataRoot = await makeMapDataRoot();
  const stagingDir = await stageCampaignData(dataRoot);
  try {
    for (const name of SYNCED_MAP_FILES) {
      assert.ok(existsSync(path.join(stagingDir, "map", name)), `${name} should be staged under map/`);
    }
  } finally {
    await cleanupStagedData(stagingDir);
  }
});

test("stageCampaignData: everything else under map/ is left behind, even sitting right next to the named files", async () => {
  const dataRoot = await makeMapDataRoot();
  const stagingDir = await stageCampaignData(dataRoot);
  try {
    assert.ok(!existsSync(path.join(stagingDir, "map", "kurose.gpkg")), "an unlisted file under map/ must never be staged");
  } finally {
    await cleanupStagedData(stagingDir);
  }
});

test("stageCampaignData: a data root with neither named map file present stages no map/ directory at all", async () => {
  // The real repo's own state today for campaign-data-sample -- see the
  // first test above. Restated here as its own case so this specific
  // guarantee has one test that would fail if it ever regressed, rather than
  // riding along as a side effect of an unrelated assertion.
  const stagingDir = await stageCampaignData(fixtureRoot);
  try {
    assert.ok(!existsSync(path.join(stagingDir, "map")));
  } finally {
    await cleanupStagedData(stagingDir);
  }
});
