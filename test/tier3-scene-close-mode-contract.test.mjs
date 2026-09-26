// Tier 3 — what the close dialogue knows about the scene it is closing, and
// what it does with that knowledge.
//
// REWRITTEN 2026-09-22. This file used to pin a cost vocabulary that varied
// by scene mode (a fight offering fight outcomes, a negotiation offering
// negotiation outcomes — design/ux-doctrine.md §10.3a, GitHub #125). That
// picker is gone: three of its seven combat options named systems that have
// since been CUT (Bleed, an Anchor violated, and the Frame/technician economy
// around them), and it was one of the two rows that made the dialogue too
// tall to finish using. See core/scene-close.mjs's header.
//
// `mode` itself survives and is still threaded through both call sites, so
// the contract worth keeping is the one that remains true: the dialogue is
// TOLD which scene it is closing — brief, title, mode, prompts — and records
// that on the session-log entry instead of guessing at the canvas scene. A
// later review genuinely wants to know a scene was `social` rather than
// `combat`, and `recordLogEntry` has always had a `mode` slot that nothing
// was filling.
//
// The open-setups half of this file is unchanged: it was never about cost.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const runnerSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const closeSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-close.mjs"), "utf8");
const closeHbs = readFileSync(path.join(moduleRoot, "templates", "console", "scene-close.hbs"), "utf8");
const css = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");

test("both scene-runner.mjs call sites that open the close dialogue pass the leaving/current brief's own mode", () => {
  const cueSceneFn = runnerSrc.match(/static async #onCueScene\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(cueSceneFn, "#onCueScene is missing from scene-runner.mjs");
  assert.match(cueSceneFn[0], /openSceneCloseDialogue\(\{[^}]*mode:\s*brief\?\.mode/, "closing the LEAVING scene on cueScene no longer passes its own mode");

  const closeSceneFn = runnerSrc.match(/static #onCloseScene\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(closeSceneFn, "#onCloseScene is missing from scene-runner.mjs");
  assert.match(closeSceneFn[0], /openSceneCloseDialogue\(\{[^}]*mode:\s*this\._scene\?\.brief\?\.mode/, "the explicit Close Scene button no longer passes the current brief's mode");
});

test("the dialogue is TOLD which scene it is closing, and never guesses -- setContext carries brief, title and mode together", () => {
  assert.match(closeSrc, /setContext\(\{ briefRef = null, title = null, mode = null,/, "setContext no longer accepts brief/title/mode");
  assert.match(closeSrc, /this\.#context = \{ briefRef, title, mode, reactionPrompts \}/, "setContext no longer stores what it was told");
  assert.match(closeSrc, /mode: this\.#context\.mode/, "#onVerdict no longer forwards mode into confirmSceneClosure");
});

test("a closure records WHICH scene closed and what kind of scene it was, on the real session-log entry", () => {
  const confirmFn = closeSrc.match(/export async function confirmSceneClosure\([\s\S]*?\n\}/);
  assert.ok(confirmFn, "confirmSceneClosure is missing");
  const record = confirmFn[0].match(/await recordLogEntry\(\{[\s\S]*?\}\);/);
  assert.ok(record, "confirmSceneClosure no longer writes a log entry at all");
  assert.match(record[0], /scene:\s*scene \?\? canvas\?\.scene\?\.name/, "the log entry no longer names the scene, falling back to the canvas only when it was not told one");
  assert.match(record[0], /subject:\s*briefRef/, "the log entry no longer names the brief it closed");
  assert.match(record[0], /\bmode,/, "the scene's own mode is no longer recorded, so a later review cannot tell a social scene from a fight");
});

test("the scene-close dialogue surfaces open setups (#10.3a's scene-break suggestion) from the real session log, not a second copy of it", () => {
  assert.match(closeSrc, /import \{[^}]*openSetups[^}]*\} from "\.\.\/core\/scene-close\.mjs"/, "openSetups is no longer imported");
  assert.match(closeSrc, /import \{[^}]*currentEntries[^}]*\} from "\.\/session-log\.mjs"/, "currentEntries is no longer imported -- setups would have nothing to read from");

  const prepareContext = closeSrc.match(/async _prepareContext\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(prepareContext, "_prepareContext is missing from the SceneCloseDialogue class");
  assert.match(prepareContext[0], /setups:\s*openSetups\(currentEntries\(\)\)/, "_prepareContext no longer resolves setups from the real log");
  assert.match(prepareContext[0], /highlights:\s*sceneHighlights\(currentEntries\(\)/, "_prepareContext no longer resolves this scene's own logged highlights");
});

test("scene-close.hbs renders the setups list only when there is one, purely informational (never gating a verdict), and stays balanced", () => {
  assert.match(closeHbs, /\{\{#if setups\.length\}\}/, "setups is never checked in scene-close.hbs");
  assert.match(closeHbs, /BLANKINHERITANCE\.SceneClose\.SetupsLabel/);
  assert.match(closeHbs, /\{\{#each setups\}\}/);

  const withoutComments = closeHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `scene-close.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test("the recap lives in its own read-only column, beside the decisions rather than above them", () => {
  const recapAt = closeHbs.indexOf('class="bi-scene-close__recap"');
  const decideAt = closeHbs.indexOf('class="bi-scene-close__decide"');
  assert.ok(recapAt > -1, "the recap section is gone from the template");
  assert.ok(decideAt > recapAt, "the recap should be the FIRST column, read before the fields beside it");
  assert.match(css, /\.bi-scene-close__setups \{/);
  assert.match(css, /\.bi-scene-close__setup-scene \{/);
});
