/**
 * Scenes that may have no place yet because a request for one is open (Ingram, 2026-10-07, canon/decisions/D066.md: a place that feels wrong is deregistered and listed
 * for the Location Editor, rather than left pointing at the wrong building).
 *
 * A scene is WAITING when an open request in data/map/gazetteer-requests.json names its brief in `blocks`. `npm run journeys` and test/tier2-journey-corpus.test.mjs
 * both let a waiting scene be unplaced, and say what it is waiting for; any other scene without a place is still an error, and a resolved request stops excusing one.
 * The Location Editor's own Journeys tab does not use this: it keeps saying, truthfully, that the party cannot walk a scene that has no place.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

export function loadWaiting(repo) {
  const requests = JSON.parse(readFileSync(path.join(repo, "data", "map", "gazetteer-requests.json"), "utf8"));
  const sceneSet = JSON.parse(readFileSync(path.join(repo, "data", "campaign", "scene-set.json"), "utf8"));
  const waitingOn = new Map();
  for (const r of requests.requests.filter((x) => x.status === "open")) for (const brief of r.blocks ?? []) waitingOn.set(brief, [...(waitingOn.get(brief) ?? []), r.id]);
  const briefOfSlot = (slotKey) => sceneSet.scenes.find((s) => `scene:${s.id}` === slotKey)?.briefRef ?? null;
  /** An "unplaced" issue about a scene that an open request is about. */
  const isWaiting = (issue) => issue.id === "unplaced" && waitingOn.has(briefOfSlot(issue.slotKey));
  return { waitingOn, briefOfSlot, isWaiting, sceneSet };
}
