// Tier 3 — the opening titles' wiring (scripts/foundry/opening-titles.mjs),
// pinned against its own templates, stylesheet and entry point, and against
// the real Foundry source it leans on.
//
// Read as source rather than mounted, like every other tier3-*-contract test
// here: the adapter destructures foundry.applications.api at module scope and
// drives a <video>, neither of which plain Node has. The pure decisions are
// tier1-opening-titles.test.mjs's job; this file checks that the adapter
// actually hands them what they need, and that Foundry still behaves the way
// the adapter assumes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_VIDEO_FOLDER, OPENING_PREFERENCES } from "../module/blank-inheritance/scripts/core/opening-titles.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (...p) => readFileSync(path.join(moduleRoot, ...p), "utf8");
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const adapter = read("scripts", "foundry", "opening-titles.mjs");
const entry = read("scripts", "blank-inheritance.mjs");
const railAdapter = read("scripts", "foundry", "session-rail.mjs");
const railTemplate = read("templates", "console", "session-rail.hbs");
const palette = read("scripts", "foundry", "director-palette.mjs");
const choiceTemplate = read("templates", "opening", "choice.hbs");
const overlayTemplate = read("templates", "opening", "overlay.hbs");
const components = stripCssComments(read("styles", "bi-components.css"));

/** The body of a top-level function in the adapter, up to its closing brace in column 0. */
function fn(source, name) {
  const m = source.match(new RegExp(`(?:export )?(?:async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`));
  assert.ok(m, `no function ${name}`);
  return m[0];
}

/** The body of a settings registration for one key. */
function registration(key) {
  const m = adapter.match(new RegExp(`game\\.settings\\.register\\(MODULE_ID, ${key}, \\{[\\s\\S]*?\\n {2}\\}\\);`));
  assert.ok(m, `no registration for ${key}`);
  return m[0];
}

/* ---------------------------------------------------------------- */
/*  Settings                                                         */
/* ---------------------------------------------------------------- */

test("the remembered cut is a per-player client setting shown in Game Settings, defaulting to ask", () => {
  assert.match(adapter, /export const SETTING_VERSION = "openingVersion";/);
  const body = registration("SETTING_VERSION");
  assert.match(body, /scope: "client"/);
  assert.match(body, /config: true/, "a player must be able to change or clear what they remembered");
  assert.match(body, /default: PREFERENCE_ASK/);
  const choices = body.match(/choices: \{([\s\S]*?)\}/)?.[1] ?? "";
  const keys = [...choices.matchAll(/^\s*(\w+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys, [...OPENING_PREFERENCES], "the dropdown offers exactly what core/opening-titles.mjs will believe, in its order");
});

test("the video folder is a world setting, so only a GM sees or changes it, with Foundry's own folder picker", () => {
  assert.match(adapter, /export const SETTING_FOLDER = "openingVideoFolder";/);
  const body = registration("SETTING_FOLDER");
  assert.match(body, /scope: "world"/);
  assert.match(body, /config: true/);
  assert.match(body, /default: DEFAULT_VIDEO_FOLDER/);
  assert.match(body, /filePicker: "folder"/);
  assert.equal(DEFAULT_VIDEO_FOLDER, "blank-inheritance-video");
});

test("both settings are registered in init, and the socket on every client in ready", () => {
  const init = entry.match(/Hooks\.once\("init", \(\) => \{[\s\S]*?\n\}\);/)?.[0] ?? "";
  const ready = entry.match(/Hooks\.once\("ready", async \(\) => \{[\s\S]*?\n\}\);/)?.[0] ?? "";
  assert.match(init, /registerOpeningTitleSettings\(\);/);
  assert.match(ready, /registerOpeningSocket\(\);/);
  const beforeGmGate = ready.split("if (!game.user.isGM) return;")[0];
  assert.match(beforeGmGate, /registerOpeningSocket\(\);/, "players must hear the broadcast, so the socket cannot sit behind the GM-only return");
  assert.match(entry, /mod\.api = \{[\s\S]*?\n\s*playOpeningForTable,\n[\s\S]*?\};/, "the module API exposes playOpeningForTable for macros");
});

/* ---------------------------------------------------------------- */
/*  The GM's trigger and the socket                                  */
/* ---------------------------------------------------------------- */

test("the GM's key lives on the session rail, beside Mark", () => {
  assert.match(railTemplate, /class="bi-srail__opening" data-action="playOpening"/);
  assert.ok(railTemplate.indexOf('data-action="playOpening"') < railTemplate.indexOf('data-action="mark"'),
    "Opening sits to the left of Mark, so Mark keeps its place at the rail's end");
  assert.match(railAdapter, /playOpening: SessionRail\.#onPlayOpening/);
  assert.match(railAdapter, /static async #onPlayOpening\(\) \{\s*await playOpeningForTable\(\);\s*\}/);
  assert.match(railAdapter, /import \{ playOpeningForTable \} from "\.\/opening-titles\.mjs";/);
  assert.match(components, /\.bi-srail__mark,\s*\.bi-srail__opening\s*\{/, "the key wears Mark's own silver pill");
});

test("the Palette offers the same verb in its table group", () => {
  assert.match(palette, /id: "table\.opening", group: "table"[^\n]*run: \(\) => playOpeningForTable\(\)/);
  assert.match(palette, /import \{ playOpeningForTable \} from "\.\/opening-titles\.mjs";/);
});

test("pressing it is GM-only, asks first (Law 17), then broadcasts AND runs locally", () => {
  const body = fn(adapter, "playOpeningForTable");
  assert.match(body, /if \(!game\.user\?\.isGM\) return false;/);
  const asked = body.indexOf("confirmOpening()");
  const sent = body.indexOf("game.socket.emit(SOCKET, request)");
  const local = body.indexOf("receiveOpening(request, game.user.id)");
  assert.ok(asked > 0 && sent > asked, "the confirm comes before anything is sent");
  assert.ok(local > sent, "the GM's own screen runs the same message (Foundry's socket never echoes to the sender)");
  assert.match(fn(adapter, "confirmOpening"), /DialogV2\.confirm\(/);
  assert.match(adapter, /const SOCKET = `module\.\$\{MODULE_ID\}`;/, "the module's one shared socket, like audio-engine.mjs and campaign-state.mjs");
});

test("the socket listener ignores other subsystems' messages and trusts the sender id, not the message, for GM-ness", () => {
  const body = fn(adapter, "registerOpeningSocket");
  assert.match(body, /game\.socket\.on\(SOCKET, \(payload, senderId\) =>/);
  assert.match(body, /if \(typeof type !== "string" \|\| !type\.startsWith\("opening\."\)\) return;/);
  assert.match(fn(adapter, "receiveOpening"), /senderIsGM: game\.users\?\.get\(senderId\)\?\.isGM === true/);
  assert.match(fn(adapter, "receiveFailureReport"), /if \(!game\.user\?\.isGM\) return;/, "only a GM's screen shows a player's failure report");
});

test("a remembered choice is written only from the window's own answer", () => {
  const body = fn(adapter, "receiveOpening");
  assert.match(body, /const outcome = resolveChoice\(await askForVersion\(\)\);/);
  assert.match(body, /if \(outcome\.remember\) \{[\s\S]*?game\.settings\.set\(MODULE_ID, SETTING_VERSION, outcome\.remember\)/);
  assert.match(body, /if \(!version\) return;/, "a closed window plays nothing");
  assert.equal((adapter.match(/game\.settings\.set\(/g) ?? []).length, 1, "nothing else in the adapter writes a setting");
});

/* ---------------------------------------------------------------- */
/*  The choice window                                                */
/* ---------------------------------------------------------------- */

test("the choice window takes its order from core, focuses only the default, and never pre-ticks Remember", () => {
  assert.match(choiceTemplate, /\{\{#each options\}\}/);
  const markup = choiceTemplate.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
  assert.match(markup, /\{\{#if this\.isDefault\}\} autofocus\{\{\/if\}\}/);
  assert.equal((markup.match(/autofocus/g) ?? []).length, 1, "autofocus exists only behind isDefault, never unconditionally");
  assert.match(choiceTemplate, /<input type="checkbox" name="\{\{remember\.name\}\}"\{\{#if remember\.checked\}\} checked\{\{\/if\}\}>/);
  assert.match(choiceTemplate, /data-action="choose" data-version="\{\{this\.version\}\}"/);
  assert.match(adapter, /choose: OpeningChoice\.#onChoose/);
  assert.match(adapter, /_onClose\(options\) \{\s*super\._onClose\?\.\(options\);\s*this\.#answer\(null\);\s*\}/,
    "closing the window any way at all answers null: play nothing");
});

/* ---------------------------------------------------------------- */
/*  The player                                                       */
/* ---------------------------------------------------------------- */

test("the player always shows a Skip key, and Escape ends it in one press ahead of Foundry's own handler", () => {
  assert.match(overlayTemplate, /<button type="button" class="bi-opening__skip"/);
  assert.doesNotMatch(overlayTemplate.replace(/\{\{!--[\s\S]*?--\}\}/g, ""), /\{\{#if[^}]*\}\}[\s\S]*bi-opening__skip/,
    "the Skip key must not sit inside a condition");
  assert.match(adapter, /document\.addEventListener\("keydown", overlay\.onKey, true\);/, "capture phase, so it runs before Foundry's window listener");
  assert.match(adapter, /if \(event\.key === "Escape"\) \{\s*event\.preventDefault\(\);\s*step\("skip"\);/);
  assert.match(adapter, /document\.removeEventListener\("keydown", overlay\.onKey, true\);/, "and the listener comes off when it closes");
  const rule = components.match(/\.bi-opening__skip\s*\{[^}]*\}/)?.[0] ?? "";
  assert.doesNotMatch(rule, /display:\s*none/);
});

test("the video's source is set only after every listener is attached, and nothing autoplays from the markup", () => {
  assert.doesNotMatch(overlayTemplate, /<video[^>]*\s(?:src|autoplay)\b/);
  const body = fn(adapter, "playOpening");
  const listened = body.indexOf('video.addEventListener("error"');
  const sourced = body.indexOf("video.src = path;");
  assert.ok(listened > 0 && sourced > listened, "an error that fired before its listener existed would leave a black screen forever");
  assert.match(body, /video\.addEventListener\("ended", \(\) => step\("ended"\)\);/, "it closes itself at the end");
});

test("a player's failure closes quietly there and goes to the GM; the GM's own is a notice naming the path", () => {
  const report = fn(adapter, "reportFailure");
  assert.match(report, /if \(game\.user\?\.isGM\) noteFailure\(report, null\);\s*else game\.socket\.emit\(SOCKET, report\);/);
  assert.doesNotMatch(report, /ui\.notifications/, "a player is never shown an error about a file they cannot fix");
  assert.match(fn(adapter, "noteFailure"), /ui\.notifications\.error\(message, \{ permanent: true \}\)/);
});

test("the player sits above every window but under Foundry's tooltips and notifications, and adds no animation of its own", () => {
  const rule = components.match(/\.bi-opening\s*\{[^}]*\}/)?.[0] ?? "";
  assert.match(rule, /position:\s*fixed/);
  assert.match(rule, /inset:\s*0/);
  assert.match(rule, /z-index:\s*calc\(var\(--z-index-tooltip, 9999\) - 1\)/);
  assert.match(components, /\.bi-opening\[data-state="blocked"\] \.bi-opening__gate \{ display: grid; \}/);
  assert.match(components, /\.bi-opening\[data-state="loading"\] \.bi-opening__status \{ display: block; \}/);
  const section = components.slice(components.indexOf(".bi-opening-choice {"));
  assert.ok(section.length > 0);
  assert.doesNotMatch(section.split(/\n\.bi-(?!opening)/)[0], /animation|@keyframes/, "one cut promises no flashing; the frame must not add motion");
});

/* ---------------------------------------------------------------- */
/*  What Foundry itself must keep doing (the local source trees)     */
/* ---------------------------------------------------------------- */

const appRoot = path.join(repoRoot, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
const available = existsSync(appRoot);
const skip = available ? false : "the local foundryvtt/ tree is absent (gitignored): Foundry-behaviour contracts not checked";
const readApp = (rel) => readFileSync(path.join(appRoot, rel), "utf8");

test("Foundry's server stamps every module-socket message with its sender's user id", { skip }, () => {
  const sockets = readApp("dist/server/sockets.mjs");
  assert.match(sockets, /export function handleCustomSocket\([^)]*\)\{[\s\S]*?\.emit\(e,t,this\.user\.id\)/,
    "the GM check in registerOpeningSocket reads the listener's second argument; without it, nobody could start the titles");
  assert.match(readApp("dist/packages/package.mjs"), /registerCustomSocket\(e\)\{[\s\S]*?handleCustomSocket\.bind\(e,t\)/);
});

test("Foundry's settings window lists a world setting only to a user who may modify settings", { skip }, () => {
  const config = readApp("client/applications/settings/config.mjs");
  assert.match(config, /const restricted = setting\.scope === CONST\.SETTING_SCOPES\.WORLD;\s*\n\s*if \( restricted && !canConfigure/);
  assert.match(config, /data\.folderPicker = true;/, "filePicker: \"folder\" still renders Foundry's folder browser");
});

test("ApplicationV2 focuses [autofocus] on first render, which is what makes reduced motion the Enter-key default", { skip }, () => {
  const app = readApp("client/applications/api/application.mjs");
  assert.match(app, /if \( options\.isFirstRender \) this\.#element\.querySelector\("\[autofocus\]"\)\?\.focus\(\);/);
  assert.match(app, /const targetLeft = left \?\? \(\(clientWidth - scaledWidth\) \/ 2\);/, "an unpositioned window still opens centred");
});

test("Foundry's keyboard handler listens on window in the bubbling phase, so the player's capture listener runs first", { skip }, () => {
  const keyboard = readApp("client/helpers/interaction/keyboard-manager.mjs");
  assert.match(keyboard, /win\.addEventListener\("keydown", event => this\.#handleKeyboardEvent\(event, false\)\);/);
});

test("Foundry's z-index ramp still puts tooltips and notifications above windows", { skip }, () => {
  const css = readApp("public/css/foundry2.css");
  const value = (name) => Number(css.match(new RegExp(`${name}:\\s*(\\d+);`))?.[1]);
  assert.ok(value("--z-index-window") < value("--z-index-tooltip") - 1, "the player must clear every window");
  assert.ok(value("--z-index-tooltip") < value("--z-index-notification"), "a GM notice must still show over the titles");
  assert.match(readApp("client/applications/api/application.mjs"), /this\.#position\.zIndex = \+\+ApplicationV2\._maxZ;/,
    "windows still climb without limit, which is why the player is pinned to the tooltip layer and not to --z-index-window");
});

test("globalPlaylistVolume is still the music gain Foundry applies, which the titles follow", { skip }, () => {
  const helper = readApp("client/audio/helper.mjs");
  assert.match(helper, /this\.music = AudioHelper\.#createContext\("globalPlaylistVolume"\);/);
  assert.match(helper, /ctx\.gainNode\.gain\.setValueAtTime\(volume, ctx\.currentTime\);/);
});
