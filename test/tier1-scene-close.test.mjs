// Tier 1 — pure logic for the scene-close dialogue (core/scene-close.mjs).
// Milliseconds, no Foundry, no network. See that file's header for why the
// vocabulary is generic/mocked rather than authored-per-scene or wired into
// the real (still NEEDS REWORK) Resonance/casualty systems.

import { test } from "node:test";
import assert from "node:assert/strict";

import { ENDING_OPTIONS, COST_OPTIONS, canCloseScene, summarizeClosure } from "../module/blank-inheritance/scripts/core/scene-close.mjs";

test("ENDING_OPTIONS and COST_OPTIONS: every id is unique, every entry has both a plain label and a real localisation key", () => {
  for (const options of [ENDING_OPTIONS, COST_OPTIONS]) {
    const ids = options.map((o) => o.id);
    assert.equal(new Set(ids).size, ids.length, "ids must be unique within a list");
    for (const o of options) {
      assert.equal(typeof o.label, "string");
      assert.ok(o.label.length > 0);
      assert.match(o.labelKey, /^BLANKINHERITANCE\.SceneClose\./);
    }
  }
});

test("COST_OPTIONS matches the doc's own exact list, unTrimmed: casualties, Frame damage, Bleed, technician-days, time, an Anchor violated, or nothing", () => {
  assert.deepEqual(
    COST_OPTIONS.map((o) => o.id),
    ["nothing", "casualties", "frame-damage", "bleed", "technician-days", "time", "anchor-violated"]
  );
});

test("canCloseScene: an incomplete scene never needs the dropdowns -- always legal", () => {
  assert.deepEqual(canCloseScene({ complete: false, ending: null, cost: null }), { ok: true, reason: null });
});

test("canCloseScene: a complete scene is FORCED to have both dropdowns set", () => {
  assert.equal(canCloseScene({ complete: true, ending: null, cost: "nothing" }).reason, "ending-required");
  assert.equal(canCloseScene({ complete: true, ending: "resolved", cost: null }).reason, "cost-required");
  assert.equal(canCloseScene({ complete: true, ending: "resolved", cost: "nothing" }).ok, true);
});

test("canCloseScene: an unrecognised id is treated as unset, not silently accepted", () => {
  assert.equal(canCloseScene({ complete: true, ending: "made-up", cost: "nothing" }).reason, "ending-required");
});

test("summarizeClosure: an incomplete scene logs that it carries forward, moves nothing", () => {
  const result = summarizeClosure({ complete: false });
  assert.equal(result.ok, true);
  assert.equal(result.complete, false);
  assert.match(result.logLine, /carries forward/);
  assert.deepEqual(result.delta, { casualties: 0, anchorViolations: 0 });
});

test("summarizeClosure: an incomplete scene still folds in notes if given", () => {
  const result = summarizeClosure({ complete: false, notes: "Waiting on the table to decide." });
  assert.match(result.logLine, /Waiting on the table to decide\./);
});

test("summarizeClosure: refuses an incomplete-dropdown closure rather than guessing", () => {
  const result = summarizeClosure({ complete: true, ending: "resolved", cost: null });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "cost-required");
  assert.equal(result.logLine, undefined, "an illegal closure must not produce a log line at all");
});

test("summarizeClosure: casualties is the one cost that ticks the mocked casualty counter, nothing else does", () => {
  for (const cost of ["nothing", "frame-damage", "bleed", "technician-days", "time", "anchor-violated"]) {
    const result = summarizeClosure({ complete: true, ending: "resolved", cost });
    assert.equal(result.delta.casualties, 0, `cost "${cost}" must not move the casualty counter`);
  }
  const casualtiesResult = summarizeClosure({ complete: true, ending: "resolved", cost: "casualties" });
  assert.equal(casualtiesResult.delta.casualties, 1);
});

test("summarizeClosure: anchor-violated is the one cost that ticks the mocked Anchor counter, and tags the log line", () => {
  const result = summarizeClosure({ complete: true, ending: "interrupted", cost: "anchor-violated" });
  assert.equal(result.delta.anchorViolations, 1);
  assert.equal(result.delta.casualties, 0);
  assert.match(result.logLine, /^anchor: /, "an Anchor-violating closure should tag the log line with the recognised anchor: prefix (core/log-entry.mjs)");
});

test("summarizeClosure: a complete closure's log line names both the ending and the cost in plain English, not raw ids or keys", () => {
  const result = summarizeClosure({ complete: true, ending: "resolved-with-complications", cost: "frame-damage" });
  assert.match(result.logLine, /Resolved with complications/);
  assert.match(result.logLine, /Frame damage/);
  assert.doesNotMatch(result.logLine, /BLANKINHERITANCE/, "must never leak a raw i18n key into the log");
});

test("summarizeClosure: notes are appended after the outcome, not replacing it", () => {
  const result = summarizeClosure({ complete: true, ending: "resolved", cost: "nothing", notes: "Taka got a great line in." });
  assert.match(result.logLine, /Resolved/);
  assert.match(result.logLine, /Taka got a great line in\.$/);
});
