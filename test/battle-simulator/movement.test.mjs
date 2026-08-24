/**
 * Direct tests for artifact/movement.mjs (design doc §26 — Ingram's own report: "tokens push
 * straight through walls... special attention to moving accurately through doorways and around
 * building corners"). The engine always validated a real wall-avoiding path when one existed
 * (checkMoveLegality's own `path` param) — these functions are what makes the artifact viewer
 * actually SHOW that real path instead of a straight line between endpoints.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { actionLegs, combatantWaypoints, groupTurnActions } from "../../tools/battle-simulator/artifact/movement.mjs";

// --- actionLegs ---

test("actionLegs: no path logged -> falls back to just the endpoint (the old, still-correct behavior for a genuinely straight move)", () => {
  const action = { type: "move", to: { col: 5, row: 5 } };
  assert.deepEqual(actionLegs(action), [{ col: 5, row: 5 }]);
});

test("actionLegs: a degenerate 1-point path (no real route data) also falls back to the endpoint", () => {
  const action = { type: "move", to: { col: 5, row: 5 }, path: [{ col: 5, row: 5 }] };
  assert.deepEqual(actionLegs(action), [{ col: 5, row: 5 }]);
});

test("actionLegs: a real bent path returns every point AFTER the origin — the origin itself is not a leg", () => {
  const action = {
    type: "move", to: { col: 7, row: 5 },
    path: [{ col: 4, row: 5 }, { col: 5, row: 5 }, { col: 5, row: 4 }, { col: 6, row: 4 }, { col: 7, row: 5 }]
  };
  assert.deepEqual(actionLegs(action), [{ col: 5, row: 5 }, { col: 5, row: 4 }, { col: 6, row: 4 }, { col: 7, row: 5 }]);
});

test("actionLegs: null path (explicitly logged, e.g. a wall-less scenario's straight-line fallback) falls back to the endpoint", () => {
  const action = { type: "move", to: { col: 3, row: 3 }, path: null };
  assert.deepEqual(actionLegs(action), [{ col: 3, row: 3 }]);
});

// --- combatantWaypoints ---

function makeSteps(overrides = {}) {
  return [
    { kind: "deployment", round: 0, snapshot: { a: { position: { col: 0, row: 0 } } } },
    { kind: "turn", combatantId: "a", actions: [{ type: "move", to: { col: 2, row: 0 } }], snapshot: { a: { position: { col: 2, row: 0 } } } },
    ...(overrides.extra || [])
  ];
}

test("combatantWaypoints: returns null for a non-turn step (deployment/outcome)", () => {
  const steps = makeSteps();
  assert.equal(combatantWaypoints(steps, 0), null);
});

test("combatantWaypoints: returns null when there's no prior step to anchor a starting position to", () => {
  const steps = [{ kind: "turn", combatantId: "a", actions: [] }];
  assert.equal(combatantWaypoints(steps, 0), null);
});

test("combatantWaypoints: a single straight move with no logged path -> two positions, one leg, full weight", () => {
  const steps = makeSteps();
  const result = combatantWaypoints(steps, 1);
  assert.deepEqual(result.positions, [{ col: 0, row: 0 }, { col: 2, row: 0 }]);
  assert.deepEqual(result.legWeights, [1]);
});

test("combatantWaypoints: a real bent move -> every real waypoint appears, each leg weighted 1/legCount so the whole action keeps one fixed total beat", () => {
  const steps = [
    { kind: "deployment", round: 0, snapshot: { a: { position: { col: 0, row: 0 } } } },
    {
      kind: "turn", combatantId: "a",
      actions: [{
        type: "move", to: { col: 3, row: 2 },
        path: [{ col: 0, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 2 }]
      }],
      snapshot: {}
    }
  ];
  const result = combatantWaypoints(steps, 1);
  assert.deepEqual(result.positions, [{ col: 0, row: 0 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 3, row: 2 }]);
  assert.deepEqual(result.legWeights, [1 / 3, 1 / 3, 1 / 3], "3 real legs from ONE action, each getting a third of that action's own total beat");
});

test("combatantWaypoints: two separate move-type actions in one turn contribute their own legs independently, back to back", () => {
  const steps = [
    { kind: "deployment", round: 0, snapshot: { a: { position: { col: 0, row: 0 } } } },
    {
      kind: "turn", combatantId: "a",
      actions: [
        { type: "move", to: { col: 1, row: 0 } }, // 1 leg, straight
        { type: "move", to: { col: 3, row: 2 }, path: [{ col: 1, row: 0 }, { col: 2, row: 1 }, { col: 3, row: 2 }] } // 2 real legs
      ],
      snapshot: {}
    }
  ];
  const result = combatantWaypoints(steps, 1);
  assert.deepEqual(result.positions, [{ col: 0, row: 0 }, { col: 1, row: 0 }, { col: 2, row: 1 }, { col: 3, row: 2 }]);
  assert.deepEqual(result.legWeights, [1, 1 / 2, 1 / 2]);
});

test("combatantWaypoints: step and advance action types are treated the same as move", () => {
  const steps = [
    { kind: "deployment", round: 0, snapshot: { a: { position: { col: 0, row: 0 } } } },
    { kind: "turn", combatantId: "a", actions: [{ type: "step", to: { col: 1, row: 0 } }], snapshot: {} }
  ];
  assert.deepEqual(combatantWaypoints(steps, 1).positions, [{ col: 0, row: 0 }, { col: 1, row: 0 }]);

  const advanceSteps = [
    { kind: "deployment", round: 0, snapshot: { a: { position: { col: 0, row: 0 } } } },
    { kind: "turn", combatantId: "a", actions: [{ type: "advance", to: { col: 1, row: 0 } }], snapshot: {} }
  ];
  assert.deepEqual(combatantWaypoints(advanceSteps, 1).positions, [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
});

test("combatantWaypoints: a rejected (illegal) move contributes no waypoints — it never actually moved anything", () => {
  const steps = [
    { kind: "deployment", round: 0, snapshot: { a: { position: { col: 0, row: 0 } } } },
    { kind: "turn", combatantId: "a", actions: [{ type: "move", to: { col: 9, row: 9 }, legal: false }], snapshot: {} }
  ];
  const result = combatantWaypoints(steps, 1);
  assert.deepEqual(result.positions, [{ col: 0, row: 0 }]);
  assert.deepEqual(result.legWeights, []);
});

test("combatantWaypoints: a non-movement action (strike) contributes no waypoints", () => {
  const steps = [
    { kind: "deployment", round: 0, snapshot: { a: { position: { col: 0, row: 0 } } } },
    { kind: "turn", combatantId: "a", actions: [{ type: "strike", targetId: "b" }], snapshot: {} }
  ];
  const result = combatantWaypoints(steps, 1);
  assert.deepEqual(result.positions, [{ col: 0, row: 0 }]);
});

// --- groupTurnActions (design doc §37 — Ingram's own ask: "If all a character does is move
// multiple times we only need to include a single 'move' over all, that should speed things up a
// lot.") ---

test("groupTurnActions: three consecutive move actions merge into a single moveGroup with all legs concatenated in order", () => {
  const actions = [
    { type: "move", to: { col: 1, row: 0 } },
    { type: "move", to: { col: 2, row: 0 } },
    { type: "move", to: { col: 3, row: 0 } }
  ];
  const groups = groupTurnActions(actions);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, "moveGroup");
  assert.deepEqual(groups[0].legs, [{ col: 1, row: 0 }, { col: 2, row: 0 }, { col: 3, row: 0 }]);
  assert.deepEqual(groups[0].to, { col: 3, row: 0 });
  assert.equal(groups[0].actions.length, 3);
});

test("groupTurnActions: step and advance merge into the same run as move — all three are 'movement' for grouping purposes", () => {
  const actions = [
    { type: "step", to: { col: 1, row: 0 } },
    { type: "advance", to: { col: 2, row: 0 } },
    { type: "move", to: { col: 3, row: 0 } }
  ];
  const groups = groupTurnActions(actions);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, "moveGroup");
});

test("groupTurnActions: a non-move action breaks the run — move, strike, move produces three separate groups, not one merged glide", () => {
  const actions = [
    { type: "move", to: { col: 1, row: 0 } },
    { type: "strike", targetId: "b" },
    { type: "move", to: { col: 2, row: 0 } }
  ];
  const groups = groupTurnActions(actions);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].kind, "moveGroup");
  assert.equal(groups[1].kind, "single");
  assert.equal(groups[1].action.type, "strike");
  assert.equal(groups[2].kind, "moveGroup");
});

test("groupTurnActions: a rejected (illegal) move never joins a run — it passes through as its own single entry, even between two real moves", () => {
  const actions = [
    { type: "move", to: { col: 1, row: 0 } },
    { type: "move", to: { col: 9, row: 9 }, legal: false, reason: "out of range" },
    { type: "move", to: { col: 2, row: 0 } }
  ];
  const groups = groupTurnActions(actions);
  assert.equal(groups.length, 3);
  assert.equal(groups[0].kind, "moveGroup");
  assert.equal(groups[0].actions.length, 1);
  assert.equal(groups[1].kind, "single");
  assert.equal(groups[1].action.legal, false);
  assert.equal(groups[2].kind, "moveGroup");
});

test("groupTurnActions: a real bent path inside the merged run contributes every real waypoint, not just its endpoint", () => {
  const actions = [
    { type: "move", to: { col: 1, row: 0 } },
    { type: "move", to: { col: 3, row: 2 }, path: [{ col: 1, row: 0 }, { col: 2, row: 1 }, { col: 3, row: 2 }] }
  ];
  const groups = groupTurnActions(actions);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].legs, [{ col: 1, row: 0 }, { col: 2, row: 1 }, { col: 3, row: 2 }]);
});

test("groupTurnActions: an empty action list returns an empty group list", () => {
  assert.deepEqual(groupTurnActions([]), []);
});

test("groupTurnActions: a single non-move action passes through as its own group, unmerged", () => {
  const groups = groupTurnActions([{ type: "healAbility", targetId: "b" }]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].kind, "single");
});
