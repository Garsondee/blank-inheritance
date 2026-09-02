/**
 * Tests for analysis/transcript-audit.mjs (design doc §53). Two real concerns:
 * (1) runAuditSample actually runs real battles and produces real, correctly-shaped records —
 *     proven against a real (tiny) sample, not a mock;
 * (2) selectForManualReview's five deterministic rules each fire on the exact condition they claim
 *     to, on hand-built metrics records where the "why" is unambiguous — this is the one genuinely
 *     new piece of logic in this file, so it gets the most direct coverage.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runAuditSample, selectForManualReview, renderTranscript } from "../../tools/battle-simulator/analysis/transcript-audit.mjs";
import { BASELINE_V1 } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";
import { AGGRESSIVE_V1 } from "../../tools/battle-simulator/personnel-engine/archetypes.mjs";

const ROSTER = ["lunar-17.json", "security-goon.json"];

// --- runAuditSample: real battles, real shape ---

test("runAuditSample: one opponent x one seed produces exactly one real, correctly-shaped record", () => {
  const results = runAuditSample({ roster: ROSTER, partyProfile: BASELINE_V1, opponents: [AGGRESSIVE_V1], seedSpec: "3" });
  assert.equal(results.length, 1);
  const [r] = results;
  assert.equal(r.opponentId, "aggressive-v1");
  assert.equal(r.seed, 3);
  assert.ok(r.log.rounds.length > 0, "expected a real battle log with at least one round");
  assert.equal(typeof r.metrics.decisionEntropy, "number");
  assert.equal(typeof r.metrics.idleTurnRate, "number");
  assert.equal(r.illegalCount, 0, "a real battle against a real archetype must never produce an illegal proposal");
});

test("runAuditSample: opponents x seeds is a real cartesian product, not just the first of each", () => {
  const results = runAuditSample({ roster: ROSTER, partyProfile: BASELINE_V1, opponents: [AGGRESSIVE_V1, BASELINE_V1], seedSpec: "1-3" });
  assert.equal(results.length, 6);
  assert.deepEqual(new Set(results.map((r) => r.opponentId)), new Set(["aggressive-v1", "baseline-v1"]));
  assert.deepEqual(new Set(results.map((r) => r.seed)), new Set([1, 2, 3]));
});

// --- selectForManualReview: hand-built metrics records, so each rule's own trigger is unambiguous ---

function fakeResult({ opponentId, seed, decisionEntropy = 2.0, idleTurnRate = 0, rounds = 10, illegalCount = 0 }) {
  return { opponentId, seed, illegalCount, metrics: { decisionEntropy, idleTurnRate, rounds } };
}

test("selectForManualReview: an illegal proposal is ALWAYS picked, regardless of every other metric looking fine", () => {
  const results = [
    fakeResult({ opponentId: "x", seed: 9, illegalCount: 1, decisionEntropy: 3.0, idleTurnRate: 0, rounds: 5 }),
    fakeResult({ opponentId: "x", seed: 1 }) // the fixed baseline seed would ALSO pick this opponent separately — irrelevant here
  ];
  const picks = selectForManualReview(results);
  const flagged = picks.find((p) => p.seed === 9);
  assert.ok(flagged, "the illegal-proposal battle must be picked");
  assert.ok(flagged.reasons.some((r) => r.includes("illegal proposal")));
});

test("selectForManualReview: picks the LOWEST decisionEntropy battle within each opponent, not the highest or an arbitrary one", () => {
  // rounds is IDENTICAL across all three on purpose — the longest-battle-overall rule always fires
  // exactly once for any non-empty sample (by design), so this keeps it from confounding which
  // battle picked up the decisionEntropy reason specifically.
  const results = [
    fakeResult({ opponentId: "x", seed: 2, decisionEntropy: 3.0, rounds: 10 }),
    fakeResult({ opponentId: "x", seed: 3, decisionEntropy: 0.5, rounds: 10 }), // the real minimum
    fakeResult({ opponentId: "x", seed: 4, decisionEntropy: 2.0, rounds: 10 })
  ];
  const picks = selectForManualReview(results, { baselineSeed: -1 }); // disable the baseline-seed rule so only the entropy (+ tied longest-battle) rule is in play
  const entropyPick = picks.find((p) => p.reasons.some((r) => r.includes("lowest decisionEntropy")));
  assert.ok(entropyPick, `expected some pick to carry the lowest-decisionEntropy reason, got: ${JSON.stringify(picks)}`);
  assert.equal(entropyPick.seed, 3, "0.5 is the real minimum, not seed 2's 3.0 or seed 4's 2.0");
});

test("selectForManualReview: picks the HIGHEST idleTurnRate battle within each opponent, but only when at least one is actually > 0", () => {
  // decisionEntropy is IDENTICAL across both seeds on purpose — the lowest-decisionEntropy rule
  // always fires for any non-empty group (by design: every group has a real lowest), so this keeps
  // that rule from confounding which battle picked up the idleTurnRate reason specifically.
  const allIdle = [
    fakeResult({ opponentId: "x", seed: 1, decisionEntropy: 2.0, idleTurnRate: 0.1 }),
    fakeResult({ opponentId: "x", seed: 2, decisionEntropy: 2.0, idleTurnRate: 0.4 }) // the real maximum
  ];
  const picksWithIdle = selectForManualReview(allIdle, { baselineSeed: -1 });
  const idlePick = picksWithIdle.find((p) => p.reasons.some((r) => r.includes("highest idleTurnRate")));
  assert.ok(idlePick, `expected some pick to carry the highest-idleTurnRate reason, got: ${JSON.stringify(picksWithIdle)}`);
  assert.equal(idlePick.seed, 2, "0.4 is the real higher idleTurnRate, not seed 1's 0.1");

  const noneIdle = [
    fakeResult({ opponentId: "y", seed: 1, idleTurnRate: 0 }),
    fakeResult({ opponentId: "y", seed: 2, idleTurnRate: 0 })
  ];
  const picksNoIdle = selectForManualReview(noneIdle, { baselineSeed: -1 });
  assert.ok(!picksNoIdle.some((p) => p.reasons.some((r) => r.includes("idleTurnRate"))), "nothing should carry an idleTurnRate reason when it's 0 everywhere in this matchup (the lowest-decisionEntropy rule may still legitimately pick one of them for a different, unrelated reason)");
});

test("selectForManualReview: the fixed baseline seed is picked for EVERY opponent, unconditionally", () => {
  const results = [
    fakeResult({ opponentId: "x", seed: 1, decisionEntropy: 5.0, idleTurnRate: 0 }), // nothing else about this battle stands out
    fakeResult({ opponentId: "y", seed: 1, decisionEntropy: 5.0, idleTurnRate: 0 })
  ];
  const picks = selectForManualReview(results, { baselineSeed: 1 });
  assert.deepEqual(picks.map((p) => `${p.opponentId}|${p.seed}`).sort(), ["x|1", "y|1"]);
  assert.ok(picks.every((p) => p.reasons.some((r) => r.includes("fixed baseline sample"))));
});

test("selectForManualReview: the single longest battle across the WHOLE sample is picked, even from a matchup with no other flags", () => {
  const results = [
    fakeResult({ opponentId: "x", seed: 5, rounds: 6, decisionEntropy: 3.0, idleTurnRate: 0 }),
    fakeResult({ opponentId: "y", seed: 7, rounds: 29, decisionEntropy: 3.0, idleTurnRate: 0 }) // the real longest
  ];
  const picks = selectForManualReview(results, { baselineSeed: -1 });
  const longest = picks.find((p) => p.opponentId === "y" && p.seed === 7);
  assert.ok(longest, "the longest battle in the whole sample must be picked");
  assert.ok(longest.reasons.some((r) => r.includes("longest battle")));
});

test("selectForManualReview: a battle matching MULTIPLE rules is returned exactly ONCE, carrying every real reason", () => {
  // seed 1 is simultaneously: the fixed baseline seed, the lowest-entropy battle, AND the longest battle.
  const results = [
    fakeResult({ opponentId: "x", seed: 1, decisionEntropy: 0.1, rounds: 30 }),
    fakeResult({ opponentId: "x", seed: 2, decisionEntropy: 4.0, rounds: 5 })
  ];
  const picks = selectForManualReview(results, { baselineSeed: 1 });
  const seed1 = picks.filter((p) => p.opponentId === "x" && p.seed === 1);
  assert.equal(seed1.length, 1, "must appear exactly once, not once per matching rule");
  assert.ok(seed1[0].reasons.length >= 3, `expected at least 3 real reasons, got: ${JSON.stringify(seed1[0].reasons)}`);
});

// --- renderTranscript ---

test("renderTranscript: one line per real action, using decide()'s own logged decisionReason, illegal actions marked", () => {
  const log = {
    outcome: { result: "party-victory" },
    rounds: [
      { round: 1, turns: [{ combatantId: "a", actions: [
        { type: "move", decisionReason: "Move to (3,3) — closing the gap" },
        { type: "strike", decisionReason: "Strike with Baton — best of 4 legal options", legal: true }
      ] }] },
      { round: 2, turns: [{ combatantId: "a", actions: [
        { type: "strike", legal: false, decisionReason: null }
      ] }] }
    ]
  };
  const text = renderTranscript({ opponentId: "x", seed: 1, log });
  const lines = text.split("\n");
  assert.match(lines[0], /x, seed 1.*party-victory.*2 round/);
  assert.equal(lines[1], "R1 a: Move to (3,3) — closing the gap");
  assert.equal(lines[2], "R1 a: Strike with Baton — best of 4 legal options");
  assert.equal(lines[3], "R2 a: strike [ILLEGAL]", "with no decisionReason logged, falls back to the raw action type, and marks illegality explicitly");
});
