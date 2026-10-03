/**
 * The box of chalk, flat: where its parts fall on the screen, and which of them a click lands on. The same tray, sticks and
 * eraser as the three.js box (`BOX` in core/chalk.mjs gives both their measures), laid out with the same perspective.
 * Pure: it returns polygons and rectangles in window pixels, and the backend draws them.
 */

import { BOX, COLOURS } from "../../core/chalk.mjs";
import { DEG, project } from "./geometry.mjs";

const YAW = -10 * DEG;                               // the box is set down a little askew, as in three.js
const ERASER = Object.freeze({ at: [BOX.width / 2 - 34, 20, 4], size: [50, 32, 30], hit: { y0: 0, y1: 60, half: 29 } });

/**
 * Lay the box out. `at` is where it stands, as a point of the painting (fractions). Returns null when that is above the
 * horizon (nowhere to stand), else:
 *
 *   z        its depth, so it can be drawn among the cards
 *   floor, back, left, right, front   the tray, as polygons of window points
 *   sticks   one per colour: { colour, base, top, width, tilt, hit }, with the generous rectangle a click can land in
 *   eraser   { front, top, hit }
 */
export function boxLayout(rig, view, at) {
  const place = rig.standing(at);
  if (!place) return null;
  const c = Math.cos(YAW);
  const s = Math.sin(YAW);
  const P = (lx, ly, lz) => project(rig, view, { X: place.X + lx * c + lz * s, Y: ly, Z: place.Z - lx * s + lz * c });
  const poly = (pts) => pts.map(([x, y, z]) => { const p = P(x, y, z); return [p.x, p.y]; });
  const { width: W, depth: D, wall: H, stick, hit } = BOX;
  const top = 4 + H;

  const sticks = COLOURS.map((colour, i) => {
    const x = stick.first + i * stick.spacing;
    const z = ((i % 2) - 0.5) * 6;
    const tilt = (i % 3 - 1) * 0.07;
    const base = P(x, -2, z);
    const tip = P(x - Math.sin(tilt) * stick.height, -2 + Math.cos(tilt) * stick.height, z);
    const low = P(x, 4 + hit.height / 2 - 14 - hit.height / 2, 0);
    const high = P(x, 4 + hit.height / 2 - 14 + hit.height / 2, 0);
    const half = hit.radius * low.k * view.s;
    return {
      colour,
      base: { x: base.x, y: base.y }, top: { x: tip.x, y: tip.y },
      width: 2 * stick.radius * base.k * view.s,
      hit: { x0: low.x - half, x1: low.x + half, y0: high.y, y1: low.y }
    };
  });

  const [ex, ey, ez] = ERASER.at;
  const [ew, eh, ed] = ERASER.size;
  const eLow = P(ex, ERASER.hit.y0, ez);
  const eHigh = P(ex, ERASER.hit.y1, ez);
  const eHalf = ERASER.hit.half * eLow.k * view.s;

  return {
    z: place.Z,
    floor: poly([[-W / 2, 4, -D / 2], [W / 2, 4, -D / 2], [W / 2, 4, D / 2], [-W / 2, 4, D / 2]]),
    back: poly([[-W / 2, 4, -D / 2], [W / 2, 4, -D / 2], [W / 2, top, -D / 2], [-W / 2, top, -D / 2]]),
    left: poly([[-W / 2, 4, -D / 2], [-W / 2, 4, D / 2], [-W / 2, top, D / 2], [-W / 2, top, -D / 2]]),
    right: poly([[W / 2, 4, -D / 2], [W / 2, 4, D / 2], [W / 2, top, D / 2], [W / 2, top, -D / 2]]),
    front: poly([[-W / 2, 4, D / 2], [W / 2, 4, D / 2], [W / 2, top, D / 2], [-W / 2, top, D / 2]]),
    sticks,
    eraser: {
      front: poly([[ex - ew / 2, ey - eh / 2, ez + ed / 2], [ex + ew / 2, ey - eh / 2, ez + ed / 2], [ex + ew / 2, ey + eh / 2, ez + ed / 2], [ex - ew / 2, ey + eh / 2, ez + ed / 2]]),
      top: poly([[ex - ew / 2, ey + eh / 2, ez - ed / 2], [ex + ew / 2, ey + eh / 2, ez - ed / 2], [ex + ew / 2, ey + eh / 2, ez + ed / 2], [ex - ew / 2, ey + eh / 2, ez + ed / 2]]),
      hit: { x0: eLow.x - eHalf, x1: eLow.x + eHalf, y0: eHigh.y, y1: eLow.y }
    }
  };
}

const inside = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;

/** What a click at a window point lands on: { kind: "chalk", colour }, { kind: "eraser" }, or null. */
export function hitBox(layout, x, y) {
  if (!layout) return null;
  if (inside(layout.eraser.hit, x, y)) return { kind: "eraser" };
  for (const st of layout.sticks) if (inside(st.hit, x, y)) return { kind: "chalk", colour: st.colour };
  return null;
}
