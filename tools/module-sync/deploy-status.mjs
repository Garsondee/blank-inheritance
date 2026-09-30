#!/usr/bin/env node
/**
 * One line, printed at the start of every Claude Code session: is the live
 * server behind this working tree?
 *
 * WHY, 2026-09-27. Scene 0 ("From Up Here") was authored on 24 September and
 * sat unpushed for three days while every session that followed assumed the
 * server had it; Ingram found out by trying to run it. Nothing told anyone
 * the server was behind. This compares the working tree with what this
 * machine last deployed (.last-deploy.json, written by deploy.mjs) and says
 * how far apart they are -- offline, with no SSH, so it can never slow down or
 * break a session start. It is a nudge to run `npm run deploy`, not a gate.
 *
 * Usage: node tools/module-sync/deploy-status.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashSources, listSources } from "./local-hash.mjs";
import { campaignDataSources } from "./stage-campaign-data.mjs";
import { isLocalOnlyModulePath, RECORD_PATH, REPO_ROOT, videoFingerprint, videoSources } from "./deploy.mjs";

/**
 * The working tree in the same shape deploy.mjs records: content hashes for
 * the module and the campaign data, size-and-time fingerprints for video.
 */
export async function currentLocalState(repoRoot = REPO_ROOT) {
  const moduleDir = path.join(repoRoot, "module", "blank-inheritance");
  const video = new Map([...videoSources(repoRoot)].map(([p, abs]) => [p, videoFingerprint(abs)]));
  return {
    module: await hashSources(await listSources(moduleDir, { skip: isLocalOnlyModulePath })),
    data: await hashSources(await campaignDataSources(path.join(repoRoot, "data"))),
    video
  };
}

/**
 * Which paths differ between a deploy record and the working tree. Pure.
 * @returns {{changed: string[], added: string[], removed: string[]}}  channel-prefixed paths
 */
export function compareToRecord(record, current) {
  const changed = [];
  const added = [];
  const removed = [];
  for (const channel of ["module", "data", "video"]) {
    const was = record?.[channel];
    const now = current[channel];
    if (!was || !now) continue; // a channel this record never covered cannot be compared
    for (const [p, value] of now) {
      if (!(p in was)) added.push(`${channel}:${p}`);
      else if (was[p] !== value) changed.push(`${channel}:${p}`);
    }
    for (const p of Object.keys(was)) if (!now.has(p)) removed.push(`${channel}:${p}`);
  }
  return { changed: changed.sort(), added: added.sort(), removed: removed.sort() };
}

/** The line itself. Pure. */
export function statusLine(record, diff) {
  if (!record) return "Foundry server: no deploy recorded from this machine yet. Run `npm run deploy` to push module, data and videos in one verified step.";
  const when = String(record.deployedAt ?? "").replace("T", " ").slice(0, 16);
  const total = diff.changed.length + diff.added.length + diff.removed.length;
  if (!total) return `Foundry server: up to date with this working tree (build ${record.id}, deployed ${when} UTC).`;
  const parts = [];
  if (diff.changed.length) parts.push(`${diff.changed.length} changed`);
  if (diff.added.length) parts.push(`${diff.added.length} new`);
  if (diff.removed.length) parts.push(`${diff.removed.length} deleted`);
  const examples = [...diff.changed, ...diff.added, ...diff.removed].slice(0, 3).join(", ");
  return `Foundry server is BEHIND this working tree: ${parts.join(", ")} since the last deploy (${when} UTC), e.g. ${examples}. Run \`npm run deploy\` before calling work done.`;
}

export function readRecord(recordPath = RECORD_PATH) {
  if (!existsSync(recordPath)) return null;
  try {
    return JSON.parse(readFileSync(recordPath, "utf8"));
  } catch {
    return null;
  }
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  // Never fail a session start: any problem becomes the line itself.
  try {
    const record = readRecord();
    const diff = record ? compareToRecord(record, await currentLocalState()) : { changed: [], added: [], removed: [] };
    console.log(statusLine(record, diff));
  } catch (err) {
    console.log(`Foundry server: could not compare with the last deploy (${err.message}).`);
  }
}
