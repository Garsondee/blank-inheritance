/**
 * Filesystem side of the audio pipeline: finding sources, hashing, and the
 * on-disk cache that keeps a re-run from re-reading 8 GB of WAV.
 *
 * The cache lives under audio/.pipeline-cache/ — inside the gitignored audio/
 * tree, next to the material it describes, and safe to delete at any time
 * (the next run just rebuilds it, slowly).
 */

import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

export const SOURCE_EXTENSIONS = new Set([".wav", ".mp3", ".flac", ".ogg", ".oga", ".opus", ".m4a", ".aif", ".aiff", ".wma"]);

/** Every audio file under `root`, as forward-slash paths relative to it, in a stable order. */
export function listAudioFiles(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (SOURCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        const st = statSync(full);
        out.push({ relPath: path.relative(root, full).split(path.sep).join("/"), full, size: st.size, mtimeMs: Math.floor(st.mtimeMs) });
      }
    }
  };
  if (existsSync(root)) walk(root);
  return out.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

export function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(file, { highWaterMark: 4 * 1024 * 1024 })
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });
}

export function readJson(file, fallback = null) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(readFileSync(file, "utf8"));
}

/**
 * Pretty JSON, trailing newline, written atomically (temp file then rename).
 *
 * The temp name carries a counter, not just the target name: several workers
 * checkpointing the same file at once raced on a shared `<file>.tmp`, and
 * Windows failed the rename with EPERM — found live 2026-09-17 mid-encode. It
 * cost one asset its record (the audio itself had already been written), and
 * looked exactly like an ffmpeg failure in the run's summary.
 */
let tmpCounter = 0;
export function writeJson(file, data) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${tmpCounter++}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  renameSync(tmp, file);
}

/**
 * A small persistent cache: one JSON file per namespace. `get`/`set` are
 * in-memory; `flush` writes. The pipeline flushes periodically so an
 * interrupted multi-minute run keeps what it already measured.
 */
export function openCache(dir, namespace) {
  const file = path.join(dir, `${namespace}.json`);
  const data = readJson(file, {}) ?? {};
  let dirty = false;
  return {
    get: (key) => data[key],
    set(key, value) {
      data[key] = value;
      dirty = true;
    },
    flush() {
      if (!dirty) return;
      writeJson(file, data);
      dirty = false;
    }
  };
}

/**
 * sha256 of a source, reusing the cached hash when the file's size and
 * modification time are unchanged. Hashing the whole in-tray from cold takes
 * minutes; this makes every later run take seconds.
 */
export async function cachedSha256(hashCache, file) {
  const cached = hashCache.get(file.relPath);
  if (cached && cached.size === file.size && cached.mtimeMs === file.mtimeMs && cached.sha256) return cached.sha256;
  const sha256 = await sha256File(file.full);
  hashCache.set(file.relPath, { size: file.size, mtimeMs: file.mtimeMs, sha256 });
  return sha256;
}

/** Run async jobs with bounded concurrency, preserving input order in the results. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
