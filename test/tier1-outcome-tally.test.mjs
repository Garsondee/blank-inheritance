// Tier 1 — how many times each degree has actually landed on a check.
//
// Requested 2026-09-19 (Ingram): "It would be nice to record how many Crit
// success, success, neutral, fail, crit fails we get for each challenge."
// Run state (core/scene-brief.mjs's `ticked[beatId]`) only ever keeps the
// LATEST outcome — recording a second attempt overwrites the first — so the
// history has to live in the session log instead, one entry per degree
// recorded (foundry/scene-runner.mjs#onRecordOutcome writes it). This is the
// pure counting half: given a pile of log entries, how many of each degree
// actually happened for one specific beat.

import { test } from "node:test";
import assert from "node:assert/strict";
import { outcomeLogSubject, outcomeTally } from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

function entry(subject, text = "irrelevant") {
  return { at: new Date().toISOString(), tag: null, text, context: { scene: null, mode: null, subject, author: "Gamemaster" } };
}

test("outcomeLogSubject encodes the beat and degree together, distinct from a plain note's own subject", () => {
  assert.equal(outcomeLogSubject("the-storekeeper", "success"), "the-storekeeper::outcome::success");
  assert.notEqual(outcomeLogSubject("the-storekeeper", "success"), "the-storekeeper");
});

test("outcomeTally counts each degree separately, for the one beat asked about", () => {
  const entries = [
    entry(outcomeLogSubject("the-storekeeper", "success")),
    entry(outcomeLogSubject("the-storekeeper", "success")),
    entry(outcomeLogSubject("the-storekeeper", "criticalSuccess")),
    entry(outcomeLogSubject("the-storekeeper", "failure")),
    entry(outcomeLogSubject("read-the-old-man", "criticalFailure")) // a DIFFERENT beat -- must not bleed in
  ];
  assert.deepEqual(outcomeTally(entries, "the-storekeeper"), {
    criticalSuccess: 1,
    success: 2,
    failure: 1,
    criticalFailure: 0
  });
});

test("outcomeTally ignores ordinary GM notes on the same beat -- only entries carrying the outcome-subject shape count", () => {
  const entries = [
    entry("the-storekeeper", "Ordinary note, not an outcome record."),
    entry(outcomeLogSubject("the-storekeeper", "success"))
  ];
  const tally = outcomeTally(entries, "the-storekeeper");
  assert.equal(tally.success, 1);
  assert.equal(Object.values(tally).reduce((a, b) => a + b, 0), 1, "the plain note was counted as an outcome");
});

test("outcomeTally returns all four real buckets at zero for a beat with no history, never a made-up fifth", () => {
  const tally = outcomeTally([], "never-rolled");
  assert.deepEqual(tally, { criticalSuccess: 0, success: 0, failure: 0, criticalFailure: 0 });
  assert.equal(Object.keys(tally).length, 4);
});

test("outcomeTally is safe against missing/malformed entries", () => {
  assert.doesNotThrow(() => outcomeTally([null, undefined, {}, { context: null }], "any-beat"));
  assert.doesNotThrow(() => outcomeTally(undefined, "any-beat"));
  assert.doesNotThrow(() => outcomeTally([entry("x")], null));
});
