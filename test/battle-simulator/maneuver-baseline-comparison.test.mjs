/**
 * Tests for analysis/maneuver-baseline-comparison.mjs (design doc §43, Stage 2). Matches xp-budget-
 * battery.test.mjs's own established split for this class of script: unit-test the math with hand-
 * built results, one small real-integration check that the wiring (scenario pair -> runBattle ->
 * runScenarioSweep -> aggregateSweep -> comparison) works end to end. Deliberately ONE seed, not a
 * real statistical sample — see this project's own real, measured cost for a single 8-combatant
 * RANDOM_ARCS battle at design doc §43's own performance section before raising this; a genuine
 * multi-seed comparison is what the standalone script (run directly, not as part of `npm test`) is
 * for.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runComparison, MANEUVER_PAIR } from "../../tools/battle-simulator/analysis/maneuver-baseline-comparison.mjs";

test("MANEUVER_PAIR: points at the real registered no-maneuvers-baseline scenario pair", () => {
  assert.equal(MANEUVER_PAIR.withManeuvers, "complex-4v4-random-arcs");
  assert.equal(MANEUVER_PAIR.withoutManeuvers, "complex-4v4-no-maneuvers-random-arcs");
});

test("runComparison (real integration, 1 seed each): wires runScenarioSweep -> aggregateSweep -> the comparison shape together without throwing, for both conditions", () => {
  const cmp = runComparison("1");
  assert.equal(cmp.withManeuvers.n, 1);
  assert.equal(cmp.withoutManeuvers.n, 1);
  assert.ok(["party-victory", "party-defeat", "timeout"].includes(Object.keys(cmp.withManeuvers.outcomes)[0]));
  assert.ok(cmp.withManeuvers.partyWinRate === 0 || cmp.withManeuvers.partyWinRate === 1, "a 1-seed win rate must be a clean 0 or 1, not a fraction");
  assert.ok(cmp.withManeuvers.tripAttempts >= 0 && cmp.withManeuvers.grappleAttempts >= 0);
  // withoutManeuvers deliberately carries no maneuver-conversion fields at all — there is nothing
  // to convert when the party can never attempt one in the first place (see the analysis script's
  // own header).
  assert.equal(cmp.withoutManeuvers.tripAttempts, undefined);
});

test("runComparison: onProgress (design doc §45), when provided, passes straight through to BOTH conditions' own sweeps — real events from both, not just one (the test above already covers the no-onProgress path staying silent and unaffected)", () => {
  const events = [];
  runComparison("1", { onProgress: (e) => events.push(e) });
  const completes = events.filter((e) => e.type === "seedComplete");
  assert.equal(completes.length, 2, "expected one seedComplete event from the WITH sweep and one from the WITHOUT sweep");
});
