// Pure parser tests for tools/audio-pipeline/core/ffmpeg-parse.mjs.
// Every fixture under fixtures/ is REAL ffmpeg 9.0.1 / ffprobe output captured
// from files in audio/in-tray/ on 2026-09-17 — not hand-written approximations
// of what the tools print. If ffmpeg's log format ever changes, re-capture
// them and this suite says exactly which field moved.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createEbur128Accumulator,
  createSilenceAccumulator,
  parseEbur128Log,
  parseFfmpegVersion,
  parseProbe
} from "../../tools/audio-pipeline/core/ffmpeg-parse.mjs";

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");
const read = (name) => readFileSync(path.join(fixtures, name), "utf8");

test("ebur128: a one-second interface sound — summary values, and no short-term reading at all", () => {
  const r = parseEbur128Log(read("ebur128-short-sfx.log"));
  assert.equal(r.integratedLufs, -15.5);
  assert.equal(r.integratedThresholdLufs, -25.5);
  assert.equal(r.lraLu, 0);
  assert.equal(r.truePeakDbtp, -0.9);
  assert.equal(r.maxMomentaryLufs, -11.2);
  assert.equal(r.maxShortTermLufs, null, "a 1.3s clip never fills the 3s short-term window; -120.7 placeholders must not read as a level");
  assert.equal(r.frames, 12);
});

test("ebur128: a music excerpt — maxima come from the frame log, the rest from the summary", () => {
  const r = parseEbur128Log(read("ebur128-music-excerpt.log"));
  assert.equal(r.integratedLufs, -15.6);
  assert.equal(r.lraLu, 4.4);
  assert.equal(r.lraLowLufs, -18.1);
  assert.equal(r.lraHighLufs, -13.8);
  assert.equal(r.truePeakDbtp, -0.4);
  assert.equal(r.maxMomentaryLufs, -16.0);
  assert.equal(r.maxShortTermLufs, -18.5);
  assert.equal(r.frames, 40);
  assert.equal(r.decodedDurationSec, 4.1, "the last frame's timestamp is how much audio actually decoded");
});

test("decoded duration is what the parser reports, not what a container header claims", () => {
  // The real case this exists for: an MP3 in this library whose header says
  // 358s while 89s decodes. Only the frame log knows the truth.
  const log = ["[Parsed_ebur128_0 @ 0] t: 89.5999 TARGET:-23 LUFS    M: -16.0 S: -18.5     I: -18.0 LUFS       LRA:   4.0 LU"].join("\n");
  assert.equal(parseEbur128Log(log).decodedDurationSec, 89.7);
  assert.equal(parseEbur128Log("no frames here").decodedDurationSec, null);
});

test("ebur128: the streaming accumulator gives the same answer as parsing the whole log", () => {
  const text = read("ebur128-music-excerpt.log");
  const acc = createEbur128Accumulator();
  for (const line of text.split(/\r?\n/)) acc.push(line);
  assert.deepEqual(acc.result(), parseEbur128Log(text));
});

test("silencedetect: leading and trailing silence of a real track, including an end line printed after the summary", () => {
  const acc = createSilenceAccumulator();
  for (const line of read("ebur128-music-excerpt.log").split(/\r?\n/)) acc.push(line);
  const r = acc.result(92.11575);
  assert.equal(r.leadingSilenceSec, 1.35);
  assert.equal(r.trailingSilenceSec, 2.489);
  assert.equal(r.silentThroughout, false);
});

test("silencedetect: a silence still open at end of file is closed at the file's duration", () => {
  const acc = createSilenceAccumulator();
  acc.push("[Parsed_silencedetect_1 @ 0] silence_start: 8.5");
  const r = acc.result(10);
  assert.equal(r.trailingSilenceSec, 1.5);
  assert.equal(r.leadingSilenceSec, 0);
});

test("silencedetect: a file silent from start to finish says so, and does not double-count it as trailing", () => {
  const acc = createSilenceAccumulator();
  acc.push("silence_start: 0");
  const r = acc.result(4);
  assert.equal(r.silentThroughout, true);
  assert.equal(r.leadingSilenceSec, 4);
  assert.equal(r.trailingSilenceSec, 0);
});

test("ffprobe: a 96k/24-bit sound-library WAV, with its BEXT description kept", () => {
  const p = parseProbe(read("ffprobe-wav-bext.json"));
  assert.equal(p.container, "wav");
  assert.equal(p.codec, "pcm_s24le");
  assert.equal(p.sampleRate, 96000);
  assert.equal(p.channels, 2);
  assert.equal(p.bitsPerSample, 24);
  assert.equal(p.lossless, true);
  assert.equal(p.durationSec, 1.291);
  assert.equal(p.tags.comment, "Monitor, Turn, On, Power, Up");
  assert.equal(p.tags.coding_history, undefined, "only tags the pipeline uses are kept");
});

test("ffprobe: an MP3 with ID3 tags — lossy, its bitrate and title kept", () => {
  const p = parseProbe(read("ffprobe-mp3.json"));
  assert.equal(p.codec, "mp3");
  assert.equal(p.sampleRate, 44100);
  assert.equal(p.bitRate, 128000);
  assert.equal(p.lossless, false);
  assert.equal(p.tags.title, "Misato");
  assert.ok(p.durationSec > 92 && p.durationSec < 92.2);
});

test("ffprobe: a file with no audio stream is an error, not an empty result", () => {
  assert.throws(() => parseProbe({ streams: [{ codec_type: "video" }], format: {} }), /no audio stream/);
});

test("ffmpeg version line", () => {
  assert.equal(parseFfmpegVersion("ffmpeg version 9.0.1-essentials_build-www.gyan.dev Copyright (c) 2000-2026"), "9.0.1-essentials_build-www.gyan.dev");
  assert.equal(parseFfmpegVersion("nothing useful"), null);
});
