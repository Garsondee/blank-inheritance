/**
 * Scene edits, the Foundry half: where Ingram's edits are saved, and how the
 * Scene Runner shows them. The logic is core/scene-edits.mjs; the design is
 * design/scene-edits.md.
 *
 * WHERE AN EDIT GOES. One small JSON file per edit, straight into the
 * module's storage/ folder on the server (writeStorageJson with no
 * subfolder -- io.mjs records why a subfolder is not safe to rely on there).
 * storage/ is the one folder a deploy never overwrites or prunes and a module
 * update never deletes (manifest `persistentStorage: true`), so an edit is
 * safe the moment the upload returns. Nothing here ever edits an existing
 * file: records are immutable, and a second edit to the same line is a
 * second record.
 *
 * WHAT THE RUNNER SHOWS. The deployed files with every record laid over them
 * (core overlayDocs): pending records always, merged ones only where the
 * deployed file is still behind them. The ledger that says which are merged
 * is campaign data (data/campaign/scene-edits.json, deployed at
 * data/campaign/campaign/), written only by tools/scene-edits on my side.
 *
 * GM-only in practice: the Runner that calls this is never built on a
 * player's client, and only a GM may upload into storage/.
 */

import {
  makeRecord,
  overlayDocs,
  recordFilename,
  recordIdFromFilename,
  sortRecords,
  validateRecord,
  LEDGER_STATES,
  RECORD_PREFIX
} from "../core/scene-edits.mjs";
import { fetchModuleJson, tryListModuleJsonIds, writeStorageJson } from "./io.mjs";

// Repo data/campaign/<file> deploys under the module at the doubled
// data/campaign/campaign/<file> (foundry/campaign-state.mjs's CONFIG_PATH
// documents the convention; approvals-desk.mjs's loadCatalog was once broken
// by forgetting it).
const LEDGER_PATH = "data/campaign/campaign/scene-edits.json";

/** Every record this page knows about, by id. Records never change, so a record once read is kept. */
const known = new Map();
let ledger = null;
let loaded = false;
let loading = null;
/** Why the last load could not list storage/, for the edit sheet to say out loud. */
let listError = null;
/** The last `at` this page wrote, so two edits in one millisecond still sort in the order they were made. */
let lastAt = 0;

/**
 * Read every edit record in storage/ and the ledger. Cached for the page:
 * the Runner renders often, and a listing per render would be a request per
 * tick. `refresh` re-lists (a deploy has landed, or the GM asked).
 */
export async function loadSceneEdits({ refresh = false } = {}) {
  if (loaded && !refresh) return sceneEditsState();
  if (loading) return loading;
  loading = (async () => {
    try {
      ledger = await fetchModuleJson(LEDGER_PATH, { fresh: true });
    } catch {
      // No ledger deployed yet is the ordinary state before the first merge.
      ledger = { entries: {} };
    }
    const ids = await tryListModuleJsonIds("storage");
    if (ids === null) {
      listError = "storage/ could not be listed";
    } else {
      listError = null;
      // Only what the Runner still has to show: records not yet settled, and
      // notes with a reply on them. A merged edit's words are already in the
      // deployed files -- the ledger is deployed after them, and a deploy that
      // would put older words back is refused (design/scene-edits.md §5.3) --
      // so fetching every edit ever made on each page load would be hundreds
      // of downloads for nothing by the end of a campaign.
      const settled = (id) => ["merged", "superseded", "withdrawn"].includes(ledger.entries?.[id]?.state);
      const names = ids
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
            else console.error(`Blank Inheritance | Scene edit ${name} is not a usable record and was ignored:`, validateRecord(record));
          } catch (err) {
            console.error(`Blank Inheritance | Could not read scene edit ${name}:`, err);
          }
        })
      );
    }
    loaded = true;
    return sceneEditsState();
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

/** What is loaded now, without fetching. */
export function sceneEditsState() {
  return { records: sortRecords([...known.values()]), ledger: ledger ?? { entries: {} }, listError };
}

/** Forget the ledger and re-list storage/ on the next load. Called when a deploy lands. */
export function resetSceneEditsCache() {
  loaded = false;
  ledger = null;
}

/**
 * Make one record and save it into storage/. Throws if it could not be
 * saved -- the caller keeps her text on screen and says so, and nothing is
 * cached as saved unless the server said it was.
 *
 * @param {object} spec  core makeRecord's spec, without `at`, `rand` or `by`
 */
export async function saveSceneEdit(spec) {
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
 * A scene as the Runner shows it: the deployed brief and its check files with
 * her edits laid over them, plus what the edit sheet needs to mark.
 *
 * @param {{brief: object, challenges?: Record<string, object>}} files  as deployed
 * @returns {{brief: object, challenges: Record<string, object>, marks: object, notes: object[],
 *   problems: object[], removed: object[], pendingCount: number}}
 */
export function overlayScene({ brief, challenges = {} } = {}) {
  if (!brief?.id) return { brief, challenges, marks: {}, notes: [], problems: [], removed: [], pendingCount: 0 };
  const briefFile = `scene-briefs/${brief.id}`;
  const docs = { [briefFile]: brief };
  for (const [id, challenge] of Object.entries(challenges)) if (challenge) docs[`challenges/${id}`] = challenge;

  const { records, ledger: currentLedger } = sceneEditsState();
  const relevant = records.filter((r) => r.file in docs || (r.op === "note" && r.briefId === brief.id) || r.op === "withdraw");
  const overlaid = overlayDocs(docs, relevant, currentLedger);

  const shownBrief = overlaid.docs[briefFile];
  const shownChallenges = {};
  for (const id of Object.keys(challenges)) shownChallenges[id] = overlaid.docs[`challenges/${id}`] ?? challenges[id];

  // Beats she removed that are still gone, so the sheet can offer them back.
  const present = new Set((shownBrief?.beats ?? []).map((b) => b.id));
  const removed = relevant
    .filter((r) => r.op === "remove" && r.file === briefFile && r.itemId && !present.has(r.itemId))
    .filter((r) => (currentLedger?.entries?.[r.id]?.state ?? null) !== LEDGER_STATES.SUPERSEDED)
    .map((r) => ({ ...r, recordId: r.id }));

  return {
    brief: shownBrief,
    challenges: shownChallenges,
    marks: overlaid.marks,
    notes: overlaid.notes.filter((n) => n.briefId === brief.id),
    problems: overlaid.problems,
    removed,
    pendingCount: Object.values(overlaid.marks).filter((m) => m.state !== "server-behind").length
  };
}

/** How many of this page's known records the ledger does not yet call merged, for one scene. */
export function unmergedCountFor(briefId) {
  const { records, ledger: currentLedger } = sceneEditsState();
  return records.filter((r) => r.briefId === briefId && r.op !== "note" && r.op !== "withdraw" && !currentLedger?.entries?.[r.id]).length;
}

export { RECORD_PREFIX };
