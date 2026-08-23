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
import { generateProposals, decide, bestDestinationToward } from "../../tools/battle-simulator/personnel-engine/decide.mjs";

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
