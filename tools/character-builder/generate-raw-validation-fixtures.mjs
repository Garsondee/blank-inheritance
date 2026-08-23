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
import { findNPC, toCombatant, deriveSpellAttacks } from "../pack-extractor/extract-npc.mjs";

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

/**
 * Second PC (design doc §21's "bigger battlefield" follow-up — research recommendation: Tapkey,
 * because her whole kit derives through EXISTING functions with zero new code, and she diversifies
 * the roster along two real axes neither existing fixture shows — a martial-category weapon
 * (Lunar-17's are all simple) and a high, untrained, Charisma-driven Demoralize (vs. Lunar-17's
 * untrained-but-flat cha+0 and Security Goon's trained cha-agnostic +6).
 */
function buildTapkey() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Tapkey");
  if (!pregen) throw new Error("Tapkey not found in paizo-pregens — Paizo may have renamed the pregen.");
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

  const strikes = deriveStrikes(ingredients, ["Nano-edge Rapier", "Boom Pistol"], mods);
  const saveAttacks = deriveSaveAttacks(ingredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "reflex" }], mods);
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);

  return {
    id: "raw-validation-tapkey",
    name: "Tapkey (level-1 Envoy pregen, design doc §21 — real Paizo Adventure Pregen, NOT one of the six real campaign kids)",
    side: "party",
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    saveAttacks,
    intimidationModifier, // real, untrained (+4) — pure Charisma; Intimidation isn't one of her trained skills either, but her cha modifier (+4) is the roster's highest
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — see test/character-builder/build-combat-pregen.test.mjs and design/scale-and-chassis.md §21. Nano-edge Rapier and Boom Pistol both derive through the existing deriveStrikes unmodified — Tapkey needed zero new engine or extraction code, per the design doc §21 research survey of the 5 remaining Player Core pregens. Only Nano-edge Rapier and Boom Pistol are wired as Strikes; her Incendiary Grenade (Commercial) is wired as a saveAttack instead, matching Lunar-17's own grenade exactly (DC = real Class DC, matching the item's own @Check[reflex|against:class] text)."
  };
}

/**
 * Second NPC (design doc §21's "bigger battlefield" follow-up — research recommendation: Xenowarden
 * Greenhorn, alien-core-bestiary). First spellcasting NPC in the project — Gouging Claw (an
 * attack-roll cantrip, same spell Bennit would also have) is wired via extract-npc.mjs's new
 * deriveSpellAttacks(), which reads her spellcastingEntry's already-final spelldc.value/dc directly
 * (no ability-modifier derivation needed — NPCs store final numbers, PCs derive them).
 *
 * Only Arc Pistol and Nano-edge Rapier are wired as Strikes, not both real "Knife" melee items —
 * her raw data has TWO distinct `melee` items both named "Knife" (one finesse/versatile-s, one
 * thrown-10 — the same physical weapon's melee-vs-thrown use represented as two separate NPC attack
 * rows), and toCombatant's name-based lookup can only ever address the first of a repeated name.
 * Arc Pistol (ranged) + Nano-edge Rapier (melee, already deadly-d8/disarm) already give distinct
 * ranged/melee coverage without that ambiguity — a third, redundant finesse-piercing-melee option
 * wasn't worth resolving the name collision for.
 *
 * No custom `name:` here (unlike buildTapkey/buildLunar17/buildSecurityGoon's own descriptive
 * strings) — `...combatant` below is spread AFTER any `name:` key would be set and would silently
 * win, exactly matching buildSecurityGoon's own existing (accidental but harmless) precedent: the
 * fixture's name ends up as the plain real NPC name ("Xenowarden Greenhorn"), which the full
 * citation in `notes` below covers anyway.
 */
function buildXenowardenGreenhorn() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const xenowarden = findNPC(packDir, "Xenowarden Greenhorn");
  if (!xenowarden) throw new Error("Xenowarden Greenhorn not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(xenowarden, { strikeNames: ["Arc Pistol", "Nano-edge Rapier"] });
  const spells = deriveSpellAttacks(xenowarden, ["Gouging Claw"]);
  return {
    id: "raw-validation-xenowarden-greenhorn",
    ...combatant,
    spells,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: Intimidation isn't one of her 3 listed skills (acrobatics/athletics/nature) — null, not an invented untrained number, see extract-npc.mjs's own skills-field note
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Gouging Claw is this project's first NPC attack-roll spell, wired via extract-npc.mjs's deriveSpellAttacks(): attack bonus and range both come directly from her real raw data (spellcastingEntry.system.spelldc.value = 6, matching her Strikes' own +7-ish power level; range \"touch\" mapped to null, matching checkSpellRange's own adjacent-only convention — see deriveSpellAttacks' own header for why a naive parseInt(\"touch\") would have been a real, silent range-check bug). Her real second damage entry (2 persistent bleed) is not carried — personnel-engine has no persistent-damage mechanism, same documented scope limit as the PC side's own firstSpellDamage. \"Grown Together\" (a passive AC bonus that requires another Xenowarden Greenhorn present) is real but situational — not applicable to this fight, so left undocumented on this combatant rather than mechanically wired for a condition that can't occur here."
  };
}

const lunar17 = buildLunar17();
const securityGoon = buildSecurityGoon();
const tapkey = buildTapkey();
const xenowardenGreenhorn = buildXenowardenGreenhorn();

writeFileSync(path.join(outDir, "lunar-17.json"), JSON.stringify(lunar17, null, 2) + "\n");
writeFileSync(path.join(outDir, "security-goon.json"), JSON.stringify(securityGoon, null, 2) + "\n");
writeFileSync(path.join(outDir, "tapkey.json"), JSON.stringify(tapkey, null, 2) + "\n");
writeFileSync(path.join(outDir, "xenowarden-greenhorn.json"), JSON.stringify(xenowardenGreenhorn, null, 2) + "\n");

console.log(`wrote lunar-17.json (AC ${lunar17.ac}, HP ${lunar17.maxHP}, ${lunar17.strikes.length} strikes, ${lunar17.spells.length} spell, ${lunar17.healAbilities.length} heal ability, ${lunar17.saveAttacks.length} saveAttack, intimidation +${lunar17.intimidationModifier})`);
console.log(`wrote security-goon.json (AC ${securityGoon.ac}, HP ${securityGoon.maxHP}, ${securityGoon.strikes.length} strikes, ${securityGoon.reactions.length} reaction, ${securityGoon.actions.length} other action, intimidation +${securityGoon.intimidationModifier})`);
console.log(`wrote tapkey.json (AC ${tapkey.ac}, HP ${tapkey.maxHP}, ${tapkey.strikes.length} strikes, ${tapkey.saveAttacks.length} saveAttack, intimidation +${tapkey.intimidationModifier})`);
console.log(`wrote xenowarden-greenhorn.json (AC ${xenowardenGreenhorn.ac}, HP ${xenowardenGreenhorn.maxHP}, ${xenowardenGreenhorn.strikes.length} strikes, ${xenowardenGreenhorn.spells.length} spell, intimidation ${xenowardenGreenhorn.intimidationModifier})`);
