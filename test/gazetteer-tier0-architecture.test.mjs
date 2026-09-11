// Tier 0 — the gazetteer's architecture rules.
//
// Same split design/testing-strategy.md §1 already enforces for the Foundry
// module's core/ and the city-map editor's src/lib/core/: pure logic must run
// identically in plain Node, with no browser globals and no map library.
//
// Why it matters here specifically. tools/gazetteer/core/grid.mjs is one half
// of a pair — the other half is grid.py on the server — and the two are held
// to each other by a shared fixture. That only works while both are pure
// arithmetic. The moment grid.mjs reaches for `document` or a Leaflet helper,
// it can no longer be run by this suite, the fixture stops covering it, and
// the browser and the server are free to drift apart about which cell a
// building is in.
//
// The rule is therefore not tidiness. It is what keeps the parity test honest.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const CORE = join(here, "..", "tools", "gazetteer", "core");
const STATIC = join(here, "..", "tools", "gazetteer", "static");

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

test("the browser layer is where Leaflet is allowed to live", () => {
  // The mirror of the rule above: static/ SHOULD use Leaflet. If it stopped,
  // it would mean the map code had drifted into core/ instead.
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(src.includes("L."), "draw.js is the Leaflet layer and should use it");
});

test("the browser layer gets its grid arithmetic from core, not its own copy", () => {
  // The failure this prevents is specific and silent: a second implementation
  // of cell arithmetic in the page would not be covered by the shared fixture,
  // so the readout under the cursor could disagree with what gets saved.
  for (const file of ["app.js", "draw.js"]) {
    const src = readFileSync(join(STATIC, file), "utf8");
    if (!/imagePxToRef|refsTouched|cellsTouched/.test(src)) continue;
    assert.ok(/from\s+["']\/core\/grid\.mjs["']/.test(src),
      `${file} uses grid arithmetic but does not import it from /core/grid.mjs`);
  }
});

test("batch delete never again depends on window.confirm", () => {
  // Regression guard for a real, live bug: window.confirm() turned out to be
  // silently unanswerable in this app's own preview environment -- it never
  // threw and never blocked, it just always resolved as Cancel, so the
  // button looked like it did nothing at all. The fix was a same-surface
  // arm/confirm click, which needs no dialog API and so cannot be swallowed
  // the same way -- this only guards against the dialog quietly creeping
  // back in, not against every possible future regression in that flow.
  const src = readFileSync(join(STATIC, "app.js"), "utf8");
  assert.ok(!/window\.confirm\(/.test(src),
    "app.js calls window.confirm() again -- this was found to be silently " +
    "unanswerable in this app's preview environment, which made batch " +
    "delete look broken; use the arm/confirm button pattern instead");
});

test("a drag gesture cannot leak a document-level listener forever", () => {
  // Regression guard for a real, live bug: the marquee and the right-click
  // pan each tracked their own drag via a plain document mousemove/mouseup
  // pair, which leaks forever the moment a single mouseup is ever lost (seen
  // live, more than once, in this exact tool) -- a stale `move` handler then
  // keeps firing on every future mousemove anywhere on the page, which is
  // the "slides like ice, ends up on the other side of the map" bug. The fix
  // moved both gestures onto Pointer Capture (plus a document-level
  // pointerup/pointercancel backstop and defensive cleanup-on-next-drag) --
  // this only checks the leaky pattern is gone and the capture-based one is
  // present, not the full behaviour, which is verified live instead (see
  // this tool's own plan doc's Verification section).
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(!/document\.addEventListener\(\s*["']mouse(move|up)["']/.test(src),
    "draw.js tracks a drag via a plain document mousemove/mouseup pair again -- " +
    "this leaks forever the moment one mouseup is lost; use trackDrag() instead");
  assert.ok(/setPointerCapture/.test(src) && /pointercancel/.test(src),
    "draw.js's drag tracking no longer uses Pointer Capture -- a plain " +
    "mousemove/mouseup pair cannot guarantee delivery if the button is " +
    "released outside the map");
});

test("right-click pan moves the view by pixels moved, not by a re-derived absolute target", () => {
  // Regression guard for a real, live bug, and a more serious one than the
  // leak above: computing a target container point from the ORIGINAL
  // mousedown position and converting it with containerPointToLatLng reads
  // the map's CURRENT view -- which this same gesture has already changed
  // by the time the next mousemove arrives. Re-applying the FULL cumulative
  // delta against an already-shifted view compounds every single move
  // event: two events overshoot by 1.5x, three by 2x, and a real mouse
  // firing dozens of move events across one smooth drag compounds into
  // "slides like ice, ends up on the other side of the map" -- confirmed
  // live: 40 synthetic move events across one drag produced roughly 10x the
  // correct pan. map.panBy has no such trap, since each call only shifts
  // the view by the pixels moved since the LAST call, not since mousedown.
  // containerPointToLatLng itself is not forbidden file-wide -- the marquee
  // legitimately uses it once, at gesture END, to convert the final
  // rectangle's corners. The bug was calling it on every move EVENT against
  // an already-shifted view; panBy's presence is the positive signal that
  // the pan handler isn't doing that anymore.
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/map\.panBy\(/.test(src),
    "draw.js's right-click pan no longer calls map.panBy() -- if it went " +
    "back to computing an absolute target via containerPointToLatLng on " +
    "every move event, the pan would compound within a single drag again");
});

test("the shared fixture is reachable from both suites' expected paths", () => {
  const fixture = JSON.parse(
    readFileSync(join(here, "fixtures", "gazetteer-grid-cases.json"), "utf8"));
  assert.ok(Array.isArray(fixture.pointCases) && fixture.pointCases.length > 0);
  assert.ok(Array.isArray(fixture.polygonCases) && fixture.polygonCases.length > 0);
});
