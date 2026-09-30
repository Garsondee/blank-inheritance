"""letter_ja.py: vertical Japanese: columns, 縦中横, furigana, line-break rules and the fonts' own vertical forms."""
import unittest

import numpy as np
from fontTools.ttLib import TTFont

import support
from mangapress import fonts, letter_ja


def setUpModule():
    support.use_test_fonts()


def tearDownModule():
    support.use_real_fonts()


def texts(setting):
    return ["".join(c.text for c in col) for col in setting.columns]


class TestParse(unittest.TestCase):
    def test_a_slash_ends_a_column(self):
        self.assertEqual(texts(letter_ja.parse("ここが/本部だ。")), ["ここが", "本部だ。"])

    def test_exclamation_pairs_share_one_square(self):
        cells = letter_ja.parse("えーっ!?").columns[0]
        self.assertEqual([c.text for c in cells], ["え", "ー", "っ", "!?"])
        self.assertTrue(cells[-1].tcy)

    def test_full_width_pairs_are_joined_too_and_a_lone_mark_stays_full_width(self):
        cells = letter_ja.parse("はい！！").columns[0]
        self.assertEqual(cells[-1].text, "!!")
        self.assertEqual(letter_ja.parse("はい！").columns[0][-1].text, "！")

    def test_two_digit_numbers_sit_side_by_side(self):
        cells = letter_ja.parse("第12班").columns[0]
        self.assertIn("12", [c.text for c in cells])

    def test_furigana_attach_to_their_characters(self):
        s = letter_ja.parse("{黒瀬|くろせ}へ")
        self.assertEqual(s.rubies, {0: "くろせ"})
        self.assertEqual([c.group for c in s.columns[0]], [0, 0, -1])

    def test_plain_strips_the_markup(self):
        self.assertEqual(letter_ja.plain("{相棒|あいぼう}だ/よ"), "相棒あいぼうだよ")


class TestLineBreaks(unittest.TestCase):
    def test_no_column_starts_with_a_closing_mark_or_small_kana(self):
        s = letter_ja.wrap(letter_ja.parse("あいうえおかきくけこっさしすせそ、たちつてと。なにぬ"), 5)
        for col in s.columns[1:]:
            self.assertNotIn(col[0].text, letter_ja.NO_START, texts(s))

    def test_no_column_ends_with_an_opening_bracket(self):
        s = letter_ja.wrap(letter_ja.parse("あいうえ「おかきくけこ」"), 5)
        for col in s.columns[:-1]:
            self.assertNotIn(col[-1].text, letter_ja.NO_END, texts(s))

    def test_a_reading_group_is_never_split(self):
        s = letter_ja.wrap(letter_ja.parse("あいう{第三作業班|だいさんさぎょうはん}へ"), 5)
        groups = [{c.group for c in col if c.group >= 0} for col in s.columns]
        self.assertEqual(sum(1 for g in groups if 0 in g), 1, texts(s))

    def test_a_paired_ellipsis_stays_together(self):
        s = letter_ja.wrap(letter_ja.parse("あいうえ……か"), 5)
        joined = texts(s)
        self.assertTrue(any("……" in col for col in joined), joined)


class TestVerticalForms(unittest.TestCase):
    def test_the_working_copy_points_marks_at_their_vertical_forms(self):
        path = fonts.vertical_copy("ja-kana")
        original = fonts._open("ja-kana").getBestCmap()
        vertical = TTFont(path).getBestCmap()
        for ch in "ー「、":
            self.assertNotEqual(original[ord(ch)], vertical[ord(ch)], ch)
        self.assertEqual(original[ord("あ")], vertical[ord("あ")])


class TestSetting(unittest.TestCase):
    def test_columns_run_right_to_left(self):
        _, info = letter_ja.set_vertical("あ/い", 40)
        (r0, _, _, _), (l0, _, _, _) = info["boxes"]
        self.assertGreater(r0, l0)

    def test_furigana_widen_the_block_and_ink_its_right_edge(self):
        plain, _ = letter_ja.set_vertical("本部", 40)
        ruby, info = letter_ja.set_vertical("{本部|ほんぶ}", 40)
        self.assertGreater(ruby.width, plain.width)
        a = np.array(ruby) > 0
        x1 = int(info["boxes"][0][2] + ruby.width / 2)
        self.assertTrue(a[:, x1 - 18:x1].any(), "no furigana ink to the right of the column")

    def test_the_block_is_as_tall_as_its_longest_column(self):
        _, info = letter_ja.set_vertical("あいう/えおかき", 30)
        self.assertEqual(info["cells"], 4)
        self.assertEqual(info["columns"], 2)


if __name__ == "__main__":
    unittest.main()
