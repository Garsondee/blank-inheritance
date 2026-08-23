/**
 * Combatant definitions for the battle simulator.
 *
 * The Claimant is loaded from the REAL, schema-validated campaign file
 * (data/antagonists/claimants/contact-unclassified.json) rather than
 * retyped — single source of truth, no drift possible between "the
 * Claimant as designed" and "the Claimant as simulated".
 *
 * The Frame is a deliberately anonymous SYNTHETIC reference statblock —
 * per CLAUDE.md, the six real kids/Frames are collaborative creative work
 * not to be invented here. This is the same "TEST FIXTURE" convention the
 * Foundry diagnostic sync already established: clearly labeled, not real
 * campaign content, built from the same GM Core by-level tables (High
 * category) used for every other synthetic statblock this session, and
 * matching the numbers already committed to in
 * data/encounters/day-1-the-fight.json's own notes (+25 to hit, ~30
 * damage, AC ~31, ~170 HP) rather than re-deriving new ones.
 *
 * Every chassis below is copied verbatim from design/scale-and-chassis.md
 * §6/§8a — nothing here is a new number, it's the same design doc made
 * runnable.
 *
 * REVISED 2026-08-22 per design doc §14c: vehicle weapons retuned from
 * Moderate to GM Core's own LOW tier (attack +20, not +24; damage 3d6+10
 * avg 20, not 3d8+12 avg 25) — GM Core's own guidance for "creatures...
 * not meant to primarily get their damage through Strikes", which vehicles
 * supporting a Frame are. Still "mounted" trait, which now also matters
 * for Scale-Hardness (engine.mjs) — a Claimant shrugs off vehicle-scale
 * weapons the way a tank shrugs off rifle fire, the same idea as the
 * Frame side of Scale Disparity applied to damage instead of targeting.
 *
 * REVISED AGAIN 2026-08-22, same day, twice more — see design doc §14f:
 *  - The hand-authored `arrivesOnRound` lookup table (and the arrival-wave
 *    gating it drove in engine.mjs) is GONE. Every combatant now deploys
 *    at a real, shared position at "round 0" and simply moves at its own
 *    (now-10x'd) Speed from round 1 on — arrival timing is an emergent
 *    result of real movement now, not an authored abstraction. This is a
 *    strictly better fix for the exact problem arrivesOnRound existed to
 *    solve (§14a's "100+ round" concern): scaling distance AND Speed by
 *    the same 10x factor leaves rounds-to-close IDENTICAL to before, so
 *    real simulated movement is now cheap enough to just run for real.
 *  - Every Speed, rangeIncrement, and reach-N trait below is 10x its prior
 *    value, matching engine/grid.mjs's FEET_PER_SQUARE going from 5 to 50
 *    — a reskin (same square-counts, bigger feet labels), not a rebalance.
 *  - `initiativeModifier`: a NEW, distinct-from-Reflex-SAVE stat (Ingram's
 *    call) — vehicles use their existing Reflex (GM Core pg. 236: a
 *    vehicle's pilot "can usually roll an appropriate piloting skill...
 *    for initiative", and a fast/agile chassis's high Reflex already
 *    represents exactly that quickness). The Frame gets an explicitly
 *    LOWER value than its own Reflex SAVE (which stays 21, for dodging an
 *    actual area blast) — representing servo lag/raw bulk at the start of
 *    a fight, distinct from in-combat reflexes once already moving. A
 *    differently-built "agile mech" archetype could reasonably set this
 *    close to or above 20; this reference Frame deliberately isn't one
 *    (Player Core pg. 427 explicitly allows initiative to use a
 *    non-Perception check when the fiction calls for it).
 *
 * Starting positions (design doc §14f, spacing revised §14g): every party
 * combatant deploys together at the offshore fort anchoring the city's
 * downtown district — the dark, distinct structure jutting into the water
 * at the map's bottom-left (assets/battle-map.jpg) — in a clump of
 * adjacent-but-not-touching squares (2 squares/100ft apart, not 1) so
 * their map tokens read as a real formation rather than looking stacked —
 * found by actually looking at the rendered map: token radii (14-22px) are
 * large enough relative to a 30px-on-screen grid square that immediately
 * adjacent tokens visually overlapped even though their underlying grid
 * squares were genuinely distinct. The Claimant starts a real distance
 * away, in the foothills at the map's far side, and Advances on an
 * objective near that same downtown core.
 *
 * REVISED AGAIN 2026-08-22, design doc §14g — weapon ranges corrected.
 * §14f's 10x rescale had (wrongly) carried vehicle weapon RANGES along
 * with everything else, on the reasoning "keep every square-count
 * identical." That reasoning is right for Speed and reach (how far
 * something can physically move or swing a melee weapon scales with the
 * map), but wrong for a gun's range increment, which is a property of the
 * WEAPON, not the map — Player Core's own catalog puts a mounted sidearm
 * at 60-120ft regardless of how big the battlefield around it is. Carrying
 * the 10x through there produced ranges of 500-800ft, comfortably able to
 * threaten most of the map with zero penalty — exactly how a helicopter
 * ended up landing an "impossibly far" hit with an ordinary sidearm.
 * Ranges below are now real, unscaled SF2E catalog numbers (Player Core
 * pg. 254's own examples: commercial semi-auto pistol 60ft, rifles
 * 60-120ft) — short relative to the new city-scale map ON PURPOSE, so
 * closing distance is a real cost again and engine/legality.mjs's new
 * rangeIncrementPenalty (the -2/-4/-6... per-increment accuracy penalty
 * Player Core pg. 254 actually specifies, previously unimplemented) has
 * real room to bite past the first increment.
 *
 * Two vehicles (Vesper, Hod) additionally carry ONE limited-use long-range
 * weapon (`usesRemaining`) — real reach across the map, GM Core's Moderate
 * tier (the pre-§14c-nerf numbers, justified here by scarcity rather than
 * an accuracy/damage cut), still "mounted" and so still subject to
 * Scale-Hardness. Expensive, and gone for the rest of the encounter once
 * spent — the fiction being that replacing it is a between-missions
 * funding problem, not something this single-encounter simulator models.
 * The Frame's melee weapon needs neither a range increment nor ammo at
 * all, which is the asymmetry Ingram asked for: a Frame's answer to "what
 * happens at long range" is closing the distance, not conserving rounds.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..", "..");

// The shared party staging point — the offshore fort, downtown/bottom-left
// of the map. Each chassis gets its own square, 2 squares (100ft) from the
// center in a "+" formation plus one diagonal — a real, visually distinct
// clump, not stacked or even edge-to-edge.
const DEPLOYMENT_CENTER = { col: 9, row: 27 };

export function loadClaimant(overrides = {}) {
  const raw = JSON.parse(readFileSync(path.join(repoRoot, "data", "antagonists", "claimants", "contact-unclassified.json"), "utf8"));
  const sweep = raw.strikes[0];
  return {
    id: "claimant-one",
    name: raw.name,
    kind: "claimant",
    side: "opposition",
    size: raw.size, // gargantuan
    maxHP: raw.hitPoints.max,
    currentHP: raw.hitPoints.max,
    ac: raw.ac,
    hardness: 0,
    scaleHardness: 15, // design doc §14b — applies only to Strikes with the "mounted" trait
    saves: { fort: raw.savingThrows.fortitude.modifier, ref: raw.savingThrows.reflex.modifier, will: raw.savingThrows.will.modifier },
    initiativeModifier: raw.savingThrows.reflex.modifier, // no fictional reason to diverge from its own (Low) Reflex
    speed: raw.speed.land, // already 10x'd at the source (data/antagonists/claimants/contact-unclassified.json)
    // reactionOnly (design doc §16, FIX — found by running mystic-frame-solo@555 and reading the
    // transcript through a narrative lens: the Claimant attacked proactively every round it wasn't
    // stunned, landing 219 damage across a 3-6 round fight the design scripts it to lose on points.
    // Without this flag, generateProposals offered Sweep as an ordinary standalone action, which
    // directly contradicts the statblock's own Claim/Advance text — "It is not fighting the
    // Frame... It only Strikes via its Claim reaction." attackOptions() (unfiltered) still returns
    // this for anyone ELSE's threatExposure calc, so standing adjacent is still correctly priced as
    // dangerous — only the Claimant's OWN proactive choice is blocked. See ai/decide.mjs and
    // ai/evaluate/state-value.mjs's proactiveAttackOptions.
    strikes: [{ name: sweep.name, strikeType: sweep.strikeType, attackBonus: sweep.attackBonus, traits: sweep.traits, damage: sweep.damage, reactionOnly: true }],
    reactions: [{ name: "Claim", strikeIndex: 0 }],
    scaleBlind: true,
    stunnedRounds: 0,
    weaknessAll: 0,
    immuneToAllDamage: true, // Interdiction Field, intact — see raw.abilities[0] and design/scale-and-chassis.md
    position: { col: 38, row: 12 }, // the foothills at the map's far side — a real distance from downtown
    ...overrides
  };
}

export function makeReferenceFrame(overrides = {}) {
  return {
    id: "frame-reference",
    name: "TEST FIXTURE — Reference Frame (synthetic, not one of the six real Frames)",
    kind: "frame",
    side: "party",
    size: "huge",
    maxHP: 170,
    currentHP: 170,
    ac: 31,
    hardness: 0,
    saves: { fort: 22, ref: 21, will: 20 },
    initiativeModifier: 10, // lumbering — see this file's header comment; deliberately well below every vehicle's
    speed: 300,
    strikes: [{ name: "Melee Weapon", strikeType: "melee", attackBonus: 25, traits: ["reach-100"], damage: [{ dice: "2d12", bonus: 17, damageType: "slashing" }] }],
    resonanceBand: { id: "harmonised", actionsPerTurn: 3 },
    scaleBlind: false,
    position: { col: DEPLOYMENT_CENTER.col, row: DEPLOYMENT_CENTER.row },
    ...overrides
  };
}

/**
 * TEST FIXTURE — a level-12 spellcasting Frame, NOT a proposal for any of
 * the six real Frames' class or abilities (those stay collaborative,
 * player-decided creative work — see data/characters/frames/README.md and
 * open-questions.json's frame-class-assignment entry, both still open).
 * Built the same way makeReferenceFrame() is a synthetic melee stand-in:
 * to give the utility-AI framework (design doc §14h) something real to
 * choose between besides "move then Strike."
 *
 * Design doc §14k, built 2026-08-22 answering Ingram's direct question
 * ("Can you cast a spell? Do you know your spell list? Can you use a
 * character ability?"): the design bible (line 30) is explicit that a
 * Frame is "built as a full PC using a standard SF2e class... a spell is
 * a kilometre-wide effect," so a spellcasting Frame is squarely inside
 * the design, not an invention. Grounded in REAL SF2E data rather than
 * hand-waved: Eldritch Lance and Transfer Vitality below are extracted
 * verbatim (tools/pack-extractor/) from the level-1 Mystic pregen
 * ("Lunar-17") in gamesystems/sf2e/packs/paizo-pregens — the same
 * Foundry compendium tools/character-builder/ already draws the kid
 * fixtures from — then scaled to level 12 using real SF2E rules, not
 * invented numbers:
 *   - Spell DC/attack: GM Core pg. 126's Spell DC and Spell Attack
 *     Modifier table, level 12, HIGH tier (Mystic is a primary caster,
 *     not "some supplemental spells" — GM Core's own distinction) = DC 32, attack +24.
 *   - Eldritch Lance is a CANTRIP (Player Core: cantrips "always auto-heighten
 *     to half your level rounded up," no slot needed) — at level 12 that's
 *     rank 6, five ranks above its printed rank 1. Its own Heightened (+1)
 *     text ("damage increases by 1d6") applies five times: printed 2d6 + 5d6 = 7d6.
 *   - Transfer Vitality's real text: "up to 10 Hit Points (minimum 1)...
 *     increases by 10 at 5th, 10th, 15th, and 20th level" — at level 12,
 *     both the 5th and 10th breakpoints apply: 10 + 10 + 10 = 30.
 * AC/HP/saves are NOT independently re-derived from a full level-12 PC
 * build (that would need the character-builder pipeline extended to
 * level 12, out of scope here) — approximated at a similar magnitude to
 * makeReferenceFrame(), shifted for a lower-AC/lower-HP, WIS-based caster
 * archetype (weaker Fortitude, stronger Will) rather than claimed as
 * exact. usesRemaining on Transfer Vitality stands in for its real,
 * regenerating "vitality network" resource pool (max 6+4/level=54 HP,
 * regenerating 4-8/turn, refilling on a 10-minute Refocus) — this
 * single-encounter simulator doesn't track a regenerating HP-pool
 * resource, so a flat 2-uses-per-encounter cap approximates "usable
 * roughly once at full strength, once more after partial regen" without
 * simulating the pool itself. Transfer Vitality's range is ALSO rescaled
 * 10x (60ft -> 600ft) for the same reason as Eldritch Lance's above —
 * consistency, not a spell-specific special case: the "kilometre-wide
 * effect" reflavoring applies to a Frame's whole kit, not just its attack
 * spell, and a personnel-scale 60ft would be just as awkwardly short here.
 */
export function makeMysticFrame(overrides = {}) {
  return {
    id: "frame-mystic-test",
    name: "TEST FIXTURE — Mystic Frame (synthetic, not one of the six real Frames)",
    kind: "frame",
    side: "party",
    size: "huge",
    maxHP: 150,
    currentHP: 150,
    ac: 28,
    hardness: 0,
    saves: { fort: 20, ref: 21, will: 24 },
    initiativeModifier: 10,
    speed: 300,
    // Eldritch Lance's real Player Core range is 30ft — shorter than ONE grid square at this
    // map's established 10x rescale (FEET_PER_SQUARE=50), which would make a "ranged" spell
    // attack functionally melee-only, worse than the Reference Frame's own reach-100 weapon.
    // FLAGGED FINDING, resolved here but not silently: unlike vehicle weapons (§14g, deliberately
    // kept at their REAL unscaled range as mundane guns that are SUPPOSED to be short relative to
    // the city-scale map), a Frame-scale spell has explicit textual support for scaling UP with
    // the rest of the reflavoring — design bible line 30: "a spell is a kilometre-wide effect,"
    // the same sentence that licenses treating a Strike as "a building-sized fist." Rescaled 10x
    // here (30ft -> 300ft) on that basis, consistent with how every reach trait in this project
    // already scales with the map (Frame melee reach-10->reach-100, Claimant Sweep reach-30->
    // reach-300) rather than with the vehicle-weapon precedent. 300ft lands exactly on par with
    // the Claimant's own Sweep reach — a magic-flinging caster reaching about as far as a
    // building-scale monster's melee swing reads as right, not arbitrary. This is a real
    // interpretive call, not a neutral default — worth Ingram's eyes if he wants it revisited.
    spells: [{
      name: "Eldritch Lance", attackBonus: 24, range: 300, actions: 2,
      traits: ["attack", "cantrip", "concentrate", "manipulate", "mental"],
      damage: [{ dice: "7d6", bonus: 0, damageType: "mental" }]
    }],
    healAbilities: [{
      name: "Transfer Vitality", healingAmount: 30, range: 600, actions: 1,
      traits: ["concentrate", "healing", "mystic"],
      usesRemaining: 2, usesPerEncounter: 2
    }],
    resonanceBand: { id: "harmonised", actionsPerTurn: 3 },
    scaleBlind: false,
    position: { col: DEPLOYMENT_CENTER.col, row: DEPLOYMENT_CENTER.row },
    ...overrides
  };
}

const CHASSIS_BASE = {
  kind: "chassis",
  side: "party",
  scaleBlind: false
};

// Design doc §14c — GM Core level-12 Low tier: attack +20, damage 3d6+10 (avg 20). Ranges
// (§14g) are real, unscaled SF2E catalog numbers (Player Core pg. 254) — NOT 10x'd with the map.
const VEHICLE_WEAPON_ATTACK = 20;
const VEHICLE_WEAPON_DAMAGE = { dice: "3d6", bonus: 10, damageType: "piercing" };

// Design doc §14g — the limited-use long-range option: GM Core's Moderate tier (the pre-§14c-nerf
// numbers), justified here by scarcity (1 use/encounter) rather than an accuracy cut. Still
// "mounted" — still subject to Scale-Hardness, same as the standard sidearm.
const LONG_RANGE_ATTACK = 24;
const LONG_RANGE_DAMAGE = { dice: "3d8", bonus: 12, damageType: "piercing" };
const LONG_RANGE_INCREMENT = 2000; // real reach across the map — the whole point of paying for it

export function makeKingfisher(overrides = {}) {
  return {
    ...CHASSIS_BASE,
    id: "kingfisher",
    name: "Kingfisher Pursuit Coupe",
    size: "large",
    maxHP: 70,
    currentHP: 70,
    ac: 29,
    hardness: 12,
    saves: { fort: 19, ref: 25, will: 0 },
    initiativeModifier: 25, // agile — matches its own high Reflex
    speed: 1200,
    handlingDC: 18,
    strikes: [{ name: "Mounted Sidearm", strikeType: "ranged", attackBonus: VEHICLE_WEAPON_ATTACK, rangeIncrement: 60, traits: ["mounted"], damage: [VEHICLE_WEAPON_DAMAGE] }],
    position: { col: DEPLOYMENT_CENTER.col - 2, row: DEPLOYMENT_CENTER.row },
    ...overrides
  };
}

export function makeHod(overrides = {}) {
  return {
    ...CHASSIS_BASE,
    id: "hod",
    name: "Hod Armoured Carrier",
    size: "huge",
    maxHP: 150,
    currentHP: 150,
    ac: 27,
    hardness: 16,
    saves: { fort: 25, ref: 16, will: 0 },
    initiativeModifier: 16, // heavy, slow to get moving — matches its own low Reflex
    speed: 400,
    handlingDC: 15,
    strikes: [
      { name: "Mounted Autocannon", strikeType: "ranged", attackBonus: VEHICLE_WEAPON_ATTACK, rangeIncrement: 100, traits: ["mounted"], damage: [VEHICLE_WEAPON_DAMAGE] },
      { name: "Heavy Ordnance Round", strikeType: "ranged", attackBonus: LONG_RANGE_ATTACK, rangeIncrement: LONG_RANGE_INCREMENT, traits: ["mounted"], damage: [LONG_RANGE_DAMAGE], usesRemaining: 1, usesPerEncounter: 1 }
    ],
    position: { col: DEPLOYMENT_CENTER.col + 2, row: DEPLOYMENT_CENTER.row },
    ...overrides
  };
}

export function makeLadle(overrides = {}) {
  return {
    ...CHASSIS_BASE,
    id: "ladle",
    name: "Ladle Recovery Rig",
    size: "huge",
    maxHP: 120,
    currentHP: 120,
    ac: 26,
    hardness: 14,
    saves: { fort: 22, ref: 19, will: 0 },
    initiativeModifier: 19,
    speed: 500,
    handlingDC: 16,
    repairBonus: 24, // Crafting, Moderate proficiency-equivalent at level 12 — a rig crewed by trained technicians, not elite pilots
    strikes: [], // support role, deliberately no combat Strike — see design doc §6
    position: { col: DEPLOYMENT_CENTER.col, row: DEPLOYMENT_CENTER.row + 2 },
    ...overrides
  };
}

export function makeVesper(overrides = {}) {
  return {
    ...CHASSIS_BASE,
    id: "vesper",
    name: "Vesper Observation Helicopter",
    size: "huge",
    maxHP: 85,
    currentHP: 85,
    ac: 29,
    hardness: 8,
    saves: { fort: 16, ref: 25, will: 0 },
    initiativeModifier: 25, // agile — matches its own high Reflex
    speed: 1500,
    handlingDC: 19,
    strikes: [
      { name: "Mounted Sidearm", strikeType: "ranged", attackBonus: VEHICLE_WEAPON_ATTACK, rangeIncrement: 100, traits: ["mounted"], damage: [VEHICLE_WEAPON_DAMAGE] },
      { name: "Rocket Pod", strikeType: "ranged", attackBonus: LONG_RANGE_ATTACK, rangeIncrement: LONG_RANGE_INCREMENT, traits: ["mounted"], damage: [LONG_RANGE_DAMAGE], usesRemaining: 1, usesPerEncounter: 1 }
    ],
    position: { col: DEPLOYMENT_CENTER.col, row: DEPLOYMENT_CENTER.row - 2 },
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// STRESS-TEST FIXTURES (design doc §16) — a hostile third faction and a
// neutral one, built specifically to exercise engine/factions.mjs's new
// "opposition is hostile to party AND neutral; party protects neutral"
// relations. Scavenger stats reuse the SAME GM Core level-12 Low-tier
// vehicle-weapon numbers as the escort fleet above (VEHICLE_WEAPON_ATTACK/
// DAMAGE) — a real, comparable threat, not padding. Not campaign canon: a
// synthetic opportunist faction invented for this test only, same
// TEST-FIXTURE convention as everything else in this file.
// ---------------------------------------------------------------------------

export function makeScavengerRaider(overrides = {}) {
  return {
    id: "scavenger-raider",
    name: "TEST FIXTURE — Scavenger Raider (synthetic opposition, stress-test only)",
    kind: "chassis",
    side: "opposition",
    size: "large",
    maxHP: 70,
    currentHP: 70,
    ac: 29,
    hardness: 12,
    saves: { fort: 19, ref: 25, will: 0 },
    initiativeModifier: 25,
    speed: 1200,
    scaleBlind: false,
    strikes: [{ name: "Salvaged Autogun", strikeType: "ranged", attackBonus: VEHICLE_WEAPON_ATTACK, rangeIncrement: 60, traits: ["mounted"], damage: [VEHICLE_WEAPON_DAMAGE] }],
    ...overrides
  };
}

export function makeScavengerTechnical(overrides = {}) {
  return {
    id: "scavenger-technical",
    name: "TEST FIXTURE — Scavenger Technical (synthetic opposition, stress-test only)",
    kind: "chassis",
    side: "opposition",
    size: "huge",
    maxHP: 150,
    currentHP: 150,
    ac: 27,
    hardness: 16,
    saves: { fort: 25, ref: 16, will: 0 },
    initiativeModifier: 16,
    speed: 400,
    scaleBlind: false,
    strikes: [{ name: "Twin-Mounted Cannon", strikeType: "ranged", attackBonus: VEHICLE_WEAPON_ATTACK, rangeIncrement: 100, traits: ["mounted"], damage: [VEHICLE_WEAPON_DAMAGE] }],
    ...overrides
  };
}

/**
 * A neutral civilian vehicle — never runs the general decide() AI (see
 * ai/neutral-ai.mjs), has no strikes, and exists purely as an asset the
 * party's evaluator now values via engine/factions.mjs's isAlliedWith
 * carve-out and the opposition's evaluator threatens via isHostileTo's
 * widened rule. `extractionPoint` is this fixture's own field (not a
 * general combatant concept) — read only by ai/neutral-ai.mjs.
 */
export function makeConvoyVehicle(overrides = {}) {
  return {
    kind: "civilian-vehicle",
    side: "neutral",
    size: "large",
    ac: 18,
    hardness: 4,
    saves: { fort: 10, ref: 12, will: 0 },
    initiativeModifier: 8,
    speed: 350,
    scaleBlind: false,
    strikes: [],
    ...overrides
  };
}

export function makeRunabout(overrides = {}) {
  return {
    ...CHASSIS_BASE,
    id: "runabout",
    name: "Runabout Utility Chassis",
    size: "large",
    maxHP: 60,
    currentHP: 60,
    ac: 25,
    hardness: 8,
    saves: { fort: 19, ref: 19, will: 0 },
    initiativeModifier: 19,
    speed: 500,
    handlingDC: 17,
    strikes: [{ name: "Mounted Sidearm", strikeType: "ranged", attackBonus: VEHICLE_WEAPON_ATTACK, rangeIncrement: 60, traits: ["mounted"], damage: [VEHICLE_WEAPON_DAMAGE] }],
    canEvacuate: true, // design doc §14h: real evacuation capacity is a data fact about this chassis (cargo space for civilians), not something the AI should infer from its id
    position: { col: DEPLOYMENT_CENTER.col - 2, row: DEPLOYMENT_CENTER.row + 2 },
    ...overrides
  };
}
