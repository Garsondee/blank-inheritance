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
import { collectTacticalMetrics, focusFireStats, threatPriorityStats, coverUsageStats, sideOutcomeStats, spearman, maneuverConversionStats } from "../../tools/battle-simulator/analysis/tactical-metrics.mjs";
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
  for (const key of ["focusFire", "mapDiscipline", "oscillation", "resourceUse", "threatPriority", "engagement", "coverUsage", "abilityCoverage"]) {
    assert.ok(m[key] !== undefined, `missing metric family: ${key}`);
  }
  assert.equal(m.resourceUse.tracked, 0, "mirror units carry no limited-use options");
  assert.ok(m.engagement.totalDamage >= 0);
});

// GH #57 (design doc §78): abilityCoverageStats is genuinely cross-scale — Frame logs have no
// saveAttack/conditionSave/areaAttack/healAbility action types and no slotRank concept at all, so
// every one of its branches must degrade to its own already-established empty/null-safe case rather
// than assuming personnel-only fields exist.
test("abilityCoverageStats: runs clean against a real Frame-scale battle — no crash, no false unmatched/over-use on fields Frame never sets", () => {
  const log = runBattle(ARCHETYPES.mirror({ seed: 7005, roundLimit: 4 }));
  const cov = collectTacticalMetrics(log).abilityCoverage;
  assert.equal(cov.unmatched.length, 0, `Frame-scale strikeName/reactionName should always match a declared ability: ${JSON.stringify(cov.unmatched)}`);
  assert.equal(cov.overUsed.length, 0, "the mirror archetype's own combatants carry no usesPerEncounter/slotRank abilities");
  assert.ok(cov.abilities.length > 0, "Frame combatants still declare real strikes — the report should not come back empty");
});

// REGRESSION (design doc §39, found while building coverUsageStats): ATTACK_TYPES predated
// saveAttack (§22) and areaAttack (§38) entirely — a combatant whose real damage comes from a
// thrown grenade was invisible to focus-fire/threat-priority tracking. Proven with a hand-built log
// (the actual fix is inside tactical-metrics.mjs's own module-private ATTACK_TYPES, not directly
// importable, so this proves it via the two PUBLIC functions that read it).
test("METRIC VALIDATION (design doc §39 regression): focusFireStats and threatPriorityStats now count saveAttack, not just strike/spellAttack", () => {
  const log = {
    roster: { a: { side: "party", strikes: [] }, x: { side: "opposition", strikes: [] } },
    rounds: [{ round: 1, turns: [{ combatantId: "a", actions: [
      { type: "saveAttack", legal: true, targetId: "x", targetHPAfter: 10 },
      { type: "saveAttack", legal: true, targetId: "x", targetHPAfter: 0 } // finished it — no switch to flag
    ] }] }]
  };
  assert.equal(focusFireStats(log).consecutiveAttackPairs, 1, "saveAttack must be counted as a real attack by focusFireStats");
  assert.equal(threatPriorityStats(log, { side: "party" }).totalAttacks, 2, "both saveAttacks must be counted as attacks received by threatPriorityStats");
});

// --- sideOutcomeStats (design doc §39 — "track both end HP and HP damaged / healed") ---

test("METRIC VALIDATION — sideOutcomeStats: sums real damage/healing for the requested side only, and reports final HP from the LATEST targetHPAfter seen per combatant", () => {
  const roster = {
    "p-1": { side: "party", maxHP: 20 },
    "p-2": { side: "party", maxHP: 15 },
    "o-1": { side: "opposition", maxHP: 25 }
  };
  const log = {
    roster,
    rounds: [
      { round: 1, turns: [{ combatantId: "o-1", actions: [
        { type: "strike", legal: true, targetId: "p-1", damageApplied: 6, targetHPAfter: 14 }
      ] }] },
      { round: 2, turns: [
        { combatantId: "o-1", actions: [{ type: "strike", legal: true, targetId: "p-1", damageApplied: 4, targetHPAfter: 10 }] },
        { combatantId: "p-2", actions: [{ type: "healAbility", legal: true, targetId: "p-1", healing: 3, targetHPAfter: 13 }] }
      ] }
    ]
  };
  const party = sideOutcomeStats(log, "party");
  assert.equal(party.maxHP, 35, "20 + 15");
  assert.equal(party.damageTaken, 10, "6 + 4 — only damage landing on a party target counts");
  assert.equal(party.healingReceived, 3);
  assert.equal(party.finalHP, 13 + 15, "p-1's LATEST targetHPAfter (13, after the heal) + p-2's untouched maxHP (15)");
  assert.equal(party.finalHPFraction, 28 / 35);

  const opposition = sideOutcomeStats(log, "opposition");
  assert.equal(opposition.damageTaken, 0, "o-1 was never targeted — nothing landed on the opposition side");
  assert.equal(opposition.finalHP, 25, "untouched, still at its own real maxHP");
});

test("METRIC VALIDATION — sideOutcomeStats: a real areaAttack's multi-target `affected[]` array is counted the same as any single-target hit", () => {
  const roster = { "p-1": { side: "party", maxHP: 20 }, "p-2": { side: "party", maxHP: 20 } };
  const log = {
    roster,
    rounds: [{ round: 1, turns: [{ combatantId: "enemy", actions: [
      { type: "areaAttack", legal: true, originId: "p-1", affected: [
        { targetId: "p-1", appliedDamage: 5, targetHPAfter: 15 },
        { targetId: "p-2", appliedDamage: 2, targetHPAfter: 18 }
      ] }
    ] }] }]
  };
  const party = sideOutcomeStats(log, "party");
  assert.equal(party.damageTaken, 7, "5 + 2 across both creatures caught in the same blast");
  assert.equal(party.finalHP, 15 + 18);
});

// --- coverUsageStats (design doc §39 — Ingram's own question: "Does the cover mechanic actually
// work rules as written? Are the participants actually using it?") ---

test("METRIC VALIDATION — coverUsageStats: moveIntoCoverRate detects a move that lands somewhere with real cover from a living enemy, and does not false-positive on one that doesn't", () => {
  const walls = [{ c: [5, 0, 5, 10], cover: true }]; // a vertical cover wall at col 5
  const roster = { mover: { side: "party" }, enemy: { side: "opposition" } };
  const coveredMove = {
    roster, walls,
    rounds: [{ round: 1, turns: [{ combatantId: "mover", snapshot: { mover: { position: { col: 4, row: 5 }, currentHP: 10 }, enemy: { position: { col: 10, row: 5 }, currentHP: 10 } }, actions: [
      { type: "move", legal: true, to: { col: 4, row: 5 } } // same side of the wall as... wait see next test for the "not covered" contrast
    ] }] }]
  };
  const openMove = {
    roster, walls,
    rounds: [{ round: 1, turns: [{ combatantId: "mover", snapshot: { mover: { position: { col: 10, row: 5 }, currentHP: 10 }, enemy: { position: { col: 10, row: 6 }, currentHP: 10 } }, actions: [
      { type: "move", legal: true, to: { col: 10, row: 5 } } // same side of the wall as the enemy — no cover between them
    ] }] }]
  };
  assert.equal(coverUsageStats(coveredMove).moveIntoCoverRate, 1, "the wall at col 5 sits directly between (4,5) and the enemy at (10,5) — must count as cover");
  assert.equal(coverUsageStats(openMove).moveIntoCoverRate, 0, "both combatants are on the same side of the wall — no cover, must not false-positive");
});

test("METRIC VALIDATION — coverUsageStats: a dead enemy's position never counts toward moveIntoCoverRate", () => {
  const walls = [{ c: [5, 0, 5, 10], cover: true }];
  const roster = { mover: { side: "party" }, enemy: { side: "opposition" } };
  const log = {
    roster, walls,
    rounds: [{ round: 1, turns: [{ combatantId: "mover", snapshot: { mover: { position: { col: 4, row: 5 }, currentHP: 10 }, enemy: { position: { col: 10, row: 5 }, currentHP: 0 } }, actions: [
      { type: "move", legal: true, to: { col: 4, row: 5 } }
    ] }] }]
  };
  assert.equal(coverUsageStats(log).moveIntoCoverRate, 0, "the only enemy is dead — nothing to take cover FROM, must not count");
});

test("METRIC VALIDATION — coverUsageStats: attackFromCoverRate reads the real, already-logged coverBonus field — ranged strikes only, melee excluded via the roster's own strikeType", () => {
  const roster = {
    shooter: { side: "party", strikes: [{ name: "Rifle", strikeType: "ranged" }, { name: "Knife", strikeType: "melee" }] }
  };
  const log = {
    roster, walls: [],
    rounds: [{ round: 1, turns: [{ combatantId: "shooter", snapshot: {}, actions: [
      { type: "strike", legal: true, strikeName: "Rifle", coverBonus: 2 },  // ranged, from cover
      { type: "strike", legal: true, strikeName: "Rifle", coverBonus: 0 },  // ranged, NOT from cover
      { type: "strike", legal: true, strikeName: "Knife", coverBonus: 2 },  // melee — excluded regardless of coverBonus
      { type: "saveAttack", legal: true, coverBonus: 2 }                    // saveAttack has no strikeType concept — always counted
    ] }] }]
  };
  const stats = coverUsageStats(log);
  assert.equal(stats.attacksTotal, 3, "2 ranged strikes + 1 saveAttack — the melee Knife strike must be excluded");
  assert.equal(stats.attacksFromCover, 2);
  assert.equal(stats.attackFromCoverRate, 2 / 3);
});

test("coverUsageStats: returns null rates (not NaN or a crash) when a combatant never moved or never attacked", () => {
  const roster = { a: { side: "party" } };
  const log = { roster, walls: [], rounds: [{ round: 1, turns: [{ combatantId: "a", snapshot: {}, actions: [] }] }] };
  const stats = coverUsageStats(log);
  assert.equal(stats.moveIntoCoverRate, null);
  assert.equal(stats.attackFromCoverRate, null);
  assert.deepEqual(stats.combatants, [], "a turn with zero real moves/attacks never even creates a per-combatant record");
});

// --- maneuverConversionStats (design doc §43, Stage 2 — the tactical-planning report's own ask:
// "the question is whether an ally actually cashed in on the setup before it expired") ---

test("METRIC VALIDATION — maneuverConversionStats: a successful Trip followed by a real Strike against the SAME target, same side, counts as converted", () => {
  const roster = { tripper: { side: "party" }, target: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [{ round: 1, turns: [{ combatantId: "tripper", snapshot: {}, actions: [
      { type: "trip", legal: true, targetId: "target", targetProneAfter: true },
      { type: "strike", legal: true, targetId: "target" }
    ] }] }]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.trip.attempts, 1);
  assert.equal(stats.trip.converted, 1);
  assert.equal(stats.trip.conversionRate, 1);
});

test("METRIC VALIDATION — maneuverConversionStats: a successful Trip where the target Stands back up before anyone attacks it counts as UNconverted", () => {
  const roster = { tripper: { side: "party" }, target: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [{ round: 1, turns: [
      { combatantId: "tripper", snapshot: {}, actions: [{ type: "trip", legal: true, targetId: "target", targetProneAfter: true }] },
      { combatantId: "target", snapshot: {}, actions: [{ type: "stand", legal: true }] },
      { combatantId: "tripper", snapshot: {}, actions: [{ type: "strike", legal: true, targetId: "target" }] } // too late — already standing
    ] }]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.trip.attempts, 1);
  assert.equal(stats.trip.converted, 0, "Stand closes the window — a later Strike must not retroactively count");
});

test("METRIC VALIDATION — maneuverConversionStats: an ALLY (not the tripper) cashing in still counts — matches design doc §42's own setupValue framing", () => {
  const roster = { tripper: { side: "party" }, ally: { side: "party" }, target: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [{ round: 1, turns: [
      { combatantId: "tripper", snapshot: {}, actions: [{ type: "trip", legal: true, targetId: "target", targetProneAfter: true }] },
      { combatantId: "ally", snapshot: {}, actions: [{ type: "strike", legal: true, targetId: "target" }] }
    ] }]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.trip.converted, 1, "an ally on the SAME side capitalizing on the setup is a real conversion, not just the tripper's own follow-up");
});

test("METRIC VALIDATION — maneuverConversionStats: an ENEMY attacking the prone target does NOT count as conversion — only the maneuvering side's own follow-up counts", () => {
  const roster = { tripper: { side: "party" }, target: { side: "opposition" }, targetAlly: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [{ round: 1, turns: [
      { combatantId: "tripper", snapshot: {}, actions: [{ type: "trip", legal: true, targetId: "target", targetProneAfter: true }] },
      { combatantId: "targetAlly", snapshot: {}, actions: [{ type: "strike", legal: true, targetId: "target" }] } // friendly fire from the TARGET's own side — not a real conversion
    ] }]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.trip.converted, 0);
});

test("METRIC VALIDATION — maneuverConversionStats: a successful Grapple followed by a real attack before it expires counts as converted", () => {
  const roster = { grappler: { side: "party" }, target: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [{ round: 1, turns: [{ combatantId: "grappler", snapshot: {}, actions: [
      { type: "grapple", legal: true, targetId: "target", targetGrappledAfter: { attackerId: "grappler", state: "grabbed", expiresEndOfRound: 3 } },
      { type: "strike", legal: true, targetId: "target" }
    ] }] }]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.grapple.attempts, 1);
  assert.equal(stats.grapple.converted, 1);
});

test("METRIC VALIDATION — maneuverConversionStats: a Grapple that naturally expires (real expiresEndOfRound passing) before any follow-up counts as UNconverted", () => {
  const roster = { grappler: { side: "party" }, target: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [
      { round: 1, turns: [{ combatantId: "grappler", snapshot: {}, actions: [
        { type: "grapple", legal: true, targetId: "target", targetGrappledAfter: { attackerId: "grappler", state: "grabbed", expiresEndOfRound: 1 } }
      ] }] },
      { round: 2, turns: [{ combatantId: "grappler", snapshot: {}, actions: [{ type: "strike", legal: true, targetId: "target" }] }] } // round 2 — after the real expiresEndOfRound:1 timer
    ]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.grapple.converted, 0, "the Strike lands a round after the real, logged expiry — must not count");
});

test("METRIC VALIDATION — maneuverConversionStats: an Escape that actually frees the target closes the window early, same as Stand does for Trip", () => {
  const roster = { grappler: { side: "party" }, target: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [{ round: 1, turns: [
      { combatantId: "grappler", snapshot: {}, actions: [{ type: "grapple", legal: true, targetId: "target", targetGrappledAfter: { attackerId: "grappler", state: "grabbed", expiresEndOfRound: 5 } }] },
      { combatantId: "target", snapshot: {}, actions: [{ type: "escape", legal: true, freed: true }] },
      { combatantId: "grappler", snapshot: {}, actions: [{ type: "strike", legal: true, targetId: "target" }] }
    ] }]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.grapple.converted, 0, "a real, successful Escape ends the hold — a later Strike is against a free target, not a converted setup");
});

test("METRIC VALIDATION — maneuverConversionStats: a FAILED Trip/Grapple is never counted as an attempt at all — nothing was set up to convert", () => {
  const roster = { tripper: { side: "party" }, target: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [{ round: 1, turns: [{ combatantId: "tripper", snapshot: {}, actions: [
      { type: "trip", legal: true, targetId: "target", targetProneAfter: false },
      { type: "grapple", legal: true, targetId: "target", targetGrappledAfter: null }
    ] }] }]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.trip.attempts, 0);
  assert.equal(stats.grapple.attempts, 0);
  assert.equal(stats.overall.conversionRate, null, "no attempts at all — null, not NaN or a divide-by-zero");
});

test("METRIC VALIDATION — maneuverConversionStats: Trip's own window has NO round-based timer — a follow-up in a LATER round still converts, since only Stand (or death) ends it", () => {
  const roster = { tripper: { side: "party" }, target: { side: "opposition" } };
  const log = {
    roster, walls: [],
    rounds: [
      { round: 1, turns: [{ combatantId: "tripper", snapshot: {}, actions: [{ type: "trip", legal: true, targetId: "target", targetProneAfter: true }] }] },
      { round: 2, turns: [{ combatantId: "tripper", snapshot: {}, actions: [{ type: "strike", legal: true, targetId: "target" }] }] }
    ]
  };
  const stats = maneuverConversionStats(log);
  assert.equal(stats.trip.converted, 1, "Prone has no natural expiry timer the way Grapple does — it stays converted across a round boundary");
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
