/**
 * pt build [--check] [--no-art] [--no-video] [--no-audio] [--no-system] [--keep-extra] [--repo-staging]
 *
 * Make the playtest's Foundry data root a verified copy of what a deploy would put on the live server, from this working tree
 * (tools/playtest/foundry/build.mjs says how). --check compares only, skips the (slow) art staging and says whether the copy is current.
 * --repo-staging also refreshes the OTHER local copy, module/blank-inheritance/data/campaign/ (the one the other local world reads).
 */

import { parseArgs } from "../core/args.mjs";
import { buildLocal, refreshRepoStaging } from "../foundry/build.mjs";

export async function run(argv) {
  const { flags } = parseArgs(argv);
  const check = Boolean(flags.check);
  const result = await buildLocal({
    art: check ? false : flags.art !== false,
    video: flags.video !== false,
    audio: flags.audio !== false,
    system: flags.system !== false,
    dryRun: check,
    prune: !flags["keep-extra"]
  });
  console.log("");
  if (flags["repo-staging"]) {
    console.log("=== the other local copy: module/blank-inheritance/data/campaign (gitignored) ===");
    await refreshRepoStaging({ dryRun: check });
    console.log("");
  }
  if (check) {
    console.log(result.current ? "CURRENT: the playtest copy matches this working tree in every channel." : "BEHIND: the playtest copy differs from this working tree (run `pt build`).");
    return result.current ? 0 : 1;
  }
  if (result.ok) {
    console.log(`BUILT: playtest copy is current (build ${result.stamp?.id ?? "unstamped"}).`);
    return 0;
  }
  console.log("NOT BUILT:");
  for (const error of result.errors) console.log(`  - ${error}`);
  return 1;
}
