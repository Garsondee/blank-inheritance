"""letter_en.py: English in capitals, broken into the letterer's lozenge, never hyphenated."""
import unittest

import support
from mangapress import letter_en


def setUpModule():
    support.use_test_fonts()


def tearDownModule():
    support.use_real_fonts()


LONG = "Work crew three to pier seven and then straight back to the yard for inspection"


class TestLozenge(unittest.TestCase):
    def test_the_middle_line_is_the_widest(self):
        _, info = letter_en.set_horizontal(LONG, 30)
        widths = [b[2] - b[0] for b in info["boxes"]]
        self.assertGreaterEqual(len(widths), 3)
        mid = max(widths)
        self.assertLess(widths[0], mid)
        self.assertLess(widths[-1], mid)

    def test_words_are_kept_whole_and_in_order(self):
        _, info = letter_en.set_horizontal(LONG, 30)
        self.assertEqual(" ".join(info["lines"]).split(), LONG.upper().split())

    def test_a_slash_forces_a_break(self):
        _, info = letter_en.set_horizontal("Meet your/partner.", 30)
        self.assertEqual(info["lines"], ["MEET YOUR", "PARTNER."])

    def test_each_line_box_is_centred(self):
        _, info = letter_en.set_horizontal(LONG, 30)
        for x0, _, x1, _ in info["boxes"]:
            self.assertAlmostEqual(x0, -x1)


if __name__ == "__main__":
    unittest.main()
