// Tier 1 — pure shaping for the Director's Party tab
// (module/blank-inheritance/scripts/core/party-overview.mjs). No Foundry.

import { test } from "node:test";
import assert from "node:assert/strict";

import { partyRow, partyOverview } from "../module/blank-inheritance/scripts/core/party-overview.mjs";

test("partyRow carries the glance-numbers a GM actually needs, defaulting AC/perception rather than throwing on a sparse member", () => {
  const row = partyRow({ id: "a1", name: "Navasi", hp: { value: 16, max: 16 } });
  assert.equal(row.name, "Navasi");
  assert.equal(row.ac, 10, "an actor snapshot missing AC still produces a row, at the sf2e base DC");
  assert.equal(row.hp.tier, "ok");
});

test("partyOverview flags anyHurt/anyCritical/anyDown correctly across a mixed roster", () => {
  const overview = partyOverview([
    { id: "a1", name: "Fine", hp: { value: 16, max: 16 } },
    { id: "a2", name: "Hurt", hp: { value: 7, max: 16 } },
    { id: "a3", name: "Down", hp: { value: 0, max: 16 } }
  ]);
  assert.equal(overview.summary.count, 3);
  assert.equal(overview.summary.anyHurt, true);
  assert.equal(overview.summary.anyCritical, true, "the down member also counts toward anyCritical");
  assert.equal(overview.summary.anyDown, true);
});

test("partyOverview reads all-fine correctly when nobody is hurt", () => {
  const overview = partyOverview([{ id: "a1", name: "Fine", hp: { value: 16, max: 16 } }]);
  assert.equal(overview.summary.anyHurt, false);
  assert.equal(overview.summary.anyCritical, false);
  assert.equal(overview.summary.anyDown, false);
});

test("partyOverview on an empty party (nobody assigned to game.actors.party yet) returns a valid, empty shape rather than throwing", () => {
  const overview = partyOverview([]);
  assert.deepEqual(overview.rows, []);
  assert.equal(overview.summary.count, 0);
  assert.equal(overview.summary.anyDown, false);
});

test("partyRow preserves a numbered condition's value", () => {
  const row = partyRow({ id: "a1", name: "Stunned Pilot", hp: { value: 10, max: 16 }, conditions: [{ slug: "stunned", label: "Stunned", value: 2 }] });
  assert.deepEqual(row.conditions, [{ slug: "stunned", label: "Stunned", value: 2 }]);
});
