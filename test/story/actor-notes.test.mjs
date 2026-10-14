// The generated Actor notes (tools/story/actor-notes.mjs; D080, 2026-10-07): data/campaign/actor-notes.json, what each NPC's Actor
// sheet shows, built by `story build` from canon/world/ and the NPC files, and checked for staleness by `story check`.
//
// Two layers, as in test/canon.test.mjs: the builder is proven on small synthetic canons built inside the test (so no story fact
// of the campaign is written into a test), then the real tree is held to the rules that have to stay true of it.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadModel, checkModel, ROOT } from "../../tools/story/lib.mjs";
import { actorNotes, actorNotesFile, entryFor, inStem, loadNpcSources, parseCanonRef } from "../../tools/story/actor-notes.mjs";
import { npcBlurb, SETTLED_STATUSES } from "../../module/blank-inheritance/scripts/core/actor-notes.mjs";

const fact = (id, status, over = {}) => ({
  id, entity: id.split(".")[0], text: `Text of ${id}.`, status, by: status === "sketch" ? "claude" : null,
  source: ["D001"], known: "some", told: "later", heldBy: null, isTrue: null, truth: null, candidates: [], decideBy: null, ...over
});
const entity = (id, facts, over = {}) => ({ id, title: `Title of ${id}`, kind: "person", facts, notes: {}, ...over });
const model = (world, extra = {}) => ({
  world,
  plan: [
    { scene: "scene-a", title: "Scene A" }, { scene: "scene-b", title: "Scene B" }, { scene: "scene-c", title: "Scene C" }
  ],
  chapters: [{ n: 2, id: "chapter-02", beats: [{ id: "beat--two" }] }, { n: 3, id: "chapter-03", beats: [{ id: "beat--three" }] }],
  problems: [],
  ...extra
});
const npc = (id, over = {}) => ({ id, role: "Warden, the North Gate", affiliation: "directorate", canon: null, ...over });

/* ------------------------------------------------------------------ */
/*  The split: settled, open, pencil, cut                              */
/* ------------------------------------------------------------------ */

test("a person's facts split into settled, open and a pencil count; a cut fact is neither shown nor counted", () => {
  const m = model([entity("warden", [
    fact("warden.decided", "decided"), fact("warden.accepted", "accepted"), fact("warden.provisional", "provisional"), fact("warden.proposal", "proposal"),
    fact("warden.open", "open", { candidates: ["yes", "no"], decideBy: "before Chapter 3" }),
    fact("warden.pencil-one", "sketch"), fact("warden.pencil-two", "sketch"),
    fact("warden.cut", "cut")
  ])]);
  const { npcs, problems } = actorNotes(m, [npc("w", { canon: "warden" })]);
  assert.deepEqual(problems, []);
  const e = npcs.w;
  assert.deepEqual(e.settled.map((f) => f.id).sort(), ["warden.accepted", "warden.decided", "warden.proposal", "warden.provisional"]);
  assert.deepEqual(e.open, [{ id: "warden.open", text: "Text of warden.open.", candidates: ["yes", "no"], decideBy: "before Chapter 3" }]);
  assert.equal(e.sketched, 2, "two pencil facts counted, not listed");
  assert.equal(e.canon, "warden");
  assert.equal(e.blurb, "Warden, the North Gate (Directorate)");
});

test("pencil and cut wording never reaches the output", () => {
  const m = model([entity("warden", [
    fact("warden.ink", "decided", { text: "The visible fact." }),
    fact("warden.pencil", "sketch", { text: "Pencil wording nobody may cite." }),
    fact("warden.cut", "cut", { text: "Cut wording that must not come back." })
  ])]);
  const out = actorNotesFile(m, [npc("w", { canon: "warden" })]);
  assert.match(out, /The visible fact\./);
  assert.doesNotMatch(out, /Pencil wording|Cut wording|warden\.pencil|warden\.cut/);
});

test("the statuses the builder shows are exactly the module's settled statuses", () => {
  const m = model([entity("warden", ["decided", "accepted", "provisional", "proposal", "open", "sketch", "cut"].map((s) => fact(`warden.${s}`, s)))]);
  const e = actorNotes(m, [npc("w", { canon: "warden" })]).npcs.w;
  assert.deepEqual(e.settled.map((f) => f.status).sort(), [...SETTLED_STATUSES].sort());
});

test("a settled fact carries its words, who knows it, and when the table is told; a belief carries whose it is and whether it is true", () => {
  const m = model([entity("warden", [
    fact("warden.belief", "decided", { known: "everyone", told: "start", heldBy: "the town", isTrue: "no" }),
    fact("warden.plain", "decided", { known: "few", told: "in:scene-b" })
  ])]);
  const [belief, plain] = actorNotes(m, [npc("w", { canon: "warden" })]).npcs.w.settled;
  assert.deepEqual(belief, { id: "warden.belief", text: "Text of warden.belief.", status: "decided", known: "everyone", told: "start", toldAt: "the start", heldBack: false, heldBy: "the town", true: "no" });
  assert.deepEqual(plain, { id: "warden.plain", text: "Text of warden.plain.", status: "decided", known: "few", told: "in:scene-b", toldAt: "Scene B", heldBack: false });
});

/* ------------------------------------------------------------------ */
/*  Where the table hears it                                           */
/* ------------------------------------------------------------------ */

test("what the table is told is the start or a scene of the plan; a later chapter, a beat, or later is held back", () => {
  const m = model([entity("warden", [
    fact("warden.later", "decided", { told: "later" }),
    fact("warden.chapter", "decided", { told: "in:chapter-03" }),
    fact("warden.beat", "decided", { told: "in:beat--two" }),
    fact("warden.scene", "decided", { told: "in:scene-c" }),
    fact("warden.start", "decided", { told: "start" })
  ])]);
  const byId = Object.fromEntries(actorNotes(m, [npc("w", { canon: "warden" })]).npcs.w.settled.map((f) => [f.id, f]));
  assert.equal(byId["warden.start"].heldBack, false);
  assert.equal(byId["warden.scene"].heldBack, false);
  assert.equal(byId["warden.chapter"].heldBack, true);
  assert.equal(byId["warden.beat"].heldBack, true);
  assert.equal(byId["warden.later"].heldBack, true);
  assert.deepEqual(
    ["warden.start", "warden.scene", "warden.chapter", "warden.beat", "warden.later"].map((id) => byId[id].toldAt),
    ["the start", "Scene C", "Chapter 3", "Chapter 2", "later"]
  );
});

test("settled facts come in the order the table meets them; facts told at the same place keep canon's own order", () => {
  const m = model([entity("warden", [
    fact("warden.l1", "decided", { told: "later" }),
    fact("warden.c", "decided", { told: "in:scene-c" }),
    fact("warden.a2", "decided", { told: "in:scene-a" }),
    fact("warden.s", "decided", { told: "start" }),
    fact("warden.a1", "decided", { told: "in:scene-a" }),
    fact("warden.ch2", "decided", { told: "in:chapter-02" }),
    fact("warden.l0", "decided", { told: "later" })
  ])]);
  assert.deepEqual(actorNotes(m, [npc("w", { canon: "warden" })]).npcs.w.settled.map((f) => f.id), ["warden.s", "warden.a2", "warden.a1", "warden.c", "warden.ch2", "warden.l1", "warden.l0"]);
});

/* ------------------------------------------------------------------ */
/*  Which canon entity is a person                                     */
/* ------------------------------------------------------------------ */

test("a person inside a group entity is entity.slug: the facts whose slug is the stem or starts with it and a hyphen", () => {
  assert.deepEqual(parseCanonRef("night-regulars.ren"), { entity: "night-regulars", stem: "ren" });
  assert.deepEqual(parseCanonRef("manako"), { entity: "manako", stem: null });
  assert.equal(parseCanonRef("Not An Id"), null);
  assert.equal(parseCanonRef(7), null);
  assert.ok(inStem("g.ren", "g", "ren") && inStem("g.ren-his-call", "g", "ren"));
  assert.ok(!inStem("g.renard", "g", "ren"), "a longer name is not the same person");
  const m = model([entity("g", [
    fact("g.ren", "decided"), fact("g.ren-his-call", "sketch"), fact("g.renard", "decided"), fact("g.other", "open")
  ], { kind: "group" })]);
  const { npcs } = actorNotes(m, [npc("ren", { canon: "g.ren" }), npc("renard", { canon: "g.renard" })]);
  assert.deepEqual(npcs.ren.settled.map((f) => f.id), ["g.ren"]);
  assert.equal(npcs.ren.sketched, 1);
  assert.deepEqual(npcs.ren.open, [], "another person's open decision is not theirs");
  assert.deepEqual(npcs.renard.settled.map((f) => f.id), ["g.renard"]);
  assert.equal(npcs.renard.sketched, 0);
});

test("a person with no canon entity gets the blurb alone", () => {
  const m = model([entity("warden", [fact("warden.x", "decided")])]);
  const { npcs } = actorNotes(m, [npc("a"), npc("b", { canon: null }), npc("c", { canon: undefined })]);
  for (const id of ["a", "b", "c"]) assert.deepEqual(npcs[id], { blurb: "Warden, the North Gate (Directorate)" }, id);
});

test("an NPC whose canon names nothing is an error and falls back to the blurb; a stem that matches no fact is a note", () => {
  const m = model([entity("warden", [fact("warden.x", "decided")], { kind: "group" })]);
  const out = actorNotes(m, [npc("a", { canon: "nobody-here" }), npc("b", { canon: 42 }), npc("c", { canon: "warden.nobody" })]);
  assert.deepEqual(out.npcs.a, { blurb: "Warden, the North Gate (Directorate)" });
  assert.deepEqual(out.npcs.b, { blurb: "Warden, the North Gate (Directorate)" });
  const by = (id) => out.problems.find((p) => p.where === `npcs/${id}.json`);
  assert.equal(by("a").level, "error");
  assert.match(by("a").message, /nobody-here, which is not a canon entity/);
  assert.equal(by("b").level, "error");
  assert.match(by("b").message, /canon must be a canon entity id/);
  assert.equal(by("c").level, "warn");
  assert.deepEqual(out.npcs.c.settled, []);
});

test("the blurb is built from the NPC's own role and affiliation and never carries a GM-only tail", () => {
  const m = model([]);
  const { npcs } = actorNotes(m, [npc("a", { role: "Student -- GM-ONLY: really the founder", affiliation: null }), npc("b", { role: null })]);
  assert.equal(npcs.a.blurb, "Student");
  assert.equal(npcs.b.blurb, "");
  assert.equal(npcs.a.blurb, npcBlurb({ role: "Student -- GM-ONLY: really the founder" }));
});

/* ------------------------------------------------------------------ */
/*  The file                                                           */
/* ------------------------------------------------------------------ */

test("the file is sorted by NPC id, ends in a newline, names its schema, and is the same every time", () => {
  const m = model([entity("warden", [fact("warden.x", "decided")])]);
  const list = [npc("zed", { canon: "warden" }), npc("amy"), npc("kit", { canon: "warden" })];
  const text = actorNotesFile(m, list);
  assert.ok(text.endsWith("\n"));
  const doc = JSON.parse(text);
  assert.equal(doc.$schema, "../schema/actor-notes.schema.json");
  assert.match(doc.$comment, /GENERATED by `node tools\/story\/story\.mjs build`/);
  assert.deepEqual(Object.keys(doc.npcs), ["amy", "kit", "zed"]);
  assert.equal(actorNotesFile(m, [...list].reverse()), text, "the order the NPCs are given in does not matter");
});

test("problems found building the file are put on the model, where story check reports them", () => {
  const m = model([]);
  actorNotesFile(m, [npc("a", { canon: "nobody-here" })]);
  assert.equal(m.problems.length, 1);
  assert.equal(m.problems[0].level, "error");
});

test("loadNpcSources reads data/npcs and reports a file that is not JSON instead of throwing", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "actor-notes-"));
  try {
    assert.deepEqual(loadNpcSources(root), [], "no data/npcs: no people, no error");
    fs.mkdirSync(path.join(root, "data", "npcs"), { recursive: true });
    fs.writeFileSync(path.join(root, "data", "npcs", "good.json"), JSON.stringify({ id: "good", role: "Clerk", affiliation: "directorate", canon: "warden", description: "ignored" }));
    fs.writeFileSync(path.join(root, "data", "npcs", "bad.json"), "{ not json");
    const m = { problems: [] };
    assert.deepEqual(loadNpcSources(root, m), [{ id: "good", role: "Clerk", affiliation: "directorate", canon: "warden" }]);
    assert.equal(m.problems.length, 1);
    assert.equal(m.problems[0].where, "npcs/bad.json");
    assert.match(m.problems[0].message, /not valid JSON/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("actorNotesFile given a root reads that root's data/npcs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "actor-notes-"));
  try {
    fs.mkdirSync(path.join(root, "data", "npcs"), { recursive: true });
    fs.writeFileSync(path.join(root, "data", "npcs", "w.json"), JSON.stringify({ id: "w", role: "Warden", affiliation: null, canon: "warden" }));
    const m = model([entity("warden", [fact("warden.x", "decided")])]);
    const doc = JSON.parse(actorNotesFile(m, root));
    assert.equal(doc.npcs.w.settled[0].id, "warden.x");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ */
/*  The real tree                                                      */
/* ------------------------------------------------------------------ */

const npcDir = path.join(ROOT, "data", "npcs");
const npcFiles = fs.readdirSync(npcDir).filter((f) => f.endsWith(".json")).sort();
const realNpcs = npcFiles.map((f) => ({ file: f, json: JSON.parse(fs.readFileSync(path.join(npcDir, f), "utf8")) }));

test("REAL DATA: actor-notes.json is exactly what story build makes from canon, and checkModel owns it (a stale copy fails story check)", () => {
  const real = loadModel();
  const built = real.built["data/campaign/actor-notes.json"];
  assert.ok(built, "lib.mjs wires data/campaign/actor-notes.json as a built copy");
  assert.equal(built.copy?.replace(/\r\n/g, "\n"), built.source, "run: node tools/story/story.mjs build");
  // checkModel compares every built copy: make this one stale and it must say so.
  const stale = { ...real, built: { ...real.built, "data/campaign/actor-notes.json": { source: built.source, copy: built.source.replace('"npcs"', '"npcs-stale"') } } };
  assert.ok(checkModel(stale).some((p) => p.level === "error" && p.where === "data/campaign/actor-notes.json" && /differs from its canon source/.test(p.message)));
  const missing = { ...real, built: { ...real.built, "data/campaign/actor-notes.json": { source: built.source, copy: null } } };
  assert.ok(checkModel(missing).some((p) => p.level === "error" && p.where === "data/campaign/actor-notes.json" && /missing/.test(p.message)));
});

test("REAL DATA: every NPC file has an entry, and the real tree builds it with no problem", () => {
  const real = loadModel();
  const doc = JSON.parse(real.built["data/campaign/actor-notes.json"].source);
  assert.deepEqual(Object.keys(doc.npcs), realNpcs.map((n) => n.json.id).sort());
  const problems = checkModel(real).filter((p) => p.where.startsWith("npcs/"));
  assert.deepEqual(problems.filter((p) => p.level === "error"), [], "every `canon` link names a canon entity");
});

test("REAL DATA: no data/npcs file still carries the retired `description` (D080: the story prose is generated from canon now)", () => {
  const holders = realNpcs.filter((n) => "description" in n.json).map((n) => n.file);
  assert.deepEqual(holders, [], "the old prose lives in quarantine/data/npc-descriptions.json; the Actor sheet's text is data/campaign/actor-notes.json");
});

test("REAL DATA: nothing was lost when the prose was stripped -- the old descriptions are kept untouched in quarantine/data/npc-descriptions.json", () => {
  const file = path.join(ROOT, "quarantine", "data", "npc-descriptions.json");
  assert.ok(fs.existsSync(file), "the old text of every NPC file's `description` is kept here (D080), searchable for ideas and never cited");
  const old = JSON.parse(fs.readFileSync(file, "utf8"));
  const entries = Object.entries(old);
  assert.ok(entries.length >= 86, `86 descriptions were stripped on 2026-10-07; ${entries.length} are kept`);
  for (const [id, text] of entries) assert.ok(typeof text === "string" && text.trim().length > 0, `${id}: an empty entry`);
  const total = entries.reduce((n, [, text]) => n + text.length, 0);
  assert.ok(total >= 68000, `68,530 characters were stripped; only ${total} are kept`);
  // Each kept description belongs to an NPC file that is still there, so it can be found again by the person's id.
  const live = new Set(realNpcs.map((n) => n.json.id));
  assert.ok(entries.filter(([id]) => live.has(id)).length >= 86, "every stripped description belongs to an NPC file that is still there");
});

test("REAL DATA: every NPC file states its canon link (an entity, entity.slug, or null), and it resolves", () => {
  const real = loadModel();
  const entities = new Map(real.world.map((e) => [e.id, e]));
  for (const { file, json } of realNpcs) {
    assert.ok("canon" in json, `${file} must say which canon entity it is (or "canon": null)`);
    if (json.canon === null) continue;
    const ref = parseCanonRef(json.canon);
    assert.ok(ref, `${file}: canon ${JSON.stringify(json.canon)} is not an entity id or entity.slug`);
    const e = entities.get(ref.entity);
    assert.ok(e, `${file}: canon ${json.canon} names no canon/world file`);
    if (ref.stem) assert.ok(e.facts.some((f) => inStem(f.id, e.id, ref.stem)), `${file}: canon ${json.canon} matches no fact`);
  }
});

test("REAL DATA: what the sheets show is only what canon has settled: every listed fact exists with that status, every open one is open, and no pencil is written out", () => {
  const real = loadModel();
  const doc = JSON.parse(real.built["data/campaign/actor-notes.json"].source);
  const facts = new Map(real.world.flatMap((e) => e.facts).map((f) => [f.id, f]));
  const pencil = [...facts.values()].filter((f) => f.status === "sketch");
  assert.ok(pencil.length > 0, "the tree has pencil for this check to mean anything");
  let shown = 0;
  for (const [id, entry] of Object.entries(doc.npcs)) {
    for (const f of entry.settled ?? []) {
      shown += 1;
      const canonFact = facts.get(f.id);
      assert.ok(canonFact, `${id}: ${f.id} is not a canon fact`);
      assert.equal(canonFact.status, f.status, `${id}: ${f.id}`);
      assert.ok(SETTLED_STATUSES.includes(f.status), `${id}: ${f.id} is ${f.status}`);
      assert.equal(canonFact.text, f.text);
    }
    for (const f of entry.open ?? []) assert.equal(facts.get(f.id)?.status, "open", `${id}: ${f.id}`);
    assert.ok(Number.isInteger(entry.sketched ?? 0));
  }
  assert.ok(shown > 0, "some person has a settled fact");
  // Pencil is counted, never quoted: none of its wording, and none of its ids, is anywhere in the file.
  const text = real.built["data/campaign/actor-notes.json"].source;
  for (const f of pencil) {
    assert.ok(!text.includes(JSON.stringify(f.text).slice(1, -1)), `pencil wording written out: ${f.id}`);
    assert.ok(!text.includes(`"id": "${f.id}"`), `pencil id written out as a fact: ${f.id}`);
  }
});

test("REAL DATA: a person's pencil count is the pencil facts of their entity (or their own facts inside a group)", () => {
  const real = loadModel();
  const doc = JSON.parse(real.built["data/campaign/actor-notes.json"].source);
  const entities = new Map(real.world.map((e) => [e.id, e]));
  for (const { json } of realNpcs) {
    if (!json.canon) continue;
    const ref = parseCanonRef(json.canon);
    const e = entities.get(ref.entity);
    const mine = e.facts.filter((f) => !ref.stem || inStem(f.id, e.id, ref.stem));
    assert.equal(doc.npcs[json.id].sketched, mine.filter((f) => f.status === "sketch").length, json.id);
    assert.equal(doc.npcs[json.id].settled.length, mine.filter((f) => SETTLED_STATUSES.includes(f.status)).length, json.id);
    assert.equal(doc.npcs[json.id].open.length, mine.filter((f) => f.status === "open").length, json.id);
  }
});

test("REAL DATA: no blurb carries a GM-only tail or a second sentence of the role", () => {
  const doc = JSON.parse(loadModel().built["data/campaign/actor-notes.json"].source);
  for (const { json } of realNpcs) {
    assert.equal(doc.npcs[json.id].blurb, npcBlurb(json), json.id);
    assert.doesNotMatch(doc.npcs[json.id].blurb, /gm.?only/i, json.id);
  }
});

test("entryFor on its own: the same entry the file holds", () => {
  const m = model([entity("warden", [fact("warden.x", "decided")])]);
  const problems = [];
  const entities = new Map(m.world.map((e) => [e.id, e]));
  const entry = entryFor(npc("w", { canon: "warden" }), { entities, place: () => ({ key: 0, label: "x", heldBack: false }), problems });
  assert.equal(entry.settled[0].toldAt, "x");
  assert.deepEqual(problems, []);
});
