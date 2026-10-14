/**
 * The Journeys tab's data, the Foundry-facing half (core/journey.mjs, core/journey-checks.mjs and core/journey-timeline.mjs are the pure half;
 * design/location-editor.md section 16). Loads what routing needs -- the street and rail graph the tokens ride, the coast, the map's scale -- and works out the
 * journeys of the Story the editor is showing, cached until a placement changes.
 *
 * The router is `routerFor(graph)`, the very one foundry/travel.mjs walks the tokens with, on the very same graph object: what the tab shows is what they will do,
 * and the two share the router's cache.
 */

import { analyseJourneys } from "../core/journey-checks.mjs";
import { buildJourneyModel } from "../core/journey.mjs";
import { decodeLandGrid } from "../core/land-grid.mjs";
import { placementSignature } from "../core/places-index.mjs";
import { routerFor } from "../core/travel-route.mjs";
import { fetchModuleJson } from "./io.mjs";
import { campaignMapMetresPerPixel, loadTravelGraph } from "./travel.mjs";

const LAND_GRID_PATH = "data/campaign/map/land-grid.json";

let dataPromise = null;
let cached = null;

async function loadLandGrid() {
  try {
    return decodeLandGrid(await fetchModuleJson(LAND_GRID_PATH));
  } catch (err) {
    console.warn("Blank Inheritance | The coast file did not load, so journeys cannot be checked for walking on water:", err);
    return null;
  }
}

/** The graph, its router, the coast and the scale, once. `{ graph, router, wayClass, landGrid, metresPerPixel, graphMissing, landGridMissing }`. */
export function loadJourneyData() {
  dataPromise ??= (async () => {
    const [graph, metresPerPixel, landGrid] = await Promise.all([loadTravelGraph(), campaignMapMetresPerPixel(), loadLandGrid()]);
    return {
      graph, router: routerFor(graph), wayClass: graph.wayClass ?? {}, landGrid, metresPerPixel,
      graphMissing: Object.keys(graph.nodeXy ?? {}).length === 0, landGridMissing: !landGrid
    };
  })();
  return dataPromise;
}

/** Forget the cached analysis (the data it was made from may have changed); the graph and the coast are kept. */
export function resetJourneyAnalysis() {
  cached = null;
}

/** The planner's dependencies: where a token stands for a place (a location's stand-point, or a drawn place's own point), the router, the coast and the scale. */
export function journeyDeps(data, { locations, pendingPoints = {} }) {
  const pointOf = (end) => {
    if (end.locationId) {
      const centre = locations[end.locationId]?.centroidPx;
      return centre ? { x: centre[0], y: centre[1] } : null;
    }
    if (end.viaRecord) return pendingPoints[end.viaRecord] ?? null;
    return null;
  };
  return { pointOf, router: data.router, wayClass: data.wayClass, landGrid: data.landGrid, metresPerPixel: data.metresPerPixel };
}

/** What an analysis is keyed by: the placements of the Story and the points of the places drawn but not pulled. The same signature means the same journeys. */
export const analysisSignature = (view, pendingPoints = {}) => `${placementSignature(view.story)}#${JSON.stringify(pendingPoints)}`;

/**
 * The journeys of a Story view (foundry/location-story.mjs#buildStoryView's result): `{ model, analysis, deps, data, signature }`. The same placements give the
 * same answer, so repeated renders of the panel cost nothing; `force` recomputes.
 */
export async function analyseStoryView(view, { locations, pendingPoints = {}, force = false } = {}) {
  const data = await loadJourneyData();
  const signature = analysisSignature(view, pendingPoints);
  if (!force && cached && cached.signature === signature && cached.locations === locations) return cached.result;
  const deps = journeyDeps(data, { locations, pendingPoints });
  const model = buildJourneyModel(view.story);
  const analysis = analyseJourneys(model, view.story, deps);
  const result = { model, analysis, deps, data, signature };
  cached = { signature, locations, result };
  return result;
}
