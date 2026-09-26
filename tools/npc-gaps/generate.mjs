#!/usr/bin/env node
// NPC asset/content gap tracker. See design/scene-triggers-and-depth.md §5.
//
// Diffs every data/npcs/*.json file against data/campaign/asset-registry.json
// and reports, per NPC: has a portrait been assigned, has a socialProfile
// (design/npc-social-intel.md) actually been authored with at least one
// Fact, and is `name` still a naming placeholder. asset-registry.json is
// deliberately positive-only ("the only durable record that an assignment
// happened") -- it has no notion of what's still MISSING, which is exactly
// the gap this fills.
//
// Generated, never hand-edited -- matching tools/node-registry/generate.mjs's
// own convention, including where the output lives: data/generated/, not
// data/campaign/, since this is a computed report over the rest of the repo
// rather than campaign entity data (test/tier2-data-corpus.test.mjs's own
// "generated-and-a-report" exclusion). Rerun this script instead of editing
// the output by hand:
//   node tools/npc-gaps/generate.mjs

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");

function readJson(relPath) {
  return JSON.parse(readFileSync(path.join(repoRoot, relPath), "utf8"));
}

export function buildGapReport() {
  const npcsDir = path.join(repoRoot, "data", "npcs");
  const files = existsSync(npcsDir) ? readdirSync(npcsDir).filter((f) => f.endsWith(".json")) : [];
  const registry = readJson("data/campaign/asset-registry.json");

  const portraitIds = new Set(
    registry.assets
      .filter((a) => a.kind === "image" && a.category === "character-portraits" && a.assignedTo?.kind === "npc")
      .map((a) => a.assignedTo.ref)
  );

  const npcs = [];
  for (const file of files.sort()) {
    const npc = readJson(path.join("data", "npcs", file));
    const facts = npc.socialProfile?.facts ?? [];
    npcs.push({
      id: npc.id,
      name: npc.name,
      role: npc.role ?? null,
      hasPortrait: portraitIds.has(npc.id),
      hasSocialProfile: Boolean(npc.socialProfile),
      factCount: facts.length,
      nameIsPlaceholder: npc.name === null,
      namingPlaceholderRef: npc.namingPlaceholderRef ?? null
    });
  }

  const missingPortraitIds = npcs.filter((n) => !n.hasPortrait).map((n) => n.id);
  const missingFactsIds = npcs.filter((n) => n.factCount === 0).map((n) => n.id);
  const placeholderNameIds = npcs.filter((n) => n.nameIsPlaceholder).map((n) => n.id);

  return {
    generatedAt: new Date().toISOString(),
    generatedBy: "tools/npc-gaps/generate.mjs -- do not hand-edit this file, rerun the script instead",
    counts: {
      total: npcs.length,
      missingPortrait: missingPortraitIds.length,
      missingFacts: missingFactsIds.length,
      placeholderName: placeholderNameIds.length
    },
    missingPortraitIds,
    missingFactsIds,
    placeholderNameIds,
    npcs
  };
}

function main() {
  const report = buildGapReport();
  // data/generated/, not data/campaign/ -- this is a computed REPORT over the
  // rest of the repo, not campaign entity data, so it has no meaningful
  // $schema to declare (test/tier2-data-corpus.test.mjs's own documented
  // "generated-and-a-report" exclusion, same class as node-index.json).
  const outDir = path.join(repoRoot, "data", "generated");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "npc-asset-gaps.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(
    `npc-asset-gaps.json written: ${report.counts.total} NPCs, ` +
      `${report.counts.missingPortrait} missing a portrait, ` +
      `${report.counts.missingFacts} with no authored Facts, ` +
      `${report.counts.placeholderName} still naming placeholders.`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
