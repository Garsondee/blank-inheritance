/**
 * Objectives' documents — the Foundry-touching half of core/objectives.mjs.
 *
 * design/objectives.md, D057. One JournalEntry, "Objectives", at default OWNER so a player may add a page; one page per
 * objective, whose module flag holds its state. Everything here reads or writes those documents; the rules for what
 * to write live in core.
 *
 * WHO WRITES WHAT. A given objective's page is made by the GM's client (the Scene Runner's Give chip) and set read-only
 * for players. A player files their own objective themselves (Foundry asks only for OWNER on the parent), but Foundry's
 * server does not let a player set ownership, so the GM's client applies each page's own level the moment it arrives,
 * and repairs every page at login. A page filed while no GM is connected is visible to the table until one connects:
 * the "only me" label says what it is, and nothing secret belongs in it (GitHub #212).
 *
 * Kept free of anything that runs at load time, so the Scene Runner, the admin panel and both windows can import it.
 */

import { deriveFoundryId } from "../core/ids.mjs";
import {
  MODULE_ID,
  OBJECTIVES_SOURCE_ID,
  OBJECTIVE_FLAG,
  applyAct,
  draftToState,
  entryOwnershipRepair,
  exportPayload,
  fromAuthored,
  objectivesEntryData,
  pageCreateData,
  pageOwnership,
  pageSeed,
  pageUpdateData
} from "../core/objectives.mjs";
import { fetchModuleJson, writeStorageJson } from "./io.mjs";

const EXPORT_FILE = "objectives.json";
const EXPORT_DELAY_MS = 20000;
const DATA_DIR = "data/campaign/objectives";

/** Writes are done one at a time, so two quick presses cannot both decide a page is missing. */
let queue = Promise.resolve();
const serial = (job) => {
  const run = queue.then(job, job);
  queue = run.catch(() => {});
  return run;
};

/* ------------------------------------------------------------------ */
/*  The entry                                                          */
/* ------------------------------------------------------------------ */

export function objectivesEntry() {
  return game.journal?.find((entry) => entry.getFlag(MODULE_ID, "sourceId") === OBJECTIVES_SOURCE_ID) ?? null;
}

/** GM only, at every login: the entry exists, still lets players add pages, and every page carries its own level. */
export async function ensureObjectives() {
  if (!game.user.isGM) return objectivesEntry();
  let entry = objectivesEntry();
  if (entry) {
    const repair = entryOwnershipRepair(entry.ownership);
    if (repair) await entry.update({ ownership: repair });
  } else {
    const id = await deriveFoundryId(OBJECTIVES_SOURCE_ID);
    entry = await JournalEntry.create(objectivesEntryData({ id }), { keepId: true });
  }
  await repairPageOwnership();
  return entry;
}

/** GM only. Any page whose ownership is not what its state says is put right (a player's page arrives without one). */
export async function repairPageOwnership(pages = objectivesEntry()?.pages?.contents ?? []) {
  if (!game.user.isGM) return;
  const updates = [];
  for (const page of pages) {
    const state = page.getFlag(MODULE_ID, OBJECTIVE_FLAG);
    if (!state) continue;
    const want = pageOwnership(state);
    const have = page.ownership ?? {};
    const differs = Object.entries(want).some(([k, v]) => Number(have[k]) !== v) || Object.keys(have).some((k) => !(k in want) && Number(have[k]) > 0 && k !== "default");
    // A key the state does not name is set to the default rather than to NONE: an explicit NONE would lock that one
    // user out (Foundry gives a page's creator OWNER, and refuses -= deletion on ownership).
    if (differs) updates.push({ _id: page.id, ownership: { ...Object.fromEntries(Object.keys(have).map((k) => [k, want.default ?? 0])), ...want } });
  }
  if (updates.length) await objectivesEntry()?.updateEmbeddedDocuments("JournalEntryPage", updates);
}

/* ------------------------------------------------------------------ */
/*  Reading                                                            */
/* ------------------------------------------------------------------ */

/** Every objective this client holds, each with its page id (`pageId`) so a window can act on it. */
export function objectiveStates() {
  return (objectivesEntry()?.pages?.contents ?? [])
    .map((page) => {
      const state = page.getFlag(MODULE_ID, OBJECTIVE_FLAG);
      return state ? { ...state, pageId: page.id, canWrite: page.isOwner } : null;
    })
    .filter(Boolean);
}

export function pageForObjective(id) {
  return objectivesEntry()?.pages?.contents.find((page) => page.getFlag(MODULE_ID, OBJECTIVE_FLAG)?.id === id) ?? null;
}

const authoredCache = new Map();

/** An authored objective's data file, as deployed (data/campaign/objectives/<id>.json). */
export async function loadAuthored(id) {
  if (!id) return null;
  if (authoredCache.has(id)) return authoredCache.get(id);
  try {
    const doc = await fetchModuleJson(`${DATA_DIR}/${id}.json`);
    authoredCache.set(id, doc);
    return doc;
  } catch (err) {
    console.warn(`Blank Inheritance | Could not load objective ${id}:`, err);
    return null;
  }
}

export function resetObjectivesCache() {
  authoredCache.clear();
}

/* ------------------------------------------------------------------ */
/*  The GM's acts                                                      */
/* ------------------------------------------------------------------ */

/**
 * GM only. Give an authored objective. A second press finds the first page and changes nothing. Returns
 * `{ page, created }`, or null when the file or the entry is missing.
 */
export function giveObjective(id, { scene = null, owner = null } = {}) {
  return serial(async () => {
    if (!game.user.isGM) return null;
    const entry = objectivesEntry() ?? (await ensureObjectives());
    const existing = pageForObjective(id);
    if (existing) return { page: existing, created: false };
    const doc = await loadAuthored(id);
    if (!entry || !doc) return null;
    const state = fromAuthored(doc, { nowIso: new Date().toISOString(), scene, owner });
    const pageId = await deriveFoundryId(pageSeed(id));
    try {
      const [page] = await entry.createEmbeddedDocuments("JournalEntryPage", [pageCreateData(state, { id: pageId })], { keepId: true });
      scheduleObjectivesExport();
      return { page, created: true };
    } catch (err) {
      const raced = pageForObjective(id);
      if (raced) return { page: raced, created: false };
      throw err;
    }
  });
}

/**
 * One act on an objective by id (a given one) or by page id (a player's own). Tick, untick, reveal, strike, close,
 * fail, reopen, withdraw or log. Returns the new state, or null when nothing changed or nothing was found.
 */
export function actOnObjective(ref, act, { partId = null, scene = null, text = null, record = null } = {}) {
  return serial(async () => {
    const page = pageForObjective(ref) ?? objectivesEntry()?.pages?.get(ref) ?? null;
    const state = page?.getFlag(MODULE_ID, OBJECTIVE_FLAG);
    if (!page || !state) return null;
    const authored = state.source === "story" ? await loadAuthored(state.id) : null;
    const { state: next, changed } = applyAct(state, act, { partId, authored, nowIso: new Date().toISOString(), scene, text, record });
    if (!changed) return null;
    await page.update(pageUpdateData(next));
    scheduleObjectivesExport();
    return next;
  });
}

/* ------------------------------------------------------------------ */
/*  A player's own                                                     */
/* ------------------------------------------------------------------ */

/**
 * Any player: file their own objective. Created without an ownership field (a player cannot set one); the GM's
 * client gives it its level as it arrives (`onObjectivePageCreated`).
 */
export async function fileOwnObjective(draft, { ownerName = null, scene = null, asGM = false } = {}) {
  const entry = objectivesEntry();
  if (!entry) return null;
  const state = draftToState(draft, { userId: game.user.id, ownerName, nowIso: new Date().toISOString(), scene, id: `own-${foundry.utils.randomID(12)}` });
  // The GM's live objective (D057; the 9 September design's "create one in seconds"): read-only for players, like a given one.
  if (asGM && game.user.isGM) {
    state.source = "gm";
    state.id = `gm-${foundry.utils.randomID(12)}`;
  }
  const data = pageCreateData(state);
  if (!game.user.isGM) delete data.ownership;
  const [page] = await entry.createEmbeddedDocuments("JournalEntryPage", [data]);
  return page ?? null;
}

/** A player's own objective, deleted by someone allowed to (Foundry checks: OWNER of the page). */
export async function deleteOwnObjective(pageId) {
  const page = objectivesEntry()?.pages?.get(pageId);
  if (!page || page.getFlag(MODULE_ID, OBJECTIVE_FLAG)?.source !== "player") return null;
  return page.delete();
}

/** GM's client: a page just arrived. Give a player's page its own level. */
export function onObjectivePageCreated(page) {
  if (!game.user.isGM || page?.parent !== objectivesEntry()) return;
  const state = page.getFlag(MODULE_ID, OBJECTIVE_FLAG);
  if (state?.source === "player") repairPageOwnership([page]).catch((err) => console.warn("Blank Inheritance | Could not set an objective's ownership:", err));
}

/* ------------------------------------------------------------------ */
/*  The admin reset                                                    */
/* ------------------------------------------------------------------ */

/** Every page, whole, for the reset's snapshot. */
export function snapshotObjectives() {
  return (objectivesEntry()?.pages?.contents ?? []).map((page) => page.toObject());
}

/** GM only. Clear every objective: the start of Episode One has none. The entry stays. */
export async function clearObjectives() {
  const entry = objectivesEntry();
  if (!entry) return 0;
  const ids = entry.pages.contents.map((page) => page.id);
  if (ids.length) await entry.deleteEmbeddedDocuments("JournalEntryPage", ids);
  return ids.length;
}

/** GM only. Undo: put the snapshot's pages back with their own ids. */
export async function restoreObjectives(pages = []) {
  const entry = objectivesEntry() ?? (await ensureObjectives());
  if (!entry || !pages.length) return 0;
  const present = new Set(entry.pages.contents.map((page) => page.id));
  const missing = pages.filter((p) => !present.has(p._id));
  if (missing.length) await entry.createEmbeddedDocuments("JournalEntryPage", missing, { keepId: true });
  return missing.length;
}

/* ------------------------------------------------------------------ */
/*  The export the harvest pulls                                       */
/* ------------------------------------------------------------------ */

let exportTimer = null;

export async function exportObjectives() {
  if (!game.user.isGM || !objectivesEntry()) return null;
  const users = game.users.map((user) => ({ id: user.id, name: user.name }));
  return writeStorageJson("", EXPORT_FILE, exportPayload(objectiveStates(), { users, now: Date.now() }));
}

/** GM only. A burst of changes becomes one write. */
export function scheduleObjectivesExport() {
  if (!game.user?.isGM) return;
  clearTimeout(exportTimer);
  exportTimer = setTimeout(() => {
    exportObjectives().catch((err) => console.warn("Blank Inheritance | Could not file the objectives for the harvest:", err));
  }, EXPORT_DELAY_MS);
  // In Node (the tests) a pending export must not keep the process alive; a browser timer has no unref.
  exportTimer?.unref?.();
}
