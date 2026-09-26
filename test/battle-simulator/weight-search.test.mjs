/**
 * Tests for analysis/weight-search.mjs (design doc §49 — "Archetype Ladder" Stage D: automated
 * weight search). Three layers:
 * (1) `mutateWeights` — real, deterministic, exactly-one-key-changed mutation, no input mutation.
 * (2) `shouldPromote` — the two-part promotion rule (league risk-2 fix + archetype risk-3 fix),
 *     tested against synthetic win-rate data so every branch (pass/fail on each side, the empty-
 *     archetype-pool edge case) is covered without needing real battles.
 * (3) `evaluateCandidate`/`runWeightSearch` — real, small, real-battle integration tests: the search
 *     loop actually runs, is reproducible under a fixed search seed, and — proven with a deliberately
 *     low promotion bar so an ordinary real result clears it — the PROMOTION code path itself fires
 *     on real data, not just on synthetic `shouldPromote` input.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeRng } from "../../tools/battle-simulator/shared/rng.mjs";
import { DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import { BASELINE_V1, assertCompleteWeights } from "../../tools/battle-simulator/personnel-engine/ai-profiles.mjs";
import { MINDLESS_V1, ZEALOT_V1 } from "../../tools/battle-simulator/personnel-engine/archetypes.mjs";
import { mutateWeights, mutateWeightsTogether, makeCandidateProfile, shouldPromote, evaluateCandidate, runWeightSearch, DEFAULT_PROMOTION_OPTIONS, PROVEN_INERT_FOR_DEFAULT_ROSTER } from "../../tools/battle-simulator/analysis/weight-search.mjs";

// --- mutateWeights ---

test("mutateWeights: exactly one key differs from the parent, every other key byte-identical", () => {
  const rng = makeRng(1);
  const { weights, mutatedKey } = mutateWeights(DEFAULT_WEIGHTS, rng);
  assert.doesNotThrow(() => assertCompleteWeights(weights));
  const changedKeys = Object.keys(weights).filter((k) => weights[k] !== DEFAULT_WEIGHTS[k]);
  assert.deepEqual(changedKeys, [mutatedKey]);
});

test("mutateWeights: the mutated value is the parent's own value times a factor in [0.6, 1.6]", () => {
  const rng = makeRng(7);
  for (let i = 0; i < 20; i++) {
    const { weights, mutatedKey, factor } = mutateWeights(DEFAULT_WEIGHTS, rng);
    assert.ok(factor >= 0.6 && factor <= 1.6, `factor ${factor} out of range`);
    assert.ok(Math.abs(weights[mutatedKey] - DEFAULT_WEIGHTS[mutatedKey] * factor) < 1e-3, "within the function's own deliberate 4-decimal-place rounding");
  }
});

test("mutateWeights: never mutates the input object", () => {
  const original = { ...DEFAULT_WEIGHTS };
  mutateWeights(DEFAULT_WEIGHTS, makeRng(3));
  assert.deepEqual(DEFAULT_WEIGHTS, original);
});

test("mutateWeights: deterministic — the SAME rng seed produces the SAME real mutation, every time", () => {
  const a = mutateWeights(DEFAULT_WEIGHTS, makeRng(99));
  const b = mutateWeights(DEFAULT_WEIGHTS, makeRng(99));
  assert.equal(a.mutatedKey, b.mutatedKey);
  assert.equal(a.factor, b.factor);
});

test("mutateWeights: throws on an incomplete parent — never silently mutates a broken weights object", () => {
  const broken = { ...DEFAULT_WEIGHTS };
  delete broken.closing;
  assert.throws(() => mutateWeights(broken, makeRng(1)), /missing \[closing\]/);
});

// --- mutateWeights: excludeKeys (design doc §49, 2026-09-01 — resource/objective proven inert for
// the default roster: real code reading found resource only ever multiplies against a strike's own
// usesRemaining, which no fixture in this roster ever sets, and objective only ever applies to a
// combatant with a real .objective field, which nothing in this roster/scenario builder ever sets) ---

test("mutateWeights: excludeKeys — across many real draws, an excluded key is NEVER selected", () => {
  const rng = makeRng(1);
  const seen = new Set();
  for (let i = 0; i < 300; i++) {
    const { mutatedKey } = mutateWeights(DEFAULT_WEIGHTS, rng, ["resource", "objective"]);
    seen.add(mutatedKey);
  }
  assert.equal(seen.has("resource"), false);
  assert.equal(seen.has("objective"), false);
  assert.ok(seen.size > 5, "the other 11 keys must still be real, reachable draws");
});

test("mutateWeights: an empty excludeKeys array (the default) behaves byte-identically to omitting the argument entirely", () => {
  const a = mutateWeights(DEFAULT_WEIGHTS, makeRng(9));
  const b = mutateWeights(DEFAULT_WEIGHTS, makeRng(9), []);
  assert.deepEqual(a, b);
});

test("mutateWeights: excludeKeys covering every real key throws a real, clear error rather than silently drawing undefined", () => {
  assert.throws(() => mutateWeights(DEFAULT_WEIGHTS, makeRng(1), Object.keys(DEFAULT_WEIGHTS)), /nothing left to mutate/);
});

test("PROVEN_INERT_FOR_DEFAULT_ROSTER: exactly the three weights confirmed inert (resource, objective, tempoDenial) — NOT mobilityDenial or outnumberedCaution, which are real but merely non-decisive", () => {
  assert.deepEqual([...PROVEN_INERT_FOR_DEFAULT_ROSTER].sort(), ["objective", "resource", "tempoDenial"]);
  assert.ok(!PROVEN_INERT_FOR_DEFAULT_ROSTER.includes("mobilityDenial"), "mobilityDenial is real and responsive, not proven inert — must not be excluded");
  assert.ok(!PROVEN_INERT_FOR_DEFAULT_ROSTER.includes("outnumberedCaution"), "outnumberedCaution is real and responsive, not proven inert — must not be excluded");
});

test("runWeightSearch: excludeKeys threads through to every real generation — an excluded key never appears as mutatedKey across a real multi-generation search", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 6, seedSpec: "1-4", searchSeed: 3,
    excludeKeys: ["resource", "objective"]
  });
  assert.equal(result.history.length, 6);
  for (const entry of result.history) {
    assert.notEqual(entry.mutatedKey, "resource");
    assert.notEqual(entry.mutatedKey, "objective");
  }
});

// --- mutateWeightsTogether (design doc §49, 2026-09-01 — "run a targeted search on closing and
// enemyDamage together": single-key mutation structurally can't find a correlated two-term
// improvement, so a real targeted-search primitive was needed, not a one-off hardcoded script) ---

test("mutateWeightsTogether: mutates EXACTLY the given keys, each with its OWN independently-drawn factor, everything else untouched", () => {
  const rng = makeRng(1);
  const { weights, mutatedKeys, factors } = mutateWeightsTogether(DEFAULT_WEIGHTS, rng, ["closing", "enemyDamage"]);
  assert.deepEqual(mutatedKeys, ["closing", "enemyDamage"]);
  assert.equal(Object.keys(factors).length, 2);
  assert.notEqual(factors.closing, factors.enemyDamage, "each key must draw its OWN factor, not share one");
  assert.ok(Math.abs(weights.closing - DEFAULT_WEIGHTS.closing * factors.closing) < 1e-3);
  assert.ok(Math.abs(weights.enemyDamage - DEFAULT_WEIGHTS.enemyDamage * factors.enemyDamage) < 1e-3);
  const untouched = Object.keys(DEFAULT_WEIGHTS).filter((k) => k !== "closing" && k !== "enemyDamage");
  for (const key of untouched) assert.equal(weights[key], DEFAULT_WEIGHTS[key], `${key} must be byte-identical to the parent`);
});

test("mutateWeightsTogether: never mutates the input object, and returns a real complete weights object", () => {
  const original = { ...DEFAULT_WEIGHTS };
  const { weights } = mutateWeightsTogether(DEFAULT_WEIGHTS, makeRng(1), ["closing"]);
  assert.deepEqual(DEFAULT_WEIGHTS, original);
  assert.doesNotThrow(() => assertCompleteWeights(weights));
});

test("mutateWeightsTogether: deterministic — the SAME rng seed produces the SAME real per-key factors every time", () => {
  const a = mutateWeightsTogether(DEFAULT_WEIGHTS, makeRng(42), ["closing", "enemyDamage"]);
  const b = mutateWeightsTogether(DEFAULT_WEIGHTS, makeRng(42), ["closing", "enemyDamage"]);
  assert.deepEqual(a.factors, b.factors);
});

test("mutateWeightsTogether: throws on an empty targetKeys array — mutating nothing is a config error", () => {
  assert.throws(() => mutateWeightsTogether(DEFAULT_WEIGHTS, makeRng(1), []), /non-empty array/);
});

test("mutateWeightsTogether: throws on a key that isn't a real weight — never silently no-ops on a typo", () => {
  assert.throws(() => mutateWeightsTogether(DEFAULT_WEIGHTS, makeRng(1), ["closing", "notARealWeight"]), /not real weight keys: \[notARealWeight\]/);
});

test("runWeightSearch: targetKeys threads through — every real generation mutates EXACTLY the target set together, never a single random key", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 4, seedSpec: "1-4", searchSeed: 2,
    targetKeys: ["closing", "enemyDamage"]
  });
  assert.equal(result.history.length, 4);
  for (const entry of result.history) {
    assert.deepEqual(entry.mutatedKeys, ["closing", "enemyDamage"]);
    assert.equal(Object.keys(entry.factors).length, 2);
    // Singular mutatedKey/factor are single-key-mode-only — must be undefined in targeted mode,
    // an honest signal rather than a misleading "first key only" guess.
    assert.equal(entry.mutatedKey, undefined);
    assert.equal(entry.factor, undefined);
  }
});

test("runWeightSearch: targeted-mode resume fast-forwards correctly too — a real 2-key targeted search resumed after 2 generations matches an uninterrupted 4-generation run byte-for-byte on generations 3-4", async () => {
  const opts = { archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], seedSpec: "1-4", searchSeed: 5, targetKeys: ["closing", "enemyDamage"], frozenAtDate: "2026-09-01" };
  const straightThrough = await runWeightSearch({ ...opts, generations: 4 });
  const firstHalf = await runWeightSearch({ ...opts, generations: 2 });
  const resumed = await runWeightSearch({ ...opts, generations: 4, resumeState: { league: firstHalf.league, completedGenerations: firstHalf.history.length } });
  assert.equal(resumed.history.length, 2);
  assert.deepEqual(
    resumed.history.map((e) => [e.generation, e.factors, e.verdict.promoted]),
    straightThrough.history.slice(2).map((e) => [e.generation, e.factors, e.verdict.promoted])
  );
});

// --- makeCandidateProfile ---

test("makeCandidateProfile: real id/weights from the call, everything else inherited from the parent, frozenAt null and provenance 'search-candidate' — not yet a real checkpoint", () => {
  const { weights } = mutateWeights(BASELINE_V1.weights, makeRng(1));
  const candidate = makeCandidateProfile(BASELINE_V1, weights, "candidate-test");
  assert.equal(candidate.id, "candidate-test");
  assert.equal(candidate.weights, weights);
  assert.equal(candidate.frozenAt, null);
  assert.equal(candidate.provenance, "search-candidate");
  assert.equal(candidate.competence, BASELINE_V1.competence);
  assert.deepEqual([...candidate.templates], [...BASELINE_V1.templates]);
  assert.ok(Object.isFrozen(candidate));
});

// --- shouldPromote: synthetic win-rate data, every branch ---

test("shouldPromote: promotes when EVERY league result clears the threshold AND a real majority of archetypes are beaten", () => {
  const verdict = shouldPromote({
    league: [{ opponentId: "baseline-v1", winRate: 0.6 }],
    archetypes: [{ opponentId: "a", winRate: 0.7 }, { opponentId: "b", winRate: 0.4 }, { opponentId: "c", winRate: 0.55 }]
  });
  assert.equal(verdict.promoted, true);
  assert.equal(verdict.leaguePass, true);
  assert.equal(verdict.archetypePass, true);
  assert.equal(verdict.archetypeWins, 2);
});

test("shouldPromote: rejects when even ONE league member is below threshold, regardless of how well it does against archetypes (risk-2 fix — no cycling past a real past checkpoint)", () => {
  const verdict = shouldPromote({
    league: [{ opponentId: "baseline-v1", winRate: 0.6 }, { opponentId: "search-checkpoint-1", winRate: 0.5 }],
    archetypes: [{ opponentId: "a", winRate: 0.9 }, { opponentId: "b", winRate: 0.9 }]
  });
  assert.equal(verdict.promoted, false);
  assert.equal(verdict.leaguePass, false);
});

test("shouldPromote: rejects when the league passes but the archetype pool majority fails (risk-3 fix — no overfitting to just the checkpoints)", () => {
  const verdict = shouldPromote({
    league: [{ opponentId: "baseline-v1", winRate: 0.9 }],
    archetypes: [{ opponentId: "a", winRate: 0.3 }, { opponentId: "b", winRate: 0.4 }, { opponentId: "c", winRate: 0.2 }]
  });
  assert.equal(verdict.promoted, false);
  assert.equal(verdict.leaguePass, true);
  assert.equal(verdict.archetypePass, false);
  assert.equal(verdict.archetypeWins, 0);
});

test("shouldPromote: an empty archetype pool passes that half vacuously — league is still the real gate", () => {
  const verdict = shouldPromote({ league: [{ opponentId: "baseline-v1", winRate: 0.6 }], archetypes: [] });
  assert.equal(verdict.archetypePass, true);
  assert.equal(verdict.promoted, true);
});

test("shouldPromote: an empty league NEVER promotes — a candidate must be measured against something real", () => {
  const verdict = shouldPromote({ league: [], archetypes: [{ opponentId: "a", winRate: 0.9 }] });
  assert.equal(verdict.leaguePass, false);
  assert.equal(verdict.promoted, false);
});

test("shouldPromote: custom thresholds are honored, not just the DEFAULT_PROMOTION_OPTIONS", () => {
  const results = { league: [{ opponentId: "baseline-v1", winRate: 0.52 }], archetypes: [] };
  assert.equal(shouldPromote(results, DEFAULT_PROMOTION_OPTIONS).promoted, false, "0.52 fails the real default 0.55 bar");
  assert.equal(shouldPromote(results, { leagueWinRateThreshold: 0.5 }).promoted, true, "0.52 clears a lowered 0.5 bar");
});

// --- Real integration: evaluateCandidate / runWeightSearch, small and fast ---

const SMALL_ARCHETYPE_POOL = [MINDLESS_V1, ZEALOT_V1];

test("evaluateCandidate: real mirror tournaments against every league member AND every archetype, real win rates in [0,1]", async () => {
  const results = await evaluateCandidate(BASELINE_V1, { league: [BASELINE_V1], archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], seedSpec: "1-4" });
  assert.equal(results.league.length, 1);
  assert.equal(results.archetypes.length, 2);
  for (const r of [...results.league, ...results.archetypes]) {
    assert.ok(r.winRate >= 0 && r.winRate <= 1);
    assert.equal(r.n, 4);
  }
});

test("runWeightSearch: real, small search runs end to end — league always starts with startProfile, grows only on a real promotion, history has one entry per generation", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 2, seedSpec: "1-4", searchSeed: 1, frozenAtDate: "2026-08-31"
  });
  assert.equal(result.history.length, 2);
  assert.equal(result.league[0], BASELINE_V1);
  assert.ok(result.league.length >= 1);
  for (const entry of result.history) {
    assert.ok(isRealWeightKey(entry.mutatedKey));
    assert.equal(typeof entry.verdict.promoted, "boolean");
  }
});

function isRealWeightKey(key) {
  return Object.prototype.hasOwnProperty.call(DEFAULT_WEIGHTS, key);
}

test("runWeightSearch: reproducible — the SAME searchSeed produces the SAME real generation-by-generation outcome (same mutated keys, same verdicts)", async () => {
  const opts = { archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 2, seedSpec: "1-4", searchSeed: 42, frozenAtDate: "2026-08-31" };
  const a = await runWeightSearch(opts);
  const b = await runWeightSearch(opts);
  assert.deepEqual(a.history.map((e) => [e.mutatedKey, e.factor, e.verdict.promoted]), b.history.map((e) => [e.mutatedKey, e.factor, e.verdict.promoted]));
});

// GH #141 (decide.mjs's own bestMatching fix, personnel-engine): re-widened from seedSpec "1-4" to
// "1-20" — confirmed directly, a LITERAL BASELINE_V1-vs-itself mirror match on this exact roster
// scores winRate=0 at just 4 seeds but a sane 0.5 at 20 (pure small-sample variance, not a real
// asymmetry). GH #141's fix legitimately makes decide() play less randomly, which shifted which
// specific games these 4 particular seeds produce — a pre-existing seed-count fragility this test's
// own "all-but-guaranteed" premise never actually accounted for, now exposed rather than caused.
test("runWeightSearch: with a deliberately low promotion bar, a real candidate DOES get promoted — proving the promotion code path itself fires on real data, not just on synthetic shouldPromote input", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 3, seedSpec: "1-20", searchSeed: 1, frozenAtDate: "2026-08-31",
    promotionOptions: { leagueWinRateThreshold: 0.01, archetypeMajorityThreshold: 0 }
  });
  const anyPromoted = result.history.some((e) => e.verdict.promoted);
  assert.ok(anyPromoted, "an all-but-guaranteed promotion bar must actually produce at least one real promotion across 3 generations");
  assert.ok(result.league.length > 1, "a real promotion must actually grow the league");
  assert.notEqual(result.finalBest.id, BASELINE_V1.id, "finalBest must have actually moved off the starting profile");
  assert.equal(result.finalBest.frozenAt, "2026-08-31");
  assert.equal(result.finalBest.provenance, "search-checkpoint");
});

// --- confirmSeedSpec: the real Chain B fix (design doc §55/#2 — a 36-member league built entirely
// from small-sample noise; both the first and the most-mutated "promoted" candidate lost to plain
// baseline-v1 once re-checked at n=24). All four tests below force their outcome with a deliberately
// easy or deliberately impossible promotionOptions bar (the SAME technique the test above already
// uses), never by hunting for a real statistical fluke — the point is proving the ORCHESTRATION is
// correct (confirmation runs when and only when it should, and correctly gates promotion), using real
// battles throughout.

// GH #141: widened seedSpec, same reason as the test just above — see its own comment.
test("runWeightSearch: confirmSeedSpec omitted (the default) — confirmResults/confirmVerdict stay null on every entry, promotion decided by the cheap pass alone, byte-identical to before this option existed", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 3, seedSpec: "1-20", searchSeed: 1, frozenAtDate: "2026-08-31",
    promotionOptions: { leagueWinRateThreshold: 0.01, archetypeMajorityThreshold: 0 }
  });
  assert.ok(result.history.some((e) => e.promotedId), "sanity check: this bar must still produce a real promotion");
  for (const e of result.history) {
    assert.equal(e.confirmResults, null);
    assert.equal(e.confirmVerdict, null);
  }
});

// GH #141: widened seedSpec/confirmSeedSpec (non-overlapping ranges preserved), same reason as
// this file's own first GH #141 comment above.
test("runWeightSearch: confirmSeedSpec set — a candidate that clears BOTH the cheap and confirm bars is promoted, with a real confirmVerdict recorded", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 1, seedSpec: "1-20", searchSeed: 1, frozenAtDate: "2026-08-31",
    promotionOptions: { leagueWinRateThreshold: 0.01, archetypeMajorityThreshold: 0 },
    confirmSeedSpec: "21-40"
  });
  const promoted = result.history.find((e) => e.promotedId);
  assert.ok(promoted, "an all-but-guaranteed bar on BOTH stages must still produce a real promotion");
  assert.ok(promoted.confirmResults, "confirmation must have actually run for a candidate that cleared the cheap stage");
  assert.equal(promoted.confirmVerdict.promoted, true);
  assert.equal(result.league.at(-1).id, promoted.promotedId, "the confirmed candidate must be the one that actually joined the league");
});

// GH #141: widened seedSpec/confirmSeedSpec, same reason as this file's own first GH #141 comment above.
test("runWeightSearch: confirmSeedSpec set — a candidate that clears the cheap bar but FAILS an impossible confirm bar is REJECTED, distinctly from an outright cheap-stage rejection", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 3, seedSpec: "1-20", searchSeed: 1, frozenAtDate: "2026-08-31",
    promotionOptions: { leagueWinRateThreshold: 0.01, archetypeMajorityThreshold: 0 }, // trivially easy — cheap stage should pass
    confirmSeedSpec: "21-40",
    confirmPromotionOptions: { leagueWinRateThreshold: 1.01, archetypeMajorityThreshold: 0 } // impossible — confirm stage can never pass
  });
  const cheapPassed = result.history.filter((e) => e.verdict.promoted);
  assert.ok(cheapPassed.length > 0, "sanity check: the easy cheap bar must actually be cleared at least once");
  for (const e of cheapPassed) {
    assert.ok(e.confirmResults, "confirmation must have run for every cheap-stage pass");
    assert.equal(e.confirmVerdict.promoted, false, "the impossible confirm bar must never actually pass");
    assert.equal(e.promotedId, null, "a candidate that fails confirmation must NOT be promoted");
  }
  assert.equal(result.league.length, 1, "the league must never grow when every confirmation fails");
  assert.equal(result.finalBest.id, BASELINE_V1.id, "finalBest must stay at the real starting profile — nothing was ever actually promoted");
});

test("runWeightSearch: confirmSeedSpec set — confirmation is never attempted for a candidate that fails the cheap stage, saving the extra real battery", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 3, seedSpec: "1-4", searchSeed: 1, frozenAtDate: "2026-08-31",
    promotionOptions: { leagueWinRateThreshold: 1.01, archetypeMajorityThreshold: 0 }, // impossible — cheap stage can never pass
    confirmSeedSpec: "5-8"
  });
  assert.ok(result.history.every((e) => !e.verdict.promoted), "sanity check: the impossible cheap bar must reject every generation");
  for (const e of result.history) {
    assert.equal(e.confirmResults, null, "confirmation must never run for a candidate that never cleared the cheap stage");
    assert.equal(e.confirmVerdict, null);
  }
});

// --- deadlineAt: the real wall-clock safety valve (a growing league makes later generations more
// expensive, so an uncapped run needs a real way to stop rather than running unpredictably long) ---

test("runWeightSearch: an ALREADY-PASSED deadlineAt stops immediately — zero generations run, stoppedEarly true", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 5, seedSpec: "1-4", searchSeed: 1,
    deadlineAt: Date.now()
  });
  assert.equal(result.history.length, 0);
  assert.equal(result.stoppedEarly, true);
  assert.equal(result.finalBest.id, BASELINE_V1.id, "nothing ran, so finalBest must still be the real starting profile");
});

test("runWeightSearch: a real generous deadline never trips — stoppedEarly false, every requested generation runs", async () => {
  const result = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 2, seedSpec: "1-4", searchSeed: 1,
    deadlineAt: Date.now() + 5 * 60000
  });
  assert.equal(result.history.length, 2);
  assert.equal(result.stoppedEarly, false);
});

test("runWeightSearch: omitting deadlineAt entirely behaves exactly like the pre-existing no-deadline path — never stops early", async () => {
  const result = await runWeightSearch({ archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], generations: 2, seedSpec: "1-4", searchSeed: 1 });
  assert.equal(result.history.length, 2);
  assert.equal(result.stoppedEarly, false);
});

// --- resumeState: the real fix for a real incident — a genuine ~3-hour overnight run was killed at
// generation 187/2000 by an unrelated machine restart. The one property that actually matters: a
// search interrupted and resumed must produce EXACTLY the same subsequent generations an uninterrupted
// run would have — same mutated key, same factor, same verdict — not merely "a plausible continuation".

test("runWeightSearch: resuming from a checkpoint produces BYTE-IDENTICAL subsequent generations to an uninterrupted run — the real RNG-fast-forward correctness proof", async () => {
  const baseOpts = { archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], seedSpec: "1-4", searchSeed: 7, frozenAtDate: "2026-08-31" };

  const straightThrough = await runWeightSearch({ ...baseOpts, generations: 4 });

  const firstHalf = await runWeightSearch({ ...baseOpts, generations: 2 });
  const resumed = await runWeightSearch({
    ...baseOpts, generations: 4,
    resumeState: { league: firstHalf.league, completedGenerations: firstHalf.history.length }
  });

  assert.equal(resumed.history.length, 2, "only the REMAINING generations run after resume, not all 4 again");
  assert.deepEqual(
    resumed.history.map((e) => [e.generation, e.mutatedKey, e.factor, e.verdict.promoted]),
    straightThrough.history.slice(2).map((e) => [e.generation, e.mutatedKey, e.factor, e.verdict.promoted]),
    "resumed generations 3-4 must exactly match what the uninterrupted run did for its own generations 3-4"
  );
  assert.equal(resumed.finalBest.id, straightThrough.finalBest.id);
  assert.deepEqual(resumed.league.map((p) => p.id), straightThrough.league.map((p) => p.id));
});

// GH #141: widened seedSpec, same reason as this file's own first GH #141 comment above.
test("runWeightSearch: resumeState restores the league verbatim — a resumed search is evaluated against the SAME opponents an uninterrupted run would have accumulated", async () => {
  const lowBar = { leagueWinRateThreshold: 0.01, archetypeMajorityThreshold: 0 };
  const firstHalf = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], seedSpec: "1-20", searchSeed: 1, generations: 2,
    frozenAtDate: "2026-08-31", promotionOptions: lowBar
  });
  assert.ok(firstHalf.league.length > 1, "this low a bar must have promoted something to make the check below meaningful");

  const resumed = await runWeightSearch({
    archetypePool: SMALL_ARCHETYPE_POOL, roster: ["lunar-17.json"], seedSpec: "1-20", searchSeed: 1, generations: 3,
    frozenAtDate: "2026-08-31", promotionOptions: lowBar,
    resumeState: { league: firstHalf.league, completedGenerations: 2 }
  });
  const opponentIdsFacedGen3 = resumed.history[0].results.league.map((r) => r.opponentId);
  assert.deepEqual(opponentIdsFacedGen3, firstHalf.league.map((p) => p.id), "generation 3 must face the exact league the interrupted run had already built, not just the original starting profile");
});
