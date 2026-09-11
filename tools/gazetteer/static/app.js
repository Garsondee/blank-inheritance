/**
 * The Gazetteer — drawing locations onto the campaign map.
 *
 * Bootstraps the map, owns the session state, and wires the panels. The map
 * runs on a CRS.Simple whose transformation is 1/2^maxNativeZoom, so every
 * coordinate on this page is a campaign-map image pixel and a grid reference
 * is integer arithmetic in the browser rather than a request.
 *
 * Saving is write-through: any committed change schedules a save a second
 * later. A drawing session is an hour of small irreversible decisions, and
 * losing it to a closed tab would be the single worst thing this tool could do.
 */

import {
  imagePxToRef, refsTouched, polygonAreaPx, polygonCentroidPx, GridError,
} from "/core/grid.mjs";
import { check as checkDepth, suggestDepth, DEPTHS } from "/core/depth.mjs";
import {
  createDrawController, ll, px, ringToLatLngs, fmtArea, round1, TIER_COLOUR,
} from "/static/draw.js";

const $ = (id) => document.getElementById(id);

const state = {
  map: null,
  cfg: null,
  grid: null,
  draw: null,
  items: [],
  nextLocal: 1,
  dirty: false,
  saveTimer: null,
  features: new Map(),   // ground-truth building id -> { ringPx, layer, centroid }
  featureLayer: null,
  suppressedLayer: null,
  publishedLayer: null,
  coverageLayer: null,
  published: new Map(),  // location id -> record from /api/locations
  filter: "",
};

// --- api --------------------------------------------------------------------

async function api(path, body) {
  const res = await fetch(path, body === undefined ? {} : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${path}`);
  return data;
}

// --- the reference grid, drawn as its own tile layer -------------------------

function makeGridLayer(cfg) {
  const g = cfg.grid;
  const border = cfg.border.px;
  const maxNative = cfg.tiles.maxZoom;
  const size = cfg.tiles.tileSize;

  return new (L.GridLayer.extend({
    createTile(coords) {
      const tile = document.createElement("canvas");
      tile.width = tile.height = size;
      const ctx = tile.getContext("2d");

      // Image pixels per tile pixel at this zoom, and the tile's own origin in
      // image pixels. Both fall straight out of the pyramid scheme, so the grid
      // cannot drift from the map underneath it.
      const factor = Math.pow(2, maxNative - coords.z);
      const originX = coords.x * size * factor;
      const originY = coords.y * size * factor;
      const toTile = (v, origin) => (v - origin) / factor;
      const cellOnScreen = g.cellPx / factor;

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.28)";
      if (cellOnScreen >= 6) {
        ctx.beginPath();
        for (let c = 0; c <= g.cols; c += 1) {
          if (c % g.cellsPerMajor === 0) continue;
          const x = Math.floor(toTile(border + c * g.cellPx, originX)) + 0.5;
          if (x < -1 || x > size + 1) continue;
          ctx.moveTo(x, 0); ctx.lineTo(x, size);
        }
        for (let r = 0; r <= g.rows; r += 1) {
          if (r % g.cellsPerMajor === 0) continue;
          const y = Math.floor(toTile(border + r * g.cellPx, originY)) + 0.5;
          if (y < -1 || y > size + 1) continue;
          ctx.moveTo(0, y); ctx.lineTo(size, y);
        }
        ctx.stroke();
      }

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,0,0,0.62)";
      ctx.beginPath();
      for (let c = 0; c <= g.cols; c += g.cellsPerMajor) {
        const x = Math.floor(toTile(border + c * g.cellPx, originX)) + 0.5;
        if (x < -2 || x > size + 2) continue;
        ctx.moveTo(x, 0); ctx.lineTo(x, size);
      }
      for (let r = 0; r <= g.rows; r += g.cellsPerMajor) {
        const y = Math.floor(toTile(border + r * g.cellPx, originY)) + 0.5;
        if (y < -2 || y > size + 2) continue;
        ctx.moveTo(0, y); ctx.lineTo(size, y);
      }
      ctx.stroke();

      // Labels appear only when a cell is big enough to hold one without
      // colliding with its neighbour — the same rule the rendered sheet uses,
      // for the same reason: below that size they are clutter, not information.
      if (cellOnScreen >= 34) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.font = "10px ui-monospace, Consolas, monospace";
        ctx.textBaseline = "top";
        const c0 = Math.max(0, Math.floor((originX - border) / g.cellPx));
        const r0 = Math.max(0, Math.floor((originY - border) / g.cellPx));
        const c1 = Math.min(g.cols - 1, Math.ceil((originX + size * factor - border) / g.cellPx));
        const r1 = Math.min(g.rows - 1, Math.ceil((originY + size * factor - border) / g.cellPx));
        for (let r = r0; r <= r1; r += 1) {
          for (let c = c0; c <= c1; c += 1) {
            const x = toTile(border + c * g.cellPx, originX);
            const y = toTile(border + r * g.cellPx, originY);
            const label = `${c % g.cellsPerMajor}${r % g.cellsPerMajor}`;
            ctx.fillText(label, x + 3, y + 2);
          }
        }
      }
      return tile;
    },
  }))({ tileSize: size, minZoom: 0, maxZoom: maxNative + 2, noWrap: true, pane: "overlayPane" });
}

// --- boot --------------------------------------------------------------------

async function boot() {
  const cfg = await api("/api/map");
  state.cfg = cfg;
  state.grid = {
    border: cfg.border.px,
    cell: cfg.grid.cellPx,
    cols: cfg.grid.cols,
    rows: cfg.grid.rows,
    separator: cfg.grid.separator,
  };

  const maxNative = cfg.tiles.maxZoom;
  const crs = L.extend({}, L.CRS.Simple, {
    transformation: new L.Transformation(
      1 / Math.pow(2, maxNative), 0, 1 / Math.pow(2, maxNative), 0),
  });

  const map = L.map("map", {
    crs,
    preferCanvas: true,           // thousands of building outlines; SVG will not do
    minZoom: 0,
    maxZoom: maxNative + 2,       // past native, upscaled, for placing a vertex precisely
    zoomControl: true,
    attributionControl: false,
  });
  state.map = map;

  const bounds = L.latLngBounds(ll(0, 0), ll(cfg.image.width, cfg.image.height));
  L.tileLayer("/tiles/{z}/{x}/{y}.webp", {
    tileSize: cfg.tiles.tileSize,
    minZoom: 0,
    maxZoom: maxNative + 2,
    maxNativeZoom: maxNative,
    noWrap: true,
    bounds,
  }).addTo(map);

  map.setMaxBounds(bounds.pad(0.05));
  map.fitBounds(bounds);

  const gridLayer = makeGridLayer(cfg).addTo(map);
  state.featureLayer = L.layerGroup().addTo(map);
  state.suppressedLayer = L.layerGroup();
  state.publishedLayer = L.layerGroup().addTo(map);
  state.coverageLayer = L.layerGroup().addTo(map);

  state.draw = createDrawController({
    map,
    grid: state.grid,
    onComplete: onShapeDrawn,
    onSelect: handleSelectionChange,
    onGeometryChange: () => { markDirty(); renderList(); renderInspector(state.draw.selected()); },
    onMarquee: onMarquee,
    onAreaSelect,
    onPick: onPick,
    onStatus: (text) => setStatus(text || defaultStatus()),
  });

  wireLayerToggles(gridLayer);
  wireChrome();
  wireCollapsiblePanels();
  wireSidebarResize();
  wireKeys();

  // Finishing a shape puts the caret in the Note field, which is right: the
  // next thing you want is to type. But the keyboard shortcuts then correctly
  // stand down, so the NEXT polygon could not be finished with Enter — found
  // by driving the tool rather than reading it. Touching the map means you are
  // drawing again, so the field gives up the caret.
  map.getContainer().addEventListener("mousedown", () => {
    const el = document.activeElement;
    if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) el.blur();
  }, true);

  map.on("mousemove", (e) => {
    const [x, y] = px(e.latlng);
    // Show where a region vertex would actually land before it is committed:
    // a snap you only discover after clicking is a snap you cannot trust.
    if (state.draw) state.draw.showSnapHint([x, y]);
    try {
      $("readout-ref").textContent = imagePxToRef(x, y, state.grid);
      $("readout-px").textContent = `px ${Math.round(x)}, ${Math.round(y)}`;
    } catch (err) {
      $("readout-ref").textContent = "—";
      $("readout-px").textContent = err instanceof GridError ? "margin" : "";
    }
  });

  map.on("moveend zoomend", refreshFeatures);

  cfg.kinds.forEach((k) => {
    const opt = () => { const o = document.createElement("option"); o.value = k; o.textContent = k || "—"; return o; };
    $("f-kind").appendChild(opt());
    if (k) $("b-kind").appendChild(opt()); // "" is already the batch form's own "leave as is"
  });

  await loadSession();
  await refreshFeatures();
  await refreshPublished();
  setStatus(defaultStatus());

  // A deliberate testing seam. Drawing, vertex dragging and marquee selection
  // are mouse gestures over a canvas, and a screenshot cannot tell you whether
  // the shape that came out is the shape you meant — only the resulting state
  // can. Exposing it lets the interactions be driven and read back for real
  // instead of inspected by eye. Local single-user tool; nothing here is a
  // surface anyone else can reach.
  window.__gz = {
    state, api, setTool, save, refreshFeatures, refreshPublished,
    onShapeDrawn, onMarquee, onPick, onAreaSelect, handleSelectionChange,
    refreshCoverage,
  };
  $("status-keys").textContent =
    "V select (right-click drag to pan) · L lasso · R region · S site · P pin · B adopt · X remove · "
    + "Shift+click/drag adds to selection · Enter finish · Esc cancel · Del delete · Ctrl+S save";
}

// --- session -----------------------------------------------------------------

async function loadSession() {
  const data = await api("/api/session");
  state.items = data.draft.items || [];
  state.nextLocal = 1 + state.items.reduce(
    (m, it) => Math.max(m, parseInt(String(it.localId).replace(/\D/g, ""), 10) || 0), 0);
  state.draw.clearShapes();
  state.items.forEach((it) => state.draw.addShape(it));
  renderList();
}

function markDirty() {
  state.dirty = true;
  $("save-state").textContent = "unsaved";
  $("save-state").classList.add("is-dirty");
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(save, 1000);
}

async function save() {
  clearTimeout(state.saveTimer);
  try {
    const data = await api("/api/session", { items: state.items });
    // Take the server's derived block back. It is the authority — it has the
    // georeference, so it alone can attach canonical lon/lat and real areas —
    // and without this the list and the filter would be searching fields the
    // browser never fills in.
    const derived = new Map((data.draft.items || []).map((it) => [it.localId, it.derived]));
    state.items.forEach((it) => { if (derived.has(it.localId)) it.derived = derived.get(it.localId); });
    state.dirty = false;
    $("save-state").textContent = "saved " + new Date().toLocaleTimeString();
    $("save-state").classList.remove("is-dirty");
    // The coverage check runs server-side against the SAVED draft, so this is
    // the only moment it can be recomputed and still be telling the truth.
    // Cheap when the layer is off -- refreshCoverage returns immediately.
    refreshCoverage();
    if (data.problems && data.problems.length) {
      setStatus("saved, but: " + data.problems.join("; "), "warn");
    }
  } catch (err) {
    setStatus("could not save: " + err.message, "error");
  }
}

/** Pure construction: a shape (from a single adopt, a hand-drawn polygon, or
 *  one building inside an area-select) becomes a session item. No selection,
 *  no DOM — callers decide when and how many to select, which is the
 *  difference between adopting one building and adopting fifty. */
function buildItem(shape) {
  const item = {
    localId: "item-" + state.nextLocal++,
    tier: shape.tier,
    name: "",
    kind: "",
    note: "",
    tags: [],
    source: shape.source || "drawn",
    sourceFeatureIds: shape.featureIds || [],
    geometry: shape.pointPx
      ? { kind: "point", pointPx: shape.pointPx }
      : { kind: "polygon", ringPx: shape.ringPx },
    derived: {},
  };
  if (shape.realWorldNames && shape.realWorldNames.length) {
    // The real name is research, never canon — it goes in the note as a
    // prompt, clearly marked, so it can inform the invented name without
    // becoming it.
    item.note = `[real-world: ${shape.realWorldNames.join(", ")}]\n`;
  }
  return item;
}

function onShapeDrawn(shape) {
  const item = buildItem(shape);
  state.items.push(item);
  state.draw.addShape(item);
  state.draw.select(item.localId);
  markDirty();
  renderList();
  $("f-note").focus();
}

/**
 * One rectangle or polygon area, selecting EVERYTHING inside it in one pass:
 * drawn/adopted session items already there, AND real, not-yet-adopted
 * buildings, adopted on the spot, each keeping its own real footprint (never
 * merged — that is what plain multi-select Adopt already does, deliberately
 * different). There is no separate "mass adopt" mode for this: one marquee
 * or one lasso is enough to grab a mixed handful of existing and brand-new
 * buildings together, landing pre-selected so the batch panel is right there
 * to take one shared theme across the whole group. The theme is not meant to
 * become each building's FINAL text verbatim — the shared note is a prompt
 * for later, when each one gets read and given its own purpose and
 * description; only Kind and the derived geometry are literally identical
 * across a batch.
 *
 * Real buildings already represented by an existing session item (anywhere
 * in the session, not just inside this area) are never re-adopted — a second
 * pass over the same ground must not create a duplicate.
 */
async function onAreaSelect(areaSpec, additive) {
  const inArea = makeAreaTest(areaSpec);
  const bbox = bboxOfArea(areaSpec);

  // Session items already inside the area -- instant, no server round trip.
  const sessionHits = state.items
    .filter((it) => inArea(...centroidOfGeometry(it.geometry)))
    .map((it) => it.localId);

  let data;
  try {
    data = await api(`/api/features?x0=${bbox.x0}&y0=${bbox.y0}&x1=${bbox.x1}&y1=${bbox.y1}`);
  } catch (err) {
    setStatus("could not query real buildings: " + err.message, "error");
    data = { features: [], refused: false };
  }

  let refusalNote = "";
  if (data.refused) {
    refusalNote = ` (real buildings skipped: ${data.reason})`;
    data = { features: [] };
  }

  const alreadyAdopted = new Set(state.items.flatMap((it) => it.sourceFeatureIds || []));
  const toAdopt = data.features.filter((f) => {
    if (alreadyAdopted.has(f.id)) return false;
    const c = polygonCentroidPx(f.ringPx);
    return inArea(c.x, c.y);
  });

  if (!sessionHits.length && !toAdopt.length) {
    setStatus("nothing in that area" + refusalNote, "warn");
    return;
  }

  if (toAdopt.length) setStatus(`adopting ${toAdopt.length} building${toAdopt.length === 1 ? "" : "s"}…`);
  // Parallel: each adopt is an independent GET-then-write against the
  // building's own id, and the local server is threaded, so there is no
  // reason to make someone wait out a hundred buildings one at a time.
  const results = toAdopt.length
    ? await Promise.allSettled(toAdopt.map((f) => api("/api/adopt", { featureIds: [f.id] })))
    : [];
  const newIds = [];
  results.forEach((r) => {
    if (r.status !== "fulfilled") return; // one bad row must not abort the batch
    const adopted = r.value;
    const item = buildItem({
      tier: "site", ringPx: adopted.ringPx, source: adopted.source,
      featureIds: adopted.featureIds, realWorldNames: adopted.realWorldNames,
    });
    state.items.push(item);
    state.draw.addShape(item);
    newIds.push(item.localId);
  });
  const failed = results.length - newIds.length;

  const combined = [...sessionHits, ...newIds];
  if (newIds.length) markDirty();
  state.draw.selectMany(additive ? [...new Set([...state.draw.selectedList(), ...combined])] : combined);

  const parts = [];
  if (sessionHits.length) parts.push(`${sessionHits.length} already drawn`);
  if (newIds.length) parts.push(`${newIds.length} adopted`);
  if (failed) parts.push(`${failed} failed`);
  setStatus(parts.join(", ") + refusalNote
    + (newIds.length ? " — set a shared theme below and Apply" : ""));
  if (newIds.length) $("b-note").focus();
}

function makeAreaTest(areaSpec) {
  if (areaSpec.kind === "rect") {
    const { x0, y0, x1, y1 } = areaSpec;
    return (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }
  return (x, y) => pointInRing(x, y, areaSpec.ring);
}

function bboxOfArea(areaSpec) {
  if (areaSpec.kind === "rect") return areaSpec;
  const xs = areaSpec.ring.map((p) => p[0]);
  const ys = areaSpec.ring.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}

function centroidOfGeometry(g) {
  if (g.kind === "point") return g.pointPx;
  const c = polygonCentroidPx(g.ringPx);
  return [c.x, c.y];
}

/** Even-odd ray casting. A client-side convenience filter only — never the
 *  authority on a location's own cells (that is core/grid.mjs, server-side,
 *  used when a shape is actually saved). */
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// --- ground truth ------------------------------------------------------------

async function refreshFeatures() {
  if (!$("l-buildings").checked) { state.featureLayer.clearLayers(); state.features.clear(); return; }
  const b = state.map.getBounds();
  const x0 = b.getWest(), x1 = b.getEast();
  const y0 = b.getSouth(), y1 = b.getNorth();
  let data;
  try {
    data = await api(`/api/features?x0=${x0}&y0=${y0}&x1=${x1}&y1=${y1}`);
  } catch (err) {
    $("layer-hint").textContent = "ground truth unavailable: " + err.message;
    return;
  }
  state.featureLayer.clearLayers();
  state.features.clear();

  if (data.refused) {
    $("layer-hint").textContent = "Zoom in to pick or remove real buildings.";
    return;
  }
  data.features.forEach((f) => {
    const layer = L.polygon(ringToLatLngs(f.ringPx), {
      color: "#5c6862", weight: 1, fillOpacity: 0.08, interactive: false,
    });
    state.featureLayer.addLayer(layer);
    const c = polygonCentroidPx(f.ringPx);
    state.features.set(f.id, { ...f, centroid: [c.x, c.y] });
  });
  const parts = [`${data.features.length} real buildings here`];
  if (data.capped) parts.push(`capped at ${data.cap}`);
  if (data.suppressedHere) parts.push(`${data.suppressedHere} removed`);
  $("layer-hint").textContent = parts.join(" · ");
}

// How much slack a real-building click gets, in SCREEN pixels -- converted
// to image pixels at the CURRENT zoom before every pick, the same principle
// draw.js's own PIN_HIT_RADIUS_PX already uses for session-item pins. A
// fixed image-px tolerance breaks the moment you are not at native zoom:
// found live at zoom 4, where one screen pixel already spans two image
// pixels, so the old hard-coded tolerancePx of 2 was under a single real
// screen pixel of forgiveness -- landing exactly on a building rendered at
// 8% fill opacity was close to unclickable at any zoom wide enough to
// survey a scattered mess of them, which is the situation this exists for.
const PICK_RADIUS_SCREEN_PX = 8;

async function onPick(point, tool) {
  const [x, y] = point;
  const p1 = state.map.containerPointToLatLng([0, 0]);
  const p2 = state.map.containerPointToLatLng([1, 0]);
  const imgPxPerScreenPx = Math.abs(p2.lng - p1.lng) || 1;
  let data;
  try {
    data = await api("/api/hit-test", { x, y, tolerancePx: PICK_RADIUS_SCREEN_PX * imgPxPerScreenPx });
  } catch (err) { setStatus(err.message, "error"); return; }

  if (!data.hits.length) {
    setStatus(tool === "adopt"
      ? "no real building here — draw one instead"
      : "no real building here to remove", "warn");
    return;
  }
  const hit = data.hits[0];

  if (tool === "adopt") {
    const adopted = await api("/api/adopt", { featureIds: [hit.id] });
    onShapeDrawn({
      tier: "site",
      ringPx: adopted.ringPx,
      source: adopted.source,
      featureIds: adopted.featureIds,
      realWorldNames: adopted.realWorldNames,
    });
    setStatus(`adopted ${hit.name || "a building"} · ${fmtArea(polygonAreaPx(adopted.ringPx))}`);
  } else {
    await api("/api/suppress", { featureIds: [hit.id], note: "" });
    setStatus(`removed ${hit.name || "a building"} — it is gone from the campaign map`);
    await refreshFeatures();
  }
}

async function onMarquee(rect, asArea) {
  if (asArea) {
    const ring = [
      [rect.x0, rect.y0], [rect.x1, rect.y0], [rect.x1, rect.y1], [rect.x0, rect.y1],
    ];
    const res = await api("/api/suppress", { ringPx: ring, note: "" });
    setStatus(`area removed — everything inside it is gone from the campaign map `
      + `(${res.total} removal rules)`);
  } else {
    const ids = [];
    for (const [id, f] of state.features) {
      const [cx, cy] = f.centroid;
      if (cx >= rect.x0 && cx <= rect.x1 && cy >= rect.y0 && cy <= rect.y1) ids.push(id);
    }
    if (!ids.length) { setStatus("nothing in the box", "warn"); return; }
    await api("/api/suppress", { featureIds: ids, note: "" });
    setStatus(`removed ${ids.length} building${ids.length === 1 ? "" : "s"}`);
  }
  await refreshFeatures();
}

// --- region coverage ---------------------------------------------------------

/**
 * The tessellation check, drawn.
 *
 * Regions are the one tier with a global invariant — cover the whole sheet,
 * once each — and a percentage cannot express how it is failing. Two regions
 * that between them claim the map twice over are "100% claimed". So this
 * draws the two actual failures instead: ground nobody claims, and ground
 * two regions both claim.
 *
 * Measured against the painted sheet and nothing else. The map has diverged
 * from the real world under it deliberately (an airport that is no longer
 * there, a large island redrawn as a small fort), so a check that consulted
 * the ground truth would invent gaps wherever the picture is different on
 * purpose. Sea is ground to be claimed like any other: an ocean is a region.
 */
async function refreshCoverage() {
  if (!$("l-coverage").checked) {
    state.coverageLayer.clearLayers();
    $("coverage-hint").textContent = "";
    return;
  }
  let data;
  try {
    data = await api("/api/coverage");
  } catch (err) {
    $("coverage-hint").textContent = "coverage unavailable: " + err.message;
    return;
  }
  state.coverageLayer.clearLayers();

  // Voids first so overlaps draw on top of them: an overlap is the rarer and
  // more surprising fault, and should never be hidden under a gap's fill.
  data.voids.forEach((v) => {
    const poly = L.polygon(v.ringsPx.map(ringToLatLngs), {
      color: "#d1402a", weight: 1, fillColor: "#d1402a", fillOpacity: 0.30, interactive: true,
    });
    poly.bindTooltip(`unclaimed — ${fmtArea(v.areaPx2)} · ${v.refs.slice(0, 4).join(" ")}`
      + (v.refCount > 4 ? ` +${v.refCount - 4}` : ""), { className: "gz-tip", sticky: true });
    state.coverageLayer.addLayer(poly);
  });
  data.overlaps.forEach((o) => {
    const poly = L.polygon(o.ringsPx.map(ringToLatLngs), {
      color: "#ac8a4d", weight: 2, fillColor: "#e6c98d", fillOpacity: 0.45, interactive: true,
    });
    poly.bindTooltip(`claimed twice — ${fmtArea(o.areaPx2)} · ${o.a} / ${o.b}`,
      { className: "gz-tip", sticky: true });
    state.coverageLayer.addLayer(poly);
  });

  const bits = [data.summary];
  if (data.orphanSiteIds.length) {
    bits.push(`${data.orphanSiteIds.length} item${data.orphanSiteIds.length === 1 ? "" : "s"} in no region`);
  }
  $("coverage-hint").textContent = bits.join(" · ");
  $("coverage-hint").classList.toggle("is-done", !!data.tessellates);
}

// --- published locations -----------------------------------------------------

/**
 * Locations that have already been promoted to data/locations/*.json, shown
 * as a distinct filled layer so a session shows what is already permanent
 * versus what is still a draft. This is the closing half of the loop: a
 * draft item is scratch until promoted, and this is where "promoted" becomes
 * visible on the map, in this session and every one after it.
 */
async function refreshPublished() {
  state.published.clear();
  if (!$("l-published").checked) { state.publishedLayer.clearLayers(); return; }
  let data;
  try {
    data = await api("/api/locations");
  } catch (err) {
    return; // locations may not exist yet on a fresh repo; not an error to show
  }
  state.publishedLayer.clearLayers();
  data.locations.forEach((loc) => {
    state.published.set(loc.id, loc);
    let layer;
    if (loc.tier === "point") {
      layer = L.marker(ll(loc.pointPx[0], loc.pointPx[1]), {
        icon: L.divIcon({ className: "gz-pin gz-pin--published", iconSize: [16, 16] }),
      });
    } else {
      const rings = (loc.ringsPx || []).map(ringToLatLngs);
      layer = L.polygon(rings, {
        color: "#ac8a4d", weight: 2, fillOpacity: 0.28, fillColor: "#e6c98d",
      });
    }
    const label = `${loc.name || "(unnamed)"} · ${loc.tier} · ${loc.status}`;
    layer.bindTooltip(label, { className: "gz-tip", direction: "top", sticky: true });
    state.publishedLayer.addLayer(layer);
  });
}

// --- panels ------------------------------------------------------------------

function itemById(localId) { return state.items.find((it) => it.localId === localId); }

/** The one place selection-count branches: 0 → empty state, 1 → the normal
 *  single-item inspector (unchanged), 2+ → the batch panel. Everything that
 *  changes the selection (a click, a marquee, a lasso, a delete) routes
 *  through here via draw.js's onSelect callback, so the sidebar can never
 *  show a stale count or the wrong panel for what is actually selected. */
function handleSelectionChange(ids) {
  if (ids.length <= 1) renderInspector(ids[0] || null);
  else renderBatchPanel(ids);
}

function renderInspector(localId) {
  disarmBatchDelete();
  const item = localId && itemById(localId);
  $("batch-form").hidden = true;
  $("inspector-empty").hidden = !!item;
  $("inspector-form").hidden = !item;
  renderList();
  if (!item) return;

  $("f-tier").value = item.tier;
  $("f-name").value = item.name || "";
  $("f-kind").value = item.kind || "";
  $("f-note").value = item.note || "";
  $("f-tags").value = (item.tags || []).join(", ");
  // The tier control is only meaningful for a footprint: a pin has no area to
  // be a district with, and offering the change would invite a shape that
  // cannot exist.
  $("f-tier").disabled = item.geometry.kind === "point";

  // A locked item has a real lore entry and reads as settled -- every field
  // that could change or destroy it is disabled until it is unlocked again,
  // the vertex handles it would otherwise grow are skipped entirely (see
  // drawHandles' own check), and Delete refuses it outright rather than
  // silently doing nothing, which is what looked like a bug the last time
  // something silently refused to act here.
  $("f-depth").value = item.depth || "named";
  renderDepthOwes(item);

  const locked = !!item.locked;
  ["f-name", "f-kind", "f-note", "f-tags", "f-depth"].forEach((id) => { $(id).disabled = locked; });
  $("f-tier").disabled = locked || item.geometry.kind === "point";
  $("btn-lock").textContent = locked ? "Unlock" : "Lock";
  $("btn-delete").disabled = locked;
  $("lock-hint").hidden = !locked;

  const facts = $("f-facts");
  facts.innerHTML = "";
  const rows = [];
  const g = item.geometry;
  if (g.kind === "polygon") {
    const refs = refsTouched(g.ringPx, state.grid);
    rows.push(["Cells", refs.length > 8
      ? `${refs.slice(0, 8).join(" ")} +${refs.length - 8}` : refs.join(" ")]);
    rows.push(["Area", fmtArea(polygonAreaPx(g.ringPx))]);
    rows.push(["Points", String(g.ringPx.length)]);
  } else {
    rows.push(["Cell", imagePxToRef(g.pointPx[0], g.pointPx[1], state.grid)]);
  }
  rows.push(["Source", item.source]);
  if (item.sourceFeatureIds && item.sourceFeatureIds.length) {
    rows.push(["Real ids", String(item.sourceFeatureIds.length)]);
  }
  rows.forEach(([k, v]) => {
    const dt = document.createElement("dt"); dt.textContent = k;
    const dd = document.createElement("dd"); dd.textContent = v;
    facts.appendChild(dt); facts.appendChild(dd);
  });
  updatePromoteBox(item);
}

/**
 * 2+ items selected — from a marquee, a lasso, or Shift-clicking
 * several. One Kind/Note/Tags form for the whole group instead of the
 * single-item fields: Note and Tags REPLACE each item's own (that is the
 * point — "a single theme I note up"), Kind only touches items when it is
 * actually set, so leaving it on "— leave as is —" cannot silently blank
 * fifty buildings' classifications at once.
 */
function renderBatchPanel(ids) {
  disarmBatchDelete(); // the armed count is for a specific id list -- a changed selection must re-arm
  $("inspector-empty").hidden = true;
  $("inspector-form").hidden = true;
  $("batch-form").hidden = false;
  const lockedCount = ids.filter((id) => { const it = itemById(id); return it && it.locked; }).length;
  $("batch-count").textContent = `${ids.length} selected`
    + (lockedCount ? ` (${lockedCount} locked)` : "");
  $("b-kind").value = "";
  $("b-note").value = "";
  $("b-tags").value = "";
  $("batch-list").innerHTML = ids.map((id) => {
    const it = itemById(id);
    if (!it) return "";
    return `<li class="${it.locked ? "is-locked" : ""}">${it.locked ? "[locked] " : ""}${escapeHtml(it.name || `(unnamed ${it.tier})`)} — ${escapeHtml(liveRef(it))}</li>`;
  }).join("");
  // "Lock selected" always locks every one of them; "Unlock selected" only
  // once ALL of them already are, so the button's own label never claims an
  // action ("lock" vs "unlock") that would be a no-op for part of the group.
  $("btn-batch-lock").textContent = ids.length && lockedCount === ids.length ? "Unlock selected" : "Lock selected";
  renderList();
}

// Ids currently shown by the filter, in display order -- the range Shift-
// click walks, and the set "select all shown" acts on. Rebuilt by every
// renderList() call, so it is always exactly what is on screen right now.
let visibleIds = [];
// The anchor a Shift-click range is measured from. Set by a plain click or
// a Ctrl/Cmd-click; deliberately NOT moved by Shift-click itself, so
// several Shift-clicks in a row keep extending/shrinking the same range
// rather than re-anchoring on each one.
let lastClickedId = null;

// Which slice of the session the list is showing, and in what order. "todo"
// is the one that matters day to day: the whole working loop is "which of
// these still needs writing", and before this that question could only be
// answered by scrolling the whole list looking for rows without a name.
let statusFilter = "all";   // all | todo | locked
let sortMode = "ref";       // ref | name | added

/** The rows the list should show right now: text filter, status filter and
 *  sort, in that order. Sorting by REFERENCE is the default because this is
 *  a gazetteer -- things near each other on the map belong near each other
 *  in the list, and a session is worked through a district at a time. */
function itemsForList() {
  const q = state.filter.trim().toLowerCase();
  const rows = state.items.filter((item) => {
    if (statusFilter === "todo" && item.locked) return false;
    if (statusFilter === "locked" && !item.locked) return false;
    if (!q) return true;
    const refs = (item.derived && item.derived.refs) || [];
    return `${item.name} ${item.note} ${item.kind} ${refs.join(" ")}`
      .toLowerCase().includes(q);
  });
  // "￿" sorts unnamed items last rather than first: a list of blanks
  // above everything named is the opposite of useful when the point is to
  // read what is already written.
  if (sortMode === "ref") {
    return rows.sort((a, b) => (liveRef(a) || "￿").localeCompare(liveRef(b) || "￿"));
  }
  if (sortMode === "name") {
    return rows.sort((a, b) => (a.name || "￿").localeCompare(b.name || "￿"));
  }
  // Deepest first: the handful of places that were commissioned as scenes or
  // standing locations are the ones worth having at the top of a list of
  // three hundred, and they are exactly the ones hardest to find otherwise.
  if (sortMode === "depth") {
    return rows.sort((a, b) =>
      DEPTHS.indexOf(b.depth || "named") - DEPTHS.indexOf(a.depth || "named")
      || (liveRef(a) || "￿").localeCompare(liveRef(b) || "￿"));
  }
  return rows; // "added" -- state.items order, untouched
}

function updateStatusChips() {
  const total = state.items.length;
  const locked = state.items.filter((it) => it.locked).length;
  $("chip-n-all").textContent = String(total);
  $("chip-n-todo").textContent = String(total - locked);
  $("chip-n-locked").textContent = String(locked);
  document.querySelectorAll("#status-chips .gz-chip").forEach((chip) => {
    chip.classList.toggle("is-on", chip.dataset.status === statusFilter);
  });
}

/**
 * What this location still owes at the depth it claims — live, on every
 * keystroke, from the same module the promotion path uses.
 *
 * Three weights on purpose, per design/location-depth.md: `missing` is the
 * contract and is stated plainly; `overweight` and `orphaned` are advice
 * about the DECLARATION rather than the content, and are phrased as
 * suggestions to promote. A warning that cannot be ignored becomes a warning
 * that is always ignored, so these deliberately do not block anything.
 */
function renderDepthOwes(item) {
  const box = $("depth-owes");
  const result = checkDepth(item);
  const parts = [];

  if (result.missing.length) {
    parts.push(`<p class="gz-owes__line is-missing"><strong>Still owes:</strong> `
      + `${result.missing.map(escapeHtml).join(", ")}</p>`);
  } else {
    parts.push(`<p class="gz-owes__line is-done">Complete for <strong>${escapeHtml(result.depth)}</strong>`
      + ` — ${result.words} words.</p>`);
  }

  result.overweight.forEach((note) => {
    parts.push(`<p class="gz-owes__line is-advice">${escapeHtml(note)}.</p>`);
  });
  if (result.orphaned.length) {
    parts.push(`<p class="gz-owes__line is-advice">Has ${result.orphaned.map(escapeHtml).join(", ")}`
      + `, which ${escapeHtml(result.depth)} does not ask for.</p>`);
  }

  // Only worth saying when it is actually deeper than what is declared --
  // "this already passes as named" is noise on a named location.
  const deepest = suggestDepth(item);
  if (deepest && DEPTHS.indexOf(deepest) > DEPTHS.indexOf(result.depth)) {
    parts.push(`<p class="gz-owes__line is-advice">Already passes as `
      + `<strong>${escapeHtml(deepest)}</strong> — consider promoting it.</p>`);
  }

  box.innerHTML = parts.join("");
}

/** Shown only above `named`. Most of a session is depth 0 by design, so a
 *  badge on every row would be three hundred repetitions of the default and
 *  would bury the handful that were actually commissioned as more. A red
 *  marker means the content has not caught up with the declaration yet. */
function depthBadge(item) {
  const depth = item.depth || "named";
  if (depth === "named") return "";
  const owes = checkDepth(item).missing.length;
  return `<span class="gz-item__depth${owes ? " is-owing" : ""}"`
    + ` title="${owes ? `still owes ${owes} thing${owes === 1 ? "" : "s"}` : "complete"}">`
    + `${escapeHtml(depth)}</span> `;
}

function renderList() {
  const list = $("item-list");
  const sel = new Set(state.draw.selectedList());
  list.innerHTML = "";
  const q = state.filter.trim().toLowerCase();
  let shown = 0;
  visibleIds = [];
  for (const item of itemsForList()) {
    shown += 1;
    visibleIds.push(item.localId);
    const li = document.createElement("li");
    li.className = "gz-item" + (sel.has(item.localId) ? " is-selected" : "")
      + (item.locked ? " is-locked" : "");
    li.innerHTML = `
      <input type="checkbox" class="gz-item__check" ${sel.has(item.localId) ? "checked" : ""}
             aria-label="select ${escapeHtml(item.name || `unnamed ${item.tier}`)}">
      <span class="gz-item__dot" style="background:${TIER_COLOUR[item.tier]}"></span>
      <span class="gz-item__text">
        <span class="gz-item__name" title="${item.locked ? "locked — unlock to rename" : "click to rename"}">${item.name
          ? escapeHtml(item.name)
          : `<em>unnamed ${item.tier}</em>`}</span>
        <span class="gz-item__note" title="${item.locked ? "locked — unlock to edit" : "click to edit"}">${escapeHtml((item.note || "").split("\n")[0] || "no note yet")}</span>
      </span>
      <span class="gz-item__ref">${depthBadge(item)}${item.locked ? '<span class="gz-item__lock">locked</span> ' : ""}${escapeHtml(liveRef(item))}</span>`;

    li.querySelector(".gz-item__check").addEventListener("click", (e) => {
      e.stopPropagation();
      state.draw.toggle(item.localId);
      lastClickedId = item.localId;
    });
    li.querySelector(".gz-item__name").addEventListener("click", (e) => {
      e.stopPropagation();
      if (item.locked) { setStatus("locked — unlock it to rename", "warn"); return; }
      editItemField(item, "name", e.currentTarget, { multiline: false });
    });
    li.querySelector(".gz-item__note").addEventListener("click", (e) => {
      e.stopPropagation();
      if (item.locked) { setStatus("locked — unlock it to edit", "warn"); return; }
      editItemField(item, "note", e.currentTarget, { multiline: true });
    });
    // Plain click: the original "look at this one" gesture -- select and
    // zoom. Ctrl/Cmd-click: toggle just this one in or out, no zoom (what
    // Shift-click used to do, freed up below). Shift-click: range-select
    // from the last plain/Ctrl click to here -- the actual ask, since
    // toggling one at a time was the slow part of selecting "a bunch."
    li.addEventListener("click", (e) => {
      if (e.shiftKey) { rangeSelect(item.localId); return; }
      if (e.ctrlKey || e.metaKey) { state.draw.toggle(item.localId); lastClickedId = item.localId; return; }
      state.draw.select(item.localId);
      zoomTo(item);
      lastClickedId = item.localId;
    });
    list.appendChild(li);
  }
  const filtered = q || statusFilter !== "all";
  $("item-count").textContent = filtered
    ? `${shown}/${state.items.length}` : String(state.items.length);
  if (!shown) {
    const li = document.createElement("li");
    li.className = "gz-list__empty";
    li.textContent = statusFilter === "todo" && !q
      ? "Nothing left to write here — every item in this session is locked."
      : "Nothing matches that filter.";
    list.appendChild(li);
  }
  updateSelectAllControl(sel);
  updateStatusChips();
}

function rangeSelect(toId) {
  const from = lastClickedId ? visibleIds.indexOf(lastClickedId) : -1;
  const to = visibleIds.indexOf(toId);
  if (from === -1 || to === -1) { state.draw.select(toId); lastClickedId = toId; return; }
  const [lo, hi] = from < to ? [from, to] : [to, from];
  state.draw.selectMany(visibleIds.slice(lo, hi + 1));
}

function updateSelectAllControl(sel) {
  const box = $("select-all-visible");
  const label = $("select-all-label");
  if (!box || !label) return;
  if (!visibleIds.length) {
    box.checked = false; box.indeterminate = false; box.disabled = true;
    label.textContent = "select all shown";
    return;
  }
  const selectedVisible = visibleIds.filter((id) => sel.has(id)).length;
  box.disabled = false;
  box.checked = selectedVisible === visibleIds.length;
  box.indeterminate = selectedVisible > 0 && selectedVisible < visibleIds.length;
  label.textContent = selectedVisible
    ? `${selectedVisible}/${visibleIds.length} shown selected`
    : `select all ${visibleIds.length} shown`;
}

/** Turns a Session-list name/note into a live text input on click, for fast
 *  cleanup right after a big adopt -- the Inspector form is still there for
 *  anything bigger than a one-line fix. Deliberately a surgical DOM patch
 *  (this span only), never a full renderList(): a renderList() triggered
 *  from a blur-on-commit would rebuild every row, including one the user is
 *  in the middle of clicking into next -- their click would land on a node
 *  that had just been detached and replaced out from under it. Note only
 *  ever edits its FIRST line here; anything after that is preserved
 *  untouched, since this is a single-line control, not the Inspector's full
 *  textarea. */
function editItemField(item, field, span, { multiline }) {
  if (span.querySelector("input")) return; // already editing; let the input take this click
  const restLines = multiline ? (item.note || "").split("\n").slice(1) : [];
  const currentValue = multiline ? (item.note || "").split("\n")[0] || "" : (item.name || "");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "gz-item__edit";
  input.value = currentValue;
  input.placeholder = multiline ? "add a note…" : `name this ${item.tier}`;
  span.textContent = "";
  span.appendChild(input);
  input.focus();
  input.select();

  let done = false;
  function renderDisplay() {
    if (multiline) span.textContent = (item.note || "").split("\n")[0] || "no note yet";
    else span.innerHTML = item.name ? escapeHtml(item.name) : `<em>unnamed ${item.tier}</em>`;
  }
  function commit() {
    if (done) return;
    done = true;
    if (multiline) item.note = [input.value, ...restLines].join("\n");
    else item.name = input.value;
    markDirty();
    renderDisplay();
    if (state.draw.selected() === item.localId) {
      $("f-name").value = item.name || "";
      $("f-note").value = item.note || "";
      updatePromoteBox(item);
    }
  }
  function cancel() {
    if (done) return;
    done = true;
    renderDisplay();
  }
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); input.blur(); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
  });
  input.addEventListener("click", (e) => e.stopPropagation());
  input.addEventListener("blur", commit);
}

function liveRef(item) {
  try {
    const g = item.geometry;
    if (g.kind === "point") return imagePxToRef(g.pointPx[0], g.pointPx[1], state.grid);
    const c = polygonCentroidPx(g.ringPx);
    return imagePxToRef(c.x, c.y, state.grid);
  } catch (e) { return "—"; }
}

function zoomTo(item) {
  const g = item.geometry;
  if (g.kind === "point") state.map.setView(ll(...g.pointPx), state.cfg.tiles.maxZoom);
  else state.map.fitBounds(L.latLngBounds(ringToLatLngs(g.ringPx)).pad(0.4));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// --- chrome ------------------------------------------------------------------

function wireChrome() {
  document.querySelectorAll(".gz-tool").forEach((btn) => {
    btn.addEventListener("click", () => setTool(btn.dataset.tool));
  });
  $("btn-save").addEventListener("click", save);
  $("f-search").addEventListener("input", (e) => { state.filter = e.target.value; renderList(); });
  document.querySelectorAll("#status-chips .gz-chip").forEach((chip) => {
    chip.addEventListener("click", () => { statusFilter = chip.dataset.status; renderList(); });
  });
  $("f-sort").addEventListener("change", () => { sortMode = $("f-sort").value; renderList(); });
  $("select-all-visible").addEventListener("change", () => {
    const checked = $("select-all-visible").checked;
    const next = new Set(state.draw.selectedList());
    visibleIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
    state.draw.selectMany([...next]);
  });

  const bind = (id, apply) => $(id).addEventListener("input", () => {
    const item = itemById(state.draw.selected());
    if (!item) return;
    apply(item);
    markDirty();
    renderList();
    // Typing a name or a note is exactly what turns an item promotable, so
    // the gate has to react live — found by driving the field rather than
    // reading the code, where "renderList() updates the UI" looked complete.
    updatePromoteBox(item);
    // Name, kind and note are all inputs to the depth check, so what the
    // location still owes has to be recomputed as they are typed, not only
    // when the selection changes.
    renderDepthOwes(item);
  });
  bind("f-name", (it) => { it.name = $("f-name").value; });
  bind("f-note", (it) => { it.note = $("f-note").value; });
  bind("f-kind", (it) => { it.kind = $("f-kind").value; });
  bind("f-depth", (it) => { it.depth = $("f-depth").value; });
  bind("f-tags", (it) => {
    it.tags = $("f-tags").value.split(",").map((s) => s.trim()).filter(Boolean);
  });
  $("f-tier").addEventListener("change", () => {
    const item = itemById(state.draw.selected());
    if (!item) return;
    item.tier = $("f-tier").value;
    state.draw.addShape(item);
    state.draw.select(item.localId);
    markDirty();
    renderList();
  });

  $("btn-delete").addEventListener("click", deleteSelected);
  $("btn-lock").addEventListener("click", () => {
    const item = itemById(state.draw.selected());
    if (!item) return;
    item.locked = !item.locked;
    markDirty();
    renderInspector(item.localId);
    state.draw.restyleOne(item.localId);
  });
  $("btn-zoom").addEventListener("click", () => {
    const item = itemById(state.draw.selected());
    if (item) zoomTo(item);
  });
  $("btn-promote").addEventListener("click", promoteSelected);

  $("btn-batch-apply").addEventListener("click", () => {
    const ids = state.draw.selectedList();
    if (ids.length < 2) return;
    const kind = $("b-kind").value;
    const note = $("b-note").value;
    const tags = $("b-tags").value.split(",").map((s) => s.trim()).filter(Boolean);
    let skipped = 0;
    ids.forEach((id) => {
      const it = itemById(id);
      if (!it) return;
      if (it.locked) { skipped++; return; } // a lore entry is not a "starting point" to overwrite
      if (kind) it.kind = kind;   // blank = leave every item's own kind alone
      it.note = note;             // the whole point: replace with the shared theme
      it.tags = tags;
    });
    markDirty();
    renderBatchPanel(ids);
    setStatus(`applied to ${ids.length - skipped} items`
      + (skipped ? ` — ${skipped} locked item${skipped === 1 ? "" : "s"} kept` : ""));
  });
  $("btn-batch-lock").addEventListener("click", () => {
    const ids = state.draw.selectedList();
    if (!ids.length) return;
    const allLocked = ids.every((id) => { const it = itemById(id); return it && it.locked; });
    const next = !allLocked; // see renderBatchPanel: the button only offers "unlock" once ALL are locked
    ids.forEach((id) => {
      const it = itemById(id);
      if (!it) return;
      it.locked = next;
      state.draw.restyleOne(id);
    });
    markDirty();
    renderBatchPanel(ids);
    setStatus(`${next ? "locked" : "unlocked"} ${ids.length} item${ids.length === 1 ? "" : "s"}`);
  });
  // Two clicks, not a native confirm dialog: that turned out to be silently
  // unanswerable in this app's own preview environment -- it neither
  // blocked nor threw, just always resolved as Cancel, so the
  // button looked like it did nothing at all. A same-surface arm/confirm
  // step needs no dialog API to work, so it can't be swallowed the same way.
  // No auto-revert timer: an earlier one existed "just in case" and only
  // ever added a way to lose the race between reading the button and
  // clicking it again, which looked exactly like the button doing nothing.
  // Changing the selection is what actually has to disarm a stale arm (a
  // click meant for one set of ids must never delete a different set), and
  // that already happens elsewhere, unconditionally, with no clock involved.
  $("btn-batch-delete").addEventListener("click", () => {
    const ids = state.draw.selectedList();
    if (!ids.length) return;
    if (!batchDeleteArmed) { armBatchDelete(ids.length); return; }
    disarmBatchDelete();
    deleteItems(ids);
  });
}

let batchDeleteArmed = false;

function armBatchDelete(count) {
  batchDeleteArmed = true;
  const btn = $("btn-batch-delete");
  btn.textContent = `Click again to delete ${count}`;
  btn.classList.add("is-armed");
}

function disarmBatchDelete() {
  if (!batchDeleteArmed) return;
  batchDeleteArmed = false;
  const btn = $("btn-batch-delete");
  if (btn) { btn.textContent = "Delete selected"; btn.classList.remove("is-armed"); }
}

/**
 * Turn the selected draft item into a real data/locations/*.json entity.
 *
 * Deliberately asks for nothing beyond an id here — no lore text box. Writing
 * a location's actual lore is collaborative work done in conversation (the
 * working loop this tool was built around: draw and note here, then work
 * through the notes together), not a form field. Promoting with an empty note
 * and empty name is refused server-side, so there is always at least a rough
 * note to start that conversation from.
 */
async function promoteSelected() {
  const item = itemById(state.draw.selected());
  if (!item) return;
  const suggested = item.name
    ? item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    : item.tier;
  const id = window.prompt(
    "Location id (kebab-case — this becomes data/locations/<id>.json):", suggested);
  if (!id) return;

  try {
    const res = await api("/api/promote", { localId: item.localId, id });
    setStatus(`promoted → data/locations/${id}.json`);
    await refreshPublished();
    renderInspector(item.localId);
  } catch (err) {
    setStatus("could not promote: " + err.message, "error");
  }
}

function updatePromoteBox(item) {
  const box = $("promote-box");
  const hint = $("promote-hint");
  const btn = $("btn-promote");
  if (!item) { box.hidden = true; return; }
  box.hidden = false;

  const problems = [];
  if (!(item.name || "").trim() && !(item.note || "").trim()) {
    problems.push("needs a name or a note before it can become a real location");
  }
  if (problems.length) {
    hint.textContent = problems.join(" ");
    hint.className = "gz-hint is-blocked";
    btn.disabled = true;
  } else {
    hint.textContent = "Ready. This writes a permanent data/locations/*.json entry.";
    hint.className = "gz-hint is-done";
    btn.disabled = false;
  }
}

/** Delete any number of items at once — the single-item Delete button, the
 *  batch panel's Delete, and the Delete key all funnel through this, so
 *  "delete what's selected" means the same thing everywhere regardless of
 *  how many that turns out to be. Locked items are skipped, never deleted
 *  silently alongside unlocked ones in the same batch -- that is the entire
 *  point of locking one: a note or a click meant for the rest of the
 *  selection must never also take out something that already has a lore
 *  entry, just because it happened to be selected too. */
function deleteItems(ids) {
  if (!ids.length) return;
  const locked = ids.filter((id) => { const it = itemById(id); return it && it.locked; });
  const toDrop = ids.filter((id) => !locked.includes(id));
  if (!toDrop.length) {
    setStatus(`${locked.length === 1 ? "that item is" : "all of those are"} locked — unlock first`, "warn");
    return;
  }
  const dropped = new Set(toDrop);
  state.items = state.items.filter((it) => !dropped.has(it.localId));
  toDrop.forEach((id) => state.draw.removeShape(id));
  state.draw.select(null);
  markDirty();
  const parts = [toDrop.length === 1 ? "deleted" : `deleted ${toDrop.length} items`];
  if (locked.length) parts.push(`${locked.length} locked item${locked.length === 1 ? "" : "s"} kept`);
  setStatus(parts.join(" — "), locked.length ? "warn" : undefined);
}

function deleteSelected() {
  deleteItems(state.draw.selectedList());
}

// --- sidebar shape -----------------------------------------------------------
//
// Both of these exist for the same reason: the session list is the surface
// this tool is actually for, and it was getting whatever height the panels
// above it happened to leave over -- three visible rows out of thirty-six.
// A floor in CSS stops the worst of it; these two let the person working
// decide the rest, because how much room the list versus the map versus a
// lore note deserves changes from minute to minute and only they know which
// minute this is. Both remember what was chosen: re-making the same layout
// decision on every reload is its own small tax.

const COLLAPSE_KEY = "gz.collapsedPanels";
const WIDTH_KEY = "gz.sideWidth";
const SIDE_MIN = 280;
const SIDE_MAX = 900;

/** localStorage is a convenience here, never a source of truth -- it throws
 *  outright in some contexts (private windows, blocked site data), and a
 *  layout preference is not worth taking the page down for. */
function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) { return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* not worth failing over */ }
}

function wireCollapsiblePanels() {
  const collapsed = readStore(COLLAPSE_KEY, {}) || {};
  document.querySelectorAll(".gz-panel").forEach((panel) => {
    const head = panel.querySelector(":scope > .gz-panel__head");
    const body = panel.querySelector(":scope > .gz-panel__body");
    // No body wrapper = not collapsible. The session panel has none on
    // purpose: collapsing the list this tool exists to work through is not
    // a feature, it is a way to lose the list.
    if (!head || !body || !panel.id) return;
    head.classList.add("is-toggle");
    head.setAttribute("role", "button");
    head.setAttribute("tabindex", "0");
    if (collapsed[panel.id]) panel.classList.add("is-collapsed");

    const toggle = () => {
      panel.classList.toggle("is-collapsed");
      collapsed[panel.id] = panel.classList.contains("is-collapsed");
      writeStore(COLLAPSE_KEY, collapsed);
    };
    head.addEventListener("click", toggle);
    head.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });
}

// Past this the sidebar carries the inspector and the list side by side
// instead of stacked -- see .gz-side.is-wide. Below it there is not enough
// room for two readable columns and stacking is the better of the two bad
// options.
const SIDE_TWO_COLUMN = 640;
// The map is the other half of this tool and must not be squeezed to a
// letterbox by a width that was reasonable on a bigger window. Found live:
// a 701px sidebar saved on a wide window left a 278px map on a narrow one,
// and pushed the page into horizontal overflow.
const MAP_MIN = 360;

function setSideWidth(px) {
  const ceiling = Math.max(SIDE_MIN, Math.min(SIDE_MAX, window.innerWidth - MAP_MIN));
  const w = Math.min(ceiling, Math.max(SIDE_MIN, Math.round(px)));
  document.documentElement.style.setProperty("--gz-side-w", w + "px");
  document.querySelector(".gz-side").classList.toggle("is-wide", w >= SIDE_TWO_COLUMN);
  return w;
}

function wireSidebarResize() {
  const handle = $("side-resize");
  const saved = readStore(WIDTH_KEY, null);
  // Always run it, saved or not: this is also what decides one column vs two.
  setSideWidth(typeof saved === "number"
    ? saved
    : document.querySelector(".gz-side").getBoundingClientRect().width);

  handle.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    handle.classList.add("is-dragging");
    let width = null;
    const move = (ev) => { width = setSideWidth(window.innerWidth - ev.clientX); };
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      handle.classList.remove("is-dragging");
      // Leaflet caches the container size; without this the map keeps the
      // old width until something else happens to invalidate it.
      state.map.invalidateSize();
      if (width !== null) writeStore(WIDTH_KEY, width);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  });

  handle.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 40 : 10;
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const current = parseInt(getComputedStyle(document.documentElement)
      .getPropertyValue("--gz-side-w"), 10) || SIDE_MIN;
    const width = setSideWidth(current + (e.key === "ArrowLeft" ? step : -step));
    state.map.invalidateSize();
    writeStore(WIDTH_KEY, width);
  });

  // Re-clamp when the window changes, and deliberately do NOT write the
  // result back: a width squeezed down to fit a small window is not a new
  // preference, and overwriting it would quietly lose the chosen one the
  // first time the tool was opened on a laptop.
  window.addEventListener("resize", () => {
    const requested = readStore(WIDTH_KEY, null);
    setSideWidth(typeof requested === "number"
      ? requested
      : parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue("--gz-side-w"), 10) || SIDE_MIN);
    state.map.invalidateSize();
  });
}

function wireLayerToggles(gridLayer) {
  $("l-grid").addEventListener("change", (e) => {
    e.target.checked ? gridLayer.addTo(state.map) : state.map.removeLayer(gridLayer);
  });
  $("l-buildings").addEventListener("change", refreshFeatures);
  $("l-items").addEventListener("change", (e) => {
    state.items.forEach((it) => e.target.checked
      ? state.draw.addShape(it) : state.draw.removeShape(it.localId));
  });
  $("l-suppressed").addEventListener("change", showSuppressed);
  $("l-published").addEventListener("change", refreshPublished);
  $("l-coverage").addEventListener("change", refreshCoverage);
}

async function showSuppressed(e) {
  if (!e.target.checked) { state.map.removeLayer(state.suppressedLayer); return; }
  const doc = await api("/api/overrides");
  state.suppressedLayer.clearLayers();
  (doc.suppressedAreas || []).forEach((a) => {
    const poly = L.polygon(ringToLatLngs(a.ringPx), {
      color: "#d1402a", weight: 2, dashArray: "4 4", fillOpacity: 0.08,
    });
    poly.bindTooltip(`removed area${a.note ? " — " + a.note : ""} (click to restore)`,
      { className: "gz-tip" });
    poly.on("click", async () => {
      await api("/api/unsuppress", { areaId: a.id });
      await refreshFeatures();
      showSuppressed({ target: { checked: true } });
      setStatus("area restored");
    });
    state.suppressedLayer.addLayer(poly);
  });
  state.suppressedLayer.addTo(state.map);
  setStatus(`${(doc.suppressedFeatures || []).length} buildings and `
    + `${(doc.suppressedAreas || []).length} areas removed from the campaign map`);
}

function setTool(tool) {
  state.draw.setTool(tool);
  document.querySelectorAll(".gz-tool").forEach((b) =>
    b.classList.toggle("is-active", b.dataset.tool === tool));
  setStatus(defaultStatus());
}

function defaultStatus() {
  switch (state.draw && state.draw.tool) {
    case "region": return "Click to place points around a district. Enter finishes, Esc cancels.";
    case "site": return "Click to trace a building or block. Enter finishes, Esc cancels.";
    case "point": return "Click to drop a pin.";
    case "adopt": return "Click a real building to take its actual footprint.";
    case "lasso": return "Draw a polygon around drawn AND real buildings — both get selected (real ones adopted on the spot). Enter to finish.";
    case "remove": return "Click a building to remove it · drag a box for many · Alt+drag removes the whole area.";
    default: return "Click to select, drag a box to select AND adopt everything inside (real buildings included), Shift adds to the selection. Right-click drag to pan. Drag a shape's handles to edit it; right-click a handle to delete that point.";
  }
}

function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text;
  const bar = el.parentElement;
  bar.classList.toggle("is-warn", kind === "warn");
  bar.classList.toggle("is-error", kind === "error");
}

function wireKeys() {
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (typing) {
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
      if (e.key === "Escape") document.activeElement.blur();
      return;
    }
    if (e.key === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); return; }
    const tools = {
      v: "pan", l: "lasso", r: "region", s: "site", p: "point",
      b: "adopt", x: "remove",
    };
    if (tools[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey) {
      setTool(tools[e.key.toLowerCase()]);
      return;
    }
    if (e.key === "Enter") { state.draw.finishDraft(); return; }
    if (e.key === "Escape") { state.draw.cancelDraft(); state.draw.select(null); return; }
    if (e.key === "Backspace") {
      if (state.draw.drafting) { e.preventDefault(); state.draw.undoPoint(); }
      return;
    }
    if (e.key === "Delete") { deleteSelected(); return; }
    const nudge = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (nudge[e.key] && state.draw.selected()) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      state.draw.nudge(nudge[e.key][0] * step, nudge[e.key][1] * step);
    }
  });

  // A drawing session is an hour of small irreversible decisions. Losing it to
  // a closed tab would be the worst thing this tool could do.
  window.addEventListener("beforeunload", (e) => {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });
}

boot().catch((err) => {
  setStatus("failed to start: " + err.message, "error");
  console.error(err);
});
