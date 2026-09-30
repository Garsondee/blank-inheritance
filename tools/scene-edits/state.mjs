/**
 * When this machine last pulled Ingram's edits successfully -- so the
 * pre-edit guard does not open an SSH connection for every single edit of a
 * scene file. Local and gitignored: it is about this checkout, not the
 * campaign.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
// BI_SCENE_EDITS_STATE lets the hook tests keep their own state file.
export const STATE_PATH = process.env.BI_SCENE_EDITS_STATE || path.join(here, ".state.json");

export function readState(statePath = STATE_PATH) {
  try {
    return existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
  } catch {
    return {};
  }
}

export function recordPull({ ok }, statePath = STATE_PATH, now = Date.now()) {
  try {
    writeFileSync(statePath, `${JSON.stringify({ ...readState(statePath), lastPullAt: now, lastPullOk: Boolean(ok) }, null, 2)}\n`);
  } catch {
    /* a missing state file only costs one extra pull */
  }
}

/** Whether a successful pull happened within `withinMs`. */
export function pulledRecently(withinMs, statePath = STATE_PATH, now = Date.now()) {
  const state = readState(statePath);
  return Boolean(state.lastPullOk && typeof state.lastPullAt === "number" && now - state.lastPullAt < withinMs);
}
