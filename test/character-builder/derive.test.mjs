/**
 * Unit tests for the pure SF2E level-1 chargen math — the "process for
 * building a character" deliverable, verified independently of any
 * specific pregen. See kid-fixtures.test.mjs for the end-to-end check
 * (this engine's output matches Paizo's own published pregen totals).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  proficiencyBonus, proficiency, applyBoost, applyFlaw, deriveAbilityModifiers,
  deriveHP, derivePerception, deriveSavingThrows, deriveSkills, deriveArmorClass, deriveClassDC,
  SKILL_KEY_ABILITY
} from "../../tools/character-builder/derive.mjs";

test("proficiencyBonus: untrained never scales with level; trained/expert/master/legendary are level + 2/4/6/8", () => {
  assert.equal(proficiencyBonus(0, 1), 0);
  assert.equal(proficiencyBonus(0, 20), 0, "untrained stays +0 regardless of level");
  assert.equal(proficiencyBonus(1, 1), 3);
  assert.equal(proficiencyBonus(2, 1), 5);
  assert.equal(proficiencyBonus(3, 1), 7);
  assert.equal(proficiencyBonus(4, 1), 9);
  assert.equal(proficiencyBonus(1, 12), 14);
});

test("applyBoost: increases a modifier by 1, and caps at +4 (Player Core pg. 21: no level-1 modifier can exceed +4)", () => {
  let mods = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  mods = applyBoost(mods, "str");
  assert.equal(mods.str, 1);
  mods = applyBoost(applyBoost(applyBoost(mods, "str"), "str"), "str");
  assert.equal(mods.str, 4, "three more boosts on top of +1 should reach the +4 cap");
  mods = applyBoost(mods, "str");
  assert.equal(mods.str, 4, "a boost applied to an already-+4 modifier must not push it past +4 at level 1");
});

test("applyFlaw: decreases a modifier by 1", () => {
  const mods = applyFlaw({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }, "wis");
  assert.equal(mods.wis, -1);
});

test("deriveAbilityModifiers: applies ancestry boosts+flaw, background boosts, class key ability, then 4 free boosts, in that order", () => {
  const mods = deriveAbilityModifiers({
    ancestryBoosts: ["cha", "dex"],
    ancestryFlaws: ["wis"],
    backgroundBoosts: ["cha", "dex"],
    classKeyAbility: "cha",
    freeBoosts: ["cha", "dex", "int", "wis"]
  });
  // cha: ancestry(1) + background(1) + class(1) + free(1) = 4
  // dex: ancestry(1) + background(1) + free(1) = 3
  // wis: flaw(-1) + free(1) = 0
  // int: free(1) = 1
  assert.deepEqual(mods, { str: 0, dex: 3, con: 0, int: 1, wis: 0, cha: 4 });
});

test("deriveHP: ancestry HP + class HP + Con modifier", () => {
  assert.equal(deriveHP({ ancestryHP: 8, classHP: 8, conModifier: 1 }).max, 17);
  assert.equal(deriveHP({ ancestryHP: 6, classHP: 6, conModifier: -1 }).max, 11);
  const hp = deriveHP({ ancestryHP: 6, classHP: 8, conModifier: 0 });
  assert.equal(hp.current, hp.max, "a freshly derived character starts at full HP");
});

test("derivePerception: proficiency bonus (from class rank) + Wisdom modifier", () => {
  const p = derivePerception({ rankIndex: 1, level: 1, wisModifier: 2 });
  assert.equal(p.proficiency.rank, "trained");
  assert.equal(p.proficiency.modifier, 5); // (1+2) + 2
});

test("deriveSavingThrows: each save uses its own fixed ability (Fort->Con, Reflex->Dex, Will->Wis)", () => {
  const saves = deriveSavingThrows({ fortitudeRank: 1, reflexRank: 2, willRank: 0, level: 1, conModifier: 1, dexModifier: 3, wisModifier: -1 });
  assert.equal(saves.fortitude.modifier, 4); // 3(trained) + 1
  assert.equal(saves.reflex.modifier, 8); // 5(expert) + 3
  assert.equal(saves.will.rank, "untrained");
  assert.equal(saves.will.modifier, -1); // 0(untrained) + -1
});

test("deriveSkills: covers all 18 fixed skills, untrained (rank 0, +0 proficiency) for anything not explicitly ranked", () => {
  const skills = deriveSkills({ ranks: { athletics: 1 }, level: 1, abilityModifiers: { str: 3, dex: 0, con: 0, int: 0, wis: 0, cha: 0 } });
  assert.equal(Object.keys(skills).length, 18);
  assert.equal(skills.athletics.modifier, 6); // 3(trained) + 3(str)
  assert.equal(skills.stealth.rank, "untrained", "a skill absent from `ranks` must default to untrained, not throw or be omitted");
});

test("deriveSkills: every skill in SKILL_KEY_ABILITY maps to exactly one of the six abilities", () => {
  const abilities = new Set(["str", "dex", "con", "int", "wis", "cha"]);
  for (const [skill, ability] of Object.entries(SKILL_KEY_ABILITY)) {
    assert.ok(abilities.has(ability), `${skill} maps to an unrecognized ability "${ability}"`);
  }
  assert.equal(Object.keys(SKILL_KEY_ABILITY).length, 18, "must cover all 18 fixed skills, not a subset");
});

test("deriveArmorClass: 10 + Dex (capped by armor) + armor proficiency + item bonus", () => {
  const ac = deriveArmorClass({ armorCategoryRank: 1, level: 1, dexModifier: 5, dexCap: 2, itemBonus: 1, armorProficiency: "Second Skin" });
  assert.equal(ac.value, 16); // 10 + min(5,2)=2 + 3(trained) + 1
  const acNoCap = deriveArmorClass({ armorCategoryRank: 1, level: 1, dexModifier: 1, dexCap: null, itemBonus: 0, armorProficiency: null });
  assert.equal(acNoCap.value, 14); // 10 + 1(uncapped) + 3(trained) + 0
});

test("deriveClassDC: 10 + proficiency bonus + key ability modifier", () => {
  const dc = deriveClassDC({ rankIndex: 1, level: 1, keyAbilityModifier: 4 });
  assert.equal(dc.modifier, 17); // 10 + 3(trained) + 4
});
