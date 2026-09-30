#!/usr/bin/env node
/**
 * Bring the haunts' regulars home: who is at each place, and how they feel
 * about the group now (canon/decisions/D051.md, points 11 and 12).
 *
 * Ingram, 2026-09-29: "That then automatically changes how the scene is
 * written next time, this would give you fantastic background context. You'd
 * know that location X, has 1,2,3 NPCs and you would know each of their
 * descriptions and attitudes."
 *
 * The Scene Runner files `haunt-attitudes.json` into the module's storage/
 * whenever a regular's attitude moves. This reads it (read-only, the same
 * way tools/scene-edits reads Ingram's edits) into harvest/haunts/, which is
 * tracked, and prints what changed. Run by hand (`npm run haunts`) and at
 * session start (`--line`), so it is in front of Claude before any writing.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FILE = "haunt-attitudes.json";
export const HARVEST = path.join(REPO_ROOT, "harvest", "haunts", "attitudes.json");

/** One line per place, naming each regular and their attitude, with the latest reason. */
export function summarise(payload) {
  const places = payload?.places && typeof payload.places === "object" ? payload.places : {};
  const lines = [];
  for (const [place, state] of Object.entries(places)) {
    const names = state?.names ?? {};
    const people = Object.entries(state?.attitudes ?? {}).map(([id, attitude]) => {
      const last = [...(state.history ?? [])].reverse().find((h) => h.regular === id);
      const who = names[id]?.name ?? id;
      return `${who} ${attitude}${last?.why ? ` (${last.why})` : ""}`;
    });
    if (people.length) lines.push(`${place}: ${people.join(", ")}`);
  }
  // A faction's own standing (D052): the ripple, so it's in front of Claude
  // the same way a single regular's attitude already is.
  const factions = payload?.factions && typeof payload.factions === "object" ? payload.factions : {};
  for (const [faction, state] of Object.entries(factions)) {
    const attitude = state?.attitudes?.__self;
    if (!attitude) continue;
    const last = [...(state.history ?? [])].reverse()[0];
    lines.push(`faction ${faction}: ${attitude}${last?.why ? ` (${last.why})` : ""}`);
  }
  return lines;
}

export async function pull({ read } = {}) {
  const files = await read([FILE]);
  const text = files.get(FILE);
  if (!text) return { found: false, changed: false, lines: [] };
  const payload = JSON.parse(text);
  const before = existsSync(HARVEST) ? readFileSync(HARVEST, "utf8") : null;
  const after = `${JSON.stringify(payload, null, 2)}\n`;
  const changed = before !== after;
  if (changed) {
    mkdirSync(path.dirname(HARVEST), { recursive: true });
    writeFileSync(HARVEST, after);
  }
  return { found: true, changed, lines: summarise(payload) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const line = process.argv.includes("--line");
  const finish = (text) => process.stdout.write(`${text}\n`, () => process.exit(0));
  try {
    const { serverInbox } = await import("../scene-edits/inbox.mjs");
    const inbox = serverInbox();
    const result = await Promise.race([
      pull({ read: (names) => inbox.read(names) }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("the server did not answer in 20s")), 20_000))
    ]);
    if (!result.found) finish("Haunts: no regular's attitude has moved yet.");
    else if (line) finish(`Haunts${result.changed ? " (changed since last look)" : ""}: ${result.lines.join(" · ") || "nobody yet"}.`);
    else finish([`Haunts, from ${inbox.describe}:`, ...result.lines.map((l) => `  ${l}`), result.changed ? `Written to ${path.relative(REPO_ROOT, HARVEST)}.` : "Unchanged since the last pull."].join("\n"));
  } catch (err) {
    finish(`Haunts: could not read the server (${err?.message ?? err}).`);
  }
}
