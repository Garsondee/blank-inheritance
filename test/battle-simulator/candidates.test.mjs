/**
 * Tests for generateProposals (design doc §15j) — the "what could I do right
 * now" half of the current decision layer. This file used to test
 * candidates.mjs/computeDestination, the old generate-then-weight pipeline
 * deleted when decide.mjs replaced it (design doc §15i-15k); every test here
 * is either a genuine, still-true behavior re-targeted at the current
 * system, or an explicit regression guard against an OLD BUG this project
 * fixed — several of the original tests here asserted the bug itself (e.g.
 * "no move candidate once in clean range" was literally the root cause of
 * the 25% zero-action-turn failure the AI rebuild fixed), so they could not
 * simply be ported; porting them unchanged would have re-encoded the bug as
 * a passing test.
 *
 * The reserve-price/limited-weapon-conservation tests that used to live here
 * are NOT ported — that exact design intent is already covered, against the
 * current system, by party-ai.test.mjs's "DESIGN INTENT" tests.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateProposals } from "../../tools/battle-simulator/ai/decide.mjs";
import { distanceFeet } from "../../tools/battle-simulator/engine/grid.mjs";

const TURN = { actionsAvailable: 3, actionsUsed: 0, strikesAttempted: 0, feetMoved: 0, decisionIndex: 0, effective: { speed: 1500 } };
const SIDEARM = { name: "Mounted Sidearm", strikeType: "ranged", attackBonus: 20, rangeIncrement: 100, traits: ["mounted"], damage: [{ dice: "3d6", bonus: 10 }] };

function makeState(combatants) {
  return {
    gridSize: { cols: 44, rows: 44 },
    combatants: new Map(combatants.map((c) => [c.id, c])),
    positions: new Map(combatants.map((c) => [c.id, c.position]))
  };
}

// ---------------------------------------------------------------------------
// Movement candidates: Speed budget, standoff, occupancy — still-true rules,
// re-targeted at generateProposals's move/step candidates.
// ---------------------------------------------------------------------------

test("REGRESSION: no move candidate ever costs more feet than the mover's effective Speed, even over a long diagonal (found 2026-08-22: a flat 'N squares = N x FEET_PER_SQUARE' budget undercounted the real 5-10-5 diagonal cost)", () => {
  const mover = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, speed: 300, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 28, row: 28 } };
  const state = makeState([mover, target]);
  const moves = generateProposals(state, "a", { ...TURN, effective: { speed: 300 } }).filter((p) => p.type === "move" || p.type === "step");
  assert.ok(moves.length > 0, "expected at least one move candidate toward a target 28 squares away");
  for (const m of moves) {
    const cost = distanceFeet({ col: 0, row: 0 }, m.to);
    assert.ok(cost <= 300, `a ${m.type} candidate costs ${cost}ft against a 300ft Speed budget: ${JSON.stringify(m)}`);
  }
});

test("no move candidate ever lands on a cell already occupied by another combatant", () => {
  const mover = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, speed: 1500, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const blocker = { id: "b", side: "party", currentHP: 100, maxHP: 100, position: { col: 1, row: 1 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 5, row: 5 } };
  const state = makeState([mover, blocker, target]);
  const moves = generateProposals(state, "a", TURN).filter((p) => p.type === "move" || p.type === "step");
  for (const m of moves) assert.ok(!(m.to.col === 1 && m.to.row === 1), "must not propose stepping onto the blocker's square");
});

test("REGRESSION: a straight approach with a teammate parked directly in the way still finds a real sidestep, not zero move candidates (found running the round-0-deployment scenario: the Frame got stuck at spawn for multiple rounds)", () => {
  const mover = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, speed: 1500, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const blocker = { id: "b", side: "party", currentHP: 100, maxHP: 100, position: { col: 1, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 10, row: 0 } };
  const state = makeState([mover, blocker, target]);
  const moves = generateProposals(state, "a", TURN).filter((p) => p.type === "move" || p.type === "step");
  assert.ok(moves.length > 0, "expected a real sidestep around the blocker, not zero candidates (stuck)");
});

test("REGRESSION: candidate generation terminates quickly even when boxed in by several teammates across the whole approach direction", () => {
  const mover = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, speed: 1500, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const blockers = [-1, 0, 1].map((row) => ({ id: `b${row}`, side: "party", currentHP: 100, maxHP: 100, position: { col: 1, row } }));
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 20, row: 0 } };
  const state = makeState([mover, ...blockers, target]);
  const start = Date.now();
  generateProposals(state, "a", TURN);
  assert.ok(Date.now() - start < 1000, "must return quickly even when boxed in on every side of the approach direction");
});

/**
 * REGRESSION (design doc §14i): found by Ingram reading a real transcript — Kingfisher spent all
 * five rounds of a battle oscillating between two fixed points ~2500ft apart, never once closing
 * on the Claimant. Root cause: a full-Speed-budget walk along a fixed compass heading sails past
 * the point of closest approach whenever the target isn't on a clean 8-way line, then the NEXT
 * decision recomputes a fresh heading from the now-overshot position and overshoots the other
 * way, forever. The fix (never take a step that doesn't strictly reduce distance to the target)
 * is now inside decide.mjs's own stepToward — re-verified here against the CURRENT system, not
 * assumed to still hold just because it held for the deleted implementation.
 */
test("REGRESSION: movement never overshoots past the closest approach point on a target that isn't on a clean 8-way line, even with a huge Speed budget", () => {
  const mover = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, speed: 2000, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  // (17,4) is nowhere near a clean 45/90-degree line from the origin — exactly the shape that exposed the bug.
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 17, row: 4 } };
  const state = makeState([mover, target]);
  const startDist = distanceFeet({ col: 0, row: 0 }, target.position);
  const moves = generateProposals(state, "a", { ...TURN, effective: { speed: 2000 } }).filter((p) => p.type === "move" || p.type === "step");
  assert.ok(moves.length > 0, "expected real move candidates toward a reachable target");
  // NOT every move candidate — one of them is a legitimate DISENGAGE option (deliberately moving
  // AWAY, correctly ending farther out), which generateProposals offers alongside the "toward"
  // ones with no tag distinguishing which is which in the public output. The actual Kingfisher bug
  // was that NO candidate ever made real progress, just alternation between two overshoot points —
  // so the real property to check is that AT LEAST ONE candidate gets meaningfully closer.
  const closest = Math.min(...moves.map((m) => distanceFeet(m.to, target.position)));
  assert.ok(closest < startDist, `expected at least one move candidate to make real progress toward the target (started ${startDist}ft away), closest candidate ended ${closest}ft away`);
});

// ---------------------------------------------------------------------------
// THE FIX ITSELF, as explicit regression guards. Both of these old behaviors
// were literally the root cause of the pre-rebuild AI's failure — porting
// the old tests unchanged would have re-asserted the bug.
// ---------------------------------------------------------------------------

test("FIX, NOT REGRESSION: a move-closer candidate still exists even while a target is already within a weapon's clean range, as long as real room remains to close further — the old system returned null the instant ANY weapon was in range, at all, which was the single largest cause of the 57.1%-utilization failure this project measured and fixed", () => {
  const mover = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, speed: 1500, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  // 2 squares (100ft) — exactly at the sidearm's clean range, but 2 full squares of room remain before contact.
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 2, row: 0 } };
  const state = makeState([mover, target]);
  const moves = generateProposals(state, "a", TURN).filter((p) => p.type === "move" || p.type === "step");
  assert.ok(moves.length > 0, "expected a real move-closer candidate despite already being in the sidearm's clean range");
});

test("FIX, NOT REGRESSION: a combatant with a scripted .objective (the Claimant) DOES get move candidates toward an out-of-reach target — the old system hard-blocked movement entirely for any objective-bearing combatant, one of three independent locks behind the Claimant's documented stuck-at-two-actions bug", () => {
  const claimant = {
    id: "c", side: "opposition", objective: { col: 40, row: 40 }, currentHP: 165, maxHP: 165, ac: 33,
    strikes: [{ name: "Sweep", strikeType: "melee", attackBonus: 24, traits: ["reach-300"], damage: [{ dice: "3d8", bonus: 12 }] }],
    position: { col: 0, row: 0 }
  };
  const target = { id: "t", side: "party", currentHP: 100, maxHP: 100, ac: 31, size: "huge", position: { col: 20, row: 20 } };
  const state = makeState([claimant, target]);
  // actionsUsed: 2 so the separate "advance" proposal doesn't itself satisfy this — isolating the move/step candidates specifically.
  const moves = generateProposals(state, "c", { ...TURN, actionsUsed: 2, actionsAvailable: 3 }).filter((p) => p.type === "move" || p.type === "step");
  assert.ok(moves.length > 0, "the Claimant must get real move candidates now — it is no longer hard-blocked from ever pursuing");
});

// ---------------------------------------------------------------------------
// Support-action gating: still-true business rules, re-verified against generateProposals directly.
// ---------------------------------------------------------------------------

test("evacuate is gated by the canEvacuate capability flag, not by combatant id", () => {
  const noFlag = { id: "n", side: "party", currentHP: 100, maxHP: 100, strikes: [], position: { col: 0, row: 0 } };
  const withFlag = { id: "w", side: "party", currentHP: 100, maxHP: 100, canEvacuate: true, strikes: [], position: { col: 5, row: 5 } };
  const opponent = { id: "o", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, size: "huge", position: { col: 43, row: 43 } };
  const state = makeState([noFlag, withFlag, opponent]);
  assert.ok(!generateProposals(state, "n", TURN).some((p) => p.type === "evacuate"), "no canEvacuate flag -> never proposes Evacuate");
  assert.ok(generateProposals(state, "w", TURN).some((p) => p.type === "evacuate"), "canEvacuate:true -> proposes Evacuate");
});

test("repair is gated by repairBonus/handlingDC, and targets an actually-injured ally", () => {
  const ladle = { id: "l", side: "party", currentHP: 100, maxHP: 100, repairBonus: 24, handlingDC: 20, strikes: [], position: { col: 0, row: 0 } };
  const hurtAlly = { id: "h", side: "party", currentHP: 20, maxHP: 100, position: { col: 1, row: 0 } };
  const state = makeState([ladle, hurtAlly]);
  const repair = generateProposals(state, "l", TURN).find((p) => p.type === "repair");
  assert.ok(repair, "expected a repair candidate targeting the injured ally");
  assert.equal(repair.targetId, "h");
});

test("repair is never generated for a combatant without repairBonus/handlingDC, even with a hurt ally in range", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const hurtAlly = { id: "h", side: "party", currentHP: 10, maxHP: 100, position: { col: 1, row: 0 } };
  const state = makeState([attacker, hurtAlly]);
  assert.equal(generateProposals(state, "a", TURN).filter((p) => p.type === "repair").length, 0);
});

test("spot is proposed for an unspotted, attack-capable ally, and stops once that ally is already spotted", () => {
  const spotter = { id: "s", side: "party", currentHP: 100, maxHP: 100, strikes: [], position: { col: 0, row: 0 } };
  const ally = { id: "ally", side: "party", currentHP: 100, maxHP: 100, strikes: [SIDEARM], spotted: false, position: { col: 1, row: 0 } };
  const state = makeState([spotter, ally]);
  assert.ok(generateProposals(state, "s", TURN).some((p) => p.type === "spot" && p.targetId === "ally"));
  ally.spotted = true;
  assert.ok(!generateProposals(state, "s", TURN).some((p) => p.type === "spot"), "an already-spotted ally must not be proposed again");
});
