/**
 * The ONLY file in module-sync allowed to shell out to plink/pscp or touch
 * the network -- mirrors this project's own core/adapter convention (see
 * design/testing-strategy.md). Not unit tested: it depends on a real SSH
 * key, a real reachable server, and PuTTY's CLI tools being installed at a
 * fixed Windows path. Tier-5-equivalent -- manual, last resort, exercised
 * by actually running sync-module.mjs against the live server, not by CI.
 *
 * Deliberately uses execFile with an argument array, never a shell string --
 * this sidesteps the exact class of quoting bug that bit the scratchpad
 * version of this script earlier (a nested-quoting sed edit corrupted the
 * wrong file). No shell is invoked, so there is nothing for a stray quote
 * or backtick in a path to break out of.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { parseChecksumLines } from "./checksums.mjs";

const execFileAsync = promisify(execFile);

const PLINK = "C:\\Program Files\\PuTTY\\plink.exe";
const PSCP = "C:\\Program Files\\PuTTY\\pscp.exe";

/**
 * @param {object} config
 * @param {string} config.keyPath - absolute path to the .ppk private key
 * @param {string} config.hostKey - "SHA256:..." fingerprint, required in
 *   -batch mode for a host not already cached (see plink's own error output
 *   the first time you connect to a new server for the exact string)
 * @param {string} config.remoteHost - "user@host"
 */

/**
 * Uploads every file named in localMap (a path->hash Map, exactly what
 * computeLocalChecksums() returns -- sync-module.mjs already computes one
 * before calling this, so it's passed in rather than re-walked here) into
 * remoteDir, one file at a time.
 *
 * Deliberately NOT `pscp -r localDir/. remote:dir/` -- found by hand,
 * 2026-09-05: a single recursive pscp reliably CREATES files that don't
 * exist remotely yet, but does not reliably UPDATE files that already exist
 * at that path from a previous sync (confirmed reproducible: two files
 * edited in the same run were silently left at their old content after a
 * recursive push reported success, while a plain single-file pscp of the
 * exact same file overwrote it correctly every time). Verification (see
 * sync-module.mjs's checksum diff) is exactly what caught this -- but a
 * "100% reliable" push needs to actually not fail, not just detect that it
 * did. File-by-file is slower for many files but has none of that ambiguity.
 */
export async function uploadDirectory({ localDir, remoteDir, keyPath, hostKey, remoteHost, localMap }) {
  const remoteDirs = new Set();
  for (const relativePath of localMap.keys()) {
    const remoteFileDir = path.posix.dirname(`${remoteDir}/${relativePath}`);
    remoteDirs.add(remoteFileDir);
  }
  const mkdirCommand = [...remoteDirs].map((d) => `mkdir -p '${d}'`).join(" && ");
  await execFileAsync(PLINK, ["-ssh", "-i", keyPath, "-hostkey", hostKey, "-batch", remoteHost, mkdirCommand]);

  for (const relativePath of localMap.keys()) {
    await execFileAsync(PSCP, [
      "-i", keyPath,
      "-hostkey", hostKey,
      "-batch",
      path.join(localDir, relativePath),
      `${remoteHost}:${remoteDir}/${relativePath}`,
    ]);
  }
}

/** Runs sha256sum over every file under remoteDir, returns the same Map shape as computeLocalChecksums(). */
export async function remoteChecksums({ remoteDir, keyPath, hostKey, remoteHost }) {
  const remoteCommand = `cd '${remoteDir}' && find . -type f | sort | xargs sha256sum`;
  const { stdout } = await execFileAsync(PLINK, [
    "-ssh",
    "-i", keyPath,
    "-hostkey", hostKey,
    "-batch",
    remoteHost,
    remoteCommand,
  ]);
  return parseChecksumLines(stdout);
}
