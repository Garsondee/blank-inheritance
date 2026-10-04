#!/usr/bin/env node
/**
 * Bring the objectives home: what is open, what the players wrote, and what is left hanging (design/objectives.md).
 *
 * The GM's client files `objectives.json` into the module's storage/ whenever an objective changes. This reads it
 * (read-only, the same way tools/haunts and tools/scene-edits read the server) into harvest/objectives/, which is
 * tracked, and prints what is open. Run by hand (`npm run objectives`) and at session start (`--line`), so the open
 * objectives, the players' own and the loose ends are in front of Claude before any writing: the next episode is
 * written from what the table is actually doing.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FILE = "objectives.json";
export const HARVEST = path.join(REPO_ROOT, "harvest", "objectives", "objectives.json");

const progress = (o) => {
  const req = (o.parts ?? []).filter((p) => p.need === "required" && p.state !== "struck");
  return `${req.filter((p) => p.state === "done").length}/${req.length}`;
};

/** One phrase per open objective, then the players' own, then loose ends and what closed most recently. */
export function summarise(payload) {
  const all = Array.isArray(payload?.objectives) ? payload.objectives : [];
  const open = all.filter((o) => o.status === "active");
  const phrase = (o) => {
    const who = o.source === "player" ? `${o.owner ?? o.giver ?? "?"}'s own${o.writer ? `, by ${o.writer}` : ""}` : o.giver ?? "?";
    const bits = [who, progress(o)];
    if (o.deadline) bits.push(`by ${o.deadline}`);
    if (o.visibility === "owner") bits.push("only me");
    return `${o.title} (${bits.join(", ")})`;
  };
  const story = open.filter((o) => o.source !== "player").map(phrase);
  const players = open.filter((o) => o.source === "player").map(phrase);
  const loose = all
    .filter((o) => o.status === "done")
    .flatMap((o) => (o.parts ?? []).filter((p) => p.need === "optional" && p.state === "open").map((p) => `${p.text} (${o.title})`));
  const lastClosed = all.filter((o) => o.closedAt?.iso).sort((a, b) => String(b.closedAt.iso).localeCompare(String(a.closedAt.iso)))[0];
  return {
    open: open.length,
    lines: [
      story.length ? `open: ${story.join(" · ")}` : null,
      players.length ? `players' own: ${players.join(" · ")}` : null,
      loose.length ? `loose ends: ${loose.join(" · ")}` : null,
      lastClosed ? `last closed: ${lastClosed.title}${lastClosed.record ? ` ("${String(lastClosed.record).slice(0, 90)}${String(lastClosed.record).length > 90 ? "…" : ""}")` : ""}` : null
    ].filter(Boolean)
  };
}

export async function pull({ read, harvest = HARVEST } = {}) {
  const files = await read([FILE]);
  const text = files.get(FILE);
  if (!text) return { found: false, changed: false, open: 0, lines: [] };
  const payload = JSON.parse(text);
  const before = existsSync(harvest) ? readFileSync(harvest, "utf8") : null;
  const after = `${JSON.stringify(payload, null, 2)}\n`;
  const changed = before !== after;
  if (changed) {
    mkdirSync(path.dirname(harvest), { recursive: true });
    writeFileSync(harvest, after);
  }
  return { found: true, changed, ...summarise(payload) };
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
    if (!result.found) finish("Objectives: none given or written yet.");
    else if (line) finish(`Objectives${result.changed ? " (changed since last look)" : ""}: ${result.lines.join("; ") || "nothing open"}.`);
    else finish([`Objectives, from ${inbox.describe}:`, ...result.lines.map((l) => `  ${l}`), result.changed ? `Written to ${path.relative(REPO_ROOT, HARVEST)}.` : "Unchanged since the last pull."].join("\n"));
  } catch (err) {
    finish(`Objectives: could not read the server (${err?.message ?? err}).`);
  }
}
