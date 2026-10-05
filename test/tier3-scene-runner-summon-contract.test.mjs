// Tier 3 — who the GM can find to bring on leaves out the world's scratch Actors (2026-09-19, moved 2026-10-04).
//
// Found live 2026-09-19: the Scene Runner's summon list turned up eight throwaway entries ("TEST FIXTURE — Map Journey PC
// 1" to 6, "ZZ TEST CHARACTER — Kestrel Vance (DELETE BEFORE LAUNCH)") ahead of any real NPC. The list then left the Runner
// for the stage's wings (D060), and the rule went with it: the finder there filters by the same shared naming convention
// (core/diagnostic-content.mjs, tier1-diagnostic-content.test.mjs). It also never offers a person by the Actor the world sync
// made for them, so a name held back stays held back. Read as source: the finder needs Foundry's game.actors.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const bridge = readFileSync(path.join(moduleRoot, "scripts", "foundry", "stagecraft-bridge.mjs"), "utf8");

test("the bridge imports the shared diagnostic-name check rather than duplicating scene-build.mjs's pattern", () => {
  assert.match(bridge, /import\s*\{\s*isDiagnosticName\s*\}\s*from\s*"\.\.\/core\/diagnostic-content\.mjs"/);
});

test("the finder leaves out self-labelled test Actors and the Actors made for people a scene already names", () => {
  const fn = bridge.match(/async function findAnyone\(scene, query\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(fn, "findAnyone is missing from foundry/stagecraft-bridge.mjs");
  assert.match(fn, /\.filter\(\(a\) => \(a\.type === "character" \|\| a\.type === "npc"\) && !isDiagnosticName\(a\.name\) && !castActors\.has\(a\.id\) && !isBasicActor\(a\)\)/);
  assert.match(fn, /const castActors = await castActorIds\(briefs\);/);
  const ids = bridge.match(/function castActorIds\(briefs\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(ids, /deriveFoundryId\(k\)/, "the sync's Actor for a cast member is found by the same id it was made with");
  assert.match(ids, /castActorsPromise \?\?=/, "worked out once per page, not at every keystroke");
  assert.match(fn, /if \(!game\.user\?\.isGM \|\| !scene\) return \[\];/, "a player's screen finds nobody");
});
