/**
 * Tests for personnel-engine/archetypes.mjs (design doc §48 — "Archetype Ladder" Stage C: "Six
 * named profiles, each with a direction-asserting behavioural test... proving the label describes
 * something real"). Two layers, matching that bar exactly:
 *
 * (1) STRUCTURAL — every archetype is complete (assertCompleteWeights), frozen, and a MINIMAL diff
 *     from BASELINE_V1: only the fields the Ladder plan's own §05 table calls out for that archetype
 *     differ; everything else matches the control byte-for-byte. This is what makes layer (2)'s
 *     comparisons clean — the ONE thing under test is the ONLY thing that changed.
 *
 * (2) BEHAVIORAL — real `runBattle` calls, same scenario/seed, only the assigned profile differs,
 *     proving each archetype's label describes a REAL, MEASURED difference in what `decide()`
 *     actually chooses — not a cosmetic label. Both scenarios below were built and their real,
 *     unedited output verified via a scratch probe before being written into assertions (this
 *     session's own standing "measure before trusting" discipline) — including one real bug caught
 *     that way: a first draft of the bloodied-retreat probe forgot `applyProfileToCombatant`, so
 *     `temperament` never reached the combatant object and Mindless/Zealot incorrectly fled. Fixed in
 *     the probe before any assertion was written; `applyProfileToCombatant` itself was never wrong.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { BASELINE_V1, PROFILES, decideOptionsForProfile, applyProfileToCombatant, assertCompleteWeights } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";
import { AGGRESSIVE_V1, CAUTIOUS_V1, FLANKER_V1, BRAWLER_V1, MINDLESS_V1, ZEALOT_V1, ARCHETYPES, ALL_PROFILES } from "../../tools/battle-simulator/personnel-engine/archetypes.mjs";
import { ANCHOR_BASELINES, WORST_BASELINE } from "../../tools/battle-simulator/personnel-engine/baselines.mjs";

const fixturesDir = "tools/battle-simulator/data/raw-validation-fixtures";
function loadFixture(file) { return JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")); }

const ALL_SIX = { AGGRESSIVE_V1, CAUTIOUS_V1, FLANKER_V1, BRAWLER_V1, MINDLESS_V1, ZEALOT_V1 };

// --- Structural: complete, frozen, minimal diff from BASELINE_V1 ---

test("every archetype: complete weights (assertCompleteWeights doesn't throw), frozen profile AND frozen weights sub-object", () => {
  for (const [name, profile] of Object.entries(ALL_SIX)) {
    assert.doesNotThrow(() => assertCompleteWeights(profile.weights), `${name}'s weights must be complete`);
    assert.ok(Object.isFrozen(profile), `${name} must be frozen`);
    assert.ok(Object.isFrozen(profile.weights), `${name}.weights must be frozen`);
  }
});

test("every archetype: a real, distinct id different from BASELINE_V1 and from every other archetype", () => {
  const ids = Object.values(ALL_SIX).map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, "every archetype id must be unique");
  assert.ok(!ids.includes(BASELINE_V1.id));
});

function fieldsExcept(profile, excluded) {
  const copy = { ...profile };
  for (const key of excluded) delete copy[key];
  return copy;
}

test("Aggressive: aggression 2.0, lowHpCaution 2.0 — every other field (including every other weight) byte-identical to BASELINE_V1", () => {
  assert.equal(AGGRESSIVE_V1.aggression, 2.0);
  assert.equal(AGGRESSIVE_V1.weights.lowHpCaution, 2.0);
  assert.equal(AGGRESSIVE_V1.moraleEnabled, BASELINE_V1.moraleEnabled, "morale off = BASELINE_V1's own default, not a new field");
  assert.deepEqual(fieldsExcept(AGGRESSIVE_V1.weights, ["lowHpCaution"]), fieldsExcept(BASELINE_V1.weights, ["lowHpCaution"]));
  assert.deepEqual(fieldsExcept(AGGRESSIVE_V1, ["id", "frozenAt", "aggression", "weights"]), fieldsExcept(BASELINE_V1, ["id", "frozenAt", "aggression", "weights"]));
});

test("Cautious: lowHpCaution 16.0, outnumberedCaution 3.0, moraleEnabled true — every other field byte-identical to BASELINE_V1", () => {
  assert.equal(CAUTIOUS_V1.weights.lowHpCaution, 16.0);
  assert.equal(CAUTIOUS_V1.weights.outnumberedCaution, 3.0);
  assert.equal(CAUTIOUS_V1.moraleEnabled, true);
  assert.deepEqual(fieldsExcept(CAUTIOUS_V1.weights, ["lowHpCaution", "outnumberedCaution"]), fieldsExcept(BASELINE_V1.weights, ["lowHpCaution", "outnumberedCaution"]));
  assert.deepEqual(fieldsExcept(CAUTIOUS_V1, ["id", "frozenAt", "moraleEnabled", "weights"]), fieldsExcept(BASELINE_V1, ["id", "frozenAt", "moraleEnabled", "weights"]));
});

test("Flanker: templates restricted to [reposition-and-shoot, unconstrained], threatExposure 0.35 — every other field byte-identical to BASELINE_V1", () => {
  assert.deepEqual([...FLANKER_V1.templates], ["reposition-and-shoot", "unconstrained"]);
  assert.equal(FLANKER_V1.weights.threatExposure, 0.35);
  assert.deepEqual(fieldsExcept(FLANKER_V1.weights, ["threatExposure"]), fieldsExcept(BASELINE_V1.weights, ["threatExposure"]));
  assert.deepEqual(fieldsExcept(FLANKER_V1, ["id", "frozenAt", "templates", "weights"]), fieldsExcept(BASELINE_V1, ["id", "frozenAt", "templates", "weights"]));
});

test("Brawler: templates restricted to [double-strike, control-then-attack], no other field changed at all", () => {
  assert.deepEqual([...BRAWLER_V1.templates], ["double-strike", "control-then-attack"]);
  assert.deepEqual(BRAWLER_V1.weights, BASELINE_V1.weights);
  assert.deepEqual(fieldsExcept(BRAWLER_V1, ["id", "frozenAt", "templates"]), fieldsExcept(BASELINE_V1, ["id", "frozenAt", "templates"]));
});

test("Mindless: temperament 'mindless', competence 0.3, templates empty, moraleEnabled true — every other field byte-identical to BASELINE_V1", () => {
  assert.equal(MINDLESS_V1.temperament, "mindless");
  assert.equal(MINDLESS_V1.competence, 0.3);
  assert.deepEqual([...MINDLESS_V1.templates], []);
  assert.equal(MINDLESS_V1.moraleEnabled, true);
  assert.deepEqual(MINDLESS_V1.weights, BASELINE_V1.weights);
  assert.deepEqual(fieldsExcept(MINDLESS_V1, ["id", "frozenAt", "temperament", "competence", "templates", "moraleEnabled"]), fieldsExcept(BASELINE_V1, ["id", "frozenAt", "temperament", "competence", "templates", "moraleEnabled"]));
});

test("Zealot: temperament 'fanatical', moraleEnabled true — the ONLY diff from BASELINE_V1 (full competence, every template, neutral weights/aggression)", () => {
  assert.equal(ZEALOT_V1.temperament, "fanatical");
  assert.equal(ZEALOT_V1.moraleEnabled, true);
  assert.deepEqual(ZEALOT_V1.weights, BASELINE_V1.weights);
  assert.deepEqual([...ZEALOT_V1.templates], [...BASELINE_V1.templates]);
  assert.equal(ZEALOT_V1.competence, BASELINE_V1.competence);
  assert.equal(ZEALOT_V1.aggression, BASELINE_V1.aggression);
  assert.deepEqual(fieldsExcept(ZEALOT_V1, ["id", "frozenAt", "temperament", "moraleEnabled"]), fieldsExcept(BASELINE_V1, ["id", "frozenAt", "temperament", "moraleEnabled"]));
});

// --- Registries ---

test("ARCHETYPES: all six, keyed by their own real id", () => {
  assert.deepEqual(Object.keys(ARCHETYPES).sort(), ["aggressive-v1", "brawler-v1", "cautious-v1", "flanker-v1", "mindless-v1", "zealot-v1"]);
  for (const [id, profile] of Object.entries(ARCHETYPES)) assert.equal(profile.id, id);
});

test("ALL_PROFILES: ai-profiles.mjs's own PROFILES merged with every archetype AND every anchor baseline (design doc §51) — nothing dropped, nothing duplicated incorrectly", () => {
  assert.deepEqual(Object.keys(ALL_PROFILES).sort(), [...Object.keys(PROFILES), ...Object.keys(ARCHETYPES), ...Object.keys(ANCHOR_BASELINES)].sort());
  assert.equal(ALL_PROFILES["baseline-v1"], BASELINE_V1);
  assert.equal(ALL_PROFILES["mindless-v1"], MINDLESS_V1);
  assert.equal(ALL_PROFILES["worst-baseline"], WORST_BASELINE);
});

// --- Behavioral: bloodied 1-vs-2, real morale-mechanism proof ---
//
// A real Lunar-17 at 4/15 HP (bloodied, well under GM Core's own 1/3 threshold) facing two full-HP
// Security Goons, moraleEnabled available to every profile under test — the exact real trigger
// `checkShouldFlee` documents (personally bloodied AND this side's mean HP fraction clearly below the
// enemy's). Real output, captured via a scratch probe before being written here: Cautious (moraleEnabled
// true, temperament null) actually routes; Aggressive (moraleEnabled false) doesn't even reach the
// mechanism; Mindless/Zealot (moraleEnabled true, but temperament-immune) reach it and are immune.

function makeBloodiedScenario(meProfile) {
  const lunar17 = { ...applyProfileToCombatant(loadFixture("lunar-17.json"), meProfile), id: "me", side: "party", currentHP: 4, position: { col: 5, row: 4 } };
  const goon1 = { ...applyProfileToCombatant(loadFixture("security-goon.json"), BASELINE_V1), id: "goon1", side: "opposition", position: { col: 9, row: 3 } };
  const goon2 = { ...applyProfileToCombatant(loadFixture("security-goon.json"), BASELINE_V1), id: "goon2", side: "opposition", position: { col: 9, row: 5 } };
  function ai(state, combatantId, turn) {
    const profile = combatantId === "me" ? meProfile : BASELINE_V1;
    return decide(state, combatantId, turn, decideOptionsForProfile(profile));
  }
  return { seed: 1, gridSize: { cols: 20, rows: 10 }, roundLimit: 1, combatants: [lunar17, goon1, goon2], ai, walls: [] };
}

function firstRealActionOf(profile) {
  const log = runBattle(makeBloodiedScenario(profile));
  return log.rounds[0]?.turns.find((t) => t.combatantId === "me")?.actions?.[0];
}

test("Cautious: bloodied + outnumbered + moraleEnabled true -> ACTUALLY routes (a real 'move' proposal, real GM-Core-cited flee reason)", () => {
  const action = firstRealActionOf(CAUTIOUS_V1);
  assert.equal(action.type, "move");
  assert.match(action.decisionReason, /is routing/);
});

test("Aggressive: identically bloodied + outnumbered, but moraleEnabled false -> never even reaches the flee mechanism, keeps fighting", () => {
  const action = firstRealActionOf(AGGRESSIVE_V1);
  assert.doesNotMatch(action.decisionReason, /is routing/);
});

test("Mindless: identically bloodied + outnumbered, moraleEnabled TRUE, but temperament 'mindless' -> immune, any movement is a real tactical choice, not a rout", () => {
  const action = firstRealActionOf(MINDLESS_V1);
  assert.doesNotMatch(action.decisionReason, /is routing/, "the mechanism is ON (moraleEnabled true) — immunity must come from temperament, not from morale being switched off");
});

test("Zealot: identically bloodied + outnumbered, moraleEnabled TRUE, but temperament 'fanatical' -> immune, same real proof as Mindless", () => {
  const action = firstRealActionOf(ZEALOT_V1);
  assert.doesNotMatch(action.decisionReason, /is routing/);
});

test("Cautious vs Mindless vs Zealot, same bloodied scenario: ONLY Cautious's real decision text cites routing — direct, real, paired proof that temperament immunity is genuine, not that morale merely never fires", () => {
  const cautious = firstRealActionOf(CAUTIOUS_V1);
  const mindless = firstRealActionOf(MINDLESS_V1);
  const zealot = firstRealActionOf(ZEALOT_V1);
  assert.match(cautious.decisionReason, /is routing/);
  assert.doesNotMatch(mindless.decisionReason, /is routing/);
  assert.doesNotMatch(zealot.decisionReason, /is routing/);
});

// --- Behavioral: Flanker vs. Brawler, real move-action usage across 8 real seeds ---
//
// Real Lunar-17 (assigned profile under test) vs. real Security Goon (BASELINE_V1), 9 squares apart
// in a small open arena — the exact real distance/positions ai-profiles.test.mjs's own golden-sequence
// tests already use. Real, measured, unedited output (8 seeds): Brawler's whole-battle move count was
// 0 in EVERY seed — a direct, code-guaranteed consequence of double-strike/control-then-attack's own
// phase filters never matching "move" once at least one attack/control action is legal. Flanker's
// total across the same 8 seeds was 3 (non-zero in 3 of 8) — real, measured, honestly modest (this
// engine has no flanking-bonus or cover mechanic to chase in a WALL-FREE arena; Flanker's own real
// lever is threatExposure-driven repositioning, which only pays off when moving genuinely changes
// exposure) but a genuine, non-cherry-picked, non-zero contrast against Brawler's real 0.

function makeApproachScenario(meProfile, seed) {
  const lunar17 = { ...applyProfileToCombatant(loadFixture("lunar-17.json"), meProfile), id: "me", side: "party", position: { col: 1, row: 4 } };
  const goon = { ...applyProfileToCombatant(loadFixture("security-goon.json"), BASELINE_V1), id: "goon", side: "opposition", position: { col: 10, row: 4 } };
  function ai(state, combatantId, turn) {
    const profile = combatantId === "me" ? meProfile : BASELINE_V1;
    return decide(state, combatantId, turn, decideOptionsForProfile(profile));
  }
  return { seed, gridSize: { cols: 12, rows: 8 }, roundLimit: 8, combatants: [lunar17, goon], ai, walls: [] };
}

function myMoveCount(profile, seed) {
  const log = runBattle(makeApproachScenario(profile, seed));
  const myActions = log.rounds.flatMap((r) => r.turns.find((t) => t.combatantId === "me")?.actions ?? []);
  return myActions.filter((a) => a.type === "move").length;
}

const APPROACH_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];

test("Brawler: across every one of 8 real seeds, NEVER voluntarily moves — a direct, code-guaranteed consequence of its own template restriction, not a coincidence", () => {
  for (const seed of APPROACH_SEEDS) {
    assert.equal(myMoveCount(BRAWLER_V1, seed), 0, `seed ${seed}: Brawler must never move`);
  }
});

test("Flanker: real, non-zero total move usage across the SAME 8 seeds — the honest, measured 'reposition-heavy' contrast against Brawler's real, proven-above 0", () => {
  const flankerTotal = APPROACH_SEEDS.reduce((sum, seed) => sum + myMoveCount(FLANKER_V1, seed), 0);
  const brawlerTotal = APPROACH_SEEDS.reduce((sum, seed) => sum + myMoveCount(BRAWLER_V1, seed), 0);
  assert.ok(flankerTotal > 0, "Flanker must move at least once across 8 real seeds");
  assert.ok(flankerTotal > brawlerTotal, "Flanker's real total move usage must exceed Brawler's");
});
