/**
 * Reader for LevelDB SSTables (`.ldb`), the other half of a Foundry pack.
 *
 * Why this exists. `read-pack.mjs` reads a pack's write-ahead log, and for a
 * long time that was enough: a pack that has never been compacted keeps
 * everything in the log. Then LevelDB compacted, as it always eventually
 * does, and every WAL under gamesystems/sf2e/packs/ went to ZERO BYTES with
 * the content moved into `000005.ldb`. The extractor did not error -- it
 * returned nothing, and sixty-four tests reported missing pregens and null
 * actors, which looks exactly like a content problem and is not one.
 *
 * Why not just use LevelDB. Dependencies were explicitly allowed for this and
 * `classic-level` is the real thing, so the choice is worth recording rather
 * than assuming. It was turned down for two reasons that are about safety,
 * not purity:
 *
 *   1. It takes an exclusive LOCK on the database. This reads Ingram's live
 *      Foundry installation, and an extraction that fails whenever Foundry
 *      happens to be open -- or worse, that races it -- is a bad trade for a
 *      read-only job.
 *   2. Opening a LevelDB for real can WRITE: log recovery, compaction,
 *      MANIFEST rotation. Nothing here should ever modify a tree we do not
 *      own and cannot regenerate.
 *
 * Reading the bytes is strictly read-only, needs no native build, and cannot
 * disturb anything. The format is stable and documented (leveldb/table/*.cc).
 *
 * What is implemented, and it is the whole of what a pack needs:
 *
 *   Footer      fixed 48 bytes at end of file: metaindex handle, index
 *               handle, padding, 8-byte magic 0xdb4775248b80fb57.
 *   BlockHandle varint offset, varint size. The block's stored bytes are
 *               followed by a 1-byte compression type and a 4-byte CRC.
 *   Block       prefix-compressed entries, then a restart array of uint32
 *               offsets, then a uint32 count. Each entry is varint shared,
 *               varint unshared, varint value length, the key delta, value.
 *   InternalKey user key + 8-byte trailer packing (sequence << 8 | type),
 *               type 1 = value, type 0 = deletion tombstone.
 *   Snappy      block compression. Implemented below; it is sixty lines and
 *               avoiding it was not worth a dependency either.
 *
 * CRCs are read past, not verified, matching read-pack.mjs: this is a
 * read-only extraction of trusted shipped game data, not a database client.
 */

import { readFileSync } from "node:fs";

const FOOTER_LENGTH = 48;
const MAGIC_HIGH = 0xdb477524;
const MAGIC_LOW = 0x8b80fb57;

const COMPRESSION = { NONE: 0, SNAPPY: 1, ZLIB: 2, BZIP2: 3, LZ4: 4, LZ4HC: 5, ZSTD: 6 };
const COMPRESSION_NAME = ["none", "snappy", "zlib", "bzip2", "lz4", "lz4hc", "zstd"];

/** Value types in an internal key's trailer. */
export const ENTRY_TYPE = { DELETION: 0, VALUE: 1 };

// --- primitives --------------------------------------------------------------

/** LevelDB varint32/64. Returns [value, nextOffset]; values fit in a JS number
 *  here because every length in a pack is far below 2^53. */
function readVarint(buf, offset) {
  let result = 0;
  let shift = 0;
  let pos = offset;
  while (pos < buf.length) {
    const byte = buf[pos];
    pos += 1;
    result += (byte & 0x7f) * 2 ** shift;
    if ((byte & 0x80) === 0) return [result, pos];
    shift += 7;
    if (shift > 63) break;
  }
  throw new Error(`malformed varint at offset ${offset}`);
}

/**
 * Snappy decompression (framing-free "raw" form, which is what LevelDB stores).
 *
 * Preamble is a varint of the uncompressed length; then a stream of elements,
 * each introduced by a tag byte whose low two bits give its kind. Literals
 * copy forward from the input; copies copy backward from what has already been
 * produced, and may legally overlap their own output, which is why the copy
 * loop is byte-at-a-time rather than a subarray move.
 */
export function snappyDecompress(input) {
  const [expectedLength, start] = readVarint(input, 0);
  const out = Buffer.allocUnsafe(expectedLength);
  let ip = start;
  let op = 0;

  while (ip < input.length) {
    const tag = input[ip];
    const kind = tag & 0x03;

    if (kind === 0) {
      // Literal. Length-1 lives in the top six bits, or, for 60..63, in that
      // many following little-endian bytes.
      let length = tag >> 2;
      ip += 1;
      if (length >= 60) {
        const extra = length - 59;
        length = 0;
        for (let i = 0; i < extra; i += 1) length += input[ip + i] * 2 ** (8 * i);
        ip += extra;
      }
      length += 1;
      input.copy(out, op, ip, ip + length);
      ip += length;
      op += length;
      continue;
    }

    let length;
    let offset;
    if (kind === 1) {
      length = 4 + ((tag >> 2) & 0x07);
      offset = ((tag >> 5) << 8) | input[ip + 1];
      ip += 2;
    } else if (kind === 2) {
      length = 1 + (tag >> 2);
      offset = input.readUInt16LE(ip + 1);
      ip += 3;
    } else {
      length = 1 + (tag >> 2);
      offset = input.readUInt32LE(ip + 1);
      ip += 5;
    }

    if (offset === 0 || offset > op) {
      throw new Error(`snappy: copy offset ${offset} out of range at output ${op}`);
    }
    // Byte at a time on purpose: a copy is allowed to overlap its own output
    // (that is how snappy encodes runs), so a bulk move would read bytes it
    // has not written yet.
    let src = op - offset;
    for (let i = 0; i < length; i += 1) out[op + i] = out[src + i];
    op += length;
  }

  if (op !== expectedLength) {
    throw new Error(`snappy: produced ${op} bytes, header promised ${expectedLength}`);
  }
  return out;
}

// --- table structure ---------------------------------------------------------

function readBlockHandle(buf, offset) {
  const [blockOffset, afterOffset] = readVarint(buf, offset);
  const [size, afterSize] = readVarint(buf, afterOffset);
  return { offset: blockOffset, size, next: afterSize };
}

/** The bytes of one block, decompressed if it was stored compressed. */
function readBlock(file, handle) {
  const start = handle.offset;
  const end = start + handle.size;
  if (end + 5 > file.length) {
    throw new Error(`block handle ${start}+${handle.size} runs past end of file`);
  }
  const stored = file.subarray(start, end);
  const compression = file[end];
  if (compression === COMPRESSION.NONE) return stored;
  if (compression === COMPRESSION.SNAPPY) return snappyDecompress(stored);
  throw new Error(
    `block at ${start} uses ${COMPRESSION_NAME[compression] || compression} `
    + `compression, which this reader does not implement`);
}

/**
 * Every key/value in one block, in order.
 *
 * Keys are prefix-compressed against the previous key, with the shared length
 * reset to zero at each restart point. The restart array and its count live at
 * the end of the block and are read only to find where the entries stop.
 */
function decodeBlock(block) {
  if (block.length < 4) return [];
  const restartCount = block.readUInt32LE(block.length - 4);
  const restartArrayStart = block.length - 4 - restartCount * 4;
  if (restartArrayStart < 0) {
    throw new Error(`block claims ${restartCount} restarts, which does not fit`);
  }

  const entries = [];
  let pos = 0;
  let previousKey = Buffer.alloc(0);
  while (pos < restartArrayStart) {
    const [shared, a] = readVarint(block, pos);
    const [unshared, b] = readVarint(block, a);
    const [valueLength, c] = readVarint(block, b);
    if (shared > previousKey.length) {
      throw new Error(`entry claims ${shared} shared bytes of a ${previousKey.length}-byte key`);
    }
    const key = Buffer.concat([
      previousKey.subarray(0, shared),
      block.subarray(c, c + unshared),
    ]);
    const valueStart = c + unshared;
    entries.push({ key, value: block.subarray(valueStart, valueStart + valueLength) });
    previousKey = key;
    pos = valueStart + valueLength;
  }
  return entries;
}

/** user key, sequence number and value type from an internal key. */
export function decodeInternalKey(key) {
  if (key.length < 8) throw new Error(`internal key shorter than its 8-byte trailer`);
  const userKey = key.subarray(0, key.length - 8);
  const trailer = key.subarray(key.length - 8);
  // sequence is 56 bits; well inside Number's exact-integer range.
  const type = trailer[0];
  let sequence = 0;
  for (let i = 7; i >= 1; i -= 1) sequence = sequence * 256 + trailer[i];
  return { userKey, sequence, type };
}

// --- the public entry point --------------------------------------------------

/**
 * Every live Put in one .ldb file, newest write per key.
 *
 * Deletion tombstones are honoured: a key whose newest record in this table is
 * a deletion comes back absent, not as an empty string. Within a single table
 * that is mostly theoretical, but getting it wrong would resurrect documents
 * Foundry had removed, which is exactly the kind of quiet wrongness this whole
 * exercise exists to stop.
 */
export function readTableEntries(tablePath) {
  const file = readFileSync(tablePath);
  if (file.length < FOOTER_LENGTH) {
    throw new Error(`${tablePath}: too short to be an SSTable`);
  }

  const footer = file.subarray(file.length - FOOTER_LENGTH);
  const magicLow = footer.readUInt32LE(FOOTER_LENGTH - 8);
  const magicHigh = footer.readUInt32LE(FOOTER_LENGTH - 4);
  if (magicLow !== MAGIC_LOW || magicHigh !== MAGIC_HIGH) {
    throw new Error(
      `${tablePath}: bad table magic -- expected LevelDB's 0xdb4775248b80fb57, `
      + `got 0x${magicHigh.toString(16)}${magicLow.toString(16)}`);
  }

  const metaindex = readBlockHandle(footer, 0);
  const index = readBlockHandle(footer, metaindex.next);

  const newest = new Map();   // user key -> { sequence, type, value }
  for (const indexEntry of decodeBlock(readBlock(file, index))) {
    // An index entry's value is the BlockHandle of a data block; its key is a
    // separator and is not needed to read sequentially.
    const handle = readBlockHandle(indexEntry.value, 0);
    for (const entry of decodeBlock(readBlock(file, handle))) {
      const { userKey, sequence, type } = decodeInternalKey(entry.key);
      const keyText = userKey.toString("utf8");
      const previous = newest.get(keyText);
      if (previous === undefined || sequence > previous.sequence) {
        newest.set(keyText, { sequence, type, value: entry.value.toString("utf8") });
      }
    }
  }

  const out = [];
  for (const [key, record] of newest) {
    if (record.type === ENTRY_TYPE.DELETION) continue;
    out.push({ key, value: record.value, sequence: record.sequence });
  }
  return out;
}
