/**
 * pt seed <list|apply|restore> [id ...]
 *
 * The shakedown's planted bugs (tools/playtest/defects/defects.json), in the playtest COPY of the module only. `apply` plants them (the
 * world must be reloaded in each browser to feel them: stop the run, plant, start it); `restore` takes them out; `pt build` also does.
 */

import { loadDefects, plantedNow, restoreSeeds, applySeeds } from "../foundry/seeds.mjs";

export async function run(argv) {
  const [sub = "list", ...ids] = argv;
  if (sub === "list") {
    const now = new Set(plantedNow());
    for (const d of loadDefects()) console.log(`${now.has(d.id) ? "PLANTED " : "        "}${d.id.padEnd(26)} ${d.kind.padEnd(11)} ${d.describe}\n          should be caught by: ${d.shouldBeCaughtBy}`);
    return 0;
  }
  if (sub === "apply") {
    const done = applySeeds({ only: ids.length ? ids : null });
    console.log(`Planted in the playtest copy: ${done.join(", ")}. Reload (or restart the run) for the browsers to meet them. Undo: pt seed restore (or pt build).`);
    return 0;
  }
  if (sub === "restore") {
    const done = restoreSeeds();
    console.log(done.length ? `Restored: ${done.join(", ")}.` : "Nothing was planted.");
    return 0;
  }
  console.log("usage: pt seed <list|apply|restore> [id ...]");
  return 2;
}
