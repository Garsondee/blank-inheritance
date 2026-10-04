/**
 * Wet ink (chalk.md §11.4). Pure.
 *
 * A stroke being painted is shown on a plain 2D canvas laid over the stage, at the rate the pointer moves, instead of waiting
 * for the lit 3D picture to be drawn again (7 to 10 ms of graphics card, at 60 a second, with the display waiting behind it:
 * the paint trailed the ring round the pointer by several frames). This file holds the arithmetic: where a point of the wall
 * is on the window, and the dabs of the short tail that reaches from the last laid dab to the pointer.
 */

/**
 * The affine map from wall pixels to window pixels: `x = k * wx + bx`, `y = k * wy + by`. The wall is laid over the painting
 * (`size`, in painting pixels), the painting over the stage by `map` (the cover map: `ox`, `oy` and a scale `s`), and the
 * window shows the stage through `view` (`ox`, `oy`, `s`). The painting is a flat backdrop square to the camera, so the whole
 * thing is a scale and an offset.
 */
export function wallToWindow({ size, map, view }, grid) {
  const [iw, ih] = size;
  const kx = (iw * map.s * view.s) / grid.w;
  const ky = (ih * map.s * view.s) / grid.h;
  return { k: (kx + ky) / 2, kx, ky, bx: (map.ox - view.ox) * view.s, by: (map.oy - view.oy) * view.s };
}

/** The same map with the canvas's pixel density laid in: wall pixels to canvas pixels. */
export function toCanvas(m, ratio) {
  return { k: m.k * ratio, bx: m.bx * ratio, by: m.by * ratio };
}

/** Multiply a "#rrggbb" colour's brightness by `f` (0..1): the 3D wall is shown a little under full white. */
export function dim(hex, f) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = c((n >> 16) & 255);
  const g = c((n >> 8) & 255);
  const b = c(n & 255);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The dabs of the tail between the last dab laid and the pointer: the curve runs a segment behind the hand (a smooth curve
 * needs to know where it is going) and the steadying string holds the brush back, so for a moment the newest paint is
 * short of the pointer. The tail is drawn for that moment and thrown away at the next sample. `gap` is the distance between
 * dabs, wall pixels; `from` the last dab ({ x, y, size, flow, angle, seed }); `to` the pointer ({ x, y }). At most `most`
 * dabs, so a jump of the hand never costs a frame.
 */
export function tailDabs(from, to, gap, most = 60) {
  if (!from || !to) return [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.75) return [];
  const step = Math.max(0.4, gap, d / most);
  const n = Math.floor(d / step);
  const angle = Math.atan2(dy, dx);
  const out = [];
  for (let i = 1; i <= n; i++) {
    const u = (i * step) / d;
    out.push({ x: from.x + dx * u, y: from.y + dy * u, size: from.size, flow: from.flow, angle: from.angle ? from.angle : angle, seed: (from.seed + i * 40503) >>> 0, dist: (from.dist ?? 0) + i * step });
  }
  out.push({ x: to.x, y: to.y, size: from.size, flow: from.flow, angle: from.angle ? from.angle : angle, seed: (from.seed + 99991) >>> 0, dist: (from.dist ?? 0) + d });
  return out;
}

/** The part of a w x h canvas that dabs cover (canvas pixels, whole numbers, grown by `pad`), or null if none of it is on the canvas. */
export function dabArea(dabs, m, w, h, pad = 3) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const d of dabs) {
    const r = (d.size * m.k) / 2 + pad;
    const cx = d.x * m.k + m.bx;
    const cy = d.y * m.k + m.by;
    x0 = Math.min(x0, cx - r); y0 = Math.min(y0, cy - r);
    x1 = Math.max(x1, cx + r); y1 = Math.max(y1, cy + r);
  }
  if (!Number.isFinite(x0)) return null;
  const rect = { x: Math.max(0, Math.floor(x0)), y: Math.max(0, Math.floor(y0)) };
  rect.w = Math.min(w, Math.ceil(x1)) - rect.x;
  rect.h = Math.min(h, Math.ceil(y1)) - rect.y;
  return rect.w > 0 && rect.h > 0 ? rect : null;
}

/** The smallest rectangle holding both (either may be null). */
export function joinAreas(a, b) {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}
