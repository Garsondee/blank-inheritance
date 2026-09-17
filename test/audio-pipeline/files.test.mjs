// tools/audio-pipeline/adapters/files.mjs — the small filesystem helpers.
// Real files, in a temp directory: these exist to be exercised against a real
// filesystem, which is where the bug this suite was written for actually was.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { listAudioFiles, mapLimit, openCache, readJson, sha256File, writeJson } from "../../tools/audio-pipeline/adapters/files.mjs";

const tmp = () => mkdtempSync(path.join(os.tmpdir(), "bi-audio-test-"));

test("writeJson leaves no temp file behind, even when the same target is written repeatedly", () => {
  const dir = tmp();
  try {
    const file = path.join(dir, "nested", "library.json");
    for (let i = 0; i < 5; i++) writeJson(file, { run: i });
    assert.deepEqual(readJson(file), { run: 4 });
    assert.deepEqual(readdirSync(path.dirname(file)), ["library.json"], "a stray .tmp means a crashed write, or the EPERM race of 2026-09-17");
    assert.ok(readFileSync(file, "utf8").endsWith("\n"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("writeJson: concurrent writers never collide on one temp name (regression: EPERM mid-encode, 2026-09-17)", async () => {
  const dir = tmp();
  try {
    const file = path.join(dir, "library.json");
    // Same shape as the encoder's checkpoints: several workers, one target.
    await mapLimit(
      Array.from({ length: 24 }, (_, i) => i),
      8,
      async (i) => {
        writeJson(file, { worker: i });
      }
    );
    assert.ok(readJson(file).worker >= 0);
    assert.deepEqual(
      readdirSync(dir).filter((f) => f.includes(".tmp")),
      [],
      "a temp file survived, which is exactly what broke one asset's record mid-run"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("readJson returns the fallback for a file that isn't there", () => {
  assert.equal(readJson(path.join(os.tmpdir(), "definitely-not-here-bi.json"), null), null);
  assert.deepEqual(readJson(path.join(os.tmpdir(), "definitely-not-here-bi.json"), { a: 1 }), { a: 1 });
});

test("listAudioFiles finds audio recursively, ignores everything else, and sorts stably", () => {
  const dir = tmp();
  try {
    mkdirSync(path.join(dir, "music", "battle"), { recursive: true });
    writeFileSync(path.join(dir, "music", "battle", "b.mp3"), "x");
    writeFileSync(path.join(dir, "music", "a.WAV"), "x");
    writeFileSync(path.join(dir, "notes.txt"), "x");
    writeFileSync(path.join(dir, ".hidden.mp3"), "x");
    const found = listAudioFiles(dir);
    assert.deepEqual(found.map((f) => f.relPath), ["music/a.WAV", "music/battle/b.mp3"]);
    assert.ok(found[0].size > 0 && Number.isFinite(found[0].mtimeMs));
    assert.deepEqual(listAudioFiles(path.join(dir, "nope")), [], "a missing tree is empty, not an error");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("sha256File hashes real bytes", async () => {
  const dir = tmp();
  try {
    const file = path.join(dir, "a.bin");
    writeFileSync(file, "abc");
    assert.equal(await sha256File(file), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the cache only writes when something changed, and survives a reopen", () => {
  const dir = tmp();
  try {
    const cache = openCache(dir, "hashes");
    cache.flush();
    assert.deepEqual(readdirSync(dir), [], "nothing changed, so nothing was written");
    cache.set("a.wav", { sha256: "x" });
    cache.flush();
    const reopened = openCache(dir, "hashes");
    assert.deepEqual(reopened.get("a.wav"), { sha256: "x" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mapLimit keeps input order and honours its concurrency bound", async () => {
  let live = 0;
  let peak = 0;
  const out = await mapLimit([10, 20, 30, 40, 50], 2, async (n) => {
    live += 1;
    peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, n % 20));
    live -= 1;
    return n * 2;
  });
  assert.deepEqual(out, [20, 40, 60, 80, 100]);
  assert.ok(peak <= 2, `ran ${peak} at once with a limit of 2`);
});
