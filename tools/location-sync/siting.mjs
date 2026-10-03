/**
 * Applying a "site" record: placing a scene, a player option or a travel point
 * at a location (design/location-editor.md §12). The pure rules are
 * module/blank-inheritance/scripts/core/siting.mjs, the same file the Foundry
 * Story list reads; this file only finds the documents on disk, decides merged
 * versus clash, and writes them back the way the repo already stores them.
 *
 * Where each target lives:
 *   scene                     data/campaign/scene-set.json
 *   destination | position    the scene brief. A brief that has a canon copy
 *                             (canon/scenes/<id>.json) is changed THERE, and its
 *                             data/scene-briefs copy is rewritten identically,
 *                             because `story check` fails if the two differ
 *                             and the canon copy is the one that is edited
 *                             (canon/README.md). A brief with no canon copy is
 *                             edited in data/scene-briefs only.
 *
 * A change to a canon scene changes that scene's approval hash: if Ingram has
 * approved it, it needs her read again. The result says which scenes changed
 * so the pull can say so out loud.
 */

import path from "node:path";
import { applySiting, readSlot, targetKey } from "../../module/blank-inheritance/scripts/core/siting.mjs";
import { locationFilePath, readJsonFile, writeJsonFile } from "./store.mjs";

const SCENE_SET = ["campaign", "scene-set.json"];

const repoRootOf = (dataRoot) => path.resolve(dataRoot, "..");
const briefFile = (id) => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new Error(`Not a scene brief id: ${JSON.stringify(id)}`);
  return `${id}.json`;
};

/** The documents a target lives in, read from disk: `{ docs, files }` where each file is `{ path, eol, role }`. */
function loadFor(target, dataRoot) {
  const docs = { sceneSet: null, briefs: {}, episodes: [] };
  const files = [];
  if (target.kind === "scene") {
    const abs = path.join(dataRoot, ...SCENE_SET);
    const found = readJsonFile(abs);
    if (!found) return { error: "data/campaign/scene-set.json does not exist" };
    docs.sceneSet = found.doc;
    files.push({ path: abs, eol: found.eol, role: "scene-set" });
    return { docs, files };
  }
  const canonPath = path.join(repoRootOf(dataRoot), "canon", "scenes", briefFile(target.briefRef));
  const dataPath = path.join(dataRoot, "scene-briefs", briefFile(target.briefRef));
  const canon = readJsonFile(canonPath);
  const live = readJsonFile(dataPath);
  const source = canon ?? live;
  if (!source) return { error: `no scene brief ${target.briefRef} in canon/scenes/ or data/scene-briefs/` };
  docs.briefs[target.briefRef] = source.doc;
  // The canon copy, when there is one, is the document; the data copy is rewritten to match it.
  if (canon) files.push({ path: canonPath, eol: canon.eol, role: "canon" });
  if (live) files.push({ path: dataPath, eol: live.eol, role: "data" });
  else if (canon) files.push({ path: dataPath, eol: canon.eol, role: "data" });
  return { docs, files };
}

/**
 * `{ state: "merged", locationId, files, canonChanged } | { state: "clash", ... } | { state: "error", error }`.
 * `ledger` resolves a record that points at a location drawn in the same
 * session (`viaRecord`) to the id the pull minted for it.
 */
export function applySiteRecord(record, { dataRoot, existingIds, ledger = { entries: {} } }) {
  const { target } = record;
  let locationId = record.locationId ?? null;
  if (record.viaRecord) {
    const via = ledger.entries?.[record.viaRecord];
    if (via?.state !== "merged" || !via.locationId) {
      return { state: "error", error: `${record.viaRecord} (the location this was placed at) was never merged, so it has no id to place anything at` };
    }
    locationId = via.locationId;
  }
  if (locationId !== null && !existingIds.has(locationId)) {
    return { state: "error", error: `no location file for "${locationId}" to place ${targetKey(target)} at` };
  }

  const loaded = loadFor(target, dataRoot);
  if (loaded.error) return { state: "error", error: loaded.error };
  const { docs, files } = loaded;

  const current = readSlot(docs, target);
  if (!current.exists) return { state: "error", error: `no such slot ${targetKey(target)} in the repo any more` };
  const offMap = record.offMap ?? null;
  if (current.value === locationId && (current.offMap ?? null) === offMap) return { state: "merged", locationId, files: [], canonChanged: [], noChange: true };
  // Somebody (Claude, in the repo) moved it since the editor looked. The editor's choice is not applied over that.
  // What the editor saw may itself have been a location drawn in the same session, known only by the record that drew it.
  const saw = record.beforeVia ? (ledger.entries?.[record.beforeVia]?.locationId ?? null) : (record.before ?? null);
  if (saw !== current.value) {
    return { state: "clash", locationId, clashes: [`${targetKey(target)} is now ${current.value ?? "empty"}, the editor saw ${saw ?? "empty"}`] };
  }

  const locationName = locationId ? (readJsonFile(locationFilePath(dataRoot, locationId))?.doc.name ?? null) : null;
  const done = applySiting(docs, target, locationId, { note: record.note ?? null, date: String(record.at ?? "").slice(0, 10) || null, locationName, offMap });
  if (!done.ok) return { state: "error", error: done.error };

  const doc = target.kind === "scene" ? docs.sceneSet : docs.briefs[target.briefRef];
  for (const file of files) writeJsonFile(file.path, doc, file.eol);
  return {
    state: "merged",
    locationId,
    before: done.before,
    files: files.map((f) => path.relative(repoRootOf(dataRoot), f.path).replace(/\\/g, "/")),
    canonChanged: files.filter((f) => f.role === "canon").map((f) => path.basename(f.path, ".json"))
  };
}
