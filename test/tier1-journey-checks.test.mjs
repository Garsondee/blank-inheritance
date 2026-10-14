// Tier 1 -- the journey checks (core/journey-checks.mjs): routing each leg with the game's own router and judging it.
//
// A router always produces SOME route, so "it routed" proves nothing; the checks exist to say what a router never will. Each rule below is one failure the GM has met
// for real (a token that landed in the ocean, a straight line across a street grid, a place whose middle is in the harbour) or one the story needs (a journey that
// cannot fit the time between two scenes). They run on a small invented world (one long road, a rail line, a U-shaped road, a bay) where every answer can be
// worked out by hand; the real episodes are held by test/tier2-journey-corpus.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyseJourneys, legBadge, LIMITS, planLeg, placeIssues, REAL_SPEED, SEVERITY } from "../module/blank-inheritance/scripts/core/journey-checks.mjs";
import { analyse, deps, end, graph, ids, landGrid, leg, locations, POINTS, pointOf, router, run, worldDocs } from "./support/journey-fixture-world.mjs";

/* ---------------------------------------------------------------- routing and timing */

test("a leg along the long road is routed on the network, by car, with the metres, the watch time and the story time worked out", () => {
  const r = run("west", "east");
  assert.equal(r.status, "routed");
  assert.equal(r.route.usedNetwork, true);
  assert.equal(r.modes[0].mode, "car");
  assert.ok(r.metres > 3890 && r.metres < 3950, `${r.metres}`);
  // watched at the game's car speed (150 px a second), not at the speed it would really take
  assert.ok(Math.abs(r.seconds - r.metres / 150) < 1.5, `${r.seconds}`);
  assert.ok(Math.abs(r.realMinutes - r.metres / REAL_SPEED.car / 60) < 0.5, `${r.realMinutes}`);
  assert.deepEqual(r.issues, [], "a clean ride says nothing");
  // the game's own hop plan, kept for playing it back: ten pixels on foot to the road, the ride, ten pixels on foot to the door
  assert.ok(r.hops.length > 5 && r.hops.filter((h) => h.mode === "car").length > 4);
  assert.deepEqual(r.runs.map((x) => x.mode), ["walk", "car", "walk"], "the route as polylines by mode, for drawing");
  assert.deepEqual(r.runs[0].points[0], { x: 0, y: 160 }, "it starts where the token stands");
  assert.deepEqual(r.runs[2].points[r.runs[2].points.length - 1], { x: 3900, y: 160 });
  assert.equal(r.runs[1].points[0].y, 150, "the ride is on the road");
});

test("the map's scale turns pixels into metres without changing how long the game takes to show it", () => {
  const plain = run("west", "east");
  const big = run("west", "east", {}, { metresPerPixel: 3 });
  assert.ok(Math.abs(big.metres - plain.metres * 3) < 0.01);
  assert.equal(big.seconds, plain.seconds, "the animation runs on pixels");
  assert.ok(Math.abs(big.realMinutes - plain.realMinutes * 3) < 0.01);
});

test("a journey that rides a rail line is told apart by mode, longest first", () => {
  const r = run("rail-start", "dry-e");
  assert.equal(r.status, "routed");
  const modes = r.modes.map((m) => m.mode);
  assert.ok(modes.includes("train") && modes.includes("walk"), modes.join());
  assert.ok(r.modes[0].metres >= r.modes[r.modes.length - 1].metres, "longest first");
  assert.ok(r.runs.some((x) => x.mode === "train"));
});

/* ---------------------------------------------------------------- what a router never says */

test("a walk across the bay is an error: the router knows no water, the coast does", () => {
  const r = run("rail-start", "dry-e");
  assert.ok(r.waterMetres > 800, `${r.waterMetres} m of the walk is over the bay`);
  const water = r.issues.find((i) => i.id === "water-walk");
  assert.equal(water.severity, "error");
  assert.ok(water.waterMetres >= LIMITS.waterErrorMetres);
  assert.match(water.text, /open water/);
});

test("the same walk is only a warning for a short wade, and nothing at all over dry land", () => {
  // from beside the rail to a place at the very edge of the bay: a few tens of metres of water at most
  const edge = { x: 2020, y: 1700 };
  const r = planLeg(leg(end("rail-start"), end("edge")), { ...deps, pointOf: (e) => (e.locationId === "edge" ? edge : POINTS[e.locationId]) });
  const wet = r.issues.find((i) => i.id === "water-walk");
  if (wet) assert.equal(wet.severity, r.waterMetres >= LIMITS.waterErrorMetres ? "error" : "warn");
  const dry = run("dry-w", "near");
  assert.equal(dry.waterMetres, 0);
  assert.ok(!ids(dry).includes("water-walk"));
});

test("no street or rail used on a long way is an error: tokens would walk it in a straight line", () => {
  const r = run("dry-w", "dry-w2");
  assert.equal(r.route.usedNetwork, false);
  assert.ok(r.metres >= LIMITS.straightErrorMetres);
  assert.deepEqual(ids(r), ["no-network"]);
  assert.equal(r.issues[0].severity, "error");
});

test("a short walk with no street is fine", () => {
  const r = run("dry-w", "near");
  assert.equal(r.route.usedNetwork, false);
  assert.ok(r.metres < LIMITS.straightErrorMetres);
  assert.deepEqual(ids(r), []);
});

test("riding until the network ends and then walking a long way is a gap in the network, worse the longer the last walk", () => {
  const r = run("rail-start", "dry-e");
  const gap = r.issues.find((i) => i.id === "network-gap");
  assert.ok(gap, "the rail line stops 1.7 km short of the east shore");
  assert.equal(gap.severity, "error", "a last walk longer than the warn limit is an error");
  assert.ok(r.meta.connected === false);
  assert.match(gap.text, /walk the last/);
  // a train that only leaves a short walk at the end is how a train journey goes: no gap is said
  const short = run("rail-start", "west", {}, { pointOf: (e) => (e.locationId === "west" ? { x: 1740, y: 1700 } : POINTS[e.locationId]) });
  assert.ok(!ids(short).includes("network-gap"), ids(short).join());
});

test("a long ride that bends far round for a short distance is noted as a detour, never a fault", () => {
  const r = run("u-west", "u-east");
  assert.equal(r.route.usedNetwork, true);
  const detour = r.issues.find((i) => i.id === "detour");
  assert.ok(detour, "600 m apart as the crow flies, ~3.6 km by the U");
  assert.equal(detour.severity, "info");
  assert.ok(r.metres / 600 > LIMITS.detourRatio);
});

test("a journey that takes long to watch is noted, so a table is not left staring at the map", () => {
  const r = run("west", "east", {}, { metresPerPixel: 1 });
  assert.ok(!ids(r).includes("slow"), "26 seconds is fine");
  // the walk across to the far side of the U, repeated, is long enough in this world only on foot: fake a slow plan with a huge detour
  const slow = planLeg(leg(end("u-west"), end("u-east")), deps);
  assert.ok(slow.seconds > 0);
  const limit = LIMITS.longWatchSeconds;
  const stretched = { ...deps, router: { plan: (q) => { const base = router.plan(q); return { ...base, segments: [{ kind: "walk", points: [q.start, { x: q.start.x + 6000, y: q.start.y }] }], usedNetwork: false, distance: 6000, meta: base.meta }; } } };
  const long = planLeg(leg(end("west"), end("east")), stretched);
  assert.ok(long.seconds > limit);
  assert.ok(ids(long).includes("slow"));
  assert.equal(long.issues.find((i) => i.id === "slow").severity, "info");
});

test("two scenes in the same part of the day with a long journey between them is a warning about the story's own clock", () => {
  const timing = (a, b) => ({ from: { day: 1, quarter: a, t: 4 + ["morning", "afternoon", "evening", "night"].indexOf(a) }, to: { day: 1, quarter: b, t: 4 + ["morning", "afternoon", "evening", "night"].indexOf(b) } });
  const far = { ...deps, metresPerPixel: 10 };                  // 39 km by road: well over an hour
  const same = planLeg(leg(end("west"), end("east"), { timing: timing("morning", "morning") }), far);
  assert.ok(same.realMinutes > LIMITS.sameQuarterWarnMinutes);
  const warn = same.issues.find((i) => i.id === "story-time");
  assert.equal(warn.severity, "warn");
  assert.match(warn.text, /morning/);
  const later = planLeg(leg(end("west"), end("east"), { timing: timing("morning", "afternoon") }), far);
  assert.ok(!ids(later).includes("story-time"), "a later quarter leaves room for the trip");
  const noTiming = planLeg(leg(end("west"), end("east")), far);
  assert.ok(!ids(noTiming).includes("story-time"), "no times, no claim");
  const quick = planLeg(leg(end("dry-w"), end("near"), { timing: timing("morning", "morning") }), deps);
  assert.ok(!ids(quick).includes("story-time"), "a short hop fits");
});

test("a departure's destination must be where the next scene opens: the gap between where the party stops and where the scene happens is a warning", () => {
  const settle = { rowKey: "row:rest", title: "Rest: The Roof", locationId: "east", name: "east", slotKey: "slot:rest" };
  const apart = planLeg(leg(end("west"), end("dry-w"), { kind: "option", settle }), deps);
  const w = apart.issues.find((i) => i.id === "settle");
  assert.ok(w, "the party stops at dryW but the rest scene is at the other end of the long road");
  assert.equal(w.severity, "warn");
  assert.ok(w.settleMetres > LIMITS.settleWarnMetres);
  assert.match(w.text, /Rest: The Roof/);
  const together = planLeg(leg(end("west"), end("dry-w"), { kind: "option", settle: { ...settle, locationId: "dry-w" } }), deps);
  assert.ok(!ids(together).includes("settle"), "the very same place needs no word");
  const close = planLeg(leg(end("west"), end("dry-w"), { kind: "option", settle: { ...settle, locationId: "nearby" } }), deps);
  assert.ok(!ids(close).includes("settle"), "a short way off is the same neighbourhood");
});

/* ---------------------------------------------------------------- when there is nothing to route */

test("a missing place, a place that does not exist and a place with no point are errors that say which end and what to do", () => {
  const gap = planLeg(leg(end("west"), end("nowhere", { state: "gap", locationId: null, name: null })), deps);
  assert.equal(gap.status, "unplaced");
  assert.deepEqual(ids(gap), ["unplaced"]);
  assert.equal(gap.issues[0].side, "to");
  assert.match(gap.issues[0].text, /has no place yet/);
  assert.ok(gap.issues[0].hint);

  const broken = planLeg(leg(end("ghost", { state: "broken" }), end("east")), deps);
  assert.equal(broken.status, "unplaced");
  assert.deepEqual(ids(broken), ["broken"]);
  assert.equal(broken.issues[0].side, "from");

  const pointless = planLeg(leg(end("west"), end("mystery")), deps);
  assert.equal(pointless.status, "no-point", "a location with no outline and no pin has nowhere to stand");
  assert.deepEqual(ids(pointless), ["no-point"]);
});

test("a cut says 'the scene before' and 'this scene'; an option says 'the start' and 'the end'", () => {
  const cut = planLeg(leg(end("a", { state: "gap", locationId: null }), end("b", { state: "gap", locationId: null }), { kind: "cut" }), deps);
  assert.match(cut.issues[0].text, /the scene before/);
  assert.match(cut.issues[1].text, /this scene/);
  const option = planLeg(leg(end("a", { state: "gap", locationId: null }), end("b", { state: "gap", locationId: null }), { kind: "option" }), deps);
  assert.match(option.issues[0].text, /the start/);
  assert.match(option.issues[1].text, /the end/);
});

test("a scene that is off the map on purpose is not an error; two ends at one place need no walk", () => {
  const off = planLeg(leg(end("west"), end("sky", { state: "offmap", locationId: null, offMapReason: "view-from-above" })), deps);
  assert.equal(off.status, "offmap");
  assert.deepEqual(off.issues, []);
  const same = run("west", "west");
  assert.equal(same.status, "same");
  assert.deepEqual(same.issues, []);
  const sameNew = planLeg(leg(end("n1", { locationId: null, viaRecord: "r1", state: "pending-new" }), end("n2", { locationId: null, viaRecord: "r1", state: "pending-new" })), { ...deps, pointOf: () => ({ x: 5, y: 5 }) });
  assert.equal(sameNew.status, "same", "two slots waiting for the same drawn place are one place");
});

test("a place waiting to be pulled is routed from the point the editor knows it by", () => {
  const fresh = end("n1", { locationId: null, viaRecord: "r9", state: "pending-new", name: "New spot", tier: "point" });
  const r = planLeg(leg(end("west"), fresh), { ...deps, pointOf: (e) => (e.viaRecord === "r9" ? { x: 3900, y: 300 } : POINTS[e.locationId]) });
  assert.equal(r.status, "routed");
  assert.equal(r.to.y, 300);
});

/* ---------------------------------------------------------------- the places themselves */

test("a token stop in the water is an error far out and a warning near the shore, and names how far from land", () => {
  const out = placeIssues(end("bay"), { point: POINTS.bay, landGrid });
  assert.deepEqual(out.map((i) => [i.id, i.severity]), [["water-stop", "error"]]);
  assert.equal(out[0].shore, null, "no land within 400 m of the middle of the bay");
  assert.doesNotMatch(out[0].text, /m from land/);
  const near = placeIssues(end("shore"), { point: POINTS.shore, landGrid });
  assert.deepEqual(near.map((i) => [i.id, i.severity]), [["water-stop", "warn"]]);
  assert.match(near[0].text, /m from land/);
  assert.deepEqual(placeIssues(end("west"), { point: POINTS.west, landGrid }), []);
  assert.deepEqual(placeIssues(end("west"), { point: POINTS.west, landGrid: null }), [], "no coast file, no water claim");
});

test("an area as a stop, an approximate place and a place not yet pulled are each said once, as notes", () => {
  const area = placeIssues(end("d", { tier: "region", name: "The District" }), { point: POINTS.west, landGrid });
  assert.deepEqual(area.map((i) => [i.id, i.severity]), [["area-stop", "info"]]);
  assert.match(area[0].text, /The District is an area: tokens go to its middle/);
  assert.deepEqual(placeIssues(end("p", { state: "approximate" }), { point: POINTS.west }).map((i) => i.id), ["approximate"]);
  assert.deepEqual(placeIssues(end("n", { state: "pending-new", name: "New" }), { point: POINTS.west }).map((i) => i.id), ["pending"]);
  assert.deepEqual(placeIssues(end("o", { offMapReason: "remote" }), { point: null }), [], "a place that is off the map by design is not judged");
});

/* ---------------------------------------------------------------- a whole episode */

test("an episode whose every journey rides the long road is continuous, and its totals add up the main road", () => {
  const { analysis } = analyse(["west", "east", "west"]);
  const [g] = analysis.groups;
  assert.equal(g.verdict, "continuous");
  assert.deepEqual([g.scenes, g.legs, g.routed, g.errors, g.warns, g.unplaced], [3, 2, 2, 0, 0, 0]);
  assert.equal(g.main.legs, 2);
  assert.ok(g.main.metres > 7700);
  assert.equal(g.optionLegs, 0);
  assert.equal(g.metres, g.main.metres, "with no options the whole is the main road");
  assert.deepEqual(analysis.issues, []);
});

test("an episode with a scene no one has placed is broken, and the gap is an error on the leg that cannot be walked", () => {
  const { analysis } = analyse(["west", null, "east"]);
  const [g] = analysis.groups;
  assert.equal(g.verdict, "broken");
  assert.equal(g.unplaced, 1);
  assert.ok(g.errors >= 2, "both legs touching the empty scene are errors");
  assert.ok(analysis.issues.every((i) => i.groupId === "ep"));
  assert.equal(analysis.issues[0].severity, "error", "worst first");
});

test("an episode with only a warning needs attention; one that only has notes is still continuous", () => {
  const warn = analyse(["west", "bay", "east"]);
  assert.equal(warn.analysis.groups[0].verdict, "broken", "a token stop far out to sea is an error, so it is broken");
  const shore = analyse(["west", "shore-2", "west"]);
  assert.ok(shore.analysis.issues.some((i) => i.id === "water-stop" && i.severity === "warn"));
  assert.equal(shore.analysis.groups[0].errors, 0, JSON.stringify(shore.analysis.issues.map((i) => [i.id, i.severity])));
  assert.equal(shore.analysis.groups[0].verdict, "attention");
  const area = analyse(["west", "east", "west"], { locations: { ...locations, east: { ...locations.east, tier: "region" } } });
  assert.ok(area.analysis.issues.every((i) => i.severity === "info"));
  assert.equal(area.analysis.groups[0].verdict, "continuous", "notes never change the verdict");
});

test("issues carry where they are, worst first, and each place is judged once however many legs touch it", () => {
  const { analysis, model } = analyse(["west", "bay", "east"]);
  const stops = analysis.issues.filter((i) => i.id === "water-stop");
  assert.equal(stops.length, 1, "the bay is the end of one leg and the start of the next, and is judged once");
  assert.equal(stops[0].legId, null, "a place issue belongs to a place, not a leg");
  assert.ok(stops[0].slotKey && stops[0].rowKey && stops[0].groupId === "ep");
  const sev = analysis.issues.map((i) => SEVERITY[i.severity]);
  assert.deepEqual(sev, [...sev].sort((a, b) => b - a));
  assert.ok(analysis.legs.get(model.legs[0].id), "every leg has a result");
  assert.equal(analysis.places.size, 3);
});

test("legBadge turns a result into the words a row shows, and the worst thing wrong with it", () => {
  const ok = legBadge(run("west", "east"));
  assert.equal(ok.status, "routed");
  assert.match(ok.distance, /^3\.9 km$/);
  assert.match(ok.time, /^\d+ s$/);
  assert.match(ok.realTime, /min/);
  assert.match(ok.modes, /car 3\.9 km/);
  assert.equal(ok.worst, null);
  const bad = legBadge(run("rail-start", "dry-e"));
  assert.equal(bad.worst, "error");
  assert.equal(legBadge(null).status, "pending");
  assert.equal(legBadge(run("west", "west")).status, "same");
  assert.equal(legBadge(run("west", "mystery")).worst, "error");
});

test("the limits are the ones the explanations quote", () => {
  assert.equal(LIMITS.waterWarnMetres < LIMITS.waterErrorMetres, true);
  assert.equal(LIMITS.walkInfoMetres < LIMITS.walkWarnMetres, true);
  assert.ok(Object.isFrozen(LIMITS) && Object.isFrozen(REAL_SPEED) && Object.isFrozen(SEVERITY));
  assert.ok(REAL_SPEED.walk < REAL_SPEED.bike && REAL_SPEED.bike < REAL_SPEED.car && REAL_SPEED.car < REAL_SPEED.train);
});

test("an issue about the start of a journey belongs to the start's slot and scene, not the end's", () => {
  const { story, model, analysis } = analyse(["west", null, "east"]);
  const rowOf = (n) => story.groups[0].rows[n];
  const first = analysis.issues.find((i) => i.legId === model.legs[0].id);
  assert.equal(first.slotKey, rowOf(1).place.key, "the first leg's missing end is scene Two");
  assert.equal(first.rowKey, rowOf(1).key);
  const second = analysis.issues.find((i) => i.legId === model.legs[1].id && i.side === "from");
  assert.equal(second.slotKey, rowOf(1).place.key, "the second leg's missing START is also scene Two");
  assert.equal(second.rowKey, rowOf(1).key);
});
