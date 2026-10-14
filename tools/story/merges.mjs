// Claude's merge records (`kind: merge`), read back as data (design/plot-timeline.md §8 step 7, D079, D080).
//
// A merge makes several pieces of one thing in the pencil into one item. Nothing is lost: the record keeps each
// original section exactly as it was, so a merge can be undone, and the merged item keeps every source and `from:` key.
// The record is Claude's, never her words and never authority for ink (like an import record).
//
//   ### M1 · cicada.the-faithful
//   why: three pieces of one description
//   kind: fact
//   file: world/cicada.md
//   kept: cicada.the-faithful
//   absorbed: cicada.faithful, cicada.faithful-believe
//   state: live
//   after: <16 hex: the merged item as written>
//
//   ```was cicada.faithful 12 1 world/cicada.md
//   ## cicada.faithful
//   ... the original section, exactly ...
//   status: sketch · by: claude · ...
//   ```
//   (the numbers and file: which "## " section of its file it was, counting from 0, how many blank lines followed it, and
//   the file it was in (a merge across files takes pieces from several), so undo puts it back where it was)
//
//   ```refs
//   {"file":"threads/x.md","line":12,"before":"- a.b","after":"- c.d"}
//   ```
//
// This file is pure (lib.mjs reads aliases from it); merge.mjs does the work.
import crypto from "node:crypto";

import { lf, csv } from "./format.mjs";

export const MERGE_KINDS = ["fact", "idea"];

/** The merges in one record: every "### Mn · title" section under "## Merges", honouring ``` fences. */
export function parseMergeRecord(text, record) {
  const out = [];
  let inMerges = false;
  let cur = null;
  let fence = null;
  for (const line of lf(text).split("\n")) {
    if (fence) {
      if (/^```\s*$/.test(line)) { cur.fences.push(fence); fence = null; } else fence.lines.push(line);
      continue;
    }
    if (/^## /.test(line)) { inMerges = line.trim() === "## Merges"; cur = null; continue; }
    if (!inMerges) continue;
    const h = line.match(/^### M(\d+) · (.+)$/);
    if (h) { cur = { no: Number(h[1]), title: h[2].trim(), meta: {}, fences: [] }; out.push(cur); continue; }
    if (!cur) continue;
    const f = line.match(/^```(\S+)(?: (.+))?$/);
    if (f) { fence = { kind: f[1], arg: f[2] ? f[2].trim() : null, lines: [] }; continue; }
    const k = line.match(/^([a-z][a-z-]*): (.*)$/);
    if (k) cur.meta[k[1]] = k[2].trim();
  }
  return out.map((m) => ({
    record,
    no: m.no,
    ref: `${record}#M${m.no}`,
    title: m.title,
    kind: m.meta.kind || "fact",
    file: m.meta.file || null,
    kept: m.meta.kept || null,
    absorbed: csv(m.meta.absorbed),
    why: m.meta.why || "",
    state: m.meta.state || "live",
    after: m.meta.after || null,
    undone: m.meta.undone || null,
    // the originals, as their files held them: id -> "## id\ntext\nstatus: ..."
    was: new Map(m.fences.filter((x) => x.kind === "was").map((x) => [x.arg.split(" ")[0], x.lines.join("\n")])),
    // where each original sat: { idx: its "## " section number in the file, blanks: the blank lines after it }
    wasAt: new Map(m.fences.filter((x) => x.kind === "was").map((x) => { const [id, idx, blanks, file] = x.arg.split(" "); return [id, { idx: idx === undefined ? null : Number(idx), blanks: blanks === undefined ? 1 : Number(blanks), file: file || m.meta.file || null }]; })),
    refs: m.fences.filter((x) => x.kind === "refs").flatMap((x) => x.lines.filter((l) => l.trim()).map((l) => JSON.parse(l))),
  }));
}

/** Is this decision record one of Claude's merge records (by its first two lines)? */
export function isMergeRecord(text) {
  const [first, second] = String(text).split(/\r?\n/, 2);
  return /^# D\d{3} · /.test(first || "") && (second || "").trim() === "kind: merge";
}

/** Every merge in a loaded model, oldest record first. */
export function mergesOf(model) {
  return [...(model.decisions || [])]
    .filter((d) => d.kind === "merge")
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((d) => parseMergeRecord(d.text, d.id));
}

/**
 * Old id -> the id that took its place, for every live merge. A decision record from before a merge still names the
 * old id on its Changes lines; this is how the check and the timeline find it again.
 */
export function aliasesOf(decisions) {
  const aliases = new Map();
  const merges = [...(decisions || [])].filter((d) => d.kind === "merge").sort((a, b) => a.id.localeCompare(b.id)).flatMap((d) => parseMergeRecord(d.text, d.id));
  for (const m of merges) {
    if (m.state !== "live") continue;
    for (const id of m.absorbed) if (id !== m.kept) aliases.set(id, m.kept);
  }
  return aliases;
}

/** Where an old id went: { kept, ref } for the live merge that took it, or null. */
export function mergedInto(model, id) {
  const hit = mergesOf(model).find((m) => m.state === "live" && m.kept !== id && m.absorbed.includes(id));
  return hit ? { kept: resolveAlias(aliasesOf(model.decisions), id), ref: hit.ref } : null;
}

/** Follow an id through the aliases to the item that holds it now (a merge may itself be merged later). */
export function resolveAlias(aliases, id) {
  let cur = id;
  for (let i = 0; i < 20 && aliases && aliases.has(cur); i++) cur = aliases.get(cur);
  return cur;
}

/** The fingerprint a merge records for the item it made: its words and meta line as they stand. */
export function itemHash(text, metaLine) {
  return crypto.createHash("sha256").update(`${String(text).replace(/\s+/g, " ").trim()}\n${metaLine}`).digest("hex").slice(0, 16);
}

/** One recorded original ("## id\ntext\nstatus: ...") as { id, text, meta }. */
export function parseWas(block) {
  const lines = lf(block).split("\n").filter((l, i, a) => !(i === a.length - 1 && !l.trim()));
  const id = (lines[0] || "").replace(/^#+ /, "").trim();
  const meta = lines[lines.length - 1] || "";
  return { id, text: lines.slice(1, -1).join(" ").replace(/\s+/g, " ").trim(), meta };
}
