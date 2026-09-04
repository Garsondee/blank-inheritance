// Tests computeLocalChecksums() against a small committed fixture directory.
// Expected hashes were computed independently via coreutils `sha256sum`
// directly on the fixture files (2026-09-05), not derived from our own
// hashFile() implementation -- so this actually catches a broken hash
// implementation, not just "hashes itself consistently."

import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { computeLocalChecksums } from "../../tools/module-sync/local-hash.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(here, "fixtures", "local-hash-sample");

test("computeLocalChecksums: matches real sha256sum output for every fixture file", async () => {
  const result = await computeLocalChecksums(fixtureDir);
  assert.deepEqual(
    [...result.entries()].sort(),
    [
      ["greeting.txt", "a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447"],
      ["subdir/nested.json", "2b95532169975c434453da626625cc4cd868a9d2074393b23b8ba47f8cb78aed"],
    ]
  );
});

test("computeLocalChecksums: paths are POSIX-style (forward slash) regardless of platform, matching parseChecksumLines' normalization", async () => {
  const result = await computeLocalChecksums(fixtureDir);
  for (const key of result.keys()) {
    assert.ok(!key.includes("\\"), `expected no backslashes in "${key}"`);
  }
  assert.ok(result.has("subdir/nested.json"));
});
