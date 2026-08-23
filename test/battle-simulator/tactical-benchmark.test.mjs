/**
 * Tests for the tactical benchmark apparatus itself (design doc §17) — the archetype scenarios,
 * the baseline policies, and the malfunction detectors in analysis/tactical-metrics.mjs.
 *
 * IMPORTANT SCOPE NOTE: this file does NOT assert that the AI plays well. It asserts that the
 * INSTRUMENTS work — that every archetype runs legally, that the baselines are valid opponents,
 * and that each metric actually responds to the malfunction it claims to detect. Whether the AI
 * is good is a question about numbers that move over time (run-tactical-benchmark.mjs), not a
 * pass/fail gate, and freezing today's win rates into assertions would just cement current
 * behaviour as correct — which, per §17's own findings, it demonstrably is not.
 *
 * The one exception is the monotonicity property, which IS a hard invariant and lives in
 * value-function-sanity.test.mjs.
 *
 * Seed counts are deliberately tiny. These scenarios are open-field (no walls) so they run in
 * milliseconds, but there are five of them times three baselines and the point here is coverage
 * of the machinery, not statistical power.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/engine/engine.mjs";
import { ARCHETYPES } from "../../tools/battle-simulator/scenarios/archetypes.mjs";
import { BASELINES } from "../../tools/battle-simulator/ai/baselines.mjs";
import { collectTacticalMetrics, focusFireStats, spearman } from "../../tools/battle-simulator/analysis/tactical-metrics.mjs";
import { auditActionUtilization } from "../../tools/battle-simulator/analysis/action-utilization.mjs";

test("every archetype runs to completion with zero illegal proposals", () => {
  for (const [name, build] of Object.entries(ARCHETYPES)) {
    const log = runBattle(build({ seed: 7001, roundLimit: 5 }));
    const illegal = auditActionUtilization(log).flagged.filter((f) => f.category === "illegalProposal");
    assert.equal(illegal.length, 0, `${name}: illegal proposals ${JSON.stringify(illegal)}`);
    assert.ok(log.rounds.length > 0, `${name}: produced no rounds`);
  }
});

test("every baseline policy is a VALID opponent — it also never proposes an illegal action", () => {
  // Load-bearing for the whole head-to-head comparison: a baseline that proposed illegal actions
  // would have its turns cut short by engine.mjs's illegal-proposal guard and would lose for
  // reasons unrelated to tactics, silently flattering the real AI.
  for (const [baselineName, fn] of Object.entries(BASELINES)) {
    const log = runBattle(ARCHETYPES.swarm({ seed: 7002, roundLimit: 4, partyAI: fn }));
    const illegal = auditActionUtilization(log).flagged.filter((f) => f.category === "illegalProposal");
    assert.equal(illegal.length, 0, `baseline "${baselineName}" proposed illegal action(s): ${JSON.stringify(illegal)}`);
  }
});

test("baselines actually differ from each other — three names for the same behaviour would make the comparison meaningless", () => {
  const signature = (fn) => {
    const log = runBattle(ARCHETYPES.swarm({ seed: 7003, roundLimit: 5, partyAI: fn }));
    const verbs = {};
    for (const round of log.rounds) for (const t of round.turns) {
      if (log.roster[t.combatantId]?.side !== "party") continue;
      for (const a of t.actions ?? []) if (a.legal !== false) verbs[a.type] = (verbs[a.type] ?? 0) + 1;
    }
    return JSON.stringify(verbs);
  };
  const signatures = Object.values(BASELINES).map(signature);
  assert.ok(new Set(signatures).size > 1, `all baselines produced identical action mixes: ${signatures[0]}`);
});

test("METRIC VALIDATION — focusFireStats detects target switching, and does not false-positive on a switch AFTER a kill", () => {
  // A hand-built log, because the point is to prove the detector responds to the specific pattern
  // it claims to detect rather than to whatever a real battle happened to contain.
  const spreading = { rounds: [{ round: 1, turns: [{ combatantId: "a", actions: [
    { type: "strike", legal: true, targetId: "x", targetHPAfter: 50 },
    { type: "strike", legal: true, targetId: "y", targetHPAfter: 50 }, // switched while x still alive
    { type: "strike", legal: true, targetId: "z", targetHPAfter: 50 }
  ] }] }] };
  assert.equal(focusFireStats(spreading).switchesWithTargetAlive, 2, "should flag both switches off a living target");

  const focused = { rounds: [{ round: 1, turns: [{ combatantId: "a", actions: [
    { type: "strike", legal: true, targetId: "x", targetHPAfter: 20 },
    { type: "strike", legal: true, targetId: "x", targetHPAfter: 0 },  // finished it
    { type: "strike", legal: true, targetId: "y", targetHPAfter: 40 }  // switching now is CORRECT
  ] }] }] };
  assert.equal(focusFireStats(focused).switchesWithTargetAlive, 0, "must not penalise moving on after a kill");
});

test("METRIC VALIDATION — spearman returns +1 for perfectly aligned ranks, -1 for perfectly inverted, null when undefined", () => {
  assert.ok(Math.abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-9);
  assert.ok(Math.abs(spearman([1, 2, 3, 4], [40, 30, 20, 10]) + 1) < 1e-9);
  assert.equal(spearman([5, 5, 5], [1, 2, 3]), null, "no variance in one series — correlation is undefined, not zero");
  assert.equal(spearman([1], [1]), null, "a single point cannot have a correlation");
});

test("collectTacticalMetrics returns every metric family for a real battle, with no crashes on empty categories", () => {
  // The mirror archetype has no limited-use options and no objective, so several metrics have
  // legitimately empty inputs — the exact shape most likely to throw on a null.
  const m = collectTacticalMetrics(runBattle(ARCHETYPES.mirror({ seed: 7004, roundLimit: 4 })));
  for (const key of ["focusFire", "mapDiscipline", "oscillation", "resourceUse", "threatPriority", "engagement"]) {
    assert.ok(m[key] !== undefined, `missing metric family: ${key}`);
  }
  assert.equal(m.resourceUse.tracked, 0, "mirror units carry no limited-use options");
  assert.ok(m.engagement.totalDamage >= 0);
});

test("REGRESSION (design doc §15k, re-guarded by §18's closing-weight fix): a unit starting outside its own weapon range still closes distance and engages — the ORIGINAL bug this term exists for", () => {
  // §15k: without ANY closing credit, offensiveReach/threatExposure are both exactly 0 outside
  // weapon range, so every distant position scores identically and a stranded unit has no reason
  // to approach at all (measured then: four consecutive rounds of move/move/move, never engaging).
  // §18 found the weight (3.0) had overshot into actively HURTING play (ablating it to zero raised
  // win rate in range-asymmetry) and cut it to 0.75 — this test exists so that correction can never
  // silently swing back into reintroducing the original problem it was never trying to solve.
  const log = runBattle(ARCHETYPES["range-asymmetry"]({ seed: 7010, roundLimit: 8 }));
  const m = collectTacticalMetrics(log);
  assert.ok(m.engagement.firstDamageRound !== null, "the brawler and skirmisher never engaged at all — the original §15k stranded-unit bug is back");
  assert.ok(m.engagement.firstDamageRound <= 5, `first damage at round ${m.engagement.firstDamageRound} — closing too slow to be a real archetype`);
});

test("REGRESSION (design doc §17): the real AI engages — it deals real damage rather than spending a whole battle repositioning", () => {
  // The measured failure this guards: on one seed the AI took TWO attacks in 42 actions and dealt
  // 16 damage across nine rounds, because offensiveReach (then 0.75) made threatening damage
  // almost as valuable as dealing it while being far cheaper to buy. Deliberately a loose floor,
  // not a tuned target — it asserts "the AI fights at all", which is the property that broke.
  for (const seed of [7005, 7006]) {
    const log = runBattle(ARCHETYPES.swarm({ seed, roundLimit: 6 }));
    const m = collectTacticalMetrics(log);
    assert.ok(m.engagement.totalDamage > 100, `seed ${seed}: only ${m.engagement.totalDamage} total damage across the battle — the AI is not fighting`);
    assert.ok(m.engagement.firstDamageRound !== null && m.engagement.firstDamageRound <= 3, `seed ${seed}: first damage at round ${m.engagement.firstDamageRound}`);
  }
});
