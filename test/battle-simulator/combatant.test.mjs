import { test } from "node:test";
import assert from "node:assert/strict";
import { damageStateFor, resolveEffectiveStats, DAMAGE_STATES } from "../../tools/battle-simulator/engine/combatant.mjs";

test("damageStateFor: exact boundary values", () => {
  assert.equal(damageStateFor(100, 100), DAMAGE_STATES.OPERATIONAL);
  assert.equal(damageStateFor(67, 100), DAMAGE_STATES.OPERATIONAL); // >2/3 (66.67) — operational
  assert.equal(damageStateFor(66, 100), DAMAGE_STATES.DEGRADED);
  assert.equal(damageStateFor(34, 100), DAMAGE_STATES.DEGRADED); // >1/3 (33.33) — still degraded
  assert.equal(damageStateFor(33, 100), DAMAGE_STATES.CRITICAL);
  assert.equal(damageStateFor(1, 100), DAMAGE_STATES.CRITICAL);
  assert.equal(damageStateFor(0, 100), DAMAGE_STATES.HULKED);
});

test("resolveEffectiveStats: Operational chassis has full stats, no action cap", () => {
  const chassis = { kind: "chassis", currentHP: 70, maxHP: 70, ac: 29, hardness: 12, speed: 1200 };
  const eff = resolveEffectiveStats(chassis);
  assert.equal(eff.damageState, "operational");
  assert.equal(eff.ac, 29);
  assert.equal(eff.hardness, 12);
  assert.equal(eff.speed, 1200);
  assert.equal(eff.actionsAvailable, 3, "standard SF2E action count — Operational must not mean unlimited actions");
  assert.equal(eff.disabled, false);
});

test("resolveEffectiveStats: Degraded chassis — matches design/scale-and-chassis.md §8 exactly", () => {
  const chassis = { kind: "chassis", currentHP: 40, maxHP: 70, ac: 29, hardness: 12, speed: 1200 }; // 57%, degraded band
  const eff = resolveEffectiveStats(chassis);
  assert.equal(eff.damageState, "degraded");
  assert.equal(eff.ac, 27); // -2
  assert.equal(eff.hardness, 12); // unchanged at Degraded
  assert.equal(eff.speed, 900); // x0.75 = 900, already a multiple of 50 (one square)
  assert.equal(eff.actionsAvailable, 2);
});

test("resolveEffectiveStats: Critical chassis matches RAW Broken exactly, plus the new Hardness/action penalties", () => {
  const chassis = { kind: "chassis", currentHP: 20, maxHP: 70, ac: 29, hardness: 12, speed: 1200 }; // ~29%, critical band
  const eff = resolveEffectiveStats(chassis);
  assert.equal(eff.damageState, "critical");
  assert.equal(eff.ac, 25); // -4, matches RAW Broken
  assert.equal(eff.speed, 600); // x0.5 = halved, matches RAW Broken
  assert.equal(eff.hardness, 6); // x0.5 — new, beyond RAW
  assert.equal(eff.actionsAvailable, 1); // new — the action cap this whole mechanic exists for
});

test("resolveEffectiveStats: speed rounds DOWN to the nearest whole square, not just the nearest 50", () => {
  const chassis = { kind: "chassis", currentHP: 40, maxHP: 70, ac: 29, hardness: 12, speed: 1000 }; // degraded band, x0.75 = 750 exactly
  const oddChassis = { kind: "chassis", currentHP: 40, maxHP: 70, ac: 29, hardness: 12, speed: 1030 }; // x0.75 = 772.5 -> floors to 750, not 772 or 800
  assert.equal(resolveEffectiveStats(chassis).speed, 750);
  assert.equal(resolveEffectiveStats(oddChassis).speed, 750, "a fractional result must floor to the nearest whole 50ft square, never round up or stay fractional");
});

test("resolveEffectiveStats: Hulked/Destroyed chassis is fully disabled", () => {
  const chassis = { kind: "chassis", currentHP: 0, maxHP: 70, ac: 29, hardness: 12, speed: 1200 };
  const eff = resolveEffectiveStats(chassis);
  assert.equal(eff.damageState, "hulked");
  assert.equal(eff.disabled, true);
  assert.equal(eff.actionsAvailable, 0);
  assert.equal(eff.speed, 0);
});

test("resolveEffectiveStats: Frame action count comes from Resonance band, not damage state, while Operational", () => {
  const frame = { kind: "frame", currentHP: 170, maxHP: 170, ac: 31, speed: 300, resonanceBand: { actionsPerTurn: 3 } };
  const eff = resolveEffectiveStats(frame);
  assert.equal(eff.actionsAvailable, 3);
});

test("resolveEffectiveStats: Frame action count is capped by damage state even at a high Resonance band (the two systems compose)", () => {
  const frame = { kind: "frame", currentHP: 20, maxHP: 170, ac: 31, speed: 300, resonanceBand: { actionsPerTurn: 3 } }; // critical band
  const eff = resolveEffectiveStats(frame);
  assert.equal(eff.actionsAvailable, 1, "Critical's actionCap (1) must win over the band's 3 — min() of the two, not the band alone");
});

test("resolveEffectiveStats: a Dead Weight Frame gets 2 actions even at full HP (Resonance, not damage, is the constraint)", () => {
  const frame = { kind: "frame", currentHP: 170, maxHP: 170, ac: 31, speed: 300, resonanceBand: { actionsPerTurn: 2 } };
  const eff = resolveEffectiveStats(frame);
  assert.equal(eff.actionsAvailable, 2);
});

test("resolveEffectiveStats: the damage-state table does NOT apply to a claimant (a standard SF2E creature, not a Frame/chassis)", () => {
  const claimant = { kind: "claimant", currentHP: 10, maxHP: 165, ac: 33, hardness: 0, speed: 400 }; // ~6% HP, would be Critical if it applied
  const eff = resolveEffectiveStats(claimant);
  assert.equal(eff.ac, 33, "no AC penalty — a creature doesn't get Frame/chassis damage-state penalties");
  assert.equal(eff.speed, 400, "no speed penalty");
  assert.equal(eff.actionsAvailable, 3, "standard SF2E action economy, not the Frame/chassis system");
});
