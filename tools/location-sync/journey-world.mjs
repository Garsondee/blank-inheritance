/**
 * The campaign's journeys read from the repo (design/location-editor.md section 16): the same documents, the same router and the same checks the Location Editor's
 * Journeys tab runs in Foundry, over `data/` instead of the deployed server.
 *
 * Shared by `npm run journeys` (tools/location-sync/journeys.mjs: a verdict in the terminal) and test/tier2-journey-corpus.test.mjs (the party can walk every
 * episode, or the test says which leg cannot). Nothing here is a second implementation: story -> model -> analysis is core/siting.mjs, core/journey.mjs and
 * core/journey-checks.mjs, the files the panel imports.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildStory } from "../../module/blank-inheritance/scripts/core/siting.mjs";
import { buildJourneyModel } from "../../module/blank-inheritance/scripts/core/journey.mjs";
import { analyseJourneys } from "../../module/blank-inheritance/scripts/core/journey-checks.mjs";
import { createRouter } from "../../module/blank-inheritance/scripts/core/travel-route.mjs";
import { decodeLandGrid } from "../../module/blank-inheritance/scripts/core/land-grid.mjs";

export const DEFAULT_REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const readDir = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort() : []);

/**
 * Everything the journeys are worked out from: `{ docs, locations, graph, landGrid, metresPerPixel }`.
 * `landGrid` is null when the file is not there (a checkout from before it was exported): the water checks are then simply skipped.
 */
export function loadJourneyInputs({ repo = DEFAULT_REPO } = {}) {
  const data = path.join(repo, "data");
  const docs = {
    sceneSet: readJson(path.join(data, "campaign", "scene-set.json")),
    episodes: readDir(path.join(data, "episodes")).map((f) => readJson(path.join(data, "episodes", f))),
    briefs: Object.fromEntries(readDir(path.join(data, "scene-briefs")).map((f) => { const brief = readJson(path.join(data, "scene-briefs", f)); return [brief.id, brief]; }))
  };
  const locations = {};
  for (const f of readDir(path.join(data, "locations"))) {
    const doc = readJson(path.join(data, "locations", f));
    locations[doc.id] = {
      id: doc.id, name: doc.name ?? doc.id, tier: doc.tier ?? null, kind: doc.kind ?? "",
      centroidPx: Array.isArray(doc.derived?.centroidPx) && doc.derived.centroidPx.length === 2 ? [Number(doc.derived.centroidPx[0]), Number(doc.derived.centroidPx[1])] : null
    };
  }
  const graph = readJson(path.join(data, "map", "travel-graph.json"));
  const landFile = path.join(data, "map", "land-grid.json");
  const landGrid = fs.existsSync(landFile) ? decodeLandGrid(readJson(landFile)) : null;
  const manifest = readJson(path.join(data, "map", "campaign-map.json"));
  const metresPerPixel = Number.isFinite(Number(manifest.metresPerPixel)) && Number(manifest.metresPerPixel) > 0 ? Number(manifest.metresPerPixel) : 1;
  return { docs, locations, graph, landGrid, metresPerPixel };
}

/** A token's stand-point for a place: where the Foundry travel code puts it (the location's `derived.centroidPx`). */
export const pointFromLocations = (locations) => (end) => {
  const centre = end?.locationId ? locations[end.locationId]?.centroidPx : null;
  return centre ? { x: centre[0], y: centre[1] } : null;
};

/** Story, model and analysis in one go: `{ ...inputs, story, model, analysis, router }`. */
export function loadJourneyWorld(options = {}) {
  const inputs = loadJourneyInputs(options);
  const story = buildStory(inputs.docs, { locations: inputs.locations });
  const model = buildJourneyModel(story);
  const router = createRouter(inputs.graph);
  const analysis = analyseJourneys(model, story, {
    pointOf: pointFromLocations(inputs.locations), router, wayClass: inputs.graph.wayClass ?? {}, landGrid: inputs.landGrid, metresPerPixel: inputs.metresPerPixel
  });
  return { ...inputs, story, model, analysis, router };
}
