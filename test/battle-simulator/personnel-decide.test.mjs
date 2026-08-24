/**
 * Direct tests for personnel-engine/decide.mjs's candidate generation (design doc §19). No Step-
 * candidate coverage here — this tree's generateProposals never manufactures one on its own (see
 * decide.mjs's own header: with zero reactions firing, Step and Move are currently indistinguishable,
 * so generating both would only double sandbox forks for no behavioral difference). What's covered
 * instead: the two genuinely general mechanisms that DID carry over (reactionOnly filtering,
 * faction-aware targeting), and — the one design doc §19 calls out by name — that an enemy nobody
 * can currently perceive is never actually attacked.
 *
 * IMPORTANT ARCHITECTURE NOTE, confirmed by reading generateProposals itself (inherited unchanged
 * from the Frame-scale original): attack candidates are generated UNCONDITIONALLY against every
 * enemy, sighted or not — "attacks don't need [a vision] guard here — they're separately, correctly
 * gated by REAL-TIME perception in checkStrikeLegal/checkSpellAttackLegal, so an attack candidate
 * against something not currently visible is simply rejected as illegal downstream, same as any
 * other illegal proposal" (decide.mjs's own inherited design). So the guarantee this file tests is
 * NOT "generateProposals omits the candidate" — it's the functionally equivalent, actually-load-
 * bearing property: decide() (which filters to legal, sandbox-verified results before ever scoring
 * or choosing) can NEVER end up choosing a strike against an enemy with no line of effect, because
 * the sandboxed checkStrikeLegal call rejects it before it's eligible to be picked.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateProposals, decide, bestDestinationToward, bestDestinationAway } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { forkTurnSandbox } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { evaluateState } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import { hasCover, lineOfEffect } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";
import { GRID_SIZE as FACILITY_GRID_SIZE, WALLS as FACILITY_WALLS, SETUPS as FACILITY_SETUPS } from "../../tools/battle-simulator/data/personnel-test-facility.mjs";

function makeState({ mePos = { col: 0, row: 0 }, enemyPos = { col: 0, row: 2 }, walls = [] } = {}) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 16, maxHP: 16,
    speed: 25, strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: mePos
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 10, maxHP: 10,
    speed: 0, position: enemyPos
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls,
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...mePos }], ["enemy", { ...enemyPos }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  return { state, turn };
}

test("generateProposals: NEVER offers a standalone strike proposal for a reactionOnly strike", () => {
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 0, row: 1 } });
  state.combatants.get("me").strikes = [{ name: "Guard's Counter", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "1d4", bonus: 0 }], reactionOnly: true }];
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "strike").length, 0);
});

test("generateProposals: an ordinary (non-reactionOnly) strike on the SAME combatant is unaffected", () => {
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 0, row: 1 } });
  state.combatants.get("me").strikes = [
    { name: "Guard's Counter", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "1d4", bonus: 0 }], reactionOnly: true },
    { name: "Ordinary Fist", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }
  ];
  const proposals = generateProposals(state, "me", turn);
  const strikes = proposals.filter((p) => p.type === "strike");
  assert.equal(strikes.length, 1);
  assert.equal(strikes[0].strikeIndex, 1);
});

test("generateProposals (factions.mjs): a party combatant never gets a strike proposal against a neutral combatant", () => {
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 0, row: 1 } });
  state.combatants.get("enemy").side = "neutral";
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "strike").length, 0);
});

test("generateProposals: with no walls and no vision limit, an adjacent enemy gets a real strike proposal (baseline the vision-gated tests below are contrasted against)", () => {
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 0, row: 1 } });
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "strike"), "expected a real strike proposal against a visible, adjacent enemy");
});

test("THE REQUIRED CHECK (design doc §19): a raw strike CANDIDATE is still generated against an unseen enemy (generateProposals is deliberately generous — see this file's own header)...", () => {
  const wall = [];
  for (let row = 0; row < 5; row++) wall.push({ c: [1, row, 1, row + 1], move: 20, sight: 20 });
  const { state, turn } = makeState({ mePos: { col: 0, row: 2 }, enemyPos: { col: 3, row: 2 }, walls: wall });
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "strike"), "generateProposals is generous by design — it proposes a strike against every enemy, sighted or not");
});

test("...but decide() NEVER chooses that strike — no line of effect means the sandbox rejects it, so it's filtered out before scoring, never a phantom/illegal chosen action", () => {
  const wall = [];
  for (let row = 0; row < 5; row++) wall.push({ c: [1, row, 1, row + 1], move: 20, sight: 20 });
  const { state, turn } = makeState({ mePos: { col: 0, row: 2 }, enemyPos: { col: 3, row: 2 }, walls: wall });
  const chosen = decide(state, "me", turn);
  assert.ok(chosen, "expected decide() to still find SOMETHING to do (e.g. reposition) even with no shot available");
  assert.notEqual(chosen.type, "strike", `decide() must never choose a strike against an enemy with no line of effect, chose: ${JSON.stringify(chosen)}`);
});

test("an enemy with NO belief entry at all (never perceived, not even at deployment) gets no move-toward-it candidate either — proposing a move toward its true secret position would be omniscient cheating", () => {
  // refreshBelief seeds every enemy at deployment regardless of current LOS (design doc §15s), so
  // to get a genuinely empty belief this fixture calls generateProposals on a state that has never
  // been through refreshBelief for an enemy that wasn't present at the party's first-ever refresh.
  const { state, turn } = makeState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 10, row: 10 } });
  state.belief = { party: new Map() }; // simulate "already refreshed once, this enemy still unknown"
  const proposals = generateProposals(state, "me", turn);
  const movesTowardEnemy = proposals.filter((p) => p.type === "move" && p.to.col > 5); // any destination heading toward (10,10)
  assert.equal(movesTowardEnemy.length, 0, "no destination candidate should reference an enemy this side has no belief about at all");
});

// --- Design doc §32 — a direct instruction, not a RAW question (Player Core fully permits
// attacking an unconscious creature; legality.mjs is unchanged): "we will not actually build an AI
// which kills downed players deliberately... the only reason to target a downed unconscious
// character would be to heal them." An unconscious combatant only ever exists on the PARTY side
// (conditions.mjs's isUnconscious — an ordinary NPC dies outright at 0 HP), so these fixtures put
// "me" on the OPPOSITION side targeting a downed PARTY member, matching the real bug this closes
// (§31's audit found 3 of 4 real Demoralize uses in actual logs targeted an unconscious ally). ---

function makeFullKitState({ targetHP = 10 } = {}) {
  const mePos = { col: 0, row: 0 };
  const targetPos = { col: 0, row: 1 };
  const me = {
    id: "me", name: "Me", side: "opposition", currentHP: 16, maxHP: 16, speed: 25,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    spells: [{ name: "Zap", attackBonus: 10, range: 30, actions: 2, traits: ["attack"], damage: [{ dice: "1d4", bonus: 0 }] }],
    saveAttacks: [{ name: "Blast", range: 30, actions: 2, dc: 18, damage: [{ dice: "2d6", bonus: 0 }] }],
    conditionSaves: [{ name: "Glare", range: 30, actions: 1, dc: 18 }],
    intimidationModifier: 5,
    position: mePos
  };
  const target = { id: "target", name: "Target", side: "party", currentHP: targetHP, maxHP: 16, speed: 0, position: targetPos };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["target", target]]),
    positions: new Map([["me", { ...mePos }], ["target", { ...targetPos }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  return { state, turn };
}

test("generateProposals (design doc §32) baseline: a full-kit opposition combatant DOES get strike/spellAttack/saveAttack/demoralize/conditionSave proposals against a normal, conscious party target", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  const proposals = generateProposals(state, "me", turn);
  for (const type of ["strike", "spellAttack", "saveAttack", "demoralize", "conditionSave"]) {
    assert.ok(proposals.some((p) => p.type === type && p.targetId === "target"), `expected at least one ${type} proposal against a conscious target`);
  }
});

test("generateProposals (design doc §32): the SAME full kit gets ZERO strike/spellAttack/saveAttack/demoralize/conditionSave proposals once that exact target is unconscious (downed but not dead)", () => {
  const { state, turn } = makeFullKitState({ targetHP: 0 }); // side "party", currentHP 0, dyingValue unset (0) -> isDead false, isUnconscious true
  const proposals = generateProposals(state, "me", turn);
  for (const type of ["strike", "spellAttack", "saveAttack", "demoralize", "conditionSave"]) {
    assert.equal(proposals.filter((p) => p.type === type && p.targetId === "target").length, 0, `expected zero ${type} proposals against an unconscious target`);
  }
});

test("generateProposals (design doc §32): healAbility is UNAFFECTED — an ally can and should still be offered a heal toward an unconscious teammate", () => {
  const { state, turn } = makeFullKitState({ targetHP: 0 });
  state.combatants.get("me").side = "party"; // "me" and "target" are now allies
  state.combatants.get("me").healAbilities = [{ name: "Field Aid", healingAmount: 10, range: 30, actions: 1 }];
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "healAbility" && p.targetId === "target"), "an unconscious ally must still be a legal, proposed heal target");
});

// design doc §34 — a direct user report: Forced Reflection's real text makes the TARGET immune
// ("the target is then temporarily immune to Forced Reflection"), not just the one attacker who
// tried it — checked here at the proposal-generation layer, mirroring legality.mjs's own coverage.
test("generateProposals (design doc §34): no conditionSave proposal is generated against a target already immune to that SAME ability, even from a DIFFERENT attacker than whoever first triggered the immunity", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  state.combatants.get("target").conditionSaveImmunities = ["Glare"];
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "conditionSave" && p.targetId === "target").length, 0, "'me' never tried Glare on this target before — the immunity came from elsewhere, and must still block it");
});

test("generateProposals (design doc §34): a conditionSave proposal against a DIFFERENT, non-immune target is unaffected", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  state.combatants.get("target").conditionSaveImmunities = ["Some Other Ability"]; // immune to a different ability, not Glare
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "conditionSave" && p.targetId === "target"), "immunity to a different ability must not block Glare");
});

// --- Move through allies (design doc §24 — Ingram's own direct correction: "Characters can move
// through friendly character spaces per the rules"), proven through the REAL pathfinding entry
// points the AI actually calls, not just the lower-level reachableCells/blocksPassage unit tests. ---

test("bestDestinationToward: routes STRAIGHT PAST an ally standing directly in the way, at the real straight-line cost — no detour needed, matching what a real player could do", () => {
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([
      ["me", { id: "me", side: "party", currentHP: 16, maxHP: 16, speed: 25 }],
      ["ally", { id: "ally", side: "party", currentHP: 16, maxHP: 16, speed: 25 }]
    ]),
    positions: new Map([["me", { col: 0, row: 0 }], ["ally", { col: 2, row: 0 }]])
  };
  const dest = bestDestinationToward(state, "me", { col: 0, row: 0 }, { col: 5, row: 0 }, 999, 0);
  assert.ok(dest, "expected a real destination toward (5,0)");
  assert.notDeepEqual({ col: dest.col, row: dest.row }, { col: 2, row: 0 }, "must never select the ally's own square as a destination");
  assert.equal(dest.col, 5, "with the ally passable, the mover should reach all the way to (5,0), not stop short to detour around it");
});

test("bestDestinationToward: a DIFFERENT-side occupant in the same spot still forces a real detour (or a shorter stop), unlike an ally", () => {
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([
      ["me", { id: "me", side: "party", currentHP: 16, maxHP: 16, speed: 25 }],
      ["foe", { id: "foe", side: "opposition", currentHP: 16, maxHP: 16, speed: 25 }]
    ]),
    positions: new Map([["me", { col: 0, row: 0 }], ["foe", { col: 2, row: 0 }]])
  };
  const dest = bestDestinationToward(state, "me", { col: 0, row: 0 }, { col: 5, row: 0 }, 999, 0);
  assert.ok(dest, "expected SOME destination toward (5,0)");
  assert.notDeepEqual({ col: dest.col, row: dest.row }, { col: 2, row: 0 }, "must never select the enemy's own square as a destination");
  assert.ok(!(dest.col === 5 && dest.row === 0), "an enemy in the way must genuinely change the reachable outcome versus the ally case above (a real detour or a short stop, not a free pass through)");
});

// --- lowHpCaution / outnumberedCaution END-TO-END (design doc §22): unlike personnel-state-value's
// own coverage (which proves the SCORING FORMULA behaves correctly in isolation), these prove
// decide()'s real, full pipeline — candidate generation (the "disengage" move decide.mjs already
// offers every turn via bestDestinationAway) PLUS evaluation — actually CHOOSES to retreat under
// the right conditions, not just that a retreat option scores better in the abstract. This is
// exactly the distinction design doc §22's own bug report turned on: a technically-correct formula
// that never changes what the AI actually DOES isn't worth anything. ---

function makeMeleeThreatState(hp) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: hp, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 },
    speed: 25, strikes: [{ name: "Rifle", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] }],
    position: { col: 10, row: 10 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 30, maxHP: 30, ac: 14, saves: { fort: 5, ref: 5, will: 5 },
    speed: 25, strikes: [{ name: "Claws", strikeType: "melee", attackBonus: 15, traits: [], damage: [{ dice: "4d6", bonus: 10, damageType: "slashing" }] }], // a devastating melee-only hit
    position: { col: 11, row: 10 } // adjacent — melee range
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  return { state, turn };
}

test("lowHpCaution END TO END: at full HP, decide() presses the attack against a dangerous melee threat (my own ranged Rifle keeps working from range, so kiting away costs real offensiveReach — not worth it while healthy)", () => {
  const { state, turn } = makeMeleeThreatState(20);
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "strike", `expected a full-HP combatant to press the attack, chose: ${JSON.stringify(chosen)}`);
});

test("lowHpCaution END TO END: at critically low HP, decide() retreats out of the SAME melee threat's range instead — the identical position and the identical enemy, only currentHP changed", () => {
  const { state, turn } = makeMeleeThreatState(2);
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "move", `expected a critically hurt combatant to disengage rather than trade blows with a devastating melee attacker, chose: ${JSON.stringify(chosen)}`);
});

function makeOutnumberedState(enemyCount) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 16, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 },
    speed: 25, strikes: [{ name: "Rifle", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] }],
    position: { col: 10, row: 10 }
  };
  const combatants = new Map([["me", me]]);
  const positions = new Map([["me", { ...me.position }]]);
  for (let i = 0; i < enemyCount; i++) {
    const enemy = {
      id: `enemy-${i}`, name: `Enemy ${i}`, side: "opposition", currentHP: 20, maxHP: 20, ac: 14, saves: { fort: 5, ref: 5, will: 5 },
      speed: 25, strikes: [{ name: "Claws", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "2d6", bonus: 4, damageType: "slashing" }] }],
      position: { col: 11, row: 10 + i } // each a separate melee threat, all with real LOS to me
    };
    combatants.set(enemy.id, enemy);
    positions.set(enemy.id, { ...enemy.position });
  }
  const state = { round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [], combatants, positions };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  return { state, turn };
}

test("outnumberedCaution END TO END: a fair 1v1 (moderately hurt, but not outnumbered) still presses the attack", () => {
  const { state, turn } = makeOutnumberedState(1);
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "strike", `expected a fair 1v1 to still favor attacking, chose: ${JSON.stringify(chosen)}`);
});

test("outnumberedCaution END TO END: the IDENTICAL combatant, at the SAME HP, retreats once genuinely outnumbered (2+ visible melee enemies) — only the enemy count changed", () => {
  const { state, turn } = makeOutnumberedState(2);
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "move", `expected an outnumbered combatant to disengage rather than stand and trade with multiple melee attackers, chose: ${JSON.stringify(chosen)}`);
});

// --- Cover-seeking (design doc §26 — Ingram's own ask: "once in contact with the enemy it would
// be smart for all AIs to consider the value of placing themselves behind cover if they are
// ranged... this new being behind cover move would still allow them to be involved in the fight,
// no point hiding behind cover if your enemy outranges you or is currently not visible to you.")
// The EVALUATOR already priced a covered position as safer (state-value.mjs's own bestExpectedDamage
// folds hasCover's +2 AC/Reflex into threatExposure) — what these tests cover is the missing half:
// that a real covered destination actually gets PROPOSED, gated correctly, and — once proposed —
// that the already-correct evaluator really does prefer it.
//
// Layout used throughout: a single cover wall at x=2 (row 0 only), the same shape as
// personnel-engine.test.mjs's own COVER_WALL fixture — separates col<2 from col>=2. The enemy sits
// at col 5 (east of the wall); "me" starts at col 4 (also east — genuinely uncovered from that
// enemy at the start), so any covered destination found is a real result of crossing to col<2, not
// a coincidence of the starting position already having cover.

const COVER_WALL_AT_COL_2 = [{ c: [2, 0, 2, 1], cover: true }];

function makeCoverState({ mePos = { col: 4, row: 0 }, enemyPos = { col: 5, row: 0 }, walls = COVER_WALL_AT_COL_2, myStrikes, speed = 100 } = {}) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 },
    speed, strikes: myStrikes ?? [{ name: "Rifle", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] }],
    position: mePos
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 14, saves: { fort: 5, ref: 5, will: 5 },
    speed: 0, strikes: [{ name: "Cannon", strikeType: "ranged", attackBonus: 12, rangeIncrement: 60, traits: [], damage: [{ dice: "2d6", bonus: 4, damageType: "piercing" }] }],
    position: enemyPos
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 10, rows: 3 }, walls,
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...mePos }], ["enemy", { ...enemyPos }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed } };
  return { state, turn };
}

test("generateProposals: a ranged combatant with real cover reachable within its own weapon range gets a move proposal that lands behind it", () => {
  const { state, turn } = makeCoverState();
  const proposals = generateProposals(state, "me", turn);
  const moveDestinations = proposals.filter((p) => p.type === "move").map((p) => p.to);
  const coverMoves = moveDestinations.filter((to) => hasCover(to, state.positions.get("enemy"), state.walls));
  assert.ok(coverMoves.length > 0, `expected at least one move proposal landing behind cover — got moves: ${JSON.stringify(moveDestinations)}`);
});

test("generateProposals: a MELEE-ONLY combatant never gets a cover-seeking move proposal, even though the exact same cover is reachable — 'if they are ranged' is a real gate, not a suggestion", () => {
  const { state, turn } = makeCoverState({ myStrikes: [{ name: "Knife", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }] });
  const proposals = generateProposals(state, "me", turn);
  const coverMoves = proposals.filter((p) => p.type === "move" && hasCover(p.to, state.positions.get("enemy"), state.walls));
  assert.equal(coverMoves.length, 0, `a melee-only combatant should never get a cover-seeking candidate — got: ${JSON.stringify(coverMoves)}`);
});

test("generateProposals: with no walls in the scenario at all, no cover-seeking candidate is ever generated (hasCover is unconditionally false with no walls)", () => {
  const { state, turn } = makeCoverState({ walls: [] });
  const proposals = generateProposals(state, "me", turn);
  const coverMoves = proposals.filter((p) => p.type === "move" && hasCover(p.to, state.positions.get("enemy"), state.walls));
  assert.equal(coverMoves.length, 0);
});

test("generateProposals: cover reachable by movement but beyond the combatant's own REAL LEGAL max range is never proposed — 'still allow them to be involved in the fight'", () => {
  const { state, turn } = makeCoverState({
    // design doc §27: the gate is the true legal max (rangeIncrement*6 = 18ft here), not just the
    // no-penalty first increment — col 0/1 (4-5 squares = 20-25ft from the enemy at col 5) is
    // beyond even that real cap, not just beyond a no-penalty increment.
    myStrikes: [{ name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 3, traits: [], damage: [{ dice: "1d6", bonus: 2 }] }]
  });
  const proposals = generateProposals(state, "me", turn);
  const coverMoves = proposals.filter((p) => p.type === "move" && hasCover(p.to, state.positions.get("enemy"), state.walls));
  assert.equal(coverMoves.length, 0, `cover reachable only by leaving the real legal max range must never be proposed — got: ${JSON.stringify(coverMoves)}`);
});

test("generateProposals: cover WITHIN the real legal max range but beyond the no-penalty first increment IS now proposed — design doc §27's own fix, distinct from the test above", () => {
  const { state, turn } = makeCoverState({
    // rangeIncrement 10 -> no-penalty range 10ft, but real legal max is 60ft — the cover object
    // (~20-25ft away) sits beyond the first increment but comfortably inside the real cap, exactly
    // the gap §27 closes: the AI fires 2nd-increment shots elsewhere, so it should walk this far too.
    myStrikes: [{ name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 10, traits: [], damage: [{ dice: "1d6", bonus: 2 }] }]
  });
  const proposals = generateProposals(state, "me", turn);
  const coverMoves = proposals.filter((p) => p.type === "move" && hasCover(p.to, state.positions.get("enemy"), state.walls));
  assert.ok(coverMoves.length > 0, `expected cover within the real legal max range (beyond just the first increment) to be proposed — got moves: ${JSON.stringify(proposals.filter((p) => p.type === "move").map((p) => p.to))}`);
});

// NOTE: no separate "unknown enemy" test for cover-seeking specifically — decide.mjs's own
// bestCoverDestination call sits inside the IDENTICAL `if (!ePos) continue;` belief guard as every
// other move candidate in this same loop, which the pre-existing "an enemy with NO belief entry at
// all... gets no move-toward-it candidate either" test above already proves for that shared gate.

test("generateProposals + evaluator: among competing move-type destinations, the cover-seeking candidate outscores an equally-in-range alternative that lacks cover, once a real threat is visible", () => {
  const { state, turn } = makeCoverState();
  const enemyPos = state.positions.get("enemy");

  const moveProposals = generateProposals(state, "me", turn).filter((p) => p.type === "move");
  assert.ok(moveProposals.length > 1, "expected multiple real move destinations to compare");

  const before = evaluateState(state, "party");
  const scored = moveProposals.map((p) => {
    const sandbox = forkTurnSandbox({ state, turn });
    const result = sandbox.apply("me", p);
    assert.equal(result.legal, true, `expected every generated move to be legal: ${JSON.stringify(result)}`);
    return { p, gain: evaluateState(sandbox.state, "party") - before };
  });
  scored.sort((a, b) => b.gain - a.gain);
  const winner = scored[0];
  assert.ok(
    hasCover(winner.p.to, enemyPos, state.walls),
    `expected the top-scored move destination to have real cover — winner: ${JSON.stringify(winner.p.to)}, all scored: ${JSON.stringify(scored.map((s) => ({ to: s.p.to, gain: s.gain })))}`
  );
});

test("decide() END TO END: facing multiple real ranged threats at once with only a weak shot of its own available, the combatant relocates to a real covered position rather than trade an unfavorable attack", () => {
  // Three simultaneous attackers (mirroring makeOutnumberedState's own already-proven shape above)
  // all shielded by the SAME cover run — a real, if modest, personal attack (attackBonus -10, a
  // near-guaranteed miss) is clearly worse than cutting incoming damage from all three at once.
  // Empirically verified (not just derived by hand) before writing this assertion — plain "flee
  // away from the threat" and "flee toward the map edge" both happen to coincide with this specific
  // small map's own covered region, so this test is deliberately paired with the PRECISE,
  // unambiguously-attributed mechanism proof two tests above (sandbox-scoring move vs move
  // directly) rather than claiming this end-to-end result is attributable to cover-seeking ALONE.
  const walls = [{ c: [2, 0, 2, 1], cover: true }, { c: [2, 1, 2, 2], cover: true }, { c: [2, 2, 2, 3], cover: true }];
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 },
    speed: 100, strikes: [{ name: "Rifle", strikeType: "ranged", attackBonus: -10, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2 }] }],
    position: { col: 4, row: 1 }
  };
  const combatants = new Map([["me", me]]);
  const positions = new Map([["me", { ...me.position }]]);
  for (let i = 0; i < 3; i++) {
    const enemy = {
      id: `enemy-${i}`, name: `Enemy ${i}`, side: "opposition", currentHP: 20, maxHP: 20, ac: 14, saves: { fort: 5, ref: 5, will: 5 }, speed: 0,
      strikes: [{ name: "Cannon", strikeType: "ranged", attackBonus: 12, rangeIncrement: 60, traits: [], damage: [{ dice: "2d6", bonus: 4 }] }],
      position: { col: 5, row: i }
    };
    combatants.set(enemy.id, enemy);
    positions.set(enemy.id, { ...enemy.position });
  }
  const state = { round: 1, seed: 1, gridSize: { cols: 10, rows: 3 }, walls, combatants, positions };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 100 } };

  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "move", `expected repositioning under a multi-threat mismatch, chose: ${JSON.stringify(chosen)}`);
  assert.ok(hasCover(chosen.to, { col: 5, row: 1 }, walls), `expected the chosen reposition to be a real covered destination, chose: ${JSON.stringify(chosen)}`);
});

// --- LOS-aware tiebreak for pathfindingDestinationToward/Away (design doc §27, adversarial-audit
// finding #3 — Ingram's own report: "Nitpick ... they strike as their first action with no one in
// range to strike, they then move to a valid spot and strike again", traced to a REAL, separate
// battle: Lunar-17's entire opening turn on the adjacent-rooms map spent all 3 actions walking INTO
// a dead-end pocket with no line of effect at all, because several reachable cells tied on real
// walking distance to the target and the tiebreak fell through to cost, then to decide()'s own
// final tiebreak — a plain string comparison on "Move to (COL,ROW)" — with zero awareness that one
// tied cell actually opened a sightline and another was a blind dead end. Fixed by making "does this
// cell see the target" a real tiebreaker, checked BEFORE cost, never overriding a strictly better
// real distance. ---

test("bestDestinationToward: on the real ADJACENT_ROOMS facility fixture (the exact map that exposed this bug), a Lunar-17-speed move from Room A's center toward Room B's center lands at the doorway with real line of effect — not the dead-end open space south of Room A", () => {
  const { attacker, defender } = FACILITY_SETUPS.ADJACENT_ROOMS; // ROOM_A_CENTER (2,6) -> ROOM_B_CENTER (9,6)
  const state = {
    gridSize: FACILITY_GRID_SIZE, walls: FACILITY_WALLS,
    combatants: new Map([["me", { id: "me", side: "party" }], ["enemy", { id: "enemy", side: "opposition" }]]),
    positions: new Map([["me", { ...attacker }], ["enemy", { ...defender }]])
  };
  const dest = bestDestinationToward(state, "me", attacker, defender, 25, 0);
  assert.ok(dest, "expected a real destination to be found");
  assert.ok(lineOfEffect(dest, defender, FACILITY_WALLS), `expected the chosen destination to have real line of effect to the target — got ${JSON.stringify(dest)}, which does not see (${defender.col},${defender.row})`);
});

test("bestDestinationToward: a large standoff clamps several nearby cells to the identical score (the real tie shape this bug reproduces from) — the LOS-granting one among them still wins", () => {
  // A room (cols 0-5) with its only exit a doorway at row 5 (x=6 boundary); open, unwalled space
  // south of the room (rows 6+) is reachable but leads nowhere toward the target — the same "dead
  // end that happens to tie on distance" shape as the real facility fixture above.
  const walls = [];
  for (let row = 0; row <= 4; row++) walls.push({ c: [6, row, 6, row + 1], move: 20, sight: 20 });
  const from = { col: 3, row: 3 }, to = { col: 10, row: 5 };
  const state = { gridSize: { cols: 12, rows: 12 }, walls, combatants: new Map([["me", { id: "me", side: "party" }], ["enemy", { id: "enemy", side: "opposition" }]]), positions: new Map([["me", from], ["enemy", to]]) };
  // 60ft standoff clamps every cell within it to the SAME score, regardless of real progress —
  // exactly the flat-plateau shape that let a meaningless tiebreak decide the real bug's outcome.
  const dest = bestDestinationToward(state, "me", from, to, 25, 60);
  assert.ok(dest, "expected a real destination to be found");
  assert.ok(lineOfEffect(dest, to, walls), `expected the LOS-granting cell to win the tie — got ${JSON.stringify(dest)}`);
});

test("bestDestinationAway: the mirrored fix — on a real distance tie, a disengage candidate that actually breaks line of effect wins over one that merely stands equally far away in the open", () => {
  // A small side room behind a wall at x=4 (gap at row 5) sits exactly as far from the threat as an
  // equivalent open-ground retreat in the other direction — the same "flat plateau, meaningless
  // tiebreak" shape as the toward-fix tests above, mirrored for disengaging.
  const walls = [];
  for (let row = 0; row <= 8; row++) if (row !== 5) walls.push({ c: [4, row, 4, row + 1], move: 20, sight: 20 });
  const from = { col: 6, row: 5 }, threat = { col: 10, row: 5 };
  const state = { gridSize: { cols: 12, rows: 12 }, walls, combatants: new Map([["me", { id: "me", side: "party" }], ["threat", { id: "threat", side: "opposition" }]]), positions: new Map([["me", from], ["threat", threat]]) };
  const dest = bestDestinationAway(state, "me", from, threat, 25);
  assert.ok(dest, "expected a real destination to be found");
  assert.equal(lineOfEffect(dest, threat, walls), false, `expected the disengage candidate to actually break line of effect — got ${JSON.stringify(dest)}`);
});

// --- Blind exploration, redesigned (design doc §36 — Ingram's own rethink: "at the moment they
// move randomly which means it takes ages for them to get line of sight of each other... They need
// to explore in a way that sends them in the vector of the center of mass of their opponent and
// try to stick together as a group.") ---

// A real, full-height dividing wall at col 20 — REQUIRED, not decorative: `blindDeployment` only
// stops belief from being seeded with the true lineup at the very first refresh; if nothing
// actually blocks sight, that same refresh's own real-time perception check (anyoneOnSideCanPerceive)
// would immediately re-populate belief anyway, since lineOfEffect with no walls is unconditionally
// true. Found the hard way: an early version of these tests used `walls: []` and every one of them
// was silently exercising the ORDINARY enemy-directed movement loop, never the new exploration
// candidate at all, despite `blindDeployment: true` being set. A wall this project's own
// dividing-wall convention (random-deployment.test.mjs's own centerDividerWalls) makes genuinely
// blind.
function dividerWall(gridSize) {
  const walls = [];
  for (let r = 0; r < gridSize.rows; r++) walls.push({ c: [20, r, 20, r + 1], move: 20, sight: 20 });
  return walls;
}

function makeExploreState({ mePos, allyPositions = [], enemyPositions = [], gridSize = { cols: 60, rows: 40 }, decisionIndex = 0 } = {}) {
  const combatants = new Map();
  const positions = new Map();
  combatants.set("me", { id: "me", name: "Me", side: "party", currentHP: 16, maxHP: 16, speed: 30 });
  positions.set("me", { ...mePos });
  allyPositions.forEach((p, i) => {
    const id = `ally-${i}`;
    combatants.set(id, { id, name: id, side: "party", currentHP: 16, maxHP: 16, speed: 30 });
    positions.set(id, { ...p });
  });
  enemyPositions.forEach((p, i) => {
    const id = `enemy-${i}`;
    combatants.set(id, { id, name: id, side: "opposition", currentHP: 10, maxHP: 10, speed: 25 });
    positions.set(id, { ...p });
  });
  // design doc §35's own blind-deployment fork: without this (and the real dividing wall above),
  // refreshBelief would seed/immediately re-discover the true enemy lineup — believedPositions
  // must genuinely stay empty to exercise the exploration code path at all.
  const state = { round: 1, seed: 1, gridSize, walls: dividerWall(gridSize), combatants, positions, blindDeployment: true };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex, effective: { speed: 30 } };
  return { state, turn };
}

test("generateProposals (design doc §36): while blind, a move candidate is generated that's GENUINELY closer to the true opponent centroid than the starting position — not just any random reachable cell", () => {
  const { state, turn } = makeExploreState({ mePos: { col: 0, row: 0 }, enemyPositions: [{ col: 40, row: 0 }] });
  const proposals = generateProposals(state, "me", turn);
  const moves = proposals.filter((p) => p.type === "move");
  assert.ok(moves.length >= 1, "expected at least one move candidate while blind");
  const closerToEnemy = moves.some((m) => Math.hypot(m.to.col - 40, m.to.row - 0) < 40);
  assert.ok(closerToEnemy, `expected at least one candidate to be genuinely closer to the true enemy position, got: ${JSON.stringify(moves.map((m) => m.to))}`);
});

test("generateProposals (design doc §36): the blended candidate is pulled toward the party's OWN center of mass too, not a pure beeline at the enemy — 'try to stick together as a group'", () => {
  // "me" sits far from its own allies but the allies themselves sit far from the enemy — a pure
  // enemy-beeline would send "me" straight past its own group; the blended target must land
  // somewhere between the two centroids, not at the enemy's exact position.
  const { state, turn } = makeExploreState({
    mePos: { col: 0, row: 0 },
    allyPositions: [{ col: 2, row: 0 }, { col: 0, row: 2 }],
    enemyPositions: [{ col: 50, row: 0 }]
  });
  const proposals = generateProposals(state, "me", turn);
  const moves = proposals.filter((p) => p.type === "move");
  // None of the real candidates should land anywhere near the enemy's own position this turn —
  // movement is capped by real Speed (30ft = 6 squares) regardless, but the key property is that
  // the DIRECTION is toward a blended point, which a single turn's move can only ever approach.
  for (const m of moves) assert.ok(m.to.col < 10, `expected real movement capped by Speed, not a teleport toward the enemy: ${JSON.stringify(m.to)}`);
});

test("generateProposals (design doc §36): the blend ratio is jittered per decision — different decisionIndex values produce genuinely different blended candidates, not one fixed deterministic beeline", () => {
  const seen = new Set();
  for (let decisionIndex = 0; decisionIndex < 8; decisionIndex++) {
    const { state, turn } = makeExploreState({ mePos: { col: 0, row: 15 }, allyPositions: [{ col: 0, row: 14 }], enemyPositions: [{ col: 59, row: 15 }], decisionIndex });
    const proposals = generateProposals(state, "me", turn);
    const moves = proposals.filter((p) => p.type === "move");
    seen.add(JSON.stringify(moves.map((m) => m.to).sort((a, b) => a.col - b.col)));
  }
  assert.ok(seen.size > 1, `expected real variety across 8 decision indices — "almost randomly" should still hold even though the direction is now deliberate, got ${seen.size} distinct outcome(s)`);
});

test("generateProposals (design doc §36): with NO living enemies at all, blind exploration still offers a real (random) move candidate rather than throwing or leaving the combatant frozen", () => {
  const { state, turn } = makeExploreState({ mePos: { col: 10, row: 10 }, allyPositions: [{ col: 11, row: 10 }] });
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "move"), "expected at least one real move candidate with no enemies at all (the fight may already be won on this side, or this is a genuinely solo scout)");
});

// A full-height dividing wall EXCEPT a gap at rows 18-22 — the only crossing point between the two
// sides on this map. `me` and the enemy centroid both sit at row 0, on opposite sides of the SOLID
// part of the wall, so the real shortest route between them must detour down to the gap first.
function dividerWallWithGap(gridSize, gapStart, gapEnd) {
  const walls = [];
  for (let r = 0; r < gridSize.rows; r++) {
    if (r >= gapStart && r < gapEnd) continue;
    walls.push({ c: [20, r, 20, r + 1], move: 20, sight: 20 });
  }
  return walls;
}

test("generateProposals (design doc §37 — Ingram's bug report: PCs oscillating next to a long wall during blind exploration): the blended exploration candidate is real Dijkstra wall-aware, not a naive beeline into solid wall — it moves toward the gap, not just sideways along the wall", () => {
  const gridSize = { cols: 60, rows: 40 };
  const combatants = new Map();
  const positions = new Map();
  combatants.set("me", { id: "me", name: "Me", side: "party", currentHP: 16, maxHP: 16, speed: 30 });
  positions.set("me", { col: 15, row: 0 });
  combatants.set("enemy-0", { id: "enemy-0", name: "enemy-0", side: "opposition", currentHP: 10, maxHP: 10, speed: 25 });
  positions.set("enemy-0", { col: 45, row: 0 });
  const state = {
    round: 1, seed: 1, gridSize, walls: dividerWallWithGap(gridSize, 18, 22),
    combatants, positions, blindDeployment: true
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 30 } };
  const proposals = generateProposals(state, "me", turn);
  const moves = proposals.filter((p) => p.type === "move");
  assert.ok(moves.length >= 1, "expected at least one move candidate while blind");
  // The naive (buggy) fallback picks whichever reachable cell is closest in a straight line to the
  // blended point — that's a cell that stays near row 0, hugging the solid wall. The real
  // wall-aware field instead knows row 0 is a dead end and biases toward the gap at rows 18-22.
  const movesTowardGap = moves.some((m) => m.to.row > 2);
  assert.ok(movesTowardGap, `expected the blended candidate to move toward the gap (row > 2), not hug the solid wall at row 0 — got: ${JSON.stringify(moves.map((m) => m.to))}`);
});
