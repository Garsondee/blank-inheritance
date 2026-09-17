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
import { cp, mkdtemp, rm } from "node:fs/promises";
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

export async function stageCampaignData(dataRoot) {
  const stagingDir = await mkdtemp(path.join(os.tmpdir(), "blank-inheritance-campaign-data-"));
  for (const dirName of SYNCED_CAMPAIGN_DIRS) {
    const source = path.join(dataRoot, dirName);
    if (!existsSync(source)) continue;
    await cp(source, path.join(stagingDir, dirName), { recursive: true });
  }
  return stagingDir;
}

export async function cleanupStagedData(stagingDir) {
  await rm(stagingDir, { recursive: true, force: true });
}
