/**
 * Pure logic for map-editor plan Phase 4 (direct vertex editing) -- no
 * terra-draw, maplibre-gl, or `window`/`document` import, same split
 * lod.ts already documents and test/city-map-editor/tier0-architecture.test.mjs
 * enforces.
 *
 * The actual TerraDraw instance (stateful, event-driven, owns real DOM/GL
 * layers) is wired up directly in App.svelte, same as MapLibre itself --
 * this module only holds the parts of that flow that are pure functions of
 * their inputs and don't need a live instance to test.
 */

/** TerraDraw requires every feature added to its store to declare which
 * DRAW MODE it belongs to (properties.mode) -- selecting/editing an
 * existing feature means adding it under the mode whose geometry type
 * matches. null for a geometry type this editor doesn't support editing
 * for yet (MultiPolygon, GeometryCollection, ...) -- callers must check
 * for null and decline to start an edit rather than guessing a mode. */
export function terraDrawModeForGeometryType(geometryType: string): string | null {
  switch (geometryType) {
    case "Polygon":
      return "polygon";
    case "LineString":
      return "linestring";
    case "Point":
      return "point";
    default:
      return null;
  }
}

/** TerraDraw's own default `coordinatePrecision` (terra-draw's compiled
 * source hard-codes 9 as its fallback when an adapter doesn't override
 * it) -- matched here, not re-derived, so this app's own rounding agrees
 * with what TerraDraw will actually validate against. */
export const TERRA_DRAW_COORDINATE_PRECISION = 9;

/** Round every coordinate in a GeoJSON Polygon/LineString/Point to a fixed
 * number of decimal places -- real coordinates reprojected through this
 * app's own frame.inv.transform() (SOURCE CRS -> WGS84, api/features.py)
 * carry full float64 noise well past any real precision (9 decimal
 * places of lon/lat is sub-millimetre), and TerraDraw's own
 * `addFeatures()` REJECTS a feature outright as invalid
 * ("Feature has coordinates with excessive precision") if it sees more
 * digits than its configured `coordinatePrecision` -- confirmed directly:
 * every real production feature's own reprojected geometry failed
 * `startEdit()`'s `addFeatures()` call this way, unconditionally, before
 * this rounding step existed. Never mutates the input. */
export function roundCoordinatesToPrecision<T extends GeoJSON.Geometry>(
  geometry: T,
  precision: number = TERRA_DRAW_COORDINATE_PRECISION,
): T {
  const factor = Math.pow(10, precision);
  const round = (n: number) => Math.round(n * factor) / factor;
  const roundRing = (ring: number[][]) => ring.map((coord) => coord.map(round));

  switch (geometry.type) {
    case "Point":
      return { ...geometry, coordinates: geometry.coordinates.map(round) } as T;
    case "LineString":
      return { ...geometry, coordinates: roundRing(geometry.coordinates) } as T;
    case "Polygon":
      return { ...geometry, coordinates: geometry.coordinates.map(roundRing) } as T;
    default:
      return geometry;
  }
}

/** The warning banner for "N terrain edits sit where this feature used to
 * be, and did not move with it" (PATCH /api/features/{id}'s own
 * nearbyTerrainEditIds, see api/edits.py's module docstring on why this is
 * informational-only, never blocking) -- or null when there's nothing to
 * say. Mirrors lod.ts's formatHiddenBanner in shape and tone. */
export function formatNearbyTerrainWarning(nearbyTerrainEditIds: string[]): string | null {
  if (nearbyTerrainEditIds.length === 0) return null;
  const plural = nearbyTerrainEditIds.length === 1 ? "edit" : "edits";
  return `${nearbyTerrainEditIds.length} nearby terrain ${plural} did not move with this feature — review manually`;
}

/** The notice for "your shape crossed itself, so it was auto-repaired" --
 * or null when no repair happened. See api/edits.py's repair_geometry. */
export function formatRepairNotice(repaired: boolean): string | null {
  if (!repaired) return null;
  return "This shape crossed itself — it was automatically repaired";
}

/** The clause for "this reclaim/terrace/foundation also cleared N old
 * features that were already on the ground underneath it" (map-editor plan
 * Phase 12 -- see api/reclaim.py's own module docstring for why this,
 * rather than a rendering fix or a paint tool, is the real cure for
 * reclaimed land showing old olive/brown roof colours through it). Null
 * when nothing was cleared -- callers join this onto their own base notice
 * with " · ", matching formatConnectivityNotice's own join style. */
export function formatClearedNotice(clearedCount: number): string | null {
  if (clearedCount === 0) return null;
  const plural = clearedCount === 1 ? "feature" : "features";
  return `cleared ${clearedCount} old ${plural} underneath`;
}

export interface EditErrorResult {
  message: string;
}

/** A single place to turn a failed PATCH/undo response into user-facing
 * text -- keeps App.svelte's catch blocks from hand-formatting strings in
 * three different places with three different tones. */
export function formatEditError(action: "save" | "undo" | "delete", detail: string | null): string {
  const verb = action === "save" ? "Couldn't save that edit"
    : action === "delete" ? "Couldn't delete that feature"
    : "Couldn't undo";
  return detail ? `${verb}: ${detail}` : `${verb}.`;
}

/** POST /api/features' own connectivity shape (api/edits.py's
 * find_road_endpoint_connection) -- null on either end means a genuine
 * dangling end, never assumed connected. */
export interface RoadEndConnectivity {
  sharedWithRoadIds: string[];
}

export interface RoadConnectivity {
  start: RoadEndConnectivity | null;
  end: RoadEndConnectivity | null;
}

/** map-editor plan Phase 6's own wish, verbatim: "tells you whether both
 * ends actually connected." null (not a string) when the server reported
 * no connectivity at all -- a non-road feature, which never asked the
 * question in the first place, distinct from a road whose ends turned out
 * unconnected (a real, sayable "not connected to anything" answer). */
export function formatConnectivityNotice(connectivity: RoadConnectivity | null): string | null {
  if (!connectivity) return null;
  const describeEnd = (end: RoadEndConnectivity | null): string => {
    if (!end) return "not connected to anything";
    const n = end.sharedWithRoadIds.length;
    return `connected to ${n} other road${n === 1 ? "" : "s"}`;
  };
  return `Start: ${describeEnd(connectivity.start)} · End: ${describeEnd(connectivity.end)}`;
}
