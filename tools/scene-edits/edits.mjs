#!/usr/bin/env node
/**
 * `npm run edits` -- bring Ingram's Scene Runner edits home, and keep them.
 * design/scene-edits.md is the whole design; tools/scene-edits/README.md is
 * how to use it.
 *
 * WHY. Ingram, 2026-09-27: "I ONLY WILL REWRITE SCENES ON THE REMOTE SERVER.
 * We need to make sure that things I rewrite don't get overwritten by the old
 * content as a critical requirement, something that works smoothly with your
 * editing process and which makes this process easier for you." She edits in
 * the Runner; every edit is a small record in the module's storage/ on the
 * server. This pulls the new ones (verified byte for byte), merges them into
 * data/ word for word, keeps the ledger of what is merged, and refuses to let
 * the repo go back to older words than hers.
 *
 * It runs by itself at the start of every conversation (session-start.mjs),
 * before any edit of a scene file (pre-edit.mjs) and as the first step of
 * `npm run deploy`. By hand:
 *
 *   npm run edits                      pull and merge (the default)
 *   npm run edits -- status            what is waiting, offline
 *   npm run edits -- log [--scene id]  every edit she has made, as before/after
 *   npm run edits -- check             exit 1 if the repo has lost any of her words
 *   npm run edits -- restore           put her words back wherever that happened
 *   npm run edits -- resolve <id> --hers | --mine --reason "..."
 *   npm run edits -- done <note id> --reply "what was done"
 *   npm run edits -- supersede <id> --reason "..."
 *   npm run edits -- pull --from <folder>   read a local storage/ instead of the server
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { findReversions, pathToString, sortRecords } from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";
import { build as buildCanon, loadModel as loadCanonModel } from "../story/lib.mjs";
import { folderInbox, pullDocumentEdits, pullNew, serverInbox } from "./inbox.mjs";
import { answerNote, documentCache, mergePending, previewMerge, resolveClash, restoreReversions, supersede } from "./merge.mjs";
import { describeEdit, pullReport } from "./report.mjs";
import {
  acquireLock,
  dataFilePath,
  DEFAULT_PATHS,
  listDocumentEdits,
  listHarvested,
  readHarvestedRecords,
  readJsonFile,
  readLedger,
  saveDocumentEdit,
  saveHarvested,
  writeJsonFile,
  writeLedger
} from "./store.mjs";

/**
 * Where the automatic paths (the two hooks) read from. The live server and
 * this repo, unless a test points them at a folder and a scratch repo with
 * BI_SCENE_EDITS_FROM and BI_SCENE_EDITS_ROOT -- so the hooks can be run for
 * real, as subprocesses, without touching either.
 */
export function hookTargets(env = process.env) {
  return {
    paths: pathsFor(env.BI_SCENE_EDITS_ROOT || DEFAULT_PATHS.repoRoot),
    inbox: env.BI_SCENE_EDITS_FROM ? folderInbox(env.BI_SCENE_EDITS_FROM) : serverInbox()
  };
}

/** The paths for a repo at `repoRoot` (the real one by default; a scratch copy in tests). */
export function pathsFor(repoRoot = DEFAULT_PATHS.repoRoot) {
  return {
    repoRoot,
    dataRoot: path.join(repoRoot, "data"),
    harvestDir: path.join(repoRoot, "harvest", "scene-edits"),
    documentsDir: path.join(repoRoot, "harvest", "foundry-edits"),
    ledgerPath: path.join(repoRoot, "data", "campaign", "scene-edits.json")
  };
}

/**
 * A scene or challenge that has been rebuilt in `canon/` (design/story-data-refactor.md) has two things
 * claiming to own `data/scene-briefs|challenges/<id>.json`: canon's own check, which requires that file to be a
 * byte-identical copy of `canon/scenes|challenges/<id>.json`, and a scene-edits merge, which used to write
 * straight into it. Left alone, the two fight: a routine `story build` after a merge would silently overwrite
 * her words with the old canon copy, then canon's "differs from its canon source" check would immediately catch
 * the collision she was never told about. So for a file canon has rebuilt, canon is the one repo copy scene-edits
 * writes to; `data/` stays purely derived, kept in sync automatically (see repoDocs' cache.write below).
 */
export function canonFilePath(repoRoot, file) {
  const m = file.match(/^(scene-briefs|challenges)\/([a-z0-9][a-z0-9-]*)$/);
  if (!m) return null;
  const dir = m[1] === "scene-briefs" ? "scenes" : "challenges";
  const p = path.join(repoRoot, "canon", dir, `${m[2]}.json`);
  return existsSync(p) ? p : null;
}

/** A document cache over the repo's data files that remembers each file's line ending for writing back. */
function repoDocs(paths) {
  const eols = new Map();
  const resolved = new Map();
  const cache = documentCache((file) => {
    const absPath = canonFilePath(paths.repoRoot, file) ?? dataFilePath(paths.dataRoot, file);
    resolved.set(file, absPath);
    const found = readJsonFile(absPath);
    if (!found) return null;
    eols.set(file, found.eol);
    return found.doc;
  });
  cache.write = (files) => {
    let touchedCanon = false;
    for (const file of files) {
      const doc = cache.get(file);
      if (!doc) continue;
      const absPath = resolved.get(file) ?? dataFilePath(paths.dataRoot, file);
      writeJsonFile(absPath, doc, eols.get(file) ?? "\n");
      if (absPath.startsWith(path.join(paths.repoRoot, "canon") + path.sep)) touchedCanon = true;
    }
    // Keep canon's invariant true in the same step: data/ is never seen out of sync with what was just merged.
    if (touchedCanon) {
      const changed = buildCanon(loadCanonModel(paths.repoRoot), paths.repoRoot);
      for (const where of changed) console.log(`  resynced ${where} from canon`);
    }
  };
  return cache;
}

/** Every place the repo holds older words than hers, checked against the files as they are now. Offline. */
export function checkReversions(paths = pathsFor()) {
  const { records } = readHarvestedRecords(paths.harvestDir);
  const ledger = readLedger(paths.ledgerPath);
  const docs = repoDocs(paths);
  const all = {};
  for (const record of records) if (!(record.file in all)) all[record.file] = docs.get(record.file);
  for (const file of Object.keys(all)) if (!all[file]) delete all[file];
  return findReversions(all, records, ledger);
}

/** Notes she has left that I have not answered or she has not taken back. */
function waitingNotes(records, ledger) {
  return sortRecords(records).filter((r) => r.op === "note" && !ledger.entries?.[r.id]);
}

/**
 * Pull new edits and merge them. The one function every automatic path calls.
 *
 * @param {object} [options]
 * @param {object} [options.paths]  pathsFor(...)
 * @param {object} [options.inbox]  serverInbox() by default
 * @param {number} [options.max]    per-block length limit for the report
 * @param {() => string} [options.now]
 * @returns {Promise<object>} what arrived, what merged, what needs a person, and the report text
 */
export async function runPull({ paths = pathsFor(), inbox = serverInbox(), max = Infinity, now = () => new Date().toISOString() } = {}) {
  const release = acquireLock(paths.harvestDir);
  if (!release) {
    return { lockedOut: true, fetched: [], results: [], problems: [], reversions: [], notes: [], report: pullReport({ lockedOut: true }) };
  }
  try {
    const pulled = await pullNew({ inbox, harvested: listHarvested(paths.harvestDir) });
    for (const { name, text } of pulled.fetched) saveHarvested(paths.harvestDir, name, text);

    const { records, problems: unreadable } = readHarvestedRecords(paths.harvestDir);
    const ledger = readLedger(paths.ledgerPath);
    const docs = repoDocs(paths);
    const merged = mergePending({ records, ledger, docs, now });
    docs.write(merged.touched);
    if (JSON.stringify(merged.ledger.entries) !== JSON.stringify(ledger.entries)) writeLedger(merged.ledger, paths.ledgerPath);

    // Documents she edited directly in Foundry: kept there, and their latest
    // words brought home for me to fold into the repo by hand.
    const documents = await pullDocumentEdits({ inbox, harvested: listDocumentEdits(paths.documentsDir) });
    for (const { name, text } of documents.changed) saveDocumentEdit(paths.documentsDir, name, text);

    const reversions = checkReversions(paths);
    const notes = waitingNotes(records, merged.ledger);
    const problems = [...pulled.problems, ...unreadable, ...documents.problems];
    const report = pullReport({
      fetched: pulled.fetched,
      results: merged.results,
      problems,
      reversions,
      pendingNotes: notes,
      documentEdits: documents.changed,
      source: inbox.describe,
      onServer: pulled.onServer,
      max
    });
    return {
      lockedOut: false,
      fetched: pulled.fetched,
      results: merged.results,
      touched: [...merged.touched],
      documentEdits: documents.changed,
      problems,
      reversions,
      notes,
      onServer: pulled.onServer,
      report
    };
  } finally {
    release();
  }
}

/** What is waiting, without pulling or writing anything. */
export function status(paths = pathsFor()) {
  const { records, problems } = readHarvestedRecords(paths.harvestDir);
  const ledger = readLedger(paths.ledgerPath);
  const preview = previewMerge({ records, ledger, docs: repoDocs(paths) });
  const reversions = checkReversions(paths);
  const notes = waitingNotes(records, ledger);
  return {
    records: records.length,
    unsettled: preview.results.filter((r) => r.result !== "note" && r.result !== "withdrawn" && r.result !== "withdraw"),
    reversions,
    notes,
    problems,
    report: pullReport({ results: preview.results.filter((r) => r.result !== "merged" && r.result !== "already"), reversions, pendingNotes: notes, problems })
  };
}

/**
 * The deploy's first step (tools/module-sync/deploy.mjs): bring her edits in
 * so this deploy carries them, and report any place the repo has lost her
 * words -- the deploy refuses on those. A dry run only looks.
 */
export async function sceneEditsForDeploy({ dryRun = false, repoRoot = DEFAULT_PATHS.repoRoot, log = console.log, inbox = serverInbox() } = {}) {
  const paths = pathsFor(repoRoot);
  if (dryRun) {
    const s = status(paths);
    log(s.report || "  nothing waiting from Ingram (a dry run does not pull; a real deploy does)");
    return { pulled: 0, reversions: s.reversions, unsettled: s.unsettled.length };
  }
  let result;
  try {
    result = await runPull({ paths, inbox, max: 1200 });
  } catch (err) {
    // Her text is safe on the server either way (the Runner shows it over
    // whatever this deploy sends), so an unreachable inbox is reported, not
    // fatal. Losing words already in the repo is what stops a deploy.
    log(`  could not pull scene edits (${err?.message ?? err}); her edits stay safe on the server and come home next time`);
    return { pulled: 0, reversions: checkReversions(paths), unsettled: 0, error: String(err?.message ?? err) };
  }
  if (result.report) log(result.report);
  else log("  nothing new from Ingram");
  // Locked out (another conversation is merging right now): the pull stood
  // aside, but the guard never needs the lock and never stands aside.
  const reversions = result.lockedOut ? checkReversions(paths) : result.reversions;
  return { pulled: result.fetched.length, reversions, unsettled: result.results.filter((r) => r.result === "clash" || r.result === "unplaceable").length };
}

/** Every edit she has made, oldest first, as I should read it. */
export function editLog({ paths = pathsFor(), briefId = null, since = null } = {}) {
  const { records } = readHarvestedRecords(paths.harvestDir);
  const ledger = readLedger(paths.ledgerPath);
  const chosen = sortRecords(records).filter((r) => (!briefId || r.briefId === briefId) && (!since || r.at >= since));
  const lines = [];
  let scene = null;
  for (const record of chosen) {
    if (record.briefId !== scene) {
      scene = record.briefId;
      lines.push(`\n== ${scene} ==`);
    }
    const state = ledger.entries?.[record.id]?.state ?? "waiting";
    lines.push(`${record.at.slice(0, 16).replace("T", " ")}  (${state})  ${describeEdit(record)}`);
  }
  return { count: chosen.length, text: lines.join("\n").trim() };
}

// CLI ------------------------------------------------------------------------

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      from: { type: "string" },
      scene: { type: "string" },
      since: { type: "string" },
      hers: { type: "boolean", default: false },
      mine: { type: "boolean", default: false },
      reason: { type: "string" },
      reply: { type: "string" }
    }
  });
  const [command = "pull", id] = positionals;
  const paths = pathsFor();
  const main = async () => {
    switch (command) {
      case "pull": {
        const inbox = values.from ? folderInbox(path.resolve(values.from)) : serverInbox();
        const result = await runPull({ paths, inbox });
        console.log(result.report || `Scene edits: nothing new from Ingram (${result.onServer ?? 0} on record).`);
        if (result.reversions.length) process.exitCode = 2;
        return;
      }
      case "status": {
        const s = status(paths);
        console.log(s.report || `Scene edits: ${s.records} on record; everything merged, nothing waiting.`);
        if (s.reversions.length) process.exitCode = 2;
        return;
      }
      case "check": {
        const reversions = checkReversions(paths);
        if (!reversions.length) {
          console.log("Scene edits: the repo holds every word of Ingram's merged edits.");
          return;
        }
        console.log(pullReport({ reversions }));
        process.exitCode = 1;
        return;
      }
      case "restore": {
        const { records } = readHarvestedRecords(paths.harvestDir);
        const docs = repoDocs(paths);
        const { reversions, touched } = restoreReversions({ records, ledger: readLedger(paths.ledgerPath), docs });
        docs.write(touched);
        console.log(reversions.length ? `Put her words back in ${reversions.length} place(s): ${reversions.map((r) => `${r.file} ${r.path}`).join("; ")}` : "Nothing to restore.");
        return;
      }
      case "resolve": {
        if (!id || values.hers === values.mine) throw new Error('Usage: npm run edits -- resolve <id> --hers   (or --mine --reason "...")');
        const { records } = readHarvestedRecords(paths.harvestDir);
        const docs = repoDocs(paths);
        const out = resolveClash({ recordId: id, keep: values.hers ? "hers" : "mine", reason: values.reason ?? null, records, ledger: readLedger(paths.ledgerPath), docs });
        docs.write(out.touched);
        writeLedger(out.ledger, paths.ledgerPath);
        console.log(`Settled ${out.settled.length} edit(s) to ${pathToString(out.settled.at(-1).path)} in favour of ${values.hers ? "hers" : "the repo's version"}.`);
        return;
      }
      case "done": {
        if (!id || !values.reply) throw new Error('Usage: npm run edits -- done <note id> --reply "what was done"');
        const { records } = readHarvestedRecords(paths.harvestDir);
        writeLedger(answerNote({ noteId: id, reply: values.reply, records, ledger: readLedger(paths.ledgerPath) }), paths.ledgerPath);
        console.log("Answered. The Runner shows the reply on her note after the next deploy.");
        return;
      }
      case "supersede": {
        if (!id || !values.reason) throw new Error('Usage: npm run edits -- supersede <id> --reason "..."');
        const { records } = readHarvestedRecords(paths.harvestDir);
        writeLedger(supersede({ recordId: id, reason: values.reason, records, ledger: readLedger(paths.ledgerPath) }), paths.ledgerPath);
        console.log(`Edit ${id} is superseded; the guard no longer holds the repo to it.`);
        return;
      }
      case "log": {
        const { count, text } = editLog({ paths, briefId: values.scene ?? null, since: values.since ?? null });
        console.log(count ? text : "No edits from Ingram yet.");
        return;
      }
      default:
        throw new Error(`Unknown command "${command}". Try: pull, status, log, check, restore, resolve, done, supersede.`);
    }
  };
  main().catch((err) => {
    console.error(`scene edits: ${err?.message ?? err}`);
    process.exitCode = 1;
  });
}
