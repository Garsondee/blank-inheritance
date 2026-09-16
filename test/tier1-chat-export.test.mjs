// Tier 1 — pure logic for turning a raw ChatMessage into a harvestable
// record (core/chat-export.mjs). Milliseconds, no Foundry, no network.

import { test } from "node:test";
import assert from "node:assert/strict";

import { stripHtml, extractContentLinks, summarizeRolls, extractCheckContext, normalizeMessage } from "../module/blank-inheritance/scripts/core/chat-export.mjs";

test("stripHtml: paragraphs and breaks become newlines, tags are removed, entities decoded", () => {
  assert.equal(stripHtml("<p>Hello <strong>world</strong></p>"), "Hello world");
  assert.equal(stripHtml("Line one<br>Line two"), "Line one\nLine two");
  assert.equal(stripHtml("Kids &amp; Frames &lt;fight&gt;"), "Kids & Frames <fight>");
  assert.equal(stripHtml(""), "");
  assert.equal(stripHtml(null), "");
});

test("stripHtml: every common block-level closing tag implies a line break, not just </p> (regression, found live 2026-09-16: a <h3>...</h3><pre>...</pre> message ran its heading straight into the next line with no separator)", () => {
  assert.equal(stripHtml("<h3>Title</h3><pre>Body</pre>"), "Title\nBody");
  assert.equal(stripHtml("<div>One</div><div>Two</div>"), "One\nTwo");
  assert.equal(stripHtml("<li>A</li><li>B</li>"), "A\nB");
  assert.equal(stripHtml("<h1>H1</h1><h2>H2</h2><h6>H6</h6>"), "H1\nH2\nH6");
});

test("extractContentLinks: parses unenriched @UUID/@Actor/@Item source syntax with and without a label", () => {
  const links = extractContentLinks('Check the @UUID[Actor.abc123]{Shucks Mordant} and @Item[def456]');
  assert.deepEqual(links, [
    { type: "UUID", ref: "Actor.abc123", label: "Shucks Mordant" },
    { type: "Item", ref: "def456", label: null }
  ]);
});

test("extractContentLinks: parses the already-enriched <a class=\"content-link\"> form Foundry actually renders", () => {
  const html = '<a class="content-link" draggable="true" data-link data-uuid="Macro.865e0ce3b7d302e5" data-id="865e0ce3b7d302e5" data-type="Macro">Open Equipment Locker</a>';
  const links = extractContentLinks(html);
  assert.deepEqual(links, [{ type: "Macro", ref: "865e0ce3b7d302e5", label: "Open Equipment Locker" }]);
});

test("extractContentLinks: no links is an empty array, not null/undefined", () => {
  assert.deepEqual(extractContentLinks("just plain roleplay text"), []);
  assert.deepEqual(extractContentLinks(""), []);
});

test("summarizeRolls: pulls formula/total out of Foundry's serialized Roll JSON, accepts pre-parsed objects too", () => {
  const rolls = [
    JSON.stringify({ formula: "1d20+7", total: 19, terms: [{ huge: "tree" }] }),
    { formula: "2d6", total: 8 }
  ];
  assert.deepEqual(summarizeRolls(rolls), [
    { formula: "1d20+7", total: 19 },
    { formula: "2d6", total: 8 }
  ]);
});

test("summarizeRolls: a malformed entry is dropped, not thrown, so one bad roll can't crash the whole export", () => {
  const rolls = ["{not valid json", JSON.stringify({ formula: "1d4", total: 3 })];
  assert.deepEqual(summarizeRolls(rolls), [{ formula: "1d4", total: 3 }]);
});

test("summarizeRolls: empty/absent input is safe", () => {
  assert.deepEqual(summarizeRolls([]), []);
  assert.deepEqual(summarizeRolls(), []);
});

test("extractCheckContext: a real sf2e check-outcome shape (Tier 1 material) -- flags.sf2e, not flags.pf2e, and the skill lives at domains[0], not a slug field (both confirmed live, 2026-09-16)", () => {
  const flags = { sf2e: { context: { type: "skill-check", domains: ["stealth", "dex-based", "skill-check"], outcome: "success", dc: { value: 18 } } } };
  assert.deepEqual(extractCheckContext(flags), { type: "skill-check", slug: "stealth", outcome: "success", dc: 18 });
});

test("extractCheckContext: no sf2e context, or a context with no outcome, is null -- an ordinary damage roll (or a DC-less check, which has no degree of success to compute) is not a resolved check result", () => {
  assert.equal(extractCheckContext({}), null);
  assert.equal(extractCheckContext(undefined), null);
  assert.equal(extractCheckContext({ sf2e: { context: { type: "damage-roll" } } }), null);
  assert.equal(extractCheckContext({ sf2e: { context: { type: "perception-check", domains: ["perception"], outcome: null } } }), null, "a real DC-less roll has outcome: null, confirmed live");
});

test("extractCheckContext: a missing dc is null, not a fabricated number", () => {
  const flags = { sf2e: { context: { type: "skill-check", domains: ["diplomacy"], outcome: "criticalSuccess" } } };
  assert.equal(extractCheckContext(flags).dc, null);
});

test("extractCheckContext: a message with the old flags.pf2e shape (a different system, or a stale export) is correctly NOT recognised as a check", () => {
  const flags = { pf2e: { context: { type: "skill-check", domains: ["stealth"], outcome: "success", dc: { value: 18 } } } };
  assert.equal(extractCheckContext(flags), null);
});

test("normalizeMessage: harvestKind is null by default, and picked up from flags['blank-inheritance'].harvestKind when a caller sets it", () => {
  const bare = normalizeMessage({ content: "hi", rolls: [], flags: {} });
  assert.equal(bare.harvestKind, null);

  const marked = normalizeMessage({ content: "hi", rolls: [], flags: { "blank-inheritance": { harvestKind: "intake-answers" } } });
  assert.equal(marked.harvestKind, "intake-answers");
});

test("normalizeMessage: assembles the full record, preferring flavor text over content when both exist", () => {
  const raw = {
    id: "msg1",
    timestamp: Date.UTC(2026, 8, 16, 20, 15, 0),
    authorName: "Gamemaster",
    speakerName: "Kimura Etsuko",
    flavor: "<strong>Stealth Check</strong>",
    content: "<p>rolled a thing</p>",
    rolls: [JSON.stringify({ formula: "1d20+5", total: 17 })],
    flags: { sf2e: { context: { type: "skill-check", domains: ["stealth"], outcome: "success", dc: { value: 15 } } } }
  };
  const record = normalizeMessage(raw);
  assert.equal(record.id, "msg1");
  assert.equal(record.at, "2026-09-16T20:15:00.000Z");
  assert.equal(record.author, "Gamemaster");
  assert.equal(record.speaker, "Kimura Etsuko");
  assert.equal(record.text, "Stealth Check");
  assert.deepEqual(record.rolls, [{ formula: "1d20+5", total: 17 }]);
  assert.deepEqual(record.check, { type: "skill-check", slug: "stealth", outcome: "success", dc: 15 });
  assert.deepEqual(record.links, []);
});

test("normalizeMessage: falls back to content when there is no flavor text", () => {
  const record = normalizeMessage({ content: "<p>Just roleplay.</p>", rolls: [], flags: {} });
  assert.equal(record.text, "Just roleplay.");
});

test("normalizeMessage: a missing timestamp/author/speaker degrades to null rather than throwing", () => {
  const record = normalizeMessage({ content: "hi", rolls: [], flags: {} });
  assert.equal(record.at, null);
  assert.equal(record.author, null);
  assert.equal(record.speaker, null);
});

test("normalizeMessage: links are collected from both flavor and content, not just one", () => {
  const record = normalizeMessage({
    flavor: "@Actor[abc]{The Commander}",
    content: "also mentions @Item[def]{a comm unit}",
    rolls: [],
    flags: {}
  });
  assert.deepEqual(record.links, [
    { type: "Actor", ref: "abc", label: "The Commander" },
    { type: "Item", ref: "def", label: "a comm unit" }
  ]);
});
