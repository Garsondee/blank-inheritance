// The intelligent merge (tools/story/merge.mjs, tools/story/merges.mjs; design/plot-timeline.md §8 step 7, D079, D080).
// Every test runs on a scratch canon of its own. A merge joins pencil pieces of one thing into one item, keeps every
// source and `from:` key, rewrites the lists and fields that named a piece, records each original so it undoes
// exactly, never touches ink, an open decision or her own wording, and is rolled back whole if it breaks a check.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { checkProposals, applyProposals, undoMerges, contentOf, lostWords, MAX_WORDS } from "../../tools/story/merge.mjs";
import { parseMergeRecord, aliasesOf, resolveAlias, mergesOf } from "../../tools/story/merges.mjs";
import { loadModel, checkModel, itemIndex } from "../../tools/story/lib.mjs";
import { claimDayRecord, appendEdits } from "../../tools/story/daybook.mjs";
import { contextPack } from "../../tools/story/context.mjs";

const FILES = {
  "canon/decisions/D001.md": "# D001 · 2026-10-01 · The start\n\n## Ingram\n\n> \"Yes.\"\n\n## Changes\n\n- add `a.ink`\n",
  "canon/decisions/D002.md": [
    "# D002 · 2026-10-02 · An import",
    "kind: import",
    "",
    "asked: nothing.",
    "",
    "## What came in",
    "",
    "Pencil.",
    "",
    "## Changes",
    "",
    "- add `a.p1`",
    "- add `a.p2`",
    "- add `a.p3`",
    "- add `a.p4`",
    "",
  ].join("\n"),
  "canon/world/a.md": [
    "# A",
    "kind: thing",
    "",
    "## a.ink",
    "An ink fact.",
    "status: decided · source: D001 · known: everyone · told: later",
    "",
    "## Pencil",
    "",
    "## a.p1",
    "The mine is old, and its foreman was called Harrow.",
    "status: sketch · by: claude · source: D002 · from: x:1 · known: nobody · told: later",
    "",
    "## a.p2",
    "The mine closed forty years ago after a collapse that killed nobody.",
    "status: sketch · by: claude · source: D002, D001 · from: y:2, x:1 · known: nobody · told: later · when: about 40 years ago",
    "",
    "## a.p3",
    "Nobody has been down the main shaft since, and the gate is chained.",
    "status: sketch · by: claude · source: D002 · known: nobody · told: later · threads: t",
    "",
    "## a.p4",
    "Everyone in town says the mine was a pit of misery.",
    "status: sketch · by: claude · source: D002 · known: everyone · told: later",
    "",
    "## a.h1",
    "She said the mine would flood.",
    "status: sketch · by: ingram · source: D001 · known: nobody · told: later",
    "",
    "## a.h2",
    "She said the foreman never came out.",
    "status: sketch · by: ingram · source: D001 · known: nobody · told: later",
    "",
    "## a.open",
    "Who chained the gate is not decided: the foreman or the town.",
    "status: open · source: D001 · known: nobody · told: later · candidates: the foreman | the town · decide-by: before Chapter 3",
    "",
  ].join("\n"),
  "canon/world/b.md": [
    "# B",
    "kind: place",
    "",
    "## Pencil",
    "",
    "## b.rebuilt",
    "The town was rebuilt later.",
    "status: sketch · by: claude · source: D001 · known: some · told: later · when: about 5 years after a.p2",
    "",
  ].join("\n"),
  "canon/threads/t.md": [
    "# The Mine",
    "kind: thread",
    "lane: city · order: 1 · entities: a",
    "status: sketch · by: claude · source: D001",
    "The thread's words.",
    "",
    "## Clock · The dig",
    "- a.p1",
    "- a.p3",
    "- b.rebuilt",
    "",
  ].join("\n"),
  "canon/questions/q.md": [
    "# What happened at the mine?",
    "answer: a.ink",
    "status: sketch · by: claude · source: D001",
    "",
    "## Roads",
    "- core · physical · a.p2",
    "- testimony · a.p1",
    "- absence · a.p3",
    "",
  ].join("\n"),
  "canon/ideas/i.md": [
    "# Ideas: i",
    "",
    "## idea--one",
    "The gate opens by itself.",
    "status: sketch · by: claude · source: D001 · from: z:1 · state: live",
    "",
    "## idea--two",
    "The gate opens at dusk, never at dawn.",
    "status: sketch · by: claude · source: D001 · from: z:2 · state: live · threads: t",
    "",
  ].join("\n"),
};

function scratch({ crlf = false, extra = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "story-merge-"));
  for (const [rel, text] of Object.entries({ ...FILES, ...extra })) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), crlf ? text.replace(/\n/g, "\r\n") : text);
  }
  return root;
}
const read = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8");
const freshErrors = (root) => checkModel(loadModel(root)).filter((p) => p.level === "error" && !p.where.startsWith("data/"));
const fact = (root, id) => itemIndex(loadModel(root)).get(id)?.item;
const snapshotOf = (root) => Object.fromEntries(["canon/world/a.md", "canon/world/b.md", "canon/threads/t.md", "canon/questions/q.md", "canon/ideas/i.md"].map((f) => [f, read(root, f)]));

const MINE = {
  entity: "a",
  kind: "fact",
  merges: [{
    into: "a.the-mine",
    from: ["a.p1", "a.p2", "a.p3"],
    text: "The mine is old, and its foreman was called Harrow. It closed forty years ago after a collapse that killed nobody. Nobody has been down the main shaft since, and the gate is chained.",
    why: "the mine, in three pieces",
  }],
};
const merged = (root, proposals = [MINE]) => applyProposals(root, proposals, { now: new Date(2026, 9, 8, 12, 0), asked: 'Ingram: "begin".' });

test("the scratch canon checks clean, so every error a test sees is one the merge made", () => {
  const root = scratch();
  try { assert.deepEqual(freshErrors(root), []); } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a merge makes one item of the pieces: their words, every source and from key, who knows it, when it is told, its date and threads", () => {
  const root = scratch();
  try {
    const out = merged(root);
    assert.equal(out.ok, true, out.error);
    assert.equal(out.record, "D003");
    assert.equal(out.applied.length, 1);
    for (const gone of ["a.p1", "a.p2", "a.p3"]) assert.equal(fact(root, gone), undefined, `${gone} is gone`);
    const f = fact(root, "a.the-mine");
    assert.equal(f.status, "sketch");
    assert.equal(f.by, "claude");
    assert.equal(f.known, "nobody");
    assert.equal(f.told, "later");
    assert.equal(f.when, "about 40 years ago");
    assert.deepEqual(f.threads, ["t"]);
    assert.deepEqual(f.source, ["D002", "D001", "D003"]);
    assert.equal(f.origin, "x:1, y:2");
    assert.equal(f.zone, "pencil");
    assert.match(f.text, /Harrow\. It closed forty years ago/);
    // the rest of the file is untouched, in its order
    const world = read(root, "canon/world/a.md");
    assert.ok(world.indexOf("## a.the-mine") < world.indexOf("## a.p4"));
    assert.ok(world.indexOf("## a.ink") < world.indexOf("## Pencil"));
    assert.deepEqual(freshErrors(root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("what named a piece names the merged item: a clock, a road, a date anchor in another file; a repeat is dropped", () => {
  const root = scratch();
  try {
    const out = merged(root);
    assert.equal(out.ok, true, out.error);
    const clock = read(root, "canon/threads/t.md");
    assert.match(clock, /^- a\.the-mine$/m);
    assert.equal(clock.match(/a\.the-mine/g).length, 1, "the two clock steps that named pieces are one now");
    assert.match(clock, /^- b\.rebuilt$/m);
    const q = read(root, "canon/questions/q.md");
    assert.match(q, /^- core · physical · a\.the-mine$/m);
    assert.match(q, /^- testimony · a\.the-mine$/m);
    assert.match(read(root, "canon/world/b.md"), /when: about 5 years after a\.the-mine/);
    assert.deepEqual(freshErrors(root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the record is Claude's: kind merge, never authority, with each original kept exactly, and it reads back", () => {
  const root = scratch();
  try {
    merged(root);
    const text = read(root, "canon/decisions/D003.md");
    assert.match(text, /^# D003 · 2026-10-08 · /);
    assert.match(text, /^kind: merge$/m);
    assert.match(text, /^- merge `a\.the-mine` ← a\.p1, a\.p2, a\.p3$/m);
    const [m] = parseMergeRecord(text, "D003");
    assert.equal(m.ref, "D003#M1");
    assert.equal(m.kept, "a.the-mine");
    assert.deepEqual(m.absorbed, ["a.p1", "a.p2", "a.p3"]);
    assert.equal(m.state, "live");
    assert.equal(m.was.get("a.p2"), FILES["canon/world/a.md"].split("\n").slice(13, 16).join("\n"), "the original section, line for line");
    assert.ok(m.refs.length >= 4);
    const model = loadModel(root);
    assert.equal(model.decisions.find((d) => d.id === "D003").kind, "merge");
    assert.equal(model.aliases.get("a.p2"), "a.the-mine");
    assert.equal(resolveAlias(model.aliases, "a.p1"), "a.the-mine");
    assert.equal(mergesOf(model).length, 1);
    // an item she could only ink with her own words is never inked by this record
    const bad = scratch({ extra: { "canon/world/c.md": "# C\nkind: thing\n\n## c.x\nInked by a merge record.\nstatus: decided · source: D003 · known: everyone · told: later\n" } });
    fs.copyFileSync(path.join(root, "canon/decisions/D003.md"), path.join(bad, "canon/decisions/D003.md"));
    try {
      fs.writeFileSync(path.join(bad, "canon/decisions/D003.md"), "# D003 · 2026-10-08 · A merge\nkind: merge\n\n## Merges\n\n## Changes\n\n- decide `c.x`\n");
      assert.ok(freshErrors(bad).some((e) => /merge record only merges pencil/.test(e.message)));
      assert.ok(freshErrors(bad).some((e) => /must cite the decision or source record that made it so/.test(e.message)));
    } finally { fs.rmSync(bad, { recursive: true, force: true }); }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("an older record that named a merged piece still finds it, through the alias", () => {
  const root = scratch();
  try {
    merged(root);
    assert.ok(read(root, "canon/decisions/D002.md").includes("- add `a.p2`"), "history is never rewritten");
    assert.deepEqual(freshErrors(root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("undo puts every byte back: the facts, the clock, the road, the anchor; the record says undone", () => {
  const root = scratch();
  try {
    const before = snapshotOf(root);
    merged(root);
    const out = undoMerges(root, "D003#M1", { now: new Date(2026, 9, 9) });
    assert.equal(out.ok, true, out.error);
    assert.deepEqual(out.undone.map((u) => u.restored), [["a.p1", "a.p2", "a.p3"]]);
    assert.deepEqual(snapshotOf(root), before);
    const [m] = mergesOf(loadModel(root));
    assert.equal(m.state, "undone");
    assert.equal(m.undone, "2026-10-09");
    assert.ok(!/^- merge `a\.the-mine`/m.test(read(root, "canon/decisions/D003.md")), "its Changes line is gone");
    assert.equal(loadModel(root).aliases.size, 0);
    assert.deepEqual(freshErrors(root), []);
    assert.equal(undoMerges(root, "D003#M1").ok, false, "already undone");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("an item edited since the merge is not undone: nothing is written", () => {
  const root = scratch();
  try {
    merged(root);
    const world = read(root, "canon/world/a.md").replace("The mine is old", "The mine is very old");
    fs.writeFileSync(path.join(root, "canon/world/a.md"), world);
    const out = undoMerges(root, "D003#M1");
    assert.equal(out.ok, false);
    assert.match(out.error, /edited since it was merged/);
    assert.equal(read(root, "canon/world/a.md"), world);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("only pencil is merged: ink, an open decision and a cut item are refused", () => {
  const root = scratch();
  try {
    const { merges } = checkProposals(root, [{ entity: "a", merges: [
      { into: "a.x", from: ["a.ink", "a.p1"], text: "An ink fact. The mine is old, and its foreman was called Harrow." },
      { into: "a.y", from: ["a.open", "a.p2"], text: "Who chained the gate is not decided. The mine closed forty years ago after a collapse that killed nobody." },
    ] }]);
    assert.equal(merges[0].ok, false);
    assert.match(merges[0].reasons.join(" "), /a\.ink is decided: only pencil is merged/);
    assert.equal(merges[1].ok, false);
    assert.match(merges[1].reasons.join(" "), /a\.open is open/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("pieces that differ in who knows them, when the table hears them, or who wrote them are left apart", () => {
  const root = scratch();
  try {
    const { merges } = checkProposals(root, [{ entity: "a", merges: [
      { into: "a.k", from: ["a.p1", "a.p4"], text: "The mine is old, and its foreman was called Harrow. Everyone in town says the mine was a pit of misery." },
      { into: "a.b", from: ["a.p1", "a.h1"], text: "The mine is old, and its foreman was called Harrow. She said the mine would flood." },
    ] }]);
    assert.match(merges[0].reasons.join(" "), /who knows it \(nobody \/ everyone\)/);
    assert.match(merges[1].reasons.join(" "), /differ in by \(claude \/ ingram\)/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("pieces with different dates are a conflict for her, not a merge", () => {
  const root = scratch({ extra: { "canon/world/a.md": FILES["canon/world/a.md"].replace("known: nobody · told: later · threads: t", "known: nobody · told: later · when: about 10 years ago") } });
  try {
    const { merges } = checkProposals(root, [{ entity: "a", merges: [{ into: "a.d", from: ["a.p2", "a.p3"], text: "The mine closed forty years ago after a collapse that killed nobody. Nobody has been down the main shaft since, and the gate is chained." }] }]);
    assert.equal(merges[0].ok, false);
    assert.match(merges[0].reasons.join(" "), /different dates/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("her own words are joined as she said them, never reworded", () => {
  const root = scratch();
  try {
    const reworded = checkProposals(root, [{ entity: "a", merges: [{ into: "a.her", from: ["a.h1", "a.h2"], text: "She said the mine would flood and that the foreman never came out." }] }]);
    assert.equal(reworded.merges[0].ok, false);
    assert.match(reworded.merges[0].reasons.join(" "), /her words are only joined, never reworded/);
    const joined = checkProposals(root, [{ entity: "a", merges: [{ into: "a.her", from: ["a.h1", "a.h2"], text: "She said the mine would flood. She said the foreman never came out." }] }]);
    assert.equal(joined.merges[0].ok, true, joined.merges[0].reasons?.join("; "));
    const out = merged(root, [{ entity: "a", merges: [{ into: "a.her", from: ["a.h1", "a.h2"], text: "She said the mine would flood. She said the foreman never came out." }] }]);
    assert.equal(out.ok, true, out.error);
    assert.equal(fact(root, "a.her").by, "ingram");
    assert.deepEqual(freshErrors(root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the merged words may not lose a name, a number or a quoted phrase, nor most of the rest", () => {
  const root = scratch();
  try {
    const noName = checkProposals(root, [{ entity: "a", merges: [{ into: "a.m", from: ["a.p1", "a.p2"], text: "The mine is old, and its foreman is known. It closed long ago after a collapse that killed nobody." }] }]);
    assert.match(noName.merges[0].reasons.join(" "), /lose: .*(harrow|forty)/i);
    const thin = checkProposals(root, [{ entity: "a", merges: [{ into: "a.m", from: ["a.p1", "a.p3"], text: "Harrow's mine." }] }]);
    assert.match(thin.merges[0].reasons.join(" "), /keep only \d+% of the pieces' content/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a merged item is not longer than the pieces put together, nor more than the limit", () => {
  const root = scratch();
  try {
    const padded = `${MINE.merges[0].text} ${"It is a very long story. ".repeat(12)}`;
    const long = checkProposals(root, [{ entity: "a", merges: [{ ...MINE.merges[0], text: padded }] }]);
    assert.match(long.merges[0].reasons.join(" "), /longer than the pieces put together/);
    assert.ok(MAX_WORDS >= 100);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a piece she edited or left a note on is left alone", () => {
  const root = scratch();
  try {
    const claim = claimDayRecord(root, "2026-10-08");
    fs.writeFileSync(claim.file, appendEdits(fs.readFileSync(claim.file, "utf8"), [{ op: "note", note: "N1", id: "a.p2", text: "Check this first." }]));
    const { merges } = checkProposals(root, [MINE]);
    assert.equal(merges[0].ok, false);
    assert.match(merges[0].reasons.join(" "), /a\.p2 has an edit or a note of hers/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a piece a scene cites, or prose that names a piece, stops the merge", () => {
  const scene = JSON.stringify({ id: "s1", title: "S", beats: [{ id: "b1", facts: ["a.p3"] }] });
  const root = scratch({ extra: { "canon/scenes/s1.json": scene } });
  try {
    const { merges } = checkProposals(root, [MINE]);
    assert.equal(merges[0].ok, false);
    assert.match(merges[0].reasons.join(" "), /a\.p3 is cited by play material/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  const prose = scratch({ extra: { "canon/world/b.md": FILES["canon/world/b.md"].replace("The town was rebuilt later.", "The town was rebuilt later, see a.p1 for why.") } });
  try {
    const { merges } = checkProposals(prose, [MINE]);
    assert.equal(merges[0].ok, false);
    assert.match(merges[0].reasons.join(" "), /a\.p1 is named in prose at canon\/world\/b\.md/);
  } finally { fs.rmSync(prose, { recursive: true, force: true }); }
});

test("ids: a new id must be free, and a piece is in one merge only", () => {
  const root = scratch();
  try {
    const taken = checkProposals(root, [{ entity: "a", merges: [{ into: "a.ink", from: ["a.p1", "a.p2"], text: MINE.merges[0].text.split(" Nobody")[0] }] }]);
    assert.match(taken.merges[0].reasons.join(" "), /a\.ink already exists/);
    const twice = checkProposals(root, [{ entity: "a", merges: [
      { into: "a.one", from: ["a.p1", "a.p2"], text: MINE.merges[0].text.split(" Nobody")[0] },
      { into: "a.two", from: ["a.p1", "a.p3"], text: "The mine is old, and its foreman was called Harrow. Nobody has been down the main shaft since, and the gate is chained." },
    ] }]);
    assert.equal(twice.merges[0].ok, true, twice.merges[0].reasons?.join("; "));
    assert.match(twice.merges[1].reasons.join(" "), /a\.p1 is already in another merge/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("wording that is retired stays retired: a merge may not bring it back", () => {
  const root = scratch({ extra: { "canon/world/c.md": "# C\nkind: thing\n\n## Pencil\n\n## c.cut\nA cut fact.\nstatus: cut · source: D001 · known: nobody · told: later · retire: the gate is chained\n" } });
  try {
    const { merges } = checkProposals(root, [MINE]);
    assert.equal(merges[0].ok, false);
    assert.match(merges[0].reasons.join(" "), /uses "the gate is chained", retired with c\.cut/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("two ideas that are one idea merge too: state, sources, from keys and threads agree", () => {
  const root = scratch();
  try {
    const out = merged(root, [{ entity: "i", kind: "idea", merges: [{ into: "idea--the-gate", from: ["idea--one", "idea--two"], text: "The gate opens by itself, at dusk and never at dawn.", why: "one idea" }] }]);
    assert.equal(out.ok, true, out.error);
    const model = loadModel(root);
    assert.deepEqual(model.ideas.map((i) => i.id), ["idea--the-gate"]);
    const idea = model.ideas[0];
    assert.equal(idea.state, "live");
    assert.deepEqual(idea.threads, ["t"]);
    assert.equal(idea.origin, "z:1, z:2");
    assert.deepEqual(freshErrors(root), []);
    assert.equal(undoMerges(root, "D003").ok, true);
    assert.deepEqual(loadModel(root).ideas.map((i) => i.id), ["idea--one", "idea--two"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("line endings are kept: a CRLF canon stays CRLF, and undo restores it byte for byte", () => {
  const root = scratch({ crlf: true });
  try {
    const before = snapshotOf(root);
    const out = merged(root);
    assert.equal(out.ok, true, out.error);
    for (const rel of ["canon/world/a.md", "canon/threads/t.md", "canon/questions/q.md"]) assert.ok(!/(?<!\r)\n/.test(read(root, rel)), `${rel} stays CRLF`);
    assert.equal(undoMerges(root, "D003").ok, true);
    assert.deepEqual(snapshotOf(root), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a merge that would add an error to the check is rolled back whole, record and all", () => {
  const root = scratch();
  try {
    const before = snapshotOf(root);
    const bad = { entity: "a", merges: [{ ...MINE.merges[0], text: `${MINE.merges[0].text} See quarantine ideas/story/old.md for more.` }] };
    const out = merged(root, [bad]);
    assert.equal(out.ok, false);
    assert.match(out.error, /no merge passed the checks|break canon's checks/);
    assert.match(out.rejected[0].reasons.join(" "), /would add a check error/);
    assert.deepEqual(snapshotOf(root), before);
    assert.ok(!fs.existsSync(path.join(root, "canon/decisions/D003.md")), "no record is left");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("what the checker reads: stems, numbers, names and quoted phrases", () => {
  const c = contentOf('Manako founded Cicada about 44 years ago, and "Believe me now?" is its prayer.');
  assert.ok(c.must.has("44"));
  assert.ok(c.must.has("cicada"));
  assert.ok([...c.must].some((x) => x.startsWith('"believe me now')));
  assert.equal(lostWords(["The mine closed forty years ago."], "The mine closed forty years ago.").recall, 1);
  assert.ok(lostWords(["The mine closed forty years ago after a collapse."], "The mine closed.").recall < 0.8);
});

test("aliases follow a chain of merges", () => {
  const decisions = [
    { id: "D010", kind: "merge", text: "# D010 · 2026-10-08 · m\nkind: merge\n\n## Merges\n\n### M1 · a.b\nkind: fact\nfile: world/a.md\nkept: a.b\nabsorbed: a.a, a.b\nstate: live\n" },
    { id: "D011", kind: "merge", text: "# D011 · 2026-10-09 · m\nkind: merge\n\n## Merges\n\n### M1 · a.c\nkind: fact\nfile: world/a.md\nkept: a.c\nabsorbed: a.b, a.c\nstate: live\n" },
  ];
  const aliases = aliasesOf(decisions);
  assert.equal(resolveAlias(aliases, "a.a"), "a.c");
  assert.equal(resolveAlias(aliases, "a.c"), "a.c");
});

// ---- the page: what she can do with a merge (tools/timeline/ops.mjs, tools/story/snapshot.mjs, core timeline-views)

import { applyOps } from "../../tools/timeline/ops.mjs";
import { snapshot } from "../../tools/story/snapshot.mjs";
import { parseDayEdits } from "../../tools/story/daybook.mjs";
import { mergeFor, mergesPage, recentDecisions } from "../../module/blank-inheritance/scripts/core/timeline-views.mjs";

const HERS = new Date(2026, 9, 9, 15, 30);
const page = (root, ops) => applyOps(root, ops, { now: HERS });

test("the snapshot carries each merge: its pieces as they were, whether it was edited, whether she passed it", () => {
  const root = scratch();
  try {
    merged(root, [{ ...MINE, notMerged: [{ ids: ["a.p4", "a.p1"], why: "known by everyone, not nobody" }], conflicts: [{ ids: ["a.h1", "a.h2"], why: "one says it floods, one says it does not" }], overlaps: [{ ids: ["a.p1", "b.rebuilt"], why: "says the same from b" }] }]);
    const snap = snapshot(loadModel(root), { root });
    assert.equal(snap.merges.length, 1);
    const m = snap.merges[0];
    assert.equal(m.ref, "D003#M1");
    assert.equal(m.kept, "a.the-mine");
    assert.equal(m.state, "live");
    assert.deepEqual(m.pieces.map((p) => p.id), ["a.p1", "a.p2", "a.p3"]);
    assert.equal(m.pieces[1].text, "The mine closed forty years ago after a collapse that killed nobody.");
    assert.equal(m.pieces[1].known, "nobody");
    assert.equal(m.accepted, false);
    assert.equal(m.edited, false);
    assert.equal(m.gone, false);
    const record = snap.decisions.find((d) => d.id === "D003");
    assert.equal(record.kind, "merge");
    assert.equal(record.left.length, 1);
    assert.match(record.left[0], /known by everyone, not nobody/);
    assert.equal(record.conflicts.length, 1);
    assert.match(record.conflicts[0], /one says it floods/);
    assert.equal(record.overlaps.length, 1);
    assert.equal(recentDecisions(snap).find((r) => r.id === "D003").kindWord, "Claude's merge");
    const view = mergesPage(snap);
    assert.equal(view.live, 1);
    assert.equal(view.toCheck, 1);
    assert.equal(view.pieces, 3);
    assert.equal(view.groups[0].merges[0].text.startsWith("The mine is old"), true);
    assert.equal(mergeFor(snap, "a.the-mine").ref, "D003#M1");
    assert.equal(mergeFor(snap, "a.ink"), null);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("she says a merge looks right: one quoted line in her day record, nothing else changes, and the page knows", () => {
  const root = scratch();
  try {
    merged(root);
    const world = read(root, "canon/world/a.md");
    const out = page(root, [{ op: "mergeok", id: "a.the-mine", merge: "D003#M1" }]);
    assert.equal(out.ok, true, out.error);
    assert.equal(out.record, "D004");
    const rec = read(root, "canon/decisions/D004.md");
    assert.match(rec, /^> `a\.the-mine` · merge D003#M1 looks right$/m);
    assert.deepEqual(parseDayEdits(rec), [{ op: "mergeok", id: "a.the-mine", merge: "D003#M1" }]);
    assert.equal(read(root, "canon/world/a.md"), world, "the item itself is untouched");
    assert.equal(snapshot(loadModel(root), { root }).merges[0].accepted, true);
    assert.deepEqual(freshErrors(root), []);
    assert.equal(page(root, [{ op: "mergeok", id: "a.the-mine", merge: "D003#M1" }]).results[0].result, "already");
    assert.equal(page(root, [{ op: "mergeok", id: "a.p1", merge: "D003#M1" }]).ok, false, "it made a.the-mine, not a.p1");
    assert.equal(page(root, [{ op: "mergeok", id: "a.the-mine", merge: "D003#M9" }]).ok, false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("she undoes a merge from the page: the pieces come back exactly, the record says undone, and her day record quotes it", () => {
  const root = scratch();
  try {
    const before = snapshotOf(root);
    merged(root);
    const out = page(root, [{ op: "unmerge", id: "a.the-mine", merge: "D003#M1" }]);
    assert.equal(out.ok, true, out.error);
    assert.deepEqual(out.results[0].restored, ["a.p1", "a.p2", "a.p3"]);
    assert.deepEqual(snapshotOf(root), before);
    const rec = read(root, "canon/decisions/D004.md");
    assert.match(rec, /^> `a\.the-mine` · un-merged D003#M1$/m);
    assert.deepEqual(parseDayEdits(rec), [{ op: "unmerge", id: "a.the-mine", merge: "D003#M1" }]);
    const snap = snapshot(loadModel(root), { root });
    assert.equal(snap.merges[0].state, "undone");
    assert.equal(mergesPage(snap).live, 0);
    assert.equal(mergesPage(snap).undone, 1);
    assert.deepEqual(freshErrors(root), []);
    assert.equal(page(root, [{ op: "unmerge", id: "a.the-mine", merge: "D003#M1" }]).results[0].result, "already");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a merge she edited since cannot be taken apart from the page: nothing is written, not even a record", () => {
  const root = scratch();
  try {
    merged(root);
    const edit = page(root, [{ op: "text", id: "a.the-mine", before: fact(root, "a.the-mine").text, value: "The mine is very old, and its foreman was called Harrow." }]);
    assert.equal(edit.ok, true, edit.error);
    assert.equal(snapshot(loadModel(root), { root }).merges[0].edited, true);
    const files = fs.readdirSync(path.join(root, "canon/decisions")).sort();
    const out = page(root, [{ op: "unmerge", id: "a.the-mine", merge: "D003#M1" }]);
    assert.equal(out.ok, false);
    assert.match(out.error, /edited since it was merged/);
    assert.deepEqual(fs.readdirSync(path.join(root, "canon/decisions")).sort(), files, "no new record");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a piece she has already acted on is never merged: her accepted merge, her edit and her note all keep it out of the next wave", () => {
  const root = scratch();
  try {
    merged(root);
    page(root, [{ op: "mergeok", id: "a.the-mine", merge: "D003#M1" }]);
    const again = checkProposals(root, [{ entity: "a", merges: [{ into: "a.mine-and-more", from: ["a.the-mine", "a.p4"], text: "x" }] }]);
    assert.match(again.merges[0].reasons.join(" "), /a\.the-mine has an edit or a note of hers/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a merge that adds words none of the pieces had, or joins pieces with nothing in common, passes with a warning for her to weigh", () => {
  const root = scratch();
  try {
    const { merges } = checkProposals(root, [{ entity: "a", merges: [{ into: "a.m", from: ["a.p1", "a.p3"], text: "The mine is old, and its foreman was called Harrow. Nobody has been down the main shaft since, and the gate is chained. Ancient haunted tunnels frighten everyone." }] }]);
    assert.equal(merges[0].ok, true, merges[0].reasons?.join("; "));
    assert.ok(merges[0].warnings.some((w) => /adds words none of the pieces had/.test(w)), merges[0].warnings.join(" | "));
    assert.ok(merges[0].warnings.some((w) => /shares almost nothing with the other pieces/.test(w)));
    const quiet = checkProposals(root, [MINE]);
    assert.deepEqual(quiet.merges[0].warnings.filter((w) => /adds words/.test(w)), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("what says where an item came from is never rewritten: a from key that looks like an id is a key, not a mention", () => {
  const world = FILES["canon/world/a.md"].replace("known: nobody · told: later\n\n## a.p4", "known: nobody · told: later\n\n## a.p4").replace("## a.h1", "## a.keyed\nA fact whose source key looks like an id.\nstatus: sketch · by: claude · source: D002 · from: b-char:a.p1, a.p2 · known: everyone · told: later\n\n## a.h1");
  const root = scratch({ extra: { "canon/world/a.md": world } });
  try {
    const out = merged(root);
    assert.equal(out.ok, true, out.error);
    assert.match(read(root, "canon/world/a.md"), /from: b-char:a\.p1, a\.p2 · known: everyone/, "its from key is exactly as it was");
    assert.equal(undoMerges(root, "D003#M1").ok, true);
    assert.equal(read(root, "canon/world/a.md"), world);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("undo puts each piece back where it was, even when the pieces were apart and the file has other sections between", () => {
  const apart = FILES["canon/world/a.md"]
    .replace("## a.p2", "## a.between\nSomething else.\nstatus: sketch · by: claude · source: D002 · known: everyone · told: later\n\n## a.p2");
  const root = scratch({ extra: { "canon/world/a.md": apart } });
  try {
    const out = merged(root);
    assert.equal(out.ok, true, out.error);
    assert.equal(undoMerges(root, "D003#M1").ok, true);
    assert.equal(read(root, "canon/world/a.md"), apart, "a.p1, a.between, a.p2, a.p3 in their own order again");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a merge the checks object to is set aside and reported, and the others are still made", () => {
  const beats = [
    "# Chapter 3 · The Third",
    "rank: Recruits · status: sketch · by: claude · source: D001",
    "learn: Something.",
    "The chapter's words.",
    "",
    "## Beats",
    "",
    "### beat--x",
    "A beat.",
    "status: sketch · by: claude · source: D001 · kind: reveal · pace: up · reveals: a.p1",
    "",
    "### beat--y",
    "Another beat.",
    "status: sketch · by: claude · source: D001 · kind: reveal · pace: up · reveals: a.p3",
    "",
  ].join("\n");
  const root = scratch({ extra: { "canon/plan/chapter-03.md": beats } });
  try {
    assert.deepEqual(freshErrors(root), []);
    const joinedBeats = { entity: "a", merges: [
      { into: "a.shaft", from: ["a.p1", "a.p3"], text: "The mine is old, and its foreman was called Harrow. Nobody has been down the main shaft since, and the gate is chained.", why: "two pieces, each revealed by its own beat" },
      { into: "a.her", from: ["a.h1", "a.h2"], text: "She said the mine would flood. She said the foreman never came out.", why: "hers, joined" },
    ] };
    const out = merged(root, [joinedBeats]);
    assert.equal(out.ok, true, out.error);
    assert.deepEqual(out.applied.map((a) => a.kept), ["a.her"]);
    assert.equal(out.rejected.length, 1);
    assert.equal(out.rejected[0].into, "a.shaft");
    assert.match(out.rejected[0].reasons.join(" "), /would add a check error: reveals a\.shaft/);
    assert.ok(fact(root, "a.p1") && fact(root, "a.p3"), "the set-aside merge changed nothing");
    assert.ok(fact(root, "a.her"));
    assert.deepEqual(freshErrors(root), []);
    assert.match(read(root, "canon/decisions/D003.md"), /^- merge `a\.her` ← a\.h1, a\.h2$/m);
    assert.ok(!/a\.shaft/.test(read(root, "canon/decisions/D003.md").split("## Merges")[1] || ""), "the record holds only what was made");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

// ---- a merge across files

const GATE = "## b.shaft-gate\nThe gate on the main shaft is chained shut and nobody has opened it.\nstatus: sketch · by: claude · source: D002 · from: z:9 · known: nobody · told: later\n\n";
const withGate = () => ({ "canon/world/b.md": FILES["canon/world/b.md"].replace("## b.rebuilt", `${GATE}## b.rebuilt`) });
const ACROSS = {
  entity: "a", crossFile: true,
  merges: [{ into: "a.the-gate", from: ["a.p3", "b.shaft-gate"], text: "Nobody has been down the main shaft since, and the gate on it is chained shut: nobody has opened it.", why: "the same gate, in two files" }],
};
const bothFiles = (root) => Object.fromEntries(["canon/world/a.md", "canon/world/b.md", "canon/threads/t.md", "canon/questions/q.md"].map((f) => [f, read(root, f)]));

test("pieces in other files are merged only when the proposal says so, into the entity the new id belongs to", () => {
  const root = scratch({ extra: withGate() });
  try {
    assert.deepEqual(freshErrors(root), []);
    const plain = checkProposals(root, [{ ...ACROSS, crossFile: false }]);
    assert.equal(plain.merges[0].ok, false);
    assert.match(plain.merges[0].reasons.join(" "), /b\.shaft-gate is not in a/);
    const wrongHome = checkProposals(root, [{ ...ACROSS, entity: "b" }]);
    assert.match(wrongHome.merges[0].reasons.join(" "), /"into" must start with "b\."/);
    const across = checkProposals(root, [ACROSS]);
    assert.equal(across.merges[0].ok, true, across.merges[0].reasons?.join("; "));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a merge across files: the item lives in its home file, the other piece leaves its file, every source and key comes along, and undo restores both files byte for byte", () => {
  const root = scratch({ extra: withGate() });
  try {
    const before = bothFiles(root);
    const out = merged(root, [ACROSS]);
    assert.equal(out.ok, true, out.error);
    const f = fact(root, "a.the-gate");
    assert.equal(f.entity, "a");
    assert.equal(fact(root, "a.p3"), undefined);
    assert.equal(fact(root, "b.shaft-gate"), undefined);
    assert.equal(f.origin, "z:9");
    assert.deepEqual(f.source, ["D002", "D003"]);
    assert.deepEqual(f.threads, ["t"]);
    assert.match(read(root, "canon/threads/t.md"), /^- a\.the-gate$/m, "the clock that named a.p3 names the merged item");
    assert.deepEqual(freshErrors(root), []);
    const rec = read(root, "canon/decisions/D003.md");
    assert.match(rec, /^```was a\.p3 \d+ \d+ world\/a\.md$/m);
    assert.match(rec, /^```was b\.shaft-gate \d+ \d+ world\/b\.md$/m);
    assert.equal(undoMerges(root, "D003#M1").ok, true);
    assert.deepEqual(bothFiles(root), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a merge across files whose pieces are all elsewhere puts the item at the end of its home file's pencil, and undoes", () => {
  const extra = { ...withGate(), "canon/world/c.md": "# C\nkind: thing\n\n## Pencil\n\n## c.gate\nThe gate has a rusted padlock.\nstatus: sketch · by: claude · source: D002 · known: nobody · told: later\n" };
  const root = scratch({ extra });
  try {
    const before = Object.fromEntries(["canon/world/a.md", "canon/world/b.md", "canon/world/c.md"].map((f) => [f, read(root, f)]));
    const out = merged(root, [{ entity: "a", crossFile: true, merges: [{ into: "a.padlock", from: ["b.shaft-gate", "c.gate"], text: "The gate on the main shaft is chained shut with a rusted padlock, and nobody has opened it.", why: "one gate" }] }]);
    assert.equal(out.ok, true, out.error);
    const tail = read(root, "canon/world/a.md").trimEnd().split("\n");
    assert.equal(tail[tail.length - 3], "## a.padlock", "last in a.md, where its own pencil ends");
    assert.equal(fact(root, "a.padlock").zone, "pencil");
    assert.equal(fact(root, "b.shaft-gate"), undefined);
    assert.equal(fact(root, "c.gate"), undefined);
    assert.deepEqual(freshErrors(root), []);
    assert.equal(undoMerges(root, "D003").ok, true);
    assert.deepEqual(Object.fromEntries(["canon/world/a.md", "canon/world/b.md", "canon/world/c.md"].map((f) => [f, read(root, f)])), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a piece whose date or payoff names another piece of the same merge cannot be merged: the item would point at itself", () => {
  const anchored = FILES["canon/world/a.md"].replace("## a.p4", "## a.anchored\nThe collapse is remembered by a plaque.\nstatus: sketch · by: claude · source: D002 · known: nobody · told: later · when: about 5 years after a.p1\n\n## a.p4");
  const root = scratch({ extra: { "canon/world/a.md": anchored } });
  try {
    const { merges } = checkProposals(root, [{ entity: "a", merges: [{ into: "a.plaque", from: ["a.p1", "a.anchored"], text: "The mine is old, and its foreman was called Harrow. The collapse is remembered by a plaque." }] }]);
    assert.equal(merges[0].ok, false);
    assert.match(merges[0].reasons.join(" "), /a\.anchored's when names a\.p1, which is in the same merge/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("two ideas in different files that are one idea merge into the file the new id belongs to, and an old id points to where it went", () => {
  const other = "# Ideas: j\n\n## idea--three\nThe gate opens by itself when the moon is up.\nstatus: sketch · by: claude · source: D001 · from: z:3 · state: live\n";
  const root = scratch({ extra: { "canon/ideas/j.md": other } });
  try {
    const before = { i: read(root, "canon/ideas/i.md"), j: read(root, "canon/ideas/j.md") };
    const out = merged(root, [{ entity: "i", kind: "idea", crossFile: true, merges: [{ into: "idea--the-gate", from: ["idea--one", "idea--three"], text: "The gate opens by itself, when the moon is up.", why: "the same idea, in two files" }] }]);
    assert.equal(out.ok, true, out.error);
    const model = loadModel(root);
    assert.deepEqual(model.ideas.map((i) => i.id).sort(), ["idea--the-gate", "idea--two"]);
    assert.equal(model.ideas.find((i) => i.id === "idea--the-gate").file, "ideas/i.md");
    assert.equal(model.ideaFiles.find((f) => f.topic === "j").ideas.length, 0);
    assert.deepEqual(freshErrors(root), []);
    assert.match(contextPack(model, "idea--three"), /^idea--three was merged into idea--the-gate \(D003#M1\)/);
    assert.equal(undoMerges(root, "D003").ok, true);
    assert.deepEqual({ i: read(root, "canon/ideas/i.md"), j: read(root, "canon/ideas/j.md") }, before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
