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
    assert.match(later.reason, /already tried/);
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
