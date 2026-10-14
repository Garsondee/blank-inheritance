// Tier 1 -- playing a journey back (core/journey-timeline.mjs): the game's own hops as a timeline a scrubber can be dragged along.
//
// The claim the Journeys tab makes when it animates a route is "this is what the tokens will do". These tests hold that to the game's own plan: the token is where
// foundry/travel.mjs `animateTokenAlongHops` puts it at the same moment (each hop one straight glide of its planned duration), the legs the game plays together are
// played together, and nothing is invented between them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSteps, buildTimeline, CUT_LEAD_SECONDS, DWELL_MS, legMotion, mainRoadSteps, motionAt, pointOnPath, SPEEDS, stepIndexAt, stepOfLeg, timelineAt, timeOfStep, travelledPoints } from "../module/blank-inheritance/scripts/core/journey-timeline.mjs";
import { totalDurationMs } from "../module/blank-inheritance/scripts/core/travel-speed.mjs";
import { pointAtDistance, polylineLength } from "../module/blank-inheritance/scripts/core/journey-draw.mjs";
import { buildStory } from "../module/blank-inheritance/scripts/core/siting.mjs";
import { buildJourneyModel } from "../module/blank-inheritance/scripts/core/journey.mjs";
import { analyseDeparture, locations, run } from "./support/journey-fixture-world.mjs";

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test("a leg's motion is its hop plan: contiguous hops from where the token starts, the game's own durations, and the path they make", () => {
  const result = run("west", "east");
  const motion = legMotion(result);
  assert.deepEqual(motion.points[0], result.from);
  assert.deepEqual(motion.points[motion.points.length - 1], result.hops[result.hops.length - 1].to);
  assert.equal(motion.hops.length, result.hops.length);
  assert.equal(motion.totalMs, totalDurationMs(result.hops));
  motion.hops.forEach((hop, i) => {
    assert.equal(hop.mode, result.hops[i].mode);
    assert.equal(hop.endMs - hop.startMs, result.hops[i].durationMs);
    if (i) assert.equal(hop.startMs, motion.hops[i - 1].endMs, "each hop begins when the last ends");
  });
  assert.ok(near(motion.totalPx, polylineLength(motion.points)));
});

test("a leg with nothing to watch has no motion: not routed, at one place, off the map, or no hops", () => {
  assert.equal(legMotion(run("west", "west")), null);
  assert.equal(legMotion(run("west", "mystery")), null);
  assert.equal(legMotion(null), null);
  assert.equal(legMotion({ status: "routed", from: { x: 0, y: 0 }, hops: [] }), null);
});

test("the token is at the start at 0, at the end when done, and part way along a hop at a steady pace in between", () => {
  const motion = legMotion(run("west", "east"));
  const start = motionAt(motion, 0);
  assert.deepEqual([start.x, start.y, start.done], [motion.points[0].x, motion.points[0].y, false]);
  const end = motionAt(motion, motion.totalMs);
  assert.deepEqual([end.x, end.y, end.done], [motion.points[motion.points.length - 1].x, motion.points[motion.points.length - 1].y, true]);
  assert.ok(near(end.distance, motion.totalPx));
  const hop = motion.hops[4];
  const mid = motionAt(motion, (hop.startMs + hop.endMs) / 2);
  assert.ok(near(mid.x, (hop.from.x + hop.to.x) / 2) && near(mid.y, (hop.from.y + hop.to.y) / 2), "halfway through a hop is halfway along it");
  assert.equal(mid.hopIndex, 4);
  assert.equal(mid.mode, hop.mode);
  assert.ok(near(mid.distance, hop.startPx + hop.length / 2));
  assert.deepEqual(motionAt(motion, -50), motionAt(motion, 0), "before the start is the start");
  assert.deepEqual(motionAt(motion, motion.totalMs + 9999), motionAt(motion, motion.totalMs), "after the end is the end");
});

test("distance travelled never goes backwards as time runs forward, and the walk, the ride and the walk come in that order", () => {
  const motion = legMotion(run("west", "east"));
  let last = -1;
  const modes = [];
  for (let t = 0; t <= motion.totalMs; t += motion.totalMs / 200) {
    const s = motionAt(motion, t);
    assert.ok(s.distance >= last - 1e-9, `distance went back at ${t}`);
    last = s.distance;
    if (modes[modes.length - 1] !== s.mode) modes.push(s.mode);
  }
  assert.deepEqual(modes, ["walk", "car", "walk"]);
});

test("the part already travelled ends exactly at the token, and is as long as the distance covered", () => {
  const motion = legMotion(run("west", "east"));
  for (const f of [0.1, 0.33, 0.5, 0.9, 1]) {
    const s = motionAt(motion, motion.totalMs * f);
    const trail = travelledPoints(motion, s);
    assert.ok(near(trail[trail.length - 1].x, s.x, 1e-6) && near(trail[trail.length - 1].y, s.y, 1e-6), `at ${f}`);
    assert.ok(near(polylineLength(trail), s.distance, 1e-6), `at ${f}`);
  }
  const half = pointOnPath(motion, 0.5);
  const expected = pointAtDistance(motion.points, motion.totalPx / 2);
  assert.ok(near(half.x, expected.x) && near(half.y, expected.y), "a marker half way along the path, whatever the clock says");
  assert.deepEqual([pointOnPath(motion, -1).x, pointOnPath(motion, 2).x], [motion.points[0].x, motion.points[motion.points.length - 1].x]);
});

/* ---------------------------------------------------------------- steps */

test("the steps of an episode: a cut is its own, the options of a departure play together, then the legs that gather them", () => {
  const { model } = analyseDeparture();
  const steps = buildSteps(model, "ep");
  assert.deepEqual(steps.map((s) => s.kind), ["cut", "option", "then"]);
  assert.deepEqual(steps.map((s) => s.legIds.length), [1, 2, 2]);
  assert.equal(steps[0].title, "One → Two");
  assert.equal(steps[1].title, "Two: the players choose");
  assert.equal(steps[1].detail, "2 ways to go");
  assert.equal(steps[2].title, "Muster: they gather");
  assert.equal(steps[2].detail, "2 journeys");
  assert.deepEqual(steps.map((s) => s.groupId), ["ep", "ep", "ep"]);
  assert.ok(new Set(steps.map((s) => s.id)).size === steps.length, "step ids are unique");
  assert.deepEqual(buildSteps(model, "nope"), []);
  assert.equal(buildSteps(model).length, steps.length, "no id means every episode");
});

test("the main road is the cuts alone; a leg is found in its step", () => {
  const { model } = analyseDeparture();
  const steps = buildSteps(model, "ep");
  assert.deepEqual(mainRoadSteps(steps).map((s) => s.kind), ["cut"]);
  const optionLeg = steps[1].legIds[1];
  assert.equal(stepOfLeg(steps, optionLeg), steps[1]);
  assert.equal(stepOfLeg(steps, "leg:nothing"), null);
});

test("an arrival step names where they gather and how many ways in", () => {
  const { docs } = analyseDeparture();
  docs.briefs.b1 = { id: "b1", outro: { departure: { kind: "arrive", question: "How do you arrive?", destinations: [
    { id: "t", mode: "train", label: "By train", placeRef: "dry-w" }, { id: "f", mode: "ferry", label: "By ferry", placeRef: "near" }
  ], then: { kind: "muster", placeRef: "west", briefRef: "b2", label: "The Gate" } } } };
  const model = buildJourneyModel(buildStory(docs, { locations }));
  const arrival = buildSteps(model, "ep").find((s) => s.kind === "arrival");
  assert.equal(arrival.title, "The Gate: arrivals");
  assert.equal(arrival.detail, "2 ways in");
});

/* ---------------------------------------------------------------- the timeline */

test("a timeline lays the steps end to end, each as long as its longest leg plus a pause, and leaves out a step with nothing to watch", () => {
  const { model, analysis } = analyseDeparture();
  const steps = buildSteps(model, "ep");
  const timeline = buildTimeline(steps, analysis);
  // west -> east, the two option legs out of the east, the two `then` legs back to the west: every step has something to watch here
  assert.equal(timeline.steps.length, 3);
  let at = 0;
  for (const s of timeline.steps) {
    assert.equal(s.startMs, at);
    assert.equal(s.dwellMs, DWELL_MS);
    assert.equal(s.travelMs, Math.max(...s.legs.map((l) => l.motion.totalMs)), "the longest leg sets the time: the others wait for it");
    assert.equal(s.endMs, s.startMs + s.travelMs + s.dwellMs);
    assert.ok(s.realMinutes > 0);
    at = s.endMs;
  }
  assert.equal(timeline.totalMs, at);
  assert.deepEqual(timeline.steps.map((s) => s.index), [0, 1, 2]);

  // a step whose every leg is at one place is skipped: put the two scenes at the same place
  const same = analyseDeparture(["west", "west", "west"]);
  const sameTimeline = buildTimeline(buildSteps(same.model, "ep"), same.analysis);
  assert.ok(!sameTimeline.steps.some((s) => s.step.kind === "cut"), "no walk to watch between two scenes at one place");
});

test("legs of one step move together; the shorter one has arrived while the longer is still on its way", () => {
  const { model, analysis } = analyseDeparture();
  const timeline = buildTimeline(buildSteps(model, "ep"), analysis);
  const options = timeline.steps[1];
  assert.equal(options.legs.length, 2);
  const [a, b] = options.legs.map((l) => l.motion.totalMs);
  assert.notEqual(a, b, "the two options are different distances");
  const mid = (Math.min(a, b) + Math.max(a, b)) / 2;
  const state = timelineAt(timeline, options.startMs + mid);
  assert.equal(state.stepIndex, 1);
  assert.equal(state.phase, "travel");
  assert.equal(state.tokens.length, 2);
  const done = state.tokens.filter((t) => t.done);
  assert.equal(done.length, 1, "exactly the shorter one has arrived");
});

test("timelineAt says which step, whether it is travelling or pausing, and where every token is", () => {
  const { model, analysis } = analyseDeparture();
  const timeline = buildTimeline(buildSteps(model, "ep"), analysis);
  const first = timeline.steps[0];
  const start = timelineAt(timeline, 0);
  assert.equal(start.stepIndex, 0);
  assert.equal(start.phase, "travel");
  assert.equal(start.finished, false);
  assert.deepEqual([start.tokens[0].x, start.tokens[0].y], [first.legs[0].motion.points[0].x, first.legs[0].motion.points[0].y]);
  const pause = timelineAt(timeline, first.startMs + first.travelMs + 1);
  assert.equal(pause.stepIndex, 0);
  assert.equal(pause.phase, "dwell");
  assert.equal(pause.tokens[0].done, true, "paused at the destination");
  const second = timelineAt(timeline, timeline.steps[1].startMs);
  assert.equal(second.stepIndex, 1);
  const end = timelineAt(timeline, timeline.totalMs + 5000);
  assert.equal(end.finished, true);
  assert.equal(end.stepIndex, timeline.steps.length - 1, "the last step, still at its destination");
  assert.ok(end.tokens.every((t) => t.done));
  assert.equal(timelineAt({ steps: [], totalMs: 0 }, 10), null);
});

test("the skip buttons find a step's start; a time finds the step it is in", () => {
  const { model, analysis } = analyseDeparture();
  const timeline = buildTimeline(buildSteps(model, "ep"), analysis);
  timeline.steps.forEach((s, i) => {
    assert.equal(timeOfStep(timeline, i), s.startMs);
    assert.equal(stepIndexAt(timeline, s.startMs), i);
    assert.equal(stepIndexAt(timeline, s.endMs - 1), i);
  });
  assert.equal(timeOfStep(timeline, 99), timeline.steps[2].startMs, "past the end is the last step");
  assert.equal(timeOfStep(timeline, -3), 0);
  assert.equal(stepIndexAt({ steps: [], totalMs: 0 }, 0), -1);
});

test("a timeline of one leg plays just that leg", () => {
  const { model, analysis } = analyseDeparture();
  const onlyCut = buildSteps(model, "ep")[0];
  const timeline = buildTimeline([onlyCut], analysis, { dwellMs: 0 });
  assert.equal(timeline.steps.length, 1);
  assert.equal(timeline.totalMs, timeline.steps[0].travelMs);
  assert.equal(timelineAt(timeline, timeline.totalMs).finished, true);
});

test("the speeds offered include real time and are in order; a scene cut also costs the table its fade, which is reported and never played", () => {
  assert.ok(SPEEDS.includes(1));
  assert.deepEqual([...SPEEDS], [...SPEEDS].sort((a, b) => a - b));
  assert.equal(CUT_LEAD_SECONDS, 10);
});
