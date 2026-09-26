"""Tests for tools/casting/contact_sheet.py.

Python stdlib unittest, run separately from `npm test` (which stays Node-only):

    python -m unittest discover -s test/casting -t test/casting
"""

import json
import os
import sys
import tempfile
import unittest

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "casting"))

import contact_sheet  # noqa: E402


def write_png(path, size=(64, 96), colour=(120, 80, 60)):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.new("RGB", size, colour).save(path)
    return path


class BuildSheetTests(unittest.TestCase):
    def test_tiles_into_the_expected_grid(self):
        with tempfile.TemporaryDirectory() as tmp:
            entries = [(write_png(os.path.join(tmp, f"{i}.png")), f"{i}") for i in range(7)]
            sheet = contact_sheet.build_sheet(entries, cols=3, cell=50)
            # 3 columns, so 7 entries need 3 rows.
            self.assertEqual(sheet.size[0], 12 + 3 * (50 + 12))
            self.assertEqual(sheet.size[1], 12 + 3 * (50 + 34 + 12))

    def test_empty_input_raises_rather_than_making_a_zero_sized_image(self):
        with self.assertRaises(ValueError):
            contact_sheet.build_sheet([], cols=4)

    def test_an_unreadable_file_leaves_a_hole_instead_of_aborting_the_sheet(self):
        with tempfile.TemporaryDirectory() as tmp:
            good = write_png(os.path.join(tmp, "good.png"))
            bad = os.path.join(tmp, "bad.png")
            with open(bad, "w", encoding="utf-8") as handle:
                handle.write("not an image")
            sheet = contact_sheet.build_sheet([(good, "a"), (bad, "b")], cols=2, cell=40)
            self.assertEqual(sheet.size[0], 12 + 2 * (40 + 12))

    def test_fit_crops_from_the_top_because_a_portrait_subject_is_its_face(self):
        # A 100x300 portrait: the square crop is 100 tall, so anchoring at the
        # top takes exactly the red band and none of the blue below it.
        tall = Image.new("RGB", (100, 300), (0, 0, 240))
        for y in range(100):
            for x in range(100):
                tall.putpixel((x, y), (240, 0, 0))
        fitted = contact_sheet._fit(tall, 50)
        self.assertEqual(fitted.size, (50, 50))
        red, _, blue = fitted.getpixel((25, 40))
        self.assertGreater(red, 200)
        self.assertLess(blue, 60)


class CollectTests(unittest.TestCase):
    def test_intray_skips_anything_the_registry_has_already_claimed(self):
        with tempfile.TemporaryDirectory() as tmp:
            intray = os.path.join(tmp, "in-tray")
            write_png(os.path.join(intray, "free.png"))
            write_png(os.path.join(intray, "taken.png"))
            os.makedirs(os.path.join(intray, "vehicles"))
            write_png(os.path.join(intray, "vehicles", "lorry.png"))
            registry = os.path.join(tmp, "registry.json")
            with open(registry, "w", encoding="utf-8") as handle:
                json.dump({"assets": [{"sourceFilename": "taken.png"}]}, handle)

            found = contact_sheet.collect_intray(intray, registry)
            names = [label for _, label in found]
            self.assertEqual(names, ["free.png"])

    def test_intray_of_a_missing_directory_is_empty_not_an_error(self):
        self.assertEqual(contact_sheet.collect_intray("/nope/nothing/here", "/nope/none.json"), [])

    def test_cast_labels_by_asset_id_so_one_persons_variants_stay_apart(self):
        with tempfile.TemporaryDirectory() as tmp:
            write_png(os.path.join(tmp, "art", "a.png"))
            write_png(os.path.join(tmp, "art", "b.png"))
            registry = os.path.join(tmp, "registry.json")
            with open(registry, "w", encoding="utf-8") as handle:
                json.dump(
                    {
                        "assets": [
                            {
                                "id": "manako",
                                "category": "character-portraits",
                                "path": "art/a.png",
                                "assignedTo": {"kind": "npc", "ref": "manako"},
                            },
                            {
                                "id": "manako--masked",
                                "category": "character-portraits",
                                "path": "art/b.png",
                                "assignedTo": {"kind": "npc", "ref": "manako"},
                            },
                        ]
                    },
                    handle,
                )
            found = contact_sheet.collect_cast(registry, tmp)
            self.assertEqual([label for _, label in found], ["manako", "manako--masked"])

    def test_cast_is_registry_driven_and_sorted_by_npc_id(self):
        with tempfile.TemporaryDirectory() as tmp:
            write_png(os.path.join(tmp, "art", "zeta.png"))
            write_png(os.path.join(tmp, "art", "alpha.png"))
            registry = os.path.join(tmp, "registry.json")
            with open(registry, "w", encoding="utf-8") as handle:
                json.dump(
                    {
                        "assets": [
                            {
                                "category": "character-portraits",
                                "path": "art/zeta.png",
                                "assignedTo": {"kind": "npc", "ref": "zeta"},
                            },
                            {
                                "category": "character-portraits",
                                "path": "art/alpha.png",
                                "assignedTo": {"kind": "npc", "ref": "alpha"},
                            },
                            {
                                "category": "scenes",
                                "path": "art/zeta.png",
                                "assignedTo": {"kind": "scene", "ref": "somewhere"},
                            },
                            {
                                "category": "character-portraits",
                                "path": "art/alpha.png",
                                "assignedTo": None,
                            },
                        ]
                    },
                    handle,
                )
            found = contact_sheet.collect_cast(registry, tmp)
            self.assertEqual([ref for _, ref in found], ["alpha", "zeta"])

    def test_cast_skips_a_registered_file_that_is_no_longer_on_disk(self):
        with tempfile.TemporaryDirectory() as tmp:
            registry = os.path.join(tmp, "registry.json")
            with open(registry, "w", encoding="utf-8") as handle:
                json.dump(
                    {
                        "assets": [
                            {
                                "category": "character-portraits",
                                "path": "art/gone.png",
                                "assignedTo": {"kind": "npc", "ref": "gone"},
                            }
                        ]
                    },
                    handle,
                )
            self.assertEqual(contact_sheet.collect_cast(registry, tmp), [])


class PagingTests(unittest.TestCase):
    def test_slices_a_1_indexed_page(self):
        entries = list(range(10))
        self.assertEqual(contact_sheet.page_of(entries, 1, 4), [0, 1, 2, 3])
        self.assertEqual(contact_sheet.page_of(entries, 3, 4), [8, 9])

    def test_page_past_the_end_is_empty_not_an_error(self):
        self.assertEqual(contact_sheet.page_of([1, 2], 9, 4), [])

    def test_page_zero_or_no_per_page_means_all_of_it(self):
        entries = list(range(5))
        self.assertEqual(contact_sheet.page_of(entries, 0, 2), entries)
        self.assertEqual(contact_sheet.page_of(entries, 1, 0), entries)


class CliTests(unittest.TestCase):
    def test_requires_exactly_one_mode(self):
        with self.assertRaises(SystemExit):
            contact_sheet.main([])
        with self.assertRaises(SystemExit):
            contact_sheet.main(["--intray", "--cast"])
        with self.assertRaises(SystemExit):
            contact_sheet.main(["--scenes", "--cast"])

    def test_cast_mode_writes_a_sheet_of_the_real_registry(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "sheet.png")
            code = contact_sheet.main(["--cast", "--out", out, "--cell", "60"])
            self.assertEqual(code, 0)
            self.assertTrue(os.path.exists(out))


if __name__ == "__main__":
    unittest.main()
