/**
 * Tests for the action-utilization audit (design doc §14j) — Ingram's
 * direct instruction: "we need a system that only validates if everyone
 * uses 100% of their actions." These tests are built against synthetic
 * logs shaped exactly like engine.mjs's real output (same actionAccounting
 * fields, same exact heldReason strings copied from engine.mjs) rather
 * than a real runBattle(), so every category can be exercised precisely
 * and independently — the real-battle case is covered separately by
 * REGRESSION tests against buildScenario() further down.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { categorizeHeldReason, auditActionUtilization, assertFullActionUtilization } from "../../tools/battle-simulator/analysis/action-utilization.mjs";
import { runBattle } from "../../tools/battle-simulator/engine/engine.mjs";
import { buildScenario } from "../../tools/battle-simulator/scenarios/five-vehicles-one-frame.mjs";

function makeLog(turnsByRound) {
  return {
    rounds: turnsByRound.map((turns, i) => ({
      round: i + 1,
      turns: turns.map((t) => ({ combatantId: t.id, actionAccounting: t.accounting }))
    }))
  };
}

test("categorizeHeldReason: no hold at all is fullyUtilized", () => {
  assert.equal(categorizeHeldReason({ available: 3, spent: 3, held: 0, heldReason: null }), "fullyUtilized");
});

test("categorizeHeldReason: every real engine.mjs heldReason string is classified legitimate", () => {
  const legitimateReasons = [
    "Stunned — the whole turn is forfeit",
    "Reduced to 0 HP mid-turn (by a reaction) — remaining actions forfeited",
    "Damage state dropped mid-turn (operational -> critical), reducing the action cap from 3 to 1"
  ];
  for (const heldReason of legitimateReasons) {
    assert.equal(categorizeHeldReason({ available: 3, spent: 0, held: 3, heldReason }), "legitimate", heldReason);
  }
});

test("categorizeHeldReason: 'No legal action...' is noActionFound — the category this whole audit exists to surface, not excuse", () => {
  assert.equal(
    categorizeHeldReason({ available: 3, spent: 0, held: 3, heldReason: "No legal action the AI could find to spend the remaining action point(s) on" }),
    "noActionFound"
  );
});

test("categorizeHeldReason: an illegal-proposal hold is its own distinct, most-severe category", () => {
  assert.equal(
    categorizeHeldReason({ available: 3, spent: 1, held: 2, heldReason: 'AI proposed an illegal strike (out of range) — turn ended rather than retry' }),
    "illegalProposal"
  );
});

test("categorizeHeldReason: an unrecognized heldReason string is 'unknown', never silently trusted as fine", () => {
  assert.equal(categorizeHeldReason({ available: 3, spent: 1, held: 2, heldReason: "some future reason nobody taught this module about" }), "unknown");
});

test("auditActionUtilization: a fully-utilized battle reports 100% utilization and zero flagged turns", () => {
  const log = makeLog([
    [{ id: "a", accounting: { available: 3, spent: 3, held: 0, heldReason: null } }, { id: "b", accounting: { available: 3, spent: 3, held: 0, heldReason: null } }]
  ]);
  const audit = auditActionUtilization(log);
  assert.equal(audit.utilizationRate, 1);
  assert.equal(audit.flagged.length, 0);
  assert.equal(audit.byCategory.fullyUtilized, 2);
});

test("auditActionUtilization: legitimate holds (Stunned) reduce utilization but are never flagged", () => {
  const log = makeLog([[{ id: "a", accounting: { available: 3, spent: 0, held: 3, heldReason: "Stunned — the whole turn is forfeit" } }]]);
  const audit = auditActionUtilization(log);
  assert.ok(audit.utilizationRate < 1);
  assert.equal(audit.flagged.length, 0);
  assert.equal(audit.byCategory.legitimate, 1);
});

test("auditActionUtilization: noActionFound holds ARE flagged, with round/combatant/reason preserved for reporting", () => {
  const log = makeLog([[{ id: "ladle", accounting: { available: 3, spent: 0, held: 3, heldReason: "No legal action the AI could find to spend the remaining action point(s) on" } }]]);
  const audit = auditActionUtilization(log);
  assert.equal(audit.flagged.length, 1);
  assert.equal(audit.flagged[0].combatantId, "ladle");
  assert.equal(audit.flagged[0].round, 1);
  assert.equal(audit.flagged[0].category, "noActionFound");
});

test("assertFullActionUtilization: does not throw for a battle with only legitimate holds", () => {
  const log = makeLog([[{ id: "a", accounting: { available: 3, spent: 0, held: 3, heldReason: "Stunned — the whole turn is forfeit" } }]]);
  assert.doesNotThrow(() => assertFullActionUtilization(log));
});

test("assertFullActionUtilization: throws, listing every flagged turn by name, when a noActionFound hold exists", () => {
  const log = makeLog([
    [{ id: "ladle", accounting: { available: 3, spent: 0, held: 3, heldReason: "No legal action the AI could find to spend the remaining action point(s) on" } }],
    [{ id: "vesper", accounting: { available: 3, spent: 1, held: 2, heldReason: "No legal action the AI could find to spend the remaining action point(s) on" } }]
  ]);
  assert.throws(() => assertFullActionUtilization(log), (err) => {
    assert.ok(err.message.includes("ladle"), "expected the error to name ladle");
    assert.ok(err.message.includes("vesper"), "expected the error to name vesper");
    assert.ok(err.message.includes("2/2"), `expected the error to report 2 of 2 flagged turns: ${err.message}`);
    return true;
  });
});

test("REGRESSION baseline: a real battle from the current escort scenario has real, honestly-flagged noActionFound turns — this audit's whole purpose is to make this number visible and drive it down as the action vocabulary grows, not to already be zero", () => {
  const log = runBattle(buildScenario({ seed: 20260822, roundLimit: 8 }));
  const audit = auditActionUtilization(log);
  assert.ok(audit.totalTurns > 0);
  // Not asserting flagged.length === 0 here on purpose — design doc §14j records the real
  // baseline number this produced and tracks it going forward as real combatant options are added.
  assert.equal(audit.byCategory.illegalProposal, 0, "illegal-proposal holds should already be zero (§14i's fixes) — a regression here means a real bug, not a missing-options gap");
});
