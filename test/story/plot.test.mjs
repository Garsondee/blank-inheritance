// The plot's own files in canon (tools/story/plot.mjs; design/plot-timeline.md §3, D070): threads, questions, ideas,
// the Books and the chapters' beats. Each format is read here from text, and each rule is proven to fire on a small
// synthetic model, so a rule that stops working fails here.
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseThread, parseQuestion, parseIdeas, parseBooks, parseChapter, parseIntensity } from "../../tools/story/plot.mjs";
import { checkModel, parsePlan, playOrder } from "../../tools/story/lib.mjs";

const THREAD = [
  "# Manako and Cicada",
  "kind: front",
  "lane: people · order: 2 · entities: manako, cicada",
  "impulse: To be believed: make the city look up and see what is in its sky.",
  "doom: The city sees it.",
  "intensity: 1 1 2 2 | 3 4 3 4 | 5 4 5 5 | 4 5 5 | . . . . .",
  "status: sketch · by: claude · source: D071",
  "",
  "How the two of them run through the campaign.",
  "",
  "## Clock · Cicada goes public",
  "- cicada.violet-marks",
  "- beat--police-clash",
  "",
].join("\n");

test("a thread reads its lane, impulse, doom, rise and fall, and clocks", () => {
  const t = parseThread(THREAD, "manako-and-cicada");
  assert.equal(t.kind, "front");
  assert.equal(t.lane, "people");
  assert.equal(t.order, 2);
  assert.deepEqual(t.entities, ["manako", "cicada"]);
  assert.equal(t.impulse, "To be believed: make the city look up and see what is in its sky.");
  assert.equal(t.intensity.length, 20);
  assert.equal(t.intensity[0], 1);
  assert.equal(t.intensity[19], null);
  assert.deepEqual(t.clocks, [{ name: "Cicada goes public", items: ["cicada.violet-marks", "beat--police-clash"], line: 10 }]);
  assert.equal(t.status, "sketch");
  assert.equal(t.by, "claude");
  assert.equal(t.text, "How the two of them run through the campaign.");
  assert.ok(parseIntensity("1 9").some(Number.isNaN));
});

test("a question reads its answer, misdirection and roads", () => {
  const q = parseQuestion([
    "# Who wrote Cicada?",
    "answer: manako.cicada",
    "misdirect: cicada.leaderless",
    "raised: in:s1",
    "answered: in:chapter-12",
    "status: sketch · by: claude · source: D071",
    "",
    "## Roads",
    "- core · physical · manako.part-number-hand",
    "- testimony · manako.disgrace-records",
    "",
  ].join("\n"), "who-wrote-cicada");
  assert.equal(q.title, "Who wrote Cicada?");
  assert.equal(q.answer, "manako.cicada");
  assert.equal(q.answered, "in:chapter-12");
  assert.deepEqual(q.roads.map((r) => [r.core, r.kind, r.fact]), [[true, "physical", "manako.part-number-hand"], [false, "testimony", "manako.disgrace-records"]]);
});

test("ideas read with their state; Books with their chapters; a chapter with its beats", () => {
  const f = parseIdeas(["# Ideas: the mayor", "", "## idea--the-donors-raid", "A raid threatens one of the mayor's donors.", "status: sketch · by: claude · source: D068 · state: live · threads: city", ""].join("\n"), "the-mayor");
  assert.equal(f.ideas[0].id, "idea--the-donors-raid");
  assert.equal(f.ideas[0].state, "live");
  assert.deepEqual(f.ideas[0].threads, ["city"]);

  const b = parseBooks(["# The five Books", "", "## Book I · Grunt Work", "- The question: What is attacking the city?", "Section Nine: the worst jobs.", "status: sketch · by: claude · source: D071 · chapters: 1 to 4", ""].join("\n"));
  assert.deepEqual([b.books[0].book, b.books[0].from, b.books[0].to, b.books[0].title], [1, 1, 4, "Grunt Work"]);
  assert.deepEqual(b.books[0].rows, [["The question", "What is attacking the city?"]]);

  const c = parseChapter([
    "# Chapter 6 · The Show",
    "book: II · rank: Duty Section, Clearance 2 · status: sketch · by: claude · source: D071",
    "Kiri's show.",
    "",
    "## Beats",
    "",
    "### beat--the-sky-full-of-eyes",
    "Through the lenses the audience sees the sky.",
    "status: sketch · by: claude · source: D071 · kind: reveal · pace: down · threads: watcher",
    "",
    "## Notes",
    "Free words.",
    "",
  ].join("\n"), "chapter-06.md");
  assert.equal(c.id, "chapter-06");
  assert.equal(c.title, "The Show");
  assert.equal(c.book, "II");
  assert.equal(c.beats.length, 1);
  assert.equal(c.beats[0].kind, "reveal");
  assert.equal(c.beats[0].pace, "down");
  assert.equal(c.beats[0].text, "Through the lenses the audience sees the sky.");
  // A chapter's beats do not disturb the plan's own table reader.
  assert.deepEqual(parsePlan("## Beats\n### beat--x\nWords.\nstatus: sketch", "chapter-06.md"), []);
});

// ---- rules, on a synthetic model

const fact = (id, extra = {}) => ({ id, entity: id.split(".")[0], text: "Some text.", status: "decided", source: ["D001"], known: "everyone", told: "later", heldBy: null, isTrue: null, truth: null, when: null, retire: [], candidates: [], decideBy: null, ...extra });
function model(extra = {}) {
  const facts = extra.facts || [fact("x.y")];
  const byEntity = {};
  for (const f of facts) (byEntity[f.entity] ||= []).push(f);
  return {
    decisions: [{ id: "D001", file: "D001.md", split: true, quotes: 0, changes: [] }, { id: "D071", file: "D071.md", split: false, kind: "import", quotes: 0, changes: [] }],
    sources: [],
    world: Object.entries(byEntity).map(([id, fs]) => ({ id, title: id, kind: "thing", facts: fs, notes: {}, raw: "" })),
    plan: [{ file: "chapter-01.md", scene: "s0", order: 0, day: 1, dayRaw: "1", time: "morning", state: "awaiting-read" }],
    scenes: [{ file: "s0.json", id: "s0", json: { beats: [] }, raw: "{}" }],
    challenges: [], built: {}, liveText: {}, oldScenes: new Set(),
    threads: [], questions: [], ideas: [], chapters: [], books: [],
    ...extra,
  };
}
const errors = (m) => checkModel(m).filter((p) => p.level === "error").map((p) => `${p.where}: ${p.message}`);
const notes = (m) => checkModel(m).filter((p) => p.level === "warn").map((p) => `${p.where}: ${p.message}`);
const sketch = { status: "sketch", by: "claude", source: ["D071"] };
const BOOKS = [
  { id: "book-i", book: 1, numeral: "I", title: "One", from: 1, to: 4, rows: [], text: "", status: "sketch", by: "claude", source: ["D071"] },
  { id: "book-ii", book: 2, numeral: "II", title: "Two", from: 5, to: 8, rows: [], text: "", status: "sketch", by: "claude", source: ["D071"] },
];

test("play order runs chapter by chapter: chapter 1's scenes, then each later chapter's beats", () => {
  const m = model({ chapters: [{ id: "chapter-06", n: 6, file: "plan/chapter-06.md", beats: [{ id: "beat--b", ...sketch, kind: "event", threads: [] }], ...sketch }] });
  const { order, planned } = playOrder(m);
  assert.ok(order.get("chapter-01") < order.get("s0"));
  assert.ok(order.get("s0") < order.get("chapter-06"));
  assert.ok(order.get("chapter-06") < order.get("beat--b"));
  assert.ok(planned.has("beat--b"));
  // So a fact may be told in a chapter or a beat
  assert.deepEqual(errors(model({ ...m, facts: [fact("x.y", { told: "in:beat--b" })] })), []);
});

test("a beat must have a known kind and pace; beat ids are unique", () => {
  const beat = (extra) => ({ id: "beat--b", ...sketch, kind: "event", threads: [], ...extra });
  const ch = (beats) => model({ chapters: [{ id: "chapter-02", n: 2, file: "plan/chapter-02.md", beats, ...sketch }] });
  assert.deepEqual(errors(ch([beat()])), []);
  assert.ok(errors(ch([beat({ kind: "montage" })])).some((e) => /kind must be one of/.test(e)));
  assert.ok(errors(ch([beat({ pace: "sideways" })])).some((e) => /pace must be one of/.test(e)));
  assert.ok(errors(ch([beat(), beat()])).some((e) => /used twice/.test(e)));
  assert.ok(errors(ch([beat({ by: null })])).some((e) => /pencil needs "by: ingram" or "by: claude"/.test(e)));
});

test("a beat's scene: must name a scene of its own chapter's plan (the leading episode- may be left off)", () => {
  const plan = [
    { file: "chapter-01.md", scene: "s0", order: 0, day: 1, dayRaw: "1", time: "morning", state: "awaiting-read" },
    { file: "chapter-02.md", scene: "episode-c2e1--yard", order: 1, day: null, dayRaw: "—", time: "flexible", state: "unwritten" },
  ];
  const beat = (scene) => ({ id: "beat--b", ...sketch, kind: "event", threads: [], meta: { scene } });
  const ch = (b) => model({ plan, chapters: [{ id: "chapter-02", n: 2, file: "plan/chapter-02.md", beats: [b], ...sketch }] });
  assert.deepEqual(errors(ch(beat("c2e1--yard"))), []);
  assert.deepEqual(errors(ch(beat("episode-c2e1--yard"))), []);
  assert.deepEqual(errors(ch({ ...beat(undefined), meta: {} })), [], "no scene: the beat belongs to the chapter as a whole");
  assert.ok(errors(ch(beat("c2e1--nowhere"))).some((e) => /is not a scene in the plan/.test(e)));
  assert.ok(errors(ch(beat("s0"))).some((e) => /not in this chapter/.test(e)));
});

test("a plan row's routing must name real scenes and must not loop; a note with no Kind is said", () => {
  const row = (scene, note) => ({ file: "chapter-01.md", scene, title: scene, episode: "Episode One", order: 0, day: 1, dayRaw: "1", time: "morning", state: "unwritten", note });
  const m = (rows) => model({ plan: rows, scenes: [] });
  assert.deepEqual(errors(m([row("a", "Kind: light"), row("b", "After: a // Kind: plot")])), []);
  assert.ok(errors(m([row("a", "After: nowhere // Kind: light")])).some((e) => /After: nowhere is not a scene in the plan/.test(e)));
  assert.ok(errors(m([row("a", "After: b // Kind: light"), row("b", "After: a // Kind: light")])).some((e) => /cycle/.test(e)));
  assert.ok(errors(m([row("a", "Kind: nonsense")])).some((e) => /unknown kind/.test(e)));
  assert.ok(notes(m([row("a", "Arrive: x.")])).some((e) => /no "Kind:/.test(e)));
  assert.ok(!notes(m([row("a", "Arrive: x. // Kind: light")])).some((e) => /no "Kind:/.test(e)));
});

test("Books cover the chapters from 1 with no gap, and a chapter sits inside its Book", () => {
  assert.deepEqual(errors(model({ books: BOOKS })), []);
  assert.ok(errors(model({ books: [BOOKS[0], { ...BOOKS[1], from: 6 }] })).some((e) => /expected 5/.test(e)));
  const wrongBook = model({ books: BOOKS, chapters: [{ id: "chapter-06", n: 6, file: "plan/chapter-06.md", book: "I", beats: [], ...sketch }] });
  assert.ok(errors(wrongBook).some((e) => /not in Book I/.test(e)));
});

test("a thread's intensity has one value per chapter, and its clocks name real things", () => {
  const thread = (extra) => ({ id: "t", file: "threads/t.md", kind: "front", entities: [], intensity: [], clocks: [], order: 1, ...sketch, ...extra });
  assert.deepEqual(errors(model({ books: BOOKS, threads: [thread({ intensity: [1, 2, 3, 4, 5, 4, 3, 2] })] })), []);
  assert.ok(errors(model({ books: BOOKS, threads: [thread({ intensity: [1, 2] })] })).some((e) => /the Books have 8 chapters/.test(e)));
  assert.ok(errors(model({ threads: [thread({ intensity: [1, NaN] })] })).some((e) => /0 to 5/.test(e)));
  assert.ok(errors(model({ threads: [thread({ clocks: [{ name: "c", items: ["nowhere.at-all"] }] })] })).some((e) => /not a fact, beat/.test(e)));
  assert.ok(errors(model({ threads: [thread({ kind: "saga" })] })).some((e) => /kind must be one of/.test(e)));
  assert.ok(notes(model({ threads: [thread({ entities: ["baldwin"] })] })).some((e) => /baldwin has no canon\/world file/.test(e)));
});

test("a question's answer and roads are real facts of known clue kinds", () => {
  const facts = [fact("a.answer", { told: "in:chapter-03" }), fact("a.road1", { told: "in:s0" }), fact("a.road2", { told: "in:s0" }), fact("a.late", { told: "in:chapter-04" })];
  const chapters = [3, 4].map((n) => ({ id: `chapter-0${n}`, n, file: `plan/chapter-0${n}.md`, beats: [], ...sketch }));
  const q = (extra) => ({ id: "q", file: "questions/q.md", answer: "a.answer", misdirect: null, raised: "in:s0", answered: "in:chapter-03", roads: [], ...sketch, ...extra });
  const road = (core, kind, f) => ({ core, kind, fact: f });
  const good = model({ facts, chapters, questions: [q({ roads: [road(true, "physical", "a.road1"), road(false, "testimony", "a.road2"), road(false, "anomaly", "a.road1")] })] });
  assert.deepEqual(errors(good), []);
  assert.deepEqual(notes(good).filter((n) => /questions/.test(n)), []);
  assert.ok(errors(model({ facts, chapters, questions: [q({ answer: "a.nothing" })] })).some((e) => /answer a\.nothing is not a canon fact/.test(e)));
  assert.ok(errors(model({ facts, chapters, questions: [q({ roads: [road(false, "hunch", "a.road1")] })] })).some((e) => /road's kind/.test(e)));
  assert.ok(errors(model({ facts, chapters, questions: [q({ answered: "in:chapter-09" })] })).some((e) => /isn't in the plan/.test(e)));
  // The Three Clue Rule warns only inside the horizon (Book I, chapters 1 to 4)
  const thin = q({ roads: [road(false, "pattern", "a.late")] });
  const warned = notes(model({ facts, chapters, questions: [thin] }));
  assert.ok(warned.some((n) => /only 1 road/.test(n)));
  assert.ok(warned.some((n) => /pattern clue is the only road/.test(n)));
  assert.ok(warned.some((n) => /no road is marked core/.test(n)));
  assert.ok(warned.some((n) => /told after the answer/.test(n)));
  const far = model({ facts, chapters: [...chapters, { id: "chapter-12", n: 12, file: "plan/chapter-12.md", beats: [], ...sketch }], questions: [q({ answered: "in:chapter-12", roads: [] })] });
  assert.deepEqual(notes(far).filter((n) => n.startsWith("questions/")), [], "past the horizon, answers wait on purpose");
});

test("ideas are always pencil, and say what they became or what must not come back", () => {
  const idea = (extra) => ({ id: "idea--x", file: "ideas/t.md", topic: "t", threads: [], became: [], retire: [], state: "live", when: null, ...sketch, ...extra });
  assert.deepEqual(errors(model({ ideas: [idea()] })), []);
  assert.ok(errors(model({ ideas: [idea({ status: "decided", by: null, source: ["D001"] })] })).some((e) => /always pencil/.test(e)));
  assert.ok(errors(model({ ideas: [idea({ state: "maybe" })] })).some((e) => /state must be one of/.test(e)));
  assert.ok(errors(model({ ideas: [idea({ state: "adopted" })] })).some((e) => /names what it became/.test(e)));
  assert.deepEqual(errors(model({ ideas: [idea({ state: "adopted", became: ["x.y"] })] })), []);
  assert.ok(notes(model({ ideas: [idea({ state: "rejected" })] })).some((n) => /retire/.test(n)));
});

test("a rejected idea's wording may not come back anywhere", () => {
  const m = model({
    ideas: [{ id: "idea--sorters", file: "ideas/t.md", topic: "t", threads: [], became: [], retire: ["the Sorters"], state: "rejected", when: null, ...sketch }],
    liveText: { "CLAUDE.md": "Remember the Sorters." },
  });
  assert.ok(errors(m).some((e) => /CLAUDE\.md: uses "the Sorters", retired with idea--sorters/.test(e)));
});
