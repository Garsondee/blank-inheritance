/**
 * The Location Editor's hand-off to Claude (design/location-editor.md section 14): one JSON document, copied to the clipboard from the
 * editor, that says WHICH shape the GM has picked -- its exact outline in the map image's own pixels, what it was adopted from (a real
 * building's store id), what is drawn in the panel's form, what district it lies in and what is near it -- so pasting it into the chat is
 * enough for Claude to carry out the rest of the work (name it, write its lore, make it the place a scene happens). The GM's brief is her
 * words beside the paste; this carries everything that cannot be said in words.
 *
 * Pure: the Foundry half (foundry/location-editor.mjs) gathers the inputs and does the copying. The repo half is
 * tools/location-sync/from-handoff.mjs, which turns one item into a data/locations/<id>.json and can site a scene at it.
 * Geometry is `{ rings: [[[x, y], ...], ...holes], point }` in map-image pixels -- exactly what a location-edit record's `geometry` is --
 * so it goes through the same apply_geometry.py bridge a saved drawing does.
 */

import { pointInRing, ringCentroid } from "./location-editor.mjs";

export const HANDOFF_KIND = "location-handoff";
export const HANDOFF_VERSION = 1;

/** How many neighbours the document names. */
export const NEAREST_LIMIT = 6;

const round = (n, places = 2) => {
  const f = 10 ** places;
  return Math.round(Number(n) * f) / f;
};
const pairs = (ring) => ring.map(([x, y]) => [round(x), round(y)]);
const toPoints = (ring) => ring.map(([x, y]) => ({ x, y }));

function ringArea(ring) {
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(area) / 2;
}

function polygonArea(rings) {
  if (!rings?.length) return 0;
  return ringArea(rings[0]) - rings.slice(1).reduce((sum, hole) => sum + ringArea(hole), 0);
}

function pointToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / len2));
  return Math.hypot(p.x - (a[0] + t * dx), p.y - (a[1] + t * dy));
}

/** Distance from a point to a published location: to its pin, or to the nearest edge of its outline (0 inside it). */
function distanceTo(shape, p) {
  if (shape.point) return Math.hypot(p.x - shape.point[0], p.y - shape.point[1]);
  const shell = shape.rings?.[0];
  if (!shell?.length) return Infinity;
  if (pointInRing(p.x, p.y, toPoints(shell))) return 0;
  let best = Infinity;
  for (let i = 0; i < shell.length; i++) best = Math.min(best, pointToSegment(p, shell[i], shell[(i + 1) % shell.length]));
  return best;
}

const describe = (shape) => ({ id: shape.id, name: shape.name ?? null, tier: shape.tier, kind: shape.kind ?? "" });

/** Where a session item sits, in map-image pixels: its geometry, centre, box and size. Null for an item with nothing drawn. */
export function itemImageGeometry(item, toImage, metresPerPixel = null) {
  const g = item?.geometry;
  if (!g) return null;
  if (g.kind === "point") {
    const p = toImage({ x: g.pointPx[0], y: g.pointPx[1] });
    return { geometry: { rings: [], point: [round(p.x), round(p.y)] }, centre: { x: p.x, y: p.y }, bounds: null, areaPx2: 0, areaM2: null };
  }
  const shell = (g.ringPx ?? []).map(([x, y]) => { const p = toImage({ x, y }); return [p.x, p.y]; });
  if (shell.length < 3) return null;
  const holes = (g.holesPx ?? []).map((hole) => hole.map(([x, y]) => { const p = toImage({ x, y }); return [p.x, p.y]; }));
  const rings = [shell, ...holes];
  const centre = ringCentroid(toPoints(shell));
  const xs = shell.map((p) => p[0]);
  const ys = shell.map((p) => p[1]);
  const areaPx2 = polygonArea(rings);
  return {
    geometry: { rings: rings.map(pairs), point: null },
    centre,
    bounds: { x0: round(Math.min(...xs)), y0: round(Math.min(...ys)), x1: round(Math.max(...xs)), y1: round(Math.max(...ys)) },
    areaPx2,
    areaM2: Number.isFinite(metresPerPixel) ? round(areaPx2 * metresPerPixel * metresPerPixel, 1) : null
  };
}

/**
 * Everything the chat needs about the picked item(s).
 *
 * `items`: `[{ item, fields }]`, each a session item from the draw layer (`{ localId, tier, locationId, geometry: { kind, ringPx | pointPx }, source? }`)
 *   and the panel's fields for it (core/location-editor.mjs#emptyFields shape). `toImage({x, y})` maps scene px to map-image px.
 *   `published`: the deployed locations as `{ id, name, tier, kind, rings, point }` in map-image px (core/location-published.mjs shapes).
 */
export function buildHandoff({ at, scene = null, items = [], toImage, published = [], metresPerPixel = null, drawFor = null } = {}) {
  const out = [];
  for (const { item, fields = null } of items) {
    const where = itemImageGeometry(item, toImage, metresPerPixel);
    if (!where) continue;
    const others = published.filter((s) => s.id !== item.locationId);
    const containedIn = others
      .filter((s) => s.rings?.length && pointInRing(where.centre.x, where.centre.y, toPoints(s.rings[0])) && !s.rings.slice(1).some((h) => pointInRing(where.centre.x, where.centre.y, toPoints(h))))
      .map((s) => ({ ...describe(s), _area: polygonArea(s.rings) }))
      .sort((a, b) => a._area - b._area)
      .map(({ _area, ...rest }) => rest);
    const nearest = others
      .map((s) => ({ ...describe(s), _d: distanceTo(s, where.centre) }))
      .filter((s) => Number.isFinite(s._d))
      .sort((a, b) => a._d - b._d)
      .slice(0, NEAREST_LIMIT)
      .map(({ _d, ...rest }) => ({ ...rest, distanceM: Number.isFinite(metresPerPixel) ? round(_d * metresPerPixel, 1) : null, distancePx: round(_d, 1) }));
    out.push({
      index: out.length,
      localId: item.localId ?? null,
      tier: item.tier,
      locationId: item.locationId ?? null,
      saved: Boolean(item.locationId),
      name: fields?.name ?? item.name ?? null,
      adoptedFrom: item.source ? { buildingId: item.source.buildingId ?? null, kind: item.source.kind ?? null, areaM2: item.source.areaM2 ?? null } : null,
      fields,
      geometry: where.geometry,
      centreImagePx: [round(where.centre.x), round(where.centre.y)],
      boundsImagePx: where.bounds,
      areaM2: where.areaM2,
      containedIn,
      nearest
    });
  }
  return {
    kind: HANDOFF_KIND,
    version: HANDOFF_VERSION,
    copiedAt: at ?? null,
    from: "Location Editor (Foundry)",
    map: { sceneId: scene?.id ?? null, sceneName: scene?.name ?? null, metresPerPixel: Number.isFinite(metresPerPixel) ? metresPerPixel : null },
    drawingFor: drawFor?.label ?? null,
    items: out,
    howToUse: [
      "The GM picked these shapes in the Location Editor and copied them for Claude; her brief is the message this was pasted with.",
      "`geometry` is in the map image's own pixels, the same form as a location-edit record's geometry. `adoptedFrom` is the real building (store id) an outline was adopted from; null for a drawn one.",
      "To make a new location from item N (writes data/locations/<id>.json as drafted): save this text to a file and run `node tools/location-sync/from-handoff.mjs <file> --item N --id <new-id> [--name ...] [--kind ...] [--scene <scene-set id>]`; --dry-run says what it would do.",
      "An item with saved:true is an existing location (`locationId`): edit data/locations/<id>.json directly. Siting a scene is the GM's call: --scene only when she has said which."
    ]
  };
}

/** The text copied to the clipboard: readable, two-space JSON. */
export function serialiseHandoff(handoff) {
  return JSON.stringify(handoff, null, 2);
}

/**
 * Read pasted text back: bare JSON, or JSON inside a Markdown code fence (a chat window may wrap it). Returns `{ ok: true, handoff }` or
 * `{ ok: false, error }`; never throws.
 */
export function parseHandoff(text) {
  let body = String(text ?? "").trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i.exec(body);
  if (fenced) body = fenced[1].trim();
  let doc;
  try { doc = JSON.parse(body); } catch (err) { return { ok: false, error: `not JSON: ${err.message}` }; }
  if (!doc || doc.kind !== HANDOFF_KIND) return { ok: false, error: `not a location hand-off (kind is ${JSON.stringify(doc?.kind)})` };
  if (doc.version !== HANDOFF_VERSION) return { ok: false, error: `a version ${doc.version} hand-off; this reads version ${HANDOFF_VERSION}` };
  if (!Array.isArray(doc.items) || !doc.items.length) return { ok: false, error: "the hand-off has no items" };
  return { ok: true, handoff: doc };
}
