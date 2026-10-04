// Tier 3 — the stage's wings, wired (2026-10-04, D060). Ingram: "Could scenes start with NPCs already in place, then reveal
// them in the main scene viewer content?" The adventure's bridge answers Stagecraft's wings (api.wings, 0.13.0): who waits,
// who else can be found, what the GM's card menu adds, and what to do when the GM brings someone on; and it puts a brief's
// `present` people on a scene's stage the first time it is opened. The pure halves are tier1-stage-wings.test.mjs (the
// adventure's) and module/stagecraft/test/wings.test.mjs (the stage's); the real presses are
// tools/stagecraft/bench/wings-check.mjs. This reads the Foundry halves as source, like every tier3 contract.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(path.join(ROOT, "module", "blank-inheritance", ...p), "utf8");
const bridge = read("scripts", "foundry", "stagecraft-bridge.mjs");
const stage = read("scripts", "foundry", "stage.mjs");
const cast = read("scripts", "foundry", "stage-cast.mjs");
const runner = read("scripts", "foundry", "scene-runner.mjs");
const en = JSON.parse(read("lang", "en.json"));
const fn = (src, re) => src.match(re)?.[0] ?? "";

test("the bridge answers Stagecraft's wings, finder and card menu, and listens for someone brought on", () => {
  const ready = fn(bridge, /Hooks\.once\("stagecraft\.ready", \(api\) => \{[\s\S]*?\n\}\);/);
  assert.match(ready, /api\?\.wings\?\.setProvider\?\.\(\(scene\) => wingsOf\(scene\)\)/);
  assert.match(ready, /api\?\.wings\?\.setFinder\?\.\(\(scene, query\) => findAnyone\(scene, query\)\)/);
  assert.match(ready, /api\?\.blocking\?\.setCardActions\?\.\(\(scene, cardId, card\) => cardActions\(scene, cardId, card\)\)/);
  assert.match(bridge, /Hooks\.on\("stagecraft\.bring", \(event\) => \{ bringOn\(event\)\.catch/);
});

test("the wings are the GM's alone, for the adventure's own scenes, from the brief with Ingram's edits laid over it", () => {
  const wings = fn(bridge, /async function wingsOf\(scene\) \{[\s\S]*?\n\}/);
  assert.match(wings, /if \(!game\.user\?\.isGM \|\| !scene\?\.flags\?\.\[NS\]\?\.stage\) return null;/);
  assert.match(wings, /if \(!ownsScene\(sourceId\)\) return null;/);
  assert.match(wings, /briefOfScene\(scene\)/);
  assert.match(wings, /waitingInWings\(\{ cast: brief\?\.cast \?\? \[\], published, def, idOf: portraitIdFor, keyOf: rawStageId \}\)/);
  assert.match(wings, /way: wayOf\(member\.arrival\) \?\? "quiet"/, "a person's own way is their authored arrival");
  assert.match(cast, /overlayScene\(\{ brief \}\)\.brief \?\? brief/, "the brief is read as the table will meet it, her edits included");
});

test("bringing someone on uses the one shared descriptor, their own arrival unless a way was picked, and the drop point", () => {
  const bring = fn(bridge, /export async function bringOn\([\s\S]*?\n\}/);
  assert.match(bring, /const sting = wayOf\(way\);/);
  assert.match(bring, /summonToStage\(target, summonDescriptorFor\(member, sting \?\? member\.arrival\), \{ at \}\)/);
  assert.match(bring, /portraitIdFor\(m\) === id/, "found by the id the stage knows them by");
  // the descriptor is built in one place for the Runner's Stage key, its entrance chips and the wings
  assert.match(cast, /export function summonDescriptorFor\(member, sting\)/);
  assert.match(runner, /import \{[^}]*summonDescriptorFor[^}]*\} from "\.\/stage-cast\.mjs"/);
  assert.doesNotMatch(runner, /^function summonDescriptorFor\(/m, "the Runner keeps no copy of its own");
});

test("a drop point is kept on the authored member, never published, and stands the new card there", () => {
  const summon = fn(stage, /export async function summonToStage\([\s\S]*?\n\}/);
  assert.match(summon, /\{ side = null, at = null \} = \{\}/);
  assert.match(summon, /member\.stageAt = Array\.isArray\(at\)/, "every summon writes it afresh, so a plain one goes back to the place");
  const layout = readFileSync(path.join(ROOT, "module", "blank-inheritance", "scripts", "core", "stage-layout.mjs"), "utf8");
  assert.doesNotMatch(fn(layout, /const PUBLISHABLE = Object\.freeze\(\[[\s\S]*?\]\);/), /stageAt/, "the drop point is never published");
  const core = readFileSync(path.join(ROOT, "module", "blank-inheritance", "scripts", "core", "stagecraft-bridge.mjs"), "utf8");
  assert.match(core, /card\.at = placeFor\(\{ member, key, def, cards: out, at: real\.get\(member\.portraitId\)\?\.stageAt \?\? null \}\);/);
});

test("the card menu sends someone off or tells their name through the same calls as the Runner, answered at once from memory", () => {
  const actions = fn(bridge, /function cardActions\(scene, cardId, card\) \{[\s\S]*?\n\}/);
  assert.match(actions, /castMemory\.get\(scene\.id\)/, "the menu cannot wait: the wings remember the authored cast and the names told");
  assert.match(actions, /removeFromStage\(game\.scenes\.get\(scene\.id\) \?\? scene, cardId\)/);
  assert.match(actions, /tellNameOf\(scene, cardId\)/);
  assert.match(fn(bridge, /async function tellNameOf\([\s\S]*?\n\}/), /tellName\(\{ nameKey: real\.nameKey, called: real\.called, name: real\.label \}\)/);
  assert.match(fn(runner, /static async #onRevealName\([\s\S]*?\n {2}\}/), /tellName\(\{ nameKey: rawStageId\(member\), called: member\.called, name: displayName\(member\) \}/, "the Runner's Name key tells it the same way");
  for (const k of ["SendOff", "TellName"]) assert.equal(typeof en.BLANKINHERITANCE.Wings.Menu[k], "string");
  for (const k of ["quiet", "announced", "splash"]) assert.equal(typeof en.BLANKINHERITANCE.Wings.Way[k], "string");
});

test("present people are put on before the party, the first time a scene is opened, by the acting GM alone", () => {
  const place = fn(bridge, /export async function placePresent\(scene\) \{[\s\S]*?\n\}/);
  assert.match(place, /!actingGM\(\) \|\| placing\.has\(scene\.id\)/, "one GM, once at a time");
  assert.match(place, /const staged = scene\.getFlag\(MODULE_ID, "stage"\) !== undefined;/, "a stage set already (by anyone, the party included) is left as it is");
  assert.match(place, /presentOnOpen\(\{ cast: brief\?\.cast \?\? \[\], kind: scene\.getFlag\(MODULE_ID, "kind"\) \?\? null, staged \}\)/);
  assert.match(place, /summonToStage\(scene, summonDescriptorFor\(member, "quiet"\)\)/, "they were there before the players walked in: no entrance");
  const ready = fn(bridge, /Hooks\.on\("canvasReady", async \(c\) => \{[\s\S]*?\n {2}\}\);/);
  assert.ok(ready.indexOf("placePresent(") > 0 && ready.indexOf("placePresent(") < ready.indexOf("ensureParty("), "the stage is read as unset before the party is put on it");
  assert.match(bridge, /if \(changes\?\.active === true\) placePresent\(scene\)/, "and as the scene is cut to");
});
