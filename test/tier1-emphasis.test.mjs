// Tier 1 — minimal emphasis for authored GM-facing prose, 2026-09-21.
//
// Found live while reading Episode Two's prose: `design/gm-facing-prose-style.md`
// §8 rule 9 sanctions one bold span per field, the corpus holds 80 of them, and
// nothing rendered any of it. Every one reached the GM's screen as literal
// asterisks around the instruction the author had marked as unmissable.

import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEmphasis, hasEmphasis, renderProse } from "../module/blank-inheritance/scripts/core/emphasis.mjs";

// The same escaper the scene runner uses, reproduced here so the test does not
// depend on which module currently owns it.
const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

test("bold and italic render, bold taking precedence", () => {
  assert.equal(applyEmphasis("a **loud** word"), "a <strong>loud</strong> word");
  assert.equal(applyEmphasis("a *quiet* word"), "a <em>quiet</em> word");
  assert.equal(applyEmphasis("**both** and *kinds*"), "<strong>both</strong> and <em>kinds</em>");
  // `**x**` must not be read as an empty italic wrapping `*x*`.
  assert.equal(applyEmphasis("**x**"), "<strong>x</strong>");
});

test("a real authored line from the corpus renders as intended", () => {
  const line = "**Do not let him say they did the right thing.** He will not absolve them.";
  assert.equal(
    renderProse(line, escapeHtml),
    "<strong>Do not let him say they did the right thing.</strong> He will not absolve them."
  );
});

test("an asterisk that is not emphasis is left alone", () => {
  for (const s of [
    "a lone * asterisk",
    "two ** together with nothing between",
    "trailing asterisk *",
    "spaced * out * like this",
    "5 * 4 = 20",
  ]) {
    assert.equal(applyEmphasis(s), s, `changed: ${s}`);
  }
});

test("emphasis does not span a blank line", () => {
  const s = "one *paragraph\n\nand another* one";
  assert.equal(applyEmphasis(s), s);
});

test("SECURITY: emphasis cannot introduce markup, because it runs after escaping", () => {
  // The whole security argument is the ordering. By the time applyEmphasis sees
  // the string, every angle bracket is already an entity.
  const attacks = [
    '<img src=x onerror=alert(1)>',
    '**<script>alert(1)</script>**',
    '*<a href="javascript:alert(1)">click</a>*',
    '**" onmouseover="alert(1)**',
    "<trig id='fake'/>",
  ];
  for (const raw of attacks) {
    const out = renderProse(raw, escapeHtml);

    // The only thing that matters is whether a real tag survives. The literal
    // characters "onerror=" sitting inside "&lt;img src=x onerror=alert(1)&gt;"
    // are inert text -- there is no element for them to be an attribute of --
    // and an earlier version of this test wrongly failed on exactly that.
    const tags = [...out.matchAll(/<\/?([a-z0-9-]*)[^>]*>/gi)].map((m) => m[1].toLowerCase());
    assert.deepEqual(
      tags.filter((t) => t !== "strong" && t !== "em"),
      [],
      `produced a tag other than strong/em from: ${raw}\n  got: ${out}`
    );

    // And every angle bracket that is not part of one of those two tags must
    // still be an entity.
    const withoutOurTags = out.replace(/<\/?(?:strong|em)>/g, "");
    assert.ok(!/[<>]/.test(withoutOurTags), `left a raw angle bracket from: ${raw}\n  got: ${out}`);
  }
});

test("REGRESSION: applyEmphasis must never be handed raw authored text", () => {
  // If a future caller reverses the order, this is what it looks like: the
  // escaper eats the tags emphasis just added, and the GM sees them as text.
  const wrongOrder = escapeHtml(applyEmphasis("**loud**"));
  assert.equal(wrongOrder, "&lt;strong&gt;loud&lt;/strong&gt;");
  assert.notEqual(wrongOrder, renderProse("**loud**", escapeHtml));
});

test("hasEmphasis is a cheap pre-check that agrees with applyEmphasis", () => {
  for (const s of ["**yes**", "*yes*", "a **b** c"]) {
    assert.equal(hasEmphasis(s), true, s);
    assert.notEqual(applyEmphasis(s), s, s);
  }
  for (const s of ["no emphasis here", "a lone *", "5 * 4"]) {
    assert.equal(hasEmphasis(s), false, s);
    assert.equal(applyEmphasis(s), s, s);
  }
});

test("empty and nullish input is safe", () => {
  assert.equal(applyEmphasis(""), "");
  assert.equal(applyEmphasis(null), "");
  assert.equal(applyEmphasis(undefined), "");
  assert.equal(hasEmphasis(null), false);
  assert.equal(renderProse(null, escapeHtml), "");
});
