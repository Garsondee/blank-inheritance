# stage-assets

Stages artwork out of `artwork/in-tray/` and into the Foundry module, **by stable id**.

```bash
python tools/stage-assets/stage_assets.py
```

Reads [`data/campaign/stage-demo.json`](../../data/campaign/stage-demo.json), resizes each image it
names, and writes the result to `module/blank-inheritance/assets/stage/<id>.webp`. Add `--check` to
see what it would do without writing anything.

Typical run: 14 images, ~50MB of source PNGs down to ~1.6MB of WebP, visually identical at the sizes
they are displayed at.

## Why the id matters

`artwork/in-tray/` holds real material under names like
`garsondee_a_japanese_1050s_military_doctor_portrait_1950s_han_172ffcd7-….png` — a prompt fragment
and a UUID. **Nothing in there maps a picture to a character**, which is the dependency
[`design/theatre-of-the-mind-staging.md`](../../design/theatre-of-the-mind-staging.md) §7 names
outright.

The manifest fixes that with one field: every image gets a **stable id**, and everything downstream
— scenes, actors, stylesheets — points at `assets/stage/<id>.webp`. When the real asset pipeline
(`ideas/entries/asset-review-pipeline.json`, status `accepted`) reorganises the in-tray and every
source filename changes, only the manifest's `source` fields move.

## What this is not

It is not that pipeline. No cataloguing, no deduplication, no "assigned once, never double-used"
bookkeeping. It resizes what a hand-written manifest tells it to, and refuses to exit 0 if a source
is missing — a scene pointing at an image that was never written renders as a blank frame with no
error anywhere.

## Output is not committed

`module/blank-inheritance/assets/stage/` is gitignored, like `artwork/` itself: the sources are the
user's own art library, and derived copies do not belong in git either. `tools/module-sync/` pushes
from disk rather than from git, so a real push carries them to the server regardless. Regenerate a
fresh checkout with the one command above.

## Tests

```bash
npm run test:stage-assets
```

Python stdlib `unittest`, run separately from `npm test` (which stays Node-only), the same
arrangement as `tools/city-map`. The assertions worth knowing about cover the two failures that are
silent in a running game: an **id collision** (one image quietly overwriting another, so two
characters share a face) and a **missing source**.
