// Tier 1 — the Rules drawer's search scoring (core/rules-search.mjs).
// Milliseconds, no Foundry, no network, a small hand-built fixture corpus.
//
// design/ux-doctrine.md §10.7: "a search box over the... locally mirrored
// SRD articles... buildable today and answers the rulebook's own
// first-listed GM priority... Results are short, with the page citation."

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { searchRules, excerptFor } from "../module/blank-inheritance/scripts/core/rules-search.mjs";

const INDEX = [
  {
    id: "condition-28-off-guard",
    title: "Off-Guard",
    book: "Player Core",
    chapter: "Conditions",
    pageCitation: "Source Player Core pg. 438",
    sourceUrl: "https://example.test/off-guard",
    text: "You're distracted or otherwise unable to focus your full attention on defense. You take a -2 circumstance penalty to AC."
  },
  {
    id: "423-flanking",
    title: "Flanking",
    book: "Player Core",
    chapter: "Combat",
    pageCitation: "Source Player Core pg. 417",
    sourceUrl: "https://example.test/flanking",
    text: "When you and an ally are on opposite sides of a foe, that foe is off-guard to your melee attacks."
  },
  {
    id: "228-weapons",
    title: "Weapons",
    book: "Player Core",
    chapter: "Equipment",
    pageCitation: "Source Player Core pg. 253",
    sourceUrl: "https://example.test/weapons",
    text: "Your second attack on your turn takes a -5 penalty, and any subsequent attack takes a -10 penalty, unless otherwise noted. This is the multiple attack penalty."
  }
];

test("searchRules: an exact title match ranks first, even against a body-text mention elsewhere", () => {
  const results = searchRules(INDEX, "off-guard");
  assert.equal(results[0].id, "condition-28-off-guard");
});

test("searchRules: a body-only match (no title overlap) is still found", () => {
  const results = searchRules(INDEX, "multiple attack penalty");
  assert.ok(results.some((r) => r.id === "228-weapons"), "Weapons discusses MAP directly but never says the phrase in its title");
});

test("searchRules: every result carries what a GM actually needs -- title, citation, and a short excerpt, never the raw score", () => {
  const [result] = searchRules(INDEX, "flanking");
  assert.equal(result.title, "Flanking");
  assert.equal(result.pageCitation, "Source Player Core pg. 417");
  assert.equal(typeof result.excerpt, "string");
  assert.ok(result.excerpt.length > 0);
  assert.equal(result.score, undefined, "the internal ranking score must never leak into a rendered result");
});

test("searchRules: an empty or whitespace-only query returns nothing -- this is a lookup, not a browser", () => {
  assert.deepEqual(searchRules(INDEX, ""), []);
  assert.deepEqual(searchRules(INDEX, "   "), []);
  assert.deepEqual(searchRules(INDEX, undefined), []);
});

test("searchRules: a query matching nothing returns an empty list, not a crash or the whole corpus", () => {
  assert.deepEqual(searchRules(INDEX, "xyzzyquux"), []);
});

test("searchRules: respects the limit rather than returning every scored match", () => {
  const results = searchRules(INDEX, "attack", { limit: 1 });
  assert.equal(results.length, 1);
});

test("searchRules: tolerates an empty index without throwing", () => {
  assert.deepEqual(searchRules([], "off-guard"), []);
  assert.deepEqual(searchRules(undefined, "off-guard"), []);
});

test("excerptFor: windows around the matched term rather than always starting at 0, with ellipses marking real truncation", () => {
  const longText = `${"padding ".repeat(30)}the multiple attack penalty applies here${" more padding".repeat(30)}`;
  const excerpt = excerptFor(longText, ["penalty"]);
  assert.match(excerpt, /penalty/);
  assert.match(excerpt, /^…/, "truncated at the start should show the leading ellipsis");
  assert.match(excerpt, /…$/, "truncated at the end should show the trailing ellipsis");
  assert.ok(excerpt.length < longText.length);
});

test("excerptFor: falls back to the article's own opening when no term is found in the body (a title-only match)", () => {
  const text = "This whole article never mentions the search term at all, only related ideas.";
  const excerpt = excerptFor(text, ["xyzzyquux"]);
  assert.match(excerpt, /^This whole article/);
});

test("REAL DATA: the built index file exists, is well-formed, and off-guard actually ranks first for its own name -- catches drift if reference/srd grows without a rebuild", () => {
  const path = fileURLToPath(new URL("../module/blank-inheritance/data/srd-index.json", import.meta.url));
  const index = JSON.parse(readFileSync(path, "utf8"));
  assert.ok(index.length > 200, `expected the real SRD mirror's worth of articles, got ${index.length}`);
  for (const article of index) {
    assert.equal(typeof article.id, "string");
    assert.equal(typeof article.title, "string");
    assert.equal(typeof article.text, "string");
    assert.ok(article.text.length > 0, `${article.id} has empty text and should have been dropped by build-index.mjs`);
  }
  const results = searchRules(index, "off-guard", { limit: 1 });
  assert.equal(results[0]?.id, "condition-28-off-guard");
});
