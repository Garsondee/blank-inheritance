// Tier 0 — craft library structural lint. Instant, no fixtures, no Foundry.
// The library is 16 interlinked reference documents behind one index. Nothing
// executes it, so a renamed file or a dropped footer rots silently until
// someone follows a dead link mid-prep. See design/craft-library.md.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const designRoot = path.join(repoRoot, "design");

const INDEX = "craft-library.md";

// The three shelves, exactly as design/craft-library.md §2 lists them.
const SHELVES = {
  "narrative and interactive-story theory": [
    "narrative-theory-foundations.md",
    "agency-and-player-choice.md",
    "environmental-storytelling-and-place.md",
    "mechanics-as-meaning.md",
    "dialogue-and-character-voice.md",
  ],
  "TTRPG design and table craft": [
    "ttrpg-campaign-and-session-craft.md",
    "quests-objectives-and-threads.md",
    "pacing-and-the-responsive-campaign.md",
    "rpg-systems-design.md",
    "mystery-and-investigation-design.md",
    "character-creation-and-progression.md",
    "strategy-and-downtime-design.md",
  ],
  "fantasy and science-fiction writing convention": [
    "worldbuilding-craft.md",
    "science-fiction-and-mecha-conventions.md",
    "japanese-narrative-conventions.md",
    "prose-craft-and-naming.md",
  ],
};

const DOCS = Object.values(SHELVES).flat();

const read = (file) => readFileSync(path.join(designRoot, file), "utf8");

test("every library document exists", () => {
  for (const doc of [INDEX, ...DOCS]) {
    assert.ok(existsSync(path.join(designRoot, doc)), `missing: design/${doc}`);
  }
});

test("the index lists every document, and lists nothing that does not exist", () => {
  const index = read(INDEX);
  for (const doc of DOCS) {
    assert.ok(index.includes(doc), `design/${INDEX} never mentions ${doc}`);
  }
  // Any sibling .md the index links to must be a real file.
  for (const target of [...index.matchAll(/\]\(([a-z0-9-]+\.md)\)/g)].map((m) => m[1])) {
    assert.ok(
      existsSync(path.join(designRoot, target)),
      `design/${INDEX} links to missing design/${target}`,
    );
  }
});

test("no intra-library link is broken", () => {
  for (const doc of [INDEX, ...DOCS]) {
    const body = read(doc);
    for (const target of [...body.matchAll(/\]\(([a-z0-9-]+\.md)\)/g)].map((m) => m[1])) {
      assert.ok(
        existsSync(path.join(designRoot, target)),
        `design/${doc} links to missing design/${target}`,
      );
    }
  }
});

test("every document keeps the house structure", () => {
  for (const doc of DOCS) {
    const body = read(doc);
    assert.match(body, /^# .+/m, `design/${doc} has no H1 title`);
    assert.ok(
      /^## \d+\. /m.test(body),
      `design/${doc} has no numbered sections`,
    );
    assert.ok(
      body.includes("Related within this reference series"),
      `design/${doc} is missing its series cross-reference footer`,
    );
    assert.ok(
      body.includes("Related in this project"),
      `design/${doc} is missing its project cross-reference footer`,
    );
  }
});

test("every document carries evidence tags", () => {
  // [E] empirical, [T] theory, [C] craft, [Q] contested. Compounds like
  // [T/Q] and [C/Q] are legal. A document with none has lost the convention
  // that separates a tested finding from a practitioner's opinion.
  for (const doc of DOCS) {
    assert.match(
      read(doc),
      /\[(E|T|C|Q)(\/[ETCQ])?\]/,
      `design/${doc} carries no [E]/[T]/[C]/[Q] evidence tags`,
    );
  }
});

test("every document states it is not a decision document", () => {
  // The library informs creative calls; it never makes them. Losing this
  // disclaimer is how a reference doc starts getting cited as authority.
  // Wording varies across authors ("None of this is a decision document",
  // "nothing here overrides...", "never override"), so match the two phrase
  // families rather than a fixed list of sentences.
  for (const doc of DOCS) {
    const body = read(doc);
    const saysDecisionDocument = /decision document/i.test(body);
    const negatesAuthority =
      /\b(never|nothing|not|no|none)\b[^.\n]{0,80}(overrid|resolve|decid|answer)/i.test(body);
    assert.ok(
      saysDecisionDocument || negatesAuthority,
      `design/${doc} is missing its not-a-decision disclaimer`,
    );
  }
});

test("the five founding documents point forward to the index", () => {
  // Added when the library grew past the original five. Without this a reader
  // entering at a founding document never learns the other eleven exist.
  const founding = [
    "narrative-theory-foundations.md",
    "agency-and-player-choice.md",
    "ttrpg-campaign-and-session-craft.md",
    "quests-objectives-and-threads.md",
    "pacing-and-the-responsive-campaign.md",
  ];
  for (const doc of founding) {
    assert.ok(
      read(doc).includes(INDEX),
      `design/${doc} does not link forward to design/${INDEX}`,
    );
  }
});

test("the index router covers every writing task it claims to", () => {
  // §1 is the whole point of the index: a task with no row is a task that
  // silently gets written with no reference consulted.
  const index = read(INDEX);
  const router = index.slice(index.indexOf("## 1."), index.indexOf("## 2."));
  for (const task of [
    "A scene",
    "An NPC",
    "A location",
    "A mystery",
    "A session or chapter",
    "A rule, mechanic or subsystem",
    "Downtime",
    "Character creation",
    "Dialogue",
    "Lore",
    "mecha",
    "Player-facing description",
    "GM-facing instructions",
    "A name for anything",
  ]) {
    assert.ok(router.includes(task), `router has no row for: ${task}`);
  }
});
