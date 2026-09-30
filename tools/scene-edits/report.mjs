/**
 * What I read when Ingram's edits come home. design/scene-edits.md §6.
 *
 * She asked for this directly (2026-09-27): "You should ideally even see what
 * I edit, because if I edit enough stuff you might start to see patterns in
 * how I prefer to write and create scenes which helps you to create future
 * ones." So every rewritten line is shown as a word-level before/after --
 * what she cut and what she added -- not just "field X changed". A line she
 * rewrote almost entirely is shown as its old and new text in full instead,
 * which reads better than a diff that is all deletions and insertions.
 *
 * Pure: strings in, strings out.
 */

import { changeShare, describeRecord, diffToText, pathToString, wordDiff } from "../../module/blank-inheritance/scripts/core/scene-edits.mjs";

const REWRITE_SHARE = 0.6;

/** Shorten long text for a summary line without cutting a word in half. */
export function clip(text, max = 600) {
  const value = String(text ?? "");
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40))} …[${value.length - max} more characters]`;
}

const indent = (text, pad) => String(text).split("\n").map((line) => `${pad}${line}`).join("\n");

/**
 * One edit, as I should read it.
 * @param {object} record
 * @param {{max?: number}} [options]  per-block length limit (the hook keeps it short; `log` does not)
 */
export function describeEdit(record, { max = Infinity } = {}) {
  const lines = [`${describeRecord(record)}   [${record.id}]`];
  if (record.op === "set" && (typeof record.after === "string" || typeof record.before === "string")) {
    const segments = wordDiff(record.before ?? "", record.after ?? "");
    const share = changeShare(segments);
    if (!record.before) lines.push(indent(`new: ${clip(record.after, max)}`, "    "));
    else if (!record.after) lines.push(indent(`cleared (was: ${clip(record.before, max)})`, "    "));
    else if (share >= REWRITE_SHARE) {
      lines.push(indent(`was: ${clip(record.before, max)}`, "    "));
      lines.push(indent(`now: ${clip(record.after, max)}`, "    "));
    } else {
      lines.push(indent(clip(diffToText(segments), max), "    "));
    }
  } else if (record.op === "set") {
    lines.push(`    ${JSON.stringify(record.before)} -> ${JSON.stringify(record.after)}`);
  } else if (record.op === "insert" && record.item && typeof record.item === "object") {
    const text = record.item.text ?? record.item.label ?? "";
    if (text) lines.push(indent(`with: ${clip(text, max)}`, "    "));
  } else if (record.op === "insert") {
    lines.push(indent(`line: ${clip(record.item, max)}`, "    "));
  } else if (record.op === "remove" && record.item) {
    const text = typeof record.item === "string" ? record.item : record.item.text ?? record.item.id;
    lines.push(indent(`was: ${clip(text, Math.min(max, 200))}`, "    "));
  }
  return lines.join("\n");
}

/**
 * The digest a pull prints: what arrived, what went in, and everything that
 * needs a person -- clashes, edits with nowhere to go, notes, and any place
 * the repo has gone back to older words.
 */
export function pullReport({ fetched = [], results = [], problems = [], reversions = [], pendingNotes = [], documentEdits = [], source = null, onServer = null, max = Infinity, lockedOut = false }) {
  const out = [];
  const newIds = new Set(fetched.map((f) => f.record.id));
  if (lockedOut) out.push("Scene edits: another run is merging right now; nothing was merged by this one.");

  if (fetched.length) {
    out.push(`Scene edits: ${fetched.length} new from Ingram${source ? ` (${source})` : ""}${onServer !== null ? `; ${onServer} on the server in all` : ""}.`);
    const byScene = new Map();
    for (const { record } of fetched) {
      if (!byScene.has(record.briefId)) byScene.set(record.briefId, []);
      byScene.get(record.briefId).push(record);
    }
    for (const [briefId, list] of byScene) {
      out.push(`  ${briefId}: ${list.length} edit${list.length === 1 ? "" : "s"}`);
      for (const record of list) out.push(indent(describeEdit(record, { max }), "    "));
    }
    out.push("  READ THESE: they are how she writes. Note any pattern in feedback_ingram_writing_patterns (memory).");
  }

  const merged = results.filter((r) => r.result === "merged" || r.result === "already");
  if (merged.length) {
    const files = [...new Set(merged.map((r) => r.record.file))];
    out.push(`  Merged ${merged.length} into ${files.map((f) => `data/${f}.json`).join(", ")}.`);
    for (const r of merged.filter((m) => m.alsoRenamedIn)) out.push(`  The scene's new title was also written into data/${r.alsoRenamedIn}.json's running order.`);
  }

  const clashes = results.filter((r) => r.result === "clash");
  if (clashes.length) {
    out.push(`  CLASHES (${clashes.length}): the repo changed after she saw these. Hers still shows in the Runner; nothing was overwritten.`);
    for (const { record, current, reason } of clashes) {
      out.push(`    ${record.briefId} ${pathToString(record.path)}   [${record.id}]`);
      if (reason) out.push(`      ${reason}`);
      if (record.op === "set") {
        out.push(indent(`she saw:    ${clip(record.before, max)}`, "      "));
        out.push(indent(`she wrote:  ${clip(record.after, max)}`, "      "));
        out.push(indent(`repo says:  ${clip(current, max)}`, "      "));
      }
    }
    out.push("    Settle with: npm run edits -- resolve <id> --hers   (or --mine --reason \"...\" once she has agreed)");
  }

  const nowhere = results.filter((r) => r.result === "unplaceable");
  if (nowhere.length) {
    out.push(`  NOWHERE TO GO (${nowhere.length}): the thing she edited is gone from the repo.`);
    for (const { record, reason } of nowhere) out.push(`    ${record.briefId} ${pathToString(record.path)}: ${reason}   [${record.id}]`);
  }

  if (pendingNotes.length) {
    out.push(`  NOTES FOR YOU (${pendingNotes.length}):`);
    for (const note of pendingNotes) {
      out.push(`    ${note.briefId}${note.path?.length ? ` ${pathToString(note.path)}` : ""}: "${clip(note.text, 400)}"   [${note.id}]${newIds.has(note.id) ? " (new)" : ""}`);
    }
    out.push("    Answer with: npm run edits -- done <id> --reply \"what was done\"");
  }

  if (documentEdits.length) {
    out.push(`  EDITED IN FOUNDRY (${documentEdits.length}): she changed these documents directly in Foundry. They were kept there, not rebuilt; fold her words into the repo by hand.`);
    for (const { name, snapshot } of documentEdits) {
      out.push(`    ${snapshot.document} "${snapshot.name}" (from ${snapshot.source ?? snapshot.sourceId}): harvest/foundry-edits/${name}`);
      for (const word of snapshot.words ?? []) out.push(indent(`${word.name}: ${clip(word.content, Math.min(max, 400))}`, "      "));
    }
  }

  if (reversions.length) {
    out.push(`  CRITICAL -- ${reversions.length} place${reversions.length === 1 ? "" : "s"} where the repo has gone back to older words than hers:`);
    for (const r of reversions) out.push(`    data/${r.file}.json ${r.path} (${r.kind})   [${r.recordId}]`);
    out.push("    Put hers back with: npm run edits -- restore   (deploys refuse until this is fixed)");
  }

  for (const problem of problems) out.push(`  problem: ${problem}`);
  return out.join("\n");
}
