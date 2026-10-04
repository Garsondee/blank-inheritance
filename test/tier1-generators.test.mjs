// Tier 1 — pure generator unit tests. Milliseconds, no Foundry, no network.
// Golden files under test/golden/ are the committed expected output — an
// unintended change shows up as a readable diff in review. When a generator
// change is intentional, regenerate by running the relevant builder against
// the fixture and overwriting the golden file (see git history of this file
// for the exact one-off commands used to create them) — never hand-edit a
// golden file to make a test pass.

import "./setup.mjs";

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { deriveFoundryId, contentHash } from "../module/blank-inheritance/scripts/core/ids.mjs";
import { buildCreatureActorData } from "../module/blank-inheritance/scripts/core/generators/creature.mjs";
import { buildNpcActorData } from "../module/blank-inheritance/scripts/core/generators/npc.mjs";
import { buildCharacterActorData } from "../module/blank-inheritance/scripts/core/generators/character.mjs";
import { RING_EFFECTS, resolveTokenRing } from "../module/blank-inheritance/scripts/core/generators/token-ring.mjs";
import { buildSceneData } from "../module/blank-inheritance/scripts/core/generators/scene.mjs";
import { buildJournalEntryData, episodeToJournalSource } from "../module/blank-inheritance/scripts/core/generators/journal.mjs";
import { validateActor, validateScene, validateJournalEntry } from "../module/blank-inheritance/scripts/core/validate.mjs";
import { summarizeReport, reportToHtml, reportToClipboardText } from "../module/blank-inheritance/scripts/core/report.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const fixturesDir = path.join(repoRoot, "module", "blank-inheritance", "data", "_test-fixtures");
const goldenDir = path.join(here, "golden");

function readFixture(name) {
  return JSON.parse(readFileSync(path.join(fixturesDir, name), "utf8"));
}
function readGolden(name) {
  return JSON.parse(readFileSync(path.join(goldenDir, name), "utf8"));
}
function readRealData(relativePath) {
  return JSON.parse(readFileSync(path.join(repoRoot, "data", relativePath), "utf8"));
}

test("deriveFoundryId is deterministic and Foundry-id-shaped", async () => {
  const a = await deriveFoundryId("test-fixture-creature-001");
  const b = await deriveFoundryId("test-fixture-creature-001");
  assert.equal(a, b, "same source id must always derive the same Foundry id");
  assert.match(a, /^[a-zA-Z0-9]{16}$/, "must be exactly 16 alphanumeric chars — Foundry's document id format");

  const different = await deriveFoundryId("test-fixture-creature-002");
  assert.notEqual(a, different);
});

test("contentHash changes when the object changes, stable when it doesn't", async () => {
  const h1 = await contentHash({ a: 1, b: 2 });
  const h2 = await contentHash({ a: 1, b: 2 });
  const h3 = await contentHash({ a: 1, b: 3 });
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test("buildCreatureActorData matches golden output", async () => {
  const source = readFixture("test-creature.json");
  const actual = await buildCreatureActorData(source);
  const expected = readGolden("creature-actor.json");
  assert.deepEqual(actual, expected);
});

test("buildCreatureActorData: strikes map to melee Items with the real sf2e field shape", async () => {
  const source = readFixture("test-creature.json");
  const data = await buildCreatureActorData(source);
  assert.equal(data.items.length, 1);
  const [claw] = data.items;
  assert.equal(claw.type, "melee");
  assert.equal(claw.system.action, "strike");
  assert.equal(claw.system.bonus.value, 25);
  assert.equal(claw.system.range, null, "strikeType 'melee' must produce a null range, not a range object");
  const damageEntries = Object.values(claw.system.damageRolls);
  assert.equal(damageEntries.length, 1);
  assert.equal(damageEntries[0].damage, "3d8+10");
  assert.equal(damageEntries[0].damageType, "slashing");
});

test("buildCreatureActorData: sensible defaults when optional fields are absent", async () => {
  const data = await buildCreatureActorData({ id: "bare-creature" });
  assert.equal(data.type, "npc");
  assert.equal(data.system.attributes.ac.value, 10, "AC defaults to 10, matching template.json's own default");
  assert.equal(data.system.attributes.hp.max, 1);
  assert.equal(data.system.traits.size.value, "med", "unrecognized/missing size must fall back to medium");
  assert.deepEqual(data.items, [], "no strikes in source must produce an empty items array, not throw");
});

test("buildNpcActorData: statblock-less branch matches golden output", async () => {
  const source = readFixture("test-npc.json");
  const actual = await buildNpcActorData(source);
  const expected = readGolden("npc-actor.json");
  assert.deepEqual(actual, expected);
});

test("buildNpcActorData: statblock branch matches golden output", async () => {
  const source = readFixture("test-npc-with-statblock.json");
  const actual = await buildNpcActorData(source);
  const expected = readGolden("npc-actor-with-statblock.json");
  assert.deepEqual(actual, expected);
});

test("buildNpcActorData: statblock-less branch produces the exact same 'bare' defaults as buildCreatureActorData does for an absent statblock (AC 10, 1 HP not 0, level 0, zero items)", async () => {
  const data = await buildNpcActorData({ id: "bare-npc", name: "Bare NPC" });
  assert.equal(data.type, "npc");
  assert.equal(data.system.attributes.ac.value, 10);
  assert.equal(data.system.attributes.hp.value, 1, "1 HP, not 0 -- 0 reads as dead/defeated on an npc-type Actor's sheet, wrong for a living statblock-less NPC");
  assert.equal(data.system.attributes.hp.max, 1);
  assert.equal(data.system.details.level.value, 0);
  assert.deepEqual(data.items, []);
});

test("buildNpcActorData: statblock-less branch populates BOTH details.blurb and details.publicNotes from source.description", async () => {
  const data = await buildNpcActorData({ id: "x", name: "X", description: "A quiet clerk who wants the form filled in correctly." });
  assert.equal(data.system.details.blurb, "A quiet clerk who wants the form filled in correctly.");
  assert.equal(data.system.details.publicNotes, "A quiet clerk who wants the form filled in correctly.");
});

test("buildNpcActorData: statblock branch produces the IDENTICAL {system, items} shape buildCreatureActorData would for the same combatStatblock", async () => {
  // npc.schema.json's `statblock` and creature.schema.json both $ref the exact
  // same combatStatblock def (sf2e-common.schema.json) -- the two generators
  // must not silently drift apart on how they map it.
  const statblock = {
    level: 5, ac: 20, traits: ["humanoid"], size: "medium",
    abilityModifiers: { str: 2, dex: 1, con: 2, int: 0, wis: 1, cha: 0 },
    hitPoints: { max: 60, current: 60 },
    strikes: [{ name: "Fist", strikeType: "melee", attackBonus: 12, traits: [], damage: [{ dice: "1d6", bonus: 4, damageType: "bludgeoning" }] }]
  };
  const npcData = await buildNpcActorData({ id: "npc-parity-check", name: "NPC Parity Check", statblock });
  const creatureData = await buildCreatureActorData({ id: "creature-parity-check", name: "NPC Parity Check", ...statblock });
  assert.deepEqual(npcData.system, creatureData.system);
  assert.deepEqual(npcData.items, creatureData.items);
});

test("buildCharacterActorData matches golden output", async () => {
  const source = readFixture("test-character.json");
  const actual = await buildCharacterActorData(source);
  const expected = readGolden("character-actor.json");
  assert.deepEqual(actual, expected);
});

test("buildCharacterActorData: deliberately does not write system.abilities or attributes.ac", async () => {
  // Regression guard for the exact mistake design/foundry-module-design.md §2 warns about:
  // every shipped sf2e character has system.abilities === null, computed from embedded Items.
  // Writing flat numbers here would produce a sheet that's wrong the moment sf2e recalculates.
  const data = await buildCharacterActorData({ id: "x", name: "X", level: 5 });
  assert.equal(data.system.abilities, undefined);
  assert.equal(data.system.attributes, undefined);
  assert.deepEqual(Object.keys(data.system), ["details"]);
});

test("resolveTokenRing: every actor gets a ring, enabled, with Ring Pulse on, regardless of kind", () => {
  for (const [kind, source] of [["npc", { affiliation: "directorate" }], ["creature", { traits: ["claimant"] }], ["character", {}]]) {
    const ring = resolveTokenRing(kind, source);
    assert.equal(ring.enabled, true);
    assert.equal(ring.effects, RING_EFFECTS.ENABLED | RING_EFFECTS.RING_PULSE, `${kind}: effects must be ENABLED | RING_PULSE`);
    assert.equal(ring.effects, 3, "ENABLED (0x01) | RING_PULSE (0x02) — pinned to the literal Foundry core writes to disk");
  }
});

test("resolveTokenRing: npc ring color is vermilion for the Directorate, amber otherwise (faction identification, Ingram 2026-09-18)", () => {
  assert.equal(resolveTokenRing("npc", { affiliation: "directorate" }).colors.ring, "#be3219");
  assert.equal(resolveTokenRing("npc", { affiliation: null }).colors.ring, "#f0a830");
  assert.equal(resolveTokenRing("npc", { affiliation: "some-other-faction" }).colors.ring, "#f0a830");
  assert.equal(resolveTokenRing("npc", {}).colors.ring, "#f0a830", "missing affiliation must not throw");
});

test("resolveTokenRing: creature ring color is resonance violet for a Claimant, amber for any other creature", () => {
  // bi-tokens.css already reserves this violet for "Claimant telemetry" specifically —
  // this applies that existing decision rather than inventing a new one.
  assert.equal(resolveTokenRing("creature", { traits: ["aberration", "claimant"] }).colors.ring, "#a986e8");
  assert.equal(resolveTokenRing("creature", { traits: ["aberration"] }).colors.ring, "#f0a830", "a non-Claimant creature (e.g. a test fixture) must not read as a Claimant");
  assert.equal(resolveTokenRing("creature", {}).colors.ring, "#f0a830", "missing traits must not throw");
});

test("resolveTokenRing: character (kid/Frame) ring color is always cyan — every source IS the player party", () => {
  assert.equal(resolveTokenRing("character", {}).colors.ring, "#4fc8d8");
  assert.equal(resolveTokenRing("character", { affiliation: "directorate" }).colors.ring, "#4fc8d8", "a character source has no affiliation field in practice, but even a stray one must not override party color");
});

test("resolveTokenRing: ring.subject.texture is ALWAYS null -- it is not where an assigned portrait goes", () => {
  // Found live 2026-09-18: ring.subject.texture is an advanced override for a
  // subject distinct from the token's own base art, not "the portrait." A
  // portrait belongs on prototypeToken.texture.src instead -- see the
  // buildXActorData test below and token-ring.mjs's own header for the full
  // story (setting it here produced a real double-image bug against a live
  // Foundry world: the default icon stayed the actual displayed token art
  // with the assigned portrait rendering as a mostly-hidden second layer).
  assert.equal(resolveTokenRing("npc", { affiliation: "directorate" }).subject.texture, null);
  assert.equal(resolveTokenRing("creature", {}).subject.texture, null);
  assert.equal(resolveTokenRing("character", {}).subject.texture, null);
});

test("buildNpcActorData/buildCreatureActorData/buildCharacterActorData: every Actor carries prototypeToken.ring, and tokenImage flows to prototypeToken.texture.src -- NOT ring.subject.texture", async () => {
  const npcData = await buildNpcActorData({ id: "x", affiliation: "directorate" }, { tokenImage: "modules/blank-inheritance/assets/tokens/x.webp" });
  assert.equal(npcData.prototypeToken.ring.colors.ring, "#be3219");
  assert.equal(npcData.prototypeToken.texture.src, "modules/blank-inheritance/assets/tokens/x.webp");
  assert.equal(npcData.prototypeToken.ring.subject.texture, null, "the portrait must not ALSO be written to ring.subject.texture");

  const creatureData = await buildCreatureActorData({ id: "y", traits: ["claimant"] });
  assert.equal(creatureData.prototypeToken.ring.colors.ring, "#a986e8");
  assert.equal(creatureData.prototypeToken.texture, undefined, "no tokenImage supplied -- prototypeToken.texture must be omitted entirely, not an empty/null placeholder, so Foundry's own default token art is untouched");

  const characterData = await buildCharacterActorData({ id: "z" }, { tokenImage: "modules/blank-inheritance/assets/tokens/z.webp" });
  assert.equal(characterData.prototypeToken.ring.colors.ring, "#4fc8d8");
  assert.equal(characterData.prototypeToken.ring.enabled, true);
  assert.equal(characterData.prototypeToken.texture.src, "modules/blank-inheritance/assets/tokens/z.webp");
});

test("buildNpcActorData/buildCreatureActorData: portraitImage flows to the Actor's own top-level img, distinct from and independent of tokenImage -- added 2026-09-29, previously never set by anything", async () => {
  const npcData = await buildNpcActorData(
    { id: "x" },
    { tokenImage: "modules/blank-inheritance/assets/tokens/x.webp", portraitImage: "modules/blank-inheritance/assets/stage/x.webp" }
  );
  assert.equal(npcData.img, "modules/blank-inheritance/assets/stage/x.webp");
  assert.equal(npcData.prototypeToken.texture.src, "modules/blank-inheritance/assets/tokens/x.webp", "img and the token's texture.src must resolve independently, from two different options");

  const npcWithStatblock = await buildNpcActorData(
    { id: "x2", statblock: {} },
    { portraitImage: "modules/blank-inheritance/assets/stage/x2.webp" }
  );
  assert.equal(npcWithStatblock.img, "modules/blank-inheritance/assets/stage/x2.webp", "the statblock branch must also carry img through");

  const npcWithNoPortrait = await buildNpcActorData({ id: "no-portrait" });
  assert.equal(npcWithNoPortrait.img, undefined, "no portraitImage supplied -- img must be omitted entirely, not an empty/null placeholder");

  const creatureData = await buildCreatureActorData({ id: "y" }, { portraitImage: "modules/blank-inheritance/assets/stage/y.webp" });
  assert.equal(creatureData.img, "modules/blank-inheritance/assets/stage/y.webp");
});

test("buildSceneData matches golden output", async () => {
  const sceneSource = readFixture("test-scene.json");
  const actorIdBySourceId = readGolden("actor-id-by-source-id.json");
  const actual = await buildSceneData(sceneSource, actorIdBySourceId);
  const expected = readGolden("scene.json");
  assert.deepEqual(actual, expected);
});

test("buildSceneData: a placement referencing an actor not in the map is silently dropped, not thrown", async () => {
  const data = await buildSceneData(
    { id: "s", placements: [{ actorSourceId: "unknown-actor", x: 1, y: 1 }] },
    {}
  );
  assert.deepEqual(data.tokens, []);
});

test("buildJournalEntryData matches golden output", async () => {
  const source = readFixture("test-journal.json");
  const actual = await buildJournalEntryData(source);
  const expected = readGolden("journal-entry.json");
  assert.deepEqual(actual, expected);
});

test("buildJournalEntryData: page ids are deterministic and independent of the parent journal's id", async () => {
  const a = await buildJournalEntryData({ id: "j1", pages: [{ id: "p1", name: "Page" }] });
  const b = await buildJournalEntryData({ id: "j1", pages: [{ id: "p1", name: "Page" }] });
  assert.equal(a.pages[0]._id, b.pages[0]._id, "same journal id + same page id must always derive the same page id");

  const differentJournal = await buildJournalEntryData({ id: "j2", pages: [{ id: "p1", name: "Page" }] });
  assert.notEqual(a.pages[0]._id, differentJournal.pages[0]._id, "the same page id under a different journal must derive a different page id");
});

test("buildJournalEntryData: no pages in source produces an empty pages array, not throw", async () => {
  const data = await buildJournalEntryData({ id: "bare-journal" });
  assert.deepEqual(data.pages, []);
  assert.equal(data.name, "bare-journal", "falls back to id when name is absent, same convention as the other generators");
});

test("buildJournalEntryData: pages default to text/HTML format and space sort values by Foundry's own SORT_INTEGER_DENSITY", async () => {
  const data = await buildJournalEntryData({ id: "j", pages: [{ id: "a", name: "A" }, { id: "b", name: "B" }] });
  for (const page of data.pages) {
    assert.equal(page.type, "text");
    assert.equal(page.text.format, 1, "must match CONST.JOURNAL_ENTRY_PAGE_FORMATS.HTML");
  }
  assert.equal(data.pages[0].sort, 100000);
  assert.equal(data.pages[1].sort, 200000);
});

test("validateJournalEntry: a JournalEntry with all pages present and matching passes every check", async () => {
  const source = readFixture("test-journal.json");
  const data = await buildJournalEntryData(source);
  const created = { ...data, id: data._id };
  const result = await validateJournalEntry(created, source, data._id);
  const summary = summarizeReport({ results: [result] });
  assert.equal(summary.failed, 0, `expected all checks to pass, got: ${JSON.stringify(result.checks.filter((c) => !c.pass))}`);
});

test("validateJournalEntry: a missing page is reported as a failed check, not silently accepted", async () => {
  const source = readFixture("test-journal.json");
  const data = await buildJournalEntryData(source);
  const created = { ...data, id: data._id, pages: data.pages.slice(0, 1) };
  const result = await validateJournalEntry(created, source, data._id);
  const failed = result.checks.filter((c) => !c.pass);
  assert.ok(failed.length > 0, "dropping a page must surface at least one failed check");
});

test("episodeToJournalSource: a real episode with authored scenes (Episode One) produces one overview page plus one page per scene", async () => {
  // Repointed 2026-09-13 from episode-01-contact-unclassified, which was deleted
  // along with every other drafted beat beyond Session 0/1. Episode One is now
  // the only real episode in the repo, and is the better fixture anyway: it is
  // the one we actually intend to run.
  const episode = readRealData("episodes/episode-c1e1-mothers-maiden-name.json");
  // Real content is still "drafted" today (issue #166's backfill, nothing
  // promoted yet) -- this test is about page structure/content shape, not
  // the withholding gate (that's tier1-writer-audit and tier4-mocked-adapter's
  // job), so simulate "already reviewed" in-memory. Never mutates the real file.
  episode.authoring = { ...episode.authoring, status: "sound" };
  episode.scenes = episode.scenes.map((scene) => ({ ...scene, authoring: { ...scene.authoring, status: "sound" } }));
  const source = episodeToJournalSource(episode);

  assert.equal(source.id, "episode-c1e1-mothers-maiden-name");
  assert.equal(source.name, "Mother's Maiden Name (Again)");
  assert.equal(source.pages.length, 1 + episode.scenes.length, "one overview page plus one per authored scene");
  assert.equal(source.pages[0].id, "overview");
  // Checked against the episode's own words rather than a pinned phrase (2026-10-04): the prose is rewritten as
  // Ingram reads it (D056, D058), and pinned phrases ("Six volunteers", "immediately likeable") went stale with
  // every rewrite. What this proves is unchanged: the summary and the casting note reach the overview page.
  const plain = (s) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/&#?\w+;/g, " ").replace(/[^A-Za-z0-9]+/g, " ").trim();
  assert.ok(episode.summary && plain(source.pages[0].content).includes(plain(episode.summary)), "overview page must include the episode summary");
  assert.ok(episode.castingNote && plain(source.pages[0].content).includes(plain(episode.castingNote)), "overview page must include the casting note");

  // Episode One's scenes carry their own `id`, so the page is keyed on that
  // rather than falling back to `scene-${order}`. The old fixture had no scene
  // ids at all, so this branch of journal.mjs was never actually covered.
  const fightPage = source.pages.find((p) => p.id === "flood-tunnel");
  assert.ok(fightPage, "expected a page for the flood tunnel scene, keyed on the scene's own id");
  // Order number asserted loosely rather than hardcoded: Episode One's own
  // running order has grown twice already (5 scenes -> 6 with Flood Tunnel
  // -> 8 with The Tram Back/The Walk Down added 2026-09-19), and the exact
  // position isn't what this test is checking -- the scene's own id-keyed
  // page and its content are. Assert the title text, not its numeric prefix.
  assert.match(fightPage.name, /\. Flood Tunnel Clearance$/);
  const fightScene = episode.scenes.find((s) => s.id === "flood-tunnel");
  assert.ok(fightScene?.description && plain(fightPage.content).includes(plain(fightScene.description)), "scene page must include the scene's own description");
  assert.match(fightPage.content, /c1e1-flood-tunnel/, "scene page must surface its encounterRef");
  assert.match(fightPage.content, /c1e1-compactor-cycle/, "scene page must surface its subsystemRef");

  // This is real prose, so it must actually build into a valid JournalEntry, not just look right.
  const data = await buildJournalEntryData(source);
  assert.equal(data.pages.length, source.pages.length);
});

test("episodeToJournalSource: an episode with no authored scenes yet still produces a real overview page, not an empty journal", () => {
  // Was the Days 2-5 interlude until 2026-09-13, when every drafted beat beyond
  // Session 0/1 was deleted. The behaviour is still worth pinning -- an episode
  // stub must render honestly rather than fabricating scenes -- so it keeps a
  // synthetic fixture instead of borrowing whichever real file happens to be
  // half-written. requiredBeats is GM-facing prose and must render;
  // danglingThreads is a bare cross-reference id list and must not.
  const source = episodeToJournalSource({
    id: "episode-stub",
    title: "A Stub",
    authoring: { status: "sound" },
    summary: "Mandatory school and training eat most of each day.",
    requiredBeats: ["Seed exactly one dangling thread. Don't resolve it yet."],
    danglingThreads: ["who-was-meant-to-pilot"],
  });

  assert.equal(source.pages.length, 1, "no scenes authored yet -- exactly the overview page, honestly, not a fabricated one");
  assert.match(source.pages[0].content, /Mandatory school/);
  assert.match(source.pages[0].content, /Seed exactly one dangling thread/, "requiredBeats must be rendered as prose, since they're real GM-facing content, not just a cross-reference id");
  assert.doesNotMatch(source.pages[0].content, /who-was-meant-to-pilot/, "danglingThreads is a bare cross-reference id list, not prose -- must not be dumped into the journal as if it were");
});

test("episodeToJournalSource: HTML-special characters in prose are escaped, not injected as markup", () => {
  const source = episodeToJournalSource({ id: "x", title: "X", authoring: { status: "sound" }, summary: "Kids & Frames <fight>" });
  assert.match(source.pages[0].content, /Kids &amp; Frames &lt;fight&gt;/);
});

test("episodeToJournalSource: issue #168 -- a drafted overview and a drafted scene are both withheld, with a clear placeholder instead of their real prose", () => {
  const source = episodeToJournalSource({
    id: "ep", title: "Ep", authoring: { status: "drafted" }, summary: "This must never appear in the output.",
    scenes: [{ order: 1, id: "scene-a", title: "Scene A", description: "This must never appear either.", authoring: { status: "drafted" } }]
  });
  assert.equal(source.pages.length, 2);
  for (const page of source.pages) {
    assert.match(page.content, /still drafted and has not yet been reviewed/, `${page.id} must show the withheld placeholder`);
    assert.doesNotMatch(page.content, /must never appear/, `${page.id} must not leak its real, unreviewed content`);
  }
});

test("episodeToJournalSource: issue #168 -- gating is per-scene, not all-or-nothing: a sound scene's real content shows even while a sibling scene is still drafted", () => {
  const source = episodeToJournalSource({
    id: "ep", title: "Ep", authoring: { status: "sound" }, summary: "A reviewed overview.",
    scenes: [
      { order: 1, id: "reviewed-scene", title: "Reviewed", description: "Real, reviewed content.", authoring: { status: "sound" } },
      { order: 2, id: "drafted-scene", title: "Drafted", description: "Not yet reviewed content.", authoring: { status: "drafted" } }
    ]
  });
  const reviewed = source.pages.find((p) => p.id === "reviewed-scene");
  const drafted = source.pages.find((p) => p.id === "drafted-scene");
  assert.match(reviewed.content, /Real, reviewed content/);
  assert.match(drafted.content, /still drafted and has not yet been reviewed/);
  assert.doesNotMatch(drafted.content, /Not yet reviewed content/, "the drafted scene's real prose must not leak just because a sibling scene cleared review");
});

test("episodeToJournalSource: a scene with no authoring block at all is treated as drafted, not as an accidental pass -- missing information must never leak content", () => {
  const source = episodeToJournalSource({
    id: "ep", title: "Ep", authoring: { status: "sound" },
    scenes: [{ order: 1, id: "s", title: "S", description: "Real content." }]
  });
  assert.match(source.pages[1].content, /still drafted and has not yet been reviewed/);
});

test("validateActor + summarizeReport: a matching Actor passes every check", async () => {
  const source = readFixture("test-creature.json");
  const data = await buildCreatureActorData(source);
  // Simulate what Foundry would hand back after Actor.create + re-read: same shape, plus a real Document's `.id`.
  const created = { ...data, id: data._id };
  const result = await validateActor(created, source, data._id, "creature");
  const summary = summarizeReport({ results: [result] });
  assert.equal(summary.failed, 0, `expected all checks to pass, got: ${JSON.stringify(result.checks.filter((c) => !c.pass))}`);
});

test("validateActor: entityLabel 'npc' passes every check for a matching statblock-less Actor, checked against source.description-derived defaults rather than a top-level source.ac/hitPoints/level", async () => {
  const source = readFixture("test-npc.json");
  const data = await buildNpcActorData(source);
  const created = { ...data, id: data._id };
  const result = await validateActor(created, source, data._id, "npc");
  const summary = summarizeReport({ results: [result] });
  assert.equal(summary.failed, 0, `expected all checks to pass, got: ${JSON.stringify(result.checks.filter((c) => !c.pass))}`);
  const typeCheck = result.checks.find((c) => c.label === "actor type");
  assert.equal(typeCheck.expected, "npc");
});

test("validateActor: entityLabel 'npc' passes every check for a matching statblock-carrying Actor, reading ac/hitPoints/level off source.statblock", async () => {
  const source = readFixture("test-npc-with-statblock.json");
  const data = await buildNpcActorData(source);
  const created = { ...data, id: data._id };
  const result = await validateActor(created, source, data._id, "npc");
  const summary = summarizeReport({ results: [result] });
  assert.equal(summary.failed, 0, `expected all checks to pass, got: ${JSON.stringify(result.checks.filter((c) => !c.pass))}`);
});

test("validateActor: entityLabel 'npc' reports a mismatched AC as a failed check, not silently accepted", async () => {
  const source = readFixture("test-npc-with-statblock.json");
  const data = await buildNpcActorData(source);
  const created = { ...data, id: data._id, system: { ...data.system, attributes: { ...data.system.attributes, ac: { value: 1 } } } };
  const result = await validateActor(created, source, data._id, "npc");
  const acCheck = result.checks.find((c) => c.label === "system.attributes.ac.value matches source");
  assert.equal(acCheck.pass, false);
});

test("summarizeReport: counts skipped results separately from pass/fail, without affecting the check totals", () => {
  const skippedResult = { skipped: true, checks: [{ pass: true }, { pass: true }] };
  const createdResult = { skipped: false, checks: [{ pass: true }, { pass: false }] };
  const summary = summarizeReport({ results: [skippedResult, createdResult] });
  assert.equal(summary.skipped, 1);
  assert.equal(summary.total, 4, "skipping a case must not exclude its own checks from the totals -- a skip is still validated");
  assert.equal(summary.passed, 3);
  assert.equal(summary.failed, 1);
});

test("summarizeReport: a result with no 'skipped' field at all (older report shape) counts as 0 skipped, not a crash", () => {
  const summary = summarizeReport({ results: [{ checks: [{ pass: true }] }] });
  assert.equal(summary.skipped, 0);
});

// --- issue #172: "the sync dialog gains a line -- N items now live" ------

test("summarizeReport: newlyLive counts a result that was actually created/updated this run -- not skipped, not withheld, every check passed", () => {
  const summary = summarizeReport({
    results: [
      { skipped: false, withheld: false, checks: [{ pass: true }, { pass: true }] },
      { skipped: true, withheld: false, checks: [{ pass: true }] }, // unchanged -- not newly live
      { skipped: false, withheld: true, checks: [] }, // withheld -- not newly live
      { skipped: false, withheld: false, checks: [{ pass: true }, { pass: false }] } // a real failure -- not newly live
    ]
  });
  assert.equal(summary.newlyLive, 1);
});

test("summarizeReport: newlyLive is 0, not undefined, when nothing qualifies -- an empty report must never crash the 'N items now live' line", () => {
  assert.equal(summarizeReport({ results: [] }).newlyLive, 0);
  assert.equal(summarizeReport({ results: [{ skipped: true, checks: [{ pass: true }] }] }).newlyLive, 0);
});

test("reportToHtml / reportToClipboardText: the 'now live' line only appears when newlyLive is actually positive", () => {
  const liveResult = { skipped: false, withheld: false, checks: [{ pass: true }], sourceId: "x", foundryType: "npc", expectedId: "a", actualId: "a" };
  const summaryWithLive = summarizeReport({ results: [liveResult] });
  assert.match(reportToHtml({ results: [liveResult] }, summaryWithLive), /1 item now live/);
  assert.match(reportToClipboardText({ results: [liveResult], timestamp: "t" }, summaryWithLive), /1 now live/);

  const skippedResult = { skipped: true, withheld: false, checks: [{ pass: true }], sourceId: "x", foundryType: "npc", expectedId: "a", actualId: "a" };
  const summaryNoLive = summarizeReport({ results: [skippedResult] });
  assert.doesNotMatch(reportToHtml({ results: [skippedResult] }, summaryNoLive), /now live/);
  assert.doesNotMatch(reportToClipboardText({ results: [skippedResult], timestamp: "t" }, summaryNoLive), /now live/);
});

test("reportToHtml: pluralizes correctly -- '1 item now live' vs '2 items now live'", () => {
  const result = (id) => ({ skipped: false, withheld: false, checks: [{ pass: true }], sourceId: id, foundryType: "npc", expectedId: "a", actualId: "a" });
  const oneReport = { results: [result("a")] };
  assert.match(reportToHtml(oneReport, summarizeReport(oneReport)), /1 item now live/);
  const twoReport = { results: [result("a"), result("b")] };
  assert.match(reportToHtml(twoReport, summarizeReport(twoReport)), /2 items now live/);
});

test("validateActor: a mismatched field is reported as a failed check, not silently accepted", async () => {
  const source = readFixture("test-creature.json");
  const data = await buildCreatureActorData(source);
  const created = { ...data, id: data._id, name: "Wrong Name" };
  const result = await validateActor(created, source, data._id, "creature");
  const nameCheck = result.checks.find((c) => c.label === "name matches source");
  assert.equal(nameCheck.pass, false);
  const summary = summarizeReport({ results: [result] });
  assert.equal(summary.failed, 1);
});

test("validateScene: token count check fails if a placement silently produced no token", async () => {
  const sceneSource = readFixture("test-scene.json");
  const actorIdBySourceId = readGolden("actor-id-by-source-id.json");
  const data = await buildSceneData(sceneSource, actorIdBySourceId);
  const created = { ...data, id: data._id, tokens: [] }; // simulate a Scene that came back with no tokens
  const result = await validateScene(created, sceneSource, data._id, actorIdBySourceId);
  const tokenCountCheck = result.checks.find((c) => c.label === "token count matches placements");
  assert.equal(tokenCountCheck.pass, false);
});

test("reportToClipboardText: contains a human-readable summary AND the full report as parseable JSON", () => {
  const report = { timestamp: "2026-09-04T00:00:00.000Z", results: [{ foo: "bar" }], fatalError: null };
  const summary = { total: 5, passed: 5, failed: 0 };
  const text = reportToClipboardText(report, summary);

  assert.match(text, /5\/5 checks passed/);
  assert.doesNotMatch(text, /FAILED/, "a fully-passing report must not mention FAILED");
  assert.match(text, /paste.*back to Claude/i);

  const jsonStart = text.indexOf("{");
  const parsed = JSON.parse(text.slice(jsonStart));
  assert.deepEqual(parsed, report, "the full original report object must be losslessly recoverable from the clipboard text");
});

test("reportToClipboardText: a failing report names the failure count and the fatal error", () => {
  const report = { timestamp: "2026-09-04T00:00:00.000Z", results: [], fatalError: "boom" };
  const summary = { total: 3, passed: 1, failed: 2 };
  const text = reportToClipboardText(report, summary);

  assert.match(text, /1\/3 checks passed \(2 FAILED\)/);
  assert.match(text, /Fatal error: boom/);
});
