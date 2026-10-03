// Held cards on every screen. Several real Stage engines, each with its own StageSync, joined by a simulated network
// with its own delay and jitter (delivery on each link stays in order, as a socket's does), driven frame by frame on a
// virtual clock. No Foundry. The real server's relay time and the real browsers are the live check's job.

import { test } from "node:test";
import assert from "node:assert/strict";
import { Stage } from "../scripts/core/stage.mjs";
import { StageSync, SYNC, commitPlace } from "../scripts/core/sync.mjs";
import { describeScene } from "../scripts/core/scene.mjs";
import { RAW_SCENE, PEOPLE } from "./fixture.mjs";

const { scene } = describeScene(RAW_SCENE);
const FRAME = 1000 / 60;

/** A small deterministic random generator, so a run is the same every time. */
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

function room(users, { lag = [40, 10], skew = {}, mayHold = () => true, seed = 7 } = {}) {
  const rnd = lcg(seed);
  const world = { t: 1_000_000, wire: [], clients: new Map(), sentBy: new Map(), lastDue: new Map() };
  for (const id of users) {
    const stage = new Stage(scene, PEOPLE);
    const client = { id, stage, lost: [], drops: [], bonks: [] };
    client.sync = new StageSync({
      stage, scene: "sc", me: id,
      now: () => world.t + (skew[id] ?? 0), clock: () => world.t,
      send: (message) => {
        world.sentBy.set(id, (world.sentBy.get(id) ?? 0) + 1);
        (client.log ??= []).push({ at: world.t, ...message });
        for (const other of users) {
          if (other === id) continue;
          const key = `${id}>${other}`;
          const due = Math.max((world.lastDue.get(key) ?? 0) + 0.001, world.t + lag[0] + (rnd() * 2 - 1) * lag[1]);
          world.lastDue.set(key, due);
          world.wire.push({ due, from: id, to: other, message });
        }
      },
      mayHold: (card, user) => mayHold(card, user),
      onLost: (card) => client.lost.push(card),
      onDrop: (result) => client.drops.push(result)
    });
    world.clients.set(id, client);
  }
  world.run = (ms, hands = {}) => {
    const end = world.t + ms;
    while (world.t < end) {
      world.t += FRAME;
      world.wire.sort((a, b) => a.due - b.due);
      while (world.wire.length && world.wire[0].due <= world.t) {
        const m = world.wire.shift();
        world.clients.get(m.to).sync.receive(m.message, m.from);
      }
      for (const c of world.clients.values()) {
        hands[c.id]?.(world.t, c);
        c.sync.tick();
        c.stage.advance(FRAME / 1000);
        for (const e of c.stage.drain()) if (e.type === "bonk") c.bonks.push(e);
      }
    }
  };
  world.get = (id) => world.clients.get(id);
  return world;
}

/** The floor point under a standing card, to carry a hand to. */
const spot = (stage, id) => { const c = stage.cards.get(id); return { x: c.puppet.x, z: c.Z }; };

test("a grab lifts the card on every screen, and the hand is followed", () => {
  const w = room(["alice", "bob", "cy"]);
  const a = w.get("alice");
  const start = spot(a.stage, "ana");
  assert.equal(a.sync.grab("ana"), true);
  const path = (t, c) => c.sync.move("ana", start.x + 500 * Math.min(1, (t - t0) / 1500), start.z - 200 * Math.min(1, (t - t0) / 1500));
  const t0 = w.t;
  w.run(2000, { alice: path });
  for (const id of ["bob", "cy"]) {
    const c = w.get(id).stage.cards.get("ana");
    assert.equal(c.holder, "alice", `${id} sees alice holding`);
    assert.ok(c.grip > 0.9, "the stick is out");
    assert.ok(Math.abs(c.hand.x - (start.x + 500)) < 3, `the hand arrives: ${c.hand.x}`);
    assert.ok(Math.abs(c.puppet.x - (start.x + 500)) < 30, "and the card is under it");
  }
});

test("the drop is one message with the holder's own landing, and every screen puts the card in exactly that place", () => {
  const w = room(["alice", "bob", "cy"]);
  const a = w.get("alice");
  const start = spot(a.stage, "ana");
  a.sync.grab("ana");
  const t0 = w.t;
  w.run(1500, { alice: (t, c) => c.sync.move("ana", start.x + 380 * Math.min(1, (t - t0) / 1000), start.z) });
  const result = a.sync.release("ana");
  w.run(2500);
  const places = ["alice", "bob", "cy"].map((id) => JSON.stringify(w.get(id).stage.placeOf("ana")));
  assert.equal(new Set(places).size, 1, `one place everywhere: ${places.join(" | ")}`);
  for (const id of ["alice", "bob", "cy"]) {
    const c = w.get(id);
    assert.equal(c.stage.cards.get("ana").holder, null);
    assert.equal(c.drops.length, 1, `${id} heard about the drop once, so a GM's screen can save it`);
    assert.equal(c.drops[0].card, "ana");
    assert.equal(c.drops[0].by, "alice");
  }
  assert.equal(w.get("bob").stage.cards.get("ana").mark, result.mark, "the mark the holder chose is the mark everyone chose");
  assert.equal(a.sync.mine.size + w.get("bob").sync.remote.size, 0, "nobody is left holding");
});

test("a furious wiggle sends at most thirty hand samples a second", () => {
  const w = room(["alice", "bob"]);
  const a = w.get("alice");
  const start = spot(a.stage, "ana");
  a.sync.grab("ana");
  const t0 = w.t;
  w.run(2000, { alice: (t, c) => c.sync.move("ana", start.x + 55 * Math.sin(2 * Math.PI * 3 * ((t - t0) / 1000)), start.z) });
  const moves = a.log.filter((m) => m.type === "move").length;
  assert.ok(moves <= 2 * 31, `${moves} samples in two seconds`);
  assert.ok(moves >= 2 * 20, "and enough of them to follow a wiggle");
  assert.ok(a.log.every((m) => JSON.stringify(m).length < 120), "each a small message");
});

test("a hand holding perfectly still sends a heartbeat, and is not mistaken for gone", () => {
  const w = room(["alice", "bob"]);
  const a = w.get("alice");
  a.sync.grab("ana");
  w.run(6000);                                                     // no movement at all for six seconds
  const heartbeats = a.log.filter((m) => m.type === "move").length;
  assert.ok(heartbeats >= 4 && heartbeats <= 8, `${heartbeats} heartbeats in six seconds`);
  assert.equal(w.get("bob").stage.cards.get("ana").holder, "alice", "still held on the other screen");
});

test("a holder who goes silent has the card let go after two seconds, where it was", () => {
  const w = room(["alice", "bob", "cy"]);
  const a = w.get("alice");
  const start = spot(a.stage, "ana");
  a.sync.grab("ana");
  const t0 = w.t;
  w.run(1000, { alice: (t, c) => c.sync.move("ana", start.x + 200 * Math.min(1, (t - t0) / 800), start.z) });
  a.sync.tick = () => {};                                          // alice's computer freezes: no heartbeats, no releases
  w.run(1500);
  assert.equal(w.get("bob").stage.cards.get("ana").holder, "alice", "not yet");
  w.run(1500);
  for (const id of ["bob", "cy"]) {
    assert.equal(w.get(id).stage.cards.get("ana").holder, null, `${id} let it go`);
    assert.equal(w.get(id).drops.length, 1);
  }
  const bobStage = w.get("bob").stage;
  const bob = bobStage.cards.get("ana");
  const mark = bob.mark ? bobStage.marks.find((m) => m.id === bob.mark) : null;
  const where = mark ? mark.X : bob.puppet.restX;                 // a card let go near a mark rests on it, as it would anywhere
  assert.ok(Math.abs(where - (start.x + 200)) < 200, `where it had been taken to (or the mark beside it): ${where} for ${start.x + 200}`);
  assert.ok(Math.abs(bob.puppet.x - where) < 5 || mark, "and it is there");
});

test("someone leaving lets go of their cards", () => {
  const w = room(["alice", "bob"]);
  w.get("alice").sync.grab("ana");
  w.run(500);
  w.get("bob").sync.userGone("alice");
  assert.equal(w.get("bob").stage.cards.get("ana").holder, null);
  assert.equal(w.get("bob").drops.length, 1);
  w.get("bob").sync.userGone("nobody");
});

test("two grabs at once: every screen decides the same way, the loser is told, and the earlier grab wins", () => {
  for (const [first, second, expected] of [["alice", "bob", "alice"], ["bob", "alice", "bob"]]) {
    const w = room(["alice", "bob", "cy"], { lag: [60, 5] });
    // `first` grabs 5 ms before `second`; both think they got it
    w.get(first).sync.grab("ana");
    w.t += 5;
    w.get(second).sync.grab("ana");
    assert.equal(w.get("alice").stage.cards.get("ana").holder, "alice");
    assert.equal(w.get("bob").stage.cards.get("ana").holder, "bob");
    w.run(600);
    for (const id of ["alice", "bob", "cy"]) assert.equal(w.get(id).stage.cards.get("ana").holder, expected, `${id} agrees`);
    const loser = expected === "alice" ? "bob" : "alice";
    assert.deepEqual(w.get(loser).lost, ["ana"], "the loser is told once");
    assert.deepEqual(w.get(expected).lost, []);
    assert.equal(w.get(loser).sync.mine.size, 0);
  }
});

test("a dead heat goes to the lower user id, on every screen", () => {
  const w = room(["alice", "bob", "cy"], { lag: [60, 5] });
  w.get("bob").sync.grab("ana");
  w.get("alice").sync.grab("ana");                                  // same millisecond
  w.run(600);
  for (const id of ["alice", "bob", "cy"]) assert.equal(w.get(id).stage.cards.get("ana").holder, "alice");
});

test("a third screen that sees the later grab first still ends up with the earlier one", () => {
  const w = room(["alice", "bob", "cy"], { lag: [20, 0] });
  // alice grabs first but her message to cy is slow; bob's reaches cy first
  w.get("alice").sync.grab("ana");
  w.t += 5;
  w.get("bob").sync.grab("ana");
  for (const m of w.wire) if (m.from === "alice" && m.to === "cy") m.due += 100;
  w.run(800);
  assert.equal(w.get("cy").stage.cards.get("ana").holder, "alice");
  assert.equal(w.get("cy").sync.remote.get("ana").by, "alice");
});

test("only people who may hold a card can: a grab from anyone else is ignored, and so are their moves", () => {
  const w = room(["alice", "bob"], { mayHold: (card, user) => user !== "mallory" && !(card === "bo" && user === "bob") });
  const mallory = new StageSync({ stage: w.get("bob").stage, scene: "sc", me: "bob", now: () => w.t, send: () => {}, mayHold: () => true });
  w.get("bob").sync.receive({ scene: "sc", type: "grab", id: "ana", t: w.t, x: 100, z: -300 }, "mallory");
  assert.equal(w.get("bob").stage.cards.get("ana").holder, null, "a grab by someone who may not is ignored");
  w.get("bob").sync.receive({ scene: "sc", type: "move", id: "ana", t: w.t, x: 100, z: -300 }, "mallory");
  assert.equal(w.get("bob").stage.cards.get("ana").holder, null, "and a move that would have been a late grab");
  assert.equal(w.get("bob").sync.grab("bo"), false, "bob may not hold bo");
  assert.equal(w.get("alice").sync.grab("bo"), true);
  assert.equal(mallory.mine.size, 0);
});

test("a stranger cannot move, make hop or put down a card someone else is holding", () => {
  const w = room(["alice", "bob", "cy"]);
  const a = w.get("alice");
  const start = spot(a.stage, "ana");
  a.sync.grab("ana");
  w.run(300);
  const cy = w.get("cy");
  cy.sync.receive({ scene: "sc", type: "move", id: "ana", t: w.t, x: start.x + 900, z: start.z }, "bob");
  cy.sync.receive({ scene: "sc", type: "verb", id: "ana", verb: "hop" }, "bob");
  cy.sync.receive({ scene: "sc", type: "release", id: "ana", t: w.t, X: 1000, Z: -1000, mark: null }, "bob");
  assert.equal(cy.stage.cards.get("ana").holder, "alice");
  assert.equal(cy.drops.length, 0);
  w.run(200);
  assert.ok(Math.abs(cy.stage.cards.get("ana").hand.x - start.x) < 5, "the hand did not move");
});

test("messages for another scene, from yourself, about a card that is not here, or malformed, are ignored", () => {
  const w = room(["alice", "bob"]);
  const b = w.get("bob");
  b.sync.receive({ scene: "elsewhere", type: "grab", id: "ana", t: w.t, x: 0, z: 0 }, "alice");
  b.sync.receive({ scene: "sc", type: "grab", id: "ana", t: w.t, x: 0, z: 0 }, "bob");
  b.sync.receive({ scene: "sc", type: "grab", id: "nobody", t: w.t, x: 0, z: 0 }, "alice");
  b.sync.receive(null, "alice");
  b.sync.receive({ scene: "sc", type: "dance", id: "ana" }, "alice");
  assert.equal(b.stage.cards.get("ana").holder, null);
});

test("a screen that joins while a card is held takes the next sample as the grab", () => {
  const w = room(["alice", "bob"]);
  w.get("alice").sync.grab("ana");
  for (const m of w.wire) m.due = Infinity;                          // bob never hears the grab
  w.wire.length = 0;
  const start = spot(w.get("alice").stage, "ana");
  w.run(1200, { alice: (t, c) => c.sync.move("ana", start.x + 100, start.z) });
  assert.equal(w.get("bob").stage.cards.get("ana").holder, "alice", "the heartbeat told bob");
});

test("a hop, a bow and the rest happen on every screen", () => {
  const w = room(["alice", "bob"]);
  const a = w.get("alice");
  a.sync.grab("ana");
  w.run(300);
  a.sync.verb("ana", "hop");
  w.run(150);
  const lift = (id) => w.get(id).stage.snapshot().cards.find((c) => c.id === "ana").lift;
  assert.ok(lift("bob") > 40 || lift("alice") > 40, "it hopped");
  assert.ok(Math.abs(lift("bob") - lift("alice")) < 60, "about the same on both");
  a.sync.verb("bo", "hop");                                          // a card she is not holding: nothing
  assert.equal(a.log.filter((m) => m.type === "verb").length, 1);
});

test("a held card that bumps a standing one bonks on the holder's screen and on everyone else's", () => {
  const w = room(["alice", "bob", "cy"]);
  const a = w.get("alice");
  const from = spot(a.stage, "ana");
  const target = spot(a.stage, "bo");
  a.sync.grab("ana");
  const t0 = w.t;
  w.run(1600, { alice: (t, c) => c.sync.move("ana", from.x + (target.x - from.x + 20) * Math.min(1, (t - t0) / 350), target.z) });
  for (const id of ["alice", "bob", "cy"]) {
    const bonks = w.get(id).bonks.filter((b) => [b.a, b.b].includes("ana") && [b.a, b.b].includes("bo"));
    assert.ok(bonks.length >= 1, `${id} saw the bang`);
  }
});

test("playback is smooth: the remote hand stays on the real path, delayed, under jittery lag", () => {
  for (const [lag, bound] of [[[40, 15], 3], [[70, 30], 12], [[120, 60], 25]]) {
    const w = room(["alice", "bob"], { lag });
    const a = w.get("alice");
    const start = spot(a.stage, "ana");
    a.sync.grab("ana");
    const t0 = w.t;
    const real = (t) => ({ x: start.x + 300 * Math.sin((t - t0) / 420), z: start.z - 150 + 120 * Math.sin((t - t0) / 310) });
    // bob's hook runs a moment before his own tick in each frame, so what he can be compared with is the frame before
    const was = (t) => real(t - FRAME - SYNC.delay);
    const errors = [];
    w.run(4000, {
      alice: (t, c) => { const p = real(t); c.sync.move("ana", p.x, p.z); },
      bob: (t, c) => {
        const hand = c.stage.cards.get("ana").hand;
        if (hand && t - t0 > 1500) { const p = was(t); errors.push(Math.hypot(hand.x - p.x, hand.z - p.z)); }
      }
    });
    errors.sort((x, y) => x - y);
    const p95 = errors[Math.floor(errors.length * 0.95)];
    assert.ok(p95 <= bound, `lag ${lag[0]} +- ${lag[1]} ms: 95% of the error is under ${bound}px (was ${p95.toFixed(1)})`);
  }
});

test("a screen whose clock is off by a few tens of milliseconds still plays the hand back smoothly", () => {
  const w = room(["alice", "bob"], { lag: [50, 10], skew: { bob: 30, alice: -20 } });
  const a = w.get("alice");
  const start = spot(a.stage, "ana");
  a.sync.grab("ana");
  const t0 = w.t;
  w.run(2500, { alice: (t, c) => c.sync.move("ana", start.x + 400 * Math.min(1, (t - t0) / 2000), start.z) });
  assert.ok(Math.abs(w.get("bob").stage.cards.get("ana").hand.x - (start.x + 400)) < 5);
});

test("closing lets go of whatever the local user holds, with the landing sent, so no one waits for the silence", () => {
  const w = room(["alice", "bob"]);
  w.get("alice").sync.grab("ana");
  w.run(400);
  w.get("alice").sync.close();
  w.run(400);
  assert.equal(w.get("bob").stage.cards.get("ana").holder, null, "well before two seconds");
  assert.equal(w.get("bob").drops.length, 1);
});

test("a card cannot be held twice: grabbing what someone else holds does nothing", () => {
  const w = room(["alice", "bob"]);
  w.get("alice").sync.grab("ana");
  w.run(400);
  assert.equal(w.get("bob").sync.grab("ana"), false, "bob's screen knows alice has it");
  assert.equal(w.get("bob").sync.mine.size, 0);
  assert.equal(w.get("bob").log, undefined, "and says nothing");
});

test("commitPlace writes where a card was put down into the cast, without touching anyone else", () => {
  const cast = [
    { id: "ana", name: "Ana", at: [0.2, 0.9], mark: "bar-1", yaw: 10 },
    { id: "bo", name: "Bo", X: 100, Z: -200, yaw: 3 }
  ];
  const free = commitPlace(cast, { id: "ana", at: [0.5, 0.88], mark: null, yaw: 34 });
  assert.deepEqual(free[0], { id: "ana", name: "Ana", at: [0.5, 0.88], yaw: 34 }, "a free drop forgets the old mark");
  assert.strictEqual(free[1], cast[1], "the others are the same objects");
  assert.equal(cast[0].mark, "bar-1", "and the original list is untouched");
  const marked = commitPlace(cast, { id: "bo", at: [0.3, 0.9], mark: "bar-2", yaw: 0 });
  assert.deepEqual(marked[1], { id: "bo", name: "Bo", at: [0.3, 0.9], mark: "bar-2", yaw: 0 }, "an old floor place gives way to the new one");
  assert.deepEqual(commitPlace(cast, { id: "nobody", at: [0, 0], mark: null, yaw: 0 }), cast);
});

test("many drops anywhere on the stage always end in the identical place on every screen", () => {
  const rnd = lcg(99);
  const w = room(["alice", "bob", "cy"], { seed: 3 });
  const a = w.get("alice");
  for (let i = 0; i < 40; i++) {
    const id = PEOPLE[i % PEOPLE.length].id;
    if (!a.sync.grab(id)) continue;
    const to = { x: -1500 + rnd() * 3000, z: -2000 + rnd() * 2000 };
    const t0 = w.t;
    const from = spot(a.stage, id);
    w.run(500, { alice: (t, c) => { const u = Math.min(1, (t - t0) / 300); c.sync.move(id, from.x + (to.x - from.x) * u, from.z + (to.z - from.z) * u); } });
    a.sync.release(id);
    w.run(600);
    const places = ["alice", "bob", "cy"].map((u) => JSON.stringify(w.get(u).stage.placeOf(id)));
    assert.equal(new Set(places).size, 1, `drop ${i} of ${id}: ${places.join(" | ")}`);
  }
});
