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
  } = opts;

  const shapeLayer = L.layerGroup().addTo(map);
  const handleLayer = L.layerGroup().addTo(map);
  const draftLayer = L.layerGroup().addTo(map);

  const shapes = new Map();     // localId -> { item, layer }
  let tool = "pan";
  let drafting = null;          // { points: [[x,y]], line, poly }
  let selectedId = null;
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
      report(`${pts.length} points · ${refs.length} cell${refs.length === 1 ? "" : "s"}`
        + ` · ${fmtArea(polygonAreaPx(pts))} — Enter to finish, Esc to cancel, Backspace to undo a point`);
    } else {
      report(`${pts.length} point${pts.length === 1 ? "" : "s"} — need at least 3`);
    }
  }

  function finishDraft() {
    if (!drafting || drafting.points.length < 3) {
      report("a polygon needs at least three points");
      return;
    }
    const ring = drafting.points.slice();
    cancelDraft();
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
      select(item.localId);
    });
    if (item.name) {
      layer.bindTooltip(item.name, { className: "gz-tip", direction: "top", sticky: true });
    }
    shapeLayer.addLayer(layer);
    shapes.set(item.localId, { item, layer });
    if (selectedId === item.localId) drawHandles();
  }

  function removeShape(localId) {
    const entry = shapes.get(localId);
    if (!entry) return;
    shapeLayer.removeLayer(entry.layer);
    shapes.delete(localId);
    if (selectedId === localId) { selectedId = null; handleLayer.clearLayers(); }
  }

  function clearShapes() {
    shapeLayer.clearLayers();
    handleLayer.clearLayers();
    shapes.clear();
    selectedId = null;
  }

  function select(localId) {
    for (const [id, entry] of shapes) {
      if (entry.item.geometry.kind === "polygon") {
        entry.layer.setStyle(id === localId
          ? SELECTED
          : (TIER_STYLE[entry.item.tier] || TIER_STYLE.site));
      }
    }
    selectedId = localId;
    drawHandles();
    onSelect(localId);
  }

  function selected() { return selectedId; }

  // --- vertex handles ------------------------------------------------------

  function drawHandles() {
    handleLayer.clearLayers();
    const entry = selectedId && shapes.get(selectedId);
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
    const entry = selectedId && shapes.get(selectedId);
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

  // --- marquee (bulk removal) ---------------------------------------------

  function beginMarquee(startEvent) {
    const container = map.getContainer();
    const box = document.createElement("div");
    box.className = "gz-marquee";
    container.appendChild(box);
    const origin = startEvent.containerPoint;
    const alt = startEvent.originalEvent.altKey;
    marquee = { box, origin, alt };
    map.dragging.disable();

    function move(ev) {
      const p = map.mouseEventToContainerPoint(ev);
      const x0 = Math.min(origin.x, p.x), y0 = Math.min(origin.y, p.y);
      box.style.left = x0 + "px";
      box.style.top = y0 + "px";
      box.style.width = Math.abs(p.x - origin.x) + "px";
      box.style.height = Math.abs(p.y - origin.y) + "px";
      report(alt ? "release to remove this AREA permanently"
                 : "release to remove the buildings inside the box");
    }

    function up(ev) {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", up);
      container.removeChild(box);
      map.dragging.enable();
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
      onMarquee(rect, alt);
    }

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", up);
  }

  // --- events --------------------------------------------------------------

  map.on("click", (e) => {
    const p = px(e.latlng);
    if (tool === "region" || tool === "site") {
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
    // way to get back to "nothing selected" without a keyboard.
    select(null);
  });

  map.on("dblclick", (e) => {
    if (drafting) { L.DomEvent.stop(e); finishDraft(); }
  });

  map.on("mousedown", (e) => {
    if (tool === "remove" && !drafting) {
      L.DomEvent.stop(e);
      beginMarquee(e);
    }
  });

  function setTool(next) {
    if (drafting) cancelDraft();
    tool = next;
    map.getContainer().style.cursor =
      next === "pan" ? "" : (next === "remove" ? "crosshair" : "crosshair");
    map.doubleClickZoom[next === "region" || next === "site" ? "disable" : "enable"]();
  }

  function liveReport(ring) {
    const refs = refsTouched(ring, grid);
    report(`${refs.length} cell${refs.length === 1 ? "" : "s"} · ${fmtArea(polygonAreaPx(ring))}`);
  }

  function report(text) { if (onStatus) onStatus(text); }

  return {
    setTool, get tool() { return tool; },
    addShape, removeShape, clearShapes, select, selected, drawHandles, nudge,
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
