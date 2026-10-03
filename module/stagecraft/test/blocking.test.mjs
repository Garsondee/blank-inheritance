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

test("two regulars talking turn to each other, and nod now and then, on the same beat on every screen", () => {
  const people = [
    { id: "kiku", name: "Kiku", X: -300, Z: -600, life: { kind: "wander", restless: 0, every: 3, faces: "sanzo", gestures: ["nod"], gestureChance: 1 } },
    { id: "sanzo", name: "Sanzo", X: 300, Z: -600, life: { kind: "wander", restless: 0, every: 3, faces: "kiku" } }
  ];
  const a = clocked(people);
  const b = clocked(people);
  let nods = 0;
  for (let i = 0; i < 120 * 10; i++) {
    a.tick(1 / 120); b.tick(1 / 120);
    if (a.s.cards.get("kiku").puppet.verbs.some((v) => v.verb === "nod" && v.t < 1 / 100)) nods++;
  }
  assert.ok(a.s.cards.get("kiku").yaw > 20, `Kiku turns right, to Sanzo (${a.s.cards.get("kiku").yaw.toFixed(1)})`);
  assert.ok(a.s.cards.get("sanzo").yaw < -20, "Sanzo turns left, to Kiku");
  assert.ok(nods >= 2 && nods <= 4, `a nod every beat or so, never twice in one (${nods} in 10 s at a 3 s beat)`);
  near(a.s.cards.get("kiku").yaw, b.s.cards.get("kiku").yaw, 1e-6, "the same on both screens");
  assert.equal(a.s.cards.get("kiku").gestured, b.s.cards.get("kiku").gestured, "the same beat's nod on both");
});

test("a routine given afresh (someone it talks to has arrived) keeps its home and walks on to it", () => {
  const { s, tick } = clocked([{ id: "kiku", name: "Kiku", X: -300, Z: -600, life: { kind: "wander", restless: 0, every: 3 } }, { id: "sanzo", name: "Sanzo", X: 300, Z: -600 }]);
  tick(1);
  const before = s.cards.get("kiku").yaw;
  s.setRoutine("kiku", { kind: "wander", restless: 0, every: 3, faces: "sanzo" });
  tick(3);
  assert.ok(s.cards.get("kiku").yaw > before + 15, "she turns to the newcomer");
  near(s.cards.get("kiku").routine.home.X, -300, 1, "and keeps her home");
  s.setRoutine("kiku", null);
  assert.equal(s.cards.get("kiku").routine, null, "no routine at all is allowed");
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

test("after the server restarts, the clock starts again: what was stamped the day before is long over, not hours away", () => {
  // found live 2026-10-03: Foundry's shared clock is the server's uptime, so a daily restart sends it back to zero, and a
  // card that walked on or rose up yesterday would have stood at the side of the stage, or lain flat, for hours
  const yesterday = 48931.4;                       // 13.6 hours into the server's last run
  const { s } = clocked([
    { id: "walker", name: "W", at: [0.4, 0.9], enter: { from: "left", t0: yesterday, gait: "walk" } },
    { id: "riser", name: "R", at: [0.6, 0.9], enter: { from: "rise", t0: yesterday } }
  ], 120.5);                                       // two minutes after the restart
  const home = s.rig.standing([0.4, 0.9]);
  const w = s.cards.get("walker");
  assert.equal(w.walk, null, "nobody walks on again");
  assert.ok(Math.abs(w.puppet.x - home.X) < 1, "the card stands in its place");
  assert.equal(s.cards.get("riser").rise ?? null, null, "and nobody lies flat waiting to rise");
  // a move stamped before the restart starts now rather than in hours
  s.walkTo("walker", { at: [0.5, 0.9] }, { t0: yesterday });
  assert.ok(s.cards.get("walker").walk.t0 <= 121, "a stale move starts now");
  // what this run stamps a moment ahead is still a moment ahead
  const { s: fresh } = clocked([{ id: "new", name: "N", at: [0.4, 0.9], enter: { from: "left", t0: 120.9 } }], 120.5);
  assert.ok(fresh.cards.get("new").walk, "a fresh entrance still walks on");
});

test("a card put down at a door or a thing to look at has gone there: the stage says who, where, and what it is for", () => {
  // found 2026-10-03: a zone on the stage did nothing and said nothing of what it was for
  const { s, tick } = clocked([{ id: "bo", name: "Bo", X: -300, Z: -500 }]);
  const grill = s.rig.standing([0.36, 0.84]);
  s.hold("bo", "u1");
  s.setHand("bo", { x: grill.X, z: grill.Z });
  tick(0.5);
  s.release("bo");
  const visit = s.drain().find((e) => e.type === "visit");
  assert.ok(visit, "a visit");
  assert.equal(visit.card, "bo");
  assert.equal(visit.by, "u1");
  assert.equal(visit.zone, "grill");
  assert.equal(visit.name, "The grill");
  const elsewhere = s.rig.standing([0.6, 0.95]);
  s.hold("bo", "u1");
  s.setHand("bo", { x: elsewhere.X, z: elsewhere.Z });
  tick(0.5);
  s.release("bo");
  assert.equal(s.drain().filter((e) => e.type === "visit").length, 0, "put down anywhere else, nothing is said");
});

test("a card given a new home goes about its routine round the new one", () => {
  const { s, tick } = clocked([{ id: "bo", name: "Bo", X: -600, Z: -500, life: { kind: "wander", radius: 0.02, every: 3, restless: 1 } }]);
  tick(1);
  s.setRoutine("bo", { kind: "wander", radius: 0.02, every: 3, restless: 1 }, [0.75, 0.9]);
  const home = s.rig.standing([0.75, 0.9]);
  assert.ok(Math.abs(s.cards.get("bo").routine.home.X - home.X) < 1 && Math.abs(s.cards.get("bo").routine.home.Z - home.Z) < 1);
  tick(30);
  const c = s.cards.get("bo");
  assert.ok(Math.hypot(c.puppet.x - home.X, c.Z - home.Z) < 260, `it wanders round its new home (${Math.round(Math.hypot(c.puppet.x - home.X, c.Z - home.Z))} away)`);
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
  const small = s.formationMoves("circle", {});
  const big = s.formationMoves("circle", { size: 0.4 });
  const spread = (moves) => Math.max(...moves.map((m) => m.at[0])) - Math.min(...moves.map((m) => m.at[0]));
  assert.ok(spread(big) > spread(small) * 1.3, `a circle round something big is wider (${spread(big).toFixed(3)} against ${spread(small).toFixed(3)})`);
  assert.ok(spread(big) > 0.25 && spread(big) < 0.45, "and about as wide as it was asked to be");
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
  s.setDown("b", true);
  const after = s.snapshot().board;
  assert.deepEqual([after.counts.left, after.downs.left], [1, 1], "one standing in the left, one down there");
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
  // Ingram, 2026-10-03: a bar hides the bottom 15% of a card at most, measured on the card as it is drawn (grown at depth)
  assert.equal(r.hideAtMost, 0.15);
  assert.ok(hidden <= 0.15 * k.h * k.grow + 1, `no more than 15% of it hidden (${(hidden / (k.h * k.grow)).toFixed(3)})`);
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

test("whoever has the floor is lit, and everyone else turns to look at them", () => {
  const { s, tick } = clocked([{ id: "speaker", name: "S", X: 400, Z: -500 }, { id: "a", name: "A", X: -400, Z: -500 }, { id: "b", name: "B", X: -100, Z: -700 }]);
  s.setSpeaker("speaker");
  tick(2);
  const snap = s.snapshot();
  assert.equal(snap.cards.find((c) => c.id === "speaker").speaking, true);
  assert.equal(snap.cards.find((c) => c.id === "a").speaking, false);
  assert.ok(s.cards.get("a").look > 8 && s.cards.get("b").look > 8, "both turn towards the speaker on their right");
  assert.ok(Math.abs(s.cards.get("speaker").look) < 1, "the speaker does not look at themself");
  s.setSpeaker(null);
  tick(3);
  near(s.cards.get("a").look, 0, 1, "and back when the floor is taken back");
  s.setSpeaker("nobody");
  assert.equal(s.speaker, null, "someone not on the stage cannot have the floor");
});

test("with the fight board up, a card put down in a position docks in a free place there; with it down, it lands where it is let go", () => {
  const raw = structuredClone(RAW_SCENE);
  raw.zones.push({ id: "pit", kind: "area", name: "The pit", shape: [[0.3, 0.86], [0.7, 0.86], [0.72, 0.97], [0.28, 0.97]] });
  raw.marks = [];                       // a mark within reach is taken first, as it should be; here there are none
  const d = describeScene(raw).scene;
  const s = new Stage(d, [{ id: "a", name: "A", at: [0.5, 0.92] }, { id: "b", name: "B", at: [0.1, 0.95] }]);
  const a = s.cards.get("a");
  const spot = s.rig.standing([0.5, 0.92]);
  s.hold("b", "u1");
  s.setHand("b", { x: spot.X + 20, z: spot.Z });
  run(s, 0.5);
  const free = s.landingFor("b");
  near(free.X, s.cards.get("b").puppet.x, 0.01, "board down: it lands where it is let go, on top of A");
  s.setBoard(true);
  const docked = s.landingFor("b");
  assert.ok(Math.abs(docked.X - a.puppet.restX) >= a.w * 0.6 - 1 || Math.abs(docked.Z - a.restZ) >= 90, "board up: it docks clear of A");
  const f = s.rig.fractionOf(docked.X, docked.Z);
  assert.ok(f[0] > 0.27 && f[0] < 0.73 && f[1] > 0.85 && f[1] < 0.98, `and inside the pit (${f.map((n) => n.toFixed(3))})`);
  s.release("b");
  s.hold("b", "u1");
  s.setHand("b", { x: -1700, z: -300 });
  run(s, 0.5);
  assert.equal(s.dockFor("b", s.cards.get("b").puppet.x, -300), null, "outside every position there is nowhere to dock");
});

test("a formation never leaves someone where a cut-out would hide them entirely: they stand in front of it instead", () => {
  const raw = structuredClone(RAW_SCENE);
  raw.occluders = [{ id: "partition", poly: [[0.3, -0.2], [0.7, -0.2], [0.7, 0.9], [0.3, 0.9]], base: 0.9, x: 0.5 }];   // a partition to the ceiling
  const s = new Stage(describeScene(raw).scene, [{ id: "a", name: "A", at: [0.3, 0.95] }]);
  const c = s.cards.get("a");
  const r = s.risers[0];
  const justBehind = r.Z - 30;            // right behind the partition: no riser could lift a card clear of it
  const x = (r.x0 + r.x1) / 2;
  assert.equal(s.unhidden(x, justBehind, c.w, c.h), r.Z + 60, "moved to just in front of the counter");
  assert.equal(s.unhidden(x, r.Z + 100, c.w, c.h), r.Z + 100, "in front already: left alone");
  assert.equal(s.unhidden(r.x1 + c.w, justBehind, c.w, c.h), justBehind, "beside the counter: left alone");
  // behind a low counter, far back, a riser lifts a card clear of it: left where it is
  const low = new Stage(scene, [{ id: "a", name: "A", at: [0.3, 0.95] }]);
  const lr = low.risers[0];
  const lc = low.cards.get("a");
  assert.equal(low.unhidden((lr.x0 + lr.x1) / 2, -2200, lc.w, lc.h), -2200);
});

test("a card knocked down tips over backwards, lands with a bounce, lies still and dim, and gets back up", () => {
  const { s, tick } = clocked([{ id: "cent", name: "C", X: 0, Z: -600, life: { kind: "swarm", every: 2, restless: 1 } }, { id: "pc", name: "P", X: 400, Z: -600 }]);
  tick(1);
  assert.equal(s.setDown("cent", true), true);
  assert.equal(s.setDown("cent", true), false, "already down: nothing changes");
  let most = 0;
  for (let i = 0; i < 120; i++) { tick(1 / 120); most = Math.max(most, s.cards.get("cent").down); }
  const snap = () => s.snapshot().cards.find((c) => c.id === "cent");
  assert.ok(most > 1 && most <= 1.08, `it overshoots a little as it lands (${most.toFixed(3)})`);
  tick(1);
  assert.ok(snap().pitch < -70, `lying on its back (${snap().pitch.toFixed(1)})`);
  near(snap().down, 1, 0.01, "down");
  const x = s.cards.get("cent").puppet.x;
  tick(4);
  near(s.cards.get("cent").puppet.x, x, 0.5, "a card that is down goes about no routine");
  assert.deepEqual(s.drain().filter((e) => e.type === "fall").map((e) => e.down), [true]);
  s.setDown("cent", false);
  tick(2);
  assert.ok(Math.abs(snap().pitch) < 8, "back on its feet");
  assert.equal(s.setDown("nobody", true), false);
  const lying = new Stage(scene, [{ id: "a", name: "A", X: 0, Z: -500, down: true }]);
  assert.equal(lying.snapshot().cards[0].down, 1, "a card published as down is down from the first frame (a reload)");
});

test("into position: the chosen spread out into free places in the zone clicked, each inside it, none on another", () => {
  const raw = structuredClone(RAW_SCENE);
  raw.zones.push({ id: "pit", kind: "area", name: "The pit", shape: [[0.3, 0.86], [0.7, 0.86], [0.72, 0.97], [0.28, 0.97]] });
  const d = describeScene(raw).scene;
  const s = new Stage(d, [
    { id: "a", name: "A", at: [0.1, 0.95] }, { id: "b", name: "B", at: [0.9, 0.95] }, { id: "c", name: "C", at: [0.15, 0.9] },
    { id: "keeper", name: "K", at: [0.5, 0.92] }, { id: "p", name: "P", at: [0.85, 0.9], pc: true }
  ]);
  const moves = s.formationMoves("position", { ids: ["a", "b", "c", "p"], focus: [0.5, 0.92] });
  assert.deepEqual(moves.map((m) => m.id).sort(), ["a", "b", "c"], "the party stays put unless asked");
  const keeper = s.cards.get("keeper");
  for (const m of moves) {
    assert.ok(m.at[0] > 0.27 && m.at[0] < 0.73 && m.at[1] > 0.85 && m.at[1] < 0.98, `${m.id} is in the pit (${m.at})`);
    const p = s.rig.standing(m.at);
    assert.ok(Math.abs(p.X - keeper.puppet.x) > 60 || Math.abs(p.Z - keeper.Z) > 60, `${m.id} is not on the keeper's place`);
  }
  assert.equal(new Set(moves.map((m) => m.at.join())).size, moves.length, "nobody shares a place");
  const outside = s.formationMoves("position", { ids: ["a", "b"], focus: [0.1, 0.95] });
  assert.equal(outside.length, 2, "outside any zone it is a plain line");
});

test("when someone falls, or arrives, the people near them look round at them for a moment", () => {
  const start = 1790995000;
  const { s, tick } = clocked([{ id: "a", name: "A", X: -300, Z: -600 }, { id: "b", name: "B", X: 300, Z: -600 }], start);
  s.setDown("b", true);
  tick(0.8);
  assert.ok(s.cards.get("a").look > 8, `A looks at B as B falls (${s.cards.get("a").look.toFixed(1)})`);
  tick(4);
  assert.ok(Math.abs(s.cards.get("a").look) < 2, "and then looks away");
  s.addCard({ id: "c", name: "C", X: -700, Z: -600, enter: { from: "rise", t0: start + 4.9 } });
  tick(0.8);
  assert.ok(s.cards.get("a").look < -8, `A looks round at the newcomer on the left (${s.cards.get("a").look.toFixed(1)})`);
});

test("further back a card is drawn bigger than the camera alone would draw it, so the back of a room does not shrink it away", async () => {
  const { depthGrow, DEPTH_EASE } = await import("../scripts/core/rigspace.mjs");
  const s = new Stage(scene, [{ id: "front", name: "F", X: 0, Z: 0 }, { id: "back", name: "B", X: 0, Z: -1800 }]);
  const snap = s.snapshot().cards;
  const front = snap.find((c) => c.id === "front");
  const back = snap.find((c) => c.id === "back");
  assert.equal(front.grow, 1, "nothing at the front is changed");
  const k = s.rig.cam.f / (s.rig.cam.f + 1800);
  near(back.grow, k ** -DEPTH_EASE, 1e-9, "the camera's shrink, partly given back");
  assert.ok(back.grow * k > k * 1.2, "it looks bigger than the camera alone would draw it");
  assert.ok(back.scale > front.scale, "and the snapshot's scale says so");
  assert.equal(depthGrow(s.rig.cam, 100), 1, "in front of the stage line: never shrunk");
  assert.ok(depthGrow(s.rig.cam, -1e6) <= 2.2, "and never more than a cap");
});

test("a zone near one that is not there is a problem the author is told about", () => {
  const raw = structuredClone(RAW_SCENE);
  raw.zones.push({ id: "x", kind: "area", shape: [[0.1, 0.8], [0.2, 0.8], [0.2, 0.9]], near: ["nowhere"] });
  assert.ok(describeScene(raw).problems.some((p) => p.includes("nowhere")));
});
