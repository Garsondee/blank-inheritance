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
import { evaluateState, DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";

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
