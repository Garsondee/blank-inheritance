<script lang="ts">
  // Map-editor plan Phase 3: MapLibre + Svelte shell over the live tile
  // server (Phase 2), real feature selection with an inspector panel.
  //
  // The backdrop is a single ImageSource (the whole frame, one render at
  // z=0) positioned by its real 4 corners -- see api/main.py's /api/frame
  // and its comment on why this needs no Mercator-tile-warping math at
  // all: rotation is a property of how the raster PICTURE is drawn on the
  // page, never of a feature's real geographic position, so the rotated
  // backdrop and the true-lon/lat vector overlay align correctly once
  // both are placed at their real coordinates. A true multi-zoom tile
  // pyramid wired into MapLibre's own RasterTileSource (matching Phase
  // 2's z/x/y server) is a real follow-up, not done here -- MapLibre's
  // RasterTileSource assumes standard Web Mercator tiling, and this
  // frame's tiles are not Mercator-projected (see the research this phase
  // was built from). ImageSource sidesteps that entirely for now; Phase 3's
  // actual goal (select a feature, see its info) doesn't need it solved.
  //
  // Worker setup -- fetch the real worker script's source, patch out
  // Vite's dev-mode-only injected boilerplate, and hand maplibre-gl a
  // blob: URL built from the patched text.
  //
  // `?worker&url` (imported here, not via svelte-maplibre-gl's own /vite
  // helper -- that helper does the identical import from INSIDE a
  // dependency, where esbuild's pre-bundler tries to statically resolve
  // it and fails; the same import from app source is not a pre-bundling
  // target and works cleanly) gets a real, separately-built worker script
  // URL.
  //
  // Two real, DEV-MODE-ONLY problems were found here, in order, each
  // confirmed with a minimal repro before being treated as the cause
  // (2026-08-25):
  //
  // 1. The fetched worker script's text starts with Vite's own HMR-client
  //    injection, `import {...} from "/@vite/client"` -- Vite injects this
  //    into every module it serves in dev, including this one. A
  //    root-relative import specifier like that fails to resolve from
  //    inside a worker constructed from a `blob:` URL (confirmed: `await
  //    import('/@vite/client')` inside a blob-sourced worker throws
  //    `TypeError: Failed to resolve module specifier '/@vite/client'` --
  //    a blob's module base has no real path to resolve a root-relative
  //    specifier against). That failure aborts the ENTIRE worker script's
  //    evaluation, so none of the real MapLibre worker logic after it
  //    ever runs either -- explaining every downstream symptom this bug
  //    produced (GeoJSON tiling/indexing happens in the worker;
  //    TerraDraw/feature layers registered data internally but never
  //    painted, `sourcedata` never fired, `map.loaded()` stayed `false`
  //    forever). Switching to a REAL (non-blob) worker URL sidesteps this
  //    specific failure -- but see #2, that alone isn't reliable either.
  //
  // 2. Even from a real URL, actually running Vite's injected HMR client
  //    INSIDE a worker (rather than failing to import it at all) is
  //    itself unreliable -- confirmed directly: repeated full page loads
  //    with only fix #1 applied left `isStyleLoaded()` stuck `false`
  //    forever, with ZERO `error`/`styledata`/`load` events ever firing,
  //    on a majority of real reloads (not consistently reproducible
  //    stuck-vs-not, but stuck often enough to be unusable). The HMR
  //    client's own top-level code opens a real `new WebSocket(...)` for
  //    hot-reload notifications -- a worker has no legitimate use for
  //    that, and doing it anyway is the likely source of the
  //    intermittent hang, though the exact browser-internal mechanism
  //    wasn't isolated further once a reliable fix was in hand.
  //
  // The real fix addresses both: fetch the worker script's text (same
  // technique this file always used), strip Vite's injected first line
  // (its HMR-client + env.mjs imports) so that code never runs at all --
  // replacing its one real call site, `__vite__injectQuery(url, 'import')`
  // (used by a rare dynamic-worker-source-loading path this app never
  // exercises), with a same-behavior-for-our-purposes no-op stub -- and
  // rewrite any OTHER root-relative import in the remaining text (the
  // worker's own real, necessary cross-chunk import of
  // `maplibre-gl-shared.mjs`, an artifact of Vite dev mode's own
  // dependency pre-bundling) to a fully-qualified same-origin URL, since
  // an absolute URL resolves correctly from inside a blob even though a
  // root-relative one doesn't. Confirmed reliable across repeated full
  // page reloads after this fix (`isStyleLoaded()`/`loaded()` both
  // `true`, real features rendering via `queryRenderedFeatures`), unlike
  // the real-URL-only version above. The production BUILD was never
  // affected by either problem -- `vite build` never injects an HMR
  // client into any served file, and produces one self-contained worker
  // file with no cross-chunk imports at all -- so this patching is a
  // no-op there in practice (the regex simply finds nothing to rewrite);
  // it isn't dev-mode-conditional code, just code that happens to have
  // nothing to do outside dev mode.
  import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
  import * as maplibregl from "maplibre-gl";
  import {
    MapLibre,
    ImageSource,
    RasterLayer,
    GeoJSONSource,
    FillLayer,
    LineLayer,
    CircleLayer,
  } from "svelte-maplibre-gl";
  import {
    TerraDraw,
    TerraDrawSelectMode,
    TerraDrawPolygonMode,
    TerraDrawLineStringMode,
    TerraDrawPointMode,
  } from "terra-draw";
  import { TerraDrawMapLibreGLAdapter } from "terra-draw-maplibre-gl-adapter";
  import type { Polygon, LineString, Point } from "geojson";
  import {
    metresPerPixel,
    shouldQueryFeatures,
    formatHiddenBanner,
    ZOOM_IN_TO_SELECT_MESSAGE,
  } from "./lib/core/lod";
  import { styleForFeature } from "./lib/core/style";
  import {
    terraDrawModeForGeometryType,
    formatNearbyTerrainWarning,
    formatRepairNotice,
    formatClearedNotice,
    formatEditError,
    formatConnectivityNotice,
    roundCoordinatesToPrecision,
  } from "./lib/core/edit";
  import { ROAD_RAIL_CLASSES, BUILDING_PRESETS } from "./lib/core/toolbarConfig";
  import type { ToolbarButtonConfig } from "./lib/core/toolbarConfig";
  import {
    featureIdsTouchedByRect,
    rectFromPoints,
    type FeatureSegments,
    type Point as MarqueePoint,
  } from "./lib/core/marquee";
  // `Point` clashes with geojson's own Point type (already imported above)
  // -- aliased, not renamed at the source, since snap.ts's Point is a
  // plain pixel-space {x,y}, a genuinely different concept from a GeoJSON
  // Point geometry, not a duplicate import of the same thing.
  import {
    extractMidpoints,
    extractRoadJunctions,
    extractSegments,
    extractVertices,
    pickSnapPosition,
    referenceCoordinateForOrtho,
    type Point as SnapPoint,
  } from "./lib/core/snap";
  import InspectorPanel from "./lib/ui/InspectorPanel.svelte";
  import ToolbarButton from "./lib/ui/ToolbarButton.svelte";

  let workerReady = $state(false);
  let workerError: string | null = $state(null);

  $effect(() => {
    fetch(maplibreWorkerUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText} fetching worker script`);
        return r.text();
      })
      .then((code) => {
        // Only DEV mode's text actually starts with this exact injected
        // preamble -- gating on its real presence (not just "slice at the
        // first newline") matters because a PRODUCTION build's worker is
        // one giant minified line whose own first `\n` falls INSIDE its
        // license comment, nowhere near the real code; blindly slicing
        // there once corrupted production's real `(function(){...}` IIFE
        // wrapper (caught directly: a production preview reload got stuck
        // at `isStyleLoaded()===false` forever after that bug, the exact
        // symptom this whole fix exists to prevent).
        const viteInjectionPrefix = /^import\s*\{[^}]*\}\s*from\s*"\/@vite\/client";?[^\n]*\n/;
        const withoutViteInjection = code.replace(viteInjectionPrefix, "");
        // `__vite__injectQuery` is Vite's dev-mode helper for rewriting a
        // dynamic import's URL -- the ONE real call site left in this
        // text is a worker-side dynamic-source-loading path this app
        // never exercises, so returning the id unchanged is safe. Declaring
        // it unconditionally is harmless in production too: nothing there
        // references it (the injected import that would have is gone).
        const withoutRootRelativeImports = withoutViteInjection.replace(
          /from\s*"(\/[^"]+)"/g,
          (_match, path) => `from "${location.origin}${path}"`,
        );
        const patched = `const __vite__injectQuery = (id) => id;\n${withoutRootRelativeImports}`;
        const blob = new Blob([patched], { type: "text/javascript" });
        maplibregl.setWorkerUrl(URL.createObjectURL(blob));
        workerReady = true;
      })
      .catch((e) => {
        workerError = String(e);
      });
  });

  // Hoisted to a MODULE-LEVEL constant, not an inline object literal in the
  // template -- an inline `style={{...}}` would be a brand-new object on
  // every reactive re-render (e.g. every zoom/center/features update),
  // which made MapLibre's own style-change $effect treat it as a new style
  // to load on every tick and never settle into isStyleLoaded()===true.
  // A stable reference is required, not just a stable value.
  const BLANK_STYLE: maplibregl.StyleSpecification = { version: 8, sources: {}, layers: [] };

  interface FrameInfo {
    centerLon: number;
    centerLat: number;
    extentM: number;
    // Always exactly [NW, NE, SE, SW] -- api/main.py's /api/frame's own
    // documented, fixed order for ImageSource.coordinates -- a real 4-tuple
    // type here (not [number, number][]) is what makes it assignable to
    // ImageSource's coordinates prop without a cast.
    cornersLonLat: [[number, number], [number, number], [number, number], [number, number]];
    backdropUrl: string;
  }

  let frameInfo: FrameInfo | null = $state(null);
  let loadError: string | null = $state(null);

  let map: maplibregl.Map | undefined = $state();
  let zoom = $state(15);
  let center: { lng: number; lat: number } = $state({ lng: 135.205, lat: 34.678 });

  // The backdrop is a single raster image fetched ONCE at load
  // (frameInfo.backdropUrl never changes on its own) -- every edit tool
  // already invalidates the SERVER'S tile cache and re-renders, but the
  // frontend previously had no way to know to re-fetch the image it's
  // already displaying, so a real edit (terrace, reclaim, a new road, an
  // array of buildings, a causeway, a vertex drag, an undo -- anything
  // that changes what render_tile draws) was server-side correct but
  // produced NO visible change at all. This counter is appended as a
  // cache-busting query param and bumped once per completed edit
  // (refreshBackdrop, called alongside refreshFeatures at every commit
  // site) so the <ImageSource> below gets a genuinely new url and
  // MapLibre re-fetches -- never on a plain pan/zoom (handleMoveEnd only
  // calls refreshFeatures/refreshGhostLines), since re-fetching the whole
  // backdrop on every pan would be wasteful and visibly janky.
  let backdropVersion = $state(0);
  // Set once a real render_and_cache_tile call at RENDER_PX/RENDER_SUPERSAMPLE
  // has actually completed server-side (see renderHighQuality below) --
  // null means "show the cheap always-on backdrop," a real url means "show
  // that specific, already-rendered high-quality picture instead." Cleared
  // back to null by every refreshBackdrop() call -- once ANY edit happens,
  // a stashed high-res render is stale (it doesn't reflect that edit), and
  // continuing to show it would silently misrepresent the map's current
  // state as more polished/up to date than it actually is.
  let highResBackdropUrl: string | null = $state(null);
  function refreshBackdrop() {
    backdropVersion += 1;
    highResBackdropUrl = null;
  }
  const backdropUrlWithVersion = $derived.by(() => {
    if (highResBackdropUrl) return highResBackdropUrl;
    const info = frameInfo;
    return info ? `${info.backdropUrl}&v=${backdropVersion}` : "";
  });

  // Direct user request, 2026-08-25: "press a button and re-render the
  // image... It's very low resolution" -- the always-on backdrop stays at
  // DEFAULT_TILE_PX (cheap, so editing stays snappy after every single
  // action), but this is a deliberately slow, deliberately explicit,
  // on-demand upgrade to the real ceiling the backend now allows
  // (api/main.py's own `px` Query bound, raised from 2048 to 4096 for
  // exactly this). Confirmed directly against real production data: a
  // genuinely fresh render at this resolution+supersample takes on the
  // order of two minutes, not seconds -- `renderingHighRes` exists so the
  // UI can say so honestly instead of looking stuck.
  const RENDER_PX = 4096;
  const RENDER_SUPERSAMPLE = 2;
  let renderingHighRes = $state(false);
  let renderError: string | null = $state(null);

  async function renderHighQuality() {
    if (!frameInfo || renderingHighRes) return;
    renderingHighRes = true;
    renderError = null;
    try {
      const url = `/tiles/0/0/0.png?px=${RENDER_PX}&supersample=${RENDER_SUPERSAMPLE}&v=${backdropVersion}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        renderError = `Couldn't render: ${resp.status} ${resp.statusText}`;
        return;
      }
      // The real render is already complete and cached server-side by the
      // time this fetch resolves -- swapping the ImageSource to this exact
      // url next means MapLibre's own fetch for it is a cache hit, not a
      // second multi-minute wait.
      highResBackdropUrl = url;
    } catch (e) {
      renderError = `Couldn't render: ${String(e)}`;
    } finally {
      renderingHighRes = false;
    }
  }

  let featuresGeojson: GeoJSON.FeatureCollection = $state({ type: "FeatureCollection", features: [] });
  let hiddenByLod = $state(0);
  let hiddenByCap = $state(0);
  // Phase 14: a plain click still replaces this with a one-element array
  // (unchanged common-case behavior) -- a marquee drag (see
  // handleMapMouseUp below) can populate it with more than one.
  let selectedFeatures: GeoJSON.Feature[] = $state([]);

  // Phase 14: marquee multi-select. Screen-space pixel points (maplibregl's
  // own MapMouseEvent.point), gated behind Shift+drag -- a plain drag must
  // stay map-panning, the gesture this whole app is built around; MapLibre
  // has no built-in way to tell "drag to pan" and "drag to marquee-select"
  // apart other than a modifier key, since both start from the identical
  // mousedown/mousemove/mouseup sequence. dragPan is explicitly disabled
  // for the duration of a marquee drag (re-enabled on mouseup) so the map
  // doesn't shift underneath the selection rectangle mid-gesture.
  let marqueeStart: { x: number; y: number } | null = $state(null);
  let marqueeCurrent: { x: number; y: number } | null = $state(null);
  const MARQUEE_CLICK_THRESHOLD_PX = 4; // below this, a Shift+drag that barely
                                        // moved is treated as a plain
                                        // deselect-click, not a 1px marquee.

  // Phase 14: Union (boolean ops, union-only for v1).
  let unioningFeatures = $state(false);
  let unionError: string | null = $state(null);
  let unionNotice: string | null = $state(null);

  // Phase 4: direct vertex editing. `terraDraw` and `editingTerraDrawId` are
  // plain (non-reactive) bookkeeping, never read from the template -- only
  // the $state fields below drive UI. TerraDraw owns its OWN feature store,
  // separate from featuresGeojson; editingTerraDrawId is the id TerraDraw
  // assigned when we loaded the feature into it (its default idStrategy
  // expects ids it recognises, not necessarily our own ids.py-derived
  // ones), so every read-back goes through THAT id, while every PATCH/undo
  // call to our own backend uses editingFeatureId (our real feature id).
  let terraDraw: TerraDraw | undefined;
  let editingTerraDrawId: string | number | null = null;
  let editingFeatureId: string | null = $state(null);
  let hasUnsavedChanges = $state(false);
  let saving = $state(false);
  let saveError: string | null = $state(null);
  let saveNotice: string | null = $state(null);
  let deletingFeature = $state(false);

  // Phase 6/13: drawing a brand new road/rail/building-preset feature, via
  // one of the 27 direct-draw toolbar buttons (core/toolbarConfig.ts).
  // Separate from the edit-an-existing-feature state above (isEditing/
  // editingFeatureId) -- there is no selected feature while drawing, and
  // the two flows are mutually exclusive (guarded in startFeatureButton/
  // startEdit below) since they'd otherwise fight over the one TerraDraw
  // instance. `activeFeatureButton` replaces Phase 6's original single
  // `isDrawingRoad` flag -- every one of the 27 buttons shares this same
  // state, parameterized by WHICH config is active, rather than needing
  // its own near-duplicate isDrawingX flag.
  let activeFeatureButton: ToolbarButtonConfig | null = $state(null);
  let creatingFeature = $state(false);
  let featureError: string | null = $state(null);
  let featureNotice: string | null = $state(null);

  // Phase 7: terracing. Drawing the OUTLINE is a TerraDraw polygon session,
  // same shape as road-drawing -- but unlike a road (which only needs a
  // highway tag), a terrace needs real numeric parameters, so `finish`
  // here captures the drawn geometry into terraceOutlineGeojson and shows
  // a form INSTEAD of posting immediately. Keeping the outline around
  // (rather than discarding it on a validation error) means a bad
  // inset/blend combination only costs the user a parameter tweak, not a
  // full re-draw.
  let isDrawingTerrace = $state(false);
  let terraceOutlineGeojson: GeoJSON.Polygon | null = $state(null);
  let terraceForm = $state({
    baseElevationM: 0,
    tiers: 3,
    stepHeightM: 2,
    insetM: 15,
    blendM: 5,
    mode: "fill" as "fill" | "cut",
  });
  let creatingTerrace = $state(false);
  let terraceError: string | null = $state(null);
  let terraceNotice: string | null = $state(null);

  // Phase 8: wall on foundation. Same outline-then-form shape as terracing
  // above -- a wall needs a terrace's full parameter set PLUS wall
  // thickness/height, so this gets its own outline/form state rather than
  // growing terraceForm with fields only some callers care about (and
  // risking the two flows' state bleeding into each other, the same reason
  // isDrawingRoad/isDrawingTerrace never shared state either).
  let isDrawingFoundation = $state(false);
  let foundationOutlineGeojson: GeoJSON.Polygon | null = $state(null);
  let foundationForm = $state({
    baseElevationM: 0,
    tiers: 3,
    stepHeightM: 2,
    insetM: 15,
    blendM: 5,
    mode: "fill" as "fill" | "cut",
    wallThicknessM: 3,
    wallHeightM: 5,
  });
  let creatingFoundation = $state(false);
  let foundationError: string | null = $state(null);
  let foundationNotice: string | null = $state(null);

  // Phase 9: parametric arrays. TWO drawn shapes, not one -- a baseline
  // LINE (any LineString: trace along an existing road with snapping on,
  // draw a fresh line, or trace a ghost-line offset -- the backend doesn't
  // care which, see array_place.py's own module docstring) AND a unit
  // FOOTPRINT polygon (the "building" repeated along it). isDrawingArray
  // is a 3-state flag rather than a boolean for exactly this reason: the
  // shared `finish` listener below needs to know WHICH of the two shapes
  // just finished, to capture it into the right variable and chain
  // straight into the second draw step rather than stopping after one.
  let isDrawingArray: false | "baseline" | "footprint" = $state(false);
  let arrayBaselineGeojson: GeoJSON.LineString | null = $state(null);
  let arrayFootprintGeojson: GeoJSON.Polygon | null = $state(null);
  let arrayForm = $state({
    spacingM: 20,
    unitHeightM: 5,
    buildingType: "yes",
    orientationOffsetDeg: 0,
    skipAccessRoad: false,
  });
  let creatingArray = $state(false);
  let arrayError: string | null = $state(null);
  let arrayNotice: string | null = $state(null);

  // Phase 10: reclaim land from the sea. Same outline-then-form shape as
  // terrace/foundation -- one drawn polygon, then real parameters.
  let isDrawingReclaim = $state(false);
  let reclaimOutlineGeojson: GeoJSON.Polygon | null = $state(null);
  let reclaimForm = $state({ freeboardM: 4, blendM: 8 });
  let creatingReclaim = $state(false);
  let reclaimError: string | null = $state(null);
  let reclaimNotice: string | null = $state(null);

  // Phase 10: return land to the sea -- reclaim's explicit inverse, same
  // outline-then-form shape. No freeboard parameter (target is always sea
  // level) and no landFeature in the response -- see return_to_sea.py's own
  // docstring for why deleting whatever sits on the flooded land is a
  // separate, composable action (the real DELETE /api/features/{id}), not
  // something this tool does silently.
  let isDrawingReturnToSea = $state(false);
  let returnToSeaOutlineGeojson: GeoJSON.Polygon | null = $state(null);
  let returnToSeaForm = $state({ blendM: 8 });
  let creatingReturnToSea = $state(false);
  let returnToSeaError: string | null = $state(null);
  let returnToSeaNotice: string | null = $state(null);

  // Phase 10: causeway routing. A single drawn POINT (TerraDrawPointMode,
  // already registered in the shared instance below for Phase 4's own
  // point-geometry editing support) -- the backend routes FROM it to the
  // nearest real road, crossing water via a real bridge span when needed.
  let isDrawingCauseway = $state(false);
  let causewayStartGeojson: GeoJSON.Point | null = $state(null);
  let causewayForm = $state({ highwayClass: "service" });
  let creatingCauseway = $state(false);
  let causewayError: string | null = $state(null);
  let causewayNotice: string | null = $state(null);

  // Phase 12: Clear Ground. Same outline-then-form shape as reclaim/
  // terrace/foundation, but this tool writes nothing new -- it only clears
  // existing features substantially contained in the drawn outline (see
  // api/cleanup.py's own docstring). Exists so the ~15 reclaims already
  // made this session (before reclaim/terrace/foundation started clearing
  // automatically) can be cleaned up retroactively, or any other messy
  // spot cleaned up on demand.
  let isDrawingCleanup = $state(false);
  let cleanupOutlineGeojson: GeoJSON.Polygon | null = $state(null);
  let cleanupForm = $state({ thresholdFraction: 0.75 });
  let creatingCleanup = $state(false);
  let cleanupError: string | null = $state(null);
  let cleanupNotice: string | null = $state(null);

  const isEditing = $derived(editingFeatureId !== null);

  // A single source of truth for "is some OTHER tool already mid-flight,"
  // replacing 8 separately hand-maintained OR-chains (one per start*
  // function) that had already missed a real case: they each listed every
  // isDrawingX flag but never checked a tool's own leftover OUTLINE state
  // (e.g. terraceOutlineGeojson sitting there with its form still open,
  // waiting on Save/Discard, after isDrawingTerrace itself has already
  // gone back to false). That gap meant you actually could start editing a
  // building's vertices, or start drawing a road, while an earlier tool's
  // parameter form was still open -- two tool-forms (or a form and the
  // vertex editor) rendered at once, the same root cause as the banner
  // overlap fixed alongside this (see resetToolBanners below).
  const anyToolOutlineArmed = $derived(
    terraceOutlineGeojson !== null ||
      foundationOutlineGeojson !== null ||
      arrayBaselineGeojson !== null ||
      arrayFootprintGeojson !== null ||
      reclaimOutlineGeojson !== null ||
      returnToSeaOutlineGeojson !== null ||
      causewayStartGeojson !== null ||
      cleanupOutlineGeojson !== null,
  );
  const anyToolActive = $derived(
    isEditing ||
      activeFeatureButton !== null ||
      isDrawingTerrace ||
      isDrawingFoundation ||
      isDrawingArray !== false ||
      isDrawingReclaim ||
      isDrawingReturnToSea ||
      isDrawingCauseway ||
      isDrawingCleanup ||
      anyToolOutlineArmed,
  );

  // While editing, hide the feature from our OWN GeoJSONSource -- TerraDraw
  // renders its own editable copy via its adapter's layers, and showing
  // both at once would double-render the same shape.
  const displayedFeatures = $derived(
    editingFeatureId
      ? {
          type: "FeatureCollection" as const,
          features: featuresGeojson.features.filter((f) => f.properties?.id !== editingFeatureId),
        }
      : featuresGeojson,
  );

  // Phase 5: snapping + ghost lines. Candidate LISTS (lon/lat) are derived
  // from data that's already loaded for other reasons (featuresGeojson,
  // ghostLinesGeojson) -- cheap to recompute on every change since they're
  // plain array extractions, no network/geometry work. Projecting them to
  // PIXEL space happens fresh on every snap callback invocation instead
  // (see snapToCustom below), because pixel position depends on the
  // CURRENT map view, which candidate lon/lat does not.
  let ghostLinesGeojson: GeoJSON.FeatureCollection = $state({ type: "FeatureCollection", features: [] });
  let seaGeojson: GeoJSON.FeatureCollection = $state({ type: "FeatureCollection", features: [] });

  /** The fast/quick-viewing tier: each feature gets a real, core/style.ts
   * -derived fill/line color and a real-world line width converted to the
   * CURRENT view's pixels-per-metre, attached as plain GeoJSON properties
   * so the paint expressions below can just `["get", "displayFillColor"]`
   * rather than re-deriving style client-side in the template. Recomputed
   * whenever the underlying features change OR the view zooms/pans --
   * zoom genuinely matters here (unlike displayedFeatures above), since a
   * road's real-world width in PIXELS changes as you zoom, the same way
   * the real raster render's own road widths do (style.py's
   * road_width_px). This is what makes an edit's result visible the
   * instant the feature list updates, without waiting on the slow "real"
   * backdrop re-render this app also still triggers (refreshBackdrop) --
   * see this session's own fix for why that backdrop alone was never
   * enough to show a delete/reclaim/etc. taking effect quickly. */
  const styledFeatures = $derived.by(() => {
    const mpp = metresPerPixel(zoom, center.lat);
    return {
      type: "FeatureCollection" as const,
      features: displayedFeatures.features.map((f) => {
        const tags = (f.properties?.tags ?? {}) as Record<string, string>;
        const isArea = Boolean(f.properties?.isArea);
        const heightM = (f.properties?.heightM as number) ?? 0;
        const id = String(f.properties?.id ?? "");
        const style = styleForFeature(tags, isArea, heightM, id);
        return {
          ...f,
          properties: {
            ...f.properties,
            displayFillColor: style.fillColor,
            displayLineColor: style.lineColor,
            displayLineWidthPx: style.lineWidthM > 0 ? Math.max(0.5, style.lineWidthM / mpp) : 0,
          },
        };
      }),
    };
  });
  // Phase 14: the selection highlight layer's own source data -- just
  // `selectedFeatures` wrapped as a FeatureCollection, no styling logic of
  // its own (the highlight layer's paint is a flat color, not per-feature).
  const selectionGeojson = $derived({
    type: "FeatureCollection" as const,
    features: selectedFeatures,
  });

  let gridSnapEnabled = $state(false);
  let orthoSnapEnabled = $state(false);

  const SNAP_TOLERANCE_PX = 12;
  const GRID_SPACING_M = 1.0;
  const ORTHO_STEP_DEG = 22.5; // matches this project's OLD Leaflet editor's
                               // own established default (subsumes 45/90
                               // as exact multiples while allowing
                               // in-between angles) -- see snap.ts's own
                               // snapToOrtho doc comment for why the
                               // distance-preservation behaviour matters.

  const candidateVertices = $derived(extractVertices(displayedFeatures.features));
  const candidateJunctions = $derived(extractRoadJunctions(displayedFeatures.features));
  const candidateMidpoints = $derived(extractMidpoints(displayedFeatures.features));
  const candidateSegments = $derived(extractSegments(displayedFeatures.features));
  const candidateGhostSegments = $derived(extractSegments(ghostLinesGeojson.features));

  /** Terra Draw's own Snapping.toCustom extension point -- real, built-in
   * (node_modules/terra-draw/dist/common.d.ts's SnapToCustom type), not a
   * reimplementation of what TerraDraw's toLine/toCoordinate already do
   * (those only snap against terraDraw's OWN in-memory store, which never
   * holds the other 230k real map features -- this callback is what makes
   * snapping see the REAL, already-loaded map data instead). Runs on every
   * pointer move during a drag, so every candidate is projected to pixel
   * space fresh here rather than cached -- see the state comment above for
   * why that's deliberate, not a missed optimisation.
   */
  function snapToCustom(
    event: { lng: number; lat: number },
    context: {
      currentCoordinate?: number;
      getCurrentGeometrySnapshot: () => Polygon | LineString | null;
      project: (lng: number, lat: number) => { x: number; y: number };
      unproject: (x: number, y: number) => { lng: number; lat: number };
    },
  ): [number, number] | undefined {
    const cursorPx: SnapPoint = context.project(event.lng, event.lat);
    const projectPairs = (pairs: [[number, number], [number, number]][]): [SnapPoint, SnapPoint][] =>
      pairs.map(([a, b]) => [context.project(a[0], a[1]), context.project(b[0], b[1])]);

    let orthoOpt: { referencePx: SnapPoint; stepDeg: number } | undefined;
    if (orthoSnapEnabled && context.currentCoordinate !== undefined) {
      const geom = context.getCurrentGeometrySnapshot();
      if (geom) {
        const ref = referenceCoordinateForOrtho(geom as any, context.currentCoordinate);
        if (ref) orthoOpt = { referencePx: context.project(ref[0], ref[1]), stepDeg: ORTHO_STEP_DEG };
      }
    }

    const result = pickSnapPosition(
      cursorPx,
      {
        vertices: candidateVertices.map(([lon, lat]) => context.project(lon, lat)),
        junctions: candidateJunctions.map(([lon, lat]) => context.project(lon, lat)),
        midpoints: candidateMidpoints.map(([lon, lat]) => context.project(lon, lat)),
        ghostLines: projectPairs(candidateGhostSegments),
        segments: projectPairs(candidateSegments),
      },
      {
        tolerancePx: SNAP_TOLERANCE_PX,
        // Anchored at the frame's own centre, not (0,0) lon/lat (which is
        // real open ocean off West Africa, an arbitrary, precision-poor
        // choice this map has no relationship to) -- any fixed anchor
        // produces a mathematically valid lattice, but the frame centre is
        // a stable, in-region point this map actually cares about.
        grid:
          gridSnapEnabled && frameInfo
            ? {
                originPx: context.project(frameInfo.centerLon, frameInfo.centerLat),
                spacingPx: GRID_SPACING_M / metresPerPixel(zoom, center.lat),
              }
            : undefined,
        ortho: orthoOpt,
      },
    );
    if (!result) return undefined;
    const lonlat = context.unproject(result.point.x, result.point.y);
    return [lonlat.lng, lonlat.lat];
  }

  // Direct user feedback: the default vertex/coordinate-point circles read
  // as much too large for placing or dragging fine detail, and every mode
  // shared one generic cursor regardless of what a click would actually
  // do. Shrunk here rather than left at TerraDraw's own defaults (sized
  // for a typical low-precision sketch tool, not this app's real-world-
  // scale editing); reused across every draw/select mode's own point
  // styling knobs so a vertex looks and behaves consistently whether it's
  // being placed on a brand-new shape or dragged on an existing one.
  const SMALL_POINT_STYLE = {
    pointWidth: 3,
    pointOutlineWidth: 1,
    pointOutlineColor: "#ffffff" as const,
  };
  const DRAWING_CURSORS = { start: "crosshair" as const, close: "crosshair" as const };

  $effect(() => {
    if (!map || terraDraw) return;
    const adapter = new TerraDrawMapLibreGLAdapter({ map });
    const instance = new TerraDraw({
      adapter,
      modes: [
        // snapping here (unlike select mode's per-coordinate flag) is a
        // top-level mode option -- TerraDrawLineStringModeOptions.snapping
        // -- reusing the exact same snapToCustom callback Phase 5 already
        // built for editing: the priority system doesn't care whether a
        // vertex is being dragged on an existing feature or placed while
        // drawing a brand new one.
        new TerraDrawPolygonMode({
          snapping: { toCustom: snapToCustom },
          cursors: DRAWING_CURSORS,
          styles: {
            coordinatePointWidth: SMALL_POINT_STYLE.pointWidth,
            coordinatePointOutlineWidth: SMALL_POINT_STYLE.pointOutlineWidth,
            coordinatePointOutlineColor: SMALL_POINT_STYLE.pointOutlineColor,
            closingPointWidth: SMALL_POINT_STYLE.pointWidth,
            closingPointOutlineWidth: SMALL_POINT_STYLE.pointOutlineWidth,
            snappingPointWidth: SMALL_POINT_STYLE.pointWidth,
            editedPointWidth: SMALL_POINT_STYLE.pointWidth,
          },
        }),
        new TerraDrawLineStringMode({
          snapping: { toCustom: snapToCustom },
          cursors: DRAWING_CURSORS,
          styles: {
            coordinatePointWidth: SMALL_POINT_STYLE.pointWidth,
            coordinatePointOutlineWidth: SMALL_POINT_STYLE.pointOutlineWidth,
            coordinatePointOutlineColor: SMALL_POINT_STYLE.pointOutlineColor,
            closingPointWidth: SMALL_POINT_STYLE.pointWidth,
            snappingPointWidth: SMALL_POINT_STYLE.pointWidth,
          },
        }),
        new TerraDrawPointMode({
          cursors: { create: "crosshair" },
          styles: {
            pointWidth: SMALL_POINT_STYLE.pointWidth,
            pointOutlineWidth: SMALL_POINT_STYLE.pointOutlineWidth,
            pointOutlineColor: SMALL_POINT_STYLE.pointOutlineColor,
          },
        }),
        new TerraDrawSelectMode({
          cursors: {
            pointerOverFeature: "pointer",
            pointerOverCoordinate: "crosshair",
            dragStart: "crosshair",
            dragEnd: "pointer",
          },
          styles: {
            selectionPointWidth: SMALL_POINT_STYLE.pointWidth,
            selectionPointOutlineWidth: SMALL_POINT_STYLE.pointOutlineWidth,
            selectionPointOutlineColor: SMALL_POINT_STYLE.pointOutlineColor,
            selectedPointWidth: SMALL_POINT_STYLE.pointWidth + 1,
            selectedPointOutlineWidth: SMALL_POINT_STYLE.pointOutlineWidth,
            selectedPointOutlineColor: SMALL_POINT_STYLE.pointOutlineColor,
            midPointWidth: SMALL_POINT_STYLE.pointWidth - 1,
            midPointOutlineWidth: SMALL_POINT_STYLE.pointOutlineWidth,
          },
          flags: {
            polygon: {
              feature: {
                draggable: false,
                coordinates: {
                  draggable: true,
                  deletable: true,
                  midpoints: true,
                  snappable: { toCustom: snapToCustom },
                },
              },
            },
            linestring: {
              feature: {
                draggable: false,
                coordinates: {
                  draggable: true,
                  deletable: true,
                  midpoints: true,
                  snappable: { toCustom: snapToCustom },
                },
              },
            },
            // Point mode has no `coordinates` config (a single-point
            // feature moves via feature.draggable, not a per-coordinate
            // drag) -- Terra Draw's own Snapping hook only exists on
            // `coordinates.snappable`, so a whole-point drag genuinely
            // cannot snap through this API surface. Not a gap this app is
            // missing; a real limitation of TerraDraw's select mode itself.
            point: { feature: { draggable: true } },
          },
        }),
      ],
    });
    instance.on("change", (ids) => {
      if (editingTerraDrawId !== null && ids.includes(editingTerraDrawId)) {
        hasUnsavedChanges = true;
      }
    });
    instance.on("finish", (id) => {
      if (activeFeatureButton) handleFeatureButtonDrawFinish(id);
      if (isDrawingTerrace) handleTerraceDrawFinish(id);
      if (isDrawingFoundation) handleFoundationDrawFinish(id);
      if (isDrawingArray === "baseline") handleArrayBaselineDrawFinish(id);
      if (isDrawingArray === "footprint") handleArrayFootprintDrawFinish(id);
      if (isDrawingReclaim) handleReclaimDrawFinish(id);
      if (isDrawingReturnToSea) handleReturnToSeaDrawFinish(id);
      if (isDrawingCauseway) handleCausewayDrawFinish(id);
      if (isDrawingCleanup) handleCleanupDrawFinish(id);
    });
    terraDraw = instance;
    return () => {
      instance.stop();
    };
  });

  // terraDrawModeForGeometryType (core/edit.ts, tested) is the single
  // source of truth for which geometry types this editor supports editing
  // -- this is a pure TS-level narrowing companion so TerraDraw's own
  // GeoJSONStoreGeometries (Polygon | LineString | Point only, no
  // MultiPolygon/GeometryCollection/...) type-checks against a real
  // GeoJSON.Geometry without an unchecked cast.
  function asEditableGeometry(geometry: GeoJSON.Geometry): Polygon | LineString | Point | null {
    if (geometry.type === "Polygon" || geometry.type === "LineString" || geometry.type === "Point") {
      return geometry;
    }
    return null;
  }

  // Every function below that touches `terraDraw` is wrapped in try/catch,
  // deliberately -- TerraDraw's own methods (start/addFeatures/
  // getSnapshotFeature/...) call straight into MapLibre APIs like
  // map.addSource(), which THROW synchronously if the map's style isn't
  // loaded yet (a real MapLibre contract, not a TerraDraw quirk: found via
  // direct testing here -- "Style is not done loading" from
  // GeoJSONSource.addSource inside TerraDraw.start()'s own registration).
  // A slow/interrupted style load is a real, if rare, thing that can
  // happen in any browser (a bad connection, a backgrounded tab throttled
  // by the OS) -- it must surface as saveError, never as an uncaught
  // exception that leaves the Save/Cancel buttons stuck with no
  // explanation.
  /** Called at the start of every tool-starting action (a fresh draw, or
   * vertex editing) -- clears every OTHER tool's leftover notice/error so
   * at most one is ever visible at once. Every one of these banners
   * renders at the SAME fixed on-screen position (see the .banner CSS
   * below); without this, a tool's success/error notice stayed on screen
   * indefinitely (nothing ever cleared it except starting that SAME tool
   * again), so doing two different actions in one session -- draw a road,
   * then reclaim some land, say -- left both notices simultaneously
   * truthy, rendering directly on top of each other. That's the illegible
   * overlap this was seen doing. Paired with anyToolActive above, which
   * covers the other half of the same root cause (a tool's leftover
   * OUTLINE/form state, not just its notice, blocking or double-rendering
   * against a later tool). */
  function resetToolBanners() {
    saveError = null;
    saveNotice = null;
    featureError = null;
    featureNotice = null;
    terraceError = null;
    terraceNotice = null;
    foundationError = null;
    foundationNotice = null;
    arrayError = null;
    arrayNotice = null;
    reclaimError = null;
    reclaimNotice = null;
    returnToSeaError = null;
    returnToSeaNotice = null;
    causewayError = null;
    causewayNotice = null;
    cleanupError = null;
    cleanupNotice = null;
  }

  function startEdit() {
    // Vertex-editing has no defined meaning for a multi-selection -- gated
    // to exactly one selected feature (InspectorPanel's own "Edit vertices"
    // button is already hidden for a multi-select, this is the second,
    // authoritative guard).
    if (!terraDraw || selectedFeatures.length !== 1 || anyToolActive) return;
    const selectedFeature = selectedFeatures[0];
    const rawGeometry = asEditableGeometry(selectedFeature.geometry);
    const mode = terraDrawModeForGeometryType(selectedFeature.geometry.type);
    const featureId = selectedFeature.properties?.id as string | undefined;
    if (!mode || !rawGeometry || !featureId) return;
    // Every real feature's geometry has already been reprojected
    // (SOURCE CRS -> WGS84) server-side, which leaves full float64
    // precision noise well past TerraDraw's own default
    // `coordinatePrecision` (9) -- confirmed directly that without this,
    // `addFeatures()` below rejects EVERY real production feature
    // outright ("Feature has coordinates with excessive precision"),
    // making "Edit vertices" silently impossible. See core/edit.ts's own
    // docstring on roundCoordinatesToPrecision.
    const geometry = roundCoordinatesToPrecision(rawGeometry);

    resetToolBanners();
    hasUnsavedChanges = false;

    try {
      terraDraw.start();
      terraDraw.setMode(mode);
      const [result] = terraDraw.addFeatures([{ type: "Feature", geometry, properties: { mode } }]);
      if (!result || result.valid === false || result.id === undefined) {
        saveError = formatEditError("save", "couldn't start editing this shape");
        terraDraw.stop();
        return;
      }
      editingTerraDrawId = result.id;
      editingFeatureId = featureId;
      terraDraw.setMode("select");
      terraDraw.selectFeature(result.id);
    } catch (e) {
      saveError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
    }
  }

  function stopEdit() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      // Reset OUR state regardless -- a broken TerraDraw internal state
      // must not leave the Save/Cancel UI stuck forever.
      saveError = formatEditError("save", String(e));
    }
    editingTerraDrawId = null;
    editingFeatureId = null;
    hasUnsavedChanges = false;
  }

  function cancelEdit() {
    stopEdit();
  }

  /** Delete every currently-selected feature outright -- a real, missing
   * gap: every prior phase built ways to CREATE or EDIT a feature, but
   * removing an unwanted one (an existing building, a sea fort, an array
   * instance) had no UI action at all. Fully undoable via the existing
   * Ctrl+Z path (api/edits.py's DELETE route reuses gpkg.delete_feature,
   * already logged/reversible since Phase 6) -- no new undo risk here.
   *
   * Phase 14: generalized from one feature to N sequential single-deletes
   * (N separate undo steps for v1, not one batch) -- a deliberate,
   * documented judgment call in the map-editor plan: this could reuse
   * Phase 12's batch-delete plumbing later if separate undo steps prove
   * annoying in practice, but a plain loop is the simplest thing that
   * works today. Stops on the first failure -- whatever was already
   * deleted stays deleted (each one is its own real, already-committed
   * undo step), rather than leaving the caller unsure what succeeded. */
  async function deleteSelectedFeature() {
    const idsToDelete = selectedFeatures
      .map((f) => f.properties?.id as string | undefined)
      .filter((id): id is string => Boolean(id));
    if (idsToDelete.length === 0) return;
    deletingFeature = true;
    saveError = null;
    try {
      for (const featureId of idsToDelete) {
        const resp = await fetch(`/api/features/${featureId}`, { method: "DELETE" });
        const body = await resp.json().catch(() => null);
        if (!resp.ok) {
          saveError = formatEditError("delete", body?.detail ?? `${resp.status} ${resp.statusText}`);
          return;
        }
      }
      selectedFeatures = [];
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      saveError = formatEditError("delete", String(e));
    } finally {
      deletingFeature = false;
    }
  }

  async function saveEdit() {
    if (!terraDraw || editingTerraDrawId === null || !editingFeatureId) return;

    saving = true;
    saveError = null;
    try {
      const current = terraDraw.getSnapshotFeature(editingTerraDrawId);
      if (!current) {
        saveError = formatEditError("save", "the edited shape is gone");
        return;
      }
      const resp = await fetch(`/api/features/${editingFeatureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geometry: current.geometry }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        saveError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      const notices = [
        formatRepairNotice(body.repaired),
        formatNearbyTerrainWarning(body.nearbyTerrainEditIds ?? []),
      ].filter((n): n is string => n !== null);
      saveNotice = notices.length > 0 ? notices.join(" · ") : null;
      selectedFeatures = [body.feature];
      stopEdit();
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      saveError = formatEditError("save", String(e));
    } finally {
      saving = false;
    }
  }

  function startFeatureButton(config: ToolbarButtonConfig) {
    if (!terraDraw || anyToolActive) return;
    const mode = terraDrawModeForGeometryType(config.geometryType);
    if (!mode) return;
    resetToolBanners();
    try {
      terraDraw.start();
      terraDraw.setMode(mode);
      activeFeatureButton = config;
    } catch (e) {
      featureError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
      activeFeatureButton = null;
    }
  }

  function cancelFeatureButton() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      featureError = formatEditError("save", String(e));
    }
    activeFeatureButton = null;
  }

  /** Fires once the user finishes drawing (double-click / Enter, or a
   * single click for a Point mode -- none of today's 27 buttons use Point,
   * but terraDrawModeForGeometryType already supports it) -- registered on
   * the shared TerraDraw instance in the setup $effect above, guarded
   * there by `activeFeatureButton` so it never fires for anything except
   * an active startFeatureButton() session. One shared handler for all 27
   * buttons, parameterized by the config captured when drawing started --
   * replaces Phase 6's single-purpose handleRoadDrawFinish. */
  async function handleFeatureButtonDrawFinish(terraDrawId: string | number) {
    if (!terraDraw || !activeFeatureButton) return;
    const config = activeFeatureButton;
    activeFeatureButton = null;
    creatingFeature = true;
    featureError = null;
    try {
      const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
      if (!drawnFeature) {
        featureError = formatEditError("save", `the drawn ${config.label.toLowerCase()} is gone`);
        return;
      }
      const resp = await fetch("/api/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geometry: drawnFeature.geometry,
          tags: config.tags,
          isArea: config.isArea,
          heightM: config.heightM,
        }),
      });
      const body = await resp.json().catch(() => null);
      terraDraw.clear();
      terraDraw.stop();
      if (!resp.ok) {
        featureError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      const notices = [formatRepairNotice(body.repaired), formatConnectivityNotice(body.connectivity)].filter(
        (n): n is string => n !== null,
      );
      featureNotice = notices.length > 0 ? notices.join(" · ") : null;
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      featureError = formatEditError("save", String(e));
    } finally {
      creatingFeature = false;
    }
  }

  function startDrawTerrace() {
    if (!terraDraw || anyToolActive) return;
    resetToolBanners();
    try {
      terraDraw.start();
      terraDraw.setMode("polygon");
      isDrawingTerrace = true;
    } catch (e) {
      terraceError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
      isDrawingTerrace = false;
    }
  }

  function cancelDrawTerrace() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      terraceError = formatEditError("save", String(e));
    }
    isDrawingTerrace = false;
    terraceOutlineGeojson = null;
  }

  /** Fires once the user finishes drawing the outline -- captures the
   * geometry and shows the parameter form INSTEAD of posting immediately
   * (see terraceForm's own state comment for why). TerraDraw's own
   * drawing session is torn down right away either way; the outline lives
   * on afterward only as plain terraceOutlineGeojson. */
  function handleTerraceDrawFinish(terraDrawId: string | number) {
    if (!terraDraw) return;
    isDrawingTerrace = false;
    terraceError = null;
    const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
    try {
      terraDraw.clear();
      terraDraw.stop();
    } catch (e) {
      terraceError = formatEditError("save", String(e));
      return;
    }
    if (!drawnFeature || drawnFeature.geometry.type !== "Polygon") {
      terraceError = formatEditError("save", "the drawn outline is gone");
      return;
    }
    terraceOutlineGeojson = drawnFeature.geometry as GeoJSON.Polygon;
  }

  async function submitTerrace() {
    if (!terraceOutlineGeojson) return;
    creatingTerrace = true;
    terraceError = null;
    try {
      const resp = await fetch("/api/terrace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline: terraceOutlineGeojson,
          baseElevationM: terraceForm.baseElevationM,
          tiers: terraceForm.tiers,
          stepHeightM: terraceForm.stepHeightM,
          insetM: terraceForm.insetM,
          blendM: terraceForm.blendM,
          mode: terraceForm.mode,
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Deliberately keep terraceOutlineGeojson around on failure -- a
        // bad inset/blend combination should cost the user a parameter
        // tweak, not a full re-draw of the outline.
        terraceError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      const terraceBaseNotice = formatRepairNotice(body.repaired)
        ?? `Terraced: ${body.terrainEditIds.length} tier${body.terrainEditIds.length === 1 ? "" : "s"}, ${body.riserFeatures.length} riser${body.riserFeatures.length === 1 ? "" : "s"}`;
      const terraceClearedClause = formatClearedNotice(body.clearedFeatureIds?.length ?? 0);
      terraceNotice = terraceClearedClause ? `${terraceBaseNotice} · ${terraceClearedClause}` : terraceBaseNotice;
      terraceOutlineGeojson = null;
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      terraceError = formatEditError("save", String(e));
    } finally {
      creatingTerrace = false;
    }
  }

  function startDrawFoundation() {
    if (!terraDraw || anyToolActive) return;
    resetToolBanners();
    try {
      terraDraw.start();
      terraDraw.setMode("polygon");
      isDrawingFoundation = true;
    } catch (e) {
      foundationError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
      isDrawingFoundation = false;
    }
  }

  function cancelDrawFoundation() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      foundationError = formatEditError("save", String(e));
    }
    isDrawingFoundation = false;
    foundationOutlineGeojson = null;
  }

  /** Fires once the user finishes drawing the outline -- same
   * capture-then-show-a-form shape as handleTerraceDrawFinish (Phase 7):
   * a wall-on-foundation needs real numeric parameters too, so posting
   * immediately isn't an option here either. */
  function handleFoundationDrawFinish(terraDrawId: string | number) {
    if (!terraDraw) return;
    isDrawingFoundation = false;
    foundationError = null;
    const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
    try {
      terraDraw.clear();
      terraDraw.stop();
    } catch (e) {
      foundationError = formatEditError("save", String(e));
      return;
    }
    if (!drawnFeature || drawnFeature.geometry.type !== "Polygon") {
      foundationError = formatEditError("save", "the drawn outline is gone");
      return;
    }
    foundationOutlineGeojson = drawnFeature.geometry as GeoJSON.Polygon;
  }

  async function submitFoundation() {
    if (!foundationOutlineGeojson) return;
    creatingFoundation = true;
    foundationError = null;
    try {
      const resp = await fetch("/api/wall-on-foundation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline: foundationOutlineGeojson,
          baseElevationM: foundationForm.baseElevationM,
          tiers: foundationForm.tiers,
          stepHeightM: foundationForm.stepHeightM,
          insetM: foundationForm.insetM,
          blendM: foundationForm.blendM,
          mode: foundationForm.mode,
          wallThicknessM: foundationForm.wallThicknessM,
          wallHeightM: foundationForm.wallHeightM,
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Deliberately keep foundationOutlineGeojson around on failure --
        // same reasoning as submitTerrace: a bad parameter combination
        // should cost a tweak, not a full re-draw of the outline.
        foundationError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      const foundationBaseNotice = formatRepairNotice(body.repaired)
        ?? `Foundation built: ${body.terrainEditIds.length} tier${body.terrainEditIds.length === 1 ? "" : "s"}, ${body.riserFeatures.length} riser${body.riserFeatures.length === 1 ? "" : "s"}, ${body.wallFeatures.length} wall segment${body.wallFeatures.length === 1 ? "" : "s"}`;
      const foundationClearedClause = formatClearedNotice(body.clearedFeatureIds?.length ?? 0);
      foundationNotice = foundationClearedClause ? `${foundationBaseNotice} · ${foundationClearedClause}` : foundationBaseNotice;
      foundationOutlineGeojson = null;
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      foundationError = formatEditError("save", String(e));
    } finally {
      creatingFoundation = false;
    }
  }

  function startDrawArray() {
    if (!terraDraw || anyToolActive) return;
    resetToolBanners();
    arrayBaselineGeojson = null;
    arrayFootprintGeojson = null;
    try {
      terraDraw.start();
      terraDraw.setMode("linestring");
      isDrawingArray = "baseline";
    } catch (e) {
      arrayError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
      isDrawingArray = false;
    }
  }

  function cancelDrawArray() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      arrayError = formatEditError("save", String(e));
    }
    isDrawingArray = false;
    arrayBaselineGeojson = null;
    arrayFootprintGeojson = null;
  }

  /** Fires when the FIRST of the array's two drawn shapes (the baseline
   * line) finishes -- captures it, then immediately chains into the
   * second draw session (the unit footprint polygon) rather than showing
   * the form yet. See isDrawingArray's own state comment for why this is
   * a 3-state flag, not a boolean. */
  function handleArrayBaselineDrawFinish(terraDrawId: string | number) {
    if (!terraDraw) return;
    const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
    try {
      terraDraw.clear();
      terraDraw.stop();
    } catch (e) {
      arrayError = formatEditError("save", String(e));
      isDrawingArray = false;
      return;
    }
    if (!drawnFeature || drawnFeature.geometry.type !== "LineString") {
      arrayError = formatEditError("save", "the drawn baseline is gone");
      isDrawingArray = false;
      return;
    }
    arrayBaselineGeojson = drawnFeature.geometry as GeoJSON.LineString;

    try {
      terraDraw.start();
      terraDraw.setMode("polygon");
      isDrawingArray = "footprint";
    } catch (e) {
      arrayError = formatEditError("save", String(e));
      isDrawingArray = false;
    }
  }

  /** Fires when the SECOND drawn shape (the unit footprint) finishes --
   * captures it and shows the parameter form, same outline-then-form
   * shape as terrace/foundation. */
  function handleArrayFootprintDrawFinish(terraDrawId: string | number) {
    if (!terraDraw) return;
    isDrawingArray = false;
    const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
    try {
      terraDraw.clear();
      terraDraw.stop();
    } catch (e) {
      arrayError = formatEditError("save", String(e));
      return;
    }
    if (!drawnFeature || drawnFeature.geometry.type !== "Polygon") {
      arrayError = formatEditError("save", "the drawn unit footprint is gone");
      return;
    }
    arrayFootprintGeojson = drawnFeature.geometry as GeoJSON.Polygon;
  }

  async function submitArray() {
    if (!arrayBaselineGeojson || !arrayFootprintGeojson) return;
    creatingArray = true;
    arrayError = null;
    try {
      const resp = await fetch("/api/array", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitFootprint: arrayFootprintGeojson,
          baseline: arrayBaselineGeojson,
          spacingM: arrayForm.spacingM,
          unitHeightM: arrayForm.unitHeightM,
          unitTags: { building: arrayForm.buildingType },
          orientationOffsetDeg: arrayForm.orientationOffsetDeg,
          skipAccessRoad: arrayForm.skipAccessRoad,
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Deliberately keep both drawn shapes around on failure -- same
        // reasoning as submitTerrace/submitFoundation: a bad spacing or
        // parameter choice should cost a tweak, not a full re-draw.
        arrayError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      const repairedParts = [
        body.baselineRepaired ? "baseline" : null,
        body.unitRepaired ? "unit footprint" : null,
      ].filter((p): p is string => p !== null);
      const placed = body.instanceFeatures.length;
      const skipped = body.skipped.length;
      arrayNotice = (repairedParts.length > 0 ? `Repaired self-crossing: ${repairedParts.join(", ")} · ` : "")
        + `Placed ${placed} instance${placed === 1 ? "" : "s"}`
        + (body.roadFeatures.length > 0 ? `, ${body.roadFeatures.length} access road${body.roadFeatures.length === 1 ? "" : "s"}` : "")
        + (skipped > 0 ? ` · ${skipped} skipped (footprint conflict)` : "");
      arrayBaselineGeojson = null;
      arrayFootprintGeojson = null;
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      arrayError = formatEditError("save", String(e));
    } finally {
      creatingArray = false;
    }
  }

  function startDrawReclaim() {
    if (!terraDraw || anyToolActive) return;
    resetToolBanners();
    try {
      terraDraw.start();
      terraDraw.setMode("polygon");
      isDrawingReclaim = true;
    } catch (e) {
      reclaimError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
      isDrawingReclaim = false;
    }
  }

  function cancelDrawReclaim() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      reclaimError = formatEditError("save", String(e));
    }
    isDrawingReclaim = false;
    reclaimOutlineGeojson = null;
  }

  function handleReclaimDrawFinish(terraDrawId: string | number) {
    if (!terraDraw) return;
    isDrawingReclaim = false;
    reclaimError = null;
    const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
    try {
      terraDraw.clear();
      terraDraw.stop();
    } catch (e) {
      reclaimError = formatEditError("save", String(e));
      return;
    }
    if (!drawnFeature || drawnFeature.geometry.type !== "Polygon") {
      reclaimError = formatEditError("save", "the drawn outline is gone");
      return;
    }
    reclaimOutlineGeojson = drawnFeature.geometry as GeoJSON.Polygon;
  }

  async function submitReclaim() {
    if (!reclaimOutlineGeojson) return;
    creatingReclaim = true;
    reclaimError = null;
    try {
      const resp = await fetch("/api/reclaim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline: reclaimOutlineGeojson,
          freeboardM: reclaimForm.freeboardM,
          blendM: reclaimForm.blendM,
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Deliberately keep reclaimOutlineGeojson around on failure -- same
        // reasoning as submitTerrace: a bad parameter choice should cost a
        // tweak, not a full re-draw of the outline.
        reclaimError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      const reclaimBaseNotice = formatRepairNotice(body.repaired) ?? "Reclaimed new land from the sea";
      const reclaimClearedClause = formatClearedNotice(body.clearedFeatureIds?.length ?? 0);
      reclaimNotice = reclaimClearedClause ? `${reclaimBaseNotice} · ${reclaimClearedClause}` : reclaimBaseNotice;
      reclaimOutlineGeojson = null;
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      reclaimError = formatEditError("save", String(e));
    } finally {
      creatingReclaim = false;
    }
  }

  function startDrawReturnToSea() {
    if (!terraDraw || anyToolActive) return;
    resetToolBanners();
    try {
      terraDraw.start();
      terraDraw.setMode("polygon");
      isDrawingReturnToSea = true;
    } catch (e) {
      returnToSeaError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
      isDrawingReturnToSea = false;
    }
  }

  function cancelDrawReturnToSea() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      returnToSeaError = formatEditError("save", String(e));
    }
    isDrawingReturnToSea = false;
    returnToSeaOutlineGeojson = null;
  }

  function handleReturnToSeaDrawFinish(terraDrawId: string | number) {
    if (!terraDraw) return;
    isDrawingReturnToSea = false;
    returnToSeaError = null;
    const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
    try {
      terraDraw.clear();
      terraDraw.stop();
    } catch (e) {
      returnToSeaError = formatEditError("save", String(e));
      return;
    }
    if (!drawnFeature || drawnFeature.geometry.type !== "Polygon") {
      returnToSeaError = formatEditError("save", "the drawn outline is gone");
      return;
    }
    returnToSeaOutlineGeojson = drawnFeature.geometry as GeoJSON.Polygon;
  }

  async function submitReturnToSea() {
    if (!returnToSeaOutlineGeojson) return;
    creatingReturnToSea = true;
    returnToSeaError = null;
    try {
      const resp = await fetch("/api/return-to-sea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline: returnToSeaOutlineGeojson,
          blendM: returnToSeaForm.blendM,
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Deliberately keep returnToSeaOutlineGeojson around on failure --
        // same reasoning as submitReclaim: a bad parameter choice should
        // cost a tweak, not a full re-draw of the outline.
        returnToSeaError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      returnToSeaNotice = formatRepairNotice(body.repaired) ?? "Returned that land to the sea";
      returnToSeaOutlineGeojson = null;
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      returnToSeaError = formatEditError("save", String(e));
    } finally {
      creatingReturnToSea = false;
    }
  }

  function startDrawCauseway() {
    if (!terraDraw || anyToolActive) return;
    resetToolBanners();
    try {
      terraDraw.start();
      terraDraw.setMode("point");
      isDrawingCauseway = true;
    } catch (e) {
      causewayError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
      isDrawingCauseway = false;
    }
  }

  function cancelDrawCauseway() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      causewayError = formatEditError("save", String(e));
    }
    isDrawingCauseway = false;
    causewayStartGeojson = null;
  }

  function handleCausewayDrawFinish(terraDrawId: string | number) {
    if (!terraDraw) return;
    isDrawingCauseway = false;
    causewayError = null;
    const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
    try {
      terraDraw.clear();
      terraDraw.stop();
    } catch (e) {
      causewayError = formatEditError("save", String(e));
      return;
    }
    if (!drawnFeature || drawnFeature.geometry.type !== "Point") {
      causewayError = formatEditError("save", "the placed point is gone");
      return;
    }
    causewayStartGeojson = drawnFeature.geometry as GeoJSON.Point;
  }

  async function submitCauseway() {
    if (!causewayStartGeojson) return;
    creatingCauseway = true;
    causewayError = null;
    try {
      const resp = await fetch("/api/causeway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startPoint: causewayStartGeojson,
          highwayClass: causewayForm.highwayClass,
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Deliberately keep causewayStartGeojson around on failure -- a
        // routing failure (no road in range, over the distance cap) should
        // cost a parameter tweak or a different point, not a full re-place.
        causewayError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      causewayNotice = `Routed ${body.lengthM.toFixed(0)}m causeway`
        + (body.crossesWater ? " (crosses water)" : "");
      causewayStartGeojson = null;
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      causewayError = formatEditError("save", String(e));
    } finally {
      creatingCauseway = false;
    }
  }

  function startDrawCleanup() {
    if (!terraDraw || anyToolActive) return;
    resetToolBanners();
    try {
      terraDraw.start();
      terraDraw.setMode("polygon");
      isDrawingCleanup = true;
    } catch (e) {
      cleanupError = formatEditError("save", String(e));
      try {
        terraDraw.stop();
      } catch {
        // Already in a bad state -- nothing more we can do to it.
      }
      isDrawingCleanup = false;
    }
  }

  function cancelDrawCleanup() {
    try {
      terraDraw?.clear();
      terraDraw?.stop();
    } catch (e) {
      cleanupError = formatEditError("save", String(e));
    }
    isDrawingCleanup = false;
    cleanupOutlineGeojson = null;
  }

  function handleCleanupDrawFinish(terraDrawId: string | number) {
    if (!terraDraw) return;
    isDrawingCleanup = false;
    cleanupError = null;
    const drawnFeature = terraDraw.getSnapshotFeature(terraDrawId);
    try {
      terraDraw.clear();
      terraDraw.stop();
    } catch (e) {
      cleanupError = formatEditError("save", String(e));
      return;
    }
    if (!drawnFeature || drawnFeature.geometry.type !== "Polygon") {
      cleanupError = formatEditError("save", "the drawn outline is gone");
      return;
    }
    cleanupOutlineGeojson = drawnFeature.geometry as GeoJSON.Polygon;
  }

  async function submitCleanup() {
    if (!cleanupOutlineGeojson) return;
    creatingCleanup = true;
    cleanupError = null;
    try {
      const resp = await fetch("/api/clear-ground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outline: cleanupOutlineGeojson,
          thresholdFraction: cleanupForm.thresholdFraction,
        }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        // Deliberately keep cleanupOutlineGeojson around on failure -- same
        // reasoning as submitReclaim: a bad threshold choice should cost a
        // tweak, not a full re-draw of the outline.
        cleanupError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      const clearedCount = body.clearedFeatureIds?.length ?? 0;
      const cleanupBaseNotice = clearedCount === 0
        ? "Nothing to clear in that outline"
        : `Cleared ${clearedCount} feature${clearedCount === 1 ? "" : "s"}`;
      cleanupNotice = formatRepairNotice(body.repaired) ?? cleanupBaseNotice;
      cleanupOutlineGeojson = null;
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      cleanupError = formatEditError("save", String(e));
    } finally {
      creatingCleanup = false;
    }
  }

  async function undo() {
    saveError = null;
    try {
      const resp = await fetch("/api/undo", { method: "POST" });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        saveError = formatEditError("undo", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      if (!body?.undone) return;
      saveNotice = `Undid the last edit (${body.featureIds.length} feature${body.featureIds.length === 1 ? "" : "s"})`;
      if (selectedFeatures.length > 0) {
        const deletedIds = new Set(body.deletedFeatureIds as string[]);
        const updatedById = new Map(
          (body.features as GeoJSON.Feature[]).map((f) => [f.properties?.id, f] as const),
        );
        selectedFeatures = selectedFeatures
          // undo reversed the CREATION of a currently-selected feature -- it
          // no longer exists, so showing it (with Save/Cancel controls for a
          // feature that isn't there) would be actively misleading.
          .filter((f) => !deletedIds.has(f.properties?.id as string))
          // a feature whose geometry the undo restored/changed -- refresh it
          // in place so the panel never shows stale coordinates.
          .map((f) => updatedById.get(f.properties?.id as string) ?? f);
      }
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      saveError = formatEditError("undo", String(e));
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !isEditing) {
      e.preventDefault();
      undo();
    }
    if (e.key === "Shift") shiftHeld = true;
  }

  function handleKeyup(e: KeyboardEvent) {
    if (e.key === "Shift") shiftHeld = false;
  }

  /** Phase 14: tracked PROACTIVELY (window-level keydown/keyup), not read
   * off the mousedown event itself -- confirmed directly that reading
   * ev.originalEvent.shiftKey at mousedown time and THEN calling
   * map.dragPan.disable() is too late: MapLibre's own internal DragPanHandler
   * is registered on the map's event bus at construction time, well before
   * this component's own onmousedown prop wiring, so it always processes
   * the identical mousedown first and had already begun panning by the time
   * our own handler ran. Tracking Shift state independently and reacting to
   * it BELOW (before any mousedown can occur) avoids the race entirely.
   *
   * boxZoom is disabled for the exact same reason, confirmed live: MapLibre
   * GL JS's OWN default interaction set already binds Shift+drag to its
   * BoxZoomHandler (zoom into the dragged rectangle) -- a direct collision
   * with this app's own choice of Shift+drag for marquee-select. Without
   * disabling it too, a marquee drag was silently hijacked into a real
   * zoom (confirmed: the map's zoom level jumped from 15 to ~21 mid-test),
   * never reaching handleMapMouseUp's own selection logic at all. */
  let shiftHeld = $state(false);
  $effect(() => {
    if (!map) return;
    if (shiftHeld || marqueeStart !== null) {
      map.dragPan.disable();
      map.boxZoom.disable();
    } else {
      map.dragPan.enable();
      map.boxZoom.enable();
    }
  });

  $effect(() => {
    fetch("/api/frame")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.json();
      })
      .then((info: FrameInfo) => {
        frameInfo = info;
        center = { lng: info.centerLon, lat: info.centerLat };
      })
      .catch((e) => {
        loadError = String(e);
      });
    refreshSea();
  });

  async function refreshFeatures() {
    if (!map) return;
    if (!shouldQueryFeatures(zoom)) {
      featuresGeojson = { type: "FeatureCollection", features: [] };
      hiddenByLod = 0;
      hiddenByCap = 0;
      return;
    }
    const bounds = map.getBounds();
    const mpp = metresPerPixel(zoom, center.lat);
    const params = new URLSearchParams({
      minLon: String(bounds.getWest()),
      minLat: String(bounds.getSouth()),
      maxLon: String(bounds.getEast()),
      maxLat: String(bounds.getNorth()),
      mpp: String(mpp),
    });
    try {
      const resp = await fetch(`/api/features?${params}`);
      if (!resp.ok) return;
      const data = await resp.json();
      featuresGeojson = data;
      hiddenByLod = data.hiddenByLod ?? 0;
      hiddenByCap = data.hiddenByCap ?? 0;
    } catch {
      // A transient fetch failure just leaves the previous viewport's
      // features on screen -- never worse than stale, never a crash.
    }
  }

  async function refreshGhostLines() {
    if (!map) return;
    // Same zoom gate as refreshFeatures -- ghost lines exist to help
    // close-up placement work, and are meaningless (and needlessly
    // expensive to compute over a huge viewport) at a zoomed-out overview.
    if (!shouldQueryFeatures(zoom)) {
      ghostLinesGeojson = { type: "FeatureCollection", features: [] };
      return;
    }
    const bounds = map.getBounds();
    const params = new URLSearchParams({
      minLon: String(bounds.getWest()),
      minLat: String(bounds.getSouth()),
      maxLon: String(bounds.getEast()),
      maxLat: String(bounds.getNorth()),
    });
    try {
      const resp = await fetch(`/api/ghost-lines?${params}`);
      if (!resp.ok) return;
      ghostLinesGeojson = await resp.json();
    } catch {
      // Same reasoning as refreshFeatures -- stale ghost lines, never a crash.
    }
  }

  /** GET /api/sea -- deliberately separate from refreshFeatures(): the sea
   * lives in the store's world_geom table, not the feature table
   * GET /api/features reads, so it needs its own fetch (see api/main.py's
   * get_sea docstring). Not zoom-gated the way features/ghost-lines are --
   * the sea is a single, cheap-to-transfer polygon regardless of viewport,
   * and the fast vector view wants it visible even zoomed out. */
  async function refreshSea() {
    try {
      const resp = await fetch("/api/sea");
      if (!resp.ok) return;
      const body = await resp.json();
      seaGeojson = body.feature
        ? { type: "FeatureCollection", features: [body.feature] }
        : { type: "FeatureCollection", features: [] };
    } catch {
      // Same reasoning as refreshFeatures -- stale sea shape, never a crash.
    }
  }

  function handleMoveEnd() {
    refreshFeatures();
    refreshGhostLines();
  }

  function handleFeatureClick(ev: maplibregl.MapLayerMouseEvent) {
    if (isEditing) return; // an active TerraDraw session owns selection until Save/Cancel
    const feature = ev.features?.[0];
    if (feature) selectedFeatures = [feature];
  }

  /** Every loaded feature's boundary, in SCREEN-SPACE pixels (map.project),
   * grouped by feature id -- what core/marquee.ts's featureIdsTouchedByRect
   * needs. Point geometries get a single zero-length "segment" at their own
   * projected position -- rectIntersectsSegment already handles a===b
   * correctly via its own point-in-rect check, so a lamp point is
   * marquee-selectable too, for free. */
  function buildScreenSegmentsForFeatures(features: GeoJSON.Feature[]): FeatureSegments[] {
    if (!map) return [];
    const currentMap = map;
    const project = (coord: number[]): MarqueePoint => {
      const p = currentMap.project(coord as [number, number]);
      return { x: p.x, y: p.y };
    };
    const addRing = (segments: [MarqueePoint, MarqueePoint][], ring: number[][]) => {
      for (let i = 0; i < ring.length - 1; i++) {
        segments.push([project(ring[i]), project(ring[i + 1])]);
      }
    };

    const result: FeatureSegments[] = [];
    for (const f of features) {
      const id = f.properties?.id as string | undefined;
      if (!id) continue;
      const segments: [MarqueePoint, MarqueePoint][] = [];
      const geom = f.geometry;
      if (geom.type === "Polygon") {
        for (const ring of geom.coordinates) addRing(segments, ring);
      } else if (geom.type === "MultiPolygon") {
        for (const poly of geom.coordinates) for (const ring of poly) addRing(segments, ring);
      } else if (geom.type === "LineString") {
        addRing(segments, geom.coordinates);
      } else if (geom.type === "MultiLineString") {
        for (const line of geom.coordinates) addRing(segments, line);
      } else if (geom.type === "Point") {
        const p = project(geom.coordinates);
        segments.push([p, p]);
      }
      if (segments.length > 0) result.push({ id, segments });
    }
    return result;
  }

  /** Phase 14: "if I drag click it should create a selection marquee" (the
   * user's own words). Gated behind Shift+drag -- a plain drag must stay
   * map-panning, the gesture this whole app is built around; MapLibre has
   * no way to tell "drag to pan" and "drag to marquee-select" apart other
   * than a modifier key, since both start from the identical mousedown/
   * mousemove/mouseup sequence. Declines to start at all if the initial
   * point already hit a feature -- that's a direct feature click (the
   * layer's own onclick, handleFeatureClick above), not a marquee. */
  function handleMapMouseDown(ev: maplibregl.MapMouseEvent) {
    // dragPan is already disabled reactively (see the $effect keyed on
    // shiftHeld above) by the time this fires, if shift was held before the
    // press -- no race against MapLibre's own internal DragPanHandler.
    if (anyToolActive || !shiftHeld || !map) return;
    const hitsFeature = map.queryRenderedFeatures(ev.point).some((f) => f.source === "features");
    if (hitsFeature) return;
    marqueeStart = { x: ev.point.x, y: ev.point.y };
    marqueeCurrent = marqueeStart;
  }

  function handleMapMouseMove(ev: maplibregl.MapMouseEvent) {
    if (!marqueeStart) return;
    marqueeCurrent = { x: ev.point.x, y: ev.point.y };
  }

  function handleMapMouseUp(ev: maplibregl.MapMouseEvent) {
    if (!marqueeStart || !map) return;
    const start = marqueeStart;
    const end = { x: ev.point.x, y: ev.point.y };
    marqueeStart = null;
    marqueeCurrent = null;

    if (Math.abs(end.x - start.x) < MARQUEE_CLICK_THRESHOLD_PX
      && Math.abs(end.y - start.y) < MARQUEE_CLICK_THRESHOLD_PX) {
      // A Shift+click that barely moved -- treated as "deselect everything,"
      // not a 1px marquee that could never touch anything anyway.
      selectedFeatures = [];
      return;
    }

    const rect = rectFromPoints(start, end);
    const perFeatureSegments = buildScreenSegmentsForFeatures(featuresGeojson.features);
    const touchedIds = featureIdsTouchedByRect(perFeatureSegments, rect);
    selectedFeatures = featuresGeojson.features.filter((f) => touchedIds.has(String(f.properties?.id ?? "")));
  }

  /** Phase 14: boolean operations, union-only for v1 (the user's own
   * explicit answer to that scope question). Merges every currently
   * selected feature into one via POST /api/union, which re-derives current
   * geometry from the store itself rather than trusting what this client
   * happens to have loaded. */
  async function handleUnion() {
    const featureIds = selectedFeatures
      .map((f) => f.properties?.id as string | undefined)
      .filter((id): id is string => Boolean(id));
    if (featureIds.length < 2) return;
    unioningFeatures = true;
    unionError = null;
    try {
      const resp = await fetch("/api/union", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featureIds }),
      });
      const body = await resp.json().catch(() => null);
      if (!resp.ok) {
        unionError = formatEditError("save", body?.detail ?? `${resp.status} ${resp.statusText}`);
        return;
      }
      unionNotice = body.becameMulti
        ? "Merged -- the inputs didn't overlap, so the result is a multi-part shape"
        : "Merged into one shape";
      selectedFeatures = [body.mergedFeature];
      await refreshFeatures();
      refreshBackdrop();
      refreshSea();
    } catch (e) {
      unionError = formatEditError("save", String(e));
    } finally {
      unioningFeatures = false;
    }
  }

  // TerraDraw's own `cursors` config (see the setup effect above) sets the
  // canvas cursor to crosshair while a mode is active, but never resets it
  // back on its own once that mode stops -- confirmed directly: cancelling
  // a draw left the cursor stuck on crosshair over the whole idle map,
  // never returning to the default hand/pointer behaviour. This effect is
  // the reset: it re-runs whenever anyToolActive flips back to false (a
  // cancel, a finish, an undo that clears editingFeatureId, ...) and hands
  // the cursor back to the map's own default styling.
  $effect(() => {
    if (!map || anyToolActive) return;
    map.getCanvas().style.cursor = "";
  });

  // A real "finger" (pointer) cursor over a selectable building/road, vs
  // the map's own default "hand" (grab) cursor everywhere else -- direct
  // user feedback that every mode sharing one generic cursor made it hard
  // to tell selecting, drawing, and panning apart. Only while nothing else
  // (a draw session, vertex editing) already owns the cursor -- TerraDraw's
  // own `cursors` config (see the setup effect above) takes over correctly
  // once one of those is active, and must not be fought with here.
  function handleFeatureMouseEnter() {
    if (!map || anyToolActive) return;
    map.getCanvas().style.cursor = "pointer";
  }
  function handleFeatureMouseLeave() {
    if (!map || anyToolActive) return;
    map.getCanvas().style.cursor = "";
  }

  const hiddenBanner = $derived(formatHiddenBanner({ hiddenByLod, hiddenByCap }));
  const tooFarOut = $derived(!shouldQueryFeatures(zoom));
</script>

<svelte:window onkeydown={handleKeydown} onkeyup={handleKeyup} />

<div class="root">
  {#if loadError}
    <div class="centered">Failed to load frame info from /api/frame: {loadError}</div>
  {:else if workerError}
    <div class="centered">Failed to load the MapLibre worker script: {workerError}</div>
  {:else if frameInfo && workerReady}
    <MapLibre
      bind:map
      bind:zoom
      bind:center
      style={BLANK_STYLE}
      class="map-container"
      autoloadCss={false}
      onmoveend={handleMoveEnd}
      onmousedown={handleMapMouseDown}
      onmousemove={handleMapMouseMove}
      onmouseup={handleMapMouseUp}
    >
      <ImageSource id="backdrop" url={backdropUrlWithVersion} coordinates={frameInfo.cornersLonLat}>
        <RasterLayer />
      </ImageSource>

      <!-- The fast/quick-viewing tier's own water fill -- see refreshSea()
           and core/style.ts. Drawn right above the raster backdrop (so it
           reads as "this area is water" immediately, without waiting on a
           real re-render) but below every editable feature layer. No
           onclick -- the sea isn't a selectable/editable Feature the way
           reclaim/return-to-sea's drawn OUTLINES are; it's a live view of
           current world_geom state only. -->
      <GeoJSONSource id="sea" data={seaGeojson}>
        <FillLayer paint={{ "fill-color": "rgb(150, 172, 183)" }} />
      </GeoJSONSource>

      <!-- Ghost lines (Phase 5): pure scaffolding, no onclick handler at
           all -- excluded from hit-testing by simply never being wired to
           handleFeatureClick, the same way this app already keeps the
           backdrop RasterLayer un-clickable. Rendered under the real
           features so a real building/road outline always reads on top. -->
      <GeoJSONSource id="ghost-lines" data={ghostLinesGeojson}>
        <LineLayer
          paint={{ "line-color": "#9a7ee0", "line-width": 1, "line-dasharray": [2, 2], "line-opacity": 0.6 }}
        />
      </GeoJSONSource>

      <!-- The fast/quick-viewing tier's own real-ish building/road/landuse
           fill (core/style.ts) -- the PRIMARY way an edit's result reads
           as visible right away (a deleted building actually disappearing,
           a new road actually appearing at its real width), decoupled from
           the slow "real" backdrop re-render (refreshBackdrop) this app
           still triggers for the polished raster (hillshade/shadows/paper
           texture/contours) that stays the real render's own job. -->
      <GeoJSONSource id="features" data={styledFeatures}>
        <FillLayer
          filter={["==", ["geometry-type"], "Polygon"]}
          paint={{ "fill-color": ["get", "displayFillColor"], "fill-opacity": 0.92 }}
          onclick={handleFeatureClick}
          onmouseenter={handleFeatureMouseEnter}
          onmouseleave={handleFeatureMouseLeave}
        />
        <LineLayer
          paint={{ "line-color": ["get", "displayLineColor"], "line-width": ["get", "displayLineWidthPx"] }}
          onclick={handleFeatureClick}
          onmouseenter={handleFeatureMouseEnter}
          onmouseleave={handleFeatureMouseLeave}
        />
        <CircleLayer
          filter={["==", ["geometry-type"], "Point"]}
          paint={{ "circle-color": "#ffb84a", "circle-radius": 4 }}
          onclick={handleFeatureClick}
          onmouseenter={handleFeatureMouseEnter}
          onmouseleave={handleFeatureMouseLeave}
        />
      </GeoJSONSource>

      <!-- Phase 14: the selection highlight -- confirmed nothing painted a
           selected feature differently at all before this. A dedicated
           layer/source (not a mutation of the `features` source's own paint
           expressions above) so selection state can be reasoned about and
           removed independently of base feature styling. Drawn LAST, after
           `features`, so a selected building/road's highlight always reads
           on top rather than under its neighbors. Not click-handled itself
           -- clicking a highlighted feature still goes through the real
           `features` layers underneath it. -->
      <GeoJSONSource id="selection" data={selectionGeojson}>
        <FillLayer
          filter={["==", ["geometry-type"], "Polygon"]}
          paint={{ "fill-color": "#ffe066", "fill-opacity": 0.25 }}
        />
        <LineLayer paint={{ "line-color": "#ffe066", "line-width": 3 }} />
      </GeoJSONSource>
    </MapLibre>

    {#if marqueeStart && marqueeCurrent}
      <!-- Phase 14: the marquee drag rectangle itself -- plain screen-space
           overlay, not a MapLibre layer/GeoJSON source. It's transient
           (gone the instant the mouse lifts) and screen-space only, so
           round-tripping it through a GeoJSON source would be pure
           overhead for no benefit. -->
      <div
        class="marquee-rect"
        style:left="{Math.min(marqueeStart.x, marqueeCurrent.x)}px"
        style:top="{Math.min(marqueeStart.y, marqueeCurrent.y)}px"
        style:width="{Math.abs(marqueeCurrent.x - marqueeStart.x)}px"
        style:height="{Math.abs(marqueeCurrent.y - marqueeStart.y)}px"
      ></div>
    {/if}

    {#if tooFarOut}
      <div class="banner">{ZOOM_IN_TO_SELECT_MESSAGE}</div>
    {:else if hiddenBanner}
      <div class="banner">{hiddenBanner}</div>
    {/if}

    <!-- Phase 6/7/8/9/10/12/13: draw a brand new road/rail/building-preset
         feature, terrace outline, wall-on-foundation outline, array
         baseline+footprint, reclaim outline, causeway start point, or
         clear-ground outline. A standalone toolbar, not part of
         InspectorPanel -- there is no selected feature while drawing. -->
    <div class="draw-toolbar">
      {#if activeFeatureButton}
        <button class="cancel" onclick={cancelFeatureButton}>Cancel drawing</button>
        <span class="draw-hint">
          {activeFeatureButton.geometryType === "Polygon"
            ? "Click to add points, double-click or Enter to close the outline"
            : "Click to add points, double-click or Enter to finish"}
        </span>
      {:else if isDrawingTerrace}
        <button class="cancel" onclick={cancelDrawTerrace}>Cancel drawing</button>
        <span class="draw-hint">Click to add points, double-click or Enter to close the outline</span>
      {:else if isDrawingFoundation}
        <button class="cancel" onclick={cancelDrawFoundation}>Cancel drawing</button>
        <span class="draw-hint">Click to add points, double-click or Enter to close the outline</span>
      {:else if isDrawingArray === "baseline"}
        <button class="cancel" onclick={cancelDrawArray}>Cancel drawing</button>
        <span class="draw-hint">Draw the baseline: click to add points, double-click or Enter to finish</span>
      {:else if isDrawingArray === "footprint"}
        <button class="cancel" onclick={cancelDrawArray}>Cancel drawing</button>
        <span class="draw-hint">Now draw ONE unit footprint -- double-click or Enter to close it</span>
      {:else if isDrawingReclaim}
        <button class="cancel" onclick={cancelDrawReclaim}>Cancel drawing</button>
        <span class="draw-hint">Click to add points, double-click or Enter to close the outline</span>
      {:else if isDrawingReturnToSea}
        <button class="cancel" onclick={cancelDrawReturnToSea}>Cancel drawing</button>
        <span class="draw-hint">Click to add points, double-click or Enter to close the outline</span>
      {:else if isDrawingCauseway}
        <button class="cancel" onclick={cancelDrawCauseway}>Cancel drawing</button>
        <span class="draw-hint">Click to place the causeway's starting point</span>
      {:else if isDrawingCleanup}
        <button class="cancel" onclick={cancelDrawCleanup}>Cancel drawing</button>
        <span class="draw-hint">Click to add points, double-click or Enter to close the outline</span>
      {:else if terraceOutlineGeojson}
        <span class="draw-hint">Outline drawn -- set parameters below</span>
      {:else if foundationOutlineGeojson}
        <span class="draw-hint">Outline drawn -- set parameters below</span>
      {:else if arrayFootprintGeojson}
        <span class="draw-hint">Baseline + footprint drawn -- set parameters below</span>
      {:else if reclaimOutlineGeojson}
        <span class="draw-hint">Outline drawn -- set parameters below</span>
      {:else if returnToSeaOutlineGeojson}
        <span class="draw-hint">Outline drawn -- set parameters below</span>
      {:else if causewayStartGeojson}
        <span class="draw-hint">Point placed -- set parameters below</span>
      {:else if cleanupOutlineGeojson}
        <span class="draw-hint">Outline drawn -- set parameters below</span>
      {:else}
        <div class="toolbar-section">
          <div class="toolbar-section-label">Roads &amp; Rail</div>
          <div class="toolbar-section-buttons">
            {#each ROAD_RAIL_CLASSES as config (config.key)}
              <ToolbarButton {config} disabled={isEditing || creatingFeature} onclick={() => startFeatureButton(config)} />
            {/each}
          </div>
        </div>
        <div class="toolbar-section">
          <div class="toolbar-section-label">Buildings</div>
          <div class="toolbar-section-buttons">
            {#each BUILDING_PRESETS as config (config.key)}
              <ToolbarButton {config} disabled={isEditing || creatingFeature} onclick={() => startFeatureButton(config)} />
            {/each}
          </div>
        </div>
        <div class="toolbar-section">
          <div class="toolbar-section-label">Terrain &amp; Land</div>
          <div class="toolbar-section-buttons">
            <button class="edit" onclick={startDrawTerrace} disabled={isEditing || creatingTerrace}>
              Draw terrace
            </button>
            <button class="edit" onclick={startDrawFoundation} disabled={isEditing || creatingFoundation}>
              Draw wall on foundation
            </button>
            <button class="edit" onclick={startDrawReclaim} disabled={isEditing || creatingReclaim}>
              Reclaim land
            </button>
            <button class="edit" onclick={startDrawReturnToSea} disabled={isEditing || creatingReturnToSea}>
              Return to sea
            </button>
            <button class="edit" onclick={startDrawCauseway} disabled={isEditing || creatingCauseway}>
              Draw causeway
            </button>
            <button class="edit" onclick={startDrawCleanup} disabled={isEditing || creatingCleanup}>
              Clear ground
            </button>
          </div>
        </div>
        <div class="toolbar-section">
          <div class="toolbar-section-label">Tools</div>
          <div class="toolbar-section-buttons">
            <button class="edit" onclick={startDrawArray} disabled={isEditing || creatingArray}>
              Draw array
            </button>
            <button class="render" onclick={renderHighQuality} disabled={isEditing || renderingHighRes}>
              {renderingHighRes ? "Rendering… (~2 min)" : "Render high quality"}
            </button>
          </div>
        </div>
      {/if}
    </div>
    {#if featureError}
      <div class="banner draw-error">{featureError}</div>
    {:else if featureNotice}
      <div class="banner draw-notice">{featureNotice}</div>
    {:else if renderError}
      <div class="banner draw-error">{renderError}</div>
    {/if}

    {#if terraceOutlineGeojson}
      <div class="tool-form">
        <div class="tool-form-title">Terrace parameters</div>
        <label>
          Base elevation (m)
          <input type="number" bind:value={terraceForm.baseElevationM} step="0.5" />
        </label>
        <label>
          Tiers
          <input type="number" bind:value={terraceForm.tiers} min="1" step="1" />
        </label>
        <label>
          Step height (m)
          <input type="number" bind:value={terraceForm.stepHeightM} min="0.1" step="0.5" />
        </label>
        <label>
          Inset per tier (m)
          <input type="number" bind:value={terraceForm.insetM} min="0.1" step="1" />
        </label>
        <label>
          Blend width (m)
          <input type="number" bind:value={terraceForm.blendM} min="0.1" step="0.5" />
        </label>
        <label>
          Mode
          <select bind:value={terraceForm.mode}>
            <option value="fill">Fill (rise)</option>
            <option value="cut">Cut (excavate)</option>
          </select>
        </label>
        <div class="tool-form-actions">
          <button class="save" onclick={submitTerrace} disabled={creatingTerrace}>
            {creatingTerrace ? "Creating…" : "Create terrace"}
          </button>
          <button class="cancel" onclick={cancelDrawTerrace} disabled={creatingTerrace}>Discard</button>
        </div>
      </div>
    {/if}
    {#if terraceError}
      <div class="banner draw-error">{terraceError}</div>
    {:else if terraceNotice}
      <div class="banner draw-notice">{terraceNotice}</div>
    {/if}

    {#if foundationOutlineGeojson}
      <div class="tool-form">
        <div class="tool-form-title">Wall on foundation parameters</div>
        <label>
          Base elevation (m)
          <input type="number" bind:value={foundationForm.baseElevationM} step="0.5" />
        </label>
        <label>
          Tiers
          <input type="number" bind:value={foundationForm.tiers} min="1" step="1" />
        </label>
        <label>
          Step height (m)
          <input type="number" bind:value={foundationForm.stepHeightM} min="0.1" step="0.5" />
        </label>
        <label>
          Inset per tier (m)
          <input type="number" bind:value={foundationForm.insetM} min="0.1" step="1" />
        </label>
        <label>
          Blend width (m)
          <input type="number" bind:value={foundationForm.blendM} min="0.1" step="0.5" />
        </label>
        <label>
          Mode
          <select bind:value={foundationForm.mode}>
            <option value="fill">Fill (rise)</option>
            <option value="cut">Cut (excavate)</option>
          </select>
        </label>
        <label>
          Wall thickness (m)
          <input type="number" bind:value={foundationForm.wallThicknessM} min="0.1" step="0.5" />
        </label>
        <label>
          Wall height (m)
          <input type="number" bind:value={foundationForm.wallHeightM} min="0.1" step="0.5" />
        </label>
        <div class="tool-form-actions">
          <button class="save" onclick={submitFoundation} disabled={creatingFoundation}>
            {creatingFoundation ? "Creating…" : "Build foundation"}
          </button>
          <button class="cancel" onclick={cancelDrawFoundation} disabled={creatingFoundation}>Discard</button>
        </div>
      </div>
    {/if}
    {#if foundationError}
      <div class="banner draw-error">{foundationError}</div>
    {:else if foundationNotice}
      <div class="banner draw-notice">{foundationNotice}</div>
    {/if}

    {#if arrayFootprintGeojson}
      <div class="tool-form">
        <div class="tool-form-title">Array parameters</div>
        <label>
          Spacing (m)
          <input type="number" bind:value={arrayForm.spacingM} min="0.1" step="1" />
        </label>
        <label>
          Unit height (m)
          <input type="number" bind:value={arrayForm.unitHeightM} min="0.1" step="0.5" />
        </label>
        <label>
          Building type
          <input type="text" bind:value={arrayForm.buildingType} />
        </label>
        <label>
          Orientation offset (deg)
          <input type="number" bind:value={arrayForm.orientationOffsetDeg} step="15" />
        </label>
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={arrayForm.skipAccessRoad} />
          Skip access road routing
        </label>
        <div class="tool-form-actions">
          <button class="save" onclick={submitArray} disabled={creatingArray}>
            {creatingArray ? "Creating…" : "Create array"}
          </button>
          <button class="cancel" onclick={cancelDrawArray} disabled={creatingArray}>Discard</button>
        </div>
      </div>
    {/if}
    {#if arrayError}
      <div class="banner draw-error">{arrayError}</div>
    {:else if arrayNotice}
      <div class="banner draw-notice">{arrayNotice}</div>
    {/if}

    {#if reclaimOutlineGeojson}
      <div class="tool-form">
        <div class="tool-form-title">Reclaim parameters</div>
        <label>
          Freeboard (m above sea level)
          <input type="number" bind:value={reclaimForm.freeboardM} step="0.5" />
        </label>
        <label>
          Blend width (m)
          <input type="number" bind:value={reclaimForm.blendM} min="0.1" step="0.5" />
        </label>
        <div class="tool-form-actions">
          <button class="save" onclick={submitReclaim} disabled={creatingReclaim}>
            {creatingReclaim ? "Reclaiming…" : "Reclaim land"}
          </button>
          <button class="cancel" onclick={cancelDrawReclaim} disabled={creatingReclaim}>Discard</button>
        </div>
      </div>
    {/if}
    {#if reclaimError}
      <div class="banner draw-error">{reclaimError}</div>
    {:else if reclaimNotice}
      <div class="banner draw-notice">{reclaimNotice}</div>
    {/if}

    {#if returnToSeaOutlineGeojson}
      <div class="tool-form">
        <div class="tool-form-title">Return to sea parameters</div>
        <label>
          Blend width (m)
          <input type="number" bind:value={returnToSeaForm.blendM} min="0.1" step="0.5" />
        </label>
        <div class="tool-form-actions">
          <button class="save" onclick={submitReturnToSea} disabled={creatingReturnToSea}>
            {creatingReturnToSea ? "Flooding…" : "Return to sea"}
          </button>
          <button class="cancel" onclick={cancelDrawReturnToSea} disabled={creatingReturnToSea}>Discard</button>
        </div>
      </div>
    {/if}
    {#if returnToSeaError}
      <div class="banner draw-error">{returnToSeaError}</div>
    {:else if returnToSeaNotice}
      <div class="banner draw-notice">{returnToSeaNotice}</div>
    {/if}

    {#if causewayStartGeojson}
      <div class="tool-form">
        <div class="tool-form-title">Causeway parameters</div>
        <label>
          Highway class
          <select bind:value={causewayForm.highwayClass}>
            <option value="service">Service</option>
            <option value="track">Track</option>
            <option value="unclassified">Unclassified</option>
            <option value="residential">Residential</option>
          </select>
        </label>
        <div class="tool-form-actions">
          <button class="save" onclick={submitCauseway} disabled={creatingCauseway}>
            {creatingCauseway ? "Routing…" : "Route causeway"}
          </button>
          <button class="cancel" onclick={cancelDrawCauseway} disabled={creatingCauseway}>Discard</button>
        </div>
      </div>
    {/if}
    {#if causewayError}
      <div class="banner draw-error">{causewayError}</div>
    {:else if causewayNotice}
      <div class="banner draw-notice">{causewayNotice}</div>
    {/if}

    {#if cleanupOutlineGeojson}
      <div class="tool-form">
        <div class="tool-form-title">Clear ground parameters</div>
        <label>
          Containment threshold (0-1)
          <input type="number" bind:value={cleanupForm.thresholdFraction} min="0" max="1" step="0.05" />
        </label>
        <div class="tool-form-actions">
          <button class="save" onclick={submitCleanup} disabled={creatingCleanup}>
            {creatingCleanup ? "Clearing…" : "Clear ground"}
          </button>
          <button class="cancel" onclick={cancelDrawCleanup} disabled={creatingCleanup}>Discard</button>
        </div>
      </div>
    {/if}
    {#if cleanupError}
      <div class="banner draw-error">{cleanupError}</div>
    {:else if cleanupNotice}
      <div class="banner draw-notice">{cleanupNotice}</div>
    {/if}

    <InspectorPanel
      features={selectedFeatures}
      onClose={() => (selectedFeatures = [])}
      {isEditing}
      {hasUnsavedChanges}
      {saving}
      {saveError}
      {saveNotice}
      onStartEdit={startEdit}
      onSaveEdit={saveEdit}
      onCancelEdit={cancelEdit}
      bind:gridSnapEnabled
      bind:orthoSnapEnabled
      onDelete={deleteSelectedFeature}
      deleting={deletingFeature}
      onUnion={handleUnion}
      unioning={unioningFeatures}
      {unionError}
      {unionNotice}
    />
  {:else}
    <div class="centered">Loading map…</div>
  {/if}
</div>

<style>
  .root {
    position: relative;
    width: 100%;
    height: 100%;
  }
  :global(.map-container) {
    width: 100%;
    height: 100%;
  }
  .banner {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(20, 20, 20, 0.85);
    color: #eee;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 13px;
    pointer-events: none;
  }
  /* Phase 14: the marquee drag rectangle -- screen-space only, positioned
     via inline style:left/top/width/height (computed straight from the two
     drag points), never a MapLibre layer. pointer-events: none so it never
     itself becomes the thing a mouseup/click lands on. */
  .marquee-rect {
    position: absolute;
    border: 1px solid #ffe066;
    background: rgba(255, 224, 102, 0.15);
    pointer-events: none;
  }
  .centered {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #999;
  }
  /* map-editor plan Phase 13: moved from a small top-left pill row to a
     bottom-center panel, sectioned by label -- the button count grew from
     8 to 35 (22 road/rail classes + 5 building presets + 6 terrain/land
     tools + 2 general tools), which the old flat top-left row could never
     have fit. A background panel + scroll (rather than letting 35 buttons
     push arbitrarily far off-screen) keeps this usable at any window size;
     shipped as static sectioned rows for now, not collapsible -- see the
     plan's own "ship simple first, measure before adding complexity" call. */
  .draw-toolbar {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: center;
    gap: 16px;
    max-width: min(94vw, 1100px);
    max-height: 45vh;
    overflow-y: auto;
    padding: 10px 16px;
    background: rgba(18, 20, 24, 0.78);
    border-radius: 10px;
  }
  .toolbar-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .toolbar-section-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9aa4ad;
  }
  .toolbar-section-buttons {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px;
  }
  .draw-toolbar button {
    border: none;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 12px;
    cursor: pointer;
  }
  .draw-toolbar button:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .draw-toolbar .edit {
    background: #2d3f52;
    color: #cfe4ff;
  }
  .draw-toolbar .edit:hover:not(:disabled) {
    background: #37506a;
  }
  .draw-toolbar .cancel {
    background: #444;
    color: #ddd;
  }
  .draw-toolbar .cancel:hover {
    background: #555;
  }
  /* Visually distinct from the .edit tool buttons -- this one isn't a
     drawing tool, it's a real, slow (~2 minute), deliberately-triggered
     "give me the polished picture" action, not another quick editing
     affordance. */
  .draw-toolbar .render {
    background: #2d5a3f;
    color: #cdf5da;
  }
  .draw-toolbar .render:hover:not(:disabled) {
    background: #367049;
  }
  .draw-hint {
    background: rgba(20, 20, 20, 0.85);
    color: #bbb;
    font-size: 12px;
    padding: 5px 10px;
    border-radius: 5px;
  }
  /* A tool's own action banner (draw-error/draw-notice) sits BELOW the
     zoom-status banner above (tooFarOut/hiddenBanner, plain .banner with
     neither modifier) rather than sharing its exact position -- the two
     are a genuinely different kind of message (one persistent/derived from
     zoom level, the other a one-shot result of an action) and can be
     simultaneously true (e.g. a "409 conflict" error right as the user
     zooms out too far to select anything). resetToolBanners() keeps at
     most one ACTION banner visible at a time; this offset is what keeps
     that one from also colliding with the zoom-status banner. */
  .draw-error,
  .draw-notice {
    top: 48px;
  }
  .draw-error {
    background: rgba(180, 50, 50, 0.85);
  }
  .draw-notice {
    background: rgba(45, 90, 63, 0.9);
  }
  /* Shared by the Terrace (Phase 7) and Wall-on-foundation (Phase 8)
     parameter panels -- same visual shape, different fields. */
  .tool-form {
    position: absolute;
    top: 56px;
    left: 12px;
    width: 220px;
    background: rgba(20, 20, 20, 0.92);
    color: #eee;
    border-radius: 8px;
    padding: 12px 14px;
    font-size: 13px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  }
  .tool-form-title {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
    color: #999;
    margin-bottom: 8px;
  }
  .tool-form label {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 12px;
    color: #bbb;
    margin-bottom: 8px;
  }
  .tool-form label.checkbox-label {
    flex-direction: row;
    align-items: center;
    gap: 6px;
  }
  .tool-form input,
  .tool-form select {
    background: #2a2a2a;
    border: 1px solid #444;
    border-radius: 4px;
    color: #eee;
    padding: 4px 6px;
    font-size: 12px;
  }
  .tool-form-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
  .tool-form-actions button {
    flex: 1;
    border: none;
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    cursor: pointer;
  }
  .tool-form-actions button:disabled {
    cursor: default;
    opacity: 0.6;
  }
  .tool-form-actions .save {
    background: #2d5a3f;
    color: #cdf5da;
  }
  .tool-form-actions .save:hover:not(:disabled) {
    background: #367049;
  }
  .tool-form-actions .cancel {
    background: #444;
    color: #ddd;
  }
  .tool-form-actions .cancel:hover:not(:disabled) {
    background: #555;
  }
</style>
