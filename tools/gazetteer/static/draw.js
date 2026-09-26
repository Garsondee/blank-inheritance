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
// A settled colour, distinct from every tier's own -- locked reads as "done,"
// not as a fourth tier, so it deliberately doesn't reuse region's brass-ish
// tone or site/point's vermilion.
const LOCKED = { color: "#3d6b47", weight: 2, fillOpacity: 0.22, dashArray: null };
const DRAFT_STYLE = { color: "#4fc8d8", weight: 2, dashArray: "6 5", fillOpacity: 0.12 };
// District focus mode: everything outside the focused district fades toward
// the map itself rather than disappearing outright -- disappearing would
// lose the "where am I relative to everything else" context focus mode is
// supposed to add, not take away.
const DIMMED = { color: "#8a7c61", weight: 1, fillOpacity: 0.04, opacity: 0.35 };

export const TIER_COLOUR = {
  region: TIER_STYLE.region.color,
  site: TIER_STYLE.site.color,
  point: TIER_STYLE.point.color,
};

export function ll(x, y) { return L.latLng(y, x); }
export function px(latlng) { return [latlng.lng, latlng.lat]; }
export function ringToLatLngs(ring) { return ring.map(([x, y]) => ll(x, y)); }

/** A polygon's rings for Leaflet: outer first, then any generated holes.
 *  Every setLatLngs on a polygon must go through this. Passing the outer ring
 *  on its own silently fills in the island in the middle of a bay region, and
 *  it fills it in only on screen, so the data stays right and the picture
 *  stops matching it. */
export function polyLatLngs(g) {
  return [ringToLatLngs(g.ringPx), ...((g.holesPx || []).map(ringToLatLngs))];
}

export function createDrawController(opts) {
  const {
    map, grid, onComplete, onSelect, onGeometryChange, onMarquee, onPick, onStatus,
    onAreaSelect, onBisect, onLog,
  } = opts;
  // A no-op when the caller doesn't want logging, so every call site below
  // can call log(...) unconditionally without an existence check.
  const log = onLog || (() => {});

  const shapeLayer = L.layerGroup().addTo(map);
  const handleLayer = L.layerGroup().addTo(map);
  const draftLayer = L.layerGroup().addTo(map);
  // Where the next region vertex would land if placed now.
  const snapLayer = L.layerGroup().addTo(map);

  const shapes = new Map();     // localId -> { item, layer }
  let tool = "pan";
  let drafting = null;          // { points: [[x,y]], line, poly }
  // Region and Site only -- how a click-drag on the map turns into a ring.
  // "polygon" is the original click-to-add-a-point session (startDraft /
  // redrawDraft / finishDraft, unchanged below); "rect" and "circle" are
  // each a single mousedown-drag-mouseup gesture (see the mousedown
  // handler's own branch for them) that never touches `drafting` at all.
  // A deliberate global preference, not reset when the tool changes, so
  // drawing "lots of buildings" in a row -- asked for directly, after
  // hand-clicking a circle's worth of points one at a time turned out to
  // be exactly the tedious, error-prone workflow that led to losing a
  // whole batch of them -- never means re-picking Circle before every
  // single one.
  let draftShapeMode = "polygon";
  //: How many points approximate a hand-drawn circle -- enough to look
  //: genuinely round at any zoom this map is worked at, few enough that
  //: editing one afterward (dragging a single vertex, per the now-fixed
  //: hole/weld/snap machinery) is still picking one point out of a
  //: reasonable ring, not one out of hundreds.
  const CIRCLE_DRAFT_POINTS = 32;
  // Selection is a SET, not a single id, so a marquee or a lasso can put
  // many items in the batch panel at once. Every call site that only ever
  // wanted one item still gets that via selected() below; nothing about the
  // single-item path (vertex handles, the inspector) had to change shape.
  let selectedIds = new Set();
  let marquee = null;
  // The set of localIds to render dimmed rather than at full strength --
  // "district focus" mode. null means no focus is active (everything at
  // normal strength); an empty Set would ambiguously mean "focus on nothing
  // in particular, dim everything," which is never what a caller means.
  let dimmedIds = null;
  // Consumed by the very next "click": Leaflet fires a synthesised click
  // after a real drag completes (mouseup runs first; the click, if one
  // follows at all, comes after). select/pan's click handler is already a
  // permanent no-op for exactly this reason -- but adopt/remove's is NOT,
  // since a genuine standalone click is its whole point. Found live: a
  // drag-box Remove correctly suppressed every building inside it, then the
  // trailing click ALSO ran onPick at the release point, silently removing
  // one more building the box may never have covered, and overwriting the
  // correct "removed N buildings" status with a single-building message
  // that hid the real result. Set true only when up() just finished an
  // actual drag (never the small-movement click-passthrough case, which
  // must keep reaching the click handler normally).
  let suppressNextClick = false;

  // --- snapping to existing region borders ---------------------------------
  //
  // Regions are the only tier with a global invariant: cover the sheet once
  // each, no gaps, no overlaps. That is not achievable by eye. Two districts
  // meant to share a border, drawn freehand, miss each other by a pixel or
  // three every single time, and the result is a hairline sliver the coverage
  // check then dutifully reports forever.
  //
  // So a new region vertex snaps to the borders already drawn: to an existing
  // VERTEX first (a corner shared by three districts should be one point, not
  // three), and failing that to the nearest point on an existing EDGE (a new
  // district butting against the middle of an old one's side). The shared
  // border is then genuinely shared -- identical coordinates, not merely
  // close ones -- and the gap cannot exist.
  //
  // Only regions are snap targets, and only while drawing a region: a site
  // traced inside a district has no reason to weld itself to the district's
  // outline.

  //: In SCREEN pixels, converted per-call, because a fixed image-px radius is
  //: a different-sized target at every zoom -- the same lesson the real
  //: building hit-test learned.
  //:
  //: Was 12 -- reported directly, backed by the client log: "every time I
  //: need to add a vertex to each individually and move each individually,
  //: that's what I've been doing for ages." Real data explains why: on The
  //: Open Sea's own unsnapped placements genuinely near South Waterfront
  //: (not just open water far from any neighbour, which correctly never
  //: snaps to anything), 18 of 20 sat within 40px of the boundary they were
  //: clearly aimed at -- past what a 12px radius could ever catch from a
  //: real mouse. The number is not a new guess: it is
  //: scanNearbyRegionPoints's own preview radius (see below), which was
  //: ALREADY showing a candidate as "nearby" up to 40px out while the
  //: actual snap only committed within 12 -- a promise the preview made and
  //: the commit broke, on every single drag wider than 12px and narrower
  //: than 40. One radius now, so the two can never again disagree about
  //: what "nearby" means.
  const SNAP_RADIUS_SCREEN_PX = 40;

  function imgPxPerScreenPx() {
    const a = map.containerPointToLatLng([0, 0]);
    const b = map.containerPointToLatLng([1, 0]);
    return Math.abs(b.lng - a.lng) || 1;
  }

  /** Nearest point on segment ab to p, clamped to the segment's ends. */
  function closestOnSegment(px_, py_, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    if (dx === 0 && dy === 0) return [ax, ay];
    let t = ((px_ - ax) * dx + (py_ - ay) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));
    return [ax + t * dx, ay + t * dy];
  }

  /** Where a region vertex placed at (x, y) should actually land, or null to
   *  leave it where it was put. Vertices beat edges at equal distance: a
   *  corner is a stronger statement of intent than a side. */
  function snapRegionPoint(x, y, { excludeId = null } = {}) {
    const tolerance = SNAP_RADIUS_SCREEN_PX * imgPxPerScreenPx();
    let bestVertex = null;
    let bestVertexDist = Infinity;
    let bestEdge = null;
    let bestEdgeDist = Infinity;

    for (const [id, entry] of shapes) {
      if (id === excludeId) continue;
      if (entry.item.tier !== "region") continue;
      const ring = entry.item.geometry && entry.item.geometry.ringPx;
      if (!ring || ring.length < 3) continue;

      for (let i = 0; i < ring.length; i++) {
        const [vx, vy] = ring[i];
        const d = Math.hypot(vx - x, vy - y);
        if (d < bestVertexDist) { bestVertexDist = d; bestVertex = { x: vx, y: vy, id }; }

        const [nx, ny] = ring[(i + 1) % ring.length];
        const [cx, cy] = closestOnSegment(x, y, vx, vy, nx, ny);
        const de = Math.hypot(cx - x, cy - y);
        // segIndex travels with the match so a caller that wants to split
        // this edge (see splitTargetEdge) can splice the new point in at
        // the right place without re-searching the ring for it.
        if (de < bestEdgeDist) { bestEdgeDist = de; bestEdge = { x: cx, y: cy, id, segIndex: i }; }
      }
    }

    if (bestVertex && bestVertexDist <= tolerance) {
      return { x: bestVertex.x, y: bestVertex.y, kind: "vertex", id: bestVertex.id };
    }
    if (bestEdge && bestEdgeDist <= tolerance) {
      return { x: bestEdge.x, y: bestEdge.y, kind: "edge", id: bestEdge.id, segIndex: bestEdge.segIndex };
    }
    return null;
  }

  /** Every OTHER region's ring vertex currently sitting on top of (x, y) --
   *  a shared tessellation corner, not merely a nearby one. Dragging a
   *  vertex away from a point it currently shares with a neighbour,
   *  without also moving the neighbour's own copy, is exactly how a drag
   *  creates a sliver: the two borders were identical, and now they are
   *  merely close.
   *
   *  A tight tolerance on purpose, but not THIS tight -- 0.05px only ever
   *  caught points snapping had made bit-for-bit equal, and a live check
   *  of the real 56-region session found that was the minority: 865
   *  vertex pairs sit under 1px apart, a further 89 sit 3-4px apart, and
   *  then it goes sparse (under 10 pairs per pixel-bucket) out past that
   *  -- a real gap, not a smooth falloff. Those two clusters are borders
   *  meant to be shared, hand-tidied to two different levels of
   *  precision before this tool could weld anything; the sparse tail
   *  past 5px is genuinely distinct, unrelated corners that only happen
   *  to be somewhat close. 5px sits in that gap: wide enough to catch
   *  both real clusters, nowhere near wide enough to catch the
   *  unrelated tail. */
  const WELD_TOLERANCE_PX = 5;
  function findWeldedVertices(entry, x, y) {
    const welded = [];
    for (const [id, other] of shapes) {
      if (id === entry.item.localId) continue;
      if (other.item.tier !== "region") continue;
      const ring = other.item.geometry && other.item.geometry.ringPx;
      if (!ring) continue;
      for (let i = 0; i < ring.length; i++) {
        if (Math.abs(ring[i][0] - x) < WELD_TOLERANCE_PX &&
            Math.abs(ring[i][1] - y) < WELD_TOLERANCE_PX) {
          welded.push({ entry: other, index: i });
        }
      }
    }
    return welded;
  }

  //: 22.5 degrees in radians -- the increment every segment AFTER the
  //: first snaps its ANGLE to. Relative to the first segment's own angle,
  //: not absolute compass directions: a building whose front wall runs at
  //: whatever odd angle the road outside it does still gets clean 90/45
  //: degree corners relative to ITS OWN first wall, which is what
  //: "square" actually means for that building, not for the map.
  const ANGLE_SNAP_STEP = Math.PI / 8;

  // Held to place a point at its raw, un-snapped angle -- the escape
  // hatch for the rare corner that genuinely isn't 22.5-degrees-clean.
  // Same keydown/keyup/blur shape as snapSuspended (Alt) above on
  // purpose: blur clears it too, so alt-tabbing away mid-draft can never
  // leave angle-snapping stuck suspended.
  let angleSnapSuspended = false;
  window.addEventListener("keydown", (e) => { if (e.key === "Shift") angleSnapSuspended = true; });
  window.addEventListener("keyup", (e) => { if (e.key === "Shift") angleSnapSuspended = false; });
  window.addEventListener("blur", () => { angleSnapSuspended = false; });

  /** Asked for directly: "the second line automatically snaps to 22.5
   *  degree increments of the angles of the first line, making it easier
   *  to draw buildings and do things like 90 degree corners." The FIRST
   *  segment (drafting.points[0] -> [1]) is always placed exactly where
   *  clicked -- there is nothing to measure an angle FROM yet -- and only
   *  Region/Site's own polygon mode does this at all; Lasso and Bisect
   *  draw a selection area and a cut, not a building, and keep the raw
   *  point untouched. Only the DIRECTION from the last placed point
   *  changes; the distance the cursor actually travelled never does. */
  function angleSnapPoint(p) {
    if (!drafting || drafting.points.length < 2) return p;
    if ((tool !== "region" && tool !== "site") || draftShapeMode !== "polygon") return p;
    if (angleSnapSuspended) return p;
    const pts = drafting.points;
    const baseAngle = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]);
    const last = pts[pts.length - 1];
    const dx = p[0] - last[0], dy = p[1] - last[1];
    const dist = Math.hypot(dx, dy);
    if (dist < 0.5) return p; // nothing to snap the angle of yet
    const steps = Math.round((Math.atan2(dy, dx) - baseAngle) / ANGLE_SNAP_STEP);
    const snappedAngle = baseAngle + steps * ANGLE_SNAP_STEP;
    return [last[0] + dist * Math.cos(snappedAngle), last[1] + dist * Math.sin(snappedAngle)];
  }

  /** The snapped position for a draft click, or the raw one. Rounding happens
   *  AFTER snapping, and a snapped vertex is copied through unrounded, or
   *  round1 would reintroduce the very sub-pixel mismatch this prevents.
   *  Angle-snapped FIRST, then (Region only) checked against nearby
   *  borders -- the two are complementary, not competing: angle-snap
   *  picks the direction, the border check can still pull the exact same
   *  point onto a neighbour's edge if it also happens to land there. */
  function placeDraftPoint(rawP) {
    const p = angleSnapPoint(rawP);
    if (tool !== "region" && tool !== "bisect") return [round1(p[0]), round1(p[1])];
    if (snapSuspended) return [round1(p[0]), round1(p[1])];
    const snapped = snapRegionPoint(p[0], p[1]);
    if (!snapped) return [round1(p[0]), round1(p[1])];
    report(snapped.kind === "vertex"
      ? "snapped to an existing corner — the border is now shared exactly"
      : "snapped onto an existing border");
    return [snapped.x, snapped.y];
  }

  /** Region/Site's OTHER two draft shapes -- a single mousedown-drag-
   *  mouseup gesture each (see the mousedown handler), never the multi-
   *  click `drafting` session polygon mode uses. Only "polygon" is a real
   *  UI state machine; asking for these two by name is deliberate --
   *  callers that pass an unrecognised mode are almost certainly a typo,
   *  not a fourth mode nobody built yet. */
  function setDraftShapeMode(mode) {
    if (mode !== "polygon" && mode !== "rect" && mode !== "circle") return;
    draftShapeMode = mode;
  }

  /** An axis-aligned rectangle from two opposite corners -- four points,
   *  a consistent winding (image px, y down: top-left first, then
   *  clockwise), the same shape a person would get from Adopt's own
   *  marquee if a marquee could BECOME a building instead of only
   *  selecting one. */
  function rectRing(a, b) {
    const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
    const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  }

  /** `n` points evenly spaced around `center` at the radius `edge` sits at
   *  -- a real circle, not the dozen-or-so hand-clicked points around a
   *  rough curve this tool exists to replace. Asked for directly, after
   *  exactly that hand-clicking turned out to be the tedious, error-prone
   *  workflow behind losing a whole batch of drawn bunkers: "I want a new
   *  tool for drawing regions and buildings, a circle tool." */
  function circleRing(center, edge, n = CIRCLE_DRAFT_POINTS) {
    const r = Math.hypot(edge[0] - center[0], edge[1] - center[1]);
    const ring = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      ring.push([round1(center[0] + r * Math.cos(a)), round1(center[1] + r * Math.sin(a))]);
    }
    return ring;
  }

  /** `snapRegionPoint`'s winning-target search, plus a second pass
   *  collecting every OTHER vertex within the SAME radius, for the preview
   *  ring shown mid-drag -- one scan over the same ring data instead of
   *  two, for the live vertex-EDITING drag only (see snapEditedVertex, the
   *  only caller). Asked for directly: "it would be nice to see other
   *  vertexes on other districts/regions nearby ... when I move them
   *  close." Fresh region-drawing (placeDraftPoint, showSnapHint) still
   *  calls plain snapRegionPoint -- it has no use for the preview list and
   *  shouldn't pay the extra pass for it.
   *
   *  One radius for both the preview and the actual snap on purpose --
   *  see SNAP_RADIUS_SCREEN_PX's own comment for the bug two DIFFERENT
   *  radii here actually caused: a candidate shown as "nearby" that the
   *  drag then could not actually land on. */
  function scanNearbyRegionPoints(x, y, excludeId) {
    const tolerance = SNAP_RADIUS_SCREEN_PX * imgPxPerScreenPx();
    let bestVertex = null, bestVertexDist = Infinity;
    let bestEdge = null, bestEdgeDist = Infinity;
    const nearby = [];

    for (const [id, entry] of shapes) {
      if (id === excludeId) continue;
      if (entry.item.tier !== "region") continue;
      const ring = entry.item.geometry && entry.item.geometry.ringPx;
      if (!ring || ring.length < 3) continue;

      for (let i = 0; i < ring.length; i++) {
        const [vx, vy] = ring[i];
        const d = Math.hypot(vx - x, vy - y);
        if (d <= tolerance) nearby.push({ x: vx, y: vy });
        if (d < bestVertexDist) { bestVertexDist = d; bestVertex = { x: vx, y: vy, id }; }

        const [nx, ny] = ring[(i + 1) % ring.length];
        const [cx, cy] = closestOnSegment(x, y, vx, vy, nx, ny);
        const de = Math.hypot(cx - x, cy - y);
        if (de < bestEdgeDist) { bestEdgeDist = de; bestEdge = { x: cx, y: cy, id, segIndex: i }; }
      }
    }

    let snapped = null;
    if (bestVertex && bestVertexDist <= tolerance) {
      snapped = { x: bestVertex.x, y: bestVertex.y, kind: "vertex", id: bestVertex.id };
    } else if (bestEdge && bestEdgeDist <= tolerance) {
      snapped = { x: bestEdge.x, y: bestEdge.y, kind: "edge", id: bestEdge.id, segIndex: bestEdge.segIndex };
    }
    return { snapped, nearby };
  }

  /** The same snap `placeDraftPoint` gives a freshly-drawn region vertex,
   *  extended to EDITING one that already exists -- dragging a vertex or a
   *  midpoint-insert handle on an already-drawn region. Found missing live,
   *  the moment Ingram went to hand-tidy a border: a fresh region snapped
   *  onto its neighbours as it was drawn, but touching up an old one up
   *  afterwards placed the point at the raw mouse position every time,
   *  which is exactly the few-pixel miss that leaves a border merely CLOSE
   *  rather than genuinely shared. `excludeId` is the entry's own localId,
   *  not optional here the way it is for fresh drawing -- a vertex must
   *  never snap onto one of its own ring's other points. `marker` -- the
   *  handle actually being dragged -- gets a `gz-vertex--snapped` class
   *  while snapped, so confirmation shows on the THING the eye is already
   *  on, not only on a separate ring that a fast drag can miss entirely:
   *  asked for directly, "I'm never sure that I've snapped things together
   *  and not left a sliver between them." The class only gets ADDED, never
   *  removed and re-added, while the drag stays snapped -- classList.add is
   *  a no-op on a class already present, which is what keeps the CSS pop
   *  animation firing once per snap engaged rather than every throttled
   *  tick of the drag. */
  function snapEditedVertex(entry, p, marker) {
    const clearSnappedClass = () => {
      if (marker) {
        const el = marker.getElement();
        if (el) el.classList.remove("gz-vertex--snapped");
      }
    };
    if (entry.item.tier !== "region" || snapSuspended) {
      snapLayer.clearLayers();
      clearSnappedClass();
      lastSnapInfo = null;
      return [round1(p[0]), round1(p[1])];
    }
    const { snapped, nearby } = scanNearbyRegionPoints(p[0], p[1], entry.item.localId);
    // Same marker showSnapHint draws while drawing a fresh region -- shown
    // here too, mid-drag, so a snap about to happen is visible before the
    // handle is released rather than a surprise discovered afterward.
    snapLayer.clearLayers();
    // Every other vertex within reach, drawn faint and small -- visible
    // BEFORE anything is close enough to actually snap, so landing on one
    // is never a surprise sprung only at the last pixel. Skipped for
    // whichever one is about to WIN (drawn next, brighter, on top of these
    // rather than blended into them).
    for (const c of nearby) {
      if (snapped && c.x === snapped.x && c.y === snapped.y) continue;
      snapLayer.addLayer(L.marker(ll(c.x, c.y), {
        icon: L.divIcon({ className: "gz-snap-candidate", iconSize: [14, 14] }),
        interactive: false,
        zIndexOffset: 1100,
      }));
    }
    if (!snapped) { clearSnappedClass(); lastSnapInfo = null; return [round1(p[0]), round1(p[1])]; }
    snapLayer.addLayer(L.marker(ll(snapped.x, snapped.y), {
      icon: L.divIcon({ className: "gz-snap gz-snap--" + snapped.kind, iconSize: [36, 36] }),
      interactive: false,
      zIndexOffset: 1200,
    }));
    if (marker) {
      const el = marker.getElement();
      if (el) el.classList.add("gz-vertex--snapped");
    }
    // Read once at dragend for that gesture's one log entry, and (for an
    // edge snap) to drive splitTargetEdge -- never for anything that
    // affects behaviour per-tick, and never logged per-tick either, which
    // at 60-throttled calls a second would drown out everything else.
    lastSnapInfo = {
      kind: snapped.kind, targetId: snapped.id,
      segIndex: snapped.segIndex, x: snapped.x, y: snapped.y,
    };
    report(snapped.kind === "vertex"
      ? "snapped to an existing corner — the border is now shared exactly"
      : "snapped onto an existing border");
    return [snapped.x, snapped.y];
  }

  /** After a drag settles with the point snapped onto ANOTHER region's
   *  EDGE (not one of its existing vertices), insert a real, matching
   *  vertex into that region's own ring at the exact snapped coordinate --
   *  so one drag creates a genuinely shared corner on both sides, instead
   *  of requiring a second, separate midpoint-insert on the neighbour
   *  afterward. Requested directly ("yes, build it") after this was
   *  proposed as the fix for the two-manual-steps friction visible in the
   *  client log. Runs once, at dragend only, from the caller's own
   *  `lastSnapInfo` -- never per drag tick, or every frame of the gesture
   *  would insert another point. A snap onto an existing VERTEX needs no
   *  split: the two rings are already coincident there, which is exactly
   *  what findWeldedVertices is for on the next drag. */
  function splitTargetEdge(snapInfo) {
    if (!snapInfo || snapInfo.kind !== "edge") return;
    const target = shapes.get(snapInfo.targetId);
    if (!target) return;
    const ring = target.item.geometry && target.item.geometry.ringPx;
    if (!ring || snapInfo.segIndex == null || snapInfo.segIndex >= ring.length) return;
    ring.splice(snapInfo.segIndex + 1, 0, [snapInfo.x, snapInfo.y]);
    target.layer.setLatLngs(polyLatLngs(target.item.geometry));
    forceRedraw([target.layer]);
    onGeometryChange(target.item);
    if (selected() === target.item.localId) drawHandles();
  }

  function showSnapHint(p) {
    // A vertex/midpoint drag in progress already owns snapLayer via its own
    // snapEditedVertex call and has nothing to gain from this map-level
    // hint running too. This fires from the MAP's own "mousemove", which
    // keeps firing for the whole drag regardless of tool -- left unguarded,
    // it was a SECOND, entirely unthrottled full-region scan running
    // alongside the throttled one, on every native mousemove event.
    if (editingVertex) return;
    snapLayer.clearLayers();
    // Region/Site's polygon mode gets a live rubber-band to wherever the
    // NEXT click would actually land, through the EXACT SAME
    // placeDraftPoint a real click uses -- angle-snapped, then (Region)
    // border-snapped -- so what is shown is provably what would be
    // committed, never a preview that quietly lies. This replaces the
    // plain marker below entirely while a draft is in progress; before
    // the first point exists there is nothing yet to draw a rubber band
    // FROM, so that marker still does its own job of hinting where the
    // very first click would land.
    if (drafting && (tool === "region" || tool === "site") && draftShapeMode === "polygon") {
      redrawDraft(placeDraftPoint(p));
      return;
    }
    if (tool !== "region" && tool !== "bisect") return;
    if (snapSuspended) return;
    const snapped = snapRegionPoint(p[0], p[1]);
    if (!snapped) return;
    snapLayer.addLayer(L.marker(ll(snapped.x, snapped.y), {
      icon: L.divIcon({
        className: "gz-snap gz-snap--" + snapped.kind,
        iconSize: [36, 36],
      }),
      interactive: false,
      zIndexOffset: 1200,
    }));
  }

  // --- drawing -------------------------------------------------------------

  function startDraft(first) {
    drafting = { points: [first], line: null };
    map.getContainer().style.cursor = "crosshair";
    redrawDraft();
  }

  // A bisect cut is a LINE with two open ends, never a closed shape -- the
  // one draft tool that draws something other than a polygon/lasso area.
  function isLineTool() { return tool === "bisect"; }

  /** `previewPoint`, when given, is appended to the COMMITTED points for
   *  this one render only -- drafting.points itself is never touched, so
   *  Esc/Backspace/Enter all keep acting on exactly what has actually
   *  been clicked. This is what turns a plain "here are the points so
   *  far" redraw into a live rubber band: showSnapHint calls this on
   *  every mousemove with wherever the NEXT click would land, so the
   *  shape visibly forms before it is committed, not only after. */
  function redrawDraft(previewPoint) {
    draftLayer.clearLayers();
    if (!drafting) return;
    const pts = previewPoint ? [...drafting.points, previewPoint] : drafting.points;
    const minPoints = isLineTool() ? 2 : 3;
    if (pts.length >= 2) {
      draftLayer.addLayer(isLineTool()
        ? L.polyline(ringToLatLngs(pts), DRAFT_STYLE)
        : L.polygon(ringToLatLngs(pts), DRAFT_STYLE));
    }
    pts.forEach(([x, y], i) => {
      draftLayer.addLayer(L.marker(ll(x, y), {
        icon: L.divIcon({ className: "gz-vertex", iconSize: [10, 10] }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 900 + i,
      }));
    });
    if (pts.length >= minPoints) {
      const verb = tool === "lasso" ? "select + adopt everything inside"
        : isLineTool() ? "cut" : "finish";
      if (isLineTool()) {
        // A cut is a path, not an area -- "cells touched" and "area
        // enclosed" are both polygon concepts, and cellCoverage actively
        // throws below 3 points, which a two-point cut (bisect's own
        // valid minimum) always is. Found live: every real attempt to use
        // Bisect crashed here, uncaught, the moment the second point
        // landed -- "a polygon ring needs at least 3 distinct points,"
        // thrown from inside a status-line readout a cut was never going
        // to need in the first place.
        report(`${pts.length} points — Enter to ${verb}, Esc to cancel, Backspace to undo a point`);
      } else {
        const refs = refsTouched(pts, grid);
        report(`${pts.length} points · ${refs.length} cell${refs.length === 1 ? "" : "s"}`
          + ` · ${fmtArea(polygonAreaPx(pts))} — Enter to ${verb}, Esc to cancel, Backspace to undo a point`);
      }
    } else {
      const hint = tool === "lasso"
        ? "draw a lasso around drawn AND real buildings — both get selected"
        : isLineTool() ? "click along the region's own edge to start the cut"
        : "need at least 3";
      report(`${pts.length} point${pts.length === 1 ? "" : "s"} — ${hint}`);
    }
  }

  function finishDraft() {
    const minPoints = isLineTool() ? 2 : 3;
    if (!drafting || drafting.points.length < minPoints) {
      report(isLineTool() ? "a cut needs at least two points, both on the region's own edge"
        : "a polygon needs at least three points");
      return;
    }
    const ring = drafting.points.slice();
    cancelDraft();
    if (tool === "lasso") {
      // Both drawn/adopted items already in `shapes` AND real, not-yet-
      // adopted ground-truth buildings -- one lasso, one selection, no
      // separate "mass adopt" mode. onAreaSelect owns both halves; draw.js
      // hands off only the geometry.
      onAreaSelect({ kind: "polygon", ring }, false);
      return;
    }
    if (isLineTool()) {
      // Which region gets cut is deliberately NOT inferred from which
      // border the line's ends happen to touch -- onBisect owns that
      // decision (the currently-selected region), so a cut drawn a few
      // pixels short of the boundary still applies to the shape the
      // person clearly meant, not silently to whichever different region
      // the snap radius happened to reach instead.
      onBisect(ring);
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
      // Holes are generated by the region tessellator, not drawn, so they are
      // rendered but never given handles: `drawHandles` and every drag path
      // still work on g.ringPx alone. Leaflet takes outer-ring-then-holes in
      // one array, the same order coverage.py parses.
      layer = L.polygon(polyLatLngs(g), TIER_STYLE[item.tier] || TIER_STYLE.site);
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
    if (!entry) return;
    // Dimming loses to selection, never the other way round: a shape you
    // have deliberately clicked on must read as selected even if it happens
    // to sit outside whatever district is currently focused (picking one
    // building from elsewhere to compare against the focused district is a
    // real, ordinary thing to want to do).
    const dimmed = dimmedIds && dimmedIds.has(id) && !selectedIds.has(id);
    if (entry.item.geometry.kind === "polygon") {
      entry.layer.setStyle(selectedIds.has(id) ? SELECTED
        : dimmed ? DIMMED
        : entry.item.locked ? LOCKED
        : (TIER_STYLE[entry.item.tier] || TIER_STYLE.site));
    }
    const el = entry.layer._icon; // pins restyle via their marker element, if any
    if (el) {
      el.classList.toggle("gz-pin--selected", selectedIds.has(id));
      el.classList.toggle("gz-pin--dimmed", dimmed);
    }
  }

  /** District focus mode: dim every shape whose id is NOT in `keepIds`.
   *  `null` clears focus entirely -- see `dimmedIds`'s own comment for why
   *  that is not the same thing as an empty set. */
  function setFocus(keepIds) {
    if (keepIds === null) {
      dimmedIds = null;
    } else {
      const keep = new Set(keepIds);
      dimmedIds = new Set([...shapes.keys()].filter((id) => !keep.has(id)));
    }
    restyleAll();
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
    // onSelect is app.js's reaction to the selection changing (inspector,
    // batch panel) -- cosmetic next to what selectMany itself just did
    // (the actual selection, restyled shapes, real handles on the map).
    // A bug in that reaction must never be able to propagate back into
    // WHOEVER called select()/selectMany() and silently cancel whatever
    // they were about to do next. Found live, the hard way: onShapeDrawn
    // calls select(item.localId) BEFORE markDirty() (so the freshly drawn
    // shape starts out selected, ready to name) -- a stray
    // ReferenceError thrown from inside onSelect during an unrelated
    // in-progress edit meant markDirty() on the very next line never ran
    // at all, not just late. Every hand-drawn shape finished during that
    // window rendered correctly, sat there looking saved, and was never
    // once scheduled to actually reach disk -- reported as "a whole bunch
    // of circles... disappeared from the system without me asking for
    // that to happen." The bug that threw is fixed; this is what stops
    // the NEXT one from being able to cause the same silent, unrecoverable
    // loss of hand-drawn (never real-world, never re-adoptable) geometry.
    if (opts.emit === false) return;
    try {
      onSelect([...selectedIds]);
    } catch (err) {
      log("selection_reaction_error", {
        message: String((err && err.message) || err),
        stack: err && err.stack,
      });
    }
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

  /** Runs `fn` with its latest call's arguments at most once per animation
   *  frame, instead of on every native "drag"/"mousemove" event. A real
   *  mouse (or a trackpad, at an even higher rate) fires those far faster
   *  than the screen repaints, and both snapEditedVertex and showSnapHint
   *  scan every vertex and edge of every region in the session on each
   *  call -- cheap once per frame, laggy enough to read as "unusable" once
   *  the session held 50+ regions and either ran on every single one of
   *  those events instead. A dragged handle's own on-screen position is
   *  unaffected either way -- Leaflet moves it natively before this ever
   *  runs -- so throttling only delays the snap check, the polygon outline
   *  redraw, and the status text, never the handle tracking the cursor. */
  function rafThrottle(fn) {
    let scheduled = false;
    let latestArgs = [];
    return (...args) => {
      latestArgs = args;
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => { scheduled = false; fn(...latestArgs); });
    };
  }

  // Set for the whole span of a vertex/midpoint drag. showSnapHint (below)
  // checks this to stand down for that span -- see its own comment.
  let editingVertex = false;

  // Alt held = place this point freely, no snapping. Asked for directly:
  // in a crowded corner the always-on snap radius can catch a DIFFERENT
  // nearby vertex or edge than the one actually meant, and the placed
  // point jumps between candidates as the cursor drifts a few pixels
  // rather than tracking it smoothly -- exactly backwards from the fine,
  // deliberate positioning a real hand-tidying pass needs. Snapping stays
  // the default (most placements DO want it); this is the escape hatch
  // for the rare point that must land somewhere else. Cleared on blur too,
  // so alt-tabbing away mid-drag can never leave it stuck suspended.
  let snapSuspended = false;
  // Set by snapEditedVertex's most recent call; read once at dragend for
  // that gesture's one log entry. See snapEditedVertex's own comment.
  let lastSnapInfo = null;
  window.addEventListener("keydown", (e) => { if (e.key === "Alt") snapSuspended = true; });
  window.addEventListener("keyup", (e) => { if (e.key === "Alt") snapSuspended = false; });
  window.addEventListener("blur", () => { snapSuspended = false; });

  /** Force every touched layer's Canvas renderer to redraw right now,
   *  synchronously, instead of waiting for the requestAnimationFrame this
   *  map's default renderer normally batches redraws through. That
   *  batching depends on the browser actually delivering an animation
   *  frame promptly, which is not guaranteed the instant a drag, delete or
   *  nudge finishes -- an occluded or backgrounded window, the browser
   *  throttling rAF under load -- and until one arrives, the canvas keeps
   *  showing the shape from before the edit. Reported live as "regions
   *  don't update their appearance... I need to refresh to get the
   *  current shapes."
   *
   *  A tempting further step -- hard-resetting canvas.width to force the
   *  browser to treat the whole thing as fresh -- was tried and reverted.
   *  Setting .width, even to its own value, throws away the ENTIRE 2D
   *  context state, including the devicePixelRatio scale transform
   *  Leaflet applies once and only reapplies on a real resize/zoom -- so
   *  every layer rendered at half size in the top-left quarter of the
   *  canvas until the next zoom forced Leaflet to redo that setup
   *  properly. Confirmed live and reverted; do not reintroduce it. */
  function forceRedraw(layers) {
    const renderers = new Set();
    for (const layer of layers) {
      if (layer && layer._renderer) renderers.add(layer._renderer);
    }
    for (const renderer of renderers) {
      if (renderer._redrawRequest) cancelAnimationFrame(renderer._redrawRequest);
      renderer._redrawRequest = null;
      if (typeof renderer._redraw === "function") renderer._redraw();
    }
  }

  function drawHandles() {
    handleLayer.clearLayers();
    // Vertex handles only make sense for exactly one shape at a time -- with
    // several selected there is no single ring to edit, and the batch panel
    // (name/note/kind/delete, applied to every one at once) is what those
    // selections are for instead.
    const entry = selected() && shapes.get(selected());
    if (!entry) return;
    // A locked SITE or POINT has a real lore entry and reads as settled --
    // no handles to grab means no accidental reshape, the same protection
    // Delete gets from the same flag. A locked REGION is deliberately
    // exempted: its border is shared tessellation geometry that keeps
    // needing to be tidied against its neighbours for as long as Ingram
    // keeps drawing more of them, which is not optional maintenance the
    // way reshaping a building's footprint is -- see server.py's own save
    // path, which resyncs a promoted region's data/locations/ file to
    // match on every save for exactly this reason, geometry edited here or
    // not. Found live: locked was blocking the only thing region-tidying
    // tools exist to do.
    if (entry.item.locked && entry.item.tier !== "region") return;
    const g = entry.item.geometry;

    if (g.kind === "point") {
      const [x, y] = g.pointPx;
      const m = L.marker(ll(x, y), {
        icon: L.divIcon({ className: "gz-vertex", iconSize: [26, 26] }),
        draggable: true, zIndexOffset: 1000,
      });
      m.on("drag", () => {
        const p = px(m.getLatLng());
        g.pointPx = [round1(p[0]), round1(p[1])];
        entry.layer.setLatLng(m.getLatLng());
      });
      m.on("dragend", () => { forceRedraw([entry.layer]); onGeometryChange(entry.item); });
      handleLayer.addLayer(m);
      return;
    }

    // Every ring this shape actually has: the outer boundary, plus one per
    // hole. A hole is a closed loop exactly like the outer ring -- same
    // minimum of 3 points, same drag/insert/delete gestures -- so it gets
    // the same two handle passes below, not a separate editor. Found live:
    // holesPx was drawn (see polyLatLngs, which already renders it, and
    // nudge(), which already shifts it) but never given handles at all, so
    // a region with a hole cut into it -- another district sitting inside
    // that hole, a real courtyard, a lake -- had a hole boundary nobody
    // could grab. Reported directly: "I can't edit those shapes where
    // holes have been cut into regions/districts."
    const rings = [{ ring: g.ringPx, holeIndex: null },
      ...(g.holesPx || []).map((hole, holeIndex) => ({ ring: hole, holeIndex }))];

    rings.forEach(({ ring, holeIndex }) => {
      ring.forEach(([x, y], i) => {
        const m = L.marker(ll(x, y), {
          icon: L.divIcon({ className: "gz-vertex", iconSize: [26, 26] }),
          draggable: true, zIndexOffset: 1000,
        });
        // Every OTHER region's vertex currently welded to this one -- see
        // findWeldedVertices. Captured once, at the start of the gesture:
        // re-scanning mid-drag would find nothing after the first pixel of
        // movement, since the whole point is that two points stop being
        // coincident the moment only one of them moves. Works unchanged for
        // a hole vertex -- findWeldedVertices matches on COORDINATES, not on
        // which ring they came from, so a hole boundary that coincides with
        // a neighbouring region's own outer boundary (a district sitting
        // inside this one's hole, the ordinary case) welds exactly the same
        // way a shared outer corner does.
        let welded = [];
        m.on("dragstart", () => {
          editingVertex = true;
          welded = findWeldedVertices(entry, ring[i][0], ring[i][1]);
          log("vertex_dragstart", {
            itemId: entry.item.localId, itemName: entry.item.name, tier: entry.item.tier,
            ringIndex: i, holeIndex, isMidpoint: false, startPx: [ring[i][0], ring[i][1]],
            weldedIds: welded.map((w) => w.entry.item.localId),
          });
        });
        const applyDrag = () => {
          const p = px(m.getLatLng());
          ring[i] = snapEditedVertex(entry, p, m);
          // The handle itself jumps to the snapped point too, not just the
          // polygon outline underneath it -- a magnet that only moves the
          // shape while the cursor's own handle keeps drifting free reads as
          // a bug, not an assist.
          m.setLatLng(ll(ring[i][0], ring[i][1]));
          entry.layer.setLatLngs(polyLatLngs(entry.item.geometry));
          // Every welded neighbour moves with it -- otherwise a border that
          // was genuinely shared becomes merely close, which is a sliver by
          // another name. Each gets its own fresh [x, y], never a shared
          // array reference, so a later, independent edit to one region's
          // ring can never silently mutate another's.
          for (const w of welded) {
            w.entry.item.geometry.ringPx[w.index] = [ring[i][0], ring[i][1]];
            w.entry.layer.setLatLngs(polyLatLngs(w.entry.item.geometry));
          }
          // Always against the OUTER ring, regardless of which ring is
          // actually being dragged -- the status line describes the
          // shape's own overall cells/area, not the notch currently under
          // the cursor, the same fact either ring's handle is moving.
          liveReport(g.ringPx);
        };
        m.on("drag", rafThrottle(applyDrag));
        m.on("dragend", () => {
          // One final UNTHROTTLED flush -- dragend can fire before a pending
          // rAF from the last drag event runs, and the release point must
          // always be exact, not whichever frame happened to land first.
          applyDrag();
          editingVertex = false;
          forceRedraw([entry.layer, ...welded.map((w) => w.entry.layer)]);
          snapLayer.clearLayers();
          log("vertex_dragend", {
            itemId: entry.item.localId, ringIndex: i, holeIndex, isMidpoint: false,
            finalPx: [ring[i][0], ring[i][1]], snapped: lastSnapInfo,
            weldedIds: welded.map((w) => w.entry.item.localId),
          });
          onGeometryChange(entry.item);
          drawHandles();
          splitTargetEdge(lastSnapInfo);
        });
        // Right-click removes this vertex, and every welded neighbour's copy
        // of it too -- deleting a shared corner from only one side of a
        // border is exactly the same sliver dragging one away creates. A
        // polygon (hole or outer ring alike) cannot go below three points,
        // and refusing the WHOLE delete (not just part of it) is better
        // than silently leaving one ring short while its neighbour still
        // shares the point that's now gone.
        m.on("contextmenu", (e) => {
          L.DomEvent.stop(e);
          const welded = findWeldedVertices(entry, ring[i][0], ring[i][1]);
          if (ring.length <= 3 || welded.some((w) => w.entry.item.geometry.ringPx.length <= 3)) {
            report("a polygon needs at least three points");
            return;
          }
          ring.splice(i, 1);
          entry.layer.setLatLngs(polyLatLngs(entry.item.geometry));
          for (const w of welded) {
            w.entry.item.geometry.ringPx.splice(w.index, 1);
            w.entry.layer.setLatLngs(polyLatLngs(w.entry.item.geometry));
          }
          forceRedraw([entry.layer, ...welded.map((w) => w.entry.layer)]);
          log("vertex_delete", {
            itemId: entry.item.localId, ringIndex: i, holeIndex,
            weldedIds: welded.map((w) => w.entry.item.localId),
          });
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
        // The point actually being created -- the midpoint of this edge, not
        // vertex i itself. Found live, the hard way: dragstart used to pass
        // (x, y) -- vertex i's OWN coordinates -- to findWeldedVertices and
        // splice it in as the inserted point, instead of this. A real,
        // pre-existing vertex is exactly the kind of point likely to already
        // have a genuine weld partner elsewhere on the map (that is the
        // whole point of welding), so inserting a midpoint next to ANY
        // already-shared corner found and dragged that corner's unrelated
        // neighbour along for the ride -- reported as "it starts moving
        // nearby lines and vertexes which make no sense," the resulting
        // self-intersections once that unrelated vertex got yanked across
        // the map, and "snapping something from a different district"
        // instead of just placing a clean new point. A freshly-computed
        // midpoint has no pre-existing relationship to protect; it is only
        // ever welded if it happens to land on a real shared corner, which
        // this fix is what makes that check actually test for.
        const midX = (x + nx) / 2, midY = (y + ny) / 2;
        const mid = L.marker(ll(midX, midY), {
          icon: L.divIcon({ className: "gz-vertex gz-vertex--mid", iconSize: [22, 22] }),
          draggable: true, zIndexOffset: 800,
        });
        let inserted = false;
        let welded = [];
        mid.on("dragstart", () => {
          editingVertex = true;
          ring.splice(i + 1, 0, [midX, midY]);
          inserted = true;
          welded = findWeldedVertices(entry, midX, midY);
          log("vertex_dragstart", {
            itemId: entry.item.localId, itemName: entry.item.name, tier: entry.item.tier,
            ringIndex: i + 1, holeIndex, isMidpoint: true, startPx: [midX, midY],
            weldedIds: welded.map((w) => w.entry.item.localId),
          });
        });
        const applyMidDrag = () => {
          if (!inserted) return;
          const p = px(mid.getLatLng());
          ring[i + 1] = snapEditedVertex(entry, p, mid);
          mid.setLatLng(ll(ring[i + 1][0], ring[i + 1][1]));
          entry.layer.setLatLngs(polyLatLngs(entry.item.geometry));
          for (const w of welded) {
            w.entry.item.geometry.ringPx[w.index] = [ring[i + 1][0], ring[i + 1][1]];
            w.entry.layer.setLatLngs(polyLatLngs(w.entry.item.geometry));
          }
          liveReport(g.ringPx);
        };
        mid.on("drag", rafThrottle(applyMidDrag));
        mid.on("dragend", () => {
          applyMidDrag();
          editingVertex = false;
          forceRedraw([entry.layer, ...welded.map((w) => w.entry.layer)]);
          snapLayer.clearLayers();
          log("vertex_dragend", {
            itemId: entry.item.localId, ringIndex: i + 1, holeIndex, isMidpoint: true,
            finalPx: ring[i + 1], snapped: lastSnapInfo,
            weldedIds: welded.map((w) => w.entry.item.localId),
          });
          onGeometryChange(entry.item);
          drawHandles();
          splitTargetEdge(lastSnapInfo);
        });
        handleLayer.addLayer(mid);
      });
    });
  }

  /** Move the whole selected shape by a pixel delta — arrow keys, so a shape
   *  can be nudged without grabbing a vertex and changing its outline. */
  function nudge(dx, dy) {
    const entry = selected() && shapes.get(selected());
    if (!entry || entry.item.locked) return;
    const g = entry.item.geometry;
    if (g.kind === "point") {
      g.pointPx = [g.pointPx[0] + dx, g.pointPx[1] + dy];
      entry.layer.setLatLng(ll(...g.pointPx));
    } else {
      const shift = (r) => r.map(([x, y]) => [round1(x + dx), round1(y + dy)]);
      g.ringPx = shift(g.ringPx);
      if (g.holesPx) g.holesPx = g.holesPx.map(shift);
      entry.layer.setLatLngs(polyLatLngs(g));
      liveReport(g.ringPx);
    }
    forceRedraw([entry.layer]);
    log("nudge", { itemId: entry.item.localId, dx, dy });
    onGeometryChange(entry.item);
    drawHandles();
  }

  // --- marquee: bulk-remove real buildings, OR bulk-select+adopt everything ---
  //
  // Two different things happen inside the same box, chosen by `kind`:
  // "remove-buildings" (the Remove tool) asks the ground-truth layer what
  // real buildings fall inside and removes them. "select-items" (the Select
  // tool) hands the box straight to onAreaSelect, which puts every drawn/
  // adopted item AND every real, not-yet-adopted building inside it into the
  // multi-selection together -- adopting the real ones on the spot -- for the
  // batch note/delete panel. There is deliberately no separate "mass adopt"
  // mode: one lasso or one marquee is enough to grab a mixed handful of
  // existing and brand-new buildings in one action. Shift held down makes
  // select-items ADD to whatever is already selected rather than replace it
  // -- the same modifier `toggle()` uses for a single shift-click, so the two
  // compose (marquee a block, then shift-click one more building it missed).
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

  // Mouse-sourced PointerEvents use pointerId 1 in every evergreen browser
  // (Chrome, Firefox, Safari) -- there is exactly one mouse, so this is safe
  // to assume rather than waiting to observe a real pointerdown first.
  const MOUSE_POINTER_ID = 1;
  // At most one tracked drag at a time -- see trackDrag's own comment.
  let endActiveDrag = null;

  /** Track a drag on `container` via Pointer Capture rather than a plain
   *  document mousemove/mouseup pair. A plain pair leaks forever the moment
   *  a single mouseup is ever lost -- seen live, more than once, in this
   *  exact tool -- leaving a stale `move` handler that keeps firing on
   *  every future mousemove anywhere on the page: a marquee box that never
   *  closes and can hijack a later unrelated click, or (the right-click-pan
   *  case below) the map re-panning on every subsequent mouse twitch, which
   *  is exactly the "slides like ice, ends up on the other side of the map"
   *  bug this replaced. Capture makes the browser guarantee a matching
   *  pointerup/pointercancel lands on `container` no matter where the
   *  button is actually released -- including outside the map. Two more
   *  layers behind that one, since a browser guarantee is still one thing
   *  going wrong away from the exact bug this is fixing: a `document`-level
   *  pointerup/pointercancel pair as a backstop (harmless double-fire --
   *  `end` only ever runs once, guarded below) catches a release capture
   *  somehow missed but that still reached the page anywhere at all; and
   *  `endActiveDrag`, called first, cleans up a still-live previous tracker
   *  before a new one starts, so even a release that reached nowhere at all
   *  costs at most one abandoned gesture rather than compounding for the
   *  rest of the session. */
  function trackDrag(container, { onMove, onEnd }) {
    if (endActiveDrag) endActiveDrag();
    container.setPointerCapture(MOUSE_POINTER_ID);
    let ended = false;
    function move(ev) { onMove(ev); }
    function end(ev) {
      if (ended) return;
      ended = true;
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerup", end);
      container.removeEventListener("pointercancel", end);
      document.removeEventListener("pointerup", end);
      document.removeEventListener("pointercancel", end);
      if (container.hasPointerCapture(MOUSE_POINTER_ID)) {
        container.releasePointerCapture(MOUSE_POINTER_ID);
      }
      endActiveDrag = null;
      onEnd(ev);
    }
    endActiveDrag = end;
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerup", end);
    container.addEventListener("pointercancel", end);
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
  }

  function beginMarquee(startEvent, kind) {
    const container = map.getContainer();
    const box = document.createElement("div");
    box.className = "gz-marquee";
    container.appendChild(box);
    const origin = startEvent.containerPoint;
    const alt = startEvent.originalEvent.altKey;
    const additive = startEvent.originalEvent.shiftKey;
    marquee = { box, origin, alt, kind };
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
      container.removeChild(box);
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

      // A genuine drag, not a click -- see suppressNextClick's own comment
      // for why the click that may follow this must not also run.
      suppressNextClick = true;
      if (kind === "select-items") {
        // Both drawn/adopted items AND real, not-yet-adopted buildings inside
        // the box -- see the "lasso" branch of finishDraft for why this is
        // one call rather than a sync session-only pass plus a separate mode.
        onAreaSelect({ kind: "rect", x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: rect.y1 }, additive);
      } else {
        onMarquee(rect, alt);
      }
    }

    trackDrag(container, { onMove: move, onEnd: up });
  }

  /** Region/Site's Rectangle and Circle draft modes -- one mousedown-drag-
   *  mouseup gesture, start corner/centre to end corner/edge, exactly the
   *  same trackDrag primitive beginMarquee already uses for the same
   *  reason: real pointer capture, not a fragile mousemove/mouseup pair
   *  that a fast drag can outrun. Never touches `drafting` -- that state
   *  machine is polygon mode's own multi-click session (Enter to finish,
   *  Backspace to undo a point), and this is a single gesture with
   *  nothing to accumulate. */
  function beginShapeDraft(startEvent, kind) {
    const container = map.getContainer();
    const startP = placeDraftPoint(px(startEvent.latlng));
    const preview = L.layerGroup().addTo(map);
    const prevCursor = map.getContainer().style.cursor;

    function ringFor(endP) {
      return kind === "rect" ? rectRing(startP, endP) : circleRing(startP, endP);
    }

    function move(ev) {
      const endP = px(map.containerPointToLatLng(map.mouseEventToContainerPoint(ev)));
      preview.clearLayers();
      const ring = ringFor(endP);
      preview.addLayer(L.polygon(ringToLatLngs(ring), DRAFT_STYLE));
      // Same "cells · area" readout polygon mode's own liveReport gives,
      // plus the one thing a single-gesture shape needs that a multi-
      // click polygon doesn't: a reminder of how to actually finish it.
      const refs = refsTouched(ring, grid);
      const prefix = kind === "circle"
        ? `radius ${Math.round(Math.hypot(endP[0] - startP[0], endP[1] - startP[1]))}m`
        : `${refs.length} cell${refs.length === 1 ? "" : "s"}`;
      report(`${prefix} · ${fmtArea(polygonAreaPx(ring))} — release to finish`);
    }

    function up(ev) {
      preview.clearLayers();
      map.removeLayer(preview);
      map.getContainer().style.cursor = prevCursor;
      const endP = px(map.containerPointToLatLng(map.mouseEventToContainerPoint(ev)));
      report("");
      const dx = Math.abs(endP[0] - startP[0]), dy = Math.abs(endP[1] - startP[1]);
      // A click, not a drag -- a rectangle or circle needs a real second
      // point, unlike polygon mode's first click, which only ever needs
      // to exist. 4px, matching beginMarquee's own click-vs-drag
      // threshold, for the same reason: real mouse jitter on a mousedown
      // that never meant to move must not draw a 1px sliver shape.
      if (dx < 4 && dy < 4) {
        report(`drag to draw a ${kind === "rect" ? "rectangle" : "circle"} — a click alone has no size`);
        return;
      }
      suppressNextClick = true;
      const ring = ringFor(endP);
      onComplete({ tier: tool === "region" ? "region" : "site", ringPx: ring, source: "drawn" });
    }

    trackDrag(container, { onMove: move, onEnd: up });
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
    if (suppressNextClick) { suppressNextClick = false; return; }
    // A vertex or midpoint handle has its own drag behaviour (see
    // drawHandles) that must run untouched -- the mousedown handler below
    // already steps aside for exactly this reason, but a CLICK on a
    // Region/Site/Lasso/Bisect tool's turf reaches here too, and reached
    // here unchecked it silently started a brand new draft on top of the
    // selected shape's own handle instead of leaving the handle alone.
    // Found live: that single wrong click set `drafting`, which is the
    // very first thing the mousedown handler below refuses to act on --
    // so every mousedown after it, including the next attempt to actually
    // drag that same handle, fell through with nothing to intercept it,
    // and Leaflet's own native map-drag panned the view instead. One
    // mis-routed click, several tools' worth of confusing fallout.
    // A cut is drawn ACROSS the selected region's own boundary, so a click
    // on one of ITS OWN handles is a deliberate "put the cut exactly here"
    // -- the cleanest possible split uses a real existing corner, not an
    // arbitrary point on an edge -- never the accidental hit it would be
    // for Region/Site/Lasso drafting a brand new, unrelated shape on top
    // of it. Reported directly: "I can't bisect from vertex to vertex."
    const clickTarget = e.originalEvent && e.originalEvent.target;
    if (!isLineTool() && clickTarget && clickTarget.closest
        && clickTarget.closest(".gz-vertex, .gz-vertex--mid")) return;
    const p = px(e.latlng);
    if (POLYGON_DRAFT_TOOLS.has(tool)) {
      const placed = placeDraftPoint(p);
      if (!drafting) startDraft(placed);
      else { drafting.points.push(placed); redrawDraft(); }
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
    // A fresh mousedown, of any kind, means whatever gesture set
    // suppressNextClick is long since over -- if its own trailing click
    // never actually arrived (the mouseup landed outside the container
    // entirely, say), this is what stops that stale `true` from silently
    // eating the NEXT, unrelated click instead.
    suppressNextClick = false;
    if (drafting) return;
    // Left button only -- the right button is exclusively for panning (see
    // the contextmenu/pan block below), so it must never also start a
    // marquee attempt racing the same mousemove/mouseup pair.
    if (e.originalEvent && e.originalEvent.button !== 0) return;
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
    } else if ((tool === "region" || tool === "site") && draftShapeMode !== "polygon") {
      L.DomEvent.stop(e);
      beginShapeDraft(e, draftShapeMode);
    }
  });

  // --- right-click-drag to pan ----------------------------------------------
  //
  // Left-drag is now exclusively the marquee/vertex-drag/polygon-draft
  // gesture in every tool that uses it, so panning moves to the right button
  // instead of competing with it for the same drag -- asked for directly,
  // and it also settles the one thing map.dragging could never cleanly give
  // Select mode: a button dedicated to "move the view", never ambiguous with
  // "draw a selection". Implemented by hand rather than via map.dragging,
  // which Leaflet wires to the left button only.
  //
  // map.dragging is disabled here, permanently, not just during a marquee.
  // It is a SEPARATE Leaflet Handler subscribed to the map's native
  // "mousedown", registered before this module's own listeners -- see the
  // marquee comment above trackDrag for the first time this exact race bit.
  // Select/Remove claim the drag for themselves via beginMarquee, but
  // Region/Site/Lasso/Bisect never did: a mousedown that missed a vertex
  // handle by even a pixel -- real-mouse precision on a 12000px map, not
  // the exact coordinates a synthetic test drives -- fell through with
  // nothing to intercept it, and map.dragging panned the camera instead of
  // doing nothing. Found live: the earlier fix (a click landing exactly ON
  // a handle no longer starts a draft) was real but incomplete, because it
  // never addressed a drag that starts beside one. Disabling the handler
  // outright removes the whole class for every tool at once, including
  // whatever drafting tool gets added next, rather than teaching each one
  // its own guard.
  map.dragging.disable();
  // The browser's own context menu is suppressed over the whole map so
  // right-click reads as "the pan button", not "show a menu" -- except on a
  // vertex handle, where it is still exactly what it already was: delete
  // this point.
  map.getContainer().addEventListener("contextmenu", (e) => e.preventDefault());

  map.getContainer().addEventListener("mousedown", (e) => {
    if (e.button !== 2) return;
    if (e.target && e.target.closest && e.target.closest(".gz-vertex, .gz-vertex--mid")) return;
    e.preventDefault();
    // The increment since the LAST move event, not since mousedown --
    // updated on every move. Found live, the hard way: computing a target
    // container point from the ORIGINAL mousedown position and converting
    // it with containerPointToLatLng looked right (it matches how a vertex
    // drag works), but that conversion reads the map's CURRENT view, which
    // this same gesture has already changed by the time the next mousemove
    // arrives. Re-applying the FULL cumulative delta against an already-
    // shifted view compounds every event: two move events overshoot by 1.5x,
    // three by 2x, and a real mouse firing dozens of move events across one
    // smooth drag compounds into exactly the "slides like ice, ends up on
    // the other side of the map" bug this replaced. panBy is Leaflet's own
    // relative-pixel pan and carries no such trap: each call only ever
    // shifts the view by the pixels moved since the last one.
    let lastClient = { x: e.clientX, y: e.clientY };

    trackDrag(map.getContainer(), {
      onMove(ev) {
        const dx = ev.clientX - lastClient.x;
        const dy = ev.clientY - lastClient.y;
        lastClient = { x: ev.clientX, y: ev.clientY };
        map.panBy([dx, dy], { animate: false });
      },
      onEnd() {},
    });
  });

  // Select/pan gets a plain pointer at rest -- "default", not the browser's
  // bare unstyled cursor and not Leaflet's own grab-hand (which reads as
  // "drag to pan", not "click or marquee to select"). Every drawing/picking
  // tool gets a crosshair, matching the precision-placement feel those need.
  const CURSOR = {
    pan: "default", region: "crosshair", site: "crosshair", point: "crosshair",
    adopt: "crosshair", remove: "crosshair", lasso: "crosshair", bisect: "crosshair",
  };
  // Every click-to-add-point drafting tool, not literally every polygon --
  // "bisect" belongs here too (its own line-vs-polygon rendering is
  // isLineTool()'s job, not this set's), since what this set actually
  // gates is "does clicking the map add a draft point" and "does
  // double-click-zoom need to get out of the way while drafting."
  const POLYGON_DRAFT_TOOLS = new Set(["region", "site", "lasso", "bisect"]);

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
    toggle, drawHandles, nudge, restyleOne, restyleAll, snapRegionPoint,
    showSnapHint: rafThrottle(showSnapHint),
    finishDraft, cancelDraft, undoPoint, setFocus,
    get drafting() { return !!drafting; },
    setDraftShapeMode, get draftShapeMode() { return draftShapeMode; },
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
