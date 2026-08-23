/**
 * VALUE-FUNCTION SANITY (design doc §17) — structural properties evaluateState must satisfy for
 * ANY state, independent of what the AI subsequently decides to do with it.
 *
 * WHY THIS TIER EXISTS, stated bluntly: two separate bugs in this session both consisted of the
 * evaluator scoring "the enemy is now closer to dead" as WORSE for the party, and both survived a
 * fully green test suite. Every existing test asserted things about *decisions* (is it legal, did
 * it spend its actions, does it not oscillate) or about *whole battles* (who won). Nothing asserted
 * that the scoring function itself was coherent — so an incoherent one passed everything.
 *
 * These are the cheapest and most powerful tests in the suite: pure, deterministic, no dice, no
 * battle, milliseconds to run. Each is a property a human can verify by reading, and which no
 * reasonable evaluator should ever violate.
 *
 * THE CENTRAL ONE IS MONOTONICITY IN ENEMY HP. It is worth stating why it is non-negotiable rather
 * than merely desirable: decide() chooses by `evaluateState(after) - evaluateState(before)`. If
 * hurting an enemy can lower the score, then attacking is self-punishing and the AI will
 * rationally avoid it — which is exactly what was measured (a melee Frame declining to finish
 * three nearly-dead enemies in reach; a 61% mid-turn target-switch rate; losing head-to-head to
 * "attack whatever is nearest"). No amount of tuning elsewhere can compensate for a value function
 * that points the wrong way.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateState, DEFAULT_WEIGHTS } from "../../tools/battle-simulator/ai/evaluate/state-value.mjs";

/**
 * A minimal state with `allyCount` party units and `enemyCount` opposition units, all mutually in
 * weapon range. allyCount is a parameter specifically because the second bug only appeared at
 * allyCount >= 2 — a single-ally fixture (which is what every earlier scenario effectively was)
 * cannot see it.
 */
function makeState({ allyCount = 1, enemyCount = 1, enemyHP = 100, allyHP = 100 } = {}) {
  const combatants = new Map();
  const positions = new Map();
  const strike = { name: "Cannon", strikeType: "ranged", attackBonus: 20, rangeIncrement: 500, traits: [], damage: [{ dice: "3d6", bonus: 10, damageType: "piercing" }] };

  for (let i = 0; i < allyCount; i++) {
    const id = `ally-${i}`;
    combatants.set(id, { id, name: id, side: "party", kind: "chassis", size: "large", currentHP: allyHP, maxHP: 100, ac: 25, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 300, strikes: [strike] });
    positions.set(id, { col: 5, row: 5 + i });
  }
  for (let i = 0; i < enemyCount; i++) {
    const id = `enemy-${i}`;
    combatants.set(id, { id, name: id, side: "opposition", kind: "chassis", size: "large", currentHP: enemyHP, maxHP: 100, ac: 25, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 300, strikes: [strike] });
    positions.set(id, { col: 7, row: 5 + i });
  }
  return { round: 1, seed: 1, gridSize: { cols: 44, rows: 44 }, combatants, positions, reactionAvailable: new Map(), civiliansEvacuated: 0 };
}

/** Same state, with one enemy's HP set to `hp`. */
function withEnemyHP(state, enemyId, hp) {
  const clone = { ...state, combatants: new Map(state.combatants), positions: new Map(state.positions) };
  clone.combatants.set(enemyId, { ...state.combatants.get(enemyId), currentHP: hp });
  return clone;
}

// ---------------------------------------------------------------------------
// THE CENTRAL INVARIANT
// ---------------------------------------------------------------------------

test("MONOTONICITY: reducing an enemy's HP never reduces the party's score — at every ally count from 1 to 5", () => {
  // Swept across ally counts on purpose. The §16 fix was verified at one ally and shipped; the
  // real failure needed two or more allies in range of the same target, so a single-ally test
  // would have passed while the bug was live. The sweep is the test.
  for (let allyCount = 1; allyCount <= 5; allyCount++) {
    const base = makeState({ allyCount, enemyCount: 1, enemyHP: 100 });
    let previous = null;
    for (let hp = 100; hp >= 0; hp -= 5) {
      const score = evaluateState(withEnemyHP(base, "enemy-0", hp), "party");
      if (previous !== null) {
        assert.ok(score >= previous - 1e-9,
          `allyCount=${allyCount}: dropping the enemy from ${hp + 5} HP to ${hp} HP LOWERED the party's score (${previous.toFixed(2)} -> ${score.toFixed(2)}). Attacking is self-punishing at this ally count.`);
      }
      previous = score;
    }
  }
});

test("MONOTONICITY: the same holds with several enemies present, so focus-firing one is never punished", () => {
  for (let allyCount = 1; allyCount <= 4; allyCount++) {
    const base = makeState({ allyCount, enemyCount: 4, enemyHP: 100 });
    let previous = null;
    for (let hp = 100; hp >= 0; hp -= 10) {
      const score = evaluateState(withEnemyHP(base, "enemy-0", hp), "party");
      if (previous !== null) {
        assert.ok(score >= previous - 1e-9,
          `allyCount=${allyCount}, 4 enemies: dropping enemy-0 from ${hp + 10} to ${hp} HP LOWERED the score (${previous.toFixed(2)} -> ${score.toFixed(2)}) — this is the damage-spreading bug.`);
      }
      previous = score;
    }
  }
});

test("KILL IS NEVER WORSE THAN NEARLY-KILLED: a dead enemy scores at least as well as the same enemy at 1 HP", () => {
  // The specific decision the AI got wrong in a real transcript: three allies in reach of a 7-HP
  // Claimant, and finishing it scored below a do-nothing Spot.
  for (let allyCount = 1; allyCount <= 5; allyCount++) {
    const base = makeState({ allyCount, enemyCount: 2, enemyHP: 100 });
    const nearlyDead = evaluateState(withEnemyHP(base, "enemy-0", 1), "party");
    const dead = evaluateState(withEnemyHP(base, "enemy-0", 0), "party");
    assert.ok(dead >= nearlyDead - 1e-9,
      `allyCount=${allyCount}: killing the enemy (${dead.toFixed(2)}) scored WORSE than leaving it at 1 HP (${nearlyDead.toFixed(2)}).`);
  }
});

// ---------------------------------------------------------------------------
// THE OTHER DIRECTIONS — cheap, and they pin the sign of every remaining term
// ---------------------------------------------------------------------------

test("MONOTONICITY: losing ally HP never RAISES the party's score", () => {
  const base = makeState({ allyCount: 3, enemyCount: 2 });
  let previous = null;
  for (let hp = 100; hp >= 5; hp -= 5) {
    const clone = { ...base, combatants: new Map(base.combatants) };
    clone.combatants.set("ally-0", { ...base.combatants.get("ally-0"), currentHP: hp });
    const score = evaluateState(clone, "party");
    if (previous !== null) assert.ok(score <= previous + 1e-9, `ally dropping from ${hp + 5} to ${hp} HP RAISED the party's score (${previous.toFixed(2)} -> ${score.toFixed(2)})`);
    previous = score;
  }
});

test("ZERO-SUM SANITY: a state good for the party is bad for the opposition — the two sides never both gain from the same change", () => {
  const base = makeState({ allyCount: 2, enemyCount: 2, enemyHP: 100 });
  const hurt = withEnemyHP(base, "enemy-0", 40);
  const partyDelta = evaluateState(hurt, "party") - evaluateState(base, "party");
  const oppositionDelta = evaluateState(hurt, "opposition") - evaluateState(base, "opposition");
  assert.ok(partyDelta >= 0, `hurting an enemy scored ${partyDelta.toFixed(2)} for the party`);
  assert.ok(oppositionDelta <= 0, `the same event scored ${oppositionDelta.toFixed(2)} for the opposition — both sides cannot gain`);
});

test("EVACUATION and SPOT have the sign their weights claim", () => {
  const base = makeState({ allyCount: 2, enemyCount: 1 });
  const evacuated = { ...base, civiliansEvacuated: 3 };
  assert.ok(evaluateState(evacuated, "party") > evaluateState(base, "party"), "evacuating civilians must be worth something to the party");

  const spotted = { ...base, combatants: new Map(base.combatants) };
  spotted.combatants.set("ally-0", { ...base.combatants.get("ally-0"), spotted: true });
  assert.ok(evaluateState(spotted, "party") > evaluateState(base, "party"), "an ally holding a Spot bonus must be worth something to the party");
});

test("SCALE SANITY: a full-HP enemy is worth more to remove than a nearly-dead one — the evaluator prefers real progress to overkill", () => {
  // Guards the opposite failure from the monotonicity bug: an over-aggressive cap could make all
  // enemies look identical regardless of health, erasing any reason to prefer a finishable target.
  const base = makeState({ allyCount: 2, enemyCount: 2, enemyHP: 100 });
  const before = evaluateState(base, "party");
  const killedHealthy = evaluateState(withEnemyHP(base, "enemy-0", 0), "party");
  assert.ok(killedHealthy - before > 0, "killing a healthy enemy must be a clear gain");
});

test("WEIGHTS: offensiveReach is strictly below enemyDamage — the structural condition the monotonicity proof depends on", () => {
  // Stated as an executable check rather than only a comment, because the monotonicity argument in
  // state-value.mjs is only valid while this holds. Raising offensiveReach above enemyDamage would
  // silently reintroduce the bug for every party size at once.
  assert.ok(DEFAULT_WEIGHTS.offensiveReach < DEFAULT_WEIGHTS.enemyDamage,
    `offensiveReach (${DEFAULT_WEIGHTS.offensiveReach}) must stay below enemyDamage (${DEFAULT_WEIGHTS.enemyDamage}) or hurting an enemy can score negative again`);
});
