// Tier 1 — the induction terminal's Pages 7-8 suggestion-chip + free-text
// pattern, and the language tag list.
//
// Pure logic only: merging a suggestion into a field's current text,
// Page 7's completeness gate, and the language add/remove/suggestion
// helpers. No Foundry.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  insertSuggestion,
  isFinishingComplete,
  addLanguage,
  removeLanguage,
  buildLanguageSuggestions,
  summarizeIntakeAnswers,
  getPath,
  setPath
} from "../module/blank-inheritance/scripts/core/induction-intake.mjs";

test("insertSuggestion: an empty field is set directly, no separator", () => {
  assert.equal(insertSuggestion("", "My little sister."), "My little sister.");
  assert.equal(insertSuggestion(null, "My little sister."), "My little sister.");
  assert.equal(insertSuggestion(undefined, "My little sister."), "My little sister.");
});

test("insertSuggestion: a whitespace-only field counts as empty", () => {
  assert.equal(insertSuggestion("   ", "A photograph, first."), "A photograph, first.");
});

test("insertSuggestion: a non-empty field gets the suggestion APPENDED, not overwritten", () => {
  assert.equal(
    insertSuggestion("My little sister.", "That I'm scared too."),
    "My little sister., That I'm scared too."
  );
});

test("insertSuggestion: a custom separator is honoured (the textarea variant uses a blank-line separator)", () => {
  assert.equal(insertSuggestion("First line.", "Second line.", "\n\n"), "First line.\n\nSecond line.");
});

test("isFinishingComplete: false with no name, or a whitespace-only name", () => {
  assert.equal(isFinishingComplete({ name: "" }), false);
  assert.equal(isFinishingComplete({ name: "   " }), false);
  assert.equal(isFinishingComplete({}), false);
  assert.equal(isFinishingComplete(undefined), false);
});

test("isFinishingComplete: true once a real name is present, regardless of every other field", () => {
  assert.equal(isFinishingComplete({ name: "Ren" }), true);
  assert.equal(isFinishingComplete({ name: "Ren", pronouns: "", genderIdentity: "", appearance: "" }), true);
});

test("addLanguage: adds a new, non-blank language", () => {
  assert.deepEqual(addLanguage(["Common"], "Akitonian"), ["Common", "Akitonian"]);
});

test("addLanguage: refuses a blank/whitespace-only entry, returning the SAME array", () => {
  const languages = ["Common"];
  assert.equal(addLanguage(languages, ""), languages);
  assert.equal(addLanguage(languages, "   "), languages);
});

test("addLanguage: refuses a case-insensitive duplicate, returning the SAME array", () => {
  const languages = ["Common"];
  assert.equal(addLanguage(languages, "common"), languages);
  assert.equal(addLanguage(languages, "COMMON"), languages);
});

test("addLanguage: never mutates the original array", () => {
  const languages = ["Common"];
  const next = addLanguage(languages, "Vesk");
  assert.deepEqual(languages, ["Common"], "the original array must be untouched");
  assert.deepEqual(next, ["Common", "Vesk"]);
});

test("removeLanguage: removes a case-insensitive match", () => {
  assert.deepEqual(removeLanguage(["Common", "Vesk"], "vesk"), ["Common"]);
});

test("removeLanguage: a no-op (same contents) when the entry isn't present", () => {
  assert.deepEqual(removeLanguage(["Common"], "Akitonian"), ["Common"]);
});

test("buildLanguageSuggestions: merges ancestry languages and the curated list, ancestry languages first", () => {
  const suggestions = buildLanguageSuggestions(["Vesk"], ["Common", "Vesk"], []);
  assert.deepEqual(suggestions.map((s) => s.label), ["Vesk", "Common"], "Vesk (ancestry) must surface before Common (curated), and not be duplicated");
});

test("buildLanguageSuggestions: dedupes case-insensitively between ancestry and curated lists", () => {
  const suggestions = buildLanguageSuggestions(["common"], ["Common"], []);
  assert.equal(suggestions.length, 1);
});

test("buildLanguageSuggestions: flags alreadyAdded against the character's current picks, case-insensitively", () => {
  const suggestions = buildLanguageSuggestions([], ["Common", "Vesk"], ["common"]);
  assert.deepEqual(
    suggestions.map((s) => [s.label, s.alreadyAdded]),
    [["Common", true], ["Vesk", false]]
  );
});

test("buildLanguageSuggestions: a blank ancestry-language entry is skipped, not surfaced as a chip", () => {
  const suggestions = buildLanguageSuggestions(["", null], ["Common"], []);
  assert.deepEqual(suggestions.map((s) => s.label), ["Common"]);
});

test("getPath: reads a nested value by dotted path", () => {
  assert.equal(getPath({ finishing: { pronouns: "They/them" } }, "finishing.pronouns"), "They/them");
});

test("getPath: a missing path reads as an empty string, never undefined", () => {
  assert.equal(getPath({ finishing: {} }, "finishing.pronouns"), "");
  assert.equal(getPath({}, "finishing.pronouns"), "");
  assert.equal(getPath({ intake: { questions: {} } }, "intake.questions.q1"), "");
});

test("setPath: writes a nested value, creating intermediate objects as needed", () => {
  const state = { finishing: {} };
  setPath(state, "finishing.pronouns", "They/them");
  assert.equal(state.finishing.pronouns, "They/them");
});

test("setPath: creates a missing intermediate object rather than throwing", () => {
  const state = {};
  setPath(state, "intake.questions.q1", "An answer.");
  assert.deepEqual(state, { intake: { questions: { q1: "An answer." } } });
});

test("setPath then getPath round-trips", () => {
  const state = {};
  setPath(state, "finishing.personality.likes", "Hot water.");
  assert.equal(getPath(state, "finishing.personality.likes"), "Hot water.");
});

// ---------------------------------------------------------------------------
// The real authored prompts file, run through the real code.
//
// Everything above is fixtures agreeing with themselves. This is what catches
// the schema and this content drifting apart -- and, separately, holds the
// 2026-09-18 compression in place: the whole point of that pass was that the
// open-question count came DOWN and stays down (design/induction-intake-audit.md
// §6), which is a thing a content edit can silently undo.
// ---------------------------------------------------------------------------

const PROMPTS = JSON.parse(readFileSync(new URL("../data/campaign/induction-intake-prompts.json", import.meta.url), "utf8"));

const ALL_PROMPTS = [
  ...PROMPTS.personalFile,
  ...PROMPTS.personality,
  ...PROMPTS.openQuestions,
  PROMPTS.freeform
];

test("the open questions stay capped: at most five, which is the point of the 2026-09-18 compression", () => {
  assert.ok(
    PROMPTS.openQuestions.length <= 5,
    `open questions have crept back up to ${PROMPTS.openQuestions.length} -- see design/induction-intake-audit.md §6 before raising this`
  );
});

test("open questions are numbered 1..n in order, with unique ids", () => {
  assert.deepEqual(
    PROMPTS.openQuestions.map((q) => q.number),
    PROMPTS.openQuestions.map((_, i) => i + 1)
  );
  assert.equal(new Set(PROMPTS.openQuestions.map((q) => q.id)).size, PROMPTS.openQuestions.length);
});

test("prompt ids are unique across every group, since they key both DOM ids and state paths", () => {
  const ids = ALL_PROMPTS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate prompt id: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`);
});

test("every prompt except the freeform box has at least one suggestion chip", () => {
  for (const q of [...PROMPTS.personalFile, ...PROMPTS.personality, ...PROMPTS.openQuestions]) {
    assert.ok(q.suggestions.length > 0, `${q.id} has no suggestion chips`);
  }
  assert.deepEqual(PROMPTS.freeform.suggestions, [], "the catch-all box is deliberately the player's alone -- no chips");
});

test("exactly one prompt is addressed to the player rather than the character", () => {
  const ooc = ALL_PROMPTS.filter((q) => q.outOfCharacter === true);
  assert.equal(ooc.length, 1);
  assert.equal(ooc[0].id, "player-goal");
});

test("the survivors of the compression are still present, as one-liners rather than open questions", () => {
  // design/induction-intake-audit.md §6c: bible §20's Q5 (the smallest good
  // day) and Q2 (competence outside piloting) were DEMOTED, never cut. A
  // future content edit that quietly drops them should fail here.
  const personalityIds = PROMPTS.personality.map((q) => q.id);
  assert.ok(personalityIds.includes("likes"), "old Q5 (the smallest good day) must survive as `likes`");
  assert.ok(personalityIds.includes("good-at"), "old Q2 (good at, not piloting) must survive as `good-at`");
});

test("both halves of the relationship question survive as separate sheet destinations", () => {
  // Ingram, 2026-09-18: combined into one open section, but Allies AND
  // Enemies both stay real fields on the sheet.
  const paths = PROMPTS.openQuestions.map((q) => q.bioPath);
  assert.ok(paths.includes("system.details.biography.allies"));
  assert.ok(paths.includes("system.details.biography.enemies"));
});

test("genderIdentityOptions, pronounOptions and appearanceOptions are all non-empty, and contain no blank/duplicate entries", () => {
  for (const list of [PROMPTS.genderIdentityOptions, PROMPTS.pronounOptions, PROMPTS.appearanceOptions]) {
    assert.ok(list.length > 0);
    assert.ok(list.every((entry) => entry.trim().length > 0));
    assert.equal(new Set(list.map((e) => e.toLowerCase())).size, list.length, "no case-insensitive duplicates");
  }
});

test("data/schema/induction-intake-prompts.schema.json parses as valid JSON and matches the file it describes", () => {
  const schema = JSON.parse(readFileSync(new URL("../data/schema/induction-intake-prompts.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.$id, "induction-intake-prompts.schema.json");
  for (const required of schema.required) {
    assert.ok(required in PROMPTS, `prompts file is missing required field "${required}"`);
  }
});

test("summarizeIntakeAnswers: no answers at all is honestly empty, not a fabricated section", () => {
  const result = summarizeIntakeAnswers({ prompts: PROMPTS, questions: {} });
  assert.equal(result.hasContent, false);
  assert.equal(result.text, "");
});

test("summarizeIntakeAnswers: an unanswered question is skipped, not printed as '(no answer)'", () => {
  const oneAnswer = { [PROMPTS.openQuestions[0].id]: "My sister." };
  const result = summarizeIntakeAnswers({ prompts: PROMPTS, questions: oneAnswer });
  assert.equal(result.hasContent, true);
  // Exactly one Q/A pair -- every other question must not appear at all.
  assert.equal((result.text.match(/^Q:/gm) ?? []).length, 1);
  assert.match(result.text, new RegExp(PROMPTS.openQuestions[0].text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("summarizeIntakeAnswers: whitespace-only answers count as unanswered", () => {
  const result = summarizeIntakeAnswers({ prompts: PROMPTS, questions: { [PROMPTS.openQuestions[0].id]: "   " } });
  assert.equal(result.hasContent, false);
});

test("summarizeIntakeAnswers: each group is its own labelled section, open questions first for the GM", () => {
  const result = summarizeIntakeAnswers({
    prompts: PROMPTS,
    questions: { [PROMPTS.openQuestions[0].id]: "An answer." },
    freeform: "A paragraph about my character.",
    personality: { [PROMPTS.personality[0].id]: "Hot water." },
    personalFile: { [PROMPTS.personalFile[0].id]: "24" }
  });
  assert.match(result.text, /In Their Own Words/);
  assert.match(result.text, /Anything Else/);
  assert.match(result.text, /Personality/);
  assert.match(result.text, /Personal File/);
  assert.ok(result.text.indexOf("In Their Own Words") < result.text.indexOf("Personality"));
  assert.ok(result.text.indexOf("Anything Else") < result.text.indexOf("Personal File"));
});

test("summarizeIntakeAnswers: the freeform box alone is enough to count as content", () => {
  const result = summarizeIntakeAnswers({ prompts: PROMPTS, freeform: "Everything I want to say." });
  assert.equal(result.hasContent, true);
  assert.match(result.text, /Everything I want to say\./);
});

test("summarizeIntakeAnswers: missing prompts/answers entirely is safe", () => {
  assert.deepEqual(summarizeIntakeAnswers(), { text: "", hasContent: false });
  assert.deepEqual(summarizeIntakeAnswers({ prompts: PROMPTS }), { text: "", hasContent: false });
});
