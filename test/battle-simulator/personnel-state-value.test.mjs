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

// --- stunDenial (design doc §22) ---

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

test("stunDenial scales with the real number of rounds stunned — 2 rounds is worth exactly twice 1 round", () => {
  const base = makeState({ allyCount: 1, enemyCount: 1 });
  const before = evaluateState(base, "party");
  const one = { ...base, combatants: new Map(base.combatants) };
  one.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), stunnedValue: 1 });
  const two = { ...base, combatants: new Map(base.combatants) };
  two.combatants.set("enemy-0", { ...base.combatants.get("enemy-0"), stunnedValue: 2 });
  const gainOne = evaluateState(one, "party") - before;
  const gainTwo = evaluateState(two, "party") - before;
  assert.ok(Math.abs(gainTwo - 2 * gainOne) < 1e-9, `expected exactly linear scaling (1 round: +${gainOne.toFixed(3)}, 2 rounds: +${gainTwo.toFixed(3)})`);
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

test("lowHpCaution: scales LINEARLY with HP fraction, not a threshold — the exactly-continuous shape design doc §22's own 'moving 3x is an alarm' bug taught this project to prefer over any cliff", () => {
  // cautionCost is proportional to (1 - hpFraction) at a fair, unoutnumbered ratio (outnumberedFactor
  // stays pinned at 1 throughout, unaffected by HP) — so cost(15 of 20 HP)/cost(10 of 20 HP) must
  // equal (1-15/20)/(1-10/20) = 0.25/0.50 = 0.5 exactly, a precise check, not just "goes up."
  const at15 = cautionCost(makeState({ allyCount: 1, enemyCount: 1, allyHP: 15 }));
  const at10 = cautionCost(makeState({ allyCount: 1, enemyCount: 1, allyHP: 10 }));
  assert.ok(Math.abs(at15 / at10 - 0.5) < 1e-6, `expected cost(15hp)/cost(10hp) == 0.5 exactly (got ${(at15 / at10).toFixed(4)}, at15=${at15.toFixed(4)}, at10=${at10.toFixed(4)})`);
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
