/**
 * Tests for run-personnel-scenario.mjs's pure CLI logic (design doc §19) — mirrors
 * run-scenario-cli.test.mjs's own coverage shape. No fieldBreaksAtRound coverage here — that's a
 * Day-1 ground-layer scripted-event concept with no personnel-engine equivalent (see
 * personnel-engine/engine.mjs's own header on why scriptedEvents was dropped entirely).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSeeds, parseArgs, planRuns } from "../../tools/battle-simulator/run-personnel-scenario.mjs";

test("parseSeeds: a range expands inclusively", () => {
  assert.deepEqual(parseSeeds("1-5"), [1, 2, 3, 4, 5]);
});

test("parseSeeds: a comma list is explicit, not a range", () => {
  assert.deepEqual(parseSeeds("5,1,3"), [5, 1, 3]);
});

test("parseArgs: reads --key=value pairs", () => {
  assert.deepEqual(parseArgs(["--scenario=lunar17-vs-security-goon-same-room", "--seed=1-20"]), { scenario: "lunar17-vs-security-goon-same-room", seed: "1-20" });
});

test("parseArgs: rejects a malformed argument rather than silently ignoring it", () => {
  assert.throws(() => parseArgs(["--scenario"]));
});

const FAKE_SCENARIOS = {
  alpha: { build: () => {}, label: "Alpha", defaultSeed: 111, roundLimit: 15 },
  beta: { build: () => {}, label: "Beta", defaultSeed: 222, roundLimit: 20 }
};

test("planRuns: no --scenario runs every known scenario (all three real room setups) at its own default seed", () => {
  const plans = planRuns({}, FAKE_SCENARIOS);
  assert.equal(plans.length, 2);
  assert.deepEqual(plans.map((p) => [p.scenario, p.seed]).sort(), [["alpha", 111], ["beta", 222]]);
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

test("planRuns against the REAL registry (no fake override): all three real Phase 1b room configurations, the three fixed 3v3 complex-battle setups (design doc §22), the randomized-arc 3v3 setup (design doc §35), the randomized-arc 4v4 setup and its no-maneuvers-baseline twin (design doc §38, §43), the two XP-budget-tier setups and the ranged-duel setup (design doc §39) are registered, each buildable without throwing", () => {
  const plans = planRuns({}); // no second arg -> the module's own real SCENARIOS
  const names = plans.map((p) => p.scenario).sort();
  assert.deepEqual(names, [
    "complex-2v4-moderate-random-arcs",
    "complex-3v3-diagonal-nw-se",
    "complex-3v3-diagonal-sw-ne",
    "complex-3v3-north-south-ends",
    "complex-3v3-random-arcs",
    "complex-3v4-severe-random-arcs",
    "complex-4v4-no-maneuvers-random-arcs",
    "complex-4v4-random-arcs",
    "lunar17-vs-security-goon-adjacent-rooms",
    "lunar17-vs-security-goon-far-rooms",
    "lunar17-vs-security-goon-same-room",
    "ranged-duel-obozaya-vs-kuriaku"
  ]);
  for (const plan of plans) {
    assert.doesNotThrow(() => plan.build({ seed: plan.seed, roundLimit: plan.roundLimit }), `${plan.scenario}: real buildScenario() call must not throw`);
  }
});
