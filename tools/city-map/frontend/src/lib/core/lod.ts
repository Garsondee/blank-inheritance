/**
 * Pure viewport/LOD logic for the map editor -- no maplibre-gl import, no
 * `window`/`document` -- see test/city-map-editor/tier0-architecture.test.mjs,
 * which enforces this split the same way design/testing-strategy.md's
 * `core/` rule already does for the Foundry module (§1 of that doc).
 *
 * The server (tools/city-map/api/features.py) does the real, EXACT
 * feature filtering (bbox query + bbox-diagonal LOD threshold + cap) --
 * this module is the client-side POLICY layer on top: given the map's
 * current zoom/viewport, should we even ask, and how do we describe the
 * result to the user. Splitting it this way means every decision here is
 * testable in milliseconds, with no DOM, no network, no MapLibre instance.
 */

/** Standard Web Mercator ground resolution at a given zoom and latitude
 * (metres per pixel at the map's centre) -- the same formula every
 * Mercator-based map (MapLibre, Leaflet, Google Maps) uses internally.
 * `256` is the standard base tile size in pixels this constant assumes. */
const EARTH_CIRCUMFERENCE_M = 40075016.686;
const BASE_TILE_PX = 256;

export function metresPerPixel(zoom: number, latitudeDeg: number): number {
  const latRad = (latitudeDeg * Math.PI) / 180;
  return (EARTH_CIRCUMFERENCE_M * Math.cos(latRad)) / (BASE_TILE_PX * Math.pow(2, zoom));
}

/** Below this zoom, don't even query /api/features -- the honest answer is
 * "zoom in to select individual features", a banner, not a query that
 * would just come back saying everything is hidden. Chosen so a query
 * only fires once the viewport is street-scale (a few hundred metres
 * across), matching design/map-generation.md's own framing of what "zoom
 * fidelity" is actually for at this map's ~12km extent. */
export const MIN_QUERY_ZOOM = 14;

export function shouldQueryFeatures(zoom: number): boolean {
  return zoom >= MIN_QUERY_ZOOM;
}

export interface FeatureQueryResult {
  hiddenByLod: number;
  hiddenByCap: number;
}

/** The banner text for "some real features exist here but aren't shown" --
 * or null when there is nothing to say. Deliberately distinguishes WHY:
 * hiddenByLod is normal decluttering (never alarming, no banner needed on
 * its own); hiddenByCap means "there is more here than we're showing you,
 * zoom in" -- the one case worth surfacing, matching the whole map-editor
 * plan's "truncation must be loud and exact, never silent" rule. */
export function formatHiddenBanner(result: FeatureQueryResult): string | null {
  if (result.hiddenByCap <= 0) return null;
  const plural = result.hiddenByCap === 1 ? "feature" : "features";
  return `${result.hiddenByCap} more ${plural} here — zoom in to see them`;
}

/** The banner shown when the viewport is too zoomed out to query at all --
 * distinct from formatHiddenBanner, which describes a REAL query's result. */
export const ZOOM_IN_TO_SELECT_MESSAGE = "Zoom in to select individual features";
