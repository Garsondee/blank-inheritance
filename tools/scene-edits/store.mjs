/**
 * Where scene edits live on this side, and the only file in tools/scene-edits
 * that reads or writes the disk. design/scene-edits.md §4.
 *
 *   harvest/scene-edits/<record file>   every record pulled off the server,
 *                                       byte for byte as it arrived. Tracked
 *                                       in git: the record of every change
 *                                       Ingram has made, and what I learn
 *                                       how she writes from.
 *   data/campaign/scene-edits.json      the LEDGER: which records are merged,
 *                                       superseded, done or withdrawn. Small,
 *                                       deployed with the campaign data, so
 *                                       the Runner knows what not to overlay.
 *   data/scene-briefs/, data/challenges/  where her words end up.
 *
 * Every data file this writes is written the way the repo already stores it
 * -- JSON.stringify with two-space indentation and a final newline, which is
 * byte-identical to all 57 of the scene, check and episode files (checked
 * 2026-09-27) -- keeping each file's own line endings, through a temporary
 * file and a rename so a crash can never leave half a file behind.
 */

import { closeSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { RECORD_PREFIX, recordIdFromFilename, validateRecord } from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(here, "..", "..");

/** The default places, overridable (every function takes explicit paths) so tests work in a scratch copy. */
export const DEFAULT_PATHS = Object.freeze({
  repoRoot: REPO_ROOT,
  dataRoot: path.join(REPO_ROOT, "data"),
  harvestDir: path.join(REPO_ROOT, "harvest", "scene-edits"),
  ledgerPath: path.join(REPO_ROOT, "data", "campaign", "scene-edits.json")
});

export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/* -------------------------------------------------------------------------- */
/*  Data files                                                                */
/* -------------------------------------------------------------------------- */

/** "scene-briefs/x" -> <dataRoot>/scene-briefs/x.json */
export function dataFilePath(dataRoot, file) {
  if (!/^(scene-briefs|challenges|episodes)\/[a-z0-9][a-z0-9-]*$/.test(file)) throw new Error(`Not a data file this tool writes: ${JSON.stringify(file)}`);
  return path.join(dataRoot, ...file.split("/")) + ".json";
}

/** A JSON file and the line ending it uses, or null when it does not exist. */
export function readJsonFile(absolutePath) {
  if (!existsSync(absolutePath)) return null;
  const raw = readFileSync(absolutePath, "utf8");
  return { doc: JSON.parse(raw), eol: raw.includes("\r\n") ? "\r\n" : "\n" };
}

/** The repo's own JSON layout, in the line ending the file already had. */
export function formatJson(doc, eol = "\n") {
  const text = `${JSON.stringify(doc, null, 2)}\n`;
  return eol === "\r\n" ? text.replace(/\n/g, "\r\n") : text;
}

/** Write through a temporary file and a rename: a file is either the old one or the new one, never half of each. */
export function writeFileAtomic(absolutePath, text) {
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  const temporary = `${absolutePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, text);
  renameSync(temporary, absolutePath);
}

export function writeJsonFile(absolutePath, doc, eol = "\n") {
  writeFileAtomic(absolutePath, formatJson(doc, eol));
}

/* -------------------------------------------------------------------------- */
/*  The ledger                                                                */
/* -------------------------------------------------------------------------- */

export function emptyLedger() {
  return {
    $schema: "../schema/scene-edits.schema.json",
    id: "scene-edits",
    description:
      "Which of Ingram's Scene Runner edits have reached the repo. Written only by tools/scene-edits (design/scene-edits.md); " +
      "the Runner reads it to know which edits are merged. The edits themselves are in harvest/scene-edits/.",
    entries: {}
  };
}

export function readLedger(ledgerPath = DEFAULT_PATHS.ledgerPath) {
  const found = readJsonFile(ledgerPath);
  if (!found) return emptyLedger();
  return { ...emptyLedger(), ...found.doc, entries: { ...(found.doc.entries ?? {}) } };
}

/** Entries in id order -- which is time order -- so the file's git history reads as a log. */
export function writeLedger(ledger, ledgerPath = DEFAULT_PATHS.ledgerPath) {
  const entries = Object.fromEntries(Object.keys(ledger.entries ?? {}).sort().map((id) => [id, ledger.entries[id]]));
  const eol = readJsonFile(ledgerPath)?.eol ?? "\n";
  writeJsonFile(ledgerPath, { ...emptyLedger(), ...ledger, entries }, eol);
}

/* -------------------------------------------------------------------------- */
/*  The harvested records                                                     */
/* -------------------------------------------------------------------------- */

/** Every record file already pulled home: name -> exact text. */
export function listHarvested(harvestDir = DEFAULT_PATHS.harvestDir) {
  const out = new Map();
  if (!existsSync(harvestDir)) return out;
  for (const name of readdirSync(harvestDir).sort()) {
    if (!name.startsWith(RECORD_PREFIX) || !recordIdFromFilename(name)) continue;
    out.set(name, readFileSync(path.join(harvestDir, name), "utf8"));
  }
  return out;
}

/**
 * The harvested records as objects, oldest first. A file that is not a usable
 * record is reported rather than skipped silently -- it was verified when it
 * was pulled, so something has changed it since.
 */
export function readHarvestedRecords(harvestDir = DEFAULT_PATHS.harvestDir) {
  const records = [];
  const problems = [];
  for (const [name, text] of listHarvested(harvestDir)) {
    try {
      const record = JSON.parse(text);
      const invalid = validateRecord(record);
      if (invalid.length) problems.push(`${name}: ${invalid.join("; ")}`);
      else records.push(record);
    } catch (err) {
      problems.push(`${name}: ${err.message}`);
    }
  }
  return { records, problems };
}

export function saveHarvested(harvestDir, name, text) {
  if (!recordIdFromFilename(name)) throw new Error(`Not a scene-edit record file name: ${JSON.stringify(name)}`);
  writeFileAtomic(path.join(harvestDir, name), text);
}

/**
 * harvest/foundry-edits/: the latest copy of each document Ingram edited
 * directly in Foundry (core/foundry-edits.mjs). One file per document,
 * replaced when she edits it again; git keeps every version.
 */
export function listDocumentEdits(documentsDir) {
  const out = new Map();
  if (!existsSync(documentsDir)) return out;
  for (const name of readdirSync(documentsDir).sort()) {
    if (name.startsWith("foundry-edit-") && name.endsWith(".json")) out.set(name, readFileSync(path.join(documentsDir, name), "utf8"));
  }
  return out;
}

export function saveDocumentEdit(documentsDir, name, text) {
  if (!/^foundry-edit-[a-z0-9-]+\.json$/.test(name)) throw new Error(`Not a document-edit file name: ${JSON.stringify(name)}`);
  writeFileAtomic(path.join(documentsDir, name), text);
}

/* -------------------------------------------------------------------------- */
/*  One merge at a time                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Take the merge lock, or return null when another run holds it. Several
 * conversations can start at once, each with its own session-start pull; two
 * writers on the same scene file at the same moment is the one way a merge
 * could lose words, so only one merges and the others report and move on. A
 * lock older than two minutes belongs to a run that died, and is broken.
 */
export function acquireLock(harvestDir = DEFAULT_PATHS.harvestDir, { staleMs = 120_000 } = {}) {
  mkdirSync(harvestDir, { recursive: true });
  const lockPath = path.join(harvestDir, ".merge.lock");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lockPath, "wx");
      writeFileSync(fd, `${process.pid} ${new Date().toISOString()}\n`);
      closeSync(fd);
      return () => {
        try {
          unlinkSync(lockPath);
        } catch {
          /* already gone */
        }
      };
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      let age = 0;
      try {
        age = Date.now() - statSync(lockPath).mtimeMs;
      } catch {
        continue;
      }
      if (age < staleMs) return null;
      try {
        unlinkSync(lockPath);
      } catch {
        /* someone else broke it first */
      }
    }
  }
  return null;
}
