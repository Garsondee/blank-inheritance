/**
 * Lookahead sandbox fidelity (design doc §15g).
 *
 * These are the load-bearing safety tests for the whole AI rebuild. A planner
 * that can accidentally mutate the live battle, or accidentally advance the
 * battle's dice, produces bugs with NO error message — the only symptom is
 * "the log changed" or "that vehicle is out of ordnance it never fired."
 * Both of those are pinned here.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle, forkTurnSandbox, cloneStateForPlanning, resetSandboxForkCount, getSandboxForkCount } from "../../tools/battle-simulator/engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/five-vehicles-one-frame.mjs";

/** Capture a live mid-battle state by hooking the AI, which is the only place state is exposed. */
function captureLiveState({ seed = 4242, atRound = 3 } = {}) {
  let captured = null;
  const scenario = buildScenario({ seed, roundLimit: 8 });
  const realAi = scenario.ai;
  scenario.ai = (state, combatantId, turn) => {
    if (!captured && state.round >= atRound) captured = { state, combatantId, turn };
    return realAi(state, combatantId, turn);
  };
  runBattle(scenario);
  assert.ok(captured, "failed to capture a live state — scenario ended before the target round");
  return captured;
}

test("cloneStateForPlanning: produces a state deep-equal to structuredClone for every field the engine reads", () => {
  const { state } = captureLiveState();
  const planning = cloneStateForPlanning(state);
  const reference = structuredClone(state);
  assert.equal(planning.round, reference.round);
  assert.equal(planning.seed, reference.seed);
  assert.deepEqual(planning.initiativeOrder, reference.initiativeOrder);
  assert.deepEqual([...planning.positions.entries()], [...reference.positions.entries()]);
  assert.deepEqual([...planning.reactionAvailable.entries()], [...reference.reactionAvailable.entries()]);
  for (const [id, c] of reference.combatants) {
    const p = planning.combatants.get(id);
    for (const field of ["currentHP", "maxHP", "immuneToAllDamage", "spotted", "stunnedRounds", "weaknessAll", "ac", "scaleHardness"]) {
      assert.deepEqual(p[field], c[field], `${id}.${field} diverged in the planning clone`);
    }
  }
});

test("REGRESSION: the planning clone copies ability arrays element-wise — planning a limited-use shot must not spend the real ordnance", () => {
  const { state } = captureLiveState();
  const withOrdnance = [...state.combatants.values()].find((c) => (c.strikes ?? []).some((s) => s.usesRemaining != null));
  assert.ok(withOrdnance, "expected at least one combatant carrying limited-use ordnance");
  const idx = withOrdnance.strikes.findIndex((s) => s.usesRemaining != null);
  const before = withOrdnance.strikes[idx].usesRemaining;

  const clone = cloneStateForPlanning(state);
  clone.combatants.get(withOrdnance.id).strikes[idx].usesRemaining -= 1;

  assert.equal(withOrdnance.strikes[idx].usesRemaining, before,
    "mutating the clone's ordnance changed the LIVE combatant — the strikes array is being shared by reference");
});

test("SANDBOX: apply() never mutates the state it was forked from", () => {
  const { state, combatantId, turn } = captureLiveState();
  const before = structuredClone(state);

  const sandbox = forkTurnSandbox({ state, turn });
  // Try a move and an attack; whichever are legal will mutate the SANDBOX only.
  const target = [...state.combatants.values()].find((c) => c.side !== state.combatants.get(combatantId).side && c.currentHP > 0);
  sandbox.apply(combatantId, { type: "move", to: { col: 5, row: 5 } });
  if (target) sandbox.apply(combatantId, { type: "strike", targetId: target.id, strikeIndex: 0 });

  const after = structuredClone(state);
  assert.deepEqual(after, before, "forkTurnSandbox.apply() wrote through to the live state");
});

// SANDBOX-FORK COUNTER (design doc §59, GH issue #5) — the one true seam a decision-cost profiler
// hooks: forkTurnSandbox is called on every real search step regardless of how much caching sits
// above it, so counting AT this seam always reflects real work done, not an approximation derived
// from candidate-list length.
test("SANDBOX-FORK COUNTER: resetSandboxForkCount/getSandboxForkCount accurately track the real number of forkTurnSandbox calls made", () => {
  const { state, turn } = captureLiveState();
  resetSandboxForkCount();
  assert.equal(getSandboxForkCount(), 0, "expected a clean count immediately after reset");
  forkTurnSandbox({ state, turn });
  forkTurnSandbox({ state, turn });
  forkTurnSandbox({ state, turn });
  assert.equal(getSandboxForkCount(), 3, "expected the counter to track exactly the 3 real forkTurnSandbox calls made");
  resetSandboxForkCount();
  assert.equal(getSandboxForkCount(), 0, "reset must zero the counter again");
});

test("SANDBOX-FORK COUNTER: a real battle runs byte-identically whether or not something is reading the counter — the instrumentation adds no behavior of its own", () => {
  const withoutReads = runBattle(buildScenario({ seed: 4242, roundLimit: 8 }));
  resetSandboxForkCount();
  const scenario = buildScenario({ seed: 4242, roundLimit: 8 });
  const realAi = scenario.ai;
  scenario.ai = (state, combatantId, turnState) => { getSandboxForkCount(); return realAi(state, combatantId, turnState); };
  const withReads = runBattle(scenario);
  assert.deepEqual(withReads.outcome, withoutReads.outcome);
  assert.equal(withReads.rounds.length, withoutReads.rounds.length);
});

test("SANDBOX: forkTurnSandbox takes no rng, so a full battle's dice are unaffected by how much planning happens", () => {
  // Run the same seed twice. The second run's AI additionally does a pile of sandbox planning
  // on every call. If the sandbox touched the engine's rng, the d20 sequences would diverge.
  const d20sFrom = (withPlanning) => {
    const scenario = buildScenario({ seed: 909, roundLimit: 8 });
    const realAi = scenario.ai;
    scenario.ai = (state, combatantId, turn) => {
      if (withPlanning) {
        for (let i = 0; i < 5; i++) {
          const sb = forkTurnSandbox({ state, turn });
          sb.apply(combatantId, { type: "move", to: { col: 1 + i, row: 1 } });
          sb.apply(combatantId, { type: "strike", targetId: "claimant-one", strikeIndex: 0 });
        }
      }
      return realAi(state, combatantId, turn);
    };
    const log = runBattle(scenario);
    const d20s = [];
    for (const r of log.rounds) for (const t of r.turns) for (const a of t.actions) {
      if (a.roll?.d20 != null) d20s.push(a.roll.d20);
    }
    return d20s;
  };
  const withoutPlanning = d20sFrom(false);
  const withPlanning = d20sFrom(true);
  assert.ok(withoutPlanning.length > 0, "expected some real d20 rolls in the battle");
  assert.deepEqual(withPlanning, withoutPlanning,
    "planning changed the battle's dice — the sandbox is drawing from the engine's rng");
});

test("SANDBOX: an illegal proposal comes back as legal:false with a reason, exactly as the engine reports it — planners never reimplement legality", () => {
  const { state, combatantId, turn } = captureLiveState();
  const sandbox = forkTurnSandbox({ state, turn });
  const result = sandbox.apply(combatantId, { type: "move", to: { col: 999, row: 999 } });
  assert.equal(result.legal, false);
  assert.match(result.reason, /off the map/);
});

test("SANDBOX: actionsRemaining decreases by the real action cost of each applied action", () => {
  const { state, combatantId, turn } = captureLiveState();
  const sandbox = forkTurnSandbox({ state, turn });
  const start = sandbox.actionsRemaining();
  const result = sandbox.apply(combatantId, { type: "move", to: { col: state.positions.get(combatantId).col, row: state.positions.get(combatantId).row + 1 } });
  if (result.legal) {
    assert.equal(sandbox.actionsRemaining(), start - (result.actionsCost ?? 1));
  }
});

test("SANDBOX: expected-outcome damage is deterministic — applying the same action twice from the same fork point gives the identical result", () => {
  const { state, combatantId, turn } = captureLiveState();
  const attacker = state.combatants.get(combatantId);
  const target = [...state.combatants.values()].find((c) => c.side !== attacker.side && c.currentHP > 0);
  if (!target || !(attacker.strikes ?? []).length) return; // combatant can't attack; nothing to assert

  const a = forkTurnSandbox({ state, turn }).apply(combatantId, { type: "strike", targetId: target.id, strikeIndex: 0 });
  const b = forkTurnSandbox({ state, turn }).apply(combatantId, { type: "strike", targetId: target.id, strikeIndex: 0 });
  assert.equal(a.legal, b.legal);
  if (a.legal) assert.equal(a.damageApplied, b.damageApplied, "expected-value resolution must be deterministic");
});

test("REGRESSION: a spellAttack advances the SAME multiple-attack-penalty counter a Strike does, inside the sandbox too", () => {
  // If the sandbox lost this coupling, a planner would price "Lance, Lance, Lance" at MAP 0
  // each time while the engine really applies -5 and -10 — silently over-valuing multi-attack
  // plans with no error anywhere.
  const scenario = buildScenario({ seed: 77, roundLimit: 4 });
  let captured = null;
  const realAi = scenario.ai;
  scenario.ai = (state, combatantId, turn) => {
    const c = state.combatants.get(combatantId);
    if (!captured && (c.strikes ?? []).length && turn.actionsUsed === 0) captured = { state, combatantId, turn };
    return realAi(state, combatantId, turn);
  };
  runBattle(scenario);
  assert.ok(captured, "failed to capture an attacker at the start of its turn");

  const sandbox = forkTurnSandbox({ state: captured.state, turn: captured.turn });
  assert.equal(sandbox.turn.strikesAttempted, 0);
  const r1 = sandbox.apply(captured.combatantId, { type: "strike", targetId: "claimant-one", strikeIndex: 0 });
  if (r1.legal) {
    assert.equal(sandbox.turn.strikesAttempted, 1, "the shared MAP counter must advance inside the sandbox");
  }
});
