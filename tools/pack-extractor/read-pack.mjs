/**
 * Standalone reader for Foundry VTT compendium packs stored as raw LevelDB
 * write-ahead logs (a pack that has never been compacted has all of its
 * data in `000003.log` — no `.ldb` SST files at all, which is exactly what
 * every pack under gamesystems/sf2e/packs/ looks like). No `.ldb` reader is
 * implemented here on purpose: every shipped sf2e pack fits this case, and
 * adding SST-table parsing for a case that doesn't occur would be
 * unjustified complexity for what this tool actually needs to do.
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
  const logPath = findWriteAheadLog(packDir);
  const buf = readFileSync(logPath);
  if (buf.length === 0) {
    // Not "no data" — data that has MOVED. Silence here is the dangerous
    // outcome: callers get an empty document list and report a missing
    // pregen or a null actor, which reads like a content problem and is not.
    const tables = readdirSync(packDir).filter((n) => /\.ldb$/.test(n));
    throw new Error(
      `${path.basename(packDir)}: the write-ahead log ${path.basename(logPath)} `
      + `is empty and this pack has ${tables.length} compacted SSTable(s) `
      + `(${tables.join(", ") || "none"}). LevelDB has compacted the pack, so its `
      + `contents now live in .ldb files, which this reader does not parse. `
      + `This happens once Foundry has opened the database enough times. `
      + `Nothing is lost — the extractor needs an SSTable reader.`);
  }
  const records = readLogRecords(buf);
  const latest = new Map();
  for (const record of records) {
    for (const { key, value } of decodeWriteBatch(record)) {
      latest.set(key, value);
    }
  }
  return [...latest.entries()].map(([key, value]) => ({ key, value }));
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
export function findWriteAheadLog(packDir) {
  const logs = readdirSync(packDir)
    .filter((name) => /^\d+\.log$/.test(name))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  if (!logs.length) {
    throw new Error(
      `no LevelDB write-ahead log in ${packDir} — expected a NNNNNN.log file. `
      + `If the pack has been compacted its contents are in .ldb SSTables, `
      + `which this reader does not parse.`);
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
