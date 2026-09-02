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
import { evaluateState, DEFAULT_WEIGHTS, bestExpectedDamage } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import { degreeProbabilities } from "../../tools/battle-simulator/engine/resolve.mjs";

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
