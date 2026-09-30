#!/usr/bin/env node
/**
 * SessionStart hook: bring Ingram's Scene Runner edits home before any work
 * starts, and put what she changed in front of me. design/scene-edits.md §5.
 *
 * Ingram, 2026-09-27: "you'd have a process to make sure you check for any
 * changes on the remote server first." This is the first of three places it
 * happens (then pre-edit.mjs before any scene file is touched, then the first
 * step of `npm run deploy`).
 *
 * Whatever this prints lands in my context at the start of the conversation,
 * which is the point: her before/after text is how I learn how she writes.
 * Never fails the session -- a server that does not answer is said out loud
 * and the conversation goes on.
 */

import { hookTargets, runPull } from "./edits.mjs";
import { recordPull } from "./state.mjs";

const TIMEOUT_MS = 25_000;

const finish = (text) => process.stdout.write(`${text}\n`, () => process.exit(0));

try {
  const result = await Promise.race([
    runPull({ ...hookTargets(), max: 700 }),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`the server did not answer in ${TIMEOUT_MS / 1000}s`)), TIMEOUT_MS))
  ]);
  recordPull({ ok: !result.lockedOut });
  finish(result.report || `Scene edits: nothing new from Ingram (${result.onServer ?? 0} on the server, all merged).`);
} catch (err) {
  finish(`Scene edits: could not check the server for Ingram's edits (${err?.message ?? err}). Run \`npm run edits\` before changing any scene.`);
}
