/**
 * Turning a pulled location-edit record into a real change in data/locations/
 * -- design/location-editor.md §5. The pure clash/field logic is
 * core/location-editor.mjs (shared with the Foundry panel); this file is the
 * repo-side orchestration: minting an id, calling the Python geometry bridge,
 * reading/writing data/locations/*.json, and deciding merged vs clash.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyCleanPaths, applyFieldsToDoc, fieldClashes, fieldsFromLocationDoc } from "../../module/blank-inheritance/scripts/core/location-editor.mjs";
import { locationFilePath, readJsonFile, writeJsonFile } from "./store.mjs";

const APPLY_GEOMETRY_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "apply_geometry.py");

/** A reasonable python executable name for this platform -- overridable via BI_PYTHON, same convention as BI_FFMPEG_DIR. */
function pythonExe() {
  return process.env.BI_PYTHON || (process.platform === "win32" ? "python" : "python3");
}

function runApplyGeometry(payload) {
  const input = JSON.stringify(payload);
  const out = execFileSync(pythonExe(), [APPLY_GEOMETRY_SCRIPT], { input, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(out);
}

/** lowercase-kebab, matching the convention every existing data/locations/*.json id already follows. */
export function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** A free, unused location id derived from a record's fields -- name first, then the note's opening words, then the draft id itself as a last resort. */
export function mintLocationId(record, existingIds) {
  const fromName = slugify(record.fields?.name);
  const fromNote = slugify((record.fields?.note ?? "").split(/\s+/).slice(0, 6).join(" "));
  const base = fromName || fromNote || `location-${record.draftId ?? record.id}`;
  if (!existingIds.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!existingIds.has(candidate)) return candidate;
  }
}

/** A free id for a bisect's new, smaller piece -- `<target>-2`, `<target>-3`, ... the first free suffix. A split has no name of its own yet to slugify from (its whole point is that a person still owes it one), so this keys off the target's own id instead, unlike mintLocationId above. */
export function mintSplitLocationId(targetLocationId, existingIds) {
  for (let n = 2; ; n++) {
    const candidate = `${targetLocationId}-${n}`;
    if (!existingIds.has(candidate)) return candidate;
  }
}

export function existingLocationIds(dataRoot) {
  const dir = path.join(dataRoot, "locations");
  if (!existsSync(dir)) return new Set();
  return new Set(readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -".json".length)));
}

/**
 * Apply one already-pulled record to data/locations/. Returns
 * `{state: "merged", locationId} | {state: "clash", clashes: string[]} | {state: "error", error: string}`.
 * Geometry ops (create/geometry/split) never clash -- geometry is lifecycle-owned
 * by the Location Editor alone (design doc §6), nothing else legitimately
 * writes it, so there's nothing to adjudicate. Only "update" (the
 * promotable metadata fields, which Claude may also hand-edit) can clash.
 */
export function applyRecord(record, { dataRoot, existingIds }) {
  try {
    if (record.op === "create") {
      const locationId = mintLocationId(record, existingIds);
      const doc = runApplyGeometry({
        op: "create", locationId, tier: record.tier, draftId: record.draftId,
        geometry: record.geometry, fields: record.fields
      });
      writeJsonFile(locationFilePath(dataRoot, locationId), doc);
      existingIds.add(locationId);
      return { state: "merged", locationId };
    }

    if (record.op === "geometry") {
      // Checked here, not just inside apply_geometry.py, so an invalid
      // record fails fast without a Python subprocess: matches the old
      // tool's own rule (draw.js's drawHandles) that a locked site/point is
      // never reshaped once promoted -- only a region's border keeps
      // needing tidying against its neighbours.
      if (record.tier !== "region") {
        return { state: "error", error: `a ${record.tier} location's geometry cannot be resynced after promotion -- only a region's border is` };
      }
      const filePath = locationFilePath(dataRoot, record.locationId);
      const found = readJsonFile(filePath);
      if (!found) return { state: "error", error: `${record.locationId}: no such location file to resync geometry onto` };
      const doc = runApplyGeometry({
        op: "geometry", locationId: record.locationId, tier: record.tier,
        geometry: record.geometry, existingDoc: found.doc
      });
      writeJsonFile(filePath, doc, found.eol);
      return { state: "merged", locationId: record.locationId };
    }

    if (record.op === "split") {
      // Bisecting a real, already-promoted region -- design doc §10 phase
      // 2c, core/reconcile.py#bisect_region's own docstring. The target's
      // CURRENT file is read fresh right here, at merge time, never carried
      // as a snapshot from whenever the cut was drawn in Foundry (which may
      // have been hours or days earlier) -- so this can never overwrite a
      // change someone else made to the region in between.
      if (record.tier !== "region") {
        return { state: "error", error: `only a region can be bisected, got ${record.tier}` };
      }
      const filePath = locationFilePath(dataRoot, record.locationId);
      const found = readJsonFile(filePath);
      if (!found) return { state: "error", error: `${record.locationId}: no such location file to bisect` };
      const newLocationId = mintSplitLocationId(record.locationId, existingIds);
      const result = runApplyGeometry({
        op: "split", locationId: record.locationId, newLocationId, tier: record.tier,
        geometry: record.geometry, existingDoc: found.doc
      });
      writeJsonFile(filePath, result.survivor, found.eol);
      writeJsonFile(locationFilePath(dataRoot, newLocationId), result.new);
      existingIds.add(newLocationId);
      return { state: "merged", locationId: record.locationId, newLocationId };
    }

    if (record.op === "update") {
      const filePath = locationFilePath(dataRoot, record.locationId);
      const found = readJsonFile(filePath);
      if (!found) return { state: "error", error: `${record.locationId}: no such location file to update` };
      const repoFields = fieldsFromLocationDoc(found.doc);
      const { clashes, clean } = fieldClashes(repoFields, record);
      if (clean.length) {
        const nextFields = applyCleanPaths(repoFields, record, clean);
        const nextDoc = applyFieldsToDoc(found.doc, nextFields);
        writeJsonFile(filePath, nextDoc, found.eol);
      }
      if (clashes.length) return { state: "clash", clashes, locationId: record.locationId };
      return { state: "merged", locationId: record.locationId };
    }

    return { state: "error", error: `unknown op ${JSON.stringify(record.op)}` };
  } catch (err) {
    return { state: "error", error: err.message };
  }
}
