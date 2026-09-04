/**
 * Pure parsing and diffing of checksum listings. No filesystem, no network,
 * no child_process — this is the part of module-sync that unit tests can
 * actually cover. See remote.mjs / local-hash.mjs for the adapter layer.
 */

/**
 * Parses `sha256sum`-style output ("<hex hash>  <path>" or, on Windows/
 * MinGW coreutils in binary mode, "<hex hash> *<path>") into a Map from
 * normalized relative path to lowercase hash. Both separator styles are
 * accepted and normalized away — they hash identically, only the local
 * marker differs, confirmed 2026-09-05 (a Windows-vs-Linux sha256sum
 * run on the same files showed 0 real mismatches once this normalization
 * was applied, only cosmetic "*"-vs-space diffs).
 */
export function parseChecksumLines(text) {
  const result = new Map();
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const match = line.match(/^([0-9a-fA-F]+)[ *]+(.+)$/);
    if (!match) {
      throw new Error(`Could not parse checksum line: ${JSON.stringify(rawLine)}`);
    }
    const [, hash, rawPath] = match;
    const normalizedPath = rawPath.replace(/^\.\//, "").replace(/\\/g, "/");
    result.set(normalizedPath, hash.toLowerCase());
  }
  return result;
}

/**
 * Compares two path->hash maps (typically: local vs. remote, after a push)
 * and reports exactly what differs, categorized -- not just "something's
 * different, good luck reading a raw diff." A file present on both sides
 * with a different hash is "changed", not lumped in with added/removed.
 */
export function diffChecksums(localMap, remoteMap) {
  const unchanged = [];
  const changed = [];
  const onlyLocal = [];
  const onlyRemote = [];

  for (const [path, localHash] of localMap) {
    if (!remoteMap.has(path)) {
      onlyLocal.push(path);
    } else if (remoteMap.get(path) !== localHash) {
      changed.push(path);
    } else {
      unchanged.push(path);
    }
  }
  for (const path of remoteMap.keys()) {
    if (!localMap.has(path)) onlyRemote.push(path);
  }

  unchanged.sort();
  changed.sort();
  onlyLocal.sort();
  onlyRemote.sort();

  return {
    unchanged,
    changed,
    onlyLocal,
    onlyRemote,
    isVerified: changed.length === 0 && onlyLocal.length === 0 && onlyRemote.length === 0,
  };
}

/** One-line human summary of a diffChecksums() result, for CLI/report output. */
export function summarizeDiff(diff) {
  if (diff.isVerified) {
    return `VERIFIED: all ${diff.unchanged.length} files match exactly (same path, same content hash) on both sides.`;
  }
  const parts = [];
  if (diff.changed.length) parts.push(`${diff.changed.length} changed`);
  if (diff.onlyLocal.length) parts.push(`${diff.onlyLocal.length} only local (not yet pushed)`);
  if (diff.onlyRemote.length) parts.push(`${diff.onlyRemote.length} only remote (deleted locally, still on server)`);
  return `MISMATCH: ${parts.join(", ")}. Do not treat this sync as successful.`;
}
