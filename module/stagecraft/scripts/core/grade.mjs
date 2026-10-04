/**
 * The light a card stands in. The paintings are lit by their own artists, and a card is a plain thing standing on them: put in
 * a dark tunnel it must be dim and cold, in a sunbeam bright and warm, or it looks pasted on. So a card takes its light from
 * the painting under its feet: how bright it is there, and what colour. Pure: it is given a coarse grid of the painting's
 * colours (a few dozen cells across) and a place on it.
 *
 *   gridFromPixels(rgba, w, h)             a small image's pixels -> the grid
 *   lightAt(grid, fx, fy, { strength })    -> [r, g, b], what to multiply the card's face by (each 0.5 to 1)
 */

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** The darkest a card goes (a card in the blackest corner is still a card you can read), and how much of the colour it takes on. */
export const GRADE = Object.freeze({ floor: 0.4, gain: 1.25, tint: 0.5, lift: 0 });

/** A grid of 0..1 colours from an image's RGBA bytes (already small: the caller shrinks it). */
export function gridFromPixels(data, w, h) {
  const cells = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    cells[i * 3] = data[i * 4] / 255;
    cells[i * 3 + 1] = data[i * 4 + 1] / 255;
    cells[i * 3 + 2] = data[i * 4 + 2] / 255;
  }
  return { w, h, cells };
}

/** The painting's colour at a point (fractions), blended between the four cells round it. */
export function colourAt(grid, fx, fy) {
  const x = clamp(fx, 0, 1) * (grid.w - 1);
  const y = clamp(fy, 0, 1) * (grid.h - 1);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(grid.w - 1, x0 + 1);
  const y1 = Math.min(grid.h - 1, y0 + 1);
  const tx = x - x0;
  const ty = y - y0;
  const out = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const at = (cx, cy) => grid.cells[(cy * grid.w + cx) * 3 + c];
    const top = at(x0, y0) * (1 - tx) + at(x1, y0) * tx;
    const bottom = at(x0, y1) * (1 - tx) + at(x1, y1) * tx;
    out[c] = top * (1 - ty) + bottom * ty;
  }
  return out;
}

/**
 * What a card standing at (fx, fy) is multiplied by: dimmer where the painting is dark, brighter where it is lit, and leaning
 * towards the colour of the light there (cold in a teal tunnel, warm under a lantern). Looked for at its feet and a little
 * above them, where its face is. `strength` 0 is no grading at all (1 is the default, a scene may ask for more or less).
 */
export function lightAt(grid, fx, fy, { strength = 1 } = {}) {
  if (!grid || !(strength > 0)) return [1, 1, 1];
  const feet = colourAt(grid, fx, fy);
  const face = colourAt(grid, fx, fy - 0.09);
  const c = [0, 1, 2].map((i) => (feet[i] + face[i]) / 2);
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  const exposure = clamp(GRADE.floor + GRADE.gain * lum + GRADE.lift, GRADE.floor, 1);
  const peak = Math.max(c[0], c[1], c[2], 1e-3);
  const lean = GRADE.tint * clamp(peak / 0.12, 0, 1);       // almost-black has no colour to lean towards
  const out = c.map((v) => exposure * (1 - lean * (1 - v / peak)));
  return out.map((v) => clamp(1 + strength * (v - 1), 0.3, 1));
}

/** Move a card's light a share of the way to where it should be, so walking across a painting never flickers. */
export function easeLight(now, target, k = 0.14) {
  if (!now) return target.slice();
  return now.map((v, i) => v + (target[i] - v) * k);
}
