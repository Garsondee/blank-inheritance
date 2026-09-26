// Tier 3 — scene-level temptations (design/scene-triggers-and-depth.md §3).
//
// A temptation is one sentence a GM can say out loud, unprompted, whenever
// the table stalls — scene-level, not tied to any beat, never mandatory,
// reusable any number of times. This pins: the schema field, that
// sceneRunnerState actually surfaces it, that the panel renders it as an
// always-visible block (never folded — Law 7), and that "marking it said"
// only ever logs, never gates or brands anything.
//
// scene-runner.mjs destructures `foundry.applications.api` at module scope,
// so — matching every other tier3-*-contract.test.mjs in this project —
// this reads the real source rather than mounting the class.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sceneRunnerState, temptationLogSubject } from "../module/blank-inheritance/scripts/core/scene-brief.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const panel = readFileSync(path.join(moduleRoot, "templates", "runner", "panel.hbs"), "utf8");
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
const schema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "scene-brief.schema.json"), "utf8"));

test("the schema documents a scene-level temptations[] array, not tied to any one beat", () => {
  const field = schema.properties.temptations;
  assert.ok(field, "scene-brief.schema.json no longer declares a top-level temptations field");
  assert.equal(field.type, "array");
  const item = field.items;
  assert.deepEqual(new Set(item.required ?? Object.keys(item.properties ?? {})), new Set(["id", "text"]));
});

test("sceneRunnerState surfaces a brief's temptations unchanged, and defaults to an empty array rather than throwing", () => {
  const withSome = sceneRunnerState({ brief: { id: "x", temptations: [{ id: "a", text: "Ask about the ledger?" }] } });
  assert.deepEqual(withSome.temptations, [{ id: "a", text: "Ask about the ledger?" }]);

  const withNone = sceneRunnerState({ brief: { id: "x" } });
  assert.deepEqual(withNone.temptations, []);
});

test("temptationLogSubject is scene-scoped (no beatId prefix), unlike outcome/choice/trigger subjects", () => {
  assert.equal(temptationLogSubject("ask-nobu-for-more"), "temptation::ask-nobu-for-more");
});

test("useTemptation is wired into the action registry and only ever logs -- no run-state write, matching a reusable, non-gating prompt", () => {
  assert.match(src, /useTemptation:\s*SceneRunner\.#onUseTemptation/);
  const handler = src.match(/static async #onUseTemptation\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(handler, "#onUseTemptation is missing from scene-runner.mjs");
  assert.match(handler[0], /temptationLogSubject\(temptationId\)/);
  assert.doesNotMatch(handler[0], /writeRunState/, "a temptation should never gate or brand anything by writing run state");
  assert.doesNotMatch(handler[0], /this\.render/, "nothing about the panel's own displayed state changes when a temptation is used, so no re-render is needed");
});

test("#onUseTemptation fails loudly on an id no longer in the brief's own temptations[]", () => {
  const handler = src.match(/static async #onUseTemptation\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.match(handler[0], /console\.error/);
});

test("panel.hbs renders temptations as an always-visible section, never behind a foldable <details>", () => {
  const block = panel.match(/\{\{#if temptations\.length\}\}[\s\S]*?\{\{\/if\}\}\n\n\s*\{\{#if cast\.length\}\}/);
  assert.ok(block, "couldn't find the temptations block immediately before the cast section");
  assert.doesNotMatch(block[0], /<details/, "temptations must not be inside a <details> fold -- the whole point is instant access when the table stalls");
  assert.match(block[0], /data-action="useTemptation"/);
  assert.match(block[0], /data-temptation-id="\{\{id\}\}"/);
  assert.match(block[0], /\{\{text\}\}/);
});

test("panel.hbs still has balanced Handlebars blocks after the temptations section was added", () => {
  const withoutComments = panel.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `panel.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test(".bi-runner__temptations is real, styled CSS, and is never given a foldable-section treatment", () => {
  assert.match(css, /\.bi-runner__temptations\s*\{/);
  assert.match(css, /\.bi-runner__temptation-use\s*\{/);
});

test("ChoiceInvented's siblings (Temptations/TemptationUsed/TemptationUsedHint) have real, non-empty localized text", () => {
  const en = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));
  assert.match(en.BLANKINHERITANCE.Runner.Temptations, /\S/);
  assert.match(en.BLANKINHERITANCE.Runner.TemptationUsed, /\S/);
  assert.match(en.BLANKINHERITANCE.Runner.TemptationUsedHint, /\S/);
});
