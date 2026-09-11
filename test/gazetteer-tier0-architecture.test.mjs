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

test("a real-building click's tolerance scales with zoom, not a fixed image-pixel constant", () => {
  // Regression guard for a real, live bug: single-click Adopt/Remove sent a
  // hard-coded tolerancePx of 2 (image pixels) no matter the zoom. At zoom
  // 4 in this tool's own CRS.Simple setup, one screen pixel already spans
  // two image pixels, so that constant was under a single real screen
  // pixel of forgiveness -- clicking a building rendered at 8% fill
  // opacity was close to unclickable at any zoom wide enough to survey a
  // scattered mess of them, which is the situation the Remove tool exists
  // for. onPick now measures the current image-px-per-screen-px ratio via
  // containerPointToLatLng and scales a fixed SCREEN-pixel radius by it,
  // the same principle draw.js's own PIN_HIT_RADIUS_PX already uses.
  const src = readFileSync(join(STATIC, "app.js"), "utf8");
  assert.ok(!/tolerancePx:\s*2\b/.test(src),
    "app.js sends a hard-coded tolerancePx: 2 again -- this is under one " +
    "screen pixel of real forgiveness at any zoom below native");
  assert.ok(/PICK_RADIUS_SCREEN_PX/.test(src) && /imgPxPerScreenPx/.test(src),
    "app.js's real-building click tolerance no longer scales with the " +
    "current zoom -- a fixed image-pixel radius is not the same click " +
    "target at every zoom level");
});

test("a drag-box Remove cannot also fire a spurious single-building removal", () => {
  // Regression guard for a real, live bug: a native "click" DOM event fires
  // after ANY mousedown+mouseup pair on the same element, regardless of how
  // far the mouse moved in between -- a genuine drag is not exempt on its
  // own. The Select tool's click handler was already a permanent no-op for
  // exactly this reason (see its own comment in draw.js), but Adopt/Remove's
  // was not, since a genuine standalone click is its whole point there.
  // Confirmed live: a drag-box Remove correctly suppressed every building
  // inside the box, then the trailing click ALSO ran onPick at the release
  // point -- silently removing one more building the box may never have
  // covered, and overwriting the correct "removed N buildings" status with
  // a single-building message that hid the real result.
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/suppressNextClick/.test(src),
    "draw.js no longer has a suppressNextClick guard -- a drag-box Remove " +
    "(or a drag-box Select, which happens to be immune a different way) " +
    "can fire the browser's own trailing click on release, and letting " +
    "that reach onPick again silently removes one extra building at " +
    "whatever the release point happened to be");
});

test("a locked item is protected everywhere it could be deleted or overwritten", () => {
  // Feature test, not a regression guard: `locked` exists so a building with
  // a real lore entry can be selected, viewed and zoomed to like any other
  // item, but never mutated or destroyed by accident just because it was
  // swept up in a later marquee/lasso/batch action alongside things that
  // still are drafts. Checked at every real destructive/overwriting entry
  // point rather than just one, since a lock that only holds at the single-
  // item Delete button is not actually a lock.
  const app = readFileSync(join(STATIC, "app.js"), "utf8");
  const draw = readFileSync(join(STATIC, "draw.js"), "utf8");

  assert.ok(/function deleteItems\([^)]*\)\s*\{[\s\S]{0,400}\.locked/.test(app),
    "deleteItems() no longer checks .locked -- the single-item Delete " +
    "button, the batch panel's Delete, and the Delete key all funnel " +
    "through this one function, so a check missing here unprotects all three");
  assert.ok(/btn-batch-apply[\s\S]{0,400}\.locked/.test(app),
    "the batch panel's Apply no longer checks .locked -- a shared theme " +
    "note applied to a selection would overwrite a locked item's real lore " +
    "with the theme text, exactly the accidental edit locking exists to stop");
  assert.ok(/"btn-lock"/.test(app), "app.js no longer wires up a #btn-lock control");
  assert.ok(/"btn-batch-lock"/.test(app), "app.js no longer wires up a #btn-batch-lock control");

  assert.ok(/function drawHandles\(\)\s*\{[\s\S]{0,700}\.locked/.test(draw),
    "drawHandles() no longer checks .locked -- a locked shape would still " +
    "grow vertex/midpoint handles and be freely reshaped by dragging them");
  assert.ok(/function nudge\([^)]*\)\s*\{[\s\S]{0,200}\.locked/.test(draw),
    "nudge() no longer checks .locked -- a locked shape could still be " +
    "moved wholesale with the arrow keys");
});

test("the session list keeps a usable height whatever the inspector is doing", () => {
  // The session list is the surface this tool is for -- working through a
  // session's worth of locations one at a time -- and it was getting
  // whatever height the panels above happened to leave over: three visible
  // rows out of thirty-six, because a batch form is ~496px tall.
  //
  // The floor has to sit on the LIST, not the panel: measured live, the
  // panel's own chrome (search, status chips, select-all, sort, hint) takes
  // ~157px before a single row is drawn, so a 260px floor on the panel left
  // a 103px list -- two rows. Worth pinning, since the obvious place to put
  // a min-height is the panel and it silently under-delivers.
  const css = readFileSync(join(STATIC, "gazetteer.css"), "utf8");
  assert.ok(/\.gz-list\s*\{[^}]*min-height:\s*\d+px/.test(css),
    "gazetteer.css no longer gives .gz-list its own min-height -- a floor on " +
    "the panel instead is eaten by the panel's own chrome, which is how the " +
    "list ended up two rows tall with a batch form open");
  assert.ok(/\.gz-panel--capped[^{]*\{[^}]*max-height/.test(css),
    "the inspector is no longer height-capped -- uncapped, a tall batch form " +
    "pushes the session list off the bottom of the sidebar");

  // The map is the other half of the tool: a sidebar width saved on a wide
  // window must not squeeze it to a letterbox on a narrow one (seen live:
  // a 701px sidebar left a 278px map and overflowed the page sideways).
  const app = readFileSync(join(STATIC, "app.js"), "utf8");
  assert.ok(/MAP_MIN/.test(app) && /window\.innerWidth\s*-\s*MAP_MIN/.test(app),
    "app.js no longer clamps the sidebar against the viewport -- a stored " +
    "width from a bigger window will squeeze the map and overflow the page");
});

test("the session panel itself cannot be collapsed away", () => {
  // Collapsing is keyed off a .gz-panel__body wrapper. The inspector and
  // layers panels have one; the session panel deliberately does not,
  // because collapsing the list this tool exists to work through is not a
  // feature, it is a way to lose the list.
  const html = readFileSync(join(STATIC, "index.html"), "utf8");
  const section = (id) => {
    const start = html.indexOf(`id="${id}"`);
    assert.ok(start > -1, `index.html no longer has #${id}`);
    return html.slice(start, html.indexOf("</section>", start));
  };
  assert.ok(section("inspector").includes("gz-panel__body"),
    "#inspector lost its .gz-panel__body wrapper and can no longer be collapsed");
  assert.ok(section("layers-panel").includes("gz-panel__body"),
    "#layers-panel lost its .gz-panel__body wrapper and can no longer be collapsed");
  assert.ok(!section("session-panel").includes("gz-panel__body"),
    "#session-panel gained a .gz-panel__body wrapper, which makes the session " +
    "list collapsible -- the one panel that must always be visible");
});

test("region drawing snaps to existing region borders, and only region borders", () => {
  // Regions carry a global invariant no other tier does: cover the sheet
  // once each. Freehand drawing cannot meet it -- two districts meant to
  // share a border miss each other by a few pixels every time, and the
  // result is a hairline sliver the coverage check then reports forever.
  // Snapping is what makes a shared border genuinely shared (identical
  // coordinates, not merely close ones) rather than something to be
  // repaired afterwards.
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/function snapRegionPoint/.test(src),
    "draw.js no longer snaps new region vertices to existing borders -- a " +
    "hand-drawn tessellation will grow a sliver on every shared edge");
  assert.ok(/tier !== "region"/.test(src),
    "the snap no longer restricts itself to region targets -- a site traced " +
    "inside a district has no business welding itself to the district outline");
  assert.ok(/SNAP_RADIUS_SCREEN_PX/.test(src) && /imgPxPerScreenPx/.test(src),
    "the snap radius no longer scales with zoom -- a fixed image-pixel " +
    "radius is a different-sized target at every zoom level");
});

test("the shared fixture is reachable from both suites' expected paths", () => {
  const fixture = JSON.parse(
    readFileSync(join(here, "fixtures", "gazetteer-grid-cases.json"), "utf8"));
  assert.ok(Array.isArray(fixture.pointCases) && fixture.pointCases.length > 0);
  assert.ok(Array.isArray(fixture.polygonCases) && fixture.polygonCases.length > 0);
});
