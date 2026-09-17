// tools/audio-pipeline/core/library-build.mjs — above all, that an asset's id
// survives everything a human does to the files, because reservations, review
// decisions and cues all point at ids.

import { test } from "node:test";
import assert from "node:assert/strict";

import { assignIds, compactAnalysis, libraryDocument, libraryEntry, needsEncode, summariseRun } from "../../tools/audio-pipeline/core/library-build.mjs";

const lib = (...assets) => ({ assets });
const prior = (id, relPath, sha256) => ({ id, source: { path: `audio/in-tray/${relPath}`, sha256 } });

test("new files get readable ids from their names", () => {
  const ids = assignIds([{ relPath: "unorganised/Cicadas_BW.174.wav", sha256: "a" }, { relPath: "music/fun/Misato.mp3", sha256: "b" }], null);
  assert.equal(ids.get("unorganised/Cicadas_BW.174.wav"), "cicadas-174");
  assert.equal(ids.get("music/fun/Misato.mp3"), "misato");
});

test("a file moved to another mood folder keeps its id (matched by content)", () => {
  const previous = lib(prior("misato", "music/fun/Misato.mp3", "sha-m"));
  const ids = assignIds([{ relPath: "music/relaxed/Misato (remaster).mp3", sha256: "sha-m" }], previous);
  assert.equal(ids.get("music/relaxed/Misato (remaster).mp3"), "misato");
});

test("a file edited in place keeps its id (matched by path)", () => {
  const previous = lib(prior("misato", "music/fun/Misato.mp3", "old"));
  const ids = assignIds([{ relPath: "music/fun/Misato.mp3", sha256: "new" }], previous);
  assert.equal(ids.get("music/fun/Misato.mp3"), "misato");
});

test("an id is never recycled: a deleted asset's id cannot be handed to a different new file", () => {
  const previous = lib(prior("misato", "music/fun/Misato.mp3", "gone"));
  const ids = assignIds([{ relPath: "music/sad/Misato.mp3", sha256: "different-song-same-name" }], previous);
  assert.equal(ids.get("music/sad/Misato.mp3"), "misato-2", "a reservation for the old 'misato' must not silently start meaning this one");
});

test("two new files that slug the same get distinct ids, deterministically", () => {
  const sources = [
    { relPath: "music/fun/Theme.mp3", sha256: "1" },
    { relPath: "music/sad/Theme.mp3", sha256: "2" }
  ];
  const a = assignIds(sources, null);
  const b = assignIds([...sources].reverse(), null);
  assert.deepEqual([...a.entries()].sort(), [...b.entries()].sort(), "input order must not change who gets which id");
  assert.equal(new Set(a.values()).size, 2);
});

test("identical bytes in two places do not share an id", () => {
  const previous = lib(prior("hit", "unorganised/Hit.wav", "same"));
  const ids = assignIds([{ relPath: "unorganised/Hit.wav", sha256: "same" }, { relPath: "unorganised/Hit copy.wav", sha256: "same" }], previous);
  assert.equal(ids.get("unorganised/Hit.wav"), "hit");
  assert.notEqual(ids.get("unorganised/Hit copy.wav"), "hit");
});

test("library entries carry facts only — no review fields — and the document sorts them", () => {
  const e = libraryEntry({
    id: "b",
    relPath: "x/b.wav",
    sha256: "s",
    bytes: 10,
    probe: { codec: "pcm_s24le", durationSec: 2, tags: { comment: "c" } },
    analysis: { integratedLufs: -20, frames: 99, spans: [] },
    proposal: { kind: "sfx" }
  });
  assert.equal(e.source.path, "audio/in-tray/x/b.wav");
  assert.equal(e.analysis.frames, undefined, "scratch fields are not kept");
  assert.equal("status" in e, false);
  const doc = libraryDocument({ entries: [e, { ...e, id: "a" }], ffmpegVersion: "9", generatedAt: "t", root: "r" });
  assert.deepEqual(doc.assets.map((x) => x.id), ["a", "b"]);
  assert.equal(doc.id, "audio-library");
});

test("compactAnalysis keeps the loudness facts and drops the rest", () => {
  assert.deepEqual(compactAnalysis({ integratedLufs: -1, frames: 3, lraLowLufs: -2 }), { integratedLufs: -1 });
  assert.equal(compactAnalysis(null), null);
});

test("needsEncode: never built, plan changed, file missing, file tampered, or up to date", () => {
  const plan = { hash: "h1" };
  assert.equal(needsEncode({ plan, previousEncode: null, outputSha256: null }).reason, "never processed");
  assert.equal(needsEncode({ plan, previousEncode: { planHash: "h0", sha256: "s" }, outputSha256: "s" }).reason, "processing plan changed");
  assert.equal(needsEncode({ plan, previousEncode: { planHash: "h1", sha256: "s" }, outputSha256: null }).reason, "processed file missing");
  assert.equal(needsEncode({ plan, previousEncode: { planHash: "h1", sha256: "s" }, outputSha256: "t" }).reason, "processed file changed on disk");
  assert.deepEqual(needsEncode({ plan, previousEncode: { planHash: "h1", sha256: "s" }, outputSha256: "s" }), { needed: false, reason: "up to date" });
});

test("summariseRun counts kinds and bytes", () => {
  const text = summariseRun(
    [
      { proposal: { kind: "music" }, source: { bytes: 1048576 }, encode: { bytes: 524288 } },
      { proposal: { kind: "sfx" }, source: { bytes: 1048576 }, encode: null }
    ],
    { encoded: 1, skipped: 1, failed: [{ id: "bad" }] }
  );
  assert.match(text, /2 assets: 1 music, 1 sfx/);
  assert.match(text, /sources 2\.0 MB -> processed 0\.5 MB/);
  assert.match(text, /1 FAILED: bad/);
});
