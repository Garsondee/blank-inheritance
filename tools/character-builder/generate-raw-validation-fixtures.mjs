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
import { listLevel1Pregens, toIngredients, findEquipmentItem } from "./extract-pregen.mjs";
import { deriveAbilityModifiers, deriveHP, derivePerception, deriveSavingThrows, deriveArmorClass } from "./derive.mjs";
import { deriveStrikes, deriveSpells, deriveSaveSpells, deriveTransferVitality, deriveHealSpellVariants, deriveAreaAttacks, deriveSkillModifier } from "./build-combat-pregen.mjs";
import { findNPC, toCombatant, deriveSpellAttacks, deriveConditionSave, deriveAreaAttack } from "../pack-extractor/extract-npc.mjs";

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
  // GH #60, design doc §60 Part 1 — the real Heal spell's two single-target, living-target variants,
  // COEXISTING with Transfer Vitality (a real class feature, drawing from a separate Vitality Network
  // resource pool — GH #55's own confirmed finding), not replacing it. Both Heal entries share ONE
  // real spellSlots pool, keyed by rank — her real rank-1 slot count (entry.system.slots.slot1.max),
  // the same structured field deriveSpellUsesRemaining already reads for every other non-cantrip spell.
  // GH #55: deriveTransferVitality deliberately never returns usesRemaining/usesPerEncounter — the
  // real limit is the Vitality Network feat's own regenerating resource pool, not a derivable per-day
  // slot count (see that function's own header). The hand-authored approximation (2 uses/encounter)
  // belongs here, at the fixture-construction site, per that same header's own citation.
  const transferVitality = { ...deriveTransferVitality(ingredients), usesRemaining: 2, usesPerEncounter: 2 };
  const healAbilities = [transferVitality, ...deriveHealSpellVariants(ingredients, "Heal")];
  const occultEntry = ingredients.spellcastingEntries.find((e) => e.name === "Occult Spontaneous Spells");
  const spellSlots = { 1: occultEntry.system.slots.slot1.max };
  // GH #65 (design doc §76 Phase 4): her real Incendiary Grenade, previously extracted-but-unwired
  // (see this fixture's own notes field for the full history) — now a real areaAttack, using the
  // area-effect mechanism GH #61 built. radius:5 is hand-supplied, matching her own real raw
  // description text's @Template[burst|distance:5] (deriveAreaAttacks' own header explains why this
  // isn't auto-parsed).
  const areaAttacks = deriveAreaAttacks(ingredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "ref", radius: 5 }], mods);
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);
  const athleticsModifier = deriveSkillModifier(ingredients, "athletics", mods);

  return {
    id: "raw-validation-lunar-17",
    name: "Lunar-17 (level-1 Mystic pregen, design doc §19 Pure RAW SF2E Validation — real Paizo Adventure Pregen, NOT one of the six real campaign kids)",
    side: "party",
    level: 1, // GH #63 — real; every pregen this project uses is explicitly level 1 by design
    initiativeModifier: perception.proficiency.modifier, // GH #63 — Player Core pg. 427: initiative is a Perception check
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    spells,
    healAbilities,
    spellSlots,
    areaAttacks,
    intimidationModifier, // real, untrained (+0) — her cha modifier is +0 and Intimidation isn't one of her trained skills
    athleticsModifier, // real, derived the same way (design doc §31's Trip/Shove/Grapple gap-fill) — untrained, her Str modifier
    heroPoints: 1, // Player Core pg. 405 — "each character gets 1 Hero Point at the start of a session" (design doc §42)
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — see test/character-builder/build-combat-pregen.test.mjs and tools/battle-simulator/DESIGN-LOG.md §19/§21. Transfer Vitality's healing amount (10, minimum 1) is hand-transcribed from real rule prose since no structured field exists for it — see build-combat-pregen.mjs's own citation. GH #55: usesRemaining/usesPerEncounter (2) are hand-authored here, NOT derived — the real limit isn't a per-day slot count but the Mystic's own 'vitality network' resource pool (Vitality Network feat, Player Core: capacity 6+4/level = 10 at level 1, regenerating 4 HP at the start of each of the caster's turns in combat — more if master/legendary in spell DC, refilling fully on Refocus), a mechanic this single-encounter simulator doesn't simulate HP-for-HP. At level 1 the pool's capacity exactly equals one use's cost (10=10), so a flat 2-per-encounter cap ('usable once at full charge, once more after a few turns' partial regen') is the same approximation already shipped for the level-12 Frame-scale Mystic (data/combatants.mjs's makeMysticFrame, pool 54 / cost 30 / also capped at 2 for the identical reason). The caster's own currentHP is correctly UNTOUCHED by this ability — Transfer Vitality draws from the network, never the caster's own HP total, confirmed directly against the real extracted rule text (not assumed from the ability's name). GH #65 (design doc §76 Phase 4): her Incendiary Grenade (Commercial) — real, extracted, but left UNWIRED from GH #55 through GH #64 (\"a 5ft-burst AREA effect, not a single-target attack... personnel-engine's saveAttack action is single-target only\") — is now a real areaAttack, using GH #61's own area-effect mechanism (deriveAreaAttacks, build-combat-pregen.mjs). GH #60 (design doc §60 Part 1): Heal (touch)/Heal (30ft) are her real rank-1 spell, confirmed on her own raw spell list (gamesystems/sf2e/packs/spells) — both entries share one real spellSlots pool (spellSlots.1, her actual rank-1 slot count from Occult Spontaneous Spells' own system.slots.slot1.max), separate from Transfer Vitality's own network-pool uses. Only the two single-target, living-target variants are wired — the 3-action emanation and the vs.-Undead variant are Part 1b, a deferred follow-on (see the design's own \"Explicitly deferred\" section)."
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
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained (+8) — her OTHER listed skill (design doc §31's Trip/Shove/Grapple gap-fill)
    notes: "Every number here is a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/rulebook-bestiaries) — NPCs store final, precomputed combat numbers, so no derivation was needed. See test/character-builder/extract-npc.test.mjs and tools/battle-simulator/DESIGN-LOG.md §19. \"License to Break Bones\" (a Fortitude-save, Prone-requiring action) is captured under `actions` for transcript honesty but is NOT a usable strike — this engine has no saving-throw mechanism."
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
  const areaAttacks = deriveAreaAttacks(ingredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "ref", radius: 5 }], mods); // GH #65
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);
  const athleticsModifier = deriveSkillModifier(ingredients, "athletics", mods);

  return {
    id: "raw-validation-tapkey",
    name: "Tapkey (level-1 Envoy pregen, design doc §21 — real Paizo Adventure Pregen, NOT one of the six real campaign kids)",
    side: "party",
    level: 1, // GH #63 — real; every pregen this project uses is explicitly level 1 by design
    initiativeModifier: perception.proficiency.modifier, // GH #63 — Player Core pg. 427: initiative is a Perception check
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    areaAttacks,
    intimidationModifier, // real, untrained (+4) — pure Charisma; Intimidation isn't one of her trained skills either, but her cha modifier (+4) is the roster's highest
    athleticsModifier, // real, derived the same way (design doc §31's Trip/Shove/Grapple gap-fill)
    heroPoints: 1, // Player Core pg. 405 — "each character gets 1 Hero Point at the start of a session" (design doc §42)
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — see test/character-builder/build-combat-pregen.test.mjs and tools/battle-simulator/DESIGN-LOG.md §21. Nano-edge Rapier and Boom Pistol both derive through the existing deriveStrikes unmodified — Tapkey needed zero new engine or extraction code, per the design doc §21 research survey of the 5 remaining Player Core pregens. GH #65 (design doc §76 Phase 4): her Incendiary Grenade (Commercial) — real, extracted, but left unwired through GH #64 (\"a 5ft-burst AREA effect, not a single-target attack\") — is now a real areaAttack via deriveAreaAttacks, using GH #61's own area-effect mechanism."
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
    athleticsModifier: combatant.skills.athletics ?? null, // real — Athletics IS one of her 3 listed skills (design doc §31's Trip/Shove/Grapple gap-fill)
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
  const areaAttacks = deriveAreaAttacks(ingredients, [{ name: "Frag Grenade (Commercial)", saveType: "ref", radius: 5 }], mods); // GH #65
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);
  const athleticsModifier = deriveSkillModifier(ingredients, "athletics", mods);

  return {
    id: "raw-validation-bennit",
    name: "“Nitpick” Bennit (level-1 Witchwarper pregen, design doc §22 — real Paizo Adventure Pregen, NOT one of the six real campaign kids)",
    side: "party",
    level: 1, // GH #63 — real; every pregen this project uses is explicitly level 1 by design
    initiativeModifier: perception.proficiency.modifier, // GH #63 — Player Core pg. 427: initiative is a Perception check
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    saveAttacks,
    areaAttacks,
    intimidationModifier,
    athleticsModifier, // real, derived the same way (design doc §31's Trip/Shove/Grapple gap-fill)
    heroPoints: 1, // Player Core pg. 405 — "each character gets 1 Hero Point at the start of a session" (design doc §42)
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — see test/character-builder/build-combat-pregen.test.mjs and tools/battle-simulator/DESIGN-LOG.md §22. Thunderstrike (a real basic-Reflex-save spell, 1d12 electricity + 1d4 sonic) is this project's first save-based SPELL — deriveSaveSpells reads its save type directly off the spell's own structured system.defense.save.statistic field (not hand-supplied prose-reading, unlike a weapon's save-based effect), and its DC from her real spellcasting DC (deriveSpellDC), not Class DC. usesRemaining (3) is her real spell-slot count (system.slots.slot1.max), not an invented number. GH #65 (design doc §76 Phase 4): her Frag Grenade (Commercial) — real, extracted, but left unwired through GH #64 (\"a 5ft-burst AREA effect, not a single-target attack\") — is now a real areaAttack via deriveAreaAttacks, using GH #61's own area-effect mechanism and her real Class DC (NOT deriveSpellDC — a weapon's DC is never her spellcasting DC, unlike Thunderstrike above)."
  };
}

/**
 * Third NPC (design doc §22's "3v3, and this time pick something that needs a real gap" ask —
 * research recommendation: Erabryth, alien-core-bestiary). Her Forced Reflection is this project's
 * first CONDITION-ONLY save action — the target rolls, but the effect is a per-degree table of
 * Frightened/Stunned, not damage — requiring a genuinely new engine mechanism (personnel-engine/
 * legality.mjs's checkConditionSaveLegal, engine.mjs's "conditionSave" action type, decide.mjs's
 * candidate generation, and evaluate/state-value.mjs's new stunDenial term, since nothing anywhere
 * priced `stunnedValue` before this). Her real Strikes (Ribbon/Fist/Light Ray) derive through the
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
      failure: { stunnedValue: 1, frightened: 1 },
      criticalFailure: { stunnedValue: 2, frightened: 2 }
    }
  })];
  return {
    id: "raw-validation-erabryth",
    ...combatant,
    conditionSaves,
    intimidationModifier: combatant.skills.intimidation ?? null,
    athleticsModifier: combatant.skills.athletics ?? null, // design doc §31's Trip/Shove/Grapple gap-fill — real if listed on her sheet, null (not invented) otherwise, same discipline as intimidationModifier just above
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Forced Reflection is this project's first condition-only save action (personnel-engine's new \"conditionSave\" action type, design doc §22) — a real per-degree table of Frightened/Stunned hand-transcribed from her verbatim description text, DC sourced from her real spellcastingEntry.spelldc.dc (17). \"Shepherd's Touch\" (a passive that adds extra void/vitality damage to her Strikes) and \"Buffering Zone\" (a standing 15ft aura with its own real but situational save) are real but NOT wired — the same honest-skip discipline already applied to every other NPC's situational passives in this project."
  };
}

/**
 * Fourth PC (design doc §38's 4v4 ask — "pick a new pregen and add it"). Of the 3 real Player Core
 * pregens still unused after §21/§22's own survey, only one is actually buildable: Jaedana's
 * toIngredients() throws on an ambiguous ability boost with no recorded resolution, and Old-Growth
 * Wildfire's one real weapon (Machine Gun) is Auto-Fire-only with no melee fallback on her sheet at
 * all — re-confirmed directly against the real pack data this session, not just trusted from the
 * old survey notes. Vorza Moonshot is the one genuinely viable pick, and her own real gap is
 * distinctive: her melee weapon is entirely a STANCE (Solar Manifestations, only exists while
 * attuned) — no static fallback item exists on her sheet at all, unlike a grenade or sidearm, so
 * there is nothing to extract a melee Strike FROM. Her real, achievable kit is one ranged Strike
 * (Zero Pistol) plus a real Demoralize.
 */
function buildVorzaMoonshot() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Vorza Moonshot");
  if (!pregen) throw new Error("Vorza Moonshot not found in paizo-pregens — Paizo may have renamed the pregen.");
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

  const strikes = deriveStrikes(ingredients, ["Zero Pistol"], mods);
  const areaAttacks = deriveAreaAttacks(ingredients, [{ name: "Electromag Grenade (Commercial)", saveType: "ref", radius: 5 }], mods); // GH #65
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);
  const athleticsModifier = deriveSkillModifier(ingredients, "athletics", mods);

  return {
    id: "raw-validation-vorza-moonshot",
    name: "Vorza Moonshot (level-1 Solarian pregen, design doc §38 — real Paizo Adventure Pregen, NOT one of the six real campaign kids)",
    side: "party",
    level: 1, // GH #63 — real; every pregen this project uses is explicitly level 1 by design
    initiativeModifier: perception.proficiency.modifier, // GH #63 — Player Core pg. 427: initiative is a Perception check
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    areaAttacks,
    intimidationModifier, // real, untrained (+0) — her Charisma modifier is +0, same flat number as Lunar-17's, not the roster's highest like Tapkey's
    athleticsModifier, // real, derived the same way (design doc §31's Trip/Shove/Grapple gap-fill)
    heroPoints: 1, // Player Core pg. 405 — "each character gets 1 Hero Point at the start of a session" (design doc §42)
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/paizo-pregens) — her derived HP (23) matches the pregen's own referenceHP field exactly. design doc §38: a Solarian's whole class fantasy (a Solar Weapon, manifested only while attuned) has NO static item representation on her real sheet at all — unlike every other PC's melee option, there is nothing to extract a Strike from, so she's ranged-only (Zero Pistol) by the real shape of her own kit, not an extraction shortfall. GH #65 (design doc §76 Phase 4, fixing a stale claim in this very note): her Electromag Grenade (Commercial) — real, extracted, but left unwired through GH #64 (\"a 5ft-burst AREA effect, not a single-target attack\") — is now a real areaAttack via deriveAreaAttacks, using GH #61's own area-effect mechanism. The DC is her real Class DC directly (deriveClassDC already includes SF2E's standard +10 baseline — Player Core's own '@Check[reflex|against:class|basic]' tag means exactly \"her Class DC,\" not \"10 plus her Class DC\") — CORRECTED here: this note previously claimed \"this project has never derived a PC's Class DC (only Spell DC)\", which was already stale by the time it was read for #65 — deriveClassDC has been called inside deriveSaveAttacks (build-combat-pregen.mjs) since design doc §19's own skill-actions-in-combat expansion, just never wired into a real fixture until now."
  };
}

/**
 * Fourth NPC (design doc §38's 4v4 ask — "pick a new NPC and add it"), and the demonstration
 * fixture for THIS pass's own gap-fill: Tough (rulebook-bestiaries) carries a real Frag Grenade
 * whose attack-row is a genuine system.action:"area-fire" burst — the first NPC (and first
 * combatant at all) to actually use the new areaAttack mechanism personnel-engine gained this
 * session. Her Gun Bash (system.action:"strike") derives as an ordinary melee Strike through the
 * existing, unmodified toCombatant, exactly matching the real §21 survey's own finding ("only Gun
 * Bash is a real Strike — the other two are area attacks... thinner than Security Goon already
 * is") — true then, and still true of her Scattergun (a real system.action:"auto-fire" cone, the
 * same out-of-scope multi-target category as Old-Growth Wildfire's Machine Gun, not attempted here).
 */
function buildTough() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "rulebook-bestiaries");
  const tough = findNPC(packDir, "Tough");
  if (!tough) throw new Error("Tough not found in rulebook-bestiaries — Paizo may have renamed the NPC.");
  const combatant = toCombatant(tough, { strikeNames: ["Gun Bash"] });
  const areaAttacks = [deriveAreaAttack(tough, { name: "Frag Grenade (Commercial)", saveType: "ref", actions: 1 })];
  return {
    id: "raw-validation-tough",
    ...combatant,
    areaAttacks,
    intimidationModifier: combatant.skills.intimidation ?? null, // real, trained (+4) — one of her 3 real listed skills (athletics/intimidation/thievery)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — ALSO one of her 3 listed skills (design doc §31's Trip/Shove/Grapple gap-fill)
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/rulebook-bestiaries) — see test/character-builder/extract-npc.test.mjs. Her Frag Grenade (Commercial) is this project's first NPC area/burst attack (personnel-engine's new \"areaAttack\" action type, design doc §38) — DC 17 (10 + her real attack-row bonus of 7, the standard 'attack bonus doubles as basic-save DC basis' convention this system uses for NPC area effects with no separately stored DC field), 5ft burst radius and 1d8 piercing damage both read straight off her real system.area.value/damageRolls, usesRemaining 1 from her real carried weapon-item quantity. Her Scattergun (system.action:\"auto-fire\", a real area-cone weapon) is NOT wired — the same out-of-scope multi-target category as every Auto-Fire/Suppressing-Fire weapon already flagged elsewhere in this project (Old-Growth Wildfire's Machine Gun, design doc §21's own survey)."
  };
}

/**
 * Fifth PC (design doc §39's ranged-combat/cover ask — "add a new Pregen PC and give them a long
 * range rifle like weapon"). Re-checked directly, not assumed: NO level-1 pregen in either real
 * pregen pack (paizo-pregens' 6, iconics' 6 — Zemir/Navasi still throw on the same ambiguous-boost
 * issue as Jaedana) carries anything past a 60ft pistol. "Give them a weapon" is met the same way a
 * real player would meet it — by buying one — using `findEquipmentItem` to pull a real, standalone
 * catalog item (Laser Rifle: level 0, simple category, 45sp, 100ft range, 1d8 fire) straight from
 * the general equipment compendium and pushing it into a real pregen's own `ingredients.weapons`
 * before deriving, rather than inventing a weapon's numbers by hand. Obozaya (Vesk Soldier,
 * `iconics`) is the pick: her real class carries trained Simple-weapon proficiency (`classAttacks.
 * simple: 1`), so a Laser Rifle is a mechanically legitimate weapon for her to wield, not just a
 * reskin. Her own real Doshko (melee, martial, 1d12 piercing) derives unmodified through the
 * existing deriveStrikes too, giving her a genuine melee fallback for when a fight closes distance —
 * exactly the kind of combatant this ranged/cover investigation needs.
 */
function buildObozaya() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "iconics");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Obozaya (Level 1)");
  if (!pregen) throw new Error("Obozaya (Level 1) not found in iconics — Paizo may have renamed the pregen.");
  const ingredients = toIngredients(pregen);
  const equipmentDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "equipment");
  const laserRifle = findEquipmentItem(equipmentDir, "Laser Rifle");
  if (!laserRifle) throw new Error("Laser Rifle not found in the equipment compendium — Paizo may have renamed the item.");
  ingredients.weapons = [...ingredients.weapons, laserRifle];
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

  const strikes = deriveStrikes(ingredients, ["Doshko", "Laser Rifle"], mods);
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);
  const athleticsModifier = deriveSkillModifier(ingredients, "athletics", mods);

  return {
    id: "raw-validation-obozaya",
    name: "Obozaya (level-1 Soldier iconic, design doc §39 — real Paizo iconic pregen, NOT one of the six real campaign kids)",
    side: "party",
    level: 1, // GH #63 — real; every pregen this project uses is explicitly level 1 by design
    initiativeModifier: perception.proficiency.modifier, // GH #63 — Player Core pg. 427: initiative is a Perception check
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    intimidationModifier, // real, untrained (+0) — her Charisma modifier is +0
    athleticsModifier, // real, derived the same way (design doc §31's Trip/Shove/Grapple gap-fill) — her Strength modifier, trained (Soldier class)
    heroPoints: 1, // Player Core pg. 405 — "each character gets 1 Hero Point at the start of a session" (design doc §42)
    notes: "HP/AC/saves/Doshko are every bit as real and derived as every other fixture (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against her own raw pack data (gamesystems/sf2e/packs/iconics) — her derived HP (24) matches the pregen's own referenceHP field exactly. Her Laser Rifle is a real catalog item (gamesystems/sf2e/packs/equipment, level 0, 45sp) pushed into her own ingredients before deriving — see extract-pregen.mjs's findEquipmentItem — rather than her own as-published loadout (her real sheet carries an Auto-Fire-only Machine Gun, the same out-of-scope weapon type already flagged on Old-Growth Wildfire, design doc §21). Every number on the resulting Strike (attack bonus, damage, range) is exactly what deriveStrikes would produce for any OTHER weapon her real Simple-weapon proficiency covers — the substitution is which item she's holding, not an invented bonus."
  };
}

/**
 * Sixth PC (GH #65, design doc §76 Phase 4) — the roster's first flanking rogue, the last of the
 * six tactical roles still missing a real PC-side exemplar. The design doc rules Operatives out
 * TWICE (`:1061`, `:1922`) on the basis that Jaedana throws on an ambiguous ability boost — but that
 * ONLY rules out Jaedana; re-checked directly against the real iconics pack (not re-trusted from
 * that old survey): "Iseph (Level 1)" is a SECOND, distinct Operative pregen that derives completely
 * clean, HP 18 matching their own real referenceHP exactly (their own raw system.details.gender.value
 * is blank, so this file uses they/them throughout — no published pronoun to cite). Their Zero Knife
 * (agile + finesse — exactly a flanker's weapon shape) and Semi-Auto Pistol both derive unmodified
 * through the existing deriveStrikes, needing zero new engine or extraction code, same as every
 * other "zero new code" pick in this roster (Tapkey, Akata, etc.).
 */
function buildIseph() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "iconics");
  const pregen = listLevel1Pregens(packDir).find((p) => p.name === "Iseph (Level 1)");
  if (!pregen) throw new Error("Iseph (Level 1) not found in iconics — Paizo may have renamed the pregen.");
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

  const strikes = deriveStrikes(ingredients, ["Zero Knife", "Semi-Auto Pistol"], mods);
  const areaAttacks = deriveAreaAttacks(ingredients, [{ name: "Incendiary Grenade (Commercial)", saveType: "ref", radius: 5 }], mods);
  const intimidationModifier = deriveSkillModifier(ingredients, "intimidation", mods);
  const athleticsModifier = deriveSkillModifier(ingredients, "athletics", mods);

  return {
    id: "raw-validation-iseph",
    name: "Iseph (level-1 Operative pregen, design doc §76 Phase 4 — real Paizo iconic pregen, NOT one of the six real campaign kids)",
    side: "party",
    level: 1, // GH #63 — real; every pregen this project uses is explicitly level 1 by design
    initiativeModifier: perception.proficiency.modifier, // GH #63 — Player Core pg. 427: initiative is a Perception check
    maxHP: hp.max,
    currentHP: hp.max,
    ac: ac.value,
    saves: { fort: saves.fortitude.modifier, ref: saves.reflex.modifier, will: saves.will.modifier },
    perception: perception.proficiency.modifier,
    speed: ingredients.speed,
    strikes,
    areaAttacks,
    intimidationModifier, // real, UNTRAINED and NEGATIVE (-1) — their Charisma modifier is negative and Intimidation isn't one of their trained skills; the roster's first negative skill modifier, a real, honest number, not clamped to 0
    athleticsModifier, // real, trained (design doc §31's Trip/Shove/Grapple gap-fill) — IS one of their real trained skills
    heroPoints: 1, // Player Core pg. 405 — "each character gets 1 Hero Point at the start of a session" (design doc §42)
    notes: "Every combat number here is real, derived SF2E math (tools/character-builder/derive.mjs + build-combat-pregen.mjs), cross-checked against their own raw pack data (gamesystems/sf2e/packs/iconics) — their derived HP (18) matches the pregen's own referenceHP field exactly (the raw data's own system.details.gender.value is blank — no published pronoun to cite, so this note uses they/them throughout rather than guessing). GH #65 (design doc §76 Phase 4): the roster's first flanking-rogue-shaped PC — Zero Knife (agile/finesse/versatile-p, real 1d4+1 cold) and Semi-Auto Pistol (analog, real 1d6 piercing) both derive unmodified through deriveStrikes. Their real Incendiary Grenade (Commercial) is wired as a real areaAttack from the start (deriveAreaAttacks, GH #61's own area-effect mechanism) rather than shipping unwired-then-fixed like the other four PCs' own grenades — the same real DC 17 Class DC every other level-1 PC in this roster with a +4 key ability modifier also has."
  };
}

/**
 * Fifth NPC (design doc §39's ranged-combat/cover ask — "add a new NPC and find one with a long
 * range weapon"), and the roster's actual long-range answer: unlike Obozaya's substituted rifle,
 * Kuriaku (`starfinder-society-bestiary`, a pack not previously scanned — re-checked all level-1
 * NPCs across it directly, not assumed empty) carries a real Shobhad Longrifle AS PUBLISHED — a
 * genuine `system.action:"strike"` attack, 120ft range, the longest range of any combatant this
 * project has ever fielded (outranging even Obozaya's own new 100ft rifle by a full increment).
 * Her Antlers give her a real natural-weapon melee fallback, derived unmodified through the
 * existing toCombatant, matching Erabryth/Xenowarden Greenhorn's own natural-weapon pattern.
 */
function buildKuriaku() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "starfinder-society-bestiary");
  const kuriaku = findNPC(packDir, "Kuriaku");
  if (!kuriaku) throw new Error("Kuriaku not found in starfinder-society-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(kuriaku, { strikeNames: ["Shobhad Longrifle", "Antlers"] });
  return {
    id: "raw-validation-kuriaku",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: Intimidation isn't one of her 5 listed skills (acrobatics/athletics/crafting/performance/stealth)
    athleticsModifier: combatant.skills.athletics ?? null, // real — Athletics IS one of her 5 listed skills (design doc §31's Trip/Shove/Grapple gap-fill)
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/starfinder-society-bestiary) — see test/character-builder/extract-npc.test.mjs. Her Shobhad Longrifle carries several real traits this engine does NOT mechanically model, flagged honestly rather than silently dropped: 'volley-30' (a real -2 penalty when the target is within 30ft, the opposite of most ranged weapons — this project has no range-banded-penalty mechanism at all yet), 'fatal-d12' (upgrades the damage die on a critical hit), 'kickback' (a real self-damage/knockback cost to the wielder), 'backstabber' (bonus damage against a flat-footed target). Her real Reverberant Antlers/Grab/Knockdown actions are captured verbatim under `actions` for transcript honesty but are NOT wired — Grab/Knockdown both require a maneuver-and-persistent-condition mechanism (Grabbed/Restrained tracking) this engine doesn't have, the same honest-skip discipline as every other NPC's situational specials in this project."
  };
}

/**
 * GH #64 (design doc §76 Phase 4, "the cheapest item in the programme") — ten more opposition NPCs,
 * chosen from the issue's own pre-vetted "suggested varied ten" survey (all confirmed extractable
 * directly, not re-guessed here): a level -1..1 spread, six real trait categories (animal/beast/
 * undead/construct/aberration/mindless/tech/humanoid), pure attack-roll kits throughout — none of
 * these ten needed deriveSpellAttacks/deriveConditionSave/deriveAreaAttack, unlike three of the
 * original five NPCs, since none carries a save-based special or an area/spell attack worth wiring.
 * Every one follows buildSecurityGoon()'s own minimal shape exactly — a real, final NPC statblock,
 * no derivation, ~12 lines each, per the issue's own estimate.
 *
 * GH #57's own caveat applies to all ten identically, not restated per-function: every reaction and
 * every plain `action`-type item below is captured under `reactions`/`actions` for transcript
 * honesty only — personnel-engine's move branch fires a reaction ONLY for one named exactly
 * "Reactive Strike" (flanking.mjs's hasReactiveStrike), which none of these ten happen to have —
 * so these ten are, like the original five's own Security Goon/Xenowarden/Tough, systematically
 * weaker in play than their real Paizo XP budget assumes.
 */
function buildKhefak() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const khefak = findNPC(packDir, "Khefak");
  if (!khefak) throw new Error("Khefak not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(khefak, { strikeNames: ["Claw", "Jaws"] });
  return {
    id: "raw-validation-khefak",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: not one of its 2 listed skills (athletics/survival)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — IS one of its 2 listed skills
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level -1 swarm-filler pick (design doc §76 Phase 4, GH #64's own suggested-ten survey): Claw (agile, real 1d6+2 slashing) and Jaws (real 1d8+2 piercing) both derive unmodified through the existing toCombatant. \"Gnaw Scrap\" is a real passive, captured under `actions` for transcript honesty, not mechanically wired (an exploration-trait ability, not combat-relevant)."
  };
}

function buildScrapRat() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const scrapRat = findNPC(packDir, "Scrap Rat");
  if (!scrapRat) throw new Error("Scrap Rat not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  // CORRECTION (GH #148): GH #64's own closing comment claimed this was "a genuine single-target
  // thrown Strike, not a burst/area effect" — checked again directly while investigating #148, and
  // that was wrong. Its real system.action is "area-fire" with a real burst area (value 5), the
  // IDENTICAL shape to Tough's already-wired Frag Grenade (Commercial) — a real areaAttack, not a
  // Strike. Wired the correct way below via deriveAreaAttack. Her melee-type attack-row item is named
  // plain "Frag Grenade" (no "(Commercial)" suffix), while her weapon-type carried item is named "Frag
  // Grenade (Commercial)" — a real name mismatch Tough's own data doesn't have, handled via
  // deriveAreaAttack's carriedWeaponName override rather than assuming the two always match.
  const combatant = toCombatant(scrapRat, { strikeNames: ["Tail"] });
  const areaAttacks = [deriveAreaAttack(scrapRat, { name: "Frag Grenade", saveType: "ref", actions: 1, carriedWeaponName: "Frag Grenade (Commercial)" })];
  return {
    id: "raw-validation-scrap-rat",
    ...combatant,
    areaAttacks,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: not one of its 4 listed skills (acrobatics/crafting/stealth/thievery)
    athleticsModifier: combatant.skills.athletics ?? null, // real: ALSO not one of its 4 listed skills — Acrobatics is its mobility skill instead
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level -1 pick (design doc §76 Phase 4, GH #64's own suggested-ten survey), melee-only strike: Tail (agile/finesse/razing) derives unmodified through the existing toCombatant. Its real \"Frag Grenade\" is a genuine area-fire burst (GH #148 correction — GH #64's own closing comment mischaracterized it as a single-target thrown Strike without checking system.action) — DC 13 (10 + its real attack-row bonus of 3), 5ft burst radius and 1d8 piercing damage read straight off its real system.area.value/damageRolls, usesRemaining 1 from its real carried weapon-item quantity (looked up by its own real, differently-suffixed name via deriveAreaAttack's carriedWeaponName). Its real range is stored under system.range.max (70), not .increment — a second real cross-pack shape inconsistency deriveAreaAttack's own range derivation now also reads correctly (see its docstring). \"Dangerous Recycling\"/\"Scoring\" are real passives, captured under `actions` for transcript honesty, not mechanically wired."
  };
}

function buildCyberneticZombie() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const zombie = findNPC(packDir, "Cybernetic Zombie");
  if (!zombie) throw new Error("Cybernetic Zombie not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(zombie, { strikeNames: ["Laser Pistol", "Fist"] });
  return {
    id: "raw-validation-cybernetic-zombie",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: not its one listed skill (athletics)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — its only listed skill
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level -1 HP-sponge pick (design doc §76 Phase 4, GH #64's own suggested-ten survey, HP 40 vs. every other level -1..0 pick's 7-26): Laser Pistol (ranged, tech) and Fist (unarmed melee) both derive unmodified through the existing toCombatant. \"Self-Destruct\" is a real reaction, captured under `reactions` for transcript honesty, not mechanically wired — its trigger (real death) is a structurally different shape from the one reaction this engine fires (GH #18's movement-triggered Reactive Strike). \"Cybernetics\"/\"Void Healing\" are real passives, captured under `actions`, not mechanically wired (this engine has no positive-vs-negative-healing-polarity mechanism for the latter)."
  };
}

function buildJinsulTrooper() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const trooper = findNPC(packDir, "Jinsul Trooper");
  if (!trooper) throw new Error("Jinsul Trooper not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(trooper, { strikeNames: ["Laser Rifle", "Leg Blade"] });
  return {
    id: "raw-validation-jinsul-trooper",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real, trained — IS one of its 3 listed skills (athletics/intimidation/survival)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — ALSO one of its 3 listed skills
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level 0 ranged pick (design doc §76 Phase 4, GH #64's own suggested-ten survey): Laser Rifle (100ft range, tech) derives unmodified. Its real Leg Blade carries a SECOND damage-roll entry (1 persistent bleed) this project does not model — toCombatant only ever reads the first entry (1d4+1 slashing) — the same honest, already-documented limitation as Xenowarden Greenhorn's own real second damage entry. \"Strider Leap\" is a real action, captured under `actions`, not mechanically wired (no dedicated movement-ability mechanism exists). \"All-Around Vision\" is a real passive, likewise captured but not wired."
  };
}

function buildSpaceGoblinMiscreant() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "rulebook-bestiaries");
  const goblin = findNPC(packDir, "Space Goblin Miscreant");
  if (!goblin) throw new Error("Space Goblin Miscreant not found in rulebook-bestiaries — Paizo may have renamed the NPC.");
  const combatant = toCombatant(goblin, { strikeNames: ["Dogslicer", "Bigger Boom Pistol"] });
  return {
    id: "raw-validation-space-goblin-miscreant",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: not one of its 4 listed skills (acrobatics/athletics/stealth/thievery)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — IS one of its 4 listed skills
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/rulebook-bestiaries) — see test/character-builder/extract-npc.test.mjs. Level 1 melee+ranged pick (design doc §76 Phase 4, GH #64's own suggested-ten survey): Dogslicer (agile/finesse melee) and Bigger Boom Pistol (tech, real boost-1d6/razing traits — the boost isn't mechanically applied, same class of unmodeled-trait honesty as Kuriaku's own rifle) both derive unmodified through the existing toCombatant. \"Goblin Scuttle\" is a real reaction, captured under `reactions` for transcript honesty, not mechanically wired — a movement-triggered-on-hit shape distinct from the one reaction this engine fires."
  };
}

function buildAkata() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const akata = findNPC(packDir, "Akata");
  if (!akata) throw new Error("Akata not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(akata, { strikeNames: ["Jaws"] });
  return {
    id: "raw-validation-akata",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: not one of its 3 listed skills (acrobatics/athletics/stealth)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — IS one of its 3 listed skills
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level 1 pure-melee-beast pick (design doc §76 Phase 4, GH #64's own suggested-ten survey), only one real Strike (Jaws, agile/unarmed) — its real Hibernation/No Hearing/No Breath/Salt Water Vulnerability/Void Death traits are all real passives with no combat-roll effect of their own (sensory/environmental, not damage/save mechanics), captured under `actions` for transcript honesty, not mechanically wired."
  };
}

function buildVoidZombie() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const zombie = findNPC(packDir, "Void Zombie");
  if (!zombie) throw new Error("Void Zombie not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(zombie, { strikeNames: ["Fist", "Feeding Tendril"] });
  return {
    id: "raw-validation-void-zombie",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: not its one listed skill (athletics)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — its only listed skill
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level 1 undead-brute pick (design doc §76 Phase 4, GH #64's own suggested-ten survey): Fist (unarmed) and Feeding Tendril (agile) both derive unmodified through the existing toCombatant. \"Feed on Blood\" is a real action, captured under `actions`, not mechanically wired (a real-HP-drain-and-heal ability this project's single-damage-type strike shape doesn't represent). \"Salt Water Vulnerability\"/\"Void Healing\" are real passives, likewise captured but not wired."
  };
}

function buildObserverClassSecurityRobot() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const robot = findNPC(packDir, "Observer-Class Security Robot");
  if (!robot) throw new Error("Observer-Class Security Robot not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(robot, { strikeNames: ["Body", "Pulsecaster Pistol"] });
  return {
    id: "raw-validation-observer-class-security-robot",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: not one of its 3 listed skills (acrobatics/athletics/computers)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — IS one of its 3 listed skills
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level 1 high-Reflex construct pick (design doc §76 Phase 4, GH #64's own suggested-ten survey, real Reflex +10 — the highest save on any fixture in this project to date): Body (unarmed melee) and Pulsecaster Pistol (tech, nonlethal — the nonlethal trait isn't mechanically modeled, this engine has no separate nonlethal-damage/unconscious-not-dying track) both derive unmodified through the existing toCombatant. \"Exigency\" is a real reaction, captured under `reactions` for transcript honesty, not mechanically wired — an HP-threshold-triggered shape distinct from the one reaction this engine fires."
  };
}

function buildCorpseFleetInfantry() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const infantry = findNPC(packDir, "Corpse Fleet Infantry");
  if (!infantry) throw new Error("Corpse Fleet Infantry not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  // Its real raw data carries a SECOND, redundant "Autotarget Rifle" melee item (a close-combat-bash
  // profile of the same weapon, range: null) — toCombatant's own name-based lookup can only ever
  // address the first of a repeated name, which the raw data's own item order happens to make the
  // real RANGED profile (range increment 30, matching the issue's own "three weapons" framing), the
  // same "can't address a repeated name, the useful one wins by order" situation Xenowarden
  // Greenhorn's own build function already documented for her two real "Knife" items.
  const combatant = toCombatant(infantry, { strikeNames: ["Arc Pistol", "Autotarget Rifle", "Battleglove"] });
  return {
    id: "raw-validation-corpse-fleet-infantry",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real, trained — IS one of its 3 listed skills (acrobatics/athletics/intimidation)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — ALSO one of its 3 listed skills
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level 1 three-weapon pick (design doc §76 Phase 4, GH #64's own suggested-ten survey): Arc Pistol (arc/tech), Autotarget Rifle (analog/automatic — the automatic trait isn't mechanically modeled, the same honest-trait-gap discipline already applied to Kuriaku's own rifle), and Battleglove (agile/free-hand melee) all derive unmodified through the existing toCombatant; its real second, close-combat \"Autotarget Rifle\" melee profile is not addressable by name (see this function's own comment) and isn't needed — three distinct real weapons is exactly this pick's own point. \"Coordinated Shuffle\" is a real reaction, captured under `reactions`, not mechanically wired. \"Void Healing\"/\"Fusillade\" are real passives, likewise captured but not wired."
  };
}

function buildAssemblyOoze() {
  const packDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const ooze = findNPC(packDir, "Assembly Ooze");
  if (!ooze) throw new Error("Assembly Ooze not found in alien-core-bestiary — Paizo may have renamed the NPC.");
  const combatant = toCombatant(ooze, { strikeNames: ["Pseudopod"] });
  return {
    id: "raw-validation-assembly-ooze",
    ...combatant,
    intimidationModifier: combatant.skills.intimidation ?? null, // real: not one of its 2 listed skills (athletics/stealth)
    athleticsModifier: combatant.skills.athletics ?? null, // real, trained — IS one of its 2 listed skills
    notes: "Strikes/defenses are a direct transcription of the real bestiary statblock (gamesystems/sf2e/packs/alien-core-bestiary) — see test/character-builder/extract-npc.test.mjs. Level 1 damage-sponge pick (design doc §76 Phase 4, GH #64's own suggested-ten survey, AC 11 / HP 54, the lowest AC and joint-highest HP of any fixture in this project to date). Its real Pseudopod carries TWO real, non-persistent damage-roll entries on the SAME strike (1d6 bludgeoning AND 1d4 acid) — a genuinely different, more consequential gap than Jinsul Trooper's/Xenowarden Greenhorn's own dropped PERSISTENT entries: toCombatant only ever reads the first entry, so the real acid component is silently absent, not merely a secondary/over-time effect. Flagged honestly rather than hidden — fixing it would mean extending toCombatant's single-damage-type Strike shape (and personnel-engine's own single-damage-type resolution, which reads only `strike.damage[0]` throughout) to a real multi-damage-type model, a genuinely separate, larger change than this content-import ticket's own scope. \"Techsense\"/\"Assemble\" are real passives, captured under `actions`, not mechanically wired. \"Disassemble\"/\"Sticky Disarm\" are real actions, likewise captured but not wired (no dedicated disarm/self-destruct mechanism exists)."
  };
}

const lunar17 = buildLunar17();
const securityGoon = buildSecurityGoon();
const tapkey = buildTapkey();
const xenowardenGreenhorn = buildXenowardenGreenhorn();
const bennit = buildBennit();
const erabryth = buildErabryth();
const vorzaMoonshot = buildVorzaMoonshot();
const tough = buildTough();
const obozaya = buildObozaya();
const iseph = buildIseph();
const kuriaku = buildKuriaku();
const khefak = buildKhefak();
const scrapRat = buildScrapRat();
const cyberneticZombie = buildCyberneticZombie();
const jinsulTrooper = buildJinsulTrooper();
const spaceGoblinMiscreant = buildSpaceGoblinMiscreant();
const akata = buildAkata();
const voidZombie = buildVoidZombie();
const observerClassSecurityRobot = buildObserverClassSecurityRobot();
const corpseFleetInfantry = buildCorpseFleetInfantry();
const assemblyOoze = buildAssemblyOoze();

writeFileSync(path.join(outDir, "lunar-17.json"), JSON.stringify(lunar17, null, 2) + "\n");
writeFileSync(path.join(outDir, "security-goon.json"), JSON.stringify(securityGoon, null, 2) + "\n");
writeFileSync(path.join(outDir, "tapkey.json"), JSON.stringify(tapkey, null, 2) + "\n");
writeFileSync(path.join(outDir, "xenowarden-greenhorn.json"), JSON.stringify(xenowardenGreenhorn, null, 2) + "\n");
writeFileSync(path.join(outDir, "bennit.json"), JSON.stringify(bennit, null, 2) + "\n");
writeFileSync(path.join(outDir, "erabryth.json"), JSON.stringify(erabryth, null, 2) + "\n");
writeFileSync(path.join(outDir, "vorza-moonshot.json"), JSON.stringify(vorzaMoonshot, null, 2) + "\n");
writeFileSync(path.join(outDir, "tough.json"), JSON.stringify(tough, null, 2) + "\n");
writeFileSync(path.join(outDir, "obozaya.json"), JSON.stringify(obozaya, null, 2) + "\n");
writeFileSync(path.join(outDir, "iseph.json"), JSON.stringify(iseph, null, 2) + "\n");
writeFileSync(path.join(outDir, "kuriaku.json"), JSON.stringify(kuriaku, null, 2) + "\n");
writeFileSync(path.join(outDir, "khefak.json"), JSON.stringify(khefak, null, 2) + "\n");
writeFileSync(path.join(outDir, "scrap-rat.json"), JSON.stringify(scrapRat, null, 2) + "\n");
writeFileSync(path.join(outDir, "cybernetic-zombie.json"), JSON.stringify(cyberneticZombie, null, 2) + "\n");
writeFileSync(path.join(outDir, "jinsul-trooper.json"), JSON.stringify(jinsulTrooper, null, 2) + "\n");
writeFileSync(path.join(outDir, "space-goblin-miscreant.json"), JSON.stringify(spaceGoblinMiscreant, null, 2) + "\n");
writeFileSync(path.join(outDir, "akata.json"), JSON.stringify(akata, null, 2) + "\n");
writeFileSync(path.join(outDir, "void-zombie.json"), JSON.stringify(voidZombie, null, 2) + "\n");
writeFileSync(path.join(outDir, "observer-class-security-robot.json"), JSON.stringify(observerClassSecurityRobot, null, 2) + "\n");
writeFileSync(path.join(outDir, "corpse-fleet-infantry.json"), JSON.stringify(corpseFleetInfantry, null, 2) + "\n");
writeFileSync(path.join(outDir, "assembly-ooze.json"), JSON.stringify(assemblyOoze, null, 2) + "\n");

console.log(`wrote lunar-17.json (AC ${lunar17.ac}, HP ${lunar17.maxHP}, ${lunar17.strikes.length} strikes, ${lunar17.spells.length} spell, ${lunar17.healAbilities.length} heal abilities, spellSlots ${JSON.stringify(lunar17.spellSlots)}, intimidation +${lunar17.intimidationModifier})`);
console.log(`wrote security-goon.json (AC ${securityGoon.ac}, HP ${securityGoon.maxHP}, ${securityGoon.strikes.length} strikes, ${securityGoon.reactions.length} reaction, ${securityGoon.actions.length} other action, intimidation +${securityGoon.intimidationModifier})`);
console.log(`wrote tapkey.json (AC ${tapkey.ac}, HP ${tapkey.maxHP}, ${tapkey.strikes.length} strikes, intimidation +${tapkey.intimidationModifier})`);
console.log(`wrote xenowarden-greenhorn.json (AC ${xenowardenGreenhorn.ac}, HP ${xenowardenGreenhorn.maxHP}, ${xenowardenGreenhorn.strikes.length} strikes, ${xenowardenGreenhorn.spells.length} spell, intimidation ${xenowardenGreenhorn.intimidationModifier})`);
console.log(`wrote bennit.json (AC ${bennit.ac}, HP ${bennit.maxHP}, ${bennit.strikes.length} strikes, ${bennit.saveAttacks.length} saveAttack (spell), intimidation +${bennit.intimidationModifier})`);
console.log(`wrote erabryth.json (AC ${erabryth.ac}, HP ${erabryth.maxHP}, ${erabryth.strikes.length} strikes, ${erabryth.conditionSaves.length} conditionSave, intimidation +${erabryth.intimidationModifier})`);
console.log(`wrote vorza-moonshot.json (AC ${vorzaMoonshot.ac}, HP ${vorzaMoonshot.maxHP}, ${vorzaMoonshot.strikes.length} strikes, intimidation +${vorzaMoonshot.intimidationModifier})`);
console.log(`wrote tough.json (AC ${tough.ac}, HP ${tough.maxHP}, ${tough.strikes.length} strikes, ${tough.areaAttacks.length} areaAttack, intimidation +${tough.intimidationModifier})`);
console.log(`wrote obozaya.json (AC ${obozaya.ac}, HP ${obozaya.maxHP}, ${obozaya.strikes.length} strikes incl. a ${obozaya.strikes.find((s) => s.name === "Laser Rifle")?.rangeIncrement}ft rifle, intimidation +${obozaya.intimidationModifier})`);
console.log(`wrote iseph.json (AC ${iseph.ac}, HP ${iseph.maxHP}, ${iseph.strikes.length} strikes, ${iseph.areaAttacks.length} areaAttack, intimidation ${iseph.intimidationModifier})`);
console.log(`wrote kuriaku.json (AC ${kuriaku.ac}, HP ${kuriaku.maxHP}, ${kuriaku.strikes.length} strikes incl. a ${kuriaku.strikes.find((s) => s.name === "Shobhad Longrifle")?.rangeIncrement}ft rifle, intimidation ${kuriaku.intimidationModifier})`);
console.log(`wrote khefak.json (level ${khefak.level}, AC ${khefak.ac}, HP ${khefak.maxHP}, ${khefak.strikes.length} strikes, initiative +${khefak.initiativeModifier})`);
console.log(`wrote scrap-rat.json (level ${scrapRat.level}, AC ${scrapRat.ac}, HP ${scrapRat.maxHP}, ${scrapRat.strikes.length} strikes, ${scrapRat.areaAttacks.length} areaAttack, initiative +${scrapRat.initiativeModifier})`);
console.log(`wrote cybernetic-zombie.json (level ${cyberneticZombie.level}, AC ${cyberneticZombie.ac}, HP ${cyberneticZombie.maxHP}, ${cyberneticZombie.strikes.length} strikes, ${cyberneticZombie.reactions.length} reaction, initiative +${cyberneticZombie.initiativeModifier})`);
console.log(`wrote jinsul-trooper.json (level ${jinsulTrooper.level}, AC ${jinsulTrooper.ac}, HP ${jinsulTrooper.maxHP}, ${jinsulTrooper.strikes.length} strikes, initiative +${jinsulTrooper.initiativeModifier})`);
console.log(`wrote space-goblin-miscreant.json (level ${spaceGoblinMiscreant.level}, AC ${spaceGoblinMiscreant.ac}, HP ${spaceGoblinMiscreant.maxHP}, ${spaceGoblinMiscreant.strikes.length} strikes, ${spaceGoblinMiscreant.reactions.length} reaction, initiative +${spaceGoblinMiscreant.initiativeModifier})`);
console.log(`wrote akata.json (level ${akata.level}, AC ${akata.ac}, HP ${akata.maxHP}, ${akata.strikes.length} strikes, initiative +${akata.initiativeModifier})`);
console.log(`wrote void-zombie.json (level ${voidZombie.level}, AC ${voidZombie.ac}, HP ${voidZombie.maxHP}, ${voidZombie.strikes.length} strikes, initiative +${voidZombie.initiativeModifier})`);
console.log(`wrote observer-class-security-robot.json (level ${observerClassSecurityRobot.level}, AC ${observerClassSecurityRobot.ac}, HP ${observerClassSecurityRobot.maxHP}, ${observerClassSecurityRobot.strikes.length} strikes, ${observerClassSecurityRobot.reactions.length} reaction, initiative +${observerClassSecurityRobot.initiativeModifier})`);
console.log(`wrote corpse-fleet-infantry.json (level ${corpseFleetInfantry.level}, AC ${corpseFleetInfantry.ac}, HP ${corpseFleetInfantry.maxHP}, ${corpseFleetInfantry.strikes.length} strikes, ${corpseFleetInfantry.reactions.length} reaction, initiative +${corpseFleetInfantry.initiativeModifier})`);
console.log(`wrote assembly-ooze.json (level ${assemblyOoze.level}, AC ${assemblyOoze.ac}, HP ${assemblyOoze.maxHP}, ${assemblyOoze.strikes.length} strikes, initiative +${assemblyOoze.initiativeModifier})`);
