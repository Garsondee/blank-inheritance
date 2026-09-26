// Tier 1 — the Rules drawer's index builder (tools/rules-search/build-index.mjs).
// Pure transform only: findJsonFiles/buildIndex touch the real filesystem
// and are exercised by actually running the tool against reference/srd/
// (see tier1-rules-search.test.mjs's own REAL DATA test on the result),
// same "adapter is Tier-5-equivalent" reasoning as module-sync/remote.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";

import { buildIndexFromArticles } from "../tools/rules-search/build-index.mjs";

test("buildIndexFromArticles: keeps exactly the fields the Rules drawer displays, drops mirroring bookkeeping", () => {
  const [entry] = buildIndexFromArticles([
    {
      $schema: "../../schema/srd-article.schema.json",
      id: "228-weapons",
      type: "srd-article",
      title: "Weapons",
      book: "Player Core",
      chapter: "Equipment",
      sourceUrl: "https://example.test/weapons",
      pageCitation: "Source Player Core pg. 253",
      retrievedDate: "2026-08-19",
      text: "Weapon rules text.",
      mirrorNote: "some retrieval caveat"
    }
  ]);
  assert.deepEqual(Object.keys(entry).sort(), ["book", "chapter", "id", "pageCitation", "sourceUrl", "text", "title"].sort());
  assert.equal(entry.id, "228-weapons");
  assert.equal(entry.text, "Weapon rules text.");
});

test("buildIndexFromArticles: drops an article with no searchable text rather than shipping a dead result", () => {
  const index = buildIndexFromArticles([
    { id: "1274-appendix", title: "Appendix", text: "" },
    { id: "real-article", title: "Real Article", text: "Actual rules content." }
  ]);
  assert.deepEqual(index.map((a) => a.id), ["real-article"]);
});

test("buildIndexFromArticles: drops an article missing id or title too, rather than shipping a result a GM can't act on", () => {
  const index = buildIndexFromArticles([
    { id: null, title: "No Id", text: "content" },
    { id: "no-title", title: null, text: "content" },
    { id: "fine", title: "Fine", text: "content" }
  ]);
  assert.deepEqual(index.map((a) => a.id), ["fine"]);
});

test("buildIndexFromArticles: missing optional fields (book/chapter/pageCitation/sourceUrl) become null, never undefined -- undefined does not survive a JSON round-trip", () => {
  const [entry] = buildIndexFromArticles([{ id: "x", title: "X", text: "content" }]);
  assert.equal(entry.book, null);
  assert.equal(entry.chapter, null);
  assert.equal(entry.pageCitation, null);
  assert.equal(entry.sourceUrl, null);
});

test("buildIndexFromArticles: tolerates an empty article list", () => {
  assert.deepEqual(buildIndexFromArticles([]), []);
});
