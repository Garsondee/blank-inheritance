// Tier 0 — architecture lint. Instant, no fixtures, no Foundry.
// Enforces the one rule the rest of the test pyramid depends on: core/ stays
// pure. See design/testing-strategy.md §1 and §3.

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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

/* ------------------------------------------------------------------ */
/*  The command bar's contract with the files around it                */
/* ------------------------------------------------------------------ */

const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");

/**
 * Every .hbs path an ApplicationV2 PARTS descriptor names, resolved to disk.
 *
 * Read out of the source text rather than by importing it: these adapters
 * dereference `foundry.applications.api` at module scope, so importing one in
 * plain Node throws before a single assertion could run.
 */
function templateRefsIn(source) {
  const refs = [];
  const rootMatch = source.match(/const TEMPLATE_ROOT = `([^`]+)`/);
  if (rootMatch) {
    const root = rootMatch[1].replace("${MODULE_ID}", "blank-inheritance");
    for (const m of source.matchAll(/`\$\{TEMPLATE_ROOT\}\/([^`]+\.hbs)`/g)) refs.push(`${root}/${m[1]}`);
  }
  for (const m of source.matchAll(/["'`](modules\/blank-inheritance\/templates\/[^"'`]+\.hbs)["'`]/g)) refs.push(m[1]);
  return refs;
}

test("every template an application part names actually exists on disk", () => {
  const files = walk(path.join(scriptsRoot, "foundry"));
  let checked = 0;

  for (const file of files) {
    for (const ref of templateRefsIn(readFileSync(file, "utf8"))) {
      // Foundry resolves from the user-data root ("modules/<id>/..."); the
      // same file sits at "module/<id>/..." in this repo.
      const onDisk = path.join(moduleRoot, ref.replace(/^modules\/blank-inheritance\//, ""));
      assert.ok(
        existsSync(onDisk),
        `${path.relative(repoRoot, file)} names the template "${ref}", which does not exist. ` +
          `A missing PARTS template fails at render time in the browser with nothing in the console ` +
          `pointing at the manifest, so it is caught here instead.`
      );
      checked += 1;
    }
  }

  assert.ok(checked > 0, "expected at least one template reference under scripts/foundry/");
});

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"
]);

/**
 * Count the elements at depth 0, with Handlebars stripped out first.
 *
 * Deliberately a small scanner rather than a real HTML parser: these are our
 * own hand-authored templates, and the single thing being checked is the tag
 * nesting depth, which does not need one.
 */
function rootElementCount(hbs) {
  const stripped = hbs
    .replace(/\{\{!--[\s\S]*?--\}\}/g, "")
    .replace(/\{\{![\s\S]*?\}\}/g, "")
    .replace(/\{\{[\s\S]*?\}\}/g, "");

  let depth = 0;
  let roots = 0;
  for (const m of stripped.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g)) {
    const [, closing, name, , selfClosing] = m;
    if (closing) {
      depth -= 1;
      continue;
    }
    if (depth === 0) roots += 1;
    if (!selfClosing && !VOID_ELEMENTS.has(name.toLowerCase())) depth += 1;
  }
  return { roots, depth };
}

test("every .hbs template renders exactly one top-level element", () => {
  // ApplicationV2's #parsePartHTML throws "Template part must render a single
  // HTML element" (client/applications/api/handlebars-application.mjs) — the
  // most common way a new part crashes, and invisible until it is rendered.
  const templatesRoot = path.join(moduleRoot, "templates");
  const files = [];
  const collect = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) collect(full);
      else if (entry.endsWith(".hbs")) files.push(full);
    }
  };
  collect(templatesRoot);

  assert.ok(files.length > 0, "expected at least one .hbs under module/blank-inheritance/templates/");

  for (const file of files) {
    const { roots, depth } = rootElementCount(readFileSync(file, "utf8"));
    const where = path.relative(repoRoot, file);
    assert.equal(roots, 1, `${where} renders ${roots} top-level elements; ApplicationV2 requires exactly 1.`);
    assert.equal(depth, 0, `${where} has unbalanced tags (depth ended at ${depth}).`);
  }
});

test("the hotbar reserves exactly the height the command bar actually is", () => {
  // bi-components.css pins .bi-bar to a token instead of letting it size to
  // its contents, and bi-foundry-bridge.css lifts Foundry's hotbar clear by
  // the same token. Both files say so in their own comments; this is the
  // assertion that keeps them honest, because the failure is silent — the
  // hotbar simply ends up underneath the chassis.
  const components = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
  const bridge = readFileSync(path.join(moduleRoot, "styles", "bi-foundry-bridge.css"), "utf8");

  const barBlock = components.match(/\n\.bi-bar \{([\s\S]*?)\n\}/);
  assert.ok(barBlock, "could not find the .bi-bar rule in bi-components.css");
  const barHeight = barBlock[1].match(/height:\s*var\((--[\w-]+)\)/);
  assert.ok(barHeight, ".bi-bar no longer sets its height from a single custom property");

  const bottomBlock = bridge.match(/#ui-bottom \{([\s\S]*?)\n\}/);
  assert.ok(bottomBlock, "could not find the #ui-bottom rule in bi-foundry-bridge.css");
  const reserved = bottomBlock[1].match(/padding-bottom:\s*calc\(var\((--[\w-]+)\)/);
  assert.ok(reserved, "#ui-bottom no longer reserves space from a custom property");

  assert.equal(
    reserved[1],
    barHeight[1],
    `#ui-bottom reserves ${reserved[1]} but .bi-bar is ${barHeight[1]} tall. Foundry's macro hotbar ` +
      `will sit behind the chassis. Change both or neither.`
  );
});

test("the bridge still positions the element the command bar mounts as", () => {
  const bridge = readFileSync(path.join(moduleRoot, "styles", "bi-foundry-bridge.css"), "utf8");
  assert.match(
    bridge,
    /#bi-command-bar\s*\{/,
    "bi-foundry-bridge.css no longer positions #bi-command-bar, but CommandBar still mounts under that id."
  );

  // A track whose zones are all shed must actually collapse. display:flex on
  // .bi-bar__group beats the hidden attribute's UA display:none, the same trap
  // .bi-pod[hidden] already exists to undo.
  const components = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");
  assert.match(
    components,
    /\.bi-bar__group\[hidden\]\s*\{\s*display:\s*none/,
    "a shed .bi-bar__group would stay visible: display:flex overrides [hidden]."
  );
});
