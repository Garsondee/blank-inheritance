/**
 * Direct tests for personnel-engine/decide.mjs's candidate generation (design doc §19). Step-
 * candidate coverage now lives in test/battle-simulator/personnel-reactions.test.mjs (GH #18) —
 * Step is generated again now that a real Reactive Strike exists to avoid, alongside every other
 * Reactive-Strike-specific test. What's covered here instead: the two genuinely general mechanisms
 * that carried over from the Frame-scale original (reactionOnly filtering, faction-aware targeting),
 * and — the one design doc §19 calls out by name — that an enemy nobody can currently perceive is
 * never actually attacked.
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
import { forkTurnSandbox, runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { evaluateState } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";
import { hasCover, lineOfEffect } from "../../tools/battle-simulator/personnel-engine/terrain.mjs";
import { resetFloodCount, getFloodCount } from "../../tools/battle-simulator/personnel-engine/world/pathfind.mjs";
import { GRID_SIZE as FACILITY_GRID_SIZE, WALLS as FACILITY_WALLS, SETUPS as FACILITY_SETUPS } from "../../tools/battle-simulator/data/personnel-test-facility.mjs";
import { buildScenario as buildComplexBattleScenario } from "../../tools/battle-simulator/scenarios/personnel-complex-battle.mjs";

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
    areaAttacks: [{ name: "Grenade", saveType: "ref", range: 70, radius: 5, actions: 1, dc: 18, damage: [{ dice: "1d8", bonus: 0 }] }],
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

// areaAttack (design doc §38) uses `originId`, not `targetId` — a genuinely different proposal
// shape (no single target at all), so it gets its own explicit tests rather than folding into the
// targetId-keyed loops above, where it would silently check the wrong field and always read as zero.

test("generateProposals (design doc §38): a full-kit combatant with a real areaAttack ability offers one candidate per conscious enemy, aimed at that enemy's own square", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "areaAttack" && p.originId === "target"), "expected an areaAttack candidate aimed at the conscious target's own position");
});

test("generateProposals (design doc §38): ZERO areaAttack candidates aimed at an unconscious target — same §32 policy as every other offensive candidate ('the only reason to target a downed character would be to heal them')", () => {
  const { state, turn } = makeFullKitState({ targetHP: 0 });
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "areaAttack" && p.originId === "target").length, 0);
});

test("generateProposals (design doc §32): healAbility is UNAFFECTED — an ally can and should still be offered a heal toward an unconscious teammate", () => {
  const { state, turn } = makeFullKitState({ targetHP: 0 });
  state.combatants.get("me").side = "party"; // "me" and "target" are now allies
  state.combatants.get("me").healAbilities = [{ name: "Field Aid", healingAmount: 10, range: 30, actions: 1 }];
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "healAbility" && p.targetId === "target"), "an unconscious ally must still be a legal, proposed heal target");
});

// GH #60, design doc §60 Part 1b — the self-centered emanation's own candidate generation. Round-2
// adversarial review's own finding: the OLD per-ally loop must be gated to skip an areaOrigin:"self"
// ability, or it keeps emitting one misleading, target-named duplicate per hurt ally for the exact
// same ability the new single-candidate branch already handles correctly.
test("generateProposals (design doc §60 Part 1b): a self-centered emanation heal ability produces EXACTLY ONE candidate, regardless of ally count — never one duplicate per hurt ally", () => {
  const me = { id: "me", name: "Me", side: "party", currentHP: 16, maxHP: 16, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], healAbilities: [{ name: "Heal (emanation)", healingFormula: "1d8", actions: 3, areaOrigin: "self", radius: 30 }], position: { col: 0, row: 0 } };
  const ally1 = { id: "a1", name: "A1", side: "party", currentHP: 5, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } };
  const ally2 = { id: "a2", name: "A2", side: "party", currentHP: 5, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 0, row: 1 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["a1", ally1], ["a2", ally2]]),
    positions: new Map([["me", { ...me.position }], ["a1", { ...ally1.position }], ["a2", { ...ally2.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  const proposals = generateProposals(state, "me", turn);
  const healProposals = proposals.filter((p) => p.type === "healAbility");
  assert.equal(healProposals.length, 1, `expected exactly one candidate for the self-centered ability regardless of 2 hurt allies, got ${healProposals.length}: ${JSON.stringify(healProposals)}`);
  assert.equal(healProposals[0].targetId, null);
  assert.equal(healProposals[0].areaOrigin, "self");
});

test("generateProposals (design doc §60 Part 1b): a self-centered emanation ability is proposed EVEN with zero hurt allies present (self is always a valid target, standing at the emanation's own center) — no ally-scanning gate blocks it", () => {
  const me = { id: "me", name: "Me", side: "party", currentHP: 5, maxHP: 16, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], healAbilities: [{ name: "Heal (emanation)", healingFormula: "1d8", actions: 3, areaOrigin: "self", radius: 30 }], position: { col: 0, row: 0 } };
  const state = { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], combatants: new Map([["me", me]]), positions: new Map([["me", { ...me.position }]]) };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "healAbility").length, 1, "the candidate itself doesn't gate on anyone's HP — legality (anyTargetBelowFull) is what actually filters this, not candidate generation");
});

test("decide() END TO END: with THREE hurt allies in range, whole-turn planning prefers the self-centered emanation (heals all three at once) over repeatedly casting the cheaper single-target variant, AND the rationale renders a real, non-null-looking string", () => {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 16, maxHP: 16, ac: 17, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [],
    healAbilities: [
      { name: "Heal (touch)", healingFormula: "1d8", actions: 1, slotRank: 1 },
      { name: "Heal (emanation)", healingFormula: "1d8", actions: 3, areaOrigin: "self", radius: 30, slotRank: 1 }
    ],
    spellSlots: { 1: 5 }, position: { col: 0, row: 0 }
  };
  const a1 = { id: "a1", name: "A1", side: "party", currentHP: 5, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 0 } };
  const a2 = { id: "a2", name: "A2", side: "party", currentHP: 5, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 0, row: 1 } };
  const a3 = { id: "a3", name: "A3", side: "party", currentHP: 5, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 1, row: 1 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["a1", a1], ["a2", a2], ["a3", a3]]),
    positions: new Map([["me", { ...me.position }], ["a1", { ...a1.position }], ["a2", { ...a2.position }], ["a3", { ...a3.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "healAbility");
  assert.equal(chosen.areaOrigin, "self");
  assert.match(chosen.reason, /Cast Heal \(emanation\) \(centered on self\)/, `expected the fixed describe() ternary to render a real, non-"null" rationale, got: "${chosen.reason}"`);
  assert.ok(!chosen.reason.includes("null"), `rationale must never literally say "null" — got: "${chosen.reason}"`);
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

// --- Trip/Shove/Grapple/Escape (design doc §31's rules-gap sweep, priority 1) ---

test("generateProposals: a combatant with a real Athletics modifier gets trip/shove/grapple proposals against every targetable enemy", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  state.combatants.get("me").athleticsModifier = 5;
  const proposals = generateProposals(state, "me", turn);
  for (const type of ["trip", "shove", "grapple"]) {
    assert.ok(proposals.some((p) => p.type === type && p.targetId === "target"), `expected at least one ${type} proposal against a conscious target`);
  }
});

test("generateProposals: with NO Athletics modifier extracted at all, zero trip/shove/grapple proposals — opt-in, matching intimidationModifier's own pattern", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 }); // athleticsModifier never set on "me"
  const proposals = generateProposals(state, "me", turn);
  for (const type of ["trip", "shove", "grapple"]) {
    assert.equal(proposals.filter((p) => p.type === type).length, 0, `expected zero ${type} proposals with no Athletics modifier extracted`);
  }
});

test("generateProposals: the SAME Athletics-equipped combatant gets ZERO trip/shove/grapple proposals once that exact target is unconscious — same §32 policy as every other offensive candidate ('the only reason to target a downed character would be to heal them')", () => {
  const { state, turn } = makeFullKitState({ targetHP: 0 });
  state.combatants.get("me").athleticsModifier = 5;
  const proposals = generateProposals(state, "me", turn);
  for (const type of ["trip", "shove", "grapple"]) {
    assert.equal(proposals.filter((p) => p.type === type && p.targetId === "target").length, 0, `expected zero ${type} proposals against an unconscious target`);
  }
});

test("generateProposals: a combatant currently grabbed/restrained gets an Escape proposal", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  state.combatants.get("me").grappledBy = { attackerId: "target", state: "restrained", expiresEndOfRound: 5 };
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "escape"), "expected an Escape proposal while held");
});

test("generateProposals: a combatant who is NOT currently held gets no Escape proposal at all", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "escape").length, 0);
});

// --- Stand (design doc §41, Stage 0) ---

test("generateProposals: a prone combatant gets a Stand proposal", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  state.combatants.get("me").prone = true;
  const proposals = generateProposals(state, "me", turn);
  assert.ok(proposals.some((p) => p.type === "stand"), "expected a Stand proposal while prone");
});

test("generateProposals: a combatant who is NOT prone gets no Stand proposal at all", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "stand").length, 0);
});

test("generateProposals: Crawl is deliberately NOT generated on its own, even while prone — mirrors this file's own existing precedent for Step, since Crawl is dominated by Stand with no Take Cover/difficult terrain yet to make it a real, distinct choice", () => {
  const { state, turn } = makeFullKitState({ targetHP: 10 });
  state.combatants.get("me").prone = true;
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "crawl").length, 0);
});

test("decide() END TO END: a prone combatant with nothing worth attacking chooses to Stand — a real economic trade now, not a free permanent condition", () => {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20, ac: 15, speed: 25, prone: true,
    strikes: [{ name: "Knife", strikeType: "melee", attackBonus: 5, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  const farEnemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [],
    position: { col: 19, row: 19 } // far outside melee reach — nothing to Strike, nowhere useful to close to this turn
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["enemy", farEnemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...farEnemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "stand", `expected a prone combatant with nothing useful to attack to stand up and shed its real -2 attack / off-guard penalty, chose: ${JSON.stringify(chosen)}`);
});

test("decide() END TO END: an overwhelming Grapple candidate against a devastating melee threat outscores a near-guaranteed-miss Strike — proves the evaluator actually rewards Restrained's own real consequences (state-value.mjs's bestExpectedDamage restrained-exclusion + isOffGuardFromConditions's off-guard AC), not just that the candidate merely exists", () => {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20, ac: 15, speed: 0,
    athleticsModifier: 20,
    strikes: [{ name: "Feeble Jab", strikeType: "melee", attackBonus: -20, traits: [], damage: [{ dice: "1d1", bonus: 0 }] }], // never hits AC 20
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 30, maxHP: 30, ac: 20,
    saves: { fort: -10, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Devastator", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "8d6", bonus: 20 }] }], // a real, huge threat once free to attack
    position: { col: 1, row: 0 }
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 0 } };
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "grapple", `expected Grapple (near-guaranteed to restrain, neutralizing the enemy's own devastating Strike) to outscore a near-guaranteed-miss Strike, chose: ${JSON.stringify(chosen)}`);
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

/**
 * design doc §43 (Stage 2): "me" carries a MELEE weapon on purpose, not the ranged Rifle this
 * scenario used before whole-turn planning existed. A ranged attacker facing a melee-only threat can
 * now correctly discover "retreat, but keep shooting" as a genuinely superior plan (see the dedicated
 * kiting test below) — which is real, valuable new behavior, but it CONFOUNDS this pair's own
 * purpose: isolating whether lowHpCaution's own HP-scaled urgency, specifically, is what flips
 * retreat-vs-press between full and critical HP. A melee weapon closes that escape hatch (retreating
 * sacrifices ALL of "me"'s own offense, same as it always did for the enemy), restoring the original
 * clean isolation.
 */
function makeMeleeThreatState(hp) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: hp, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 },
    speed: 25, strikes: [{ name: "Knife", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] }],
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

test("lowHpCaution END TO END: at full HP, decide() presses the attack against a dangerous melee threat (retreating would sacrifice ALL of my own melee-only offense too — not worth it while healthy)", () => {
  const { state, turn } = makeMeleeThreatState(20);
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "strike", `expected a full-HP combatant to press the attack, chose: ${JSON.stringify(chosen)}`);
});

// Re-derived GH #141 (bestMatching's own cost-blindness fix — see decide.mjs's own header comment
// above TURN_TEMPLATES/planTurn) — genuinely, not just differently, better than the old pinned
// answer. Direct measurement before changing this assertion (a scratch probe, not assumed):
// "reposition-and-shoot"'s own retreat-immediately plan still projects only 24.7 total gain (its own
// phase-0 filter is hardcoded to move-type only, so GH #141's widening can't change its own answer);
// the new winning "unconstrained" plan (Strike, Strike, Move) projects 33.2 — a real, higher total,
// not noise. This makes sense once traced through: this fixture's enemy carries no `reactions` at
// all, so leaving its threatened square costs exactly the same whether it happens on action 1 or
// action 3 of the SAME turn (no Reactive Strike risk either way, per GH #18's own real trigger — it
// fires off the move itself, not off "time spent adjacent") — so the two free Knife strikes are
// genuinely free, not traded against any real safety this evaluator can see. lowHpCaution's own real
// effect is still directly visible here, just expressed differently than the old single-path search
// could find: retreating is still the LAST action either way (unlike the full-HP sibling test just
// above, which presses the attack with all 3 actions and never retreats at all).
test("lowHpCaution END TO END: at critically low HP, decide() still lands two real Strikes before retreating on the SAME turn — GH #141's own widened search finds a strictly better plan than retreating immediately", () => {
  const { state, turn } = makeMeleeThreatState(2);
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "strike", `expected the critically hurt combatant to still open with a free Strike (retreat comes last in the same turn), chose: ${JSON.stringify(chosen)}`);
  assert.match(chosen.reason, /Strike with Knife.*Strike with Knife.*Move/, `expected the full plan to land two Strikes THEN retreat, got: ${chosen.reason}`);
});

/**
 * design doc §43, Stage 2: a SECOND flagship proof case, distinct from Grapple→Strike→Strike — this
 * one is about REPOSITIONING, not a control maneuver. A ranged attacker facing a devastating
 * melee-only threat can retreat out of its reach and STILL land real shots this same turn (its own
 * Rifle works at any range) — trading away only the worst, heavily MAP-penalized 3rd shot for real
 * safety from a 4d6+10 return swing next round. Hand-verified via a scratch probe against the real
 * evaluator before writing this assertion: standing and firing 3 shots nets +10.2; retreating and
 * firing 2 nets +12.8 — genuinely better, not a wash — while a SINGLE isolated retreat action scores
 * far below a single isolated Strike, which is exactly why greedy, called-fresh-each-action decide()
 * could never have found this before Stage 2 existed.
 */
test("decide() END TO END, whole-turn planning: a RANGED attacker retreats from a devastating melee-only threat while still landing two real shots — 'reposition-and-shoot', not just 'control-then-attack'", () => {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 },
    speed: 25, strikes: [{ name: "Rifle", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] }],
    position: { col: 10, row: 10 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 30, maxHP: 30, ac: 14, saves: { fort: 5, ref: 5, will: 5 },
    speed: 25, strikes: [{ name: "Claws", strikeType: "melee", attackBonus: 15, traits: [], damage: [{ dice: "4d6", bonus: 10, damageType: "slashing" }] }],
    position: { col: 11, row: 10 }
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };

  const before = evaluateState(state, "party", undefined, "me");
  const isolatedStrike = (() => {
    const sandbox = forkTurnSandbox({ state, turn });
    sandbox.apply("me", { type: "strike", targetId: "enemy", strikeIndex: 0 });
    return evaluateState(sandbox.state, "party", undefined, "me") - before;
  })();
  const isolatedMove = (() => {
    const sandbox = forkTurnSandbox({ state, turn });
    const result = sandbox.apply("me", { type: "move", to: { col: 5, row: 10 } });
    assert.ok(result.legal, JSON.stringify(result));
    return evaluateState(sandbox.state, "party", undefined, "me") - before;
  })();
  assert.ok(isolatedStrike > isolatedMove, `expected a lone Strike to outscore a lone retreat in isolation (strike ${isolatedStrike.toFixed(2)}, move ${isolatedMove.toFixed(2)}) — otherwise this doesn't test the greedy trap at all`);

  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "move", `expected whole-turn planning to retreat first (still landing 2 real shots after) rather than press in with the greedier single Strike, chose: ${JSON.stringify(chosen)}`);
  // "disengage-and-heal" and "reposition-and-shoot" are structurally IDENTICAL here — "me" has no
  // healAbility at all, so disengage-and-heal's own 2nd-phase filter finds nothing and gracefully
  // degrades to the full pool (Strike), same as reposition-and-shoot's own attack phase. Either name
  // winning the tie is correct; the plan's actual shape (move, then two real strikes) is what matters.
  assert.match(chosen.reason, /reposition-and-shoot|disengage-and-heal/);
  assert.match(chosen.reason, /Strike with Rifle.*Strike with Rifle/);
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

// --- areaAttack friendly fire (design doc §38): the whole point of resolving a real burst against
// EVERY combatant it catches (engine.mjs), rather than a fake single-target stand-in, is that
// decide()'s existing sandbox-and-score loop prices an ally-catching origin exactly as unfavorably
// as any other ally-damaging proposal — with no bespoke "avoid your own side" heuristic anywhere in
// decide.mjs itself. Proven end to end, not just asserted: two equally-reachable enemy targets, only
// one of which happens to stand next to one of the thrower's own allies. ---

test("decide() END TO END: an areaAttack candidate that would ALSO catch an ally in the blast loses to an equally-good candidate that catches only enemies — friendly fire is priced for free by the existing evaluator, no bespoke heuristic needed", () => {
  const me = {
    id: "me", name: "Grenadier", side: "opposition", currentHP: 24, maxHP: 24, saves: { fort: 5, ref: 5, will: 5 }, speed: 0,
    areaAttacks: [{ name: "Frag Grenade", saveType: "ref", range: 70, radius: 5, actions: 1, dc: 18, damage: [{ dice: "1d8", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  // Same saves on every creature below on purpose — the enemy damage a grenade aimed at either
  // target deals is symmetric; the ONLY real difference between the two candidates is whether an
  // ally also sits in the blast, so this isolates exactly the property under test.
  const isolatedEnemy = { id: "isolated-enemy", name: "Isolated Enemy", side: "party", currentHP: 20, maxHP: 20, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, position: { col: 10, row: 0 } }; // 50ft, alone
  const crowdedEnemy = { id: "crowded-enemy", name: "Crowded Enemy", side: "party", currentHP: 20, maxHP: 20, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, position: { col: 10, row: 5 } }; // 50ft-ish, but...
  const opAlly = { id: "op-ally", name: "Op Ally", side: "opposition", currentHP: 20, maxHP: 20, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, position: { col: 11, row: 5 } }; // ...5ft from crowdedEnemy, inside the 5ft blast radius

  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["isolated-enemy", isolatedEnemy], ["crowded-enemy", crowdedEnemy], ["op-ally", opAlly]]),
    positions: new Map([["me", { ...me.position }], ["isolated-enemy", { ...isolatedEnemy.position }], ["crowded-enemy", { ...crowdedEnemy.position }], ["op-ally", { ...opAlly.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 0 } };

  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "areaAttack", `expected the grenade to be the top choice overall — real expected damage against a living enemy, chose: ${JSON.stringify(chosen)}`);
  assert.equal(chosen.originId, "isolated-enemy", `expected the clean origin (no ally in the blast) to beat the origin that would also catch op-ally — chose: ${JSON.stringify(chosen)}`);
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

// ---------------------------------------------------------------------------
// Retreat / morale (design doc §42, Stage 1 — GM Core §791, near-verbatim: "most creatures... back
// down from a battle they're obviously losing"). OPT-IN via state.moraleEnabled — every test here
// also proves the default (unset) path is completely inert, matching the tactical-planning report's
// own "two modes" argument: this is table-assist behavior, never part of the honest baseline.
// ---------------------------------------------------------------------------

function makeMoraleState({ moraleEnabled = true, myHpFraction = 0.2, temperament, prone = false } = {}) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: Math.round(20 * myHpFraction), maxHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Knife", strikeType: "melee", attackBonus: 5, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 10, row: 10 },
    ...(temperament ? { temperament } : {}),
    ...(prone ? { prone: true } : {})
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 14,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "2d6", bonus: 4 }] }],
    position: { col: 11, row: 10 } // adjacent — a devastating melee threat right next to a badly hurt "me"
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], moraleEnabled,
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  return { state, turn };
}

test("decide() END TO END: with morale ENABLED, a badly hurt combatant on a clearly losing side flees instead of fighting", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: true, myHpFraction: 0.2 });
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "move", `expected a decisive flee override (a move), chose: ${JSON.stringify(chosen)}`);
  assert.match(chosen.reason, /routing/i);
});

test("decide() END TO END: with morale NOT enabled (the default), the SAME badly-hurt, clearly-losing combatant never gets the decisive flee override", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: false, myHpFraction: 0.2 });
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.ok(!chosen.reason?.includes("routing"), `expected no decisive flee override without state.moraleEnabled, chose: ${JSON.stringify(chosen)}`);
});

// REGRESSION (design doc §53, found by the systematic transcript audit): a PRONE fleeing combatant
// used to get the ordinary "move" flee proposal regardless — but Player Core only allows Crawl or
// Stand while prone, so checkMoveLegality always rejected it. Caught live as 17 identical illegal
// proposals in one real 6-seed cautious-v1 sample (every one: prone, routing, rejected).
test("decide() END TO END: with morale ENABLED, a badly hurt, clearly-losing, PRONE combatant stands up instead of attempting an illegal flee move", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: true, myHpFraction: 0.2, prone: true });
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "stand", `expected the flee override to fall back to Stand while prone, chose: ${JSON.stringify(chosen)}`);
  assert.match(chosen.reason, /routing/i);
  const sandbox = forkTurnSandbox({ state, turn });
  assert.equal(sandbox.apply("me", chosen).legal, true, "the chosen flee-while-prone action must actually be legal, not just returned");
});

test("decide() END TO END: the SAME badly hurt, clearly-losing combatant, no longer prone, flees with a real move again — the prone fallback doesn't leak into the ordinary case", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: true, myHpFraction: 0.2, prone: false });
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "move");
  assert.match(chosen.reason, /routing/i);
});

test("decide() END TO END: a MINDLESS combatant never flees, even badly hurt on a clearly losing side with morale enabled — GM Core's own named exception", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: true, myHpFraction: 0.2, temperament: "mindless" });
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.ok(!chosen.reason?.includes("routing"), `expected a mindless combatant to never get the flee override, chose: ${JSON.stringify(chosen)}`);
});

test("decide() END TO END: a SINGLE-MINDED combatant never flees either — GM Core's other named exception", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: true, myHpFraction: 0.2, temperament: "single-minded" });
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.ok(!chosen.reason?.includes("routing"), `expected a single-minded combatant to never get the flee override, chose: ${JSON.stringify(chosen)}`);
});

test("decide() END TO END: a FANATICAL combatant never flees either — GM Core's own real quoted exception ('truly fanatical zealots'), distinct from 'mindless' which is this project's own added extension", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: true, myHpFraction: 0.2, temperament: "fanatical" });
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.ok(!chosen.reason?.includes("routing"), `expected a fanatical combatant to never get the flee override, chose: ${JSON.stringify(chosen)}`);
});

test("decide() END TO END: badly hurt but the SIDE is actually winning — no flee, since GM Core's own trigger is about the battle, not just personal injury", () => {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 4, maxHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Knife", strikeType: "melee", attackBonus: 5, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    position: { col: 10, row: 10 }
  };
  const winningAlly = {
    id: "ally", name: "Ally", side: "party", currentHP: 20, maxHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], position: { col: 9, row: 10 }
  };
  const nearlyDeadEnemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 1, maxHP: 20, ac: 14,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "2d6", bonus: 4 }] }],
    position: { col: 11, row: 10 }
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], moraleEnabled: true,
    combatants: new Map([["me", me], ["ally", winningAlly], ["enemy", nearlyDeadEnemy]]),
    positions: new Map([["me", { ...me.position }], ["ally", { ...winningAlly.position }], ["enemy", { ...nearlyDeadEnemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.ok(!chosen.reason?.includes("routing"), `expected no flee when the side is actually winning (mean HP fraction 60% vs the enemy's own 5%), chose: ${JSON.stringify(chosen)}`);
});

test("decide() END TO END: NOT personally bloodied enough yet (above the real 1/3 threshold) — no flee, even on a clearly losing side", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: true, myHpFraction: 0.5 }); // hurt, but above the 1/3 trigger
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.ok(!chosen.reason?.includes("routing"), `expected no flee above the real bloodied threshold, chose: ${JSON.stringify(chosen)}`);
});

// ---------------------------------------------------------------------------
// Whole-turn planning (design doc §43, Stage 2 of the tactical-planning report). Every scenario
// here shares one real fixture pair, chosen and hand-verified via a scratch probe against the real
// evaluator before being written into assertions (not hand-derived): an attacker with a real melee
// Strike AND a real Athletics modifier, an enemy tough enough (AC 18 vs attackBonus 10) that a
// single Strike's OWN isolated gain is nonetheless the single BEST isolated action available —
// meaning a purely greedy, called-fresh chooser would pick Strike first, exactly the failure mode
// the report's own "Trip, then capitalise" example describes.
// ---------------------------------------------------------------------------

function makeWholeTurnScenario({ athleticsModifier = 8, enemyAc = 18, enemyFort = 5, actionsUsed = 0 } = {}) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 25, athleticsModifier,
    strikes: [{ name: "Sword", strikeType: "melee", attackBonus: 10, traits: [], damage: [{ dice: "1d8", bonus: 4 }] }],
    position: { col: 10, row: 10 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 30, maxHP: 30, ac: enemyAc,
    saves: { fort: enemyFort, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Claw", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d6", bonus: 2 }] }],
    position: { col: 11, row: 10 }
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  return { state, turn };
}

// GH #58: re-verified by hand and updated (Trip now wins over Grapple, not the reverse) —
// threatReduction added a new, small (weight 0.2) term to evaluateState, close enough to flip which
// of these two SIMILAR maneuvers (both grant off-guard, both were already worse than Strike in
// isolation per the premise check below) narrowly wins the whole-turn comparison. This test's own
// actual point — whole-turn planning finds and prefers a real maneuver-then-strike combo over the
// greedier isolated Strike, the "report's own 'greedy misses Trip/Grapple, then capitalise' case" —
// still holds exactly as before; only which of the two similarly-scored maneuvers wins changed.
test("decide() END TO END, whole-turn planning: chooses a maneuver-then-strike combo (Trip) even though a single Strike's own ISOLATED gain is higher — the report's own 'greedy misses Trip/Grapple, then capitalise' case", () => {
  const { state, turn } = makeWholeTurnScenario();

  // Confirm the premise directly, not just assert the conclusion: a purely greedy, single-action
  // chooser (score each real proposal in isolation, take the max) would pick Strike here, NOT
  // a maneuver — Strike's own isolated gain is the largest of the three.
  const before = evaluateState(state, "party", undefined, "me");
  const isolated = {};
  for (const proposal of [{ type: "strike", targetId: "enemy", strikeIndex: 0 }, { type: "grapple", targetId: "enemy" }, { type: "trip", targetId: "enemy" }]) {
    const sandbox = forkTurnSandbox({ state, turn });
    const result = sandbox.apply("me", proposal);
    isolated[proposal.type] = evaluateState(sandbox.state, "party", undefined, "me") - before;
  }
  assert.ok(isolated.strike > isolated.grapple && isolated.strike > isolated.trip,
    `expected Strike to have the highest ISOLATED gain (strike ${isolated.strike.toFixed(2)}, grapple ${isolated.grapple.toFixed(2)}, trip ${isolated.trip.toFixed(2)}) — otherwise this scenario doesn't actually test the greedy trap`);

  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "trip", `expected whole-turn planning to choose a maneuver (setting up two real Strikes) over the greedier single Strike, chose: ${JSON.stringify(chosen)}`);
  assert.match(chosen.reason, /control-then-attack/, `expected the reason to name the winning template, got: "${chosen.reason}"`);
  assert.match(chosen.reason, /Strike with Sword.*Strike with Sword/, `expected the reason to show BOTH follow-up strikes queued behind the maneuver, got: "${chosen.reason}"`);
  assert.ok(Math.abs(chosen.score - isolated.trip) < 1e-9, "the returned score must be the winning maneuver's own local (first-action) gain, not the whole plan's total — matching the pre-Stage-2 score contract exactly");
});

test("decide() END TO END, whole-turn planning: with only ONE action left this call, the plan degenerates EXACTLY to the pre-Stage-2 single-action choice", () => {
  const { state, turn } = makeWholeTurnScenario({ actionsUsed: 2 }); // 3 available, 2 already spent -> 1 remaining
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "strike", `with only one action left, the single best available action IS the plan — chose: ${JSON.stringify(chosen)}`);
  assert.match(chosen.reason, /\(1 action,/, `expected the plan to report exactly 1 action, got: "${chosen.reason}"`);
  const before = evaluateState(state, "party", undefined, "me");
  const sandbox = forkTurnSandbox({ state, turn });
  sandbox.apply("me", { type: "strike", targetId: "enemy", strikeIndex: 0 });
  const isolatedStrike = evaluateState(sandbox.state, "party", undefined, "me") - before;
  assert.ok(Math.abs(chosen.score - isolatedStrike) < 1e-9, "the 1-action plan's score must exactly match the isolated single-action gain — proving no phantom lookahead credit leaks in once there's nothing left to look ahead INTO");
});

test("decide() END TO END, whole-turn planning: gracefully degrades to plain attacking when the combatant has no Athletics at all — 'control-then-attack' never crashes or dominates when it has nothing to offer", () => {
  const { state, turn } = makeWholeTurnScenario();
  state.combatants.get("me").athleticsModifier = null; // no Trip/Shove/Grapple candidates at all (generateProposals' own gate)
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "strike", `expected plain attacking once no control action is even available, chose: ${JSON.stringify(chosen)}`);
  assert.ok(!/trip|grapple|shove/i.test(chosen.reason), `expected no control-maneuver mention when none was ever legal, got: "${chosen.reason}"`);
});

test("decide() END TO END, whole-turn planning: competence < 1 is completely untouched by any of this — still the pre-Stage-2 softmax-over-single-actions reason format, never a template plan", () => {
  const { state, turn } = makeWholeTurnScenario();
  const chosen = decide(state, "me", turn, { competence: 0.3 });
  assert.ok(chosen, "expected a real choice even at low competence");
  assert.match(chosen.reason, /best of \d+ legal options/, `expected the OLD single-action reason format at competence < 1, got: "${chosen.reason}"`);
  assert.ok(!/plan \(\d+ actions?,/.test(chosen.reason), `expected NO whole-turn-plan reason format at competence < 1, got: "${chosen.reason}"`);
});

test("decide() END TO END, whole-turn planning: the flee override (design doc §42, Stage 1) still takes priority over any plan — a routing combatant never gets a multi-action template rationale", () => {
  const { state, turn } = makeMoraleState({ moraleEnabled: true, myHpFraction: 0.2 });
  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.match(chosen.reason, /routing/i);
  assert.ok(!/plan \(\d+ actions?,/.test(chosen.reason), `a fleeing combatant must never carry a whole-turn-plan rationale, got: "${chosen.reason}"`);
});

// --- GH #141: bestMatching's own action-cost blindness (decide.mjs's own header comment above
// TURN_TEMPLATES/planTurn has the full story) — a phase's winning candidate used to be picked by raw
// one-action gain alone, with no regard for how many of the turn's scarce actions it cost. Mirrors
// the exact real shape that exposed this (GH #60's Lunar-17: two heal options of different cost),
// but built as a minimal, standalone, single-decide()-call unit test rather than depending on a real
// fixture file or a full multi-round battle.
test("decide() END TO END: a cheaper, more action-efficient option is chosen over a pricier one with higher RAW gain, because the saved action unlocks a much better follow-up — the exact shape GH #141 exists to fix", () => {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 1, maxHP: 11, ac: 17, saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [{ name: "Weak Strike", strikeType: "ranged", attackBonus: 6, rangeIncrement: 60, traits: [], damage: [{ dice: "1d4", bonus: 0 }] }],
    spells: [{ name: "Big Spell", attackBonus: 14, range: 30, actions: 2, traits: ["attack"], damage: [{ dice: "2d6", bonus: 0 }] }],
    healAbilities: [
      { name: "Small Heal", healingAmount: 8, actions: 1 }, // cheaper, slightly less raw healing
      { name: "Big Heal", healingAmount: 10, actions: 2 } // pricier, slightly MORE raw healing — the exact trap
    ],
    position: { col: 0, row: 0 }
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 30, maxHP: 30, ac: 22, saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [], position: { col: 1, row: 0 }
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };

  // Confirm the premise directly, not just assert the conclusion: Big Heal really does have the
  // higher ISOLATED (one-action) gain, and Big Spell's own isolated gain is lower than EITHER heal
  // (so it can't just win phase 0 outright regardless of the heal question) — otherwise this
  // scenario doesn't actually test the trap. maxHP is deliberately tight (11, from 1 currentHP) so
  // Big Heal (+10) lands at the cap — a hypothetical SECOND heal afterward would be almost entirely
  // wasted overheal, which is what makes "heal once, cheaply, then attack" the genuinely better plan
  // rather than just a different one.
  const before = evaluateState(state, "party", undefined, "me");
  const isolated = {};
  for (const [label, proposal] of [
    ["small", { type: "healAbility", targetId: "me", abilityIndex: 0 }],
    ["big", { type: "healAbility", targetId: "me", abilityIndex: 1 }],
    ["spell", { type: "spellAttack", targetId: "enemy", spellIndex: 0 }]
  ]) {
    const sandbox = forkTurnSandbox({ state, turn });
    sandbox.apply("me", proposal);
    isolated[label] = evaluateState(sandbox.state, "party", undefined, "me") - before;
  }
  assert.ok(isolated.big > isolated.small, `expected Big Heal's own isolated gain (${isolated.big.toFixed(2)}) to exceed Small Heal's (${isolated.small.toFixed(2)}) — otherwise this isn't the trap GH #141 describes`);
  assert.ok(isolated.spell < isolated.small, `expected Big Spell's own isolated gain (${isolated.spell.toFixed(2)}) to be BELOW even Small Heal's (${isolated.small.toFixed(2)}) — otherwise phase 0 is decided by the heal-vs-attack question, not the heal-vs-heal one this test targets`);

  const chosen = decide(state, "me", turn, { competence: 1 });
  assert.equal(chosen.type, "healAbility");
  assert.match(chosen.reason, /Small Heal/, `expected the cheaper, more action-efficient Small Heal to be chosen over the pricier Big Heal (higher isolated gain but leaves no room for Big Spell), got: "${chosen.reason}"`);
  assert.match(chosen.reason, /Big Spell/, `expected the action saved by picking Small Heal to be spent on the real follow-up attack, got: "${chosen.reason}"`);
});

/**
 * PERFORMANCE REGRESSION (design doc §43): a real decide() call on the real 8-combatant, walled
 * complex-battle map (34 real proposals) took an average of 2.66s in the first, naive whole-turn
 * implementation — a 3.9x slowdown over the pre-Stage-2 baseline (~0.68s) that made a single
 * blind-opening (up to 60-round) battle take the better part of an hour, discovered only when a real
 * multi-seed test run never finished. Fixed by memoizing scored candidates across templates that
 * reach the identical action sequence (see planTurn's own header) — measured afterward at ~1.08s,
 * roughly 1.3x the pre-Stage-2 baseline. This test is deliberately generous (10x slower than the
 * fix's own measured cost) so it only fails on a real regression back toward the old shape of this
 * bug, not on ordinary machine-to-machine variance.
 */
test("PERFORMANCE: a real decide() call on the real 8-combatant walled complex-battle map completes well under the old bug's own cost", () => {
  const scenario = buildComplexBattleScenario({
    seed: 1,
    partyFixtures: ["lunar-17.json", "tapkey.json", "bennit.json", "vorza-moonshot.json"],
    oppositionFixtures: ["security-goon.json", "xenowarden-greenhorn.json", "erabryth.json", "tough.json"],
    setup: "RANDOM_ARCS"
  });
  const state = {
    round: 1, seed: scenario.seed, gridSize: scenario.gridSize, walls: scenario.walls,
    combatants: new Map(scenario.combatants.map((c) => [c.id, { ...c }])),
    positions: new Map(scenario.combatants.map((c) => [c.id, { ...c.position }]))
  };
  const meId = scenario.combatants.find((c) => c.side === "party").id;
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };

  const start = Date.now();
  const chosen = decide(state, meId, turn, { competence: 1 });
  const elapsedMs = Date.now() - start;
  assert.ok(chosen, "expected a real decision, not null, on a real populated scenario");
  assert.ok(elapsedMs < 10000, `expected a single decide() call to complete in well under 10s (the old, buggy naive implementation averaged ~2.66s and a full battle of these never finished) — took ${elapsedMs}ms`);
});

// ---------------------------------------------------------------------------------------------
// GH #62 fix 2 (design doc §76.4): planTurn's persistent, real-occupancy-scoped destination cache
// (turn.destCache). These three tests target exactly the failure modes an adversarial pre-code
// review (two rounds) found in earlier drafts of this fix: a fingerprint that never actually
// updates (would make the cache clear before every call, forever — passing every OTHER test while
// delivering zero of the intended speedup, silently), and stale occupancy surviving a real mid-turn
// kill. `turn.destCache` is deliberately a plain, test-readable object (not hidden inside planTurn,
// which isn't exported) specifically so these tests can inspect it directly rather than infer its
// behavior indirectly through AI decision quality, which would be weight-dependent and fragile.
// ---------------------------------------------------------------------------------------------

function makeCacheTestState({ mePos, victimPos, farPos }) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20,
    speed: 30, strikes: [{ name: "Big Axe", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "20d20", bonus: 0 }] }],
    position: mePos
  };
  const victim = { id: "victim", name: "Victim", side: "opposition", currentHP: 1, maxHP: 1, speed: 0, position: victimPos };
  const farEnemy = { id: "far", name: "Far", side: "opposition", currentHP: 10, maxHP: 10, speed: 0, position: farPos };
  // bestDestinationToward/Away (decide.mjs) only take the real Dijkstra-flood path
  // (pathfindingDestinationToward, via reachableCells) when state.walls.length is truthy — on a
  // wall-free grid they use the cheap stepToward heuristic instead, which never floods at all
  // (confirmed directly: a wall-free version of this scenario measured floods=0). A single wall
  // segment, far from every combatant here and never actually blocking any real move in this
  // scenario, is enough to force the real path this fix's own caching logic needs to exercise.
  const walls = [{ c: [19, 19, 19, 20], move: 20, sight: 20 }];
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls,
    combatants: new Map([["me", me], ["victim", victim], ["far", farEnemy]]),
    positions: new Map([["me", { ...mePos }], ["victim", { ...victimPos }], ["far", { ...farPos }]])
  };
  const turn = {
    actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0,
    effective: { speed: 30 }, destCache: { map: new Map(), fingerprint: null }
  };
  return { state, turn, me, victim, farEnemy };
}

test("GH #62: turn.destCache.fingerprint is STABLE across two real decide() calls when occupancy hasn't changed, and the second call floods measurably LESS — positive proof of reuse, not just 'nothing broke'", () => {
  const { state, turn } = makeCacheTestState({ mePos: { col: 0, row: 0 }, victimPos: { col: 5, row: 0 }, farPos: { col: 10, row: 0 } });

  resetFloodCount();
  const first = decide(state, "me", turn, { competence: 1 });
  const floodsCall1 = getFloodCount();
  assert.ok(first, "expected a real first decision");
  assert.ok(floodsCall1 > 0, "sanity: the first call must actually flood at least once");
  const fingerprintAfterCall1 = turn.destCache.fingerprint;
  assert.ok(fingerprintAfterCall1, "expected a real fingerprint to be recorded after the first call");
  assert.ok(turn.destCache.map.size > 0, "expected the persistent cache to actually hold entries after the first call");

  resetFloodCount();
  const second = decide(state, "me", turn, { competence: 1 });
  const floodsCall2 = getFloodCount();
  assert.ok(second, "expected a real second decision");
  assert.equal(turn.destCache.fingerprint, fingerprintAfterCall1, "occupancy didn't change — the fingerprint must not change either");
  assert.ok(floodsCall2 < floodsCall1,
    `expected the SECOND call (unchanged occupancy) to flood strictly less than the first (cold cache) — first=${floodsCall1}, second=${floodsCall2}. Equal or more would mean the persistent cache is never actually being read from.`);
});

test("GH #62: a REAL mid-turn kill (currentHP dropped to 0) changes the fingerprint and the persistent cache stops treating the dead combatant's square as occupied — the load-bearing correctness proof", () => {
  const { state, turn, victim, farEnemy } = makeCacheTestState({ mePos: { col: 0, row: 0 }, victimPos: { col: 5, row: 0 }, farPos: { col: 10, row: 0 } });
  const victimCellKey = `${victim.position.col},${victim.position.row}`;
  const farFieldKey = `field|me|${farEnemy.position.col},${farEnemy.position.row}`;

  const first = decide(state, "me", turn, { competence: 1 });
  assert.ok(first, "expected a real first decision");
  const fingerprintBeforeKill = turn.destCache.fingerprint;
  const floodBeforeKill = turn.destCache.map.get(farFieldKey);
  assert.ok(floodBeforeKill, "expected generateProposals to have flooded toward the far enemy while scoring real-occupancy candidates");
  assert.equal(floodBeforeKill.has(victimCellKey), false,
    "victim is ALIVE and occupies this cell — reachableCells must exclude an occupied cell from its own result (pre-existing, unrelated-to-this-fix behavior — sanity check that the scenario is set up correctly)");

  // Kill victim directly, exactly like a real Strike's own engine.mjs resolution does to currentHP —
  // no attemptAction/runBattle machinery needed here, since otherLivingPositions (what the fingerprint
  // and every flood's own occupancy list are built from) filters purely on currentHP > 0.
  victim.currentHP = 0;

  const second = decide(state, "me", turn, { competence: 1 });
  assert.ok(second, "expected a real second decision");
  assert.notEqual(turn.destCache.fingerprint, fingerprintBeforeKill,
    "a real occupancy change (a kill) MUST change the fingerprint, or the persistent cache would silently keep serving pre-kill answers for the rest of the turn");

  const floodAfterKill = turn.destCache.map.get(farFieldKey);
  assert.ok(floodAfterKill, "expected the far-enemy flood to be recomputed (or re-cached) on the second, post-kill call");
  assert.equal(floodAfterKill.has(victimCellKey), true,
    "victim is DEAD — a fresh flood must now treat their former square as freely reachable. Finding this false would mean the persistent cache served a STALE, pre-kill answer — the exact silent-wrong-answer bug this design exists to prevent.");
});

test("GH #62: a hand-built turn with NO destCache field (matching every non-runTurn test call site in this project) never crashes planTurn — the local fallback behaves exactly as caching did before this fix existed", () => {
  const { state, turn } = makeCacheTestState({ mePos: { col: 0, row: 0 }, victimPos: { col: 5, row: 0 }, farPos: { col: 10, row: 0 } });
  delete turn.destCache;
  assert.doesNotThrow(() => {
    const chosen = decide(state, "me", turn, { competence: 1 });
    assert.ok(chosen, "expected a real decision even with no destCache field present");
  });
});

test("GH #62 END TO END: a real runBattle turn — Strike kills an adjacent enemy, then a same-turn Move — completes with zero illegal actions and zero crashes", () => {
  // Not a positive proof of cache reuse (that's the unit-level test above) — this is the review's own
  // requested belt-and-braces check that the real attemptAction/runTurn path (not a hand-mutated HP
  // value) interacts safely with a persistent cache spanning real actions within one real turn.
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20, speed: 30,
    strikes: [{ name: "Big Axe", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "20d20", bonus: 0 }] }],
    position: { col: 0, row: 0 }
  };
  const victim = { id: "victim", name: "Victim", side: "opposition", currentHP: 1, maxHP: 1, speed: 0, position: { col: 0, row: 1 } };
  const farEnemy = { id: "far", name: "Far", side: "opposition", currentHP: 10, maxHP: 10, speed: 0, position: { col: 0, row: 6 } };

  const log = runBattle({
    seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1,
    combatants: [me, victim, farEnemy],
    ai: (state, id, turn) => (id === "me" ? decide(state, id, turn, { competence: 1 }) : null)
  });

  const meTurn = log.rounds[0].turns.find((t) => t.combatantId === "me");
  assert.ok(meTurn.actions.length >= 2, "expected at least a kill and a follow-up action within the 3-action turn");
  for (const action of meTurn.actions) {
    assert.equal(action.legal !== false, true, `expected every real action to be legal, got: ${JSON.stringify(action)}`);
  }
});

// --- Flank-seeking movement candidates (GH #59) ---

const MELEE_SWORD = { name: "Sword", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d8", bonus: 2, damageType: "slashing" }] };
const RANGED_PISTOL = { name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "piercing" }] };

function makeFlankSeekingState({ meStrikes = [MELEE_SWORD] } = {}) {
  const me = { id: "me", name: "Me", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 30, strikes: meStrikes, position: { col: 5, row: 10 } };
  // "ally" is already engaged (adjacent, melee reach) with "enemy", standing NORTH of it. A real
  // flank square exists SOUTH of the enemy (col 10, row 11), well within me's own speed from (5,10).
  const ally = { id: "ally", name: "Ally", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [MELEE_SWORD], position: { col: 10, row: 9 } };
  const enemy = { id: "enemy", name: "Enemy", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [MELEE_SWORD], position: { col: 10, row: 10 } };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["ally", ally], ["enemy", enemy]]),
    positions: new Map([["me", { ...me.position }], ["ally", { ...ally.position }], ["enemy", { ...enemy.position }]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 30 } };
  return { state, turn };
}

test("generateProposals: offers a real flank-seeking destination when a melee ally is already engaged with a reachable enemy", () => {
  const { state, turn } = makeFlankSeekingState();
  const proposals = generateProposals(state, "me", turn);
  const moveProposals = proposals.filter((p) => p.type === "move");
  const flankCell = { col: 10, row: 11 }; // exact opposite compass heading from the enemy, relative to "ally"
  const offersTheFlankSquare = moveProposals.some((p) => p.to?.col === flankCell.col && p.to?.row === flankCell.row);
  assert.ok(offersTheFlankSquare,
    `expected a move proposal to the real flanking square (${JSON.stringify(flankCell)}), got destinations: ${JSON.stringify(moveProposals.map((p) => p.to))}`);
});

test("generateProposals: offers NO flank-seeking destination when I have no melee option at all — a ranged-only combatant can never flank", () => {
  const { state, turn } = makeFlankSeekingState({ meStrikes: [RANGED_PISTOL] });
  const proposals = generateProposals(state, "me", turn);
  const moveProposals = proposals.filter((p) => p.type === "move");
  const flankCell = { col: 10, row: 11 };
  const offersTheFlankSquare = moveProposals.some((p) => p.to?.col === flankCell.col && p.to?.row === flankCell.row);
  assert.equal(offersTheFlankSquare, false,
    "a ranged-only combatant must never be offered the flanking square specifically FOR flanking purposes (it may still incidentally appear via some other destination query, but the flank-seeking search itself must not run)");
});

test("decide() END TO END: with a melee ally already engaged, whole-turn planning actually MOVES to and STRIKES from the real flanking square — not just that the candidate exists, but that it gets chosen and executed legally", () => {
  const { state, turn } = makeFlankSeekingState();
  const proposal = decide(state, "me", turn, { competence: 1 });
  assert.ok(proposal, "expected a real decision, not null");
  const sandbox = forkTurnSandbox({ state, turn });
  const result = sandbox.apply("me", proposal);
  assert.equal(result.legal, true, `expected the chosen proposal to be legal, got: ${JSON.stringify(result)}`);
});

// --- Free-point area attack aiming (GH #61, Gap 2) ---

const FRAG_GRENADE = { name: "Frag Grenade", saveType: "ref", dc: 17, range: 70, radius: 5, actions: 1, damage: [{ dice: "1d8", bonus: 0, damageType: "fire" }] };

function makeGrenadierState({ grenadierPos = { col: 8, row: 8 }, e1Pos = { col: 10, row: 9 }, e2Pos = { col: 10, row: 11 }, allyPos = null } = {}) {
  const grenadier = { id: "grenadier", name: "grenadier", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 25, strikes: [], areaAttacks: [{ ...FRAG_GRENADE }], position: grenadierPos };
  const e1 = { id: "e1", name: "e1", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: e1Pos };
  const e2 = { id: "e2", name: "e2", side: "opposition", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: e2Pos };
  const combatants = new Map([["grenadier", grenadier], ["e1", e1], ["e2", e2]]);
  const positions = new Map([["grenadier", grenadier.position], ["e1", e1Pos], ["e2", e2Pos]]);
  if (allyPos) {
    const ally = { id: "ally", name: "ally", side: "party", currentHP: 20, maxHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [], position: allyPos };
    combatants.set("ally", ally);
    positions.set("ally", allyPos);
  }
  const state = { round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [], combatants, positions };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  return { state, turn };
}

test("generateProposals: offers a free-point areaAttack candidate at the midpoint between two enemies close enough for one blast to plausibly catch both", () => {
  const { state, turn } = makeGrenadierState();
  const proposals = generateProposals(state, "grenadier", turn);
  const freePointProposals = proposals.filter((p) => p.type === "areaAttack" && p.originPoint);
  assert.ok(freePointProposals.some((p) => p.originPoint.col === 10 && p.originPoint.row === 10),
    `expected a free-point candidate at the real midpoint (10,10), got: ${JSON.stringify(freePointProposals)}`);
});

test("generateProposals: offers NO free-point areaAttack candidate for two enemies too far apart for one blast to plausibly catch both", () => {
  const { state, turn } = makeGrenadierState({ e2Pos: { col: 10, row: 30 } }); // far outside 2x radius (10ft) of e1
  const proposals = generateProposals(state, "grenadier", turn);
  const freePointProposals = proposals.filter((p) => p.type === "areaAttack" && p.originPoint);
  assert.equal(freePointProposals.length, 0, `expected zero free-point candidates for two enemies this far apart, got: ${JSON.stringify(freePointProposals)}`);
});

test("engine.mjs areaAttack resolution: a free-point origin (no originId at all) legally catches BOTH enemies — the real signature play this issue exists to enable", () => {
  const { state, turn } = makeGrenadierState();
  const sandbox = forkTurnSandbox({ state, turn });
  const result = sandbox.apply("grenadier", { type: "areaAttack", originPoint: { col: 10, row: 10 }, areaAttackIndex: 0 });
  assert.equal(result.legal, true, `expected a legal free-point blast, got: ${JSON.stringify(result)}`);
  const affectedIds = result.affected.map((a) => a.targetId).sort();
  assert.deepEqual(affectedIds, ["e1", "e2"], `expected exactly e1 and e2 caught, got: ${JSON.stringify(affectedIds)}`);
});

test("decide() END TO END: catches-two-enemies-no-allies — with a real ally positioned well clear of the midpoint, whole-turn planning prefers the free-point throw that catches both enemies over aiming at either one alone", () => {
  const { state, turn } = makeGrenadierState({ allyPos: { col: 0, row: 0 } }); // ally far from the blast
  const before = evaluateState(state, "party", undefined, "grenadier");

  // Apply each candidate to its OWN fresh sandbox (forkTurnSandbox never mutates the shared `state`)
  // and compare the resulting states' own gain directly.
  const afterFreePoint = forkTurnSandbox({ state, turn });
  const freePointResult = afterFreePoint.apply("grenadier", { type: "areaAttack", originPoint: { col: 10, row: 10 }, areaAttackIndex: 0 });
  const afterSingle = forkTurnSandbox({ state, turn });
  const singleResult = afterSingle.apply("grenadier", { type: "areaAttack", originId: "e1", areaAttackIndex: 0 });
  assert.equal(freePointResult.legal, true, `expected the free-point throw to be legal, got: ${JSON.stringify(freePointResult)}`);
  assert.equal(singleResult.legal, true, `expected the single-target throw to be legal, got: ${JSON.stringify(singleResult)}`);

  const gainFreePoint = evaluateState(afterFreePoint.state, "party", undefined, "grenadier") - before;
  const gainSingle = evaluateState(afterSingle.state, "party", undefined, "grenadier") - before;
  assert.ok(gainFreePoint > gainSingle,
    `catching both enemies (gain ${gainFreePoint.toFixed(2)}) must score above catching only one (gain ${gainSingle.toFixed(2)}) when no ally is caught either way`);

  const chosen = decide(state, "grenadier", turn, { competence: 1 });
  assert.equal(chosen.type, "areaAttack");
  assert.ok(chosen.originPoint && chosen.originPoint.col === 10 && chosen.originPoint.row === 10,
    `expected whole-turn planning to choose the real catches-both-enemies free point, chose: ${JSON.stringify(chosen)}`);
});
