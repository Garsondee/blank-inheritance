// Tier 3 — the comprehension-first Scene Runner redesign, 2026-09-19.
//
// Ingram, reacting to a live screenshot of the Summon gallery: "the NPC
// gallery... needs a lot of work... pick a high readability and easy to
// comprehend design for the whole thing. I prefer a dark theme but make a
// bright theme too." Then, correcting an initial assumption that this meant
// the existing GLASS/PAPER registers: "We're not even locked to the paper
// look. The goal is comprehension and understandability. Rapid access to
// information. First order retrieval." And, mid-pass, about Close Scene
// specifically: "make the close scene dialogue the best possible for being
// efficient and effective at providing good context for you to write future
// scenes from."
//
// Three real, testable gaps this closes:
//   1. A cross-register colour bug -- .bi-summon__name read --bi-bone (a
//      GLASS-register light token) on --bi-mat-paper (a PAPER-register light
//      background), measuring near 1:1 contrast. The whole Summon gallery is
//      rebuilt as a card grid against new --sr-* tokens instead.
//   2. No theme choice existed at all. One client setting (foundry/runner-theme.mjs)
//      now drives both the Scene Runner and the Close Scene dialogue, so a
//      toggle in either can never leave the two disagreeing.
//   3. Nothing surfaced a scene's own already-typed log lines at the moment
//      the GM writes the notes a future scene gets written from --
//      core/scene-close.mjs#sceneHighlights (tier1-tested separately) is
//      wired into the dialogue's context and rendered as a recap block.
//
// Source/markup/stylesheet are read as text, matching every other
// tier3-*-contract.test.mjs in this project (ApplicationV2 destructures
// foundry.applications.api at module scope, so these files cannot be
// imported directly in a plain node:test run).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const themeSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "runner-theme.mjs"), "utf8");
const runnerSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const closeSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-close.mjs"), "utf8");
const panelHbs = readFileSync(path.join(moduleRoot, "templates", "runner", "panel.hbs"), "utf8");
const closeHbs = readFileSync(path.join(moduleRoot, "templates", "console", "scene-close.hbs"), "utf8");
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
const en = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));

test("foundry/runner-theme.mjs is the one place the light/dark client setting is registered, read and written", () => {
  assert.match(themeSrc, /export function registerRunnerThemeSetting\(\)/);
  assert.match(themeSrc, /export function currentRunnerTheme\(\)/);
  assert.match(themeSrc, /export async function setRunnerTheme\(/);
  assert.match(themeSrc, /scope:\s*"client"/, "the theme must be per-GM, not a world setting");
  assert.match(themeSrc, /default:\s*"dark"/, "dark is Ingram's own stated preference, and must stay the default");
});

test("scene-runner.mjs shares foundry/runner-theme.mjs rather than keeping its own copy of the setting", () => {
  assert.match(runnerSrc, /import \{[^}]*registerRunnerThemeSetting[^}]*currentRunnerTheme[^}]*setRunnerTheme[^}]*\} from "\.\/runner-theme\.mjs"/s);
  assert.doesNotMatch(runnerSrc, /SETTING_THEME/, "the old local theme-setting constant must be gone, not left dead alongside the shared module");

  const registerFn = runnerSrc.match(/export function registerSceneRunnerSettings\(\) \{[\s\S]*?\n\}/);
  assert.ok(registerFn, "registerSceneRunnerSettings is missing");
  assert.match(registerFn[0], /registerRunnerThemeSetting\(\)/, "registerSceneRunnerSettings no longer registers the shared theme setting");
});

test("scene-runner.mjs#_prepareContext exposes theme/themeIsDark on both the early-return and full-render paths", () => {
  const themeMentions = runnerSrc.match(/themeIsDark:\s*currentRunnerTheme\(\)\s*===\s*"dark"/g) ?? [];
  assert.ok(themeMentions.length >= 2, `expected themeIsDark on both _prepareContext return paths, found ${themeMentions.length}`);
});

test("the theme toggle is wired end to end: action registered, handler flips and persists via the shared setter", () => {
  assert.match(runnerSrc, /toggleTheme:\s*SceneRunner\.#onToggleTheme/, "toggleTheme is not wired as a DEFAULT_OPTIONS action");
  const handler = runnerSrc.match(/static async #onToggleTheme\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(handler, "#onToggleTheme is missing");
  assert.match(handler[0], /setRunnerTheme\(/, "the handler no longer calls the shared setRunnerTheme");
  assert.match(handler[0], /this\.render\(/, "flipping the theme must re-render so the change is visible immediately");
});

test("panel.hbs carries data-bi-theme on the runner root and a real toggle button using the boolean, not a hand-rolled {{#eq}}", () => {
  assert.match(panelHbs, /<section class="bi-runner" data-bi-theme="\{\{theme\}\}">/, "the runner root must declare its own theme for the CSS attribute selector to match");
  assert.match(panelHbs, /data-action="toggleTheme"/);
  // This project has no {{#eq}} Handlebars helper (confirmed twice live this
  // session, once for the equipment panel and once here) -- the icon must
  // switch on the pre-computed boolean, never on a raw string comparison.
  assert.doesNotMatch(panelHbs, /\{\{#eq\b/, "no {{#eq}} helper exists in this project's Handlebars setup");
  assert.match(panelHbs, /\{\{#if themeIsDark\}\}/);
});

test("foundry/scene-close.mjs reads the SAME shared theme as the runner, so the two dialogues can never disagree", () => {
  assert.match(closeSrc, /import \{[^}]*runnerThemeContext[^}]*\} from "\.\/runner-theme\.mjs"/);
  const prepareContext = closeSrc.match(/async _prepareContext\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(prepareContext, "_prepareContext is missing from the SceneCloseDialogue class");
  assert.match(prepareContext[0], /\.\.\.runnerThemeContext\(\)/, "_prepareContext no longer spreads the shared theme into its render context");
});

test("scene-close.hbs carries data-bi-theme on its own root, the same attribute selector CSS keys off of", () => {
  assert.match(closeHbs, /<div class="bi-scene-close__body" data-bi-theme="\{\{theme\}\}">/);
  // Foundry's own ApplicationV2 window frame already claims the bare
  // .bi-scene-close class (DEFAULT_OPTIONS.classes) -- the template's own
  // root must never reuse it, or two nested elements share one CSS rule and
  // only the inner one ever carries data-bi-theme (found live 2026-09-19).
  assert.doesNotMatch(closeHbs, /<div class="bi-scene-close" /, "the template root must not reuse Foundry's own window-frame class");
});

test("foundry/scene-close.mjs wires sceneHighlights (2026-09-19 'write future scenes from' rethink) into the render context, scoped to the closing scene", () => {
  assert.match(closeSrc, /import \{[^}]*sceneHighlights[^}]*\} from "\.\.\/core\/scene-close\.mjs"/);
  const prepareContext = closeSrc.match(/async _prepareContext\(\) \{[\s\S]*?\n {2}\}/);
  assert.match(prepareContext[0], /highlights:\s*sceneHighlights\(currentEntries\(\),/, "_prepareContext no longer resolves highlights from the real log");
});

test("scene-close.hbs renders highlights only when there is one, with a fallback hint, and stays balanced", () => {
  assert.match(closeHbs, /\{\{#if highlights\.length\}\}/);
  assert.match(closeHbs, /\{\{#each highlights\}\}/);
  assert.match(closeHbs, /BLANKINHERITANCE\.SceneClose\.HighlightsLabel/);
  assert.match(closeHbs, /BLANKINHERITANCE\.SceneClose\.HighlightsEmpty/, "an empty recap must explain how to fill it, not just render blank");

  const withoutComments = closeHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `scene-close.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test("the Summon gallery is gone with its template and its styles (2026-10-04, D060): the stage's own wings bring anyone on", () => {
  assert.ok(!existsSync(path.join(moduleRoot, "templates", "runner", "summon-row.hbs")), "templates/runner/summon-row.hbs is still there");
  assert.doesNotMatch(panelHbs, /summon-row\.hbs|data-section="summon"/);
  assert.doesNotMatch(css, /\.bi-summon__/, "the gallery's styles outlived it");
});

test("every new class this pass introduces is real, styled CSS -- not markup pointing at a rule that doesn't exist", () => {
  for (const selector of [
    ".bi-runner__theme-toggle",
    ".bi-scene-close__recap",
    ".bi-scene-close__recap-title",
    ".bi-scene-close__highlight-tag",
    ".bi-scene-close__chip",
    ".bi-scene-close__chip--current"
  ]) {
    const pattern = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "[\\s,{]");
    assert.match(css, pattern, `${selector} is referenced but has no CSS rule`);
  }
});

test(".bi-runner and .bi-scene-close__body share one --sr-* token source, in both themes -- no forked copy of the palette", () => {
  assert.match(css, /^\.bi-runner, \.bi-scene-close__body \{/m, "the light-theme token block is no longer shared between the two dialogues");
  assert.match(css, /\.bi-runner\[data-bi-theme="dark"\], \.bi-scene-close__body\[data-bi-theme="dark"\] \{/, "the dark-theme override is no longer shared between the two dialogues");
});

test("en.json carries every localisation key this pass introduced", () => {
  const runner = en.BLANKINHERITANCE.Runner;
  const close = en.BLANKINHERITANCE.SceneClose;
  assert.equal(typeof runner.ThemeToggle, "string");
  assert.equal(typeof close.RecapTitle, "string");
  assert.equal(typeof close.HighlightsLabel, "string");
  assert.equal(typeof close.HighlightsEmpty, "string");
});
