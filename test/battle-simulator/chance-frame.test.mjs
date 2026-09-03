/**
 * Frame-scale tests for chance.mjs's own expandChanceNode (design doc §75, GH issue #20) — mirrors
 * chance.test.mjs's own structure for personnel's strike, proving Frame's real strike degree-branching
 * works identically once Frame's own forkTurnSandbox exposes an outcomes override (Decision 1) and
 * expandChanceNode threads it through via the new engine parameter (Decision 2).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { expandChanceNode } from "../../tools/battle-simulator/personnel-engine/search/chance.mjs";
import { forkTurnSandbox } from "../../tools/battle-simulator/engine/engine.mjs";
import { degreeProbabilities, mitigateDamage, averageStrikeDamage } from "../../tools/battle-simulator/engine/resolve.mjs";

function makeFrameStrikeState() {
  const attacker = {
    id: "attacker", name: "Attacker", side: "party", size: "huge", maxHP: 100, currentHP: 100, ac: 20, hardness: 5, speed: 300,
    strikes: [{ name: "Blaster", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "2d6", bonus: 4, damageType: "slashing" }] }],
    position: { col: 0, row: 0 }
  };
  const target = { id: "target", name: "Target", side: "opposition", size: "huge", maxHP: 100, currentHP: 100, ac: 15, hardness: 0, speed: 0, strikes: [], position: { col: 0, row: 1 } };
  return {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 },
    initiativeOrder: ["attacker", "target"],
    combatants: new Map([["attacker", { ...attacker }], ["target", { ...target }]]),
    positions: new Map([["attacker", { ...attacker.position }], ["target", { ...target.position }]]),
    reactionAvailable: new Map([["attacker", true], ["target", true]])
  };
}

const TURN = { actionsAvailable: 1, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0 };
const ENGINE = { forkTurnSandbox };

test("expandChanceNode (Frame strike): real degree probabilities sum to exactly 1 and match hand-computed degreeProbabilities, forked through Frame's own forkTurnSandbox via the new engine param", () => {
  const state = makeFrameStrikeState();
  const proposal = { type: "strike", targetId: "target", strikeIndex: 0 };
  const branches = expandChanceNode({ state, turn: TURN, combatantId: "attacker", proposal, engine: ENGINE });
  const totalProbability = branches.reduce((sum, b) => sum + b.probability, 0);
  assert.ok(Math.abs(totalProbability - 1) < 1e-9, `expected probabilities to sum to 1, got ${totalProbability}`);

  // attackBonus=10, no mapPenalty (first strike), targetAc=15 -> modifier=10, dc=15.
  const expectedProbs = degreeProbabilities(10, 15);
  for (const b of branches) {
    assert.ok(Math.abs(b.probability - expectedProbs[b.degree]) < 1e-9, `${b.degree}: expected probability ${expectedProbs[b.degree]}, got ${b.probability}`);
  }
});

test("expandChanceNode (Frame strike): each branch's real damage matches hand-computed mitigateDamage for that exact degree — miss/crit-miss deal zero, hit/crit deal the real expected-per-degree amount", () => {
  const state = makeFrameStrikeState();
  const strike = state.combatants.get("attacker").strikes[0];
  const proposal = { type: "strike", targetId: "target", strikeIndex: 0 };
  const branches = expandChanceNode({ state, turn: TURN, combatantId: "attacker", proposal, engine: ENGINE });

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
    assert.ok(Math.abs((100 - targetHpAfter) - expectedDamage[b.degree]) < 1e-9,
      `${b.degree}: expected ${expectedDamage[b.degree]} damage, got ${100 - targetHpAfter}`);
  }
});

test("expandChanceNode (Frame strike): an immuneToAllDamage target takes real zero damage on every degree branch — mitigateDamage's own immunity check applies uniformly regardless of which degree got forced (exercises the Decision 2 immune-flag fix's own underlying behavior)", () => {
  const state = makeFrameStrikeState();
  state.combatants.get("target").immuneToAllDamage = true;
  const proposal = { type: "strike", targetId: "target", strikeIndex: 0 };
  const branches = expandChanceNode({ state, turn: TURN, combatantId: "attacker", proposal, engine: ENGINE });
  assert.ok(branches.length > 1, "expected real branches, not an illegal-proposal report");
  for (const b of branches) {
    assert.equal(b.legal, true);
    const target = b.state.combatants.get("target");
    assert.equal(target.currentHP, 100, `${b.degree}: expected zero damage against an immune target`);
  }
});

test("expandChanceNode (Frame): an illegal proposal is reported as a single, real illegal branch — never silently expanded into fake outcomes", () => {
  const state = makeFrameStrikeState();
  // strikeIndex 5 doesn't exist — a real, checkable illegal proposal.
  const proposal = { type: "strike", targetId: "target", strikeIndex: 5 };
  const branches = expandChanceNode({ state, turn: TURN, combatantId: "attacker", proposal, engine: ENGINE });
  assert.equal(branches.length, 1);
  assert.equal(branches[0].legal, false);
  assert.equal(branches[0].degree, null);
});

test("forkTurnSandbox (Frame engine): omitting `outcomes` entirely still defaults to the real, unmodified EXPECTED_OUTCOMES path — every existing caller is completely unaffected by the new override (design doc §75, Decision 1)", () => {
  const state = makeFrameStrikeState();
  const proposal = { type: "strike", targetId: "target", strikeIndex: 0 };
  const withoutOutcomesParam = forkTurnSandbox({ state, turn: TURN }).apply("attacker", { ...proposal });
  const explicitDefault = forkTurnSandbox({ state, turn: TURN, outcomes: undefined }).apply("attacker", { ...proposal });
  assert.equal(withoutOutcomesParam.legal, true);
  assert.deepEqual(withoutOutcomesParam.roll, explicitDefault.roll, "omitting `outcomes` and explicitly passing undefined must produce byte-identical real results — both resolve to the same real default");
  assert.equal(withoutOutcomesParam.roll.expected, true, "the real default must still be the expected-value path, not a forced degree");
});
