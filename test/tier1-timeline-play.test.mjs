// The plot timeline's play view (core/timeline-play.mjs, core/timeline-lanes.mjs; design/plot-timeline.md §4, D086).
// Her rule: scenes that follow each other never overlap, and scenes that sit one above another are ones the players could take in
// either order. The layout puts a scene one column right of everything it follows, and scenes that follow the same thing in a stack.
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseSceneNote, buildPlay, routingOf, cellsByColumn, noteRank, KINDS, NOTES_PER_CELL, START_NOTES_PER_CELL } from "../module/blank-inheritance/scripts/core/timeline-play.mjs";
import { LANE_DEFS, laneKeyOfThread, laneKeyOfEntity, laneId } from "../module/blank-inheritance/scripts/core/timeline-lanes.mjs";
import { loadModel } from "../tools/story/lib.mjs";
import { snapshot } from "../tools/story/snapshot.mjs";

const row = (id, note = "", extra = {}) => ({ id, title: id.replace(/^episode-/, ""), episode: "Episode One", chapter: 1, day: 1, time: "morning", state: "unwritten", inCanon: false, note, ...extra });
const snapOf = (scenes, extra = {}) => ({ scenes, chapters: [], threads: [], entities: [], facts: [], questions: [], ...extra });
const at = (play, id) => play.byId.get(id);

test("a note keeps its prose as labelled parts and reads its routing out of them", () => {
  const n = parseSceneNote("Arrive: they come. // Do: they act. // After: a, group:ways // Branch: any order // Group: g // Stack: yes // Kind: plot // Fight: yes");
  assert.deepEqual(n.parts, ["Arrive: they come.", "Do: they act."]);
  assert.deepEqual(n.after, ["a", "group:ways"]);
  assert.equal(n.branch, "any order");
  assert.equal(n.group, "g");
  assert.equal(n.stack, true);
  assert.equal(n.kind, "plot");
  assert.equal(n.fight, true);
  assert.deepEqual(parseSceneNote("Seat 1, one player. // Kind: nonsense").problems, ['unknown kind "nonsense"']);
  assert.deepEqual(parseSceneNote("").after, []);
  assert.deepEqual(KINDS, ["plot", "downtime", "light"]);
});

test("scenes with nothing said follow the row above them, one column to the right each, on one line", () => {
  const play = buildPlay(snapOf([row("a"), row("b"), row("c")]));
  assert.deepEqual(play.nodes.map((n) => [n.id, n.col, n.y]), [["a", 0, 0], ["b", 1, 0], ["c", 2, 0]]);
  assert.equal(play.slots, 1);
  assert.deepEqual(play.problems, []);
});

test("scenes that follow the same thing stack in one column, centred, and what follows them all sits one column further on", () => {
  const play = buildPlay(snapOf([
    row("hub"),
    row("x", "After: hub // Branch: any order // Group: g"), row("y", "After: hub // Branch: any order // Group: g"), row("z", "After: hub // Branch: any order // Group: g"),
    row("join", "After: group:g"),
  ]));
  const col1 = ["x", "y", "z"].map((id) => at(play, id));
  assert.deepEqual(col1.map((n) => n.col), [1, 1, 1], "alternatives overlap in one column: that is what overlap means");
  assert.deepEqual(col1.map((n) => n.y).sort(), [-1, 0, 1], "centred on the middle, so the fork fans out");
  assert.equal(at(play, "join").col, 2);
  assert.equal(at(play, "hub").col, 0);
  assert.equal(play.slots, 3);
  assert.equal(play.edges.length, 6, "three edges out of the hub and three into the join");
  assert.deepEqual(play.forks.map((f) => [f.from, f.label, f.to.length]), [["hub", "any order", 3]], "a label the siblings share is said once, on the fork");
  assert.ok(play.edges.every((e) => at(play, e.to).col > at(play, e.from).col), "no scene is ever left of something it follows");
});

test("a scene that needs another sits one column right of it, and what follows the whole board waits for both", () => {
  const play = buildPlay(snapOf([
    row("board"),
    row("a", "After: board // Branch: any order // Group: leads"), row("b", "After: board // Branch: any order // Group: leads"),
    row("c", "After: a // Branch: needs a // Group: leads"),
    row("report", "After: group:leads"),
  ]));
  assert.equal(at(play, "c").col, at(play, "a").col + 1);
  assert.equal(at(play, "report").col, at(play, "c").col + 1, "the report follows the furthest lead");
  const ac = play.edges.find((e) => e.from === "a" && e.to === "c");
  assert.deepEqual([ac.conditional, ac.label], [true, "needs a"], "a condition is drawn on its own edge");
});

test("a branch that is one scene's alone is said on its edge; a join of many says it on the card", () => {
  const play = buildPlay(snapOf([
    row("hub"), row("a", "After: hub // Branch: any order // Group: g"), row("b", "After: hub // Branch: any order // Group: g"),
    row("call", "After: hub // Branch: the Plot Room calls it // Group: g"),
    row("many", "After: group:g // Branch: after any two"),
  ]));
  assert.equal(play.edges.find((e) => e.to === "call").label, "the Plot Room calls it");
  assert.equal(play.edges.find((e) => e.to === "a").label, null, "shared with a sibling, so it is on the fork");
  assert.equal(at(play, "many").tag, "after any two", "three scenes lead into it, so the card carries the words");
  assert.equal(at(play, "a").tag, null);
});

test("ids may leave off their leading episode-, and a name nothing answers is reported, not guessed", () => {
  const play = buildPlay(snapOf([row("episode-c1e1--one"), row("episode-c1e1--two", "After: c1e1--one"), row("episode-c1e1--three", "After: nowhere, group:ghost")]));
  assert.equal(at(play, "episode-c1e1--two").col, 1);
  assert.deepEqual(play.problems.map((p) => p.message).sort(), ["After: nowhere is not a scene in the plan", "group:ghost names no scene"]);
});

test("a cycle is reported, its closing edge dropped, and the rest still laid out", () => {
  const play = buildPlay(snapOf([row("a", "After: b"), row("b", "After: a"), row("c", "After: b")]));
  assert.ok(play.problems.some((p) => /cycle/.test(p.message)));
  assert.ok(play.nodes.every((n) => Number.isInteger(n.col)));
  assert.ok(play.edges.every((e) => at(play, e.to).col > at(play, e.from).col));
});

test("many scenes of one group with Stack: yes draw as one card until the reader opens it", () => {
  const rests = Array.from({ length: 8 }, (_, i) => row(`rest--${i}`, "After: end // Branch: each player chooses one // Group: night // Stack: yes // Kind: downtime", { episode: "The night's rest" }));
  const scenes = [row("end"), ...rests, row("next", "After: group:night")];
  const closed = buildPlay(snapOf(scenes));
  assert.equal(closed.nodes.length, 3);
  const stack = closed.byId.get("stack:night");
  assert.deepEqual([stack.title, stack.members.length, stack.kind], ["The night's rest · 8 choices", 8, "downtime"]);
  assert.deepEqual(closed.edges.map((e) => [e.from, e.to]), [["end", "stack:night"], ["stack:night", "next"]], "the edges run to the card, once");
  const open = buildPlay(snapOf(scenes), { expanded: new Set(["stack:night"]) });
  assert.equal(open.nodes.length, 10);
  assert.equal(open.slots, 8);
  assert.equal(closed.stackOf.get("rest--3"), "stack:night");
});

test("the columns are grouped into bands by episode, and a later chapter is labelled with its own title", () => {
  const play = buildPlay(snapOf([
    row("a"), row("b", "", { episode: "Episode Two: Exercise" }),
    row("c", "After: b", { episode: "The Roster Calls (Episode c2e1)", chapter: 2, day: null }),
  ], { chapters: [{ id: "chapter-02", n: 2, title: "The Fortnight", beats: [] }] }));
  assert.deepEqual(play.bands.map((b) => [b.label, b.from, b.to]), [["Episode One", 0, 0], ["Episode Two: Exercise", 1, 1], ["Chapter 2 · The Fortnight · The Roster Calls", 2, 2]]);
});

test("what the other strands do is a note under the scene that tells it, in the strand of the person or thread", () => {
  const snap = snapOf([row("s0"), row("s1"), row("s2", "After: s1")], {
    threads: [{ id: "the-watcher", lane: "watcher", order: 1, entities: ["watcher"] }, { id: "section-nine", lane: "play", order: 2, entities: ["party"] }],
    entities: [{ id: "watcher", kind: "thing" }, { id: "salt-dogs", kind: "group", lane: "crime" }, { id: "party", kind: "person" }, { id: "wata", kind: "person" }],
    facts: [
      { id: "watcher.start", entity: "watcher", text: "It is out there.", status: "decided", told: "start" },
      { id: "salt-dogs.collector", entity: "salt-dogs", text: "Shige leans on the keeper.", status: "sketch", by: "claude", told: "in:s2" },
      { id: "party.rank", entity: "party", text: "They are recruits.", status: "decided", told: "in:s1" },
      { id: "wata.dogs", entity: "wata", text: "No dog walks that street.", status: "sketch", by: "claude", told: "in:s1" },
      { id: "wata.later", entity: "wata", text: "Not told yet.", status: "sketch", by: "claude", told: "later" },
      { id: "watcher.cut", entity: "watcher", text: "Gone.", status: "cut", told: "in:s1" },
    ],
    chapters: [{ id: "chapter-02", n: 2, title: "Two", beats: [{ id: "beat--x", kind: "event", threads: ["the-watcher"], text: "It hunts.", status: "sketch", by: "claude", meta: { scene: "s2" } }] }],
    questions: [{ id: "q", title: "Why?", raised: "in:s1", answered: "in:s2", roads: [{ core: true, kind: "physical", fact: "wata.dogs" }], status: "sketch", by: "claude" }],
  });
  snap.scenes[2].chapter = 2;
  const play = buildPlay(snap);
  const lane = (key) => play.lanes.find((l) => l.key === key);
  assert.deepEqual(lane("watcher").cells.get("s0").map((n) => n.id), ["watcher.start"], "told: start is Scene 0");
  assert.deepEqual(lane("crime").cells.get("s2").map((n) => n.id), ["salt-dogs.collector"], "an entity's own lane wins");
  assert.deepEqual(lane("city").cells.get("s1").map((n) => n.id), ["wata.dogs"], "a person no thread holds is the city's, by kind");
  assert.equal(play.lanes.some((l) => l.cells.has("s1") && l.cells.get("s1").some((n) => n.id === "party.rank")), false, "the party is At the table, not a strand");
  assert.equal(play.lanes.flatMap((l) => [...l.cells.values()].flat()).some((n) => n.id === "wata.later" || n.id === "watcher.cut"), false, "only what a scene tells, and nothing cut");
  assert.deepEqual(lane("watcher").cells.get("s2").map((n) => [n.kind, n.id]), [["beat", "beat--x"]], "a beat sits under the scene it names");
  const mystery = lane("mysteries");
  assert.deepEqual(mystery.cells.get("s1").map((n) => n.kind), ["raised", "road"]);
  assert.deepEqual(mystery.cells.get("s2").map((n) => n.kind), ["answered"]);
  assert.ok(NOTES_PER_CELL >= 3);
});

test("a chapter with no scenes yet is one card after the closing scenes of the chapter before, and carries its beats and what is told in it", () => {
  const snap = snapOf([row("s0"), row("s1", "After: s0 // Group: g"), row("s2", "After: s0 // Group: g")], {
    chapters: [
      { id: "chapter-02", n: 2, title: "Two", learn: "They learn it.", beats: [{ id: "beat--b", kind: "event", threads: ["t"], text: "It happens.", status: "sketch", by: "claude", meta: {} }] },
      { id: "chapter-03", n: 3, title: "Three", beats: [] },
    ],
    books: [{ id: "book-i", numeral: "I", title: "One", from: 1, to: 4 }],
    threads: [{ id: "t", lane: "watcher", order: 1, entities: [] }],
    entities: [{ id: "x", kind: "thing", lane: "past" }],
    facts: [
      { id: "x.told", entity: "x", text: "Learned in chapter two.", status: "sketch", by: "claude", told: "in:chapter-02" },
      { id: "x.beat", entity: "x", text: "Learned in a beat.", status: "sketch", by: "claude", told: "in:beat--b" },
    ],
  });
  const play = buildPlay(snap);
  const two = play.byId.get("chapter-02"), three = play.byId.get("chapter-03");
  assert.deepEqual([two.kind, two.title, two.state], ["outline", "Chapter 2 · Two", "unwritten"]);
  assert.deepEqual(two.preds.map((p) => p.id).sort(), ["s1", "s2"], "it follows the scenes that nothing else follows");
  assert.equal(two.col, Math.max(play.byId.get("s1").col, play.byId.get("s2").col) + 1);
  assert.equal(three.col, two.col + 1);
  assert.equal(play.bands.at(-1).label, "Book I · One", "the chapters to come are banded by Book");
  assert.deepEqual(play.lanes.find((l) => l.key === "watcher").cells.get("chapter-02").map((n) => [n.id, n.chapterWide]), [["beat--b", false]], "a chapter's own card is not 'somewhere in the chapter'");
  assert.deepEqual(play.lanes.find((l) => l.key === "past").cells.get("chapter-02").map((n) => n.id).sort(), ["x.beat", "x.told"]);
});

test("a crowded cell shows the plan's beats first, then the mysteries, then facts, the settled before the sketched", () => {
  const snap = snapOf([row("s0")], {
    threads: [{ id: "t", lane: "crime", order: 1, entities: ["gang"] }],
    entities: [{ id: "gang", kind: "group", lane: "crime" }],
    facts: [
      { id: "gang.sketch", entity: "gang", text: "S", status: "sketch", by: "claude", told: "in:s0" },
      { id: "gang.open", entity: "gang", text: "O", status: "open", told: "in:s0" },
      { id: "gang.ink", entity: "gang", text: "I", status: "decided", told: "in:s0" },
      { id: "gang.pending", entity: "gang", text: "P", status: "provisional", told: "in:s0" },
    ],
  });
  const play = buildPlay(snap);
  const crime = play.lanes.find((l) => l.key === "crime");
  assert.deepEqual(crime.cells.get("s0").map((n) => n.id), ["gang.ink", "gang.pending", "gang.sketch", "gang.open"]);
  assert.ok(noteRank({ kind: "beat", status: "open" }) < noteRank({ kind: "road", status: "decided" }));
  assert.ok(noteRank({ kind: "road", status: "open" }) < noteRank({ kind: "fact", status: "decided" }));
});

test("a strand's cells are grouped by column, and the stops of a choice share one cell under their own scenes", () => {
  const snap = snapOf([
    row("hub"), row("x", "After: hub // Branch: any order // Group: g"), row("y", "After: hub // Branch: any order // Group: g"), row("end", "After: group:g"),
  ], {
    entities: [{ id: "gang", kind: "group", lane: "crime" }],
    facts: [
      { id: "gang.a", entity: "gang", text: "A", status: "sketch", by: "claude", told: "in:y" },
      { id: "gang.b", entity: "gang", text: "B", status: "sketch", by: "claude", told: "in:x" },
      { id: "gang.c", entity: "gang", text: "C", status: "sketch", by: "claude", told: "in:x" },
      { id: "gang.d", entity: "gang", text: "D", status: "sketch", by: "claude", told: "in:end" },
    ],
  });
  const play = buildPlay(snap);
  const cells = cellsByColumn(play, play.lanes.find((l) => l.key === "crime"));
  assert.deepEqual(cells.map((c) => [c.col, c.total, c.groups.length]), [[1, 3, 2], [2, 1, 1]]);
  assert.deepEqual(cells[0].groups.map((g) => g.node.id), play.columns[1].ids.filter((id) => ["x", "y"].includes(id)), "groups stand in the order of their cards");
  assert.deepEqual(cells[0].groups.map((g) => g.notes.length).sort(), [1, 2]);
});

test("the cell under Scene 0 shows fewer notes than the rest, because every fact the table starts with is under it", () => {
  const snap = snapOf([row("s0"), row("s1")], {
    entities: [{ id: "gang", kind: "group", lane: "crime" }],
    facts: [
      ...["a", "b", "c", "d"].map((k) => ({ id: `gang.${k}`, entity: "gang", text: k, status: "decided", told: "start" })),
      { id: "gang.later", entity: "gang", text: "later", status: "decided", told: "in:s1" },
    ],
  });
  const play = buildPlay(snap);
  const cells = cellsByColumn(play, play.lanes.find((l) => l.key === "crime"));
  assert.deepEqual(cells.map((c) => [c.col, c.total, c.cap]), [[0, 4, START_NOTES_PER_CELL], [1, 1, NOTES_PER_CELL]]);
  assert.ok(START_NOTES_PER_CELL < NOTES_PER_CELL);
});

test("every group that can be a stack is listed, open or shut, so the page can offer to fold one it opened", () => {
  const scenes = [row("end"), ...Array.from({ length: 4 }, (_, i) => row(`r${i}`, "After: end // Group: night // Stack: yes")), row("next", "After: group:night")];
  const shut = buildPlay(snapOf(scenes)).stackGroups;
  assert.deepEqual(shut.map((g) => [g.id, g.members.length, g.open]), [["stack:night", 4, false]]);
  const open = buildPlay(snapOf(scenes), { expanded: new Set(["stack:night"]) }).stackGroups;
  assert.deepEqual(open.map((g) => [g.id, g.open]), [["stack:night", true]]);
});

test("a scene's routing: what it follows, what follows it, and what kind it is", () => {
  const play = buildPlay(snapOf([row("a", "Kind: plot"), row("b", "Kind: light // Fight: yes")]));
  assert.deepEqual(routingOf(play, "b").after.map((x) => x.id), ["a"]);
  assert.deepEqual(routingOf(play, "a").next.map((x) => x.title), ["b"]);
  assert.deepEqual([routingOf(play, "b").kind, routingOf(play, "b").fight], ["light", true]);
  assert.deepEqual(routingOf(play, "nowhere"), { after: [], next: [] });
});

test("the lanes are a fixed handful: a thread names its lane, a world file may name its own, the rest follow their thread or their kind", () => {
  assert.deepEqual(LANE_DEFS.map((d) => d.id), ["watcher", "cicada", "crime", "city", "directorate", "mitflits", "past"]);
  assert.equal(laneKeyOfThread({ lane: "crime" }), "crime");
  assert.equal(laneKeyOfThread({ lane: "powers" }), "watcher", "an old group name still lands somewhere");
  assert.equal(laneKeyOfThread({ lane: "play" }), "play");
  assert.equal(laneKeyOfThread({}), "city");
  const snap = { threads: [{ id: "t", lane: "cicada", order: 1, entities: ["manako"] }] };
  assert.equal(laneKeyOfEntity(snap, { id: "manako", kind: "person" }), "cicada");
  assert.equal(laneKeyOfEntity(snap, { id: "manako", kind: "person", lane: "past" }), "past", "the entity's own head wins");
  assert.equal(laneKeyOfEntity(snap, { id: "zed", kind: "event" }), "past");
  assert.equal(laneKeyOfEntity(snap, { id: "zed", kind: "person" }), "city");
  assert.equal(laneId("play"), "play");
  assert.equal(laneId("crime"), "lane:crime");
});

// ---- the real plan

const REAL = snapshot(loadModel());
const play = buildPlay(REAL);
const col = (id) => play.byScene.get(`episode-${id}`) && (play.byId.get(play.stackOf.get(`episode-${id}`) || `episode-${id}`) || {}).col;

test("REAL DATA: every Book I scene is placed, every one has a kind, and nothing in the routing is unresolved or circular", () => {
  assert.deepEqual(play.problems, []);
  const book = REAL.scenes.filter((s) => /^episode-c[1-4]e\d--/.test(s.id));
  assert.ok(book.length >= 70);
  const kindless = REAL.scenes.filter((s) => !/\/\/ Kind: |^Kind: /.test(s.note || "")).map((s) => s.id);
  assert.deepEqual(kindless, [], "every plan row says how heavy the scene is");
  assert.ok(play.nodes.every((n) => Number.isInteger(n.col) && Number.isFinite(n.y)));
  assert.ok(play.edges.every((e) => play.byId.get(e.to).col > play.byId.get(e.from).col), "nothing is left of what it follows");
});

test("REAL DATA: Episode One reads as the table plays it: the six Ways In stack, the Gate follows all of them, the Errand's stops stack", () => {
  assert.equal(col("c1e1--from-up-here"), 0);
  assert.equal(col("c1e1--the-road-in"), 1);
  const ways = ["ferry", "train", "tram", "bicycle", "coast-road", "on-foot"].map((w) => col(`c1e1--way-in-${w}`));
  assert.deepEqual(new Set(ways), new Set([2]), "the six solo scenes overlap: they can be taken in any order");
  assert.equal(col("c1e1--the-gate"), 3);
  const stops = ["instrument-maker", "chandlers", "noodle-stand", "tea-house", "hearing"].map((s) => col(`c1e1--errand-${s}`));
  assert.equal(new Set(stops).size, 1);
  assert.equal(col("c1e1--the-tram-back"), stops[0] + 1);
  assert.ok(col("c1e1--flood-tunnel") > col("c1e1--the-tram-back"));
});

test("REAL DATA: the night's rests are one card of twelve choices between the flood tunnel and Day 2", () => {
  const stack = play.byId.get("stack:night-rests");
  assert.equal(stack.members.length, 12);
  assert.equal(stack.col, col("c1e1--flood-tunnel") + 1);
  assert.equal(col("c1e2--as-discussed"), stack.col + 1);
});

test("REAL DATA: each later chapter is a board: the leads share a column, a lead that needs another sits after it, and the close waits for them all", () => {
  for (const [board, lead, close] of [["c2e1--the-case-board", "c2e1--the-tug-yard", "c2e1--the-report"], ["c3e1--the-case-board", "c3e1--the-blue-pigeon", "c3e1--what-it-studied"], ["c4e1--the-case-board", "c4e1--the-scrapyard", "c4e1--what-irregular-means"]]) {
    assert.equal(col(lead), col(board) + 1, `${lead} follows its board`);
    assert.ok(col(close) > col(lead));
  }
  assert.equal(col("c2e1--the-booking-counter"), col("c2e1--the-tug-yard") + 1, "the booking counter needs the tug yard's ledger");
  assert.equal(col("c3e1--kiris-show"), col("c3e1--kiris-card") + 1);
  assert.ok(col("c4e2--getting-there-first") > col("c4e1--the-tarp"));
  assert.ok(col("c4e2--out-from-under") > col("c4e2--the-square"));
});

test("REAL DATA: in a chapter that has scenes planned, every beat names the scene it happens in, except a flashback between chapters", () => {
  const planned = new Set(REAL.scenes.map((s) => s.chapter));
  const loose = REAL.chapters.filter((c) => c.n >= 2 && planned.has(c.n)).flatMap((c) => c.beats.filter((b) => !b.meta?.scene && b.kind !== "flashback").map((b) => b.id));
  assert.deepEqual(loose, [], "put `scene: <plan scene id>` on the beat's meta line, or its note sits under the chapter's first scene");
  const wide = play.lanes.flatMap((l) => [...l.cells.values()].flat()).filter((n) => n.kind === "beat" && n.chapterWide).map((n) => n.id);
  assert.deepEqual(wide, ["beat--flashback-baldwin-manor"]);
  const watcher = play.lanes.find((l) => l.key === "watcher");
  assert.ok(watcher.cells.get("episode-c2e1--the-fish-market").some((n) => n.id === "beat--the-first-new-kind"), "the Watcher's new children are under the Fish Market");
  assert.ok(watcher.cells.get("episode-c4e2--the-square").some((n) => n.id === "beat--learns-its-tracked"));
});

test("REAL DATA: chapters with no scenes yet are cards that carry the flow to the last chapter, banded by Book", () => {
  const outlines = play.nodes.filter((n) => n.kind === "outline");
  const withScenes = new Set(REAL.scenes.map((s) => s.chapter));
  assert.deepEqual(outlines.map((n) => n.chapter), REAL.chapters.filter((c) => c.n >= 2 && !withScenes.has(c.n)).map((c) => c.n));
  assert.ok(outlines.length >= 10, `${outlines.length} chapters to come`);
  assert.deepEqual(outlines[0].preds.map((p) => p.id), ["episode-c4e2--out-from-under"]);
  assert.ok(outlines.every((n, i) => i === 0 || n.col === outlines[i - 1].col + 1), "one column each, in order");
  assert.ok(play.bands.some((b) => /^Book II · /.test(b.label)));
  const told = play.lanes.flatMap((l) => [...l.cells].filter(([id]) => outlines.some((o) => o.id === id)).flatMap(([, notes]) => notes));
  assert.ok(told.length > 30, `${told.length} notes under the chapters to come`);
});

test("REAL DATA: the strands carry notes under the scenes that tell them, and the lanes are few", () => {
  assert.ok(play.lanes.length <= 9, `${play.lanes.length} strands`);
  assert.ok(play.lanes.every((l) => l.count > 0));
  const noted = play.lanes.reduce((n, l) => n + l.count, 0);
  assert.ok(noted > 150, `${noted} notes under scenes`);
  const crime = play.lanes.find((l) => l.key === "crime");
  assert.ok([...crime.cells.values()].flat().some((n) => n.id === "salt-dogs.collector"), "the Salt Dogs' collector is a note under the Night Off");
});
