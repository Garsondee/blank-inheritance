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

// ---------------------------------------------------------------------------
// BENCHMARK PARTY (design doc §18) — a level-12 party built to GM Core's OWN by-level tables
// (reference/srd/gm-core/1004-armor-class.json, 1011-strike-attack-bonus.json,
// 1012-strike-damage.json, 1006-hit-points.json, 1005-saving-throws.json), not eyeballed.
//
// FIX, found running the archetype battery's diagnostics: solo-boss and mixed-levels both
// reused this project's pre-existing Reference Frame / Mystic Frame / Hod / Vesper fixtures as
// "the party" — those were built as one-off demonstrations for a completely different purpose
// (verifying spellcasting/heal mechanics against the campaign's specific Claimant statblock, per
// data/combatants.mjs's own header) and were never validated as a fairly-built level-12 party.
// Checked against the real table: their AC is 27-31 — BELOW even the level-12 Low band (30) for
// three of the four units. Against a level+4 boss's Moderate-to-High attack bonus (+30/+31), that
// under-armoring alone was enough to make the fight unwinnable by ANY policy (measured: identical
// outcome whether the party was played by the real AI, `nearest`, or `greedy`), which is exactly
// why side-swapping showed zero policy sensitivity — there was no room for tactics to matter.
//
// Built uniformly at AC High (33) per GM Core's own explicit guidance — "high is comparable to
// what a PC fighter would have" — HP Moderate (215, PC-style: many actions/defenses rather than
// one brutish stat), Attack High (+26), Damage Moderate (25). Varying ONLY weapon shape (reach vs
// range) and one support unit's heal ability, so the party's internal fairness is not itself a
// confound when reading the archetype battery's results.
// ---------------------------------------------------------------------------

const BENCHMARK_PARTY_BASE = {
  kind: "chassis", side: "party", scaleBlind: false,
  size: "huge", maxHP: 215, currentHP: 215, ac: 33, hardness: 0,
  saves: { fort: 25, ref: 22, will: 19 }, // High/Moderate/Low, per GM Core's own "one high, one moderate, one low" default
  initiativeModifier: 20
};

export function makeBenchmarkVanguard(overrides = {}) {
  return {
    ...BENCHMARK_PARTY_BASE,
    id: "vanguard", name: "TEST FIXTURE — Benchmark Vanguard (level 12, melee, GM Core bands)",
    speed: 500,
    strikes: [{ name: "Vanguard Blade", strikeType: "melee", attackBonus: 26, traits: ["reach-100"], damage: [{ dice: "3d8", bonus: 12, damageType: "slashing" }] }],
    ...overrides
  };
}

export function makeBenchmarkGunner(overrides = {}) {
  return {
    ...BENCHMARK_PARTY_BASE,
    id: "gunner", name: "TEST FIXTURE — Benchmark Gunner (level 12, ranged, GM Core bands)",
    speed: 400,
    strikes: [{ name: "Gunner Cannon", strikeType: "ranged", attackBonus: 26, rangeIncrement: 300, traits: ["mounted"], damage: [{ dice: "3d8", bonus: 12, damageType: "piercing" }] }],
    ...overrides
  };
}

export function makeBenchmarkScout(overrides = {}) {
  return {
    ...BENCHMARK_PARTY_BASE,
    id: "scout", name: "TEST FIXTURE — Benchmark Scout (level 12, fast ranged, GM Core bands)",
    speed: 1200,
    strikes: [{ name: "Scout Rifle", strikeType: "ranged", attackBonus: 26, rangeIncrement: 400, traits: ["mounted"], damage: [{ dice: "3d8", bonus: 12, damageType: "piercing" }] }],
    ...overrides
  };
}

/** The party's one support role — otherwise identical to the other three, plus a heal. */
export function makeBenchmarkSupport(overrides = {}) {
  return {
    ...BENCHMARK_PARTY_BASE,
    id: "support", name: "TEST FIXTURE — Benchmark Support (level 12, ranged + heal, GM Core bands)",
    speed: 400,
    strikes: [{ name: "Support Sidearm", strikeType: "ranged", attackBonus: 26, rangeIncrement: 300, traits: ["mounted"], damage: [{ dice: "3d8", bonus: 12, damageType: "piercing" }] }],
    healAbilities: [{ name: "Field Repair Kit", healingAmount: 40, range: 300, actions: 1, traits: ["healing"], usesRemaining: 3, usesPerEncounter: 3 }],
    ...overrides
  };
}

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
 * SOLO BOSS — party level +3 (level 15), 120 XP, "severe- or extreme-threat boss": GM Core's own
 * definition of severe is "the hardest encounters most groups have a GOOD CHANCE to defeat... small
 * chance the whole group could [die]" — a fight tactics should be able to win, not a coin-flip
 * regardless of play. Real numbers this time (reference/srd/gm-core's own by-level tables), not
 * eyeballed:
 *   AC High=37, Attack Moderate=+28, Damage High=3d12+17 (36 avg), HP High=344 (348-340 band)
 *
 * FIX (design doc §18): DOWNGRADED from party+4/level 16 (160 XP, "extreme... a REAL chance the
 * entire party could die" — i.e. sometimes unwinnable BY DESIGN, which is a bad choice for an
 * archetype meant to test whether tactics matter). Also fixed alongside the party itself moving
 * to the properly-leveled benchmark fixtures below — the original combination (an extreme threat
 * PLUS an under-armored party) measured as a 100%, policy-independent party wipe on every seed.
 *
 * The archetype's tactical point stays exactly what it was: Moderate attack (+28) against a
 * benchmark party's High AC (33) hits on 5+ (80%) — real, not automatic — while the boss's OWN
 * High AC (37) against the party's High attack (+26) needs 11+ (50%), 16+ on the second swing
 * (25%), and the third swing at -10 needs a natural 20 to even register as a hit at all. That is
 * precisely the situation where SF2E wisdom says the third action belongs somewhere else, and
 * exactly what mapDisciplineStats exists to detect.
 */
export function makeSoloBoss(overrides = {}) {
  return {
    id: "solo-boss",
    name: "TEST FIXTURE — Solo Boss (level 15, synthetic)",
    kind: "claimant",     // not a Frame/chassis: exempt from the damage-state action-cap track, like the real Claimant
    side: "opposition",
    size: "gargantuan",
    maxHP: 344,           // level 15, High band (348-340)
    currentHP: 344,
    ac: 37,               // level 15, High
    hardness: 0,
    scaleHardness: 15,
    saves: { fort: 29, ref: 26, will: 23 }, // level 15 High/High/Moderate
    initiativeModifier: 26,
    speed: 400,
    scaleBlind: false,    // unlike the Day 1 Claimant — this one is meant to fight back properly
    strikes: [{ name: "Boss Slam", strikeType: "melee", attackBonus: 28, traits: ["reach-150"], damage: [{ dice: "3d12", bonus: 17, damageType: "bludgeoning" }] }], // Moderate attack, High damage
    ...overrides
  };
}

/**
 * ARTILLERY — the "dangerous but distant" unit the mixed-level archetype is built around.
 * Party level +2 (level 14), 80 XP. High damage, long reach, low HP and AC: the classic
 * kill-this-first target that a proximity-biased policy will walk straight past.
 *
 * FIX (design doc §18): rangeIncrement was 1500ft against a party whose weapons top out at
 * 300-400ft — a real SF2E siege-weapon number, but one that made the artillery physically
 * unreachable within any sane round limit, so "close on the dangerous target" was never an
 * available choice for ANY policy to make well or badly. That is a scenario-design bug, not an
 * AI one: the archetype is meant to test WHETHER the AI prioritises the dangerous target once it
 * COULD be reached, not whether it can out-walk arithmetic. 500ft keeps it meaningfully longer
 * ranged than the chaff's 100ft (the asymmetry the archetype is actually testing) while being
 * closeable by the benchmark party's speeds (400-1200ft/round) inside a handful of rounds.
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
    strikes: [{ name: "Siege Battery", strikeType: "ranged", attackBonus: 26, rangeIncrement: 500, traits: ["mounted"], damage: [{ dice: "4d10", bonus: 16, damageType: "fire" }] }],
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

// RANGE_ASYMMETRY_BASE — identical level-12 stats for both brawler and skirmisher, per GM Core's
// own by-level tables (AC High=33, Attack High=+26, Damage Moderate=25avg, HP Moderate=215).
//
// FIX (design doc §18): the brawler and skirmisher previously had DIFFERENT stat lines (brawler:
// 170 HP/AC30/+25/avg30; skirmisher: 90 HP/AC29/+22/avg23.5) — the brawler was simply stronger in
// every dimension, so real-as-party won 100% of the time regardless of which policy played
// either side (measured: 6W-0L one direction, 0W-6L the other, identically across random/nearest/
// greedy). That tests raw stat totals, not tactics. The archetype's actual point — melee MUST
// close, ranged MUST kite, and only the AI's understanding of that determines the outcome — only
// holds if the two sides are equal in every respect EXCEPT weapon shape, which is now the case.
const RANGE_ASYMMETRY_BASE = {
  kind: "chassis", scaleBlind: false, size: "huge",
  maxHP: 215, currentHP: 215, ac: 33, hardness: 6,
  saves: { fort: 25, ref: 22, will: 19 }
};

/**
 * SKIRMISHER — ranged-only, fast. Paired against a melee-only opponent in the range-asymmetry
 * archetype, which is the cleanest available test of the closing-gradient term (design doc §15k):
 * the correct play for this unit is to keep its distance, and the correct play for its melee
 * opponent is to close aggressively. Two opposite right answers, one evaluator, and — now that
 * the stat lines match — no third explanation (raw power) available for whichever side wins.
 */
export function makeSkirmisher(overrides = {}) {
  return {
    ...RANGE_ASYMMETRY_BASE,
    id: "skirmisher",
    name: "TEST FIXTURE — Skirmisher (ranged-only, synthetic)",
    initiativeModifier: 24,
    speed: 1000,
    strikes: [{ name: "Long Rifle", strikeType: "ranged", attackBonus: 26, rangeIncrement: 300, traits: ["mounted"], damage: [{ dice: "3d8", bonus: 12, damageType: "piercing" }] }],
    ...overrides
  };
}

/**
 * BRAWLER — melee-only, slower. The skirmisher's exact stat-equal counterpart: it cannot win
 * without closing, so a passive or kiting brawler is an unambiguous AI failure rather than a
 * judgement call.
 */
export function makeBrawler(overrides = {}) {
  return {
    ...RANGE_ASYMMETRY_BASE,
    id: "brawler",
    name: "TEST FIXTURE — Brawler (melee-only, synthetic)",
    initiativeModifier: 14,
    speed: 700,
    strikes: [{ name: "Crushing Arm", strikeType: "melee", attackBonus: 26, traits: ["reach-100"], damage: [{ dice: "3d8", bonus: 12, damageType: "bludgeoning" }] }],
    ...overrides
  };
}
