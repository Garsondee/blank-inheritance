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

// GH #63: level/initiativeModifier are real, final NPC data (system.details.level.value,
// system.perception.mod) — no derivation needed, same "NPCs store final numbers" shape as AC/saves.
test("toCombatant: level and initiativeModifier transcribed exactly — level 1, Perception mod +4", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const combatant = toCombatant(goon, { strikeNames: ["Arc Pistol", "Baton"] });
  assert.equal(combatant.level, 1);
  assert.equal(combatant.initiativeModifier, 4);
});

test("toCombatant: throws a clear error rather than silently deriving initiativeModifier from the wrong statistic, for an NPC whose initiative isn't Perception-based", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const stealthInitiativeNPC = {
    ...goon,
    actor: { ...goon.actor, system: { ...goon.actor.system, initiative: { statistic: "stealth" } } }
  };
  assert.throws(() => toCombatant(stealthInitiativeNPC, { strikeNames: ["Arc Pistol", "Baton"] }), /initiative uses "stealth", not Perception/);
});

// GH #64: found while wiring Assembly Ooze, whose real Pseudopod carries two REAL, non-persistent
// damage entries (1d6 bludgeoning AND 1d4 acid, both always apply, no over-time/secondary framing at
// all) — genuinely different from the already-documented "second entry is persistent bleed/flavor"
// case (Xenowarden Greenhorn's Gouging Claw, Jinsul Trooper's Leg Blade), where dropping it loses
// only a minor secondary effect. Here the dropped entry is a real chunk of the strike's own base
// damage, silently under-dealing damage relative to the real statblock — pinned directly as its own
// unit test, not left implicit in one fixture's own notes field.
test("toCombatant: a melee item with TWO real (non-persistent) damageRolls entries only reads the first — a real, if narrow, gap this project accepts rather than hides", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const dualDamageNPC = {
    ...goon,
    items: [{
      type: "melee", name: "Twin Blade",
      system: {
        bonus: { value: 9 }, range: null, traits: { value: [] },
        damageRolls: { a: { damage: "1d6", damageType: "bludgeoning" }, b: { damage: "1d4", damageType: "acid" } }
      }
    }]
  };
  const [strike] = toCombatant(dualDamageNPC, { strikeNames: ["Twin Blade"] }).strikes;
  assert.deepEqual(strike.damage, [{ dice: "1d6", bonus: 0, damageType: "bludgeoning" }], "only the first entry — the second (acid) is silently dropped, not summed or merged");
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

// GH #148 — found investigating Scrap Rat's real Frag Grenade: GH #64's own closing comment claimed
// it was "a genuine single-target thrown Strike, not a burst/area effect" without actually checking
// system.action. It's real value is "area-fire" (a genuine burst, identical shape to Tough's own
// already-wired Frag Grenade) — silently deriving it as a plain Strike would have produced a
// meaningless "attackBonus" (really the basic-save DC's own 10+bonus basis) and dropped its entire
// burst radius/friendly-fire risk. A repeat sweep of every melee item across this project's three
// available bestiary packs found 22 more area-fire items and 5 auto-fire items — never once a genuine
// Strike — so toCombatant now refuses both categories outright rather than silently mis-deriving one.
test("toCombatant: refuses to derive a real area-fire item (Scrap Rat's own Frag Grenade) as a Strike — must be routed through deriveAreaAttack instead", () => {
  const scrapRat = findNPC(alienCoreDir, "Scrap Rat");
  assert.throws(
    () => toCombatant(scrapRat, { strikeNames: ["Frag Grenade"] }),
    /has system\.action "area-fire", not "strike"/
  );
});

test("toCombatant: refuses to derive a real auto-fire item (Tough's own Scattergun) as a Strike — the same out-of-scope multi-target category this project already leaves unwired elsewhere (e.g. tough.json's own notes field)", () => {
  const tough = findNPC(bestiaryDir, "Tough");
  assert.throws(
    () => toCombatant(tough, { strikeNames: ["Scattergun"] }),
    /has system\.action "auto-fire", not "strike"/
  );
});

// GH #148 — the second legal ranged-Strike shape: a flat maximum with NO increment concept at all
// (distinct from an area-fire grenade, which is never wired as a Strike at all — see the two tests
// just above). No real current NPC/pregen has a genuine Strike-typed item shaped this way (confirmed
// by the pack sweep above — every real {increment: null, max: N} item found is area-fire), so this
// constructs the raw shape directly, matching this file's own established "construct the raw shape
// directly when no real example exists yet" precedent (deriveAreaAttack's own non-burst-shape test,
// deriveConditionSave's own synthetic-frequency tests, both below).
test("toCombatant: a ranged Strike whose raw range is {increment: null, max: N} derives rangeMax, not rangeIncrement — the flat-maximum shape checkStrikeRange/rangeIncrementPenalty now support", () => {
  const goon = findNPC(bestiaryDir, "Security Goon");
  const syntheticFlatMaxThrown = {
    ...goon,
    items: [{
      type: "melee", name: "Thrown Rock",
      system: {
        action: "strike", bonus: { value: 8 }, range: { increment: null, max: 70 }, traits: { value: ["thrown"] },
        damageRolls: { a: { damage: "1d6", damageType: "bludgeoning" } }
      }
    }]
  };
  const [strike] = toCombatant(syntheticFlatMaxThrown, { strikeNames: ["Thrown Rock"] }).strikes;
  assert.equal(strike.strikeType, "ranged");
  assert.equal(strike.rangeMax, 70);
  assert.equal(strike.rangeIncrement, undefined, "must never populate rangeIncrement for a flat-max weapon — the two are mutually exclusive");
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

// --- item ordering (regression: raw pack-storage order silently leaking into actions/reactions/lore) ---
//
// Real, live bug (2026-09-12): itemsFor() (this file's own private helper) used to return an actor's
// embedded items in whatever order they happened to come out of the pack read — ascending LevelDB
// internal-key order once gamesystems/sf2e's packs compacted into a single SSTable (which sorts by
// embedded-item `_id`, an opaque random string), write order while still in the write-ahead log. Both
// are accidents of on-disk storage layout, not authored order, and are unrelated to each other — so
// when a pack recompacts, actions/lore array order can silently reshuffle with zero content change.
// Confirmed against this project's own real erabryth.json/kuriaku.json fixtures: re-running the
// extractor after gamesystems/sf2e's packs compacted reordered both, every item byte-identical, only
// array position changed. Fixed by sorting on each item's own real Foundry `sort` field — the exact
// field Foundry's own sheet UI persists for this purpose, confirmed present on every embedded item in
// every pack checked. These two tests guard both halves: repeated extraction stays self-consistent,
// AND the order it settles on is the real, Foundry-authored one — deepEqual on the raw array, never on
// a sorted copy, since sorting both sides first would hide the exact bug that shipped.
test("toCombatant: actions/reactions/lore order is stable across two independent, from-disk extractions of the same unchanged pack — regression for the WAL/SSTable storage-order leak", () => {
  const alienCoreDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const bestiaryDir2 = path.join(repoRoot, "gamesystems", "sf2e", "packs", "starfinder-society-bestiary");

  const erabryth1 = toCombatant(findNPC(alienCoreDir, "Erabryth"), { strikeNames: ["Ribbon", "Fist", "Light Ray"] });
  const erabryth2 = toCombatant(findNPC(alienCoreDir, "Erabryth"), { strikeNames: ["Ribbon", "Fist", "Light Ray"] });
  assert.deepEqual(erabryth1.actions, erabryth2.actions, "two independent reads of the same pack must return actions in the same order, not just the same set");
  assert.deepEqual(erabryth1.reactions, erabryth2.reactions);
  assert.deepEqual(erabryth1.lore, erabryth2.lore);

  const kuriaku1 = toCombatant(findNPC(bestiaryDir2, "Kuriaku"), { strikeNames: ["Shobhad Longrifle", "Antlers"] });
  const kuriaku2 = toCombatant(findNPC(bestiaryDir2, "Kuriaku"), { strikeNames: ["Shobhad Longrifle", "Antlers"] });
  assert.deepEqual(kuriaku1.actions, kuriaku2.actions);
});

test("toCombatant: Erabryth's actions/reactions/lore follow her real Foundry `sort` field, not raw pack-storage order — the two provably disagree for her real data", () => {
  const alienCoreDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "alien-core-bestiary");
  const erabryth = findNPC(alienCoreDir, "Erabryth");
  const combatant = toCombatant(erabryth, { strikeNames: ["Ribbon", "Fist", "Light Ray"] });

  // Real sort values (confirmed directly against her raw item data): Buffering Zone 1100000,
  // Reflect Aggression 1200000, Forced Reflection 1300000, Shepherd's Touch 1400000. Ascending-`_id`
  // storage order puts Forced Reflection first and Buffering Zone last instead — the exact reordering
  // this project's own committed fixture was found to have silently taken on.
  assert.deepEqual(combatant.actions.map((a) => a.name), ["Buffering Zone", "Forced Reflection", "Shepherd's Touch"]);
  assert.deepEqual(combatant.reactions.map((r) => r.name), ["Reflect Aggression"]);
  // Real sort values: Android Lore 1500000, Boneyard Lore 1600000.
  assert.deepEqual(combatant.lore.map((l) => l.name), ["Android Lore", "Boneyard Lore"]);
});

test("toCombatant: Kuriaku's actions follow her real Foundry `sort` field (Reverberant Antlers 600000, Grab 700000, Knockdown 800000) — Grab/Knockdown is the exact pair this project's own committed fixture was found reordered", () => {
  const bestiaryDir2 = path.join(repoRoot, "gamesystems", "sf2e", "packs", "starfinder-society-bestiary");
  const kuriaku = findNPC(bestiaryDir2, "Kuriaku");
  const combatant = toCombatant(kuriaku, { strikeNames: ["Shobhad Longrifle", "Antlers"] });
  assert.deepEqual(combatant.actions.map((a) => a.name), ["Reverberant Antlers", "Grab", "Knockdown"]);
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

// GH #69: Forced Reflection's own real raw data has neither system.frequency nor system.uses
// (confirmed directly, both adversarial review rounds) — this is one of the project's two real,
// currently-expected well-formedness gaps (raw-validation-fixtures.test.mjs's own KNOWN_GAPS), not a
// bug. Explicit here so the "no usesRemaining at all" outcome is asserted directly, not just implied
// by its absence from the tests above.
test("deriveConditionSave: Forced Reflection has no real frequency/uses data — usesRemaining stays absent, honest, not invented", () => {
  const erabryth = findNPC(alienCoreDir, "Erabryth");
  const forcedReflection = deriveConditionSave(erabryth, { name: "Forced Reflection", saveType: "will", range: 60, outcomes: FORCED_REFLECTION_OUTCOMES });
  assert.equal(forcedReflection.usesRemaining, undefined);
});

// GH #69: no REAL condition-save action in this project's current data has a frequency field at all
// (Forced Reflection is the only one that exists, and it has none), so the threshold logic itself
// needs synthetic input — built on Erabryth's own real npc object (reusing her real spellcastingEntry
// for the DC) with one extra, synthetic action item pushed on, matching this file's own established
// "construct the raw shape directly when no real example exists yet" precedent (see deriveAreaAttack's
// own non-burst-shape test below).
function erabrythWithSyntheticAction(frequency) {
  const erabryth = findNPC(alienCoreDir, "Erabryth");
  const syntheticAction = {
    type: "action", name: "Synthetic Frequency Test",
    system: { actions: { value: 1 }, traits: { value: [] }, frequency }
  };
  return { ...erabryth, items: [...erabryth.items, syntheticAction] };
}

test("deriveConditionSave: a safe-scope frequency (PT1H — 600 real rounds, comfortably longer than this project's own 60-round real ceiling) derives a real usesRemaining", () => {
  const erabryth = erabrythWithSyntheticAction({ max: 2, per: "PT1H" });
  const result = deriveConditionSave(erabryth, { name: "Synthetic Frequency Test", saveType: "will", range: 60, outcomes: {} });
  assert.equal(result.usesRemaining, 2);
});

test("deriveConditionSave: an unsafe-scope frequency (round — would recharge mid-battle) throws rather than silently mismodeling a recurring resource as permanently exhaustible", () => {
  const erabryth = erabrythWithSyntheticAction({ max: 1, per: "round" });
  assert.throws(() => deriveConditionSave(erabryth, { name: "Synthetic Frequency Test", saveType: "will", range: 60, outcomes: {} }), /would recharge mid-battle/);
});

test("deriveConditionSave: PT1M (10 real rounds — shorter than this project's own real scenario lengths) is ALSO unsafe and throws, not just round/turn", () => {
  const erabryth = erabrythWithSyntheticAction({ max: 1, per: "PT1M" });
  assert.throws(() => deriveConditionSave(erabryth, { name: "Synthetic Frequency Test", saveType: "will", range: 60, outcomes: {} }), /would recharge mid-battle/);
});

test("deriveConditionSave: an unrecognized frequency.per value throws a clear, distinct error rather than silently deriving a wrong number", () => {
  const erabryth = erabrythWithSyntheticAction({ max: 1, per: "not-a-real-scope" });
  assert.throws(() => deriveConditionSave(erabryth, { name: "Synthetic Frequency Test", saveType: "will", range: 60, outcomes: {} }), /unrecognized frequency\.per/);
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

// GH #148 — Scrap Rat's real Frag Grenade: this project's first alien-core-bestiary area-fire
// wire-up, and it surfaced two real gaps Tough's own (rulebook-bestiaries) data never exercised.
test("deriveAreaAttack: Frag Grenade on Scrap Rat — range comes from system.range.max (70), not .increment (which is null on her real data, the opposite of Tough's own raw shape)", () => {
  const scrapRat = findNPC(alienCoreDir, "Scrap Rat");
  const frag = deriveAreaAttack(scrapRat, { name: "Frag Grenade", saveType: "ref", actions: 1, carriedWeaponName: "Frag Grenade (Commercial)" });
  assert.equal(frag.range, 70, "her real system.range.max — reading only .increment (Tough's own shape) would have silently produced null here");
  assert.equal(frag.dc, 13, "10 + her real melee-item bonus.value of 3");
  assert.equal(frag.radius, 5, "her real system.area.value");
  assert.deepEqual(frag.damage, [{ dice: "1d8", bonus: 0, damageType: "piercing" }]);
  assert.equal(frag.name, "Frag Grenade", "her real melee item's own name, verbatim — no invented \"(Commercial)\" suffix");
});

test("deriveAreaAttack: Frag Grenade on Scrap Rat — usesRemaining comes from her real carried weapon-item quantity, found via carriedWeaponName since the melee item (\"Frag Grenade\") and weapon item (\"Frag Grenade (Commercial)\") don't share an exact name", () => {
  const scrapRat = findNPC(alienCoreDir, "Scrap Rat");
  const frag = deriveAreaAttack(scrapRat, { name: "Frag Grenade", saveType: "ref", actions: 1, carriedWeaponName: "Frag Grenade (Commercial)" });
  assert.equal(frag.usesRemaining, 1, "her real carried weapon-item quantity — a single grenade");
});

test("deriveAreaAttack: without carriedWeaponName, Scrap Rat's own name mismatch means usesRemaining silently falls back to null (unlimited) — documents exactly why the override exists, not just that it works", () => {
  const scrapRat = findNPC(alienCoreDir, "Scrap Rat");
  const frag = deriveAreaAttack(scrapRat, { name: "Frag Grenade", saveType: "ref", actions: 1 });
  assert.equal(frag.usesRemaining, null, "no weapon-type item is literally named \"Frag Grenade\" (only \"Frag Grenade (Commercial)\") — the default carriedWeaponName=name lookup finds nothing");
});

test("deriveAreaAttack: carriedWeaponName defaults to name and leaves Tough's own existing call site byte-identical — the override is additive, not a behavior change for any existing caller", () => {
  const tough = findNPC(bestiaryDir, "Tough");
  const withDefault = deriveAreaAttack(tough, { name: "Frag Grenade (Commercial)", saveType: "ref", actions: 1 });
  const withExplicitSameName = deriveAreaAttack(tough, { name: "Frag Grenade (Commercial)", saveType: "ref", actions: 1, carriedWeaponName: "Frag Grenade (Commercial)" });
  assert.deepEqual(withDefault, withExplicitSameName);
  assert.equal(withDefault.usesRemaining, 1);
});
