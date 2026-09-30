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
import { mkdir } from "node:fs/promises";
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
  const files = new Map([...localMap.keys()].map((relativePath) => [relativePath, path.join(localDir, relativePath)]));
  await uploadFiles({ files, remoteDir, keyPath, hostKey, remoteHost });
}

/**
 * The general form of uploadDirectory: `files` maps each remote path
 * (relative to remoteDir) to the absolute local file that goes there, so the
 * sources need not share one directory. deploy.mjs uses this for the opening
 * titles, whose finished renders live beside their drafts in artwork/ and are
 * pushed under the names Foundry plays them by. Same one-file-at-a-time rule,
 * for the same reason.
 */
export async function uploadFiles({ files, remoteDir, keyPath, hostKey, remoteHost }) {
  if (!files.size) return;
  for (const relativePath of files.keys()) assertSafeRemotePath(relativePath);
  const remoteDirs = new Set([...files.keys()].map((relativePath) => path.posix.dirname(`${remoteDir}/${relativePath}`)));
  const mkdirCommand = [...remoteDirs].map((d) => `mkdir -p '${d}'`).join(" && ");
  await execFileAsync(PLINK, ["-ssh", "-i", keyPath, "-hostkey", hostKey, "-batch", remoteHost, mkdirCommand]);

  for (const [relativePath, localPath] of files) {
    await execFileAsync(
      PSCP,
      ["-i", keyPath, "-hostkey", hostKey, "-batch", localPath, `${remoteHost}:${remoteDir}/${relativePath}`],
      // Opening-title renders run to hundreds of megabytes; pscp's own progress
      // output alone can pass execFile's default 1 MB buffer on a slow link.
      { maxBuffer: 64 * 1024 * 1024 }
    );
  }
}

/**
 * Deletes exactly the named files under remoteDir -- never a directory, never
 * a pattern. Used only by deploy.mjs's opt-in --prune, and only for paths a
 * fresh checksum comparison has just reported as present on the server and
 * absent locally. Standing permission for this came from Ingram on
 * 2026-09-19, with "be careful and cautious" attached; the caution is here:
 * `rm -f --` on a quoted literal path, one per file, and a path that could
 * escape the directory or break the quoting is refused before anything runs.
 */
export async function deleteRemoteFiles({ remoteDir, paths, keyPath, hostKey, remoteHost }) {
  if (!paths.length) return;
  for (const relativePath of paths) assertSafeRemotePath(relativePath);
  const command = paths.map((relativePath) => `rm -f -- '${remoteDir}/${relativePath}'`).join(" && ");
  await execFileAsync(PLINK, ["-ssh", "-i", keyPath, "-hostkey", hostKey, "-batch", remoteHost, command]);
}

/**
 * One small remote text file's contents, or null when it does not exist.
 * deploy.mjs reads the previous build stamp this way, to carry its history
 * forward.
 */
export async function readRemoteText({ remotePath, keyPath, hostKey, remoteHost }) {
  assertSafeRemotePath(remotePath);
  const { stdout } = await execFileAsync(PLINK, [
    "-ssh",
    "-i", keyPath,
    "-hostkey", hostKey,
    "-batch",
    remoteHost,
    `if [ -f '${remotePath}' ]; then echo FOUND; cat '${remotePath}'; else echo MISSING; fi`,
  ]);
  const [first, ...rest] = stdout.split("\n");
  return first.trim() === "FOUND" ? rest.join("\n") : null;
}

/**
 * The SHA-256 of every file directly inside remoteDir whose name starts with
 * `prefix` and ends in .json, in one round trip -- how tools/scene-edits
 * finds Ingram's edit records in storage/ without listing everything else
 * there. A missing directory is an empty Map, not an error: storage/ only
 * exists once something has written to it.
 *
 * READ-ONLY on the server.
 */
export async function remoteListMatching({ remoteDir, prefix, keyPath, hostKey, remoteHost }) {
  assertSafeRemotePath(remoteDir);
  if (!/^[a-z0-9-]+$/.test(prefix)) throw new Error(`Refusing an unsafe file prefix: ${JSON.stringify(prefix)}`);
  const command = `cd '${remoteDir}' 2>/dev/null || exit 0; for f in ${prefix}*.json; do [ -f "$f" ] && sha256sum "$f"; done; true`;
  const { stdout } = await execFileAsync(PLINK, ["-ssh", "-i", keyPath, "-hostkey", hostKey, "-batch", remoteHost, command]);
  return parseChecksumLines(stdout);
}

/**
 * Several small text files from one remote directory, in one round trip,
 * each framed by marker lines no JSON file can contain at the start of a line
 * (a JSON string never holds a raw newline, so "@@BI-FILE " cannot begin a
 * line inside one). Names are checked against a plain-filename pattern before
 * they go anywhere near the remote shell.
 *
 * READ-ONLY on the server.
 *
 * @returns {Promise<Map<string, string>>} name -> contents, for every name that exists
 */
export async function readRemoteFiles({ remoteDir, names, keyPath, hostKey, remoteHost }) {
  assertSafeRemotePath(remoteDir);
  if (!names.length) return new Map();
  for (const name of names) {
    if (!/^[A-Za-z0-9._-]+$/.test(name)) throw new Error(`Refusing an unsafe file name: ${JSON.stringify(name)}`);
  }
  const quoted = names.map((name) => `'${name}'`).join(" ");
  const command = `cd '${remoteDir}' && for f in ${quoted}; do if [ -f "$f" ]; then echo "@@BI-FILE $f"; cat "$f"; echo; echo "@@BI-END"; fi; done`;
  const { stdout } = await execFileAsync(PLINK, ["-ssh", "-i", keyPath, "-hostkey", hostKey, "-batch", remoteHost, command], { maxBuffer: 64 * 1024 * 1024 });
  return parseFramedFiles(stdout);
}

/**
 * The inverse of readRemoteFiles' framing. Exported so it is tested without a
 * server. The stream is `@@BI-FILE name\n` + the file + `\n` + `@@BI-END\n`,
 * and the one newline the remote `echo` adds is exactly the separator before
 * the end marker -- so joining the lines between the markers gives the file
 * back byte for byte, whether or not it ended in a newline of its own. The
 * bytes are never normalised: the caller checks each file against the hash
 * the server computed, and a changed byte must fail that check.
 */
export function parseFramedFiles(stdout) {
  const files = new Map();
  let name = null;
  let lines = [];
  for (const line of String(stdout).split("\n")) {
    const marker = line.replace(/\r$/, "");
    if (name === null) {
      if (marker.startsWith("@@BI-FILE ")) {
        name = marker.slice("@@BI-FILE ".length);
        lines = [];
      }
      continue;
    }
    if (marker === "@@BI-END") {
      files.set(name, lines.join("\n"));
      name = null;
      continue;
    }
    lines.push(line);
  }
  return files;
}

/**
 * Every remote path this file builds is wrapped in single quotes for the
 * remote shell. A path carrying a quote, a parent-directory step or a leading
 * dash could break out of that, so it is refused rather than escaped.
 */
function assertSafeRemotePath(p) {
  if (typeof p !== "string" || !p || p.includes("'") || p.split("/").includes("..") || /^-/.test(p)) {
    throw new Error(`Refusing an unsafe remote path: ${JSON.stringify(p)}`);
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

/**
 * Whether a remote directory exists at all.
 *
 * Harvest runs against storage/, which Foundry only creates once something
 * has actually written to it -- so "not there yet" is an ordinary state on a
 * fresh server, not a failure, and has to be distinguishable from a genuine
 * connection problem before remoteChecksums is asked to cd into it.
 */
export async function remoteDirectoryExists({ remoteDir, keyPath, hostKey, remoteHost }) {
  const { stdout } = await execFileAsync(PLINK, [
    "-ssh",
    "-i", keyPath,
    "-hostkey", hostKey,
    "-batch",
    remoteHost,
    `test -d '${remoteDir}' && echo yes || echo no`,
  ]);
  return stdout.trim().endsWith("yes");
}

/**
 * Pulls every file named in remoteMap down into localDir, one at a time.
 *
 * The mirror of uploadDirectory, and file-by-file for the same reason: a
 * recursive pscp does not reliably overwrite a file that already exists at
 * the destination, which on this side would mean silently keeping a stale
 * copy of a session record that had since changed on the server.
 *
 * This direction is READ-ONLY on the server. Nothing here deletes, moves or
 * rewrites anything remote -- the module design's harvest rule is that
 * promotable content only ever travels Foundry-to-repo, and that a human
 * decides what to do with it afterwards.
 */
export async function downloadDirectory({ remoteDir, localDir, keyPath, hostKey, remoteHost, remoteMap }) {
  for (const relativePath of remoteMap.keys()) {
    const destination = path.join(localDir, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await execFileAsync(PSCP, [
      "-i", keyPath,
      "-hostkey", hostKey,
      "-batch",
      `${remoteHost}:${remoteDir}/${relativePath}`,
      destination,
    ]);
  }
}
