/**
 * Marching squares: scalar field -> stitched polylines at a given level.
 *
 * One implementation serves every line on the finished map — the coastline is
 * just the contour at sea level, topographic contours are contours at regular
 * intervals above it, and the gameplay depth bands are contours below it. That
 * is the payoff for extracting the coastline as a contour rather than as a
 * special case: the shoreline and the 20 m line are produced by the same code
 * and therefore agree with each other exactly.
 *
 * Output coordinates are in grid units (cell corners), sub-cell accurate via
 * linear interpolation along each crossed edge, so contours are smooth curves
 * rather than staircases.
 */

// Which cell edges each marching-squares case connects. Edge ids:
// 0 = top, 1 = right, 2 = bottom, 3 = left.
const CASES = [
  [], // 0000
  [[3, 2]], // 0001
  [[2, 1]], // 0010
  [[3, 1]], // 0011
  [[0, 1]], // 0100
  null, // 0101 saddle
  [[0, 2]], // 0110
  [[0, 3]], // 0111
  [[0, 3]], // 1000
  [[0, 2]], // 1001
  null, // 1010 saddle
  [[0, 1]], // 1011
  [[3, 1]], // 1100
  [[2, 1]], // 1101
  [[3, 2]], // 1110
  [], // 1111
];

/**
 * Extract contour polylines at `level`.
 *
 * @param {Field} field
 * @param {number} level
 * @param {object} [opts]
 * @param {number} [opts.minLength] Drop polylines shorter than this many points.
 * @returns {Array<Array<[number, number]>>} Polylines; closed rings repeat their first point.
 */
export function marchingSquares(field, level, { minLength = 2 } = {}) {
  const { width, height } = field;
  const f = field.data;
  const segments = [];

  const at = (x, y) => f[y * width + x];

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const tl = at(x, y);
      const tr = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const bl = at(x, y + 1);

      const idx = (tl > level ? 8 : 0) | (tr > level ? 4 : 0) | (br > level ? 2 : 0) | (bl > level ? 1 : 0);
      if (idx === 0 || idx === 15) continue;

      // Interpolated crossing point on each edge.
      const pt = (edge) => {
        switch (edge) {
          case 0: {
            const t = (level - tl) / (tr - tl);
            return [x + t, y];
          }
          case 1: {
            const t = (level - tr) / (br - tr);
            return [x + 1, y + t];
          }
          case 2: {
            const t = (level - bl) / (br - bl);
            return [x + t, y + 1];
          }
          default: {
            const t = (level - tl) / (bl - tl);
            return [x, y + t];
          }
        }
      };

      let pairs = CASES[idx];
      if (pairs === null) {
        // Saddle: two possible connections. Resolve with the cell-centre
        // average, which is the standard disambiguation and keeps contours
        // consistent between adjacent cells.
        const centre = (tl + tr + br + bl) / 4;
        const centreAbove = centre > level;
        if (idx === 5) pairs = centreAbove ? [[0, 1], [2, 3]] : [[0, 3], [2, 1]];
        else pairs = centreAbove ? [[0, 3], [2, 1]] : [[0, 1], [2, 3]];
      }

      for (const [a, b] of pairs) {
        const p0 = pt(a);
        const p1 = pt(b);
        // Drop zero-length segments. When the level passes exactly through a
        // grid corner, two edges of the cell yield the identical point, and the
        // degenerate segment carries no information — but it does survive
        // stitching as a spurious two-point "ring". (Found 2026-08-23 on a test
        // cone, where the contour at radius 20 passes exactly through the
        // 3-4-5 triangle corners and produced four phantom rings.)
        if (Math.abs(p0[0] - p1[0]) < 1e-12 && Math.abs(p0[1] - p1[1]) < 1e-12) continue;
        segments.push([p0, p1]);
      }
    }
  }

  return stitch(segments, minLength);
}

/**
 * Join loose segments into polylines by matching shared endpoints.
 *
 * Endpoints are quantised to a fixed precision before matching: adjacent cells
 * compute the same crossing point through different arithmetic, so the values
 * agree to within float error but not bit-for-bit.
 */
function stitch(segments, minLength) {
  const PREC = 1e6;
  const key = ([x, y]) => `${Math.round(x * PREC)},${Math.round(y * PREC)}`;

  const ends = new Map(); // key -> array of {seg, end}
  const used = new Uint8Array(segments.length);
  segments.forEach((seg, si) => {
    for (let e = 0; e < 2; e++) {
      const k = key(seg[e]);
      if (!ends.has(k)) ends.set(k, []);
      ends.get(k).push({ si, e });
    }
  });

  const takeNeighbour = (k, fromSi) => {
    const list = ends.get(k);
    if (!list) return null;
    for (const cand of list) {
      if (cand.si !== fromSi && !used[cand.si]) return cand;
    }
    return null;
  };

  const polylines = [];
  for (let si = 0; si < segments.length; si++) {
    if (used[si]) continue;
    used[si] = 1;
    const line = [segments[si][0], segments[si][1]];

    // Extend forward from the tail.
    for (;;) {
      const next = takeNeighbour(key(line[line.length - 1]), -1);
      if (!next) break;
      used[next.si] = 1;
      line.push(segments[next.si][1 - next.e]);
    }
    // Extend backward from the head.
    for (;;) {
      const prev = takeNeighbour(key(line[0]), -1);
      if (!prev) break;
      used[prev.si] = 1;
      line.unshift(segments[prev.si][1 - prev.e]);
    }

    if (line.length >= minLength) polylines.push(line);
  }

  return polylines;
}

/**
 * Douglas-Peucker simplification.
 *
 * A 512-wide contour can carry tens of thousands of points, most of which are
 * collinear at any zoom a human will look at. Simplifying keeps the SVG a
 * sensible size without any visible change to the line.
 */
export function simplify(points, tolerance = 0.35) {
  if (points.length < 3) return points;

  const sqTol = tolerance * tolerance;
  const sqSegDist = (p, a, b) => {
    let [x, y] = a;
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b[0];
        y = b[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > sqTol && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/** Total length of a polyline, in grid units. */
export function polylineLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
}

/** Signed area of a closed ring (positive = counter-clockwise in screen space). */
export function ringArea(points) {
  let a = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    a += (points[j][0] + points[i][0]) * (points[j][1] - points[i][1]);
  }
  return a / 2;
}
