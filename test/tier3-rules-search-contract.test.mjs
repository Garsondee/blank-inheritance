// Tier 3 — the Rules drawer wired into the Scene Runner (design/ux-doctrine.md
// §10.7). core/rules-search.mjs's own scoring is tier1-rules-search.test.mjs;
// this pins that scene-runner.mjs, panel.hbs and the section registry
// actually expose it as a real, one-keystroke GM action, matching every
// other tier3-*-contract.test.mjs in this project (source read, not mounted).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const runnerSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const panelHbs = readFileSync(path.join(moduleRoot, "templates", "runner", "panel.hbs"), "utf8");
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
const briefSrc = readFileSync(path.join(moduleRoot, "scripts", "core", "scene-brief.mjs"), "utf8");

test("scene-runner.mjs imports the real search function and index loader, not a stub", () => {
  assert.match(runnerSrc, /import \{ searchRules \} from "\.\.\/core\/rules-search\.mjs"/);
  assert.match(runnerSrc, /import \{ loadRulesIndex \} from "\.\/rules-index\.mjs"/);
});

test("the rules input is wired the same type-and-press-enter way as the note bar, not a data-action button", () => {
  const wiring = runnerSrc.match(/const rulesInput = this\.element\.querySelector\("\.bi-runner__rules-input"\);[\s\S]*?\}\);/);
  assert.ok(wiring, "the rules-input keydown listener is missing from _onRender");
  assert.match(wiring[0], /event\.key !== "Enter"/);
  assert.match(wiring[0], /SceneRunner\.#onSearchRules\.call\(this, event\)/);
});

test("#onSearchRules resolves the real index and stores results for the next render, and an empty query clears results rather than showing the last search stale", () => {
  const handler = runnerSrc.match(/static async #onSearchRules\(event\) \{[\s\S]*?\n {2}\}/);
  assert.ok(handler, "#onSearchRules is missing from scene-runner.mjs");
  assert.match(handler[0], /query \? searchRules\(await loadRulesIndex\(\), query\) : \[\]/, "an empty query should clear results, not silently keep showing the previous search");
});

test("_prepareContext exposes rules.query/rules.results in BOTH the no-scene-loaded and full-scene paths -- the drawer must work with nothing open", () => {
  const noSceneReturn = runnerSrc.match(/if \(!loaded\) \{\s*return \{[\s\S]*?\};\s*\}/);
  assert.ok(noSceneReturn, "the no-scene-loaded early return is missing");
  assert.match(noSceneReturn[0], /rules:\s*\{\s*query:\s*this\.#rulesQuery,\s*results:\s*this\.#rulesResults\s*\}/);

  const occurrences = runnerSrc.match(/rules:\s*\{\s*query:\s*this\.#rulesQuery,\s*results:\s*this\.#rulesResults\s*\}/g) ?? [];
  assert.equal(occurrences.length, 2, "expected exactly two returns to expose rules.{query,results} -- the no-scene-loaded path and the full-scene path");
});

test("the Rules search is always on screen (2026-09-24), never a fold that has to be opened before it can be typed in", () => {
  // It used to be a closed <details> in a single-column scroll. In the wide,
  // columned runner it sits at the foot of the kit column, and the header's
  // own Rules key (focusRules) brings it into view with the cursor in it.
  assert.doesNotMatch(briefSrc, /\{\s*id:\s*"rules"/, "rules no longer has a fold state to remember");
  const rulesBlock = panelHbs.match(/<section class="bi-runner__section bi-runner__rules" data-section="rules">[\s\S]*?<\/section>/);
  assert.ok(rulesBlock, "the Rules section is missing or has become something other than an always-open section");
  assert.doesNotMatch(rulesBlock[0], /<details/);
  assert.match(panelHbs, /data-action="focusRules"/, "the header's one-press way to the search box is gone");
  assert.match(runnerSrc, /focusRules:\s*SceneRunner\.#onFocusRules/);
});

test("panel.hbs renders the Rules section with results and an empty state, and stays balanced", () => {
  assert.match(panelHbs, /data-section="rules"/);
  assert.match(panelHbs, /class="bi-runner__rules-input"/);
  assert.match(panelHbs, /value="\{\{rules\.query\}\}"/, "the input must echo back the last query after a re-render, or the GM loses sight of what they searched");
  assert.match(panelHbs, /\{\{#each rules\.results\}\}/);
  assert.match(panelHbs, /this\.pageCitation/, "a result must show its page citation -- doctrine's own 'an answer and a reference, not an article'");
  assert.match(panelHbs, /BLANKINHERITANCE\.Runner\.Rules\.NoResults/);

  const withoutComments = panelHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `panel.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test(".bi-rules__result and its title/excerpt/citation children are real, styled CSS", () => {
  assert.match(css, /\.bi-rules__results\s*\{/);
  assert.match(css, /\.bi-rules__result\s*\{/);
  assert.match(css, /\.bi-rules__result-title\s*\{/);
  assert.match(css, /\.bi-rules__result-excerpt\s*\{/);
  assert.match(css, /\.bi-rules__result-citation\s*\{/);
  assert.match(css, /\.bi-runner__rules-input\s*\{/);
});
