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
  deriveStrikeAttackBonus, abilityForStrikeAttack, deriveStrikeDamageBonus, deriveSpellAttack, deriveSpellDC,
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

// ---------------------------------------------------------------------------
// Strike/spell combat math (design doc §19 Phase 2) — reference/tables/dc-and-check-math.json's
// meleeAttack/rangedAttack/spellAttack/spellDC formulas, and reference/srd/player-core/
// 349-damage-rolls.json's melee-vs-ranged-vs-spell damage-ability rule.
// ---------------------------------------------------------------------------

test("deriveStrikeAttackBonus: same proficiency-bonus + ability-modifier + item-bonus shape as every other check", () => {
  assert.equal(deriveStrikeAttackBonus({ rankIndex: 1, level: 1, abilityModifier: 3 }), 6); // 3(trained) + 3
  assert.equal(deriveStrikeAttackBonus({ rankIndex: 0, level: 1, abilityModifier: 3 }), 3, "untrained (rankIndex 0) contributes +0 proficiency");
  assert.equal(deriveStrikeAttackBonus({ rankIndex: 1, level: 1, abilityModifier: 3, itemBonus: 1 }), 7);
});

test("abilityForStrikeAttack: ranged always uses Dexterity, regardless of traits", () => {
  assert.equal(abilityForStrikeAttack({ strikeType: "ranged", traits: [], strModifier: 5, dexModifier: 1 }), 1);
});

test("abilityForStrikeAttack: melee without finesse always uses Strength, even when Dexterity would be higher", () => {
  assert.equal(abilityForStrikeAttack({ strikeType: "melee", traits: [], strModifier: 0, dexModifier: 3 }), 0);
});

test("abilityForStrikeAttack: melee WITH finesse uses whichever of Str/Dex is higher", () => {
  assert.equal(abilityForStrikeAttack({ strikeType: "melee", traits: ["finesse"], strModifier: 0, dexModifier: 3 }), 3, "Dex is better here, finesse lets it be used");
  assert.equal(abilityForStrikeAttack({ strikeType: "melee", traits: ["finesse"], strModifier: 4, dexModifier: 1 }), 4, "finesse is a CHOICE, not a forced switch — Str stays better here");
});

test("deriveStrikeDamageBonus: melee ALWAYS adds Strength, even for a finesse weapon attacked with Dexterity (Player Core pg. 398: finesse changes only the attack roll)", () => {
  assert.equal(deriveStrikeDamageBonus({ strikeType: "melee", traits: ["finesse"], strModifier: 2 }), 2);
});

test("deriveStrikeDamageBonus: ranged adds NO ability modifier by default", () => {
  assert.equal(deriveStrikeDamageBonus({ strikeType: "ranged", traits: [], strModifier: 5 }), 0);
});

test("deriveStrikeDamageBonus: ranged adds FULL Strength for a thrown weapon, HALF (rounded down) for propulsive", () => {
  assert.equal(deriveStrikeDamageBonus({ strikeType: "ranged", traits: ["thrown"], strModifier: 3 }), 3);
  assert.equal(deriveStrikeDamageBonus({ strikeType: "ranged", traits: ["propulsive"], strModifier: 3 }), 1); // floor(3/2)
  assert.equal(deriveStrikeDamageBonus({ strikeType: "ranged", traits: ["propulsive"], strModifier: 2 }), 1);
});

test("deriveSpellAttack / deriveSpellDC: same proficiency shape as a Strike/Class DC", () => {
  assert.equal(deriveSpellAttack({ rankIndex: 1, level: 1, abilityModifier: 4 }), 7); // 3(trained) + 4
  assert.equal(deriveSpellDC({ rankIndex: 1, level: 1, abilityModifier: 4 }), 17); // 10 + 3(trained) + 4
});

test("REAL WORKED EXAMPLE: Lunar-17 (level-1 Mystic pregen, design doc §19) — every combat number cross-checked against an independent read of her real raw pack data", () => {
  // Real ability modifiers (extract-pregen.mjs -> deriveAbilityModifiers on her actual boosts/flaws): str +0, dex +3, wis +4.
  // Real class data (gamesystems/sf2e/packs/paizo-pregens, Mystic class item): system.attacks.simple = 1 (trained),
  // system.spellcasting = 1 (trained). Every weapon she carries is category "simple".
  const str = 0, dex = 3, wis = 4;

  // Zero Knife (melee, finesse, 1d4 cold): attack uses Dex (finesse, better than Str), damage uses Str (melee always does).
  const zeroKnifeAttackAbility = abilityForStrikeAttack({ strikeType: "melee", traits: ["finesse"], strModifier: str, dexModifier: dex });
  assert.equal(deriveStrikeAttackBonus({ rankIndex: 1, level: 1, abilityModifier: zeroKnifeAttackAbility }), 6);
  assert.equal(deriveStrikeDamageBonus({ strikeType: "melee", traits: ["finesse"], strModifier: str }), 0);

  // Arc Pistol / Semi-Auto Pistol (ranged, no thrown/propulsive trait): attack uses Dex, damage adds nothing.
  const rangedAttackAbility = abilityForStrikeAttack({ strikeType: "ranged", traits: [], strModifier: str, dexModifier: dex });
  assert.equal(deriveStrikeAttackBonus({ rankIndex: 1, level: 1, abilityModifier: rangedAttackAbility }), 6);
  assert.equal(deriveStrikeDamageBonus({ strikeType: "ranged", traits: [], strModifier: str }), 0);

  // Eldritch Lance (spell attack, Occult Spontaneous Spells entry: proficiency.value 1, ability.value "wis").
  assert.equal(deriveSpellAttack({ rankIndex: 1, level: 1, abilityModifier: wis }), 7);
  assert.equal(deriveSpellDC({ rankIndex: 1, level: 1, abilityModifier: wis }), 17);
});
