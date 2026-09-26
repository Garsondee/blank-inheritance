/**
 * Runs every top-level test/tier*.test.mjs file — the Foundry module's own
 * suite, as opposed to `npm test`, which is node --test test/ and therefore
 * also runs the battle simulator, the city-map tools, the character
 * builder, module-sync, and the craft-library/research-shelf lints.
 *
 * A plain glob in package.json's "scripts" (`test/tier*.test.mjs`) only
 * expands on a shell that globs args before exec, which cmd.exe (npm's
 * default shell on Windows) does not — the literal, unexpanded string
 * would reach `node --test` as one nonexistent path. This does the
 * expansion in Node itself instead, so it works the same on every platform
 * `npm run test:ui` runs on.
 *
 * Listing every file by hand in package.json was the original shape and it
 * silently went stale: by 2026-09-17 it was missing 20+ of the 52 real
 * test/tier*.test.mjs files, because nothing forced package.json to be
 * touched when a new one was added. Globbing the real directory here means
 * a new tier*.test.mjs file is picked up automatically, the same way `npm
 * test`'s own `node --test test/` already discovers new files with no
 * list to maintain.
 */

import { readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const testRoot = path.resolve(here, "..");

const files = readdirSync(testRoot)
  .filter((name) => /^tier.*\.test\.mjs$/.test(name))
  .sort()
  .map((name) => path.join("test", name));

if (files.length === 0) {
  console.error("run-tier-tests: found no test/tier*.test.mjs files — check the glob or the directory.");
  process.exit(1);
}

const child = spawn(process.execPath, ["--test", ...files], {
  stdio: "inherit",
  cwd: path.resolve(testRoot, "..")
});
child.on("exit", (code) => process.exit(code ?? 1));
