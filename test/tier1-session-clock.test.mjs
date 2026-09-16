// Tier 1 — the session progress bar's pure logic.
//
// Real wall-clock time, not fictional game-time: "how far through
// tonight's session am I," where the session is 7:30-10:30 PM. Every check
// here passes an explicit Date rather than calling new Date(), so this
// suite is deterministic regardless of when it's actually run.

import { test } from "node:test";
import assert from "node:assert/strict";

import { sessionWindow, sessionProgress, formatMinutes } from "../module/blank-inheritance/scripts/core/session-clock.mjs";

const at = (h, m = 0, s = 0) => new Date(2026, 0, 5, h, m, s);
const W = sessionWindow(); // defaults: window 5pm-midnight, session 7:30-10:30pm

test("sessionWindow defaults to the Monday Group's real 7:30-10:30 PM session in a wider window", () => {
  assert.equal(W.windowStart, 17 * 60);
  assert.equal(W.sessionStart, 19 * 60 + 30);
  assert.equal(W.sessionEnd, 22 * 60 + 30);
  assert.equal(W.windowEnd, 24 * 60);
});

test("sessionWindow rejects a window that doesn't contain the session in order", () => {
  assert.throws(() => sessionWindow({ sessionStartHour: 22, sessionEndHour: 19 }), /windowStart <= sessionStart/);
});

test("formatMinutes writes '1h 30m' with both units, or a bare 'Nm' under an hour", () => {
  assert.equal(formatMinutes(90), "1h 30m");
  assert.equal(formatMinutes(45), "45m");
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(-5), "0m", "a negative input must clamp, not print a negative duration");
});

test("before the session: phase is 'before', a countdown label, zero session fill", () => {
  const p = sessionProgress(at(18, 0), W); // 6:00 PM, 90 min before 7:30
  assert.equal(p.phase, "before");
  assert.equal(p.sessionFillFrac, 0);
  assert.equal(p.label, "Session starts in 1h 30m");
});

test("during the session: phase is 'during', fill matches elapsed fraction, a percentage label", () => {
  const p = sessionProgress(at(21, 0), W); // 9:00 PM = 90 of 180 minutes = 50%
  assert.equal(p.phase, "during");
  assert.ok(Math.abs(p.sessionFillFrac - 0.5) < 1e-9);
  assert.equal(p.label, "50% through tonight's session");
});

test("exactly at the session boundaries counts as during, not before/after", () => {
  assert.equal(sessionProgress(at(19, 30), W).phase, "during");
  assert.equal(sessionProgress(at(22, 30), W).phase, "during");
});

test("shortly after the session: phase is 'after', an 'over' label, full session fill", () => {
  const p = sessionProgress(at(22, 50), W); // 20 min past 10:30
  assert.equal(p.phase, "after");
  assert.equal(p.sessionFillFrac, 1);
  assert.equal(p.label, "Running 20m over");
});

test("the over/ended wording flips at 90 minutes past the end, not at the end itself", () => {
  const p = sessionProgress(at(23, 59), W); // 1h29 past 10:30 is still 'over';
  assert.equal(p.phase, "after");             // the 90-minute cutoff is what flips the wording
  assert.equal(p.label, "Running 1h 29m over");
});

test("windowFrac places 'now' proportionally along the WHOLE bar, clamped to the window", () => {
  // Window is 17:00-24:00 (420 minutes). 19:30 is 150 minutes in.
  const p = sessionProgress(at(19, 30), W);
  assert.ok(Math.abs(p.windowFrac - 150 / 420) < 1e-9);
  // Before the window opens, windowFrac clamps to 0, not negative.
  assert.equal(sessionProgress(at(6, 0), W).windowFrac, 0);
  // After the window closes, windowFrac clamps to 1, not past it.
  assert.equal(sessionProgress(new Date(2026, 0, 5, 23, 59, 59), W).windowFrac < 1, true);
});

test("sessionStartFrac and sessionEndFrac mark the highlighted region consistently, regardless of 'now'", () => {
  const p1 = sessionProgress(at(17, 0), W);
  const p2 = sessionProgress(at(23, 0), W);
  assert.equal(p1.sessionStartFrac, p2.sessionStartFrac);
  assert.equal(p1.sessionEndFrac, p2.sessionEndFrac);
  assert.ok(p1.sessionStartFrac > 0 && p1.sessionStartFrac < p1.sessionEndFrac && p1.sessionEndFrac < 1);
});
