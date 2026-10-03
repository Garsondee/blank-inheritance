// Tier 1 — mapping the induction terminal's answers onto sf2e's real
// character-sheet biography fields (core/induction-bio.mjs).
//
// Pure logic only, no Foundry. The companion contract test in
// tier3-contract.test.mjs checks that every path produced here actually
// exists on sf2e's real character template; this file checks that the VALUES
// are right.
//
// Why this module is worth its own suite: before 2026-09-18 the terminal
// collected pronouns, gender identity, appearance and languages and wrote
// none of them to the Actor (design/induction-intake-audit.md §6b). "We
// gathered it and dropped it" is exactly the kind of silent failure a test
// has to hold shut.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  escapeHtml,
  textToHtml,
  toLanguageSlug,
  partitionLanguages,
  combineGenderField,
  sharedBioPaths,
  buildBioUpdate,
  DIRECTORATE_ORGANIZATION,
  HTML_BIO_PATHS
} from "../module/blank-inheritance/scripts/core/induction-bio.mjs";

const PROMPTS = JSON.parse(readFileSync(new URL("../data/campaign/induction-intake-prompts.json", import.meta.url), "utf8"));

test("escapeHtml: player-typed angle brackets and ampersands can never become markup", () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'), "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  assert.equal(escapeHtml("Bell & Sons"), "Bell &amp; Sons");
  assert.equal(escapeHtml("it's"), "it&#39;s");
});

test("textToHtml: a blank line starts a new paragraph, a single newline is a line break", () => {
  assert.equal(textToHtml("One.\n\nTwo."), "<p>One.</p><p>Two.</p>");
  assert.equal(textToHtml("Ana\nBen"), "<p>Ana<br>Ben</p>");
});

test("textToHtml: empty/whitespace-only input produces nothing at all, never an empty paragraph", () => {
  assert.equal(textToHtml(""), "");
  assert.equal(textToHtml("   \n  "), "");
  assert.equal(textToHtml(null), "");
});

test("textToHtml: escapes before wrapping, so markup in an answer stays visible text", () => {
  assert.equal(textToHtml("a < b"), "<p>a &lt; b</p>");
});

test("toLanguageSlug: reverses Page 7's display title-casing back to sf2e's own slug", () => {
  assert.equal(toLanguageSlug("Common"), "common");
  assert.equal(toLanguageSlug("Sarcesian Signed"), "sarcesian-signed");
  assert.equal(toLanguageSlug("  Vesk  "), "vesk");
});

test("partitionLanguages: known slugs go to the real field, anything hand-typed goes to the free-text companion", () => {
  const { slugs, unknown } = partitionLanguages(["Common", "Whale Song"], ["common", "vesk"]);
  assert.deepEqual(slugs, ["common"]);
  assert.deepEqual(unknown, ["Whale Song"]);
});

test("partitionLanguages: an empty known-slug set means 'cannot tell' and keeps every pick rather than discarding them", () => {
  const { slugs, unknown } = partitionLanguages(["Common", "Whale Song"], []);
  assert.deepEqual(slugs, ["common", "whale-song"]);
  assert.deepEqual(unknown, []);
});

test("partitionLanguages: dedupes, and skips blanks", () => {
  const { slugs } = partitionLanguages(["Common", "common", "", null], ["common"]);
  assert.deepEqual(slugs, ["common"]);
});

test("combineGenderField: sf2e has one Gender/Pronouns field, so the two are combined rather than one overwriting the other", () => {
  assert.equal(combineGenderField("Nonbinary", "They/them"), "Nonbinary (They/them)");
});

test("combineGenderField: whichever one was given alone stands by itself, with no stray parentheses", () => {
  assert.equal(combineGenderField("", "She/her"), "She/her");
  assert.equal(combineGenderField("Man", ""), "Man");
  assert.equal(combineGenderField("", ""), "");
});

test("sharedBioPaths: only paths more than one prompt can write to are treated as shared", () => {
  const shared = sharedBioPaths(PROMPTS);
  assert.ok(shared.has("system.details.biography.campaignNotes"), "campaignNotes carries several answers and must be headed");
  assert.ok(!shared.has("system.details.biography.allies"), "allies has exactly one prompt and needs no heading");
});

// ---------------------------------------------------------------------------
// buildBioUpdate, against the real authored prompts file.
// ---------------------------------------------------------------------------

const fullState = {
  finishing: {
    name: "  Test Character  ",
    pronouns: "They/them",
    genderIdentity: "Nonbinary",
    appearance: "Tall, tired, good coat.",
    languages: ["Common"],
    personalFile: { age: "24", height: "1.72 m", weight: "63 kg", "birth-place": "Two valleys over." },
    personality: {
      likes: "Hot water.",
      dislikes: "Wet boots.",
      attitude: "Watchful.",
      beliefs: "Nobody gets left in the water.",
      "good-at": "Fixing things."
    }
  },
  intake: {
    questions: {
      allies: "My sister.",
      enemies: "A foreman I walked out on.",
      organizations: "My family's boatyard.",
      directorate: "Why I really signed up.",
      // The player's page (2026-10-01) shares this answer map, keyed by prompt id.
      "player-goal": "Someone unfashionably kind.",
      enjoy: "Working out what was really going on.",
      avoid: "Rules arguments.",
      force: "The one who holds the group together.",
      spotlight: "Ask me before you put me on the spot.",
      gently: "Ask me first if something heavy is coming."
    },
    freeform: "A paragraph.\n\nAnd another."
  },
  knownLanguageSlugs: ["common"]
};

test("buildBioUpdate: plain string fields are written verbatim, never wrapped in markup", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, ...fullState });
  assert.equal(update["system.details.age.value"], "24");
  assert.equal(update["system.details.height.value"], "1.72 m");
  assert.equal(update["system.details.biography.likes"], "Hot water.");
  assert.equal(update["system.details.biography.birthPlace"], "Two valleys over.");
  for (const [path, value] of Object.entries(update)) {
    if (HTML_BIO_PATHS.has(path) || typeof value !== "string") continue;
    assert.ok(!value.includes("<p>"), `${path} is a plain input on the real sheet and must not contain markup`);
  }
});

test("buildBioUpdate: rich-text fields get real paragraph markup, because a ProseMirror field drops bare newlines", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, ...fullState });
  assert.equal(update["system.details.biography.backstory"], "<p>A paragraph.</p><p>And another.</p>");
  assert.equal(update["system.details.biography.allies"], "<p>My sister.</p>");
});

test("buildBioUpdate: both halves of the relationship question land on their own sheet field", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, ...fullState });
  assert.match(update["system.details.biography.allies"], /My sister\./);
  assert.match(update["system.details.biography.enemies"], /foreman/);
});

test("buildBioUpdate: several answers sharing one field are headed, so the GM can tell which is which", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, ...fullState });
  const notes = update["system.details.biography.campaignNotes"];
  assert.match(notes, /Why I really signed up\./);
  assert.match(notes, /Someone unfashionably kind\./);
  assert.match(notes, /Fixing things\./);
  // Every prompt that shares campaignNotes and was answered in the fixture gets exactly one heading.
  const answered = [...PROMPTS.personality, ...PROMPTS.openQuestions, ...PROMPTS.playerQuestions]
    .filter((p) => p.bioPath === "system.details.biography.campaignNotes")
    .filter((p) => (fullState.intake.questions[p.id] ?? fullState.finishing.personality[p.id] ?? "").trim());
  assert.ok(answered.length >= 8, "the fixture answers the old three and the player's page");
  assert.equal((notes.match(/<h4>/g) ?? []).length, answered.length, "each contribution needs its own heading");
});

test("buildBioUpdate: the player's page lands in Campaign Notes under short headings, each marked out of character", () => {
  const notes = buildBioUpdate({ prompts: PROMPTS, ...fullState })["system.details.biography.campaignNotes"];
  for (const q of PROMPTS.playerQuestions) {
    assert.ok(notes.includes(`<h4>${q.heading} (out of character)</h4>`), `${q.id} should be headed "${q.heading}" and marked out of character`);
    assert.ok(!notes.includes(q.text.slice(0, 60)), `${q.id}: the long question text is not used as a heading`);
  }
  assert.match(notes, /The one who holds the group together\./);
  assert.match(notes, /Ask me first if something heavy is coming\./);
});

test("buildBioUpdate: a player who answers only the player's page still gets those answers recorded", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, finishing: { name: "X" }, intake: { questions: { avoid: "Being told what my character feels." } } });
  assert.match(update["system.details.biography.campaignNotes"], /Being told what my character feels\./);
  assert.match(update["system.details.biography.campaignNotes"], /What do you not enjoy\? \(out of character\)/);
});

test("buildBioUpdate: the out-of-character question is labelled as such on the sheet", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, ...fullState });
  assert.match(update["system.details.biography.campaignNotes"], /\(out of character\)/);
});

test("buildBioUpdate: Organizations always carries the Directorate entry, even when the question is skipped", () => {
  const skipped = buildBioUpdate({
    prompts: PROMPTS,
    finishing: { name: "X" },
    intake: {}
  });
  assert.match(skipped["system.details.biography.organizations"], new RegExp(DIRECTORATE_ORGANIZATION.slice(0, 20)));
});

test("buildBioUpdate: the player's own answer follows the Directorate entry rather than replacing it", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, ...fullState });
  const orgs = update["system.details.biography.organizations"];
  assert.ok(orgs.indexOf("Directorate") < orgs.indexOf("boatyard"));
});

test("buildBioUpdate: identity fields that used to be dropped on the floor are all written", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, ...fullState });
  assert.equal(update["system.details.gender.value"], "Nonbinary (They/them)");
  assert.equal(update["system.details.biography.appearance"], "<p>Tall, tired, good coat.</p>");
  assert.deepEqual(update["system.details.languages.value"], ["common"]);
  assert.equal(update["name"], "Test Character", "the name is trimmed");
});

test("buildBioUpdate: a hand-typed language sf2e doesn't know is preserved in the free-text companion field", () => {
  const update = buildBioUpdate({
    prompts: PROMPTS,
    finishing: { name: "X", languages: ["Common", "Boatyard Cant"] },
    intake: {},
    knownLanguageSlugs: ["common"]
  });
  assert.deepEqual(update["system.details.languages.value"], ["common"]);
  assert.equal(update["system.details.languages.details"], "Boatyard Cant");
});

test("buildBioUpdate: unanswered prompts write nothing at all, rather than blanking a field", () => {
  const update = buildBioUpdate({
    prompts: PROMPTS,
    finishing: { name: "X", personality: { likes: "   " } },
    intake: { questions: { allies: "" } }
  });
  assert.ok(!("system.details.biography.likes" in update));
  assert.ok(!("system.details.biography.allies" in update));
  assert.ok(!("system.details.gender.value" in update));
});

test("buildBioUpdate: an entirely empty form still produces only the Directorate organization line", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, finishing: {}, intake: {} });
  assert.deepEqual(Object.keys(update), ["system.details.biography.organizations"]);
});

test("buildBioUpdate: called with nothing at all does not throw", () => {
  assert.doesNotThrow(() => buildBioUpdate());
});

test("every prompt in the real file declares a bioPath — nothing collected is silently dropped", () => {
  const all = [...PROMPTS.personalFile, ...PROMPTS.personality, ...PROMPTS.openQuestions, ...PROMPTS.playerQuestions, PROMPTS.freeform];
  for (const prompt of all) {
    assert.ok(
      typeof prompt.bioPath === "string" && prompt.bioPath.startsWith("system."),
      `${prompt.id} has no bioPath — every answer this form collects must land on the character sheet (Ingram, 2026-09-18)`
    );
  }
});

test("a fully-answered form reaches every prompt's declared destination", () => {
  const update = buildBioUpdate({ prompts: PROMPTS, ...fullState });
  const all = [...PROMPTS.personalFile, ...PROMPTS.personality, ...PROMPTS.openQuestions, ...PROMPTS.playerQuestions, PROMPTS.freeform];
  for (const prompt of all) {
    assert.ok(prompt.bioPath in update, `${prompt.id}'s answer never reached ${prompt.bioPath}`);
  }
});
