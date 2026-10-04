// Tier 1 — core/table-knows.mjs and data/campaign/told-facts.json: what the
// table has been told so far (2026-10-04, D059).
//
// "What did they say about the founders?" gets the same answer every time:
// every fact a ticked beat says out loud, scene by scene, from the words the
// story build writes out of canon/world/.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { toldCount, toldSoFar } from "../module/blank-inheritance/scripts/core/table-knows.mjs";
import { loadModel, toldFactsFile } from "../tools/story/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const briefs = {
  a: { id: "a", title: "Scene A", beats: [{ id: "one", facts: ["x.one", "x.two"] }, { id: "two", facts: ["x.three"] }] },
  b: { id: "b", title: "Scene B", beats: [{ id: "one", facts: ["x.two", "x.four"] }] }
};
const facts = { "x.one": { text: "One." }, "x.two": { text: "Two." }, "x.four": { text: "Four." } };

test("only beats that have happened tell the table anything, in episode order", () => {
  const groups = toldSoFar({ order: [{ briefRef: "a", title: "Scene A" }, { briefRef: "b", title: "Scene B" }], briefs, runs: { a: { ticked: { one: {} } } }, facts });
  assert.deepEqual(groups.map((g) => g.title), ["Scene A"]);
  assert.deepEqual(groups[0].items.map((i) => i.text), ["One.", "Two."]);
  assert.equal(toldCount(groups), 2);
});

test("a fact told twice is listed where it was first told, and a fact with no words still shows by its id", () => {
  const groups = toldSoFar({
    order: [{ briefRef: "a", title: "Scene A" }, { briefRef: "b", title: "Scene B" }],
    briefs,
    runs: { a: { ticked: { one: {}, two: {} } }, b: { ticked: { one: {} } } },
    facts
  });
  assert.deepEqual(groups.map((g) => g.items.map((i) => i.id)), [["x.one", "x.two", "x.three"], ["x.four"]]);
  assert.equal(groups[0].items[2].text, "x.three", "an unknown id is shown rather than dropped");
  assert.equal(toldCount([]), 0);
});

test("told-facts.json is exactly what the story build makes from canon (story check fails otherwise)", () => {
  const model = loadModel(ROOT);
  const onDisk = readFileSync(path.join(ROOT, "data", "campaign", "told-facts.json"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(onDisk, toldFactsFile(model), "run `node tools/story/story.mjs build`");
});

test("REAL DATA: every fact an Episode One beat says aloud has its words, and no fact only a GM relies on is in the file", () => {
  const told = JSON.parse(readFileSync(path.join(ROOT, "data", "campaign", "told-facts.json"), "utf8")).facts;
  const said = new Set();
  const reliedOnly = new Set();
  for (const file of readdirSync(path.join(ROOT, "canon", "scenes")).filter((f) => f.endsWith(".json"))) {
    const brief = JSON.parse(readFileSync(path.join(ROOT, "canon", "scenes", file), "utf8"));
    for (const b of brief.beats ?? []) {
      for (const id of b.facts ?? []) said.add(id);
      for (const id of b.gmFacts ?? []) reliedOnly.add(id);
    }
  }
  for (const id of said) assert.ok(told[id]?.text, `${id} is said aloud but has no words in told-facts.json`);
  for (const id of reliedOnly) if (!said.has(id)) assert.ok(!(id in told), `${id} is only ever a GM fact, and must not be in the table's list`);
});
