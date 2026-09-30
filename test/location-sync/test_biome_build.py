"""The biome orchestration layer: real measurement, overrides, and the cache.

See tools/gazetteer/biome.py's own docstring for the layering this tests
(hand override > district kind > real measurement) and test_biome.py for the
pure decision logic these measurements feed into.

The full build() pass needs the 120 MB GeoPackage and is skipped loudly
without it, per design/testing-strategy.md rule 5 -- matching test_server.py
and test_landmask.py's own gate. Everything that does not touch the
GeoPackage (the override file, the district-kind reverse index) is tested
unconditionally.
"""

import json
import os
import shutil
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "location-sync"))

import biome as biome_build  # noqa: E402
from core import groundtruth  # noqa: E402


class TestOverridesFile(unittest.TestCase):

    def test_a_missing_file_is_a_valid_empty_document(self):
        doc = biome_build.load_overrides("/no/such/path.json")
        self.assertEqual(doc["overrides"], [])
        self.assertEqual(doc["id"], "biome-overrides")

    def test_save_then_load_round_trips(self):
        tmp = tempfile.mkdtemp()
        try:
            path = os.path.join(tmp, "sub", "biome-overrides.json")
            doc = biome_build.empty_overrides()
            doc["overrides"].append({"ref": "C4.11", "biome": "dense-urban", "note": "test"})
            biome_build.save_overrides(doc, path)
            reloaded = biome_build.load_overrides(path)
            self.assertEqual(reloaded["overrides"][0]["ref"], "C4.11")
            self.assertEqual(reloaded["overrides"][0]["biome"], "dense-urban")
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class TestDistrictKindByCell(unittest.TestCase):

    def setUp(self):
        self.tmp = tempfile.mkdtemp()

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def _write_location(self, name, tier, kind, cells):
        doc = {"id": name, "tier": tier, "kind": kind, "derived": {"cells": cells}}
        with open(os.path.join(self.tmp, name + ".json"), "w", encoding="utf-8") as fh:
            json.dump(doc, fh)

    def test_a_regions_cells_all_map_to_its_own_kind(self):
        self._write_location("open-sea", "region", "water", ["C4.11", "C4.12"])
        by_cell = biome_build._district_kind_by_cell(self.tmp)
        self.assertEqual(by_cell["C4.11"], "water")
        self.assertEqual(by_cell["C4.12"], "water")

    def test_a_site_is_not_a_district_and_is_ignored(self):
        self._write_location("some-building", "site", "residential", ["C4.11"])
        by_cell = biome_build._district_kind_by_cell(self.tmp)
        self.assertNotIn("C4.11", by_cell)

    def test_a_missing_directory_is_an_empty_index_not_an_error(self):
        self.assertEqual(biome_build._district_kind_by_cell("/no/such/dir"), {})

    def test_cells_outside_any_region_are_absent_not_none(self):
        self._write_location("open-sea", "region", "water", ["C4.11"])
        by_cell = biome_build._district_kind_by_cell(self.tmp)
        self.assertNotIn("Z9.99", by_cell)


@unittest.skipUnless(groundtruth.store_exists(),
                     "needs data/map/kurose.gpkg (120 MB, not in a fresh clone)")
class TestBuildAgainstRealData(unittest.TestCase):
    """A light real-data smoke test, not a full 3,600-cell build (see
    tools/gazetteer/biome.py's own note on why that pass is not fast) --
    this exercises the actual measurement path against real geometry and
    confirms it produces something in the real taxonomy, not that any
    particular cell gets any particular answer."""

    def test_measuring_one_real_cell_produces_a_valid_biome(self):
        import landmask as landmask_mod
        from core import biome as biome_core
        from core.georef import MapGeoref

        georef = MapGeoref.load()
        conn = groundtruth.open_store()
        _, land, water = landmask_mod.load()
        # Sannomiya-area cell: dense, real, and already used as the "densest
        # ground truth on the sheet" fixture elsewhere in this test suite
        # (test_server.py's own DENSE_PX constant), so this is not a blind
        # guess at a cell that happens to have any data in it at all.
        col, row = 22, 25
        measured = biome_build._measure_cell(conn, georef, land, water, col, row)
        result = biome_core.classify_cell(**measured)
        self.assertIn(result, biome_core.BIOMES)

    def test_a_real_water_cell_measures_as_water(self):
        import landmask as landmask_mod
        from core.georef import MapGeoref

        georef = MapGeoref.load()
        conn = groundtruth.open_store()
        _, land, water = landmask_mod.load()
        # The Open Sea region's own real, current centroid (data/locations/
        # open-sea.json's derived.centroidPx) -- well clear of any
        # coastline, and read from the actual promoted file rather than
        # remembered, since this session's own coastline work already moved
        # that shape more than once.
        col, row = int((8843 - georef.border_px) / georef.cell_px), \
            int((10150 - georef.border_px) / georef.cell_px)
        measured = biome_build._measure_cell(conn, georef, land, water, col, row)
        self.assertTrue(measured["is_water"])

    def test_a_real_forest_cell_measures_real_forest_coverage(self):
        # Regression guard for a real bug: the store's own `is_area` column
        # is unset (None) throughout, and _measure_cell used to filter on
        # it directly -- silently discarding every polygon feature in the
        # GeoPackage, area features included, and reading every land cell
        # on the whole sheet as having zero of everything. Found by
        # measuring this exact cell (inside The Upper Catchment, a real
        # promoted ridge district) and getting back all zeroes despite two
        # multi-million-square-metre forest polygons sitting in it.
        import landmask as landmask_mod
        from core.georef import MapGeoref

        georef = MapGeoref.load()
        conn = groundtruth.open_store()
        _, land, water = landmask_mod.load()
        col = int((1697 - georef.border_px) / georef.cell_px)
        row = int((7344 - georef.border_px) / georef.cell_px)
        measured = biome_build._measure_cell(conn, georef, land, water, col, row)
        self.assertGreater(measured["forest_coverage"], 0.3,
                           "a cell inside a real forest polygon measured near-zero "
                           "forest coverage -- is_area filtering may have regressed")


if __name__ == "__main__":
    unittest.main()
