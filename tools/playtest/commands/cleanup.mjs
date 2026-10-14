/**
 * pt cleanup [--restore <snapshot>] [--keep-foundry]
 *
 * After a run: stop the run, stop the playtest Foundry, put the world back to a snapshot (default "provisioned": no characters, nothing
 * played), and say whether the working tree's tracked files changed since `pt init` recorded them. The playtest world is its own throwaway,
 * so this is a file copy, not the surgical cleanup a shared world needs.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { parseArgs } from "../core/args.mjs";
import { restoreWorld } from "../foundry/snapshots.mjs";
import { stopFoundry, foundryStatus } from "../foundry/launch.mjs";
import { callOrch } from "../client.mjs";
import { STATE_DIR } from "../paths.mjs";
import { gitStatusLines } from "./init.mjs";

/** Lines in `now` that were not in `before`, ignoring the rig's own files. Pure. */
export function newTrackedChanges(before, now, { ignore = [/tools\/playtest\//, /test\/playtest\//, /\.claude\//, /design\/playtest/, /\.gitignore/, /package\.json/] } = {}) {
  const had = new Set(before);
  return now.filter((line) => !had.has(line) && !ignore.some((re) => re.test(line)));
}

export async function run(argv) {
  const { flags } = parseArgs(argv, { valued: ["restore"] });
  const snapshot = typeof flags.restore === "string" ? flags.restore : "provisioned";
  try {
    const stopped = await callOrch("run/stop");
    console.log(`run: ${stopped.text}`);
  } catch {
    console.log("run: the hub is not answering (nothing to stop, or it is already down)");
  }
  if (!flags["keep-foundry"]) {
    const result = await stopFoundry({ log: (l) => console.log(l) });
    console.log(result.stopped ? "Foundry (playtest) stopped." : "Foundry (playtest) was not running.");
  }
  if ((await foundryStatus()).up) {
    console.log(`Foundry is still up, so the world cannot be restored. Stop it (the app's foundry-playtest preview), then run again.`);
    return 1;
  }
  const meta = await restoreWorld(snapshot);
  console.log(`world: restored snapshot "${meta.name}" (taken ${meta.takenAt}).`);
  const file = path.join(STATE_DIR, "git-baseline.txt");
  if (existsSync(file)) {
    const changed = newTrackedChanges(readFileSync(file, "utf8").split("\n").filter(Boolean), gitStatusLines());
    console.log(changed.length ? `WARNING: tracked files changed since pt init:\n  ${changed.join("\n  ")}` : "git: no tracked file changed since the baseline (apart from the rig's own).");
  } else {
    console.log("git: no baseline recorded (pt init), so the tree was not compared.");
  }
  return 0;
}
