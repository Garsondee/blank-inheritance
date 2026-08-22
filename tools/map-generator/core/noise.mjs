/**
 * Seeded value-noise fBm.
 *
 * Deliberately modest: noise is NOT how this generator makes terrain look real
 * (erosion is — see terrain/erode.mjs). Noise here only ever perturbs an
 * initial surface or varies an uplift field, and the erosion sim then
 * reorganises all of it into drainage structure. Spending effort on gradient
 * noise over value noise would buy nothing that survives the first hundred
 * timesteps.
 */

/** Integer hash -> [0, 1). */
function hash2(seed, x, y) {
  let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10); // quintic, C2

/** Single-octave value noise at fractional (x, y). */
export function valueNoise2D(seed, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const a = hash2(seed, xi, yi);
  const b = hash2(seed, xi + 1, yi);
  const c = hash2(seed, xi, yi + 1);
  const d = hash2(seed, xi + 1, yi + 1);
  const u = smooth(xf);
  const v = smooth(yf);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/** Fractal Brownian motion: octaves of value noise. Returns roughly [0, 1]. */
export function fbm(seed, x, y, { octaves = 5, lacunarity = 2, gain = 0.5, frequency = 1 } = {}) {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = frequency;
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise2D(seed + o * 1013, x * freq, y * freq);
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Smoothstep between two edges. */
export function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
