/**
 * A 2D scalar field on a regular grid — the substrate every terrain stage
 * reads and writes.
 *
 * Flat Float64Array with an explicit width, not an array-of-arrays: the
 * erosion loop touches every cell several times per iteration for hundreds of
 * iterations, and the difference between one contiguous buffer and 256 separate
 * row objects is not academic at that call count.
 *
 * Index convention throughout the whole generator: `i = y * width + x`, x
 * increasing to the right (seaward -> inland in our uplift setup), y increasing
 * downward, matching both image row order and SVG's coordinate system so no
 * layer has to flip anything.
 */

export class Field {
  constructor(width, height, fill = 0) {
    this.width = width;
    this.height = height;
    this.data = new Float64Array(width * height);
    if (fill !== 0) this.data.fill(fill);
  }

  static from(width, height, fn) {
    const f = new Field(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) f.data[y * width + x] = fn(x, y);
    }
    return f;
  }

  get length() {
    return this.data.length;
  }

  idx(x, y) {
    return y * this.width + x;
  }

  xOf(i) {
    return i % this.width;
  }

  yOf(i) {
    return (i / this.width) | 0;
  }

  get(x, y) {
    return this.data[y * this.width + x];
  }

  set(x, y, v) {
    this.data[y * this.width + x] = v;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  clone() {
    const f = new Field(this.width, this.height);
    f.data.set(this.data);
    return f;
  }

  min() {
    let m = Infinity;
    for (let i = 0; i < this.data.length; i++) if (this.data[i] < m) m = this.data[i];
    return m;
  }

  max() {
    let m = -Infinity;
    for (let i = 0; i < this.data.length; i++) if (this.data[i] > m) m = this.data[i];
    return m;
  }

  /**
   * Value at the given quantile of the whole field (0 = min, 1 = max).
   *
   * This is how sea level gets chosen: not as an absolute elevation (which
   * would depend on however the erosion parameters happened to scale), but as
   * "drown the lowest 45% of the landscape", which is stable across parameter
   * changes and is the knob an art director actually wants.
   */
  quantile(q) {
    const sorted = Float64Array.from(this.data).sort();
    const pos = Math.min(sorted.length - 1, Math.max(0, q * (sorted.length - 1)));
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  /** Bilinear sample at fractional coordinates, clamped at the edges. */
  sample(x, y) {
    const w = this.width;
    const h = this.height;
    const x0 = Math.max(0, Math.min(w - 1, Math.floor(x)));
    const y0 = Math.max(0, Math.min(h - 1, Math.floor(y)));
    const x1 = Math.min(w - 1, x0 + 1);
    const y1 = Math.min(h - 1, y0 + 1);
    const fx = Math.max(0, Math.min(1, x - x0));
    const fy = Math.max(0, Math.min(1, y - y0));
    const a = this.data[y0 * w + x0];
    const b = this.data[y0 * w + x1];
    const c = this.data[y1 * w + x0];
    const d = this.data[y1 * w + x1];
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
  }
}

/** The 8 neighbour offsets (D8), ordered N, NE, E, SE, S, SW, W, NW. */
export const D8 = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

/** Distance multiplier per D8 direction: 1 orthogonal, sqrt(2) diagonal. */
export const D8_DIST = D8.map(([dx, dy]) => Math.hypot(dx, dy));
