"""Every real template's AREA parts must carry a tag render_tile actually
draws something for.

Found the hard way this session: render_tile's fill/outline/shadow loops
gate strictly on `"building" in feature.tags`, and its only other area-fill
path (the landuse tint) gates on `landuse`/`natural`/`leisure`. THREE real,
already-placed templates (mech-bunker.json, sentinel-tower.json,
directorate-command-citadel.json) tagged their apron/yard part only
`aeroway=apron` -- none of the four keys render_tile checks -- so that part
had been rendering as correct geometry, zero ink, since it was written.
citymap/editor/server.py's shape_to_template_parts() now force-injects a
tag for exactly this case when authoring a NEW template through the
Scratchpad; this file is the other half -- a scan that would have caught
the three EXISTING ones, and catches any future template file that
reintroduces the same trap, from hand-authoring or any other source.
"""

import glob
import json
import os
import unittest

TEMPLATES_DIR = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "..", "data", "map", "templates"))

RENDERABLE_AREA_KEYS = ("building", "landuse", "natural", "leisure")


def _load_templates():
    paths = sorted(glob.glob(os.path.join(TEMPLATES_DIR, "*.json")))
    out = []
    for path in paths:
        with open(path, encoding="utf-8") as fh:
            out.append((os.path.basename(path), json.load(fh)))
    return out


class TestEveryTemplateAreaPartIsRenderable(unittest.TestCase):
    def test_at_least_one_template_exists(self):
        # A guard on the test itself: if the templates directory is ever
        # empty or the glob path is wrong, the loop below would pass
        # vacuously and this whole file would silently stop checking anything.
        self.assertGreater(len(_load_templates()), 0, "no template files found -- check TEMPLATES_DIR")

    def test_every_area_part_has_a_renderable_tag(self):
        failures = []
        for filename, template in _load_templates():
            for i, part in enumerate(template.get("parts", [])):
                if part.get("kind", "area") != "area":
                    continue  # line parts are schematic-only by design, not this check's concern
                tags = part.get("tags", {})
                if not any(key in tags for key in RENDERABLE_AREA_KEYS):
                    failures.append(f"{filename} part[{i}] ({tags}) has none of {RENDERABLE_AREA_KEYS} "
                                    f"-- renders as correct geometry, zero ink")
        self.assertEqual(failures, [], "\n" + "\n".join(failures))


if __name__ == "__main__":
    unittest.main()
