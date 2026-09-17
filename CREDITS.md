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
  - **The VST-plugin-scope licensing flag above is still unresolved as of this shipment.** This is a private, non-commercial, six-player home campaign module, never sold or redistributed as a standalone resource — but committing these three files to a public GitHub repo is the point at which "ask first" stops being purely hypothetical. Emailing Julian Behrens (contact@julianbehrens.studio) is still the right next step and has not been done yet.
