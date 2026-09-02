// Tier 0 — architecture lint for the map-editor frontend. Instant, no
// fixtures, no browser. Enforces the same split
// design/testing-strategy.md §1 already uses for the Foundry module's
// core/ (see test/tier0-architecture.test.mjs): pure logic lives in
// src/lib/core/, and it must run identically in plain Node, with no
// browser globals and no maplibre-gl import. This scan is plain text
// scanning, not TypeScript execution, deliberately — see this test
// directory's own note in the map-editor plan on why the deeper
// lod.ts logic tests live in the frontend project's own Vitest suite
// instead (Node 18 has no built-in TypeScript execution; Vitest is the
// natural, already-present Vite pairing for that, not a new dependency
// bolted onto this zero-dependency root suite).

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const frontendRoot = path.join(repoRoot, "tools", "city-map", "frontend", "src");
const coreRoot = path.join(frontendRoot, "lib", "core");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) out.push(full);
  }
  return out;
}

// Same string/comment-stripping approach as the Foundry-module tier0 test
// (test/tier0-architecture.test.mjs) -- simple by design, for our own
// hand-authored files, not a general TS/JS parser.
function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

const FORBIDDEN_GLOBALS = ["window", "document", "navigator", "localStorage", "fetch"];
const FORBIDDEN_IMPORTS = ["maplibre-gl", "svelte-maplibre-gl", "svelte"];

test("frontend src/lib/core/ exists", () => {
  assert.ok(existsSync(coreRoot), `expected ${path.relative(repoRoot, coreRoot)} to exist`);
});

test("core/ never references a browser global", () => {
  if (!existsSync(coreRoot)) return; // covered by the existence test above
  const files = walk(coreRoot);
  assert.ok(files.length > 0, "expected at least one .ts file under src/lib/core/");

  for (const file of files) {
    const code = stripCommentsAndStrings(readFileSync(file, "utf8"));
    for (const name of FORBIDDEN_GLOBALS) {
      const re = new RegExp(`\\b${name}\\b`);
      assert.equal(
        re.test(code),
        false,
        `${path.relative(repoRoot, file)} references the browser global "${name}" — this file is under ` +
          `src/lib/core/, which must run identically in plain Node/Vitest with no DOM. Move this logic to ` +
          `src/lib/ui/ instead.`
      );
    }
  }
});

test("core/ never imports maplibre-gl, svelte-maplibre-gl, or svelte", () => {
  if (!existsSync(coreRoot)) return;
  const files = walk(coreRoot);
  for (const file of files) {
    const code = readFileSync(file, "utf8");
    for (const name of FORBIDDEN_IMPORTS) {
      const re = new RegExp(`from\\s+["']${name.replace("-", "\\-")}["']`);
      assert.equal(
        re.test(code),
        false,
        `${path.relative(repoRoot, file)} imports "${name}" — core/ must stay a plain, framework-free ` +
          `TypeScript module (see test/city-map-editor's own tier0 rationale). Move this logic to src/lib/ui/.`
      );
    }
  }
});
