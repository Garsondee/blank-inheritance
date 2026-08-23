/**
 * Tests for the generic complex-battle scenario builder (design doc §21/§22) — proven first against
 * the two original real fixtures (Lunar-17, Security Goon), then end to end against a real 3-vs-3
 * fight using all six checked-in fixtures (Lunar-17+Tapkey+Bennit vs. Security Goon+Xenowarden
 * Greenhorn+Erabryth) on the redesigned map (windows, cover, asymmetric rooms — design doc §22).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/personnel-complex-battle.mjs";

const ATTACK_TYPES = ["strike", "spellAttack", "saveAttack", "demoralize", "conditionSave"];

function illegalAttacks(log) {
  let count = 0;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if (ATTACK_TYPES.includes(action.type) && action.legal === false) count += 1;
  }
  return count;
}

test("buildScenario: a real 1-vs-1 fight on the complex map resolves cleanly with zero illegal attacks", () => {
  for (const setup of ["SAME_ROOM", "SAME_BUILDING_FAR_ROOMS", "ACROSS_THE_COMPLEX"]) {
    const log = runBattle(buildScenario({ seed: 1, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup, roundLimit: 30 }));
    assert.equal(illegalAttacks(log), 0, `setup ${setup}: an attack was proposed-and-committed illegally`);
  }
});

test("buildScenario: rejects an unknown setup name", () => {
  assert.throws(() => buildScenario({ seed: 1, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "NOT_REAL" }), /Unknown setup/);
});

test("buildScenario: rejects asking for more combatants on a side than the setup defines spawn points for, rather than silently reusing/colliding positions", () => {
  assert.throws(() => buildScenario({
    seed: 1, partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json", "lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "SAME_ROOM"
  }), /only defines 3 party spawn point/);
});

test("buildScenario: the SAME fixture file used twice on one side gets genuinely distinct ids AND positions — a real collision trap otherwise (runBattle keys its live combatant map by id, so a repeated id silently drops one combatant with no error)", () => {
  const scenario = buildScenario({ seed: 1, partyFixtures: ["lunar-17.json", "lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "SAME_ROOM" });
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
  for (const setup of ["SAME_ROOM", "SAME_BUILDING_FAR_ROOMS", "ACROSS_THE_COMPLEX"]) {
    const log = runBattle(buildScenario({ seed: 1, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup, roundLimit: 30 }));
    assert.equal(Object.keys(log.roster).length, 6, `setup ${setup}: expected all 6 real combatants in the roster`);
    assert.equal(illegalAttacks(log), 0, `setup ${setup}: an attack was proposed-and-committed illegally in the real 3v3 fight`);
    assert.ok(["party-victory", "party-defeat", "timeout"].includes(log.outcome.result));
  }
});

test("buildScenario: across many seeds, zero illegal attacks anywhere, and no more than an occasional timeout — the real generalized proof that the corpse-in-doorway fix (design doc §21) and cover mechanic (design doc §22) hold up on a genuinely bigger 3v3 roster, not just the specific 2v2 case that first found the bug", () => {
  let timeouts = 0;
  const total = 10;
  for (let seed = 1; seed <= total; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "ACROSS_THE_COMPLEX", roundLimit: 30 }));
    assert.equal(illegalAttacks(log), 0, `seed ${seed}: an attack was proposed-and-committed illegally`);
    if (log.outcome.result === "timeout") timeouts += 1;
  }
  assert.ok(timeouts <= total / 2, `expected timeouts to stay rare (${timeouts}/${total}) — a majority-timeout result would mean real combatants still can't reliably reach each other`);
});

test("buildScenario: the real 3-vs-3 fight exercises strike/spellAttack/saveAttack (Bennit's Thunderstrike)/conditionSave (Erabryth's Forced Reflection)/move across a handful of seeds — proving the roster's real diversity, including both new §22 mechanisms, actually gets used", () => {
  const seenTypes = new Set();
  for (let seed = 1; seed <= 10; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "SAME_ROOM", roundLimit: 30 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      seenTypes.add(action.type);
    }
  }
  for (const expected of ["strike", "spellAttack", "saveAttack", "conditionSave", "move"]) {
    assert.ok(seenTypes.has(expected), `expected to see a real "${expected}" action across 10 seeds, saw: ${[...seenTypes].join(", ")}`);
  }
});

test("buildScenario: real cover objects on the new map actually get crossed into during real 3v3 fights — at least one strike shows a nonzero coverBonus across several seeds", () => {
  let sawCover = false;
  for (let seed = 1; seed <= 10 && !sawCover; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_3V3, oppositionFixtures: OPPOSITION_3V3, setup: "SAME_ROOM", roundLimit: 30 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      if ((action.type === "strike" || action.type === "saveAttack") && action.coverBonus > 0) sawCover = true;
    }
  }
  assert.ok(sawCover, "expected at least one real attack across 10 seeds to show a nonzero coverBonus — the new map's cover objects must actually matter in real play, not just in isolated unit tests");
});
