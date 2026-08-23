/**
 * TEST FIXTURES for the tactical archetype battery (design doc §17). Synthetic opposition built
 * to specific ENCOUNTER SHAPES — swarm, solo boss, mixed levels — rather than to any campaign
 * fiction. None of this is canon; it is graph paper for testing the AI's decision quality.
 *
 * GROUNDED IN SF2E's OWN ENCOUNTER MATH, not eyeballed. reference/tables/encounter-and-rewards-math.json
 * gives the real XP-by-relative-level progression, and each scenario below is costed against it:
 *   party level -4 = 10 XP ("low-threat lackey")      party level +2 = 80 XP ("moderate/severe boss")
 *   party level -3 = 15 XP ("low/moderate lackey")    party level +4 = 160 XP ("extreme solo boss")
 * with 80 XP = moderate, 120 = severe, 160 = extreme at the 4-PC baseline. Every archetype states
 * its own budget arithmetic in its builder, so a scenario that is accidentally trivial or
 * unwinnable is visible as a design error rather than mistaken for an AI failure.
 *
 * Defensive/offensive numbers follow GM Core's by-level creature-building bands, anchored on the
 * values this project already committed to and documented at level 12 (AC 33 High, Strike attack
 * +24 Moderate, damage 3d8+12 Moderate, HP 165 Low — see data/antagonists/claimants/contact-unclassified.json's
 * own notes) and scaled at the standard ~1 point of AC and attack per level. Where a number
 * deliberately departs from the band it is labelled inline.
 *
 * Distances follow this project's 10x grid reskin (design doc §14f): Speeds are 10x their
 * personnel-scale equivalent; weapon RANGE increments are NOT (§14g) — the deliberate asymmetry
 * that makes closing distance cost something real.
 */

const CHASSIS_LIKE = { kind: "chassis", scaleBlind: false };

/**
 * SWARM UNIT — party level -4 (level 8), 10 XP, "low-threat lackey". Eight of these is an 80 XP
 * moderate encounter at the 4-PC baseline.
 *
 * HP is set at 90, BELOW GM Core's level-8 Low band (~100), and that is a deliberate, labelled
 * deviation: the swarm archetype exists to test whether the AI concentrates damage, and that
 * question is only measurable if a kill is actually reachable inside a turn or two. A swarm whose
 * members take four rounds each to drop would measure the engine's grind, not the AI's judgement.
 */
export function makeSwarmUnit(overrides = {}) {
  return {
    ...CHASSIS_LIKE,
    id: "swarm-unit",
    name: "TEST FIXTURE — Swarm Lackey (level 8, synthetic)",
    side: "opposition",
    size: "large",
    maxHP: 90,
    currentHP: 90,
    ac: 25,               // level 8, Moderate
    hardness: 4,
    saves: { fort: 17, ref: 15, will: 13 },
    initiativeModifier: 15,
    speed: 500,
    strikes: [{ name: "Lackey Autogun", strikeType: "ranged", attackBonus: 18, rangeIncrement: 100, traits: ["mounted"], damage: [{ dice: "2d8", bonus: 9, damageType: "piercing" }] }],
    ...overrides
  };
}

/**
 * SOLO BOSS — party level +4 (level 16), 160 XP, "extreme-threat solo boss" and by the table's own
 * definition "likely to be an even match for the characters; a real chance the entire party could die."
 *
 * The archetype's whole tactical point is its AC: 38 against a Frame's +25 means the first attack
 * hits on 13+ (40%), the second at -5 MAP on 18+ (15%), and the third at -10 MAP only on a natural
 * 20 (5%). That is precisely the situation where SF2E wisdom says the third action belongs
 * somewhere other than a swing, and it is what mapDisciplineStats exists to detect.
 */
export function makeSoloBoss(overrides = {}) {
  return {
    id: "solo-boss",
    name: "TEST FIXTURE — Solo Boss (level 16, synthetic)",
    kind: "claimant",     // not a Frame/chassis: exempt from the damage-state action-cap track, like the real Claimant
    side: "opposition",
    size: "gargantuan",
    maxHP: 300,           // level 16, High band
    currentHP: 300,
    ac: 38,               // level 16, High
    hardness: 0,
    scaleHardness: 15,
    saves: { fort: 30, ref: 26, will: 28 },
    initiativeModifier: 26,
    speed: 400,
    scaleBlind: false,    // unlike the Day 1 Claimant — this one is meant to fight back properly
    strikes: [{ name: "Boss Slam", strikeType: "melee", attackBonus: 31, traits: ["reach-150"], damage: [{ dice: "4d8", bonus: 17, damageType: "bludgeoning" }] }],
    ...overrides
  };
}

/**
 * ARTILLERY — the "dangerous but distant" unit the mixed-level archetype is built around.
 * Party level +2 (level 14), 80 XP. High damage, long reach, low HP and AC: the classic
 * kill-this-first target that a proximity-biased policy will walk straight past.
 */
export function makeArtillery(overrides = {}) {
  return {
    ...CHASSIS_LIKE,
    id: "artillery",
    name: "TEST FIXTURE — Artillery Platform (level 14, synthetic)",
    side: "opposition",
    size: "huge",
    maxHP: 120,           // deliberately fragile for its level — a glass cannon, the archetype's point
    currentHP: 120,
    ac: 30,
    hardness: 8,
    saves: { fort: 24, ref: 18, will: 20 },
    initiativeModifier: 18,
    speed: 300,
    strikes: [{ name: "Siege Battery", strikeType: "ranged", attackBonus: 26, rangeIncrement: 1500, traits: ["mounted"], damage: [{ dice: "4d10", bonus: 16, damageType: "fire" }] }],
    ...overrides
  };
}

/**
 * CHAFF — party level -3 (level 9), 15 XP, "low/moderate-threat lackey". Tougher and closer than
 * the artillery it screens, but far less dangerous: four of these plus one artillery platform is
 * 80 + 60 = 140 XP, between severe (120) and extreme (160).
 */
export function makeChaff(overrides = {}) {
  return {
    ...CHASSIS_LIKE,
    id: "chaff",
    name: "TEST FIXTURE — Chaff Escort (level 9, synthetic)",
    side: "opposition",
    size: "large",
    maxHP: 110,
    currentHP: 110,
    ac: 27,
    hardness: 10,
    saves: { fort: 19, ref: 17, will: 15 },
    initiativeModifier: 17,
    speed: 700,
    // Deliberately feeble output next to the artillery's 4d10+16 (avg 38): average 13 per hit.
    // The gap is what makes "which of these should you shoot" a question with a right answer.
    strikes: [{ name: "Escort Cannon", strikeType: "ranged", attackBonus: 19, rangeIncrement: 100, traits: ["mounted"], damage: [{ dice: "2d6", bonus: 6, damageType: "piercing" }] }],
    ...overrides
  };
}

/**
 * MIRROR UNIT — used on BOTH sides of the mirror-match archetype, identical in every respect
 * except id/side/position. Its stats are unremarkable on purpose; the archetype tests symmetry,
 * not power level, so what matters is only that both sides get exactly this.
 */
export function makeMirrorUnit(overrides = {}) {
  return {
    ...CHASSIS_LIKE,
    id: "mirror-unit",
    name: "TEST FIXTURE — Mirror Unit (synthetic)",
    size: "huge",
    maxHP: 140,
    currentHP: 140,
    ac: 30,
    hardness: 10,
    saves: { fort: 22, ref: 20, will: 18 },
    initiativeModifier: 20,
    speed: 600,
    strikes: [{ name: "Standard Cannon", strikeType: "ranged", attackBonus: 23, rangeIncrement: 200, traits: ["mounted"], damage: [{ dice: "3d8", bonus: 11, damageType: "piercing" }] }],
    ...overrides
  };
}

/**
 * SKIRMISHER — ranged-only, fast, fragile. Paired against a melee-only opponent in the
 * range-asymmetry archetype, which is the cleanest available test of the closing-gradient term
 * (design doc §15k): the correct play for this unit is to keep its distance, and the correct play
 * for its melee opponent is to close aggressively. Two opposite right answers, one evaluator.
 */
export function makeSkirmisher(overrides = {}) {
  return {
    ...CHASSIS_LIKE,
    id: "skirmisher",
    name: "TEST FIXTURE — Skirmisher (ranged-only, synthetic)",
    size: "large",
    maxHP: 90,
    currentHP: 90,
    ac: 29,
    hardness: 6,
    saves: { fort: 18, ref: 24, will: 16 },
    initiativeModifier: 24,
    speed: 1000,
    strikes: [{ name: "Long Rifle", strikeType: "ranged", attackBonus: 22, rangeIncrement: 300, traits: ["mounted"], damage: [{ dice: "3d8", bonus: 10, damageType: "piercing" }] }],
    ...overrides
  };
}

/**
 * BRAWLER — melee-only, slower, tougher. The skirmisher's counterpart: it cannot win without
 * closing, so a passive or kiting brawler is an unambiguous AI failure rather than a judgement call.
 */
export function makeBrawler(overrides = {}) {
  return {
    ...CHASSIS_LIKE,
    id: "brawler",
    name: "TEST FIXTURE — Brawler (melee-only, synthetic)",
    size: "huge",
    maxHP: 170,
    currentHP: 170,
    ac: 30,
    hardness: 12,
    saves: { fort: 24, ref: 18, will: 18 },
    initiativeModifier: 14,
    speed: 700,
    strikes: [{ name: "Crushing Arm", strikeType: "melee", attackBonus: 25, traits: ["reach-100"], damage: [{ dice: "3d10", bonus: 14, damageType: "bludgeoning" }] }],
    ...overrides
  };
}
