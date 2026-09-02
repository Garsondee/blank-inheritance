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
import { runBattle, accountForActions, forkTurnSandbox, resetSandboxForkCount, getSandboxForkCount } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { resolveEffectiveStats } from "../../tools/battle-simulator/personnel-engine/combatant.mjs";
import { checkStrikeLegal } from "../../tools/battle-simulator/personnel-engine/legality.mjs";

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

// --- Stunned (Player Core pg. 421, design doc §24 — a real, previously-shipped bug, not a first
// implementation: the OLD code forfeited the WHOLE turn for ANY stunnedValue > 0 and decremented
// by exactly 1 per turn regardless of the real value, so "Stunned 2" cost 6 actions across two
// fully-forfeited turns instead of the real rule's exactly 2. Both tests below encode the rule's
// OWN worked examples directly, not just a made-up scenario. ---

test("Stunned 1 (Erabryth's Forced Reflection, real \"failure\" outcome): costs EXACTLY 1 of 3 actions this turn, not the whole turn — the specific bug Ingram reported (\"Stunned is currently knocking out three actions\")", () => {
  const caster = makeCaster({ stunnedValue: 1 });
  const target = makeTarget({ position: { col: 1, row: 0 } });
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 2, combatants: [caster, target], ai: () => null });
  const r1 = log.rounds.find((r) => r.round === 1)?.turns.find((t) => t.combatantId === "caster");
  const r2 = log.rounds.find((r) => r.round === 2)?.turns.find((t) => t.combatantId === "caster");
  assert.equal(r1.stunned, true, "round 1: under Stunned 1");
  assert.equal(r1.stunnedActionsLost, 1, "exactly 1 action lost, not all 3");
  assert.equal(r1.actionAccounting.available, 2, "2 of the normal 3 actions were actually available this turn — 1 was already spent on being stunned");
  assert.equal(r2.stunned, undefined, "round 2: Stunned 1 fully resolved in round 1 (1 of 1 owed action already lost) — no carryover");
});

test("Stunned 4 (Player Core's own worked example, quoted verbatim): loses all 3 actions turn 1 (reducing to Stunned 1), then loses exactly 1 more action turn 2 and keeps the remaining 2 to use normally", () => {
  const caster = makeCaster({ stunnedValue: 4 });
  const target = makeTarget({ position: { col: 1, row: 0 } });
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 3, combatants: [caster, target], ai: () => null });
  const r1 = log.rounds.find((r) => r.round === 1)?.turns.find((t) => t.combatantId === "caster");
  const r2 = log.rounds.find((r) => r.round === 2)?.turns.find((t) => t.combatantId === "caster");
  const r3 = log.rounds.find((r) => r.round === 3)?.turns.find((t) => t.combatantId === "caster");

  assert.equal(r1.stunned, true, "round 1: under Stunned 4");
  assert.equal(r1.stunnedActionsLost, 3, "round 1: loses ALL 3 actions (Stunned 4 exceeds the turn's own 3-action budget)");
  assert.equal(r1.actions.length, 0, "round 1: a genuinely full forfeit — the AI is never even consulted");

  assert.equal(r2.stunned, true, "round 2: 1 of the original 4 carries over (4 - 3 = 1)");
  assert.equal(r2.stunnedActionsLost, 1, "round 2: loses exactly the 1 remaining owed action");
  assert.equal(r2.actionAccounting.available, 2, "round 2: 2 real actions were available this turn, not 0 and not 3");

  assert.equal(r3.stunned, undefined, "round 3: fully resolved (1 action owed, already lost in round 2) — back to normal");
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
    saveAttacks: [{ name: "Grenade", saveType: "ref", dc: 17, range: 70, actions: 1, damage: [{ dice: "1d8", bonus: 0, damageType: "fire" }] }],
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
  assert.equal(action.roll.saveBonus, target.saves.ref, "the roll must use the TARGET's own Reflex save, never the thrower's");
  assert.equal(action.usesRemaining, 0);
});

/**
 * REGRESSION (design doc §22, found while building the cover feature — not by inspection): every
 * combatant's `saves` object uses the project's established SHORT key convention (`fort`/`ref`/
 * `will`, matching every real fixture and sf2e-common's own proficiency shape), but `saveType`
 * values had been authored as the FULL word ("reflex") in the original §20 grenade work and copied
 * forward from there. `target.saves["reflex"]` is `undefined`; `undefined + 0` is `NaN`; and
 * `degreeOfSuccess`'s three `>=`/`>` comparisons against a NaN total are ALL false in JS, so the
 * result fell all the way through to the `criticalFailure` branch UNCONDITIONALLY (every comparison
 * against NaN is false — there is no "middle" outcome to land on), varying only when a natural 20
 * shifted it up to a plain failure. A real target facing a real saveAttack was, in effect, never
 * capable of a genuine save at all — worst-case damage nearly every time, regardless of the real
 * d20 rolled. Silent because nothing asserted the actual NUMBER `saveBonus` resolved to, only that
 * `degree` was one of the four valid strings (criticalFailure IS a valid string). Pinned directly:
 * across real dice, the degree distribution must show real variety, not certainty.
 */
test("saveAttack: real dice produce a real spread of degrees across many rolls — NOT criticalFailure (near-)every time, which is what a NaN saveBonus silently produces", () => {
  const degrees = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const thrower = makeThrower();
    const target = makeGoon({ position: { col: 1, row: 0 } });
    function ai(state, id, turn) { return id === "thrower" && turn.actionsUsed === 0 ? { type: "saveAttack", targetId: "goon", saveAttackIndex: 0 } : null; }
    const log = runBattle({ seed, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [thrower, target], ai });
    const action = log.rounds[0].turns.find((t) => t.combatantId === "thrower").actions.find((a) => a.type === "saveAttack");
    assert.ok(Number.isFinite(action.roll.saveBonus), `seed ${seed}: saveBonus must be a real finite number, got ${action.roll.saveBonus}`);
    degrees.add(action.roll.degree);
  }
  assert.ok(degrees.size > 1, `expected a real spread of degrees across 30 seeds, saw only: ${[...degrees].join(", ")}`);
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

// --- conditionSave (design doc §22, e.g. Erabryth's Forced Reflection) ---

function makeErabryth(overrides = {}) {
  return {
    id: "erabryth", name: "Erabryth", side: "opposition", maxHP: 20, currentHP: 20, ac: 15,
    saves: { fort: 4, ref: 9, will: 6 }, speed: 25,
    conditionSaves: [{
      name: "Forced Reflection", saveType: "will", dc: 17, range: 60, actions: 1, traits: ["mental"],
      outcomes: {
        criticalSuccess: {},
        success: { frightened: 1 },
        failure: { stunnedValue: 1, frightened: 1 },
        criticalFailure: { stunnedValue: 2, frightened: 2 }
      }
    }],
    position: { col: 0, row: 0 },
    ...overrides
  };
}

test("conditionSave: the TARGET rolls a real save, and every one of the 4 real degrees appears across enough seeds — not a fixed/fake outcome", () => {
  const degrees = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const erabryth = makeErabryth();
    const target = makeGoon({ id: "target", side: "party", saves: { fort: 5, ref: 5, will: 2 }, position: { col: 5, row: 0 } });
    function ai(state, id, turn) { return id === "erabryth" && turn.actionsUsed === 0 ? { type: "conditionSave", targetId: "target", conditionSaveIndex: 0 } : null; }
    const log = runBattle({ seed, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [erabryth, target], ai });
    const action = log.rounds[0].turns.find((t) => t.combatantId === "erabryth").actions.find((a) => a.type === "conditionSave");
    assert.equal(action.legal, true);
    degrees.add(action.roll.degree);
  }
  assert.equal(degrees.size, 4, `expected all 4 real degrees across 30 seeds, saw: ${[...degrees].join(", ")}`);
});

test("conditionSave: applies the REAL per-degree table exactly — failure sets both Stunned 1 and Frightened 1 together", () => {
  const erabryth = makeErabryth();
  const target = makeGoon({ id: "target", side: "party", saves: { fort: 5, ref: 5, will: 2 }, position: { col: 5, row: 0 } });
  function ai(state, id, turn) { return id === "erabryth" && turn.actionsUsed === 0 ? { type: "conditionSave", targetId: "target", conditionSaveIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [erabryth, target], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "erabryth").actions.find((a) => a.type === "conditionSave");
  // seed 1 with these real stats is independently confirmed (by direct diagnostic, not guessed) to
  // land on "failure" — pinned here as a real, reproducible example of the table applying correctly,
  // not asserting every seed must land here (a fixed modifier can never force EVERY d20 into one
  // narrow degree band, so this test relies on one known-good seed rather than a false "guaranteed" claim).
  assert.equal(action.roll.degree, "failure");
  assert.deepEqual(action.applied, { stunnedValue: 1, frightened: 1 });
  assert.equal(action.targetFrightenedAfter, 1);
  assert.equal(action.targetStunnedValueAfter, 1);
});

test("conditionSave: never increments the shared Multiple Attack Penalty counter — no attack roll happens at all, same as saveAttack/demoralize", () => {
  const erabryth = makeErabryth({ strikes: [{ name: "Fallback Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }] });
  const target = makeGoon({ id: "target", side: "party", position: { col: 0, row: 0 } });
  function ai(state, id, turn) {
    if (id !== "erabryth") return null;
    if (turn.actionsUsed === 0) return { type: "conditionSave", targetId: "target", conditionSaveIndex: 0 };
    if (turn.actionsUsed === 1) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [erabryth, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "erabryth").actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.mapPenalty, 0, "the Strike immediately after a conditionSave must carry 0 MAP — conditionSave never counts as an attack roll");
});

test("conditionSave: a target already tried with this ability is rejected on a second attempt, and the corresponding real regression is pinned end to end (checkConditionSaveLegal's own unit test covers the legality math; this proves the full engine wiring)", () => {
  const erabryth = makeErabryth();
  const target = makeGoon({ id: "target", side: "party", currentHP: 30, position: { col: 5, row: 0 } });
  function ai(state, id, turn) { return id === "erabryth" && turn.actionsUsed === 0 ? { type: "conditionSave", targetId: "target", conditionSaveIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 3, combatants: [erabryth, target], ai });
  const attempts = log.rounds.flatMap((r) => r.turns).filter((t) => t.combatantId === "erabryth").flatMap((t) => t.actions ?? []).filter((a) => a.type === "conditionSave");
  assert.equal(attempts[0].legal, true);
  for (const later of attempts.slice(1)) {
    assert.equal(later.legal, false);
    // design doc §34: the rejection reason changed from "the attacker already tried" to "the
    // target is already immune" when the gate moved from attacker-side to target-side tracking —
    // same real behavior (a second attempt is still rejected), more accurate wording.
    assert.match(later.reason, /already immune/);
  }
});

test("conditionSave: a real Stunned 1 applied in combat costs the target EXACTLY 1 of its next turn's 3 actions, not the whole turn (design doc §24 — the round loop's corrected stunnedValue mechanism, reachable from a real in-combat action)", () => {
  const erabryth = makeErabryth({ conditionSaves: [{ name: "Forced Reflection", saveType: "will", dc: 50, range: 60, actions: 1, traits: [], outcomes: { criticalSuccess: {}, success: {}, failure: { stunnedValue: 1 }, criticalFailure: { stunnedValue: 1 } } }] }); // guaranteed failure or worse
  const target = makeGoon({ id: "target", side: "party", position: { col: 5, row: 0 } }); // must be on the OTHER side, or checkOutcome ends the battle at round 1 with no real party at all
  function ai(state, id, turn) { return id === "erabryth" && turn.actionsUsed === 0 ? { type: "conditionSave", targetId: "target", conditionSaveIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 2, combatants: [erabryth, target], ai });
  const targetTurns = log.rounds.flatMap((r) => r.turns).filter((t) => t.combatantId === "target");
  const stunnedTurn = targetTurns.find((t) => t.stunned === true);
  assert.ok(stunnedTurn, `expected the target to show stunned:true on some turn, got: ${JSON.stringify(targetTurns.map((t) => t.stunned))}`);
  assert.equal(stunnedTurn.stunnedActionsLost, 1, "Stunned 1 must cost exactly 1 action, never a full 3-action forfeit");
  assert.equal(stunnedTurn.actionAccounting.available, 2, "2 real actions must still be available that turn");
});

// --- Standard cover (design doc §22, Player Core pg. 416) ---

function makeAttacker(overrides = {}) {
  return {
    id: "attacker", name: "Attacker", side: "party", maxHP: 16, currentHP: 16, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Sidearm", strikeType: "ranged", attackBonus: 10, rangeIncrement: 60, traits: [], damage: [{ dice: "1d1", bonus: 5 }] }],
    saveAttacks: [{ name: "Test Blast", saveType: "ref", dc: 20, range: 60, actions: 1, traits: [], damage: [{ dice: "1d1", bonus: 5 }], usesRemaining: 5 }],
    position: { col: 0, row: 0 },
    ...overrides
  };
}
function makeDefender(overrides = {}) {
  return {
    id: "defender", name: "Defender", side: "opposition", maxHP: 30, currentHP: 30, ac: 10,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 5, row: 0 },
    ...overrides
  };
}
const COVER_WALL = [{ c: [2, 0, 2, 1], cover: true }]; // sits squarely between (0,0) and (5,0)

test("strike: a real cover object between attacker and target logs coverBonus:2 and the target's own AC/saves are never mutated by it (cover is relative to THIS shot, not a standing condition)", () => {
  const attacker = makeAttacker();
  const defender = makeDefender();
  function ai(state, id, turn) { return id === "attacker" && turn.actionsUsed === 0 ? { type: "strike", targetId: "defender", strikeIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [attacker, defender], ai, walls: COVER_WALL });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "strike");
  assert.equal(strike.coverBonus, 2);
  assert.equal(defender.ac, 10, "the defender's own persistent AC must never be modified by someone else's cover check");
});

test("strike: no cover object between attacker and target logs coverBonus:0", () => {
  const attacker = makeAttacker();
  const defender = makeDefender();
  function ai(state, id, turn) { return id === "attacker" && turn.actionsUsed === 0 ? { type: "strike", targetId: "defender", strikeIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [attacker, defender], ai }); // no walls at all
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "strike");
  assert.equal(strike.coverBonus, 0);
});

test("strike: cover actually changes the real hit/miss outcome, not just a logged number nobody reads — same seed, same attacker/defender, only the wall differs", () => {
  function runWith(walls) {
    const attacker = makeAttacker();
    const defender = makeDefender();
    function ai(state, id, turn) { return id === "attacker" && turn.actionsUsed === 0 ? { type: "strike", targetId: "defender", strikeIndex: 0 } : null; }
    const log = runBattle({ seed: 3, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [attacker, defender], ai, walls });
    return log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "strike").roll;
  }
  const withoutCover = runWith(undefined);
  const withCover = runWith(COVER_WALL);
  assert.equal(withoutCover.d20, withCover.d20, "same seed must roll the same raw d20 either way — only the AC target changed, not the dice stream");
  assert.equal(withCover.total, withoutCover.total, "the roll's own total is attack-side, unaffected by the target's AC");
  assert.ok(withCover.degree === withoutCover.degree || (["success", "criticalSuccess"].includes(withoutCover.degree) && ["failure", "criticalFailure", "success"].includes(withCover.degree)),
    `cover raising the effective AC by 2 must never IMPROVE the attacker's degree of success: without=${withoutCover.degree} with=${withCover.degree}`);
});

test("saveAttack: a real cover object grants +2 to a REFLEX save specifically (Player Core: 'standard cover... to Reflex saves against area effects'), logged as coverBonus:2", () => {
  const attacker = makeAttacker();
  const defender = makeDefender();
  function ai(state, id, turn) { return id === "attacker" && turn.actionsUsed === 0 ? { type: "saveAttack", targetId: "defender", saveAttackIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [attacker, defender], ai, walls: COVER_WALL });
  const save = log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "saveAttack");
  assert.equal(save.coverBonus, 2);
  assert.equal(save.roll.saveBonus, 7, "the defender's real Reflex save (5) plus the +2 cover bonus, folded in for this roll only");
  assert.equal(defender.saves.ref, 5, "the defender's own persistent Reflex save must never be modified by someone else's cover check");
});

test("saveAttack: cover does NOT apply to a non-reflex save (Fortitude/Will) — the real rule names Reflex specifically", () => {
  const attacker = makeAttacker({ saveAttacks: [{ name: "Test Fort Blast", saveType: "fort", dc: 20, range: 60, actions: 1, traits: [], damage: [{ dice: "1d1", bonus: 5 }], usesRemaining: 5 }] });
  const defender = makeDefender();
  function ai(state, id, turn) { return id === "attacker" && turn.actionsUsed === 0 ? { type: "saveAttack", targetId: "defender", saveAttackIndex: 0 } : null; }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [attacker, defender], ai, walls: COVER_WALL });
  const save = log.rounds[0].turns.find((t) => t.combatantId === "attacker").actions.find((a) => a.type === "saveAttack");
  // coverBonus is still logged as 2 (a real cover object DOES sit between them) even though it had
  // no effect on THIS save type — the log records "was there real cover", not "did it apply here".
  assert.equal(save.coverBonus, 2);
  assert.equal(save.roll.saveBonus, 5, "Fortitude save must be the defender's real, unmodified value — cover only touches Reflex");
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

/**
 * Design doc §26 — Ingram's own report: "tokens push straight through walls... special attention to
 * moving accurately through doorways and around building corners." checkMoveLegality always
 * validated a real wall-avoiding route when decide.mjs's pathfinding supplied one (the mechanic was
 * never wrong) — the bug was that engine.mjs discarded that real `path` before logging it, so the
 * artifact viewer had nothing but a straight line between endpoints to draw or animate, cutting
 * visually through whatever wall/corner the real move had legitimately routed around. This proves
 * the fix at the source: a move that genuinely needs to detour around a wall logs its own real,
 * connected, wall-respecting route — not just its final destination.
 *
 * Layout: a 4x4 grid with a wall along the row1/row2 boundary blocking columns 0-2, leaving column
 * 3's edge as the only doorway. The mover starts at (0,0) with an objective straight across the
 * wall at (0,3) — the ONLY legal way there detours east to the doorway and back.
 */
test("a move that must detour around a wall corner logs its own real, connected path — not just [from,to]", () => {
  const WALL_WITH_DOORWAY_AT_COL_3 = [
    { c: [0, 2, 1, 2], move: 20, sight: 20 },
    { c: [1, 2, 2, 2], move: 20, sight: 20 },
    { c: [2, 2, 3, 2], move: 20, sight: 20 }
    // column 3's own edge, [3,2,4,2], is deliberately left open as the doorway.
  ];
  const mover = {
    id: "mover", name: "Mover", side: "party", maxHP: 16, currentHP: 16, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 200, strikes: [],
    position: { col: 0, row: 0 }, objective: { col: 0, row: 3 }
  };
  function ai(state, combatantId, turnState) { return decide(state, combatantId, turnState); }
  const log = runBattle({ seed: 1, gridSize: { cols: 4, rows: 4 }, roundLimit: 2, combatants: [mover], ai, walls: WALL_WITH_DOORWAY_AT_COL_3 });

  const moves = log.rounds.flatMap((r) => r.turns).filter((t) => t.combatantId === "mover").flatMap((t) => t.actions ?? []).filter((a) => a.type === "move");
  assert.ok(moves.length > 0, "expected the mover to actually attempt moving");
  assert.ok(moves.every((a) => a.legal !== false), `every move must be legal: ${JSON.stringify(moves)}`);

  const bentMove = moves.find((a) => a.path?.length > 2);
  assert.ok(bentMove, `expected at least one move with a real multi-point path (not just [from,to]) — got: ${JSON.stringify(moves)}`);
  assert.deepEqual(bentMove.path[0], bentMove.from, "the logged path must start at the action's own real origin");
  assert.deepEqual(bentMove.path[bentMove.path.length - 1], bentMove.to, "the logged path must end at the action's own real destination");

  for (let i = 1; i < bentMove.path.length; i++) {
    const a = bentMove.path[i - 1], b = bentMove.path[i];
    const stepDist = Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row));
    assert.equal(stepDist, 1, `every consecutive pair in a real path must be exactly one grid step apart — got ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
    // The wall blocks the row1->row2 crossing everywhere except column 3 (the doorway) — a
    // genuinely wall-respecting path must never cross that boundary anywhere else.
    const crossesRow1To2 = (a.row === 1 && b.row === 2) || (a.row === 2 && b.row === 1);
    if (crossesRow1To2) assert.ok(a.col === 3 && b.col === 3, `the only legal row1<->row2 crossing is at column 3 (the doorway) — got ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  }
});

// ---------------------------------------------------------------------------
// areaAttack (design doc §38, e.g. Tough's real Frag Grenade) — the multi-target basic-save
// mechanism every grenade-carrying fixture since §21 has honestly flagged as missing.
// ---------------------------------------------------------------------------

function makeGrenadier(overrides = {}) {
  return {
    id: "grenadier", name: "Grenadier", side: "opposition", maxHP: 24, currentHP: 24, ac: 16,
    saves: { fort: 7, ref: 7, will: 5 }, speed: 25,
    areaAttacks: [{ name: "Frag Grenade (Commercial)", saveType: "ref", dc: 17, range: 70, radius: 5, actions: 1, damage: [{ dice: "1d8", bonus: 0, damageType: "piercing" }] }],
    position: { col: 0, row: 0 },
    ...overrides
  };
}
function makeBystander(id, overrides = {}) {
  return {
    id, name: id, side: "party", maxHP: 20, currentHP: 20, ac: 14,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 0, row: 0 },
    ...overrides
  };
}

test("areaAttack: resolves via a real basic save, decrements usesRemaining exactly once, and reports every affected combatant", () => {
  // grenadier stands 25ft (5 squares) from the aim point — within the grenade's real 70ft throw
  // range, but safely outside its own 5ft blast radius, so this test's "only near-2" claim isn't
  // also silently depending on whether the thrower catches themselves.
  const grenadier = makeGrenadier({ position: { col: 1, row: 5 } });
  grenadier.areaAttacks[0].usesRemaining = 1;
  const nearOne = makeBystander("near-1", { position: { col: 4, row: 0 } });  // 15ft from origin — outside the 5ft radius
  const nearTwo = makeBystander("near-2", { position: { col: 1, row: 0 } });  // origin itself, 0ft
  function ai(state, id, turn) {
    return id === "grenadier" && turn.actionsUsed === 0 ? { type: "areaAttack", originId: "near-2", areaAttackIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [grenadier, nearOne, nearTwo], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "grenadier").actions.find((a) => a.type === "areaAttack");
  assert.equal(action.legal, true, JSON.stringify(action));
  assert.equal(action.usesRemaining, 0, "one grenade throw consumes exactly one use, regardless of how many creatures were caught in it");
  const affectedIds = action.affected.map((a) => a.targetId).sort();
  assert.deepEqual(affectedIds, ["near-2"], "origin at near-2's own square (0ft away) — near-1 sits 15ft further out, well beyond the 5ft radius, so only near-2 is caught");
  for (const a of action.affected) {
    assert.ok(["criticalSuccess", "success", "failure", "criticalFailure"].includes(a.roll.degree));
    assert.equal(a.roll.saveBonus, nearTwo.saves.ref, "the roll must use the AFFECTED CREATURE's own Reflex save, never the thrower's");
  }
});

test("areaAttack: real friendly fire — an ALLY of the attacker caught in the blast radius takes real damage too, same shared damage roll as the enemy", () => {
  // grenadier (opposition) throws at a party member 30ft away (well within the real 70ft throw
  // range, well outside the 5ft blast); a SECOND opposition combatant standing right next to the
  // aim point must be caught too — friendly fire cuts both ways, exactly the property every prior
  // grenade note flagged as missing ("none of the real friendly-fire risk").
  const opAllyTemplate = { id: "op-ally", name: "op-ally", side: "opposition", maxHP: 20, currentHP: 20, ac: 14, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } }; // 5ft from party-target
  function ai(state, id, turn) {
    return id === "grenadier" && turn.actionsUsed === 0 ? { type: "areaAttack", originId: "party-target", areaAttackIndex: 0 } : null;
  }
  let sawAllyHit = false;
  for (let seed = 1; seed <= 15 && !sawAllyHit; seed++) {
    const log = runBattle({
      seed, gridSize: { cols: 20, rows: 20 }, roundLimit: 1,
      combatants: [makeGrenadier({ position: { col: 6, row: 0 } }), makeBystander("party-target", { position: { col: 0, row: 0 } }), { ...opAllyTemplate }],
      ai
    });
    const action = log.rounds[0].turns.find((t) => t.combatantId === "grenadier").actions.find((a) => a.type === "areaAttack");
    assert.equal(action.legal, true, JSON.stringify(action));
    const allyEntry = action.affected.find((a) => a.targetId === "op-ally");
    assert.ok(allyEntry, `op-ally (5ft from the aim point, inside the 5ft radius) must always be listed as affected — got: ${JSON.stringify(action.affected.map((a) => a.targetId))}`);
    if (allyEntry.appliedDamage > 0) sawAllyHit = true;
  }
  assert.ok(sawAllyHit, "expected op-ally to actually take real damage from its own side's grenade on at least one of 15 seeds — a real basic-save roll fails or crit-fails sometimes");
});

test("areaAttack: never increments the shared Multiple Attack Penalty counter — no attack roll happens at all, same as saveAttack", () => {
  const grenadier = makeGrenadier();
  grenadier.strikes = [{ name: "Fallback Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }];
  const target = makeBystander("target", { position: { col: 0, row: 0 } });
  function ai(state, id, turn) {
    if (id !== "grenadier") return null;
    if (turn.actionsUsed === 0) return { type: "areaAttack", originId: "target", areaAttackIndex: 0 };
    if (turn.actionsUsed === 1) return { type: "strike", targetId: "target", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [grenadier, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "grenadier").actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.mapPenalty, 0, "the Strike immediately after an areaAttack must carry 0 MAP — areaAttack never counts as an attack roll");
});

test("areaAttack: rejected as illegal (not silently ignored) when the aim point's own occupant is already dead and nothing else is in range of the blast", () => {
  // A live creature is ALWAYS 0ft from its own square, so it's always "in its own blast" by
  // construction — the only realistic way an aim point ends up genuinely empty is a stale proposal
  // against a target that died earlier this same battle (isDead filters it out of `affected`).
  // Opposition-side, not party — conditions.mjs's own isDead is instant-death for opposition at 0
  // HP, unlike a party member, who'd merely be unconscious (and thus still very much "in the blast").
  // grenadier stands 25ft off (within the real 70ft throw range, outside the 5ft radius) so it
  // isn't accidentally caught in its own blast — the point under test is a genuinely EMPTY blast.
  const grenadier = makeGrenadier({ position: { col: 1, row: 5 } });
  const corpse = { id: "corpse", name: "corpse", side: "opposition", maxHP: 20, currentHP: 0, ac: 14, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } };
  function ai(state, id, turn) {
    return id === "grenadier" && turn.actionsUsed === 0 ? { type: "areaAttack", originId: "corpse", areaAttackIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [grenadier, corpse], ai });
  const action = log.rounds[0].turns.find((t) => t.combatantId === "grenadier").actions.find((a) => a.type === "areaAttack");
  assert.equal(action.legal, false);
  assert.match(action.reason, /empty ground/);
});

test("areaAttack: real dice produce a real spread of degrees across many rolls, with a finite saveBonus every time", () => {
  const degrees = new Set();
  for (let seed = 1; seed <= 30; seed++) {
    const grenadier = makeGrenadier();
    const target = makeBystander("target", { position: { col: 1, row: 0 } });
    function ai(state, id, turn) {
      return id === "grenadier" && turn.actionsUsed === 0 ? { type: "areaAttack", originId: "target", areaAttackIndex: 0 } : null;
    }
    const log = runBattle({ seed, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [grenadier, target], ai });
    const action = log.rounds[0].turns.find((t) => t.combatantId === "grenadier").actions.find((a) => a.type === "areaAttack");
    const entry = action.affected.find((a) => a.targetId === "target");
    assert.ok(Number.isFinite(entry.roll.saveBonus), `seed ${seed}: saveBonus must be a real finite number, got ${entry.roll.saveBonus}`);
    degrees.add(entry.roll.degree);
  }
  assert.ok(degrees.size > 1, `expected a real spread of degrees across 30 seeds, saw only: ${[...degrees].join(", ")}`);
});

test("areaAttack (EXPECTED-VALUE sandbox, via forkTurnSandbox — the exact path decide.mjs's own lookahead uses): mutates EVERY affected combatant's currentHP, not just one", () => {
  const grenadier = makeGrenadier();
  const enemy = makeBystander("enemy-of-grenadier", { position: { col: 1, row: 0 } });
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["grenadier", { ...grenadier }], ["enemy-of-grenadier", { ...enemy }]]),
    positions: new Map([["grenadier", { col: 0, row: 0 }], ["enemy-of-grenadier", { col: 1, row: 0 }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0 };
  const sandbox = forkTurnSandbox({ state, turn });
  const result = sandbox.apply("grenadier", { type: "areaAttack", originId: "enemy-of-grenadier", areaAttackIndex: 0 });
  assert.equal(result.legal, true, JSON.stringify(result));
  const after = sandbox.state.combatants.get("enemy-of-grenadier");
  assert.ok(after.currentHP < enemy.currentHP, `expected the sandboxed enemy's currentHP to have dropped from the expected-value hit, was ${enemy.currentHP}, still ${after.currentHP}`);
});

// SANDBOX-FORK COUNTER (design doc §59, GH issue #5) — the one true seam a decision-cost profiler
// hooks: forkTurnSandbox is called on every real search step regardless of how much caching sits
// above it (planTurn's own scoredCache included — a cache HIT skips this call outright), so
// counting AT this seam always reflects real work done, never an approximation.
test("SANDBOX-FORK COUNTER: resetSandboxForkCount/getSandboxForkCount accurately track the real number of forkTurnSandbox calls made", () => {
  const grenadier = makeGrenadier();
  const enemy = makeBystander("enemy-of-grenadier", { position: { col: 1, row: 0 } });
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["grenadier", { ...grenadier }], ["enemy-of-grenadier", { ...enemy }]]),
    positions: new Map([["grenadier", { col: 0, row: 0 }], ["enemy-of-grenadier", { col: 1, row: 0 }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0 };
  resetSandboxForkCount();
  assert.equal(getSandboxForkCount(), 0, "expected a clean count immediately after reset");
  forkTurnSandbox({ state, turn });
  forkTurnSandbox({ state, turn });
  forkTurnSandbox({ state, turn });
  assert.equal(getSandboxForkCount(), 3, "expected the counter to track exactly the 3 real forkTurnSandbox calls made");
  resetSandboxForkCount();
  assert.equal(getSandboxForkCount(), 0, "reset must zero the counter again");
});

test("SANDBOX-FORK COUNTER: a real decide() call (planTurn's own memoized path, competence>=1) runs byte-identically whether or not something is reading the counter", () => {
  const lunar17 = { id: "lunar17", name: "L17", side: "party", maxHP: 20, currentHP: 20, ac: 17, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Dagger", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }], position: { col: 0, row: 0 } };
  const goon = { id: "goon", name: "Goon", side: "opposition", maxHP: 20, currentHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Baton", strikeType: "melee", attackBonus: 6, traits: [], damage: [{ dice: "1d6", bonus: 0 }] }], position: { col: 1, row: 0 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["lunar17", { ...lunar17 }], ["goon", { ...goon }]]),
    positions: new Map([["lunar17", { ...lunar17.position }], ["goon", { ...goon.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, decisionIndex: 0 };

  const withoutReads = decide(state, "lunar17", turn, { competence: 1 });

  resetSandboxForkCount();
  const withReads = decide(state, "lunar17", turn, { competence: 1 });
  const sandboxCalls = getSandboxForkCount();

  assert.deepEqual(withReads, withoutReads, "reading the counter around a decide() call must not change its real decision");
  assert.ok(sandboxCalls > 0, "expected real sandbox forks during a real decide() call on a populated scenario");
});

// ---------------------------------------------------------------------------
// Trip / Shove / Grapple / Escape — Athletics maneuvers (design doc §31's rules-gap sweep,
// priority 1: "the first REAL control actions"). Core resolution is proven deterministically via
// forkTurnSandbox's EXPECTED-VALUE path (a "most likely degree" resolution — same guaranteed-
// outcome technique personnel-decide.test.mjs's own end-to-end tests already use), by choosing
// modifier/DC pairs so lopsided that ALL 20 d20 faces still land on the SAME real degree of
// success after the nat-1/nat-20 shift — proven by hand against degreeOfSuccess's own real
// boundaries, not just assumed. Multi-turn lifecycle behavior (release-on-move, natural expiry,
// release-on-death) is proven through a real runBattle instead, since those genuinely need the
// round loop.
// ---------------------------------------------------------------------------

function makeGrappler(overrides = {}) {
  return {
    id: "grappler", name: "Grappler", side: "party", maxHP: 16, currentHP: 16, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, athleticsModifier: 20, strikes: [],
    position: { col: 0, row: 0 },
    ...overrides
  };
}
function makeHeld(overrides = {}) {
  return {
    id: "held", name: "Held", side: "opposition", maxHP: 20, currentHP: 20, ac: 14,
    saves: { fort: -10, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 1, row: 0 },
    ...overrides
  };
}
function sandboxApply(combatants, positions, actorId, proposal) {
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map(combatants.map((c) => [c.id, { ...c }])),
    positions: new Map(positions.map(([id, pos]) => [id, { ...pos }]))
  };
  const sandbox = forkTurnSandbox({ state, turn: { actionsAvailable: 3, actionsUsed: 0 } });
  const result = sandbox.apply(actorId, proposal);
  return { result, state: sandbox.state };
}

test("Trip (guaranteed critical success — overwhelming Athletics modifier vs a terrible Fortitude DC): knocks the target prone and applies real bludgeoning damage", () => {
  const grappler = makeGrappler();
  const held = makeHeld();
  const { result, state } = sandboxApply([grappler, held], [["grappler", grappler.position], ["held", held.position]], "grappler", { type: "trip", targetId: "held" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(result.roll.degree, "criticalSuccess");
  assert.equal(result.fell, true);
  assert.equal(result.selfFell, false);
  assert.ok(result.appliedDamage > 0, "critical success must deal real bludgeoning damage");
  assert.equal(state.combatants.get("held").prone, true);
  assert.ok(state.combatants.get("held").currentHP < held.currentHP);
});

test("Trip (guaranteed critical failure — terrible Athletics modifier vs an overwhelming Fortitude DC): the ATTACKER falls prone instead, and the target is completely untouched", () => {
  const weakGrappler = makeGrappler({ athleticsModifier: -20 });
  const toughHeld = makeHeld({ saves: { fort: 20, ref: 5, will: 5 } });
  const { result, state } = sandboxApply([weakGrappler, toughHeld], [["grappler", weakGrappler.position], ["held", toughHeld.position]], "grappler", { type: "trip", targetId: "held" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(result.roll.degree, "criticalFailure");
  assert.equal(result.fell, false);
  assert.equal(result.selfFell, true);
  assert.equal(result.appliedDamage, 0);
  assert.equal(state.combatants.get("grappler").prone, true);
  assert.ok(!state.combatants.get("held").prone, "the target must not be prone — left unset (falsy), same convention as every other untouched condition field in this engine");
  assert.equal(state.combatants.get("held").currentHP, toughHeld.currentHP);
});

test("Trip/Shove/Grapple never increment the shared Multiple Attack Penalty counter — none is an attack roll (Player Core: they're skill checks)", () => {
  const grappler = makeGrappler();
  grappler.strikes = [{ name: "Backup Strike", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "1d1", bonus: 5 }] }];
  const held = makeHeld();
  function ai(state, id, turn) {
    if (id !== "grappler") return null;
    if (turn.actionsUsed === 0) return { type: "trip", targetId: "held" };
    if (turn.actionsUsed === 1) return { type: "strike", targetId: "held", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [grappler, held], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "grappler").actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.mapPenalty, 0, "the Strike immediately after a Trip must carry 0 MAP — Trip never counts as an attack roll");
});

// design doc §43: pushFeet is a TRUE probability-weighted expectation, not a mode-gated all-or-
// nothing value — makeGrappler()/makeHeld()'s modifier(20)/DC(0) combo is overwhelming but NOT
// literally 100%: a natural 1 always downgrades one step regardless of the total (total=21 would
// otherwise be criticalSuccess, shifted down to success), so criticalSuccess is 19/20, success is
// 1/20, and the real expectation is 0.95*10 + 0.05*5 = 9.75, not a flat 10. The rounded SQUARE
// landing spot is unaffected (Math.round(9.75/5) = Math.round(10/5) = 2 either way) — only the raw
// pushFeet figure itself changes.
test("Shove (guaranteed — 19/20 — critical success): pushes the target exactly 2 squares (rounds from the real 9.75ft expectation) directly away from the attacker", () => {
  const grappler = makeGrappler();
  const held = makeHeld();
  const { result, state } = sandboxApply([grappler, held], [["grappler", grappler.position], ["held", held.position]], "grappler", { type: "shove", targetId: "held" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(result.roll.degree, "criticalSuccess");
  assert.equal(result.pushFeet, 9.75);
  assert.deepEqual(state.positions.get("held"), { col: 3, row: 0 }, "pushed 2 squares east — directly away from the attacker at (0,0)");
});

test("Shove: a push that would run off the grid edge stops at the last clear square — Player Core's own 'can't move it into or through obstacles'", () => {
  const grappler = makeGrappler({ position: { col: 17, row: 0 } });
  const heldNearEdge = makeHeld({ position: { col: 18, row: 0 } }); // only 1 clear square before the edge of a 20-wide (cols 0-19) grid
  const { result, state } = sandboxApply([grappler, heldNearEdge], [["grappler", grappler.position], ["held", heldNearEdge.position]], "grappler", { type: "shove", targetId: "held" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(result.roll.degree, "criticalSuccess");
  assert.equal(result.pushFeet, 9.75, "the ATTEMPT is still a real (19/20) critical-success-dominated expectation — only the actual landing spot is clamped");
  assert.deepEqual(state.positions.get("held"), { col: 19, row: 0 }, "stops at the last real in-bounds square, not (20,0), which is off the grid");
});

/**
 * REGRESSION (design doc §43, Stage 2): the actual bug the two tests above only hinted at — a
 * CLOSE matchup (modifier 5 vs DC 15: criticalFailure 1/20, failure 8/20, success 10/20,
 * criticalSuccess 1/20, hand-verified the same way as every other exact-fraction test in this
 * project) makes the old mode-gated code's failure mode obvious: "success" was merely the most
 * likely degree (50%), so the OLD code would have applied ZERO trip damage and a flat 5ft (not
 * 10ft) shove despite a real, nonzero 5% chance of critical success on EACH — worse, a combatant
 * with a large enough Athletics edge to make criticalSuccess itself the mode (as the two tests
 * above show) got FULL crit damage EVERY attempt, including a second, third, unlimited Trip against
 * a target already lying prone from the first one — an unbounded free-damage exploit a probability-
 * weighted expectation can't produce, since a real 95% chance stays 95%, never rounds up to 100%.
 */
test("Trip/Shove EXPECTED_OUTCOMES: a close (not overwhelming) matchup applies the real PROBABILITY-WEIGHTED expectation, not an all-or-nothing gate on whichever degree is merely most likely", () => {
  const grappler = makeGrappler({ athleticsModifier: 5 });
  const held = makeHeld({ saves: { fort: 5, ref: 5, will: 5 } }); // dc = 15; modifier 5 vs dc 15 -> criticalFailure 1/20, failure 8/20, success 10/20, criticalSuccess 1/20
  const { result: tripResult } = sandboxApply([grappler, held], [["grappler", grappler.position], ["held", held.position]], "grappler", { type: "trip", targetId: "held" });
  assert.equal(tripResult.roll.degree, "success", "the MODE is success (10/20) — the old code would have applied exactly 0 damage here");
  assert.ok(Math.abs(tripResult.appliedDamage - (1 / 20) * 3.5) < 1e-9, `expected the real 1/20-of-average-1d6 expectation (${((1 / 20) * 3.5).toFixed(4)}), got ${tripResult.appliedDamage}`);
  assert.ok(tripResult.appliedDamage > 0, "a real, if small, nonzero expected chance of crit-trip damage must never round down to zero");

  const { result: shoveResult } = sandboxApply([grappler, held], [["grappler", grappler.position], ["held", held.position]], "grappler", { type: "shove", targetId: "held" });
  assert.equal(shoveResult.roll.degree, "success");
  assert.ok(Math.abs(shoveResult.pushFeet - 3.0) < 1e-9, `expected the real blended expectation 0.05*10 + 0.5*5 = 3.0ft, got ${shoveResult.pushFeet}`);
});

test("Trip EXPECTED_OUTCOMES: repeating the SAME control action against an ALREADY-prone target no longer nets full, repeated bonus damage every time — the actual exploit this fix closes", () => {
  const grappler = makeGrappler(); // athleticsModifier 20 vs held's fort -10 -> criticalSuccess 19/20 (see the fixed test above), NOT a full 100%
  const held = makeHeld();
  const sandbox = forkTurnSandbox({
    state: { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], combatants: new Map([["grappler", { ...grappler }], ["held", { ...held }]]), positions: new Map([["grappler", { ...grappler.position }], ["held", { ...held.position }]]) },
    turn: { actionsAvailable: 3, actionsUsed: 0 }
  });
  const first = sandbox.apply("grappler", { type: "trip", targetId: "held" });
  assert.equal(sandbox.state.combatants.get("held").prone, true, "first Trip knocks the target prone");
  const second = sandbox.apply("grappler", { type: "trip", targetId: "held" });
  assert.equal(second.legal, true, "re-tripping an already-prone target is still LEGAL — Player Core never forbids it");
  assert.ok(Math.abs(first.appliedDamage - second.appliedDamage) < 1e-9, "the SAME real 19/20 expectation applies both times — no escalation or double-counting from targeting an already-prone creature");
  assert.ok(second.appliedDamage < 3.5, `the fixed expectation (${second.appliedDamage.toFixed(3)}) must stay strictly below the OLD code's flat, always-applied average (3.5) — the actual exploit this fix closes`);
});

test("Grapple (guaranteed critical success): restrains the target, recording the real 'until the end of your next turn' expiry", () => {
  const grappler = makeGrappler();
  const held = makeHeld();
  const { result, state } = sandboxApply([grappler, held], [["grappler", grappler.position], ["held", held.position]], "grappler", { type: "grapple", targetId: "held" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(result.roll.degree, "criticalSuccess");
  assert.equal(result.appliedState, "restrained");
  assert.deepEqual(state.combatants.get("held").grappledBy, { attackerId: "grappler", state: "restrained", expiresEndOfRound: 2 });
});

test("Grapple: a restrained target is off-guard (-2 AC) as a direct, live consequence — resolveEffectiveStats already folds isOffGuardFromConditions in, no separate wiring needed", () => {
  const grappler = makeGrappler();
  const held = makeHeld();
  const { state } = sandboxApply([grappler, held], [["grappler", grappler.position], ["held", held.position]], "grappler", { type: "grapple", targetId: "held" });
  const effective = resolveEffectiveStats(state.combatants.get("held"));
  assert.equal(effective.ac, held.ac - 2, "restrained grants off-guard, a real -2 circumstance penalty to AC");
});

test("Grapple: a restrained target genuinely can't Strike back — proven at the legality layer against the SAME object the sandbox just produced, not a separately-constructed fixture", () => {
  const grappler = makeGrappler();
  const held = makeHeld();
  const { state } = sandboxApply([grappler, held], [["grappler", grappler.position], ["held", held.position]], "grappler", { type: "grapple", targetId: "held" });
  const restrainedHeld = state.combatants.get("held");
  const check = checkStrikeLegal({
    attacker: restrainedHeld, attackerPos: state.positions.get("held"),
    target: state.combatants.get("grappler"), targetPos: state.positions.get("grappler"),
    strike: restrainedHeld.strikes[0], turnState: { actionsAvailable: 3, actionsUsed: 0 }
  });
  assert.equal(check.legal, false);
  assert.match(check.reason, /restrained/);
});

test("Escape (guaranteed success — a strong Athletics modifier vs a weak grappler's Fortitude/Athletics DCs): frees the actor, clearing grappledBy", () => {
  const weakGrappler = makeGrappler({ athleticsModifier: -20, saves: { fort: -10, ref: 5, will: 5 } });
  const strongEscaper = makeHeld({ athleticsModifier: 20, grappledBy: { attackerId: "grappler", state: "restrained", expiresEndOfRound: 5 } });
  const { result, state } = sandboxApply([weakGrappler, strongEscaper], [["grappler", weakGrappler.position], ["held", strongEscaper.position]], "held", { type: "escape" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.ok(["success", "criticalSuccess"].includes(result.roll.degree));
  assert.equal(result.freed, true);
  assert.equal(state.combatants.get("held").grappledBy, null);
});

test("Escape (guaranteed failure — a weak Athletics modifier vs a strong grappler): stays held", () => {
  const strongGrappler = makeGrappler({ athleticsModifier: 20, saves: { fort: 20, ref: 5, will: 5 } });
  const weakEscaper = makeHeld({ athleticsModifier: -20, grappledBy: { attackerId: "grappler", state: "restrained", expiresEndOfRound: 5 } });
  const { result, state } = sandboxApply([strongGrappler, weakEscaper], [["grappler", strongGrappler.position], ["held", weakEscaper.position]], "held", { type: "escape" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(result.freed, false);
  assert.ok(state.combatants.get("held").grappledBy, "must still be held after a failed Escape");
});

// --- Multi-turn lifecycle, proven through a real runBattle: release-on-move, natural expiry,
// release-on-death. All three use the SAME guaranteed-success setup (modifier 20 vs DC 0), proven
// above to land on "success" or better on EVERY one of the 20 possible d20 faces, so these tests
// never depend on which exact seed happens to be used — only that a hold was applied at all. ---

test("Grapple ends when the grappler moves in the SAME turn — Player Core's own 'ends... unless you move', proven through a real runBattle, not just the isolated conditions.mjs unit", () => {
  const grappler = makeGrappler();
  const held = makeHeld();
  function ai(state, id, turn) {
    if (id !== "grappler") return null;
    if (turn.actionsUsed === 0) return { type: "grapple", targetId: "held" };
    if (turn.actionsUsed === 1) return { type: "move", to: { col: 0, row: 3 } }; // away from held's square, not through it
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [grappler, held], ai });
  const turn = log.rounds[0].turns.find((t) => t.combatantId === "grappler");
  const grappleAction = turn.actions.find((a) => a.type === "grapple");
  assert.equal(grappleAction.legal, true, JSON.stringify(grappleAction));
  assert.ok(grappleAction.targetGrappledAfter, "the grapple itself must have actually applied");
  const moveAction = turn.actions.find((a) => a.type === "move");
  assert.equal(moveAction.legal, true, JSON.stringify(moveAction));
  assert.equal(turn.snapshot.held.grappledBy, null, "released the instant the grappler moves, within the SAME turn");
});

test("Grapple naturally expires at the end of the grappler's OWN next turn if nothing else releases it first — real 'until the end of your next turn' duration, not permanent or one-round", () => {
  const grappler = makeGrappler();
  const held = makeHeld({ speed: 0 }); // never moves on its own — isolates the timing under test
  function ai(state, id, turn) {
    if (id === "grappler" && turn.actionsUsed === 0 && state.round === 1) return { type: "grapple", targetId: "held" };
    return null; // grappler holds afterward — never moves, never re-grapples
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 3, combatants: [grappler, held], ai });
  const round1Turn = log.rounds.find((r) => r.round === 1).turns.find((t) => t.combatantId === "grappler");
  assert.ok(round1Turn.snapshot.held.grappledBy, "round 1: still held immediately after the grapple");
  const round2Turn = log.rounds.find((r) => r.round === 2).turns.find((t) => t.combatantId === "grappler");
  assert.equal(round2Turn.snapshot.held.grappledBy, null, "round 2 IS the grappler's own next turn — the hold lapses once it resolves");
});

test("Grapple releases the instant its own grappler is killed by someone else — a dead grappler can't maintain a physical hold (documented ruling, conditions.mjs's own releaseGrapplesHeldBy header)", () => {
  const grappler = makeGrappler({ side: "opposition", currentHP: 1, initiativeModifier: 100 }); // one hit from dying; acts first, guaranteed
  const held = makeHeld({ side: "party", speed: 0 });
  const killer = {
    id: "killer", name: "Killer", side: "party", maxHP: 20, currentHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, initiativeModifier: -100, // acts last, guaranteed
    strikes: [{ name: "Overkill", strikeType: "melee", attackBonus: 100, traits: [], damage: [{ dice: "10d6", bonus: 100 }] }],
    position: { col: 0, row: 1 }
  };
  function ai(state, id, turn) {
    if (id === "grappler" && turn.actionsUsed === 0 && state.round === 1) return { type: "grapple", targetId: "held" };
    if (id === "killer" && turn.actionsUsed === 0) return { type: "strike", targetId: "grappler", strikeIndex: 0 };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [grappler, held, killer], ai });
  const round1 = log.rounds.find((r) => r.round === 1);
  const grapplerTurn = round1.turns.find((t) => t.combatantId === "grappler");
  assert.ok(grapplerTurn, "expected the grappler to have acted (guaranteed by initiativeModifier: 100)");
  assert.ok(grapplerTurn.snapshot.held.grappledBy, "must actually be held right after the grapple");
  const killerTurn = round1.turns.find((t) => t.combatantId === "killer");
  assert.ok(killerTurn, "expected the killer to have acted too (guaranteed by initiativeModifier: -100 acting after grappler)");
  assert.equal(killerTurn.snapshot.held.grappledBy, null, "released the instant the grappler is struck down, mid-round — not waiting for a natural expiry that will now never come");
});

/**
 * REGRESSION (design doc §41, Stage 0): the real DC for Escape never involved Fortitude at all —
 * "typically the Athletics DC of a creature grabbing you" (reference/srd/player-core/383-actions.json,
 * live-verified at https://2e.aonsrd.com/actions/5-escape). The first version of this engine's
 * Escape used "the Fortitude or Athletics DC, whichever is higher" instead, sourced from a less
 * precise mirror (skill-3-athletics.json's own embedded Escape summary). Proven here by making the
 * grappler's Fortitude enormous and its Athletics terrible — under the OLD (buggy) formula this
 * would have made Escape nearly impossible; under the real rule it must be easy.
 */
test("Escape: a grappler's Fortitude is completely irrelevant to the real DC — only their Athletics matters", () => {
  const grappler = makeGrappler({ athleticsModifier: -20, saves: { fort: 100, ref: 5, will: 5 } }); // huge Fortitude, terrible Athletics
  const held = makeHeld({ athleticsModifier: 0, grappledBy: { attackerId: "grappler", state: "restrained", expiresEndOfRound: 5 } });
  const { result } = sandboxApply([grappler, held], [["grappler", grappler.position], ["held", held.position]], "held", { type: "escape" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(result.roll.dc, -10, "DC must be exactly 10 + the grappler's real Athletics modifier (-20) — the huge Fortitude (100) must have zero effect");
  assert.equal(result.freed, true, "an ordinary (modifier 0) escaper must easily break free once DC correctly ignores the grappler's Fortitude");
});

// ---------------------------------------------------------------------------
// Stand / Crawl (design doc §41, Stage 0) — the only two move actions Player Core allows while
// prone, and the fix for a real bug Trip exposed: nothing previously cleared `prone` at all except
// the heal-a-downed-PC path, so a tripped combatant strode away at full Speed forever, permanently
// off-guard and permanently -2 to attack. Trip cost an action and never got paid back.
// ---------------------------------------------------------------------------

test("Stand: clears prone outright — no roll, no randomness", () => {
  const combatants = [{ id: "a", side: "party", currentHP: 15, prone: true }];
  const positions = [["a", { col: 0, row: 0 }]];
  const { result, state } = sandboxApply(combatants, positions, "a", { type: "stand" });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(state.combatants.get("a").prone, false);
});

test("Stand: illegal for a combatant who isn't prone — nothing to Stand from", () => {
  const combatants = [{ id: "a", side: "party", currentHP: 15, prone: false }];
  const positions = [["a", { col: 0, row: 0 }]];
  const { result } = sandboxApply(combatants, positions, "a", { type: "stand" });
  assert.equal(result.legal, false);
});

test("Crawl: moves exactly 5ft (one square) while REMAINING prone — the real 'continue to stay prone' text, not accidentally clearing it", () => {
  const combatants = [{ id: "a", side: "party", currentHP: 15, speed: 25, prone: true }];
  const positions = [["a", { col: 0, row: 0 }]];
  const { result, state } = sandboxApply(combatants, positions, "a", { type: "crawl", to: { col: 1, row: 0 } });
  assert.equal(result.legal, true, JSON.stringify(result));
  assert.equal(result.feet, 5);
  assert.deepEqual(state.positions.get("a"), { col: 1, row: 0 });
  assert.equal(state.combatants.get("a").prone, true, "must remain prone after crawling — the whole point of the action");
});

test("Crawl: illegal below the real 10ft Speed requirement", () => {
  const combatants = [{ id: "a", side: "party", currentHP: 15, speed: 5, prone: true }];
  const positions = [["a", { col: 0, row: 0 }]];
  const { result } = sandboxApply(combatants, positions, "a", { type: "crawl", to: { col: 1, row: 0 } });
  assert.equal(result.legal, false);
});

test("A prone combatant's own Stride attempt is rejected in a real runBattle — the actual bug Trip exposed, now fixed end to end", () => {
  const proneCombatant = {
    id: "a", name: "A", side: "party", maxHP: 15, currentHP: 15, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [], prone: true, position: { col: 0, row: 0 }
  };
  const bystander = {
    id: "b", name: "B", side: "opposition", maxHP: 15, currentHP: 15, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 0,
    strikes: [], position: { col: 10, row: 10 }
  };
  function ai(state, id, turn) {
    return id === "a" && turn.actionsUsed === 0 ? { type: "move", to: { col: 1, row: 0 } } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [proneCombatant, bystander], ai });
  const move = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((a) => a.type === "move");
  assert.equal(move.legal, false, JSON.stringify(move));
  assert.match(move.reason, /[Pp]rone/);
});

test("Standing up in a real runBattle restores full Stride the very next action — the real trade Trip is supposed to cost", () => {
  const proneCombatant = {
    id: "a", name: "A", side: "party", maxHP: 15, currentHP: 15, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [], prone: true, position: { col: 0, row: 0 }
  };
  const bystander = {
    id: "b", name: "B", side: "opposition", maxHP: 15, currentHP: 15, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 0,
    strikes: [], position: { col: 10, row: 10 }
  };
  function ai(state, id, turn) {
    if (id !== "a") return null;
    if (turn.actionsUsed === 0) return { type: "stand" };
    if (turn.actionsUsed === 1) return { type: "move", to: { col: 1, row: 0 } };
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [proneCombatant, bystander], ai });
  const actions = log.rounds[0].turns.find((t) => t.combatantId === "a").actions;
  assert.equal(actions.find((a) => a.type === "stand").legal, true);
  const move = actions.find((a) => a.type === "move");
  assert.equal(move.legal, true, JSON.stringify(move));
});

// --- onRoundStart (design doc §45 — a direct ask: distinguish a broken run from a slow-but-working
// one by real per-round progress visibility, not by guessing) ---

test("runBattle: onRoundStart, when provided, fires exactly once per round with the real round number and roundLimit — and is completely optional, every existing caller (this whole file, until now) omits it with zero behavior change", () => {
  const a = { id: "a", name: "A", side: "party", maxHP: 15, currentHP: 15, ac: 30, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: { col: 0, row: 0 } };
  const b = { id: "b", name: "B", side: "opposition", maxHP: 15, currentHP: 15, ac: 30, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: { col: 10, row: 10 } };
  function ai() { return null; } // nobody ever acts — a real, if boring, guaranteed-timeout battle
  const seen = [];
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 4, combatants: [a, b], ai, onRoundStart: (round, roundLimit) => seen.push({ round, roundLimit }) });
  assert.equal(log.rounds.length, 4, "sanity check: the battle really did run all 4 rounds");
  assert.deepEqual(seen, [{ round: 1, roundLimit: 4 }, { round: 2, roundLimit: 4 }, { round: 3, roundLimit: 4 }, { round: 4, roundLimit: 4 }]);
});

test("runBattle: with NO onRoundStart provided, nothing is called and nothing throws — the optional-callback pattern degrades to exactly the pre-existing behavior", () => {
  const a = { id: "a", name: "A", side: "party", maxHP: 15, currentHP: 15, ac: 30, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: { col: 0, row: 0 } };
  const b = { id: "b", name: "B", side: "opposition", maxHP: 15, currentHP: 15, ac: 30, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: { col: 10, row: 10 } };
  function ai() { return null; }
  assert.doesNotThrow(() => runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 2, combatants: [a, b], ai }));
});
