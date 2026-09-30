"""Small thumbnails of every scene's art, for the destination cards on The City.

Players come to recognise a place by its picture as much as by its name (Ingram, 2026-09-28), so every
destination card shows one. The full scene art is ~0.5 MB a picture; eight cards on the map would pull
four megabytes to show postage stamps. This writes a 480px-wide WebP of each into
module/blank-inheritance/assets/scenes/thumbs/, which core/departures.mjs#thumbnailFor points at.

    python tools/scene-thumbs/make_thumbs.py          # only the ones whose art changed
    python tools/scene-thumbs/make_thumbs.py --all    # every one

Idempotent: a thumbnail newer than its source is left alone.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SCENES = ROOT / "module" / "blank-inheritance" / "assets" / "scenes"
THUMBS = SCENES / "thumbs"
WIDTH = 480
QUALITY = 80

# The campaign map itself is the hub, never a destination, and at 12400px it is not worth thumbnailing.
SKIP = {"campaign-map"}


def main(argv: list[str]) -> int:
    rebuild_all = "--all" in argv
    THUMBS.mkdir(parents=True, exist_ok=True)
    written = 0
    for source in sorted(SCENES.glob("*.webp")):
        if source.stem in SKIP:
            continue
        target = THUMBS / source.name
        if not rebuild_all and target.exists() and target.stat().st_mtime >= source.stat().st_mtime:
            continue
        with Image.open(source) as image:
            image = image.convert("RGB")
            height = round(image.height * WIDTH / image.width)
            image.resize((WIDTH, height), Image.LANCZOS).save(target, "WEBP", quality=QUALITY, method=6)
        written += 1
        print(f"wrote {target.relative_to(ROOT)}")
    print(f"{written} thumbnail(s) written")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
