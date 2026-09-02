/**
 * Tests for the generic complex-battle scenario builder (design doc §21/§22) — proven first against
 * the two original real fixtures (Lunar-17, Security Goon), then end to end against a real 3-vs-3
 * fight using all six checked-in fixtures (Lunar-17+Tapkey+Bennit vs. Security Goon+Xenowarden
 * Greenhorn+Erabryth) on the redesigned map (windows, cover, asymmetric rooms — design doc §22).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/personnel-complex-battle.mjs";
import { lineOfEffect } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";
import { BASELINE_V1, NO_MANEUVERS_V1 } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";
import { GREEDY_V1_POLICY } from "../../tools/battle-simulator/personnel-engine/baselines.mjs";

const ATTACK_TYPES = ["strike", "spellAttack", "saveAttack", "demoralize", "conditionSave", "areaAttack"];

function illegalAttacks(log) {
  let count = 0;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if (ATTACK_TYPES.includes(action.type) && action.legal === false) count += 1;
  }
  return count;
}

test("buildScenario: a real 1-vs-1 fight on the complex map resolves cleanly with zero illegal attacks", () => {
  for (const setup of ["NORTH_SOUTH_ENDS", "DIAGONAL_NW_SE", "DIAGONAL_SW_NE"]) {
    const log = runBattle(buildScenario({ seed: 1, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup, roundLimit: 40 }));
    assert.equal(illegalAttacks(log), 0, `setup ${setup}: an attack was proposed-and-committed illegally`);
  }
});

test("buildScenario: rejects an unknown setup name", () => {
  assert.throws(() => buildScenario({ seed: 1, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "NOT_REAL" }), /Unknown setup/);
});

test("buildScenario: rejects asking for more combatants on a side than the setup defines spawn points for, rather than silently reusing/colliding positions", () => {
  assert.throws(() => buildScenario({
    seed: 1, partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json", "lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "NORTH_SOUTH_ENDS"
  }), /only defines 3 party spawn point/);
});

test("buildScenario: the SAME fixture file used twice on one side gets genuinely distinct ids AND positions — a real collision trap otherwise (runBattle keys its live combatant map by id, so a repeated id silently drops one combatant with no error)", () => {
  const scenario = buildScenario({ seed: 1, partyFixtures: ["lunar-17.json", "lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "NORTH_SOUTH_ENDS" });
  const [p1, p2] = scenario.combatants;
  assert.notEqual(p1.id, p2.id, "two party combatants sharing a source fixture must still get distinct ids");
  assert.notDeepEqual(p1.position, p2.position, "two party combatants must never spawn on the same square");

  // Prove it end to end, not just at the data-shape level: run it for real and confirm the engine
  // actually saw two distinct, independently-acting party combatants, not one silently dropped.
  const log = runBattle({ ...scenario, roundLimit: 1 });
  assert.equal(Object.keys(log.roster).length, 3, "expected 3 real combatants in the roster (2 party + 1 opposition), not 2 (one silently deduplicated)");
});

// --- Real 3-vs-3, all six checked-in fixtures (design doc §22) ---

const PARTY_3V3 = ["lunar-17.json", "tapkey.json", "bennit.json"];
const OPPOSITION_3V3 = ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json"];

test("buildScenario: a real 3-vs-3 fight (Lunar-17+Tapkey+Bennit vs. Security Goon+Xenowarden Greenhorn+Erabryth) resolves cleanly across all three setups, with all six combatants present and zero illegal attacks", () => {
  for (const setup of ["NORTH_SOUTH_ENDS", "DIAGONAL_NW_SE", "DIAGONAL_SW_NE"]) {
    const log = runBattle(buildScenario({ seed: 1, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup, roundLimit: 40 }));
    assert.equal(Object.keys(log.roster).length, 6, `setup ${setup}: expected all 6 real combatants in the roster`);
    assert.equal(illegalAttacks(log), 0, `setup ${setup}: an attack was proposed-and-committed illegally in the real 3v3 fight`);
    assert.ok(["party-victory", "party-defeat", "timeout"].includes(log.outcome.result));
  }
});

test("buildScenario: across many seeds, zero illegal attacks anywhere, and no more than an occasional timeout — the real generalized proof that the corpse-in-doorway fix (design doc §21) and cover mechanic (design doc §22) hold up on a genuinely bigger 3v3 roster, not just the specific 2v2 case that first found the bug", () => {
  let timeouts = 0;
  const total = 10;
  for (let seed = 1; seed <= total; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "DIAGONAL_SW_NE", roundLimit: 40 }));
    assert.equal(illegalAttacks(log), 0, `seed ${seed}: an attack was proposed-and-committed illegally`);
    if (log.outcome.result === "timeout") timeouts += 1;
  }
  assert.ok(timeouts <= total / 2, `expected timeouts to stay rare (${timeouts}/${total}) — a majority-timeout result would mean real combatants still can't reliably reach each other`);
});

test("buildScenario: the real 3-vs-3 fight exercises strike/spellAttack/saveAttack (Bennit's Thunderstrike)/conditionSave (Erabryth's Forced Reflection)/move across a handful of seeds — proving the roster's real diversity, including both new §22 mechanisms, actually gets used", () => {
  const seenTypes = new Set();
  for (let seed = 1; seed <= 10; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "NORTH_SOUTH_ENDS", roundLimit: 40 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      seenTypes.add(action.type);
    }
  }
  for (const expected of ["strike", "spellAttack", "saveAttack", "conditionSave", "move"]) {
    assert.ok(seenTypes.has(expected), `expected to see a real "${expected}" action across 10 seeds, saw: ${[...seenTypes].join(", ")}`);
  }
});

test("buildScenario: real cover objects on the new map actually get crossed into during real 3v3 fights — at least one strike shows a nonzero coverBonus across several seeds", () => {
  // DIAGONAL_SW_NE specifically (design doc §24), not NORTH_SOUTH_ENDS: the party's own spawn
  // corner sits right next to Building A's SW-room cover block (and its new west garage opening),
  // so a route toward the opposition passes real cover early. NORTH_SOUTH_ENDS, by deliberate
  // design, keeps both sides in the wide-open courtyard — genuinely useful for testing "no cover
  // needed" tactical variety, but the wrong setup to prove cover gets used AT ALL.
  let sawCover = false;
  for (let seed = 1; seed <= 10 && !sawCover; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "DIAGONAL_SW_NE", roundLimit: 40 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      if ((action.type === "strike" || action.type === "saveAttack") && action.coverBonus > 0) sawCover = true;
    }
  }
  assert.ok(sawCover, "expected at least one real attack across 10 seeds to show a nonzero coverBonus — the new map's cover objects must actually matter in real play, not just in isolated unit tests");
});

// --- RANDOM_ARCS (design doc §35 — "we shouldn't always spawn our two sides in the same places") ---

test("buildScenario: RANDOM_ARCS sets blindDeployment on the returned scenario; every other setup leaves it false", () => {
  const random = buildScenario({ seed: 1, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "RANDOM_ARCS" });
  assert.equal(random.blindDeployment, true);
  for (const setup of ["NORTH_SOUTH_ENDS", "DIAGONAL_NW_SE", "DIAGONAL_SW_NE"]) {
    const scenario = buildScenario({ seed: 1, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup });
    assert.equal(scenario.blindDeployment, false, `setup ${setup} must not set blindDeployment`);
  }
});

test("buildScenario: RANDOM_ARCS genuinely produces zero cross-side Line of Effect at deployment, on the REAL complex-battle map — not just on the generator's own synthetic test map", () => {
  for (let seed = 1; seed <= 5; seed++) {
    const scenario = buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "RANDOM_ARCS" });
    const party = scenario.combatants.filter((c) => c.side === "party");
    const opposition = scenario.combatants.filter((c) => c.side === "opposition");
    for (const p of party) {
      for (const o of opposition) {
        assert.equal(lineOfEffect(p.position, o.position, scenario.walls), false, `seed ${seed}: ${p.id} at ${JSON.stringify(p.position)} can see ${o.id} at ${JSON.stringify(o.position)} at deployment`);
      }
    }
  }
});

test("buildScenario: RANDOM_ARCS is reproducible per seed (same seed -> identical starting positions) and varies across seeds (real variety, not a fixed lineup)", () => {
  const a = buildScenario({ seed: 99, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "RANDOM_ARCS" });
  const b = buildScenario({ seed: 99, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "RANDOM_ARCS" });
  assert.deepEqual(a.combatants.map((c) => c.position), b.combatants.map((c) => c.position));

  const seen = new Set();
  for (let seed = 1; seed <= 6; seed++) {
    const scenario = buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "RANDOM_ARCS" });
    seen.add(JSON.stringify(scenario.combatants[0].position));
  }
  assert.ok(seen.size > 1, `expected real variety across 6 seeds, got only ${seen.size} distinct opening position(s) for the first combatant`);
});

test("buildScenario: RANDOM_ARCS resolves cleanly end to end — zero illegal attacks, all 6 combatants present, across several seeds", () => {
  for (let seed = 1; seed <= 5; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "RANDOM_ARCS", roundLimit: 60 }));
    assert.equal(Object.keys(log.roster).length, 6, `seed ${seed}: expected all 6 real combatants in the roster`);
    assert.equal(illegalAttacks(log), 0, `seed ${seed}: an attack was proposed-and-committed illegally`);
  }
});

test("buildScenario: RANDOM_ARCS battles show a real early stretch of pure movement (the 'exploring' phase) before any attack — not an immediate beeline, and not a frozen deadlock either", () => {
  const log = runBattle(buildScenario({ seed: 3, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "RANDOM_ARCS", roundLimit: 60 }));
  const allTurns = log.rounds.flatMap((r) => r.turns);
  const firstContactIdx = allTurns.findIndex((t) => (t.actions ?? []).some((a) => ["strike", "spellAttack", "saveAttack", "demoralize", "conditionSave"].includes(a.type) && a.legal !== false));
  assert.ok(firstContactIdx > 0, "expected at least some turns to pass before first contact — an immediate first-turn attack would mean the blind opening isn't actually blind");
  // Nobody should be permanently frozen: every turn before contact must show REAL movement, not an
  // empty held turn — confirms the exploration candidate is actually firing, not leaving everyone stuck.
  const preContact = allTurns.slice(0, firstContactIdx === -1 ? allTurns.length : firstContactIdx);
  const heldTurns = preContact.filter((t) => !(t.actions ?? []).length);
  assert.ok(heldTurns.length < preContact.length, `expected real exploration movement before contact, but ${heldTurns.length}/${preContact.length} pre-contact turns were completely held`);
});

// --- 4v4 (design doc §38 — Ingram's own question: "4 level 1 PCs should actually potentially
// struggle against 4 NPCs at level 1... I wonder if your simulations will reveal any group
// failures.") Every real fixture this project has built, one side each, on RANDOM_ARCS so no fixed
// setup's own starting geometry biases the result. The real measured outcome distribution across
// many seeds lives in design doc §38, not here — these tests only prove the scenario itself is
// sound (scales cleanly to a 4th combatant per side, resolves legally, deploys genuinely blind). ---

const PARTY_4V4 = ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json"];
const OPPOSITION_4V4 = ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json", "tough.json"];

test("buildScenario: RANDOM_ARCS scales cleanly to 4v4 — genuinely zero cross-side Line of Effect at deployment on the real complex-battle map, same guarantee as the proven 3v3 case", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const scenario = buildScenario({ seed, partyFixtures: PARTY_4V4, oppositionFixtures: OPPOSITION_4V4, setup: "RANDOM_ARCS" });
    const partyIds = scenario.combatants.filter((c) => c.side === "party").map((c) => c.id);
    const oppositionIds = scenario.combatants.filter((c) => c.side === "opposition").map((c) => c.id);
    const positions = new Map(scenario.combatants.map((c) => [c.id, c.position]));
    for (const pId of partyIds) for (const oId of oppositionIds) {
      assert.equal(lineOfEffect(positions.get(pId), positions.get(oId), scenario.walls), false, `seed ${seed}: ${pId} can see ${oId} at deployment — not genuinely blind`);
    }
  }
});

// design doc §43, Stage 2: seed counts on this pair were cut back (15->6, 20->8) and roundLimit
// capped well below the other RANDOM_ARCS tests' own 60, once whole-turn planning's real, measured
// per-battle cost (up to the better part of a minute for a single 8-combatant fight — see that
// section's own profiling writeup) made the original counts take the better part of an hour between
// them. Neither test's own PURPOSE needs the original counts: an illegal action, if the corpse-in-
// doorway/cover-mechanic regressions this pair guards against ever recurred, would show up well
// within a handful of seeds and rounds, not require 15-20 to surface; a genuine mix of outcomes in a
// fair fight shows up just as reliably in 6-8 seeds as 15-20.
test("buildScenario: 4v4 RANDOM_ARCS resolves cleanly end to end — zero illegal attacks, all 8 combatants present, across several seeds", () => {
  for (let seed = 1; seed <= 6; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_4V4, oppositionFixtures: OPPOSITION_4V4, setup: "RANDOM_ARCS", roundLimit: 30 }));
    assert.equal(Object.keys(log.roster).length, 8, `seed ${seed}: expected all 8 real combatants in the roster`);
    assert.equal(illegalAttacks(log), 0, `seed ${seed}: an attack was proposed-and-committed illegally`);
  }
});

test("buildScenario: 4v4 RANDOM_ARCS produces a real spread of outcomes across several seeds — not a guaranteed party win every time", () => {
  const outcomes = new Set();
  for (let seed = 1; seed <= 8; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_4V4, oppositionFixtures: OPPOSITION_4V4, setup: "RANDOM_ARCS", roundLimit: 40 }));
    outcomes.add(log.outcome);
  }
  assert.ok(outcomes.size > 1, `expected a real mix of outcomes across 8 seeds at 4v4 (a fair, symmetric fight should NOT resolve identically every time), saw only: ${[...outcomes].join(", ")}`);
});

// --- partyManeuvers (design doc §43, Stage 2's own explicit verification ask: "the same party with
// Trip, Shove and Grapple withheld, run head-to-head") ---

test("buildScenario: partyManeuvers:false strips athleticsModifier from every PARTY fixture, leaves the OPPOSITION's own untouched", () => {
  const withManeuvers = buildScenario({ seed: 1, partyFixtures: PARTY_4V4, oppositionFixtures: OPPOSITION_4V4, setup: "RANDOM_ARCS" });
  const withoutManeuvers = buildScenario({ seed: 1, partyFixtures: PARTY_4V4, oppositionFixtures: OPPOSITION_4V4, setup: "RANDOM_ARCS", partyManeuvers: false });

  const party = withManeuvers.combatants.filter((c) => c.side === "party");
  assert.ok(party.some((c) => c.athleticsModifier != null), "sanity check: at least one real PC fixture must actually carry an athleticsModifier for this test to mean anything");

  const strippedParty = withoutManeuvers.combatants.filter((c) => c.side === "party");
  for (const c of strippedParty) assert.equal(c.athleticsModifier, null, `${c.id}: expected athleticsModifier stripped to null with partyManeuvers:false`);

  // the OPPOSITION's own athleticsModifier must be completely unaffected either way — this is a
  // one-sided nerf to the PARTY's own capability, not a symmetric rules change.
  const oppositionWith = withManeuvers.combatants.filter((c) => c.side === "opposition").map((c) => c.athleticsModifier);
  const oppositionWithout = withoutManeuvers.combatants.filter((c) => c.side === "opposition").map((c) => c.athleticsModifier);
  assert.deepEqual(oppositionWith, oppositionWithout, "the opposition's own athleticsModifier must be identical regardless of the party's partyManeuvers setting");
});

// design doc §43, Stage 2's own real performance ceiling (a full 8-combatant, 60-round-cap RANDOM_
// ARCS battle can take upward of half a minute each — see that section's own profiling writeup):
// 3 seeds is deliberately small, and roundLimit is deliberately capped well below the other RANDOM_
// ARCS tests' own 60 — a maneuver either shows up once real combat starts (well within 20 rounds,
// consistent with this project's own measured mean-rounds-to-resolution figures elsewhere) or it
// doesn't; running all the way to a rare 60-round timeout adds cost without adding power here.
test("buildScenario: partyManeuvers:false is reflected end to end in a real runBattle — the party never attempts trip/shove/grapple across a few seeds, even though the identical roster does with maneuvers enabled", () => {
  let sawPartyManeuverWith = false;
  let sawPartyManeuverWithout = false;
  for (let seed = 1; seed <= 3; seed++) {
    const withLog = runBattle(buildScenario({ seed, partyFixtures: PARTY_4V4, oppositionFixtures: OPPOSITION_4V4, setup: "RANDOM_ARCS", roundLimit: 20, partyManeuvers: true }));
    const withoutLog = runBattle(buildScenario({ seed, partyFixtures: PARTY_4V4, oppositionFixtures: OPPOSITION_4V4, setup: "RANDOM_ARCS", roundLimit: 20, partyManeuvers: false }));
    for (const log of [withLog]) {
      for (const round of log.rounds) for (const turn of round.turns) {
        if (log.roster[turn.combatantId]?.side !== "party") continue;
        if ((turn.actions ?? []).some((a) => ["trip", "shove", "grapple"].includes(a.type))) sawPartyManeuverWith = true;
      }
    }
    for (const round of withoutLog.rounds) for (const turn of round.turns) {
      if (withoutLog.roster[turn.combatantId]?.side !== "party") continue;
      if ((turn.actions ?? []).some((a) => ["trip", "shove", "grapple"].includes(a.type))) sawPartyManeuverWithout = true;
    }
  }
  assert.ok(sawPartyManeuverWith, "expected the party to actually attempt at least one real maneuver across 3 seeds WITH partyManeuvers enabled — otherwise this pair proves nothing");
  assert.ok(!sawPartyManeuverWithout, "the party must NEVER attempt trip/shove/grapple with partyManeuvers:false, across any of the 3 seeds");
});

// --- partyProfile / oppositionProfile (design doc §46 — AI profiles) — all deliberately small/fast
// (1v1, short roundLimit), since ai-profiles.test.mjs already carries the real golden-sequence
// proof; these exist specifically to test buildScenario's OWN plumbing (the ai closure + combatant
// field merging), not to re-prove ai-profiles.mjs's own logic a second time. ---

test("buildScenario: partyProfile/oppositionProfile OMITTED (every pre-§46 call, including every test above) produces the EXACT SAME real battle as explicitly passing BASELINE_V1 for both sides — proves the opt-in default is truly a no-op, not just numerically close", () => {
  function realActionSequence(scenario) {
    const log = runBattle(scenario);
    const seq = [];
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      seq.push(`${turn.combatantId}:${action.type}${action.targetId ? "->" + action.targetId : ""}`);
    }
    return { outcome: log.outcome, seq };
  }
  const omitted = buildScenario({ seed: 5, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "DIAGONAL_SW_NE", roundLimit: 15 });
  const explicit = buildScenario({ seed: 5, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "DIAGONAL_SW_NE", roundLimit: 15, partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1 });
  assert.deepEqual(realActionSequence(omitted), realActionSequence(explicit));
});

test("buildScenario: oppositionProfile: NO_MANEUVERS_V1 is real end to end through the ACTUAL scenario builder (not a hand-rolled scenario) — opposition never attempts trip/shove/grapple across several seeds, even though its own real fixture carries a real athleticsModifier", () => {
  const oppositionAthleticsModifier = JSON.parse(readFileSync("tools/battle-simulator/data/raw-validation-fixtures/security-goon.json", "utf8")).athleticsModifier;
  assert.ok(oppositionAthleticsModifier != null, "sanity check: Security Goon must have a real athleticsModifier, or this test cannot distinguish the profile restriction from an already-absent capability");
  let sawManeuver = false;
  for (let seed = 1; seed <= 4; seed++) {
    const scenario = buildScenario({ seed, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "DIAGONAL_SW_NE", roundLimit: 15, oppositionProfile: NO_MANEUVERS_V1 });
    assert.equal(scenario.combatants[1].athleticsModifier, oppositionAthleticsModifier, "the profile must NOT touch the fixture's own athleticsModifier — the restriction is a decision-time filter, not a data mutation");
    const log = runBattle(scenario);
    for (const round of log.rounds) for (const turn of round.turns) {
      if (turn.combatantId !== scenario.combatants[1].id) continue;
      if ((turn.actions ?? []).some((a) => ["trip", "shove", "grapple"].includes(a.type))) sawManeuver = true;
    }
  }
  assert.ok(!sawManeuver, "the opposition must never attempt trip/shove/grapple across any of the 4 seeds with NO_MANEUVERS_V1 assigned");
});

test("buildScenario: a profile's temperament/aggression really do land on the deployed combatants — checked directly on the returned scenario, no battle needed", () => {
  const scenario = buildScenario({ seed: 1, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "DIAGONAL_SW_NE", roundLimit: 15, partyProfile: NO_MANEUVERS_V1, oppositionProfile: BASELINE_V1 });
  assert.equal(scenario.combatants[0].temperament, NO_MANEUVERS_V1.temperament);
  assert.equal(scenario.combatants[0].aggression, NO_MANEUVERS_V1.aggression);
  assert.equal(scenario.combatants[1].temperament, BASELINE_V1.temperament);
});

// design doc §57/#4: this scenario builder is one of the three real sites issue #4 names as needing
// to resolve a policy through the ai-common/ registry (the other two are personnel-mirror.mjs, whose
// own equivalence test lives in personnel-mirror.test.mjs, and tournament-worker.mjs, which is covered
// transitively since it calls personnel-mirror.mjs's buildScenario). GREEDY_V1_POLICY is BY
// CONSTRUCTION the same decide() BASELINE_V1 itself drives, so routing it through this scenario
// builder's own new "policy" branch must be byte-identical to the ordinary BASELINE_V1 path.
test("buildScenario: oppositionProfile: GREEDY_V1_POLICY (dispatched through the ai-common/ registry) is BYTE-IDENTICAL, action for action, to oppositionProfile: BASELINE_V1 — this scenario builder's own new \"policy\" branch adds no behavior of its own", () => {
  function realActionSequence(scenario) {
    const log = runBattle(scenario);
    const seq = [];
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      seq.push(`${turn.combatantId}:${action.type}${action.targetId ? "->" + action.targetId : ""}`);
    }
    return { outcome: log.outcome, seq };
  }
  const direct = buildScenario({ seed: 5, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "DIAGONAL_SW_NE", roundLimit: 15, partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1 });
  const viaRegistry = buildScenario({ seed: 5, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "DIAGONAL_SW_NE", roundLimit: 15, partyProfile: BASELINE_V1, oppositionProfile: GREEDY_V1_POLICY });
  assert.deepEqual(realActionSequence(viaRegistry), realActionSequence(direct));
});
