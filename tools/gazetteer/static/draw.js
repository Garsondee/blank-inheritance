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
      const verb = tool === "mass-adopt" ? "adopt everything inside" : "finish";
      report(`${pts.length} points · ${refs.length} cell${refs.length === 1 ? "" : "s"}`
        + ` · ${fmtArea(polygonAreaPx(pts))} — Enter to ${verb}, Esc to cancel, Backspace to undo a point`);
    } else {
      const hint = tool === "mass-adopt"
        ? "draw a lasso around the real buildings to adopt" : "need at least 3";
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
    layer.on("click", (e) => {
      L.DomEvent.stop(e);
      // Plain click: select just this one. Shift-click: toggle it into/out of
      // whatever is already selected, the same modifier every other tool
      // (Figma, Illustrator, a file manager) uses for "add one more" -- so a
      // mass-adopt's result can be trimmed by hand without starting over.
      if (e.originalEvent.shiftKey) toggle(item.localId);
      else select(item.localId);
    });
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
      if (rect.x1 - rect.x0 < 4 && rect.y1 - rect.y0 < 4) return; // a click, not a drag
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

  // --- events --------------------------------------------------------------

  map.on("click", (e) => {
    const p = px(e.latlng);
    if (tool === "region" || tool === "site" || tool === "mass-adopt") {
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
    // Pan/select: clicking bare map clears the selection, which is the only
    // way to get back to "nothing selected" without a keyboard. A marquee
    // drag never reaches here -- see the small-movement guard in up() above,
    // and the mousedown handler below never lets a real drag turn into a
    // Leaflet "click" in the first place.
    select(null);
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
      // Deliberately NOT stopping propagation: a plain click (small movement)
      // must still reach a shape's own "click" handler for ordinary single-
      // select, and reach the map's own "click" handler (above) to clear the
      // selection on empty background. Only map.dragging.disable() is needed
      // to stop the map panning underneath a genuine drag.
      beginMarquee(e, "select-items");
    }
  });

  // Select/pan gets a plain pointer at rest -- "default", not the browser's
  // bare unstyled cursor and not Leaflet's own grab-hand (which reads as
  // "drag to pan", not "click or marquee to select"). Every drawing/picking
  // tool gets a crosshair, matching the precision-placement feel those need.
  const CURSOR = {
    pan: "default", region: "crosshair", site: "crosshair", point: "crosshair",
    adopt: "crosshair", remove: "crosshair", "mass-adopt": "crosshair",
  };

  function setTool(next) {
    if (drafting) cancelDraft();
    tool = next;
    map.getContainer().style.cursor = CURSOR[next] || "default";
    map.doubleClickZoom[
      next === "region" || next === "site" || next === "mass-adopt" ? "disable" : "enable"
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
