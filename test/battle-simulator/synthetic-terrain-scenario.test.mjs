/**
 * End-to-end proof that the terrain engine works as a WHOLE, not just in
 * isolated unit tests (design doc §15p/§15q) — exactly what Ingram asked
 * for: "you can always throw in some temporary walls for testing purposes."
 * No unit test proves the pieces actually cooperate; only a real runBattle
 * using the real decision layer does. Real city terrain is a separate,
 * ongoing effort — this scenario is synthetic and exists only to exercise
 * the engine, never wired into run-scenario.mjs's canonical set.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/engine/engine.mjs";
import { decide } from "../../tools/battle-simulator/ai/decide.mjs";
import { checkMoveLegality, checkStrikeLegal } from "../../tools/battle-simulator/engine/legality.mjs";
import { EDGE_SENSE } from "../../tools/battle-simulator/engine/terrain.mjs";
import { collectRunMetrics } from "../../tools/battle-simulator/analysis/metrics.mjs";

/** A wall spanning the full column-boundary at x=col, from row rowStart to rowEnd (exclusive top). */
function verticalWall(col, rowStart, rowEnd, { sight = EDGE_SENSE.NORMAL } = {}) {
  const segments = [];
  for (let row = rowStart; row < rowEnd; row++) segments.push({ c: [col, row, col, row + 1], move: EDGE_SENSE.NORMAL, sight });
  return segments;
}

function makeCombatant(id, side, position, overrides = {}) {
  return {
    id, name: id, kind: "chassis", side, size: "huge", maxHP: 200, currentHP: 200,
    ac: 15, hardness: 0, saves: { fort: 10, ref: 10, will: 10 }, speed: 900,
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 30, traits: [], damage: [{ dice: "2d10", bonus: 10 }] }],
    reactions: [], scaleBlind: false, position,
    ...overrides
  };
}

/** A wall splitting the grid in two, open only past row 15 — from the same shape as pathfind.test.mjs's proof. */
function buildWalledScenario({ seed }) {
  const attacker = makeCombatant("attacker", "party", { col: 4, row: 5 });
  const defender = makeCombatant("defender", "opposition", { col: 12, row: 5 });
  const walls = verticalWall(8, 0, 15); // splits the map between col 7 and col 8, open past row 15

  function ai(state, combatantId, turnState) {
    return decide(state, combatantId, turnState);
  }
  return { seed, gridSize: { cols: 20, rows: 20 }, roundLimit: 12, combatants: [attacker, defender], ai, walls };
}

test("INTEGRATION: the real AI routes AROUND a wall to close distance and fight — not scripted, the decision layer discovers this itself", () => {
  const log = runBattle(buildWalledScenario({ seed: 42 }));

  let totalDamage = 0, illegalCount = 0, everMoved = false;
  for (const round of log.rounds) {
    for (const turn of round.turns) {
      for (const action of turn.actions ?? []) {
        if (action.legal === false) illegalCount += 1;
        if (action.legal && (action.type === "move" || action.type === "step")) everMoved = true;
        if (action.legal && typeof action.damageApplied === "number") totalDamage += action.damageApplied;
      }
    }
  }

  assert.equal(illegalCount, 0, "the AI proposed an illegal move — it tried to walk through the wall instead of routing around it");
  assert.ok(everMoved, "expected real movement to have happened — a completely walled-off, unroutable fight would never move anyone");
  assert.ok(totalDamage > 0, "expected the two combatants to actually reach each other and fight — a fight that never gets past the wall would deal zero damage");
});

test("SANITY: the wall genuinely blocks the direct route — establishes what the AI in the test above must be routing around, rather than assuming it", () => {
  const scenario = buildWalledScenario({ seed: 42 });
  const direct = checkMoveLegality({
    combatant: { id: "attacker" }, from: { col: 4, row: 5 }, to: { col: 12, row: 5 },
    effectiveSpeed: 9000, feetAlreadyMovedThisTurn: 0,
    allPositions: [{ combatantId: "defender", pos: { col: 12, row: 5 } }],
    gridSize: scenario.gridSize, turnState: { actionsAvailable: 3, actionsUsed: 0 }, walls: scenario.walls
  });
  assert.equal(direct.legal, false, "the direct line through the wall must be illegal — otherwise the test above isn't proving what it claims to");
});

/**
 * REGRESSION (design doc §15q). The first pathfinding-aware candidate generator found real
 * routes correctly but scored them by straight-line distance, which stops correlating with
 * true proximity next to a wall — this produced a genuine infinite oscillation, two combatants
 * cycling the exact same four-round position sequence forever. Fixed with a proper flow field
 * (a second Dijkstra run FROM the target). One seed passing proves nothing about that class of
 * bug — this is a real, if slow, statistical check across many seeds, per this project's
 * standing practice of verifying AI/movement changes with a real sweep, not one lucky run.
 */
// 5 seeds, not 20 — the pathfinding-aware path costs real time (~2.5s/battle here; see design
// doc §15q on why), and this file already runs as part of the default `node --test` suite. 5 is
// enough to catch a systemic oscillation bug (it showed up on essentially every seed tried while
// this was broken) without meaningfully slowing down everyone's everyday test run.
test("STATISTICAL: 5 seeds of the walled scenario all converge — none time out from oscillation", { timeout: 30000 }, () => {
  let timeouts = 0;
  const results = [];
  for (let seed = 1; seed <= 5; seed++) {
    const log = runBattle(buildWalledScenario({ seed }));
    if (log.outcome.result === "timeout") timeouts += 1;
    results.push(collectRunMetrics(log));
  }
  assert.equal(timeouts, 0, `${timeouts}/5 seeds failed to converge within the round limit — that is exactly the oscillation signature`);
  assert.ok(results.every((r) => r.illegalProposals === 0), "no seed should ever produce an illegal proposal");
});

test("INTEGRATION: a SIGHT-ONLY wall (blocks Line of Effect, not movement) prevents a ranged strike through it, while leaving movement completely free", () => {
  const wall = [{ c: [6, 4, 6, 6], move: EDGE_SENSE.NONE, sight: EDGE_SENSE.NORMAL }];
  const attacker = { id: "a", name: "A", currentHP: 100, size: "huge", scaleBlind: false };
  const target = { id: "b", name: "B", currentHP: 100, size: "huge" };
  const rangedStrike = { name: "Rifle", strikeType: "ranged", attackBonus: 10, rangeIncrement: 2000, traits: [], damage: [{ dice: "1d4", bonus: 0 }] };
  const turnState = { actionsAvailable: 3, actionsUsed: 0 };

  const blockedShot = checkStrikeLegal({ attacker, attackerPos: { col: 4, row: 5 }, target, targetPos: { col: 8, row: 5 }, strike: rangedStrike, turnState, walls: wall });
  assert.equal(blockedShot.legal, false, "a shot straight through a sight-blocking wall must be illegal");
  assert.match(blockedShot.reason, /line of effect/);

  const clearShot = checkStrikeLegal({ attacker, attackerPos: { col: 4, row: 5 }, target, targetPos: { col: 8, row: 20 }, strike: rangedStrike, turnState, walls: wall });
  assert.equal(clearShot.legal, true, "a shot that never crosses the wall must remain legal");

  const freeMove = checkMoveLegality({
    combatant: attacker, from: { col: 4, row: 5 }, to: { col: 8, row: 5 }, effectiveSpeed: 500, feetAlreadyMovedThisTurn: 0,
    allPositions: [], gridSize: { cols: 20, rows: 20 }, turnState, walls: wall
  });
  assert.equal(freeMove.legal, true, "move: NONE on this wall must leave movement completely unaffected, even straight across it");
});
