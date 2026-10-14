/**
 * Where the water is on the campaign map -- the pure reader of data/map/land-grid.json (tools/location-sync/export_land_grid.py).
 *
 * The router (core/travel-route.mjs) knows streets and rails and nothing else: where none is drawn it simply walks, and "walk across the ocean" is exactly what
 * it does when a road stops at the shore. That was the live bug of 2026-09-19 ("landed in the ocean") and of 2026-09-23 ("a straight line across a street
 * grid"). The journey checks (core/journey-checks.mjs) need to tell a short walk from a station door to a street apart from a walk across the bay, so they ask
 * this: is this point water on the painted map, and how much of this straight stretch is?
 *
 * The grid is coarse (25 m samples) and is only a judge of ground that matters at that size: a quay edge can be wrong by a sample. So every question here has
 * three answers where it can, water / land / unknown (outside the painted content area: the border), and nothing counts as water unless the grid says water.
 */

export const LAND_GRID_KIND = "land-grid";
export const LAND_GRID_VERSION = 1;

/**
 * The file's document -> a grid you can ask. Throws on a file that is not a land grid of this version or whose runs do not fill it, so a bad export is
 * loud rather than a map that is quietly all land.
 */
export function decodeLandGrid(doc) {
  if (!doc || doc.kind !== LAND_GRID_KIND) throw new Error("not a land grid");
  if (doc.version !== LAND_GRID_VERSION) throw new Error(`a version ${doc.version} land grid; this reads version ${LAND_GRID_VERSION}`);
  const { cols, rows, step } = doc;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || !(step > 0) || !Array.isArray(doc.runs) || !Array.isArray(doc.origin)) throw new Error("the land grid is missing its size, step, origin or runs");
  const water = new Uint8Array(cols * rows);
  let at = 0;
  for (const [value, length] of doc.runs) {
    if (at + length > water.length) throw new Error("the land grid's runs are longer than the grid");
    if (value === 1) water.fill(1, at, at + length);
    at += length;
  }
  if (at !== water.length) throw new Error(`the land grid's runs cover ${at} samples, the grid has ${water.length}`);
  const x0 = doc.origin[0] - step / 2;
  const y0 = doc.origin[1] - step / 2;
  const grid = {
    cols, rows, step, x0, y0,
    x1: x0 + cols * step,
    y1: y0 + rows * step,
    water,
    /** true: water; false: land; null: outside the painted content area, where the grid says nothing. */
    isWater(x, y) {
      const c = Math.floor((x - x0) / step);
      const r = Math.floor((y - y0) / step);
      if (c < 0 || r < 0 || c >= cols || r >= rows) return null;
      return water[r * cols + c] === 1;
    },
    isLand(x, y) {
      const w = grid.isWater(x, y);
      return w === null ? null : !w;
    }
  };
  return grid;
}

/**
 * How much of the straight stretch a -> b is over water, over land, and outside the grid, in the map's own units (metres at the map's scale of 1 per pixel).
 * Sampled at half a grid cell, so a strip of water one cell wide cannot be stepped over. `a` and `b` are `{ x, y }`.
 */
export function crossing(grid, a, b) {
  const total = Math.hypot(b.x - a.x, b.y - a.y);
  if (!(total > 0)) return { total: 0, water: 0, land: 0, unknown: 0 };
  const spacing = grid.step / 2;
  const steps = Math.max(1, Math.ceil(total / spacing));
  const part = total / steps;
  let water = 0;
  let land = 0;
  let unknown = 0;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const w = grid.isWater(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    if (w === null) unknown += part;
    else if (w) water += part;
    else land += part;
  }
  return { total, water, land, unknown };
}

/** `crossing` summed along a polyline of `{ x, y }` points. */
export function crossingAlong(grid, points) {
  const sum = { total: 0, water: 0, land: 0, unknown: 0 };
  for (let i = 1; i < points.length; i++) {
    const c = crossing(grid, points[i - 1], points[i]);
    sum.total += c.total;
    sum.water += c.water;
    sum.land += c.land;
    sum.unknown += c.unknown;
  }
  return sum;
}

/**
 * The nearest land to a point that is in the water, searched in rings of grid cells out to `maxMetres`, as `{ x, y, distance }` (the middle of that cell),
 * or null when there is none that close or the point is not in the water. For saying "this place's token stop is 60 m out to sea" and for nudging it ashore.
 */
export function nearestLand(grid, p, maxMetres = 400) {
  if (grid.isWater(p.x, p.y) !== true) return null;
  const rings = Math.ceil(maxMetres / grid.step);
  const c0 = Math.floor((p.x - grid.x0) / grid.step);
  const r0 = Math.floor((p.y - grid.y0) / grid.step);
  let best = null;
  for (let k = 1; k <= rings; k++) {
    for (let dc = -k; dc <= k; dc++) {
      for (let dr = -k; dr <= k; dr++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== k) continue;
        const c = c0 + dc;
        const r = r0 + dr;
        if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows || grid.water[r * grid.cols + c] === 1) continue;
        const x = grid.x0 + (c + 0.5) * grid.step;
        const y = grid.y0 + (r + 0.5) * grid.step;
        const distance = Math.hypot(x - p.x, y - p.y);
        if (!best || distance < best.distance) best = { x, y, distance };
      }
    }
    if (best && best.distance <= k * grid.step) break;
  }
  return best && best.distance <= maxMetres ? best : null;
}
