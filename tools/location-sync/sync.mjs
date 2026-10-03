#!/usr/bin/env node
/**
 * `npm run locations` -- pull Location Editor records off Foundry's storage/
 * (design/location-editor.md §5), apply each to data/locations/, write the
 * ledger. Mirrors tools/scene-edits/edits.mjs's shape; no deploy-blocking
 * guard, per the design doc's own reasoning (§5 point 6): an unpulled
 * drawing is merely late, never at risk of being overwritten.
 *
 * Usage:
 *   node tools/location-sync/sync.mjs                pull from the live server
 *   node tools/location-sync/sync.mjs --from <dir>    pull from a local folder
 *                                                      laid out like storage/
 *                                                      (a local test Foundry,
 *                                                      or a test's scratch dir)
 *   node tools/location-sync/sync.mjs status          report only, no writes
 */

import { parseArgs } from "node:util";
import { existingLocationIds, applyRecord } from "./merge.mjs";
import { targetKey } from "../../module/blank-inheritance/scripts/core/siting.mjs";
import { folderInbox, pullNew, serverInbox } from "./inbox.mjs";
import { DEFAULT_PATHS, acquireLock, listHarvested, readLedger, saveHarvested, writeLedger } from "./store.mjs";

function parseCli(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { from: { type: "string" } }
  });
  return { command: positionals[0] ?? "pull", from: values.from ?? null };
}

async function main() {
  const { command, from } = parseCli(process.argv.slice(2));
  const inbox = from ? folderInbox(from) : serverInbox();
  const paths = DEFAULT_PATHS;

  const harvested = listHarvested(paths.harvestDir);
  const { fetched, problems, onServer } = await pullNew({ inbox, harvested });
  console.log(`Location edits: ${inbox.describe} -- ${onServer} record(s) there, ${fetched.length} new.`);
  for (const p of problems) console.warn(`  ! ${p}`);

  if (command === "status") {
    for (const { name } of fetched) console.log(`  pending: ${name}`);
    return;
  }

  if (!fetched.length) {
    console.log("Nothing new to merge.");
    return;
  }

  const release = acquireLock(paths.harvestDir);
  if (!release) {
    console.warn("Another location-sync run is already in progress -- try again shortly.");
    process.exitCode = 1;
    return;
  }
  try {
    for (const { name, text } of fetched) saveHarvested(paths.harvestDir, name, text);

    const ledger = readLedger(paths.ledgerPath);
    const existingIds = existingLocationIds(paths.dataRoot);
    let merged = 0, clashed = 0, errored = 0;
    for (const { record } of fetched) {
      const result = applyRecord(record, { dataRoot: paths.dataRoot, existingIds, ledger });
      if (result.state === "merged") {
        merged++;
        ledger.entries[record.id] = { state: "merged", locationId: result.locationId, mergedAt: new Date().toISOString() };
        if (record.op === "site") {
          const where = result.noChange ? "already there" : result.files.join(", ");
          console.log(`  ~ ${record.id} -> ${targetKey(record.target)} placed at ${result.locationId ?? "nowhere"} (${where})`);
          for (const scene of result.canonChanged ?? []) {
            console.log(`    note: canon scene ${scene} changed. If Ingram has approved it, \`node tools/story/story.mjs check\` will say it needs her read again.`);
          }
        } else if (record.op === "create") {
          console.log(`  + ${record.id} -> data/locations/${result.locationId}.json (new ${record.tier})`);
        } else {
          console.log(`  ~ ${record.id} -> data/locations/${result.locationId}.json (${record.op})`);
        }
      } else if (result.state === "clash") {
        clashed++;
        ledger.entries[record.id] = { state: "clash", locationId: result.locationId, clashes: result.clashes };
        const where = record.op === "site" ? targetKey(record.target) : result.locationId;
        console.warn(`  ! CLASH on ${where}: ${result.clashes.join(", ")} -- resolve by hand, nothing written for these fields`);
      } else {
        errored++;
        // A placement that could not be applied is remembered, so the editor stops
        // showing it as waiting and says what went wrong instead.
        if (record.op === "site") ledger.entries[record.id] = { state: "error", error: result.error };
        console.error(`  x ${record.id}: ${result.error}`);
      }
    }
    writeLedger(ledger, paths.ledgerPath);
    console.log(`Done: ${merged} merged, ${clashed} with a clash, ${errored} failed.`);
    if (errored) process.exitCode = 1;
  } finally {
    release();
  }
}

main().catch((err) => {
  console.error("location-sync failed:", err);
  process.exitCode = 1;
});
