/**
 * The real buildings of the campaign map, laid on the Campaign Map scene -- the Foundry-facing half (core/buildings-index.mjs is the pure half;
 * design/location-editor.md section 7). Fetches data/campaign/map/buildings-index.json once (about 3.6 MB, shipped with the module's data like
 * the travel graph), keeps it in master-image px, and lays it on the hub scene with the same calibration the published outlines use.
 */

import { decodeIndex, layOutBuildings } from "../core/buildings-index.mjs";
import { toScenePoint } from "../core/travel-animation.mjs";
import { fetchModuleJson } from "./io.mjs";
import { hubCalibration } from "./location-published.mjs";

export const BUILDINGS_PATH = "data/campaign/map/buildings-index.json";

let cache = null;
let inflight = null;

/** The decoded file (image px), cached; `refresh` reads the server again. Rejects when the file is missing or is not a buildings index. */
export function loadBuildingsDecoded({ refresh = false } = {}) {
  if (!refresh && cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetchModuleJson(BUILDINGS_PATH, { fresh: refresh })
    .then((doc) => { cache = decodeIndex(doc); return cache; })
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * The buildings laid on the hub scene, or null when there is no hub to lay them on:
 * `{ sceneId, index }` where `index` is core/buildings-index.mjs#layOutBuildings's. Cell size follows the scene so the grid is about 64 across.
 */
export async function loadBuildingsInScene({ refresh = false } = {}) {
  const [decoded, hub] = await Promise.all([loadBuildingsDecoded({ refresh }), hubCalibration()]);
  if (!hub) return null;
  const toScene = (p) => toScenePoint(p, hub.calibration);
  const a = toScene({ x: 0, y: 0 });
  const b = toScene({ x: decoded.image?.[0] ?? 12400, y: decoded.image?.[1] ?? 12400 });
  const cell = Math.max(64, Math.abs(b.x - a.x) / 64);
  return { sceneId: hub.sceneId, index: layOutBuildings(decoded, toScene, { cell }), skipped: decoded.skipped };
}
