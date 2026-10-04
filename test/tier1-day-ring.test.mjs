// Tier 1 — the day ring's model and geometry.
//
// Two things are worth testing here that look like they do not need it.
//
// The CLOCK, because wrapping is where every calendar bug lives: night rolls
// into the next day's morning, and a multi-step advance has to land in the
// same place as the same number of single steps. Off-by-one here would move
// the whole campaign by a quarter and nobody would notice for weeks.
//
// The GEOMETRY, because the ring's arc paths are generated rather than
// hand-drawn, and a template cannot be unit-tested. If ringSlices produces a
// malformed path the SVG renders as nothing at all — no error, no warning,
// just an empty instrument — which is the single most expensive failure mode
// in this whole console to diagnose from a screenshot.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  QUARTERS,
  QUARTER_IDS,
  SLICES_PER_QUARTER,
  advance,
  isNewDay,
  momentKey,
  normalizeMoment,
  quarterAt,
  quarterIndex,
  ringFlare,
  ringNotches,
  ringSlices,
  ringState
} from "../module/blank-inheritance/scripts/core/day-ring.mjs";

/* ------------------------------------------------------------------ */
/*  The shape of a day                                                 */
/* ------------------------------------------------------------------ */

test("the day has exactly four quarters, in the order a day actually happens", () => {
  assert.deepEqual(QUARTER_IDS, ["morning", "afternoon", "evening", "night"]);
  assert.equal(SLICES_PER_QUARTER, 1, "config.json gives four slices across four quarters");
});

test("school occupies the front half of the day and nothing else", () => {
  // config.json's timeEconomy.mandatoryLoad: "School (morning + afternoon
  // only)". The back half being free is what makes it the contested half.
  assert.deepEqual(
    QUARTERS.filter((q) => q.school).map((q) => q.id),
    ["morning", "afternoon"]
  );
});

test("every quarter carries a localisation key, because the ring prints them", () => {
  for (const quarter of QUARTERS) {
    assert.match(quarter.labelKey, /^BLANKINHERITANCE\./, `${quarter.id} has no key`);
  }
});

/* ------------------------------------------------------------------ */
/*  Normalisation: a hand-edited world setting must not break the bar   */
/* ------------------------------------------------------------------ */

test("a malformed moment degrades to the start of the campaign rather than throwing", () => {
  for (const bad of [null, undefined, {}, { day: 0 }, { day: -4 }, { day: "x" }, { quarter: "dusk" }]) {
    const moment = normalizeMoment(bad);
    assert.ok(moment.day >= 1, `day should be at least 1 for ${JSON.stringify(bad)}`);
    assert.ok(QUARTER_IDS.includes(moment.quarter), `quarter should be real for ${JSON.stringify(bad)}`);
  }
});

test("a fractional day is floored, not rounded — day 3.9 is still day 3", () => {
  assert.equal(normalizeMoment({ day: 3.9, quarter: "evening" }).day, 3);
});

/* ------------------------------------------------------------------ */
/*  Advancing                                                          */
/* ------------------------------------------------------------------ */

test("advance walks the day and wraps night into the next morning", () => {
  assert.deepEqual(advance({ day: 1, quarter: "morning" }), { day: 1, quarter: "afternoon" });
  assert.deepEqual(advance({ day: 1, quarter: "afternoon" }), { day: 1, quarter: "evening" });
  assert.deepEqual(advance({ day: 1, quarter: "evening" }), { day: 1, quarter: "night" });
  assert.deepEqual(advance({ day: 1, quarter: "night" }), { day: 2, quarter: "morning" });
});

test("one advance of N lands where N advances of one land", () => {
  // The multi-step path is separate arithmetic (absolute index) from the
  // single-step path, so they can drift apart without either looking wrong.
  for (let steps = 0; steps <= 13; steps++) {
    let stepwise = { day: 2, quarter: "evening" };
    for (let i = 0; i < steps; i++) stepwise = advance(stepwise);
    assert.deepEqual(advance({ day: 2, quarter: "evening" }, steps), stepwise, `diverged at ${steps} steps`);
  }
});

test("advancing a whole number of days keeps the quarter", () => {
  assert.deepEqual(advance({ day: 5, quarter: "evening" }, 4), { day: 6, quarter: "evening" });
  assert.deepEqual(advance({ day: 5, quarter: "evening" }, 8), { day: 7, quarter: "evening" });
});

test("advancing backwards is refused rather than quietly reversed", () => {
  // The ceremony this drives — the transition banner, expiring offers, spent
  // slices — is not reversible, so a caller asking to rewind has a bug.
  assert.throws(() => advance({ day: 2, quarter: "morning" }, -1), /non-negative/);
  assert.throws(() => advance({ day: 2, quarter: "morning" }, 1.5), /non-negative integer/);
});

test("isNewDay is true only when midnight was actually crossed", () => {
  assert.equal(isNewDay({ day: 1, quarter: "evening" }, { day: 1, quarter: "night" }), false);
  assert.equal(isNewDay({ day: 1, quarter: "night" }, { day: 2, quarter: "morning" }), true);
  assert.equal(isNewDay({ day: 1, quarter: "morning" }, { day: 4, quarter: "morning" }), true);
});

test("momentKey is stable and distinguishes every quarter of every day", () => {
  const keys = new Set();
  for (let day = 1; day <= 4; day++) {
    for (const quarter of QUARTER_IDS) keys.add(momentKey({ day, quarter }));
  }
  assert.equal(keys.size, 16, "two different moments collided on one key");
  assert.equal(momentKey({ day: 3, quarter: "night" }), momentKey({ day: 3, quarter: "night" }));
});

test("quarterAt wraps in both directions rather than returning undefined", () => {
  assert.equal(quarterAt(0).id, "morning");
  assert.equal(quarterAt(4).id, "morning");
  assert.equal(quarterAt(-1).id, "night");
});

test("quarterIndex says -1 for a non-quarter instead of pointing at the first one", () => {
  assert.equal(quarterIndex("dusk"), -1);
  assert.equal(quarterIndex("morning"), 0);
});

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

test("ringSlices produces one well-formed annulus sector per quarter", () => {
  const slices = ringSlices({ size: 100, thickness: 18, gapDeg: 5 });
  assert.equal(slices.length, QUARTERS.length);
  for (const slice of slices) {
    // M, arc out, line in, arc back, close. A malformed path renders as
    // nothing at all, silently, which is why this is asserted structurally
    // rather than eyeballed in a browser.
    assert.match(slice.d, /^M [\d.-]+ [\d.-]+ A .+ L [\d.-]+ [\d.-]+ A .+ Z$/, `bad path for ${slice.id}`);
    assert.ok(!/NaN|undefined|Infinity/.test(slice.d), `non-finite coordinate in ${slice.id}: ${slice.d}`);
  }
});

test("every generated coordinate stays inside the viewBox it is drawn against", () => {
  const size = 100;
  for (const slice of ringSlices({ size })) {
    for (const n of slice.d.match(/-?\d+(\.\d+)?/g).map(Number)) {
      assert.ok(n >= -0.01 && n <= size + 0.01, `${slice.id} escapes the viewBox with ${n}`);
    }
  }
});

test("morning starts at twelve o'clock and the day runs clockwise", () => {
  // The only arrangement a table reads without being told. midDeg is measured
  // from twelve, increasing clockwise, so the four midpoints are 45/135/225/315.
  const mids = ringSlices().map((s) => Math.round(s.midDeg));
  assert.deepEqual(mids, [45, 135, 225, 315]);
});

test("a four-quarter ring never needs the large-arc flag", () => {
  // Every sector is 90° minus a gap. If this ever fires, QUARTERS grew and the
  // flag genuinely matters — the failure mode is an arc bulging the wrong way
  // round the circle, which is baffling to debug from the rendered SVG.
  for (const slice of ringSlices()) {
    const flags = [...slice.d.matchAll(/A [\d.]+ [\d.]+ 0 (\d)/g)].map((m) => m[1]);
    assert.deepEqual(flags, ["0", "0"], `${slice.id} asked for a large arc`);
  }
});

test("ringSlices refuses geometry that cannot draw, instead of drawing nothing", () => {
  assert.throws(() => ringSlices({ size: 0 }), /size must be positive/);
  assert.throws(() => ringSlices({ size: 100, thickness: 50 }), /thickness/);
  assert.throws(() => ringSlices({ size: 100, thickness: 0 }), /thickness/);
  assert.throws(() => ringSlices({ gapDeg: 90 }), /gapDeg/);
  assert.throws(() => ringSlices({ gapDeg: -1 }), /gapDeg/);
});

test("resizing the ring rescales it rather than changing its shape", () => {
  // The pod's width is a CSS token; the paths are generated against a fixed
  // viewBox. Doubling the size must produce the same figure at twice the
  // scale, or the two would drift apart the first time the token moves.
  const small = ringSlices({ size: 100, thickness: 20 });
  const large = ringSlices({ size: 200, thickness: 40 });
  const nums = (d) => d.match(/-?\d+(\.\d+)?/g).map(Number);
  for (let i = 0; i < small.length; i++) {
    const a = nums(small[i].d);
    const b = nums(large[i].d);
    assert.equal(a.length, b.length, "path structure changed with size");
    for (let j = 0; j < a.length; j++) {
      // Flags are 0/1 and must NOT scale; coordinates and radii must.
      const scaled = a[j] === 0 || a[j] === 1 ? a[j] : a[j] * 2;
      assert.ok(Math.abs(scaled - b[j]) < 0.05, `component ${j} of slice ${i}: ${a[j]} -> ${b[j]}`);
    }
  }
});

/* ------------------------------------------------------------------ */
/*  ringState — what the template actually receives                    */
/* ------------------------------------------------------------------ */

test("ringState marks exactly one slice current, and the rest by which side of it they fall", () => {
  const state = ringState({ day: 3, quarter: "evening" });
  assert.deepEqual(
    state.slices.map((s) => s.state),
    ["past", "past", "current", "future"]
  );
  assert.equal(state.slices.filter((s) => s.state === "current").length, 1);
});

test("the ring is a day, not a timeline — morning has nothing behind it", () => {
  const state = ringState({ day: 9, quarter: "morning" });
  assert.equal(state.slices.filter((s) => s.state === "past").length, 0);
  assert.equal(state.day, 9, "the day number still counts up even though the ring resets");
});

test("ringState carries the label key rather than a label, so the template localises", () => {
  const state = ringState({ day: 1, quarter: "night" });
  assert.equal(state.quarterLabelKey, "BLANKINHERITANCE.Console.Quarter.Night");
  assert.equal(state.school, false, "night is not a school quarter");
  assert.equal(ringState({ day: 1, quarter: "morning" }).school, true);
});

test("ringState passes geometry through, so the pod's size is one decision not two", () => {
  const state = ringState({ day: 1, quarter: "morning" }, { size: 200, thickness: 30 });
  const coords = state.slices[0].d.match(/-?\d+(\.\d+)?/g).map(Number);
  assert.ok(Math.max(...coords) > 100, "the geometry argument was ignored");
});

test("ringFlare: a first paint records the clock without flaring", () => {
  assert.deepEqual(ringFlare(null, { day: 1, quarter: "morning" }), { key: "d1:morning", flare: false });
});

test("ringFlare: the same moment re-rendered does not flare, a new quarter or day does", () => {
  assert.equal(ringFlare("d1:morning", { day: 1, quarter: "morning" }).flare, false);
  assert.equal(ringFlare("d1:morning", { day: 1, quarter: "afternoon" }).flare, true);
  assert.equal(ringFlare("d1:night", { day: 2, quarter: "morning" }).flare, true);
});

test("ringNotches: one notch an hour, a major index at each quarter boundary and a half mark at three hours", () => {
  const notches = ringNotches({ size: 98, thickness: 2.8, perQuarter: 6, overhang: 1.1 });
  assert.equal(notches.length, 24);
  assert.deepEqual(notches.filter((n) => n.kind === "major").map((n) => n.deg), [0, 90, 180, 270]);
  assert.deepEqual(notches.filter((n) => n.kind === "half").map((n) => n.deg), [45, 135, 225, 315]);
  assert.equal(notches.filter((n) => n.kind === "hour").length, 16);
  for (const n of notches) for (const v of [n.x1, n.y1, n.x2, n.y2]) assert.ok(Number.isFinite(v));
});

test("ringNotches: majors stand at the gaps, reaching past the band; hour marks stay in its outer part", () => {
  const size = 98;
  const thickness = 2.8;
  const c = size / 2;
  const radius = (x, y) => Math.hypot(x - c, y - c);
  const notches = ringNotches({ size, thickness, perQuarter: 6, overhang: 1.1 });
  const top = notches[0];
  assert.equal(top.x1, c); // twelve o'clock, straight up
  assert.ok(radius(top.x1, top.y1) < c - thickness, "a major reaches inside the band");
  assert.ok(radius(top.x2, top.y2) > c, "and out past it");
  for (const n of notches.filter((m) => m.kind === "hour")) {
    assert.ok(radius(n.x1, n.y1) > c - thickness * 0.6, "an hour mark leaves the band's inner part clear for the kanji plates");
    assert.ok(Math.abs(radius(n.x2, n.y2) - c) < 0.02);
  }
});

test("ringNotches refuses geometry it cannot draw", () => {
  assert.throws(() => ringNotches({ size: 0 }));
  assert.throws(() => ringNotches({ size: 100, thickness: 60 }));
  assert.throws(() => ringNotches({ perQuarter: 0 }));
  assert.throws(() => ringNotches({ perQuarter: 2.5 }));
});
