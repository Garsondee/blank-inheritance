// What Claude reads before writing about the story (tools/story/context.mjs, snapshot.mjs; design/plot-timeline.md §6,
// D070): `story context`, `story brief`, `story when`, `story health`, on the real canon.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadModel } from "../../tools/story/lib.mjs";
import { contextPack, brief, whenReport, healthReport } from "../../tools/story/context.mjs";
import { snapshot, quotesOf, canonHash } from "../../tools/story/snapshot.mjs";

const model = loadModel();

test("REAL DATA: a context pack puts ink, open and pencil apart, with her words and what must never be said", () => {
  const pack = contextPack(model, "manako");
  const order = ["## Ink", "## Open", "## Pencil", "## Her words", "## Used by", "## The table knows", "## Never say"].map((h) => pack.indexOf(h));
  assert.ok(order.every((i) => i >= 0), "every section is there");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "in that order");
  assert.match(pack, /manako\.name\s+\[decided/);
  assert.match(pack, /## Pencil \(\d+\): not yet gone through; never cite in play material[\s\S]*manako\.was-warning/);
  assert.match(pack, /### D068/);
  assert.match(pack, /> "Lore: The directorate have a large number/);
  assert.match(contextPack(model, "nothing-here"), /Nothing in canon has the id/);
});

test("REAL DATA: a context pack works for a fact, a scene and a chapter", () => {
  assert.match(contextPack(model, "manako.cicada"), /^# manako\.cicada · in Manako/);
  assert.match(contextPack(model, "episode-c1e1--the-errand"), /^# Scene: /);
  assert.match(contextPack(model, "chapter-01"), /^# chapter: /);
});

test("REAL DATA: a brief lists what to tell, what to hold back, and the open decisions", () => {
  const b = brief(model, "episode-c1e1--the-errand");
  assert.match(b, /## Tell here \(\d+\)[\s\S]*manako\.name/);
  assert.match(b, /## Hold back[\s\S]*manako\.cicada/);
  assert.match(b, /## Open decisions/);
  assert.ok(!/## Tell here \(0\)/.test(brief(model, "chapter-01")), "Chapter 1 counts its own scenes");
});

test("REAL DATA: the timeline runs from the old campaign through Episode One in play order", () => {
  const w = whenReport(model);
  assert.match(w, /present year 4921 AR/);
  assert.ok(w.indexOf("## The old campaign") < w.indexOf("## Episodes One and Two"));
  assert.ok(w.indexOf("episode-c1e1--from-up-here") < w.indexOf("episode-c1e1--the-road-in"));
  assert.ok(w.indexOf("episode-c1e1--the-road-in") < w.indexOf("episode-c1e1--flood-tunnel"));
  assert.match(healthReport(model), /^# Health, up to the end of chapter \d+/);
});

test("REAL DATA: the snapshot holds every fact and decision, with her words", () => {
  const s = snapshot(model);
  assert.equal(s.presentYear, 4921);
  assert.equal(s.facts.length, model.world.reduce((n, e) => n + e.facts.length, 0));
  const d070 = s.decisions.find((d) => d.id === "D070");
  assert.ok(d070.quotes.some((q) => q.includes("Let's make this the current year.")));
  assert.ok(s.order["episode-c1e1--from-up-here"] < s.order["episode-c1e1--the-road-in"]);
  assert.match(s.canonHash, /^[0-9a-f]{16}$/);
});

test("her words are every quoted paragraph of a record", () => {
  assert.deepEqual(quotesOf("# D1\n\n> \"One.\"\n>\n> Two.\n\nNot quoted.\n\n> Three."), ["\"One.\"\n\nTwo.", "Three."]);
});

test("the canon hash changes when any canon file changes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "canon-hash-"));
  try {
    fs.mkdirSync(path.join(dir, "canon", "world"), { recursive: true });
    fs.writeFileSync(path.join(dir, "canon", "world", "a.md"), "# A\n");
    const before = canonHash(dir);
    assert.equal(canonHash(dir), before, "stable");
    fs.writeFileSync(path.join(dir, "canon", "world", "a.md"), "# A\r\n");
    assert.equal(canonHash(dir), before, "line endings don't count");
    fs.writeFileSync(path.join(dir, "canon", "world", "a.md"), "# B\n");
    assert.notEqual(canonHash(dir), before);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("conflictsOf reads an import record's Conflicts bullets, joins their wrapped lines and drops bold marks", async () => {
  const { conflictsOf } = await import("../../tools/story/snapshot.mjs");
  const text = [
    "# D900 · 2026-10-07 · An import", "kind: import", "", "## What came in", "- not this", "", "## Conflicts", "",
    "Intro words that are not a bullet.", "",
    "- **The Envoy's date**: the timeline says flat \"15 years\"; canon",
    "  keeps it open between 15 and 1.",
    "- A second one, on one line.", "", "## Coverage", "- also not this", "",
  ].join("\n");
  assert.deepEqual(conflictsOf(text), ["The Envoy's date: the timeline says flat \"15 years\"; canon keeps it open between 15 and 1.", "A second one, on one line."]);
  assert.deepEqual(conflictsOf("# D1 · d · t\n\n## Ingram\n\n> x\n"), []);
});
