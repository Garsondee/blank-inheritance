# The Stage Renderer: taking over the canvas with three.js

*Drafted 2026-10-01 at Ingram's request, with a working spike. **A proposal, not a decision**: nothing here is built in
the module, and §11 lists the calls that are hers. It is one of the documents of [Stagecraft: Puppet
Show](README.md); [`stage.md`](stage.md) says what the stage does, [`diorama.md`](diorama.md) how it looks,
[`feel.md`](feel.md) what must never be lost, and [`module.md`](module.md) how it becomes a module of its own. The
spike is plate 38 in [`lab/`](lab/).*

*Words. A **card** is a person on the stage, a **name caption** the label beside a first appearance, and a **stick**
(Ingram's word; the code calls it a rod) is the handle that appears when a card is picked up. "Frame" is used here
only in its drawing sense (frame time, per frame).*

---

## 0. In one page

**The idea.** Where Stagecraft is on, Foundry stops drawing the scene itself. A renderer of ours, built on
[three.js](https://threejs.org) (the standard browser library for 3D graphics), draws the whole picture instead: the
painting, the lights, the cards, the sticks, the air. Foundry keeps everything that is not the scene: the sidebar,
chat, character sheets, the deck, the dialogs. This is the **Stage Renderer**.

**What it is not.** It is not a 3D game and does not change what a card is. Cards stay flat standees with a portrait,
a brass edge and a stick, in front of Ingram's paintings. No models, no rigging. What three.js changes is the machine
that lights, layers and films the stage: real lights, real shadows, a real depth, a real camera.

**What I did.** I rebuilt plate 13 (the Paper Lantern) in three.js, reusing the lab's own camera, people and puppet
physics, and ran it in a real browser on this machine's graphics card. It works. The stick, the furious wiggle and
the bang are all in it (plate 38, §9).

**What it costs, measured.** On this machine (an RTX 3070 laptop GPU) the whole stage with lights, three shadows,
bloom and 4× anti-aliasing takes **3.1 ms a frame at 2560×1440 and 6.5 ms at 4K**; a 60-frame-a-second screen allows
16.7. With no shadows and no post-processing it takes 0.65 ms. The JavaScript side costs about 1.5 ms a frame. With
**no graphics card at all** (software rendering) the same scene takes 80 ms a frame in its plainest form and 435 ms in
its richest, which is why quality tiers and a flat fallback are not optional.

**What I recommend.**

1. **Yes, build the three.js renderer**, as the main way Stagecraft scenes are drawn. (§4)
2. **Take over per scene, opt-in**, using Foundry's own scene-manager doorway, with Foundry's canvas hidden and idle
   while a stage scene is up. Battle maps, the Campaign Map and the Location Editor stay on Foundry's canvas. (§7)
3. **Two renderers, not three:** three.js, and the **flat** fallback she asked for. The CSS-3D diorama stays in the lab
   as a contingency, productionised only if this route fails. (§8)
4. **Spike inside Foundry before anything else is committed** (phase 0b): the standalone spike proves the drawing, not
   the takeover. **Done 2026-10-01, and it passed** (§10).
5. **Build it as its own module from the first line**, `module/stagecraft/`, knowing nothing of the adventure, so it
   can be extracted and shared. (`module.md`)
6. **Three things are requirements, not features:** the stick, the wiggle and the bang. (`feel.md`)

**The honest costs** (§6): accessibility has to be rebuilt by hand because a canvas, unlike HTML, is invisible to
screen readers; weak machines need tiers; Foundry's own token tools do not exist on a stage scene; there is a build
step and a dependency to maintain forever; and a good module is a part-time job for as long as it lives.

---

## 1. The brief, in Ingram's words

> We use threejs to render scenes. I'm already very familiar with the amazing stuff that it can do in Foundry VTT.
> I'd like you to think about everything that you could achieve if you were given control of threejs and able to
> use that to render the scenes. We take over Foundry VTT rendering for scenes where stagecraft is active, we don't
> let it render anything except its UI, character sheets and Foundry VTT critical stuff. We build our new 'Stage
> Renderer' which is a key component of Stage Craft.
>
> Start by working through the ramifications of this decision both good (*tell me about what we could do with access
> to threejs) and bad (*we need to work out what we'd need to do to build a system like this correctly).
>
> Finally but very importantly this could have serious value as a stand alone Foundry VTT module so that is how I'd
> prefer to build it. This system is going to be tested as part of this adventure, but I want to build it as its own
> separate and very cleanly built module which just happens to interface 100% with the adventure we're making here.
>
> And some things not to forget, I love the sticks which appear when I pick up a Card, I love wiggling the token
> around furiously and I love that they bang into each other when colliding.

Four tasks follow from that: the good (§5), the bad (§6), a design for the takeover (§7, §8) and a module (`module.md`).
The last paragraph is `feel.md`.

---

## 2. Where we are, and the ceiling the CSS lab hit

The diorama of [`diorama.md`](diorama.md) draws each card as an HTML element inside a CSS perspective box, over a
painting used as a background. That was the right first answer (§2.1 there: "it is 3D without being a 3D game"). It
works, it is accessible by default, and the browser's compositor does most of the work. It also hit a ceiling, and the
mockups show where:

| What the stage wants | What CSS can do | What the lab does instead |
|---|---|---|
| A lantern that lights the cards near it, with the right side of each card brighter | Nothing: CSS has no lights | `lightCard` works out a wash, a rim and a sheen in JavaScript and paints them as gradients on every card, every frame |
| A card that throws a shadow | Only onto its own plane (a drop shadow), never onto the floor or the wall behind | A blurred ellipse under it |
| A card that passes in front of, or behind, another and the painting's counter | A sort order that must be maintained by hand | z-index and `translateZ`, plus cut-out polygons for the counter (§3.2 there) |
| Glow round a lantern, a flash, a vignette, grain | Filters on single elements | Extra layers, one per effect, each with its own cost |
| Hundreds of motes, sparks, raindrops | One DOM node each, or a 2D canvas that cannot sit *between* the cards | A few capped canvases drawn over or under all the cards |
| A camera that moves | Moving the whole container | Possible, but nothing can be in focus or out of it, and nothing parallaxes |
| A photograph of the stage | Capturing an HTML tree to an image from inside the page is unreliable | Plate 27's print is a screenshot taken from outside the page, not something the stage can do itself |

None of this is a flaw in the lab. It is the line between *a document with 3D transforms* and *a scene*. The diorama's
own description of itself, "no models, no rigging, no engine", is the rule that kept it cheap; what this document
revisits is only the last word. **The cards stay standees, and the rule against models and rigging stays. The engine
changes.**

---

## 3. What Foundry gives us, and what it takes away

Read from the local v14.367 source (`foundryvtt/Foundry Virtual Tabletop/resources/app/`) so none of this is from
memory. Paths below are relative to its `client/` folder, except `package.json` and `public/css/`, which sit beside it.

**Foundry draws the scene with one PIXI application, created once.** `Canvas#initialize` makes a single
`PIXI.Application` on the page's `canvas#board` (`canvas/board.mjs:791`), after firing a `canvasConfig` hook to let
modules adjust its settings (`board.mjs:759`). PIXI is version 7.4.3 (`package.json:63`). It sits in the page at the layer called
`--z-index-canvas` (`public/css/foundry2.css:15413`), under every window and panel. Nothing in the scene is HTML: the
background, tokens, grid, walls, lights, fog, drawings and templates are all PIXI.

**There is a documented doorway for exactly this.** `CONFIG.Canvas.managedScenes` (`config.mjs:1083`) is "a registry
of Scenes which are managed by a specific SceneManager class or instance", keyed by scene id. A `SceneManager`
(`canvas/scene-manager.mjs`) is a small class Foundry calls at fixed points in a scene's life: `_onInit`,
`_loadTextures`, `_onDraw`, `_onReady`, `_onTearDown`, and `_registerHooks`, whose hooks are switched off again
automatically when the scene goes. Foundry fetches it with `Canvas.getSceneManager(scene)` (`board.mjs:1400`) and calls
it from `board.mjs:1168` (`_onInit`), `1212` (`_onDraw`), `1242` (`_onReady`) and `1345` (`_onTearDown`). This is how
the system is meant to give one scene "special scripted behaviors". It is the sanctioned seam, so a takeover built on
it does not patch anything of Foundry's.

**The canvas lifecycle is a fixed order.** The module's `setup` hook fires at `game.mjs:740`, the canvas initialises and
draws the viewed scene at `game.mjs:763`, and `ready` fires at `game.mjs:779`. So anything that must be in
`managedScenes` has to be there by `setup`. (A registry that answers from a scene's flag at the moment it is asked,
rather than a list filled in advance, avoids the problem and needs no bookkeeping when scenes are created or flagged.)

**What cannot be used.** The setting `core.noCanvas` (`game.mjs:1209`, honoured at `board.mjs:660` and
`documents/scene.mjs:267`) turns the canvas off entirely, but it is one setting for every scene and needs a reload, so
it cannot be per scene. Foundry's scene transitions (thirteen shaders on PIXI) cannot draw over a canvas of ours, so a
stage scene needs its own cuts and dissolves.

**What Foundry still draws for us, because it is HTML.** The sidebar, chat, journals and the Papers, character sheets,
the macro bar, the player list, dialogs and notifications, the pause banner, and everything we already built as
ApplicationV2 windows: the deck, the orb, the Runner, the notebook, the admin panel. None of that moves.

**What stops existing on a stage scene, because it lives on the PIXI canvas.** Tokens and their HUD, the grid and the
ruler, walls, lights, vision and fog, drawings, templates, regions, pings, and the canvas's own pan and zoom. For a
theatre-of-the-mind scene these are not missed. They matter in two places, and both need a decision (§6):

- **sf2e's chat-card buttons.** The system reads `canvas.tokens` in 36 places, 16 of them the *selected* tokens
  (`gamesystems/sf2e/sf2e.mjs`). In the ones I read it falls back to the player's own character when nothing is
  selected (`sf2e.mjs:9891`, `55115`), which keeps most of it working. Applying damage to a foe from a GM's chat card is
  the place it will not.
- **Combat.** Theatre-of-the-mind fights in zones (`stage.md` §8.6) need combatants without tokens. Foundry allows
  that; whether sf2e's turn tooling is happy with it is one of the questions for the in-Foundry spike.

**Foundry already knows how strong a machine is.** `core.performanceMode` (low, medium, high, max) is a client setting
whose default is chosen from the graphics card's maximum texture size (`board.mjs:970–983`), and `core.maxFPS` caps the
loop (10 to 60). The Stage Renderer can read both, so a player who has already told Foundry their machine is weak has
told us too.

**Other people's three.js on Foundry's page.** Dice So Nice puts a transparent three.js canvas over the PIXI one
([listing](https://foundryvtt.com/packages/dice-so-nice/)); the 3D Canvas module ([listing](https://foundryvtt.com/packages/levels-3d-preview),
supports Foundry 11 to 14) replaces Foundry's canvas with a three.js scene driven by tokens. So three.js and Foundry
coexist today, in two different ways, and both ways are options for us (§4).

---

## 4. The options

| | What it is | For | Against |
|---|---|---|---|
| **A. Stay on CSS-3D** | Productionise the diorama as built | Accessible by default, no new dependency, cheapest | The ceiling in §2: no lights, shadows, depth buffer, post or camera. |
| **B. Overlay** | Foundry draws the scene as now; a transparent three.js canvas sits above (as Dice So Nice does) | Least intrusive; nothing of Foundry's is touched | Foundry keeps drawing a scene nobody looks at and pays for it; the painting would have to be drawn twice or cut out of PIXI; our lights cannot touch what PIXI draws underneath |
| **C. Take over a scene** | A scene manager hides Foundry's canvas and idles it; our canvas draws the whole picture. **Her proposal** | We own the whole picture, so lights, depth, camera and post affect everything; no wasted GPU; no PIXI in our way; survives a future change of Foundry's renderer | We own input, resizing, accessibility and lifecycle too. §6 is the cost of that |
| **D. Draw into PIXI** | Render three.js to a texture and show it in PIXI as a sprite | PIXI keeps every tool | Two GL contexts cannot share textures cheaply, so every frame is copied across; the worst of both |
| **E. Adopt the 3D Canvas module** | Depend on someone else's three.js scene | Exists, maintained | Designed around tokens as 3D models, not painted standees; a dependency we cannot steer; none of our feel |
| **F. Flat only** | Plates 01 to 12 | Tiny, accessible | No diorama |

**Recommendation: C, with F kept as the fallback she asked for, and A kept in the lab as a contingency.** C is what
she proposed, and it is the only option in which the engine, the picture and the lights are one thing. B is the
fallback *for the takeover itself*: if the in-Foundry spike shows Foundry's canvas cannot be idled cleanly, an
overlay with the PIXI view hidden is the same as C from the player's chair.

**Per scene, not for the whole game.** Battle maps, the Campaign Map and the Location Editor (`design/location-editor.md`)
draw real PIXI regions and placeables, and they keep Foundry's canvas. A scene opts in by carrying Stagecraft data
(`flags.stagecraft.*`); nothing else changes.

---

## 5. The good: what control of three.js buys

Tiers are effort, not value. **S** is days, **M** is a week or two, **L** is a month or more of focused work. "Spike"
means plate 38 already shows it.

### 5.1 The painting becomes a place

| Capability | What it gives the table | Tier | Note |
|---|---|---|---|
| **Real lights** from the lanterns, windows and fires, flickering, coloured, lighting each card by how it stands | The cards stop looking pasted on | S | Spike. Five lights, three casting shadows |
| **Cast shadows** on the floor and on the back wall | Weight and place | S | Spike. The painting's floor is mostly dark, so the floor shadow barely shows; the wall shadow (below) does |
| **Footlights**: two low warm lights in front, every card's shadow climbing the back wall, three times life size | A theatre, and a mood the CSS lab cannot make at all | S | Spike (plate 38, `foot`). **Her call**: it is a strong look and not the painting's own |
| **Gobos**: a texture in front of a light, so venetian-blind stripes fall across a card in an interrogation | Film noir, which suits a campaign with a 1950s tone, from one picture and one setting (`SpotLight.map`) | S | Not in the spike |
| **Post-processing**: bloom on lanterns, vignette, grain, a colour grade per scene (teal and orange, `D054`) | The painting and the cards share one look | S | Spike (bloom, vignette, grain) |
| **Dust, embers, steam, snow, rain** as thousands of particles, lit only where a light reaches them | Air in every scene without a DOM node | S | Spike (dust lit by the lanterns) |
| **Weather and time of day**: rain with ripples and wet reflections, snow settling on the cards, fog with light shafts, dusk by regrading the same painting | One painting, several hours | M | CSS plates 19 and 26 are the mock-ups |
| **A living painting**: hand-drawn masks over the painting animate flame, steam, water, smoke and curtains with a small shader | The painting breathes. Cheap, and the single most atmospheric thing on this list | M | Needs a mask per painting. Ingram or Claude draws them |
| **Parallax from a depth map**: a depth image made once per painting (offline) lets the camera drift a few degrees and the room has depth | The room is a room | M | Honest limit: a painting has nothing behind its objects, so only a few degrees before the edges tear. Treat as an experiment |
| **Set pieces as layers**: the painting cut into depth layers like a toy theatre (the counter is the first) | The pop-up-book look; cards can stand between layers properly | M | The counter in the spike is the first |
| **Chalk on the wall**: players' drawings as a rough, lamp-lit layer between the painting and the cards, with falling dust (`chalk.md`) | Graffiti that is fun to make and still there next session | S | Strokes are data, so the same drawing works in the flat renderer |
| **Marks and zone outlines as floor decals**: brass tape ticks lying on the floor in perspective, faint outlines on the painting, a ghost card where a drop will land (`stage.md` §8.8, §8.10) | The options for where a card can rest, shown only when a card is held | S | A decal is a textured quad on the floor; the ghost reuses the card |

### 5.2 Cards as objects

| Capability | What it gives the table | Tier | Note |
|---|---|---|---|
| **Cards with thickness**: a brass body, glass over the portrait, a brass back, a foot with the player's colour in enamel | Presence | S | Spike |
| **Reflections** of the room in the brass and the glass, taken from the painting itself | The cards belong to the room | S | Spike |
| **The stick as an object** that grows out as the card lifts, hinges at the collar, and carries a glowing ring in the player's colour where the hand is | `feel.md` §2 | S | Spike |
| **A real flash and sparks on a bang** | `feel.md` §4 | S | Spike |
| **Passing in front is a step in depth**, not a trick of ordering | A card in a hand moves past one it hit, and both are lit and shadowed correctly | S | Spike |
| **Paper bend and flutter**: a card bows when swung and curls a little when lifted | The wiggle gets a body | M | A small vertex shader |
| **Trails and speed lines** behind a swung card | The furious wiggle is visible from across the table | S | |
| **Debuts in 3D**: a card flying in on a curve, a camera-flash, the portrait developing, the name caption unfolding | Each debut is a performance (`stage.md` §3) | M | Every debut part becomes a material or a particle effect |

### 5.3 Direction: camera, light, cuts

| Capability | What it gives the table | Tier |
|---|---|---|
| **Camera work**: push-in on the speaker, cuts between groups, a whip pan, a shake on a bang, focus pulled from one card to another | `stage.md` §8.5 says "one camera cuts between groups". Here it is a camera | M |
| **A spotlight on the speaker** with the house lights dimmed | The oldest trick in the theatre; the GM presses one key | S |
| **A lighting board** for the GM: house, intimate, tense, blackout, red alert | Mood in one press, authored per scene | M |
| **Cuts and dissolves between scenes** | Replaces Foundry's thirteen PIXI transitions, which cannot draw over us | S |
| **Split stage and the "elsewhere in this scene" tray as live viewports** | `diorama.md` §8.1 and `stage.md` §8.5, drawn rather than faked: two cameras, one canvas | M |

### 5.4 Things that come free with a real renderer

| Capability | Why | Tier |
|---|---|---|
| **The photograph** | Render the stage to an image at 4K, run it through a Polaroid shader, file it in Papers (`diorama.md` §8.1, `design/handouts.md`) | S |
| **Replays and recaps** | The stage's inputs are small and deterministic, so a session can be played back and rendered to a video for "previously on". My spike's video was made this way: the stage redrawn at 103 consecutive moments from the same inputs | M |
| **A clean table display** | The stage alone on a TV in the middle of an in-person table | S |
| **Handouts as objects**: a letter that unfolds, a booklet whose pages turn (the propaganda manga), a card that flips | `design/handouts.md`, `design/propaganda-manga.md` | L |
| **The blueprint as a model** one can turn, not only a plan (`stage.md` §9) | | L |
| **Video on a surface**: the opening titles or a Directorate broadcast on a screen in the room | | M |
| **Positional sound**: a bang pans to where it happened (our audio system owns the mix; Stagecraft only reports where) | | S |

### 5.5 The Watcher

The campaign's adversary is a navigation system that learned to watch, and the Stage Renderer is, quite literally, the
thing that decides what the table sees. That makes it the natural place for the Watcher's tells: a swarm in the dust
whose motion is slightly too coordinated, a focus that hunts, a timestamp in the corner of a frame, a camera in a
window. **Nothing here is a design.** `LEDGER #34` and `feedback_no_scene_contamination` forbid anything reaching the
table before its reveal, so every such effect would be authored per scene, off by default, and behind the same gate as
any other secret. I list it because the engine makes it possible and it is hers to decide whether and where it is
allowed (§11).

### 5.6 What I would do first

If the answer to §11 is yes, the order I would build the extras in: **(1)** lights, shadows and post, because they are
done in the spike; **(2)** a spotlight, footlights and gobos, because they are one setting each and change a scene's
mood most; **(3)** the photograph into Papers, because it is the first thing that gives a player something to keep;
**(4)** a living painting, for the first painting that has flame or steam in it; **(5)** camera cuts; **(6)** weather.
Parallax and the 3D handouts last, and only if the earlier ones have earned the time.

---

## 6. The bad: what it takes to build it correctly

Each row is a thing that goes wrong if we are not careful, what we do about it, and how a test would catch it.

### 6.1 We own what Foundry's canvas used to own

| What | What goes wrong | What we do | Test or check |
|---|---|---|---|
| **Input** | Pan, zoom, drag-and-drop of an actor onto the scene, right-click menus, hotkeys and touch all belonged to PIXI's interaction layer | Our canvas takes pointer events (mouse, touch and pen are one API); registered with Foundry's own keybindings so Space, N, B, X and T do not collide with Foundry's | In-Foundry spike (phase 0b); a keybinding-conflict test against Foundry's registered defaults |
| **Resize, device pixel ratio, window moves between screens** | A blurry or stretched canvas, wrong hit-testing | One `ResizeObserver`; the drawing buffer sized from CSS size × ratio, capped by the tier | Headless test at three sizes and two ratios |
| **Context loss** | Browsers can drop a WebGL context (a driver reset, a sleep); the stage goes black | Listen for `webglcontextlost` and `webglcontextrestored`; rebuild from the scene description, which is data | Headless test using `WEBGL_lose_context` |
| **Lifecycle leaks** | Switching scenes twenty times leaves textures and shaders in GPU memory | Everything the renderer makes is disposed in `_onTearDown`; a counter of live GPU objects | Test: twenty scene switches, live-object count returns to baseline |
| **Two canvases, one page** | Dice So Nice, and any other module with a canvas, must still sit on top | Ours sits at Foundry's own canvas layer, under all windows | In-Foundry spike with Dice So Nice installed |

### 6.2 Machines we do not control

The table has six players on six machines. I measured one.

| What | What goes wrong | What we do |
|---|---|---|
| **A weak or absent graphics card** | Measured: with software rendering the plain stage takes 80 ms a frame (13 a second) at 1280×720 and the full one 435 ms | **Quality tiers** (§8): high, low, flat. The default is chosen from Foundry's own `core.performanceMode` and a short test at start-up, and every player can override it. The GM cannot force a player's tier. **Built:** flat on request, and flat when no graphics context can be made or the 3D picture keeps failing (§8.5); the speed test at start-up is not |
| **Waste when nothing moves** | The stage is still most of the time; redrawing it at 60 a second heats a laptop for nothing | **Draw on demand**: draw only while something moves or a light flickers, and flicker at 30 a second, not 60 |
| **Memory** | Calculated, not measured: about 25 MB for the painting, 45 MB for sixteen card textures, 20 MB for five shadow maps, and about 300 MB for the two anti-aliased half-float post targets at 2560×1440 (more than double that at 4K) | Cut the largest by dropping anti-aliasing to 2× or using a post-process anti-aliasing pass; compress textures (KTX2) later |
| **Laptops with two graphics chips** | The browser may pick the weak one | Ask for the high-performance one (`powerPreference`); the browser may still say no |
| **Browsers** | Safari and Firefox differ in small ways (half-float targets, multisampling) | Feature-test, never browser-sniff; **not tested yet** |
| **A phone or tablet** | Memory limits are much lower | Low tier by default on touch devices; **not tested yet** |

### 6.3 Accessibility: the one that is easy to forget

The CSS stage is HTML, so a screen reader sees every card, a keyboard can focus one, and text can be resized, for free.
**A canvas is invisible to all of that.** If the Stage Renderer replaces the HTML stage with a picture, the stage
becomes unusable to anyone who cannot see it, and a cost the CSS lab never had becomes ours. So:

- **An accessible mirror of the stage**: a visually hidden list of cards (name, where they stand, what they are doing,
  who holds them) kept in step with the picture, with a live region that announces events ("Tama has arrived", "Yumiko
  bumped Tama"). It is also the way to operate the stage from a keyboard: focus a card, arrows to move it, Enter to pick
  it up and put it down.
- **Words stay HTML**: name captions, zone labels, the speech bar, the stage bar. They are anchored to the picture with
  a `project()` call but are real text, so they are crisp, selectable, translatable and read aloud.
- **Calm mode** for reduced motion (`prefers-reduced-motion` and a setting): no idle sway, no camera drift, no shake, no
  flashes. `design/opening-titles.md` already has the no-flashing twin; the bang's flash gets the same rule.
- **A flash governor**: one impact flash lasts 0.2 seconds, and a limiter stops the lights pulsing more than three times
  in a second however many cards are banging. The check is the one `render.py flashcheck` already applies to the opening.
- **Contrast**: card faces and text keep their contrast whatever the lights do.

This is cost, not a reason to stop: in phase 1, not an afterthought.

### 6.4 What stops working on a stage scene

| What | The problem | The plan |
|---|---|---|
| **sf2e chat-card buttons that act on selected tokens** | A GM cannot apply damage to a foe with no token | Phase 3, only when fights need it: an optional **token bridge**. Each card has a real Token on the stage's scene; the Stage Renderer draws the card, Foundry holds the token for the system. Tokens are created at the reveal, the same moment the published cast is, so no secret is early (`stage.md` §10, Law 11). Until then the system's fallback to the player's own character covers the players |
| **Combat tracker** | Combatants usually come from tokens | Combatants can be made from actors directly; test with sf2e's turn handling in the in-Foundry spike |
| **Scene controls** (the left toolbar) | Its tools belong to layers that no longer draw | Hide or replace it on a stage scene with the stage bar |
| **Other modules that read `canvas.*` or screenshot the canvas** | They will not see our picture | They still see a drawn, ready canvas (we keep the lifecycle running); a module that screenshots it gets a blank. Note it in the compatibility list |
| **Measured templates, drawings, ambient sounds placed as scene objects** | Do not exist on a stage scene | The audio system uses playlists, not placed sounds, so it is unaffected |

### 6.5 Secrecy: a three.js scene is in the player's browser

Foundry's ownership model controls who can *act* on a document, not what is *sent* (GitHub #212;
`reference_foundry_ownership_not_secret`). A scene graph is the same: any object in it can be inspected from the
browser's console. So **the renderer is only ever given what the player is allowed to see, in an allow-list, and never
a hidden object, an invisible mesh or a transparent card for someone not yet revealed**. This is `stage.md`'s Law 11
(removal, not hiding) applied to rendering. The module's publish step is a redaction step, and it has a property test:
whatever the author data contains, no field outside the allow-list reaches the renderer.

### 6.6 The build, the dependency and the upgrade

| What | The cost | The plan |
|---|---|---|
| **A bundle** | The module has no build step today. Measured: the spike bundled and minified with esbuild is 0.8 MB (0.2 MB compressed), three.js and the post-processing it uses included | esbuild (one dev dependency), producing one file; `npm run deploy`'s preflight must refuse a bundle older than its sources |
| **Pinning** | three.js releases monthly and changes its post-processing and its WebGPU path often | Pin an exact version (r186 / 0.186.1 is vendored); upgrade deliberately, behind the golden-image test. Use the stable WebGL renderer; do not adopt WebGPU yet |
| **Foundry's own upgrades** | A future Foundry could change the canvas internals, or move from PIXI 7 | We use the documented scene manager only, and we only *hide* PIXI. If Foundry changes renderer, option C is the least exposed of the options |
| **Licences** | three.js is MIT | Keep its notice in the bundle; add it to `CREDITS.md` (done, §12) |

### 6.7 Testing a picture

A renderer is the hardest thing in the project to test, and the testing strategy
([`design/testing-strategy.md`](../testing-strategy.md)) says every feature ships a test. The plan:

| Layer | What is tested | How |
|---|---|---|
| **The core** (positions, springs, blocking, zones, camera maths, redaction, the sync protocol) | Everything about the stage that is not drawing | `node --test`, with no Foundry, no DOM and no three.js. The bulk of the tests |
| **The feel** | The stick, the wiggle and the bang | **Golden trajectories**: scripted hand paths recorded to a file; the numbers must match within a tolerance (`feel.md` §6) |
| **The picture** | A frozen moment looks as it should | Headless Chrome renders a stage at a fixed time with fixed seeds; compare with a stored image by perceptual difference. **Use the software renderer for these**: it gives the same pixels on every machine, which a graphics card does not. Use the real GPU only for timing |
| **The contract with Foundry** | The doorway still exists | Read the local Foundry source for `managedScenes`, `getSceneManager`, the lifecycle calls and the performance setting names; fail loudly on an upgrade |
| **The boundary** | Stagecraft knows nothing of the adventure | A scan of `module/stagecraft/` for anything campaign-specific; a scan of the adventure for any import except the bridge (`module.md` §3) |
| **Secrecy** | Nothing outside the allow-list reaches the renderer | Property test over generated author data |

### 6.8 The people-cost

- **Scope.** A new engine invites endless polish. The controls are the phases and their exit tests (§10), and the
  rule in the Scene Standard that anything beyond a painting, a rig and cards is an *enhancement*, never a requirement
  (`design/design-layers.md`: the base must work first).
- **Maintenance.** A module that other people use is support, documentation, versioning and a release for as long as it
  exists. This is the largest honest cost of the standalone ambition, and why `module.md` makes extraction a decision
  of its own.
- **Authoring.** A scene now needs a rig (horizon, floor, depth), lights placed on the painting, occluders and zones
  (`scene-standard.md`). The extras need masks and depth maps. Claude drafts, Ingram adjusts, as `diorama.md` §14
  already asks.

---

## 7. How a takeover works

### 7.1 The life of a stage scene

1. **Registration, by `setup`.** The module installs, once, an answer on `CONFIG.Canvas.managedScenes`: for any scene
   carrying Stagecraft data it returns our scene manager, for any other it answers as before. (A small `Proxy` that asks
   the scene's flag at the moment Foundry asks keeps this free of bookkeeping.)
2. **`_onInit`.** The manager starts loading what the renderer needs in parallel with Foundry's own loading.
3. **`_onDraw` and `_onReady`.** Foundry has just set its canvas visible (`board.mjs:1158`). The manager then hides the
   PIXI view and stops its ticker (`canvas.app.stop()`), mounts our canvas at the same layer, builds the scene from its
   description, and starts the loop.
4. **While it is up.** The Stage Renderer draws from a snapshot of the stage (§8). Foundry's windows work as always.
5. **`_onTearDown`.** The loop stops, everything we made is disposed, our canvas is removed, the PIXI view and ticker
   are restored, and the next scene draws normally. The same path runs when the GM switches to a battle map.

*Not verified yet:* that stopping and restarting PIXI's ticker is clean in v14.367, that nothing else expects it to be
running, and that Foundry's loading bar and `canvasReady` listeners behave. That is what phase 0b answers.

### 7.2 Where the state lives

The stage already has a state model (`stage.md`): an authored cast kept in a GM-only vault, a published cast on the
scene (the only thing players' browsers ever receive), and per-scene stage data. The renderer is a **view** of that
model and never its owner. Three inputs move it: published state arriving from the scene (persistent, so a reload or a
late joiner sees the same stage), grip positions arriving over the module socket while someone holds a card
(`stage.md` §6.5), and the local player's own pointer.

```
 published stage ──┐
 module socket  ───┼──►  core: stage model + puppets + blocking + camera  ──►  snapshot  ──►  backend.draw()
 local pointer  ───┘            (pure; no Foundry, no DOM, no three.js)                      (three.js or flat)
```

### 7.3 What stays Foundry's

The window system and everything in it; the scene as a document (its name, its flags, who is viewing); chat, journals,
sheets and the Papers; the socket; permissions; saving. We add one module's worth of state to the scene's flags and
nothing else.

---

## 8. The Stage Renderer's shape

### 8.1 One contract, several backends

The core produces a **snapshot** each tick: a plain object listing what is on the stage (each card's position, facing,
lean, lift, stick, emote and light), the lights, the camera, the particles and the bangs in progress. A **backend** turns
a snapshot into a picture. Every backend provides:

| Call | Meaning |
|---|---|
| `mount(element, options)` and `unmount()` | Take over, and give back, a place on the page |
| `load(sceneDescription)` | Build the painting, rig, set pieces and lights; returns when textures are ready |
| `resize(width, height, ratio)` | The size changed |
| `setQuality(tier)` | High, low |
| `draw(snapshot, dt)` | Draw this moment |
| `pick(x, y)` | Which card, stick or zone is under this point? (a ray in three.js, boxes in flat) |
| `project(worldPoint)` | Where on screen is this point? Lets HTML words follow the picture |
| `capture(options)` | A still image of the stage: the photograph |
| `capabilities` | What this backend can do: lights, shadows, camera, particles, post, parallax |
| `dispose()` | Free everything |

Features ask the capability, not the backend's name, so a spotlight simply does not exist on a backend that has no
lights, and nothing else breaks.

### 8.2 The ladder

| Tier | Backend | Has | Used when |
|---|---|---|---|
| **High** | three.js | Everything in §5 that is switched on | A graphics card that passes the start-up test |
| **Low** | three.js, no post, no shadows, lower resolution, no extras | Lights, cards, sticks, bangs, particles (few) | A weaker card; Foundry's performance mode is low |
| **Flat** | **A plain 2D canvas (built 2026-10-01, §8.5).** It was planned as HTML and CSS, as plates 01 to 12; a canvas draws the same stage from the same rig, so a click, a card and a stick all land in the same place as in three.js | Cards, sticks, wiggle, bang, zones, marks, chalk and its box, emotes; no light, shadow, air or glow | No usable WebGL, three.js failing on this stage, or anyone's choice |

**The feel is in every row** (`feel.md` §7). The flat backend has the stick, the wiggle and the bang, and the live check
holds it to them: a real press brings the stick out, a real furious wiggle leans the card, a real swing into another card is a
bonk (§8.5).

**Why not three backends.** The CSS-3D diorama would be a third, and every feature would cost three times. It is kept in
the lab as a contingency: if the three.js route fails the phase 0b spike, it is productionised in place of three.js, and
nothing else in this document changes.

### 8.3 The three.js backend, inside

```
 Scene
 ├─ backdrop        the painting, on a plane at the far end, sized so it lands 1:1 on the screen
 ├─ set pieces      the counter and any other cut-outs, each at its own depth (real occluders)
 ├─ floor           invisible, except where it takes a shadow
 ├─ wall            invisible, except where it takes a footlight shadow
 ├─ lights          one spot light per lantern, window or fire; footlights; the bang's flash
 ├─ cards           per card: root > lean > hinge > facing > { body, face, back, foot, enamel }, and a stick
 ├─ emotes          one sprite each, drawn from the sticker art
 ├─ particles       dust, sparks, embers, rain, snow; one draw call per kind
 └─ post            bloom → vignette and grain → output
```

The **camera** is the CSS lab's own, expressed as a three.js camera with an off-axis frustum so the vanishing point
lands on the painting's horizon. That means a card placed at a fraction of the painting lands on the same pixel as in the
CSS lab, so **every rig already authored carries over unchanged** (`diorama.md` §2.2).

A **skin** is a function from a person to the pictures on the card (face, back, stick, emotes). The adventure's brass
skin lives in the adventure; the module ships a plain one (`module.md` §7).

### 8.5 The flat backend, as built (2026-10-01)

`module/stagecraft/scripts/render/flat/`. It is the fallback she asked for ("keep a very basic fallback") and it meets the
same contract as three.js (§8.1), so the engine, the pointer and the chalk cannot tell them apart.

- **What it draws.** The painting, and the strip a raised painting leaves below it (the floor mirrored and dimmed); the cut-outs
  (a card further back than the counter is drawn before it, a nearer one after); cards that lean about their grip, turn (a
  card turned right round shows its back, one edge on is a thin line, never gone), tip and rise on their sticks, each with a
  foot, an edge that shows as it turns and a shadow that stays on the floor; zone outlines; marks and the ghost; chalk and its
  box; emotes; the bang as impact lines, a short glow and a few sparks (none of those two in calm mode, and the glow still
  governed to three a second). **Not drawn:** light, real shadows, glow, air, footlights.
- **One geometry.** Where a card stands, which card is under a click, where a point of the screen is on the floor or the
  painting all come from `flat/geometry.mjs` and `flat/box.mjs`: pure, no canvas. A test puts the same floor point through
  three.js's own camera and the flat maths and requires the same answer; another does the same for every stick of the box.
- **Shared pictures.** A zone outline, the impact lines and a mark are drawn by `render/canvas-art.mjs`, which both backends
  use. Chalk is painted once, in pixels, by `render/paint/wall.mjs` (since 2026-10-03, `chalk.md` §11), and both backends lay
  the same tiles of it on the painting, so the chalk is the same whichever draws it.
- **Cheap on purpose.** The pixel ratio is capped at one, the zone outlines are redrawn only when something changed, and
  nothing is asked of the graphics card, so there is no context to lose.
- **When it is used** (`render/choose.mjs`): the player chose "Flat" in the module's settings; the browser cannot make a WebGL
  context at all; the player left the quality on Automatic and the browser's WebGL is software (no graphics card: see §9); three.js fails to start on this stage (the table is told once); a second graphics context is lost; or the
  3D picture has failed every pass of the draw loop for ten seconds. In the last case the stage is rebuilt flat before Foundry's own
  canvas is given back. The 3D picture is tried again on the next scene.

### 8.4 Two gotchas the spike found

- **Point sprites assume a 90° lens.** three.js sizes a point as `size × (buffer height ÷ 2) ÷ distance`, which is true
  only for a 90° field of view. Our camera is `f` pixels long, so point sizes must be multiplied by `f ÷ (H ÷ 2)`
  (3.9 here), or dust and sparks come out four times too small.
- **Lights are physical since r155.** A spot light's intensity is in candela and falls with the square of distance, and
  the old multiplication by π is gone, so numbers copied from older examples come out several times too dark or too
  bright. The spike's are tuned for the world's pixel units and are in its source.

---

## 9. What was measured, and what was not

**The spike** is [`lab/three-spike.html`](lab/three-spike.html), plate 38, three.js r186 (0.186.1). It uses the lab's
`diorama.mjs`, `puppets.mjs` and `emotes.mjs` unchanged. The scripted scene: Yumiko is picked up at 0.35 s, carried to
the open stretch of bar, wiggled at 3.1 swings a second for 1.2 s (±100 px), wound up on a swing to the left, and sent
into Tama at 2.01 s; one bonk at 2.258 s, closing at 1,510 px a second. `window.__stage.setTime(ms)` redraws any moment
exactly. A live mode (`?live`) lets anyone drag any card with a real mouse; I drove it with a scripted real mouse and it
produced the same wiggle and bangs (two bonks: Yumiko into Etsuko during the wiggle, then into Tama).

**Where.** Headless Chrome (new headless mode), real graphics card through ANGLE and Direct3D 11: **NVIDIA GeForce RTX
3070 Laptop GPU**, page 2560×1440 (Ingram's screen is a 4K display at 150%, so the real buffer is 3840×2160). 150 frames
after a 16-frame warm-up; the clock stops after a one-pixel read that forces the card to finish.

| Setting | Buffer | Time per frame | Draw calls | Triangles |
|---|---|---|---|---|
| High: bloom, grain, vignette, 4× anti-aliasing, three shadow maps | 2560×1440 | **3.09 ms** (324 a second) | 122 | 19,117 |
| High at Ingram's real size | 3840×2160 | **6.53 ms** (153 a second) | 122 | 19,117 |
| High at half size | 1280×720 | 1.34 ms | 122 | 19,117 |
| High with footlights (five shadow maps) | 2560×1440 | 3.71 ms | 155 | 28,615 |
| High with no anti-aliasing | 2560×1440 | 1.70 ms | 122 | 19,117 |
| **Low**: no post-processing, no shadows | 2560×1440 | **0.65 ms** (1,534 a second) | 65 | 6,798 |
| Software rendering (no GPU), low | 1280×720 | 79 ms (13 a second) | 65 | 6,798 |
| Software rendering, low | 2560×1440 | 268 ms (4 a second) | 65 | 6,798 |
| Software rendering, high | 1280×720 | 435 ms (2 a second) | 122 | 19,117 |

The JavaScript side is small: updating every card takes about 0.1 ms a frame and submitting the drawing 0.4 to 1.4 ms,
so the main thread is free for Foundry.

**The feel, in numbers** (the pure puppet model, which the spike shares): a hand moving at 600 px a second and stopping
makes a card lean 2.3° and settle in 0.62 s; at 1,500 px a second, 5.7° and 0.65 s; at 3,500, 13.3° and 0.91 s. The
scripted scene's held card leans up to 8.5° through the wiggle and 9.9° as it charges, and the card it hits leans
7.7°. A bang at 1,500 px a second knocks the other card 7.6°, jolts it 17.7 px, and it settles in 0.6 s. These are the numbers `feel.md` §6 turns into golden tests.

**Inside Foundry, with no graphics card and a slow processor (2026-10-01, `tools/stagecraft/weak-machine.mjs`).** The same
stage scene, in the real Foundry world with the adventure's interface on top, at 1280×720, in headless Chrome with software
rendering (SwiftShader) in place of the card, and again with the processor slowed to a quarter. The frame rate held over four
seconds, and the time from asking for the scene to its being ready:

| Graphics | Processor | Tier | Drawn by | Speed (frame rate) | Slowest 5% (frame time) | To start |
|---|---|---|---|---|---|---|
| None (software) | full speed | Automatic | flat | 28 | 48 ms | 3.0 s |
| None (software) | full speed | High | three.js | **2** | 491 ms | 6.5 s |
| None (software) | full speed | Low | three.js | **8** | 121 ms | 5.2 s |
| None (software) | full speed | Flat | flat | **30** | 36 ms | 2.2 s |
| None (software) | quarter speed | High / Low / Flat | three.js / three.js / flat | 2 / 9 / 29 | 533 / 158 / 36 ms | 8.1 / 7.5 / 4.5 s |
| Real card | full speed | Automatic | three.js | 120 | 8 ms | 3.0 s |
| Real card | full speed | High / Low / Flat | three.js / three.js / flat | 120 / 119 / 120 | 8 ms | 0.9 / 1.5 / 0.6 s |
| Real card | quarter speed | High | three.js | 75 | 17 ms (worst 200 ms) | 2.9 s |
| Real card | quarter speed | Low / Flat | three.js / flat | 115 / 120 | 9 ms | 2.8 / 2.0 s |

What it says. **With a real graphics card every tier is smooth, even with the processor slowed to a quarter** (the lit stage
holds a frame rate of 75 then). **With no card at all the lit stage is unusable** (2 a second), the low one poor (8), and
**Foundry's own canvas, with no stage at all, manages only 7**; the flat stage holds 30. So Automatic now looks at the name
the browser gives its graphics (SwiftShader, llvmpipe, "Basic Render Driver" and the like are software) and picks the flat
stage for it; the table above shows it doing so. Two optimisations came out of the first run, which had the flat stage at
14 a second: the painting, zone outlines and chalk are drawn once into a backdrop and copied each frame, and a cut-out is
cut from the painting once, not clipped every frame. That doubled it. What is still unmeasured is any real integrated
graphics chip, which is the one case that matters and the one that is neither of these two extremes.

**What I read from this.** The picture is not the problem: on a card like this one the whole stage costs a fifth of a
60-frame budget at 2560×1440 and under half at 4K. The risk is the machines I did not measure.

**What was not measured, and so is not claimed.**

- Any integrated or older graphics card, and any phone or tablet. (A reasonable guess is that an integrated chip is
  five to ten times slower than this one, which would put the high tier at 15 to 30 ms at 2560×1440 and the low tier at
  3 to 6 ms: playable low, marginal high. That is a guess, not a measurement. Which machines the six players use is
  call 6 in §11.)
- Safari and Firefox. Memory in use (the figures in §6.2 are arithmetic). Long runs for leaks. Recovery from a lost
  context. Six players at once on the socket.
- **Anything inside Foundry**, as of the spike. The spike is a standalone page. It proves the drawing and the feel; it does
  not prove the takeover. That was phase 0b, and §10 has its result.
- The 3D feel under a real hand: the numbers match the CSS lab's and the pictures show the sensations, but only Ingram
  can say whether they *feel* right. The live page is the thing to try (`lab/README.md`).

---

## 10. The plan

| Phase | What | Exit test | Size |
|---|---|---|---|
| **0. The spike** | Done 2026-10-01, plate 38 | Pictures and numbers in §9 | done |
| **0b. Takeover inside Foundry** | **Done 2026-10-01; result below.** Done in the real module rather than a throwaway one. In the local licensed Foundry (port 30000): one flagged scene gets our manager; PIXI is hidden and idled; a three.js canvas draws the Paper Lantern; scenes are switched twenty times | (1) A flagged scene is ours and an unflagged one is Foundry's. (2) PIXI restores cleanly and memory returns to baseline. (3) Sidebar, chat, sheets and the deck work; Dice So Nice's canvas, if installed, still shows above. (4) Keys and pointer behave; Foundry's hotkeys do not steal ours. (5) Resize and a lost context recover. (6) Combat can run with no tokens. (7) It holds the frame time on this machine alongside the real HTML UI | S |
| **1. The module's core and two backends** | `module/stagecraft/` with the pure core and the three.js and flat backends at parity with plates 01 to 37 for what each can do; the accessible mirror, calm mode and tiers; golden feel tests; the boundary tests | Every plate reproducible from the module; the feel tests pass; `npm test` clean | L |
| **2. The adventure uses it** | The bridge in the adventure; the party in the wings; the Paper Lantern and two more scenes; Session 0/1 can use it | Ingram plays a scene | M |
| **3. Chosen extras** | From §5, in the order she picks; the token bridge when fights need it | One extra at a time, each with a test and a tier | S to M each |
| **4. Extraction** | Move `module/stagecraft/` to its own repository, with docs, licence and a release (`module.md` §14) | Her go-ahead | M |

*Sizes are guesses: S a few working sessions, M a couple of weeks, L a month or more.*

**Phase 0b result (2026-10-01): it passed, with no patch to Foundry.** It was done in the real module, `module/stagecraft/`,
in the local licensed Foundry (v14.367, sf2e 1.4.1) with the adventure's world, driven from headless Chrome on the RTX 3070
laptop card with real pointer events (`tools/stagecraft/foundry-check.mjs`; 98 checks, all passing, run against the
minified bundle). The takeover needs only the doorway Foundry documents: `CONFIG.Canvas.managedScenes` answered by a Proxy
from the scene's own flag, and the `SceneManager` lifecycle (hide and stop PIXI in `_onDraw`, put it back in
`_onTearDown`). The kill criterion above did not trigger. Against the exit test:

| # | Exit test | Result |
|---|---|---|
| 1 | A flagged scene is ours and an unflagged one is Foundry's | Yes. A plain scene: Foundry's canvas visible and running, no stage. A stage scene: Foundry's canvas hidden and stopped, one stage root, and Foundry still believes the scene is drawn and ready |
| 2 | PIXI restores cleanly and memory returns to baseline | Yes. Twenty switches between a stage and a plain scene: every one gives Foundry's canvas back visible and running; the GPU objects return to the same counts each time (72 geometries, 45 textures, 249 tracked); one stage root; the canvases do not grow; the browser never warns of too many contexts. The JS heap read 105 MB after the first switch and 114 MB after the twentieth |
| 3 | Sidebar, chat, sheets and the deck work; a Dice So Nice canvas still shows | The sidebar and chat work over the stage, and the adventure's deck, clock and windows are HTML above the canvas and unaffected. Not tested: Dice So Nice (not installed in this world) and character sheets |
| 4 | Keys and pointer behave; Foundry's hotkeys do not steal ours | The pointer does everything (picking up, the wiggle, the bang, the chalk) with real events. **One conflict found and fixed:** Escape is also Foundry's key (the game menu), so with chalk in hand the stage takes it first. The card keys are registered through Foundry's keybindings but were not pressed in the live check |
| 5 | Resize and a lost context recover | Yes, both. A window resized to 1400 by 800 resizes the stage with it. A lost graphics context rebuilds the stage with its cards and its chalk. **The check found two faults and they are fixed:** one error in the draw loop ended it for good, and a rebuild could draw a half-built card |
| 6 | Combat can run with no tokens | Not tried |
| 7 | It holds the frame rate beside the real interface | Yes: 120 fps (the display's rate) at the high tier, with the adventure's whole interface over the stage |

**Not covered by phase 0b:** another player's screen following a held card (the grip protocol is not written), a weak machine,
Safari or Firefox, and the token bridge. What it did not need: any change to Foundry or to the adventure.

**Kill and retreat criteria.** If phase 0b shows the takeover needs a patch to Foundry's own objects beyond the
documented scene manager, drop to the overlay (option B). If the high tier cannot hold a steady frame time on the
players' real machines, make low the default and keep high as an option. If the three.js route fails outright, the
CSS-3D diorama is productionised instead; nothing in `stage.md`, `scene-standard.md` or `feel.md` changes.

---

## 11. Ingram's calls

Each has my default; none is settled until she says so.

1. **Adopt the three.js Stage Renderer** as the main way Stagecraft scenes are drawn? *Default: yes. Phase 0b passed on 2026-10-01 (§10).*
2. **Takeover or overlay.** Takeover per scene, opt-in, with overlay as the fallback. *Default: as written.*
3. **Tokens.** The stage's own state stays the source of truth; a token bridge only when fights need it. *Default: as written.*
4. **Two renderers, not three** (three.js and flat; CSS-3D kept as a contingency). *Default: as written.*
5. **Which extras first** (§5.6). *Default: the order given there.* Footlights in particular are a look she should see before they are anywhere near a real scene.
6. **The players' machines.** What do the six of you play on, and in which browsers? This sets the default tier.
7. **Accessibility** (§6.3) in phase 1, not later. *Default: yes.*
8. **The Watcher's tells** as renderer effects (§5.5): allowed at all, and where is the reveal line?
9. **The module's name and licence** and whether it goes public (`module.md` §11): hers, and later.
10. **Phase 0b now?** Done, and it passed (§10); the next big piece is held cards following the pointer on every screen.

---

## 12. Sources

- Foundry v14.367 source, local: `client/canvas/board.mjs`, `client/canvas/scene-manager.mjs`, `client/config.mjs`,
  `client/game.mjs`, `client/documents/scene.mjs`, `public/css/foundry2.css`; and `design/foundry-technical-reference.md`.
- sf2e system 1.4.1, local: `gamesystems/sf2e/sf2e.mjs`.
- three.js r186: [threejs.org](https://threejs.org), vendored (MIT) at `third-party/three/`, entered in `CREDITS.md`.
  Lights are physically based from r155; the stable renderer is `WebGLRenderer`.
- Foundry packages, as listed on 2026-10-01: [Dice So Nice](https://foundryvtt.com/packages/dice-so-nice/) (a transparent
  three.js canvas over the PIXI one), [3D Canvas](https://foundryvtt.com/packages/levels-3d-preview) (by TheRipper93,
  Foundry 11 to 14).
- The spike: `lab/three-spike.mjs`, with its renders in `lab/shots/` (`38a` to `38d`, `38-wiggle-and-bang.mp4`).
