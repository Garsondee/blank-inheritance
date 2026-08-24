import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSteps, applyActionToSnapshot, isContactAction, findFirstContactStepIndex } from "../../tools/battle-simulator/artifact/steps.mjs";

function makeRun() {
  return {
    log: {
      deployment: { round: 0, snapshot: { a: { currentHP: 10 } } },
      rounds: [
        { round: 1, scriptedEvents: ["Field breaks!"], turns: [
          { combatantId: "a", stunned: false, actions: [{ type: "move" }], actionAccounting: { spent: 1 }, snapshot: { a: { currentHP: 10 } } },
          { combatantId: "b", stunned: true, stunnedActionsLost: 2, actions: [], snapshot: { a: { currentHP: 10 } } }
        ] },
        { round: 2, scriptedEvents: [], turns: [
          { combatantId: "a", stunned: false, actions: [{ type: "strike" }], snapshot: { a: { currentHP: 5 } } },
          { combatantId: "c", dying: true, recoveryCheck: { d20: 12, dc: 11, degree: "success", delta: -1, dyingValueAfter: 0, stabilized: true, died: false }, actions: [], snapshot: { c: { currentHP: 0, dyingValue: 0, unconscious: true } } }
        ] }
      ],
      outcome: { result: "party-victory", detail: "All opposition reduced to 0 HP." }
    }
  };
}

test("buildSteps: starts with a deployment step at round 0", () => {
  const steps = buildSteps(makeRun());
  assert.equal(steps[0].kind, "deployment");
  assert.equal(steps[0].round, 0);
  assert.deepEqual(steps[0].snapshot, { a: { currentHP: 10 } });
});

test("buildSteps: one step per turn, never per action", () => {
  const steps = buildSteps(makeRun());
  const turnSteps = steps.filter((s) => s.kind === "turn");
  assert.equal(turnSteps.length, 4, "2 turns in round 1 + 2 turns in round 2");
});

test("buildSteps: scriptedEvents attach only to the FIRST turn of a round, not every turn", () => {
  const steps = buildSteps(makeRun());
  const turnSteps = steps.filter((s) => s.kind === "turn" && s.round === 1);
  assert.deepEqual(turnSteps[0].scriptedEvents, ["Field breaks!"]);
  assert.deepEqual(turnSteps[1].scriptedEvents, []);
});

test("buildSteps: ends with an outcome step carrying the final snapshot", () => {
  const steps = buildSteps(makeRun());
  const last = steps[steps.length - 1];
  assert.equal(last.kind, "outcome");
  assert.equal(last.round, 2);
  assert.deepEqual(last.snapshot, { c: { currentHP: 0, dyingValue: 0, unconscious: true } });
  assert.equal(last.outcome.result, "party-victory");
});

test("buildSteps: a stunned turn is preserved as such, with no actions", () => {
  const steps = buildSteps(makeRun());
  const stunnedStep = steps.find((s) => s.kind === "turn" && s.combatantId === "b");
  assert.equal(stunnedStep.stunned, true);
  assert.deepEqual(stunnedStep.actions, []);
});

test("buildSteps: a stunned turn's real stunnedActionsLost count survives the flatten, not just the boolean", () => {
  const steps = buildSteps(makeRun());
  const stunnedStep = steps.find((s) => s.kind === "turn" && s.combatantId === "b");
  assert.equal(stunnedStep.stunnedActionsLost, 2);
});

test("buildSteps: a dying (recovery-check) turn is preserved with its real recoveryCheck data and zero actions", () => {
  const steps = buildSteps(makeRun());
  const dyingStep = steps.find((s) => s.kind === "turn" && s.combatantId === "c");
  assert.equal(dyingStep.dying, true);
  assert.deepEqual(dyingStep.actions, []);
  assert.deepEqual(dyingStep.recoveryCheck, { d20: 12, dc: 11, degree: "success", delta: -1, dyingValueAfter: 0, stabilized: true, died: false });
});

test("buildSteps: an ordinary turn (not dying) reports dying: false and recoveryCheck: null, not undefined", () => {
  const steps = buildSteps(makeRun());
  const ordinaryStep = steps.find((s) => s.kind === "turn" && s.combatantId === "a");
  assert.equal(ordinaryStep.dying, false);
  assert.equal(ordinaryStep.recoveryCheck, null);
});

test("buildSteps: tolerates a missing deployment snapshot rather than throwing", () => {
  const run = { log: { deployment: undefined, rounds: [], outcome: { result: "timeout", detail: "" } } };
  const steps = buildSteps(run);
  assert.deepEqual(steps[0].snapshot, {});
});

// design doc §30 — the "heal spammed on a full-health target" report: real, this fixes it.
test("applyActionToSnapshot: a strike updates only the target's HP, leaving everyone and everything else untouched", () => {
  const snapshot = { hero: { currentHP: 20, maxHP: 20 }, foe: { currentHP: 15, maxHP: 20, prone: false } };
  const next = applyActionToSnapshot(snapshot, { legal: true, targetId: "foe", targetHPAfter: 8 });
  assert.equal(next.foe.currentHP, 8);
  assert.equal(next.foe.maxHP, 20, "unrelated fields on the same combatant survive");
  assert.deepEqual(next.hero, snapshot.hero, "the non-target combatant is untouched");
});

test("applyActionToSnapshot: a knockout blow carries dyingValue/unconscious/dead through together, matching engine.mjs's real return shape", () => {
  const snapshot = { foe: { currentHP: 5, maxHP: 20, dyingValue: 0, unconscious: false, dead: false } };
  const next = applyActionToSnapshot(snapshot, {
    legal: true, targetId: "foe", targetHPAfter: 0,
    targetDyingValueAfter: 1, targetUnconsciousAfter: true, targetDeadAfter: false
  });
  assert.equal(next.foe.currentHP, 0);
  assert.equal(next.foe.dyingValue, 1);
  assert.equal(next.foe.unconscious, true);
  assert.equal(next.foe.dead, false);
});

test("applyActionToSnapshot: a heal that revives an unconscious target clears unconscious/dyingValue via the same fields, not a special case", () => {
  const snapshot = { foe: { currentHP: 0, maxHP: 20, dyingValue: 2, unconscious: true } };
  const next = applyActionToSnapshot(snapshot, {
    legal: true, targetId: "foe", targetHPAfter: 10,
    targetDyingValueAfter: 0, targetUnconsciousAfter: false
  });
  assert.equal(next.foe.currentHP, 10);
  assert.equal(next.foe.dyingValue, 0);
  assert.equal(next.foe.unconscious, false);
});

test("applyActionToSnapshot: an older log with only targetHPAfter (no condition-after fields yet) still updates HP and leaves conditions as they were", () => {
  const snapshot = { foe: { currentHP: 15, maxHP: 20, prone: true } };
  const next = applyActionToSnapshot(snapshot, { legal: true, targetId: "foe", targetHPAfter: 5 });
  assert.equal(next.foe.currentHP, 5);
  assert.equal(next.foe.prone, true, "no targetProneAfter on this action — untouched, not wiped to undefined");
});

test("applyActionToSnapshot: move/step/demoralize/a rejected proposal have no targetHPAfter — pass through unchanged (same object, no copy)", () => {
  const snapshot = { foe: { currentHP: 15, maxHP: 20 } };
  assert.equal(applyActionToSnapshot(snapshot, { type: "move", legal: true }), snapshot);
  assert.equal(applyActionToSnapshot(snapshot, { type: "demoralize", legal: true, targetId: "foe" }), snapshot);
  assert.equal(applyActionToSnapshot(snapshot, { type: "strike", legal: false, targetId: "foe", reason: "out of range" }), snapshot);
});

test("applyActionToSnapshot: an unknown targetId (shouldn't happen, but never throw) passes the snapshot through unchanged", () => {
  const snapshot = { foe: { currentHP: 15, maxHP: 20 } };
  assert.equal(applyActionToSnapshot(snapshot, { legal: true, targetId: "ghost", targetHPAfter: 3 }), snapshot);
});

test("isContactAction: strike/spellAttack/saveAttack/conditionSave/demoralize all count, healAbility and movement don't", () => {
  for (const type of ["strike", "spellAttack", "saveAttack", "conditionSave", "demoralize"]) {
    assert.equal(isContactAction({ type, legal: true }), true, `${type} should be contact`);
  }
  for (const type of ["healAbility", "move", "step", "advance", "none"]) {
    assert.equal(isContactAction({ type, legal: true }), false, `${type} should not be contact`);
  }
});

test("isContactAction: a rejected (illegal) proposal never counts as contact, even if its type would otherwise qualify", () => {
  assert.equal(isContactAction({ type: "strike", legal: false, reason: "out of range" }), false);
});

test("findFirstContactStepIndex: finds the first turn step containing a real, legal contact action", () => {
  const steps = [
    { kind: "deployment" },
    { kind: "turn", combatantId: "a", actions: [{ type: "move", legal: true }] },
    { kind: "turn", combatantId: "b", actions: [{ type: "strike", legal: false, reason: "no line of sight" }] },
    { kind: "turn", combatantId: "a", actions: [{ type: "move", legal: true }, { type: "strike", legal: true }] },
    { kind: "turn", combatantId: "b", actions: [{ type: "strike", legal: true }] }
  ];
  assert.equal(findFirstContactStepIndex(steps), 3, "index 3 is the first turn with a LEGAL contact action — the rejected strike at index 2 doesn't count");
});

test("findFirstContactStepIndex: -1 when the battle never makes contact (pure maneuvering, or everything held)", () => {
  const steps = [
    { kind: "deployment" },
    { kind: "turn", combatantId: "a", actions: [{ type: "move", legal: true }] },
    { kind: "turn", combatantId: "a", actions: [] },
    { kind: "outcome" }
  ];
  assert.equal(findFirstContactStepIndex(steps), -1);
});
