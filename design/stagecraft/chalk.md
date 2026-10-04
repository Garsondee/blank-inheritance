# The box of chalk

*Drafted 2026-10-01 at Ingram's request and **built the same day** in [`module/stagecraft/`](../../module/stagecraft/).
**Rebuilt 2026-10-03 as the second edition: chalk is painted in pixels, with a kit of tools and magic chalk in any colour**
(her words and what changed are §11; §10 is the first edition, lines of points, kept as history). Part of
[Stagecraft: Puppet Show](README.md). Zones, which decide where chalk may be used, are in [`stage.md`](stage.md) §8; the
pictures are in [`renderer.md`](renderer.md) §5; the module that holds it is in [`module.md`](module.md). The calls in §9
are still hers.*

*Words. A **card** is a person on the stage, a **stick** the handle that appears when a card is picked up, a **zone** a
named area of the picture, and a **mark** a resting place on the floor (`stage.md` §8.10). The **wall** is the painting
itself, which is what chalk is drawn on. A **stick of chalk** is a different thing from a card's stick: it is the chalk.*

---

## 0. In one page

> A box of chalk. Players can grab the chalk and start drawing on the scene. We'll disable this for story scenes which
> are serious (and/or give the GM a button to override it) but I love the idea of players graffitiing the scenes. We
> need this graffiti to persist between sessions.

- **What it is.** A small wooden box of chalk stands on the floor of the stage: six sticks, a magic stick banded with every
  colour, and a felt eraser. A player clicks one and paints on the painting with it; a kit of tools comes out beside the
  stage (chalk, magic chalk, pencil, brush, spray, smudge, fill, eraser), with any colour at all. Whatever they paint stays
  there, for everyone, in this session and the next.
- **Where it works.** Not everywhere. Every scene says whether chalk is **off**, allowed only in **zones** (a chalk wall,
  a pavement, a shutter), or allowed **anywhere**. Serious story scenes are off, and then there is no box at all. The GM
  can override any of it live with one button.
- **What it leaves.** Paint, in pixels: each painter's own layer of the wall, kept with the last few strokes' history so
  each can be taken back. It is kept in the world, not in anyone's browser, so it survives a reload, a session and a
  server restart, and everyone else sees a stroke as it is being painted.
- **What it feels like.** A painting program: the line is smoothed and steadied as it is drawn, follows a pen's pressure
  (or the speed of a mouse), and a ring the size of the tip shows exactly where paint will go. Chalk keeps its look: a
  solid core, slightly fuzzy outside. A small thing that is fun to do and fun to find.

---

## 1. The brief, in Ingram's words

> A little thing I'd like to add, it's a fun optional feature but my players will absolutely love it. A box of chalk.
> Players can grab the chalk and start drawing on the scene. We'll disable this for story scenes which are serious
> (and/or give the GM a button to override it) but I love the idea of players graffitiing the scenes. We need this
> graffiti to persist between sessions.

Four requirements, each tested: it is optional; it can be switched off per scene and overridden by the GM; it persists;
it is fun.

---

## 2. What a player does

1. **See the box.** In a scene where chalk is allowed, a low wooden tray stands on the floor with a stick of each colour
   upright in it, like pencils, the magic stick (taller, every colour climbing round it, a gold star on its tip) and a
   felt eraser at one end. In a scene where it is not, there is no box. Nothing about the box is drawn in a serious scene,
   so nothing needs hiding. Its place is the scene's `chalk.box` (a spot on the painting); it must be somewhere a click can
   reach: in front of any counter that would hide it, clear of the cards and of the interface (§10, "Findings").
2. **Take a stick.** Click a stick (chalk of that colour), the magic stick (magic chalk) or the eraser. The kit of tools
   comes out at the side of the stage, and the pointer becomes a ring the true size of the tip, with the colour beside it.
   Click another stick to change colour, click the same one again to put it back.
3. **Paint.** Press and drag on the painting. Paint follows, smoothed: a shaky hand still makes a clean line ("steady
   hand", four settings, on a little by default), a pen's pressure thickens and strengthens it, and with a mouse a slow
   hand presses harder than a quick one. A tap leaves a dot; **Shift-click** draws a straight line from where the last
   stroke ended. Where chalk is allowed only in a zone, paint stops exactly at the zone's edge, however it was painted.
4. **Choose.** The kit has every tool (§5), a colour well that opens a picker (any colour; the box's six and the last ten
   used are one click away), the size (a slider, or **[** and **]**), steady hand, a dropper (or **Alt-click**) that takes a
   colour off the wall or the painting, and magic chalk's tricks: glow, sparkle, rainbow.
5. **Take back.** **Ctrl+Z** takes back your last stroke and **Ctrl+Shift+Z** (or Ctrl+Y) puts it back; the last eight
   strokes of each painter can be taken back. The eraser rubs out **your own** paint (a pen's eraser end does too); a GM's
   rubs out anyone's.
6. **Put it back.** Escape (which first throws away a stroke being painted), a right click, the kit's ✕, or the same stick
   again. (Letting go of the pointer does not put the chalk away: a player paints many strokes with one stick.)

Everyone else sees a stroke as it is being painted, and the kept paint a moment after it ends (§11). Nobody has to
confirm anything.

---

## 3. Where chalk is allowed

A scene carries one policy, `chalk.mode`:

| Mode | Meaning | Used for |
|---|---|---|
| **off** | No box, no drawing. What is already on the wall is still shown, or hidden, as the GM chooses (§6) | The default. Serious story scenes: an interrogation, a funeral, a briefing |
| **zones** | Chalk works only inside the scene's **chalk zones** | A bar's back wall, a shutter in the alley, the classroom blackboard |
| **anywhere** | Chalk works on any part of the painting | Haunts, the canteen, the roof: places the group keeps coming back to |

A chalk zone is an ordinary zone (`stage.md` §8) with the kind `chalk`. That is deliberate: it means the same drawing
tool already used to mark a door or a window marks where graffiti belongs, and a scene that has no chalk zone has no
chalk, with no extra switch.

**The GM's button.** The strip along the top of the stage has one: **Chalk**, which goes round *as the scene says, off,
zones only, anywhere* and back. It overrides the scene's authored mode and says so on its face while it differs from the
scene's own (it is lit, and reads "Chalk: off" rather than "Chalk: off (scene)"), and one more press round the circle
returns the decision to the scene. The override is stored in the scene's own flags (`flags.stagecraft.live.chalk`), so
every screen follows at once and it is still there next session: **it stays until the GM sets it back**, which is why it
is lit.

**The freeze.** A scene can be marked `chalk.lock`, and the GM's **Freeze** button does the same live: the wall stays,
the box goes, nobody can draw or rub. Freezing is independent of the mode, so a frozen scene stays frozen when the mode is
changed; only **Freeze** (or the scene's author) lifts it. That is the "story scene cannot be opened by accident" rule.

**Which scenes default to what** is hers to decide (§9). My proposal: haunts and the places the group returns to default
to **anywhere**, story scenes to **off**, and a scene says so in its stage data without any special case. The module's
own default for a scene that says nothing is **off**.

---

## 4. What chalk leaves behind

### 4.1 A layer of tiles

*(The second edition, 2026-10-03. The first kept lines of points, "strokes"; §10 describes them.)*

Chalk is kept as pixels. The **wall** is a picture laid over the painting, 1440 pixels high and as wide as the painting's
shape makes it (2880 for the usual 2:1 painting; never more than 4320), cut into square **tiles** of 240 pixels: twelve
across and six down. Everyone who paints on a scene has a **layer** of their own, and the wall shows every layer, one over
another, in the order their painters first painted there.

A layer keeps only the tiles that have paint on them, each as a small picture (WebP, or PNG where a browser cannot make
WebP), and a **history**: for each of its painter's last eight strokes, what the tiles it touched held before it, so that
stroke can be taken back. A step of history records who made it (`who`), because a GM's eraser changes other people's
layers: their own Ctrl+Z never takes back what the GM did, and the GM's does.

| Field of a layer | Meaning |
|---|---|
| `v` | 2, the second edition |
| `scene` | The scene it belongs to |
| `by` | The painter, a user's id |
| `since` | When they first painted here: the layer's place in the stack |
| `tiles` | `{ c3r1: picture, ... }`: column and row, and the tile's picture as a data URL |
| `history` | `{ step: { at, who, tiles: { c3r1: what it held before, or null } } }`, the newest eight; a step's id is the time and the stroke's id, so every screen knows which stroke it was |

Nothing else is kept, and a page never grows without bound: at most 72 tiles and eight steps.

### 4.2 Where paint is kept

The requirement is that it persists between sessions, is shared, can be painted by any player without a GM being the one
to save, and can be moderated by the GM. The answer is the notebook's own pattern (`design/notebook.md`):

> **One world journal entry, "Stagecraft chalk", default ownership Owner, with one page per scene and painter, holding
> that painter's layer for that scene.** Players write only their own pages (by convention: Foundry's ownership cannot
> restrict a page to its author), so two people painting at once never overwrite each other. Every client reads all the
> pages of the scene and lays them over each other. The GM can write any page, and deleting the entry clears every wall.

A GM's client makes the entry the first time a scene in the world allows chalk (at login, or the moment a scene is flagged
for chalk or opened from the GM's strip), and repairs its ownership at every GM login; a world that never uses chalk never
gets one, and a player's client never has to. **When a scene is deleted its chalk pages go with it.** Every tile and every
step of history is its own key, written and taken away on its own (with Foundry 14's `_del`, or `-=` on an older Foundry),
so a stroke's update carries only the tiles it touched, and two strokes a moment apart never lose each other. All writes by
one client go through a single queue. The first edition's pages (lines of points) cannot be shown any more; the acting
GM's client removes them.

The entry is **hidden from the Journal list for players** (a GM sees it): its pages are named after scenes and hold
nothing a person can read, and the table should not meet it.

Why not the alternatives:

| Option | Against |
|---|---|
| Scene flags | Only a GM can write them, so a stroke could not be saved if the GM's browser were closed or busy, and every stroke would rewrite the scene document that everyone is also using |
| Each user's own flags | Works (a player may update their own user), and has the same size problem, but spreads one scene's wall across six documents with no natural way for the GM to see or tidy it, and the strokes vanish with the user |
| A raster image uploaded to the server | Players cannot upload by default, and a GM would have to be the one to save it. (The second edition keeps pixels anyway, but as small pictures in the journal, which any player may write, layer by layer, so paint is still attributed and can still be taken back) |
| Only the live socket | Nothing persists |

**Proved live (§10):** a player (not a GM) can create and edit pages in the Owner-default entry; a late joiner (and a
reload) sees everything; two drawers' lines end up on separate pages.

### 4.3 When the wall gets full

A layer cannot overflow: the wall has a fixed number of tiles, and painting over paint changes a tile rather than adding
to it. A crowded wall costs no more than a painted one. (The first edition forgot its oldest lines past 800; there is no
such cap now, and nothing to bake.)

---

## 5. How it is painted

*(The second edition, 2026-10-03: painted the way a painting program paints.)*

- **The brush** (`core/brush.mjs`, pure). The pointer's samples (every one the browser gathers, not only one per frame:
  coalesced events) are **steadied** (the brush is pulled along on a short string, so small wobbles never reach the paint
  and corners come out round; four settings, 0, 5, 12 and 26 pixels of string), joined by a smooth curve (centripetal
  Catmull-Rom), and paint is put down as **dabs**, small stamps of the tool's tip, every so far along the curve. Each dab
  is sized and weighted by **pressure**: a pen's own, or, for a mouse, made from speed (a slow hand presses, a quick one
  skims). A line may grow in from a point (the pencil and brush do). The same samples and seed give the same dabs on any
  screen, which is how other screens paint the same stroke live.
- **The wall's pixels** (`render/paint/wall.mjs`). A stroke is painted into a buffer of its own and laid into its
  painter's layer when it ends, so a stroke never darkens where it crosses itself, the wall's grain sits still under it
  (chalk catches on the wall, not on the stick), and in a zones-only scene it is masked to the chalk zones exactly.
  Rubbing out is a stroke too: a buffer of what to take away. Only tiles that changed are drawn again, and only they go
  to the picture.
- **The tools.**

| Tool | What it does |
|---|---|
| **Chalk** | A grainy stick: a solid core, slightly fuzzy outside (below) |
| **Magic chalk** | Any colour, and it can **glow** (a soft light round the line, on by default), **sparkle** (little four-pointed stars along it) and run through the **rainbow** as it goes. From the magic stick in the box |
| **Pencil** | Fine, crisp lines for writing and detail; tapers in |
| **Brush** | Soft, broad, smooth paint |
| **Spray** | A cloud of fine specks, heavier the harder or slower |
| **Smudge** | A fingertip: drags the paint that is there along, fading as it goes (on your own layer) |
| **Fill** | One click inside a closed shape fills it, tucked a little under the lines round it. A shape that is open (more than three tenths of the wall) is refused, and says so |
| **Eraser** | Takes paint away: your own; a GM's takes anyone's. A pen's eraser end rubs out too |

- **The look of chalk.** Her note on the first edition still holds: "Chalk should be tighter, less fuzzy and smaller by
  default (35% smaller). Solid core, slightly fuzzy outside." The chalk tip is solid (96%) out to 62% of its radius, then
  falls away, with small bites taken out of the edge only (more of them further out), so the wall shows through the fuzz
  and never through the core; four shapes of tip turn at random so no two dabs bite alike. A stick starts at 7 pixels of a
  1440-pixel wall. `TIP_CORE` and `tipAlpha` in `core/brush.mjs`, and a test holds the core solid and the edge bitten.
- **The ring.** While chalk is in hand the pointer is a ring the true size of the tip on the wall where it is (it shrinks
  at the back of a deep painting), dashed for the eraser, a fine cross for the fill and the dropper, with the colour in a
  dot beside it, greyed and struck through where chalk would leave no mark.
- **On the stage.** Each tile that has paint is a small plane just in front of the painting and behind every card (in the
  3D picture), or is drawn into the plain picture's backdrop, only its own place redrawn while someone paints. Cards stand
  in front of graffiti; graffiti never covers a face. The 3D picture shows paint a little under full white: chalk on a lit
  wall is not a lamp.
- **The box.** Upright sticks in a low tray, so each is a tall thin target side by side, then the magic stick, then the
  felt. Each has an invisible shape two or three times its width that a click can hit (tested with real three.js, no
  browser needed), because the box is a small prop in a deep room.
- **Not yet.** Dust that falls from the point; chalk lit by the room's lamps; a scratch while painting.
- **Calm mode.** Nothing about painting flashes or moves on its own; magic chalk's glow and sparkle are paint, kept still.

---

## 6. The GM's tools

A strip along the top of the stage, under the clock, for the GM only. Every button writes either the scene's flags or the
chalk journal, which Foundry sends to everyone, so each does the same on every screen.

| Button | Does | Built |
|---|---|---|
| **Chalk** | Goes round: as the scene says, off, zones only, anywhere (§3) | Yes |
| **Freeze** | Keeps what is there, takes the chalk away | Yes |
| **Undo** | Takes back the newest stroke on the wall, whoever painted it (from every layer it touched) | Yes |
| **Wipe** | Asks, then clears every layer of this scene, and its history | Yes (no undo for a minute yet) |
| **Hide wall** | Puts the paint out of sight for everyone (a serious beat in a scene that has some) without deleting it | Yes |
| **Wipe a player's** | Clears one person's layer here | Store call built (`wipe(scene, { by })`), no button |
| **Who painted that?** | Hovering paint shows whose layer it is on, to the GM only | Not built |

Every layer is one person's, and the GM can always wipe; those two together are the whole moderation story for a table of
friends.

---

## 7. Fun that costs little

Listed so they are not forgotten; each is optional and hers to pick.

- **Weathering.** Outdoors, rain washes chalk slowly; indoors it lasts. A scene sets `chalk.weather` and old strokes fade
  as in-world days pass. (The scene field is read; nothing fades yet.)
- **Characters notice.** An NPC can react to what is on the wall. The hook `stagecraft.chalk` is raised on the painter's
  screen once a stroke is kept, with the tool, the colour and where it lay, so the adventure can say "Taka squints at the
  doodle". **Built.**
- **Dust and a scratch.** A puff of dust at the point while drawing, and a quiet scratching sound. Cheap and lovely.
- **The wall remembers on the map.** A small chalk mark on the Campaign Map's place for a haunt, so the place looks lived in.
- **Hopscotch.** Chalk on the floor, in perspective, so a player can draw a grid a card can then stand on. (Needs the
  floor as a second drawing surface; later.)
- **A message to the next group.** A scene the party returns to has the old messages; a tally of who has been.
- **Photographs.** A photo zone that takes a picture of the stage includes the wall, because it is part of the stage.

---

## 8. Tests

**Pure and adapter tests**, in `module/stagecraft/test/`, run by `node --test`:

- `brush.test.mjs`: steady hand keeps a shaky line smooth and still ends where the hand stopped; dabs fall evenly along
  the curve at the tool's spacing; pressure thickens a dab and a mouse's speed thins it; the same samples and seed give the
  same dabs (so every screen paints the same stroke); a tap leaves a dot; a straight line; the chalk tip's solid core and
  bitten edge; colours, the rainbow, and a colour that is not one.
- `chalk.test.mjs`: the wall's grid for any painting's shape; tile keys, rectangles and the tiles a rectangle touches;
  layers in order; the newest step of history, all of it or one painter's; the oldest steps past eight; the policy (off,
  zones, anywhere, freeze, the GM's override) and the mask that holds paint to the chalk zones.
- `chalk-store.test.mjs`: the store against a stand-in for Foundry's journal. Entry made once (two asks at once make one),
  owned by everyone, by a GM only, and only where a scene allows chalk; a deleted scene's pages are cleared by a GM's client;
  a first paint makes the painter's page; **a tile is written and taken away on its own** (with `_del`, or `-=` on an older
  Foundry); each stroke keeps what it covered, and only the newest eight; taking back puts the tiles back and says what
  they held (to put them back again); **a painter's own Ctrl+Z never takes back what a GM did to their layer, and the GM's
  Undo takes back the newest on the whole wall, from every layer it touched**; writes a moment apart are all kept; a failed
  write does not stop the rest; who may write whose layer; wipes; the first edition's pages are removed.
- `chalk-controller.test.mjs`: the controller on that store, the real brush, and a stand-in wall whose pictures name the
  strokes that painted them (`fake-wall.mjs`). The box; the GM's override; the box's sticks, magic stick and felt, and
  the kit's tools; **a stroke on the wall at once and kept a moment later, as the tiles it touched with the step that takes
  it back, the hook told once, and the live messages sent**; the zones mask; Ctrl+Z and Ctrl+Shift+Z; **someone else's
  stroke shown live and giving way to their kept paint** (whichever arrives first); a player's message claiming a GM's
  eraser is not believed; rubbing out, mine and (as a GM) anyone's; a pen's eraser end; Shift-click; the fill; Alt-click;
  the hand remembered on the machine; a failed save; a rebuilt picture; the journal arriving late; stopping.
- `chalk-box.test.mjs`: with real three.js, a ray at the middle of every stick, the magic stick and the eraser picks that
  one; a hand's width either side still does; nothing else does; the hit shapes are never drawn; neighbours do not overlap.
- `flat-backend.test.mjs` and `flat-box.test.mjs`: the plain picture lays each tile where it belongs, redraws only the
  places of tiles that changed while someone paints, hides the wall, and has the same box.
- `journal-tidy.test.mjs`, `lang.test.mjs` (every word exists and the language file survives Foundry's way of reading it).

**The bench check**, `tools/stagecraft/bench/chalk-check.mjs` (43 checks), drives the real host, kit and both pictures in
headless Chrome with a real graphics card, real mouse strokes, real clicks on the kit and real keys, and reads the wall's
own pixels (§11). **The live check**, `tools/stagecraft/foundry-check.mjs`, in the local Foundry with real mouse events,
as a GM and as a real second player in a separate browser (§10, §11.2); its chalk checks, `tools/stagecraft/chalk-checks.mjs`,
also run on the bench, on the same stage, by `tools/stagecraft/bench/live-chalk-check.mjs` (53 checks).

---

## 9. Ingram's calls

1. **Defaults.** Haunts and returning places **anywhere**; story scenes **off**; which is which is a field in the scene?
2. **Chalk zones or anywhere** for a scene like the Paper Lantern: only its back wall, or the whole painting?
3. **Who can erase whose.** Built as: a player their own, the GM anyone's. Right?
4. **Colours.** Built as a box of six. Player colours instead, or as well?
5. **Weathering** (§7): worth having?
6. **Names on the wall.** The GM can see who drew a stroke (it is in the data; no hover yet); should the players too, or is
   anonymous graffiti part of the fun?
7. **Hopscotch and floor chalk** later, or never?
8. **The GM's override stays until set back** (§3). Or should it end when the GM leaves the scene?
9. **Any colour for every tool, or only for magic chalk?** Built as: the colour picker works for every tool, and magic
   chalk is the one with glow, sparkle and rainbow. The other reading of "a magic chalk which can be then changed to any
   colour" keeps ordinary chalk to the box's six.
10. **How many strokes can be taken back:** eight per painter, kept in the world. More costs room in the journal.
11. **The kit's place.** High on the left, and it can be dragged anywhere (each player's machine remembers where).

---

## 10. What exists, what was proved, what was found

*Written 2026-10-01 after the first live runs, about the first edition (lines of points). The second edition, painted,
replaced its strokes, store format and pictures on 2026-10-03 (§11); the rules, the box, the GM's strip and what was found
here still hold.*

**Built.** The rules (`core/chalk.mjs`), the journal-backed store (`foundry/chalk-store.mjs`), the controller joining rules,
store, wall and pointer (`foundry/chalk.mjs`), the GM's strip (`foundry/bar.mjs`), the wall, box and held stick
(`render/three/chalk.mjs`), the journal tidy (`foundry/journal-tidy.mjs`), the hook `stagecraft.chalk`, and the scene
fields `chalk.mode`, `chalk.lock`, `chalk.box`.

**Proved live** (the live check has 98 checks and all pass; these are the ones about chalk; real pointer events throughout):

- A GM takes a stick with a real click, draws with real mouse moves, and the line is on the wall at once and in the journal
  a moment later, with the drawer recorded.
- A line that runs out of a chalk zone stops at its edge; a line wholly outside leaves nothing.
- The eraser cuts a line in two; the wall always shows exactly what is kept.
- **After a reload the same chalk is on the wall** (persistence between sessions).
- **A real player, in a separate browser, joins and lands on the stage, sees the GM's chalk, has no GM strip, takes a
  stick, draws, and the line is kept under the player's name and appears on the GM's screen without a reload; the GM's
  new line appears on the player's.** Their pages are separate. The player's eraser leaves other people's chalk alone and
  rubs out their own. The player never meets the chalk journal in their Journal list.
- The GM's strip, clicked with a real mouse: closing chalk takes the player's box away at once; opening it to anywhere
  lets the player draw outside the zone; one more press hands the decision back to the scene; Freeze takes the chalk
  away from everyone and keeps the wall; Hide wall hides it for everyone without losing it; Undo takes the newest line
  off; Wipe asks first, then clears every line for everyone.
- Deleting a scene removes its chalk pages from the journal.
- **Beside all that:** the picture survives a resized window, a lost graphics context (rebuilt with its cards and its chalk),
  and runs at 120 fps with the adventure's whole interface over it.

**Found, and fixed or flagged.**

1. **Foundry reads a language file by expanding dotted keys.** A word and a group with the same name ("Freeze" and
   "Freeze.Tip") lose one of them silently; found in review, and a test now fails on it.
2. **Escape also opens Foundry's game menu.** The same press that put the chalk away opened a dialog over the stage that
   blocked every later click. The stage now takes Escape in the capture phase, before Foundry sees it, while chalk is in hand.
3. **A prop in a deep room is a small target.** Sticks lying in the tray were 10 pixels across and mostly unclickable.
   Now they stand upright in a tray, and each has an invisible shape two or three times its width that a click can hit.
4. **A counter hides what stands behind it.** The scene's own occluders (the bar counter in the Paper Lantern) hide the
   box if it stands behind them. A scene sets `chalk.box` where the floor is in front of any counter. The module's default
   (82% across, 84% down) is only a fallback.
5. **A painting is cropped to fit the screen**, so a spot near its edge can fall off a 16:9 screen. The default box is well
   inside the middle.
6. **The adventure's closed Scene Runner swallowed clicks (fixed 2026-10-03).** `#bi-scene-runner` was an empty,
   invisible box, 826 by 744 pixels at the top left, with `pointer-events: auto`, so a real click anywhere in that area
   reached neither Stagecraft nor Foundry's own canvas (verified on a plain scene). That was the adventure's CSS,
   not this module's. dca93ae made the host click-through, and the open shell and the toggle opt back in;
   `test/tier3-scene-runner-click-through-contract.test.mjs` holds it. Only the GM's screen ever had the box:
   a player's client never builds the Runner.
7. **Players can write pages of other players' in an Owner-default entry**: Foundry's page ownership inherits from the
   entry, so "players write only their own pages" is a convention the module keeps (a player's eraser touches only their own
   strokes), not a rule Foundry enforces. Nothing secret is kept there, by design.

**Not built yet.** Dust and scratch; lighting on the wall; weathering; baking the oldest strokes; "Wipe a player's" and
"who drew that" in the strip; the flat renderer; live streaming of a line as it is drawn (a stroke shows to others when the
drawer lets go).

### 10.1 "I can pick up chalk but I can't get it to leave a visible mark" (2026-10-03)

Ingram, at the table: *"The chalk system just isn't working for me right now, I can pick up chalk but I can't get it to
leave a visible mark. There appears to be a 'zone' in the Rumour Mill scene at the top left but no way to use it and no
indicator of what it's used for."* Five causes, each found by driving the real host with a real mouse
(`tools/stagecraft/bench/chalk-check.mjs`, 13 checks):

1. **In a "zones only" scene a line outside the chalk zones was clipped to nothing, silently.** Now the stick fades and
   tips back while it is over a place it cannot mark, and a small line by the pointer says where chalk goes ("Chalk goes
   on: The wall over the bench"). The chalk zones light up and show their names while chalk is in hand, and are not drawn
   at all otherwise: a dashed box on a wall that nothing can be done with was the puzzle she found in the Rumour Mill.
2. **The haunts are "anywhere"**: a place the group keeps coming back to is the place for graffiti. Episode One's Kit
   Issue keeps its one wall.
3. **With cards half as big again, the party stood in front of the box**, so a click on a stick found a card. The box is
   at the lip of the stage now, just left of the middle (`[0.405, 0.978]`), where no card stands over it, and a test fails
   if any of the party's places is on top of it.
4. **The GM's strips covered the top of the walls.** They fold away behind one small key ("Stage ▾"), folded at first,
   and step aside entirely while chalk is in hand.
5. **Kit Issue's wall was mostly off the top of the screen**: the painting is raised to clear the deck, which cuts off the
   top sixth of it. The zone is now the wall over the bench, below that line, and a test fails if any chalk zone is mostly
   off the screen at the 2560 by 1440 reference page.

---

## 11. The second edition: painted chalk (2026-10-03)

> Rethink how we do chalk. Ideally we don't use vector lines. Ideally I want it to really be a smooth art experience, with
> a 'magic chalk' which can be then changed to any colour, more precising when using the chalk, less clunky chalk lines
> (raster preferred to vector) and even a range of different tools. You will likely have to rethink how we store the
> information and how the chalk works, consider this a call to improve things across the board. Feel free to add other
> chalk 'tools' too.

**What changed, against what she asked.**

| She asked | Built |
|---|---|
| No vector lines; raster | The wall is pixels: each painter's layer of 240-pixel tiles (§4.1), kept as small pictures (§4.2) and painted by dabs (§5) |
| A smooth art experience | Every pointer sample the browser gathers, steadied on a string, joined by a smooth curve, weighted by pressure (a pen's, or a mouse's speed) |
| Magic chalk, any colour | The magic stick in the box; a colour picker (shade square, hue bar, the colour written out, the box's six, the last ten used) and a dropper; glow, sparkle and rainbow |
| More precise | A ring the true size of the tip at the pointer; sizes from 1 pixel, on a slider or **[** and **]**; Shift-click for a straight line; steady hand |
| Less clunky lines | Strokes never darken where they cross themselves; the chalk tip's look (J1) kept, as pixels |
| A range of tools | Chalk, magic chalk, pencil, brush, spray, smudge, fill, eraser |
| Rethink how it is stored | One page per scene and painter, each tile and step of history its own key (§4) |
| Improve across the board | Strokes seen live on every screen as they are painted; Ctrl+Z / Ctrl+Shift+Z for everyone (eight strokes each); a GM's Undo over the whole wall; a pen's eraser end; the plain picture shows paint as well as the 3D one |

**How a stroke travels.** The painter's screen paints it at once. While the hand moves, its samples go out on the module's
socket every 45 ms (`begin`, `more`, `end`, `cancel`), and every other screen paints the same stroke from them with the same
brush and seed (`receive` in `foundry/chalk.mjs`): who sent it is the server's word, never the message's, and only a GM's
eraser may rub out everyone's. When the hand comes up the stroke is laid into the painter's layer and the tiles it touched
are kept, with the step that takes it back (named after the stroke). The `end` message says which layers changed; each
other screen lets its live copy go only when every one of those layers holds that step and its pictures are on the wall,
so nothing flickers whichever arrives first. A stroke whose kept paint never comes is let go after five seconds.

**What was proved on the bench** (`tools/stagecraft/bench/chalk-check.mjs`, 42 checks, all passing; the wall's own pixels
read after real mouse strokes, real clicks on the kit and real keys):

- Kit Issue, zones only: a click on the box gives a stick and the kit; outside the zone the ring is struck through and a
  line names where chalk goes, and a stroke there leaves no pixel; on the wall over the bench a stroke leaves 3,500 pixels
  of the stick's own white, kept, and shown by the 3D picture.
- The Paper Lantern, anywhere: the magic stick; a colour typed into the kit (`#ff3366`) painted exactly; the pencil about
  a fifth as wide as magic chalk; spray and brush; the eraser clears its path completely and leaves the rest; Ctrl+Z puts
  every pixel back and Ctrl+Shift+Z takes them away again; one click fills a closed box completely, and a click where no
  shape closes does nothing; a smudge drags paint 4,800 pixels further; Alt-click takes `#ff3366` back off the wall; **]**
  grows the tip.
- Two screens: a player's stroke is on the GM's screen while the player's button is still down, then gives way to the
  kept paint; the player's Ctrl+Z takes it off the GM's screen; the player's eraser cannot touch the GM's paint.
- The plain picture (no graphics card) shows paint where it was painted.
- A deck laid over the bottom fifth of the screen sends the box back up the stage, clear of it, and the magic stick and
  the eraser can still be taken.

**Found on the live server.** On the GM's screen (2560 by 1271) the adventure's deck and Foundry's macro bar lay over the
box at the front of the Rumour Mill: only three of its sticks could be clicked, and not the magic stick or the eraser.
The box now finds its own place (`boxSpot` in `core/chalk.mjs`): where the scene put it, unless what covers the stage
covers it there (the deck, through `api.blocking.setCover`, and Foundry's macro bar); then the nearest place on the floor,
further back or a little to one side, wholly on the screen and, where it can, in front of nobody's card. It moves only
when it must (looked at once a second, and when the window changes), so it never hops about as people walk, and goes home
as soon as its own place is clear.

**Found while building it.**

1. **Foundry 14 deprecates `-=key`** (it still works, with a warning in the console every time; and it is refused outright
   on the ownership field, `design/notebook.md`). The store writes `_del`, Foundry 14's ForcedDeletion, and `-=` only on an
   older Foundry; a test holds both.
2. **A class's own field shadowed its method**: the wall's tip cache was a field named `coloured` beside a method named
   `coloured`, so the first dab would have thrown. Found in review before anything ran.
3. **Shading a stroke's grain by tiles** cannot be done by drawing the grain tile by tile with `destination-in` (each draw
   clears what the one before kept); the grain is a pattern placed so it sits still on the wall.

**Not built yet.** Dust and a scratch while painting; chalk lit by the room's lamps; "who painted that?" on hover; a
button to wipe one player's layer; weathering; floor chalk.

### 11.1 Made quick (the same evening)

> Chalk is really good but very laggy. What can we do about that?

Measured first, on the bench at her GM window's size and density (2560 by 1271 at 1.5), with real mouse strokes as fast
as Chrome takes them, by `tools/stagecraft/bench/chalk-perf.mjs` (it prints the frame time while the pointer only moves
and while each tool paints, and the time each part of the chalk's own code takes; `--cpu=4` slows the processor fourfold,
for a weaker machine). What was slow, and what changed:

| What | Before | After (normal speed / four times slower) |
|---|---|---|
| The pause when the pointer came up | 70 to 255 ms (360 to 580 ms slowed) | 1 to 5 ms / about 10 ms |
| The longest frame time in a stroke | up to 255 ms (387 to 637 ms slowed) | 21 to 45 ms / 37 to 50 ms |
| The usual frame time while painting (the median) | about 19 ms | about 10.5 ms, the same as with the pointer only moving / about 20 ms |
| The first stroke of a page | a stall of about 220 ms slowed | about 87 ms slowed (about 20 ms at normal speed), once |

1. **The end of a stroke.** Every tile a stroke touched was read back from the graphics card and encoded on the main
   thread, all at once, and magic chalk's glow was blurred at full size. Now a tile is snapshotted at once and read back
   and encoded by a worker (`encodeTile` in `render/paint/wall.mjs`); a painting stroke's tiles are known to hold paint, so
   nothing looks to find out; and the glow is blurred at a quarter of the size. Strokes are kept strictly in the order they
   were made (a quick hand's second stroke never overtakes its first), and Ctrl+Z waits for a stroke still being kept.
2. **Painting.** Every mouse sample laid whole tiles of the wall together again and made new canvases (a fast mouse sends
   many samples per frame). Now a dab marks only the part of a tile it touched; the wall is laid together once per frame,
   by the host just before it draws, only where something changed, on canvases that are kept, not made anew every frame.
   A dab that cannot reach the chalk zones is never laid down at all.
3. **The ring round the pointer** was a canvas the size of the screen, cleared and drawn at every move; it is a few small
   elements now that only move.
4. **Smaller things.** The 3D picture's pointer maths no longer makes new objects at every sample; the tips and the wall's
   grain are made while the browser is idle when the stage opens, and the program that draws chalk tiles is built while
   the stage loads; the smudge reads the wall as last laid together, into canvases kept for the stroke; chalk's writes ask
   Foundry to redraw nothing.

`chalk-check.mjs` now also proves that a stroke, painted and kept, makes the main thread read no canvas back and encode
none (43 checks).

### 11.2 The live check, brought up to date (the same evening)

The live check (`tools/stagecraft/foundry-check.mjs`) still drove the first edition: lines of points in the journal, a
stick that followed the pointer, a line cut in two by the eraser. Its chalk is now checked the way `chalk-check.mjs` checks
the bench, from the wall's own pixels, and the checks live in one place for Foundry and the bench:
`tools/stagecraft/chalk-checks.mjs` (what is checked), `tools/stagecraft/chalk-probe.mjs` (how a page is seen and handled:
the stage's host from the `stagecraft.stageReady` hook, the wall's pixels, the kit, the box, the GM's strip, the chalk
journal; every click made only once nothing covers what it clicks) and `tools/stagecraft/check-stage.mjs` (the live
check's own stage). What it checks in Foundry, with real pointer events and real keys:

- As the GM: the strips start folded behind their key, and a click unfolds them; every stick, the magic stick and the
  eraser can be clicked, whatever lies over the stage; a stick puts the kit out and the strips step aside; outside the
  back wall the chalk says where it goes, and the ring stands at the pointer; a stroke leaves paint of the stick's colour,
  the `stagecraft.chalk` hook names who, what and where, and the journal holds the painter's own page with the tiles and
  the step that takes it back; the 3D picture shows every painted tile, and the wall shows exactly what the journal keeps;
  a stroke stops exactly at the zone's edge, and one wholly outside keeps nothing; the eraser clears its path and leaves
  the rest; Ctrl+Z and Ctrl+Shift+Z go through the journal; Escape opens nothing of Foundry's; each stick paints its own
  colour; magic chalk paints in a colour typed into the kit.
- A lost graphics context, and then a reload: the same paint comes back.
- With a real player in another browser: on arrival they see the GM's paint and have the box but no strip; their stroke
  shows on the GM's screen while they paint it and gives way to the kept paint, on a page of their own; the GM's paint
  reaches them without a reload; their eraser leaves the GM's paint alone and clears their own, and their Ctrl+Z puts it
  back on the GM's screen; the strip, each press a real click, takes their box away, opens chalk anywhere (they paint
  outside the zone), hands the decision back to the scene, freezes (the chalk leaves their hand), hides the wall, takes
  back the newest stroke whoever made it, and wipes after asking; a GM's eraser clears a player's paint too, kept as the
  GM's step on their page, and the strip's Undo puts it back.
- The plain picture: the box can be clicked, and paint shows in the picture and is kept.
- A deleted scene takes its chalk pages with it (on a first run a scratch scene is given a page, so the check always has
  something to prove).

**`tools/stagecraft/bench/live-chalk-check.mjs`** runs the same checks on the live check's own stage on the bench (the
module's real host, kit and wall, with the bench's store in place of the journal), as a GM and a player in two tabs: 53
checks, all passing, both before and after §11.1. The checks can be kept up with the module where no licensed Foundry is
to hand.

**Not yet run in a real Foundry.** The local Foundry on this machine has had no licence and no world since the reinstall
of 2026-10-03, so the live check itself still has to be run. What was found on the way, from the code, and fixed in the
check: the GM's strips fold behind their key and step aside while chalk is in hand (every press of the strip would have
failed); the kit's own canvases broke three "one canvas" checks, and after a rebuilt picture the stage's canvas is no
longer the first in the stage; the wall is laid together once per frame, so a page in the background is read after laying
it together; and the deleted-scene check proved nothing on a first run.
### 11.3 Light in the world (2026-10-04)

Foundry sends every client the whole journal when it joins, so what chalk keeps in it is every player's load time. Measured:
fifteen strokes with every tool by one painter on one scene were **2.2 MB** (about 575 KB of tiles and 1.6 MB of history,
the "before" pictures). Seven painters over a campaign of scenes would have made the world slow to join. What changed
(the table's rule, `HISTORY_BYTES` and `HISTORY_HOURS` in `core/chalk.mjs`):

- **A budget of pictures, not only of steps.** A layer keeps its last eight strokes *and* no more than 320 KB of "before"
  pictures (about seven strokes over paint that is already there; a stroke on a bare wall keeps nothing but `null`s and
  costs almost nothing). The oldest steps go first; the newest always stays, however big (`trimSteps`).
- **An age.** The acting GM's client tidies the journal eight seconds after it logs in (`ChalkStore#tidy`): steps older
  than twelve hours are dropped (a session and a good deal over), a layer left with no paint and no history is deleted, and
  so are pages of scenes that no longer exist and of the first edition. Paint on a wall is never touched.
- **Lighter pictures.** Tiles are kept as lossy WebP at 0.85 (a third smaller than at 0.92) with their alpha rounded to 64
  steps (alpha is stored without loss and soft paint is mostly alpha; a step of 4 in 255 is finer than the screen's own
  steps over a dark wall). The same fifteen strokes' tiles went from 234 KB to about 156 KB. The paint on the painter's own
  screen keeps its full alpha; only the kept picture is rounded, so what Ctrl+Z puts back is the kept picture, within a
  pixel here and there at an edge.

Foundry's socket takes messages up to 100 MB, so one big save is no risk; the cost was always the journal's total size.
`chalk-check.mjs` proves the kept pictures are WebP with at most 64 alpha levels and a few KB a tile (44 checks).
### 11.4 The ink keeps up with the hand (2026-10-04)

> Chalk art system is good but still very laggy when drawing. Deep audit, what can we do?

**The audit** was made in the real local Foundry (the adventure on, 2560 by 1271 at 1.5 times, an RX 6800 XT, a 144 Hz
display), with real mouse strokes, by `tools/stagecraft/foundry-chalk-perf.mjs` (flags in its header). The bench's
timings had been fine all along; they measured the wrong thing. What felt like lag was:

- **Ink latency.** The paint tip trailed the pointer by 9 pixels at a slow stroke and 20 at a fast one before any display delay
  (the curve runs a segment behind the hand, and the steadying string holds the brush back), and the paint then waited for
  the lit 3D picture: a pointer sample waited a median 13.6 ms for the next of the stage's 60 draws a second, the draw took
  7 to 10 ms of graphics card (p95 14), and the display came after that. The ring round the pointer is a page element that
  follows at 144 Hz, so the ink visibly trailed it, by something like a hand's width at a fast stroke.
- **A heavy stage draw.** 7.2 ms of graphics card at 3840 by 1906 with nothing being painted: film grain 1.3, bloom 2.1,
  shadows 0.6, the scene and its multisampling about 3.3. The browser's graphics process is single-threaded and was the
  bottleneck: uncapped it was 94 per cent busy at 72 draws a second.
- **Hitches.** The first stroke of a session stalled about 100 ms (one 74 ms raster flush on the graphics card, then 36 ms,
  with no slow JavaScript: the card meeting each way of drawing for the first time), and the end of every stroke cost three or
  four draws of 21 to 28 ms (reading its tiles back from the card for the encoder).
- **Not the cause:** chalk's own JavaScript (0.17 ms a sample, 0.12 ms to paint it), the journal write (6 to 19 ms), the
  adventure's interface, Foundry's own canvas (stopped).

**What was done**

1. **Wet ink** (`render/paint/wet.mjs`, `core/wet.mjs`, `render/paint/stamp.mjs`). A stroke being painted is drawn on plain 2D
   canvases over the stage at the moment the pointer moves, and the browser shows them in its next refresh whatever the 3D
   picture is doing. It is the wall's own paint (the same stamping code, the same tips and spray specks, the wall's grain sitting
   still on the wall, held to the chalk zones, a little under white as the 3D picture shows it) plus a short **tail** from the
   last dab to the pointer, so the paint reaches the hand. The wall's tiles are not recomposited or uploaded while the stroke
   is wet (the work that cost the card 2.7 to 4.3 ms a draw); at the end the stroke becomes the wall's paint, and the wet ink
   goes at the first draw that shows it (`ChalkController#afterDraw`), so one takes over from the other without a gap (the
   bench holds them to four pixels). Only the pencil, brush, chalk, magic chalk and spray are wet; the eraser, smudge and
   fill are the wall's business, and the plain 2D picture has none. While it is wet it lies over the cards, magic chalk's glow
   and sparkle appear when the pointer comes up, and it has none of the picture's bloom.
2. **A cheaper stage.** Film grain and the output transform are one pass (they were two full-screen passes), and the bloom is
   worked out at half the size each way (`render/three/post.mjs`). About 3.4 of the 7.2 ms.
3. **Warm-up.** Each tool's stroke is painted once on a scratch wall while the stage loads (`RasterWall#warmUp`), and the wet
   ink warms its own ways of drawing when chalk is first taken, so the graphics card has built what it needs before the first real stroke.
4. **Keeping waits for a pause** (`core/quiet.mjs`). A stroke's tiles are snapshotted at once, but read back and encoded
   (and written to the journal) when the hand has been still for 450 ms, at the latest 2.5 s on; Ctrl+Z, putting the chalk
   away and leaving the page do not wait. The others are told at once, when the pointer comes up, which layers to wait for
   (and again if a layer turns out to have changed nothing), and a live stroke is let go after 8 s, not 5.
5. **Small things.** The stage's place on the page is kept instead of asked for at every pointer move (the browser worked out the
   page's layout each time).

**Not done, on purpose.** The dab spacing was left alone: the chalk's look is hers, and a wider spacing changes it. The eraser,
smudge and fill are not wet.

**Proved:** `module/stagecraft/test/{quiet,wet,chalk-controller}.test.mjs`; `tools/stagecraft/bench/chalk-check.mjs` (56
checks: the wet ink is there the moment the pointer moves, the wall's tiles do not show it yet, it reaches the pointer, it is held
to the zone, it lines up with the wall's paint, it is gone when the wall shows it, a stroke is kept only after the pause, a
quick doodle ends up whole); the live check in the real Foundry. **Not yet measured:** the before and after timings, because the
graphics card was held at about 99 per cent by a game while this was built. Run `node tools/stagecraft/foundry-chalk-perf.mjs
--trace` on a free card (and `--breakdown` for the stage's draw) to put numbers beside the ones above.
