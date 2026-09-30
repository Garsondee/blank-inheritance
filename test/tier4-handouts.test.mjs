// Tier 4 — foundry/handouts.mjs against a mocked Foundry (test/support/
// mock-journal.mjs, each behaviour cited to the v14 source there).
//
// What this proves is OUR orchestration: that one press files a handout in the
// players' Papers AND opens it on their screens; that a private copy is opened
// only for its owner; that pressing twice changes nothing but the content; and
// that every way of backing out (a cancelled confirm, a malformed body, nobody
// to give it to) hands over nothing. It does not replace the live check in a
// real Foundry (design/testing-strategy.md §3).

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";

import { installJournalMock } from "./support/mock-journal.mjs";
import { deriveFoundryId } from "../module/blank-inheritance/scripts/core/ids.mjs";
import { OWNERSHIP } from "../module/blank-inheritance/scripts/core/handouts.mjs";
import { fileHandout, handoutStates } from "../module/blank-inheritance/scripts/foundry/handouts.mjs";

const USERS = [
  { id: "u1", name: "Pippa", active: true, character: { name: "Hanae Kesse" } },
  { id: "u2", name: "Craig", active: true, character: { name: "Ota Marle" } },
  { id: "u3", name: "Anne", active: false, character: null },
  { id: "gm", name: "Ingram", isGM: true, active: true }
];

const NOTE = { id: "gate-note", title: "A note", body: "<p>Meet at the gate.</p>" };
const LETTER = {
  id: "the-letter",
  title: "The letter",
  personal: true,
  body: '<div class="bi-paper"><p>Dear <typed field="character" fallback="Candidate" machine="admissions"/>,</p></div>'
};

function withMock(fn, options = {}) {
  return async () => {
    const mock = installJournalMock({ users: USERS, ...options });
    try {
      await fn(mock.world);
    } finally {
      mock.uninstall();
    }
  };
}

async function entryFor(world, handoutId) {
  return world.journal.get(await deriveFoundryId(`handout-${handoutId}`));
}

test("one press to the table: filed in a Papers folder, open to every player, shown to whoever is connected", withMock(async (world) => {
  assert.equal(await fileHandout(NOTE), true);

  const folders = world.folders.contents;
  assert.equal(folders.length, 1);
  assert.equal(folders[0].name, "Papers");
  assert.equal(folders[0].type, "JournalEntry");

  const entry = await entryFor(world, "gate-note");
  assert.ok(entry, "no journal entry was created");
  assert.equal(entry.folder?.id, folders[0].id, "the entry is not in the Papers folder");
  assert.equal(entry.ownership.default, OWNERSHIP.OBSERVER, "a table handout must stay readable by every player");
  assert.equal(entry.pages.size, 1);
  assert.equal(entry.pages.contents[0].text.content, "<p>Meet at the gate.</p>");

  assert.equal(world.shows.length, 1);
  assert.deepEqual(world.shows[0].users, ["u1", "u2"], "shown to an offline player, or to the GM as a player");
  assert.equal(world.confirms.length, 1, "a reveal must ask first (Law 17)");
}));

test("pressing it twice changes nothing but the showing: no second entry, page or folder", withMock(async (world) => {
  await fileHandout(NOTE);
  await fileHandout({ ...NOTE, body: "<p>Meet at the gate, at six.</p>" });

  assert.equal(world.folders.size, 1);
  assert.equal(world.journal.size, 1);
  const entry = await entryFor(world, "gate-note");
  assert.equal(entry.pages.size, 1, "a second press left a second page in their Papers");
  assert.equal(entry.pages.contents[0].text.content, "<p>Meet at the gate, at six.</p>", "an edited brief did not reach the page");
  assert.equal(world.shows.length, 2, "the second press did not show it again");
}));

test("a personal handout: a private page each, and each player is shown only their own", withMock(async (world) => {
  assert.equal(await fileHandout(LETTER), true);
  const entry = await entryFor(world, "the-letter");

  assert.equal(entry.ownership.default, OWNERSHIP.NONE, "personal copies opened the entry to the whole table");
  for (const id of ["u1", "u2", "u3"]) assert.equal(entry.ownership[id], OWNERSHIP.OBSERVER, `${id} cannot open their own letter`);
  assert.equal(entry.ownership.gm, undefined);

  const pages = entry.pages.contents;
  assert.equal(pages.length, 3, "Anne is offline but still gets her copy in her Papers");
  for (const page of pages) {
    const owners = Object.entries(page.ownership).filter(([k, v]) => k !== "default" && v >= OWNERSHIP.OBSERVER);
    assert.equal(owners.length, 1, `${page.name} is readable by more than one player`);
    assert.equal(page.ownership.default, OWNERSHIP.NONE, `${page.name} inherits, so everyone with the entry could read it`);
    assert.equal(page.title.show, false, "a paper document carries its own heading");
  }
  const pippa = pages.find((p) => p.ownership.u1);
  assert.match(pippa.text.content, /Hana<span class="bi-typed__fault bi-typed__fault--1">e<\/span> K/);

  assert.equal(world.shows.length, 2);
  for (const show of world.shows) {
    const page = entry.pages.get(show.pageId);
    assert.deepEqual(show.users, [Object.keys(page.ownership).find((k) => k !== "default")], "a copy was shown to someone other than its owner");
  }
}));

test("a solo reveal files for that player alone, and a later table reveal only ever widens it", withMock(async (world) => {
  await fileHandout(NOTE, { audience: ["u2"] });
  let entry = await entryFor(world, "gate-note");
  assert.equal(entry.ownership.default, OWNERSHIP.NONE, "a solo reveal opened the document to the table");
  assert.equal(entry.ownership.u2, OWNERSHIP.OBSERVER);
  assert.deepEqual(world.shows[0].users, ["u2"]);

  await fileHandout(NOTE);
  entry = await entryFor(world, "gate-note");
  assert.equal(entry.ownership.default, OWNERSHIP.OBSERVER);
  assert.equal(entry.ownership.u2, OWNERSHIP.OBSERVER, "the table reveal took the solo reader's access away");
}));

test("a cancelled confirm hands over nothing at all", withMock(async (world) => {
  assert.equal(await fileHandout(NOTE), false);
  assert.equal(world.journal.size, 0);
  assert.equal(world.folders.size, 0);
  assert.equal(world.shows.length, 0);
}, { confirm: false }));

test("a malformed body is an authoring error: nothing is filed, and the GM is told why", withMock(async (world) => {
  assert.equal(await fileHandout({ id: "broken", title: "Broken", body: "<typed>never closed" }), false);
  assert.equal(world.journal.size, 0);
  assert.equal(world.confirms.length, 0, "asked the GM to confirm something that could not be rendered");
  assert.ok(world.notifications.some((n) => n.level === "error" && /unprocessed <typed>/.test(n.msg)));
}));

test("with no player accounts there is nobody to hand it to, and it says so", async () => {
  const mock = installJournalMock({ users: [{ id: "gm", name: "Ingram", isGM: true }] });
  try {
    assert.equal(await fileHandout(NOTE), false);
    assert.equal(mock.world.journal.size, 0);
    assert.ok(mock.world.notifications.some((n) => n.level === "warn" && /NoPlayersToFile/.test(n.msg)));
  } finally {
    mock.uninstall();
  }
});

test("handoutStates reads what was filed back off the journal itself", withMock(async (world) => {
  let states = await handoutStates([NOTE, LETTER]);
  assert.equal(states["gate-note"].filed, false);
  await fileHandout(NOTE, { audience: ["u1"] });
  await fileHandout(LETTER);
  states = await handoutStates([NOTE, LETTER]);
  assert.deepEqual(states["gate-note"], { table: false, userIds: ["u1"], filed: true });
  assert.deepEqual(states["the-letter"], { table: false, userIds: ["u1", "u2", "u3"], filed: true });
}));

// Ingram's critical requirement, 2026-09-27 (design/scene-edits.md §7): what
// she rewrites is never overwritten by old content -- including a handout she
// edits directly in Papers. "Show again" used to rewrite it from the scene.
test("a page she edited in Papers is kept on the next press, not rewritten from the scene, and she is told", withMock(async (world) => {
  await fileHandout(NOTE);
  const entry = await entryFor(world, "gate-note");
  const page = entry.pages.contents[0];
  assert.ok(page.getFlag("blank-inheritance", "filedHash"), "a filed page remembers what it was given");

  page.text = { ...page.text, content: "<p>Meet at the gate. Bring the dog.</p>" }; // her edit, in Foundry
  const originalError = console.error;
  console.error = () => {}; // the copy for Claude cannot be filed in this mock (no storage/); that is reported, not fatal
  try {
    assert.equal(await fileHandout({ ...NOTE, body: "<p>An older line from the repo.</p>" }), true);
  } finally {
    console.error = originalError;
  }
  assert.equal(entry.pages.contents[0].text.content, "<p>Meet at the gate. Bring the dog.</p>");
  assert.ok(world.notifications.some((n) => /HandoutKept/.test(n.msg)), "the GM is told her version was kept");
  assert.equal(world.shows.length, 2, "it is still shown again");
}));

test("a page nobody edited is still rewritten from the scene on the next press", withMock(async (world) => {
  await fileHandout(NOTE);
  await fileHandout({ ...NOTE, body: "<p>The scene's newer line.</p>" });
  const entry = await entryFor(world, "gate-note");
  assert.equal(entry.pages.contents[0].text.content, "<p>The scene's newer line.</p>");
  assert.ok(!world.notifications.some((n) => /HandoutKept/.test(n.msg)));
}));
