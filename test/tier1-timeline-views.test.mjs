// The plot timeline's other ways in, the pure half (module/blank-inheritance/scripts/core/timeline-views.mjs and the
// model's "not placed" list; design/plot-timeline.md §4, D070, D079): most of the story is not an event in time, so
// every fact must be reachable by who it is about, by what is still undecided, by search, and by what the strip could
// not place.
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildTimeline } from "../module/blank-inheritance/scripts/core/timeline-model.mjs";
import { entityIndex, entityGroups, entityPage, searchAll, unplacedGroups, decisionGroups, whenForCandidate, recentDecisions, recordPage, bucketOf } from "../module/blank-inheritance/scripts/core/timeline-views.mjs";
import { answerOps } from "../module/blank-inheritance/scripts/core/timeline-edits.mjs";

const fact = (id, over = {}) => ({ id, entity: id.split(".")[0], text: `Words of ${id}.`, status: "sketch", by: "claude", source: ["D071"], known: "nobody", told: "later", when: null, threads: [], candidates: [], decideBy: null, meta: { status: "sketch" }, ...over });
const SNAP = {
  presentYear: 4921,
  now: { chapter: 1 },
  books: [{ id: "book-i", book: 1, numeral: "I", from: 1, to: 4 }, { id: "book-ii", book: 2, numeral: "II", from: 5, to: 8 }],
  entities: [
    { id: "manako", title: "Manako", kind: "person", notes: { "How to play him": "Patient and kind." } },
    { id: "statue", title: "The Harbour Statue", kind: "place", notes: null },
    { id: "cicada", title: "Cicada", kind: "group", notes: null },
    { id: "quiet", title: "Quiet Thing", kind: "thing", notes: null },
  ],
  facts: [
    fact("manako.name", { status: "decided", by: null, text: "The old man who owns the tea house is Manako.", told: "start" }),
    fact("manako.spill", { when: "about 44 years ago", text: "Manako spilled a fragment of Sap." }),
    fact("manako.gifted", { text: "Manako is a gifted chemist, rich in unrecognised talent." }),
    fact("manako.revenge", { status: "open", text: "Whether Manako keeps a revenge list is not decided.", candidates: ["yes", "no"], decideBy: "before Chapter 3", meta: { status: "open", candidates: "yes | no", "decide-by": "before Chapter 3" } }),
    fact("statue.material", { status: "open", text: "What the statue is made of.", candidates: ["stone", "bronze"], decideBy: "before Episode Two", when: "about 20 years ago | about 30 years ago" }),
    fact("statue.pose", { text: "The harbour statue is a gnoll in a fierce pose." }),
    fact("cicada.later", { status: "open", text: "When Cicada became public.", decideBy: "Book II" }),
    fact("cicada.nodeadline", { status: "open", text: "Whether Cicada has a second circle." }),
    fact("cicada.relied", { status: "open", text: "Whether Cicada's founder is named in the first scene." }),
    fact("cicada.event", { status: "open", text: "Whether the founder is named.", decideBy: "before a scene names him" }),
    fact("cicada.cut", { status: "cut", text: "Cicada fought the Directorate for years.", retire: ["fought the Directorate"] }),
  ],
  chapters: [{ id: "chapter-02", n: 2, title: "Two", status: "sketch", by: "claude", text: "The sky looks back.", learn: "Eyes.", beats: [{ id: "beat--eyes", text: "The statue weeps ink.", status: "sketch", by: "claude", threads: [], when: null, kind: "event" }] }],
  threads: [{ id: "the-people", title: "The people", lane: "cicada", order: 1, entities: ["manako"], status: "sketch", by: "claude", intensity: [] }],
  questions: [{ id: "who", title: "Who is the statue?", text: "A gnoll, but whose?", status: "sketch", by: "claude", roads: [] }],
  ideas: [{ id: "idea--x", text: "What if Manako painted the statue?", status: "sketch", by: "claude", state: "live", threads: [] }],
  scenes: [],
  citations: { "cicada.relied": [{ file: "canon/scenes/episode-c1e1--x.json", at: "b1", as: "gmFacts" }] },
  order: {},
};

test("a fact is in one bucket: ink, pencil, open, and a cut one in none", () => {
  assert.deepEqual(["decided", "accepted", "provisional", "proposal", "sketch", "open", "cut"].map(bucketOf), ["ink", "ink", "ink", "ink", "pencil", "open", null]);
});

test("every entity is indexed with its counts, the best words to introduce it, and its threads", () => {
  const idx = Object.fromEntries(entityIndex(SNAP).map((e) => [e.id, e]));
  assert.deepEqual(idx.manako.counts, { ink: 1, pencil: 2, open: 1, cards: 0 }, "no cards in this fixture, so nothing is grouped");
  assert.equal(idx.manako.total, 4);
  assert.equal(idx.manako.dated, 1);
  assert.equal(idx.manako.snippet, "The old man who owns the tea house is Manako.", "ink introduces a person before pencil does");
  assert.equal(idx.statue.snippet, "The harbour statue is a gnoll in a fierce pose.");
  assert.deepEqual(idx.manako.threads, [{ id: "the-people", title: "The people" }]);
  assert.equal(idx.cicada.total, 4, "a cut fact is not counted");
  assert.equal(idx.quiet.total, 0, "an entity with nothing yet is still listed");
});

test("People & places groups by kind in a steady order, biggest first, and filters", () => {
  const g = entityGroups(SNAP);
  assert.deepEqual(g.map((x) => x.title), ["People", "Groups", "Places", "Things"]);
  assert.deepEqual(entityGroups(SNAP, { kinds: ["place"] }).map((x) => x.entities.map((e) => e.id)), [["statue"]]);
  assert.deepEqual(entityGroups(SNAP, { query: "tea house" }).flatMap((x) => x.entities.map((e) => e.id)), ["manako"]);
});

test("an entity's page puts what is hers to decide first, then ink, then pencil, with its notes and the ideas that name it", () => {
  const p = entityPage(SNAP, "manako");
  assert.deepEqual(p.open.map((f) => f.id), ["manako.revenge"]);
  assert.deepEqual(p.ink.map((f) => f.id), ["manako.name"]);
  assert.deepEqual(p.pencil.map((f) => f.id), ["manako.spill", "manako.gifted"]);
  assert.deepEqual(p.ideas.map((i) => i.id), ["idea--x"]);
  assert.equal(p.entity.notes["How to play him"], "Patient and kind.");
  assert.deepEqual(entityPage(SNAP, "cicada").cut.map((f) => f.id), ["cicada.cut"]);
  assert.equal(entityPage(SNAP, "nobody"), null);
});

test("search reaches everything: every word must match, titles and ids outrank words, ink and open outrank pencil", () => {
  const ids = (q) => searchAll(SNAP, q).map((r) => r.target);
  assert.ok(ids("statue").includes("statue.pose") && ids("statue").includes("beat:beat--eyes") && ids("statue").includes("question:who") && ids("statue").includes("idea:idea--x") && ids("statue").includes("entity:statue"));
  assert.deepEqual(ids("statue bronze"), [], "every word has to match something in one item");
  assert.deepEqual(ids("harbour gnoll"), ["statue.pose"]);
  assert.equal(searchAll(SNAP, "statue")[0].target, "entity:statue", "an entity whose title says it ranks first");
  assert.ok(!ids("fought").includes("cicada.cut"), "a cut fact is gone");
  assert.deepEqual(searchAll(SNAP, ""), []);
  assert.equal(searchAll(SNAP, "the", { limit: 2 }).length, 2);
  const r = searchAll(SNAP, "manako")[0];
  assert.deepEqual(Object.keys(r).sort(), ["by", "id", "kind", "score", "snippet", "status", "target", "title"]);
});

test("the strip says which facts it could not place, and how many each lane holds", () => {
  const tl = buildTimeline(SNAP);
  const unplaced = tl.unplaced.map((u) => u.ref).sort();
  assert.ok(!unplaced.includes("manako.spill"), "a dated fact is on the strip");
  assert.ok(!unplaced.includes("manako.name"), "a fact told at the start is on the strip");
  assert.ok(unplaced.includes("manako.gifted") && unplaced.includes("manako.revenge") && unplaced.includes("statue.pose"));
  assert.ok(!unplaced.includes("cicada.cut"), "a cut fact is not listed");
  // The thread's strand (D086): its header says `lane: cicada`, so Manako's facts are counted on that strand's lane.
  const lane = tl.lanes.find((l) => l.id === "lane:cicada");
  assert.equal(lane.unplaced, tl.unplaced.filter((u) => u.lane === "lane:cicada").length);
  assert.ok(lane.unplaced > 0);
  assert.ok(tl.unplaced.every((u) => u.lane === "other" || tl.lanes.some((l) => l.id === u.lane)), "a fact whose lane is not drawn is listed under other");
  const groups = unplacedGroups(SNAP, tl, "all");
  assert.equal(groups.reduce((n, g) => n + g.facts.length, 0), tl.unplaced.length);
  assert.deepEqual(groups.find((g) => g.entity === "manako").facts.map((f) => f.ref), ["manako.revenge", "manako.gifted"], "open first, then pencil");
  assert.deepEqual(unplacedGroups(SNAP, tl, "lane:cicada").map((g) => g.entity), ["manako"]);
});

test("decisions are grouped by how soon they are needed, soonest first", () => {
  const g = Object.fromEntries(decisionGroups(SNAP).map((x) => [x.key, x]));
  assert.deepEqual(Object.keys(g), ["now", "book", "later", "event", "none"]);
  assert.deepEqual(g.event.items.map((d) => d.id), ["cicada.event"], "a deadline that is a moment in the story is not 'no deadline'");
  assert.deepEqual(g.now.items.map((d) => d.id), ["statue.material", "cicada.relied"], "due by Episode Two, and one a scene relies on");
  assert.deepEqual(g.book.items.map((d) => d.id), ["manako.revenge"], "due before Chapter 3, inside Book I");
  assert.deepEqual(g.later.items.map((d) => d.id), ["cicada.later"], "Book II is past the horizon");
  assert.deepEqual(g.none.items.map((d) => d.id), ["cicada.nodeadline"]);
  assert.match(g.book.title, /Book I$/);
  assert.equal(decisionGroups({ ...SNAP, facts: SNAP.facts.filter((f) => f.status !== "open") }).length, 0);
});

test("recent changes: every record newest first with its counts, and a record page groups its changes by verb and says which targets still exist", () => {
  const snap = {
    ...SNAP,
    decisions: [
      { id: "D001", date: "2026-10-01", title: "Her words", kind: "decision", asked: "a question", quotes: ["She said this."], conflicts: [], changes: [{ verb: "decide", target: "manako.name", rest: "" }] },
      { id: "D002", date: "2026-10-05", title: "An import", kind: "import", asked: null, quotes: [], conflicts: ["It said X, but canon says Y.", "Another."], changes: [{ verb: "add", target: "manako.gifted", rest: "" }, { verb: "add", target: "gone.fact", rest: "" }, { verb: "pencil", target: "statue.pose", rest: "" }] },
    ],
  };
  const list = recentDecisions(snap);
  assert.deepEqual(list.map((r) => r.id), ["D002", "D001"]);
  assert.deepEqual(list[0], { id: "D002", date: "2026-10-05", title: "An import", kind: "import", kindWord: "Claude's import", changes: 3, conflicts: 2, quoted: 0 });
  assert.equal(list[1].kindWord, "your words");
  const page = recordPage(snap, "D002");
  assert.deepEqual(page.groups.map((g) => [g.verb, g.targets.length]), [["add", 2], ["pencil", 1]]);
  assert.deepEqual(page.groups[0].targets.map((t) => [t.id, t.exists]), [["manako.gifted", true], ["gone.fact", false]]);
  assert.equal(page.conflicts.length, 2);
  assert.equal(recordPage(snap, "D999"), null);
});

test("picking candidate i picks date i, only when the two lists line up", () => {
  assert.equal(whenForCandidate("about 38 years ago | about 15 years ago", ["a", "b"], 1), "about 15 years ago");
  assert.equal(whenForCandidate("about 38 years ago | about 15 years ago", ["a", "b", "c"], 1), "", "three candidates, two dates: she types it");
  assert.equal(whenForCandidate("about 38 years ago", ["a", "b"], 0), "");
  assert.equal(whenForCandidate(null, ["a"], 0), "");
});

test("an answer is one save: her words, the candidates and deadline gone, the date she means, decided", () => {
  const open = { kind: "fact", item: { ...SNAP.facts.find((f) => f.id === "statue.material"), meta: { status: "open", when: "about 20 years ago | about 30 years ago", candidates: "stone | bronze", "decide-by": "before Episode Two" } } };
  const ops = answerOps(open, { text: "  It is bronze.  ", when: "about 30 years ago" });
  assert.deepEqual(ops, [
    { op: "text", id: "statue.material", before: "What the statue is made of.", value: "It is bronze." },
    { op: "field", id: "statue.material", field: "candidates", before: "stone | bronze", value: "" },
    { op: "field", id: "statue.material", field: "decide-by", before: "before Episode Two", value: "" },
    { op: "field", id: "statue.material", field: "when", before: "about 20 years ago | about 30 years ago", value: "about 30 years ago" },
    { op: "ink", id: "statue.material", before: "open" },
  ]);
  assert.throws(() => answerOps(open, { text: "   " }), /needs its words/);
  const bare = answerOps({ kind: "fact", item: { id: "a.b", text: "Q?", meta: { status: "open" } } }, { text: "A." });
  assert.deepEqual(bare.map((o) => o.op), ["text", "ink"], "nothing to clear when there are no candidates, deadline or date");
});
