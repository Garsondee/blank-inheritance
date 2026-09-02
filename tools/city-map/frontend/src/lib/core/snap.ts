/**
 * Pure snapping logic for map-editor plan Phase 5 -- no maplibre-gl,
 * terra-draw, or `window`/`document`, same split every other core/ module
 * uses (see test/city-map-editor/tier0-architecture.test.mjs).
 *
 * Terra Draw has a real, built-in extension point for this
 * (`Snapping.toCustom` on a select mode's `coordinates.snappable` flag --
 * a callback of `(event, context) => Position | undefined`, see
 * node_modules/terra-draw/dist/common.d.ts). App.svelte wires a function
 * into that callback which projects the cursor and every candidate to
 * pixel space via MapLibre's own `project()`, calls `pickSnapPosition`
 * below, and unprojects the result back to lon/lat -- so this module works
 * entirely in a plain 2D `{x, y}` pixel-like space and never touches
 * lon/lat math except inside the candidate-EXTRACTION helpers (which take
 * real GeoJSON in and hand back plain lon/lat coordinate pairs -- the
 * caller does the lon/lat -> pixel projection, not this module).
 *
 * Priority is FIXED, not "closest across everything": feature vertex >
 * road-graph junction > segment midpoint > ghost line > any segment >
 * grid > ortho (the map-editor plan's own order). Each tier is checked in
 * turn, and the first tier with any candidate inside tolerance wins --
 * even if a later tier's candidate is numerically closer to the cursor.
 * This matches a real drafting tool's snap hierarchy (a vertex snap must
 * never lose to a coincidentally-closer grid point) and is a deliberate
 * design decision from the plan, not an implementation detail.
 */

export interface Point {
  x: number;
  y: number;
}

export type LonLat = [number, number];

export type SnapKind = "vertex" | "junction" | "midpoint" | "ghost" | "segment" | "grid" | "ortho";

export const SNAP_PRIORITY: SnapKind[] = ["vertex", "junction", "midpoint", "ghost", "segment", "grid", "ortho"];

export interface SnapResult {
  point: Point;
  kind: SnapKind;
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Tier shape 1: nearest point in a fixed list, within tolerance -- used
 * for vertex/junction/midpoint. Returns null (not the cursor itself) when
 * nothing is close enough, so callers can tell "no snap" from "snapped to
 * the exact cursor position" (a real, distinct case for grid/ortho below,
 * which DO sometimes return the cursor unchanged). */
export function nearestInPoints(cursor: Point, points: Point[], tolerancePx: number): Point | null {
  let best: Point | null = null;
  let bestDist = tolerancePx;
  for (const p of points) {
    const d = distance(cursor, p);
    if (d <= bestDist) {
      best = p;
      bestDist = d;
    }
  }
  return best;
}

/** The closest point ON segment a-b to `cursor` -- a real point-to-segment
 * projection, clamped to the segment's own extent (never extrapolated past
 * either endpoint). */
export function nearestPointOnSegment(cursor: Point, a: Point, b: Point): Point {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq === 0) return a; // a degenerate zero-length segment
  let t = ((cursor.x - a.x) * abx + (cursor.y - a.y) * aby) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * abx, y: a.y + t * aby };
}

/** Tier shape 2: nearest point ALONG any line in a list (continuous, not
 * just the line's own vertices) -- used for ghost-line and any-segment.
 * `lines` is a flat list of pre-built 2-point segments (App.svelte builds
 * these from extractSegments below, or directly from ghost-line pairs),
 * not whole polylines -- keeps this function's own loop simple and lets
 * the caller freely mix segments from many different source features. */
export function nearestOnLines(cursor: Point, segments: [Point, Point][], tolerancePx: number): Point | null {
  let best: Point | null = null;
  let bestDist = tolerancePx;
  for (const [a, b] of segments) {
    const candidate = nearestPointOnSegment(cursor, a, b);
    const d = distance(cursor, candidate);
    if (d <= bestDist) {
      best = candidate;
      bestDist = d;
    }
  }
  return best;
}

/** Snap to the nearest intersection of a fixed-spacing square lattice
 * anchored at `origin`. Always returns a real point (grid snap has no
 * "too far" case -- every position has a well-defined nearest grid
 * point) -- spacingPx <= 0 is treated as "grid disabled", returning the
 * cursor unchanged rather than dividing by zero. */
export function snapToGrid(cursor: Point, origin: Point, spacingPx: number): Point {
  if (spacingPx <= 0) return cursor;
  const x = origin.x + Math.round((cursor.x - origin.x) / spacingPx) * spacingPx;
  const y = origin.y + Math.round((cursor.y - origin.y) / spacingPx) * spacingPx;
  return { x, y };
}

/** Snap the ANGLE from `reference` to `cursor` to the nearest multiple of
 * `stepDeg`, preserving the cursor's real distance from `reference`
 * unchanged -- angle-only snap, not a position teleport. This distinction
 * is load-bearing: an earlier ortho-snap implementation in this project's
 * OLD Leaflet editor (tools/city-map/editor/) first tried snapping the
 * raw XY position, which silently drifted the snapped point away from
 * where the user's actual click landed whenever the snap correction was
 * large; snapping angle-only against the cursor's own real distance is
 * what that fix converged on, carried forward here from the start. */
export function snapToOrtho(cursor: Point, reference: Point, stepDeg: number): Point {
  const dx = cursor.x - reference.x;
  const dy = cursor.y - reference.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || stepDeg <= 0) return cursor;
  const angle = Math.atan2(dy, dx);
  const stepRad = (stepDeg * Math.PI) / 180;
  const snappedAngle = Math.round(angle / stepRad) * stepRad;
  return {
    x: reference.x + dist * Math.cos(snappedAngle),
    y: reference.y + dist * Math.sin(snappedAngle),
  };
}

export interface SnapSources {
  vertices?: Point[];
  junctions?: Point[];
  midpoints?: Point[];
  ghostLines?: [Point, Point][];
  segments?: [Point, Point][];
}

export interface SnapOptions {
  tolerancePx: number;
  /** Grid spacing is a real ground distance converted to pixels by the
   * CALLER (metresPerPixel from lod.ts, at the map's current zoom) --
   * kept in pixels here so this module never needs to know about zoom or
   * ground scale at all, matching the rest of this file's pixel-space
   * design. */
  grid?: { originPx: Point; spacingPx: number };
  ortho?: { referencePx: Point; stepDeg: number };
}

export function pickSnapPosition(cursor: Point, sources: SnapSources, opts: SnapOptions): SnapResult | null {
  const pointTiers: [SnapKind, Point[] | undefined][] = [
    ["vertex", sources.vertices],
    ["junction", sources.junctions],
    ["midpoint", sources.midpoints],
  ];
  for (const [kind, points] of pointTiers) {
    if (!points || points.length === 0) continue;
    const hit = nearestInPoints(cursor, points, opts.tolerancePx);
    if (hit) return { point: hit, kind };
  }

  const lineTiers: [SnapKind, [Point, Point][] | undefined][] = [
    ["ghost", sources.ghostLines],
    ["segment", sources.segments],
  ];
  for (const [kind, segments] of lineTiers) {
    if (!segments || segments.length === 0) continue;
    const hit = nearestOnLines(cursor, segments, opts.tolerancePx);
    if (hit) return { point: hit, kind };
  }

  if (opts.grid) {
    return { point: snapToGrid(cursor, opts.grid.originPx, opts.grid.spacingPx), kind: "grid" };
  }
  if (opts.ortho) {
    return { point: snapToOrtho(cursor, opts.ortho.referencePx, opts.ortho.stepDeg), kind: "ortho" };
  }
  return null;
}

/** The vertex ortho-snap should measure its angle FROM, given the geometry
 * currently being edited (Terra Draw's own SnappableContext.
 * getCurrentGeometrySnapshot()) and the index of the coordinate being
 * dragged (context.currentCoordinate). null when there's no sensible
 * reference (fewer than 2 real vertices) -- callers must treat null as
 * "skip ortho-snap for this event", never guess a fallback.
 *
 * A Polygon's exterior ring is CLOSED (GeoJSON's own rule: first
 * coordinate === last coordinate) -- so ring index 0 and index
 * (ring.length - 1) are the SAME real vertex. Naively using
 * `ring[currentIndex - 1]` would treat the closing duplicate as a genuine
 * distinct neighbour and could reference the vertex being dragged AS its
 * own reference at the wrap-around. This function collapses the ring to
 * its real, non-duplicated vertex count first, so index arithmetic is
 * always over genuinely distinct points. */
export function referenceCoordinateForOrtho(
  geometry: { type: "Polygon"; coordinates: LonLat[][] } | { type: "LineString"; coordinates: LonLat[] },
  currentIndex: number,
): LonLat | null {
  const ring = geometry.type === "Polygon" ? geometry.coordinates[0] : geometry.coordinates;
  if (!ring || ring.length < 2) return null;
  if (currentIndex < 0 || currentIndex >= ring.length) return null;

  const isClosedRing = geometry.type === "Polygon";
  const effectiveLength = isClosedRing ? ring.length - 1 : ring.length;
  if (effectiveLength < 2) return null;
  // currentIndex is already < ring.length (checked above); for a Polygon
  // this collapses the closing duplicate (index ring.length-1) onto index
  // 0, its real, non-duplicated identity. A no-op for LineString, since
  // currentIndex is already < effectiveLength there.
  const idx = currentIndex % effectiveLength;

  if (!isClosedRing) {
    // An OPEN line never wraps -- its true first vertex genuinely has no
    // predecessor. Wrapping here would invent a fake "edge" connecting the
    // line's last point back to its first, which doesn't exist.
    return idx === 0 ? null : ring[idx - 1];
  }
  const prevIdx = (idx - 1 + effectiveLength) % effectiveLength;
  return prevIdx === idx ? null : ring[prevIdx];
}

// --- Candidate extraction from real GeoJSON (lon/lat) ----------------------
// These hand back plain lon/lat pairs -- the caller projects them to pixel
// space (MapLibre's project()) before they ever reach the functions above.

function collectCoordinates(geometry: GeoJSON.Geometry, out: LonLat[]): void {
  switch (geometry.type) {
    case "Point":
      out.push(geometry.coordinates as LonLat);
      break;
    case "MultiPoint":
    case "LineString":
      for (const c of geometry.coordinates) out.push(c as LonLat);
      break;
    case "Polygon":
    case "MultiLineString":
      for (const ring of geometry.coordinates) for (const c of ring) out.push(c as LonLat);
      break;
    case "MultiPolygon":
      for (const poly of geometry.coordinates) for (const ring of poly) for (const c of ring) out.push(c as LonLat);
      break;
    case "GeometryCollection":
      for (const g of geometry.geometries) collectCoordinates(g, out);
      break;
  }
}

/** Every vertex of every given feature, lon/lat, duplicates included
 * (shared vertices legitimately snap-hit from either feature; de-duping
 * would just cost a pass for no behavioural difference to the caller,
 * which only cares about the nearest one). */
export function extractVertices(features: GeoJSON.Feature[]): LonLat[] {
  const out: LonLat[] = [];
  for (const f of features) collectCoordinates(f.geometry, out);
  return out;
}

function collectSegments(geometry: GeoJSON.Geometry, out: [LonLat, LonLat][]): void {
  const addRing = (ring: LonLat[]) => {
    for (let i = 0; i < ring.length - 1; i++) out.push([ring[i], ring[i + 1]]);
  };
  switch (geometry.type) {
    case "LineString":
      addRing(geometry.coordinates as LonLat[]);
      break;
    case "Polygon":
      for (const ring of geometry.coordinates) addRing(ring as LonLat[]);
      break;
    case "MultiLineString":
      for (const line of geometry.coordinates) addRing(line as LonLat[]);
      break;
    case "MultiPolygon":
      for (const poly of geometry.coordinates) for (const ring of poly) addRing(ring as LonLat[]);
      break;
    case "GeometryCollection":
      for (const g of geometry.geometries) collectSegments(g, out);
      break;
  }
}

/** Every edge segment of every given feature, as [start, end] lon/lat
 * pairs -- the shape both the "any segment" and ghost-line tiers need
 * (ghost lines are already plain LineStrings from GET /api/ghost-lines,
 * so this same function extracts their segments too). */
export function extractSegments(features: GeoJSON.Feature[]): [LonLat, LonLat][] {
  const out: [LonLat, LonLat][] = [];
  for (const f of features) collectSegments(f.geometry, out);
  return out;
}

export function extractMidpoints(features: GeoJSON.Feature[]): LonLat[] {
  return extractSegments(features).map(
    ([a, b]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as LonLat,
  );
}

// ~1cm precision at this map's latitude -- fine enough to treat float
// reprojection round-trip noise (server SOURCE-CRS -> lon/lat) as "the
// same point" without merging two genuinely distinct, closely-spaced
// junctions into one.
const JUNCTION_QUANTIZATION = 1e7;

function isRoadFeature(f: GeoJSON.Feature): boolean {
  if (f.geometry.type !== "LineString") return false;
  const tags = f.properties?.tags as Record<string, string> | undefined;
  return !!tags?.highway;
}

/** Coordinates where 2+ DISTINCT road features touch -- a real, if loose,
 * client-side notion of "junction" (no new backend endpoint for this, per
 * the map-editor plan's own Phase 5 scope: it lists only GET
 * /api/ghost-lines as new backend surface). Counts by feature id, not raw
 * coordinate occurrence, so a single road looping back through its own
 * start point isn't misreported as a junction between two roads. */
export function extractRoadJunctions(features: GeoJSON.Feature[]): LonLat[] {
  const roads = features.filter(isRoadFeature);
  const byKey = new Map<string, { roadIds: Set<string | number>; point: LonLat }>();
  for (const road of roads) {
    const roadId = (road.properties?.id as string | number | undefined) ?? road.id ?? "";
    const coords = (road.geometry as GeoJSON.LineString).coordinates as LonLat[];
    for (const c of coords) {
      const key = `${Math.round(c[0] * JUNCTION_QUANTIZATION)},${Math.round(c[1] * JUNCTION_QUANTIZATION)}`;
      let entry = byKey.get(key);
      if (!entry) {
        entry = { roadIds: new Set(), point: c };
        byKey.set(key, entry);
      }
      entry.roadIds.add(roadId);
    }
  }
  return [...byKey.values()].filter((v) => v.roadIds.size >= 2).map((v) => v.point);
}
