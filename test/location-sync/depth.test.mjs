// Tier 1 — the location depth contract, browser side.
//
// The claim: tools/location-sync/core/depth.mjs agrees with
// tools/location-sync/core/depth.py on every case in the shared fixture. Both
// suites read the same file, so neither implementation can be quietly
// "fixed" into agreement with itself.
//
// Why it matters beyond tidiness: the browser runs this check live in the
// inspector to say what a location still owes at its declared depth, and the
// server runs it at promotion. If the two ever disagree, the tool tells you a
// location is finished and the promotion path refuses it — or worse, lets
// through a depth-3 location with no history section because the browser
// said it was fine.
//
// Specification: design/location-depth.md.
// Python half: test/location-sync/test_depth.py.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { check, suggestDepth, DEPTHS, SPEC, wordCount } from
  "../../tools/location-sync/core/depth.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const FIXTURE = JSON.parse(
  readFileSync(join(here, "..", "fixtures", "gazetteer-depth-cases.json"), "utf8"));

test("the fixture is actually populated", () => {
  assert.ok(FIXTURE.cases.length >= 10, "expected a real spread of check cases");
  assert.ok(FIXTURE.suggestCases.length >= 3);
});

test("every fixture case checks exactly as specified", () => {
  for (const { why, doc, expect } of FIXTURE.cases) {
    const got = check(doc);
    const where = `case: ${why}`;

    if (expect.known !== undefined) {
      assert.equal(got.known, expect.known, `${where} — known`);
    }
    if (expect.depth !== undefined) {
      assert.equal(got.depth, expect.depth, `${where} — depth`);
    }
    assert.equal(got.ok, expect.ok, `${where} — ok (missing: ${got.missing.join("; ")})`);

    if (expect.missing !== undefined) {
      assert.deepEqual(got.missing, expect.missing, `${where} — missing`);
    }
    if (expect.missingCount !== undefined) {
      assert.equal(got.missing.length, expect.missingCount,
        `${where} — missing count, got: ${got.missing.join("; ")}`);
    }
    if (expect.overweightCount !== undefined) {
      assert.equal(got.overweight.length, expect.overweightCount,
        `${where} — overweight count, got: ${got.overweight.join("; ")}`);
    }
    if (expect.orphanedCount !== undefined) {
      assert.equal(got.orphaned.length, expect.orphanedCount,
        `${where} — orphaned count, got: ${got.orphaned.join("; ")}`);
    }
    if (expect.summaryWords !== undefined) {
      assert.equal(got.summaryWords, expect.summaryWords, `${where} — summaryWords`);
    }
  }
});

test("suggestDepth reports the deepest rung the content would already pass", () => {
  for (const { why, doc, expect } of FIXTURE.suggestCases) {
    assert.equal(suggestDepth(doc), expect, `case: ${why}`);
  }
});

test("requirements only ever grow with depth", () => {
  // The property the whole ladder rests on, and the reason suggestDepth can
  // stop at the deepest passing rung rather than checking every combination:
  // anything a shallow depth demands, every deeper one demands too.
  for (let i = 1; i < DEPTHS.length; i++) {
    const shallow = SPEC[DEPTHS[i - 1]];
    const deep = SPEC[DEPTHS[i]];
    for (const field of shallow.text) {
      assert.ok(deep.text.includes(field),
        `${DEPTHS[i]} dropped the text field "${field}" that ${DEPTHS[i - 1]} requires`);
    }
    for (const [list, least] of Object.entries(shallow.lists)) {
      assert.ok((deep.lists[list] || 0) >= least,
        `${DEPTHS[i]} asks for less "${list}" than ${DEPTHS[i - 1]} does`);
    }
  }
});

test("a depth-0 ceiling that fits the entries which define depth 0", () => {
  // Regression guard on the retune recorded in the spec. The ceiling was
  // first guessed at 40 words and flagged 19 of the 36 hand-written entries
  // in the first real session — entries Ingram named as the depth-0
  // standard, so the ceiling was wrong rather than the entries. Anything
  // that tightens it back below the observed p90 (62) breaks the same way.
  assert.ok(SPEC.named.totalWords >= 62,
    "the depth-0 ceiling is back under the p90 of real depth-0 entries — it " +
    "will flag honestly-written one-liners as overweight");
});

test("word counting ignores how the whitespace happens to fall", () => {
  assert.equal(wordCount("  two   words \n"), 2);
  assert.equal(wordCount(""), 0);
  assert.equal(wordCount(null), 0);
});
