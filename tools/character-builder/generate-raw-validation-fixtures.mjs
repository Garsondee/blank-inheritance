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
import { deriveStrikes, deriveSpells, deriveSaveSpells, deriveTransferVitality, deriveSkillModifier } from "./build-combat-pregen.mjs";
import { findNPC, toCombatant, deriveSpellAttacks, deriveConditionSave } from "../pack-extractor/extract-npc.mjs";

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
    intimidationModifier, // real, untrained (+0) — her cha modifier is +0 and Intimidation isn't one of her trained skills
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — see test/character-builder/build-combat-pregen.test.mjs and design/scale-and-chassis.md §19/§21. Transfer Vitality's healing amount (10, minimum 1) is hand-transcribed from real rule prose since no structured field exists for it — see build-combat-pregen.mjs's own citation. Her Incendiary Grenade (Commercial) is real but NOT wired as a usable action: its raw description reads \"Activate 1 Area Fire ... (@Template[burst|distance:5])\" — a 5ft-burst AREA effect, not a single-target attack, structurally identical to Frag Grenade/Electromag Grenade (already excluded for other pregens for the same reason). personnel-engine's saveAttack action is single-target only; wiring a burst weapon through it would have hit exactly one creature with none of the real friendly-fire risk an area weapon actually carries, and was in fact caught doing exactly that (see design doc §21's grenade-modeling correction)."
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
    intimidationModifier, // real, untrained (+4) — pure Charisma; Intimidation isn't one of her trained skills either, but her cha modifier (+4) is the roster's highest
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — see test/character-builder/build-combat-pregen.test.mjs and design/scale-and-chassis.md §21. Nano-edge Rapier and Boom Pistol both derive through the existing deriveStrikes unmodified — Tapkey needed zero new engine or extraction code, per the design doc §21 research survey of the 5 remaining Player Core pregens. Her Incendiary Grenade (Commercial) is real but NOT wired as a usable action, for the same reason as Lunar-17's own grenade: its raw description is a 5ft-burst AREA effect (\"Activate 1 Area Fire ... @Template[burst|distance:5]\"), not a single-target attack personnel-engine's saveAttack action can correctly represent — see design doc §21."
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

/**
 * Third PC (design doc §22's "3v3, and this time pick something that needs a real gap" ask —
 * research recommendation: "Nitpick" Bennit). Her Thunderstrike is this project's first SAVE-BASED
 * SPELL, requiring the new deriveSaveSpells (build-combat-pregen.mjs) — genuinely new capability,
 * not a repeat of Tapkey/Xenowarden Greenhorn's own "zero new code" picks. Her real weapons (Laser
 * Pistol, Semi-Auto Pistol) derive through the existing deriveStrikes unmodified; her Frag Grenade
 * is real but NOT wired, for the identical reason Lunar-17's/Tapkey's own grenades were removed
 * (design doc §22): a real `@Template[burst|distance:5]` area effect, not a single-target attack.
 */
function buildBennit() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "“Nitpick” Bennit");
  if (!pregen) throw new Error("“Nitpick” Bennit not found in paizo-pregens — Paizo may have renamed the pregen.");
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

  const strikes = deriveStrikes(ingredients, ["Laser Pistol", "Semi-Auto Pistol"], mods);
  const saveAttacks = deriveSaveSpells(ingredients, ["Thunderstrike"], mods);
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);

  return {
    id: "raw-validation-bennit",
    name: "“Nitpick” Bennit (level-1 Witchwarper pregen, design doc §22 — real Paizo Adventure Pregen, NOT one of the six real campaign kids)",
    side: "party",
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    saveAttacks,
    intimidationModifier,
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — see test/character-builder/build-combat-pregen.test.mjs and design/scale-and-chassis.md §22. Thunderstrike (a real basic-Reflex-save spell, 1d12 electricity + 1d4 sonic) is this project's first save-based SPELL — deriveSaveSpells reads its save type directly off the spell's own structured system.defense.save.statistic field (not hand-supplied prose-reading, unlike a weapon's save-based effect), and its DC from her real spellcasting DC (deriveSpellDC), not Class DC. usesRemaining (3) is her real spell-slot count (system.slots.slot1.max), not an invented number. Her Frag Grenade (Commercial) is real but NOT wired as a usable action, for the same reason as every other grenade in this project: its raw description is a 5ft-burst AREA effect, not a single-target attack — see design doc §22."
  };
}

/**
 * Third NPC (design doc §22's "3v3, and this time pick something that needs a real gap" ask —
 * research recommendation: Erabryth, alien-core-bestiary). Her Forced Reflection is this project's
 * first CONDITION-ONLY save action — the target rolls, but the effect is a per-degree table of
 * Frightened/Stunned, not damage — requiring a genuinely new engine mechanism (personnel-engine/
 * legality.mjs's checkConditionSaveLegal, engine.mjs's "conditionSave" action type, decide.mjs's
 * candidate generation, and evaluate/state-value.mjs's new stunDenial term, since nothing anywhere
 * priced `stunnedRounds` before this). Her real Strikes (Ribbon/Fist/Light Ray) derive through the
 * existing toCombatant unmodified.
 */
function buildErabryth() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const erabryth = findNPC(packDir, "Erabryth");
  if (!erabryth) throw new Error("Erabryth not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(erabryth, { strikeNames: ["Ribbon", "Fist", "Light Ray"] });
  // Hand-transcribed from her real description prose (verified directly against the raw pack data —
  // see design doc §22): "Critical Success: unaffected. Success: Frightened 1. Failure: Stunned 1
  // and frightened 1. Critical Failure: Stunned 2 and Frightened 2." saveType "will" and range 60
  // are likewise hand-read from the same prose ("...within 60 feet... @Check[will|dc:17...]") — DC
  // itself comes from her real spellcastingEntry.spelldc.dc (17), confirmed to match the embedded
  // @Check tag's own dc:17 exactly, two independent sources agreeing.
  const conditionSaves = [deriveConditionSave(erabryth, {
    name: "Forced Reflection", saveType: "will", range: 60,
    outcomes: {
      criticalSuccess: {},
      success: { frightened: 1 },
      failure: { stunnedRounds: 1, frightened: 1 },
      criticalFailure: { stunnedRounds: 2, frightened: 2 }
    }
  })];
  return {
    id: "raw-validation-erabryth",
    ...combatant,
    conditionSaves,
    intimidationModifier: combatant.skills.intimidation ?? null,
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Forced Reflection is this project's first condition-only save action (personnel-engine's new \"conditionSave\" action type, design doc §22) — a real per-degree table of Frightened/Stunned hand-transcribed from her verbatim description text, DC sourced from her real spellcastingEntry.spelldc.dc (17). \"Shepherd's Touch\" (a passive that adds extra void/vitality damage to her Strikes) and \"Buffering Zone\" (a standing 15ft aura with its own real but situational save) are real but NOT wired — the same honest-skip discipline already applied to every other NPC's situational passives in this project."
  };
}

const lunar17 = buildLunar17();
const securityGoon = buildSecurityGoon();
const tapkey = buildTapkey();
const xenowardenGreenhorn = buildXenowardenGreenhorn();
const bennit = buildBennit();
const erabryth = buildErabryth();

writeFileSync(path.join(outDir, "lunar-17.json"), JSON.stringify(lunar17, null, 2) + "\n");
writeFileSync(path.join(outDir, "security-goon.json"), JSON.stringify(securityGoon, null, 2) + "\n");
writeFileSync(path.join(outDir, "tapkey.json"), JSON.stringify(tapkey, null, 2) + "\n");
writeFileSync(path.join(outDir, "xenowarden-greenhorn.json"), JSON.stringify(xenowardenGreenhorn, null, 2) + "\n");
writeFileSync(path.join(outDir, "bennit.json"), JSON.stringify(bennit, null, 2) + "\n");
writeFileSync(path.join(outDir, "erabryth.json"), JSON.stringify(erabryth, null, 2) + "\n");

console.log(`wrote lunar-17.json (AC ${lunar17.ac}, HP ${lunar17.maxHP}, ${lunar17.strikes.length} strikes, ${lunar17.spells.length} spell, ${lunar17.healAbilities.length} heal ability, intimidation +${lunar17.intimidationModifier})`);
console.log(`wrote security-goon.json (AC ${securityGoon.ac}, HP ${securityGoon.maxHP}, ${securityGoon.strikes.length} strikes, ${securityGoon.reactions.length} reaction, ${securityGoon.actions.length} other action, intimidation +${securityGoon.intimidationModifier})`);
console.log(`wrote tapkey.json (AC ${tapkey.ac}, HP ${tapkey.maxHP}, ${tapkey.strikes.length} strikes, intimidation +${tapkey.intimidationModifier})`);
console.log(`wrote xenowarden-greenhorn.json (AC ${xenowardenGreenhorn.ac}, HP ${xenowardenGreenhorn.maxHP}, ${xenowardenGreenhorn.strikes.length} strikes, ${xenowardenGreenhorn.spells.length} spell, intimidation ${xenowardenGreenhorn.intimidationModifier})`);
console.log(`wrote bennit.json (AC ${bennit.ac}, HP ${bennit.maxHP}, ${bennit.strikes.length} strikes, ${bennit.saveAttacks.length} saveAttack (spell), intimidation +${bennit.intimidationModifier})`);
console.log(`wrote erabryth.json (AC ${erabryth.ac}, HP ${erabryth.maxHP}, ${erabryth.strikes.length} strikes, ${erabryth.conditionSaves.length} conditionSave, intimidation +${erabryth.intimidationModifier})`);
