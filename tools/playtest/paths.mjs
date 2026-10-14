/**
 * Where everything of the playtest rig lives, in one place, so no script builds a path by hand
 * (design/playtest-process.md, tools/playtest/README.md).
 *
 * The rig runs against its OWN Foundry data root, not the one the other local world uses: a deploy of the working tree (the same
 * `runDeploy` the live server gets, aimed at a folder), a copy of the system, the media, and the playtest world. That keeps a run
 * from touching another session's world, makes the build under test a frozen, verified artefact rather than the tree as it moves,
 * and keeps the module's `storage/` writes out of the repo. Everything under FOUNDRY_ROOT is gitignored and regenerable (`pt build`).
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PT_DIR = here;
export const REPO = path.resolve(here, "..", "..");

export const FOUNDRY_APP = path.join(REPO, "foundryvtt", "Foundry Virtual Tabletop", "resources", "app");
export const FOUNDRY_MAIN = path.join(FOUNDRY_APP, "main.js");

/** The playtest's own Foundry data root (Foundry's --dataPath). Config/ and Data/ live under it. */
export const FOUNDRY_ROOT = path.join(PT_DIR, "foundry-data");
export const CONFIG_DIR = path.join(FOUNDRY_ROOT, "Config");
export const DATA_DIR = path.join(FOUNDRY_ROOT, "Data");

export const WORLD_ID = process.env.PT_WORLD ?? "blank-inheritance-playtest";
export const WORLD_TITLE = "Blank Inheritance (playtest)";
export const WORLD_DIR = path.join(DATA_DIR, "worlds", WORLD_ID);

export const MODULE_ID = "blank-inheritance";
export const MODULE_DIR = path.join(DATA_DIR, "modules", MODULE_ID);
export const STAGECRAFT_DIR = path.join(DATA_DIR, "modules", "stagecraft");
export const SYSTEM_DIR = path.join(DATA_DIR, "systems", "sf2e");
export const AUDIO_DIR = path.join(DATA_DIR, "blank-inheritance-audio");
/** The module's own write channel (session log, chat exports, notebook, portraits). Foundry owns it; a build never touches it. */
export const STORAGE_DIR = path.join(MODULE_DIR, "storage");

/** 30100, not 30000: nothing else (the other local world, the repo's live checks) can reach this server by accident. */
export const FOUNDRY_PORT = Number(process.env.PT_FOUNDRY_PORT ?? 30100);
export const FOUNDRY_URL = `http://localhost:${FOUNDRY_PORT}`;
export const HUB_PORT = Number(process.env.PT_HUB_PORT ?? 30177);
export const HUB_URL = `http://127.0.0.1:${HUB_PORT}`;

export const STATE_DIR = path.join(PT_DIR, ".state");
export const RUNS_DIR = path.join(PT_DIR, "runs");
export const SNAPSHOTS_DIR = path.join(PT_DIR, "snapshots");
export const CHROME = process.env.PT_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";

/** The licence Foundry was activated with on this machine, copied (never typed) into the playtest data root. */
export const DEFAULT_LICENSE = path.join(process.env.LOCALAPPDATA ?? "", "FoundryVTT", "Config", "license.json");
