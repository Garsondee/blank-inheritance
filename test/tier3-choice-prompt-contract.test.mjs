// Tier 3 — the choice prompt's Foundry half (foundry/choice-prompt.mjs) and
// where the module hands work to it.
//
// Pinned by reading the source, like tier3-city-departures-contract.test.mjs:
// Foundry's settings, queries and windows are not modelled by mock-foundry.mjs.
// The rules themselves are tested in tier1-choice-prompt.test.mjs.
//
// What this exists to catch is the ways this feature breaks silently in a real
// Foundry: a window that opens on the GM's screen, a setting a reset forgets,
// a pick that goes nowhere because the query was never registered, a language
// key that renders as its own name on a player's screen.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RESET_SETTINGS, resetValues } from "../module/blank-inheritance/scripts/core/admin.mjs";
import { emptyPromptState } from "../module/blank-inheritance/scripts/core/choice-prompt.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (rel) => readFileSync(path.join(moduleRoot, rel), "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const adapter = read("scripts/foundry/choice-prompt.mjs");
const entry = read("scripts/blank-inheritance.mjs");
const windowHbs = read("templates/choice-prompt/window.hbs");
const en = JSON.parse(read("lang/en.json"));

test("the open question is one world setting, written only by the GM", () => {
  assert.match(adapter, /game\.settings\.register\(MODULE_ID, SETTING, \{ scope: "world"/);
  assert.match(adapter, /const SETTING = "choicePrompt"/);
  const write = code(adapter).match(/async function writePrompt\(prompt\) \{[\s\S]*?\n\}/);
  assert.ok(write, "writePrompt is missing");
  assert.match(write[0], /if \(!game\.user\?\.isGM\) return null/, "a player's client can write the shared record");
});

test("a reset puts the question back to none, so a stale one never survives into the next run", () => {
  assert.ok(RESET_SETTINGS.includes("choicePrompt"));
  assert.deepEqual(resetValues({}).choicePrompt, emptyPromptState());
});

test("a player's pick reaches the GM through a registered query, and only the GM's client applies it", () => {
  assert.match(adapter, /const QUERY_PICK = `\$\{MODULE_ID\}\.choicePick`/);
  assert.match(adapter, /CONFIG\.queries\[QUERY_PICK\] = async \(data, \{ user \} = \{\}\) => gmChoicePick\(user\?\.id/, "the pick is no longer attributed to the user the server says sent it");
  const gm = code(adapter).match(/function gmChoicePick\(userId, optionId\) \{[\s\S]*?\n\}/);
  assert.ok(gm, "gmChoicePick is missing");
  assert.match(gm[0], /if \(!game\.user\?\.isGM \|\| !userId\) return \{ ok: false, reason: "not-gm" \}/);
  assert.match(gm[0], /applyPromptPick\(currentChoicePrompt\(\), \{ userId, optionId \}\)/, "the pick no longer goes through the pure rules");
  assert.match(code(adapter), /const serially =/, "picks are no longer applied one at a time");
});

test("a GM never gets the player's window, and a player who closed it is not nagged back into it", () => {
  const sync = code(adapter).match(/export function syncChoicePromptWindow\(\) \{[\s\S]*?\n\}/);
  assert.ok(sync, "syncChoicePromptWindow is missing");
  assert.match(sync[0], /if \(game\.user\?\.isGM\) return/);
  assert.match(sync[0], /dismissedId === prompt\.id/);
});

test("the module registers the setting in init and answers picks at ready; both repaint the window and the Runner", () => {
  assert.match(entry, /registerChoicePromptSettings\(\(\) => \{\s*syncChoicePromptWindow\(\);\s*refreshSceneRunner\(\);\s*\}\)/);
  assert.match(entry, /registerChoicePromptConversation\(\)/);
  const init = entry.indexOf('Hooks.once("init"');
  const ready = entry.indexOf('Hooks.once("ready"');
  assert.ok(init >= 0 && ready > init);
  assert.ok(entry.indexOf("registerChoicePromptSettings(") > init && entry.indexOf("registerChoicePromptSettings(") < ready, "the setting must be registered in init");
  assert.ok(entry.indexOf("registerChoicePromptConversation();") > ready, "the conversation must be opened at ready");
});

test("the window template is one element, with a button per option wired to pick, and the dashed 'Something else' state", () => {
  const bare = windowHbs.replace(/\{\{!--[\s\S]*?--\}\}/g, "").trim();
  assert.match(bare, /^<div class="bi-choice">/);
  assert.match(bare, /<\/div>$/);
  assert.match(windowHbs, /data-action="pick" data-option-id="\{\{this\.id\}\}"/);
  assert.match(windowHbs, /bi-choice__option--else/);
  // The player's button shows the blurb, never the GM's consequence.
  assert.match(windowHbs, /\{\{this\.blurb\}\}/);
  assert.doesNotMatch(windowHbs, /consequence/i, "the player's window must never print a choice's GM-only consequence");
  assert.match(windowHbs, /bi-choice__option--mine/);
  const opens = (bare.match(/\{\{#(if|each|unless)\b/g) ?? []).length;
  const closes = (bare.match(/\{\{\/(if|each|unless)\}\}/g) ?? []).length;
  assert.equal(opens, closes, "unbalanced Handlebars blocks");
});

test("every ChoicePrompt language key the code and templates use has real text", () => {
  const used = new Set();
  for (const src of [adapter, windowHbs, read("templates/runner/beat.hbs"), read("scripts/foundry/scene-runner.mjs")]) {
    for (const m of src.matchAll(/BLANKINHERITANCE\.ChoicePrompt\.([A-Za-z]+)/g)) used.add(m[1]);
  }
  assert.ok(used.has("NoGM") && used.has("NotTaken"), "both refusal messages must be written out in full, as tier0's key scan cannot read a built key");
  assert.ok(used.size >= 10, `expected to find the keys in use, found ${used.size}`);
  for (const key of used) {
    assert.match(String(en.BLANKINHERITANCE.ChoicePrompt?.[key] ?? ""), /\S/, `BLANKINHERITANCE.ChoicePrompt.${key} has no text`);
  }
});

test("closing the question records the whole split and logs who took which option", () => {
  const src = read("scripts/foundry/scene-runner.mjs");
  const close = src.match(/static async #onClosePrompt\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(close, "#onClosePrompt is missing");
  assert.match(close[0], /settlePrompt\(prompt\)/);
  assert.match(close[0], /choice: settled\.choice, picks: settled\.picks/, "the split is no longer kept alongside the single choice");
  assert.match(close[0], /choiceLogSubject\(beatId, option\.id\)/, "the picks are no longer logged under the same subject a by-hand choice uses");
  assert.match(close[0], /NobodyPicked/, "closing with nobody picked must say so rather than record nothing silently");
  // Deciding by hand while a question is open closes it: two answers must not both stand.
  const hand = src.match(/static async #onRecordChoice\(event, target\) \{[\s\S]*?\n {2}\}/);
  assert.match(hand[0], /closeChoicePrompt\(\)/);
});
