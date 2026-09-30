// Tier 3 — "summon anyone" folded into the Scene Runner (2026-09-18).
//
// Used to be its own standalone panel + floating button (foundry/summon-
// panel.mjs, templates/summon/). Ingram's own call, live-testing the built
// integration: the summon UI belongs inside the script a GM is already
// looking at, not a second floating thing — matching the same reasoning
// that already folded the scene-runner toggle and the Sound Desk into the
// Deck's own pills. The panel and its button are deleted entirely; this
// checks the capability actually landed inside the runner rather than just
// disappearing.
//
// scene-runner.mjs destructures `foundry.applications.api` at module scope,
// so this reads the real source rather than mounting the class — the same
// established reason and pattern as every other tier3-*-contract.test.mjs
// in this project.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const panel = readFileSync(path.join(moduleRoot, "templates", "runner", "panel.hbs"), "utf8");

test("the standalone summon panel and its floating button are gone entirely", () => {
  assert.ok(!existsSync(path.join(moduleRoot, "scripts", "foundry", "summon-panel.mjs")), "foundry/summon-panel.mjs still exists");
  assert.ok(!existsSync(path.join(moduleRoot, "templates", "summon")), "templates/summon/ still exists");
});

test("the standalone city board, its own pure half, and its floating button are gone entirely", () => {
  assert.ok(!existsSync(path.join(moduleRoot, "scripts", "foundry", "city-board.mjs")), "foundry/city-board.mjs still exists");
  assert.ok(!existsSync(path.join(moduleRoot, "scripts", "core", "city-board.mjs")), "core/city-board.mjs still exists");
  assert.ok(!existsSync(path.join(moduleRoot, "templates", "city-board")), "templates/city-board/ still exists");
  // core/marker-layout.mjs is the GENERAL placement engine city-board.mjs
  // merely used — not city-board-specific, and other things reference it
  // (theatre-of-the-mind staging's own frame layout). Must survive.
  assert.ok(existsSync(path.join(moduleRoot, "scripts", "core", "marker-layout.mjs")), "core/marker-layout.mjs was deleted too — it's a general, reused placement engine, not city-board-specific");
});

test("summoning any real Actor is available inside the Scene Runner panel, unconditionally — even with no brief loaded", () => {
  assert.match(src, /function summonableActors\(\)/, "scene-runner.mjs no longer builds its own summonable-actor list");
  assert.match(panel, /data-section="summon"/, "panel.hbs no longer has a summon section");
  // Placed OUTSIDE the {{#unless title}}/beat-content flow -- it must render
  // whether or not a brief is currently loaded, the same as the old
  // standalone panel always could.
  const summonSection = panel.match(/<details class="bi-runner__section bi-runner__section--fold" data-section="summon"[\s\S]*?<\/details>/);
  assert.ok(summonSection, "could not find the summon fold section's own markup");
  assert.match(summonSection[0], /summon\.party/);
  assert.match(summonSection[0], /summon\.others/);
});

test("the runner's own summonActor/dismissActor actions reach the same real write as the brief's own stagePerson action", () => {
  assert.match(src, /summonActor:\s*SceneRunner\.#onSummonActor/, "the summonActor action is no longer wired");
  assert.match(src, /dismissActor:\s*SceneRunner\.#onDismissActor/, "the dismissActor action is no longer wired");
  assert.match(src, /import\s*\{[^}]*\bremoveFromStage\b[^}]*\bsummonToStage\b[^}]*\}\s*from\s*"\.\/stage\.mjs"/, "no longer imports both stage.mjs writes the summon actions need");
  const summonFn = src.match(/static async #onSummonActor\([\s\S]*?\n {2}\}/);
  assert.ok(summonFn);
  assert.match(summonFn[0], /summonToStage\(canvas\.scene,/);
  const dismissFn = src.match(/static async #onDismissActor\([\s\S]*?\n {2}\}/);
  assert.ok(dismissFn);
  assert.match(dismissFn[0], /removeFromStage\(canvas\.scene,/);
});

test("the summon fold section has a real default-open state registered, not an undefined one that silently always opens", () => {
  const briefSrc = readFileSync(path.join(moduleRoot, "scripts", "core", "scene-brief.mjs"), "utf8");
  assert.match(briefSrc, /\{\s*id:\s*"summon",\s*open:\s*false\s*\}/, "RUNNER_SECTIONS no longer registers the summon section's own default fold state");
});

test("the palette still finds summoning under its old name, now pointing at the Scene Runner", () => {
  const palette = readFileSync(path.join(moduleRoot, "scripts", "foundry", "director-palette.mjs"), "utf8");
  assert.doesNotMatch(palette, /toggleSummonPanel|summon-panel\.mjs/, "the palette still references the deleted standalone summon panel");
  assert.doesNotMatch(palette, /toggleCityBoard|city-board\.mjs/i, "the palette still references the deleted city board");
  const runnerCommand = palette.match(/\{ id: "panel\.runner",[\s\S]*?\}/);
  assert.ok(runnerCommand);
  assert.match(runnerCommand[0], /"summon"/, "panel.runner's own keywords no longer mention summon, so searching for it by its old name finds nothing");
});
