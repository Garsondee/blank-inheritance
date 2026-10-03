// Tier 1 — a beat's note as labelled lines (core/note-lines.mjs, D056).
//
// The house style writes a note as a few lines, each starting with Do, Plant, Secret, Watch for, or
// "If <condition>". The Scene Runner lays those out as a list with the Secret marked, and falls back to
// plain paragraphs for anything else, so an old-style note never loses text.

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNoteLines, labelKind, NOTE_LABELS } from "../module/blank-inheritance/scripts/core/note-lines.mjs";

test("the five labels are the house style's", () => {
  assert.deepEqual([...NOTE_LABELS], ["Do", "Plant", "Secret", "Watch for"]);
  assert.equal(labelKind("Do"), "do");
  assert.equal(labelKind("Watch for"), "watch-for");
  assert.equal(labelKind("If no arrival fits"), "if");
  assert.equal(labelKind("If"), null, "a bare If is not a condition");
  assert.equal(labelKind("HOW TO PLAY IT"), null);
  assert.equal(labelKind("GUARANTEED"), null);
});

test("a labelled note splits into its lines, in order", () => {
  const note = "Plant: On a wall a waiting crowd faces.\nIf no arrival fits: Put it in one random player's spotlight.\nSecret: The marks are Cicada's.";
  assert.deepEqual(parseNoteLines(note), [
    { label: "Plant", kind: "plant", text: "On a wall a waiting crowd faces." },
    { label: "If no arrival fits", kind: "if", text: "Put it in one random player's spotlight." },
    { label: "Secret", kind: "secret", text: "The marks are Cicada's." }
  ]);
});

test("a colon later in the line stays in the text", () => {
  const [line] = parseNoteLines("If asked what it means: Pack light: this is enlistment.");
  assert.equal(line.label, "If asked what it means");
  assert.equal(line.text, "Pack light: this is enlistment.");
});

test("blank lines and stray spaces are ignored", () => {
  assert.equal(parseNoteLines("  Do: Read it.  \n\n  Secret: Nobody knows.\n").length, 2);
});

test("anything that isn't all labelled lines falls back to paragraphs (null)", () => {
  assert.equal(parseNoteLines(null), null);
  assert.equal(parseNoteLines(""), null);
  assert.equal(parseNoteLines("HOW TO PLAY IT. Shucks runs this screen personally."), null);
  assert.equal(parseNoteLines("Plant: The stamp.\nThis line has no label."), null, "one unlabelled line makes the whole note a paragraph");
  assert.equal(parseNoteLines("NO LONGER GUARANTEED: From Up Here now gives the whole table its first sight."), null);
});
