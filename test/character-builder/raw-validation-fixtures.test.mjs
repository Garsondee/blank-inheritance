/**
 * Verifies the checked-in RAW-validation fixtures (tools/battle-simulator/data/raw-validation-fixtures/)
 * match a fresh, live re-derivation from the real pack data exactly — catches drift if either file
 * were ever hand-edited without re-running generate-raw-validation-fixtures.mjs, same discipline as
 * kid-fixtures.test.mjs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listLevel1Pregens, toIngredients, findEquipmentItem } from "../../tools/character-builder/extract-pregen.mjs";
import { deriveAbilityModifiers, deriveHP, deriveArmorClass } from "../../tools/character-builder/derive.mjs";
import { deriveStrikes, deriveSpells, deriveSaveSpells, deriveTransferVitality, deriveSkillModifier } from "../../tools/character-builder/build-combat-pregen.mjs";
import { findNPC, toCombatant, deriveSpellAttacks, deriveConditionSave, deriveAreaAttack } from "../../tools/pack-extractor/extract-npc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const fixturesDir = path.join(repoRoot, "tools", "battle-simulator", "data", "raw-validation-fixtures");

function readFixture(name) {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}

test("lunar-17.json: checked-in strikes/spell/heal-ability match a fresh live re-derivation exactly", () => {
  const fixture = readFixture("lunar-17.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Lunar-17");
  const ingredients = toIngredients(pregen);
  const mods = deriveAbilityModifiers(ingredients);

  assert.equal(fixture.maxHP, deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con }).max);
  assert.equal(fixture.ac, deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  }).value);
  assert.deepEqual(fixture.strikes, deriveStrikes(ingredients, ["Zero Knife", "Arc Pistol", "Semi-Auto Pistol"], mods));
  assert.deepEqual(fixture.spells, deriveSpells(ingredients, ["Eldritch Lance"], mods));
  assert.deepEqual(fixture.healAbilities, [deriveTransferVitality(ingredients)]);
  assert.equal(fixture.saveAttacks, undefined, "her Incendiary Grenade is real but a burst-AREA effect (see design doc §21) — must never be wired as a single-target saveAttack again");
  assert.equal(fixture.intimidationModifier, deriveSkillModifier(ingredients, "intimidation", mods));
  assert.equal(fixture.side, "party");
});

test("security-goon.json: checked-in strikes/reactions/actions match a fresh live re-extraction exactly", () => {
  const fixture = readFixture("security-goon.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "rulebook-bestiaries");
  const goon = findNPC(packDir, "Security Goon");
  const combatant = toCombatant(goon, { strikeNames: ["Arc Pistol", "Baton"] });

  assert.equal(fixture.maxHP, combatant.maxHP);
  assert.equal(fixture.ac, combatant.ac);
  assert.deepEqual(fixture.saves, combatant.saves);
  assert.deepEqual(fixture.strikes, combatant.strikes);
  assert.deepEqual(fixture.reactions, combatant.reactions);
  assert.deepEqual(fixture.actions, combatant.actions);
  assert.deepEqual(fixture.lore, combatant.lore);
  assert.equal(fixture.intimidationModifier, combatant.skills.intimidation);
  assert.equal(fixture.side, "opposition");
});

test("tapkey.json: checked-in strikes match a fresh live re-derivation exactly — Tapkey needed zero new derivation code, per design doc §21's research survey", () => {
  const fixture = readFixture("tapkey.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Tapkey");
  const ingredients = toIngredients(pregen);
  const mods = deriveAbilityModifiers(ingredients);

  assert.equal(fixture.maxHP, deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con }).max);
  assert.equal(fixture.ac, deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  }).value);
  assert.deepEqual(fixture.strikes, deriveStrikes(ingredients, ["Nano-edge Rapier", "Boom Pistol"], mods));
  assert.equal(fixture.saveAttacks, undefined, "her Incendiary Grenade is real but a burst-AREA effect (see design doc §21) — must never be wired as a single-target saveAttack again");
  assert.equal(fixture.intimidationModifier, deriveSkillModifier(ingredients, "intimidation", mods));
  assert.equal(fixture.intimidationModifier, 4, "her Cha modifier (+4) is the roster's highest — the untrained-Demoralize axis the design doc research specifically wanted a second data point for");
  assert.equal(fixture.side, "party");
});

test("xenowarden-greenhorn.json: checked-in strikes/spell match a fresh live re-extraction exactly — the project's first NPC attack-roll spell", () => {
  const fixture = readFixture("xenowarden-greenhorn.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const xenowarden = findNPC(packDir, "Xenowarden Greenhorn");
  const combatant = toCombatant(xenowarden, { strikeNames: ["Arc Pistol", "Nano-edge Rapier"] });

  assert.equal(fixture.maxHP, combatant.maxHP);
  assert.equal(fixture.ac, combatant.ac);
  assert.deepEqual(fixture.saves, combatant.saves);
  assert.deepEqual(fixture.strikes, combatant.strikes);
  assert.deepEqual(fixture.spells, deriveSpellAttacks(xenowarden, ["Gouging Claw"]));
  assert.equal(fixture.intimidationModifier, combatant.skills.intimidation ?? null);
  assert.equal(fixture.intimidationModifier, null, "Intimidation genuinely isn't one of her 3 listed skills — must stay null, not an invented untrained number");
  assert.equal(fixture.side, "opposition");
});

test("bennit.json: checked-in strikes/saveAttack (spell) match a fresh live re-derivation exactly — this project's first save-based SPELL", () => {
  const fixture = readFixture("bennit.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "“Nitpick” Bennit");
  const ingredients = toIngredients(pregen);
  const mods = deriveAbilityModifiers(ingredients);

  assert.equal(fixture.maxHP, deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con }).max);
  assert.equal(fixture.ac, deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  }).value);
  assert.deepEqual(fixture.strikes, deriveStrikes(ingredients, ["Laser Pistol", "Semi-Auto Pistol"], mods));
  assert.deepEqual(fixture.saveAttacks, deriveSaveSpells(ingredients, ["Thunderstrike"], mods));
  assert.equal(fixture.saveAttacks[0].usesRemaining, 3, "her real spell-slot count, not unlimited");
  assert.equal(fixture.intimidationModifier, deriveSkillModifier(ingredients, "intimidation", mods));
  assert.equal(fixture.side, "party");
});

test("erabryth.json: checked-in strikes/conditionSave match a fresh live re-extraction exactly — this project's first condition-only save action", () => {
  const fixture = readFixture("erabryth.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const erabryth = findNPC(packDir, "Erabryth");
  const combatant = toCombatant(erabryth, { strikeNames: ["Ribbon", "Fist", "Light Ray"] });
  const conditionSaves = [deriveConditionSave(erabryth, {
    name: "Forced Reflection", saveType: "will", range: 60,
    outcomes: {
      criticalSuccess: {},
      success: { frightened: 1 },
      failure: { stunnedValue: 1, frightened: 1 },
      criticalFailure: { stunnedValue: 2, frightened: 2 }
    }
  })];

  assert.equal(fixture.maxHP, combatant.maxHP);
  assert.equal(fixture.ac, combatant.ac);
  assert.deepEqual(fixture.saves, combatant.saves);
  assert.deepEqual(fixture.strikes, combatant.strikes);
  assert.deepEqual(fixture.conditionSaves, conditionSaves);
  assert.equal(fixture.intimidationModifier, combatant.skills.intimidation ?? null);
  assert.equal(fixture.intimidationModifier, 4, "Intimidation IS one of her real listed skills, unlike Xenowarden Greenhorn's");
  assert.equal(fixture.side, "opposition");
});

test("vorza-moonshot.json: checked-in strikes match a fresh live re-derivation exactly — design doc §38's fourth PC, the one real Player Core pregen left buildable after Jaedana's boost-ambiguity throw and Old-Growth Wildfire's Auto-Fire-only weapon", () => {
  const fixture = readFixture("vorza-moonshot.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Vorza Moonshot");
  const ingredients = toIngredients(pregen);
  const mods = deriveAbilityModifiers(ingredients);

  assert.equal(fixture.maxHP, deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con }).max);
  assert.equal(fixture.maxHP, 23, "matches the pregen's own referenceHP field exactly");
  assert.equal(fixture.ac, deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  }).value);
  assert.deepEqual(fixture.strikes, deriveStrikes(ingredients, ["Zero Pistol"], mods));
  assert.equal(fixture.strikes.length, 1, "her melee weapon is entirely a stance (Solar Manifestations) with no static item to extract — real, not a shortfall");
  assert.equal(fixture.areaAttacks, undefined, "her Electromag Grenade is real but NOT wired — PC-side area attacks additionally need a Class DC derivation this project doesn't have yet, see her own notes field");
  assert.equal(fixture.intimidationModifier, deriveSkillModifier(ingredients, "intimidation", mods));
  assert.equal(fixture.side, "party");
});

test("tough.json: checked-in strikes/areaAttack match a fresh live re-extraction exactly — this project's first NPC area/burst attack, design doc §38", () => {
  const fixture = readFixture("tough.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "rulebook-bestiaries");
  const tough = findNPC(packDir, "Tough");
  const combatant = toCombatant(tough, { strikeNames: ["Gun Bash"] });
  const areaAttacks = [deriveAreaAttack(tough, { name: "Frag Grenade (Commercial)", saveType: "ref", actions: 1 })];

  assert.equal(fixture.maxHP, combatant.maxHP);
  assert.equal(fixture.ac, combatant.ac);
  assert.deepEqual(fixture.saves, combatant.saves);
  assert.deepEqual(fixture.strikes, combatant.strikes);
  assert.equal(fixture.strikes.length, 1, "only Gun Bash is a real Strike — Scattergun is a real auto-fire cone, out of scope");
  assert.deepEqual(fixture.areaAttacks, areaAttacks);
  assert.equal(fixture.areaAttacks[0].dc, 17);
  assert.equal(fixture.areaAttacks[0].radius, 5);
  assert.equal(fixture.areaAttacks[0].usesRemaining, 1, "a single real carried grenade, not unlimited");
  assert.equal(fixture.intimidationModifier, combatant.skills.intimidation ?? null);
  assert.equal(fixture.intimidationModifier, 4, "Intimidation IS one of her 3 real listed skills (athletics/intimidation/thievery)");
  assert.equal(fixture.side, "opposition");
});

test("findEquipmentItem: locates Laser Rifle by exact name in the general equipment compendium, with real, final stats", () => {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "equipment");
  const laserRifle = findEquipmentItem(packDir, "Laser Rifle");
  assert.ok(laserRifle, "expected to find an item named exactly \"Laser Rifle\" in the equipment compendium");
  assert.equal(laserRifle.type, "weapon");
  assert.equal(laserRifle.system.range, 100);
  assert.equal(laserRifle.system.category, "simple");
});

test("findEquipmentItem: returns null (not throw) for a name that doesn't exist", () => {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "equipment");
  assert.equal(findEquipmentItem(packDir, "Definitely Not A Real Weapon Name"), null);
});

test("obozaya.json: checked-in strikes match a fresh live re-derivation exactly, including a real catalog weapon pushed into her own ingredients — design doc §39's long-range PC", () => {
  const fixture = readFixture("obozaya.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "iconics");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Obozaya (Level 1)");
  const ingredients = toIngredients(pregen);
  const equipmentDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "equipment");
  ingredients.weapons = [...ingredients.weapons, findEquipmentItem(equipmentDir, "Laser Rifle")];
  const mods = deriveAbilityModifiers(ingredients);

  assert.equal(fixture.maxHP, deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con }).max);
  assert.equal(fixture.maxHP, 24, "matches the pregen's own referenceHP field exactly");
  assert.equal(fixture.ac, deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  }).value);
  assert.deepEqual(fixture.strikes, deriveStrikes(ingredients, ["Doshko", "Laser Rifle"], mods));
  const rifle = fixture.strikes.find((s) => s.name === "Laser Rifle");
  assert.equal(rifle.strikeType, "ranged");
  assert.equal(rifle.rangeIncrement, 100, "the roster's longest-range PC weapon by a wide margin — every existing PC tops out at a 60ft pistol");
  assert.equal(fixture.intimidationModifier, deriveSkillModifier(ingredients, "intimidation", mods));
  assert.equal(fixture.side, "party");
});

test("kuriaku.json: checked-in strikes match a fresh live re-extraction exactly — a real, AS-PUBLISHED long-range weapon (design doc §39), from a pack not previously scanned by this project", () => {
  const fixture = readFixture("kuriaku.json");
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "starfinder-society-bestiary");
  const kuriaku = findNPC(packDir, "Kuriaku");
  assert.ok(kuriaku, "expected to find an NPC named exactly \"Kuriaku\" in starfinder-society-bestiary");
  const combatant = toCombatant(kuriaku, { strikeNames: ["Shobhad Longrifle", "Antlers"] });

  assert.equal(fixture.maxHP, combatant.maxHP);
  assert.equal(fixture.ac, combatant.ac);
  assert.deepEqual(fixture.saves, combatant.saves);
  assert.deepEqual(fixture.strikes, combatant.strikes);
  const rifle = fixture.strikes.find((s) => s.name === "Shobhad Longrifle");
  assert.equal(rifle.strikeType, "ranged");
  assert.equal(rifle.rangeIncrement, 120, "the longest range of any combatant this project has ever fielded");
  assert.ok(rifle.traits.includes("volley-30"), "a real trait this engine does not mechanically model — must still be carried through honestly, not dropped");
  assert.equal(fixture.intimidationModifier, combatant.skills.intimidation ?? null);
  assert.equal(fixture.intimidationModifier, null, "Intimidation genuinely isn't one of her 5 listed skills");
  assert.equal(fixture.side, "opposition");
});

const ALL_FIXTURE_NAMES = ["lunar-17.json", "security-goon.json", "tapkey.json", "xenowarden-greenhorn.json", "bennit.json", "erabryth.json", "vorza-moonshot.json", "tough.json", "obozaya.json", "kuriaku.json"];

test("all ten fixtures are personnel-engine-shape-compatible: every strike/spell/saveAttack/healAbility/areaAttack/conditionSave has the fields its own legality/resolution code actually reads", () => {
  for (const name of ALL_FIXTURE_NAMES) {
    const fixture = readFixture(name);
    for (const strike of fixture.strikes) {
      assert.ok(strike.name && strike.strikeType && typeof strike.attackBonus === "number", `${name}: malformed strike ${JSON.stringify(strike)}`);
      assert.ok(Array.isArray(strike.damage) && strike.damage[0]?.dice, `${name}: strike "${strike.name}" has no usable damage`);
      if (strike.strikeType === "ranged") assert.ok(strike.rangeIncrement, `${name}: ranged strike "${strike.name}" has no rangeIncrement`);
    }
    for (const spell of fixture.spells ?? []) {
      // range===null is a REAL, legal value (touch/adjacent-only, e.g. Gouging Claw) — checkSpellRange
      // falls back to FEET_PER_SQUARE for it, so it must not be rejected by a plain truthiness check.
      const rangeOk = spell.range === null || typeof spell.range === "number";
      assert.ok(spell.name && typeof spell.attackBonus === "number" && rangeOk && spell.actions, `${name}: malformed spell ${JSON.stringify(spell)}`);
    }
    // GH #69: the three arrays the original version of this sweep never covered.
    for (const saveAttack of fixture.saveAttacks ?? []) {
      assert.ok(saveAttack.name && saveAttack.saveType && typeof saveAttack.dc === "number" && saveAttack.actions, `${name}: malformed saveAttack ${JSON.stringify(saveAttack)}`);
      assert.ok(Array.isArray(saveAttack.damage) && saveAttack.damage[0]?.dice, `${name}: saveAttack "${saveAttack.name}" has no usable damage`);
    }
    for (const heal of fixture.healAbilities ?? []) {
      assert.ok(heal.name && typeof heal.healingAmount === "number" && heal.actions, `${name}: malformed healAbility ${JSON.stringify(heal)}`);
    }
    for (const conditionSave of fixture.conditionSaves ?? []) {
      assert.ok(conditionSave.name && conditionSave.saveType && typeof conditionSave.dc === "number" && conditionSave.actions, `${name}: malformed conditionSave ${JSON.stringify(conditionSave)}`);
      assert.ok(conditionSave.outcomes && typeof conditionSave.outcomes === "object", `${name}: conditionSave "${conditionSave.name}" has no outcomes table`);
    }
    for (const areaAttack of fixture.areaAttacks ?? []) {
      assert.ok(areaAttack.name && areaAttack.saveType && typeof areaAttack.dc === "number" && typeof areaAttack.radius === "number", `${name}: malformed areaAttack ${JSON.stringify(areaAttack)}`);
      assert.ok(Array.isArray(areaAttack.damage) && areaAttack.damage[0]?.dice, `${name}: areaAttack "${areaAttack.name}" has no usable damage`);
    }
  }
});

/**
 * Well-formedness (design doc §76.9, GH #69/#55): every limited-resource ability across all six
 * arrays must EITHER declare a real usesRemaining OR be explicitly marked atWill — never neither.
 * This is the check that would have caught #55 (Transfer Vitality: no derivable limit, and nothing
 * marked it at-will either — just silently, structurally absent). Two REAL, CURRENTLY-EXPECTED
 * failures are named here explicitly, not hidden: both are real Paizo abilities whose true limit (if
 * any) simply isn't captured anywhere in this project's current data model, confirmed by direct
 * investigation, not assumed. An unexpected THIRD gap fails loudly, pointing at a real new problem.
 * A KNOWN gap silently disappearing ALSO fails loudly — the signal that someone fixed it for real
 * (#55/#60) and this list needs updating, not a reason to quietly stop checking.
 */
test("well-formedness (GH #69/#55): every spell/healAbility/saveAttack/areaAttack/conditionSave entry either declares a real usesRemaining or is explicitly atWill — exactly two known, honest exceptions", () => {
  const KNOWN_GAPS = [
    { file: "lunar-17.json", array: "healAbilities", name: "Transfer Vitality" },
    { file: "erabryth.json", array: "conditionSaves", name: "Forced Reflection" }
  ];
  const foundGaps = [];
  for (const name of ALL_FIXTURE_NAMES) {
    const fixture = readFixture(name);
    for (const arrayName of ["spells", "healAbilities", "saveAttacks", "areaAttacks", "conditionSaves"]) {
      for (const entry of fixture[arrayName] ?? []) {
        const wellFormed = entry.usesRemaining != null || entry.atWill === true;
        if (!wellFormed) foundGaps.push({ file: name, array: arrayName, name: entry.name });
      }
    }
  }
  for (const gap of foundGaps) {
    const isKnown = KNOWN_GAPS.some((k) => k.file === gap.file && k.array === gap.array && k.name === gap.name);
    assert.ok(isKnown, `UNEXPECTED well-formedness gap: ${gap.file}'s ${gap.array} entry "${gap.name}" has neither usesRemaining nor atWill:true. Either a real new bug (the exact shape #55 was), or a real new honest gap that needs to be named in KNOWN_GAPS explicitly — never silently accepted either way.`);
  }
  for (const known of KNOWN_GAPS) {
    const stillGap = foundGaps.some((g) => g.file === known.file && g.array === known.array && g.name === known.name);
    assert.ok(stillGap, `${known.file}'s ${known.array} entry "${known.name}" is no longer a well-formedness gap — if #55/#60 (or similar) resolved this for real, remove it from KNOWN_GAPS here; this assertion exists specifically so a real fix can't go unnoticed.`);
  }
  assert.equal(foundGaps.length, KNOWN_GAPS.length, `expected exactly ${KNOWN_GAPS.length} known well-formedness gaps (Transfer Vitality, Forced Reflection), found ${foundGaps.length}: ${JSON.stringify(foundGaps)}`);
});
