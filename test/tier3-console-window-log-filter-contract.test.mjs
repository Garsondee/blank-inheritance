// Tier 3 — the Log tab's filter chips, 2026-09-19 (design/ux-doctrine.md
// §10.7's Log drawer: "the review surface... where a post-session pass
// happens"). Found genuinely unbuilt: tab-log.hbs rendered the whole
// session's log as one flat, unfilterable list -- a GM reviewing what
// happened in one specific scene, or looking only for `decision:`-tagged
// lines, had to scroll and read everything to find them by eye.
//
// The pure filtering logic (core/phone.mjs#logFilterOptions/filterLogEntries)
// has its own real, executing unit tests (test/tier1-phone.test.mjs) --
// this file only pins the Foundry-side WIRING: that ConsoleWindow actually
// calls them, that the filter state lives on the app instance (not a world
// setting -- what one GM has narrowed their own review down to is not a fact
// about the campaign), and that the action is registered. Read as source
// rather than mounted, matching every other tier3-*-contract.test.mjs in
// this project (ApplicationV2 destructures foundry.applications.api at
// module scope, and game.settings/canvas aren't modelled deeply enough by
// test/support/mock-foundry.mjs to execute a real render either way).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "console-window.mjs"), "utf8");
const tabLog = readFileSync(path.join(moduleRoot, "templates", "console", "window", "tab-log.hbs"), "utf8");
const en = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));

test("console-window.mjs imports the shared filtering logic rather than re-deriving it", () => {
  assert.match(
    src,
    /import\s*\{\s*formatLogEntriesForDisplay,\s*filterLogEntries,\s*logFilterOptions\s*\}\s*from\s*"\.\.\/core\/phone\.mjs"/,
    "no longer imports filterLogEntries/logFilterOptions from core/phone.mjs"
  );
});

test("the Log tab's filter state is a client-side instance field, never a world setting -- one GM's own review pass is not a fact about the campaign", () => {
  assert.match(src, /#logTypeFilter = "";/, "the type filter is no longer a private instance field");
  assert.match(src, /#logSceneFilter = "";/, "the scene filter is no longer a private instance field");
  assert.doesNotMatch(
    src.match(/#logTypeFilter[\s\S]{0,400}/)[0],
    /game\.settings\.(get|set|register)/,
    "the log filter state must never round-trip through a world setting"
  );
});

test("buildLogTab reads app.logFilters (a public getter), since a free function cannot reach a private class field directly", () => {
  assert.match(src, /get logFilters\(\)\s*\{\s*\n\s*return \{ type: this\.#logTypeFilter, scene: this\.#logSceneFilter \};/, "the logFilters getter is missing or no longer exposes both axes");
  assert.match(src, /async function buildLogTab\(app\)/, "buildLogTab no longer takes the app instance as a parameter");
  assert.match(src, /const \{ type, scene \} = app\.logFilters;/, "buildLogTab no longer reads its filter state from app.logFilters");
  // 2026-09-23: the filtered entries also gain a local clock (the ledger log
  // shows local time, not the stored UTC), so the filter is applied once into
  // `entries`, which is what the template is handed.
  assert.match(src, /const entries = filterLogEntries\(all, \{ type, scene \}\)/, "buildLogTab no longer actually filters the entries it hands to the template");
  assert.match(src, /return \{\s*entries,/, "the filtered entries are no longer what the template is handed");
});

test("_prepareContext passes the app instance into every tab's build(), which is what makes app.logFilters reachable", () => {
  assert.match(src, /const data = active \? await active\.build\(this\) : \{\};/, "_prepareContext no longer passes `this` into build() -- buildLogTab would lose access to app.logFilters");
});

test("setLogFilter is wired as a real action and tells type/scene apart by data-axis, one handler instead of two near-duplicates", () => {
  assert.match(src, /setLogFilter:\s*ConsoleWindow\.#onSetLogFilter/, "setLogFilter is no longer wired as an action");
  const fn = src.match(/static #onSetLogFilter\(_event, target\) \{[\s\S]*?\n {2}\}/);
  assert.ok(fn, "#onSetLogFilter is missing");
  assert.match(fn[0], /target\.dataset\.axis === "scene"/, "no longer branches on data-axis to tell the two filter rows apart");
  assert.match(fn[0], /this\.render\(\{ parts: \["body"\] \}\);/, "no longer re-renders after changing a filter -- the chip would silently do nothing visible");
});

test("tab-log.hbs renders both filter rows as chips sharing the one setLogFilter action, with the correct data-axis each", () => {
  assert.match(tabLog, /data-action="setLogFilter" data-axis="type"/, "the type filter row is missing or no longer tagged data-axis=\"type\"");
  assert.match(tabLog, /data-action="setLogFilter" data-axis="scene"/, "the scene filter row is missing or no longer tagged data-axis=\"scene\"");
  // Precomputed server-side (buildLogTab's own `active` field on each option),
  // never an inline Handlebars equality helper -- Foundry's own Handlebars
  // build is not guaranteed to register one, and getting this wrong once
  // already took the whole panel down live this same session (person.hbs's
  // {{../@index}} regression, tier3-scene-runner-coercible-check-contract).
  assert.match(tabLog, /aria-pressed="\{\{active\}\}"/, "the filter chips no longer read a precomputed `active` field for their pressed state");
});

test("both filter rows are localized, not hardcoded English", () => {
  assert.equal(en.BLANKINHERITANCE.Console.Window.Log.AllTypes, "All");
  assert.equal(en.BLANKINHERITANCE.Console.Window.Log.AllScenes, "All scenes");
  assert.match(tabLog, /localize "BLANKINHERITANCE\.Phone\.SessionLog\.Empty"/, "the empty-log message lost its localize call");
});
