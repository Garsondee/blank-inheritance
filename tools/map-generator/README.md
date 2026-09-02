# Map generator

Procedural generator for the campaign's coastline and (eventually) its city.
Stages 1-2 of the plan in
[`ideas/entries/procedural-city-map-generator.json`](../../ideas/entries/procedural-city-map-generator.json)
— read that first for the full design, the research it is built on, and the
staged plan. This README covers what exists **now** and how to run it.

```bash
node tools/map-generator/cli.mjs --seed 1950 --out tools/map-generator/out/coast-1950
```

Writes `<out>.svg` (the map) and `<out>.json` (stats and the sites the city
stage will consume). Roughly 45 s at the default 512×512.

| flag | meaning |
|---|---|
| `--seed N` | The world's seed. Same seed, same world, always. |
| `--out PATH` | Output path without extension. |
| `--title TEXT` | Cartouche title. |
| `--size N` | Grid cells per side (default 512). |
| `--iterations N` | Phase 1 erosion steps. |
| `--water F` | Fraction of the map that should be sea (default 0.42). |
| `--analysis` | Overlay harbour sites (red) and river mouths (yellow). |
| `--amplify N` | Also run stage 2: amplify the DTM N-fold and write `<out>.dtm` (Int16) plus a preview PNG. Use 8 or more. |
| `--quiet` | No progress output. |

Measured end to end (seed 1950): 512² physics at 25 m in 27 s, amplified
×8 to 4096² at 3.13 m in a further 22 s, 857 MB peak, a 32 MB Int16 DTM, and
1,360 km of 1 m contour line in the first 20 m of relief alone.

## What it does, and why it does it that way

**It does not draw a coastline.** It erodes a landscape against a low base
level, then raises the sea over the result. A ria coast — リアス式海岸, the
drowned-valley shoreline that defines most of Japan's non-plain coast — *is* a
river valley network flooded by post-glacial sea level rise, so simulating that
gives the deep branching inlets, the sheltered harbour at every valley mouth,
the headlands between them, the offshore islands, and the submarine canyons all
at once and all consistent with each other. Authoring that shape directly is
both harder and worse, because the parts would not agree.

Terrain structure comes from physics, not noise. Perlin/fBm produces
cloud-shaped blobs with no drainage structure, and the eye reads that as fake
long before it can say why. Instead: an uplift field plus the stream power law,
`dh/dt = U − K·A^m·S^n`, solved with Braun & Willett's (2013) implicit scheme —
unconditionally stable, O(n), a few hundred steps for a whole mountain range.
Hillslope diffusion rounds the ridge crests; a Davy & Lague (2009) deposition
term builds the valley floors.

**Patch-based synthesis (WaveFunctionCollapse, Model Synthesis, Zhou et al.
2007) is deliberately not used for structure.** It is locally constrained by
definition, so it cannot guarantee a global property like "this river reaches
the sea". It belongs in a later texture-amplification pass, not here.

### Stage 2: amplification

Erosion can afford roughly 3-6 m cells, but the map has to be drawn and played
at 1-3 m. `terrain/amplify.mjs` covers the gap in three steps: Catmull-Rom
upsample, flow-aligned detail synthesis, then a restore pass that puts the
coarse structure back.

The detail is generated as ordinary isotropic noise and then smeared along the
local flow lines by **line integral convolution**, which is what makes it read
as rills running downhill rather than static sprinkled over a landform.
Amplitude is modulated by terrain descriptors, so flat ground gets nothing,
steep ground gets everything, and alluvial floors (low height-above-drainage)
stay flat because alluvium is flat.

The restore pass guarantees the invariant everything downstream depends on:
**block-averaging the fine grid reproduces the coarse grid** (measured 0.016 m
mean, 0.34 m max at full scale). Without it, synthesised detail could shift a
ridge or a shoreline and every site chosen from the coarse model — harbour,
river mouth, town site — would quietly disagree with the terrain.

Two findings from building it, both recorded in the module and its tests:

- **Amplification only works at a LARGE factor.** The restore pass deletes
  anything whose block average is non-zero, so detail must sit between the fine
  grid's Nyquist limit and about half a coarse block. At factor 4 that band is
  empty and amplification measurably does nothing. Use 8 or more.
- **The planned fine-scale erosion refinement is counterproductive and is off by
  default.** Measured roughness gain was 2.24× with it off, 1.86× at the
  intended settings, 1.51× with the timestep cranked 50×. It runs with no
  uplift against a fixed base level, so it has no driving force and can only
  relax the surface — it smoothed away the detail it was meant to sharpen.
  Making it work means giving it something to cut toward.

### The two erosion phases

Phase 1 builds its coastal plain at the glacial lowstand — and the
transgression then drowns exactly that plain, leaving mountains dropping into
deep water and nowhere flat for a town. Correct physics, useless map.

Phase 2 is the fix and is also the real history: after the sea rose, rivers
spent the Holocene refilling the drowned valleys, silting bay heads into flat
ground and building deltas across the shallows. Every major Japanese coastal
city stands on that alluvium. It runs against the *new* shoreline as its base
level, with deposition made transport-limited so alluvium fills flat ground
instead of blanketing hillsides. It is what produces the harbour and the town
site as two parts of one landform rather than two unrelated decisions.

## Layout

```
core/       rng.mjs (+ hierarchical subSeed), field.mjs, heap.mjs,
            noise.mjs, distance.mjs (exact Euclidean distance transform)
terrain/    uplift.mjs    tectonic setup — the only place art direction enters
            flow.mjs      Priority-Flood depression filling, D8 routing, drainage area
            erode.mjs     the landscape evolution model
            sealevel.mjs  the transgression, ocean-vs-lake, depth bands
            bathymetry.mjs wave exposure, silting, shore platform, shelf break
            contour.mjs   marching squares + Douglas-Peucker
            descriptors.mjs slope, aspect, curvature, height-above-drainage
            amplify.mjs   stage 2: coarse physics grid -> fine detail grid
            generate.mjs  the orchestrator; DEFAULT_PARAMS lives here
render/     png.mjs       minimal zlib PNG encoder (no dependencies)
            hillshade.mjs Horn relief + hypsometric tint
            svg.mjs       composes the layers
cli.mjs
```

Tests: `test/map-generator/` (104 tests). `npm test` runs them with everything
else.

## Two things to know before changing it

**Every parameter is physical, and the defaults are tuned, not guessed.** The
tuning target is the stream power law's equilibrium slope, `S = U / (K·A^m)`,
evaluated at both ends of the drainage network: ~37% on a hillslope, ~2% in a
1 km² channel. That is the Japanese coastal profile. Softening `K` or slowing
uplift silently produces rolling English downs, and no colour grading rescues
it. `DEFAULT_PARAMS` in `terrain/generate.mjs` records the arithmetic.

**The output is a model, not a picture.** The renderer is one consumer of it.
Damage, the city, and the Foundry bake are all later consumers, and the whole
updatability story — regenerate from a seed, replay an append-only damage log
on top, never destructively edit — depends on that separation and on
determinism. `test/map-generator/generate.test.mjs` guards both.

## What is not built yet

Stages 3-9 of [design/map-generation.md](../../design/map-generation.md):
biomes, the LOS service, tensor-field streets, blocks and parcels, buildings
with terrain write-back, the operation log and sea forts, and the tiled render
plus Foundry bake. Nothing here should be taken as settled for those — see the
idea entry's open sub-questions.
