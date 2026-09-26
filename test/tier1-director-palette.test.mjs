// Tier 1 — the Director's Palette's own logic (scripts/core/director-palette.mjs):
// what a query matches, in what order, and how the keyboard moves through it.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  COMMAND_GROUPS,
  IMPROVISED_OUTCOMES,
  PALETTE_CONDITIONS,
  matchCommands,
  moveSelection,
  paletteModel,
  parseQuickIntent,
  rememberCommand,
  scoreCommand
} from "../module/blank-inheritance/scripts/core/director-palette.mjs";

const cmd = (id, title, extra = {}) => ({ id, title, group: "scene", ...extra });

test("off-script sorts FIRST, because that is when a GM actually reaches for this", () => {
  // Not cosmetic: a palette that opens on "Cut to scene" is optimised for the
  // prepared case, which is the case nobody needs help with.
  //
  // 2026-09-23: "quick" (commands built from typed text) now precedes it in
  // the array, but it only ever exists once something has been typed — so in
  // the EMPTY box, which is what this test is about, off-script is still the
  // first thing the GM sees.
  const shownFirst = COMMAND_GROUPS.filter((g) => g.id !== "quick")[0];
  assert.equal(shownFirst.id, "off-script");
  const pinned = { id: "quick.x", title: "Ask for Athletics, DC 18", group: "quick", pinned: true };
  const offScript = { id: "off.x", title: "Note what just happened", group: "off-script" };
  assert.deepEqual(matchCommands("", [pinned, offScript]).map((c) => c.id), ["off.x"], "a typed-intent row can never appear in an empty box");
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

/* ---------------------------------------------------------------- */
/*  2026-09-23: typed instructions, the Selected group, inert rows   */
/* ---------------------------------------------------------------- */

const SKILLS = [
  { slug: "perception", label: "Perception" },
  { slug: "athletics", label: "Athletics" },
  { slug: "acrobatics", label: "Acrobatics" },
  { slug: "stealth", label: "Stealth" },
  { slug: "fortitude", label: "Fortitude" }
];

test("typing a check and a number offers to ask for exactly that, with the DC", () => {
  for (const q of ["athletics 18", "athletics dc 18", "dc 18 athletics", "ATH 18"]) {
    const [intent] = parseQuickIntent(q, { skills: SKILLS });
    assert.equal(intent?.kind, "ask", `"${q}" should ask`);
    assert.equal(intent.slug, "athletics");
    assert.equal(intent.dc, 18);
    assert.equal(intent.title, "Ask for Athletics, DC 18");
  }
  const ambiguous = parseQuickIntent("a 15", { skills: SKILLS });
  assert.deepEqual(ambiguous.map((i) => i.slug), ["athletics", "acrobatics"], "an ambiguous prefix offers every match rather than guessing");
  assert.deepEqual(parseQuickIntent("xyz 15", { skills: SKILLS }), [], "an unknown skill offers nothing");
  assert.deepEqual(parseQuickIntent("athletics", { skills: SKILLS }), [], "no number, no intent — the ordinary search handles it");
});

test("damage and heal parse a number or a formula, and are inert with nothing selected", () => {
  const [dmg] = parseQuickIntent("dmg 2d6+3", { hasSelection: true });
  assert.equal(dmg.kind, "damage");
  assert.equal(dmg.formula, "2d6+3");
  assert.equal(dmg.disabled, false);
  const [heal] = parseQuickIntent("heal 5");
  assert.equal(heal.kind, "heal");
  assert.equal(heal.disabled, true, "with nothing selected the row shows what it would do, and cannot run");
  assert.match(heal.hint, /select a token/);
});

test("flat checks, open and secret rolls, and a straight log line", () => {
  assert.deepEqual(parseQuickIntent("flat 5").map((i) => [i.kind, i.dc]), [["flat", 5]]);
  const [open] = parseQuickIntent("r 1d20+4");
  assert.deepEqual([open.kind, open.formula, open.secret], ["roll", "1d20+4", false]);
  const [secret] = parseQuickIntent("gmr 1d100");
  assert.deepEqual([secret.kind, secret.secret], ["roll", true]);
  const [note] = parseQuickIntent("note they bribed the guard with 40 credits");
  assert.equal(note.kind, "note");
  assert.equal(note.text, "they bribed the guard with 40 credits", "numbers inside a note never turn it into a check");
});

test("a typed intent is pinned above every fuzzy match, and only exists for a non-empty box", () => {
  const intents = parseQuickIntent("athletics 18", { skills: SKILLS });
  assert.ok(intents.every((i) => i.pinned && i.group === "quick"));
  const other = { id: "check.athletics", title: "Ask for: Athletics", group: "check" };
  const ranked = matchCommands("athletics 18", [other, ...intents]);
  assert.equal(ranked[0].id, "quick.ask.athletics", "what was typed is the first row, one Enter away");
  assert.deepEqual(parseQuickIntent("", { skills: SKILLS }), []);
  assert.deepEqual(parseQuickIntent("   ", { skills: SKILLS }), []);
});

test("search-only families (a secret roll per skill, a condition per slug) never flood the opening menu", () => {
  const commands = [
    cmd("off", "Note what just happened", { group: "off-script" }),
    cmd("sel.cond", "Frightened +1: Goon", { group: "selected", searchOnly: true }),
    cmd("sel.dmg", "Damage Goon…", { group: "selected" })
  ];
  assert.deepEqual(matchCommands("", commands).map((c) => c.id), ["off", "sel.dmg"]);
  assert.deepEqual(matchCommands("fright", commands).map((c) => c.id), ["sel.cond"], "but typing finds them");
});

test("an inert row carries its disabled flag into the rendered model", () => {
  const [heal] = parseQuickIntent("heal 5");
  const model = paletteModel("heal 5", [heal]);
  const row = model.rows.find((r) => !r.isHeading);
  assert.equal(row.disabled, true);
});

test("the condition list uses sf2e's own slugs, each once, and knows which ones step", () => {
  const slugs = PALETTE_CONDITIONS.map((c) => c.slug);
  assert.equal(new Set(slugs).size, slugs.length, "no condition listed twice");
  for (const slug of ["off-guard", "frightened", "prone", "stunned", "dying", "wounded"]) assert.ok(slugs.includes(slug), `${slug} is missing`);
  const valued = new Set(PALETTE_CONDITIONS.filter((c) => c.valued).map((c) => c.slug));
  for (const slug of ["frightened", "sickened", "stunned", "slowed", "clumsy", "drained", "dying", "wounded", "doomed"]) assert.ok(valued.has(slug), `${slug} has a value in sf2e`);
  for (const slug of ["off-guard", "prone", "grabbed", "blinded"]) assert.ok(!valued.has(slug), `${slug} toggles; it has no value`);
});

test("a sign in front of a number is meaning, not punctuation (regression: typing 'frightened −1' ran +1)", () => {
  const up = cmd("up", "Frightened +1: Goon", { group: "selected" });
  const down = cmd("down", "Frightened −1: Goon", { group: "selected" });
  for (const q of ["frightened −1", "frightened -1", "frightened – 1"]) {
    assert.equal(matchCommands(q, [up, down])[0].id, "down", `"${q}" must pick the decrease`);
  }
  assert.equal(matchCommands("frightened +1", [up, down])[0].id, "up");
  assert.ok(scoreCommand("off-guard", cmd("og", "Apply Off-Guard: Goon")) > 0, "a hyphen inside a word is still just punctuation");
});
