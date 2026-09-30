/**
 * The ONLY module in this project allowed to touch Foundry's file-access
 * globals (`foundry.utils.getRoute`, `fetch`, `foundry.applications.apps.FilePicker`)
 * and the standard browser clipboard API (`navigator.clipboard`).
 * Everything here is thin plumbing around those APIs — no campaign logic.
 */

const MODULE_ID = "blank-inheritance";

/**
 * A module file as plain text. Same route and error shape as fetchModuleJson;
 * used for packed assets that aren't JSON on the wire (the induction terminal's
 * Service Agreement, assets/induction/agreement.dat).
 */
export async function fetchModuleText(relativePath) {
  const url = foundry.utils.getRoute(`modules/${MODULE_ID}/${relativePath}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not fetch "${relativePath}" (HTTP ${response.status}). ` +
      `Check the file was actually deployed to Data/modules/${MODULE_ID}/${relativePath} on the server.`
    );
  }
  return response.text();
}

/**
 * A module file as JSON. `fresh` bypasses the browser's HTTP cache, for the
 * few files whose URL stays the same while their contents change under a
 * running page: the scene-edits ledger a deploy rewrites, and the edit
 * records the Runner lists out of storage/ (foundry/scene-edits.mjs).
 */
export async function fetchModuleJson(relativePath, { fresh = false } = {}) {
  const url = foundry.utils.getRoute(`modules/${MODULE_ID}/${relativePath}`);
  const response = fresh ? await fetch(url, { cache: "no-store" }) : await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not fetch "${relativePath}" (HTTP ${response.status}). ` +
      `Check the file was actually deployed to Data/modules/${MODULE_ID}/${relativePath} on the server.`
    );
  }
  return response.json();
}

/**
 * Every .json file in one of the module's own data directories, as ids
 * (filename without the extension).
 *
 * Used where content is authored as one-file-per-entity and nothing else
 * already names the files — the audio director's soundscapes and cues, where
 * adding one must not also mean editing an index that can go stale. Returns
 * an empty list when the directory does not exist yet, which is the normal
 * state of a campaign that has not authored any of that kind of file.
 */
export async function listModuleJsonIds(relativeDir) {
  return (await tryListModuleJsonIds(relativeDir)) ?? [];
}

/**
 * The same listing, but NULL when the directory could not be read at all.
 *
 * listModuleJsonIds cannot tell "there is nothing there" from "I could not
 * look", because both come back as an empty array — which is fine for a
 * caller enumerating optional content and dangerous for one deciding whether
 * to skip a read. foundry/session-log.mjs uses this to avoid a speculative
 * 404 WITHOUT ever skipping the load of a log that does exist: a failed
 * listing falls back to fetching, because losing a GM's notes is far worse
 * than a red line in the console.
 */
export async function tryListModuleJsonIds(relativeDir) {
  const target = `modules/${MODULE_ID}/${relativeDir}`;
  try {
    const result = await foundry.applications.apps.FilePicker.implementation.browse("data", target);
    return (result?.files ?? [])
      .filter((f) => f.toLowerCase().endsWith(".json"))
      .map((f) => decodeURIComponent(f.split("/").pop().replace(/\.json$/i, "")));
  } catch (err) {
    console.log(`Blank Inheritance | Could not list ${target} (${err?.message ?? err})`);
    return null;
  }
}

/**
 * The image files sitting in a module directory, by bare filename stem.
 *
 * Same browse-and-forgive shape as listModuleJsonIds above: a missing
 * directory is an empty list, never a throw, because every caller of this is
 * decorating something that must still work without art.
 */
export async function listModuleImageIds(relativeDir) {
  const target = `modules/${MODULE_ID}/${relativeDir}`;
  try {
    const result = await foundry.applications.apps.FilePicker.implementation.browse("data", target);
    return (result?.files ?? [])
      .filter((f) => /\.(webp|png|jpe?g|gif|avif)$/i.test(f))
      .map((f) => decodeURIComponent(f.split("/").pop().replace(/\.[^.]+$/, "")));
  } catch (err) {
    console.log(`Blank Inheritance | No images under ${target} (${err?.message ?? err})`);
    return [];
  }
}

/**
 * Foundry's createDirectory is a plain mkdir, not mkdir -p — it needs each
 * parent level to already exist. On a fresh deploy nothing under storage/
 * has ever been created, so the leaf dir's parent is missing too. Walk the
 * path one segment at a time so each level gets its own create-or-skip.
 * (Bug found on first live run, 2026-08-22 — see design/testing-strategy.md.)
 */
export async function ensureDirectory(fullPath) {
  const segments = fullPath.split("/");
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    try {
      await foundry.applications.apps.FilePicker.implementation.createDirectory("data", current);
    } catch (err) {
      // Already exists (or another non-fatal reason) — the upload below is the real success signal.
      console.log(`Blank Inheritance | createDirectory("${current}") — ${err?.message ?? err} (continuing)`);
    }
  }
}

/**
 * uploadPersistent's `path` argument is the DESTINATION DIRECTORY, not a
 * full file path — verified against the real server (foundryvtt's
 * dist/files/local.mjs, LocalFileStorage#upload: `path.join(root, path)` is
 * the directory it requires to already exist, and `path.join(thatDir,
 * file.name)` — the File object's own name, appended separately — is the
 * actual destination). Passing the filename in `path` too (as this
 * originally did) makes the server look for a directory literally named
 * after the report file, fail its existence check, and silently return
 * `false`. Found live, 2026-09-05: the clipboard copy of the report
 * succeeded, but the persisted JSON file did not, because of exactly this.
 */
/**
 * Write one JSON file into the module's persistent storage.
 *
 * `dirName` is a directory UNDER storage/ and `filename` is separate,
 * because uploadPersistent takes the destination DIRECTORY and gets the
 * filename from the File object itself — passing a path in both is the bug
 * documented above, found live 2026-09-05.
 *
 * The caller is responsible for ensureDirectory: callers that write
 * repeatedly (the session log) should not pay for it on every line.
 */
export async function writeStorageJson(dirName, filename, data) {
  const file = new File([JSON.stringify(data, null, 2)], filename, { type: "application/json" });
  const result = await foundry.applications.apps.FilePicker.implementation.uploadPersistent(MODULE_ID, dirName, file, {}, { notify: false });
  if (!result || result === false) {
    throw new Error(
      `uploadPersistent did not return a success result for ${dirName}/${filename} — ` +
      "see console for the FilePicker response."
    );
  }
  return `${dirName}/${filename}`;
}

/**
 * Write one arbitrary file (a Blob -- the induction terminal's own cropped-
 * portrait canvas output, via canvas.toBlob) into the module's persistent
 * storage. Same `uploadPersistent` call as writeStorageJson, generalized
 * past JSON: the File is built directly from the Blob instead of a
 * JSON.stringify'd string.
 *
 * `dirName` may be `""` to write straight into storage/ itself -- see the
 * live-found note below on why a caller may need that. Unlike
 * writeStorageJson, this returns the FULL Foundry-relative path
 * (`modules/<id>/storage/<dirName>/<filename>`, or just `modules/<id>/
 * storage/<filename>` when dirName is empty), not just `<dirName>/
 * <filename>` -- deliberately different, not an inconsistency. Every
 * existing writeStorageJson caller only ever uses its return value for
 * human-readable display (report.mjs manually prepends its own literal
 * "storage/" at its one call site), never as a real Document field. A
 * cropped portrait's path DOES need to go straight into a real field
 * (Actor#img), so the caller needs a ready-to-use path, not a fragment it
 * has to know how to complete itself. Read straight off `result.path` --
 * the server's own response, already correctly built (and already
 * confirmed correct for an empty dirName, which a hand-built template
 * string would have rendered as a doubled slash) -- rather than
 * reconstructed here from dirName/filename by hand.
 *
 * The caller is responsible for ensureDirectory when writing into a real
 * subdirectory, same division of labor as writeStorageJson. **Found live
 * 2026-09-10, building the induction terminal's Page 6: `createDirectory`
 * (and thus `ensureDirectory`) is unreliable on at least this Foundry
 * v14.367/Windows install -- it throws a FALSE "EEXIST" for a directory
 * that demonstrably does not exist yet (confirmed against the real
 * filesystem AND against Foundry's own `FilePicker.browse`), for every
 * fresh directory tried, including through Foundry's own first-party
 * "Create Subfolder" UI button, not just this module's own code. A
 * caller that cannot risk landing in a subdirectory that never actually
 * gets created should pass `dirName: ""` and write straight into
 * storage/ itself (already guaranteed to exist once persistentStorage is
 * enabled), using a distinctive filename prefix instead of a folder for
 * organization -- exactly what Page 6's own portrait upload does now.**
 */
export async function writeStorageFile(dirName, filename, blob, mimeType) {
  const file = new File([blob], filename, { type: mimeType });
  const result = await foundry.applications.apps.FilePicker.implementation.uploadPersistent(MODULE_ID, dirName, file, {}, { notify: false });
  if (!result || result === false || !result.path) {
    throw new Error(
      `uploadPersistent did not return a success result for ${dirName}/${filename} — ` +
      "see console for the FilePicker response."
    );
  }
  return result.path;
}

/**
 * A copy of one image (`sourcePath` is a Foundry data path such as
 * `modules/<id>/assets/stage/x.webp`) under a different name, in the module's
 * persistent storage, and the path to it.
 *
 * Exists so a picture can be shown to players under a name that says nothing
 * about who it is: `assets/stage/manako.webp` becomes
 * `storage/stage-art-p1a2b3c.webp`. Idempotent (an existing copy is reused,
 * so summoning the same person twice uploads once) and written straight into
 * storage/ rather than a subfolder, because createDirectory is unreliable on
 * this Foundry build (see writeStorageFile above).
 */
export async function ensureStorageImageCopy(sourcePath, filename) {
  const filePicker = foundry.applications.apps.FilePicker.implementation;
  try {
    const listing = await filePicker.browse("data", `modules/${MODULE_ID}/storage`);
    const existing = (listing?.files ?? []).find((f) => decodeURIComponent(f.split("/").pop()) === filename);
    if (existing) return existing;
  } catch (err) {
    console.log(`Blank Inheritance | Could not list storage for ${filename} (${err?.message ?? err}); uploading anyway`);
  }
  const response = await fetch(foundry.utils.getRoute(sourcePath));
  if (!response.ok) throw new Error(`Could not fetch "${sourcePath}" (HTTP ${response.status}).`);
  const blob = await response.blob();
  return writeStorageFile("", filename, blob, blob.type || "image/webp");
}

export async function writeReportFile(report) {
  const dirName = "test-reports";
  await ensureDirectory(`modules/${MODULE_ID}/storage/${dirName}`);
  const filename = `sync-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  return writeStorageJson(dirName, filename, report);
}

/**
 * Copies plain text to the OS clipboard via the standard `navigator.clipboard`
 * API — the "paste it back to Claude" half of the diagnostic test sync.
 * Can legitimately fail (no clipboard permission, an insecure/non-HTTPS
 * context, headless environment) — callers must treat this as best-effort,
 * not fatal to the sync it's attached to.
 */
export async function copyTextToClipboard(text) {
  await navigator.clipboard.writeText(text);
}
