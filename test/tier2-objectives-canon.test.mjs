// Tier 2 — the objectives rule over canon (design/objectives.md §2, D057).
//
// The real tree passes; then each rule is proven to fire by breaking a copy of the real model one way at a time, so a
// rule that quietly stops working fails here instead of letting an objective with no giver, words nobody said, an
// unmarked part or a fourth-and-fifth objective per episode through.

import { test } from "node:test";
import assert from "node:assert/strict";

import { loadModel, checkModel } from "../tools/story/lib.mjs";
import { MAX_GROUP_OBJECTIVES_PER_EPISODE, normalizeWords, saidFragments } from "../tools/story/objectives.mjs";

const real = loadModel();
const clone = () => structuredClone(real);
const objErrors = (m) => checkModel(m).filter((p) => p.level === "error" && /objectives|→ (give|docket|drains|enrolment|close)/.test(p.where + p.message)).map((p) => `${p.where}: ${p.message}`);
const obj = (m, id) => m.objectives.find((o) => o.id === id).json;
const expectError = (m, re) => {
  const errs = checkModel(m).filter((p) => p.level === "error").map((p) => `${p.where}: ${p.message}`);
  assert.ok(errs.some((e) => re.test(e)), `expected an error matching ${re}; got:\n${errs.join("\n")}`);
};

test("Episode One has its three objectives, and they pass every rule", () => {
  assert.deepEqual(real.objectives.map((o) => o.id).sort(), ["c1e1-report-for-enrolment", "c1e1-storm-drains", "c1e1-the-docket"]);
  assert.deepEqual(objErrors(real), []);
});

test("the giver's words must be in the giving scene", () => {
  const m = clone();
  obj(m, "c1e1-the-docket").said = "Fetch me a sandwich.";
  expectError(m, /"said" must be the giver's own words/);
});

test("quotes match whatever typography the scene used, and may skip ahead with an ellipsis", () => {
  assert.deepEqual(saidFragments("One. … Two."), ["one.", "two."]);
  assert.equal(normalizeWords("“Back to me” by  nineteen"), "back to me by nineteen");
});

test("the giver must be there: in the scene's cast, or on the paper it came on", () => {
  const m = clone();
  const o = obj(m, "c1e1-storm-drains");
  o.giver.npcRef = "nobu";
  expectError(m, /isn't in episode-c1e1--canteen's cast/);
});

test("every part is marked, and at least one is required", () => {
  const m = clone();
  obj(m, "c1e1-the-docket").parts[0].need = "maybe";
  expectError(m, /marked required or optional/);
  const m2 = clone();
  for (const p of obj(m2, "c1e1-report-for-enrolment").parts) p.need = "optional";
  expectError(m2, /at least one required part/);
});

test("a direct order with a deadline states what missing it costs", () => {
  const m = clone();
  delete obj(m, "c1e1-the-docket").deadline.cost;
  expectError(m, /states what missing it costs/);
});

test("every required part is ticked or struck in some scene, and a hidden one revealed", () => {
  const m = clone();
  for (const s of m.scenes) for (const b of s.json.beats || []) b.triggers = (b.triggers || []).filter((t) => t.id !== "drains-powered");
  expectError(m, /power: a required part needs a scene that ticks it/);
  const m2 = clone();
  for (const s of m2.scenes) for (const b of s.json.beats || []) b.triggers = (b.triggers || []).filter((t) => t.id !== "docket-manakos-way");
  expectError(m2, /requisition: a hidden part needs a scene that reveals it/);
});

test("nothing happens to an objective before it is given, and it is given where it says", () => {
  const m = clone();
  const early = m.scenes.find((s) => s.id === "episode-c1e1--assembly").json.beats[0];
  early.triggers = [...(early.triggers || []), { id: "too-soon", kind: "objective", act: "tick", objectiveRef: "c1e1-storm-drains", partRef: "waders" }];
  expectError(m, /ticks c1e1-storm-drains before it is given/);
});

test("a trigger naming a missing objective or part is an error", () => {
  const m = clone();
  const b = m.scenes.find((s) => s.id === "episode-c1e1--canteen").json.beats[0];
  b.triggers = [...(b.triggers || []), { id: "x", kind: "objective", act: "tick", objectiveRef: "c1e1-storm-drains", partRef: "no-such-part" }, { id: "y", kind: "objective", act: "give", objectiveRef: "nope" }];
  expectError(m, /partRef no-such-part is not a part/);
  expectError(m, /objectiveRef nope is not in canon\/objectives/);
});

test("no more than four group objectives in one episode", () => {
  const m = clone();
  const base = m.objectives.find((o) => o.id === "c1e1-the-docket");
  for (let i = 0; i < MAX_GROUP_OBJECTIVES_PER_EPISODE; i++) m.objectives.push({ ...structuredClone(base), id: `extra-${i}`, file: `extra-${i}.json`, json: { ...structuredClone(base.json), id: `extra-${i}` } });
  expectError(m, /group objectives in one episode; no more than 4/);
});

test("its words may only tell facts the giving scene is allowed to tell", () => {
  const m = clone();
  obj(m, "c1e1-report-for-enrolment").facts = ["directorate.orders-serious"];
  expectError(m, /tell directorate.orders-serious, which the players aren't told by episode-c1e1--the-road-in/);
});

test("the built copies in data/objectives match canon", () => {
  for (const o of real.objectives) {
    const built = real.built[`data/objectives/${o.file}`];
    assert.ok(built && built.copy !== null, `${o.file} is built`);
    assert.equal(built.copy.replace(/\r\n/g, "\n"), built.source.replace(/\r\n/g, "\n"));
  }
});
