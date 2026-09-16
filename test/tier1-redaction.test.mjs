// Tier 1 — the redaction core.
//
// The load-bearing test in this file is "removed text is actually gone".
// Everything else is supporting. A redaction that merely *looks* redacted is
// worse than no redaction at all, because the GM will trust it and put real
// campaign secrets behind it.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  CLEARANCE,
  CLEARANCE_MARKING,
  redactHtml,
  redactionTiers,
  assertNoUnprocessedRedactions,
  assertNoNestedRedactions
} from "../module/blank-inheritance/scripts/core/redact.mjs";

const SECRET_PHRASE = "Kurosawa, Ryuu — deceased 04/11";
const DOC =
  `<p>Units listed below are held pending assessment. ` +
  `<redact c="3">${SECRET_PHRASE}</redact> remains ` +
  `<redact c="2">unrecoverable</redact> at time of writing.</p>`;

test("redacted text is absent from the output, not hidden in it", () => {
  const { html } = redactHtml(DOC, CLEARANCE.INTERNAL, { salt: "so-14" });

  // The whole point. Not "is not visible" — is not present.
  assert.ok(!html.includes(SECRET_PHRASE), "the classified phrase survived into the output");
  assert.ok(!html.includes("Kurosawa"), "part of the classified phrase survived");
  assert.ok(!html.includes("unrecoverable"), "the tier-2 phrase survived");

  // And nothing that could reconstruct it: no base64, no data attribute
  // carrying the original, no comment.
  assert.ok(!/<!--/.test(html), "output contains an HTML comment, which could carry the text");
  for (const attrValue of html.matchAll(/="([^"]*)"/g)) {
    assert.ok(
      !attrValue[1].includes("Kurosawa"),
      `an attribute leaked the redacted text: ${attrValue[1]}`
    );
  }

  // The surrounding, unclassified text is untouched.
  assert.ok(html.includes("Units listed below are held pending assessment."));
  assert.ok(html.includes("at time of writing."));
});

test("clearance is inclusive and ordered — higher tiers see more", () => {
  const open = redactHtml(DOC, CLEARANCE.OPEN, { salt: "so-14" });
  const conf = redactHtml(DOC, CLEARANCE.CONFIDENTIAL, { salt: "so-14" });
  const secret = redactHtml(DOC, CLEARANCE.SECRET, { salt: "so-14" });

  assert.equal(open.redactionCount, 2, "an uncleared reader sees both bars");
  assert.equal(conf.redactionCount, 1, "clearance 2 unwraps the c=2 span only");
  assert.equal(secret.redactionCount, 0, "clearance 3 unwraps everything in this document");

  assert.ok(!conf.html.includes(SECRET_PHRASE));
  assert.ok(conf.html.includes("unrecoverable"), "clearance 2 should read the c=2 text");
  assert.ok(secret.html.includes(SECRET_PHRASE), "clearance 3 should read the c=3 text");
});

test("bars are deterministic across renders but differ between documents", () => {
  const a1 = redactHtml(DOC, CLEARANCE.OPEN, { salt: "so-14" }).html;
  const a2 = redactHtml(DOC, CLEARANCE.OPEN, { salt: "so-14" }).html;
  const b = redactHtml(DOC, CLEARANCE.OPEN, { salt: "annex-b" }).html;

  assert.equal(a1, a2, "the same document must render identically or the bars shimmer");
  assert.notEqual(a1, b, "different documents should not share an identical bar pattern");
});

test("bar width is quantised, so exact character count is not recoverable", () => {
  // Two phrases of different length that fall in the same bucket must produce
  // the same nominal width; otherwise the bar is a character-count readout.
  const widths = new Map();
  for (const phrase of ["abcdefghij", "abcdefghijk"]) {
    const { html } = redactHtml(`<redact c="4">${phrase}</redact>`, CLEARANCE.OPEN, { salt: "s" });
    const m = html.match(/--bi-redact-w:([\d.]+)ch/);
    assert.ok(m, "no width was emitted");
    widths.set(phrase, Number(m[1]));
  }
  const [w10, w11] = [...widths.values()];
  assert.ok(
    Math.abs(w10 - w11) < 1.6,
    `10 and 11 character phrases produced very different widths (${w10} vs ${w11}) — ` +
      `the bar is leaking exact length.`
  );
});

test("the emitted bar carries a truthful accessible label, not silence", () => {
  const { html } = redactHtml(DOC, CLEARANCE.OPEN, { salt: "so-14" });
  assert.match(html, /aria-label="Redacted[^"]*"/);
  assert.match(html, /role="img"/);
  // The tier is legible — the censorship itself is information the player gets.
  assert.match(html, /data-tier="3"/);
  assert.match(html, /data-tier="2"/);
});

test("nested redact tags are a hard error, not a silent partial parse", () => {
  const nested = `<redact c="3">outer <redact c="4">inner</redact> tail</redact>`;
  assert.throws(() => redactHtml(nested, CLEARANCE.OPEN), /nested/i);
  assert.throws(() => assertNoNestedRedactions(nested), /nested/i);
});

test("malformed tags are errors rather than leaks", () => {
  assert.throws(() => redactHtml(`<redact c="3">no close`, CLEARANCE.OPEN), /unclosed/i);
  assert.throws(() => redactHtml(`stray </redact> tag`, CLEARANCE.OPEN), /no matching open/i);
});

test("an unprocessed redact tag reaching output is a hard error", () => {
  // The safety net for the real disaster: a content path that never called
  // redactHtml would otherwise publish every classified word verbatim.
  assert.throws(
    () => assertNoUnprocessedRedactions(`<p><redact c="3">secret</redact></p>`),
    /unprocessed/i
  );
  assert.doesNotThrow(() => assertNoUnprocessedRedactions(`<p>clean</p>`));
});

test("redactionTiers reports which versions of a document are worth generating", () => {
  assert.deepEqual(redactionTiers(DOC), [2, 3]);
  assert.deepEqual(redactionTiers("<p>nothing classified</p>"), []);
});

test("markup inside a redacted span cannot escape as an unbalanced tag", () => {
  const { html } = redactHtml(
    `<p>a <redact c="4">b <strong>c</strong> d</redact> e</p>`,
    CLEARANCE.OPEN,
    { salt: "s" }
  );
  assert.ok(!html.includes("<strong>"), "inner markup leaked out of the redaction");
  assert.ok(!html.includes("</strong>"), "an unbalanced closing tag leaked out");
  assert.ok(html.includes("a ") && html.includes(" e"), "surrounding text was damaged");
});

test("clearance markings are the real Japanese document markings", () => {
  assert.equal(CLEARANCE_MARKING[4].kanji, "極秘");
  assert.equal(CLEARANCE_MARKING[3].kanji, "機密");
  assert.equal(CLEARANCE_MARKING[2].kanji, "秘");
  assert.equal(CLEARANCE_MARKING[1].kanji, "部外秘");
  // Every tier in CLEARANCE has a marking, or the UI renders undefined.
  for (const tier of Object.values(CLEARANCE)) {
    assert.ok(CLEARANCE_MARKING[tier], `tier ${tier} has no marking`);
  }
});

test("long redactions break into several bars so they wrap across lines", () => {
  // A bar is inline-block and cannot wrap, so one 78ch bar would shove the
  // line off the measure. Real redactions of a long passage are several
  // strokes; this also means the reader counts bars, not characters.
  const long = "removed from the cockpit by cutting crew after the umbilical failed to release";
  const { html } = redactHtml(`<redact c="4">${long}</redact>`, CLEARANCE.OPEN, { salt: "s" });

  const widths = [...html.matchAll(/--bi-redact-w:([\d.]+)ch/g)].map((m) => Number(m[1]));
  assert.ok(widths.length > 1, `a ${long.length}-char phrase produced only one bar`);
  for (const w of widths) {
    assert.ok(w <= 17, `bar of ${w}ch exceeds the max that can sit on one line`);
  }

  // Bars must be separated by a real space, or they cannot wrap.
  assert.match(html, /<\/span> <span class="bi-redacted"/);

  // Only the first bar is announced, so a screen reader says "redacted"
  // once for the run rather than five times.
  assert.equal((html.match(/aria-label="Redacted/g) ?? []).length, 1);
  assert.equal((html.match(/aria-hidden="true"/g) ?? []).length, widths.length - 1);

  assert.ok(!html.includes("cockpit"), "the long phrase leaked");
});

test("the prototype's committed redaction sample matches what the generator emits", async () => {
  // The style prototype must show what the REAL generator produces. If this
  // fails, re-run: node design/ui/build-redaction-sample.mjs
  const { readFileSync } = await import("node:fs");
  const path = (await import("node:path")).default;
  const { fileURLToPath } = await import("node:url");
  const { buildSample, renderSampleFile } = await import("../design/ui/build-redaction-sample.mjs");

  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const committed = readFileSync(path.join(repoRoot, "design", "ui", "redaction-sample.js"), "utf8");

  assert.equal(
    renderSampleFile(buildSample()).replace(/\r\n/g, "\n"),
    committed.replace(/\r\n/g, "\n"),
    "design/ui/redaction-sample.js is stale — re-run node design/ui/build-redaction-sample.mjs"
  );
});

test("no tier's published sample contains a higher tier's plaintext", async () => {
  // End-to-end proof on the actual asset the prototype loads, not just on a
  // function's return value.
  const { buildSample, SAMPLE_SOURCE } = await import("../design/ui/build-redaction-sample.mjs");
  const versions = buildSample();

  // Pull the real classified strings straight out of the source, so this test
  // cannot drift out of sync with the sample text.
  const classified = [...SAMPLE_SOURCE.matchAll(/<redact c="(\d+)">([\s\S]*?)<\/redact>/g)]
    .map((m) => ({ tier: Number(m[1]), text: m[2].replace(/\s+/g, " ").trim() }));
  assert.ok(classified.length >= 4, "the sample should exercise several tiers");

  for (const [tierKey, version] of Object.entries(versions)) {
    const viewer = Number(tierKey);
    const flat = version.html.replace(/\s+/g, " ");
    for (const { tier, text } of classified) {
      if (viewer >= tier) continue;
      assert.ok(
        !flat.includes(text),
        `the tier-${viewer} sample leaks tier-${tier} text: "${text.slice(0, 40)}..."`
      );
    }
  }
});
