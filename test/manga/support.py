"""Shared setup for the manga renderer's tests.

The real faces include a 65,000-glyph CJK font whose vertical-form copy takes a minute to build, so the tests swap in
small open-licence faces from third-party/fonts/ (the folder is gitignored, so a fresh clone skips these tests rather
than failing them) and build their vertical copies in a temporary folder once per run.
"""
import atexit
import os
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(REPO, "tools", "manga"))

_CACHE = tempfile.mkdtemp(prefix="manga-test-cache-")
atexit.register(shutil.rmtree, _CACHE, ignore_errors=True)
os.environ["MANGA_CACHE_DIR"] = _CACHE

from mangapress import fonts  # noqa: E402

TEST_FONTS = {
    "ja-kana": ("third-party/fonts/ReggaeOne-Regular.ttf", 0, "SIL OFL 1.1 (test stand-in)"),
    "ja-kanji": ("third-party/fonts/ReggaeOne-Regular.ttf", 0, "SIL OFL 1.1 (test stand-in)"),
    "ja-gothic": ("third-party/fonts/ReggaeOne-Regular.ttf", 0, "SIL OFL 1.1 (test stand-in)"),
    "ja-mincho": ("third-party/fonts/ReggaeOne-Regular.ttf", 0, "SIL OFL 1.1 (test stand-in)"),
    "ja-display": ("third-party/fonts/DelaGothicOne-Regular.ttf", 0, "SIL OFL 1.1"),
    "en-dialogue": ("third-party/fonts/texgyreheros-bold.otf", 0, "GUST Font License (test stand-in)"),
    "en-display": ("third-party/fonts/texgyreheroscn-bold.otf", 0, "GUST Font License"),
}
REAL_FONTS = dict(fonts.FONTS)


def use_test_fonts(testcase=None):
    """Point every alias at the small test faces; skip if they aren't on this machine."""
    missing = [p for p, _, _ in TEST_FONTS.values() if not os.path.exists(os.path.join(REPO, p))]
    if missing:
        raise unittest.SkipTest(f"test fonts not present (third-party/fonts is gitignored): {missing[0]}")
    fonts.FONTS.clear()
    fonts.FONTS.update(TEST_FONTS)
    fonts.metrics.cache_clear()
    fonts._COVERAGE.clear()


def use_real_fonts():
    fonts.FONTS.clear()
    fonts.FONTS.update(REAL_FONTS)
    fonts.metrics.cache_clear()
    fonts._COVERAGE.clear()
