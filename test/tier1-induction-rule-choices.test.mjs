// Tier 1 — the questions a background or class asks through a ChoiceSet rule element, and how the induction terminal asks them
// itself (core/induction-rule-choices.mjs, with the page logic in core/induction-background.mjs and core/induction-class.mjs).
//
// Found by the playtest rig, 2026-10-06 (design/playtest-process.md §12.5, F-0008): a player who picked Starship Dweller saw sf2e's own
// "Select a skill" window open over the Review page at Confirm, while the page said only "Creating your character...". The fixtures here
// are the real rule data of the real packs (gamesystems/sf2e/packs, read 2026-10-06), kept inline so the logic is tested without them;
// the second half runs the same code over the real catalogues and the real packs and skips loudly when the packs are absent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  analyzeRuleChoices,
  applyRuleChoices,
  choicesComplete,
  decorateRuleChoices,
  pickedChoiceLabels,
  remainingChoices
} from "../module/blank-inheritance/scripts/core/induction-rule-choices.mjs";
import { isBackgroundChoiceComplete, resolveBackgroundIngredients } from "../module/blank-inheritance/scripts/core/induction-background.mjs";
import { isClassChoiceComplete, resolveClassIngredients } from "../module/blank-inheritance/scripts/core/induction-class.mjs";
import { stripGrantItemRules } from "../module/blank-inheritance/scripts/core/induction-review.mjs";
import { FALLBACK_SKILL_SLUGS } from "../module/blank-inheritance/scripts/core/skills.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const SKILL_RANK = (flagPath) => ({ key: "ActiveEffectLike", mode: "upgrade", path: `system.skills.{item|flags.system.rulesSelections.${flagPath}}.rank`, value: 1 });
const choiceSet = (flag, choices, extra = {}) => ({ adjustName: false, choices, flag, key: "ChoiceSet", prompt: "PF2E.SpecificRule.Prompt.Skill", ...extra });

const STARSHIP_DWELLER = [
  choiceSet("skill", [{ label: "PF2E.Skill.Crafting", value: "crafting" }, { label: "PF2E.Skill.Piloting", value: "piloting" }]),
  SKILL_RANK("skill")
];
const HUSTLER = [{ choices: { config: "skills" }, flag: "skill", key: "ChoiceSet", prompt: "PF2E.SpecificRule.Prompt.Skill" }, SKILL_RANK("skill")];
const ADVOCATE = [
  choiceSet("advocate", [
    { label: "PF2E.Skill.Diplomacy", value: { feat: "Compendium.sf2e.feats.Item.6ON8DjFXSMITZleX", skill: "diplomacy" } },
    { label: "PF2E.Skill.Medicine", value: { feat: "Compendium.sf2e.feats.Item.wYerMk6F1RZb0Fwt", skill: "medicine" } }
  ]),
  SKILL_RANK("advocate.skill"),
  { key: "GrantItem", uuid: "{item|flags.system.rulesSelections.advocate.feat}" }
];
const MAGITECH = [
  choiceSet("skill", [
    { label: "PF2E.Skill.Arcana", predicate: ["skill:arcana:rank:0"], value: { rank: 1, slug: "arcana" } },
    { label: "PF2E.Skill.Occultism", predicate: ["skill:occultism:rank:0"], value: { rank: 1, slug: "occultism" } }
  ]),
  { key: "ActiveEffectLike", mode: "upgrade", path: "system.skills.{item|flags.system.rulesSelections.skill.slug}.rank", value: "@item.flags.system.rulesSelections.skill.rank" }
];
/** sf2e's own data names Piloting but carries the value "society" for it. */
const SOCIETY_SCOUT = [choiceSet("skill", [{ label: "PF2E.Skill.Piloting", value: "society" }, { label: "PF2E.Skill.Society", value: "society" }]), SKILL_RANK("skill")];
/** A feat question whose only use is a GrantItem the terminal throws away. */
const SIMULATION_PROGRAMMER = [
  choiceSet("simulationProgrammer", ["Compendium.sf2e.feats.Item.0ZNErs9RICfOw1Nf", "Compendium.sf2e.feats.Item.GBGvxPo6rnlEXFMg"], { prompt: "PF2E.SpecificRule.Prompt.Feat" }),
  { key: "GrantItem", uuid: "{item|flags.system.rulesSelections.simulationProgrammer}" }
];
const ENVOY = [
  choiceSet("skill", [{ label: "PF2E.Skill.Deception", value: "deception" }, { label: "PF2E.Skill.Diplomacy", value: "diplomacy" }, { label: "PF2E.Skill.Intimidation", value: "intimidation" }]),
  SKILL_RANK("skill"),
  { itemType: "action", key: "ItemAlteration", mode: "add", predicate: ["class:envoy", "item:slug:get-em"], property: "other-tags", value: "envoy-class" }
];

const copy = (value) => JSON.parse(JSON.stringify(value));

test("Starship Dweller asks one question: Crafting or Piloting", () => {
  const { choices, deferred, unsupported } = analyzeRuleChoices(STARSHIP_DWELLER);
  assert.deepEqual(choices, [{ flag: "skill", kind: "skill", options: [{ key: "crafting", label: "Crafting" }, { key: "piloting", label: "Piloting" }] }]);
  assert.deepEqual(deferred, []);
  assert.deepEqual(unsupported, []);
});

test("a question over every skill (Hustler) offers the game's whole skill list, in the game's own order", () => {
  const { choices } = analyzeRuleChoices(HUSTLER);
  assert.equal(choices.length, 1);
  assert.deepEqual(choices[0].options.map((o) => o.key), [...FALLBACK_SKILL_SLUGS]);
  assert.equal(choices[0].options[0].label, "Acrobatics");
  assert.equal(choices[0].kind, "skill");
});

test("a choice that pairs a skill with a feat (Advocate) is still the player's skill choice: its skill rank is a use beside the grant", () => {
  const { choices, deferred } = analyzeRuleChoices(ADVOCATE);
  assert.deepEqual(choices.map((c) => [c.flag, c.options.map((o) => o.key)]), [["advocate", ["diplomacy", "medicine"]]]);
  assert.deepEqual(deferred, []);
});

test("an option's key comes from its skill, whether the value is a name, a {skill} or a {slug}", () => {
  assert.deepEqual(analyzeRuleChoices(MAGITECH).choices[0].options.map((o) => o.key), ["arcana", "occultism"]);
  assert.deepEqual(analyzeRuleChoices(ADVOCATE).choices[0].options.map((o) => o.label), ["Diplomacy", "Medicine"]);
});

test("a skill's own label wins over a wrong value stored beside it (sf2e's Society Scout lists Piloting with the value \"society\")", () => {
  const { choices, unsupported } = analyzeRuleChoices(SOCIETY_SCOUT);
  assert.deepEqual(unsupported, []);
  assert.deepEqual(choices[0].options.map((o) => o.key), ["piloting", "society"]);
});

test("a feat question that only feeds a grant is dropped with the grant, not asked", () => {
  const { choices, deferred } = analyzeRuleChoices(SIMULATION_PROGRAMMER);
  assert.deepEqual(choices, []);
  assert.deepEqual(deferred, ["simulationProgrammer"]);
});

test("a flag that merely begins like another is not the same flag", () => {
  const rules = [
    choiceSet("skill", [{ label: "PF2E.Skill.Arcana", value: "arcana" }, { label: "PF2E.Skill.Nature", value: "nature" }]),
    { key: "GrantItem", uuid: "{item|flags.system.rulesSelections.skillTwo}" }
  ];
  assert.deepEqual(analyzeRuleChoices(rules).deferred, [], "`skill` must not be read as used by `skillTwo`'s grant");
  assert.equal(analyzeRuleChoices(rules).choices.length, 1);
});

test("shapes this form cannot ask are reported, not guessed at", () => {
  const filtered = analyzeRuleChoices([{ key: "ChoiceSet", flag: "thing", choices: { filter: ["item:tag:x"], itemType: "feat" } }]);
  assert.deepEqual(filtered.choices, []);
  assert.equal(filtered.unsupported[0].flag, "thing");
  assert.equal(analyzeRuleChoices([{ key: "ChoiceSet", choices: [{ label: "PF2E.Skill.Arcana", value: "arcana" }] }]).unsupported[0].flag, null, "no flag of its own");
  assert.equal(analyzeRuleChoices([choiceSet("x", [])]).unsupported.length, 1, "no options at all");
  assert.equal(analyzeRuleChoices([choiceSet("x", [{ label: "PF2E.Skill.Arcana", value: "arcana" }, { label: "PF2E.Skill.Arcana", value: "arcana" }])]).unsupported.length, 1, "two options with one key cannot be told apart");
  assert.equal(analyzeRuleChoices([choiceSet("x", [{ label: "Odd", value: "Has Capitals And Spaces" }])]).unsupported.length, 1);
  assert.equal(analyzeRuleChoices([{ key: "ChoiceSet", flag: "x", choices: { config: "skills", extra: true } }]).unsupported.length, 1, "config plus anything else is not the plain skills list");
  assert.deepEqual(analyzeRuleChoices(undefined), { choices: [], deferred: [], unsupported: [] });
  assert.deepEqual(analyzeRuleChoices([{ key: "ActiveEffectLike" }]), { choices: [], deferred: [], unsupported: [] });
});

test("an answer is written into the ChoiceSet as its selection, and nothing the caller holds is changed", () => {
  const before = copy(STARSHIP_DWELLER);
  const rules = applyRuleChoices(STARSHIP_DWELLER, { skill: "piloting" });
  assert.deepEqual(STARSHIP_DWELLER, before, "the rules passed in are never mutated");
  assert.equal(rules.length, 2);
  assert.equal(rules[0].selection, "piloting");
  assert.deepEqual(rules[1], STARSHIP_DWELLER[1], "the skill-rank rule that reads the answer is left as it was");
  assert.equal(applyRuleChoices(STARSHIP_DWELLER, { skill: "crafting" })[0].selection, "crafting");
});

test("a choice whose value is an object is answered with that very object, so sf2e's own deep comparison finds it", () => {
  const advocate = applyRuleChoices(ADVOCATE, { advocate: "medicine" });
  assert.deepEqual(advocate[0].selection, ADVOCATE[0].choices[1].value);
  assert.equal(advocate[0].selection.skill, "medicine");
  const magitech = applyRuleChoices(MAGITECH, { skill: "arcana" });
  assert.deepEqual(magitech[0].selection, { rank: 1, slug: "arcana" });
});

test("the question over every skill is answered with the skill's slug", () => {
  assert.equal(applyRuleChoices(HUSTLER, { skill: "stealth" })[0].selection, "stealth");
  assert.deepEqual(HUSTLER[0].choices, { config: "skills" }, "and its own list is left alone");
});

test("sf2e's Society Scout data bug does not reach the character: choosing Piloting trains Piloting", () => {
  const rules = applyRuleChoices(SOCIETY_SCOUT, { skill: "piloting" });
  assert.equal(rules[0].selection, "piloting");
  assert.deepEqual(rules[0].choices.map((c) => c.value), ["piloting", "society"], "the Piloting option's value is the skill it is labelled with");
  assert.equal(applyRuleChoices(SOCIETY_SCOUT, { skill: "society" })[0].selection, "society");
});

test("a question that only fed a discarded grant is gone, and what is left after the grants are stripped asks nothing", () => {
  const rules = applyRuleChoices(SIMULATION_PROGRAMMER, {});
  assert.deepEqual(rules.map((r) => r.key), ["GrantItem"]);
  assert.deepEqual(stripGrantItemRules(rules), [], "an item with only that question has no rule left at all");
  const advocate = stripGrantItemRules(applyRuleChoices(ADVOCATE, { advocate: "diplomacy" }));
  assert.deepEqual(advocate.map((r) => r.key), ["ChoiceSet", "ActiveEffectLike"], "the skill question stays, answered; the feat grant goes");
  assert.equal(advocate[0].selection.skill, "diplomacy");
});

test("an unanswered or illegal answer stops the embed rather than leaving Foundry to ask", () => {
  assert.throws(() => applyRuleChoices(STARSHIP_DWELLER, {}), /Not every choice has been made yet \(skill\)/);
  assert.throws(() => applyRuleChoices(STARSHIP_DWELLER, { skill: "stealth" }), /Not every choice/);
  assert.throws(() => applyRuleChoices(STARSHIP_DWELLER), /Not every choice/);
  assert.throws(() => applyRuleChoices(HUSTLER, { skill: "knitting" }), /Not every choice/);
  assert.throws(() => applyRuleChoices(ADVOCATE, { skill: "diplomacy" }), /advocate/, "an answer under the wrong flag is no answer");
});

test("rules with nothing to ask pass through as a copy, and a question this form cannot ask is left for Foundry to ask", () => {
  assert.deepEqual(applyRuleChoices([{ key: "ActiveEffectLike", path: "x", value: 1 }], {}), [{ key: "ActiveEffectLike", path: "x", value: 1 }]);
  assert.deepEqual(applyRuleChoices(undefined, {}), []);
  const odd = [{ key: "ChoiceSet", flag: "thing", choices: { filter: ["item:tag:x"] } }];
  assert.deepEqual(applyRuleChoices(odd, {}), odd, "unsupported is untouched: no selection invented");
  assert.notEqual(applyRuleChoices(odd, {})[0], odd[0], "but still a copy");
});

test("Envoy asks which of Deception, Diplomacy or Intimidation, and the rest of its rules are untouched", () => {
  const { choices } = analyzeRuleChoices(ENVOY);
  assert.deepEqual(choices[0].options.map((o) => o.key), ["deception", "diplomacy", "intimidation"]);
  const rules = applyRuleChoices(ENVOY, { skill: "diplomacy" });
  assert.equal(rules[0].selection, "diplomacy");
  assert.deepEqual(rules[2], ENVOY[2]);
});

test("completeness, what is left to answer, and what the pages and the review show", () => {
  const { choices } = analyzeRuleChoices(STARSHIP_DWELLER);
  assert.equal(choicesComplete(choices, {}), false);
  assert.equal(choicesComplete(choices, { skill: "piloting" }), true);
  assert.equal(choicesComplete(choices, { skill: "stealth" }), false, "an answer that is not one of the options is not an answer");
  assert.equal(choicesComplete(undefined, {}), true, "an item that asks nothing is complete");
  assert.equal(choicesComplete([], undefined), true);
  assert.equal(remainingChoices(choices, {}), 1);
  assert.equal(remainingChoices(choices, { skill: "crafting" }), 0);
  assert.equal(remainingChoices(undefined, {}), 0);

  const groups = decorateRuleChoices(choices, { skill: "crafting" }, { labelOf: (key, label) => `${label}!` });
  assert.equal(groups[0].isSkill, true);
  assert.deepEqual(groups[0].options.map((o) => [o.key, o.label, o.picked, o.flag]), [["crafting", "Crafting!", true, "skill"], ["piloting", "Piloting!", false, "skill"]]);
  assert.deepEqual(decorateRuleChoices(undefined, {}), []);

  assert.deepEqual(pickedChoiceLabels(choices, { skill: "piloting" }), [{ flag: "skill", kind: "skill", label: "Piloting" }]);
  assert.deepEqual(pickedChoiceLabels(choices, {}), []);
});

test("a background with a question is not complete until it is answered, whatever its boosts say", () => {
  const background = { id: "starship-dweller", boosts: [["con", "dex"], ["str", "dex", "con", "int", "wis", "cha"]], choices: analyzeRuleChoices(STARSHIP_DWELLER).choices };
  const boostPicks = ["con", "cha"]; // both slots offer a choice, so both need a pick
  assert.equal(isBackgroundChoiceComplete(background, boostPicks), false, "no answers passed: not complete");
  assert.equal(isBackgroundChoiceComplete(background, boostPicks, {}), false);
  assert.equal(isBackgroundChoiceComplete(background, boostPicks, { skill: "stealth" }), false);
  assert.equal(isBackgroundChoiceComplete(background, boostPicks, { skill: "piloting" }), true);
  assert.equal(isBackgroundChoiceComplete(background, ["con"], { skill: "piloting" }), false, "and a missing boost still blocks it");
  assert.throws(() => resolveBackgroundIngredients(background, boostPicks, {}), /choice this background asks/);
  assert.deepEqual(resolveBackgroundIngredients(background, boostPicks, { skill: "crafting" }).backgroundBoosts, ["con", "cha"]);
  const plain = { id: "x", boosts: [["con", "dex"], ["str", "dex", "con", "int", "wis", "cha"]] };
  assert.equal(isBackgroundChoiceComplete(plain, boostPicks), true, "a background that asks nothing behaves exactly as before");
});

test("a class with a question (Envoy) is not complete until it is answered", () => {
  const envoy = { id: "envoy", keyAbility: ["cha"], choices: analyzeRuleChoices(ENVOY).choices };
  assert.equal(isClassChoiceComplete(envoy, []), false);
  assert.equal(isClassChoiceComplete(envoy, [], { skill: "deception" }), true);
  assert.equal(isClassChoiceComplete(envoy, [], { skill: "piloting" }), false);
  assert.throws(() => resolveClassIngredients(envoy, [], {}), /choice this class asks/);
  assert.equal(resolveClassIngredients(envoy, [], { skill: "diplomacy" }).classKeyAbility, "cha");
  assert.equal(isClassChoiceComplete({ id: "soldier", keyAbility: ["con"] }, []), true);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// The real catalogues and the real packs.
// ---------------------------------------------------------------------------------------------------------------------------------

const CATALOGUE = { background: JSON.parse(readFileSync(path.join(repoRoot, "data", "campaign", "background-catalogue.json"), "utf8")), class: JSON.parse(readFileSync(path.join(repoRoot, "data", "campaign", "class-catalogue.json"), "utf8")) };
const packsPresent = existsSync(path.join(repoRoot, "gamesystems", "sf2e", "packs"));

test("thirteen real backgrounds and the Envoy ask a question, and each question is well formed", () => {
  const withChoices = (list) => list.filter((e) => e.choices).map((e) => e.id).sort();
  assert.deepEqual(withChoices(CATALOGUE.background.backgrounds), ["advocate", "ancient-elebrian", "hellforged-squire", "hustler", "magic-scholar", "magitech-specialist", "robot-adversary", "scalawag", "scam-mage", "society-scout", "starfinder-hopeful", "starship-dweller", "teacher"]);
  assert.deepEqual(withChoices(CATALOGUE.class.classes), ["envoy"]);
  for (const entry of [...CATALOGUE.background.backgrounds, ...CATALOGUE.class.classes]) {
    const flags = new Set();
    for (const choice of entry.choices ?? []) {
      assert.ok(!flags.has(choice.flag), `${entry.id}: two questions share the flag ${choice.flag}`);
      flags.add(choice.flag);
      assert.ok(choice.options.length >= 2, `${entry.id}: a question with one option is not a question`);
      assert.equal(new Set(choice.options.map((o) => o.key)).size, choice.options.length, `${entry.id}: two options share a key`);
      assert.equal(choice.kind, choice.options.every((o) => FALLBACK_SKILL_SLUGS.includes(o.key)) ? "skill" : "other");
    }
  }
  assert.deepEqual(CATALOGUE.background.backgrounds.find((b) => b.id === "hustler").choices[0].options.map((o) => o.key), [...FALLBACK_SKILL_SLUGS]);
  assert.deepEqual(CATALOGUE.background.backgrounds.find((b) => b.id === "society-scout").choices[0].options.map((o) => o.key), ["piloting", "society"]);
});

test("every real background and class resolves once each of its questions is given its first option, and not before", () => {
  for (const background of CATALOGUE.background.backgrounds) {
    const boostPicks = background.boosts.filter((slot) => slot.length > 1).map((slot) => slot[0]);
    const answers = Object.fromEntries((background.choices ?? []).map((c) => [c.flag, c.options[0].key]));
    assert.ok(isBackgroundChoiceComplete(background, boostPicks, answers), `${background.id} did not resolve with its questions answered`);
    assert.equal(isBackgroundChoiceComplete(background, boostPicks, {}), !background.choices, `${background.id}: complete without answering its questions?`);
  }
  for (const cls of CATALOGUE.class.classes) {
    const pick = cls.keyAbility.length > 1 ? [cls.keyAbility[0]] : [];
    const answers = Object.fromEntries((cls.choices ?? []).map((c) => [c.flag, c.options[0].key]));
    assert.ok(isClassChoiceComplete(cls, pick, answers), `${cls.id} did not resolve with its questions answered`);
    assert.equal(isClassChoiceComplete(cls, pick, {}), !cls.choices, `${cls.id}: complete without answering its questions?`);
  }
});

test("the catalogues are exactly what the packs say, and no real item has a question this form cannot ask", async (t) => {
  if (!packsPresent) {
    t.skip("gamesystems/sf2e/packs is not here (gitignored): the catalogues cannot be held against the packs, skipping loudly rather than failing or silently passing.");
    return;
  }
  const { plan, TARGETS } = await import("../tools/character-builder/extract-rule-choices.mjs");
  for (const target of TARGETS) {
    const result = plan(target);
    assert.deepEqual(result.problems, [], `${target.file} has a ChoiceSet this form cannot ask, or an item the pack does not have`);
    assert.equal(result.changed, 0, `${target.file} is behind the packs: run node tools/character-builder/extract-rule-choices.mjs --write (or add the printed field by hand to a hand-formatted file)`);
  }
});

test("every real item that carries a question, run through the real analysis and then the terminal's own strip, leaves Foundry nothing to ask", async (t) => {
  if (!packsPresent) {
    t.skip("gamesystems/sf2e/packs is not here (gitignored): skipping loudly rather than failing or silently passing.");
    return;
  }
  const { analyzePack } = await import("../tools/character-builder/extract-rule-choices.mjs");
  const { readPackDocuments } = await import("../tools/pack-extractor/read-pack.mjs");
  for (const packName of ["ancestries", "backgrounds", "classes"]) {
    const { documents } = readPackDocuments(path.join(repoRoot, "gamesystems", "sf2e", "packs", packName));
    for (const { embedded, doc } of documents) {
      if (embedded || !doc?.system?.slug) continue;
      const asked = analyzeRuleChoices(doc.system.rules);
      const answers = Object.fromEntries(asked.choices.map((c) => [c.flag, c.options[0].key]));
      const ready = stripGrantItemRules(applyRuleChoices(doc.system.rules, answers));
      for (const rule of ready.filter((r) => r.key === "ChoiceSet")) {
        assert.notEqual(rule.selection, undefined, `${doc.name}: a ChoiceSet reaches the embed with no selection, so Foundry would open a window for it`);
      }
    }
  }
  assert.ok(analyzePack("backgrounds").size > 100);
});
