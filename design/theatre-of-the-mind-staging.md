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

> **Changed 2026-09-29 (Ingram: "a shared note taking app which can be summoned by clicking on a
> portrait").** Clicking the portrait now opens the **party notebook** on that person's page
> ([`notebook.md`](notebook.md)): the whole table's notes about them, with every player able to write in it
> at once. The Character Card is still one press away, on the frame's own Card key (the last key in the
> row) and from a button in the notebook page's header. A concealed frame (the Director's ghost) is refused,
> because a notebook page's title is visible to every player. What the paragraphs below say the click does
> now belongs to the Card key.

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
| **Signal** | Art resolves out of `glitch`/scanline noise, tinted `--bi-resonance` | Anything touching a Claimant |

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
**`glitch`**, reserved *specifically* for Claimant events so that distortion always
means the same thing — free the moment there is a Claimant-flavoured scene to set it on (§9 step 8).

The same discipline as §5 applies, for the same reason: **a transition should mean something.** Bind
types to kinds of event — ordinary travel fades, Directorate business shutters, anything touching
a Claimant glitches — rather than varying them for novelty, or none of them carries information.

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
   through `hue-rotate`, same override-only reachability for Claimant arrivals). `core/engage.mjs`
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
**Related but distinct, added 2026-09-29 — not a step of this build order.** `foundry/scene-build.mjs`
now places a real, embedded `hidden: true` Token for every named cast NPC in every scene it builds,
purely so the GM can click straight into an NPC's sheet during Theatre of Mind play (Ingram's own
request, unconnected to this document's reveal mechanics). It uses exactly the native mechanism §4
above named as the right one — `Token#hidden`, enforced server-side — but this is NOT the stage's own
reveal/conceal system migrating onto it: `foundry/stage.mjs` still publishes the authored cast through
a GM-only JournalEntry, as §9 step 1 and §12.1 both describe, and that is untouched. Read this as
proof the mechanism works and is already in the module, not as §4 having been rebuilt.

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
   and a much larger permissions problem. **Decided 2026-09-29: both.** Ingram: *"Yes, useful
   functionality. Private reveals, good."* Planned in §12.3.
6. **~~Does a PC ever get a splash?~~ SETTLED, 2026-09-07: no, never** — Ingram's own words when
   asked directly: *"We only do this for NPCs, not for PCs ever."* Enforced in two independent
   places (the frame template never renders the key for a PC frame; `core/splash.mjs#splashArrivals`
   refuses `kind !== "npc"` regardless of what the data says), not just a convention. A Frame
   launching being the single most splash-worthy image this campaign has is still true — it is simply
   not what this mechanism is for.
7. **Does a departure ever deserve the loud tier?** §5 says departures are quieter than arrivals,
   which is right for someone walking out of a room and wrong for a death or a betrayal. Either
   there is a fourth kind of sting for an exit that matters, or those moments are simply not stings.
   **Answered in part, 2026-09-29:** every character gets an exit of their own (§12.5). Whether a
   death or a betrayal gets something louder still is left open.
8. **What does a splash do to audio?** A full-screen takeover with the scene's playlist continuing
   underneath at full level is the version that feels cheap. Ducking, a one-shot cue, or nothing at
   all are all defensible. **Corrected 2026-09-19, this line was stale:** this used to say the audio
   system doesn't exist yet, as the reason to leave this as a placeholder — but the audio system was
   BUILT and live-verified 2026-09-17 (`design/audio-system.md`), including a real ducking mix chain.
   The system existing doesn't answer this question; picking between ducking, a one-shot cue, or
   nothing for a splash specifically is still a genuine open call, just one that now has a real
   mechanism to implement whichever answer it gets, rather than a hypothetical one.

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
each episode organised in advance" — `data/episodes/episode-c1e1-mothers-maiden-name.json` already
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

> **Decided 2026-09-26 (Ingram):** *"So when we start a session we watch the intro video, then we
> cut to the episode title, then we fade into the first scene automatically."* Resolve is "the scene
> arrives": the title card fades straight into the episode's first scene. As built
> (`scripts/foundry/opening-titles.mjs`, pure half `scripts/core/opening-titles.mjs` and
> `scripts/core/episode-start.mjs`): one press of the session rail's **Opening** key plays the
> opening (each player's own cut), then the episode's title card, which is now a short rendered video
> per episode (`<video folder>/episode-titles/<episode id>.mp4`, one version for everyone) rather than
> this section's live Splash typography, then the full-screen player fades out over 1.5 seconds onto
> the episode's first scene. The GM picks the episode in the same confirm window, defaulting to the
> one the Scene Runner has open. A black curtain covers every screen from the moment the titles start,
> so the scene is made active underneath it and nobody sees it load.

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
mean something — *"ordinary travel fades, Directorate business shutters, anything touching
a Claimant glitches... rather than varying them for novelty."* Ingram's "we ALWAYS use transitions" confirms that
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
**Settled by the same decision, 2026-09-26:** suppressed. The scene changes with no transition of its
own, hidden under the player, and the player's 1.5-second fade is the only transition the table sees.

---

## 12. The next round (2026-09-29)

Ingram picked the next features from a menu of seventeen on 2026-09-29 and asked for a plan. Her words,
verbatim (the numbers are the menu's; the bracketed names are the menu's own titles):

> *"2.) [the nameplate that learns] Is fun and important so it gets to be in the first batch. It's part
> visual style but also covers good mystery protection work so consider that a high priority. Ideally
> the scene runner would give me a button to reveal character's names or their names would be revealed
> automatically during the scene or something like that. We need the option to show NPCs but refuse to
> show their names. I believe (might be wrong) but Foundry supports having two names, one public and
> one private for NPCs tokens which we could work alongside."*
>
> *"10.) [roll call] A fun animation like this before the group are sent into the sewers near the end
> of day one could be fun."*
>
> *"11.) [voice on the line] This is important too, we build the idea that messages can come from NPCs
> but not from them being in the room. We need a way to use the same portrait (if the character is
> known to the group) but make it visually clear by completely changing the frame that they are phoning
> in, using a computer or using magic or whatever to communicate and not there in person."*
>
> *"12.) I think a more manageable version of this is that we promise to update portraits if the
> attitude shifts a lot, so if an NPC becomes hostile we make them look hostile. More of something to
> remember than act upon immediately."*
>
> *"13.) Yes, a 'raise your hand' button that lets players indicate their character would like to say
> something."*
>
> *"14.) [only you can see her] Yes, useful functionality. Private reveals, good."*
>
> *"15.) [the background remembers] Agreed, the artwork changes but you could also actually implement
> Foundry VTT darkness / scene environment recoloration as long as you use it correctly based on the
> time of day."*
>
> *"The one thing I'd love for you to add personally is lots of 'personality' in entrance and exits
> when characters are revealed. Different characters would be associated with different entrance
> effects or animations. Think about entrances and exits of these character frames and try to work out
> what you could do with the standard Foundry VTT graphics stuff you have access to."*

Menu item 12 was "two faces" (a PC's disguise and true form, behind a key only that player holds). Her
answer reads as a reply to "expressions" (item 4), so it is planned as the attitude-portrait promise in
§12.4, and the disguise idea is not in this round.

**Settled by these answers:** §10 question 5 (concealment can be per-player: private reveals) and, in
part, question 7 (every character gets an exit of their own) and question 3 (a player's own frame
carries one control of theirs: the raised hand).

### 12.1 What was found before planning

- **A revealed person's real name reaches every player's computer three ways.** Law 11 keeps a
  *concealed* person off the wire, but a revealed one is published with the name as the plate `label`,
  with their npc id inside `portraitId` (`summon-<npcRef>`, e.g. `summon-manako`), and with a portrait
  file named after that id (`assets/stage/<npcRef>.webp`; the token-ring images the same way).
- **Foundry's two names are real, and SF2E hides one on screen only.** An Actor's name and each Token's
  own name can differ. SF2E's `metagame_tokenSetsNameVisibility` setting uses a token's nameplate mode
  (`playersCanSeeName`, `gamesystems/sf2e/sf2e.mjs:27609`) to replace the name in chat and the combat
  tracker, but the token's name still travels to every client inside the Scene. The way to use the
  pair: the token's name *is* the public name, and the real name lives on the Actor. **Corrected the
  same day by the live check below: the Actor is not withheld from a player's computer either, so this
  keeps the name off every screen, not out of a determined player's reach.**
- **Trusted players can browse the module's files.** `FILES_BROWSE` defaults to the Trusted role
  (`common/constants.mjs:1321`), and `assets/stage/` holds every portrait in the campaign.
- **VERIFIED LIVE 2026-09-29, logged in as a Player (Liam, role 1) in the local copy of the real
  world: Foundry sends a player every document, whatever its ownership.**
  - A **hidden Token** arrived in full: name, picture path and module flags.
  - Every **Actor with ownership NONE** arrived in full, real names included (the UI just refuses to
    open its sheet).
  - The **"GM-only" JournalEntry vaults** arrived with their flags: the stage's authored casts
    (concealed people and real names), the private downtime record, and the Character Card's authored
    Facts. Other players' private handouts arrived too: the page text of "The acceptance letter"
    belonging to characters this player does not own.
  - The **campaign's static data files** (`modules/blank-inheritance/data/campaign/npcs/*.json`,
    `scene-briefs/*.json`) answer a plain URL request from a player with HTTP 200.
  - So `ownership.default: NONE` is a boundary against the interface and against casual inspection,
    **not against a player who opens the browser's developer tools**, and the header comments that said
    otherwise (`stage.mjs`, `social-store.mjs`, `campaign-state.mjs`) were wrong and are corrected.
    This is how the whole module has always worked; it is not something this round changed.
  - What Foundry does enforce on the server, and could be used for real secrecy: compendium permissions
    (a pack whose player permission is None refuses the request). Not built; see §12.7.
- **Staged scenes cannot get dark.** `core/generators/stage-scene.mjs:78-81` turns on bright global
  light, which #195's research found stops darkness from ever showing.
- **SF2E already syncs darkness to the world clock** (`Scene#darknessSyncedToTime`, per #195's research),
  so darkness is not ours to rebuild. Only warmth (an evening gold) is missing.
- **Foundry v14.367's graphics toolbox, checked in the local source:** 23 animated light types plus 4
  darkness types (`CONFIG.Canvas.lightAnimations`, `client/config.mjs:830`, siren, torch, fog,
  smokepatch, ghost, starlight and fairy among them); `ParticleEffect`
  (`client/canvas/containers/elements/particles/particle-effect.mjs`); weather (`config.mjs:1437`); a
  darkness animation that runs on one screen and writes nothing to the Scene
  (`canvas.effects.animateDarkness`, `client/canvas/groups/effects.mjs:510`); light sources that are
  added and destroyed by id with no document behind them (`client/canvas/sources/base-effect-source.mjs`);
  and Foundry's own door sounds (`sounds/doors/…`, `config.mjs:2559-2719`).

### 12.2 Batch 1: names (first, and a high priority)

**What the table sees.** Everyone the stage can show has two names: the real one, which only the GM's
computer ever holds, and what the table calls them until they learn it (`called`: "the attendant",
"the man in the grey coat"). Until the name is revealed, the plate, the arrival banner, the splash and a
player's Character Card all show the `called` name. Once revealed, it is known for the rest of the
campaign, everywhere that person appears, the way the Character Card's Facts already work.

**Three ways a name is revealed:**
1. A **Name** key beside each person in the Scene Runner's people column: any time, one press.
2. **Written into the scene:** a `reveal-name` trigger chip at the line where they give their name,
   pressed as it is read (the same inline chips as `npc-enter`).
3. **On arrival,** for someone who would plainly be introduced (a teacher at the front of the class, a
   name badge), set per person in the scene's cast.

**The reveal is a moment:** the `called` plate is struck through and the real name stamped over it on
every screen; shift-press drops a banner as well. A splash for someone unnamed shows their `called`
name; splash them after the reveal and the real name lands.

**How:**
- The stage publishes `called` until the name is known, and never the real one. Unnamed people get an
  opaque `portraitId` and opaque image file names, so neither the stage data nor an image address says
  who they are.
- Foundry's two names, used the safe way: the generator writes `called` as the prototype token's name
  and keeps the real name on the Actor, and a reveal renames the tokens. SF2E's name-visibility setting
  goes on as a backstop for chat cards and the combat tracker.
- **First, a live check, logged in as a player** in the local test world, of what a player's computer
  actually holds. Done: see §12.1. It confirmed that `foundry/scene-build.mjs` (same day, separate
  work), which places a hidden token carrying the real name for every named cast NPC in every scene it
  builds, was sending those names to every client, so that is closed here (the token is held anonymous
  while the name is).
- The player's Character Card is built from published data only.
- Knowledge is kept GM-side and, for now, per table rather than per character (a private reveal, §12.3,
  is what will need it per character; the store is keyed by person so that can be added).
- The GM is warned, once per login, when any non-GM player can browse files.
- **Canon (a proposal for Ingram's tree):** a person's name becomes a fact like any other
  (`<person>.name`, with `told`), so `story check` refuses a scene that shows a name before the table
  has heard it, and the beat that tells it gets its `reveal-name` chip when the scene is built.
  `called` lives on the person's world file, or on the cast entry for someone in only one scene. Old
  drafts keep today's behaviour until they are rebuilt.
- **Guard:** a test fails if any published stage data or image path carries an unrevealed person's
  real name or id.

**Content:** a `called` line and a name timing for every person in a scene, drafted by Claude as each
scene is rebuilt in canon and graded with the rest of that scene.

**AS BUILT, 2026-09-29.** Everything above except the canon proposal and the per-character knowledge is
built, tested, and was driven live in the local Foundry (as GM and as a Player). What exists:

- **Who is protected:** a scene-brief cast entry with a `called` line (`cast[].called`). An entry
  without one behaves exactly as before, so nothing in the current campaign changes until `called`
  lines are authored. `cast[].nameOnArrival: true` introduces someone by name as they are staged.
- **What is published** (`core/stage-names.mjs`, `core/stage-layout.mjs#publishedCast`): the plate is the
  `called` line until the name is told; the stage id is an opaque alias (`p` plus twelve hex digits, not
  the npc id); the portrait is copied to `storage/stage-art-<alias>.webp` and published from there
  (`foundry/io.mjs#ensureStorageImageCopy`); if the copy fails the frame shows its silhouette rather than
  the real path. The Director's stage shows what the table sees, with the real name in the frame's tooltip
  and a dashed vermilion outline while the person is still unnamed.
- **Telling the table:** a **Name** key on each protected person in the Runner's people column (Shift
  also drops the banner); a `reveal-name` inline trigger (`announce: true` for the banner); or
  `nameOnArrival`. All three end in `foundry/stage.mjs#revealName`, which files the name as known (in
  the vault, `foundry/stage-store.mjs`), republishes every scene that has that person on its stage, and
  gives their hidden reference tokens their real name back.
- **The moment:** the old plate is struck through in vermilion, holds, fades, and the real name stamps in.
  Frames were stepped through at 450ms, 1100ms and 1700ms and match. It is data-driven (`nameSeq`), so
  every screen plays it from the same update, and it is off under `prefers-reduced-motion`. The
  banner reads "the attendant is Kazue Tsurumi."
- **Hidden reference tokens** (`foundry/scene-build.mjs`): keyed by the alias, created under the
  `called` name with Foundry's silhouette while the name is held back.
- **Reset:** the admin panel's reset clears which names have been told; its snapshot and undo carry them.
- **Guards:** `leaksNames` (a test fails if published stage data carries an unrevealed name, id or
  file path), a contract test pinning the wiring (`tier3-stage-names-contract.test.mjs`), and a
  file-browsing warning for the GM (`core/file-exposure.mjs`).

**What it does not do, plainly.** Everything above stops the name reaching any *screen* and any casual
look (a tooltip, an element inspector, an image's address, the token list). It does not stop a player who
opens the browser's developer tools and reads the documents Foundry sends them (§12.1). Whether that
matters for this table, and what a real fix would cost, is §12.7 question 5.

**Not done:** name knowledge per character rather than per table, and the canon fact (`<person>.name`
with `told`). Both are in §12.7.

### 12.3 Batch 2: who is there, and who can see them

**On a channel, not in the room (item 11).** A cast member is either `here` (the brass frame) or on a
channel, and each channel has a completely different frame:

| Channel | For | The frame | In | Out |
|---|---|---|---|---|
| **Line** | telephone, radio, intercom | a bakelite panel, the portrait behind a round speaker grille, a signal lamp that flickers while they talk | it rings (two small shakes and a bell), then connects | a click, and the line goes dead |
| **Screen** | a terminal, a television set, a video link | a curved CRT, phosphor-tinted, with rolling scanlines | a bright line opens into the picture | the picture collapses to a line, then a dot |
| **Sending** | magic | no frame at all: a glowing apparition with a shimmering edge, in its own colour (never the Claimant violet) | shimmers into being | breaks up into motes |

Channel frames hang apart from the people in the room, high in a corner rather than standing on the
stage floor. The portrait shows if the group has already met that person face to face (recorded the
first time they are revealed in person, and overridable). Otherwise the channel's faceless version
shows (a voice trace on the line, snow on the screen, a silhouette in the sending) under their `called`
name. The channel is set on the scene's cast or switched live from the Runner.

**Private reveals (item 14).** Reveal someone to one or several chosen players, using the Runner's
player picker from solo handouts, extended to take more than one. **Corrected 2026-09-29: this used to
say the private cast would go into a per-player document that only those players' computers receive.
§12.1's live check showed Foundry sends every document to every player whatever its ownership, so that
would not be private.** The mechanism to prove instead is a targeted push: the GM's client calls
`User#query` on each chosen player (the same `CONFIG.queries` channel the City board already uses, in
the other direction), the player's client holds the frame in memory only, and the GM's client re-sends
it if that player reloads. Nothing about a private frame is then in any document, so nothing reaches
anyone else. To be proven live before it is built. The player sees a small mark saying only they can see
this frame; the Director sees who can see each frame. A name learned in private is known only to those
characters, and a call can be private too.

**Raise a hand (item 13).** A hand key on each player's screen, plus a keyboard shortcut. Their hand
goes up on everyone's stage (on their frame if they are on it, otherwise at the stage's edge), numbered
in the order hands went up. The GM hears a soft chime and sees the queue in the Runner, and clicking a
hand lowers it. Players can lower their own. It travels by Foundry's query system, as picks on The City
do, and is kept on the Scene so a reload keeps the queue.

### 12.4 Batch 3: light and art

**Time of day (item 15; finishes #195's parts 1 and 2).**
- The clock gains an hour. The canon plan's rough times map to representative hours (early morning
  0600, morning 0830, late morning 1100, midday 1230, afternoon 1500, evening 1830, night 2130), a
  scene can pin an exact one, and the quarter is derived from the hour rather than set beside it
  (#195's ownership note).
- Darkness follows the hour through SF2E's own world-clock darkness, not a rebuild of it, and
  Foundry's own blue night tint comes with it. The one addition is warmth (evening gold), about thirty
  lines on Foundry's environment animation.
- Each scene says what light it has: `outdoor` (the full cycle), `windowed` (softened, and lamp-lit at
  night rather than moonlit) or `interior` (its own fixed lighting, like the sewers). The change
  animates on every screen together when the clock moves.
- Portraits stay fully lit; only the background art darkens.
- **Needs Ingram's call:** staged scenes lose their bright global light, since nothing can get dark
  while it is on.

**Haunt art (item 15).** A haunt's background can name a changed version for each upgrade and setback,
and a night version. Switching an upgrade on swaps the art with a fade. The art is Ingram's Midjourney;
Claude writes the prompts.

**The attitude-portrait promise (item 12).** Each portrait records the attitude it shows. When someone
moves two or more steps from it, or reaches Hostile or Helpful, they go on an owed-portraits list that
Claude's start-up hook prints beside the haunts report, so it is remembered rather than acted on
mid-session. When the new portrait arrives it is registered to that attitude, and the stage and the
Character Card use it automatically whenever that person is at that attitude. Both attitude records
count: the Character Card's (an Actor flag) and the haunt regulars' (`hauntAttitudes`).

### 12.5 Batch 4: personality

§5's four entrances stay as the grammar for *situations* (Directorate business, a hostile arrival, a
Claimant). This adds a **signature** per character: their own entrance and their own exit, played
automatically whenever they are revealed or leave, so it costs nothing mid-scene. A signature stays the
same for that character, which is what keeps it a language rather than noise (§5, rule 3): the table
learns what the Section Officer's arrival looks and sounds like.

**Three layers, all played on each screen from the same stage update,** so the table stays in step and
nothing is saved that would need cleaning up after a reload:
1. **The frame** (in the browser): CSS and SVG motion on the frame itself (wipes, stamps, dissolves,
   ripples, typing).
2. **The room** (Foundry's canvas, on that screen only): a darkness dip and return, a temporary animated
   light beneath their frame (any of the 23), a burst of particles, a flurry of weather, a small shake.
3. **A sound:** Foundry's own door sounds (industrial, sliding metal, hydraulic, jail, magic door,
   creaking wood) and the audio library through the cue system, plus an optional sound of the
   character's own (the bathhouse attendant's whistle).

| Signature | In | Out | Suits |
|---|---|---|---|
| **Servo** (today's Engage) | rises on a hydraulic ease, the plate stamping a beat behind | the lamp goes off, then it retracts | the default |
| **Bulkhead** | a steel shutter slides up to reveal them; a heavy sliding-metal door; a small landing shake | the shutter drops and the door shuts | officers, security, the Frame bay |
| **Rubber stamp** | slams down with an ink splash behind it and a thud | filed: slides sideways as if into a drawer | clerks, the admissions office |
| **Typewriter** | the portrait prints in line by line while the plate types itself; a bell | carriage return: whips off left with a ding | typists, record-keepers |
| **Darkroom** | develops out of white paper under a red safelight | overexposes to white | photographers, archivists, someone from an old photograph |
| **Spotlight** | the room dims and a follow-spot finds them; a drumroll | the spot snaps off and the lights come back | performers, the Magic Show, a grand villain |
| **Smoke** | forms out of drifting smoke | dissolves back into it | mysterious people, fixers |
| **Sparks** | lands in a shower of welding sparks with an industrial clank; the lamp flickers on like a work light | powers down: the lamp dies and the frame sags | fitters, mechanics, the night shift |
| **Siren** | one sweep of a rotating red light and a two-tone blip | the siren winds down | military police, emergencies |
| **March** | steps up in two stamps, each with a boot-fall and a small shake | about-face: turns to show the frame's brass back and marches off | senior officers |
| **Lean-in** | slides in from the edge and tilts, as if leaning round a door | ducks back out | gossips, cheeky friends, comic relief |
| **Kaboom** | a puff of smoke and a flash; lands sooty and wobbling | another puff, and gone | mad inventors, test pilots |
| **Tide** | rises out of a ripple, with gulls and lapping water | sinks back under | sailors, dockworkers, the bathhouse attendant |
| **Petals** | cherry blossom drifts across; a soft glow | the petals carry them off | gentle people, the shrine |
| **Ghost** | flickers in twice before it settles; the room cools | flickers out mid-sentence | someone who should not be there |

**Rules:**
- Which entrance plays: one written into the scene, then the situation (Alert for a hostile arrival,
  Signal for a Claimant), then the character's signature, then the faction's (Shutter for the
  Directorate), then Servo.
- An exit is its own recipe, quieter and shorter than the entrance, never the entrance reversed (§5).
- One at a time, through the existing queue.
- Every signature has a calm version (a plain fade, with no shake and no flash) for a player who chose
  the reduced-motion opening or whose computer asks for reduced motion. Full versions stay under three
  flashes a second.
- The room always returns to its own light (the time of day), never to full bright.
- Claude drafts a signature for every current NPC, for Ingram to grade.

**Roll call (item 10).** A Roll Call key in the Runner, and a `roll-call` trigger a scene can carry: the
party's frames slam in left to right, a beat apart, each plate stamping as it lands, over a bell or a
klaxon. Frames only, so the no-PC-splash rule holds. It goes into the opening of Flood Tunnel
Clearance, just before they are sent down, when that scene is rebuilt in canon (it is an old draft
today).

**A spike comes first:** prove the three screen-only room effects live in the local Foundry (a light
with no saved document, a particle burst, a local darkness dip) before building the catalogue on them.

### 12.6 How each batch ships

- Pure rules in `scripts/core/`, with tests in the same commit: who is named for whom, who can see what,
  which entrance and exit play.
- Contract tests that every light animation, door sound and setting named here exists in the local
  Foundry v14 and SF2E trees.
- Batch 1's leak test keeps running for good.
- Checked live in the local Foundry test world, with screenshots for Ingram's notes, and `npm run
  deploy` at the end of each batch.
- Anything that changes scene text goes through the canon re-read.

### 12.7 Waiting on Ingram

1. **The order:** names, then who is there, then light, then personality. Personality comes after light
   because its darkness dips need staged scenes that can get dark; its spike can start earlier.
2. **Staged scenes lose their bright global light** (batch 3, and needed for batch 4's dips).
3. **Names in canon:** a person's name as a fact with `told`, so the check guards it and builds the
   reveal chip; a rebuilt scene must settle each person's name, while old drafts keep showing names
   until they are rebuilt.
4. **Name knowledge per character**, not per party, so a private reveal can teach one character.
   Batch 1 ships per table (one press tells everyone), keyed by person so per-character can be added
   with batch 2's private reveals.
5. **Do real secrets matter enough to build for?** Ingram, 2026-09-29: names are "actually important".
   §12.1 shows the module's GM-only material is only hidden from the interface. Options: (a) accept it,
   because the players are people at her table and the protection stops every on-screen leak (the
   likeliest kind); (b) move the few things that truly must stay secret (unrevealed names, the authored
   cast, other players' private handouts) into a compendium pack with player permission None, which
   Foundry does enforce on the server, at the cost of reading and writing through the pack API; (c) (b)
   plus keeping campaign data that names a secret out of the publicly fetchable module folder, which is
   an architecture change touching the whole data pipeline. Not started; her call.

---

*Related: [`ux-doctrine.md`](ux-doctrine.md) §5 (theatre of the mind), §10 (the Director's console);
[`npc-social-intel.md`](npc-social-intel.md) (the Character Card this opens);
`ideas/entries/in-scene-character-portrait-frames.json` (the original idea, now specified);
`ideas/entries/asset-review-pipeline.json` (the art dependency);
`design/foundry-technical-reference.md` §3 (scenes, transitions, the missing transition hook);
`design/foundry-module-design.md` §7 and §9 stage 6 (the original cold-open/outro scope, GitHub #99).*
