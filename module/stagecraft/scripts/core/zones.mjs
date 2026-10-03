/**
 * Zones: named areas of the painting (stage.md §8). Pure.
 *
 * A zone is a polygon in fractions of the painting. A card is "in" a zone when its feet, projected back onto the
 * painting, are inside the polygon. The outline has three states (stage.md §8.8): at rest it is a hairline; near, when
 * a card is held within reach of it; target, when a held card is over it.
 */

export const OUTLINE = Object.freeze({ rest: "rest", near: "near", target: "target" });

/** How strong an outline is at rest, by the player's setting (stage.md §8.8). */
export const REST_STRENGTH = Object.freeze({ faint: 0.2, off: 0, full: 1 });

/** Ray casting. `poly` is a list of [x, y]; the point is [x, y]. */
export function pointInPolygon(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Shortest distance from a point to a polygon's outline, in the same units (fractions). */
export function distanceToPolygon(poly, x, y) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j];
    const [bx, by] = poly[i];
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    best = Math.min(best, Math.hypot(x - (ax + u * dx), y - (ay + u * dy)));
  }
  return best;
}

export function centroid(poly) {
  let x = 0;
  let y = 0;
  for (const [px, py] of poly) { x += px; y += py; }
  return [x / poly.length, y / poly.length];
}

/**
 * Where a card acts on a zone. A zone drawn on the wall (a door, a window) has a `floor` strip in front of it; an area
 * on the floor is its own shape.
 */
export const zoneArea = (z) => (z.floor && z.floor.length >= 3 ? z.floor : z.shape);

/** The zones a point (fractions of the painting) is inside, on the floor where cards stand. */
export function zonesAt(zones, x, y) {
  return zones.filter((z) => pointInPolygon(zoneArea(z), x, y));
}

/**
 * The state of each zone's outline right now.
 * `held` is a list of { x, y } feet of the cards in someone's hand, in fractions of the painting.
 * `reach` is how close counts as "near", as a fraction of the painting's width.
 */
export function outlineStates(zones, held, reach = 0.1) {
  const out = {};
  for (const z of zones) {
    let state = OUTLINE.rest;
    const area = zoneArea(z);
    for (const h of held) {
      if (pointInPolygon(area, h.x, h.y)) { state = OUTLINE.target; break; }
      if (distanceToPolygon(area, h.x, h.y) <= reach) state = OUTLINE.near;
    }
    out[z.id] = state;
  }
  return out;
}

/** The strength (0 to 1) an outline is drawn at, from its state and the player's rest setting. */
export function outlineStrength(zone, state, setting = "faint") {
  if (state === OUTLINE.target) return 1;
  if (state === OUTLINE.near) return 0.85;
  if (zone.quiet) return 0;
  return REST_STRENGTH[setting] ?? REST_STRENGTH.faint;
}

/** How far apart two zones' floors are (fractions of the painting): zero when they touch or overlap. */
export function zoneGap(a, b) {
  const A = zoneArea(a);
  const B = zoneArea(b);
  if (A.some(([x, y]) => pointInPolygon(B, x, y)) || B.some(([x, y]) => pointInPolygon(A, x, y))) return 0;
  let best = Infinity;
  for (const [x, y] of A) best = Math.min(best, distanceToPolygon(B, x, y));
  for (const [x, y] of B) best = Math.min(best, distanceToPolygon(A, x, y));
  return best;
}

/**
 * The range bands of a fight on zones (stage.md §8.6): which positions are next to each other ("near", one Stride).
 * Anything not listed is "far", and two cards in the same zone are "engaged". A scene may say which zones are near which
 * (`near: [ids]` on a zone); if no zone says, zones whose floors touch, or nearly, are near. Only zones of kind `area`
 * (positions) take part. Returns [{ a, b }] with each pair once, a before b alphabetically.
 */
export function rangeBands(zones, { touch = 0.035 } = {}) {
  const areas = zones.filter((z) => z.kind === "area");
  const ids = new Set(areas.map((z) => z.id));
  const pairs = new Map();
  const add = (a, b) => {
    if (a === b || !ids.has(a) || !ids.has(b)) return;
    const [x, y] = a < b ? [a, b] : [b, a];
    pairs.set(`${x}|${y}`, { a: x, b: y });
  };
  const authored = areas.some((z) => Array.isArray(z.near) && z.near.length);
  if (authored) for (const z of areas) for (const other of z.near ?? []) add(z.id, other);
  else for (let i = 0; i < areas.length; i++) for (let j = i + 1; j < areas.length; j++) if (zoneGap(areas[i], areas[j]) <= touch) add(areas[i].id, areas[j].id);
  return [...pairs.values()].sort((p, q) => (p.a + p.b < q.a + q.b ? -1 : 1));
}

/**
 * Entering and leaving. `previous` is a Map of card id to a Set of zone ids; `now` is the same for this moment.
 * Returns the changes as events, and does not mutate either.
 */
export function zoneChanges(previous, now) {
  const events = [];
  for (const [card, zones] of now) {
    const before = previous.get(card) ?? new Set();
    for (const z of zones) if (!before.has(z)) events.push({ type: "zone", card, zone: z, entered: true });
  }
  for (const [card, before] of previous) {
    const zones = now.get(card) ?? new Set();
    for (const z of before) if (!zones.has(z)) events.push({ type: "zone", card, zone: z, entered: false });
  }
  return events;
}
