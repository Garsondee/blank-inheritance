// Tier 2 -- the real episodes, walked (design/location-editor.md section 16).
//
// "Can the party's tokens complete the whole episode, moving from place to place?" -- the question Ingram put to the Location Editor. The journey checks answer it
// on a screen in Foundry; this answers it in `npm test`, over the same data, so a placement that strands the party (a scene in the sea, a scene with no place, a
// place with no point on the map) fails here before it reaches the table.
//
// Only ERRORS fail it. A warning is advice (a network gap, a token stop near the shore) and the GM may well accept it; the CLI (`npm run journeys`) lists those.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadJourneyWorld, DEFAULT_REPO } from "../tools/location-sync/journey-world.mjs";
import { loadWaiting } from "../tools/location-sync/waiting.mjs";
import { formatJourneyReport } from "../module/blank-inheritance/scripts/core/journey-report.mjs";
import { legBadge } from "../module/blank-inheritance/scripts/core/journey-checks.mjs";

const have = existsSync(path.join(DEFAULT_REPO, "data", "map", "travel-graph.json")) && existsSync(path.join(DEFAULT_REPO, "data", "map", "land-grid.json"));
const skip = !have && "data/map/travel-graph.json or land-grid.json is not here (run python tools/location-sync/export_land_grid.py)";
const world = have ? loadJourneyWorld() : null;

test("every episode has journeys to walk, and each scene's place is somewhere the map knows", { skip }, () => {
  assert.ok(world.model.groups.length >= 2, "Episode One and Episode Two at least");
  for (const group of world.model.groups) {
    assert.ok(group.legs.length >= 5, `${group.title} has legs`);
    assert.ok(group.stops.length >= 5, `${group.title} has scenes with places`);
  }
});

// A scene may have no place yet ONLY while an open request in data/map/gazetteer-requests.json names it in `blocks` (Ingram, 2026-10-07: a place that feels wrong
// is deregistered and listed as needing to be made in the Location Editor, rather than left pointing at the wrong building). Anything else without a place is still
// a failure, and a request that is resolved stops excusing it (tools/location-sync/waiting.mjs, shared with `npm run journeys`).
const { waitingOn, briefOfSlot, isWaiting, sceneSet } = have ? loadWaiting(DEFAULT_REPO) : { waitingOn: new Map(), briefOfSlot: () => null, isWaiting: () => false, sceneSet: { scenes: [] } };

test("the party can walk every episode: no journey is broken, no scene is without a place (unless a request for it is open), no place has nowhere to stand", { skip }, () => {
  const broken = world.analysis.issues.filter((i) => i.severity === "error" && !isWaiting(i));
  assert.deepEqual(broken.map((i) => `${i.groupId}: ${i.text}`), [], "an error here is a scene the tokens cannot reach: fix its place in the Location Editor (npm run journeys says which)");
  const waitingScenes = new Set(world.analysis.issues.filter(isWaiting).map((i) => i.slotKey));
  for (const group of world.analysis.groups) {
    const mine = [...waitingScenes].filter((key) => world.analysis.issues.some((i) => i.slotKey === key && i.groupId === group.id)).length;
    assert.ok(group.unplaced <= mine, `${group.title}: ${group.unplaced} scene(s) with no place, ${mine} of them waiting on an open request`);
  }
});

test("a scene waiting for a place says what it is waiting for", { skip }, () => {
  for (const issue of world.analysis.issues.filter(isWaiting)) {
    const reqs = waitingOn.get(briefOfSlot(issue.slotKey));
    assert.ok(reqs.length > 0, issue.text);
  }
  for (const [brief, reqs] of waitingOn) assert.ok(sceneSet.scenes.some((s) => s.briefRef === brief), `${reqs.join(", ")} blocks ${brief}, which is in no scene-set entry`);
});

test("every leg that is routed has a real route: a start, an end, hops the game can animate, a length and a time", { skip }, () => {
  let routed = 0;
  for (const [id, result] of world.analysis.legs) {
    if (result.status !== "routed") continue;
    routed++;
    assert.ok(result.hops.length > 0, id);
    assert.ok(result.metres > 0 && result.seconds > 0 && result.realMinutes > 0, id);
    assert.ok(result.runs.length >= 1 && result.runs.every((r) => r.points.length >= 2), id);
    const last = result.hops[result.hops.length - 1].to;
    assert.ok(Math.hypot(last.x - result.to.x, last.y - result.to.y) < 1, `${id} ends where the destination stands`);
    assert.ok(legBadge(result).distance, id);
  }
  assert.ok(routed >= 40, `only ${routed} legs routed`);
});

test("the checks see what is really there: the coast file puts the harbour in the water and the street graph reaches the gate", { skip }, () => {
  const centre = (id) => { const c = world.locations[id].centroidPx; return { x: c[0], y: c[1] }; };
  assert.equal(world.landGrid.isWater(centre("inner-harbour").x, centre("inner-harbour").y), true);
  assert.equal(world.landGrid.isWater(centre("candidate-gate").x, centre("candidate-gate").y), false);
  const route = world.router.plan({ start: centre("candidate-gate"), end: centre("long-hall") });
  assert.equal(route.usedNetwork, true);
});

test("the report names every error and warning with its scene and slot, and counts what it leaves out", { skip }, () => {
  const report = formatJourneyReport(world);
  assert.match(report.text, /^# Journeys: /m);
  assert.match(report.text, /Verdict: /);
  for (const issue of world.analysis.issues.filter((i) => i.severity !== "info")) {
    assert.ok(report.text.includes(issue.text), `the report leaves out: ${issue.text}`);
    assert.ok(report.text.includes(`slot ${issue.slotKey}`), `the report does not say which slot: ${issue.text}`);
  }
  const notes = world.analysis.issues.filter((i) => i.severity === "info").length;
  if (notes) assert.match(report.text, new RegExp(`${notes} notes not listed|\\(\\d+ notes not listed`));
  assert.equal(report.errors, world.analysis.issues.filter((i) => i.severity === "error").length);
});
