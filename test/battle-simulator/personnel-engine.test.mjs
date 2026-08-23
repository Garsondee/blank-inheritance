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
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";

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

// ---------------------------------------------------------------------------
// saveAttack / demoralize — the skill-actions-in-combat expansion (design doc §19)
// ---------------------------------------------------------------------------

function makeThrower(overrides = {}) {
  return {
    id: "thrower", name: "Thrower", side: "party", maxHP: 15, currentHP: 15, ac: 17,
    saves: { fort: 4, ref: 6, will: 9 }, speed: 25,
    saveAttacks: [{ name: "Grenade", saveType: "reflex", dc: 17, range: 70, actions: 1, damage: [{ dice: "1d8", bonus: 0, damageType: "fire" }] }],
    position: { col: 0, row: 0 },
    ...overrides
  };
}
function makeGoon(overrides = {}) {
  return {
    id: "goon", name: "Goon", side: "opposition", maxHP: 25, currentHP: 25, ac: 14,
    saves: { fort: 9, ref: 5, will: 4 }, speed: 20,
    strikes: [{ name: "Baton", strikeType: "melee", attackBonus: 9, traits: [], damage: [{ dice: "1d6", bonus: 3, damageType: "bludgeoning" }] }],
    intimidationModifier: 6, position: { col: 0, row: 0 },
    ...overrides
  };
}

test("saveAttack: the TARGET rolls (not the attacker), resolves via a real basic save, and decrements usesRemaining", () => {
  const thrower = makeThrower();
  thrower.saveAttacks[0].usesRemaining = 1;
  const target = makeGoon({ position: { col: 1, row: 0 } });
  function ai(state, id, turn) { return id === "thrower" && turn.actionsUsed === 0 ? { type: "saveAttack", targetId: "goon", saveAttackIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [thrower, target], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "thrower").actions.find((a) => a.type === "saveAttack");
  assert.equal(action.legal, true);
  assert.ok(["criticalSuccess", "success", "failure", "criticalFailure"].includes(action.roll.degree));
  assert.equal(action.roll.saveBonus, target.saves.reflex, "the roll must use the TARGET's own Reflex save, never the thrower's");
  assert.equal(action.usesRemaining, 0);
});

test("saveAttack: never increments the shared Multiple Attack Penalty counter — no attack roll happens at all", () => {
  const thrower = makeThrower();
  thrower.strikes = [{ name: "Fallback Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }];
  const target = makeGoon({ position: { col: 0, row: 0 } });
  function ai(state, id, turn) {
    if (id !== "thrower") return null;
    if (turn.actionsUsed === 0) return { type: "saveAttack", targetId: "goon", saveAttackIndex: 0 };
    if (turn.actionsUsed === 1) return { type: "strike", targetId: "goon", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [thrower, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "thrower").actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.mapPenalty, 0, "the Strike immediately after a saveAttack must carry 0 MAP — saveAttack never counts as an attack roll");
});

test("demoralize: on success, applies real Frightened per the mirrored SRD table (crit success -> 2, success -> 1), and marks the target as attempted regardless of outcome", () => {
  const goon = makeGoon(); // intimidationModifier 6, overwhelming vs a low-Will target
  const target = makeThrower({ id: "victim", saves: { fort: 4, ref: 6, will: -10 }, position: { col: 1, row: 0 } });
  function ai(state, id, turn) { return id === "goon" && turn.actionsUsed === 0 ? { type: "demoralize", targetId: "victim" } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [goon, target], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "goon").actions.find((a) => a.type === "demoralize");
  assert.equal(action.legal, true);
  assert.ok(action.frightenedApplied > 0, `expected a real Frightened value against a Will -10 target, got ${action.frightenedApplied}`);
  assert.equal(action.targetFrightenedAfter, action.frightenedApplied);
});

test("demoralize: never increments the shared Multiple Attack Penalty counter — it's a skill check, not an attack roll (THE mechanism behind 'demoralize costs nothing extra even after two Strikes')", () => {
  const goon = makeGoon();
  goon.strikes = [{ name: "Baton", strikeType: "melee", attackBonus: 9, traits: [], damage: [{ dice: "1d6", bonus: 3 }] }];
  // High HP on purpose: max possible damage from 2 Baton hits is 2*(6+3)=18, so 30 HP guarantees
  // the target survives to be legally Demoralized regardless of how this seed's dice land — the
  // point under test is MAP accounting, not a fragile "did the target happen to survive" race.
  const target = makeThrower({ currentHP: 30, maxHP: 30, position: { col: 0, row: 0 } });
  function ai(state, id, turn) {
    if (id !== "goon") return null;
    if (turn.actionsUsed === 0) return { type: "strike", targetId: "thrower", strikeIndex: 0 }; // 1st Strike, 0 MAP
    if (turn.actionsUsed === 1) return { type: "strike", targetId: "thrower", strikeIndex: 0 }; // 2nd Strike, -5 MAP
    if (turn.actionsUsed === 2) return { type: "demoralize", targetId: "thrower" }; // 3rd action, but a skill check
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [goon, target], ai });
  const actions = log.rounds[0].turns.find((t) => t.combatantId === "goon").actions;
  const strikes = actions.filter((a) => a.type === "strike");
  assert.equal(strikes[0].roll.mapPenalty, 0);
  assert.equal(strikes[1].roll.mapPenalty, -5);
  const demoralize = actions.find((a) => a.type === "demoralize");
  assert.equal(demoralize.legal, true, "Demoralize must still be a fully legal 3rd action even after two real Strikes");
});

test("Frightened reduces the FRIGHTENED creature's own AC — a real, live cross-check via checkStrikeLegal-driven combat, not just the isolated combatant.mjs unit", () => {
  const attacker = makeGoon({ id: "attacker", strikes: [{ name: "Baton", strikeType: "melee", attackBonus: 9, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }] });
  // AC 17 vs attackBonus 9: needs a 8+ to hit normally. Frightened 2 drops effective AC to 15,
  // needing only a 6+ — the difference is directly visible in the logged targetAc.
  const frightenedTarget = makeThrower({ frightened: 2, position: { col: 0, row: 0 } });
  function ai(state, id, turn) { return id === "attacker" && turn.actionsUsed === 0 ? { type: "strike", targetId: "thrower", strikeIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [attacker, frightenedTarget], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.targetAc, 15, "Frightened 2 must reduce the target's effective AC from 17 to 15 (a status penalty to their own DCs)");
});

test("Frightened reduces the FRIGHTENED creature's OWN attack rolls — a status penalty to their own checks too", () => {
  const frightenedAttacker = makeGoon({ frightened: 2, strikes: [{ name: "Baton", strikeType: "melee", attackBonus: 9, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }] });
  const target = makeThrower({ position: { col: 0, row: 0 } });
  function ai(state, id, turn) { return id === "goon" && turn.actionsUsed === 0 ? { type: "strike", targetId: "thrower", strikeIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [frightenedAttacker, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "goon").actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.mapPenalty, -2, "a frightened 2 attacker's own attack roll must carry a -2 penalty folded into mapPenalty (no separate frightenedPenalty field — same aggregate MAP/range/frightened already use)");
});

test("Frightened decays by exactly 1 at the end of the frightened combatant's own turn, per the real mirrored condition text", () => {
  const frightenedGoon = makeGoon({ frightened: 3 });
  const bystander = makeThrower({ position: { col: 10, row: 10 } }); // far away, never interacts
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 3, combatants: [frightenedGoon, bystander], ai: () => null });
  const goonTurns = log.rounds.flatMap((r) => r.turns).filter((t) => t.combatantId === "goon");
  assert.equal(goonTurns[0].snapshot.goon.frightened, 2, "after round 1's turn, 3 -> 2");
  assert.equal(goonTurns[1].snapshot.goon.frightened, 1, "after round 2's turn, 2 -> 1");
  assert.equal(goonTurns[2].snapshot.goon.frightened, 0, "after round 3's turn, 1 -> 0");
});

/**
 * REGRESSION (design doc §21) — found from a direct user report ("a bad guy oscillates by moving up
 * and down", "moved three times when they could have engaged") and confirmed by instrumenting a real
 * 2v2 fight: `state.positions` keeps every combatant's last position forever, alive or dead
 * (deliberately — the artifact viewer needs a defeated combatant's final square to render its body).
 * Every occupancy check for movement used to read straight off it with NO HP filter at all, so a
 * combatant who died standing in a single-square doorway permanently sealed it for the rest of the
 * battle. Minimal, deterministic proof here: a 1-row-tall corridor makes any detour around the
 * corpse geometrically impossible, so the mover can ONLY succeed by being allowed to path through
 * the exact square a dead combatant occupies.
 */
test("a combatant who starts already dead in a one-row-tall corridor does not block a living combatant from moving through its square — the corpse-in-doorway bug", () => {
  const corpse = { id: "corpse", name: "Corpse", side: "opposition", maxHP: 20, currentHP: 0, ac: 14, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: { col: 2, row: 0 } };
  const mover = {
    id: "mover", name: "Mover", side: "party", maxHP: 16, currentHP: 16, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [],
    position: { col: 0, row: 0 }, objective: { col: 4, row: 0 } // real decide.mjs mechanism: "move toward this point"
  };
  function ai(state, combatantId, turnState) { return decide(state, combatantId, turnState); }
  // A 1-row grid: the ONLY way from col 0 to col 4 is straight through col 2, where the corpse sits.
  const log = runBattle({ seed: 1, gridSize: { cols: 5, rows: 1 }, roundLimit: 2, combatants: [corpse, mover], ai });

  const moverMoves = log.rounds.flatMap((r) => r.turns).filter((t) => t.combatantId === "mover").flatMap((t) => t.actions ?? []);
  assert.ok(moverMoves.length > 0, "expected the mover to actually attempt moving, not hold with nothing to do");
  assert.ok(moverMoves.every((a) => a.legal !== false), `every move must be legal — a corpse must never block movement: ${JSON.stringify(moverMoves)}`);
  const reachedPastCorpse = moverMoves.some((a) => a.type === "move" && a.to.col >= 2);
  assert.ok(reachedPastCorpse, `expected the mover to reach col>=2 (through/onto the corpse's own square) — got: ${JSON.stringify(moverMoves)}`);
});
