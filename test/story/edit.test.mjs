// The one writer of canon's story files (tools/story/edit.mjs; design/plot-timeline.md §5, D070). Every edit touches
// only its own lines and keeps the file's line endings; a status changes only through ink() or pencil(), each with the
// decision record that does it.
import { test } from "node:test";
import assert from "node:assert/strict";

import { setField, setText, addSource, pencil, ink, moveBelowPencil, moveAbovePencil, appendItem, addChanges, formatMeta, findItem } from "../../tools/story/edit.mjs";
import { parseWorld } from "../../tools/story/lib.mjs";

const WORLD = [
  "# Manako",
  "kind: person",
  "",
  "## manako.name",
  "The old man who owns the tea house is Manako.",
  "status: decided · source: D034 · known: some · told: in:s1",
  "",
  "## manako.was-warning",
  "Manako tried to warn people about something invisible in their midst.",
  "status: decided · source: D068 · known: few · told: later",
  "",
  "## Notes",
  "How to play him.",
  "",
].join("\n");
const crlf = (s) => s.replace(/\n/g, "\r\n");

test("a no-op edit leaves LF and CRLF files byte for byte as they were", () => {
  for (const raw of [WORLD, crlf(WORLD)]) {
    const same = setField(raw, "manako.name", "told", "in:s1");
    assert.equal(same, raw);
    assert.equal(setText(raw, "manako.name", "The old man who owns the tea house is Manako."), raw);
    assert.equal(addSource(raw, "manako.name", "D034"), raw);
  }
});

test("an edit touches only its own line, and keeps CRLF", () => {
  const raw = crlf(WORLD);
  const out = setField(raw, "manako.was-warning", "when", "about 40 years ago");
  const a = raw.split("\r\n");
  const b = out.split("\r\n");
  assert.equal(a.length, b.length);
  const changed = a.map((l, i) => (l === b[i] ? null : i)).filter((i) => i !== null);
  assert.deepEqual(changed, [9]);
  assert.equal(b[9], "status: decided · source: D068 · known: few · told: later · when: about 40 years ago");
  assert.ok(!out.replace(/\r\n/g, "").includes("\n"), "no bare LF crept in");
});

test("typing never changes a status: setField refuses status and by", () => {
  assert.throws(() => setField(WORLD, "manako.name", "status", "sketch"), /ink\(\) or pencil\(\)/);
  assert.throws(() => setField(WORLD, "manako.name", "by", "claude"), /ink\(\) or pencil\(\)/);
  assert.throws(() => setField(WORLD, "manako.name", "told", "later · status: cut"), /may not hold/);
  const text = setText(WORLD, "manako.was-warning", "New words.");
  assert.equal(parseWorld(text, "manako").facts[1].status, "decided");
  assert.equal(parseWorld(text, "manako").facts[1].text, "New words.");
});

test("pencil moves a fact below the Pencil line, credits its author, and cites the decision", () => {
  const out = pencil(WORLD, "manako.was-warning", { decision: "D070", by: "ingram", world: true });
  const w = parseWorld(out, "manako");
  const f = w.facts.find((x) => x.id === "manako.was-warning");
  assert.equal(f.status, "sketch");
  assert.equal(f.by, "ingram");
  assert.deepEqual(f.source, ["D068", "D070"]);
  assert.equal(f.zone, "pencil");
  assert.equal(w.facts[0].zone, "ink");
  assert.equal(w.notes.Notes, "How to play him.", "notes stay above the line");
  assert.ok(out.indexOf("## Notes") < out.indexOf("## Pencil"));
  assert.ok(out.endsWith("\n") && !out.endsWith("\n\n"));
  assert.throws(() => pencil(WORLD, "manako.name", { decision: "nobody", by: "ingram" }), /decision record/);
  assert.throws(() => pencil(WORLD, "manako.name", { decision: "D070", by: "someone" }), /by: ingram/);
});

test("ink moves it back above the line, drops its by, and cites the decision in her words", () => {
  const pencilled = pencil(WORLD, "manako.was-warning", { decision: "D070", by: "ingram", world: true });
  const out = ink(pencilled, "manako.was-warning", { decision: "D073", verb: "decide", world: true });
  const w = parseWorld(out, "manako");
  const f = w.facts.find((x) => x.id === "manako.was-warning");
  assert.equal(f.status, "decided");
  assert.equal(f.by, null);
  assert.deepEqual(f.source, ["D068", "D070", "D073"]);
  assert.equal(f.zone, "ink");
  assert.ok(out.indexOf("## manako.was-warning") < out.indexOf("## Notes"), "an inked fact goes after the last ink fact, before the notes");
  const accepted = ink(pencil(WORLD, "manako.name", { decision: "D070", by: "claude", world: true }), "manako.name", { decision: "D073", verb: "accept", world: true });
  assert.equal(parseWorld(accepted, "manako").facts.find((x) => x.id === "manako.name").status, "accepted");
  assert.throws(() => ink(WORLD, "manako.name", { decision: "D073", verb: "approve" }), /decide" or "accept/);
});

test("pencilling several facts keeps their order below the line", () => {
  let raw = WORLD;
  for (const id of ["manako.name", "manako.was-warning"]) raw = pencil(raw, id, { decision: "D070", by: "ingram", world: true });
  assert.deepEqual(parseWorld(raw, "manako").facts.map((f) => f.id), ["manako.name", "manako.was-warning"]);
  assert.equal(raw.match(/^## Pencil$/gm).length, 1);
  assert.equal(moveBelowPencil(raw, "manako.name").match(/^## Pencil$/gm).length, 1, "the line is made once");
});

test("moving an open fact keeps its status", () => {
  const raw = WORLD.replace("status: decided · source: D068", "status: open · source: D068");
  const out = moveBelowPencil(raw, "manako.was-warning");
  const f = parseWorld(out, "manako").facts[1];
  assert.equal(f.status, "open");
  assert.equal(f.zone, "pencil");
  assert.equal(parseWorld(moveAbovePencil(out, "manako.was-warning"), "manako").facts[1].zone, "ink");
});

test("a new item is appended in its zone; a duplicate is refused", () => {
  const out = appendItem(WORLD, { id: "manako.sap", text: "He makes Sap.", meta: { status: "sketch", by: "claude", source: "D071", known: "nobody", told: "later" }, pencilZone: true });
  const f = parseWorld(out, "manako").facts.find((x) => x.id === "manako.sap");
  assert.equal(f.zone, "pencil");
  assert.equal(f.by, "claude");
  assert.throws(() => appendItem(out, { id: "manako.sap", text: "x", meta: { status: "sketch" } }), /already/);
});

test("a decision's Changes list grows without repeating a line", () => {
  const rec = ["# D070 · 2026-10-07 · x", "", "## Ingram", "", "> \"Yes.\"", "", "## Changes", "", "- add `era.present-year`", ""].join("\n");
  const out = addChanges(rec, ["- pencil `a.b`", "- add `era.present-year`"]);
  assert.deepEqual(out.split("\n").filter((l) => l.startsWith("- ")), ["- add `era.present-year`", "- pencil `a.b`"]);
  const fresh = addChanges("# D071 · 2026-10-07 · y\n", ["- add `c.d`"]);
  assert.match(fresh, /## Changes\n\n- add `c\.d`\n$/);
});

test("the meta line keeps its order, with by straight after status", () => {
  assert.equal(formatMeta({ status: "sketch", source: "D1", by: "claude" }, ["status", "source"]), "status: sketch · by: claude · source: D1");
  assert.equal(formatMeta({ source: "D1", status: "decided" }, ["source", "status"]), "status: decided · source: D1");
});

test("a missing item says so", () => {
  assert.throws(() => findItem(WORLD.split("\n"), "manako.nobody"), /no item/);
});
