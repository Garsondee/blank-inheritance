// Tier 1 — the director's-console mechanics (Contact Pool, False Contact,
// Frame damage states, Bleed), matched against the real numbers in
// data/campaign/config.json rather than invented ones.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CONTACT_POOL,
  CONTACT_TYPES,
  contactTarget,
  rollContactPool,
  DAMAGE_STATES,
  damageStepDown,
  damageStepUp,
  isDeployable,
  BLEED_MIN,
  BLEED_MAX,
  adjustBleed,
  isBerserk,
  rollBerserkDuration
} from "../module/blank-inheritance/scripts/core/director.mjs";

test("contactTarget starts at 20 and drops by 1 per quiet morning, floored at 13", () => {
  assert.equal(contactTarget(1), 20);
  assert.equal(contactTarget(2), 19);
  assert.equal(contactTarget(7), 14);
  assert.equal(contactTarget(8), 13);
  assert.equal(contactTarget(20), 13, "the target must never drop below the floor, no matter how many quiet mornings pass");
});

test("contactTarget rejects a morning count that isn't a positive integer", () => {
  assert.throws(() => contactTarget(0), /positive integer/);
  assert.throws(() => contactTarget(-1), /positive integer/);
  assert.throws(() => contactTarget(1.5), /positive integer/);
});

test("rollContactPool triggers exactly on roll >= target, below the ceiling morning", () => {
  const belowTarget = rollContactPool(1, () => 18 / 20 - 1e-9); // rolls 18 vs target 20
  assert.equal(belowTarget.roll, 18);
  assert.equal(belowTarget.triggered, false);
  assert.equal(belowTarget.forced, false);

  const atTarget = rollContactPool(1, () => 19.999 / 20); // rolls 20 vs target 20
  assert.equal(atTarget.roll, 20);
  assert.equal(atTarget.triggered, true);
});

test("rollContactPool forces a trigger at the ceiling morning regardless of the roll", () => {
  const r = rollContactPool(CONTACT_POOL.ceilingMorning, () => 0); // rolls a 1
  assert.equal(r.roll, 1);
  assert.equal(r.forced, true);
  assert.equal(r.triggered, true, "the ceiling must force a trigger even on the worst possible roll");
});

test("CONTACT_TYPES lists Real plus all three False types, matching config.json's own ids", () => {
  const ids = CONTACT_TYPES.map((t) => t.id);
  assert.deepEqual(ids, ["real", "type-a", "type-b", "type-c"]);
  for (const t of CONTACT_TYPES) assert.ok(t.label && t.description, `${t.id} is missing a label/description`);
});

test("damageStepDown moves one step worse and stops at hulked", () => {
  assert.equal(damageStepDown("operational"), "degraded");
  assert.equal(damageStepDown("degraded"), "critical");
  assert.equal(damageStepDown("critical"), "hulked");
  assert.equal(damageStepDown("hulked"), "hulked", "hulked must not step past the end of the track");
});

test("damageStepUp moves one step of repair and stops at operational", () => {
  assert.equal(damageStepUp("hulked"), "critical");
  assert.equal(damageStepUp("critical"), "degraded");
  assert.equal(damageStepUp("degraded"), "operational");
  assert.equal(damageStepUp("operational"), "operational", "operational must not step past the start of the track");
});

test("damage-state helpers reject an unknown state rather than silently doing nothing", () => {
  assert.throws(() => damageStepDown("scratched"), /unknown damage state/);
  assert.throws(() => damageStepUp("scratched"), /unknown damage state/);
});

test("isDeployable is true for operational and degraded only", () => {
  assert.equal(isDeployable("operational"), true);
  assert.equal(isDeployable("degraded"), true);
  assert.equal(isDeployable("critical"), false);
  assert.equal(isDeployable("hulked"), false);
});

test("DAMAGE_STATES is the real four-step track, in order", () => {
  assert.deepEqual(DAMAGE_STATES, ["operational", "degraded", "critical", "hulked"]);
});

test("adjustBleed clamps to 0-10 in both directions", () => {
  assert.equal(adjustBleed(9, 5), BLEED_MAX);
  assert.equal(adjustBleed(1, -5), BLEED_MIN);
  assert.equal(adjustBleed(4, 2), 6);
});

test("isBerserk is true at and only at 10 or above", () => {
  assert.equal(isBerserk(9), false);
  assert.equal(isBerserk(10), true);
});

test("rollBerserkDuration returns 1-4, matching the real '1d4 rounds' rule", () => {
  assert.equal(rollBerserkDuration(() => 0), 1);
  assert.equal(rollBerserkDuration(() => 0.99), 4);
});
