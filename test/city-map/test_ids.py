"""Stable-id tests, including the cross-language contract with ids.mjs.

The cross-language test is the important one here. Python and JS deriving ids
differently would not raise anywhere -- the map would generate happily, the
Foundry sync would generate happily, and the two would simply disagree about
what every feature is called. Nothing surfaces until a scar recorded against a
building lands on a different building, which is exactly the failure
design/map-generation.md §10 warns about.
"""

import json
import os
import pathlib
import shutil
import subprocess
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap import ids  # noqa: E402

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
IDS_MJS = os.path.join(REPO_ROOT, "foundry", "blank-inheritance", "scripts", "core", "ids.mjs")


class TestDeriveId(unittest.TestCase):
    def test_is_sixteen_alphanumeric_chars(self):
        # Foundry's _id field validates against /^[a-zA-Z0-9]{16}$/.
        for source in ("claimant-three", "osm:way:12345", "", "unicode-ポート"):
            got = ids.derive_id(source)
            self.assertEqual(len(got), 16, f"{source!r} -> {got!r}")
            self.assertTrue(got.isalnum(), f"{source!r} -> {got!r}")

    def test_is_deterministic(self):
        self.assertEqual(ids.derive_id("claimant-three"), ids.derive_id("claimant-three"))

    def test_distinct_sources_give_distinct_ids(self):
        self.assertNotEqual(ids.derive_id("a"), ids.derive_id("b"))


class TestGeometryIds(unittest.TestCase):
    def test_quantisation_absorbs_floating_point_churn(self):
        # A re-import that differs only in the last float digit must NOT mint a
        # new id -- that would detach the feature's recorded history.
        a = [(-71234.5678901, -151234.1234567), (-71230.0, -151230.0)]
        b = [(-71234.5678902, -151234.1234566), (-71230.0000001, -151229.9999999)]
        self.assertEqual(
            ids.geometry_feature_id("bunker", a),
            ids.geometry_feature_id("bunker", b),
        )

    def test_genuinely_different_geometry_gives_different_id(self):
        a = [(0.0, 0.0), (10.0, 0.0)]
        b = [(0.0, 0.0), (10.5, 0.0)]  # 50 cm apart, far above the 1 mm quantum
        self.assertNotEqual(
            ids.geometry_feature_id("bunker", a),
            ids.geometry_feature_id("bunker", b),
        )

    def test_kind_namespaces_the_id(self):
        coords = [(0.0, 0.0), (10.0, 0.0)]
        self.assertNotEqual(
            ids.geometry_feature_id("bunker", coords),
            ids.geometry_feature_id("seawall", coords),
        )


class TestOpFeatureIds(unittest.TestCase):
    def test_stable_across_replays(self):
        self.assertEqual(ids.op_feature_id("op-0001", "building", 0),
                         ids.op_feature_id("op-0001", "building", 0))

    def test_role_and_index_both_namespace(self):
        seen = {
            ids.op_feature_id("op-0001", "building", 0),
            ids.op_feature_id("op-0001", "building", 1),
            ids.op_feature_id("op-0001", "access-road", 0),
            ids.op_feature_id("op-0002", "building", 0),
        }
        self.assertEqual(len(seen), 4, "op/role/index must all participate in the id")


class TestCrossLanguageContract(unittest.TestCase):
    """Python's derive_id must equal ids.mjs's deriveFoundryId, exactly."""

    def test_matches_ids_mjs(self):
        node = shutil.which("node")
        if node is None:
            self.skipTest("node not on PATH -- cannot verify the cross-language id contract")
        if not os.path.exists(IDS_MJS):
            self.skipTest(f"ids.mjs not found at {IDS_MJS}")

        cases = [
            "claimant-three",
            "osm:way:110521125",
            "op:op-0001:building:0",
            "kurose-12km",
            "unicode-ポートアイランド",
        ]
        # Node's ESM loader requires a file:// URL for absolute paths on
        # Windows -- a bare "E:\..." is rejected as an unsupported URL scheme.
        ids_mjs_url = pathlib.Path(IDS_MJS).as_uri()
        script = (
            f"import {{ deriveFoundryId }} from {json.dumps(ids_mjs_url)};\n"
            f"const cases = {json.dumps(cases)};\n"
            "const out = {};\n"
            "for (const c of cases) out[c] = await deriveFoundryId(c);\n"
            "process.stdout.write(JSON.stringify(out));\n"
        )
        proc = subprocess.run(
            [node, "--input-type=module", "-e", script],
            capture_output=True, text=True, timeout=60,
            # Explicit UTF-8: Windows defaults the pipe to cp1252, which cannot
            # decode the Japanese test case and yields stdout=None instead of a
            # useful error. The unicode case is deliberately kept -- real OSM
            # names are Japanese, so the id path must handle them.
            encoding="utf-8",
        )
        if proc.returncode != 0:
            self.fail(f"node failed running ids.mjs:\n{proc.stderr}")

        from_js = json.loads(proc.stdout)
        for source in cases:
            self.assertEqual(
                ids.derive_id(source), from_js[source],
                f"Python and ids.mjs disagree for {source!r}. The two implementations "
                f"have drifted -- ids must stay byte-identical across the boundary.",
            )


if __name__ == "__main__":
    unittest.main()
