"""The reference-grid page furniture.

These layers get composited by hand into a Photoshop master, so a mistake in
them is expensive: it is not caught by a re-render, it is caught weeks later by
someone reading a wrong reference off the edge of a printed sheet.

What is actually checkable without looking at the picture:

* the layers are the size the Photoshop stack expects, and the border layer is
  the FULL image where the other two are content-only -- swapping those two
  conventions would misplace everything by exactly the 200 px margin, which is
  precisely the kind of error that looks almost right;
* lines land on cell boundaries and nowhere else, and the major rules are
  genuinely heavier than the cell hairlines;
* the layers are transparent where they should be, so compositing them cannot
  wipe out the artwork underneath.

Whether they LOOK right was checked by eye on 2026-09-11 against the real
master, which is the only way that question can be answered.

Drawn at a small synthetic size rather than the real 12000 px so the suite
stays fast; every function takes its geometry as arguments for that reason.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..",
                                "tools", "gazetteer"))

import make_grid_layers as mgl  # noqa: E402
from core import grid  # noqa: E402

# A toy sheet with the same shape as the real one: majors of 10 cells, a square
# content area, a margin a fifth of a major. 6x6 majors, as the real map has.
CELL = 10
PER_MAJOR = 10
COLS = ROWS = 60
BORDER = 20
CONTENT = COLS * CELL          # 600
IMAGE = CONTENT + 2 * BORDER   # 640
LETTERS = "ABCDEF"


def alpha_at(img, x, y):
    return img.getpixel((x, y))[3]


class TestGridLines(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.img = mgl.grid_lines_layer(COLS, ROWS, CELL, PER_MAJOR)

    def test_is_content_area_sized(self):
        """Content-only, so it composites at the content origin. If this ever
        became full-image sized, every line would shift by the margin."""
        self.assertEqual(self.img.size, (CONTENT, CONTENT))
        self.assertEqual(self.img.mode, "RGBA")

    def test_lines_land_on_cell_boundaries(self):
        for c in range(1, COLS):
            with self.subTest(col=c):
                self.assertGreater(alpha_at(self.img, c * CELL, CELL // 2), 0,
                                   "expected a line at column boundary %d" % c)

    def test_no_ink_in_the_middle_of_a_cell(self):
        """A cell's interior must be untouched, or the layer tints the map."""
        for c in range(COLS):
            for r in (0, 17, 41, 59):
                x = c * CELL + CELL // 2
                y = r * CELL + CELL // 2
                self.assertEqual(alpha_at(self.img, x, y), 0,
                                 "ink inside cell (%d, %d)" % (c, r))

    def test_major_rules_are_heavier_than_cell_hairlines(self):
        """Measured by how many pixels wide the ink actually is, not by reading
        the constants back -- the constants could both be changed and still
        agree with each other while the sheet stopped reading."""
        def ink_run(x_centre, y):
            n = 0
            for dx in range(-4, 5):
                if alpha_at(self.img, x_centre + dx, y) > 0:
                    n += 1
            return n

        cell_run = ink_run(3 * CELL, CELL // 2)     # a plain cell boundary
        major_run = ink_run(10 * CELL, CELL // 2)   # a major boundary
        self.assertGreater(major_run, cell_run,
                           "a 2 km rule must be visibly heavier than a cell line")

    def test_the_outer_edge_is_drawn(self):
        """The content area's own border is a major boundary too; leaving it
        off makes the outermost cells look unbounded."""
        self.assertGreater(alpha_at(self.img, 0, CONTENT // 2), 0)
        self.assertGreater(alpha_at(self.img, CONTENT - 1, CONTENT // 2), 0)


class TestGridLabels(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.img = mgl.grid_labels_layer(COLS, ROWS, CELL, PER_MAJOR, LETTERS)

    def test_is_content_area_sized(self):
        self.assertEqual(self.img.size, (CONTENT, CONTENT))

    def test_something_is_drawn(self):
        opaque = sum(1 for px in self.img.getdata() if px[3] > 0)
        self.assertGreater(opaque, 0, "the label layer must not be empty")

    def test_labels_are_confined_to_their_own_cell(self):
        """Every cell gets its own two digits at its top-right. If a label
        overflowed into the neighbouring cell, references would be ambiguous
        exactly where the sheet is busiest."""
        img = mgl.grid_labels_layer(COLS, ROWS, 40, PER_MAJOR, LETTERS)
        # Bottom-left eighth of a cell: too far from any top-right label to be
        # touched by one, unless a label has run away.
        for c in (5, 23, 44):
            for r in (5, 23, 44):
                x = c * 40 + 3
                y = r * 40 + 37
                self.assertEqual(img.getpixel((x, y))[3], 0,
                                 "label bled into cell (%d, %d)'s far corner" % (c, r))


class TestGridBorder(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.img = mgl.grid_border_layer(IMAGE, IMAGE, BORDER, COLS, ROWS,
                                        CELL, PER_MAJOR, LETTERS)

    def test_is_full_image_sized_not_content_sized(self):
        """The one layer here whose whole job is the margin. Sizing it like the
        other two -- or compositing it at the content origin -- puts the edge
        letters 200 px inside the map."""
        self.assertEqual(self.img.size, (IMAGE, IMAGE))

    def test_the_map_area_is_left_completely_clear(self):
        """Nothing may be drawn over the content area; the border layer sits on
        top of the finished map."""
        for x in range(BORDER + 2, IMAGE - BORDER - 2, 7):
            for y in range(BORDER + 2, IMAGE - BORDER - 2, 11):
                self.assertEqual(alpha_at(self.img, x, y), 0,
                                 "border layer drew inside the map at (%d, %d)" % (x, y))

    def test_all_four_margins_carry_ink(self):
        """A reference read from the top edge is useless by the time your eye is
        at the bottom of a sheet this size, which is why every real survey sheet
        repeats the labels on all four sides."""
        def margin_ink(x0, y0, x1, y1):
            return sum(1 for x in range(x0, x1) for y in range(y0, y1)
                       if alpha_at(self.img, x, y) > 0)

        self.assertGreater(margin_ink(BORDER, 0, IMAGE - BORDER, BORDER), 0, "top")
        self.assertGreater(margin_ink(BORDER, IMAGE - BORDER, IMAGE - BORDER, IMAGE), 0, "bottom")
        self.assertGreater(margin_ink(0, BORDER, BORDER, IMAGE - BORDER), 0, "left")
        self.assertGreater(margin_ink(IMAGE - BORDER, BORDER, IMAGE, IMAGE - BORDER), 0, "right")

    def test_major_ticks_are_longer_than_cell_ticks(self):
        """The ticks are what make a reference countable off the edge without
        labelling all sixty cells, so the two lengths must differ."""
        def tick_length(col):
            x = BORDER + col * CELL
            n = 0
            for dy in range(1, BORDER):
                if alpha_at(self.img, x, BORDER - dy) > 0:
                    n += 1
            return n

        self.assertGreater(tick_length(10), tick_length(3),
                           "a major tick must be longer than a cell tick")


class TestSchemeAgreement(unittest.TestCase):
    """The drawn sheet and the computed reference must be the same scheme.

    This is the join that matters: core/grid.py decides what a cell is called,
    and these layers paint that name onto the paper. If they ever disagreed,
    the map would be labelled in one language and queried in another.
    """

    def test_major_labels_come_from_the_shared_scheme(self):
        self.assertEqual(grid.major_label(0, 0), "A1")
        self.assertEqual(grid.major_label(2, 3), "C4")
        self.assertEqual(grid.major_label(5, 5), "F6")

    def test_the_digits_a_cell_is_labelled_with_are_its_own_reference(self):
        """What gets painted in a cell is `col % 10` then `row % 10`; what
        core/grid.py reports for that cell must end in the same two digits."""
        for col, row in ((0, 0), (7, 3), (21, 31), (37, 33), (59, 59)):
            painted = "%d%d" % (col % PER_MAJOR, row % PER_MAJOR)
            ref = grid.cell_to_ref(col, row)
            self.assertTrue(ref.endswith(painted),
                            "cell (%d, %d) is painted %s but referenced %s"
                            % (col, row, painted, ref))

    def test_a_reference_read_off_the_sheet_resolves_to_the_right_cell(self):
        """The round trip a person actually performs: read the major off the
        margin, read the digits out of the cell, type it, land in that cell."""
        for col, row in ((0, 0), (7, 3), (21, 31), (59, 59)):
            major = grid.major_label(col // PER_MAJOR, row // PER_MAJOR)
            digits = "%d%d" % (col % PER_MAJOR, row % PER_MAJOR)
            self.assertEqual(grid.ref_to_cell(major + grid.SEPARATOR + digits),
                             (col, row))


if __name__ == "__main__":
    unittest.main()
