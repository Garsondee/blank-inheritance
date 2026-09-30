// Tier 3 — the edit sheet's templates against the Runner's code and styles
// (design/scene-edits.md §3). A button whose action nobody handles, or a
// partial nobody registered, fails silently in Foundry: the click does nothing,
// or the sheet renders an error in place of the scene. These catch both.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance");
const read = (relative) => readFileSync(path.join(moduleRoot, relative), "utf8");

const EDIT_TEMPLATES = ["edit.hbs", "edit-field.hbs", "edit-block.hbs", "edit-list.hbs", "edit-notes.hbs"];
const runner = read("scripts/foundry/scene-runner.mjs");

test("every button on the edit sheet has a handler in the Runner", () => {
  const actions = new Set();
  for (const name of [...EDIT_TEMPLATES, "panel.hbs"]) {
    for (const match of read(`templates/runner/${name}`).matchAll(/data-action="([A-Za-z]+)"/g)) actions.add(match[1]);
  }
  for (const action of ["toggleEdit", "editAddBeat", "editRemoveBeat", "editMoveBeat", "editUndoRemove", "editAddItem", "editRemoveItem", "editSaveNote", "editWithdrawNote"]) {
    assert.ok(actions.has(action), `the templates no longer offer ${action}`);
  }
  for (const action of actions) {
    assert.match(runner, new RegExp(`\\b${action}: SceneRunner\\.#on[A-Za-z]+`), `data-action="${action}" has no handler in SceneRunner.DEFAULT_OPTIONS.actions`);
  }
});

test("every edit partial is registered with the Runner's part, so a {{> ...}} of it resolves", () => {
  for (const name of EDIT_TEMPLATES) {
    assert.match(runner, new RegExp(`\\$\\{TEMPLATE_ROOT\\}/${name.replace(".", "\\.")}`), `${name} is not in SceneRunner.PARTS.panel.templates`);
  }
});

test("a box saves by its field key, and its name matches so Foundry's re-render keeps the focus on it", () => {
  const field = read("templates/runner/edit-field.hbs");
  for (const tag of field.match(/<(textarea|input|select)\b[^>]*>/g)) {
    assert.match(tag, /name="\{\{key\}\}"/, tag);
    assert.match(tag, /data-edit-key="\{\{key\}\}"/, tag);
  }
  for (const kind of ["number", "flag", "choice"]) assert.match(runner, new RegExp(`kind === "${kind}"`), `#commitField does not handle ${kind}`);
});

test("the edit sheet takes the whole drawer: it escapes the column grid at every width", () => {
  const css = read("styles/bi-components.css");
  const rule = /\.bi-runner__cols\.bi-runner__cols--editing\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule, "no rule for the editing columns");
  assert.match(rule[1], /display:\s*block/);
  const panel = read("templates/runner/panel.hbs");
  assert.match(panel, /bi-runner__cols bi-runner__cols--editing/);
  assert.match(panel, /\{\{> "modules\/blank-inheritance\/templates\/runner\/edit\.hbs" edit\}\}/);
  assert.match(panel, /\{\{#if title\}\}\{\{#unless editing\}\}\s*<footer class="bi-runner__notebar">/, "the note bar is for running a scene, not editing one");
});

test("every mark a save can set in place without a re-render is in the markup to be shown", () => {
  const field = read("templates/runner/edit-field.hbs");
  for (const state of ["pending", "clash", "behind", "draft", "failed"]) {
    assert.match(field, new RegExp(`bi-edit__mark--${state}`), state);
  }
  for (const cls of ["bi-edit__field--pending", "bi-edit__field--draft", "bi-edit__field--failed"]) {
    assert.match(runner, new RegExp(cls), `${cls} is set from the Runner`);
  }
});
