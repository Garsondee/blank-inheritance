"use strict";

// --- state -------------------------------------------------------------
const state = {
  tool: "none",            // "none" | "removal" | "site" | "road" | "design-perimeter"
  removals: [],             // [{id, polygon, note, layer}] -- a drawn polygon, not a clicked building
  sites: [],                 // [{id, polygon, note, layer}]
  roads: [],                   // [{id, points, layer}]
  nextLocalId: 1,
  fortWallPolygon: null,        // [{lon,lat}, ...] -- Tool 1's own drawn perimeter, one at a time
  fortWallLayer: null,
};

let map, baseMapLayer, drawnLayer;
let drawControlRemoval, drawControlSite, drawControlRoad, drawControlFortWall;

// --- map setup -----------------------------------------------------------
//
// The background is a real RENDERED IMAGE of the current map (base-map.png,
// built once at server startup -- see server.py's resolve_base_map), not a
// live vector layer queried from the world's ~230k features. That earlier
// approach hit a wall of zoom/truncation edge cases in real use; a static
// image has none of them -- there is no query, no cap, no level-of-detail
// cutoff. Drawing tools still report real lon/lat (Leaflet's own
// projection), independent of the backdrop image.

async function initMap() {
  const baseMap = await (await fetch("/api/base-map")).json();

  map = L.map("map", { zoomControl: true });
  const sw = L.latLng(baseMap.south, baseMap.west);
  const ne = L.latLng(baseMap.north, baseMap.east);
  const frameBounds = L.latLngBounds(sw, ne);

  baseMapLayer = L.imageOverlay(baseMap.url, frameBounds).addTo(map);
  drawnLayer = L.layerGroup().addTo(map);

  map.fitBounds(frameBounds);
  map.setMaxBounds(frameBounds.pad(0.1));
  // Not load-bearing for correctness the way it was with live feature
  // queries (there's no query left to overload), but still the right UX:
  // no point zooming out past the image's own edge into empty grey.
  map.setMinZoom(map.getBoundsZoom(frameBounds));

  setupDrawTools();
  document.getElementById("btn-use-view").addEventListener("click", useCurrentView);
  document.getElementById("btn-use-view-full").addEventListener("click", useCurrentViewFull);
  document.getElementById("base-map-status").style.display = "none";
}

// --- draw tools (removals, sites, roads) ------------------------------------

function setupDrawTools() {
  drawControlRemoval = new L.Draw.Polygon(map, {
    shapeOptions: { color: "#ff5050", weight: 2, fillOpacity: 0.3 },
  });
  drawControlSite = new L.Draw.Polygon(map, {
    shapeOptions: { color: "#ffb84d", weight: 2, fillOpacity: 0.25 },
  });
  // No maxPoints cap: draw one continuous multi-point line for a winding
  // route (double-click or hit Enter to finish) instead of having to chain
  // several separate 2-point segments dot-to-dot -- the server-side join
  // in citymap/editor/roads.py still auto-stitches old-style chains
  // together for anything drawn the old way, but a real multi-point line
  // needs no post-processing at all.
  drawControlRoad = new L.Draw.Polyline(map, {
    shapeOptions: { color: "#4dd0ff", weight: 3 },
  });
  drawControlFortWall = new L.Draw.Polygon(map, {
    shapeOptions: { color: "#c9a24d", weight: 2, fillOpacity: 0.15 },
  });

  // Polygon-typed tools all share e.layerType === "polygon" -- branch on
  // which tool was active when drawing started (setTool only ever enables
  // one draw control at a time).
  map.on(L.Draw.Event.CREATED, (e) => {
    if (e.layerType === "polygon" && state.tool === "removal") onRemovalDrawn(e.layer);
    else if (e.layerType === "polygon" && state.tool === "site") onSiteDrawn(e.layer);
    else if (e.layerType === "polygon" && state.tool === "design-perimeter") onFortWallPerimeterDrawn(e.layer);
    else if (e.layerType === "polyline") onRoadDrawn(e.layer);
  });
}

function polygonToLonLat(layer) {
  return layer.getLatLngs()[0].map((p) => ({ lon: p.lng, lat: p.lat }));
}

function onRemovalDrawn(layer) {
  const id = `removal-${state.nextLocalId++}`;
  const polygon = polygonToLonLat(layer);
  const note = window.prompt("Note for this removal (what's here, or leave blank):", "") || "";
  layer.addTo(drawnLayer);
  state.removals.push({ id, polygon, note, layer });
  renderLists();
}

function onSiteDrawn(layer) {
  const id = `site-${state.nextLocalId++}`;
  const polygon = polygonToLonLat(layer);
  const note = window.prompt("Note for this site (role, or leave blank for 'your call'):", "") || "";
  layer.addTo(drawnLayer);
  state.sites.push({ id, polygon, note, layer });
  renderLists();
}

function onRoadDrawn(layer) {
  const id = `road-${state.nextLocalId++}`;
  const latlngs = layer.getLatLngs().map((p) => ({ lon: p.lng, lat: p.lat }));
  layer.addTo(drawnLayer);
  state.roads.push({ id, points: latlngs, layer });
  renderLists();
}

function onFortWallPerimeterDrawn(layer) {
  // One perimeter at a time for Tool 1 -- drawing a new one replaces the last.
  if (state.fortWallLayer) drawnLayer.removeLayer(state.fortWallLayer);
  layer.addTo(drawnLayer);
  state.fortWallLayer = layer;
  state.fortWallPolygon = polygonToLonLat(layer);
  document.getElementById("btn-fw-generate").disabled = false;
  document.getElementById("fw-status").textContent =
    `perimeter drawn (${state.fortWallPolygon.length} points) -- click Generate preview`;
}

function setTool(tool) {
  if (drawControlRemoval && drawControlRemoval._enabled) drawControlRemoval.disable();
  if (drawControlSite && drawControlSite._enabled) drawControlSite.disable();
  if (drawControlRoad && drawControlRoad._enabled) drawControlRoad.disable();
  if (drawControlFortWall && drawControlFortWall._enabled) drawControlFortWall.disable();
  state.tool = tool;
  document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById(`tool-${tool}`).classList.add("active");
  if (tool === "removal") drawControlRemoval.enable();
  else if (tool === "site") drawControlSite.enable();
  else if (tool === "road") drawControlRoad.enable();
  else if (tool === "design-perimeter") drawControlFortWall.enable();
}

// --- sidebar lists -----------------------------------------------------

function renderLists() {
  document.getElementById("count-removals").textContent = state.removals.length;
  document.getElementById("count-sites").textContent = state.sites.length;
  document.getElementById("count-roads").textContent = state.roads.length;

  const rl = document.getElementById("list-removals");
  rl.innerHTML = "";
  state.removals.forEach((r, i) => {
    rl.appendChild(listItem(`${r.id}${r.note ? " — " + r.note : ""}`, () => {
      drawnLayer.removeLayer(r.layer);
      state.removals.splice(i, 1);
      renderLists();
    }));
  });

  const sl = document.getElementById("list-sites");
  sl.innerHTML = "";
  state.sites.forEach((s, i) => {
    sl.appendChild(listItem(`${s.id}${s.note ? " — " + s.note : ""}`, () => {
      drawnLayer.removeLayer(s.layer);
      state.sites.splice(i, 1);
      renderLists();
    }));
  });

  const rdl = document.getElementById("list-roads");
  rdl.innerHTML = "";
  state.roads.forEach((r, i) => {
    rdl.appendChild(listItem(r.id, () => {
      drawnLayer.removeLayer(r.layer);
      state.roads.splice(i, 1);
      renderLists();
    }));
  });
}

function listItem(label, onRemove) {
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = label;
  const btn = document.createElement("button");
  btn.textContent = "×";
  btn.addEventListener("click", onRemove);
  li.appendChild(span);
  li.appendChild(btn);
  return li;
}

// --- submit --------------------------------------------------------------

async function submitAnnotations() {
  const payload = {
    removals: state.removals.map((r) => ({ id: r.id, polygon: r.polygon, note: r.note })),
    sites: state.sites.map((s) => ({ id: s.id, polygon: s.polygon, note: s.note })),
    roads: state.roads.map((r) => ({ id: r.id, points: r.points })),
  };
  const statusEl = document.getElementById("submit-status");
  statusEl.textContent = "sending...";
  try {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const out = await res.json();
    statusEl.textContent = `saved: ${out.saved}`;
  } catch (err) {
    statusEl.textContent = `error: ${err}`;
  }
}

// --- design tab: Tool 1, Fort Wall ------------------------------------------

function fortWallParams() {
  return {
    wallThicknessM: parseFloat(document.getElementById("fw-wall-thickness").value),
    wallHeightM: parseFloat(document.getElementById("fw-wall-height").value),
    bastionDepthM: parseFloat(document.getElementById("fw-bastion-depth").value),
    flankFraction: parseFloat(document.getElementById("fw-flank-fraction").value),
    pylonSpacingM: parseFloat(document.getElementById("fw-pylon-spacing").value),
    pylonRadiusM: parseFloat(document.getElementById("fw-pylon-radius").value),
    pylonHeightM: parseFloat(document.getElementById("fw-pylon-height").value),
  };
}

async function generateFortWallPreview() {
  if (!state.fortWallPolygon) return;
  const status = document.getElementById("fw-status");
  const result = document.getElementById("fw-result");
  const btn = document.getElementById("btn-fw-generate");
  btn.disabled = true;
  status.textContent = "rendering...";
  try {
    const res = await fetch("/api/design/fort-wall", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polygon: state.fortWallPolygon,
        params: fortWallParams(),
        extentM: parseFloat(document.getElementById("fw-extent").value),
      }),
    });
    const out = await res.json();
    if (out.error) {
      status.textContent = `error: ${out.error}`;
    } else {
      status.textContent = `${out.partCount} parts`;
      result.innerHTML = "";
      const img = document.createElement("img");
      img.src = `${out.url}?t=${Date.now()}`; // cache-bust: same-ish filenames, always want the fresh one
      result.appendChild(img);
    }
  } catch (err) {
    status.textContent = `error: ${err}`;
  } finally {
    btn.disabled = false;
  }
}

async function saveFortWallTemplate() {
  const statusEl = document.getElementById("fw-save-status");
  if (!state.fortWallPolygon) {
    statusEl.textContent = "draw a perimeter first";
    return;
  }
  const name = document.getElementById("fw-save-name").value.trim();
  if (!name) {
    statusEl.textContent = "give the template an id first";
    return;
  }
  statusEl.textContent = "saving...";
  try {
    const res = await fetch("/api/design/save-template", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ polygon: state.fortWallPolygon, params: fortWallParams(), name }),
    });
    const out = await res.json();
    statusEl.textContent = out.error ? `error: ${out.error}` : `saved: ${out.saved}`;
  } catch (err) {
    statusEl.textContent = `error: ${err}`;
  }
}

// --- render panel --------------------------------------------------------

function fillViewFields(lonId, latId, extentId) {
  const c = map.getCenter();
  document.getElementById(lonId).value = c.lng.toFixed(6);
  document.getElementById(latId).value = c.lat.toFixed(6);
  const b = map.getBounds();
  const extentM = Math.round(b.getNorth() - b.getSouth() > 0
    ? (b.getEast() - b.getWest()) * 91000 : 1000); // rough metres/degree, good enough for a starting value
  document.getElementById(extentId).value = extentM;
}

function useCurrentView() {
  fillViewFields("render-lon", "render-lat", "render-extent");
}

function useCurrentViewFull() {
  fillViewFields("render-full-lon", "render-full-lat", "render-full-extent");
}

function onModeChange() {
  const mode = document.getElementById("render-mode").value;
  document.getElementById("render-preview-fields").style.display = mode === "preview" ? "block" : "none";
  document.getElementById("render-overview-fields").style.display = mode === "overview" ? "block" : "none";
  document.getElementById("render-full-fields").style.display = mode === "full" ? "block" : "none";
  // Default "Full" to the area actually on screen, not the frame's fixed
  // centre -- without this, anyone who picks Full and hits Render without
  // touching the crop fields silently renders the entire 12km frame (the
  // "trying to render the entire island" bug report this whole feature
  // exists to fix). Re-syncs every time this tab is switched to; a manual
  // edit survives until the next switch.
  if (mode === "full" && map) useCurrentViewFull();
}

function startRender() {
  const mode = document.getElementById("render-mode").value;
  const params = new URLSearchParams({ mode });
  if (mode === "preview") {
    params.set("lon", document.getElementById("render-lon").value);
    params.set("lat", document.getElementById("render-lat").value);
    params.set("extentM", document.getElementById("render-extent").value);
    params.set("mpp", document.getElementById("render-mpp").value);
  } else if (mode === "overview") {
    params.set("overviewPx", document.getElementById("render-overview-px").value);
  } else {
    params.set("tiles", document.getElementById("render-tiles").value);
    params.set("pxPerTile", document.getElementById("render-px-per-tile").value);
    params.set("supersample", document.getElementById("render-supersample").value);
    if (!document.getElementById("render-full-whole-frame").checked) {
      params.set("lon", document.getElementById("render-full-lon").value);
      params.set("lat", document.getElementById("render-full-lat").value);
      params.set("extentM", document.getElementById("render-full-extent").value);
    }
  }

  const bar = document.getElementById("render-bar");
  const status = document.getElementById("render-status");
  const result = document.getElementById("render-result");
  const btn = document.getElementById("btn-render");
  bar.style.width = "0%";
  status.textContent = "starting...";
  result.innerHTML = "";
  btn.disabled = true;

  const source = new EventSource(`/api/render?${params.toString()}`);

  source.addEventListener("stage", (e) => {
    const d = JSON.parse(e.data);
    status.textContent = d.message;
    if (d.total) bar.style.width = `${(100 * (d.done || 0) / d.total).toFixed(0)}%`;
  });
  source.addEventListener("progress", (e) => {
    const d = JSON.parse(e.data);
    status.textContent = d.message;
    if (d.total) bar.style.width = `${(100 * d.done / d.total).toFixed(0)}%`;
  });
  source.addEventListener("done", (e) => {
    const d = JSON.parse(e.data);
    bar.style.width = "100%";
    status.textContent = `done in ${d.elapsedSeconds.toFixed(1)}s`;
    const img = document.createElement("img");
    img.src = d.url;
    const a = document.createElement("a");
    a.href = d.url;
    a.textContent = "open full image";
    a.target = "_blank";
    result.appendChild(img);
    result.appendChild(a);
    source.close();
    btn.disabled = false;
  });
  source.addEventListener("error", (e) => {
    let message = "connection error";
    try { message = JSON.parse(e.data).message; } catch (_) { /* e.data may be undefined on transport errors */ }
    status.textContent = `error: ${message}`;
    source.close();
    btn.disabled = false;
  });
}

// --- boilerplate wiring ----------------------------------------------------

function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initMap();
  setupTabs();
  document.getElementById("tool-removal").addEventListener("click", () => setTool("removal"));
  document.getElementById("tool-site").addEventListener("click", () => setTool("site"));
  document.getElementById("tool-road").addEventListener("click", () => setTool("road"));
  document.getElementById("tool-none").addEventListener("click", () => setTool("none"));
  document.getElementById("btn-submit").addEventListener("click", submitAnnotations);
  document.getElementById("tool-design-perimeter").addEventListener("click", () => setTool("design-perimeter"));
  document.getElementById("tool-design-none").addEventListener("click", () => setTool("design-none"));
  document.getElementById("btn-fw-generate").addEventListener("click", generateFortWallPreview);
  document.getElementById("btn-fw-save").addEventListener("click", saveFortWallTemplate);
  document.getElementById("render-mode").addEventListener("change", onModeChange);
  document.getElementById("btn-render").addEventListener("click", startRender);
});
