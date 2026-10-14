#!/usr/bin/env node
/**
 * The playtest hub: the one long-lived process of a run. It owns the browser, the seats, the run's memory and the control room, and
 * serves them on 127.0.0.1:30177. Start it from the app's preview (launch config "playtest-hub"), which also opens the control room;
 * or `node tools/playtest/hub.mjs`. It is idle until `pt run start` hands it a roster.
 */

import { HUB_PORT } from "./paths.mjs";
import { Hub } from "./hub/ops.mjs";
import { createServer } from "./hub/server.mjs";

const hub = new Hub({ log: (line) => console.log(line) });
const server = createServer(hub);
server.listen(HUB_PORT, "127.0.0.1", () => console.log(`playtest hub listening on http://127.0.0.1:${HUB_PORT}/ (control room)`));

const shutdown = async () => {
  try {
    await hub.stopRun();
  } catch {
    /* going down anyway */
  }
  server.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
process.on("unhandledRejection", (error) => console.error("hub: unhandled rejection:", error));
