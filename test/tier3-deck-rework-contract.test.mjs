// Tier 3 — the deck's 2026-09-23 rework, pinned against its own stylesheet,
// templates and wiring. Ingram's brief, in two halves: a visuals pass ("the
// dirt/grime stuff looks like single tiny dots ... better panel lines ... a
// slightly warm flickering glow") and a UX pass ("note the buttons which are
// cropped ... the log window is tiny ... we can get more info into [the
// central display]"), plus a thin session rail across the top of the screen.
// Each assertion here guards one thing that was fixed, so it cannot quietly
// come back.
//
// Needs no source trees; always runs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance");
const read = (...p) => readFileSync(path.join(moduleRoot, ...p), "utf8");
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const tokens = stripComments(read("styles", "bi-tokens.css"));
const components = stripComments(read("styles", "bi-components.css"));
const bridge = stripComments(read("styles", "bi-foundry-bridge.css"));
const orbTemplate = read("templates", "console", "deck", "deck-orb.hbs");
const directorTemplate = read("templates", "console", "deck", "deck-director.hbs");
const identTemplate = read("templates", "console", "deck", "deck-ident.hbs");
const selectorsTemplate = read("templates", "console", "deck", "deck-selectors.hbs");
const deckAdapter = read("scripts", "foundry", "deck.mjs");
const commandBar = read("scripts", "foundry", "command-bar.mjs");
const directorBar = read("scripts", "foundry", "director-bar.mjs");
const playerBar = read("scripts", "foundry", "player-bar.mjs");
const railAdapter = read("scripts", "foundry", "session-rail.mjs");
const sessionLog = read("scripts", "foundry", "session-log.mjs");
const entry = read("scripts", "blank-inheritance.mjs");

/** The body of the first rule whose whole selector list is exactly `selector`. */
function rule(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  const m = css.match(new RegExp(`(?:^|\\})\\s*${escaped}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `no rule for ${selector}`);
  return m[1];
}

function px(body, property) {
  const m = body.match(new RegExp(`(?:^|[;\\s])${property}:\\s*(\\d+(?:\\.\\d+)?)px`));
  assert.ok(m, `no ${property} in px`);
  return Number(m[1]);
}

function token(name) {
  const m = tokens.match(new RegExp(`${name}:\\s*(\\d+(?:\\.\\d+)?)px`));
  assert.ok(m, `bi-tokens.css does not declare ${name} in px`);
  return Number(m[1]);
}

/* ---------------------------------------------------------------- */
/*  The visuals pass                                                 */
/* ---------------------------------------------------------------- */

test("the silver plates wear real grime — stain, clustered dirt and scratches — not the old even sprinkle (regression: 'single tiny dots')", () => {
  const silver = rule(components, '.bi-deck__module[data-slot="outer"],\n.bi-deck__module[data-slot="spine"]');
  for (const layer of ["--bi-wear-stain", "--bi-wear-grime", "--bi-wear-scratch", "--bi-screw-a", "--bi-screw-b"]) {
    assert.match(silver, new RegExp(`var\\(${layer}\\)`), `the silver plates lost ${layer}`);
  }
  assert.doesNotMatch(silver, /--bi-grain-pitted\b/, "the evenly-thresholded pitted grain is what read as dead pixels; it must not come back here");
  const black = rule(components, '.bi-deck__module[data-slot="inner"]');
  assert.match(black, /var\(--bi-wear-grime-light\)/);
  assert.match(black, /var\(--bi-vent-hatch\)/, "the key banks carry the north star's vent hatch");
});

test("the grime clusters: its specks are masked by a coarse field, so dirt collects in patches with clean metal between", () => {
  const grime = tokens.match(/--bi-wear-grime:\s*url\("([^"]+)"\)/);
  assert.ok(grime, "--bi-wear-grime is missing");
  assert.match(grime[1], /feComposite[^>]*operator='in'/, "without the `in` composite the specks fall evenly again");
  assert.match(grime[1], /feGaussianBlur/, "unblurred specks are hard single pixels");
  // Two turbulence fields at very different scales: fine specks and the coarse mask.
  const freqs = [...grime[1].matchAll(/baseFrequency='([\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(Math.max(...freqs) / Math.min(...freqs) >= 10, `the speck and mask fields are too close in scale (${freqs})`);
});

test("every module is its own plate: a shadowed groove on one edge, a hairline on the other", () => {
  const module = rule(components, ".bi-deck__module");
  assert.match(module, /box-shadow:[^;]*inset 2px 0 0[^;]*inset 3px 0 0[^;]*inset -1px 0 0/, "the panel-line groove is gone");
});

test("the orb's light comes from ONE lamp behind the glass, flickering on the face itself, still for reduced motion (regression: the flicker showed only in a spill behind the panel)", () => {
  assert.match(orbTemplate, /<div class="bi-orb__glass">\s*<div class="bi-orb__lamp"/, "the lamp must sit inside the glass, under the printed face");
  assert.doesNotMatch(orbTemplate, /bi-orb__spill/, "the spill read as a glow behind the panel (2026-09-23 review); it must not come back");
  assert.doesNotMatch(components, /\.bi-orb__spill\b/);
  assert.match(rule(components, ".bi-orb__lamp"), /animation:\s*bi-orb-filament\b/);
  assert.match(rule(components, ".bi-orb__lamp"), /mix-blend-mode:\s*screen/);
  const frames = components.match(/@keyframes bi-orb-filament\s*\{([\s\S]*?)\n\}/);
  assert.ok(frames, "@keyframes bi-orb-filament is missing");
  const values = [...frames[1].matchAll(/opacity:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const properties = [...frames[1].matchAll(/\{\s*([a-z-]+):/g)].map((m) => m[1]);
  assert.ok(properties.length > 5 && properties.every((p) => p === "opacity"), "opacity only — the compositor's cheap path, never a repaint");
  assert.ok(Math.max(...values) - Math.min(...values) >= 0.3, "a flicker too shallow to see on the face is the bug this replaced");
  assert.match(components, /@media \(prefers-reduced-motion: reduce\) \{[^@]{0,160}\.bi-orb__lamp \{ animation: none; \}/);
});

test("the bezel's glyphs ride their own top layer, so the glass and its rings can never cut into them (regression: 'the kanji ... are cut off')", () => {
  const bezelSvg = orbTemplate.match(/<svg class="bi-orb__bezel"[\s\S]*?<\/svg>/)[0];
  assert.doesNotMatch(bezelSvg, /bi-orb__glyph/, "glyphs inside the bezel SVG sit under the glass");
  assert.ok(orbTemplate.indexOf('class="bi-orb__glyphs"') > orbTemplate.indexOf('class="bi-orb__glass"'), "the glyph layer must come after the glass");
  const layer = rule(components, ".bi-orb__glyphs");
  const z = Number(layer.match(/z-index:\s*(\d+)/)?.[1]);
  const glassZ = Number(rule(components, ".bi-orb__glass").match(/z-index:\s*(\d+)/)?.[1]);
  const hitsZ = Number(rule(components, ".bi-orb__hits").match(/z-index:\s*(\d+)/)?.[1]);
  assert.ok(z > glassZ && z > hitsZ, "the glyph layer must stack above the glass and the bezel keys");
  assert.match(layer, /pointer-events:\s*none/, "and stay inert, so the bezel keys still take the press");
});

test("the grime was turned down on review — wear stays, but faint", () => {
  const grime = tokens.match(/--bi-wear-grime:\s*url\("([^"]+)"\)/)[1];
  assert.ok(Number(grime.match(/filter='url\(%23g\)' opacity='([\d.]+)'/)[1]) <= 0.4, "the clustered grime is back up past its reviewed strength");
  const scratch = tokens.match(/--bi-wear-scratch:\s*url\("([^"]+)"\)/)[1];
  assert.ok(Math.max(...[...scratch.matchAll(/stroke-opacity='([\d.]+)'/g)].map((m) => Number(m[1]))) <= 0.4);
});

test("Comms is a compact device floating between the rail and the deck — never over the deck, never over Foundry's own windows", () => {
  const phoneTemplate = read("templates", "console", "phone.hbs");
  assert.doesNotMatch(phoneTemplate, /bi-terminal/, "the old bottom-anchored slab is retired for Comms");
  const comms = rule(components, ".bi-comms");
  assert.match(comms, /position:\s*fixed/);
  assert.match(comms, /top:\s*calc\(\(56px \+ 100vh - var\(--bi-bar-height/, "centred in the band between the rail and the deck's crown");
  assert.match(comms, /max-height:\s*calc\(100vh - var\(--bi-bar-height/, "it can never grow down over the deck");
  assert.match(comms, /width:\s*min\(\d+px/, "a device, not a full-width slab");
  assert.match(comms, /z-index:\s*calc\(var\(--z-index-app\) \+ 1\)/, "one step above the deck, under Foundry's own windows");
  const phone = read("scripts", "foundry", "phone.mjs");
  assert.match(phone, /event\.key !== "Escape" \|\| !active\?\.isOpen/, "Escape puts the handset down — one press out");
  assert.match(phone, /capture: true/);
});

test("the Radio's meter is a real printed VU face on the Sound Desk's own scale (regression: 'the meter is a mess')", () => {
  const radio = read("scripts", "foundry", "radio-app.mjs");
  assert.match(radio, /vuFace\(\{ min: VU_SCALE\.min, max: VU_SCALE\.max/);
  assert.match(radio, /meterFaceGeometry\(\)/, "the same crop the Sound Desk uses, so the needle lands on the printed scale");
  assert.match(radio, /needleBottomPct/);
  assert.match(rule(components, ".bi-radio__channels"), /grid-template-columns:\s*repeat\(3,/, "three knobs side by side");
});

test("every surface that shows a log line shows the same local 24-hour time (regression: 03:35 PM on the deck, 14:35 in the Console)", () => {
  assert.match(sessionLog, /export function localClock\(iso\)/);
  assert.match(sessionLog, /hourCycle: "h23"/);
  assert.match(deckAdapter, /localClock\(e\.at\)/);
  assert.match(read("scripts", "foundry", "console-window.mjs"), /clock: localClock\(e\.at\)/);
  assert.match(read("scripts", "foundry", "phone.mjs"), /localClock\(row\.at\)/);
});

/* ---------------------------------------------------------------- */
/*  The UX pass                                                      */
/* ---------------------------------------------------------------- */

test("the Director's doors fit their shoulder with room to spare (regression: the fourth pill was cropped)", () => {
  const pills = (directorTemplate.match(/class="bi-deck-pill__cap"/g) ?? []).length;
  assert.equal(pills, 6, "Script, Sound, Find, Console, Comms, Demo");
  // A row this dense narrows its own caps past the base 44px (a more
  // specific rule under .bi-deck__pills--tight, which the template actually
  // carries) — read THAT width, not the base one every other pill row uses.
  const cap = px(rule(components, ".bi-deck__pills--tight .bi-deck-pill__cap"), "width");
  const gap = px(rule(components, ".bi-deck__pills--tight"), "gap");
  const pad = rule(components, ".bi-deck-director,\n.bi-deck-selectors");
  const room = token("--bi-deck-outer") - px(pad, "padding-left") - px(pad, "padding-right");
  assert.ok(pills * cap + (pills - 1) * gap <= room, `${pills} pills need ${pills * cap + (pills - 1) * gap}px; the shoulder has ${room}px`);
  // The player's dossier carries five since Notes joined (2026-09-29), and a
  // fifth pill at the base 44px cap left the caps overlapping by a pixel, so
  // its row is the tight one too, under the same arithmetic.
  const playerPills = (identTemplate.match(/class="bi-deck-pill__cap"/g) ?? []).length;
  // and six since the Journal joined (2026-10-04, design/objectives.md): 231 of 252 px, still inside the row.
  assert.equal(playerPills, 6, "Sheet, Spells, Gear, Notes, Journal, Comms");
  assert.match(identTemplate, /class="bi-deck__pills bi-deck__pills--tight"/, "five pills must use the tight row");
  assert.ok(playerPills * cap + (playerPills - 1) * gap <= room, `${playerPills} pills need ${playerPills * cap + (playerPills - 1) * gap}px; the shoulder has ${room}px`);
});

test("the log shows six timestamped lines, and the number of rows the CSS draws is the number the adapter sends", () => {
  const lines = Number(deckAdapter.match(/export const LOG_LINES_ON_DECK = (\d+)/)?.[1]);
  assert.ok(lines >= 6, "the log shoulder was two lines; it must never shrink back");
  assert.match(rule(components, ".bi-deck-log__recent"), new RegExp(`grid-template-rows:\\s*repeat\\(${lines},`));
  assert.match(directorTemplate, /<time>\{\{this\.time\}\}<\/time>/, "each line carries the time it was written");
  // Local wall-clock time: the stored ISO string is UTC, and slicing it would
  // read an hour early all summer.
  assert.match(directorTemplate, /data-action="openConsoleTab" data-tab="log"/, "one press from the deck to the whole log");

  const rows = Number(deckAdapter.match(/export const CAST_ROWS_PER_PAGE = (\d+)/)?.[1]);
  assert.match(rule(components, ".bi-deck-cast__rows"), new RegExp(`grid-template-rows:\\s*repeat\\(${rows},`));
  assert.match(rule(components, ".bi-deck-cast__slot"), /min-width:\s*0/, "a long name must not push the HP gauge off the board");
});

test("any log entry, from anywhere, repaints the deck's log and the rail (regression: only the deck's own field refreshed it)", () => {
  assert.match(sessionLog, /Hooks\?\.callAll\("blank-inheritance\.logEntry", entry\)/);
  const listener = entry.match(/Hooks\.on\("blank-inheritance\.logEntry", \(\) => \{[\s\S]*?\n\}\);/);
  assert.ok(listener, "nothing listens for new log entries");
  assert.match(listener[0], /refreshCommandBar\(\["right"\]\)/);
  assert.match(listener[0], /refreshSessionRail\(\)/);
});

test("the central display carries more: annunciators on the face, AC/speed/level round the collar's foot, and flank keys", () => {
  assert.match(orbTemplate, /bi-orb__ann-lamp[^"]*" data-kind="hero"/);
  assert.match(orbTemplate, /bi-orb__ann-lamp[^"]*" data-kind="dying"/);
  assert.match(orbTemplate, /href="#bi-orb-caption-under"/);
  assert.match(orbTemplate, /orb\.keys\.initiative\.action/);
  assert.match(orbTemplate, /orb\.keys\.turn\.action/);
});

test("the demo/walkthrough runner is a pill on the deck's own shoulder, GM-only, its old floating button hidden (2026-09-23, Ingram: 'put that into the UI for the GM only')", () => {
  assert.match(directorTemplate, /data-action="openDemo"/, "deck-director.hbs no longer offers an openDemo pill");
  assert.match(directorBar, /openDemo:\s*DirectorBar\.#onOpenDemo/, "DirectorBar no longer wires the openDemo action");
  assert.doesNotMatch(playerBar, /openDemo:/, "a player's deck must never carry a door into the demo runner");
  assert.doesNotMatch(commandBar, /openDemo:/, "the shared chassis must not wire openDemo for both seats");
  assert.match(directorBar, /import\s*\{[^}]*toggleDemoRunner[^}]*\}\s*from\s*"\.\/demo-runner\.mjs"/);
  assert.match(read("scripts", "foundry", "demo-runner.mjs"), /export function mountDemoRunner\(\) \{\s*if \(!game\.user\?\.isGM\) return null;/,
    "mountDemoRunner must still refuse to construct the panel for a non-GM — the deck pill is a second door, not the only guard");

  const hideRule = bridge.match(/:has\(#bi-command-bar\.bi-deck\)[^{]*\{\s*display:\s*none;\s*\}/s);
  assert.ok(hideRule, "no rule hides the legacy floating buttons while the deck is mounted");
  assert.match(hideRule[0], /\.bi-demo-runner-btn/, ".bi-demo-runner-btn is no longer hidden while the deck carries its own Demo pill — a redundant second door back on screen");
});

test("the Turn key's combat controls live on the seat that owns them — a player's deck never carries the Director's", () => {
  for (const action of ["joinCombat", "startCombat", "nextTurn"]) {
    assert.match(directorBar, new RegExp(`${action}:\\s*DirectorBar\\.#on`), `DirectorBar no longer wires ${action}`);
    assert.doesNotMatch(playerBar, new RegExp(`${action}:`), `PlayerBar must not wire ${action}`);
    assert.doesNotMatch(commandBar, new RegExp(`${action}:`), `the shared chassis must not wire ${action} for both seats`);
  }
  assert.match(playerBar, /endTurn:\s*PlayerBar\.#onEndTurn/);
  assert.doesNotMatch(directorBar, /endTurn:/);
  assert.match(commandBar, /rollInitiative:\s*CommandBar\.#onRollInitiative/, "Initiative is shared hardware, both seats");
});

test("the player's selectors carry an Action knob, and Strike has Damage and Critical keys", () => {
  assert.match(selectorsTemplate, /data-selector="action"/);
  assert.match(selectorsTemplate, /data-action="useAction"/);
  assert.match(selectorsTemplate, /data-action="rollDamage"[^>]*data-critical="0"/);
  assert.match(selectorsTemplate, /data-action="rollDamage"[^>]*data-critical="1"/);
  assert.match(playerBar, /useAction:\s*PlayerBar\.#onUseAction/);
  assert.match(playerBar, /rollDamage:\s*PlayerBar\.#onRollDamage/);
  assert.match(rule(components, ".bi-deck-selectors__set"), /grid-template-columns:\s*repeat\(3,/);
});

test("with nothing selected the Director's banks ask the table instead of lying dead", () => {
  assert.match(commandBar, /deckChecksFor\(actor, \{ ask: seat === SEATS\.DIRECTOR \}\)/);
  // 2026-10-05 (D061): asking puts the check to the table in the check console rather than posting a card to chat.
  assert.match(directorBar, /if \(event\?\.shiftKey \|\| !actor\) \{\s*await askForWay\(slug\);/);
});

/* ---------------------------------------------------------------- */
/*  The session rail                                                 */
/* ---------------------------------------------------------------- */

test("the session rail is the GM's alone, mounted where the deck mounts, and sits clear of Foundry's own furniture", () => {
  assert.match(railAdapter, /export function mountSessionRail\(\) \{\s*if \(!game\.user\?\.isGM\) return null;/,
    "a player's client must never construct the rail (Law 11 as structure)");
  assert.match(railAdapter, /getElementById\("interface"\)/, "mounted into #interface, never #ui-middle (its transform breaks position: fixed)");
  assert.match(railAdapter, /"sidebar", "chat-notifications"/, "the right end must stop short of the chat-notification column (found live)");
  const placed = rule(bridge, "body.bi-theme #bi-session-rail");
  assert.match(placed, /position:\s*fixed/);
  assert.match(placed, /left:\s*var\(--bi-rail-left/);
  assert.match(placed, /right:\s*var\(--bi-rail-right/);
  assert.match(entry, /registerSessionRailSettings\(/);
  assert.match(entry, /mountSessionRail\(\)/);
});

test("the rail's scene timeline never writes a second line into the log for a scene change", () => {
  const note = railAdapter.match(/export function noteSceneActivated[\s\S]*?\n\}/);
  assert.ok(note);
  assert.doesNotMatch(note[0], /recordLogEntry/, "the Palette and Scene Runner already log their cuts; a second writer doubles them");
  assert.match(note[0], /localStorage/);
});

test("the rail's own classes are its own — no collision with the V1 prototype's .bi-rail (regression: inherited 13px padding)", () => {
  assert.match(railAdapter, /classes: \["bi-srail"\]/);
  assert.doesNotMatch(read("templates", "console", "session-rail.hbs"), /class="bi-rail[\s_"]/);
});
