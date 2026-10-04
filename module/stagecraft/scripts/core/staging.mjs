/**
 * Staging by hand: moving a scene's marks and the corners of its zones. Pure. These work on a scene's authored description
 * (the raw `marks` and `zones` arrays, as the flags keep them) and hand back a new array, or the very same one when nothing
 * changed, so nothing is written for a drag that went nowhere. Every point is a fraction of the painting, kept inside it and
 * rounded to three places (the way the stages file is written).
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round = (n) => Math.round(n * 1000) / 1000;

/** A point as it may be kept: inside the painting, three places. Null if it is not a point. */
export function keepPoint(p) {
  if (!Array.isArray(p) || p.length < 2 || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) return null;
  return [round(clamp(p[0], 0, 1)), round(clamp(p[1], 0, 1))];
}

const same = (a, b) => Array.isArray(a) && a[0] === b[0] && a[1] === b[1];

/** The id a mark or zone has, written or not (scene.mjs numbers an unnamed one by its place in the list). */
export const idOf = (item, index, prefix) => (typeof item?.id === "string" && item.id ? item.id : `${prefix}-${index + 1}`);

/** A mark moved to a point. */
export function moveMark(marks, id, at) {
  const to = keepPoint(at);
  if (!to || !Array.isArray(marks)) return marks;
  const i = marks.findIndex((m, k) => idOf(m, k, "mark") === id);
  if (i < 0 || same(marks[i].at, to)) return marks;
  return marks.map((m, k) => (k === i ? { ...m, at: to } : m));
}

/** One corner of a zone moved to a point. */
export function moveVertex(zones, id, index, at) {
  const to = keepPoint(at);
  if (!to || !Array.isArray(zones)) return zones;
  const i = zones.findIndex((z, k) => idOf(z, k, "zone") === id);
  const shape = zones[i]?.shape;
  if (i < 0 || !Array.isArray(shape) || !(index >= 0 && index < shape.length) || same(shape[index], to)) return zones;
  return zones.map((z, k) => (k === i ? { ...z, shape: shape.map((v, j) => (j === index ? to : v)) } : z));
}

/** A whole zone moved by (dx, dy): its corners, and its floor outline if it has one. It never leaves the painting: the move is cut short instead. */
export function moveZone(zones, id, dx, dy) {
  if (!Array.isArray(zones) || !Number.isFinite(dx) || !Number.isFinite(dy)) return zones;
  const i = zones.findIndex((z, k) => idOf(z, k, "zone") === id);
  const zone = zones[i];
  if (i < 0 || !Array.isArray(zone?.shape)) return zones;
  const all = [...zone.shape, ...(Array.isArray(zone.floor) ? zone.floor : [])].filter((p) => Array.isArray(p));
  const lo = [Math.min(...all.map((p) => p[0])), Math.min(...all.map((p) => p[1]))];
  const hi = [Math.max(...all.map((p) => p[0])), Math.max(...all.map((p) => p[1]))];
  const mx = clamp(dx, -lo[0], 1 - hi[0]);
  const my = clamp(dy, -lo[1], 1 - hi[1]);
  if (Math.abs(mx) < 5e-4 && Math.abs(my) < 5e-4) return zones;
  const shift = (list) => list.map((p) => [round(p[0] + mx), round(p[1] + my)]);
  return zones.map((z, k) => (k === i ? { ...z, shape: shift(z.shape), ...(Array.isArray(z.floor) ? { floor: shift(z.floor) } : {}) } : z));
}

/** A corner added to a zone after corner `after` (half way along that edge unless a point is given). A zone keeps at least three. */
export function addVertex(zones, id, after, at = null) {
  if (!Array.isArray(zones)) return zones;
  const i = zones.findIndex((z, k) => idOf(z, k, "zone") === id);
  const shape = zones[i]?.shape;
  if (i < 0 || !Array.isArray(shape) || !(after >= 0 && after < shape.length)) return zones;
  const a = shape[after];
  const b = shape[(after + 1) % shape.length];
  const to = keepPoint(at) ?? keepPoint([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  return zones.map((z, k) => (k === i ? { ...z, shape: [...shape.slice(0, after + 1), to, ...shape.slice(after + 1)] } : z));
}

/** A corner taken away. A zone with three corners keeps them all. */
export function removeVertex(zones, id, index) {
  if (!Array.isArray(zones)) return zones;
  const i = zones.findIndex((z, k) => idOf(z, k, "zone") === id);
  const shape = zones[i]?.shape;
  if (i < 0 || !Array.isArray(shape) || shape.length <= 3 || !(index >= 0 && index < shape.length)) return zones;
  return zones.map((z, k) => (k === i ? { ...z, shape: shape.filter((_, j) => j !== index) } : z));
}

/** The middle of a zone's corners, where its handle for moving the whole thing goes. */
export function centroid(shape) {
  const pts = (shape ?? []).filter((p) => Array.isArray(p));
  if (!pts.length) return null;
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
}

/**
 * Everything on a stage that can be grabbed, for the editor to draw handles on: each mark, each corner of each zone, and each
 * zone's middle. From the described scene (`marks` with `at`, `zones` with `shape`).
 */
export function handlesOf(scene) {
  const out = [];
  for (const m of scene?.marks ?? []) out.push({ kind: "mark", id: m.id, at: m.at, label: m.label ?? m.id });
  for (const z of scene?.zones ?? []) {
    (z.shape ?? []).forEach((p, index) => out.push({ kind: "vertex", id: z.id, index, at: p, label: z.name ?? z.id }));
    const mid = centroid(z.shape);
    if (mid) out.push({ kind: "zone", id: z.id, at: mid, label: z.name ?? z.id });
  }
  return out;
}
