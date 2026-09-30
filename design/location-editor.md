# The Location Editor: drawing and authoring `data/locations/*.json` inside Foundry

*Designed 2026-09-29, at Ingram's instruction: bring `tools/location-sync/`'s functionality into Foundry
itself, as two separate edit modes (areas, and buildings/map points), then retire the standalone tool
completely. Code (as built): `module/blank-inheritance/scripts/core/location-editor.mjs`,
`foundry/location-editor.mjs`, `foundry/location-edits.mjs`, `foundry/location-draw-layer.mjs`,
`templates/location-editor/*.hbs`, and `tools/location-sync/` on this side.*

**Revision history**: the first version of this document (same day) proposed drawing on Foundry's own
native Region layer. Ingram rejected that outright before any of it was built on real data: *"Do not use
the region system... Our system is separate... The native region stuff is good for large grids but would
suck to use for this precise complex task... did you even read about the precise angles that it snaps to
to help with this? The region system is good for filling grid squares and little else."* She's right, and
the reasoning matters for everything below: `tools/gazetteer/static/draw.js (as it was before that tool was retired)` is not a rough sketch tool —
it's a hand-rolled vertex editor tuned against real session data (angle-snap at 22.5° increments relative
to the first edge drawn, not compass directions; a 40-screen-pixel neighbour-snap radius derived from a
real usage log; a 5px weld tolerance read off a histogram of 865+89 real vertex pairs in a 56-region
session), and Foundry's native Region tool — a coarse, grid-oriented gameplay primitive meant for things
like "this area is difficult terrain" — has none of that and cannot be made to. Reusing it would also mean
sharing one Foundry document type between location authoring and whatever else Regions get used for at a
live table, which is a real way to break a session for an unrelated reason. **This revision throws out
every section that depended on the Region system and replaces the drawing engine with a faithful port of
`draw.js` itself**, hosted on Foundry's own canvas instead of a separate Leaflet page. Everything that was
never about *how a shape gets drawn* — the coordinate bridge, the harvest-record pipeline, field
ownership, the Python-side promotion step — was correct before and is unchanged here.

## 0. The request, and what it replaces

Ingram: *"At the moment we use one offline tool 'The Gazetteer' to define and select, adopt buildings,
regions and things like that in a separate web interface... allow me to do the same things but from
within Foundry itself instead of a separate interface. Then retire the original tool completely...
you have the freedom to smooth and simplify... get rid of things you suspect were never fully developed
or worth pursuing. Ideally we'd have two different layers, one for defining areas and one for defining
buildings and map points... two separate edit modes to make selecting things easier."*

`tools/location-sync/` (Python stdlib server, port 8767, a Leaflet client whose actual drawing engine is
`static/draw.js`) is how all 236 files in `data/locations/` were made: draw a shape on the real map →
adopt a real building footprint or draw freehand → write a rough note → promote into a real location file
→ come back in Review mode to fill rank/depth/lore. This is a port, not a rebuild-from-a-feeling job —
`draw.js` alone carries ~35 regression tests and a string of "found live, the hard way" fixes recorded in
its own comments. §8 is explicit about exactly what ports faithfully, what's genuinely droppable, and why.

## 1. What's reused unchanged, and what's actually new

Two things from the original research still hold and need no rework:

1. **The map is already a live Foundry Scene**, and **a tested scene-pixel ↔ master-image-pixel bridge
   already exists and is already in production**: `core/travel-animation.mjs`'s `sceneCalibration()` /
   `toScenePoint()` / `toImagePoint()`, pure, zero Foundry imports, already used live by
   `foundry/travel.mjs` and `foundry/city-layer.mjs`. **Reused unchanged** — a drawn shape's points are
   scene pixels the whole time they're being drawn/edited (exactly the space `draw.js` already worked in,
   substituting Foundry's canvas for Leaflet's), and only get converted to master-image pixels once, at
   save time, the same conversion the harvest step already needed regardless of which tool drew the shape.
2. **The harvest-record pattern** (`design/scene-edits.md`): Foundry writes small immutable records into
   the module's `storage/`; a repo-side tool pulls and merges them. **Reused unchanged** in shape (§4) —
   it never depended on where the geometry came from.

What's genuinely new, replacing the rejected Region-based design:

3. **Our own drawing engine, ported into Foundry.** `tools/gazetteer/static/draw.js (as it was before that tool was retired)`'s actual interaction
   logic — not its Leaflet plumbing — becomes `foundry/location-draw-layer.mjs`, a Foundry `InteractionLayer`
   subclass (`foundryvtt/.../client/canvas/layers/base/interaction-layer.mjs`: `activate()`,
   `_onClickLeft`, `_onClickLeft2`, `_onDragLeftStart/Move/Drop/Cancel` — the same base class Foundry's own
   Drawings and Region layers extend, so activating it claims exclusive canvas interaction the same
   sanctioned way, and nothing about Foundry's own token/region tools is touched or shared). Rendering
   moves from Leaflet's `L.polygon`/`L.marker` to `PIXI.Graphics` and small interactive display objects on
   this layer's own container; every actual behaviour — angle-snap, neighbour-vertex-snap-and-weld,
   rect/circle drag gestures, marquee/lasso, vertex/midpoint drag-insert-delete, the tuned constants — is
   carried over, not reinvented. See §3 for the full inventory of what's being ported and how each piece
   maps onto Foundry's primitives.
4. **The "session" concept comes back.** The first revision of this document cut `session.py`/`undo.py`,
   reasoning that a Foundry document existing the moment it's drawn made a separate draft state
   unnecessary. That reasoning depended on the shapes being Foundry documents, which they no longer are —
   a drawn-but-unsaved shape is now **our own data**, exactly as it was in the browser tool, so it needs
   the same thing `session.py` gave it: a place to live before it's promoted, autosaved so a reload or
   crash can't lose it, with its own undo stack. See §3.4.

## 2. The two edit modes

Per Ingram's request, areas and buildings/points are two separate systems with two separate edit modes.
**Both are the same ported engine** — draw.js already served both region and site/point tiers from one
codebase, and there's no reason to fork it now.

| | **Areas mode** | **Places mode** |
|---|---|---|
| `tier` | `region` | `site`, `point` |
| What it's for | Districts, biomes — the tessellating layer that should eventually cover the whole map | Buildings, complexes, blocks, and pinned points with no footprint |
| Shape | A real polygon (holes allowed), neighbour-snap and weld active | `site`: a real polygon (a building's footprint), snap/weld inactive — a building traced inside a district has no reason to weld to the district's own border, same rule `draw.js` already enforces (snap targets are regions only, and only while drawing a region). `point`: a single dropped pin, no ring at all — draw.js's own `tool === "point"` path already places a bare point, so a point-tier location needs no circle-standing-in-for-a-pin workaround the way the (rejected) Region design needed one. |
| Canvas state while this mode is active | Only region-tier session items are interactive/visible at full strength; site/point items dim (district-focus-style, reusing `draw.js`'s existing `setFocus`/`DIMMED` mechanism, which already does exactly this kind of "everything else fades, nothing disappears" filtering) | Only site/point session items shown at full strength; regions dim. Once §7 ships, a reference layer of real building footprints is also shown, for tracing or one-click adopting. |
| Distinctive tool | Snap-to-neighbour is live by default | "Adopt Building" (§7) |

The mode toggle lives in the Location Editor panel (§3) and drives which tier `draw.js`'s own `tool`
state defaults to and which items `setFocus` dims — it is not a second drawing engine, just a different
default and a different focus set on the one engine.

## 3. The drawing layer: `foundry/location-draw-layer.mjs`

A straight port of `tools/gazetteer/static/draw.js (as it was before that tool was retired)`, function by function where Leaflet has a direct
Foundry/PIXI equivalent, redesigned only where it doesn't. Read `draw.js` itself before touching this —
its comments carry the *why* behind every tuned number and the bugs each fix closed; those reasons don't
stop applying just because the renderer changed under them.

### 3.1 Direct translations

| `draw.js` (Leaflet) | `location-draw-layer.mjs` (Foundry/PIXI) |
|---|---|
| `L.layerGroup()` (`shapeLayer`, `handleLayer`, `draftLayer`, `snapLayer`) | Four `PIXI.Container`s, children of this layer's own container |
| `L.polygon(latlngs, style)` | `PIXI.Graphics` redrawn on every geometry change (`.clear(); .beginFill(...); .drawPolygon(...)`) |
| `L.marker(latlng, {icon: L.divIcon(...)})` (vertex/pin handles) | A small interactive `PIXI.Graphics` or `PIXI.Sprite` per handle, added to `handleLayer`'s container, with its own `pointerdown`/pointer-drag listeners (PIXI's event system, not Foundry's layer-level drag — a handle's drag is a self-contained gesture the same way `L.marker({draggable:true})`'s was) |
| `map.containerPointToLatLng` / `mouseEventToContainerPoint` | `canvas.canvasCoordinatesFromClient({x: event.clientX, y: event.clientY})` (confirmed present, `client/canvas/board.mjs`) |
| Leaflet's own map-drag conflict avoidance (`map.dragging.disable()`, the whole `trackDrag`/Pointer-Capture apparatus) | Foundry's `InteractionLayer.activate()` already gives this layer exclusive interaction the moment it's the active layer — `canvas.mouseInteractionManager` dispatches drag/click through whichever layer is active, the same mechanism that stops the Region layer's own tool from fighting the Token layer. `_onDragLeftStart/Move/Drop/Cancel` replace `trackDrag` entirely; no pointer-capture hand-rolling needed on this side. |
| `L.CRS.Simple`'s 1:1 image-pixel mapping | Not needed — this layer draws directly in the Scene's own canvas pixels; the image-pixel conversion (`toImagePoint`) happens once, at save, same as §1 already established |
| `ll()`/`px()` coordinate helpers | Unnecessary — no lat/lng round-trip exists in this version at all |

### 3.2 Behaviour ported with its exact tuning intact

Every one of these is carried over with its constant unchanged, because the constant is real, measured
data, not a guess: `ANGLE_SNAP_STEP = π/8` (22.5°, relative to the first drawn edge — `angleSnapPoint`);
`SNAP_RADIUS_SCREEN_PX = 40` and its per-frame screen→image conversion (`snapRegionPoint`,
`scanNearbyRegionPoints` — converted to screen→canvas-scene px here, same reasoning: a fixed image-space
radius is a different-sized target at every zoom); `WELD_TOLERANCE_PX = 5` (`findWeldedVertices`);
`CIRCLE_DRAFT_POINTS = 32`; `PIN_HIT_RADIUS_PX = 15`; the 4px click-vs-drag threshold; the rAF-throttled
drag handlers (`rafThrottle`); the Alt-suspends-snap / Shift-suspends-angle-snap keyboard modifiers;
`splitTargetEdge` (a neighbour-edge snap inserts a real matching vertex on the other side, so one drag
makes a genuinely shared corner, not just a nearby one); `setFocus`/district-dimming; marquee (drag-box)
and lasso (freehand) multi-select, both able to mix already-drawn items with not-yet-adopted real
buildings in one selection; right-click-drag-to-pan (left button is claimed entirely by drawing/selection,
same as the original). `hitTestAt`'s smallest-area-wins-among-overlaps rule and pins-win-outright-within-
radius rule are unchanged.

### 3.3 What changes, deliberately

- **No separate Leaflet tile pyramid.** The old tool rendered its own WebP tiles (`tile.py`) because it
  had no map of its own otherwise. Foundry already has the Campaign Map Scene on screen; this layer draws
  on top of it.
- **Ground-truth building outlines** (for Adopt, §7) come from a pre-exported static index rather than a
  live GeoPackage query — the old tool's server could query `data/map/kurose.gpkg` (120MB, gitignored)
  live because it ran on the same machine; Foundry's client can't. Phase 2, not blocking.
- **The crop/handoff "Copy for Claude" documents** (`crop.py`/`handoff.py`) existed because there was no
  live channel between the gazetteer and me. The harvest pipeline (§4) *is* that channel now, so these are
  likely obsolete rather than merely unported — left alone pending confirmation, not deleted outright.

### 3.4 The session

Restored (§1.4): a draft item — drawn but not yet saved to the repo — is **our own data**, held in
`core/location-editor.mjs`'s session state (pure: add/update/remove/undo-stack operations on plain
objects, mirroring `session.py`'s own responsibilities) and **autosaved** by the Foundry half into the
module's `storage/location-draw-session.json` after every meaningful change (a shape finished, a vertex
edited, an item deleted or renamed) — one mutable file, overwritten in place, unlike the immutable
harvest records in §4. This is deliberately a *different* persistence shape from a harvest record: a
session item is pre-save scratch work, local to this Foundry world, and is never itself pulled into the
repo — only the explicit "save this item" action (§4) turns it into a harvest record. A GM reload or crash
mid-session loses nothing: the panel reloads the last autosave on open, the same safety property
`session.py`'s own autosave gave the browser tool.

## 4. Harvest records

Unchanged in shape from the first revision — this was never about the drawing engine. Foundry writes
small, immutable JSON records into the module's `storage/` (the one folder no deploy or update touches);
a repo-side tool is the only thing that ever reads them into git. One file per change,
`storage/location-edit-<time>-<random>.json`:

```json
{
  "kind": "location-edit",
  "version": 1,
  "id": "20260929T161822114Z-Xq2v9k",
  "at": "2026-09-29T16:18:22.114Z",
  "by": "Ingram",
  "op": "create",
  "locationId": null,
  "draftId": "draft-4",
  "tier": "site",
  "geometry": { "imagePx": { "rings": [[[x,y], ...]], "point": null } },
  "fields": { "name": "...", "kind": "...", "tags": [...], "rank": null, "classification": null,
              "depth": "named", "lore": { "summary": "...", "playerFacing": "", "gmOnly": "" },
              "scene": { "hooks": [], "activities": [] }, "note": "..." },
  "before": null
}
```

(`draftId` is the session item's own local id, stable for the life of the draft — provenance, not
identity, exactly like the old tool's own `sourceSession`/`sourceLocalId`, never written into the
promoted location file itself.)

- **`op`**: `"create"` (a session item with no `locationId` yet), `"update"` (metadata only, geometry
  unchanged), or `"geometry"` (an existing location's shape changed). A single save that changes both
  writes one `"geometry"`-and-`"update"` pair, not a combined op.
- **`geometry.imagePx`** is already in master-image-pixel space — converted at save time from the
  session item's scene-pixel ring, using the existing `toImagePoint()` (§1.1), so the repo-side tool never
  needs to know anything about which Scene or which of its Tiles a shape came from.
- **`fields`/`before`**: `before` is what the panel loaded when this item was opened for editing — the
  same "what she saw" mechanism `scene-edits.mjs` uses for clash detection (§6).

## 5. `tools/location-sync/`: the repo-side pull, merge and promote

Unchanged from the first revision — geometry math never depended on the drawing engine either.
`npm run locations` pulls `storage/location-edit-*.json` into tracked `harvest/location-edits/`, merges
metadata-only (`"update"`) records with per-field clash detection (matching `scene-edits.mjs#mergeRecord`'s
doctrine exactly), and hands geometry (`"create"`/`"geometry"`) records to a small Python script,
`tools/location-sync/apply_geometry.py`, which imports the relocated `tools/location-sync/core/georef.py`/
`location.py`/`grid.py`/`containment.py` **unchanged** — kept Python-only deliberately, per
`server.py`'s own on-record warning against a second, drifting implementation of the rotation/projection
math in JavaScript. Node writes the resulting `data/locations/<id>.json`; Python only computes. No
deploy-blocking guard (an unpulled drawing is merely late, never at risk of being overwritten — `storage/`
is untouched by any deploy).

## 6. Field ownership (`design/data-ownership.md`)

Unchanged from the first revision: `geometry`/`derived`/`pinAnchor` are `OWNER: location-editor`
(`lifecycle`-class — the repo/Claude never hand-edits a shape), already tagged in
`data/schema/location.schema.json`. `name`/`nameJa`/`kind`/`tags`/`rank`/`classification`/`depth`/`lore.*`/
`scene.hooks`+`activities`/`authoring.note` are `promotable` (either the Location Editor or Claude may
write them, clash-detected). Cross-refs, `realWorld`, `scene.history`/`consequences` stay Claude's own,
untouched by this panel. `authoring.status` is unchanged, still the Approvals Desk's field.

## 7. Adopting a real building (Phase 2, not blocking)

Unaffected in concept by the architecture change — the gesture is still "click a real footprint, get its
exact polygon" (`_api_hit_test`/`_api_adopt`, ported as a small pure `core/building-hit-test.mjs`,
same exact-inside/nearest-edge rule) — now a tool on **our own** draw layer instead of a proposal to
programmatically create a Foundry Region. Needs a static, grid-bucketed export of building footprints
(`tools/location-sync/export-buildings.py`, from the same GeoPackage query `/api/features` already makes)
since Foundry's client can't query the 120MB GeoPackage live. Not blocking Phase 1 — the painted map
already renders real building shapes clearly enough to hand-trace as a fallback.

## 8. What ports, what's dropped, what's deferred — the full accounting (revised)

**Ported faithfully, not dropped** (the first revision wrongly proposed dropping most of this in favour
of Foundry's native tool — corrected here):

- **`draw.js`'s entire interaction model** — §3 above. Angle-snap, neighbour-vertex-snap-and-weld with
  edge-splitting, rect/circle draft gestures, marquee/lasso, vertex/midpoint drag-insert-delete, district
  focus dimming, right-click-pan. This is the actual asset being preserved; none of it is "old UI to
  retire," it's tuned, tested behaviour with no native Foundry equivalent.
- **The session concept** (`session.py`/`undo.py`) — restored, §3.4. The first revision's reasoning for
  cutting it (a Foundry document exists the moment it's drawn) no longer applies once shapes aren't
  Foundry documents.

Kept as a relocated library, `tools/location-sync/core/` (moved from `tools/location-sync/core/`, unchanged
unless noted) — **unaffected by this revision**, since none of it was ever about the drawing engine:

- `grid.py`+`.mjs`, `containment.py`+`.mjs`, `shape.py`+`.mjs`, `bearing.py`+`.mjs`, `depth.py`+`.mjs` —
  the dual-tested pure geometry core.
- `location.py`'s `build_location()` and the promotion contract; `georef.py`, kept Python-only (§5).
- `reconcile.py`/`cleanup.py` — demoted to on-demand batch CLI commands rather than live-in-canvas
  assists, since the live cross-shape welding they used to support by hand is now `draw.js`'s own
  `findWeldedVertices`/`splitTargetEdge`, ported and live in §3 — reconcile becomes a periodic tidy-up
  pass, not the only way to keep borders shared.
- `coverage.py`, `biome.py`, `overrides.py`, `landmask.py`, `requests.py` (and
  `data/map/gazetteer-requests.json`, no new UI needed — I write to it directly), `lore_library.py`
  (kept as a library, not given a new Foundry home — a document-curation concern, not geometry authoring).
- `export_travel_graph.py` — not touched at all, already bridging successfully into `travel-route.mjs`.

Dropped outright, not ported:

- **The Approve endpoint / `approved`-status concept** — already retired 2026-09-18, replaced by the
  Foundry Approvals Desk (built, epic #165 and sub-issues #166-172 closed 2026-09-20 — this repo's own
  CLAUDE.md previously and wrongly said "not yet built"; corrected alongside this document).
- **`tile.py`** — not needed; Foundry already renders the Scene (§3.3).
- **Every underscore-prefixed one-shot script** and the scratch `_cache/` scripts `crop.py` replaced —
  each already did its one job against a corpus that now exists.
- **`calibrate.py`/`make_grid_layers.py`** — map-*production* tooling (verifying the Photoshop master's
  own registration), a `tools/city-map/` concern, relocated there if still wanted.

Deferred, real functionality not yet given a new home (tracked, not silently lost):

- The Lore Library's browsing UI and `lore-instructions.json`'s reverse queue — a candidate for the
  Approvals Desk's out-tray (`approvals-desk.md` §6), not this panel.
- `handoff.py`/`crop.py` — likely obsolete now that the harvest pipeline is a live channel; not deleted
  pending confirmation.
- The buildings-index / adopt tool — Phase 2, §7.
- A biome overlay in Areas mode — Phase 4, optional.
- **The panel intercepting Escape while a draft is in progress** (found 2026-09-29, §10 phase 2b) — right
  now Foundry's own Escape-closes-the-window handling runs before the layer's `_onDismissKey` ever fires,
  so cancelling a draft with Escape also closes the whole panel. A UX rough edge, not a correctness bug
  (nothing is ever saved half-finished either way).

## 9. Testing

`core/location-editor.mjs` (session ops, field shaping/validation, record/clash logic) and
`core/building-hit-test.mjs`/`core/location-depth-check.mjs` (once built) are pure, unit-tested, zero
Foundry globals. `foundry/location-draw-layer.mjs` — the one genuinely Foundry-coupled, hard-to-unit-test
piece — gets its correctness checked the way `draw.js` itself was: real interaction, live, in the local
licensed Foundry copy (per `design/scene-edits.md §11`'s own verification model), plus porting across as
many of `draw.js`'s ~35 documented regression cases as translate (angle-snap math, weld-tolerance math,
hit-test rules) as pure-logic unit tests wherever the check itself doesn't require a live canvas.
`tools/location-sync`'s merge/clash logic gets its own `test/location-sync/` suite mirroring
`test/scene-edits/tools.test.mjs`. The relocated Python `core/` keeps its existing unit suite unchanged at
its new path.

## 10. Delivery phases

0. ✅ This document (revised); `data-ownership.md` `OWNER:` tags; the stale CLAUDE.md gazetteer/Desk
   correction. All done before the Region-based misstep, and still correct.
1. ✅ **The vertical slice**: `location-draw-layer.mjs`'s polygon draft path (click-to-place, angle-snap,
   rect/circle drag, finish/cancel/undo-point) rendering on the Campaign Map scene; the session (§3.4);
   the Location Editor panel wired to session state instead of Region selection; harvest records (§4);
   `tools/location-sync`'s pull+merge+promote (§5). Proven live in the local Foundry copy: drew a region
   end to end, real file landed in `data/locations/`, schema-valid, real lon/lat and area.
2. ✅ **Vertex handles, neighbour-snap-and-weld, mode dimming** (2026-09-29, same day). Drag-to-reshape,
   midpoint-drag-to-insert, right-click delete (with the "never below 3 points, never orphan a welded
   neighbour" guard), region-to-region snap while both drafting and editing, weld propagation (dragging
   a shared vertex moves every welded region's own copy of it, verified live by exact coincidence, not
   just visually), and Areas/Places mode dimming (§2's table).
2b. ✅ **Marquee and lasso multi-select** (2026-09-29, same day, closing this phase's own gap). The Select
   tool's own drag now box-selects (`itemsInRect`, `core/location-editor.mjs`); a new Lasso tool
   freehand-selects (`itemsInPolygon`, reusing the polygon-drafting click/Enter/Escape/Backspace state
   machine draw.js's own `POLYGON_DRAFT_TOOLS` grouping used for exactly this). Both select session items
   only — sweeping in a not-yet-adopted real building the same gesture (draw.js's own `onAreaSelect`
   behaviour) still needs the buildings index, §7/§8, not built. Shift adds to the existing selection
   (click, marquee or lasso); the panel shows a batch "N selected" view with one bulk-delete action once
   more than one item is selected, in place of the single-item field form (draw.js's own "several
   selected, no single ring to edit, the batch panel takes over" rule, applied here to the metadata form
   too). Live-verified in the local Foundry copy: lasso around two drawn shapes selected both by id;
   marquee (see below for why this was driven directly rather than through a real drag gesture) selected
   exactly the two inside its rect and left a third outside it alone; shift-drag correctly added a fourth;
   a sub-4px drag correctly left the selection untouched; batch-delete removed both selected items in one
   autosave. `itemAnchorPoint`/`itemsInRect`/`itemsInPolygon`/`pointInRing` are pure and unit-tested
   (`test/tier1-location-editor.test.mjs`).
   **Found and fixed along the way, not scoped to multi-select but blocking a clean test of it:**
   Enter-to-finish, Escape-to-cancel and Backspace-to-undo-a-point had **never actually worked**, since
   the very first version of this layer — `_handleKeyDown(key)` is not a real Foundry method; nothing
   calls it. The real InteractionLayer override points are `_onDismissKey(event)` (Escape) and
   `_onDeleteKey(event)` (Backspace/Delete — already core's own "delete" keybinding, so Backspace is
   handled there rather than as a second custom registration on the same key); there is no built-in
   dispatch for Enter at all, so that's now a real registered keybinding
   (`registerLocationDrawKeybindings()`, called from the init hook). All three live-verified working
   after the fix (a polygon finished with Enter and landed in the session; Backspace during a fresh
   2-point draft dropped it to 1; Escape during a draft correctly abandoned it without creating a shape).
   Before this fix, double-click was the only way anyone could ever finish a polygon/region/site —
   it still works and always did, since `_onClickLeft2` is a real dispatch.
   **Found, not fixed, tracked as a real gap:** pressing Escape while the panel is open closes the whole
   panel rather than reaching `_onDismissKey` at all — Foundry's own `#onDismiss` closes any open
   `ui.windows`/ApplicationV2 with a frame *before* it ever reaches the active layer's dismiss handler
   (`client-keybindings.mjs`'s Case 4 runs before Case 5). The draft itself is correctly abandoned either
   way (nothing corrupt is ever saved), so this is a UX rough edge, not a correctness bug — fixing it
   properly means the panel itself intercepting Escape while a draft is in progress, a distinct piece of
   work from what this phase set out to do.
   **Also found, not built, newly added to §8's own list:** draw.js also had a `bisect` tool (a two-point
   cut that splits an existing region into two, real server-side geometry in `reconcile.py#bisect_region`,
   relocated unchanged to `tools/location-sync/core/`) that was missing from every earlier accounting of
   what this rebuild ported — never wired into the new draw layer at all.
   **Not done from this phase's original scope, still deferred:** draw.js's old per-district focus mode
   (mode-based dimming already covers the more load-bearing half of what it was for; a generalised "focus
   on just this one district and its neighbours" toggle is a separate, smaller nice-to-have).
   **A genuine, disclosed environment limitation, not a code bug:** this local Foundry copy's browser
   automation cannot drive a real drag gesture that Foundry's own `MouseInteractionManager` recognises as
   one — confirmed by instrumenting `_onDragLeftStart/Move/Drop/Cancel` directly: every attempted
   `left_click_drag`, with or without a preceding hover, produced only `_onDragLeftCancel`, and this
   reproduces identically on the **pre-existing** rect/circle tools, not just the new marquee code, so
   it isn't something this session's changes caused. The marquee's own wiring was instead verified by
   calling `_onDragLeftStart`/`_onDragLeftMove`/`_onDragLeftDrop` directly with a constructed event object
   (the same shape Foundry's own dispatch would build) — a legitimate way to prove the code's own logic,
   but not a substitute for a real mouse-drag proof, which a future session with working drag automation
   (or a human at the table) should still give it once.
3. **Deferred, not blocking retirement**: adopt-a-building (§7 — the painted map itself is a workable
   hand-tracing fallback in the meantime), depth/shape advisory checks in-panel, a biome overlay in Areas
   mode, the Bisect tool (found in 2b above). Real, tracked gaps — not silently dropped — see §8's own
   "deferred" list.
4. ✅ **Retirement** (2026-09-29, same day). `tools/gazetteer/` deleted in full: `server.py`, the whole
   `static/` client, `tile.py`, `query.mjs`, `session.py`/`undo.py`, every one-shot underscore script,
   all gitignored cache/calibration directories. The kept Python/JS core relocated to
   `tools/location-sync/core/` and `tools/location-sync/` (map-production scripts to their own
   `map-production/` subfolder), `apply_geometry.py`'s import simplified now that `core/` is a direct
   sibling, every `test/gazetteer/*.py` and `test/gazetteer-*.test.mjs` relocated to `test/location-sync/`
   (the ones testing retired modules deleted instead), `.gitignore`/`.claude/launch.json`/CLAUDE.md/this
   document/the schema files/every other design-doc cross-reference updated. One pre-existing test
   failure survives the move unrelated to any of this work (`test_containment.py`'s real-session check,
   `147 != 217` — unchanged code, unchanged real data file, confirmed not caused by the retirement).
   `npm run locations`'s full pull→merge→promote pipeline re-verified working post-move via a live smoke
   test. Nothing in the repo still points at port 8767.
5. ✅ **Depth/shape advisory checks in-panel** (2026-09-29, same day, closing another §8 gap). `depth.mjs`
   and `shape.mjs` were already ported but never wired to anything after the retirement — the Foundry
   module cannot import from `tools/` at all, so both files now also live, byte-identical, at
   `module/blank-inheritance/scripts/core/` (a drift-guard test checks the two copies stay identical, plus
   a behavioural smoke test of the module's own import). The panel shows both checks live, recomputed on
   every field edit, for whichever single item is selected: **depth** (`checkDepth` against an "as if
   saved" document — whatever's already on disk, or nothing for a fresh draft, with the panel's own live
   edits overlaid via `applyFieldsToDoc`) lists what's missing/overweight/orphaned at the declared depth,
   or confirms it's met; **shape** (region/site tier only, skipped for a point) converts the drawn ring to
   real square metres via the Campaign Map's own published `metresPerPixel` (1.0 — a flat, already-derived
   constant read once from `campaign-map.json` and now shared through `foundry/travel.mjs`'s own manifest
   cache rather than fetched a second time, deliberately not re-deriving the map's real rotation math the
   way `georef.py`'s own docstring warns against) and shows what that footprint will comfortably carry.
   Neither ever blocks Save — this panel only ever writes `drafted` content (§6), so there is nothing here
   to gate, only advice to show, exactly `depth.py`'s own "missing/overweight/orphaned are advice, not a
   verdict" doctrine. Live-verified in the local Foundry copy: a blank site correctly listed name/kind/
   summary as missing and its real ~1000 m² footprint as "a real building with several distinct spaces";
   filling in the three fields correctly cleared the depth list live, with no reload; raising the declared
   depth to `standing` correctly re-listed everything that depth actually requires (player-facing text,
   GM-only notes, history, consequences, hooks/activities/NPCs/artwork/a playlist) rather than silently
   passing.
6. ✅ **The Bisect tool** (2026-09-30, closing the gap phase 2b found). draw.js's two-point cut that splits an
   existing region in two, ported as a real `bisect` tool on the draw layer plus a new harvest-record op,
   `"split"` (`{op, locationId, tier: "region", geometry: {cutPointsImagePx: [[x,y],...]}}`, `fields`/`before`
   null — same shape as `"geometry"`, structurally validated the same shallow way in
   `core/location-editor.mjs#validateRecord`, region-only enforced in `tools/location-sync/merge.mjs` rather
   than there, matching how `"geometry"`'s own region-only rule already works). **The design departs from the
   old tool on purpose:** draw.js bisected within one shared, persistent draft pool that always held every
   promoted region too (`server.py`'s `STATE.draft`, plus an automatic `_resync_promoted_region_geometry`
   back to disk); this tool's session is deliberately transient and drafts-only (§3.4), so there is no such
   pool to draw from. Instead the panel has a "Bisect" section (Areas mode, only while the Bisect tool is
   active): the GM types a real region's own id, the panel fetches its file, checks it is actually a region,
   and hands its outline to the layer as an **on-demand reference** (amber, its own container, never a
   session item — this is not a general "every real location shown on the map" layer, which §7/§8's
   buildings-index work would need, just the one target). The GM then draws a two-or-more-point OPEN cut line
   (never closed or filled like polygon/lasso, and — per draw.js's own comment — never angle-snapped or
   border-snapped either) and presses Enter or double-clicks; the layer hands the finished line to the panel
   (`onBisectReady`, scene px), which converts it to image px and writes the `"split"` record, then clears
   the reference and returns to the Select tool. **Repo-side** (`tools/location-sync/merge.mjs`'s new
   `"split"` branch → `apply_geometry.py#_apply_split`): the target's file is read fresh at merge time —
   never a snapshot from whenever the cut was drawn, so it cannot overwrite a change made in between — and
   `core/reconcile.py#bisect_region` (relocated unchanged, shapely) does the actual cut. **The survivor**
   (the larger piece) keeps the original document entirely (name, lore, authoring, every cross-reference),
   only its geometry/derived fields resynced via the same `resync_region_geometry` the existing `"geometry"`
   op already uses. **The new smaller piece** becomes a brand-new `data/locations/<target>-2.json` (id minted
   by the new `mintSplitLocationId`, `<target>-2`, `-3`, … — a split has no name to slugify from) built
   through the same `build_location()` every other new location goes through, deliberately with no lore at
   all, so it lands at `authoring.status: "needs-lore"` with `name: null` and a note recording where it came
   from — the "NPC stubs by default" convention applied to a location, never a copy of the original's lore
   (`bisect_region`'s own explicit rule). **A real bug found and fixed while building it:** the cut must be
   read from the target's `derived.imagePx`, not `geometry.rings` — the latter is lon/lat, the canonical
   storage space, and feeding lon/lat into a cut expressed in image px silently produced "this line does not
   cross the region at all" on a line that visibly does. **A second pre-existing bug fixed in the same
   code:** angle-snap and border-snap used to apply to *any* tool that used the polygon-drafting state,
   including Lasso (`#pendingTier` is the panel's mode toggle, independent of which tool is active, so a Lasso
   loop drawn while the panel was in Areas mode had its points quietly attracted to nearby region borders);
   both are now gated on the polygon tool itself, matching draw.js's own "only Region/Site's own polygon
   mode does this at all." Verified: Python `test_apply_geometry.py` (a real straight cut gives two 20000 m²
   halves, survivor keeps its lore/faction/hooks, new piece is a `needs-lore` unnamed stub; a line that never
   crosses is refused, as is a non-region, as is a one-point cut), `merge.test.mjs` (id minting; region-only
   and file-must-exist refused before ever reaching Python), `validateRecord` for the new op, a full
   Node→Python→two-files run against scratch data (never real campaign data), and live in the local Foundry
   copy — loading a real region (`back-ridges`) rendered its outline in the reference container, a two-point
   cut finished with Enter wrote a correctly-shaped `"split"` record with real image-px cut points and reset
   the reference/tool, both error paths (no such file; a real *site* rather than a region) refuse with the
   right message and load nothing, and Change target clears it; polygon angle-snap re-verified live after the
   gating change (a third click ~43° off snapped to exactly 45°). **A disclosed limitation, not silently
   swept aside:** whether a cut actually divides the region into exactly two pieces can only be known when
   shapely runs, repo-side, at `npm run locations` time — Foundry has neither shapely nor the region's
   canonical geometry to check against live, so a bad cut is only reported when the next pull is run. The
   live test above stopped at the harvest record (and deleted it afterwards); the full pipeline was proven
   against scratch data only, deliberately, since applying a test cut to a real region file would have
   corrupted real campaign data.
   **Update, same day -- the limitation above is now mostly closed live.** The panel refuses, before writing
   any record, a cut that does not meet the target's border exactly twice (`cutBoundaryMeetings`,
   `core/location-editor.mjs`: a proper crossing, or an end resting within 5 px of the border, counts; the
   reference stays loaded so the GM just redraws). A count of two is "plausible", not "certain" -- shapely
   at pull time is still the final word on a strongly concave region. Verified live: a cut with both ends
   inside wrote nothing and kept the target; an edge-to-edge cut was accepted; and that same real record was
   then run through the full merge on a scratch copy of the real `back-ridges.json` -- it split into
   1,226,660 m2 and 1,046,712 m2 (summing to the original 2,273,362 m2), the survivor kept its name and
   status, the new piece was an unnamed `needs-lore` stub `back-ridges-2`, and the real file was untouched.
