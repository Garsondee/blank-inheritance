# tools/title-sequence — the opening titles' renderer

Renders the campaign's opening titles (`design/opening-titles.md`) from the timeline in
`data/title-sequences/opening.json`: a cut list (R00–R111, the source's shot ids) plus layered clips. Python with
numpy, Pillow and OpenCV; ffmpeg for encoding (found through `BI_FFMPEG_DIR`, `~/tools/ffmpeg-*/bin` or `PATH`).

## Running it

```
python tools/title-sequence/render.py draft                          # the whole opening, with the music
python tools/title-sequence/render.py draft --no-preroll             # ...without the tape before frame 0
python tools/title-sequence/render.py draft --reduced                # the reduced-motion, no-flashing version
python tools/title-sequence/render.py flashcheck --file VIDEO.mp4    # photosensitivity check (WCAG 2.3.1)
python tools/title-sequence/render.py draft --from 12 --to 14        # a range (track seconds)
python tools/title-sequence/render.py compare --from=-0.5 --to=1 --slow 3   # source | ours, slowed down
python tools/title-sequence/render.py stills --compare --frames 8,9,10      # single frames as PNG
```

- **Times are track seconds**: 0 is the music's first note. The programme starts half a second earlier, so our
  frame 0 is -0.5 s and frame 12 is 0.0 s. Negative times need the `--from=-0.5` form.
- **The pre-roll.** The timeline's `preroll` puts three seconds of blank tape before frame 0, numbered back from
  frame -1: the set flicking through empty channels to the VCR's blue screen, PLAY, the tape's tracking issue and
  its meter, then clean black. A draft without `--from` opens on it; `--no-preroll` leaves it off, and a `--from`
  of -0.5 or later never includes it. Its sound (the channels' static, the tape's hiss) is laid into the
  lead-in's silence; the song starts where it always did.
- **Drafts play end to end.** Shots listed in the timeline's `built` are rendered from our clips. Every other shot
  shows the source, greyed and tagged REF. The shot id, the time and the bar/beat go in the black side bars,
  never on the picture; `--clean` leaves them off.
- Output goes to `artwork/title-sequences/opening/renders/` (gitignored).

## The timeline

- **Times.** Clips run from `start` to `end` in track seconds, or `startF`/`endF` in 24 fps frames. Frames are
  the natural unit for animation, the way an animator's exposure sheet is.
- **Keys.** A clip's parameters can change through `keys` (with `t` or `f`). Keys **hold** by default: each key's
  values stay until the next, exactly as a cel drawing is held. `"interp": "linear"` interpolates instead.
  `"visible": false` hides a clip from that key on.
- **Easing.** With linear keys, a clip's `"ease"` (`in`, `out` or `inout`) curves every move, so a move keyed only
  at its two ends is one smooth curve. Ingram's rule: never two speeds (the blueprint once had them).
- **Exposures.** A clip's `"on"` (2 or 3) holds each drawing for that many frames, as cel animation does. Its moves
  and its own clock (dust, video) step; its opacity and visibility don't, because fades and cuts are the camera's.
  The rule:
  - **drawn effects** on twos (speed lines, counters, tunnel lamps; the light column and a video's `hold` pace
    themselves)
  - **every camera move over art** on ones: pans, tilts, pushes and slides (Ingram: "Animate on 1s for the
    background"; on threes they looked jerky)
  - strobes, flashes and fades on every frame

  The file stays 24 fps.
- **No image in two shots** (Ingram: "If you use the same image twice it's better to just use a text card"). A test
  holds it: a second use of any image is a slate instead.
- **The finish.** The timeline's `"finish": {"vhs": {...}}` runs `fx.vhs` over every one of our frames. It
  gives:
  - colour smeared sideways
  - soft brightness with an edge ring
  - soft noise along the scan lines (each line shares some of its neighbours', so no one-pixel scratches)
  - a wobble
  - the torn lines at the bottom where the heads switch
  - lifted blacks and weaker colour
  - the odd dropout: a pale streak, soft above and below and tapered at both ends (`dropout_opacity`)
  - `halation`: the brightest parts glowing softly and warmly into their surroundings, as on film

  A `vhs_damage` layer adds a burst of tape damage at a moment: a tracking band (`band_y`, `band_h`, `tear`,
  `fizz`) and pale dropout streaks. A layer marked `"above_finish": true` is drawn after the finish, untouched
  by it (the VCR's captions).
- **Layer types** (`titleseq/timeline.py`):
  - **Ingram's art** (`titleseq/layers.py`):
    - `image`, a Midjourney still
    - `video`, a Midjourney clip, or a folder of numbered PNGs Ingram has keyed herself (they play with their own
      alpha, no matte)
  - **Type:** `text`, `logo` (a piece of the title logo, from `titleseq/logo.py`) and `logo_light` (the logo as
    rising blue light). Every `text` layer declares a `kind`:
    - `credit`: the only kind counted against the opening's needed roles
    - `diegetic`: text in the world, such as a stencil, a counter or a letterhead
    - `title`: a title card, whose words must come from the approved list

    An item with `"vertical": true` is set top to bottom, as the director card's 監督 is. Two more item options
    set type the way the source's title cards are:
    - `"box": [w, h]` fits the line exactly to that size, which makes the tall, condensed letters
    - `"weight"` thickens its strokes by that many pixels

    Five layer options finish it like film: `soften` (a soft edge), `mottle` (unevenness in the ink), `spray`
    (a stencil's overspray), `glow` with `glow_sigma` (halation round the letters), and `weave` and `flicker`
    (gate jitter and brightness flicker from frame to frame).
  - **Slates** (`slate`): a text-only card holding a shot's place until its art comes, set as a title card in its
    own right:
    - the shot's `code`
    - the `text` saying what belongs there, as a justified block of heavy capitals; a short lead-in before a
      colon is set small in amber above it
    - the `prompt` that makes its art
    - a field shaded in its `color`, with the code huge and faint behind

    With `"bg": false` it shows only the words, outlined, over an effect. Pale fields get dark ink. A test checks
    that every slate's prompt is in `design/opening-titles-prompts.md`.
  - **Effects** (`titleseq/fx.py`):
    - `solid`
    - `glow_dot`
    - `glint` (a four-point sparkle)
    - `cel_band` (a flat painted ring, optionally wobbly and dashed)
    - `droplets`
    - `airbrush_ring` (a white ring with a halo and a sprayed inner edge)
    - `bloom`
    - `wash` (`mix` toward a flat colour, or `screen` a light over the picture)
    - `beam`
    - `polygon` (a flat or blurred shape of light, or several drawn as one: hazard stripes, tunnel lamps)
    - `dust`: flying specks, or with `style: "hand"` hand-inked speed lines (tapered, uneven, re-drawn every
      `boil` frames). The origin `ox`/`oy` can be keyed to follow the camera's subject; `travel` replaces
      elapsed time so the flight can speed up smoothly; `swirl` curves the paths.
    - `vhs_damage` (see the finish, above)
    - `heat_haze`: high-summer shimmer over everything beneath it (`amp` pixels, ripples about `scale` pixels
      across, rising at `speed`), strongest below `y_hot` and gone above `y_cool`
    - `tape_blank`: blank tape (`strength`: how far off its tracking is, which rolls bands of white dashes up the
      picture; `snow`: an empty channel's static instead)
    - `osd`: the VCR's own caption in chunky green blocks with a hard shadow (`text`, `icon: "play"`, `bar` for the
      tracking meter, `x`, `y`, `anchor`, `block`, `color`)
    - `light_column`: the column of orange light the Frame stands in (`cx`, `width`, the `edge`, `core`, `streak`
      and `spark` colours, `speed`, and `boil`, which re-draws it every two frames by default; `bloom` for its hot
      heart, `vignette` for its shadowed sides)
    - `field`: a flat colour painted like a cel background (`gradient`, `vignette`, `mottle`)
    - `orb`: a cel-shaded glowing sphere with a rim light and a specular spot (the R47 core)
    - `ray_fan`: tapered rays fanning across angle `sectors`, growing with `unfurl` (the R35 wings, the R109 glare)
    - `arcs`: jagged lightning crackling off a ring (the rift)
    - `radar`: a phosphor scope with rings, a sweep and its afterglow, and `contacts` that flare as it passes
    - `data_bars`: a readout panel of glowing segmented bars
    - `streaks`: parallel speed lines running at an `angle` (the R32 charge)

    The drawn ones (`ray_fan`, `arcs`, `streaks`, `radar`, `data_bars`) re-draw every `boil` frames, twos by
    default.
  - **Drafts only:** `ref_still` (a source frame, as a stand-in under our effects)
- **Art layers** (`image`, `video`) are placed with a camera: `fit` (cover or contain), `zoom`, a focus point
  `cx`/`cy` (0–1 of the art) that lands on frame point `px`/`py`, `rot` in degrees clockwise, and `flip_x`. Then:
  - `crop` [x0, y0, x1, y1] frames only part of the art, as fractions of it. `cx`/`cy` then refer to the crop.
  - `matte` cuts the art out of the plain backdrop Midjourney painted it on (`titleseq/matte.py`):
    - `{"mode": "flat"}` for a grey or cream backdrop; `{"mode": "dark"}` for black ink on light paper
    - `edges` picks which borders to sample for the backdrop
    - `keep: "largest"` keeps only the biggest shape; `min_area` drops specks
    - `fill_holes` fills gaps inside the shape
    - `erode` and `feather` tighten and soften the edge
  - `"keyed": true` uses the file's own alpha (art cut out by hand, such as the Directorate's approved seal in
    `artwork/emblems/`), with no matte.
  - `fill` repaints the art one flat colour (a silhouette). `levels`, `gamma`, `tint`, `brightness` and `lift`
    grade it.
  - `blend` is `normal`, `screen` or `add`, at `opacity`.
  - A `video` also takes `speed` (its frames per our frame), `hold` (3 draws each picture for three of our frames,
    "on threes"), `mode` (`once`, `loop` or `pingpong`) and `offset` (the frame to start on).
- **Memory.** Stills are cached at full size in float, about 58 MB each, least recently used first, within
  `BI_TITLESEQ_CACHE_MB` (default 1200). A full draft touches some twenty of them; without the cap, one ran a
  16 GB machine out of memory.
- **Effects are measured look-alikes.** The R01 raindrop ring and the R05 burst were built from per-frame
  measurements of the source: radii, band widths, fill colours, halo falloff and wash colours. Each clip's `note`
  says what was measured.
- **The file is never synced to the Foundry server.** It isn't in `tools/module-sync`'s `SYNCED_CAMPAIGN_DIRS`,
  and a test holds that: its credits name who plays the Watcher (LEDGER #37).

## The reduced-motion version

`data/title-sequences/opening-reduced.json` and `titleseq/reduced.py` make the version for players who want no
flashing and gentle movement (Ingram: "a reduced motion and zero flashing version"). It is built from the full
timeline when it renders, never copied, so art swapped into the full opening turns up in it too.

- **`segments`:** the reduced cut. Each shows one full-opening shot (or a run of them, `shots: [first, last]`) until
  the reduced video's track time `until`, playing that shot's middle at `motion` of its pace or slower (0.5: half
  the travel at half the speed, centred on the middle of the move).
- **`dissolve`:** frames of cross-dissolve at every cut.
- **What's left out:** `drop_types` and `drop` remove whatever flashes; `layer_overrides` holds named clips still
  (for example, the pre-roll's tape stays locked); `text` turns off every card's flicker and weave; `finish` calms
  the tape.
- **Credits** are drawn at the reduced video's own time, so they still land on the music.

Every render's audio is levelled to the campaign's music level, −18 LUFS (`encode.levelled`: one measured gain,
so the song's dynamics are untouched). Every render also carries its index at the front (`+faststart`). Both are
for Foundry, where players hear the titles at their own music volume and stream them from the server
(`blank-inheritance-video/opening-full.mp4` and `opening-reduced.mp4`; the module's opening-titles feature plays
them).

`titleseq/flashcheck.py` checks a rendered video against WCAG 2.2's success criterion 2.3.1: no more than three
general flashes (opposing changes of at least 0.1 in relative luminance, with the darker below 0.8) and no more
than three saturated-red flashes in any second, in windows a quarter of a 10-degree field. `render.py flashcheck
--file VIDEO` reports the worst second.

## The source reference (drafts and comparisons only)

`titleseq/source.py` reads the source opening from the gitignored `artwork/in-tray/video/`, through the measured,
drift-corrected time map in `artwork/title-sequences/reference/source-op/analysis/`. Nothing about finished shots
needs it. Without it, a draft shows a plain slate for unbuilt shots, and `compare` refuses to run.

## Tests

```
python -m unittest discover -s test/title-sequence -t test/title-sequence
```

The tests cover:
- the clock and the bar grid
- blending, and the side bars
- every effect against its measured behaviour
- keyframe semantics and validation
- art layers: crops, cut-outs (no rim of old backdrop on the new picture), silhouettes, grades, video timing, and
  the memory cap
- the shipped timeline, which must still encode the measured design and Ingram's decisions:
  - the donut on exactly frame 8, the ring growing through frames 9–32, and the wash starting the frame after the
    big rings
  - the wordmark never moving
  - crane booms only on the source's six beam frames
  - every strobe crop covering the frame
  - every animation playing forward, never jumping back or freezing on its last frame while on screen
  - lead beat 3 as Ingram's animated newcomer, never the extreme close-up she cut
  - no full-frame picture ever showing its own edge
  - only the credits the opening needs
  - the heat haze under the rooftop's credit, and its pan
  - the pre-roll: the channel flick, the tracking issue, the captions above the tape, clean black before frame 0
  - every shot built, no image in two shots, camera moves on ones, title cards saying only the approved words, and
    every slate's prompt present in the prompts doc
  - the title cards set at the source's measured letter heights
- film type (boxes, weight, softness, halo, weave), the slates' justified blocks and dark ink on pale cards, every
  procedural effect (fields, the orb, rays, arcs, streaks, the radar, data bars) and the tape's halation
- the reduced-motion version: it tiles the song, uses far fewer and longer shots, halves and slows every move
  around its middle, keeps every lead beat and credit, plays the ripple as it is, drops everything that flashes,
  and dissolves its cuts
- the flash check: a strobe and a red flicker fail, while a slow alternation, a single cut and a small flashing spot
  pass
- the schema knowing every layer type
- render smoke tests (two frames of the programme, and the pre-roll's opening frames with their static), which
  need ffmpeg and the music file
