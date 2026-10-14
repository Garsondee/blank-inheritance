/**
 * pt init
 *
 * One-time and idempotent: the rig's own test files, the playtest Foundry data root and world manifest, and a record of the working
 * tree's git state (so `pt cleanup` can say whether a run left a tracked file changed). Safe to run again.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { makeImages } from "../assets/make-images.mjs";
import { bootstrapDataRoot, createWorld } from "../foundry/bootstrap.mjs";
import { REPO, STATE_DIR } from "../paths.mjs";

/** `git status --porcelain` lines, or [] outside a repository. */
export function gitStatusLines() {
  try {
    return execFileSync("git", ["-C", REPO, "status", "--porcelain", "--untracked-files=no"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

export async function run() {
  const files = makeImages();
  console.log(`test files: ${files.join(", ")}`);
  const boot = bootstrapDataRoot({ log: (l) => console.log(l) });
  console.log(`Foundry data root: licence ${boot.licence}${boot.created.length ? `; made ${boot.created.length} item(s)` : ""}`);
  console.log(createWorld() ? "world manifest made" : "world manifest already there");
  mkdirSync(STATE_DIR, { recursive: true });
  const baseline = path.join(STATE_DIR, "git-baseline.txt");
  writeFileSync(baseline, gitStatusLines().join("\n") + "\n");
  console.log(`git baseline recorded (${existsSync(baseline) ? "tracked files as they stand now" : "?"})`);
  console.log("Next: pt build, start the playtest Foundry, pt world provision, snapshot it (pt world snapshot provisioned), then pt preflight.");
  return 0;
}
