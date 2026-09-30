"""page.py and render.py: whole pages, rendered from a small script with every kind of item, in both editions."""
import contextlib
import copy
import io
import json
import os
import shutil
import tempfile
import unittest

import cv2
import numpy as np
from PIL import Image

import support
from mangapress import fonts, geometry, page as pagemod
import render

ISSUE_01 = os.path.join(support.REPO, "data", "manga", "issue-01.json")


def fixture(art_dir):
    """A one-page script with every kind of item, GM notes at every level, and art for one panel of three."""
    return {
        "id": "test-issue",
        "type": "manga-issue",
        "artDir": art_dir,
        "format": {"trim_mm": [148, 210], "bleed_mm": 3, "binding": "right",
                   "inner_mm": {"top": 15, "bottom": 15, "outer": 13, "spine": 13},
                   "gutter_mm": {"side": 2.5, "tier": 5}, "frame_mm": 0.55},
        "lettering": {"ja_em_mm": 3.2, "en_size_mm": 2.9, "line_mm": 0.25, "pad_em": 0.45},
        "pages": [{
            "id": "p1", "number": 3,
            "hashira": {"ja": "{本部|ほんぶ}では{隊員|たいいん}をぼしゅう！", "en": "NOW RECRUITING!"},
            "gm": "GM-SECRET-PAGE",
            "tiers": [{"height_mm": 80, "panels": [{"id": "A", "width_mm": 122}]},
                      {"height_mm": 95, "panels": [{"id": "B", "width_mm": 70}, {"id": "C", "width_mm": 49.5}]}],
            "panels": {
                "A": {"art": "fixture.png", "focus": [0.5, 0.5], "gm": "GM-SECRET-PANEL", "items": [
                    {"kind": "title", "at": [0.72, 0.2], "size_mm": 8, "text": {"ja": "テスト", "en": "TEST ISSUE"}},
                    {"kind": "caption", "at": [0.93, 0.6], "text": {"ja": "{港町|みなとまち}。", "en": "A port city."}},
                    {"kind": "balloon", "shape": "burst", "at": [0.3, 0.3], "tail": [0.12, 0.8],
                     "text": {"ja": "いま{行|い}く/よーっ！！", "en": "Here I/come!!"}, "gm": "GM-SECRET-ITEM"},
                    {"kind": "sfx", "at": [0.1, 0.88], "size_mm": 5, "text": "タッタッ", "sub": "TAP TAP"},
                ]},
                "B": {"items": [
                    {"kind": "balloon", "shape": "oval", "at": [0.8, 0.25], "tail": [0.5, 0.5],
                     "text": {"ja": "ここが/{本部|ほんぶ}だ。", "en": "This is/HQ."}},
                    {"kind": "balloon", "shape": "angular", "at": [0.3, 0.72], "tail": [0.05, 0.4], "scale": 0.85,
                     "text": {"ja": "{第三|だいさん}{作業班|さぎょうはん}、/{七番|ななばん}{埠頭|ふとう}へ。",
                              "en": "Work crew three to pier seven."}, "en": {"at": [0.35, 0.78]}},
                    {"kind": "sign", "at": [0.95, 0.85], "size_mm": 1.9, "text": "工事中", "sub": "WORKS"},
                    {"kind": "aori", "at": [0.5, 0.95], "text": {"ja": "あたらしい{毎日|まいにち}！", "en": "A new life!"}},
                ]},
                "C": {"art": "missing.png", "items": [
                    {"kind": "balloon", "shape": "wobbly", "at": [0.5, 0.2], "tail": [0.5, 0.6],
                     "text": {"ja": "あっ、/はい！", "en": "Oh! Yes!"}},
                    {"kind": "mark", "at": [0.3, 0.5], "text": "？"},
                    {"kind": "sfx", "at": [0.5, 0.8], "size_mm": 4, "step": [0.08, 0.92], "text": "ギギギ",
                     "sub": "CREAK"},
                ]},
            },
        }],
    }


def strip_gm(node):
    if isinstance(node, dict):
        return {k: strip_gm(v) for k, v in node.items() if k != "gm"}
    if isinstance(node, list):
        return [strip_gm(v) for v in node]
    return node


def gm_notes(node, out=None):
    out = [] if out is None else out
    if isinstance(node, dict):
        for k, v in node.items():
            if k == "gm":
                out.append(v)
            else:
                gm_notes(v, out)
    elif isinstance(node, list):
        for v in node:
            gm_notes(v, out)
    return out


class PageTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        support.use_test_fonts()
        cls.dir = tempfile.mkdtemp(prefix="manga-page-")
        yy, xx = np.mgrid[0:300, 0:400]
        img = ((xx + yy) % 256).astype(np.uint8)
        cv2.circle(img, (200, 150), 60, 0, 8)
        ok, buf = cv2.imencode(".png", img)
        buf.tofile(os.path.join(cls.dir, "fixture.png"))
        cls.issue = fixture(cls.dir)
        cls.page = cls.issue["pages"][0]

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.dir, ignore_errors=True)
        support.use_real_fonts()

    def render(self, edition="ja", issue=None, **kw):
        issue = issue or self.issue
        kw.setdefault("dpi", 100)
        kw.setdefault("ss", 1)
        return pagemod.render_page(issue, issue["pages"][0], edition, **kw)


class TestRender(PageTest):
    def test_the_page_is_trim_plus_bleed_at_the_asked_resolution(self):
        img = self.render()
        w, h = geometry.canvas_mm(geometry.Format.from_dict(self.issue["format"]))
        self.assertEqual(img.size, (round(w * 100 / 25.4), round(h * 100 / 25.4)))
        self.assertEqual(img.mode, "L")

    def test_the_same_script_renders_the_same_page(self):
        self.assertTrue(np.array_equal(np.array(self.render()), np.array(self.render())))

    def test_the_two_editions_differ(self):
        self.assertFalse(np.array_equal(np.array(self.render("ja")), np.array(self.render("en"))))

    def test_every_tone_renders_and_a_proof_is_in_colour(self):
        for tone in ("art", "flat", "dots"):
            self.render(tone=tone)
        self.assertEqual(self.render(proof=True).mode, "RGB")

    def test_the_gm_notes_are_never_drawn(self):
        plain = strip_gm(self.issue)
        loud = copy.deepcopy(self.issue)
        loud["pages"][0]["panels"]["B"]["gm"] = "A DIFFERENT SECRET"
        for ed in ("ja", "en"):
            base = np.array(self.render(ed, plain))
            self.assertTrue(np.array_equal(base, np.array(self.render(ed))), ed)
            self.assertTrue(np.array_equal(base, np.array(self.render(ed, loud))), ed)


class TestFurniture(PageTest):
    def ink_near(self, img, x_mm, y_mm, r_mm=3.0):
        ppm = 100 / 25.4
        a = np.array(img)
        x, y, r = int(x_mm * ppm), int(y_mm * ppm), int(r_mm * ppm)
        return int((a[y - r:y + r, x - r:x + r] < 128).sum())

    def test_the_page_number_sits_in_the_outer_corner_away_from_the_spine(self):
        # Page 3 of a right-bound book is a left-hand page: spine on its right, number bottom left.
        img = self.render()
        self.assertGreater(self.ink_near(img, 3 + 7, 3 + 210 - 7), 0)
        self.assertEqual(self.ink_near(img, 3 + 148 - 7, 3 + 210 - 7), 0)
        even = copy.deepcopy(self.issue)
        even["pages"][0]["number"] = 4
        img = self.render(issue=even)
        self.assertEqual(self.ink_near(img, 3 + 7, 3 + 210 - 7), 0)
        self.assertGreater(self.ink_near(img, 3 + 148 - 7, 3 + 210 - 7), 0)


class TestSafeArea(PageTest):
    """Words may break a panel's border, never the inner frame."""

    def test_items_pushed_against_the_corner_stay_inside_the_inner_frame(self):
        fmt = geometry.Format.from_dict(self.issue["format"])
        ppm = geometry.px_per_mm(150)
        bounds = tuple(v * ppm for v in geometry.inner_box(fmt, 3))
        rect = (bounds[0], bounds[1], bounds[0] + 60 * ppm, bounds[1] + 40 * ppm)
        items = [
            {"kind": "balloon", "shape": s, "at": at, "tail": [0.5, 0.5],
             "text": {"ja": "いま{行|い}く/よーっ！！/{本部|ほんぶ}へ", "en": "Here I come, all the way to HQ!!"}}
            for s in ("oval", "burst", "angular", "wobbly") for at in ([0.0, 0.0], [1.0, 1.0], [0.0, 1.0])
        ] + [
            {"kind": "caption", "at": [0.0, 0.0], "text": {"ja": "{港町|みなとまち}・{黒瀬|くろせ}。", "en": "The port city."}},
            {"kind": "sfx", "at": [0.0, 0.0], "size_mm": 8, "text": "ドドドド"},
            {"kind": "title", "at": [0.0, 0.0], "size_mm": 9, "text": {"ja": "テストだよ", "en": "A LONG TEST TITLE"}},
        ]
        for it in items:
            for ed in ("ja", "en"):
                canvas = Image.new("L", (int(160 * ppm), int(220 * ppm)), 255)
                pagemod._draw_item(canvas, pagemod._edition(it, ed), ed, rect, ppm, self.issue["lettering"], 5,
                                   bounds)
                ys, xs = np.nonzero(np.array(canvas) < 255)
                self.assertGreater(len(xs), 0)
                msg = (it["kind"], it.get("shape"), it["at"], ed)
                self.assertGreaterEqual(xs.min(), int(bounds[0]), msg)
                self.assertGreaterEqual(ys.min(), int(bounds[1]), msg)
                self.assertLessEqual(xs.max(), int(bounds[2]) + 1, msg)
                self.assertLessEqual(ys.max(), int(bounds[3]) + 1, msg)


class TestScript(PageTest):
    def test_an_edition_block_overrides_only_its_own_edition(self):
        it = self.page["panels"]["B"]["items"][1]
        self.assertEqual(pagemod._edition(it, "en")["at"], [0.35, 0.78])
        self.assertEqual(pagemod._edition(it, "ja")["at"], [0.3, 0.72])

    def test_the_english_edition_keeps_the_japanese_effects_and_adds_subtitles(self):
        drawn = pagemod.lettered(self.issue, self.page, "en")
        self.assertIn(("タッタッ", "ja-display"), drawn)
        self.assertIn(("TAP TAP", "en-display"), drawn)
        self.assertIn(("WORKS", "en-display"), drawn)
        self.assertNotIn(("TAP TAP", "en-display"), pagemod.lettered(self.issue, self.page, "ja"))

    def test_the_loudspeaker_speaks_in_the_institutional_faces(self):
        self.assertIn(("{第三|だいさん}{作業班|さぎょうはん}、/{七番|ななばん}{埠頭|ふとう}へ。", "ja-gothic"),
                      pagemod.lettered(self.issue, self.page, "ja"))
        self.assertIn(("Work crew three to pier seven.", "en-display"), pagemod.lettered(self.issue, self.page, "en"))

    def test_a_character_a_face_cannot_draw_is_reported(self):
        broken = copy.deepcopy(self.issue)
        broken["pages"][0]["hashira"]["en"] = "★ NOW RECRUITING!"
        problems = pagemod.lint(broken, broken["pages"][0])
        self.assertTrue(any("en-display cannot draw ★" in p for p in problems), problems)
        self.assertEqual(pagemod.lint(self.issue, self.page), [])


class TestCommandLine(PageTest):
    def run_cli(self, *args):
        path = os.path.join(self.dir, "script.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.issue, f, ensure_ascii=False)
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            code = render.main([args[0], path, *args[1:]])
        return code, out.getvalue()

    def test_draft_writes_both_editions_named_by_issue_page_and_edition(self):
        out_dir = os.path.join(self.dir, "renders")
        code, _ = self.run_cli("draft", "--dpi", "60", "--ss", "1", "--out", out_dir)
        self.assertEqual(code, 0)
        self.assertEqual(sorted(os.listdir(out_dir)), ["test-issue-p1-en.png", "test-issue-p1-ja.png"])
        self.run_cli("draft", "--dpi", "60", "--ss", "1", "--out", out_dir, "--edition", "ja", "--tone", "dots",
                     "--proof")
        self.assertIn("test-issue-p1-ja-dots-proof.png", os.listdir(out_dir))

    def test_lint_passes_a_sound_script_and_fails_a_broken_one(self):
        self.assertEqual(self.run_cli("lint")[0], 0)
        saved = self.issue
        try:
            self.issue = copy.deepcopy(saved)
            self.issue["pages"][0]["tiers"][0]["panels"][0]["width_mm"] = 100
            code, printed = self.run_cli("lint")
            self.assertEqual(code, 1)
            self.assertIn("tier 1 is 100.00 mm wide", printed)
        finally:
            self.issue = saved


class TestIssueOne(unittest.TestCase):
    """The real script, data/manga/issue-01.json."""

    @classmethod
    def setUpClass(cls):
        with open(ISSUE_01, encoding="utf-8") as f:
            cls.issue = json.load(f)

    def test_no_gm_note_is_ever_among_the_words_drawn(self):
        notes = gm_notes(self.issue)
        self.assertGreater(len(notes), 0)
        for p in self.issue["pages"]:
            for ed in ("ja", "en"):
                for t in pagemod.collect_texts(self.issue, p, ed):
                    for note in notes:
                        self.assertNotIn(note, t)

    def test_it_lints_clean_with_the_real_faces(self):
        support.use_real_fonts()
        gone = [a for a in fonts.FONTS if not fonts.available(a)]
        if gone:
            self.skipTest(f"real faces not on this machine: {gone}")
        self.assertEqual(render.lint(self.issue), [])


if __name__ == "__main__":
    unittest.main()
