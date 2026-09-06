/**
 * The ONLY module in this project allowed to touch Foundry's file-access
 * globals (`foundry.utils.getRoute`, `fetch`, `foundry.applications.apps.FilePicker`)
 * and the standard browser clipboard API (`navigator.clipboard`).
 * Everything here is thin plumbing around those APIs — no campaign logic.
 */

const MODULE_ID = "blank-inheritance";

export async function fetchModuleJson(relativePath) {
  const url = foundry.utils.getRoute(`modules/${MODULE_ID}/${relativePath}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not fetch "${relativePath}" (HTTP ${response.status}). ` +
      `Check the file was actually deployed to Data/modules/${MODULE_ID}/${relativePath} on the server.`
    );
  }
  return response.json();
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
