"""The land grid export (tools/location-sync/export_land_grid.py): the painted map's water as the small static file Foundry reads."""

import json
import os
import sys
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO = os.path.abspath(os.path.join(_HERE, "..", ".."))
sys.path.insert(0, os.path.join(_REPO, "tools", "location-sync"))

import export_land_grid as eg  # noqa: E402


MASK = {"cols": 4, "rows": 2, "step": 25, "origin": [212.5, 212.5], "runs": [[0, 3], [1, 2], [0, 3]]}


class Document(unittest.TestCase):
    def test_a_mask_becomes_the_versioned_document_the_reader_expects(self):
        doc = eg.document(MASK)
        self.assertEqual((doc["kind"], doc["version"], doc["cols"], doc["rows"], doc["step"]), ("land-grid", 1, 4, 2, 25))
        self.assertEqual(doc["origin"], [212.5, 212.5])
        self.assertEqual(doc["runs"], [[0, 3], [1, 2], [0, 3]])
        self.assertEqual(doc["$schema"], "../schema/land-grid.schema.json")

    def test_runs_that_do_not_fill_the_grid_are_refused(self):
        bad = dict(MASK, runs=[[0, 3]])
        with self.assertRaises(ValueError):
            eg.document(bad)

    def test_the_water_fraction_and_the_bytes_are_deterministic(self):
        doc = eg.document(MASK)
        self.assertAlmostEqual(eg.water_fraction(doc), 2 / 8.0)
        self.assertEqual(eg.serialise(doc), eg.serialise(eg.document(MASK)))
        json.loads(eg.serialise(doc))


class TheShippedFile(unittest.TestCase):
    def test_it_is_the_version_the_editor_reads_and_is_current(self):
        path = os.path.join(_REPO, "data", "map", "land-grid.json")
        if not os.path.exists(path):
            self.skipTest("data/map/land-grid.json has not been exported")
        with open(path, encoding="utf-8") as fh:
            doc = json.load(fh)
        self.assertEqual((doc["kind"], doc["version"]), ("land-grid", eg.VERSION))
        self.assertEqual(sum(n for _, n in doc["runs"]), doc["cols"] * doc["rows"])


if __name__ == "__main__":
    unittest.main()
