"""Font pipeline for the Blank Inheritance visual identity.

Downloads every family in fonts.json from Google Fonts, subsets it according to
its profile, converts to woff2, and writes:

    module/blank-inheritance/assets/fonts/<slug>-<weight>.woff2
    module/blank-inheritance/styles/bi-fonts.css      (generated @font-face rules)
    tools/font-pipeline/receipt.json                  (what was built, and how big)

WHY A PIPELINE AND NOT HAND-DOWNLOADED FILES
Japanese fonts are enormous — Shippori Mincho's full TTF is 8.3MB per weight, and
Google serves the woff2 as 122 unicode-range slices, which is unusable for
bundling. Subsetting is therefore mandatory, and once it is mandatory it needs to
be reproducible: a checked-in binary nobody can regenerate is a liability.

THE SIZE ARGUMENT, MEASURED (Shippori Mincho 400)
    full TTF from Google ................. 8,342,816 bytes
    subset: latin + kana + CJK common .....  2,852,664 bytes
    subset: latin + kana only ............. 	 59,644 bytes
    subset: latin + kana + UI vocabulary ..     83,156 bytes

So exactly one face carries full CJK coverage (the document body, which must
render whatever a GM types). Every other Japanese face is display-only, renders
strings we author ourselves, and takes the 83KB path. That is the difference
between a ~7MB bundle and a ~30MB one.

Requires: fonttools, brotli.   python -m pip install fonttools brotli
Run:      python tools/font-pipeline/build_fonts.py
          python tools/font-pipeline/build_fonts.py --check    (verify only)
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
FONT_OUT = REPO / "module" / "blank-inheritance" / "assets" / "fonts"
CSS_OUT = REPO / "module" / "blank-inheritance" / "styles" / "bi-fonts.css"
RECEIPT = HERE / "receipt.json"

# A legacy User-Agent makes Google Fonts return ONE complete .ttf per weight
# instead of 122 unicode-range-sliced woff2 files. That is the only practical
# way to get a whole CJK font to subset locally.
LEGACY_UA = "Mozilla/4.0"

# Ranges shared by every profile: ASCII, Latin-1, general punctuation, arrows and
# geometric shapes (the UI uses ◆ ▲ ● ⚠ and friends as glyphs), CJK punctuation,
# kana, and halfwidth/fullwidth forms.
BASE_RANGES = [
    "U+0020-007E", "U+00A0-00FF", "U+2000-206F", "U+2190-21FF",
    "U+25A0-25FF", "U+2600-26FF", "U+3000-303F", "U+3040-309F",
    "U+30A0-30FF", "U+FF00-FFEF",
]
# The common CJK ideograph block. Only the `full` profile pays for this.
CJK_RANGE = "U+4E00-9FAF"


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def fetch(url: str, ua: str = LEGACY_UA) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": ua})
    with urllib.request.urlopen(req, timeout=180) as resp:
        return resp.read()


def ttf_url_for(family: str, weight: int) -> str:
    """Ask Google Fonts for one family+weight and pull the .ttf out of the CSS.

    Single-weight families reject the :wght@ axis, so fall back to a bare
    family request rather than failing.
    """
    base = "https://fonts.googleapis.com/css2?family="
    attempts = [
        f"{base}{urllib.parse.quote(family)}:wght@{weight}",
        f"{base}{urllib.parse.quote(family)}",
    ]
    last_error = None
    for url in attempts:
        try:
            css = fetch(url).decode("utf-8")
        except Exception as exc:  # noqa: BLE001 - reported below with context
            last_error = exc
            continue
        match = re.search(r"https://[^\s)]+\.ttf", css)
        if match:
            return match.group(0)
        last_error = RuntimeError(f"no .ttf in CSS for {family} {weight}")
    raise RuntimeError(f"could not resolve {family} {weight}: {last_error}")


def subset(src: Path, dest: Path, profile: str, ui_kanji: str) -> None:
    unicodes = list(BASE_RANGES)
    if profile == "full":
        unicodes.append(CJK_RANGE)

    cmd = [
        sys.executable, "-m", "fontTools.subset", str(src),
        f"--output-file={dest}",
        "--flavor=woff2",
        f"--unicodes={','.join(unicodes)}",
        "--layout-features=*",
        "--no-hinting",
        "--desubroutinize",
    ]
    # `ui` adds our authored Kanji vocabulary on top of the base ranges.
    if profile == "ui":
        cmd.append(f"--text={ui_kanji}")

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"subset failed for {src.name}:\n{result.stderr[-800:]}")


def build(check_only: bool = False) -> dict:
    manifest = json.loads((HERE / "fonts.json").read_text(encoding="utf-8"))
    ui_kanji = manifest["uiKanji"]
    FONT_OUT.mkdir(parents=True, exist_ok=True)
    cache = HERE / ".cache"
    cache.mkdir(exist_ok=True)

    built = []
    for family in manifest["families"]:
        name, profile = family["name"], family["profile"]
        for weight in family["weights"]:
            out_name = f"{slug(name)}-{weight}.woff2"
            out_path = FONT_OUT / out_name

            if check_only:
                built.append({
                    "family": name, "weight": weight, "profile": profile,
                    "file": out_name,
                    "bytes": out_path.stat().st_size if out_path.exists() else 0,
                    "present": out_path.exists(),
                })
                continue

            if out_path.exists():
                print(f"  .. {out_name} (already built)")
            else:
                ttf_cache = cache / f"{slug(name)}-{weight}.ttf"
                if not ttf_cache.exists():
                    url = ttf_url_for(name, weight)
                    print(f"  -> {name} {weight}")
                    ttf_cache.write_bytes(fetch(url))
                subset(ttf_cache, out_path, profile, ui_kanji)
                print(f"  OK {out_name}  {out_path.stat().st_size:,} bytes")

            built.append({
                "family": name, "weight": weight, "profile": profile,
                "file": out_name, "bytes": out_path.stat().st_size,
                "present": True,
            })

    return {"families": manifest["families"], "built": built}


def render_css(result: dict) -> str:
    total = sum(b["bytes"] for b in result["built"])
    lines = [
        "/* GENERATED by tools/font-pipeline/build_fonts.py — do not edit by hand.",
        "   Rebuild:  python tools/font-pipeline/build_fonts.py",
        "",
        "   Every family here is SIL Open Font License, so bundling and",
        "   redistribution inside the module is fine. Files live in",
        "   module/blank-inheritance/assets/fonts/ and are referenced relative to",
        "   this stylesheet, so they resolve identically on disk and on the server.",
        "",
        f"   {len(result['built'])} files, {total / 1048576:.1f} MB total.",
        "",
        "   font-display: swap — a player should read the document in a fallback",
        "   face rather than stare at nothing while 2.8MB of Mincho arrives. */",
        "",
    ]
    for entry in result["built"]:
        lines += [
            "@font-face {",
            f"  font-family: \"{entry['family']}\";",
            "  font-style: normal;",
            f"  font-weight: {entry['weight']};",
            "  font-display: swap;",
            f"  src: url(\"../assets/fonts/{entry['file']}\") format(\"woff2\");",
            "}",
        ]
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="verify built files exist; download nothing")
    args = parser.parse_args()

    print("Blank Inheritance font pipeline")
    result = build(check_only=args.check)

    missing = [b for b in result["built"] if not b["present"]]
    if args.check:
        if missing:
            print(f"MISSING {len(missing)} font files. Run without --check to build.")
            return 1
        total = sum(b["bytes"] for b in result["built"])
        print(f"OK — {len(result['built'])} files, {total / 1048576:.1f} MB")
        return 0

    CSS_OUT.write_text(render_css(result), encoding="utf-8")
    RECEIPT.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    total = sum(b["bytes"] for b in result["built"])
    print(f"\nwrote {CSS_OUT.relative_to(REPO)}")
    print(f"wrote {RECEIPT.relative_to(REPO)}")
    print(f"{len(result['built'])} files, {total / 1048576:.1f} MB total")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
