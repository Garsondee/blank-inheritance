/**
 * Tests for the simulation-quality metrics (design doc §15a).
 *
 * The two metrics that matter most here are verbDiversity and
 * decisionEntropy / distinctPlaySignatures, because those are the ones that
 * catch the failure modes plain utilization provably MISSES: a combatant
 * cycling two filler verbs scores 100% utilization, and seven seeds of
 * identical play score perfectly on every aggregate damage number. Those
 * cases get explicit tests below.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { shannonEntropy, collectRunMetrics, aggregateMetrics, formatMetrics } from "../../tools/battle-simulator/analysis/metrics.mjs";

/** Build a synthetic log shaped exactly like runBattle()'s output. */
function makeLog({ rounds, outcome = "party-victory" }) {
  return { outcome: { result: outcome, detail: "" }, rounds };
}
function turn(combatantId, actions, { available = 3, stunned = false, dying = false } = {}) {
  const spent = actions.filter((a) => a.legal !== false).reduce((s, a) => s + (a.actionsCost ?? 1), 0);
  return {
    combatantId, stunned, dying, actions,
    actionAccounting: { available, spent, held: available - spent, heldReason: stunned ? "Stunned — the whole turn is forfeit" : (available - spent > 0 ? "No legal action the AI could find" : null) }
  };
}
const strike = (dmg = 10) => ({ type: "strike", legal: true, actionsCost: 1, damageApplied: dmg });
const move = () => ({ type: "move", legal: true, actionsCost: 1 });
const evac = () => ({ type: "evacuate", legal: true, actionsCost: 2 });

test("shannonEntropy: zero for a single repeated choice, maximal for a uniform spread", () => {
  assert.equal(shannonEntropy([10]), 0, "one option used every time carries no information");
  assert.equal(shannonEntropy([]), 0);
  assert.equal(shannonEntropy([0, 0]), 0);
  assert.equal(shannonEntropy([5, 5]), 1, "two equally-used options = exactly 1 bit");
  assert.equal(shannonEntropy([4, 4, 4, 4]), 2, "four equally-used options = 2 bits");
  assert.ok(shannonEntropy([9, 1]) < shannonEntropy([5, 5]), "a skewed mix is less varied than an even one");
});

test("collectRunMetrics: counts utilization, spent/available and turn lengths from the accounting ledger", () => {
  const log = makeLog({ rounds: [{ round: 1, turns: [
    turn("a", [strike(), strike(), strike()]),   // 3/3
    turn("b", [move()])                          // 1/3
  ] }] });
  const m = collectRunMetrics(log);
  assert.equal(m.turns, 2);
  assert.equal(m.available, 6);
  assert.equal(m.spent, 4);
  assert.equal(m.utilization, 4 / 6);
  assert.equal(m.turnLengths[3], 1);
  assert.equal(m.turnLengths[1], 1);
});

test("collectRunMetrics: an un-stunned combatant that spends nothing counts as an IDLE turn; a Stunned one does not", () => {
  const log = makeLog({ rounds: [{ round: 1, turns: [
    turn("idle", []),                                  // live but did nothing
    turn("stunned", [], { stunned: true })             // legitimately forfeit
  ] }] });
  const m = collectRunMetrics(log);
  assert.equal(m.idleTurns, 1, "only the un-stunned empty turn is idle");
  assert.equal(m.stunnedTurns, 1);
  assert.equal(m.idleTurnRate, 0.5);
});

// REGRESSION (design doc §53's transcript-audit tool, run against squishier rosters than this file
// was originally validated against): a downed-but-not-dead combatant's real dying/recovery-check
// turn (engine.mjs's own `dying: true`, `actions: []`, `available: 0`) used to count as idle — same
// bug class Stunned was already excluded for, just never hit until a roster that actually produces
// real dying spirals got run through this metric.
test("collectRunMetrics: a real DYING (unconscious, making a recovery check) turn does NOT count as idle, same as Stunned — but is tracked separately as dyingTurns", () => {
  const log = makeLog({ rounds: [{ round: 1, turns: [
    turn("idle", []),                                    // live but did nothing — genuinely idle
    turn("dying", [], { dying: true, available: 0 })      // unconscious, making a real recovery check — not a choice at all
  ] }] });
  const m = collectRunMetrics(log);
  assert.equal(m.idleTurns, 1, "only the genuinely idle turn counts — the dying turn must not inflate idleTurnRate");
  assert.equal(m.dyingTurns, 1);
  assert.equal(m.idleTurnRate, 0.5);
});

test("collectRunMetrics: illegal proposals are counted and never credited as a used verb", () => {
  const log = makeLog({ rounds: [{ round: 1, turns: [
    turn("a", [{ type: "strike", legal: false, reason: "out of range" }, move()])
  ] }] });
  const m = collectRunMetrics(log);
  assert.equal(m.illegalProposals, 1);
  assert.deepEqual(Object.keys(m.verbs), ["move"], "an illegal proposal must not inflate verb diversity");
});

test("REGRESSION (the gameable-metric problem): a combatant alternating two filler verbs hits 100% utilization but is exposed by low verbDiversity", () => {
  // This is the real Runabout pattern: move/evacuate forever, never fights.
  const turns = [];
  for (let i = 0; i < 10; i++) turns.push(turn("runabout", [evac(), move()]));
  const m = collectRunMetrics(makeLog({ rounds: [{ round: 1, turns }] }));
  assert.equal(m.utilization, 1, "utilization alone says this combatant is playing perfectly");
  assert.equal(m.minVerbDiversity, 2, "...but it only ever used two verbs, which is what actually reveals the problem");
});

test("aggregateMetrics: distinctPlaySignatures collapses when every seed plays the same way", () => {
  // Seven runs, byte-identical action mix — the exact failure seen at seeds 2001-2007.
  const identical = () => collectRunMetrics(makeLog({ rounds: [{ round: 1, turns: [turn("a", [move(), move(), move()])] }] }));
  const agg = aggregateMetrics([identical(), identical(), identical(), identical(), identical(), identical(), identical()]);
  assert.equal(agg.runs, 7);
  assert.equal(agg.distinctPlaySignatures, 1, "seven runs, one signature — the dice moved but the play did not");
  assert.ok(agg.playSignatureRatio < 0.2);
});

test("aggregateMetrics: genuinely varied runs produce many distinct signatures", () => {
  const runs = [0, 1, 2, 3].map((k) =>
    collectRunMetrics(makeLog({ rounds: [{ round: 1, turns: [turn("a", [move(), ...Array(k).fill(strike())].slice(0, 3))] }] }))
  );
  const agg = aggregateMetrics(runs);
  assert.ok(agg.distinctPlaySignatures > 1, `expected varied play to yield several signatures, got ${agg.distinctPlaySignatures}`);
});

test("aggregateMetrics: rolls per-combatant utilization up across runs and sorts worst-first", () => {
  const mk = () => collectRunMetrics(makeLog({ rounds: [{ round: 1, turns: [
    turn("busy", [strike(), strike(), strike()]),
    turn("idler", [])
  ] }] }));
  const agg = aggregateMetrics([mk(), mk()]);
  assert.equal(agg.combatants[0].id, "idler", "worst utilization must sort first");
  assert.equal(agg.combatants[0].utilization, 0);
  assert.equal(agg.combatants[1].utilization, 1);
});

test("aggregateMetrics: throws rather than silently averaging nothing", () => {
  assert.throws(() => aggregateMetrics([]), /no runs/);
});

test("formatMetrics: produces a readable summary naming every combatant", () => {
  const mk = () => collectRunMetrics(makeLog({ rounds: [{ round: 1, turns: [turn("alpha", [strike()]), turn("beta", [])] }] }));
  const out = formatMetrics(aggregateMetrics([mk()]));
  assert.match(out, /alpha/);
  assert.match(out, /beta/);
  assert.match(out, /utilization=/);
  assert.match(out, /distinctPlaySignatures=/);
});
