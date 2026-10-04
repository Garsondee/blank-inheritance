// Tier 3 — objectives' wiring, checked against the files themselves (design/objectives.md, D057).
//
// What these protect: every button in the tracker and the Journal has a handler; the tracker is mounted the way the
// deck and the rail are (in #interface, re-asserted on canvasReady, never inside #ui-middle); its settings are each
// player's own, so a reset never touches them; O and J are not taken by anything else in the module; the Scene
// Runner dispatches the new chip; the deploy ships data/objectives; and Stagecraft keeps cards clear of the tracker.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SYNCED_CAMPAIGN_DIRS } from "../tools/module-sync/stage-campaign-data.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mod = path.join(repoRoot, "module", "blank-inheritance");
const read = (rel) => readFileSync(path.join(mod, rel), "utf8");

const tracker = read("scripts/foundry/objectives-tracker.mjs");
const journal = read("scripts/foundry/journal.mjs");
const wiring = read("scripts/foundry/objectives.mjs");
const entry = read("scripts/blank-inheritance.mjs");
const runner = read("scripts/foundry/scene-runner.mjs");
const bridge = read("scripts/foundry/stagecraft-bridge.mjs");
const css = read("styles/bi-objectives.css");
const manifest = JSON.parse(read("module.json"));

const actionsOf = (src) => new Set([...src.matchAll(/^\s{6}([a-zA-Z]+): [A-Za-z]+\.#on[A-Za-z]+,?$/gm)].map((m) => m[1]));
const usedActions = (tpl) => new Set([...tpl.matchAll(/data-action="([a-zA-Z]+)"/g)].map((m) => m[1]));

test("every button in the tracker and the Journal has a handler", () => {
  for (const [tpl, src] of [["templates/objectives/tracker.hbs", tracker], ["templates/journal/journal.hbs", journal]]) {
    const have = actionsOf(src);
    for (const action of usedActions(read(tpl))) assert.ok(have.has(action), `${tpl} uses data-action="${action}", which has no handler`);
  }
});

test("the tracker mounts like the deck and the rail: in #interface, frameless, re-asserted on canvasReady", () => {
  assert.match(tracker, /window: \{ frame: false, positioned: false \}/);
  assert.match(tracker, /document\.getElementById\("interface"\)/);
  assert.doesNotMatch(tracker, /getElementById\("ui-middle"\)|querySelector\("#ui-middle/, "never inside #ui-middle: its transform breaks position: fixed");
  assert.match(entry, /registerObjectives\(\);/, "init");
  assert.match(entry, /await startObjectives\(\);/, "ready");
  assert.match(entry, /remountObjectives\(\);/, "canvasReady");
  assert.match(css, /#bi-objectives \{[^}]*position: fixed;[^}]*pointer-events: none;/s, "the host lets clicks through to the stage");
});

test("the tracker's settings are each player's own, so the admin reset never touches them", () => {
  assert.match(tracker, /scope: "client"/);
  assert.doesNotMatch(tracker, /scope: "world"/);
});

test("O and J belong to objectives alone in the module", () => {
  assert.match(wiring, /editable: \[\{ key: "KeyO" \}\]/);
  assert.match(wiring, /editable: \[\{ key: "KeyJ" \}\]/);
  const files = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".mjs")) files.push(full);
    }
  };
  walk(path.join(mod, "scripts"));
  for (const file of files) {
    if (file.endsWith(path.join("foundry", "objectives.mjs"))) continue;
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /key: "Key[OJ]"/, `${path.relative(repoRoot, file)} also binds O or J`);
  }
});

test("the Journal keeps Q and E from Foundry only while it is the window in front", () => {
  assert.match(journal, /key === "q" \|\| key === "e"/);
  assert.match(journal, /event\.stopPropagation\(\)/);
  assert.match(journal, /ui\.activeWindow !== this/);
  assert.match(journal, /closest\?\.\("input, textarea, select, \[contenteditable\]"\)/, "typing a q in the form is not a tab change");
  // Foundry's own keys listen on the window, so the document's capture phase runs first (found live: a listener on
  // the window element lost its keys whenever a re-render dropped focus).
  assert.match(journal, /document\.addEventListener\("keydown", this\.#keys, true\)/);
});

test("the Scene Runner dispatches objective chips, and logs only what changed", () => {
  const body = runner.match(/case "objective": \{[\s\S]*?\n {6}\}/)?.[0];
  assert.ok(body, "no objective case in the dispatcher");
  assert.match(body, /runObjectiveTrigger\(trigger/);
  assert.match(body, /if \(changed\) await logFired\(\);/);
});

test("the deploy ships data/objectives, the stylesheet is loaded, and cards stand clear of the tracker", () => {
  assert.ok(SYNCED_CAMPAIGN_DIRS.includes("objectives"));
  assert.ok(manifest.styles.includes("styles/bi-objectives.css"));
  assert.match(bridge, /#bi-objectives \.bi-obj > \*/);
});

// Found 2026-10-04 by the chalk session: the header swallowed presses meant for the stage and covered the GM strip.
test("REGRESSION: only the tracker's controls take a press, and it drops below the stage's top controls", () => {
  for (const rule of [
    "#bi-objectives .bi-obj > .bi-obj__panel { pointer-events: none; }",
    "#bi-objectives .bi-obj__panel .bi-obj__body { pointer-events: auto; }",
    "#bi-objectives .bi-obj > .bi-obj__ribbon { pointer-events: none; }",
    "#bi-objectives .bi-obj > .bi-obj__tabrow { display: flex; align-items: center; gap: 4px; pointer-events: none; }",
    "#bi-objectives .bi-obj__tabrow button { pointer-events: auto; }"
  ]) assert.ok(css.includes(rule), `missing: ${rule}`);
  assert.ok(tracker.includes("for (const r of stageTopControls().rects) if (r.right > span[0] && r.left < span[1]) top = Math.max(top, r.bottom + 8);"));
  assert.ok(bridge.includes("export function stageTopControls()"));
});

test("the player's deck has the Journal key", () => {
  const deck = read("templates/console/deck/deck-ident.hbs");
  assert.match(deck, /data-action="openJournal"/);
  assert.match(read("scripts/foundry/command-bar.mjs"), /openJournal: CommandBar\.#onOpenJournal/);
});

test("the GM's objectives board is a GM-only Console tab, and its rows open the Journal", () => {
  const consoleSrc = read("scripts/foundry/console-window.mjs");
  const directorOnly = consoleSrc.match(/const DIRECTOR_ONLY_TABS = \[[\s\S]*?\];/)?.[0] ?? "";
  assert.match(directorOnly, /id: "objectives"/, "the board is in the GM's tabs, never a player's");
  assert.doesNotMatch(consoleSrc.match(/const SHEET_TABS = \[[\s\S]*?\];/)?.[0] ?? "", /objectives/);
  assert.match(consoleSrc, /openObjective: ConsoleWindow\.#onOpenObjective/);
  assert.match(consoleSrc, /openJournal\(\{ tab: "objectives", select: /);
  const tpl = read("templates/console/window/tab-objectives.hbs");
  assert.match(tpl, /data-action="openObjective"/);
  assert.match(journal, /select\(objectiveId\)/);
  assert.match(wiring, /refreshConsoleWindow\(\)/, "the board repaints when an objective changes");
});

test("the tracker has a grip: drag, arrow keys, double-click to reset, saved per player, and it wins over the automatic place", () => {
  assert.equal((read("templates/objectives/tracker.hbs").match(/class="bi-obj__grip"/g) ?? []).length, 2, "one on the tab, one in the header");
  for (const needle of [
    'SETTING_PLACE = "objectivesPlace"',
    "game.settings.register(MODULE_ID, SETTING_PLACE, { ...client,", // client scope: each player's own, never reset
    "setPointerCapture(event.pointerId)",
    'addEventListener("dblclick", () => resetPlace())',
    "if (own && applyPlace(own)) return;" // a dragged place beats the automatic rules
  ]) assert.ok(tracker.includes(needle), `missing: ${needle}`);
  assert.ok(/\.bi-obj__grip \{[^}]*touch-action: none;/.test(css), "a touch drag must not scroll the page");
});

// Found 2026-10-04 by the chalk session: an eraser stroke starting under the grip dragged the tracker instead of erasing.
test("REGRESSION: while chalk is in hand nothing of the tracker takes a press, and it fades back", () => {
  for (const rule of [
    "body:has(#stagecraft-stage.stagecraft-chalk) #bi-objectives .bi-obj { opacity: 0.3; transition: opacity 0.15s; }",
    "body:has(#stagecraft-stage.stagecraft-chalk) #bi-objectives .bi-obj * { pointer-events: none !important; }"
  ]) assert.ok(css.includes(rule), `missing: ${rule}`);
  // the class Stagecraft puts on its stage while chalk is in hand (module/stagecraft/styles/stagecraft.css)
  const stagecraftCss = readFileSync(path.join(repoRoot, "module", "stagecraft", "styles", "stagecraft.css"), "utf8");
  assert.ok(stagecraftCss.includes("#stagecraft-stage.stagecraft-chalk"));
});
