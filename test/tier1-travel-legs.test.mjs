// Tier 1 — travelLegsFor(): which journeys a cut between two scene edges runs.
//
// Ingram, 2026-09-22, on being shown that the map ritual drove a single shared
// marker: "That's great when the party is together, not great when the party
// splits up."
//
// The gap went deeper than the marker. A `position` carried one `locationRef`,
// so a `split` edge could say THAT the party had divided but never WHERE each
// half was — which meant the map had nothing to draw a second journey with.
// `position.groups` fixes the data; this function turns it into legs, and
// foundry/travel.mjs animates one marker per leg, concurrently.

import { test } from "node:test";
import assert from "node:assert/strict";
import { needsTravel, travelLegsFor } from "../module/blank-inheritance/scripts/core/travel-trigger.mjs";

const at = (locationRef, state = "together", groups) => ({ locationRef, state, ...(groups ? { groups } : {}) });

test("together -> together is one leg, exactly as before", () => {
  assert.deepEqual(travelLegsFor(at("gate"), at("hall")), [
    { groupId: "party", label: null, from: "gate", to: "hall" }
  ]);
});

test("the same place is no leg at all -- a cut within one location is not a journey", () => {
  assert.deepEqual(travelLegsFor(at("hall"), at("hall")), []);
});

test("`scattered` on either edge draws nothing -- that is the campaign's own off-map opening", () => {
  assert.deepEqual(travelLegsFor(at(null, "scattered"), at("gate")), []);
  assert.deepEqual(travelLegsFor(at("gate"), at(null, "scattered")), []);
});

test("together -> split: the party divides, one leg per destination group, all from one place", () => {
  const legs = travelLegsFor(
    at("yard"),
    at(null, "split", [
      { id: "tram-party", label: "On the tram", locationRef: "island-platforms" },
      { id: "stayed", label: "Stayed at the yard", locationRef: "the-drain-head" }
    ])
  );
  assert.equal(legs.length, 2);
  assert.deepEqual(legs.map((l) => l.from), ["yard", "yard"]);
  assert.deepEqual(legs.map((l) => l.to), ["island-platforms", "the-drain-head"]);
  assert.deepEqual(legs.map((l) => l.groupId), ["tram-party", "stayed"]);
  assert.equal(legs[0].label, "On the tram", "the label reaches the marker, because the table reads it");
});

test("split -> together: the party reconverges, one leg per origin group", () => {
  const legs = travelLegsFor(
    at(null, "split", [
      { id: "tram-party", locationRef: "island-platforms" },
      { id: "stayed", locationRef: "the-drain-head" }
    ]),
    at("long-hall")
  );
  assert.equal(legs.length, 2);
  assert.deepEqual(legs.map((l) => l.to), ["long-hall", "long-hall"]);
  assert.deepEqual(legs.map((l) => l.from), ["island-platforms", "the-drain-head"]);
});

test("split -> split: groups are matched by id, so a travelling group keeps one marker", () => {
  const legs = travelLegsFor(
    at(null, "split", [
      { id: "a", locationRef: "gate" },
      { id: "b", locationRef: "yard" }
    ]),
    at(null, "split", [
      { id: "a", locationRef: "hall" },
      { id: "b", locationRef: "sea-wall" }
    ])
  );
  assert.deepEqual(legs, [
    { groupId: "a", label: null, from: "gate", to: "hall" },
    { groupId: "b", label: null, from: "yard", to: "sea-wall" }
  ]);
});

test("a group that only exists on one side still arrives somewhere rather than being abandoned mid-map", () => {
  const legs = travelLegsFor(
    at("yard", "split", [{ id: "a", locationRef: "gate" }, { id: "gone", locationRef: "drain" }]),
    at("hall", "split", [{ id: "a", locationRef: "hall" }])
  );
  const gone = legs.find((l) => l.groupId === "gone");
  assert.ok(gone, "a group present at the start and absent at the end must still be moved");
  assert.equal(gone.to, "hall", "it falls back to the whole-party destination");
});

test("a group whose own locationRef is missing falls back to the whole-party ref rather than vanishing", () => {
  const legs = travelLegsFor(at("yard"), at("hall", "split", [{ id: "a", locationRef: null }]));
  assert.deepEqual(legs, [{ groupId: "a", label: null, from: "yard", to: "hall" }]);
});

test("a group that does not actually move produces no leg, even inside a split", () => {
  const legs = travelLegsFor(
    at(null, "split", [{ id: "moved", locationRef: "gate" }, { id: "stayed", locationRef: "yard" }]),
    at(null, "split", [{ id: "moved", locationRef: "hall" }, { id: "stayed", locationRef: "yard" }])
  );
  assert.deepEqual(legs.map((l) => l.groupId), ["moved"], "standing still is not a journey to animate");
});

test("travelLegsFor agrees with needsTravel on the simple case -- one rule, not two", () => {
  for (const [from, to] of [["a", "b"], ["a", "a"], [null, "b"], ["a", null], [null, null]]) {
    assert.equal(
      travelLegsFor(at(from), at(to)).length > 0,
      needsTravel(from, to),
      `travelLegsFor and needsTravel disagree about ${from} -> ${to}`
    );
  }
});

test("missing positions are survivable -- no legs, no throw", () => {
  assert.deepEqual(travelLegsFor(null, at("hall")), []);
  assert.deepEqual(travelLegsFor(at("gate"), undefined), []);
});
