// The Scene Runner's header has a small Location Editor key ("Locations") beside the others. Ingram, 2026-10-05: clicking it should move the GM to
// 01. The City (the Campaign Map) first, then activate the editor for it to work. Held here: the key is in the header, its handler is wired, and the
// function it calls cuts to the hub with `view` (this GM's screen only: never `activate`, which would pull the players) BEFORE it opens the editor
// and puts the canvas into it. The same thing with real clicks is tools/location-sync/foundry-locations-key-check.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(repo, p), "utf8").replace(/\r\n/g, "\n");
const runner = read("module/blank-inheritance/scripts/foundry/scene-runner.mjs");
const panel = read("module/blank-inheritance/templates/runner/panel.hbs");
const editor = read("module/blank-inheritance/scripts/foundry/location-editor.mjs");
const lang = JSON.parse(read("module/blank-inheritance/lang/en.json"));

test("the header has a Locations key wired to the Scene Runner's handler, which calls the editor's own function", () => {
  assert.match(panel, /data-action="openLocationEditor"/);
  assert.match(runner, /openLocationEditor: SceneRunner\.#onOpenLocationEditor,/);
  assert.match(runner, /static async #onOpenLocationEditor\(\) \{\n\s+await openLocationEditorOnMap\(\);/);
  assert.match(runner, /import \{ openLocationEditorOnMap \} from "\.\/location-editor\.mjs";/);
});

test("it is a small key among the others: the same tier-1 button, with an icon and a short word, and a tooltip that names the editor", () => {
  const key = panel.match(/<button[^>]*data-action="openLocationEditor"[\s\S]*?<\/button>/)?.[0] ?? "";
  assert.match(key, /bi-runner__tier1-btn/);
  assert.match(key, /fa-map-location-dot/);
  const runnerLang = lang.BLANKINHERITANCE.Runner;
  assert.ok(runnerLang.LocationsKey.length <= 12, "short enough not to crowd the header");
  assert.match(runnerLang.LocationsKeyHint, /Location Editor/);
  assert.match(runnerLang.LocationsKeyHint, /01\. The City/);
  assert.ok(lang.BLANKINHERITANCE.LocationEditor.NoHubScene);
});

test("the function cuts this GM's screen to the hub first (view, never activate), waits for the canvas, then opens the editor and claims the canvas", () => {
  const start = editor.indexOf("export async function openLocationEditorOnMap()");
  assert.ok(start > 0, "the function is exported");
  const body = editor.slice(start, editor.indexOf("export function refreshLocationEditor", start));
  const view = body.indexOf("await hub.view()");
  const settle = body.indexOf("canvas?.scene?.id !== hub.id) await", view);
  const open = body.indexOf("openLocationEditor()");
  const claim = body.indexOf("layer.activate(");
  assert.ok(view > 0 && settle > view && open > settle && claim > open, "view, then wait, then open, then claim the canvas");
  assert.doesNotMatch(body, /hub\.activate\(/, "the players are not moved");
  assert.match(body, /game\.user\?\.isGM/, "a GM's key only");
  assert.match(body, /if \(canvas\?\.scene\?\.id !== hub\.id\)/, "already on the map: no second cut");
});
