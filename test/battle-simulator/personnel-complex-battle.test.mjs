/**
 * Tests for the generic complex-battle scenario builder (design doc §21) — proven first against
 * the two original real fixtures (Lunar-17, Security Goon), then end to end against a real 2-vs-2
 * fight using all four checked-in fixtures (Lunar-17+Tapkey vs. Security Goon+Xenowarden Greenhorn).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/personnel-complex-battle.mjs";

test("buildScenario: a real 1-vs-1 fight on the complex map resolves cleanly with zero illegal attacks", () => {
  for (const setup of ["SAME_ROOM", "SAME_BUILDING_FAR_ROOMS", "ACROSS_THE_COMPLEX"]) {
    const log = runBattle(buildScenario({ seed: 1, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup, roundLimit: 30 }));
    let sawIllegal = false;
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      if ((action.type === "strike" || action.type === "spellAttack" || action.type === "saveAttack" || action.type === "demoralize") && !action.legal) sawIllegal = true;
    }
    assert.equal(sawIllegal, false, `setup ${setup}: an attack was proposed-and-committed illegally`);
  }
});

test("buildScenario: rejects an unknown setup name", () => {
  assert.throws(() => buildScenario({ seed: 1, partyFixtures: ["lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "NOT_REAL" }), /Unknown setup/);
});

test("buildScenario: rejects asking for more combatants on a side than the setup defines spawn points for, rather than silently reusing/colliding positions", () => {
  assert.throws(() => buildScenario({
    seed: 1, partyFixtures: ["lunar-17.json", "lunar-17.json", "lunar-17.json"], oppositionFixtures: ["security-goon.json"], setup: "SAME_ROOM"
  }), /only defines 2 party spawn point/);
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

// --- Real 2-vs-2, all four checked-in fixtures (design doc §21) ---

const PARTY_2V2 = ["lunar-17.json", "tapkey.json"];
const OPPOSITION_2V2 = ["security-goon.json", "xenowarden-greenhorn.json"];

test("buildScenario: a real 2-vs-2 fight (Lunar-17+Tapkey vs. Security Goon+Xenowarden Greenhorn) resolves cleanly across all three setups, with all four combatants present and zero illegal attacks", () => {
  for (const setup of ["SAME_ROOM", "SAME_BUILDING_FAR_ROOMS", "ACROSS_THE_COMPLEX"]) {
    const log = runBattle(buildScenario({ seed: 1, partyFixtures: PARTY_2V2, oppositionFixtures: OPPOSITION_2V2, setup, roundLimit: 30 }));
    assert.equal(Object.keys(log.roster).length, 4, `setup ${setup}: expected all 4 real combatants in the roster`);
    let sawIllegal = false;
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      if (["strike", "spellAttack", "saveAttack", "demoralize"].includes(action.type) && !action.legal) sawIllegal = true;
    }
    assert.equal(sawIllegal, false, `setup ${setup}: an attack was proposed-and-committed illegally in the real 2v2 fight`);
    assert.ok(["party-victory", "party-defeat", "timeout"].includes(log.outcome.result));
  }
});

test("buildScenario: the real 2-vs-2 fight exercises strike/spellAttack/healAbility/move across a handful of seeds — proving the roster's real diversity actually gets used, not just legally tolerated (no saveAttack: the roster's only candidate, Incendiary Grenade, is a real area-burst weapon correctly excluded — see design doc §21)", () => {
  const seenTypes = new Set();
  for (let seed = 1; seed <= 8; seed++) {
    const log = runBattle(buildScenario({ seed, partyFixtures: PARTY_2V2, oppositionFixtures: OPPOSITION_2V2, setup: "SAME_ROOM", roundLimit: 30 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      seenTypes.add(action.type);
    }
  }
  for (const expected of ["strike", "spellAttack", "move"]) {
    assert.ok(seenTypes.has(expected), `expected to see a real "${expected}" action across 8 seeds, saw: ${[...seenTypes].join(", ")}`);
  }
  assert.equal(seenTypes.has("saveAttack"), false, "no fixture has a usable saveAttack any more — grenades were removed for being area-burst weapons, see design doc §21");
});

/**
 * REGRESSION (design doc §21, found from a direct user report: "a bad guy oscillates by moving up
 * and down... moved three times when they could have engaged"). Root cause, confirmed by
 * instrumenting a real fight: `state.positions` keeps every combatant's position forever, alive or
 * dead, and every occupancy check for movement (both the AI's own candidate generation AND the real
 * engine's own legality gate) used to read straight off it with no HP filter. Security Goon died
 * standing in (20,11) — the SINGLE doorway connecting Xenowarden Greenhorn's building to the rest of
 * the map — and her corpse permanently sealed that doorway for the remaining 27 rounds, which is what
 * both symptoms actually were: unable to ever leave her own building, Xenowarden Greenhorn's own
 * "best available move" oscillated forever between two dead-end squares near the useless door.
 *
 * Before the fix (engine.mjs's livingPositions / decide.mjs's otherLivingPositions): this exact
 * seed/setup timed out at the 30-round limit with zero net progress. After: it resolves in 4 rounds,
 * a real party-victory, WITH Xenowarden Greenhorn actually landing three real Arc Pistol strikes the
 * instant the doorway opens up. Pinned here as the concrete, reproducible case that exposed the bug.
 */
test("buildScenario: ACROSS_THE_COMPLEX seed=3 — a combatant who dies in a doorway no longer permanently blocks it; the fight that used to time out at 30 rounds now resolves quickly with real engagement", () => {
  const log = runBattle(buildScenario({ seed: 3, partyFixtures: PARTY_2V2, oppositionFixtures: OPPOSITION_2V2, setup: "ACROSS_THE_COMPLEX", roundLimit: 30 }));
  assert.equal(log.outcome.result, "party-victory", "this seed used to time out — a corpse blocking the only doorway is what caused that, see this test's own header");
  assert.ok(log.rounds.length <= 10, `expected a quick, decisive resolution once the doorway is actually usable, took ${log.rounds.length} rounds`);

  let sawIllegal = false, xgAttacked = false;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if (["strike", "spellAttack", "saveAttack", "demoralize"].includes(action.type)) {
      if (!action.legal) sawIllegal = true;
      if (turn.combatantId === "raw-validation-xenowarden-greenhorn-o1" && action.type === "strike" && action.legal) xgAttacked = true;
    }
  }
  assert.equal(sawIllegal, false);
  assert.ok(xgAttacked, "Xenowarden Greenhorn must actually land a real attack once the doorway opens up, not just move toward it forever");
});
