/**
 * A "remote server" that is a folder on this machine, with the same five functions as tools/module-sync/remote.mjs, so the real
 * `runDeploy` (tools/module-sync/deploy.mjs) can deploy to it unchanged: the same preflight, the same channels, the same hash check
 * on both sides, the same build stamp. The playtest's Foundry therefore runs what a deploy would put on the live server, not the
 * working tree as it happens to stand, which is the whole point of testing a copy (design/playtest-process.md, section 6, Phase 0).
 *
 * The connection fields remote.mjs takes (host, key, host key) are accepted and ignored. Every relative path is checked against
 * escaping its directory, the way remote.mjs refuses a path that could break out of its quotes.
 */

import { copyFile, mkdir, readFile, readdir, rm, rmdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { hashSources, listSources } from "../../module-sync/local-hash.mjs";

/** A path relative to a channel's root: never absolute, never a parent step, never a backslash. */
export function assertSafeRelative(rel) {
  if (typeof rel !== "string" || !rel || rel.startsWith("/") || rel.includes("\\") || /^[A-Za-z]:/.test(rel) || rel.split("/").includes("..") || rel.split("/").includes("")) {
    throw new Error(`Refusing an unsafe path: ${JSON.stringify(rel)}`);
  }
}

const inside = (root, rel) => path.join(root, ...rel.split("/"));

/** Remove now-empty directories from `dir` upward, stopping before `stop`. */
async function pruneEmptyDirs(dir, stop) {
  let current = dir;
  while (current.length > stop.length && current.startsWith(stop)) {
    try {
      if ((await readdir(current)).length) return;
      await rmdir(current);
    } catch {
      return;
    }
    current = path.dirname(current);
  }
}

export function createLocalRemote() {
  return {
    /** Copy each file (remote path -> absolute local source) into remoteDir, creating folders as needed. */
    async uploadFiles({ files, remoteDir }) {
      for (const rel of files.keys()) assertSafeRelative(rel);
      for (const [rel, source] of files) {
        const destination = inside(remoteDir, rel);
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(source, destination);
      }
    },

    /** The SHA-256 of every file under remoteDir, as a Map keyed by POSIX path (what `sha256sum` over `find` gives the real server). */
    async remoteChecksums({ remoteDir }) {
      if (!existsSync(remoteDir)) return new Map();
      // A running Foundry holds files open (its LevelDB LOCKs, the module's storage/ while it writes). A file that cannot be read right
      // now is left out of the listing rather than failing the whole comparison; none of them is a file a deploy sends.
      const out = new Map();
      for (const [rel, abs] of await listSources(remoteDir)) {
        try {
          out.set(rel, (await hashSources(new Map([[rel, abs]]))).get(rel));
        } catch (error) {
          if (!["EBUSY", "EPERM", "EACCES", "ENOENT"].includes(error.code)) throw error;
        }
      }
      return out;
    },

    async remoteDirectoryExists({ remoteDir }) {
      try {
        return statSync(remoteDir).isDirectory();
      } catch {
        return false;
      }
    },

    /** Delete exactly the named files (never a directory), then any folder that emptied. */
    async deleteRemoteFiles({ remoteDir, paths }) {
      for (const rel of paths) assertSafeRelative(rel);
      for (const rel of paths) {
        const target = inside(remoteDir, rel);
        await rm(target, { force: true });
        await pruneEmptyDirs(path.dirname(target), path.resolve(remoteDir));
      }
    },

    /** One small text file, or null when it is not there. */
    async readRemoteText({ remotePath }) {
      try {
        return await readFile(remotePath, "utf8");
      } catch {
        return null;
      }
    }
  };
}
