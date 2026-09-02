"""Terrain fields: hillshade, cast shadow, and the routing elevation.

Everything here is a pure function of an elevation array, so it is all testable
without touching the network or rendering anything.

**The elevation array is the single terrain hook.** It is consumed by exactly
three things downstream -- the horizon shadow sweep, the Lambertian hillshade,
and contour extraction. That is why an `excavate` or `crater` operation edits
*this array* rather than painting pixels: a dig site then gets correct cast
shadows and correct contour rings for free, because both re-derive from the
same numbers. Edit the terrain, not the picture.

**The colour-temperature bug (2026-08-23).** Port Island rendered with a cold
blue wash despite being in full sun. The cause was that brightness and colour
temperature were both driven by `lit = dot * (1 - occluded)`. On flat ground the
Lambertian dot product is just sin(altitude), and at a golden-hour 14 degrees
that is ~0.24 -- a low number *regardless of shadow*. So flat, entirely unshaded
reclaimed land blended most of the way toward the cool tint. That is correct
physics for direct-light INTENSITY (a grazing sun really does light flat ground
weakly) but wrong for COLOUR: real golden-hour light stays warm on anything the
sun can actually reach. Only genuine cast shadow goes cool.

The fix is to decouple them: colour temperature follows `direct_ok` (occlusion
alone), brightness still follows `lit` (occlusion x facing). See
`shade_rgb` below.
"""

from __future__ import annotations

import math
from typing import Optional, Tuple

import numpy as np
from PIL import Image

try:
    from scipy.ndimage import distance_transform_edt as _scipy_edt
    from scipy.ndimage import gaussian_filter as _scipy_gaussian
    HAVE_SCIPY = True
except ImportError:  # pragma: no cover - exercised only on a bare install
    HAVE_SCIPY = False

STAGE_CODE_VERSION = 1


def gaussian_blur(array: np.ndarray, sigma: float) -> np.ndarray:
    """Blur a float array.

    scipy operates on floats directly. Without it, PIL is the fallback -- but
    `ImageFilter.GaussianBlur` rejects 32-bit 'F' mode images, so the array has
    to round-trip through uint8, which both quantises and clips. That round-trip
    was a real hack in the original spike; scipy removes it.
    """
    if sigma <= 0:
        return array
    if HAVE_SCIPY:
        return _scipy_gaussian(array, sigma=sigma, mode="nearest")
    lo, hi = float(np.nanmin(array)), float(np.nanmax(array))
    if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo:
        return array
    scaled = ((array - lo) / (hi - lo) * 255.0).astype(np.uint8)
    from PIL import ImageFilter
    blurred = Image.fromarray(scaled).filter(ImageFilter.GaussianBlur(sigma))
    return np.asarray(blurred, dtype=np.float32) / 255.0 * (hi - lo) + lo


def distance_from(mask: np.ndarray, cell_size_m: float) -> np.ndarray:
    """Euclidean distance in metres from the True cells of `mask`.

    scipy's exact EDT is ~85x faster than the pure-Python two-pass version this
    replaces (measured: 17.3 s vs ~0.2 s at 2048^2), on a step the sea depth
    gradient has to run every time the frame changes.
    """
    if HAVE_SCIPY:
        # scipy measures distance to the nearest ZERO, so the mask is inverted
        # to make the seeds the zeros.
        return _scipy_edt(~mask).astype(np.float32) * cell_size_m
    # The fallback takes the seed mask directly (seeds are the zero-distance
    # cells), so it must NOT be inverted -- doing so measures distance from
    # everywhere-except-the-seeds, which is the opposite field.
    return _edt_fallback(mask).astype(np.float32) * cell_size_m


def _edt_fallback(seed_mask: np.ndarray) -> np.ndarray:
    """Exact Euclidean distance transform (Felzenszwalb & Huttenlocher)."""
    inf = 1e20
    f = np.where(seed_mask, 0.0, inf).astype(np.float64)
    for axis in (0, 1):
        f = np.apply_along_axis(_edt_1d, axis, f)
    return np.sqrt(f)


def _edt_1d(f: np.ndarray) -> np.ndarray:
    n = len(f)
    d = np.empty(n)
    v = np.zeros(n, dtype=np.int64)
    z = np.empty(n + 1)
    k = 0
    v[0] = 0
    z[0] = -1e20
    z[1] = 1e20
    for q in range(1, n):
        while True:
            s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2.0 * q - 2.0 * v[k])
            if s <= z[k]:
                k -= 1
                if k < 0:
                    k = 0
                    break
            else:
                break
        k += 1
        v[k] = q
        z[k] = s
        z[k + 1] = 1e20
    k = 0
    for q in range(n):
        while z[k + 1] < q:
            k += 1
        d[q] = (q - v[k]) ** 2 + f[v[k]]
    return d


def light_vector(azimuth_deg: float, altitude_deg: float, rotation_deg: float
                 ) -> Tuple[float, float, float]:
    """Light direction in MAP space.

    Defined in true geographic terms (the bearing the light comes FROM) and then
    rotated by the frame's own rotation, so the sun stays in the same corner of
    the page no matter how the city is oriented. Returns the horizontal
    components of the direction the SHADOW falls, plus tan(altitude).
    """
    shadow_bearing = math.radians(azimuth_deg + 180.0)
    geo_dx, geo_dy = math.sin(shadow_bearing), math.cos(shadow_bearing)
    r = math.radians(rotation_deg)
    dx = geo_dx * math.cos(r) - geo_dy * math.sin(r)
    dy = geo_dx * math.sin(r) + geo_dy * math.cos(r)
    return dx, dy, math.tan(math.radians(altitude_deg))


def horizon_shadow(elevation: np.ndarray, shadow_dx: float, shadow_dy: float,
                   tan_altitude: float, cell_size_m: float) -> np.ndarray:
    """Terrain occluding terrain -- a ridge throwing shade into the valley behind.

    Rotates the heightfield so the light travels along +rows, then runs a single
    O(n) sweep per column carrying the running maximum "ray height". A cell is
    shadowed when that ray passes above it. This is the standard heightfield
    horizon algorithm; the rotation is what makes it one pass instead of a
    per-cell ray march.

    Measured at 0.50 s for the whole 2048^2 frame, which is why previews keep it
    global rather than trying to window it -- terrain up-sun of a window casts
    into it, and at a 14 degree sun with 700 m of relief that reach is ~2.8 km.

    `shadow_dx`/`shadow_dy` are a MAP-space direction, and are converted to
    array space here.

    REGRESSION (found 2026-08-24 by test_terrain, inherited from the original
    spike): the map-space y axis points NORTH but array rows increase SOUTH, so
    passing `shadow_dy` straight into the rotation inverted the vertical
    component of the light. Terrain shadows fell up-page while building shadows
    -- which are translated in map space and only flipped at the final pixel
    conversion -- fell down-page. Every hillside was therefore lit from the
    opposite vertical direction to every building beside it. It reads as merely
    "busy" on complex ridge terrain rather than as an obvious fault, which is
    why it survived to a delivered render.
    """
    height, width = elevation.shape
    # Map space -> array space: columns follow +x, rows follow -y.
    row_dir, col_dir = -shadow_dy, shadow_dx
    angle = math.degrees(math.atan2(col_dir, row_dir))
    fill = float(np.nanmin(elevation))

    rotated = Image.fromarray(elevation.astype(np.float32), mode="F").rotate(
        -angle, expand=True, resample=Image.BICUBIC, fillcolor=fill)
    field = np.asarray(rotated, dtype=np.float32)
    rows, cols = field.shape

    max_ray = np.full(cols, -1e9, dtype=np.float32)
    shadowed = np.zeros((rows, cols), dtype=bool)
    for row in range(rows):
        travelled = row * cell_size_m
        shadowed[row] = (max_ray - travelled * tan_altitude) > field[row]
        max_ray = np.maximum(max_ray, field[row] + travelled * tan_altitude)

    back = Image.fromarray((shadowed * 255).astype(np.uint8)).rotate(
        angle, expand=True, resample=Image.BICUBIC)
    bw, bh = back.size
    left, top = (bw - width) // 2, (bh - height) // 2
    cropped = back.crop((left, top, left + width, top + height))
    return np.asarray(cropped, dtype=np.float32) / 255.0


def surface_normals(elevation: np.ndarray, cell_size_m: float):
    """Unit surface normals from central differences."""
    dzdx = np.zeros_like(elevation)
    dzdx[:, 1:-1] = (elevation[:, 2:] - elevation[:, :-2]) / (2.0 * cell_size_m)
    dzdrow = np.zeros_like(elevation)
    dzdrow[1:-1, :] = (elevation[2:, :] - elevation[:-2, :]) / 2.0
    # Rows increase downward (north is -row), so the y gradient is negated.
    dzdy = -dzdrow / cell_size_m
    length = np.sqrt(dzdx ** 2 + dzdy ** 2 + 1.0)
    return -dzdx / length, -dzdy / length, 1.0 / length


def fill_land_nan(elevation: np.ndarray, sea_mask: np.ndarray) -> np.ndarray:
    """Nearest-valid-neighbour fill for NaN cells OUTSIDE the sea polygon.

    **The missing-DEM-over-land bug (2026-08-24).** The sea-level-0.0 fill
    below (shade_rgb's own docstring) is correct reasoning for genuine open
    water, but GSI NoData is not exclusively a coastal/sea phenomenon the way
    that comment assumed -- a direct user report, confirmed by sampling the
    real Kurose frame at the reported location, found a real PENINSULA (real
    buildings, real roads, clearly emerged land) with 52.75% of its DEM cells
    NaN. Flattening those to 0.0 sits a fake, perfectly flat patch against
    its real, gently-varying (0.16-13.8 m) neighbours -- normals computed
    across that boundary read as a jagged, blocky, "low resolution" artifact
    exactly where it happens, unrelated to the actual DEM's real detail
    (which is fine -- see cast_shadow_mul's own history of a DIFFERENT
    hillshade complaint that turned out to be real terrain, not a bug).

    `sea_mask` (True = inside the sea polygon, rasterised at this array's own
    resolution) keeps sea-NaN on the existing, already-correct 0.0 fill --
    this function only changes what happens OUTSIDE it. Requires scipy
    (nearest-index search via distance_transform_edt); this codebase's own
    tests already assert scipy is present here (TestScipyPresence), so unlike
    distance_from there is no pure-Python fallback -- hand-rolling an
    equivalent nearest-index search is real added complexity for a path that
    never actually runs without scipy in practice.
    """
    if not HAVE_SCIPY:
        raise RuntimeError("fill_land_nan requires scipy (distance_transform_edt with return_indices)")
    valid = ~np.isnan(elevation)
    if valid.all():
        return elevation.astype(np.float32)
    if not valid.any():
        # Nothing real ANYWHERE to borrow a nearest value from (there is no
        # "nearest" when every cell is foreground) -- sea level 0.0 is the
        # same physically-sensible "unknown" default used throughout this
        # module, not a manufactured elevation.
        return np.zeros_like(elevation, dtype=np.float32)
    _, indices = _scipy_edt(~valid, return_distances=True, return_indices=True)
    nearest = elevation[tuple(indices)]
    return np.where(valid, elevation, np.where(sea_mask, 0.0, nearest)).astype(np.float32)


def shade_rgb(elevation: np.ndarray, cell_size_m: float, azimuth_deg: float,
              altitude_deg: float, rotation_deg: float, lighting: dict,
              occlusion_blur_sigma: float = 1.4,
              sea_mask: Optional[np.ndarray] = None) -> np.ndarray:
    """Per-cell RGB multiplier combining hillshade, cast shadow and colour.

    Returns a float array shaped (h, w, 3) to be multiplied onto the base image.
    NaN elevation (no DEM coverage -- GSI has NoData over water) yields a
    neutral 1.0 so the sea is not tinted by absent terrain.

    The brightness/colour split is the fix described in the module docstring:

        brightness = ambient + directWeight * (dot * direct_ok)   <- facing matters
        tint       = mix(cool, warm, direct_ok)                   <- facing does NOT

    Tying tint to `dot` as well is what made flat sunlit ground read as shadow.
    """
    warm = np.asarray(lighting.get("warmTint", [1.22, 1.04, 0.70]), dtype=np.float32)
    cool = np.asarray(lighting.get("coolTint", [0.82, 0.90, 1.10]), dtype=np.float32)
    ambient = float(lighting.get("ambient", 0.30))
    direct_weight = float(lighting.get("directWeight", 0.70))

    valid = ~np.isnan(elevation)
    if not valid.any():
        return np.ones(elevation.shape + (3,), dtype=np.float32)

    # A dedicated filled copy for SHADING only. Routing must never use this --
    # see `routing_elevation` for why filling NaN at all is actively harmful
    # there.
    #
    # REGRESSION (found 2026-08-24, via the Milestone-0 productionisation e2e
    # check against the real 12 km Kurose frame): this used to fill with
    # `nanmean(elevation)`, inherited unchanged from the original spike.
    # GSI's NoData is concentrated at the coast (its own docs say so), so NaN
    # here is overwhelmingly OPEN SEA -- but the frame's nanmean is pulled up
    # by every mountain peak in view (measured 113.9 m on the real Kurose
    # frame, against a real elevation range of -11 to 715 m). The result is a
    # single fake, uniform, MOUNTAIN-HEIGHT plateau spanning the entire visible
    # ocean, and a flat plateau that size at a low 14 degree sun angle throws
    # and receives entirely fictitious shadows across real coastal features --
    # confirmed directly: Port Island read occluded=1.000 (fully shadowed)
    # under the mean fill and occluded=0.000 (correct, matches its real
    # unobstructed exposure) once filled with sea level instead.
    #
    # Sea level (0 m) is both the physically sensible default for "unknown,
    # probably water" and, just as importantly, FLAT -- a flat fill blends
    # into real near-0 m coastal elevation with no artificial wall, so it
    # can't manufacture a horizon that was never there.
    #
    # UNLESS `sea_mask` says a NaN cell is actually LAND, not sea -- see
    # fill_land_nan's own docstring for why flattening real (if undocumented)
    # land to sea level is a DIFFERENT bug from the mountain-plateau one
    # above, not a re-run of it.
    if sea_mask is not None:
        filled = fill_land_nan(elevation, sea_mask)
    else:
        filled = np.where(valid, elevation, 0.0).astype(np.float32)

    dx, dy, tan_alt = light_vector(azimuth_deg, altitude_deg, rotation_deg)
    occluded = horizon_shadow(filled, dx, dy, tan_alt, cell_size_m)
    if occlusion_blur_sigma > 0:
        occluded = np.clip(gaussian_blur(occluded, occlusion_blur_sigma), 0.0, 1.0)
    direct_ok = 1.0 - occluded

    altitude = math.radians(altitude_deg)
    nx, ny, nz = surface_normals(filled, cell_size_m)
    lx = -dx * math.cos(altitude)
    ly = -dy * math.cos(altitude)
    lz = math.sin(altitude)
    dot = np.clip(nx * lx + ny * ly + nz * lz, 0.0, 1.0)

    lit = dot * direct_ok
    brightness = ambient + direct_weight * lit

    tint = (cool[None, None, :] * (1.0 - direct_ok[..., None])
            + warm[None, None, :] * direct_ok[..., None])
    shade = np.clip(tint * brightness[..., None], 0.0, 2.0).astype(np.float32)
    return np.where(valid[..., None], shade, 1.0).astype(np.float32)


def cast_shadow_mul(elevation: np.ndarray, cell_size_m: float, azimuth_deg: float,
                    altitude_deg: float, rotation_deg: float, lighting: dict,
                    occlusion_blur_sigma: float = 1.4,
                    sea_mask: Optional[np.ndarray] = None) -> np.ndarray:
    """Neutral (colour-free) darkening multiplier for genuine CAST shadow only.

    **The brown-hillside bug (2026-08-24).** Buildings and roads used to be
    multiplied by the same `shade_rgb` array the bare ground uses, so that a
    building's shadow-facing wall would darken along with the terrain under
    it. But `shade_rgb` bakes brightness and warm/cool colour temperature
    together, and its brightness term responds to `dot` -- the Lambertian
    slope-facing angle, not just genuine occlusion. A whole hillside merely
    ORIENTED away from the sun (not actually shadowed by any ridge) reads as
    warm-tinted-but-dim under `shade_rgb`, which is correct and attractive for
    bare terrain but, multiplied onto every building and road across that
    entire slope, pulled them all toward the same dark warm/brown range,
    wiping out their own colours across areas that could span many blocks.
    It read as "everything becomes brown" rather than as a shadow.

    This function returns ONLY the horizon-occlusion term (`horizon_shadow` --
    a ridge throwing real shade into the valley behind it), with no facing
    term and no colour tint, mapped to a neutral grey multiplier. Buildings
    and roads darken where actual cast shadow falls across them -- the same
    "shadow over the top" the building-on-building Minkowski sweep already
    does for neighbour-cast shadow, just sourced from terrain -- and otherwise
    keep their own colour regardless of which way the ground beneath them
    faces. `shade_rgb` remains exactly as before for the ground/landuse
    layers, which is where the fuller hillshade+tint treatment belongs.
    """
    valid = ~np.isnan(elevation)
    if not valid.any():
        return np.ones(elevation.shape + (3,), dtype=np.float32)
    if sea_mask is not None:
        filled = fill_land_nan(elevation, sea_mask)
    else:
        filled = np.where(valid, elevation, 0.0).astype(np.float32)
    dx, dy, tan_alt = light_vector(azimuth_deg, altitude_deg, rotation_deg)
    occluded = horizon_shadow(filled, dx, dy, tan_alt, cell_size_m)
    if occlusion_blur_sigma > 0:
        occluded = np.clip(gaussian_blur(occluded, occlusion_blur_sigma), 0.0, 1.0)
    floor = float(lighting.get("castShadowFloor", 0.6))
    mul = (1.0 - occluded * (1.0 - floor)).astype(np.float32)
    neutral = np.repeat(mul[..., None], 3, axis=2)
    return np.where(valid[..., None], neutral, 1.0).astype(np.float32)


def canopy_noise_t(grid: int, extent_m: float, blob_m: float, seed: int) -> np.ndarray:
    """Smooth [0,1] noise for tinting vegetation canopy (forest/wood/scrub
    landuse -- see render.py's CANOPY_LANDUSE_KEYS), replacing what used to
    be one flat colour with a real texture. **The blocky-forest bug
    (2026-08-24, direct user report, with a screenshot showing hard-edged
    colour patches under otherwise-smooth contour lines).** OSM's forest
    polygon data in this region is itself coarse/simplified -- real source
    data, not a bug -- and a single flat tint over a coarse polygon reads as
    a blocky, low-resolution artifact next to the DEM's much finer contour
    detail. Colour variation breaks that up and, chosen from a real aerial
    photo of autumn forest near Kobe, incidentally looks more like an actual
    tree canopy than a flat wash ever could.

    Low-res random noise, bicubic-upsampled to the full field resolution --
    exactly render.py's sea-ripple technique, generalised to run at FRAME
    resolution once (like shade_rgb/cast_shadow_mul) rather than fresh per
    tile call: unlike the ripple, this must be seamless across the tiled
    export's tile boundaries, which a fresh-per-tile-call noise field is not.
    `res` is sized so each blob reads as a loose cluster of tree crowns
    (blob_m) rather than either a single-pixel speckle or a frame-wide
    gradient."""
    res = max(8, int(round(extent_m / max(1.0, blob_m))))
    rng = np.random.default_rng(seed)
    noise = rng.normal(0, 1, (res, res)).astype(np.float32)
    noise -= noise.min()
    noise /= max(1e-6, noise.max())
    img = Image.fromarray((noise * 255).astype(np.uint8)).resize((grid, grid), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0


def routing_elevation(elevation: np.ndarray) -> np.ndarray:
    """Elevation for the road router: NaN preserved as FORBIDDEN, never filled.

    The shading path fills NaN with the frame mean so hillshade stays smooth,
    which is harmless there. Doing the same for routing would be actively
    dangerous: GSI's NoData is concentrated *at the coast* (its own docs say so),
    so a mean fill puts a ~100 m plateau over the sea and rings the entire
    coastline with phantom cliffs. The router would then refuse legitimate
    shoreline routes and happily drive over water it thinks is a plateau.

    Callers must treat NaN as impassable rather than as any elevation at all.
    """
    return elevation.astype(np.float32, copy=True)


def slope_percent(elevation: np.ndarray, cell_size_m: float) -> np.ndarray:
    """Steepest-descent slope as a percentage, for grade checks."""
    dzdy, dzdx = np.gradient(elevation, cell_size_m)
    return np.hypot(dzdx, dzdy) * 100.0
