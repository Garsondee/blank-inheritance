// tools/audio-pipeline/core/encode-plan.mjs — what gets done to each file and
// the exact ffmpeg command that does it. Pure; nothing here runs ffmpeg.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  bitrateFor,
  ffmpegArgsFor,
  loopCrossfadeFor,
  planEncode,
  secondPassCorrection,
  trimFor
} from "../../tools/audio-pipeline/core/encode-plan.mjs";

const wav = { lossless: true, channels: 2, durationSec: 120, bitRate: 4608000 };
const loud = { integratedLufs: -12, truePeakDbtp: -0.5, maxShortTermLufs: -9, maxMomentaryLufs: -7 };

test("bitrate: lossless sources get the kind's profile; a lossy source is never inflated past what it arrived with", () => {
  assert.equal(bitrateFor("music", { lossless: true }), 160);
  assert.equal(bitrateFor("music", { lossless: false, bitRate: 128000 }), 128);
  assert.equal(bitrateFor("music", { lossless: false, bitRate: 320000 }), 160);
  assert.equal(bitrateFor("music", { lossless: false, bitRate: 48000 }), 64, "a starved source still gets a sane floor");
  assert.equal(bitrateFor("voice", { lossless: true }), 64);
  assert.throws(() => bitrateFor("nope", {}), /No encode profile/);
});

test("trim: a sting loses its leading silence (bar a hair) and keeps a quarter second of tail room", () => {
  assert.deepEqual(trimFor("sting", { leadingSilenceSec: 0.3, trailingSilenceSec: 1 }, 5), { startSec: 0.29, endSec: 4.25 });
  assert.equal(trimFor("sting", { leadingSilenceSec: 0.02, trailingSilenceSec: 0.1 }, 5), null, "nothing worth cutting");
  assert.equal(trimFor("music", { leadingSilenceSec: 2, trailingSilenceSec: 3 }, 200), null, "beds are never trimmed");
  assert.equal(trimFor("sfx", { leadingSilenceSec: 4.95, trailingSilenceSec: 0 }, 5), null, "never trim a file down to nothing");
});

test("loop crossfade: about 6% of a bed, clamped to 1-4 seconds, only for looping beds of useful length", () => {
  assert.deepEqual(loopCrossfadeFor("ambience", true, 120), { crossfadeSec: 4 });
  assert.deepEqual(loopCrossfadeFor("ambience", true, 20), { crossfadeSec: 1.2 });
  assert.deepEqual(loopCrossfadeFor("ambience", true, 13), { crossfadeSec: 1 });
  assert.equal(loopCrossfadeFor("ambience", true, 10), null);
  assert.equal(loopCrossfadeFor("ambience", false, 120), null);
  assert.equal(loopCrossfadeFor("sfx", true, 120), null);
});

test("planEncode: output path by kind and id, channels capped, gain from the loudness plan", () => {
  const plan = planEncode({ asset: { id: "cicadas-174", kind: "ambience", loop: true }, probe: { ...wav, channels: 6 }, analysis: loud });
  assert.equal(plan.outputRel, "ambience/cicadas-174.ogg");
  assert.equal(plan.channels, 2, "5.1 folds down to stereo");
  assert.equal(plan.sampleRate, 48000);
  assert.equal(plan.gainDb, -12, "-12 LUFS down to the ambience target of -24");
  assert.equal(plan.limitDb, null);
  assert.deepEqual(plan.loop, { crossfadeSec: 4 });
  assert.equal(planEncode({ asset: { id: "d", kind: "voice" }, probe: wav, analysis: loud }).channels, 1, "radio chatter is mono");
});

test("planEncode: the hash moves with anything that changes the bytes, and baseHash ignores a second-pass correction", () => {
  const asset = { id: "x", kind: "music" };
  const a = planEncode({ asset, probe: wav, analysis: loud });
  const again = planEncode({ asset, probe: wav, analysis: loud });
  assert.equal(a.hash, again.hash);
  const louder = planEncode({ asset, probe: wav, analysis: { ...loud, integratedLufs: -14 } });
  assert.notEqual(a.hash, louder.hash);
  const corrected = planEncode({ asset, probe: wav, analysis: loud, gainCorrectionDb: -1.2 });
  assert.notEqual(corrected.hash, a.hash);
  assert.equal(corrected.baseHash, a.baseHash, "same underlying plan, so a later run can reuse the correction");
  assert.equal(corrected.gainDb, a.gainDb - 1.2);
});

test("ffmpeg args: an array with paths as their own elements, metadata stripped, Opus at the planned bitrate", () => {
  const plan = planEncode({ asset: { id: "misato", kind: "music" }, probe: wav, analysis: loud });
  const args = ffmpegArgsFor(plan, "E:/in tray/Misato & Co's #1.mp3", "E:/out/music/misato.ogg.part");
  assert.ok(args.includes("E:/in tray/Misato & Co's #1.mp3"), "the input path must be one untouched argument");
  assert.equal(args[args.length - 1], "E:/out/music/misato.ogg.part");
  assert.deepEqual(args.slice(args.indexOf("-map_metadata"), args.indexOf("-map_metadata") + 2), ["-map_metadata", "-1"]);
  assert.equal(args[args.indexOf("-c:a") + 1], "libopus");
  assert.equal(args[args.indexOf("-b:a") + 1], "160k");
  const graph = args[args.indexOf("-filter_complex") + 1];
  assert.match(graph, /aresample=48000/);
  assert.doesNotMatch(graph, /soxr/, "the essentials build has no libsoxr; depending on it made every encode fail");
  assert.match(graph, /volume=-6dB/);
  assert.doesNotMatch(graph, /alimiter/);
  assert.match(graph, /\[out\]$/);
});

test("ffmpeg args: limiter, trim and loop stages appear exactly when planned", () => {
  const quietPeaky = { integratedLufs: -24, truePeakDbtp: -2, maxShortTermLufs: -20, maxMomentaryLufs: -18 };
  const limited = planEncode({ asset: { id: "q", kind: "music" }, probe: wav, analysis: quietPeaky });
  assert.equal(limited.limitDb, -2, "the encode aims under the verification ceiling to absorb codec overshoot");
  assert.match(ffmpegArgsFor(limited, "in", "out")[ffmpegArgsFor(limited, "in", "out").indexOf("-filter_complex") + 1], /alimiter=limit=0\.7499:.*level=false:latency=true/);

  const sting = planEncode({
    asset: { id: "hit", kind: "sting" },
    probe: { ...wav, durationSec: 6 },
    analysis: { ...loud, leadingSilenceSec: 0.4, trailingSilenceSec: 0 }
  });
  const stingGraph = ffmpegArgsFor(sting, "in", "out")[ffmpegArgsFor(sting, "in", "out").indexOf("-filter_complex") + 1];
  assert.match(stingGraph, /^\[0:a\]atrim=start=0\.39:end=6,asetpts=PTS-STARTPTS,afade=t=in:d=0\.005\[trimmed\]/);
  assert.match(stingGraph, /afade=t=out/);

  const bed = planEncode({ asset: { id: "rain", kind: "ambience", loop: true }, probe: wav, analysis: loud });
  const bedGraph = ffmpegArgsFor(bed, "in", "out")[ffmpegArgsFor(bed, "in", "out").indexOf("-filter_complex") + 1];
  assert.match(bedGraph, /asplit=2\[lp_a\]\[lp_b\]/);
  assert.match(bedGraph, /\[lp_a\]atrim=start=4,asetpts=PTS-STARTPTS\[lp_body\]/);
  assert.match(bedGraph, /\[lp_b\]atrim=end=4,asetpts=PTS-STARTPTS\[lp_head\]/);
  assert.match(bedGraph, /\[lp_body\]\[lp_head\]acrossfade=d=4:c1=qsin:c2=qsin\[looped\]/);
});

test("second pass: close enough needs nothing; a real miss is corrected; a deliberate shortfall is never 'corrected' into the limiter", () => {
  const plan = planEncode({ asset: { id: "x", kind: "music" }, probe: wav, analysis: loud });
  assert.equal(secondPassCorrection(plan, { integratedLufs: -18.5 }), 0);
  assert.equal(secondPassCorrection(plan, { integratedLufs: -16.4 }), -1.6);
  assert.equal(secondPassCorrection(plan, { integratedLufs: -20 }), 2);

  const capped = planEncode({ asset: { id: "y", kind: "music" }, probe: wav, analysis: { integratedLufs: -30, truePeakDbtp: -3 } });
  assert.ok(capped.shortfallDb > 0);
  assert.equal(secondPassCorrection(capped, { integratedLufs: -25 }), 0);
});
