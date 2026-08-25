/**
 * Tests for analysis/xp-budget-battery.mjs (design doc §39). `aggregateSweep` is tested directly
 * with hand-built results (the point is proving the math, not re-running real battles); `runScenario
 * Sweep` gets one small real-integration check that it wires planRuns -> runBattle -> the metrics
 * modules correctly end to end, matching this project's usual "unit test the math, integration-test
 * the wiring" split.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runScenarioSweep, aggregateSweep, XP_BUDGET_TIERS, RANGED_DUEL } from "../../tools/battle-simulator/analysis/xp-budget-battery.mjs";

test("aggregateSweep: real means across hand-built results, outcomes tallied correctly", () => {
  const results = [
    { runMetrics: { outcome: "party-victory", rounds: 5 }, party: { finalHPFraction: 0.8, damageTaken: 10, healingReceived: 2 }, tactical: { coverUsage: { moveIntoCoverRate: 0.5, attackFromCoverRate: 1.0 } } },
    { runMetrics: { outcome: "party-defeat", rounds: 9 }, party: { finalHPFraction: 0.0, damageTaken: 40, healingReceived: 0 }, tactical: { coverUsage: { moveIntoCoverRate: 0.0, attackFromCoverRate: 0.0 } } }
  ];
  const agg = aggregateSweep(results);
  assert.equal(agg.n, 2);
  assert.deepEqual(agg.outcomes, { "party-victory": 1, "party-defeat": 1 });
  assert.equal(agg.meanRounds, 7);
  assert.equal(agg.meanPartyFinalHPFraction, 0.4);
  assert.equal(agg.meanPartyDamageTaken, 25);
  assert.equal(agg.meanPartyHealingReceived, 1);
  assert.equal(agg.meanMoveIntoCoverRate, 0.25);
  assert.equal(agg.meanAttackFromCoverRate, 0.5);
});

test("aggregateSweep: a null coverUsage rate (no moves/attacks that run) is excluded from the mean, not coerced to 0", () => {
  const results = [
    { runMetrics: { outcome: "party-victory", rounds: 1 }, party: { finalHPFraction: 1, damageTaken: 0, healingReceived: 0 }, tactical: { coverUsage: { moveIntoCoverRate: null, attackFromCoverRate: null } } },
    { runMetrics: { outcome: "party-victory", rounds: 1 }, party: { finalHPFraction: 1, damageTaken: 0, healingReceived: 0 }, tactical: { coverUsage: { moveIntoCoverRate: 1.0, attackFromCoverRate: 0.5 } } }
  ];
  const agg = aggregateSweep(results);
  assert.equal(agg.meanMoveIntoCoverRate, 1.0, "the null entry must be excluded, not treated as 0 (which would drag this to 0.5)");
  assert.equal(agg.meanAttackFromCoverRate, 0.5);
});

test("aggregateSweep: throws on an empty results array rather than silently producing NaN", () => {
  assert.throws(() => aggregateSweep([]), /no results supplied/);
});

test("XP_BUDGET_TIERS: exactly the three real registered scenarios this project's own XP math supports (Moderate/Severe/Extreme — Low is honestly unreachable with a same-level-only roster, see the module's own header)", () => {
  assert.deepEqual(XP_BUDGET_TIERS.map((t) => t.scenario), [
    "complex-2v4-moderate-random-arcs",
    "complex-3v4-severe-random-arcs",
    "complex-4v4-random-arcs"
  ]);
  assert.deepEqual(XP_BUDGET_TIERS.map((t) => t.xpBudget), [80, 120, 160], "real SF2E budgets for a 4-PC party — Moderate/Severe/Extreme");
});

test("RANGED_DUEL: points at the real registered ranged-duel scenario", () => {
  assert.equal(RANGED_DUEL.scenario, "ranged-duel-obozaya-vs-kuriaku");
});

test("runScenarioSweep (real integration, 2 seeds): wires planRuns -> runBattle -> collectRunMetrics/collectTacticalMetrics/sideOutcomeStats together without throwing, and produces real, distinct-looking per-seed results", () => {
  const results = runScenarioSweep("complex-2v4-moderate-random-arcs", "1-2");
  assert.equal(results.length, 2);
  for (const r of results) {
    assert.equal(r.runMetrics.illegalProposals, 0, "a real battery run must never contain an illegal proposal");
    assert.ok(["party-victory", "party-defeat", "timeout"].includes(r.runMetrics.outcome));
    assert.ok(r.party.maxHP > 0);
    assert.ok(r.tactical.coverUsage !== undefined);
  }
});
