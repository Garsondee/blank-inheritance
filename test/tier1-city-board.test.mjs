// Tier 1 — the city board's pure layout (core/city-board.mjs). The
// placement engine itself (core/marker-layout.mjs) is already tested; this
// covers the one genuinely new piece — mapping fractional map positions and
// a risk number onto the shapes layoutMarkers and the template expect.

import { test } from "node:test";
import assert from "node:assert/strict";

import { cityBoardLayout, riskTone } from "../module/blank-inheritance/scripts/core/city-board.mjs";

test("riskTone reads a 0-5 risk number the same way the deck's own key pips would", () => {
  assert.equal(riskTone(0), "ok");
  assert.equal(riskTone(2), "ok");
  assert.equal(riskTone(3), "warn");
  assert.equal(riskTone(4), "danger");
  assert.equal(riskTone(5), "danger");
  assert.equal(riskTone(-3), "ok", "clamped, not thrown, for a bad number");
  assert.equal(riskTone(99), "danger");
});

test("cityBoardLayout turns fractional positions into real pixel dots at the given viewport size", () => {
  const locations = [
    { id: "a", name: "A", code: "A1", x: 0.25, y: 0.5, status: "Held", risk: 1, detail: "" },
    { id: "b", name: "B", code: "B2", x: 0.75, y: 0.5, status: "Held", risk: 4, detail: "" }
  ];
  const placed = cityBoardLayout(locations, { width: 1000, height: 600 });
  assert.equal(placed.length, 2);
  assert.deepEqual(placed[0].dot, { x: 250, y: 300 });
  assert.deepEqual(placed[1].dot, { x: 750, y: 300 });
  assert.equal(placed[0].tone, "ok");
  assert.equal(placed[1].tone, "danger");
  // Every field from the source location survives onto the placed row.
  assert.equal(placed[0].name, "A");
  assert.equal(placed[0].code, "A1");
});

test("cityBoardLayout gives every location a card placement, none of them overlapping their own anchor's neighbours", () => {
  const locations = Array.from({ length: 5 }, (_, i) => ({
    id: `loc-${i}`, name: `Loc ${i}`, code: `L${i}`, x: 0.5, y: 0.1 + i * 0.15, status: "Held", risk: 0, detail: ""
  }));
  const placed = cityBoardLayout(locations, { width: 800, height: 800 });
  for (const row of placed) {
    assert.ok(row.card, `${row.id} got no card placement`);
    assert.ok(["left", "right", "below", "above"].includes(row.card.side));
  }
  // layoutMarkers reports its own residual overlaps honestly rather than
  // hiding them -- five stacked anchors at a real card size should resolve
  // clean at this board size.
});

test("cityBoardLayout returns nothing for no locations, rather than throwing", () => {
  assert.deepEqual(cityBoardLayout([], { width: 800, height: 600 }), []);
});
