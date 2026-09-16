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
import { deriveStrikes, deriveSpells, deriveSaveSpells, deriveTransferVitality, deriveHealSpellVariants, deriveAreaAttacks, deriveSkillModifier } from "../../tools/character-builder/build-combat-pregen.mjs";
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
  assert.deepEqual(
    fixture.healAbilities,
    [{ ...deriveTransferVitality(ingredients), usesRemaining: 2, usesPerEncounter: 2 }, ...deriveHealSpellVariants(ingredients, "Heal")],
    "usesRemaining/usesPerEncounter are hand-authored on top of the pure derivation (GH #55) — the real limit is the Vitality Network feat's own regenerating resource pool, not a derivable per-day count; see lunar-17.json's own notes field and deriveTransferVitality's docstring for why. Heal (touch)/Heal (30ft) are GH #60's own real, fully-derived addition — no hand-authoring involved."
  );
  const occultEntry = ingredients.spellcastingEntries.find((e) => e.name === "Occult Spontaneous Spells");
  assert.deepEqual(fixture.spellSlots, { 1: occultEntry.system.slots.slot1.max }, "GH #60 — the shared Heal slot pool, keyed by her real rank-1 slot count");
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
  // GH #65: this assertion used to pin the ABSENCE of areaAttacks ("needs a Class DC derivation this
  // project doesn't have yet") — that gap is now closed (deriveClassDC existed all along, inside
  // deriveSaveAttacks, just never wired into a real fixture; see vorza-moonshot.json's own notes
  // field for the full, corrected history). A real areaAttacks array now exists — the CONFORMANCE
  // sweep above already re-derives it fresh; this direct assertion is the "the known gap is gone"
  // signal, matching this project's own standing discipline for exactly this situation.
  assert.equal(fixture.areaAttacks.length, 1, "her Electromag Grenade — GH #65 finally gave PC-side area attacks a real home");
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

const ALL_FIXTURE_NAMES = [
  "lunar-17.json", "security-goon.json", "tapkey.json", "xenowarden-greenhorn.json", "bennit.json",
  "erabryth.json", "vorza-moonshot.json", "tough.json", "obozaya.json", "kuriaku.json",
  // GH #64
  "khefak.json", "scrap-rat.json", "cybernetic-zombie.json", "jinsul-trooper.json",
  "space-goblin-miscreant.json", "akata.json", "void-zombie.json",
  "observer-class-security-robot.json", "corpse-fleet-infantry.json", "assembly-ooze.json",
  // GH #65
  "iseph.json"
];

/**
 * CONFORMANCE (GH #69's own remaining scope, design doc §76.9: "Do the numbers match the cited
 * pack/SRD source?"). Investigated directly before writing this: per-instance conformance already
 * exists for every currently-populated non-strike-array entry above — each bespoke test already
 * deep-equals its own array against a fresh call into the real, pure, already-exported deriver. What
 * doesn't exist is a SYSTEMATIC sweep — exactly the gap the well-formedness sweep above already
 * closed for a different question (declares-a-limit vs. matches-its-source), and exactly the shape
 * of gap #55 itself was (a real divergence nobody had a check positioned to catch). #64's own plan to
 * import 8-10 more NPC enemies is precisely "every conversion is an opportunity for exactly this
 * class of divergence, at ten times the volume" (#69's own issue text) — this table is the safety net
 * for that work, not a replacement for the bespoke tests above (which carry real historical/narrative
 * value — regression guards like "must never be wired as a single-target saveAttack again" — this
 * sweep exists purely so a FUTURE fixture/entry is covered automatically, without anyone needing to
 * remember to hand-write a new bespoke assertion, the same failure mode #55/#69 were about).
 *
 * Deliberately NOT a fully data-only table: the five deriver functions have genuinely different real
 * signatures (PC-side spell/saveAttack derivers need `ingredients`+ability modifiers; NPC-side
 * spell/conditionSave/areaAttack derivers take the raw NPC plus a hand-supplied config object whose
 * `saveType`/`range`/`outcomes`/`actions` are NOT read from any structured pack field — confirmed by
 * direct investigation, `extract-npc.mjs`'s own `deriveConditionSave`/`deriveAreaAttack` docstrings —
 * so a conformance sweep can verify the derivation is STILL what it always was, but can never catch a
 * transcription error in one of these hand-supplied values; only re-reading the source prose by hand
 * can). Each entry below is a thunk closing over its own already-loaded ingredients/NPC, reusing the
 * EXACT same function + arguments its own sibling bespoke test above already calls — this is a
 * promotion of six already-proven-correct comparisons into one reusable, extensible table, not new
 * derivation logic.
 */
function loadPregenIngredients(packSubdir, pregenName) {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", packSubdir);
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === pregenName);
  const ingredients = toIngredients(pregen);
  return { ingredients, mods: deriveAbilityModifiers(ingredients) };
}
function loadNPC(packSubdir, npcName) {
  return findNPC(path.join(repoRoot, "gamesystems", "sf2e", "packs", packSubdir), npcName);
}

const { ingredients: lunar17Ingredients, mods: lunar17Mods } = loadPregenIngredients("paizo-pregens", "Lunar-17");
const { ingredients: bennitIngredients, mods: bennitMods } = loadPregenIngredients("paizo-pregens", "“Nitpick” Bennit");
const xenowardenNPC = loadNPC("alien-core-bestiary", "Xenowarden Greenhorn");
const erabrythNPC = loadNPC("alien-core-bestiary", "Erabryth");
const toughNPC = loadNPC("rulebook-bestiaries", "Tough");
const securityGoonNPC = loadNPC("rulebook-bestiaries", "Security Goon");
const kuriakuNPC = loadNPC("starfinder-society-bestiary", "Kuriaku");
// GH #64
const khefakNPC = loadNPC("alien-core-bestiary", "Khefak");
const scrapRatNPC = loadNPC("alien-core-bestiary", "Scrap Rat");
const cyberneticZombieNPC = loadNPC("alien-core-bestiary", "Cybernetic Zombie");
const jinsulTrooperNPC = loadNPC("alien-core-bestiary", "Jinsul Trooper");
const spaceGoblinMiscreantNPC = loadNPC("rulebook-bestiaries", "Space Goblin Miscreant");
const akataNPC = loadNPC("alien-core-bestiary", "Akata");
const voidZombieNPC = loadNPC("alien-core-bestiary", "Void Zombie");
const observerClassSecurityRobotNPC = loadNPC("alien-core-bestiary", "Observer-Class Security Robot");
const corpseFleetInfantryNPC = loadNPC("alien-core-bestiary", "Corpse Fleet Infantry");
const assemblyOozeNPC = loadNPC("alien-core-bestiary", "Assembly Ooze");
// GH #65
const { ingredients: tapkeyIngredients, mods: tapkeyMods } = loadPregenIngredients("paizo-pregens", "Tapkey");
const { ingredients: vorzaIngredients, mods: vorzaMods } = loadPregenIngredients("paizo-pregens", "Vorza Moonshot");
const { ingredients: isephIngredients, mods: isephMods } = loadPregenIngredients("iconics", "Iseph (Level 1)");

const CONFORMANCE_CASES = [
  { file: "lunar-17.json", array: "spells", derive: () => deriveSpells(lunar17Ingredients, ["Eldritch Lance"], lunar17Mods) },
  {
    file: "lunar-17.json", array: "healAbilities",
    derive: () => [{ ...deriveTransferVitality(lunar17Ingredients), usesRemaining: 2, usesPerEncounter: 2 }, ...deriveHealSpellVariants(lunar17Ingredients, "Heal")],
    note: "usesRemaining/usesPerEncounter are hand-authored on top of the pure derivation (GH #55) — see lunar-17.json's own notes field. Heal (touch)/Heal (30ft) are GH #60's own fully-derived addition."
  },
  { file: "lunar-17.json", array: "spellSlots", derive: () => ({ 1: lunar17Ingredients.spellcastingEntries.find((e) => e.name === "Occult Spontaneous Spells").system.slots.slot1.max }) },
  { file: "xenowarden-greenhorn.json", array: "spells", derive: () => deriveSpellAttacks(xenowardenNPC, ["Gouging Claw"]) },
  { file: "bennit.json", array: "saveAttacks", derive: () => deriveSaveSpells(bennitIngredients, ["Thunderstrike"], bennitMods) },
  {
    file: "erabryth.json", array: "conditionSaves",
    derive: () => [deriveConditionSave(erabrythNPC, {
      name: "Forced Reflection", saveType: "will", range: 60,
      outcomes: {
        criticalSuccess: {}, success: { frightened: 1 },
        failure: { stunnedValue: 1, frightened: 1 }, criticalFailure: { stunnedValue: 2, frightened: 2 }
      }
    })]
  },
  { file: "tough.json", array: "areaAttacks", derive: () => [deriveAreaAttack(toughNPC, { name: "Frag Grenade (Commercial)", saveType: "ref", actions: 1 })] },
  // GH #65 — the PC-side counterpart, five real grenades across five PCs, all sharing radius:5
  // (real, hand-verified against each one's own raw @Template[burst|distance:5] description text).
  { file: "lunar-17.json", array: "areaAttacks", derive: () => deriveAreaAttacks(lunar17Ingredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "ref", radius: 5 }], lunar17Mods) },
  { file: "tapkey.json", array: "areaAttacks", derive: () => deriveAreaAttacks(tapkeyIngredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "ref", radius: 5 }], tapkeyMods) },
  { file: "bennit.json", array: "areaAttacks", derive: () => deriveAreaAttacks(bennitIngredients, [{ name: "Frag Grenade (Commercial)", saveType: "ref", radius: 5 }], bennitMods) },
  { file: "vorza-moonshot.json", array: "areaAttacks", derive: () => deriveAreaAttacks(vorzaIngredients, [{ name: "Electromag Grenade (Commercial)", saveType: "ref", radius: 5 }], vorzaMods) },
  { file: "iseph.json", array: "areaAttacks", derive: () => deriveAreaAttacks(isephIngredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "ref", radius: 5 }], isephMods) },
  { file: "iseph.json", array: "strikes", derive: () => deriveStrikes(isephIngredients, ["Zero Knife", "Semi-Auto Pistol"], isephMods) },
  // GH #148 — correction of GH #64's own closing comment: Scrap Rat's real Frag Grenade is a genuine
  // area-fire burst (identical shape to Tough's own), not a single-target Strike as originally
  // claimed. Her melee attack-row item ("Frag Grenade") and weapon-type carried item ("Frag Grenade
  // (Commercial)") don't share an exact name, unlike Tough's — carriedWeaponName covers that mismatch.
  { file: "scrap-rat.json", array: "areaAttacks", derive: () => [deriveAreaAttack(scrapRatNPC, { name: "Frag Grenade", saveType: "ref", actions: 1, carriedWeaponName: "Frag Grenade (Commercial)" })] }
];

test("CONFORMANCE (GH #69): every currently-populated non-strike ability array matches a fresh live re-derivation exactly, via one systematic table instead of scattered bespoke assertions — the safety net for #64's own future NPC imports", () => {
  for (const { file, array, derive, note } of CONFORMANCE_CASES) {
    const fixture = readFixture(file);
    assert.deepEqual(fixture[array], derive(), note ? `${file}'s ${array}: ${note}` : `${file}'s ${array} no longer matches a fresh re-derivation`);
  }
});

// GH #63: level/initiativeModifier, added to every fixture. All ten are level 1 by design — a plain
// sanity check, not a re-derivation, matching the issue's own text ("the value is known, it simply
// is not recorded"). PCs get a genuine self-consistency check (initiativeModifier must equal the
// same combatant's own perception field, since Player Core pg. 427 initiative IS a Perception check
// — confirmed directly against every current fixture's own raw system.initiative.statistic). NPCs
// get a real conformance check against fresh raw pack data, the same discipline as CONFORMANCE_CASES
// above, since an NPC fixture carries no separate `perception` field to self-compare against.
test("CONFORMANCE (GH #63): every fixture's level matches its real, expected value, and initiativeModifier matches a fresh re-derivation/re-check exactly", () => {
  // GH #64 gave this project its first non-level-1 fixtures — a per-fixture expected table is a
  // stricter, more useful check than the old blanket "===1" ever was (catches a wrong level far
  // more precisely than "is it 1"), not just a forced accommodation of the new spread.
  const EXPECTED_LEVEL = {
    "khefak.json": -1, "scrap-rat.json": -1, "cybernetic-zombie.json": -1, "jinsul-trooper.json": 0
  };
  for (const name of ALL_FIXTURE_NAMES) {
    assert.equal(readFixture(name).level, EXPECTED_LEVEL[name] ?? 1, `${name}: level no longer matches its expected value`);
  }

  for (const name of ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json", "obozaya.json", "iseph.json"]) {
    const fixture = readFixture(name);
    assert.equal(fixture.initiativeModifier, fixture.perception, `${name}: initiativeModifier must equal this PC's own perception field — Player Core pg. 427, initiative is a Perception check`);
  }

  const npcCases = [
    { file: "security-goon.json", npc: securityGoonNPC },
    { file: "xenowarden-greenhorn.json", npc: xenowardenNPC },
    { file: "erabryth.json", npc: erabrythNPC },
    { file: "tough.json", npc: toughNPC },
    { file: "kuriaku.json", npc: kuriakuNPC },
    // GH #64
    { file: "khefak.json", npc: khefakNPC },
    { file: "scrap-rat.json", npc: scrapRatNPC },
    { file: "cybernetic-zombie.json", npc: cyberneticZombieNPC },
    { file: "jinsul-trooper.json", npc: jinsulTrooperNPC },
    { file: "space-goblin-miscreant.json", npc: spaceGoblinMiscreantNPC },
    { file: "akata.json", npc: akataNPC },
    { file: "void-zombie.json", npc: voidZombieNPC },
    { file: "observer-class-security-robot.json", npc: observerClassSecurityRobotNPC },
    { file: "corpse-fleet-infantry.json", npc: corpseFleetInfantryNPC },
    { file: "assembly-ooze.json", npc: assemblyOozeNPC }
  ];
  for (const { file, npc } of npcCases) {
    const fixture = readFixture(file);
    assert.equal(fixture.level, npc.actor.system.details.level.value, `${file}: level no longer matches a fresh raw-data re-check`);
    assert.equal(fixture.initiativeModifier, npc.actor.system.perception.mod, `${file}: initiativeModifier no longer matches a fresh raw-data re-check`);
    assert.equal(npc.actor.system.initiative.statistic, "perception", `${file}: this NPC's own real data no longer confirms initiative is Perception-based — toCombatant's own guard should have thrown before this fixture could even be regenerated`);
  }
});

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
      // GH #60: a heal ability now carries EITHER a flat healingAmount (Transfer Vitality) OR a real
      // dice healingFormula (Heal's own two variants) — never both, always at least one.
      const healingOk = typeof heal.healingAmount === "number" || typeof heal.healingFormula === "string";
      assert.ok(heal.name && healingOk && heal.actions, `${name}: malformed healAbility ${JSON.stringify(heal)}`);
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
 * marked it at-will either — just silently, structurally absent). #55 fixed Lunar-17's own gap
 * (hand-authored usesRemaining:2, see lunar-17.json's own notes field for why it's an approximation
 * rather than a derived number) — one REAL, CURRENTLY-EXPECTED gap remains, named here explicitly,
 * not hidden: a real Paizo ability whose true limit (if any) simply isn't captured anywhere in this
 * project's current data model, confirmed by direct investigation, not assumed. An unexpected
 * SECOND gap fails loudly, pointing at a real new problem. The known gap silently disappearing ALSO
 * fails loudly — the signal that someone fixed it for real (#60 or similar) and this list needs
 * updating, not a reason to quietly stop checking.
 */
test("well-formedness (GH #69/#55): every spell/healAbility/saveAttack/areaAttack/conditionSave entry either declares a real usesRemaining or is explicitly atWill — exactly one known, honest exception", () => {
  const KNOWN_GAPS = [
    { file: "erabryth.json", array: "conditionSaves", name: "Forced Reflection" }
  ];
  const foundGaps = [];
  for (const name of ALL_FIXTURE_NAMES) {
    const fixture = readFixture(name);
    for (const arrayName of ["spells", "healAbilities", "saveAttacks", "areaAttacks", "conditionSaves"]) {
      for (const entry of fixture[arrayName] ?? []) {
        // GH #60: slotRank is a THIRD well-formed shape — the limit is real and tracked, just at the
        // combatant's own shared spellSlots pool rather than per-ability usesRemaining (Decision 3).
        const wellFormed = entry.usesRemaining != null || entry.atWill === true || entry.slotRank != null;
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
  assert.equal(foundGaps.length, KNOWN_GAPS.length, `expected exactly ${KNOWN_GAPS.length} known well-formedness gap (Forced Reflection), found ${foundGaps.length}: ${JSON.stringify(foundGaps)}`);
});
