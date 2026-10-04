// How often the stage draws (core/pace.mjs): the player's own cap from Foundry's settings, and easing off to 30 a second
// while nothing moves, with the frame rate read honestly against whichever rate was asked for.

import { test } from "node:test";
import assert from "node:assert/strict";
import { PACE, Pace, capFrom, poseOf, moved } from "../scripts/core/pace.mjs";

/** Offer frames to a pace at a display's refresh rate for `seconds`, with `awake(now)` saying whether anything moves; returns the frames drawn. */
function drawn(pace, { hz = 60, seconds = 2, awake = () => false, from = 0 } = {}) {
  const gap = 1000 / hz;
  const at = [];
  for (let now = from; now < from + seconds * 1000; now += gap) {
    if (awake(now)) pace.poke(now);
    if (!pace.due(now)) continue;
    pace.drew(now);
    at.push(now);
  }
  return at;
}

test("Foundry's own cap: its Maximum Framerate, never past 60, uncapped only in its Maximum performance mode", () => {
  assert.equal(capFrom({ fps: 60 }), 60);
  assert.equal(capFrom({ fps: 30 }), 30);
  assert.equal(capFrom({ fps: 10 }), 10);
  assert.equal(capFrom({ fps: 200 }), 60, "never past 60");
  assert.equal(capFrom({ fps: 3 }), 10, "nor under 10");
  assert.equal(capFrom({ fps: null }), 60, "no setting: 60");
  assert.equal(capFrom({ fps: "x" }), 60);
  assert.equal(capFrom({ fps: 60, mode: 3, max: 3 }), Infinity, "Maximum mode at 60 lets the display lead, as Foundry's own canvas does");
  assert.equal(capFrom({ fps: 40, mode: 3, max: 3 }), 40, "but a lower cap is a lower cap in any mode");
  assert.equal(capFrom({ fps: 60, mode: 2, max: 3 }), 60);
  assert.equal(capFrom({ fps: 60, mode: null, max: null }), 60);
});

test("at rest the stage draws at the cap on a 60 Hz display, whatever the frame jitter", () => {
  const pace = new Pace({ cap: 60 });
  const frames = drawn(pace, { hz: 60, seconds: 2, awake: () => true });
  assert.ok(frames.length >= 118 && frames.length <= 121, `${frames.length} in two seconds`);
});

test("a fast display is held to the cap: 144 Hz draws about 60 a second, not 144", () => {
  const frames = drawn(new Pace({ cap: 60 }), { hz: 144, seconds: 2, awake: () => true });
  assert.ok(frames.length >= 112 && frames.length <= 124, `${frames.length} in two seconds at 144 Hz`);
  const uncapped = drawn(new Pace({ cap: Infinity }), { hz: 144, seconds: 1, awake: () => true });
  assert.ok(uncapped.length >= 140, "Foundry uncapped: the display leads");
});

test("the player's lower cap is obeyed, and a cap is never exceeded however many frames are offered", () => {
  const frames = drawn(new Pace({ cap: 30 }), { hz: 120, seconds: 2, awake: () => true });
  assert.ok(frames.length >= 58 && frames.length <= 62, `${frames.length} in two seconds at a cap of 30`);
});

test("when nothing moves the stage eases off to half, and wakes the moment something does", () => {
  const pace = new Pace({ cap: 60, idle: 30, wake: 1500 });
  drawn(pace, { hz: 60, seconds: 1, awake: () => true });                         // a busy second first
  const still = drawn(pace, { hz: 60, seconds: 4, awake: () => false, from: 1000 });
  const tail = still.filter((t) => t >= 3000);                                    // after the wake time has run out
  assert.ok(tail.length >= 58 && tail.length <= 62, `${tail.length} in the last two seconds of stillness: about 30 a second`);
  const woke = drawn(pace, { hz: 60, seconds: 1, awake: () => true, from: 5000 });
  assert.ok(woke.length >= 58 && woke.length <= 61, `${woke.length} the second after something moved: back at 60`);
  const after = drawn(pace, { hz: 60, seconds: 4, awake: () => false, from: 6000 });
  assert.ok(after.filter((t) => t < 7400).length >= 80, "and it stays at full rate for the wake time after the last movement");
  const later = after.filter((t) => t >= 8500 && t < 9500);
  assert.ok(later.length >= 28 && later.length <= 32, `${later.length} a second once the wake time is over`);
});

test("easing off can be turned off by the player", () => {
  const pace = new Pace({ cap: 60, easing: false });
  const frames = drawn(pace, { hz: 60, seconds: 3, awake: () => false });
  assert.ok(frames.length >= 177, `${frames.length}: never eased`);
  assert.equal(pace.active(1e9), true);
  assert.equal(pace.scale(1e9), 1);
});

test("a stall does not make the stage race to catch up", () => {
  const pace = new Pace({ cap: 60 });
  drawn(pace, { hz: 60, seconds: 0.2, awake: () => true });
  pace.drew(5000);                                                                // the tab was away, and came back
  const burst = drawn(pace, { hz: 60, seconds: 0.5, awake: () => true, from: 5017 });
  assert.ok(burst.length <= 32, `${burst.length} in half a second: no catching up`);
});

test("a frame rate read while easing off is read against what was asked for, so a still stage is not a slow computer", () => {
  const pace = new Pace({ cap: 60, idle: 30 });
  pace.poke(0);
  assert.equal(pace.scale(0), 1, "full rate: as it is");
  assert.equal(Math.round(pace.scale(10000) * 100) / 100, 0.5, "a 33 ms gap at idle reads as a 16.7 ms gap");
  const cheap = new Pace({ cap: 30, idle: 30 });
  assert.equal(cheap.scale(10000), 1, "a cap that is already the idle rate has nothing to ease");
  assert.equal(new Pace({ cap: Infinity }).scale(0), 1, "uncapped: nothing to compare against");
});

test("what counts as moving: a walk, a stick coming out, a card going down, a card arriving or leaving; the cards' ambient life does not", () => {
  const cards = [{ id: "a", x: 10, z: -50, lift: 0, lean: 0, yaw: 0, pitch: 0, grip: 0, scale: 1, down: 0, breathe: 1, squash: 1 }, { id: "b", x: -90, z: -20, lift: 0, lean: 0, yaw: 30, pitch: 0, grip: 0, scale: 1, down: 0, breathe: 1, squash: 1 }];
  const base = poseOf(cards);
  const alter = (i, over) => cards.map((c, k) => (k === i ? { ...c, ...over } : c));
  assert.equal(moved(null, base), false, "the first frame has nothing to compare with");
  assert.equal(moved(base, poseOf(cards)), false, "the same pose");
  // measured on a still stage (the bench's Paper Lantern): a bobbing card changes its lift by up to a pixel a frame, a lean by half a degree
  assert.equal(moved(base, poseOf(alter(0, { breathe: 1.04, squash: 0.97 }))), false, "breathing is ambient: not a movement");
  assert.equal(moved(base, poseOf(alter(1, { lean: 0.45, lift: 1.04, yaw: 31, pitch: 0.4 }))), false, "a bob, a lean, a glance: ambient, not a movement");
  assert.equal(moved(base, poseOf(alter(1, { lean: 6, lift: 40 }))), false, "even a hop an idle card makes now and then looks the same at 30 a second");
  assert.equal(moved(base, poseOf(alter(0, { x: 11 }))), true, "a step");
  assert.equal(moved(base, poseOf(alter(1, { z: -19 }))), true, "a step towards the table");
  assert.equal(moved(base, poseOf(alter(0, { grip: 1 }))), true, "its stick coming out: a hand has it, here or on another screen");
  assert.equal(moved(base, poseOf(alter(0, { grip: 0.1 }))), true, "and the first tenth of it, a stick is only a few frames long");
  assert.equal(moved(base, poseOf(alter(0, { down: 1 }))), true, "knocked down");
  assert.equal(moved(base, poseOf([...cards, { id: "c" }])), true, "someone arrives");
  assert.equal(moved(base, poseOf(cards.slice(1))), true, "someone leaves");
  assert.equal(moved(base, poseOf(alter(0, { x: 10.01 }))), false, "a hundredth of a unit is stillness");
  assert.equal(moved(base, poseOf(alter(0, { x: 10.3, z: -49.8 }))), false, "so is the last creep of a card that has all but arrived: under a pixel a frame");
});

test("a card that has all but arrived does not keep the stage awake: its creep on the spring's tail is stillness within seconds", () => {
  // measured on the bench: a card sent walking covers 12 units a frame at its fastest, and the critically damped spring that
  // brings it to its place decays by about 1% a frame; at a hundredth of a unit it kept a stage awake for ten seconds more
  const cards = (x) => [{ id: "a", x, z: -50, grip: 0, down: 0 }];
  let x = 0;
  let step = 12;
  let before = poseOf(cards(x));
  let lastMoving = 0;
  for (let frame = 1; frame <= 60 * 20; frame++) {
    x += step;
    step *= 0.991;
    const after = poseOf(cards(x));
    if (moved(before, after)) lastMoving = frame;
    before = after;
  }
  assert.ok(lastMoving / 60 < 6, `${(lastMoving / 60).toFixed(1)} s of full rate for a walk that took ten seconds to settle`);
  assert.ok(lastMoving / 60 > 2, "but a walk in full swing is certainly movement");
});

test("the limits are sane", () => {
  assert.ok(PACE.idle < PACE.cap && PACE.idle >= 20);
  assert.ok(PACE.wake >= 800 && PACE.wake <= 4000);
});
