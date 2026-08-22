/**
 * Tests for the utility-AI's weight profiles (design doc §14h) — the
 * "what does this combatant care about" half of the framework.
 * profileFor's branching mirrors the role assignment the old hand-written
 * party-ai.mjs used to hardcode (Vesper spots, Runabout evacuates, the
 * Ladle repairs), now expressed as data-driven capability checks feeding
 * into a shared scoring engine instead of separate control flow per role.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROFILES, profileFor } from "../../tools/battle-simulator/ai/profiles.mjs";

test("profileFor: any opposition-side combatant gets RELENTLESS_ADVANCER, regardless of id", () => {
  assert.equal(profileFor({ id: "claimant-one", side: "opposition" }), PROFILES.RELENTLESS_ADVANCER);
  assert.equal(profileFor({ id: "some-future-claimant", side: "opposition" }), PROFILES.RELENTLESS_ADVANCER);
});

test("profileFor: id 'vesper' gets SPOTTER", () => {
  assert.equal(profileFor({ id: "vesper", side: "party" }), PROFILES.SPOTTER);
});

test("profileFor: canEvacuate:true gets EVACUATOR, regardless of id (capability-driven, not identity-driven)", () => {
  assert.equal(profileFor({ id: "any-vehicle", side: "party", canEvacuate: true }), PROFILES.EVACUATOR);
});

test("profileFor: repairBonus set with no strikes gets REPAIRER", () => {
  assert.equal(profileFor({ id: "ladle", side: "party", repairBonus: 24, strikes: [] }), PROFILES.REPAIRER);
});

test("profileFor: repairBonus set but WITH strikes does not get REPAIRER (a combat-capable rig with a repair skill is still an attacker first)", () => {
  assert.notEqual(profileFor({ id: "hybrid", side: "party", repairBonus: 24, strikes: [{ name: "x" }] }), PROFILES.REPAIRER);
});

test("profileFor: everything else defaults to ATTACKER", () => {
  assert.equal(profileFor({ id: "kingfisher", side: "party", strikes: [{ name: "x" }] }), PROFILES.ATTACKER);
  assert.equal(profileFor({ id: "frame-reference", side: "party", kind: "frame" }), PROFILES.ATTACKER);
});

test("RELENTLESS_ADVANCER's directive weight dominates every other weight in its own row — a regression guard: if this ever gets tuned down to a normal magnitude, the Claimant's Advance would start losing to an ordinary Strike candidate", () => {
  const { directive, ...rest } = PROFILES.RELENTLESS_ADVANCER;
  for (const [key, weight] of Object.entries(rest)) {
    assert.ok(directive > weight * 10, `directive (${directive}) should dwarf ${key} (${weight})`);
  }
});

test("SPOTTER's support weight exceeds its damage weight — spotting for an ally must be able to beat its own strike, not just compete with it", () => {
  assert.ok(PROFILES.SPOTTER.support > PROFILES.SPOTTER.damage);
});

test("EVACUATOR and REPAIRER carry zero damage weight — their own strikes (if any) must never outscore their actual job", () => {
  assert.equal(PROFILES.EVACUATOR.damage, 0);
  assert.equal(PROFILES.REPAIRER.damage, 0);
});

test("profileFor: a combatant with healAbilities but real strikes/spells too gets HYBRID_CASTER, not REPAIRER — REPAIRER is reserved for a dedicated support unit with no attack options at all (design doc §14k)", () => {
  assert.equal(profileFor({ id: "mystic", side: "party", strikes: [{ name: "x" }], healAbilities: [{ name: "y" }] }), PROFILES.HYBRID_CASTER);
});

test("HYBRID_CASTER: damage still comes first (a fighting caster, not a dedicated medic), but repair is genuinely nonzero — a heal ability must be able to matter, not be permanently drowned out like ATTACKER's repair:0", () => {
  assert.ok(PROFILES.HYBRID_CASTER.damage > PROFILES.HYBRID_CASTER.repair);
  assert.ok(PROFILES.HYBRID_CASTER.repair > 0, "must be nonzero, unlike ATTACKER, or a real heal opportunity would never be considered");
});
