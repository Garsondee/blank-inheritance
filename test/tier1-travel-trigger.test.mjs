// Tier 1 — the pure decision behind "SCENE -> MAP -> SCENE" (scene-set.json's
// own rule). No Foundry, no routing: just whether two scenes' locationRef
// flags actually name different places.

import { test } from "node:test";
import assert from "node:assert/strict";

import { needsTravel } from "../module/blank-inheritance/scripts/core/travel-trigger.mjs";

test("two different real locations need travel", () => {
  assert.equal(needsTravel("candidate-gate", "intake-infirmary"), true);
});

test("the same location does not — a cut to a sub-room stays a plain cut", () => {
  assert.equal(needsTravel("intake-infirmary", "intake-infirmary"), false);
});

test("no prior location (nothing has activated yet) never triggers travel", () => {
  assert.equal(needsTravel(null, "candidate-gate"), false);
  assert.equal(needsTravel(undefined, "candidate-gate"), false);
});

test("a destination with no authored location (the hub itself, an unmapped place-scene) never triggers travel", () => {
  assert.equal(needsTravel("candidate-gate", null), false);
});

test("both missing is still false, not a crash", () => {
  assert.equal(needsTravel(null, null), false);
});
