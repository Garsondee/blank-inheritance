// Saving from the plot timeline (tools/timeline/ops.mjs, tools/story/daybook.mjs; design/plot-timeline.md §5, D070).
// Every test runs on a scratch canon of its own: a stale `before` is a clash with nothing written, a save is all or
// nothing, typing never changes a status, only "Ink it" inks (decide for her words, accept for Claude's), a save that
// would break canon's checks is rolled back whole, each day has one record in her words, and nothing older comes back
// over what she set.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

import { applyOps, readSaves, localDate } from "../../tools/timeline/ops.mjs";
import { claimDayRecord, parseDayEdits, notesOf, parkedOf, findTimelineReversions, appendEdits, newDayRecord, isDayRecord } from "../../tools/story/daybook.mjs";
import { loadModel, checkModel, itemIndex } from "../../tools/story/lib.mjs";
import { acquireLock } from "../../tools/scene-edits/store.mjs";
import { createTimelineServer } from "../../tools/timeline/server.mjs";
import { undoOf, answerOps } from "../../module/blank-inheritance/scripts/core/timeline-edits.mjs";

const NOW = new Date(2026, 9, 9, 15, 30);
const TODAY = localDate(NOW);

const FILES = {
  "canon/decisions/D001.md": "# D001 · 2026-10-01 · The start\n\n## Ingram\n\n> \"Yes.\"\n\n## Changes\n\n- add `a.ink`\n",
  "canon/world/a.md": [
    "# A",
    "kind: thing",
    "",
    "## a.ink",
    "An ink fact.",
    "status: decided · source: D001 · known: everyone · told: later",
    "",
    "## Notes",
    "How to play it.",
    "",
    "## Pencil",
    "",
    "## a.sketch",
    "A pencil fact by Claude.",
    "status: sketch · by: claude · source: D001 · known: nobody · told: later · when: about 40 years ago",
    "",
    "## a.hers",
    "A pencil fact in her words.",
    "status: sketch · by: ingram · source: D001 · known: nobody · told: later",
    "",
    "## a.open",
    "What the statue is made of is not decided: stone or bronze.",
    "status: open · source: D001 · known: nobody · told: later · when: about 10 years ago | about 20 years ago · candidates: stone | bronze · decide-by: before Chapter 3",
    "",
  ].join("\n"),
  "canon/plan/chapter-02.md": [
    "# Chapter 2 · The Second",
    "rank: Recruits · status: sketch · by: claude · source: D001",
    "learn: Something small.",
    "The chapter's own words.",
    "",
    "## Beats",
    "",
    "### beat--one",
    "A beat.",
    "status: sketch · by: claude · source: D001 · kind: event · pace: up",
    "",
  ].join("\n"),
  "canon/threads/t.md": [
    "# The Thread",
    "kind: thread",
    "lane: people · order: 1 · entities: a",
    "status: sketch · by: claude · source: D001",
    "The thread's words.",
    "",
    "## By Book",
    "- I: Patient.",
    "",
  ].join("\n"),
  "canon/questions/q.md": "# What is it?\nanswer: a.ink\nstatus: sketch · by: claude · source: D001\n",
  "canon/ideas/i.md": "# Ideas: i\n\n## idea--x\nAn idea.\nstatus: sketch · by: claude · source: D001 · state: live\n",
};

function scratch({ crlf = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "timeline-ops-"));
  for (const [rel, text] of Object.entries(FILES)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), crlf ? text.replace(/\n/g, "\r\n") : text);
  }
  return root;
}
const read = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8");
const decisionsIn = (root) => fs.readdirSync(path.join(root, "canon/decisions")).sort();
const item = (root, id) => itemIndex(loadModel(root)).get(id).item;
const save = (root, ops) => applyOps(root, ops, { now: NOW });
const freshErrors = (root) => checkModel(loadModel(root)).filter((p) => p.level === "error" && !p.where.startsWith("data/"));

test("the scratch canon checks clean, so every error a test sees is one it made", () => {
  const root = scratch();
  try { assert.deepEqual(freshErrors(root), []); } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a field she sets is written, quoted in today's record, and cites it; the status stays", () => {
  const root = scratch();
  try {
    const out = save(root, [{ op: "field", id: "a.sketch", field: "when", before: "about 40 years ago", value: "about 30 years ago" }]);
    assert.equal(out.ok, true, out.error);
    assert.equal(out.record, "D002");
    const f = item(root, "a.sketch");
    assert.equal(f.when, "about 30 years ago");
    assert.equal(f.status, "sketch");
    assert.equal(f.by, "claude");
    assert.deepEqual(f.source, ["D001", "D002"]);
    const rec = read(root, "canon/decisions/D002.md");
    assert.ok(isDayRecord(rec));
    assert.match(rec, new RegExp(`^# D002 · ${TODAY} · Ingram's edits on the timeline\\nkind: timeline\\n`));
    assert.match(rec, /^> `a\.sketch` · when: "about 40 years ago" → "about 30 years ago"$/m);
    assert.match(rec, /^- change `a\.sketch` · when$/m);
    assert.deepEqual(parseDayEdits(rec), [{ op: "field", id: "a.sketch", field: "when", before: "about 40 years ago", value: "about 30 years ago" }]);
    assert.deepEqual(freshErrors(root), []);
    assert.equal(readSaves(root).length, 1);
    assert.deepEqual(readSaves(root)[0].files.sort(), ["canon/decisions/D002.md", "canon/world/a.md"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a stale `before` is a clash, and nothing at all is written: not the other changes, not a record", () => {
  const root = scratch();
  try {
    const world = read(root, "canon/world/a.md");
    const out = save(root, [
      { op: "text", id: "a.hers", before: "A pencil fact in her words.", value: "Her new words." },
      { op: "field", id: "a.sketch", field: "when", before: "about 44 years ago", value: "about 30 years ago" },
    ]);
    assert.equal(out.ok, false);
    assert.deepEqual(out.results.map((r) => r.result), ["merged", "clash"]);
    assert.equal(out.results[1].current, "about 40 years ago", "the clash says what the file holds now");
    assert.equal(read(root, "canon/world/a.md"), world);
    assert.deepEqual(decisionsIn(root), ["D001.md"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a change the file already holds is 'already', and a save of nothing but those makes no record", () => {
  const root = scratch();
  try {
    const out = save(root, [{ op: "field", id: "a.sketch", field: "when", before: "anything at all", value: "about 40 years ago" }]);
    assert.equal(out.ok, true);
    assert.equal(out.record, null);
    assert.deepEqual(out.results.map((r) => r.result), ["already"]);
    assert.deepEqual(decisionsIn(root), ["D001.md"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("typing never changes a status: status, by, source and from are not fields the page sets", () => {
  const root = scratch();
  try {
    for (const field of ["status", "by", "source", "from"]) {
      const out = save(root, [{ op: "field", id: "a.sketch", field, before: "", value: "decided" }]);
      assert.equal(out.ok, false, field);
      assert.equal(out.results[0].result, "refused");
    }
    const out = save(root, [{ op: "text", id: "a.sketch", before: "A pencil fact by Claude.", value: "status: decided" }]);
    assert.equal(out.ok, false, "words that would read as a meta line are refused");
    const typed = save(root, [{ op: "text", id: "a.sketch", before: "A pencil fact by Claude.", value: "New words, still pencil." }]);
    assert.equal(typed.ok, true, typed.error);
    assert.equal(item(root, "a.sketch").status, "sketch");
    assert.equal(item(root, "a.sketch").text, "New words, still pencil.");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("Ink it: her pencil is decided, Claude's is accepted, and her own words on it in the same save make it hers", () => {
  const root = scratch();
  try {
    let out = save(root, [{ op: "ink", id: "a.hers", before: "sketch" }, { op: "ink", id: "a.sketch", before: "sketch" }]);
    assert.equal(out.ok, true, out.error);
    const hers = item(root, "a.hers");
    const claudes = item(root, "a.sketch");
    assert.equal(hers.status, "decided");
    assert.equal(claudes.status, "accepted");
    assert.equal(hers.by, null);
    assert.equal(hers.zone, "ink", "an inked fact moves above the Pencil line");
    const rec = read(root, `canon/decisions/${out.record}.md`);
    assert.match(rec, /^> `a\.hers` · inked$/m);
    assert.match(rec, /^- decide `a\.hers`$/m);
    assert.match(rec, /^- accept `a\.sketch`$/m);
    assert.deepEqual(freshErrors(root), []);
    // Edit, then ink: Claude's beat with her words on it becomes hers.
    out = save(root, [{ op: "text", id: "beat--one", before: "A beat.", value: "Her beat." }, { op: "ink", id: "beat--one", before: "sketch" }]);
    assert.equal(out.ok, true, out.error);
    assert.equal(item(root, "beat--one").status, "decided");
    assert.equal(out.record, "D002", "the same day keeps one record");
    assert.deepEqual(freshErrors(root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a save that would break canon's checks is rolled back whole, record and all", () => {
  const root = scratch();
  try {
    const before = Object.fromEntries(Object.keys(FILES).map((rel) => [rel, read(root, rel)]));
    const out = save(root, [
      { op: "text", id: "a.hers", before: "A pencil fact in her words.", value: "Fine words." },
      { op: "field", id: "a.sketch", field: "payoff", before: "", value: "a.nothing" },
    ]);
    assert.equal(out.ok, false);
    assert.ok(out.problems.some((p) => /payoff a\.nothing is not a canon fact/.test(p.message)), JSON.stringify(out.problems));
    for (const [rel, text] of Object.entries(before)) assert.equal(read(root, rel), text, rel);
    assert.deepEqual(decisionsIn(root), ["D001.md"]);
    assert.equal(readSaves(root).length, 0);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("errors that were already there never block her", () => {
  const root = scratch();
  try {
    fs.writeFileSync(path.join(root, "canon/questions/broken.md"), "# Broken?\nanswer: a.nowhere\nstatus: sketch · by: claude · source: D001\n");
    assert.ok(freshErrors(root).some((p) => /a\.nowhere/.test(p.message)));
    const out = save(root, [{ op: "text", id: "a.hers", before: "A pencil fact in her words.", value: "Still saved." }]);
    assert.equal(out.ok, true, out.error);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("two saves never claim the same D number, and a day keeps one record", () => {
  const root = scratch();
  try {
    // Another conversation files a decision first: today's record takes the next number.
    fs.writeFileSync(path.join(root, "canon/decisions/D002.md"), "# D002 · 2026-10-09 · Something she said\n\n## Ingram\n\n> \"Hm.\"\n");
    const a = claimDayRecord(root, TODAY);
    assert.deepEqual([a.id, a.created], ["D003", true]);
    const b = claimDayRecord(root, TODAY);
    assert.deepEqual([b.id, b.created], ["D003", false], "the same day reuses its record");
    const c = claimDayRecord(root, "2026-10-10");
    assert.equal(c.id, "D004");
    // One save at a time: a held lock makes a second save wait, not write.
    const release = acquireLock(path.join(root, "harvest", "timeline"));
    try {
      const out = save(root, [{ op: "note", id: "a.ink", text: "A note." }]);
      assert.equal(out.ok, false);
      assert.equal(out.busy, true);
    } finally { release(); }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("notes for Claude are quoted with a number of their own, and listed open", () => {
  const root = scratch();
  try {
    const out = save(root, [{ op: "note", id: "a.ink", text: "Earlier than this.\nCheck D001." }, { op: "note", id: "timeline", text: "A general note." }]);
    assert.equal(out.ok, true, out.error);
    assert.deepEqual(out.results.map((r) => r.note), ["N1", "N2"]);
    const notes = notesOf(loadModel(root), { notes: { N2: { state: "done", reply: "Done.", at: "x" } } });
    assert.deepEqual(notes.map((n) => [n.id, n.on, n.state]), [["N1", "a.ink", "open"], ["N2", "timeline", "done"]]);
    assert.equal(notes[0].text, "Earlier than this.\nCheck D001.");
    assert.equal(save(root, [{ op: "note", id: "nowhere.at-all", text: "x" }]).ok, false, "a note goes on something that exists");
    assert.deepEqual(freshErrors(root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("park leaves pencil where it is and remembers she has seen it; only pencil parks", () => {
  const root = scratch();
  try {
    const out = save(root, [{ op: "park", id: "a.sketch" }, { op: "park", id: "idea--x" }]);
    assert.equal(out.ok, true, out.error);
    assert.deepEqual(parkedOf(loadModel(root)), ["a.sketch"]);
    assert.equal(item(root, "idea--x").state, "parked", "an idea parks by its state");
    assert.equal(item(root, "a.sketch").status, "sketch");
    assert.equal(save(root, [{ op: "park", id: "a.ink" }]).ok, false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("cut strikes an item and retires its wording; wording still used elsewhere stops the cut", () => {
  const root = scratch();
  try {
    let out = save(root, [{ op: "cut", id: "a.sketch", before: "sketch", retire: ["by Claude"] }]);
    assert.equal(out.ok, true, out.error);
    const f = item(root, "a.sketch");
    assert.equal(f.status, "cut");
    assert.equal(f.by, null);
    assert.deepEqual(f.retire, ["by Claude"]);
    assert.match(read(root, `canon/decisions/${out.record}.md`), /^> `a\.sketch` · cut · retire: "by Claude"$/m);
    const world = read(root, "canon/world/a.md");
    out = save(root, [{ op: "cut", id: "a.hers", before: "sketch", retire: ["An ink fact"] }]);
    assert.equal(out.ok, false, "a.ink still says it");
    assert.equal(read(root, "canon/world/a.md"), world);
    out = save(root, [{ op: "cut", id: "idea--x", before: "live", retire: "An idea" }]);
    assert.equal(out.ok, true, out.error);
    assert.equal(item(root, "idea--x").state, "rejected", "an idea is rejected, not cut");
    assert.equal(item(root, "idea--x").status, "sketch");
    assert.equal(save(root, [{ op: "ink", id: "idea--x", before: "sketch" }]).ok, false, "an idea is never inked");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("chapters, threads and questions keep their fields in their file's head, each on its own line", () => {
  const root = scratch({ crlf: true });
  try {
    const out = save(root, [
      { op: "field", id: "chapter-02", field: "learn", before: "Something small.", value: "Something bigger." },
      { op: "field", id: "t", field: "impulse", before: "", value: "To be seen." },
      { op: "text", id: "t", before: "The thread's words.", value: "The thread's new words." },
      { op: "ink", id: "q", before: "sketch" },
    ]);
    assert.equal(out.ok, true, out.error);
    const ch = read(root, "canon/plan/chapter-02.md");
    assert.ok(!ch.replace(/\r\n/g, "").includes("\n"), "CRLF kept");
    assert.deepEqual(ch.split("\r\n").slice(0, 4), [
      "# Chapter 2 · The Second",
      "rank: Recruits · status: sketch · by: claude · source: D001, D002",
      "learn: Something bigger.",
      "The chapter's own words.",
    ]);
    const t = read(root, "canon/threads/t.md").split("\r\n");
    assert.deepEqual(t.slice(0, 5), ["# The Thread", "kind: thread", "lane: people · order: 1 · entities: a", "status: sketch · by: claude · source: D001, D002 · impulse: To be seen.", "The thread's new words."]);
    assert.ok(t.includes("## By Book") && t.includes("- I: Patient."));
    assert.equal(item(root, "q").status, "accepted");
    assert.deepEqual(freshErrors(root), []);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("nothing older comes back over what she set: the guard fails the check, something new does not", () => {
  const root = scratch();
  try {
    assert.equal(save(root, [{ op: "field", id: "a.sketch", field: "when", before: "about 40 years ago", value: "about 30 years ago" }]).ok, true);
    const file = path.join(root, "canon/world/a.md");
    const set = read(root, "canon/world/a.md");
    fs.writeFileSync(file, set.replace("when: about 30 years ago", "when: about 40 years ago"));
    let m = loadModel(root);
    assert.deepEqual(findTimelineReversions(m, itemIndex(m)).map((r) => [r.id, r.field, r.expected]), [["a.sketch", "when", "about 30 years ago"]]);
    assert.ok(checkModel(m).some((p) => p.level === "error" && /went back to older wording/.test(p.message)));
    fs.writeFileSync(file, set.replace("when: about 30 years ago", "when: about 35 years ago"));
    m = loadModel(root);
    assert.deepEqual(findTimelineReversions(m, itemIndex(m)), [], "a later, deliberate change is not a reversion");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a day record written by hand, with a line the timeline can't read back, fails the check", () => {
  const root = scratch();
  try {
    const rec = appendEdits(newDayRecord("D002", TODAY), [{ op: "park", id: "a.sketch" }]).replace("> `a.sketch` · parked", "> `a.sketch` · parked\n> I changed my mind about this.");
    fs.writeFileSync(path.join(root, "canon/decisions/D002.md"), rec);
    assert.ok(checkModel(loadModel(root)).some((p) => p.level === "error" && /can't read back/.test(p.message)));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("undo puts back what a save changed: words, fields, ink, a cut and its retired wording", () => {
  const root = scratch();
  try {
    const keep = (id) => { const i = item(root, id); return { text: i.text, status: i.status, by: i.by, when: i.when, retire: i.retire, zone: i.zone, state: i.state }; };
    const ids = ["a.sketch", "a.hers", "beat--one", "idea--x", "chapter-02"];
    const before = Object.fromEntries(ids.map((id) => [id, keep(id)]));
    const ops = [
      { op: "text", id: "a.sketch", before: "A pencil fact by Claude.", value: "Her words now." },
      { op: "field", id: "a.sketch", field: "when", before: "about 40 years ago", value: "about 30 years ago" },
      { op: "ink", id: "a.sketch", before: "sketch" },
      { op: "cut", id: "a.hers", before: "sketch", retire: ["in her words"] },
      { op: "ink", id: "beat--one", before: "sketch" },
      { op: "cut", id: "idea--x", before: "live", retire: ["An idea"] },
      { op: "ink", id: "chapter-02", before: "sketch" },
    ];
    const out = save(root, ops);
    assert.equal(out.ok, true, out.error);
    assert.equal(item(root, "a.sketch").status, "decided", "her words on it make it hers");
    const u = undoOf(ops, out.results);
    assert.equal(u.complete, true);
    const back = save(root, u.ops);
    assert.equal(back.ok, true, back.error);
    for (const id of ids) assert.deepEqual(keep(id), before[id], id);
    assert.deepEqual(freshErrors(root), []);
    // The record keeps both: what she did and what she took back.
    const edits = parseDayEdits(read(root, `canon/decisions/${out.record}.md`));
    assert.deepEqual(edits.filter((e) => e.id === "a.sketch").map((e) => e.op), ["text", "field", "ink", "pencil", "field", "text"]);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("answering an open question: her words replace it, the candidates and deadline go, it is decided, and one undo takes it all back", () => {
  const root = scratch();
  try {
    const keep = (id) => { const i = item(root, id); return { text: i.text, status: i.status, by: i.by, when: i.when, candidates: i.candidates, decideBy: i.decideBy, zone: i.zone, source: i.source }; };
    const before = keep("a.open");
    assert.equal(before.status, "open");
    assert.equal(before.zone, "pencil");
    const entry = itemIndex(loadModel(root)).get("a.open");
    // Inking an open question with no answer is refused: it is settled by an answer.
    const bare = save(root, [{ op: "ink", id: "a.open", before: "open" }]);
    assert.equal(bare.ok, false);
    assert.match(bare.results[0].message, /settled by an answer/);
    assert.deepEqual(keep("a.open"), before);

    const ops = answerOps(entry, { text: "The statue is bronze.", when: "about 20 years ago" });
    assert.deepEqual(ops.map((o) => `${o.op}${o.field ? `:${o.field}` : ""}`), ["text", "field:candidates", "field:decide-by", "field:when", "ink"]);
    const out = save(root, ops);
    assert.equal(out.ok, true, out.error);
    const after = keep("a.open");
    assert.equal(after.status, "decided");
    assert.equal(after.text, "The statue is bronze.");
    assert.equal(after.when, "about 20 years ago");
    assert.deepEqual([after.candidates, after.decideBy], [[], null]);
    assert.equal(after.zone, "ink", "her answer is ink, so it moves above the Pencil line");
    assert.ok(after.source.includes(out.record));
    const rec = read(root, `canon/decisions/${out.record}.md`);
    assert.match(rec, /^- decide `a\.open`$/m);
    assert.match(rec, /^> `a\.open` · text: "What the statue is made of is not decided: stone or bronze\." → "The statue is bronze\."$/m);
    assert.deepEqual(freshErrors(root), []);

    const u = undoOf(ops, out.results);
    assert.equal(u.complete, true);
    assert.deepEqual(u.ops.map((o) => o.op), ["reopen", "field", "field", "field", "text"]);
    const back = save(root, u.ops);
    assert.equal(back.ok, true, back.error);
    const restored = keep("a.open");
    assert.deepEqual({ ...restored, source: undefined }, { ...before, source: undefined });
    assert.deepEqual(freshErrors(root), []);
    assert.match(read(root, `canon/decisions/${out.record}.md`), /^- open `a\.open`$/m);
    assert.ok(parseDayEdits(read(root, `canon/decisions/${out.record}.md`)).some((e) => e.op === "reopen" && e.id === "a.open"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

function post(port, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({ host: "127.0.0.1", port, path: "/api/ops", method: "POST", headers: { host: `localhost:${port}`, "content-type": "application/json", "content-length": Buffer.byteLength(data), ...headers } }, (res) => {
      let text = "";
      res.on("data", (d) => { text += d; });
      res.on("end", () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }));
    });
    req.on("error", reject);
    req.end(data);
  });
}

test("the server saves only for its own page: its origin and the token in the page it served", async () => {
  const root = scratch();
  const t = createTimelineServer({ root, token: "secret-token" });
  const port = await t.listen(0);
  try {
    const ops = [{ op: "note", id: "a.ink", text: "Hello." }];
    const origin = `http://localhost:${port}`;
    assert.equal((await post(port, { ops }, { origin, "x-timeline-token": "wrong" })).status, 403);
    assert.equal((await post(port, { ops }, { origin: "http://evil.example", "x-timeline-token": "secret-token" })).status, 403);
    assert.equal((await post(port, { ops }, { "x-timeline-token": "secret-token" })).status, 403, "no origin, no save");
    assert.deepEqual(decisionsIn(root), ["D001.md"]);
    const ok = await post(port, { ops }, { origin, "x-timeline-token": "secret-token" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.ok, true, ok.body.error);
    assert.equal(decisionsIn(root).length, 2);
  } finally {
    await t.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
