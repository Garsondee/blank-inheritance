// Tier 1 — pure logic unit tests for the equipment locker (core/equipment.mjs).
// Milliseconds, no Foundry, no network. See core/equipment.mjs's own header
// for why a "grant" is shaped the way it is.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  findItem,
  takenCount,
  remainingStock,
  grantsFor,
  spentBy,
  budgetFor,
  canGrant,
  projectCatalogue,
  logEntries,
  grantsForScene,
  catalogueItemToSf2eItemData
} from "../module/blank-inheritance/scripts/core/equipment.mjs";

const CATALOGUE = {
  id: "test-catalogue",
  budget: { credits: 150 },
  items: [
    { id: "sidearm", name: "Sidearm", price: 30, stock: "unlimited" },
    { id: "long-arm", name: "Long Arm", price: 45 }, // stock omitted -- must default to unlimited
    { id: "prototype-rig", name: "Prototype Rig", price: 10, stock: 1 }, // unique
    { id: "medpatch", name: "Medpatch", price: 30, stock: 3 }
  ]
};

test("findItem: looks up by id, null when absent", () => {
  assert.equal(findItem(CATALOGUE, "sidearm").name, "Sidearm");
  assert.equal(findItem(CATALOGUE, "nope"), null);
});

test("remainingStock: unlimited (explicit or omitted) is always Infinity regardless of takers", () => {
  const grants = [
    { userId: "u1", itemId: "sidearm", quantity: 5, unitPrice: 30 },
    { userId: "u2", itemId: "long-arm", quantity: 9, unitPrice: 45 }
  ];
  assert.equal(remainingStock(findItem(CATALOGUE, "sidearm"), grants), Infinity);
  assert.equal(remainingStock(findItem(CATALOGUE, "long-arm"), grants), Infinity);
});

test("remainingStock: a finite stock counts down across every player combined, never below zero", () => {
  const item = findItem(CATALOGUE, "medpatch");
  assert.equal(remainingStock(item, []), 3);
  assert.equal(remainingStock(item, [{ userId: "u1", itemId: "medpatch", quantity: 2, unitPrice: 30 }]), 1);
  // Two players taking 2 each (4 total) against a stock of 3 -- must clamp at 0, not go negative.
  const overdrawn = [
    { userId: "u1", itemId: "medpatch", quantity: 2, unitPrice: 30 },
    { userId: "u2", itemId: "medpatch", quantity: 2, unitPrice: 30 }
  ];
  assert.equal(remainingStock(item, overdrawn), 0);
});

test("remainingStock: stock 1 is the unique case -- one taker exhausts it for everyone else", () => {
  const item = findItem(CATALOGUE, "prototype-rig");
  assert.equal(remainingStock(item, []), 1);
  assert.equal(remainingStock(item, [{ userId: "u1", itemId: "prototype-rig", quantity: 1, unitPrice: 10 }]), 0);
});

test("takenCount and remainingStock ignore revoked grants entirely", () => {
  const item = findItem(CATALOGUE, "prototype-rig");
  const grants = [{ userId: "u1", itemId: "prototype-rig", quantity: 1, unitPrice: 10, revoked: true }];
  assert.equal(takenCount("prototype-rig", grants), 0);
  assert.equal(remainingStock(item, grants), 1, "a revoked take must free the unique item back up");
});

test("grantsFor and spentBy: one player's own picks and running total, unaffected by others'", () => {
  const grants = [
    { userId: "u1", itemId: "sidearm", quantity: 1, unitPrice: 30 },
    { userId: "u1", itemId: "medpatch", quantity: 2, unitPrice: 30 },
    { userId: "u2", itemId: "long-arm", quantity: 1, unitPrice: 45 }
  ];
  assert.equal(grantsFor("u1", grants).length, 2);
  assert.equal(spentBy("u1", grants), 30 + 2 * 30);
  assert.equal(spentBy("u2", grants), 45);
  assert.equal(spentBy("u3", grants), 0, "a player with no grants has spent nothing, not undefined/NaN");
});

test("budgetFor: total/spent/remaining/over, same shape as commitments.mjs#budgetFor", () => {
  const grants = [{ userId: "u1", itemId: "sidearm", quantity: 1, unitPrice: 30 }];
  const budget = budgetFor("u1", CATALOGUE, grants);
  assert.equal(budget.total, 150);
  assert.equal(budget.spent, 30);
  assert.equal(budget.remaining, 120);
  assert.equal(budget.over, false);
});

test("budgetFor: remaining floors at 0 and over flips true past the cap (a forced grant can exceed it)", () => {
  const grants = [{ userId: "u1", itemId: "sidearm", quantity: 6, unitPrice: 30 }]; // 180cr, over the 150 budget
  const budget = budgetFor("u1", CATALOGUE, grants);
  assert.equal(budget.remaining, 0);
  assert.equal(budget.over, true);
});

test("canGrant: ordinary case within budget and stock is legal", () => {
  const result = canGrant({ item: findItem(CATALOGUE, "sidearm"), userId: "u1", catalogue: CATALOGUE, grants: [] });
  assert.deepEqual(result, { ok: true, reason: null });
});

test("canGrant: rejects an unknown item", () => {
  assert.equal(canGrant({ item: null, userId: "u1", catalogue: CATALOGUE, grants: [] }).reason, "no-such-item");
});

test("canGrant: rejects taking more than remains on a limited item", () => {
  const grants = [{ userId: "u1", itemId: "prototype-rig", quantity: 1, unitPrice: 10 }];
  const result = canGrant({ item: findItem(CATALOGUE, "prototype-rig"), userId: "u2", catalogue: CATALOGUE, grants });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "out-of-stock");
});

test("canGrant: rejects a take that would exceed the player's own remaining budget", () => {
  const grants = [{ userId: "u1", itemId: "long-arm", quantity: 3, unitPrice: 45 }]; // 135cr spent, 15 left
  const result = canGrant({ item: findItem(CATALOGUE, "sidearm"), userId: "u1", catalogue: CATALOGUE, grants }); // costs 30
  assert.equal(result.ok, false);
  assert.equal(result.reason, "over-budget");
});

test("canGrant: force bypasses the budget check but never the stock check", () => {
  const overBudgetGrants = [{ userId: "u1", itemId: "long-arm", quantity: 3, unitPrice: 45 }];
  const forcedOverBudget = canGrant({
    item: findItem(CATALOGUE, "sidearm"),
    userId: "u1",
    catalogue: CATALOGUE,
    grants: overBudgetGrants,
    force: true
  });
  assert.equal(forcedOverBudget.ok, true, "force must let a GM exceed budget");

  const outOfStockGrants = [{ userId: "u2", itemId: "prototype-rig", quantity: 1, unitPrice: 10 }];
  const forcedOutOfStock = canGrant({
    item: findItem(CATALOGUE, "prototype-rig"),
    userId: "u1",
    catalogue: CATALOGUE,
    grants: outOfStockGrants,
    force: true
  });
  assert.equal(forcedOutOfStock.ok, false, "force must NOT manufacture stock that does not exist");
  assert.equal(forcedOutOfStock.reason, "out-of-stock");
});

test("canGrant: rejects a zero or fractional quantity", () => {
  assert.equal(canGrant({ item: findItem(CATALOGUE, "sidearm"), userId: "u1", catalogue: CATALOGUE, quantity: 0 }).reason, "bad-quantity");
  assert.equal(canGrant({ item: findItem(CATALOGUE, "sidearm"), userId: "u1", catalogue: CATALOGUE, quantity: 1.5 }).reason, "bad-quantity");
});

test("projectCatalogue: annotates every item with remaining stock, MY quantity, and overall availability", () => {
  const grants = [
    { userId: "u1", itemId: "prototype-rig", quantity: 1, unitPrice: 10 },
    { userId: "u2", itemId: "sidearm", quantity: 1, unitPrice: 30 }
  ];
  const projection = projectCatalogue({ catalogue: CATALOGUE, grants, userId: "u2" });

  const rig = projection.items.find((i) => i.id === "prototype-rig");
  assert.equal(rig.remaining, 0, "taken by someone else -- none left");
  assert.equal(rig.myQuantity, 0, "u2 did not take it, even though someone did");
  assert.equal(rig.available, false);

  const sidearm = projection.items.find((i) => i.id === "sidearm");
  assert.equal(sidearm.myQuantity, 1, "u2's own pick");
  assert.equal(sidearm.takenByMe, true);
  assert.equal(sidearm.unlimited, true);
  assert.equal(sidearm.remaining, null, "unlimited is surfaced as null, not Infinity, so it survives JSON/settings round-trips");

  assert.equal(projection.budget.spent, 30);
});

test("logEntries: resolves item names, newest first, and drops revoked rows", () => {
  const grants = [
    { userId: "u1", itemId: "sidearm", quantity: 1, unitPrice: 30, timestamp: 100 },
    { userId: "u2", itemId: "medpatch", quantity: 1, unitPrice: 30, timestamp: 300 },
    { userId: "u1", itemId: "long-arm", quantity: 1, unitPrice: 45, timestamp: 200, revoked: true }
  ];
  const log = logEntries(CATALOGUE, grants);
  assert.equal(log.length, 2, "the revoked long-arm grant must not appear");
  assert.deepEqual(log.map((g) => g.itemId), ["medpatch", "sidearm"], "newest timestamp first");
  assert.equal(log[0].itemName, "Medpatch");
});

test("logEntries: tags kind:\"bonus\" grants with isBonus, and leaves an ordinary issue false", () => {
  const grants = [
    { userId: "u1", itemId: "sidearm", quantity: 1, unitPrice: 30, timestamp: 100, kind: "issue" },
    { userId: "u1", itemId: "medpatch", quantity: 1, unitPrice: 30, timestamp: 200, kind: "bonus" }
  ];
  const log = logEntries(CATALOGUE, grants);
  assert.equal(log.find((g) => g.itemId === "sidearm").isBonus, false);
  assert.equal(log.find((g) => g.itemId === "medpatch").isBonus, true);
});

test("grantsForScene (#178): only grants tagged with that scene, oldest first, empty for no scene name", () => {
  const grants = [
    { userId: "u1", itemId: "sidearm", quantity: 1, unitPrice: 30, timestamp: 200, scene: "Kit Issue" },
    { userId: "u2", itemId: "medpatch", quantity: 1, unitPrice: 30, timestamp: 100, scene: "Kit Issue" },
    { userId: "u1", itemId: "long-arm", quantity: 1, unitPrice: 45, timestamp: 150, scene: "The Errand" },
    { userId: "u1", itemId: "long-arm", quantity: 1, unitPrice: 45, timestamp: 50 } // predates the `scene` field entirely
  ];
  const kitIssue = grantsForScene("Kit Issue", CATALOGUE, grants);
  assert.deepEqual(kitIssue.map((g) => g.itemId), ["medpatch", "sidearm"], "oldest first, and only this scene's own grants");

  assert.deepEqual(grantsForScene(null, CATALOGUE, grants), [], "no scene name -- nothing to match, not everything");
  assert.deepEqual(grantsForScene("A Scene Nobody Granted Anything In", CATALOGUE, grants), []);
});

test("catalogueItemToSf2eItemData: maps category to the real sf2e Item type", () => {
  assert.equal(catalogueItemToSf2eItemData({ id: "a", name: "A", category: "weapon", price: 1 }).type, "weapon");
  assert.equal(catalogueItemToSf2eItemData({ id: "b", name: "B", category: "armor", price: 1 }).type, "armor");
  assert.equal(catalogueItemToSf2eItemData({ id: "c", name: "C", category: "gear", price: 1 }).type, "equipment");
  assert.equal(catalogueItemToSf2eItemData({ id: "d", name: "D", category: "consumable", price: 1 }).type, "consumable");
  assert.equal(catalogueItemToSf2eItemData({ id: "e", name: "E", category: "unknown-future-category", price: 1 }).type, "equipment");
});

test("catalogueItemToSf2eItemData: price lands in sf2e's own `credits` denomination, not gp", () => {
  const data = catalogueItemToSf2eItemData({ id: "sidearm", name: "Sidearm", category: "weapon", price: 30 });
  assert.deepEqual(data.system.price.value, { credits: 30 });
});

test("catalogueItemToSf2eItemData: mechanics and flavorNote fold into the description, sensible defaults otherwise", () => {
  const full = catalogueItemToSf2eItemData({
    id: "sidearm", name: "Sidearm", category: "weapon", price: 30, level: 2, bulk: 1,
    traits: ["sonic"], mechanics: "1d6 sonic.", flavorNote: "Standard issue."
  });
  assert.equal(full.system.level.value, 2);
  assert.equal(full.system.bulk.value, 1);
  assert.deepEqual(full.system.traits.value, ["sonic"]);
  assert.equal(full.system.description.value, "1d6 sonic. Standard issue.");
  assert.equal(full.system.quantity, 1);

  const minimal = catalogueItemToSf2eItemData({ id: "x", name: "X", category: "gear", price: 0 });
  assert.equal(minimal.system.level.value, 0);
  assert.equal(minimal.system.bulk.value, 0);
  assert.deepEqual(minimal.system.traits.value, []);
  assert.equal(minimal.system.description.value, "");
});
