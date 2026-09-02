# -*- coding: utf-8 -*-
"""Fast local preview rendering for iterative structure design.

The whole point: design a compound by calling generator functions (see
citymap/editor/procgen/), building up a list of TemplateParts, and actually
LOOKING at what they render as -- via the real renderer (render_tile), at
real local terrain and real shadow direction, not flat colour swatches --
before ever spending the cost of a full-frame render or showing a half-
baked result to anyone. This exists because the first hand-typed compound
(directorate-command-citadel.json) was designed entirely blind -- coordinates
picked by arithmetic, never rendered until the final expensive pass -- and
the result was disappointing in a way that would have been obvious and
cheap to catch with a real preview at any point during design.

This is NOT a second renderer: render_tile itself is unchanged in what it
draws. What makes this fast enough to iterate with (measured ~45s -> ~1.4s
for an 800m preview against the real ~230k-feature Kurose world) is
render.py's own LOCAL_FEATURE_MARGIN_M feature-filtering and
_crop_elevation_for_tile fixes -- this module just wires a draft parts list
into a temporary Fields so render_tile has something to draw.

`raw_shapes`/`carve_sea` (added building the Vauban fort spike) generalise
this past TemplatePart's one-simple-ring footprint: a real fortification
needs mitred-band walls and polygon-with-hole moats/islands (see
procgen/shapes.py), and a structure that creates new land needs the REAL
sea polygon carved around it in this preview or the sea just paints back
over it -- confirmed directly, building that spike, that both gaps produce
a "wireframe floating on flat ground" result that looks nothing like the
final structure, not a subtle rendering difference."""

from __future__ import annotations

from dataclasses import replace
from typing import List, Optional, Tuple

from shapely import affinity as shapely_affinity

from .. import render as render_module
from ..ops import construct as construct_module
from ..parse import Feature
from .procgen.shapes import RawShape


def render_design_preview(
    parts: List[construct_module.TemplatePart], anchor_lonlat: Tuple[float, float],
    frame, style, fields, extent_m: float, mpp: float = 0.3, rotation_deg: float = 0.0,
    context_features: Optional[List[Feature]] = None, out_path: Optional[str] = None,
    raw_shapes: Optional[List[RawShape]] = None, carve_sea: bool = False,
):
    """Render `parts` (a draft compound, not yet a saved Template) at
    `anchor_lonlat`, using REAL local terrain/hillshade from `fields` (the
    already-resolved Fields for the real frame -- pass the same one
    render.py's CLI or the editor server already built/cached, not a fresh
    build) so the preview's shadows genuinely match what the final
    integrated render will show.

    `context_features`, when given, are drawn alongside the draft parts --
    real nearby buildings/roads/coastline for scale and placement judgment.
    Pass a subset of fields.features (e.g. filtered to the site's own
    drawn polygon), or fields.features itself for full real context (the
    common case for a structure meant to sit in a real, populated area or
    real open water) -- this function does not filter for you.

    `raw_shapes`: RawShape entries (see procgen/shapes.py) for geometry too
    complex for TemplatePart's one-simple-ring footprint -- built in LOCAL
    coordinates same as `parts`, rotated/translated into map space the
    identical way.

    `carve_sea`: when True, subtracts the union of every `raw_shapes`
    geometry from any real `__sea__`-tagged feature found in
    `context_features` before rendering -- for a structure that creates its
    own new land (an island fort, a platform), without this the real sea
    polygon (which has no idea the new land exists) paints directly back
    over it. This is an in-memory-only carve for THIS preview, matching
    citymap.tools.reclaim.generate_reclaim's own real carve
    (`current_sea_geom.difference(outline)`) but without writing anything
    to the store -- exactly the gap between "preview a design" and "commit
    it for real."

    Returns the rendered PIL Image; also saves to `out_path` if given.
    """
    anchor_map = frame.lonlat_to_map(*anchor_lonlat)
    draft_template = construct_module.Template(
        id="draft-preview", name="draft", parts=parts,
        frontage_point=(0.0, 0.0), frontage_direction=(0.0, -1.0),
    )
    parts_map = construct_module._instantiate_parts_map_space(
        draft_template, anchor_map, rotation_deg, "draft-preview")

    draft_features = [
        Feature(id=feature_id, geom=geom_map, tags=dict(part.tags),
               area=(part.kind != "line"), height_m=part.height_m, source="draft")
        for geom_map, part, feature_id in parts_map
    ]

    raw_geoms_map = []
    for i, shape in enumerate(raw_shapes or []):
        geom_map = shapely_affinity.translate(
            shapely_affinity.rotate(shape.geometry, rotation_deg, origin=(0, 0)),
            xoff=anchor_map[0], yoff=anchor_map[1])
        raw_geoms_map.append(geom_map)
        draft_features.append(Feature(id=f"draft-preview:raw{i}", geom=geom_map, tags=dict(shape.tags),
                                      area=True, height_m=shape.height_m, source="draft"))

    base_features = list(context_features or [])
    if carve_sea and raw_geoms_map:
        from shapely.ops import unary_union
        carve_with = unary_union(raw_geoms_map).buffer(2.0)
        base_features = [
            replace(f, geom=f.geom.difference(carve_with)) if f.tags.get("__sea__") == "true" else f
            for f in base_features
        ]

    preview_fields = replace(fields, features=base_features + draft_features)

    tile = frame.window_tile(anchor_lonlat[0], anchor_lonlat[1], extent_m, mpp)
    img = render_module.render_tile(preview_fields, style, tile)
    if out_path:
        img.save(out_path)
    return img
