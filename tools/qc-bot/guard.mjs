/**
 * The branch guard: did the bot change only what it may change?
 *
 * Run by the bot before it pushes (`qc guard`) and by Claude before merging anything from a qc/ branch. It compares the
 * branch with the base it started from and checks every file against the write rules in lib.mjs: reports, scenes and
 * their check files, the built copies of those, brand-new people, the NPC roster. A change to anything else, a deleted
 * file, a renamed file or an edit to a person who already exists is a violation, and the branch is not merged.
 */
import { spawnSync } from "node:child_process";
import { ROOT, writeProblem } from "./lib.mjs";

/** @param {{status: string, path: string}[]} entries  git name-status entries @returns {string[]} the problems, in plain words */
export function guardEntries(entries) {
  return entries.map((e) => writeProblem(e.path, e.status)).filter(Boolean);
}

/**
 * What changed between where the branch began and its tip, as git's name-status entries (renames shown as a delete and an
 * add). `head` defaults to the checked-out commit; name a remote branch (`origin/qc/...`) to look at it WITHOUT checking
 * it out, which matters here: checking a bot branch out in the working tree would put its unapproved changes where the
 * auto-sync watcher can deploy them.
 */
export function changedEntries(root = ROOT, base = "origin/master", head = "HEAD") {
  const git = (args) => spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const mergeBase = git(["merge-base", base, head]);
  const from = mergeBase.status === 0 ? mergeBase.stdout.trim() : base;
  const diff = git(["diff", "--name-status", "--no-renames", from, head]);
  if (diff.status !== 0) throw new Error(`git diff failed: ${(diff.stderr || "").slice(0, 300)}`);
  return diff.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split("\t");
      return { status: status[0], path: rest.join("\t") };
    });
}

export function guardBranch(root = ROOT, base = "origin/master", head = "HEAD") {
  const entries = changedEntries(root, base, head);
  return { entries, problems: guardEntries(entries) };
}
