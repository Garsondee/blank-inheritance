// Tier 1 — the sound desk's arithmetic (scripts/core/audio-mix.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_MIX,
  FADER_SCALE,
  MAX_BUS_DB,
  SILENCE_DB,
  busGain,
  combineDucks,
  dbToFader,
  dbToGain,
  dbfsToVu,
  duckEnvelope,
  duckHoldMs,
  faderToDb,
  fadeLabel,
  formatDb,
  foundrySliderToVolume,
  gainToDb,
  levelFromSamples,
  nearestFadeStep,
  normaliseMix,
  peakHold,
  volumeToFoundrySlider,
  vuStep,
  withMixChange
} from "../module/blank-inheritance/scripts/core/audio-mix.mjs";

const near = (a, b, eps = 0.01) => assert.ok(Math.abs(a - b) <= eps, `${a} is not within ${eps} of ${b}`);

test("dB and gain convert both ways, with silence exactly zero and never NaN", () => {
  near(dbToGain(0), 1);
  near(dbToGain(-6), 0.501, 0.001);
  near(dbToGain(6), 1.995, 0.001);
  assert.equal(dbToGain(-Infinity), 0);
  assert.equal(dbToGain(SILENCE_DB), 0, "the fader's bottom stop is silence, not -60 dB of leakage");
  assert.equal(dbToGain("junk"), 0);
  near(gainToDb(0.5), -6.02);
  assert.equal(gainToDb(0), -Infinity);
  assert.equal(gainToDb(-1), -Infinity);
  for (const db of [-40, -12.5, -3, 0, 4.5]) near(gainToDb(dbToGain(db)), db, 1e-9);
});

test("fader scale: every printed point reads back exactly, unity sits at 78%, and travel is monotonic", () => {
  for (const [pos, db] of FADER_SCALE) {
    if (!Number.isFinite(db)) continue;
    near(faderToDb(pos), db);
    near(dbToFader(db), pos, 0.0001);
  }
  assert.equal(faderToDb(0.78), 0);
  assert.equal(faderToDb(0), -Infinity);
  assert.equal(faderToDb(1), MAX_BUS_DB);
  assert.equal(faderToDb(7), MAX_BUS_DB, "a position past the top is clamped");
  let last = -Infinity;
  for (let p = 0.01; p <= 1; p += 0.01) {
    const db = faderToDb(p);
    assert.ok(db >= last, `fader went backwards at ${p}`);
    last = db;
  }
});

test("fader scale: dbToFader inverts faderToDb between the printed points too", () => {
  for (const pos of [0.03, 0.12, 0.33, 0.5, 0.61, 0.7, 0.85, 0.95]) near(dbToFader(faderToDb(pos)), pos, 0.001);
  assert.equal(dbToFader(-Infinity), 0);
  assert.equal(dbToFader(99), 1);
});

test("the Radio's knobs use Foundry's own slider law, so they agree with the native Playlists sidebar", () => {
  near(foundrySliderToVolume(0.5), 0.5 ** 1.5, 1e-12);
  near(volumeToFoundrySlider(foundrySliderToVolume(0.37)), 0.37, 1e-12);
  assert.equal(foundrySliderToVolume(-3), 0);
  assert.equal(foundrySliderToVolume(3), 1);
});

test("metering: a full-scale sine reads -3 dB RMS and 0 dB peak; silence reads -Infinity", () => {
  const n = 4800;
  const sine = new Float32Array(n);
  for (let i = 0; i < n; i++) sine[i] = Math.sin((2 * Math.PI * 1000 * i) / 48000);
  const { rmsDb, peakDb } = levelFromSamples(sine);
  near(rmsDb, -3.01, 0.02);
  near(peakDb, 0, 0.01);
  assert.deepEqual(levelFromSamples(new Float32Array(128)), { rmsDb: -Infinity, peakDb: -Infinity });
  assert.deepEqual(levelFromSamples(null), { rmsDb: -Infinity, peakDb: -Infinity });
});

test("VU ballistics: the needle chases the signal smoothly, and falls to rest from silence", () => {
  const step1 = vuStep(-40, -10, 16);
  assert.ok(step1 > -40 && step1 < -10, "moves toward the reading without jumping to it");
  let v = -40;
  for (let i = 0; i < 60; i++) v = vuStep(v, -10, 16);
  near(v, -10, 0.1);
  const falling = vuStep(-10, -Infinity, 16);
  assert.ok(falling < -10 && Number.isFinite(falling));
  near(dbfsToVu(-18), 0);
  assert.equal(dbfsToVu(-Infinity), -Infinity);
});

test("peak lamp: a new peak lights at once, holds, then lets go", () => {
  let s = peakHold(null, -3, 1000);
  assert.deepEqual(s, { db: -3, at: 1000 });
  s = peakHold(s, -12, 1500);
  assert.equal(s.db, -3, "a quieter reading does not dim a held peak");
  s = peakHold(s, -12, 2300);
  assert.equal(s.db, -12, "after the hold time the lamp follows the current peak");
  assert.equal(peakHold({ db: -3, at: 0 }, -Infinity, 5000).db, -Infinity);
});

test("normaliseMix fills, clamps and cleans anything a world setting might hold", () => {
  assert.deepEqual(normaliseMix(undefined), { ...DEFAULT_MIX, muted: { ...DEFAULT_MIX.muted } });
  const m = normaliseMix({ music: 40, ambience: -900, stings: "x", muted: { music: "yes", ambience: true }, duckDb: 5, stray: 1 });
  assert.equal(m.music, MAX_BUS_DB);
  assert.equal(m.ambience, SILENCE_DB);
  assert.equal(m.stings, 0);
  assert.deepEqual(m.muted, { music: false, ambience: true, stings: false }, "only a real boolean true mutes");
  assert.equal(m.duckDb, 0, "a duck can never become a boost");
  assert.equal("stray" in m, false);
});

test("busGain: unity at 0 dB, silent when muted, and an unknown bus is an error", () => {
  assert.equal(busGain({ music: 0 }, "music"), 1);
  assert.equal(busGain({ music: 0, muted: { music: true } }, "music"), 0);
  near(busGain({ ambience: -6 }, "ambience"), 0.501, 0.001);
  assert.throws(() => busGain({}, "dialogue"), /Unknown bus/);
});

test("withMixChange moves one fader and ignores anything that isn't a bus", () => {
  const next = withMixChange({ music: -3, ambience: -6 }, { ambience: -2, muted: { stings: true }, volume: 11 });
  assert.equal(next.music, -3);
  assert.equal(next.ambience, -2);
  assert.equal(next.muted.stings, true);
  assert.equal("volume" in next, false);
});

test("duck envelope: down, hold, up — and no automation at all for a zero or positive depth", () => {
  assert.deepEqual(duckEnvelope({ depthDb: -8, attackMs: 100, holdMs: 2000, releaseMs: 900 }), [
    { atMs: 0, db: 0 },
    { atMs: 100, db: -8 },
    { atMs: 2100, db: -8 },
    { atMs: 3000, db: 0 }
  ]);
  assert.deepEqual(duckEnvelope({ depthDb: 0 }), []);
  assert.deepEqual(duckEnvelope({ depthDb: 3 }), []);
});

test("the duck holds through the hit, not through a long tail (heard live, 2026-09-17)", () => {
  assert.equal(duckHoldMs(0.6), 600);
  assert.equal(duckHoldMs(10.4), 2500, "a war horn's nine-second decay must not pin the music down with it");
  assert.equal(duckHoldMs(0.05), 400, "and a very short hit still holds long enough to be heard");
  assert.equal(duckHoldMs(undefined), 400);
});

test("overlapping ducks hold at the deepest depth until the last one ends", () => {
  const ducks = [
    { depthDb: -6, untilMs: 3000 },
    { depthDb: -10, untilMs: 2000 },
    { depthDb: -4, untilMs: 500 }
  ];
  assert.deepEqual(combineDucks(ducks, 1000), { depthDb: -10, untilMs: 3000 });
  assert.deepEqual(combineDucks(ducks, 2500), { depthDb: -6, untilMs: 3000 });
  assert.equal(combineDucks(ducks, 3000), null);
  assert.equal(combineDucks([], 0), null);
});

test("fade steps snap to the rotary's detents and print the way the desk labels them", () => {
  assert.equal(nearestFadeStep(1300), 1000);
  assert.equal(nearestFadeStep(3100), 4000);
  assert.equal(nearestFadeStep(-50), 0);
  assert.equal(fadeLabel(0), "cut");
  assert.equal(fadeLabel(500), "0.5s");
  assert.equal(fadeLabel(16000), "16s");
});

test("formatDb prints like a desk: signed, one place, infinity for silence, no negative zero", () => {
  assert.equal(formatDb(3), "+3.0");
  assert.equal(formatDb(-12.46), "-12.5");
  assert.equal(formatDb(-0.01), "0.0");
  assert.equal(formatDb(-Infinity), "-∞");
});
