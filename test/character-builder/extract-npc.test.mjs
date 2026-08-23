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
import { findNPC, toCombatant, deriveSpellAttacks } from "../../tools/pack-extractor/extract-npc.mjs";

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
