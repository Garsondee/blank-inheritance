// Tier 1 — Rules in this scene (core/scene-rules.mjs, 2026-10-04, D060): which words name a rule, which do not, and in what
// order a scene's rules are offered. The glossary these run against here is a small hand-made one; the real, generated
// glossary is checked against the shipped packs and Episode One in tier2-rules-glossary.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { wordsOf, names, rulesInScene, glossaryMatches } from "../module/blank-inheritance/scripts/core/scene-rules.mjs";

const E = {
  offGuard: { id: "condition:off-guard", kind: "condition", name: "Off-Guard", match: "loose", valued: true, uuid: "Compendium.sf2e.conditions.Item.og", summary: "You're distracted." },
  prone: { id: "condition:prone", kind: "condition", name: "Prone", match: "loose", valued: true, notFollowedBy: "to", uuid: "Compendium.sf2e.conditions.Item.pr", summary: "You're lying on the ground." },
  grabbed: { id: "condition:grabbed", kind: "condition", name: "Grabbed", match: "strict", valued: true, uuid: "Compendium.sf2e.conditions.Item.gr", summary: "You're held in place." },
  clumsy: { id: "condition:clumsy", kind: "condition", name: "Clumsy", match: "strict", valued: true, uuid: "Compendium.sf2e.conditions.Item.cl", summary: "Your movements become clumsy." },
  search: { id: "action:search", kind: "action", name: "Search", match: "strict", uuid: "Compendium.sf2e.actions.Item.se", summary: "You Seek meticulously." },
  recall: { id: "action:recall-knowledge", kind: "action", name: "Recall Knowledge", match: "strict", uuid: "Compendium.sf2e.actions.Item.rk", summary: "You attempt a skill check." },
  terrain: { id: "rule:difficult-terrain", kind: "rule", name: "Difficult terrain", match: "pattern", patterns: ["\\b(?:greater )?difficult terrain\\b"], srd: "1-environment", citation: "GM Core pg. 92", summary: "Difficult terrain impedes movement." },
  afflictions: { id: "rule:afflictions", kind: "rule", name: "Afflictions", match: "pattern", patterns: ["\\bvenom(?:ous)?\\b"], srd: "2-afflictions", summary: "Poisons are afflictions." },
  chases: { id: "rule:chases", kind: "rule", name: "Chases", match: "pattern", patterns: [], subsystems: ["chase"], srd: "3-chases", summary: "A pursuit." }
};
const glossary = { entries: Object.values(E) };

test("a loose name is found in any case; a valued condition with its number in any case", () => {
  assert.equal(names(E.offGuard, "whoever was working it is off-guard in the first round"), true);
  assert.equal(names(E.offGuard, "They are OFF-GUARD."), true);
  assert.equal(names(E.clumsy, "stage 3, 1d4 poison, clumsy 1 and fatigued"), true, "a strict name with its value is the rule");
  assert.equal(names(E.prone, "knocked prone by the surge"), true);
  assert.equal(names(E.prone, "a clerk prone to gossip"), false, "'prone to' is ordinary English");
});

test("a strict name only counts written as the rule: capitalised, in the middle of a sentence, and not the start of a longer name", () => {
  assert.equal(names(E.grabbed, "must succeed at a DC 17 Reflex save or be Grabbed, or worse"), true);
  assert.equal(names(E.grabbed, "He grabbed the docket."), false, "lower case is ordinary English");
  assert.equal(names(E.search, "Search the drawers first. Then wait."), false, "the first word of a sentence is capitalised anyway");
  assert.equal(names(E.search, "They leave. \"Search them,\" he says"), false, "after a sentence and a quotation mark, still the first word");
  assert.equal(names(E.search, "the Search Party arrives"), false, "the start of a longer capitalised name");
  assert.equal(names(E.recall, "give them the Recall Knowledge result free"), true, "a name of two words");
  assert.equal(names(E.search, "anyone who takes time to Search finds it"), true);
});

test("an SRD rule is found by its own words", () => {
  assert.equal(names(E.terrain, "they are standing in difficult terrain, near the grate"), true);
  assert.equal(names(E.terrain, "greater difficult terrain"), true);
  assert.equal(names(E.afflictions, "the bite is venomous"), true);
  assert.equal(names(E.afflictions, "a terrain of rumours"), false);
});

test("the words read are a GM's: not ids, references, field values like a beat's kind, read-aloud, a person's lines, or quotations", () => {
  const words = wordsOf({
    id: "off-guard-beat",
    challengeRef: "c1e1-the-stamp",
    kind: "check",
    readAloud: "You are prone on the floor.",
    note: "Whoever slips is off-guard. <trig id=\"x\"/>",
    brief: { voice: { samples: ["\"I'll knock you prone.\""] }, wants: "To be left alone." },
    direction: "Ask last: \"If you come in here unconscious, what then?\" Then wait."
  });
  assert.deepEqual(words, ["Whoever slips is off-guard.", "To be left alone.", "Ask last: Then wait."]);
});

test("a scene's rules: its fight's creatures first, then each rule where it is first named, then its clock's own kind", () => {
  const brief = {
    id: "drains",
    intro: { readAloud: "You climb down. It is prone to flooding." },
    beats: [
      { id: "down", text: "Down on the flooded floor, they are in difficult terrain." },
      { id: "work", text: "On a failure, whoever was working it is off-guard.", note: "Give them the Recall Knowledge result free." }
    ]
  };
  const challenges = { c: { checks: [{ outcomes: { failure: "They must succeed at a Reflex save or be Grabbed." } }] } };
  const encounters = { e: { creatures: [{ name: "Giant Centipede", compendium: "Compendium.sf2e.tales-from-the-vast-bestiary.Actor.a1", statline: "AC 15 · HP 8" }, { name: "Homebrew", compendium: null }], build: "plus venom (Fortitude DC 14)" } };
  const subsystem = { subsystemType: "chase", description: "Keep up." };
  const rules = rulesInScene({ brief, challenges, encounters, subsystem }, glossary);
  assert.deepEqual(rules.map((r) => r.id), [
    "creature:Compendium.sf2e.tales-from-the-vast-bestiary.Actor.a1",
    "rule:difficult-terrain", "condition:off-guard", "action:recall-knowledge", "condition:grabbed", "rule:afflictions", "rule:chases"
  ]);
  assert.deepEqual(rules[0], { id: "creature:Compendium.sf2e.tales-from-the-vast-bestiary.Actor.a1", kind: "creature", name: "Giant Centipede", summary: "AC 15 · HP 8", uuid: "Compendium.sf2e.tales-from-the-vast-bestiary.Actor.a1" });
  assert.deepEqual(rules[1], { id: "rule:difficult-terrain", kind: "rule", name: "Difficult terrain", summary: "Difficult terrain impedes movement.", srd: "1-environment", citation: "GM Core pg. 92", patterns: ["\\b(?:greater )?difficult terrain\\b"] }, "an SRD rule carries the words that find its paragraph in the article");
  assert.equal(rules[0].patterns, undefined, "a document opened by its UUID needs none");
  assert.ok(!rules.some((r) => r.id === "condition:prone"), "'prone to flooding' in the read-aloud is not a ruling");
});

test("a scene that names no rule offers none, and no glossary offers nothing but its creatures", () => {
  assert.deepEqual(rulesInScene({ brief: { beats: [{ text: "They talk." }] } }, glossary), []);
  assert.deepEqual(rulesInScene({}, null), []);
});

test("the Palette's rules by name: starting with it first, then holding it", () => {
  assert.deepEqual(glossaryMatches(glossary, "gra").map((r) => r.id), ["condition:grabbed"]);
  assert.deepEqual(glossaryMatches(glossary, "guar").map((r) => r.id), ["condition:off-guard"]);
  assert.deepEqual(glossaryMatches(glossary, "ff").map((r) => r.id), ["rule:afflictions", "rule:difficult-terrain", "condition:off-guard"], "all only hold it: by name");
  assert.deepEqual(glossaryMatches(glossary, "c").map((r) => r.id).slice(0, 2), ["rule:chases", "condition:clumsy"], "starting with it comes first");
  assert.deepEqual(glossaryMatches(glossary, "").map((r) => r.id), []);
  assert.deepEqual(glossaryMatches(null, "x"), []);
});
