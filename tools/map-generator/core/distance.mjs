/**
 * Exact Euclidean distance transform (Felzenszwalb & Huttenlocher 2012).
 *
 * Replaces the chamfer approximation this generator started with. A chamfer
 * transform propagates distance in 8 fixed directions, so its level sets are
 * subtly octagonal, and it leaves ridges where two propagation fronts meet —
 * measurably so: 16.5% of sea cells had a strong Laplacian in the chamfer
 * field. That is invisible in the distance values themselves and glaringly
 * visible the moment anything CONTOURS them, which the shelf-break bathymetry
 * does: the deep water grew straight-edged polygonal terraces.
 *
 * It matters beyond that one artefact, because distance-to-water is a field the
 * city stage leans on directly for waterfront zoning and harbour siting. An
 * approximation with directional bias would put that bias into the street
 * layout, where it would be much harder to recognise as a bug.
 *
 * O(n) in the number of cells, exact, and separable: a 1D transform down every
 * column, then a 1D transform across every row.
 */

const INF = 1e20;

/**
 * Lower envelope of parabolas — the 1D squared distance transform.
 *
 * `f` holds the seed costs (0 at a seed, INF elsewhere) and is overwritten with
 * squared distances. The scratch arrays are passed in so the 2D driver can
 * allocate once instead of per row.
 */
function transform1D(f, n, d, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;

  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dq = q - v[k];
    d[q] = dq * dq + f[v[k]];
  }
  for (let q = 0; q < n; q++) f[q] = d[q];
}

/**
 * Distance in cells from every cell to the nearest seed.
 *
 * @param {Uint8Array} seeds  Non-zero marks a seed cell (distance 0).
 * @param {number} width
 * @param {number} height
 * @returns {Float64Array} Euclidean distance per cell; INF-ish if no seeds.
 */
export function euclideanDistanceTransform(seeds, width, height) {
  const n = width * height;
  const grid = new Float64Array(n);
  for (let i = 0; i < n; i++) grid[i] = seeds[i] ? 0 : INF;

  const maxDim = Math.max(width, height);
  const f = new Float64Array(maxDim);
  const d = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const z = new Float64Array(maxDim + 1);

  // Columns.
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) f[y] = grid[y * width + x];
    transform1D(f, height, d, v, z);
    for (let y = 0; y < height; y++) grid[y * width + x] = f[y];
  }

  // Rows.
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) f[x] = grid[row + x];
    transform1D(f, width, d, v, z);
    for (let x = 0; x < width; x++) grid[row + x] = Math.sqrt(f[x]);
  }

  return grid;
}
