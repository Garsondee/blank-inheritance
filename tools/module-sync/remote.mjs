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

/** Recursively uploads localDir's *contents* into remoteDir (overwrite, no delete of anything not present locally -- see the module README for that limitation). */
export async function uploadDirectory({ localDir, remoteDir, keyPath, hostKey, remoteHost }) {
  await execFileAsync(PSCP, [
    "-r",
    "-i", keyPath,
    "-hostkey", hostKey,
    "-batch",
    `${localDir}\\.`,
    `${remoteHost}:${remoteDir}/`,
  ]);
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
