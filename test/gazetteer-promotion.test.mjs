// Which promoted location a draft item has become, browser side.
//
// The claim: tools/gazetteer/core/promotion.mjs's resolvePromotedLocation
// finds an item's promoted entity by locationRef, falls back to
// sourceLocalId when locationRef is absent, and returns null rather than
// guessing when neither matches.
//
// Why it matters: this is the whole fix for a real bug Ingram hit live --
// four locations were written in full and promoted, he refreshed the
// Gazetteer, clicked a building, and the inspector still showed only his
// rough draft note. The handoff document (server-side) had already been
// fixed to read the promoted entity instead of the draft item; nothing in
// the live browser UI had, because nothing client-side had a way to even
// ask "has this been promoted, and to what."
//
// Pure module, no server: test/gazetteer/test_server.py's own
// test_api_locations_carries_enough_for_the_inspector_to_show_written_lore
// is the check that /api/locations actually serves the shape this expects.

import { test } from "node:test";
import assert from "node:assert/strict";

import { resolvePromotedLocation, depthSubject } from
  "../tools/gazetteer/core/promotion.mjs";

const ITEM = { localId: "item-1", locationRef: "the-rock" };
const LOCATIONS = [
  { id: "the-rock", sourceLocalId: "item-1", lore: { summary: "written" } },
  { id: "other-place", sourceLocalId: "item-9" },
];

test("resolves by locationRef when the item carries the stamp", () => {
  assert.equal(resolvePromotedLocation(ITEM, LOCATIONS).id, "the-rock");
});

test("falls back to sourceLocalId when locationRef is absent", () => {
  // The shape of a location promoted before the locationRef stamp existed --
  // Deep Storage and the hospital, in practice, until re-promoted.
  const itemWithoutStamp = { localId: "item-1" };
  assert.equal(resolvePromotedLocation(itemWithoutStamp, LOCATIONS).id, "the-rock");
});

test("locationRef wins over a coincidental sourceLocalId match elsewhere", () => {
  const conflicting = [
    { id: "wrong-one", sourceLocalId: "item-1" },
    { id: "right-one", sourceLocalId: "item-2" },
  ];
  const item = { localId: "item-1", locationRef: "right-one" };
  assert.equal(resolvePromotedLocation(item, conflicting).id, "right-one");
});

test("an item that was never promoted resolves to null, not a guess", () => {
  const neverPromoted = { localId: "item-404" };
  assert.equal(resolvePromotedLocation(neverPromoted, LOCATIONS), null);
});

test("works against a Map keyed by id, not just an array", () => {
  const asMap = new Map(LOCATIONS.map((loc) => [loc.id, loc]));
  assert.equal(resolvePromotedLocation(ITEM, asMap).id, "the-rock");
});

test("a missing item or missing locations list never throws", () => {
  assert.equal(resolvePromotedLocation(null, LOCATIONS), null);
  assert.equal(resolvePromotedLocation(ITEM, null), null);
  assert.equal(resolvePromotedLocation(ITEM, []), null);
});

test("depthSubject prefers the promoted location over the draft item", () => {
  assert.equal(depthSubject(ITEM, LOCATIONS).lore.summary, "written");
});

test("depthSubject falls back to the draft item when nothing is promoted", () => {
  const draft = { localId: "item-404", note: "still just a note" };
  assert.equal(depthSubject(draft, LOCATIONS), draft);
});
