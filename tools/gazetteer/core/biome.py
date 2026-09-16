"""What a token standing in this grid cell is actually standing on.

Ingram, 2026-09-12 survey: Foundry needs to tell ocean from shore from dense
structures from residential streets when something enters a space, and asked
specifically whether real data can be mixed with the places this campaign has
changed the world. It can, using the exact pattern already proven in this
codebase for buildings (core/overrides.py): real data is the base layer, an
authored district's own declared character overrides it where one has been
drawn, and a small hand-written file overrides everything for the genuine
exceptions neither of those gets right.

This module is the DECISION only -- pure, no gpkg, no shapely, no I/O. The
per-cell measurements (how much of a cell is building footprint, how tall,
how much is forest, whether it touches water) are gathered by biome.py one
directory up, which queries the real GeoPackage and landmask.py's painted-map
water/land the same way tools/gazetteer/server.py already does for features
and clipping. Splitting it this way means the taxonomy and its thresholds --
the part actually worth arguing about -- can be tested in isolation from the
part that is just plumbing.

Explicitly NOT the terrain/movement/LOS system the original Gazetteer plan
put out of scope, and not a second one either -- core/groundtruth.py's own
`classify()` already says as much about its coarser bucket for the same
reason. This is coarser still: one label per 200m cell, meant to answer
"what does this look like," not "how much does it cost to cross" or "does it
block a sightline." Those are real, harder questions for whenever Foundry
integration actually needs them, and guessing at the answer now would only
have to be redone once it does.
"""

from __future__ import annotations

#: In no particular priority order; classify_cell decides which applies.
BIOMES = ("ocean", "shore", "dense-urban", "residential", "industrial",
         "open-ground", "upland")

#: A promoted district's own `kind` maps straight to a biome, no measurement
#: needed -- the district is authored, canonical truth for its own ground.
#: "district" (the ordinary default) is deliberately absent: it carries no
#: opinion, so classification falls through to the automatic rules below.
DISTRICT_KIND_BIOME = {
    "water": "ocean",
    "military": "industrial",
}

#: Real industrial/quarry/depot footprint share at or above which a cell
#: reads INDUSTRIAL outright. Checked as a hard threshold rather than by
#: comparison to the other shares: a real industrial landuse tag is a
#: strong, deliberate, authoritative signal even where individual buildings
#: inside that zone carry no tag of their own and so show up as plain
#: "building" coverage instead -- a shipyard's own office block should not
#: out-vote the shipyard.
INDUSTRY_COVERAGE = 0.10
#: Building coverage share at or above which a cell reads DENSE_URBAN by
#: footprint alone, regardless of height -- a real high-density block
#: genuinely covers half or more of its own ground. Also a hard threshold,
#: for the same reason as INDUSTRY_COVERAGE above.
DENSE_COVERAGE = 0.50
#: A lower coverage bar clears DENSE_URBAN too if the buildings are also
#: tall. Mean height uses real height_m, which the store defaults where a
#: building has no real figure (see groundtruth's own note on that) -- a
#: coverage floor here still keeps a single tall outlier from deciding an
#: otherwise-open cell.
DENSE_HEIGHT_COVERAGE = 0.15
DENSE_HEIGHT_M = 12.0
#: A cell with real commercial/retail footprint at or above this share reads
#: as dense-urban outright -- a shopping street is "the middle of dense
#: structures" even where the buildings themselves are not especially tall.
COMMERCE_COVERAGE = 0.15
#: Below this share, nothing among {building, forest, other green} was
#: measured strongly enough to say anything -- residential, the honest
#: default for a real city's under-tagged cells (see classify_cell's own
#: note), not a field.
MIN_MEASURED_SHARE = 0.03


def classify_cell(*, is_water=False, shore=False, district_kind=None, override=None,
                  building_coverage=0.0, mean_building_height_m=0.0,
                  commerce_coverage=0.0, industry_coverage=0.0,
                  forest_coverage=0.0, green_coverage=0.0):
    """One of BIOMES for a single 200m cell.

    Priority, highest first: an explicit hand override always wins outright
    -- that is the whole point of one. Next, a promoted district's own
    declared kind, where DISTRICT_KIND_BIOME has an opinion. Then real
    measurement: industrial and dense-urban are checked as hard thresholds
    first, because a real industrial or commercial landuse tag is a strong,
    deliberate, authoritative signal worth trusting outright when present.
    Only once neither applies does building coverage have to WIN a
    comparison against forest and other green coverage, rather than clear a
    low bar of its own -- found live against the real map: an earlier
    version let any building coverage above a small fixed threshold beat
    forest/green regardless of how much of each there actually was, so a
    single scattered farmhouse's 8% footprint made an entire forested ridge
    district read as residential. Shore is checked last of all and can
    override even a district's declared kind (a coastal fort is still fort
    ground, but a token stepping off its own wall onto wet sand is standing
    on shore, not standing on "industrial") -- but never an explicit hand
    override, which exists precisely for the cells where that general rule
    is wrong.
    """
    if override:
        return override

    if district_kind in DISTRICT_KIND_BIOME:
        biome = DISTRICT_KIND_BIOME[district_kind]
    elif is_water:
        biome = "ocean"
    elif industry_coverage >= INDUSTRY_COVERAGE:
        biome = "industrial"
    elif (commerce_coverage >= COMMERCE_COVERAGE or building_coverage >= DENSE_COVERAGE
          or (building_coverage >= DENSE_HEIGHT_COVERAGE and mean_building_height_m >= DENSE_HEIGHT_M)):
        biome = "dense-urban"
    else:
        contested = {"residential": building_coverage, "upland": forest_coverage,
                    "open-ground": green_coverage}
        dominant, top_share = max(contested.items(), key=lambda kv: kv[1])
        biome = dominant if top_share >= MIN_MEASURED_SHARE else "residential"

    if shore:
        biome = "shore"
    return biome
