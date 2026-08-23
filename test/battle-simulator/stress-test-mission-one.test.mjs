/**
 * Behavioural invariants for scenarios/stress-test-mission-one.mjs (design doc §16) — the
 * deliberately maximal, multi-faction scenario built to find gaps in the general AI, not to
 * assert a specific outcome (there isn't a "correct" one — this is a stress test). What's
 * asserted here are the structural guarantees that must hold no matter how any individual fight
 * plays out: no combatant gets permanently stuck, the Claimant stays restrained, party/opposition
 * respect engine/factions.mjs's relations end to end, and distinct seeds produce distinct battles
 * (the "seven identical seeds" regression this project has already hit once, elsewhere).
 *
 * Each seed's battle is run EXACTLY ONCE (memoized below) and every assertion reads from that
 * one log — this scenario is real Dijkstra pathfinding over 14 combatants, not the sub-millisecond
 * open-field scenarios the rest of this suite uses, so re-running it per-assertion the way
 * claimant-ai.test.mjs does would make this one file dominate the whole suite's runtime.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/stress-test-mission-one.mjs";
import { auditActionUtilization } from "../../tools/battle-simulator/analysis/action-utilization.mjs";

// Deliberately small: this scenario runs real Dijkstra pathfinding over 14 combatants (unlike the
// rest of this suite's sub-millisecond open-field scenarios), so each seed here costs real wall-
// clock time even after the design doc §16 caching fixes. 2 seeds x a 6-round cap keeps this file
// from dominating a routine `node --test` run while still exercising every invariant below at
// least twice; run scenarios/stress-test-mission-one.mjs directly via run-scenario.mjs for a
// deeper/longer sweep when actually investigating behavior, not as part of the committed suite.
const SEEDS = [1, 2];
const ROUND_LIMIT = 6;

const runs = new Map(); // seed -> { scenario, log }
function getRun(seed) {
  if (!runs.has(seed)) {
    const scenario = buildScenario({ seed, roundLimit: ROUND_LIMIT });
    runs.set(seed, { scenario, log: runBattle(scenario) });
  }
  return runs.get(seed);
}

test("INVARIANT: no combatant EVER proposes an illegal action — the AI proposes, the engine judges, but a well-behaved AI's proposals are always legal", () => {
  for (const seed of SEEDS) {
    const { log } = getRun(seed);
    const illegal = auditActionUtilization(log).flagged.filter((f) => f.category === "illegalProposal");
    assert.equal(illegal.length, 0, `seed ${seed}: illegal proposal(s): ${JSON.stringify(illegal)}`);
  }
});

test("REGRESSION (design doc §16 — the convoy-never-moves bug): every neutral combatant moves at least once, starts already at its extraction point, or dies before its own turn ever comes up", () => {
  // Found by reading a real transcript: two convoy vehicles proposed the SAME illegal move every
  // single round of a 6-round battle and never once succeeded — checkMoveLegality was re-deriving
  // a straight line to validate a destination the AI had planned as a detour around a blocker.
  //
  // WIDENED (design doc §18): the original two-way check (moved OR started at goal) missed a
  // third, entirely legitimate outcome — traced directly (HP snapshot per turn, not assumed): a
  // 45 HP, unarmed convoy vehicle can be killed by the raider sub-faction before its own initiative
  // slot ever arrives (engine.mjs's round loop skips a combatant outright once currentHP<=0, with
  // no turn logged at all — correct, not a bug). That is exactly what engine/factions.mjs's widened
  // opposition hostility exists to make possible: "the raider sub-faction preying on an undefended
  // convoy is exactly the point" (this scenario's own header). A convoy vehicle dying before it
  // ever gets to try to flee is the raiders succeeding, not the pathing bug recurring.
  for (const seed of SEEDS) {
    const { scenario, log } = getRun(seed);
    const neutrals = scenario.combatants.filter((c) => c.side === "neutral");
    for (const c of neutrals) {
      const start = log.deployment.snapshot[c.id].position;
      const startedAtGoal = start.col === c.extractionPoint.col && start.row === c.extractionPoint.row;
      let moved = false;
      let gotATurn = false;
      for (const round of log.rounds) for (const t of round.turns) {
        if (t.combatantId !== c.id) continue;
        gotATurn = true;
        if ((t.actions ?? []).some((a) => a.legal && a.type === "move")) moved = true;
      }
      const diedBeforeItsTurn = !gotATurn;
      assert.ok(moved || startedAtGoal || diedBeforeItsTurn, `seed ${seed}: ${c.id} got at least one turn, never moved, and did not start at its goal — the actual pathing bug`);
    }
  }
});

test("INVARIANT: the Claimant never proactively chooses to Strike, even in a scenario with far more legal enemies to potentially target than any scenario this rule was originally verified against", () => {
  for (const seed of SEEDS) {
    const { log } = getRun(seed);
    for (const round of log.rounds) for (const t of round.turns) {
      if (t.combatantId !== "claimant-one") continue;
      for (const a of t.actions ?? []) {
        assert.notStrictEqual(a.type, "strike", `seed ${seed} round ${round.round}: the Claimant chose Strike as its own action`);
      }
    }
  }
});

test("INVARIANT (engine/factions.mjs): no party-side combatant ever logs a strike or spellAttack targeting a neutral combatant", () => {
  for (const seed of SEEDS) {
    const { scenario, log } = getRun(seed);
    const neutralIds = new Set(scenario.combatants.filter((c) => c.side === "neutral").map((c) => c.id));
    const partyIds = new Set(scenario.combatants.filter((c) => c.side === "party").map((c) => c.id));
    for (const round of log.rounds) for (const t of round.turns) {
      if (!partyIds.has(t.combatantId)) continue;
      for (const a of t.actions ?? []) {
        if (a.type !== "strike" && a.type !== "spellAttack") continue;
        assert.ok(!neutralIds.has(a.targetId), `seed ${seed} round ${round.round}: ${t.combatantId} attacked neutral ${a.targetId}`);
      }
    }
  }
});

test("INVARIANT (engine/factions.mjs): the raider sub-faction DOES threaten the neutral convoy — opposition's widened hostility is doing real work, not dead code", () => {
  let anyConvoyDamage = false;
  for (const seed of SEEDS) {
    const { scenario, log } = getRun(seed);
    const neutralIds = new Set(scenario.combatants.filter((c) => c.side === "neutral").map((c) => c.id));
    for (const round of log.rounds) for (const t of round.turns) {
      for (const a of t.actions ?? []) {
        if ((a.type === "strike" || a.type === "spellAttack") && neutralIds.has(a.targetId) && a.damageApplied > 0) anyConvoyDamage = true;
      }
    }
  }
  assert.ok(anyConvoyDamage, `across seeds ${SEEDS.join(",")}, opposition never once damaged the neutral convoy — the widened-hostility relation may not be reaching a real proposal`);
});

test("distinct seeds produce distinct battles — the 'seven identical seeds' failure mode this project has hit before must not recur here", () => {
  // FIX: comparing just `outcome` (as the original version of this test, copied from a simpler
  // scenario, did) is too coarse HERE — this scenario often needs more than ROUND_LIMIT rounds to
  // resolve, so multiple genuinely different seeds can all legitimately land on the identical
  // {result:"timeout", detail:"Round limit (N) reached..."} category while the actual fights
  // (who's alive, how hurt, how far the convoy got) differed completely. A fingerprint of final
  // HP across every combatant is what "the seven identical seeds bug" actually was about: the old
  // AI producing the SAME sequence of decisions regardless of seed, not merely landing in the
  // same outcome bucket.
  const fingerprints = SEEDS.map((seed) => {
    const { log } = getRun(seed);
    const lastRound = log.rounds[log.rounds.length - 1];
    const snap = lastRound.turns[lastRound.turns.length - 1].snapshot;
    return JSON.stringify(Object.entries(snap).sort().map(([id, s]) => [id, s.currentHP]));
  });
  const distinct = new Set(fingerprints).size;
  assert.ok(distinct > 1, `all ${SEEDS.length} seeds produced an identical final-HP fingerprint: ${fingerprints[0]}`);
});
