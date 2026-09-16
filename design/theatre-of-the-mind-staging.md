# Staging theatre of the mind

*Written 2026-09-07, from Ingram's correction to how the theatre-of-the-mind console should
work. Companion to [`ux-doctrine.md`](ux-doctrine.md) (which decides what is on screen) and
[`npc-social-intel.md`](npc-social-intel.md) (which decides what is known about a person).
This decides what a **scene** looks like.*

---

## 1. The correction

The V2 console so far treats theatre of the mind as a **list**: the cast board is names in rows,
one line each, and the Character Card is a panel you open about one of them. That is a GM's tool.
It is not a scene, and it gives the players nothing to look at.

The correction: **a theatre-of-the-mind scene is a composed stage.** Location is carried by
background art. The people in it are portraits in frames. The Director controls who is on that
stage and when they arrive, and an arrival is an *event* — the screen announces it.

> *"I imagine it using the art from the artwork inbox that corresponds to the actual character art
> and displaying them in a frame like the encounter boxes in V1... So we show location with the
> background art and then I can reveal or hide character portraits in frames to give the players
> buttons they can press to bring up information or do things. The Director goes from hidden to
> revealed, it appears on people's screens, we sting the screen with a bold typeface header that
> informs the players of their arrival in the scene even to create drama."*

Three things follow, and they are the whole design:

1. **The scene has a picture.** Not a token grid — a place.
2. **People appear in it, on the Director's cue**, and the appearance is dramatised.
3. **A portrait is a control**, not decoration. It is the players' way into everything the console
   already knows about that person.

That third point is what makes this worth building rather than merely pretty. Stages 1–3 already
built the machinery — rolling checks, the Character Card, social intel — and gave it only a GM-side
door. This is the players' door to the same rooms.

---

## 2. What already exists that this should use

This is not a new subsystem. Almost every piece is built or designed; the work is composition.

| Piece | State | Role here |
|---|---|---|
| `.bi-marker__card` (V1) | Built, in `bi-components.css` | The frame's visual vocabulary — see §3 |
| `.bi-banner` + `core/notices.mjs` | Built, unused in V2 | The arrival sting — see §5 |
| Character Card (`social-intel.mjs`) | Built, stage 3 | What a portrait opens — see §4 |
| `rolls.mjs` / inline checks | Built, stage 1 | What a portrait can ask for |
| Foundry Scenes + transitions | Native, verified | Background art and scene changes — see §6 |
| `artwork/in-tray/` | 129 scenes, 66 portraits, 12 mechs | The actual art — see §7 |
| `in-scene-character-portrait-frames` | idea, `new` | This document is that idea, specified |
| `asset-review-pipeline` | idea, `accepted` | The dependency that makes art usable — see §7 |

**Nothing here proposes a second rendering engine.** The Foundry Scene stays the background; our
frames are UI drawn over it. That decision is §6 and it is the most important structural call in
this document.

---

## 3. The frame

Ingram's reference is right and worth taking literally: V1's encounter boxes already solved this.
Their structure, from `design/ui/console.js`:

```
.bi-marker__card
  header .bi-marker__head
    .bi-plate--brass .bi-marker__code     brass code plate  — "CX-04"
    .bi-plate        .bi-marker__name     bone name plate   — "Contact, Unclassified"
    .bi-lamp--lit    .bi-marker__lamp     status lamp       — amber / red / resonance / cyan
  figure .bi-marker__scope
    img                                   THE ART, object-fit: cover
    .bi-marker__fix / __status            imprinted data, bottom corners
  .bi-marker__risk .bi-screen             a gauge with a band label
  .bi-marker__muster                      who has signed on
  footer .bi-marker__foot
    .bi-key--go                           the commit action
```

The parts worth keeping verbatim for a character:

- **The scope figure.** Art at `object-fit: cover`, `filter: saturate(0.82) brightness(0.86)`
  until hover or selection, then `filter: none`. That dimming is doing real work — the comment in
  the CSS says it outright: *"Dimmed so the plates and lamps outrank the picture until you look."*
  A row of six full-saturation portraits would fight the console for attention every second of the
  session. Dim by default; **the person you are dealing with lights up.**
- **The scanline overlay** (`--bi-mat-scanline`, `mix-blend-mode: multiply`). It is what makes the
  art read as *displayed on the console* rather than pasted onto it. Non-negotiable for the
  campaign's voice.
- **The two plates.** Brass for a code, bone for a name. A character frame wants the same:
  designation plate + name plate.
- **The lamp.** V1 used it for risk kind. A character frame should use it for the thing that
  actually changes: the comms-alert light the portrait-frames idea already specifies, and/or
  attitude.

What should **not** carry over: the risk gauge and the muster berths. Those are sign-up mechanics
belonging to the day ring (stage 4), not to a person standing in a room.

### The frame is a button

The whole card is the control. Clicking it should do the obvious thing, and what is obvious differs
by seat:

- **Player** → opens that character's Character Card, player-redacted: attitude as narration, only
  the Facts the party has actually learned, and the count of what they have not. All of that logic
  is written and tested already (`core/social-intel.mjs`'s `buildCard({ isGM: false })`).
- **Director** → opens the GM view: every Fact, its reveal trigger, the attitude scale as an
  editable line.

A secondary action row under the frame is where the portrait-frames idea's buttons go — the comms
light, "ask them for a check", "start a conversation" (the accepted `dialogue-management-panel`).
**Keep it to two or three.** A frame with six buttons is a character sheet, and the doctrine's Law
13 already says the chassis is for what happens inside a turn and everything else lives elsewhere.

---

## 4. Hidden and revealed

The Director controls a per-character state with three values, not two:

| State | On the Director's board | On a player's screen |
|---|---|---|
| **Absent** | not in this scene | nothing |
| **Concealed** | listed, dimmed, marked | **nothing at all** |
| **Revealed** | listed, lit | the frame, on the stage |

The middle state is the interesting one, and it has a hard rule attached.

> **Concealed means the player's client never receives the character, not that it does not render
> them.** Same standard as Law 11 and the Character Card's authored-Facts vault: a portrait hidden
> with CSS is a portrait a curious player can find in devtools, and knowing that an unrevealed
> someone is standing in the room is exactly the information concealment exists to protect.

Foundry gives this natively and we should use it rather than invent: a Token's `hidden` flag plus
document ownership already governs what is sent to a client. Whatever backs the stage should ride
on the same mechanism, so the reveal is enforced by the server, not by our template.

**Reveal is one-way in the fiction, two-way in the tooling.** A GM can re-conceal someone who has
left the room; that is a normal scene event, not an undo. But a character who has been revealed is
*known* — the Character Card's Facts persist exactly as they already do, and re-concealing the
portrait does not un-learn anything.

---

## 5. The sting — arrivals and departures

**This is the heart of the idea, and it is a per-character event, not a page transition.** When
someone joins the scene or leaves it, the screen performs that fact. Clarified by Ingram directly:

> *"The transitions I'm talking about are actually basically visual stings for characters leaving
> and joining the theatre of the mind scene."*

A sting is **one event with coordinated expressions**, and it comes in three weights the Director
chooses between. That ladder is the design:

| Tier | What happens | For |
|---|---|---|
| **Quiet** | The frame simply engages on the stage. No banner, no splash. | Background presence — technicians, a crowd, people who are simply *there* |
| **Announced** | Banner drops + frame engages. | A notable arrival. The default for anyone who matters this scene. |
| **Splash** | Full-screen character art + typography, resolving down into the frame. | A first appearance, or an arrival that changes the stakes |

The tiers exist because **the loud one only works if it is rare**. A splash on every entrance is a
loading screen. The Director picks the weight, because "does this arrival matter" is exactly the
kind of artistic judgement doctrine §10.4 says never to automate.

### The banner half

`.bi-banner` is a brass chevron that drops from under the top rail, and `core/notices.mjs`'s
`NoticeQueue` already handles ranking, pre-emption, a merge window and a cap — built, tested at
tier 1, and currently **without a single consumer in V2**. This is its consumer.

Its vocabulary maps cleanly: `--kind` colours it (`info` cyan, `caution` amber, `alert` vermilion,
`resonance` violet), `__cap` takes a short kind word, `__glass` the text, `__time` a stamp. The
typeface should be the display register — `--bi-font-display-jp` or `--bi-font-stencil` — at a size
the console never otherwise uses. Its whole job is to be **louder than the rest of the interface for
two seconds** and then get out of the way.

### The splash — the loud tier

✅ **Built (2026-09-07)**, `module/blank-inheritance/scripts/foundry/splash.mjs` +
`core/splash.mjs` + `templates/stage/splash.hbs`. The biggest version of a sting **takes the whole
screen**:

> *"We could use these stings to show off their character art at a very large size and put text
> information in stylish typeface on top of it, then fade back into the theatre of the mind scene."*

This is the anime character-introduction card, and it is exactly right for a campaign whose whole
visual thesis is 1950s Japanese industrial-military — a **spot-colour propaganda poster**, one
black plate plus one ink colour, turned out to be the concrete bridge between "Persona-esque" and
that voice, once a first pass was reviewed live and corrected twice. **Four beats**, not three —
Dip was added on review:

1. **Take.** Fades in while a diagonal slash wipe reveals the art. The stage behind it goes to a
   scrim.
2. **Hold.** Their name lands in the display register, with a subtitle line: affiliation. Roughly
   1.6 seconds — long enough to read, short enough that a GM mid-scene does not resent it.
3. **Dip.** A beat of full black — everything, art included, fades out before anything fades back
   in. Not in the first build; added after live review asked for a cut to black between the
   portrait and the landing shot rather than a direct dissolve.
4. **Resolve.** Fades back in while collapsing down into the frame the character now occupies on
   the stage — the art does not cut away; it *becomes* the small portrait, so the table sees where
   that person now lives on screen. Both Take and Resolve run longer than the first pass shipped
   with, again from live review ("fade in longer, fade out longer").

That fourth beat is what makes it a sting rather than a slideshow. The splash should **land
somewhere** — it teaches the player which frame is now theirs to click. Built as a FLIP-lite: the
target frame's on-screen position is measured once when Resolve begins, not tracked continuously: if
the frame cannot be found at all, it fades from centre instead, rather than throwing.

**Composition, corrected from the original plan.** The staged portraits are all a consistent 2:3
(tall, narrow); a first draft ran the art full-bleed across the whole screen, and live review caught
that this crops nearly the entire vertical frame away to fill a wide viewport — cutting faces off,
not "large, undimmed". Built instead as a **portrait-shaped panel** on the right ~44% of the screen,
sized close enough to the source art's own ratio that `cover` only ever trims a little off the
sides, with the typography in the negative space to its left.

**The colour is text-only, not on the portrait.** The original plan called for a duotone wash on the
art itself when a faction accent exists; live review reversed this directly ("the colouration of
portraits isn't the best idea, change the text colour not the portraits"). Built as shipped: the
portrait is grayscale, always, full stop — the accent (`--bi-vermilion` for the Directorate today,
see `core/splash.mjs#FACTION_ACCENTS`, one line per faction, nothing else pre-added since no other
faction file exists yet) lives entirely in the name's colour, the subtitle's rule and colour, and the
seal's ring.

**Type**, decisively assigned rather than either/or: the name in `--bi-font-display-jp` (elegant,
literary Mincho), the subtitle in `--bi-font-stencil` (a classification line, not a person's name).
**"More striking typography"** (live review) is answered by a genuine size increase plus a Persona-
style oversized, near-invisible ghost echo of the SAME name string behind itself
(`attr(data-text)`, not a second invented line) — scale contrast, not more words.

**No invented seal text.** The original plan reached for `.bi-stamp` (its rotated, multiply-blended
JP/EN text treatment) for the seal; built instead as a plain accent-coloured ring with nothing
inside — CLAUDE.md is explicit about not inventing content, and there is no authored Japanese line
anywhere to draw from. `.bi-stamp` itself was left untouched; forcing it empty and re-blended for a
dark backdrop (it's tuned for paper) would have fought its own design rather than reused it.

**What goes on it:** name, affiliation. **Not stats, and not yet a "standing" line** — the schema
carries an optional `standing` field for later, unused by the demo cast. This is drama, and the
moment a splash carries a stat block it becomes a character sheet that happens to be animated.

**Non-negotiable constraints**, because a full-screen takeover is the most irritating pattern in UI
when it is wrong — all built and live-verified:

- **Skippable.** Click or any key dismisses immediately, cutting straight to Resolve.
- **Never blocking.** It must not eat a roll in progress or swallow input aimed at the console. It
  is a scrim and a picture, not a modal.
- **GM-triggered only, NPC-only.** Never automatic on reveal, and never a PC — a fourth key on the
  frame (§3's "two or three keys, never six" deliberately exceeded by one), not a modifier on the
  reveal toggle, because Splash also has to work on an already-revealed character, where the
  toggle's own plain click means *conceal*.
- **Never barrages.** No queue — a single-slot guard drops a second simultaneous candidate rather
  than queuing it, so introducing several characters in one scene is paced entirely by the GM
  clicking again once each one ends, never by software auto-advancing through a list.
- **A repeat is a deliberate choice, not a reset.** The Director can re-splash an already-introduced
  character for drama; a `stingSeq` nonce on every write is what makes that second, otherwise
  byte-identical event actually re-fire on every client.

Not built: shared machinery with a cold-open title card (`#99`, stage 6 of
`foundry-module-design.md`) — a real future opportunity, not attempted here.

### The frame engage — the middle tier

The frame's own entrance, without taking the screen. The motion vocabulary is already in the
tokens: `--bi-ease-servo` with `--bi-dur-snap` / `--bi-dur-servo` / `--bi-dur-sweep`. Those are
named for machinery on purpose. **A character should arrive the way a piece of equipment engages** —
with a servo's authority, not a web page's fade.

Entrance treatments worth building, bound to what the arrival *means* rather than picked at random:

| Sting | Motion | Reserved for |
|---|---|---|
| **Engage** | Frame snaps up from the stage floor on `--bi-ease-servo`, plates stamping in a beat behind the art | The ordinary arrival. Most people, most scenes. |
| **Shutter** | The scope irises open over the art, plates already in place | Directorate business — someone arriving in an official capacity |
| **Alert** | Hard cut in, lamp flares vermilion first, frame settles after | A hostile or unwelcome arrival |
| **Signal** | Art resolves out of `glitch`/scanline noise, tinted `--bi-resonance` | Anything touching Resonance, Bleed or a Claimant |

Departures get the same treatment in reverse and **must not be the entrance played backwards** —
that reads as a mistake. A departure should be quieter and shorter: the lamp goes dark first, then
the frame retracts. Someone leaving is information, not an event.

### Rules, so stings do not become wallpaper

1. **Quiet is the default action.** The Director's ordinary reveal button does the quiet tier.
   Announced and Splash are deliberate, separate choices. If the loud one is the default, every
   arrival is loud and none of them land.
2. **One at a time, and they queue.** Already true of the banner — `NoticeQueue` does ranking and
   pre-emption. The frame animation and the splash must respect the same queue rather than running
   on their own timers, or two simultaneous arrivals will talk over each other. A splash
   mid-splash should never be possible.
3. **A sting means something.** Four entrance treatments bound to four kinds of arrival is a
   language the table learns; a different flourish each time is noise wearing a costume.

### The timing problem, named

A reveal is a document change that reaches every client over the socket. Clients will not run their
stings at exactly the same instant, and a player on a slow connection may see the frame before the
banner or vice versa. **Both halves should be triggered by the same client-side event** (the
document update landing), not scheduled independently, so each client stays internally coherent
even if the table is a few hundred milliseconds apart.

---

## 6. Background art, and the structural call

**The Foundry Scene is the background. Our frames are UI over it.**

The alternative — a full-screen "stage" surface we draw ourselves, with our own background image
and our own portrait layout — is tempting and wrong. Taking the Scene means inheriting, free and
already working:

- scene switching, with **13 built-in transitions** (`fade, swirl, waterDrop, morph, crosshatch,
  wind, waves, whiteNoise, hologram, hole, holeSwirl, glitch, dots`) verified in
  `foundry-technical-reference.md` §3;
- a per-scene *default* transition in the Scene schema (`transition.{type, duration, activeOnly}`),
  so a location can declare "always hologram in over 1500ms" without any caller knowing;
- `activate()` / `pullUsers()`, which push a scene change to every client;
- playlists bound to scenes, lighting, weather, and the whole asset pipeline the module already
  syncs into.

Rebuilding any of that to own a background image would be the single worst trade in this document.

### Scene transitions are for LOCATION changes only

Worth stating plainly, because the two are easy to conflate: **Foundry's scene transitions and §5's
stings are different mechanisms doing different jobs.**

| | What changes | Who owns it | What it says |
|---|---|---|---|
| **Scene transition** | the location | Foundry (`CONFIG.Canvas.sceneTransitions`) | *we are somewhere else now* |
| **Sting** (§5) | the cast | us (`NoticeQueue`, our own overlay) | *someone arrived, or left* |

Most scenes use exactly one of them. A conversation that runs for an hour has no scene transition at
all and several stings; crossing the city has one transition and no stings. They should not fire
together — a location change and an arrival landing at the same instant are one moment, and the
transition carries it.

**The Scene document already carries its own default — `transition.{type, duration, activeOnly}` —
and setting it is the whole mechanism.** Traced end to end (`Scene#activate()` →
`_onActivate` → `view()` → `Canvas#draw()` → the private `#animateTransition()`,
`client/canvas/board.mjs:1271-1302`): unless a caller passes an explicit `viewOptions.transition`,
that method reads `this.scene.transition` — the field sitting on the document — directly. So
`Scene.create({..., transition: {type: "glitch", duration: 1200}})` is sufficient **on its own**:
no adapter code, no hook, no wrapper around Foundry's own "activate this scene" button. This is why
`core/generators/stage-scene.mjs#buildStageSceneData` now passes a scene's own `transition` field
straight through from `data/campaign/stage-demo.json` — the whole binding is data, not code.

**Correction to what was believed here before checking the real shader source
(`client/canvas/rendering/filters/transition.mjs`):** the 13 shipped types are not 13 filter
classes — every one of them shares a single class, `TextureTransitionFilter`, distinguished only by
an integer passed as `.type`. All 13 effects are hand-written GLSL in one shared fragment shader with
a closed, hardcoded `if/else` chain; there is no generic wipe-shape or mask-texture system a new type
could plug into, and a module cannot add a branch to that shared class — a genuinely new visual needs
its own filter class (which the shared vertex shader, uniform/texture-sampling scaffolding, and
`BaseShaderMixin`'s constants/noise helpers are all reusable for, so this is smaller than it sounds —
see the estimate below). Also corrected: **`hole`/`holeSwirl` are not a circular iris.** Both zoom the
UV coordinates outward from centre and clip to an axis-aligned box — on screen it reads as a
shrinking/growing *square* window (`holeSwirl` adds a spiral twist and a darkening pass). No shipped
type is a true circular aperture. `holeSwirl` is what stands in for "Directorate business" in the
worked example (`stage-demo-command`) today — a real, working, distinctly mechanical-reading wipe,
just not literally the iris this section originally pictured.

**Also corrected: "an unknown type silently falls back to fade" is not what actually happens on the
path that matters.** That fallback is real, but only for the *imperative* route
(`canvas.transition.run()`, e.g. Scene Config's own preview button) — and even there it
`console.warn`s rather than staying silent. Ordinary play uses the *declarative* route above
(`#animateTransition`), and a **missing** key there falls back to a hard cut with **zero console
output** — no fade, no warning. Worse, a key that **exists but is misconfigured** (no `filterClass`,
or a `filterType` the class doesn't recognise) doesn't fail safely at all: `TextureTransitionFilter`'s
own `.type` setter throws, and it does so from inside a PIXI `postrender` listener that nothing in
Foundry's calling code awaits or wraps in `try`/`catch` — an uncaught exception, not a clean fallback.
So "safe enhancement, never a breakage" was too optimistic: a **missing** key is safe (hard cut,
silent); a **broken** one is not. Anything registered here needs to actually work, not just exist.

Two would eventually carry the campaign's voice: an **iris / shutter**, a genuine circular aperture
matching the console's whole "machined object" thesis (not shipped — would need its own ~20-40 lines
of new fragment-shader GLSL plus a small filter-class wrapper, reusing everything else for free; real
but shallow work for a codebase that has never written a shader, and worth doing live in the engine
rather than blind, since a broken shader fails the ugly way described above), and the shipped
**`glitch`**, reserved *specifically* for Resonance and Claimant events so that distortion always
means the same thing — free the moment there is a Resonance-flavoured scene to set it on (§9 step 8).

The same discipline as §5 applies, for the same reason: **a transition should mean something.** Bind
types to kinds of event — ordinary travel fades, Directorate business shutters, anything touching
Resonance glitches — rather than varying them for novelty, or none of them carries information.

One implementation fact, so it is not rediscovered the hard way: there is **no hook that fires when
a transition starts or ends** (verified). Anything that must happen *after* one — including a sting
for whoever is waiting in the new location — has to be sequenced by the code that triggered it.

---

## 7. Where the art comes from — and the honest dependency

`artwork/in-tray/` already holds real, on-voice material:

| Directory | Count | Contents |
|---|---|---|
| `scenes/` | 129 | Named sets (`bar_01`–`05`, `control-panel-01`–`08`) plus generated bunkers, interiors |
| `character-portraits/` | 66 | 1950s Japanese cadets, doctors, officers, police, liquidators in haz suits, thugs, wrestlers — plus `aliens/` and `environment/` subfolders |
| `mechs/` | 12 | Frames, including a wreck and two construction units |
| `landscapes/` | 4 | Matte paintings |

It is genuinely good and genuinely unusable as-is. Most filenames look like
`garsondee_a_japanese_1050s_military_doctor_portrait_1950s_han_172ffcd7-….png` — a prompt fragment
and a UUID. **Nothing maps a portrait to a character.**

That mapping is precisely what the already-`accepted` `asset-review-pipeline` idea exists to
produce (AI-catalogued, human-confirmed, then organised out of the in-tray). **This design depends
on it**, and I would rather say so than pretend a naming convention will appear on its own.

The minimum this needs from that pipeline:

- a stable id per image, surviving the rename out of `in-tray/`;
- a `portrait` field on `npc.schema.json` / `kid.schema.json` pointing at one;
- a `background` on the episode's scene entries pointing at a `scenes/` image;
- the "assigned once, never double-used" rule the in-tray was built around, so two NPCs never
  share a face by accident.

Until then the frames can render Foundry's own `actor.img`, which is already correct plumbing and
degrades to a silhouette when unset.

---

## 8. What this is not

- **Not a replacement for the cast board.** The board is the Director's index — many creatures, one
  row each, scannable. The stage is the players' view. Same data, two shapes, exactly the split
  doctrine §10 already draws between a sheet and a board.
- **Not a token-less combat mode.** This is mode 1. When initiative starts, the console changes
  mode and the stage is not what a fight is run on.
- **Not a dialogue system.** Speech bubbles and conversation trees belong to
  `dialogue-management-panel` and `in-universe-correspondence-negotiation-system`. A portrait may
  *open* those. It should not reimplement them.

---

## 9. Build order

Sequenced so each step is usable alone, and so the riskiest unknown is not last.

**Steps 1, 2, 3, 5 and 6 are BUILT** (2026-09-07), verified live in a real Foundry world against four
worked scenes — one per arrangement. What that pass actually established, beyond the code:

- **The camera lock is real and is undocumented API.** There is no Scene field, no setting and no
  cancellable hook for it in v14.367. `canvasPan` is dispatched with `Hooks.callAll`, so it cannot
  be cancelled, and it fires *after* `stage.pivot` and `stage.scale` are already assigned — a hook
  can only correct the camera a frame late, visibly. `Canvas#_constrainView` is the one choke point
  every pan and zoom routes through, so `foundry/stage-camera.mjs` replaces it. It is marked
  `@internal`; a contract test in `tier3-contract.test.mjs` is the canary for it moving.
- **`background` is no longer a Scene field.** It is on the embedded `Level` document;
  `Scene#background` is a deprecation shim. Writing it at the top level of scene data produces no
  picture and no error at all. Neither does leaving `padding` at its 0.25 default — the art draws
  inside a border of Foundry's default mid-grey.
- **Law 11 holds live, not just in a test.** Before the Director reveals a concealed member, the
  Scene flag every client receives contains neither their name nor their id; after, it does. The
  authored cast lives in a GM-only JournalEntry, and only the revealed subset is published.
- **Six frames at once is comfortable**, answering half of open question 2: at a 1920 viewport six
  PCs sit in one centred row at 146px each with room to spare. The frame size steps down by
  headcount rather than needing a scroll.
- **Open question 4 got a de facto answer worth flagging, not closing.** A player on a different
  scene does not hear the banner — `announceCastChange` only ever runs for the scene the client is
  currently viewing, the same guard `syncStage`'s repaint already used. This was not a deliberate
  design call so much as a consequence of there being one stage overlay, for one active scene, per
  client; reaching a player elsewhere would need an independent notification channel, which is a
  real design decision and not one to make by accident while wiring a hook. Flagging it rather than
  treating the question as settled.
- **The tier has to travel as data, not as a live argument.** The click that reveals someone
  happens on exactly one client; the banner has to appear on every client from the SAME document
  update landing (§5's timing rule). So Quiet vs Announced is written onto the cast member itself
  (a `sting` field, carried through `publishedCast`'s allow-list) rather than passed to a notify
  call — every client reads the same field off the same data and reaches the same answer
  independently. Verified live: a plain click published `sting: "quiet"` and no banner; a
  shift-click published `sting: "announced"` and the plate dropped with the character's name,
  merged its counter on a rapid repeat, and dismissed cleanly. Opening or switching to a scene
  primes silently — nobody already on stage reads as a fresh arrival.

1. **Frames on the stage, GM-revealed, no art.** ✅ Built. Actor images and the V1 card treatment.
   Proves the reveal path, the permission model, and the layout against a real scene.
2. **Portrait opens the Character Card**, seat-appropriate. ✅ Built — the frame is a button, and
   both seats reach the same card, which redacts itself.
3. **The quiet and announced tiers.** ✅ Built. `NoticeQueue`'s first real consumer, and — per its
   own framing below — the point the feature is genuinely finished; everything after this is
   amplitude. Reveal is one control with a modifier (plain click Quiet, shift-click Announced),
   the same vocabulary DirectorBar already uses for checks, rather than a fourth key on a frame
   that already has three. Departures never sound the banner, at either tier — a deliberate
   reading of "someone leaving is information, not an event," not an oversight.
4. **The frame engage.** ✅ Built (2026-09-07). All four treatments — Engage (a servo snap up, the
   plate landing a beat behind the art), Shutter (a mechanical iris over the art, Directorate
   arrivals), Alert (a hard cut plus a vermilion lamp flare, hostile arrivals, reachable only by
   explicit override — nothing in the data says "hostile" yet), Signal (a `steps()` glitch tinted
   through `hue-rotate`, same override-only reachability for Resonance/Claimant). `core/engage.mjs`
   selects the treatment the same way `core/splash.mjs` selects a faction accent — a small hardcoded
   table, an explicit `member.entrance` override always winning. A real bug found live, not in a
   test: the `updateScene` hook had always called both `syncStage()` and `refreshStage()` back to
   back, redundant but harmless while every render was stateless — the moment the arrival diff
   became stateful (`StageOverlay#_lastVisibleCast`), the second, silently-redundant render saw the
   first render's own arrival and correctly decided it was no longer new, eating every entrance
   animation one render later than anyone was watching. Fixed by dropping the duplicate call.
   Verified live, precisely (DOM state, not a screenshot): a genuine arrival gets flagged with the
   right treatment; an unrelated re-render — someone else revealing — never re-flags an
   already-visible member.
5. **Scene backgrounds via real Scenes.** ✅ Built, plus the camera lock that makes a staged scene a
   picture rather than a map — gridless, zero padding, cover scale, pivot pinned. Per-scene default
   transitions are still unused.
6. **Real art.** ✅ Partly: `tools/stage-assets/stage_assets.py` reads a manifest that names each
   image by a STABLE ID, resizes it, and writes it into the module as `<id>.webp` — 50MB of in-tray
   PNGs down to 1.6MB, and nothing downstream has to move when the real pipeline renames the
   sources. That is the minimum §7 asks for and explicitly **not** the pipeline itself: no
   cataloguing, no dedup, no assigned-once bookkeeping. The casting in
   `data/campaign/stage-demo.json` is a DEMO CAST, not a decision.
7. **The splash.** ✅ Built (2026-09-07), once real staged art existed to justify it — exactly the
   ordering this step originally called for. NPC-only (never PCs, a permanent rule, not a demo
   restriction), a fourth key on the frame rather than a modifier (Splash has to work on an
   already-revealed character too, where the reveal toggle's own plain click means *conceal* — the
   opposite of what's wanted), and its own single-slot guard rather than the banner's queue, because
   queuing multiple candidates would be the exact barrage multi-character scenes ruled out having.
   Four beats now, not three: fade in + wipe (Take) → name, affiliation, seal (Hold) → a beat of full
   black (Dip) → fade back in while landing on the frame (Resolve) — Dip and the longer fades were
   added after live review of the first pass. The portrait stays monochrome always; the faction
   accent lives entirely in the type and the seal, not on the art (also corrected after the first
   pass tried tinting the photo). See §5's own text above, revised to match.
8. **Custom scene transitions** (§6). 🟡 Partly built (2026-09-07): `stage-demo.schema.json`'s scene
   entries now accept an optional `transition` object in Foundry's own native shape (not a shape we
   invented), and `buildStageSceneData` passes it straight through into Scene creation data — proven
   sufficient on its own, no adapter code, per the traced call chain in §6. `stage-demo-command`
   (Commander + Caretaker) is the worked example: `transition: {type: "holeSwirl", duration: 1600}`,
   the closest shipped stand-in for "Directorate business," corrected in §6 to not literally be an
   iris. **Not yet live-verified** — the local Foundry instance was unreachable when this was built
   (a recurring environment flake, not a code issue). Still open: whether to build the genuine
   circular-iris custom type §6 now prices at roughly 20-40 lines of GLSL, which needs doing live in
   the engine rather than blind given how a broken shader actually fails (§6). Pure polish either
   way; the furthest thing here from load-bearing.

---

## 10. Open questions

Genuine ones — not rhetorical, and not for me to settle alone.

1. **Where does the stage live on screen?** Portraits over the canvas, positioned by the GM like
   V1's markers? Or a fixed row along one edge? V1's free positioning was for map pins with real
   coordinates; a conversation has no coordinates. A fixed, ordered row may serve better and is far
   less to build — but it loses the "who is standing near whom" staging that free placement gives.
2. **How many frames before the stage is full?** Six PCs plus NPCs will not fit at V1's card size.
   Does the frame shrink to a portrait-and-nameplate at four or more, expanding only on selection?
3. **Do players see each other's frames as controls, or only NPCs?** The portrait-frames idea wants
   visible cross-player communication; that implies PC frames are on the stage too.
4. **Does the sting reach players who are not looking at that scene?** A player on a different scene
   arguably should not be told who just walked into a room they are not in.
5. **Is `concealed` per-character or per-player?** One character hidden from the whole table is the
   common case; hidden from *one* player is a real Blank Inheritance situation (a private meeting)
   and a much larger permissions problem.
6. **~~Does a PC ever get a splash?~~ SETTLED, 2026-09-07: no, never** — Ingram's own words when
   asked directly: *"We only do this for NPCs, not for PCs ever."* Enforced in two independent
   places (the frame template never renders the key for a PC frame; `core/splash.mjs#splashArrivals`
   refuses `kind !== "npc"` regardless of what the data says), not just a convention. A Frame
   launching being the single most splash-worthy image this campaign has is still true — it is simply
   not what this mechanism is for.
7. **Does a departure ever deserve the loud tier?** §5 says departures are quieter than arrivals,
   which is right for someone walking out of a room and wrong for a death or a betrayal. Either
   there is a fourth kind of sting for an exit that matters, or those moments are simply not stings.
8. **What does a splash do to audio?** A full-screen takeover with the scene's playlist continuing
   underneath at full level is the version that feels cheap. Ducking, a one-shot cue, or nothing at
   all are all defensible; the audio system does not exist yet, so this is a placeholder for when it
   does.

---

## 11. The episode title card (addendum, 2026-09-14)

Answers the gap §9 step 7 named and deliberately left alone: *"Not built: shared machinery with a
cold-open title card (`#99`, stage 6 of `foundry-module-design.md`) — a real future opportunity, not
attempted here."* Ingram's own description of the real table ritual, verbatim:

> *"We start every play session with a landing page -> an intro sequence and part of that intro
> sequence is me reading out the title of the 'episode' and then bam I press a button and it should
> appear in wonderful bold typeface for the players to see. We organise the name of each episode in
> advance. I'm reading from a script and when I get to a certain point I press the button which
> reveals the graphics to all players. We also take the players' ability to move the camera, look at
> UI or things like that from them for the intro sequence."*

**The data half is already there.** `episode.schema.json`'s `title` field is exactly "the name of
each episode organised in advance" — `data/episodes/episode-c1s1-mothers-maiden-name.json` already
carries one ("Mother's Maiden Name (Again)"). Nothing new to author; this is a rendering problem, not
a data problem.

**The visual grammar is the Splash tier, §5, reused for a different subject.** GM-cued, full-screen,
bold display typography, Take → Hold → Dip → Resolve — built, live-verified, and exactly what "press
a button, wonderful bold typeface, all players" already describes for an NPC. Reusing it for an
episode title is small in isolation: swap the character's name/affiliation/portrait for the episode's
title (and, if wanted, a subtitle), and it works today. The Resolve beat is the genuine open question,
not a detail — a character's Splash lands *somewhere* (the frame they now occupy on stage); an episode
title has nothing to collapse into. Candidates: fade straight through into the episode's first scene
(Resolve becomes "the scene arrives"), or resolve to nothing and let the next scene transition (§6)
carry the handoff. This is a creative call, not an implementation one — flagged, not decided here.

**The named tension: Splash was built deliberately non-blocking, and this ritual wants the opposite.**
§5 is explicit — *"Never blocking. It must not eat a roll in progress or swallow input aimed at the
console. It is a scrim and a picture, not a modal."* Ingram's intro sequence asks for the reverse: for
its duration, players lose camera control **and** UI interaction entirely, not just attention. Two
different things, and only one is built:

- **Camera lock** — real, shipped (§9: `foundry/stage-camera.mjs` replacing `Canvas#_constrainView`,
  undocumented API, a contract test standing canary for it moving). Already used to pin a staged
  scene's framing; extending it to the intro moment specifically is very likely the same mechanism,
  not new research.
- **UI/interaction lock** — genuinely new, unbuilt, and not the same problem as the camera. Nothing
  in this module currently prevents a player from clicking the console, opening a sheet, or otherwise
  interacting with Foundry's chrome while a full-screen moment plays over it. Given the camera lock
  needed undocumented API and careful live measurement to get right (§9's own account of it), this
  should be assumed to need the same treatment rather than a quick CSS overlay — a `pointer-events`
  scrim may be enough, or may not cover keyboard shortcuts and macro-bar hotkeys; genuinely unverified.
  Filed as its own issue (#155) rather than folded into #99, since it's a distinct technical unknown.

**The transition rule, hardened from a guideline to a floor.** §6 already argues a transition should
mean something — *"ordinary travel fades, Directorate business shutters, anything touching Resonance
glitches... rather than varying them for novelty."* Ingram's "we ALWAYS use transitions" confirms that
as firm production practice, not a suggestion, and closes off the specific failure mode §6 already
found by reading the real shader source: a Scene with no `transition` set doesn't fail loudly, it
silently hard-cuts with zero console output. "Always" means every Scene document declares one — the
missing-key path should never be reached in real play, not just avoided by habit. Which transition
means what (beyond the three worked examples already in §6) is Ingram's own vocabulary to build over
time, the same way the four entrance stings (§5) became a language rather than a novelty — not
something to pre-invent a full table for here.

**Not decided here, tracked instead:** whether the title-card Resolve beat hands off into a scene
transition or the scene transition IS effectively suppressed for that one cut (they would otherwise
both fire within the same moment, which §6 already says not to do for stings vs. scene transitions —
the same "don't fire together" rule plausibly applies to a title card vs. the episode's first scene).

---

*Related: [`ux-doctrine.md`](ux-doctrine.md) §5 (theatre of the mind), §10 (the Director's console);
[`npc-social-intel.md`](npc-social-intel.md) (the Character Card this opens);
`ideas/entries/in-scene-character-portrait-frames.json` (the original idea, now specified);
`ideas/entries/asset-review-pipeline.json` (the art dependency);
`design/foundry-technical-reference.md` §3 (scenes, transitions, the missing transition hook);
`design/foundry-module-design.md` §7 and §9 stage 6 (the original cold-open/outro scope, GitHub #99).*
