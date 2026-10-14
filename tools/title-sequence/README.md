# tools/title-sequence — the opening titles' renderer

Renders the campaign's opening titles (`design/opening-titles.md`) from the timeline in
`data/title-sequences/opening.json`: a cut list (R00–R111, the source's shot ids) plus layered clips. Python with
numpy, Pillow and OpenCV; ffmpeg for encoding (found through `BI_FFMPEG_DIR`, `~/tools/ffmpeg-*/bin` or `PATH`).

## Running it

(Needs `opencv-python` and a full ffmpeg build; point `BI_FFMPEG_DIR` at its `bin` folder. `tljson.py` reads and
writes `data/title-sequences/*.json` in their own layout, so a scripted edit shows in git as the lines it changed.)

```
python tools/title-sequence/render.py draft                          # the whole opening, with the music
python tools/title-sequence/render.py draft --no-preroll             # ...without the tape before frame 0
python tools/title-sequence/render.py draft --reduced                # the reduced-motion, no-flashing version
python tools/title-sequence/render.py flashcheck --file VIDEO.mp4    # photosensitivity check (WCAG 2.3.1)
python tools/title-sequence/render.py card episode-c1e1-mothers-maiden-name   # an episode's title card
python tools/title-sequence/render.py draft --clean --out .../opening-full.mp4  # a final: nothing in the side bars
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
  - **The Directorate's screens** (`titleseq/hud.py`, round 14), drawn in the orange-on-black of a control room:
    - `cast_card`: one of the six players' cards in the verse: a portrait of any shape (`src`, `crop`, `focus`,
      `zoom`, `zoom_to`: nothing is cut out, and the picture always covers its window) in a slanted window on `side`
      `l` or `r` that assembles from slats, a reticle at `target` in the card's `accent` colour, and plates for
      the `player` (`kana`, `roman`) and the character (`name`, or null while it is not made: it reads 未登録
      UNREGISTERED). `dur` and `out` set the card's length and how long it takes to leave; `calm` drops the
      beat's brightness pulse (the reduced-motion cut). To put a player's real portrait in, change the clip's
      `src` and its `layer.name`.
    - `tab_panel`: a control panel seen at an angle: `rows` of chevron tab pairs, each locked (red, latched) until
      an event in `events` (`{t, rows, to}`: `to` 1 releases, 0 locks, `t` in track seconds) moves it, passing
      through white to green. `quad` is where the panel's four corners land in the frame, so a keyed `quad` is
      the camera.
    - `status_wall`: a wall of status plates, rulers, crosshairs and loops that the camera crosses: `x` is the
      view's left edge (keyed, it is the pan), `blur` the smear of speed in pixels, `label` and `focus_x` the
      plate it comes to rest on.
  - **The finale's layers** (`titleseq/finale.py`, round 15):
    - `door_open`: the vault door splitting along its seam and sliding apart into light. `src`, `open` (0 shut,
      1 wide), `circle` [cx, cy, r] (the doorway, as shares of the picture; r of its width), `seam` (x of the line the
      leaves part along), `rays`. It takes the usual camera (`zoom`, `cx`, `cy`), and the effect is built in the
      picture's own pixels first, so a push in carries the leaves, the light and the rays with it.
    - `scope_hud`: a radar scope and a lock-on reticle over a picture. `scope` {cx, cy, r}, `contacts` (range share,
      bearing), `target_x/y/w/h` (the reticle's box: keyed, it follows a pan), `lines` typed on from `lines_at`
      seconds a `line_gap` apart, `lock` (when the reticle has closed), `sweep` (degrees a second). Time is measured
      from the clip's own start.
    - `stained_wall`: the end card's hangar wall painted in code (`color`, `seed`, `brightness`: key it from 0 to
      come up out of black).
    - `motes`: dust or embers drifting through a lit scene, in three layers of depth (`n`, `size`, `speed`,
      `direction`, `color`, `strength`, `seed`).
    - `lens_flare`: a light's flare, from `cx`, `cy`: a glint, an anamorphic streak that fades along its length
      (`streak`, `thickness`) and a few warm ghost discs (`ghosts`), all scaled by a keyable `strength`.
  - **Wipes and writing-on for pictures** (`image` and `video` layers): a polygon `mask` (frame pixels, a list of
    polygons; key it and it is a wipe, and `mask_blur` softens its edge), and a soft `reveal` {box, angle, soft, p}
    that writes the picture on from one side as `p` goes 0 to 1 (key `reveal_p`, since a clip's keys move numbers,
    not dictionaries).
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
  - `halftone` (`{"cell": 9}`, with `angle`, `ink`, `paper`, `softness`) prints the graded art as manga
    screentone (`raster.halftone`): round ink dots whose area follows the darkness, on a grid laid on the frame, so
    the dots stay one size however deep a crop zooms. The R06 smoke and cranes wear it.
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

## Length, the tail, and title cards

- **Length.** A timeline runs for its track's length (`clock.TRACK_LENGTH`), or, with `"track": null`, for its
  own `length`, plus any `tail`: seconds held after the music so the end can fade out slowly (the opening has five,
  under `tailSound`, a tape hiss that fades). `timeline.length(doc)` and `timeline.end_frame(doc)` give it; the
  draft, the reduced cut and the encoder (which pads the audio to the picture) all follow it.
- **Episode title cards** (`titleseq/card.py`). Ingram: "we watch the intro video, then we cut to the episode
  title, then we fade into the first scene automatically." One design, `data/title-sequences/episode-card.json`
  (a 7.5-second timeline with no track: black, a hard cut to the card, a hold, a fade to black), is filled in per
  episode: its English title from the episode's own file, its number and Japanese lines from
  `data/title-sequences/episode-titles.json`. `render.py card <episode id>` renders it, clean, into
  `artwork/title-sequences/episode-titles/<episode id>.mp4`; Foundry plays it from
  `blank-inheritance-video/episode-titles/<episode id>.mp4`. A new episode needs one entry in the titles file.
- **Finals are clean.** Drafts label the side bars (shot, time, bar and beat) for review; the files that go to
  Foundry are rendered with `--clean` (Ingram: "that's not meant to go into the final video").

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
  - no full-frame picture ever showing its own edge, and no keyed move jumping (every value glides from its first key)
  - the opening finished from the art in hand: no slates, turned-down art never used, Taka in front of a real place
  - the head's eyes flaring as it turns (no cut to eyes in the dark), the new star panning slowly with its speed
    lines from its sun, R35 as art, the welder long enough to read, the smoke and cranes in halftone, and the
    five-second tail fading to black
  - only the credits the opening needs
  - the heat haze under the rooftop's credit, and its pan
  - the pre-roll: the channel flick, the tracking issue, the captions above the tape, clean black before frame 0
  - every shot built, no image in two shots, camera moves on ones, title cards saying only the approved words, and
    every slate's prompt present in the prompts doc
  - the title cards set at the source's measured letter heights
- the Directorate's screens (`test_hud.py`): a card draws nothing before it begins and is gone by the end of its
  clip, mirrors on the other side, never smears a portrait pushed to its edge; a panel's pairs start red, turn
  green on an event and lock again on the next; the wall pans, smears at speed and rests sharp
- the round-14 cut: the sortie build's cuts land on the drum stem's kicks, the six cards are the same length, the
  faces between the verse and the launch are real people, and the vehicles each get two beats
- the finale's layers (`test_finale.py`): the door shut is just the picture and fills with light as it opens, its
  leaves slide apart from a seam, a push carries it; the scope snaps on, the reticle closes and follows a keyed
  target, the readout types on a line at a time; the wall, the dust and the flare; the mask and the reveal
- the round-15 finale: one shot to each of the last four bars, cut on the bar lines; four pictures and a card; the
  reticle on the walker all through the pan; the stripe wiping the pilot away in step; the credit gone before the
  light; the door cracking on beat three; the plate settling and a flare on the crash; the studio's mark written on
  as the music stops and seen whole in the silence
- film type (boxes, weight, softness, halo, weave), the slates' justified blocks and dark ink on pale cards, every
  procedural effect (fields, the orb, rays, arcs, streaks, the radar, data bars) and the tape's halation
- the reduced-motion version: it tiles the song, uses far fewer and longer shots, halves and slows every move
  around its middle, keeps every lead beat and credit, plays the ripple as it is, drops everything that flashes,
  and dissolves its cuts
- the episode title card: what it says, its length, black at both ends, its file name, and every titled episode
  existing
- the halftone (a grey half ink in dots, blacks solid, whites paper) and a trackless timeline's hiss
- the flash check: a strobe and a red flicker fail, while a slow alternation, a single cut and a small flashing spot
  pass
- the schema knowing every layer type
- render smoke tests (two frames of the programme, and the pre-roll's opening frames with their static), which
  need ffmpeg and the music file
