// Tier 1 — the frame engage's model.
//
// The assertion that matters most: engageArrivals must fire ONLY for a
// member who is genuinely new this render, matched by portraitId — not by
// position, and not for someone already on stage being re-rendered because
// somebody ELSE changed. Getting this wrong means every already-visible
// frame replays its entrance animation every time anyone else arrives,
// which would be immediately, visibly wrong live (verified separately).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ENTRANCE_KINDS,
  engageArrivals,
  entranceFor
} from "../module/blank-inheritance/scripts/core/engage.mjs";

const ordinary = { portraitId: "bar-regular", label: "A Bar Regular", faction: null };
const directorate = { portraitId: "transparency-advocate", label: "The Transparency Advocate", faction: "directorate" };

/* ------------------------------------------------------------------ */
/*  entranceFor                                                        */
/* ------------------------------------------------------------------ */

test("no faction means the ordinary Engage treatment", () => {
  assert.equal(entranceFor(ordinary), ENTRANCE_KINDS.ENGAGE);
  assert.equal(entranceFor({ portraitId: "x" }), ENTRANCE_KINDS.ENGAGE);
  assert.equal(entranceFor(null), ENTRANCE_KINDS.ENGAGE);
  assert.equal(entranceFor(undefined), ENTRANCE_KINDS.ENGAGE);
});

test("Directorate affiliation means Shutter", () => {
  assert.equal(entranceFor(directorate), ENTRANCE_KINDS.SHUTTER);
});

test("an unknown faction is not guessed at — stays Engage", () => {
  assert.equal(entranceFor({ portraitId: "x", faction: "the-watcher" }), ENTRANCE_KINDS.ENGAGE);
});

test("an explicit entrance override always wins over the derived one", () => {
  assert.equal(entranceFor({ ...directorate, entrance: ENTRANCE_KINDS.ALERT }), ENTRANCE_KINDS.ALERT);
  assert.equal(entranceFor({ ...ordinary, entrance: ENTRANCE_KINDS.SIGNAL }), ENTRANCE_KINDS.SIGNAL);
});

test("an unrecognised override is ignored rather than thrown on", () => {
  // A typo in hand-authored data must not break the render.
  assert.equal(entranceFor({ ...ordinary, entrance: "dramatic-swoosh" }), ENTRANCE_KINDS.ENGAGE);
  assert.equal(entranceFor({ ...directorate, entrance: "dramatic-swoosh" }), ENTRANCE_KINDS.SHUTTER);
});

test("Alert and Signal are reachable only by explicit override — no faction defaults to either", () => {
  // core/engage.mjs's own comment: neither is a property a faction has by
  // default. If this ever fires, someone added a faction->Alert/Signal
  // mapping without meaning to.
  for (const faction of ["directorate"]) {
    const kind = entranceFor({ portraitId: "x", faction });
    assert.notEqual(kind, ENTRANCE_KINDS.ALERT);
    assert.notEqual(kind, ENTRANCE_KINDS.SIGNAL);
  }
});

/* ------------------------------------------------------------------ */
/*  engageArrivals                                                      */
/* ------------------------------------------------------------------ */

test("a member absent from the previous render arrives, with their derived entrance", () => {
  const arrivals = engageArrivals([], [directorate]);
  assert.deepEqual(arrivals, [{ portraitId: "transparency-advocate", entrance: "shutter" }]);
});

test("a member already present in the previous render does NOT arrive again", () => {
  // The core correctness property: an unrelated re-render (someone ELSE
  // changing) must not replay this member's own entrance.
  const arrivals = engageArrivals([ordinary], [ordinary]);
  assert.deepEqual(arrivals, []);
});

test("changing an unrelated field on an already-present member does not trigger a re-arrival", () => {
  const changed = { ...ordinary, side: "right" };
  assert.deepEqual(engageArrivals([ordinary], [changed]), []);
});

test("two members swapping array position does not read as either one arriving", () => {
  const before = [ordinary, directorate];
  const after = [directorate, ordinary];
  assert.deepEqual(engageArrivals(before, after), []);
});

test("a departure is not reported as an arrival", () => {
  assert.deepEqual(engageArrivals([ordinary, directorate], [ordinary]), []);
});

test("several simultaneous arrivals are all reported, each with its own entrance", () => {
  const arrivals = engageArrivals([], [ordinary, directorate]);
  assert.deepEqual(arrivals, [
    { portraitId: "bar-regular", entrance: "engage" },
    { portraitId: "transparency-advocate", entrance: "shutter" }
  ]);
});

test("empty or missing inputs are handled without special-casing by the caller", () => {
  assert.deepEqual(engageArrivals([], []), []);
  assert.deepEqual(engageArrivals(undefined, undefined), []);
});

test("MUTATION CHECK: a position-based diff would wrongly fire on the swap case above", () => {
  // The exact wrong-but-plausible implementation this file's own comment
  // warns against, to prove the swap test above is not vacuously trivial.
  function naiveByPosition(previous, next) {
    return next
      .map((m, i) => (previous[i]?.portraitId !== m.portraitId ? m : null))
      .filter(Boolean)
      .map((m) => ({ portraitId: m.portraitId, entrance: entranceFor(m) }));
  }
  const before = [ordinary, directorate];
  const after = [directorate, ordinary];
  const naive = naiveByPosition(before, after);
  assert.ok(naive.length > 0, "the naive implementation did not actually misfire, so this test proves nothing");
  assert.deepEqual(engageArrivals(before, after), [], "the real implementation must not share the naive one's bug");
});
