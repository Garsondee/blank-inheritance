// Tier 1 — the personal comm device's pure logic (ideas/entries/phone-app-suite.json).
//
// Everything DOM-shaped lives in design/ui/phone.js and isn't unit tested
// the same way the rest of this project's UI chrome isn't — this file
// covers the handful of pieces that are genuinely logic: the Resonance
// band lookup, dice, the staggered-alert delay generator, the fortune
// picker, and the pet's tiny state machine.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  RESONANCE_BANDS,
  resonanceBand,
  rollDice,
  staggeredAlertDelays,
  drawFortune,
  petMood,
  feedPet,
  playWithPet,
  decayPet
} from "../module/blank-inheritance/scripts/core/phone.mjs";

test("the Resonance bands are contiguous across the whole 0-100 range", () => {
  // If a future edit leaves a gap, resonanceBand() throws for any value in
  // it rather than silently returning the wrong band — this pins the
  // precondition that makes that safe.
  const sorted = [...RESONANCE_BANDS].sort((a, b) => a.min - b.min);
  assert.equal(sorted[0].min, 0);
  assert.equal(sorted.at(-1).max, 100);
  for (let i = 1; i < sorted.length; i++) {
    assert.equal(sorted[i].min, sorted[i - 1].max + 1, `gap/overlap between ${sorted[i - 1].name} and ${sorted[i].name}`);
  }
});

test("resonanceBand looks up the real campaign bands, clamped to 0-100", () => {
  assert.equal(resonanceBand(0).id, "dead-weight");
  assert.equal(resonanceBand(39).id, "dead-weight");
  assert.equal(resonanceBand(40).id, "nominal");
  assert.equal(resonanceBand(64).id, "nominal");
  assert.equal(resonanceBand(65).id, "harmonised");
  assert.equal(resonanceBand(84).id, "harmonised");
  assert.equal(resonanceBand(85).id, "absolute");
  assert.equal(resonanceBand(100).id, "absolute");
  assert.equal(resonanceBand(-5).id, "dead-weight", "below 0 clamps rather than throwing");
  assert.equal(resonanceBand(140).id, "absolute", "above 100 clamps rather than throwing");
});

test("rollDice produces the right count of rolls in range, and sums them plus the bonus", () => {
  let call = 0;
  const scripted = [0, 0.999999, 0.5];
  const random = () => scripted[call++];
  const r = rollDice(6, 3, 2, random);
  assert.deepEqual(r.rolls, [1, 6, 4]);
  assert.equal(r.total, 1 + 6 + 4 + 2);
  assert.equal(r.sides, 6);
  assert.equal(r.count, 3);
});

test("rollDice rejects nonsense die sizes and counts", () => {
  assert.throws(() => rollDice(1, 1), /bad die size/);
  assert.throws(() => rollDice(20, 0), /bad die count/);
});

test("staggeredAlertDelays returns one delay per recipient, sorted, never identical", () => {
  const delays = staggeredAlertDelays(6, { minMs: 0, maxMs: 100, random: () => 0.5 });
  assert.equal(delays.length, 6);
  for (let i = 1; i < delays.length; i++) {
    assert.ok(delays[i] > delays[i - 1], "two recipients must not appear to learn at the same instant");
  }
  // Every value should still be within (or, after de-dup nudging, only
  // slightly past) the requested window.
  assert.ok(delays[0] >= 0);
  assert.ok(delays.at(-1) <= 100 + delays.length, "de-dup nudging should only push values a few ms past the ceiling");
});

test("drawFortune honours weights and never returns metadata the UI would need to hide", () => {
  const pool = [
    { text: "A dull day.", weight: 9 },
    { text: "The thing you are looking for is closer than you think.", real: true, weight: 1 }
  ];
  assert.equal(drawFortune(pool, () => 0).text, "A dull day.");
  assert.equal(drawFortune(pool, () => 0.999).text, "The thing you are looking for is closer than you think.");
  assert.throws(() => drawFortune([]), /empty/);
});

test("pet mood is derived from the two meters, never stored separately", () => {
  assert.equal(petMood({ fed: 90, played: 90 }), "delighted");
  assert.equal(petMood({ fed: 50, played: 50 }), "content");
  assert.equal(petMood({ fed: 20, played: 20 }), "restless");
  assert.equal(petMood({ fed: 0, played: 0 }), "sulking");
});

test("feeding, playing and decay clamp to 0-100 and never mutate the input", () => {
  const start = Object.freeze({ fed: 90, played: 10 });
  const fed = feedPet(start, 30);
  assert.equal(fed.fed, 100, "feeding must clamp at 100, not overflow");
  assert.equal(start.fed, 90, "the original state must not be mutated");

  const played = playWithPet({ fed: 10, played: 5 }, 30);
  assert.equal(played.played, 35);
  assert.equal(played.fed, 10, "playing must not touch the fed meter");

  const decayed = decayPet({ fed: 3, played: 0 }, 10);
  assert.equal(decayed.fed, 0, "decay must clamp at 0, not go negative");
  assert.equal(decayed.played, 0);
});
