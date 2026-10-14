#!/usr/bin/env node
/**
 * `npm run journeys` -- can the party's tokens walk every episode? (design/location-editor.md section 16)
 *
 * Runs the Location Editor's Journeys check over the repo's own data: for every episode, each scene-to-scene cut and each journey a player's choice sets off is
 * routed with the router the game uses, timed the way the game animates it, and judged (a place with no point on the map, a token that would stand in the sea,
 * a walk across the bay, a street network that does not reach the destination, a journey that cannot fit in the time the story gives it).
 *
 *   node tools/location-sync/journeys.mjs                 every episode, errors and warnings
 *   node tools/location-sync/journeys.mjs --episode <id>  one episode
 *   node tools/location-sync/journeys.mjs --notes         also list the notes (areas as stops, detours, slow watches)
 *   node tools/location-sync/journeys.mjs --legs          every journey, in play order
 *
 * Exit code 1 when an episode has an error or a scene with no place, so it can stand in a script. Warnings and notes never fail it. A scene with no place that an
 * open request names (data/map/gazetteer-requests.json, `blocks`) is listed as waiting for a siting and does not fail it (tools/location-sync/waiting.mjs).
 */

import { loadJourneyWorld, DEFAULT_REPO } from "./journey-world.mjs";
import { loadWaiting } from "./waiting.mjs";
import { formatJourneyReport } from "../../module/blank-inheritance/scripts/core/journey-report.mjs";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : null; };

if (flag("help") || flag("h")) {
  console.log("usage: node tools/location-sync/journeys.mjs [--episode <id>] [--notes] [--legs]");
  process.exit(0);
}

const world = loadJourneyWorld();
const groupId = value("episode");
if (groupId && !world.model.groups.some((g) => g.id === groupId)) {
  console.error(`No episode "${groupId}". The episodes are: ${world.model.groups.map((g) => g.id).join(", ")}`);
  process.exit(2);
}
const report = formatJourneyReport(world, { groupId, notes: flag("notes"), legs: flag("legs") });
process.stdout.write(report.text);
const waiting = loadWaiting(DEFAULT_REPO);
const issues = world.analysis.issues.filter((i) => !groupId || i.groupId === groupId);
const waitingIssues = issues.filter(waiting.isWaiting);
const waitingScenes = new Set(waitingIssues.map((i) => i.slotKey));
if (waitingScenes.size) {
  process.stdout.write("\nWaiting for a siting (an open request names these scenes, so they do not fail the check):\n");
  for (const key of waitingScenes) {
    const brief = waiting.briefOfSlot(key);
    process.stdout.write(`  ${brief}: ${waiting.waitingOn.get(brief).join(", ")}\n`);
  }
}
const errors = issues.filter((i) => i.severity === "error" && !waiting.isWaiting(i)).length;
const unplaced = world.analysis.groups.filter((g) => !groupId || g.id === groupId).reduce((n, g) => n + g.unplaced, 0);
process.exit(errors > 0 || unplaced > waitingScenes.size ? 1 : 0);
