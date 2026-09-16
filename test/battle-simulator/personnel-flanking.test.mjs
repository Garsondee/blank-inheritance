/**
 * Direct tests for personnel-engine/flanking.mjs (design doc §25 — reference/srd/player-core/
 * 423-flanking.json, Player Core pg. 417).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isFlanking } from "../../tools/battle-simulator/personnel-engine/flanking.mjs";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";

const MELEE = { name: "Knife", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] };
const REACH_MELEE = { name: "Ribbon", strikeType: "melee", attackBonus: 8, traits: ["reach-10"], damage: [{ dice: "1d4", bonus: 0 }] };
const RANGED = { name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2 }] };

function makeCombatant(id, strikes) {
  return { id, name: id, strikes };
}

test("isFlanking: true when attacker and ally sit on exact opposite sides of the target, both melee-capable and in reach", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const ally = makeCombatant("b", [MELEE]);
  const attackerPos = { col: 4, row: 5 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 6, row: 5 };
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], []);
  assert.equal(result, true);
});

test("isFlanking: true for opposite CORNERS too, not just opposite sides (Player Core: 'opposite sides or opposite corners')", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const ally = makeCombatant("b", [MELEE]);
  const attackerPos = { col: 4, row: 4 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 6, row: 6 };
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], []);
  assert.equal(result, true);
});

test("isFlanking: false when the ally is on the SAME side as the attacker, not opposite", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const ally = makeCombatant("b", [MELEE]);
  const attackerPos = { col: 4, row: 5 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 4, row: 6 }; // both roughly west/south, not opposite
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], []);
  assert.equal(result, false);
});

test("isFlanking: false when the attacker has no melee option at all (ranged-only can't flank)", () => {
  const attacker = makeCombatant("a", [RANGED]);
  const ally = makeCombatant("b", [MELEE]);
  const attackerPos = { col: 4, row: 5 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 6, row: 5 };
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], []);
  assert.equal(result, false);
});

test("isFlanking: false when the 'ally' on the opposite side has no melee option either — a ranged ally standing there doesn't complete the flank", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const ally = makeCombatant("b", [RANGED]);
  const attackerPos = { col: 4, row: 5 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 6, row: 5 };
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], []);
  assert.equal(result, false);
});

test("isFlanking: false when the ally is out of their own melee reach of the target, even if positioned opposite", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const ally = makeCombatant("b", [MELEE]); // standard reach, only 5ft
  const attackerPos = { col: 4, row: 5 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 7, row: 5 }; // 2 squares = 10ft away, opposite direction but out of reach
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], []);
  assert.equal(result, false);
});

test("isFlanking: a reach weapon extends how far the ally (or attacker) can stand and still flank", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const ally = makeCombatant("b", [REACH_MELEE]); // reach-10 = 2 squares
  const attackerPos = { col: 4, row: 5 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 7, row: 5 }; // 2 squares away, within reach-10
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], []);
  assert.equal(result, true);
});

test("isFlanking: the attacker itself out of its own reach can't flank regardless of the ally", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const ally = makeCombatant("b", [MELEE]);
  const attackerPos = { col: 3, row: 5 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 7, row: 5 }; // attacker 2 squares away, standard reach only 1
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], []);
  assert.equal(result, false);
});

test("isFlanking: with no allies at all, never flanks", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const result = isFlanking(attacker, { col: 4, row: 5 }, { id: "t" }, { col: 5, row: 5 }, [], []);
  assert.equal(result, false);
});

test("isFlanking: multiple candidate allies — finds a real flank even if the FIRST candidate doesn't complete one", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const badAlly = makeCombatant("b", [RANGED]); // ranged, can't complete a flank
  const goodAlly = makeCombatant("c", [MELEE]);
  const attackerPos = { col: 4, row: 5 }, targetPos = { col: 5, row: 5 };
  const allies = [
    { id: "b", pos: { col: 6, row: 5 }, combatant: badAlly },
    { id: "c", pos: { col: 6, row: 5 }, combatant: goodAlly }
  ];
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, allies, []);
  assert.equal(result, true);
});

test("isFlanking: a wall between the attacker and the target blocks the flank, same as any other targeted action's line-of-effect gate", () => {
  const attacker = makeCombatant("a", [MELEE]);
  const ally = makeCombatant("b", [MELEE]);
  const attackerPos = { col: 4, row: 5 }, targetPos = { col: 5, row: 5 }, allyPos = { col: 6, row: 5 };
  const wallBetweenAttackerAndTarget = [{ c: [5, 5, 5, 6], move: 20, sight: 20 }]; // vertical wall at x=5, blocking the attacker's own line
  const result = isFlanking(attacker, attackerPos, { id: "t" }, targetPos, [{ id: "b", pos: allyPos, combatant: ally }], wallBetweenAttackerAndTarget);
  assert.equal(result, false);
});

// --- Real engine integration: does a real Strike, resolved through runBattle(), actually apply
// the -2 flanking bonus it computed? ---

function makePartyMelee(id, pos) {
  return {
    id, name: id, side: "party", maxHP: 20, currentHP: 20, ac: 10,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0,
    strikes: [{ name: "Knife", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }],
    position: pos
  };
}
function makeTargetAt(pos, overrides = {}) {
  return {
    id: "target", name: "Target", side: "opposition", maxHP: 30, currentHP: 30, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: pos, ...overrides
  };
}

test("REAL BATTLE: a Strike from a real flanking position logs a real flankBonus of 2", () => {
  const a = makePartyMelee("a", { col: 4, row: 5 });
  const b = makePartyMelee("b", { col: 6, row: 5 }); // opposite side of the target from `a`
  const target = makeTargetAt({ col: 5, row: 5 });
  function ai(state, id, turn) {
    return id === "a" && turn.actionsUsed === 0 ? { type: "strike", targetId: "target", strikeIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [a, b, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((act) => act.type === "strike");
  assert.equal(strike.flankBonus, 2, `expected a real flanking bonus, got ${JSON.stringify(strike)}`);
});

// GH #54 regression. The four tests above all assert the LOG FIELD `flankBonus`, and the only test
// that checked a real `roll.targetAc` was the non-flanking case — so for the whole life of this
// feature the sign could be (and was) inverted without a single test noticing: `acBonus` summed
// cover and flanking as if both raised AC, so a flanked target was struck at AC+2 instead of AC-2.
// These two assert the number the d20 is ACTUALLY rolled against, which is the only thing that
// can catch a sign error.
test("REAL BATTLE (GH #54): flanking LOWERS the target's effective AC by 2 — the number actually rolled against, not just the logged field", () => {
  const a = makePartyMelee("a", { col: 4, row: 5 });
  const b = makePartyMelee("b", { col: 6, row: 5 }); // opposite side of the target from `a`
  const target = makeTargetAt({ col: 5, row: 5 });   // ac 15, no conditions
  function ai(state, id, turn) {
    return id === "a" && turn.actionsUsed === 0 ? { type: "strike", targetId: "target", strikeIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [a, b, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((act) => act.type === "strike");
  assert.equal(strike.flankBonus, 2, "precondition: the flank must actually be detected");
  assert.equal(strike.roll.targetAc, target.ac - 2,
    `a flanked target must be EASIER to hit: expected AC ${target.ac - 2}, got ${strike.roll.targetAc}`);
});

test("REAL BATTLE (GH #54): cover and flanking are opposite signs — a flanked target behind cover is struck at its own base AC", () => {
  const a = makePartyMelee("a", { col: 4, row: 5 });
  const b = makePartyMelee("b", { col: 6, row: 5 });
  const target = makeTargetAt({ col: 5, row: 5 });
  // A cover-granting edge on the a-to-target line. `sight: 0` means it never blocks line of
  // effect, so the flank itself still stands (isFlanking runs its own LOS gate) — which is
  // exactly the case that proves the two modifiers cancel rather than compound.
  const coverWall = [{ c: [5, 5, 5, 6], move: 0, sight: 0, cover: true }];
  function ai(state, id, turn) {
    return id === "a" && turn.actionsUsed === 0 ? { type: "strike", targetId: "target", strikeIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [a, b, target], ai, walls: coverWall });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((act) => act.type === "strike");
  assert.equal(strike.flankBonus, 2, "precondition: a cover edge with sight 0 must not break the flank");
  assert.equal(strike.coverBonus, 2, "precondition: the cover edge must actually grant cover");
  assert.equal(strike.roll.targetAc, target.ac,
    `cover (+2) and flanking (-2) must cancel: expected AC ${target.ac}, got ${strike.roll.targetAc}`);
});

test("REAL BATTLE: the SAME position without a flanking ally present logs flankBonus 0", () => {
  const a = makePartyMelee("a", { col: 4, row: 5 });
  const target = makeTargetAt({ col: 5, row: 5 });
  function ai(state, id, turn) {
    return id === "a" && turn.actionsUsed === 0 ? { type: "strike", targetId: "target", strikeIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [a, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((act) => act.type === "strike");
  assert.equal(strike.flankBonus, 0);
});

test("REAL BATTLE: flanking never applies to a RANGED strike, even from a geometrically-flanking position — Player Core's own melee-only scoping", () => {
  const rangedAttacker = {
    id: "a", name: "a", side: "party", maxHP: 20, currentHP: 20, ac: 10, saves: { fort: 5, ref: 5, will: 5 }, speed: 0,
    strikes: [{ name: "Pistol", strikeType: "ranged", attackBonus: 10, rangeIncrement: 60, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }],
    position: { col: 4, row: 5 }
  };
  const b = makePartyMelee("b", { col: 6, row: 5 });
  const target = makeTargetAt({ col: 5, row: 5 });
  function ai(state, id, turn) {
    return id === "a" && turn.actionsUsed === 0 ? { type: "strike", targetId: "target", strikeIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [rangedAttacker, b, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((act) => act.type === "strike");
  assert.equal(strike.flankBonus, 0, "a ranged strike must never receive the flanking bonus");
});

test("REAL BATTLE: a target already off-guard from being downed-and-not-yet-dead does NOT ALSO get a separate flanking bonus — one -2, never stacked", () => {
  const a = makePartyMelee("a", { col: 4, row: 5 });
  const b = makePartyMelee("b", { col: 6, row: 5 });
  const target = makeTargetAt({ col: 5, row: 5 }, { side: "party", currentHP: 0, dyingValue: 1 }); // a downed PARTY member being finished off, already off-guard from being unconscious
  function ai(state, id, turn) {
    return id === "a" && turn.actionsUsed === 0 ? { type: "strike", targetId: "target", strikeIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [a, b, target], ai });
  const strike = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((act) => act.type === "strike");
  assert.equal(strike.flankBonus, 0, "flanking must not double up on top of an already-off-guard target's own persistent penalty");
  assert.equal(strike.roll.targetAc, target.ac - 2 - 4, "the target's effective AC must still show the real off-guard (-2) AND unconscious (-4 status) penalties, just not an ADDITIONAL flanking -2");
});
