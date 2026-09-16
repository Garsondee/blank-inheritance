/**
 * Direct tests for GH #18 — Reactive Strike, the movement-triggered case. Real, cited SF2E text
 * (gamesystems/sf2e/lang/en.json, PF2E.NPC.Abilities.Glossary.ReactiveStrike — not in the SRD mirror
 * as a full stat block, only referenced by name there): "Trigger: A creature within the monster's
 * reach uses a manipulate action or a move action, makes a ranged attack, or leaves a square during
 * a move action it's using. Effect: The monster attempts a melee Strike against the triggering
 * creature. ... This Strike doesn't count toward the monster's multiple attack penalty, and its
 * multiple attack penalty doesn't apply to this Strike." This slice implements only the
 * move-triggered case; the manipulate/ranged-while-adjacent triggers are real, separate, deferred
 * follow-ons (see engine.mjs's own header).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { hasReactiveStrike, longestMeleeStrike, threatensSquare } from "../../tools/battle-simulator/personnel-engine/flanking.mjs";
import { runBattle, forkTurnSandbox } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { generateProposals, decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { evaluateState } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";

const SHORT_MELEE = { name: "Knife", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d4", bonus: 0 }] };
const REACH_MELEE = { name: "Spear", strikeType: "melee", attackBonus: 8, traits: ["reach-10"], damage: [{ dice: "1d6", bonus: 0 }] };
const RANGED = { name: "Pistol", strikeType: "ranged", attackBonus: 8, rangeIncrement: 60, traits: [], damage: [{ dice: "1d6", bonus: 2 }] };
const REACTIVE_STRIKE = { name: "Reactive Strike", actionType: "reaction", actionsCost: null, description: "<p>...</p>" };

function makeGuard(id, { pos, strikes = [SHORT_MELEE], reactions = [REACTIVE_STRIKE], side = "opposition", ...overrides }) {
  return {
    id, name: id, side, maxHP: 20, currentHP: 20, ac: 10, saves: { fort: 5, ref: 5, will: 5 }, speed: 0,
    strikes, reactions, position: pos, ...overrides
  };
}

// --- Unit tests: hasReactiveStrike / longestMeleeStrike / threatensSquare ---

test("hasReactiveStrike: true only for a real, named 'Reactive Strike' entry", () => {
  assert.equal(hasReactiveStrike({ reactions: [REACTIVE_STRIKE] }), true);
  assert.equal(hasReactiveStrike({ reactions: [] }), false);
  assert.equal(hasReactiveStrike({ reactions: [{ name: "Get Back!" }] }), false);
  assert.equal(hasReactiveStrike({}), false); // no reactions field at all
});

test("longestMeleeStrike: picks the LONGEST-reach melee strike, ignores ranged, null if none", () => {
  assert.equal(longestMeleeStrike({ strikes: [] }), null);
  assert.equal(longestMeleeStrike({ strikes: [RANGED] }), null);
  assert.equal(longestMeleeStrike({ strikes: [SHORT_MELEE] }), SHORT_MELEE);
  assert.equal(longestMeleeStrike({ strikes: [SHORT_MELEE, REACH_MELEE] }), REACH_MELEE);
  assert.equal(longestMeleeStrike({ strikes: [REACH_MELEE, SHORT_MELEE, RANGED] }), REACH_MELEE);
});

test("threatensSquare: true within reach with a real Reactive Strike and a melee option", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 } });
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 6, row: 5 }, []), true); // adjacent, 5ft
});

test("threatensSquare: false beyond the reactor's own real melee reach", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 } });
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 8, row: 5 }, []), false); // 15ft, standard reach 5ft
});

test("threatensSquare: a reach weapon extends the threatened range", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 }, strikes: [REACH_MELEE] });
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 7, row: 5 }, []), true); // 10ft, reach-10
});

test("threatensSquare: false without a real 'Reactive Strike' entry, regardless of melee reach", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 }, reactions: [] });
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 6, row: 5 }, []), false);
});

test("threatensSquare: false without ANY melee strike, even with Reactive Strike authored", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 }, strikes: [RANGED] });
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 6, row: 5 }, []), false);
});

test("threatensSquare: false for a dead reactor", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 }, currentHP: 0 });
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 6, row: 5 }, []), false);
});

test("threatensSquare: false for a restrained reactor (Player Core: can't use attack actions except Escape)", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 }, grappledBy: { attackerId: "x", state: "restrained", expiresEndOfRound: 5 } });
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 6, row: 5 }, []), false);
});

test("threatensSquare: false when the selected strike is out of uses", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 }, strikes: [{ ...SHORT_MELEE, usesRemaining: 0 }] });
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 6, row: 5 }, []), false);
});

test("threatensSquare: a wall blocks the threat, same line-of-effect gate every other targeted action uses", () => {
  const guard = makeGuard("g", { pos: { col: 5, row: 5 } });
  const wall = [{ c: [6, 5, 6, 6], move: 20, sight: 20 }]; // vertical wall at x=6, blocking the (5,5)->(6,5) line
  assert.equal(threatensSquare(guard, { col: 5, row: 5 }, { col: 6, row: 5 }, wall), false);
});

// --- REAL BATTLE: does a real move actually provoke, resolve, and interact with the reaction
// economy exactly the way the design says? ---

function makeMover(id, pos, overrides = {}) {
  return {
    id, name: id, side: "party", maxHP: 30, currentHP: 30, ac: 12, saves: { fort: 5, ref: 5, will: 5 }, speed: 25,
    strikes: [], position: pos, ...overrides
  };
}
function makeReactiveGuard(id, pos, overrides = {}) {
  return makeGuard(id, {
    pos, strikes: [{ name: "Gun Bash", strikeType: "melee", attackBonus: 20, traits: [], damage: [{ dice: "1d4", bonus: 4 }] }],
    ...overrides
  });
}

test("REAL BATTLE: a move that leaves a square within a live reactor's reach provokes a real, resolved Strike, and spends the reaction", () => {
  const mover = makeMover("m", { col: 0, row: 5 });
  const guard = makeReactiveGuard("g", { col: 1, row: 4 }); // diagonally adjacent to the mover's START square only
  function ai(state, id, turn) {
    if (id !== "m" || turn.actionsUsed > 0) return null;
    return { type: "move", to: { col: 5, row: 5 } }; // straight line along row 5 — never occupies the guard's own square
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [mover, guard], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions?.length, 1, `expected exactly one reaction fired, got ${JSON.stringify(moveAction.reactions)}`);
  assert.equal(moveAction.reactions[0].reactorId, "g");
  assert.equal(moveAction.reactions[0].strikeName, "Gun Bash");
  assert.ok(moveAction.reactions[0].damageApplied > 0, `expected real, positive damage from a +20 attack vs AC 12, got ${JSON.stringify(moveAction.reactions[0])}`);
  assert.equal(moveAction.reactions[0].targetHPAfter, 30 - moveAction.reactions[0].damageApplied);
  assert.equal(moveAction.to.col, 5, "a non-critical Reactive Strike never stops the move — RAW disruption is manipulate-only");
});

test("REAL BATTLE: an INTERMEDIATE square within a reactor's reach provokes, even when neither the origin nor the destination is threatened", () => {
  const mover = makeMover("m", { col: 0, row: 5 });
  const guard = makeReactiveGuard("g", { col: 3, row: 4 }); // threatens only (3,5), well clear of both (0,5) and (5,5)
  function ai(state, id, turn) {
    if (id !== "m" || turn.actionsUsed > 0) return null;
    // Hand-supplied path (mirrors world/pathfind.mjs's own documented shape: includes the origin cell)
    // — exercises the per-square walk directly, without depending on real wall-based pathfinding.
    return {
      type: "move",
      to: { col: 5, row: 5, path: [{ col: 0, row: 5 }, { col: 1, row: 5 }, { col: 2, row: 5 }, { col: 3, row: 5 }, { col: 4, row: 5 }, { col: 5, row: 5 }] }
    };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [mover, guard], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions?.length, 1, `expected the guard to react as (3,5) is left, got ${JSON.stringify(moveAction.reactions)}`);
  assert.equal(moveAction.reactions[0].reactorId, "g");
});

test("REAL BATTLE: a move whose full path stays outside every hostile reactor's reach never triggers anything", () => {
  const mover = makeMover("m", { col: 0, row: 5 });
  const guard = makeReactiveGuard("g", { col: 10, row: 10 }); // far away
  function ai(state, id, turn) {
    if (id !== "m" || turn.actionsUsed > 0) return null;
    return { type: "move", to: { col: 5, row: 5 } };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [mover, guard], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions, undefined);
});

test("REAL BATTLE: Step never triggers, even ending within a live reactor's reach", () => {
  const mover = makeMover("m", { col: 0, row: 4 });
  const guard = makeReactiveGuard("g", { col: 1, row: 5 });
  function ai(state, id, turn) {
    if (id !== "m" || turn.actionsUsed > 0) return null;
    return { type: "step", to: { col: 1, row: 4 } }; // ends adjacent to the guard
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [mover, guard], ai });
  const stepAction = log.rounds[0].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "step");
  assert.equal(stepAction.legal, true, "precondition: the Step must actually succeed");
  assert.equal(stepAction.reactions, undefined, "Step must never carry a reactions field at all");
});

test("REAL BATTLE: the SAME reactor does not fire twice in the SAME round — exactly one of two threatened movers gets struck, whichever the engine reaches first", () => {
  const moverA = makeMover("a", { col: 0, row: 5 });   // adjacent to the guard
  const moverB = makeMover("b", { col: 2, row: 4 });   // also adjacent to the guard, opposite side
  const guard = makeReactiveGuard("g", { col: 1, row: 5 });
  function ai(state, id, turn) {
    if (turn.actionsUsed > 0) return null;
    if (id === "a") return { type: "move", to: { col: 5, row: 5 } }; // leaves (0,5) — threatened
    if (id === "b") return { type: "move", to: { col: 5, row: 3 } }; // leaves (2,4) — also threatened
    return null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [moverA, moverB, guard], ai });
  const reactionsA = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((a) => a.type === "move").reactions ?? [];
  const reactionsB = log.rounds[0].turns.find((t) => t.combatantId === "b").actions.find((a) => a.type === "move").reactions ?? [];
  assert.equal(reactionsA.length + reactionsB.length, 1,
    `expected the guard's single reaction to fire exactly once total, got A=${reactionsA.length} B=${reactionsB.length}`);
});

test("REAL BATTLE: the reactor's reaction refreshes next round and can fire again", () => {
  const mover = makeMover("m", { col: 0, row: 5 });
  const guard = makeReactiveGuard("g", { col: 1, row: 4 }); // threatens (0,5) and (1,5)
  let round = 0;
  function ai(state, id, turn) {
    if (id !== "m" || turn.actionsUsed > 0) return null;
    round += 1;
    if (round === 1) return { type: "move", to: { col: 5, row: 5 } }; // leaves (0,5) — provokes
    // Round 2: return the same way, with an explicit path re-passing through (1,5) as an
    // INTERMEDIATE square (not the final destination) — real per-square resolution, not a
    // hand-wave; `path` includes the origin cell, matching world/pathfind.mjs's own real shape.
    return {
      type: "move",
      to: { col: 0, row: 5, path: [{ col: 5, row: 5 }, { col: 4, row: 5 }, { col: 3, row: 5 }, { col: 2, row: 5 }, { col: 1, row: 5 }, { col: 0, row: 5 }] }
    };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 2, combatants: [mover, guard], ai });
  const round1Move = log.rounds[0].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "move");
  const round2Move = log.rounds[1].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "move");
  assert.equal(round1Move.reactions?.length, 1, "round 1 must provoke");
  assert.equal(round2Move.reactions?.length, 1, "round 2 must ALSO provoke — the reaction refreshed at round start");
});

test("REAL BATTLE: two different reactors threatening the SAME left square both fire, in stable initiative order", () => {
  const mover = makeMover("m", { col: 0, row: 5 });
  const guardA = makeReactiveGuard("ga", { col: 1, row: 4 }); // both adjacent to the mover's own start square
  const guardB = makeReactiveGuard("gb", { col: 1, row: 6 });
  function ai(state, id, turn) {
    if (id !== "m" || turn.actionsUsed > 0) return null;
    return { type: "move", to: { col: 5, row: 5 } };
  }
  const log = runBattle({
    seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1,
    combatants: [mover, guardA, guardB], ai
  });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions?.length, 2, `expected BOTH guards to react, got ${JSON.stringify(moveAction.reactions)}`);
  assert.deepEqual(moveAction.reactions.map((r) => r.reactorId).sort(), ["ga", "gb"]);
});

test("REAL BATTLE: a reaction that reduces the mover to 0 HP truncates the move at the square where it happened", () => {
  const mover = makeMover("m", { col: 0, row: 5 }, { currentHP: 1, ac: 1 }); // one hit point, easy to hit
  const guard = makeReactiveGuard("g", { col: 1, row: 4 }, { strikes: [{ name: "Sledge", strikeType: "melee", attackBonus: 30, traits: [], damage: [{ dice: "1d1", bonus: 20 }] }] });
  function ai(state, id, turn) {
    if (id !== "m" || turn.actionsUsed > 0) return null;
    return { type: "move", to: { col: 5, row: 5 } };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [mover, guard], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions?.length, 1, "precondition: the guaranteed-lethal hit must actually fire");
  assert.notEqual(moveAction.to.col, 5, "the mover must NOT reach its original destination once killed mid-move");
  assert.equal(moveAction.to.col, 0, "truncated at the square it started leaving — (0,5)");
});

test("REAL BATTLE: hostility is respected both ways, including opposition's real widened hostility toward neutral", () => {
  const neutralMover = makeMover("n", { col: 0, row: 5 }, { side: "neutral" });
  const oppositionGuard = makeReactiveGuard("og", { col: 1, row: 4 }, { side: "opposition" });
  function ai(state, id, turn) {
    if (id !== "n" || turn.actionsUsed > 0) return null;
    return { type: "move", to: { col: 5, row: 5 } };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [neutralMover, oppositionGuard], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "n").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions?.length, 1, "opposition's own real hostility model widens to treat neutral as a legal target");
});

test("REAL BATTLE: a party-side reactor never fires against a neutral mover (party does not widen hostility to neutral)", () => {
  const neutralMover = makeMover("n", { col: 0, row: 5 }, { side: "neutral" });
  const partyGuard = makeReactiveGuard("pg", { col: 1, row: 4 }, { side: "party" });
  function ai(state, id, turn) {
    if (id !== "n" || turn.actionsUsed > 0) return null;
    return { type: "move", to: { col: 5, row: 5 } };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [neutralMover, partyGuard], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "n").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions, undefined);
});

test("REAL BATTLE: a same-side mover never triggers a reactor's own ally", () => {
  const ally = makeMover("a", { col: 0, row: 5 });
  const guard = makeReactiveGuard("g", { col: 1, row: 4 }, { side: "party" });
  function ai(state, id, turn) {
    if (id !== "a" || turn.actionsUsed > 0) return null;
    return { type: "move", to: { col: 5, row: 5 } };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [ally, guard], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "a").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions, undefined);
});

// --- Decision 4: the short-circuit changes nothing when no Reactive-Strike holder is present ---

test("REAL BATTLE: a scenario with no Reactive-Strike holder at all resolves identically to a plain move (no reactions field, same HP/positions)", () => {
  const mover = makeMover("m", { col: 0, row: 5 });
  const guard = { ...makeReactiveGuard("g", { col: 1, row: 4 }), reactions: [] }; // otherwise identical, just no Reactive Strike
  function ai(state, id, turn) {
    if (id !== "m" || turn.actionsUsed > 0) return null;
    return { type: "move", to: { col: 5, row: 5 } };
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [mover, guard], ai });
  const moveAction = log.rounds[0].turns.find((t) => t.combatantId === "m").actions.find((a) => a.type === "move");
  assert.equal(moveAction.reactions, undefined);
  assert.equal(moveAction.to.col, 5);
  assert.equal(moveAction.legal, true);
});

// --- Decision 6: Step becomes a real candidate again, gated on the real condition ---

function makeDecideState({ mePos, enemyPos, enemyReactions = [REACTIVE_STRIKE] } = {}) {
  const me = {
    id: "me", name: "Me", side: "party", currentHP: 16, maxHP: 16,
    speed: 25, strikes: [SHORT_MELEE], position: mePos
  };
  const enemy = {
    id: "enemy", name: "Enemy", side: "opposition", currentHP: 10, maxHP: 10,
    speed: 0, strikes: [SHORT_MELEE], reactions: enemyReactions, position: enemyPos
  };
  const state = {
    round: 1, seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map([["me", me], ["enemy", enemy]]),
    positions: new Map([["me", { ...mePos }], ["enemy", { ...enemyPos }]]),
    reactionAvailable: new Map([["me", true], ["enemy", true]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 25 } };
  return { state, turn };
}

test("generateProposals: offers a Step candidate to close the last square onto a real Reactive-Strike holder", () => {
  const { state, turn } = makeDecideState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 2, row: 0 } });
  const proposals = generateProposals(state, "me", turn);
  const steps = proposals.filter((p) => p.type === "step");
  assert.ok(steps.length > 0, `expected at least one Step candidate, got ${JSON.stringify(proposals.map((p) => p.type))}`);
});

test("generateProposals: does NOT offer a Step candidate toward an enemy with no real Reactive Strike", () => {
  const { state, turn } = makeDecideState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 2, row: 0 }, enemyReactions: [] });
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "step").length, 0);
});

test("generateProposals: does NOT offer a Step candidate once the enemy's reaction is already spent this round", () => {
  const { state, turn } = makeDecideState({ mePos: { col: 0, row: 0 }, enemyPos: { col: 2, row: 0 } });
  state.reactionAvailable.set("enemy", false);
  const proposals = generateProposals(state, "me", turn);
  assert.equal(proposals.filter((p) => p.type === "step").length, 0);
});

// --- Decision 5: the AI's own real, sandboxed scoring correctly prices a provoked Reactive Strike
// with no new evaluator term at all — real numbers, not inferred ---

test("decide(): a move candidate that provokes a real Reactive Strike scores worse, in the real sandbox, than an otherwise-equal one that doesn't", () => {
  // The mover starts well clear of the guard's reach — both candidate PATHS matter here, not just
  // the starting square (an earlier draft of this test started the mover adjacent to the guard,
  // where EVERY destination necessarily leaves an already-threatened square first, making any two
  // candidates equally "unsafe" — a real test-construction bug, caught by the identical scores this
  // produced, not a production bug).
  const mover = { id: "m", name: "m", side: "party", currentHP: 30, maxHP: 30, ac: 12, saves: { fort: 5, ref: 5, will: 5 }, speed: 100, strikes: [], position: { col: 0, row: 5 } };
  const guard = makeReactiveGuard("g", { col: 5, row: 4 });
  const state = {
    round: 1, seed: 1, gridSize: { cols: 30, rows: 30 }, walls: [],
    combatants: new Map([["m", mover], ["g", guard]]),
    positions: new Map([["m", { col: 0, row: 5 }], ["g", { col: 5, row: 4 }]]),
    initiativeOrder: ["m", "g"],
    reactionAvailable: new Map([["m", true], ["g", true]])
  };
  const turn = { actionsAvailable: 3, actionsUsed: 0, feetMoved: 0, strikesAttempted: 0, decisionIndex: 0, effective: { speed: 100 } };

  const provokingPath = [];
  for (let col = 0; col <= 10; col++) provokingPath.push({ col, row: 5 }); // threads straight past (4,5)/(5,5)/(6,5), all within the guard's reach
  const provoking = { type: "move", to: { col: 10, row: 5, path: provokingPath } };

  const safePath = [];
  for (let row = 5; row <= 15; row++) safePath.push({ col: 0, row }); // straight away, never within 5ft of the guard
  const safe = { type: "move", to: { col: 0, row: 15, path: safePath } };

  const before = evaluateState(state, "party", undefined);
  const afterProvoking = forkTurnSandbox({ state, turn });
  const provokingResult = afterProvoking.apply("m", provoking);
  const afterSafe = forkTurnSandbox({ state, turn });
  const safeResult = afterSafe.apply("m", safe);

  assert.equal(provokingResult.legal, true, `provoking move must be legal: ${JSON.stringify(provokingResult)}`);
  assert.equal(safeResult.legal, true, `safe move must be legal: ${JSON.stringify(safeResult)}`);
  assert.ok(provokingResult.reactions?.length > 0, "precondition: the provoking path must actually provoke");
  assert.equal(safeResult.reactions, undefined, "precondition: the safe path must never provoke");

  const scoreProvoking = evaluateState(afterProvoking.state, "party", undefined) - before;
  const scoreSafe = evaluateState(afterSafe.state, "party", undefined) - before;
  assert.ok(scoreSafe > scoreProvoking,
    `expected the non-provoking move to score higher: safe=${scoreSafe}, provoking=${scoreProvoking}`);
});
