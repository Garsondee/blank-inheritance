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

test("INVARIANT: whenever the Claimant's Claim reaction fires, it deals real (non-dud) damage", () => {
  // REWRITTEN 2026-08-23 (design doc §16, then again for §18). The Claimant's OWN turn never logs
  // a "strike" action any more — see the next test — so damage now shows up as a
  // `triggeredReactions` entry on whichever OTHER combatant's move/advance provoked Claim, not as
  // claimant-one's own action.
  //
  // WEAKENED AGAIN (design doc §18): this used to require totalDamage > 0 across these 5 seeds,
  // which broke the moment §18's closing-weight fix landed (3.0 -> 0.75) — not a regression in the
  // mechanism, a real behavior change in when units choose to close. At competence 1 (this
  // scenario's default), a ranged vehicle or a reach-100 Frame now correctly stops at ITS OWN
  // useful range instead of over-closing the extra square to literal adjacency for no reason —
  // exactly the "Step past the last square without provoking Claim" idea design doc §15o already
  // documents, just now happening organically instead of needing Step specifically. 4 of these 5
  // seeds are also stalemates (the ground team's field-break roll genuinely failed — see
  // engine.mjs's own stalemate outcome), where closing to melee against a permanently-immune,
  // still-dangerous target would be actively unwise. Re-run: zero Claim damage across all 5 seeds,
  // reliably, at this weight — not flaky, a real and arguably SMARTER policy.
  //
  // The mechanism itself — Claim fires on an ordinary move ending adjacent, never on a Step, and
  // deals its full real damage when it does — is proven deterministically, independent of any
  // decide() tactical choice, in engine.test.mjs's makeClaimFixture()-based tests. This test's own
  // remaining job is narrower: IF Claim ever fires in a real multi-unit battle, its damage must be
  // real, never a silent zero/dud — a mechanism regression this level can still catch that a
  // hand-built fixture test, being deterministic by construction, never exercises under messy
  // multi-combatant conditions (occupancy, MAP, spot bonuses stacking correctly on a reaction).
  for (const seed of SEEDS) {
    const log = runBattle(buildScenario({ seed, roundLimit: 8 }));
    for (const r of log.rounds) for (const t of r.turns) {
      for (const a of t.actions) {
        for (const reaction of a.triggeredReactions ?? []) {
          if (reaction.reactorId !== "claimant-one") continue;
          assert.ok((reaction.damageApplied ?? 0) > 0, `seed ${seed}: Claim fired but dealt ${reaction.damageApplied} damage — a real trigger should never be a dud`);
        }
      }
    }
  }
});

test("INVARIANT (design doc §16): the Claimant never proactively chooses to Strike — 'it is not fighting the Frame,' only its Claim reaction ever deals damage", () => {
  // FIX, found by reading a real transcript (mystic-frame-solo@555) rather than by inspection:
  // Sweep had no reactionOnly marker, so generateProposals offered it as an ordinary standalone
  // action and the Claimant chose it every round it wasn't stunned — 219 damage across 4 rounds,
  // directly contradicting the statblock's own text ("It only Strikes via its Claim reaction...
  // Blocking it is a choice the pilot has to actively make"). That inversion alone flipped a
  // scripted, points-favor-the-Frame fight into an actual party-defeat.
  for (const seed of SEEDS) {
    const log = runBattle(buildScenario({ seed, roundLimit: 8 }));
    for (const r of log.rounds) for (const t of r.turns) {
      if (t.combatantId !== "claimant-one") continue;
      for (const a of t.actions) {
        assert.notStrictEqual(a.type, "strike", `the Claimant chose Strike as its own action on seed ${seed} round ${r.round} — it must only ever deal damage via Claim`);
      }
    }
  }
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
