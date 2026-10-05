#!/usr/bin/env node
/**
 * The project's test runner (`npm test`). Written 2026-10-05, when the suite had grown to ~5,300 tests and ~9 minutes of which 87% was one
 * thing: the battle simulator's AI playing whole fights, one file of which (personnel-complex-battle) is 555 seconds on its own. Those
 * fights prove the AI's decisions and the rules engine under it; nothing outside tools/battle-simulator/ can break them, so running them
 * after every edit to a stage, a scene or an NPC was cost with no information.
 *
 *   npm test                      everything EXCEPT the battle simulator, unless a file of the simulator's own has changed since the
 *                                 last commit (then its tests are included automatically: the one case where they can tell you anything)
 *   npm run test:all              everything, the battle simulator and the slow fuzz sweeps included (before a release, or when in doubt)
 *   npm run test:battle-sim       only the battle simulator
 *   node test/support/run-tests.mjs --list [--all|--fast]     print the files that would run and why, run nothing
 *   node test/support/run-tests.mjs test/tier1-skills.test.mjs test/character-builder     run just these files / directories
 *   anything else is passed on to `node --test` (for instance --test-name-pattern=...)
 *
 * Flags: --all (also sets BI_SLOW=1: the full-size fuzz sweeps, test/support/slow.mjs), --battle-sim (only the simulator), --fast (never
 * the simulator, even if it changed). The module's own suite (module/stagecraft/test) is always included.
 *
 * Why a runner and not a list in package.json: `node --test <directory>` fails here (this Node treats a directory argument as a file), a
 * hand-kept list goes stale (it did, by 20+ files, in September), and a shell glob is not expanded by cmd.exe. Discovery here is the real
 * directory, so a new *.test.mjs is picked up with nothing to edit. The Python suites (unittest) are separate: see package.json.
 */

import { readdirSync, statSync } from "node:fs";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");

/** Paths whose change can alter what the battle simulator does, so its tests become worth their cost. */
export const BATTLE_SIM_TRIGGERS = ["tools/battle-simulator/", "test/battle-simulator/"];
export const BATTLE_SIM_TESTS = "test/battle-simulator/";

const SKIP = new Set(["node_modules", ".git", "dist"]);

/** Every *.test.mjs under `dir` (relative paths, forward slashes, sorted). */
export function findTests(dir, root = repoRoot) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      if (SKIP.has(name)) continue;
      const full = path.join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith(".test.mjs")) out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  };
  walk(path.join(root, dir));
  return out.sort();
}

/** The files git says differ from the last commit (modified, staged or new), or [] outside a repository. */
export function changedFiles(root = repoRoot) {
  try {
    const out = execFileSync("git", ["-C", root, "status", "--porcelain", "--untracked-files=all"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    return out.split("\n").filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop());
  } catch {
    return [];
  }
}

/**
 * Which files to run. `mode` is "default", "all", "battle-sim" or "fast"; `changed` is the changed-file list; `paths` are explicit
 * files or directories (then nothing else is added). Returns { files, simulator: "included"|"skipped"|"only", why }.
 */
export function selectTests({ mode = "default", changed = [], paths = [], root = repoRoot, find = (d) => findTests(d, root), exists = (p) => statSync(path.join(root, p), { throwIfNoEntry: false }) } = {}) {
  if (paths.length) {
    const files = paths.flatMap((p) => (p.endsWith(".test.mjs") ? [p] : find(p)));
    return { files: [...new Set(files)].sort(), simulator: "included", why: "the files and directories asked for" };
  }
  const all = [...find("test"), ...(exists("module/stagecraft/test") ? find("module/stagecraft/test") : [])];
  const sim = all.filter((f) => f.startsWith(BATTLE_SIM_TESTS));
  const rest = all.filter((f) => !f.startsWith(BATTLE_SIM_TESTS));
  if (mode === "battle-sim") return { files: sim, simulator: "only", why: "--battle-sim" };
  if (mode === "all") return { files: all, simulator: "included", why: "--all" };
  if (mode === "fast") return { files: rest, simulator: "skipped", why: "--fast" };
  const touched = changed.filter((f) => BATTLE_SIM_TRIGGERS.some((t) => f.startsWith(t)));
  if (touched.length) return { files: all, simulator: "included", why: `the simulator's own files changed (${touched.slice(0, 3).join(", ")}${touched.length > 3 ? `, +${touched.length - 3} more` : ""})` };
  return { files: rest, simulator: "skipped", why: "nothing of the simulator's has changed since the last commit (npm run test:all runs it anyway)" };
}

export function parseArgs(argv) {
  const out = { mode: "default", list: false, paths: [], passthrough: [] };
  for (const a of argv) {
    if (a === "--all") out.mode = "all";
    else if (a === "--battle-sim") out.mode = "battle-sim";
    else if (a === "--fast") out.mode = "fast";
    else if (a === "--list") out.list = true;
    else if (a.startsWith("-")) out.passthrough.push(a);
    else out.paths.push(a.replace(/\\/g, "/").replace(/\/$/, ""));
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const picked = selectTests({ mode: args.mode, changed: changedFiles(), paths: args.paths });
  const note = `${picked.files.length} test files; the battle simulator is ${picked.simulator} (${picked.why})`;
  if (args.list) {
    console.log(note);
    for (const f of picked.files) console.log(f);
    return;
  }
  if (!picked.files.length) { console.error("run-tests: no test files found."); process.exit(1); }
  console.log(`run-tests: ${note}`);
  const env = { ...process.env };
  if (args.mode === "all") env.BI_SLOW = "1";
  const child = spawn(process.execPath, ["--test", ...args.passthrough, ...picked.files], { cwd: repoRoot, stdio: "inherit", env });
  child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
