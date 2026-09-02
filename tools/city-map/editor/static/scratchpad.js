"use strict";

// Tool 1 (superseded) was a blind procedural generator the user could only
// react to after an expensive render. This is the replacement: a real
// hand-drawing surface with grid/ortho/symmetry assistance, so the USER
// designs the shape, not the AI. See the plan this was built from
// (crispy-strolling-hearth.md in session records) for the full rationale.
//
// Coordinate spaces in play here, and why: the scratchpad canvas works in
// LOCAL METRES (1 grid unit = a configurable number of metres) with
// Y-UP (north), matching map-template.schema.json's own convention
// ("+Y = the template's own 'north'"). Canvas2D's native pixel space has
// Y increasing DOWNWARD -- every metres<->canvas conversion below flips Y
// explicitly (never implicitly), because getting this backwards would
// leave the live preview internally consistent (matches its own export)
// while silently mirroring relative to frontage_direction/_rotate_translate
// everywhere else in the real pipeline. See canvasToMetres/metresToCanvas.

// --- state -------------------------------------------------------------

const STRUCTURE_TYPE_TAGS = {
  watchtower: { building: "tower", military: "tower" },
  wall: { building: "wall", barrier: "wall" },
  barracks: { building: "barracks", military: "barracks" },
  apron: { building: "apron", surface: "paved" },
  command: { building: "government", military: "office" },
  generic: { building: "yes" },
};

// The Fill tool: `tag` is the real OSM-ish value written as
// building:material (citymap/render.py's BUILDING_MATERIAL_TAG, consumed by
// Style.material_colour) so a filled shape's colour survives into the real
// map, not just this schematic canvas -- `canvasColour` is only the local
// preview's approximation of that (see heightToShade's own disclaimer).
const MATERIAL_STYLES = {
  concrete: { tag: "concrete", canvasColour: "#cec9ba" },
  metal: { tag: "metal", canvasColour: "#7c8286" },
  brick: { tag: "brick", canvasColour: "#a6674f" },
  asphalt: { tag: "asphalt", canvasColour: "#4c4a46" },
  wood: { tag: "wood", canvasColour: "#957147" },
  glass: { tag: "glass", canvasColour: "#8fb2bc" },
};

const AUTOSAVE_KEY = "scratchpad-document-v1";

function blankDocument() {
  return {
    id: null, name: "", description: "",
    shapes: [],
    snap: { gridEnabled: true, gridSizeM: 2, orthoStepDeg: 22.5 },
    symmetry: { mode: "none", mirrorAxis: null, radialCenter: null, radialCount: 4 },
    frontage: null,
    accessHighwayClass: "service",
  };
}

const sp = {
  doc: blankDocument(),
  drawing: null,        // {kind, points:[[x,y],...]} while actively placing a new shape
  settingFrontage: false,
  settingMirrorAxis: null,  // null | [x,y] -- first click of the two-click axis gesture
  settingRadialCenter: false,
  selectedShapeId: null,
  tool: "none",          // "none" | "area" | "line" | "frontage" | "mirror-axis" | "radial-center"
  view: { pxPerM: 8 },    // pan is fixed at canvas-centre = metres-origin for v1; zoom via pxPerM
  nextLocalId: 1,
  mouseM: null,           // last known mouse position, in metres -- for the live "next segment" preview
};

let spCanvas, spCtx;

// --- panel open/close/drag ---------------------------------------------

function initScratchpadPanel() {
  const panel = document.getElementById("scratchpad-panel");
  document.getElementById("btn-open-scratchpad").addEventListener("click", () => {
    panel.classList.add("open");
  });
  document.getElementById("btn-close-scratchpad").addEventListener("click", () => {
    panel.classList.remove("open");
  });

  // Leaflet binds mouse/wheel handlers across its whole container div --
  // without this, dragging a vertex or panning the canvas view near the
  // panel's edge also pans/zooms the real map underneath it. Leaflet's own
  // documented escape hatch (L.DomEvent), not a home-rolled workaround.
  L.DomEvent.disableClickPropagation(panel);
  L.DomEvent.disableScrollPropagation(panel);

  const titlebar = document.getElementById("scratchpad-titlebar");
  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
  titlebar.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = panel.getBoundingClientRect();
    startLeft = rect.left; startTop = rect.top;
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    panel.style.left = `${startLeft + (e.clientX - startX)}px`;
    panel.style.top = `${startTop + (e.clientY - startY)}px`;
  });
  window.addEventListener("mouseup", () => { dragging = false; });

  spCanvas = document.getElementById("scratchpad-canvas");
  spCtx = spCanvas.getContext("2d");
  spCanvas.addEventListener("click", onScratchpadCanvasClick);
  spCanvas.addEventListener("dblclick", (e) => {
    e.preventDefault();
    // THE bug (2026-08-24, direct user report): "it doesn't end at the
    // last point it was drawing, it ends where the mouse was when you hit
    // enter or whatever." A browser dblclick is always preceded by TWO
    // `click` events at (near) the same spot, and onScratchpadCanvasClick
    // already pushed a point for each of them before dblclick ever fires --
    // so finishing on a double-click silently appended one or two extra
    // vertices whereever that double-click happened to land, not where the
    // user's last deliberate single click was. Undo those two clicks' worth
    // of points here so a double-click is purely a "stop, use what I've
    // already placed" signal, matching the Finish button and Enter (below),
    // neither of which have this problem since they never touch the canvas.
    if (sp.drawing) {
      sp.drawing.points = sp.drawing.points.slice(0, Math.max(0, sp.drawing.points.length - 2));
    }
    finishDrawing();
  });
  spCanvas.addEventListener("mousemove", onScratchpadCanvasMouseMove);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && panel.classList.contains("open")) cancelDrawing();
    if (e.key === "Enter" && sp.drawing && panel.classList.contains("open")) {
      e.preventDefault();
      finishDrawing();
    }
  });

  restoreAutosave();
  redrawScratchpad();
  renderShapeList();
}

// --- coordinate transforms (see module header for the Y-flip reasoning) ---

function canvasToMetres(px, py) {
  const cx = spCanvas.width / 2, cy = spCanvas.height / 2;
  return [(px - cx) / sp.view.pxPerM, -(py - cy) / sp.view.pxPerM];
}

function metresToCanvas([xm, ym]) {
  const cx = spCanvas.width / 2, cy = spCanvas.height / 2;
  return [cx + xm * sp.view.pxPerM, cy - ym * sp.view.pxPerM];
}

// --- snap ----------------------------------------------------------------

function snapToGrid([xm, ym]) {
  const g = sp.doc.snap.gridSizeM;
  if (!sp.doc.snap.gridEnabled || g <= 0) return [xm, ym];
  return [Math.round(xm / g) * g, Math.round(ym / g) * g];
}

function snapAngle(prev, candidate, stepDeg) {
  if (stepDeg <= 0) return candidate;
  const dx = candidate[0] - prev[0], dy = candidate[1] - prev[1];
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-6) return candidate;
  const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
  const snapped = Math.round(angleDeg / stepDeg) * stepDeg;
  const r = snapped * Math.PI / 180;
  return [prev[0] + dist * Math.cos(r), prev[1] + dist * Math.sin(r)];
}

// Composition order matters (see the plan): angle-snap direction from the
// previous vertex first using the RAW distance, then grid-snap only when
// there's no previous vertex to measure an angle from (a shape's first
// point, or ortho snap is off). Re-grid-snapping an already angle-snapped
// point would fight the angle constraint -- the two don't generally
// intersect exactly, and landing the angle exactly on 0/45/90 matters more
// visually than landing exactly on-grid.
function snapDrawPoint(rawM) {
  const points = sp.drawing ? sp.drawing.points : [];
  if (points.length > 0 && sp.doc.snap.orthoStepDeg > 0) {
    return snapAngle(points[points.length - 1], rawM, sp.doc.snap.orthoStepDeg);
  }
  return snapToGrid(rawM);
}

// --- symmetry --------------------------------------------------------------

function reflectPoint([x, y], axis) {
  const [ax, ay] = axis.pointM;
  const r = axis.angleDeg * Math.PI / 180;
  const dx = x - ax, dy = y - ay;
  const localX = dx * Math.cos(r) + dy * Math.sin(r);
  const localY = -dx * Math.sin(r) + dy * Math.cos(r);
  const reflectedLocalY = -localY;
  const outX = localX * Math.cos(r) - reflectedLocalY * Math.sin(r);
  const outY = localX * Math.sin(r) + reflectedLocalY * Math.cos(r);
  return [outX + ax, outY + ay];
}

function radialPoint([x, y], [cx, cy], angleDeg) {
  const r = angleDeg * Math.PI / 180;
  const dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)];
}

function newLocalId() { return `shape-${sp.nextLocalId++}`; }

// Regenerates (never appends to) a shape's symmetry echoes -- linked
// symmetry painting, like Procreate/Krita, not a one-time fork. Called
// after every completed shape AND after every edit to an existing one, so
// an echo never drifts out of sync with its source.
function regenerateEchoesFor(sourceShape) {
  sp.doc.shapes = sp.doc.shapes.filter((s) => s.symmetryGroupId !== sourceShape.localId);
  const sym = sp.doc.symmetry;
  if (sym.mode === "mirror" && sym.mirrorAxis) {
    sp.doc.shapes.push({
      ...sourceShape, localId: newLocalId(), isSymmetryEcho: true, symmetryGroupId: sourceShape.localId,
      // reflection flips winding order -- .reverse() keeps it consistent,
      // matters for any future outward-normal calculation (see the plan).
      points: sourceShape.points.map((p) => reflectPoint(p, sym.mirrorAxis)).reverse(),
    });
  } else if (sym.mode === "radial" && sym.radialCenter) {
    for (let i = 1; i < sym.radialCount; i++) {
      const angle = 360 * i / sym.radialCount;
      sp.doc.shapes.push({
        ...sourceShape, localId: newLocalId(), isSymmetryEcho: true, symmetryGroupId: sourceShape.localId,
        points: sourceShape.points.map((p) => radialPoint(p, sym.radialCenter, angle)),
      });
    }
  }
}

function regenerateAllEchoes() {
  const sources = sp.doc.shapes.filter((s) => !s.isSymmetryEcho);
  sp.doc.shapes = sources.slice();
  sources.forEach(regenerateEchoesFor);
}

// --- drawing interaction ---------------------------------------------------

function setSpTool(tool) {
  sp.tool = tool;
  sp.settingFrontage = false;
  sp.settingMirrorAxis = null;
  sp.settingRadialCenter = false;
  if (sp.drawing) cancelDrawing();
  document.querySelectorAll("#scratchpad-controls .tool-btn").forEach((b) => b.classList.remove("active"));
  const btn = { area: "sp-tool-area", line: "sp-tool-line", frontage: "sp-tool-frontage", none: "sp-tool-none",
               fill: "sp-tool-fill",
               "mirror-axis": "sp-tool-mirror-axis", "radial-center": "sp-tool-radial-center" }[tool];
  if (btn) document.getElementById(btn).classList.add("active");
  if (tool === "area" || tool === "line") sp.drawing = { kind: tool === "area" ? "area" : "line", points: [] };
  if (tool === "frontage") sp.settingFrontage = true;
  if (tool === "mirror-axis") sp.settingMirrorAxis = null;
  if (tool === "radial-center") sp.settingRadialCenter = true;
  redrawScratchpad();
}

function cancelDrawing() {
  sp.drawing = null;
  redrawScratchpad();
}

function onScratchpadCanvasMouseMove(e) {
  const rect = spCanvas.getBoundingClientRect();
  sp.mouseM = canvasToMetres(e.clientX - rect.left, e.clientY - rect.top);
  redrawScratchpad();
}

function onScratchpadCanvasClick(e) {
  const rect = spCanvas.getBoundingClientRect();
  const rawM = canvasToMetres(e.clientX - rect.left, e.clientY - rect.top);

  if (sp.settingFrontage) {
    const point = sp.doc.snap.gridEnabled ? snapToGrid(rawM) : rawM;
    // Direction defaults outward from the shape set's own centroid -- a
    // single click is enough for v1; refine with drag-to-rotate later if
    // the default reads wrong for a given asset.
    const c = shapesCentroid();
    const dx = point[0] - c[0], dy = point[1] - c[1];
    const dist = Math.hypot(dx, dy) || 1;
    sp.doc.frontage = { localPoint: point, localDirection: [dx / dist, dy / dist] };
    setSpTool("none");
    autosaveScratchpad();
    return;
  }

  if (sp.settingRadialCenter) {
    sp.doc.symmetry.radialCenter = sp.doc.snap.gridEnabled ? snapToGrid(rawM) : rawM;
    setSpTool("none");
    regenerateAllEchoes();
    redrawScratchpad();
    renderShapeList();
    autosaveScratchpad();
    return;
  }

  if (sp.tool === "mirror-axis") {
    const point = sp.doc.snap.gridEnabled ? snapToGrid(rawM) : rawM;
    if (!sp.settingMirrorAxis) {
      sp.settingMirrorAxis = point;
    } else {
      const [ax, ay] = sp.settingMirrorAxis;
      const angleDeg = Math.atan2(point[1] - ay, point[0] - ax) * 180 / Math.PI;
      sp.doc.symmetry.mirrorAxis = { pointM: sp.settingMirrorAxis, angleDeg };
      setSpTool("none");
      regenerateAllEchoes();
      renderShapeList();
      autosaveScratchpad();
    }
    redrawScratchpad();
    return;
  }

  if (sp.tool === "fill") {
    const material = document.getElementById("sp-material").value;
    // Reverse order: the LAST-drawn shape is visually on top, so an
    // overlapping click should fill it, not whatever was drawn first.
    for (let i = sp.doc.shapes.length - 1; i >= 0; i--) {
      const shape = sp.doc.shapes[i];
      if (shape.kind === "area" && pointInPolygon(rawM, shape.points)) {
        setShapeMaterial(shape, material);
        break;
      }
    }
    return;
  }

  if (!sp.drawing) return;
  const minPoints = sp.drawing.kind === "area" ? 3 : 2;
  // "Connect the dots": a click near the shape's own start point closes and
  // finishes it immediately, instead of adding a redundant near-duplicate
  // vertex there. Checked against the RAW (pre-snap) click position, not a
  // snapped one -- ortho-angle snapping only snaps the ANGLE from the
  // previous point, preserving the raw click DISTANCE, so a long last
  // segment can land several metres from the start even when the user's
  // actual click was genuinely close to it. Every ring in this codebase is
  // already implicitly closed (the first point doubles as the last
  // wherever a shape is consumed -- Template.footprint, apply_construct's
  // Polygon(...) build), so closing here means finishing without adding a
  // point, not adding one at the start's exact coordinates.
  if (sp.drawing.points.length >= minPoints) {
    const [sx, sy] = sp.drawing.points[0];
    const closePx = Math.hypot(rawM[0] - sx, rawM[1] - sy) * sp.view.pxPerM;
    if (closePx < CLOSE_LOOP_PX) {
      finishDrawing();
      return;
    }
  }
  const snapped = snapDrawPoint(rawM);
  sp.drawing.points.push(snapped);
  redrawScratchpad();
}

function structureTypeTags(structureType) {
  return { ...(STRUCTURE_TYPE_TAGS[structureType] || STRUCTURE_TYPE_TAGS.generic) };
}

// Canvas pixels, not metres -- "close enough to the start point" should
// feel consistent on screen regardless of zoom (sp.view.pxPerM).
const CLOSE_LOOP_PX = 10;

function finishDrawing() {
  if (!sp.drawing) return;
  const minPoints = sp.drawing.kind === "area" ? 3 : 2;
  const points = sp.drawing.points;
  // "Connect the dots" (close-to-start auto-finish) happens upstream, in
  // onScratchpadCanvasClick, checking the RAW click position against the
  // shape's start BEFORE any snapping -- see that function for why (a
  // post-snap check here missed most real closing clicks: ortho-angle
  // snapping preserves raw DISTANCE from the previous point while snapping
  // only the ANGLE, so a long last segment can drift several metres past a
  // pixel threshold even when the raw click was genuinely close to the
  // start). By the time points reach this function, closing has already
  // happened or not; nothing here needs to re-check it.
  if (points.length < minPoints) { sp.drawing = null; redrawScratchpad(); return; }

  const structureType = document.getElementById("sp-structure-type").value;
  const shape = {
    localId: newLocalId(), kind: sp.drawing.kind, points,
    heightM: parseFloat(document.getElementById("sp-height").value) || 0,
    structureType,
    tags: structureTypeTags(structureType),
    style: {
      lineStyle: document.getElementById("sp-line-style").value,
      depthHint: document.getElementById("sp-depth-hint").checked,
    },
    thicknessM: parseFloat(document.getElementById("sp-thickness").value) || 2,
    symmetryGroupId: null, isSymmetryEcho: false,
    material: null,  // set later via the Fill tool -- see setShapeMaterial
  };
  sp.doc.shapes.push(shape);
  regenerateEchoesFor(shape);
  sp.drawing = { kind: shape.kind, points: [] };  // stay in the same drawing tool for the next shape
  renderShapeList();
  redrawScratchpad();
  autosaveScratchpad();
}

function deleteShape(localId) {
  const shape = sp.doc.shapes.find((s) => s.localId === localId);
  if (!shape) return;
  // Deleting a SOURCE shape takes its echoes with it; deleting an echo
  // (isSymmetryEcho) just removes that one copy -- a source regenerates
  // echoes on its own next edit, an orphaned echo never would.
  sp.doc.shapes = sp.doc.shapes.filter((s) => s.localId !== localId && s.symmetryGroupId !== localId);
  renderShapeList();
  redrawScratchpad();
  autosaveScratchpad();
}

function pointInPolygon([px, py], points) {
  // Standard ray-casting test -- points is an open ring (no repeated
  // closing vertex), same convention as everywhere else in this file.
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    const crosses = (yi > py) !== (yj > py)
      && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

// The Fill tool. `shape` may be an echo -- fill always resolves to its
// SOURCE and re-links from there, so a mirrored/radial copy can't drift out
// of sync with the shape the user actually clicked (matches how every other
// per-shape edit in this file works: source is authoritative, echoes are
// wholesale-replaced from it, see regenerateEchoesFor).
function setShapeMaterial(shape, material) {
  const source = shape.isSymmetryEcho
    ? sp.doc.shapes.find((s) => s.localId === shape.symmetryGroupId)
    : shape;
  if (!source) return;
  source.material = material || null;
  regenerateEchoesFor(source);
  renderShapeList();
  redrawScratchpad();
  autosaveScratchpad();
}

function shapesCentroid() {
  const pts = sp.doc.shapes.flatMap((s) => s.points);
  if (pts.length === 0) return [0, 0];
  const sx = pts.reduce((a, p) => a + p[0], 0), sy = pts.reduce((a, p) => a + p[1], 0);
  return [sx / pts.length, sy / pts.length];
}

// --- rendering (schematic -- flat top-down shading, not the real renderer) ---

function heightToShade(heightM) {
  // A crude, purely-schematic height cue (darker=taller) -- NOT the real
  // renderer's height-graded fill formula (render_tile's own
  // buildingLow/buildingHigh interpolation, k = height/55), just enough
  // for the live canvas to tell shapes apart while drawing. The "real
  // preview" button is what actually answers "does this match the map".
  const k = Math.min(1.0, heightM / 40.0);
  const lo = 90, hi = 210;
  const v = Math.round(hi - (hi - lo) * k);
  return `rgb(${v},${Math.round(v * 0.92)},${Math.round(v * 0.75)})`;
}

function shapeFillColour(shape) {
  const material = shape.material && MATERIAL_STYLES[shape.material];
  return material ? material.canvasColour : heightToShade(shape.heightM);
}

function drawShapePath(ctx, points) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const [px, py] = metresToCanvas(p);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
}

function redrawScratchpad() {
  if (!spCtx) return;
  const w = spCanvas.width, h = spCanvas.height;
  spCtx.clearRect(0, 0, w, h);
  spCtx.fillStyle = "#0e1a24";
  spCtx.fillRect(0, 0, w, h);

  drawGrid();
  drawSymmetryIndicators();

  // saved shapes
  for (const shape of sp.doc.shapes) {
    spCtx.setLineDash(shape.style && shape.style.lineStyle === "dashed" ? [8, 5]
      : shape.style && shape.style.lineStyle === "dotted" ? [2, 4] : []);
    const selected = shape.localId === sp.selectedShapeId;
    drawShapePath(spCtx, shape.points);
    if (shape.kind === "area") {
      spCtx.closePath();
      spCtx.fillStyle = shapeFillColour(shape);
      spCtx.globalAlpha = shape.isSymmetryEcho ? 0.65 : 0.9;
      spCtx.fill();
      spCtx.globalAlpha = 1.0;
    }
    spCtx.strokeStyle = selected ? "#4d9fff" : (shape.isSymmetryEcho ? "#7a6a4d" : "#c9a24d");
    spCtx.lineWidth = selected ? 2.5 : 1.5;
    spCtx.stroke();
  }
  spCtx.setLineDash([]);

  // in-progress drawing
  if (sp.drawing && sp.drawing.points.length > 0) {
    const preview = sp.mouseM
      ? (sp.drawing.points.length > 0 ? snapDrawPoint(sp.mouseM) : sp.mouseM) : null;
    const pts = preview ? [...sp.drawing.points, preview] : sp.drawing.points;
    drawShapePath(spCtx, pts);
    spCtx.strokeStyle = "#4dd0ff";
    spCtx.lineWidth = 2;
    spCtx.stroke();
    for (const p of sp.drawing.points) {
      const [px, py] = metresToCanvas(p);
      spCtx.beginPath(); spCtx.arc(px, py, 4, 0, 2 * Math.PI);
      spCtx.fillStyle = "#4dd0ff"; spCtx.fill();
    }
  }

  // frontage marker
  if (sp.doc.frontage) {
    const [px, py] = metresToCanvas(sp.doc.frontage.localPoint);
    const [dx, dy] = sp.doc.frontage.localDirection;
    spCtx.beginPath(); spCtx.arc(px, py, 5, 0, 2 * Math.PI);
    spCtx.fillStyle = "#ff9f4d"; spCtx.fill();
    spCtx.beginPath(); spCtx.moveTo(px, py);
    spCtx.lineTo(px + dx * 24, py - dy * 24);  // Y-flip for the direction arrow too
    spCtx.strokeStyle = "#ff9f4d"; spCtx.lineWidth = 2; spCtx.stroke();
  }
}

function drawGrid() {
  const g = sp.doc.snap.gridSizeM;
  if (!sp.doc.snap.gridEnabled || g <= 0) return;
  const w = spCanvas.width, h = spCanvas.height;
  const stepPx = g * sp.view.pxPerM;
  if (stepPx < 4) return;  // too dense to be useful, skip drawing it rather than choke the canvas
  spCtx.strokeStyle = "#1c2733";
  spCtx.lineWidth = 1;
  const [originPx] = [metresToCanvas([0, 0])];
  for (let x = originPx[0] % stepPx; x < w; x += stepPx) {
    spCtx.beginPath(); spCtx.moveTo(x, 0); spCtx.lineTo(x, h); spCtx.stroke();
  }
  for (let y = originPx[1] % stepPx; y < h; y += stepPx) {
    spCtx.beginPath(); spCtx.moveTo(0, y); spCtx.lineTo(w, y); spCtx.stroke();
  }
  // origin cross
  spCtx.strokeStyle = "#2a3744";
  spCtx.beginPath(); spCtx.moveTo(originPx[0], 0); spCtx.lineTo(originPx[0], h); spCtx.stroke();
  spCtx.beginPath(); spCtx.moveTo(0, originPx[1]); spCtx.lineTo(w, originPx[1]); spCtx.stroke();
}

function drawSymmetryIndicators() {
  const sym = sp.doc.symmetry;
  if (sym.mode === "mirror" && sym.mirrorAxis) {
    const { pointM, angleDeg } = sym.mirrorAxis;
    const r = angleDeg * Math.PI / 180;
    const far = 400;
    const a = metresToCanvas([pointM[0] - Math.cos(r) * far, pointM[1] - Math.sin(r) * far]);
    const b = metresToCanvas([pointM[0] + Math.cos(r) * far, pointM[1] + Math.sin(r) * far]);
    spCtx.setLineDash([6, 6]);
    spCtx.strokeStyle = "#a24dff"; spCtx.lineWidth = 1.5;
    spCtx.beginPath(); spCtx.moveTo(a[0], a[1]); spCtx.lineTo(b[0], b[1]); spCtx.stroke();
    spCtx.setLineDash([]);
  } else if (sym.mode === "radial" && sym.radialCenter) {
    const [px, py] = metresToCanvas(sym.radialCenter);
    spCtx.strokeStyle = "#a24dff"; spCtx.lineWidth = 1.5;
    spCtx.beginPath(); spCtx.arc(px, py, 6, 0, 2 * Math.PI); spCtx.stroke();
  }
  if (sp.settingMirrorAxis) {
    const [px, py] = metresToCanvas(sp.settingMirrorAxis);
    spCtx.beginPath(); spCtx.arc(px, py, 4, 0, 2 * Math.PI);
    spCtx.fillStyle = "#a24dff"; spCtx.fill();
  }
}

// --- shape list sidebar (same pattern editor.js already uses) --------------

function spListItem(label, onSelect, onRemove) {
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = label;
  span.style.cursor = "pointer";
  span.addEventListener("click", onSelect);
  const btn = document.createElement("button");
  btn.textContent = "×";
  btn.addEventListener("click", onRemove);
  li.appendChild(span); li.appendChild(btn);
  return li;
}

function renderShapeList() {
  document.getElementById("sp-count-shapes").textContent = sp.doc.shapes.length;
  const ul = document.getElementById("sp-list-shapes");
  ul.innerHTML = "";
  sp.doc.shapes.forEach((shape) => {
    const label = `${shape.kind}${shape.isSymmetryEcho ? " (echo)" : ""} -- ${shape.structureType || ""} `
      + `${shape.heightM}m${shape.material ? ` [${shape.material}]` : ""}`;
    ul.appendChild(spListItem(label,
      () => { sp.selectedShapeId = shape.localId; redrawScratchpad(); },
      () => deleteShape(shape.localId)));
  });
}

// --- autosave ----------------------------------------------------------

function autosaveScratchpad() {
  try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(sp.doc)); } catch (_) { /* storage full/disabled -- not fatal */ }
}

function restoreAutosave() {
  let raw;
  try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch (_) { return; }
  if (!raw) return;
  try {
    const restored = JSON.parse(raw);
    if (restored && Array.isArray(restored.shapes) && restored.shapes.length > 0) {
      sp.doc = restored;
      sp.nextLocalId = 1 + sp.doc.shapes.reduce((max, s) => {
        const n = parseInt((s.localId || "shape-0").split("-")[1], 10);
        return Number.isFinite(n) ? Math.max(max, n) : max;
      }, 0);
      document.getElementById("sp-preview-status").textContent =
        `restored a draft with ${sp.doc.shapes.length} shape(s) from your last session`;
    }
  } catch (_) { /* corrupt autosave -- ignore, start fresh rather than crash the panel */ }
}

// --- server calls: preview / save ---------------------------------------

function shapeExportTags(shape) {
  // The Fill tool's material lives as its own field on the shape (see
  // setShapeMaterial), not baked into shape.tags -- merge it in only here,
  // at the server-payload boundary, so the real render_tile (which reads
  // BUILDING_MATERIAL_TAG) sees it without the schematic canvas/shape-list
  // code needing to keep a second derived copy of tags in sync.
  const material = shape.material && MATERIAL_STYLES[shape.material];
  return material ? { ...shape.tags, "building:material": material.tag } : shape.tags;
}

function documentPayload(extra) {
  return {
    shapes: sp.doc.shapes.map((s) => ({
      kind: s.kind, points: s.points, heightM: s.heightM, tags: shapeExportTags(s),
      depthHint: !!(s.style && s.style.depthHint), thicknessM: s.thicknessM,
    })),
    frontage: sp.doc.frontage,
    accessHighwayClass: sp.doc.accessHighwayClass,
    ...extra,
  };
}

async function generateScratchpadPreview() {
  const status = document.getElementById("sp-preview-status");
  const result = document.getElementById("sp-preview-result");
  if (sp.doc.shapes.length === 0) { status.textContent = "draw at least one shape first"; return; }
  const bounds = map.getBounds();
  const center = map.getCenter();
  status.textContent = "rendering...";
  try {
    const res = await fetch("/api/design/scratchpad-preview", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(documentPayload({
        previewAnchor: { lon: center.lng, lat: center.lat },
        extentM: Math.max(80, Math.round((bounds.getEast() - bounds.getWest()) * 30000)),
      })),
    });
    const out = await res.json();
    if (out.error) { status.textContent = `error: ${out.error}`; return; }
    status.textContent = `${out.partCount} parts, rendered at the current map view`;
    result.innerHTML = "";
    const img = document.createElement("img");
    img.src = `${out.url}?t=${Date.now()}`;
    result.appendChild(img);
  } catch (err) {
    status.textContent = `error: ${err}`;
  }
}

async function saveScratchpadTemplate() {
  const status = document.getElementById("sp-save-status");
  const name = document.getElementById("sp-save-name").value.trim();
  if (!name) { status.textContent = "give the template an id first"; return; }
  if (!sp.doc.frontage) { status.textContent = "set a frontage point first (Set frontage tool)"; return; }
  if (sp.doc.shapes.length === 0) { status.textContent = "draw at least one shape first"; return; }
  status.textContent = "saving...";
  try {
    const res = await fetch("/api/design/save-template", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(documentPayload({ name })),
    });
    const out = await res.json();
    status.textContent = out.error ? `error: ${out.error}` : `saved: ${out.saved}`;
    if (!out.error) refreshPlacementTemplateList();
  } catch (err) {
    status.textContent = `error: ${err}`;
  }
}

// --- placement tab: stamp a saved template onto the real map -----------
//
// The ghost's shape here is NOT computed with the real pyproj/CRS
// transform the server uses (Frame.lonlat_to_map / _instantiate_parts_map_
// space) -- there is no geodesy library loaded client-side, on purpose
// (zero-new-dependency), so this uses a flat-earth local approximation
// (metres -> degrees via a fixed 111320 m/deg-lat scale, corrected for
// latitude on the lon axis). That is fully adequate for a VISUAL ghost
// over a building-sized footprint (tens to low hundreds of metres) -- it
// is never what actually gets placed. The real anchor lon/lat comes
// straight from Leaflet's own mouse position, and the real footprint
// comes from the server's own apply_construct when Confirm is pressed, so
// any tiny approximation error in the ghost's drawn shape has zero effect
// on what actually lands on the map.

let placementTemplates = [];
let placementSelected = null;
let placementGhostLayer = null;
let placementAnchorLatLng = null;
let placementRotationDeg = 0;
let placementActive = false;
let placementDragging = false;
let placementListenersRegistered = false;

async function refreshPlacementTemplateList() {
  const select = document.getElementById("place-template-select");
  try {
    const res = await fetch("/api/templates");
    const out = await res.json();
    placementTemplates = out.templates || [];
    select.innerHTML = "";
    placementTemplates.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.parts.length} parts)`;
      select.appendChild(opt);
    });
  } catch (err) {
    document.getElementById("place-status").textContent = `error loading templates: ${err}`;
  }
}

function localMetresToLatLng(anchorLatLng, xm, ym, rotationDeg) {
  const r = rotationDeg * Math.PI / 180;
  const rx = xm * Math.cos(r) - ym * Math.sin(r);
  const ry = xm * Math.sin(r) + ym * Math.cos(r);
  const metresPerDegLat = 111320;
  const metresPerDegLon = metresPerDegLat * Math.cos(anchorLatLng.lat * Math.PI / 180) || 1;
  return L.latLng(anchorLatLng.lat + ry / metresPerDegLat, anchorLatLng.lng + rx / metresPerDegLon);
}

function templateGeoJson(template, anchorLatLng, rotationDeg) {
  const features = [];
  for (const part of template.parts) {
    const kind = part.kind || "area";
    const ring = part.footprint.map(([x, y]) => {
      const ll = localMetresToLatLng(anchorLatLng, x, y, rotationDeg);
      return [ll.lng, ll.lat];
    });
    if (kind === "area") ring.push(ring[0]);
    features.push({
      type: "Feature", properties: { heightM: part.heightM || 0 },
      geometry: { type: kind === "area" ? "Polygon" : "LineString",
                 coordinates: kind === "area" ? [ring] : ring },
    });
  }
  return { type: "FeatureCollection", features };
}

function drawPlacementGhost() {
  if (placementGhostLayer) { map.removeLayer(placementGhostLayer); placementGhostLayer = null; }
  if (!placementSelected || !placementAnchorLatLng) return;
  const geojson = templateGeoJson(placementSelected, placementAnchorLatLng, placementRotationDeg);
  placementGhostLayer = L.geoJSON(geojson, {
    style: (f) => ({
      color: "#4dd0ff", weight: 2,
      fillColor: "#4dd0ff", fillOpacity: f.geometry.type === "Polygon" ? 0.35 : 0,
    }),
  }).addTo(map);
}

function ensurePlacementListeners() {
  if (placementListenersRegistered) return;
  map.on("mousedown", onMapMouseDownForPlacement);
  map.on("mousemove", onMapMouseMoveForPlacement);
  map.on("mouseup", onMapMouseUpForPlacement);
  placementListenersRegistered = true;
}

function startPlacement() {
  const id = document.getElementById("place-template-select").value;
  placementSelected = placementTemplates.find((t) => t.id === id);
  if (!placementSelected) {
    document.getElementById("place-status").textContent = "pick a template first";
    return;
  }
  ensurePlacementListeners();
  setTool("none");  // disable any active Edit-tab draw tool -- one interactive map mode at a time
  placementActive = true;
  placementAnchorLatLng = null;
  placementRotationDeg = 0;
  document.getElementById("place-status").textContent =
    "click and hold on the map to set position, drag to rotate, release to fix facing";
  document.getElementById("btn-place-check").disabled = true;
  document.getElementById("btn-place-confirm").disabled = true;
  document.getElementById("place-check-result").textContent = "";
}

function cancelPlacement() {
  placementActive = false;
  placementDragging = false;
  placementAnchorLatLng = null;
  if (map.dragging && !map.dragging.enabled()) map.dragging.enable();
  if (placementGhostLayer) { map.removeLayer(placementGhostLayer); placementGhostLayer = null; }
  document.getElementById("place-status").textContent = "";
  document.getElementById("btn-place-check").disabled = true;
  document.getElementById("btn-place-confirm").disabled = true;
  document.getElementById("place-check-result").textContent = "";
}

function onMapMouseDownForPlacement(e) {
  if (!placementActive || !placementSelected) return;
  placementDragging = true;
  placementAnchorLatLng = e.latlng;
  placementRotationDeg = 0;
  drawPlacementGhost();
  map.dragging.disable();  // a click-drag here sets rotation, not a map pan
}

function onMapMouseMoveForPlacement(e) {
  if (!placementActive || !placementDragging || !placementAnchorLatLng) return;
  const dx = e.latlng.lng - placementAnchorLatLng.lng;
  const dy = e.latlng.lat - placementAnchorLatLng.lat;
  if (Math.hypot(dx, dy) > 1e-9) placementRotationDeg = Math.atan2(dy, dx) * 180 / Math.PI;
  drawPlacementGhost();
}

function onMapMouseUpForPlacement() {
  if (!placementActive || !placementDragging) return;
  placementDragging = false;
  map.dragging.enable();
  document.getElementById("place-status").textContent =
    `anchor set, rotation ${placementRotationDeg.toFixed(1)} deg -- Check placement before confirming`;
  document.getElementById("btn-place-check").disabled = false;
}

async function checkPlacement() {
  const result = document.getElementById("place-check-result");
  if (!placementSelected || !placementAnchorLatLng) { result.textContent = "place a ghost on the map first"; return; }
  result.textContent = "checking...";
  result.className = "";
  try {
    const res = await fetch("/api/design/check-placement", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: placementSelected.id,
        anchor: { lon: placementAnchorLatLng.lng, lat: placementAnchorLatLng.lat },
        rotation: placementRotationDeg,
      }),
    });
    const out = await res.json();
    if (out.error) { result.textContent = `error: ${out.error}`; result.className = "place-bad"; return; }
    const lines = [
      `footprint clear: ${out.footprintClear}`,
      `offshore: ${out.isOffshore}`,
      `road ok: ${out.roadOk}${out.roadReason ? " (" + out.roadReason + ")" : ""}`,
    ];
    if (out.footprintConflicts && out.footprintConflicts.length) {
      lines.push(`conflicts: ${out.footprintConflicts.join(", ")}`);
    }
    result.textContent = lines.join(" | ");
    result.className = out.footprintClear ? "place-ok" : "place-bad";
    document.getElementById("btn-place-confirm").disabled = false;
  } catch (err) {
    result.textContent = `error: ${err}`;
  }
}

async function confirmPlacement() {
  const status = document.getElementById("place-status");
  if (!placementSelected || !placementAnchorLatLng) return;
  status.textContent = "placing (this can take a while -- fields are rebuilding)...";
  document.getElementById("btn-place-confirm").disabled = true;
  try {
    const res = await fetch("/api/ops/construct", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template: placementSelected.id,
        anchor: { lon: placementAnchorLatLng.lng, lat: placementAnchorLatLng.lat },
        rotation: placementRotationDeg,
      }),
    });
    const out = await res.json();
    if (out.error) {
      status.textContent = `error: ${out.error}`;
      document.getElementById("btn-place-confirm").disabled = false;
      return;
    }
    status.textContent = `placed as ${out.opId} -- the real base-map render is now stale; `
      + `use the Render tab when you want to see it for real`;
    // Leave the schematic ghost showing where it landed (now real, not a
    // preview) instead of clearing it -- the "instant vector overlay,
    // expensive render deferred to a button" principle applies here too.
    if (placementGhostLayer) placementGhostLayer.setStyle({ color: "#6fcf6f", fillColor: "#6fcf6f" });
    placementActive = false;
    document.getElementById("btn-place-check").disabled = true;
  } catch (err) {
    status.textContent = `error: ${err}`;
    document.getElementById("btn-place-confirm").disabled = false;
  }
}

// --- boilerplate wiring ----------------------------------------------------

window.addEventListener("DOMContentLoaded", () => {
  initScratchpadPanel();
  refreshPlacementTemplateList();
  document.getElementById("btn-place-refresh").addEventListener("click", refreshPlacementTemplateList);
  document.getElementById("btn-place-start").addEventListener("click", startPlacement);
  document.getElementById("btn-place-check").addEventListener("click", checkPlacement);
  document.getElementById("btn-place-confirm").addEventListener("click", confirmPlacement);
  document.getElementById("btn-place-cancel").addEventListener("click", cancelPlacement);
  document.getElementById("sp-tool-area").addEventListener("click", () => setSpTool("area"));
  document.getElementById("sp-tool-line").addEventListener("click", () => setSpTool("line"));
  document.getElementById("sp-tool-frontage").addEventListener("click", () => setSpTool("frontage"));
  document.getElementById("sp-tool-fill").addEventListener("click", () => setSpTool("fill"));
  document.getElementById("sp-tool-none").addEventListener("click", () => setSpTool("none"));
  document.getElementById("sp-tool-mirror-axis").addEventListener("click", () => setSpTool("mirror-axis"));
  document.getElementById("sp-tool-radial-center").addEventListener("click", () => setSpTool("radial-center"));
  document.getElementById("sp-btn-finish").addEventListener("click", finishDrawing);
  document.getElementById("sp-btn-preview").addEventListener("click", generateScratchpadPreview);
  document.getElementById("sp-btn-save").addEventListener("click", saveScratchpadTemplate);

  document.getElementById("sp-grid-enabled").addEventListener("change", (e) => {
    sp.doc.snap.gridEnabled = e.target.checked; redrawScratchpad(); autosaveScratchpad();
  });
  document.getElementById("sp-grid-size").addEventListener("input", (e) => {
    sp.doc.snap.gridSizeM = parseFloat(e.target.value) || 0; redrawScratchpad(); autosaveScratchpad();
  });
  document.getElementById("sp-ortho-step").addEventListener("change", (e) => {
    sp.doc.snap.orthoStepDeg = parseFloat(e.target.value) || 0; autosaveScratchpad();
  });
  document.getElementById("sp-symmetry-mode").addEventListener("change", (e) => {
    sp.doc.symmetry.mode = e.target.value;
    document.getElementById("sp-mirror-controls").style.display = e.target.value === "mirror" ? "block" : "none";
    document.getElementById("sp-radial-controls").style.display = e.target.value === "radial" ? "block" : "none";
    regenerateAllEchoes();
    renderShapeList();
    redrawScratchpad();
    autosaveScratchpad();
  });
  document.getElementById("sp-radial-count").addEventListener("input", (e) => {
    sp.doc.symmetry.radialCount = Math.max(2, parseInt(e.target.value, 10) || 4);
    regenerateAllEchoes();
    renderShapeList();
    redrawScratchpad();
    autosaveScratchpad();
  });
});
