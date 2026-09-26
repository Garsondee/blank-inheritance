// Tier 3 — the tile self-heal hook's wiring into blank-inheritance.mjs.
//
// Same reason as tier3-scene-build-contract.test.mjs for reading source text
// rather than mounting a mock: Hooks.on/canvasReady and the module's own
// top-level hook wiring aren't something test/support/mock-foundry.mjs models.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const moduleRoot = path.resolve(here, "..", "module", "blank-inheritance", "scripts");
const entry = readFileSync(path.join(moduleRoot, "blank-inheritance.mjs"), "utf8");

test("healStuckTiles is imported from the foundry adapter, not the pure core module", () => {
  assert.match(
    entry,
    /import\s*\{\s*healStuckTiles\s*\}\s*from\s*"\.\/foundry\/tile-resilience\.mjs"/,
    "blank-inheritance.mjs must import the Foundry-touching healStuckTiles, not core/tile-resilience.mjs directly"
  );
});

test("the self-heal hook runs on every canvasReady (Hooks.on, not once) and is NOT GM-gated", () => {
  const hookMatch = entry.match(/Hooks\.on\("canvasReady",\s*\(\)\s*=>\s*\{\s*\n\s*healStuckTiles\(\)[\s\S]*?\n\}\);/);
  assert.ok(hookMatch, "the healStuckTiles canvasReady hook is missing or no longer matches this shape");
  const body = hookMatch[0];
  assert.equal(
    /game\.user\.isGM/.test(body),
    false,
    "this hook must NOT be GM-gated -- the race it fixes happens independently in every client's own PIXI state, " +
    "and the repair only touches local render state (see tile-resilience.mjs's own header)"
  );
});

test("the hook calls .catch(), same discipline as every other top-level hook in this file", () => {
  assert.match(entry, /healStuckTiles\(\)\.catch\(\(err\)\s*=>\s*console\.error\(/);
});

test("core/tile-resilience.mjs stays pure -- no Foundry or PIXI globals referenced in actual code", () => {
  const core = readFileSync(path.join(moduleRoot, "core", "tile-resilience.mjs"), "utf8");
  // The header comment legitimately cites real Foundry/PIXI source (canvas/
  // loader.mjs, PIXI.Assets.load, canvasReady) as grounding for the bug this
  // file exists to work around -- that is a citation, not a dependency, so
  // comments are stripped before checking for an actual reference in code.
  const code = core
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  for (const forbidden of ["canvas.", "PIXI.", "game.", "Hooks.", "foundry."]) {
    assert.equal(code.includes(forbidden), false, `core/tile-resilience.mjs's CODE (not comments) references "${forbidden}" -- that belongs in the foundry/ adapter`);
  }
});

test("foundry/tile-resilience.mjs's repair waits for the real 'loaded' event -- the exact wait Foundry's own loader skips", () => {
  const adapter = readFileSync(path.join(moduleRoot, "foundry", "tile-resilience.mjs"), "utf8");
  assert.match(adapter, /baseTexture\.once\(\s*["']loaded["']/, "must wait for baseTexture's own 'loaded' event, not trust a promise's resolution timing");
  assert.match(adapter, /baseTexture\.once\(\s*["']error["']/, "must also handle a genuine decode error, not only the happy path");
});

test("foundry/tile-resilience.mjs skips video tiles -- this bug is about static-image BaseTexture#valid, not <video> readiness", () => {
  const adapter = readFileSync(path.join(moduleRoot, "foundry", "tile-resilience.mjs"), "utf8");
  assert.match(adapter, /\.filter\(\(p\)\s*=>\s*!p\.isVideo\)/);
});
