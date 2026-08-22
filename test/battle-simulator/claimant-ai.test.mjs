/**
 * Tests for the Claimant's tactical policy — split out because this file
 * fixes a real, confirmed problem: before 2026-08-22, the Claimant's spare
 * 3rd action (after Advance's 2) was never spent on anything, so unless a
 * party combatant provoked Claim by ending a move exactly adjacent, it did
 * zero damage, every fight. See claimant-ai.mjs's own header comment.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { claimantAI } from "../../tools/battle-simulator/ai/claimant-ai.mjs";
import { runBattle } from "../../tools/battle-simulator/engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/five-vehicles-one-frame.mjs";

function makeState(combatants) {
  return {
    combatants: new Map(combatants.map((c) => [c.id, c])),
    positions: new Map(combatants.map((c) => [c.id, c.position]))
  };
}

const claimant = {
  id: "claimant-one", side: "opposition", objective: { col: 40, row: 40 }, scaleBlind: true,
  strikes: [{ name: "Sweep", strikeType: "melee", attackBonus: 24, traits: ["reach-300"], damage: [{ dice: "3d8", bonus: 12 }] }]
};

// AC/maxHP added 2026-08-22 (design doc §14h): the utility-AI framework scores a Strike
// candidate via real expected-damage math (considerations.mjs), which needs a genuine AC to
// resolve against — resolveEffectiveStats returns ac:undefined for a target with no `ac` field
// and no frame/chassis `kind`, which degreeProbabilities correctly reads as "always misses",
// scoring every Strike candidate 0 and making the AI (correctly, given the bad input) propose
// nothing. 31 matches the real Reference Frame's AC (data/combatants.mjs).
const frameStats = { maxHP: 170, ac: 31 };

test("claimantAI: proposes Advance first when it can afford the 2 actions", () => {
  const state = makeState([{ ...claimant, position: { col: 0, row: 0 } }]);
  const proposal = claimantAI(state, "claimant-one", { actionsAvailable: 3, actionsUsed: 0 });
  assert.equal(proposal.type, "advance");
  assert.deepEqual(proposal.towards, claimant.objective);
  assert.ok(proposal.reason.length > 0, "expected a human-readable reason explaining the Advance");
});

test("claimantAI: REGRESSION — with its spare 3rd action and a Large+ target already within Sweep's reach, it Strikes instead of wasting the action (previously: always returned null after Advance)", () => {
  const target = { id: "frame", side: "party", currentHP: 100, ...frameStats, size: "huge", position: { col: 1, row: 0 } };
  const state = makeState([{ ...claimant, position: { col: 0, row: 0 } }, target]);
  const proposal = claimantAI(state, "claimant-one", { actionsAvailable: 3, actionsUsed: 2 });
  assert.equal(proposal.type, "strike");
  assert.equal(proposal.targetId, "frame");
  assert.equal(proposal.strikeIndex, 0);
  assert.ok(proposal.reason.includes("Sweep"), `expected the reason to name the strike used: ${proposal.reason}`);
});

test("claimantAI: does not propose a Strike when nothing Large+ is within reach", () => {
  const farTarget = { id: "frame", side: "party", currentHP: 100, ...frameStats, size: "huge", position: { col: 20, row: 20 } };
  const state = makeState([{ ...claimant, position: { col: 0, row: 0 } }, farTarget]);
  const proposal = claimantAI(state, "claimant-one", { actionsAvailable: 3, actionsUsed: 2 });
  assert.equal(proposal, null);
});

test("claimantAI: Scale-Blind holds even here — never proposes a Strike against a Medium-or-smaller target, no matter how close", () => {
  const kid = { id: "kid", side: "party", currentHP: 20, ac: 20, maxHP: 20, size: "medium", position: { col: 1, row: 0 } };
  const state = makeState([{ ...claimant, position: { col: 0, row: 0 } }, kid]);
  const proposal = claimantAI(state, "claimant-one", { actionsAvailable: 3, actionsUsed: 2 });
  assert.equal(proposal, null, "a Medium target adjacent must not tempt a Strike proposal — checkScaleTargeting would reject it anyway, but the AI shouldn't even try");
});

test("claimantAI: never proposes anything once its action budget for the turn is exhausted", () => {
  const target = { id: "frame", side: "party", currentHP: 100, ...frameStats, size: "huge", position: { col: 1, row: 0 } };
  const state = makeState([{ ...claimant, position: { col: 0, row: 0 } }, target]);
  assert.equal(claimantAI(state, "claimant-one", { actionsAvailable: 3, actionsUsed: 3 }), null);
});

test("REGRESSION: across a real end-to-end escort battle, the Claimant deals real, non-zero damage (it used to deal exactly 0 unless Claim happened to fire)", () => {
  let sawRealDamage = false;
  let sawClaimantStrike = false;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const log = runBattle(buildScenario({ seed, roundLimit: 8 }));
    for (const round of log.rounds) {
      const claimantTurn = round.turns.find((t) => t.combatantId === "claimant-one");
      for (const action of claimantTurn?.actions ?? []) {
        if (action.type === "strike" && action.legal) {
          sawClaimantStrike = true;
          if (action.damageApplied > 0) sawRealDamage = true;
        }
      }
    }
  }
  assert.ok(sawClaimantStrike, "the Claimant never even attempted a Strike across 8 seeds — its 3rd action is going unused again");
  assert.ok(sawRealDamage, "the Claimant attempted Strikes but never actually landed damage across 8 seeds — that's still functionally a non-threat");
});
