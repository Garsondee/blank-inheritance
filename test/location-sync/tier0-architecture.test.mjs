// Tier 0 — the location-sync core's architecture rules.
//
// Same split design/testing-strategy.md §1 already enforces for the Foundry
// module's core/ and the city-map editor's src/lib/core/: pure logic must run
// identically in plain Node, with no browser globals and no map library.
//
// Why it matters here specifically. tools/location-sync/core/grid.mjs is one
// half of a pair — the other half is grid.py, run server-side by
// tools/location-sync/apply_geometry.py — and the two are held to each other
// by a shared fixture (test/fixtures/gazetteer-*-cases.json). That only works
// while both are pure arithmetic. The moment grid.mjs reaches for `document`
// or a browser/map-library helper, it can no longer be run by this suite, the
// fixture stops covering it, and the two sides are free to drift apart about
// which cell a building is in.
//
// Retired 2026-09-29 alongside tools/gazetteer/ itself (design doc §10 phase
// 6): the ~35 regression tests this file used to also carry, checking
// specific source text in tools/gazetteer/static/app.js and draw.js. Those
// files no longer exist — draw.js's actual interaction logic (angle-snap,
// neighbour-vertex-snap-and-weld, drag handles) is ported into
// module/blank-inheritance/scripts/foundry/location-draw-layer.mjs instead,
// verified live against the real local Foundry copy rather than by these
// now-inapplicable source-text checks. Extracting that logic's genuinely pure
// pieces (the snap/weld math) into core/location-editor.mjs so they can be
// unit-tested the same way this core is a good near-term follow-up, not yet
// done — flagged here rather than left silently uncovered.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const CORE = join(here, "..", "..", "tools", "location-sync", "core");

const FORBIDDEN_GLOBALS = ["window", "document", "navigator", "localStorage", "fetch", "L."];

function coreModules() {
  return readdirSync(CORE).filter((f) => f.endsWith(".mjs"));
}

test("there is a pure JS core to protect", () => {
  assert.ok(coreModules().length > 0, "expected at least grid.mjs in core/");
});

test("core modules touch no browser global and no map library", () => {
  for (const file of coreModules()) {
    const src = readFileSync(join(CORE, file), "utf8");
    // Strip comments first: the docstrings here legitimately discuss the
    // browser, and a naive scan would flag the very explanation of the rule.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    for (const bad of FORBIDDEN_GLOBALS) {
      assert.ok(!code.includes(bad),
        `${file} references ${bad} — core must run in plain Node, ` +
        `or the Python/JS parity fixture stops covering it`);
    }
  }
});

test("core modules import nothing at all", () => {
  // Stronger than "no forbidden imports". grid.mjs is arithmetic; a dependency
  // of any kind is a signal it has started doing something else.
  for (const file of coreModules()) {
    const src = readFileSync(join(CORE, file), "utf8");
    assert.ok(!/^\s*import\s/m.test(src),
      `${file} has an import — the core is meant to be self-contained`);
  }
});

test("core modules are importable in plain Node and actually work", () => {
  // The claim the whole split exists to guarantee, exercised rather than
  // asserted: if this import ever needs a DOM, the suite fails here.
  // pathToFileURL, not a bare path: on Windows an absolute path is not a
  // valid ESM specifier ("protocol 'e:'"), and the failure looks like a
  // broken module rather than a broken test.
  return import(pathToFileURL(join(CORE, "grid.mjs")).href).then((m) => {
    assert.equal(typeof m.imagePxToRef, "function");
    assert.equal(m.imagePxToRef(4573, 6580), "C4·11");
  });
});
