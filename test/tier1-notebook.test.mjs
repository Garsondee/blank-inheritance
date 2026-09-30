// Tier 1 — the party notebook's rules.
//
// design/notebook.md. What these protect: access is set in exactly one place
// (the notebook entry's default ownership), a person's page exists only once
// they are on the stage and follows the name the TABLE has been told, and the
// index a player browses is grouped, searched and filtered without ever
// showing a chip count that lies about what is behind it.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  ARTICLE_KINDS,
  DEFAULT_TITLE,
  FILTERS,
  KIND_LIST,
  KIND_META,
  MODULE_ID,
  NOTE_FLAG,
  NOTE_KINDS,
  OWNER,
  agoLabel,
  canDeletePage,
  canRetitle,
  excerptOf,
  exportPayload,
  indexModel,
  isPersonPage,
  nameOfUser,
  newArticleTitle,
  noteFlags,
  notebookEntryData,
  ownershipIsRight,
  ownershipRepair,
  pageCreateData,
  pageView,
  plainText,
  planPersonPages,
  selectionFor,
  titleFor
} from "../module/blank-inheritance/scripts/core/notebook.mjs";

const at = (minutesAgo, now = 1_800_000_000_000) => now - minutesAgo * 60_000;
const NOW = 1_800_000_000_000;

const KAZUE = pageView({ id: "p1", name: "the attendant", kind: "person", subject: "summon-pa1", html: "<p>Runs the baths like a ship.</p>", modified: at(5) });
const HALL = pageView({ id: "p2", name: "The drill hall", kind: "place", html: "<p>Big doors, one lamp.</p>", author: "u-liam", modified: at(60) });
const KEY = pageView({ id: "p3", name: "Who has the key?", kind: "clue", html: "<p>The Section Officer, or maybe not.</p>", author: "u-pippa", modified: at(1) });
const PLAN = pageView({ id: "p4", name: "Get past the gate", kind: "plan", html: "", author: "u-craig", modified: at(200) });
const NOTE = pageView({ id: "p5", name: "Untitled note", kind: "note", html: "<p>tea?</p>", author: "u-steve", modified: at(400) });
const ALL = [KAZUE, HALL, KEY, PLAN, NOTE];

/* ------------------------------------------------------------------ */
/*  Access                                                             */
/* ------------------------------------------------------------------ */

test("the notebook entry grants every player OWNER by default, in exactly one place", () => {
  const data = notebookEntryData({ id: "abc" });
  assert.equal(data.ownership.default, OWNER);
  assert.equal(data._id, "abc");
  assert.equal(data.flags[MODULE_ID].sourceId, "party-notebook");
  assert.deepEqual(Object.keys(data.ownership), ["default"], "no per-user overrides: the level is set once");
});

test("the notebook entry never carries sourceHash, so the world sync can never retire it as an orphaned synced document", () => {
  // foundry/world-sync.mjs deletes only documents carrying BOTH sourceId and
  // sourceHash (core/world-sync.mjs#orphanedSyncedDocuments). The vault
  // journals stay out of its reach the same way, by never carrying the pair.
  const flags = notebookEntryData({ id: "x" }).flags[MODULE_ID];
  assert.equal(typeof flags.sourceId, "string");
  assert.equal("sourceHash" in flags, false);
});

test("OWNER is Foundry's own level 3", () => {
  assert.equal(OWNER, 3);
});

test("ownershipIsRight notices an entry that has drifted below OWNER, so it can be repaired", () => {
  assert.equal(ownershipIsRight({ default: 3 }), true);
  assert.equal(ownershipIsRight({ default: 2 }), false);
  assert.equal(ownershipIsRight({ default: 0 }), false);
  assert.equal(ownershipIsRight(undefined), false);
});

test("ownershipRepair is null when the entry is right and otherwise says exactly what to change", () => {
  assert.equal(ownershipRepair({ default: 3 }), null);
  assert.deepEqual(ownershipRepair({ default: 0 }), { default: 3 });
  assert.deepEqual(ownershipRepair(undefined), { default: 3 });
});

test("a per-user entry below OWNER, which would lock one player out, is raised to OWNER", () => {
  assert.deepEqual(ownershipRepair({ default: 3, u1: 0 }), { u1: 3 });
  assert.equal(ownershipRepair({ default: 3, u1: 3 }), null, "an explicit OWNER is harmless");
  assert.deepEqual(ownershipRepair({ default: 1, u1: 2, u2: 3 }), { default: 3, u1: 3 });
  assert.ok(!Object.keys(ownershipRepair({ default: 3, u1: 0 })).some((key) => key.startsWith("-=")), "Foundry refuses the -= deletion syntax on ownership");
  assert.equal(ownershipIsRight({ default: 3, u1: 0 }), false);
});

test("a page carries no ownership of its own, so it inherits the notebook's", () => {
  const data = pageCreateData({ title: "x" });
  assert.equal("ownership" in data, false);
});

/* ------------------------------------------------------------------ */
/*  Pages                                                              */
/* ------------------------------------------------------------------ */

test("a page is created as HTML text with its kind, subject and author filed in flags", () => {
  const data = pageCreateData({ title: "Taka", kind: "person", subject: "summon-taka", img: "a.webp", author: "u1", html: "<p>hi</p>" });
  assert.equal(data.type, "text");
  assert.deepEqual(data.text, { content: "<p>hi</p>", format: 1 });
  assert.deepEqual(data.flags[MODULE_ID][NOTE_FLAG], { kind: "person", subject: "summon-taka", img: "a.webp", author: "u1" });
});

test("an unknown kind is filed as a plain note, never rejected", () => {
  assert.equal(noteFlags({ kind: "spaceship" })[MODULE_ID][NOTE_FLAG].kind, "note");
  assert.equal(pageView({ kind: "spaceship" }).kind, "note");
});

test("empty optional fields are left out of the flags rather than stored as null", () => {
  assert.deepEqual(noteFlags({ kind: "place" })[MODULE_ID][NOTE_FLAG], { kind: "place" });
});

test("every kind has an order, icon and label key, and the index order is fixed", () => {
  assert.deepEqual(KIND_LIST, ["person", "place", "clue", "plan", "note"]);
  for (const kind of KIND_LIST) {
    assert.ok(KIND_META[kind].icon.startsWith("fa-"));
    assert.match(KIND_META[kind].labelKey, /^BLANKINHERITANCE\.Notebook\.Kind\./);
  }
  assert.deepEqual([...FILTERS], ["all", ...KIND_LIST]);
});

test("a player may start any kind except a person: only the stage makes those", () => {
  assert.ok(!ARTICLE_KINDS.includes(NOTE_KINDS.PERSON));
  assert.equal(ARTICLE_KINDS.length, 4);
});

/* ------------------------------------------------------------------ */
/*  Text                                                               */
/* ------------------------------------------------------------------ */

test("plainText drops markup, decodes entities and collapses whitespace", () => {
  assert.equal(plainText("<p>Tea&nbsp;&amp; toast</p><p>at   <b>six</b></p>"), "Tea & toast at six");
  assert.equal(plainText("a<br>b"), "a b");
  assert.equal(plainText(null), "");
});

test("excerptOf cuts at a word with an ellipsis and leaves short text alone", () => {
  assert.equal(excerptOf("<p>short</p>"), "short");
  const long = excerptOf("<p>" + "word ".repeat(60) + "</p>", 40);
  assert.ok(long.endsWith("…"));
  assert.ok(long.length <= 41);
  assert.ok(!/wor…$/.test(long), "cut mid-word");
});

test("a title is one clean line, never empty, and never longer than the limit", () => {
  assert.equal(titleFor("  Hello   <b>world</b> "), "Hello world");
  assert.equal(titleFor(""), DEFAULT_TITLE);
  assert.equal(titleFor("   "), DEFAULT_TITLE);
  assert.equal(titleFor("x".repeat(500)).length, 80);
});

test("a new article's title is one no other page has", () => {
  assert.equal(newArticleTitle([]), "Untitled note");
  assert.equal(newArticleTitle(["Untitled note"]), "Untitled note 2");
  assert.equal(newArticleTitle(["Untitled note", "untitled note 2"]), "Untitled note 3");
  assert.equal(newArticleTitle(["Something else"]), "Untitled note");
});

/* ------------------------------------------------------------------ */
/*  The stage feeds the notebook                                       */
/* ------------------------------------------------------------------ */

test("an NPC who arrives on stage gets a page titled with what the table calls them", () => {
  const plan = planPersonPages([], [{ portraitId: "summon-pa1", label: "the attendant", img: "a.webp", kind: "npc" }]);
  assert.deepEqual(plan.create, [{ subject: "summon-pa1", label: "the attendant", img: "a.webp" }]);
  assert.deepEqual(plan.rename, []);
});

test("a PC arriving does not get a page made for them (the People list is not filled with players)", () => {
  const plan = planPersonPages([], [{ portraitId: "summon-liam", label: "Rupiah", kind: "pc" }]);
  assert.deepEqual(plan.create, []);
});

test("learning a name renames the page, so notes about 'the attendant' are still there under her name", () => {
  const existing = [{ id: "p1", name: "the attendant", subject: "summon-pa1" }];
  const plan = planPersonPages(existing, [{ portraitId: "summon-pa1", label: "Kazue Tsurumi", kind: "npc" }]);
  assert.deepEqual(plan.rename, [{ id: "p1", name: "Kazue Tsurumi" }]);
  assert.deepEqual(plan.create, []);
});

test("a page already titled correctly is left completely alone (idempotent)", () => {
  const existing = [{ id: "p1", name: "Kazue Tsurumi", subject: "summon-pa1" }];
  const plan = planPersonPages(existing, [{ portraitId: "summon-pa1", label: "Kazue Tsurumi", kind: "npc" }]);
  assert.deepEqual(plan, { create: [], rename: [] });
});

test("a PC who already has a page is still renamed to match the stage", () => {
  const existing = [{ id: "p9", name: "old", subject: "summon-liam" }];
  const plan = planPersonPages(existing, [{ portraitId: "summon-liam", label: "Rupiah", kind: "pc" }]);
  assert.deepEqual(plan.rename, [{ id: "p9", name: "Rupiah" }]);
});

test("someone on the stage twice, or with no label, is planned once or not at all", () => {
  const plan = planPersonPages([], [
    { portraitId: "a", label: "A", kind: "npc" },
    { portraitId: "a", label: "A again", kind: "npc" },
    { portraitId: "b", label: "", kind: "npc" },
    { label: "no id", kind: "npc" }
  ]);
  assert.equal(plan.create.length, 1);
  assert.equal(plan.create[0].label, "A");
});

test("a very long name is compared as it is filed, so it is not renamed again on every sync", () => {
  const long = "A".repeat(200);
  const created = planPersonPages([], [{ portraitId: "x", label: long, kind: "npc" }]);
  assert.equal(created.create[0].label.length, 80);
  const filed = [{ id: "p", name: created.create[0].label, subject: "x" }];
  assert.deepEqual(planPersonPages(filed, [{ portraitId: "x", label: long, kind: "npc" }]), { create: [], rename: [] });
});

test("nobody concealed can appear: the plan only ever sees the published cast", () => {
  // planPersonPages has no way to ask about a concealed person; it is given none.
  assert.deepEqual(planPersonPages([], []), { create: [], rename: [] });
});

/* ------------------------------------------------------------------ */
/*  The index                                                          */
/* ------------------------------------------------------------------ */

test("the index groups by kind in the fixed order and drops empty groups", () => {
  const model = indexModel(ALL);
  assert.deepEqual(model.groups.map((group) => group.kind), ["person", "place", "clue", "plan", "note"]);
  const noPlans = indexModel(ALL.filter((view) => view.kind !== "plan"));
  assert.ok(!noPlans.groups.some((group) => group.kind === "plan"));
});

test("inside a group the most recently written page comes first", () => {
  const older = pageView({ id: "a", name: "Older", kind: "note", modified: at(100) });
  const newer = pageView({ id: "b", name: "Newer", kind: "note", modified: at(2) });
  const items = indexModel([older, newer]).groups[0].items;
  assert.deepEqual(items.map((item) => item.name), ["Newer", "Older"]);
});

test("a filter chip narrows the list, and the counts stay honest for the whole notebook", () => {
  const model = indexModel(ALL, { filter: "clue" });
  assert.deepEqual(model.groups.map((group) => group.kind), ["clue"]);
  assert.equal(model.counts.all, 5);
  assert.equal(model.counts.person, 1);
  assert.equal(model.counts.clue, 1);
  assert.equal(model.shown, 1);
});

test("an unknown filter falls back to everything", () => {
  assert.equal(indexModel(ALL, { filter: "nonsense" }).filter, "all");
});

test("search matches titles and text, case-insensitively, and every word must match", () => {
  assert.deepEqual(indexModel(ALL, { query: "LAMP" }).groups.flatMap((g) => g.items.map((i) => i.id)), ["p2"]);
  assert.deepEqual(indexModel(ALL, { query: "section officer" }).groups.flatMap((g) => g.items.map((i) => i.id)), ["p3"]);
  assert.equal(indexModel(ALL, { query: "section banana" }).shown, 0);
});

test("search narrows the chip counts too, so a chip never promises pages the search has hidden", () => {
  const model = indexModel(ALL, { query: "lamp" });
  assert.equal(model.counts.all, 1);
  assert.equal(model.counts.person, 0);
  assert.equal(model.counts.place, 1);
});

test("an empty notebook and a search with no matches are told apart", () => {
  assert.equal(indexModel([]).empty, true);
  const none = indexModel(ALL, { query: "zzzzz" });
  assert.equal(none.empty, false);
  assert.equal(none.noMatches, true);
});

test("the selected page is marked in the index", () => {
  const items = indexModel(ALL, { selectedId: "p3" }).groups.flatMap((g) => g.items);
  assert.deepEqual(items.filter((item) => item.selected).map((item) => item.id), ["p3"]);
});

test("selectionFor keeps a page that exists and otherwise falls to the first in the index", () => {
  assert.equal(selectionFor(ALL, "p4"), "p4");
  assert.equal(selectionFor(ALL, "gone"), "p1", "the first group is people, so its first page");
  assert.equal(selectionFor([], "anything"), null);
});

test("the index carries a page's excerpt for its preview line", () => {
  const item = indexModel(ALL).groups[0].items[0];
  assert.equal(item.excerpt, "Runs the baths like a ship.");
});

/* ------------------------------------------------------------------ */
/*  Who may do what                                                    */
/* ------------------------------------------------------------------ */

test("a player may delete an article they wrote, not someone else's, and never a person's page", () => {
  const liam = { id: "u-liam", isGM: false };
  assert.equal(canDeletePage(HALL, liam), true);
  assert.equal(canDeletePage(KEY, liam), false);
  assert.equal(canDeletePage(KAZUE, liam), false);
});

test("the GM may delete anything", () => {
  const gm = { id: "gm", isGM: true };
  for (const view of ALL) assert.equal(canDeletePage(view, gm), true);
});

test("an article with no recorded author is deletable by nobody but the GM", () => {
  const orphan = pageView({ id: "x", name: "?", kind: "note" });
  assert.equal(canDeletePage(orphan, { id: "u", isGM: false }), false);
  assert.equal(canDeletePage(orphan, { id: "gm", isGM: true }), true);
});

test("only an article can be retitled by hand: the stage titles a person's page", () => {
  assert.equal(canRetitle(HALL), true);
  assert.equal(canRetitle(KAZUE), false);
  assert.equal(isPersonPage(KAZUE), true);
});

test("missing input never grants anything", () => {
  assert.equal(canDeletePage(null, { id: "u", isGM: true }), false);
  assert.equal(canDeletePage(HALL, null), false);
});

/* ------------------------------------------------------------------ */
/*  Time, names and the export                                         */
/* ------------------------------------------------------------------ */

test("agoLabel speaks in the unit that fits", () => {
  assert.equal(agoLabel(at(0), NOW), "now");
  assert.equal(agoLabel(at(5), NOW), "5 minutes ago");
  assert.equal(agoLabel(at(180), NOW), "3 hours ago");
  assert.equal(agoLabel(at(60 * 24 * 3), NOW), "3 days ago");
  assert.equal(agoLabel(0, NOW), "", "a page with no timestamp says nothing rather than 'a long time ago'");
});

test("nameOfUser finds a name and is empty for a user who has left", () => {
  const users = [{ id: "u1", name: "Liam" }];
  assert.equal(nameOfUser("u1", users), "Liam");
  assert.equal(nameOfUser("gone", users), "");
});

test("the export names authors and editors, carries plain text and html, and sorts by title", () => {
  const users = [{ id: "u-liam", name: "Liam" }, { id: "u-pippa", name: "Pippa" }];
  const payload = exportPayload([HALL, KEY], { users, now: NOW });
  assert.equal(payload.kind, "bi-notebook");
  assert.equal(payload.version, 1);
  assert.deepEqual(payload.pages.map((page) => page.title), ["The drill hall", "Who has the key?"]);
  assert.equal(payload.pages[0].author, "Liam");
  assert.equal(payload.pages[0].text, "Big doors, one lamp.");
  assert.equal(payload.pages[0].html, "<p>Big doors, one lamp.</p>");
  assert.match(payload.exportedAt, /^\d{4}-\d\d-\d\dT/);
});

test("the export falls back to the raw id for an author who is no longer in the world", () => {
  const payload = exportPayload([HALL], { users: [], now: NOW });
  assert.equal(payload.pages[0].author, "u-liam");
});
