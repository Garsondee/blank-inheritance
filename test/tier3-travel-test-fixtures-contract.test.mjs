// Tier 3 — the six test PCs' Foundry-touching half, and the macro/API wiring.
//
// Requested 2026-09-19 (Ingram), diagnosing #174. Pure fixture data and
// westernEdgePoint's own math are tier1-travel-test-fixtures.test.mjs; this
// pins the adapter contract — idempotent Actor/Token creation, the hub
// scene lookup matching foundry/travel.mjs's own established pattern, and
// that the macro/module-API surface actually exists.
//
// travel-test-fixtures.mjs and blank-inheritance.mjs both touch real
// Foundry globals, so this reads source rather than mounting anything —
// the same established reason and pattern as every other
// tier3-*-contract.test.mjs in this project.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "travel-test-fixtures.mjs"), "utf8");
const entry = readFileSync(path.join(moduleRoot, "scripts", "blank-inheritance.mjs"), "utf8");

test("the hub scene is found by sourceId flag first, matching foundry/travel.mjs's own established pattern (an adopted scene keeps its own foreign id forever)", () => {
  const fn = src.match(/async function hubScene\(\) \{[\s\S]*?\n\}/);
  assert.ok(fn, "hubScene is missing from travel-test-fixtures.mjs");
  assert.match(fn[0], /getFlag\(MODULE_ID, "sourceId"\) === HUB_SOURCE_ID/, "no longer checks the sourceId flag first — see foundry/travel.mjs's own hubScene for why this matters");
});

test("ensureTestFixturePCs and placeTestFixturesOnWesternEdge are both idempotent (deriveFoundryId + get-before-create)", () => {
  assert.match(src, /const id = await deriveFoundryId\(`travel-test-pc-\$\{pc\.id\}`\)/);
  assert.match(src, /let actor = game\.actors\.get\(id\)/, "no longer checks for an existing Actor before creating one");
  assert.match(src, /const existing = hub\.tokens\.get\(tokenId\)/, "no longer checks for an existing Token before creating one");
});

test("placing the fixtures cues the hub scene so the GM actually sees them land", () => {
  const fn = src.match(/export async function placeTestFixturesOnWesternEdge\(\) \{[\s\S]*?\n\}/);
  assert.ok(fn);
  assert.match(fn[0], /cueScene\(hub\.id\)/, "no longer cues the hub scene after placing the fixtures");
});

test("the macro and module API both expose this as a real, one-click GM action", () => {
  assert.match(src, /export async function createTravelTestMacroIfMissing\(\)/);
  assert.match(src, /command:\s*`await game\.modules\.get\("\$\{MODULE_ID\}"\)\.api\.placeTestFixturesOnWesternEdge\(\);`/);

  assert.match(entry, /import\s*\{\s*createTravelTestMacroIfMissing,\s*placeTestFixturesOnWesternEdge\s*\}\s*from\s*"\.\/foundry\/travel-test-fixtures\.mjs"/, "blank-inheritance.mjs no longer imports the travel test fixtures module");
  assert.match(entry, /await createTravelTestMacroIfMissing\(\);/, "the macro is no longer created on ready");
  assert.match(entry, /placeTestFixturesOnWesternEdge,/, "placeTestFixturesOnWesternEdge is no longer exposed on the module API");
});
