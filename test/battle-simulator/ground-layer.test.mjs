/**
 * Tests for the personnel-scale ground-layer resolver — the piece that
 * replaced a flat "ground team did their job at round 2" assumption with
 * five real kid stat blocks actually rolling against
 * data/subsystems/day-1-ground-layer.json's real DCs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runGroundLayer } from "../../tools/battle-simulator/ground-layer/resolve-ground-layer.mjs";
import { loadGroundTeam } from "../../tools/battle-simulator/ground-layer/load-kids.mjs";

function makeKid(id, overrides = {}) {
  const zeroSkills = Object.fromEntries(
    ["acrobatics", "arcana", "athletics", "computers", "crafting", "deception", "diplomacy", "intimidation",
      "medicine", "nature", "occultism", "performance", "piloting", "religion", "society", "stealth", "survival", "thievery"]
      .map((s) => [s, { rank: "untrained", modifier: 0 }])
  );
  return {
    id, name: id,
    skills: zeroSkills,
    perception: { proficiency: { rank: "untrained", modifier: 0 } },
    savingThrows: { fortitude: { rank: "untrained", modifier: 0 }, reflex: { rank: "untrained", modifier: 0 }, will: { rank: "untrained", modifier: 0 } },
    ...overrides
  };
}

test("loadGroundTeam: loads exactly the five non-piloting kid fixtures, never the Frame pilot", () => {
  const kids = loadGroundTeam();
  assert.equal(kids.length, 5);
  assert.ok(kids.every((k) => k.id !== "test-fixture-frame-pilot"));
  assert.ok(kids.every((k) => k.type === "kid" && k.skills && k.perception));
});

test("runGroundLayer: deterministic for a fixed seed", () => {
  const kids = loadGroundTeam();
  const a = runGroundLayer({ kids, seed: 42 });
  const b = runGroundLayer({ kids, seed: 42 });
  assert.deepEqual(a, b);
});

test("runGroundLayer: different seeds produce real variance, not a fixed outcome", () => {
  const kids = loadGroundTeam();
  const results = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => runGroundLayer({ kids, seed }).finalPools["field-integrity"]);
  assert.ok(new Set(results).size > 1, `expected genuine variance across seeds, got the same field-integrity total every time: ${results}`);
});

test("runGroundLayer: exactly 3 rounds, 5 kid actions + 5 hazard saves per round (15 kid-actions total, matching the subsystem's own math)", () => {
  const kids = loadGroundTeam();
  const log = runGroundLayer({ kids, seed: 1 });
  assert.equal(log.rounds.length, 3);
  let totalKidActions = 0;
  for (const round of log.rounds) {
    assert.equal(round.kidActions.length, 5);
    assert.equal(round.hazardSaves.length, 5);
    totalKidActions += round.kidActions.length;
  }
  assert.equal(totalKidActions, 15);
});

test("runGroundLayer: pool totals only ever increase, and match the sum of pointsGained across all rounds", () => {
  const kids = loadGroundTeam();
  const log = runGroundLayer({ kids, seed: 99 });
  let runningFieldIntegrity = 0;
  let runningShelter = 0;
  for (const round of log.rounds) {
    for (const action of round.kidActions) {
      if (action.poolRef === "field-integrity") runningFieldIntegrity += action.pointsGained;
      if (action.poolRef === "shelter-evacuation") runningShelter += action.pointsGained;
    }
    assert.equal(round.poolsAfter["field-integrity"], runningFieldIntegrity);
    assert.equal(round.poolsAfter["shelter-evacuation"], runningShelter);
  }
  assert.equal(log.finalPools["field-integrity"], runningFieldIntegrity);
  assert.equal(log.finalPools["shelter-evacuation"], runningShelter);
});

test("runGroundLayer: fieldBreaksAtRound is either null or the first round field-integrity actually reached 6+", () => {
  const kids = loadGroundTeam();
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const log = runGroundLayer({ kids, seed });
    if (log.fieldBreaksAtRound === null) {
      assert.ok(log.finalPools["field-integrity"] < 6, `seed ${seed}: fieldBreaksAtRound null but final field-integrity is ${log.finalPools["field-integrity"]} (>=6)`);
    } else {
      assert.ok(log.fieldBreaksAtRound >= 1 && log.fieldBreaksAtRound <= 3);
      const roundLog = log.rounds[log.fieldBreaksAtRound - 1];
      assert.ok(roundLog.poolsAfter["field-integrity"] >= 6, `seed ${seed}: round ${log.fieldBreaksAtRound} claimed as the break round but pool was only ${roundLog.poolsAfter["field-integrity"]}`);
      if (log.fieldBreaksAtRound > 1) {
        const priorRound = log.rounds[log.fieldBreaksAtRound - 2];
        assert.ok(priorRound.poolsAfter["field-integrity"] < 6, `seed ${seed}: round ${log.fieldBreaksAtRound} claimed as the FIRST break round but the prior round was already >=6`);
      }
    }
  }
});

test("runGroundLayer: kids who guarantee a critical success every time reliably break the field within the 2 rounds their lane's math requires", () => {
  const kids = ["a", "b", "c", "d", "e"].map((id) => makeKid(id, {
    skills: Object.fromEntries(Object.keys(makeKid("x").skills).map((s) => [s, { rank: "legendary", modifier: 100 }])),
    perception: { proficiency: { rank: "legendary", modifier: 100 } }
  }));
  const log = runGroundLayer({ kids, seed: 7 });
  // All 5 kids are identically overwhelming, so lane assignment is a tie
  // broken by input order — only 2 (spotCount) end up on Spot regardless.
  // 2 kids x guaranteed critical success (2 points each) = 4 points/round,
  // so round 1 alone (4) can't clear the 6-point target; round 2 (8) does.
  assert.equal(log.fieldBreaksAtRound, 2, "2 guaranteed-crit kids need exactly 2 rounds to clear 6 points at 2 points/round each");
});

test("runGroundLayer: kids with 0 in every relevant skill essentially never break the field (DC 15 vs +0)", () => {
  const kids = ["a", "b", "c", "d", "e"].map((id) => makeKid(id));
  const log = runGroundLayer({ kids, seed: 3 });
  // +0 vs DC 15: only a natural 20 succeeds (yielding 1 point), never a critical success (needs 25+).
  // 2 kids assigned to Spot x 3 rounds = 6 rolls; breaking 6 points at 1 point per nat-20 is not
  // realistically achievable, so this should reliably hold across ordinary seeds.
  assert.equal(log.outcome.fieldIntegrity, "held");
});

test("runGroundLayer: assigns lanes proportionally to the two pools' win targets (6:8 of 5 kids -> 2 Spot / 3 Shepherd)", () => {
  const kids = loadGroundTeam();
  const log = runGroundLayer({ kids, seed: 1 });
  const spotCount = Object.values(log.lanes).filter((lane) => lane === "spot").length;
  const shepherdCount = Object.values(log.lanes).filter((lane) => lane === "shepherd").length;
  assert.equal(spotCount, 2);
  assert.equal(shepherdCount, 3);
  assert.equal(spotCount + shepherdCount, kids.length);
});

test("runGroundLayer: reads Perception through its own top-level field, not through skills (regression: found scoring every kid's Perception as +0)", () => {
  const strongPerceiver = makeKid("strong", { perception: { proficiency: { rank: "legendary", modifier: 50 } } });
  // "strong" is listed LAST on purpose: under the regressed bug, every kid's
  // advantage computes as 0 (a tie), and a stable sort preserves input order —
  // meaning "strong" would land in the Shepherd lane simply because it's last,
  // by coincidence, not because the assertion below actually caught anything.
  // Listed last, only a REAL advantage (from Perception correctly scoring +50)
  // can sort it ahead of the tied kids and into the 2-seat Spot lane.
  const kids = [makeKid("b"), makeKid("c"), makeKid("d"), makeKid("e"), strongPerceiver];
  const log = runGroundLayer({ kids, seed: 1 });
  assert.equal(log.lanes["strong"], "spot", "a kid whose only strength is Perception (a Spot-only skill) must be recognized as Spot-favoring, not scored as having no advantage");
});
