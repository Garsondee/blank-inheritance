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

export async function stageCampaignData(dataRoot) {
  const stagingDir = await mkdtemp(path.join(os.tmpdir(), "blank-inheritance-campaign-data-"));
  for (const dirName of SYNCED_CAMPAIGN_DIRS) {
    const source = path.join(dataRoot, dirName);
    if (!existsSync(source)) continue;
    await cp(source, path.join(stagingDir, dirName), { recursive: true });
  }

  const mapFiles = SYNCED_MAP_FILES.filter((name) => existsSync(path.join(dataRoot, "map", name)));
  if (mapFiles.length) {
    const mapStagingDir = path.join(stagingDir, "map");
    await mkdir(mapStagingDir, { recursive: true });
    for (const name of mapFiles) await cp(path.join(dataRoot, "map", name), path.join(mapStagingDir, name));
  }

  return stagingDir;
}

export async function cleanupStagedData(stagingDir) {
  await rm(stagingDir, { recursive: true, force: true });
}
