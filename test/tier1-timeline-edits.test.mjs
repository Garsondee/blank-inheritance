// Editing the plot timeline, the pure half (module/blank-inheritance/scripts/core/timeline-edits.mjs;
// design/plot-timeline.md §4 and §5, D070): the fields each kind of item offers, the ops a save sends, what a drag
// writes back, the undo of a save, the review queue and what changed between two snapshots.
import { test } from "node:test";
import assert from "node:assert/strict";

import { itemsById, fieldsFor, editOps, inkVerb, draggable, dragWhen, undoOf, reviewQueue, reviewItems, changedIds, FIELDS } from "../module/blank-inheritance/scripts/core/timeline-edits.mjs";
import { parseWhen, resolveWhen } from "../module/blank-inheritance/scripts/core/timeline-when.mjs";

const fact = (id, over = {}) => ({ id, entity: id.split(".")[0], text: `Words of ${id}.`, status: "sketch", by: "claude", source: ["D071"], known: "nobody", told: "later", when: null, threads: [], origin: "cb:words.1", meta: { status: "sketch", by: "claude", source: "D071", known: "nobody", told: "later" }, ...over });
const SNAP = {
  entities: [{ id: "manako", title: "Manako" }, { id: "watcher", title: "The Watcher" }],
  facts: [
    fact("manako.spill", { when: "about 44 years ago", meta: { status: "sketch", by: "claude", source: "D071", known: "nobody", told: "later", when: "about 44 years ago" } }),
    fact("manako.hers", { by: "ingram", source: ["D068"], origin: null, told: "in:beat--a", meta: { status: "sketch", by: "ingram", source: "D068", known: "nobody", told: "in:beat--a" } }),
    fact("watcher.ink", { status: "decided", by: null, meta: { status: "decided", source: "D040", known: "few", told: "later" } }),
    fact("watcher.open", { status: "open", by: null, when: "about 15 years ago | about 1 year ago", meta: { status: "open", source: "D040", known: "nobody", told: "later", when: "about 15 years ago | about 1 year ago", candidates: "a | b" } }),
    fact("watcher.belief", { meta: { status: "sketch", by: "claude", source: "D071", known: "some", told: "later", "held-by": "the city", true: "no", truth: "watcher.ink" } }),
  ],
  chapters: [{ id: "chapter-02", n: 2, title: "Two", status: "sketch", by: "claude", text: "", meta: { status: "sketch", by: "claude" }, beats: [
    { id: "beat--a", text: "A beat.", status: "sketch", by: "claude", threads: ["the-watcher"], when: null, meta: { status: "sketch", by: "claude" } },
    { id: "beat--flash", text: "Back then.", status: "sketch", by: "claude", threads: [], when: "4721 AR", meta: { status: "sketch", by: "claude", when: "4721 AR" } },
  ] }],
  threads: [{ id: "the-watcher", title: "The Watcher", order: 1, entities: ["watcher"], status: "sketch", by: "claude", meta: {} }, { id: "manako-and-cicada", title: "Manako and Cicada", order: 2, entities: ["manako"], status: "sketch", by: "claude", meta: {} }],
  questions: [{ id: "who", title: "Who?", status: "sketch", by: "claude", meta: {} }],
  ideas: [{ id: "idea--x", text: "What if.", status: "sketch", by: "claude", state: "live", when: "book ii", meta: { state: "live" } }, { id: "idea--y", text: "Parked.", status: "sketch", by: "claude", state: "parked", meta: { state: "parked" } }],
  books: [{ id: "book-i", numeral: "I", title: "One", status: "sketch", by: "claude", meta: {} }],
  scenes: [],
};

test("every kind of item is found by id, and offers its own fields (a belief's and an open fact's on top)", () => {
  const all = itemsById(SNAP);
  assert.deepEqual([...new Set([...all.values()].map((e) => e.kind))].sort(), ["beat", "book", "chapter", "fact", "idea", "question", "thread"]);
  assert.equal(all.get("beat--a").item.chapter, "chapter-02");
  const names = (e) => fieldsFor(e).map((f) => f[0]);
  assert.ok(names(all.get("manako.spill")).includes("when"));
  assert.ok(!names(all.get("manako.spill")).includes("held-by"));
  assert.ok(names(all.get("watcher.belief")).includes("truth"));
  assert.ok(names(all.get("watcher.open")).includes("candidates"));
  for (const list of Object.values(FIELDS)) for (const [f] of list) assert.ok(!["status", "by", "source", "from"].includes(f), `${f} is never a field the page offers`);
});

test("a save sends only what changed, with what the page saw", () => {
  const e = itemsById(SNAP).get("manako.spill");
  assert.deepEqual(editOps(e, { text: "Words of   manako.spill.", fields: { when: "about 44 years ago", told: "later" } }), []);
  assert.deepEqual(editOps(e, { text: "New words.", fields: { when: "about 40 years ago", payoff: "" } }), [
    { op: "text", id: "manako.spill", before: "Words of manako.spill.", value: "New words." },
    { op: "field", id: "manako.spill", field: "when", before: "about 44 years ago", value: "about 40 years ago" },
  ]);
});

test("Ink it decides her words and accepts Claude's, unless she has put her own words on it", () => {
  const all = itemsById(SNAP);
  assert.equal(inkVerb(all.get("manako.hers")), "decide");
  assert.equal(inkVerb(all.get("manako.spill")), "accept");
  assert.equal(inkVerb(all.get("manako.spill"), { herWords: true }), "decide");
});

test("only pencil placed by a when can be dragged; ink is locked", () => {
  const all = itemsById(SNAP);
  assert.equal(draggable(all.get("manako.spill")), true);
  assert.equal(draggable(all.get("watcher.ink")), false, "ink is locked against a stray drag");
  assert.equal(draggable(all.get("watcher.open")), false, "an open date is a question, not a place");
  assert.equal(draggable(all.get("beat--a")), false, "a beat with no when is placed by its chapter");
  assert.equal(draggable(all.get("beat--flash")), true);
  assert.equal(draggable(all.get("idea--x")), true);
});

test("a drop writes words the when grammar reads, near where it was dropped", () => {
  const cases = [
    [{ scale: "chapters", at: 6.82 }, "chapter 6, late"],
    [{ scale: "chapters", at: 9.15 }, "chapter 9, early"],
    [{ scale: "days", at: 0.44 }, "day 1, late morning"],
    [{ scale: "days", at: -0.65 }, "day 0, morning"],
    [{ scale: "days", at: -44.2 * 365.25 }, "about 44 years ago"],
    [{ scale: "days", at: -1234 * 365.25 }, "about 1200 years ago"],
    [{ scale: "days", at: -20345 * 365.25 }, "about 20000 years ago"],
    [{ scale: "days", at: -22 }, "about 3 weeks ago"],
  ];
  for (const [pos, words] of cases) {
    assert.equal(dragWhen(pos), words, JSON.stringify(pos));
    const back = resolveWhen(parseWhen(words));
    assert.equal(back.scale, pos.scale);
    assert.ok(Math.abs(back.at - pos.at) <= Math.max(0.35, Math.abs(pos.at) * 0.05), `${words} lands near ${pos.at} (got ${back.at})`);
  }
});

test("the undo of a save puts back each thing it changed, last first", () => {
  const ops = [
    { op: "text", id: "a.x", before: "Old.", value: "New." },
    { op: "field", id: "a.x", field: "when", before: "", value: "about 3 years ago" },
    { op: "ink", id: "a.x", before: "sketch" },
    { op: "note", id: "a.x", text: "Hm." },
  ];
  const results = [
    { i: 0, result: "merged", was: "Old.", value: "New." },
    { i: 1, result: "merged", field: "when", was: "", value: "about 3 years ago" },
    { i: 2, result: "merged", status: "decided", was: "sketch", by: "claude" },
    { i: 3, result: "merged", note: "N1" },
  ];
  const u = undoOf(ops, results);
  assert.equal(u.complete, false, "a note can't be taken back");
  assert.deepEqual(u.ops, [
    { op: "pencil", id: "a.x", before: "decided", by: "claude" },
    { op: "field", id: "a.x", field: "when", before: "about 3 years ago", value: "" },
    { op: "text", id: "a.x", before: "New.", value: "Old." },
  ]);
  const cut = undoOf([{ op: "cut", id: "a.y", before: "sketch", retire: ["no more"] }], [{ i: 0, result: "merged", status: "cut", was: "sketch", by: "ingram", retire: "no more", retireWas: "" }]);
  assert.deepEqual(cut, { complete: true, ops: [{ op: "pencil", id: "a.y", before: "cut", by: "ingram" }, { op: "field", id: "a.y", field: "retire", before: "no more", value: "" }] });
  assert.deepEqual(undoOf([{ op: "pencil", id: "a.z", before: "accepted" }], [{ i: 0, result: "merged", status: "sketch", was: "accepted", by: "claude" }]).ops, [{ op: "ink", id: "a.z", before: "sketch", verb: "accept" }]);
  assert.deepEqual(undoOf([{ op: "field", id: "a.x", field: "when", before: "x", value: "y" }], [{ i: 0, result: "already" }]).ops, [], "nothing to undo for what was already so");
});

test("review walks the pencil she hasn't parked or skipped, in groups", () => {
  const ids = (list) => list.map((e) => e.item.id).sort();
  assert.deepEqual(ids(reviewItems(SNAP)), ["beat--a", "beat--flash", "book-i", "chapter-02", "idea--x", "manako-and-cicada", "manako.hers", "manako.spill", "the-watcher", "watcher.belief", "who"]);
  assert.ok(!ids(reviewItems(SNAP, { parked: ["manako.spill"], skipped: ["who"] })).includes("manako.spill"));
  assert.ok(ids(reviewItems(SNAP, { parked: ["manako.spill"], includeParked: true })).includes("manako.spill"));
  assert.ok(ids(reviewItems(SNAP, { includeParked: true })).includes("idea--y"));

  const byAuthor = reviewQueue(SNAP, { by: "author" });
  assert.deepEqual(byAuthor.map((g) => [g.key, g.items.length]), [["claude", 10], ["ingram", 1]]);
  const byThread = reviewQueue(SNAP, { by: "thread" });
  assert.deepEqual(byThread.slice(0, 2).map((g) => g.title), ["The Watcher", "Manako and Cicada"], "threads in their own order");
  assert.ok(byThread[0].items.some((e) => e.item.id === "watcher.belief"), "a fact joins its entity's thread");
  const byChapter = reviewQueue(SNAP, { by: "chapter" });
  assert.ok(byChapter.find((g) => g.title === "Chapter 2").items.some((e) => e.item.id === "manako.hers"), "a fact told in a beat belongs to the beat's chapter");
  const bySource = reviewQueue(SNAP, { by: "source" });
  assert.ok(bySource.some((g) => g.title === "Her words in D068"));
  assert.ok(bySource.some((g) => g.title === "The Casebook: words"));
});

test("what changed between two snapshots: new words, a new field, a new item", () => {
  const after = JSON.parse(JSON.stringify(SNAP));
  after.facts[0].text = "Changed.";
  after.facts[2].meta.when = "about 9 years ago";
  after.ideas.push({ id: "idea--z", text: "New.", meta: {} });
  assert.deepEqual(changedIds(SNAP, after).sort(), ["idea--z", "manako.spill", "watcher.ink"]);
  assert.deepEqual(changedIds(null, after), []);
});
