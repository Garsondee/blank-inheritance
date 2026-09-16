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
  setPath(state, "finishing.banalAnswers.unpacking", "Socks first.");
  assert.equal(getPath(state, "finishing.banalAnswers.unpacking"), "Socks first.");
});

// ---------------------------------------------------------------------------
// The real authored prompts file, run through the real code.
//
// Everything above is fixtures agreeing with themselves. This is what catches
// the schema and this content drifting apart -- and, separately, catches the
// Eight Questions' wording ever silently drifting from bible §20's canon.
// ---------------------------------------------------------------------------

const PROMPTS = JSON.parse(readFileSync(new URL("../data/campaign/induction-intake-prompts.json", import.meta.url), "utf8"));

// ideas/story/blank-inheritance-v4.md §20, copied here verbatim as the
// source of truth this test guards against ever silently drifting from.
const CANONICAL_EIGHT_QUESTIONS = [
  "Who do you love, and what would you never tell them?",
  "What are you good at that has nothing to do with piloting?",
  "What did you want to be, before the draft notice?",
  "Who in this city owes you something? Who do you owe?",
  "What is the smallest thing that would make today a good day?",
  "What do you not want the Directorate to know about you?",
  "Name someone who thinks you are better than you are.",
  "What do you find funny?"
];

test("the real prompts file has exactly 8 eightQuestions, numbered 1-8 in order, unique ids", () => {
  assert.equal(PROMPTS.eightQuestions.length, 8);
  assert.deepEqual(PROMPTS.eightQuestions.map((q) => q.number), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(PROMPTS.eightQuestions.map((q) => q.id)).size, 8);
});

test("every eightQuestions text string-matches bible §20's canonical wording exactly", () => {
  assert.deepEqual(PROMPTS.eightQuestions.map((q) => q.text), CANONICAL_EIGHT_QUESTIONS);
});

test("every question (banal and eight) has at least one suggestion chip", () => {
  for (const q of [...PROMPTS.banalQuestions, ...PROMPTS.eightQuestions]) {
    assert.ok(q.suggestions.length > 0, `${q.id} has no suggestion chips`);
  }
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
  const result = summarizeIntakeAnswers({ prompts: PROMPTS, questions: {}, banalAnswers: {} });
  assert.equal(result.hasContent, false);
  assert.equal(result.text, "");
});

test("summarizeIntakeAnswers: an unanswered question is skipped, not printed as '(no answer)'", () => {
  const oneAnswer = { [PROMPTS.eightQuestions[0].id]: "My sister." };
  const result = summarizeIntakeAnswers({ prompts: PROMPTS, questions: oneAnswer, banalAnswers: {} });
  assert.equal(result.hasContent, true);
  // Exactly one Q/A pair -- the other seven questions must not appear at all.
  assert.equal((result.text.match(/^Q:/gm) ?? []).length, 1);
  assert.match(result.text, new RegExp(PROMPTS.eightQuestions[0].text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("summarizeIntakeAnswers: whitespace-only answers count as unanswered", () => {
  const result = summarizeIntakeAnswers({ prompts: PROMPTS, questions: { [PROMPTS.eightQuestions[0].id]: "   " } });
  assert.equal(result.hasContent, false);
});

test("summarizeIntakeAnswers: the Eight Questions and the banal settling-in questions are separate, labelled sections", () => {
  const questions = { [PROMPTS.eightQuestions[0].id]: "An answer." };
  const banalAnswers = { [PROMPTS.banalQuestions[0].id]: "Socks first." };
  const result = summarizeIntakeAnswers({ prompts: PROMPTS, questions, banalAnswers });
  assert.match(result.text, /The Eight Questions/);
  assert.match(result.text, /Settling In/);
  assert.ok(result.text.indexOf("The Eight Questions") < result.text.indexOf("Settling In"));
});

test("summarizeIntakeAnswers: missing prompts/questions/banalAnswers entirely is safe", () => {
  assert.deepEqual(summarizeIntakeAnswers(), { text: "", hasContent: false });
  assert.deepEqual(summarizeIntakeAnswers({ prompts: PROMPTS }), { text: "", hasContent: false });
});
