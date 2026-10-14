// The plot timeline's model and health strip (core/timeline-model.mjs, core/timeline-health.mjs, core/timeline-eras.mjs;
// design/plot-timeline.md §4, D070), on small synthetic snapshots of canon.
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildTimeline, tableKnows, tally, scenePosition, threadIntensity, STYLE } from "../module/blank-inheritance/scripts/core/timeline-model.mjs";
import { health, horizonOf, dueChapter, chapterOfPlace } from "../module/blank-inheritance/scripts/core/timeline-health.mjs";
import { ERAS, eraOf } from "../module/blank-inheritance/scripts/core/timeline-eras.mjs";
import { UNIT_DAYS } from "../module/blank-inheritance/scripts/core/timeline-when.mjs";

const fact = (id, extra = {}) => ({ id, entity: id.split(".")[0], text: `${id} text`, status: "decided", by: null, source: ["D001"], known: "everyone", told: "later", when: null, threads: [], ...extra });
const BOOKS = [{ id: "book-i", book: 1, numeral: "I", title: "One", from: 1, to: 4 }, { id: "book-ii", book: 2, numeral: "II", title: "Two", from: 5, to: 8 }];
function snap(extra = {}) {
  return {
    now: { chapter: 1 },
    books: BOOKS,
    entities: [{ id: "manako", title: "Manako", kind: "person" }, { id: "rift", title: "The rift", kind: "event" }],
    facts: [],
    scenes: [
      { id: "s0", title: "From Up Here", chapter: 1, day: null, time: "early morning", state: "awaiting-read", inCanon: true },
      { id: "s1", title: "The Errand", chapter: 1, day: 1, time: "afternoon", state: "awaiting-read", inCanon: true },
      { id: "s2", title: "As Discussed", chapter: 1, day: 2, time: "morning", state: "old-draft", inCanon: false },
    ],
    chapters: [{ id: "chapter-06", n: 6, title: "The Show", book: "II", status: "sketch", by: "claude", beats: [{ id: "beat--eyes", text: "The sky full of eyes.", status: "sketch", by: "claude", kind: "reveal", pace: "down", threads: [] }] }],
    threads: [], questions: [], ideas: [],
    order: { "chapter-01": 0, s0: 1, s1: 2, s2: 3, "chapter-06": 4, "beat--eyes": 5 },
    citations: {},
    ...extra,
  };
}

test("the eras run from the deep past to the campaign ahead, each with its own scale", () => {
  assert.deepEqual(ERAS.map((e) => e.id), ["deep-past", "old-campaign", "living-memory", "this-spring", "episodes", "ahead"]);
  assert.equal(eraOf({ scale: "days", at: -30000 * UNIT_DAYS.year }).id, "deep-past");
  assert.equal(eraOf({ scale: "days", at: -200 * UNIT_DAYS.year }).id, "old-campaign");
  assert.equal(eraOf({ scale: "days", at: -44 * UNIT_DAYS.year }).id, "living-memory");
  assert.equal(eraOf({ scale: "days", at: -14 }).id, "this-spring");
  assert.equal(eraOf({ scale: "days", at: 0.5 }).id, "episodes");
  assert.equal(eraOf({ scale: "chapters", at: 6.5 }).id, "ahead");
  assert.equal(eraOf({ scale: "chapters", at: 1.5 }).id, "episodes", "chapter 1 is Episodes One and Two");
  assert.equal(eraOf({ scale: "candidates", options: [] }), null);
});

test("scenes sit by day and time of day; Scene 0 sits before anyone is anywhere", () => {
  assert.equal(scenePosition({ day: 1, time: "afternoon" }).at, 0.6);
  assert.equal(scenePosition({ day: null, time: "early morning" }).at, -1);
});

test("a scene of a later chapter has no day: it sits in its chapter, spread in plan order, never at Scene 0", () => {
  const tl = buildTimeline(snap({
    scenes: [
      { id: "s0", title: "From Up Here", chapter: 1, day: null, time: "early morning", state: "awaiting-read", inCanon: true },
      { id: "c2a", title: "The Morning After", chapter: 2, day: null, time: "flexible", state: "unwritten", inCanon: false, note: "" },
      { id: "c2b", title: "The Tug Yard", chapter: 2, day: null, time: "flexible", state: "unwritten", inCanon: false, note: "" },
      { id: "c2c", title: "The Report", chapter: 2, day: null, time: "flexible", state: "unwritten", inCanon: false, note: "" },
    ],
    order: { "chapter-01": 0, s0: 1, c2a: 2, c2b: 3, c2c: 4, "chapter-06": 5, "beat--eyes": 6 },
  }));
  const at = (id) => tl.items.find((i) => i.id === `scene:${id}`).position;
  assert.equal(at("s0").at, -1, "Scene 0 is still the one scene before anyone is anywhere");
  assert.deepEqual([at("c2a"), at("c2b"), at("c2c")].map((p) => p.scale), ["chapters", "chapters", "chapters"]);
  const xs = [at("c2a").at, at("c2b").at, at("c2c").at];
  assert.ok(xs.every((x) => x > 2 && x < 3), `all inside chapter 2: ${xs}`);
  assert.ok(xs[0] < xs[1] && xs[1] < xs[2], "in plan order");
});

test("a fact appears where the world placed it and where the table learns it", () => {
  const tl = buildTimeline(snap({ facts: [
    fact("rift.opened", { when: "about 200 years ago", told: "start" }),
    fact("manako.name", { told: "in:s1" }),
    fact("manako.cicada", { status: "sketch", by: "ingram", told: "in:beat--eyes" }),
    fact("manako.envoy-when", { status: "open", when: "about 15 years ago | about 1 year ago" }),
  ] }));
  const ev = tl.byId.get("event:rift.opened");
  assert.equal(ev.era, "old-campaign");
  assert.equal(tl.byId.get("reveal:rift.opened").position.at, -1, "told from the start: at Scene 0");
  assert.equal(tl.byId.get("reveal:manako.name").position.at, 0.6);
  const pencil = tl.byId.get("reveal:manako.cicada");
  assert.equal(pencil.style, "pencil");
  assert.equal(pencil.era, "ahead");
  assert.equal(tl.byId.get("event:manako.envoy-when").position.scale, "candidates");
  assert.equal(tl.byId.get("event:manako.envoy-when").style, "open");
  assert.deepEqual(tl.problems, []);
});

test("the table's own lane carries the episodes' scenes and every chapter ahead, beats by their threads", () => {
  const tl = buildTimeline(snap({ threads: [{ id: "watcher", title: "The Watcher", kind: "front", lane: "watcher", order: 1, entities: ["watcher"], intensity: [], clocks: [], status: "sketch", by: "claude" }] }));
  assert.equal(tl.lanes[0].id, "play", "the table's own lane is the spine, so it comes first");
  assert.equal(tl.lanes[1].id, "lane:watcher", "then the strands the story is read in, in their fixed order (D086)");
  assert.equal(tl.lanes.length, 8, "the table's own row and seven strands, never a row per thread or per person");
  assert.equal(tl.byId.get("scene:s1").lane, "play");
  assert.equal(tl.byId.get("scene:s2").style, "pencil", "a scene not yet rebuilt in canon is pencil");
  assert.equal(tl.byId.get("chapter:chapter-06").position.scale, "chapters");
  assert.equal(tl.byId.get("beat:beat--eyes").lane, "play");
  const threaded = buildTimeline(snap({ threads: [{ id: "watcher", title: "The Watcher", kind: "front", lane: "watcher", order: 1, entities: [], intensity: [], clocks: [], status: "sketch", by: "claude" }], chapters: [{ ...snap().chapters[0], beats: [{ ...snap().chapters[0].beats[0], threads: ["watcher"] }] }] }));
  assert.equal(threaded.byId.get("beat:beat--eyes").lane, "lane:watcher");
});

test("a fact joins its thread's lane through its entity, or its own threads field", () => {
  const threads = [{ id: "manako-and-cicada", title: "Manako and Cicada", kind: "front", lane: "cicada", order: 2, entities: ["manako"], intensity: [], clocks: [], status: "sketch", by: "claude" }];
  const tl = buildTimeline(snap({ threads, facts: [fact("manako.name", { told: "in:s1" }), fact("rift.opened", { told: "start", threads: ["manako-and-cicada"] }), fact("era.x", { told: "start" })] }));
  assert.equal(tl.byId.get("reveal:manako.name").lane, "lane:cicada");
  assert.equal(tl.byId.get("reveal:rift.opened").lane, "lane:cicada");
  assert.equal(tl.byId.get("reveal:era.x").lane, "lane:city", "an entity no thread or header places goes to its kind's strand, never a lane of its own");
});

test("what the table knows by a point in play", () => {
  const s = snap({ facts: [fact("a.start", { told: "start" }), fact("a.errand", { told: "in:s1" }), fact("a.show", { told: "in:beat--eyes" }), fact("a.later")] });
  assert.deepEqual([...tableKnows(s, "s0")].sort(), ["a.start"]);
  assert.deepEqual([...tableKnows(s, "s2")].sort(), ["a.errand", "a.start"]);
  assert.deepEqual([...tableKnows(s, "beat--eyes")].sort(), ["a.errand", "a.show", "a.start"]);
  assert.throws(() => tableKnows(s, "nowhere"), /not in the play order/);
});

test("the tally counts ink, pencil and open", () => {
  const t = tally(snap({ facts: [fact("a.b"), fact("a.c", { status: "sketch", by: "claude" }), fact("a.d", { status: "open" }), fact("a.e", { status: "cut" })] }));
  assert.equal(t.byKind.facts.ink, 1);
  assert.equal(t.byKind.facts.pencil, 1);
  assert.equal(t.byKind.facts.open, 1);
  assert.equal(t.byKind.beats.pencil, 1);
  assert.equal(STYLE.accepted, "ink-accepted");
});

// ---- the health strip

test("the horizon is the end of the Book the table is in", () => {
  assert.equal(horizonOf(snap()), 4);
  assert.equal(horizonOf(snap({ now: { chapter: 6 } })), 8);
  assert.equal(dueChapter(snap(), "before Chapter 3 is written"), 3);
  assert.equal(dueChapter(snap(), "when Book II is prepared"), 5);
  assert.equal(dueChapter(snap(), "before Episode Two"), 1);
  assert.equal(dueChapter(snap(), "someday"), Infinity);
  // Within a Book means by its last chapter; before a Book, or as it is prepared, means when it starts.
  assert.equal(dueChapter(snap(), "before the first flashback, late in Book I"), 4);
  assert.equal(dueChapter(snap(), "by the end of Book II"), 8);
  assert.equal(dueChapter(snap(), "during Book II"), 8);
  assert.equal(dueChapter(snap(), "before Book II is prepared"), 5);
  assert.equal(dueChapter(snap(), "as Book II is prepared"), 5);
  assert.equal(dueChapter(snap(), "Book II"), 5);
  assert.equal(chapterOfPlace(snap(), "in:beat--eyes"), 6);
});

test("each health check fires inside the horizon, and stays quiet past it", () => {
  const chapters = [
    { id: "chapter-02", n: 2, title: "Two", status: "sketch", by: "claude", beats: [1, 2, 3].map((i) => ({ id: `beat--d${i}`, text: "x", status: "sketch", by: "claude", kind: "event", pace: "down", threads: [] })) },
    { id: "chapter-06", n: 6, title: "Six", status: "sketch", by: "claude", beats: [] },
  ];
  const s = snap({
    chapters,
    order: { "chapter-01": 0, s0: 1, s1: 2, s2: 3, "chapter-02": 4, "beat--d1": 5, "beat--d2": 6, "beat--d3": 7, "chapter-06": 8 },
    facts: [
      fact("a.due", { status: "open", decideBy: "before chapter 3" }),
      fact("a.far", { status: "open", decideBy: "before chapter 12" }),
      fact("a.answer", { told: "in:chapter-02" }),
      fact("a.secret", { told: "in:s1", known: "few" }),
    ],
    questions: [{ id: "q", title: "Who?", answer: "a.answer", raised: "in:s1", answered: "in:chapter-02", roads: [], status: "sketch", by: "claude" }],
    threads: [{ id: "t", title: "A thread", kind: "thread", order: 1, entities: [], intensity: [0, 0, 0, 0, 3, 3, 3, 3], clocks: [{ name: "empty", items: [] }], status: "sketch", by: "claude" }],
  });
  const checks = health(s, { publishedHash: "old", }).findings.map((f) => `${f.check}:${f.id}`);
  for (const want of ["decision-due:a.due", "weak-question:q", "unplanted-payoff:q", "clock-stuck:t", "thread-silent:t", "told-unused:a.secret", "down-run:beat--d1"]) assert.ok(checks.includes(want), `${want} in ${checks.join(", ")}`);
  assert.ok(!checks.includes("decision-due:a.far"), "past the horizon, decisions wait");
  assert.ok(!checks.some((c) => c.startsWith("stale-copy")), "no canon hash in the snapshot, so no stale copy");
  assert.ok(health({ ...s, canonHash: "new" }, { publishedHash: "old" }).findings.some((f) => f.check === "stale-copy"));
});

test("a thread's rise and fall comes from its beats unless she has written one: a reveal or a choice counts double, capped at 5", () => {
  const snap = {
    chapters: [
      { id: "chapter-02", n: 2, title: "Two", status: "sketch", by: "claude", source: ["D001"], beats: [{ id: "beat--a", kind: "event", threads: ["watch"], status: "sketch", by: "claude", text: "a" }] },
      { id: "chapter-03", n: 3, title: "Three", status: "sketch", by: "claude", source: ["D001"], beats: [
        { id: "beat--b", kind: "reveal", threads: ["watch"], status: "sketch", by: "claude", text: "b" },
        { id: "beat--c", kind: "choice", threads: ["watch", "other"], status: "sketch", by: "claude", text: "c" },
        { id: "beat--d", kind: "event", threads: ["watch"], status: "sketch", by: "claude", text: "d" },
        { id: "beat--e", kind: "reveal", threads: ["watch"], status: "sketch", by: "claude", text: "e" },
      ] },
    ],
  };
  assert.deepEqual(threadIntensity(snap, { id: "watch", intensity: [] }), { values: [null, 1, 5], source: "beats" });
  assert.deepEqual(threadIntensity(snap, { id: "other", intensity: [] }).values, [null, null, 2]);
  assert.deepEqual(threadIntensity(snap, { id: "watch", intensity: [1, 3, null, 0] }), { values: [1, 3, null, 0], source: "authored" });
  assert.equal(threadIntensity(snap, { id: "watch", intensity: [null, 0, null] }).source, "beats", "all zeros is not a value she wrote");
  const tl = buildTimeline({ ...snap, facts: [], entities: [], threads: [{ id: "watch", title: "Watch", lane: "watcher", order: 1, entities: [], status: "sketch", by: "claude", source: ["D001"], intensity: [] }], scenes: [], questions: [], ideas: [], books: BOOKS });
  const lane = tl.lanes.find((l) => l.key === "watcher");
  assert.deepEqual([lane.intensity, lane.intensitySource], [[null, 1, 5], "beats"]);
});
