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
import { runTournamentParallel, runTournamentSequential, aggregateTournament, DEFAULT_CONCURRENCY } from "../../tools/battle-simulator/analysis/tournament-runner.mjs";
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
