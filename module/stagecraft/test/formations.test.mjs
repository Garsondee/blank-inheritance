// Formations on the floor (core/formations.mjs): where everyone stands, in one press.

import { test } from "node:test";
import assert from "node:assert/strict";
import { arrange, FORMATIONS } from "../scripts/core/formations.mjs";

const cards = [
  { id: "kiku", X: -300, Z: -700, w: 174 },
  { id: "sanzo", X: 200, Z: -650, w: 174 },
  { id: "tama", X: 500, Z: -800, w: 174 },
  { id: "pc-1", X: -200, Z: -100, w: 174, pc: true },
  { id: "pc-2", X: 200, Z: -100, w: 174, pc: true }
];
const focus = { X: 0, Z: -600 };
const by = (list) => new Map(list.map((p) => [p.id, p]));

test("every formation is real, and each places only who it was given", () => {
  for (const kind of FORMATIONS) {
    const out = arrange(kind, { cards, focus });
    assert.ok(out.length >= 1, kind);
    for (const p of out) {
      assert.ok(Number.isFinite(p.X) && Number.isFinite(p.Z) && Number.isFinite(p.yaw), `${kind}: ${p.id} has a place`);
      assert.ok(Math.abs(p.yaw) <= 60, `${kind}: ${p.id} keeps its face to the table (${p.yaw})`);
    }
  }
});

test("the party's cards are the players': a formation leaves them be unless asked", () => {
  const ids = arrange("line", { cards, focus }).map((p) => p.id);
  assert.deepEqual(ids.sort(), ["kiku", "sanzo", "tama"]);
  const all = arrange("line", { cards, focus, party: true }).map((p) => p.id);
  assert.equal(all.length, 5);
  const target = arrange("gangup", { cards, focus, target: "pc-1" }).map((p) => p.id);
  assert.ok(target.includes("pc-1"), "the one ganged up on is moved, even one of the party");
});

test("a huddle is close, turned in and leaning in, and never a pile-up: every face stays in view", () => {
  const out = arrange("huddle", { cards, focus, party: true });
  for (const p of out) {
    assert.ok(Math.hypot(p.X - focus.X, p.Z - focus.Z) < 700, `${p.id} is close`);
    assert.ok(Math.sign(p.yaw) === Math.sign(focus.X - p.X) || Math.abs(p.X - focus.X) < 20, `${p.id} turns in`);
    assert.ok(p.pitch > 0, "heads bowed in");
  }
  const left = out.find((p) => p.X < focus.X - 20);
  assert.ok(left.lean > 0, "the one on the left leans towards the middle");
  // regression, 2026-10-03: three people huddled round the notebook all but covered each other
  const xs = out.map((p) => p.X).sort((a, b) => a - b);
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] - xs[i - 1] >= 174 * 0.85, `neighbours stand apart (${(xs[i] - xs[i - 1]).toFixed(0)})`);
  const three = arrange("huddle", { cards: cards.slice(0, 3), focus });
  const t = three.map((p) => p.X).sort((a, b) => a - b);
  assert.ok(t[1] - t[0] >= 174 * 0.85 && t[2] - t[1] >= 174 * 0.85, "three in a huddle stand apart too");
});

test("two people talking face each other, and the rest listen a step back", () => {
  const out = by(arrange("talk", { cards, focus, speakers: ["tama", "kiku"] }));
  const a = out.get("tama");
  const b = out.get("kiku");
  assert.ok(a.X < focus.X && b.X > focus.X, "either side of the gap");
  assert.ok(a.yaw > 0 && b.yaw < 0, "turned to each other");
  assert.ok(out.get("sanzo").Z < a.Z, "the listener stands further back");
});

test("a gang-up: the target front and centre, the crowd closing round behind", () => {
  const out = by(arrange("gangup", { cards, focus, target: "sanzo" }));
  const t = out.get("sanzo");
  assert.equal(t.X, focus.X);
  for (const id of ["kiku", "tama"]) {
    const p = out.get(id);
    assert.ok(p.Z < t.Z, `${id} is behind the target`);
    assert.ok(Math.sign(p.yaw) === Math.sign(t.X - p.X), `${id} faces the target`);
  }
});

test("nobody has to cross anybody: left to right before, left to right after", () => {
  const out = arrange("line", { cards, focus });
  const order = [...out].sort((a, b) => a.X - b.X).map((p) => p.id);
  assert.deepEqual(order, ["kiku", "sanzo", "tama"]);
});

test("a queue goes back from the focus, the one nearest the front first", () => {
  const out = arrange("queue", { cards, focus });
  const sorted = [...out].sort((a, b) => b.Z - a.Z).map((p) => p.id);
  assert.equal(sorted[0], "sanzo", "sanzo stood nearest the front, so is first");
  for (let i = 1; i < out.length; i++) assert.ok(out.find((p) => p.id === sorted[i]).Z < out.find((p) => p.id === sorted[i - 1]).Z);
});

test("a queue can run sideways along a counter, the head facing upstage and the rest facing the head", () => {
  const out = arrange("queue", { cards, focus, dir: "left" });
  const sorted = [...out].sort((a, b) => b.X - a.X);
  assert.equal(sorted[0].X, focus.X, "the head stands at the counter");
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(sorted[i].X < sorted[i - 1].X, "each further to the left");
    assert.ok(Math.abs(sorted[i].Z - focus.Z) < 80, "all along the counter, not back into it");
    assert.ok(sorted[i].yaw > 0, "facing right, towards the head");
  }
});

test("an audience stands well forward of what it watches, in two groups with the middle open, facing it", () => {
  const limits = { x: [-1800, 1800], z: [-2300, 200] };
  const deep = { X: 0, Z: -1800 };
  const out = arrange("audience", { cards, focus: deep, limits, party: true });
  assert.equal(out.length, cards.length);
  for (const p of out) {
    assert.ok(p.Z > deep.Z + 1000, `${p.id} stands near the front, not in front of the stage's nose (${p.Z})`);
    assert.ok(Math.abs(p.X - deep.X) > 150, `${p.id} leaves the middle open (${p.X})`);
    assert.ok(Math.sign(p.yaw) === Math.sign(deep.X - p.X), `${p.id} turns towards the stage`);
  }
  assert.ok(out.some((p) => p.X < 0) && out.some((p) => p.X > 0), "a group either side");
});

test("a stand-off: the scene's people one side, the party the other", () => {
  const out = by(arrange("standoff", { cards, focus, party: true }));
  for (const id of ["kiku", "sanzo", "tama"]) assert.ok(out.get(id).X < focus.X, `${id} on the left`);
  for (const id of ["pc-1", "pc-2"]) assert.ok(out.get(id).X > focus.X, `${id} on the right`);
});

test("a formation stays on the floor it is given", () => {
  const limits = { x: [-400, 400], z: [-900, 100] };
  for (const kind of FORMATIONS) for (const p of arrange(kind, { cards, focus, limits, party: true })) {
    assert.ok(p.X >= -400 && p.X <= 400 && p.Z >= -900 && p.Z <= 100, `${kind}: ${p.id} inside`);
  }
});
