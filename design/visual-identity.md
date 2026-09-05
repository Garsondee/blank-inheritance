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

**Panel skin.** `.bi-plate-skin` gives any surface hammered steel with two break lines
placed by `--bi-seam-x` / `--bi-seam-y`, and `.bi-rivet-run` draws an even run of rivets
along an edge as a repeating radial gradient — no element per rivet. Different seam
positions per pod read as different pressings bolted to the same frame.

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

- **Never loaded into a live Foundry.** The palette, components, typography and redaction
  are verified in a browser and by test; the structural overrides in §4 need a real
  session before anyone trusts them. Still the single biggest open item.
- **`module.json` does not load these stylesheets.** Adding `"styles": [...]` is the one
  line that makes the theme go live on the server, and it is deliberately not done —
  that is the user's call, not a side effect of a design pass.
- **The SVG filter `<defs>` must be injected** by the module once per client for the
  ragged redaction edges to resolve. The prototype inlines them; nothing does this in
  Foundry yet.
- **Whether to bundle Shippori Mincho** (see §1b) — the difference between hoping for the
  Mincho look and guaranteeing it.
- The bar is a static prototype: no Foundry data binding, no ApplicationV2 wrapper, no
  socket wiring, no GM/player permission split in code, and the macro bank is not wired to
  real macros.
- Character sheet work is a fragment showing the treatment, not a re-skinned sf2e sheet.
- No decision on whether the roster moves into the bar (`body.bi-roster-in-bar` exists and
  is off by default) — a table-feel call, not a technical one.
- Audio faders are visual only; the loudness-normalization question in
  `in-scene-ui-panel-mimetic-controls` is untouched.
- The narrative half of `redacted-document-chain` — how a party obtains a less-censored
  version, whether clearance is per-player, how much of the adventure rests on it — is
  entirely open.
