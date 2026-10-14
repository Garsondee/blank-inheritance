# Visual Identity — one CSS system for the whole module

**Status: standing directive, issued 2026-09-05.** Not a proposal. The user's framing:
unify the CSS of Foundry itself, of the SF2E game system, and of everything we produce
(journals, UI elements, character sheets) behind a single strong visual identity.

> "I'd strongly prefer Giant Robo esque retro futuristic looking UI and this look should
> carry through from the mimetic interface all the way to the general CSS/HTML of the
> whole system. We even change character sheets to match our style."

This document is the design record. The implementation is three CSS files in
`module/blank-inheritance/styles/` and a reviewable prototype at
[design/ui/style-prototype.html](ui/style-prototype.html).

Related tracked ideas, all `accepted`, all of which this serves rather than replaces:
`in-scene-ui-panel-mimetic-controls` (the bar itself), `phone-app-suite`,
`terminal-login-landing-page`, `in-scene-character-portrait-frames`.

**Scope boundary, added 2026-09-06.** This document decides how things *look*.
[design/ux-doctrine.md](ux-doctrine.md) decides *what is there, how big it is, and where it
lives* — and it wins when the two conflict, because a console that looks right and makes a turn
slower has failed. In particular, that doctrine's Law 13 ("the chassis is for what happens inside
a turn; everything else lives in the terminal") is the placement rule for every future module, and
its §9 lists specific promote/fix/move/cut verdicts on the modules this document built.

---

## 1. The aesthetic, stated once

Giant Robo by way of a 1950s Japanese naval-industrial ministry. Every surface is a
machined object: hammered steel plate, bone-bakelite label inlays, brass bezels, phosphor
glass. Nothing is flat, nothing floats, everything is bolted to something else.

This sits directly on top of `campaign-arc.md`'s locked tone — 1950s Japan, period
industrial machinery rather than sleek sci-fi, the sea-fort Directorate. The panel should
read as government hardware built by people who had to justify its cost.

### The UI north star — standing directive, 2026-09-16

Ingram's own words: *"This image needs to be like a UI north star. Put the image in a
special place, refer to it often, compare your UI building efforts with how this looks.
Get as close as possible to this appearance by heading towards this image, it's use of
text, space, colour, shape and controls."*

The image is Noisehead/VST-Design's "Analog Light" plugin mockup, from the free knob kit
recorded in [CREDITS.md](../CREDITS.md) — **not committed** (it's third-party licensed
material, see that entry's scope flag), but kept locally and permanently at
`third-party/UI-NORTH-STAR-analog-light.png`. Open it before any UI work and check new
work against it directly, the same way a contract test checks output against a schema.
This is a standing instruction, not a one-time reference — it is expected to be consulted
repeatedly across sessions, not read once and summarized away.

**What to take from it, against the five things Ingram named:**

- **Text.** One confident wordmark (a clean geometric sans, "Analog" over a small tracked
  "LIGHT"), then two more sizes and no others: a medium-weight label per control cluster
  (`Reverb`, `Filter and Gain System`, `Phaser`), and a smaller, lighter label per control
  (`Mix`, `Size`, `Damp`). Numerals (the 0–10 scale, the VU meter's −20…+3) sit in a
  distinct thin technical face. Every label is close to what it names and nothing is
  crowded — a rule this project's own two-register type system (§1b below) already backs.
- **Space.** A strict tripartite grid — left third / centre spine / right third — each
  holding its own sub-grid of rounded panel clusters, with real padding inside every
  cluster and real gaps between them. Nothing touches the outer bezel. The whole unit
  reads as one mounted object (dark chassis frame, a soft drop shadow) rather than a flat
  sheet of controls — compare this project's own chassis/pod language in §3.
- **Colour.** Two honest metal tones do almost all the work — a cool brushed-silver zone
  and a true-black zone — and exactly **one** warm, saturated colour (the amber VU glow,
  echoed in the Drive switch's accent line) carries every reading that matters. That is
  precisely this project's own "one dishonest colour" rule, one section below — the north
  star is independent proof the rule produces a genuinely good-looking panel, not just a
  defensible one.
- **Shape.** Consistent rounded-rectangle clusters recessed into the chassis; circular
  knobs rendered with real dimension (a domed top, a light source, a cast shadow) rather
  than a flat disc; a printed radial tick scale around the one knob that needs precision.
  Every shape in the image is trying to look **machined**, never drawn.
  Never faked with gradients and box-shadows the way `design/ui/style-prototype.html`
  (V1) had to — the standing plan (`design/craft-library.md`'s sibling infrastructure
  decision, made the same day as this directive) is rendered/photographed control art,
  precisely so this level of shape fidelity is reachable at all.
- **Controls.** A knob's own highlight tells you which way is "up" before you read a
  number. The one knob with a real, wide numeric range (`Filter and Gain System`, 0–10)
  is the one knob given a printed scale around it — exactly Law 1 of `ux-doctrine.md`
  (*"show the number that will actually be rolled"*) applied to a physical dial. The Drive
  toggle reads as a real rocker, not a checkbox; the ADSR sliders have a visible track and
  a distinct cap. Nothing on this panel is ambiguous about how to operate it.

**How to use this in practice:** when a new control ships, put a screenshot of it next to
this image before calling the work done. If it doesn't hold up next to "Analog Light,"
it isn't finished — this is the same discipline as the control workshop gallery already
planned (§6), just applied by eye, every time, not only at review checkpoints.

### The one dishonest colour

The palette is deliberately honest: steel, brass, bone, signal red, phosphor green, and
an amber caution. Exactly one colour in the system does not belong to that century —
**Resonance violet** (`--bi-resonance`).

It is reserved, without exception, for Claimant telemetry, a Claimant's token ring included.
(The name is historical: the colour also marked Resonance, Bleed and Anchors, all cut on
2026-09-20, and code still uses the token name.) It is the one reading on the console that
the console was never built to take. Spending
it on ordinary UI is the single easiest way to wreck this design system, because it is
the only strange colour the palette has and its strangeness is entirely relative to the
honesty of everything around it.

---

## 1b. Typography: two registers

Type does a functional job here on top of looking good. It tells a player at a glance
whether they are reading something a **person wrote** or something a **machine measured**.

| Register | Token | Face | Used for |
|---|---|---|---|
| Paper | `--bi-font-document` | Latin book serif → Mincho | Directorate documents, journals |
| Paper | `--bi-font-mincho` | Mincho only | Japanese-only runs, vertical margins |
| Paper | `--bi-font-gothic` | Yu Gothic / Noto Sans JP | Stamps, hard administrative markings |
| Paper | `--bi-font-typewriter` | Courier | Control numbers, form fields, dates |
| Glass | `--bi-font-legend` | Bruno Ace | Engraved panel legends |
| Glass | `--bi-font-readout` | Technical mono | Every number a machine reports |

A document and a readout must never be mistakable for one another. Collapsing the two
registers into one face destroys the distinction and is caught by a test.

**Kanji is structural, not decorative.** Vertical margin runs (`writing-mode:
vertical-rl`), large section marks, and classification stamps using the real Japanese
document markings: 公開 / 部外秘 / 秘 / 機密 / 極秘. Courier for the bureaucratic
furniture is not a stylistic guess — it is the actual period face for a typed official
document.

### The fonts are bundled — 22 families, measured, not hoped for

Pass 2 discovered by measurement that `document.fonts.check()` lies (it answers "can this
stack render?", not "is this installed"), and that **Yu Mincho, MS Mincho, Noto Serif JP
and Shippori Mincho were all absent** from a default English Windows install. Pass 3
removed the guesswork entirely: every face is now bundled.

`tools/font-pipeline/build_fonts.py` reads `fonts.json`, downloads from Google Fonts,
subsets, converts to woff2, and writes `module/blank-inheritance/assets/fonts/` plus the
generated `bi-fonts.css` and a `receipt.json`. **22 families, 34 files, 6.9 MB**, all SIL
Open Font License so redistribution inside the module is fine.

**Why a pipeline and not checked-in binaries:** a Japanese font is enormous — Shippori
Mincho's full TTF is 8.3 MB per weight, and Google serves the woff2 as *122* unicode-range
slices, which is unusable for bundling. Subsetting is mandatory, and once it is mandatory
it has to be reproducible. A binary nobody can regenerate is a liability.

**The size argument, measured** (Shippori Mincho 400):

| what | bytes |
|---|---|
| full TTF from Google | 8,342,816 |
| subset: latin + kana + CJK common | 2,852,664 |
| subset: latin + kana only | 59,644 |
| subset: latin + kana + our UI vocabulary | 83,156 |

So exactly **one** face carries full CJK coverage — the document body, which must render
whatever a GM types. Every other Japanese face is display-only, renders strings we author
ourselves, and takes the 83 KB path. That is the difference between a 7 MB bundle and a
30 MB one, and a test rejects any non-`full` family that grows past 400 KB.

**The catch, and it is a real one:** the `ui` profile only contains the Kanji listed in
`fonts.json`'s `uiKanji`. Add a new Kanji to a display face without rebuilding and it
renders in a fallback. That is written into the manifest as a comment and is the main
maintenance cost of this approach.

Two operational notes: a legacy `User-Agent` is what makes Google return one complete TTF
instead of 122 slices, and `tools/font-pipeline/.cache/` (68 MB of upstream TTFs) is
gitignored — only the subsetted output ships.

---

## 2. Three layers, and why the split is load-bearing

Same discipline as [testing-strategy.md](testing-strategy.md) §1's pure-core / thin-adapter
split, applied to CSS.

| Layer | File | Knows about |
|---|---|---|
| 1. Tokens | `bi-tokens.css` | Nothing. Palette, type, materials, metrics, elevation, motion. |
| 2. Components | `bi-components.css` | Tokens only. The widget vocabulary. |
| 3. Bridge | `bi-foundry-bridge.css` | Foundry and sf2e. The only file that names their selectors. |

**Why:** layers 1 and 2 must render in a plain HTML page, so the design can be reviewed,
screenshotted and iterated without a running Foundry — the same reason `core/` may not
touch Foundry globals. `test/tier3-theme-contract.test.mjs` enforces it.

### The retint strategy

Foundry v14 and sf2e are both almost entirely custom-property driven. `foundry2.css`
declares `--color-*`, `--font-*`, `--background-color`; sf2e declares `--primary`,
`--secondary`, `--alt`, `--bg` and its own `--color-pf-*` ramp.

So the bridge **redefines those variables** rather than out-specifying thousands of rules.
This keeps the bridge small, keeps a system upgrade survivable, and means dialogs we have
never looked at inherit the theme for free.

The risk this creates is specific and silent: **CSS ignores an unknown custom property
without erroring.** If Foundry v15 renames `--color-cool-5`, our bridge keeps setting the
old name and one corner of the UI quietly reverts, with no console output, discovered
mid-session. That is exactly failure mode #1 in the testing strategy, in CSS form, so it
is covered by a contract test that checks every upstream variable the bridge overrides
still exists in the local `foundry2.css` / `sf2e.css`.

### The kill switch

Every bridge rule is gated behind `body.bi-theme`. Dropping one class returns Foundry to
stock instantly. A theme that cannot be switched off is a theme that can end a session,
and this one will be live in front of six players. Enforced by test.

---

## 3. The command bar and the instrument

A full-width chassis along the bottom of the viewport with a domed instrument rising
through its centre line. Pods rise to different heights off a shared baseline and their
shoulders are asymmetric on purpose — a control panel machined in stages, not extruded in
one pass.

**The design promise:** everything a player commonly needs is on the bar, so the character
sheet is somewhere you go to *read*, not somewhere you are forced to go to *act*. Quick
checks and saves, the action economy, strikes, conditions, comms, audio, macros.

### Two structural invariants

- **Chassis height is pinned** to `--bi-bar-height`, never content-sized, because the
  bridge pads `#ui-bottom` by that same token to lift Foundry's hotbar clear. Pods fit the
  chassis, not the reverse.
- **`--bi-dome-size` is defined AS `calc(var(--bi-bar-height) * 2)`**, and the instrument
  is anchored to the chassis floor. That makes "the top half rises above the bar" a
  structural fact rather than two numbers someone has to keep in sync: with the instrument
  exactly twice the chassis height, sitting its bottom on the chassis bottom puts its
  centre precisely on the chassis top edge. Retune the bar and the invariant holds.

The instrument sits in a fixed centre grid track so it stays dead centre regardless of
what the side clusters contain — GM modules appear and disappear, and a centrepiece that
slides sideways when a button shows up reads as a bug.

### The instrument is a HUD, not a dial

Deliberately **not** mecha fantasy: an aircraft head-up display. Heading tape, pitch
ladder with end-ticks (dashed below the horizon, which is how a real ladder tells you
which side of level you are on without reading the number), flight-path marker, bracketed
value tapes, bank arc, target designator. Drawn in strokes on monochrome phosphor, because
that is what a combining glass actually does — it draws lines on the sky, it does not
render UI.

### Generations: the instrument improves with the Frame

`data-hud-tier` is the Frame's generation, and the upgrade is diegetic — you can *see* the
pilot got a better machine.

| Gen | Look | Symbology |
|---|---|---|
| I | Crude excavated CRT. Thick strokes, heavy scanlines, a flicker. | Heading tape, pitch ladder, flight-path marker, two value tapes. Only what it can actually measure. |
| II | Serviceable. Thinner strokes, no flicker. | Adds bank arc and the target designator. |
| III | Modern glass cockpit. Thin strokes, lighter scanlines. | Adds a corner frame, and colour finally *means* something — cyan for target, amber for warning — instead of everything being one phosphor. |

This is a free progression hook: a Frame refit is a visible UI change, not just a number.

### The macro bank

We cover `#ui-bottom`, so we owe the players the macro bar we displaced. The chassis
carries its own ten-slot bank in two rows of five with page controls — same capacity as
Foundry's own, so nothing is lost in the swap.

### Narrow screens

The chassis sheds modules by an explicit `data-bi-priority` order rather than letting pods
collide with the instrument. Quick-roll checks, the macro bank and the action economy are
the last to go, because they are what the bar exists to provide.

---

## 3c. The console frame

Pass 3 put everything inside **one 16:9 frame** (`.bi-console`), so the UI can be judged
against a real scene and nothing bleeds into surrounding chrome by accident. In Foundry
this frame is the viewport; in the prototype it is a bordered box with a scene behind it.

The scene sits **under** the furniture rather than beside it, so the rails and chassis
overlap it the way a cockpit surround overlaps a canopy, instead of shrinking the view to
a letterbox.

| Region | Carries |
|---|---|
| Top rail | Scene name, day and clock, Contact probability meter, sea state, alarm lamps |
| Left rail | Station keys (built for the five ground roles, cut 2026-09-20), evacuation track, Recall Knowledge facts |
| Right rail | Order of battle with integral health meters, round counter, umbilical |
| Scene | Map pins with staggered radar pings; clicking one targets it and announces it |
| Chassis | Ident, quick checks, macro bank, **three instruments**, actions, audio desk, GM direction |
| Marquee | A brass-capped lozenge running campaign status; hover to hold and read |

**The instrument cluster** is one main HUD flanked by two half-size analog dials
(integrity on the right; the left one showed the Resonance band, cut 2026-09-20).
`--bi-dome-half` is defined as half `--bi-dome-size`, and all three are anchored to the
chassis floor, so their centres land on one line by construction rather than by adjustment.

**Panel skin.** `.bi-plate-skin` gives any surface hammered steel with a single break line
scored around its perimeter, inset from the edge, concentric with whatever corner radius
that specific panel actually has — a pod with a 30px rounded shoulder gets a 30px-minus-inset
line, not a flat value that only matched one variant by accident. Brass corner ticks mark the
two bottom corners, which are always a genuine 90° break; no pod's top edge ever is (every
variant is rounded or diagonally chamfered), so no tick is drawn there. Rivets were tried and
removed — at this scale they read as clutter rather than machining, so the perimeter line and
the corner ticks are what carry "this is a bolted panel" on their own.

**Alert is a frame state, not a widget.** `bi-console--alert` pulses the top rail, casts
the scene red and leads the marquee, because a real alarm changes the room.

**Density is measured.** The chassis needs 1600px at full size; shedding the priority-3
modules frees 347px. Those breakpoints are `@container` queries on the console, **not**
viewport media queries — the console is routinely much narrower than the window, and
keying to the viewport hid modules that had ample room.

---

## 3b. Redaction: censorship as a story mechanic

Promoted from a decorative CSS flourish to a tracked story idea by the user on
2026-09-05 — see `ideas/entries/redacted-document-chain.json` for the narrative side and
its open questions. This section is the implementation contract.

**Redacted text is removed, not hidden.** `core/redact.mjs` strips it at generation time,
so the words a player is not cleared for never reach that player's browser. View-source,
devtools, disabling CSS, select-all-copy, Ctrl+F and the accessibility tree all find
nothing, because there is nothing to find. Each clearance is a separate Foundry page whose
ownership decides who can open it.

**No CSS trick is load-bearing anywhere in this chain**, and `bi-components.css` says so in
a comment, so nobody later gives the styling layer a security job it cannot do.

- Authoring: `<redact c="3">text</redact>` in campaign JSON. `c` is the clearance needed.
  Chosen over `{{…}}` (Handlebars) and `[[…]]` (Foundry inline rolls) to avoid collision.
- Tiers use the real Japanese markings: 公開 / 部外秘 / 秘 / 機密 / 極秘.
- Nested tags, unclosed tags and unprocessed tags reaching output are all **hard errors**.
  The last one is the important one: it means a content path that skipped redaction fails
  the build instead of publishing every classified word to the table.
- Default clearance is 0, so forgetting to pass one over-censors rather than leaking.
- **The one acknowledged leak** is bar width, which correlates loosely with length. Widths
  are quantised and jittered; long passages break into several bars, so a reader counts
  strokes rather than characters. Real redactions leak this much, and it is part of why
  they are fun to stare at.
- Bars are drawn with an SVG displacement filter so the edge is ragged and ink-soaked
  rather than a clean rectangle, with three seeds cycled so no two adjacent bars share an
  outline. The module must inject the filter `<defs>` once per client.

---

## 3d. Density and legibility (pass 4)

An adversarial pass on wasted space, prompted by the observation that the frame
was mostly empty rail.

**The side rails were the worst offender and are now floating panels.** As
full-height grid columns they were tall, thin and roughly half empty — a flex
spacer literally holding a hole open — and they stole width from the scene to do
it. They are now absolutely positioned panels that size to their own content,
stack with a gap, and let the scene run full width behind them like a canopy.
The column scrolls if it outgrows its berth, because the previous behaviour was
to clip silently: the Recall button simply vanished below the fold.

**The flanking instruments were fighting themselves.** Dial and readout were both
centred, so the needle and the numbers wanted the same space and the text was
squeezed into a 64%-wide slot at the widest point of the circle. The dial now
mounts in the top of the glass and the readout takes the whole body beneath it,
separated by a hairline — which is the only arrangement that lets the numbers be
large enough to read across a table, which is the entire reason the dial exists.

### Japanese has a hard size floor

Measured before the pass: **20 of 21 Japanese elements rendered under 12px, the
smallest at 7px**, and `.bi-legend` had `line-height: 1` — zero leading.

A 7px Latin label is merely small. A 7px Kanji is a smudge, because the strokes
merge before the glyph resolves. There are Japanese readers at this table, so the
Japanese is *content*, not texture, and `--bi-jp-size-sm: 12px` is a floor that
nothing goes under. A test enforces it across both the stylesheet and the
prototype's inline styles, since that is exactly where it crept in.

**The trap worth remembering:** SVG `font-size` is in user units, not CSS pixels.
The HUD's viewBox is 400 wide and renders at 336px, so everything in it is scaled
by 0.84 — `.bi-hud__jp` at 11 units was rendering at ~9px while the number in the
stylesheet looked perfectly reasonable. The test caught it; a reading of the CSS
would not have.

### Also fixed

- `--bi-legend-leading: 1.45`. Tracked-out 10px labels at `line-height: 1` read as
  a printed strip rather than as type, and stacked labels collided.
- Role, unit and Recall-fact rows all gained real padding and type sizes; the
  facts list in particular was 9px, and it is Recall Knowledge results a player
  has to act on.
- The dev server now sends `no-store` (`design/ui/serve.py`). `python -m
  http.server` let the browser hold stale stylesheets across reloads, which cost
  several rounds of chasing a layout bug that had already been fixed.

---

## 3e. Any width, any height (pass 5)

Reported by the user at their own real 4K display, after pass 4's balance fix:
"the right elements are still not visible." Two genuine, separate bugs, found by
measurement rather than by guessing at their screen's OS scaling factor.

### Bug 1 — a demo convenience baked into the shippable class

`.bi-console` — the class that eventually becomes the real Foundry interface —
hardcoded `aspect-ratio: 16/9`. That contradicted the class's own next-line
comment ("In Foundry this frame IS the viewport" — an arbitrary shape, never
guaranteed 16:9). With `width:100%` and a forced ratio, a wide real browser
window computes `height = width × 9/16`, which is routinely *taller* than what
the browser chrome actually leaves visible. The bottom of the chassis — the
whole right cluster included — ends up below the fold.

The 16:9 box was only ever a demo convenience, for the earlier explicit request
to "see what it would look like against a fake scene background." It should
never have lived anywhere near the class other pages (or Foundry itself) would
reuse. Fixed by moving it out entirely: `.bi-console` now declares only
`width:100%; height:100%` — it fills whatever box contains it, at any ratio —
and the 16:9 comparison view lives in **`design/ui/style-prototype.html`'s own
`<style>` block**, as an opt-in `.demo-frame` wrapper the JS can swap out.

### Bug 2 — CSS Grid's own track sizing, measured wrong under container queries

Fixing bug 1 was necessary but not sufficient — the right cluster was *still*
clipped. Direct measurement (not a screenshot, `getComputedStyle` on the actual
element) found the real second bug:

```
.bi-console        getBoundingClientRect().width  →  1175px   (correct)
.bi-console        computed gridTemplateColumns    →  3822.47px   (wrong)
```

`.bi-console` was `display:grid; grid-template-columns:1fr;`, and its own
descendants — several levels down, inside `.bi-bar` — carry `@container
bi-console (max-width: …)` queries that conditionally `display:none` the
lower-priority pods. With that combination, the grid's own single `1fr` column
track resolved against what looks like a pre-containment/intrinsic pass rather
than the container's actual, final width: the track sized itself as though
*every* pod (all four priority tiers) were visible at once, producing exactly
`checks(270) + actions(178) + cluster(680) + both full tiers ≈ 3822px`, while
the outer box correctly stayed clamped to 1175px. Content between x=1175 and
x=3822 was silently clipped by `overflow:hidden` — always from the right,
which is exactly "the right elements are still not visible." Confirmed as a
real computed-style mismatch, not a measurement artifact, by placing an
unrelated 500px probe element on the same page in the same pass and getting
back exactly 500px.

`.bi-console` never actually needed two-dimensional grid placement — it is
three stacked, full-width overlay layers (top rail / scene / chassis), not a
grid of areas. The fix removes the grid formatting context entirely:
`.bi-console` is `position:relative` with **no** `display:grid`, and each
layer (`.bi-console__scene`, `.bi-console__top`, `.bi-console__bar`) is
`position:absolute` with explicit `top`/`bottom`/`left`/`right`/`height`. This
is the single most basic layout primitive CSS has — there is no track-sizing
pass left for a container-query/grid interaction to get wrong, in any engine.
`test/tier3-theme-contract.test.mjs` asserts `.bi-console` never returns to
`display:grid` and that its three layers stay `position:absolute`.

### Stated floors, not silent collapse

Sweeping widths from 600px up surfaced a real, separate, architectural limit:
the instrument cluster is a **fixed** 680px (`--bi-dome-size` + two halves +
gap — it does not shrink), and the two pods that never shed (Checks, Actions)
measure 270px and 178px. Side by side that is a hard **1185px minimum** —
below it, the design has nowhere left to put its own core content, full stop.

Rather than let that squeeze/clip unpredictably, `.bi-console` now states
both floors explicitly:

```css
min-height: 340px;   /* nowhere left to put the two fixed rows below this */
min-width: 1200px;   /* the measured 1185px true minimum, +15px of air */
```

Below either floor, the console holds at its stated minimum and overflows its
*own* parent visibly (a scrollbar, not a clip) — the honest failure mode for
"you have asked for something this design does not support," rather than a
silent breakage that looks like a different bug entirely.

### A real test, not a claim: the fill-viewport toggle

The prototype's toolbar now has a **Frame: 16:9 / Frame: fill window** toggle.
"Fill window" pins the console to the actual browser viewport (below the
toolbar, which becomes the exit control), at whatever width and height that
really is — so resizing the real browser window is a live, honest test of
"any width and height," not something asserted from a screenshot whose
OS-level display scaling I cannot see from here. A live readout
(`viewport W×H · console W×H`) sits next to the toggle for exactly this
reason: so a screenshot or a shared number is unambiguous going forward.

### Verified, by measurement, not by screenshot

A containment sweep (every visible pod, dome, subdome, marquee, and rail
checked against `.bi-console`'s own bounding box, in fill mode) at:

| Size | Result |
|---|---|
| 1600×900 | clean |
| 1920×1080 | clean |
| 2560×1440 | clean |
| 3840×2160 (exact 4K) | clean |
| **3840×900** (wide, short — the scenario bug 1 actually produced) | clean |
| 3840×500 (extreme short) | clean |
| 7680×2160 (8K) | clean |
| 1200×2000 (at the width floor, very tall) | clean |
| 600×800 (below the width floor) | holds at the stated 1200px minimum; zero elements escape the console's own box |

Screenshots of very wide renders in the review browser were frequently
mid-repaint or downscaled illegibly during this investigation — the
`getBoundingClientRect`/`getComputedStyle` sweep above is the actual evidence;
a screenshot only confirmed the final, settled state.

---

## 3f. The floating panels, the ident instrument, and a colour language for keys (pass 8)

Direct feedback on the floating side panels (§3d), plus two new pieces.

**Rivets, removed rather than fixed.** They read as clutter at this scale rather than
machining, so `.bi-rivet`, `.bi-pod__rivet`, `.bi-rivet-run` and every usage are gone —
not hidden, gone, so a grep for the word finds nothing.

**Rows were "crushed" — not clipped, just too tight.** Investigated live rather than
guessed: `.bi-role` at 5px padding and a 4px inter-row gap has no actual overflow or
clipping bug (`overflow: visible` throughout, no scrollbar active), but a lamp, two lines
of text and a trailing value all fighting for ~30px of row height reads exactly like the
reported "crushed... corners cut off" even without a literal render defect. Rows now carry
real padding (`.bi-role` 5px→10-12px, `.bi-unit` 6px→9-11px) and more inter-row air (4px→7px).
The trailing value (`.bi-role__who`, `.bi-unit__init`) was a bare dash/number floating at
the edge; both now sit in a small recessed slot — the same "trailing value gets its own
well" language in both panels rather than two different habits.

**The ident instrument now protrudes, on purpose.** The candidate number lived in a flat
46px square flush inside a 30px-radius rounded corner — a small rectangle abutting a big
curve never sits right, which is what "the display is square but the panel isn't" was
describing. Rather than resolve the mismatch by hiding it, `.bi-ident` leans into it: a
92px brass-bezelled instrument (2x the original, per the ask), the same hardware family as
the main dome and the flanking subdomes, with roughly a third of its height rising above
the pod's own top edge — `margin-top: calc(var(--bi-ident-size) * -0.36)`, proportional to
its own size rather than a fixed pixel offset, so resizing the instrument keeps the
protrusion in proportion. It now shows three lines where there was one: the candidate number, plus
a role legend and a live sync readout built for the ground roles and Resonance, both cut
2026-09-20. The row containing it uses
`align-items: flex-end` so the plate/legend beside it sit level with the instrument's
in-flow lower portion rather than being pulled up into the part that pokes out.

**A colour language for keys.** Every key was the same steel grey regardless of function —
sixty-odd controls with nothing but `.bi-key--armed` (red) to tell any of them apart.
Extended the same idea `.bi-lamp`'s colour modifiers already carry — a control's colour
signals its category — to keys, via the cap's own text colour plus a faint matching
edge-glow, since most keys here are plain text with no icon to tint.

**Found live, on the user's own 4K display, and strengthened.** The first version was
correct in code — every colour verified pixel-exact via `getComputedStyle` — but a 1px
inset glow the same size as the text it outlines does not compete with the text for
attention at real viewing distance, and read as "still grey" rather than "categorised."
Fixed with two changes rather than one bigger one: a visible accent strip inset from the
key's top edge (a colour-coded cap insert, not a hairline), and the steel gradient itself
shifted ~15-20% toward the accent via `color-mix()`, so the whole key reads as tinted
metal. The text stays the strongest signal; it is no longer the only one.

| Class | Colour | Covers |
|---|---|---|
| `.bi-key--go` | phosphor green | Movement (Stride/Step/Face), and Ready — the one proactive stance among the reactions |
| `.bi-key--info` | cyan | Comms, view, and anything that *retrieves* information rather than changing the world: Recall, Sync, Lock, Docs, Centre/Follow/Emote, the transport keys |
| `.bi-key--caution` | amber | Spends a resource, or is GM-only and consequential: Hero, the fortune keys, every Scene control, the costlier reactions |
| `.bi-key--anchor` | Resonance violet | **Anchor only** (Anchors were cut 2026-09-20; the class survives in code) |

Checks, Saves, dice, Strike/Raise, the routine GM bookkeeping keys (Cue/Turn/Log/Timer),
routine Frame maintenance (Umbil/Vent/Purge) and the condition-toggle keys stay neutral
deliberately — colouring everything would mean colouring nothing.

`.bi-key--anchor` is the one spend of Resonance violet on a key. It was made for the Anchor key, a
Resonance-linked mechanic, and both were cut on 2026-09-20. A test asserts `--bi-resonance` appears
in exactly one `.bi-key` rule, so a future pass reaching for "something feels special, make it
violet" fails loudly instead of quietly spending the one colour that is supposed to stay rare.

---

## 3g. The pilot ID panel: a clipping bug, fixed structurally, not by tuning a number

**Found live, reported by the user against the running prototype.** The ident instrument (§3f)
escaped its pod's top edge via `margin-top: calc(var(--bi-ident-size) * -0.36)` — but the pod it
lived in is a `.bi-pod`, and `.bi-bar .bi-pod` sets `overflow: hidden` (load-bearing elsewhere:
it is what stops a two-row key bank spilling into its neighbour). That same rule was silently
clipping the instrument's own escape. It never actually cleared the pod on screen; the negative
margin was calculating a position the parent then cut off. **This is why the fix is structural
rather than a bigger negative number** — the pilot ID instrument (`.bi-ident`) is no longer a
child of any `.bi-pod` at all. It now lives inside `.bi-pilot-id`, a plain positioning host
(`position: relative; height: var(--bi-bar-height)`) — exactly the pattern `.bi-bar__cluster`
already uses to let the main dome clear the chassis — with `.bi-ident` positioned
`absolute; bottom: 0` inside it, the same escape the dome and subdomes already use. Nothing
named `.bi-pod` sits between the instrument and `.bi-bar` any more, so there is no ancestor
left that could clip it. A regression test pins the DOM shape directly (`.bi-ident` must be the
first child of `.bi-pilot-id`, not nested inside the plate pod) so the bug cannot silently
return under a different selector.

**Given a clean escape, the user asked for the panel to go much further: "make this visual
display x2 larger... and even have it protrude above the line of the main control panel"** —
this time, above the whole chassis, not just its own pod. The instrument is now 150×252px
(was 92×92px square) — 1.5x `--bi-bar-height` rather than a fixed pixel height, the same
"structural, not tuned" invariant `--bi-dome-size` already uses for the main instrument — so
84px of it rises into the scene above the bar's own top line, confirmed live via
`getBoundingClientRect()` (identTop 1126 vs barTop 1210 at a 2560px console). It carries three
readings instead of one: the candidate number, a Sync meter and a meter wired to the
glass-corruption slider (`--bi-bleed`). The last two displayed Resonance and Bleed, both cut on
2026-09-20.

A plain `<span class="bi-pilot-id__spacer">` reserves the instrument's footprint in the flex row
beside it (the plate/legend pod), so pulling the instrument out of normal flow does not collapse
the layout around it — the same trick a `::placeholder`-style spacer solves for any
absolutely-positioned sibling.

**Knock-on effect, caught by re-measuring rather than assumed:** the panel's on-screen footprint
grew from 229px to 287px, so the left chassis shedding thresholds (§3f/pass 9) were stale by
exactly that difference. Re-measured live and updated: 715/945/1150 → 773/1003/1208. Verified at
the new t2 boundary (leftTrack 778px against a 772px content width — 6px of real slack, not an
off-by-one) that nothing overflows.

---

## 3h. The main dome, brought down (pass 11)

**Reported live against the running prototype:** at 2x `--bi-bar-height` the main dome's
protrusion above the chassis (a full bar-height, 168px) read as looming far higher than the two
flanking subdomes beside it — "make this much lower, about half way up the smaller circle
displays." `--bi-dome-size` is now `1.5x --bi-bar-height` (252px), halving the protrusion to
84px — still expressed as a multiple of the bar height rather than a tuned pixel value, the same
"structural, not tuned" invariant the token already followed.

The one thing this could NOT be allowed to do quietly: `--bi-dome-half` (the flanking subdomes'
own size) used to be `calc(var(--bi-dome-size) / 2)` — one formula shared by both instruments.
Leaving that in place would have silently shrunk the subdomes along with the main dome, which
nobody asked for. `--bi-dome-half` is now pinned directly to `var(--bi-bar-height)` — its own
independent invariant that happens to land on the same 168px as before, rather than a fraction
of a number that just changed. A test pins this decoupling down directly.

**The HUD's Japanese text needed the same care.** `.bi-hud__jp`'s `font-size` is in SVG user
units, scaled by whatever `--bi-dome-size`/viewBox ratio is live — 15 units at the original
336px dome (0.84 scale) rendered at 12.6px, barely over the 12px floor. Shrinking the dome to
252px (0.63 scale) without touching that number would have dropped it to ~9.5px, and the
existing generic "no Japanese text below the floor" test would not have caught it — that test
reads the raw px value in a CSS rule, and SVG user-unit scaling is invisible to it. Bumped to 20
units (20 x 0.63 = 12.6px, the exact same effective size as before, not a coincidence) and added
a dedicated test that computes the real dome-size/viewBox ratio rather than trusting a bare
number, specifically so this class of regression cannot slip through a future resize unnoticed.

**Knock-on effect, re-derived rather than left stale:** the centre instrument cluster's
reserved width (`--bi-dome-size + --bi-dome-half * 2 + 8px`) shrank from 680px to 596px, which
loosens `.bi-console`'s own min-width floor (re-derived from `270 x 2 + cluster + padding +
gaps`: 1290px → 1200px). Left at the old, safer 1290px would not have been *wrong* — a looser
floor than necessary never causes overflow — but this file's whole discipline is comments that
say what is actually true, not what used to be, so it is re-derived and tightened rather than
quietly stale.

---

## 3i. Lit lamps clipped at the rail edge: a real CSS Overflow spec gotcha (pass 13)

**Reported live, against the running prototype:** the left rail's station lamps (and the
Known-facts lamps) were rendering with the left half of their glow missing — a hard flat
cut, not a soft fade. Live geometry inspection (`getBoundingClientRect`) showed every lamp's own
13px/11px/8px circle fully inside its row with room to spare — the BUG wasn't in any element's
position. `getComputedStyle(.bi-rail__scroll).overflowX` was the real tell: `"auto"`, even though
the rule only ever declared `overflow-y: auto`.

This is a genuine CSS Overflow Module rule, not an authoring slip: *"if one of `overflow-x` or
`overflow-y` is `visible` and the other is not, the `visible` one computes to `auto` instead."*
Leaving `overflow-x` unset (its initial value is `visible`) while setting `overflow-y: auto`
does not give you scroll-vertically/paint-freely-horizontally — the browser silently promotes
the unset axis to `auto` too, and `auto` clips anything painted past its own border edge,
including a **lit lamp's box-shadow glow** (`.bi-lamp--lit`'s `0 0 10px 1px var(--lamp)` reaches
~11px past the lamp's own box). The lamp's circle itself was never clipped; only the glow that
makes a "lit" state actually read as lit was — and only on whichever side had the least
clearance, which for a first-child lamp with a tight row padding is the left.

**Fix, in two parts, because only one of them is real:**
1. `.bi-rail__scroll` now declares `overflow-x: hidden` explicitly. This changes nothing about
   the actual clipping (it was already exactly this) — it exists so the next person reading the
   rule sees a real, documented decision instead of an invisible spec gotcha waiting to be
   rediscovered the hard way, the same reason `--bi-corner-tl/tr` exists instead of a bare radius.
2. `.bi-role`, `.bi-unit`, and the Known-facts row (`console.js`, previously `padding: 2px 0` —
   *zero* horizontal padding) all now keep **at least 16px of left clearance**, comfortably past
   the lamp glow's ~11px computed reach. Padding is the only real fix here: `overflow-x` cannot
   be set to plain `visible` while `overflow-y` scrolls — the spec explicitly disallows that
   combination — so there is no way to make the container simply stop clipping; the content has
   to stay clear of the boundary instead.

Two new tests: one asserts `overflow-x` is declared, not left to spec-default inference; the
other computes the lit lamp's actual glow reach from its own `box-shadow` rule and checks every
lamp-bearing row's real left padding against it, rather than trusting a specific pixel number
that could go stale the next time the glow is retuned.

---

## 3j. "Poor visibility": the risk gauge and the marker stems (pass 15)

**The risk gauge's unlit segments were, in practice, invisible.** `.bi-marker__gauge i`'s unlit
fill was a flat `var(--bi-phosphor-bed)` (`#0d1c14`) — but the gauge sits inside a `.bi-screen`,
whose own glass background (`--bi-mat-screen`) fades to that *exact* colour. Contrast ratio
against its own backdrop: ~1:1. A five-segment gauge whose unlit segments cannot be seen is not
a gauge — there is no way to distinguish "1 of 5 lit" from "1 of 1 lit," which quietly threw away
the entire reason the brief asked for a *scale* rather than a bare risk number. Fixed by tying
the unlit fill to the gauge's own `--risk` colour instead of a fixed value
(`color-mix(in srgb, var(--risk) 30%, var(--bi-steel-900))`) — every band now shows a dim tint of
its *own* lit colour, so an amber gauge's unlit track reads as dim amber, not a mismatched fixed
green sitting oddly next to an amber or vermilion lit segment.

**The marker stems were built against flat demo colours and disappear against a real photo.**
`.bi-marker__stem` is a 2px coloured line with only a `0 0 0 1px rgb(0 0 0 / 55%)` dark halo —
enough to separate it from a flat background, not enough against a busy, brightly-lit aerial
photo (which is what it actually crosses in every real scene). Widened to 2.5px with a stronger
halo (`0 0 0 1.5px rgb(0 0 0 / 75%)`) plus a soft drop shadow, the same "give it a dark bed
regardless of what's underneath" idea `.bi-marker__fix`'s own dark chip already uses for text
over the same photo.

Two new tests: one confirms the unlit gauge fill is no longer the literal glass colour and stays
tied to `--risk`; the other checks the stem's actual halo spread/opacity against a real minimum
rather than one specific tuned value, so a future retune can't silently thin it back out.

---

## 3k. The deck, and the session rail (2026-09-17, reworked 2026-09-23)

The code has long cited "The deck" as a section of this document; this is it. The always-on
bar is **the deck**: one mounted hardware panel across the bottom of the screen, drawn at an
authored size and scaled whole (`core/deck-layout.mjs#deckFit`), never reflowing and never
scrolling — `cheek | outer silver | inner black | spine + orb | inner black | outer silver |
cheek`, symmetric by construction. The pixel record lives in `bi-tokens.css` §7a and
`bi-components.css` §10; the contracts in `test/tier3-deck-contract.test.mjs` and
`test/tier3-deck-rework-contract.test.mjs`.

**The 2026-09-23 rework** answered a two-part brief from Ingram, against a live screenshot.

*Visuals.* "The dirt/grime stuff looks like single tiny dots scattered across the interface."
Correct, and structural: the first grime was one noise field thresholded evenly, so every
patch of panel got the same sprinkle. Real wear has **scale** (broad stain, clusters, specks
inside the clusters), **direction** (scratches along the brushing, gouges across it) and
**place** (it pools in corners, seams and recesses and is polished away where hands land).
The new `--bi-wear-*` tokens (§7a-ii) supply the first two — the clustering is an
`feComposite operator='in'` of a fine speck field through a coarse mask, and the scratches are
drawn by hand because noise cannot make a straight line — and each module places them.
Panel lines are real grooves now (an inset 2px shadow and catch-light on every plate's edge),
every silver plate is held on by four slotted screws with dirty recesses, the key banks carry
the north star's `////` vent hatch, the cheeks carry a half-worn stencil (空白相続 / BI · 07),
and the spine's lower corners carry maker's stampings. The orb has a **lamp behind its glass**:
a warm light that breathes and dips like a filament, and spills out across the silver round
the collar, on two irregular opacity-only loops of coprime length (held still under
`prefers-reduced-motion`).

*UX.* The deck widened 1440 → 1600 authored px. At 16:9 it was always height-bound, so this
costs nothing on screen with the sidebar closed; all 160px went to the shoulders, which is where
the cropped pills and the two-line log were. What each module does now:

- **Director, left:** the cast board — six rows, each with a hairline HP gauge; in a fight it
  becomes the **turn order** (initiative, current marker, defeated struck through) and follows
  the turn to its page by itself.
- **Director, right:** the log — six timestamped lines (local time), a key that opens the
  Console's whole Log tab, and five doors that fit: Script, Sound, Find (the Palette), Console,
  Comms. The session clock moved up to the rail.
- **Both, key banks:** unchanged — except that the Director with nothing selected no longer
  sees dead caps: the same keys **ask the table** (post the check to chat).
- **Both, the orb:** hero-point and dying annunciators printed on the face (where the needle
  can never cross them), AC / speed / level engraved round the collar's foot, conditions in the
  idle readout, whose turn it is round the top (Law 11-gated for players), and two flank keys —
  **Init** (prints its modifier) and **Turn** (Director: Fight → Begin → Next, ctrl ends the
  encounter; player: End Turn, live only on their own turn).
- **Player, left:** the dossier — Perception DC, hero and focus lamps, wounded, conditions,
  and pills straight to the Console's Spells and Gear tabs.
- **Player, right:** three selectors — Lore, a new **Action** knob (sf2e's own basic and skill
  actions, one list for a scene and one for a fight, each key printing sf2e's own preview
  modifier), and Downtime or Strike (which gained Damage and Critical keys).

**Second review, same day.** Grime cut to under half strength everywhere (it read too strong);
the orb's glass darkened to an ember orange lit by ONE lamp near its centre, which is now the
thing that flickers (the first pass's spill of light round the collar read as a glow *behind*
the panel and showed the flicker there instead of on the face — removed); the bezel's kanji moved
to their own top layer so the glass rings can't cut into them; the cheek stencils made legible;
the "Do not open" stamping removed; shoulder headers and pill rows cleared of the corner screws;
the hotbar raised 15px; skill keys rebuilt as real caps on a skirt and the round buttons as a
domed cap sunk in a knurled bezel, both with hover, a visibly-held pressed state and a brief
"just fired" lamp. **Comms was rethought entirely**: no longer a full-width slab over the deck
but a compact hand-held field set centred between the rail and the deck (silver chassis, black
phosphor screen, one hardware key per app, Escape puts it down), with the Radio's meter rebuilt
as a real printed VU face and its levels as three knobs side by side. The Console window now
floats in the same band instead of covering the deck, its Log tab is a readable ledger, and
every log display shares one local 24-hour clock.

**Third grime pass, 2026-10-05.** "The white grime on a dark background needs to be more subtle.
Dealer's choice, improve the grime." On the black cells the light stain read as smoke, grey
clouds over the black, and its specks as stars; on silver the stain read as coffee blotches. The
rule since: **a dark surface carries a dust film and a few faint motes, never a light stain**;
silver **tarnishes along its brushing**; and the dirt you actually see is **placed** (lips,
lower corners, seams, where a thumb lands), with the face between left cleaner. Backlit glass
(the orb) keeps more dust than black panels, because a lamp is where dust shows. It is
measured, not eyeballed: `tools/ui-grime/measure.mjs` renders a clean swatch of each surface at
150% scaling and reports how cloudy and how speckled it is (a black cell's cloudiness went from
8.2 to 2.9), and `test/tier0-grime-budget.test.mjs` holds each texture to its budget.

**Skill keys, 2026-10-05 (D063).** "A wider ratio, a plate to show the text on ... recolour them in a
subtle way that indicates which main stat they are effected by", and then: no physical grouping, no
colour legend, no blank keys. Each key is a wider cap (about 88 by 39 authored px, from 73 by 40)
with a recessed **nameplate** across its top carrying the skill's whole name, and below it the number
beside its pips between two ribbed grips. The plate's wash and the grips are in the colour of the
attribute the skill adds (`--bi-attr-*`, bi-tokens.css §7a-iii: oxide red, field green, khaki, steel
blue, sea green, heather plum), muted so they never compete with the orange accent or the check
console's result lights. The banks stay nine keys, three by three, alphabetical. The width came from
the two black key banks (272 to 304 each), so the deck is now **1664** authored px wide; it costs
nothing where the deck is height-bound and about 4% of scale where it is width-bound. Live check:
`node tools/deck-keys/live-check.mjs`.

**The session rail** is new: a thin GM-only strip across the top of the screen between
Foundry's scene navigation and the sidebar — tonight's session on a clock-time track, scene
bands, a pin per log entry, a needle at now, how long is left, and a one-press **Mark**. Its
times are client settings (default 19:30–22:30). Scene changes it learns from the log's own
per-entry scene stamps plus a GM-browser-local activation list, so no second line is ever
written into the log for a cut the Palette or Scene Runner already logged.

## 4. Foundry v14 structural facts (verified, and one corrects a common assumption)

Read from `templates/views/game.hbs` and `public/css/foundry2.css` in the local v14.367
tree.

- **`#players` is not at the bottom of the screen.** `game.hbs` puts the player list inside
  `#ui-left-column-1`, under the scene controls, on the **left**. It moved there in the
  ApplicationV2 rework. The only thing in `#ui-bottom` is the macro `#hotbar`. Any plan
  that says "integrate the player list that lives along the bottom" is describing v13.
- **`#ui-middle` is `width: 60%`**, `pointer-events: none`, and scaled by `--ui-scale`. A
  full-width bar cannot live inside it. The bar therefore mounts as a direct child of
  `#interface`, and we simply pad `#ui-bottom` to lift the hotbar clear — Foundry's own
  flex layout is never touched.
- **`#sidebar`** (the right-hand accordion) owns its collapse/expand behaviour and its
  width via `--sidebar-width`. We retint it and leave the interaction alone.
- **Fonts already ship with Foundry**: `Bruno Ace`, `Bruno Ace SC`, `Modesto Condensed`,
  `Signika`, `Amiri` all live in `resources/app/public/fonts/`. Bruno Ace is a squared
  retro-futurist face that lands almost exactly on the target decade, so the display type
  costs no network request and raises no licensing question.
- **sf2e's own palette is already halfway there** — Starfinder steel blue `#1d3c53` and a
  warm khaki alternate `#786452`, alongside inherited PF2e crimson `#5e0000`. This is a
  pivot, not a fight.

---

## 5. Bugs found while building, now regression-tested

Pass 1:

- **Chassis height drift.** `.bi-bar` used `min-height`, so it grew to its content (172px)
  while `--bi-bar-height` still said 128px. The bridge pads `#ui-bottom` by that token, so
  in Foundry the hotbar would have sat 44px *inside* the chassis.
- **`[hidden]` did nothing on a pod.** `.bi-pod`'s `display: flex` beats the `hidden`
  attribute's UA `display: none`, so GM-only modules stayed visible in player mode.
- **Redaction silently did nothing in a real journal.** `.bi-redacted` was scoped under
  `.bi-journal`, but a real Foundry page is `.journal-entry-page`.
- **`--bi-bleed` was used but never declared.** It worked via its `var()` fallback, so
  nothing documented that it existed or what its range was.

Pass 2:

- **The bridge was quietly overriding the document typeface.** Its journal block
  re-implemented the paper look with its own hex values and `var(--bi-font-body)`. Because
  `body.bi-theme .journal-entry-page` outspecifies `.bi-doc`, every real Foundry journal
  rendered in the UI body font instead of the document serif. This is exactly the drift
  the three-layer split exists to prevent, hiding in the one file allowed to know about
  Foundry — so the bridge now styles journals purely through tokens, and a test rejects
  raw colour literals and the body font in that block.
- **One 78ch redaction bar could not wrap.** A bar is `inline-block`, so a long classified
  sentence would shove the line off the measure. Long passages now split into several bars
  under 17ch, joined by real spaces — which is also what a real redacted passage looks
  like, and means the reader counts strokes rather than characters.
- **HUD symbology collided at gen III.** The target designator, the range scale and the
  INTEG value box all wanted the same space. The range scale was duplicating what the
  target block already said, so it was cut rather than crammed — the corner frame moved
  out to the glass edge and the target readout dropped into the one genuinely empty
  quadrant.
- **An oversized grid item does not position from `align-items` alone.** The instrument
  (368px) in a 184px row hung *below* the chassis instead of rising above it. It now sits
  in a berth that reserves its width, anchored to the chassis floor.

Pass 3:

- **Pod-shedding was keyed to the viewport, not the chassis.** Once the bar moved inside
  the 16:9 frame, a 1140px console inside a 1200px window hid modules that had plenty of
  room. Now `@container` queries on the console itself.
- **Pods were being flex-squashed.** Without `flex: none` the side clusters compressed a
  four-column key bank down to 77px and the keys wrapped into a smear. A module now either
  fits at full size or is shed — never half-shown.
- **An oversized grid item does not position from `align-items` alone.** The instrument
  hung *below* the chassis instead of rising above it; it now sits in a berth that reserves
  its width and is anchored to the chassis floor.
- **The Director module had nowhere to go.** It overflowed the chassis when GM mode was on.
  A GM is not flying a Frame, so Director mode now trades the pilot ident plate for it.
- **68 MB of upstream TTFs were not gitignored** and would have been committed on the next
  `git add`. Only the 7 MB of subsetted woff2 ships.

**Redaction is visual only in the CSS layer.** The security comes entirely from
`core/redact.mjs` removing the text. Anything a player must not read belongs behind
Foundry's ownership permissions or a GM-only page.

---

## 5b. The phone — a first pass at all eight confirmed apps (pass 16)

**Explicitly framed by the user as play, not a spec to hit: "have some fun... go wide, things
that are easy to produce."** `ideas/entries/phone-app-suite.json` already had a fully-confirmed
list of nine pieces ("I love all of them") and `terminal-login-landing-page.json` already had a
locked art direction, so this pass built the framework plus a genuinely interactive first page
for all eight actual apps (the ninth, UI corruption driven by the since-cut Bleed track, is an
ambient effect applied *to* the phone, not a page on it).

**Two registers meeting at one seam, per the locked art direction.** The physical shell
(`.bi-phone`) is a warm bakelite object — deliberately NOT the console's cool steel-and-brass
palette, so it reads as a different class of object the pilot carries rather than another chassis
panel — with real brass corner screws as the one piece of shared hardware language. Its screen
(`.bi-phone__screen`) is the OS side: `--bi-font-pixel` (Press Start 2P / DotGothic16), hard
corners, chunky scanlines, no attempt to look high-resolution. One object, two different
manufacturing eras represented at once, exactly as specified.

**The big obvious button lives in the top rail**, the one strip of chassis already measured as
~80% empty at 4K (§3d/pass 9's own audit). It is deliberately bigger than the row that holds it —
the same "instrument breaks the chassis line" idea the dome/subdomes/pilot-ID panel already use,
at corner-accent scale rather than centrepiece scale.

**All eight apps are real, not stubs**, backed by pure logic in
`module/blank-inheritance/scripts/core/phone.mjs` (tested, `test/tier1-phone.test.mjs`): Alert
actually staggers six per-candidate notifications with real, sorted, never-identical delays (the
idea entry's own callout: "the best part"); Field Guide shows a Claimant entry Recall Knowledge has
actually filled in next to two still-locked slots (the worked example here used to cite the real
Claimant, `data/antagonists/claimants/contact-unclassified.json` — deleted 2026-09-19, unapproved
and stale, at Ingram's direct instruction; the app's own code was never hardcoded to that specific
file, so this is a stale example, not a functional break — swap in whatever Claimant is approved
next); Resonance drifted against the campaign's sync bands (a system cut on 2026-09-20);
Bulletin quietly strikes through one reassigned name; Contacts
carries the six-candidate roster plus the three real Directorate NPCs
(`data/npcs/*.json`) as "OFFICIAL"; Fortune draws from a weighted pool where exactly one entry is
a real hint, indistinguishable in tone from the jokes around it; Pet is a tiny hand-drawn 7×7
pixel sprite (CSS grid cells, no image asset) with a fed/played state that persists across a
reload via `localStorage`; Roll rolls real dice.

**Two bugs found live while building this, both fixed before shipping, neither caught by the
node test suite** (this is DOM/layout behaviour, the same category as several console.js bugs
this project has already hit, not pure logic):
- The pet sprite rendered at 0×0 everywhere it appeared. `.bi-phone__tile-face`'s own
  `place-items: center` — needed so a bare glyph *character* centres in its 40px tile — sizes a
  grid item to its own content instead of stretching it to fill the track, and a content-less
  `<span>` has no intrinsic size. Fixed with explicit `width:100%;height:100%` on each sprite
  cell, sidestepping the inherited alignment rather than depending on overriding a rule owned
  elsewhere.
- Dragging did nothing, silently: `makeDraggable`'s third parameter was the container *element*,
  called as `bounds()` as though it were a function. Renamed the parameter to `container` and
  called `.getBoundingClientRect()` on it directly. Confirmed live with a dispatched
  pointerdown/pointermove/pointerup sequence and an exact pixel-delta match, not just "no error."

**Deliberately not built, per "lay the groundwork, tackle the complex ones one at a time":** the
real correspondence-tree UI behind Contacts, the hacking-gated intranet/browser from
`terminal-login-landing-page`, and any Foundry wiring. The phone reads its own small local copy of
the six-candidate roster rather than sharing live state with `console.js`'s marker system — the
two are independent prototypes for now; factor that out only once a real second call site needs
to agree with the first, not before.

---

## 5c. The terminal — §5b rebuilt after live review (pass 17)

**§5b was reviewed live and the user changed course on both of its headline decisions.** Not a
refinement — a genuine rebuild, reusing only the Pet mechanic and the overall "big obvious button
in the top rail" idea. Both calls are the user's own and are stated here verbatim because they
correct something this doc previously called "locked":

1. *"The phone you've made is very modern."* The small floating draggable window IS the generic
   modern-app-mockup form factor, independent of whatever renders inside it — a phone silhouette
   is how every landing page shows an app, so building one reads as "a mockup of a phone app," not
   as "a piece of 1950s hardware." Killed outright, not resized.
2. *"I'm deciding against pixelated."* `ideas/entries/terminal-login-landing-page.json` had
   explicitly locked a chunky low-res pixel OS for the on-screen visuals. The user has full
   authority to revisit their own earlier call, and does so here — that idea entry has been
   updated in place (2026-09-06) rather than left contradicting the current build.

**The replacement, `.bi-terminal` (`design/ui/phone.js`, `bi-components.css` §8):** a panel that
rises from the chassis floor and fills 80% of the scene on open — the concrete reason given is
worth keeping verbatim, since it is the actual design constraint driving every other choice here:
*"we'll have to serve website pages and emails so this amount of space is better."* A phone-sized
window cannot honestly hold an inbox.

**Rendering direction: "a computer subset of the design decisions we've made so far."** Not a new
register — GLASS, the one the main dome/subdomes/pilot-ID panel/marker cards already use (Chakra
Petch legends, Oxanium display, Share Tech Mono for the terminal's actual message/email body
text — a monospace chat log reads as "a computer terminal," which is exactly right for a
1950s-tech setting, and is not the same move as the abandoned pixel OS). One deliberate exception:
the Medical Report is a genuine *document*, so it renders in **PAPER** (`.bi-doc`, `.bi-stamp`,
`.bi-form-row` — all reused verbatim from the existing Standing Order 14 work, not reinvented).
This is not a special case bolted on for variety; it is the two-register rule (§1) applied
correctly — a document does not stop looking like a document because a computer is displaying it
instead of a hand, so `.bi-terminal__main--paper` swaps the surrounding field to a neutral dark
"viewer canvas" the same way a real PDF viewer frames a white page, rather than trying to make the
document itself look like a screen.

**Content, per the new brief, six apps on a left-hand switcher rail:**
- **Messaging** — real two-pane channels/DMs, live send (typing and hitting Enter appends a
  message as you, `04`), seeded with campaign-grounded flavour lines from the existing roster.
- **Email** — inbox + reader, five formal messages in the three Directorate NPCs' established
  voices (`data/npcs/*.json`) plus two system notices.
- **Media Organiser** — answers `terminal-login-landing-page`'s own "a carefully organised form
  so people can look back through lore" requirement directly: a grid of the six location photos
  already generated for the marker cards, plus Standing Order 14 as a document tile, with a
  lightbox-style viewer for either kind.
- **Snake** — a real game, not a demo: `createSnake`/`turnSnake`/`stepSnake` in `phone.mjs` are
  pure grid logic (movement, wall/self collision — correctly distinguishing "hit an occupied body
  segment" from "moved into the tail cell that is vacating this same tick" — food, growth, score),
  tested in `test/tier1-phone.test.mjs`. Rendered in the chassis's own phosphor/steel palette as
  plain grid cells, not sprite tiles — "not pixelated" was about the OS chrome, not about a game
  whose entire point is a grid.
- **Pet** — kept, exactly as asked, redrawn: a small hand-drawn SVG creature in the same
  phosphor-line idiom the main dome's own HUD SVG already uses, replacing the pixel sprite. Same
  `localStorage`-persisted fed/played state as before.
- **Medical Report** — a mocked stand-in for the eventual real character sheet, per the user's
  own idea for how the future onboarding flow should work: ability boosts framed as a school
  "grades" transcript (`.bi-form-row` pairs like "Reflex & Coordination Drills — A- · DEX +2"),
  plus the rest of an SF2E level-1 primary sheet reframed as clinical readings ("Cardiovascular
  Reserve (HP)," "Stress Response — Evasive (Reflex)"). Explicitly stamped and labelled a
  template/sample — this is not any of the six real kids' actual numbers, which have not been
  decided and are not this feature's call to invent.

**Two bugs found live, both DOM/layout behaviour rather than pure logic — the same category
several `console.js` bugs already fell into, so neither is a surprise that the node suite couldn't
have caught:** none, this pass — the two real bugs from §5b's own build (the pet sprite's 0×0
grid cells, the `bounds()`-is-not-a-function drag failure) do not recur here, since the terminal
has no drag behaviour at all (deliberately: a bottom-anchored panel does not need to move) and the
Pet's new SVG rendering does not depend on CSS grid sizing.

**Tooling note, confirmed conclusively while investigating what turned out to be a non-bug:**
`read_console_messages` in this session's Browser pane returns a **stale, cross-navigation
buffer** — it kept reporting the exact `bounds is not a function` error from §5b's now-deleted
`makeDraggable` code, by file:line, across multiple fresh page loads of a `phone.js` that no
longer contains the string `bounds` anywhere (`grep -c` confirmed zero matches). Live functional
checks (`getBoundingClientRect`, dispatched events, actual DOM state) are unaffected and remain
the reliable source of truth; this join the project's existing list of "trust measurement over
this particular tool output" gotchas.

A second apparent bug (Snake showing "GAME OVER" immediately after switching to it) was chased
and disproved the same way: direct reproduction of the exact click sequence showed correct
behaviour both on a fresh load and deliberately repeated. The real explanation was simpler than a
bug — the snake had genuinely never been steered (no arrow key was pressed across the whole
testing session) and, given enough real elapsed wall-clock time across many round-trips, had
simply and correctly run into a wall on its own. Confirmed by restarting and steering it once:
the head moved exactly two rows in the pressed direction, column unchanged.

**Still open, unchanged from §5b's own list, plus one new item:** the real correspondence UI, the
hacking-gated intranet, Foundry wiring, and now explicitly a **condensed companion view** — the
user named this directly as a plausible future piece ("we may produce a condensed version of the
UI... so that people can use messaging without it taking up the entire screen") and was equally
direct that it is a *separate component*, not a resize of `.bi-terminal` — noted here so a future
pass does not try to make one component serve both jobs.

---

## 5d. Director Mode — a second identity for the same button, plus a real-time session bar (pass 18)

**The user's brief, verbatim, since both halves of it shaped a real design decision:** *"Create
another bar, a progress bar, at the top under the current top bar. This is a progress bar that is
based on the current time and there is a highlighted area of time between 7:30 PM and 10 PM...
The idea is that I should be able to see at a glance how far through the session I am. Apart from
that, go wide with improvements that the director will use and appreciate."*

**The session bar (`.bi-session-bar`, `bi-components.css`, `scripts/core/session-clock.mjs`).**
Deliberately a second, independent clock from the toprail's own DAY/TIME readout: that one is the
*fiction's* clock (Day 04, 16:46) and never moves except when the demo's random events advance it;
this one is the *table's* clock — real `new Date()`, a GM's own meta-tool riding on top of the
in-fiction console, not part of it. `sessionWindow()` fixes a 17:00–24:00 display window with a
19:30–22:00 highlighted band (the Monday Group's actual start/end), and `sessionProgress(now,
window)` returns a phase (`before`/`during`/`after`), a fill fraction, and a human label ("Session
starts in 2h 14m" / "38% through tonight's session" / "Running 12m over") — all pure, all
`now`-injectable, tested in `test/tier1-session-clock.test.mjs` (12 tests) without touching a
clock. Layout used a combined token rather than a special case: `--bi-top-stack-height` (toprail +
new bar) replaces every consumer of the old toprail-only height (`.bi-console__left/right`,
`.bi-console__banner`), so the marker-exclusion zone in `console.js`'s `layoutScene()` — which
measures `.bi-console__top`'s real rendered box rather than reading a token — picked up the taller
top stack with no code change at all. Verified live by reading the actual computed geometry rather
than trying to eyeball a 16px strip in a scaled screenshot: the bar's `getBoundingClientRect()`
sits flush under the toprail's, `--start`/`--span` on the highlighted window compute to exactly
35.71%/35.71% (150 minutes of session inside a 420-minute window), and the needle correctly clamps
to the window's left edge rather than going negative when the real time is before 17:00.

**Director Mode itself: the exact same `#phone-btn` opens a different object, not the same one with
extra pages unlocked.** `PLAYER_APPS` and `DIRECTOR_APPS` (`design/ui/phone.js`) are two separate
arrays behind one swappable `currentApps`; `setDirectorMode(gm)` swaps it, relabels the button
("Personal comm device" vs "Director's console"), and — if the terminal is already open — repaints
its nav and jumps to the new set's first app so nothing stale is left on screen. The reasoning is
narrative, not technical: a GM-only board has no business conceptually living on a kid
character's own handset, so this is a full identity swap, the same move already used for the
chassis's own GM-only pods.

**Four apps, each answering a system in `data/campaign/config.json` that had no interactive
form yet** (`scripts/core/director.mjs`, 15 tests — Contact Pool floor/ceiling math and damage-state
stepping including the hulked/operational caps, all pure):
- **Contact Pool** — the actual quiet-morning roll procedure (target 20 dropping to a floor of 13,
  forced at morning 8) rather than a GM doing this arithmetic by hand, plus a "Spring One" control
  (see below) and a shared incident log.
- **Frame Status** — the six Frames' shared damage-state track (operational → degraded → critical
  → hulked) against one shared technician-day pool; repairing costs days and is blocked at zero,
  damage is free and immediate, and a Frame at critical/hulked is visibly `GROUNDED`.
- *(Cut 2026-09-20: the Bleed Board, which served the Bleed track. Removed from this document
  2026-09-25; its code is still in `director.mjs`.)*
- **Scene Cues** — a real episode's scene list (originally Episode 1's nine; that episode was
  deleted 2026-09-13 and the prototype's copy is now fixture data — Episode One,
  `data/episodes/episode-c1e1-mothers-maiden-name.json`, is the live equivalent), mocking the cue
  action a live Foundry `Scene#activate()` will eventually perform for real
  (`design/foundry-module-design.md` §7).

**One real bug found live, not a screenshot artifact this time.** The first version of this pass
added "False Contact" as a third chassis-panel bank (three lettered buttons, next to the existing
single `Contact` key) — `#gm-pod`'s own `.bi-pod` cap is `calc(var(--bi-bar-height) - 8px)` = 160px,
and measuring live (`scrollHeight` vs `clientHeight`, not another size estimate) showed the pod was
already rendering 168px of content before this pass touched it — an 8px sliver nobody had
apparently noticed — and the new bank pushed that to 228px: a real 68px overflow, silently clipped
by that same rule's `overflow: hidden`, meaning the new buttons would have been partly or wholly
unclickable. Closing a gap that size without either shrinking spacing tokens every other pod also
depends on, or growing `--bi-bar-height` itself (a console-wide change well out of proportion to
one small addition), wasn't possible by trimming — so type selection was relocated into the
terminal's own Contact Pool app instead (a `Spring One` row: `CONTACT` / `FALSE · A` / `FALSE · B`
/ `FALSE · C`, each just calling the same `logContactIncident()` the chassis button already used).
This isn't only a size fix: `console.js`'s own standing comment on that button already states the
type is "tracked only for the GM's own reference... never surfaced anywhere a player would see
it," which describes the terminal's private console better than three lettered keys on a shared
physical panel ever did. The chassis keeps exactly one physical `Contact` key, deliberately
generic, per that same comment: the alarm must never itself give away which kind it is.

**One real regression, found and fixed while wiring the chassis's Contact button into the same
log:** `.bi-phone__screen` — deleted when §5c rebuilt the phone as the terminal — was still the
selector the glass-corruption effect (`--bi-bleed`, built for the since-cut Bleed track) used to
reach "the terminal's own glass," matching nothing since that rebuild (`querySelectorAll` on an
unknown class returns an empty list, not an error) and so silently no-op'ing. Replaced with
`.bi-terminal__main`; verified live by dispatching a real `input` event at 70% on the corruption
slider and reading the resulting `.bi-corrupt` class and `--bi-bleed` value back off the element,
not by re-reading the source a second time.

**A testing-methodology note worth keeping, distinct from the stale-console-buffer gotcha already
on record:** every app in this file re-renders its whole pane wholesale on a state change
(`main.innerHTML = ...` / `list.innerHTML = ...`), consistent with every other app already in
`phone.js`. A verification script that caches an element reference across a click that triggers one
of these re-renders is holding a detached node afterward — it still exists in JS, but real `.click
()` events on it no longer bubble anywhere live, so a loop of ten clicks silently only lands the
first one. Re-querying the live DOM after every state-changing click (rather than caching across
one) is what actually verified Frame Status's damage/repair stepping and Scene Cues' cue/uncue
exclusivity — all confirmed correct once measured this way.

**Still open:** the Fight scene's `encounterRef` is present in the mock data but not wired to anything;
Scene Cues' "cue" action is a local highlight only, standing in for the real `Scene#activate()` a
live Foundry world will eventually perform.

---

## 6. Not done yet

- **Never loaded into a live Foundry.** `module.json` does load the stylesheets, and
  `core/theme.mjs` + `foundry/theme.mjs` do apply `body.bi-theme` and inject the SVG
  filter `<defs>` on `ready` — that wiring is real and tested (`test/tier3-theme-contract
  .test.mjs`). What is still unverified is Foundry itself: the palette, typography,
  redaction and the "any width/height" fixes are all proven in a plain browser against
  the real `foundry2.css`/`sf2e.css` (`design/ui/foundry-harness.html`) and by
  `getComputedStyle` sweeps, never inside an actual running Foundry session with a real
  canvas, real ApplicationV2 windows, and real scene dimensions. Still the single
  biggest open item.
- **The command bar's physical chassis (dials, rails, pods, pins, marquee) exists only
  in `design/ui/style-prototype.html`.** Nothing injects that markup into Foundry's
  `#interface` yet — only the retint/redaction/font THEME is wired in. `.bi-console`'s
  "fills whatever box contains it" behaviour (§3e) is therefore proven in the prototype's
  own demo wrapper, not yet against Foundry's real `#interface`, which is the actual
  target shape it needs to fill.
- **Whether to bundle Shippori Mincho** (see §1b) — the difference between hoping for the
  Mincho look and guaranteeing it.
- The bar is a static prototype: no Foundry data binding, no socket wiring, no GM/player
  permission split in code, and the macro bank is not wired to real macros.
- Character sheet work is a fragment showing the treatment, not a re-skinned sf2e sheet.
- No decision on whether the roster moves into the bar (`body.bi-roster-in-bar` exists and
  is off by default) — a table-feel call, not a technical one.
- Audio faders are visual only; the loudness-normalization question in
  `in-scene-ui-panel-mimetic-controls` is untouched.
- The narrative half of `redacted-document-chain` — how a party obtains a less-censored
  version, whether clearance is per-player, how much of the adventure rests on it — is
  entirely open.
