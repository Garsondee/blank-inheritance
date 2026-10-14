#!/usr/bin/env node
// The Casebook's coverage (D071, design/plot-timeline.md §7): every piece of the hand-written Casebook outline
// must have a home in canon, or a reason it has none. The outline (the old tools/casebook/content/) was retired to
// quarantine/casebook/content/ when the Casebook became generated from canon (D080), and this proof still reads it
// there: it is what shows nothing the outline held was lost.
//
// Every item of every constant gets a key: `cb:truth.4`, `cb:words.23`, `cb:cast.3.0`, `cb:ch06.table.2`,
// `cb:ch06.find.0`, `cb:generations.3`, `cb:dilemma`. An item is covered when
//   - a canon item says where it came from: `from: cb:truth.4, cb:words.23` on its status line or header; or
//   - D071's "## Coverage" section names it, with why it has no item of its own:
//       - cb:truth.7 → already canon: founders.alive, shucks.rand
//       - cb:calls.* → history: Claude's calls between old sources
//     (`.*` covers every key under that prefix).
//
//   node tools/story/import/casebook-coverage.mjs        what is still uncovered
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
export const IMPORT_RECORD = "D071";
/** Where the retired outline lives now: read-only, searchable, never cited. */
export const CONTENT_URL = new URL("../../../quarantine/casebook/content/content.mjs", import.meta.url);

/** Every key the Casebook's content has, in a stable order. */
export async function casebookKeys(contentUrl = CONTENT_URL) {
  const c = await import(contentUrl);
  const keys = [];
  const pad = (n) => String(n).padStart(2, "0");
  const kebab = (name) => name.toLowerCase().replace(/_/g, "-");
  for (const [name, value] of Object.entries(c)) {
    if (["CHAPTERS", "BOOKS", "CAST", "SECTIONS", "BOOK_SECTION_START", "META", "WEAVE_COLS"].includes(name)) continue;
    if (Array.isArray(value)) value.forEach((_, i) => keys.push(`cb:${kebab(name)}.${i}`));
    else if (typeof value === "string") keys.push(`cb:${kebab(name)}`);
  }
  for (const [g, group] of c.CAST.entries()) group.people.forEach((_, p) => keys.push(`cb:cast.${g}.${p}`));
  for (const [i] of c.BOOKS.entries()) keys.push(`cb:books.${i}`);
  for (const ch of c.CHAPTERS) {
    const k = `cb:ch${pad(ch.n)}`;
    for (const field of ["title", "rank", "line", "learn", "watcherShort", "watcher", "leaves"]) if (ch[field]) keys.push(`${k}.${field}`);
    for (const list of ["table", "choices", "find", "gm"]) (ch[list] || []).forEach((_, i) => keys.push(`${k}.${list}.${i}`));
  }
  keys.push("cb:meta");
  return keys;
}

/** Every `from:` key written in canon, with where. */
export function fromKeys(root = ROOT) {
  const out = new Map();
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".md")) {
        const rel = path.relative(root, full).split(path.sep).join("/");
        for (const m of fs.readFileSync(full, "utf8").matchAll(/(?:^|· )from: ([^·\r\n]+)/gm)) {
          for (const key of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
            if (!out.has(key)) out.set(key, []);
            out.get(key).push(rel);
          }
        }
      }
    }
  };
  walk(path.join(root, "canon"));
  return out;
}

/** D071's Coverage lines: key (or prefix.*) -> reason. */
export function coverageLines(root = ROOT) {
  const p = path.join(root, "canon", "decisions", `${IMPORT_RECORD}.md`);
  if (!fs.existsSync(p)) return [];
  const text = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
  const block = (text.split(/^## Coverage$/m)[1] || "").split(/^## /m)[0];
  const out = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^- (cb:[^→]+?) → (.+)$/);
    if (!m) continue;
    for (const key of m[1].split(",").map((s) => s.trim()).filter(Boolean)) out.push({ key, reason: m[2].trim() });
  }
  return out;
}

export async function coverage(root = ROOT) {
  const keys = await casebookKeys();
  const froms = fromKeys(root);
  const lines = coverageLines(root);
  const covered = new Map();
  const fromPrefixes = [...froms.keys()].filter((k) => k.endsWith(".*"));
  for (const key of keys) {
    if (froms.has(key)) { covered.set(key, `canon: ${froms.get(key).join(", ")}`); continue; }
    const prefix = fromPrefixes.find((p) => key.startsWith(p.slice(0, -1)));
    if (prefix) { covered.set(key, `canon: ${froms.get(prefix).join(", ")}`); continue; }
    const hit = lines.find((l) => l.key === key || (l.key.endsWith(".*") && key.startsWith(l.key.slice(0, -1))));
    if (hit) covered.set(key, hit.reason);
  }
  const unknownFroms = [...froms.keys()].filter((k) => k.startsWith("cb:") && !keys.includes(k) && !(k.endsWith(".*") && keys.some((x) => x.startsWith(k.slice(0, -1)))));
  return { keys, covered, missing: keys.filter((k) => !covered.has(k)), unknownFroms };
}

/**
 * The Changes list the import record must carry: one `add` line for every item that cites it, in file order. An
 * import's `add` expects pencil or an open question, so nothing it brought in can be inked by hand (lib.mjs).
 */
export async function importChanges(root = ROOT) {
  const { loadModel, itemIndex } = await import("../lib.mjs");
  const model = loadModel(root);
  const ids = [];
  for (const [id, hit] of itemIndex(model)) if ((hit.item.source || []).includes(IMPORT_RECORD)) ids.push(id);
  return ids.map((id) => `- add \`${id}\``);
}

/** Rewrite the import record's "## Changes" list to match; a second run writes nothing. */
export async function writeImportChanges(root = ROOT) {
  const p = path.join(root, "canon", "decisions", `${IMPORT_RECORD}.md`);
  const raw = fs.readFileSync(p, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const text = raw.replace(/\r\n/g, "\n");
  const at = text.indexOf("\n## Changes\n");
  if (at < 0) throw new Error(`${IMPORT_RECORD} has no "## Changes" section`);
  const lines = await importChanges(root);
  const next = `${text.slice(0, at)}\n## Changes\n\n${lines.join("\n")}\n`;
  if (next === text) return { changed: false, count: lines.length };
  fs.writeFileSync(p, eol === "\r\n" ? next.replace(/\n/g, "\r\n") : next);
  return { changed: true, count: lines.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--write-changes")) {
    const { changed, count } = await writeImportChanges();
    console.log(`${IMPORT_RECORD}'s Changes: ${count} items${changed ? " (rewritten)" : " (already up to date)"}`);
  }
  const { keys, covered, missing, unknownFroms } = await coverage();
  console.log(`${covered.size} of ${keys.length} Casebook items have a home or a reason.`);
  if (unknownFroms.length) console.log(`\nfrom: keys that aren't Casebook items (typos?):\n${unknownFroms.map((k) => "  " + k).join("\n")}`);
  if (missing.length) {
    console.log(`\nStill uncovered (${missing.length}):`);
    for (const k of missing) console.log("  " + k);
    process.exitCode = 1;
  }
}
