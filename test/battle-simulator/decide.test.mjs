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

// design doc §16 — the Claimant-restraint fix, tested directly at the mechanism rather than only
// end-to-end (claimant-ai.test.mjs's invariants). A synthetic fixture stands in for the Claimant:
// one reactionOnly strike, an enemy already in its reach.
test("generateProposals: NEVER offers a standalone strike proposal for a reactionOnly strike", () => {
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 0, row: 1 } }); // adjacent, in melee reach
  state.combatants.get("me").strikes = [{ name: "Claim-only Sweep", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "1d4", bonus: 0 }], reactionOnly: true }];
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "strike").length, 0, "a reactionOnly strike must never appear as a standalone proposal");
});

test("generateProposals: an ordinary (non-reactionOnly) strike on the SAME combatant is unaffected", () => {
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 0, row: 1 } });
  state.combatants.get("me").strikes = [
    { name: "Claim-only Sweep", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "1d4", bonus: 0 }], reactionOnly: true },
    { name: "Ordinary Fist", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }
  ];
  const proposals = generateProposals(state, "me", turn);
  const strikes = proposals.filter((p) => p.type === "strike");
  assert.equal(strikes.length, 1, "expected exactly the one ordinary strike, the reactionOnly one filtered out");
  assert.equal(strikes[0].strikeIndex, 1, "the surviving proposal must reference the ordinary strike's own index, not the filtered one's");
});

test("generateProposals (engine/factions.mjs): a party combatant never gets a strike proposal against a neutral combatant", () => {
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 0, row: 1 } });
  state.combatants.get("enemy").side = "neutral"; // reuse the "enemy" fixture as a civilian asset instead
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "strike").length, 0, "party must never be offered a legal Strike against a neutral combatant");
});

test("generateProposals (engine/factions.mjs): an opposition combatant DOES get a strike proposal against a neutral combatant — the raider sub-faction's whole point", () => {
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 0, row: 1 } });
  state.combatants.get("me").side = "opposition";
  state.combatants.get("enemy").side = "neutral";
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "strike"), "opposition must be able to threaten a neutral asset");
});
