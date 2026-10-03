// Blocking in the stage engine (core/stage.mjs): cards walk without a hand, go about their routines, part when they
// overlap, look round at the action, walk on, and stand in fight positions the board can count.

import { test } from "node:test";
import assert from "node:assert/strict";
import { describeScene } from "../scripts/core/scene.mjs";
import { Stage } from "../scripts/core/stage.mjs";
import { rangeBands, zoneGap } from "../scripts/core/zones.mjs";
import { commitMoves, homeMoves, commitPlace } from "../scripts/core/sync.mjs";
import { RAW_SCENE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const run = (s, seconds) => { for (let i = 0; i < Math.round(seconds * 120); i++) s.step(); };
const near = (a, b, eps, what = "") => assert.ok(Math.abs(a - b) <= eps, `${what}: ${a} is not within ${eps} of ${b}`);

/** A stage on a clock of our own, so two stages can share one. */
function clocked(people, t0 = 1790995000) {
  const clock = { t: t0 };
  const s = new Stage(scene, people, { clock: () => clock.t });
  const tick = (seconds) => { for (let i = 0; i < Math.round(seconds * 120); i++) { clock.t += 1 / 120; s.step(); } };
  return { s, clock, tick };
}

test("a card sent somewhere walks there, steps on the way, and stands as it was told", () => {
  const { s, tick } = clocked([{ id: "bo", name: "Bo", X: -600, Z: -500 }]);
  const w = s.walkTo("bo", { X: 500, Z: -700 }, { yaw: -30, lean: 4, gait: "walk" });
  assert.ok(w && w.dur > 1);
  let lifted = 0;
  let events = [];
  for (let i = 0; i < 400; i++) {
    tick(1 / 120);
    const c = s.snapshot().cards[0];
    lifted = Math.max(lifted, c.lift);
    events.push(...s.drain());
  }
  const c = s.cards.get("bo");
  near(c.puppet.x, 500, 2, "x");
  near(c.Z, -700, 3, "z");
  near(c.yaw, -30, 1.5, "yaw");
  near(c.lean, 4, 0.5, "lean");
  assert.ok(lifted > 5, "it bobbed as it stepped");
  assert.deepEqual(events.filter((e) => e.type === "walk" || e.type === "arrive").map((e) => e.type), ["walk", "arrive"]);
});

test("a move published for later starts then on every screen, and a screen that hears late catches up", () => {
  const start = 1790995000;
  const a = clocked([{ id: "bo", name: "Bo", X: -600, Z: -500 }], start);
  const b = clocked([{ id: "bo", name: "Bo", X: -600, Z: -500 }], start);
  a.s.walkTo("bo", { X: 600, Z: -500 }, { t0: start + 0.5 });
  a.tick(1.2);
  b.tick(0.9);                                             // b hears 0.9 s late, after the walk had begun
  b.s.walkTo("bo", { X: 600, Z: -500 }, { t0: start + 0.5 });
  b.tick(0.3);
  near(b.s.cards.get("bo").puppet.x, a.s.cards.get("bo").puppet.x, 60, "the late screen is with the other within a step");
  a.tick(3); b.tick(3);
  near(b.s.cards.get("bo").puppet.x, a.s.cards.get("bo").puppet.x, 0.01, "and both end in the identical place");
});

test("a card can be sent to a mark: it takes the mark at once and stands as the mark says", () => {
  const { s, tick } = clocked([{ id: "bo", name: "Bo", X: 0, Z: -200 }, { id: "cy", name: "Cy", X: 300, Z: -200 }]);
  s.walkTo("bo", { mark: "booth-a" });
  assert.equal(s.cards.get("bo").mark, "booth-a");
  assert.equal(s.landingFor("bo"), null, "nobody holds it");
  tick(5);
  const c = s.cards.get("bo");
  near(c.yaw, -34, 1.5, "the booth's angle");
  near(c.lean, 6, 0.6, "and its lean");
});

test("a card picked up mid-walk stops where it is, and is set aside from its routine", () => {
  const { s, tick } = clocked([{ id: "bo", name: "Bo", X: -600, Z: -500, life: { kind: "wander" } }]);
  s.walkTo("bo", { X: 600, Z: -500 });
  tick(0.6);
  const x = s.cards.get("bo").puppet.x;
  assert.ok(s.hold("bo", "u1"));
  assert.equal(s.cards.get("bo").walk, null);
  assert.equal(s.cards.get("bo").still, true);
  near(s.cards.get("bo").puppet.restX, x, 1, "its rest is where it had got to");
});

test("people with a routine move on their own, and two screens on the same clock see the same thing", () => {
  const people = [{ id: "tama", name: "Tama", at: [0.5, 0.9], life: { kind: "visit", marks: ["bar-1", "booth-a"], every: 4, restless: 1 } }];
  const start = 1790995000;
  const a = clocked(people, start);
  const b = clocked(people, start);
  const xs = new Set();
  for (let i = 0; i < 30; i++) {
    a.tick(0.5); b.tick(0.5);
    near(a.s.cards.get("tama").puppet.x, b.s.cards.get("tama").puppet.x, 1e-6, "the same on both");
    xs.add(Math.round(a.s.cards.get("tama").puppet.x / 50));
  }
  assert.ok(xs.size > 3, "she gets about");
});

test("Life off: nobody goes about their business; back on, they walk back to it rather than jump", () => {
  const { s, tick } = clocked([{ id: "tama", name: "Tama", at: [0.5, 0.9], life: { kind: "pace", width: 0.2, every: 2, restless: 1 } }]);
  tick(3);
  s.setLife(false);
  const x = s.cards.get("tama").puppet.x;
  tick(6);
  near(s.cards.get("tama").puppet.x, x, 25, "she stands where she was");
  s.setLife(true);
  let maxStep = 0;
  let last = s.cards.get("tama").puppet.x;
  for (let i = 0; i < 600; i++) { tick(1 / 120); const now = s.cards.get("tama").puppet.x; maxStep = Math.max(maxStep, Math.abs(now - last)); last = now; }
  assert.ok(maxStep < 20, `no jump on the way back: ${maxStep}`);
});

test("cards left standing on top of each other drift apart; a huddle is left close", () => {
  const { s, tick } = clocked([{ id: "a", name: "A", X: 0, Z: -500 }, { id: "b", name: "B", X: 10, Z: -505 }]);
  tick(2);
  const gap = Math.abs(s.cards.get("a").puppet.x - s.cards.get("b").puppet.x);
  const w = s.cards.get("a").w;
  assert.ok(gap >= w * (1 - 0.42) - 2, `they part: ${gap}`);
  const packed = clocked([{ id: "a", name: "A", X: 0, Z: -500, packed: true }, { id: "b", name: "B", X: 10, Z: -505, packed: true }]);
  packed.tick(2);
  near(packed.s.cards.get("b").puppet.x - packed.s.cards.get("a").puppet.x, 10, 1, "packed on purpose");
});

test("heads turn towards a card in someone's hand, and back again when it is put down", () => {
  const { s, tick } = clocked([{ id: "bo", name: "Bo", X: -300, Z: -500 }, { id: "cy", name: "Cy", X: 300, Z: -500 }]);
  tick(0.5);
  s.hold("cy", "u1");
  s.setHand("cy", { x: 250, z: -480 });
  tick(1.5);
  assert.ok(s.cards.get("bo").look > 8, `Bo looks round at Cy: ${s.cards.get("bo").look}`);
  s.release("cy");
  tick(3);
  near(s.cards.get("bo").look, 0, 1, "and back");
});

test("a card that walks on comes in from the side and reaches its place", () => {
  const start = 1790995000;
  const { s, tick } = clocked([{ id: "cent", name: "Centipede", X: 200, Z: -600, enter: { from: "left", t0: start, gait: "scurry" } }], start);
  assert.ok(s.cards.get("cent").puppet.x < -1500, "it starts off the side");
  tick(4);
  near(s.cards.get("cent").puppet.x, 200, 2, "and arrives");
  const late = clocked([{ id: "cent", name: "Centipede", X: 200, Z: -600, enter: { from: "left", t0: start - 60, gait: "scurry" } }], start);
  near(late.s.cards.get("cent").puppet.x, 200, 0.01, "a page loaded long after simply has it there");
});

test("a card that rises out of the floor starts flat, pops up past standing, and settles", async () => {
  const { riseAt } = await import("../scripts/core/stage.mjs");
  const start = 1790995000;
  const { s, clock } = clocked([{ id: "cent", name: "Centipede", X: 0, Z: -600, enter: { from: "rise", t0: start + 0.2 } }], start);
  const squash = () => s.snapshot().cards[0].squash;
  assert.ok(squash() < 0.05, "flat before it starts");
  const rise = { t0: 0, dur: 0.7 };
  let most = 0;
  for (let t = 0; t <= 0.7; t += 0.01) most = Math.max(most, riseAt(rise, t));
  assert.ok(most > 1.05, `it overshoots: ${most}`);
  near(riseAt(rise, 0.7), 1, 1e-9, "and stands");
  clock.t = start + 2;
  near(squash(), 1, 1e-9, "long after, it simply stands");
  assert.equal(s.cards.get("cent").rise, null, "and the rise is forgotten");
});

test("a formation from the engine: moves in fractions of the painting, still, and packed for the close ones", () => {
  const { s } = clocked([
    { id: "a", name: "A", at: [0.3, 0.9] }, { id: "b", name: "B", at: [0.5, 0.9] }, { id: "c", name: "C", at: [0.7, 0.9] },
    { id: "p", name: "P", at: [0.5, 0.95], pc: true }
  ]);
  const moves = s.formationMoves("huddle", {});
  assert.deepEqual(moves.map((m) => m.id).sort(), ["a", "b", "c"]);
  for (const m of moves) {
    assert.ok(m.at.every((f) => f > 0 && f < 1.1), "on the painting");
    assert.equal(m.still, true);
    assert.equal(m.packed, true);
  }
  const away = s.formationMoves("audience", { away: true });
  assert.ok(away.every((m) => m.yaw === 180), "turned right round, backs to the table");
  const line = s.formationMoves("line", { ids: ["a", "p"], party: true });
  assert.deepEqual(line.map((m) => m.id).sort(), ["a", "p"]);
  assert.equal(line[0].packed, false);
});

test("published moves: stamped with when they start, and a later drop does not send anyone walking again", () => {
  const cards = [{ id: "a", at: [0.3, 0.9], life: { kind: "wander" } }, { id: "b", at: [0.5, 0.9] }];
  const moved = commitMoves(cards, [{ id: "a", at: [0.6, 0.88], yaw: 12.345, gait: "hurry", still: true, packed: true }], 1790995000.4567);
  assert.deepEqual(moved[0], { id: "a", at: [0.6, 0.88], life: { kind: "wander" }, yaw: 12.3, still: true, packed: true, move: { t0: 1790995000.457, gait: "hurry" } });
  assert.equal(moved[1], cards[1], "untouched cards are the same objects");
  const dropped = commitPlace(moved, { id: "a", at: [0.4, 0.9], yaw: 0, mark: null });
  assert.deepEqual(dropped[0].move, moved[0].move, "the drop keeps the move's stamp, so no screen walks it again");
  assert.equal(dropped[0].still, true, "put down by hand, it stays");
  assert.equal(dropped[0].packed, undefined);
});

test("back to places: everyone moved goes home and back to their routine; those at home are left alone", () => {
  const cards = [
    { id: "a", at: [0.6, 0.88], home: [0.3, 0.9], still: true },
    { id: "b", at: [0.5, 0.9], home: [0.5, 0.9] },
    { id: "c", at: [0.2, 0.9] }
  ];
  const moves = homeMoves(cards);
  assert.deepEqual(moves.map((m) => [m.id, m.at, m.still]), [["a", [0.3, 0.9], false]]);
});

test("the fight board counts who stands in each position, and knows which positions are near", () => {
  const raw = structuredClone(RAW_SCENE);
  raw.zones.push(
    { id: "left", kind: "area", name: "The left", shape: [[0.05, 0.8], [0.3, 0.8], [0.3, 0.95], [0.05, 0.95]], tags: ["cover"] },
    { id: "middle", kind: "area", name: "The middle", shape: [[0.31, 0.8], [0.6, 0.8], [0.6, 0.95], [0.31, 0.95]] },
    { id: "right", kind: "area", name: "The right", shape: [[0.7, 0.8], [0.95, 0.8], [0.95, 0.95], [0.7, 0.95]] }
  );
  const d = describeScene(raw).scene;
  assert.deepEqual(d.zones.find((z) => z.id === "left").tags, ["cover"]);
  assert.deepEqual(rangeBands(d.zones), [{ a: "left", b: "middle" }], "the left touches the middle; the right is far from both");
  const s = new Stage(d, [{ id: "a", name: "A", at: [0.2, 0.9] }, { id: "b", name: "B", at: [0.15, 0.88] }, { id: "c", name: "C", at: [0.45, 0.9] }]);
  s.setBoard(true);
  run(s, 0.1);
  const board = s.snapshot().board;
  assert.equal(board.counts.left, 2);
  assert.equal(board.counts.middle, 1);
  assert.equal(board.counts.right, 0);
  assert.equal(s.bandBetween("left", "left"), "engaged");
  assert.equal(s.bandBetween("left", "middle"), "near");
  assert.equal(s.bandBetween("left", "right"), "far");
  s.setBoard(false);
  assert.equal(s.snapshot().board, null);
  // a scene that says which positions are near is taken at its word
  raw.zones.find((z) => z.id === "left").near = ["right"];
  assert.deepEqual(rangeBands(describeScene(raw).scene.zones), [{ a: "left", b: "right" }]);
  assert.ok(zoneGap(d.zones.find((z) => z.id === "left"), d.zones.find((z) => z.id === "right")) > 0.3);
});

test("a card behind the counter is raised until its face shows over it; in front of it, or with risers off, it is not", () => {
  // the fixture's counter runs from 0.235 to 0.728 across, its top at 0.7 of the painting, standing at 0.86
  const behind = new Stage(scene, [{ id: "keeper", name: "Keeper", at: [0.5, 0.78] }]);
  const k = behind.cards.get("keeper");
  assert.ok(k.riser > 20, `raised over the counter: ${k.riser}`);
  const r = behind.risers[0];
  const hidden = r.camY + (r.top - r.camY) * ((r.f - k.Z) / (r.f - r.Z)) - k.riser;
  assert.ok(hidden <= 0.45 * k.h + 1, "no more than 45% of it hidden");
  assert.ok(behind.snapshot().cards[0].lift >= k.riser - 1e-9, "and drawn that much higher");
  const front = new Stage(scene, [{ id: "drinker", name: "Drinker", at: [0.5, 0.92] }]);
  assert.equal(front.cards.get("drinker").riser, 0, "in front of the counter, nobody needs a box");
  const aside = new Stage(scene, [{ id: "aside", name: "Aside", at: [0.95, 0.78] }]);
  assert.equal(aside.cards.get("aside").riser, 0, "nor beside it");
  const raw = structuredClone(RAW_SCENE);
  raw.occluders[0].riser = false;
  const wall = new Stage(describeScene(raw).scene, [{ id: "keeper", name: "Keeper", at: [0.5, 0.78] }]);
  assert.equal(wall.cards.get("keeper").riser, 0, "a cut-out that hides people entirely raises nobody");
});

test("a zone near one that is not there is a problem the author is told about", () => {
  const raw = structuredClone(RAW_SCENE);
  raw.zones.push({ id: "x", kind: "area", shape: [[0.1, 0.8], [0.2, 0.8], [0.2, 0.9]], near: ["nowhere"] });
  assert.ok(describeScene(raw).problems.some((p) => p.includes("nowhere")));
});
