/**
 * Local filesystem hashing. Real I/O (reads files from disk), but no
 * network and no child_process, so it's still fully testable against a
 * fixture directory -- deterministic given the same files, no external
 * process behavior to mock.
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/** SHA-256 of one file's contents, lowercase hex -- same format sha256sum prints. */
async function hashFile(absolutePath) {
  const contents = await readFile(absolutePath);
  return createHash("sha256").update(contents).digest("hex");
}

/**
 * Recursively lists every file under rootDir, hashing exactly what is on disk
 * rather than what git would show -- because what is on disk is what would get
 * pushed.
 *
 * `skip` is the one exception, and it exists for a real incident. The caller
 * may pass a predicate taking a POSIX-style path relative to rootDir; a
 * directory it returns true for is not descended into at all.
 *
 * WHY, 2026-09-22: sync-module.mjs already refuses to UPLOAD data/campaign/
 * (see its own comment -- a stray `cp -r /*` had dumped tens of thousands of
 * files into that local mirror on 2026-09-20/21). But it still WALKED it, and
 * still read and SHA-256'd every one of those files before the exclusion was
 * ever applied. 13,182 junk files were being hashed on every push, which is
 * why a module push stopped completing at all. Excluding it from the upload
 * fixed the symptom the incident was noticed by; this fixes the other half.
 */
async function listFilesRecursive(rootDir, currentDir = rootDir, skip = null) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(currentDir, entry.name);
    const relative = path.relative(rootDir, absolute).split(path.sep).join("/");
    if (skip && skip(relative)) continue;
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(rootDir, absolute, skip)));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

/**
 * Hashes every file under rootDir, returning a Map from POSIX-style relative
 * path (matching the normalization in checksums.mjs's parseChecksumLines,
 * so a local Map and a parsed-remote Map compare directly) to lowercase hex
 * SHA-256.
 */
export async function computeLocalChecksums(rootDir, { skip = null } = {}) {
  const absoluteFiles = await listFilesRecursive(rootDir, rootDir, skip);
  const result = new Map();
  for (const absolutePath of absoluteFiles) {
    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join("/");
    result.set(relativePath, await hashFile(absolutePath));
  }
  return result;
}

/**
 * Every file under rootDir as a Map from POSIX relative path to its absolute
 * local path -- the "sources" shape remote.mjs's uploadFiles and hashSources
 * below take. Same `skip` rule as computeLocalChecksums.
 */
export async function listSources(rootDir, { skip = null } = {}) {
  const absoluteFiles = await listFilesRecursive(rootDir, rootDir, skip);
  return new Map(absoluteFiles.map((absolutePath) => [path.relative(rootDir, absolutePath).split(path.sep).join("/"), absolutePath]));
}

/**
 * SHA-256 of every file in a sources Map, keyed the same way. Streams each
 * file rather than reading it whole, because the opening titles are hundreds
 * of megabytes each.
 */
export async function hashSources(sources) {
  const result = new Map();
  for (const [relativePath, absolutePath] of sources) {
    result.set(relativePath, await hashFileStreamed(absolutePath));
  }
  return result;
}

function hashFileStreamed(absolutePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    createReadStream(absolutePath)
      .on("data", (chunk) => hash.update(chunk))
      .on("end", () => resolve(hash.digest("hex")))
      .on("error", reject);
  });
}
