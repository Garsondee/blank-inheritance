/**
 * Location edits, the Foundry half: where a save from the Location Editor
 * panel is written. The logic is core/location-editor.mjs; the design is
 * design/location-editor.md §4-5.
 *
 * Same doctrine as foundry/scene-edits.mjs, simplified for a whole-document
 * record instead of a beat-path patch: one small JSON file per save, straight
 * into the module's storage/ folder (writeStorageJson, no subfolder -- see
 * io.mjs's own note on why a subfolder is not safe to rely on there).
 * storage/ is never touched by a deploy or a module update, so a save is safe
 * the moment the upload returns. Records are immutable; a second save is a
 * second record, never an edit to the first.
 *
 * GM-only in practice: the panel that calls this never mounts for a
 * non-GM user (foundry/location-editor.mjs's own guard), and only a GM may
 * upload into storage/ in the first place.
 */

import { makeRecord, recordFilename, recordIdFromFilename, RECORD_PREFIX, sortRecords, validateRecord } from "../core/location-editor.mjs";
import { fetchModuleJson, tryListModuleJsonIds, writeStorageJson } from "./io.mjs";

const LEDGER_PATH = "data/campaign/campaign/location-edits.json";

/** Every record this page has read, by id. Records never change once made, so a record once read is kept. */
const known = new Map();
let ledger = null;
let loaded = false;
let loading = null;
let lastAt = 0;

/**
 * Make one record and save it into storage/. Throws if it could not be
 * saved -- the caller keeps the form's contents on screen and says so;
 * nothing is treated as saved unless the server confirmed it.
 *
 * @param {object} spec  core `makeRecord`'s spec, without `at`, `rand` or `by`.
 */
export async function saveLocationEdit(spec) {
  const now = Math.max(Date.now(), lastAt + 1);
  lastAt = now;
  const record = makeRecord({
    ...spec,
    at: new Date(now).toISOString(),
    rand: foundry.utils.randomID(6),
    by: game.user?.name ?? null
  });
  await writeStorageJson("", recordFilename(record), record);
  known.set(record.id, record);
  return record;
}

/**
 * Read every location-edit record in storage/ and the merge ledger. Cached
 * for the page's lifetime; `refresh` re-lists (a pull has landed, or the GM
 * reopened the panel after a while).
 */
export async function loadLocationEdits({ refresh = false } = {}) {
  if (loaded && !refresh) return locationEditsState();
  if (loading) return loading;
  loading = (async () => {
    try {
      ledger = await fetchModuleJson(LEDGER_PATH, { fresh: true });
    } catch {
      ledger = { entries: {} }; // No ledger deployed yet is the normal state before the first pull.
    }
    const ids = await tryListModuleJsonIds("storage");
    if (ids !== null) {
      const settled = (id) => ["merged", "superseded"].includes(ledger.entries?.[id]?.state);
      const names = ids
        .filter((id) => id.startsWith(RECORD_PREFIX))
        .map((id) => `${id}.json`)
        .filter((name) => {
          const id = recordIdFromFilename(name);
          return id && !known.has(id) && !settled(id);
        });
      await Promise.all(
        names.map(async (name) => {
          try {
            const record = await fetchModuleJson(`storage/${name}`, { fresh: true });
            if (validateRecord(record).length === 0 && recordFilename(record) === name) known.set(record.id, record);
            else console.error(`Blank Inheritance | Location edit ${name} is not a usable record and was ignored:`, validateRecord(record));
          } catch (err) {
            console.error(`Blank Inheritance | Could not read location edit ${name}:`, err);
          }
        })
      );
    }
    loaded = true;
    return locationEditsState();
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export function locationEditsState() {
  return { records: sortRecords([...known.values()]), ledger: ledger ?? { entries: {} } };
}

/** Forget the ledger and re-list storage/ on the next load. Called when a deploy lands. */
export function resetLocationEditsCache() {
  loaded = false;
  ledger = null;
}

/** Pending (not yet merged) records for one Region, newest first -- what the panel shows as "not saved to the repo yet". */
export function pendingRecordsFor(draftId) {
  if (!draftId) return [];
  const { records, ledger: currentLedger } = locationEditsState();
  return records
    .filter((r) => r.draftId === draftId && !currentLedger?.entries?.[r.id])
    .reverse();
}
