/**
 * The Location Editor's view of what already exists -- the pure half
 * (design/location-editor.md §10 phase 7). Every `data/locations/*.json` is a
 * real, deployed place; the GM has to be able to SEE all of them on the map,
 * point at one, and open it for editing. The first version of this tool only
 * ever drew the session's own drafts, so a GM opening it saw an empty map --
 * the single biggest gap between it and the gazetteer it replaced.
 *
 * Pure: no Foundry globals, no PIXI, nothing async. foundry/location-published.mjs
 * fetches the files; foundry/location-draw-layer.mjs draws what this describes.
 *
 * A "shape" is one location reduced to just what the map needs, in two
 * stages: image px straight out of the file (`publishedShapeFromDoc`), then
 * scene px once the caller has the scene calibration (`shapeToScene`).
 */

import { addDraftItem, pointInRing } from "./location-editor.mjs";

const isPair = (p) => Array.isArray(p) && p.length >= 2 && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1]));

/**
 * One deployed location document -> a map shape in master-image px, or null
 * when the file has nothing drawable (a region/site needs a real shell ring;
 * a point needs its centroid). Reads `derived.imagePx`/`derived.centroidPx`,
 * never `geometry.rings`: the latter is lon/lat, the canonical storage space,
 * and the draw layer works in pixels (the same distinction
 * tools/location-sync/apply_geometry.py had to get right for the bisect cut).
 */
export function publishedShapeFromDoc(doc) {
  if (!doc || typeof doc !== "object" || typeof doc.id !== "string" || !doc.id) return null;
  const derived = doc.derived ?? {};
  const base = {
    id: doc.id,
    name: doc.name ?? null,
    tier: doc.tier,
    kind: doc.kind ?? "",
    rank: doc.rank ?? null,
    depth: doc.depth ?? null,
    status: doc.authoring?.status ?? null
  };
  if (doc.tier === "point") {
    if (!isPair(derived.centroidPx)) return null;
    return { ...base, rings: [], point: [Number(derived.centroidPx[0]), Number(derived.centroidPx[1])] };
  }
  if (doc.tier === "region" || doc.tier === "site") {
    const rings = Array.isArray(derived.imagePx) ? derived.imagePx : [];
    const shell = rings[0];
    if (!Array.isArray(shell) || shell.length < 3 || !shell.every(isPair)) return null;
    const clean = rings
      .filter((ring, i) => i === 0 || (Array.isArray(ring) && ring.length >= 3 && ring.every(isPair)))
      .map((ring) => ring.map((p) => [Number(p[0]), Number(p[1])]));
    return { ...base, rings: clean, point: null };
  }
  return null;
}

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

/**
 * A shape in scene px. `toScene` is `({x, y}) => ({x, y})`, the caller's
 * calibration (core/travel-animation.mjs#toScenePoint) -- kept as an argument
 * so this file never needs to know where a calibration comes from.
 */
export function shapeToScene(shape, toScene) {
  const ringsScene = shape.rings.map((ring) => ring.map(([x, y]) => {
    const p = toScene({ x, y });
    return { x: p.x, y: p.y };
  }));
  const pointScene = shape.point ? (({ x, y }) => ({ x, y }))(toScene({ x: shape.point[0], y: shape.point[1] })) : null;
  const pts = ringsScene[0] ?? (pointScene ? [pointScene] : []);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const bounds = pts.length
    ? { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
    : { x0: 0, y0: 0, x1: 0, y1: 0 };
  // A region with an island in it covers less ground than its shell says;
  // the smallest-area-wins hit rule has to compare what is actually covered.
  const area = ringsScene.length
    ? ringArea(ringsScene[0]) - ringsScene.slice(1).reduce((sum, hole) => sum + ringArea(hole), 0)
    : 0;
  return { ...shape, ringsScene, pointScene, bounds, area };
}

/** Is (x, y) inside this polygon shape -- inside the shell and not inside any hole? */
export function pointInShape(shape, x, y) {
  const rings = shape.ringsScene;
  if (!rings?.length) return false;
  const b = shape.bounds;
  if (b && (x < b.x0 || x > b.x1 || y < b.y0 || y > b.y1)) return false;
  if (!pointInRing(x, y, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) if (pointInRing(x, y, rings[i])) return false;
  return true;
}

/**
 * Which existing location is under (x, y), if any -- draw.js#hitTestAt's own
 * rule, extended to holes: a pin within `pinRadius` always wins (nearest
 * first), otherwise the SMALLEST polygon that contains the point, so a
 * building inside a district is the answer rather than the district.
 * `pinRadius` is in scene px: the caller converts its screen-px target size,
 * which is how it stays the same size to the eye at every zoom.
 * `include` filters (hidden tiers, locations already open in the session).
 */
export function hitTestPublished(shapes, x, y, { pinRadius = 12, include = () => true } = {}) {
  let bestPin = null, bestPinDistance = Infinity;
  for (const shape of shapes) {
    if (!shape.pointScene || !include(shape)) continue;
    const d = Math.hypot(shape.pointScene.x - x, shape.pointScene.y - y);
    if (d <= pinRadius && d < bestPinDistance) { bestPin = shape; bestPinDistance = d; }
  }
  if (bestPin) return bestPin;
  let best = null, bestArea = Infinity;
  for (const shape of shapes) {
    if (shape.pointScene || !include(shape) || !pointInShape(shape, x, y)) continue;
    if (shape.area < bestArea) { best = shape; bestArea = shape.area; }
  }
  return best;
}

const clone = (value) => JSON.parse(JSON.stringify(value));

/**
 * Open an existing location in the session so it can be selected and edited.
 * It becomes a session item linked to the real file (`locationId`), locked
 * the way every promoted item is, and marked `peek: true` -- looked at, not
 * yet changed. A peeked item that is never touched is let go again the moment
 * something else is selected (`releasePeeked`), so clicking around the map to
 * see what is there leaves nothing behind in the working list.
 * `baselineGeometry` is what the file said when it was opened, so Save can
 * tell a reshaped region from one that was only read.
 * Opening a location that is already in the session returns that item.
 */
export function adoptPublished(session, shape) {
  const existing = Object.values(session.items).find((item) => item.locationId === shape.id);
  if (existing) return { session, item: existing, adopted: false };
  const geometry = shape.pointScene
    ? { kind: "point", pointPx: [shape.pointScene.x, shape.pointScene.y] }
    : {
      kind: "polygon",
      ringPx: shape.ringsScene[0].map((p) => [p.x, p.y]),
      holesPx: shape.ringsScene.slice(1).map((hole) => hole.map((p) => [p.x, p.y]))
    };
  const { session: grown, item } = addDraftItem(session, { tier: shape.tier, geometry, name: shape.name });
  const linked = { ...item, locationId: shape.id, locked: true, peek: true, baselineGeometry: clone(geometry) };
  return { session: { ...grown, items: { ...grown.items, [item.localId]: linked } }, item: linked, adopted: true };
}

/** Let go of every still-untouched peeked item that is not in `keepIds`. */
export function releasePeeked(session, keepIds) {
  const keep = new Set(keepIds);
  const released = Object.values(session.items).filter((item) => item.peek === true && !keep.has(item.localId)).map((item) => item.localId);
  if (!released.length) return { session, released };
  const items = { ...session.items };
  for (const id of released) delete items[id];
  return { session: { ...session, items }, released };
}

/** Has this item's outline moved since it was opened? Anything with no baseline (a fresh drawing) counts as changed. */
export function itemGeometryChanged(item) {
  if (!item.baselineGeometry) return true;
  return JSON.stringify(item.baselineGeometry) !== JSON.stringify(item.geometry);
}

/** `visibility` is `{region, site, point}` booleans; anything not explicitly false is shown. */
export function publishedVisible(shape, visibility) {
  return visibility?.[shape.tier] !== false;
}

/** The box that holds every one of these scene-px shapes ({x0,y0,x1,y1}), or null when there are none. */
export function publishedBounds(shapes) {
  let box = null;
  for (const shape of shapes) {
    const b = shape.bounds;
    if (!b) continue;
    box = box
      ? { x0: Math.min(box.x0, b.x0), y0: Math.min(box.y0, b.y0), x1: Math.max(box.x1, b.x1), y1: Math.max(box.y1, b.y1) }
      : { ...b };
  }
  return box;
}

/** Do two {x0,y0,x1,y1} boxes overlap (touching counts)? */
export function boxesOverlap(a, b) {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.y0 <= b.y1 && a.y1 >= b.y0;
}

/**
 * Where to put the camera so a box fills a screen of `width` x `height`:
 * `{x, y, scale}` (the scene point to put at the centre of the screen, and the
 * zoom), or null for a degenerate box. `margin` is the fraction of the room
 * left empty (0.1 = the box fills 90%). `insetLeft` is how much of the
 * screen's left edge a window covers: the box is fitted into, and centred in,
 * what is left to its right, rather than disappearing behind the window.
 */
export function fitView(box, width, height, { margin = 0.1, insetLeft = 0 } = {}) {
  if (!box || !(width > 0) || !(height > 0)) return null;
  const inset = Math.min(Math.max(insetLeft, 0), width * 0.7);
  const room = width - inset;
  const w = Math.max(box.x1 - box.x0, 1);
  const h = Math.max(box.y1 - box.y0, 1);
  const scale = Math.min(room / w, height / h) * (1 - margin);
  // the box's centre belongs at screen x = inset + room / 2; the camera's x is what sits at screen x = width / 2
  const centreOnScreen = inset + room / 2;
  return {
    x: (box.x0 + box.x1) / 2 - (centreOnScreen - width / 2) / scale,
    y: (box.y0 + box.y1) / 2,
    scale
  };
}
