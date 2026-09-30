/**
 * Copies an explicit allow-list of data/ subdirectories into a fresh
 * temporary directory -- one single, clean folder of exactly the content
 * meant to sync to Foundry, so the push tool never has to reason about
 * unrelated things that also happen to live under repo-root data/ (e.g.
 * tools/city-map's own 115MB+ GIS data root at data/map/, or data/schema/'s
 * JSON Schema docs -- neither of which Foundry has any use for).
 *
 * The source of truth stays in exactly one place (repo root data/) -- this
 * never writes back to it. The staged copy is disposable: regenerated fresh
 * on every push, never hand-edited, cleaned up by the caller when done.
 *
 * An explicit include-list on purpose, not an exclude-list: a new,
 * unrelated top-level data/ directory added later (another tool's, say)
 * silently gets left OUT by default here, rather than silently pushed to
 * Foundry by default -- the safer failure direction for something that
 * lands in a live game server.
 */
import { cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { listSources } from "./local-hash.mjs";

export const SYNCED_CAMPAIGN_DIRS = [
  "antagonists",
  "audio",
  "campaign",
  "challenges",
  "characters",
  "encounters",
  "episodes",
  "factions",
  "hangar",
  "locations",
  "npcs",
  "scene-briefs",
  "subsystems"
];

/**
 * data/map/ is deliberately NOT one of SYNCED_CAMPAIGN_DIRS above — it's also
 * tools/city-map's own 115MB+ GIS data root, which Foundry has no use for and
 * this pipeline must never wholesale copy. But specific small files in there
 * ARE real module content, for two different reasons: travel-graph.json and
 * campaign-map.json are GENERATED, read by foundry/travel.mjs for the
 * map-travel ritual (ideas/entries/road-network-routing.json);
 * gazetteer-requests.json is not generated at all -- it's Claude's own
 * authored Claude-to-Ingram request queue (design/location-editor.md;
 * written directly to this file, kept unchanged and under its original
 * name through the retirement of the gazetteer tool that used to read it,
 * design/location-editor.md §10 phase 6), needed here so the Approvals
 * Desk's out-tray (issue #171 §6) can actually
 * count its open entries instead of silently reading nothing. All three are
 * named explicitly, one file at a time, rather than opening data/map/ as a
 * synced directory — the same "safer failure direction" reasoning as the
 * allow-list above, just at file rather than directory granularity.
 */
export const SYNCED_MAP_FILES = ["travel-graph.json", "campaign-map.json", "gazetteer-requests.json"];

/**
 * Exactly the files a campaign-data push carries, as a Map from the path they
 * land at under data/campaign/ on the server to the real file in repo-root
 * data/. The one definition of the allow-list's reach: stageCampaignData
 * copies from it, and tools/module-sync/deploy.mjs and deploy-status.mjs
 * upload and fingerprint straight from it without copying anything, so the
 * three can never disagree about what "the campaign data" is.
 */
export async function campaignDataSources(dataRoot) {
  const sources = new Map();
  for (const dirName of SYNCED_CAMPAIGN_DIRS) {
    const dir = path.join(dataRoot, dirName);
    if (!existsSync(dir)) continue;
    for (const [relativePath, absolutePath] of await listSources(dir)) sources.set(`${dirName}/${relativePath}`, absolutePath);
  }
  for (const name of SYNCED_MAP_FILES) {
    const file = path.join(dataRoot, "map", name);
    if (existsSync(file)) sources.set(`map/${name}`, file);
  }
  return sources;
}

/**
 * The scene-edits ledger's place in the data channel (design/scene-edits.md).
 * It is always sent LAST: it tells the Scene Runner which of Ingram's edits
 * are already in the deployed files, so it must never arrive before those
 * files do, or a page loaded in between would stop showing her words.
 */
export const LEDGER_DATA_PATH = "campaign/scene-edits.json";

/** Data-channel paths (an array, or a Map keyed by path) with the ledger moved to the end. */
export function ledgerLast(paths) {
  if (paths instanceof Map) {
    if (!paths.has(LEDGER_DATA_PATH)) return paths;
    const out = new Map([...paths].filter(([p]) => p !== LEDGER_DATA_PATH));
    out.set(LEDGER_DATA_PATH, paths.get(LEDGER_DATA_PATH));
    return out;
  }
  return [...paths.filter((p) => p !== LEDGER_DATA_PATH), ...paths.filter((p) => p === LEDGER_DATA_PATH)];
}

export async function stageCampaignData(dataRoot) {
  const stagingDir = await mkdtemp(path.join(os.tmpdir(), "blank-inheritance-campaign-data-"));
  for (const [relativePath, absolutePath] of await campaignDataSources(dataRoot)) {
    const destination = path.join(stagingDir, ...relativePath.split("/"));
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(absolutePath, destination);
  }
  return stagingDir;
}

export async function cleanupStagedData(stagingDir) {
  await rm(stagingDir, { recursive: true, force: true });
}
