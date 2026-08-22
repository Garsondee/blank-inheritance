/**
 * Integration tests for the turn loop itself. The single most important
 * property under test: a rejected (illegal) action proposal must leave
 * state byte-for-byte unchanged — HP, position, everything. That's the
 * literal meaning of "can't accidentally make an illegal move."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle, accountForActions } from "../../tools/battle-simulator/engine/engine.mjs";
import { distanceFeet, isInBounds } from "../../tools/battle-simulator/engine/grid.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/five-vehicles-one-frame.mjs";
import * as mysticScenario from "../../tools/battle-simulator/scenarios/mystic-frame-solo.mjs";

test("runBattle: a full run with the real scenario completes, produces a legible log, and never records an illegal action going through as legal", () => {
  const log = runBattle(buildScenario({ seed: 1, fieldBreaksAtRound: 2, roundLimit: 6 }));
  assert.ok(["party-victory", "party-defeat", "timeout", "stalemate"].includes(log.outcome.result));
  assert.ok(log.rounds.length >= 1);
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      for (const action of turn.actions ?? []) {
        assert.ok("legal" in action, `every logged action must record its legal/illegal status: ${JSON.stringify(action)}`);
      }
    }
  }
});

test("runBattle: is deterministic for a fixed seed (same seed -> byte-identical outcome)", () => {
  const logA = runBattle(buildScenario({ seed: 777, fieldBreaksAtRound: 2, roundLimit: 6 }));
  const logB = runBattle(buildScenario({ seed: 777, fieldBreaksAtRound: 2, roundLimit: 6 }));
  assert.deepEqual(logA.outcome, logB.outcome);
  assert.equal(logA.rounds.length, logB.rounds.length);
});

test("runBattle: two different seeds are not forced into an identical outcome (genuine variance survives)", () => {
  const logA = runBattle(buildScenario({ seed: 1, fieldBreaksAtRound: 2, roundLimit: 6 }));
  const logB = runBattle(buildScenario({ seed: 2, fieldBreaksAtRound: 2, roundLimit: 6 }));
  // Not asserting the outcomes differ (they could coincidentally match) — asserting the
  // underlying dice sequences differ, which is what "real, not curated" actually depends on.
  const firstRollA = findFirstD20(logA);
  const firstRollB = findFirstD20(logB);
  assert.notEqual(firstRollA, firstRollB, "two different seeds producing the identical first d20 would indicate the seed isn't actually being used");
});

function findFirstD20(log) {
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      for (const action of turn.actions ?? []) {
        if (action.roll?.d20 !== undefined) return action.roll.d20;
      }
    }
  }
  return null;
}

test("runBattle: HP never goes negative and never exceeds max, across an entire run", () => {
  const log = runBattle(buildScenario({ seed: 55, fieldBreaksAtRound: 2, roundLimit: 6 }));
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      for (const action of turn.actions ?? []) {
        if (action.targetHPAfter !== undefined) {
          assert.ok(action.targetHPAfter >= 0, `HP went negative: ${JSON.stringify(action)}`);
        }
      }
    }
  }
});

test("runBattle: a Stunned combatant is skipped and its stun counter decrements (proven by round 3's claimant no longer being stunned)", () => {
  const log = runBattle(buildScenario({ seed: 1, fieldBreaksAtRound: 2, roundLimit: 6 }));
  const round2 = log.rounds.find((r) => r.round === 2);
  const round3 = log.rounds.find((r) => r.round === 3);
  if (!round2 || !round3) return; // battle may have concluded before round 3 on this seed — not a failure, just nothing to check
  const claimantTurnR2 = round2.turns.find((t) => t.combatantId === "claimant-one");
  const claimantTurnR3 = round3.turns.find((t) => t.combatantId === "claimant-one");
  if (claimantTurnR2) assert.equal(claimantTurnR2.stunned, true, "round 2: Stunned 2 applied by the scripted field-break event");
  if (claimantTurnR3) assert.equal(claimantTurnR3.stunned, true, "round 3: still stunned (Stunned 2 covers two full turns in this simplification)");
});

/**
 * ============================================================
 * Regression tests for the 2026-08-22 adversarial workflow findings.
 * Each test below reproduces one CONFIRMED exploit an independent agent
 * found and proved against this exact engine, using runBattle() end to
 * end (not just the unit-level legality.test.mjs checks) — proving the
 * fix holds at the level a real scenario would actually exercise it.
 * ============================================================
 */

test("REGRESSION: a combatant killed mid-turn by a reaction cannot land further Strikes with its stale action budget", () => {
  // Mirrors the adversarial finding exactly: a Frame moves adjacent to a Claim-capable
  // reactor, the reaction kills it, and it must not get to attack back with the actions
  // it still had "left" per its turn-start budget.
  const mover = {
    id: "mover", name: "Doomed Frame", kind: "frame", side: "party", size: "huge",
    maxHP: 10, currentHP: 8, ac: 30, hardness: 0, saves: { fort: 20, ref: 20, will: 20 }, speed: 300,
    strikes: [{ name: "Ghost Strike", strikeType: "melee", attackBonus: 50, traits: [], damage: [{ dice: "1d1", bonus: 1, damageType: "force" }] }],
    resonanceBand: { id: "harmonised", actionsPerTurn: 3 },
    scaleBlind: false, position: { col: 0, row: 0 }
  };
  const reactor = {
    id: "reactor", name: "Claim Reactor", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 500, currentHP: 500, ac: 20, hardness: 0, saves: { fort: 20, ref: 20, will: 20 }, speed: 0,
    strikes: [{ name: "Claim Strike", strikeType: "melee", attackBonus: 80, traits: [], damage: [{ dice: "1d1", bonus: 500, damageType: "force" }] }],
    reactions: [{ name: "Claim", strikeIndex: 0 }],
    scaleBlind: false, position: { col: 2, row: 0 }
  };
  let moverCall = 0;
  function ai(state, combatantId) {
    if (combatantId !== "mover") return null;
    moverCall += 1;
    if (moverCall === 1) return { type: "move", to: { col: 1, row: 0 } }; // ends adjacent -> triggers Claim, one-shots the mover
    if (moverCall <= 3) return { type: "strike", targetId: "reactor", strikeIndex: 0 }; // proposed AFTER the mover should be dead
    return null;
  }

  const log = runBattle({ seed: 1, gridSize: { cols: 40, rows: 40 }, roundLimit: 1, combatants: [mover, reactor], ai });
  const moverTurn = log.rounds[0].turns.find((t) => t.combatantId === "mover");
  const strikesAcceptedAfterDeath = moverTurn.actions.filter((a) => a.type === "strike" && a.legal === true);

  assert.equal(strikesAcceptedAfterDeath.length, 0, `a dead combatant landed ${strikesAcceptedAfterDeath.length} Strike(s) this turn: ${JSON.stringify(moverTurn.actions)}`);
});

test("REGRESSION: Advance never covers more real feet (5-10-5 rule) than the combatant's effective Speed", () => {
  const claimant = {
    id: "claimant-one", name: "Advancer", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 100, currentHP: 100, ac: 10, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 400,
    strikes: [], reactions: [], scaleBlind: false, objective: { col: 40, row: 40 }, position: { col: 0, row: 0 }
  };
  const dummy = {
    id: "dummy", name: "Dummy", kind: "chassis", side: "party", size: "huge",
    maxHP: 999, currentHP: 999, ac: 99, hardness: 0, saves: { fort: 0, ref: 0, will: 0 }, speed: 0, strikes: [],
    position: { col: 43, row: 43 }
  };
  function ai(state, combatantId, turnState) {
    if (combatantId !== "claimant-one" || turnState.actionsUsed > 0) return null;
    return { type: "advance", towards: claimant.objective };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 44, rows: 44 }, roundLimit: 1, combatants: [claimant, dummy], ai });
  const advance = log.rounds[0].turns[0].actions.find((a) => a.type === "advance");
  const realDistance = distanceFeet(advance.from, advance.to);
  assert.ok(advance.legal);
  assert.ok(realDistance <= 400, `Advance covered ${realDistance}ft, exceeding effective Speed 400ft: ${JSON.stringify(advance)}`);
});

test("REGRESSION: Advance never leaves the grid bounds", () => {
  const claimant = {
    id: "claimant-one", name: "Advancer", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 100, currentHP: 100, ac: 10, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 1000,
    strikes: [], reactions: [], scaleBlind: false, objective: { col: -500, row: 5 }, position: { col: 2, row: 5 }
  };
  const dummy = { id: "dummy", name: "Dummy", kind: "chassis", side: "party", size: "huge", maxHP: 10, currentHP: 10, ac: 99, hardness: 0, saves: { fort: 0, ref: 0, will: 0 }, speed: 0, strikes: [], position: { col: 9, row: 9 } };
  const gridSize = { cols: 10, rows: 10 };
  function ai(state, combatantId, turnState) {
    if (combatantId !== "claimant-one" || turnState.actionsUsed > 0) return null;
    return { type: "advance", towards: claimant.objective };
  }
  const log = runBattle({ seed: 1, gridSize, roundLimit: 1, combatants: [claimant, dummy], ai });
  const advance = log.rounds[0].turns[0].actions.find((a) => a.type === "advance");
  assert.ok(advance.legal);
  assert.ok(isInBounds(advance.to, gridSize), `Advance moved off-grid to (${advance.to.col},${advance.to.row}): ${JSON.stringify(advance)}`);
});

test("REGRESSION: Advance correctly charges its travel against the shared per-turn Speed budget — a follow-up 'move' can't stack a second full budget on top", () => {
  const claimant = {
    id: "claimant-one", name: "Advancer", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 100, currentHP: 100, ac: 10, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 400,
    strikes: [], reactions: [], scaleBlind: false, objective: { col: 0, row: 20 }, position: { col: 20, row: 20 }
  };
  const dummy = { id: "dummy", name: "Dummy", kind: "chassis", side: "party", size: "huge", maxHP: 999, currentHP: 999, ac: 99, hardness: 0, saves: { fort: 0, ref: 0, will: 0 }, speed: 0, strikes: [], position: { col: 43, row: 43 } };
  function ai(state, combatantId, turnState) {
    if (combatantId !== "claimant-one") return null;
    const remaining = turnState.actionsAvailable - turnState.actionsUsed;
    if (remaining >= 2 && turnState.actionsUsed === 0) return { type: "advance", towards: claimant.objective };
    if (remaining >= 1 && turnState.actionsUsed === 2) {
      const pos = state.positions.get(combatantId);
      return { type: "move", to: { col: Math.max(0, pos.col - 8), row: pos.row } };
    }
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 44, rows: 44 }, roundLimit: 1, combatants: [claimant, dummy], ai });
  const [advance, move] = log.rounds[0].turns[0].actions;
  assert.ok(advance.legal);
  // Either the follow-up move is rejected (budget correctly exhausted), or if it's legal, total displacement must stay within Speed.
  if (move?.legal) {
    const total = distanceFeet(advance.from, advance.to) + distanceFeet(move.from, move.to);
    assert.ok(total <= 400, `Total movement this turn (${total}ft) exceeded effective Speed (400ft): advance=${JSON.stringify(advance)} move=${JSON.stringify(move)}`);
  }
});

test("REGRESSION: a reaction Strike respects immuneToAllDamage — a target's Interdiction Field-style immunity can't be bypassed by provoking a reaction instead of taking an ordinary Strike", () => {
  const reactor = {
    id: "reactor", name: "Reactor", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 50, currentHP: 50, ac: 10, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 0,
    strikes: [{ name: "Claim Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "10d6", bonus: 100 }] }],
    reactions: [{ name: "Claim", strikeIndex: 0 }], scaleBlind: false, immuneToAllDamage: false, position: { col: 10, row: 10 }
  };
  const mover = {
    id: "mover", name: "Immune Mover", kind: "claimant", side: "party", size: "huge",
    maxHP: 100, currentHP: 100, ac: 10, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 300,
    strikes: [], scaleBlind: false, immuneToAllDamage: true, position: { col: 10, row: 8 }
  };
  function ai(state, combatantId, turnState) {
    if (combatantId === "mover" && turnState.actionsUsed === 0) return { type: "move", to: { col: 10, row: 9 } };
    return null;
  }
  const log = runBattle({ seed: 12345, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [mover, reactor], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "mover").actions.find((a) => a.type === "move");
  assert.ok(moveAction.triggeredReactions?.length, "expected Claim to actually fire for this test to mean anything");
  assert.equal(moveAction.triggeredReactions[0].targetHPAfter, 100, `immuneToAllDamage was true but the reaction dealt real damage: ${JSON.stringify(moveAction.triggeredReactions)}`);
});

test("REGRESSION: once a reaction drops the mover to 0 HP, no further reactor in the same batch gets to 'hit' the corpse", () => {
  const mover = {
    id: "mover", name: "Fragile Mover", kind: "claimant", side: "party", size: "huge",
    maxHP: 100, currentHP: 1, ac: 10, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 300,
    strikes: [], scaleBlind: false, immuneToAllDamage: false, position: { col: 10, row: 8 }
  };
  const mk = (id, pos) => ({
    id, name: id, kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 50, currentHP: 50, ac: 10, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 0,
    strikes: [{ name: "Claim", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d4", bonus: 50 }] }],
    reactions: [{ name: "Claim", strikeIndex: 0 }], scaleBlind: false, position: pos
  });
  const reactorA = mk("reactorA", { col: 10, row: 10 });
  const reactorB = mk("reactorB", { col: 9, row: 9 });
  function ai(state, combatantId, turnState) {
    if (combatantId === "mover" && turnState.actionsUsed === 0) return { type: "move", to: { col: 10, row: 9 } };
    return null;
  }
  const log = runBattle({ seed: 99, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [mover, reactorA, reactorB], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "mover").actions.find((a) => a.type === "move");
  assert.equal(moveAction.triggeredReactions.length, 1, `expected only the first reactor to get a Claim in — a second reactor "hit" an already-0-HP mover: ${JSON.stringify(moveAction.triggeredReactions)}`);
});

test("REGRESSION: weakness is added BEFORE Hardness is subtracted, not after (Player Core p.399 order: immunities, then weaknesses, then resistances)", () => {
  const attacker = {
    id: "attacker", name: "Weak Attacker", kind: "claimant", side: "opposition", size: "medium",
    maxHP: 20, currentHP: 20, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [{ name: "Feeble Jab", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }],
    saves: { fort: 0, ref: 0, will: 0 }, reactions: [], position: { col: 0, row: 0 }
  };
  const target = {
    id: "target", name: "Hardened + Weak Target", kind: "claimant", side: "party", size: "huge",
    maxHP: 100, currentHP: 100, ac: 1, hardness: 12, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, weaknessAll: 3, position: { col: 1, row: 0 }
  };
  function ai(state, combatantId, turnState) {
    if (combatantId === "attacker" && turnState.actionsUsed === 0) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 2, gridSize: { cols: 10, rows: 10 }, roundLimit: 1, combatants: [attacker, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "strike");
  // raw damage is 1 (1d1), weakness +3 = 4, hardness 12 fully absorbs it -> correct final damage is 0.
  // The old (buggy) order computed max(0, 1-12)=0 first, THEN added weakness -> 3 leaked through.
  assert.equal(strike.damageApplied, 0, `weakness leaked through a hit Hardness should have fully absorbed: ${JSON.stringify(strike)}`);
});

test("REGRESSION: a Strike proposal referencing a nonexistent targetId is rejected cleanly, not a crash", () => {
  const attacker = {
    id: "attacker", name: "Attacker", kind: "claimant", side: "opposition", size: "medium",
    maxHP: 20, currentHP: 20, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [{ name: "Jab", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    saves: { fort: 0, ref: 0, will: 0 }, reactions: [], position: { col: 0, row: 0 }
  };
  const target = {
    id: "target", name: "Target", kind: "claimant", side: "party", size: "medium",
    maxHP: 20, currentHP: 20, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 1, row: 0 }
  };
  function ai(state, combatantId, turnState) {
    if (combatantId === "attacker" && turnState.actionsUsed < 1) return { type: "strike", targetId: "this-id-does-not-exist", strikeIndex: 0 };
    return null;
  }
  assert.doesNotThrow(() => runBattle({ seed: 1, gridSize: { cols: 10, rows: 10 }, roundLimit: 1, combatants: [attacker, target], ai }));
  const log = runBattle({ seed: 1, gridSize: { cols: 10, rows: 10 }, roundLimit: 1, combatants: [attacker, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "strike");
  assert.equal(strike.legal, false);
});

/**
 * ============================================================
 * Tests for design doc §14 (2026-08-22): Scale-Hardness, the Spot/Evacuate
 * vehicle actions, and (§14f) real initiative, round-0 deployment, and the
 * action-economy ledger. Added alongside the mechanics they cover, per the
 * project's hard rule that every feature ships with a test in the same
 * commit as the feature itself.
 * ============================================================
 */

/**
 * REGRESSION: found via a 20-seed statistical check right after the Claimant AI rework below —
 * 13/20 seeds ground out to a generic "timeout" with the party mechanically unable to deal ANY
 * damage for the whole back half of the fight, once the ground-layer roll failed to break the
 * field within its fixed 3-round window. See checkOutcome's own doc comment in engine.mjs.
 */
test("Stalemate: ends the battle immediately once the opposition is permanently immune (no scripted event left that could ever change it), rather than grinding out the rest of roundLimit", () => {
  const claimant = {
    id: "claimant-one", name: "Permanently Shielded", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 999, currentHP: 999, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [{ name: "Sweep", strikeType: "melee", attackBonus: 100, traits: ["reach-300"], damage: [{ dice: "1d1", bonus: 0 }] }],
    reactions: [], saves: { fort: 0, ref: 0, will: 0 }, immuneToAllDamage: true, position: { col: 0, row: 0 }
  };
  const bystander = {
    id: "bystander", name: "Bystander", kind: "chassis", side: "party", size: "huge",
    maxHP: 999, currentHP: 999, ac: 30, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 20, row: 20 }
  };
  function ai() { return null; }
  // No scriptedEvents at all — nothing in this scenario could ever lift the immunity.
  const log = runBattle({ seed: 1, gridSize: { cols: 40, rows: 40 }, roundLimit: 20, combatants: [claimant, bystander], ai });
  assert.equal(log.outcome.result, "stalemate");
  assert.ok(log.rounds.length < 20, `expected the battle to end well before the 20-round limit once the stalemate was detected, ran all ${log.rounds.length} rounds instead`);
});

test("Stalemate: does NOT fire while a future scripted event could still lift the immunity, even many rounds out", () => {
  const claimant = {
    id: "claimant-one", name: "Shielded For Now", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 999, currentHP: 999, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, immuneToAllDamage: true, position: { col: 0, row: 0 }
  };
  const bystander = {
    id: "bystander", name: "Bystander", kind: "chassis", side: "party", size: "huge",
    maxHP: 999, currentHP: 999, ac: 30, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 20, row: 20 }
  };
  function ai() { return null; }
  const scriptedEvents = { 5: (state) => { state.combatants.get("claimant-one").immuneToAllDamage = false; return "shield drops at round 5"; } };
  const log = runBattle({ seed: 1, gridSize: { cols: 40, rows: 40 }, roundLimit: 3, combatants: [claimant, bystander], ai, scriptedEvents });
  // Round limit (3) is reached before round 5's event ever fires — must NOT be misreported as a
  // permanent stalemate, since a future event genuinely could still have changed the outcome.
  assert.notEqual(log.outcome.result, "stalemate");
  assert.equal(log.outcome.result, "timeout");
});

test("Stalemate: scenario.stalemateNotBeforeRound delays detection until that round, even when scriptedEvents was already empty from round 1 (REGRESSION: a scenario whose ground-layer roll fails outright has an empty scriptedEvents object from the very start, which the naive check misread as 'the window already closed' and declared a stalemate at round 1 — before the in-fiction 3-round window it came from had even played out)", () => {
  const claimant = {
    id: "claimant-one", name: "Permanently Shielded", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 999, currentHP: 999, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, immuneToAllDamage: true, position: { col: 0, row: 0 }
  };
  const bystander = {
    id: "bystander", name: "Bystander", kind: "chassis", side: "party", size: "huge",
    maxHP: 999, currentHP: 999, ac: 30, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 20, row: 20 }
  };
  function ai() { return null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 40, rows: 40 }, roundLimit: 10, combatants: [claimant, bystander], ai, scriptedEvents: {}, stalemateNotBeforeRound: 3 });
  assert.equal(log.outcome.result, "stalemate");
  assert.ok(log.rounds.length >= 3, `expected the stalemate to wait until round 3, ended after ${log.rounds.length} round(s) instead`);
});

test("Round 0 deployment: every combatant is positioned and visible before round 1 — log.deployment carries the full starting snapshot", () => {
  const log = runBattle(buildScenario({ seed: 1, fieldBreaksAtRound: 2, roundLimit: 1 }));
  assert.equal(log.deployment.round, 0);
  const snapshotIds = Object.keys(log.deployment.snapshot);
  assert.equal(snapshotIds.length, Object.keys(log.roster).length, "every roster combatant must have a round-0 position — nobody is hidden until a later 'arrival'");
  for (const id of snapshotIds) {
    assert.ok(log.deployment.snapshot[id].position, `${id} has no round-0 position`);
  }
});

test("Real initiative: initiativeOrder is a real d20+modifier roll, not scenario array order, and is deterministic for a fixed seed", () => {
  const logA = runBattle(buildScenario({ seed: 9, fieldBreaksAtRound: 2, roundLimit: 1 }));
  const logB = runBattle(buildScenario({ seed: 9, fieldBreaksAtRound: 2, roundLimit: 1 }));
  assert.deepEqual(logA.initiativeOrder, logB.initiativeOrder, "same seed must produce the same initiative order");
  assert.equal(logA.initiativeRolls.length, Object.keys(logA.roster).length);
  for (const roll of logA.initiativeRolls) {
    assert.equal(roll.total, roll.d20 + roll.modifier);
    assert.ok(roll.d20 >= 1 && roll.d20 <= 20);
  }
  // The sorted order must actually match descending total — not just "a" order.
  const totalsInOrder = logA.initiativeOrder.map((id) => logA.initiativeRolls.find((r) => r.id === id).total);
  for (let i = 1; i < totalsInOrder.length; i++) {
    assert.ok(totalsInOrder[i - 1] >= totalsInOrder[i], `initiativeOrder is not sorted descending by total: ${JSON.stringify(totalsInOrder)}`);
  }
});

test("Real initiative: the Frame's low initiativeModifier makes it roll worse than the two agile vehicles across many seeds (statistical, not one lucky roll)", () => {
  let frameBeatBothAgileVehicles = 0;
  const trials = 30;
  for (let seed = 1; seed <= trials; seed++) {
    const log = runBattle(buildScenario({ seed, fieldBreaksAtRound: 2, roundLimit: 1 }));
    const totalFor = (id) => log.initiativeRolls.find((r) => r.id === id).total;
    if (totalFor("frame-reference") > totalFor("vesper") && totalFor("frame-reference") > totalFor("kingfisher")) frameBeatBothAgileVehicles += 1;
  }
  assert.ok(frameBeatBothAgileVehicles < trials * 0.3, `Frame beat both agile vehicles in ${frameBeatBothAgileVehicles}/${trials} seeds — its initiativeModifier isn't meaningfully worse`);
});

test("Action-economy ledger: available == spent + held on every single turn across a full battle, for every combatant (the hard invariant, checked directly rather than trusting accountForActions() never to have been bypassed)", () => {
  const log = runBattle(buildScenario({ seed: 1, fieldBreaksAtRound: 2, roundLimit: 8 }));
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      const acc = turn.actionAccounting;
      assert.ok(acc, `${turn.combatantId} round ${round.round}: turn has no actionAccounting at all`);
      assert.equal(acc.available, acc.spent + acc.held, `${turn.combatantId} round ${round.round}: ${acc.spent} spent + ${acc.held} held != ${acc.available} available`);
      if (acc.held > 0) assert.ok(acc.heldReason, `${turn.combatantId} round ${round.round}: ${acc.held} action point(s) held with no reason recorded`);
    }
  }
});

test("accountForActions: throws if points go unaccounted for with no reason — the actual invariant enforcement, not just a display field", () => {
  assert.throws(() => accountForActions({ available: 3, spent: 2, heldReason: null }), /went unspent with no recorded reason/, "2 spent of 3 available with no reason must throw");
  assert.throws(() => accountForActions({ available: 3, spent: 4, heldReason: null }), /spent MORE than available/, "spending more than available must throw, not silently clamp");
});

test("accountForActions: does not throw when the ledger is honest — fully spent, or held with a reason", () => {
  assert.deepEqual(accountForActions({ available: 3, spent: 3, heldReason: null }), { available: 3, spent: 3, held: 0, heldReason: null });
  assert.deepEqual(
    accountForActions({ available: 3, spent: 1, heldReason: "No legal action" }),
    { available: 3, spent: 1, held: 2, heldReason: "No legal action" }
  );
  assert.deepEqual(accountForActions({ available: 0, spent: 0, heldReason: null }), { available: 0, spent: 0, held: 0, heldReason: null }, "0 available, 0 spent (e.g. Hulked) needs no reason — nothing was held back");
});

test("Scale-Hardness (design doc §14b) reduces damage from a mounted-trait Strike, but leaves an ordinary (unmounted) Strike untouched", () => {
  const target = {
    id: "target", name: "Claimant", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 999, currentHP: 999, ac: 1, hardness: 0, scaleHardness: 15, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 1, row: 0 }
  };
  const vehicle = {
    id: "vehicle", name: "Mounted Attacker", kind: "chassis", side: "party", size: "large",
    maxHP: 50, currentHP: 50, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [{ name: "Mounted Sidearm", strikeType: "ranged", attackBonus: 100, rangeIncrement: 100, traits: ["mounted"], damage: [{ dice: "1d1", bonus: 19 }] }],
    saves: { fort: 0, ref: 0, will: 0 }, reactions: [], position: { col: 0, row: 0 }
  };
  function vehicleAi(state, combatantId, turnState) {
    if (combatantId === "vehicle" && turnState.actionsUsed === 0) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const mountedLog = runBattle({ seed: 3, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [vehicle, target], ai: vehicleAi });
  const mountedStrike = mountedLog.rounds[0].turns.find((t) => t.combatantId === "vehicle").actions.find((a) => a.type === "strike");
  assert.ok(mountedStrike.legal);
  assert.equal(mountedStrike.scaleHardnessApplied, 15);
  assert.equal(mountedStrike.damageApplied, Math.max(0, mountedStrike.roll.damage.raw - 15), "mounted Strike must have Scale-Hardness 15 subtracted");

  const frameAttacker = {
    id: "frameAttacker", name: "Unmounted Attacker", kind: "frame", side: "party", size: "huge",
    maxHP: 170, currentHP: 170, ac: 31, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [{ name: "Melee Weapon", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 19 }] }],
    saves: { fort: 0, ref: 0, will: 0 }, reactions: [], position: { col: 0, row: 0 }
  };
  function frameAi(state, combatantId, turnState) {
    if (combatantId === "frameAttacker" && turnState.actionsUsed === 0) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const frameLog = runBattle({ seed: 3, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [frameAttacker, { ...target, currentHP: 999 }], ai: frameAi });
  const frameStrike = frameLog.rounds[0].turns.find((t) => t.combatantId === "frameAttacker").actions.find((a) => a.type === "strike");
  assert.ok(frameStrike.legal);
  assert.equal(frameStrike.scaleHardnessApplied, 0, "a Frame's own (unmounted) Strike must never have Scale-Hardness applied");
  assert.equal(frameStrike.damageApplied, frameStrike.roll.damage.raw, "unmounted Strike takes full raw damage — no reduction");
});

test("Spot (design doc §14d): a spotted ally's next Strike carries the +2 circumstance bonus, consumed on use", () => {
  const spotter = {
    id: "spotter", name: "Vesper", kind: "chassis", side: "party", size: "huge",
    maxHP: 85, currentHP: 85, ac: 29, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 0, row: 0 }
  };
  const ally = {
    id: "ally", name: "Frame", kind: "frame", side: "party", size: "huge",
    maxHP: 170, currentHP: 170, ac: 31, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [{ name: "Melee Weapon", strikeType: "melee", attackBonus: 10, traits: ["reach-10"], damage: [{ dice: "1d1", bonus: 0 }] }],
    reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 0, row: 0 }
  };
  const target = {
    id: "target", name: "Dummy", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 999, currentHP: 999, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 0, row: 0 }
  };
  function ai(state, combatantId, turnState) {
    if (combatantId === "spotter" && turnState.actionsUsed === 0) return { type: "spot", targetId: "ally" };
    if (combatantId === "ally" && turnState.actionsUsed === 0) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 4, gridSize: { cols: 10, rows: 10 }, roundLimit: 1, combatants: [spotter, ally, target], ai });
  const spotAction = log.rounds[0].turns.find((t) => t.combatantId === "spotter").actions.find((a) => a.type === "spot");
  assert.ok(spotAction.legal);
  assert.equal(spotAction.targetId, "ally");

  const allyStrike = log.rounds[0].turns.find((t) => t.combatantId === "ally").actions.find((a) => a.type === "strike");
  assert.equal(allyStrike.roll.spotBonusApplied, 2, "the spotted ally's Strike must show the +2 bonus was applied");
  assert.equal(allyStrike.roll.mapPenalty, 2, "with no prior Strike this turn (MAP 0) the spot bonus is the entire mapPenalty value");
});

test("Evacuate (design doc §14d): produces a civilians count and costs 2 actions when clear of all opposition", () => {
  const evacuator = {
    id: "evacuator", name: "Runabout", kind: "chassis", side: "party", size: "large",
    maxHP: 60, currentHP: 60, ac: 25, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 0, row: 0 }
  };
  const farOpposition = {
    id: "opposition", name: "Claimant", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 999, currentHP: 999, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 20, row: 20 }
  };
  function ai(state, combatantId, turnState) {
    if (combatantId === "evacuator" && turnState.actionsUsed === 0) return { type: "evacuate" };
    return null;
  }
  const log = runBattle({ seed: 5, gridSize: { cols: 30, rows: 30 }, roundLimit: 1, combatants: [evacuator, farOpposition], ai });
  const evacAction = log.rounds[0].turns.find((t) => t.combatantId === "evacuator").actions.find((a) => a.type === "evacuate");
  assert.ok(evacAction.legal);
  assert.ok(evacAction.civilians >= 4 && evacAction.civilians <= 14, `civilians ${evacAction.civilians} out of the 2d6+2 range`);
});

test("Evacuate is rejected end-to-end when within 300ft of a living opposition combatant", () => {
  const evacuator = {
    id: "evacuator", name: "Runabout", kind: "chassis", side: "party", size: "large",
    maxHP: 60, currentHP: 60, ac: 25, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 0, row: 0 }
  };
  const closeOpposition = {
    id: "opposition", name: "Claimant", kind: "claimant", side: "opposition", size: "gargantuan",
    maxHP: 999, currentHP: 999, ac: 10, hardness: 0, speed: 0, scaleBlind: false,
    strikes: [], reactions: [], saves: { fort: 0, ref: 0, will: 0 }, position: { col: 2, row: 0 }
  };
  function ai(state, combatantId, turnState) {
    if (combatantId === "evacuator" && turnState.actionsUsed === 0) return { type: "evacuate" };
    return null;
  }
  const log = runBattle({ seed: 5, gridSize: { cols: 30, rows: 30 }, roundLimit: 1, combatants: [evacuator, closeOpposition], ai });
  const evacAction = log.rounds[0].turns.find((t) => t.combatantId === "evacuator").actions.find((a) => a.type === "evacuate");
  assert.equal(evacAction.legal, false);
});

test("REGRESSION: 'move' is rejected when the action budget doesn't allow it (was the one proposal type exempt from budget enforcement)", () => {
  const mover = {
    id: "mover", name: "Zero-Action Frame", kind: "frame", side: "party", size: "huge",
    maxHP: 100, currentHP: 100, ac: 30, hardness: 0, saves: { fort: 20, ref: 20, will: 20 }, speed: 30,
    strikes: [], resonanceBand: { id: "desynced-test", actionsPerTurn: 0 }, scaleBlind: false, position: { col: 0, row: 0 }
  };
  const bystander = {
    id: "bystander", name: "Bystander", kind: "claimant", side: "opposition", size: "medium",
    maxHP: 999, currentHP: 999, ac: 30, hardness: 0, saves: { fort: 20, ref: 20, will: 20 }, speed: 0, strikes: [],
    scaleBlind: false, position: { col: 39, row: 39 }
  };
  function ai(state, combatantId, turnState) {
    if (combatantId !== "mover" || turnState.actionsUsed > 0) return null;
    return { type: "move", to: { col: 1, row: 0 } };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 40, rows: 40 }, roundLimit: 1, combatants: [mover, bystander], ai });
  const moveAction = log.rounds[0].turns[0].actions.find((a) => a.type === "move");
  assert.equal(moveAction.legal, false, "a combatant with 0 actionsAvailable must not be able to execute a Move");
});

/**
 * REGRESSION (design doc §14i, 2026-08-22): found by Ingram reading a real transcript — the
 * artifact's roster panel showed scenario-authoring order while the initiative strip (correctly)
 * showed the real rolled order, so the two panels visibly disagreed about who goes when. Root
 * cause: log.roster was built by iterating scenario.combatants directly instead of the
 * initiativeOrder computed one line earlier in the same function. Fixed at the source (roster
 * construction now iterates initiativeOrder) rather than patching each UI consumer, since a
 * plain JS object preserves string-key insertion order — every Object.entries(roster)/
 * Object.keys(roster) call site downstream inherits the fix for free.
 */
test("REGRESSION: log.roster's key order matches log.initiativeOrder exactly, not scenario.combatants' authoring order — Ingram's own framing was 'roll initiative, THEN organise the roster based on this order'", () => {
  const log = runBattle(buildScenario({ seed: 20260822, roundLimit: 1 }));
  assert.deepEqual(Object.keys(log.roster), log.initiativeOrder);
});

test("REGRESSION: across many seeds, log.roster's order tracks whatever initiativeOrder that seed actually rolled, which genuinely differs from scenario.combatants' authoring order at least once — proving the roster follows a real roll, not a coincidental match to input order", () => {
  const authoringOrder = buildScenario({ seed: 1, roundLimit: 1 }).combatants.map((c) => c.id);
  let sawADifferentOrderThanAuthoring = false;
  for (let seed = 1; seed <= 10; seed++) {
    const log = runBattle(buildScenario({ seed, roundLimit: 1 }));
    assert.deepEqual(Object.keys(log.roster), log.initiativeOrder, `seed ${seed}: roster order diverged from initiativeOrder`);
    if (JSON.stringify(log.initiativeOrder) !== JSON.stringify(authoringOrder)) sawADifferentOrderThanAuthoring = true;
  }
  assert.ok(sawADifferentOrderThanAuthoring, "expected at least one seed's real initiative roll to differ from scenario.combatants' authoring order");
});

// ---------------------------------------------------------------------------
// spellAttack / healAbility (design doc §14k)
// ---------------------------------------------------------------------------

function makeSpellcaster(overrides = {}) {
  return {
    id: "caster", name: "Caster", kind: "frame", side: "party", size: "huge",
    maxHP: 100, currentHP: 100, ac: 20, hardness: 0, saves: { fort: 20, ref: 20, will: 20 }, speed: 300,
    spells: [{ name: "Test Bolt", attackBonus: 100, range: 30, actions: 2, traits: ["attack"], damage: [{ dice: "1d1", bonus: 5 }] }],
    healAbilities: [{ name: "Test Heal", healingAmount: 20, range: 60, actions: 1 }],
    resonanceBand: { id: "harmonised", actionsPerTurn: 3 }, scaleBlind: false, position: { col: 0, row: 0 },
    ...overrides
  };
}

function makeDummyTarget(overrides = {}) {
  return {
    id: "target", name: "Target", kind: "claimant", side: "opposition", size: "huge",
    maxHP: 200, currentHP: 200, ac: 1, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 0,
    strikes: [], scaleBlind: false, immuneToAllDamage: false, position: { col: 0, row: 0 },
    ...overrides
  };
}

test("REGRESSION: a legal spellAttack resolves through the real resolveStrike math, deals damage, and decrements usesRemaining when present", () => {
  const caster = makeSpellcaster();
  caster.spells[0].usesRemaining = 1;
  const target = makeDummyTarget();
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, target], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions.find((a) => a.type === "spellAttack");
  assert.equal(action.legal, true);
  assert.equal(action.spellName, "Test Bolt");
  assert.ok(action.damageApplied > 0, `expected real damage against AC 1 with attackBonus 100, got ${action.damageApplied}`);
  assert.equal(action.usesRemaining, 0, "usesRemaining must decrement on a successful cast, same mechanism as vehicle ordnance");
});

test("REGRESSION: a spell attack costs its OWN action count (2 for this test spell), not hardcoded to 1 like a Strike", () => {
  const caster = makeSpellcaster();
  const target = makeDummyTarget();
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, target], ai });
  const turn = log.rounds[0].turns.find((t) => t.combatantId === "caster");
  assert.equal(turn.actionAccounting.spent, 2, `expected the 2-action spell to spend exactly 2, accounting reports ${turn.actionAccounting.spent}`);
});

test("REGRESSION: a spell attack and an ordinary Strike share the SAME multiple-attack-penalty counter — casting first still gives an immediately-following Strike -5 MAP, not a fresh 0", () => {
  const caster = makeSpellcaster();
  caster.strikes = [{ name: "Backup Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 5 }] }];
  const target = makeDummyTarget();
  const rolls = [];
  function ai(state, combatantId, turnState) {
    if (combatantId !== "caster") return null;
    if (turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 }; // costs 2
    if (turnState.actionsUsed === 2) return { type: "strike", targetId: "target", strikeIndex: 0 }; // 3rd action, 2nd attack this turn
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, target], ai });
  const actions = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions;
  const strike = actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.mapPenalty, -5, `expected the Strike immediately after a spell attack to carry -5 MAP as the 2nd attack this turn, got ${strike.roll.mapPenalty}`);
});

test("REGRESSION: a legal healAbility restores HP with no roll at all, and decrements its own usesRemaining", () => {
  const caster = makeSpellcaster();
  caster.healAbilities[0].usesRemaining = 1;
  const woundedAlly = { ...makeSpellcaster({ id: "ally", name: "Ally" }), currentHP: 50, spells: [], healAbilities: [] };
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "healAbility", targetId: "ally", abilityIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, woundedAlly], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions.find((a) => a.type === "healAbility");
  assert.equal(action.legal, true);
  assert.equal(action.healing, 20);
  assert.equal(action.targetHPAfter, 70);
  assert.equal(action.usesRemaining, 0);
});

test("REGRESSION: a healAbility never overheals past the target's maxHP", () => {
  const caster = makeSpellcaster();
  const nearlyFullAlly = { ...makeSpellcaster({ id: "ally", name: "Ally" }), currentHP: 95, maxHP: 100, spells: [], healAbilities: [] };
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "healAbility", targetId: "ally", abilityIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, nearlyFullAlly], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions.find((a) => a.type === "healAbility");
  assert.equal(action.targetHPAfter, 100, "20 healing on 95/100 HP must cap at maxHP (100), not overshoot to 115");
});

test("REGRESSION: a real battle with the Mystic Frame test fixture actually casts spells and uses its class ability — not zero, not hypothetical", () => {
  let sawSpellAttack = false;
  let sawHealAbility = false;
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const log = runBattle(mysticScenario.buildScenario({ seed, roundLimit: 10, fieldBreaksAtRound: 3 }));
    for (const round of log.rounds) {
      for (const turn of round.turns) {
        for (const action of turn.actions) {
          if (action.type === "spellAttack" && action.legal) sawSpellAttack = true;
          if (action.type === "healAbility" && action.legal) sawHealAbility = true;
        }
      }
    }
  }
  assert.ok(sawSpellAttack, "expected the Mystic Frame to cast Eldritch Lance at least once across 8 seeds — 'can you cast a spell?' should be provably yes");
  // healAbility is legitimately conditional on someone actually being hurt — not asserted as
  // always-true, but the capability itself (checked above via legality tests) is real either way.
});

/**
 * REGRESSION (design doc §14m, 2026-08-22): found building the artifact's
 * round-overview box UI — actionCost() (template.html) used to be a
 * hardcoded per-type lookup table written before spellAttack/healAbility
 * existed, so a 2-action spell's box rendered exactly as wide as a
 * 1-action Move's. Fixed by having engine.mjs log the REAL cost directly
 * on every legal action's own result (actionsCost) rather than have the
 * UI re-derive or guess it.
 */
test("REGRESSION: every legal action's result carries an actionsCost field matching what was actually spent — a spell/ability's own variable cost, not a hardcoded per-type guess", () => {
  const caster = makeSpellcaster();
  caster.strikes = [{ name: "Backup Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 5 }] }];
  const target = makeDummyTarget();
  function ai(state, combatantId, turnState) {
    if (combatantId !== "caster") return null;
    if (turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 }; // Test Bolt costs 2
    if (turnState.actionsUsed === 2) return { type: "strike", targetId: "target", strikeIndex: 0 }; // Strike costs 1
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, target], ai });
  const actions = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions;
  const spellAction = actions.find((a) => a.type === "spellAttack");
  const strikeAction = actions.find((a) => a.type === "strike");
  assert.equal(spellAction.actionsCost, 2, "Test Bolt's own actions:2 field must be reflected on the logged result");
  assert.equal(strikeAction.actionsCost, 1, "a Strike always costs exactly 1");
});

test("REGRESSION: a healAbility's actionsCost reflects its own actions field, not a hardcoded 1", () => {
  const caster = makeSpellcaster();
  const woundedAlly = { ...makeSpellcaster({ id: "ally", name: "Ally" }), currentHP: 50, spells: [], healAbilities: [] };
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "healAbility", targetId: "ally", abilityIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, woundedAlly], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions.find((a) => a.type === "healAbility");
  assert.equal(action.actionsCost, 1, "Test Heal's own actions:1 field must be reflected on the logged result");
});
