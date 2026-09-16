// Shared structural lint for the source-research shelves under design/research/.
//
// A shelf is a close reading of a work this campaign draws on: one index
// (README.md), a set of thematic documents, and one file per character in
// characters/. Nothing executes any of it, so a renamed file, a dropped
// sources footer, or a link into a file that never got written rots silently
// until someone follows it mid-prep.
//
// Both shelves are checked by the same rules, from here, for the same reason
// test/support/sf2e-template.mjs is shared between two tests: two copies of a
// lint drift, and the drift is invisible until the day it matters. The shelf's
// own test file supplies the manifest and adds any shelf-specific checks.
//
// See design/craft-library.md §5 for what a research shelf is and why its
// discipline (research, never lore; [S]/[R]/[U] tags) is load-bearing.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");

const INDEX = "README.md";

/** Resolve a shelf's roots and the full list of its documents. */
export function shelfPaths({ slug, thematic, characters }) {
  const shelfRoot = path.join(repoRoot, "design", "research", slug);
  const charactersRoot = path.join(shelfRoot, "characters");
  const documents = [
    ...[INDEX, ...thematic].map((f) => ({
      label: `design/research/${slug}/${f}`,
      file: path.join(shelfRoot, f),
    })),
    ...characters.map((f) => ({
      label: `design/research/${slug}/characters/${f}`,
      file: path.join(charactersRoot, f),
    })),
  ];
  return { shelfRoot, charactersRoot, documents, index: INDEX };
}

/**
 * Register the checks every research shelf must pass.
 *
 * @param {object} config
 * @param {string} config.slug        directory under design/research/
 * @param {string[]} config.thematic  thematic documents, as the index's §3 lists them
 * @param {string[]} config.characters character files, as the index's §4 lists them
 * @param {string[]} config.routerTasks substrings the index's §2 router must cover
 */
export function registerCommonShelfTests({ slug, thematic, characters, routerTasks }) {
  const { shelfRoot, charactersRoot, documents } = shelfPaths({ slug, thematic, characters });
  const readShelf = (file) => readFileSync(path.join(shelfRoot, file), "utf8");
  const readCharacter = (file) => readFileSync(path.join(charactersRoot, file), "utf8");

  test(`${slug}: every shelf document exists`, () => {
    for (const { label, file } of documents) {
      assert.ok(existsSync(file), `missing: ${label}`);
    }
  });

  test(`${slug}: the shelf contains nothing the index does not list`, () => {
    // The reverse of the check above: a file written and never indexed is a
    // file nobody will ever read.
    for (const file of readdirSync(shelfRoot).filter((f) => f.endsWith(".md"))) {
      assert.ok(
        file === INDEX || thematic.includes(file),
        `design/research/${slug}/${file} exists but is not a listed thematic document`,
      );
    }
    for (const file of readdirSync(charactersRoot).filter((f) => f.endsWith(".md"))) {
      assert.ok(
        characters.includes(file),
        `design/research/${slug}/characters/${file} exists but is not a listed character`,
      );
    }
  });

  test(`${slug}: the index lists every document`, () => {
    const index = readShelf(INDEX);
    for (const doc of thematic) {
      assert.ok(index.includes(doc), `the ${slug} index never mentions ${doc}`);
    }
    for (const doc of characters) {
      assert.ok(
        index.includes(`characters/${doc}`),
        `the ${slug} index never mentions characters/${doc}`,
      );
    }
  });

  test(`${slug}: no markdown link on the shelf is broken`, () => {
    // Links are relative, and files reach back out with ../ and ../../ (to
    // design/craft-library.md, its siblings, and the other shelf), so each is
    // resolved against its own directory rather than against the shelf root.
    for (const { label, file } of documents) {
      const dir = path.dirname(file);
      for (const target of [...readFileSync(file, "utf8").matchAll(/\]\(([^)\s]+\.md)\)/g)].map(
        (m) => m[1],
      )) {
        assert.ok(existsSync(path.resolve(dir, target)), `${label} links to missing ${target}`);
      }
    }
  });

  test(`${slug}: every document keeps the house structure`, () => {
    for (const { label, file } of documents) {
      const body = readFileSync(file, "utf8");
      assert.match(body, /^# .+/m, `${label} has no H1 title`);
      assert.ok(/^## \d+\. /m.test(body), `${label} has no numbered sections`);
      assert.ok(
        /\*\*Sources:?\*\*|## \d+\. Sources/.test(body),
        `${label} is missing its sources footer`,
      );
    }
  });

  test(`${slug}: every document carries evidence tags`, () => {
    // [S] source, [R] reading, [U] use. A document with none has lost the
    // convention that separates what the source did from what we think about
    // it and from what we might do here.
    for (const { label, file } of documents) {
      assert.match(
        readFileSync(file, "utf8"),
        /\*\*\[(S|R|U)\]/,
        `${label} carries no [S]/[R]/[U] evidence tags`,
      );
    }
  });

  test(`${slug}: every document states that it is research rather than lore or decision`, () => {
    // A shelf describes another creator's work. Nothing in it exists in our
    // setting and nothing in it settles an open question. Losing this sentence
    // is how a reference file starts getting quoted as canon.
    for (const { label, file } of documents) {
      const body = readFileSync(file, "utf8");
      const saysNotDecision = /not a decision document/i.test(body);
      const saysNotLore = /research, not lore/i.test(body) || /none of it is lore/i.test(body);
      assert.ok(saysNotDecision || saysNotLore, `${label} is missing its research-not-lore disclaimer`);
    }
  });

  test(`${slug}: every character file points back to the index`, () => {
    for (const doc of characters) {
      assert.ok(
        readCharacter(doc).includes("(../README.md)"),
        `${slug}/characters/${doc} does not link back to the shelf index`,
      );
    }
  });

  test(`${slug}: every character file carries the archetype the catalogue promises`, () => {
    // The catalogue is each shelf's deliverable: it claims every character
    // file supplies a named archetype and a single rule for playing it. If a
    // character file loses either, the catalogue row it backs is a dead end.
    for (const doc of characters) {
      const body = readCharacter(doc);
      assert.ok(body.includes("**Name:**"), `${slug}/characters/${doc} names no archetype`);
      assert.ok(
        body.includes("**The one rule:**"),
        `${slug}/characters/${doc} states no one rule for playing the archetype`,
      );
    }
  });

  test(`${slug}: the catalogue links to every character file it draws an archetype from`, () => {
    const catalogue = readShelf("npc-archetype-catalogue.md");
    for (const doc of characters) {
      assert.ok(
        catalogue.includes(`characters/${doc}`),
        `${slug}/npc-archetype-catalogue.md never cites characters/${doc}`,
      );
    }
  });

  test(`${slug}: the index router covers the tasks the shelf was gathered for`, () => {
    const index = readShelf(INDEX);
    const router = index.slice(index.indexOf("## 2."), index.indexOf("## 3."));
    for (const task of routerTasks) {
      assert.ok(router.includes(task), `the ${slug} router has no row for: ${task}`);
    }
  });
}
