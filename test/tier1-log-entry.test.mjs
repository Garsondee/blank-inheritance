// Tier 1 — the Director's log.
//
// The rule this file mostly exists to defend: tags are "an optional
// accelerator via a leading token, NEVER a required form" (Ingram, 2026-09-06).
// A parser that is clever about what a GM typed while running a session will
// eventually eat a sentence, and the GM will never trust it again.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  LOG_TAGS,
  appendEntry,
  parseLogLine,
  sessionFileName,
  stampEntry
} from "../module/blank-inheritance/scripts/core/log-entry.mjs";

const AT = "2026-09-06T20:15:00.000Z";

/* ---------------------------------------------------------------- */
/*  Tag parsing                                                      */
/* ---------------------------------------------------------------- */

test("a recognised leading token becomes a tag", () => {
  for (const tag of LOG_TAGS) {
    assert.deepEqual(parseLogLine(`${tag}: something happened`), { tag, text: "something happened" });
  }
});

test("tags are case-insensitive to type but stored lowercase", () => {
  assert.deepEqual(parseLogLine("NPC: the caretaker lies"), { tag: "npc", text: "the caretaker lies" });
  assert.deepEqual(parseLogLine("Anchor: she chose the school"), { tag: "anchor", text: "she chose the school" });
});

test("an UNrecognised leading word is left alone, colon and all", () => {
  // The alternative — inventing a tag from any word before a colon — turns
  // every note into a taxonomy exercise.
  assert.deepEqual(parseLogLine("note: whatever"), { tag: null, text: "note: whatever" });
  assert.deepEqual(parseLogLine("Kaneda: I told you"), { tag: null, text: "Kaneda: I told you" });
});

test("a timestamp or a plain sentence is never mistaken for a tag", () => {
  assert.deepEqual(parseLogLine("10:32 he finally asked"), { tag: null, text: "10:32 he finally asked" });
  assert.deepEqual(parseLogLine("they refused"), { tag: null, text: "they refused" });
});

test("a tag with nothing after it is a typo, not a tagged empty entry", () => {
  assert.deepEqual(parseLogLine("npc:"), { tag: null, text: "npc:" });
  assert.deepEqual(parseLogLine("npc:   "), { tag: null, text: "npc:" });
});

test("only the FIRST colon is considered — the rest of the sentence survives", () => {
  assert.deepEqual(
    parseLogLine("decision: she said: take the Frame"),
    { tag: "decision", text: "she said: take the Frame" }
  );
});

test("empty and non-string input produce an empty line rather than throwing", () => {
  for (const input of ["", "   ", null, undefined, 42, {}]) {
    assert.deepEqual(parseLogLine(input), { tag: null, text: "" });
  }
});

/* ---------------------------------------------------------------- */
/*  Stamping                                                         */
/* ---------------------------------------------------------------- */

test("an entry carries the context the GM did not have to type", () => {
  const entry = stampEntry({
    text: "anchor: she chose the school over the launch",
    at: AT,
    scene: "Arcology Deck 4",
    mode: "theatre",
    subject: "Kimura Etsuko",
    author: "Ingram"
  });

  assert.equal(entry.at, AT);
  assert.equal(entry.tag, "anchor");
  assert.equal(entry.text, "she chose the school over the launch");
  assert.deepEqual(entry.context, {
    scene: "Arcology Deck 4",
    mode: "theatre",
    subject: "Kimura Etsuko",
    author: "Ingram"
  });
});

test("an empty line stamps to null — a stray Enter must not write a blank record", () => {
  assert.equal(stampEntry({ text: "", at: AT }), null);
  assert.equal(stampEntry({ text: "   ", at: AT }), null);
  assert.equal(stampEntry({ at: AT }), null);
  assert.equal(stampEntry(), null);
});

test("missing context is recorded as null rather than omitted", () => {
  // A key that is absent and a key that is null read very differently when
  // this is mined later; "we did not know" should be explicit.
  const entry = stampEntry({ text: "they refused", at: AT });
  assert.deepEqual(entry.context, { scene: null, mode: null, subject: null, author: null });
});

/* ---------------------------------------------------------------- */
/*  Buffer                                                           */
/* ---------------------------------------------------------------- */

test("appendEntry returns a new array and never mutates the old one", () => {
  // The caller holds the buffer a failed write still needs in order to retry.
  const first = [stampEntry({ text: "one", at: AT })];
  const snapshot = [...first];
  const second = appendEntry(first, stampEntry({ text: "two", at: AT }));

  assert.equal(second.length, 2);
  assert.deepEqual(first, snapshot, "the original buffer was mutated");
  assert.notEqual(first, second);
});

test("appending nothing leaves the buffer exactly as it was", () => {
  const entries = [stampEntry({ text: "one", at: AT })];
  assert.equal(appendEntry(entries, null), entries);
  assert.deepEqual(appendEntry([], null), []);
});

/* ---------------------------------------------------------------- */
/*  File naming                                                      */
/* ---------------------------------------------------------------- */

test("a session file is named for its date, so a mid-evening reload continues it", () => {
  assert.equal(sessionFileName(AT), "2026-09-06.json");
  assert.equal(sessionFileName("2026-01-02T00:00:00.000Z"), "2026-01-02.json");
});

test("two entries on the same evening resolve to one file", () => {
  assert.equal(
    sessionFileName("2026-09-06T19:00:00.000Z"),
    sessionFileName("2026-09-06T23:59:59.000Z")
  );
});

test("a malformed timestamp throws rather than writing to a garbage filename", () => {
  for (const bad of ["", "not-a-date", null, undefined, "2026-9-6"]) {
    assert.throws(() => sessionFileName(bad), /ISO timestamp/);
  }
});
