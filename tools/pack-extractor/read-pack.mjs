/**
 * Standalone reader for Foundry VTT compendium packs stored as LevelDB.
 *
 * A pack's data lives in two places and this reads both. The write-ahead log
 * (`NNNNNN.log`) holds recent writes; once LevelDB compacts, those writes move
 * into SSTables (`NNNNNN.ldb`) and the log is emptied. This file handles the
 * log; read-table.mjs handles the tables; `readPackEntries` merges them.
 *
 * It used to handle only the log, on the stated grounds that no shipped sf2e
 * pack had ever been compacted. That stopped being true -- every pack under
 * gamesystems/sf2e/packs/ is now a zero-byte log beside a several-hundred-
 * kilobyte .ldb -- and the failure was silent: no error, an empty document
 * list, and sixty-four tests reporting missing pregens and null actors, which
 * reads like missing content and was nothing of the kind. The lesson is in the
 * shape of the bug rather than the bug: "this case does not occur" was true
 * when written and had no way to announce that it had stopped being true.
 *
 * Implements just enough of the LevelDB log format (leveldb/db/log_format.h,
 * log_reader.cc, write_batch.cc) to recover the Put entries: 32KB blocks of
 * length-prefixed records, reassembled across First/Middle/Last fragments,
 * each logical record a WriteBatch (sequence + count + tagged key/value
 * entries with varint-prefixed lengths). Checksums are read but not
 * verified — this is a read-only extraction of trusted, shipped game data,
 * not a correctness-critical database client.
 *
 * Foundry's own key format (verified empirically against real packs, not
 * assumed): `!<collection>!<id>` for a top-level document (e.g.
 * `!actors!abc123`), `!<collection>.<embedded>!<parentId>.<embeddedId>` for
 * an embedded document (e.g. `!actors.items!abc123.def456`). Values are
 * UTF-8 JSON text.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { readTableEntries } from "./read-table.mjs";

const BLOCK_SIZE = 32768;
const HEADER_SIZE = 7; // checksum(4) + length(2) + type(1)
const RECORD_TYPE = { ZERO: 0, FULL: 1, FIRST: 2, MIDDLE: 3, LAST: 4 };

/** Split a raw .log file into reassembled logical records (one per WriteBatch). */
function readLogRecords(buf) {
  const records = [];
  let fragments = [];
  let offset = 0;

  while (offset < buf.length) {
    const blockEnd = Math.min(offset + BLOCK_SIZE, buf.length);
    let pos = offset;

    while (blockEnd - pos >= HEADER_SIZE) {
      const length = buf.readUInt16LE(pos + 4);
      const type = buf.readUInt8(pos + 6);
      const dataStart = pos + HEADER_SIZE;
      const dataEnd = dataStart + length;
      if (type === RECORD_TYPE.ZERO || dataEnd > blockEnd) break; // padding / truncated trailer — stop this block

      const data = buf.subarray(dataStart, dataEnd);
      if (type === RECORD_TYPE.FULL) {
        records.push(data);
        fragments = [];
      } else if (type === RECORD_TYPE.FIRST) {
        fragments = [data];
      } else if (type === RECORD_TYPE.MIDDLE) {
        fragments.push(data);
      } else if (type === RECORD_TYPE.LAST) {
        fragments.push(data);
        records.push(Buffer.concat(fragments));
        fragments = [];
      }
      pos = dataEnd;
    }
    offset += BLOCK_SIZE;
  }
  return records;
}

/** Read a protobuf-style unsigned LEB128 varint. Returns [value, bytesConsumed]. */
function readVarint(buf, offset) {
  let result = 0;
  let shift = 0;
  let pos = offset;
  for (;;) {
    const byte = buf.readUInt8(pos);
    result |= (byte & 0x7f) << shift;
    pos += 1;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return [result >>> 0, pos - offset];
}

const TAG = { DELETE: 0, VALUE: 1 };

/** Decode one WriteBatch's Put entries (Deletes are skipped — extraction only cares about live values). */
function decodeWriteBatch(record) {
  const puts = [];
  if (record.length < 12) return puts; // smaller than seq(8)+count(4) — not a real batch
  let pos = 12; // skip 8-byte sequence number + 4-byte count; we just walk until the buffer ends
  while (pos < record.length) {
    const tag = record.readUInt8(pos);
    pos += 1;
    const [keyLen, keyLenBytes] = readVarint(record, pos);
    pos += keyLenBytes;
    const key = record.subarray(pos, pos + keyLen).toString("utf8");
    pos += keyLen;
    if (tag === TAG.VALUE) {
      const [valLen, valLenBytes] = readVarint(record, pos);
      pos += valLenBytes;
      const value = record.subarray(pos, pos + valLen).toString("utf8");
      pos += valLen;
      puts.push({ key, value });
    } else if (tag === TAG.DELETE) {
      // no value payload to skip
    } else {
      break; // unrecognized tag — stop rather than misparse the rest of this batch
    }
  }
  return puts;
}

/**
 * Read every Put entry currently live in a pack folder (later writes for the
 * same key overwrite earlier ones, matching LevelDB's own last-write-wins
 * semantics within a replayed WAL).
 */
export function readPackEntries(packDir) {
  const latest = new Map();

  // Compacted tables first, oldest file number first: a higher number is a
  // later write, and the write-ahead log is later than all of them. Applying
  // them in that order makes the last write for a key win, which is LevelDB's
  // own semantics without having to reconcile sequence numbers across two
  // different on-disk formats.
  for (const tablePath of findTables(packDir)) {
    for (const { key, value } of readTableEntries(tablePath)) {
      latest.set(key, value);
    }
  }

  const logPath = findWriteAheadLog(packDir, { required: latest.size === 0 });
  if (logPath) {
    for (const record of readLogRecords(readFileSync(logPath))) {
      for (const { key, value } of decodeWriteBatch(record)) {
        latest.set(key, value);
      }
    }
  }

  if (latest.size === 0) {
    throw new Error(
      `${path.basename(packDir)}: no entries in either the write-ahead log or `
      + `any SSTable. The pack is present but reads as empty, which is more `
      + `likely a reader fault than a genuinely empty compendium.`);
  }
  return [...latest.entries()].map(([key, value]) => ({ key, value }));
}

/** Every compacted SSTable in a pack, oldest file number first. */
export function findTables(packDir) {
  return readdirSync(packDir)
    .filter((name) => /^\d+\.ldb$/.test(name))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
    .map((name) => path.join(packDir, name));
}

/**
 * The pack's live write-ahead log.
 *
 * LevelDB renames its WAL every time the database is opened — 000003.log
 * becomes 000006.log becomes 000028.log — and keeps exactly one live at a
 * time. This used to be hard-coded as "000003.log", which meant every one of
 * these extractors broke the moment somebody launched their local Foundry,
 * with an ENOENT naming a file that had simply been renumbered. 64 tests were
 * failing on it.
 *
 * Highest number wins: LevelDB deletes superseded logs, so in practice there
 * is one, and if a crash ever leaves two behind the newer is the live one.
 *
 * KNOWN LIMIT, and it is not fixed here: this reads the WAL only. Once LevelDB
 * compacts, entries move out of the log and into .ldb SSTables, and those are
 * invisible to this reader — a compacted pack would come back quietly short
 * rather than erroring. Every pack in the shipped tree currently carries its
 * whole content in the WAL, which is why this has worked at all. Parsing
 * SSTables is a real piece of work and wants its own change.
 */
export function findWriteAheadLog(packDir, { required = true } = {}) {
  const logs = readdirSync(packDir)
    .filter((name) => /^\d+\.log$/.test(name))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  if (!logs.length) {
    if (!required) return null;
    throw new Error(
      `no LevelDB write-ahead log in ${packDir} — expected a NNNNNN.log file, `
      + `and no SSTable supplied any entries either.`);
  }
  return path.join(packDir, logs[logs.length - 1]);
}

const KEY_PATTERN = /^!([a-zA-Z._]+)!(.+)$/;

/** Parse Foundry's `!<collection>!<id>` / `!<collection>.<embedded>!<parentId>.<embeddedId>` key format and JSON-decode the value. */
export function readPackDocuments(packDir) {
  const entries = readPackEntries(packDir);
  const documents = [];
  const malformed = [];
  for (const { key, value } of entries) {
    const match = KEY_PATTERN.exec(key);
    if (!match) { malformed.push({ key, reason: "key did not match !collection!id pattern" }); continue; }
    const [, collection, idPart] = match;
    let doc;
    try {
      doc = JSON.parse(value);
    } catch (err) {
      malformed.push({ key, reason: `JSON parse failed: ${err.message}` });
      continue;
    }
    documents.push({ key, collection, idPart, embedded: collection.includes("."), doc });
  }
  return { documents, malformed };
}
