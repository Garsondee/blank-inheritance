/**
 * Generates the two combat-capable fixtures for the Pure RAW SF2E Validation initiative (design
 * doc §19 Phase 2/3): Lunar-17 (real level-1 Mystic pregen, paizo-pregens) and Security Goon (real
 * level-1 NPC, rulebook-bestiaries). Written out as plain JSON so the actual battle scenario never
 * needs the gitignored gamesystems/sf2e/ pack tree at runtime — same "generate once, check in the
 * output" pattern tools/character-builder/generate-fixtures.mjs already established for the
 * ground-layer kid fixtures. Re-run this after a gamesystems/sf2e upgrade if the pack's internal
 * shape ever changes; nothing under data/raw-validation-fixtures/ is meant to be hand-edited.
 *
 * NOT the same fixture as tools/battle-simulator/data/kid-fixtures/test-fixture-umbilical-control.json
 * — that one also borrows the "Lunar-17" pregen, but for the ground-layer kid roster (combat fields
 * deliberately NOT derived there, since a kid "never touches combat math directly"). This is a
 * genuinely different, unrelated use of the same real, public SF2E pregen: a full combat-capable
 * statblock, purpose-built for personnel-engine. Different id, different directory, different
 * schema shape — no collision, but worth stating plainly given the shared source name.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listLevel1Pregens, toIngredients } from "./extract-pregen.mjs";
import { deriveAbilityModifiers, deriveHP, derivePerception, deriveSavingThrows, deriveArmorClass } from "./derive.mjs";
import { deriveStrikes, deriveSpells, deriveTransferVitality, deriveSaveAttacks, deriveSkillModifier } from "./build-combat-pregen.mjs";
import { findNPC, toCombatant } from "../pack-extractor/extract-npc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const outDir = path.join(repoRoot, "tools", "battle-simulator", "data", "raw-validation-fixtures");

function buildLunar17() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Lunar-17");
  if (!pregen) throw new Error("Lunar-17 not found in paizo-pregens — Paizo may have renamed the pregen.");
  const ingredients = toIngredients(pregen);
  const mods = deriveAbilityModifiers(ingredients);

  const hp = deriveHP({ ancestryHP: ingredients.ancestryHP, classHP: ingredients.classHP, conModifier: mods.con });
  const perception = derivePerception({ rankIndex: ingredients.perceptionRank, level: 1, wisModifier: mods.wis });
  const saves = deriveSavingThrows({
    fortitudeRank: ingredients.saveRanks.fortitude, reflexRank: ingredients.saveRanks.reflex, willRank: ingredients.saveRanks.will,
    level: 1, conModifier: mods.con, dexModifier: mods.dex, wisModifier: mods.wis
  });
  const ac = deriveArmorClass({
    armorCategoryRank: ingredients.armorCategoryRank, level: 1, dexModifier: mods.dex,
    dexCap: ingredients.armor?.dexCap ?? null, itemBonus: ingredients.armor?.acBonus ?? 0, armorProficiency: ingredients.armor?.name ?? null
  });

  const strikes = deriveStrikes(ingredients, ["Zero Knife", "Arc Pistol", "Semi-Auto Pistol"], mods);
  const spells = deriveSpells(ingredients, ["Eldritch Lance"], mods);
  const healAbilities = [deriveTransferVitality(ingredients)];
  const saveAttacks = deriveSaveAttacks(ingredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "reflex" }], mods);
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);

  return {
    id: "raw-validation-lunar-17",
    name: "Lunar-17 (level-1 Mystic pregen, design doc §19 Pure RAW SF2E Validation — real Paizo Adventure Pregen, NOT one of the six real campaign kids)",
    side: "party",
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    spells,
    healAbilities,
    saveAttacks,
    intimidationModifier, // real, untrained (+0) — her cha modifier is +0 and Intimidation isn't one of her trained skills
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — see test/character-builder/build-combat-pregen.test.mjs and design/scale-and-chassis.md §19. Transfer Vitality's healing amount (10, minimum 1) is hand-transcribed from real rule prose since no structured field exists for it — see build-combat-pregen.mjs's own citation. The Incendiary Grenade's DC (17) is her real Class DC, matching the raw item's own @Check[reflex|against:class] text exactly."
  };
}

function buildSecurityGoon() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "rulebook-bestiaries");
  const goon = findNPC(packDir, "Security Goon");
  if (!goon) throw new Error("Security Goon not found in rulebook-bestiaries — Paizo may have renamed the NPC.");
  const combatant = toCombatant(goon, { strikeNames: ["Arc Pistol", "Baton"] });
  return {
    id: "raw-validation-security-goon",
    name: "Security Goon (level-1 NPC, design doc §19 Pure RAW SF2E Validation — real rulebook-bestiaries statblock)",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation, // real, trained (+6) — she's one of the two skills actually listed on her real sheet
    notes: "Every number here is a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/rulebook-bestiaries) — NPCs store final, precomputed combat numbers, so no derivation was needed. See test/character-builder/extract-npc.test.mjs and design/scale-and-chassis.md §19. \"License to Break Bones\" (a Fortitude-save, Prone-requiring action) is captured under `actions` for transcript honesty but is NOT a usable strike — this engine has no saving-throw mechanism."
  };
}

const lunar17 = buildLunar17();
const securityGoon = buildSecurityGoon();

writeFileSync(path.join(outDir, "lunar-17.json"), JSON.stringify(lunar17, null, 2) + "\n");
writeFileSync(path.join(outDir, "security-goon.json"), JSON.stringify(securityGoon, null, 2) + "\n");

console.log(`wrote lunar-17.json (AC ${lunar17.ac}, HP ${lunar17.maxHP}, ${lunar17.strikes.length} strikes, ${lunar17.spells.length} spell, ${lunar17.healAbilities.length} heal ability, ${lunar17.saveAttacks.length} saveAttack, intimidation +${lunar17.intimidationModifier})`);
console.log(`wrote security-goon.json (AC ${securityGoon.ac}, HP ${securityGoon.maxHP}, ${securityGoon.strikes.length} strikes, ${securityGoon.reactions.length} reaction, ${securityGoon.actions.length} other action, intimidation +${securityGoon.intimidationModifier})`);
