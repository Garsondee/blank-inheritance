/**
 * Local filesystem hashing. Real I/O (reads files from disk), but no
 * network and no child_process, so it's still fully testable against a
 * fixture directory -- deterministic given the same files, no external
 * process behavior to mock.
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

/** SHA-256 of one file's contents, lowercase hex -- same format sha256sum prints. */
async function hashFile(absolutePath) {
  const contents = await readFile(absolutePath);
  return createHash("sha256").update(contents).digest("hex");
}

/**
 * Recursively lists every file under rootDir (skipping nothing -- unlike a
 * gitignore-aware walk, this hashes exactly what's on disk, since that's
 * exactly what would get pushed).
 */
async function listFilesRecursive(rootDir, currentDir = rootDir) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(rootDir, absolute)));
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
export async function computeLocalChecksums(rootDir) {
  const absoluteFiles = await listFilesRecursive(rootDir);
  const result = new Map();
  for (const absolutePath of absoluteFiles) {
    const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join("/");
    result.set(relativePath, await hashFile(absolutePath));
  }
  return result;
}
