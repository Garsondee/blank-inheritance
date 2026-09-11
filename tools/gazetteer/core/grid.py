"""The campaign map's reference grid -- pure integer arithmetic, no I/O.

The map is a 12400x12400 raster with a 200 px margin painted around a
12000x12000 content area. The content area is rendered at exactly 1 metre per
pixel (`extentM` 12000 over 12000 px), so a 200 px cell is 200 m of real
ground. That gives a 60x60 grid, which is too many columns for plain atlas
lettering -- A..Z runs out at 26 and more than half of every reference would be
two letters ("AN37"). So the scheme is two-tier, the way a survey sheet does it:

    MAJOR   10x10 cells = 2 km. Six across, six down. Column A-F left to right,
            row 1-6 top to bottom.  ->  "C4"
    SUB     the cell's position inside its major, as two digits: column first,
            then row, each 0-9, counting right and down.  ->  "73"
    REF     the two joined by a middle dot.  ->  "C4·73"

Everything here is deliberately integer-only and side-effect free so the same
arithmetic can be mirrored in core/grid.mjs for the browser and held to it by a
shared fixture (test/fixtures/gazetteer-grid-cases.json). Two small
implementations tested against one another are safer here than one
implementation plus a language boundary to smuggle coordinates across.

Cell indices are 0-based from the content area's TOP-LEFT, y increasing
downward, matching raster convention and `Tile.to_px`. Grid references are the
human-facing spelling of the same pair; nothing downstream should parse a
reference string when it could carry (col, row).
"""

from __future__ import annotations

# --- the map's fixed geometry ------------------------------------------------
# These are defaults. The real values are carried by data/map/campaign-map.json
# and passed in explicitly by callers that have loaded it; they live here as
# named constants so the pure functions can be tested without a manifest.

BORDER_PX = 200
CELL_PX = 200
CELLS_PER_MAJOR = 10
GRID_COLS = 60
GRID_ROWS = 60

MAJOR_COLS = GRID_COLS // CELLS_PER_MAJOR   # 6
MAJOR_ROWS = GRID_ROWS // CELLS_PER_MAJOR   # 6

MAJOR_COL_LETTERS = "ABCDEF"
SEPARATOR = "·"   # MIDDLE DOT


class GridError(ValueError):
    """A coordinate or reference that cannot exist on this map."""


# --- image pixels <-> cell ---------------------------------------------------

def image_px_to_cell(x, y, border=BORDER_PX, cell=CELL_PX,
                     cols=GRID_COLS, rows=GRID_ROWS):
    """Image pixel -> (col, row), 0-based from the content area's top-left.

    Raises GridError outside the content area rather than clamping. Clamping
    would silently file a location drawn on the margin into the edge cell,
    which is the kind of off-by-a-cell that only shows up at the table.
    """
    cx = x - border
    cy = y - border
    if cx < 0 or cy < 0 or cx >= cols * cell or cy >= rows * cell:
        raise GridError(
            "image pixel (%s, %s) is outside the %dx%d content area "
            "(margin is %d px)" % (x, y, cols * cell, rows * cell, border))
    return (int(cx // cell), int(cy // cell))


def cell_to_image_px(col, row, border=BORDER_PX, cell=CELL_PX,
                     cols=GRID_COLS, rows=GRID_ROWS):
    """(col, row) -> the image pixel of that cell's TOP-LEFT corner."""
    _check_cell(col, row, cols, rows)
    return (border + col * cell, border + row * cell)


def cell_centre_px(col, row, border=BORDER_PX, cell=CELL_PX,
                   cols=GRID_COLS, rows=GRID_ROWS):
    """(col, row) -> the image pixel at that cell's centre."""
    x, y = cell_to_image_px(col, row, border, cell, cols, rows)
    return (x + cell / 2.0, y + cell / 2.0)


def cell_bounds_px(col, row, border=BORDER_PX, cell=CELL_PX,
                   cols=GRID_COLS, rows=GRID_ROWS):
    """(col, row) -> (x0, y0, x1, y1) in image pixels, half-open on x1/y1."""
    x, y = cell_to_image_px(col, row, border, cell, cols, rows)
    return (x, y, x + cell, y + cell)


# --- cell <-> reference string ----------------------------------------------

def cell_to_ref(col, row, cols=GRID_COLS, rows=GRID_ROWS, separator=SEPARATOR):
    """(col, row) -> a reference string such as C4·73."""
    _check_cell(col, row, cols, rows)
    major_col, sub_col = divmod(col, CELLS_PER_MAJOR)
    major_row, sub_row = divmod(row, CELLS_PER_MAJOR)
    return "%s%d%s%d%d" % (MAJOR_COL_LETTERS[major_col], major_row + 1,
                           separator, sub_col, sub_row)


def ref_to_cell(ref, cols=GRID_COLS, rows=GRID_ROWS):
    """A reference string -> (col, row).

    Accepts a plain "." or "-" as the separator as well as the middle dot,
    because those are what actually get typed into a chat message.
    """
    cleaned = ref.strip().upper()
    for ch in (SEPARATOR, ".", "-", " "):
        cleaned = cleaned.replace(ch, "")
    if len(cleaned) != 4:
        raise GridError("%r is not a grid reference (expected e.g. C4%s73)"
                        % (ref, SEPARATOR))
    letter, major_row_ch, sub_col_ch, sub_row_ch = cleaned
    if letter not in MAJOR_COL_LETTERS:
        raise GridError("%r: major column must be one of %s"
                        % (ref, MAJOR_COL_LETTERS))
    if not (major_row_ch.isdigit() and sub_col_ch.isdigit() and sub_row_ch.isdigit()):
        raise GridError("%r: major row and both sub digits must be numeric" % (ref,))
    major_row = int(major_row_ch) - 1
    if not (0 <= major_row < MAJOR_ROWS):
        raise GridError("%r: major row must be 1-%d" % (ref, MAJOR_ROWS))
    col = MAJOR_COL_LETTERS.index(letter) * CELLS_PER_MAJOR + int(sub_col_ch)
    row = major_row * CELLS_PER_MAJOR + int(sub_row_ch)
    _check_cell(col, row, cols, rows)
    return (col, row)


def image_px_to_ref(x, y, border=BORDER_PX, cell=CELL_PX,
                    cols=GRID_COLS, rows=GRID_ROWS, separator=SEPARATOR):
    """Convenience: image pixel straight to a reference string."""
    col, row = image_px_to_cell(x, y, border, cell, cols, rows)
    return cell_to_ref(col, row, cols, rows, separator)


def major_label(major_col, major_row):
    """0-based major indices -> the label for that 2 km square, e.g. C4."""
    if not (0 <= major_col < MAJOR_COLS and 0 <= major_row < MAJOR_ROWS):
        raise GridError("major (%s, %s) outside %dx%d"
                        % (major_col, major_row, MAJOR_COLS, MAJOR_ROWS))
    return "%s%d" % (MAJOR_COL_LETTERS[major_col], major_row + 1)


# --- polygons ----------------------------------------------------------------

#: Overlap smaller than this many square pixels is treated as no overlap.
#: Guards against float slivers along a shared boundary. A real overlap on this
#: map is thousands of square metres, so the threshold is never close to a
#: judgement call.
MIN_OVERLAP_PX2 = 1e-6


def cell_coverage(ring, border=BORDER_PX, cell=CELL_PX,
                  cols=GRID_COLS, rows=GRID_ROWS):
    """Every cell a polygon overlaps, as [(col, row, overlap_px2), ...].

    "Touches" means the cell square and the polygon share POSITIVE AREA -- not
    that a vertex lands in the cell, and not the centroid's cell. That is what
    was actually asked for ("any grid spaces which this polygon touches"), and
    it is the only reading under which a long thin shape (a causeway, a rail
    cut) reports the cells it genuinely crosses.

    Measured by clipping the polygon to each candidate cell (Sutherland-Hodgman
    against the cell rectangle, which is exact because a rectangle is convex)
    and taking the shoelace area of the result. Deciding overlap from corner
    containment plus edge crossings instead is subtly wrong at a shared
    boundary: a building whose wall sits exactly on a grid line would claim the
    cell on the far side, which it does not occupy. Cells are half-open, so a
    boundary-hugging shape files under the lower cell only -- the same rule
    `image_px_to_cell` already uses for a bare point.

    Per-cell area falls out of the measurement for free and is worth keeping:
    it is what tells you which cell a location is mostly in, as opposed to
    merely clipping the corner of.

    A bbox sweep bounds the candidates; a 60x60 grid is 3600 worst case, so
    exactness costs nothing worth saving.
    """
    pts = _ring_points(ring)
    if len(pts) < 3:
        raise GridError("a polygon ring needs at least 3 distinct points")

    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    c0, r0 = _clamped_cell(min(xs), min(ys), border, cell, cols, rows)
    c1, r1 = _clamped_cell(max(xs), max(ys), border, cell, cols, rows)

    out = []
    for row in range(r0, r1 + 1):
        for col in range(c0, c1 + 1):
            x0, y0, x1, y1 = cell_bounds_px(col, row, border, cell, cols, rows)
            area = _clipped_area(pts, x0, y0, x1, y1)
            if area > MIN_OVERLAP_PX2:
                out.append((col, row, area))
    return out


def cells_touched(ring, border=BORDER_PX, cell=CELL_PX,
                  cols=GRID_COLS, rows=GRID_ROWS):
    """cell_coverage without the areas: [(col, row), ...] in row-major order."""
    return [(c, r) for c, r, _ in
            cell_coverage(ring, border, cell, cols, rows)]


def refs_touched(ring, border=BORDER_PX, cell=CELL_PX,
                 cols=GRID_COLS, rows=GRID_ROWS, separator=SEPARATOR):
    """cells_touched, spelled as reference strings."""
    return [cell_to_ref(c, r, cols, rows, separator)
            for c, r in cells_touched(ring, border, cell, cols, rows)]


def polygon_area_px(ring):
    """Shoelace area in square pixels, always positive.

    On this map 1 px is 1 m, so the number also reads as square metres -- but
    callers should say which they mean rather than relying on that.
    """
    pts = _ring_points(ring)
    if len(pts) < 3:
        return 0.0
    total = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        total += x0 * y1 - x1 * y0
    return abs(total) / 2.0


def polygon_centroid_px(ring):
    """Area centroid, not the vertex mean.

    Falls back to the vertex mean for a degenerate (zero-area) ring so callers
    always get a usable point instead of a division by zero.
    """
    pts = _ring_points(ring)
    if not pts:
        raise GridError("empty ring has no centroid")
    if len(pts) < 3:
        return (sum(p[0] for p in pts) / len(pts),
                sum(p[1] for p in pts) / len(pts))
    cross_sum = 0.0
    cx = cy = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        cross = x0 * y1 - x1 * y0
        cross_sum += cross
        cx += (x0 + x1) * cross
        cy += (y0 + y1) * cross
    if cross_sum == 0.0:
        return (sum(p[0] for p in pts) / len(pts),
                sum(p[1] for p in pts) / len(pts))
    return (cx / (3.0 * cross_sum), cy / (3.0 * cross_sum))


# --- internals ---------------------------------------------------------------

def _check_cell(col, row, cols, rows):
    if not (0 <= col < cols and 0 <= row < rows):
        raise GridError("cell (%s, %s) outside %dx%d grid" % (col, row, cols, rows))


def _clamped_cell(x, y, border, cell, cols, rows):
    """image_px_to_cell, but clamping instead of raising.

    Only for bbox sweep bounds, where a shape overhanging the painted margin
    should still report the cells it does cover rather than failing outright.
    """
    c = int((x - border) // cell)
    r = int((y - border) // cell)
    return (max(0, min(cols - 1, c)), max(0, min(rows - 1, r)))


def _ring_points(ring):
    """Normalise a ring to an open list of float pairs (no repeated last point)."""
    pts = [(float(px), float(py)) for px, py in ring]
    if len(pts) >= 2 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return pts


def _clipped_area(pts, x0, y0, x1, y1):
    """Area of polygon ∩ box, by Sutherland-Hodgman then shoelace.

    Exact for any subject polygon because the clip region is convex. A concave
    subject can come back with zero-area connecting slivers along the boundary,
    which is harmless here: they contribute nothing to the shoelace sum, and
    area is the only thing this is asked for.
    """
    poly = pts
    # Each clip is a half-plane: keep >= x0, <= x1, >= y0, <= y1.
    poly = _clip_half_plane(poly, lambda p: p[0] >= x0, lambda a, b: _split_x(a, b, x0))
    if not poly:
        return 0.0
    poly = _clip_half_plane(poly, lambda p: p[0] <= x1, lambda a, b: _split_x(a, b, x1))
    if not poly:
        return 0.0
    poly = _clip_half_plane(poly, lambda p: p[1] >= y0, lambda a, b: _split_y(a, b, y0))
    if not poly:
        return 0.0
    poly = _clip_half_plane(poly, lambda p: p[1] <= y1, lambda a, b: _split_y(a, b, y1))
    if len(poly) < 3:
        return 0.0
    return polygon_area_px(poly)


def _clip_half_plane(poly, inside, intersect):
    out = []
    n = len(poly)
    for i in range(n):
        cur = poly[i]
        prev = poly[i - 1]
        cur_in = inside(cur)
        prev_in = inside(prev)
        if cur_in:
            if not prev_in:
                out.append(intersect(prev, cur))
            out.append(cur)
        elif prev_in:
            out.append(intersect(prev, cur))
    return out


def _split_x(a, b, x):
    t = (x - a[0]) / (b[0] - a[0])
    return (x, a[1] + t * (b[1] - a[1]))


def _split_y(a, b, y):
    t = (y - a[1]) / (b[1] - a[1])
    return (a[0] + t * (b[0] - a[0]), y)
