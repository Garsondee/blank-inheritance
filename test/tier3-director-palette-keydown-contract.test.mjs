// Tier 3 -- the Director's Palette's own keydown wiring (scripts/foundry/
// director-palette.mjs). Found live while fixing the identical shape of bug
// in approvals-desk.mjs: ApplicationV2's _onRender fires on EVERY render, not
// just the first, and DirectorPalette re-renders on every keystroke in its
// search box AND on every ArrowUp/ArrowDown (see #onKey). this.element is the
// SAME DOM node across those renders -- only the Handlebars "palette" part
// inside it (the input, the backdrop) is torn down and rebuilt each time
// (confirmed against the real HandlebarsApplicationMixin#_replaceHTML in
// foundryvtt/.../client/applications/api/handlebars-application.mjs: a
// non-root part is replaced wholesale via replaceWith(), so listeners on the
// input/backdrop can't accumulate -- only listeners on this.element itself
// can). An unconditional addEventListener("keydown", ...) in _onRender was
// stacking one more listener per render, so #onKey fired once per
// accumulated listener for a single physical keypress: ArrowDown/ArrowUp
// moved the selection several rows per tap instead of one (a compounding
// bug, since #onKey's own ArrowUp/ArrowDown branch re-renders too, so each
// duplicate firing schedules yet another extra listener for next time), and
// Enter could run the selected command more than once per press.
//
// Read as source rather than mounted, matching every other
// tier3-*-contract.test.mjs in this project (ApplicationV2 destructures
// foundry.applications.api at module scope, and game.settings/canvas aren't
// modelled deeply enough by test/support/mock-foundry.mjs to execute a real
// render either way).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");
const moduleRoot = path.join(repoRoot, "module", "blank-inheritance");
const src = readFileSync(path.join(moduleRoot, "scripts", "foundry", "director-palette.mjs"), "utf8");

function extractMethod(source, signaturePattern) {
  const match = source.match(signaturePattern);
  assert.ok(match, `could not find a method matching ${signaturePattern}`);
  return match[0];
}

test("DirectorPalette carries a #keydownBound guard field, same shape as approvals-desk.mjs", () => {
  assert.match(src, /#keydownBound = false;/, "the #keydownBound instance field is missing");
});

test("_onRender attaches the keydown listener only once per instance, guarded by #keydownBound", () => {
  const onRender = extractMethod(src, /_onRender\(context, options\) \{[\s\S]*?\n {2}\}/);
  assert.match(
    onRender,
    /if \(!this\.#keydownBound\) \{\s*\n\s*this\.element\.addEventListener\("keydown", this\.#onKey\.bind\(this\)\);\s*\n\s*this\.#keydownBound = true;\s*\n\s*\}/,
    "the keydown listener is no longer added inside a guarded if(!this.#keydownBound) block -- " +
    "an unconditional addEventListener here re-accumulates one listener per render"
  );
});

test("the keydown listener is bound exactly once in the source, not once per some other unguarded call site", () => {
  const matches = src.match(/\.addEventListener\("keydown"/g) ?? [];
  assert.equal(matches.length, 1, "expected exactly one keydown addEventListener call site in director-palette.mjs");
});

test("the backdrop pointerdown listener stays unguarded -- it lives on a node the Handlebars part replaces wholesale every render, not on the persistent this.element", () => {
  // Not a duplicate-listener risk the way the outer element's keydown listener
  // was: HandlebarsApplicationMixin#_replaceHTML calls replaceWith() for a
  // non-root part, discarding the whole previous subtree (input, backdrop,
  // everything the "palette" part rendered) each render. A guard here would
  // be redundant, not merely harmless -- this test pins that we haven't
  // "fixed" something that was never broken.
  assert.match(
    src,
    /this\.element\.querySelector\("\.bi-palette__backdrop"\)\?\.addEventListener\("pointerdown", \(\) => this\.close\(\)\);/
  );
});
