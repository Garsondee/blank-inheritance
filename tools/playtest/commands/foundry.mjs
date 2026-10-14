/**
 * pt foundry <start|stop|restart|status|logs>
 *
 * The playtest's own Foundry server (port 30100, its own data root). In a Claude session prefer the app's preview (launch config
 * "foundry-playtest"); this does the same from a terminal and is what the world snapshot and restore commands use to know it is stopped.
 */

import { existsSync, readFileSync } from "node:fs";

import { FOUNDRY_PORT, FOUNDRY_ROOT, FOUNDRY_URL, WORLD_ID } from "../paths.mjs";
import { FOUNDRY_LOG, foundryStatus, pidOnPort, startFoundry, stopFoundry } from "../foundry/launch.mjs";

export async function run(argv) {
  const [sub = "status"] = argv;
  const log = (line) => console.log(line);
  if (sub === "status") {
    const status = await foundryStatus();
    if (!status.up) {
      console.log(`Foundry (playtest) is NOT running on port ${FOUNDRY_PORT}.`);
      return 1;
    }
    console.log(`Foundry (playtest) is up on ${FOUNDRY_URL}: world ${status.world ?? "(none launched)"}, ${status.active ? "active" : "at Setup"}, version ${status.version ?? "?"}, ${status.usersActive ?? "?"} user(s) connected, pid ${(await pidOnPort()) ?? "?"}`);
    return 0;
  }
  if (sub === "start") {
    const status = await startFoundry({ log });
    console.log(`Foundry is up: ${FOUNDRY_URL} (world ${status.world ?? WORLD_ID}). Data root ${FOUNDRY_ROOT}`);
    return 0;
  }
  if (sub === "stop") {
    const result = await stopFoundry({ log });
    console.log(result.stopped ? "Foundry stopped." : `Nothing to stop (${result.why}).`);
    return 0;
  }
  if (sub === "restart") {
    await stopFoundry({ log });
    await startFoundry({ log });
    console.log("Foundry restarted.");
    return 0;
  }
  if (sub === "logs") {
    if (!existsSync(FOUNDRY_LOG)) {
      console.log("No log yet.");
      return 0;
    }
    const lines = readFileSync(FOUNDRY_LOG, "utf8").split("\n");
    console.log(lines.slice(-60).join("\n"));
    return 0;
  }
  console.log("usage: pt foundry <start|stop|restart|status|logs>");
  return 2;
}
