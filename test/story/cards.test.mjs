// Cards (tools/story/cards.mjs, cards-write.mjs; design/plot-timeline.md "Cards over claims", D083): a titled group of pencil
// facts about one thing. A card never changes a fact, so grouping can't lose anything: every test here is a way of proving that
// the facts, their order and their metadata come out exactly as they went in, and that a bad card is refused or noted.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { parseCards, checkCards, slugOf, MAX_TITLE_WORDS } from "../../tools/story/cards.mjs";
import { withCards, writeCards, splitCards } from "../../tools/story/cards-write.mjs";
import { loadModel, checkModel, parseWorld } from "../../tools/story/lib.mjs";
import { snapshot } from "../../tools/story/snapshot.mjs";
import { contextPack } from "../../tools/story/context.mjs";
import { entityPage, entityIndex } from "../../module/blank-inheritance/scripts/core/timeline-views.mjs";

const WORLD = [
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
  "The mine is old.",
  "status: sketch · by: claude · source: D002 · known: nobody · told: later",
  "",
  "## a.p2",
  "Its foreman was called Harrow.",
  "status: sketch · by: ingram · source: D001, D002 · known: few · told: later",
  "",
  "## a.p3",
  "The river runs east.",
  "status: sketch · by: claude · source: D002 · known: some · told: later",
  "",
  "## a.p4",
  "The gate is chained.",
  "status: sketch · by: claude · source: D002 · known: nobody · told: later",
  "",
].join("\n");

const FILES = {
  "canon/decisions/D001.md": "# D001 · 2026-10-01 · The start\n\n## Ingram\n\n> \"Yes.\"\n\n## Changes\n\n- add `a.ink`\n",
  "canon/decisions/D002.md": "# D002 · 2026-10-02 · An import\n\nkind: import\n\nasked: nothing.\n\n## Changes\n\n- add `a.p1`\n- add `a.p2`\n- add `a.p3`\n- add `a.p4`\n",
  "canon/world/a.md": WORLD,
};

function scratch({ crlf = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "story-cards-"));
  for (const [rel, text] of Object.entries(FILES)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), crlf ? text.replace(/\n/g, "\r\n") : text);
  }
  return root;
}
const read = (root, rel) => fs.readFileSync(path.join(root, rel), "utf8");
const errors = (root) => checkModel(loadModel(root)).filter((p) => p.level === "error" && !p.where.startsWith("data/"));
const SPEC = { a: [{ title: "The mine", members: ["a.p1", "a.p2", "a.p4"] }, { title: "The river", members: ["a.p3"] }] };

test("a card is a '### Title' and its '- fact-id' lines; its id is the file and the title's slug", () => {
  const r = parseCards(["", "### The mine", "- a.p1", "- `a.p2`", "", "### Harrow's debt", "- a.p3"], "a");
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.cards, [{ id: "a/the-mine", title: "The mine", members: ["a.p1", "a.p2"] }, { id: "a/harrows-debt", title: "Harrow's debt", members: ["a.p3"] }]);
  assert.equal(slugOf("Harrow's  debt!"), "harrows-debt");
});

test("a member before any title, and a stray line, are format problems", () => {
  const r = parseCards(["- a.p1", "### T", "free words"], "a");
  assert.equal(r.problems.length, 2);
});

test("a card is checked: unknown fact, a fact in two cards, a title that is a claim, a member that left the pencil", () => {
  const facts = new Map([["a.p1", { status: "sketch" }], ["a.p2", { status: "sketch" }], ["a.ink", { status: "decided" }]]);
  const out = checkCards("a", [
    { id: "a/one", title: "One", members: ["a.p1", "a.nope"] },
    { id: "a/two", title: "Two", members: ["a.p1", "a.ink"] },
    { id: "a/long", title: "This title has far too many words to be a label for anything at all", members: ["a.p2"] },
    { id: "a/dot", title: "It is a claim.", members: [] },
  ], facts);
  const text = out.map((p) => `${p.level}: ${p.message}`).join("\n");
  assert.match(text, /error: card "One" names a\.nope/);
  assert.match(text, /error: a\.p1 is in two cards/);
  assert.match(text, /error: card "This title[^"]*": a title is a label/);
  assert.match(text, /error: card "It is a claim\.": a title is a label/);
  assert.match(text, /note: card "Two": a\.ink has left the pencil/);
  assert.match(text, /note: card "It is a claim\." holds no pencil/);
  assert.equal(MAX_TITLE_WORDS, 9);
});

test("a member a merge absorbed is followed to the item that holds it", () => {
  const facts = new Map([["a.whole", { status: "sketch" }]]);
  const out = checkCards("a", [{ id: "a/x", title: "X", members: ["a.part"] }], facts, (id) => (id === "a.part" ? "a.whole" : id));
  assert.deepEqual(out, []);
});

test("writing cards touches only the Cards section at the end: every fact above comes out byte for byte", () => {
  const root = scratch();
  try {
    const before = read(root, "canon/world/a.md");
    writeCards(root, SPEC);
    const after = read(root, "canon/world/a.md");
    assert.ok(after.startsWith(before.replace(/\n+$/, "")), "the file up to the new section is unchanged");
    assert.match(after, /\n## Cards\n\n### The mine\n- a\.p1\n- a\.p2\n- a\.p4\n\n### The river\n- a\.p3\n$/);
    assert.deepEqual(splitCards(after.split("\n")).rest.join("\n").replace(/\n+$/, ""), before.replace(/\n+$/, ""));
    assert.deepEqual(errors(root), []);
    const m = loadModel(root);
    assert.deepEqual(m.world[0].facts.map((f) => f.id), ["a.ink", "a.p1", "a.p2", "a.p3", "a.p4"], "same facts, same order");
    assert.equal(m.world[0].cards.length, 2);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("writing the same cards again changes nothing, and an empty list removes the section", () => {
  const root = scratch();
  try {
    writeCards(root, SPEC);
    const once = read(root, "canon/world/a.md");
    assert.equal(writeCards(root, SPEC)[0].changed, false);
    assert.equal(read(root, "canon/world/a.md"), once);
    writeCards(root, { a: [] });
    assert.equal(read(root, "canon/world/a.md").replace(/\n+$/, ""), WORLD.replace(/\n+$/, ""), "deleting the cards restores the file");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a CRLF file stays CRLF", () => {
  const root = scratch({ crlf: true });
  try {
    writeCards(root, SPEC);
    const after = read(root, "canon/world/a.md");
    assert.ok(!/[^\r]\n/.test(after), "no bare LF was introduced");
    assert.match(after, /## Cards\r\n/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a card can't hold ink, a missing fact, a repeated fact or a claim for a title, and nothing is written when one is wrong", () => {
  const root = scratch();
  try {
    const before = read(root, "canon/world/a.md");
    for (const bad of [
      [{ title: "T", members: ["a.ink"] }],
      [{ title: "T", members: ["a.zzz"] }],
      [{ title: "T", members: ["a.p1"] }, { title: "U", members: ["a.p1"] }],
      [{ title: "A sentence that says something.", members: ["a.p1"] }],
    ]) assert.throws(() => writeCards(root, { a: bad }));
    assert.equal(read(root, "canon/world/a.md"), before);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("withCards refuses a change that would touch anything outside the Cards section", () => {
  const facts = new Map([["a.p1", { status: "sketch" }]]);
  const text = `${WORLD}\n## Cards\n\n### Old\n- a.p1\n`;
  const out = withCards(text, "a", [{ title: "New", members: ["a.p1"] }], facts);
  assert.match(out, /### New/);
  assert.doesNotMatch(out, /### Old/);
});

test("a facts' meta, author and timing are exactly what they were: the model of a grouped file equals the model of the plain one", () => {
  const root = scratch();
  try {
    const plain = loadModel(root).world[0].facts.map((f) => ({ ...f, line: 0 }));
    writeCards(root, SPEC);
    const grouped = loadModel(root).world[0].facts.map((f) => ({ ...f, line: 0 }));
    assert.deepEqual(grouped, plain);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("the snapshot lists the cards and marks each fact's card; the page's entity view groups pencil by card", () => {
  const root = scratch();
  try {
    writeCards(root, SPEC);
    const snap = snapshot(loadModel(root), { root });
    assert.deepEqual(snap.cards.map((c) => [c.id, c.members]), [["a/the-mine", ["a.p1", "a.p2", "a.p4"]], ["a/the-river", ["a.p3"]]]);
    assert.equal(snap.facts.find((f) => f.id === "a.p2").card, "a/the-mine");
    assert.equal(snap.facts.find((f) => f.id === "a.ink").card, null);
    const page = entityPage(snap, "a");
    assert.deepEqual(page.cards.map((c) => [c.title, c.facts.map((f) => f.id)]), [["The mine", ["a.p1", "a.p2", "a.p4"]], ["The river", ["a.p3"]]]);
    assert.deepEqual(page.loose, []);
    assert.equal(entityIndex(snap)[0].counts.cards, 2, "what a person holds is two cards, not four claims");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("a fact inked out of a card drops out of it without an error, and shows as a note to tidy", () => {
  const root = scratch();
  try {
    writeCards(root, SPEC);
    const file = path.join(root, "canon/world/a.md");
    fs.writeFileSync(file, read(root, "canon/world/a.md").replace("The gate is chained.\nstatus: sketch · by: claude · source: D002 · known: nobody · told: later", "The gate is chained.\nstatus: decided · source: D001 · known: nobody · told: later"));
    const problems = checkModel(loadModel(root)).filter((p) => p.where.includes("Cards"));
    assert.ok(problems.every((p) => p.level !== "error"), JSON.stringify(problems));
    assert.ok(problems.some((p) => /has left the pencil/.test(p.message)));
    const page = entityPage(snapshot(loadModel(root), { root }), "a");
    assert.deepEqual(page.cards[0].facts.map((f) => f.id), ["a.p1", "a.p2"], "the card still lists what is pencil");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("story context shows the pencil by card, then the facts in none", () => {
  const root = scratch();
  try {
    writeCards(root, { a: [{ title: "The mine", members: ["a.p1", "a.p2"] }] });
    const pack = contextPack(loadModel(root), "a");
    assert.match(pack, /### The mine \(2\)/);
    assert.match(pack, /### Not in a card \(2\)/);
    assert.ok(pack.indexOf("### The mine") < pack.indexOf("a.p3"));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test("parseWorld keeps a Cards section out of a file's notes", () => {
  const w = parseWorld(`${WORLD}\n## Cards\n\n### Mine\n- a.p1\n\n## Aside\nA note.\n`, "a");
  assert.deepEqual(Object.keys(w.notes), ["Aside"]);
  assert.equal(w.cards.length, 1);
});

test("REAL DATA: every fact in canon is still there, none has a card that doesn't exist, and the check has no card errors", () => {
  const model = loadModel();
  const errs = checkModel(model).filter((p) => p.level === "error" && /Cards/.test(p.where));
  assert.deepEqual(errs.map((p) => `${p.where}: ${p.message}`), []);
  for (const e of model.world) {
    const ids = new Set(e.facts.map((f) => f.id));
    const seen = new Set();
    for (const c of e.cards || []) for (const m of c.members) { assert.ok(!seen.has(m), `${m} in two cards`); seen.add(m); }
    assert.ok(ids.size === e.facts.length, `${e.id}: fact ids are unique`);
  }
});

test("a merge of carded facts keeps the card whole, and undoing it puts the pieces back in the card", async () => {
  const { applyProposals, undoMerges } = await import("../../tools/story/merge.mjs");
  const root = scratch();
  try {
    writeCards(root, SPEC);
    const out = applyProposals(root, [{ entity: "a", kind: "fact", merges: [{ into: "a.mine-gate", from: ["a.p1", "a.p4"], text: "The mine is old. The gate is chained.", why: "the mine and its gate" }] }], { now: new Date(2026, 9, 12, 12, 0), asked: 'Ingram: "begin".' });
    assert.equal(out.ok, true, out.error);
    assert.deepEqual(errors(root), []);
    const m = loadModel(root);
    const snap = snapshot(m, { root });
    assert.deepEqual(snap.cards.find((c) => c.id === "a/the-mine").members, ["a.mine-gate", "a.p2"], "the card holds the merged item once, in place of its two pieces");
    const un = undoMerges(root, out.record);
    assert.equal(un.ok, true, un.reason || un.error);
    assert.deepEqual(errors(root), []);
    const back = snapshot(loadModel(root), { root });
    assert.deepEqual(back.cards.find((c) => c.id === "a/the-mine").members.sort(), ["a.p1", "a.p2", "a.p4"], "after the undo the card names the pieces again");
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
