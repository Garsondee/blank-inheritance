// Tier 3 — the check console, wired up (foundry/check-console.mjs, 2026-10-05).
//
// The pure rules are tier1-check-console.test.mjs and tier1-check-pill.test.mjs. This is the other half: that the
// record is a world setting only the GM writes and a reset clears, that every client follows it, that only the
// active GM records a roll, that a player's window has none of the GM's controls and never shows a blind result,
// that rolls go through the character's own statistic, and that the Scene Runner, the Palette and the admin panel's
// stand-ins all reach it. Read as source, like every tier3 contract here: the windows extend ApplicationV2.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOD = path.join(ROOT, "module", "blank-inheritance");
const read = (...parts) => readFileSync(path.join(MOD, ...parts), "utf8");

const src = read("scripts", "foundry", "check-console.mjs");
const core = read("scripts", "core", "check-console.mjs");
const main = read("scripts", "blank-inheritance.mjs");
const admin = read("scripts", "core", "admin.mjs");
const runner = read("scripts", "foundry", "scene-runner.mjs");
const palette = read("scripts", "foundry", "director-palette.mjs");
const autopilot = read("scripts", "foundry", "admin-autopilot.mjs");
const gmHbs = read("templates", "check-console", "gm.hbs");
const playerHbs = read("templates", "check-console", "player.hbs");
const panel = read("templates", "runner", "panel.hbs");
const beatHbs = read("templates", "runner", "beat.hbs");
const css = read("styles", "bi-check.css");
const components = read("styles", "bi-components.css");
const manifest = JSON.parse(read("module.json"));
const en = JSON.parse(read("lang", "en.json")).BLANKINHERITANCE;

const fnBody = (name, source = src) => source.match(new RegExp(`(?:export )?(?:async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))?.[0] ?? null;
const method = (name, source = src) => source.match(new RegExp(`static (?:async )?#${name}\\([^)]*\\) \\{[\\s\\S]*?\\n {2}\\}`))?.[0] ?? null;

test("the record is one world setting, hidden from the settings menu, that only a GM writes", () => {
  assert.match(src, /game\.settings\.register\(MODULE_ID, SETTING, \{ scope: "world", config: false, type: Object, default: emptyConsoleState\(\), onChange \}\);/);
  assert.match(fnBody("writeSession"), /if \(!game\.user\?\.isGM\) return null;/);
  // One change at a time on the GM's client, each read fresh: a roll landing while the knob turns must not undo either.
  assert.match(src, /const change = \(step\) =>\s*\n\s*serially\(async \(\) => \{\s*\n\s*const before = currentCheck\(\);/);
});

test("a reset clears it, and the admin contract knows it", () => {
  assert.match(admin, /"choicePrompt",\n {2}"checkConsole",/);
  assert.match(admin, /checkConsole: emptyConsoleState\(\),/);
});

test("every client follows the record: the GM's window and the Runner repaint, a player's window opens and closes with it", () => {
  assert.match(main, /registerCheckConsoleSettings\(\(\) => \{\s*\n\s*syncCheckConsoleWindows\(\);\s*\n\s*refreshSceneRunner\(\);\s*\n\s*\}\);/);
  assert.match(main, /registerCheckConsoleConversation\(\);/);
  const sync = fnBody("syncCheckConsoleWindows");
  assert.match(sync, /if \(!session\) gmWindow\?\.closeFromSync\(\);/);
  assert.match(sync, /const mark = `\$\{session\.id\}:\$\{session\.ring \?\? 0\}`;/, "a closed window comes back when the GM asks again");
  assert.match(sync, /if \(dismissed === mark\) return;/);
});

test("only the active GM records a roll, and only for the check that is open", () => {
  const conv = fnBody("registerCheckConsoleConversation");
  assert.match(conv, /if \(!game\.user\?\.isGM\) return;/);
  assert.match(conv, /if \(activeGm && activeGm\.id !== game\.user\.id\) return;/);
  assert.match(conv, /const tag = consoleTagFrom\(context\?\.options\);/);
  assert.match(conv, /if \(!session \|\| session\.id !== tag\.sessionId\) return;/);
  // A GM rolling for a character (the stand-ins) is recorded as that character's player.
  assert.match(conv, /const userId = author && !author\.isGM \? author\.id : \(playerOf\(actor\)\?\.id \?\? author\?\.id \?\? null\);/);
});

test("a roll goes through the character's own statistic, exactly as the sheet rolls it", () => {
  const roll = fnBody("rollForCheck");
  assert.match(roll, /const statistic = actor\.getStatistic\?\.\(slug\);/);
  assert.match(roll, /return statistic\.roll\(\{\s*\n\s*\.\.\.params,\s*\n\s*dc: Number\.isFinite\(dcFor\(session, slug\)\) \? \{ value: dcFor\(session, slug\) \} : null,\s*\n\s*extraRollOptions\s*\n\s*\}\);/);
  assert.match(roll, /rollParamsFromEvent\(event, \{ showCheckDialogs: false, isGM: game\.user\?\.isGM \?\? false \}\)/, "a plain press skips sf2e's dialog, shift shows it");
  assert.match(roll, /if \(!session \|\| !session\.skills\.includes\(slug\)\) return null;/, "only a way the check offers can be rolled");
});

test("a player's window has none of the GM's controls, and never shows a blind result", () => {
  const playerActions = src.match(/class CheckPlayerWindow[\s\S]*?actions: \{([^}]*)\}/)?.[1] ?? "";
  assert.deepEqual(playerActions.trim().split(/\s*,\s*/).map((a) => a.split(":")[0].trim()).filter(Boolean), ["roll"]);
  for (const action of ["stepDc", "toggleBlind", "toggleWay", "setResult", "markOutcome", "closeCheck", "toggleAsked"]) {
    assert.doesNotMatch(playerHbs, new RegExp(`data-action="${action}"`), `the player's window offers ${action}`);
  }
  const prepare = src.match(/class CheckPlayerWindow[\s\S]*?async _prepareContext\(\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(prepare);
  assert.doesNotMatch(prepare, /gm: true|gmResult|knownStore|messageId/, "a player's window must never read what only the GM may see");
  assert.match(prepare, /const state = seat\.entry \? ledState\(seat\.entry\) : "waiting";/);
  // Nothing on a player's screen names the check or what a degree means.
  assert.doesNotMatch(playerHbs, /\{\{title\}\}|outcome/i);
});

test("the shared record never carries the check's name, its outcomes or a blind degree", () => {
  const open = fnBody("openCheckConsole");
  assert.doesNotMatch(open, /title|outcomes|bySkill/, "the check's words must stay on the GM's side");
  const record = core.match(/export function recordRoll\([^)]*\) \{[\s\S]*?\n\}/)?.[0];
  assert.match(record, /if \(session\.blind\) entry\.rolled = true;/);
  // What the GM sets by hand on a blind check is kept on the GM's own browser, before the write repaints the window.
  const hand = fnBody("setResultByHand");
  assert.match(hand, /if \(session\.blind\) remember\(session\.id, userId, clearing \? null : \{ degree \}\);\s*\n\s*await change/);
});

test("there is only ever one check open: another is closed and recorded first, and closing logs who rolled what", () => {
  const open = fnBody("openCheckConsole");
  assert.match(open, /if \(current && sameSource\(current, spec\)\) \{\s*\n\s*showCheckConsole\(\);/);
  assert.match(open, /if \(current\) await closeCheckConsole\(\{ record: true \}\);/);
  const close = fnBody("closeCheckConsole");
  assert.match(close, /if \(record && Object\.keys\(session\.rolls \?\? \{\}\)\.length\) \{/, "a check nobody rolled leaves nothing in the log");
  assert.match(close, /text: summaryLine\(title, session\.dc, rows, wayDcsOf\(session\)\),/);
  assert.match(close, /subject: session\.key \? `\$\{session\.key\}::check` : "check"/);
  assert.match(close, /await writeSession\(null\);/);
});

test("the GM's window is the deck's hardware: the knob with its printed, banded scale, lit switches, pill keys, a dropdown, and one key to close", () => {
  assert.match(gmHbs, /class="bi-knob bi-check__dc-knob" style="--frame: \{\{dial\.frame\}\}"\s*\n\s*data-action="stepDc" data-bi-wheel="dc"/);
  assert.match(gmHbs, /\{\{#each dial\.ticks\}\}<line class="bi-check__tick/);
  assert.match(gmHbs, /\{\{#each dial\.numerals\}\}<text class="bi-check__numeral/);
  assert.match(gmHbs, /\{\{#each dial\.bands\}\}<path class="bi-check__band" data-difficulty="\{\{this\.key\}\}"/, "the scale is banded by difficulty");
  assert.match(gmHbs, /<span class="bi-check__difficulty"><b>\{\{dial\.difficulty\.label\}\}<\/b>/, "a screen says how hard the DC is");
  // Open or Blind, as a switch whose lit side says which (D062: the rocker "in no way makes it clear").
  assert.match(gmHbs, /class="bi-check__seg\{\{#unless session\.blind\}\} is-on\{\{\/unless\}\}" data-action="setBlind" data-value="0"/);
  assert.match(gmHbs, /class="bi-check__seg bi-check__seg--blind\{\{#if session\.blind\}\} is-on\{\{\/if\}\}" data-action="setBlind" data-value="1"/);
  assert.match(gmHbs, /data-action="setShowDc" data-value="1"/);
  assert.doesNotMatch(gmHbs, /class="bi-toggle"/, "the rockers are gone");
  assert.match(gmHbs, /<button type="button" class="bi-deck-pill__cap bi-check__cap" data-action="toggleWay"/);
  // Adding a way is a dropdown in three groups (D062: a knob was "probably the worst way to select new things").
  assert.match(gmHbs, /<select class="bi-check__select" data-bi-add-way/);
  assert.match(gmHbs, /\{\{#each addGroups\}\}\s*\n\s*<optgroup label="\{\{this\.label\}\}">/);
  assert.doesNotMatch(gmHbs, /stepAdder|bi-check__adder/, "the add-a-way knob is gone");
  assert.match(fnBody("wireControls"), /const select = event\.target\?\.closest\?\.\("select\[data-bi-add-way\]"\);/);
  assert.match(fnBody("wireControls"), /select\.value = "";/, "the dropdown goes back to its prompt once a way is added");
  assert.match(gmHbs, /data-action="closeCheck"/);
  assert.match(playerHbs, /<button type="button" class="bi-deck-key" data-attribute="\{\{this\.attribute\}\}" data-action="roll" data-slug="\{\{this\.slug\}\}"/);
  assert.match(fnBody("wireControls"), /if \(!root \|\| root\.dataset\.biControls\) return;/);
  assert.match(fnBody("wireControls"), /\{ passive: false \}/);
});

test("the bank of six tall lights along the bottom, on both screens: unlit, then red, orange, blue, green, or purple for a hidden roll, with a flare played once (D062)", () => {
  for (const hbs of [gmHbs, playerHbs]) {
    assert.match(hbs, /<section class="bi-check__lights"[\s\S]*?<ol class="bi-leds">[\s\S]*?\{\{#each bank\}\}/, "a window without the bank");
    assert.match(hbs, /<span class="bi-led" data-state="/);
    assert.ok(hbs.lastIndexOf('class="bi-check__lights"') > hbs.lastIndexOf("</header>"), "the bank sits below the rest");
  }
  assert.ok(gmHbs.indexOf('class="bi-check__lights"') > gmHbs.indexOf('class="bi-check__keys"'), "the GM's bank is the very bottom of the window");
  assert.match(core, /export const BANK_SIZE = 6;/);
  const colours = { criticalFailure: /--led: #e3241d/, failure: /--led: #ff7a12/, success: /--led: #2a78ff/, criticalSuccess: /--led: #19d25e/, rolled: /--led: #8a3dff/ };
  for (const [state, colour] of Object.entries(colours)) {
    const rule = css.match(new RegExp(`\\.bi-led\\[data-state="${state}"\\],\\n\\.bi-led-mini\\[data-state="${state}"\\] \\{[^}]*\\}`))?.[0] ?? "";
    assert.match(rule, colour, `${state} is not its colour`);
  }
  assert.match(css, /\.bi-led\[data-fresh\] \{ animation: bi-led-flare/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.bi-led__flare \{ animation: none !important; \}/);
  // A player's bank never shows a blind roll's degree; the GM's tags it hidden.
  const prepare = src.match(/class CheckPlayerWindow[\s\S]*?async _prepareContext\(\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.match(prepare, /const state = seat\.entry \? ledState\(seat\.entry\) : "waiting";/);
  assert.match(gmHbs, /\{\{#if this\.hidden\}\}<i class="bi-led__tag">/);
  // Played once: the window keeps which lights have flared.
  assert.match(src, /const fresh = Boolean\(entry && isFresh\(entry, now\) && !this\.#played\.has\(playKey\)\);/);
  assert.doesNotMatch(css + gmHbs + playerHbs, /bi-gem/, "the gems are gone");
});

test("the Scene Runner reaches it: a pill in the prose, a Check key in the header, and no check card left", () => {
  assert.match(runner, /openCheck: SceneRunner\.#onOpenCheck,/);
  assert.match(runner, /openAdhocCheck: SceneRunner\.#onOpenAdhocCheck,/);
  assert.match(method("onOpenAdhocCheck", runner), /await openCheckConsole\(\{ briefId: currentBriefId\(\) \|\| null, key: null, source: \{ kind: "adhoc" \}, skills: \[\], dc: 15 \}\);/);
  assert.match(panel, /data-action="openAdhocCheck"/);
  for (const gone of ["bi-runner__checkbox", "data-action=\"postCheck\"", "data-action=\"recordOutcome\"", "data-action=\"useRoll\"", "bi-runner__chip--check", "perPlayer"]) {
    assert.doesNotMatch(beatHbs, new RegExp(gone.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${gone} is back on the beat`);
  }
  assert.match(runner, /setCheckConsoleProvider\(\{/);
});

test("the deck's Ask keys and the Palette ask the table through it, and the admin panel's stand-ins roll from it", () => {
  // A second ask before anyone has rolled adds another way to the same made-up check; otherwise a new one, at the
  // standard DC for the party's level.
  const ask = fnBody("askForWay");
  assert.ok(ask, "askForWay is missing");
  assert.match(ask, /if \(open\?\.source\?\.kind === "adhoc" && !Object\.keys\(open\.rolls \?\? \{\}\)\.length\) \{/);
  assert.match(ask, /const next = s\.skills\.includes\(slug\) \? s : toggleSkill\(s, slug\);/);
  assert.match(ask, /return openCheckConsole\(\{ briefId: null, key: null, source: \{ kind: "adhoc" \}, skills: \[slug\], dc: Number\.isFinite\(dc\) \? dc : standardDc\(\) \}\);/);
  assert.match(src, /export const standardDc = \(\) => levelDc\(partyLevel\(\)\) \?\? STANDARD_DC;/);
  assert.match(read("scripts", "foundry", "director-bar.mjs"), /import \{ askForWay \} from "\.\/check-console\.mjs";/);
  assert.match(palette, /import \{ askForWay \} from "\.\/check-console\.mjs";/);
  assert.match(palette, /case "ask": return askTheTable\(intent\.slug, intent\.dc\);/);
  assert.match(palette, /run: \(\) => askTheTable\(slug\)/);
  assert.match(palette, /return askForWay\(slug, \{ dc: Number\.isFinite\(dc\) \? dc : null \}\);/);
  assert.match(autopilot, /if \(key === `\$\{MODULE_ID\}\.checkConsole` && settings\.rolls\) \{/);
  const roll = fnBody("rollConsoleForEveryone", autopilot);
  assert.ok(roll, "rollConsoleForEveryone is missing");
  assert.match(roll, /await rollForCheck\(currentCheck\(\) \?\? session, slug, \{ actor \}\);/);
  assert.match(roll, /if \(!roster\.has\(userId\) \|\| session\.rolls\?\.\[userId\] \|\| consoleRolled\.has\(mark\)\) continue;/, "a stand-in never rolls twice");
});

test("its stylesheet ships, and every word it shows is in the language file", () => {
  assert.ok(manifest.styles.includes("styles/bi-check.css"));
  for (const key of ["Title", "PlayerTitle", "Legend", "Ways", "Results", "Lights", "Hidden", "Open", "Blind", "DcShown", "DcHidden", "AddWay", "Close", "YouGot", "YouRolledBlind", "NotAsked", "TallyHint", "CheckWord", "Or", "LevelShort", "DifficultyHint", "SameForEvery"]) {
    assert.match(String(en.CheckConsole?.[key] ?? ""), /\S/, `CheckConsole.${key} has no text`);
  }
  for (const key of ["IncrediblyEasy", "VeryEasy", "Easy", "Standard", "Hard", "VeryHard", "IncrediblyHard"]) {
    assert.match(String(en.CheckConsole?.Difficulty?.[key] ?? ""), /\S/, `CheckConsole.Difficulty.${key} has no text`);
  }
  assert.match(String(en.Runner.CheckKey ?? ""), /\S/);
});

test("a pill's label on black has no pale ghost under it (D062)", () => {
  // The skill keys' tactile parts (D062's nubs and ribs) became D063's ribbed grip tab:
  // test/tier3-deck-keys-contract.test.mjs.
  const label = components.match(/\.bi-deck__cell \.bi-deck-pill__label \{[^}]*\}/)?.[0] ?? "";
  assert.match(label, /text-shadow: 0 1px 1px rgb\(0 0 0 \/ 70%\)/, "on black, a pill label's shadow is dark");
});

test("every way that is on can be taken off from its own pill, except the last one (2026-10-05)", () => {
  const hbs = read("templates", "check-console", "gm.hbs");
  assert.match(hbs, /\{\{#if this\.on\}\}\{\{#unless this\.locked\}\}<button[^>]*bi-check__remove[^>]*data-action="toggleWay"/s);
  assert.match(read("styles", "bi-check.css"), /\.bi-check__remove\b/);
  assert.match(read("lang", "en.json"), /"RemoveWay"/);
});

test("the whole dial answers the wheel and a vertical drag, not just the knob cap (2026-10-05)", () => {
  const hbs = read("templates", "check-console", "gm.hbs");
  assert.match(hbs, /class="bi-check__knob" data-bi-wheel="dc" data-bi-drag="dc"/);
  const js = read("scripts", "foundry", "check-console.mjs");
  assert.match(js, /closest\?\.\("\[data-bi-drag\]"\)/);
  assert.match(js, /lastY - e\.clientY/, "up raises the DC");
});

test("each way shows its own DC: a pill on the GM's side that points the dial, a figure on the player's key, and a roll made at that DC (2026-10-05)", () => {
  assert.match(read("templates", "check-console", "gm.hbs"), /bi-deck-pill__cap bi-check__cap[\s\S]*?data-action="focusWay"[\s\S]*?<span class="bi-check__cap-dc">\{\{this\.dc\}\}<\/span>/, "the DC is printed inside the pill's own capsule");
  assert.match(read("templates", "check-console", "player.hbs"), /bi-check__key-dc/);
  const js = read("scripts", "foundry", "check-console.mjs");
  assert.match(js, /dc: Number\.isFinite\(dcFor\(session, slug\)\)/, "the roll carries the way's own DC");
  assert.match(js, /stepDc\(base, delta, slug\)/);
  assert.match(read("lang", "en.json"), /"WayDcHint"/);
});

test("the dial moves on screen at once and writes only the last value, a moment after the hand rests (2026-10-05)", () => {
  const js = read("scripts", "foundry", "check-console.mjs");
  assert.match(js, /if \(which === "dc"\) this\.#nudge\(delta\);/, "a turn does not write the setting itself");
  assert.match(js, /requestAnimationFrame\(/, "repaints are at most one a frame");
  assert.match(js, /setTimeout\(\(\) => this\.#flush\(\), FLUSH_MS\)/);
  assert.match(js, /setDc\(s, target\.dc, target\.slug\)/, "what is written is the absolute value, so a repeat does nothing");
  assert.match(js, /this\.#target \? setDc\(stored, this\.#target\.dc, this\.#target\.slug\) : stored/, "the window shows the pending value over the record");
});
