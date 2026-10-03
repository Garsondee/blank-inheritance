# The box of chalk

*Drafted 2026-10-01 at Ingram's request and **built the same day** in [`module/stagecraft/`](../../module/stagecraft/):
§10 says what exists, what was proved and what is still a plan. Part of [Stagecraft: Puppet Show](README.md). Zones, which
decide where chalk may be used, are in [`stage.md`](stage.md) §8; how it is drawn is in [`renderer.md`](renderer.md) §5; the
module that holds it is in [`module.md`](module.md). The calls in §9 are still hers.*

*Words. A **card** is a person on the stage, a **stick** the handle that appears when a card is picked up, a **zone** a
named area of the picture, and a **mark** a resting place on the floor (`stage.md` §8.10). The **wall** is the painting
itself, which is what chalk is drawn on. A **stick of chalk** is a different thing from a card's stick: it is the chalk.*

---

## 0. In one page

> A box of chalk. Players can grab the chalk and start drawing on the scene. We'll disable this for story scenes which
> are serious (and/or give the GM a button to override it) but I love the idea of players graffitiing the scenes. We
> need this graffiti to persist between sessions.

- **What it is.** A small wooden box of chalk stands on the floor of the stage. A player clicks a stick of chalk (or the
  felt eraser) and draws on the painting with it. Whatever they draw stays there, for everyone, in this session and the
  next.
- **Where it works.** Not everywhere. Every scene says whether chalk is **off**, allowed only in **zones** (a chalk wall,
  a pavement, a shutter), or allowed **anywhere**. Serious story scenes are off, and then there is no box at all. The GM
  can override any of it live with one button.
- **What it leaves.** Strokes, saved with who drew them and when, so the GM can see whose they are, undo them, or wipe
  the wall. They are kept in the world, not in anyone's browser, so they survive a reload, a session and a server
  restart.
- **What it feels like.** A stick of chalk on the pointer, a fine line with a solid core and a slightly rough, slightly
  fuzzy edge, in six colours. A small thing that is fun to do and fun to find.

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
   upright in it, like pencils, and a felt eraser at one end. In a scene where it is not, there is no box. Nothing about
   the box is drawn in a serious scene, so nothing needs hiding. Its place is the scene's `chalk.box` (a spot on the
   painting); it must be somewhere a click can reach: in front of any counter that would hide it, clear of the cards and
   of the interface (§10, "Findings").
2. **Take a stick.** Click a stick (or the eraser). The pointer becomes that stick, leaning like everything else on the
   stage, and the box can be left alone. Click another stick to change, click the same one again to put it back.
3. **Draw.** Press and drag on the painting. A chalk line follows. Where chalk is allowed only in a zone, the line stops
   cleanly at the zone's edge rather than being refused with a message. A tap leaves a dot.
4. **Rub out.** The felt eraser removes the strokes under it. A player rubs out **their own** chalk; a GM rubs out anyone's.
   A line cut in the middle becomes two lines.
5. **Put it back.** Escape, a right click, or the same stick again. (Letting go of the pointer does not put the chalk
   away: a player draws several lines with one stick, which is the point.)

Everyone else sees the line appear when the drawer lets go, a moment later (§10). Nobody has to confirm anything.

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

### 4.1 A stroke

A stroke is the smallest thing chalk leaves. It carries exactly these fields and nothing else (a test fails if it
grows):

| Field | Meaning |
|---|---|
| `id` | A unique id, made by the drawer's browser, so a stroke is the same stroke everywhere. A stroke cut by the eraser becomes `id.1`, `id.2` |
| `scene` | The scene it belongs to |
| `by` | The user who drew it, for the GM and for undo. Pieces of a cut stroke keep the original drawer |
| `at` | When (a world timestamp), for ordering and for weathering (§7) |
| `colour` | One of white, yellow, pink, blue, green, orange |
| `size` | A stick's width: thin, medium, thick |
| `p` | The line, as flat integers `[x0, y0, x1, y1, ...]` in **thousandths of the painting**, so it sits on the art at any screen size and in either renderer |

Rubbing out is not a stroke: it removes strokes (or splits them), so the wall is always exactly the list of strokes kept.
Points are simplified (nearly collinear points dropped) and quantised, so a long squiggle is a few dozen numbers. A
stroke is capped at 400 points and a scene at 800 strokes.

### 4.2 Where strokes are kept

The requirement is that they persist between sessions, are shared, can be drawn by any player without a GM being the one
to save, and can be moderated by the GM. The answer is the notebook's own pattern (`design/notebook.md`):

> **One world journal entry, "Stagecraft chalk", default ownership Owner, with one page per scene and drawer, holding
> that drawer's strokes for that scene.** Players write only their own pages (by convention: Foundry's ownership cannot
> restrict a page to its author), so two people drawing at once never overwrite each other. Every client reads all the
> pages of the scene and merges them. The GM can delete or edit any page, and deleting the entry clears every wall.

A GM's client makes the entry the first time a scene in the world allows chalk (at login, or the moment a scene is flagged
for chalk or opened from the GM's strip), and repairs its ownership at every GM login; a world that never uses chalk never
gets one, and a player's client never has to. **When a scene is deleted its chalk pages go with it.** A page holds at most 40 strokes, then the drawer's next stroke starts another
page, so one update stays small. All writes by one client go through a single queue, so two strokes drawn a moment apart
never read the same old page and lose one.

The entry is **hidden from the Journal list for players** (a GM sees it): its pages are named after scenes and hold
nothing a person can read, and the table should not meet it.

Why not the alternatives:

| Option | Against |
|---|---|
| Scene flags | Only a GM can write them, so a stroke could not be saved if the GM's browser were closed or busy, and every stroke would rewrite the scene document that everyone is also using |
| Each user's own flags | Works (a player may update their own user), and has the same size problem, but spreads one scene's wall across six documents with no natural way for the GM to see or tidy it, and the strokes vanish with the user |
| A raster image uploaded to the server | Players cannot upload by default, a GM would have to be the one to save it, and strokes could no longer be attributed or undone one at a time |
| Only the live socket | Nothing persists |

**Proved live (§10):** a player (not a GM) can create and edit pages in the Owner-default entry; a late joiner (and a
reload) sees everything; two drawers' lines end up on separate pages.

### 4.3 When the wall gets full

Past 800 strokes in a scene the oldest are **forgotten** as the next line is saved, so a long campaign never grows a wall
without bound. (The plan was to bake the oldest into a picture first, so the wall would look the same; that needs an
upload and is not built. A wall that reaches the cap is a wall that has been chalked on for a very long time.)

---

## 5. How it is drawn

- **On the wall.** Chalk is drawn on two canvases laid just in front of the painting and behind every card: one holds the
  strokes that are kept, the other only the line being drawn right now, so a crowded wall costs nothing extra while
  someone draws. Cards stand in front of graffiti; graffiti never covers a face.
- **The look.** Her note, once she had seen it drawn: "Chalk should be tighter, less fuzzy and smaller by default (35%
  smaller). Solid core, slightly fuzzy outside." So a line is a **solid core** (96% opaque, the stick's own width), a
  **soft edge** a quarter wider and only a third as strong, and a **faint dusting** a half wider again that is barely
  there, with a brighter line down the middle. Short streaks are bitten out along the way the chalk was dragged, but only
  at the edge, so the wall shows through the fuzz and never through the core. All three widths are 35% under what they
  first were (a medium line is about four pixels on a full size wall, not six). The numbers are `LOOK` and `SIZES` in
  `core/chalk.mjs`, and a test holds them to the description above. The grain is seeded by the stroke's id, so it is the
  same on every screen and every time it is redrawn. The layer is a little under full white: chalk on a dim wall is not a lamp.
- **The box.** Upright sticks in a low tray, so each is a tall thin target side by side. Each stick has an invisible shape
  two or three times its width that a click can hit (tested with real three.js, no browser needed), because the box is a
  small prop in a deep room.
- **Not yet.** Dust that falls from the point of the stick; chalk lit by the room's lamps (today it is flat, just dimmed);
  the stick leaning to the pointer's speed is built, its scratch is not.
- **The flat renderer.** The same strokes drawn on a 2D canvas over the picture. Same data, no lights. Not built (there is
  no flat backend yet).
- **Calm mode.** No dust, no scratch, no shimmer; the strokes are exactly the same.

---

## 6. The GM's tools

A strip along the top of the stage, under the clock, for the GM only. Every button writes either the scene's flags or the
chalk journal, which Foundry sends to everyone, so each does the same on every screen.

| Button | Does | Built |
|---|---|---|
| **Chalk** | Goes round: as the scene says, off, zones only, anywhere (§3) | Yes |
| **Freeze** | Keeps what is there, takes the chalk away | Yes |
| **Undo** | Removes the newest stroke on the wall, whoever drew it | Yes |
| **Wipe** | Asks, then removes every stroke from this scene | Yes (no undo for a minute yet) |
| **Hide wall** | Puts the drawings out of sight for everyone (a serious beat in a scene that has some) without deleting them | Yes |
| **Wipe a player's** | Removes everything one person drew here | Store call built (`wipe(scene, { by })`), no button |
| **Who drew that?** | Hovering a stroke shows the drawer's name to the GM only | Not built |

Every stroke is attributed, and the GM can always wipe; those two together are the whole moderation story for a table of
friends.

---

## 7. Fun that costs little

Listed so they are not forgotten; each is optional and hers to pick.

- **Weathering.** Outdoors, rain washes chalk slowly; indoors it lasts. A scene sets `chalk.weather` and old strokes fade
  as in-world days pass. (The scene field is read; nothing fades yet.)
- **Characters notice.** An NPC can react to what is on the wall. The hook `stagecraft.chalk` is raised on the drawer's
  screen with the stroke and its bounding box, so the adventure can say "Taka squints at the doodle". **Built.**
- **Dust and a scratch.** A puff of dust at the point while drawing, and a quiet scratching sound. Cheap and lovely.
- **The wall remembers on the map.** A small chalk mark on the Campaign Map's place for a haunt, so the place looks lived in.
- **Hopscotch.** Chalk on the floor, in perspective, so a player can draw a grid a card can then stand on. (Needs the
  floor as a second drawing surface; later.)
- **A message to the next group.** A scene the party returns to has the old messages; a tally of who has been.
- **Photographs.** A photo zone that takes a picture of the stage includes the wall, because it is part of the stage.

---

## 8. Tests

**Pure and adapter tests**, in `module/stagecraft/test/`, run by `node --test`:

- `chalk.test.mjs`: stroke simplification, quantisation and the caps; validation; merging many authors' pages in a stable
  order; the policy (off, zones, anywhere, freeze, the GM's override) for a point inside and outside a zone; the line
  clipped at a zone's edge; rubbing out, splitting and who may rub whose; the full wall forgetting its oldest strokes; a
  **leak test** that a stroke carries nothing beyond its seven fields.
- `chalk-store.test.mjs`: the store against a stand-in for Foundry's journal. Entry made once (two asks at once make one),
  owned by everyone, by a GM only, and only where a scene allows chalk; a deleted scene's pages are cleared by a GM's client;
  a first stroke makes the drawer's page, a full page starts the next; **writes in a moment's succession are all
  kept**; one failed write does not stop the rest; many drawers merge in order; remove and wipe; the right listeners hear
  the right changes; a disposed store leaves no hooks.
- `chalk-controller.test.mjs`: the controller on that store with a recording backend. The box shows only where chalk may
  be used; the GM's override opens and closes a scene at once; freezing; taking and putting away; a line is on the wall at
  once and in the journal a moment later; clipping at zones; other people's chalk arrives; **another person's chalk
  arriving while yours is being saved does not make yours flicker**; rubbing; a failed save takes the line off again; the
  cap; a rebuilt picture redraws the wall; the journal arriving late turns the box on.
- `chalk-box.test.mjs`: with real three.js, a ray at the middle of every stick and the eraser picks that one; a hand's
  width either side still does; nothing else does; the hit shapes are never drawn; neighbours do not overlap.
- `journal-tidy.test.mjs`, `lang.test.mjs` (every word exists and the language file survives Foundry's way of reading it).

**The live check**, `tools/stagecraft/foundry-check.mjs`, in the local Foundry with a real graphics card and **real mouse
events**, as a GM and as a real second player in a separate browser (§10).

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

---

## 10. What exists, what was proved, what was found

*Written 2026-10-01 after the first live runs.*

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
6. **The adventure's closed Scene Runner swallows clicks.** `#bi-scene-runner` is an empty, invisible box, 826 by 744
   pixels at the top left, with `pointer-events: auto`, so a real click anywhere in that area reaches neither Stagecraft
   nor Foundry's own canvas (verified on a plain scene). That is the adventure's CSS, not this module's; a task to fix it
   was raised. The test scene keeps its chalk zone clear of it until it is fixed.
7. **Players can write pages of other players' in an Owner-default entry**: Foundry's page ownership inherits from the
   entry, so "players write only their own pages" is a convention the module keeps (a player's eraser touches only their own
   strokes), not a rule Foundry enforces. Nothing secret is kept there, by design.

**Not built yet.** Dust and scratch; lighting on the wall; weathering; baking the oldest strokes; "Wipe a player's" and
"who drew that" in the strip; the flat renderer; live streaming of a line as it is drawn (a stroke shows to others when the
drawer lets go).
