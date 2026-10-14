#!/usr/bin/env node
// Node Registry generator. See design/node-registry.md.
//
// Scans quarantine/ideas/story/**/*.md for Node blocks:
//   ### `some-id` — Title
//   **Status:** open · **Last touched:** 2026-09-19
//   **Setup:** ...
//   **Candidates:**
//   - **`a` — short label.** More text. [live]
//   **Constraint:** ...
//   **Referenced by:** (generated, ignored on read)
// and data/**/*.json for `nodeRefs` (array), `openQuestionRef` / `namingPlaceholderRef` (string)
// values anywhere in the document. Cross-references the two, writes data/generated/node-index.json.
//
// Simple by design, matching this project's own tier0 lint (test/tier0-architecture.test.mjs) —
// this parses exactly the block format design/node-registry.md specifies, not general markdown.
//
// Never hand-edit data/generated/node-index.json. Rerun this script instead:
//   node tools/node-registry/generate.mjs

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");

function walk(dir, matches, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git") continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, matches, out);
    else if (matches(entry)) out.push(full);
  }
  return out;
}

function relPath(file) {
  return path.relative(repoRoot, file).replace(/\\/g, "/");
}

// ---------------------------------------------------------------- markdown Node blocks

const NODE_HEADING_RE = /^### `([a-z0-9-]+)` — (.+)$/gm;

/** Splits a Node block into { Label: "raw value text" } by walking every "**Label:**" in order. */
function splitFields(block) {
  const labelRe = /\*\*([A-Za-z][A-Za-z ]*):\*\*/g;
  const marks = [...block.matchAll(labelRe)];
  const fields = {};
  for (let i = 0; i < marks.length; i++) {
    const label = marks[i][1].trim();
    const start = marks[i].index + marks[i][0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : block.length;
    fields[label] = block.slice(start, end).replace(/·\s*$/, "").trim();
  }
  return fields;
}

function parseCandidates(raw) {
  if (!raw) return [];
  const lines = raw
    .split(/\n(?=-\s)/)
    .map((s) => s.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
  const out = [];
  for (const line of lines) {
    const idMatch = line.match(/`([a-z0-9]+)`/);
    if (!idMatch) continue;
    const statusMatch = line.match(/\[(\w+)(?:\s+—[^\]]*)?\]\s*$/);
    out.push({
      id: idMatch[1],
      text: line
        .replace(/^-\s*/, "")
        .replace(/\[\w+(?:\s+—[^\]]*)?\]\s*$/, "")
        .trim(),
      status: statusMatch ? statusMatch[1] : "live",
    });
  }
  return out;
}

function parseMarkdownNodes(file) {
  const source = readFileSync(file, "utf8");
  const headings = [...source.matchAll(NODE_HEADING_RE)];
  const nodes = [];
  for (let i = 0; i < headings.length; i++) {
    const [, id, title] = headings[i];
    const start = headings[i].index + headings[i][0].length;
    const end = i + 1 < headings.length ? headings[i + 1].index : source.length;
    const rest = source.slice(start, end);
    const nextHeading = rest.search(/\n#{1,2} /);
    const block = nextHeading === -1 ? rest : rest.slice(0, nextHeading);

    const fields = splitFields(block);
    nodes.push({
      id,
      title: title.trim(),
      status: (fields.Status || "open").trim(),
      lastTouched: fields["Last touched"] || null,
      setup: fields.Setup || null,
      candidates: parseCandidates(fields.Candidates),
      constraint: fields.Constraint || null,
      resolution: fields.Resolution || null,
      source: { file: relPath(file), kind: "markdown" },
    });
  }
  return nodes;
}

// ---------------------------------------------------------------- registry JSON (open-questions, naming-placeholders)

function loadRegistryNodes(relFile, kind) {
  const full = path.join(repoRoot, relFile);
  if (!existsSync(full)) return [];
  const json = JSON.parse(readFileSync(full, "utf8"));
  const list = kind === "open-question" ? json.questions : json.placeholders;
  return (list || []).map((entry) => ({
    id: entry.id,
    title: kind === "open-question" ? entry.question : entry.label,
    status: kind === "open-question" ? entry.status : entry.finalName ? "resolved" : "open",
    lastTouched: null,
    setup: kind === "open-question" ? entry.notes ?? null : entry.description ?? null,
    candidates: [],
    constraint: null,
    resolution: kind === "open-question" ? entry.resolution : entry.finalName,
    source: { file: relFile, kind: "registry" },
  }));
}

// ---------------------------------------------------------------- data/**/*.json references

function findRefs(dataRoot) {
  const files = walk(dataRoot, (f) => f.endsWith(".json"));
  const refs = [];
  for (const file of files) {
    let json;
    try {
      json = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    const rel = relPath(file);
    (function visit(node, keyPath) {
      if (node === null || typeof node !== "object") return;
      if (Array.isArray(node)) {
        node.forEach((item, i) => visit(item, [...keyPath, i]));
        return;
      }
      for (const [key, value] of Object.entries(node)) {
        if (key === "nodeRefs" && Array.isArray(value)) {
          for (const id of value) refs.push({ nodeId: id, file: rel, field: [...keyPath, key].join(".") });
        } else if ((key === "openQuestionRef" || key === "namingPlaceholderRef") && typeof value === "string") {
          refs.push({ nodeId: value, file: rel, field: [...keyPath, key].join(".") });
        } else {
          visit(value, [...keyPath, key]);
        }
      }
    })(json, []);
  }
  return refs;
}

// ---------------------------------------------------------------- generate

export function generate() {
  const mdFiles = walk(path.join(repoRoot, "quarantine", "ideas", "story"), (f) => f.endsWith(".md"));
  const mdNodes = mdFiles.flatMap(parseMarkdownNodes);
  // naming-placeholders.json merged into open-questions.json 2026-09-19 (design/node-registry.md
  // §12) -- every naming-gap id now lives there too, same id. It's still loaded here in case it's
  // ever un-emptied; today it only ever contributes an empty array.
  const registryNodes = [
    ...loadRegistryNodes("data/campaign/open-questions.json", "open-question"),
    ...loadRegistryNodes("data/campaign/naming-placeholders.json", "naming-placeholder"),
  ];
  const allNodes = [...mdNodes, ...registryNodes];

  const byId = new Map();
  const duplicateIds = [];
  for (const node of allNodes) {
    if (byId.has(node.id)) duplicateIds.push(node.id);
    else byId.set(node.id, node);
  }

  const refs = findRefs(path.join(repoRoot, "data"));
  const brokenRefs = refs.filter((r) => !byId.has(r.nodeId));

  const referencedBy = new Map();
  for (const r of refs) {
    if (!byId.has(r.nodeId)) continue;
    if (!referencedBy.has(r.nodeId)) referencedBy.set(r.nodeId, []);
    referencedBy.get(r.nodeId).push(`${r.file}#${r.field}`);
  }

  const nodes = allNodes.map((n) => ({ ...n, referencedBy: referencedBy.get(n.id) || [] }));
  const orphans = nodes.filter((n) => n.source.kind === "markdown" && n.status === "open" && n.referencedBy.length === 0);
  const openByAge = nodes
    .filter((n) => n.status === "open" && n.lastTouched)
    .sort((a, b) => new Date(a.lastTouched) - new Date(b.lastTouched))
    .map((n) => ({ id: n.id, lastTouched: n.lastTouched }));

  const index = {
    generatedAt: new Date().toISOString(),
    generatedBy: "tools/node-registry/generate.mjs -- do not hand-edit this file, rerun the script instead",
    counts: {
      total: nodes.length,
      open: nodes.filter((n) => n.status === "open").length,
      resolved: nodes.filter((n) => n.status === "resolved").length,
      superseded: nodes.filter((n) => n.status === "superseded").length,
      brokenRefs: brokenRefs.length,
      orphans: orphans.length,
      duplicateIds: duplicateIds.length,
    },
    brokenRefs,
    duplicateIds,
    orphans: orphans.map((n) => n.id),
    openByAge,
    nodes,
  };

  const outDir = path.join(repoRoot, "data", "generated");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "node-index.json"), JSON.stringify(index, null, 2) + "\n");
  return index;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const index = generate();
  console.log(
    `node-index: ${index.counts.total} nodes (${index.counts.open} open, ${index.counts.resolved} resolved), ` +
      `${index.counts.brokenRefs} broken ref(s), ${index.counts.orphans} orphan(s), ${index.counts.duplicateIds} duplicate id(s).`
  );
  if (index.counts.brokenRefs > 0) {
    for (const r of index.brokenRefs) console.log(`  BROKEN: ${r.file}#${r.field} -> "${r.nodeId}"`);
    process.exitCode = 1;
  }
}
