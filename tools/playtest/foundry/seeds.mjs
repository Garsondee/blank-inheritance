/**
 * Seeded defects: plant known bugs in the playtest COPY of the module, and take them out again (design/playtest-process.md, Phase 1).
 *
 * The copy is a deploy of the working tree under tools/playtest/foundry-data, so a planted defect can never touch the tree. Each defect is
 * an exact find-and-replace (or an append) that REFUSES if its anchor is not there exactly once, so the plants cannot quietly stop planting
 * when the module changes underneath them. The original text of each file is kept in .state/seeds/, and `pt build` puts the copy back the
 * deploy's own way (it re-sends any file that differs), which is the stronger undo; `restore` here is the quick one.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { MODULE_DIR, PT_DIR, STATE_DIR } from "../paths.mjs";

export const DEFECTS_FILE = path.join(PT_DIR, "defects", "defects.json");
export const SEEDS_DIR = path.join(STATE_DIR, "seeds");

export const loadDefects = () => JSON.parse(readFileSync(DEFECTS_FILE, "utf8")).defects;

/** The count of exact occurrences of a string. */
export const occurrences = (text, needle) => (needle ? text.split(needle).length - 1 : 0);

/** The planted text of a source. Pure. Throws when the anchor is not there exactly once. */
export function plant(defect, source) {
  if (typeof defect.append === "string") {
    if (source.includes(defect.append)) throw new Error(`${defect.id}: already planted in this file`);
    return source + defect.append;
  }
  const n = occurrences(source, defect.find);
  if (n === 0 && source.includes(defect.replace)) throw new Error(`${defect.id}: already planted in this file`);
  if (n !== 1) throw new Error(`${defect.id}: the anchor must appear exactly once in ${defect.file} (it appears ${n} time(s))`);
  if (source.includes(defect.replace)) throw new Error(`${defect.id}: already planted in this file`);
  return source.replace(defect.find, () => defect.replace);
}

export function applySeeds({ moduleDir = MODULE_DIR, seedsDir = SEEDS_DIR, defects = loadDefects(), only = null } = {}) {
  mkdirSync(seedsDir, { recursive: true });
  const done = [];
  for (const defect of defects.filter((d) => !only || only.includes(d.id))) {
    const target = path.join(moduleDir, ...defect.file.split("/"));
    if (!existsSync(target)) throw new Error(`${defect.id}: ${defect.file} is not in the playtest copy (pt build)`);
    const original = readFileSync(target, "utf8");
    const planted = plant(defect, original);
    writeFileSync(path.join(seedsDir, `${defect.id}.json`), `${JSON.stringify({ id: defect.id, file: defect.file, original }, null, 2)}\n`);
    writeFileSync(target, planted);
    done.push(defect.id);
  }
  return done;
}

export function restoreSeeds({ moduleDir = MODULE_DIR, seedsDir = SEEDS_DIR } = {}) {
  const restored = [];
  if (!existsSync(seedsDir)) return restored;
  for (const name of readdirSync(seedsDir).filter((n) => n.endsWith(".json"))) {
    const record = JSON.parse(readFileSync(path.join(seedsDir, name), "utf8"));
    writeFileSync(path.join(moduleDir, ...record.file.split("/")), record.original);
    rmSync(path.join(seedsDir, name));
    restored.push(record.id);
  }
  return restored;
}

export function plantedNow({ seedsDir = SEEDS_DIR } = {}) {
  return existsSync(seedsDir) ? readdirSync(seedsDir).filter((n) => n.endsWith(".json")).map((n) => n.replace(/\.json$/, "")) : [];
}
