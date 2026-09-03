/**
 * Tests for personnel-engine/search/tree-shared.mjs's own optional `conditions` parameter (design doc
 * §73, GH issue #20 — the first slice of porting the MCTS search family to Frame scale). The existing
 * `tree-shared.test.mjs` already proves the OMITTED-conditions path (every existing caller) stays
 * byte-for-byte the real personnel behavior; this file covers the NEW behavior specifically:
 * (1) a Frame-style conditions bundle correctly skips a dead Frame combatant, using Frame's own real
 *     "no dying-rules concept, just currentHP<=0" shape, not personnel's;
 * (2) a Frame combatant with `stunnedRounds > 0` is skipped for its WHOLE turn with the counter
 *     correctly decremented by exactly 1, continuing the search to the real next actor — a real,
 *     deterministic continuation (no dice involved), not a crash and not a horizon/leaf sentinel;
 * (3) `stunnedRounds` handling is harmlessly inert on a personnel combatant (which never sets this
 *     field), even on the OMITTED-conditions default path — a real, direct check that the new,
 *     unconditional guard didn't quietly change existing personnel-scale behavior.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { advanceToNextActor } from "../../tools/battle-simulator/personnel-engine/search/tree-shared.mjs";

function makeFrameConditions() {
  return {
    isDead: (c) => c.currentHP <= 0,
    isUnconscious: () => false,
    resolveEffectiveStats: (c) => ({ actionsAvailable: 3, disabled: c.currentHP <= 0 })
  };
}

test("advanceToNextActor: a Frame-style conditions bundle correctly skips a dead Frame combatant (currentHP<=0) — no personnel-specific dying-rules concept involved", () => {
  const state = {
    round: 1,
    combatants: new Map([
      ["deadFrame", { id: "deadFrame", side: "opposition", currentHP: 0 }],
      ["aliveFrame", { id: "aliveFrame", side: "party", currentHP: 100 }]
    ])
  };
  const actor = advanceToNextActor(state, ["deadFrame", "aliveFrame"], -1, 1, makeFrameConditions());
  assert.equal(actor.actingId, "aliveFrame", "expected the dead Frame combatant to be skipped");
});

test("advanceToNextActor: a Frame combatant with stunnedRounds > 0 is skipped for its whole turn, with the real counter decremented by exactly 1 — a real, deterministic continuation, not a crash and not a leaf sentinel", () => {
  const stunned = { id: "stunned", side: "opposition", currentHP: 100, stunnedRounds: 2 };
  const other = { id: "other", side: "party", currentHP: 100 };
  const state = { round: 1, combatants: new Map([["stunned", stunned], ["other", other]]) };
  const actor = advanceToNextActor(state, ["stunned", "other"], -1, 1, makeFrameConditions());
  assert.equal(actor.actingId, "other", "expected the stunned combatant's whole turn to be skipped entirely");
  assert.equal(stunned.stunnedRounds, 1, "expected the real counter to be decremented by exactly 1, not reset or left unchanged");
});

test("advanceToNextActor: stunnedRounds skip-and-decrement correctly re-wraps and finds the SAME stunned combatant again next round once its counter reaches 0 (real, multi-round continuation)", () => {
  const stunned = { id: "stunned", side: "opposition", currentHP: 100, stunnedRounds: 1 };
  const state = { round: 1, combatants: new Map([["stunned", stunned]]) };
  const actor = advanceToNextActor(state, ["stunned"], -1, 1, makeFrameConditions());
  assert.equal(actor.actingId, "stunned", "expected the combatant to finally get a real turn once its own stun expires");
  assert.equal(stunned.stunnedRounds, 0);
  assert.equal(actor.round, 2, "expected the real round counter to have advanced while wrapping past the stunned turn");
});

test("advanceToNextActor: stunnedRounds is harmlessly inert for a personnel combatant on the OMITTED-conditions (real, default personnel) path, which never sets this field at all", () => {
  const me = { id: "me", name: "Me", side: "party", currentHP: 20, ac: 17, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const state = { round: 1, combatants: new Map([["me", me]]) };
  const actor = advanceToNextActor(state, ["me"], -1, 1); // conditions omitted -- real personnel default
  assert.equal(actor.actingId, "me", "expected a real personnel combatant with no stunnedRounds field to get a normal turn, unaffected by the new check");
});
