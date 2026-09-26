"""Stage scene backdrops out of the asset registry and into the Foundry module.

`data/campaign/scene-set.json` names every real Foundry Scene this campaign
ships, and each one points at a background by a stable `art` id -- a filename
stem the generator (core/generators/stage-scene.mjs) resolves against
`artRoot` ("modules/blank-inheritance/assets/scenes") to build the actual
background path a Scene document gets. Nothing writes the picture there on
its own: the registered master is a multi-megabyte PNG living wherever
asset-registry.json says it does (artwork/scenes/ or artwork/locations/),
and a Scene needs a small WebP sitting at that exact resolved path.

This is that step, and it is driven by the registry rather than by a second
hand-written manifest, the same reasoning tools/token-ring/crop_ring_subject.py
already applies to portraits: the registry is the one durable record that an
assignment happened at all, so a second list naming the same pictures would
just be one more place for the two to quietly disagree.

Unlike a portrait, a scene backdrop needs no circle-crop or subject framing --
it is already composed as a wide establishing shot, so this only resizes (long
edge capped, same 1920px figure tools/stage-assets/ already uses for
backgrounds) and re-encodes to WebP.

MULTIPLE SCENES CAN SHARE ONE BACKDROP ON PURPOSE. Four school scenes reuse
three room pictures between them (a school has a handful of real rooms), so
this stages each DISTINCT `art` id once regardless of how many scene-set
entries reference it, rather than once per scene.

Usage:
    python tools/stage-scenes/stage_scenes.py            # stage everything
    python tools/stage-scenes/stage_scenes.py --check    # report, write nothing

Tested by test/stage-scenes/test_stage_scenes.py (Python stdlib unittest, run
separately from `npm test`, exactly like tools/token-ring's suite).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass

from PIL import Image

# Long edge of a staged backdrop. Shown as a whole Scene background rather
# than in a small UI frame, so this is far bigger than a portrait's 512 --
# matches tools/stage-assets/'s own MAX_EDGE["background"] figure exactly, for
# one consistent answer to "how big does a background need to be" across the
# whole art pipeline rather than two tools disagreeing on it.
MAX_EDGE = 1920

# Same figure as every other WebP encode in this project (tools/stage-assets/,
# tools/token-ring/): visually indistinguishable from the source at this size,
# a fraction of the bytes.
WEBP_QUALITY = 86

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_REGISTRY = os.path.join(REPO_ROOT, "data", "campaign", "asset-registry.json")
DEFAULT_SCENE_SET = os.path.join(REPO_ROOT, "data", "campaign", "scene-set.json")
DEFAULT_OUT = os.path.join(REPO_ROOT, "module", "blank-inheritance", "assets", "scenes")

# A scene's `art` can be registered under either category -- a picture made
# for one specific scene lives under "scenes"; a room reused across several
# scenes (the school) lives under "locations", same convention already
# established for the art itself.
ELIGIBLE_CATEGORIES = {"scenes", "locations"}


@dataclass(frozen=True)
class Item:
    """One backdrop to stage: its stable art id and where its master lives."""

    stable_id: str
    source: str

    @property
    def out_name(self) -> str:
        return f"{self.stable_id}.webp"


def plan(scene_set: dict, registry: dict) -> list[Item]:
    """Every DISTINCT art id scene-set.json actually references, resolved to its
    registered master file.

    Returns a plan rather than doing the work, same reason as every other tool
    in this pipeline: the id collection and the registry lookup are testable
    without touching a filesystem or Pillow. Raises ValueError naming every
    unresolvable id at once rather than one at a time, so a GM half an hour
    before a session sees the whole list in one run.
    """
    by_id = {a["id"]: a for a in registry.get("assets", []) if a.get("category") in ELIGIBLE_CATEGORIES}

    # An `adoptSceneNamed` entry is the one-time bridge onto a real Scene a
    # human already built in Foundry (scene-set.schema.json's own doc comment
    # -- the production "Campaign Map" is the confirmed case). The adapter
    # (foundry/scene-build.mjs) never applies plan.data's background to an
    # adopted scene at all, on purpose, so its `art` id is vestigial: staging
    # it would burn real work on a picture nothing ever displays, for a hub
    # map that is its own separate, much larger rendering pipeline
    # (tools/city-map/) rather than a hand-picked backdrop.
    scenes = [s for s in scene_set.get("scenes", []) if not s.get("adoptSceneNamed")]
    wanted = sorted({s["art"] for s in scenes if s.get("art")})
    items: list[Item] = []
    missing: list[str] = []
    for art_id in wanted:
        asset = by_id.get(art_id)
        if not asset:
            missing.append(art_id)
            continue
        items.append(Item(stable_id=art_id, source=asset["path"]))

    if missing:
        raise ValueError(
            f"{len(missing)} scene-set art id(s) have no matching asset-registry entry "
            f"(category scenes/locations): {missing}"
        )
    return items


def stage_one(item: Item, root: str, out_dir: str) -> tuple[str, int, int]:
    """Resize and WebP-encode one backdrop. Returns (out_path, before_bytes, after_bytes)."""
    src_path = os.path.join(root, item.source)
    before = os.path.getsize(src_path)
    with Image.open(src_path) as im:
        im = im.convert("RGB")
        w, h = im.size
        longest = max(w, h)
        if longest > MAX_EDGE:
            scale = MAX_EDGE / longest
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, item.out_name)
        im.save(out_path, "WEBP", quality=WEBP_QUALITY)
    after = os.path.getsize(out_path)
    return out_path, before, after


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--registry", default=DEFAULT_REGISTRY)
    parser.add_argument("--scene-set", default=DEFAULT_SCENE_SET)
    parser.add_argument("--out", default=DEFAULT_OUT)
    parser.add_argument("--root", default=REPO_ROOT, help="base directory asset-registry.json paths are relative to")
    parser.add_argument("--check", action="store_true", help="report what would be staged, write nothing")
    args = parser.parse_args(argv)

    with open(args.registry, "r", encoding="utf-8") as fh:
        registry = json.load(fh)
    with open(args.scene_set, "r", encoding="utf-8") as fh:
        scene_set = json.load(fh)

    items = plan(scene_set, registry)

    if args.check:
        print(f"{len(items)} backdrop(s) would be staged to {args.out}:")
        for item in items:
            print(f"  {item.stable_id:<40} <- {item.source}")
        return 0

    total_before = total_after = 0
    for item in items:
        try:
            out_path, before, after = stage_one(item, args.root, args.out)
        except FileNotFoundError:
            print(f"  !! source missing for {item.stable_id}: {item.source}")
            continue
        total_before += before
        total_after += after
        pct = round((1 - after / before) * 100) if before else 0
        print(f"  {item.stable_id:<40} {before // 1024:>6}KB -> {after // 1024:>5}KB  (-{pct}%)")

    print(f"\n{len(items)} backdrop(s) staged -> {args.out}")
    if total_before:
        print(f"total: {total_before / 1_000_000:.1f}MB -> {total_after / 1_000_000:.1f}MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
