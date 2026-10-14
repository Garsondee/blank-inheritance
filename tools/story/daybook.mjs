// Ingram's day record (design/plot-timeline.md §3 and §5, D070): every edit she makes on the timeline page is quoted,
// as she set it, in one decision record per day (`kind: timeline`), and its Changes list says what each edit did. A
// day's record is her words, so it is authority for what she inks. It is also what the reversion guard reads back, so
// nothing older can quietly replace what she set, and where her notes for Claude live.
//
//   # D073 · 2026-10-09 · Ingram's edits on the timeline
//   kind: timeline
//
//   ## Ingram
//   > `manako.spill` · when: "about 44 years ago" → "about 40 years ago"
//   > `watcher.g1-new-kind` · inked
//   > `stray.name` · parked
//   > Note for Claude (N1) on `cicada.envoy-when`: "More recent than fifteen years."
//
//   ## Changes
//   - change `manako.spill` · when
//   - decide `watcher.g1-new-kind`
//
// A note's state and Claude's reply live in harvest/timeline/notes.json, written only by `story note`.
import fs from "node:fs";
import path from "node:path";

export const TITLE = "Ingram's edits on the timeline";
export const NOTES_FILE = "harvest/timeline/notes.json";

const q = (v) => JSON.stringify(String(v ?? ""));
const norm = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const ID = "[a-z0-9][a-z0-9.-]*";
const QUOTED = '"(?:[^"\\\\]|\\\\.)*"';

/** One quoted line for one edit. */
export function quoteFor(edit) {
  switch (edit.op) {
    case "field": return `> \`${edit.id}\` · ${edit.field}: ${q(edit.before)} → ${q(edit.value)}`;
    case "text": return `> \`${edit.id}\` · text: ${q(edit.before)} → ${q(edit.value)}`;
    case "ink": return `> \`${edit.id}\` · inked`;
    case "cut": return `> \`${edit.id}\` · cut${edit.retire?.length ? ` · retire: ${q(edit.retire.join(" | "))}` : ""}`;
    case "pencil": return `> \`${edit.id}\` · back to pencil`;
    case "reopen": return `> \`${edit.id}\` · reopened`;
    case "park": return `> \`${edit.id}\` · parked`;
    case "mergeok": return `> \`${edit.id}\` · merge ${edit.merge} looks right`;
    case "unmerge": return `> \`${edit.id}\` · un-merged ${edit.merge}`;
    case "note": return `> Note for Claude (${edit.note}) on \`${edit.id}\`: ${q(edit.text)}`;
    default: throw new Error(`quoteFor: unknown op ${edit.op}`);
  }
}

/** The Changes line an edit adds, if any (a note or a park changes nothing). */
export function changeFor(edit) {
  switch (edit.op) {
    case "field": return `- change \`${edit.id}\` · ${edit.field}`;
    case "text": return `- change \`${edit.id}\` · text`;
    case "ink": return `- ${edit.verb} \`${edit.id}\``;
    case "cut": return `- cut \`${edit.id}\``;
    case "pencil": return `- pencil \`${edit.id}\``;
    case "reopen": return `- open \`${edit.id}\``;
    default: return null;
  }
}

/** Read the quoted edits back out of a day record, in the order she made them. */
export function parseDayEdits(text) {
  const out = [];
  const block = (String(text).replace(/\r\n/g, "\n").split(/^## Ingram$/m)[1] || "").split(/^## /m)[0];
  const FIELD = new RegExp(`^> \`(${ID})\` · (text|[a-z][a-z-]*): (${QUOTED}) → (${QUOTED})\\s*$`);
  const MARK = new RegExp(`^> \`(${ID})\` · (inked|cut|back to pencil|parked|reopened)(?: · retire: (${QUOTED}))?\\s*$`);
  const MERGE = new RegExp(`^> \`(${ID})\` · (?:merge (D\\d{3}#M\\d+) looks right|un-merged (D\\d{3}#M\\d+))\\s*$`);
  const NOTE = new RegExp(`^> Note for Claude \\((N\\d+)\\) on \`(${ID})\`: (${QUOTED})\\s*$`);
  for (const line of block.split("\n")) {
    let m = line.match(FIELD);
    if (m) {
      out.push(m[2] === "text"
        ? { op: "text", id: m[1], field: "text", before: JSON.parse(m[3]), value: JSON.parse(m[4]) }
        : { op: "field", id: m[1], field: m[2], before: JSON.parse(m[3]), value: JSON.parse(m[4]) });
      continue;
    }
    m = line.match(MARK);
    if (m) {
      const op = { inked: "ink", cut: "cut", "back to pencil": "pencil", parked: "park", reopened: "reopen" }[m[2]];
      out.push(op === "cut" && m[3] ? { op, id: m[1], retire: JSON.parse(m[3]).split("|").map((s) => s.trim()).filter(Boolean) } : { op, id: m[1] });
      continue;
    }
    m = line.match(MERGE);
    if (m) { out.push(m[2] ? { op: "mergeok", id: m[1], merge: m[2] } : { op: "unmerge", id: m[1], merge: m[3] }); continue; }
    m = line.match(NOTE);
    if (m) out.push({ op: "note", note: m[1], id: m[2], text: JSON.parse(m[3]) });
  }
  return out;
}

/** A fresh day record. */
export function newDayRecord(id, date) {
  return `# ${id} · ${date} · ${TITLE}\nkind: timeline\n\nasked: nothing. Ingram's own edits on the plot timeline, quoted as she set them, one line each.\n\n## Ingram\n\n## Changes\n`;
}

/** Add quoted lines under "## Ingram" and change lines under "## Changes", keeping the file's line endings. */
export function appendEdits(raw, edits) {
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  // The index just past a section's last non-blank line.
  const sectionEnd = (start) => {
    let i = start + 1;
    while (i < lines.length && !lines[i].startsWith("## ")) i++;
    let j = i - 1;
    while (j > start && !lines[j].trim()) j--;
    return j + 1;
  };
  const insert = (heading, add) => {
    if (!add.length) return;
    const at = lines.findIndex((l) => l.trim() === heading);
    if (at < 0) throw new Error(`a day record needs its "${heading}" section`);
    const end = sectionEnd(at);
    lines.splice(end, 0, ...(end === at + 1 ? ["", ...add] : add));
  };
  insert("## Ingram", edits.map(quoteFor));
  insert("## Changes", edits.map(changeFor).filter(Boolean));
  let out = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  if (!out.endsWith("\n")) out += "\n";
  // A section followed directly by the next heading gets its blank line back.
  out = out.replace(/([^\n])\n(## )/g, "$1\n\n$2");
  return eol === "\r\n" ? out.replace(/\n/g, "\r\n") : out;
}

/** Is this decision record one of her timeline day records (by its first two lines)? */
export function isDayRecord(text) {
  const [first, second] = String(text).split(/\r?\n/, 2);
  return /^# D\d{3} · /.test(first || "") && (second || "").trim() === "kind: timeline";
}

/** Her timeline day records in a loaded model, oldest first. */
export const dayRecords = (model) => (model.decisions || []).filter((d) => d.kind === "timeline").sort((a, b) => a.id.localeCompare(b.id));

/** Every quoted edit across her day records, oldest first, each with its record and date. */
export function allEdits(model) {
  return dayRecords(model).flatMap((d) => parseDayEdits(d.text).map((e, i) => ({ ...e, record: d.id, date: d.date, n: i })));
}

/**
 * Today's record: the one already opened today, or a new one under the next free D number, claimed by creating the
 * file exclusively so a chat session writing a decision at the same moment can never take the same number.
 * @returns {{ id: string, file: string, created: boolean }}
 */
export function claimDayRecord(root, date) {
  const dir = path.join(root, "canon", "decisions");
  fs.mkdirSync(dir, { recursive: true });
  const files = fs.readdirSync(dir).filter((f) => /^D\d{3}\.md$/.test(f)).sort();
  for (const f of files) {
    const head = fs.readFileSync(path.join(dir, f), "utf8").split(/\r?\n/, 2);
    if (head[0] === `# ${f.slice(0, 4)} · ${date} · ${TITLE}` && head[1] === "kind: timeline") return { id: f.slice(0, 4), file: path.join(dir, f), created: false };
  }
  let n = files.length ? Number(files[files.length - 1].slice(1, 4)) + 1 : 1;
  for (;;) {
    const id = `D${String(n).padStart(3, "0")}`;
    const file = path.join(dir, `${id}.md`);
    try {
      const fd = fs.openSync(file, "wx");
      fs.writeSync(fd, newDayRecord(id, date));
      fs.closeSync(fd);
      return { id, file, created: true };
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      n++;
    }
  }
}

// ---- her notes for Claude

/** The notes' states and replies (written only by `story note`). */
export function readNotesState(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, NOTES_FILE), "utf8")); } catch { return { notes: {} }; }
}

/** Every note she has left, with its state: open, answered (Claude replied) or done. */
export function notesOf(model, state = { notes: {} }) {
  return allEdits(model).filter((e) => e.op === "note").map((e) => {
    const s = state.notes?.[e.note] || {};
    return { id: e.note, on: e.id, text: e.text, record: e.record, date: e.date, state: s.state || "open", reply: s.reply || null, repliedAt: s.at || null };
  });
}

/**
 * Claude's reply to a note, or the note marked done. `story note` is the only caller: the notes themselves stay in her
 * day records, and this file holds only what happened to them.
 */
export function setNoteState(root, id, { reply = null, done = false, at = new Date().toISOString() } = {}) {
  if (!/^N\d+$/.test(id)) throw new Error(`"${id}" is not a note number (N1, N2, ...)`);
  const state = readNotesState(root);
  const notes = { ...(state.notes || {}) };
  const cur = notes[id] || {};
  notes[id] = { state: done ? "done" : "answered", reply: reply ?? cur.reply ?? null, at };
  const sorted = Object.fromEntries(Object.keys(notes).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).map((k) => [k, notes[k]]));
  const file = path.join(root, NOTES_FILE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({ description: "Claude's replies to Ingram's notes on the plot timeline, and which are done. Written only by `node tools/story/story.mjs note`; the notes themselves are quoted in her day records (canon/decisions, kind: timeline).", notes: sorted }, null, 2)}\n`);
  fs.renameSync(tmp, file);
  return notes[id];
}

/** The next free note number (N1, N2, ...), across every day record. */
export function nextNoteId(model) {
  const used = allEdits(model).filter((e) => e.op === "note").map((e) => Number(e.note.slice(1)));
  return `N${(used.length ? Math.max(...used) : 0) + 1}`;
}

// ---- what she has looked at

/** Items whose latest action from her was "parked": seen, and left in pencil for now. */
export function parkedOf(model) {
  const last = new Map();
  for (const e of allEdits(model)) if (e.op !== "note") last.set(e.id, e.op);
  return [...last].filter(([, op]) => op === "park").map(([id]) => id);
}

// ---- the guard: nothing older comes back

/**
 * Every place canon has gone BACK to older words for something she set on the timeline, the same rule as
 * module/blank-inheritance/scripts/core/scene-edits.mjs#findReversions: per item and field, her latest value is what
 * canon must hold; a value she replaced along the way is "older", and canon holding one is a reversion. Something new
 * (neither hers nor older) is a later deliberate change, and allowed.
 *
 * @param {object} model  tools/story/lib.mjs#loadModel
 * @param {Map<string, {item: object}>} items  tools/story/lib.mjs#itemIndex(model)
 * @returns {Array<{ id, field, record, expected, found }>}
 */
export function findTimelineReversions(model, items) {
  const chains = new Map();
  for (const e of allEdits(model)) {
    if (e.op !== "field" && e.op !== "text") continue;
    const key = `${e.id} ${e.field}`;
    if (!chains.has(key)) chains.set(key, []);
    chains.get(key).push(e);
  }
  const out = [];
  for (const chain of chains.values()) {
    const latest = chain[chain.length - 1];
    const hit = items.get(latest.id);
    if (!hit) continue;
    const found = latest.field === "text" ? norm(hit.item.text) : norm(hit.item.meta?.[latest.field]);
    const want = norm(latest.value);
    if (found === want) continue;
    const older = new Set();
    for (const e of chain) { older.add(norm(e.before)); older.add(norm(e.value)); }
    older.delete(want);
    if (older.has(found)) out.push({ id: latest.id, field: latest.field, record: latest.record, expected: latest.value, found });
  }
  return out;
}
