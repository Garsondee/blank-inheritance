// Tier 0 — architecture lint. Instant, no fixtures, no Foundry.
// Enforces the one rule the rest of the test pyramid depends on: core/ stays
// pure. See design/testing-strategy.md §1 and §3.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const scriptsRoot = path.join(repoRoot, "module", "blank-inheritance", "scripts");
const coreRoot = path.join(scriptsRoot, "core");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith(".mjs")) out.push(full);
  }
  return out;
}

/**
 * Strip comments AND string-literal contents, so identifiers mentioned in
 * prose ("Foundry's own derived data engine") or in human-readable strings
 * (`foundryType: "Actor"`, error messages mentioning "FilePicker") don't
 * trigger the scans below. Simple by design — these are our own
 * hand-authored files with no `//` inside string literals and no nested
 * backticks inside template-literal interpolations, not a general-purpose
 * JS parser.
 */
function stripCommentsAndStrings(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");
}

const FORBIDDEN_GLOBALS = ["game", "ui", "canvas", "Hooks", "Actor", "Scene", "Macro", "ChatMessage", "FilePicker", "foundry"];

test("core/ never references a Foundry global", () => {
  const files = walk(coreRoot);
  assert.ok(files.length > 0, "expected at least one file under scripts/core/");

  for (const file of files) {
    const code = stripCommentsAndStrings(readFileSync(file, "utf8"));
    for (const name of FORBIDDEN_GLOBALS) {
      const re = new RegExp(`\\b${name}\\b`);
      assert.equal(
        re.test(code),
        false,
        `${path.relative(repoRoot, file)} references the Foundry global "${name}" — this file is under scripts/core/, ` +
          `which must run identically in plain Node (see design/testing-strategy.md §1). Move this logic to scripts/foundry/ instead.`
      );
    }
  }
});

test("the module's directory name matches its own manifest id (regression: found live 2026-09-05)", () => {
  // Foundry's server-side package loader (dist/packages/package.mjs,
  // BasePackage.fromManifestPath) rejects a module outright -- excluded from
  // the packages Collection entirely, never installable/enableable -- if
  // path.basename(dirname(module.json)) !== manifest.id. This is a HARD
  // requirement, not a style preference: confirmed by reading that source
  // and independently confirmed live (2026-09-05) when the 2026-09-04
  // directory consolidation (GH issue #70) renamed the folder to something
  // prettier while deliberately keeping id: "blank-inheritance" for the
  // deterministic-id hashes -- which silently broke the module on the real
  // server for a full day before a restart's error log caught it. The folder
  // is named `blank-inheritance` again specifically because of this rule.
  const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
  const manifest = JSON.parse(readFileSync(path.join(moduleRoot, "module.json"), "utf8"));
  assert.equal(
    path.basename(moduleRoot),
    manifest.id,
    `module.json's "id" ("${manifest.id}") must exactly match the directory it lives in ("${path.basename(moduleRoot)}") -- ` +
      `a mismatch here is rejected by Foundry's real package loader, not just an inconsistency.`
  );
});

test("FilePicker is only ever accessed via foundry.applications.apps.FilePicker (regression: deprecated bare global, found 2026-08-22)", () => {
  const adapterFiles = walk(path.join(scriptsRoot, "foundry"));
  const entryPoint = path.join(scriptsRoot, "blank-inheritance.mjs");
  const files = [...adapterFiles, entryPoint];

  for (const file of files) {
    const code = stripCommentsAndStrings(readFileSync(file, "utf8"));
    const bareUsage = code.match(/(?<!apps\.)\bFilePicker\b/g);
    assert.equal(
      bareUsage,
      null,
      `${path.relative(repoRoot, file)} uses the bare "FilePicker" global, deprecated since Foundry v13 and removed in v15. ` +
        `Use foundry.applications.apps.FilePicker.implementation instead (already fixed once in this file — don't reintroduce it).`
    );
  }
});
