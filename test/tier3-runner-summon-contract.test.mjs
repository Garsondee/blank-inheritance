// Tier 3 — bringing anyone on (2026-10-04, D060).
//
// History: "summon anyone" began as its own floating panel, was folded into the Scene Runner on 2026-09-18 (Ingram: the
// summon UI belongs inside the script a GM is already looking at), and on 2026-10-04 left the Runner for the stage itself
// (Ingram: "Could scenes start with NPCs already in place, then reveal them in the main scene viewer content?"). A scene's
// own people now wait in the stage's wings on the GM's screen, and anyone else is found from the wings' box; the Palette
// still has a "Summon:" command for every Actor. This pins that the capability moved rather than vanished. The behaviour
// is tier1-stage-wings.test.mjs and tier3-stage-wings-contract.test.mjs; the stage's own half is Stagecraft's
// (module/stagecraft/test/wings.test.mjs, tools/stagecraft/bench/wings-check.mjs).

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
const bridge = readFileSync(path.join(moduleRoot, "scripts", "foundry", "stagecraft-bridge.mjs"), "utf8");
const palette = readFileSync(path.join(moduleRoot, "scripts", "foundry", "director-palette.mjs"), "utf8");

test("the standalone summon panel and its floating button are gone entirely", () => {
  assert.ok(!existsSync(path.join(moduleRoot, "scripts", "foundry", "summon-panel.mjs")), "foundry/summon-panel.mjs still exists");
  assert.ok(!existsSync(path.join(moduleRoot, "templates", "summon")), "templates/summon/ still exists");
});

test("the standalone city board, its own pure half, and its floating button are gone entirely", () => {
  assert.ok(!existsSync(path.join(moduleRoot, "scripts", "foundry", "city-board.mjs")), "foundry/city-board.mjs still exists");
  assert.ok(!existsSync(path.join(moduleRoot, "scripts", "core", "city-board.mjs")), "core/city-board.mjs still exists");
  assert.ok(!existsSync(path.join(moduleRoot, "templates", "city-board")), "templates/city-board/ still exists");
  // core/marker-layout.mjs is the GENERAL placement engine city-board.mjs merely used: it must survive.
  assert.ok(existsSync(path.join(moduleRoot, "scripts", "core", "marker-layout.mjs")), "core/marker-layout.mjs was deleted too");
});

test("the Runner no longer summons anyone itself: no gallery, no fold, no actions", () => {
  assert.doesNotMatch(src, /function summonableActors\(\)|#onSummonActor|#onDismissActor|summonActor:|dismissActor:/);
  assert.doesNotMatch(panel, /data-section="summon"|summon\.party|summon\.others/);
  const briefSrc = readFileSync(path.join(moduleRoot, "scripts", "core", "scene-brief.mjs"), "utf8");
  assert.doesNotMatch(briefSrc, /\{\s*id:\s*"summon"/, "RUNNER_SECTIONS still remembers a fold that is gone");
});

test("the stage's wings bring on the scene's own people and anyone the GM finds, through the stage's own api", () => {
  assert.match(bridge, /api\?\.wings\?\.setProvider\?\.\(\(scene\) => wingsOf\(scene\)\)/);
  assert.match(bridge, /api\?\.wings\?\.setFinder\?\.\(\(scene, query\) => findAnyone\(scene, query\)\)/);
  assert.match(bridge, /Hooks\.on\("stagecraft\.bring", \(event\) => \{ bringOn\(event\)/);
  const bring = bridge.match(/export async function bringOn\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(bring, /summonToStage\(target, summonDescriptorFor\(member, sting \?\? member\.arrival\), \{ at \}\)/, "a scene's own person comes on through the shared descriptor, their own way unless one was picked");
  assert.match(bring, /summonToStage\(target, \{ id: hit\.actor\.id, name: hit\.actor\.name, img: hit\.actor\.img, actorId: hit\.actor\.id/, "an Actor the GM found comes on as itself");
});

test("the palette still summons any Actor by name, and its Scene Runner entry no longer promises summoning", () => {
  assert.doesNotMatch(palette, /toggleSummonPanel|summon-panel\.mjs/, "the palette still references the deleted standalone summon panel");
  assert.doesNotMatch(palette, /toggleCityBoard|city-board\.mjs/i, "the palette still references the deleted city board");
  assert.match(palette, /title: `\$\{here \? "Dismiss" : "Summon"\}: \$\{actor\.name\}`/, "the cast commands summon and dismiss every Actor");
  const runnerCommand = palette.match(/\{ id: "panel\.runner",[\s\S]*?\}/)?.[0] ?? "";
  assert.ok(runnerCommand);
  assert.doesNotMatch(runnerCommand, /"summon"/, "panel.runner's keywords still say the Runner summons people");
});
