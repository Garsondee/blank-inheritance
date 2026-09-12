/**
 * VALUE-FUNCTION SANITY for the PERSONNEL-SCALE engine (design doc §19) — same structural
 * properties as value-function-sanity.test.mjs, at the real 5ft grid, minus the actionDenial/
 * spotted/civilians terms (none of which exist in this tree's evaluateState — see
 * personnel-engine/evaluate/state-value.mjs's own header for why).
 *
 * THE CENTRAL ONE IS STILL MONOTONICITY IN ENEMY HP, unchanged in importance: decide() chooses by
 * evaluateState(after) - evaluateState(before). If hurting an enemy can lower the score, attacking
 * becomes self-punishing. The §17 fix (cap TOTAL offensiveReach credit per enemy at its remaining
 * HP, summed across allies) was ported into this tree's evaluateState verbatim in shape — this
 * file is what proves the port actually preserved it, rather than trusting the port by inspection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateState, DEFAULT_WEIGHTS, bestExpectedDamage, attackOptions } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import { degreeProbabilities } from "../../tools/battle-simulator/engine/resolve.mjs";
import { lineOfEffect } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";
import { alliesWithPositions } from "../../tools/battle-simulator/personnel-engine/engine.mjs";

function makeState({ allyCount = 1, enemyCount = 1, enemyHP = 20, allyHP = 20 } = {}) {
  const combatants = new Map();
  const positions = new Map();
  const strike = { name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 50, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] };

  for (let i = 0; i < allyCount; i++) {
    const id = `ally-${i}`;
    combatants.set(id, { id, name: id, side: "party", currentHP: allyHP, maxHP: 20, ac: 15, hardness: 0, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [strike] });
    positions.set(id, { col: 5, row: 5 + i });
  }
  for (let i = 0; i < enemyCount; i++) {
    const id = `enemy-${i}`;
    combatants.set(id, { id, name: id, side: "opposition", currentHP: enemyHP, maxHP: 20, ac: 15, hardness: 0, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [strike] });
    positions.set(id, { col: 7, row: 5 + i });
  }
  return { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants, positions };
}

function withEnemyHP(state, enemyId, hp) {
  const clone = { ...state, combatants: new Map(state.combatants), positions: new Map(state.positions) };
  clone.combatants.set(enemyId, { ...state.combatants.get(enemyId), currentHP: hp });
  return clone;
}

test("MONOTONICITY: reducing an enemy's HP never reduces the party's score — at every ally count from 1 to 5", () => {
  for (let allyCount = 1; allyCount <= 5; allyCount++) {
    const base = makeState({ allyCount, enemyCount: 1, enemyHP: 20 });
    let previous = null;
    for (let hp = 20; hp >= 0; hp -= 1) {
      const score = evaluateState(withEnemyHP(base, "enemy-0", hp), "party");
      if (previous !== null) {
        assert.ok(score >= previous - 1e-9,
          `allyCount=${allyCount}: dropping the enemy from ${hp + 1} HP to ${hp} HP LOWERED the party's score (${previous.toFixed(2)} -> ${score.toFixed(2)}).`);
      }
      previous = score;
    }
  }
});

test("MONOTONICITY: the same holds with several enemies present, so focus-firing one is never punished", () => {
  for (let allyCount = 1; allyCount <= 4; allyCount++) {
    const base = makeState({ allyCount, enemyCount: 4, enemyHP: 20 });
    let previous = null;
    for (let hp = 20; hp >= 0; hp -= 2) {
      const score = evaluateState(withEnemyHP(base, "enemy-0", hp), "party");
      if (previous !== null) {
        assert.ok(score >= previous - 1e-9,
          `allyCount=${allyCount}, 4 enemies: dropping enemy-0 from ${hp + 2} to ${hp} HP LOWERED the score (${previous.toFixed(2)} -> ${score.toFixed(2)}).`);
      }
      previous = score;
    }
  }
});

test("KILL IS NEVER WORSE THAN NEARLY-KILLED: a dead enemy scores at least as well as the same enemy at 1 HP", () => {
  for (let allyCount = 1; allyCount <= 5; allyCount++) {
    const base = makeState({ allyCount, enemyCount: 2, enemyHP: 20 });
    const nearlyDead = evaluateState(withEnemyHP(base, "enemy-0", 1), "party");
    const dead = evaluateState(withEnemyHP(base, "enemy-0", 0), "party");
    assert.ok(dead >= nearlyDead - 1e-9,
      `allyCount=${allyCount}: killing the enemy (${dead.toFixed(2)}) scored WORSE than leaving it at 1 HP (${nearlyDead.toFixed(2)}).`);
  }
});

// design doc §32 — a real adversarial-audit finding, proven with a minimal isolated case before
// this fix: every test above clusters allies and enemies within a few squares of each other, so
// the closing gradient (state-value.mjs's own "still short of a shot" term) is permanently 0 and
// silently untested by any of them. These two tests specifically put an enemy OUT of range so the
// term has real, non-zero gradient to get wrong.
test("CLOSING GRADIENT MONOTONICITY: killing an already-in-range enemy must never lower the score by making the search reassign to a farther one", () => {
  const base = makeState({ allyCount: 1, enemyCount: 2, enemyHP: 20 });
  const state = { ...base, positions: new Map(base.positions) };
  state.positions.set("enemy-1", { col: 60, row: 5 }); // far beyond the Pistol's useful range — enemy-0 stays close/in-range

  const enemy0Alive = evaluateState(state, "party");
  const enemy0Dead = evaluateState(withEnemyHP(state, "enemy-0", 0), "party");
  assert.ok(enemy0Dead >= enemy0Alive - 1e-9,
    `killing the near, already-in-range enemy-0 while a far enemy-1 remains alive LOWERED the score (${enemy0Alive.toFixed(2)} -> ${enemy0Dead.toFixed(2)}) — REGRESSION: the closing gradient reassigned "nearest" to the farther surviving enemy instead of staying flat.`);
});

test("CLOSING GRADIENT still does real work: an ally out of range of every enemy scores worse than one already in range", () => {
  const inRange = makeState({ allyCount: 1, enemyCount: 1, enemyHP: 20 });
  const outOfRange = { ...inRange, positions: new Map(inRange.positions) };
  outOfRange.positions.set("enemy-0", { col: 60, row: 5 });

  const scoreInRange = evaluateState(inRange, "party");
  const scoreOutOfRange = evaluateState(outOfRange, "party");
  assert.ok(scoreOutOfRange < scoreInRange,
    "moving the only enemy far out of range should still cost the ally something via the closing gradient — the monotonicity fix must not have accidentally zeroed the term out entirely.");
});

test("MONOTONICITY: losing ally HP never RAISES the party's score", () => {
  const base = makeState({ allyCount: 3, enemyCount: 2 });
  let previous = null;
  for (let hp = 20; hp >= 1; hp -= 1) {
    const clone = { ...base, combatants: new Map(base.combatants) };
    clone.combatants.set("ally-0", { ...base.combatants.get("ally-0"), currentHP: hp });
    const score = evaluateState(clone, "party");
    if (previous !== null) assert.ok(score <= previous + 1e-9, `ally dropping from ${hp + 1} to ${hp} HP RAISED the party's score (${previous.toFixed(2)} -> ${score.toFixed(2)})`);
    previous = score;
  }
});

test("ZERO-SUM SANITY: a state good for the party is bad for the opposition", () => {
  const base = makeState({ allyCount: 2, enemyCount: 2, enemyHP: 20 });
  const hurt = withEnemyHP(base, "enemy-0", 8);
  const partyDelta = evaluateState(hurt, "party") - evaluateState(base, "party");
  const oppositionDelta = evaluateState(hurt, "opposition") - evaluateState(base, "opposition");
  assert.ok(partyDelta >= 0, `hurting an enemy scored ${partyDelta.toFixed(2)} for the party`);
  assert.ok(oppositionDelta <= 0, `the same event scored ${oppositionDelta.toFixed(2)} for the opposition — both sides cannot gain`);
});

test("SCALE SANITY: a full-HP enemy is worth more to remove than a nearly-dead one", () => {
  const base = makeState({ allyCount: 2, enemyCount: 2, enemyHP: 20 });
  const before = evaluateState(base, "party");
  const killedHealthy = evaluateState(withEnemyHP(base, "enemy-0", 0), "party");
  assert.ok(killedHealthy - before > 0, "killing a healthy enemy must be a clear gain");
});

test("WEIGHTS: offensiveReach is strictly below enemyDamage — the structural condition the monotonicity proof depends on", () => {
  assert.ok(DEFAULT_WEIGHTS.offensiveReach < DEFAULT_WEIGHTS.enemyDamage,
    `offensiveReach (${DEFAULT_WEIGHTS.offensiveReach}) must stay below enemyDamage (${DEFAULT_WEIGHTS.enemyDamage}) or hurting an enemy can score negative again`);
});

test("RESOURCE: a limited-use ability with charges left is worth something to its side", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  const withResource = { ...base, combatants: new Map(base.combatants) };
  withResource.combatants.set("ally-0", { ...base.combatants.get("ally-0"), healAbilities: [{ name: "Transfer Vitality", usesRemaining: 1 }] });
  assert.ok(evaluateState(withResource, "party") > evaluateState(base, "party"), "an unspent limited-use ability must be worth something");
});

test("a wall fully blocking Line of Effect between the only ally/enemy pair removes their offensiveReach/threatExposure credit entirely", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  const withWall = { ...base, walls: [{ c: [6, 0, 6, 20], move: 20, sight: 20 }] }; // splits column 5 (allies) from column 7 (enemies)
  const openScore = evaluateState(base, "party");
  const wallScore = evaluateState(withWall, "party");
  assert.ok(wallScore < openScore, `a wall blocking the only shot must remove positional credit (open: ${openScore.toFixed(2)}, walled: ${wallScore.toFixed(2)})`);
});

// --- Cover (design doc §22, Player Core pg. 416) ---

test("bestExpectedDamage: a real cover object between attacker and target reduces expected damage, without needing a separate evaluator weight", () => {
  const attacker = { id: "a", name: "a", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Pistol", strikeType: "ranged", attackBonus: 10, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] }] };
  const target = { id: "t", name: "t", side: "opposition", currentHP: 20, maxHP: 20, ac: 10, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const fromPos = { col: 0, row: 0 }, toPos = { col: 5, row: 0 };
  const coverWall = [{ c: [2, -1, 2, 2], cover: true }]; // sits between fromPos and toPos
  const openDamage = bestExpectedDamage(attacker, fromPos, target, toPos, []);
  const coveredDamage = bestExpectedDamage(attacker, fromPos, target, toPos, coverWall);
  assert.ok(coveredDamage < openDamage, `expected cover to reduce expected damage (open: ${openDamage.toFixed(2)}, covered: ${coveredDamage.toFixed(2)})`);
});

test("bestExpectedDamage: a real cover object between attacker and a REFLEX saveAttack target reduces expected damage too", () => {
  const attacker = { id: "a", name: "a", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, saveAttacks: [{ name: "Blast", saveType: "ref", dc: 20, range: 60, actions: 1, traits: [], damage: [{ dice: "1d1", bonus: 5 }], usesRemaining: 3 }] };
  const target = { id: "t", name: "t", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const fromPos = { col: 0, row: 0 }, toPos = { col: 5, row: 0 };
  const coverWall = [{ c: [2, -1, 2, 2], cover: true }];
  const openDamage = bestExpectedDamage(attacker, fromPos, target, toPos, []);
  const coveredDamage = bestExpectedDamage(attacker, fromPos, target, toPos, coverWall);
  assert.ok(coveredDamage < openDamage, `expected cover to reduce expected saveAttack damage too (open: ${openDamage.toFixed(2)}, covered: ${coveredDamage.toFixed(2)})`);
});

/**
 * REGRESSION (design doc §41, Stage 0): bestExpectedDamage used to hand-roll only Frightened's own
 * penalty inline instead of calling the real shared attackerConditionPenalty (conditions.mjs) — the
 * exact "two statements of one rule" drift class resolve.mjs's own header warns about. A prone
 * attacker's real -2 to attack rolls (condition-32-prone.json) was invisible to threatExposure/
 * offensiveReach from the moment Trip shipped until this fix, so a successfully Tripped enemy read
 * as exactly as threatening as before — the whole point of the AC-based off-guard credit already
 * working (see the cover tests above for that half) was undercut by this half silently not.
 */
test("bestExpectedDamage: a PRONE attacker's own real -2 attack penalty reduces its expected outgoing damage, with no separate evaluator weight", () => {
  const attacker = { id: "a", name: "a", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Pistol", strikeType: "ranged", attackBonus: 10, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] }] };
  const target = { id: "t", name: "t", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const fromPos = { col: 0, row: 0 }, toPos = { col: 5, row: 0 };
  const standingDamage = bestExpectedDamage(attacker, fromPos, target, toPos, []);
  const proneDamage = bestExpectedDamage({ ...attacker, prone: true }, fromPos, target, toPos, []);
  assert.ok(proneDamage < standingDamage, `expected prone to reduce this attacker's own expected outgoing damage (standing: ${standingDamage.toFixed(2)}, prone: ${proneDamage.toFixed(2)})`);
});

test("bestExpectedDamage: Frightened and Prone stack additively on the attacker's own modifier, matching attackerConditionPenalty's own real combined formula", () => {
  const attacker = { id: "a", name: "a", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Pistol", strikeType: "ranged", attackBonus: 10, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] }] };
  const target = { id: "t", name: "t", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const fromPos = { col: 0, row: 0 }, toPos = { col: 5, row: 0 };
  const frightenedOnly = bestExpectedDamage({ ...attacker, frightened: 1 }, fromPos, target, toPos, []);
  const proneAndFrightened = bestExpectedDamage({ ...attacker, frightened: 1, prone: true }, fromPos, target, toPos, []);
  assert.ok(proneAndFrightened < frightenedOnly, `expected stacking both penalties to reduce expected damage further than frightened alone (frightened only: ${frightenedOnly.toFixed(2)}, both: ${proneAndFrightened.toFixed(2)})`);
});

// --- tempoDenial (design doc §22, generalized beyond Stunned alone in §42's Stage 1) ---

test("MONOTONICITY: a stunned enemy is worth strictly more to the party than the same enemy un-stunned, all else equal", () => {
  const base = makeState({ allyCount: 2, enemyCount: 1 });
  const stunned = { ...base, combatants: new Map(base.combatants) };
  stunned.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), stunnedValue: 2 });
  assert.ok(evaluateState(stunned, "party") > evaluateState(base, "party"), "stunning an enemy must raise the party's score");
});

test("MONOTONICITY: the same holds symmetrically — a stunned ALLY is worth strictly less, and the two sides' views stay zero-sum-consistent", () => {
  const base = makeState({ allyCount: 2, enemyCount: 1 });
  const allyStunned = { ...base, combatants: new Map(base.combatants) };
  allyStunned.combatants.set("ally-0", { ...base.combatants.get("ally-0"), stunnedValue: 2 });
  assert.ok(evaluateState(allyStunned, "party") < evaluateState(base, "party"), "an ally being stunned must lower the party's own score");

  const enemyStunned = { ...base, combatants: new Map(base.combatants) };
  enemyStunned.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), stunnedValue: 2 });
  const partyDelta = evaluateState(enemyStunned, "party") - evaluateState(base, "party");
  const oppositionDelta = evaluateState(enemyStunned, "opposition") - evaluateState(base, "opposition");
  assert.ok(partyDelta > 0 && oppositionDelta < 0, `stunning the enemy must be good for the party and bad for the opposition (party: ${partyDelta.toFixed(2)}, opposition: ${oppositionDelta.toFixed(2)})`);
});

test("tempoDenial scales with the real number of actions stunned — 2 is worth exactly twice 1", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  const before = evaluateState(base, "party");
  const one = { ...base, combatants: new Map(base.combatants) };
  one.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), stunnedValue: 1 });
  const two = { ...base, combatants: new Map(base.combatants) };
  two.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), stunnedValue: 2 });
  const gainOne = evaluateState(one, "party") - before;
  const gainTwo = evaluateState(two, "party") - before;
  assert.ok(Math.abs(gainTwo - 2 * gainOne) < 1e-9, `expected exactly linear scaling (1 action: +${gainOne.toFixed(3)}, 2 actions: +${gainTwo.toFixed(3)})`);
});

/**
 * REGENERALIZATION (design doc §42, Stage 1): tempoDenial now prices Prone (1 owed action — the
 * real cost of Stand) and Grabbed/Restrained (the real expected Escape-attempt count) on top of
 * Stunned, all in the same "owed actions" currency, deliberately NOT re-pricing Restrained's own
 * "can't attack" half a second time (already priced via bestExpectedDamage's restrained exclusion,
 * design doc §40). The two Grabbed/Restrained cases below reuse the exact modifier/DC pairs already
 * hand-verified in yesterday's Escape work — pFree=1.0 (guaranteed escape next try) and pFree=0
 * (guaranteed stuck) — so the expected result is exact, not approximate.
 */
// Both tests below deliberately use STRIKELESS combatants on both sides: Prone also grants a real,
// already-existing (design doc §40) off-guard AC credit against incoming attacks, on top of
// tempoOwed's own action-cost pricing — makeState()'s default ranged-armed ally would let that
// SECOND, correct effect leak into the diff and contaminate an "isolate tempoOwed alone" comparison
// (caught live: a first draft using makeState() measured prone at +1.352 vs stunned's +1.000, not
// because tempoOwed was wrong, but because the off-guard credit was firing too). No strikes on either
// side means offensiveReach/bestExpectedDamage contribute a flat 0 regardless of prone, isolating
// tempoOwed's own formula cleanly — the off-guard credit itself already has its own dedicated tests
// above ("bestExpectedDamage: a PRONE attacker's own real -2 attack penalty...", cover tests).
function makeStrikelessDuo() {
  const enemy = { id: "enemy-0", name: "e", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const ally = { id: "ally-0", name: "a", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const positions = new Map([["enemy-0", { col: 7, row: 5 }], ["ally-0", { col: 5, row: 5 }]]);
  return { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants: new Map([["enemy-0", enemy], ["ally-0", ally]]), positions };
}

// design doc §44: Prone/Grabbed's own "owed" value is now priced at `maneuverTempoDenial` (0.3),
// deliberately BELOW Stunned's own `tempoDenial` (1.0) — split apart after a real, measured
// win-rate regression traced directly to pricing them at the same certain-loss rate (see that
// weight's own comment for the full story and the real fixture-based probe that found it).
test("maneuverTempoDenial: a PRONE enemy owes exactly 1 action, priced at maneuverTempoDenial's OWN (lower) rate — not Stunned's tempoDenial rate", () => {
  const base = makeStrikelessDuo();
  const before = evaluateState(base, "party");
  const proneOne = { ...base, combatants: new Map(base.combatants) };
  proneOne.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), prone: true });
  const gainProne = evaluateState(proneOne, "party") - before;
  assert.ok(Math.abs(gainProne - DEFAULT_WEIGHTS.maneuverTempoDenial * 1) < 1e-9, `expected Prone's 1 owed action priced at maneuverTempoDenial, isolated from the separate off-guard AC credit — got +${gainProne.toFixed(3)}`);
});

test("Stunned and Prone are now priced at DIFFERENT rates, and still stack additively at their own respective rates", () => {
  const base = makeStrikelessDuo();
  const before = evaluateState(base, "party");
  const stunnedOnly = { ...base, combatants: new Map(base.combatants) };
  stunnedOnly.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), stunnedValue: 1 });
  const proneOnly = { ...base, combatants: new Map(base.combatants) };
  proneOnly.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), prone: true });
  const both = { ...base, combatants: new Map(base.combatants) };
  both.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), stunnedValue: 1, prone: true });
  const gainStunnedOnly = evaluateState(stunnedOnly, "party") - before;
  const gainProneOnly = evaluateState(proneOnly, "party") - before;
  const gainBoth = evaluateState(both, "party") - before;
  assert.ok(Math.abs(gainStunnedOnly - DEFAULT_WEIGHTS.tempoDenial) < 1e-9, `Stunned 1 alone must price at tempoDenial's own rate, got +${gainStunnedOnly.toFixed(3)}`);
  assert.ok(Math.abs(gainProneOnly - DEFAULT_WEIGHTS.maneuverTempoDenial) < 1e-9, `Prone alone must price at maneuverTempoDenial's own (lower) rate, got +${gainProneOnly.toFixed(3)}`);
  assert.ok(Math.abs(gainBoth - (gainStunnedOnly + gainProneOnly)) < 1e-9, `expected the two DIFFERENT-rate credits to still stack additively (stunned +${gainStunnedOnly.toFixed(3)}, prone +${gainProneOnly.toFixed(3)}, both +${gainBoth.toFixed(3)})`);
});

test("maneuverTempoDenial: a Grabbed/Restrained enemy who can ALMOST CERTAINLY escape next try owes almost exactly the real floor of 1 action, priced at maneuverTempoDenial's own rate", () => {
  const grappler = { id: "grappler", name: "Grappler", side: "opposition", currentHP: 20, maxHP: 20, athleticsModifier: -20, saves: { fort: 5, ref: 5, will: 5 } }; // DC = 10-20 = -10
  const held = { id: "enemy-0", name: "Held", side: "opposition", currentHP: 20, maxHP: 20, athleticsModifier: 20, saves: { fort: 5, ref: 5, will: 5 }, grappledBy: { attackerId: "grappler", state: "restrained", expiresEndOfRound: 5 } }; // modifier 20 vs DC -10 -> guaranteed success-or-better (hand-verified §41)
  const ally = { id: "ally-0", name: "Ally", side: "party", currentHP: 20, maxHP: 20, strikes: [] };
  const positions = new Map([["grappler", { col: 7, row: 5 }], ["enemy-0", { col: 7, row: 6 }], ["ally-0", { col: 5, row: 5 }]]);
  const state = { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants: new Map([["grappler", grappler], ["enemy-0", held], ["ally-0", ally]]), positions };
  const free = { ...state, combatants: new Map(state.combatants) };
  free.combatants.set("enemy-0", { ...held, grappledBy: null });
  const gain = evaluateState(state, "party") - evaluateState(free, "party");
  assert.ok(Math.abs(gain - DEFAULT_WEIGHTS.maneuverTempoDenial * 1) < 0.01, `expected almost exactly 1 owed action (near-certain escape next try) at maneuverTempoDenial's own rate, got a gain of ${gain.toFixed(4)}`);
});

test("maneuverTempoDenial: a Grabbed/Restrained enemy who can basically NEVER escape owes the real capped maximum (4 expected attempts), priced at maneuverTempoDenial's own rate, not an unbounded number", () => {
  const grappler = { id: "grappler", name: "Grappler", side: "opposition", currentHP: 20, maxHP: 20, athleticsModifier: 20, saves: { fort: 5, ref: 5, will: 5 } }; // DC = 10+20 = 30
  const held = { id: "enemy-0", name: "Held", side: "opposition", currentHP: 20, maxHP: 20, athleticsModifier: -20, saves: { fort: 5, ref: 5, will: 5 }, grappledBy: { attackerId: "grappler", state: "restrained", expiresEndOfRound: 5 } }; // modifier -20 vs DC 30 -> guaranteed failure-or-worse (hand-verified §41)
  const ally = { id: "ally-0", name: "Ally", side: "party", currentHP: 20, maxHP: 20, strikes: [] };
  const positions = new Map([["grappler", { col: 7, row: 5 }], ["enemy-0", { col: 7, row: 6 }], ["ally-0", { col: 5, row: 5 }]]);
  const state = { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants: new Map([["grappler", grappler], ["enemy-0", held], ["ally-0", ally]]), positions };
  const free = { ...state, combatants: new Map(state.combatants) };
  free.combatants.set("enemy-0", { ...held, grappledBy: null });
  const gain = evaluateState(state, "party") - evaluateState(free, "party");
  assert.ok(Math.abs(gain - DEFAULT_WEIGHTS.maneuverTempoDenial * 4) < 1e-9, `expected exactly the capped 4 owed actions (near-zero escape chance) at maneuverTempoDenial's own rate, got a gain of ${gain.toFixed(4)}`);
});

// --- setupValue (design doc §42, Stage 1) ---

test("setupValue: contributes exactly 0 when actingCombatantId is omitted — every pre-existing caller (all 2/3-arg calls) is completely unaffected", () => {
  const base = makeState({ allyCount: 2, enemyCount: 1 });
  const withInitiative = { ...base, initiativeOrder: ["ally-0", "ally-1", "enemy-0"] };
  const proned = { ...withInitiative, combatants: new Map(withInitiative.combatants) };
  proned.combatants.set("enemy-0", { ...withInitiative.combatants.get("enemy-0"), prone: true });
  const scoreOmitted = evaluateState(proned, "party");
  const scoreExplicitNull = evaluateState(proned, "party", DEFAULT_WEIGHTS, null);
  assert.equal(scoreOmitted, scoreExplicitNull, "omitting actingCombatantId and passing null explicitly must produce identical scores");
});

test("setupValue: real credit when allies are still to act this round; none when evaluated as if nobody were left", () => {
  const base = makeState({ allyCount: 2, enemyCount: 1 });
  const proned = { ...base, combatants: new Map(base.combatants) };
  proned.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), prone: true });

  // A phantom earlier actor — both real allies are still to act relative to it.
  const earlyOrder = { ...proned, initiativeOrder: ["scout", "ally-0", "ally-1", "enemy-0"] };
  const scoreWithSetup = evaluateState(earlyOrder, "party", DEFAULT_WEIGHTS, "scout");

  // Evaluated as if acting from the LAST ally's own turn — nobody on my side is left to act after me.
  const lateOrder = { ...proned, initiativeOrder: ["ally-0", "ally-1", "enemy-0"] };
  const scoreWithoutSetup = evaluateState(lateOrder, "party", DEFAULT_WEIGHTS, "ally-1");

  assert.ok(scoreWithSetup > scoreWithoutSetup, `expected real setup-value credit when allies are still to act (${scoreWithSetup.toFixed(3)}) vs none left (${scoreWithoutSetup.toFixed(3)})`);
});

test("SETUP VALUE MONOTONICITY: reducing an enemy's HP never reduces the party's score, with actingCombatantId supplied and a real off-guard enemy in play", () => {
  const base = makeState({ allyCount: 3, enemyCount: 1, enemyHP: 20 });
  const proned = { ...base, combatants: new Map(base.combatants) };
  proned.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), prone: true });
  const withOrder = { ...proned, initiativeOrder: ["ally-0", "ally-1", "ally-2", "enemy-0"] };
  let previous = null;
  for (let hp = 20; hp >= 0; hp -= 1) {
    const score = evaluateState(withEnemyHP(withOrder, "enemy-0", hp), "party", DEFAULT_WEIGHTS, "ally-0");
    if (previous !== null) assert.ok(score >= previous - 1e-9, `dropping the enemy from ${hp + 1} to ${hp} HP LOWERED the score (${previous.toFixed(2)} -> ${score.toFixed(2)}) with setupValue active`);
    previous = score;
  }
});

test("WEIGHTS: setupValue is strictly below enemyDamage — the same structural condition offensiveReach's own monotonicity proof depends on", () => {
  assert.ok(DEFAULT_WEIGHTS.setupValue < DEFAULT_WEIGHTS.enemyDamage,
    `setupValue (${DEFAULT_WEIGHTS.setupValue}) must stay below enemyDamage (${DEFAULT_WEIGHTS.enemyDamage})`);
});

// --- mobilityDenial (design doc §42, Stage 1) ---

function makePinnedScenario({ grappledBy = null, enemyPos = { col: 0, row: 0 }, allyPos = { col: 20, row: 0 }, enemyHP = 20 } = {}) {
  const enemy = {
    id: "enemy-0", name: "e", side: "opposition", currentHP: enemyHP, maxHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Knife", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    ...(grappledBy ? { grappledBy } : {})
  };
  const ally = { id: "ally-0", name: "a", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const positions = new Map([["enemy-0", enemyPos], ["ally-0", allyPos]]);
  return { round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, combatants: new Map([["enemy-0", enemy], ["ally-0", ally]]), positions };
}
const GRABBED = { attackerId: "someone", state: "grabbed", expiresEndOfRound: 5 };

test("mobilityDenial: an immobilized MELEE enemy stuck far out of its own reach scores better for the party than the same enemy free to move", () => {
  const free = evaluateState(makePinnedScenario({ grappledBy: null }), "party");
  const pinned = evaluateState(makePinnedScenario({ grappledBy: GRABBED }), "party");
  assert.ok(pinned > free, `expected pinning an out-of-range melee enemy to raise the party's score (free: ${free.toFixed(3)}, pinned: ${pinned.toFixed(3)})`);
});

test("mobilityDenial: an immobilized enemy already WITHIN its own reach gets no credit — nothing was actually denied", () => {
  const adjacentPositions = { enemyPos: { col: 0, row: 0 }, allyPos: { col: 1, row: 0 } }; // already adjacent — real melee reach
  const free = evaluateState(makePinnedScenario({ grappledBy: null, ...adjacentPositions }), "party");
  const pinned = evaluateState(makePinnedScenario({ grappledBy: GRABBED, ...adjacentPositions }), "party");
  // Toggling grappledBy ALSO feeds maneuverTempoOwed's own (separate, correct — design doc §44)
  // grapple-escape-cost pricing — unrelated to mobility and unconditional on distance, so it fires
  // here too and must be subtracted out to isolate mobilityDenial alone, same technique as the
  // NON-immobilized test below. makePinnedScenario's enemy has no athleticsModifier and GRABBED's
  // attackerId matches no real combatant, so the grapple math falls back to modifier 0 vs DC 10 on
  // both sides of that calculation.
  const probs = degreeProbabilities(0, 10);
  const pFree = probs.success + probs.criticalSuccess;
  const expectedTempoOnly = free + DEFAULT_WEIGHTS.maneuverTempoDenial * Math.min(4, 1 / pFree);
  assert.ok(Math.abs(pinned - expectedTempoOnly) < 1e-9, `no mobility-denial credit when the immobilized enemy was already in its own useful range (pinned: ${pinned.toFixed(3)}, expected maneuverTempoOwed-only: ${expectedTempoOnly.toFixed(3)})`);
});

test("mobilityDenial: a NON-immobilized (merely far away) enemy gets no credit either — only Grabbed/Restrained triggers this", () => {
  const notImmobilized = evaluateState(makePinnedScenario({ grappledBy: null }), "party");
  const stunnedButNotHeld = { ...makePinnedScenario({ grappledBy: null }) };
  stunnedButNotHeld.combatants.set("enemy-0", { ...stunnedButNotHeld.combatants.get("enemy-0"), stunnedValue: 2 });
  const withStunnedTempoDenial = evaluateState(stunnedButNotHeld, "party");
  // isolate mobilityDenial specifically: subtract out the KNOWN tempoDenial contribution from stunnedValue 2
  const expectedTempoOnly = notImmobilized + DEFAULT_WEIGHTS.tempoDenial * 2;
  assert.ok(Math.abs(withStunnedTempoDenial - expectedTempoOnly) < 1e-9, "a merely-stunned (not immobilized) far-away enemy must get tempoDenial credit but NOT mobilityDenial credit");
});

/**
 * REGRESSION-GUARD (caught and fixed by hand before ever shipping, design doc §42): an earlier draft
 * of this term gated on `enemy.currentHP <= 0` directly instead of capping the credit at the
 * enemy's own remaining HP — creating exactly the discontinuous-cliff bug §17/§32 already found and
 * fixed for offensiveReach/closing. This is the direct, minimal proof the shipped version doesn't
 * have that bug: a far-pinned enemy at 1 HP is worth a real, possibly large mobilityDenial credit;
 * killing it must never score worse than leaving it at 1 HP.
 */
test("MOBILITY DENIAL MONOTONICITY: killing a far-pinned immobilized enemy must never score worse than leaving it alive at 1 HP", () => {
  const nearlyDead = evaluateState(makePinnedScenario({ grappledBy: GRABBED, enemyHP: 1 }), "party");
  const dead = evaluateState(makePinnedScenario({ grappledBy: GRABBED, enemyHP: 0 }), "party");
  assert.ok(dead >= nearlyDead - 1e-9,
    `killing the far-pinned enemy (${dead.toFixed(3)}) scored WORSE than leaving it at 1 HP (${nearlyDead.toFixed(3)}) — the exact cliff bug a naive currentHP<=0 gate would have shipped.`);
});

test("MOBILITY DENIAL MONOTONICITY: holds across the FULL HP range down to 0, not just the last step", () => {
  let previous = null;
  for (let hp = 20; hp >= 0; hp -= 1) {
    const score = evaluateState(makePinnedScenario({ grappledBy: GRABBED, enemyHP: hp }), "party");
    if (previous !== null) assert.ok(score >= previous - 1e-9, `dropping the far-pinned enemy from ${hp + 1} to ${hp} HP LOWERED the score (${previous.toFixed(3)} -> ${score.toFixed(3)})`);
    previous = score;
  }
});

test("WEIGHTS: mobilityDenial is strictly below enemyDamage — the same structural condition its own monotonicity proof depends on", () => {
  assert.ok(DEFAULT_WEIGHTS.mobilityDenial < DEFAULT_WEIGHTS.enemyDamage,
    `mobilityDenial (${DEFAULT_WEIGHTS.mobilityDenial}) must stay below enemyDamage (${DEFAULT_WEIGHTS.enemyDamage})`);
});

test("WEIGHTS (design doc §44): maneuverTempoDenial is strictly below tempoDenial — Prone/Grabbed's own CONTESTED, future-dependent value must never price as high as Stunned's certain, already-resolved one; this is the exact relationship whose violation caused the real, measured win-rate regression this weight split fixes", () => {
  assert.ok(DEFAULT_WEIGHTS.maneuverTempoDenial < DEFAULT_WEIGHTS.tempoDenial,
    `maneuverTempoDenial (${DEFAULT_WEIGHTS.maneuverTempoDenial}) must stay below tempoDenial (${DEFAULT_WEIGHTS.tempoDenial})`);
});

test("RESOURCE: a limited-use conditionSave with charges left is worth something to its side, same as any other limited-use ability", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  const withResource = { ...base, combatants: new Map(base.combatants) };
  withResource.combatants.set("ally-0", { ...base.combatants.get("ally-0"), conditionSaves: [{ name: "Forced Reflection", usesRemaining: 1 }] });
  assert.ok(evaluateState(withResource, "party") > evaluateState(base, "party"), "an unspent limited-use conditionSave must be worth something");
});

// --- lowHpCaution / outnumberedCaution (design doc §22 — Ingram's direct ask: PCs (and
// symmetrically enemies) should have a greater reason to break line of sight when hurt or
// outnumbered). Both are MULTIPLIERS on threatExposure, isolated here by toggling ONLY the caution
// weights to zero and diffing against the real DEFAULT_WEIGHTS score for the SAME state (same
// walls, same topology) — unlike an "open vs. walled" comparison, this never touches offensiveReach
// or the closing gradient (both of which ALSO react to a wall's mere presence), so the only thing
// that can move between the two calls is the caution factors themselves.

function cautionCost(state, side = "party") {
  const withCaution = evaluateState(state, side, DEFAULT_WEIGHTS);
  const withoutCaution = evaluateState(state, side, { ...DEFAULT_WEIGHTS, lowHpCaution: 0, outnumberedCaution: 0 });
  return withoutCaution - withCaution; // >= 0 always — exactly what the caution terms are costing this state
}

test("lowHpCaution: a badly hurt (but still alive) ally's caution cost is strictly LARGER than a full-HP ally's in the identical position — the mechanism that makes 'break LOS' outscore 'stand and fight' once low", () => {
  const fullHpCost = cautionCost(makeState({ allyCount: 1, enemyCount: 1, allyHP: 20 }));
  const lowHpCost = cautionCost(makeState({ allyCount: 1, enemyCount: 1, allyHP: 1 }));
  assert.ok(lowHpCost > fullHpCost, `expected the low-HP ally's caution cost (${lowHpCost.toFixed(3)}) to exceed the full-HP ally's (${fullHpCost.toFixed(3)})`);
});

test("lowHpCaution: at full HP (and a fair, unoutnumbered match) the caution cost is exactly zero — zero behavior change from before this term existed", () => {
  const cost = cautionCost(makeState({ allyCount: 1, enemyCount: 1, allyHP: 20 }));
  assert.ok(Math.abs(cost) < 1e-9, `expected zero caution cost at full HP with a fair 1v1, got ${cost.toFixed(4)}`);
});

// design doc §35: the ramp changed from linear to CUBIC in (1-hpFraction) — §31's own audit found
// the old linear curve's 3x ceiling never got remotely close to competing with a real attack, and
// raising the ceiling ALONE (without reshaping the curve) would have made caution kick in too early
// through the middle of the HP range, not just when things are genuinely dire.
test("lowHpCaution: scales CUBICALLY with HP fraction, not linearly and not a threshold — still exactly continuous (no cliff, matching design doc §22's own 'moving 3x is an alarm' lesson), just a curve that stays flatter through most of the range", () => {
  // cost(15 of 20 HP)/cost(10 of 20 HP) must equal (1-15/20)^3/(1-10/20)^3 = 0.25^3/0.5^3 = 0.125
  // exactly — a precise check of the actual shape, not just "goes up faster than before."
  const at15 = cautionCost(makeState({ allyCount: 1, enemyCount: 1, allyHP: 15 }));
  const at10 = cautionCost(makeState({ allyCount: 1, enemyCount: 1, allyHP: 10 }));
  assert.ok(Math.abs(at15 / at10 - 0.125) < 1e-6, `expected cost(15hp)/cost(10hp) == 0.125 exactly (got ${(at15 / at10).toFixed(4)}, at15=${at15.toFixed(4)}, at10=${at10.toFixed(4)})`);
});

test("lowHpCaution: at (near) 0 HP, the raised ceiling brings threatExposure's effective weight to just past enemyDamage's own 1.0-per-HP scale — the actual fix for cover-seeking losing to a mediocre attack even at death's door", () => {
  // effective weight = DEFAULT threatExposure(0.12) * (1 + lowHpCaution(8) * (1-hpFraction)^3), which
  // -> 0.12 * 9 = 1.08 as hpFraction -> 0. Checked at 1 HP (not 0 — a combatant AT exactly 0 HP is
  // skipped by this whole per-ally loop entirely, matching how a downed combatant no longer has a
  // real "stay safe from here" decision to make; this is about the ceiling still-in-the-fight
  // combatants approach as they near it, not the unconscious/dead edge case itself).
  const expectedEffectiveWeight = DEFAULT_WEIGHTS.threatExposure * (1 + DEFAULT_WEIGHTS.lowHpCaution);
  assert.ok(expectedEffectiveWeight > 1.0, `expected the near-0-HP ceiling to exceed enemyDamage's 1.0-per-HP scale, got ${expectedEffectiveWeight.toFixed(3)}`);
  const cost = cautionCost(makeState({ allyCount: 1, enemyCount: 1, allyHP: 1 }));
  assert.ok(cost > 0, "sanity: some real caution cost must actually apply at 1 HP");
});

// design doc §35 — Ingram's own ask: "some characters act more aggressive, moving towards enemies."
test("aggression: an opt-in per-combatant field that dampens ONLY that combatant's own caution — absent (undefined) means zero behavior change from before this field existed", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1, allyHP: 5 });
  const baseline = cautionCost(base);
  const stillBaseline = cautionCost({ ...base, combatants: new Map([...base.combatants].map(([id, c]) => [id, { ...c, aggression: 1 }])) });
  assert.ok(Math.abs(baseline - stillBaseline) < 1e-9, "aggression:1 must be a pure no-op, identical to the field being absent entirely");
});

test("aggression: a value above 1 reduces the caution cost for THAT combatant, without affecting an unrelated ally evaluated the same way", () => {
  const hurt = makeState({ allyCount: 1, enemyCount: 1, allyHP: 5 });
  const cautious = cautionCost(hurt);
  const aggressive = { ...hurt, combatants: new Map([...hurt.combatants].map(([id, c]) => [id, c.side === "party" ? { ...c, aggression: 4 } : c])) };
  const dampened = cautionCost(aggressive);
  assert.ok(dampened < cautious, `expected aggression:4 to LOWER the caution cost (cautious=${cautious.toFixed(3)}, dampened=${dampened.toFixed(3)})`);
  assert.ok(Math.abs(dampened - cautious / 4) < 1e-6, `expected the caution cost to divide cleanly by the aggression factor (cautious/4=${(cautious / 4).toFixed(4)}, got ${dampened.toFixed(4)})`);
});

test("outnumberedCaution: a lone ally seeing 2 enemies (ratio 2:1) has a strictly nonzero caution cost", () => {
  const cost = cautionCost(makeState({ allyCount: 1, enemyCount: 2 }));
  assert.ok(cost > 0, `expected a lone ally facing 2 visible enemies to carry a real outnumbered caution cost, got ${cost.toFixed(3)}`);
});

test("outnumberedCaution: a fair 1-visible-enemy-to-1-visible-ally match applies NO extra penalty (ratio <= 1 is the documented neutral case)", () => {
  const cost = cautionCost(makeState({ allyCount: 1, enemyCount: 1 }));
  assert.ok(Math.abs(cost) < 1e-9, `expected zero caution cost for a fair 1v1, got ${cost.toFixed(4)}`);
});

test("outnumberedCaution is symmetric: evaluated from the opposition's own perspective, a lone outnumbered ENEMY gets the identical treatment — 'the same logic could apply to enemies' falls out of the shared evaluateState code, no separate branch", () => {
  // 1 opposition combatant facing 2 party combatants: from "opposition"'s own point of view, ITS
  // allies == the lone combatant, ITS enemies == the 2-strong party — the mirror of the case above.
  const state = makeState({ allyCount: 2, enemyCount: 1 });
  const oppositionCost = cautionCost(state, "opposition");
  assert.ok(oppositionCost > 0, `expected the lone, outnumbered opposition combatant to carry a real caution cost from its own side's perspective, got ${oppositionCost.toFixed(3)}`);
});

test("MONOTONICITY still holds with the new caution terms active and stacked (a badly hurt, outnumbered ally): reducing an enemy's HP never reduces the party's score", () => {
  const base = makeState({ allyCount: 1, enemyCount: 3, allyHP: 3 });
  let previous = null;
  for (let hp = 20; hp >= 0; hp -= 2) {
    const score = evaluateState(withEnemyHP(base, "enemy-0", hp), "party");
    if (previous !== null) assert.ok(score >= previous - 1e-9, `hurt+outnumbered case: dropping enemy-0 from ${hp + 2} to ${hp} HP LOWERED the score (${previous.toFixed(2)} -> ${score.toFixed(2)})`);
    previous = score;
  }
});

test("WEIGHTS: lowHpCaution and outnumberedCaution are both non-negative — a negative value would perversely reward exposing a hurt or outnumbered combatant", () => {
  assert.ok(DEFAULT_WEIGHTS.lowHpCaution >= 0);
  assert.ok(DEFAULT_WEIGHTS.outnumberedCaution >= 0);
});

// --- pileOnRisk (design doc §55 — the roster-generalization sweep's own real, diagnosed loss:
// baseline-v1 lost 75% of the time to aggressive-v1 on a roster with real hard-hitting melee
// weapons, because one enemy's Trip let a SECOND enemy also capitalize on the SAME off-guard window
// before the target could Stand — 18 damage in one round on a 24-HP combatant, read directly from a
// real transcript) ---

function makePileOnScenario({ maneuvererAthletics = 8, maneuvererPos = { col: 6, row: 5 }, otherPos = { col: 5, row: 8 }, allyFort = 5, allyPos = { col: 5, row: 5 }, allyProne = false } = {}) {
  const rangedStrike = { name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] };
  const ally = {
    id: "ally-0", name: "a", side: "party", currentHP: 20, maxHP: 20, ac: 15,
    saves: { fort: allyFort, ref: 5, will: 5 }, speed: 25, strikes: [rangedStrike],
    ...(allyProne ? { prone: true } : {})
  };
  const maneuverer = {
    id: "maneuverer", name: "m", side: "opposition", currentHP: 20, maxHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [rangedStrike],
    ...(maneuvererAthletics != null ? { athleticsModifier: maneuvererAthletics } : {})
  };
  const other = {
    id: "other", name: "o", side: "opposition", currentHP: 20, maxHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [rangedStrike]
  };
  return {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 },
    combatants: new Map([["ally-0", ally], ["maneuverer", maneuverer], ["other", other]]),
    positions: new Map([["ally-0", allyPos], ["maneuverer", maneuvererPos], ["other", otherPos]])
  };
}

test("pileOnRisk: a real cost when a second enemy could capitalize on a maneuver the first one might land", () => {
  const withManeuverer = evaluateState(makePileOnScenario({ maneuvererAthletics: 8 }), "party");
  const withoutAthletics = evaluateState(makePileOnScenario({ maneuvererAthletics: null }), "party");
  assert.ok(withoutAthletics > withManeuverer, `expected an Athletics-capable adjacent enemy to cost the party something real (with: ${withManeuverer.toFixed(3)}, without: ${withoutAthletics.toFixed(3)})`);
});

test("pileOnRisk: exactly ZERO with only one enemy present — nobody else is left to cash in on the maneuver (this is what ai-profiles.test.mjs's own 1v1 golden sequences depend on staying unaffected)", () => {
  const scenario = makePileOnScenario({ maneuvererAthletics: 8 });
  scenario.combatants.delete("other");
  scenario.positions.delete("other");
  const withRealWeight = evaluateState(scenario, "party", DEFAULT_WEIGHTS);
  const withZeroedWeight = evaluateState(scenario, "party", { ...DEFAULT_WEIGHTS, pileOnRisk: 0 });
  assert.ok(Math.abs(withRealWeight - withZeroedWeight) < 1e-9, `expected pileOnRisk to contribute exactly 0 with a single enemy (real weight: ${withRealWeight.toFixed(3)}, zeroed: ${withZeroedWeight.toFixed(3)})`);
});

test("pileOnRisk: no cost once the ally is ALREADY off-guard (prone) — threatExposure already prices the real, current danger; this must not double it", () => {
  const upright = evaluateState(makePileOnScenario({ allyProne: false }), "party");
  const prone = evaluateState(makePileOnScenario({ allyProne: true }), "party");
  // Being prone costs real, KNOWN things independent of pileOnRisk (maneuverTempoDenial's own owed
  // Stand action, plus threatExposure itself rising via the real off-guard AC read already folded
  // into bestExpectedDamage) — the point here isn't that prone scores identically to upright, it's
  // that toggling allyProne with pileOnRisk's weight zeroed out changes nothing further, proven
  // directly below rather than inferred from a single before/after number.
  const zeroed = { ...DEFAULT_WEIGHTS, pileOnRisk: 0 };
  const proneWithZeroedPileOnRisk = evaluateState(makePileOnScenario({ allyProne: true }), "party", zeroed);
  const proneWithRealPileOnRisk = evaluateState(makePileOnScenario({ allyProne: true }), "party", DEFAULT_WEIGHTS);
  assert.ok(Math.abs(proneWithRealPileOnRisk - proneWithZeroedPileOnRisk) < 1e-9, `pileOnRisk must contribute exactly 0 once already off-guard (with real weight: ${proneWithRealPileOnRisk.toFixed(3)}, with weight zeroed: ${proneWithZeroedPileOnRisk.toFixed(3)})`);
  assert.ok(prone !== upright, "sanity check: prone must change SOMETHING about the score (via threatExposure/maneuverTempoDenial), or this test isn't checking anything real");
});

test("pileOnRisk: a maneuverer more than one square away never triggers it — Trip/Grapple are both melee-range Athletics checks", () => {
  const adjacent = evaluateState(makePileOnScenario({ maneuvererPos: { col: 6, row: 5 } }), "party"); // 5ft
  const farAway = evaluateState(makePileOnScenario({ maneuvererPos: { col: 20, row: 5 } }), "party"); // far beyond melee reach
  const zeroed = { ...DEFAULT_WEIGHTS, pileOnRisk: 0 };
  const farAwayZeroed = evaluateState(makePileOnScenario({ maneuvererPos: { col: 20, row: 5 } }), "party", zeroed);
  assert.ok(Math.abs(farAway - farAwayZeroed) < 1e-9, "a maneuverer far outside melee range must contribute exactly 0 pileOnRisk");
  assert.ok(adjacent < farAway, "sanity check: the adjacent case must actually cost more than the far-away case, or this test isn't distinguishing anything");
});

test("pileOnRisk: a strong Fortitude save lowers the real cost — it's weighted by the maneuver's own actual success probability, not a flat guess", () => {
  const weakSave = evaluateState(makePileOnScenario({ allyFort: 0 }), "party");
  const strongSave = evaluateState(makePileOnScenario({ allyFort: 15 }), "party");
  assert.ok(strongSave > weakSave, `expected a strong Fortitude save to cost less pileOnRisk (weak save: ${weakSave.toFixed(3)}, strong save: ${strongSave.toFixed(3)})`);
});

test("PILE-ON RISK MONOTONICITY: killing the enemy who'd capitalize on the maneuver never scores worse than leaving it alive at 1 HP", () => {
  const scenarioAt1HP = makePileOnScenario({});
  scenarioAt1HP.combatants.set("other", { ...scenarioAt1HP.combatants.get("other"), currentHP: 1 });
  const nearlyDead = evaluateState(scenarioAt1HP, "party");
  const scenarioDead = makePileOnScenario({});
  scenarioDead.combatants.set("other", { ...scenarioDead.combatants.get("other"), currentHP: 0 });
  const dead = evaluateState(scenarioDead, "party");
  assert.ok(dead >= nearlyDead - 1e-9, `killing the enemy who'd have capitalized (${dead.toFixed(3)}) scored WORSE than leaving it at 1 HP (${nearlyDead.toFixed(3)})`);
});

test("PILE-ON RISK MONOTONICITY: holds across the FULL HP range of the capitalizing enemy, down to 0", () => {
  let previous = null;
  for (let hp = 20; hp >= 0; hp -= 1) {
    const scenario = makePileOnScenario({});
    scenario.combatants.set("other", { ...scenario.combatants.get("other"), currentHP: hp });
    const score = evaluateState(scenario, "party");
    if (previous !== null) assert.ok(score >= previous - 1e-9, `dropping the capitalizing enemy from ${hp + 1} to ${hp} HP LOWERED the score (${previous.toFixed(3)} -> ${score.toFixed(3)})`);
    previous = score;
  }
});

// --- threatReduction (GH #58 — threat-based target prioritization) ---
//
// Adversarially reviewed across TWO rounds before this code existed. Round 1's first draft
// (`weight * hpFractionRemovable * enemyThreatTotal`, an UNCAPPED per-enemy accumulator) failed
// concretely: the reviewer proved that in a 4-ally party vs. one dangerous "glass cannon" enemy,
// killing the single most dangerous enemy on the field scored WORSE, step by step, than leaving it
// at 1 HP — the same monotonicity bug class §17 already fixed for offensiveReach, and NOT fixable
// by any weight choice, since enemyThreatTotal has no ceiling. It also produced NaN whenever
// reachByEnemy had no entry for an enemy (every dead or unreached-by-any-ally enemy — the COMMON
// case, not an edge case), traced concretely into silent decision-selection degradation in
// decide.mjs and permanent value-poisoning in mcts-puct.mjs's backup step. The shipped formula
// instead normalizes threat into a SHARE (threatShare = enemyThreatTotal[enemy] / totalThreat,
// structurally in [0,1] regardless of party size or damage magnitude) multiplied by offensiveReach's
// own already-proven-safe Math.min(raw, currentHP) shape, reusing its identical `if (!raw) continue`
// guard — verified by round 2's own independent re-implementation against the real evaluator,
// including adversarial cases round 1 didn't try (12 enemies with wildly different maxHP, a single
// dominant threat plus 300 tiny ones, heavy-overkill combined with high share): worst-case per-HP
// delta measured at exactly 0.0000e+0 in every configuration.

function makeGlassCannonScenario({ allyCount = 4, enemyHP = 30 } = {}) {
  const pistol = { name: "Pistol", strikeType: "ranged", attackBonus: 6, rangeIncrement: 50, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] };
  const glassCannonStrike = { name: "Overwhelming Blast", strikeType: "ranged", attackBonus: 10, rangeIncrement: 50, traits: [], damage: [{ dice: "3d12", bonus: 10, damageType: "fire" }] };
  const combatants = new Map();
  const positions = new Map();
  for (let i = 0; i < allyCount; i++) {
    const id = `ally-${i}`;
    combatants.set(id, { id, name: id, side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [pistol] });
    positions.set(id, { col: 5, row: 5 + i });
  }
  combatants.set("cannon", { id: "cannon", name: "cannon", side: "opposition", currentHP: enemyHP, maxHP: enemyHP, ac: 18, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [glassCannonStrike] });
  positions.set("cannon", { col: 7, row: 5 });
  return { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants, positions };
}

test("threatReduction MONOTONICITY: a dangerous 'glass cannon' enemy — the exact shape round 1's broken formula failed on — never scores worse to kill than to leave nearly dead, at party sizes 1 through 8", () => {
  for (const allyCount of [1, 2, 4, 8]) {
    const base = makeGlassCannonScenario({ allyCount, enemyHP: 30 });
    let previous = null;
    for (let hp = 30; hp >= 0; hp -= 1) {
      const clone = { ...base, combatants: new Map(base.combatants) };
      clone.combatants.set("cannon", { ...base.combatants.get("cannon"), currentHP: hp });
      const score = evaluateState(clone, "party");
      if (previous !== null) {
        assert.ok(score >= previous - 1e-9,
          `allyCount=${allyCount}: dropping the glass cannon from ${hp + 1} HP to ${hp} HP LOWERED the party's score (${previous.toFixed(4)} -> ${score.toFixed(4)})`);
      }
      previous = score;
    }
  }
});

// GH #58 — an adversarial review round found a real, would-ship monotonicity violation this file's
// OTHER monotonicity tests structurally could not catch: they only ever mutate currentHP, holding
// every other field fixed, but a REAL knockout also flips a correlated field (prone) at the exact
// same instant — applyKnockout (conditions.mjs) sets it unconditionally the moment a dying-rules
// combatant (usesDyingRules: any party-side PC by default, or an opposition NPC/boss with the real,
// documented pcDeathRules:true override) hits 0 HP. bestExpectedDamage reads that combatant's own
// prone via attackerConditionPenalty when THEY'RE the attacker — so before the fix at
// enemyThreatTotal's own point of computation, threatShare (and hence threatReduction, whose own
// ceiling is exactly (maxHP - currentHP), largest at 0 HP) genuinely dipped right at the knockout
// moment, for realistic maxHP values already present in this repo's own fixtures (100-300+).
function makeDyingRulesKnockoutScenario(dyingMaxHP) {
  const pistol = { name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 50, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] };
  const combatants = new Map([
    ["ally-0", { id: "ally-0", name: "ally-0", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [pistol] }],
    // A second, ordinary real threat with damage MATCHING the boss's own (needed to actually
    // reproduce the violation, not just gesture at the mechanism — with a much weaker rival, the
    // boss's threatShare stays close to 1 regardless of prone, and the dip is too small relative to
    // enemyDamage's own flat +1.0/HP buffer to ever go negative within a realistic maxHP range;
    // verified directly against this exact fixture before picking the maxHP values below).
    ["rival", { id: "rival", name: "rival", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Blast", strikeType: "ranged", attackBonus: 8, rangeIncrement: 50, traits: [], damage: [{ dice: "1d6", bonus: 10, damageType: "fire" }] }] }],
    // Opposition-side but real, documented pcDeathRules:true (design doc §49) — a genuine "boss"
    // configuration this engine supports, not a contrived fixture; maxHP matches real values
    // already present in this repo's own fixtures (grep data/*.mjs for maxHP:100-300+).
    ["boss", { id: "boss", name: "boss", side: "opposition", pcDeathRules: true, currentHP: 1, maxHP: dyingMaxHP, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Cannon", strikeType: "ranged", attackBonus: 8, rangeIncrement: 50, traits: [], damage: [{ dice: "1d6", bonus: 10, damageType: "force" }] }] }]
  ]);
  const positions = new Map([["ally-0", { col: 5, row: 5 }], ["rival", { col: 7, row: 5 }], ["boss", { col: 7, row: 6 }]]);
  return { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants, positions };
}

// maxHP values deliberately span both sides of this exact fixture's real, verified crossover point
// (~450, where the violation first turns negative) — 300 stays (barely) positive even with the bug
// present, so it alone would NOT have caught this; 600 and 900 are solidly, unambiguously negative
// with the bug present, confirmed by direct measurement before picking these numbers.
test("threatReduction MONOTONICITY: a dying-rules combatant's own real knockout transition (prone flips true at 0 HP, matching the real engine's applyKnockout) never scores worse than staying at 1 HP, at realistic maxHP values", () => {
  for (const dyingMaxHP of [300, 600, 900]) {
    const nearlyDead = makeDyingRulesKnockoutScenario(dyingMaxHP);
    nearlyDead.combatants.set("boss", { ...nearlyDead.combatants.get("boss"), currentHP: 1, prone: false });
    const knockedOut = makeDyingRulesKnockoutScenario(dyingMaxHP);
    knockedOut.combatants.set("boss", { ...knockedOut.combatants.get("boss"), currentHP: 0, prone: true }); // the REAL applyKnockout state, not just an hp change

    const scoreNearlyDead = evaluateState(nearlyDead, "party"); // party evaluating the opposition-side "boss" as one of its own threatReduction-tracked enemies
    const scoreKnockedOut = evaluateState(knockedOut, "party");
    assert.ok(scoreKnockedOut >= scoreNearlyDead - 1e-9,
      `maxHP=${dyingMaxHP}: knocking the boss out (prone:true at 0 HP, the real engine's own applyKnockout state) scored WORSE (${scoreKnockedOut.toFixed(4)}) than leaving it at 1 HP, not yet knocked out (${scoreNearlyDead.toFixed(4)})`);
  }
});

function makeThreatShareScenario(ownDamages) {
  const pistol = { name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 50, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] };
  const combatants = new Map([["ally-0", { id: "ally-0", name: "ally-0", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [pistol] }]]);
  const positions = new Map([["ally-0", { col: 5, row: 5 }]]);
  ownDamages.forEach((bonus, i) => {
    const id = `enemy-${i}`;
    // IDENTICAL AC/position/range for every enemy — the only thing that differs is each enemy's own
    // outgoing damage, so any ordering in the result is attributable to threatReduction alone, not
    // to AC/positioning differences (the exact confound round 1's own isolation test fell into).
    combatants.set(id, {
      id, name: id, side: "opposition", currentHP: 20, maxHP: 20, ac: 15,
      saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
      strikes: [{ name: "Blast", strikeType: "ranged", attackBonus: 8, rangeIncrement: 50, traits: [], damage: [{ dice: "1d1", bonus, damageType: "fire" }] }]
    });
    positions.set(id, { col: 7, row: 5 });
  });
  return { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants, positions };
}

test("threatReduction: a dead enemy's threat credit does NOT vanish at death — the score stays finite, and a real threat that just died still holds real, positive credit", () => {
  const state = makeThreatShareScenario([0, 30]); // enemy-0 harmless, enemy-1 the real threat
  const zeroWeight = { ...DEFAULT_WEIGHTS, threatReduction: 0 };
  state.combatants.set("enemy-1", { ...state.combatants.get("enemy-1"), currentHP: 0 }); // kill it outright

  const full = evaluateState(state, "party", DEFAULT_WEIGHTS);
  const zeroed = evaluateState(state, "party", zeroWeight);
  assert.ok(Number.isFinite(full), `evaluateState must stay finite with a dead enemy present, got ${full}`);
  assert.ok(Number.isFinite(zeroed), `evaluateState must stay finite with threatReduction zeroed, got ${zeroed}`);

  // enemy-1 was the only real threat on the field (enemy-0's own damage bonus is 0) — gating
  // enemyThreatTotal on aliveness the way reachByEnemy/visibleEnemies correctly do would make its
  // own threatShare collapse to 0 at the exact instant it died, losing the credit for the kill
  // itself. It must not: the credit is computed from its own (unchanged-by-death) attack stats.
  assert.ok(full - zeroed > 0, `a dead enemy who was a real threat must still contribute real, positive threatReduction credit (got ${(full - zeroed).toFixed(4)})`);
});

test("threatReduction: deliberately LOS-independent — a walled-off but ALIVE dangerous enemy still holds real threat credit, unlike offensiveReach/threatExposure which correctly zero out behind a wall", () => {
  const state = makeThreatShareScenario([0, 30]);
  // At full HP, (maxHP - currentHP) is trivially 0 for every enemy regardless of walls — damage
  // one enemy first so there's a real, nonzero baseline whose LOS-persistence is worth checking.
  state.combatants.set("enemy-1", { ...state.combatants.get("enemy-1"), currentHP: 10 });
  const zeroWeight = { ...DEFAULT_WEIGHTS, threatReduction: 0 };
  const walled = { ...state, walls: [{ c: [6, 0, 6, 20], move: 20, sight: 20 }] }; // splits column 5 (ally) from column 7 (both enemies)

  const full = evaluateState(walled, "party", DEFAULT_WEIGHTS);
  const zeroed = evaluateState(walled, "party", zeroWeight);
  assert.ok(Number.isFinite(full) && Number.isFinite(zeroed), "evaluateState must stay finite with every enemy behind a wall");
  assert.ok(full - zeroed > 0,
    `threatReduction is a lasting-threat measure, not a current-exposure one — a wall blocking LOS must NOT zero out a genuinely dangerous, still-alive enemy's credit (got ${(full - zeroed).toFixed(4)})`);

  // Sanity check this is exercising a REAL wall, not a no-op — checked DIRECTLY against the same
  // lineOfEffect function evaluateState itself uses, not indirectly via a score comparison: this
  // fixture's dangerous enemy-1 (bonus:30) makes threatExposure's own LOS-gated drop big enough to
  // outweigh offensiveReach's, so the walled/open TOTAL score can move either direction depending
  // on the mix — a real, confounding effect, not a reason to trust an indirect comparison here.
  assert.equal(lineOfEffect({ col: 5, row: 5 }, { col: 7, row: 5 }, walled.walls), false,
    "sanity check: this wall must genuinely block line of effect between the ally and the enemies, or this test isn't exercising a real wall");
});

// Isolates threatReduction's own contribution to the GAIN from a real hit on a SPECIFIC enemy
// (reducing their hp from hpBefore to hpAfter) via a difference-in-differences:
// evaluateState(default) - evaluateState(threatReduction:0), computed at each hp value, then
// subtracted. Every OTHER term is identical in both halves of each subtraction and cancels out
// exactly, so the result is threatReduction's own contribution to the attack's gain, alone — round
// 2's own confirmed-working "shared state" construction, NOT the "two separate single-enemy
// states" reading round 2 proved measures pure floating-point noise (in a genuinely isolated
// single-enemy state, threatShare is ALWAYS exactly 1 regardless of that enemy's own damage, so
// the two states are structurally indistinguishable to this term).
function threatReductionGainFromHitting(state, enemyId, hpBefore, hpAfter) {
  const zeroWeight = { ...DEFAULT_WEIGHTS, threatReduction: 0 };
  function isolatedValueAt(hp) {
    const clone = { ...state, combatants: new Map(state.combatants) };
    clone.combatants.set(enemyId, { ...state.combatants.get(enemyId), currentHP: hp });
    return evaluateState(clone, "party", DEFAULT_WEIGHTS) - evaluateState(clone, "party", zeroWeight);
  }
  return isolatedValueAt(hpAfter) - isolatedValueAt(hpBefore);
}

test("threatReduction ISOLATION: two same-AC, same-position enemies sharing one state, differing only in own damage — the harder hitter's own gain-from-being-hit is strictly larger", () => {
  const state = makeThreatShareScenario([0, 30]); // enemy-0 weak, enemy-1 hard-hitting
  const weakGain = threatReductionGainFromHitting(state, "enemy-0", 20, 19);
  const hardGain = threatReductionGainFromHitting(state, "enemy-1", 20, 19);
  assert.ok(hardGain > weakGain,
    `hitting the harder-hitting enemy must earn a strictly larger threatReduction gain (${hardGain.toFixed(4)}) than hitting the weak one (${weakGain.toFixed(4)}) — this is the actual #58 signal, isolated from every other term`);
  assert.ok(weakGain > 0, "even hitting the weaker enemy still earns SOME threatReduction credit, proportional to its own real share");
});

test("threatReduction ISOLATION: three enemies sharing one state (low/mid/high own damage) — gain-from-being-hit is strictly ordered low < mid < high, proving threatShare's proportional split, not just a binary check", () => {
  const state = makeThreatShareScenario([0, 15, 30]);
  const lowGain = threatReductionGainFromHitting(state, "enemy-0", 20, 19);
  const midGain = threatReductionGainFromHitting(state, "enemy-1", 20, 19);
  const highGain = threatReductionGainFromHitting(state, "enemy-2", 20, 19);
  assert.ok(lowGain < midGain, `low (${lowGain.toFixed(4)}) must be less than mid (${midGain.toFixed(4)})`);
  assert.ok(midGain < highGain, `mid (${midGain.toFixed(4)}) must be less than high (${highGain.toFixed(4)})`);
});

// Directly encodes GH #58's own literal acceptance criterion: "the high-damage-enemy case ...
// scores ABOVE the low-damage one at equal AC-adjusted hit chance, with a unit test pinning the
// ordering." Same equal-AC construction as the isolation tests above (the issue's own original
// measurement was actually AC-confounded — the high-damage enemy in that repro had HIGHER AC,
// hence harder to hit, which is exactly the confound "equal AC-adjusted hit chance" asks to
// control for); unlike the isolation tests, this compares the FULL, real gain-from-attacking
// (evaluateState(after) - evaluateState(before)) at DEFAULT_WEIGHTS with nothing zeroed out — the
// actual quantity decide() itself compares between candidate actions — proving the shipped weight
// (0.2) is large enough to matter for real target selection, not just correctly-signed in isolation.
test("threatReduction closes GH #58's own literal acceptance test: at equal AC-adjusted hit chance, striking the higher-damage enemy now scores a strictly larger gain than striking the lower-damage one", () => {
  const state = makeThreatShareScenario([0, 30]);
  // The shipped formula's gradient is a constant weight*threatShare everywhere in [0, maxHP] (no
  // "low HP" region needed the way an earlier, superseded Math.min(raw, currentHP) draft required) —
  // starting HP here is arbitrary, kept low only to match the other tests in this section.
  state.combatants.set("enemy-0", { ...state.combatants.get("enemy-0"), currentHP: 3, maxHP: 20 });
  state.combatants.set("enemy-1", { ...state.combatants.get("enemy-1"), currentHP: 3, maxHP: 20 });

  const before = evaluateState(state, "party");
  function gainFromHitting(enemyId) {
    const after = { ...state, combatants: new Map(state.combatants) };
    after.combatants.set(enemyId, { ...state.combatants.get(enemyId), currentHP: 2 });
    return evaluateState(after, "party") - before;
  }
  const gainLow = gainFromHitting("enemy-0");
  const gainHigh = gainFromHitting("enemy-1");
  assert.ok(gainHigh > gainLow,
    `at equal AC-adjusted hit chance, hitting the high-damage enemy (gain ${gainHigh.toFixed(4)}) must now score strictly above hitting the low-damage one (gain ${gainLow.toFixed(4)}) — this is GH #58's own literal "Done when" criterion`);
});

test("WEIGHTS: threatReduction is strictly below enemyDamage — the same structural condition offensiveReach's own monotonicity proof depends on", () => {
  assert.ok(DEFAULT_WEIGHTS.threatReduction < DEFAULT_WEIGHTS.enemyDamage,
    `threatReduction (${DEFAULT_WEIGHTS.threatReduction}) must stay below enemyDamage (${DEFAULT_WEIGHTS.enemyDamage})`);
});

// --- Flanking (GH #59) — bestExpectedDamage prices the off-guard AC reduction a flank produces ---
//
// Adversarially reviewed before this shipped. Confirmed sound: reusing isFlanking directly (the
// same predicate engine.mjs applies at real resolution time) rather than reimplementing the
// geometry, and the melee-only / non-stacking-with-conditions gating. Found and fixed before any
// code existed: (A) building the ally list from evaluateState's own broader `allies` array would
// silently credit a NEUTRAL combatant as a flank partner — engine.mjs's own real resolution-time
// gate (alliesWithPositions) strictly requires an exact side match, excluding neutrals, so an
// evaluator that used the broader list would value a "flank" that grants zero actual AC reduction
// when it resolves; (B) setupValue's own stillToActIds-filtered ally list is a tempting but WRONG
// source for "who can flank with me" — a flanking partner only needs to be alive and correctly
// sided, never "hasn't acted yet this round". Both are covered directly below, not just the
// literal "Done when" case.

function makeFlankingScenario({ secondCombatantSide = "party" } = {}) {
  const sword = { name: "Sword", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d8", bonus: 2, damageType: "slashing" }] };
  const rogue = { id: "rogue", name: "rogue", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const second = { id: "second", name: "second", side: secondCombatantSide, currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const enemy = { id: "enemy", name: "enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const combatants = new Map([["rogue", rogue], ["second", second], ["enemy", enemy]]);
  // rogue north of enemy, "second" south — the exact opposite compass heading, a textbook flank.
  const positions = new Map([["rogue", { col: 10, row: 9 }], ["second", { col: 10, row: 11 }], ["enemy", { col: 10, row: 10 }]]);
  return { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants, positions };
}

test("FLANKING: a textbook flank (rogue + a real party ally on opposite headings from the enemy) scores strictly above the identical position with no flanking partner present", () => {
  const flanked = makeFlankingScenario({ secondCombatantSide: "party" });
  const noPartner = { ...flanked, combatants: new Map(flanked.combatants), positions: new Map(flanked.positions) };
  noPartner.combatants.delete("second");
  noPartner.positions.delete("second");
  const flankedScore = evaluateState(flanked, "party", DEFAULT_WEIGHTS);
  const noPartnerScore = evaluateState(noPartner, "party", DEFAULT_WEIGHTS);
  assert.ok(flankedScore > noPartnerScore,
    `GH #59's own literal "Done when": a textbook flank (${flankedScore.toFixed(4)}) must score strictly above the equivalent non-flanking position (${noPartnerScore.toFixed(4)})`);
});

test("FLANKING: a NEUTRAL combatant standing in the exact flanking square does NOT count as a flank partner — matching engine.mjs's own real resolution-time exclusion of neutrals, not evaluateState's own broader ally-side notion", () => {
  // Isolated via bestExpectedDamage directly, not the full evaluateState score — a neutral
  // combatant's mere PRESENCE still affects other, unrelated terms (allyDamage, outnumberedCaution's
  // visible-headcount, etc.), so comparing full evaluateState scores would conflate "does it count
  // as a flank partner" with "does it exist in the state at all". This isolates the one thing GH #59
  // actually changed: bestExpectedDamage's own flanking bonus.
  const sword = { name: "Sword", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d8", bonus: 2, damageType: "slashing" }] };
  const rogue = { id: "rogue", name: "rogue", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const partner = { id: "partner", name: "partner", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const neutral = { ...partner, id: "neutral", name: "neutral", side: "neutral" };
  const target = { id: "enemy", name: "enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const rogueFromPos = { col: 10, row: 9 }, enemyPos = { col: 10, row: 10 }, partnerPos = { col: 10, row: 11 };

  const state = { combatants: new Map([["rogue", rogue], ["neutral", neutral]]), positions: new Map([["rogue", rogueFromPos], ["neutral", partnerPos]]) };
  const realAlliesOfRogue = alliesWithPositions(state, rogue); // the REAL production path, not a hand-built list
  assert.deepEqual(realAlliesOfRogue, [], "alliesWithPositions must exclude a neutral combatant entirely — it is not on rogue's own side");

  const withRealPartner = bestExpectedDamage(rogue, rogueFromPos, target, enemyPos, [], [{ id: partner.id, pos: partnerPos, combatant: partner }]);
  const withNeutralOnly = bestExpectedDamage(rogue, rogueFromPos, target, enemyPos, [], realAlliesOfRogue);
  const withNoOne = bestExpectedDamage(rogue, rogueFromPos, target, enemyPos, [], []);
  assert.ok(withRealPartner > withNeutralOnly, `a real party-side partner (${withRealPartner}) must score above a neutral in the identical position (${withNeutralOnly})`);
  assert.equal(withNeutralOnly, withNoOne, "once correctly filtered by alliesWithPositions, a neutral contributes nothing — identical to having no potential partner at all");
});

test("FLANKING: end-to-end through the REAL evaluateState wiring (not just bestExpectedDamage directly) — offensiveReach's own isolated credit is strictly lower with a neutral in the flanking square than with a real party partner", () => {
  // Isolates offensiveReach's own contribution via a zero-weight control (this project's established
  // difference-in-differences technique, GH #58) so allyDamage/outnumberedCaution/etc. — which
  // legitimately DO differ between "a neutral is present" and "a party member is present", for
  // reasons unrelated to flanking — cancel out of the comparison instead of confounding it. This is
  // the test that actually exercises the real call site inside evaluateState's own per-ally loop
  // (state-value.mjs's own alliesForFlanking construction), not just the bestExpectedDamage/
  // alliesWithPositions primitives in isolation above — confirmed load-bearing by temporarily
  // reintroducing the original bug (building alliesForFlanking from the broader `allies` array) at
  // that exact call site: this specific test is the one that fails, the isolated unit tests above do not.
  const zeroOffensiveReach = { ...DEFAULT_WEIGHTS, offensiveReach: 0 };
  function isolatedOffensiveReach(secondCombatantSide) {
    const state = makeFlankingScenario({ secondCombatantSide });
    return evaluateState(state, "party", DEFAULT_WEIGHTS) - evaluateState(state, "party", zeroOffensiveReach);
  }
  const withRealPartner = isolatedOffensiveReach("party");
  const withNeutral = isolatedOffensiveReach("neutral");
  assert.ok(withRealPartner > withNeutral,
    `offensiveReach's own isolated credit with a real party partner (${withRealPartner.toFixed(4)}) must exceed a neutral in the identical flanking square (${withNeutral.toFixed(4)}) — if these are ever equal, alliesForFlanking is being built from something broader than an exact side match again`);
});

test("FLANKING: does not stack with an already-off-guard (prone) target — the AC drop is exactly 2, never 4", () => {
  const sword = { name: "Sword", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d8", bonus: 2, damageType: "slashing" }] };
  const rogue = { id: "rogue", name: "rogue", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const partner = { id: "partner", name: "partner", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const target = { id: "enemy", name: "enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const rogueFromPos = { col: 10, row: 9 }, enemyPos = { col: 10, row: 10 }, partnerPos = { col: 10, row: 11 };
  const realAllies = [{ id: partner.id, pos: partnerPos, combatant: partner }];

  const proneAlone = bestExpectedDamage(rogue, rogueFromPos, { ...target, prone: true }, enemyPos, [], []);
  const proneWithFlank = bestExpectedDamage(rogue, rogueFromPos, { ...target, prone: true }, enemyPos, [], realAllies);
  assert.ok(Math.abs(proneAlone - proneWithFlank) < 1e-9,
    `a prone (already off-guard) target must score identically whether or not it's ALSO flanked (${proneAlone.toFixed(4)} vs ${proneWithFlank.toFixed(4)}) — off-guard doesn't stack with itself`);

  const uprightNoFlank = bestExpectedDamage(rogue, rogueFromPos, target, enemyPos, [], []);
  assert.ok(proneAlone > uprightNoFlank, "sanity check: prone alone must still be worth something, or this test isn't exercising a real off-guard bonus");
});

test("FLANKING: a ranged Strike option never gets the flanking bonus — off-guard from flanking applies to melee attacks only", () => {
  const pistol = { name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] };
  const gunner = { id: "gunner", name: "gunner", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [pistol] };
  const partner = { id: "partner", name: "partner", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d8", bonus: 2, damageType: "slashing" }] }] };
  const target = { id: "enemy", name: "enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const gunnerFromPos = { col: 10, row: 9 }, enemyPos = { col: 10, row: 10 }, partnerPos = { col: 10, row: 11 };
  const realAllies = [{ id: partner.id, pos: partnerPos, combatant: partner }];

  const withoutFlank = bestExpectedDamage(gunner, gunnerFromPos, target, enemyPos, [], []);
  const withFlank = bestExpectedDamage(gunner, gunnerFromPos, target, enemyPos, [], realAllies);
  assert.equal(withoutFlank, withFlank, "a ranged attacker's own expected damage must be completely unaffected by a flanking partner being present — flanking's off-guard never applies to ranged Strikes");
});

test("FLANKING: setupValue counts an ALREADY-ACTED ally as a real flank partner — stillToActIds restricts whose OWN setup value counts, never who can complete a flank", () => {
  const sword = { name: "Sword", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d8", bonus: 2, damageType: "slashing" }] };
  // "rogue" is the acting combatant (evaluateState's own actingCombatantId) — positioned away from
  // the actual fight so it contributes no offensiveReach/setupValue of its own and can't confound
  // the comparison. "future" is still to act (comes AFTER rogue in initiative) — the one ally whose
  // OWN setupValue actually gets credited here. "veteran" already acted (comes BEFORE rogue) but
  // stands in the real flanking square opposite "future" — must still count as "future"'s partner.
  const rogue = { id: "rogue", name: "rogue", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const future = { id: "future", name: "future", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const veteran = { id: "veteran", name: "veteran", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const enemy = { id: "enemy", name: "enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  const positions = new Map([["rogue", { col: 0, row: 0 }], ["future", { col: 10, row: 9 }], ["veteran", { col: 10, row: 11 }], ["enemy", { col: 10, row: 10 }]]);
  const combatants = new Map([["rogue", rogue], ["future", future], ["veteran", veteran], ["enemy", enemy]]);
  const initiativeOrder = ["veteran", "rogue", "future"]; // veteran already acted; future is still to act

  const withVeteran = { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants, positions, initiativeOrder };
  const withoutVeteran = { ...withVeteran, combatants: new Map(combatants), positions: new Map(positions) };
  withoutVeteran.combatants.delete("veteran");
  withoutVeteran.positions.delete("veteran");

  // Isolated via a zero-weight difference-in-differences (same technique as the offensiveReach test
  // above) — removing "veteran" from the state also changes OTHER, unrelated terms (e.g.
  // outnumberedCaution's own visible-ally headcount), which confounds a raw full-score comparison
  // the same way a neutral bystander confounded the earlier test. Isolating setupValue specifically
  // is what actually proves the mechanism under test, not just "veteran's presence changes the score
  // somehow".
  const zeroSetupValue = { ...DEFAULT_WEIGHTS, setupValue: 0 };
  function isolatedSetupValue(state) {
    return evaluateState(state, "party", DEFAULT_WEIGHTS, "rogue") - evaluateState(state, "party", zeroSetupValue, "rogue");
  }
  const setupValueWithVeteran = isolatedSetupValue(withVeteran);
  const setupValueWithoutVeteran = isolatedSetupValue(withoutVeteran);
  // A real, substantial gap (~0.39 when correct), NOT a bare `>` — the buggy (stillToActIds-leaked)
  // version of this construction makes BOTH sides land within floating-point noise of each other
  // (observed ~1e-15 apart, which a bare `>` would pass VACUOUSLY on the noise's own arbitrary
  // sign) rather than truly equal, so this must require a MEANINGFUL margin to actually distinguish
  // "veteran genuinely credited" from "veteran silently dropped".
  assert.ok(setupValueWithVeteran - setupValueWithoutVeteran > 1e-6,
    `"future" (still to act) must get a real, isolated setupValue boost from "veteran" (already acted) completing a flank alongside it (with veteran: ${setupValueWithVeteran.toFixed(4)}, without: ${setupValueWithoutVeteran.toFixed(4)}) — stillToActIds must restrict whose OWN attack counts, never who can complete a flank for someone else`);
});

// --- Area attacks visible to the evaluator (GH #61, Gap 1) ---
//
// Confirmed directly before this shipped: attackOptions(tough) returned only "Gun Bash" — the real
// Frag Grenade fixture was completely invisible to threatExposure/offensiveReach/resource, on
// EITHER side, so a grenadier's own threat never registered and spending a limited grenade charge
// cost nothing. Out of scope here (GH #61's own explicit scope, Gap 2): aiming a blast at empty
// ground — this only closes the "the evaluator is blind to area attacks" half.

test("attackOptions: includes areaAttacks — a real grenadier's grenade is no longer invisible to the evaluator", () => {
  const withGrenade = { strikes: [{ name: "Gun Bash", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }], areaAttacks: [{ name: "Frag Grenade", saveType: "ref", dc: 17, range: 70, radius: 5, actions: 1, damage: [{ dice: "1d8", bonus: 0, damageType: "fire" }] }] };
  const names = attackOptions(withGrenade).map((o) => o.name);
  assert.ok(names.includes("Frag Grenade"), `expected "Frag Grenade" among attackOptions, got: ${JSON.stringify(names)}`);
});

test("attackOptions: an areaAttack with usesRemaining:0 is correctly excluded — matching every other limited-use option type", () => {
  const spent = { strikes: [], areaAttacks: [{ name: "Frag Grenade", saveType: "ref", dc: 17, range: 70, radius: 5, actions: 1, damage: [{ dice: "1d8", bonus: 0, damageType: "fire" }], usesRemaining: 0 }] };
  assert.deepEqual(attackOptions(spent), [], "an area attack with zero uses remaining must not be offered as a real option");
});

test("threatExposure: a grenadier's own area attack now registers as a real, isolated threat to a nearby ally — GH #61's own literal 'Done when' wording", () => {
  const grenadier = { id: "grenadier", name: "grenadier", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], areaAttacks: [{ name: "Frag Grenade", saveType: "ref", dc: 17, range: 70, radius: 5, actions: 1, damage: [{ dice: "3d6", bonus: 0, damageType: "fire" }] }] };
  const ally = { id: "ally", name: "ally", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const state = { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants: new Map([["ally", ally], ["grenadier", grenadier]]), positions: new Map([["ally", { col: 0, row: 0 }], ["grenadier", { col: 0, row: 10 }]]) };
  const zeroThreatExposure = { ...DEFAULT_WEIGHTS, threatExposure: 0 };
  const isolatedThreatExposure = evaluateState(state, "party", DEFAULT_WEIGHTS) - evaluateState(state, "party", zeroThreatExposure);
  assert.ok(isolatedThreatExposure < -1e-6, `expected a real, negative (costly) threatExposure contribution from the grenadier's own grenade, got ${isolatedThreatExposure.toFixed(4)}`);
});

test("RESOURCE: a limited-use areaAttack with charges left is worth something to its side, same as any other limited-use option", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  const withResource = { ...base, combatants: new Map(base.combatants) };
  withResource.combatants.set("ally-0", { ...base.combatants.get("ally-0"), areaAttacks: [{ name: "Frag Grenade", saveType: "ref", dc: 17, range: 70, radius: 5, actions: 1, damage: [{ dice: "1d8", bonus: 0, damageType: "fire" }], usesRemaining: 1 }] });
  assert.ok(evaluateState(withResource, "party") > evaluateState(base, "party"), "an unspent limited-use area attack must be worth something, same as a strike/spell/heal/saveAttack/conditionSave");
});

// --- GH #60, Part 2: dyingUrgency + downedAllyClosing ---
//
// Confirmed directly before either term existed: an ally at dyingValue 1 and the same ally at
// dyingValue 3 scored byte-identically (this file never read dyingValue at all), even though the
// real recovery-check DC compounds with it (conditions.mjs's own resolveRecoveryCheck, 10 +
// dyingValue) — risk gets harder to escape exactly as death gets closer. `downedAllyClosing` is the
// distance-gradient counterpart: `closing` only ever pulls toward the nearest ENEMY, nothing pulled
// toward a downed ally needing rescue.

function withUnconscious(ally, dyingValue) {
  return { ...ally, currentHP: 0, dyingValue };
}

test("DYING URGENCY: a downed ally at dyingValue 3 scores worse for their own side than the identical ally at dyingValue 1", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  const dying1 = { ...base, combatants: new Map(base.combatants) };
  dying1.combatants.set("ally-0", withUnconscious(base.combatants.get("ally-0"), 1));
  const dying3 = { ...base, combatants: new Map(base.combatants) };
  dying3.combatants.set("ally-0", withUnconscious(base.combatants.get("ally-0"), 3));

  const scoreDying1 = evaluateState(dying1, "party");
  const scoreDying3 = evaluateState(dying3, "party");
  assert.ok(scoreDying3 < scoreDying1,
    `a dyingValue-3 ally (${scoreDying3.toFixed(2)}) must score WORSE for their own side than the identical ally at dyingValue 1 (${scoreDying1.toFixed(2)}) — before this term existed these scored byte-identically.`);
});

test("DYING URGENCY MONOTONICITY: strictly increasing dyingValue must never increase the score, holding everything else fixed", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  let previous = null;
  for (let dyingValue = 0; dyingValue <= 3; dyingValue++) {
    const state = { ...base, combatants: new Map(base.combatants) };
    // dyingValue 0 with currentHP:0 would read as isDead (usesDyingRules + currentHP<=0 + dyingValue<4
    // is still alive/unconscious per conditions.mjs) -- use a live ally as the dyingValue:0 baseline
    // instead, matching how a real combatant reaches dyingValue 1 (from full HP, not from 0 already).
    const ally = dyingValue === 0 ? base.combatants.get("ally-0") : withUnconscious(base.combatants.get("ally-0"), dyingValue);
    state.combatants.set("ally-0", ally);
    const score = evaluateState(state, "party");
    if (previous !== null) {
      assert.ok(score <= previous + 1e-9,
        `dyingValue ${dyingValue - 1} -> ${dyingValue} must never INCREASE the score (${previous.toFixed(2)} -> ${score.toFixed(2)}).`);
    }
    previous = score;
  }
});

test("DYING URGENCY: an ally merely hurt but still conscious contributes nothing — only isUnconscious triggers this term", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  const hurt = { ...base, combatants: new Map(base.combatants) };
  hurt.combatants.set("ally-0", { ...base.combatants.get("ally-0"), currentHP: 1 }); // hurt, but not down
  const zeroDyingUrgency = { ...DEFAULT_WEIGHTS, dyingUrgency: 0 };
  const isolated = evaluateState(hurt, "party", DEFAULT_WEIGHTS) - evaluateState(hurt, "party", zeroDyingUrgency);
  assert.ok(Math.abs(isolated) < 1e-9, `a conscious ally at 1 HP must contribute exactly 0 dyingUrgency, got ${isolated}`);
});

test("DOWNED ALLY CLOSING: a rescuer ending their move closer to (or within reach of) a downed ally scores better than one who doesn't", () => {
  const sword = { name: "Sword", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d8", bonus: 2, damageType: "slashing" }] };
  const downed = { id: "downed", name: "downed", side: "party", currentHP: 0, dyingValue: 1, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], healAbilities: [{ name: "Heal (touch)", healingFormula: "1d8", actions: 1 }] };
  const rescuer = { id: "rescuer", name: "rescuer", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword], healAbilities: [{ name: "Heal (touch)", healingFormula: "1d8", actions: 1 }] };
  const enemy = { id: "enemy", name: "enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };

  function stateWithRescuerAt(col) {
    return {
      round: 1, seed: 1, gridSize: { cols: 40, rows: 40 },
      combatants: new Map([["downed", downed], ["rescuer", rescuer], ["enemy", enemy]]),
      positions: new Map([["downed", { col: 20, row: 20 }], ["rescuer", { col, row: 20 }], ["enemy", { col: 0, row: 0 }]])
    };
  }
  const zeroTerm = { ...DEFAULT_WEIGHTS, downedAllyClosing: 0 };
  function isolated(state) {
    return evaluateState(state, "party", DEFAULT_WEIGHTS) - evaluateState(state, "party", zeroTerm);
  }
  const far = isolated(stateWithRescuerAt(30));   // 10 squares = 50ft away -- well beyond touch reach
  const near = isolated(stateWithRescuerAt(21));  // 1 square = 5ft away -- within touch reach (FEET_PER_SQUARE)
  assert.ok(near > far, `a rescuer within touch reach of a downed ally (${near.toFixed(4)}) must score better than one 50ft away (${far.toFixed(4)})`);
  assert.ok(Math.abs(near) < 1e-9, `a rescuer already within touch reach must farm zero credit from this term, got ${near}`);
});

test("DOWNED ALLY CLOSING REGRESSION (round-2 review finding): a real healer already in range must zero out the term, even when a closer non-healer bystander is nearer by raw distance", () => {
  const sword = { name: "Sword", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d8", bonus: 2, damageType: "slashing" }] };
  const downed = { id: "downed", name: "downed", side: "party", currentHP: 0, dyingValue: 1, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  // "bystander" has NO heal option at all (healReachFeet -> null -> 0 reach) and stands very close --
  // the exact case a "nearest by raw distance" bug would wrongly select.
  const bystander = { id: "bystander", name: "bystander", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };
  // "healer" has a real 30ft heal and stands FARTHER than the bystander, but still within their own
  // real reach -- already able to resolve this right now with zero movement.
  const healer = { id: "healer", name: "healer", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], healAbilities: [{ name: "Heal (30ft)", range: 30, healingFormula: "1d8+8", actions: 2 }] };
  const enemy = { id: "enemy", name: "enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [sword] };

  const state = {
    round: 1, seed: 1, gridSize: { cols: 40, rows: 40 },
    combatants: new Map([["downed", downed], ["bystander", bystander], ["healer", healer], ["enemy", enemy]]),
    positions: new Map([
      ["downed", { col: 20, row: 20 }],
      ["bystander", { col: 20, row: 21 }],  // 1 square = 5ft away, reach 0 -- nearest by raw distance
      ["healer", { col: 20, row: 25 }],     // 5 squares = 25ft away, reach 30ft -- already in range (shortfall 0)
      ["enemy", { col: 0, row: 0 }]
    ])
  };
  const zeroTerm = { ...DEFAULT_WEIGHTS, downedAllyClosing: 0 };
  const isolated = evaluateState(state, "party", DEFAULT_WEIGHTS) - evaluateState(state, "party", zeroTerm);
  assert.ok(Math.abs(isolated) < 1e-9,
    `expected exactly 0 (the real healer at 25ft is already within their own 30ft reach) but got ${isolated.toFixed(4)} -- a "nearest rescuer by raw distance" bug would have priced the closer bystander's own 5ft shortfall (reach 0) instead of recognizing the farther healer is already covered.`);
});

test("DOWNED ALLY CLOSING: with no living rescuer at all, the term contributes nothing and evaluateState does not throw", () => {
  const downed = { id: "downed", name: "downed", side: "party", currentHP: 0, dyingValue: 1, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const enemy = { id: "enemy", name: "enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [] };
  const state = { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, combatants: new Map([["downed", downed], ["enemy", enemy]]), positions: new Map([["downed", { col: 5, row: 5 }], ["enemy", { col: 0, row: 0 }]]) };
  assert.doesNotThrow(() => evaluateState(state, "party"));
});
