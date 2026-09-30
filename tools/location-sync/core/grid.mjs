/**
 * The campaign map's reference grid -- pure integer arithmetic, no I/O.
 *
 * This is the browser-side twin of tools/gazetteer/core/grid.py. The two are
 * held to each other by test/fixtures/gazetteer-grid-cases.json, which both
 * test suites assert against: if either drifts, both suites go red rather than
 * one of them quietly disagreeing about which cell a building is in.
 *
 * Why two implementations at all: the browser draws in image pixels and needs
 * a live grid readout under the cursor on every mousemove, which must not be a
 * round trip to the server; the server needs the same arithmetic to derive
 * stored fields. The alternative -- one implementation plus an RPC -- trades a
 * tested duplication for an untested latency.
 *
 * See grid.py's module docstring for the scheme itself (MAJOR / SUB / REF).
 * Cell indices are 0-based from the content area's top-left, y down.
 *
 * Pure module: no DOM, no globals, no imports. Enforced by
 * test/gazetteer-tier0-architecture.test.mjs.
 */

export const BORDER_PX = 200;
export const CELL_PX = 200;
export const CELLS_PER_MAJOR = 10;
export const GRID_COLS = 60;
export const GRID_ROWS = 60;

export const MAJOR_COLS = GRID_COLS / CELLS_PER_MAJOR;
export const MAJOR_ROWS = GRID_ROWS / CELLS_PER_MAJOR;

export const MAJOR_COL_LETTERS = "ABCDEF";
export const SEPARATOR = "·"; // MIDDLE DOT

export class GridError extends Error {}

const defaults = { border: BORDER_PX, cell: CELL_PX, cols: GRID_COLS, rows: GRID_ROWS };

// --- image pixels <-> cell ---------------------------------------------------

/**
 * Image pixel -> {col, row}, 0-based from the content area's top-left.
 * Throws outside the content area rather than clamping -- see grid.py.
 */
export function imagePxToCell(x, y, opts = {}) {
  const { border, cell, cols, rows } = { ...defaults, ...opts };
  const cx = x - border;
  const cy = y - border;
  if (cx < 0 || cy < 0 || cx >= cols * cell || cy >= rows * cell) {
    throw new GridError(
      `image pixel (${x}, ${y}) is outside the ${cols * cell}x${rows * cell} ` +
      `content area (margin is ${border} px)`);
  }
  return { col: Math.floor(cx / cell), row: Math.floor(cy / cell) };
}

/** {col,row} -> the image pixel of that cell's TOP-LEFT corner. */
export function cellToImagePx(col, row, opts = {}) {
  const { border, cell, cols, rows } = { ...defaults, ...opts };
  checkCell(col, row, cols, rows);
  return { x: border + col * cell, y: border + row * cell };
}

/** {col,row} -> the image pixel at that cell's centre. */
export function cellCentrePx(col, row, opts = {}) {
  const { cell } = { ...defaults, ...opts };
  const { x, y } = cellToImagePx(col, row, opts);
  return { x: x + cell / 2, y: y + cell / 2 };
}

/** {col,row} -> [x0, y0, x1, y1] in image pixels, half-open on x1/y1. */
export function cellBoundsPx(col, row, opts = {}) {
  const { cell } = { ...defaults, ...opts };
  const { x, y } = cellToImagePx(col, row, opts);
  return [x, y, x + cell, y + cell];
}

// --- cell <-> reference string ----------------------------------------------

/** {col,row} -> a reference string such as C4·73. */
export function cellToRef(col, row, opts = {}) {
  const { cols, rows } = { ...defaults, ...opts };
  const separator = opts.separator ?? SEPARATOR;
  checkCell(col, row, cols, rows);
  const majorCol = Math.floor(col / CELLS_PER_MAJOR);
  const subCol = col % CELLS_PER_MAJOR;
  const majorRow = Math.floor(row / CELLS_PER_MAJOR);
  const subRow = row % CELLS_PER_MAJOR;
  return `${MAJOR_COL_LETTERS[majorCol]}${majorRow + 1}${separator}${subCol}${subRow}`;
}

/**
 * A reference string -> {col, row}. Accepts "." or "-" as the separator too,
 * because those are what actually get typed into a chat message.
 */
export function refToCell(ref, opts = {}) {
  const { cols, rows } = { ...defaults, ...opts };
  let cleaned = String(ref).trim().toUpperCase();
  for (const ch of [SEPARATOR, ".", "-", " "]) cleaned = cleaned.split(ch).join("");
  if (cleaned.length !== 4) {
    throw new GridError(`${ref} is not a grid reference (expected e.g. C4${SEPARATOR}73)`);
  }
  const [letter, majorRowCh, subColCh, subRowCh] = cleaned;
  if (!MAJOR_COL_LETTERS.includes(letter)) {
    throw new GridError(`${ref}: major column must be one of ${MAJOR_COL_LETTERS}`);
  }
  if (!isDigit(majorRowCh) || !isDigit(subColCh) || !isDigit(subRowCh)) {
    throw new GridError(`${ref}: major row and both sub digits must be numeric`);
  }
  const majorRow = Number(majorRowCh) - 1;
  if (!(majorRow >= 0 && majorRow < MAJOR_ROWS)) {
    throw new GridError(`${ref}: major row must be 1-${MAJOR_ROWS}`);
  }
  const col = MAJOR_COL_LETTERS.indexOf(letter) * CELLS_PER_MAJOR + Number(subColCh);
  const row = majorRow * CELLS_PER_MAJOR + Number(subRowCh);
  checkCell(col, row, cols, rows);
  return { col, row };
}

/** Convenience: image pixel straight to a reference string. */
export function imagePxToRef(x, y, opts = {}) {
  const { col, row } = imagePxToCell(x, y, opts);
  return cellToRef(col, row, opts);
}

/** 0-based major indices -> the label for that 2 km square, e.g. C4. */
export function majorLabel(majorCol, majorRow) {
  if (!(majorCol >= 0 && majorCol < MAJOR_COLS && majorRow >= 0 && majorRow < MAJOR_ROWS)) {
    throw new GridError(`major (${majorCol}, ${majorRow}) outside ${MAJOR_COLS}x${MAJOR_ROWS}`);
  }
  return `${MAJOR_COL_LETTERS[majorCol]}${majorRow + 1}`;
}

// --- polygons ----------------------------------------------------------------

/**
 * Overlap smaller than this many square pixels counts as no overlap -- guards
 * against float slivers along a shared boundary. A real overlap on this map is
 * thousands of square metres, so the threshold is never a judgement call.
 */
export const MIN_OVERLAP_PX2 = 1e-6;

/**
 * Every cell a polygon overlaps, as [{col, row, areaPx}] in row-major order.
 *
 * "Touches" means shared POSITIVE AREA -- not a vertex landing in the cell,
 * and not the centroid's cell. Measured by clipping the polygon to each
 * candidate cell (Sutherland-Hodgman against the cell rectangle, exact because
 * a rectangle is convex) and taking the shoelace area of the result. Corner
 * containment plus edge crossings is subtly wrong at a shared boundary: a
 * building whose wall sits exactly on a grid line would claim the cell on the
 * far side, which it does not occupy. See grid.py for the full reasoning.
 *
 * @param {Array<[number,number]>} ring image-pixel points
 */
export function cellCoverage(ring, opts = {}) {
  const { border, cell, cols, rows } = { ...defaults, ...opts };
  const pts = ringPoints(ring);
  if (pts.length < 3) throw new GridError("a polygon ring needs at least 3 distinct points");

  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const [c0, r0] = clampedCell(Math.min(...xs), Math.min(...ys), border, cell, cols, rows);
  const [c1, r1] = clampedCell(Math.max(...xs), Math.max(...ys), border, cell, cols, rows);

  const out = [];
  for (let row = r0; row <= r1; row += 1) {
    for (let col = c0; col <= c1; col += 1) {
      const [x0, y0, x1, y1] = cellBoundsPx(col, row, opts);
      const areaPx = clippedArea(pts, x0, y0, x1, y1);
      if (areaPx > MIN_OVERLAP_PX2) out.push({ col, row, areaPx });
    }
  }
  return out;
}

/** cellCoverage without the areas: [{col, row}] in row-major order. */
export function cellsTouched(ring, opts = {}) {
  return cellCoverage(ring, opts).map(({ col, row }) => ({ col, row }));
}

/** cellsTouched, spelled as reference strings. */
export function refsTouched(ring, opts = {}) {
  return cellsTouched(ring, opts).map(({ col, row }) => cellToRef(col, row, opts));
}

/** Shoelace area in square pixels, always positive. 1 px is 1 m on this map. */
export function polygonAreaPx(ring) {
  const pts = ringPoints(ring);
  if (pts.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    total += x0 * y1 - x1 * y0;
  }
  return Math.abs(total) / 2;
}

/** Area centroid, not the vertex mean. Degenerate rings fall back to the mean. */
export function polygonCentroidPx(ring) {
  const pts = ringPoints(ring);
  if (pts.length === 0) throw new GridError("empty ring has no centroid");
  const mean = () => ({
    x: pts.reduce((s, p) => s + p[0], 0) / pts.length,
    y: pts.reduce((s, p) => s + p[1], 0) / pts.length,
  });
  if (pts.length < 3) return mean();
  let crossSum = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % pts.length];
    const cross = x0 * y1 - x1 * y0;
    crossSum += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (crossSum === 0) return mean();
  return { x: cx / (3 * crossSum), y: cy / (3 * crossSum) };
}

// --- internals ---------------------------------------------------------------

function isDigit(ch) {
  return ch >= "0" && ch <= "9";
}

function checkCell(col, row, cols, rows) {
  if (!(col >= 0 && col < cols && row >= 0 && row < rows)) {
    throw new GridError(`cell (${col}, ${row}) outside ${cols}x${rows} grid`);
  }
}

function clampedCell(x, y, border, cell, cols, rows) {
  const c = Math.floor((x - border) / cell);
  const r = Math.floor((y - border) / cell);
  return [Math.max(0, Math.min(cols - 1, c)), Math.max(0, Math.min(rows - 1, r))];
}

/** Normalise a ring to an open array of [x, y] pairs (no repeated last point). */
function ringPoints(ring) {
  const pts = ring.map(([x, y]) => [Number(x), Number(y)]);
  if (pts.length >= 2 && pts[0][0] === pts[pts.length - 1][0]
      && pts[0][1] === pts[pts.length - 1][1]) {
    return pts.slice(0, -1);
  }
  return pts;
}

/**
 * Area of polygon ∩ box, by Sutherland-Hodgman then shoelace. Exact for any
 * subject polygon because the clip region is convex; a concave subject can
 * come back with zero-area connecting slivers along the boundary, which
 * contribute nothing to the shoelace sum.
 */
function clippedArea(pts, x0, y0, x1, y1) {
  let poly = clipHalfPlane(pts, (p) => p[0] >= x0, (a, b) => splitX(a, b, x0));
  if (poly.length === 0) return 0;
  poly = clipHalfPlane(poly, (p) => p[0] <= x1, (a, b) => splitX(a, b, x1));
  if (poly.length === 0) return 0;
  poly = clipHalfPlane(poly, (p) => p[1] >= y0, (a, b) => splitY(a, b, y0));
  if (poly.length === 0) return 0;
  poly = clipHalfPlane(poly, (p) => p[1] <= y1, (a, b) => splitY(a, b, y1));
  if (poly.length < 3) return 0;
  return polygonAreaPx(poly);
}

function clipHalfPlane(poly, inside, intersect) {
  const out = [];
  for (let i = 0; i < poly.length; i += 1) {
    const cur = poly[i];
    const prev = poly[(i - 1 + poly.length) % poly.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}

function splitX(a, b, x) {
  const t = (x - a[0]) / (b[0] - a[0]);
  return [x, a[1] + t * (b[1] - a[1])];
}

function splitY(a, b, y) {
  const t = (y - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), y];
}
