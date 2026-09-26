// Tier 3 — the Scene Runner's contract for following the table's own active
// scene, not only its own picker.
//
// Found live 2026-09-18: Ingram cut to "Intake Medicals" (a real, fully
// authored brief — 8 beats, 2 cast — confirmed by reading the file directly,
// not assumed) through some route other than the runner's own #onCutTo (a
// map pin, the Director's Panel, Foundry's native Scene Directory), and the
// panel stayed blank — it only ever updated its shown brief from its own
// picker, never from the table's actual active scene. A full audit of every
// scene brief scene-set.json references found all seven fully authored
// (4-9 beats each, zero empty ones) — so this was never a content gap, only
// a missing sync.
//
// scene-runner.mjs destructures `foundry.applications.api` at module scope,
// so — matching tier3-deck-contract.test.mjs/tier3-travel-contract.test.mjs's
// own established reason and pattern — this reads the real source rather
// than mounting the class.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const src = readFileSync(path.join(repoRoot, "module", "blank-inheritance", "scripts", "foundry", "scene-runner.mjs"), "utf8");

test("every scene brief scene-set.json references actually exists and actually has content — the full audit", () => {
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "data", "campaign", "scene-set.json"), "utf8"));
  const briefRefs = [...new Set(manifest.scenes.map((s) => s.briefRef).filter(Boolean))];
  assert.ok(briefRefs.length > 0, "the manifest names no briefs at all — audit is meaningless");

  const empty = [];
  const missing = [];
  for (const ref of briefRefs) {
    const file = path.join(repoRoot, "data", "scene-briefs", `${ref}.json`);
    if (!existsSync(file)) { missing.push(ref); continue; }
    const brief = JSON.parse(readFileSync(file, "utf8"));
    if (!Array.isArray(brief.beats) || brief.beats.length === 0) empty.push(ref);
  }
  assert.deepEqual(missing, [], "a scene the manifest names has no scene-brief file at all");
  assert.deepEqual(empty, [], "a scene-brief file exists but has zero beats — genuinely empty, not just unsynced");
});

test("cutting the table to ANY scene with a real briefRef flag syncs the Scene Runner to it, not only its own #onCutTo picker", () => {
  const hook = src.match(/Hooks\.on\("updateScene", \(scene, changed\) => \{\s*if \(!game\.user\?\.isGM \|\| changed\?\.active !== true\) return;[\s\S]*?\n\}\);/);
  assert.ok(hook, "the scene-activation sync listener is missing from scene-runner.mjs");
  assert.match(hook[0], /scene\.getFlag\(MODULE_ID, "briefRef"\)/, "no longer reads the newly-active scene's own briefRef flag");
  assert.match(hook[0], /game\.settings\s*\.set\(MODULE_ID, SETTING_BRIEF, briefRef\)/, "no longer writes the synced brief into SETTING_BRIEF");
  assert.match(hook[0], /refreshSceneRunner\(\)/, "no longer repaints the panel once the brief is synced — a setting change alone would still leave a stale render on screen");
});

test("the sync is a no-op when the newly active scene already matches, or carries no briefRef at all (a sub-room, the hub) — it must not fight a GM reading ahead in a DIFFERENT brief with zero cost", () => {
  const hook = src.match(/Hooks\.on\("updateScene", \(scene, changed\) => \{[\s\S]*?\n\}\);/);
  assert.ok(hook);
  assert.match(hook[0], /if \(!briefRef \|\| briefRef === currentBriefId\(\)\) return;/, "the early-return guard against an unflagged or already-current scene is missing");
});
