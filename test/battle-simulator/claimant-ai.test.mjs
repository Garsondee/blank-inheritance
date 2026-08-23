/**
 * The Claimant's behaviour, as BEHAVIOURAL INVARIANTS (design doc §15l).
 *
 * REWRITTEN 2026-08-23. The previous version asserted the old AI's specific
 * choices — "proposes Advance as its first action", "returns null when nothing is
 * within Sweep's reach". Those encoded one implementation's decision procedure,
 * not the campaign's design intent, so they broke the moment the decision layer
 * was replaced even though the Claimant's actual behaviour got better.
 *
 * What is asserted here instead is what the statblock and design doc actually
 * promise, in terms that survive any future AI rewrite: it advances on its
 * objective, it hits what is in reach, it never targets something Scale-Blind
 * forbids, and it always spends its turn.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/five-vehicles-one-frame.mjs";
import { distanceFeet } from "../../tools/battle-simulator/engine/grid.mjs";

const SEEDS = [11, 22, 33, 44, 55];

test("INVARIANT: the Claimant makes real progress toward its objective across a battle — it is an advancing threat, not a wanderer", () => {
  let progressed = 0;
  for (const seed of SEEDS) {
    const scenario = buildScenario({ seed, roundLimit: 8 });
    const claimant = scenario.combatants.find((c) => c.id === "claimant-one");
    const log = runBattle(scenario);
    const start = log.deployment.snapshot["claimant-one"].position;
    const lastRound = log.rounds[log.rounds.length - 1];
    const end = lastRound.turns[lastRound.turns.length - 1].snapshot["claimant-one"].position;
    if (distanceFeet(end, claimant.objective) < distanceFeet(start, claimant.objective)) progressed += 1;
  }
  assert.ok(progressed >= SEEDS.length - 1, `expected the Claimant to close on its objective in nearly every battle, did so in ${progressed}/${SEEDS.length}`);
});

test("INVARIANT: the Claimant deals real damage — it is an actual threat, not a prop", () => {
  let totalDamage = 0;
  for (const seed of SEEDS) {
    const log = runBattle(buildScenario({ seed, roundLimit: 8 }));
    for (const r of log.rounds) for (const t of r.turns) {
      if (t.combatantId !== "claimant-one") continue;
      for (const a of t.actions) if (a.legal && typeof a.damageApplied === "number") totalDamage += a.damageApplied;
    }
  }
  assert.ok(totalDamage > 0, "the Claimant did zero damage across every seed — that is the exact failure §14g was fixed for");
});

test("INVARIANT: Scale-Blind is never violated — the Claimant never lands an attack on a Medium-or-smaller target", () => {
  for (const seed of SEEDS) {
    const log = runBattle(buildScenario({ seed, roundLimit: 8 }));
    const sizeOf = (id) => log.roster[id]?.size;
    for (const r of log.rounds) for (const t of r.turns) {
      if (t.combatantId !== "claimant-one") continue;
      for (const a of t.actions) {
        if (!a.legal || !a.targetId) continue;
        const size = sizeOf(a.targetId);
        assert.ok(!["tiny", "small", "medium"].includes(size),
          `Scale-Blind violated: struck ${a.targetId} of size ${size} on seed ${seed}`);
      }
    }
  }
});

test("INVARIANT: the Claimant does not stand idle — every un-stunned turn spends at least one action", () => {
  for (const seed of SEEDS) {
    const log = runBattle(buildScenario({ seed, roundLimit: 8 }));
    for (const r of log.rounds) for (const t of r.turns) {
      if (t.combatantId !== "claimant-one" || t.stunned) continue;
      const acc = t.actionAccounting;
      if (!acc || acc.available === 0) continue;
      assert.ok(acc.spent > 0, `the Claimant wasted an entire turn on seed ${seed} round ${r.round}: ${JSON.stringify(acc)}`);
    }
  }
});
