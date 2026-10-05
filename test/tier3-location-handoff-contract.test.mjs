// The Location Editor's "Copy for Claude" key (design/location-editor.md section 14): it is on the panel for a single picked shape and for a
// multi-selection, the editor wires it to the pure hand-off builder and copies through Foundry's own clipboard, and its words exist. The same
// thing with a real click is tools/location-sync/foundry-buildings-check.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(repo, p), "utf8").replace(/\r\n/g, "\n");
const panel = read("module/blank-inheritance/templates/location-editor/panel.hbs");
const editor = read("module/blank-inheritance/scripts/foundry/location-editor.mjs");
const layer = read("module/blank-inheritance/scripts/foundry/location-draw-layer.mjs");
const lang = JSON.parse(read("module/blank-inheritance/lang/en.json")).BLANKINHERITANCE.LocationEditor.Handoff;

test("the panel offers the key for one picked shape (beside Save) and for several (beside Delete)", () => {
  const at = [...panel.matchAll(/data-action="copyForClaude"/g)].map((m) => m.index);
  assert.equal(at.length, 2);
  const batch = panel.indexOf('data-action="deleteSelected"');
  const save = panel.indexOf('data-action="save"');
  assert.ok(batch > 0 && save > batch);
  assert.ok(at[0] > batch && at[0] < save, "the first key is in the multi-selection block, after Delete");
  assert.ok(at[1] > save, "the second is in the single-shape block, after Save");
});

test("the editor wires it: the live shape and form, the map calibration, the deployed locations, Foundry's clipboard, and nothing written to the world", () => {
  assert.match(editor, /copyForClaude: LocationEditorApplication\.#onCopyForClaude,/);
  const body = editor.slice(editor.indexOf("static async #onCopyForClaude()"), editor.indexOf("static async #onSave()"));
  assert.match(body, /buildHandoff\(/);
  assert.match(body, /getSession\?\.\(\)\.items\?\.\[snapshot\.localId\]/, "the layer's LIVE copy of each shape, not the selection snapshot");
  assert.match(body, /this\.#fields/, "the form as it is now");
  assert.match(body, /toImagePoint\(p, calibration\)/);
  assert.match(body, /publishedShapes/);
  assert.match(body, /game\.clipboard\?\.copyPlainText/);
  assert.doesNotMatch(body, /saveLocationEdit|createEmbedded|\.update\(|setFlag/, "copying changes nothing");
  assert.match(layer, /get publishedShapes\(\) \{\n\s+return this\.#published;/);
});

test("its words exist", () => {
  for (const key of ["Button", "Hint", "Copied", "NothingSelected", "NothingDrawn", "NoClipboard"]) assert.ok(lang[key], key);
  assert.match(lang.Copied, /\{count\}/);
});
