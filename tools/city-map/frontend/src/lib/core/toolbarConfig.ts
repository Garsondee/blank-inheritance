/**
 * The single source of truth for every direct-draw toolbar button's tags/
 * height/geometry-type/grouping -- map-editor plan Phase 13 ("big chunky
 * buttons... click the specific road or rail type I want without having to
 * dive into submenus"). Pure, tier0-compliant (no maplibre-gl/svelte/window/
 * document) -- App.svelte wires these configs into real TerraDraw draw
 * modes (via edit.ts's existing terraDrawModeForGeometryType) and POST
 * /api/features calls, but the data describing WHAT each button creates
 * lives here, testable without any of that machinery.
 */

import { ROAD_WIDTH_M, styleForFeature } from "./style";

export interface ToolbarButtonConfig {
  key: string;
  label: string;
  section: "roads" | "buildings";
  geometryType: "LineString" | "Polygon";
  tags: Record<string, string>;
  isArea: boolean;
  heightM: number;
}

// Every real highway class in the style file (data/map/style/kurose-1950s.json's
// own "roads" object, the SAME keys as core/style.ts's ROAD_WIDTH_M) -- the
// user's own explicit choice ("every real class (21 + rail)"), not a
// curated subset.
const ROAD_CLASS_LABELS: Record<string, string> = {
  motorway: "Motorway",
  motorway_link: "Motorway Link",
  trunk: "Trunk",
  trunk_link: "Trunk Link",
  primary: "Primary",
  primary_link: "Primary Link",
  secondary: "Secondary",
  secondary_link: "Secondary Link",
  tertiary: "Tertiary",
  tertiary_link: "Tertiary Link",
  residential: "Residential",
  unclassified: "Unclassified",
  living_street: "Living Street",
  pedestrian: "Pedestrian",
  service: "Service",
  footway: "Footway",
  steps: "Steps",
  track: "Track",
  bridleway: "Bridleway",
  cycleway: "Cycleway",
  road: "Road (unknown)",
};

export const ROAD_RAIL_CLASSES: ToolbarButtonConfig[] = [
  ...Object.keys(ROAD_WIDTH_M).map((highwayClass) => ({
    key: `road-${highwayClass}`,
    label: ROAD_CLASS_LABELS[highwayClass] ?? highwayClass,
    section: "roads" as const,
    geometryType: "LineString" as const,
    tags: { highway: highwayClass },
    isArea: false,
    heightM: 0,
  })),
  {
    key: "rail",
    label: "Rail",
    section: "roads" as const,
    geometryType: "LineString" as const,
    tags: { railway: "rail" },
    isArea: false,
    heightM: 0,
  },
];

// Deliberately escalating heights -- each sits at a genuinely different
// point on both render.py's and this app's own heightK = min(1, height/55)
// roof-blend curve (0.12/0.22/0.55/0.82) before Tower and Antenna both
// saturate near 1.0, where they still differ honestly via shadow-sweep
// length (height_m * 0.55). The exact `building=` value never drives color
// (an id-hash into the roof palette does) -- these are safe new semantic
// labels, not a rendering risk. Antenna gets a real `building` tag (not a
// bare man_made=antenna) so it renders through render.py's unconditional
// "building in tags" pass, same as the other four presets.
export const BUILDING_PRESETS: ToolbarButtonConfig[] = [
  { key: "house", label: "House", section: "buildings", geometryType: "Polygon",
    tags: { building: "house" }, isArea: true, heightM: 6.5 },
  { key: "hall", label: "Hall", section: "buildings", geometryType: "Polygon",
    tags: { building: "hall" }, isArea: true, heightM: 12.0 },
  { key: "tall-building", label: "Tall Building", section: "buildings", geometryType: "Polygon",
    tags: { building: "commercial" }, isArea: true, heightM: 30.0 },
  { key: "tower", label: "Tower", section: "buildings", geometryType: "Polygon",
    tags: { building: "tower" }, isArea: true, heightM: 45.0 },
  { key: "antenna", label: "Antenna", section: "buildings", geometryType: "Polygon",
    tags: { building: "antenna" }, isArea: true, heightM: 60.0 },
];

export const TOOLBAR_FEATURE_BUTTONS: ToolbarButtonConfig[] = [...ROAD_RAIL_CLASSES, ...BUILDING_PRESETS];

/** A rough preview color/width for a toolbar button, reusing the SAME
 * styleForFeature the live map itself paints with -- so a button's swatch
 * never silently drifts from what drawing it would actually look like. */
export function previewStyleForButton(config: ToolbarButtonConfig) {
  return styleForFeature(config.tags, config.isArea, config.heightM, config.key);
}
