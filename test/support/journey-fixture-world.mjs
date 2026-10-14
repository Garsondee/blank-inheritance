// A small invented world for the journey tests: one long road, a rail line, a U-shaped road and a bay, where every answer can be worked out by hand.
// Shared by test/tier1-journey-checks.test.mjs, tier1-journey-timeline.test.mjs and tier1-journey-whatif.test.mjs.

import { buildStory } from "../../module/blank-inheritance/scripts/core/siting.mjs";
import { buildJourneyModel } from "../../module/blank-inheritance/scripts/core/journey.mjs";
import { analyseJourneys, planLeg } from "../../module/blank-inheritance/scripts/core/journey-checks.mjs";
import { createRouter } from "../../module/blank-inheritance/scripts/core/travel-route.mjs";
import { decodeLandGrid } from "../../module/blank-inheritance/scripts/core/land-grid.mjs";

/* ---------------------------------------------------------------- the invented world */

const nodeXy = {};
const wayNodes = {};
const wayClass = {};
const line = (way, firstId, count, at, cls) => {
  wayNodes[way] = [];
  wayClass[way] = cls;
  for (let i = 0; i < count; i++) { nodeXy[firstId + i] = at(i); wayNodes[way].push(firstId + i); }
};
// a long road across the top (40 nodes: a network the router trusts needs 25), a rail line along the bottom of the west half, and a U-shaped road in the east
line("roadA", 1, 40, (i) => [i * 100, 150], "residential");                     // x 0..3900, y 150
line("rail", 101, 30, (i) => [i * 60, 1850], "rail");                           // x 0..1740, y 1850
const u = [];
for (let i = 0; i <= 15; i++) u.push([4200, 150 + i * 100]);                    // down the west arm
for (let i = 1; i <= 6; i++) u.push([4200 + i * 100, 1650]);                    // across the bottom
for (let i = 14; i >= 0; i--) u.push([4800, 150 + i * 100]);                    // up the east arm
line("uRoad", 201, u.length, (i) => u[i], "residential");
export const graph = { nodeXy, wayNodes, wayClass };

// a coast: 100 m samples over x 0..5000, y 0..2000, with a bay of water at x 2000..3000, y 500..2000
const water = [];
for (let r = 0; r < 20; r++) water.push(Array.from({ length: 50 }, (_, c) => (c >= 20 && c < 30 && r >= 5 ? 1 : 0)));
const runs = [];
for (const flatRow of water.flat()) { const last = runs[runs.length - 1]; if (last && last[0] === flatRow) last[1] += 1; else runs.push([flatRow, 1]); }
export const landGrid = decodeLandGrid({ kind: "land-grid", version: 1, cols: 50, rows: 20, step: 100, origin: [50, 50], runs });

export const POINTS = {
  west: { x: 0, y: 160 }, east: { x: 3900, y: 160 },             // the two ends of the long road
  "dry-w": { x: 1000, y: 1000 }, "dry-w2": { x: 1000, y: 1750 },       // dry ground, nowhere near a road
  "dry-e": { x: 3500, y: 1900 },                                    // dry ground east of the bay, far from the rail
  "rail-start": { x: 1000, y: 1900 },                               // beside the rail line
  bay: { x: 2500, y: 1000 }, shore: { x: 2050, y: 1050 },        // in the water, far from land and a hundred metres from it
  "u-west": { x: 4200, y: 160 }, "u-east": { x: 4800, y: 160 },        // the two ends of the U, 600 apart as the crow flies
  near: { x: 1300, y: 1100 }, nearby: { x: 1100, y: 1050 },      // a short walk from dryW, and a very short one
  "shore-2": { x: 2010, y: 520 },                                // just inside the bay, a few tens of metres from land, 370 m below the long road
  "road-mid-1": { x: 1000, y: 160 }, "road-mid-2": { x: 2000, y: 170 }   // two places on the long road, a kilometre apart
};
export const pointOf = (end) => POINTS[end.locationId] ?? null;
export const router = createRouter(graph);
export const deps = { pointOf, router, wayClass, landGrid, metresPerPixel: 1 };

export const end = (id, extra = {}) => ({ slotKey: `slot:${id}`, rowKey: `row:${id}`, title: id, label: id, locationId: id, viaRecord: null, state: "ok", name: id, tier: "site", pending: false, offMapReason: null, ...extra });
export const leg = (from, to, extra = {}) => ({ id: `leg:${from.locationId ?? from.title}>${to.locationId ?? to.title}`, kind: "cut", groupId: "g", rowKey: "row:x", label: `${from.title} → ${to.title}`, from, to, mode: null, settle: null, timing: null, ...extra });
export const run = (a, b, extra = {}, over = {}) => planLeg(leg(end(a), end(b), extra), { ...deps, ...over });
export const ids = (result) => result.issues.map((i) => i.id);


export function worldDocs(placeOf) {
  const sceneSet = { scenes: [
    { id: "ss-1", name: "One", briefRef: "b1", locationRef: placeOf[0], kind: "beat", order: 1 },
    { id: "ss-2", name: "Two", briefRef: "b2", locationRef: placeOf[1], kind: "beat", order: 2 },
    { id: "ss-3", name: "Three", briefRef: "b3", locationRef: placeOf[2], kind: "beat", order: 3 }
  ] };
  const episodes = [{ id: "ep", title: "Ep", dayRange: { start: 1, end: 1 }, scenes: [
    { id: "c1", order: 1, title: "One", briefRef: "b1", day: 1, quarter: "morning" },
    { id: "c2", order: 2, title: "Two", briefRef: "b2", day: 1, quarter: "afternoon" },
    { id: "c3", order: 3, title: "Three", briefRef: "b3", day: 1, quarter: "evening" }
  ] }];
  return { sceneSet, episodes, briefs: { b1: { id: "b1" }, b2: { id: "b2" }, b3: { id: "b3" } } };
}
export const locations = Object.fromEntries(Object.keys(POINTS).map((id) => [id, { id, name: id, tier: "site", kind: "" }]));
export const analyse = (placeOf, options = {}) => {
  const story = buildStory(worldDocs(placeOf), { locations, ...options });
  const model = buildJourneyModel(story);
  return { story, model, analysis: analyseJourneys(model, story, deps) };
};


/**
 * Three scenes in the invented world, the middle one with a departure: a free choice of two places to go (a short walk apart, each a rest scene of the haunts),
 * then everyone musters at the west end of the road where the third scene happens.
 */
export function departureDocs(placeOf = ["west", "east", "west"]) {
  const sceneSet = { scenes: [
    { id: "ss-1", name: "One", briefRef: "b1", locationRef: placeOf[0], kind: "beat", order: 1 },
    { id: "ss-2", name: "Two", briefRef: "b2", locationRef: placeOf[1], kind: "beat", order: 2 },
    { id: "ss-3", name: "Three", briefRef: "b3", locationRef: placeOf[2], kind: "beat", order: 3 },
    { id: "ss-h1", name: "Rest A", briefRef: "bh1", locationRef: "road-mid-1", kind: "beat", group: "haunts", order: 1 },
    { id: "ss-h2", name: "Rest B", briefRef: "bh2", locationRef: "road-mid-2", kind: "beat", group: "haunts", order: 2 }
  ] };
  const episodes = [{ id: "ep", title: "Ep", dayRange: { start: 1, end: 1 }, scenes: [
    { id: "c1", order: 1, title: "One", briefRef: "b1", day: 1, quarter: "morning" },
    { id: "c2", order: 2, title: "Two", briefRef: "b2", day: 1, quarter: "afternoon" },
    { id: "c3", order: 3, title: "Three", briefRef: "b3", day: 1, quarter: "evening" }
  ] }];
  const briefs = {
    b1: { id: "b1" },
    b2: { id: "b2", outro: { departure: { kind: "free", question: "Where do you spend the afternoon?", destinations: [
      { id: "a", label: "Rest A", placeRef: "road-mid-1", briefRef: "bh1" },
      { id: "b", label: "Rest B", placeRef: "road-mid-2", briefRef: "bh2" }
    ], then: { kind: "muster", placeRef: "west", briefRef: "b3", label: "Muster" } } } },
    b3: { id: "b3" }, bh1: { id: "bh1" }, bh2: { id: "bh2" }
  };
  return { sceneSet, episodes, briefs };
}
export const analyseDeparture = (placeOf, options = {}) => {
  const docs = departureDocs(placeOf);
  const story = buildStory(docs, { locations, ...options });
  const model = buildJourneyModel(story);
  return { docs, story, model, analysis: analyseJourneys(model, story, deps) };
};
