/**
 * Push the processed audio library to the live Foundry server, verified.
 *
 * Same transport and the same "never trust an exit code" discipline as
 * tools/module-sync/ (whose remote.mjs and pure diffing this reuses rather
 * than copies), with one difference that matters at this size: the library is
 * hundreds of megabytes, so this uploads only what the server does not
 * already have, then re-hashes BOTH sides and reports what matches.
 *
 * The audio lives OUTSIDE the module directory, at Data/blank-inheritance-audio/.
 * That is deliberate: a module update wipes the module folder, and 785 MB of
 * audio should not be re-uploaded every time a line of code changes. Foundry
 * serves anything under its data root, so a path like
 * `blank-inheritance-audio/music/x.ogg` just works.
 *
 * Like module-sync, this only puts files on disk. It never touches a Foundry
 * document — building playlists is a separate, GM-initiated step inside the
 * running game (design/foundry-module-design.md's Safety section).
 */

import path from "node:path";
import { computeLocalChecksums } from "../module-sync/local-hash.mjs";
import { uploadDirectory, remoteChecksums, remoteDirectoryExists } from "../module-sync/remote.mjs";
import { diffChecksums } from "../module-sync/checksums.mjs";

const DEFAULTS = Object.freeze({
  remoteDir: "/home/ubuntu/foundrydata/Data/blank-inheritance-audio",
  remoteHost: "ubuntu@132.145.38.144",
  hostKey: "SHA256:7EsvSGvu2DqJfokfzaVnysbx/Ehf52fij/M9DLHo9cE"
});

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

/**
 * @param {object} options
 * @param {boolean} [options.dryRun]  compare only; upload nothing
 * @param {object} options.paths      the pipeline's PATHS (library dir, repo root)
 * @param {object} [remote]           injectable for tests
 */
export async function upload({ dryRun = false, paths, remote = { uploadDirectory, remoteChecksums, remoteDirectoryExists } } = {}) {
  const localDir = paths.library;
  const keyPath = path.join(paths.cache, "..", "..", "SSH.ppk");
  const config = {
    remoteDir: process.env.BI_AUDIO_REMOTE_DIR ?? DEFAULTS.remoteDir,
    remoteHost: process.env.BI_AUDIO_REMOTE_HOST ?? DEFAULTS.remoteHost,
    hostKey: process.env.BI_AUDIO_HOST_KEY ?? DEFAULTS.hostKey,
    keyPath: path.resolve(keyPath)
  };

  console.log(`Hashing ${localDir} ...`);
  const localMap = await computeLocalChecksums(localDir);
  if (!localMap.size) throw new Error(`Nothing to upload: ${localDir} is empty. Run \`process\` first.`);

  const exists = await remote.remoteDirectoryExists({ ...config });
  const remoteMap = exists ? await remote.remoteChecksums({ ...config }) : new Map();
  const before = diffChecksums(localMap, remoteMap);
  // diffChecksums returns plain path strings in both lists.
  const toSend = new Map([...before.changed, ...before.onlyLocal].map((p) => [p, localMap.get(p)]));

  const totalNew = toSend.size;
  console.log(`${localMap.size} local files; ${remoteMap.size} already on the server; ${totalNew} to send.`);
  if (before.onlyRemote.length) console.log(`${before.onlyRemote.length} file(s) exist only on the server (nothing is ever deleted there).`);

  if (dryRun) {
    return { dryRun: true, localFiles: localMap.size, remoteFiles: remoteMap.size, toSend: totalNew, onlyRemote: before.onlyRemote.length };
  }
  if (!totalNew) {
    console.log("Everything already matches. Nothing sent.");
    return { uploaded: 0, verified: localMap.size, mismatched: 0 };
  }

  await remote.uploadDirectory({ localDir, localMap: toSend, ...config });

  // Re-hash both sides independently. An upload that "succeeded" is not proof.
  const after = diffChecksums(localMap, await remote.remoteChecksums({ ...config }));
  const mismatched = after.changed.length + after.onlyLocal.length;
  console.log(mismatched === 0 ? `Verified: all ${localMap.size} files match on both sides.` : `MISMATCH: ${after.changed.length} differ, ${after.onlyLocal.length} missing remotely. Do not treat this upload as successful.`);
  return { uploaded: totalNew, verified: localMap.size - mismatched, mismatched };
}

export { DEFAULTS as AUDIO_UPLOAD_DEFAULTS, mb };
