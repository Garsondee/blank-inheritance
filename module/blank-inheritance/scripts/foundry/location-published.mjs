/**
 * The Location Editor's view of what already exists -- the Foundry-facing half
 * (core/location-published.mjs is the pure half; design/location-editor.md §10
 * phase 7). Fetches every deployed `data/campaign/locations/<id>.json` once,
 * keeps them in master-image px, and lays them onto the Campaign Map scene with
 * the same calibration the travel marker and the pin placer use.
 *
 * This is the "I opened the editor and the map was empty" fix: the first
 * version of the editor only ever drew the session's own drafts.
 */

import { publishedShapeFromDoc, shapeToScene } from "../core/location-published.mjs";
import { sceneCalibration, toScenePoint } from "../core/travel-animation.mjs";
import { fetchModuleJson, tryListModuleJsonIds } from "./io.mjs";
import { campaignMapImageWidth, hubScene } from "./travel.mjs";

export const LOCATIONS_DIR = "data/campaign/locations";
const FETCH_CONCURRENCY = 12;

let cache = null;
let inflight = null;

async function fetchEvery(fresh) {
  const ids = await tryListModuleJsonIds(LOCATIONS_DIR);
  if (!ids) throw new Error(`Could not list ${LOCATIONS_DIR} on the server.`);
  const shapes = [];
  const failed = [];
  // Every location by id with just what a list needs to name it -- including
  // any with no outline to draw, which still exist and can still be a scene's place.
  const index = {};
  let next = 0;
  const worker = async () => {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        const doc = await fetchModuleJson(`${LOCATIONS_DIR}/${id}.json`, { fresh });
        if (doc && typeof doc.id === "string") index[doc.id] = { id: doc.id, name: doc.name ?? doc.id, tier: doc.tier ?? null, kind: doc.kind ?? "" };
        const shape = publishedShapeFromDoc(doc);
        if (shape) shapes.push(shape);
        else failed.push(id);
      } catch (err) {
        console.warn(`Blank Inheritance | Location Editor could not read "${id}":`, err);
        failed.push(id);
      }
    }
  };
  await Promise.all(Array.from({ length: FETCH_CONCURRENCY }, worker));
  shapes.sort((a, b) => a.id.localeCompare(b.id));
  return { shapes, failed, index };
}

/** Every deployed location as a map shape in master-image px, plus an id -> {id, name, tier, kind} index of all of them (cached; `refresh` re-reads the server). */
export function loadPublishedShapes({ refresh = false } = {}) {
  if (!refresh && cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = fetchEvery(refresh)
    .then((result) => { cache = result; return result; })
    .finally(() => { inflight = null; });
  return inflight;
}

/**
 * The hub scene and its calibration (master-image px <-> scene px), or null
 * when the hub or the map's own image width cannot be found. The one copy of
 * this: the panel's save/advice code and the draw layer both read it here.
 */
export async function hubCalibration() {
  const scene = await hubScene();
  if (!scene) return null;
  const width = await campaignMapImageWidth();
  if (!width) return null;
  const tiles = (scene.tiles?.contents ?? []).map((t) => ({
    x: t.x, y: t.y, width: t.width, height: t.height,
    texture: { anchorX: t.texture?.anchorX, anchorY: t.texture?.anchorY }
  }));
  return { sceneId: scene.id, calibration: sceneCalibration(tiles, scene.width, width) };
}

/** Every deployed location laid onto the hub scene in scene px, or null when there is no hub to lay them on. */
export async function loadPublishedInScene({ refresh = false } = {}) {
  const [loaded, hub] = await Promise.all([loadPublishedShapes({ refresh }), hubCalibration()]);
  if (!hub) return null;
  const toScene = (p) => toScenePoint(p, hub.calibration);
  return { sceneId: hub.sceneId, shapes: loaded.shapes.map((s) => shapeToScene(s, toScene)), failed: loaded.failed };
}
