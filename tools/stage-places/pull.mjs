#!/usr/bin/env node
/**
 * Bring the places the GM kept at the table home (Stagecraft's "Keep places", design/stagecraft/module.md §31/§32).
 *
 * The bridge files `stage-places.json` into the module's storage/ whenever the GM presses Keep places on a stage scene. This
 * reads it (read-only, the same way tools/haunts and tools/scene-edits read the server) into `harvest/stage-places/`, which is
 * tracked, and folds it into `module/blank-inheritance/stagecraft/kept-places.json`, which the bridge lays over stages.json
 * (so her places win, and a deploy no longer sends everyone back to the old ones). The stages file itself is not rewritten:
 * it is hand-formatted, and the overlay keeps what she did separate from what was authored.
 *
 * Run by hand (`npm run stages`).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { foldKept } from "../../module/blank-inheritance/scripts/core/stagecraft-bridge.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FILE = "stage-places.json";
export const HARVEST = path.join(REPO_ROOT, "harvest", "stage-places", FILE);
export const KEPT = path.join(REPO_ROOT, "module", "blank-inheritance", "stagecraft", "kept-places.json");

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);
const text = (value) => `${JSON.stringify(value, null, 2)}\n`;

/** Pull, file and fold. `read(names)` returns a Map of name -> text (the server's inbox, or a test's). Paths are overridable for tests. */
export async function pull({ read, harvest = HARVEST, kept = KEPT } = {}) {
  const files = await read([FILE]);
  const raw = files.get(FILE);
  if (!raw) return { found: false, changed: false, lines: [] };
  const filed = JSON.parse(raw);
  mkdirSync(path.dirname(harvest), { recursive: true });
  if (!existsSync(harvest) || readFileSync(harvest, "utf8") !== text(filed)) writeFileSync(harvest, text(filed));
  const folded = foldKept(readJson(kept), filed);
  const after = text(folded.kept);
  const changed = !existsSync(kept) || readFileSync(kept, "utf8") !== after;
  if (changed) writeFileSync(kept, after);
  return { found: true, changed, lines: folded.lines };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const finish = (out) => process.stdout.write(`${out}\n`, () => process.exit(0));
  try {
    const { serverInbox } = await import("../scene-edits/inbox.mjs");
    const inbox = serverInbox();
    const result = await Promise.race([
      pull({ read: (names) => inbox.read(names) }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("the server did not answer in 20s")), 20_000))
    ]);
    if (!result.found) finish("Stage places: the GM has not kept any places on the server yet.");
    else finish([`Stage places, from ${inbox.describe}:`, ...result.lines.map((l) => `  ${l}`), result.changed ? `Folded into ${path.relative(REPO_ROOT, KEPT)}; deploy to send them.` : "Nothing new since the last pull."].join("\n"));
  } catch (err) {
    finish(`Stage places: could not read the server (${err?.message ?? err}).`);
  }
}
