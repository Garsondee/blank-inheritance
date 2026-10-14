/**
 * World snapshots: the whole playtest world, and the module's `storage/` beside it (the session log, chat exports, notebook and
 * portraits live there, outside the world's databases, so a snapshot without them would put back a world that disagrees with its own
 * files). The playtest world is a throwaway on its own data root, so "restore" is a file copy, and this replaces the surgical,
 * select-my-own-documents cleanup a shared world needs (memory: foundry-test-cleanup).
 *
 * Both directions need Foundry STOPPED: its databases are LevelDB and are not copied while open. The command checks, and refuses.
 */

import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

import { SNAPSHOTS_DIR, STORAGE_DIR, WORLD_DIR, WORLD_ID } from "../paths.mjs";
import { foundryStatus } from "./launch.mjs";

const safeName = (name) => {
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(String(name))) throw new Error(`a snapshot name is lower-case letters, digits and hyphens (got ${JSON.stringify(name)})`);
  return name;
};

async function requireStopped() {
  if ((await foundryStatus()).up) throw new Error("Foundry (playtest) is running. Stop it first: its databases are not copied while open.");
}

export async function snapshotWorld(name, { note = "" } = {}) {
  safeName(name);
  await requireStopped();
  if (!existsSync(WORLD_DIR)) throw new Error(`there is no world at ${WORLD_DIR}`);
  const dir = path.join(SNAPSHOTS_DIR, name);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await cp(WORLD_DIR, path.join(dir, "world"), { recursive: true });
  if (existsSync(STORAGE_DIR)) await cp(STORAGE_DIR, path.join(dir, "storage"), { recursive: true });
  const meta = { name, world: WORLD_ID, takenAt: new Date().toISOString(), note, hasStorage: existsSync(path.join(dir, "storage")) };
  await writeFile(path.join(dir, "snapshot.json"), `${JSON.stringify(meta, null, 2)}\n`);
  return meta;
}

export async function restoreWorld(name) {
  safeName(name);
  await requireStopped();
  const dir = path.join(SNAPSHOTS_DIR, name);
  if (!existsSync(path.join(dir, "snapshot.json"))) throw new Error(`there is no snapshot called "${name}" (pt world list)`);
  await rm(WORLD_DIR, { recursive: true, force: true });
  await cp(path.join(dir, "world"), WORLD_DIR, { recursive: true });
  await rm(STORAGE_DIR, { recursive: true, force: true });
  if (existsSync(path.join(dir, "storage"))) await cp(path.join(dir, "storage"), STORAGE_DIR, { recursive: true });
  return JSON.parse(await readFile(path.join(dir, "snapshot.json"), "utf8"));
}

export async function listSnapshots() {
  if (!existsSync(SNAPSHOTS_DIR)) return [];
  const out = [];
  for (const entry of await readdir(SNAPSHOTS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      out.push(JSON.parse(await readFile(path.join(SNAPSHOTS_DIR, entry.name, "snapshot.json"), "utf8")));
    } catch {
      /* a half-made snapshot is not listed */
    }
  }
  return out.sort((a, b) => String(a.takenAt).localeCompare(String(b.takenAt)));
}

export async function deleteSnapshot(name) {
  safeName(name);
  await rm(path.join(SNAPSHOTS_DIR, name), { recursive: true, force: true });
}
