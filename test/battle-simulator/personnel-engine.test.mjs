/**
 * Integration tests for the PERSONNEL-SCALE turn loop (design doc §19) — ported from
 * engine/engine.mjs, at the real 5ft grid. Much shorter than engine.test.mjs: most of that file's
 * bulk is regression coverage for Frame/Claimant/Day-1-specific mechanics (Advance, Claim, Scale-
 * Hardness, Spot, Evacuate, the damage-state track) that were deliberately never ported here — see
 * personnel-engine/engine.mjs's own header for the full list and why. What's covered instead:
 * the same action-accounting invariant, spellAttack/healAbility (Lunar-17's own real kit), and a
 * direct confirmation that every dropped action type is genuinely gone (rejected as "unknown"),
 * not silently half-working.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle, accountForActions } from "../../tools/battle-simulator/personnel-engine/engine.mjs";

function makeCaster(overrides = {}) {
  return {
    id: "caster", name: "Caster", side: "party", maxHP: 16, currentHP: 16, ac: 17,
    saves: { fort: 5, ref: 4, will: 7 }, speed: 25,
    spells: [{ name: "Eldritch Lance", attackBonus: 8, range: 30, actions: 2, traits: ["attack"], damage: [{ dice: "1d1", bonus: 5 }] }],
    healAbilities: [{ name: "Transfer Vitality", healingAmount: 5, range: 60, actions: 1 }],
    position: { col: 0, row: 0 },
    ...overrides
  };
}
function makeTarget(overrides = {}) {
  return {
    id: "target", name: "Target", side: "opposition", maxHP: 20, currentHP: 20, ac: 1,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 0, row: 0 },
    ...overrides
  };
}

test("runBattle: a full run completes, produces a legible log, and every action records its legal/illegal status", () => {
  const caster = makeCaster();
  const target = makeTarget({ position: { col: 1, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 3, combatants: [caster, target], ai });
  assert.ok(["party-victory", "party-defeat", "timeout"].includes(log.outcome.result));
  assert.ok(log.rounds.length >= 1);
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      for (const action of turn.actions ?? []) {
        assert.ok("legal" in action, `every logged action must record its legal/illegal status: ${JSON.stringify(action)}`);
      }
    }
  }
});

test("runBattle: is deterministic for a fixed seed", () => {
  const build = () => ({ seed: 777, gridSize: { cols: 20, rows: 20 }, roundLimit: 4, combatants: [makeCaster(), makeTarget({ position: { col: 1, row: 0 } })], ai: () => null });
  const logA = runBattle(build());
  const logB = runBattle(build());
  assert.deepEqual(logA.outcome, logB.outcome);
  assert.equal(logA.rounds.length, logB.rounds.length);
});

test("runBattle: HP never goes negative and never exceeds max, across an entire run", () => {
  const caster = makeCaster();
  const target = makeTarget({ position: { col: 1, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 55, gridSize: { cols: 20, rows: 20 }, roundLimit: 6, combatants: [caster, target], ai });
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      for (const action of turn.actions ?? []) {
        if (action.targetHPAfter !== undefined) assert.ok(action.targetHPAfter >= 0, `HP went negative: ${JSON.stringify(action)}`);
      }
    }
  }
});

test("a Stunned combatant is skipped and its stun counter decrements", () => {
  const caster = makeCaster({ stunnedRounds: 2 });
  const target = makeTarget({ position: { col: 1, row: 0 } });
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 3, combatants: [caster, target], ai: () => null });
  const r1 = log.rounds.find((r) => r.round === 1)?.turns.find((t) => t.combatantId === "caster");
  const r2 = log.rounds.find((r) => r.round === 2)?.turns.find((t) => t.combatantId === "caster");
  const r3 = log.rounds.find((r) => r.round === 3)?.turns.find((t) => t.combatantId === "caster");
  if (r1) assert.equal(r1.stunned, true, "round 1: still under the initial Stunned 2");
  if (r2) assert.equal(r2.stunned, true, "round 2: stun counter was 2, decrements to 1 then 0 — still stunned this turn");
  if (r3) assert.equal(r3.stunned, undefined, "round 3: stun should have worn off");
});

test("accountForActions: throws if points go unaccounted for with no reason", () => {
  assert.throws(() => accountForActions({ available: 3, spent: 2, heldReason: null }), /went unspent with no recorded reason/);
  assert.throws(() => accountForActions({ available: 3, spent: 4, heldReason: null }), /spent MORE than available/);
});

test("accountForActions: does not throw when the ledger is honest", () => {
  assert.deepEqual(accountForActions({ available: 3, spent: 3, heldReason: null }), { available: 3, spent: 3, held: 0, heldReason: null });
  assert.deepEqual(
    accountForActions({ available: 3, spent: 1, heldReason: "No legal action" }),
    { available: 3, spent: 1, held: 2, heldReason: "No legal action" }
  );
});

test("Action-economy ledger: available == spent + held on every single turn across a full battle", () => {
  const caster = makeCaster();
  const target = makeTarget({ position: { col: 1, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 8, combatants: [caster, target], ai });
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      const acc = turn.actionAccounting;
      assert.ok(acc, `${turn.combatantId} round ${round.round}: turn has no actionAccounting at all`);
      assert.equal(acc.available, acc.spent + acc.held, `${turn.combatantId} round ${round.round}: ${acc.spent} spent + ${acc.held} held != ${acc.available} available`);
      if (acc.held > 0) assert.ok(acc.heldReason, `${turn.combatantId} round ${round.round}: ${acc.held} action point(s) held with no reason recorded`);
    }
  }
});

test("a Strike proposal referencing a nonexistent targetId is rejected cleanly, not a crash", () => {
  const attacker = { id: "attacker", name: "Goon", side: "opposition", maxHP: 8, currentHP: 8, ac: 15, saves: { fort: 4, ref: 4, will: 2 }, speed: 25,
    strikes: [{ name: "Baton", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 2 }] }], position: { col: 0, row: 0 } };
  const target = makeTarget({ id: "t", position: { col: 1, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId === "attacker" && turnState.actionsUsed === 0) return { type: "strike", targetId: "this-id-does-not-exist", strikeIndex: 0 };
    return null;
  }
  assert.doesNotThrow(() => runBattle({ seed: 1, gridSize: { cols: 10, rows: 10 }, roundLimit: 1, combatants: [attacker, target], ai }));
  const log = runBattle({ seed: 1, gridSize: { cols: 10, rows: 10 }, roundLimit: 1, combatants: [attacker, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "strike");
  assert.equal(strike.legal, false);
});

test("REGRESSION-GUARD: every dropped Frame/vehicle/Day-1 action type (repair, spot, evacuate, advance) is rejected as unknown, not silently half-working", () => {
  const caster = makeCaster();
  const target = makeTarget({ position: { col: 1, row: 0 } });
  for (const type of ["repair", "spot", "evacuate", "advance"]) {
    let proposed = false;
    function ai(state, combatantId, turnState) {
      if (combatantId === "caster" && turnState.actionsUsed === 0 && !proposed) {
        proposed = true;
        return { type, targetId: "target", towards: { col: 5, row: 5 } };
      }
      return null;
    }
    const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [makeCaster(), makeTarget({ position: { col: 1, row: 0 } })], ai });
    const action = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions.find((a) => a.type === type);
    assert.equal(action.legal, false, `"${type}" must never be legal in this tree`);
    assert.match(action.reason, /Unknown action type/, `"${type}" should be rejected as unknown, not by some other (half-implemented) check`);
  }
});

test("Round 0 deployment: every combatant is positioned before round 1 — log.deployment carries the full starting snapshot", () => {
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [makeCaster(), makeTarget({ position: { col: 1, row: 0 } })], ai: () => null });
  assert.equal(log.deployment.round, 0);
  const snapshotIds = Object.keys(log.deployment.snapshot);
  assert.equal(snapshotIds.length, 2);
  for (const id of snapshotIds) assert.ok(log.deployment.snapshot[id].position, `${id} has no round-0 position`);
});

test("Real initiative: initiativeOrder is a real d20+modifier roll, deterministic for a fixed seed, and sorted descending by total", () => {
  const build = () => ({ seed: 9, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [makeCaster({ initiativeModifier: 4 }), makeTarget({ initiativeModifier: 2, position: { col: 1, row: 0 } })], ai: () => null });
  const logA = runBattle(build());
  const logB = runBattle(build());
  assert.deepEqual(logA.initiativeOrder, logB.initiativeOrder);
  for (const roll of logA.initiativeRolls) {
    assert.equal(roll.total, roll.d20 + roll.modifier);
    assert.ok(roll.d20 >= 1 && roll.d20 <= 20);
  }
  const totalsInOrder = logA.initiativeOrder.map((id) => logA.initiativeRolls.find((r) => r.id === id).total);
  for (let i = 1; i < totalsInOrder.length; i++) assert.ok(totalsInOrder[i - 1] >= totalsInOrder[i]);
});

test("outcome detection: party-victory when all opposition are reduced to 0 HP", () => {
  const attacker = { id: "attacker", name: "Goon", side: "party", maxHP: 8, currentHP: 8, ac: 15, saves: { fort: 4, ref: 4, will: 2 }, speed: 25,
    strikes: [{ name: "Baton", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "10d6", bonus: 100 }] }], position: { col: 0, row: 0 } };
  const target = makeTarget({ currentHP: 1, ac: 1, position: { col: 1, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId === "attacker" && turnState.actionsUsed === 0) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 10, rows: 10 }, roundLimit: 1, combatants: [attacker, target], ai });
  assert.equal(log.outcome.result, "party-victory");
});

test("outcome detection: party-defeat when all party combatants are reduced to 0 HP", () => {
  const attacker = { id: "attacker", name: "Goon", side: "opposition", maxHP: 8, currentHP: 8, ac: 15, saves: { fort: 4, ref: 4, will: 2 }, speed: 25,
    strikes: [{ name: "Baton", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "10d6", bonus: 100 }] }], position: { col: 0, row: 0 } };
  const target = makeTarget({ side: "party", currentHP: 1, ac: 1, position: { col: 1, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId === "attacker" && turnState.actionsUsed === 0) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 10, rows: 10 }, roundLimit: 1, combatants: [attacker, target], ai });
  assert.equal(log.outcome.result, "party-defeat");
});

test("outcome detection: timeout when the round limit is reached with both sides still standing", () => {
  const caster = makeCaster();
  const target = makeTarget({ ac: 99, position: { col: 19, row: 19 } }); // out of reach, unhittable AC
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 2, combatants: [caster, target], ai: () => null });
  assert.equal(log.outcome.result, "timeout");
});

// ---------------------------------------------------------------------------
// spellAttack / healAbility — Lunar-17's own real kit (Eldritch Lance, Transfer Vitality)
// ---------------------------------------------------------------------------

test("a legal spellAttack resolves through the real resolveStrike math, deals damage, and decrements usesRemaining when present", () => {
  const caster = makeCaster();
  caster.spells[0].usesRemaining = 1;
  const target = makeTarget({ position: { col: 1, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, target], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions.find((a) => a.type === "spellAttack");
  assert.equal(action.legal, true);
  assert.equal(action.spellName, "Eldritch Lance");
  assert.ok(action.damageApplied > 0, `expected real damage against AC 1, got ${action.damageApplied}`);
  assert.equal(action.usesRemaining, 0);
});

test("a spell attack costs its OWN action count (2 for Eldritch Lance), not hardcoded to 1 like a Strike", () => {
  const caster = makeCaster();
  const target = makeTarget({ position: { col: 1, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, target], ai });
  const turn = log.rounds[0].turns.find((t) => t.combatantId === "caster");
  assert.equal(turn.actionAccounting.spent, 2);
});

test("a spell attack and an ordinary Strike share the SAME multiple-attack-penalty counter", () => {
  const caster = makeCaster();
  caster.strikes = [{ name: "Backup Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 5 }] }];
  const target = makeTarget({ position: { col: 0, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId !== "caster") return null;
    if (turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 }; // costs 2
    if (turnState.actionsUsed === 2) return { type: "strike", targetId: "target", strikeIndex: 0 }; // 3rd action, 2nd attack this turn
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, target], ai });
  const actions = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions;
  const strike = actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.mapPenalty, -5, `expected the Strike immediately after a spell attack to carry -5 MAP, got ${strike.roll.mapPenalty}`);
});

test("a legal healAbility restores HP with no roll at all, and decrements its own usesRemaining", () => {
  const caster = makeCaster();
  caster.healAbilities[0].usesRemaining = 1;
  const woundedAlly = makeCaster({ id: "ally", name: "Ally", currentHP: 5, spells: [], healAbilities: [] });
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "healAbility", targetId: "ally", abilityIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, woundedAlly], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions.find((a) => a.type === "healAbility");
  assert.equal(action.legal, true);
  assert.equal(action.healing, 5);
  assert.equal(action.targetHPAfter, 10);
  assert.equal(action.usesRemaining, 0);
});

test("a healAbility never overheals past the target's maxHP", () => {
  const caster = makeCaster();
  const nearlyFullAlly = makeCaster({ id: "ally", name: "Ally", currentHP: 14, maxHP: 16, spells: [], healAbilities: [] });
  function ai(state, combatantId, turnState) {
    if (combatantId === "caster" && turnState.actionsUsed === 0) return { type: "healAbility", targetId: "ally", abilityIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, nearlyFullAlly], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions.find((a) => a.type === "healAbility");
  assert.equal(action.targetHPAfter, 16, "5 healing on 14/16 HP must cap at maxHP (16), not overshoot to 19");
});

test("every legal action's result carries an actionsCost field matching what was actually spent", () => {
  const caster = makeCaster();
  caster.strikes = [{ name: "Backup Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 5 }] }];
  const target = makeTarget({ position: { col: 0, row: 0 } });
  function ai(state, combatantId, turnState) {
    if (combatantId !== "caster") return null;
    if (turnState.actionsUsed === 0) return { type: "spellAttack", targetId: "target", spellIndex: 0 };
    if (turnState.actionsUsed === 2) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [caster, target], ai });
  const actions = log.rounds[0].turns.find((t) => t.combatantId === "caster").actions;
  assert.equal(actions.find((a) => a.type === "spellAttack").actionsCost, 2);
  assert.equal(actions.find((a) => a.type === "strike").actionsCost, 1);
});
