/**
 * pt hub [status]
 *
 * Is the hub answering? (It is started from the app's preview, launch config "playtest-hub", which also opens the control room.)
 */

import { HUB_URL } from "../paths.mjs";

export async function run() {
  try {
    const response = await fetch(`${HUB_URL}/api/status`, { signal: AbortSignal.timeout(4000) });
    const status = await response.json();
    console.log(`The hub is up at ${HUB_URL}/ (control room). ${status.run ? `Run "${status.run.name}" in progress, ${status.seats.length} seat(s).` : "No run in progress."}`);
    return 0;
  } catch {
    console.log(`The hub is NOT answering at ${HUB_URL}/. Start it with the app's playtest-hub preview, or: node tools/playtest/hub.mjs`);
    return 1;
  }
}
