/**
 * Tests for the per-simulation log store's pure indexing logic (design doc
 * §15m). The headline test here is a direct regression test for the bug that
 * made a "reader" impossible in the first place: the old store was keyed by
 * scenario name alone, so re-running the same scenario at a different seed
 * silently overwrote the previous run.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runFileName, runId, buildIndexEntry, mergeIndexEntry, trimRunPayload } from "../../tools/battle-simulator/analysis/run-log-store.mjs";

function makeLog({ outcome = "party-victory", rounds = 2 } = {}) {
  const turns = [{ combatantId: "a", actionAccounting: { available: 3, spent: 3 }, actions: [{ type: "strike", legal: true, damageApplied: 5 }] }];
  return { outcome: { result: outcome, detail: "" }, rounds: Array.from({ length: rounds }, (_, i) => ({ round: i + 1, turns })) };
}

test("runFileName / runId: two DIFFERENT seeds of the SAME scenario get two DIFFERENT identities", () => {
  const a = { scenario: "escort", seed: 1000 };
  const b = { scenario: "escort", seed: 1001 };
  assert.notEqual(runFileName(a), runFileName(b), "the exact bug being fixed — same-scenario-different-seed must not collide on disk");
  assert.notEqual(runId(a), runId(b));
});

test("runFileName / runId: the SAME (scenario, seed) pair is stable — re-running it targets its own record, not a new one", () => {
  const a = { scenario: "escort", seed: 1000 };
  const b = { scenario: "escort", seed: 1000 };
  assert.equal(runFileName(a), runFileName(b));
  assert.equal(runId(a), runId(b));
});

test("buildIndexEntry: carries scenario/seed/outcome/rounds and a real metrics summary", () => {
  const entry = buildIndexEntry({ scenario: "escort", label: "Escort formation", seed: 1000, roundLimit: 8, generatedAt: "2026-08-23T00:00:00Z", log: makeLog({ rounds: 3 }) });
  assert.equal(entry.id, "escort@1000");
  assert.equal(entry.scenario, "escort");
  assert.equal(entry.seed, 1000);
  assert.equal(entry.outcome, "party-victory");
  assert.equal(entry.rounds, 3);
  assert.equal(entry.utilization, 1);
  assert.equal(entry.illegalProposals, 0);
});

test("REGRESSION: mergeIndexEntry accumulates multiple seeds of the same scenario instead of overwriting", () => {
  let index = [];
  for (const seed of [1000, 1001, 1002]) {
    index = mergeIndexEntry(index, buildIndexEntry({ scenario: "escort", label: "Escort", seed, roundLimit: 8, generatedAt: "2026-08-23T00:00:00Z", log: makeLog() }));
  }
  assert.equal(index.length, 3, "three distinct seeds must produce three distinct index entries");
  assert.deepEqual(new Set(index.map((e) => e.seed)), new Set([1000, 1001, 1002]));
});

test("mergeIndexEntry: re-running the SAME (scenario, seed) replaces its own entry, not a duplicate", () => {
  let index = mergeIndexEntry([], buildIndexEntry({ scenario: "escort", label: "Escort", seed: 1000, roundLimit: 8, generatedAt: "2026-08-23T00:00:00Z", log: makeLog({ outcome: "party-defeat" }) }));
  index = mergeIndexEntry(index, buildIndexEntry({ scenario: "escort", label: "Escort", seed: 1000, roundLimit: 8, generatedAt: "2026-08-23T01:00:00Z", log: makeLog({ outcome: "party-victory" }) }));
  assert.equal(index.length, 1);
  assert.equal(index[0].outcome, "party-victory", "the newer run of the identical seed must win, not stack as a duplicate");
});

test("mergeIndexEntry: leaves every OTHER scenario's entries untouched", () => {
  let index = mergeIndexEntry([], buildIndexEntry({ scenario: "escort", label: "Escort", seed: 1, roundLimit: 8, generatedAt: "t0", log: makeLog() }));
  index = mergeIndexEntry(index, buildIndexEntry({ scenario: "melee-draws-fire", label: "Melee", seed: 1, roundLimit: 8, generatedAt: "t0", log: makeLog() }));
  index = mergeIndexEntry(index, buildIndexEntry({ scenario: "escort", label: "Escort", seed: 2, roundLimit: 8, generatedAt: "t1", log: makeLog() }));
  assert.equal(index.length, 3);
  assert.ok(index.some((e) => e.id === "escort@1"));
  assert.ok(index.some((e) => e.id === "melee-draws-fire@1"));
  assert.ok(index.some((e) => e.id === "escort@2"));
});

test("mergeIndexEntry: sorts newest-first by generatedAt", () => {
  let index = mergeIndexEntry([], buildIndexEntry({ scenario: "a", label: "A", seed: 1, roundLimit: 1, generatedAt: "2026-08-20T00:00:00Z", log: makeLog() }));
  index = mergeIndexEntry(index, buildIndexEntry({ scenario: "b", label: "B", seed: 1, roundLimit: 1, generatedAt: "2026-08-23T00:00:00Z", log: makeLog() }));
  index = mergeIndexEntry(index, buildIndexEntry({ scenario: "c", label: "C", seed: 1, roundLimit: 1, generatedAt: "2026-08-21T00:00:00Z", log: makeLog() }));
  assert.deepEqual(index.map((e) => e.scenario), ["b", "c", "a"]);
});

test("trimRunPayload: drops initialSnapshot (verified byte-identical to deployment.snapshot) and keeps everything else", () => {
  const log = { seed: 1, rounds: [], outcome: null, deployment: { round: 0, snapshot: { a: 1 } }, initialSnapshot: { a: 1 } };
  const trimmed = trimRunPayload(log);
  assert.ok(!("initialSnapshot" in trimmed));
  assert.deepEqual(trimmed.deployment, { round: 0, snapshot: { a: 1 } });
  assert.equal(trimmed.seed, 1);
});
