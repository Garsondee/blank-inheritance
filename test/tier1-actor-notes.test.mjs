// Tier 1 — core/actor-notes.mjs and the Actor generator's use of it (D080, 2026-10-07): what an NPC's Actor sheet says.
//
// The old story prose (`description` on data/npcs/*.json) is retired; the sheet now carries a one-line blurb built from the
// role and affiliation, public notes that are that blurb and nothing else, and GM-only private notes generated from canon.
// Every fixture here is built inside the test: no story fact of the campaign is written into a test.
import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SETTLED_STATUSES, GENERATED_NOTE, escapeHtml, publicRole, affiliationLabel, npcBlurb,
  renderPrivateNotes, renderPublicNotes, sheetNotes
} from "../module/blank-inheritance/scripts/core/actor-notes.mjs";
import { buildNpcActorData } from "../module/blank-inheritance/scripts/core/generators/npc.mjs";
import { buildCombatStatblockSystemData } from "../module/blank-inheritance/scripts/core/generators/combat-statblock.mjs";

const settled = (over = {}) => ({ id: "a.one", text: "The warden counts the keys at dusk.", status: "decided", known: "some", told: "in:scene-x", toldAt: "Scene X", heldBack: false, ...over });
const open = (over = {}) => ({ id: "a.which", text: "Whether the warden kept a spare key is not decided.", candidates: ["she did", "she did not"], decideBy: "before the vault scene", ...over });

/** An entry with one of everything, for the tests that look at the whole rendering. */
const FULL = {
  blurb: "Warden, the North Gate (Directorate)",
  canon: "warden",
  settled: [
    settled(),
    settled({ id: "a.two", text: "She has never lost a key.", status: "provisional", known: "everyone", told: "start", toldAt: "the start" }),
    settled({ id: "a.three", text: "The spare key is in the bakery.", known: "nobody", told: "later", toldAt: "later", heldBack: true }),
    settled({ id: "a.four", text: "The gate is sold in Chapter 4.", status: "decided", known: "few", told: "in:chapter-04", toldAt: "Chapter 4", heldBack: true })
  ],
  open: [open(), open({ id: "a.b", text: "Her age is not decided.", candidates: [], decideBy: null })],
  sketched: 5
};

/* ------------------------------------------------------------------ */
/*  The blurb: a job title, never story                                */
/* ------------------------------------------------------------------ */

test("publicRole: the first sentence of the role, and nothing from a GM-ONLY marker on", () => {
  assert.equal(publicRole("A retired clerk in a tea house. The secret author of the pamphlets, and the villain."), "A retired clerk in a tea house");
  assert.equal(publicRole("Pilot-track student, a year ahead -- GM-ONLY: really a spy"), "Pilot-track student, a year ahead");
  assert.equal(publicRole("Pilot-track student, a year ahead (gm only: really a spy)"), "Pilot-track student, a year ahead");
  assert.equal(publicRole("Quartermaster — GM ONLY the stores are a front"), "Quartermaster", "a dash before the marker goes with it");
  assert.equal(publicRole("  Night   foreman,\n No. 1 Machine Shop  "), "Night foreman, No. 1 Machine Shop", "whitespace is collapsed and 'No.' is not a sentence end");
  assert.equal(publicRole("Mrs. Hale keeps the stall. She knows everything."), "Mrs. Hale keeps the stall", "an abbreviation is not a sentence end either");
  assert.equal(publicRole("Comms Officer — the voice on the radio"), "Comms Officer — the voice on the radio", "a dash is part of the title, not a marker");
  assert.equal(publicRole("Trainee a year ahead of the party, and the first to claim them"), "Trainee a year ahead of the party", "a second assertion after ', and' is the story, not the title");
  assert.equal(publicRole("Runs the stores, laughs at the docket, and sends them on to the tea house"), "Runs the stores, laughs at the docket");
  assert.equal(publicRole("Stagehand, doorman and lantern-keeper for the Company"), "Stagehand, doorman and lantern-keeper for the Company", "a list without ', and' is whole");
  assert.equal(publicRole(""), "");
  assert.equal(publicRole(null), "");
  assert.equal(publicRole(undefined), "");
});

test("affiliationLabel: a faction id as a label", () => {
  assert.equal(affiliationLabel("directorate"), "Directorate");
  assert.equal(affiliationLabel("night-watch"), "Night Watch");
  assert.equal(affiliationLabel(null), "");
  assert.equal(affiliationLabel(""), "");
});

test("npcBlurb: the role, then the faction unless the role already names it; nothing without a role", () => {
  assert.equal(npcBlurb({ role: "Quartermaster", affiliation: "directorate" }), "Quartermaster (Directorate)");
  assert.equal(npcBlurb({ role: "Chief Medical Officer, the Directorate", affiliation: "directorate" }), "Chief Medical Officer, the Directorate", "not said twice");
  assert.equal(npcBlurb({ role: "Keeper, the Lantern", affiliation: null }), "Keeper, the Lantern");
  assert.equal(npcBlurb({ id: "stage-figure", name: "A figure" }), "", "a basic figure with no role has no blurb");
  assert.equal(npcBlurb(null), "");
});

test("npcBlurb never carries a GM-only tail, whatever the role says after it", () => {
  const roles = ["Clerk -- GM-ONLY: the traitor", "Clerk. GM-ONLY: the traitor", "Clerk (GM-ONLY the traitor)", "Clerk; gm-only: the traitor"];
  for (const role of roles) assert.doesNotMatch(npcBlurb({ role, affiliation: "directorate" }), /gm.?only|traitor/i, role);
});

/* ------------------------------------------------------------------ */
/*  The public notes: the blurb, and never a fact                      */
/* ------------------------------------------------------------------ */

test("renderPublicNotes: the blurb as one escaped paragraph; nothing without one", () => {
  assert.equal(renderPublicNotes("Clerk (Directorate)"), "<p>Clerk (Directorate)</p>");
  assert.equal(renderPublicNotes("Tom & <Jerry>"), "<p>Tom &amp; &lt;Jerry&gt;</p>");
  assert.equal(renderPublicNotes(""), "");
  assert.equal(renderPublicNotes(null), "");
});

test("sheetNotes: the public notes are the blurb only -- no fact, id, candidate or deadline from the entry ever reaches them", () => {
  const { blurb, publicNotes, privateNotes } = sheetNotes({ id: "w", role: "ignored" }, FULL);
  assert.equal(blurb, FULL.blurb, "the entry's own blurb is used");
  assert.equal(publicNotes, `<p>${escapeHtml(FULL.blurb)}</p>`);
  const secrets = [...FULL.settled.map((f) => f.text), ...FULL.open.map((f) => f.text), ...FULL.settled.map((f) => f.id), "she did not", "before the vault scene"];
  for (const s of secrets) {
    assert.ok(!publicNotes.includes(escapeHtml(s)), `public notes must not carry: ${s}`);
    assert.ok(!blurb.includes(s), `the blurb must not carry: ${s}`);
  }
  // ...while the GM's notes carry all of it.
  for (const f of FULL.settled) assert.ok(privateNotes.includes(escapeHtml(f.text)), `private notes carry: ${f.text}`);
});

test("sheetNotes: with no entry the sheet carries its blurb only, built from the source (the file is missing, or does not list the person)", () => {
  const result = sheetNotes({ id: "w", role: "Warden, the North Gate", affiliation: "directorate" }, null);
  assert.deepEqual(result, { blurb: "Warden, the North Gate (Directorate)", publicNotes: "<p>Warden, the North Gate (Directorate)</p>", privateNotes: "" });
  assert.deepEqual(sheetNotes({ id: "bare" }), { blurb: "", publicNotes: "", privateNotes: "" });
  // An entry that names no blurb of its own (missing, or empty) falls back to the source's.
  assert.equal(sheetNotes({ id: "w", role: "Clerk" }, { settled: [] }).blurb, "Clerk");
  assert.equal(sheetNotes({ id: "w", role: "Clerk" }, { blurb: "  ", settled: [] }).blurb, "Clerk");
});

test("sheetNotes: a multi-line blurb in an entry is one line", () => {
  assert.equal(sheetNotes({ id: "w" }, { blurb: "One\n  two" }).blurb, "One two");
});

/* ------------------------------------------------------------------ */
/*  The private notes                                                  */
/* ------------------------------------------------------------------ */

test("renderPrivateNotes: what the table is told, what is held back, what is not decided yet, then the pencil count", () => {
  const html = renderPrivateNotes(FULL);
  const at = (needle) => html.indexOf(needle);
  assert.ok(at(GENERATED_NOTE) > -1 && at(GENERATED_NOTE) < at("<h3>"), "the generated-from-canon warning comes first");
  const order = ["<h3>What the table is told</h3>", "<h3>Held back (GM only)</h3>", "<h3>Not decided yet</h3>", "5 more facts are sketched in pencil"].map(at);
  assert.ok(order.every((i) => i > -1), "every part is there");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "in that order");
  // Told facts sit under the first heading, held-back ones under the second.
  const told = html.slice(at("<h3>What the table is told</h3>"), at("<h3>Held back (GM only)</h3>"));
  const held = html.slice(at("<h3>Held back (GM only)</h3>"), at("<h3>Not decided yet</h3>"));
  assert.match(told, /counts the keys/);
  assert.match(told, /never lost a key/);
  assert.doesNotMatch(told, /bakery|sold in Chapter 4/);
  assert.match(held, /bakery/);
  assert.match(held, /sold in Chapter 4/);
  assert.doesNotMatch(held, /counts the keys/);
});

test("renderPrivateNotes: each fact says who knows it and where the table hears it, and a provisional or proposed one says so", () => {
  const html = renderPrivateNotes(FULL);
  assert.match(html, /counts the keys at dusk\. <em>Known by some · told in Scene X<\/em>/);
  assert.match(html, /never lost a key\. <em>Known by everyone · told from the start · provisional<\/em>/);
  assert.match(html, /<em>Known by nobody · told later<\/em>/);
  assert.match(html, /<em>Known by few · told in Chapter 4<\/em>/);
  const proposed = renderPrivateNotes({ settled: [settled({ status: "proposal" })] });
  assert.match(proposed, /· proposed<\/em>/);
  const decided = renderPrivateNotes({ settled: [settled({ status: "accepted" })] });
  assert.doesNotMatch(decided, /provisional|proposed/, "an accepted or decided fact carries no tag");
});

test("renderPrivateNotes: an open decision is flagged, with its candidates and its deadline when it has them", () => {
  const html = renderPrivateNotes({ open: [open(), open({ text: "Bare question.", candidates: [], decideBy: null })] });
  assert.match(html, /<h3>Not decided yet<\/h3>/);
  assert.match(html, /<li>Whether the warden kept a spare key is not decided\. <em>Candidates: she did \| she did not\. Decide by: before the vault scene\.<\/em><\/li>/);
  assert.match(html, /<li>Bare question\.<\/li>/, "no candidates and no deadline: no empty annotation");
});

test("renderPrivateNotes: a belief says whose it is and whether it is true", () => {
  const html = renderPrivateNotes({ settled: [settled({ heldBy: "the town", true: "no" })] });
  assert.match(html, /<em>Belief of the town, true: no · Known by some/);
});

test("renderPrivateNotes: the pencil count is singular or plural, and a person with only pencil still gets the count", () => {
  assert.match(renderPrivateNotes({ sketched: 1 }), /1 more fact is sketched in pencil on the plot timeline and is not shown here until it is inked\./);
  assert.match(renderPrivateNotes({ sketched: 2 }), /2 more facts are sketched in pencil on the plot timeline and are not shown here until they are inked\./);
  assert.doesNotMatch(renderPrivateNotes({ settled: [settled()], sketched: 0 }), /pencil/);
});

test("renderPrivateNotes: nothing to say is no notes at all", () => {
  assert.equal(renderPrivateNotes(null), "");
  assert.equal(renderPrivateNotes({}), "");
  assert.equal(renderPrivateNotes({ settled: [], open: [], sketched: 0 }), "");
  assert.equal(renderPrivateNotes({ blurb: "Only a blurb" }), "");
});

test("renderPrivateNotes: every word from canon is escaped, and only the tags Foundry's server keeps are written", () => {
  const html = renderPrivateNotes({
    settled: [settled({ text: `He said "5 < 6 & <b>bold</b>"` })],
    open: [open({ text: "<script>alert(1)</script>", candidates: ["a & b"], decideBy: "<soon>" })],
    sketched: 3
  });
  assert.doesNotMatch(html, /<script|<b>|<soon>/);
  assert.match(html, /5 &lt; 6 &amp; &lt;b&gt;bold&lt;\/b&gt;/);
  const tags = new Set([...renderPrivateNotes(FULL).matchAll(/<\/?([a-z0-9]+)/g)].map((m) => m[1]));
  assert.deepEqual([...tags].sort(), ["em", "h3", "li", "p", "ul"]);
});

test("the statuses an Actor sheet shows are exactly the settled ones: never pencil, never cut, never open", () => {
  assert.deepEqual([...SETTLED_STATUSES].sort(), ["accepted", "decided", "proposal", "provisional"]);
  for (const status of ["sketch", "cut", "open"]) assert.ok(!SETTLED_STATUSES.includes(status), status);
});

/* ------------------------------------------------------------------ */
/*  The generator                                                      */
/* ------------------------------------------------------------------ */

const STATBLOCK = {
  level: 2, ac: 15, traits: ["humanoid"], size: "medium",
  abilityModifiers: { str: 1, dex: 2, con: 1, int: 0, wis: 2, cha: 3 },
  hitPoints: { max: 30, current: 30 },
  strikes: [{ name: "Baton", strikeType: "melee", attackBonus: 8, traits: [], damage: [{ dice: "1d6", bonus: 2, damageType: "bludgeoning" }] }]
};

test("buildNpcActorData: a statblock-less NPC gets its blurb, public notes and private notes from the entry", async () => {
  const data = await buildNpcActorData({ id: "w", name: "W", role: "ignored", description: "Old prose." }, { notes: FULL });
  assert.equal(data.system.details.blurb, FULL.blurb);
  assert.equal(data.system.details.publicNotes, `<p>${escapeHtml(FULL.blurb)}</p>`);
  assert.equal(data.system.details.privateNotes, renderPrivateNotes(FULL));
  assert.doesNotMatch(JSON.stringify(data), /Old prose/, "the retired description never reaches the Actor");
});

test("buildNpcActorData: a statblock NPC gets the same notes, and its statblock mapping does not change", async () => {
  const data = await buildNpcActorData({ id: "w", name: "W", role: "ignored", statblock: STATBLOCK }, { notes: FULL });
  assert.equal(data.system.details.blurb, FULL.blurb);
  assert.equal(data.system.details.publicNotes, `<p>${escapeHtml(FULL.blurb)}</p>`);
  assert.equal(data.system.details.privateNotes, renderPrivateNotes(FULL));
  const bare = buildCombatStatblockSystemData(STATBLOCK);
  const withoutNotes = ({ blurb, publicNotes, privateNotes, ...rest }) => rest;
  const withoutDetails = ({ details, ...rest }) => rest;
  assert.deepEqual(withoutNotes(data.system.details), withoutNotes(bare.system.details), "level and the rest of details are the statblock mapping's own");
  assert.deepEqual(withoutDetails(data.system), withoutDetails(bare.system), "everything outside details is exactly what buildCombatStatblockSystemData made");
  assert.deepEqual(data.items, bare.items);
});

test("buildNpcActorData: no entry (the generated file is missing) leaves the blurb and public notes built from the source, and no private notes", async () => {
  for (const statblock of [undefined, STATBLOCK]) {
    const data = await buildNpcActorData({ id: "w", name: "W", role: "Warden, the North Gate", affiliation: "directorate", statblock });
    assert.equal(data.system.details.blurb, "Warden, the North Gate (Directorate)");
    assert.equal(data.system.details.publicNotes, "<p>Warden, the North Gate (Directorate)</p>");
    assert.equal("privateNotes" in data.system.details, false, "an Actor canon has nothing to say about keeps exactly the fields the statblock mapping gave it");
  }
});

test("buildNpcActorData: a basic figure with no role (a stage card with no NPC file) keeps empty notes, as before", async () => {
  const data = await buildNpcActorData({ id: "figure", name: "A figure" });
  assert.equal(data.system.details.blurb, "");
  assert.equal(data.system.details.publicNotes, "");
  assert.equal("privateNotes" in data.system.details, false);
});

test("buildNpcActorData: a statblock's own flavorText and notes, if anyone authors them, win over the generated blurb and public notes", async () => {
  const data = await buildNpcActorData(
    { id: "w", name: "W", role: "Clerk", statblock: { ...STATBLOCK, flavorText: "Read this aloud.", notes: "<p>Authored for the sheet.</p>" } },
    { notes: FULL }
  );
  assert.equal(data.system.details.blurb, "Read this aloud.");
  assert.equal(data.system.details.publicNotes, "<p>Authored for the sheet.</p>");
  assert.equal(data.system.details.privateNotes, renderPrivateNotes(FULL), "the private notes are still the generated ones");
});

test("buildNpcActorData: public notes never carry a fact, whatever the entry holds (statblock and statblock-less)", async () => {
  for (const statblock of [undefined, STATBLOCK]) {
    const data = await buildNpcActorData({ id: "w", name: "W", statblock }, { notes: FULL });
    const pub = data.system.details.publicNotes;
    for (const f of [...FULL.settled, ...FULL.open]) assert.ok(!pub.includes(escapeHtml(f.text)), f.text);
  }
});
