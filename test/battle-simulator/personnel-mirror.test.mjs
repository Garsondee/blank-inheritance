/**
 * Tests for scenarios/personnel-mirror.mjs (design doc §47, Stage B: the mirror-match scenario).
 * Three real concerns: (1) it refuses to build a meaningless comparison (no roster, no profiles);
 * (2) the roster is genuinely mirrored — same fixture type, correct count, symmetric deployment,
 * and — the one real, previously-undiscovered constraint this file exists to solve — each side's
 * copy gets the RIGHT `side`, not whatever the fixture file itself happens to hard-code; (3) a real
 * battle actually runs to a real conclusion with both sides correctly recognizing each other as
 * enemies (if the side-override were missing or wrong, both copies would end up on the same side
 * and the engine would never produce a real fight).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { buildScenario, GRID_SIZE } from "../../tools/battle-simulator/scenarios/personnel-mirror.mjs";
import { BASELINE_V1, NO_MANEUVERS_V1 } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";
import { GREEDY_V1_POLICY } from "../../tools/battle-simulator/personnel-engine/baselines.mjs";

test("buildScenario: throws without a roster", () => {
  assert.throws(() => buildScenario({ seed: 1, partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1 }), /non-empty roster/);
  assert.throws(() => buildScenario({ seed: 1, roster: [], partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1 }), /non-empty roster/);
});

test("buildScenario: throws without BOTH profiles — a mirror match with an unassigned side measures nothing", () => {
  assert.throws(() => buildScenario({ seed: 1, roster: ["lunar-17.json"], oppositionProfile: BASELINE_V1 }), /requires BOTH/);
  assert.throws(() => buildScenario({ seed: 1, roster: ["lunar-17.json"], partyProfile: BASELINE_V1 }), /requires BOTH/);
});

test("buildScenario: deploys the IDENTICAL roster on both sides — 2x combatants, correct real side on each copy regardless of the fixture file's own baked-in side", () => {
  const scenario = buildScenario({ seed: 1, roster: ["lunar-17.json", "security-goon.json"], partyProfile: BASELINE_V1, oppositionProfile: NO_MANEUVERS_V1 });
  assert.equal(scenario.combatants.length, 4);
  const partySide = scenario.combatants.filter((c) => c.side === "party");
  const oppositionSide = scenario.combatants.filter((c) => c.side === "opposition");
  assert.equal(partySide.length, 2);
  assert.equal(oppositionSide.length, 2);
  // security-goon.json's own file hard-codes "side": "opposition" — its PARTY-side mirror copy must
  // still come out "party", proving the override wins over the fixture's own baked-in value.
  const goonOnParty = partySide.find((c) => c.id.includes("security-goon"));
  assert.ok(goonOnParty, "the security-goon fixture must appear on the party side too, despite its own file saying opposition");
  assert.equal(goonOnParty.side, "party");
});

test("buildScenario: symmetric deployment — party spawns near the left edge, opposition near the right, same row per roster slot", () => {
  const scenario = buildScenario({ seed: 1, roster: ["lunar-17.json"], partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1 });
  const [party, opposition] = scenario.combatants;
  assert.equal(party.position.row, opposition.position.row);
  assert.ok(party.position.col < GRID_SIZE.cols / 2);
  assert.ok(opposition.position.col > GRID_SIZE.cols / 2);
});

test("buildScenario: no walls — an open arena, on purpose, for ladder-scale speed", () => {
  const scenario = buildScenario({ seed: 1, roster: ["lunar-17.json"], partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1 });
  assert.deepEqual(scenario.walls, []);
});

test("a real mirror battle resolves to a real conclusion, both sides correctly fighting each other", () => {
  const scenario = buildScenario({ seed: 7, roster: ["lunar-17.json", "security-goon.json"], partyProfile: BASELINE_V1, oppositionProfile: NO_MANEUVERS_V1, roundLimit: 20 });
  const log = runBattle(scenario);
  assert.ok(["party-victory", "party-defeat", "timeout"].includes(log.outcome.result));
  assert.ok(log.rounds.length > 0);
  // a real fight happened — someone on the losing side actually took damage, proving the two sides
  // engaged each other rather than the engine silently treating all four combatants as allies
  const anyDamageDealt = log.rounds.some((r) => r.turns.some((t) => (t.actions ?? []).some((a) => a.damageApplied > 0)));
  assert.ok(anyDamageDealt, "a real mirror match must produce real damage between the two sides");
});

test("BASELINE_V1 vs BASELINE_V1 (a true control-vs-control mirror, no variable at all): still a real, legal battle", () => {
  const scenario = buildScenario({ seed: 3, roster: ["lunar-17.json"], partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1, roundLimit: 15 });
  const log = runBattle(scenario);
  assert.ok(["party-victory", "party-defeat", "timeout"].includes(log.outcome.result));
});

// --- design doc §57/#4: the "policy" decisionMode dispatch, the real integration point for the new
// ai-common/ registry. GREEDY_V1_POLICY is `{...BASELINE_V1, decisionMode: "policy", policyId:
// "greedy-v1"}` — resolving "greedy-v1" against PERSONNEL_ADAPTER is BY CONSTRUCTION the same decide()
// BASELINE_V1 itself drives, so a real mirror battle across this new dispatch branch must be BYTE-
// IDENTICAL, action for action, to the same battle run through the ordinary decide() path — proof this
// scenario's own new "policy" branch adds no behavior of its own, only a different route to the same
// place.

function actionSequence(log) {
  const seq = [];
  for (const round of log.rounds) for (const turn of round.turns) for (const action of turn.actions ?? []) {
    seq.push(`${turn.combatantId}:${action.type}${action.targetId ? "->" + action.targetId : ""}`);
  }
  return seq;
}

test("\"policy\" decisionMode: GREEDY_V1_POLICY resolved through ai-common's registry is BYTE-IDENTICAL, action for action, to the ordinary BASELINE_V1 decide() path — same seed/roster, only the profile differs", () => {
  const ROSTER = ["lunar-17.json", "security-goon.json"];
  const directLog = runBattle(buildScenario({ seed: 42, roster: ROSTER, partyProfile: BASELINE_V1, oppositionProfile: BASELINE_V1, roundLimit: 6 }));
  const registryLog = runBattle(buildScenario({ seed: 42, roster: ROSTER, partyProfile: BASELINE_V1, oppositionProfile: GREEDY_V1_POLICY, roundLimit: 6 }));
  assert.deepEqual(actionSequence(registryLog), actionSequence(directLog));
  assert.equal(registryLog.outcome.result, directLog.outcome.result);
  assert.equal(registryLog.rounds.length, directLog.rounds.length);
});

test("\"policy\" decisionMode: GREEDY_V1_POLICY is a real, frozen, profile-shaped wrapper registered in ALL_PROFILES under its own id, matching the RANDOM_BASELINE/WORST_BASELINE/NEAREST_ONLY_BASELINE convention", async () => {
  const { ALL_PROFILES } = await import("../../tools/battle-simulator/personnel-engine/archetypes.mjs");
  assert.equal(GREEDY_V1_POLICY.decisionMode, "policy");
  assert.equal(GREEDY_V1_POLICY.policyId, "greedy-v1");
  assert.ok(Object.isFrozen(GREEDY_V1_POLICY));
  assert.equal(ALL_PROFILES["greedy-v1"], GREEDY_V1_POLICY, "tournament-runner.mjs's own --opposition=greedy-v1 must resolve to this real profile");
});
