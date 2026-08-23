/**
 * Tests for the party side's tactical policy (partyAI). As of design doc
 * §15j, partyAI is a thin wrapper over the shared decide() decision layer —
 * these tests exercise that layer end-to-end from the party's perspective
 * (Vesper's dual-weapon conservation specifically), rather than testing
 * partyAI's own logic in isolation, since it no longer has any.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { partyAI } from "../../tools/battle-simulator/ai/party-ai.mjs";

function makeCombatantState({ vehiclePos, opponentPos, opponentOverrides = {} }) {
  const sidearm = { name: "Mounted Sidearm", strikeType: "ranged", attackBonus: 20, rangeIncrement: 100, traits: ["mounted"], damage: [{ dice: "3d6", bonus: 10 }] };
  const longRange = { name: "Rocket Pod", strikeType: "ranged", attackBonus: 24, rangeIncrement: 2000, traits: ["mounted"], damage: [{ dice: "3d8", bonus: 12 }], usesRemaining: 1, usesPerEncounter: 1 };
  const vehicle = { id: "vesper", name: "Vesper", kind: "chassis", side: "party", strikes: [sidearm, longRange], position: vehiclePos };
  // ac/maxHP/kind/scaleHardness added 2026-08-22 (design doc §14h) to match the real Claimant
  // (data/antagonists/claimants/contact-unclassified.json) — the utility-AI framework needs a
  // genuine AC to score a Strike candidate's real expected damage against; without one,
  // resolveEffectiveStats reads ac as undefined and every candidate correctly scores 0.
  const opponent = { id: "claimant-one", name: "Claimant", kind: "claimant", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, hardness: 0, scaleHardness: 15, immuneToAllDamage: false, position: opponentPos, ...opponentOverrides };
  const state = {
    gridSize: { cols: 44, rows: 44 },
    combatants: new Map([["vesper", vehicle], ["claimant-one", opponent]]),
    positions: new Map([["vesper", vehicle.position], ["claimant-one", opponent.position]])
  };
  const turnState = { actionsAvailable: 3, actionsUsed: 0, strikesAttempted: 0, feetMoved: 0, effective: { speed: 1500 } };
  return { state, turnState, vehicle };
}

/**
 * Design doc §14g/§14h: a vehicle carrying both a standard sidearm and a
 * limited-use long-range weapon should spend the expensive one as an
 * opening shot from beyond the sidearm's clean range, and never against a
 * target that's still immuneToAllDamage (the Interdiction Field) — a
 * guaranteed 0-damage hit is a worse waste than a miss.
 */
/**
 * REWRITTEN 2026-08-23 (design doc §15l). This previously asserted that the AI
 * *must* fire the Rocket Pod the moment a target sat beyond sidearm range. That
 * was one implementation's tactic, not design intent — with a real state
 * evaluator, closing the distance to use the free weapon can legitimately be the
 * better play, and forcing the shot would be exactly the waste the conservation
 * rule exists to prevent.
 *
 * The durable intent (Ingram: "expensive to use... a terrible waste if they
 * miss... players will have to find the funding to replace it") is CONSERVATION,
 * so that is what is asserted: whatever it does, it must not burn the one-shot
 * weapon when a free weapon is already a clean option.
 */
test("DESIGN INTENT: a vehicle does not burn its limited-use weapon while a free weapon is already in clean range", () => {
  const { state, turnState } = makeCombatantState({ vehiclePos: { col: 0, row: 0 }, opponentPos: { col: 1, row: 0 } }); // 50ft — inside the 100ft sidearm
  const proposal = partyAI(state, "vesper", turnState);
  assert.ok(proposal, "expected the vehicle to do something");
  const firedLimitedWeapon = proposal.type === "strike" && proposal.strikeIndex === 1;
  assert.ok(!firedLimitedWeapon,
    `fired the one-shot Rocket Pod at point-blank range where the free sidearm reaches: ${JSON.stringify(proposal)}`);
});

test("DESIGN INTENT: a vehicle never proposes a limited-use weapon it has already spent", () => {
  const { state, turnState, vehicle } = makeCombatantState({ vehiclePos: { col: 0, row: 0 }, opponentPos: { col: 20, row: 0 } });
  vehicle.strikes[1].usesRemaining = 0;
  const proposal = partyAI(state, "vesper", turnState);
  assert.notEqual(proposal?.strikeIndex, 1, `proposed a weapon with no uses left: ${JSON.stringify(proposal)}`);
});

test("REGRESSION: partyAI never fires the long-range weapon into a target that's still immuneToAllDamage (found running the range-rework scenario: both vehicles' one-shot weapons landed on a Field-intact Claimant for a guaranteed, wasted 0 damage)", () => {
  const { state, turnState } = makeCombatantState({ vehiclePos: { col: 0, row: 0 }, opponentPos: { col: 20, row: 0 }, opponentOverrides: { immuneToAllDamage: true } });
  const proposal = partyAI(state, "vesper", turnState);
  assert.notEqual(proposal?.strikeIndex, 1, `must not fire strikeIndex 1 (the long-range weapon) at an immune target: ${JSON.stringify(proposal)}`);
});

test("partyAI: does not fire the long-range weapon once the target is already within the sidearm's own clean range", () => {
  const { state, turnState } = makeCombatantState({ vehiclePos: { col: 0, row: 0 }, opponentPos: { col: 1, row: 0 } }); // 50ft, inside the 100ft sidearm range
  const proposal = partyAI(state, "vesper", turnState);
  assert.notEqual(proposal?.strikeIndex, 1, `already in sidearm range — should use the free sidearm (index 0), not the expensive weapon: ${JSON.stringify(proposal)}`);
});

test("partyAI: once the long-range weapon's usesRemaining is 0, falls back to the sidearm even from far away", () => {
  const { state, turnState, vehicle } = makeCombatantState({ vehiclePos: { col: 0, row: 0 }, opponentPos: { col: 20, row: 0 } });
  vehicle.strikes[1].usesRemaining = 0;
  const proposal = partyAI(state, "vesper", turnState);
  // Still 1000ft away and the sidearm's range is only 100ft, so the AI should propose closing
  // the distance (a move) rather than a strike at all — the point is it must NOT propose the
  // spent long-range weapon (strikeIndex 1).
  assert.notEqual(proposal?.strikeIndex, 1, `usesRemaining is 0 — must not propose the spent weapon: ${JSON.stringify(proposal)}`);
});
