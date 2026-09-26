// Tier 1 — the demo mode's pure walk (core/demo.mjs). What a step actually
// DOES is Foundry-touching and lives in foundry/demo-runner.mjs, verified
// live per ideas/entries/ui-demo-walkthrough-system.json's own "never
// mocked" rule; this is only the shape of "which step, can it advance".

import { test } from "node:test";
import assert from "node:assert/strict";

import { advanceDemo, demoState, retreatDemo, validateDemo } from "../module/blank-inheritance/scripts/core/demo.mjs";

const steps = ["a", "b", "c"];

test("demoState clamps to a real step, never past either end", () => {
  assert.equal(demoState(steps, 0).step, "a");
  assert.equal(demoState(steps, 1).step, "b");
  assert.equal(demoState(steps, -5).step, "a", "never negative");
  assert.equal(demoState(steps, 99).step, "c", "never past the last step");
});

test("demoState reports first/last and a human progress label", () => {
  assert.equal(demoState(steps, 0).isFirst, true);
  assert.equal(demoState(steps, 0).isLast, false);
  assert.equal(demoState(steps, 2).isLast, true);
  assert.equal(demoState(steps, 1).progress, "2/3");
});

test("demoState on an empty step list is honestly empty, not an error", () => {
  const s = demoState([], 0);
  assert.equal(s.step, null);
  assert.equal(s.count, 0);
  assert.equal(s.progress, "0/0");
});

test("advanceDemo/retreatDemo move one step and clamp at the ends, never wrapping", () => {
  assert.equal(advanceDemo(steps, 0), 1);
  assert.equal(advanceDemo(steps, 2), 2, "advancing past the last step holds there");
  assert.equal(retreatDemo(steps, 1), 0);
  assert.equal(retreatDemo(steps, 0), 0, "retreating before the first step holds there");
});

test("validateDemo names every problem with a real demo definition, and finds none in a good one", () => {
  const good = {
    id: "x", titleKey: "X.Title", seat: "player",
    steps: [{ id: "s1", narrationKey: "X.S1", run: async () => {} }]
  };
  assert.deepEqual(validateDemo(good), []);

  assert.deepEqual(validateDemo({}), ["missing id", "missing titleKey", "missing seat", "no steps"]);

  const badStep = { id: "x", titleKey: "X.Title", seat: "player", steps: [{ id: "s1" }] };
  const problems = validateDemo(badStep);
  assert.ok(problems.some((p) => p.includes("missing narrationKey")));
  assert.ok(problems.some((p) => p.includes("missing run()")));
});
