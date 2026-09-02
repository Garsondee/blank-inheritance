/**
 * Tests for personnel-engine/search/tree-shared.mjs (design doc §61/§62, GH issue #6 step 3 —
 * "forced nodes + team sign-flipping + initiative advancement. Test: the (round, actingId) sequence
 * matches runBattle on a fixed seed"). The forced-node MECHANICS themselves (Stunned/dead/unconscious
 * handling) are already directly tested in expectiminimax.test.mjs against hand-built states; this
 * file adds the one piece issue #21 itself calls out specifically: proof that `advanceToNextActor`/
 * `nextActorAfterAction` reproduce the REAL engine's own real turn-order sequence, not just a
 * plausible-looking one, across a real multi-round, multi-combatant battle.
 *
 * Move-only combatants (no strikes/spells/abilities at all) by deliberate construction: this means
 * `forkTurnSandbox`'s EXPECTED_OUTCOMES path and the real battle's own REAL_OUTCOMES path can never
 * diverge (nothing stochastic ever gets resolved — a pure move never rolls a die), so a hand-walked
 * sequence built entirely from Phase-A deterministic mechanics is directly, exactly comparable to a
 * real `runBattle` log, not merely "close."
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle, forkTurnSandbox } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { advanceToNextActor, nextActorAfterAction } from "../../tools/battle-simulator/personnel-engine/search/tree-shared.mjs";

function makeMoveOnlyCombatants() {
  return [
    { id: "a", name: "A", side: "party", maxHP: 20, currentHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 0, row: 0 } },
    // A real, partial Stunned value on one combatant — the one real forced-node case worth proving
    // against a LIVE battle: Stunned 1 loses exactly 1 of 3 actions (Player Core's own rule) and
    // STILL gets a real decision node with what's left, so both runBattle's own turns array and this
    // module's own advanceToNextActor must agree it belongs in the sequence.
    { id: "b", name: "B", side: "party", maxHP: 20, currentHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 0, row: 5 }, stunnedValue: 1 },
    { id: "c", name: "C", side: "opposition", maxHP: 20, currentHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 10, row: 0 } }
  ];
}

/** Hand-walks the real (round, actingId) sequence using ONLY this module's own real functions —
 * `advanceToNextActor` to bootstrap and cross turn boundaries, `decide()` (the same real policy
 * `runBattle`'s own `ai` callback below uses) to choose each real action, `forkTurnSandbox` to apply
 * it. Not a simulation of runBattle — an independent real walk built from the shared module alone. */
function walkSharedModuleSequence({ combatants, initiativeOrder, gridSize, seed, turnCount }) {
  let state = {
    round: 1, seed, gridSize, walls: [], initiativeOrder,
    combatants: new Map(combatants.map((c) => [c.id, structuredClone(c)])),
    positions: new Map(combatants.map((c) => [c.id, { ...c.position }]))
  };
  let actor = advanceToNextActor(state, initiativeOrder, -1, 1); // bootstrap: "before" the very first slot
  const sequence = [];
  for (let i = 0; i < turnCount; i++) {
    if (actor.stochasticGap || actor.noActor) break;
    sequence.push({ round: actor.round, actingId: actor.actingId });
    const proposal = decide(state, actor.actingId, actor.turn, { competence: 1 });
    let childState = state, childTurn = actor.turn;
    if (proposal) {
      const sandbox = forkTurnSandbox({ state, turn: actor.turn });
      const result = sandbox.apply(actor.actingId, proposal);
      assert.equal(result.legal, true, `test harness: decide() proposed an illegal action — ${JSON.stringify(proposal)}`);
      childState = sandbox.state;
      childTurn = sandbox.turn;
    } else {
      childTurn = { ...actor.turn, actionsUsed: actor.turn.actionsAvailable }; // nothing legal — force the turn to end
    }
    state = childState;
    actor = nextActorAfterAction({ childState, childTurn, actor, initiativeOrder });
  }
  return sequence;
}

/** Collapses consecutive repeats of the same (round, actingId) — `runBattle`'s own log records ONE
 * entry per WHOLE TURN (after every one of that combatant's real actions), while this module's own
 * decision nodes are per-ACTION ("nodes are action slots, not turns," design doc §61/#6's own words)
 * — so a combatant with 3 real actions produces 3 consecutive hand-walked entries for what `runBattle`
 * itself logs as a single turn. Comparing at the WHOLE-TURN granularity is the real, matching
 * comparison; deduping is not hiding a mismatch, it's aligning two genuinely different real units. */
function collapseConsecutive(sequence) {
  const collapsed = [];
  for (const entry of sequence) {
    const last = collapsed[collapsed.length - 1];
    if (!last || last.round !== entry.round || last.actingId !== entry.actingId) collapsed.push(entry);
  }
  return collapsed;
}

test("advanceToNextActor/nextActorAfterAction reproduce runBattle's own REAL (round, actingId) turn sequence exactly, including a real partial-Stunned combatant staying in sequence with reduced actions", () => {
  const combatants = makeMoveOnlyCombatants();
  const gridSize = { cols: 30, rows: 30 };
  const seed = 7;

  function ai(state, combatantId, turn) { return decide(state, combatantId, turn, { competence: 1 }); }
  const log = runBattle({ seed, gridSize, roundLimit: 3, combatants, ai, walls: [] });
  const realSequence = log.rounds.flatMap((round) => round.turns.map((t) => ({ round: round.round, actingId: t.combatantId })));
  assert.ok(realSequence.length >= 6, `expected a real, substantial sequence to compare against, got only ${realSequence.length} turns`);

  // Real over-provision (3 real actions per combatant) so the hand-walk's own per-ACTION decision
  // nodes cover at least as many WHOLE turns as runBattle's own per-TURN log does.
  const handWalked = collapseConsecutive(walkSharedModuleSequence({ combatants, initiativeOrder: log.initiativeOrder, gridSize, seed, turnCount: realSequence.length * 3 })).slice(0, realSequence.length);

  assert.deepEqual(handWalked, realSequence, `expected tree-shared.mjs's own advancement logic to reproduce runBattle's real turn sequence exactly (compared at whole-turn granularity).\nreal: ${JSON.stringify(realSequence)}\nhand-walked: ${JSON.stringify(handWalked)}`);
});

test("advanceToNextActor: the real bootstrap (fromIndex=-1) correctly applies the first actor's own Stunned reduction too, not just actors reached via a real advance", () => {
  const combatants = [
    { id: "stunnedFirst", name: "StunnedFirst", side: "party", maxHP: 20, currentHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 0, row: 0 }, stunnedValue: 2 },
    { id: "b", name: "B", side: "opposition", maxHP: 20, currentHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 5, row: 0 } }
  ];
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], initiativeOrder: ["stunnedFirst", "b"],
    combatants: new Map(combatants.map((c) => [c.id, { ...c }])),
    positions: new Map(combatants.map((c) => [c.id, { ...c.position }]))
  };
  const actor = advanceToNextActor(state, ["stunnedFirst", "b"], -1, 1);
  assert.equal(actor.actingId, "stunnedFirst");
  assert.equal(actor.turn.actionsAvailable, 1, "Stunned 2 must leave exactly 1 of 3 real actions, even for the very first actor in a search");
  assert.equal(state.combatants.get("stunnedFirst").stunnedValue, 0, "the real stunnedValue must be consumed by the bootstrap the same way a live advance would consume it");
});
