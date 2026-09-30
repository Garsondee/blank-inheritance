// Tier 1 — the campaign map's reference grid, browser side.
//
// The claim: tools/location-sync/core/grid.mjs agrees with
// tools/location-sync/core/grid.py on every case in the shared fixture. Both
// suites read the same file, so neither implementation can be "fixed" into
// agreement with itself — a disagreement fails on both sides at once.
//
// Why it matters beyond tidiness: the browser computes the live grid readout
// under the cursor and the cell list while you draw; the server computes the
// cells that get written into a location's record. If those two ever disagree,
// a building is filed in one cell and pointed at in another, and nothing
// complains.
//
// See test/location-sync/test_grid.py for the Python half.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  imagePxToCell,
  cellToImagePx,
  cellCentrePx,
  cellBoundsPx,
  cellToRef,
  refToCell,
  imagePxToRef,
  majorLabel,
  cellCoverage,
  cellsTouched,
  refsTouched,
  polygonAreaPx,
  polygonCentroidPx,
  GridError,
  BORDER_PX,
  CELL_PX,
  GRID_COLS,
  GRID_ROWS,
  MAJOR_COLS,
  MAJOR_ROWS,
  SEPARATOR,
} from "../../tools/location-sync/core/grid.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(here, "..", "fixtures", "gazetteer-grid-cases.json"), "utf8"));

const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

test("the fixture's declared geometry is the geometry this module implements", () => {
  const g = fixture.geometry;
  assert.equal(BORDER_PX, g.borderPx);
  assert.equal(CELL_PX, g.cellPx);
  assert.equal(GRID_COLS, g.gridCols);
  assert.equal(GRID_ROWS, g.gridRows);
  assert.equal(SEPARATOR, g.separator);
  assert.equal(MAJOR_COLS, g.gridCols / g.cellsPerMajor);
  assert.equal(MAJOR_ROWS, g.gridRows / g.cellsPerMajor);
});

test("image pixels map to the expected cell and reference", () => {
  for (const c of fixture.pointCases) {
    const [x, y] = c.imagePx;
    const { col, row } = imagePxToCell(x, y);
    assert.deepEqual([col, row], c.cell, `${c.why} — cell for (${x}, ${y})`);
    assert.equal(imagePxToRef(x, y), c.ref, `${c.why} — ref for (${x}, ${y})`);
  }
});

test("pixels outside the content area are rejected, not clamped", () => {
  for (const c of fixture.outOfBoundsPx) {
    assert.throws(() => imagePxToCell(...c.imagePx), GridError, c.why);
  }
});

test("reference strings parse back to their cell, including typed variants", () => {
  for (const c of fixture.refParseCases) {
    const { col, row } = refToCell(c.ref);
    assert.deepEqual([col, row], c.cell, c.why);
  }
});

test("malformed references are rejected", () => {
  for (const c of fixture.badRefs) {
    assert.throws(() => refToCell(c.ref), GridError, c.why);
  }
});

test("major squares are labelled A1 through F6", () => {
  for (const c of fixture.majorLabelCases) {
    assert.equal(majorLabel(...c.major), c.label);
  }
  assert.throws(() => majorLabel(MAJOR_COLS, 0), GridError);
  assert.throws(() => majorLabel(0, MAJOR_ROWS), GridError);
});

test("every cell in the grid round-trips through its reference", () => {
  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const ref = cellToRef(col, row);
      assert.deepEqual(refToCell(ref), { col, row }, `round trip for ${ref}`);
      // ...and the cell's own centre pixel lands back in the same cell.
      const { x, y } = cellCentrePx(col, row);
      assert.deepEqual(imagePxToCell(x, y), { col, row }, `centre of ${ref}`);
    }
  }
});

test("cell corners and bounds are consistent with the cell size", () => {
  const { x, y } = cellToImagePx(21, 31);
  assert.deepEqual([x, y], [200 + 21 * 200, 200 + 31 * 200]);
  assert.deepEqual(cellBoundsPx(21, 31), [x, y, x + CELL_PX, y + CELL_PX]);
  // A cell's top-left pixel belongs to that cell; the pixel one before does not.
  assert.deepEqual(imagePxToCell(x, y), { col: 21, row: 31 });
  assert.deepEqual(imagePxToCell(x - 1, y - 1), { col: 20, row: 30 });
});

test("polygons report exactly the cells their area overlaps", () => {
  for (const c of fixture.polygonCases) {
    assert.deepEqual(refsTouched(c.ring), c.refs, c.why);
    if (c.areaPx !== undefined) {
      assert.ok(near(polygonAreaPx(c.ring), c.areaPx),
        `${c.why} — area ${polygonAreaPx(c.ring)} != ${c.areaPx}`);
    }
    if (c.centroidPx !== undefined) {
      const { x, y } = polygonCentroidPx(c.ring);
      assert.ok(near(x, c.centroidPx[0]) && near(y, c.centroidPx[1]),
        `${c.why} — centroid (${x}, ${y}) != ${JSON.stringify(c.centroidPx)}`);
    }
  }
});

test("per-cell coverage sums to the polygon's own area", () => {
  // The strongest single check on the clipper: if every cell's clipped area is
  // right, the pieces must add back up to the whole. Catches a dropped cell and
  // a double-counted overlap in one assertion.
  for (const c of fixture.polygonCases) {
    const total = cellCoverage(c.ring).reduce((s, cell) => s + cell.areaPx, 0);
    assert.ok(near(total, polygonAreaPx(c.ring), 1e-6),
      `${c.why} — coverage ${total} != area ${polygonAreaPx(c.ring)}`);
  }
});

test("coverage areas never exceed one cell and are always positive", () => {
  for (const c of fixture.polygonCases) {
    for (const cell of cellCoverage(c.ring)) {
      assert.ok(cell.areaPx > 0, "a reported cell must have positive overlap");
      assert.ok(cell.areaPx <= CELL_PX * CELL_PX + 1e-6,
        "no cell can be covered by more than its own area");
    }
  }
});

test("cellsTouched is cellCoverage without the areas", () => {
  const ring = fixture.polygonCases[0].ring;
  assert.deepEqual(cellsTouched(ring), cellCoverage(ring).map(({ col, row }) => ({ col, row })));
});

test("a degenerate ring is rejected rather than silently reporting nothing", () => {
  assert.throws(() => cellsTouched([[1000, 1000], [2000, 2000]]), GridError);
  assert.throws(() => cellsTouched([[1000, 1000], [2000, 2000], [1000, 1000]]), GridError);
});

test("a zero-area ring has an area of zero and still yields a usable centroid", () => {
  const line = [[1000, 1000], [2000, 1000], [1000, 1000]];
  assert.equal(polygonAreaPx(line), 0);
  const { x, y } = polygonCentroidPx(line);
  assert.ok(Number.isFinite(x) && Number.isFinite(y), "degenerate ring must not divide by zero");
});

test("a shape overhanging the painted margin still reports its in-bounds cells", () => {
  // Drawing slightly off the edge of the content area is an easy slip with a
  // mouse. It must not throw away the part of the shape that IS on the map.
  const refs = refsTouched([[100, 100], [500, 100], [500, 500], [100, 500]]);
  assert.ok(refs.includes("A1·00"), "the in-bounds corner cell must still be reported");
  assert.ok(refs.length > 0);
});
