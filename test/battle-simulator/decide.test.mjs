/**
 * Direct tests for ai/decide.mjs's candidate generation — specifically Step
 * (design doc §15o), the one genuinely new SF2E action added this pass. The
 * broader decision layer (evaluateState-driven scoring) is covered by the
 * behavioural invariant tests in claimant-ai.test.mjs/party-ai.test.mjs and
 * the 20-seed metric sweeps recorded in design/scale-and-chassis.md; this
 * file is specifically about WHICH candidates get generated, since a Step
 * candidate that never gets offered can never be chosen no matter how good
 * the evaluator is.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateProposals } from "../../tools/battle-simulator/ai/decide.mjs";

function makeState({ meSize = "huge", enemySize = "gargantuan", mePos = { col: 0, row: 0 }, enemyPos = { col: 0, row: 2 } } = {}) {
  const me = {
    id: "me", name: "Me", side: "party", size: meSize, currentHP: 100, maxHP: 100,
    speed: 300, strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: mePos
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", size: enemySize, currentHP: 100, maxHP: 100,
    speed: 0, position: enemyPos
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 44, rows: 44 },
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...mePos }], ["enemy", { ...enemyPos }]]),
    reactionAvailable: new Map([["me", true], ["enemy", true]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 300 } };
  return { state, turn };
}

test("generateProposals: offers a Step candidate when a Large+ enemy is more than one square away", () => {
  const { state, turn } = makeState({ enemySize: "gargantuan", enemyPos: { col: 0, row: 3 } }); // 150ft = 3 squares away
  const proposals = generateProposals(state, "me", turn);
  const steps = proposals.filter((p) => p.type === "step");
  assert.ok(steps.length > 0, "expected at least one Step candidate toward a Large+ enemy");
});

test("generateProposals: a Step candidate closes exactly one square toward the enemy, never more", () => {
  const { state, turn } = makeState({ enemySize: "huge", enemyPos: { col: 0, row: 4 } });
  const proposals = generateProposals(state, "me", turn);
  const step = proposals.find((p) => p.type === "step");
  assert.ok(step, "expected a Step candidate");
  const distanceMoved = Math.abs(step.to.row - 0);
  assert.equal(distanceMoved, 1, `Step must move exactly one square (row delta 1), moved ${distanceMoved}`);
});

test("REGRESSION: never offers a Step candidate toward a Medium-or-smaller enemy (Step exists here specifically to avoid a Large+ reaction — there is nothing to avoid against a small target)", () => {
  const { state, turn } = makeState({ enemySize: "medium", enemyPos: { col: 0, row: 3 } });
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "step").length, 0);
});

test("generateProposals: offers no Step candidate once already adjacent — nothing left to close", () => {
  const { state, turn } = makeState({ enemySize: "gargantuan", enemyPos: { col: 0, row: 1 } }); // already adjacent
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "step").length, 0);
});

test("generateProposals: ordinary move candidates are still generated alongside Step, not replaced by it", () => {
  const { state, turn } = makeState({ enemySize: "gargantuan", enemyPos: { col: 0, row: 3 } });
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "move"), "Step must be an ADDITIONAL option, not a replacement for move");
});
