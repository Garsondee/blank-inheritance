"""Tests for tools/handouts/build_paper_assets.py.

Python stdlib unittest, run separately from `npm test` (which stays Node-only):

    python -m unittest discover -s test/handouts -t test/handouts

What matters: the builder finds its sources through the asset registry (so a
moved original breaks here, loudly, instead of at the table as an empty frame),
never enlarges an image, and writes exactly the names the handout bodies point
at. test/tier3-handouts-contract.test.mjs checks the other half: that every
image a handout body references is actually in the module.
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "tools", "handouts")))

import build_paper_assets as builder  # noqa: E402


class TestFit(unittest.TestCase):
    def test_scales_the_longest_edge_down(self):
        self.assertEqual(builder.fit((2048, 2048), 224), (224, 224))
        self.assertEqual(builder.fit((2000, 1000), 400), (400, 200))

    def test_never_scales_up(self):
        self.assertEqual(builder.fit((100, 50), 400), (100, 50))


class TestRegistry(unittest.TestCase):
    def test_every_output_has_a_registered_source(self):
        paths = builder.registry_paths()
        self.assertEqual(set(paths), set(builder.OUTPUTS))
        for asset_id, rel in paths.items():
            self.assertTrue(rel.startswith("artwork/"), f"{asset_id} is registered outside artwork/: {rel}")

    def test_output_names_are_distinct_webps(self):
        names = [name for name, _edge in builder.OUTPUTS.values()]
        self.assertEqual(len(names), len(set(names)), "two registry ids would overwrite one file")
        for name in names:
            self.assertTrue(name.endswith(".webp"), name)

    def test_the_committed_outputs_exist_in_the_module(self):
        for name, _edge in builder.OUTPUTS.values():
            self.assertTrue(os.path.exists(os.path.join(builder.OUT_DIR, name)), f"{name} is missing from the module")


class TestBuild(unittest.TestCase):
    def test_check_mode_writes_nothing(self):
        with tempfile.TemporaryDirectory() as out:
            report = builder.build(check_only=True, out_dir=out)
            self.assertEqual(os.listdir(out), [])
            self.assertEqual(len(report), len(builder.OUTPUTS))

    def test_a_real_build_writes_each_output_at_its_edge(self):
        sources = builder.registry_paths()
        if not all(os.path.exists(os.path.join(builder.REPO_ROOT, p)) for p in sources.values()):
            self.skipTest("artwork/ originals are gitignored and absent here; the committed WebPs stand")
        from PIL import Image

        with tempfile.TemporaryDirectory() as out:
            builder.build(out_dir=out)
            for name, edge in builder.OUTPUTS.values():
                with Image.open(os.path.join(out, name)) as image:
                    self.assertEqual(max(image.size), edge, name)
                    self.assertEqual(image.mode, "RGBA", f"{name} lost its transparency")


if __name__ == "__main__":
    unittest.main()
