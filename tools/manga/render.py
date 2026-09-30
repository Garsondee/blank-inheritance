"""Render the Directorate's recruitment comic from its script.

    python tools/manga/render.py draft data/manga/issue-01.json            # every page, both editions, screen look
    python tools/manga/render.py draft data/manga/issue-01.json --page p1 --edition ja --proof
    python tools/manga/render.py draft data/manga/issue-01.json --tone dots --dpi 600 --ss 1   # the print look
    python tools/manga/render.py lint data/manga/issue-01.json

Renders land in artwork/manga/<issue>/renders/ (gitignored) unless --out says otherwise. See tools/manga/README.md.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from mangapress import art, geometry, page as pagemod  # noqa: E402
from mangapress.fonts import REPO  # noqa: E402


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def lint(issue):
    """Every problem in the script, as (page id, sentence)."""
    fmt = geometry.Format.from_dict(issue["format"])
    out = []
    for p in issue["pages"]:
        out += [(p["id"], s) for s in geometry.lint(fmt, p)]
        out += [(p["id"], s) for s in pagemod.lint(issue, p)]
        rects, _ = geometry.panel_rects(fmt, p)
        for pid in p.get("panels", {}):
            if pid not in rects:
                out.append((p["id"], f"panel {pid} has art and words but no place in the layout"))
    return out


def draft(issue, pages, editions, tone, dpi, ss, proof, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    written = []
    for p in issue["pages"]:
        if pages and p["id"] not in pages:
            continue
        for ed in editions:
            img = pagemod.render_page(issue, p, ed, tone=tone, dpi=dpi, ss=ss, proof=proof)
            name = f"{issue['id']}-{p['id']}-{ed}" + ("" if tone == "flat" else f"-{tone}") + ("-proof" if proof else "")
            path = os.path.join(out_dir, name + ".png")
            img.save(path, dpi=(dpi, dpi))
            written.append(path)
    return written


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("draft", help="render pages")
    d.add_argument("script")
    d.add_argument("--page", action="append", help="page id (repeatable); default every page")
    d.add_argument("--edition", choices=("ja", "en", "both"), default="both")
    d.add_argument("--tone", choices=art.TONES, default="flat")
    d.add_argument("--dpi", type=int, default=300)
    d.add_argument("--ss", type=int, default=2, help="supersampling factor; use 1 for the dots look at print dpi")
    d.add_argument("--proof", action="store_true", help="draw trim, inner frame, reading order and anchors")
    d.add_argument("--out", help="output folder")
    l = sub.add_parser("lint", help="check layouts and font coverage")
    l.add_argument("script")
    a = ap.parse_args(argv)

    issue = load(a.script)
    problems = lint(issue)
    for pid, s in problems:
        print(f"[{pid}] {s}")
    if a.cmd == "lint":
        return 1 if problems else 0
    editions = ("ja", "en") if a.edition == "both" else (a.edition,)
    out = a.out or os.path.join(REPO, "artwork", "manga", issue["id"], "renders")
    for path in draft(issue, a.page, editions, a.tone, a.dpi, a.ss, a.proof, out):
        print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
