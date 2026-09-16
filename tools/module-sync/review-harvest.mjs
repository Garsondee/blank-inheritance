#!/usr/bin/env node
/**
 * Turns a harvested day (already pulled down by sync-harvest.mjs, or
 * anything staged manually the same way) into the disambiguation report
 * design/harvest-inference.md describes — the "something worth reading"
 * step that pulling storage/ home never did by itself.
 *
 * Reads harvest/sessions/<date>.json (the GM's own typed log) and
 * harvest/chat-<date>.json (foundry/chat-export.mjs's export, flat under
 * storage/ per that file's own note on Foundry's createDirectory bug —
 * sync-harvest.mjs pulls storage/ flatly too, so the two line up with no
 * translation needed), classifies with the exact same
 * module/blank-inheritance/scripts/core/harvest-inference.mjs this project
 * ships, and writes both a machine-readable report (harvest/inference/
 * <date>.json) and a plain-text one to the console.
 *
 * Usage: node tools/module-sync/review-harvest.mjs [--date YYYY-MM-DD] [--harvest-dir ...]
 */
import { parseArgs } from "node:util";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { availableDates, defaultDate, formatReport } from "./harvest-report.mjs";
import { inferSession } from "../../module/blank-inheritance/scripts/core/harvest-inference.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

const { values } = parseArgs({
  options: {
    date: { type: "string" },
    "harvest-dir": { type: "string", default: path.join(repoRoot, "harvest") },
  },
});

/** Filenames in a directory -> the YYYY-MM-DD dates they name, honestly empty if the directory does not exist yet (a fresh repo has never harvested anything). */
async function datesFromFiles(dir, pattern) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  return names.map((name) => name.match(pattern)?.[1]).filter(Boolean);
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  const harvestDir = values["harvest-dir"];
  const sessionsDir = path.join(harvestDir, "sessions");

  const sessionDates = await datesFromFiles(sessionsDir, /^(\d{4}-\d{2}-\d{2})\.json$/);
  const chatDates = await datesFromFiles(harvestDir, /^chat-(\d{4}-\d{2}-\d{2})\.json$/);

  const date = values.date ?? defaultDate(sessionDates, chatDates);
  if (!date) {
    console.log(`No harvested session or chat data found under ${harvestDir}. Nothing to review yet.`);
    console.log(`(Run tools/module-sync/sync-harvest.mjs first, or check --harvest-dir points at the right place.)`);
    return;
  }

  const known = availableDates(sessionDates, chatDates);
  if (!known.includes(date)) {
    console.log(`No harvested data for ${date}. Dates available: ${known.join(", ") || "(none)"}`);
    process.exitCode = 1;
    return;
  }

  const sessionFile = await readJsonIfExists(path.join(sessionsDir, `${date}.json`));
  const chatFile = await readJsonIfExists(path.join(harvestDir, `chat-${date}.json`));

  const { highConfidence, batch } = inferSession({
    gmLogEntries: Array.isArray(sessionFile?.entries) ? sessionFile.entries : [],
    chatRecords: Array.isArray(chatFile?.entries) ? chatFile.entries : []
  });

  console.log(formatReport({ date, highConfidence, batch }));

  const outDir = path.join(harvestDir, "inference");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${date}.json`);
  await writeFile(outPath, JSON.stringify({ date, highConfidence, batch }, null, 2));
  console.log(`\nWritten: ${path.relative(repoRoot, outPath)}`);
}

main().catch((err) => {
  console.error("review-harvest failed:", err);
  process.exitCode = 1;
});
