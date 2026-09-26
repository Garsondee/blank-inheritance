// Tier 1 — core/travel-speed.mjs: mode selection and per-hop animated
// duration. The claim this file holds up, verbatim from Ingram's own
// 2026-09-23 brief: "The goal is to create a variable length travel time
// depending on distance... you should be able to automatically test [it]."
// Every test below checks a real, checkable timing relationship, not just
// that a number came back.

import { test } from "node:test";
import assert from "node:assert/strict";

import { MODES, hopPlan, modeForWayClass, totalDurationMs } from "../module/blank-inheritance/scripts/core/travel-speed.mjs";

test("modeForWayClass maps real OSM tag values to the right mode, and defaults an unknown tag to walk rather than guessing a faster one", () => {
  assert.equal(modeForWayClass("footway"), "walk");
  assert.equal(modeForWayClass("cycleway"), "bike");
  assert.equal(modeForWayClass("residential"), "car");
  assert.equal(modeForWayClass("motorway"), "motorbike");
  assert.equal(modeForWayClass("rail"), "train");
  assert.equal(modeForWayClass("subway"), "train");
  assert.equal(modeForWayClass(undefined), "walk");
  assert.equal(modeForWayClass("some_future_osm_tag_nobody_mapped_yet"), "walk");
});

test("every mode is ordered walk < bike < (motorbike ~ car) < train, matching their real relative pace", () => {
  assert.ok(MODES.walk.pxPerSecond < MODES.bike.pxPerSecond);
  assert.ok(MODES.bike.pxPerSecond < MODES.car.pxPerSecond);
  assert.ok(MODES.car.pxPerSecond <= MODES.train.pxPerSecond);
  assert.ok(MODES.motorbike.pxPerSecond <= MODES.train.pxPerSecond);
});

test("a pure walk segment (no network at all) takes longer for a longer distance, at a fixed rate", () => {
  const short = [{ kind: "walk", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }] }];
  const long = [{ kind: "walk", points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }] }];
  const shortHops = hopPlan(short);
  const longHops = hopPlan(long);
  assert.ok(totalDurationMs(longHops) > totalDurationMs(shortHops), "a 1000px walk must take longer to watch than a 100px walk");
  // Exactly 10x the distance at a constant speed must be ~10x the time —
  // each hop rounds to the nearest ms independently, so a couple of ms of
  // rounding slack across two different-scale computations is expected,
  // not a sign the relationship itself is off.
  assert.ok(Math.abs(totalDurationMs(longHops) - totalDurationMs(shortHops) * 10) <= 5);
});

test("the exact regression this system was built to fix: a ~6km cross-map walk takes meaningfully longer than a ~300m one, not the same fixed few seconds", () => {
  // Real distances from this campaign's own demo party origins
  // (core/demo-party.mjs): north-shore-town to candidate-gate is roughly
  // 6034m; old-landing to candidate-gate is roughly 1858m. Both walked
  // (no network), the worst case for exposing a fixed-duration bug since a
  // pure walk has no mode variation to hide behind.
  const farRoute = [{ kind: "walk", points: [{ x: 8975, y: 797 }, { x: 6962, y: 6486 }] }];
  const nearRoute = [{ kind: "walk", points: [{ x: 5195, y: 5146 }, { x: 6962, y: 6486 }] }];
  const farMs = totalDurationMs(hopPlan(farRoute));
  const nearMs = totalDurationMs(hopPlan(nearRoute));
  assert.ok(farMs > nearMs * 2, `a ~6km trip (${farMs}ms) should take well over 2x a ~1.9km trip (${nearMs}ms), not the same fixed duration`);
});

test("riding a road segment is faster than walking the identical distance", () => {
  const walked = [{ kind: "walk", points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }] }];
  const ridden = [{ kind: "network", points: [{ x: 0, y: 0 }, { x: 1000, y: 0 }], wayIds: ["w1"] }];
  const walkMs = totalDurationMs(hopPlan(walked));
  const rideMs = totalDurationMs(hopPlan(ridden, { wayClass: { w1: "residential" } }));
  assert.ok(rideMs < walkMs, "a car on a residential road must cover the same distance faster than walking it");
});

test("a mixed route (walk to the road, ride it, walk the last stretch) assigns the right mode to each real leg", () => {
  // Distances kept short enough that none of these naturally exceeds
  // MAX_HOP_MS on its own mode's speed — subdivision has its own dedicated
  // tests below; this one is purely about which mode lands on which leg.
  const segments = [
    { kind: "walk", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
    { kind: "network", points: [{ x: 10, y: 0 }, { x: 10, y: 50 }, { x: 60, y: 50 }], wayIds: ["w1", "w2"] },
    { kind: "walk", points: [{ x: 60, y: 50 }, { x: 65, y: 50 }] }
  ];
  const hops = hopPlan(segments, { wayClass: { w1: "footway", w2: "rail" } });
  assert.equal(hops.length, 4);
  assert.equal(hops[0].mode, "walk", "getting onto the network is always a walk, whatever the nearest way happens to be tagged");
  assert.equal(hops[1].mode, "walk", "way w1 is a footway");
  assert.equal(hops[2].mode, "train", "way w2 is rail");
  assert.equal(hops[3].mode, "walk", "the last stretch off the network is always a walk");
});

test("hopPlan drops the shared seam point between chained segments, same contract as flattenRoute", () => {
  const segments = [
    { kind: "walk", points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] },
    { kind: "network", points: [{ x: 10, y: 0 }, { x: 20, y: 0 }], wayIds: ["w1"] }
  ];
  const hops = hopPlan(segments, { wayClass: { w1: "residential" } });
  assert.equal(hops.length, 2, "3 real points chained across 2 segments must be 2 hops, not 3 (one shared seam point)");
  assert.deepEqual(hops.map((h) => h.to), [{ x: 10, y: 0 }, { x: 20, y: 0 }]);
});

test("an unclassified way still gets a mode (walk) rather than an unusable NaN duration", () => {
  const segments = [{ kind: "network", points: [{ x: 0, y: 0 }, { x: 100, y: 0 }], wayIds: ["ghost-way-not-in-wayClass"] }];
  const hops = hopPlan(segments, { wayClass: {} });
  assert.equal(hops[0].mode, "walk");
  assert.ok(Number.isFinite(hops[0].durationMs) && hops[0].durationMs > 0);
});

test("totalDurationMs sums every hop and is 0 for an empty plan", () => {
  assert.equal(totalDurationMs([]), 0);
  assert.equal(totalDurationMs([{ durationMs: 100 }, { durationMs: 250 }]), 350);
});

/* ------------------------------------------------------------------ */
/*  Long-hop subdivision (2026-09-23) -- the exact live bug Ingram       */
/*  reported while watching a real run: "I noticed the token didn't    */
/*  move along roads, but rather in a straight line when I saw it       */
/*  move." A real ~8.4km route rode one sparse OSM way as a single      */
/*  23.3-SECOND hop while 154 of its other 175 hops were under half a   */
/*  second -- Foundry animates each hop as one linear glide for its own */
/*  full duration, so that one dominant hop is what a viewer actually   */
/*  perceives, not the many quick turns around it.                     */
/* ------------------------------------------------------------------ */

test("a hop short enough to animate in one glide is never subdivided", () => {
  // 100px at walk's 45px/s = 2222ms -- comfortably over MAX_HOP_MS,
  // included here as the boundary check right below it: 50px = 1111ms.
  const segments = [{ kind: "walk", points: [{ x: 0, y: 0 }, { x: 50, y: 0 }] }];
  const hops = hopPlan(segments);
  assert.equal(hops.length, 1);
  assert.equal(hops[0].durationMs, 1111);
});

test("a real long hop — the exact regression — is split into several smaller, evenly-timed sub-hops along the SAME straight line, not one dominant glide", () => {
  // 8358px at walk's 45px/s ≈ 185733ms -- comparable in scale to the real
  // 23.3s hop this was found from (that one rode a faster mode over a
  // shorter distance; walk over a longer one lands in the same "way too
  // long for one glide" territory deliberately, so this test doesn't
  // depend on the exact real route surviving future map edits).
  const from = { x: 0, y: 0 };
  const to = { x: 8358, y: 0 };
  const segments = [{ kind: "walk", points: [from, to] }];
  const hops = hopPlan(segments);

  assert.ok(hops.length > 1, "a hop this long must be split into more than one animated step");
  for (const hop of hops) {
    assert.ok(hop.durationMs <= 1500, `every sub-hop must be at most MAX_HOP_MS, found ${hop.durationMs}ms`);
  }

  // The path itself is untouched: every sub-hop's endpoint still lies
  // exactly on the original straight line, in order, ending at the real
  // destination -- subdivision changes ONLY how often it is animated.
  assert.deepEqual(hops[hops.length - 1].to, to);
  for (const hop of hops) {
    assert.ok(Math.abs(hop.to.y - from.y) < 1e-9, "a sub-hop must never drift off the original straight line");
  }
  for (let i = 1; i < hops.length; i++) {
    assert.ok(hops[i].to.x > hops[i - 1].to.x, "sub-hops must progress monotonically toward the destination, never backward or in place");
  }

  // Total time is preserved (within rounding across N equal shares) --
  // subdivision must not make the whole crossing faster or slower overall.
  const originalMs = Math.round((8358 / 45) * 1000);
  assert.ok(Math.abs(totalDurationMs(hops) - originalMs) <= hops.length, "the sum of sub-hop durations drifted from the original hop's own duration by more than simple per-step rounding can explain");
});

test("every sub-hop of one long real hop keeps that hop's own mode — subdividing a car ride must not turn any part of it into a walk", () => {
  const segments = [{ kind: "network", points: [{ x: 0, y: 0 }, { x: 5000, y: 0 }], wayIds: ["w1"] }];
  const hops = hopPlan(segments, { wayClass: { w1: "residential" } });
  assert.ok(hops.length > 1);
  assert.ok(hops.every((h) => h.mode === "car"));
});
