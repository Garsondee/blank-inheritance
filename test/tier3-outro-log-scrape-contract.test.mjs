// Tier 3 — the outro surfaces what the session log already has, 2026-09-19.
//
// Found live (Ingram, reading Kit Issue's outro): its own writeDown prompts
// ask the GM to remember things by hand ("What each player picked from the
// catalogue", "Exactly what Nobu's extra item was for each player") that the
// note bar likely already captured live. His framing: "we should be
// scraping this information from the log instead not making me do that
// work." Doctrine's own Law 15: recording is a side effect of doing, never
// a separate task.
//
// Deliberately NOT auto-matching a writeDown prompt to a specific log entry
// (that's a GM judgment call on free-form prose, not a string comparison) --
// this surfaces everything logged during the scene, so writeDown reads as
// "anything still missing?" rather than "remember everything from scratch".
//
// scene-runner.mjs/panel.hbs are read as source/markup, matching every other
// tier3-*-contract.test.mjs in this project (ApplicationV2 destructures
// foundry.applications.api at module scope).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "scene-runner.mjs"), "utf8");
const panel = readFileSync(path.join(moduleRoot, "templates", "runner", "panel.hbs"), "utf8");
const en = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));

test("_prepareContext derives outro.alreadyLogged from the real session log, filtered to the current scene", () => {
  const outroBlock = src.match(/outro:\s*state\.outro[\s\S]*?:\s*null,/);
  assert.ok(outroBlock, "outro is no longer overridden after the ...state spread in _prepareContext");
  assert.match(outroBlock[0], /entries\.filter\(\(e\) => e\.context\?\.scene === canvas\?\.scene\?\.name\)/, "no longer filters the session log to entries logged during THIS scene");
  assert.match(outroBlock[0], /text:\s*e\.text/, "no longer carries the entry's own text through");
});

test("the outro fold renders what's already logged BEFORE the writeDown prompts, with a real label", () => {
  const outroFold = panel.match(/data-section="outro"[\s\S]*?<\/details>/);
  assert.ok(outroFold);
  assert.match(outroFold[0], /outro\.alreadyLogged/, "alreadyLogged is never rendered");
  assert.match(outroFold[0], /BLANKINHERITANCE\.Runner\.AlreadyLogged/, "the already-logged label is not localized");

  // Both live inside the same outer `{{#if outro.writeDown.length}}` guard
  // (alreadyLogged is only worth showing alongside real prompts to check
  // against), so compare where each one's own CONTENT actually renders --
  // the already-logged label against the writeDown topic list itself.
  const alreadyLoggedIndex = outroFold[0].indexOf("BLANKINHERITANCE.Runner.AlreadyLogged");
  const writeDownListIndex = outroFold[0].indexOf('<ul class="bi-runner__topics">');
  assert.ok(alreadyLoggedIndex >= 0 && writeDownListIndex >= 0);
  assert.ok(alreadyLoggedIndex < writeDownListIndex, "the already-logged content renders AFTER the writeDown prompt list, defeating the point of seeing it first");
});

test("AlreadyLogged has real localized text", () => {
  assert.match(en.BLANKINHERITANCE.Runner.AlreadyLogged, /\S/);
});
