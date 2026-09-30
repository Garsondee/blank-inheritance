// Tier 3 — the Scene Runner's banner, event deck and rest (canon/decisions/D050.md),
// pinned by reading the source. The rules are tested in tier1-rest-and-deck.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RESET_SETTINGS } from "../module/blank-inheritance/scripts/core/admin.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(repoRoot, "module", "blank-inheritance", rel), "utf8");
const runner = read("scripts/foundry/scene-runner.mjs");
const adapter = read("scripts/foundry/runner-rest-deck.mjs");
const panel = read("templates/runner/panel.hbs");
const schema = JSON.parse(readFileSync(path.join(repoRoot, "data", "schema", "scene-brief.schema.json"), "utf8"));

test("the Runner shows the banner, the rest and the deck from the brief", () => {
  assert.match(runner, /spectrum: spectrumOf\(brief\),\s*deck: deckContext\(brief, currentEpisodeId\(\)\),\s*rest: restContext\(brief\),/);
  assert.match(panel, /class="bi-runner__spectrum" data-spectrum="\{\{spectrum\.id\}\}"/, "the banner's colour comes from the band");
  for (const action of ["drawEvent", "witnessEvent", "returnEvent", "applyRest"]) {
    assert.match(panel, new RegExp(`data-action="${action}"`), `no ${action} button`);
    assert.match(runner, new RegExp(`${action}: SceneRunner\\.#on`), `no ${action} handler`);
  }
});

test("deck state is a world setting the admin reset puts back", () => {
  assert.match(adapter, /game\.settings\.register\(MODULE_ID, SETTING_DECKS, \{ scope: "world"/);
  assert.match(adapter, /export const SETTING_DECKS = "runnerDecks";/);
  assert.ok(RESET_SETTINGS.includes("runnerDecks"));
  assert.match(runner, /registerDeckSettings\(\(\) => refreshSceneRunner\(\)\);/);
});

test("a rest heals only the players sent to it, or the whole roster when nobody was sent", () => {
  assert.match(adapter, /const sent = participantUserIds\(briefId\);\s*const userIds = sent\.length \? sent : cityRoster\(\)\.map\(\(m\) => m\.userId\);/);
  assert.match(adapter, /await actor\.update\(\{ "system\.attributes\.hp\.value": outcome\.to \}\);/);
  assert.match(adapter, /if \(!game\.user\?\.isGM \|\| !rest\) return \[\];/);
});

test("the schema carries the band, the rest and the deck", () => {
  assert.deepEqual(schema.properties.spectrum.enum, ["story", "mixed", "downtime"]);
  assert.deepEqual(schema.properties.rest.properties.hp.enum, ["quarter", "half", "three-quarters", "full"]);
  assert.deepEqual(schema.properties.events.items.required, ["id", "title", "text"]);
  assert.equal(schema.properties.deckRef.type, "string");
});

test("found live: the Runner's list of whom a rest covers follows any player's character changing", () => {
  const entry = read("scripts/blank-inheritance.mjs");
  assert.match(entry, /Hooks\.on\("updateUser", \(user, changes\) => \{\s*if \(!\("character" in changes\)\) return;[\s\S]*?if \(game\.user\.isGM\) \{\s*refreshSceneRunner\(\);\s*refreshAdminPanel\(\);/);
});

test("haunts (D051): rumours, regulars and the alert reach the Runner, and every button has a handler", () => {
  assert.match(runner, /rumours: rumourContext\(brief, currentEpisodeId\(\)\),/);
  assert.match(runner, /regulars: regularsContext\(brief\),/);
  for (const action of ["rumourSet", "dealRumours", "shiftRegular"]) {
    assert.match(panel, new RegExp(`data-action="${action}"`), `no ${action} button`);
    assert.match(runner, new RegExp(`${action}: SceneRunner\.#on`), `no ${action} handler`);
  }
  assert.match(panel, /class="bi-runner__alert" data-alert="\{\{deck\.alert\}\}"/);
});

test("regulars' attitudes are a world setting the reset puts back, and they come home to Claude", () => {
  assert.match(adapter, /game\.settings\.register\(MODULE_ID, SETTING_ATTITUDES, \{ scope: "world"/);
  assert.ok(RESET_SETTINGS.includes("hauntAttitudes"));
  assert.match(adapter, /writeStorageJson\("", ATTITUDES_FILE, payload\)/);
  const settings = readFileSync(path.join(repoRoot, ".claude", "settings.json"), "utf8");
  assert.match(settings, /node tools\/haunts\/pull\.mjs --line/, "the session no longer starts with the regulars in front of Claude");
});
