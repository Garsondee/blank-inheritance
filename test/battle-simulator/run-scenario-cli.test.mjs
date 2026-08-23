/**
 * Tests for run-scenario.mjs's pure CLI logic — argument parsing and run
 * planning. Deliberately excludes main() itself (file I/O, real battles);
 * these are the parts a sweep's correctness actually depends on.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSeeds, parseArgs, planRuns } from "../../tools/battle-simulator/run-scenario.mjs";

test("parseSeeds: a range expands inclusively", () => {
  assert.deepEqual(parseSeeds("1000-1004"), [1000, 1001, 1002, 1003, 1004]);
});

test("parseSeeds: a comma list is explicit, not a range", () => {
  assert.deepEqual(parseSeeds("5,1,3"), [5, 1, 3]);
});

test("parseSeeds: a single value is a one-element list", () => {
  assert.deepEqual(parseSeeds("42"), [42]);
});

test("parseSeeds: rejects a backwards range rather than silently producing nothing", () => {
  assert.throws(() => parseSeeds("10-5"));
});

test("parseArgs: reads --key=value pairs", () => {
  assert.deepEqual(parseArgs(["--scenario=escort", "--seed=1000-1004", "--roundLimit=8"]), { scenario: "escort", seed: "1000-1004", roundLimit: "8" });
});

test("parseArgs: rejects a malformed argument rather than silently ignoring it", () => {
  assert.throws(() => parseArgs(["--scenario"]));
});

const FAKE_SCENARIOS = {
  alpha: { build: () => {}, label: "Alpha", defaultSeed: 111, roundLimit: 8 },
  beta: { build: () => {}, label: "Beta", defaultSeed: 222, fieldBreaksAtRound: 3, roundLimit: 10 }
};

test("planRuns: no --scenario runs every known scenario at its own default seed", () => {
  const plans = planRuns({}, FAKE_SCENARIOS);
  assert.equal(plans.length, 2);
  assert.deepEqual(plans.map((p) => [p.scenario, p.seed]).sort(), [["alpha", 111], ["beta", 222]]);
});

test("planRuns: --scenario=all is equivalent to omitting it", () => {
  assert.deepEqual(planRuns({ scenario: "all" }, FAKE_SCENARIOS), planRuns({}, FAKE_SCENARIOS));
});

test("planRuns: a seed range crossed with multiple scenarios is the full cartesian product", () => {
  const plans = planRuns({ scenario: "alpha,beta", seed: "1-3" }, FAKE_SCENARIOS);
  assert.equal(plans.length, 6, "2 scenarios x 3 seeds = 6 planned runs");
});

test("planRuns: rejects an unknown scenario name rather than silently skipping it", () => {
  assert.throws(() => planRuns({ scenario: "not-a-real-scenario" }, FAKE_SCENARIOS), /Unknown scenario/);
});

test("planRuns: --roundLimit override applies to every planned run", () => {
  const plans = planRuns({ scenario: "alpha,beta", roundLimit: "3" }, FAKE_SCENARIOS);
  assert.ok(plans.every((p) => p.roundLimit === 3));
});

test("planRuns: --fieldBreaksAtRound=none explicitly clears a scenario's own default rather than being ignored", () => {
  const [plan] = planRuns({ scenario: "beta", fieldBreaksAtRound: "none" }, FAKE_SCENARIOS);
  assert.equal(plan.fieldBreaksAtRound, undefined);
});
