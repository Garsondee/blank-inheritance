/**
 * Tests the LevelDB write-ahead-log reader against the real, shipped sf2e
 * compendium packs — not a synthetic fixture, because the entire point of
 * this parser is correctly reading Foundry's actual on-disk format
 * (leveldb/db/log_format.h framing + WriteBatch encoding). If it silently
 * misparsed a real pack, a fixture built to match the parser's own
 * assumptions would never catch that.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readPackDocuments } from "../../tools/pack-extractor/read-pack.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const iconicsDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "iconics");
const pregensDir = path.join(repoRoot, "gamesystems", "sf2e", "packs", "paizo-pregens");

test("readPackDocuments: parses the real iconics pack with zero malformed entries", () => {
  const { documents, malformed } = readPackDocuments(iconicsDir);
  assert.equal(malformed.length, 0, `expected 0 malformed entries, got: ${JSON.stringify(malformed.slice(0, 3))}`);
  assert.ok(documents.length > 0, "expected at least one document");
  assert.ok(documents.every((d) => d.doc && typeof d.doc === "object"), "every parsed entry must have decoded JSON");
});

test("readPackDocuments: recognizes both top-level and embedded document keys", () => {
  const { documents } = readPackDocuments(iconicsDir);
  const collections = new Set(documents.map((d) => d.collection));
  assert.ok(collections.has("actors"), "expected top-level actor documents");
  assert.ok(collections.has("actors.items"), "expected embedded item documents");
  assert.ok(documents.some((d) => d.embedded), "at least one document must be flagged embedded");
  assert.ok(documents.some((d) => !d.embedded), "at least one document must be flagged top-level");
});

test("readPackDocuments: iconics contains all six Player Core classes at level 1 (one iconic per class)", () => {
  const { documents } = readPackDocuments(iconicsDir);
  const level1 = documents.filter((d) => !d.embedded && d.doc.type === "character" && d.doc.system?.details?.level?.value === 1);
  assert.equal(level1.length, 6, `expected 6 level-1 iconics, found ${level1.length}`);
});

test("readPackDocuments: paizo-pregens (Adventure Pregens) also contains all six Player Core classes at level 1", () => {
  const { documents } = readPackDocuments(pregensDir);
  const level1 = documents.filter((d) => !d.embedded && d.doc.type === "character" && d.doc.system?.details?.level?.value === 1);
  const classes = new Set();
  for (const actor of level1) {
    const items = documents.filter((e) => e.embedded && e.collection === "actors.items" && e.idPart.startsWith(actor.idPart + "."));
    const classItem = items.find((i) => i.doc.type === "class");
    if (classItem) classes.add(classItem.doc.name);
  }
  assert.equal(classes.size, 6, `expected 6 distinct classes among level-1 pregens, found: ${[...classes].join(", ")}`);
});

test("readPackDocuments: a directory that is not a pack throws a clear error rather than silently returning nothing", () => {
  // The packs ROOT is a directory of packs, not a pack: no write-ahead log,
  // no SSTables, nothing to read.
  //
  // This used to assert /ENOENT|no such file/, which pinned the test to the
  // errno readFileSync happened to raise rather than to the behaviour the
  // test is named for. Adding the SSTable reader replaced that errno with a
  // sentence, and a test that fails when an error message gets BETTER is
  // testing the wrong thing. What matters is that it throws, and that the
  // message says where and what in words somebody can act on.
  assert.throws(
    () => readPackDocuments(path.join(repoRoot, "gamesystems", "sf2e", "packs")),
    (err) => {
      assert.match(err.message, /write-ahead log|SSTable|ENOENT/,
        "the error should name what it went looking for");
      assert.ok(err.message.length > 30,
        `expected an explanation, got ${JSON.stringify(err.message)}`);
      return true;
    });
});
