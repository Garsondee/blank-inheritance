/**
 * Drawing and editing shapes on the campaign map.
 *
 * Every coordinate here is a campaign-map image pixel. Leaflet is configured
 * with a CRS.Simple whose transformation is 1/2^maxNativeZoom, so an
 * L.latLng(imageY, imageX) lands exactly on that pixel at every zoom level —
 * which is what lets a grid reference be computed in the browser with integer
 * arithmetic instead of a round trip.
 *
 * Vertex editing is hand-rolled rather than taken from leaflet-draw. The
 * requirement was specific — drag a vertex, insert one, delete one, move the
 * whole shape — and leaflet-draw's edit toolbar is a mode you enter and leave,
 * which is one ceremony too many when the job is drawing a hundred districts
 * in a sitting. Here a selected shape simply has handles.
 *
 * Not a pure module: it owns Leaflet layers and DOM. The arithmetic it needs
 * lives in core/grid.mjs, which is pure and shared with the server.
 */

import { imagePxToRef, refsTouched, polygonAreaPx, polygonCentroidPx } from "/core/grid.mjs";

const TIER_STYLE = {
  region: { color: "#ac8a4d", weight: 3, fillOpacity: 0.10, dashArray: null },
  site:   { color: "#d1402a", weight: 2, fillOpacity: 0.18, dashArray: null },
  point:  { color: "#d1402a", weight: 2, fillOpacity: 0.30, dashArray: null },
};
const SELECTED = { color: "#4fc8d8", weight: 3, fillOpacity: 0.25 };
const DRAFT_STYLE = { color: "#4fc8d8", weight: 2, dashArray: "6 5", fillOpacity: 0.12 };

export const TIER_COLOUR = {
  region: TIER_STYLE.region.color,
  site: TIER_STYLE.site.color,
  point: TIER_STYLE.point.color,
};

export function ll(x, y) { return L.latLng(y, x); }
export function px(latlng) { return [latlng.lng, latlng.lat]; }
export function ringToLatLngs(ring) { return ring.map(([x, y]) => ll(x, y)); }

export function createDrawController(opts) {
  const {
    map, grid, onComplete, onSelect, onGeometryChange, onMarquee, onPick, onStatus,
    onMassAdopt,
  } = opts;

  const shapeLayer = L.layerGroup().addTo(map);
  const handleLayer = L.layerGroup().addTo(map);
  const draftLayer = L.layerGroup().addTo(map);

  const shapes = new Map();     // localId -> { item, layer }
  let tool = "pan";
  let drafting = null;          // { points: [[x,y]], line, poly }
  // Selection is a SET, not a single id, so a marquee or a mass-adopt can put
  // many items in the batch panel at once. Every call site that only ever
  // wanted one item still gets that via selected() below; nothing about the
  // single-item path (vertex handles, the inspector) had to change shape.
  let selectedIds = new Set();
  let marquee = null;

  // --- drawing -------------------------------------------------------------

  function startDraft(first) {
    drafting = { points: [first], line: null };
    map.getContainer().style.cursor = "crosshair";
    redrawDraft();
  }

  function redrawDraft() {
    draftLayer.clearLayers();
    if (!drafting) return;
    const pts = drafting.points;
    if (pts.length >= 2) {
      draftLayer.addLayer(L.polygon(ringToLatLngs(pts), DRAFT_STYLE));
    }
    pts.forEach(([x, y], i) => {
      draftLayer.addLayer(L.marker(ll(x, y), {
        icon: L.divIcon({ className: "gz-vertex", iconSize: [10, 10] }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 900 + i,
      }));
    });
    if (pts.length >= 3) {
      const refs = refsTouched(pts, grid);
      const verb = tool === "mass-adopt" ? "adopt everything inside"
        : tool === "lasso" ? "select everything inside" : "finish";
      report(`${pts.length} points · ${refs.length} cell${refs.length === 1 ? "" : "s"}`
        + ` · ${fmtArea(polygonAreaPx(pts))} — Enter to ${verb}, Esc to cancel, Backspace to undo a point`);
    } else {
      const hint = tool === "mass-adopt" ? "draw a lasso around the real buildings to adopt"
        : tool === "lasso" ? "draw a lasso around the items to select" : "need at least 3";
      report(`${pts.length} point${pts.length === 1 ? "" : "s"} — ${hint}`);
    }
  }

  function finishDraft() {
    if (!drafting || drafting.points.length < 3) {
      report("a polygon needs at least three points");
      return;
    }
    const ring = drafting.points.slice();
    cancelDraft();
    if (tool === "mass-adopt") { onMassAdopt(ring); return; }
    if (tool === "lasso") {
      // Purely client-side, unlike mass-adopt: every session item's geometry
      // is already in `shapes`, so there is nothing to ask the server for.
      const hit = [];
      for (const [id, entry] of shapes) {
        const [cx, cy] = centroidPxOf(entry.item.geometry);
        if (pointInRing(cx, cy, ring)) hit.push(id);
      }
      selectMany(hit);
      report(hit.length ? "" : "nothing inside that lasso");
      return;
    }
    onComplete({ tier: tool === "region" ? "region" : "site", ringPx: ring, source: "drawn" });
  }

  function cancelDraft() {
    drafting = null;
    draftLayer.clearLayers();
    map.getContainer().style.cursor = "";
    report("");
  }

  function undoPoint() {
    if (!drafting) return;
    drafting.points.pop();
    if (drafting.points.length === 0) cancelDraft();
    else redrawDraft();
  }

  // --- shapes --------------------------------------------------------------

  function addShape(item) {
    removeShape(item.localId);
    const g = item.geometry;
    let layer;
    if (g.kind === "point") {
      const [x, y] = g.pointPx;
      layer = L.marker(ll(x, y), {
        icon: L.divIcon({ className: "gz-pin", iconSize: [14, 14] }),
        draggable: false,
      });
    } else {
      layer = L.polygon(ringToLatLngs(g.ringPx), TIER_STYLE[item.tier] || TIER_STYLE.site);
    }
    // No click handler here on purpose -- see the mousedown/up handlers below
    // for why. Selection for every shape, clicked or marqueed, is decided in
    // ONE place (hitTestAt inside the marquee's own up()), not split between
    // this per-shape listener and a separate map-level one that could
    // plausibly both fire for the same interaction and double-toggle a shift-
    // click back off.
    if (item.name) {
      layer.bindTooltip(item.name, { className: "gz-tip", direction: "top", sticky: true });
    }
    shapeLayer.addLayer(layer);
    shapes.set(item.localId, { item, layer });
    if (selectedIds.has(item.localId)) restyleOne(item.localId);
    if (selectedIds.size === 1 && selectedIds.has(item.localId)) drawHandles();
  }

  function removeShape(localId) {
    const entry = shapes.get(localId);
    if (!entry) return;
    shapeLayer.removeLayer(entry.layer);
    shapes.delete(localId);
    if (selectedIds.delete(localId)) { handleLayer.clearLayers(); onSelect([...selectedIds]); }
  }

  function clearShapes() {
    shapeLayer.clearLayers();
    handleLayer.clearLayers();
    shapes.clear();
    selectedIds = new Set();
  }

  function restyleOne(id) {
    const entry = shapes.get(id);
    if (!entry || entry.item.geometry.kind !== "polygon") return;
    entry.layer.setStyle(selectedIds.has(id) ? SELECTED
      : (TIER_STYLE[entry.item.tier] || TIER_STYLE.site));
    const el = entry.layer._icon; // pins restyle via their marker element, if any
    if (el) el.classList.toggle("gz-pin--selected", selectedIds.has(id));
  }

  function restyleAll() {
    for (const id of shapes.keys()) restyleOne(id);
  }

  /** Replace the whole selection with exactly these ids (0 or 1 is the common
   *  case: a bare click, or clearing). `emit: false` is for internal callers
   *  that will fire onSelect themselves once, after other bookkeeping. */
  function selectMany(ids, opts = {}) {
    selectedIds = new Set(ids);
    restyleAll();
    drawHandles();
    if (opts.emit !== false) onSelect([...selectedIds]);
  }

  function select(localId) {
    selectMany(localId ? [localId] : []);
  }

  function toggle(localId) {
    const next = new Set(selectedIds);
    if (next.has(localId)) next.delete(localId); else next.add(localId);
    selectMany([...next]);
  }

  /** The single id, if EXACTLY one item is selected -- what every existing
   *  single-item flow (the inspector, promote, zoom, delete) wants. null for
   *  zero or for many, which is also the correct signal to fall back to the
   *  empty state or the batch panel rather than guessing which one. */
  function selected() { return selectedIds.size === 1 ? [...selectedIds][0] : null; }

  function selectedList() { return [...selectedIds]; }

  // --- vertex handles ------------------------------------------------------

  function drawHandles() {
    handleLayer.clearLayers();
    // Vertex handles only make sense for exactly one shape at a time -- with
    // several selected there is no single ring to edit, and the batch panel
    // (name/note/kind/delete, applied to every one at once) is what those
    // selections are for instead.
    const entry = selected() && shapes.get(selected());
    if (!entry) return;
    const g = entry.item.geometry;

    if (g.kind === "point") {
      const [x, y] = g.pointPx;
      const m = L.marker(ll(x, y), {
        icon: L.divIcon({ className: "gz-vertex", iconSize: [10, 10] }),
        draggable: true, zIndexOffset: 1000,
      });
      m.on("drag", () => {
        const p = px(m.getLatLng());
        g.pointPx = [round1(p[0]), round1(p[1])];
        entry.layer.setLatLng(m.getLatLng());
      });
      m.on("dragend", () => onGeometryChange(entry.item));
      handleLayer.addLayer(m);
      return;
    }

    const ring = g.ringPx;
    ring.forEach(([x, y], i) => {
      const m = L.marker(ll(x, y), {
        icon: L.divIcon({ className: "gz-vertex", iconSize: [10, 10] }),
        draggable: true, zIndexOffset: 1000,
      });
      m.on("drag", () => {
        const p = px(m.getLatLng());
        ring[i] = [round1(p[0]), round1(p[1])];
        entry.layer.setLatLngs(ringToLatLngs(ring));
        liveReport(ring);
      });
      m.on("dragend", () => { onGeometryChange(entry.item); drawHandles(); });
      // Right-click removes this vertex. A polygon cannot go below three, and
      // refusing is better than silently leaving a degenerate shape behind.
      m.on("contextmenu", (e) => {
        L.DomEvent.stop(e);
        if (ring.length <= 3) { report("a polygon needs at least three points"); return; }
        ring.splice(i, 1);
        entry.layer.setLatLngs(ringToLatLngs(ring));
        onGeometryChange(entry.item);
        drawHandles();
      });
      handleLayer.addLayer(m);
    });

    // Midpoint ghosts. Dragging one inserts a vertex there — the gesture
    // everyone already expects from every vector editor, and the reason a
    // separate "add point" tool is not needed.
    ring.forEach(([x, y], i) => {
      const [nx, ny] = ring[(i + 1) % ring.length];
      const mid = L.marker(ll((x + nx) / 2, (y + ny) / 2), {
        icon: L.divIcon({ className: "gz-vertex gz-vertex--mid", iconSize: [8, 8] }),
        draggable: true, zIndexOffset: 800,
      });
      let inserted = false;
      mid.on("dragstart", () => {
        ring.splice(i + 1, 0, [x, y]);
        inserted = true;
      });
      mid.on("drag", () => {
        if (!inserted) return;
        const p = px(mid.getLatLng());
        ring[i + 1] = [round1(p[0]), round1(p[1])];
        entry.layer.setLatLngs(ringToLatLngs(ring));
        liveReport(ring);
      });
      mid.on("dragend", () => { onGeometryChange(entry.item); drawHandles(); });
      handleLayer.addLayer(mid);
    });
  }

  /** Move the whole selected shape by a pixel delta — arrow keys, so a shape
   *  can be nudged without grabbing a vertex and changing its outline. */
  function nudge(dx, dy) {
    const entry = selected() && shapes.get(selected());
    if (!entry) return;
    const g = entry.item.geometry;
    if (g.kind === "point") {
      g.pointPx = [g.pointPx[0] + dx, g.pointPx[1] + dy];
      entry.layer.setLatLng(ll(...g.pointPx));
    } else {
      g.ringPx = g.ringPx.map(([x, y]) => [round1(x + dx), round1(y + dy)]);
      entry.layer.setLatLngs(ringToLatLngs(g.ringPx));
      liveReport(g.ringPx);
    }
    onGeometryChange(entry.item);
    drawHandles();
  }

  // --- marquee: bulk-remove real buildings, OR bulk-select session items ---
  //
  // Two different things happen inside the same box, chosen by `kind`:
  // "remove-buildings" (the Remove tool) asks the ground-truth layer what
  // real buildings fall inside; "select-items" (the Select tool) puts every
  // drawn/adopted item inside the box into the multi-selection, for the batch
  // note/delete panel. Shift held down makes select-items ADD to whatever is
  // already selected rather than replace it -- the same modifier `toggle()`
  // uses for a single shift-click, so the two compose (marquee a block, then
  // shift-click one more building the box missed).
  //
  // mousedown ALWAYS calls L.DomEvent.stop() before this runs, for both
  // kinds, no exceptions -- found live, the hard way: Select's marquee
  // originally left it out ("a plain click must still reach a shape's own
  // click handler"), on the theory that not stopping the event was needed to
  // let that handler fire. It never was, and worse: map.dragging is a
  // SEPARATE Leaflet Handler subscribed to the SAME "mousedown" map event,
  // subscribed when the map itself was constructed -- long before this
  // module's own mousedown listener is added -- and every JS-dispatched
  // synthetic mousedown/mousemove/mouseup this project's own tests drove
  // during development skipped whatever native browser behaviour that race
  // depends on, so the marquee looked correct in every test and still failed
  // for a real mouse: the map would pan underneath the drag, and `up()`'s own
  // rect math -- built from containerPointToLatLng calls that are only valid
  // against a STILL map -- would silently describe the wrong rectangle. The
  // fix costs nothing a plain click needs: a click no longer depends on some
  // OTHER layer's own listener firing afterward at all, because the small-
  // movement branch in up() below now does its own explicit hit-test.

  function beginMarquee(startEvent, kind) {
    const container = map.getContainer();
    const box = document.createElement("div");
    box.className = "gz-marquee";
    container.appendChild(box);
    const origin = startEvent.containerPoint;
    const alt = startEvent.originalEvent.altKey;
    const additive = startEvent.originalEvent.shiftKey;
    marquee = { box, origin, alt, kind };
    map.dragging.disable();
    const prevCursor = map.getContainer().style.cursor;
    map.getContainer().style.cursor = "crosshair";

    function move(ev) {
      const p = map.mouseEventToContainerPoint(ev);
      const x0 = Math.min(origin.x, p.x), y0 = Math.min(origin.y, p.y);
      box.style.left = x0 + "px";
      box.style.top = y0 + "px";
      box.style.width = Math.abs(p.x - origin.x) + "px";
      box.style.height = Math.abs(p.y - origin.y) + "px";
      if (kind === "select-items") {
        report(additive ? "release to add the items inside the box to the selection"
                        : "release to select the items inside the box");
      } else {
        report(alt ? "release to remove this AREA permanently"
                   : "release to remove the buildings inside the box");
      }
    }

    function up(ev) {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      container.removeChild(box);
      map.dragging.enable();
      map.getContainer().style.cursor = prevCursor;
      const p = map.mouseEventToContainerPoint(ev);
      const a = px(map.containerPointToLatLng(origin));
      const b = px(map.containerPointToLatLng(p));
      marquee = null;
      report("");
      const rect = {
        x0: Math.min(a[0], b[0]), y0: Math.min(a[1], b[1]),
        x1: Math.max(a[0], b[0]), y1: Math.max(a[1], b[1]),
      };

      if (rect.x1 - rect.x0 < 4 && rect.y1 - rect.y0 < 4) {
        // A click, not a drag. remove-buildings leaves this to the map's own
        // "click" handler below (onPick), unchanged from before. select-items
        // has no other handler to fall back on now -- see this function's own
        // comment for why relying on one was the actual bug -- so it hit-
        // tests the release point itself and selects/toggles/clears exactly
        // as a single click on a shape always has.
        if (kind === "select-items") {
          const hitId = hitTestAt(b[0], b[1]);
          if (hitId && additive) toggle(hitId);
          else select(hitId); // null hitId -> select(null), the "clear" case
        }
        return;
      }

      if (kind === "select-items") {
        // Centroid computed fresh from the live geometry, not the item's
        // stored `derived` block -- that is only as current as the last
        // server round trip, and a shape just dragged by a vertex handle
        // must marquee-select from where it actually is right now.
        const hit = [];
        for (const [id, entry] of shapes) {
          const [cx, cy] = centroidPxOf(entry.item.geometry);
          if (cx >= rect.x0 && cx <= rect.x1 && cy >= rect.y0 && cy <= rect.y1) hit.push(id);
        }
        selectMany(additive ? [...new Set([...selectedIds, ...hit])] : hit);
      } else {
        onMarquee(rect, alt);
      }
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  function centroidPxOf(g) {
    if (g.kind === "point") return g.pointPx;
    const c = polygonCentroidPx(g.ringPx);
    return [c.x, c.y];
  }

  //: How close a click needs to land to a PIN to count as hitting it. Pins
  //: draw at a fixed 14 SCREEN px regardless of zoom, so no single image-px
  //: radius is exactly right at every zoom -- this is deliberately generous
  //: rather than zoom-exact, since missing a precise click on a small marker
  //: is a worse feel than occasionally winning a call that was genuinely close.
  const PIN_HIT_RADIUS_PX = 15;

  /** Which session item (if any) is at this image-pixel point -- the single
   *  source of truth for "what did this click land on" in the Select tool,
   *  now that no per-shape listener answers that question on its own. Pins
   *  win outright within their radius (they are meant to be precise, small
   *  targets, and a district drawn underneath one must never steal the
   *  click); among overlapping polygons, the smallest area wins, the same
   *  "the building you clicked, not the block it sits in" instinct the
   *  server's own real-building hit-test already uses. */
  function hitTestAt(x, y) {
    let best = null;
    let bestArea = Infinity;
    for (const [id, entry] of shapes) {
      const g = entry.item.geometry;
      if (g.kind === "point") {
        const [px_, py_] = g.pointPx;
        if ((px_ - x) ** 2 + (py_ - y) ** 2 <= PIN_HIT_RADIUS_PX ** 2) return id;
        continue;
      }
      if (pointInRing(x, y, g.ringPx)) {
        const area = polygonAreaPx(g.ringPx);
        if (area < bestArea) { bestArea = area; best = id; }
      }
    }
    return best;
  }

  /** Even-odd ray casting over an image-pixel ring. Kept local rather than
   *  imported from grid.mjs: this is a UI hit-test convenience, never the
   *  authority on which cells a shape occupies (that stays server-side, in
   *  core/grid.py, at save time), and grid.mjs's own point-in-polygon logic
   *  lives inside its exact-area clipper rather than as a standalone export. */
  function pointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // --- events --------------------------------------------------------------

  map.on("click", (e) => {
    const p = px(e.latlng);
    if (POLYGON_DRAFT_TOOLS.has(tool)) {
      if (!drafting) startDraft([round1(p[0]), round1(p[1])]);
      else { drafting.points.push([round1(p[0]), round1(p[1])]); redrawDraft(); }
      return;
    }
    if (tool === "point") {
      onComplete({ tier: "point", pointPx: [round1(p[0]), round1(p[1])], source: "drawn" });
      return;
    }
    if (tool === "adopt" || tool === "remove") {
      onPick(p, tool);
      return;
    }
    // Pan/select: deliberately nothing here. Every outcome a click can have in
    // this tool -- select one, toggle one, or clear the selection on empty
    // background -- is already decided by hitTestAt() inside the marquee's
    // own up(), which runs first (mouseup fires before Leaflet's synthesised
    // click, if one follows at all). If this ALSO called select(null) here
    // and a trailing click event does still fire, it would silently wipe out
    // whatever up() just correctly selected one event later -- so this stays
    // a no-op regardless of which way that turns out.
  });

  map.on("dblclick", (e) => {
    if (drafting) { L.DomEvent.stop(e); finishDraft(); }
  });

  map.on("mousedown", (e) => {
    if (drafting) return;
    // A vertex or midpoint handle has its own drag behaviour (see drawHandles)
    // that must run untouched -- starting a marquee tracker on top of it would
    // fight the handle for the same mousemove/mouseup pair.
    const target = e.originalEvent && e.originalEvent.target;
    if (target && target.closest && target.closest(".gz-vertex, .gz-vertex--mid")) return;
    if (tool === "remove") {
      L.DomEvent.stop(e);
      beginMarquee(e, "remove-buildings");
    } else if (tool === "pan") {
      // Stopped unconditionally now, matching "remove" -- see beginMarquee's
      // own comment for the real-mouse-only bug this fixes.
      L.DomEvent.stop(e);
      beginMarquee(e, "select-items");
    }
  });

  // Select/pan gets a plain pointer at rest -- "default", not the browser's
  // bare unstyled cursor and not Leaflet's own grab-hand (which reads as
  // "drag to pan", not "click or marquee to select"). Every drawing/picking
  // tool gets a crosshair, matching the precision-placement feel those need.
  const CURSOR = {
    pan: "default", region: "crosshair", site: "crosshair", point: "crosshair",
    adopt: "crosshair", remove: "crosshair", "mass-adopt": "crosshair", lasso: "crosshair",
  };
  const POLYGON_DRAFT_TOOLS = new Set(["region", "site", "mass-adopt", "lasso"]);

  function setTool(next) {
    if (drafting) cancelDraft();
    tool = next;
    map.getContainer().style.cursor = CURSOR[next] || "default";
    map.doubleClickZoom[
      POLYGON_DRAFT_TOOLS.has(next) ? "disable" : "enable"
    ]();
  }

  function liveReport(ring) {
    const refs = refsTouched(ring, grid);
    report(`${refs.length} cell${refs.length === 1 ? "" : "s"} · ${fmtArea(polygonAreaPx(ring))}`);
  }

  function report(text) { if (onStatus) onStatus(text); }

  return {
    setTool, get tool() { return tool; },
    addShape, removeShape, clearShapes, select, selected, selectMany, selectedList,
    toggle, drawHandles, nudge,
    finishDraft, cancelDraft, undoPoint,
    get drafting() { return !!drafting; },
    shapes,
  };
}

export function fmtArea(areaPx2) {
  // 1 px is 1 m on this map, so square pixels are square metres. Hectares
  // above a hectare because a district in square metres is an unreadable
  // number and nobody pictures 2,400,000 of anything.
  if (areaPx2 >= 10000) return (areaPx2 / 10000).toFixed(1) + " ha";
  return Math.round(areaPx2) + " m²";
}

export function round1(v) { return Math.round(v * 10) / 10; }
