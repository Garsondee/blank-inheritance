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

async function onPick(point, tool) {
  const [x, y] = point;
  let data;
  try {
    data = await api("/api/hit-test", { x, y, tolerancePx: 2 });
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
  $("batch-count").textContent = `${ids.length} selected`;
  $("b-kind").value = "";
  $("b-note").value = "";
  $("b-tags").value = "";
  $("batch-list").innerHTML = ids.map((id) => {
    const it = itemById(id);
    if (!it) return "";
    return `<li>${escapeHtml(it.name || `(unnamed ${it.tier})`)} — ${escapeHtml(liveRef(it))}</li>`;
  }).join("");
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

function renderList() {
  const list = $("item-list");
  const sel = new Set(state.draw.selectedList());
  list.innerHTML = "";
  const q = state.filter.trim().toLowerCase();
  let shown = 0;
  visibleIds = [];
  for (const item of state.items) {
    const refs = (item.derived && item.derived.refs) || [];
    const hay = `${item.name} ${item.note} ${item.kind} ${refs.join(" ")}`.toLowerCase();
    if (q && !hay.includes(q)) continue;
    shown += 1;
    visibleIds.push(item.localId);
    const li = document.createElement("li");
    li.className = "gz-item" + (sel.has(item.localId) ? " is-selected" : "");
    li.innerHTML = `
      <input type="checkbox" class="gz-item__check" ${sel.has(item.localId) ? "checked" : ""}
             aria-label="select ${escapeHtml(item.name || `unnamed ${item.tier}`)}">
      <span class="gz-item__dot" style="background:${TIER_COLOUR[item.tier]}"></span>
      <span>
        <span class="gz-item__name" title="click to rename">${item.name
          ? escapeHtml(item.name)
          : `<em>unnamed ${item.tier}</em>`}</span>
        <span class="gz-item__note" title="click to edit">${escapeHtml((item.note || "").split("\n")[0] || "no note yet")}</span>
      </span>
      <span class="gz-item__ref">${escapeHtml(liveRef(item))}</span>`;

    li.querySelector(".gz-item__check").addEventListener("click", (e) => {
      e.stopPropagation();
      state.draw.toggle(item.localId);
      lastClickedId = item.localId;
    });
    li.querySelector(".gz-item__name").addEventListener("click", (e) => {
      e.stopPropagation();
      editItemField(item, "name", e.currentTarget, { multiline: false });
    });
    li.querySelector(".gz-item__note").addEventListener("click", (e) => {
      e.stopPropagation();
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
  $("item-count").textContent = q ? `${shown}/${state.items.length}` : String(state.items.length);
  updateSelectAllControl(sel);
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
  });
  bind("f-name", (it) => { it.name = $("f-name").value; });
  bind("f-note", (it) => { it.note = $("f-note").value; });
  bind("f-kind", (it) => { it.kind = $("f-kind").value; });
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
    ids.forEach((id) => {
      const it = itemById(id);
      if (!it) return;
      if (kind) it.kind = kind;   // blank = leave every item's own kind alone
      it.note = note;             // the whole point: replace with the shared theme
      it.tags = tags;
    });
    markDirty();
    renderBatchPanel(ids);
    setStatus(`applied to ${ids.length} items`);
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
 *  how many that turns out to be. */
function deleteItems(ids) {
  if (!ids.length) return;
  const dropped = new Set(ids);
  state.items = state.items.filter((it) => !dropped.has(it.localId));
  ids.forEach((id) => state.draw.removeShape(id));
  state.draw.select(null);
  markDirty();
  setStatus(ids.length === 1 ? "deleted" : `deleted ${ids.length} items`);
}

function deleteSelected() {
  deleteItems(state.draw.selectedList());
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
