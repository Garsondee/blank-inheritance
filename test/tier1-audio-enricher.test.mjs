// Tier 1 — the `@Cue[...]` pattern authors type into journals. Pattern only:
// the enricher itself needs Foundry's CONFIG and a DOM, and is covered where
// it actually runs (live verification, design/audio-system.md §5.5).

import { test } from "node:test";
import assert from "node:assert/strict";

import { CUE_PATTERN } from "../module/blank-inheritance/scripts/foundry/audio-enricher.mjs";

const matches = (text) => [...text.matchAll(new RegExp(CUE_PATTERN.source, "g"))].map((m) => [m[1], m[2]]);

test("a cue link matches with and without a label", () => {
  assert.deepEqual(matches("Press @Cue[observer-arrives]{his theme} here"), [["observer-arrives", "his theme"]]);
  assert.deepEqual(matches("@Cue[demo-alarm]"), [["demo-alarm", undefined]]);
});

test("several links in one page all match", () => {
  assert.deepEqual(matches("@Cue[a-one]{One} then @Cue[b-two]{Two}"), [["a-one", "One"], ["b-two", "Two"]]);
});

test("ids that are not kebab-case are not cue links", () => {
  assert.deepEqual(matches("@Cue[Observer_Arrives]"), []);
  assert.deepEqual(matches("@Cue[]"), []);
  assert.deepEqual(matches("@Check[perception|dc:15]"), [], "sf2e's own enricher is untouched");
});
