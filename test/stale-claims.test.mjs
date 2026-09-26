// Stale absence-claim detector -- test. See design/node-registry.md §8's "third bug class"
// and tools/node-registry/detect-stale-claims.mjs's own header for the full reasoning.
//
// Only the HIGH-confidence tier is asserted on (a trigger phrase whose referenced path
// provably exists right now) -- that tier is deliberately conservative and each one found
// here is a real, fixable bug, not noise. The LOW tier is a review list, not a gate; most of
// it is correct as written, and asserting zero-LOW would make this test fail on ordinary,
// true statements about genuinely unwritten things.

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectStaleClaims } from "../tools/node-registry/detect-stale-claims.mjs";

test("no design/idea doc claims a specific file doesn't exist when it actually does", () => {
  const { high } = detectStaleClaims();
  assert.deepEqual(
    high,
    [],
    `${high.length} stale absence claim(s) found -- a doc says a file doesn't exist, but it does:\n` +
      high.map((h) => `  ${h.file}: "${h.trigger}" re: ${h.referencedPath}`).join("\n")
  );
});

test("the detector actually finds a real HIGH-confidence hit when one is synthetically present", async (t) => {
  // Regression guard for the detector itself: prove it can find the exact shape of bug that
  // motivated it (ch1-v2.md claiming the flood-tunnel brief didn't exist after it did) by
  // constructing the same shape in memory, rather than only ever testing against a corpus
  // that -- once this test suite is green -- will have no real examples left to check against.
  const { readFileSync, writeFileSync, mkdtempSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const { repoRoot } = await import("../tools/node-registry/detect-stale-claims.mjs");

  const scratchDir = mkdtempSync(path.join(tmpdir(), "stale-claim-test-"));
  const fakeDesignDir = path.join(repoRoot, "design", `__test-scratch-${process.pid}`);
  const { mkdirSync } = await import("node:fs");
  mkdirSync(fakeDesignDir, { recursive: true });
  const fakeDoc = path.join(fakeDesignDir, "fake.md");
  // Reference a real, known-to-exist file (this test file itself) as "not yet written".
  const realExistingPath = "test/tier0-architecture.test.mjs";
  writeFileSync(
    fakeDoc,
    `# Fake\n\nSome scene is outlined but \`${realExistingPath}\` is not yet written as a brief.\n`
  );

  t.after(() => {
    rmSync(fakeDesignDir, { recursive: true, force: true });
    rmSync(scratchDir, { recursive: true, force: true });
  });

  const { high } = detectStaleClaims();
  const found = high.find((h) => h.referencedPath === realExistingPath && h.file.includes("__test-scratch"));
  assert.ok(found, "detector should flag a synthetic absence claim about a file that provably exists");
});
