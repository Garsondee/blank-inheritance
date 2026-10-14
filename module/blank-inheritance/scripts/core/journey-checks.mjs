/**
 * Routing the journeys and judging them: can the tokens really get from each place to the next, and what will the table see when they do?
 * (design/location-editor.md section 16.)
 *
 * core/journey.mjs says which legs there are. This plans each one with the router the game uses (core/travel-route.mjs, held identical to `planRoute` by
 * test/tier1-travel-router.test.mjs), times it the way the game animates it (core/travel-speed.mjs `hopPlan`), and then asks the questions a GM cares about
 * and a router will never raise by itself, because it always produces SOME route:
 *
 *   - is there a place at each end, and a point on the map for it?
 *   - does the token stop in the sea? (a place whose middle is in the water: the centroid of a harbour, of a coastal district)
 *   - does the route ride a street or a rail at all, or is it a straight walk?
 *   - how much of it is WALKING, and how much of that walking is across open water? That is the live bug of 2026-09-19 ("landed in the ocean") and
 *     2026-09-23 ("a straight line across a street grid"), which the router cannot see because it knows no water (core/land-grid.mjs does).
 *   - does the road network on the far side connect to the one the party started on, or does the ride stop where the network does?
 *   - is it a huge detour, or so long to watch (or, in the fiction, to walk) that the scene order stops adding up?
 *   - when a departure takes the party to a place and a scene then opens somewhere else, how far apart are those two?
 *
 * Everything is advice with a severity (error / warn / info); nothing here blocks anything. Pure: the router, the points, the coast and the speeds are all
 * handed in, so the same code runs on a screen in Foundry and on the real data in a test.
 */

import { crossing, crossingAlong, nearestLand } from "./land-grid.mjs";
import { hopPlan, totalDurationMs } from "./travel-speed.mjs";

/** The thresholds the checks use, in the map's own metres. Exported so the tests (and the panel's explanations) read the same numbers. */
export const LIMITS = Object.freeze({
  walkInfoMetres: 300,          // walking this far in all (to and from the network) is worth saying
  walkWarnMetres: 600,          // and this far is a long way to walk to a road
  waterWarnMetres: 40,          // a walk that crosses this much open water is a walk through the sea
  waterErrorMetres: 250,
  straightErrorMetres: 700,     // a journey that never touches a street or a rail and is longer than this
  detourRatio: 2.5,             // route length over straight-line length
  detourMinMetres: 800,
  longWatchSeconds: 60,         // longer than this to watch on the map
  sameQuarterWarnMinutes: 60,   // two scenes in the same quarter of the day, with a journey between them this long
  settleWarnMetres: 150,        // the party stops here and the scene opens this far away
  stopInWaterErrorMetres: 100   // a token stop this far from any land
});

/** Real speeds, metres a second, for the story-time estimate (not the animation: that is travel-speed.mjs, deliberately faster). */
export const REAL_SPEED = Object.freeze({ walk: 1.4, bike: 4.5, motorbike: 9, car: 8, train: 15 });

export const SEVERITY = Object.freeze({ error: 3, warn: 2, info: 1 });

const issue = (id, severity, text, hint, extra = {}) => ({ id, severity, text, hint: hint ?? null, ...extra });
const km = (metres) => (metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`);
const minutesText = (minutes) => (minutes >= 90 ? `${Math.floor(minutes / 60)} h ${Math.round(minutes % 60)} min` : `${Math.max(1, Math.round(minutes))} min`);
const nameOf = (end) => end.name ?? end.label ?? end.locationId ?? "a place";

/** What is wrong with a place as somewhere for a token to stand, independent of any journey to or from it. */
export function placeIssues(end, { point, landGrid = null } = {}) {
  const out = [];
  if (end.offMapReason) return out;
  const label = nameOf(end);
  if (end.state === "pending-new") out.push(issue("pending", "info", `${label} is new and waiting to be pulled: its journeys are worked out from the place as drawn.`, null));
  if (end.state === "approximate") out.push(issue("approximate", "info", `${label} is only an approximate place for this scene.`, "Pick the building the scene really happens in."));
  if (end.tier === "region") out.push(issue("area-stop", "info", `${label} is an area: tokens go to its middle, wherever that falls.`, "Drop a pin where they should stand, or pick a building."));
  if (point && landGrid) {
    const wet = landGrid.isWater(point.x, point.y);
    if (wet === true) {
      const shore = nearestLand(landGrid, point, 400);
      const far = !shore || shore.distance > LIMITS.stopInWaterErrorMetres;
      out.push(issue("water-stop", far ? "error" : "warn", `Tokens would stand in the water at ${label}${shore ? `, ${Math.round(shore.distance)} m from land` : ""}.`, "Drop a pin on the shore, or pick a building.", { shore: shore ?? null }));
    }
  }
  return out;
}

const hopLength = (points, i) => Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
const polylineLength = (points) => {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += hopLength(points, i);
  return total;
};

/**
 * One leg planned and judged. Returns `{ status, issues, ... }`. `status` says only whether there is a route: "routed", "unplaced" (a place is missing or does
 * not exist), "no-point" (a place has no point on the map), "offmap" (an end is deliberately off the map) or "same" (both ends are one place, so nobody walks);
 * how GOOD a routed leg is lives in its `issues` and their severities. A routed leg carries `route` (segments, in map px), `hops` (the game's own animation
 * plan), `metres`, `seconds` (to watch), `realMinutes` (in the fiction), `walkMetres`, `waterMetres`, `modes` ([{ mode, metres }], longest first) and `runs` (the
 * route as polylines by mode, for drawing).
 */
export function planLeg(leg, deps) {
  const { pointOf, router, wayClass = {}, landGrid = null, metresPerPixel = 1 } = deps;
  const issues = [];
  const base = { status: "unplaced", issues, from: null, to: null, route: null, hops: null, metres: 0, seconds: 0, realMinutes: 0, walkMetres: 0, waterMetres: 0, modes: [], runs: [], meta: null };

  const ends = [["from", leg.from], ["to", leg.to]];
  for (const [, end] of ends) {
    if (end.offMapReason || end.state === "offmap") return { ...base, status: "offmap" };
  }
  for (const [side, end] of ends) {
    const where = leg.kind === "cut" ? (side === "from" ? "the scene before" : "this scene") : side === "from" ? "the start" : "the end";
    if (end.state === "gap" || (!end.locationId && !end.viaRecord)) {
      issues.push(issue("unplaced", "error", `${end.title ?? end.label ?? "A scene"} has no place yet, so ${where} of this journey is nowhere.`, "Pick, draw or pin its place.", { side }));
    } else if (end.state === "broken") {
      issues.push(issue("broken", "error", `${end.locationId} is not a location that exists, so ${where} of this journey is nowhere.`, "Pick a place that exists.", { side }));
    }
  }
  if (issues.length) return { ...base, status: "unplaced" };

  const a = pointOf(leg.from);
  const b = pointOf(leg.to);
  for (const [side, end, point] of [["from", leg.from, a], ["to", leg.to, b]]) {
    if (!point) issues.push(issue("no-point", "error", `${nameOf(end)} has no point on the map for a token to stand on.`, "Its location file needs an outline or a pin.", { side }));
  }
  if (!a || !b) return { ...base, status: "no-point", from: a, to: b };

  if (leg.from.locationId && leg.from.locationId === leg.to.locationId) return { ...base, status: "same", from: a, to: b };
  if (!leg.from.locationId && leg.from.viaRecord && leg.from.viaRecord === leg.to.viaRecord) return { ...base, status: "same", from: a, to: b };
  if (a.x === b.x && a.y === b.y) return { ...base, status: "same", from: a, to: b };

  const route = router.plan({ start: a, end: b });
  const hops = hopPlan(route.segments, { wayClass });
  const seconds = totalDurationMs(hops) / 1000;

  // Metres by mode, from the hops the game will animate (each hop is one straight stretch ridden or walked), and the route as polylines by mode for drawing.
  const points = [route.segments[0].points[0]];
  const hopModes = [];
  for (const hop of hops) {
    points.push(hop.to);
    hopModes.push(hop.mode);
  }
  const modeMetres = new Map();
  const runs = [];
  for (let i = 1; i < points.length; i++) {
    const d = hopLength(points, i);
    modeMetres.set(hopModes[i - 1], (modeMetres.get(hopModes[i - 1]) ?? 0) + d);
    const last = runs[runs.length - 1];
    if (last && last.mode === hopModes[i - 1]) last.points.push(points[i]);
    else runs.push({ mode: hopModes[i - 1], points: [points[i - 1], points[i]] });
  }
  const modes = [...modeMetres.entries()].map(([mode, metres]) => ({ mode, metres: metres * metresPerPixel })).sort((x, y) => y.metres - x.metres);
  const metres = route.distance * metresPerPixel;
  const realMinutes = modes.reduce((sum, m) => sum + m.metres / (REAL_SPEED[m.mode] ?? REAL_SPEED.walk), 0) / 60;

  // Walking: the stretches the router invented (to and from the network, and wherever it ran out), and how much of that is open water.
  let walkMetres = 0;
  let waterMetres = 0;
  for (const segment of route.segments) {
    if (segment.kind !== "walk") continue;
    walkMetres += polylineLength(segment.points) * metresPerPixel;
    if (landGrid) waterMetres += crossingAlong(landGrid, segment.points).water * metresPerPixel;
  }

  const meta = route.meta ?? null;
  const label = leg.label;

  if (!route.usedNetwork) {
    if (metres >= LIMITS.straightErrorMetres) {
      issues.push(issue("no-network", "error", `${label}: no street or rail is used, so the tokens walk ${km(metres)} in a straight line.`, "The road graph does not reach one end. Pick a place on or near a street, or drop a pin on one."));
    }
  } else {
    // A rail line is its own network: riding it to a station and walking on from there is how a train journey goes, so only a LONG last walk from a network
    // that did not reach the destination is a gap worth saying.
    const lastWalk = meta && meta.connected === false ? (meta.endWalk ?? 0) * metresPerPixel : 0;
    if (meta && meta.connected === false && lastWalk > LIMITS.walkInfoMetres) {
      issues.push(issue("network-gap", lastWalk > LIMITS.walkWarnMetres ? "error" : "warn", `${label}: the streets from the start do not reach the end, so the ride stops where the network does and the tokens walk the last ${km(lastWalk)}.`, "A different place nearer a street, or a pin on one, gives a connected route."));
    } else if (walkMetres > LIMITS.walkWarnMetres) {
      issues.push(issue("long-walk", "warn", `${label}: ${km(walkMetres)} of the journey is on foot off the streets.`, "A place nearer a street shortens it."));
    } else if (walkMetres > LIMITS.walkInfoMetres) {
      issues.push(issue("long-walk", "info", `${label}: ${km(walkMetres)} of the journey is on foot off the streets.`, null));
    }
  }
  if (landGrid) {
    const wet = !route.usedNetwork ? crossing(landGrid, a, b).water * metresPerPixel : waterMetres;
    if (wet >= LIMITS.waterWarnMetres) {
      issues.push(issue("water-walk", wet >= LIMITS.waterErrorMetres ? "error" : "warn", `${label}: ${km(wet)} of the walk is across open water.`, "The tokens cannot walk on the sea. Pick or pin a place the streets reach, or end the leg at the shore.", { waterMetres: wet }));
    }
  }
  const straight = Math.hypot(b.x - a.x, b.y - a.y) * metresPerPixel;
  if (route.usedNetwork && straight > 0 && metres >= LIMITS.detourMinMetres && metres / straight > LIMITS.detourRatio) {
    issues.push(issue("detour", "info", `${label}: ${km(metres)} by the streets for ${km(straight)} as the crow flies (${(metres / straight).toFixed(1)}x).`, null));
  }
  if (seconds > LIMITS.longWatchSeconds) {
    issues.push(issue("slow", "info", `${label}: ${Math.round(seconds)} s to watch on the map.`, null));
  }
  if (leg.timing && leg.timing.to.t - leg.timing.from.t === 0 && realMinutes > LIMITS.sameQuarterWarnMinutes) {
    issues.push(issue("story-time", "warn", `${label}: about ${minutesText(realMinutes)} to travel, but both scenes are in the ${leg.timing.to.quarter ?? "same part of the day"}.`, "Move one scene's time, or one scene's place."));
  }
  if (leg.settle && leg.settle.locationId && leg.settle.locationId !== leg.to.locationId) {
    const target = deps.pointOf({ locationId: leg.settle.locationId, viaRecord: null, state: "ok" });
    if (target) {
      const apart = Math.hypot(target.x - b.x, target.y - b.y) * metresPerPixel;
      if (apart > LIMITS.settleWarnMetres) {
        issues.push(issue("settle", "warn", `${label}: the party stops at ${nameOf(leg.to)}, but ${leg.settle.title} happens at ${leg.settle.name ?? leg.settle.locationId}, ${km(apart)} away.`, "Make the two the same place, or put the scene where the party stops.", { settleMetres: apart }));
      }
    }
  }

  return { status: "routed", issues, from: a, to: b, route, hops, metres, seconds, realMinutes, walkMetres, waterMetres, modes, runs, meta };
}

/**
 * Every leg of a journey model planned, every place judged, and a verdict for each episode.
 * `deps`: `{ pointOf(endpoint) -> {x, y} | null, router, wayClass, landGrid, metresPerPixel }` (see planLeg).
 * Returns `{ legs: Map legId -> planLeg's result, places: Map slotKey -> { end, point, issues }, issues, groups }`; `issues` is every issue, each with where it
 * is (`legId`, `slotKey`, `rowKey`, `groupId`), worst first.
 */
export function analyseJourneys(model, story, deps) {
  const legResults = new Map();
  const places = new Map();
  const all = [];
  const seenPlace = (end, groupId) => {
    if (!end?.slotKey || places.has(end.slotKey)) return;
    const point = end.offMapReason || (!end.locationId && !end.viaRecord) ? null : deps.pointOf(end);
    const found = placeIssues(end, { point, landGrid: deps.landGrid ?? null });
    places.set(end.slotKey, { end, point, issues: found });
    for (const f of found) all.push({ ...f, slotKey: end.slotKey, rowKey: end.rowKey, groupId, legId: null });
  };

  for (const group of story?.groups ?? []) {
    for (const row of group.rows) if (row.place) seenPlace(endpointFromSlot(row.place, row), group.id);
  }
  for (const leg of model.legs) {
    seenPlace(leg.from, leg.groupId);
    seenPlace(leg.to, leg.groupId);
    const result = planLeg(leg, deps);
    legResults.set(leg.id, result);
    // an issue about the start of a leg (its place is missing, say) is about the start's slot; every other is about the end the party is going to
    for (const f of result.issues) {
      const end = f.side === "from" ? leg.from : leg.to;
      all.push({ ...f, legId: leg.id, slotKey: end.slotKey, rowKey: end.rowKey ?? leg.rowKey, groupId: leg.groupId });
    }
  }
  all.sort((a, b) => SEVERITY[b.severity] - SEVERITY[a.severity]);

  const groups = model.groups.map((group) => {
    const results = group.legs.map((leg) => legResults.get(leg.id));
    const counts = { error: 0, warn: 0, info: 0 };
    for (const f of all) if (f.groupId === group.id) counts[f.severity]++;
    const sourceRows = story.groups.find((g) => g.id === group.id)?.rows ?? [];
    const unplaced = sourceRows.filter((r) => r.sceneGap).length;
    const routed = results.filter((r) => r.status === "routed");
    const errors = counts.error;
    return {
      id: group.id, title: group.title,
      scenes: sourceRows.length, unplaced,
      legs: group.legs.length, routed: routed.length, same: results.filter((r) => r.status === "same").length, offmap: results.filter((r) => r.status === "offmap").length,
      errors, warns: counts.warn, infos: counts.info,
      // The main road through the episode: the scene-to-scene cuts. The options are alternatives, so adding them up would count every road not taken.
      main: sumLegs(group.legs.filter((leg) => leg.kind === "cut").map((leg) => legResults.get(leg.id))),
      optionLegs: group.legs.filter((leg) => leg.kind !== "cut").length,
      metres: sumLegs(results).metres, seconds: sumLegs(results).seconds, realMinutes: sumLegs(results).realMinutes,
      verdict: errors > 0 || unplaced > 0 ? "broken" : counts.warn > 0 ? "attention" : "continuous"
    };
  });
  return { legs: legResults, places, issues: all, groups };
}

function sumLegs(results) {
  const routed = results.filter((r) => r?.status === "routed");
  return { legs: routed.length, metres: routed.reduce((s, r) => s + r.metres, 0), seconds: routed.reduce((s, r) => s + r.seconds, 0), realMinutes: routed.reduce((s, r) => s + r.realMinutes, 0) };
}

/** A slot of the Story as the endpoint a leg has (the same fields core/journey.mjs gives its legs). */
export function endpointFromSlot(slot, row) {
  return {
    slotKey: slot.key, rowKey: row.key, title: row.title, label: slot.label, locationId: slot.locationId ?? null, viaRecord: slot.viaRecord ?? null,
    state: slot.state, name: slot.location?.name ?? null, tier: slot.location?.tier ?? null, pending: Boolean(slot.pending), offMapReason: slot.offMapReason ?? null
  };
}

/** What a leg that is not routed says instead of a distance. */
export const STATUS_TEXT = Object.freeze({
  pending: "not worked out yet",
  unplaced: "cannot be walked: a scene has no place yet",
  "no-point": "cannot be walked: a place has no point on the map",
  same: "the same place: nobody walks",
  offmap: "off the map: nothing to walk",
  routed: ""
});

/** A leg's result as the words a row shows: `{ status, statusText, distance, time, realTime, modes, worst }`. `worst` is the most severe issue's severity, or null. */
export function legBadge(result) {
  if (!result) return { status: "pending", statusText: STATUS_TEXT.pending, distance: "", time: "", realTime: "", modes: "", worst: null };
  const worst = result.issues.reduce((w, f) => (SEVERITY[f.severity] > (SEVERITY[w] ?? 0) ? f.severity : w), null);
  if (result.status !== "routed") return { status: result.status, statusText: STATUS_TEXT[result.status] ?? result.status, distance: "", time: "", realTime: "", modes: "", worst };
  return {
    status: "routed",
    statusText: "",
    distance: km(result.metres),
    time: `${Math.max(1, Math.round(result.seconds))} s`,
    realTime: minutesText(result.realMinutes),
    modes: result.modes.filter((m) => m.metres >= 1).map((m) => `${m.mode} ${km(m.metres)}`).join(" · "),
    worst
  };
}

export { km as formatMetres, minutesText as formatMinutes };
