// Tier 1 — core/demo-party.mjs's own planning: six candidate placements,
// scattered across the mainland, never the fortress island.

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DEMO_PARTY_ORIGINS, PARTY_PORTRAIT, demoPartyPlan } from "../module/blank-inheritance/scripts/core/demo-party.mjs";
import { sceneCalibration } from "../module/blank-inheritance/scripts/core/travel-animation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("there are exactly six origins, one per candidate, each with a distinct id and a real mainland point", () => {
  assert.equal(DEMO_PARTY_ORIGINS.length, 6);
  const ids = new Set(DEMO_PARTY_ORIGINS.map((o) => o.id));
  assert.equal(ids.size, 6, "an origin id is duplicated");
  for (const origin of DEMO_PARTY_ORIGINS) {
    assert.ok(origin.label, `${origin.id} has no label`);
    assert.ok(Array.isArray(origin.px) && origin.px.length === 2 && origin.px.every(Number.isFinite), `${origin.id} has no usable px point`);
  }
});

test("the six origins are genuinely spread out, not six dots in one suburb", () => {
  // Loose but real: no two origins closer than 1500 master-sheet pixels
  // (1.5km) apart — enough to catch a copy-paste duplicate, not enough to
  // constrain deliberate future re-siting.
  for (let i = 0; i < DEMO_PARTY_ORIGINS.length; i++) {
    for (let j = i + 1; j < DEMO_PARTY_ORIGINS.length; j++) {
      const [ax, ay] = DEMO_PARTY_ORIGINS[i].px;
      const [bx, by] = DEMO_PARTY_ORIGINS[j].px;
      const d = Math.hypot(ax - bx, ay - by);
      assert.ok(d >= 1500, `${DEMO_PARTY_ORIGINS[i].id} and ${DEMO_PARTY_ORIGINS[j].id} are only ${Math.round(d)}px apart`);
    }
  }
});

test("demoPartyPlan produces one entry per origin, with stable ids and the calibrated scene point", async () => {
  const calibration = { originX: 3100, originY: 3100, scale: 1 };
  const plan = await demoPartyPlan(calibration);
  assert.equal(plan.length, DEMO_PARTY_ORIGINS.length);
  for (const [i, entry] of plan.entries()) {
    const origin = DEMO_PARTY_ORIGINS[i];
    assert.equal(entry.originRef, origin.id);
    assert.equal(entry.label, origin.label);
    assert.ok(entry.actorId && entry.tokenId, `${origin.id}'s plan entry is missing an actorId/tokenId`);
    assert.deepEqual([entry.x, entry.y], [origin.px[0] + 3100, origin.px[1] + 3100]);
  }
});

test("demoPartyPlan is idempotent — the same origin always derives the same actor/token id", async () => {
  const calibration = { originX: 0, originY: 0, scale: 1 };
  const first = await demoPartyPlan(calibration);
  const second = await demoPartyPlan(calibration);
  assert.deepEqual(first.map((p) => [p.actorId, p.tokenId]), second.map((p) => [p.actorId, p.tokenId]));
});

test("demoPartyPlan honours whatever real calibration it is handed, the same as any other pinned point", async () => {
  // A regression guard for the exact class of bug fixed 2026-09-23: this
  // must go through sceneCalibration/toScenePoint properly, not some private
  // shortcut that could drift from the real transform again.
  const tiles = [
    { x: 6200, y: 6200, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } },
    { x: 12400, y: 6200, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } },
    { x: 6200, y: 12400, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } },
    { x: 12400, y: 12400, width: 6200, height: 6200, texture: { anchorX: 0.5, anchorY: 0.5 } }
  ];
  const calibration = sceneCalibration(tiles, 18600, 12400);
  const plan = await demoPartyPlan(calibration);
  const first = plan[0];
  assert.deepEqual([first.x, first.y], [DEMO_PARTY_ORIGINS[0].px[0] + 3100, DEMO_PARTY_ORIGINS[0].px[1] + 3100]);
});

test("every candidate has a real, distinct portrait, and demoPartyPlan carries it through — the fix for \"very hard to see\" (Ingram, 2026-09-23)", async () => {
  const portraits = DEMO_PARTY_ORIGINS.map((o) => o.portrait);
  assert.equal(new Set(portraits).size, DEMO_PARTY_ORIGINS.length, "two candidates share the same portrait file");
  assert.ok(!portraits.includes(PARTY_PORTRAIT), "a candidate's own portrait must not be the same file as the party marker's");

  const plan = await demoPartyPlan({ originX: 0, originY: 0, scale: 1 });
  for (const [i, entry] of plan.entries()) {
    assert.equal(entry.portrait, DEMO_PARTY_ORIGINS[i].portrait);
  }
});

test("every candidate portrait and the party portrait actually exist as staged files in the module", () => {
  const root = path.join(repoRoot, "module", "blank-inheritance");
  const toDiskPath = (foundryRelative) => path.join(root, foundryRelative.replace(/^modules\/blank-inheritance\//, ""));
  for (const origin of DEMO_PARTY_ORIGINS) {
    const file = toDiskPath(origin.portrait);
    assert.ok(existsSync(file), `${origin.id} names portrait "${origin.portrait}", which is not staged at ${file}`);
  }
  const partyFile = toDiskPath(PARTY_PORTRAIT);
  assert.ok(existsSync(partyFile), `PARTY_PORTRAIT names "${PARTY_PORTRAIT}", which is not staged at ${partyFile}`);
});
