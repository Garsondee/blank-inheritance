import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSteps } from "../../tools/battle-simulator/artifact/steps.mjs";

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
