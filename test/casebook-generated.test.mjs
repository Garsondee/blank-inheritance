// The Casebook is generated from canon (D080): tools/casebook/derive.mjs derives every section from the canon model,
// render.mjs draws it as HTML and Markdown, build.mjs puts the page together. These tests hold what that promises:
//   - every canon fact has exactly one record on the page, and open facts are all, and only, under "Still hers";
//   - ink, awaiting-read, both kinds of pencil, open, cut and GM-only are each labelled, and pencil is drawn lighter;
//   - the output is the same every time, every link on the page goes somewhere, and nothing hand-written is read.
//
// The fixture tests build a small canon of their own in a scratch directory (invented words, in canon's real formats);
// the REAL DATA tests read the repo's canon once and check the same promises against it, without naming a single fact:
// every id they use comes out of the model.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadModel } from "../tools/story/lib.mjs";
import { buildCasebook } from "../tools/casebook/build.mjs";
import { deriveCasebook, tagOf, isSecret } from "../tools/casebook/derive.mjs";
import { makeInline, tagLabel, TAGS } from "../tools/casebook/render.mjs";
import { GENERATED_CSS } from "../tools/casebook/style.mjs";
import { scenePageHtml } from "../tools/casebook/preview.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// ------------------------------------------------------------------ a small canon of our own

const FILES = {
  "canon/decisions/D001.md": `# D001 · 2030-01-01 · The first call

asked: Which way does the river run?

## Ingram

> "The river runs east."
>
> "And the bridge is old."

## Changes

- decide \`harbour-master.river\`
`,
  "canon/decisions/D002.md": `# D002 · 2030-01-02 · An import

kind: import

asked: nothing. Claude's record.

## Changes

- add \`harbour-master.vault\`

## Conflicts

- **Bridge age**: one source says old, another says new.
`,
  "canon/decisions/D003.md": `# D003 · 2030-01-03 · Ingram's edits on the timeline

kind: timeline

## Ingram

> \`harbour-master.river\` · text: "The river runs east."

## Changes

- change \`harbour-master.river\` · text
`,
  "canon/decisions/D004.md": `# D004 · 2029-12-01 · An old ledger entry

source: split word for word from LEDGER #4

The old log's entry, kept in its own layout, with no quoted lines at all.
`,
  "canon/decisions/D005.md": `# D005 · 2030-01-05 · A record of a kind nobody has met

kind: whisper

asked: nothing.

## Changes
`,
  "canon/decisions/D006.md": `# D006 · 2030-01-06 · A merge

kind: merge

asked: nothing. Claude's record.

## Changes

## Conflicts

- **Quay width**: one pencil fact says wide, another says narrow.
`,
  "canon/sources/S001.md": `# S001 · 2030-01-01 · A dossier she gave

Where it is, and which parts stand.
`,
  "canon/world/harbour-master.md": `# The harbour master
kind: person

## harbour-master.river
The river runs east.
status: decided · source: D001 · known: everyone · told: start

## harbour-master.bridge
The bridge over it is old.
status: accepted · source: D001 · known: some · told: in:scene-one

## harbour-master.lantern
A lantern hangs at the bridge.
status: provisional · source: scene-one · known: everyone · told: in:scene-one

## harbour-master.toll
The toll is a copper coin.
status: proposal · source: scene-one · known: some · told: in:scene-one

## Pencil

## harbour-master.rumour
Some say the river once ran west.
status: sketch · by: ingram · source: D001 · held-by: the sailors · true: no · truth: harbour-master.river · known: some · told: later

## harbour-master.vault
A vault lies under the quay.
status: sketch · by: claude · source: D002 · known: nobody · told: later · when: about 30 years ago

## harbour-master.map
A map of the vault is pinned in the office.
status: sketch · by: claude · source: D002 · known: few · told: in:chapter-02

## harbour-master.keeper
Who keeps the vault is not decided.
status: open · source: D002 · known: nobody · told: later · candidates: the master | his clerk · decide-by: before Chapter 2 is written

## harbour-master.old-name
The vault had another name.
status: cut · source: D001 · known: nobody · told: later · retire: Old Vault

## Notes
How to play: slowly.
from: cb:x.y

> A quoted line in a note.
`,
  "canon/world/quay.md": `# The quay
kind: place

## quay.cranes
Three cranes work the quay.
status: sketch · by: claude · source: D002 · known: everyone · told: in:beat--the-docks-wake

## quay.stones
The stones are green, and they are planted by the vault.
status: sketch · by: claude · source: D002 · known: everyone · told: later · payoff: harbour-master.vault

## quay.gulls
The gulls circle the cranes.
status: sketch · by: claude · source: D002 · known: everyone · told: later · payoff: nowhere.at-all
`,
  "canon/world/bea.md": `# Bea
kind: person

## bea.hat
Bea wears a red hat.
status: sketch · by: ingram · source: D001, D005 · known: everyone · told: later
`,
  "canon/world/admiral.md": `# The admiral
kind: person

## admiral.ship
The admiral owns the only ship.
status: sketch · by: claude · source: D002 · known: few · told: later
`,
  "canon/world/omen.md": `# An omen
kind: weather

## omen.red-sky
The sky goes red before a flood.
status: open · source: D002 · known: some · told: later · decide-by: when a scene reaches it
`,
  "canon/plan/books.md": `# The Books

Two Books, to try the page.

## Book I · First Book
- The question: What lies under the quay?
- The party: Newcomers.
- Rank: Low.
- Only here: Said once.
Words about the first Book.
status: sketch · by: claude · source: D002 · chapters: 1 to 2

## Book II · Second Book
- The question: Who keeps it?
- The party: Seasoned.
- Rank: High.
Words about the second Book.
status: sketch · by: claude · source: D002 · chapters: 3 to 3
`,
  "canon/plan/chapter-01.md": `# Chapter 1 · the plan

Every scene, in play order.

## Episode One: The First Day

| # | Scene | Id | Day | Time | State | Note |
|---|---|---|---|---|---|---|
| 0 | Scene One | \`scene-one\` | — | morning | awaiting-read | |
| 1 | Scene Two | \`scene-two\` | 1 | afternoon | old-draft | |
| 2 | Scene Three | \`scene-three\` | 1 | evening | awaiting-read | |
`,
  "canon/plan/chapter-02.md": `# Chapter 2 · The Vault
book: I · rank: Cadets · status: sketch · by: claude · source: D002
learn: That the vault exists.
The party finds the vault under the quay.

## Beats

### beat--the-docks-wake
The docks wake before dawn and the cranes start.
status: sketch · by: claude · source: D002 · kind: event · pace: up · threads: the-river

### beat--the-lens
A reveal beat that would show the keeper's name.
status: sketch · by: claude · source: D002 · kind: reveal · pace: down · threads: the-river · reveals: harbour-master.bridge

### beat--which-door
Which door do they take, the left or the right?
status: sketch · by: claude · source: D002 · kind: choice · fork: yes · threads: the-river

### beat--the-flash
A memory of the old quay.
status: sketch · by: claude · source: D002 · kind: flashback · when: about 30 years ago

### beat--down-below
They reach the vault door.
status: sketch · by: claude · source: D002 · kind: end

## Notes
The vault is dark. Nobody carries a light.
from: cb:ch02.gm.0
`,
  "canon/plan/chapter-03.md": `# Chapter 3 · The Keeper
book: II · rank: Officers · status: sketch · by: claude · source: D002
The keeper is found.

## Beats

### beat--the-keeper-speaks
The keeper speaks.
status: sketch · by: claude · source: D002 · kind: event · pace: lateral · threads: the-river, the-lost-thread
`,
  "canon/threads/the-river.md": `# The river
kind: front
lane: powers · order: 1 · entities: harbour-master, quay, nobody-home
impulse: To run.
doom: It floods.
status: sketch · by: claude · source: D002
The river is a front.

## By Book
- I: Flows east.
- II: Floods.

## Clock · The flood
- harbour-master.vault
- beat--down-below
- beat--the-docks-wake
`,
  "canon/threads/the-gulls.md": `# The gulls
kind: thread
lane: others · order: 2 · entities: bea
status: sketch · by: claude · source: D002
Gulls follow the boats.
`,
  "canon/questions/what-lies-under.md": `# What lies under the quay?
answer: harbour-master.vault
misdirect: harbour-master.rumour
raised: in:scene-one
answered: in:chapter-02
status: sketch · by: claude · source: D002
A vault, and nobody knows it.

## Roads
- core · physical · harbour-master.map
- testimony · beat--the-lens
`,
  "canon/questions/who-keeps-it.md": `# Who keeps it?
answer: harbour-master.keeper
raised: in:chapter-02
answered: in:chapter-03
status: sketch · by: claude · source: D002

## Roads
- core · physical · harbour-master.map
- testimony · beat--the-lens
- anomaly · quay.cranes
`,
  "canon/questions/what-is-the-tide.md": `# What is the tide?
answer: omen.red-sky
raised: in:chapter-02
answered: later
status: sketch · by: claude · source: D002
Nobody has said when it will be answered.
`,
  "canon/ideas/harbour.md": `# Ideas: the harbour

Brainstorms about the harbour.

## idea--a-rejected-one
A sea monster.
status: sketch · by: ingram · source: D001 · state: rejected · retire: Sea monster

## idea--an-adopted-one
The vault.
status: sketch · by: claude · source: D002 · state: adopted · became: harbour-master.vault

## idea--a-live-one
A lantern festival.
status: sketch · by: claude · source: D002 · state: live · threads: the-river · when: book i

## idea--a-parked-one
A second bridge.
status: sketch · by: claude · source: D002 · state: parked
`,
  "canon/scenes/scene-one.json": JSON.stringify({
    id: "scene-one", title: "Scene One", goal: "To begin.", howToPlay: "Slowly.", runsAbout: "5 minutes",
    intro: { where: "The quay.", firstThing: "A bell." },
    beats: [{ id: "scene-one-b1", text: "The bell", readAloud: "A bell rings across the water.", facts: ["harbour-master.lantern"], gmFacts: [] }],
    outro: { endsWhen: "The bell stops." },
  }, null, 2) + "\n",
};

function makeRoot(files = FILES) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), "casebook-generated-"));
  fs.mkdirSync(path.join(root, "canon"), { recursive: true });
  for (const [rel, text] of Object.entries(files)) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
  }
  return root;
}
const withRoot = (fn, files) => {
  const root = makeRoot(files);
  try { return fn(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
};

// ------------------------------------------------------------------ reading the page back

const recordsIn = (html) => [...html.matchAll(/<li class="fact ([^"]*)" id="f-([^"]+)" data-fact="([^"]+)" data-status="([^"]*)">([\s\S]*?)<\/li>/g)].map((m) => ({ cls: m[1], id: m[3], status: m[4], inner: m[5], whole: m[0] }));
const count = (text, needle) => text.split(needle).length - 1;
const sectionsOf = (html, key) => [...html.matchAll(new RegExp(`<section class="sec" id="[^"]+" data-section="${key}">[\\s\\S]*?</section>`, "g"))].map((m) => m[0]);
/** A collapsible card (<details>) by its id: from its opening tag to the first closing one (the cards do not nest). */
const cardById = (html, id) => {
  const at = html.indexOf(` id="${id}"`);
  if (at < 0) return "";
  return html.slice(html.lastIndexOf("<details", at), html.indexOf("</details>", at));
};
const ids = (html) => new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
const hrefs = (html) => [...html.matchAll(/\bhref="#([^"]+)"/g)].map((m) => m[1]);
const mdRecords = (md, id) => md.split("\n").filter((l) => l.trimStart().startsWith(`- \`${id}\` `));
const LABEL = { decided: "Ink", accepted: "Ink", provisional: "Awaiting read", proposal: "Proposal", open: "Open", cut: "Cut" };
const expectedLabel = (f) => (f.status === "sketch" ? (f.by === "ingram" ? "Pencil · hers" : "Pencil · Claude") : LABEL[f.status]);

// ------------------------------------------------------------------ the fixture canon

test("fixture: every fact has exactly one record, in the one home its status and its telling give it", () => withRoot((root) => {
  const { page, md, doc, model } = buildCasebook({ root });
  assert.deepEqual(doc.problems, []);
  const facts = model.world.flatMap((e) => e.facts);
  assert.equal(facts.length, 15);
  for (const f of facts) {
    assert.equal(count(page, `data-fact="${f.id}"`), 1, `${f.id} on the page`);
    assert.equal(mdRecords(md, f.id).length, 1, `${f.id} in the Markdown`);
  }
  // Where each one lives.
  const home = (id) => doc.placed.get(id);
  assert.equal(home("harbour-master.keeper"), "hers");
  assert.equal(home("omen.red-sky"), "hers");
  assert.equal(home("harbour-master.old-name"), "cut");
  assert.equal(home("harbour-master.map"), "chapter-02", "told in the chapter itself");
  assert.equal(home("quay.cranes"), "chapter-02", "told in one of the chapter's beats");
  assert.equal(home("harbour-master.river"), "entity:harbour-master");
  assert.equal(home("quay.stones"), "entity:quay");
  // And the page agrees with where they live.
  const hers = sectionsOf(page, "hers").join("");
  assert.ok(hers.includes('data-fact="harbour-master.keeper"') && hers.includes('data-fact="omen.red-sky"'));
  assert.equal(recordsIn(page.replace(hers, "")).filter((r) => r.status === "open").length, 0, "no open fact outside Still hers");
  assert.equal(recordsIn(hers).length, 2, "Still hers holds the open facts and nothing else");
  assert.ok(sectionsOf(page, "cut").join("").includes('data-fact="harbour-master.old-name"'));
  const chapter2 = cardById(page, "c2");
  assert.ok(chapter2.includes('data-fact="harbour-master.map"') && chapter2.includes('data-fact="quay.cranes"'));
  const beat = chapter2.slice(chapter2.indexOf('id="b-beat--the-docks-wake"'), chapter2.indexOf('id="b-beat--the-lens"'));
  assert.ok(beat.includes('data-fact="quay.cranes"'), "a fact told in a beat sits under that beat");
  const card = cardById(page, "e-harbour-master");
  assert.ok(card.includes('data-fact="harbour-master.river"') && !card.includes('data-fact="harbour-master.map"'), "told in a chapter: the card points to it, it does not repeat it");
  assert.ok(card.includes('href="#f-harbour-master.map"'), "and the card points to it");
  assert.ok(card.includes('href="#f-harbour-master.keeper"'), "and to what is still hers");
}));

test("fixture: ink, awaiting read, both pencils, open, cut and GM-only are each labelled, and pencil is drawn lighter", () => withRoot((root) => {
  const { page, md, model } = buildCasebook({ root });
  const byId = new Map(model.world.flatMap((e) => e.facts).map((f) => [f.id, f]));
  const records = recordsIn(page);
  assert.equal(records.length, byId.size);
  for (const r of records) {
    const f = byId.get(r.id);
    const want = expectedLabel(f);
    assert.ok(r.inner.includes(`>${want}</span>`), `${r.id} is labelled ${want}`);
    assert.equal(r.inner.includes('class="tag gm">GM-only</span>'), f.known === "few" || f.known === "nobody", `${r.id} GM-only tag follows "known: ${f.known}"`);
    assert.equal(r.status, f.status);
    const tone = f.status === "sketch" ? "pencil" : f.status === "provisional" || f.status === "proposal" ? "wait" : f.status === "decided" || f.status === "accepted" ? "ink" : f.status;
    assert.ok(r.cls.split(" ").includes(tone), `${r.id} is drawn as ${tone}`);
    assert.ok(r.inner.includes(`known: ${f.known}`) && r.inner.includes("told: "), `${r.id} says who knows it and when the table hears it`);
    const line = mdRecords(md, r.id)[0];
    assert.ok(line.includes(`(${want}${f.known === "few" || f.known === "nobody" ? " · GM-only" : ""})`), `${r.id} in the Markdown: ${line}`);
  }
  // All six kinds of record are in the fixture, so each label above was actually exercised.
  assert.deepEqual([...new Set(records.map((r) => expectedLabel(byId.get(r.id))))].sort(), ["Awaiting read", "Cut", "Ink", "Open", "Pencil · Claude", "Pencil · hers", "Proposal"]);
  // Pencil is lighter than ink: its own colour token, in both colour schemes, and a dashed rule.
  assert.match(GENERATED_CSS, /li\.fact\.pencil \.ftext\{[^}]*color:var\(--pencil\)/);
  assert.match(GENERATED_CSS, /li\.fact\.pencil\{[^}]*dashed/);
  assert.match(GENERATED_CSS, /li\.fact\.ink \.ftext\{[^}]*color:var\(--ink\)/);
  assert.equal(count(GENERATED_CSS, "--pencil:"), 3, "defined for light, for dark by preference and for dark by choice");
}));

test("fixture: secrets sit in the violet box of their card, and what people know does not", () => withRoot((root) => {
  const { page } = buildCasebook({ root });
  const card = cardById(page, "e-harbour-master");
  const start = card.indexOf('<div class="gmbox">');
  assert.ok(start > 0, "the card has a violet box");
  const box = card.slice(start, card.indexOf("</ul></div>", start));
  assert.ok(box.includes('data-fact="harbour-master.vault"'), "known: nobody");
  assert.ok(box.includes('data-fact="harbour-master.map"') === false, "told in a chapter, so it lives there");
  assert.ok(!box.includes('data-fact="harbour-master.river"'), "known: everyone");
  assert.ok(!box.includes('data-fact="harbour-master.rumour"'), "known: some");
  assert.ok(card.slice(0, start).includes("What people know") && card.slice(0, start).includes('data-fact="harbour-master.rumour"'), "what people know comes first, outside the box");
}));

test("fixture: the world is by entity, in title order that ignores 'The', with unknown kinds after the known ones", () => withRoot((root) => {
  const { doc, page } = buildCasebook({ root });
  assert.deepEqual(doc.world.map((s) => s.title), ["People", "Places", "Weather"]);
  assert.deepEqual(doc.world[0].cards.map((c) => c.title), ["The admiral", "Bea", "The harbour master"], "'The admiral' sorts under A, not T");
  const card = doc.world[0].cards.find((c) => c.id === "harbour-master");
  // Nine facts, counted whatever their home: ink is decided or accepted; the open question, the vault and the map are secrets.
  assert.deepEqual(card.count, { ink: 2, wait: 2, pencilHers: 1, pencilClaude: 2, open: 1, cut: 1, secret: 3, total: 9 });
  assert.deepEqual(card.notes.map((n) => n.heading), ["Notes"]);
  assert.ok(!card.notes[0].text.includes("from: cb:"), "an import's bookkeeping line is not shown");
  assert.ok(page.includes("<blockquote><p>A quoted line in a note.</p></blockquote>"));
  assert.deepEqual(card.threads.map((t) => t.id), ["the-river"]);
}));

test("fixture: the plan by Book and chapter: header, beats by kind, choices, what the table can find out, GM notes, how it ends", () => withRoot((root) => {
  const { doc, page, md } = buildCasebook({ root });
  assert.deepEqual(doc.books.map((b) => [b.numeral, b.title, b.chapters.map((c) => c.n)]), [["I", "First Book", [1, 2]], ["II", "Second Book", [3]]]);
  const c2 = doc.chapters.find((c) => c.n === 2);
  assert.equal(c2.rank, "Cadets");
  assert.equal(c2.learn, "That the vault exists.");
  assert.deepEqual(c2.table.map((b) => b.kind), ["event", "reveal", "flashback"]);
  assert.deepEqual(c2.choices.map((b) => [b.id, b.fork]), [["beat--which-door", true]]);
  assert.deepEqual(c2.ends.map((b) => b.id), ["beat--down-below"]);
  assert.equal(c2.notes, "The vault is dark. Nobody carries a light.");
  assert.deepEqual(c2.finds.map((f) => f.id), ["harbour-master.map"]);
  const card = cardById(page, "c2");
  for (const heading of ["At the table", "Choices", "What they can find out", "GM notes", "Where it leaves them"]) assert.ok(card.includes(heading), heading);
  assert.ok(card.includes('<span class="bk fork">fork</span>') && card.includes('<span class="bk reveal">reveal</span>') && card.includes('<span class="bk flash">flashback</span>'));
  assert.ok(card.includes("▲") && card.includes("▼"), "the pace glyphs");
  assert.ok(card.includes("would reveal") && card.includes('href="#f-harbour-master.bridge"'), "a beat that reveals an ink fact points at it");
  assert.ok(card.includes('<span class="tag gm">GM-only</span>GM notes'));
  // The decision still hers that says it is due by this chapter is pointed at from here, and lives under Still hers.
  assert.deepEqual(c2.due.map((r) => r.id), ["harbour-master.keeper"]);
  assert.deepEqual(doc.chapters.find((c) => c.n === 3).due, []);
  assert.ok(card.includes("Hers to decide by this chapter") && card.slice(card.indexOf("Hers to decide by this chapter")).includes('href="#f-harbour-master.keeper"'));
  assert.ok(!card.includes('data-fact="harbour-master.keeper"'), "a pointer, not a second record");
  assert.ok(md.includes("**Hers to decide by this chapter**"));
  // Chapter 1 is built, not sketched: the card points to Part Zero instead of repeating it.
  const c1 = cardById(page, "c1");
  assert.ok(c1.startsWith('<details class="chap built"') && c1.includes('href="#detail"'));
  // The overview has a row for every chapter, under its Book.
  const overview = sectionsOf(page, "overview")[0];
  for (const n of [1, 2, 3]) assert.ok(overview.includes(`<a href="#c${n}">${n}</a>`));
  assert.ok(overview.indexOf("Book I · First Book") < overview.indexOf('href="#c2"') && overview.indexOf('href="#c2"') < overview.indexOf("Book II · Second Book"));
  assert.ok(md.includes("### Chapter 2: The Vault") && md.includes("**GM notes** *(GM-only)*"));
}));

test("fixture: how the party grows compares only what every Book says", () => withRoot((root) => {
  const { doc, page } = buildCasebook({ root });
  assert.deepEqual(doc.growth.rows.map((r) => r.label), ["The question", "The party", "Rank"], "'Only here' is in one Book alone");
  assert.deepEqual(doc.growth.rows[1].cells, ["Newcomers.", "Seasoned."]);
  assert.ok(sectionsOf(page, "growth")[0].includes("Seasoned."));
}));

test("fixture: questions are grouped by the Book that answers them, with their roads and an honest check", () => withRoot((root) => {
  const { doc, page } = buildCasebook({ root });
  assert.deepEqual(doc.questions.groups.map((g) => [g.book, g.cards.map((c) => c.id)]), [["I", ["what-lies-under"]], ["II", ["who-keeps-it"]], [null, ["what-is-the-tide"]]], "a question with no answer placed is in no Book");
  assert.equal(doc.questions.groups[2].title, "Answer not yet placed in a chapter");
  const q = doc.questions.groups[0].cards[0];
  assert.equal(q.roads.length, 2);
  assert.ok(q.roads[0].core && q.roads[0].kind === "physical");
  assert.deepEqual(q.flags, ["short of three roads (2)"]);
  assert.equal(q.answer.id, "harbour-master.vault");
  assert.equal(q.misdirect.id, "harbour-master.rumour");
  assert.equal(doc.questions.groups[1].cards[0].flags.length, 0, "three roads, three kinds, one core");
  const card = cardById(page, "q-what-lies-under");
  assert.ok(card.includes("short of three roads (2)") && card.includes("core · physical") && card.includes('href="#f-harbour-master.map"') && card.includes('href="#b-beat--the-lens"'));
  const appendix = sectionsOf(page, "roads")[0];
  assert.ok(appendix.includes("What lies under the quay?") && appendix.includes("Who keeps it?"));
}));

test("fixture: threads, their By Book weave and their clocks", () => withRoot((root) => {
  const { doc, page } = buildCasebook({ root });
  assert.deepEqual(doc.threads.map((t) => t.id), ["the-river", "the-gulls"], "in the order their files give");
  const river = doc.threads[0];
  assert.deepEqual(river.byBook, [{ numeral: "I", text: "Flows east." }, { numeral: "II", text: "Floods." }]);
  assert.deepEqual(river.clocks.map((c) => [c.name, c.steps.map((s) => [s.id, s.kind])]), [["The flood", [["harbour-master.vault", "fact"], ["beat--down-below", "beat"], ["beat--the-docks-wake", "beat"]]]]);
  assert.deepEqual(river.entities.map((e) => [e.id, e.known]), [["harbour-master", true], ["quay", true], ["nobody-home", false]], "an entity canon has no file for is named, not linked");
  assert.ok(river.rise.values.length > 0 && river.rise.source === "beats", "rise and fall from the beats");
  const weave = sectionsOf(page, "weave")[0];
  assert.ok(weave.includes("Flows east.") && weave.includes("Floods.") && weave.includes('<span class="rf"'));
  assert.ok(weave.includes('href="#b-beat--down-below"'));
  assert.ok(weave.includes('<span class="chip">nobody-home</span>'));
}));

test("fixture: the forks, the flashbacks and the plants", () => withRoot((root) => {
  const { doc, page } = buildCasebook({ root });
  assert.deepEqual(doc.forks.rows.map((r) => [r.chapter, r.beat.id]), [[2, "beat--which-door"]]);
  assert.deepEqual(doc.flashbacks.rows.map((r) => [r.chapter, r.beat.id, r.when]), [[2, "beat--the-flash", "about 30 years ago"]]);
  assert.deepEqual(doc.plants.rows.map((r) => [r.plant.id, r.payoff.id]), [["quay.stones", "harbour-master.vault"], ["quay.gulls", "nowhere.at-all"]]);
  assert.ok(sectionsOf(page, "plants")[0].includes("quay.stones"));
  // A payoff that names nothing canon has is shown by name, and not linked.
  const gulls = recordsIn(page).find((r) => r.id === "quay.gulls");
  assert.ok(gulls.inner.includes("pays off <code>nowhere.at-all</code>") && !gulls.inner.includes('href="#f-nowhere.at-all"'));
  const stones = recordsIn(page).find((r) => r.id === "quay.stones");
  assert.ok(stones.inner.includes('pays off <a class="ref" href="#f-harbour-master.vault">'));
  // A thread no file names is a plain chip, not a dead link.
  const chapter3 = page.slice(page.indexOf('id="b-beat--the-keeper-speaks"'), page.indexOf("</li>", page.indexOf('id="b-beat--the-keeper-speaks"')));
  assert.ok(chapter3.includes('<span class="chip">the-lost-thread</span>') && chapter3.includes('<a class="chip" href="#t-the-river">'));
  assert.ok(sectionsOf(page, "flashbacks")[0].includes("beat--the-flash"));
}));

test("fixture: her calls are her words, newest first, with the disagreements an import or a merge found kept for her to rule on", () => withRoot((root) => {
  const { doc, page, md } = buildCasebook({ root });
  assert.deepEqual(doc.calls.calls.map((c) => c.id), ["D004", "D003", "D001"], "newest first by number; the import and merge records are not hers and are left out");
  const d1 = doc.calls.calls.find((c) => c.id === "D001");
  assert.deepEqual(d1.quotes, ['"The river runs east."\n\n"And the bridge is old."'], "one quoted block, its blank line kept as a paragraph break");
  assert.equal(d1.asked, "Which way does the river run?");
  assert.equal(doc.calls.calls.find((c) => c.id === "D003").kind, "timeline");
  assert.ok(doc.calls.calls.find((c) => c.id === "D004").excerpt.startsWith("The old log's entry"), "an old record that quotes nothing shows its first words");
  assert.deepEqual(doc.calls.sources, [{ id: "S001", title: "A dossier she gave" }]);
  const calls = sectionsOf(page, "calls")[0];
  assert.ok(calls.includes('<blockquote class="her"><p>"The river runs east."</p><p>"And the bridge is old."</p></blockquote>'), "her words, quoted, in two paragraphs of one speech");
  assert.ok(md.includes('> "The river runs east."\n>\n> "And the bridge is old."'));
  assert.deepEqual(doc.hers.disagreements, [
    { id: "D002", title: "An import", conflicts: ["Bridge age: one source says old, another says new."] },
    { id: "D006", title: "A merge", conflicts: ["Quay width: one pencil fact says wide, another says narrow."] },
  ], "a merge record's conflicts are kept for her too; like an import, it is not one of her calls");
  assert.ok(sectionsOf(page, "hers")[0].includes("Bridge age: one source says old, another says new."));
  assert.ok(sectionsOf(page, "hers")[0].includes("Quay width: one pencil fact says wide, another says narrow."));
  // A source in a fact's line links to her call when there is one, and stays plain for an import record.
  const keeper = recordsIn(page).find((r) => r.id === "harbour-master.keeper");
  assert.ok(!keeper.inner.includes('href="#d-D002"'), "an import record has no entry to link to");
  const river = recordsIn(page).find((r) => r.id === "harbour-master.river");
  assert.ok(river.inner.includes('href="#d-D001"'));
  // A record of a kind the page does not know has no entry, so nothing links to it either.
  const hat = recordsIn(page).find((r) => r.id === "bea.hat");
  assert.ok(hat.inner.includes('href="#d-D001"') && !hat.inner.includes('href="#d-D005"') && hat.inner.includes(">D005<"));
  assert.ok(!doc.calls.calls.some((c) => c.id === "D005"));
}));

test("fixture: still hers lists each open fact with its candidates, its deadline and who it is about", () => withRoot((root) => {
  const { doc, page } = buildCasebook({ root });
  const items = doc.hers.groups.flatMap((g) => g.items);
  assert.deepEqual(items.map((i) => i.fact.id).sort(), ["harbour-master.keeper", "omen.red-sky"]);
  const keeper = items.find((i) => i.fact.id === "harbour-master.keeper");
  assert.deepEqual(keeper.fact.candidates, ["the master", "his clerk"]);
  assert.equal(keeper.fact.decideBy, "before Chapter 2 is written");
  const hers = sectionsOf(page, "hers")[0];
  assert.ok(hers.includes("Candidate answers") && hers.includes("the master") && hers.includes("his clerk") && hers.includes("before Chapter 2 is written"));
  assert.ok(hers.includes('<a href="#e-harbour-master">The harbour master</a>'));
}));

test("fixture: ideas by topic and by state, and the wording that must not come back", () => withRoot((root) => {
  const { doc, page } = buildCasebook({ root });
  const topic = doc.ideas.topics[0];
  assert.equal(topic.title, "the harbour");
  assert.deepEqual(topic.ideas.map((i) => i.state), ["live", "parked", "adopted", "rejected"], "live first, then parked, adopted, rejected");
  assert.deepEqual(topic.ideas.find((i) => i.state === "adopted").became.map((r) => r.id), ["harbour-master.vault"]);
  assert.deepEqual(doc.cut.retired.map((r) => [r.phrase, r.from.id]), [["Old Vault", "harbour-master.old-name"], ["Sea monster", "idea--a-rejected-one"]]);
  const ideas = sectionsOf(page, "ideas")[0];
  assert.ok(ideas.includes("never say: “Sea monster”") && ideas.includes("pencil"), "pencil, and the rejected idea's retired wording");
  assert.ok(sectionsOf(page, "cut")[0].includes("“Old Vault”"));
}));

test("fixture: a backticked id in any text links to the one place it lives", () => {
  const anchors = new Map([["a.b", "#f-a.b"], ["beat--x", "#b-beat--x"]]);
  const h = makeInline(anchors);
  assert.equal(h("see `a.b` and `beat--x` but not `c.d`"), 'see <a class="ref" href="#f-a.b"><code>a.b</code></a> and <a class="ref" href="#b-beat--x"><code>beat--x</code></a> but not <code>c.d</code>');
  assert.equal(h("**bold** and *soft* <b>"), "<strong>bold</strong> and <em>soft</em> &lt;b&gt;");
  assert.equal(h("a * b * c"), "a * b * c", "a lone asterisk is just an asterisk");
  assert.equal(h("**`a.b`** is open"), '<strong><a class="ref" href="#f-a.b"><code>a.b</code></a></strong> is open', "bold may wrap a code span");
  assert.equal(h("`<b>&`"), "<code>&lt;b&gt;&amp;</code>", "a code span is escaped too");
});

/** A crude well-formedness check: every tag opened in the page body is closed, in order. Returns the first problem, or null. */
const markupProblem = (html) => {
  const body = html.slice(html.indexOf('<div class="wrap">')).replace(/<script[\s\S]*?<\/script>/g, "");
  const VOID = new Set(["br", "hr", "img", "input", "meta", "link", "wbr"]);
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/?)>/g)) {
    const tag = m[2].toLowerCase();
    if (VOID.has(tag) || m[3]) continue;
    if (!m[1]) { stack.push(tag); continue; }
    const top = stack.pop();
    if (top !== tag) return `</${tag}> closes ${top || "nothing"} near: ${body.slice(Math.max(0, m.index - 60), m.index + 20).replace(/\s+/g, " ")}`;
  }
  return stack.length ? `${stack.length} tags never closed: ${stack.slice(-3).join(", ")}` : null;
};

const duplicateIds = (html) => {
  const seen = new Map();
  for (const m of html.matchAll(/\bid="([^"]+)"/g)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  return [...seen].filter(([, n]) => n > 1).map(([id]) => id);
};

test("fixture: every link on the page goes to something that is there, and no id is used twice", () => withRoot((root) => {
  const { page } = buildCasebook({ root });
  const have = ids(page);
  const broken = [...new Set(hrefs(page))].filter((id) => !have.has(id));
  assert.deepEqual(broken, []);
  assert.deepEqual(duplicateIds(page), []);
  assert.equal(markupProblem(page), null, "every tag closes");
}));

test("fixture: nothing was printed that should not be: no undefined, [object Object] or NaN", () => withRoot((root) => {
  const { page, md } = buildCasebook({ root });
  for (const word of ["undefined", "[object Object]", "NaN"]) assert.ok(!page.includes(word) && !md.includes(word), word);
}));

test("fixture: the page and the Markdown come out the same every time, with no clock in them", () => withRoot((root) => {
  const a = buildCasebook({ root });
  const b = buildCasebook({ root, model: a.model });
  assert.equal(a.page, b.page);
  assert.equal(a.md, b.md);
  const c = buildCasebook({ root });
  assert.equal(a.page, c.page, "and from a fresh reading of the same canon");
  assert.ok(!/\b20\d\d-\d\d-\d\dT\d\d:\d\d/.test(a.page), "no timestamp");
}));

test("fixture: the page has a contents list, collapsible cards, and the key at the top", () => withRoot((root) => {
  const { page, doc } = buildCasebook({ root });
  assert.ok(page.includes('<nav class="toc"') && page.includes("How to read this page"));
  for (const label of Object.values(TAGS).map((t) => t.label)) assert.ok(page.includes(`>${label}</span>`), `the key shows ${label}`);
  assert.ok(page.includes(">GM-only</span>"));
  assert.ok(page.includes("<details") && page.includes("data-fold"));
  assert.ok(page.includes(`<span>Canon ${doc.meta.canonHash}</span>`), "says which canon it was made from, so a stale copy can be told");
  assert.match(doc.meta.canonHash, /^[0-9a-f]{16}$/);
  // The contents list names every section, in order.
  for (const p of doc.toc) for (const s of p.sections) assert.ok(page.includes(`href="#${s.id}"`), `${s.id} is in the contents`);
  assert.ok(!/<script src=/.test(page), "no external script");
}));

test("fixture: the generated parts take no class from Part Zero's scene cards", () => withRoot((root) => {
  const { page } = buildCasebook({ root });
  const start = page.indexOf('<div class="part" id="part0">');
  const end = page.indexOf('<div class="part" id="part1">') > 0 ? page.indexOf('<div class="part" id="part1">') : page.indexOf('<div class="part" id="part2">');
  assert.ok(start > 0 && end > start);
  const rest = page.slice(0, start) + page.slice(end);
  const classes = (html) => [...html.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
  assert.ok(!classes(rest).includes("scene"), "a .scene class outside Part Zero would draw a scene card (a source's scene id once did)");
  assert.ok(classes(page.slice(start, end)).includes("scene"));
}));

test("fixture: Part Zero is still the scenes in full, and it points into the generated parts", () => withRoot((root) => {
  const { page, detail } = buildCasebook({ root });
  assert.ok(page.includes('id="part0"') && page.includes('id="scene-scene-one"'));
  assert.equal(detail.scenes.length, 1, "only the scene that is in canon and awaiting her read is written in detail");
  assert.ok(page.includes("A bell rings across the water."));
  const fact = page.slice(page.indexOf('id="scene-scene-one"'), page.indexOf("</article>", page.indexOf('id="scene-scene-one"')));
  assert.ok(fact.includes("harbour-master.lantern"));
  assert.ok(fact.includes('<a class="ref" href="#f-harbour-master.lantern"><code>harbour-master.lantern</code></a>'), "a scene's list of the facts it cites points to each fact's one record");
  // The standalone scene page has no record to point to, so it shows the id plain.
  const standalone = scenePageHtml(detail.scenes[0], detail);
  assert.ok(standalone.includes("<code>harbour-master.lantern</code>") && !standalone.includes('href="#f-harbour-master.lantern"'));
  // A told fact's line links to the scene it is told in.
  const bridge = recordsIn(page).find((r) => r.id === "harbour-master.bridge");
  assert.ok(bridge.inner.includes('href="#scene-scene-one"'));
}));

test("an empty canon builds, and says so without crashing", () => withRoot((root) => {
  const { page, md, doc } = buildCasebook({ root });
  assert.deepEqual(doc.problems, []);
  assert.equal(doc.glance.facts.total, 0);
  assert.ok(page.includes("Blank Inheritance") && md.startsWith("# Blank Inheritance"));
  assert.ok(sectionsOf(page, "hers")[0].includes("Nothing is open."));
}, {}));

test("references to things canon no longer has (a merge can remove them) are shown by name, never as a dead link or a crash", () => {
  const files = {
    ...FILES,
    "canon/world/quay.md": FILES["canon/world/quay.md"] + `
## quay.orphan
A fact told in a beat that is gone, with a truth that is gone.
status: sketch · by: claude · source: D002 · held-by: the gulls · true: no · truth: nothing.here · known: some · told: in:beat--gone
`,
    "canon/threads/the-river.md": FILES["canon/threads/the-river.md"].replace("- beat--the-docks-wake\n", "- beat--the-docks-wake\n- nothing.here\n"),
    "canon/questions/what-lies-under.md": FILES["canon/questions/what-lies-under.md"].replace("answer: harbour-master.vault", "answer: nothing.here").replace("- testimony · beat--the-lens\n", "- testimony · beat--the-lens\n- physical · nothing.here\n"),
    "canon/plan/chapter-03.md": FILES["canon/plan/chapter-03.md"].replace("threads: the-river, the-lost-thread", "threads: the-river, the-lost-thread · reveals: nothing.here"),
    "canon/ideas/harbour.md": FILES["canon/ideas/harbour.md"].replace("became: harbour-master.vault", "became: nothing.here, harbour-master.vault"),
  };
  withRoot((root) => {
    const { page, md, doc, model } = buildCasebook({ root });
    assert.deepEqual(doc.problems, []);
    const have = ids(page);
    assert.deepEqual([...new Set(hrefs(page))].filter((id) => !have.has(id)), [], "no dead link");
    assert.equal(markupProblem(page), null);
    for (const f of model.world.flatMap((e) => e.facts)) assert.equal(count(page, `data-fact="${f.id}"`), 1, f.id);
    assert.equal(doc.placed.get("quay.orphan"), "entity:quay", "told in a beat that is gone, so it falls back to its entity");
    assert.ok(page.includes("<code>nothing.here</code>") && !page.includes('href="#f-nothing.here"') && !page.includes('href="#b-nothing.here"'));
    assert.ok(md.includes("`nothing.here`"));
  }, files);
});

test("a fact placed twice is reported, never silently doubled", () => withRoot((root) => {
  fs.writeFileSync(path.join(root, "canon/world/bea.md"), FILES["canon/world/bea.md"] + "\n## bea.hat\nA second hat.\nstatus: sketch · by: claude · source: D002 · known: everyone · told: later\n");
  const { doc } = buildCasebook({ root });
  assert.equal(doc.problems.length, 1);
  assert.match(doc.problems[0], /bea\.hat would be placed twice/);
}));

// ------------------------------------------------------------------ pure pieces

test("tags: each status has one tag, pencil says whose words, and a secret is few or nobody", () => {
  assert.equal(tagOf({ status: "decided" }), "ink");
  assert.equal(tagOf({ status: "accepted" }), "ink");
  assert.equal(tagOf({ status: "provisional" }), "wait");
  assert.equal(tagOf({ status: "proposal" }), "wait");
  assert.equal(tagOf({ status: "sketch", by: "ingram" }), "pencil-hers");
  assert.equal(tagOf({ status: "sketch", by: "claude" }), "pencil-claude");
  assert.equal(tagOf({ status: "open" }), "open");
  assert.equal(tagOf({ status: "cut" }), "cut");
  assert.equal(tagOf({ status: null }), null, "a built chapter has no status to tag");
  assert.equal(tagLabel({ tag: "wait", status: "proposal" }), "Proposal");
  assert.equal(tagLabel({ tag: "wait", status: "provisional" }), "Awaiting read");
  assert.deepEqual(["everyone", "some", "few", "nobody"].map(isSecret), [false, false, true, true]);
});

// ------------------------------------------------------------------ the repo's own canon

const REAL = loadModel();
const REAL_BUILD = buildCasebook({ root: ROOT, model: REAL });

test("REAL DATA: every canon fact has exactly one record on the page and in the Markdown", () => {
  const { page, md, doc } = REAL_BUILD;
  const facts = REAL.world.flatMap((e) => e.facts);
  assert.ok(facts.length > 100, "canon has facts");
  assert.deepEqual(doc.problems, []);
  assert.equal(count(page, 'data-fact="'), new Set(facts.map((f) => f.id)).size, "as many records as there are facts");
  const seen = new Map();
  for (const r of recordsIn(page)) seen.set(r.id, (seen.get(r.id) || 0) + 1);
  const mdLines = new Map();
  for (const line of md.split("\n")) { const m = line.match(/^\s*- `([^`]+)` /); if (m) mdLines.set(m[1], (mdLines.get(m[1]) || 0) + 1); }
  for (const f of facts) {
    assert.equal(seen.get(f.id), 1, `${f.id} on the page`);
    assert.equal(mdLines.get(f.id), 1, `${f.id} in the Markdown`);
  }
});

test("REAL DATA: every open fact is under Still hers, with its candidates and deadline, and nowhere else", () => {
  const { page, doc } = REAL_BUILD;
  const open = REAL.world.flatMap((e) => e.facts).filter((f) => f.status === "open");
  const hers = sectionsOf(page, "hers")[0];
  const inHers = new Map(recordsIn(hers).map((r) => [r.id, r]));
  assert.equal(inHers.size, open.length, "Still hers holds every open fact and nothing else");
  for (const f of open) {
    const r = inHers.get(f.id);
    assert.ok(r, `${f.id} is under Still hers`);
    assert.ok(r.inner.includes(">Open</span>"));
    assert.equal(count(r.inner, 'class="cand"'), f.candidates.length, `${f.id} lists each of its candidate answers`);
    assert.equal(r.inner.includes('class="decby"'), Boolean(f.decideBy), `${f.id} says when it is due, if it says`);
  }
  assert.equal(recordsIn(page.replace(hers, "")).filter((r) => r.status === "open").length, 0, "and no open fact is anywhere else");
  assert.equal(doc.hers.count, open.length);
});

test("REAL DATA: ink, awaiting read, pencil (hers or Claude's), open, cut and GM-only are each labelled", () => {
  const { page, md } = REAL_BUILD;
  const byId = new Map(REAL.world.flatMap((e) => e.facts).map((f) => [f.id, f]));
  const mdOf = new Map();
  for (const line of md.split("\n")) { const m = line.match(/^\s*- `([^`]+)` \*\(([^)]*)\)\*/); if (m) mdOf.set(m[1], m[2]); }
  const labels = new Set();
  for (const r of recordsIn(page)) {
    const f = byId.get(r.id);
    const want = expectedLabel(f);
    labels.add(want);
    assert.ok(r.inner.includes(`>${want}</span>`), `${r.id} is labelled ${want}`);
    assert.equal(r.inner.includes('class="tag gm">GM-only</span>'), f.known === "few" || f.known === "nobody", `${r.id} GM-only follows "known: ${f.known}"`);
    assert.equal(mdOf.get(r.id), want + (f.known === "few" || f.known === "nobody" ? " · GM-only" : ""), `${r.id} in the Markdown`);
  }
  assert.ok(labels.has("Ink") && labels.has("Pencil · Claude") && labels.has("Open"), "canon has ink, pencil and open facts, and each is drawn");
});

test("REAL DATA: the page is the same every time", () => {
  const again = buildCasebook({ root: ROOT, model: REAL });
  assert.equal(again.page, REAL_BUILD.page);
  assert.equal(again.md, REAL_BUILD.md);
});

test("REAL DATA: every link on the page goes to something that is there, and no id is used twice", () => {
  const have = ids(REAL_BUILD.page);
  const broken = [...new Set(hrefs(REAL_BUILD.page))].filter((id) => !have.has(id));
  assert.deepEqual(broken, []);
  assert.deepEqual(duplicateIds(REAL_BUILD.page), []);
  assert.equal(markupProblem(REAL_BUILD.page), null, "every tag closes");
});

test("REAL DATA: nothing was printed that should not be: no undefined, [object Object] or NaN in the page or the Markdown", () => {
  for (const [name, text] of [["page", REAL_BUILD.page], ["Markdown", REAL_BUILD.md]]) {
    for (const word of ["undefined", "[object Object]", "NaN"]) {
      const at = text.indexOf(word);
      assert.equal(at, -1, `the ${name} contains "${word}" near: ${text.slice(Math.max(0, at - 80), at + 40).replace(/\s+/g, " ")}`);
    }
  }
});

test("REAL DATA: every entity, beat, thread, question, idea and Book is on the page once, and every decision of hers is quoted", () => {
  const { page } = REAL_BUILD;
  for (const e of REAL.world) assert.equal(count(page, `id="e-${e.id}"`), 1, `entity ${e.id}`);
  for (const c of REAL.chapters) { assert.equal(count(page, `id="c${c.n}"`), 1, `chapter ${c.n}`); for (const b of c.beats) assert.equal(count(page, `id="b-${b.id}"`), 1, `beat ${b.id}`); }
  for (const t of REAL.threads) assert.equal(count(page, `id="t-${t.id}"`), 1, `thread ${t.id}`);
  for (const q of REAL.questions) assert.equal(count(page, `id="q-${q.id}"`), 1, `question ${q.id}`);
  for (const i of REAL.ideas) assert.equal(count(page, `id="i-${i.id}"`), 1, `idea ${i.id}`);
  for (const b of REAL.books) assert.equal(count(page, `id="book-${b.numeral.toLowerCase()}"`), 1, `Book ${b.numeral}`);
  // An import record and a merge record are Claude's, not hers: they are never listed among her calls.
  for (const d of REAL.decisions.filter((x) => x.kind !== "import" && x.kind !== "merge")) assert.equal(count(page, `id="d-${d.id}"`), 1, `her call ${d.id}`);
  for (const s of REAL.sources) assert.equal(count(page, `id="d-${s.id}"`), 1, `source ${s.id}`);
});

test("REAL DATA: Part Zero still shows every scene waiting for her read, and the generated parts follow it", () => {
  const { page, detail, doc } = REAL_BUILD;
  assert.ok(detail.scenes.length >= 1);
  for (const x of detail.scenes) assert.equal(count(page, `id="scene-${x.row.scene}"`), 1, x.row.scene);
  const order = doc.parts.map((p) => p.id);
  assert.equal(order[0], "part0");
  assert.ok(page.indexOf('id="part0"') < page.indexOf('id="part1"') || !order.includes("part1"));
  assert.ok(page.indexOf('id="part2"') < page.indexOf('id="part3"') && page.indexOf('id="part3"') < page.indexOf('id="part4"'));
});

// ------------------------------------------------------------------ nothing hand-written, nothing hard-coded

const CASEBOOK_SOURCES = ["derive.mjs", "render.mjs", "style.mjs", "build.mjs", "detail.mjs", "preview.mjs"].map((f) => path.join(ROOT, "tools/casebook", f));

/** Does this source name the canon item (fact, beat, thread...) by its whole id? */
const namesCanonItem = (src, token) => new RegExp(`(?<![\\w.-])${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w.-])`).test(src);

test("the hard-coding scan finds a canon id in source, and only whole ids", () => {
  const has = (src, token) => namesCanonItem(src, token);
  assert.ok(has("see `harbour-master.river` here", "harbour-master.river"));
  assert.ok(has("harbour-master.river", "harbour-master.river"));
  assert.ok(!has("not-harbour-master.river", "harbour-master.river"), "part of a longer id is not the id");
  assert.ok(!has("harbour-master.rivers", "harbour-master.river"));
  assert.ok(!has("harbour-master.river-bank", "harbour-master.river"));
});

test("build.mjs and its parts read no hand-written content: nothing imports content/, quarantine or the old outline", () => {
  assert.ok(!fs.existsSync(path.join(ROOT, "tools/casebook/content")), "the hand-written outline is retired");
  assert.ok(fs.existsSync(path.join(ROOT, "quarantine/casebook/content/content.mjs")), "to quarantine, where only the coverage proof reads it");
  for (const file of CASEBOOK_SOURCES) {
    const src = fs.readFileSync(file, "utf8");
    const specs = [...src.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
    for (const spec of specs) {
      assert.ok(!/(^|\/)content(\/|$|\.mjs)/.test(spec), `${path.basename(file)} imports ${spec}`);
      assert.ok(!/quarantine/.test(spec), `${path.basename(file)} imports ${spec}`);
    }
    assert.ok(!/import\s+\*\s+as\s+C\b/.test(src) && !/\bC\.(?:CHAPTERS|BOOKS|CAST|WORDS|TRUTH|WEAVE|FORKS|CALLS|GAPS|STILL_YOURS|META|SECTIONS)\b/.test(src), `${path.basename(file)} reaches for the old outline's constants`);
  }
});

test("REAL DATA: no story is hard-coded in the generator or in these tests: not one canon id or name appears in their source", () => {
  const tokens = new Set();
  for (const e of REAL.world) { if (e.id.includes("-") && e.id.length >= 6) tokens.add(e.id); for (const f of e.facts) tokens.add(f.id); }
  for (const c of REAL.chapters) for (const b of c.beats) tokens.add(b.id);
  for (const x of [...REAL.threads, ...REAL.questions, ...REAL.ideas]) tokens.add(x.id);
  for (const s of REAL.scenes) tokens.add(s.id);
  // The names canon gives its people, places and groups: a capitalised title of five letters or more, without its "The".
  const names = new Set();
  for (const e of REAL.world) {
    const name = String(e.title).replace(/^The /, "").trim();
    if (name.length >= 5 && /^[A-Z]/.test(name)) names.add(name);
  }
  const files = [...CASEBOOK_SOURCES, fileURLToPath(import.meta.url)];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const t of tokens) assert.ok(!namesCanonItem(src, t), `${path.basename(file)} names the canon item "${t}": derive it from canon instead`);
    for (const n of names) assert.ok(!new RegExp(`(?<![A-Za-z])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z])`).test(src), `${path.basename(file)} writes the canon name "${n}": the page's own words say nothing about the story`);
  }
});

test("REAL DATA: the repo copy keeps its line endings", () => {
  const repoCopy = path.join(ROOT, "data/generated/casebook.md");
  if (!fs.existsSync(repoCopy)) return;
  const text = fs.readFileSync(repoCopy, "utf8");
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/\n/g) || []).length;
  assert.ok(crlf === 0 || crlf === lf, "all LF or all CRLF, never mixed");
});
