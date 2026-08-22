/**
 * Tests for the utility-AI's candidate generation layer (design doc §14h)
 * — the "what could I do right now, and how good is it" half of the
 * framework. computeDestination's tests live here (moved from
 * party-ai.test.mjs 2026-08-22, since the function itself moved) because
 * it's a candidate-generation primitive now, not something specific to
 * the party side.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDestination, generateCandidates } from "../../tools/battle-simulator/ai/candidates.mjs";
import { distanceFeet } from "../../tools/battle-simulator/engine/grid.mjs";

function makeState(gridSize, positions) {
  return { gridSize, positions: new Map(Object.entries(positions)) };
}

// ---------------------------------------------------------------------------
// computeDestination
// ---------------------------------------------------------------------------

test("REGRESSION: computeDestination never proposes a step that costs more feet than maxSpeedFeet, even over a long diagonal path (found 2026-08-22: a flat 'N squares = N x FEET_PER_SQUARE' budget undercounted the real 5-10-5 diagonal cost, leaving the Frame and Hod stuck at spawn for several rounds under the 10x rescale)", () => {
  const state = makeState({ cols: 44, rows: 44 }, { mover: { col: 0, row: 0 } });
  const destination = computeDestination(state, "mover", { col: 0, row: 0 }, { col: 28, row: 28 }, 300, 0);
  assert.ok(destination, "expected a real step toward a target 28 squares away with 300ft of Speed");
  const cost = distanceFeet({ col: 0, row: 0 }, destination);
  assert.ok(cost <= 300, `computeDestination proposed a step costing ${cost}ft against a 300ft Speed budget: ${JSON.stringify(destination)}`);
});

test("computeDestination: across many random long diagonal paths and speeds, the proposed step never exceeds the Speed budget", () => {
  const state = makeState({ cols: 80, rows: 80 }, { mover: { col: 0, row: 0 } });
  for (let trial = 0; trial < 50; trial++) {
    const targetCol = 5 + trial;
    const targetRow = 5 + trial;
    const speed = 50 + (trial % 10) * 50;
    const destination = computeDestination(state, "mover", { col: 0, row: 0 }, { col: targetCol, row: targetRow }, speed, 0);
    if (!destination) continue;
    const cost = distanceFeet({ col: 0, row: 0 }, destination);
    assert.ok(cost <= speed, `trial ${trial}: proposed ${cost}ft against a ${speed}ft budget (target ${targetCol},${targetRow})`);
  }
});

test("computeDestination: stops at standoff distance rather than closing all the way when already within standoff of Speed", () => {
  const state = makeState({ cols: 44, rows: 44 }, { mover: { col: 0, row: 0 } });
  const destination = computeDestination(state, "mover", { col: 0, row: 0 }, { col: 10, row: 10 }, 2000, 300);
  assert.ok(destination);
  const remaining = distanceFeet(destination, { col: 10, row: 10 });
  assert.ok(remaining <= 300, `expected to stop within standoff (300ft) of the target, still ${remaining}ft away: ${JSON.stringify(destination)}`);
});

test("computeDestination: returns null when already within standoff (no movement needed)", () => {
  const state = makeState({ cols: 44, rows: 44 }, { mover: { col: 0, row: 0 } });
  const destination = computeDestination(state, "mover", { col: 0, row: 0 }, { col: 1, row: 0 }, 300, 300);
  assert.equal(destination, null);
});

test("computeDestination: never proposes a cell already occupied by another combatant", () => {
  const state = makeState({ cols: 44, rows: 44 }, { mover: { col: 0, row: 0 }, blocker: { col: 1, row: 1 } });
  const destination = computeDestination(state, "mover", { col: 0, row: 0 }, { col: 5, row: 5 }, 300, 0);
  if (destination) assert.ok(!(destination.col === 1 && destination.row === 1), "must not step onto the blocker's square");
});

test("REGRESSION: a straight orthogonal approach with a teammate parked directly in the way finds a real sidestep, not zero valid alternatives (found running the round-0-deployment scenario: the Frame got stuck at spawn for multiple rounds)", () => {
  const state = makeState({ cols: 44, rows: 44 }, { mover: { col: 0, row: 0 }, blocker: { col: 1, row: 0 } });
  const destination = computeDestination(state, "mover", { col: 0, row: 0 }, { col: 10, row: 0 }, 300, 0);
  assert.ok(destination, "expected a real sidestep around the blocker, not null (stuck)");
  assert.ok(!(destination.col === 1 && destination.row === 0), "must not have somehow stepped onto the blocker");
});

test("computeDestination: terminates (does not hang) even when repeatedly boxed in by several teammates across a long approach", () => {
  const positions = { mover: { col: 0, row: 0 } };
  for (let row = -1; row <= 1; row++) positions[`blocker-${row}`] = { col: 1, row };
  const state = makeState({ cols: 44, rows: 44 }, positions);
  const start = Date.now();
  computeDestination(state, "mover", { col: 0, row: 0 }, { col: 20, row: 0 }, 2000, 0);
  assert.ok(Date.now() - start < 1000, "computeDestination must return quickly even when boxed in on every side of the approach direction");
});

// ---------------------------------------------------------------------------
// generateCandidates
// ---------------------------------------------------------------------------

function makeCombatantState(combatants) {
  return {
    gridSize: { cols: 44, rows: 44 },
    combatants: new Map(combatants.map((c) => [c.id, c])),
    positions: new Map(combatants.map((c) => [c.id, c.position]))
  };
}

const SIDEARM = { name: "Mounted Sidearm", strikeType: "ranged", attackBonus: 20, rangeIncrement: 100, traits: ["mounted"], damage: [{ dice: "3d6", bonus: 10 }] };
const LONG_RANGE = { name: "Rocket Pod", strikeType: "ranged", attackBonus: 24, rangeIncrement: 2000, traits: ["mounted"], damage: [{ dice: "3d8", bonus: 12 }], usesRemaining: 1, usesPerEncounter: 1 };
const TURN_START = { actionsAvailable: 3, actionsUsed: 0, strikesAttempted: 0, feetMoved: 0, effective: { speed: 1500 } };

test("generateCandidates: returns [] once the turn's action budget is exhausted, regardless of what else is available", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 1, row: 0 } };
  const state = makeCombatantState([attacker, target]);
  assert.deepEqual(generateCandidates(state, "a", { ...TURN_START, actionsUsed: 3 }), []);
});

test("generateStrikeCandidates (via generateCandidates): a live, legal, in-range target produces a real Strike candidate with a positive, mechanically-grounded value", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 1, row: 0 } };
  const state = makeCombatantState([attacker, target]);
  const candidates = generateCandidates(state, "a", TURN_START);
  const strike = candidates.find((c) => c.type === "strike");
  assert.ok(strike, "expected a strike candidate against the in-range target");
  assert.equal(strike.weightKey, "damage");
  assert.ok(strike.value > 0, `expected a positive expected-damage value, got ${strike.value}`);
  assert.ok(strike.reason.includes(SIDEARM.name));
});

test("generateStrikeCandidates: Scale-Blind attacker gets no Strike candidate against a Medium target, even adjacent", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, scaleBlind: true, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const kid = { id: "k", side: "opposition", currentHP: 20, maxHP: 20, ac: 20, size: "medium", position: { col: 1, row: 0 } };
  const state = makeCombatantState([attacker, kid]);
  const candidates = generateCandidates(state, "a", TURN_START);
  assert.ok(!candidates.some((c) => c.type === "strike"), "Scale-Blind must exclude the Medium target from Strike candidates entirely");
});

test("generateStrikeCandidates: a strike with usesRemaining 0 never produces a candidate", () => {
  const spentWeapon = { ...LONG_RANGE, usesRemaining: 0 };
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [spentWeapon], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 1, row: 0 } };
  const state = makeCombatantState([attacker, target]);
  assert.equal(generateCandidates(state, "a", TURN_START).filter((c) => c.type === "strike").length, 0);
});

test("REGRESSION: a limited-use weapon strictly better than the free sidearm is still discounted below it once a free, in-range option exists (found running the utility-AI framework: a plain marginal-value subtraction wasn't steep enough on its own — see CONSERVATION_MULTIPLIER in candidates.mjs)", () => {
  const vehicle = { id: "v", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM, LONG_RANGE], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, hardness: 0, scaleHardness: 15, size: "huge", position: { col: 1, row: 0 } }; // 50ft, well inside the sidearm's 100ft clean range
  const state = makeCombatantState([vehicle, target]);
  const strikes = generateCandidates(state, "v", TURN_START).filter((c) => c.type === "strike");
  const sidearmCandidate = strikes.find((c) => c.strikeIndex === 0);
  const longRangeCandidate = strikes.find((c) => c.strikeIndex === 1);
  assert.ok(sidearmCandidate.value > longRangeCandidate.value, `expected the free sidearm (${sidearmCandidate.value}) to outscore the discounted limited weapon (${longRangeCandidate.value}) at clean range`);
});

test("generateStrikeCandidates: a limited-use weapon keeps its FULL value when no free alternative is legal at all (a genuine opening shot beyond the sidearm's range)", () => {
  const vehicle = { id: "v", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM, LONG_RANGE], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, hardness: 0, scaleHardness: 15, size: "huge", position: { col: 20, row: 0 } }; // 1000ft — beyond the sidearm's 6th-increment hard cap
  const state = makeCombatantState([vehicle, target]);
  const strikes = generateCandidates(state, "v", TURN_START).filter((c) => c.type === "strike");
  assert.equal(strikes.length, 1, "the sidearm should not even be a legal candidate from 1000ft");
  assert.equal(strikes[0].strikeIndex, 1);
  assert.ok(strikes[0].value > 5, `expected the long-range weapon's full, undiscounted value, got ${strikes[0].value}`);
});

test("generateMoveTowardTargetCandidate: proposes closing the distance when nothing is within any strike's clean range", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 20, row: 0 } }; // 1000ft, sidearm range 100ft
  const state = makeCombatantState([attacker, target]);
  const move = generateCandidates(state, "a", TURN_START).find((c) => c.type === "move");
  assert.ok(move, "expected a move-toward-target candidate");
  assert.equal(move.weightKey, "positioning");
});

test("generateMoveTowardTargetCandidate: not generated once a target is already within clean range (the Strike candidate covers it)", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 100, maxHP: 100, ac: 20, size: "huge", position: { col: 1, row: 0 } }; // 50ft, inside the 100ft sidearm
  const state = makeCombatantState([attacker, target]);
  assert.ok(!generateCandidates(state, "a", TURN_START).some((c) => c.type === "move"));
});

test("REGRESSION: a combatant with a scripted .objective (the Claimant) never gets a move-toward-target candidate, even with a target out of reach — its statblock is explicit that it does not pursue", () => {
  const claimant = { id: "c", side: "opposition", objective: { col: 40, row: 40 }, currentHP: 165, maxHP: 165, ac: 33, strikes: [{ name: "Sweep", strikeType: "melee", attackBonus: 24, traits: ["reach-300"], damage: [{ dice: "3d8", bonus: 12 }] }], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "party", currentHP: 100, maxHP: 100, ac: 31, size: "huge", position: { col: 20, row: 20 } };
  const state = makeCombatantState([claimant, target]);
  // actionsUsed: 2 so the Advance candidate itself doesn't apply and would otherwise mask this
  assert.ok(!generateCandidates(state, "c", { ...TURN_START, actionsUsed: 2 }).some((c) => c.type === "move"), "the Claimant must never propose chasing a target");
});

test("generateAdvanceCandidate: only proposed at the start of the turn with 2+ actions free, for a combatant with an objective", () => {
  const claimant = { id: "c", side: "opposition", objective: { col: 40, row: 40 }, currentHP: 165, maxHP: 165, ac: 33, strikes: [], position: { col: 0, row: 0 } };
  const state = makeCombatantState([claimant]);
  const atStart = generateCandidates(state, "c", TURN_START).find((c) => c.type === "advance");
  assert.ok(atStart);
  assert.deepEqual(atStart.towards, claimant.objective);
  const midTurn = generateCandidates(state, "c", { ...TURN_START, actionsUsed: 2 }).find((c) => c.type === "advance");
  assert.equal(midTurn, undefined, "Advance must not be proposed once it's already been used this turn");
});

test("generateSpotCandidates: value reflects the real expected-damage gain from the +2 bonus, and stops once the ally is already spotted", () => {
  const spotter = { id: "s", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [], position: { col: 0, row: 0 } };
  const ally = { id: "ally", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], spotted: false, position: { col: 1, row: 0 } };
  const opponent = { id: "o", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, hardness: 0, size: "huge", position: { col: 2, row: 0 } };
  const state = makeCombatantState([spotter, ally, opponent]);
  const spot = generateCandidates(state, "s", TURN_START).find((c) => c.type === "spot");
  assert.ok(spot);
  assert.equal(spot.targetId, "ally");
  assert.ok(spot.value > 0, `expected a positive expected-damage gain from spotting, got ${spot.value}`);

  ally.spotted = true;
  assert.ok(!generateCandidates(state, "s", TURN_START).some((c) => c.type === "spot"), "an already-spotted ally must not be proposed again");
});

test("generateEvacuateCandidates: gated by the canEvacuate capability flag, not by combatant id", () => {
  const noFlag = { id: "n", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [], position: { col: 0, row: 0 } };
  const withFlag = { id: "w", side: "party", currentHP: 100, maxHP: 100, ac: 20, canEvacuate: true, strikes: [], position: { col: 5, row: 5 } };
  const opponent = { id: "o", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, size: "huge", position: { col: 43, row: 43 } }; // far away, clear
  const state = makeCombatantState([noFlag, withFlag, opponent]);
  assert.equal(generateCandidates(state, "n", TURN_START).filter((c) => c.type === "evacuate").length, 0, "no canEvacuate flag -> never proposes Evacuate");
  const evac = generateCandidates(state, "w", TURN_START).find((c) => c.type === "evacuate");
  assert.ok(evac, "canEvacuate:true and clear of the fight -> proposes Evacuate");
  assert.equal(evac.weightKey, "civilians");
});

test("generateEvacuateCandidates: proposes a retreat move instead of Evacuate when still within range of the opposition", () => {
  const vehicle = { id: "w", side: "party", currentHP: 100, maxHP: 100, ac: 20, canEvacuate: true, strikes: [], position: { col: 5, row: 5 } };
  const opponent = { id: "o", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, size: "huge", position: { col: 6, row: 5 } }; // adjacent — nowhere near the 300ft clearance Evacuate needs
  const state = makeCombatantState([vehicle, opponent]);
  const candidates = generateCandidates(state, "w", TURN_START);
  assert.ok(!candidates.some((c) => c.type === "evacuate"));
  assert.ok(candidates.some((c) => c.type === "move"), "expected a retreat-toward-safety move instead");
});

test("generateRepairCandidates: gated by repairBonus/handlingDC, targets the most-injured-by-percentage ally in range", () => {
  const ladle = { id: "l", side: "party", currentHP: 100, maxHP: 100, ac: 25, repairBonus: 24, handlingDC: 20, strikes: [], position: { col: 0, row: 0 } };
  const lightlyHurt = { id: "light", side: "party", currentHP: 90, maxHP: 100, ac: 20, position: { col: 1, row: 0 } };
  const badlyHurt = { id: "bad", side: "party", currentHP: 20, maxHP: 100, ac: 20, position: { col: 1, row: 1 } };
  const state = makeCombatantState([ladle, lightlyHurt, badlyHurt]);
  const repair = generateCandidates(state, "l", TURN_START).find((c) => c.type === "repair");
  assert.ok(repair);
  assert.equal(repair.targetId, "bad", "expected the worse-off-by-percentage ally to be prioritized");
  assert.ok(repair.value > 0);
});

test("generateRepairCandidates: never generated for a combatant without repairBonus/handlingDC", () => {
  const attacker = { id: "a", side: "party", currentHP: 100, maxHP: 100, ac: 20, strikes: [SIDEARM], position: { col: 0, row: 0 } };
  const hurtAlly = { id: "h", side: "party", currentHP: 10, maxHP: 100, ac: 20, position: { col: 1, row: 0 } };
  const state = makeCombatantState([attacker, hurtAlly]);
  assert.equal(generateCandidates(state, "a", TURN_START).filter((c) => c.type === "repair").length, 0);
});

/**
 * REGRESSION (design doc §14i, 2026-08-22): found by Ingram reading a real transcript —
 * Kingfisher spent all five rounds of a battle oscillating between two fixed points ~2500ft
 * apart, never once closing on the Claimant. Root cause: computeDestination's extend() walked a
 * FIXED compass direction (one of 8) for the entire Speed budget, stopping only on
 * bounds/occupied/budget/standoff — since the target is almost never exactly on one of those 8
 * headings, a full-budget walk sails past the point of closest approach and can end up farther
 * from the target than the start. Each round then recomputed a fresh direction from the
 * now-overshot position and overshot the other way, forever. Fixed by refusing to take a step
 * that doesn't strictly reduce distance to the target.
 */
test("REGRESSION: computeDestination never overshoots past the closest approach point on a target that isn't on a clean 8-way line, even with a huge Speed budget", () => {
  const state = makeState({ cols: 80, rows: 80 }, { mover: { col: 0, row: 0 } });
  // (17,4) is nowhere near a clean 45/90-degree line from the origin — exactly the shape that
  // exposed the bug (Kingfisher's real bearing to the Claimant was never a clean 8-way heading).
  const to = { col: 17, row: 4 };
  const startDist = distanceFeet({ col: 0, row: 0 }, to);
  const destination = computeDestination(state, "mover", { col: 0, row: 0 }, to, 2000, 0);
  assert.ok(destination, "expected real progress toward a reachable target");
  const endDist = distanceFeet(destination, to);
  assert.ok(endDist < startDist, `expected to end up CLOSER to the target (started ${startDist}ft away), but ended ${endDist}ft away: ${JSON.stringify(destination)}`);
});

test("REGRESSION: two successive computeDestination calls toward the same off-axis target make real cumulative progress and never bounce back and forth (the actual oscillation Kingfisher exhibited, reproduced directly)", () => {
  const to = { col: 24, row: 7 }; // an off-axis target, matching the real bug's geometry
  const speedPerRound = 1200; // matches Kingfisher's real Speed

  const state1 = makeState({ cols: 80, rows: 80 }, { mover: { col: 0, row: 0 } });
  const round1 = computeDestination(state1, "mover", { col: 0, row: 0 }, to, speedPerRound, 0);
  assert.ok(round1, "expected round 1 to make real progress");
  const distAfterRound1 = distanceFeet(round1, to);
  assert.ok(distAfterRound1 < distanceFeet({ col: 0, row: 0 }, to), "round 1 must get closer to the target");

  const state2 = makeState({ cols: 80, rows: 80 }, { mover: round1 });
  const round2 = computeDestination(state2, "mover", round1, to, speedPerRound, 0);
  if (round2) {
    const distAfterRound2 = distanceFeet(round2, to);
    assert.ok(
      distAfterRound2 <= distAfterRound1,
      `round 2 must not end up FARTHER from the target than round 1 did — round1 was ${distAfterRound1}ft away, round2 ended ${distAfterRound2}ft away (this is the exact oscillation pattern the fix closes): ${JSON.stringify({ round1, round2 })}`
    );
  }
});

// ---------------------------------------------------------------------------
// Spell attacks and heal abilities (design doc §14k)
// ---------------------------------------------------------------------------

const eldritchLance = { name: "Eldritch Lance", attackBonus: 24, range: 300, actions: 2, traits: ["attack", "cantrip"], damage: [{ dice: "7d6", bonus: 0, damageType: "mental" }] };
const transferVitality = { name: "Transfer Vitality", healingAmount: 30, range: 600, actions: 1 };

test("generateStrikeCandidates: a combatant's spells[] produce real spellAttack candidates, scored via the same expected-damage math as a Strike", () => {
  const caster = { id: "c", side: "party", currentHP: 100, maxHP: 100, ac: 20, spells: [eldritchLance], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, size: "huge", position: { col: 1, row: 0 } };
  const state = makeCombatantState([caster, target]);
  const candidate = generateCandidates(state, "c", TURN_START).find((c) => c.type === "spellAttack");
  assert.ok(candidate, "expected a spellAttack candidate against the in-range target");
  assert.equal(candidate.spellIndex, 0);
  assert.equal(candidate.weightKey, "damage");
  assert.ok(candidate.value > 0, `expected a positive expected-damage value, got ${candidate.value}`);
  assert.ok(candidate.reason.includes("Eldritch Lance"));
});

test("REGRESSION: Scale-Blind excludes a Medium target from spell attacks exactly like Strikes — the same checkScaleTargeting path, not a separate rule to keep in sync", () => {
  const caster = { id: "c", side: "party", currentHP: 100, maxHP: 100, ac: 20, scaleBlind: true, spells: [eldritchLance], position: { col: 0, row: 0 } };
  const kid = { id: "k", side: "opposition", currentHP: 20, maxHP: 20, ac: 20, size: "medium", position: { col: 1, row: 0 } };
  const state = makeCombatantState([caster, kid]);
  assert.ok(!generateCandidates(state, "c", TURN_START).some((c) => c.type === "spellAttack"));
});

test("generateStrikeCandidates: a spell attack out of its own flat range produces no candidate (no range-increment penalty softening it the way a ranged Strike would)", () => {
  const caster = { id: "c", side: "party", currentHP: 100, maxHP: 100, ac: 20, spells: [eldritchLance], position: { col: 0, row: 0 } }; // range 300ft
  const target = { id: "t", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, size: "huge", position: { col: 20, row: 0 } }; // 1000ft
  const state = makeCombatantState([caster, target]);
  assert.equal(generateCandidates(state, "c", TURN_START).filter((c) => c.type === "spellAttack").length, 0);
});

test("REGRESSION: the reserve-price conservation logic (§14h) generalizes across strikes AND spells sharing one pool — a limited-use spell with only a MODEST accuracy edge (+4, matching the already-validated Rocket-Pod-vs-sidearm case) still gets discounted below a free Strike, not just a wildly-better one", () => {
  const limitedSpell = { ...eldritchLance, attackBonus: 24, usesRemaining: 1 }; // a modest +4 edge over the sidearm below — same margin as the original §14h regression case
  const freeSidearm = { name: "Mounted Sidearm", strikeType: "ranged", attackBonus: 20, rangeIncrement: 300, traits: ["mounted"], damage: [{ dice: "3d6", bonus: 10 }] };
  const caster = { id: "c", side: "party", currentHP: 100, maxHP: 100, ac: 20, spells: [limitedSpell], strikes: [freeSidearm], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, hardness: 0, size: "huge", position: { col: 1, row: 0 } }; // close range, the free option is a clean shot
  const state = makeCombatantState([caster, target]);
  const candidates = generateCandidates(state, "c", TURN_START).filter((c) => c.type === "strike" || c.type === "spellAttack");
  const strikeCandidate = candidates.find((c) => c.type === "strike");
  const spellCandidate = candidates.find((c) => c.type === "spellAttack");
  assert.ok(strikeCandidate.value > spellCandidate.value, `expected the free sidearm (${strikeCandidate.value}) to outscore the discounted limited spell (${spellCandidate.value}) at clean range, same reserve-price logic as two competing Strikes`);
});

test("generateStrikeCandidates: a limited-use spell with a DRAMATIC accuracy/damage edge over the free alternative still clears the reserve price and wins — conservation discounts a modest edge, not a genuinely dominant option", () => {
  const limitedSpell = { ...eldritchLance, attackBonus: 30, usesRemaining: 1 }; // a full +10 edge — not a marginal one
  const freeSidearm = { name: "Mounted Sidearm", strikeType: "ranged", attackBonus: 20, rangeIncrement: 300, traits: ["mounted"], damage: [{ dice: "3d6", bonus: 10 }] };
  const caster = { id: "c", side: "party", currentHP: 100, maxHP: 100, ac: 20, spells: [limitedSpell], strikes: [freeSidearm], position: { col: 0, row: 0 } };
  const target = { id: "t", side: "opposition", currentHP: 165, maxHP: 165, ac: 33, hardness: 0, size: "huge", position: { col: 1, row: 0 } };
  const state = makeCombatantState([caster, target]);
  const candidates = generateCandidates(state, "c", TURN_START).filter((c) => c.type === "strike" || c.type === "spellAttack");
  const strikeCandidate = candidates.find((c) => c.type === "strike");
  const spellCandidate = candidates.find((c) => c.type === "spellAttack");
  assert.ok(spellCandidate.value > strikeCandidate.value, `expected the dramatically-better spell (${spellCandidate.value}) to still win over the sidearm (${strikeCandidate.value}) despite the reserve-price discount`);
});

test("generateHealAbilityCandidates: heals self or the most-injured ally, scored by the real healing amount", () => {
  const caster = { id: "c", side: "party", currentHP: 60, maxHP: 100, ac: 20, healAbilities: [transferVitality], position: { col: 0, row: 0 } };
  const state = makeCombatantState([caster]);
  const candidate = generateCandidates(state, "c", TURN_START).find((c) => c.type === "healAbility");
  assert.ok(candidate, "expected the caster to consider healing itself when nobody else is around");
  assert.equal(candidate.targetId, "c");
  assert.equal(candidate.weightKey, "repair");
  assert.equal(candidate.value, 30);
});

test("generateHealAbilityCandidates: prioritizes a worse-off-by-percentage ally over a less-hurt self", () => {
  const caster = { id: "c", side: "party", currentHP: 90, maxHP: 100, ac: 20, healAbilities: [transferVitality], position: { col: 0, row: 0 } };
  const badlyHurtAlly = { id: "ally", side: "party", currentHP: 10, maxHP: 100, ac: 20, position: { col: 1, row: 0 } };
  const state = makeCombatantState([caster, badlyHurtAlly]);
  const candidate = generateCandidates(state, "c", TURN_START).find((c) => c.type === "healAbility");
  assert.equal(candidate.targetId, "ally");
});

test("generateHealAbilityCandidates: caps the scored value at the target's actual missing HP — never proposes healing for more than the target can receive", () => {
  const caster = { id: "c", side: "party", currentHP: 95, maxHP: 100, ac: 20, healAbilities: [transferVitality], position: { col: 0, row: 0 } }; // only 5 HP missing, ability heals 30
  const state = makeCombatantState([caster]);
  const candidate = generateCandidates(state, "c", TURN_START).find((c) => c.type === "healAbility");
  assert.equal(candidate.value, 5, "value must cap at missing HP (5), not the ability's full 30");
});

test("generateHealAbilityCandidates: nothing generated when nobody on the caster's side is hurt", () => {
  const caster = { id: "c", side: "party", currentHP: 100, maxHP: 100, ac: 20, healAbilities: [transferVitality], position: { col: 0, row: 0 } };
  const state = makeCombatantState([caster]);
  assert.equal(generateCandidates(state, "c", TURN_START).filter((c) => c.type === "healAbility").length, 0);
});
