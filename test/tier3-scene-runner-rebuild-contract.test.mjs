// Tier 3 — the Scene Runner rebuild, 2026-09-24.
//
// Ingram: "Look at the Scene Runner UI / UX. Reconsider it carefully. What
// works? What doesn't work? What could be better? What could be added? What
// should be taken away?... it needs to be wider to get more contents on
// screen and so the actual 'scene' part will have to shrink for the GM
// again." She runs a 4K screen at 150% display scaling (a 2560px page).
//
// What the rebuild is, and what each assertion below guards:
//   - a wide drawer (about 43% of the screen, draggable) laid out as columns
//     — the script, the people, the kit — under a header that never scrolls
//     and above a note bar that is always there;
//   - one line per beat, with the beat being run open, and each degree of
//     success showing its authored consequence (never shown before);
//   - the result a player rolls from a posted check records itself against
//     its beat, filling a gap and never overwriting the GM's own call;
//   - the stage, the rail and a staged scene's camera all fit themselves to
//     the space beside the drawer;
//   - opening the runner never wipes what it had loaded.
//
// Read as source, like every tier3-*-contract.test.mjs here: ApplicationV2
// destructures foundry.applications.api at module scope, so the adapter
// cannot be imported under plain node:test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const read = (...parts) => readFileSync(path.join(moduleRoot, ...parts), "utf8");

const src = read("scripts", "foundry", "scene-runner.mjs");
const camera = read("scripts", "foundry", "stage-camera.mjs");
const panel = read("templates", "runner", "panel.hbs");
const beatHbs = read("templates", "runner", "beat.hbs");
const person = read("templates", "runner", "person.hbs");
const css = read("styles", "bi-components.css");
const bridge = read("styles", "bi-foundry-bridge.css");
const tokens = read("styles", "bi-tokens.css");

const withoutComments = (text) => text.replace(/\{\{!--[\s\S]*?--\}\}/g, "");
const fnBody = (name) => src.match(new RegExp(`static (?:async )?#${name}\\([^)]*\\) \\{[\\s\\S]*?\\n {2}\\}`))?.[0] ?? null;

/* ---------------------------------------------------------------- */
/*  Wider, and the space beside it                                   */
/* ---------------------------------------------------------------- */

test("the drawer is a share of the screen now, not a 560px strip -- and never so wide the deck cannot fit beside it", () => {
  const token = tokens.match(/--bi-runner-width:\s*([^;]+);/);
  assert.ok(token, "--bi-runner-width is gone from bi-tokens.css");
  assert.doesNotMatch(token[1], /(^|[^0-9])560px/, "the old 560px cap is back");
  assert.match(token[1], /43vw/);
  assert.match(token[1], /calc\(100vw - 880px\)/, "the canvas beside the drawer must keep room for the deck at its smallest scale");
});

test("the GM can drag the edge; the width is theirs (client scope) and is written where everything that clears the drawer reads it", () => {
  assert.match(panel, /<div class="bi-runner__grip"/);
  assert.match(src, /game\.settings\.register\(MODULE_ID, SETTING_WIDTH, \{\s*scope: "client"/);
  const apply = src.match(/function applyRunnerWidth\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(apply, "applyRunnerWidth is missing");
  assert.match(apply, /document\.body\.style\.setProperty\("--bi-runner-width", css\)/);
  assert.match(apply, /removeProperty\("--bi-runner-width"\)/, "a reset must hand the width back to the stylesheet's default");
  assert.match(src, /grip\?\.addEventListener\("dblclick", \(\) => game\.settings\.set\(MODULE_ID, SETTING_WIDTH, 0\)/, "double-click must go back to the default");
});

test("opening, shutting or dragging the drawer refits the deck, the session rail and a staged camera -- once now and once after Foundry's own 250ms slide", () => {
  const relayout = src.match(/function relayoutAroundRunner\(\{ settle = true \} = \{\}\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(relayout, "relayoutAroundRunner is missing");
  assert.match(relayout, /fitDeck\(\)/);
  assert.match(relayout, /import\("\.\/session-rail\.mjs"\)\.then\(\(m\) => m\.fitRail\?\.\(\)\)/, "the rail never refitted when the drawer opened -- it only listened for window resizes");
  assert.match(relayout, /import\("\.\/stage-camera\.mjs"\)\.then\(\(m\) => m\.refitStageCamera\?\.\(\)\)/);
  assert.match(relayout, /setTimeout\(\(\) => relayoutAroundRunner\(\{ settle: false \}\), 3\d\d\)/);
  assert.match(fnBody("onToggle"), /relayoutAroundRunner\(\)/);
});

test("a staged scene's camera covers the band beside the drawer, centred there -- the players' own camera is untouched", () => {
  assert.match(camera, /import \{ coverFrame \} from "\.\.\/core\/camera-fit\.mjs"/);
  const override = camera.match(/proto\._constrainView = function biStageConstrainView\(\) \{[\s\S]*?\n {2}\};/)?.[0];
  assert.ok(override, "the camera override is missing");
  assert.match(override, /leftInset: drawerInset\(\)/);
  const inset = camera.match(/function drawerInset\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.match(inset, /querySelector\("\.bi-runner-shell--open"\)\) return 0;/, "a shut drawer (and every player, who has none) must see the plain full-window cover");
  assert.match(camera, /export function refitStageCamera\(\)/);
});

test("the stage lays its portraits out BESIDE an open drawer, not under it (players have no drawer and are untouched)", () => {
  assert.match(
    bridge,
    /body\.bi-theme:has\(#bi-scene-runner \.bi-runner-shell--open\) #bi-stage\.bi-stage \{\s*padding-left: calc\(var\(--bi-runner-width\) \+/
  );
});

test("the console window beside an open drawer fits the space the drawer leaves", () => {
  assert.match(bridge, /:has\(#bi-scene-runner \.bi-runner-shell--open\) \.bi-console-window-standalone \.bi-terminal \{\s*width: min\(1480px, calc\(100vw - var\(--bi-runner-width\)/);
});

/* ---------------------------------------------------------------- */
/*  Columns                                                          */
/* ---------------------------------------------------------------- */

test("header, columns, note bar: the header and the note bar sit OUTSIDE the scrolling columns", () => {
  const plain = withoutComments(panel);
  const head = plain.indexOf('<header class="bi-runner__head">');
  const cols = plain.indexOf('<div class="bi-runner__cols">');
  const bar = plain.indexOf('<footer class="bi-runner__notebar">');
  assert.ok(head > 0 && cols > head && bar > cols, "expected header, then columns, then the note bar");
  const colsBlock = plain.slice(cols, bar);
  for (const column of ['<div class="bi-runner__script">', '<aside class="bi-runner__side">', '<div class="bi-runner__people">', '<div class="bi-runner__kit">']) {
    assert.ok(colsBlock.includes(column), `${column} is missing from the columns`);
  }
});

test("the columns come from CONTAINER queries on the drawer, with the grid on a child of the container, never the container itself", () => {
  assert.match(css, /\.bi-runner \{[^}]*container-type: inline-size;[^}]*container-name: bi-runner;/);
  assert.doesNotMatch(css.match(/\.bi-runner \{[^}]*\}/)[0], /display:\s*grid/, "a grid on the query container itself is the track-sizing bug the V1 console hit");
  assert.match(css, /@container bi-runner \(min-width: 760px\) \{\s*\.bi-runner__cols \{\s*display: grid;/);
  assert.match(css, /@container bi-runner \(min-width: 1320px\)/);
  // Every track minmax(0, ...) so unbroken text can never widen a column.
  for (const tracks of css.matchAll(/\.bi-runner__cols \{[^}]*grid-template-columns: ([^;]+);/g)) {
    for (const track of tracks[1].split(/\s(?=minmax)/)) assert.match(track.trim(), /^minmax\(0,/, `a column track that can grow past its share: ${track}`);
  }
});

test("every column the panel scrolls is one ApplicationV2 restores after a re-render (the panel re-renders on every tick)", () => {
  const parts = src.match(/scrollable: \[([^\]]+)\]/)?.[1] ?? "";
  for (const selector of [".bi-runner__cols", ".bi-runner__script", ".bi-runner__side", ".bi-runner__people", ".bi-runner__kit"]) {
    assert.ok(parts.includes(`"${selector}"`), `${selector} would jump back to the top on every render`);
  }
});

/* ---------------------------------------------------------------- */
/*  The running order                                                */
/* ---------------------------------------------------------------- */

test("every scene in the episode's running order is still a one-press cue button (the guided demo presses them by data-brief-id)", () => {
  const step = panel.match(/\{\{#each steps\}\}[\s\S]*?\{\{\/each\}\}/)?.[0];
  assert.ok(step, "the running order's steps are missing");
  assert.match(step, /data-action="cueScene"\s*\n?\s*data-brief-id="\{\{briefRef\}\}"/);
  assert.match(step, /\{\{#if showTitle\}\}/, "only this scene and the next print their titles");
});

test("a beat is one line until opened: the row toggles its detail, and the detail only renders when open", () => {
  assert.match(beatHbs, /<div class="bi-runner__beat-summary" data-action="toggleBeatDetail" data-beat-id="\{\{id\}\}"\s*role="button" tabindex="0" aria-expanded="\{\{isOpen\}\}">/);
  assert.match(beatHbs, /\{\{#if isOpen\}\}\s*<div class="bi-runner__beat-body">/);
  assert.match(src, /toggleBeatDetail:\s*SceneRunner\.#onToggleBeatDetail/);
  assert.match(fnBody("onToggleBeatDetail"), /toggleDetail\(target\.dataset\.beatId, isOpen, view\)/);
});

test("the beat being run is marked, and opening a later beat to read ahead does NOT move that mark", () => {
  assert.match(beatHbs, /\{\{#if isNow\}\} bi-runner__beat--now\{\{\/if\}\}/);
  assert.doesNotMatch(fnBody("onToggleBeatDetail"), /focusId/, "peeking ahead must not change which beat the GM is on");
  for (const acts of ["onPostCheck", "onFireTrigger", "onOpenBeat"]) {
    assert.match(fnBody(acts), /this\.#focus\(/, `#${acts} is running a beat and should make it the one being run`);
  }
});

test("each degree of success shows its AUTHORED consequence and records it in the same press (never shown before 2026-09-24)", () => {
  const decorate = src.match(/#decorateBeat\(beat, brief, challenges, entries = \[\]\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.match(decorate, /consequence: check\.outcomes\?\.\[degree\] \?\? null/);
  const outcomes = beatHbs.match(/\{\{#each outcomes\}\}[\s\S]*?\{\{\/each\}\}/)?.[0];
  assert.ok(outcomes);
  assert.match(outcomes, /data-action="recordOutcome" data-beat-id="\{\{\.\.\/id\}\}" data-degree="\{\{degree\}\}"/);
  assert.match(outcomes, /\{\{consequence\}\}/);
});

test("recording an outcome keeps that beat open on its consequence; ticking the next thing folds it", () => {
  assert.match(fnBody("onRecordOutcome"), /this\.#viewFor\(briefId\)\.resolvedId = beatId;/);
  assert.match(fnBody("onRecordChoice"), /this\.#viewFor\(briefId\)\.resolvedId = beatId;/);
  assert.match(fnBody("onToggleBeat"), /view\.resolvedId = null;/);
});

test("'show every beat in full' is one remembered choice, not a fold per section", () => {
  assert.match(panel, /data-action="toggleShowAll" aria-pressed="\{\{showAll\}\}"/);
  assert.match(fnBody("onToggleShowAll"), /SETTING_FOLDS, \{ \.\.\.folds\(\), detail: !\(folds\(\)\.detail === true\) \}/);
});

test("how to play it and how it ends reach the GM with their bold rendered, not as raw asterisks", () => {
  assert.match(src, /howToPlayHtml: brief\.howToPlay \? renderProse\(brief\.howToPlay, escapeHtml\) : null/);
  assert.match(panel, /\{\{\{howToPlayHtml\}\}\}/);
  assert.doesNotMatch(panel, /\{\{howToPlay\}\}/);
  assert.match(panel, /\{\{\{outro\.onwardsHtml\}\}\}/);
  assert.doesNotMatch(panel, /\{\{outro\.onwards\}\}/);
});

/* ---------------------------------------------------------------- */
/*  Rolls come back by themselves                                    */
/* ---------------------------------------------------------------- */

test("every check the runner posts is tagged with its brief and beat (or topic)", () => {
  // 2026-10-04 (D058): the call also carries the check's own `secret` flag, so a check whose critical failure is a
  // belief rolls blind (core/roll-intent.mjs#enricherFor).
  assert.match(fnBody("onPostCheck"), /enrichersFor\(\{ skillOptions: checkSkills\(check\), dc, secret: check\.secret === true, options: rollTagFor\(brief\.id, beat\.id\) \}\)/);
  assert.match(fnBody("onFireTrigger"), /options: rollTagFor\(brief\.id, beatId\)/);
  assert.match(fnBody("onPostTopicCheck"), /options: rollTagFor\(brief\.id, topicKey\)/);
  const tagFor = src.match(/function rollTagFor\(briefId, key\) \{[\s\S]*?\n\}/)?.[0];
  assert.match(tagFor, /catch/, "an id that cannot be tagged must still post the check, untagged");
});

test("a tagged result records itself -- on the ACTIVE GM's client only, into a gap only, and only for the brief on screen", () => {
  const hook = src.match(/Hooks\.on\("createChatMessage", \(message\) => \{[\s\S]*?\n\}\);/)?.[0];
  assert.ok(hook, "the chat hook that records rolled results is missing");
  assert.match(hook, /game\.users\?\.activeGM/, "with an assistant GM connected, two clients would record the same roll twice");
  assert.match(hook, /recordRollResult\(result\)/);
  const record = src.match(/async function recordRollResult\(result, \{ force = false \} = \{\}\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(record, "recordRollResult is missing");
  assert.match(record, /result\.briefId !== briefId\) return false;/, "a roll for a scene the GM has left must not reach into that scene's run state");
  assert.equal((record.match(/!force && !shouldAutoRecord\(result, recorded\)/g) ?? []).length, 2, "both the beat and the topic path must only fill a gap");
  assert.match(record, /via: "roll"/);
  assert.match(record, /outcomeLogSubject\(result\.key, result\.degree\)/, "a rolled result must tally in the log like a clicked one");
});

test("every result is listed on its beat, and any of them can be used instead with one press", () => {
  const rolls = beatHbs.match(/\{\{#each rolls\}\}[\s\S]*?\{\{\/each\}\}/)?.[0];
  assert.ok(rolls);
  assert.match(rolls, /data-action="useRoll" data-message-id="\{\{messageId\}\}"/);
  assert.match(fnBody("onUseRoll"), /recordRollResult\(result, \{ force: true \}\)/);
  assert.match(fnBody("onUseRoll"), /game\.messages\?\.get\(target\.dataset\.messageId\)/, "read the result back out of the real message, never the button's copy");
});

/* ---------------------------------------------------------------- */
/*  People                                                           */
/* ---------------------------------------------------------------- */

test("who is on stage is listed with a way off; a brief's own cast can finally be taken off the stage from the runner", () => {
  assert.match(panel, /\{\{#each onStageNow\}\}[\s\S]*?data-action="unstagePerson" data-portrait-id="\{\{portraitId\}\}"/);
  assert.match(fnBody("onUnstagePerson"), /removeFromStage\(scene, portraitId\)/);
  assert.match(src, /unstagePerson:\s*SceneRunner\.#onUnstagePerson/);
});

test("a cast card keeps its stage key always (the guided demo presses it) and shows what they WANT even folded", () => {
  assert.match(person, /data-action="stagePerson" data-portrait-id="\{\{portraitId\}\}"/);
  assert.match(person, /\{\{#if onStage\}\}\s*<button type="button" class="bi-runner__unstage" data-action="unstagePerson"/);
  const wants = person.indexOf("brief.wants");
  const body = person.indexOf('<div class="bi-runner__person-body">');
  assert.ok(wants > 0 && body > wants, "'what they want' must sit above the fold, not inside it");
});

test("the person the beat being run is about opens by themselves", () => {
  assert.match(src, /const inBeat = Boolean\(nowBeat\?\.npcRef && nowBeat\.npcRef === member\.id\);/);
  assert.match(src, /isOpen: view\.people\[member\.id\] \?\? inBeat,/);
});

/* ---------------------------------------------------------------- */
/*  Opening the runner never loses what it had                        */
/* ---------------------------------------------------------------- */

test("REGRESSION: openSceneRunner() with no episode only opens the drawer -- it used to wipe the loaded episode and scene (the Console hub calls it bare)", () => {
  const open = src.match(/export async function openSceneRunner\([^)]*\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(open);
  assert.match(open, /if \(typeof episodeId === "string" && episodeId\) \{/, "settings must only be written when an episode is actually named");
  assert.doesNotMatch(open, /SETTING_EPISODE, episodeId \?\? ""/, "the old unconditional write of an empty episode is back");
});

test("a runner opened with no scene chosen shows the scene the TABLE is on, and never overrides one the GM chose", () => {
  const adopt = src.match(/async function adoptActiveSceneBrief\(\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(adopt);
  assert.match(adopt, /currentBriefId\(\)\) return;/);
  assert.match(adopt, /game\.scenes\?\.active\?\.getFlag\(MODULE_ID, "briefRef"\)/);
});

test("the scene clock keeps itself current between renders, and stops when the panel closes", () => {
  assert.match(panel, /data-pace-started="\{\{pacing\.startedAt\}\}"/);
  assert.match(src, /this\.#timer = setInterval\(tick, 20000\);/);
  assert.match(src, /_onClose\(options\) \{[\s\S]*?clearInterval\(this\.#timer\);/);
});

test("every class the rebuild introduced is real CSS", () => {
  for (const cls of [
    "bi-runner__cols", "bi-runner__script", "bi-runner__side", "bi-runner__people", "bi-runner__kit",
    "bi-runner__beat-row", "bi-runner__beat-summary", "bi-runner__beat-chips", "bi-runner__beat--now", "bi-runner__now",
    "bi-runner__outcome", "bi-runner__outcome--picked", "bi-runner__outcome-text", "bi-runner__rolls",
    "bi-runner__bookend", "bi-runner__onstage-chip", "bi-runner__unstage", "bi-runner__grip", "bi-runner__note-tag",
    "bi-runner__elsewhere", "bi-runner__meter-seg", "bi-runner__fight"
  ]) {
    assert.ok(new RegExp(`\\.${cls}[\\s,{:.\\[]`).test(css), `.${cls} has no rule in bi-components.css`);
  }
});

test("both themes define the rebuild's own tokens", () => {
  const light = css.match(/^\.bi-runner, \.bi-scene-close__body \{[\s\S]*?\n\}/m)?.[0] ?? "";
  const dark = css.match(/\.bi-runner\[data-bi-theme="dark"\], \.bi-scene-close__body\[data-bi-theme="dark"\] \{[\s\S]*?\n\}/)?.[0] ?? "";
  for (const token of ["--sr-now:", "--sr-now-bg:", "--sr-now-ink:", "--sr-read-bg:", "--sr-bg-side:"]) {
    assert.ok(light.includes(token), `light theme is missing ${token}`);
    assert.ok(dark.includes(token), `dark theme is missing ${token}`);
  }
});

test("the clock has the GM's own +/- keys, clamped by the pool itself, logged, and reading against the right limit", () => {
  assert.match(src, /nudgeClock:\s*SceneRunner\.#onNudgeClock/);
  const nudge = fnBody("onNudgeClock");
  assert.ok(nudge, "#onNudgeClock is missing");
  assert.match(nudge, /!clock\.canRaise/);
  assert.match(nudge, /!clock\.canLower/);
  assert.match(nudge, /recordLogEntry\(/, "a clock moving is something that happened in the scene, and belongs in the log");
  assert.match(panel, /data-action="nudgeClock" data-delta="-1"/);
  assert.match(panel, /data-action="nudgeClock" data-delta="1"/);
  assert.match(panel, /\{\{clock\.current\}\}\/\{\{clock\.limit\}\}/);
  assert.doesNotMatch(panel, /\{\{clock\.start\}\}/, "'of {start}' is what made a rising clock read '0 of 0'");
  assert.match(panel, /\{\{#if clock\.next\}\}/);
});

// 2026-09-24: The Road In's small problem is rolled on whatever skill the
// player names (an `anySkill` check with empty skillOptions). Every place the
// runner posts a check must go through checkSkills, or that check posts an
// empty chat message and the player has nothing to click.
test("every check the runner posts goes through checkSkills, so an any-skill check is never an empty message", () => {
  const posts = src.match(/enrichersFor\(\{ skillOptions: [^,]+,/g) ?? [];
  assert.ok(posts.length >= 3, "expected the beat, topic and trigger post sites");
  for (const site of posts) assert.match(site, /skillOptions: checkSkills\(check\),/, site);
  assert.match(src, /import \{[^}]*checkSkills[^}]*\} from "\.\.\/core\/roll-intent\.mjs"/);
});

test("an any-skill check's button reads 'Any skill' rather than eighteen slugs", () => {
  assert.match(src, /checkLabel\(check, dc, game\.i18n\.localize\("BLANKINHERITANCE\.Runner\.AnySkill"\)\)/);
  const lang = JSON.parse(read("lang", "en.json"));
  assert.equal(lang.BLANKINHERITANCE.Runner.AnySkill, "Any skill");
});
