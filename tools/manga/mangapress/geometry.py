"""Page geometry in millimetres: trim, bleed, the inner frame, and the panels cut from it.

Manga reads right to left: inside a tier the first panel listed is the rightmost, and tiers run top to bottom. The
standards and the reading-order rules checked here are in design/research/manga/page-craft-and-print.md (§1, §2.2, §2.7
and "Implications for the layout software").
"""
from dataclasses import dataclass

MM_PER_INCH = 25.4


@dataclass(frozen=True)
class Format:
    trim_w: float
    trim_h: float
    bleed: float
    top: float
    bottom: float
    outer: float
    spine: float
    gutter_side: float
    gutter_tier: float
    frame: float
    binding: str = "right"

    @classmethod
    def from_dict(cls, d):
        m = d["inner_mm"]
        return cls(trim_w=d["trim_mm"][0], trim_h=d["trim_mm"][1], bleed=d["bleed_mm"], top=m["top"],
                   bottom=m["bottom"], outer=m["outer"], spine=m["spine"], gutter_side=d["gutter_mm"]["side"],
                   gutter_tier=d["gutter_mm"]["tier"], frame=d["frame_mm"], binding=d.get("binding", "right"))


def px_per_mm(dpi):
    return dpi / MM_PER_INCH


def canvas_mm(fmt):
    return fmt.trim_w + 2 * fmt.bleed, fmt.trim_h + 2 * fmt.bleed


def spine_side(fmt, page_number):
    """In a right-bound book odd pages sit on the left of the spread, so their spine is on their right."""
    odd = page_number % 2 == 1
    if fmt.binding == "right":
        return "right" if odd else "left"
    return "left" if odd else "right"


def trim_box(fmt):
    return (fmt.bleed, fmt.bleed, fmt.bleed + fmt.trim_w, fmt.bleed + fmt.trim_h)


def inner_box(fmt, page_number):
    """The inner frame: everything anyone says stays inside it."""
    spine = spine_side(fmt, page_number)
    left = fmt.spine if spine == "left" else fmt.outer
    right = fmt.spine if spine == "right" else fmt.outer
    return (fmt.bleed + left, fmt.bleed + fmt.top, fmt.bleed + fmt.trim_w - right, fmt.bleed + fmt.trim_h - fmt.bottom)


def panel_rects(fmt, page):
    """({panel id: (x0, y0, x1, y1) in canvas mm}, [panel ids in reading order])."""
    x0, y0, x1, _ = inner_box(fmt, page["number"])
    rects, order = {}, []
    y = y0
    for tier in page["tiers"]:
        h = tier["height_mm"]
        x = x1
        for p in tier["panels"]:
            w = p["width_mm"]
            rects[p["id"]] = (x - w, y, x, y + h)
            order.append(p["id"])
            x -= w + fmt.gutter_side
        y += h + fmt.gutter_tier
    return rects, order


def lint(fmt, page):
    """Layout problems a reader would trip over, as plain sentences. An empty list means the page is sound."""
    problems = []
    x0, y0, x1, y1 = inner_box(fmt, page["number"])
    width, height = x1 - x0, y1 - y0
    tiers = page["tiers"]
    filled = sum(t["height_mm"] for t in tiers) + fmt.gutter_tier * (len(tiers) - 1)
    if abs(filled - height) > 0.05:
        problems.append(f"the tiers fill {filled:.2f} mm of a {height:.2f} mm inner frame")
    if fmt.gutter_tier < 1.8 * fmt.gutter_side:
        problems.append("the gap between tiers should be at least 1.8 times the gap between panels, so each tier "
                        "reads as one row")
    gutters = []
    for i, t in enumerate(tiers, 1):
        row = sum(p["width_mm"] for p in t["panels"]) + fmt.gutter_side * (len(t["panels"]) - 1)
        if abs(row - width) > 0.05:
            problems.append(f"tier {i} is {row:.2f} mm wide in a {width:.2f} mm inner frame")
        xs, x = [], 0.0
        for p in t["panels"][:-1]:
            x += p["width_mm"]
            xs.append(x + fmt.gutter_side / 2)
            x += fmt.gutter_side
        gutters.append(xs)
    for i, (upper, lower) in enumerate(zip(gutters, gutters[1:]), 1):
        for a in upper:
            for b in lower:
                if abs(a - b) < 3 * fmt.gutter_side:
                    problems.append(f"the gaps between panels in tiers {i} and {i + 1} line up ({a:.1f} and {b:.1f} "
                                    "mm from the right): the eye runs straight down them")
    count = sum(len(t["panels"]) for t in tiers)
    if count > 8:
        problems.append(f"{count} panels on one page; eight is the most a reader handles comfortably")
    return problems
