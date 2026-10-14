// The plot timeline's axis (core/timeline-axis.mjs; design/plot-timeline.md §4, D070): one strip of eras, each with
// its own plain scale, a labelled break between them, and a round trip from position to pixel and back.
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildAxis, ticksFor, BREAK, EMPTY_WIDTH } from "../module/blank-inheritance/scripts/core/timeline-axis.mjs";
import { UNIT_DAYS } from "../module/blank-inheritance/scripts/core/timeline-when.mjs";

const Y = UNIT_DAYS.year;
const days = (at) => ({ scale: "days", at, from: at, to: at });
const chapters = (at) => ({ scale: "chapters", at, from: at, to: at });
const POSITIONS = [days(-20000 * Y), days(-19000 * Y), days(-200 * Y), days(-150 * Y), days(-44 * Y), days(-38 * Y), days(-5 * Y), days(-1), days(0.5), days(2.9), chapters(6.8), chapters(15.5)];

test("time runs left to right across every era, and never backwards", () => {
  const axis = buildAxis(POSITIONS);
  const xs = POSITIONS.map((p) => axis.toX(p));
  for (let i = 1; i < xs.length; i++) assert.ok(xs[i] > xs[i - 1], `${JSON.stringify(POSITIONS[i])} at ${xs[i]} should be right of ${xs[i - 1]}`);
  // Within one era, the scale is plain: equal times, equal distances.
  const a = axis.toX(days(-44 * Y)), b = axis.toX(days(-40 * Y)), c = axis.toX(days(-36 * Y));
  assert.ok(Math.abs((b - a) - (c - b)) < 1e-6);
});

test("eras sit side by side with a break between them, and an empty era collapses to a sliver", () => {
  const axis = buildAxis(POSITIONS);
  for (let i = 1; i < axis.segments.length; i++) assert.equal(axis.segments[i].x0 - axis.segments[i - 1].x1, BREAK);
  const spring = axis.segments.find((s) => s.id === "this-spring");
  assert.ok(spring.empty, "nothing happened this spring in the sample");
  assert.equal(spring.x1 - spring.x0, EMPTY_WIDTH);
  assert.equal(axis.width, axis.segments[axis.segments.length - 1].x1);
});

test("a pixel maps back to the position under it, within a pixel's worth", () => {
  const axis = buildAxis(POSITIONS);
  for (const p of POSITIONS) {
    const x = axis.toX(p);
    const back = axis.fromX(x);
    assert.ok(back, `fromX(${x}) found no era`);
    const x2 = axis.toX(back);
    assert.ok(Math.abs(x2 - x) < 0.5, `${JSON.stringify(p)}: ${x} -> ${JSON.stringify(back)} -> ${x2}`);
  }
  const brk = axis.segments[1].x0 - BREAK / 2;
  assert.equal(axis.fromX(brk), null, "a break in time has no date");
});

test("zoom widens every era that has something in it", () => {
  const one = buildAxis(POSITIONS), two = buildAxis(POSITIONS, { zoom: 2 });
  const ep1 = one.segments.find((s) => s.id === "episodes"), ep2 = two.segments.find((s) => s.id === "episodes");
  assert.equal(ep2.x1 - ep2.x0, 2 * (ep1.x1 - ep1.x0));
});

test("ticks say years in AR, days and times of day, and chapters", () => {
  const axis = buildAxis(POSITIONS);
  const labels = (id) => ticksFor(axis.segments.find((s) => s.id === id)).map((t) => t.label);
  assert.ok(labels("old-campaign").some((l) => /\d{4} AR/.test(l)));
  assert.ok(labels("deep-past").some((l) => /years ago/.test(l)));
  assert.ok(labels("episodes").includes("Day 1"));
  assert.ok(labels("ahead").includes("Ch 6"));
  assert.ok(labels("ahead").includes("Ch 20"));
});

test("a chapter-1 date falls among the episodes' days", () => {
  const axis = buildAxis(POSITIONS);
  const ep = axis.segments.find((s) => s.id === "episodes");
  const x = axis.toX(chapters(1.5));
  assert.ok(x >= ep.x0 && x <= ep.x1);
});
