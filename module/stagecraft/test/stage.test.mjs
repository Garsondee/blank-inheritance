import { test } from "node:test";
import assert from "node:assert/strict";
import { Stage, STEP, createStage } from "../scripts/core/stage.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { FEEL } from "../scripts/core/puppets.mjs";
import { RAW_SCENE, PEOPLE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const fresh = (people = PEOPLE, overrides = {}) => new Stage({ ...scene, ...overrides }, people);
const run = (stage, seconds) => { for (let i = 0; i < Math.round(seconds / STEP); i++) stage.step(STEP); };
const near = (a, b, tol, what = "") => assert.ok(Math.abs(a - b) <= tol, `${what} ${a} is not within ${tol} of ${b}`);
const card = (stage, id) => stage.cards.get(id);
const mark = (stage, id) => stage.marks.find((m) => m.id === id);

/** Move a held card's hand to a place at a steady speed (px per second), one step at a time. */
function drag(stage, id, toX, speed = 800, toZ = null) {
  const c = card(stage, id);
  const z0 = c.hand.z;
  const x0 = c.hand.x;
  const n = Math.max(1, Math.round(Math.abs(toX - x0) / speed / STEP));
  for (let i = 1; i <= n; i++) {
    stage.setHand(id, { x: x0 + ((toX - x0) * i) / n, z: toZ === null ? z0 : z0 + ((toZ - z0) * i) / n });
    stage.step(STEP);
  }
}

test("a card named by a point on the painting stands where the rig puts that point on the floor", () => {
  const s = fresh();
  const here = s.rig.standing([0.355, 0.895]);
  near(card(s, "bo").puppet.x, here.X, 1e-9, "x");
  near(card(s, "bo").Z, here.Z, 1e-9, "z");
  assert.equal(s.cards.size, 5);
});

test("a card that names a mark starts on it, in its pose, and the mark is taken", () => {
  const s = fresh([{ id: "ana", name: "Ana", mark: "booth-a" }]);
  const c = card(s, "ana");
  near(c.puppet.x, mark(s, "booth-a").X, 1e-9);
  assert.equal(c.mark, "booth-a");
  near(c.yaw, -34, 1e-9);
  assert.equal(s.resting.get("booth-a").has("ana"), true);
});

test("only one hand holds a card; the same hand holding again is fine; another hand is refused", () => {
  const s = fresh();
  assert.equal(s.hold("di", "u1"), true);
  assert.equal(s.hold("di", "u2"), false);
  assert.equal(s.hold("di", "u1"), true);
  assert.equal(s.hold("nobody", "u1"), false);
  assert.equal(s.release("di").by, "u1");
  assert.equal(s.hold("di", "u2"), true, "free again once let go");
});

test("a held card follows the hand a little behind, leans away from the way it goes, and the stick comes out", () => {
  const s = fresh();
  s.hold("di", "u1");
  const x0 = card(s, "di").puppet.x;
  drag(s, "di", x0 + 600, 1500);
  const c = card(s, "di");
  assert.ok(c.puppet.lean < -2, `leaning back while it is swung right: ${c.puppet.lean}`);
  assert.ok(c.grip > 0.9, `the stick is out: ${c.grip}`);
  run(s, 1.5);
  near(c.puppet.x, x0 + 600, 1, "caught up with the hand");
  assert.ok(Math.abs(c.puppet.lean) < 0.5, "and settled");
  const snap = s.snapshot().cards.find((k) => k.id === "di");
  assert.ok(snap.lift >= 60, `lifted off the floor: ${snap.lift}`);
  assert.equal(snap.held, true);
});

test("the lean the engine produces is the lean feel.md promises: 1,500 px/s then a stop is 5.7 degrees", () => {
  const s = fresh([{ id: "solo", name: "Solo", X: 0, Z: -400, demeanour: "calm" }]);
  s.hold("solo", "u1");
  const c = card(s, "solo");
  let peak = 0;
  for (let i = 0; i < Math.round(0.4 / STEP); i++) { s.setHand("solo", { x: c.hand.x + 1500 * STEP, z: -400 }); s.step(STEP); peak = Math.max(peak, Math.abs(c.puppet.lean)); }
  for (let i = 0; i < Math.round(3 / STEP); i++) { s.step(STEP); peak = Math.max(peak, Math.abs(c.puppet.lean)); }
  near(peak, 5.7, 0.1, "peak lean");
});

test("a held card that meets another bonks it once, however long they stay overlapped", () => {
  const s = fresh();
  s.hold("di", "u1");
  drag(s, "di", card(s, "ed").puppet.x - 40, 1500);
  run(s, 1);
  const bonks = s.drain().filter((e) => e.type === "bonk");
  assert.equal(bonks.length, 1);
  assert.deepEqual([bonks[0].a, bonks[0].b].sort(), ["di", "ed"]);
  assert.ok(bonks[0].speed > FEEL.bonkSpeed);
  const ed = card(s, "ed");
  assert.ok(Math.abs(ed.puppet.jx) < 0.5, "the knocked card has sprung back");
  assert.equal(ed.puppet.restX, ed.puppet.x, "and a bonk never moved where it stands");
});

test("pull away and hit it again, and that is a second bonk", () => {
  const s = fresh();
  s.hold("di", "u1");
  const ed = card(s, "ed");
  drag(s, "di", ed.puppet.x - 40, 1500);
  run(s, 0.6);
  drag(s, "di", ed.puppet.x - 500, 1500);
  run(s, 0.6);
  drag(s, "di", ed.puppet.x - 40, 1500);
  run(s, 0.3);
  assert.equal(s.drain().filter((e) => e.type === "bonk").length, 2);
});

test("slowly into another card is no bonk; two cards nobody holds never bump", () => {
  const s = fresh();
  s.hold("di", "u1");
  drag(s, "di", card(s, "ed").puppet.x - 40, FEEL.bonkSpeed * 0.5);
  assert.equal(s.drain().filter((e) => e.type === "bonk").length, 0);
  const t = fresh([{ id: "a", name: "A", X: 0, Z: -400 }, { id: "b", name: "B", X: 50, Z: -400 }]);
  run(t, 1);
  assert.deepEqual(t.drain().filter((e) => e.type === "bonk"), []);
});

test("cards in different lanes do not bump: the held one passes behind or in front", () => {
  const s = fresh([{ id: "a", name: "A", X: -200, Z: -300 }, { id: "b", name: "B", X: 200, Z: -900 }]);
  s.hold("a", "u1");
  s.setHand("a", { x: -200, z: -300 });
  drag(s, "a", 260, 1500);
  run(s, 0.5);
  assert.deepEqual(s.drain().filter((e) => e.type === "bonk"), []);
});

test("passing in front is a step in depth: the held card moves forward while it overlaps another and eases back after", () => {
  const s = fresh();
  s.hold("di", "u1");
  const ed = card(s, "ed");
  drag(s, "di", ed.puppet.x - 40, 1500);
  run(s, 0.5);
  const di = card(s, "di");
  assert.ok(di.zOff > 60, `stepped forward: ${di.zOff}`);
  drag(s, "di", 800, 1500);                                       // back into the open stretch of bar
  run(s, 1);
  assert.ok(di.zOff < 5, `eased back: ${di.zOff}`);
});

test("letting go within reach of a free mark sends the card to it and turns it to the mark's angle", () => {
  const s = fresh([{ id: "ana", name: "Ana", X: 0, Z: -400 }]);
  const b = mark(s, "booth-a");
  s.hold("ana", "u1");
  s.setHand("ana", { x: b.X + 60, z: b.Z });
  run(s, 0.8);
  const result = s.release("ana");
  assert.equal(result.mark, "booth-a");
  run(s, 1.2);
  const c = card(s, "ana");
  near(c.puppet.x, b.X, 1, "x");
  near(c.Z, b.Z, 1, "z");
  near(c.yaw, -34, 0.5, "yaw");
  near(c.lean, 6, 0.5, "lean");
  assert.ok(s.drain().some((e) => e.type === "mark" && e.mark === "booth-a"));
  assert.equal(s.resting.get("booth-a").has("ana"), true);
});

test("letting go far from every mark leaves the card where it was dropped", () => {
  const s = fresh([{ id: "ana", name: "Ana", X: 0, Z: -400 }]);
  s.hold("ana", "u1");
  s.setHand("ana", { x: -900, z: -1500 });
  run(s, 1);
  const r = s.release("ana");
  assert.equal(r.mark, null);
  run(s, 1);
  near(card(s, "ana").puppet.x, -900, 2);
  near(card(s, "ana").Z, -1500, 2);
  assert.equal(card(s, "ana").mark, null);
});

test("in a marks-only scene a card dropped away from a mark goes to the nearest free one", () => {
  const s = fresh([{ id: "ana", name: "Ana", X: 0, Z: -400 }], { marksOnly: true });
  s.hold("ana", "u1");
  s.setHand("ana", { x: -900, z: -1500 });
  run(s, 1);
  const r = s.release("ana");
  assert.notEqual(r.mark, null);
  run(s, 2);
  const m = mark(s, r.mark);
  near(card(s, "ana").puppet.x, m.X, 1);
});

test("picking a card up frees its mark again, and a mark with room for one takes one card", () => {
  const s = fresh([{ id: "ana", name: "Ana", mark: "corner" }, { id: "bo", name: "Bo", X: -300, Z: -500 }]);
  const corner = mark(s, "corner");
  s.hold("bo", "u2");
  s.setHand("bo", { x: corner.X, z: corner.Z });
  run(s, 0.4);
  assert.notEqual(s.release("bo").mark, "corner", "the corner is taken, so Bo does not get it");
  s.hold("ana", "u1");
  assert.equal(card(s, "ana").mark, null);
  assert.equal(s.resting.get("corner").has("ana"), false);
  s.hold("bo", "u2");
  s.setHand("bo", { x: corner.X, z: corner.Z });
  run(s, 0.4);
  assert.equal(s.release("bo").mark, "corner", "now it is free");
});

test("the snapshot offers marks only for the cards the viewer holds, at most five, with a target", () => {
  const s = fresh();
  s.hold("di", "u1");
  s.hold("ed", "u2");
  const mine = s.snapshot({ viewer: "u1" });
  const theirs = s.snapshot({ viewer: "u2" });
  const nobody = s.snapshot({ viewer: null });
  assert.ok(mine.marks.length > 0 && mine.marks.length <= 5);
  assert.ok(theirs.marks.length > 0);
  assert.deepEqual(nobody.marks, []);
  assert.notDeepEqual(mine.marks.map((m) => m.id), theirs.marks.map((m) => m.id), "each hand sees what is near it");
  s.release("di");
  assert.deepEqual(s.snapshot({ viewer: "u1" }).marks, [], "nothing in the hand, nothing shown: marks are invisible at rest");
});

test("zones: entering and leaving raise events, and a held card over one lights it", () => {
  const s = fresh([{ id: "ana", name: "Ana", X: 0, Z: -400 }]);
  const grill = RAW_SCENE.zones.find((z) => z.id === "grill");
  const target = s.rig.standing([0.36, 0.84]);                  // the strip of floor in front of the grill, not the grill itself
  s.hold("ana", "u1");
  s.setHand("ana", { x: target.X, z: target.Z });
  run(s, 1);
  assert.equal(s.zoneStates().grill, "target");
  const entered = s.drain().filter((e) => e.type === "zone" && e.entered);
  assert.ok(entered.some((e) => e.zone === grill.id), JSON.stringify(entered));
  s.setHand("ana", { x: -1400, z: -400 });
  run(s, 1.5);
  assert.notEqual(s.zoneStates().grill, "target");
  assert.ok(s.drain().some((e) => e.type === "zone" && e.zone === "grill" && !e.entered));
});

test("with nothing held, every outline is at rest", () => {
  const s = fresh();
  run(s, 0.2);
  assert.ok(Object.values(s.zoneStates()).every((st) => st === "rest"));
  assert.equal(Object.keys(s.zoneStates()).length, 4);
});

test("a hop lifts the card and brings it back; a turned back is half a turn", () => {
  const s = fresh();
  s.hold("bo", "u1");
  run(s, 0.4);
  const base = s.snapshot().cards.find((c) => c.id === "bo").lift;
  s.perform("bo", "hop");
  let peak = 0;
  for (let i = 0; i < Math.round(0.6 / STEP); i++) { s.step(STEP); peak = Math.max(peak, s.snapshot().cards.find((c) => c.id === "bo").lift); }
  assert.ok(peak > base + 40, `up by ${peak - base}`);
  run(s, 0.5);
  near(s.snapshot().cards.find((c) => c.id === "bo").lift, base, 6);
  s.perform("bo", "turn");
  run(s, 1.5);
  assert.ok(Math.abs(s.snapshot().cards.find((c) => c.id === "bo").yaw - (card(s, "bo").yaw + 180)) < 4, "its back to the table");
});

test("the hand cannot take a card off the stage", () => {
  const s = fresh();
  s.hold("di", "u1");
  s.setHand("di", { x: 99999, z: 99999 });
  assert.equal(card(s, "di").hand.x, 1800);
  assert.equal(card(s, "di").hand.z, 260);
  s.setHand("di", { x: -99999, z: -99999 });
  assert.equal(card(s, "di").hand.x, -1800);
  assert.equal(card(s, "di").hand.z, -2300);
});

test("the same inputs give the same stage, every time and at any chunking of time", () => {
  const play = (chunk) => {
    const s = fresh();
    s.hold("di", "u1");
    let t = 0;
    let hx = card(s, "di").puppet.x;
    while (t < 2 - 1e-9) {
      hx += 900 * chunk;
      s.setHand("di", { x: hx, z: card(s, "di").hand.z });
      s.advance(chunk);
      t += chunk;
    }
    return s;
  };
  const a = play(1 / 60);
  const b = play(1 / 60);
  assert.deepEqual(a.snapshot(), b.snapshot());
  const c = play(1 / 30);
  assert.ok(Math.abs(a.cards.get("di").puppet.x - c.cards.get("di").puppet.x) < 12, "a coarser frame rate lands in the same place, give or take the hand's own steps");
  assert.ok(Math.abs(a.steps - c.steps) <= 1);
});

test("a long gap between frames is clamped, not caught up with: no spiral of death", () => {
  const s = fresh();
  const n = s.advance(5);
  assert.ok(n <= Math.round(0.05 / STEP) + 1, `${n} steps for a five-second gap`);
});

test("places can be exported and put back on another stage at any size", () => {
  const s = fresh();
  s.hold("di", "u1");
  s.setHand("di", { x: -500, z: -700 });
  run(s, 1.5);
  s.release("di");
  run(s, 1);
  const places = s.exportPlaces();
  const di = places.find((p) => p.id === "di");
  const t = new Stage(scene, [{ id: "di", name: "Di", at: di.at }]);
  near(t.cards.get("di").puppet.x, card(s, "di").puppet.restX, 2.5, "x");
  near(t.cards.get("di").Z, card(s, "di").restZ, 4, "z");
});

test("tidy sends loose cards to marks, one each", () => {
  const s = fresh();
  const pairs = s.tidy();
  assert.equal(pairs.length, Math.min(5, s.marks.length));
  assert.equal(new Set(pairs.map((p) => p.mark)).size, pairs.length);
  run(s, 2);
  for (const { card: id, mark: m } of pairs) near(card(s, id).puppet.x, mark(s, m).X, 1, id);
});

test("removing a card clears its mark, its zones and its bump memory", () => {
  const s = fresh([{ id: "ana", name: "Ana", mark: "corner" }, { id: "bo", name: "Bo", X: 0, Z: -400 }]);
  assert.equal(s.removeCard("ana"), true);
  assert.equal(s.resting.get("corner").size, 0);
  assert.equal(s.cards.has("ana"), false);
  assert.equal(s.removeCard("ana"), false);
});

test("a card added twice, or without an id, is refused", () => {
  const s = fresh();
  assert.equal(s.addCard({ id: "di", name: "again" }), null);
  assert.equal(s.addCard({ name: "no id" }), null);
  assert.equal(createStage(scene, []).cards.size, 0);
});

test("marks above the horizon are reported, not silently lost", () => {
  const withSky = describeScene({ ...RAW_SCENE, marks: [...RAW_SCENE.marks, { id: "sky", at: [0.5, 0.2] }] }).scene;
  const s = new Stage(withSky, []);
  assert.ok(s.problems.some((p) => p.includes('"sky"')));
});
