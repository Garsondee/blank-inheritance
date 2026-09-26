// Tier 3 — scene-runner.mjs's summon list excludes self-labelled scratch
// Actors, 2026-09-19.
//
// Found live: opening the local Foundry copy of the real production world
// and calling the Scene Runner's own summon list turned up eight throwaway
// entries — "TEST FIXTURE — Map Journey PC 1" through 6 and a "ZZ TEST
// CHARACTER — Kestrel Vance (DELETE BEFORE LAUNCH)" — ahead of any real NPC a
// GM might actually want, the opposite of "as little prep as possible." The
// naming convention was already established (scene-build.mjs's own
// DIAGNOSTIC_NAME_PATTERN, now shared via core/diagnostic-content.mjs — see
// test/tier1-diagnostic-content.test.mjs for the pure-function coverage);
// summonableActors() had simply never applied it.
//
// scene-runner.mjs is read as source rather than mounted, matching every
// other tier3-scene-runner-*-contract.test.mjs in this project (ApplicationV2
// destructures foundry.applications.api at module scope, and game.actors is
// a plain Map in test/support/mock-foundry.mjs with no .contents/.party
// getter, so summonableActors() cannot be behaviourally executed either way).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");

test("scene-runner.mjs imports the shared diagnostic-name check rather than duplicating scene-build.mjs's pattern", () => {
  assert.match(
    src,
    /import\s*\{\s*isDiagnosticName\s*\}\s*from\s*"\.\.\/core\/diagnostic-content\.mjs"/,
    "isDiagnosticName is no longer imported from the shared core module"
  );
});

test("summonableActors excludes self-labelled diagnostic/test-fixture Actors from BOTH party and others", () => {
  const fn = src.match(/function summonableActors\(\)\s*\{[\s\S]*?\n\}/);
  assert.ok(fn, "summonableActors is missing from scene-runner.mjs");
  // Filtered once, upfront, before the party/others split -- so a diagnostic
  // Actor can never leak through either bucket, not just the "others" one
  // that happened to be the one actually seen cluttered live.
  assert.match(
    fn[0],
    /const actors = game\.actors\.contents\.filter\(\(a\) => a\.type === "character" && !isDiagnosticName\(a\.name\)\);/,
    "the character-actor filter no longer excludes diagnostic-named Actors before the party/others split"
  );
});
