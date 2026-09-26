#!/usr/bin/env node
/**
 * Builds the Rules drawer's search index (design/ux-doctrine.md §10.7:
 * "a search box over the 205 [now 245] locally mirrored SRD articles in
 * reference/srd/... buildable today and answers the rulebook's own
 * first-listed GM priority") from the real reference/srd/ mirror.
 *
 * Why a derived index rather than shipping reference/srd/ itself: that
 * directory's own README is explicit -- "isn't synced anywhere" -- and nothing
 * here changes that for the raw mirror. This follows the exact precedent
 * reference/tables/ already set (CLAUDE.md's own description of it: "pure
 * numeric data extracted from the SRD mirror... meant for a future
 * encounter/challenge validator to consume directly rather than re-parsing
 * rules prose") -- a lean, purpose-built derivative for one real consumer is
 * a different thing from syncing the mirror wholesale, and this project
 * already treats that distinction as legitimate. reference/README.md's own
 * scope note now says so explicitly.
 *
 * Drops $schema/type/retrievedDate/mirrorNote -- bookkeeping the Rules
 * drawer never displays -- and keeps exactly what a GM needs mid-scene:
 * title, book, chapter, citation, source link, and the searchable text
 * itself. Total corpus measured 2026-09-19: 245 articles, ~1.5MB of text,
 * comfortably small enough to load as one file rather than needing a real
 * search server.
 *
 * Usage: node tools/rules-search/build-index.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

export const DEFAULT_SRD_ROOT = path.join(repoRoot, "reference", "srd");
export const DEFAULT_OUTPUT_PATH = path.join(repoRoot, "module", "blank-inheritance", "data", "srd-index.json");

/** Every *.json file under `root`, recursively -- reference/srd/'s own four book directories. */
export function findJsonFiles(root) {
  const out = [];
  for (const entry of readdirSync(root)) {
    const full = path.join(root, entry);
    if (statSync(full).isDirectory()) out.push(...findJsonFiles(full));
    else if (entry.endsWith(".json")) out.push(full);
  }
  return out.sort();
}

/**
 * The pure transform: parsed SRD article objects -> the compact index the
 * Rules drawer actually consumes. Skips anything missing the fields a
 * result card needs rather than throwing, since a future mirroring pass
 * adding a malformed file should degrade the index by one entry, not break
 * the whole drawer.
 */
export function buildIndexFromArticles(articles) {
  const index = [];
  for (const article of articles) {
    if (!article?.id || !article?.title || !article?.text) continue;
    index.push({
      id: article.id,
      title: article.title,
      book: article.book ?? null,
      chapter: article.chapter ?? null,
      pageCitation: article.pageCitation ?? null,
      sourceUrl: article.sourceUrl ?? null,
      text: article.text
    });
  }
  return index;
}

export function buildIndex({ srdRoot = DEFAULT_SRD_ROOT, outputPath = DEFAULT_OUTPUT_PATH } = {}) {
  const files = findJsonFiles(srdRoot);
  const articles = files.map((f) => JSON.parse(readFileSync(f, "utf8")));
  const index = buildIndexFromArticles(articles);
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(index), "utf8");
  return { fileCount: files.length, indexCount: index.length, outputPath };
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  const result = buildIndex();
  console.log(`Rules search index: ${result.indexCount}/${result.fileCount} articles -> ${result.outputPath}`);
}
