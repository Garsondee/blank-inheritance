/**
 * Fast, approximate feature styling for the live vector overlay -- the
 * "quick viewing and editing" tier the user asked for directly, alongside
 * the existing slow "real" raster render (render_tile, on the Python side:
 * hillshade, cast shadows, paper texture, contours). This module answers
 * "roughly what color/width should this feature paint AS A FLAT 2D SHAPE,
 * right now, on the GPU, with zero server round-trip" -- close enough to
 * the real render's own palette that toggling between the two views (or
 * just watching an edit resolve) doesn't feel like two unrelated maps, but
 * deliberately NOT a pixel-exact port of citymap/render.py's own logic
 * (no hillshade/shadow/canopy-noise/river-taper-by-Shreve-magnitude here --
 * those are genuinely the "complex visual stuff" the real render process
 * still owns).
 *
 * Palette values below are copied verbatim from
 * data/map/style/kurose-1950s.json so this view uses the SAME colors the
 * real render does, not an invented approximation of them. If that file's
 * palette changes, this module's constants need updating by hand -- there
 * is no shared-JSON-loading path between the Python backend and this
 * frontend today (see [[project_citymap_editor_rearchitecture]] for why:
 * the store/API boundary was never designed to also serve style config).
 */

export interface Tags {
  [key: string]: string;
}

const rgb = (r: number, g: number, b: number): string => `rgb(${r}, ${g}, ${b})`;

// --- palette (data/map/style/kurose-1950s.json, verbatim) ------------------

const INK = rgb(46, 41, 37);
const WATER = rgb(150, 172, 183);
const COAST_INK = rgb(58, 78, 84);
const RAILWAY = rgb(72, 66, 60);
const BUILDING_LOW: [number, number, number] = [214, 207, 196];
const HINT = "rgba(140, 150, 158, 0.55)"; // not part of the real palette -- a
// faint, neutral "this exists but the real renderer wouldn't draw it"
// affordance, so an untagged/unmatched feature stays findable and
// selectable in the editor without inventing a fake real-looking color for
// something the final render actually leaves blank.

const LANDUSE_COLOURS: Record<string, [number, number, number]> = {
  industrial: [208, 200, 187],
  residential: [226, 221, 206],
  commercial: [224, 214, 201],
  retail: [226, 212, 201],
  railway: [207, 197, 190],
  grass: [198, 210, 178],
  forest: [170, 190, 158],
  cemetery: [189, 201, 177],
  farmland: [214, 212, 182],
  meadow: [200, 212, 180],
  orchard: [188, 204, 166],
  quarry: [200, 192, 182],
  wood: [170, 190, 158],
  scrub: [186, 200, 168],
  grassland: [196, 208, 176],
  recreation_ground: [200, 213, 180],
  brownfield: [206, 199, 188],
  construction: [206, 199, 188],
  religious: [218, 208, 196],
  harbour: [203, 196, 187],
  education: [220, 213, 200],
  sand: [223, 214, 190],
  shingle: [206, 200, 188],
  park: [198, 213, 178],
  garden: [200, 214, 182],
  playground: [204, 216, 186],
  dog_park: [198, 213, 178],
  common: [198, 213, 178],
  flowerbed: [202, 213, 184],
  pitch: [188, 206, 168],
  sports_centre: [196, 210, 178],
  sports_hall: [206, 199, 188],
  stadium: [196, 210, 178],
  military: [212, 200, 186],
  apron: [214, 208, 198],
  aerodrome: [216, 211, 200],
};

const BUILDING_MATERIAL_COLOURS: Record<string, [number, number, number]> = {
  concrete: [206, 202, 193],
  metal: [128, 132, 136],
  brick: [176, 128, 104],
  asphalt: [92, 90, 86],
  wood: [168, 138, 96],
  glass: [158, 178, 184],
};

const BUILDING_ROOF_PALETTE: [number, number, number][] = [
  [132, 146, 162],
  [88, 92, 98],
  [162, 100, 78],
  [110, 148, 152],
  [198, 188, 168],
  [176, 118, 72],
  [108, 126, 110],
];

const WATER_NATURAL_OR_TAGS = {
  natural: new Set(["water"]),
  landuse: new Set(["basin", "reservoir"]),
  water: new Set(["reservoir", "pond", "river", "lake", "basin"]),
  leisure: new Set(["swimming_pool"]),
};

// widths.buildingOutlineM / widths.waterStrokeM / widths.coastStrokeM / widths.railwayM
const BUILDING_OUTLINE_WIDTH_M = 0.586;
const WATER_STROKE_WIDTH_M = 0.703;
// Exported: map-editor plan Phase 13's toolbarConfig.ts derives its road/rail
// button list from these SAME widths, rather than a second hand-typed copy
// that could silently drift from the real palette.
export const RAILWAY_WIDTH_M = 4.0;
const RIVER_DEFAULT_WIDTH_M = 3.0; // widths.riverMinM -- real render tapers by
// Shreve stream magnitude (citymap/rivers.py); this view uses a flat
// minimum-width stand-in rather than reimplementing that taper.
const DEFAULT_LINE_WIDTH_M = 2.0; // a hint width for lines with no real
// road/railway/waterway styling (matches HINT's "findable, not invented" role)

// roads.*M, data/map/style/kurose-1950s.json:52-73
// Exported for the same reason as RAILWAY_WIDTH_M above.
export const ROAD_WIDTH_M: Record<string, number> = {
  motorway: 22,
  motorway_link: 12,
  trunk: 19,
  trunk_link: 11,
  primary: 15,
  primary_link: 9,
  secondary: 12,
  secondary_link: 7.5,
  tertiary: 9.5,
  tertiary_link: 6.5,
  residential: 6.5,
  unclassified: 6.0,
  living_street: 5.5,
  pedestrian: 4.5,
  service: 3.6,
  footway: 1.8,
  steps: 2.0,
  track: 3.0,
  bridleway: 2.0,
  cycleway: 2.5,
  road: 6.0,
};
const MAJOR_ROAD_CLASSES = new Set(["motorway", "trunk", "primary"]);
const ROAD_FILL_MAJOR = rgb(246, 242, 234);
const ROAD_FILL_MINOR = rgb(238, 234, 226);

/** A small, deterministic (NOT cryptographic) string hash -- stands in for
 * the real render's `sha256(id)[0] % len(palette)` roof-color pick. Same
 * id always picks the same roof tone within one session (no flicker as
 * features re-render), and draws from the SAME real roof palette, but
 * will not usually pick the identical tone the real render eventually
 * bakes into a raster -- an accepted, stated gap for an approximate view,
 * not a bug to chase (see this module's own top-of-file docstring). */
export function hashStringToIndex(value: string, modulus: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulus;
}

function lerpColour(low: [number, number, number], high: [number, number, number], t: number): string {
  const r = Math.round(low[0] + (high[0] - low[0]) * t);
  const g = Math.round(low[1] + (high[1] - low[1]) * t);
  const b = Math.round(low[2] + (high[2] - low[2]) * t);
  return rgb(r, g, b);
}

function isWaterPolygon(tags: Tags): boolean {
  for (const [key, values] of Object.entries(WATER_NATURAL_OR_TAGS)) {
    const v = tags[key];
    if (v !== undefined && values.has(v)) return true;
  }
  return false;
}

export interface FeatureStyle {
  fillColor: string;
  lineColor: string;
  lineWidthM: number;
}

const BUILDING_ROOF_BLEND_MIN = 0.55;
const BUILDING_ROOF_BLEND_MAX = 0.9;
const BUILDING_HEIGHT_BLEND_CAP_M = 55.0;

function styleForAreaFeature(tags: Tags, heightM: number, id: string): FeatureStyle {
  if ("building" in tags) {
    const material = tags["building:material"];
    const materialColour = material ? BUILDING_MATERIAL_COLOURS[material] : undefined;
    const fillColor = materialColour
      ? rgb(...materialColour)
      : (() => {
          const roof = BUILDING_ROOF_PALETTE[hashStringToIndex(id, BUILDING_ROOF_PALETTE.length)];
          const heightK = Math.min(1, heightM / BUILDING_HEIGHT_BLEND_CAP_M);
          const blend = BUILDING_ROOF_BLEND_MIN + (BUILDING_ROOF_BLEND_MAX - BUILDING_ROOF_BLEND_MIN) * heightK;
          return lerpColour(BUILDING_LOW, roof, blend);
        })();
    return { fillColor, lineColor: INK, lineWidthM: BUILDING_OUTLINE_WIDTH_M };
  }

  if (isWaterPolygon(tags)) {
    return { fillColor: WATER, lineColor: COAST_INK, lineWidthM: WATER_STROKE_WIDTH_M };
  }

  const landuseKey = tags.landuse || tags.natural || tags.leisure;
  const landuseColour = landuseKey ? LANDUSE_COLOURS[landuseKey] : undefined;
  if (landuseColour) {
    return { fillColor: rgb(...landuseColour), lineColor: HINT, lineWidthM: 0 };
  }

  return { fillColor: HINT, lineColor: HINT, lineWidthM: DEFAULT_LINE_WIDTH_M };
}

function styleForLineFeature(tags: Tags): FeatureStyle {
  if ("railway" in tags) {
    return { fillColor: RAILWAY, lineColor: RAILWAY, lineWidthM: RAILWAY_WIDTH_M };
  }
  if ("waterway" in tags) {
    return { fillColor: WATER, lineColor: WATER, lineWidthM: RIVER_DEFAULT_WIDTH_M };
  }
  const highway = tags.highway;
  const widthM = highway ? ROAD_WIDTH_M[highway] : undefined;
  if (highway && widthM !== undefined) {
    const fillColor = MAJOR_ROAD_CLASSES.has(highway.split("_")[0]) ? ROAD_FILL_MAJOR : ROAD_FILL_MINOR;
    return { fillColor, lineColor: fillColor, lineWidthM: widthM };
  }
  return { fillColor: HINT, lineColor: HINT, lineWidthM: DEFAULT_LINE_WIDTH_M };
}

/** The one entry point the frontend calls per feature. `isArea` picks
 * between the polygon-shaped rules (buildings/water/landuse) and the
 * line-shaped rules (roads/railway/waterways) -- matching
 * citymap/render.py's own split, which keys its road-drawing pass on
 * `not feature.area` specifically so an area-tagged `highway=pedestrian`
 * plaza is never drawn as a road. */
export function styleForFeature(tags: Tags, isArea: boolean, heightM: number, id: string): FeatureStyle {
  return isArea ? styleForAreaFeature(tags, heightM, id) : styleForLineFeature(tags);
}
