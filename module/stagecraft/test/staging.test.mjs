// Staging by hand (core/staging.mjs, foundry/blocking.mjs#editStage): marks and zone corners moved, added and taken away.

import { test } from "node:test";
import assert from "node:assert/strict";
import { keepPoint, moveMark, moveVertex, moveZone, addVertex, removeVertex, centroid, handlesOf, idOf } from "../scripts/core/staging.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const marks = [{ id: "a", at: [0.5, 0.9], label: "A" }, { at: [0.2, 0.3] }];
const zones = [{ id: "wall", kind: "chalk", shape: [[0.2, 0.2], [0.6, 0.2], [0.6, 0.4], [0.2, 0.4]], floor: [[0.2, 0.7], [0.6, 0.7], [0.6, 0.8]] }, { shape: [[0.7, 0.5], [0.9, 0.5], [0.8, 0.7]] }];

test("keepPoint keeps a point inside the painting, to three places", () => {
  assert.deepEqual(keepPoint([0.12345, 0.98765]), [0.123, 0.988]);
  assert.deepEqual(keepPoint([-1, 2]), [0, 1]);
  assert.equal(keepPoint([NaN, 1]), null);
  assert.equal(keepPoint("no"), null);
});

test("a mark moves, by its id (written, or numbered by its place), and nothing is made new when it did not", () => {
  const moved = moveMark(marks, "a", [0.6, 0.85]);
  assert.deepEqual(moved[0], { id: "a", at: [0.6, 0.85], label: "A" }, "the rest of the mark stays");
  assert.equal(marks[0].at[0], 0.5, "the original is not changed");
  assert.deepEqual(moveMark(marks, "mark-2", [0.25, 0.3])[1].at, [0.25, 0.3], "an unnamed mark is numbered by its place");
  assert.equal(moveMark(marks, "a", [0.5004, 0.9]), marks, "the same point to three places: the very same array");
  assert.equal(moveMark(marks, "nobody", [0.1, 0.1]), marks);
  assert.equal(moveMark(marks, "a", null), marks);
  assert.equal(idOf({ id: "x" }, 4, "mark"), "x");
  assert.equal(idOf({}, 4, "zone"), "zone-5");
});

test("a corner of a zone moves and the zone's other corners stay", () => {
  const moved = moveVertex(zones, "wall", 2, [0.65, 0.45]);
  assert.deepEqual(moved[0].shape, [[0.2, 0.2], [0.6, 0.2], [0.65, 0.45], [0.2, 0.4]]);
  assert.deepEqual(moved[0].floor, zones[0].floor);
  assert.equal(moveVertex(zones, "wall", 9, [0.1, 0.1]), zones, "no such corner");
  assert.equal(moveVertex(zones, "wall", 2, [0.6, 0.4]), zones, "where it already is");
  assert.deepEqual(moveVertex(zones, "zone-2", 0, [0.75, 0.5])[1].shape[0], [0.75, 0.5]);
});

test("a whole zone moves with its floor outline, and is cut short at the painting's edge instead of leaving it", () => {
  const moved = moveZone(zones, "wall", 0.1, -0.05);
  assert.deepEqual(moved[0].shape[0], [0.3, 0.15]);
  assert.deepEqual(moved[0].floor[0], [0.3, 0.65], "the floor outline goes with it");
  const edge = moveZone(zones, "wall", 5, 5);
  const xs = edge[0].shape.map((p) => p[0]);
  const ys = [...edge[0].shape, ...edge[0].floor].map((p) => p[1]);
  assert.ok(Math.max(...xs) <= 1 && Math.max(...ys) <= 1, "stays inside");
  assert.equal(Math.max(...xs), 1, "as far as it can go");
  assert.equal(moveZone(zones, "wall", 0.0001, 0), zones, "a nudge too small to matter");
  assert.equal(moveZone(zones, "wall", NaN, 0), zones);
});

test("a corner is added half way along an edge, or at a point, and taken away; a zone keeps three", () => {
  const added = addVertex(zones, "zone-2", 0);
  assert.equal(added[1].shape.length, 4);
  assert.deepEqual(added[1].shape[1], [0.8, 0.5], "half way between the first two");
  assert.deepEqual(addVertex(zones, "zone-2", 2, [0.5, 0.6])[1].shape[3], [0.5, 0.6], "after the last: between it and the first, at the given point");
  assert.equal(addVertex(zones, "zone-2", 7), zones);
  const four = removeVertex(zones, "wall", 1);
  assert.equal(four[0].shape.length, 3);
  assert.equal(removeVertex(four, "wall", 0), four, "three corners are the least");
  assert.equal(removeVertex(zones, "zone-2", 0), zones, "already three");
});

test("handles: a ring per mark, a square per corner, a dot in the middle of each zone", () => {
  const scene = describeScene({ ...RAW_SCENE, marks: [{ id: "m1", at: [0.4, 0.8] }], zones: [{ id: "z1", kind: "area", shape: [[0.1, 0.1], [0.3, 0.1], [0.2, 0.3]] }] }).scene;
  const h = handlesOf(scene);
  assert.equal(h.filter((x) => x.kind === "mark").length, scene.marks.length);
  assert.equal(h.filter((x) => x.kind === "vertex" && x.id === "z1").length, 3);
  const mid = h.find((x) => x.kind === "zone" && x.id === "z1");
  assert.ok(Math.abs(mid.at[0] - 0.2) < 1e-9 && Math.abs(mid.at[1] - 0.1667) < 1e-3);
  assert.deepEqual(centroid([]), null);
});

test("editStage writes the raw description once, says so with a hook, and a GM only", async () => {
  const { installFoundry } = await import("./fake-foundry.mjs");
  const world = installFoundry({ user: { id: "gm", name: "GM", isGM: true } });
  const { editStage } = await import("../scripts/foundry/blocking.mjs");
  const heard = [];
  world.hooks.on?.("stagecraft.keepStage", (e) => heard.push(e));
  const writes = [];
  const scene = { id: "s1", flags: { stagecraft: { stage: { marks, zones } } }, async update(d) { writes.push(d); for (const [k, v] of Object.entries(d)) { const path = k.split("."); let o = this; while (path.length > 1) o = o[path.shift()] ??= {}; o[path[0]] = v; } } };
  assert.equal(await editStage(scene, { mark: { id: "a", at: [0.62, 0.9] } }), true);
  assert.deepEqual(scene.flags.stagecraft.stage.marks[0].at, [0.62, 0.9]);
  assert.deepEqual(Object.keys(writes[0]), ["flags.stagecraft.stage.marks"], "only the marks are written");
  assert.equal(await editStage(scene, { mark: { id: "a", at: [0.62, 0.9] } }), false, "no change: nothing written");
  assert.equal(await editStage(scene, { vertex: { id: "wall", index: 0, at: [0.25, 0.25] } }), true);
  assert.equal(await editStage(scene, { addVertex: { id: "zone-2", after: 1 } }), true);
  assert.equal(scene.flags.stagecraft.stage.zones[1].shape.length, 4);
  assert.equal(await editStage(scene, { removeVertex: { id: "zone-2", index: 0 } }), true);
  assert.equal(await editStage(scene, { zone: { id: "wall", dx: 0.05, dy: 0 } }), true);
  assert.equal(await editStage(scene, {}), false);
  assert.equal(await editStage(scene, null), false);
  assert.equal(heard.length, 5);
  assert.deepEqual(heard[0].marks, [{ id: "a", at: [0.62, 0.9] }, { id: "mark-2", at: [0.2, 0.3] }], "the hook says what every mark is now");
  assert.ok(heard[0].zones.some((z) => z.id === "wall" && z.floor), "and every zone, with its floor outline");
  world.user.isGM = false;
  assert.equal(await editStage(scene, { mark: { id: "a", at: [0.1, 0.1] } }), false, "a player cannot");
});