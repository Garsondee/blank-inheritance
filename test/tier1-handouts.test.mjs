// Tier 1 — handouts: the renderer and the filing plan (core/handouts.mjs).
//
// The load-bearing tests here are the ones about what reaches a player: no
// campaign tag may survive into a page (Foundry's sanitiser would strip the
// tag and publish its contents bare), a private copy is readable by its
// owner alone, and filing never takes a document away from anyone.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  OWNERSHIP,
  PAPERS_FOLDER,
  FAULT_VARIANTS,
  TYPEWRITERS,
  filedAudience,
  handoutEntrySeed,
  handoutPageSeed,
  hasOwnHeading,
  mergeOwnership,
  planHandout,
  renderHandoutBody
} from "../module/blank-inheritance/scripts/core/handouts.mjs";

/** The nth damaged strike of a letter in one document (cuts rotate 1..FAULT_VARIANTS). */
const FAULT = (n, ch = "e") => `<span class="bi-typed__fault bi-typed__fault--${((n - 1) % FAULT_VARIANTS) + 1}">${ch}</span>`;

/* ---------------------------------------------------------------- */
/*  The typed layer                                                  */
/* ---------------------------------------------------------------- */

test("a <typed> block becomes a plain span, with no campaign tag left in the output", () => {
  const html = renderHandoutBody("<p>Report <typed>Monday next</typed>.</p>");
  assert.equal(html, '<p>Report <span class="bi-typed">Monday next</span>.</p>');
  assert.doesNotMatch(html, /<\/?typed\b/);
});

test("a machine with a fault strikes that letter low on every typed word, and only there", () => {
  const html = renderHandoutBody('<p>The letter. <typed machine="admissions">Monday next, see</typed></p>');
  // Printed text keeps its e's; only typed text carries the machine's fault.
  assert.match(html, /^<p>The letter\. /);
  assert.equal((html.match(/bi-typed__fault--/g) ?? []).length, 3, "next, see: three lower-case e's");
  assert.match(html, /data-machine="admissions"/);
  assert.ok(html.includes(`n${FAULT(1)}xt`));
});

test("the fault is the lower-case letter only: a capital E types cleanly", () => {
  const html = renderHandoutBody('<typed machine="admissions">EAST end</typed>');
  assert.ok(html.includes(">EAST ") && html.includes(`${FAULT(1)}nd`));
  assert.equal((html.match(/bi-typed__fault--/g) ?? []).length, 1);
});

test("an entity is struck whole, never split by the fault letter", () => {
  const html = renderHandoutBody('<typed machine="admissions">caf&eacute; &amp; tea</typed>');
  assert.ok(html.includes("&eacute;"), "the entity was broken apart");
  assert.ok(html.includes("&amp;"));
  assert.ok(html.includes(`t${FAULT(1)}a`));
});

test("every typewriter the registry lists names its broken letters as lower-case letters the damaged fonts carry", () => {
  for (const [name, machine] of Object.entries(TYPEWRITERS)) {
    assert.match(machine.faults, /^[a-z]+$/, name);
  }
});

test("a broken letter rotates through the damaged cuts, across the whole document, so no two neighbours match", () => {
  const html = renderHandoutBody('<typed machine="admissions">eee</typed> <typed machine="admissions">e</typed>');
  const cuts = [...html.matchAll(/bi-typed__fault--(\d)/g)].map((m) => Number(m[1]));
  assert.deepEqual(cuts, [1, 2, 3, 1].map((n) => ((n - 1) % FAULT_VARIANTS) + 1));
});

test("a <typed field> gap takes the reader's own value, typed on the named machine", () => {
  const html = renderHandoutBody('<p>Dear <typed field="character" fallback="Candidate" machine="admissions"/>,</p>', {
    fields: { character: "Hanae Kesse" }
  });
  assert.equal(html, `<p>Dear <span class="bi-typed" data-machine="admissions">Hana${FAULT(1)} K${FAULT(2)}ss${FAULT(3)}</span>,</p>`);
});

test("an empty or missing value falls back, and a missing fallback is a hard error rather than a blank gap", () => {
  const body = '<typed field="character" fallback="Candidate"/>';
  assert.equal(renderHandoutBody(body), '<span class="bi-typed">Candidate</span>');
  assert.equal(renderHandoutBody(body, { fields: { character: "   " } }), '<span class="bi-typed">Candidate</span>');
  assert.throws(() => renderHandoutBody('<typed field="character"/>'), /no value for this reader and no fallback/);
});

test("a player-supplied name is escaped, so a character called <b> is printed, not parsed", () => {
  const html = renderHandoutBody('<typed field="character" fallback="x"/>', { fields: { character: '<img src=x onerror="boom">' } });
  assert.doesNotMatch(html, /<img/);
  assert.ok(html.includes("&lt;img"));
});

test("malformed markup is a hard error, never a best guess", () => {
  assert.throws(() => renderHandoutBody("<typed>unclosed"), /unprocessed <typed>/);
  assert.throws(() => renderHandoutBody("<typed><b>bold</b></typed>"), /plain text/);
  assert.throws(() => renderHandoutBody('<typed feild="character"/>'), /unknown attribute "feild"/);
  assert.throws(() => renderHandoutBody('<typed machine="records">x</typed>'), /typewriter "records"/);
  assert.throws(() => renderHandoutBody('<typed field="address" fallback="x"/>'), /not a known field/);
  assert.throws(() => renderHandoutBody('<typed field="character" fallback="x">x</typed>'), /self-closing/);
  assert.throws(() => renderHandoutBody("<typed/>"), /no field/);
});

test("redactions in a handout go through the real pipeline, and the reader's clearance defaults to 0", () => {
  const body = '<p>Filed by <redact c="2">the night registrar</redact>.</p>';
  const closed = renderHandoutBody(body);
  assert.ok(!closed.includes("night registrar"), "a redacted phrase reached a clearance-0 page");
  assert.match(closed, /bi-redacted/);
  assert.ok(renderHandoutBody(body, { clearance: 2 }).includes("the night registrar"));
});

test("hasOwnHeading: a PAPER document carries its own heading; a plain note does not", () => {
  assert.equal(hasOwnHeading('<div class="bi-paper bi-paper--letter">…</div>'), true);
  assert.equal(hasOwnHeading('<div class="x bi-paper">…</div>'), true);
  assert.equal(hasOwnHeading('<div class="bi-paper__slip">…</div>'), false);
  assert.equal(hasOwnHeading("<p>A note.</p>"), false);
});

/* ---------------------------------------------------------------- */
/*  The filing plan                                                  */
/* ---------------------------------------------------------------- */

const PLAYERS = [
  { id: "u1", name: "Pippa", characterName: "Hanae Kesse", active: true },
  { id: "u2", name: "Craig", characterName: "Ota Marle", active: true },
  { id: "u3", name: "Anne", characterName: null, active: false }
];

const NOTE = { id: "a-note", title: "A note", body: "<p>Meet at the gate.</p>" };
const LETTER = {
  id: "a-letter",
  title: "The letter",
  personal: true,
  body: '<div class="bi-paper"><p>Dear <typed field="character" fallback="Candidate" machine="admissions"/>,</p></div>'
};

test("seeds: the entry keeps the seed the runner always used, so an earlier build's entry is reused, not duplicated", () => {
  assert.equal(handoutEntrySeed("a-note"), "handout-a-note");
  assert.equal(handoutPageSeed("a-note", "shared"), "handout-a-note-page-shared");
  assert.equal(PAPERS_FOLDER.name, "Papers");
});

test("a shared handout to the table: one page, open to every player, shown to whoever is connected", () => {
  const plan = planHandout(NOTE, { audience: "table", players: PLAYERS });
  assert.deepEqual(plan.recipients, ["u1", "u2", "u3"]);
  assert.deepEqual(plan.entry.grants, { default: OWNERSHIP.OBSERVER });
  assert.equal(plan.pages.length, 1);
  assert.equal(plan.pages[0].ownership, null, "a shared page inherits from its entry");
  assert.equal(plan.pages[0].showTitle, true, "a plain note keeps Foundry's page title");
  assert.deepEqual(plan.show, [{ pageKey: "shared", userIds: ["u1", "u2"] }], "Anne is offline: filed, not shown");
});

test("a shared handout to one player is filed for that player alone", () => {
  const plan = planHandout(NOTE, { audience: ["u2"], players: PLAYERS });
  assert.deepEqual(plan.recipients, ["u2"]);
  assert.deepEqual(plan.entry.grants, { u2: OWNERSHIP.OBSERVER });
  assert.equal(plan.entry.grants.default, undefined, "a solo reveal must never open the entry to the table");
  assert.deepEqual(plan.show, [{ pageKey: "shared", userIds: ["u2"] }]);
});

test("a personal handout: one private page each, with the reader's own name typed into the gap", () => {
  const plan = planHandout(LETTER, { audience: "table", players: PLAYERS });
  assert.equal(plan.pages.length, 3);
  const [pippa, craig, anne] = plan.pages;

  assert.deepEqual(pippa.ownership, { default: OWNERSHIP.NONE, u1: OWNERSHIP.OBSERVER });
  assert.deepEqual(craig.ownership, { default: OWNERSHIP.NONE, u2: OWNERSHIP.OBSERVER });
  // "Ota Marl", not "Marle": the admissions machine strikes that e low, so it
  // is split off into its own span in the typed output.
  assert.ok(!pippa.content.includes("Ota Marl") && craig.content.includes("Ota Marl"), "a copy carried another reader's name");
  assert.ok(anne.content.includes(`Candidat${FAULT(1)}`), "a player with no character yet gets the fallback");
  assert.equal(anne.name, "The letter — Anne");
  assert.equal(pippa.name, "The letter — Hanae Kesse");
  assert.equal(pippa.showTitle, false, "a PAPER document carries its own heading");

  assert.deepEqual(plan.entry.grants, { u1: OWNERSHIP.OBSERVER, u2: OWNERSHIP.OBSERVER, u3: OWNERSHIP.OBSERVER });
  assert.equal(plan.entry.grants.default, undefined, "personal copies open the entry per reader, never to the table");
  assert.deepEqual(plan.show, [
    { pageKey: "u1", userIds: ["u1"] },
    { pageKey: "u2", userIds: ["u2"] }
  ]);
});

test("a personal handout shown to one player makes only that player's copy", () => {
  const plan = planHandout(LETTER, { audience: ["u1"], players: PLAYERS });
  assert.deepEqual(plan.pages.map((p) => p.key), ["u1"]);
  assert.deepEqual(plan.show, [{ pageKey: "u1", userIds: ["u1"] }]);
});

test("an image handout is filed as an image page, not shared and forgotten", () => {
  const plan = planHandout({ id: "board", title: "The board", imagePath: "modules/x/board.webp" }, { players: PLAYERS });
  assert.equal(plan.pages[0].type, "image");
  assert.equal(plan.pages[0].src, "modules/x/board.webp");
  assert.equal(plan.pages[0].content, null);
});

test("an audience naming nobody real files for nobody, and says so", () => {
  const plan = planHandout(NOTE, { audience: ["gm-id"], players: PLAYERS });
  assert.deepEqual(plan.recipients, []);
  assert.deepEqual(plan.show, []);
});

test("mergeOwnership only ever adds readers, and never lowers anyone", () => {
  const current = { default: OWNERSHIP.OBSERVER, u1: OWNERSHIP.OWNER };
  assert.deepEqual(mergeOwnership(current, { u2: OWNERSHIP.OBSERVER }), { default: OWNERSHIP.OBSERVER, u1: OWNERSHIP.OWNER, u2: OWNERSHIP.OBSERVER });
  assert.deepEqual(mergeOwnership(current, { default: OWNERSHIP.NONE, u1: OWNERSHIP.OBSERVER }), current, "a later, narrower reveal lowered someone");
  assert.deepEqual(mergeOwnership({ default: OWNERSHIP.INHERIT }, { default: OWNERSHIP.NONE }), { default: OWNERSHIP.NONE }, "INHERIT is replaced, not max()ed");
});

test("filedAudience reads the entry's own ownership back, so the panel cannot disagree with the journal", () => {
  assert.deepEqual(filedAudience({ default: OWNERSHIP.NONE }, ["u1", "u2"]), { table: false, userIds: [], filed: false });
  assert.deepEqual(filedAudience({ default: OWNERSHIP.OBSERVER }, ["u1", "u2"]), { table: true, userIds: ["u1", "u2"], filed: true });
  assert.deepEqual(filedAudience({ default: OWNERSHIP.NONE, u2: OWNERSHIP.OBSERVER }, ["u1", "u2"]), { table: false, userIds: ["u2"], filed: true });
});
