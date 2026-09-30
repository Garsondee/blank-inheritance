# Credits — third-party assets

A ledger of other people's work used in this project: who made it, under what
license, where the original lives, and where our own derived/processed
version ships from. Started 2026-09-16 at Ingram's request, specifically
because Noisehead's kits below are free gifts from an indie designer with no
money changing hands today — exactly the kind of use that's easy to forget to
credit later if the terms ever change or the work goes commercial.

Raw source files for everything below live under `/third-party/`
(gitignored — see that directory's note in `.gitignore` for why: it's someone
else's licensed work, not ours to redistribute raw, same treatment as
`gamesystems/`/`foundryvtt/`/`reference/`). Only the specific frames/crops we
actually use, processed into our own module assets, get committed — same
shape as `tools/font-pipeline/`'s upstream-TTF-to-shipped-woff2 split.

---

## UI control art

### Noisehead / VST-Design (Julian Behrens) — analog knob & control filmstrip bundle

- **Author:** Julian Behrens, [vst-design.com](https://www.vst-design.com)
- **Obtained:** 2026-09-16, free, directly from the author's own giveaway threads on the HISE forum
  ([Kit 01](https://forum.hise.audio/topic/6427/free-hise-filmstrips-analog-knob-kit-01-by-noisehead),
  [Kit 02](https://forum.hise.audio/topic/6652/free-hise-filmstrips-analog-knob-kit-02-by-noisehead))
- **Local copy:** `/third-party/noisehead-vst-design/` (gitignored — see above)
- **License:** full text at `Knob_Bundle_Licence.txt` in each kit folder (identical file in both). Summary:
  - Permits commercial and non-commercial use, with modification, **"in VST plugin projects."**
  - For open-source projects, credit to Julian Behrens is **required**.
  - Resale or redistribution as standalone design resources is prohibited (using the art as part of our own compiled/rendered UI is not that).
  - Attribution is "appreciated but not required" for commercial use.
  - No warranty; author may change the license for future bundle versions.
- **⚠ Scope flag, not yet resolved:** the license's permission grant is worded specifically for "VST plugin projects." A Foundry VTT module is not a VST plugin. Our repo is public on GitHub, which likely satisfies the separate "open source projects" credit requirement regardless — but the core usage grant doesn't cleanly cover our actual use case. Given the material was a personal, no-money gift, the respectful path is to email Julian Behrens (contact@julianbehrens.studio) before shipping anything built from this art in the live module, describing the actual use (a private, non-commercial six-player tabletop RPG aid) and asking for an explicit yes. Not yet done as of 2026-09-16.
- **Contents:**
  - **Kit 01 — "Analog Light"** (`kit-01-analog-light/`): 128-frame filmstrips for three knob sizes — big (180×180/frame), medium (100×100/frame), small (70×70/frame) — plus full-mockup preview images showing them in a real plugin skin (cream/silver brushed-metal panels, an amber-lit analog VU meter, black ridged knob caps with a white indicator line, four ADSR sliders). **Ingram's clear preference: "Kit 1's whole vibe is perfect."** Its `analog_knob_toolkit_gui.png` is now the project's standing **UI north star** — copied to `third-party/UI-NORTH-STAR-analog-light.png`, written up in full in `design/visual-identity.md`'s "The UI north star" section. Consult it before UI work, don't just read the summary.
  - **Kit 02 — "Takeshy Retrofuture"** (`kit-02-takeshy-retrofuture/`): a larger bundle — knobs (128 frames, 250×250/frame, three style variants), faders both orientations (150 frames), switches and buttons (small state-sprite sheets, not full filmstrips), a modwheel (61 frames) and a drum pad. Also includes separately-layered **scale rings and panel "holes"** (`Holes and Scales/`) and standalone **background panels** (`Background Images/`, including a transparent one) — i.e. built for exactly the layered fixed-backdrop + moving-part compositing approach, not just flat filmstrips. Darker gunmetal/red-accent styling; Ingram's read: "some nice switches and dials though, just not quite as nice of a backdrop."
- **How to use:** treat Kit 01's backdrop language (brushed steel, amber VU glow, black ridged knobs) as the closer match to this project's own palette (`design/visual-identity.md`) than Kit 02's. Kit 02's *mechanism* (separate scale/hole/background layers, not just filmstrips) is worth reusing even where its colours aren't — recolour those layers to our own brass/bakelite/phosphor-green rather than importing them as-is. Never commit the raw kit contents; only whatever gets cropped, recoloured or re-rendered into `module/blank-inheritance/assets/ui/`.
- **Shipped so far (2026-09-17, the V2 console build):** three filmstrips copied whole (no cropping needed — the sprite-strip technique reads frames via CSS `background-position`, not individual crops) into `module/blank-inheritance/assets/ui/filmstrips/`, all **committed to the public repo** since they're now compiled into the module's own CSS rather than sitting as raw source:
  - `knob-small.png` ← Kit 01's `hise_knob_small.png` (70×70/frame, 128 frames) — the six ability-score dials on the Console's Overview tab (`.bi-knob` in `bi-components.css`).
  - `switch-big.png` ← Kit 02's `switch_big.png` (94×29/frame, 2 frames: off/lit-red) — the Gear tab's equipped-state indicator (`.bi-toggle`).
  - `button-big.png` ← Kit 02's `big_button.png` (96×38/frame, 2 frames: off/lit-red) — the Director's Hub tab's launcher tiles.
  - Kit 01's big/medium knobs, Kit 02's faders, modwheel, small button/switch and the drum pad (explicitly excluded per Ingram's "not the synth pads") were not used and stay unshipped in `/third-party/` only.
  - `fader-vertical.png` ← Kit 02's `fader_vertical.png` (72×387/frame, 150 frames: frame 0 is the cap at the bottom, 149 at the top — verified by cropping both ends) — the three channel faders on the Sound Desk (`.bi-fader` in `bi-components.css`), added 2026-09-17.
  - **✅ LICENSING FLAG RESOLVED 2026-09-17.** Ingram checked the terms directly and confirmed: *"Kit 1 and Kit 2 are both free to use for non-commercial, I checked, no problems there."* This module is a private, non-commercial campaign aid, so the use is covered. The credit requirement for open-source projects is satisfied by this ledger in a public repo. The paragraphs above are kept as the record of the concern and how it was settled, not as an open question.
  - **The VST-plugin-scope licensing flag above was raised, and is now answered (see the line immediately above).** This is a private, non-commercial, six-player home campaign module, never sold or redistributed as a standalone resource — but committing these three files to a public GitHub repo is the point at which "ask first" stops being purely hypothetical. Emailing Julian Behrens (contact@julianbehrens.studio) is still the right next step and has not been done yet.

---

## Paper handouts (`design/handouts.md`)

### TT2020 — Fredrick R. Brennan

- **Author:** Fredrick R. Brennan, [github.com/ctrlcctrlv/TT2020](https://github.com/ctrlcctrlv/TT2020) (version 0.2.1)
- **License:** SIL Open Font License 1.1, so bundling and redistribution inside the module are fine.
- **What we use:** Style E (a well-inked ribbon) for everything typed on a handout, and one fixed
  damaged version of each lower-case letter from Style F (misstrikes) for a typewriter with a
  broken typebar. Chosen 2026-09-26 at Ingram's suggestion, so the damage on our documents comes
  from a real typewriter font rather than being drawn in CSS.
- **How it ships:** `tools/font-pipeline/build_fonts.py` downloads the TTFs from GitHub, subsets
  them (Latin, keeping the font's own glyph-cycling `calt`) and writes `assets/fonts/tt2020-*.woff2`.

## The opening titles (`design/opening-titles.md`)

### Fonts

Downloaded 2026-09-25 into `/third-party/fonts/` (gitignored). They are used only to render the opening's typography into video frames; no font file ships in the module.

- **Noto Serif CJK JP** (Black, Bold, Medium): Adobe and Google, [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk). SIL Open Font License 1.1.
- **Shippori Mincho B1** (ExtraBold), **Zen Old Mincho** (Black), **Reggae One**, **Dela Gothic One**, **Yuji Boku**: via [google/fonts](https://github.com/google/fonts). SIL Open Font License 1.1 each.
- **TeX Gyre Heros** (all eight cuts): GUST e-foundry, [gust.org.pl](https://www.gust.org.pl/projects/e-foundry/tex-gyre/heros). GUST Font License, a free license modelled on the LPPL.

All of these permit embedding in rendered output, so rendering them into a video is covered.

### Source material: private table use only

- **The song:** "Zankoku na Tenshi no Tēze" ("A Cruel Angel's Thesis"), the TV-length mix, from the *Neon Genesis Evangelion* soundtrack. It is copyrighted and not licensed to us. It is used as the opening's soundtrack **for private play at the table only**. It lives in `audio/in-tray/music/intro/` (gitignored) and is never committed, uploaded to a public place or distributed. The same goes for the "Fly Me to the Moon" versions in `audio/in-tray/music/outro/`, kept for the deferred outro.
- **The reference video:** the series' original opening titles, in `artwork/in-tray/video/` (gitignored). It is used only to study timing and composition. Its frames, stems and analysis stay in the gitignored `artwork/title-sequences/reference/`. **No frame of it appears in our video**, except as a Midjourney style reference, which Ingram attaches privately.
- **What this means for shipping:** the finished opening combines that song with our own art. It can be played to the table, and served from the private Foundry server to the six players. It must never be posted publicly or committed to this public repo.
- **Credited on screen** (Ingram, 2026-09-25: "it would be the right thing to do to give them credit, the real composers"). The opening names the people whose music the table hears, in the slots where the source credits its own:
  - R14: Shiro Sagisu (the *Evangelion* score), Masamichi Amano (the *Giant Robo* score, performed by the Warsaw Philharmonic Orchestra) and Maurice Jarre (the Directorate's theme, his waltz from *Is Paris Burning?*, 1966).
  - R15: the song's lyricist Neko Oikawa, composer Hidetoshi Sato, arranger Toshiyuki Omori and singer Yoko Takahashi.
  - The ending song is credited in the outro, which plays it.

  A credit is honesty, not a licence: it changes nothing above about private use.

## Session and scene music (`design/audio-system.md`)

### Source material: private table use only

The pipeline's raw sources, `audio/in-tray/music/` (gitignored), draw on three copyrighted, unlicensed
soundtracks, sorted by hand into folders named for dramatic use (`battle`, `briefing`, `playful`, and so
on). Processed copies live in `audio/library/` (also gitignored) and are served, loudness-matched, from
the private Foundry server to the six players only — never committed, uploaded anywhere public, or
distributed. Same private-table-use terms as the opening titles' song above.

- **Masamichi Amano — the *Giant Robo: The Day the Earth Stood Still* score**, performed by the Warsaw
  Philharmonic Orchestra. The bulk of the library: the campaign's tone is locked to this series
  ([[feedback_tone_giant_robo_not_eva]]), so its own score is the default in-session music. First named
  use: "Ashita e no Kibou" (track `05-masamichi-amano-ashita-e-no-kibou`), Ingram's pick for Scene 0,
  "From Up Here," 2026-09-27.
- **Shiro Sagisu — the *Neon Genesis Evangelion* score.** Filed under the `eva-3-*`/`OST1`/`OST2` names.
  Used freely for mood and cue variety (Ingram, 2026-09-17: the score itself is fine; only the series'
  *tone* is quarantined, per `design/research/evangelion/tone-guardrail.md`).
  `data/audio/review.json` records two corrupted `eva-3-*` sources, rejected and excluded from every
  pool.
- **Maurice Jarre — his waltz from *Is Paris Burning?* (1966)**, in
  `audio/in-tray/music/Directorate Theme Song - …mp3`. The Directorate's own theme.

Already credited on screen in the opening titles, above; the credit there stands for this broader,
in-session use too.
