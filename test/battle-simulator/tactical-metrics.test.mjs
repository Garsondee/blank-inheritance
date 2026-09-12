/**
 * First direct unit coverage for analysis/tactical-metrics.mjs's own resourceUseStats/
 * engagementStats/abilityCoverageStats (design doc §78, GH #57 — "Ability telemetry: a
 * declared-versus-executed coverage report"). Every other test touching this file
 * (tactical-benchmark.test.mjs/tactical-puzzles.test.mjs) exercises it only indirectly through
 * collectTacticalMetrics against a real battle — these are the first tests pinning each function's
 * own behavior directly, with small hand-built logs (matching this project's own established style
 * for exact, deterministic assertions the AI's own choices can't accidentally satisfy or dodge).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resourceUseStats, engagementStats, abilityCoverageStats } from "../../tools/battle-simulator/analysis/tactical-metrics.mjs";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/personnel-mirror.mjs";
import { BASELINE_V1, NO_MANEUVERS_V1 } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";

const ALL_ABILITY_KEYS = ["strikes", "spells", "healAbilities", "saveAttacks", "conditionSaves", "areaAttacks", "reactions"];

// --- resourceUseStats ---

test("resourceUseStats: covers all 7 declared-ability arrays — was blind to saveAttacks/conditionSaves/areaAttacks/reactions, scanning only strikes/spells/healAbilities", () => {
  const log = {
    roster: {
      alice: {
        side: "party",
        strikes: [], spells: [], healAbilities: [],
        saveAttacks: [{ name: "Frag Grenade", usesPerEncounter: 1 }],
        conditionSaves: [{ name: "Intimidating Glare", usesPerEncounter: 2 }],
        areaAttacks: [{ name: "Cluster Bomb", usesPerEncounter: 1 }],
        reactions: [{ name: "Reactive Strike" }] // real reactions carry no usesPerEncounter — at-will, never "tracked"
      }
    },
    rounds: [
      { round: 1, turns: [{ combatantId: "alice", actions: [{ type: "saveAttack", saveAttackName: "Frag Grenade", legal: true }] }] },
      { round: 2, turns: [{ combatantId: "alice", actions: [{ type: "conditionSave", conditionSaveName: "Intimidating Glare", legal: true }] }] }
    ]
  };
  const stats = resourceUseStats(log);
  assert.equal(stats.tracked, 3, "Frag Grenade, Intimidating Glare, Cluster Bomb — reactions has no usesPerEncounter so isn't tracked");
  assert.equal(stats.spent, 2);
  const byName = Object.fromEntries(stats.options.map((o) => [o.name, o.spentRound]));
  assert.equal(byName["Frag Grenade"], 1);
  assert.equal(byName["Intimidating Glare"], 2);
  assert.equal(byName["Cluster Bomb"], null, "declared but never used — remains unspent");
});

// --- engagementStats ---

test("engagementStats: counts personnel-scale reaction damage (`reactions[]`), which it used to miss entirely (it only ever read Frame's own `triggeredReactions` key)", () => {
  const log = {
    roster: {},
    rounds: [{ round: 3, turns: [{ combatantId: "mover", actions: [
      { type: "move", legal: true, reactions: [{ reactorId: "tough", strikeName: "Warhammer", damageApplied: 7 }] }
    ] }] }]
  };
  const stats = engagementStats(log);
  assert.equal(stats.totalDamage, 7);
  assert.equal(stats.firstDamageRound, 3);
});

test("engagementStats: Frame-scale's own `triggeredReactions[]` shape is unchanged — the personnel fix must not disturb it", () => {
  const log = {
    roster: {},
    rounds: [{ round: 2, turns: [{ combatantId: "mover", actions: [
      { type: "move", legal: true, triggeredReactions: [{ reactorId: "claimant", reactionName: "Claim", damageApplied: 12 }] }
    ] }] }]
  };
  const stats = engagementStats(log);
  assert.equal(stats.totalDamage, 12);
  assert.equal(stats.firstDamageRound, 2);
});

// --- abilityCoverageStats ---

test("abilityCoverageStats: a declared-but-never-executed ability lands in `zero`; an executed one does not", () => {
  const log = {
    roster: { alice: { strikes: [{ name: "Knife" }, { name: "Pistol" }] } },
    rounds: [{ round: 1, turns: [{ combatantId: "alice", actions: [{ type: "strike", strikeName: "Knife", legal: true }] }] }]
  };
  const cov = abilityCoverageStats(log);
  assert.equal(cov.abilities.length, 2);
  assert.deepEqual(cov.zero.map((z) => z.name), ["Pistol"]);
});

test("abilityCoverageStats: an illegal (rejected) proposal never counts as an execution", () => {
  const log = {
    roster: { alice: { strikes: [{ name: "Knife" }] } },
    rounds: [{ round: 1, turns: [{ combatantId: "alice", actions: [{ type: "strike", strikeName: "Knife", legal: false }] }] }]
  };
  const cov = abilityCoverageStats(log);
  assert.equal(cov.abilities[0].executions, 0);
  assert.equal(cov.zero.length, 1);
});

test("abilityCoverageStats: per-ability over-use flags past the declared usesPerEncounter cap, not at it (boundary)", () => {
  const makeLog = (executions) => ({
    roster: { alice: { healAbilities: [{ name: "Transfer Vitality", usesPerEncounter: 2 }] } },
    rounds: [{ round: 1, turns: [{ combatantId: "alice",
      actions: Array.from({ length: executions }, () => ({ type: "healAbility", abilityName: "Transfer Vitality", legal: true }))
    }] }]
  });
  assert.equal(abilityCoverageStats(makeLog(2)).overUsed.length, 0, "exactly at cap — not over-use");
  const over = abilityCoverageStats(makeLog(3)).overUsed;
  assert.equal(over.length, 1);
  assert.deepEqual(over[0], { kind: "ability", ownerId: "alice", rosterKey: "healAbilities", name: "Transfer Vitality", executions: 3, cap: 2 });
});

test("abilityCoverageStats: shared-slot-pool over-use (GH #60) sums executions across every ability sharing a slotRank, flags past the combatant's own starting spellSlots (boundary)", () => {
  const makeLog = (touchCasts, thirtyCasts, slots) => ({
    roster: {
      lunar: {
        healAbilities: [{ name: "Heal (touch)", slotRank: 1 }, { name: "Heal (30ft)", slotRank: 1 }],
        spellSlots: { 1: slots }
      }
    },
    rounds: [{ round: 1, turns: [{ combatantId: "lunar", actions: [
      ...Array.from({ length: touchCasts }, () => ({ type: "healAbility", abilityName: "Heal (touch)", legal: true })),
      ...Array.from({ length: thirtyCasts }, () => ({ type: "healAbility", abilityName: "Heal (30ft)", legal: true }))
    ] }] }]
  });
  assert.equal(abilityCoverageStats(makeLog(2, 1, 3)).overUsed.length, 0, "2+1=3, exactly the 3 starting slots — not over-use");
  const over = abilityCoverageStats(makeLog(2, 2, 3)).overUsed;
  assert.equal(over.length, 1);
  assert.equal(over[0].kind, "sharedSlotPool");
  assert.equal(over[0].executions, 4);
  assert.equal(over[0].cap, 3);
  assert.deepEqual(over[0].names.slice().sort(), ["Heal (30ft)", "Heal (touch)"]);
});

test("abilityCoverageStats: a combatant with no spellSlots at all is never falsely flagged for a slotRank-bearing ability — absence means \"can't check\", not \"zero slots\"", () => {
  const log = {
    roster: { npc: { healAbilities: [{ name: "Lay on Hands", slotRank: 1 }] } }, // no spellSlots field at all
    rounds: [{ round: 1, turns: [{ combatantId: "npc", actions: [
      { type: "healAbility", abilityName: "Lay on Hands", legal: true },
      { type: "healAbility", abilityName: "Lay on Hands", legal: true }
    ] }] }]
  };
  assert.equal(abilityCoverageStats(log).overUsed.length, 0);
});

test("abilityCoverageStats: an execution whose name matches nothing declared lands in `unmatched`, not silently dropped and not a crash", () => {
  const log = {
    roster: { alice: { strikes: [{ name: "Knife" }] } },
    rounds: [{ round: 1, turns: [{ combatantId: "alice", actions: [{ type: "strike", strikeName: "Rusty Knife", legal: true }] }] }]
  };
  const cov = abilityCoverageStats(log);
  assert.equal(cov.unmatched.length, 1);
  assert.deepEqual(cov.unmatched[0], { ownerId: "alice", rosterKey: "strikes", name: "Rusty Knife", round: 1 });
});

test("abilityCoverageStats: a real personnel-scale reaction execution is attributed to the reactor's own declared \"Reactive Strike\" — the log entry itself only carries the weapon's name, never the reaction's", () => {
  const log = {
    roster: { tough: { reactions: [{ name: "Reactive Strike" }] } },
    rounds: [{ round: 1, turns: [{ combatantId: "mover", actions: [
      { type: "move", legal: true, reactions: [{ reactorId: "tough", strikeName: "Warhammer", damageApplied: 6 }] }
    ] }] }]
  };
  const cov = abilityCoverageStats(log);
  const reactiveStrike = cov.abilities.find((a) => a.ownerId === "tough" && a.name === "Reactive Strike");
  assert.ok(reactiveStrike, "Reactive Strike should be a tracked declared ability for tough");
  assert.equal(reactiveStrike.executions, 1);
  assert.equal(cov.unmatched.length, 0);
});

test("abilityCoverageStats: a real, unwired reaction (Security Goon's \"Get Back!\") stays a real, correctly-reported zero — it never matches the hardcoded \"Reactive Strike\" a fired-reaction log entry can only ever mean", () => {
  const log = {
    roster: { goon: { reactions: [{ name: "Get Back!" }] } },
    rounds: [{ round: 1, turns: [{ combatantId: "mover", actions: [{ type: "move", legal: true }] }] }]
  };
  const cov = abilityCoverageStats(log);
  assert.equal(cov.zero.length, 1);
  assert.equal(cov.zero[0].name, "Get Back!");
  assert.equal(cov.unmatched.length, 0);
});

// --- Real-battle integration proof (the plumbing the hand-built tests above can't give on their own) ---

test("abilityCoverageStats: a real battle (lunar-17 + security-goon) runs clean — every declared ability accounted for exactly once, nothing unmatched", () => {
  for (const seed of [1, 2, 3]) {
    const scenario = buildScenario({ seed, roster: ["lunar-17.json", "security-goon.json"], partyProfile: BASELINE_V1, oppositionProfile: NO_MANEUVERS_V1, roundLimit: 10 });
    const log = runBattle(scenario);
    const cov = abilityCoverageStats(log);
    assert.equal(cov.unmatched.length, 0, `seed ${seed}: unmatched executions found: ${JSON.stringify(cov.unmatched)}`);
    const declaredCount = Object.values(log.roster).reduce(
      (sum, entry) => sum + ALL_ABILITY_KEYS.reduce((s, key) => s + (entry[key]?.length ?? 0), 0),
      0
    );
    assert.equal(cov.abilities.length, declaredCount, `seed ${seed}: coverage report must account for every declared ability exactly once`);
  }
});
