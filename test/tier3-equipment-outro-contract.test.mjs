// Tier 3 — the equipment locker's own grants, scraped into a scene's outro
// instead of asking the GM to remember them (#178).
//
// Found live (Ingram, running Kit Issue): the outro's writeDown prompts
// asked "what each player picked from the catalogue" and "exactly what
// Nobu's extra item was" by memory, when the equipment locker had already
// recorded both as real grants (foundry/equipment-state.mjs's own settings-
// backed log) the whole time — design/ux-doctrine.md Law 15 ("recording is
// a side effect of doing, never a separate task"). This is the same fix
// shape as #186's outcome tally and outro alreadyLogged: read the record
// that already exists, don't add a second one.
//
// scene-runner.mjs/equipment-state.mjs/the templates are read as source,
// matching every other tier3-*-contract.test.mjs in this project.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const runnerSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const equipStateSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "equipment-state.mjs"), "utf8");
const panelSrc = readFileSync(path.join(moduleRoot, "scripts", "foundry", "equipment-panel.mjs"), "utf8");
const panelHbs = readFileSync(path.join(moduleRoot, "templates", "console", "equipment-panel.hbs"), "utf8");
const runnerPanelHbs = readFileSync(path.join(moduleRoot, "templates", "runner", "panel.hbs"), "utf8");

test("a grant is stamped with the live scene's name and its kind (issue/bonus) at write time, not guessed at later", () => {
  const fn = equipStateSrc.match(/async function resolveGrantRequest\([\s\S]*?\n\}/);
  assert.ok(fn, "resolveGrantRequest is missing from equipment-state.mjs");
  assert.match(fn[0], /scene:\s*canvas\?\.scene\?\.name/, "no longer tags a grant with the scene that was live when it was made");
  assert.match(fn[0], /kind,/, "no longer accepts a kind override -- bonus grants would be indistinguishable from ordinary issues");
});

test("only the GM's own bonus toggle can mark a grant as Nobu's free extra -- a player's own request always issues normally", () => {
  const fn = equipStateSrc.match(/export function requestGrant\([\s\S]*?\n\}/);
  assert.ok(fn);
  assert.match(fn[0], /game\.user\.isGM && kind === "bonus" \? "bonus" : "issue"/, "a non-GM request could mark its own grant as bonus");
});

test("equipmentGrantsForScene is exported for the Scene Runner's own outro to read", () => {
  assert.match(equipStateSrc, /export async function equipmentGrantsForScene\(sceneName\)/);
  assert.match(equipStateSrc, /grantsForScene\(sceneName, catalogue, currentGrants\(\)\)/);
});

test("the equipment panel has a GM-only bonus toggle mirroring the existing force toggle", () => {
  assert.match(panelSrc, /#bonus = false/);
  assert.match(panelSrc, /toggleBonus:\s*EquipmentPanel\.#onToggleBonus/);
  assert.match(panelSrc, /kind:\s*this\.#bonus \? "bonus" : "issue"/);
  assert.match(panelHbs, /data-action="toggleBonus"/);
});

test("the equipment log shows which grants were the bonus, not just a flat list", () => {
  assert.match(panelHbs, /this\.isBonus/, "the log row never checks isBonus -- a GM reading the panel can't tell a bonus grant from an ordinary one");
});

test("the outro reads equipment grants for the live scene, split into issued vs bonus", () => {
  const fn = runnerSrc.match(/async _prepareContext\(\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "_prepareContext is missing from scene-runner.mjs");
  assert.match(fn[0], /equipmentGrantsForScene\(canvas\?\.scene\?\.name/, "no longer reads equipment grants for the current scene");
  assert.match(fn[0], /equipmentIssued:\s*equipmentGrants\.filter\(\(g\) => !g\.isBonus\)/);
  assert.match(fn[0], /equipmentBonus:\s*equipmentGrants\.filter\(\(g\) => g\.isBonus\)/);
});

test("panel.hbs renders both equipment blocks in the outro fold, and the block stays balanced", () => {
  assert.match(runnerPanelHbs, /outro\.equipmentIssued/);
  assert.match(runnerPanelHbs, /outro\.equipmentBonus/);
  assert.match(runnerPanelHbs, /BLANKINHERITANCE\.Runner\.EquipmentIssued/);
  assert.match(runnerPanelHbs, /BLANKINHERITANCE\.Runner\.EquipmentBonus/);

  const withoutComments = runnerPanelHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  const opens = (withoutComments.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (withoutComments.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, `panel.hbs has unbalanced Handlebars blocks (${opens} opens, ${closes} closes)`);
});

test("equipment grants are only fetched when there's an outro to show them in -- no per-scene special-casing needed", () => {
  const fn = runnerSrc.match(/async _prepareContext\(\) \{[\s\S]*?\n {2}\}/);
  assert.match(fn[0], /const equipmentGrants = state\.outro \? await equipmentGrantsForScene/, "fetches equipment grants unconditionally, even for scenes with no outro at all");
});
