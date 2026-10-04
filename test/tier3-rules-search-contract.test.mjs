// Tier 3 — the rules, wired (2026-10-04, D060). The Scene Runner's free search box went ("The rules search box isn't very
// useful either", Ingram): the Runner now offers the rules its scene's own words name ("Rules in this scene",
// core/scene-rules.mjs), each opening the system's own card or the SRD article, and the free search over the mirrored SRD
// lives in the Palette, where a GM already types ("rule flanking"), with every glossary rule a Palette command of its own.
// core/rules-search.mjs's scoring is tier1-rules-search.test.mjs; core/scene-rules.mjs is tier1-scene-rules.test.mjs. This
// pins the wiring, read as source like every other tier3-*-contract test (ApplicationV2 at module scope).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (...p) => readFileSync(path.join(moduleRoot, ...p), "utf8");
const runnerSrc = read("scripts", "foundry", "scene-runner.mjs");
const paletteSrc = read("scripts", "foundry", "director-palette.mjs");
const paletteCore = read("scripts", "core", "director-palette.mjs");
const paletteHbs = read("templates", "palette", "palette.hbs");
const glossarySrc = read("scripts", "foundry", "rules-glossary.mjs");
const panelHbs = read("templates", "runner", "panel.hbs");
const css = read("styles", "bi-components.css");
const en = JSON.parse(read("lang", "en.json"));

test("the Runner's search box is gone, with its key, its handlers and its styles", () => {
  assert.doesNotMatch(panelHbs, /bi-runner__rules-input|data-section="rules"|focusRules|rules\.results/);
  assert.doesNotMatch(runnerSrc, /#onSearchRules|#onFocusRules|#rulesQuery|searchRules|loadRulesIndex/);
  assert.doesNotMatch(css, /\.bi-runner__rules-input|\.bi-rules__result/);
  assert.equal(en.BLANKINHERITANCE.Runner.Rules, undefined, "the box's words outlived it");
});

test("the Runner offers the rules its scene names: computed from the loaded scene and the glossary, one press each", () => {
  assert.match(runnerSrc, /import \{ rulesInScene \} from "\.\.\/core\/scene-rules\.mjs"/);
  assert.match(runnerSrc, /import \{ loadRulesGlossary, openRule \} from "\.\/rules-glossary\.mjs"/);
  assert.match(runnerSrc, /sceneRules: \(this\._sceneRules = rulesInScene\(\{ brief, challenges, encounters: loaded\.encounters \?\? \{\}, subsystem \}, await loadRulesGlossary\(\)\)\)/);
  assert.match(runnerSrc, /openRule:\s*SceneRunner\.#onOpenRule/);
  const handler = runnerSrc.match(/static async #onOpenRule\(event, target\) \{[\s\S]*?\n {2}\}/)?.[0] ?? "";
  assert.match(handler, /this\._sceneRules \?\? \[\]\)\.find\(\(r\) => r\.id === target\.dataset\.ruleId\)/, "a press opens the rule that was rendered, by its id");
  assert.match(handler, /await openRule\(rule\)/);
  const section = panelHbs.match(/\{\{#if sceneRules\.length\}\}[\s\S]*?\{\{\/if\}\}\n/)?.[0] ?? "";
  assert.match(section, /data-action="openRule" data-rule-id="\{\{id\}\}"/);
  assert.match(section, /class="bi-runner__rule" data-kind="\{\{kind\}\}"/, "coloured by what it is, through a data attribute (a built class name escapes the stylesheet check)");
  assert.match(section, /data-tooltip="\{\{summary\}\}"/);
  assert.match(section, /BLANKINHERITANCE\.Runner\.SceneRules\.Hint/, "the section says where any other rule is");
  for (const k of ["creature", "condition", "action", "rule"]) assert.ok(css.includes(`.bi-runner__rule[data-kind="${k}"] {`), `a ${k} chip is not styled`);
});

test("a rule opens the system's own card by its UUID, or the SRD article from the shipped index, marked where it names the rule", () => {
  const open = glossarySrc.match(/export async function openRule\(rule\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(open, /await fromUuid\(rule\.uuid\)/);
  assert.match(open, /doc\.sheet\.render\(true\)/);
  assert.match(open, /\(await loadRulesIndex\(\)\)\.find\(\(a\) => a\.id === rule\.srd\)/);
  assert.match(glossarySrc, /\/\^RETRIEVAL NOTE:\/i/, "the mirror's retrieval note is never shown as the rule");
  assert.match(glossarySrc, /data-here="1"/);
  assert.match(glossarySrc, /const GLOSSARY_PATH = "data\/rules-glossary\.json"/);
});

test("the Palette searches the rules: 'rule <words>' pinned at the top, every glossary rule a command of its own, in a group of its own", () => {
  assert.match(paletteSrc, /import \{ searchRules \} from "\.\.\/core\/rules-search\.mjs"/);
  assert.match(paletteSrc, /import \{ loadRulesIndex \} from "\.\/rules-index\.mjs"/);
  assert.match(paletteSrc, /const m = \/\^\(\?:rules\?\|srd\)\\s\+\(\.\+\)\$\/i\.exec/, "the typed shortcut is rule, rules or srd and some words");
  assert.match(paletteSrc, /searchRules\(rulesIndex \?\? \[\], words, \{ limit: 5 \}\)/);
  assert.match(paletteSrc, /return \[\.\.\.quickCommands\(this\.#query\), \.\.\.ruleSearchCommands\(this\.#query\), \.\.\.this\.#commands\];/);
  assert.match(paletteSrc, /\.\.\.panelCommands\(\),\n {4}\.\.\.ruleCommands\(\)/);
  assert.match(paletteSrc, /group: "rules"/);
  assert.match(paletteCore, /\{ id: "rules", label: "Rules" \}\n\]\);/, "the rules group sorts last: typed for, never browsed");
  // the index and the glossary are read before the first list is built, so the first keystroke already finds them
  const prepare = paletteSrc.match(/async _prepareContext\(\) \{[\s\S]*?\n {2}\}/)?.[0] ?? "";
  assert.ok(prepare.indexOf("loadRulesGlossary()") >= 0 && prepare.indexOf("loadRulesGlossary()") < prepare.indexOf("paletteModel("));
  assert.match(paletteHbs, /<code>rule flanking<\/code>/, "the typed shortcut is shown with the others");
});
