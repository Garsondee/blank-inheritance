import { test } from "node:test";
import assert from "node:assert/strict";
import { scenarioOptions, outcomeOptions, filterRuns, sortRuns, applyLibraryView } from "../../tools/battle-simulator/artifact/library.mjs";

const RUNS = [
  { id: "escort@1", scenario: "escort", seed: 1, outcome: "party-victory", rounds: 5, utilization: 0.9, generatedAt: "2026-08-20T00:00:00Z" },
  { id: "escort@2", scenario: "escort", seed: 2, outcome: "stalemate", rounds: 8, utilization: 0.4, generatedAt: "2026-08-22T00:00:00Z" },
  { id: "melee@1", scenario: "melee-draws-fire", seed: 1, outcome: "party-victory", rounds: 6, utilization: 0.7, generatedAt: "2026-08-21T00:00:00Z" }
];

test("scenarioOptions: every distinct scenario, first-seen order, no duplicates", () => {
  assert.deepEqual(scenarioOptions(RUNS), ["escort", "melee-draws-fire"]);
});

test("outcomeOptions: every distinct outcome, first-seen order", () => {
  assert.deepEqual(outcomeOptions(RUNS), ["party-victory", "stalemate"]);
});

test("filterRuns: no filter returns everything", () => {
  assert.equal(filterRuns(RUNS, {}).length, 3);
  assert.equal(filterRuns(RUNS, { scenario: "all", outcome: "all" }).length, 3);
});

test("filterRuns: filters by scenario", () => {
  const result = filterRuns(RUNS, { scenario: "escort" });
  assert.equal(result.length, 2);
  assert.ok(result.every((r) => r.scenario === "escort"));
});

test("filterRuns: filters by outcome", () => {
  const result = filterRuns(RUNS, { outcome: "party-victory" });
  assert.equal(result.length, 2);
});

test("filterRuns: both filters combine (AND, not OR)", () => {
  const result = filterRuns(RUNS, { scenario: "escort", outcome: "party-victory" });
  assert.deepEqual(result.map((r) => r.id), ["escort@1"]);
});

test("sortRuns: newest first by generatedAt", () => {
  assert.deepEqual(sortRuns(RUNS, "newest").map((r) => r.id), ["escort@2", "melee@1", "escort@1"]);
});

test("sortRuns: oldest first is the exact reverse", () => {
  assert.deepEqual(sortRuns(RUNS, "oldest").map((r) => r.id), ["escort@1", "melee@1", "escort@2"]);
});

test("sortRuns: by utilization, highest first", () => {
  assert.deepEqual(sortRuns(RUNS, "utilization").map((r) => r.id), ["escort@1", "melee@1", "escort@2"]);
});

test("sortRuns: does not mutate the input array", () => {
  const copy = [...RUNS];
  sortRuns(RUNS, "oldest");
  assert.deepEqual(RUNS, copy);
});

test("sortRuns: an unknown sort key falls back to newest rather than throwing", () => {
  assert.deepEqual(sortRuns(RUNS, "not-a-real-sort"), sortRuns(RUNS, "newest"));
});

test("applyLibraryView: filters then sorts in one call", () => {
  const result = applyLibraryView(RUNS, { scenario: "escort", sortKey: "oldest" });
  assert.deepEqual(result.map((r) => r.id), ["escort@1", "escort@2"]);
});
