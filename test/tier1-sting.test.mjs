// Tier 1 — the arrival sting's model.
//
// Two things matter here. diffCast has to match by identity (portraitId),
// not position, or two people swapping sides on the stage would misfire as
// one arriving and one leaving. And noticeForArrival has to gate on the
// AUTHORED tier, not decide anything itself — every client reaches the
// banner-or-silence answer independently from the same published data, so if
// this function ever guessed instead of reading the field, two clients could
// disagree about whether a notice fired at all.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  STING_TIERS,
  diffCast,
  noticeForArrival,
  noticeForDeparture
} from "../module/blank-inheritance/scripts/core/sting.mjs";

const sato = { portraitId: "sato-hiroshi", label: "Sato Hiroshi", sting: STING_TIERS.QUIET };
const advocate = { portraitId: "transparency-advocate", label: "The Transparency Advocate", sting: STING_TIERS.ANNOUNCED };
const watcher = { portraitId: "watcher", label: "The Watcher", sting: STING_TIERS.ANNOUNCED };

/* ------------------------------------------------------------------ */
/*  diffCast                                                           */
/* ------------------------------------------------------------------ */

test("a member present in both casts is neither arrived nor departed", () => {
  const { arrived, departed } = diffCast([sato], [sato]);
  assert.deepEqual(arrived, []);
  assert.deepEqual(departed, []);
});

test("a member only in the new cast has arrived", () => {
  const { arrived, departed } = diffCast([sato], [sato, advocate]);
  assert.deepEqual(arrived, [advocate]);
  assert.deepEqual(departed, []);
});

test("a member only in the old cast has departed", () => {
  const { arrived, departed } = diffCast([sato, advocate], [sato]);
  assert.deepEqual(arrived, []);
  assert.deepEqual(departed, [advocate]);
});

test("matching is by portraitId, not array position or object identity", () => {
  // Same person, same id, a different object (as it would be after a fresh
  // fetch of the scene flag) — must NOT read as a departure-then-arrival.
  const same = { portraitId: "sato-hiroshi", label: "Sato Hiroshi", sting: STING_TIERS.ANNOUNCED, side: "right" };
  const { arrived, departed } = diffCast([sato], [same]);
  assert.deepEqual(arrived, [], "changing an unrelated field must not read as an arrival");
  assert.deepEqual(departed, [], "changing an unrelated field must not read as a departure");
});

test("two members swapping sides is neither an arrival nor a departure for either", () => {
  const before = [{ ...sato, side: "left" }, { ...advocate, side: "right" }];
  const after = [{ ...sato, side: "right" }, { ...advocate, side: "left" }];
  const { arrived, departed } = diffCast(before, after);
  assert.deepEqual(arrived, []);
  assert.deepEqual(departed, []);
});

test("arrived and departed can both be non-empty in one diff", () => {
  const { arrived, departed } = diffCast([sato], [advocate]);
  assert.deepEqual(arrived, [advocate]);
  assert.deepEqual(departed, [sato]);
});

test("empty casts on either side are handled without special-casing by the caller", () => {
  assert.deepEqual(diffCast([], []), { arrived: [], departed: [] });
  assert.deepEqual(diffCast([], [sato]).arrived, [sato]);
  assert.deepEqual(diffCast([sato], []).departed, [sato]);
  assert.deepEqual(diffCast(undefined, undefined), { arrived: [], departed: [] });
});

test("arrival order mirrors the new cast, departure order mirrors the old", () => {
  const previous = [sato, advocate];
  const next = [watcher, sato];
  const diff = diffCast(previous, next);
  assert.deepEqual(diff.arrived.map((m) => m.portraitId), ["watcher"]);
  assert.deepEqual(diff.departed.map((m) => m.portraitId), ["transparency-advocate"]);
});

/* ------------------------------------------------------------------ */
/*  noticeForArrival — tier gating                                     */
/* ------------------------------------------------------------------ */

test("an announced arrival produces a notice naming the character", () => {
  const notice = noticeForArrival(advocate);
  assert.ok(notice);
  assert.equal(notice.kind, "info");
  assert.match(notice.text, /Transparency Advocate/);
});

test("a quiet arrival produces NO notice — quiet is the default, not a lesser banner", () => {
  assert.equal(noticeForArrival(sato), null);
});

test("a missing or unrecognised tier stays quiet rather than defaulting to loud", () => {
  // The safe direction: an unknown tier value (a future SPLASH not yet
  // handled here, a typo, a hand-edited flag) must never surprise the table
  // with an unwanted banner.
  assert.equal(noticeForArrival({ portraitId: "x", label: "X" }), null);
  assert.equal(noticeForArrival({ portraitId: "x", label: "X", sting: "splash" }), null);
  assert.equal(noticeForArrival({ portraitId: "x", label: "X", sting: "loud" }), null);
});

test("a member with no label produces no notice rather than a blank banner", () => {
  assert.equal(noticeForArrival({ portraitId: "x", sting: STING_TIERS.ANNOUNCED }), null);
});

test("noticeForArrival is not vacuously always-null — the mutation check", () => {
  // If this fails, every test above proving 'quiet stays silent' is
  // meaningless, because nothing would ever have produced a notice to
  // compare against.
  assert.notEqual(noticeForArrival(advocate), null);
});

/* ------------------------------------------------------------------ */
/*  Departures                                                         */
/* ------------------------------------------------------------------ */

test("departures never sound the banner, at any tier", () => {
  // A deliberate reading of §5 ("someone leaving is information, not an
  // event"), not an oversight — tested explicitly so the day someone decides
  // otherwise, they change this test on purpose rather than by accident.
  assert.equal(noticeForDeparture(advocate), null);
  assert.equal(noticeForDeparture(watcher), null);
  assert.equal(noticeForDeparture({ portraitId: "x", label: "X", sting: STING_TIERS.ANNOUNCED }), null);
});
