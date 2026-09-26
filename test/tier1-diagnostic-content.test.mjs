// Tier 1 — core/diagnostic-content.mjs's self-labelled-scratch-content
// recognition. Plain string matching, no Foundry global anywhere, so this
// gets a real, direct unit test rather than the source-text contract style
// used where a live Foundry document is unavoidable.
//
// Extracted 2026-09-19 out of scene-build.mjs's own DIAGNOSTIC_NAME_PATTERN
// (previously private to that file, tested only indirectly through
// isTemporaryScene — see test/tier1-scene-build-cleanup.test.mjs) so
// scene-runner.mjs's summon list can share the identical rule instead of
// duplicating it. Also closes a real gap: "ZZ TEST CHARACTER" was already
// named, twice, in this project's own comments as a real convention found
// live in the world, but had never actually been added to the regex until a
// "ZZ TEST CHARACTER — Kestrel Vance (DELETE BEFORE LAUNCH)" Actor turned up
// cluttering the Scene Runner's summon list.

import { test } from "node:test";
import assert from "node:assert/strict";

import { DIAGNOSTIC_NAME_PATTERN, isDiagnosticName } from "../module/blank-inheritance/scripts/core/diagnostic-content.mjs";

test("isDiagnosticName: catches all three known self-labelling conventions, case-insensitively", () => {
  assert.ok(isDiagnosticName("TEST FIXTURE — Map Journey PC 1 (delete after review)"));
  assert.ok(isDiagnosticName("test fixture — lowercase too"));
  assert.ok(isDiagnosticName("TOKEN RING PROOF (diagnostic, delete after review)"));
  assert.ok(isDiagnosticName("ZZ TEST CHARACTER — Kestrel Vance (DELETE BEFORE LAUNCH)"));
  assert.ok(isDiagnosticName("zz test character, lowercase too"));
});

test("isDiagnosticName: a real, ordinary name is never flagged — no false positives on actual content", () => {
  assert.equal(isDiagnosticName("03. Kit Issue"), false);
  assert.equal(isDiagnosticName("Shucks Mordant"), false);
  assert.equal(isDiagnosticName("Nakamura Ren"), false);
  // Merely containing "test" or "diagnostic" without the specific
  // self-labelling patterns must not trip this -- "field test" and a
  // hyphenated surname are real in-fiction content this campaign could
  // easily have.
  assert.equal(isDiagnosticName("The Field Test Range"), false);
  assert.equal(isDiagnosticName("Buzz Testarossa"), false);
});

test("isDiagnosticName: never throws on a missing or empty name", () => {
  assert.equal(isDiagnosticName(undefined), false);
  assert.equal(isDiagnosticName(null), false);
  assert.equal(isDiagnosticName(""), false);
});

test("DIAGNOSTIC_NAME_PATTERN is exported directly too, for a caller that wants the regex itself (scene-build.mjs's own isTemporaryScene)", () => {
  assert.ok(DIAGNOSTIC_NAME_PATTERN instanceof RegExp);
  assert.ok(DIAGNOSTIC_NAME_PATTERN.test("TEST FIXTURE — anything"));
});
