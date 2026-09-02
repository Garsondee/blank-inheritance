"""Style loading, and the metres-not-pixels rule.

design/map-generation.md §7: "Style lives in a data file, not in code, so it can
be tuned without a rebuild." This module is that file's loader.

**Every linear dimension is in ground metres, and the loader enforces it.**
That is not a stylistic preference, it is what makes a preview honest. Stroke
widths are converted to pixels at draw time by dividing by the tile's
metres-per-pixel, so:

  - at the delivered 0.586 m/px, a 0.6 m contour line is ~1 px;
  - at a 2 m/px composition check, the same line is still 0.6 m of ground.

The old spike had roads right (`ROAD[hw] / mpp`) and everything else wrong:
contour widths were literal pixels (1.6 and 1.0), building outlines were 1 px,
and the hatch spacing was the tell-tale hybrid `max(6, int(14 / mpp))`. Because
roads scaled and the rest did not, the ink hierarchy shifted by ~1.7x between a
preview and the final render -- so any weight tuned in preview was tuned against
a picture that does not exist at delivery. Hence the `M` suffix convention
(matching the ops vocabulary in §6: `radiusM`, `depthM`, `toElevationM`) and the
`_assert_no_pixel_dimensions` check on load.

Colours are plain [r, g, b] 0-255 triples; they have no unit problem.
"""

from __future__ import annotations

import json
import os
from typing import Dict, Tuple

STAGE_CODE_VERSION = 1

# Sections whose leaf numbers are linear ground dimensions and must therefore
# carry the `M` suffix. Anything outside these is not dimension-checked
# (opacities, gammas, counts, colour triples).
#
# `pageFurniture` is deliberately absent: the cartouche, border, compass rose
# and scale bar are properties of the SHEET, not of the ground. A cartouche
# sized in ground metres would be invisible on a wide composition check and
# absurdly huge in a 200 m preview window. Those stay page-relative and are
# only drawn on a full-page render.
_DIMENSION_SECTIONS = ("widths", "roads", "shadow", "texture", "labels")

# Suffixes marking a value that is genuinely dimensionless -- a ratio, a
# multiplier, an alpha, an exponent. These are exempt from the metre rule
# because they have no unit to get wrong, and forcing them into a separate
# section would split naturally-related settings apart (a shadow's length
# scale belongs beside its blur radius).
_DIMENSIONLESS_SUFFIXES = ("Scale", "Ratio", "Alpha", "Gamma", "Amount",
                           "Weight", "Count", "Px")


class StyleError(ValueError):
    pass


class Style:
    """A loaded style sheet. Widths in metres; `px()` converts for a tile."""

    def __init__(self, raw: dict):
        self.id = raw.get("id", "unnamed")
        self.name = raw.get("name", self.id)
        self._raw = raw
        self.palette: Dict[str, Tuple[int, int, int]] = {
            k: tuple(v) for k, v in raw.get("palette", {}).items()
        }
        self.landuse: Dict[str, Tuple[int, int, int]] = {
            k: tuple(v) for k, v in raw.get("landuse", {}).items()
        }
        self.building_material: Dict[str, Tuple[int, int, int]] = {
            k: tuple(v) for k, v in raw.get("buildingMaterial", {}).items()
        }
        self._building_roof_palette_raw = [tuple(c) for c in raw.get("buildingRoofPalette", [])]
        self.widths: Dict[str, float] = dict(raw.get("widths", {}))
        self.roads: Dict[str, float] = dict(raw.get("roads", {}))
        self.shadow: Dict[str, float] = dict(raw.get("shadow", {}))
        self.texture: Dict[str, float] = dict(raw.get("texture", {}))
        self.labels: Dict[str, float] = dict(raw.get("labels", {}))
        self.page_furniture: Dict[str, float] = dict(raw.get("pageFurniture", {}))
        # Deliberately NOT in _DIMENSION_SECTIONS: its one real ground-metre
        # value (seaDepthFalloffM) is a smooth-falloff distance, never a
        # pixel-vs-metre stroke width, so it doesn't carry the preview-lying
        # risk the metre rule exists to catch. Everything else here is a
        # colour tint, a 0-1 blend weight, or an exponent -- no unit to get
        # wrong. Enforcing the M-suffix rule on it would only force renaming
        # `ambient` into something like `ambientRatio` for no real benefit.
        self.lighting: Dict[str, object] = dict(raw.get("lighting", {}))
        # Deliberately NOT in _DIMENSION_SECTIONS, same reasoning as lighting
        # above: blobM (its one real ground dimension) still carries the M
        # suffix as a naming convention, but "seed" (an integer, no natural
        # M/dimensionless suffix) would otherwise trip the checker for no
        # real benefit -- see canopy_colour()/terrain.canopy_noise_t.
        self.canopy: Dict[str, object] = dict(raw.get("canopy", {}))
        self.hatch_landuse = list(raw.get("hatchLanduse", []))
        _assert_no_pixel_dimensions(raw)

    # --- loading ---------------------------------------------------------

    @classmethod
    def from_file(cls, path: str) -> "Style":
        with open(path, encoding="utf-8") as fh:
            return cls(json.load(fh))

    # --- colour ----------------------------------------------------------

    def colour(self, key: str) -> Tuple[int, int, int]:
        try:
            return self.palette[key]
        except KeyError:
            raise StyleError(
                f"style {self.id!r} has no palette entry {key!r}; "
                f"known: {sorted(self.palette)}"
            ) from None

    def landuse_colour(self, key: str):
        """None rather than raising -- an unstyled landuse class is just untinted."""
        return self.landuse.get(key)

    def material_colour(self, key: str):
        """None rather than raising -- a building with no building:material
        tag (or an unrecognised one) just falls back to the plain
        height-graded fill (buildingLow/buildingHigh), same as before the
        Scratchpad's Fill tool existed. See render_tile's building-fill
        section and editor/static/scratchpad.js's MATERIAL_STYLES."""
        return self.building_material.get(key) if key else None

    def building_roof_palette(self):
        """Ordered [r,g,b] roof-colour choices for buildings with no
        building:material tag -- render_tile hashes each building's own
        feature id into this list (render._building_roof_colour) so a real
        Kobe-style mix of roof colours shows up automatically, deterministic
        per building (same id -> same colour every render) rather than one
        uniform low/high height gradient for the whole map. Loosely sampled
        from real Kobe/Kanazawa rooftop aerial photos. Falls back to a
        built-in default so a style file with no buildingRoofPalette still
        renders, just without the variety."""
        if not self._building_roof_palette_raw:
            return [(132, 146, 162), (88, 92, 98), (162, 100, 78), (110, 148, 152),
                   (198, 188, 168), (176, 118, 72), (108, 126, 110)]
        return self._building_roof_palette_raw

    def canopy_palette(self):
        """Ordered [r,g,b] stops for canopy noise tinting, falling back to a
        muted green->olive->amber ramp (loosely matched from a real autumn
        Kobe forest reference photo) if the style file doesn't define one --
        a style sheet with no canopy section still renders, just without the
        texture, rather than raising."""
        raw = self.canopy.get("palette")
        if not raw:
            return [(148, 172, 132), (176, 188, 148), (196, 182, 128), (192, 150, 104)]
        return [tuple(c) for c in raw]

    def canopy_blob_m(self) -> float:
        return float(self.canopy.get("blobM", 45.0))

    def canopy_gamma(self) -> float:
        return float(self.canopy.get("gamma", 2.0))

    def canopy_seed(self) -> int:
        return int(self.canopy.get("seed", 8412))

    # --- dimensions ------------------------------------------------------

    def metres(self, section: str, key: str) -> float:
        """The raw ground-metre value for a dimension."""
        table = getattr(self, section, None)
        if table is None:
            raise StyleError(f"no style section {section!r}")
        name = key if key.endswith("M") else f"{key}M"
        try:
            return float(table[name])
        except KeyError:
            raise StyleError(
                f"style {self.id!r} section {section!r} has no {name!r}; "
                f"known: {sorted(table)}"
            ) from None

    def px(self, section: str, key: str, mpp: float, minimum: float = 1.0) -> float:
        """Convert a ground-metre dimension to pixels at this tile's scale.

        `minimum` keeps hairlines visible when zoomed out -- a 0.6 m contour at
        4 m/px would otherwise round to 0 px and vanish entirely. This clamp is
        the one deliberate exception to pure metre scaling, and it only ever
        makes a line thicker, never thinner.
        """
        return max(minimum, self.metres(section, key) / mpp)

    def road_width_px(self, highway_class: str, mpp: float) -> float:
        """Carriageway width in pixels, or 0 if this class is not drawn."""
        name = f"{highway_class}M"
        if name not in self.roads:
            return 0.0
        return max(1.0, float(self.roads[name]) / mpp)

    def knows_road(self, highway_class: str) -> bool:
        return f"{highway_class}M" in self.roads

    def road_classes(self):
        return [k[:-1] for k in self.roads if k.endswith("M")]


def _assert_no_pixel_dimensions(raw: dict) -> None:
    """Fail loudly if a dimension section carries a unit-less number.

    A style file is hand-tuned, so this is exactly the kind of mistake that
    gets made at 2am and then silently produces an ink hierarchy that only
    exists at one zoom level.
    """
    offenders = []
    for section in _DIMENSION_SECTIONS:
        for key, value in (raw.get(section) or {}).items():
            if not isinstance(value, (int, float)) or isinstance(value, bool):
                continue
            if key.endswith("M") or key.endswith(_DIMENSIONLESS_SUFFIXES):
                continue
            offenders.append(f"{section}.{key}")
    if offenders:
        raise StyleError(
            "style dimensions must be in ground metres with an 'M' suffix, or "
            "explicitly dimensionless with one of "
            f"{_DIMENSIONLESS_SUFFIXES} (see module docstring -- pixel "
            "dimensions make previews lie about ink weight). "
            f"Offending keys: {', '.join(sorted(offenders))}"
        )


def default_style_path(repo_root: str) -> str:
    return os.path.join(repo_root, "data", "map", "style", "kurose-1950s.json")
