// Life (core/life.mjs): what people do on their own, worked out from the shared clock alone.

import { test } from "node:test";
import assert from "node:assert/strict";
import { describeScene } from "../scripts/core/scene.mjs";
import { makeRig } from "../scripts/core/rigspace.mjs";
import { resolveMarks } from "../scripts/core/marks.mjs";
import { describeRoutine, prepareRoutine, lifeAt, placeOfBeat, ROUTINES } from "../scripts/core/life.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const rig = makeRig(scene.painting, scene.rig);
const { marks } = resolveMarks(scene.marks, rig);
const home = rig.standing([0.5, 0.88]);
const NOW = 1790995000;                       // the shared clock is seconds since 1970: beat numbers run to the millions

const ready = (raw, seed = 4242) => prepareRoutine(describeRoutine(raw), { home, rig, marks, seed });

test("a routine is understood from what the scene says, and nothing at all costs nothing", () => {
  assert.equal(describeRoutine(null), null);
  assert.equal(describeRoutine({ kind: "still" }), null);
  assert.equal(describeRoutine({ kind: "dance" }), null, "an unknown routine is no routine");
  assert.equal(describeRoutine({ kind: "visit" }), null, "a visit needs somewhere to visit");
  assert.equal(describeRoutine({ kind: "patrol", path: [[0.4, 0.9]] }), null, "a patrol needs two points");
  const w = describeRoutine({ kind: "wander", every: 0.2, restless: 4, gait: "moonwalk" });
  assert.ok(w.every >= 1.5 && w.restless === 1 && w.gait === "stroll", "clamped and defaulted");
  assert.deepEqual(ROUTINES, ["still", "wander", "visit", "patrol", "pace", "swarm"]);
});

test("where a card is depends only on its routine, its seed and the time: two screens agree exactly", () => {
  const a = ready({ kind: "wander", every: 6, radius: 0.08 });
  const b = ready({ kind: "wander", every: 6, radius: 0.08 });
  for (let t = NOW; t < NOW + 60; t += 0.37) assert.deepEqual(lifeAt(a, t), lifeAt(b, t));
});

test("it finishes in the time it has, even on a clock that counts from 1970", () => {
  const r = ready({ kind: "visit", marks: ["bar-1", "booth-a", "corner"], every: 5, restless: 0.1 });
  const started = Date.now();
  for (let t = NOW; t < NOW + 3600; t += 1.3) lifeAt(r, t);
  assert.ok(Date.now() - started < 1500, "an hour of a very idle routine is quick to work out");
});

test("a wanderer stays near home, and moves in walks, not jumps", () => {
  const r = ready({ kind: "wander", every: 4, radius: 0.1, restless: 1 });
  let last = lifeAt(r, NOW);
  let moved = 0;
  for (let t = NOW + 0.02; t < NOW + 120; t += 0.02) {
    const p = lifeAt(r, t);
    assert.ok(Math.hypot(p.X - home.X, p.Z - home.Z) <= r.reach * 0.6 + 1, "never far from home");
    const step = Math.hypot(p.X - last.X, p.Z - last.Z);
    assert.ok(step < 40, `no jumps between frames: ${step}`);
    if (p.moving) moved++;
    last = p;
  }
  assert.ok(moved > 50, "it does get up and move");
});

test("a visitor goes between its places and stands at each", () => {
  const r = ready({ kind: "visit", marks: ["bar-1", "booth-a"], every: 6, restless: 1 });
  const seen = new Set();
  for (let k = 1; k < 200; k++) {
    const p = placeOfBeat(r, NOW / 6 + k);
    seen.add(r.places.findIndex((q) => Math.abs(q.X - p.X) < 1e-6 && Math.abs(q.Z - p.Z) < 1e-6));
  }
  assert.deepEqual([...seen].sort(), [0, 1, 2], "home, and both marks");
});

test("a patrol walks its path in order, there and back", () => {
  const r = ready({ kind: "patrol", path: [[0.3, 0.9], [0.5, 0.9], [0.7, 0.9]], every: 5 });
  const at = (k) => r.places.findIndex((q) => { const p = placeOfBeat(r, k); return Math.abs(q.X - p.X) < 1e-6; });
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(at), [1, 2, 1, 0, 1, 2]);
  const loop = ready({ kind: "patrol", path: [[0.3, 0.9], [0.5, 0.9], [0.7, 0.9]], every: 5, loop: true });
  const atLoop = (k) => loop.places.findIndex((q) => { const p = placeOfBeat(loop, k); return Math.abs(q.X - p.X) < 1e-6; });
  assert.deepEqual([1, 2, 3, 4].map(atLoop), [1, 2, 0, 1]);
});

test("a pacer goes back and forth across its spot, and a swarm never keeps still for long", () => {
  const pacer = ready({ kind: "pace", width: 0.1, every: 3, restless: 1 });
  const xs = [1, 2, 3, 4].map((k) => placeOfBeat(pacer, Math.floor(NOW / 3) + k).X - home.X);
  assert.ok(xs.every((x, i) => i === 0 || Math.sign(x) !== Math.sign(xs[i - 1])), `it turns at each end: ${xs}`);
  const swarm = ready({ kind: "swarm", every: 2, restless: 1 });
  let moving = 0;
  for (let t = NOW; t < NOW + 30; t += 0.05) if (lifeAt(swarm, t).moving) moving++;
  assert.ok(moving > 60, "it scurries often");
});

test("a routine that faces something looks at it when it stands still", () => {
  const r = ready({ kind: "wander", every: 8, restless: 0.5, faces: [0.548, 0.782] });
  for (let t = NOW; t < NOW + 40; t += 0.5) {
    const p = lifeAt(r, t);
    if (!p.moving) assert.ok(Number.isFinite(p.yaw), "standing, it faces the point");
  }
});
