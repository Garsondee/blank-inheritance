/**
 * The real buildings of the campaign map, for the Location Editor -- the pure half (design/location-editor.md section 7, "Adopting a real
 * building"). The editor used to draw only the 237 locations that already exist, so a real building was invisible on the map and could not be
 * picked or adopted: a click on one found only the district around it. tools/location-sync/export_buildings.py writes every building of the
 * store that lies on the painted map's land as one static file (data/map/buildings-index.json, shipped to data/campaign/map/); this file reads
 * it, lays it on the hub scene, finds the footprint under a click, and turns a footprint into a draft place.
 *
 * Pure: no Foundry globals, no PIXI, nothing async. foundry/buildings-index.mjs fetches the file and the scene calibration;
 * foundry/location-draw-layer.mjs draws what this describes.
 *
 * The file: { kind: "buildings-index", version: 1, image: [w, h], kinds: [...], buildings: [[id, kindIndex, name|null, areaM2, ring], ...] }
 * where a ring is [x0, y0, dx1, dy1, ...]: the first vertex, then each next vertex as a step from the one before, in the map image's own pixels
 * (the same space as a location's derived.imagePx). The closing vertex is implied.
 */

import { addDraftItem, emptyFields, pointInRing } from "./location-editor.mjs";

export const INDEX_KIND = "buildings-index";
export const INDEX_VERSION = 1;

/** A tag the draft carries so adopting the same footprint twice finds the first, and the layer need not draw an outline over it. */
export const SOURCE_FLAG = "source";

/**
 * Read the file's document into plain buildings in image px: `{ id, kind, name, area, ring: [[x, y], ...] }`. A document that is not a
 * buildings index of this version throws (a wrong file must be loud, not an empty map); one bad row is skipped and counted.
 */
export function decodeIndex(doc) {
  if (!doc || doc.kind !== INDEX_KIND) throw new Error("not a buildings index");
  if (doc.version !== INDEX_VERSION) throw new Error(`buildings index version ${doc.version} (this reads ${INDEX_VERSION})`);
  if (!Array.isArray(doc.buildings) || !Array.isArray(doc.kinds)) throw new Error("a buildings index needs `kinds` and `buildings`");
  const buildings = [];
  let skipped = 0;
  for (const row of doc.buildings) {
    if (!Array.isArray(row) || row.length < 5 || typeof row[0] !== "string" || !Array.isArray(row[4]) || row[4].length < 6 || row[4].length % 2) { skipped++; continue; }
    const flat = row[4];
    const ring = [[flat[0], flat[1]]];
    let x = flat[0];
    let y = flat[1];
    for (let i = 2; i < flat.length; i += 2) { x += flat[i]; y += flat[i + 1]; ring.push([x, y]); }
    buildings.push({ id: row[0], kind: doc.kinds[row[1]] ?? "yes", name: typeof row[2] === "string" && row[2] ? row[2] : null, area: Number(row[3]) || 0, ring });
  }
  return { image: doc.image ?? null, kinds: doc.kinds, buildings, skipped };
}

function ringArea(ring) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

function distanceToSegment(px, py, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2)) : 0;
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

/**
 * The buildings laid on the hub scene, with a grid to find them by: `toScene` is the caller's calibration (`({x, y}) => ({x, y})`,
 * core/travel-animation.mjs#toScenePoint). Each building gets `ringScene` ([{x, y}]), `bounds`, `area` in scene px squared (for "the smallest
 * footprint under the click wins") and `areaM2` (the file's, in metres). `cell` is the grid cell's side in scene px.
 */
export function layOutBuildings(decoded, toScene, { cell = 256 } = {}) {
  const all = [];
  const grid = new Map();
  const key = (cx, cy) => cx * 100003 + cy;
  for (const b of decoded.buildings) {
    const ringScene = b.ring.map(([x, y]) => { const p = toScene({ x, y }); return { x: p.x, y: p.y }; });
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of ringScene) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    const item = { id: b.id, kind: b.kind, name: b.name, areaM2: b.area, ringScene, bounds: { x0, y0, x1, y1 }, area: ringArea(ringScene) };
    all.push(item);
    for (let cx = Math.floor(x0 / cell); cx <= Math.floor(x1 / cell); cx++) {
      for (let cy = Math.floor(y0 / cell); cy <= Math.floor(y1 / cell); cy++) {
        const k = key(cx, cy);
        const list = grid.get(k);
        if (list) list.push(item); else grid.set(k, [item]);
      }
    }
  }
  const inBox = (box) => {
    const seen = new Set();
    const out = [];
    for (let cx = Math.floor(box.x0 / cell); cx <= Math.floor(box.x1 / cell); cx++) {
      for (let cy = Math.floor(box.y0 / cell); cy <= Math.floor(box.y1 / cell); cy++) {
        for (const b of grid.get(key(cx, cy)) ?? []) {
          if (seen.has(b)) continue;
          seen.add(b);
          if (b.bounds.x0 <= box.x1 && b.bounds.x1 >= box.x0 && b.bounds.y0 <= box.y1 && b.bounds.y1 >= box.y0) out.push(b);
        }
      }
    }
    return out;
  };
  return {
    all,
    count: all.length,
    /** Every building whose box touches `box` ({x0, y0, x1, y1}, scene px). */
    inBox,
    /**
     * The building under (x, y): the SMALLEST footprint that contains the point (a house inside a compound is the answer, not the compound);
     * with none containing it, the nearest edge within `slop` scene px (a thin building clicked a hair off). `include` filters (a footprint
     * already adopted is not offered again). Null when nothing is that close.
     */
    hit(x, y, { slop = 0, include = () => true } = {}) {
      const near = inBox({ x0: x - slop, y0: y - slop, x1: x + slop, y1: y + slop });
      let best = null;
      for (const b of near) {
        if (!include(b) || x < b.bounds.x0 || x > b.bounds.x1 || y < b.bounds.y0 || y > b.bounds.y1) continue;
        if (pointInRing(x, y, b.ringScene) && (!best || b.area < best.area)) best = b;
      }
      if (best || !(slop > 0)) return best;
      let nearest = null;
      let nearestDistance = slop;
      for (const b of near) {
        if (!include(b)) continue;
        for (let i = 0; i < b.ringScene.length; i++) {
          const d = distanceToSegment(x, y, b.ringScene[i], b.ringScene[(i + 1) % b.ringScene.length]);
          if (d < nearestDistance) { nearest = b; nearestDistance = d; }
        }
      }
      return nearest;
    }
  };
}

/**
 * A building as the draw layer's hover and focus outlines want a shape: the same fields a published location has (`id`, `name`, `tier`,
 * `kind`, `ringsScene`, `bounds`, `area`), with a tier of "building" so nothing mistakes it for a location file.
 */
export function buildingAsShape(b) {
  return { id: `building:${b.id}`, name: b.name ?? "Unnamed building", tier: "building", kind: b.kind === "yes" ? "" : b.kind, rank: null, depth: null, status: null, ringsScene: [b.ringScene], pointScene: null, bounds: b.bounds, area: b.area, building: b };
}

/** What the pick callback is handed for a footprint: enough to adopt it, nothing the layer's own copy needs. */
export function buildingPick(b) {
  return { building: { id: b.id, kind: b.kind, name: b.name, areaM2: b.areaM2, ringScene: b.ringScene.map((p) => [p.x, p.y]) }, tier: "site", name: b.name ?? "" };
}

/** The note a place made from a real building starts with: where it came from, so the form is not blank and the origin is not lost. */
export function adoptedNote(building) {
  const what = building.kind && building.kind !== "yes" ? `${building.kind} building` : "building";
  return `A real ${what} of the map (footprint ${building.areaM2} m2, store id ${building.id}), adopted as it stands.`;
}

/**
 * Adopt a real building: a new draft SITE in the session whose outline is the footprint exactly, named after the building if the map
 * names it, with the note that says where it came from. Adopting a footprint already in the session returns that item. Returns
 * `{ session, item, adopted }`. The draft is saved, named and given a real id by the same Save a drawn building goes through.
 */
export function adoptBuilding(session, building) {
  const existing = Object.values(session.items).find((i) => i[SOURCE_FLAG]?.buildingId === building.id);
  if (existing) return { session, item: existing, adopted: false };
  const geometry = { kind: "polygon", ringPx: building.ringScene.map((p) => [p[0], p[1]]), holesPx: [] };
  const { session: grown, item } = addDraftItem(session, { tier: "site", geometry, name: building.name ?? null });
  const fields = { ...emptyFields(), name: building.name ?? null, note: adoptedNote(building) };
  const adoptedItem = { ...item, fields, [SOURCE_FLAG]: { buildingId: building.id, kind: building.kind, areaM2: building.areaM2 } };
  return { session: { ...grown, items: { ...grown.items, [item.localId]: adoptedItem } }, item: adoptedItem, adopted: true };
}

/** The ids of the footprints the session has already adopted (the layer draws no loose outline over those). */
export function adoptedBuildingIds(session) {
  return new Set(Object.values(session.items).map((i) => i[SOURCE_FLAG]?.buildingId).filter(Boolean));
}
