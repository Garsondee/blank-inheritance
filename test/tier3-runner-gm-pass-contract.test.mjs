// Tier 3 — the Scene Runner's 2026-10-04 pass (D059), wired up for real.
//
// Ingram: "Imagine that I'm going to be reading this whilst also listening to
// players and also thinking my way through a scene. What might I need?" The
// pure halves are tested in tier1 (runner-party, beat-autofire, table-knows,
// fight-setup, runner-view, roll-intent, scene-close). This is the other half:
// that scene-runner.mjs, the templates and the close dialogue actually use
// them. Like every tier3 Runner contract, it reads the real source, because
// scene-runner.mjs destructures foundry.applications.api at module scope.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MOD = path.join(ROOT, "module", "blank-inheritance");
const read = (...parts) => readFileSync(path.join(MOD, ...parts), "utf8");
const src = read("scripts", "foundry", "scene-runner.mjs");
const panel = read("templates", "runner", "panel.hbs");
const beatHbs = read("templates", "runner", "beat.hbs");
const personHbs = read("templates", "runner", "person.hbs");
const closeHbs = read("templates", "console", "scene-close.hbs");
const closeSrc = read("scripts", "foundry", "scene-close.mjs");
const css = read("styles", "bi-components.css");

const fnBody = (name) => src.match(new RegExp(`static (?:async )?#${name}\\((?:event, target)?\\) \\{[\\s\\S]*?\\n {2}\\}`))?.[0] ?? null;
const moduleFn = (name) => src.match(new RegExp(`(?:async )?function ${name}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`))?.[0] ?? null;
// 2026-10-05: a check runs in the check console (foundry/check-console.mjs) from its pill in the beat's line.
const consoleSrc = read("scripts", "foundry", "check-console.mjs");
const gmHbs = read("templates", "check-console", "gm.hbs");
const checkCss = read("styles", "bi-check.css");
const pillSrc = read("scripts", "core", "check-pill.mjs");

/* ---------------------------------------------------------------- */
/*  One press per moment                                             */
/* ---------------------------------------------------------------- */

test("every way a beat becomes done (or stops being done) runs its objective chips through beatAutomation", () => {
  const helper = src.match(/async function beatAutomation\(briefId, beatId, before, after\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(helper, "beatAutomation is missing");
  assert.match(helper, /chipsToFireOnDone\(beat, \{ degree: after\?\.degree \?\? null \}\)/, "every objective chip is offered: the store is idempotent");
  assert.match(helper, /runObjectiveTrigger\(chip, \{ scene: [^}]*confirm: false, quiet: true \}\)/, "an automatic give must not ask again");
  assert.match(helper, /undoFor\(before\.fired\)/, "un-marking must undo what marking did");
  assert.match(helper, /subject: `\$\{beatId\}::auto::\$\{chip\.id\}`/, "an auto-fired chip is logged apart from a press, so a re-tick fires it again");
  for (const name of ["onToggleBeat", "onRecordChoice", "onClosePrompt"]) {
    assert.match(fnBody(name) ?? "", /beatAutomation\(briefId, beatId, before, /, `#${name} no longer fires (or undoes) the beat's objective chips`);
  }
  // 2026-10-05: a degree marked in the check console, and a result set there by hand.
  for (const name of ["recordMarkedOutcome", "recordHandResult"]) {
    assert.match(moduleFn(name) ?? "", /beatAutomation\(briefId, beatId, before, /, `${name} no longer fires (or undoes) the beat's objective chips`);
  }
  const record = src.match(/async function recordRollResult\(result, \{ force = false \} = \{\}\) \{[\s\S]*?\n\}/)?.[0];
  assert.match(record, /await beatAutomation\(briefId, result\.key, recorded, stamp\);/, "a roll that records itself must fire the chips too");
});

test("showing a handout gives the objective its beat gives, from the beat, the Kit list and an inline chip", () => {
  assert.match(fnBody("onRevealHandout"), /this\.#giveWithHandout\(target\.dataset\.handoutId, target\.dataset\.beatId \?\? null\)/);
  assert.match(fnBody("onRevealHandoutSolo"), /this\.#giveWithHandout\(target\.dataset\.handoutId, target\.dataset\.beatId \?\? null\)/);
  const reveal = fnBody("onFireTrigger").match(/case "reveal-handout": \{[\s\S]*?\n {6}\}/)?.[0];
  assert.match(reveal, /await this\.#giveWithHandout\(trigger\.handoutRef, beatId\);/);
  const give = src.match(/async #giveWithHandout\(handoutId, beatId = null\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(give, "#giveWithHandout is missing");
  assert.match(give, /confirm: false, quiet: true/);
  assert.match(give, /subject: triggerLogSubject\(beat\.id, chip\.id\)/, "the give is logged as a press, so the chip shows it happened");
});

test("chips pressed or fired show a tick, in beats and in the opening and ending", () => {
  assert.match(src, /const decorate = \(text\) => decorateInlineTriggers\(text, beat\.triggers, beat\.id, \{ fired \}\);/);
  assert.match(src, /decorateInlineTriggers\(beat\.readAloud, beat\.triggers, beat\.id, \{ fired \}\)/);
  assert.match(src, /for \(const entry of runState\?\.ticked\?\.\[beat\.id\]\?\.fired \?\? \[\]\) fired\.add\(entry\.id\);/);
  assert.match(src, /decorateInlineTriggers\(section\?\.readAloud, section\?\.triggers, sectionId, \{ fired: firedTriggerIds\(entries, sectionId\) \}\)/);
  assert.match(css, /\.bi-trig--fired \{/);
  assert.match(css, /\.bi-runner__beat--now \.bi-trig\[data-kind="npc-enter"\]:not\(\.bi-trig--fired\)/, "an entrance on the beat being run is highlighted, never fired");
});

/* ---------------------------------------------------------------- */
/*  The party, the carry-ins, each player's own result               */
/* ---------------------------------------------------------------- */

test("the carry-ins into a scene name their characters, and the party strip shows what is live for each", () => {
  assert.match(src, /const carryIns = carryInsWithNames\(state\.intro\?\.carriesIn \?\? \[\], \{ runs, members, arrivals: cityArrivals\(\) \}\);/);
  assert.match(src, /partyStrip: partyStrip\(members, carryIns\)/);
  assert.match(src, /intro: state\.intro \? \{ \.\.\.state\.intro, carriesIn: carryIns,/);
  assert.match(panel, /\{\{#each intro\.carriesIn\}\}[\s\S]*?\{\{namesText\}\}/);
  assert.match(panel, /\{\{#each partyStrip\}\}[\s\S]*?\{\{hp\.value\}\}\/\{\{hp\.max\}\}[\s\S]*?\{\{#each tags\}\}/);
});

test("a roll that does not take the beat still keeps that character's own result", () => {
  const record = src.match(/async function recordRollResult\(result, \{ force = false \} = \{\}\) \{[\s\S]*?\n\}/)?.[0];
  assert.match(record, /results = withResult\(results, result\.key, result\.actorId, \{ degree: result\.degree, name: result\.name, at, via: "roll", messageId: result\.messageId \}\)/);
  assert.match(record, /await writeRunState\(briefId, \{ \.\.\.state, results \}\);/, "a second player's roll must be kept, even when the beat already has its result");
});

test("every player gets their own result on a check, one press per degree to set it by hand", () => {
  // 2026-10-05: the console's bank has a slot per player (a light, their way and number, four keys), for a beat everyone
  // rolls and for any other check. A result set by hand lands in the same per-character record a roll does
  // (core/runner-party.mjs#withResult), and keeps the beat open for the next one.
  const bank = gmHbs.match(/\{\{#each bank\}\}[\s\S]*?\{\{\/each\}\}\s*<\/ol>/)?.[0];
  assert.ok(bank, "the bank is missing from the console");
  assert.match(bank, /\{\{#each this\.degrees\}\}[\s\S]*?data-action="setResult"/);
  assert.match(consoleSrc, /setResult: CheckConsoleWindow\.#onSetResult,/);
  const hand = moduleFn("recordHandResult");
  assert.match(hand, /const results = withResult\(state\.results, beatId, actorId, degree \? \{ degree, name, at, via: "hand" \} : null\);/);
  assert.match(hand, /active\?\.markResolved\(beatId\);/, "the beat must stay open for the next player's result");
});

/* ---------------------------------------------------------------- */
/*  The fight, and its clock                                         */
/* ---------------------------------------------------------------- */

test("the fight card prints stat lines and sets the fight up in one press; the clock can rise by itself", () => {
  assert.match(beatHbs, /\{\{#if statline\}\}<span class="bi-runner__fight-stats">\{\{statline\}\}<\/span>\{\{\/if\}\}/);
  assert.match(beatHbs, /data-action="setUpFight" data-beat-id="\{\{id\}\}"/);
  assert.match(beatHbs, /data-action="toggleClockAuto" aria-pressed="\{\{encounter\.clockAuto\}\}"/);
  assert.match(fnBody("onSetUpFight"), /setUpFight\(encounter, \{ briefId, beatId: beat\.id, clockAuto \}\)/);
  assert.match(src, /setUpFight: SceneRunner\.#onSetUpFight/);
  assert.match(src, /toggleClockAuto: SceneRunner\.#onToggleClockAuto/);
});

test("a round ending raises the scene's clock, on the active GM's client only, and never when switched off", () => {
  const hook = src.match(/Hooks\.on\("updateCombat", \(combat, changed, options = \{\}\) => \{[\s\S]*?\n\}\);/)?.[0];
  assert.ok(hook, "the updateCombat hook is missing");
  assert.match(hook, /game\.users\?\.activeGM/, "two GMs would raise it twice");
  assert.match(hook, /roundEnded\(changed\.round, \{ direction: options\?\.direction \?\? 1 \}\)/);
  const advance = src.match(/async function advanceClockForRound\(briefId, round\) \{[\s\S]*?\n\}/)?.[0];
  assert.match(advance, /if \(state\.clockAuto === false\) return;/);
  assert.match(advance, /clockStepOnRound\(clock\)/);
  assert.match(advance, /subject: `clock::\$\{clock\.poolId\}`/, "logged like a nudge by hand");
});

/* ---------------------------------------------------------------- */
/*  Finding your place                                               */
/* ---------------------------------------------------------------- */

test("the beat being run is never lost: a back-to-now pill, and a teleprompter scroll when the marker moves", () => {
  assert.match(panel, /class="bi-runner__nowpill" data-now-pill data-action="jumpToNow" hidden/);
  assert.match(src, /jumpToNow: SceneRunner\.#onJumpToNow/);
  const watch = src.match(/#watchNow\(context\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.ok(watch, "#watchNow is missing");
  assert.match(watch, /new IntersectionObserver\(/);
  assert.match(watch, /nowEl\.scrollIntoView\(\{ block: "nearest", behavior: "smooth" \}\)/);
  assert.match(css, /\.bi-runner__nowpill \{[\s\S]*?position: sticky;/);
});

test("the goal is one line once the scene runs, and opens again with one press", () => {
  assert.match(src, /goalOpen: goalOpen\(phase, view\.bookends\.goal \?\? null\)/);
  assert.match(panel, /data-action="toggleBookend" data-section="goal"/);
  assert.match(fnBody("onToggleBookend"), /section !== "goal"/);
});

test("the header numbers the scene the way the running order does", () => {
  assert.match(src, /const at = scenePosition\(steps\);/);
});

/* ---------------------------------------------------------------- */
/*  Blind checks, compact checks, people's DCs, the table's facts    */
/* ---------------------------------------------------------------- */

test("a blind check says so on its pill and in the console", () => {
  assert.match(moduleFn("checkPill"), /blind: check\.secret === true,/);
  assert.match(pillSrc, /fa-eye-slash/, "the pill no longer marks a blind check");
  assert.match(gmHbs, /data-action="setBlind" data-value="1"/);
  assert.match(gmHbs, /\{\{#if session\.blind\}\}<span class="bi-check__blind-tag"/, "the GM's head says Blind while it is");
  assert.match(read("templates", "check-console", "player.hbs"), /\{\{#if blind\}\}<span class="bi-check__blind-tag"/);
  assert.match(checkCss, /\.bi-led\[data-state="rolled"\],\n\.bi-led-mini\[data-state="rolled"\] \{ --led: #8a3dff/, "a blind roll lights purple, never its degree");
});

test("a person's stopgap DCs sit beside their name", () => {
  assert.match(src, /stats: statDcs\(member\.brief\?\.statblock\)/);
  assert.match(personHbs, /\{\{#each stats\.dcs\}\}<span class="bi-runner__person-dc">\{\{label\}\} <b>\{\{dc\}\}<\/b><\/span>\{\{\/each\}\}/);
});

test("what the table has been told is one folded drawer, from the generated told-facts file", () => {
  assert.match(src, /const file = await loadJson\("campaign", "told-facts"\);/);
  assert.match(src, /told: await this\.#toldContext\(scenes, briefId\)/);
  assert.match(panel, /data-section="knows"\{\{#if sections\.knows\}\} open\{\{\/if\}\}/);
});

/* ---------------------------------------------------------------- */
/*  Closing the scene asks its own questions                         */
/* ---------------------------------------------------------------- */

test("the close dialogue asks the scene's write-down questions, in the column that scrolls, and logs each answer", () => {
  assert.match(fnBody("onCloseScene"), /writeDown: this\._scene\?\.brief\?\.outro\?\.writeDown \?\? \[\]/);
  assert.match(fnBody("onCueScene"), /writeDown: brief\?\.outro\?\.writeDown \?\? \[\]/);
  const recap = closeHbs.match(/<section class="bi-scene-close__recap">[\s\S]*?<\/section>/)?.[0];
  assert.ok(recap);
  assert.match(recap, /data-writedown-index="\{\{this\.index\}\}"/, "the questions must sit in the recap column, which is the one part allowed to scroll");
  const verdict = closeSrc.match(/static async #onVerdict\(event, target\) \{[\s\S]*?\n {2}\}/)?.[0];
  assert.match(verdict, /writeDownEntries\(this\.#context\.writeDown, answers, \{ briefRef: this\.#context\.briefRef \}\)/);
  assert.ok(verdict.indexOf("writeDownEntries") < verdict.indexOf("confirmSceneClosure"), "the answers are logged before the closure's own line");
});
