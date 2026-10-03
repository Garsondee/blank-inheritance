import { test } from "node:test";
import assert from "node:assert/strict";
import { describeScene } from "../scripts/core/scene.mjs";
import { makeRig } from "../scripts/core/rigspace.mjs";
import { resolveMarks, freeMarks, nearestFree, visibleMarks, markPose, tidy, floorDistance } from "../scripts/core/marks.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const rig = makeRig(scene.painting, scene.rig);
const { marks } = resolveMarks(scene.marks, rig);
const by = (id) => marks.find((m) => m.id === id);
const none = new Map();

test("marks are placed on the floor, and one above the horizon is dropped with a note", () => {
  assert.equal(marks.length, 6);
  const r = resolveMarks([...scene.marks, { id: "sky", at: [0.5, 0.2], yaw: 0, lean: 0, pitch: 0, lift: 0, capacity: 1, label: "", group: "", zone: "", faces: null }], rig);
  assert.equal(r.marks.length, 6);
  assert.deepEqual(r.dropped, ["sky"]);
  for (const m of marks) assert.ok(Number.isFinite(m.X) && Number.isFinite(m.Z), m.id);
});

test("the three marks along the bar run left to right, and the booth is further right still", () => {
  assert.ok(by("bar-1").X < by("bar-2").X && by("bar-2").X < by("bar-3").X);
  assert.ok(by("bar-3").X < by("booth-a").X && by("booth-a").X < by("booth-b").X);
});

test("the nearest free mark within reach, and nothing when none is in reach", () => {
  const b2 = by("bar-2");
  assert.equal(nearestFree(marks, none, b2.X + 20, b2.Z, 170)?.id, "bar-2");
  assert.equal(nearestFree(marks, none, b2.X, b2.Z + 600, 170), null);
  assert.equal(nearestFree(marks, none, b2.X, b2.Z + 600, Infinity) !== null, true, "marks-only sends a stray card to the nearest free one");
});

test("capacity: a taken mark is not offered, a bench with room is", () => {
  const taken = new Map([["bar-2", new Set(["ana"])]]);
  const b2 = by("bar-2");
  assert.notEqual(nearestFree(marks, taken, b2.X, b2.Z, 170)?.id, "bar-2");
  const bench = { ...b2, id: "bench", capacity: 3 };
  assert.equal(freeMarks([bench], new Map([["bench", new Set(["a", "b"])]])).length, 1);
  assert.equal(freeMarks([bench], new Map([["bench", new Set(["a", "b", "c"])]])).length, 0);
});

test("floor distance counts depth for a little less than width", () => {
  const m = { X: 0, Z: 0 };
  assert.ok(floorDistance(100, 0, m) > floorDistance(0, 100, m));
});

test("what is shown while a card is held: at most five, nearest first, the target brightest, the far ones faint", () => {
  const b2 = by("bar-2");
  const v = visibleMarks(marks, none, b2.X + 10, b2.Z, { show: 700, snap: 170, max: 5 });
  assert.ok(v.length <= 5);
  assert.equal(v[0].id, "bar-2");
  assert.equal(v[0].target, true);
  assert.equal(v[0].alpha, 1);
  assert.deepEqual(v.map((r) => r.distance), [...v.map((r) => r.distance)].sort((a, b) => a - b), "nearest first");
  for (const r of v.slice(1)) { assert.equal(r.target, false); assert.ok(r.alpha < 1 && r.alpha >= 0.18, `${r.id} ${r.alpha}`); }
  for (let i = 2; i < v.length; i++) assert.ok(v[i].alpha <= v[i - 1].alpha + 1e-9, "fainter as they get further");
});

test("far from every mark nothing is a target, and a mark beyond the show distance is not drawn", () => {
  const corner = by("corner");
  const v = visibleMarks(marks, none, corner.X, corner.Z + 400, { show: 700, snap: 170, max: 5 });
  assert.ok(v.every((r) => !r.target));
  const far = visibleMarks(marks, none, 0, -2000, { show: 700, snap: 170, max: 5 });
  assert.deepEqual(far, []);
});

test("taken marks are never shown", () => {
  const taken = new Map([["bar-2", new Set(["ana"])]]);
  const b2 = by("bar-2");
  assert.ok(!visibleMarks(marks, taken, b2.X, b2.Z, { show: 700, snap: 170 }).some((r) => r.id === "bar-2"));
});

test("a mark that faces something turns the card to it, cheated out; a plain mark gives its own angle", () => {
  const ctx = { zones: scene.zones, pointOnFloor: (f) => rig.standing(f) };
  const left = markPose(by("bar-1"), ctx);
  const right = markPose(by("bar-3"), ctx);
  assert.ok(left.yaw > 0, `the left of the bar turns right towards the keeper: ${left.yaw}`);
  assert.ok(right.yaw < left.yaw, "and the right of the bar turns less, or the other way");
  assert.ok(Math.abs(left.yaw) <= 52, "cheated out: never turned right away from the audience");
  const booth = markPose(by("booth-a"), ctx);
  assert.deepEqual([booth.yaw, booth.lean], [-34, 6]);
  const toZone = markPose({ ...by("corner"), faces: { zone: "grill" } }, ctx);
  assert.ok(Number.isFinite(toZone.yaw));
  const toCard = markPose({ ...by("corner"), faces: { card: "bo" } }, { cardAt: () => ({ X: 0, Z: -600 }) });
  assert.ok(Number.isFinite(toCard.yaw));
});

test("tidy sends each card to its nearest free mark, nearest pair first, and never doubles up", () => {
  const cards = [
    { id: "a", X: by("bar-1").X + 5, Z: by("bar-1").Z },
    { id: "b", X: by("bar-1").X + 30, Z: by("bar-1").Z },
    { id: "c", X: by("booth-b").X, Z: by("booth-b").Z }
  ];
  const pairs = tidy(marks, cards);
  assert.equal(pairs.length, 3);
  assert.equal(new Set(pairs.map((p) => p.mark)).size, 3, "three cards, three different marks");
  assert.equal(pairs.find((p) => p.card === "c").mark, "booth-b");
  assert.equal(pairs.find((p) => p.card === "a").mark, "bar-1", "a was nearer to bar-1 than b, so a gets it");
  assert.deepEqual(tidy([], cards), [], "no marks, nothing to do");
});
