// The re-mark (tools/story/remark.mjs, D070): "The only content you should treat as 'ink' is the Episode 1 stuff and
// the induction stuff. Treat everything else as 'Pencil' until I have a chance to go through it."
import { test } from "node:test";
import assert from "node:assert/strict";

import { loadModel, factIndex } from "../../tools/story/lib.mjs";
import { inkSet, plan, EPISODE_ONE_EXTRA, INDUCTION_FACTS } from "../../tools/story/remark.mjs";

test("REAL DATA: the re-mark holds: nothing outside Episode One and the induction is still ink", () => {
  const { moves } = plan(loadModel());
  assert.deepEqual(moves.map((m) => `${m.file} ${m.id} (${m.from})`), [], "a fact outside Episode One is ink: pencil it, or name what in Episode One relies on it");
});

test("REAL DATA: the induction's facts and Episode One's play material outside the beats are listed, exist and are ink", () => {
  const facts = factIndex(loadModel());
  assert.ok(Object.keys(INDUCTION_FACTS).length >= 12, "the list is explicit");
  for (const id of [...Object.keys(INDUCTION_FACTS), ...Object.keys(EPISODE_ONE_EXTRA)]) {
    const f = facts.get(id);
    assert.ok(f, `${id} is not a canon fact`);
    assert.notEqual(f.status, "sketch", `${id} must stay ink`);
  }
});

test("REAL DATA: Ingram's ruling on the year is ink (D070)", () => {
  const f = factIndex(loadModel()).get("era.present-year");
  assert.equal(f.status, "decided");
  assert.match(f.text, /4921 AR/);
});

test("ink is what Episode One tells or relies on, plus the truth behind it", () => {
  const fact = (id, extra = {}) => ({ id, entity: id.split(".")[0], text: "x", status: "decided", source: ["D001"], told: "later", truth: null, ...extra });
  const m = {
    scenes: [{ id: "s0", json: { beats: [{ id: "b", facts: ["a.told"], gmFacts: ["a.secret"] }] } }],
    objectives: [{ id: "o", json: { facts: ["a.ordered"] } }],
    decisions: [],
    world: [{ id: "a", facts: [
      fact("a.told"), fact("a.secret", { truth: "a.underneath" }), fact("a.underneath"), fact("a.ordered"),
      fact("a.start", { told: "start" }), fact("a.in-scene", { told: "in:s0" }), fact("a.later"),
    ] }],
  };
  const ink = inkSet(m);
  for (const id of ["a.told", "a.secret", "a.underneath", "a.ordered", "a.start", "a.in-scene"]) assert.ok(ink.has(id), id);
  assert.ok(!ink.has("a.later"));
  assert.deepEqual(plan(m).moves.map((x) => [x.id, x.to, x.by]), [["a.later", "sketch", "ingram"]]);
});
