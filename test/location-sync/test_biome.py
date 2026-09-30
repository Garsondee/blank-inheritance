"""What a token standing in this grid cell is standing on.

See tools/gazetteer/core/biome.py's own docstring for the priority order this
tests: hand override, then a district's own declared kind, then real
measurement, then the shore band as a final adjustment.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

from core import biome  # noqa: E402


class TestPriorityOrder(unittest.TestCase):

    def test_an_explicit_override_wins_over_everything_else(self):
        result = biome.classify_cell(
            override="dense-urban", is_water=True, shore=True, district_kind="water")
        self.assertEqual(result, "dense-urban")

    def test_a_water_district_reads_as_ocean_regardless_of_measurement(self):
        result = biome.classify_cell(district_kind="water", building_coverage=0.9,
                                     mean_building_height_m=50.0)
        self.assertEqual(result, "ocean")

    def test_a_military_district_reads_as_industrial_regardless_of_measurement(self):
        result = biome.classify_cell(district_kind="military", building_coverage=0.01)
        self.assertEqual(result, "industrial")

    def test_an_ordinary_district_kind_carries_no_opinion(self):
        # "district" is the default kind and is deliberately absent from
        # DISTRICT_KIND_BIOME -- it must fall through to measurement, not
        # silently match nothing and default to some other biome by accident.
        result = biome.classify_cell(district_kind="district", building_coverage=0.5,
                                     mean_building_height_m=20.0)
        self.assertEqual(result, "dense-urban")

    def test_shore_overrides_a_districts_declared_kind(self):
        # A coastal fort's own wall is still fort ground, but the cell right
        # at the waterline is what a token actually gets wet standing in.
        result = biome.classify_cell(district_kind="military", shore=True)
        self.assertEqual(result, "shore")

    def test_shore_does_not_override_an_explicit_hand_override(self):
        result = biome.classify_cell(override="industrial", shore=True)
        self.assertEqual(result, "industrial")

    def test_shore_overrides_plain_ocean(self):
        result = biome.classify_cell(is_water=True, shore=True)
        self.assertEqual(result, "shore")


class TestAutomaticLandClassification(unittest.TestCase):

    def test_open_water_with_no_district_is_ocean(self):
        self.assertEqual(biome.classify_cell(is_water=True), "ocean")

    def test_heavy_industrial_footprint_wins_before_the_urban_split(self):
        # High building coverage AND tall would otherwise read dense-urban --
        # industrial is checked first so a real shipyard does not get
        # mistaken for a shopping district just because it is built up.
        result = biome.classify_cell(industry_coverage=0.5, building_coverage=0.6,
                                     mean_building_height_m=15.0)
        self.assertEqual(result, "industrial")

    def test_dense_coverage_and_height_together_read_dense_urban(self):
        result = biome.classify_cell(building_coverage=0.4, mean_building_height_m=15.0)
        self.assertEqual(result, "dense-urban")

    def test_dense_coverage_alone_without_height_does_not_read_dense_urban(self):
        # A cell entirely covered by low single-storey sheds is not "the
        # middle of dense structures" the way a real high-rise block is,
        # even at the same footprint coverage.
        result = biome.classify_cell(building_coverage=0.4, mean_building_height_m=3.0)
        self.assertEqual(result, "residential")

    def test_a_real_commercial_strip_reads_dense_urban_even_if_short(self):
        result = biome.classify_cell(commerce_coverage=0.2, building_coverage=0.1,
                                     mean_building_height_m=4.0)
        self.assertEqual(result, "dense-urban")

    def test_moderate_building_coverage_is_residential(self):
        result = biome.classify_cell(building_coverage=0.15, mean_building_height_m=6.0)
        self.assertEqual(result, "residential")

    def test_a_speck_of_building_below_the_floor_does_not_count_as_built_up(self):
        result = biome.classify_cell(building_coverage=0.02)
        self.assertEqual(result, "residential")  # falls through to the honest default

    def test_dense_forest_reads_upland(self):
        result = biome.classify_cell(forest_coverage=0.6)
        self.assertEqual(result, "upland")

    def test_forest_tied_with_other_green_still_reads_upland(self):
        result = biome.classify_cell(forest_coverage=0.4, green_coverage=0.4)
        self.assertEqual(result, "upland")

    def test_farmland_and_grass_without_forest_reads_open_ground(self):
        result = biome.classify_cell(green_coverage=0.5, forest_coverage=0.05)
        self.assertEqual(result, "open-ground")

    def test_green_below_forest_share_reads_upland_not_open_ground(self):
        result = biome.classify_cell(forest_coverage=0.35, green_coverage=0.1)
        self.assertEqual(result, "upland")

    def test_nothing_measured_strongly_defaults_to_residential_not_open_ground(self):
        # The honest default for a real city's under-tagged cells -- most of
        # them are an ordinary street, not a field, even where OSM's own
        # tagging has a gap.
        result = biome.classify_cell()
        self.assertEqual(result, "residential")


class TestTaxonomy(unittest.TestCase):

    def test_every_biome_constant_is_a_real_bucket(self):
        for name in biome.DISTRICT_KIND_BIOME.values():
            self.assertIn(name, biome.BIOMES)

    def test_classify_cell_never_returns_something_outside_the_taxonomy(self):
        # A broad sweep, not exhaustive -- catches a typo'd biome string
        # anywhere in the decision tree, which a handful of hand-picked
        # cases could miss if the typo were in an untested branch.
        import itertools
        coverages = (0.0, 0.05, 0.1, 0.2, 0.4, 0.6, 1.0)
        for bc, cc, ic, fc, gc in itertools.product(coverages, repeat=5):
            for is_water in (True, False):
                for shore in (True, False):
                    for kind in (None, "district", "water", "military"):
                        result = biome.classify_cell(
                            is_water=is_water, shore=shore, district_kind=kind,
                            building_coverage=bc, commerce_coverage=cc,
                            industry_coverage=ic, forest_coverage=fc, green_coverage=gc)
                        self.assertIn(result, biome.BIOMES)


if __name__ == "__main__":
    unittest.main()
