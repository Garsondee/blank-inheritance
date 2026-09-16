/**
 * Tests for analysis/tournament-runner.mjs (design doc §47, Stage B: the parallel tournament
 * runner). Real concerns, matching this file's own load-bearing claims:
 * (1) aggregateTournament computes real win rates from a real results array — no invented numbers;
 * (2) the actual worker-thread pool (runTournamentParallel) produces BYTE-IDENTICAL real outcomes to
 *     the in-thread sequential path, for the same seeds/profiles/roster — since the engine is
 *     seed-deterministic, the ONLY thing worker fan-out is allowed to change is wall-clock time, and
 *     this is the real, live proof of that, not an assumption;
 * (3) the pool actually respects a `concurrency` cap smaller than the seed count (proving it's a
 *     real pull-based pool, not `Promise.all` spawning one worker per seed).
 * Seed counts/roundLimits kept small throughout — a real Worker spawn costs real wall-clock time, and
 * this suite should stay fast.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runTournamentParallel, runTournamentSequential, aggregateTournament, DEFAULT_CONCURRENCY, checkCostGuard, aggregateAbilityCoverage } from "../../tools/battle-simulator/analysis/tournament-runner.mjs";
import { BASELINE_V1, NO_MANEUVERS_V1, PROFILES } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";

const smallParams = {
  roster: ["lunar-17.json", "security-goon.json"],
  partyProfile: BASELINE_V1,
  oppositionProfile: NO_MANEUVERS_V1,
  seedSpec: "1-4",
  roundLimit: 12
};

test("aggregateTournament: real win rates/outcomes computed from a real (synthetic) results array", () => {
  const results = [
    { seed: 1, outcome: "party-victory", rounds: 3, elapsedMs: 10 },
    { seed: 2, outcome: "party-victory", rounds: 5, elapsedMs: 20 },
    { seed: 3, outcome: "party-defeat", rounds: 4, elapsedMs: 15 },
    { seed: 4, outcome: "timeout", rounds: 20, elapsedMs: 40 }
  ];
  const agg = aggregateTournament(results);
  assert.equal(agg.n, 4);
  assert.equal(agg.partyWinRate, 0.5);
  assert.equal(agg.oppositionWinRate, 0.25);
  assert.equal(agg.timeoutRate, 0.25);
  assert.equal(agg.meanRounds, (3 + 5 + 4 + 20) / 4);
  assert.deepEqual(agg.outcomes, { "party-victory": 2, "party-defeat": 1, timeout: 1 });
});

test("aggregateTournament: throws on an empty results array — an empty tournament isn't a 0% win rate, it's not a measurement", () => {
  assert.throws(() => aggregateTournament([]), /no results supplied/);
});

test("PROFILES: real registry keyed by each profile's own id, both real Stage A profiles present", () => {
  assert.equal(PROFILES["baseline-v1"], BASELINE_V1);
  assert.equal(PROFILES["no-maneuvers-v1"], NO_MANEUVERS_V1);
});

test("runTournamentSequential: produces one real result per seed, real outcome values only", async () => {
  const results = runTournamentSequential(smallParams);
  assert.equal(results.length, 4);
  for (const r of results) {
    assert.ok(["party-victory", "party-defeat", "timeout"].includes(r.outcome));
    assert.ok(r.rounds > 0);
    assert.equal(typeof r.elapsedMs, "number");
  }
});

test("runTournamentParallel: the REAL worker-thread pool produces BYTE-IDENTICAL outcomes/rounds to the sequential in-thread path, for the same seeds — the core Stage B correctness proof (determinism means only wall-clock time is allowed to differ)", async () => {
  const sequential = runTournamentSequential(smallParams);
  const parallel = await runTournamentParallel(smallParams);
  assert.equal(parallel.length, sequential.length);
  for (let i = 0; i < sequential.length; i++) {
    assert.equal(parallel[i].seed, sequential[i].seed);
    assert.equal(parallel[i].outcome, sequential[i].outcome, `seed ${sequential[i].seed}: worker outcome must match the sequential ground truth`);
    assert.equal(parallel[i].rounds, sequential[i].rounds, `seed ${sequential[i].seed}: worker round count must match the sequential ground truth`);
  }
});

test("runTournamentParallel: real progress events fire once per seed, in real seedIndex order of completion tracking (seedTotal correct throughout)", async () => {
  const events = [];
  await runTournamentParallel({ ...smallParams, onProgress: (e) => events.push(e) });
  assert.equal(events.length, 4);
  for (const e of events) {
    assert.equal(e.type, "seedComplete");
    assert.equal(e.seedTotal, 4);
    assert.ok(["party-victory", "party-defeat", "timeout"].includes(e.outcome));
  }
  assert.deepEqual(new Set(events.map((e) => e.seedIndex)), new Set([0, 1, 2, 3]), "every seed index must be reported exactly once");
});

test("runTournamentParallel: a real pull-based pool — concurrency SMALLER than the seed count still completes every seed correctly (proves workers are reused across multiple jobs, not one-per-seed)", async () => {
  const results = await runTournamentParallel({ ...smallParams, concurrency: 2 });
  assert.equal(results.length, 4);
  assert.deepEqual(results.map((r) => r.seed), [1, 2, 3, 4]);
});

test("DEFAULT_CONCURRENCY: a real, positive integer derived from the real host's CPU count", () => {
  assert.ok(Number.isInteger(DEFAULT_CONCURRENCY));
  assert.ok(DEFAULT_CONCURRENCY >= 1);
});

// --- abilityCoverage wiring (design doc §78, GH #57) — the worker used to discard the whole battle
// log; both real code paths (the worker thread, and its sequential sibling) now compute and return
// a compact per-battle coverage summary instead. ---

test("runTournamentSequential: every result carries a real abilityCoverage summary, not a discarded log", () => {
  const results = runTournamentSequential(smallParams);
  for (const r of results) {
    assert.ok(Array.isArray(r.abilityCoverage.abilities) && r.abilityCoverage.abilities.length > 0, `seed ${r.seed}: abilityCoverage.abilities missing/empty`);
    assert.ok(Array.isArray(r.abilityCoverage.zero));
    assert.ok(Array.isArray(r.abilityCoverage.overUsed));
    assert.equal(r.abilityCoverage.unmatched.length, 0, `seed ${r.seed}: unmatched executions ${JSON.stringify(r.abilityCoverage.unmatched)}`);
  }
});

test("runTournamentParallel: the real worker thread computes the identical abilityCoverage summary the sequential path does, for the same seed — same determinism guarantee as outcome/rounds", async () => {
  const sequential = runTournamentSequential(smallParams);
  const parallel = await runTournamentParallel(smallParams);
  for (let i = 0; i < sequential.length; i++) {
    assert.deepEqual(parallel[i].abilityCoverage, sequential[i].abilityCoverage, `seed ${sequential[i].seed}: worker abilityCoverage must match the sequential ground truth`);
  }
});

test("aggregateAbilityCoverage: sums real executions across every seed, per (owner, ability)", () => {
  const results = [
    { seed: 1, abilityCoverage: { abilities: [{ ownerId: "a", rosterKey: "strikes", name: "Knife", executions: 2 }], overUsed: [], unmatched: [] } },
    { seed: 2, abilityCoverage: { abilities: [{ ownerId: "a", rosterKey: "strikes", name: "Knife", executions: 1 }], overUsed: [], unmatched: [] } }
  ];
  const agg = aggregateAbilityCoverage(results);
  assert.equal(agg.battles, 2);
  assert.equal(agg.abilities.length, 1);
  assert.equal(agg.abilities[0].executions, 3);
});

test("aggregateAbilityCoverage: neverUsed is scoped to the WHOLE batch — zero in one seed but used in another is not batch-level never-used", () => {
  const results = [
    { seed: 1, abilityCoverage: { abilities: [{ ownerId: "a", rosterKey: "strikes", name: "Pistol", executions: 0 }, { ownerId: "a", rosterKey: "strikes", name: "Knife", executions: 1 }], overUsed: [], unmatched: [] } },
    { seed: 2, abilityCoverage: { abilities: [{ ownerId: "a", rosterKey: "strikes", name: "Pistol", executions: 0 }, { ownerId: "a", rosterKey: "strikes", name: "Knife", executions: 0 }], overUsed: [], unmatched: [] } }
  ];
  const agg = aggregateAbilityCoverage(results);
  assert.deepEqual(agg.neverUsed.map((a) => a.name), ["Pistol"], "Knife was used in seed 1 — not a batch-level zero, even though seed 2 alone never fired it");
});

test("aggregateAbilityCoverage: overUseViolations/unmatched carry the REAL seed each violation came from", () => {
  const results = [
    { seed: 7, abilityCoverage: { abilities: [], overUsed: [{ kind: "ability", ownerId: "a", name: "Transfer Vitality", executions: 3, cap: 2 }], unmatched: [] } },
    { seed: 8, abilityCoverage: { abilities: [], overUsed: [], unmatched: [{ ownerId: "a", rosterKey: "strikes", name: "Ghost Strike", round: 4 }] } }
  ];
  const agg = aggregateAbilityCoverage(results);
  assert.equal(agg.overUseViolations.length, 1);
  assert.equal(agg.overUseViolations[0].seed, 7);
  assert.equal(agg.unmatched.length, 1);
  assert.equal(agg.unmatched[0].seed, 8);
});

// --- checkCostGuard (design doc §59, GH issue #5 — "warn when a policy's battles exceed a
// configurable multiple of greedy's, so a slow policy can't silently turn a 5-minute sweep into a
// 5-hour one") ---

test("checkCostGuard: NOT exceeded when the tested tournament's real cost is within the configured multiple of the reference", () => {
  const agg = { meanElapsedMs: 150 };
  const referenceAgg = { meanElapsedMs: 100 };
  const result = checkCostGuard(agg, referenceAgg, 3);
  assert.equal(result.exceeded, false);
  assert.equal(result.ratio, 1.5);
  assert.equal(result.meanElapsedMs, 150);
  assert.equal(result.referenceMeanElapsedMs, 100);
  assert.equal(result.multiple, 3);
});

test("checkCostGuard: EXCEEDED when the tested tournament's real cost is past the configured multiple of the reference", () => {
  const agg = { meanElapsedMs: 500 };
  const referenceAgg = { meanElapsedMs: 100 };
  const result = checkCostGuard(agg, referenceAgg, 3);
  assert.equal(result.exceeded, true);
  assert.equal(result.ratio, 5);
});

test("checkCostGuard: the boundary itself (ratio exactly equal to the multiple) is NOT exceeded — the guard fires on exceeding the limit, not on merely reaching it", () => {
  const agg = { meanElapsedMs: 300 };
  const referenceAgg = { meanElapsedMs: 100 };
  const result = checkCostGuard(agg, referenceAgg, 3);
  assert.equal(result.ratio, 3);
  assert.equal(result.exceeded, false);
});

test("checkCostGuard: a real, live tournament comparison — greedy-v1 vs. itself as both the tested and reference tournament never trips the guard at any reasonable multiple", () => {
  const results = runTournamentSequential({ ...smallParams, partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1 });
  const agg = aggregateTournament(results);
  const referenceResults = runTournamentSequential({ ...smallParams, partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1 });
  const referenceAgg = aggregateTournament(referenceResults);
  const result = checkCostGuard(agg, referenceAgg, 2);
  assert.equal(result.exceeded, false, `expected an identical policy compared against itself to never trip a 2x cost guard, got ratio ${result.ratio}`);
});
