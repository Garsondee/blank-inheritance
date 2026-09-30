/**
 * Where location edits live on this side, and the only file in
 * tools/location-sync that reads or writes the disk. design/location-editor.md §5.
 *
 *   harvest/location-edits/<record file>   every record pulled off the server,
 *                                          byte for byte as it arrived. Tracked
 *                                          in git.
 *   data/campaign/location-edits.json      the LEDGER: which records are
 *                                          merged, superseded or clashed.
 *   data/locations/<id>.json               where a "create"/"geometry"/
 *                                          "update" record's effect ends up.
 *
 * File-write mechanics (atomic temp-file-then-rename, sha256, the repo's own
 * two-space JSON layout, the merge lock) are generic and reused directly from
 * tools/scene-edits/store.mjs rather than re-implemented -- only what's
 * actually specific to a location record (the ledger shape, which data path a
 * "locations/<id>" file resolves to, the record prefix) is new here.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECORD_PREFIX, recordIdFromFilename, validateRecord } from "../../module/blank-inheritance/scripts/core/location-editor.mjs";
import { acquireLock, formatJson, readJsonFile, sha256, writeFileAtomic, writeJsonFile } from "../scene-edits/store.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..", "..");

export const DEFAULT_PATHS = Object.freeze({
  repoRoot: REPO_ROOT,
  dataRoot: path.join(REPO_ROOT, "data"),
  harvestDir: path.join(REPO_ROOT, "harvest", "location-edits"),
  ledgerPath: path.join(REPO_ROOT, "data", "campaign", "location-edits.json")
});

export { acquireLock, formatJson, readJsonFile, sha256, writeFileAtomic, writeJsonFile };

/** "<id>" -> <dataRoot>/locations/<id>.json */
export function locationFilePath(dataRoot, id) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Not a location id: ${JSON.stringify(id)}`);
  return path.join(dataRoot, "locations", `${id}.json`);
}

/* -------------------------------------------------------------------------- */
/*  The ledger                                                                */
/* -------------------------------------------------------------------------- */

export function emptyLedger() {
  return {
    $schema: "../schema/location-edits.schema.json",
    id: "location-edits",
    description:
      "Which Location Editor records (design/location-editor.md) have reached the repo. Written only by " +
      "tools/location-sync. The records themselves are in harvest/location-edits/.",
    entries: {}
  };
}

export function readLedger(ledgerPath = DEFAULT_PATHS.ledgerPath) {
  const found = readJsonFile(ledgerPath);
  if (!found) return emptyLedger();
  return { ...emptyLedger(), ...found.doc, entries: { ...(found.doc.entries ?? {}) } };
}

export function writeLedger(ledger, ledgerPath = DEFAULT_PATHS.ledgerPath) {
  const entries = Object.fromEntries(Object.keys(ledger.entries ?? {}).sort().map((id) => [id, ledger.entries[id]]));
  const eol = readJsonFile(ledgerPath)?.eol ?? "\n";
  writeJsonFile(ledgerPath, { ...emptyLedger(), ...ledger, entries }, eol);
}

/* -------------------------------------------------------------------------- */
/*  The harvested records                                                     */
/* -------------------------------------------------------------------------- */

export function listHarvested(harvestDir = DEFAULT_PATHS.harvestDir) {
  const out = new Map();
  if (!existsSync(harvestDir)) return out;
  for (const name of readdirSync(harvestDir).sort()) {
    if (!name.startsWith(RECORD_PREFIX) || !recordIdFromFilename(name)) continue;
    out.set(name, readFileSync(path.join(harvestDir, name), "utf8"));
  }
  return out;
}

export function readHarvestedRecords(harvestDir = DEFAULT_PATHS.harvestDir) {
  const records = [];
  const problems = [];
  for (const [name, text] of listHarvested(harvestDir)) {
    try {
      const record = JSON.parse(text);
      const invalid = validateRecord(record);
      if (invalid.length) problems.push(`${name}: ${invalid.join("; ")}`);
      else records.push(record);
    } catch (err) {
      problems.push(`${name}: ${err.message}`);
    }
  }
  return { records, problems };
}

export function saveHarvested(harvestDir, name, text) {
  if (!recordIdFromFilename(name)) throw new Error(`Not a location-edit record file name: ${JSON.stringify(name)}`);
  writeFileAtomic(path.join(harvestDir, name), text);
}
