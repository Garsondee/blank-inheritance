// Pure logic tests for tools/module-sync/checksums.mjs -- no filesystem, no
// network. See test/module-sync/local-hash.test.mjs for the (still-offline,
// but real-fs) file-hashing tests, and tools/module-sync/remote.mjs's own
// header comment for why the actual pscp/plink adapter has no test here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseChecksumLines, diffChecksums, summarizeDiff } from "../../tools/module-sync/checksums.mjs";

test("parseChecksumLines: accepts Linux coreutils format (two-space separator)", () => {
  const result = parseChecksumLines("abc123  ./foo/bar.json\ndef456  ./baz.txt\n");
  assert.deepEqual(
    [...result.entries()],
    [
      ["foo/bar.json", "abc123"],
      ["baz.txt", "def456"],
    ]
  );
});

test("parseChecksumLines: accepts Windows/MinGW coreutils format (space-asterisk separator) identically", () => {
  const linux = parseChecksumLines("abc123  ./foo/bar.json\n");
  const windows = parseChecksumLines("abc123 *./foo/bar.json\n");
  assert.deepEqual([...linux.entries()], [...windows.entries()]);
});

test("parseChecksumLines: normalizes hash case and strips a leading ./", () => {
  const result = parseChecksumLines("ABC123  ./x.txt\n");
  assert.equal(result.get("x.txt"), "abc123");
});

test("parseChecksumLines: ignores blank lines", () => {
  const result = parseChecksumLines("abc123  ./a.txt\n\n\ndef456  ./b.txt\n");
  assert.equal(result.size, 2);
});

test("parseChecksumLines: throws on a genuinely unparseable line rather than silently skipping it", () => {
  assert.throws(() => parseChecksumLines("this is not a checksum line"), /Could not parse/);
});

test("diffChecksums: identical maps are fully verified", () => {
  const map = new Map([["a.txt", "hash1"], ["b.txt", "hash2"]]);
  const diff = diffChecksums(map, new Map(map));
  assert.equal(diff.isVerified, true);
  assert.deepEqual(diff.unchanged, ["a.txt", "b.txt"]);
  assert.deepEqual(diff.changed, []);
});

test("diffChecksums: a file present on both sides with a different hash is 'changed', not 'added'+'removed'", () => {
  const local = new Map([["a.txt", "hash1"]]);
  const remote = new Map([["a.txt", "hash2"]]);
  const diff = diffChecksums(local, remote);
  assert.equal(diff.isVerified, false);
  assert.deepEqual(diff.changed, ["a.txt"]);
  assert.deepEqual(diff.onlyLocal, []);
  assert.deepEqual(diff.onlyRemote, []);
});

test("diffChecksums: a file only in the local map is onlyLocal (not yet pushed)", () => {
  const diff = diffChecksums(new Map([["new.txt", "h"]]), new Map());
  assert.deepEqual(diff.onlyLocal, ["new.txt"]);
  assert.equal(diff.isVerified, false);
});

test("diffChecksums: a file only in the remote map is onlyRemote (deleted locally, still on server)", () => {
  const diff = diffChecksums(new Map(), new Map([["stale.txt", "h"]]));
  assert.deepEqual(diff.onlyRemote, ["stale.txt"]);
  assert.equal(diff.isVerified, false);
});

test("diffChecksums: does not falsely verify just because the SET of hashes matches when paths are actually swapped", () => {
  // Regression guard for exactly the edge case that motivated comparing
  // path+hash together rather than hash sets alone.
  const local = new Map([["a.txt", "hash1"], ["b.txt", "hash2"]]);
  const remote = new Map([["a.txt", "hash2"], ["b.txt", "hash1"]]); // same two hashes, swapped
  const diff = diffChecksums(local, remote);
  assert.equal(diff.isVerified, false);
  assert.deepEqual(diff.changed, ["a.txt", "b.txt"]);
});

test("summarizeDiff: verified case names the file count", () => {
  const diff = diffChecksums(new Map([["a.txt", "h"]]), new Map([["a.txt", "h"]]));
  assert.match(summarizeDiff(diff), /VERIFIED.*1 files match/);
});

test("summarizeDiff: mismatch case names each category present, omits categories with nothing in them", () => {
  const diff = diffChecksums(new Map([["a.txt", "h1"]]), new Map([["a.txt", "h2"], ["stale.txt", "h3"]]));
  const summary = summarizeDiff(diff);
  assert.match(summary, /MISMATCH/);
  assert.match(summary, /1 changed/);
  assert.match(summary, /1 only remote/);
  assert.doesNotMatch(summary, /only local/);
});

// --- The harvest direction reads the same diff inverted ------------------
//
// sync-harvest.mjs calls diffChecksums(remoteMap, localMap) — the server in
// the FIRST position, because on a pull the server is the source of truth
// rather than the destination. That swap silently inverts what two of the
// four result fields mean, and getting it backwards would report a failed
// download as "history, nothing to worry about". Pinned here because the
// field names cannot be made to read correctly for both directions at once.

test("pulled: a file on the server that did not arrive locally lands in onlyLocal", () => {
  const remote = new Map([["sessions/2026-09-09.json", "h1"], ["runs/head-height.json", "h2"]]);
  const pulled = new Map([["sessions/2026-09-09.json", "h1"]]);
  const diff = diffChecksums(remote, pulled);
  assert.deepEqual(diff.onlyLocal, ["runs/head-height.json"], "a failed download must be distinguishable from history");
  assert.deepEqual(diff.onlyRemote, []);
});

test("pulled: a file the repo kept from an earlier harvest lands in onlyRemote", () => {
  const remote = new Map([["sessions/2026-09-09.json", "h1"]]);
  const pulled = new Map([["sessions/2026-09-09.json", "h1"], ["sessions/2026-08-01.json", "old"]]);
  const diff = diffChecksums(remote, pulled);
  assert.deepEqual(diff.onlyRemote, ["sessions/2026-08-01.json"], "an older harvest is history, not a fault");
  assert.deepEqual(diff.onlyLocal, [], "and must not be counted as a failed download");
});

test("pulled: content that arrived different is `changed` in either direction", () => {
  const diff = diffChecksums(new Map([["a.json", "h1"]]), new Map([["a.json", "h2"]]));
  assert.deepEqual(diff.changed, ["a.json"]);
});
