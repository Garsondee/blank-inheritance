// tools/audio-pipeline/core/verify.mjs — "verified as usable", defined in code.

import { test } from "node:test";
import assert from "node:assert/strict";

import { durationToleranceSec, expectedDurationSec, summariseVerification, verifyEntry } from "../../tools/audio-pipeline/core/verify.mjs";

const good = () => ({
  id: "rain",
  source: { durationSec: 120, codec: "pcm_s24le" },
  analysis: { decodedDurationSec: 120 },
  proposal: { kind: "ambience", confidence: "high" },
  encode: { path: "ambience/rain.ogg", sha256: "abc", kind: "ambience", basis: "integrated", targetLufs: -24, shortfallDb: 0, loop: { crossfadeSec: 4 }, trim: null },
  output: { durationSec: 116.01, integratedLufs: -24.3, truePeakDbtp: -9 }
});
const asset = { kind: "ambience", status: "confirmed" };
const ok = { ok: true, code: 0, problems: [] };

test("expected length accounts for trim and the folded-back loop crossfade", () => {
  assert.equal(expectedDurationSec(good()), 116);
  assert.equal(expectedDurationSec({ source: { durationSec: 6 }, encode: { trim: { startSec: 0.4, endSec: 5.5 } } }), 5.1);
});

test("expected length follows what decoded, not a header that lies (regression: a real 358s-header/89s-audio MP3)", () => {
  const entry = { source: { durationSec: 358.5, codec: "mp3" }, analysis: { decodedDurationSec: 89.7 }, encode: { path: "music/x.ogg", sha256: "a", basis: "integrated", targetLufs: -18, shortfallDb: 0 }, output: { durationSec: 89.66, truePeakDbtp: -4 } };
  assert.equal(expectedDurationSec(entry), 89.7);
  const r = verifyEntry({ entry, asset: { kind: "music", status: "confirmed" }, exists: true, sha256: "a", decode: ok });
  assert.equal(r.status, "warn", "the output is right; the SOURCE is what needs looking at");
  assert.match(r.warnings.join(), /header claims 359s but only 90s decodes/);
});

test("a lossy source gets more length tolerance than a lossless one", () => {
  assert.equal(durationToleranceSec({ source: { codec: "mp3" } }), 0.45);
  assert.equal(durationToleranceSec({ source: { codec: "pcm_s24le" } }), 0.25);
  assert.equal(durationToleranceSec({ source: { codec: "flac" } }), 0.25);
  const mp3 = { source: { durationSec: 118, codec: "mp3" }, analysis: { decodedDurationSec: 118.07 }, encode: { path: "m/x.ogg", sha256: "a", basis: "integrated", targetLufs: -18, shortfallDb: 0 }, output: { durationSec: 118.34, truePeakDbtp: -4 } };
  assert.equal(verifyEntry({ entry: mp3, asset: { kind: "music", status: "confirmed" }, exists: true, sha256: "a", decode: ok }).status, "pass", "0.27s of MP3 frame slop is not a fault");
});

test("a present, unchanged, decodable file on target passes", () => {
  const r = verifyEntry({ entry: good(), asset, exists: true, sha256: "abc", decode: ok });
  assert.equal(r.status, "pass", JSON.stringify(r));
});

test("missing, tampered, undecodable, wrong length, over-ceiling: each is a FAIL", () => {
  assert.match(verifyEntry({ entry: good(), asset, exists: false, sha256: null, decode: null }).problems.join(), /missing/);
  assert.match(verifyEntry({ entry: good(), asset, exists: true, sha256: "zzz", decode: ok }).problems.join(), /does not match/);
  assert.match(verifyEntry({ entry: good(), asset, exists: true, sha256: "abc", decode: { ok: false, code: 1, problems: ["Invalid data"] } }).problems.join(), /strict decode failed: Invalid data/);
  const short = good();
  short.output.durationSec = 100;
  assert.match(verifyEntry({ entry: short, asset, exists: true, sha256: "abc", decode: ok }).problems.join(), /length 100\.00s, expected 116\.00s/);
  const hot = good();
  hot.output.truePeakDbtp = 0.2;
  assert.equal(verifyEntry({ entry: hot, asset, exists: true, sha256: "abc", decode: ok }).status, "fail");
  assert.equal(verifyEntry({ entry: { id: "x" }, asset, exists: false }).status, "fail");
});

test("a file built as one kind but since reviewed as another must be reprocessed", () => {
  const r = verifyEntry({ entry: good(), asset: { kind: "sfx" }, exists: true, sha256: "abc", decode: ok });
  assert.match(r.problems.join(), /built as ambience but reviewed as sfx/);
});

test("off-target loudness and a deliberate shortfall are warnings, not failures", () => {
  const off = good();
  off.output.integratedLufs = -27;
  const r = verifyEntry({ entry: off, asset, exists: true, sha256: "abc", decode: ok });
  assert.equal(r.status, "warn");
  assert.match(r.warnings.join(), /integrated loudness -27\.0 LUFS, target -24\.0/);

  const shy = good();
  shy.encode.shortfallDb = 2;
  shy.output.integratedLufs = -26;
  const s = verifyEntry({ entry: shy, asset, exists: true, sha256: "abc", decode: ok });
  assert.equal(s.status, "warn");
  assert.match(s.warnings.join(), /2\.0 dB under target/);
});

test("an unreviewed low-confidence guess is surfaced for a human", () => {
  const e = good();
  e.proposal.confidence = "low";
  const r = verifyEntry({ entry: e, asset: { kind: "ambience", status: "proposed" }, exists: true, sha256: "abc", decode: ok });
  assert.match(r.warnings.join(), /unreviewed/);
});

test("summary lists every failure by id", () => {
  const text = summariseVerification([
    { id: "a", status: "pass", problems: [] },
    { id: "b", status: "fail", problems: ["missing"] },
    { id: "c", status: "skipped", problems: [] }
  ]);
  assert.match(text, /1 pass, 0 warn, 1 FAIL, 1 skipped/);
  assert.match(text, /FAIL b: missing/);
});
