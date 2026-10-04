/**
 * One dab of paint put onto a canvas (chalk.md §5). The wall's tiles (render/paint/wall.mjs) and the wet ink laid over the
 * stage while a stroke is painted (render/paint/wet.mjs) both put a stroke down this way, so the two look the same: the same
 * tips, the same angle and jitter, the same specks for the spray. `m` places the dab: a wall pixel (x, y) lands at
 * (x * k + ox, y * k + oy) on this canvas, and a dab's size is scaled by `k`.
 */

import { rng, rainbowAt } from "../../core/brush.mjs";
import { dim as dimHex } from "../../core/wet.mjs";

export const VARIANTS = 4;         // chalk tips come in a few shapes, so no two dabs bite alike
export const RAINBOW_STEP = 15;    // magic chalk's rainbow moves on a step of hue every this many pixels (60 to a turn)

/** The colour a dab of a stroke is laid down in. */
export function colourOf(s, dab) {
  if (s.def.kind === "erase") return "#ffffff";
  // the rainbow's colour changes every RAINBOW_STEP pixels, so its tips can be kept rather than made afresh at every dab
  return s.magic?.rainbow ? rainbowAt(s.colour, Math.round(dab.dist / RAINBOW_STEP) * RAINBOW_STEP) : s.colour;
}

/**
 * Stamp `dab` of stroke `s` ({ def, colour, magic }) onto `ctx`. `tips` is the wall's Tips. `clip` ({ w, h }, optional) is
 * the canvas's size, so a spray's specks that fall off it are not drawn. `dim` (optional) multiplies the colour's brightness.
 * Returns the part of the canvas that was touched, { x0, y0, x1, y1 }, a little generous.
 */
export function stampDab(ctx, tips, s, dab, m, { clip = null, dim = null } = {}) {
  const k = m.k;
  const r = (dab.size * k) / 2;
  const cx = dab.x * k + m.ox;
  const cy = dab.y * k + m.oy;
  let colour = colourOf(s, dab);
  if (dim !== null && dim !== 1) colour = dimHex(colour, dim);
  if (s.def.kind === "spray") {
    const rand = rng(dab.seed);
    const n = Math.max(1, Math.round((s.def.particles ?? 30) * dab.flow));
    const tip = tips.coloured("speck", 0, colour);
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2;
      const d = r * Math.pow(rand(), 0.75);
      const px = cx + Math.cos(a) * d;
      const py = cy + Math.sin(a) * d;
      const size = (1.2 + rand() * 2.4) * k;
      const alpha = 0.3 + rand() * 0.6;
      if (clip && (px < -4 || py < -4 || px > clip.w + 4 || py > clip.h + 4)) continue;
      ctx.globalAlpha = alpha;
      ctx.drawImage(tip, px - size / 2, py - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    return { x0: cx - r - 4, y0: cy - r - 4, x1: cx + r + 4, y1: cy + r + 4 };
  }
  const tipName = s.def.tip ?? "round";
  const variant = tipName === "chalk" ? dab.seed % VARIANTS : 0;
  const tip = tips.coloured(tipName, variant, colour);
  const cos = dab.angle ? Math.cos(dab.angle) : 1;
  const sin = dab.angle ? Math.sin(dab.angle) : 0;
  ctx.setTransform(cos, sin, -sin, cos, cx, cy);
  ctx.globalAlpha = dab.flow;
  ctx.drawImage(tip, -r, -r, r * 2, r * 2);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  return { x0: cx - r - 2, y0: cy - r - 2, x1: cx + r + 2, y1: cy + r + 2 };
}
