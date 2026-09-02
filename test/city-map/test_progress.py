"""progress.py tests: the CLI's progress bar and stage timer, using an
in-memory stream so nothing here depends on an actual terminal."""

import io
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "tools", "city-map"))

from citymap.progress import ProgressReporter, StageTimer  # noqa: E402


class TestProgressReporter(unittest.TestCase):
    def test_reaches_100_percent_on_finish(self):
        stream = io.StringIO()
        p = ProgressReporter(total=4, label="widgets", stream=stream)
        p.update(4)
        p.finish()
        self.assertIn("4/4", stream.getvalue())
        self.assertIn("100.0%", stream.getvalue())

    def test_update_accumulates(self):
        stream = io.StringIO()
        p = ProgressReporter(total=10, label="tiles", stream=stream)
        p.update(3)
        p.update(4)
        self.assertEqual(p.done, 7)

    def test_set_overrides_rather_than_accumulates(self):
        stream = io.StringIO()
        p = ProgressReporter(total=10, label="tiles", stream=stream)
        p.update(5)
        p.set(2)
        self.assertEqual(p.done, 2)

    def test_done_never_exceeds_total(self):
        stream = io.StringIO()
        p = ProgressReporter(total=5, label="tiles", stream=stream)
        p.update(999)
        self.assertEqual(p.done, 5)

    def test_zero_total_does_not_divide_by_zero(self):
        stream = io.StringIO()
        p = ProgressReporter(total=0, label="tiles", stream=stream)
        p.update(1)  # must not raise

    def test_context_manager_finishes_on_clean_exit(self):
        stream = io.StringIO()
        with ProgressReporter(total=2, label="tiles", stream=stream) as p:
            p.update(2)
        self.assertIn("2/2", stream.getvalue())
        self.assertTrue(stream.getvalue().endswith("\n"))

    def test_label_appears_in_output(self):
        stream = io.StringIO()
        ProgressReporter(total=1, label="DEM tiles", stream=stream)
        self.assertIn("DEM tiles", stream.getvalue())


class TestStageTimer(unittest.TestCase):
    def test_prints_start_and_done(self):
        stream = io.StringIO()
        with StageTimer("hillshade", stream=stream):
            pass
        out = stream.getvalue()
        self.assertIn("hillshade...", out)
        self.assertIn("done (", out)

    def test_prints_failed_on_exception(self):
        stream = io.StringIO()
        with self.assertRaises(ValueError):
            with StageTimer("risky stage", stream=stream):
                raise ValueError("boom")
        self.assertIn("FAILED after", stream.getvalue())


if __name__ == "__main__":
    unittest.main()
