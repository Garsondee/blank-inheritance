"""Marching squares over the elevation grid.

Pure, in GRID coordinates (fractional col/row) -- callers convert to map space
themselves via `grid_to_map`. This is the one algorithm that draws every line
implied by terrain height: topographic contours above sea level, the
coastline itself at level 0 (a natural consequence, not a special case), and
would equally serve gameplay depth bands below it if the renderer ever wants
them drawn rather than just computed.

Edge ids around a cell: 0=top (tl-tr), 1=right (tr-br), 2=bottom (bl-br),
3=left (tl-bl). `CASES` maps the 4-bit corner-above-level pattern
(bit 3=tl, 2=tr, 1=br, 0=bl) to which edge pairs the contour crosses. Cases 5
and 10 are checkerboard saddles with two valid interpretations; which one is
correct depends on whether the cell centre reads above or below the contour
level, so they are resolved separately rather than living in the table.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np

STAGE_CODE_VERSION = 1

GridPoint = Tuple[float, float]     # (col, row), both fractional
Segment = Tuple[GridPoint, GridPoint]

CASES = {
    1: [(3, 2)], 2: [(2, 1)], 3: [(3, 1)], 4: [(0, 1)],
    6: [(0, 2)], 7: [(0, 3)], 8: [(0, 3)], 9: [(0, 2)],
    11: [(0, 1)], 12: [(3, 1)], 13: [(2, 1)], 14: [(3, 2)],
}


def contour_segments(elevation: np.ndarray, level: float) -> List[Segment]:
    """Every line segment of the `level` contour, in (col, row) grid space.

    Any cell touching a NaN corner is skipped entirely -- a contour must never
    interpolate across a real/no-data boundary, which is exactly the
    coastline case this will most often run near.
    """
    tl, tr = elevation[:-1, :-1], elevation[:-1, 1:]
    bl, br = elevation[1:, :-1], elevation[1:, 1:]
    valid = ~(np.isnan(tl) | np.isnan(tr) | np.isnan(bl) | np.isnan(br))

    above_tl = np.where(valid, tl > level, False)
    above_tr = np.where(valid, tr > level, False)
    above_br = np.where(valid, br > level, False)
    above_bl = np.where(valid, bl > level, False)
    case = ((above_tl.astype(np.uint8) << 3) | (above_tr.astype(np.uint8) << 2)
           | (above_br.astype(np.uint8) << 1) | above_bl.astype(np.uint8))

    crossing = valid & (case != 0) & (case != 15)
    rows, cols = np.nonzero(crossing)

    segments: List[Segment] = []
    for r, c in zip(rows.tolist(), cols.tolist()):
        i = int(case[r, c])
        v_tl, v_tr = float(tl[r, c]), float(tr[r, c])
        v_bl, v_br = float(bl[r, c]), float(br[r, c])

        if i == 5:
            centre = (v_tl + v_tr + v_bl + v_br) / 4.0
            pairs = [(0, 1), (2, 3)] if centre > level else [(0, 3), (2, 1)]
        elif i == 10:
            centre = (v_tl + v_tr + v_bl + v_br) / 4.0
            pairs = [(0, 3), (2, 1)] if centre > level else [(0, 1), (2, 3)]
        else:
            pairs = CASES.get(i)
        if not pairs:
            continue

        def edge_point(edge: int) -> GridPoint:
            if edge == 0:
                t = (level - v_tl) / (v_tr - v_tl)
                return (c + t, r)
            if edge == 1:
                t = (level - v_tr) / (v_br - v_tr)
                return (c + 1, r + t)
            if edge == 2:
                t = (level - v_bl) / (v_br - v_bl)
                return (c + t, r + 1)
            t = (level - v_tl) / (v_bl - v_tl)
            return (c, r + t)

        for a, b in pairs:
            segments.append((edge_point(a), edge_point(b)))
    return segments


def grid_to_map(col: float, row: float, origin_x: float, origin_y: float,
                extent_m: float, grid_n: int) -> Tuple[float, float]:
    """Grid (col, row) -> MAP space, matching the row-0-is-north convention
    `acquire.dem_grid_for_frame` builds the array in."""
    x = origin_x + (col + 0.5) / grid_n * extent_m
    y = origin_y + extent_m - (row + 0.5) / grid_n * extent_m
    return x, y


def contour_levels(elevation: np.ndarray, interval: float = 10.0,
                   major_interval: float = 50.0) -> List[float]:
    """Every level worth drawing, snapped to the interval grid.

    Level 0 is deliberately excluded when it would fall on the grid -- that
    line is the coastline, already drawn far more precisely from the vector
    sea polygon, and a redundant contour at exactly sea level tends to
    double-stroke the shore.
    """
    if not np.any(~np.isnan(elevation)):
        return []
    lo = int(np.ceil(float(np.nanmin(elevation)) / interval)) * interval
    hi = float(np.nanmax(elevation))
    levels = []
    level = max(interval, lo)
    while level <= hi:
        if level != 0:
            levels.append(level)
        level += interval
    return levels


def is_major(level: float, major_interval: float = 50.0) -> bool:
    return (level % major_interval) == 0


@dataclass
class ContourLine:
    level: float
    major: bool
    segments: List[Segment]


def extract_contours(elevation: np.ndarray, interval: float = 10.0,
                     major_interval: float = 50.0) -> List[ContourLine]:
    """Every contour line worth drawing, still in grid space."""
    return [
        ContourLine(level=level, major=is_major(level, major_interval),
                   segments=contour_segments(elevation, level))
        for level in contour_levels(elevation, interval, major_interval)
    ]


def total_segment_count(lines: List[ContourLine]) -> int:
    return sum(len(line.segments) for line in lines)
