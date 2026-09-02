/**
 * THE ACTUAL FIGHT (design doc §19 Phase 3): Lunar-17 vs. Security Goon, real extracted data on
 * both sides, real 5ft SF2E grid, on the Phase 1b synthetic building. This is the deliverable the
 * whole "Pure RAW SF2E Validation" initiative exists to produce — proof that the tactical AI works
 * correctly against genuine, unmodified SF2E data rather than this project's own hand-picked bands.
 *
 * A full transcript (seed 1, SAME_ROOM) was read qualitatively before this test file was written —
 * design doc §19 records the read. What's pinned here is what a machine can check directly: legal
 * actions only, real degree-of-success variety, sane outcomes, and behavior across all three
 * Phase 1b room configurations (not just the simplest one).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/personnel-lunar17-vs-security-goon.mjs";

function illegalAttackAttempts(log) {
  let count = 0;
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    if ((action.type === "strike" || action.type === "spellAttack" || action.type === "healAbility") && action.legal === false) count += 1;
  }
  return count;
}

test("SAME_ROOM: a real, legal, resolved fight across many seeds — zero illegal attempts, a real spread of outcomes (not a one-sided steamroll)", () => {
  const outcomes = { "party-victory": 0, "party-defeat": 0, timeout: 0 };
  for (let seed = 1; seed <= 20; seed++) {
    const log = runBattle(buildScenario({ seed, setup: "SAME_ROOM", roundLimit: 15 }));
    assert.equal(illegalAttackAttempts(log), 0, `seed ${seed}: an attack was proposed-and-committed illegally`);
    outcomes[log.outcome.result] = (outcomes[log.outcome.result] ?? 0) + 1;
  }
  assert.ok(outcomes["party-victory"] > 0, `expected at least one party-victory across 20 seeds, got ${JSON.stringify(outcomes)}`);
  assert.ok(outcomes["party-defeat"] > 0 || outcomes["party-victory"] < 20, `a fight this close (AC17/HP15/spell+7/2d6 vs AC14/HP25/+9/1d4+2) should not be a 20-0 party sweep — got ${JSON.stringify(outcomes)}`);
});

test("ADJACENT_ROOMS: resolves cleanly with zero illegal attempts, requiring real pathfinding through the doorway before engagement", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const log = runBattle(buildScenario({ seed, setup: "ADJACENT_ROOMS", roundLimit: 20 }));
    assert.equal(illegalAttackAttempts(log), 0, `seed ${seed}`);
    assert.ok(["party-victory", "party-defeat"].includes(log.outcome.result), `seed ${seed}: expected a real resolution, got ${log.outcome.result} — a fight that never engages would time out instead`);
  }
});

test("FAR_ROOMS: resolves cleanly with zero illegal attempts, requiring real pathfinding through BOTH doorways before engagement", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const log = runBattle(buildScenario({ seed, setup: "FAR_ROOMS", roundLimit: 20 }));
    assert.equal(illegalAttackAttempts(log), 0, `seed ${seed}`);
    assert.ok(["party-victory", "party-defeat"].includes(log.outcome.result), `seed ${seed}: expected a real resolution, got ${log.outcome.result}`);
  }
});

test("real dice throughout: at least one criticalSuccess, one criticalFailure, and a real spread of d20 values appear across a sample of seeds — not a suspiciously narrow or expected-value-only distribution", () => {
  const degrees = new Set();
  const d20s = new Set();
  for (let seed = 1; seed <= 10; seed++) {
    const log = runBattle(buildScenario({ seed, setup: "SAME_ROOM", roundLimit: 15 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      if (action.roll?.degree) degrees.add(action.roll.degree);
      if (typeof action.roll?.d20 === "number") d20s.add(action.roll.d20);
    }
  }
  assert.ok(degrees.has("criticalSuccess"), `expected at least one critical success across 10 seeds, saw degrees: ${[...degrees]}`);
  assert.ok(degrees.has("criticalFailure"), `expected at least one critical failure across 10 seeds, saw degrees: ${[...degrees]}`);
  assert.ok(d20s.size >= 10, `expected a real spread of d20 values across 10 seeds, saw only ${d20s.size} distinct values`);
});

test("Lunar-17's Eldritch Lance is her real, primary damage tool — cast in most fights, not sitting unused", () => {
  let sawEldritchLance = 0, sawTransferVitality = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const log = runBattle(buildScenario({ seed, setup: "SAME_ROOM", roundLimit: 15 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      if (action.legal && action.type === "spellAttack" && action.spellName === "Eldritch Lance") sawEldritchLance += 1;
      if (action.legal && action.type === "healAbility" && action.abilityName === "Transfer Vitality") sawTransferVitality += 1;
    }
  }
  assert.ok(sawEldritchLance >= 10, `expected Eldritch Lance cast at least once per fight across 10 seeds on average, saw ${sawEldritchLance} total casts`);
  assert.ok(sawTransferVitality > 0, "expected Transfer Vitality to be used at least once across 10 seeds — a real, working self-heal option");
});

test("buildScenario: rejects an unknown setup name rather than silently falling back to something else", () => {
  assert.throws(() => buildScenario({ seed: 1, setup: "NOT_A_REAL_SETUP" }), /Unknown setup/);
});

/**
 * HISTORY (design doc §19 -> §21): deriveSaveAttacks originally never read a weapon's real
 * system.quantity, so Lunar-17's real single Incendiary Grenade (system.quantity: 1, confirmed
 * against her raw pack data) was treated as infinitely reusable — a real bug, found by measuring 10
 * seeds, not by inspection. That quantity fix shipped, but a SECOND, deeper problem surfaced later
 * from a direct user report: the grenade's own raw description is a `@Template[burst|distance:5]`
 * AREA effect ("Activate 1 Area Fire..."), not a single-target attack at all — the saveAttack action
 * only ever models single-target saves, so no quantity fix could have made this correct. Lunar-17's
 * grenade was removed from her usable kit entirely (design doc §21), matching the same "area
 * attacks are out of scope" treatment already applied to every other burst/multi-target weapon.
 * Pinned here as a real regression test: no saveAttack of any kind should ever appear for her again
 * until this engine has a real area-effect mechanism and a save-based item that's actually
 * single-target gets wired in its place.
 */
test("Lunar-17 never attempts a saveAttack — her only candidate (Incendiary Grenade) is a real area-burst weapon, correctly excluded rather than misrepresented as single-target", () => {
  for (let seed = 1; seed <= 10; seed++) {
    const log = runBattle(buildScenario({ seed, setup: "SAME_ROOM", roundLimit: 15 }));
    const grenadeThrows = log.rounds.flatMap((r) => r.turns).filter((t) => t.combatantId === "raw-validation-lunar-17")
      .flatMap((t) => t.actions ?? []).filter((a) => a.type === "saveAttack");
    assert.equal(grenadeThrows.length, 0, `seed ${seed}: expected zero saveAttack attempts (the grenade is no longer wired), saw ${grenadeThrows.length}`);
  }
});

/**
 * UPDATE (design doc §43, Stage 2): this WAS an honest zero — see the git history of this comment
 * for the original single-action-isolated measurement (Strike 5.2 vs. Demoralize 0.13 in a
 * representative position) that justified it. Whole-turn planning changed the real finding, not the
 * comment's own reasoning: Demoralize's real Frightened application (Player Core) makes a FOLLOW-UP
 * attack meaningfully more likely to land, exactly the same class of payoff Trip/Grapple already
 * demonstrate (design doc §43's own flagship cases) — invisible to a chooser that only ever scores
 * Demoralize in isolation, real once `control-then-attack` can see the whole sequence. Measured on
 * this exact 10-seed sweep: 5 real Demoralize attempts across 10 full battles (~0.5/battle) — a real,
 * situational choice, not a dominant one; SOME seeds never find it worthwhile, which is the expected
 * shape for a tactic that depends on the specific matchup, not a bug. Per this test's own prior
 * instruction ("update this test's assertion... don't just delete it"), the assertion below now
 * proves the QUALITATIVE finding (Demoralize is sometimes chosen) rather than pinning the exact
 * count, which is real but not itself load-bearing — a minor unrelated evaluator change could shift
 * 5 without changing whether the underlying tactic is genuinely competitive now.
 */
test("Demoralize is now sometimes chosen in this 1v1 matchup, once whole-turn planning can see the follow-up attack it sets up — a real change from the pre-Stage-2 'never' finding (see this test's own comment)", () => {
  let sawDemoralize = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const log = runBattle(buildScenario({ seed, setup: "SAME_ROOM", roundLimit: 15 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      if (action.legal && action.type === "demoralize") sawDemoralize += 1;
    }
  }
  assert.ok(sawDemoralize > 0, "expected whole-turn planning to make Demoralize genuinely competitive at least once across 10 seeds — if this regresses to 0, either the search or the Frightened payoff broke");
});
