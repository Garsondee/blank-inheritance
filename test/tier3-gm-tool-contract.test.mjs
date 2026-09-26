// Tier 3 — a beat's own gmTool button (#176).
//
// Found live (Ingram, running Kit Issue): the pick-your-kit beat's text says
// "show every player the real catalogue," but the only way to actually open
// the Equipment Locker was a macro UUID buried in the episode journal's
// description field, which the Scene Runner never surfaces. This pins the
// fix: a beat can carry a `gmTool` the panel renders as a real one-click
// button, resolved through a small registry rather than a free string a
// typo could silently break.
//
// scene-runner.mjs/beat.hbs are read as source, matching every other
// tier3-*-contract.test.mjs in this project.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const beatHbs = readFileSync(path.join(moduleRoot, "templates", "runner", "beat.hbs"), "utf8");
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
const schema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "scene-brief.schema.json"), "utf8"));

test("a beat's gmTool.id resolves through a real registry, not a free string trusted at click time", () => {
  assert.match(src, /const GM_TOOLS = \{/, "GM_TOOLS registry is missing from scene-runner.mjs");
  assert.match(src, /"equipment-locker":\s*openEquipmentPanel/, "equipment-locker is no longer registered against the real openEquipmentPanel import");

  const handler = src.match(/static #onOpenGmTool\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(handler, "#onOpenGmTool is missing from scene-runner.mjs");
  assert.match(handler[0], /GM_TOOLS\[target\.dataset\.toolId\]/, "no longer looks the tool up in GM_TOOLS");
  assert.match(handler[0], /console\.error/, "an unrecognised tool id should fail loudly, not silently do nothing");
});

test("openGmTool is wired into the action registry", () => {
  assert.match(src, /openGmTool:\s*SceneRunner\.#onOpenGmTool/);
});

test("beat.hbs renders a real button for a beat's gmTool, and the block stays balanced", () => {
  assert.match(beatHbs, /\{\{#if gmTool\}\}/, "gmTool is never checked in beat.hbs");
  assert.match(beatHbs, /data-action="openGmTool"/);
  assert.match(beatHbs, /data-tool-id="\{\{gmTool\.id\}\}"/);
  assert.match(beatHbs, /\{\{gmTool\.label\}\}/, "the button's own label is never rendered -- a hardcoded caption would drift from the data");

  const withoutComments = beatHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `beat.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test(".bi-runner__stamp--tool is real, styled CSS, and distinct from the check/insight stamp colours", () => {
  // 2026-09-19: migrated from a hardcoded --bi-cyan-dim (a dark teal that
  // went near-illegible on the new dark theme) to the theme-aware --sr-info,
  // retinted per theme the same way --sr-good/--sr-warn already are.
  assert.match(css, /\.bi-runner__stamp--tool\s*\{[^}]*var\(--sr-info\)/);
  assert.match(css, /--sr-info:\s*var\(--bi-cyan-dim\)/, "light theme's --sr-info is no longer defined");
  assert.match(css, /--sr-info:\s*var\(--bi-cyan\)/, "dark theme's --sr-info override is no longer defined");
});

test("the schema documents gmTool on a beat, requiring both id and label", () => {
  const beatSchema = schema.properties.beats.items;
  const gmTool = beatSchema.properties.gmTool;
  assert.ok(gmTool, "scene-brief.schema.json's beat items no longer define gmTool");
  assert.deepEqual(new Set(gmTool.required), new Set(["id", "label"]));
});

test("REAL DATA: Kit Issue's pick-your-kit beat -- the beat this was found on -- actually carries the gmTool that was missing", () => {
  const brief = JSON.parse(readFileSync(path.join(repoRoot, "data", "scene-briefs", "episode-c1e1--kit-issue.json"), "utf8"));
  const beat = brief.beats.find((b) => b.id === "pick-your-kit");
  assert.ok(beat, "pick-your-kit is missing from Kit Issue's scene brief");
  assert.deepEqual(beat.gmTool, { id: "equipment-locker", label: "Open Equipment Locker" });
});
