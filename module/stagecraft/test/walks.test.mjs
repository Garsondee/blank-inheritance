// Walks (core/walks.mjs): a card sent somewhere steps there, the same way on every screen.

import { test } from "node:test";
import assert from "node:assert/strict";
import { GAITS, GAIT_NAMES, planWalk, walkAt, pace, walking, entrancePoint, floorDistance } from "../scripts/core/walks.mjs";

const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} is not within ${eps} of ${b}`);

test("the pace covers the whole way: still at the start, there at the end, even in the middle", () => {
  assert.equal(pace(0), 0);
  assert.equal(pace(1), 1);
  near(pace(0.5), 0.5, 1e-9, "half way in time is half way along");
  let last = 0;
  for (let u = 0.01; u <= 1; u += 0.01) { const p = pace(u); assert.ok(p >= last - 1e-12, "never goes backwards"); last = p; }
  const mid = (pace(0.55) - pace(0.45)) / 0.1;
  const start = (pace(0.02) - pace(0)) / 0.02;
  assert.ok(start < mid / 3, "it sets off gently");
});

test("a walk starts where it starts, ends where it ends, and takes as long as its gait says", () => {
  const w = planWalk({ X: -400, Z: -600 }, { X: 400, Z: -600 }, { t0: 10, gait: "walk", yaw: -20 });
  assert.equal(w.gait, "walk");
  near(w.dur, 800 / GAITS.walk.speed, 1e-9, "duration");
  assert.ok(w.steps >= 6, "it takes steps");
  const before = walkAt(w, 9);
  assert.deepEqual([before.X, before.Z, before.moving, before.done], [-400, -600, false, false]);
  assert.equal(before.yaw, null, "before it sets off it keeps its own facing");
  const after = walkAt(w, 10 + w.dur + 0.01);
  assert.deepEqual([after.X, after.Z, after.done, after.lift, after.rock], [400, -600, true, 0, 0]);
  assert.equal(after.yaw, -20, "on arrival it turns the way it should stand");
});

test("on the way it looks where it is going, cheated out to the table, and bobs with each step", () => {
  const w = planWalk({ X: -600, Z: -500 }, { X: 600, Z: -500 }, { t0: 0, gait: "walk", yaw: 0 });
  const mid = walkAt(w, w.dur * 0.4);
  assert.ok(mid.moving);
  assert.ok(mid.yaw > 20 && mid.yaw <= 40, `walking right it turns right but keeps its face: ${mid.yaw}`);
  let maxLift = 0;
  for (let t = 0; t < w.dur; t += 0.01) maxLift = Math.max(maxLift, walkAt(w, t).lift);
  assert.ok(maxLift > GAITS.walk.height * 0.8 && maxLift <= GAITS.walk.height + 1e-9, `a step lifts it: ${maxLift}`);
  const glide = planWalk({ X: 0, Z: 0 }, { X: 500, Z: 0 }, { gait: "glide" });
  for (let t = 0; t < glide.dur; t += 0.05) assert.equal(walkAt(glide, t).lift, 0, "a glide never bobs");
});

test("the same walk at the same moment is the same on every screen", () => {
  const a = planWalk({ X: 10, Z: -300 }, { X: -700, Z: -900 }, { t0: 1790000000.25, gait: "hurry" });
  const b = planWalk({ X: 10, Z: -300 }, { X: -700, Z: -900 }, { t0: 1790000000.25, gait: "hurry" });
  for (const dt of [0, 0.1, 0.33, 0.9]) assert.deepEqual(walkAt(a, a.t0 + dt), walkAt(b, b.t0 + dt));
});

test("a step too short is a shuffle, an unknown gait is a walk, and a long walk is capped", () => {
  const short = planWalk({ X: 0, Z: 0 }, { X: 20, Z: 0 });
  assert.equal(short.steps, 0);
  assert.ok(short.dur >= 0.3);
  assert.equal(planWalk({ X: 0, Z: 0 }, { X: 100, Z: 0 }, { gait: "moonwalk" }).gait, "walk");
  assert.equal(planWalk({ X: -5000, Z: 0 }, { X: 5000, Z: 0 }, { gait: "sneak" }).dur, 6);
  assert.ok(walking(short, short.t0 + 0.1));
  assert.ok(!walking(short, short.t0 + short.dur + 0.01));
  assert.ok(!walking(null, 0));
});

test("every gait is a real one, and depth counts for a little less than width", () => {
  assert.deepEqual(GAIT_NAMES, Object.keys(GAITS));
  for (const g of Object.values(GAITS)) assert.ok(g.speed > 0 && g.turn >= 0 && g.turn <= 1);
  assert.ok(floorDistance({ X: 0, Z: 0 }, { X: 0, Z: 100 }) < floorDistance({ X: 0, Z: 0 }, { X: 100, Z: 0 }));
});

test("a card walking on comes from off the side of the stage, at its own depth", () => {
  const limits = { x: [-1800, 1800], z: [-2300, 260] };
  assert.deepEqual(entrancePoint("left", { X: 100, Z: -700 }, limits), { X: -1960, Z: -700 });
  assert.deepEqual(entrancePoint("right", { X: 100, Z: -700 }, limits), { X: 1960, Z: -700 });
  assert.equal(entrancePoint("back", { X: 100, Z: -700 }, limits).Z, -2300);
});
