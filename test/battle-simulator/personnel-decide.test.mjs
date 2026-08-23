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
import { generateProposals, decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";

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
