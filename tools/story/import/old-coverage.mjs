#!/usr/bin/env node
// Phase 6 of the plot timeline (design/plot-timeline.md §7, D070): every section of every old story store must have a
// home in canon, or a stated reason why not, before the old stores can move to quarantine/.
//
// A section is named `<source>:<slug>`: a document's `##`/`###` headings (slug = the heading in lower-case words joined
// by hyphens, repeats numbered -2, -3), a data file's id, or a JSON list entry's id. It is covered when any canon item
// names it in `from:`, or a `kind: import` decision lists it under `## Coverage` (`- key[, key...] → reason`; a key ending
// in `*` covers every section whose key starts with what comes before it).
//
//   node tools/story/import/old-coverage.mjs                  totals per source
//   node tools/story/import/old-coverage.mjs --list <source>  every section of one source, covered or not
//   node tools/story/import/old-coverage.mjs --missing        every section with no home yet
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ROOT, loadModel, itemIndex } from "../lib.mjs";

const md = (p) => ({ kind: "md", path: p });
/** The old stores, by key prefix. Paths are as they were before the move to quarantine/. */
export const SOURCES = Object.freeze({
  v4: md("quarantine/ideas/story/blank-inheritance-v4.md"),
  ch1: md("quarantine/ideas/story/blank-inheritance-ch1-v2.md"),
  mt: md("quarantine/ideas/story/blank-inheritance-master-timeline.md"),
  ledger: md("quarantine/ideas/story/bible/LEDGER.md"),
  "d-cicada": md("quarantine/ideas/story/dossier-cicada.md"),
  "d-first-impact": md("quarantine/ideas/story/dossier-first-impact.md"),
  "d-observer": md("quarantine/ideas/story/dossier-observer.md"),
  "d-gen2": md("quarantine/ideas/story/dossier-second-generation-frames.md"),
  "d-shinobu": md("quarantine/ideas/story/dossier-shinobu.md"),
  "d-directorate": md("quarantine/ideas/story/dossier-the-directorate.md"),
  "b-char": { kind: "md-dir", path: "quarantine/ideas/story/bible/characters" },
  "b-loc": { kind: "md-dir", path: "quarantine/ideas/story/bible/locations" },
  "b-species": { kind: "md-dir", path: "quarantine/ideas/story/bible/species" },
  "b-readme": md("quarantine/ideas/story/bible/README.md"),
  sm: { kind: "files", path: "quarantine/ideas/story/source-material", skip: /(^|\/)raw\// },
  arc: md("design/campaign-arc.md"),
  npc: { kind: "json-dir", path: "data/npcs" },
  loc: { kind: "json-dir", path: "data/locations" },
  ant: { kind: "json-dir", path: "data/antagonists", recursive: true },
  ep: { kind: "json-dir", path: "data/episodes" },
  ie: { kind: "json-dir", path: "ideas/entries" },
  oq: { kind: "json-list", path: "data/campaign/open-questions.json", list: "questions" },
  node: { kind: "json-list", path: "data/generated/node-index.json", list: "nodes" },
  lib: { kind: "json-list", path: "data/campaign/lore-library.json", list: "documents" },
});

export const slugOf = (heading) => heading.toLowerCase().replace(/[`*_]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";

/** A Markdown text's sections: [{ slug, heading, level, line }]. */
export function mdSections(text) {
  const out = [];
  const seen = new Map();
  let fence = false;
  String(text).replace(/\r\n/g, "\n").split("\n").forEach((line, i) => {
    if (/^```/.test(line)) fence = !fence;
    const m = !fence && line.match(/^(#{2,3}) (.+?)\s*#*\s*$/);
    if (!m) return;
    let slug = slugOf(m[2]);
    const n = (seen.get(slug) || 0) + 1;
    seen.set(slug, n);
    if (n > 1) slug = `${slug}-${n}`;
    out.push({ slug, heading: m[2], level: m[1].length, line: i + 1 });
  });
  return out;
}

const walk = (dir, recursive) => {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) { if (recursive) out.push(...walk(full, true).map((f) => `${name}/${f}`)); }
    else out.push(name);
  }
  return out;
};

/** Every section key of every source: Map(key → { source, where, title }). */
export function allSections(root = ROOT) {
  const keys = new Map();
  const add = (key, source, where, title) => keys.set(key, { source, where, title });
  for (const [prefix, s] of Object.entries(SOURCES)) {
    const abs = path.join(root, s.path);
    if (s.kind === "md") {
      if (!fs.existsSync(abs)) continue;
      const secs = mdSections(fs.readFileSync(abs, "utf8"));
      if (!secs.length) add(`${prefix}:whole`, prefix, s.path, "the whole document");
      for (const x of secs) add(`${prefix}:${x.slug}`, prefix, `${s.path}:${x.line}`, x.heading);
    } else if (s.kind === "md-dir") {
      for (const f of walk(abs, false).filter((f) => f.endsWith(".md"))) {
        const file = f.replace(/\.md$/, "");
        const secs = mdSections(fs.readFileSync(path.join(abs, f), "utf8"));
        add(`${prefix}:${file}`, prefix, `${s.path}/${f}`, `${file} (the file's opening)`);
        for (const x of secs) add(`${prefix}:${file}.${x.slug}`, prefix, `${s.path}/${f}:${x.line}`, x.heading);
      }
    } else if (s.kind === "files") {
      for (const f of walk(abs, true).filter((f) => !s.skip?.test(f) && /\.(md|json|txt)$/.test(f))) add(`${prefix}:${slugOf(f.replace(/\.[a-z]+$/, ""))}`, prefix, `${s.path}/${f}`, f);
    } else if (s.kind === "json-dir") {
      for (const f of walk(abs, Boolean(s.recursive)).filter((f) => f.endsWith(".json"))) add(`${prefix}:${path.basename(f, ".json")}`, prefix, `${s.path}/${f}`, f);
    } else if (s.kind === "json-list") {
      if (!fs.existsSync(abs)) continue;
      for (const x of JSON.parse(fs.readFileSync(abs, "utf8"))[s.list] || []) add(`${prefix}:${x.id}`, prefix, s.path, x.title || x.question || x.id);
    }
  }
  return keys;
}

/** What covers what: every `from:` key in canon, and every Coverage line of an import record. */
export function coverageIndex(model) {
  const exact = new Map();
  const globs = [];
  const note = (key, by) => {
    if (key.endsWith("*")) globs.push({ prefix: key.slice(0, -1), by });
    else { if (!exact.has(key)) exact.set(key, []); exact.get(key).push(by); }
  };
  for (const [id, hit] of itemIndex(model)) {
    const from = hit.item.meta?.from || hit.item.origin || "";
    for (const k of String(from).split(",").map((s) => s.trim()).filter(Boolean)) note(k, id);
  }
  for (const d of model.decisions.filter((x) => x.kind === "import")) {
    const block = (d.text.replace(/\r\n/g, "\n").split(/^## Coverage$/m)[1] || "").split(/^## /m)[0];
    for (const line of block.split("\n")) {
      const m = line.match(/^- (.+?) → (.+)$/);
      if (!m) continue;
      for (const k of m[1].split(",").map((s) => s.trim().replace(/^`|`$/g, "")).filter(Boolean)) note(k, `${d.id}: ${m[2].trim()}`);
    }
  }
  return { covers: (key) => exact.get(key) || globs.filter((g) => key.startsWith(g.prefix)).map((g) => g.by) };
}

export function report(root = ROOT) {
  const sections = allSections(root);
  const { covers } = coverageIndex(loadModel(root));
  const rows = [...sections].map(([key, s]) => ({ key, ...s, by: covers(key) }));
  return { rows, missing: rows.filter((r) => !r.by.length) };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const { rows, missing } = report();
  if (args[0] === "--list") {
    for (const r of rows.filter((x) => x.source === args[1])) console.log(`${r.by.length ? "✓" : "·"} ${r.key}  (${r.where}) ${r.title}${r.by.length ? `  ← ${r.by.slice(0, 3).join("; ")}` : ""}`);
  } else if (args[0] === "--missing") {
    for (const r of missing.filter((x) => !args[1] || x.source === args[1])) console.log(`${r.key}  (${r.where}) ${r.title}`);
    console.log(`\n${missing.length} section(s) with no home yet.`);
  } else {
    const by = {};
    for (const r of rows) { by[r.source] ||= { all: 0, done: 0 }; by[r.source].all++; if (r.by.length) by[r.source].done++; }
    for (const [s, n] of Object.entries(by)) console.log(`${s.padEnd(16)} ${String(n.done).padStart(4)} of ${String(n.all).padEnd(4)} ${SOURCES[s].path}`);
    console.log(`\n${rows.length - missing.length} of ${rows.length} sections have a home.`);
  }
}
