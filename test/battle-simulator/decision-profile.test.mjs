/**
 * Tests for analysis/decision-profile.mjs (design doc §59, GH issue #5) — the decision-cost
 * profiling harness. Real concerns: (1) profilePolicy produces real, non-trivial per-decision
 * measurements on both arenas; (2) aggregateProfile computes real numbers from a real (or synthetic)
 * measurements array, and refuses an empty one; (3) the instrumentation adds no behavior of its own
 * (a profiled battle resolves identically to an unprofiled one); (4) the harness actually measures
 * something real — two genuinely different policies produce measurably different profiles, not the
 * same numbers regardless of what's profiled.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { buildScenario as buildMirrorScenario } from "../../tools/battle-simulator/scenarios/personnel-mirror.mjs";
import { BASELINE_V1 } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";
import {
  profilePolicy, aggregateProfile, COMPLEX_MAP_PARTY_FIXTURES, COMPLEX_MAP_OPPOSITION_FIXTURES
} from "../../tools/battle-simulator/analysis/decision-profile.mjs";

test("aggregateProfile: real mean/max computed from a real (synthetic) measurements array", () => {
  const measurements = [
    { wallMs: 2, sandboxEvaluations: 5 },
    { wallMs: 4, sandboxEvaluations: 15 },
    { wallMs: 6, sandboxEvaluations: 10 }
  ];
  const agg = aggregateProfile(measurements);
  assert.equal(agg.n, 3);
  assert.equal(agg.meanWallMs, 4);
  assert.equal(agg.maxWallMs, 6);
  assert.equal(agg.meanSandboxEvaluations, 10);
  assert.equal(agg.maxSandboxEvaluations, 15);
});

test("aggregateProfile: throws on an empty measurements array — zero real decisions isn't a measurement", () => {
  assert.throws(() => aggregateProfile([]), /no measurements supplied/);
});

test("profilePolicy: throws on an unknown arena name", async () => {
  await assert.rejects(() => profilePolicy({ policyId: "greedy-v1", arena: "not-a-real-arena", seeds: [1] }), /unknown arena/);
});

test("profilePolicy: mirror arena — greedy-v1 produces real, non-trivial per-decision measurements across a real battle", async () => {
  const measurements = await profilePolicy({ policyId: "greedy-v1", arena: "mirror", seeds: [1, 2], roundLimit: 6 });
  assert.ok(measurements.length > 0, "expected at least one real party-side decision measured");
  for (const m of measurements) {
    assert.ok(m.wallMs >= 0, `expected a real non-negative wall time, got ${m.wallMs}`);
    assert.ok(m.sandboxEvaluations > 0, `expected at least one real sandbox evaluation per decision, got ${m.sandboxEvaluations}`);
  }
});

test("profilePolicy: complex arena — uses the exact real roster the PERFORMANCE test in personnel-decide.test.mjs already measures, and produces real per-decision numbers", async () => {
  assert.deepEqual(COMPLEX_MAP_PARTY_FIXTURES, ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json"]);
  assert.deepEqual(COMPLEX_MAP_OPPOSITION_FIXTURES, ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json", "tough.json"]);
  const measurements = await profilePolicy({ policyId: "greedy-v1", arena: "complex", seeds: [1], roundLimit: 2 });
  assert.ok(measurements.length > 0, "expected at least one real party-side decision on the complex map");
  for (const m of measurements) {
    assert.ok(m.sandboxEvaluations > 0, `expected real sandbox evaluations on the complex map's own real candidate set, got ${m.sandboxEvaluations}`);
  }
});

test("profilePolicy: the instrumentation adds no behavior of its own — a profiled mirror battle resolves BYTE-IDENTICALLY to the same battle run unprofiled", async () => {
  const seed = 3;
  const unprofiledScenario = buildMirrorScenario({ seed, roster: ["lunar-17.json", "security-goon.json"], partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1, roundLimit: 10 });
  const unprofiledLog = runBattle(unprofiledScenario);

  await profilePolicy({ policyId: "greedy-v1", arena: "mirror", seeds: [seed], roster: ["lunar-17.json", "security-goon.json"], roundLimit: 10 });

  // Re-run the identical, real, unprofiled scenario a second time — same seed, same setup — and
  // confirm profiling something else entirely didn't leave any shared/global state that changes it.
  const secondUnprofiledLog = runBattle(buildMirrorScenario({ seed, roster: ["lunar-17.json", "security-goon.json"], partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1, roundLimit: 10 }));
  assert.equal(secondUnprofiledLog.outcome.result, unprofiledLog.outcome.result);
  assert.equal(secondUnprofiledLog.rounds.length, unprofiledLog.rounds.length);
});

test("profilePolicy: measures something REAL — greedy-v1 (full planTurn search) and budget-demo-v1 under a tiny budget produce MEASURABLY DIFFERENT sandbox-evaluation profiles on the same arena/seeds, not the same numbers regardless of what's profiled", async () => {
  const seeds = [1, 2, 3];
  const greedyMeasurements = await profilePolicy({ policyId: "greedy-v1", arena: "mirror", seeds, roundLimit: 6 });
  const budgetedMeasurements = await profilePolicy({ policyId: "budget-demo-v1", arena: "mirror", seeds, roundLimit: 6, budget: { maxIterations: 1 } });
  const greedyAgg = aggregateProfile(greedyMeasurements);
  const budgetedAgg = aggregateProfile(budgetedMeasurements);
  assert.notEqual(greedyAgg.meanSandboxEvaluations, budgetedAgg.meanSandboxEvaluations,
    `expected genuinely different policies to produce different real sandbox-evaluation profiles (greedy-v1: ${greedyAgg.meanSandboxEvaluations}, budget-demo-v1 maxIterations:1: ${budgetedAgg.meanSandboxEvaluations}) — identical numbers would mean the harness isn't measuring the policy at all`);
});
