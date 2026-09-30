// Tier 2 — scene edits against the REAL repo (design/scene-edits.md).
//
// Ingram's critical requirement, 2026-09-27: "things I rewrite don't get
// overwritten by the old content." The deploy refuses on it; this makes the
// test suite refuse on it too, so a script, a regeneration or a stale copy
// that puts old words back over hers fails `npm test` the same day, whoever
// ran it.

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { recordFilename, validateRecord } from "../module/blank-inheritance/scripts/core/scene-edits.mjs";
import { listHarvested, readLedger } from "../tools/scene-edits/store.mjs";
import { checkReversions, pathsFor } from "../tools/scene-edits/edits.mjs";
import { campaignDataSources } from "../tools/module-sync/stage-campaign-data.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const paths = pathsFor(repoRoot);

test("CRITICAL: the repo holds every word of every edit of Ingram's that has been merged", () => {
  const reversions = checkReversions(paths);
  assert.deepEqual(
    reversions,
    [],
    `The repo has gone back to older words than Ingram's:\n${reversions.map((r) => `  data/${r.file}.json ${r.path} (${r.kind})`).join("\n")}\n` +
      "Put hers back with `npm run edits -- restore`, and find what wrote the old copy."
  );
});

test("every harvested edit is a valid record, named for its own id, exactly as it came off the server", () => {
  for (const [name, text] of listHarvested(paths.harvestDir)) {
    const record = JSON.parse(text);
    assert.deepEqual(validateRecord(record), [], name);
    assert.equal(recordFilename(record), name);
  }
});

test("the ledger only speaks of edits that came home, in states the Runner understands", () => {
  const ledger = readLedger(paths.ledgerPath);
  const home = new Set([...listHarvested(paths.harvestDir).keys()].map((name) => name.replace(/^scene-edit-/, "").replace(/\.json$/, "")));
  for (const [id, entry] of Object.entries(ledger.entries)) {
    assert.ok(home.has(id), `ledger entry ${id} has no harvested record`);
    assert.ok(["merged", "superseded", "done", "withdrawn"].includes(entry.state), `${id}: ${entry.state}`);
  }
});

test("the ledger deploys to the exact place the Runner reads it from", async () => {
  const sources = await campaignDataSources(path.join(repoRoot, "data"));
  assert.ok(sources.has("campaign/scene-edits.json"), "data/campaign/scene-edits.json must be in the campaign data a deploy sends");
  // foundry/scene-edits.mjs reads data/campaign/<deployed path>: the doubled
  // data/campaign/campaign/ that campaign-state.mjs documents.
  const { readFileSync } = await import("node:fs");
  const adapter = readFileSync(path.join(repoRoot, "module", "blank-inheritance", "scripts", "foundry", "scene-edits.mjs"), "utf8");
  assert.match(adapter, /const LEDGER_PATH = "data\/campaign\/campaign\/scene-edits\.json";/);
});
