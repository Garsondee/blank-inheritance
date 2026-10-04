// Can this computer draw the stage? (core/speed.mjs.) The gaps between the pictures the stage delivers are measured for a
// moment against what the display and Foundry's own cap allow, and a computer is only moved down on evidence: two readings
// a minute apart that agree, then one step (or the plain stage for two crawls), forgotten after half a day, never up within a
// session, and never a player who chose their tier.

import { test } from "node:test";
import assert from "node:assert/strict";
import { SPEED, SpeedProbe, judge, decide, lowerTier, lowestOf, displayInterval, dropStands, TIER_ORDER } from "../scripts/core/speed.mjs";

/** Feed a probe `n` pictures; `gap` (ms, or a function of the picture's number) is the time between one and the next. */
function run(gap, n = SPEED.ignore + SPEED.take + 10, limits = SPEED) {
  const p = new SpeedProbe(limits);
  let now = 0;
  for (let i = 0; i < n; i++) {
    p.push(now);
    now += typeof gap === "function" ? gap(i) : gap;
  }
  return p;
}

const SIXTY = 1000 / 60;

test("the first pictures are thrown away, the next ninety gaps measured, and then the probe is done", () => {
  const p = new SpeedProbe();
  let now = 0;
  p.push(now);
  for (let i = 0; i < SPEED.ignore; i++) { now += 100; p.push(now); }                  // shaders compile, pictures upload
  assert.equal(p.result().n, 0, "none of the first gaps counts");
  for (let i = 0; i < SPEED.take - 1; i++) { now += SIXTY; p.push(now); }
  assert.equal(p.done, false);
  now += SIXTY; p.push(now);
  assert.equal(p.done, true);
  assert.ok(Math.abs(p.result().median - SIXTY) < 1e-6, "and the stalls at the start never reached the median");
  now += 900; p.push(now);
  assert.equal(p.result().n, SPEED.take, "a picture after it is done is not added");
});

test("the median is what is judged: a few stalls do not make a machine slow, and a few quick pictures do not make it fast", () => {
  const stalls = run((i) => (i % 10 === 0 ? 180 : SIXTY));
  assert.equal(judge(stalls.result()), "ok", "a garbage collection now and then");
  const mostlySlow = run((i) => (i % 10 === 0 ? 5 : 31));
  assert.equal(judge(mostlySlow.result()), "slow");
  assert.ok(stalls.result().p90 >= SIXTY);
});

test("the verdicts: ok, slow, very slow, and unknown when there were too few pictures to say", () => {
  assert.equal(judge(run(SIXTY).result()), "ok", "a picture every 16.7 ms: sixty a second");
  assert.equal(judge(run(21).result()), "ok", "forty-eight a second is fine");
  assert.equal(judge(run(25).result()), "slow", "forty a second on a display that shows sixty");
  assert.equal(judge(run(31).result()), "slow");
  assert.equal(judge(run(40).result()), "very-slow", "twenty-five a second");
  const few = run(40, SPEED.ignore + 12);
  assert.equal(judge(few.result()), "unknown", "a dozen pictures prove nothing");
  assert.equal(judge(few.result(), { patient: true }), "very-slow", "unless the test ran out of patience with a dozen: that is a crawl");
  assert.equal(judge(new SpeedProbe().result(), { patient: true }), "unknown", "and no pictures at all is no verdict");
});

test("a picture is judged against what the display and Foundry's own cap allow: 33 ms is fine on a 30 Hz display, or when Foundry was asked for 30, and slow on 60", () => {
  const thirty = run(1000 / 30).result();
  assert.equal(judge(thirty, { display: 1000 / 60, cap: 60 }), "slow", "half of what was allowed");
  assert.equal(judge(thirty, { display: 1000 / 30, cap: 60 }), "ok", "a display that shows thirty a second (a remote desktop, a virtual machine)");
  assert.equal(judge(thirty, { display: 1000 / 60, cap: 30 }), "ok", "Foundry's Maximum Framerate set to thirty");
  const forty = run(25).result();
  assert.equal(judge(forty, { display: 1000 / 144, cap: Infinity }), "slow", "a fast display, Foundry uncapped: forty a second is slow, but sixty is what is asked for, not one hundred and forty-four");
  assert.equal(judge(run(12).result(), { display: 1000 / 144, cap: Infinity }), "ok", "and eighty-three a second is fine there");
  assert.equal(judge(run(SIXTY).result(), { display: 1000 / 144, cap: 60 }), "ok");
});

test("a test that is too slow to finish gives up after its patience, with what it has", () => {
  const p = new SpeedProbe();
  p.push(0);
  assert.equal(p.done, false);
  p.push(SPEED.patience - 1);
  assert.equal(p.done, false);
  p.push(SPEED.patience);
  assert.equal(p.done, true);
});

test("a bad number is not a picture", () => {
  const p = new SpeedProbe({ ...SPEED, ignore: 0 });
  for (const t of [NaN, -3, Infinity, undefined, "x"]) p.push(t);
  assert.equal(p.result().n, 0);
  const back = new SpeedProbe({ ...SPEED, ignore: 0 });
  back.push(100);
  back.push(50);                                                                    // time going backwards
  assert.equal(back.result().n, 0, "a gap that is negative is not measured");
});

test("the display's own pace is read from the short gaps seen before the stage drew, as the refresh rate it must be: 60, 144 or 30 Hz; a page too busy to say, or too few gaps, is taken as 60", () => {
  const near = (a, b) => Math.abs(a - b) < 0.05;
  assert.ok(near(displayInterval(Array.from({ length: 30 }, (_, i) => (i % 5 === 0 ? 40 : SIXTY))), SIXTY), "a few long ones do not move it");
  assert.ok(near(displayInterval(Array.from({ length: 30 }, () => 1000 / 144)), 1000 / 144));
  assert.ok(near(displayInterval(Array.from({ length: 30 }, () => 1000 / 30)), 1000 / 30));
  assert.ok(near(displayInterval(Array.from({ length: 30 }, (_, i) => 16.69 + (i % 3) * 0.2)), SIXTY), "59.94 Hz and a little jitter is sixty");
  assert.ok(near(displayInterval(Array.from({ length: 30 }, (_, i) => 33.3 + (i % 3) * 0.4)), 1000 / 30), "and thirty a second stays thirty");
  // the page is busy while the stage is built, and busy gaps are long ones: found on the bench 2026-10-04, where the
  // median of such gaps (31.5 ms) was taken for the display and would have excused a stage crawling at 22 a second
  const busy = Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? SIXTY : 30 + (i % 7)));
  assert.ok(near(displayInterval(busy), SIXTY), "a third of the gaps on time: a sixty hertz display, however busy the rest");
  assert.ok(near(displayInterval(Array.from({ length: 40 }, (_, i) => 24 + (i % 5))), SIXTY), "every gap long, none under 24 ms: a busy sixty, not a forty-hertz display (there is none)");
  assert.equal(displayInterval(Array.from({ length: 30 }, () => 120)), SPEED.display, "a gap of a tenth of a second is a busy page, not a display");
  assert.equal(displayInterval(Array.from({ length: 30 }, () => 1)), SPEED.display, "and a thousand a second is not a display either");
  assert.equal(displayInterval([16, 16, 16]), SPEED.display, "three gaps are not enough");
  assert.equal(displayInterval([]), SPEED.display);
  assert.equal(displayInterval(null), SPEED.display);
  assert.ok(near(displayInterval([NaN, -1, 0, Infinity, ...Array.from({ length: 10 }, () => 20)]), SIXTY), "bad gaps are left out; twenty milliseconds is read as sixty (and is fine anyway)");
});

test("a tier drops on two readings that agree: slow twice a step, very slow twice the plain stage, never when ok, never from flat", () => {
  assert.deepEqual(decide({ tier: "high", verdict: "ok" }), { to: null, strikes: 0, hard: 0 });
  assert.deepEqual(decide({ tier: "high", verdict: "slow" }), { to: null, strikes: 1, hard: 0 }, "once is a doubt");
  assert.deepEqual(decide({ tier: "high", verdict: "slow", strikes: 1 }), { to: "low", strikes: 0, hard: 0 }, "twice is a finding");
  assert.deepEqual(decide({ tier: "low", verdict: "slow", strikes: 1 }), { to: "flat", strikes: 0, hard: 0 }, "low is slow too: the plain stage");
  assert.deepEqual(decide({ tier: "high", verdict: "very-slow" }), { to: null, strikes: 1, hard: 1 }, "a crawl is a doubt too: a busy moment looks like one");
  assert.deepEqual(decide({ tier: "high", verdict: "very-slow", strikes: 1, hard: 1 }), { to: "flat", strikes: 0, hard: 0 }, "two crawls: the plain stage");
  assert.deepEqual(decide({ tier: "high", verdict: "very-slow", strikes: 1, hard: 0 }), { to: "low", strikes: 0, hard: 0 }, "a slow and then a crawl: one step, not two");
  assert.deepEqual(decide({ tier: "high", verdict: "slow", strikes: 1, hard: 1 }), { to: "low", strikes: 0, hard: 0 }, "and a crawl and then a slow too");
  assert.deepEqual(decide({ tier: "high", verdict: "unknown", strikes: 1, hard: 1 }), { to: null, strikes: 1, hard: 1 }, "no evidence: the doubt stays as it was");
  assert.deepEqual(decide({ tier: "flat", verdict: "very-slow" }), { to: null, strikes: 0, hard: 0 }, "nowhere lower to go");
  assert.deepEqual(decide({ tier: "high", verdict: "ok", strikes: 1, hard: 1 }), { to: null, strikes: 0, hard: 0 }, "an ok clears the doubt");
});

test("tiers only ever go down: the lower of two, and one step below", () => {
  assert.deepEqual([...TIER_ORDER], ["high", "low", "flat"]);
  assert.equal(lowerTier("high"), "low");
  assert.equal(lowerTier("low"), "flat");
  assert.equal(lowerTier("flat"), null);
  assert.equal(lowestOf("high", "low"), "low");
  assert.equal(lowestOf("flat", "high"), "flat");
  assert.equal(lowestOf("low", "low"), "low");
});

test("a drop is believed for half a day, and then the computer is tested afresh", () => {
  const now = Date.UTC(2026, 9, 4, 12);
  const hours = (h) => now - h * 3600 * 1000;
  assert.equal(dropStands(hours(0.01), now), true);
  assert.equal(dropStands(hours(11), now), true);
  assert.equal(dropStands(hours(13), now), false, "a busy evening does not decide for good");
  assert.equal(dropStands(hours(-1), now), false, "a clock that has gone backwards believes nothing");
  assert.equal(dropStands(null, now), false);
  assert.equal(dropStands(undefined, now), false);
  assert.equal(dropStands(NaN, now), false);
  assert.equal(dropStands(hours(5), now, { ...SPEED, keepHours: 4 }), false);
});

test("the limits are sane: fifty a second is fine, the ratios are ordered, the second reading comes later, and the tests are a moment, not a minute", () => {
  assert.ok(SPEED.fineMs >= SIXTY && SPEED.fineMs <= 25, "20 ms is fifty a second");
  assert.ok(SPEED.slowRatio > 1 && SPEED.veryRatio > SPEED.slowRatio);
  assert.ok(SPEED.settle >= 3000, "Foundry is still starting at two and a half seconds: the test waits for it");
  assert.ok(SPEED.patience <= 15000 && SPEED.again >= 30000);
  assert.ok(SPEED.take >= SPEED.least * 2);
  assert.ok(SPEED.keepHours >= 1 && SPEED.keepHours <= 48);
});
