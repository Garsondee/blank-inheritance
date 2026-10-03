/**
 * The flat backend's geometry, with no canvas in it so it can be tested without a browser: where a card stands on the
 * screen, which card is under a point, and how a point of the screen maps back onto the floor or the painting.
 *
 * Everything starts from the two things the stage already has: a `rig` (core/rigspace.mjs, which turns a place in the
 * world into a point of the 2560 x 1440 reference page) and a `view` (core/rigspace.mjs `viewFor`, which says how that
 * page sits in the browser's window). A world unit is one pixel of the reference page at the front of the stage.
 *
 * A 2D transform is `[a, b, c, d, e, f]`, as a canvas takes it: x' = a x + c y + e, y' = b x + d y + f.
 */

export const DEG = Math.PI / 180;

export const IDENTITY = Object.freeze([1, 0, 0, 1, 0, 0]);

/** `m` then `n` applied to a point: n(m(p)). */
export const mul = (n, m) => [
  n[0] * m[0] + n[2] * m[1], n[1] * m[0] + n[3] * m[1],
  n[0] * m[2] + n[2] * m[3], n[1] * m[2] + n[3] * m[3],
  n[0] * m[4] + n[2] * m[5] + n[4], n[1] * m[4] + n[3] * m[5] + n[5]
];
export const translate = (x, y) => [1, 0, 0, 1, x, y];
export const scale = (sx, sy = sx) => [sx, 0, 0, sy, 0, 0];
export const rotate = (a) => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
export const apply = (m, x, y) => ({ x: m[0] * x + m[2] * y + m[4], y: m[1] * x + m[3] * y + m[5] });
export function invert(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) return null;
  return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det];
}

/* ------------------------------------------------------------------ the page and the window */

/** A point of the reference page to the window (CSS pixels), and back. */
export const toWindow = (view, sx, sy) => ({ x: (sx - view.ox) * view.s, y: (sy - view.oy) * view.s });
export const toPage = (view, x, y) => ({ x: x / view.s + view.ox, y: y / view.s + view.oy });

/** Where a world point { X, Y, Z } falls in the window, with `k`, the perspective scale there. */
export function project(rig, view, { X, Y, Z }) {
  const s = rig.screenOf(X, Y, Z);
  return { ...toWindow(view, s.x, s.y), k: s.k };
}

/** The floor coordinates { x, z } of a window point, on a plane `height` above the floor; null if the ray never meets it. */
export function floorAt(rig, view, x, y, height = 0) {
  const { cam } = rig;
  const p = toPage(view, x, y);
  const below = cam.floorY - height - cam.cy;
  if (below === 0) return null;
  const k = (p.y - cam.cy) / below;
  if (!(k > 0)) return null;
  return { x: (p.x - cam.cx) / k, z: cam.f - cam.f / k };
}

/** Where on the painting (fractions) a window point falls, or null off the painting. */
export function paintingAt(rig, view, x, y) {
  const p = toPage(view, x, y);
  const [fx, fy] = rig.fractionOfScreen(p.x, p.y);
  return fx >= 0 && fx <= 1 && fy >= 0 && fy <= 1 ? { x: fx, y: fy } : null;
}

/* ------------------------------------------------------------------ a card */

/**
 * Where one card stands and how it is tilted, from its snapshot `c`. Returns the transforms from the card's own space
 * (origin at the bottom middle of the face, x right, y down, one unit a pixel of the card's picture) to the window, and
 * the facts the drawing needs. `card` is the skin's `{ w, h, stickLen }` at scale 1.
 *
 *   m       the card: the stick swings it about the grip, the collar swings it a little further, and it turns and tips
 *   stick   the stick alone, from the grip up, in world units
 *   back    true when the card has turned far enough round that its back is what is seen
 *   side    how much of the card's edge shows, from 0 (square on) to 1 (edge on)
 */
export function cardPlacement(c, rig, view, { stickLen = 134 } = {}) {
  const g = c.grip ?? 0;
  const s = c.scale ?? 1;
  const base = rig.screenOf(c.x, c.lift ?? 0, c.z);
  const at = toWindow(view, base.x, base.y);
  const m = base.k * view.s;                                   // window pixels to a world unit at this depth
  const share = 1 - 0.45 * g;
  const lean = (c.lean ?? 0) * DEG;
  const hinge = stickLen * s * g;
  const turned = (c.yaw ?? 0) * DEG;
  const yaw = Math.cos(turned);
  // tipping is a squash in the flat picture; a card that is down may squash further, to lie on the floor
  const pitch = Math.max(0.55 - 0.35 * (c.down ?? 0), Math.cos((c.pitch ?? 0) * DEG));
  const grip = mul(translate(at.x, at.y), mul(scale(m), rotate(lean * share)));
  const hung = mul(grip, mul(translate(0, -hinge), rotate(lean * (1 - share))));
  const sx = s * Math.max(0.03, Math.abs(yaw));
  const sy = s * (c.breathe ?? 1) * (c.squash ?? 1) * pitch;
  return { m: mul(hung, scale(sx, sy)), stick: grip, at, k: base.k, px: m, back: yaw < 0, side: Math.abs(Math.sin(turned)), hinge, share };
}

/** Is window point (x, y) inside the card's picture or its foot? Returns the height of that point above the floor (world units) or null. */
export function hitCard(placement, c, face, x, y) {
  const inv = invert(placement.m);
  if (!inv) return null;
  const p = apply(inv, x, y);
  const { w, h } = face;
  if (p.x < -w / 2 || p.x > w / 2 || p.y < -h || p.y > FOOT.depth) return null;
  const up = Math.max(0, -p.y) * (c.scale ?? 1) * (c.breathe ?? 1) * (c.squash ?? 1);
  return (c.lift ?? 0) + placement.hinge + up;
}

export const FOOT = Object.freeze({ width: 0.5, depth: 12 });       // the foot: half the card's width, and this far below its bottom edge

/** Front to back: what to draw first. Further from the viewer (smaller Z) is drawn first. */
export const byDepth = (a, b) => a.z - b.z;
