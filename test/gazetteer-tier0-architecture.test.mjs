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

  assert.ok(/function drawHandles\(\)\s*\{[\s\S]{0,1200}entry\.item\.locked[\s\S]{0,60}entry\.item\.tier/.test(draw),
    "drawHandles() no longer checks .locked at all, or no longer checks it " +
    "tier-aware -- a locked SITE or POINT must still grow no handles (a " +
    "real lore entry, protected from accidental reshaping); a locked " +
    "REGION must grow them anyway, deliberately, since its border keeps " +
    "needing to be tidied against its neighbours for as long as Ingram " +
    "keeps drawing more of them (see server.py's own resync-on-save, " +
    "which is what keeps a hand-edited promoted region's file in sync)");
  assert.ok(/function nudge\([^)]*\)\s*\{[\s\S]{0,200}\.locked/.test(draw),
    "nudge() no longer checks .locked -- a locked shape could still be " +
    "moved wholesale with the arrow keys");
});

test("a click on an existing vertex handle never starts a new draft, in any drafting tool", () => {
  // Ingram, driving this live: "I enable 'region' mode, I click on the
  // vertex of a region to move it... it fucking pans." Root cause -- the
  // map's own "click" handler treats every click as "place a new draft
  // point" whenever Region/Site/Lasso/Bisect is armed, with no exception
  // for a click that actually landed on the SELECTED shape's own vertex
  // handle. That single mis-routed click set `drafting`, and `drafting`
  // is the very first thing the "mousedown" handler refuses to act on --
  // so the NEXT mousedown (the real attempt to drag that same handle) had
  // nothing left to intercept it, and Leaflet's own native map-drag
  // panned the view instead. The mousedown handler already had this
  // guard; the click handler did not, which is exactly how one working
  // check and one missing twin produced a bug that only shows up on the
  // SECOND gesture, not the one that actually went wrong.
  const draw = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(
    /map\.on\("click"[\s\S]{0,1500}closest\(["'`]\.gz-vertex, \.gz-vertex--mid["'`]\)[\s\S]{0,150}POLYGON_DRAFT_TOOLS\.has\(tool\)/
      .test(draw),
    "the map's click handler no longer checks .gz-vertex/.gz-vertex--mid " +
    "before POLYGON_DRAFT_TOOLS.has(tool) -- a click on an existing " +
    "handle would again be free to start a brand new draft on top of it");
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

test("inspector, layers, session and regions are all genuinely collapsible", () => {
  // Collapsing is keyed off a .gz-panel__body wrapper -- see
  // wireCollapsiblePanels in app.js. Session used to be deliberately exempt
  // ("collapsing the list this tool exists to work through is not a
  // feature, it is a way to lose the list"), until Ingram's own 2026-09-12
  // survey overturned that ("I don't actually use the 'Session' section
  // myself"). The new invariant is the opposite of the old one: every one
  // of these four must be collapsible, Session and the Regions quick-nav
  // panel included, so a future edit cannot silently pin one open or closed
  // again without the DEFAULT_COLLAPSED assertion below also catching it.
  const html = readFileSync(join(STATIC, "index.html"), "utf8");
  const section = (id) => {
    const start = html.indexOf(`id="${id}"`);
    assert.ok(start > -1, `index.html no longer has #${id}`);
    return html.slice(start, html.indexOf("</section>", start));
  };
  for (const id of ["inspector", "layers-panel", "session-panel", "regions-panel"]) {
    assert.ok(section(id).includes("gz-panel__body"),
      `#${id} has no .gz-panel__body wrapper and so cannot be collapsed`);
  }
});

test("session and regions default to collapsed, so inspector gets first look", () => {
  // The other half of the same survey note: collapsible alone is not
  // enough if the default state does not match what was actually asked
  // for. A static check on DEFAULT_COLLAPSED rather than a live toggle,
  // matching this file's own house style for behaviour that can be read
  // straight off the source.
  const js = readFileSync(join(STATIC, "app.js"), "utf8");
  const match = js.match(/DEFAULT_COLLAPSED\s*=\s*(\{[^}]*\});/);
  assert.ok(match, "could not find a DEFAULT_COLLAPSED object literal in app.js");
  const defaults = JSON.parse(match[1]);
  assert.equal(defaults["session-panel"], true,
    "Session no longer defaults to collapsed");
  assert.equal(defaults["regions-panel"], true,
    "the Regions quick-nav panel no longer defaults to collapsed");
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

test("dragging a region vertex also drags any other region's vertex welded to the same point", () => {
  // Snapping (above) only helps a vertex moving TOWARD a border it doesn't
  // yet touch. It does nothing for the opposite, far more common case while
  // tidying an already-mostly-tessellated map: dragging a vertex AWAY from a
  // point it currently shares with a neighbour. Left alone, that turns one
  // exactly-shared corner into two merely-close ones -- a sliver, created by
  // the very act of trying to fix one. Reported live once the map held 56
  // regions: "every single time I move a vertex we create a potential
  // sliver that needs to be addressed."
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/function findWeldedVertices\(entry, x, y\)/.test(src),
    "draw.js no longer finds a dragged vertex's coincident neighbours -- " +
    "editing a shared tessellation corner will silently strand the other " +
    "side of the border");
  assert.ok(/WELD_TOLERANCE_PX\s*=\s*\d(?:\.\d+)?;/.test(src),
    "the weld tolerance is no longer a small, single-digit-pixel epsilon " +
    "-- it must stay tight enough to never join two genuinely distinct, " +
    "merely nearby corners, informed by the real session's own pair-" +
    "distance distribution rather than a guess");
  // Found (and captured) at gesture START, on both handle kinds -- the
  // moment movement begins, the dragged point stops being coincident with
  // anything, so re-scanning mid-drag would always find nothing.
  assert.ok(/m\.on\("dragstart",\s*\(\)\s*=>\s*\{[\s\S]{0,200}findWeldedVertices\(/.test(src),
    "the main vertex handle no longer looks up welded neighbours when its " +
    "drag starts");
  assert.ok(/mid\.on\("dragstart",\s*\(\)\s*=>\s*\{[\s\S]{0,300}findWeldedVertices\(/.test(src),
    "the midpoint-insert handle no longer looks up welded neighbours when " +
    "its drag starts");
  // And actually moved, every tick, not just looked up once and forgotten.
  assert.ok(/for \(const w of welded\)\s*\{[\s\S]{0,150}ringPx\[w\.index\]\s*=[\s\S]{0,150}setLatLngs/.test(src),
    "a welded neighbour's ring is no longer updated during the drag -- its " +
    "polygon would visibly lag behind, or never move at all, while the " +
    "vertex it shares a corner with does");
});

test("the map-level snap hint stands down for the whole span of a vertex/midpoint drag", () => {
  // showSnapHint runs its own full-region scan from the MAP's own
  // "mousemove" -- which keeps firing for the entire drag regardless of
  // tool, since Leaflet's marker dragging doesn't suppress it. Before this,
  // that was a SECOND, entirely unthrottled copy of the exact per-mousemove
  // cost the drag handler's own rafThrottle exists to bound, running in
  // parallel with it. Reported live as still "extremely laggy... unusable"
  // even after the drag handler alone was throttled.
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/let editingVertex = false/.test(src),
    "draw.js no longer tracks whether a vertex/midpoint drag is in " +
    "progress -- showSnapHint has no way to stand down for it");
  assert.ok(/function showSnapHint\(p\)\s*\{\s*(?:\/\/[^\n]*\n\s*)*if \(editingVertex\) return;/.test(src),
    "showSnapHint no longer checks editingVertex first -- it will run its " +
    "full-region scan on every native mousemove even while a vertex's own " +
    "drag handler already owns the snap hint");
  assert.ok(/m\.on\("dragstart",\s*\(\)\s*=>\s*\{\s*editingVertex = true/.test(src),
    "the main vertex handle no longer sets editingVertex when its drag " +
    "starts");
  assert.ok(/editingVertex = false[\s\S]{0,150}snapLayer\.clearLayers\(\)/.test(src),
    "a drag's end no longer clears editingVertex -- the map-level snap " +
    "hint would stay suppressed for the rest of the session");
  // The remaining legitimate case -- hovering while about to place a fresh
  // region/bisect draft point -- still runs the same expensive scan on
  // every mousemove, so it needs the same once-per-frame throttle the drag
  // handler already gets.
  assert.ok(/showSnapHint:\s*rafThrottle\(showSnapHint\)/.test(src),
    "the exported showSnapHint is no longer throttled -- hovering with " +
    "Region/Bisect armed will run a full-region scan on every native " +
    "mousemove again");
});

test("deleting a shared vertex removes it from every welded region, not just one", () => {
  // The same sliver dragging a shared corner away creates, made a different
  // way: deleting it from only one side of a border leaves the other side
  // still carrying a point that no longer exists on this one. Ingram asked
  // for this explicitly once told drag-welding alone doesn't cover delete.
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/const welded = findWeldedVertices\(entry, ring\[i\]\[0\], ring\[i\]\[1\]\)/.test(src),
    "right-click delete no longer looks up welded neighbours before " +
    "removing a vertex");
  assert.ok(/welded\.some\(\(w\) => w\.entry\.item\.geometry\.ringPx\.length <= 3\)/.test(src),
    "delete no longer refuses when removing a shared corner would take a " +
    "WELDED ring below a legal polygon -- it will happily leave that " +
    "neighbour region degenerate while refusing to touch this one");
  assert.ok(/for \(const w of welded\)\s*\{[\s\S]{0,150}ringPx\.splice\(w\.index, 1\)/.test(src),
    "delete no longer removes the point from welded neighbours' rings -- " +
    "only this region's copy of a shared corner would be deleted, leaving " +
    "the other side of the border still carrying a point that no longer " +
    "exists on this one");
});

test("a finished edit forces its layers to redraw rather than waiting on the next animation frame", () => {
  // This map prefers Canvas rendering, which batches every layer's redraw
  // into one requestAnimationFrame call rather than repainting per layer.
  // That batching depends on the browser actually delivering an animation
  // frame promptly -- not guaranteed the instant a drag/delete/nudge
  // finishes (an occluded or backgrounded window, rAF throttled under
  // load) -- and reproduced live: the renderer's own _redrawRequest stayed
  // pending well after a completed drag, with the canvas never
  // repainting the welded neighbour's new shape until something else
  // (a full page reload) forced one. Reported as "regions don't update
  // their appearance when I change them... I need to refresh to get the
  // current shapes."
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/function forceRedraw\(layers\)/.test(src),
    "draw.js no longer forces a synchronous redraw after an edit -- a " +
    "finished drag, delete or nudge is back to depending on Leaflet's " +
    "Canvas renderer's own rAF-batched redraw arriving promptly, which it " +
    "is not guaranteed to do");
  assert.ok(/renderer\._redrawRequest[\s\S]{0,400}renderer\._redraw\(\)/.test(src),
    "forceRedraw no longer bypasses the pending requestAnimationFrame and " +
    "calls the renderer's own _redraw synchronously -- the whole point of " +
    "forcing it");
  assert.ok(!/canvas\.width = canvas\.width/.test(src),
    "forceRedraw hard-resets canvas.width again -- tried and reverted " +
    "live: that throws away the whole 2D context state, including the " +
    "devicePixelRatio scale transform Leaflet applies once and only " +
    "reapplies on a real resize/zoom, so every layer renders at half " +
    "size in the top-left quarter of the canvas until the next zoom");
  // Every settle point that changes a polygon's shape: vertex dragend,
  // vertex delete, midpoint dragend, point dragend, and nudge.
  for (const [label, pattern] of [
    ["vertex dragend", /applyDrag\(\);[\s\S]{0,40}editingVertex = false;[\s\S]{0,60}forceRedraw\(/],
    ["vertex delete", /ringPx\.splice\(w\.index, 1\);[\s\S]{0,150}forceRedraw\(/],
    ["midpoint dragend", /applyMidDrag\(\);[\s\S]{0,40}editingVertex = false;[\s\S]{0,60}forceRedraw\(/],
    ["point dragend", /m\.on\("dragend", \(\) => \{ forceRedraw\(/],
    ["nudge", /function nudge\([^)]*\)\s*\{[\s\S]{0,700}forceRedraw\(\[entry\.layer\]\)[\s\S]{0,150}onGeometryChange\(entry\.item\)/],
  ]) {
    assert.ok(pattern.test(src), `${label} no longer forces a redraw once its edit settles`);
  }
});

test("the published-locations reference overlay never shares a live tier's colour", () => {
  // The actual root cause of a whole investigation: "the original shape
  // remains behind... the tan coloured lines don't update" turned out not
  // to be a rendering bug at all. state.publishedLayer draws whatever was
  // last written to data/locations/*.json -- frozen until refreshPublished()
  // runs again (page load, promote, a few specific actions), by design NOT
  // tracking a vertex drag on the live draft underneath it. It used to
  // share region's own unselected colour (#ac8a4d), so that frozen
  // reference and the shape actually being edited read as the same
  // outline failing to move, when they were never the same layer. Verified
  // live: dragging a vertex for real, watching the live shape move while
  // this ghost sat still the whole time.
  const app = readFileSync(join(STATIC, "app.js"), "utf8");
  const draw = readFileSync(join(STATIC, "draw.js"), "utf8");
  const fnMatch = app.match(/function renderPublishedLayer\(\)\s*\{[\s\S]{0,2600}?state\.publishedLayer\.addLayer\(layer\);/);
  assert.ok(fnMatch, "renderPublishedLayer() is no longer where this reference overlay is drawn");
  const fn = fnMatch[0];
  assert.ok(!/color:\s*"#ac8a4d"/.test(fn),
    "the published overlay draws region's own unselected colour again -- " +
    "an edited region and its frozen last-saved reference will look like " +
    "the same outline that failed to update");
  assert.ok(/dashArray/.test(fn),
    "the published overlay no longer marks itself as a reference/ghost " +
    "with a dashed outline -- nothing distinguishes it from a live shape " +
    "at a glance while editing");
  // And the colour it does use must not collide with any OTHER live tier
  // either -- site/point vermilion, the selected cyan, or locked green.
  const liveColours = [...draw.matchAll(/color:\s*"(#[0-9a-f]{6})"/g)].map((m) => m[1]);
  const publishedColour = fn.match(/color:\s*"(#[0-9a-f]{6})"/);
  assert.ok(publishedColour, "the published overlay no longer sets an explicit stroke colour");
  assert.ok(!liveColours.includes(publishedColour[1]),
    `the published overlay's colour (${publishedColour && publishedColour[1]}) ` +
    "collides with a live tier/selection colour in draw.js");
});

test("Alt bypasses snapping for a freely-placed point, and clears itself on blur", () => {
  // Asked for directly: "less jumping from position to position, more fine
  // tuned positioning for accuracy." In a crowded corner the always-on
  // snap radius can catch a different nearby vertex/edge than the one
  // meant, so a placed point jumps between candidates as the cursor
  // drifts a few pixels rather than tracking it smoothly. Snapping stays
  // the default; Alt is the escape hatch for the rare point that must
  // land somewhere else.
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/let snapSuspended = false/.test(src),
    "draw.js no longer tracks an Alt-held snap-suspend state");
  assert.ok(/keydown.*=>\s*\{\s*if \(e\.key === "Alt"\) snapSuspended = true/.test(src) ||
    /if \(e\.key === "Alt"\) snapSuspended = true/.test(src),
    "Alt keydown no longer suspends snapping");
  assert.ok(/addEventListener\("blur", \(\) => \{ snapSuspended = false/.test(src),
    "losing window focus (alt-tabbing away mid-drag) no longer clears " +
    "snapSuspended -- it could get stuck permanently suspending snap for " +
    "the rest of the session");
  // Threaded through every place that decides whether to snap a point.
  assert.ok(/if \(snapSuspended\) return \[round1\(p\[0\]\), round1\(p\[1\]\)\];/.test(src),
    "placeDraftPoint no longer checks snapSuspended before snapping a " +
    "freshly-drawn region vertex");
  assert.ok(/entry\.item\.tier !== "region" \|\| snapSuspended/.test(src),
    "snapEditedVertex no longer checks snapSuspended before snapping a " +
    "dragged vertex/midpoint");
  assert.ok(/if \(snapSuspended\) return;/.test(src),
    "showSnapHint no longer checks snapSuspended before showing a hover " +
    "snap preview");
});

test("a snapped vertex shows confirmation on the handle itself, not only a separate ring", () => {
  // "I'm never sure that I've snapped things together and not left a
  // sliver between them." The pre-existing gz-snap ring sits directly
  // under the 26px vertex handle being dragged -- at its old 12px size it
  // was almost entirely hidden behind that handle, which a fast drag
  // never looks away from to check.
  const draw = readFileSync(join(STATIC, "draw.js"), "utf8");
  const css = readFileSync(join(STATIC, "gazetteer.css"), "utf8");
  assert.ok(/function snapEditedVertex\(entry, p, marker\)/.test(draw),
    "snapEditedVertex no longer takes the dragged marker -- it has no way " +
    "to mark the handle itself as snapped");
  assert.ok(/el\.classList\.add\("gz-vertex--snapped"\)/.test(draw),
    "a successful snap no longer adds gz-vertex--snapped to the dragged " +
    "handle");
  assert.ok(/el\.classList\.remove\("gz-vertex--snapped"\)/.test(draw),
    "draw.js no longer clears gz-vertex--snapped once a vertex stops " +
    "being snapped -- the confirmation would stick after dragging away");
  assert.ok(/snapEditedVertex\(entry, p, m\)/.test(draw),
    "the main vertex handle's drag handler no longer passes itself to " +
    "snapEditedVertex");
  assert.ok(/snapEditedVertex\(entry, p, mid\)/.test(draw),
    "the midpoint handle's drag handler no longer passes itself to " +
    "snapEditedVertex");
  assert.ok(/gz-snap\s*\{[^}]*width:\s*36px/.test(css),
    "the gz-snap ring is no longer sized to visibly clear the 26px vertex " +
    "handle it sits under -- back near that handle's own size, it reads " +
    "as hidden behind it again");
  assert.ok(/\.gz-vertex--snapped::after,\s*\.gz-vertex--snapped:hover::after/.test(css),
    "gz-vertex--snapped's :hover case is no longer spelled out explicitly " +
    "-- .gz-vertex:hover::after has higher specificity and would silently " +
    "win back the vermilion colour the instant the cursor (already over " +
    "the handle being dragged) counts as hovering it");
});

test("inserting a midpoint welds to what THAT new point touches, not to vertex i's own weld partners", () => {
  // A real, severe bug: dragstart used to pass (x, y) -- the destructured
  // coordinates of the EXISTING vertex i the midpoint sits next to -- to
  // both ring.splice and findWeldedVertices, instead of the midpoint
  // (x+nx)/2, (y+ny)/2 actually being created. A real, pre-existing
  // vertex is exactly the kind of point likely to already have a genuine
  // weld partner elsewhere on the map, so inserting a midpoint next to
  // ANY already-shared corner found and dragged that corner's unrelated
  // neighbour along for the ride. Reported live: "sometimes it starts
  // moving nearby lines and vertexes which make no sense... creating
  // self intersections... snapping something from a different district."
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/const midX = \(x \+ nx\) \/ 2, midY = \(y \+ ny\) \/ 2;/.test(src),
    "draw.js no longer computes a named midX/midY for the point a " +
    "midpoint handle actually creates");
  assert.ok(/L\.marker\(ll\(midX, midY\)/.test(src),
    "the midpoint marker itself is no longer placed at midX/midY");
  assert.ok(/ring\.splice\(i \+ 1, 0, \[midX, midY\]\)/.test(src),
    "inserting a midpoint no longer splices in the point actually being " +
    "created (midX, midY) -- it is back to inserting a duplicate of " +
    "vertex i's own coordinates instead");
  assert.ok(/findWeldedVertices\(entry, midX, midY\)/.test(src),
    "a midpoint's weld lookup no longer queries the point actually being " +
    "created -- back to querying vertex i's own position, which finds " +
    "THAT vertex's real weld partners and drags them to wherever the new " +
    "point ends up");
  // The regression specifically: must never again pass vertex i's raw (x,
  // y) straight through to findWeldedVertices for the midpoint case.
  assert.ok(!/mid\.on\("dragstart", \(\) => \{[\s\S]{0,200}findWeldedVertices\(entry, x, y\)/.test(src),
    "a midpoint's dragstart handler calls findWeldedVertices(entry, x, y) " +
    "again -- vertex i's own coordinates, not the midpoint being created");
});

test("the published-locations ghost never draws for whatever is currently selected", () => {
  // The colour/dash fix alone did not close the loop: "I still see a
  // dashed line left behind when I move vertexes... only gets updated
  // when I refresh." Correct -- that dashed line is exactly the reference
  // overlay, working as designed (frozen until refreshPublished() runs
  // again), but a frozen ghost of the very shape someone is actively
  // dragging vertices on is pure clutter, not a useful comparison. Other
  // locations' ghosts stay -- only the one currently selected is
  // suppressed.
  const app = readFileSync(join(STATIC, "app.js"), "utf8");
  assert.ok(/const selectedId = state\.draw\.selected\(\);/.test(app),
    "renderPublishedLayer no longer looks up the currently-selected item");
  assert.ok(/const suppressLocationId = selectedItem && selectedItem\.locationRef;/.test(app),
    "renderPublishedLayer no longer resolves the selected item's own " +
    "published location id to suppress");
  assert.ok(/if \(loc\.id === suppressLocationId\) return;/.test(app),
    "renderPublishedLayer no longer skips drawing the ghost for whatever " +
    "is currently selected -- dragging a vertex will show a frozen dashed " +
    "copy of the very shape being edited again");
  assert.ok(/renderPublishedLayer\(\);\s*\n\}/.test(app) &&
    /function handleSelectionChange\(ids\)[\s\S]{0,300}renderPublishedLayer\(\)/.test(app),
    "handleSelectionChange no longer re-renders the published layer on " +
    "every selection change -- the suppressed ghost would not update " +
    "until something else happened to trigger a redraw");
});

test("drafting a bisect cut never calls the polygon-only cell/area readout", () => {
  // Found from the client activity log itself: four real attempts to use
  // Bisect, four uncaught crashes, every one of them "a polygon ring needs
  // at least 3 distinct points" thrown from cellCoverage -- because
  // redrawDraft's live status line called refsTouched (a polygon area
  // function, which hard-requires 3+ points) the moment ANY drafting tool
  // reached ITS OWN minimum point count, and bisect's own minimum is 2.
  // A cut is a path, not an area; it was never going to need cells-touched
  // or area-enclosed even once fixed to not crash.
  const src = readFileSync(join(STATIC, "draw.js"), "utf8");
  assert.ok(/if \(isLineTool\(\)\) \{[\s\S]{0,700}report\(`\$\{pts\.length\} points — Enter to \$\{verb\}/.test(src),
    "redrawDraft no longer gives the line-drafting tool (bisect) its own " +
    "status branch -- it will fall through to the polygon one again");
  // The actual regression: refsTouched must never be reachable without
  // first checking isLineTool().
  assert.ok(!/pts\.length >= minPoints\) \{\s*\n\s*const refs = refsTouched\(pts, grid\);/.test(src),
    "redrawDraft calls refsTouched unconditionally again the moment a " +
    "drafting tool reaches its own minimum point count -- bisect's " +
    "minimum is 2, and refsTouched throws below 3");
});

test("the shared fixture is reachable from both suites' expected paths", () => {
  const fixture = JSON.parse(
    readFileSync(join(here, "fixtures", "gazetteer-grid-cases.json"), "utf8"));
  assert.ok(Array.isArray(fixture.pointCases) && fixture.pointCases.length > 0);
  assert.ok(Array.isArray(fixture.polygonCases) && fixture.polygonCases.length > 0);
});
