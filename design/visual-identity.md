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

---

## 1. The aesthetic, stated once

Giant Robo by way of a 1950s Japanese naval-industrial ministry. Every surface is a
machined object: hammered steel plate, bone-bakelite label inlays, brass bezels, phosphor
glass. Nothing is flat, nothing floats, everything is bolted to something else.

This sits directly on top of `campaign-arc.md`'s locked tone — 1950s Japan, period
industrial machinery rather than sleek sci-fi, the sea-fort Directorate. The panel should
read as government hardware built by people who had to justify its cost.

### The one dishonest colour

The palette is deliberately honest: steel, brass, bone, signal red, phosphor green, and
an amber caution. Exactly one colour in the system does not belong to that century —
**Resonance violet** (`--bi-resonance`).

It is reserved, without exception, for Resonance, Bleed, Anchors and Claimant telemetry.
It is the one reading on the console that the console was never built to take. Spending
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
| Left rail | The five Ground Roles as station keys, evacuation track, Recall Knowledge facts |
| Right rail | Order of battle with integral health meters, round counter, umbilical |
| Scene | Map pins with staggered radar pings; clicking one targets it and announces it |
| Chassis | Ident, quick checks, macro bank, **three instruments**, actions, audio desk, GM direction |
| Marquee | A brass-capped lozenge running campaign status; hover to hold and read |

**The instrument cluster** is one main HUD flanked by two half-size analog dials
(Resonance band left, integrity right). `--bi-dome-half` is defined as half `--bi-dome-size`,
and all three are anchored to the chassis floor, so their centres land on one line by
construction rather than by adjustment.

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
protrusion in proportion. It now shows a role legend, the candidate number, and a live sync
readout — three lines where there was one. The row containing it uses
`align-items: flex-end` so the plate/legend beside it sit level with the instrument's
in-flow lower portion rather than being pulled up into the part that pokes out.

**A colour language for keys.** Every key was the same steel grey regardless of function —
sixty-odd controls with nothing but `.bi-key--armed` (red) to tell any of them apart.
Extended the same idea `.bi-lamp`'s colour modifiers already carry — a control's colour
signals its category — to keys, via the cap's own text colour plus a faint matching
edge-glow, since most keys here are plain text with no icon to tint:

| Class | Colour | Covers |
|---|---|---|
| `.bi-key--go` | phosphor green | Movement (Stride/Step/Face), and Ready — the one proactive stance among the reactions |
| `.bi-key--info` | cyan | Comms, view, and anything that *retrieves* information rather than changing the world: Recall, Sync, Lock, Docs, Centre/Follow/Emote, the transport keys |
| `.bi-key--caution` | amber | Spends a resource, or is GM-only and consequential: Hero, the fortune keys, every Scene control, the costlier reactions |
| `.bi-key--anchor` | Resonance violet | **Anchor only** |

Checks, Saves, dice, Strike/Raise, the routine GM bookkeeping keys (Cue/Turn/Log/Timer),
routine Frame maintenance (Umbil/Vent/Purge) and the condition-toggle keys stay neutral
deliberately — colouring everything would mean colouring nothing.

`.bi-key--anchor` is the one new spend of Resonance violet outside Resonance/Bleed/Claimant
contexts, and it is legitimate rather than a slip: Anchor genuinely is a Resonance-linked
mechanic. A test asserts `--bi-resonance` appears in exactly one `.bi-key` rule, so a future
pass reaching for "something feels special, make it violet" fails loudly instead of quietly
spending the one colour that is supposed to stay rare.

---

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
