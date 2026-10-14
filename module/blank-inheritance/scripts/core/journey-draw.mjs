/**
 * The geometry the Location Editor's journey overlay draws with (design/location-editor.md section 16): dashes, direction arrows, a point a given distance along a
 * line, the box round some points, and how each way of moving is coloured. Pure and in whatever units it is handed (the overlay gives it scene pixels already
 * scaled to screen size), so every rule about what is drawn can be tested without a canvas.
 */

/** Colour and weight per way of moving, as PIXI wants them (0xRRGGBB, screen pixels). Walking is dotted, riding is solid, a train is the heaviest line. */
export const MODE_STYLE = Object.freeze({
  walk: { color: 0xf4efe0, weight: 3, dash: [6, 7], label: "walk" },
  bike: { color: 0x7be07b, weight: 3.5, dash: null, label: "bike" },
  car: { color: 0xffb347, weight: 4, dash: null, label: "car" },
  motorbike: { color: 0xff8a3d, weight: 4, dash: null, label: "motorbike" },
  train: { color: 0x59d8ff, weight: 5, dash: null, label: "train" }
});
export const FALLBACK_STYLE = MODE_STYLE.walk;
export const PROBLEM_COLORS = Object.freeze({ error: 0xff4d5e, warn: 0xffc94a, info: 0x9fb4c8 });

export const styleForMode = (mode) => MODE_STYLE[mode] ?? FALLBACK_STYLE;

const dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

/** Total length of a polyline of `{ x, y }`. */
export function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i]);
  return total;
}

/** The point `d` along the polyline (clamped to its ends) and the heading there, in radians; null for fewer than two points. */
export function pointAtDistance(points, d) {
  if (!points || points.length < 2) return null;
  let left = Math.max(0, d);
  for (let i = 1; i < points.length; i++) {
    const length = dist(points[i - 1], points[i]);
    if (left <= length || i === points.length - 1) {
      const t = length > 0 ? Math.min(1, left / length) : 0;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
        angle: Math.atan2(points[i].y - points[i - 1].y, points[i].x - points[i - 1].x)
      };
    }
    left -= length;
  }
  return null;
}

/**
 * The polyline cut into dashes: `[[a, b], ...]` pairs of points, each `dash` long with `gap` between, carried across the corners so the pattern does not restart
 * at every vertex. `phase` shifts where in the pattern the line begins (to make dashes crawl). A degenerate pattern (no dash, no gap) returns the line whole.
 */
export function dashPolyline(points, dash, gap, phase = 0) {
  if (!points || points.length < 2) return [];
  if (!(dash > 0) || !(gap >= 0)) return points.slice(1).map((p, i) => [points[i], p]);
  const period = dash + gap;
  const out = [];
  let into = ((phase % period) + period) % period;          // how far into the dash+gap cycle the line starts
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = dist(a, b);
    if (length === 0) continue;
    const ux = (b.x - a.x) / length;
    const uy = (b.y - a.y) / length;
    let at = 0;
    while (at < length) {
      const inDash = into < dash;
      const room = inDash ? dash - into : period - into;
      const step = Math.min(room, length - at);
      if (inDash && step > 0) out.push([{ x: a.x + ux * at, y: a.y + uy * at }, { x: a.x + ux * (at + step), y: a.y + uy * (at + step) }]);
      at += step;
      into = (into + step) % period;
    }
  }
  return out;
}

/** Direction chevrons along a polyline: one every `spacing`, the first at `first`, each `{ x, y, angle }`. None for a line shorter than its first arrow. */
export function arrowsAlong(points, spacing, first = spacing / 2) {
  if (!points || points.length < 2 || !(spacing > 0)) return [];
  const total = polylineLength(points);
  const out = [];
  for (let d = first; d < total; d += spacing) out.push(pointAtDistance(points, d));
  return out.filter(Boolean);
}

/** The box round some points, `{ x0, y0, x1, y1 }`, or null for none. */
export function boundsOf(points) {
  let box = null;
  for (const p of points ?? []) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    box = box ? { x0: Math.min(box.x0, p.x), y0: Math.min(box.y0, p.y), x1: Math.max(box.x1, p.x), y1: Math.max(box.y1, p.y) } : { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  }
  return box;
}

/** Two boxes joined, either may be null. */
export const unionBox = (a, b) => (!a ? b : !b ? a : { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) });

/** The part of a polyline up to `d` along it, ending exactly at `d`: for drawing how far the token has come. */
export function polylineUpTo(points, d) {
  if (!points || points.length === 0) return [];
  if (!(d > 0)) return [points[0]];
  const out = [points[0]];
  let left = d;
  for (let i = 1; i < points.length; i++) {
    const length = dist(points[i - 1], points[i]);
    if (left >= length) {
      out.push(points[i]);
      left -= length;
      if (left <= 0) return out;                           // exactly at a vertex: no repeated point
      continue;
    }
    const t = length > 0 ? left / length : 0;
    out.push({ x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, y: points[i - 1].y + (points[i].y - points[i - 1].y) * t });
    return out;
  }
  return out;
}
