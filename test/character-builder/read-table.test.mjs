// Tier 3 — the LevelDB SSTable reader, and the Snappy it needs.
//
// This exists because the extractor's previous silence was the actual bug. The
// write-ahead log emptied, the content moved into .ldb tables, and the reader
// returned an empty list rather than an error — so sixty-four tests reported
// missing pregens and null actors and pointed at the wrong thing entirely.
//
// Two kinds of test, on purpose:
//
//   Hand-built bytes  Snappy and the block format are checked against blobs
//                     written out by hand from the format documents, so a
//                     failure says which part of the format is wrong.
//   The real packs    Every pack in the shipped tree is opened. That is the
//                     test that would have caught the original problem, and
//                     it skips loudly when the gitignored tree is absent.
//
// Reader: tools/pack-extractor/read-table.mjs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  snappyDecompress, decodeInternalKey, readTableEntries, ENTRY_TYPE,
} from "../../tools/pack-extractor/read-table.mjs";
import { readPackDocuments, findTables } from "../../tools/pack-extractor/read-pack.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const PACKS = join(repoRoot, "gamesystems", "sf2e", "packs");

/** A raw (unframed) snappy stream: varint length, then elements. */
function snappy(uncompressedLength, ...elements) {
  const head = [];
  let n = uncompressedLength;
  while (n >= 0x80) { head.push((n & 0x7f) | 0x80); n >>>= 7; }
  head.push(n);
  return Buffer.from([...head, ...elements.flat()]);
}

const literal = (text) => {
  const bytes = Buffer.from(text, "utf8");
  assert.ok(bytes.length <= 60, "helper only writes short literals");
  return [(bytes.length - 1) << 2, ...bytes];
};

// --- snappy ------------------------------------------------------------------

test("snappy: a single literal", () => {
  assert.equal(snappyDecompress(snappy(5, literal("hello"))).toString(), "hello");
});

test("snappy: a one-byte-offset copy repeats earlier output", () => {
  // "abc" then copy 4 bytes from offset 3 -> "abcabca"
  const tag = (1 << 0) | ((4 - 4) << 2) | ((3 >> 8) << 5);
  const blob = snappy(7, literal("abc"), [tag, 3 & 0xff]);
  assert.equal(snappyDecompress(blob).toString(), "abcabca");
});

test("snappy: a copy may overlap its own output — that is how runs are encoded", () => {
  // "a", then copy 9 bytes from offset 1. A bulk move would read bytes that
  // have not been written yet; byte-at-a-time produces "aaaaaaaaaa".
  const tag = 1 | ((9 - 4) << 2);
  const blob = snappy(10, literal("a"), [tag, 1]);
  assert.equal(snappyDecompress(blob).toString(), "aaaaaaaaaa");
});

test("snappy: a two-byte-offset copy", () => {
  const body = "0123456789".repeat(10);   // 100 bytes, needs a long literal
  const lengthMinusOne = body.length - 1;
  const long = [(60 << 2) | 0, lengthMinusOne, ...Buffer.from(body, "utf8")];
  const tag = 2 | ((10 - 1) << 2);
  const blob = snappy(110, long, [tag, 100 & 0xff, (100 >> 8) & 0xff]);
  const out = snappyDecompress(blob).toString();
  assert.equal(out.length, 110);
  assert.equal(out.slice(0, 100), body);
  assert.equal(out.slice(100), "0123456789");
});

test("snappy: a short read is an error, not a truncated buffer", () => {
  assert.throws(() => snappyDecompress(snappy(99, literal("hello"))),
    /produced 5 bytes, header promised 99/);
});

test("snappy: a copy offset pointing before the output start is refused", () => {
  const tag = 1 | ((4 - 4) << 2);
  assert.throws(() => snappyDecompress(snappy(4, [tag, 9])), /out of range/);
});

// --- internal keys -----------------------------------------------------------

test("internal key: user key, sequence and type are unpacked", () => {
  const trailer = Buffer.alloc(8);
  trailer[0] = ENTRY_TYPE.VALUE;
  trailer.writeUIntLE(0x2a3b4c, 1, 6);     // sequence, 56 bits little-endian
  const key = Buffer.concat([Buffer.from("!actors!abc", "utf8"), trailer]);

  const got = decodeInternalKey(key);
  assert.equal(got.userKey.toString(), "!actors!abc");
  assert.equal(got.type, ENTRY_TYPE.VALUE);
  assert.equal(got.sequence, 0x2a3b4c);
});

test("internal key: a deletion tombstone is distinguishable from a value", () => {
  const make = (type) => {
    const trailer = Buffer.alloc(8);
    trailer[0] = type;
    return decodeInternalKey(Buffer.concat([Buffer.from("k", "utf8"), trailer]));
  };
  assert.equal(make(ENTRY_TYPE.VALUE).type, ENTRY_TYPE.VALUE);
  assert.equal(make(ENTRY_TYPE.DELETION).type, ENTRY_TYPE.DELETION);
});

test("internal key: a key shorter than its trailer is an error", () => {
  assert.throws(() => decodeInternalKey(Buffer.from("short")), /8-byte trailer/);
});

// --- the real shipped packs --------------------------------------------------

const havePacks = existsSync(PACKS);

test("every shipped pack opens, and none of them comes back empty", { skip: !havePacks && "gamesystems/sf2e/packs is not present (gitignored)" }, () => {
  const packs = readdirSync(PACKS).filter((n) => statSync(join(PACKS, n)).isDirectory());
  assert.ok(packs.length > 10, `expected the sf2e pack set, found ${packs.length}`);

  const empty = [];
  const broken = [];
  for (const name of packs) {
    try {
      const { documents, malformed } = readPackDocuments(join(PACKS, name));
      if (!documents.length) empty.push(name);
      if (malformed.length) broken.push(`${name}: ${malformed.length} malformed`);
    } catch (err) {
      broken.push(`${name}: ${err.message}`);
    }
  }
  assert.deepEqual(broken, [], "packs that failed to read");
  assert.deepEqual(empty, [], "packs that read as empty — the original silent failure");
});

test("the packs really are compacted, so this is reading tables and not the log", { skip: !havePacks && "packs not present" }, () => {
  // If this ever stops being true the coverage above is weaker than it looks:
  // it would be passing on the write-ahead path and never touching an SSTable.
  const withTables = readdirSync(PACKS)
    .filter((n) => statSync(join(PACKS, n)).isDirectory())
    .filter((n) => findTables(join(PACKS, n)).length > 0);
  assert.ok(withTables.length > 0,
    "no pack has an .ldb file — the SSTable reader is not being exercised");
});

test("a known pregen comes back whole, with its embedded items", { skip: !havePacks && "packs not present" }, () => {
  const { documents } = readPackDocuments(join(PACKS, "paizo-pregens"));
  const actors = documents.filter((d) => d.collection === "actors");
  const names = actors.map((a) => a.doc.name);
  assert.ok(names.includes("Lunar-17"), `Lunar-17 missing from: ${names.join(", ")}`);

  const lunar = actors.find((a) => a.doc.name === "Lunar-17");
  const items = documents.filter(
    (d) => d.collection === "actors.items" && d.idPart.startsWith(lunar.idPart + "."));
  assert.ok(items.length > 5,
    `expected Lunar-17 to carry real embedded items, found ${items.length}`);
});

test("reading a directory that is not a table is an error naming the file", { skip: !havePacks && "packs not present" }, () => {
  const notATable = join(PACKS, "paizo-pregens", "CURRENT");
  assert.throws(() => readTableEntries(notATable), /too short|bad table magic/);
});
