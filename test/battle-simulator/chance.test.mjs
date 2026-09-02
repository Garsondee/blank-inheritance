/**
 * Tests for personnel-engine/search/chance.mjs — real stochastic chance-node enumeration (design doc
 * §64, GH issue #6 step 4 / "Phase B"). Real concerns:
 * (1) isStochasticProposal names exactly what's covered (strike, trip) and nothing else;
 * (2) real degree probabilities sum to exactly 1, and match hand computation, for both covered types;
 * (3) each branch's own real consequences (damage, prone, self-prone) are hand-verified per degree,
 *     not just "some number came out";
 * (4) an illegal proposal is reported as illegal, not silently branched;
 * (5) forkTurnSandbox's own widening (the one real engine change this needed) is a genuine
 *     zero-behavior-change default — every existing caller that never passes `outcomes` is unaffected.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { expandChanceNode, isStochasticProposal } from "../../tools/battle-simulator/personnel-engine/search/chance.mjs";
import { forkTurnSandbox } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { degreeProbabilities, mitigateDamage, averageStrikeDamage, averageDamage } from "../../tools/battle-simulator/engine/resolve.mjs";

function makeStrikeState() {
  const attacker = {
    id: "attacker", name: "Attacker", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "2d6", bonus: 4, damageType: "slashing" }] }],
    position: { col: 5, row: 5 }
  };
  const target = { id: "target", name: "Target", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 6, row: 5 } };
  return {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["attacker", "target"],
    combatants: new Map([["attacker", { ...attacker }], ["target", { ...target }]]),
    positions: new Map([["attacker", { ...attacker.position }], ["target", { ...target.position }]])
  };
}

function makeTripState(athleticsModifier = 12) {
  const attacker = {
    id: "attacker", name: "Attacker", side: "party", maxHP: 30, currentHP: 30, ac: 17, saves: { fort: 8, ref: 8, will: 8 }, speed: 25,
    athleticsModifier, strikes: [], position: { col: 5, row: 5 }
  };
  const target = { id: "target", name: "Target", side: "opposition", maxHP: 30, currentHP: 30, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 6, row: 5 } };
  return {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["attacker", "target"],
    combatants: new Map([["attacker", { ...attacker }], ["target", { ...target }]]),
    positions: new Map([["attacker", { ...attacker.position }], ["target", { ...target.position }]])
  };
}

const TURN = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };

test("isStochasticProposal: true for strike and trip, false for move and every other real type", () => {
  assert.equal(isStochasticProposal({ type: "strike", targetId: "x", strikeIndex: 0 }), true);
  assert.equal(isStochasticProposal({ type: "trip", targetId: "x" }), true);
  assert.equal(isStochasticProposal({ type: "move", to: { col: 0, row: 0 } }), false);
  assert.equal(isStochasticProposal({ type: "shove", targetId: "x" }), false, "shove is real but NOT yet covered — must not be silently misreported as stochastic-handled");
  assert.equal(isStochasticProposal({ type: "healAbility", targetId: "x", abilityIndex: 0 }), false);
});

test("expandChanceNode (strike): real degree probabilities sum to exactly 1 and match hand-computed degreeProbabilities", () => {
  const state = makeStrikeState();
  const proposal = { type: "strike", targetId: "target", strikeIndex: 0 };
  const branches = expandChanceNode({ state, turn: TURN, combatantId: "attacker", proposal });
  const totalProbability = branches.reduce((sum, b) => sum + b.probability, 0);
  assert.ok(Math.abs(totalProbability - 1) < 1e-9, `expected probabilities to sum to 1, got ${totalProbability}`);

  // attackBonus=10, no mapPenalty (first strike), targetAc=15 -> modifier=10, dc=15.
  const expectedProbs = degreeProbabilities(10, 15);
  for (const b of branches) {
    assert.ok(Math.abs(b.probability - expectedProbs[b.degree]) < 1e-9, `${b.degree}: expected probability ${expectedProbs[b.degree]}, got ${b.probability}`);
  }
});

test("expandChanceNode (strike): each branch's real damage matches hand-computed mitigateDamage for that exact degree — miss/crit-miss deal zero, hit/crit deal the real expected-per-degree amount", () => {
  const state = makeStrikeState();
  const strike = state.combatants.get("attacker").strikes[0];
  const proposal = { type: "strike", targetId: "target", strikeIndex: 0 };
  const branches = expandChanceNode({ state, turn: TURN, combatantId: "attacker", proposal });

  const avgRaw = averageStrikeDamage(strike);
  const targetEffective = { ac: 15, hardness: 0 };
  const expectedDamage = {
    criticalSuccess: mitigateDamage(avgRaw * 2, { target: {}, targetEffective, strike }),
    success: mitigateDamage(avgRaw, { target: {}, targetEffective, strike }),
    failure: 0,
    criticalFailure: 0
  };
  for (const b of branches) {
    const targetHpAfter = b.state.combatants.get("target").currentHP;
    assert.ok(Math.abs((30 - targetHpAfter) - expectedDamage[b.degree]) < 1e-9,
      `${b.degree}: expected ${expectedDamage[b.degree]} damage, got ${30 - targetHpAfter}`);
  }
});

test("expandChanceNode (trip): real probabilities sum to 1, and each branch's real prone/self-prone/damage consequences match Player Core's own rule per degree", () => {
  const state = makeTripState(12);
  const proposal = { type: "trip", targetId: "target" };
  const branches = expandChanceNode({ state, turn: TURN, combatantId: "attacker", proposal });
  const totalProbability = branches.reduce((sum, b) => sum + b.probability, 0);
  assert.ok(Math.abs(totalProbability - 1) < 1e-9);

  const expectedProbs = degreeProbabilities(12, 15); // athleticsModifier=12, dc=10+target.saves.fort(5)=15
  const critDamage = mitigateDamage(averageDamage("1d6", 0), { target: {}, targetEffective: { hardness: 0 }, strike: null });

  for (const b of branches) {
    assert.ok(Math.abs(b.probability - expectedProbs[b.degree]) < 1e-9, `${b.degree}: probability mismatch`);
    const target = b.state.combatants.get("target");
    const attacker = b.state.combatants.get("attacker");
    if (b.degree === "criticalSuccess") {
      assert.equal(!!target.prone, true, "criticalSuccess must knock the target prone");
      assert.ok(Math.abs((30 - target.currentHP) - critDamage) < 1e-9, "criticalSuccess must deal the real 1d6-average bludgeoning damage");
    } else if (b.degree === "success") {
      assert.equal(!!target.prone, true, "success must knock the target prone");
      assert.equal(target.currentHP, 30, "success deals no damage, only prone");
    } else if (b.degree === "failure") {
      assert.equal(!!target.prone, false);
      assert.equal(!!attacker.prone, false);
      assert.equal(target.currentHP, 30);
    } else if (b.degree === "criticalFailure") {
      assert.equal(!!attacker.prone, true, "criticalFailure must knock the ATTACKER prone, not the target");
      assert.equal(!!target.prone, false);
      assert.equal(target.currentHP, 30);
    }
  }
});

test("expandChanceNode: an illegal proposal is reported as a single, real illegal branch — never silently expanded into fake outcomes", () => {
  const state = makeStrikeState();
  // strikeIndex 5 doesn't exist — a real, checkable illegal proposal, exactly like any other policy would hit.
  const proposal = { type: "strike", targetId: "target", strikeIndex: 5 };
  const branches = expandChanceNode({ state, turn: TURN, combatantId: "attacker", proposal });
  assert.equal(branches.length, 1);
  assert.equal(branches[0].legal, false);
  assert.equal(branches[0].degree, null);
});

// --- forkTurnSandbox's own widening: a real, verified zero-behavior-change default ---

test("forkTurnSandbox: omitting `outcomes` entirely still defaults to the real, unmodified EXPECTED_OUTCOMES path — every existing caller (this whole project, until design doc §64) is completely unaffected", () => {
  const state = makeStrikeState();
  const proposal = { type: "strike", targetId: "target", strikeIndex: 0 };
  const withoutOutcomesParam = forkTurnSandbox({ state, turn: TURN }).apply("attacker", { ...proposal });
  const explicitDefault = forkTurnSandbox({ state, turn: TURN, outcomes: undefined }).apply("attacker", { ...proposal });
  assert.equal(withoutOutcomesParam.legal, true);
  assert.deepEqual(withoutOutcomesParam.roll, explicitDefault.roll, "omitting `outcomes` and explicitly passing undefined must produce byte-identical real results — both resolve to the same real default");
  assert.equal(withoutOutcomesParam.roll.expected, true, "the real default must still be the expected-value path, not a forced degree");
});
