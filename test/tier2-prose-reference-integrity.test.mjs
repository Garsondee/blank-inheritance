// Tier 2 — prose references must resolve, 2026-09-21.
//
// WHY THIS EXISTS. A red-team pass over four freshly-written scenes found that
// four of eight new checks claimed a payoff that did not exist: "PAYS OFF AT THE
// TRAM" where the tram scene had no such beat, "+2 on `override-the-cycle`"
// where that obstacle id was real but nothing at the receiving end knew, and a
// critical success that bought something the payoff file already handed out free
// to anybody. Writing the claim feels like wiring and is only a sentence.
//
// `test/tier2-data-corpus.test.mjs` already validates STRUCTURED refs
// (briefRef, challengeRef, encounterRef). Nothing validated the ids authors
// write into PROSE, which is where cross-scene design actually gets recorded --
// so a payoff could rot silently while every structured ref stayed green.
//
// Scope: backtick-quoted identifiers inside prose in scene briefs, episodes and
// challenges. A backtick in this corpus means "this is a real thing with this
// exact name", so if it does not resolve, either the name is wrong or the thing
// was never built.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const dataRoot = path.join(repoRoot, "data");

function loadDir(dir) {
  const abs = path.join(dataRoot, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs)
    .filter((f) => f.endsWith(".json"))
    .map((name) => ({ name, dir, doc: JSON.parse(readFileSync(path.join(abs, name), "utf8")) }));
}

const READ_AT_TABLE = ["scene-briefs", "episodes", "challenges"];
const ALL_DIRS = [...READ_AT_TABLE, "encounters", "subsystems", "npcs", "locations", "factions", "antagonists"];

/** Every id the corpus could legitimately be referring to. */
function buildVocabulary() {
  const ids = new Set();
  const add = (v) => {
    if (typeof v === "string" && v) ids.add(v);
  };
  for (const dir of ALL_DIRS) {
    for (const { name, doc } of loadDir(dir)) {
      add(doc.id);
      add(name.replace(/\.json$/, ""));
      for (const c of doc.checks ?? []) add(c.id);
      for (const o of doc.obstacles ?? []) add(o.id);
      for (const b of doc.beats ?? []) add(b.id);
      for (const s of doc.scenes ?? []) {
        add(s.id);
        add(s.briefRef);
      }
      for (const c of doc.cast ?? []) add(c.id);
      for (const t of doc.temptations ?? []) add(t.id);
      for (const h of doc.handouts ?? []) add(h.id);
    }
  }
  // Node ids live in the story bible, not in data/.
  const nodeIndex = path.join(dataRoot, "generated", "node-index.json");
  if (existsSync(nodeIndex)) {
    const idx = JSON.parse(readFileSync(nodeIndex, "utf8"));
    const nodes = Array.isArray(idx.nodes) ? idx.nodes : Object.values(idx.nodes ?? idx);
    for (const n of nodes) add(n.id);
  }
  return ids;
}

const VOCAB = buildVocabulary();

function strings(node, prefix = "", out = []) {
  if (Array.isArray(node)) node.forEach((v, i) => strings(v, `${prefix}[${i}]`, out));
  else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) strings(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (typeof node === "string") out.push({ p: prefix, s: node });
  return out;
}

// A backticked token that looks like a kebab-case id rather than a path, a file,
// a field name or a snippet of code.
const LOOKS_LIKE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/;
const IS_PATH = /[/.]/;

test("every backtick-quoted id in play-facing prose resolves to something that exists", () => {
  const unresolved = [];
  for (const dir of READ_AT_TABLE) {
    for (const { name, doc } of loadDir(dir)) {
      for (const { p, s } of strings(doc)) {
        if (/(^|\.)\$schema$/.test(p)) continue;
        for (const m of s.matchAll(/`([^`\n]+)`/g)) {
          const token = m[1].trim();
          if (IS_PATH.test(token)) continue; // a file path, checked by eye
          if (!LOOKS_LIKE_ID.test(token)) continue; // prose in backticks, or code
          if (VOCAB.has(token)) continue;
          unresolved.push(`${name} :: ${p} :: \`${token}\``);
        }
      }
    }
  }
  assert.deepEqual(
    unresolved,
    [],
    `prose names ids that do not exist -- either the name is wrong or the thing was never built:\n  ${unresolved.join("\n  ")}`
  );
});

test("every file path named in play-facing prose exists on disk", () => {
  // The other half of the same defect: a note pointing a GM at a file that was
  // renamed or never created. Cheap to check, and it goes stale constantly.
  const missing = [];
  for (const dir of READ_AT_TABLE) {
    for (const { name, doc } of loadDir(dir)) {
      for (const { p, s } of strings(doc)) {
        if (/(^|\.)\$schema$/.test(p)) continue;
        for (const m of s.matchAll(/`((?:data|design|ideas|tools|test|module|reference)\/[^`\n]+)`/g)) {
          let rel = m[1].trim().replace(/[#§].*$/, "").replace(/'s$/, "");
          if (!rel) continue;
          if (!existsSync(path.join(repoRoot, rel))) missing.push(`${name} :: ${p} :: ${rel}`);
        }
      }
    }
  }
  assert.deepEqual(missing, [], `prose points at files that are not there:\n  ${missing.join("\n  ")}`);
});
