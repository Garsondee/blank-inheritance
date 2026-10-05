# The Location Editor: drawing and authoring `data/locations/*.json` inside Foundry

*Designed 2026-09-29, at Ingram's instruction: bring `tools/location-sync/`'s functionality into Foundry
itself, as two separate edit modes (areas, and buildings/map points), then retire the standalone tool
completely. Code (as built): `module/blank-inheritance/scripts/core/location-editor.mjs`,
`core/location-draw-tools.mjs`, `core/location-published.mjs`, `foundry/location-editor.mjs`,
`foundry/location-edits.mjs`, `foundry/location-draw-layer.mjs`, `foundry/location-published.mjs`,
`templates/location-editor/*.hbs`, and `tools/location-sync/` on this side.*

> **Read §10 phase 7 before trusting anything in phases 1-6 about what was "verified live".** The first
> version of the editor passed every check its author wrote and was **completely unusable** the first time
> the GM opened it in a real browser (2026-10-01: no panning, no existing outlines, nothing could be placed,
> and a console crash that wedged the canvas). Phases 1-6 were "verified" by calling the layer's handlers
> directly with hand-built event objects, which never exercises Foundry's own pointer pipeline. Phase 7 says
> what was wrong, what replaced it, and how this tool is now tested for real (recipe in §11).

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
| Canvas state while this mode is active | Only region-tier session items are interactive/visible at full strength; site/point items dim (district-focus-style, reusing `draw.js`'s existing `setFocus`/`DIMMED` mechanism, which already does exactly this kind of "everything else fades, nothing disappears" filtering) | Only site/point session items shown at full strength; regions dim. The real building footprints (§7, §13) are drawn as a reference layer, for tracing or one-click adopting. |
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

### 3.5 What already exists on the map

`foundry/location-published.mjs` fetches every `data/campaign/locations/*.json` once (12 at a time, cached;
the panel's **Refresh** re-reads) and lays each onto the hub scene with the same `sceneCalibration` the
travel marker and the pin placer use (`hubCalibration()`, now the single copy). `core/location-published.mjs`
reduces a document to a shape from `derived.imagePx`/`derived.centroidPx` -- **never `geometry.rings`**, which
is lon/lat. The layer draws one fill+outline `Graphics` per polygon tier plus one for pins (a handful of
display objects, not 237), dimmed outside the current mode like the session's own shapes, hidden when the
layer is not the active one, and only on the hub scene. **Clicking** one opens it as a session item linked to
its file (`locationId`, `locked`, `peek: true`, `baselineGeometry`); selecting anything else lets go of any
item that was only looked at (`releasePeeked`), so clicking around leaves nothing behind. Editing a field or
reshaping clears `peek`. Hit rule: a pin within reach wins, otherwise the smallest polygon (holes honoured);
in Areas mode a region beats a building under the same point, and the reverse in Places mode. A new region's
corners snap to the deployed regions' corners and edges too (a deployed region is only ever a snap *target*).

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

## 7. Adopting a real building (BUILT 2026-10-05, section 13)

The gesture is "click a real footprint, get its exact polygon", on **our own** draw layer. It needed a static export of the building
footprints, because Foundry's client cannot query the 123 MB GeoPackage: `tools/location-sync/export_buildings.py` writes
`data/map/buildings-index.json`, which ships with the campaign data to `data/campaign/map/`. Built, with the pure half
(`core/buildings-index.mjs`: the exact-inside / smallest-footprint / nearest-edge hit rule, the grid, adopting a footprint into a draft)
and the Foundry half (`foundry/buildings-index.mjs`, and the draw layer). See section 13 for what it does and how it was found missing.

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

`core/location-editor.mjs` (session ops, field shaping/validation, record/clash logic),
`core/location-draw-tools.mjs` and `core/location-published.mjs` are pure, unit-tested, zero Foundry
globals. `foundry/location-draw-layer.mjs` — the one genuinely Foundry-coupled, hard-to-unit-test piece —
is tested three ways, and **all three are needed** (§10 phase 7 is what happens with only the third):
**executed** against a stand-in PIXI/Foundry that replays Foundry's real callback sequence
(`test/tier4-location-draw-layer.test.mjs`); **read as source** where the wiring and Foundry's own source
matter (`test/tier3-location-editor-contract.test.mjs`); and **driven live with real pointer events** in the
local licensed Foundry copy (§11) -- *real events*, not direct handler calls. Porting across as many of
`draw.js`'s ~35 documented regression cases as translate (angle-snap math, weld-tolerance math, hit-test
rules) as pure-logic unit tests remains the way to keep the geometry honest.
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
   **[CORRECTED 2026-10-01 -- see phase 7. The next paragraph's diagnosis was wrong: it called a defect of
   the tool an "environment limitation". A real drag does work through Foundry's own
   `MouseInteractionManager` once the Browser pane's animation loop is running (recipe in §11); what was
   broken was the tool's own drag handling.]**
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

7. ✅ **It works in a real browser** (2026-10-01). The GM opened the deployed editor in real Foundry and wrote:
   *"it's completely non-functional in Foundry VTT. I can't pan the camera, I can't see any existing outlines
   for buildings or areas or map pins and I can't place new ones"*, pasting `Cannot read properties of null
   (reading 'refCount')` from `LocationDrawLayer#_onDragLeftCancel`. Everything in phases 1-6 had been
   checked by calling handlers directly, so none of it had ever met Foundry's real pointer pipeline.
   **What was wrong** (each reproduced live with real pointer events before it was changed):
   - **The crash wedged the canvas.** A left-drag made a preview `Graphics`; the drop destroyed it; and
     Foundry *always* follows a drop with `cancel()` -> `_onDragLeftCancel`, which destroyed it again. PIXI's
     second `destroy()` throws, **inside `MouseInteractionManager#cancel`, before that method resets its own
     state** -- so `canvas.currentMouseManager` stayed set and the manager stayed in `DROP`, and every later
     pan and click was dead until a reload. (Reproduced: state 5, manager stuck, right-drag pan dead.)
   - **The default tool was named `"select"`**, which Foundry's canvas reserves: every drag dispatch in
     `client/canvas/board.mjs` begins `["select", "target"].includes(game.activeTool)` and takes Foundry's own
     rubber-band branch, never reaching the layer.
   - **The dock group's `tools` was an array.** `SceneControls` keys tools by name, so they were called
     `"0"`..`"6"`, `game.activeTool` was `null`, and the dock's own click handler crashed on `undefined.button`
     (an earlier note here blamed that crash on calling `activate({tool})` twice; that was a misattribution).
   - **Nothing that already existed was drawn.** The layer drew only the session's own drafts, so the map was
     empty. All 237 deployed locations now draw (§3.5).
   - **Shapes were drawn at a fixed scene-pixel weight.** The Campaign Map is 12,400 px across and is
     normally viewed at about 0.06-0.3 zoom, where a 2-scene-pixel line is a tenth of a screen pixel.
   - **The panel re-claimed the canvas on every render**, snatching it back from any other dock group.
   - **A non-interactive `Graphics` above the handles swallowed presses on them** (found while verifying the
     rest: PIXI 7 hit-tests `"auto"` children of an interactive parent, and one hit stops the search beneath
     it, so the hover highlight made a region's corner impossible to grab).
   - **Escape**, once the panel intercepted it, cancelled the draft *itself* and then reported "unhandled",
     so Foundry carried on and opened its main menu on top of the editor.
   **What replaced it:**
   - `core/location-draw-tools.mjs`: one tool vocabulary (`pick` replaces `select`) shared by the dock, the
     panel and the layer, with the reserved names written down and the dock built as an object by
     `buildDockControl`. `onToolChange` now acts only on the tool being *entered*.
   - Every Foundry-called callback is wrapped in `#guard`; the drag preview is owned by the layer and ended by
     one idempotent `#endDrag`; `_canDragLeftStart` refuses drags for the click-only tools; every drawing
     container except the handles is invisible to hit-testing (`#passive`).
   - **Left-drag pans** (the pick tool; absolute from where the drag began, so it never drifts); **Shift-drag**
     boxes a selection (Ctrl as well adds to it); right-drag still pans as everywhere in Foundry. A press only
     *picks* on release and only if it did not become a drag, so panning from the middle of a building
     selects nothing.
   - **Existing locations** (§3.5): drawn, tier-toggled, hover-labelled, click to open for editing, snapped to.
   - **Screen-constant sizing** (`#px`) with a debounced redraw on zoom (the `canvasPan` hook).
   - **Escape** abandons a half-drawn shape, then lets go of the selection, then closes the panel; the panel
     only *refuses* to close while the layer has something to abandon, and the layer does the abandoning.
   - Closing the panel returns the canvas to Tokens; opening it claims the canvas once.
   - **Save** writes only what changed: a reshaped region's geometry, an edited field set, nothing for a
     location that was only looked at (`fieldsEdited`, `itemGeometryChanged`).
   **How it is tested now** (the real lesson; §9 and §11): `test/tier4-location-draw-layer.test.mjs` *executes*
   the layer against a stand-in PIXI that throws on a second `destroy()` and replays Foundry's real callback
   sequence (`start -> move* -> drop -> cancel`); `test/tier3-location-editor-contract.test.mjs` reads the
   wiring and checks the Foundry source it leans on (the Escape cascade, the manager's cancel order, the
   dock's by-name tool lookup, the reserved names); `test/tier1-location-draw-tools.test.mjs` and
   `test/tier1-location-published.test.mjs` cover the pure halves, including that **every real location file
   can be drawn and found under the pointer**. And it was driven live in a real Foundry with real pointer
   events (§11).
   **Still open, deliberately:** welding a dragged corner to a neighbouring region that is *not open in the
   session* (open both first); adopting a real OSM building that is not yet a location (§7, needs the
   buildings index); labels appear on hover only.

## 11. Driving the editor for real, from the Browser pane

Calling a handler directly proves the handler, not the tool. Foundry's `MouseInteractionManager` is a state
machine (`NONE -> HOVER -> CLICKED -> GRABBED -> DRAG -> DROP`), the board dispatches on `game.activeTool`,
and a drop is always followed by a cancel; the first version of this editor was correct line by line and
unusable as a whole. To test it the way a GM uses it:

1. **Make the pane render.** A hidden Browser pane has a 0x0 viewport and no animation frames, so PIXI never
   renders and events have nothing to hit. `resize_window` to 1280x800, replace `requestAnimationFrame` with a
   `setTimeout` shim, and `canvas.app.ticker.stop(); canvas.app.ticker.start()`.
2. **Dispatch real `PointerEvent`s on `canvas.app.view`** (`pointerdown`, a run of `pointermove`s with
   `buttons`, `pointerup`; `button` 0 or 2; `shiftKey`/`ctrlKey`), with small sleeps between them -- Foundry
   throttles drag moves to the ticker. Wheel zoom needs a `WheelEvent` at a point where
   `document.elementFromPoint` is `#board` (an open modal such as Foundry's main menu covers everything).
3. **Assert the manager, not just the layer:** `canvas.mouseInteractionManager.state === 1`,
   `canvas.currentMouseManager === null`, `game.activeTool`, no `window.__errs`. The wedge was only visible
   there.
4. **Escape is one keydown on `document.body`** (it bubbles to Foundry's `window` listener). Dispatching it
   on both `document` and `window` sends two and opens the main menu.
5. **See it.** `computer screenshot` works once the viewport is emulated; for pixel detail render the stage
   and `toBlob` the canvas, then `FilePicker.uploadPersistent("blank-inheritance", "", file)` -- the local
   module directory is a junction, so the file appears under `module/blank-inheritance/storage/`.
6. **Clean up what a test writes:** a Save writes `storage/location-edit-*.json`, which `npm run locations`
   would later pull into real data. Delete test records, and the session autosave, afterwards.

## 12. The Story tab: the episodes and haunts, scene by scene (2026-10-01)

Ingram, after the editor worked: *"The ideal way for it to work would be tied very closely to the Episodes and Haunts
structure so that I can look down a list and see where each scene per episode would be in order, see any gaps, be
quickly able to see what it thinks the current scene location is and easily be able to reassign the building or draw a
new building or map point for it to happen in. The same for haunts. This would be my primary way to use the interface
since it focuses me towards the things that are most important. We need a nice expanding accordion list so that an
episode can be collapsed or expanded to show all its scenes/locations. We need to account for places where players
have options to go to multiple places."* The panel now opens on this list; the drawing tools are the second tab
("Map tools").

**What it shows.** An accordion: one group per Episode (in play order), one for the Haunts, and one for anything the
Scene Set builds that no episode lists. Each scene is a row in play order with its day and quarter, its status, and a
**place chip** saying where it happens (or "No place yet", in red). Open a scene to see: its **rooms** (the sub-scenes
of the Scene Set), the **options the players choose between** under the question they are asked ("Where do you spend
the night?", with the muster that follows), and its **travel points** (where the party stands when the scene opens and
closes). A haunt also shows every option, in any scene's departure, that offers it. A header line counts what is
missing; **"Only what needs a place"** filters to the gaps. What is open is remembered in this browser.

**Where each place lives** (core/siting.mjs, read straight from the deployed data, never copied): a scene's place is
`scenes[id].locationRef` in `scene-set.json`; an option is `outro.departure.destinations[id].placeRef` (or the `then`
muster, or a departure-level `placeRef`) in the scene brief; a travel point is `intro|outro.position.locationRef` in the
brief. Nothing invents a slot: a scene that wrote no travel points is not given any.

**Gaps.** A scene with no place; a place that names a location that does not exist; an option or travel point left
empty; an episode scene with no Foundry scene yet. A deliberately off-map scene (the view from above) is shown
"Off the map" and is not a gap. A proposal flagged `approximate` is shown amber.

**Changing a place.** Click the target icon on a row, then: **Pick on the map** (the next click on a building or pin;
Shift-click takes the area), **Draw a building** or **Drop a pin** (over to Map tools with the right tool; Save, and the
placement step comes up on the Story tab, naming the drawing by the record that drew it, since it has no id until the
pull), search by name, or **No place**. Nothing is written yet: a confirm card shows what it is now, the **other places
that agree with it today** (a haunt's place is also in its brief's travel points and in the option that offers it,
ticked by default; a sibling room that agrees is listed unticked), and an optional "why here". Only Save placement
writes: one `"site"` record per slot. The chip then shows the new place marked *waiting* until the pull. A chip is also
the "show me" button: it outlines the place on the map in magenta, labels it and brings the camera to it.

**The records and the pull.** A `"site"` record (`core/location-editor.mjs`) carries `target`, `locationId` *or*
`viaRecord`, `before` (or `beforeVia`, when what the editor saw was itself a drawing not yet pulled) and an optional
`note`. `npm run locations` applies it (`tools/location-sync/siting.mjs`): the scene-set entry, or the scene brief
(**the canon copy when the brief has one, with the `data/scene-briefs` copy rewritten to match**, because `story check`
fails if they differ; the pull prints which canon scenes changed, and one that Ingram had approved needs her read
again). If the repo's slot is no longer what the editor saw, nothing is written and the pull reports a clash. Placing a
scene clears `approximate` and replaces `locationNote` (her reason if she gave one, otherwise a plain line saying what
changed) so the file never describes a place the scene no longer has. Results go in the ledger
(`data/campaign/location-edits.json`, now with a schema), and a placement that could not be applied is shown on the
Story tab. **Found while building it:** The Paper Lantern's travel points name a location that does not exist yet and
the scene itself has no place; it is the one real gap in the campaign today.

**Tests:** `test/tier1-siting.test.mjs` (the model, the story as lines, the records, and the real campaign),
`test/location-sync/siting.test.mjs` (the apply, against scratch data), the Story section of
`test/tier3-location-editor-contract.test.mjs`, focus/assign in `test/tier4-location-draw-layer.test.mjs`. Driven live
with real pointer events: accordion, search, pick-on-map by a real click, draw-then-place, a second change chaining.

### 12.1 Off the map: scenes that need no place (2026-10-01)

A scene may honestly have no place on the Campaign Map. In the Story tab, editing a scene's own place offers **Off the map...**,
which lists eighteen reasons (`OFF_MAP_REASONS` in `core/siting.mjs`): a view from above, in transit, everywhere, separate
places, players choose, remote (call/message/broadcast), virtual, memory, vision, off-world, another map, at sea, underground,
unknown, everyone knows it as, within a parent place, out of character, abstract. Choosing one stages a confirm card and writes
one `"site"` record with `offMap: "<reason id>"` and `locationId: null`. Only scene places can be off-map, not destinations or
travel points. Apply writes `offMap: {reason}` on the `scene-set.json` entry (and clears `approximate`); setting a real place
removes it. The sign-off Place pass and board accept an `offMap.reason` as sited. Verified live 2026-10-01 on "From Up Here".

## 13. Real buildings: seen, picked for a scene, adopted (2026-10-05)

Ingram, using the Story tab: *"It isn't showing me the GIS outlines of real buildings, I cannot adopt a real building by selecting it in this
way. I try and use 'Change where this happens' and it makes me select an area or district, not a building and the GIS outlines of real
buildings aren't even visible when selecting. Sometimes I might WANT to select an area but when choosing a scene thing it's going to be a
building or map pin."* Three faults, one cause: the editor drew only the 237 locations that already exist, so a real building was
invisible, and a click on one found the district round it (the pick fell back to "anything visible"). §7 had always said the buildings
index was needed; it had not been built.

- **The data.** `python tools/location-sync/export_buildings.py` (`--check`, `--stats`): every building of the store (`kurose.gpkg`)
  whose middle is on the content of the map image and on **land by the painted map** (`landmask.py`: the coastline is authored, not OSM's, so a
  building OSM puts on the airport that is under the sea here is not offered), as its outer ring in the map image's own pixels, integer and
  delta-coded, with its kind, name (if the map names it), area and the store's stable id. 55,509 buildings (36,062 non-buildings, 50,475
  off the map, 2,803 at sea, 420 sheds dropped), 3.6 MB; a deterministic file. `SYNCED_MAP_FILES` ships it. It needs `shapely`, `pyproj`
  and `numpy` (`python -m pip install shapely pyproj numpy`).
- **Seen.** On activation the layer loads it (`loadBuildings`, a state if the file is missing, never a throw) and draws the footprints in view as
  faint blue outlines under everything else: for a box a quarter-screen wider than the view, else for the view, else the largest 6,000
  (the panel says "zoom in"); redrawn when the view leaves the drawn box or the zoom changes. A panel switch, **Real buildings of the map**,
  hides them (a waiting pick shows them regardless).
- **Picked for a scene.** "Change where this happens" > "Pick on the map" now has two targets, shown beside it: **Buildings and pins**
  (the default) and **Areas**. Buildings and pins takes a place that already exists (a site or pin), else a **real building**; it never takes a
  district. Areas takes a district only. Shift takes the other for one click, so an area is one gesture away when wanted, and a click on ground
  with nothing of the target says what to do. The outlines re-dim so what can be picked is what is bright; hovering a real building names it
  ("click to adopt as a new place").
- **Adopted.** A real building picked for a scene (or clicked in **Places mode** with the pick tool, where it used to open the district) becomes
  a new draft **site** whose outline is the footprint exactly, named from the map if the map names it, noted ("A real building of the map
  (footprint N m2, store id ...), adopted as it stands"), selected, with the usual depth and shape advice. From the Story tab the panel moves
  to the map tab with the banner "Drawing a place for ...": Save writes the same `create` record a drawn building does, and the Story tab then asks
  to confirm putting the scene there (a `viaRecord` placement), so nothing about applying it changed. Adopting the same footprint twice finds the
  first; its loose outline is not drawn over the draft.
- **Checks.** `test/tier1-buildings-index.test.mjs` (the file's format, the grid, the smallest-footprint and slop rules, adopting),
  `test/tier2-buildings-index-corpus.test.mjs` (the real file), the new cases in `test/tier4-location-draw-layer.test.mjs` (the layer against its
  PIXI stand-in: drawn, switched, picked by either target, adopted, hover, pan and zoom), `test/location-sync/test_export_buildings.py`
  (a tiny GeoPackage with the real georeference), and **`tools/location-sync/foundry-buildings-check.mjs`**, in the real Foundry with real mouse
  events: the buildings are on the hub, Pick on the map takes a real building (exact footprint, named, noted), Save and confirm work, and Areas can
  be chosen on purpose (16/16 on 2026-10-05).
- **Found while doing it, not fixed:** the editor's `layer.activate()` makes Foundry's own `SceneControls#activate` throw ("reading
  'querySelector'") in this adventure's world, where the left-hand scene controls are not on screen. It predates this work and the editor
  works regardless.
