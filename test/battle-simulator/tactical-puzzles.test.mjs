/**
 * TACTICAL PUZZLES (design doc §52 — the second of Ingram's own three approved testing upgrades:
 * "hand-picked scenarios with a known-correct answer... checked directly rather than via aggregate
 * win rate"). Distinct from personnel-decide.test.mjs's own extensive per-mechanism regression suite
 * (lowHpCaution, outnumberedCaution, morale/flee, cover-seeking, Grapple-then-Strike, friendly-fire
 * avoidance are ALL already covered there, end to end, against decide() directly — re-proving them
 * here would just be duplication). What THIS file adds is real, previously-untested tactical
 * JUDGMENT: which of several allies to heal, which of several enemies to attack, and whether a
 * "finish the kill" preference holds up or collapses once the numbers actually change.
 *
 * Every scenario here was built from real fixtures (raw-validation-fixtures/), then run through the
 * REAL decide() function BEFORE being written down as an assertion — exactly the discipline this
 * session's own weight-search work already established twice (verify before trusting a plausible-
 * looking result). One puzzle (finish-the-kill) genuinely surprised the author on first hand-guess;
 * the real numbers are recorded below, not the guess.
 *
 * Every candidate scored inside decide() is EXPECTED-VALUE, not a real dice roll — forkTurnSandbox
 * passes `rng: null, outcomes: EXPECTED_OUTCOMES` (engine.mjs's own header: "a sandbox can never
 * advance the battle's real dice stream"). This makes every puzzle below fully deterministic at a
 * single seed — no n=24 sample needed the way an aggregate win-rate claim would, since there is no
 * roll-to-roll variance inside the decision itself to average out.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decide } from "../../tools/battle-simulator/personnel-engine/decide.mjs";
import { forkTurnSandbox } from "../../tools/battle-simulator/personnel-engine/engine.mjs";
import { evaluateState, DEFAULT_WEIGHTS } from "../../tools/battle-simulator/personnel-engine/evaluate/state-value.mjs";

const fixturesDir = "tools/battle-simulator/data/raw-validation-fixtures";
function loadFixture(file) { return JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")); }

function mkTurn(me, actionsAvailable = 3) {
  return { combatantId: me.id, actionsAvailable, actionsUsed: 0, effective: { speed: me.speed, ac: me.ac }, decisionIndex: 0 };
}
function mkState(combatants, initiativeOrder) {
  return {
    seed: 1, gridSize: { cols: 20, rows: 20 }, walls: [],
    combatants: new Map(combatants.map((c) => [c.id, c])),
    positions: new Map(combatants.map((c) => [c.id, c.position])),
    round: 1, initiativeOrder
  };
}

// --- Puzzle 1: heal a critically wounded ally rather than press a non-decisive attack ---

test("PUZZLE — a critically wounded ally (3/25 HP) sits next to a healer with an ordinary enemy in range: decide() heals, it does not attack", () => {
  const me = { ...loadFixture("lunar-17.json"), id: "me", side: "party", position: { col: 5, row: 5 } };
  const ally = { ...loadFixture("security-goon.json"), id: "ally", side: "party", currentHP: 3, position: { col: 5, row: 4 } };
  const enemy = { ...loadFixture("security-goon.json"), id: "enemy", side: "opposition", position: { col: 8, row: 5 } };
  const state = mkState([me, ally, enemy], ["me", "ally", "enemy"]);
  const chosen = decide(state, "me", mkTurn(me));
  assert.equal(chosen.type, "healAbility");
  assert.equal(chosen.targetId, "ally");
  // Why: Transfer Vitality heals a real, guaranteed 10 HP (allyDamage weight 1.0 — the exact same
  // per-HP rate enemyDamage uses), comfortably ahead of any single strike's own EXPECTED damage
  // against a target this unremarkable — verified directly, not assumed, below.
  const before = evaluateState(state, "party", DEFAULT_WEIGHTS, "me");
  const healSandbox = forkTurnSandbox({ state, turn: mkTurn(me, 1) });
  const healGain = evaluateState(healSandbox.apply("me", { type: "healAbility", targetId: "ally", abilityIndex: 0 }).legal
    ? healSandbox.state : state, "party", DEFAULT_WEIGHTS, "me") - before;
  const bestAttackGain = Math.max(...me.strikes.map((_, strikeIndex) => {
    const sandbox = forkTurnSandbox({ state, turn: mkTurn(me, 1) });
    const result = sandbox.apply("me", { type: "strike", targetId: "enemy", strikeIndex });
    return result.legal ? evaluateState(sandbox.state, "party", DEFAULT_WEIGHTS, "me") - before : -Infinity;
  }));
  assert.ok(healGain > bestAttackGain, `expected healing (${healGain.toFixed(2)}) to beat the best available attack (${bestAttackGain.toFixed(2)})`);
});

// --- Puzzle 2: heal the ally who actually needs it, not one that's already nearly full ---

test("PUZZLE — two hurt allies, one at 3/25 HP and one at 24/25 HP: decide() heals the one who actually needs it, not the nearly-full one", () => {
  const me = { ...loadFixture("lunar-17.json"), id: "me", side: "party", position: { col: 5, row: 5 } };
  const critAlly = { ...loadFixture("security-goon.json"), id: "critAlly", side: "party", currentHP: 3, position: { col: 5, row: 4 } };
  const fineAlly = { ...loadFixture("security-goon.json"), id: "fineAlly", side: "party", currentHP: 24, position: { col: 5, row: 6 } };
  // Deliberately NO enemy at all — isolates the heal TARGET decision (which ally?) from puzzle 1's
  // own heal-vs-attack decision, so a single wrong choice can only ever have one cause.
  const state = mkState([me, critAlly, fineAlly], ["me", "critAlly", "fineAlly"]);
  const chosen = decide(state, "me", mkTurn(me));
  assert.equal(chosen.type, "healAbility");
  assert.equal(chosen.targetId, "critAlly", "healing the nearly-full ally would waste 9 of Transfer Vitality's 10 HP (capped at maxHP) for almost no real gain");
});

// --- Puzzle 3: attack the already-off-guard enemy over an equally-reachable healthy-postured one ---

test("PUZZLE — one prone (off-guard) enemy and one upright enemy, otherwise identical and equally reachable: decide() attacks the prone one", () => {
  const me = { ...loadFixture("security-goon.json"), id: "me", side: "party", position: { col: 5, row: 5 } };
  const proneEnemy = { ...loadFixture("security-goon.json"), id: "proneEnemy", side: "opposition", prone: true, position: { col: 6, row: 5 } };
  const uprightEnemy = { ...loadFixture("security-goon.json"), id: "uprightEnemy", side: "opposition", position: { col: 4, row: 5 } };
  const state = mkState([me, proneEnemy, uprightEnemy], ["me", "proneEnemy", "uprightEnemy"]);
  const chosen = decide(state, "me", mkTurn(me));
  assert.equal(chosen.targetId, "proneEnemy", "Prone's real off-guard AC penalty (condition-32-prone.json) makes this attack strictly more likely to land — the evaluator should prefer it with everything else equal");
});

// --- Puzzle 4: "finish the kill" — real, but conditional on the hit actually securing it ---

/**
 * The interesting pair. First hand-guess before running this for real: "of course it finishes the
 * near-dead enemy, removing an attacker from the field is obviously better." The real, verified
 * mechanism is more specific than that guess: Baton (1d6+3, real expected damage clears 2 HP outright)
 * DOES prefer the near-dead target — but the real margin comes from the ADDITIONAL bonus of erasing
 * that enemy's own future threatExposure entirely (verified via a direct evaluateState comparison
 * below, not just trusting decide()'s own pick), not merely "2 HP is easy to reach." Swap in Arc
 * Pistol alone — real expected damage on this AC that does NOT clear 2 HP outright — and the
 * preference REVERSES: decide() correctly targets the healthy enemy instead, because a non-lethal hit
 * on the near-dead target gets none of that elimination bonus while still giving up real expected
 * damage against the healthier target. This is the actual claim worth testing: the preference tracks
 * whether the hit secures the kill, not a blind "always finish off the low-HP one."
 */
function buildFinishTheKillState(weaponFilter) {
  const meFull = { ...loadFixture("security-goon.json"), id: "me", side: "party", position: { col: 5, row: 5 } };
  const me = weaponFilter ? { ...meFull, strikes: meFull.strikes.filter(weaponFilter) } : meFull;
  const nearDead = { ...loadFixture("security-goon.json"), id: "nearDead", side: "opposition", currentHP: 2, position: { col: 6, row: 5 } };
  const healthy = { ...loadFixture("security-goon.json"), id: "healthy", side: "opposition", position: { col: 4, row: 5 } };
  return { me, state: mkState([me, nearDead, healthy], ["me", "nearDead", "healthy"]) };
}

test("PUZZLE — a lethal weapon (Baton) against a 2-HP enemy next to a full-HP one: decide() finishes the near-dead enemy", () => {
  const { me, state } = buildFinishTheKillState();
  const chosen = decide(state, "me", mkTurn(me, 1));
  assert.equal(chosen.type, "strike");
  assert.equal(chosen.targetId, "nearDead");
  assert.equal(chosen.strikeIndex, me.strikes.findIndex((s) => s.name === "Baton"));

  // Independently verify WHY, rather than trust the pick alone (design doc §52's own stated
  // discipline) — a real, direct evaluateState comparison of both candidates.
  const before = evaluateState(state, "party", DEFAULT_WEIGHTS, "me");
  const batonIndex = me.strikes.findIndex((s) => s.name === "Baton");
  const gainAgainst = (targetId) => {
    const sandbox = forkTurnSandbox({ state, turn: mkTurn(me, 1) });
    const result = sandbox.apply("me", { type: "strike", targetId, strikeIndex: batonIndex });
    assert.equal(result.legal, true);
    return evaluateState(sandbox.state, "party", DEFAULT_WEIGHTS, "me") - before;
  };
  const killGain = gainAgainst("nearDead");
  const woundGain = gainAgainst("healthy");
  assert.ok(killGain > woundGain, `expected finishing nearDead (${killGain.toFixed(2)}) to beat wounding healthy (${woundGain.toFixed(2)})`);
});

test("PUZZLE — the SAME 2-HP-vs-full-HP choice, but with only a weapon too weak to secure the kill: decide() targets the HEALTHY enemy instead — the preference is conditional, not a blind low-HP rule", () => {
  const { me, state } = buildFinishTheKillState((s) => s.name === "Arc Pistol");
  const chosen = decide(state, "me", mkTurn(me, 1));
  assert.equal(chosen.type, "strike");
  assert.equal(chosen.targetId, "healthy", "Arc Pistol's real expected damage does not clear 2 HP outright, so nearDead survives and gets none of the elimination bonus — hitting the healthier target for real expected damage should win instead");
});
