// Can this computer draw the stage? (core/speed.mjs.) A frame's cost is measured for a moment, and a computer is only moved
// down on evidence: twice a minute apart for "slow", at once for "very slow", never up, never a player who chose their tier.

import { test } from "node:test";
import assert from "node:assert/strict";
import { SPEED, SpeedProbe, judge, decide, lowerTier, lowestOf, TIER_ORDER } from "../scripts/core/speed.mjs";

/** Feed a probe `n` frames of one cost, 16 ms apart. */
function run(cost, n = SPEED.ignore + SPEED.take + 10, limits = SPEED) {
  const p = new SpeedProbe(limits);
  for (let i = 0; i < n; i++) p.push(typeof cost === "function" ? cost(i) : cost, i * 16);
  return p;
}

test("the first frames are thrown away, the next ninety measured, and then the probe is done", () => {
  const p = new SpeedProbe();
  for (let i = 0; i < SPEED.ignore; i++) p.push(500, i * 16);                      // shaders compile, pictures upload
  assert.equal(p.result().n, 0, "none of the first frames counts");
  for (let i = 0; i < SPEED.take - 1; i++) p.push(6, i * 16);
  assert.equal(p.done, false);
  p.push(6, 5000);
  assert.equal(p.done, true);
  assert.equal(p.result().median, 6, "and the stalls at the start never reached the median");
  p.push(900, 6000);
  assert.equal(p.result().n, SPEED.take, "a frame after it is done is not added");
});

test("the median is what is judged: a few stalls do not make a machine slow, and a few quick frames do not make it fast", () => {
  const stalls = run((i) => (i % 10 === 0 ? 180 : 7));
  assert.equal(judge(stalls.result()), "ok", "a garbage collection now and then");
  const mostlySlow = run((i) => (i % 10 === 0 ? 5 : 31));
  assert.equal(judge(mostlySlow.result()), "slow");
  assert.equal(stalls.result().p90 >= 7, true);
});

test("the verdicts: ok, slow, very slow, and unknown when there were too few frames to say", () => {
  assert.equal(judge(run(8).result()), "ok");
  assert.equal(judge(run(SPEED.slowMs + 2).result()), "slow");
  assert.equal(judge(run(SPEED.veryMs + 5).result()), "very-slow");
  const few = new SpeedProbe();
  for (let i = 0; i < SPEED.ignore + 12; i++) few.push(40, i * 16);
  assert.equal(judge(few.result()), "unknown", "a dozen frames prove nothing");
  assert.equal(judge(few.result(), { patient: true }), "very-slow", "unless the test ran out of patience with a dozen: that is a crawl");
  const none = new SpeedProbe();
  assert.equal(judge(none.result(), { patient: true }), "unknown", "and no frames at all is no verdict");
});

test("a test that is too slow to finish gives up after its patience, with what it has", () => {
  const p = new SpeedProbe();
  p.push(60, 0);
  assert.equal(p.done, false);
  p.push(60, SPEED.patience - 1);
  assert.equal(p.done, false);
  p.push(60, SPEED.patience);
  assert.equal(p.done, true);
});

test("a bad number is not a frame", () => {
  const p = new SpeedProbe({ ...SPEED, ignore: 0 });
  for (const c of [NaN, -3, Infinity, undefined, "x"]) p.push(c, 0);
  assert.equal(p.result().n, 0);
});

test("a tier drops on evidence: slow twice, very slow once, never when ok, and never from flat", () => {
  assert.deepEqual(decide({ tier: "high", verdict: "ok" }), { to: null, strikes: 0 });
  assert.deepEqual(decide({ tier: "high", verdict: "slow", strikes: 0 }), { to: null, strikes: 1 }, "once is a doubt");
  assert.deepEqual(decide({ tier: "high", verdict: "slow", strikes: 1 }), { to: "low", strikes: 0 }, "twice is a finding");
  assert.deepEqual(decide({ tier: "low", verdict: "slow", strikes: 1 }), { to: "flat", strikes: 0 }, "low is slow too: the plain stage");
  assert.deepEqual(decide({ tier: "high", verdict: "very-slow" }), { to: "flat", strikes: 0 }, "a crawl goes straight to the plain stage");
  assert.deepEqual(decide({ tier: "high", verdict: "unknown", strikes: 1 }), { to: null, strikes: 1 }, "no evidence: the doubt stays as it was");
  assert.deepEqual(decide({ tier: "high", verdict: "slow", strikes: 1 }).to, "low");
  assert.deepEqual(decide({ tier: "flat", verdict: "very-slow" }), { to: null, strikes: 0 }, "nowhere lower to go");
  assert.deepEqual(decide({ tier: "high", verdict: "ok", strikes: 1 }), { to: null, strikes: 0 }, "an ok clears the doubt");
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

test("the limits are sane: a frame that cannot hold 50 a second is slow, 28 very slow, and the tests are a moment, not a minute", () => {
  assert.ok(1000 / SPEED.slowMs >= 45 && 1000 / SPEED.slowMs <= 55);
  assert.ok(1000 / SPEED.veryMs >= 25 && 1000 / SPEED.veryMs <= 30);
  assert.ok(SPEED.settle <= 4000 && SPEED.patience <= 10000 && SPEED.again >= 30000);
  assert.ok(SPEED.take >= SPEED.least * 2);
});
