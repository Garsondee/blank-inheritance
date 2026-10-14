/**
 * The Location Editor's Story list, the Foundry-facing half
 * (core/siting.mjs is the pure half; design/location-editor.md §12). Fetches
 * the documents the list is built from -- the Scene Set, every episode, every
 * scene brief -- and lays the GM's not-yet-pulled placements over them.
 *
 * Nothing here writes a scene. A placement is a "site" record
 * (foundry/location-edits.mjs) that `npm run locations` applies on the repo
 * side; until then the list shows the GM's choice over what is deployed, marked
 * as waiting, exactly as the Scene Runner shows her pending edits.
 */

import { buildStory, overridesFromRecords } from "../core/siting.mjs";
import { pointsForPendingCreates } from "../core/journey-points.mjs";
import { fetchModuleJson, tryListModuleJsonIds } from "./io.mjs";
import { loadPublishedShapes } from "./location-published.mjs";
import { locationEditsState } from "./location-edits.mjs";

const SCENE_SET_PATH = "data/campaign/campaign/scene-set.json";
const EPISODES_DIR = "data/campaign/episodes";
const BRIEFS_DIR = "data/campaign/scene-briefs";
const FETCH_CONCURRENCY = 12;

let cache = null;
let inflight = null;

async function readAll(dir, ids, fresh) {
  const out = {};
  const failed = [];
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        out[id] = await fetchModuleJson(`${dir}/${id}.json`, { fresh });
      } catch (err) {
        console.warn(`Blank Inheritance | Story list could not read ${dir}/${id}:`, err);
        failed.push(id);
      }
    }
  };
  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker));
  return { out, failed };
}

async function fetchDocs(fresh) {
  const [episodeIds, briefIds, sceneSet] = await Promise.all([
    tryListModuleJsonIds(EPISODES_DIR),
    tryListModuleJsonIds(BRIEFS_DIR),
    fetchModuleJson(SCENE_SET_PATH, { fresh })
  ]);
  if (!episodeIds || !briefIds) throw new Error("Could not list the episodes and scene briefs on the server.");
  const [episodes, briefs] = await Promise.all([readAll(EPISODES_DIR, episodeIds.sort(), fresh), readAll(BRIEFS_DIR, briefIds.sort(), fresh)]);
  return {
    sceneSet,
    episodes: Object.values(episodes.out),
    briefs: briefs.out,
    failed: [...episodes.failed, ...briefs.failed]
  };
}

/** The deployed scene documents (cached for the page; `refresh` re-reads the server). */
export function loadStoryDocs({ refresh = false } = {}) {
  if (!refresh && cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetchDocs(refresh)
    .then((docs) => { cache = docs; return docs; })
    .finally(() => { inflight = null; });
  return inflight;
}

/** Forget what was read, so the next load goes back to the server (a deploy has landed). */
export function resetStoryCache() {
  cache = null;
}

/** The records the editor has written that the repo has not heard about yet. Everything with a ledger entry has been dealt with, one way or another. */
function pendingRecords() {
  const { records, ledger } = locationEditsState();
  const settled = (id) => Boolean(ledger?.entries?.[id]);
  return { records, ledger, pendingSites: records.filter((r) => r.op === "site" && !settled(r.id)), pendingCreates: records.filter((r) => r.op === "create" && !settled(r.id)) };
}

/**
 * What the GM has chosen that the repo has not heard about yet, in the two
 * forms core/siting.mjs reads: `overrides` (target key -> the place chosen) and
 * `newLocations` (a location drawn but not yet pulled, by the record that drew it).
 */
export function storyOverrides() {
  const { ledger, pendingSites, pendingCreates } = pendingRecords();
  const newLocations = {};
  for (const create of pendingCreates) newLocations[create.id] = { name: create.fields?.name ?? null, tier: create.tier };
  const resolveVia = (recordId) => {
    const entry = ledger?.entries?.[recordId];
    return entry?.state === "merged" && entry.locationId ? entry.locationId : null;
  };
  return { overrides: overridesFromRecords(pendingSites, { resolveVia }), newLocations, pendingCount: pendingSites.length };
}

/** Where a token would stand for each place drawn but not yet pulled, by the record that drew it (map-image px): what the journeys are worked out from. */
export function pendingPlacePoints() {
  return pointsForPendingCreates(pendingRecords().pendingCreates);
}

/**
 * The Story list: the deployed documents, the GM's waiting placements laid
 * over them, and the problems the pull has already reported. `docs` is
 * loadStoryDocs()'s result; `locations` the index from loadPublishedShapes().
 */
export function buildStoryView(docs, locations) {
  const { ledger, records } = pendingRecords();
  const { overrides, newLocations, pendingCount } = storyOverrides();
  const story = buildStory(docs, { locations, overrides, newLocations });
  const problems = records
    .filter((r) => r.op === "site" && ["clash", "error"].includes(ledger?.entries?.[r.id]?.state))
    .map((r) => ({ recordId: r.id, state: ledger.entries[r.id].state, text: ledger.entries[r.id].error ?? (ledger.entries[r.id].clashes ?? []).join("; ") }));
  return { story, problems, pendingCount, newLocations, overrides };
}

/** Both loads together: what the Story list needs on opening. */
export async function loadStoryInputs({ refresh = false } = {}) {
  const [docs, published] = await Promise.all([loadStoryDocs({ refresh }), loadPublishedShapes({ refresh })]);
  return { docs, locations: published.index ?? {} };
}
