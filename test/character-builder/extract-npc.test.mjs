/**
 * End-to-end correctness for tools/pack-extractor/extract-npc.mjs (design doc §19 Phase 2),
 * against Security Goon's REAL raw bestiary data. Unlike the PC side, there is no independent
 * derivation to cross-check against here — an NPC's numbers are already final in the raw data,
 * so this test is a pure transcription check: does the extractor reproduce the raw pack's own
 * numbers exactly, with zero invented values anywhere.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findNPC, toCombatant, deriveSpellAttacks, deriveConditionSave, deriveAreaAttack } from "../../tools/pack-extractor/extract-npc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const bestiaryDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "rulebook-bestiaries");
const alienCoreDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");

test("findNPC: locates Security Goon by exact name, with every embedded item attached", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  assert.ok(goon, "expected to find an NPC named exactly \"Security Goon\" in rulebook-bestiaries");
  assert.equal(goon.actor.type, "npc");
  assert.equal(goon.actor.system.details.level.value, 1);
  assert.ok(goon.items.length > 0);
});

test("findNPC: returns null (not throw) for a name that doesn't exist", () => {
  assert.equal(findNPC(bestiaryDir, "Definitely Not A Real NPC Name"), null);
});

test("toCombatant: defenses transcribed exactly — AC 14, HP 25/25, Fort 9 / Ref 5 / Will 4, Speed 20", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const combatant = toCombatant(goon, { strikeNames: ["Arc Pistol", "Baton"] });
  assert.equal(combatant.ac, 14);
  assert.equal(combatant.maxHP, 25);
  assert.equal(combatant.currentHP, 25);
  assert.deepEqual(combatant.saves, { fort: 9, ref: 5, will: 4 });
  assert.equal(combatant.speed, 20);
  assert.equal(combatant.side, "opposition");
});

test("toCombatant: Arc Pistol strike (ranged) — attack +9, damage 1d4+2 electricity, range increment 30, real traits", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const [arcPistol] = toCombatant(goon, { strikeNames: ["Arc Pistol"] }).strikes;
  assert.equal(arcPistol.strikeType, "ranged");
  assert.equal(arcPistol.attackBonus, 9);
  assert.equal(arcPistol.rangeIncrement, 30);
  assert.deepEqual(arcPistol.damage, [{ dice: "1d4", bonus: 2, damageType: "electricity" }]);
  assert.deepEqual(arcPistol.traits, ["arc", "expend-2", "reload-1", "tech"]);
});

test("toCombatant: Baton strike (melee) — attack +9, damage 1d6+3 bludgeoning, no range field at all", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const [baton] = toCombatant(goon, { strikeNames: ["Baton"] }).strikes;
  assert.equal(baton.strikeType, "melee");
  assert.equal(baton.attackBonus, 9);
  assert.equal(baton.rangeIncrement, undefined);
  assert.deepEqual(baton.damage, [{ dice: "1d6", bonus: 3, damageType: "bludgeoning" }]);
  assert.deepEqual(baton.traits, ["analog", "finesse", "nonlethal", "parry"]);
});

test("toCombatant: throws a clear error for a strike name that doesn't exist as a melee item, rather than silently omitting it", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  assert.throws(() => toCombatant(goon, { strikeNames: ["Not A Real Strike"] }), /No melee\/strike item named/);
});

test("toCombatant: 'Get Back!' is captured as a real, verbatim reaction — descriptive only, not mechanically wired (personnel-engine fires no reactions yet)", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const combatant = toCombatant(goon, { strikeNames: ["Arc Pistol", "Baton"] });
  const reaction = combatant.reactions.find((r) => r.name === "Get Back!");
  assert.ok(reaction, "expected a reaction named \"Get Back!\"");
  assert.equal(reaction.actionType, "reaction");
  assert.match(reaction.description, /jumps in the way of the attack/);
});

test("toCombatant: 'License to Break Bones' (a save-based, Prone-requiring action) is captured as descriptive data only — NOT wired as a strike, since this engine has no saving-throw mechanism", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const combatant = toCombatant(goon, { strikeNames: ["Arc Pistol", "Baton"] });
  const licenseToBreakBones = combatant.actions.find((a) => a.name === "License to Break Bones");
  assert.ok(licenseToBreakBones, "expected \"License to Break Bones\" among the descriptive actions list");
  assert.match(licenseToBreakBones.description, /fortitude/i);
  assert.equal(combatant.strikes.some((s) => s.name === "License to Break Bones"), false, "must never appear as a mechanically-wired strike");
});

test("toCombatant: Legal Lore is captured with its real modifier", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const combatant = toCombatant(goon, { strikeNames: [] });
  const legalLore = combatant.lore.find((l) => l.name === "Legal Lore");
  assert.ok(legalLore);
  assert.equal(legalLore.modifier, 2);
});

test("toCombatant: skills carries the real, final modifiers actually listed on the NPC — Athletics 8, Intimidation 6, nothing invented for the other 16 unlisted skills", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const combatant = toCombatant(goon, { strikeNames: [] });
  assert.deepEqual(combatant.skills, { athletics: 8, intimidation: 6 });
});

// --- deriveSpellAttacks (design doc §21's "bigger battlefield" follow-up — first NPC spellcaster) ---

test("deriveSpellAttacks: Gouging Claw on Xenowarden Greenhorn — attack bonus and DC come straight off her real spellcastingEntry, no ability-modifier math", () => {
  const xenowarden = findNPC(alienCoreDir, "Xenowarden Greenhorn");
  const [gougingClaw] = deriveSpellAttacks(xenowarden, ["Gouging Claw"]);
  assert.equal(gougingClaw.attackBonus, 6, "must equal her real spellcastingEntry.system.spelldc.value, not a derived number");
  assert.equal(gougingClaw.actions, 2);
  assert.ok(gougingClaw.traits.includes("attack"));
  assert.deepEqual(gougingClaw.damage, [{ dice: "2d6", bonus: 0, damageType: "untyped" }], "only the first (instant) damage entry — the 2 persistent bleed entry is a documented, deliberate scope cut, same as the PC side's firstSpellDamage");
});

test("deriveSpellAttacks: a \"touch\"-range spell maps to range:null, not a silent NaN — checkSpellRange's ?? fallback only catches null/undefined, and a NaN range would make the spell legally castable from anywhere on the map", () => {
  const xenowarden = findNPC(alienCoreDir, "Xenowarden Greenhorn");
  const [gougingClaw] = deriveSpellAttacks(xenowarden, ["Gouging Claw"]);
  assert.equal(gougingClaw.range, null);
  assert.notEqual(gougingClaw.range, NaN); // documents the bug this guards against, even though NaN !== NaN makes this assertion trivially true
  assert.ok(!Number.isNaN(gougingClaw.range));
});

test("deriveSpellAttacks: throws a clear error for a spell name that doesn't exist, rather than silently omitting it", () => {
  const xenowarden = findNPC(alienCoreDir, "Xenowarden Greenhorn");
  assert.throws(() => deriveSpellAttacks(xenowarden, ["Not A Real Spell"]), /No spell named/);
});

test("deriveSpellAttacks: throws for a real spell that has no \"attack\" trait (Scan Environment is pure exploration utility), rather than silently wiring a non-attack spell as an attack", () => {
  const xenowarden = findNPC(alienCoreDir, "Xenowarden Greenhorn");
  assert.throws(() => deriveSpellAttacks(xenowarden, ["Scan Environment"]), /not an attack-roll spell/);
});

// --- deriveConditionSave (design doc §22's 3v3 NPC-research follow-up — Erabryth's Forced Reflection, this project's first condition-only save action) ---

const FORCED_REFLECTION_OUTCOMES = {
  criticalSuccess: {},
  success: { frightened: 1 },
  failure: { stunnedValue: 1, frightened: 1 },
  criticalFailure: { stunnedValue: 2, frightened: 2 }
};

test("deriveConditionSave: Forced Reflection on Erabryth — DC comes straight off her real spellcastingEntry (matching the @Check[will|dc:17] embedded in her own description exactly, two independent sources agreeing), real 1 action", () => {
  const erabryth = findNPC(alienCoreDir, "Erabryth");
  const forcedReflection = deriveConditionSave(erabryth, { name: "Forced Reflection", saveType: "will", range: 60, outcomes: FORCED_REFLECTION_OUTCOMES });
  assert.equal(forcedReflection.dc, 17);
  assert.equal(forcedReflection.actions, 1);
  assert.equal(forcedReflection.saveType, "will");
  assert.equal(forcedReflection.range, 60);
  assert.deepEqual(forcedReflection.outcomes, FORCED_REFLECTION_OUTCOMES, "the outcome table is passed through exactly as supplied — this function derives the DC/range/actions, never invents the per-degree table itself");
});

test("deriveConditionSave: real traits are carried through (mental, fear, incapacitation, etc.)", () => {
  const erabryth = findNPC(alienCoreDir, "Erabryth");
  const forcedReflection = deriveConditionSave(erabryth, { name: "Forced Reflection", saveType: "will", range: 60, outcomes: FORCED_REFLECTION_OUTCOMES });
  assert.ok(forcedReflection.traits.includes("mental"));
  assert.ok(forcedReflection.traits.includes("fear"));
});

test("deriveConditionSave: throws a clear error for an action name that doesn't exist, rather than silently omitting it", () => {
  const erabryth = findNPC(alienCoreDir, "Erabryth");
  assert.throws(() => deriveConditionSave(erabryth, { name: "Not A Real Action", saveType: "will", range: 60, outcomes: {} }), /No action named/);
});

test("toCombatant: Erabryth's real Strikes (Ribbon/Fist/Light Ray) derive cleanly through the existing, unmodified lookup — the same real melee items the design doc §22 research verified all carry system.action:\"strike\"", () => {
  const erabryth = findNPC(alienCoreDir, "Erabryth");
  const combatant = toCombatant(erabryth, { strikeNames: ["Ribbon", "Fist", "Light Ray"] });
  assert.equal(combatant.strikes.length, 3);
  const ribbon = combatant.strikes.find((s) => s.name === "Ribbon");
  assert.ok(ribbon.traits.includes("reach-10"), "Ribbon's real reach-10 trait — the roster's first reach weapon");
});

// --- deriveAreaAttack (design doc §38, first NPC area/burst attack — Tough's real Frag Grenade,
// the exact gap every grenade-carrying fixture since §21 flagged as missing) ---

test("deriveAreaAttack: Frag Grenade on Tough — DC is 10+her real attack-row bonus (7), radius/range/damage all come straight off her raw data, usesRemaining from her real carried quantity", () => {
  const tough = findNPC(bestiaryDir, "Tough");
  const frag = deriveAreaAttack(tough, { name: "Frag Grenade (Commercial)", saveType: "ref", actions: 1 });
  assert.equal(frag.dc, 17, "10 + her real melee-item bonus.value of 7");
  assert.equal(frag.radius, 5, "her real system.area.value");
  assert.equal(frag.range, 70, "her real system.range.increment");
  assert.deepEqual(frag.damage, [{ dice: "1d8", bonus: 0, damageType: "piercing" }]);
  assert.equal(frag.usesRemaining, 1, "her real carried weapon-item quantity — a single grenade");
  assert.equal(frag.saveType, "ref");
  assert.equal(frag.actions, 1);
});

test("deriveAreaAttack: real traits are carried through (consumable, grenade, tech)", () => {
  const tough = findNPC(bestiaryDir, "Tough");
  const frag = deriveAreaAttack(tough, { name: "Frag Grenade (Commercial)", saveType: "ref", actions: 1 });
  for (const trait of ["consumable", "grenade", "tech"]) assert.ok(frag.traits.includes(trait), `expected real trait "${trait}", got: ${JSON.stringify(frag.traits)}`);
});

test("deriveAreaAttack: throws a clear error for an item name that doesn't exist, rather than silently omitting it", () => {
  const tough = findNPC(bestiaryDir, "Tough");
  assert.throws(() => deriveAreaAttack(tough, { name: "Not A Real Item", saveType: "ref", actions: 1 }), /No melee\/attack-row item named/);
});

test("deriveAreaAttack: throws for a real melee item that isn't actually an area-fire effect (Gun Bash is a plain Strike) — never silently mis-wires a real attack roll as a burst", () => {
  const tough = findNPC(bestiaryDir, "Tough");
  assert.throws(() => deriveAreaAttack(tough, { name: "Gun Bash", saveType: "ref", actions: 1 }), /not "area-fire"/);
});

test("deriveAreaAttack: throws for Scattergun — a real cone effect, but system.action is \"auto-fire\" (multi-target, not a basic-save burst) — never silently mis-wires an out-of-scope attack type", () => {
  const tough = findNPC(bestiaryDir, "Tough");
  assert.throws(() => deriveAreaAttack(tough, { name: "Scattergun", saveType: "ref", actions: 1 }), /not "area-fire"/);
});

test("deriveAreaAttack: throws for a genuine area-fire item whose area ISN'T a burst — the shape guard fires even when the action-type guard above wouldn't catch it (no real non-burst area-fire item exists yet to test against, so this constructs the raw shape directly)", () => {
  const fakeConeAreaFire = {
    name: "Synthetic Cone Grenade",
    items: [{ type: "melee", name: "Synthetic Cone Grenade", system: { action: "area-fire", area: { type: "cone", value: 15 }, bonus: { value: 5 }, damageRolls: { a: { damage: "1d6", damageType: "fire" } }, range: { increment: 30 }, traits: { value: [] } } }]
  };
  assert.throws(() => deriveAreaAttack(fakeConeAreaFire, { name: "Synthetic Cone Grenade", saveType: "ref", actions: 1 }), /burst-shaped area/);
});
