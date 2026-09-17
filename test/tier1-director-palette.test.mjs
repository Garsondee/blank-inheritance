// Tier 1 — the Director's Palette's own logic (scripts/core/director-palette.mjs):
// what a query matches, in what order, and how the keyboard moves through it.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COMMAND_GROUPS,
  IMPROVISED_OUTCOMES,
  matchCommands,
  moveSelection,
  paletteModel,
  rememberCommand,
  scoreCommand
} from "../module/blank-inheritance/scripts/core/director-palette.mjs";

const cmd = (id, title, extra = {}) => ({ id, title, group: "scene", ...extra });

test("off-script sorts FIRST, because that is when a GM actually reaches for this", () => {
  // Not cosmetic: a palette that opens on "Cut to scene" is optimised for the
  // prepared case, which is the case nobody needs help with.
  assert.equal(COMMAND_GROUPS[0].id, "off-script");
});

test("scoring prefers a title's start, then a word's start, then anywhere, then loose letters", () => {
  const canteen = cmd("a", "Cut to: Canteen");
  const cast = cmd("b", "Cast a spell");
  assert.ok(scoreCommand("cut", canteen) > scoreCommand("can", canteen), "a whole-title prefix beats a word-start");
  assert.ok(scoreCommand("cast", cast) > scoreCommand("can", canteen), "'cast' starts its title; 'can' only starts a word");
  assert.ok(scoreCommand("teen", canteen) > 0, "a substring still matches");
  assert.ok(scoreCommand("ctcn", canteen) > 0, "letters in order still match");
  assert.equal(scoreCommand("zzzz", canteen), 0, "nonsense matches nothing");
  assert.equal(scoreCommand("", canteen), 1, "an empty query matches everything");
});

test("a shorter title wins a tie", () => {
  const short = cmd("a", "Pause");
  const long = cmd("b", "Pause the game and tell everyone about it");
  assert.ok(scoreCommand("pause", short) > scoreCommand("pause", long));
});

test("keywords and hints match, so a GM can search for what a thing DOES", () => {
  const stop = cmd("audio.stop", "Stop everything", { keywords: ["silence", "quiet"], hint: "music and ambience" });
  assert.ok(scoreCommand("silence", stop) > 0, "searching the effect finds the command");
  assert.ok(scoreCommand("ambience", stop) > 0, "the hint is searchable too");
  assert.ok(scoreCommand("stop", stop) > scoreCommand("silence", stop), "but the title still outranks a keyword");
});

test("an empty box is a short starting menu in group order, not a dump of everything", () => {
  const commands = [
    cmd("s", "Cut to: Canteen", { group: "scene" }),
    cmd("o", "Note what just happened", { group: "off-script" }),
    cmd("a", "Stop everything", { group: "audio" })
  ];
  const ids = matchCommands("", commands).map((c) => c.id);
  assert.deepEqual(ids, ["o", "s", "a"], "off-script, then scenes, then audio");
});

test("recents come first on an empty box and break ties on a real query", () => {
  const commands = [
    cmd("s", "Cut to: Canteen", { group: "scene" }),
    cmd("o", "Note what just happened", { group: "off-script" })
  ];
  assert.deepEqual(matchCommands("", commands, { recents: ["s"] }).map((c) => c.id), ["s", "o"]);

  const tied = [cmd("x", "Cut to: Canteen"), cmd("y", "Cut to: Canteens")];
  const withRecent = matchCommands("cut to: canteen", tied, { recents: ["y"] }).map((c) => c.id);
  assert.equal(withRecent[0], "x", "the exact-length match still wins on score");
});

test("hidden commands never appear", () => {
  const commands = [cmd("a", "End combat", { hidden: true }), cmd("b", "Pause")];
  assert.deepEqual(matchCommands("", commands).map((c) => c.id), ["b"]);
  assert.deepEqual(matchCommands("combat", commands).map((c) => c.id), []);
});

test("the model inserts a heading per group and marks exactly one row selected", () => {
  const commands = [
    cmd("o", "Note what just happened", { group: "off-script" }),
    cmd("s1", "Cut to: Canteen", { group: "scene" }),
    cmd("s2", "Cut to: The Errand", { group: "scene" })
  ];
  const model = paletteModel("", commands, { selected: 2 });
  const headings = model.rows.filter((r) => r.isHeading).map((r) => r.label);
  assert.deepEqual(headings, ["Off script", "Scenes"], "one heading per group, in order, not one per row");
  const selected = model.rows.filter((r) => !r.isHeading && r.isSelected);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].id, "s2");
});

test("a selection past the end clamps rather than pointing at nothing", () => {
  const commands = [cmd("a", "Pause")];
  assert.equal(paletteModel("", commands, { selected: 99 }).selected, 0);
  assert.equal(paletteModel("", commands, { selected: -5 }).selected, 0);
  const none = paletteModel("zzzz", commands);
  assert.equal(none.empty, true);
  assert.equal(none.selected, 0, "an empty result must not leave a dangling index");
});

test("arrow keys wrap at both ends", () => {
  assert.equal(moveSelection(0, 1, 3), 1);
  assert.equal(moveSelection(2, 1, 3), 0, "past the bottom wraps to the top");
  assert.equal(moveSelection(0, -1, 3), 2, "above the top wraps to the bottom");
  assert.equal(moveSelection(0, 1, 0), 0, "an empty list cannot divide by zero");
});

test("recents are most-recent-first, de-duplicated and capped", () => {
  let r = [];
  r = rememberCommand(r, "a");
  r = rememberCommand(r, "b");
  r = rememberCommand(r, "a");
  assert.deepEqual(r, ["a", "b"], "using a command again moves it up rather than adding a second copy");
  for (const id of ["c", "d", "e", "f", "g", "h", "i", "j"]) r = rememberCommand(r, id);
  assert.equal(r.length, 8);
  assert.equal(r[0], "j");
});

test("there is a generic outcome list for scenes nobody wrote", () => {
  // design/ux-doctrine.md §10.3a: improvisation is a first-class mode, and a
  // close dialogue that only works for prepared material is worse than none.
  assert.ok(IMPROVISED_OUTCOMES.length >= 4 && IMPROVISED_OUTCOMES.length <= 6, "four to six is a decision; twenty is a form");
  assert.ok(IMPROVISED_OUTCOMES.some((o) => /walked away/i.test(o)), "refusing outright has to be a listed outcome, not an error");
});
