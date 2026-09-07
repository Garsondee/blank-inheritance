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

test("the hotbar reservation is exactly the base bar height — nothing is allowed to grow past it", () => {
  // Verified LIVE 2026-09-07 in a running Foundry instance, not just read
  // from source: a pod taller than .bi-bar's own explicit height does not
  // escape upward into this reserved space the way the dome's own looming
  // does. An auto-sized grid row with no grid-template-rows lays out from
  // the container's top edge regardless of align-items, so excess height
  // pushes the pod's BOTTOM past the real window's bottom, not its top past
  // the hotbar. Two earlier fixes each reserved MORE space here on the
  // theory that growth went upward — neither could ever have worked, and a
  // stress-test actor with five Lores proved it: 117px of its checks pod
  // hung off the bottom of an ordinary 900px window, unreachable, while the
  // hotbar was never actually threatened at all.
  //
  // The real fix is that NOTHING gets a taller ceiling than the bar itself
  // any more (see the checks-pod rule in bi-components.css), which is what
  // this test actually protects: if that ever regresses and something is
  // allowed to grow again, this reservation needs to grow with it.
  const bridge = readFileSync(path.join(moduleRoot, "styles", "bi-foundry-bridge.css"), "utf8");
  const components = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");

  const bottomBlock = bridge.match(/body\.bi-theme #ui-bottom \{([\s\S]*?)\n\}/);
  assert.ok(bottomBlock, "could not find the #ui-bottom rule in bi-foundry-bridge.css");
  assert.match(
    bottomBlock[1],
    /padding-bottom:\s*calc\(var\(--bi-bar-height\)\s*\+/,
    "#ui-bottom's reservation is no longer a plain function of --bi-bar-height alone"
  );

  const checksRule = components.match(/\.bi-bar \.bi-pod\[data-zone="checks"\]\s*\{([\s\S]*?)\n\}/);
  assert.ok(checksRule, "could not find the checks pod's own rule in bi-components.css");
  assert.equal(
    /max-height/.test(checksRule[1]),
    false,
    "the checks pod has its own max-height again — if it can exceed the base .bi-bar .bi-pod ceiling, " +
      "it can push its own content off the bottom of a real window (measured live, not theoretical), " +
      "and #ui-bottom's plain bar-height reservation above is no longer the whole story"
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

test("only foundry/rolls.mjs may reach into the sf2e system namespace", () => {
  // `game.pf2e` (yes, pf2e, even in sf2e) is a third-party bundle's own
  // namespace: undeclared, untyped, and free to move between versions. It is
  // survivable as long as every use of it sits in one file that a single
  // contract test can guard. Spread across the module it becomes unauditable.
  const allowed = path.join(scriptsRoot, "foundry", "rolls.mjs");
  const files = [...walk(scriptsRoot)];

  for (const file of files) {
    if (file === allowed) continue;
    const code = stripCommentsAndStrings(readFileSync(file, "utf8"));
    assert.equal(
      /\bgame\s*\.\s*pf2e\b/.test(code),
      false,
      `${path.relative(repoRoot, file)} reaches into game.pf2e. Route it through ` +
        `scripts/foundry/rolls.mjs instead, which is the one file allowed to know that namespace exists.`
    );
  }
});

test("core/ never imports from foundry/", () => {
  // The purity lint above catches globals, but not an import that would drag
  // them in transitively — core/console-model.mjs importing foundry/rolls.mjs
  // would pass the global scan and still break plain-Node execution.
  for (const file of walk(coreRoot)) {
    const code = readFileSync(file, "utf8");
    const imports = [...code.matchAll(/from\s+["']([^"']+)["']/g)].map((m) => m[1]);
    for (const specifier of imports) {
      assert.equal(
        specifier.includes("/foundry/") || specifier.startsWith("../foundry/"),
        false,
        `${path.relative(repoRoot, file)} imports "${specifier}" from the adapter layer. ` +
          `scripts/core/ must run in plain Node (design/testing-strategy.md §1).`
      );
    }
  }
});

test("every localisation key the module references actually exists", () => {
  // Found the hard way: a patch guard matched the pre-existing zone label
  // "Checks" and silently skipped adding the Console.Checks GROUP, so four
  // legends would have rendered as raw dotted keys on screen. Nothing failed —
  // game.i18n.localize returns the key unchanged when it misses, which is the
  // most polite possible way to ship a broken label.
  const lang = JSON.parse(readFileSync(path.join(moduleRoot, "lang", "en.json"), "utf8"));

  const resolve = (key) => key.split(".").reduce((node, part) => (node == null ? node : node[part]), lang);

  const sources = [...walk(scriptsRoot)];
  const templatesRoot = path.join(moduleRoot, "templates");
  const collect = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) collect(full);
      else if (entry.endsWith(".hbs")) sources.push(full);
    }
  };
  collect(templatesRoot);

  let checked = 0;
  for (const file of sources) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/BLANKINHERITANCE(?:\.[A-Za-z0-9_]+)+/g)) {
      const key = match[0];
      const value = resolve(key);
      assert.equal(
        typeof value,
        "string",
        `${path.relative(repoRoot, file)} references "${key}", which is ` +
          `${value === undefined ? "not in" : "not a string in"} lang/en.json. ` +
          `game.i18n.localize would render the raw key on screen rather than failing.`
      );
      checked += 1;
    }
  }

  assert.ok(checked > 0, "expected at least one localisation key reference across scripts/ and templates/");
});

test("every bi- class a template uses actually exists in the stylesheet", () => {
  // Found the hard way, 2026-09-07: zone-checks.hbs asked for
  // `.bi-keygrid--6`, which was never defined -- only --4, --5 and --7 are.
  // So the grid got `display: grid` with no grid-template-columns and
  // rendered EIGHTEEN SKILLS IN ONE COLUMN. Nothing failed and nothing
  // logged; CSS simply ignores a class it has never heard of, which makes
  // this a class of bug that only ever surfaces as "the UI looks wrong".
  const stylesRoot = path.join(moduleRoot, "styles");
  const css = readdirSync(stylesRoot)
    .filter((name) => name.endsWith(".css"))
    .map((name) => readFileSync(path.join(stylesRoot, name), "utf8"))
    .join("\n");

  const defined = new Set();
  for (const match of css.matchAll(/\.(bi-[A-Za-z0-9_-]+)/g)) defined.add(match[1]);

  const templatesRoot = path.join(moduleRoot, "templates");
  const templates = [];
  const collect = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) collect(full);
      else if (entry.endsWith(".hbs")) templates.push(full);
    }
  };
  collect(templatesRoot);

  let checked = 0;
  for (const file of templates) {
    // Strip Handlebars first: a class list can legitimately contain an {{if}}
    // and we only lint the literal parts.
    const text = readFileSync(file, "utf8")
      .replace(/\{\{!--[\s\S]*?--\}\}/g, "")
      .replace(/\{\{[\s\S]*?\}\}/g, " ");

    for (const attr of text.matchAll(/class="([^"]*)"/g)) {
      for (const cls of attr[1].split(/\s+/).filter((c) => c.startsWith("bi-"))) {
        assert.ok(
          defined.has(cls),
          `${path.relative(repoRoot, file)} uses class "${cls}", which no stylesheet defines. ` +
            `CSS silently ignores an unknown class, so this renders as an unstyled element rather ` +
            `than failing — exactly how eighteen skills ended up in a single column.`
        );
        checked += 1;
      }
    }
  }

  assert.ok(checked > 0, "expected at least one bi- class across module/blank-inheritance/templates/");
});

test("the checks pod cannot grow taller than an ordinary pod, and still scrolls if its content needs more", () => {
  // The direct replacement for two earlier, disproven fixes (a taller
  // absolute ceiling, then a viewport-relative one) that both assumed a
  // pod could safely rise above the bar. It cannot — see the hotbar-
  // reservation test above for the live measurement that disproved it.
  //
  // This asserts the actual, verified-correct invariant instead: the
  // checks pod's height comes from the SAME base rule every other pod
  // uses (no override, no separate token), and its own overflow-y:auto
  // is still there to catch a character with an unusual number of Lores
  // WITHOUT pushing anything off the visible window to do it.
  const tokens = readFileSync(path.join(moduleRoot, "styles", "bi-tokens.css"), "utf8");
  const components = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");

  assert.equal(
    /--bi-checks-max-height/.test(tokens),
    false,
    "--bi-checks-max-height is back — this pod must share the base pod height ceiling, not get its own"
  );
  assert.match(
    components,
    /\.bi-checks\s*\{[^}]*overflow-y:\s*auto/s,
    "the checks pod lost its internal scroll fallback — this is now the ONLY thing standing between a " +
      "Lore-heavy character and clipped content, not a rare last resort"
  );
});

test("the centre track is sized by its content, and the day ring declares its own width", () => {
  // The hard-won result of 2026-09-07's width work: the checks pod went from
  // four columns to ten purely by stopping the instrument berth reserving
  // 252px for a legend nobody had built yet. Both side tracks are
  // minmax(0,1fr) and split whatever the centre does not take, so ANY fixed
  // width on .bi-bar__instrument is a direct tax on the number of skills a
  // player can see at once.
  //
  // The discipline that keeps that true as zones land: the berth hugs its
  // content, and each zone states how wide IT is. This asserts both halves.
  const components = readFileSync(path.join(moduleRoot, "styles", "bi-components.css"), "utf8");

  const berth = components.match(/\.bi-bar__instrument \{([\s\S]*?)\n\}/);
  assert.ok(berth, "could not find .bi-bar__instrument in bi-components.css");
  assert.match(
    berth[1],
    /width:\s*auto/,
    "the instrument berth has a fixed width again — that comes straight out of the side tracks, and the " +
      "checks pod loses columns for it (measured live: four columns instead of ten)"
  );

  const domePod = components.match(/\.bi-bar \.bi-pod\[data-zone="dome"\]\s*\{([\s\S]*?)\}/);
  assert.ok(
    domePod,
    "the dome pod no longer declares its own width — with a content-sized berth, a zone that does not " +
      "state its width has none, and the day ring collapses"
  );
  assert.match(domePod[1], /width:\s*var\(--bi-ring-size\)/, "the dome pod's width is no longer the ring token");
});
