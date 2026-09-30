// Tier 1 — canon/decisions/D050.md's three systems, pure half:
// the spectrum banner (core/scene-spectrum.mjs), the event deck
// (core/event-deck.mjs) and a night's rest (core/rest.mjs).
// The Scene Runner's wiring is pinned in tier3-rest-and-deck-contract.test.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";

import { SPECTRUM_IDS, spectrumOf } from "../module/blank-inheritance/scripts/core/scene-spectrum.mjs";
import {
  deckIdFor,
  deckView,
  drawEvent,
  emptyDeckState,
  normalizeEvents,
  putBack,
  remaining,
  witness
} from "../module/blank-inheritance/scripts/core/event-deck.mjs";
import { REST_GRADE_IDS, restHealing, restOf } from "../module/blank-inheritance/scripts/core/rest.mjs";

/* ------------------------------------------------------------------ */
/*  The banner                                                         */
/* ------------------------------------------------------------------ */

test("three bands, and a scene that says nothing is a story scene", () => {
  assert.deepEqual(SPECTRUM_IDS, ["story", "mixed", "downtime"]);
  assert.equal(spectrumOf({}).id, "story", "every scene written before D050 is a story scene");
  assert.equal(spectrumOf({ spectrum: "downtime" }).id, "downtime");
  assert.equal(spectrumOf({ spectrum: "nonsense" }).id, "story");
  assert.equal(spectrumOf(null).id, "story");
});

/* ------------------------------------------------------------------ */
/*  The deck                                                           */
/* ------------------------------------------------------------------ */

const EVENTS = [
  { id: "a", title: "A", text: "one" },
  { id: "b", title: "B", text: "two" },
  { id: "c", title: "C", text: "three" }
];
const first = () => 0; // always the first of what remains

test("each event drawn is unique: nothing on the table is drawn again", () => {
  let state = emptyDeckState();
  const seen = [];
  for (let i = 0; i < 3; i++) {
    const r = drawEvent(EVENTS, state, { random: first });
    seen.push(r.event.id);
    state = r.state;
  }
  assert.deepEqual([...seen].sort(), ["a", "b", "c"]);
  assert.equal(drawEvent(EVENTS, state).event, null, "an empty deck draws nothing rather than repeating");
});

test("an event nobody witnessed goes back and can come up later; a witnessed one never does", () => {
  let { event, state } = drawEvent(EVENTS, emptyDeckState(), { random: first });
  assert.equal(event.id, "a");
  state = putBack(state, "a");
  assert.deepEqual(remaining(EVENTS, state).map((e) => e.id), ["a", "b", "c"], "the lesson nobody saw is back in the deck");

  ({ event, state } = drawEvent(EVENTS, state, { random: first }));
  state = witness(state, event.id);
  assert.ok(!remaining(EVENTS, state).some((e) => e.id === "a"), "once played, gone for good");
  assert.deepEqual(deckView(EVENTS, state), { total: 3, drawn: [], remaining: 2, witnessed: 1, alert: null });
});

test("scenes can share a deck, so what was seen in one is gone from the other", () => {
  assert.equal(deckIdFor({ id: "brief-a" }), "brief-a");
  assert.equal(deckIdFor({ id: "brief-a", deckRef: "bathhouse-regulars" }), "bathhouse-regulars");
});

test("events are made safe: ids unique, junk dropped, a title always there", () => {
  const events = normalizeEvents([{ id: "x", text: "t" }, { id: "x", text: "dupe" }, null, "junk", { text: "no id" }]);
  assert.deepEqual(events.map((e) => e.id), ["x", "event-5"]);
  assert.equal(events[0].title, "x");
  const view = deckView(EVENTS, { drawn: ["b", "gone-from-the-brief"], witnessed: ["c", "c"] });
  assert.deepEqual(view.drawn.map((e) => e.id), ["b"], "an event removed from the brief is not shown");
  assert.equal(view.witnessed, 1);
});

/* ------------------------------------------------------------------ */
/*  The rest                                                           */
/* ------------------------------------------------------------------ */

test("a rest restores a fraction of maximum HP, so it scales with level by construction", () => {
  assert.deepEqual(REST_GRADE_IDS, ["quarter", "half", "three-quarters", "full"]);
  // Level 1 and level 10 characters, both on 1 HP: the same share of each sheet.
  assert.deepEqual(restHealing({ value: 1, max: 16 }, "quarter"), { from: 1, to: 5, gained: 4 });
  assert.deepEqual(restHealing({ value: 1, max: 160 }, "quarter"), { from: 1, to: 41, gained: 40 });
  assert.deepEqual(restHealing({ value: 1, max: 16 }, "half"), { from: 1, to: 9, gained: 8 });
  assert.deepEqual(restHealing({ value: 3, max: 16 }, "three-quarters"), { from: 3, to: 15, gained: 12 });
});

test("the hospital is the one full recovery; no rest goes past maximum or takes anything away", () => {
  assert.deepEqual(restHealing({ value: 2, max: 30 }, "full"), { from: 2, to: 30, gained: 28 });
  assert.deepEqual(restHealing({ value: 29, max: 30 }, "half"), { from: 29, to: 30, gained: 1 });
  assert.deepEqual(restHealing({ value: 30, max: 30 }, "quarter"), { from: 30, to: 30, gained: 0 });
  assert.equal(restHealing({ value: 0, max: 3 }, "quarter").gained, 1, "a rest is never nothing");
  assert.equal(restHealing({ value: 5, max: 10 }, "nap").gained, 0, "an unknown grade heals nothing rather than guessing");
});

test("a brief is a rest only when it says how much it restores", () => {
  assert.equal(restOf({}), null);
  assert.equal(restOf({ rest: { hp: "full" } }).grade.fraction, 1);
  assert.equal(restOf({ rest: { hp: "half", buff: "Temporary HP equal to your level." } }).buff, "Temporary HP equal to your level.");
  assert.equal(restOf({ rest: { hp: "most" } }), null);
});
