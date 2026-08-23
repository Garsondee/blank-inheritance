/**
 * End-to-end engine tests for the real PC dying/wounded/unconscious spiral (design doc §25,
 * Player Core pg. 402-403 — reference/srd/player-core/367-hit-points-healing-and-dying.json). Unlike
 * personnel-conditions.test.mjs (the pure-function layer), these run real battles through
 * runBattle() with a scripted AI, proving the mechanic actually fires correctly from real combat —
 * a real knockout, a real recovery-check turn, a real revival, a real second hit on an
 * already-downed target, and the real PC-vs-NPC asymmetry (ordinary NPCs just die, no spiral).
 *
 * EVERY scenario below keeps a second, untouched PARTY member alive alongside whoever gets knocked
 * down — checkOutcome's own pre-existing rule ("party.every(currentHP<=0) -> party-defeat") fires
 * the INSTANT a solo PC drops, ending the battle before the dying spiral ever gets a real turn to
 * run. That's correct, pre-existing behavior (matches this project's real 3v3 rosters, where one
 * PC going down never ends the fight on its own) — not something this file's tests should fight by
 * using an unrealistic 1-PC party.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBattle } from "../../tools/battle-simulator/personnel-engine/engine.mjs";

const HARD_HITTER = { name: "Cannon", strikeType: "ranged", attackBonus: 30, rangeIncrement: 60, traits: [], damage: [{ dice: "1d1", bonus: 50 }] }; // always hits, huge damage
const NO_STRIKES = []; // a combatant who never proposes an attack, however the AI is wired

function makePC(id, overrides = {}) {
  return {
    id, name: id, side: "party", maxHP: 20, currentHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: NO_STRIKES, position: { col: 0, row: 0 },
    ...overrides
  };
}
function makeAttacker(overrides = {}) {
  return {
    id: "attacker", name: "Attacker", side: "opposition", maxHP: 20, currentHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [HARD_HITTER], position: { col: 1, row: 0 },
    ...overrides
  };
}
function makeHealer(overrides = {}) {
  return {
    id: "healer", name: "Healer", side: "party", maxHP: 20, currentHP: 20, ac: 15,
    saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: NO_STRIKES,
    healAbilities: [{ name: "Field Aid", healingAmount: 10, range: 60, actions: 1 }],
    position: { col: 0, row: 1 }, ...overrides
  };
}

/** `attackerId` fires at `targetId` on its own first action every round; every other combatant
 * (bystanders, healers) never acts unless a scenario-specific `ai` override says otherwise — keeps
 * every test's turn sequence fully deterministic regardless of initiative order. */
function attackOnly(attackerId, targetId) {
  return (state, id, turn) => (id === attackerId && turn.actionsUsed === 0 ? { type: "strike", targetId, strikeIndex: 0 } : null);
}

test("a lethal hit on a full-HP PC knocks them out with dying 1 (non-critical) or dying 2 (critical), not simple death", () => {
  const pc = makePC("pc");
  const bystander = makePC("bystander", { position: { col: 0, row: 5 } }); // keeps the party alive so checkOutcome doesn't end the battle the instant pc drops
  const attacker = makeAttacker();
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [pc, bystander, attacker], ai: attackOnly("attacker", "pc") });
  const attackerTurn = log.rounds[0].turns.find((t) => t.combatantId === "attacker");
  const strike = attackerTurn.actions.find((a) => a.type === "strike");
  assert.equal(strike.legal, true);
  assert.equal(strike.targetHPAfter, 0, "HP floors at 0, never negative");
  const pcSnapshot = attackerTurn.snapshot.pc;
  assert.ok(pcSnapshot.dyingValue === 1 || pcSnapshot.dyingValue === 2, `expected dying 1 or 2, got ${pcSnapshot.dyingValue}`);
  assert.equal(pcSnapshot.unconscious, true);
  assert.equal(pcSnapshot.dead, false, "dying 1 or 2 is knocked out, not dead");
});

test("the downed PC's own next turn is a real recovery check, not a normal action turn and not silently skipped", () => {
  const pc = makePC("pc");
  const bystander = makePC("bystander", { position: { col: 0, row: 5 } });
  const attacker = makeAttacker();
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 4, combatants: [pc, bystander, attacker], ai: attackOnly("attacker", "pc") });
  const pcTurns = log.rounds.flatMap((r) => r.turns).filter((t) => t.combatantId === "pc");
  assert.ok(pcTurns.length > 0, "the downed PC must still get real turn entries, not vanish from the log");
  const recoveryTurn = pcTurns.find((t) => t.dying === true);
  assert.ok(recoveryTurn, `expected at least one real recovery-check turn among: ${JSON.stringify(pcTurns)}`);
  assert.ok(recoveryTurn.recoveryCheck, "the turn must carry the real recovery check's own roll data");
  assert.equal(recoveryTurn.actions.length, 0, "a recovery check is not a normal action turn");
});

test("taking a fresh hit while already down increases the dying value instead of dealing further HP damage — HP stays floored at 0", () => {
  const pc = makePC("pc", { currentHP: 0, dyingValue: 1 });
  const bystander = makePC("bystander", { position: { col: 0, row: 5 } });
  const attacker = makeAttacker();
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [pc, bystander, attacker], ai: attackOnly("attacker", "pc") });
  const attackerTurn = log.rounds[0].turns.find((t) => t.combatantId === "attacker");
  const strike = attackerTurn.actions.find((a) => a.type === "strike");
  assert.equal(strike.legal, true, "REGRESSION (design doc §25): a downed-but-not-dead PC must remain a legal target");
  assert.equal(strike.targetHPAfter, 0, "still floored at 0, not negative");
  const pcSnapshot = attackerTurn.snapshot.pc;
  assert.ok(pcSnapshot.dyingValue >= 2, `expected the dying value to have increased from 1, got ${pcSnapshot.dyingValue}`);
});

test("healing a downed PC back to positive HP revives them — clears dying, and they act normally on their own next turn", () => {
  const pc = makePC("pc", { currentHP: 0, dyingValue: 2 });
  const healer = makeHealer();
  // A do-nothing opposition bystander: checkOutcome's opposition.every(currentHP<=0) is vacuously
  // TRUE with zero opposition combatants, which would end the battle as an instant party-victory
  // in round 0 before anyone gets a real turn — a real combatant on the other side avoids that.
  const oppositionBystander = { id: "opposition-bystander", name: "Bystander", side: "opposition", maxHP: 20, currentHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: NO_STRIKES, position: { col: 5, row: 5 } };
  function ai(state, id, turn) {
    return id === "healer" && turn.actionsUsed === 0 ? { type: "healAbility", targetId: "pc", abilityIndex: 0 } : null;
  }
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 2, combatants: [pc, healer, oppositionBystander], ai });
  const healerR1 = log.rounds[0].turns.find((t) => t.combatantId === "healer");
  const heal = healerR1.actions.find((a) => a.type === "healAbility");
  assert.ok(heal, `expected a real heal action, got turns: ${JSON.stringify(log.rounds[0].turns.map((t) => t.combatantId))}`);
  assert.equal(heal.legal, true, "REGRESSION (design doc §25): healing a downed-but-not-dead PC must be legal — the whole point of the feature");
  assert.ok(heal.targetHPAfter > 0);
  const afterHealSnapshot = healerR1.snapshot.pc;
  assert.equal(afterHealSnapshot.dyingValue, 0);
  assert.equal(afterHealSnapshot.unconscious, false);
  // The PC's round-2 turn must be a REAL turn again (not a recovery check) — they were healed in round 1.
  const pcRound2Turn = log.rounds[1]?.turns.find((t) => t.combatantId === "pc");
  if (pcRound2Turn) assert.equal(pcRound2Turn.dying, undefined, "a revived PC takes a normal turn, not a recovery check, on their next turn");
});

test("an ordinary opposition NPC reduced to 0 HP gets no MORE turns after it dies — a pre-death turn earlier the same round (if initiative put it first) is real and expected, but nothing follows", () => {
  const npc = { id: "npc", name: "NPC", side: "opposition", maxHP: 10, currentHP: 10, ac: 1, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: NO_STRIKES, position: { col: 0, row: 0 } };
  const bystanderNpc = { id: "bystander-npc", name: "Bystander", side: "opposition", maxHP: 10, currentHP: 10, ac: 1, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: NO_STRIKES, position: { col: 0, row: 5 } };
  const attacker = { id: "pc-attacker", name: "pc-attacker", side: "party", maxHP: 20, currentHP: 20, ac: 15, saves: { fort: 5, ref: 5, will: 5 }, speed: 0, strikes: [HARD_HITTER], position: { col: 1, row: 0 } };
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 3, combatants: [npc, bystanderNpc, attacker], ai: attackOnly("pc-attacker", "npc") });
  const npcTurns = log.rounds.flatMap((r) => r.turns).filter((t) => t.combatantId === "npc");
  assert.ok(npcTurns.length <= 1, `expected at most ONE turn for npc (a legitimate pre-death turn if it acted before pc-attacker this same round), got ${npcTurns.length}`);
  // Whichever real turns npc DID get, none of them may be a "dying"-style turn — NPCs never enter the spiral at all.
  for (const t of npcTurns) assert.equal(t.dying, undefined, "an ordinary NPC must never get a recovery-check turn — no dying spiral for opposition");
});

test("a critically-failed condition-save-style knockout (design doc §25's own critical-hit wording) still resolves through the same real strike path — dying 2 on a real critical hit", () => {
  // Use a guaranteed-critical attacker (huge attack bonus against a very low AC) to pin a real crit.
  const pc = makePC("pc", { ac: 1 });
  const bystander = makePC("bystander", { position: { col: 0, row: 5 } });
  const attacker = makeAttacker();
  const log = runBattle({ seed: 1, gridSize: { cols: 20, rows: 20 }, roundLimit: 1, combatants: [pc, bystander, attacker], ai: attackOnly("attacker", "pc") });
  const attackerTurn = log.rounds[0].turns.find((t) => t.combatantId === "attacker");
  const strike = attackerTurn.actions.find((a) => a.type === "strike");
  assert.equal(strike.roll.degree, "criticalSuccess", "the fixture must produce a real, guaranteed critical hit for this test to mean anything");
  const pcSnapshot = attackerTurn.snapshot.pc;
  assert.equal(pcSnapshot.dyingValue, 2, "a critical knockout must be dying 2, not dying 1");
});
