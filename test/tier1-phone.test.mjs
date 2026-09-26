// Tier 1 — the personal comm device's pure logic (ideas/entries/phone-app-suite.json).
//
// Everything DOM-shaped lives in design/ui/phone.js and isn't unit tested
// the same way the rest of this project's UI chrome isn't — this file
// covers the handful of pieces that are genuinely logic: dice, the
// staggered-alert delay generator, the fortune picker, and the pet's tiny
// state machine.

import { test } from "node:test";
import assert from "node:assert/strict";

import * as phone from "../module/blank-inheritance/scripts/core/phone.mjs";
import {
  rollDice,
  staggeredAlertDelays,
  drawFortune,
  petMood,
  feedPet,
  playWithPet,
  decayPet,
  decayForElapsed,
  createSnake,
  spawnFood,
  turnSnake,
  stepSnake,
  formatLogEntriesForDisplay,
  logFilterOptions,
  filterLogEntries
} from "../module/blank-inheritance/scripts/core/phone.mjs";

test("the Resonance band lookup is gone: Resonance was cut on 2026-09-20, so the phone may not compute it", () => {
  for (const gone of ["RESONANCE_BANDS", "resonanceBand"]) {
    assert.equal(gone in phone, false, `core/phone.mjs still exports ${gone}`);
  }
});

test("rollDice produces the right count of rolls in range, and sums them plus the bonus", () => {
  let call = 0;
  const scripted = [0, 0.999999, 0.5];
  const random = () => scripted[call++];
  const r = rollDice(6, 3, 2, random);
  assert.deepEqual(r.rolls, [1, 6, 4]);
  assert.equal(r.total, 1 + 6 + 4 + 2);
  assert.equal(r.sides, 6);
  assert.equal(r.count, 3);
});

test("rollDice rejects nonsense die sizes and counts", () => {
  assert.throws(() => rollDice(1, 1), /bad die size/);
  assert.throws(() => rollDice(20, 0), /bad die count/);
});

test("staggeredAlertDelays returns one delay per recipient, sorted, never identical", () => {
  const delays = staggeredAlertDelays(6, { minMs: 0, maxMs: 100, random: () => 0.5 });
  assert.equal(delays.length, 6);
  for (let i = 1; i < delays.length; i++) {
    assert.ok(delays[i] > delays[i - 1], "two recipients must not appear to learn at the same instant");
  }
  // Every value should still be within (or, after de-dup nudging, only
  // slightly past) the requested window.
  assert.ok(delays[0] >= 0);
  assert.ok(delays.at(-1) <= 100 + delays.length, "de-dup nudging should only push values a few ms past the ceiling");
});

test("drawFortune honours weights and never returns metadata the UI would need to hide", () => {
  const pool = [
    { text: "A dull day.", weight: 9 },
    { text: "The thing you are looking for is closer than you think.", real: true, weight: 1 }
  ];
  assert.equal(drawFortune(pool, () => 0).text, "A dull day.");
  assert.equal(drawFortune(pool, () => 0.999).text, "The thing you are looking for is closer than you think.");
  assert.throws(() => drawFortune([]), /empty/);
});

test("pet mood is derived from the two meters, never stored separately", () => {
  assert.equal(petMood({ fed: 90, played: 90 }), "delighted");
  assert.equal(petMood({ fed: 50, played: 50 }), "content");
  assert.equal(petMood({ fed: 20, played: 20 }), "restless");
  assert.equal(petMood({ fed: 0, played: 0 }), "sulking");
});

test("feeding, playing and decay clamp to 0-100 and never mutate the input", () => {
  const start = Object.freeze({ fed: 90, played: 10 });
  const fed = feedPet(start, 30);
  assert.equal(fed.fed, 100, "feeding must clamp at 100, not overflow");
  assert.equal(start.fed, 90, "the original state must not be mutated");

  const played = playWithPet({ fed: 10, played: 5 }, 30);
  assert.equal(played.played, 35);
  assert.equal(played.fed, 10, "playing must not touch the fed meter");

  const decayed = decayPet({ fed: 3, played: 0 }, 10);
  assert.equal(decayed.fed, 0, "decay must clamp at 0, not go negative");
  assert.equal(decayed.played, 0);
});

test("decayForElapsed maps real elapsed time to a rounded meter drop, never touching the real clock itself", () => {
  const state = { fed: 80, played: 80 };
  const oneDay = 24 * 3_600_000;
  const decayed = decayForElapsed(state, oneDay, 0.5);
  assert.equal(decayed.fed, 68, "24h at 0.5/hour is 12 points");
  assert.equal(decayed.played, 68);

  assert.deepEqual(decayForElapsed(state, 0), state, "no elapsed time changes nothing");
  assert.deepEqual(decayForElapsed(state, -5000), state, "a clock that went backwards decays nothing rather than throwing");

  const tiny = decayForElapsed(state, 60_000, 0.5);
  assert.deepEqual(tiny, state, "a span that rounds to zero points changes nothing");
});

/* ==================================================================
   Snake — one of the terminal's apps (design/ui/phone.js paints it;
   this is all the logic it paints).
   ================================================================== */

test("createSnake starts a 3-long snake, alive, centred, with food placed off it", () => {
  const s = createSnake(10, 10, () => 0);
  assert.equal(s.snake.length, 3);
  assert.equal(s.alive, true);
  assert.equal(s.score, 0);
  assert.deepEqual(s.dir, { x: 1, y: 0 });
  assert.ok(s.food, "food must be placed");
  assert.ok(!s.snake.some((p) => p.x === s.food.x && p.y === s.food.y), "food must not spawn on the snake");
});

test("createSnake rejects a board too small to hold the starting snake sensibly", () => {
  assert.throws(() => createSnake(4, 4), /too small/);
});

test("spawnFood never lands on an occupied cell, and returns null on a full board", () => {
  let call = 0;
  const scripted = [0.99]; // pick the LAST free cell, to prove it's actually free
  const random = () => scripted[call++ % scripted.length];
  const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  const food = spawnFood(snake, 3, 1, random); // only 0 free cells other than... wait, 3x1 board fully occupied
  assert.equal(food, null, "a fully-occupied board must report null, not crash or overlap");

  const food2 = spawnFood(snake, 5, 1, random);
  assert.ok(food2);
  assert.ok(!snake.some((p) => p.x === food2.x && p.y === food2.y));
});

test("turnSnake ignores a direct reversal but accepts any other heading", () => {
  const s = createSnake(10, 10, () => 0); // dir {x:1,y:0}
  const reversed = turnSnake(s, { x: -1, y: 0 });
  assert.deepEqual(reversed.dir, { x: 1, y: 0 }, "turning straight back into your own neck must be ignored");
  const turned = turnSnake(s, { x: 0, y: 1 });
  assert.deepEqual(turned.dir, { x: 0, y: 1 }, "a perpendicular turn must be accepted");
});

test("stepSnake moves the head and drops the tail when no food is eaten", () => {
  const s = createSnake(10, 10, () => 0);
  const before = s.snake.map((p) => ({ ...p }));
  const after = stepSnake({ ...s, food: { x: -1, y: -1 } }); // food off-board: guaranteed no eat this tick
  assert.equal(after.snake.length, 3, "length must not change without eating");
  assert.deepEqual(after.snake[0], { x: before[0].x + 1, y: before[0].y });
  assert.equal(after.score, 0);
});

test("stepSnake grows the snake and increments score on eating food", () => {
  const s = createSnake(10, 10, () => 0);
  const head = s.snake[0];
  const foodAhead = { x: head.x + 1, y: head.y };
  const after = stepSnake({ ...s, food: foodAhead }, () => 0.5);
  assert.equal(after.snake.length, 4, "eating food must grow the snake by one segment");
  assert.equal(after.score, 1);
  assert.notDeepEqual(after.food, foodAhead, "a new food position must be drawn after eating");
});

test("stepSnake kills the snake on a wall collision", () => {
  const s = createSnake(10, 10, () => 0);
  const atRightWall = { ...s, snake: [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }], dir: { x: 1, y: 0 }, food: { x: -1, y: -1 } };
  const after = stepSnake(atRightWall);
  assert.equal(after.alive, false);
});

test("stepSnake kills the snake on self-collision, but not on vacating its own tail cell", () => {
  // A snake curled so the next move would hit its own body (not the tail
  // it is about to vacate) must die. Traces head(5,5) -> (6,5) -> (6,6) ->
  // (5,6) -> tail(5,7); moving down from the head lands on (5,6), the
  // THIRD segment, not the tail that is about to move away.
  const curled = {
    width: 10, height: 10, dir: { x: 0, y: 1 }, alive: true, score: 0, food: { x: -1, y: -1 },
    snake: [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 5, y: 6 }, { x: 5, y: 7 }]
  };
  const after = stepSnake(curled);
  assert.equal(after.alive, false, "moving onto an occupied body segment must be fatal");

  // A straight-line snake moving forward must NOT die by "hitting" the
  // cell its own tail is currently sitting in, since the tail moves away
  // on the same tick.
  const straight = { width: 10, height: 10, dir: { x: 1, y: 0 }, alive: true, score: 0, food: { x: -1, y: -1 }, snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }] };
  const stillAlive = stepSnake(straight);
  assert.equal(stillAlive.alive, true, "moving forward must not be treated as colliding with the tail it just vacated");
});

test("stepSnake on a dead snake is a no-op", () => {
  const dead = { width: 10, height: 10, dir: { x: 1, y: 0 }, alive: false, score: 3, food: null, snake: [{ x: 1, y: 1 }] };
  const after = stepSnake(dead);
  assert.deepEqual(after, dead);
});

test("formatLogEntriesForDisplay: newest first, HH:MM pulled out of the ISO timestamp", () => {
  const entries = [
    { at: "2026-09-16T18:05:00.000Z", tag: null, text: "first", context: {} },
    { at: "2026-09-16T18:42:07.000Z", tag: "npc", text: "second", context: {} }
  ];
  const rows = formatLogEntriesForDisplay(entries);
  assert.deepEqual(rows.map((r) => r.text), ["second", "first"], "must reverse to newest-first");
  assert.equal(rows[0].time, "18:42");
  assert.equal(rows[1].time, "18:05");
  assert.equal(rows[0].tag, "npc", "original fields must survive alongside the new `time` field");
});

test("formatLogEntriesForDisplay: does not mutate the input array, empty input is safe", () => {
  const entries = [{ at: "2026-09-16T09:00:00.000Z", tag: null, text: "x", context: {} }];
  const copy = JSON.parse(JSON.stringify(entries));
  formatLogEntriesForDisplay(entries);
  assert.deepEqual(entries, copy);
  assert.deepEqual(formatLogEntriesForDisplay([]), []);
});

test("formatLogEntriesForDisplay: a missing/malformed `at` yields an empty time rather than throwing", () => {
  const rows = formatLogEntriesForDisplay([{ at: null, tag: null, text: "x", context: {} }]);
  assert.equal(rows[0].time, "");
});

/* ------------------------------------------------------------------ *
 * logFilterOptions / filterLogEntries — the Log drawer's own filtering
 * (design/ux-doctrine.md §10.7: "the review surface," found genuinely
 * unbuilt 2026-09-19). Options are DERIVED from what the log actually
 * contains, never a fixed list, so a session recorded entirely in untagged
 * sentences still offers real scene filters.
 * ------------------------------------------------------------------ */

const LOG_ENTRIES = [
  { at: "2026-09-16T09:00:00.000Z", tag: null, text: "arrived", context: { scene: "01. The Road In" } },
  { at: "2026-09-16T09:10:00.000Z", tag: "npc", text: "met the clerk", context: { scene: "02. Intake Medicals" } },
  { at: "2026-09-16T09:20:00.000Z", tag: "decision", text: "chose the truth", context: { scene: "02. Intake Medicals" } },
  { at: "2026-09-16T09:30:00.000Z", tag: "npc", text: "no scene at all", context: {} }
];

test("logFilterOptions: distinct tags and scenes only, sorted, blanks dropped", () => {
  const { types, scenes } = logFilterOptions(LOG_ENTRIES);
  assert.deepEqual(types, ["decision", "npc"], "must be de-duplicated and sorted, and never include a null tag as a fake type");
  assert.deepEqual(scenes, ["01. The Road In", "02. Intake Medicals"], "must be de-duplicated and sorted, and never include a missing scene as a fake option");
});

test("logFilterOptions: an empty log offers no filters at all rather than throwing", () => {
  assert.deepEqual(logFilterOptions([]), { types: [], scenes: [] });
});

test("filterLogEntries: no filter on either axis returns everything, untouched", () => {
  assert.equal(filterLogEntries(LOG_ENTRIES, {}).length, 4);
  assert.equal(filterLogEntries(LOG_ENTRIES).length, 4, "the options argument itself must be optional");
});

test("filterLogEntries: filters by type alone", () => {
  const rows = filterLogEntries(LOG_ENTRIES, { type: "npc" });
  assert.deepEqual(rows.map((r) => r.text), ["met the clerk", "no scene at all"]);
});

test("filterLogEntries: filters by scene alone", () => {
  const rows = filterLogEntries(LOG_ENTRIES, { scene: "02. Intake Medicals" });
  assert.deepEqual(rows.map((r) => r.text), ["met the clerk", "chose the truth"]);
});

test("filterLogEntries: both filters combine (AND, not OR)", () => {
  const rows = filterLogEntries(LOG_ENTRIES, { type: "npc", scene: "02. Intake Medicals" });
  assert.deepEqual(rows.map((r) => r.text), ["met the clerk"]);
});

test("filterLogEntries: a scene filter never matches an entry with no scene context at all", () => {
  assert.equal(filterLogEntries(LOG_ENTRIES, { scene: "" }).length, 4);
  assert.equal(filterLogEntries([{ tag: null, text: "x", context: {} }], { scene: "01. The Road In" }).length, 0);
});
