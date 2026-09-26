// Tier 3 — the Director's Palette's Foundry half, pinned against its own
// source (scripts/foundry/director-palette.mjs). The 2026-09-23 refresh
// (Ingram: "improve the Director's Palette — add more functionality and make
// sure it's up to date") added a Selected group, handouts, the log, every
// current panel and real turn controls; each assertion here guards a safety
// property or a staleness bug that refresh fixed.
//
// Needs no source trees; always runs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance");
const palette = readFileSync(path.join(moduleRoot, "scripts", "foundry", "director-palette.mjs"), "utf8");
const rolls = readFileSync(path.join(moduleRoot, "scripts", "foundry", "rolls.mjs"), "utf8");
const template = readFileSync(path.join(moduleRoot, "templates", "palette", "palette.hbs"), "utf8");

test("handouts can never push a GM-only journal to the table (Law 11)", () => {
  const reveal = palette.match(/function revealCommands\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(reveal, "revealCommands is missing");
  assert.match(reveal, /ownership\?\.default \?\? 0\) >= LIMITED/, "only entries players may already see are offered");
  assert.match(reveal, /Journal\.show\(entry\)/, "shown with Foundry's own show, no options");
  assert.doesNotMatch(reveal, /force/, "never forced past the entry's own permissions — the vaults are GM-only journals");
});

test("ending an encounter asks first (regression: it used to delete the combat outright)", () => {
  assert.match(palette, /id: "table\.endcombat"[^\n]*run: \(\) => game\.combat\?\.endCombat\(\)/);
  assert.doesNotMatch(palette, /game\.combat\?\.delete\(\)/);
});

test("the palette knows the panels as they are called today (regression: 'Phone' outlived its rename to Comms)", () => {
  assert.match(palette, /id: "panel\.comms"[^\n]*title: "Comms"/);
  assert.doesNotMatch(palette, /title: "Phone"/);
  for (const id of ["panel.console", "panel.party", "panel.hub", "panel.director", "panel.approvals", "panel.equipment", "panel.induction", "panel.demo", "audio.desk", "log.mark", "log.open"]) {
    assert.match(palette, new RegExp(`id: "${id.replace(/\./g, "\\.")}"`), `${id} is missing`);
  }
});

test("damage and healing go through the system's own applyDamage, never a raw HP write", () => {
  assert.match(palette, /actor\.applyDamage\(\{ damage: amount, token: token\.document \}\)/);
  assert.doesNotMatch(palette, /attributes\.hp\.value"?\s*:/, "a raw HP write skips IWR, shields and the dying chain");
});

test("conditions go through the actor's own condition methods", () => {
  for (const method of ["increaseCondition", "decreaseCondition", "toggleCondition"]) {
    assert.match(palette, new RegExp(`a\\.${method}\\?\\.\\(c\\.slug\\)`), `${method} is no longer used`);
  }
});

test("system table actions stay behind rolls.mjs (the one file allowed game.pf2e), by name", () => {
  assert.doesNotMatch(palette, /game\.pf2e/, "the palette must not reach into game.pf2e itself");
  assert.match(rolls, /SYSTEM_TABLE_ACTIONS = Object\.freeze\(\["restForTheNight", "treatWounds", "takeABreather"\]\)/);
  assert.match(rolls, /if \(!SYSTEM_TABLE_ACTIONS\.includes\(name\)\) throw/);
});

test("typed intents are rebuilt per keystroke and both the list and the keyboard see them", () => {
  assert.match(palette, /#allCommands\(\) \{[\s\S]*?quickCommands\(this\.#query\)/);
  assert.match(palette, /matchCommands\(this\.#query, this\.#allCommands\(\)/, "Enter must run what the list shows");
  assert.match(palette, /if \(command\.disabled\) \{/, "an inert row explains itself instead of running");
});

test("the empty palette teaches its own shortcuts and names what is selected", () => {
  assert.match(template, /\{\{#if showSyntax\}\}/);
  assert.match(template, /<code>athletics 18<\/code>/);
  assert.match(template, /\{\{#if subject\}\}/);
});
