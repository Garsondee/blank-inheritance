// Tier 3 — inline triggers inside a scene's own intro/outro readAloud.
//
// Found live authoring episode-c1e1--intake-medicals: Shucks is first
// glimpsed in the scene's INTRO narration, not inside any beat, and the
// original triggers[] build (design/scene-triggers-and-depth.md §2) only
// ever decorated a beat's own text/readAloud -- placing a <trig> token in
// intro.readAloud rendered as broken literal text. This extends the same
// parser/dispatch to intro.triggers/outro.triggers, scoped as beatId
// "intro"/"outro" since neither has a real beat to attach to.
//
// scene-runner.mjs destructures `foundry.applications.api` at module scope,
// so — matching every other tier3-*-contract.test.mjs in this project —
// this reads the real source rather than mounting the class.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const panel = readFileSync(path.join(moduleRoot, "templates", "runner", "panel.hbs"), "utf8");
const schema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "scene-brief.schema.json"), "utf8"));

test("the schema declares triggers[] on both intro and outro, same item shape as a beat's own", () => {
  for (const section of ["intro", "outro"]) {
    const field = schema.properties[section].properties.triggers;
    assert.ok(field, `scene-brief.schema.json's ${section} no longer declares triggers[]`);
    assert.equal(field.type, "array");
    assert.deepEqual(new Set(field.items.required), new Set(["id", "kind"]));
    assert.deepEqual(
      new Set(field.items.properties.kind.enum),
      new Set(["npc-enter", "npc-exit", "reveal-handout", "gm-tool", "post-check", "note"])
    );
  }
});

test("#decorateSceneReadAloud exists and both intro/outro context building call it, scoped by their own section id", () => {
  const fn = src.match(/#decorateSceneReadAloud\(section, sectionId\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#decorateSceneReadAloud is missing from scene-runner.mjs");
  assert.match(fn[0], /decorateInlineTriggers\(section\?\.readAloud, section\?\.triggers, sectionId\)/);
  assert.match(fn[0], /console\.error/, "an unknown trigger id in intro/outro prose should fail loudly, same as a beat's own");

  assert.match(src, /intro:\s*state\.intro \? \{ \.\.\.state\.intro, decoratedReadAloud: this\.#decorateSceneReadAloud\(state\.intro, "intro"\) \} : null/);
  assert.match(src, /decoratedReadAloud:\s*this\.#decorateSceneReadAloud\(state\.outro, "outro"\)/);
});

test("#onFireTrigger resolves a trigger against intro.triggers/outro.triggers when beatId is \"intro\"/\"outro\" (no real beat exists for those ids)", () => {
  const fn = src.match(/static async #onFireTrigger\(event, target\) \{[\s\S]*?\n {2}\}\n\n {2}\/\*\*\n {3}\* Fire one inline/) ??
    src.match(/static async #onFireTrigger\(event, target\) \{[\s\S]*?case "note":\n {6}default:\n {8}await logFired\(\);\n {4}\}\n {2}\}/);
  assert.ok(fn, "#onFireTrigger is missing or its shape changed enough that this test can't find it");
  const body = fn[0];
  assert.match(body, /beatId === "intro" \? brief\?\.intro\?\.triggers : beatId === "outro" \? brief\?\.outro\?\.triggers : null/, "no longer falls back to intro/outro triggers when there's no real beat");
});

test("post-check's beat access is optional-chained, so firing a post-check-kind trigger from intro/outro (no real beat) fails via the existing !check guard instead of throwing", () => {
  assert.match(src, /checkFor\(\{ challengeRef: beat\?\.challengeRef, checkRef: trigger\.checkRef \}, challenges\)/);
  assert.match(src, /hiddenAdjustment\(brief\.gmModifiers \?\? \[\], \{ challengeRef: beat\?\.challengeRef, locationKey: brief\.sceneRef \}\)/);
});

test("panel.hbs renders intro/outro readAloud through the decorated (trigger-chip-spliced) field via triple-stache, not the raw field", () => {
  assert.match(panel, /\{\{#if intro\.decoratedReadAloud\}\}<div class="bi-runner__read">\{\{\{intro\.decoratedReadAloud\}\}\}<\/div>\{\{\/if\}\}/);
  assert.match(panel, /\{\{#if outro\.decoratedReadAloud\}\}<div class="bi-runner__read">\{\{\{outro\.decoratedReadAloud\}\}\}<\/div>\{\{\/if\}\}/);
  assert.doesNotMatch(panel, /\{\{intro\.readAloud\}\}/, "panel.hbs still renders intro's raw, undecorated readAloud somewhere");
  assert.doesNotMatch(panel, /\{\{outro\.readAloud\}\}/, "panel.hbs still renders outro's raw, undecorated readAloud somewhere");
});

test("panel.hbs still has balanced Handlebars blocks after the intro/outro decoration change", () => {
  const withoutComments = panel.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `panel.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test("REAL DATA: intake-medicals' intro glimpses Shucks through a real intro-scoped trigger", () => {
  const brief = JSON.parse(readFileSync(path.join(repoRoot, "data", "scene-briefs", "episode-c1e1--intake-medicals.json"), "utf8"));
  assert.match(brief.intro.readAloud, /<trig id="shucks-glimpsed"\/>/);
  const trigger = (brief.intro.triggers ?? []).find((t) => t.id === "shucks-glimpsed");
  assert.ok(trigger, "intro.triggers is missing the shucks-glimpsed entry the readAloud references");
  assert.equal(trigger.kind, "npc-enter");
  assert.equal(trigger.npcRef, "shucks-mordant");
});

test("REAL DATA: every intro/outro triggers[] id referenced inline across every scene brief resolves, and vice versa", async () => {
  const { referencedTriggerIds } = await import("../module/blank-inheritance/scripts/core/inline-triggers.mjs");
  const briefsDir = path.join(repoRoot, "data", "scene-briefs");
  const { readdirSync } = await import("node:fs");
  for (const file of readdirSync(briefsDir).filter((f) => f.endsWith(".json"))) {
    const brief = JSON.parse(readFileSync(path.join(briefsDir, file), "utf8"));
    for (const [sectionId, section] of [["intro", brief.intro], ["outro", brief.outro]]) {
      if (!section) continue;
      const referenced = new Set(referencedTriggerIds(section));
      const authored = new Set((section.triggers ?? []).map((t) => t.id));
      for (const id of referenced) assert.ok(authored.has(id), `${file}#${sectionId} readAloud references <trig id="${id}"/> but ${sectionId}.triggers[] doesn't define it`);
      for (const id of authored) assert.ok(referenced.has(id), `${file}#${sectionId} authors trigger "${id}" but no <trig id="${id}"/> token places it (dead data)`);
    }
  }
});
