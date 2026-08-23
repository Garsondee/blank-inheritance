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
 * AN HONEST, MEASURED FINDING, not silently patched over (design doc §19): under the CURRENT
 * DEFAULT_WEIGHTS (unchanged from Frame-scale, see evaluate/state-value.mjs's own header — this
 * file itself already flags `closing` as "NOT YET RE-MEASURED at this scale"), Demoralize is
 * mechanically correct — real dice, real Frightened application, verified in personnel-engine.test.mjs
 * — but its evaluator-scored value is too small to ever beat a direct attack in THIS specific 1v1
 * matchup, even a heavily MAP-penalized one. Measured directly (not assumed): a fresh-turn Strike
 * scored 5.2 vs Demoralize's 0.13 in a representative position; even a 3rd Strike at -10 MAP still
 * scored 1.3, ~10x Demoralize's value. The mechanism is real and channels correctly through
 * offensiveReach/threatExposure (both scale up with more allies, confirmed by direct measurement),
 * but with only ONE attacker on the party side, the credit is structurally small. This is exactly
 * the kind of thing the ablation-harness/tactical-benchmark discipline (§17-18) exists to catch —
 * flagged here rather than either quietly re-tuning a weight without real justification, or hiding
 * the gap. Pinned as a real, current-state assertion so a future change to this either intentionally
 * updates the assertion (with real measurement behind it) or the test itself proves things changed.
 */
test("HONEST FINDING: Demoralize is never actually chosen in this specific 1v1 matchup under current weights — mechanically correct, but not yet competitively valued (see this test's own comment)", () => {
  let sawDemoralize = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const log = runBattle(buildScenario({ seed, setup: "SAME_ROOM", roundLimit: 15 }));
    for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
      if (action.legal && action.type === "demoralize") sawDemoralize += 1;
    }
  }
  assert.equal(sawDemoralize, 0, "if this ever becomes nonzero, that's real news — a weight change or a smarter evaluator finally made Demoralize competitive in a 1v1; update this test's assertion (and its comment) to match, don't just delete it");
});
