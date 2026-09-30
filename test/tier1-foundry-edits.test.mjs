// Tier 1 — documents edited directly in Foundry are kept, never rebuilt or
// rewritten (module/blank-inheritance/scripts/core/foundry-edits.mjs,
// design/scene-edits.md §7), and the update card says so.

import { test } from "node:test";
import assert from "node:assert/strict";

import { documentEditFilename, documentEditSnapshot, editedSinceWritten, journalWords, pageWords } from "../module/blank-inheritance/scripts/core/foundry-edits.mjs";
import { keptEditedDocuments, worldSyncCardHtml } from "../module/blank-inheritance/scripts/core/world-sync.mjs";

test("a journal's words are its pages' names and text, in page order, whatever order they are stored in", () => {
  const words = journalWords([
    { name: "Scene 2", sort: 200000, text: { content: "<p>Two</p>" } },
    { name: "Overview", sort: 100000, text: { content: "<p>One</p>" } },
    { name: "Map", sort: 300000, src: "maps/city.webp" }
  ]);
  assert.deepEqual(words, [
    { name: "Overview", content: "<p>One</p>" },
    { name: "Scene 2", content: "<p>Two</p>" },
    { name: "Map", content: "maps/city.webp" }
  ]);
  assert.deepEqual(pageWords({ name: "Letter", text: { content: "<p>Dear</p>" } }), { name: "Letter", content: "<p>Dear</p>" });
});

test("edited means the words no longer match what the module last wrote; no fingerprint yet means not edited", () => {
  assert.equal(editedSinceWritten("abc", "abc"), false);
  assert.equal(editedSinceWritten("abd", "abc"), true);
  assert.equal(editedSinceWritten("abd", undefined), false, "a document from before this check is taken as unedited");
});

test("a kept document is filed under one plain, safe name per document, with her words and where it came from", () => {
  assert.equal(documentEditFilename("journal", "episode-c1e1-mothers-maiden-name"), "foundry-edit-journal-episode-c1e1-mothers-maiden-name.json");
  assert.equal(documentEditFilename("handout", "The Letter!"), "foundry-edit-handout-the-letter.json");
  const snapshot = documentEditSnapshot({ kind: "journal", sourceId: "ep", source: "data/episodes/ep.json", name: "Ep", words: [{ name: "a", content: "b" }], at: "t" });
  assert.equal(snapshot.kind, "foundry-document-edit");
  assert.equal(snapshot.document, "journal");
});

test("the update card names every document it kept because she had edited it", () => {
  const content = { results: [{ sourceId: "ep-1", name: "Mother's Maiden Name", keptEdited: true }, { sourceId: "npc", skipped: true }] };
  assert.deepEqual(keptEditedDocuments(content), ["Mother's Maiden Name"]);
  const html = worldSyncCardHtml({ trigger: "login", documents: { removed: [], kept: keptEditedDocuments(content) }, scenes: {}, problems: [] });
  assert.match(html, /Kept your edits/);
  assert.match(html, /Mother&#39;s Maiden Name/);
});
