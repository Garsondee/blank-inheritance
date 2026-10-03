# Cards in a diorama

*Drafted 2026-10-01, the same evening as [`stage.md`](stage.md), at Ingram's request after the first puppet
mockups. **A plan, not a decision**: nothing here is built in the module, and §14 lists the calls that are hers. The
mockups are plates 13 to 37 in [`lab/`](lab/) (§15), plus an animation. This document is
how the stage **looks**; [`stage.md`](stage.md) is what it **does**, and [`ledger.md`](ledger.md) lists every idea in both.
Section 11 here says how each older system (debuts, the wings, formations, magnets, puppets, zones, the blueprint)
works on the 3D floor.*

---

## 0. In one page

**They are cards.** Ingram's word, and from now on the only word for the people standing in a scene. (It also frees
"Frame" for the machines, which the old "character frame" never did.)

**The idea: every scene is a diorama.** The painting stays exactly as she made it, but it gains a floor, a horizon and
a camera that match its own perspective. Cards stand on that floor in real 3D, like stand-up cut-outs in a toy theatre:

- **They stand somewhere.** A card behind the bar is hidden by the bar, because the bar is cut from the painting and
  set at its own depth. A card in the bath is under the water to the chest. A card at the back of the room is smaller
  and a little hazier than one at the front.
- **They face someone.** Cards turn and lean in 3D: two leaning in conspiratorially, a ring round a card table, a back
  turned on someone. Every pose obeys the theatre's oldest blocking rule, **cheat out**: turn towards the person
  you're talking to, but never so far that the table loses your face.
- **The room lights them.** The painting's own lamps, windows and fires light the cards: a warm wash on the side that
  faces a lantern, a rim of light when a lamp is behind, a sheen on the glass as a card turns, a shadow on the floor
  thrown away from the light, and the room's colour laid over every portrait so it belongs to the place.
- **The air touches them.** Dust shows only where light falls; smoke and steam part round them; sparks bounce off
  their tops; snow and blossom settle on them; rain splashes off them.
- **They are alive when nobody touches them.** Each character has a demeanour (calm, nervous, proud, slouching,
  bouncy, sly) that sets how they breathe, sway and fidget, and everyone glances at whoever is speaking.
- **They have emotes.** Twenty-four symbols from manga's own vocabulary (the sweat drop, the popping vein, gloom
  lines, the lightbulb), drawn in the campaign's print style, popped from a wheel on your own card.
- **They can track a challenge.** A path of slots across the floor (an obstacle course, a climb, a chase), a sign over
  each station, and everyone's card standing on how far they've got.

**Nothing from the first stage plan is lost.** Debuts, the party's cards in the wings, formations and magnets,
puppets, dashed zones that lead to subscenes, fights in zones and the blueprint minimap all still exist; §11 says how
each one works once the stage is a painting with a floor, and plates 31 to 37 draw them.

**The engine** that makes this easy to set up is small: per painting, three numbers (horizon, floor, depth) and a card
size, then shapes traced on the painting (a counter's edge, a table, a cut-out, a track) and lights put where lamps are
painted. Poses, light, shadows, life and air all follow from that.

---

## 1. The brief, in Ingram's words

> "What about having them at different angles, like leaning in conspiratorially, or like they are around a bar or
> things like that? We could get a huge amount of fun from how we allow cards to be positioned within a scene and what
> we add to their character by having them animated in a specific way. Ask yourself what is the fun, unique 3D and
> consistent way to show the player cards in this scene, then we create an engine that makes setting up and making these
> things easy. You could even throw in lighting and particle effects which interact with the cards. And that's what we
> should just be calling them. I'm giving you full license to rethink the visuals to create something very pretty but
> also easy to understand visually (aiding the story telling and helping to put people in the scene) the scene. Even if
> players never touch their character cards to move them it should be fun to watch and if the players grab them it
> gives them lots of fun options to do to help story tell. We give the cards access to emojis which you'll make with
> characterful graphics which help to fit into the overall art style. We can even use the system to allow players to
> track their position within a physical challenge for example so they have slots they can move their characters to
> which help the whole group track the progress of a task. Now that you understand the general line of my thoughts could
> you continue them further. Keep enhancing your working mockups that is the best way, produce lots of mockups to show
> off the sort of things I'm asking for and I'll check them tomorrow."

**A name clash, flagged:** the info popup a card opens today is called the **Character Card**
([`npc-social-intel.md`](../npc-social-intel.md)). With "card" now meaning the person in the scene, the popup needs a
new name. A suggestion: **their file** (the Directorate keeps a file on everyone). Her call (§14).

---

## 2. The answer: a diorama

*Ask yourself what is the fun, unique 3D and consistent way to show the player cards in this scene.*

### 2.1 Why a diorama

- **It is what the art already is.** Every scene is a painted backdrop; a toy theatre, a shop-window diorama and
  street paper theatre are all painted backdrops with stand-up figures in front of them. Nothing about her art changes.
- **It is consistent by construction.** One camera rule, one floor, one blocking rule, in every scene. A card that
  leans in at the Paper Lantern leans in the same way at the bathhouse.
- **It is 3D without being a 3D game.** No models, no rigging: flat cards, CSS 3D transforms, a few canvases for light
  and air. Cards stay crisp portraits, readable at a glance. *(Revisited 2026-10-01: [`renderer.md`](renderer.md)
  proposes drawing this same diorama with three.js. The cards stay standees and the rule against models and rigging
  stays; only the "no engine" changes, and `renderer.md` §2 says why.)*
- **It is the campaign's own voice.** Brass, paper, stamps, typed labels: a card with a brass back and a typed name
  belongs to the same world as the deck and the Papers.
- **It puts people in the scene.** Standing *behind* the bar, *in* the bath, *under* the lamp, *in* the snow: depth,
  light and air are what make a portrait stop floating in front of a picture.

### 2.2 The camera

Three numbers per painting, marked on the painting itself:

| Number | What it is | How it's set |
|---|---|---|
| **Horizon** | the painting's eye level | drag one line onto it |
| **Floor** | where the floor would meet the front of the picture | drag until the ghost cards (§10) stand right |
| **Depth** | how strong the perspective is | the same |

From them, a CSS perspective whose vanishing point sits on the painting's horizon. A card placed on the floor at any
point shrinks with distance, sorts in depth and turns in real 3D (`diorama.mjs`: `makeCamera`, `project`,
`unprojectFloor`). Any point marked on the painting can be put onto the floor, so authoring is drawing on the picture.

### 2.3 Cards are standees, not people

Found in the first mockup: at true person scale, cards near the front of a painting are enormous and hide the place.
So cards have a **card size** per painting (about 0.7 to 1.1 of a person), which keeps the room visible and the cards
in proportion with each other.

### 2.4 The deck is the front of the stage

Found in the second batch: the deck covers the bottom of every player's screen, and most paintings put their floor
right there, so the front row stood with its nameplates behind the deck. Three rules fix it, and they are the engine's
job, not the author's:

- **The floor ends at the deck's top edge**, the way a stage ends at its lip, crown and all (`deckLip`).
- **The painting lifts clear** of the deck by a few dozen pixels (one more number on the rig, "clear deck"). The strip
  this leaves along the very bottom is filled by the **apron**: the painting's own floor, mirrored and dimmed. Only its
  ends show, either side of the deck.
- **A card asked to stand behind the deck is walked back** along the floor until its foot shows (`clearDeck`), and the
  rig says so out loud, because it means the scene asked for a place the screen can't give.

---

## 3. Blocking in 3D: poses

### 3.1 Facing, and cheating out

A card faces whoever it is attending to, then **cheats out**: it keeps a share of that turn (about 60%) and never turns
more than about 55° from the viewer, so its face is always seen (`cheatOut`). Someone ordering at a bar at the back
of the room turns three-quarters, as a stage actor would. A pose can break the rule on purpose: **turning your back**
on someone shows the card's brass back.

### 3.2 Set pieces

Shapes traced on the painting and put onto its floor:

| Set piece | What it offers | Example |
|---|---|---|
| **Counter** | a row of places along its edge, facing it | the Paper Lantern's bar (plate 13) |
| **Table** | places round it, the near side left open (never turn your back on the house) | the card game (plate 14) |
| **Bench** | places along it, facing out | a waiting room |
| **Door** | a place in the doorway; a zone (stagecraft §8) | the noren at the Paper Lantern |
| **Track** | a path of slots with signs (§8) | the obstacle course (plate 17) |
| **Cut-out** | furniture lifted from the painting and set at its depth, so cards can stand behind it | the bar, the table top, the bath's water (plates 13 to 15) |
| **Something to stand on** | a stool, a crate, a step: a card stands at its depth, raised to its top (`standOnLift`) | Petr singing on a stool (plate 18), the photograph on the steps (plate 27) |

**Risers.** Found in the Crew Mess: a bar is far taller than a portrait's chin, so the chief behind it vanished. A card
standing behind a cut-out that reaches the floor is now raised, on a box nobody sees, until no more than about half of
it is hidden (`riserFor`), the way a theatre puts a box behind its bar. A band across the middle, like a table top over
a lap, is left to hide what it hides.

### 3.3 Poses

One press each for the GM (the stage bar of stagecraft §7), each built from set pieces:

| Pose | What it looks like | Tells the table |
|---|---|---|
| **At the bar** | a row at the counter, turned to it, cheated out; the keeper behind it | a night out |
| **Round the table** | a ring, the near side open | a game, a meeting, a meal |
| **Huddle** | two to four cards close, turned in, tops tipped together | a secret (plate 13's end of the bar, plate 14 by the coats) |
| **Standoff** | two sides across a gap, leaning back a little | trouble |
| **Gang-up** | a ring closing on one card, leaning in | a pile-on (stagecraft §5.4, now in 3D) |
| **Audience** | everyone facing one card | a speech, a hearing |
| **Cold shoulder** | one card's back turned on another | a snub |
| **Line-up** | facing the table, in a row | a roll call, a parade |
| **Conversation** | two speakers either side of a gap, turned to each other; listeners a band back, dimmed; the party in an arc facing them | a talk the table is part of (stagecraft §5.3, plate 34) |
| **Panel** | officials in a shallow arc behind a long table, facing the party | a hearing, a board, a counter (stagecraft §5.2) |

Stagecraft's five formations (Line, Talk, Gang-up, Panel, Split) are five of these poses; §11.4 gives the mapping.

### 3.4 Moving

A card going from one place to another **steps** like a paper doll (a little lift and rock per step, `stepAlong`)
rather than sliding, a card can **hop** on the spot, and a card can **turn round** with a quick half-turn and a little
hop (Masaru turning from the bar when the food arrives, in the animation). That is Ingram's "jump between positions",
and it is what the GM's formation buttons and a player's drag both use.

---

## 4. Light that touches the cards

Lights belong to the painting: one goes wherever a lamp, lantern, window, fire or arc is painted (`lightCard`).
Plate 21 is the proof: the same two cards under three lights, and they look like three different rooms.

- **The wash:** the side of a card that faces a light takes its colour (warm under lanterns, cold under work lamps).
  A lamp straight overhead is neither in front nor behind: it grazes the face from the top, so crowns go bright.
- **The shade:** the far side of the face falls into shadow, deeper when the light is strong against a dim room and
  deepest under a hard light like a work lamp.
- **The rim:** a light behind a card outlines its edges (both edges when it is straight behind) and darkens the face,
  which is what makes a figure stand off a bright window.
- **The sheen:** the glass catches the strongest light, but only a light in front of it, and the highlight slides as
  the card turns. (Found in the light studies: a sheen from a light behind washed backlit cards grey.)
- **Brightness:** cards near light are brighter than cards in the dark corner, with a floor under the dark: a room
  can be moody, but a face must stay readable (found drawing the hospital ward, plate 35, whose cards were hard to
  tell apart).
- **Shadows:** each card throws one along the floor, away from its strongest light: short under a hanging lamp, long
  from a window. A soft contact shadow grounds it where it stands.
- **Pools, cones and shafts:** a hanging lamp lights a pool on the floor and a cone in the air; a window throws shafts.
  The cut-outs carry this light too (found in the card game: a table cut from the painting hid the lamp's cone and pool
  and showed as a dark patch), so a cut-out is drawn with the room's light already on it.
- **Flicker:** lanterns breathe, a fire gutters, a welding arc stutters, and the cards' light moves with them.
- **The room's colour:** a tint laid over every card in a scene (warm in the izakaya, teal-grey in the card room, cold
  at the shrine at night), so a portrait belongs to the painting it stands in.
- **Haze:** a card further away takes a little of the room's air.

**Time of day** (the staging doc's batch 3) drives the same model: evening warms the window light, night swaps it for
the lamps.

---

## 5. Air: particles that touch the cards

Stepped from a seed at a fixed rate, so a screenshot or a replay is exact (`stepParticles`).

| Air | Where | Touches the cards by |
|---|---|---|
| **Dust** | everywhere, but seen only where light falls | glinting in a lamp's cone, a window's shaft |
| **Smoke** | a grill, a pipe, a cigarette | parting round a card |
| **Steam** | a bath, a kitchen | parting round cards standing in it |
| **Sparks** | a weld, a grinder, a fire | bouncing off the floor, and ricocheting off a card's face with a glint |
| **Petals** | the shrine in spring | drifting, and coming to rest on card tops |
| **Snow** | outside at night | falling in front of and behind cards, and building into a white cap along their tops |
| **Rain** | a street, a roof | splashing off card tops and the floor; on a wet floor every card stands in its own reflection |

Two findings: **a snow cap is drawn, not simulated** (the few flakes that really land on a card in a minute never read,
so the cap starts as deep as the snow has been falling and grows as flakes land); and **a hot source wants a core** (a
welder's sparks read as sparkles until there is a white point they come from).

---

## 6. Life: worth watching untouched

*Even if players never touch their character cards to move them it should be fun to watch.*

| Demeanour | How it idles | Suits |
|---|---|---|
| **Calm** | slow breath, little sway | most people |
| **Nervous** | quick breath, small shivers, a fidget now and then | a new recruit, anyone with a secret |
| **Proud** | upright, leaning back, barely moving | officers, chiefs, the keeper of a place |
| **Slouch** | sagging, a slow sway | the tired, the bored, the night shift |
| **Bouncy** | bobbing, little hops | the young, the musical |
| **Sly** | leaning in, glancing about | dealers, gossips, fixers |

A player can **choose their own card's demeanour**: one more small way to say who their character is. NPCs get theirs
in the scene.

Also always on:

- **Attention:** everyone glances, a few degrees, at whoever is speaking, and the speaker's card glows warm. The
  Runner already knows who is speaking.
- **Reactions to the game:** a critical success makes a card jump for joy (a hop and sparkles), a critical failure
  makes it slump (a sweat drop). A Hero Point sparkles. An NPC's attitude moving up or down shows as a heart or a
  popping vein. Cheap to build, and it puts the rules on the stage.
- **Conditions you can see** (*plate 30*): sf2e already tracks every condition (ux-doctrine §11), so the card only
  has to show it. **Prone** and **dying** lie down (dying greyed, with a slow red pulse on the floor), **frightened**
  trembles, **fatigued** sags, **off-guard** wobbles off balance, **stunned** reels, and a **hidden** enemy is a
  dashed ghost: you know the space, not the creature. A small plaque carries what matters from the rules: the value
  as pips and one line ("−2 to every check and DC", "DC 11 flat check to target it").

---

## 7. Emotes

*Plate 16 is the full set; plates 13 to 20 use them in scenes; plate 24 is the wheel.*

- **The style:** manga's own symbols, which the table already reads at a glance, drawn in the campaign's print voice:
  an ink line, flat colour from the palette, a cream sticker edge so they read on any picture, and an ink shadow
  printed a touch out of register like a 1950s magazine (`emotes.mjs`).
- **The set (24):** surprise, question, what?!, sweat, anger (the popping vein), sparkle, fond (a heart), humming,
  asleep, gloom, idea, fuming, dizzy, the awkward "…", laughing, shiver, tears, blush, psst, thinking, doomed (a little
  skull), well done (a star), hand up, and hungry (a steaming bowl).
- **Each has a motion:** a sweat drop drips, a vein pulses, hearts and notes float up, gloom lines fall, a bulb
  flickers on, a spiral spins. Each pops on with a little overshoot and lasts a few seconds.
- **The wheel:** right-click (or hold E on) your own card and eight emotes ring it; one more click and the table sees
  it. Each player picks their own eight.
- **The GM** can pop an emote on any card, and **on the scenery** (the cat asleep on the radiator, plate 14).
- **Sync:** one small message per emote, the same channel as the puppets (stagecraft §6.5).
- **The raised hand** (stagecraft §4.3) becomes the "hand up" emote, held until lowered.

### 7.1 What passes between cards

*Plate 25.* Some things happen between two people, so they are drawn between two cards, flat over the scene:

- **A glare:** a crackling bolt eye to eye, with a burst where it meets, for a rivalry or a standoff (Petr and his
  petition against the new machines, Ren who thinks they are the best thing that ever happened to the dock). It holds
  for as long as either card keeps it up.
- **A whisper:** a dotted arc from one card's mouth to another's ear, with the psst riding along it. Pass a rumour on
  and it hops again: the rumour mill, made visible.
- **A look:** a dashed sightline with an eye at the watcher's end, for who is watching whom (Tomoe, keeping an eye on
  the trouble). The GM can show it, or keep it to themselves.

A player starts one from their own card's wheel (a second ring, "at someone"); the GM can start any.

---

## 8. Tracks: physical challenges you can see

*Plate 17. "Use the system to allow players to track their position within a physical challenge."*

- **A track** is a path of slots across the floor of a scene: an obstacle course, a climb up a sea wall, a crossing
  of the flooded chamber on its pipes, a chase across rooftops. Slots can climb (a slot can have height), so a ladder
  is a track too.
- **Each station has a sign**: the obstacle, the skill and the DC. Stations the party has cleared fade.
- **Each player moves their own card** to the next slot when they clear a station, so the whole table sees who is
  ahead, who is stuck and who needs help. A shared task can use one group card instead.
- **It is SF2E's own victory-point subsystem made physical** (GM Core; `data/schema/subsystem.schema.json`):
  thresholds become stations, obstacles become signs, and a chase's pursuer is a rival card on its own track.
- **A readout** for the GM: each card's progress and the victory points against the total, with the clock if one runs.

---

### 8.1 Moments

Two things the diorama can do that a stage of flat cards could not:

- **The photograph** (*plate 27*). The GM calls a photograph: the deck steps aside, everyone turns to the lens, and the
  cards fall into rows (standing on painted steps, benches or a wall). A flash, and a second later the print slides
  out, sepia and a little crooked, with a caption in pencil, and **files itself in Papers** like any handout
  ([`handouts.md`](../handouts.md)): kept for the rest of the campaign, openable by everyone in it. Emotes are part of
  the picture. A first day, a farewell, a win: the campaign's own album.
- **The split stage** (*plate 28*). When the group is in two places at once (two haunts on one night, a party that
  splits up to explore, stagecraft §8), the stage splits like a manga page: each panel is its own diorama with its own
  light and people, and the gutter slides across to give the wider panel to whoever the GM is talking to.

## 9. The card itself

*Plate 22.*

- **The face:** the portrait in its brass moulding and the nameplate, as today; the room's light laid over it, and the
  art undimmed (the lighting does the dimming now).
- **Thickness:** a brass edge either side, seen when it turns.
- **The back:** brass, rivets and a typed label with the name.
- **The foot:** a small brass stand; a player's carries their colour in enamel.
- **The handle:** appears when a card is hovered or held (stagecraft §6); held, a card lifts off its foot.
- **The keys** hide in the diorama and appear when you hover your own card: the scene is a picture first.

---

## 10. Setting a scene up

*Plate 23. "Create an engine that makes setting up and making these things easy."*

The rig belongs to the **painting**, not the scene, so every scene that uses the Paper Lantern gets it for free:

1. **Drag the horizon** onto the painting's eye level. The floor grid appears.
2. **Drag floor and depth** until two ghost cards, one near and one far, look right standing there.
3. **Set clear-deck**: how far the painting is lifted so its floor clears the deck (§2.4). The deck shows on the
   rig as a hatched keep-clear zone, and nothing is ever placed behind it.
4. **Trace the set pieces:** the counter's edge, the table, a cut-out round furniture cards should stand behind, a
   stool or a step a card can stand on.
5. **Mark the zones** a scene will use (a door, a window, a stretch of floor): points on the picture, a name and a
   kind (§11.7). These belong to the scene, not the painting.
6. **Put lights where lamps are painted**; their reach shows on the floor.
7. **Paint the air:** smoke at the grill, dust everywhere, steam over the bath.

Claude drafts a rig for every painting from the image (this evening's mockups were drafted exactly this way, by
measuring each painting on a grid), and Ingram adjusts it with the sliders. A scene then only adds what is its own:
who is there, in which pose, with which emotes, and any track.

---

## 11. Every earlier system, on the diorama floor

*Plates 31 to 37. [`ledger.md`](ledger.md) lists every idea Ingram has had for the stage; this section
says how each one works now that the stage is a painting with a floor, a camera and light. **None of them is dropped.**
Where the two documents disagree, this section decides, and says so. The first plates (01 to 12) showed the same
ideas on a flat picture; they stay as **flat mode** (§11.10).*

### 11.1 The stage grid becomes the floor

Stagecraft §5.1 proposed a grid: columns across the stage and three depth rows. On the diorama **the floor is the
grid.**

- A **place** is a point on the floor. The three rows become three **depth bands** of it: the front band (the
  party, and anyone face to face with them), the middle band (people), the back band (upstage, smaller and hazier
  because it really is further away, standing in the gaps). Columns are evenly spaced across each band in the floor's
  own units, so they close up with distance, as they do on a real stage.
- A card's position is stored as **where its foot appears in the painting** (two fractions), so it survives any
  screen size; the camera turns that into a floor point. Set pieces (a counter, a table, a bench, a stool) add named
  places beyond the grid, and a drop snaps to the nearest free place of either kind.
- The deck's lip, the apron and the risers (§2.4, §3.2) are rules of the floor too: no place is ever behind the deck.
- Card size is set per painting (§2.3), not "9% of the window".

### 11.2 Debuts (plate 37)

- The **marks** are four brass corners drawn on the floor, in perspective, where the card will stand. The **pool** is
  a real pool of light on the floor, the same kind a lamp makes. The **entry** happens in the room: a drop falls from
  above with a speed trail and its shadow growing on the floor; an unfold stands up from lying flat; a slide comes
  in along the floor; a swing hangs from above. The **reveal** (blinds, iris, raster, develop, wipe, shutters) plays
  on the portrait as before: plate 37 catches an iris half open. **Motes** are particles, lit by the pool.
- The **name caption** stands beside the card as a flat overlay, on the side with room and never over a face
  (stagecraft §3.4); a group caption sits above the row.
- Families, seeds, no repeats, ensembles and the calm version (stagecraft §3.5–3.6) are unchanged. They choose
  *what* plays; the diorama only changes where it is drawn.

### 11.3 The wings (plate 33)

- The wings belong to the **screen**, not the painting: two racks either side of the deck, in the bands it leaves
  free, each holding up to three cards at half size with their handles slotted in. A card in the wings is never lit
  like scenery; it is the player's own controls, not part of the room.
- Hover a card in the wings and it grows and shows its keys: a player's own (raise a hand, what I'm doing, notes), a
  teammate's (follow, their page) and, on the GM's screen, any player's (Hero Point, ask to roll, give the floor).
  Badges ride on the card: a numbered raised hand, an activity ("Searching").
- Grab the handle and the card comes out of the rack to the hand; drop it on the floor and it lands in the nearest
  free place, with a hop; drop it back on a rack and it is put away. The player's colour is on the foot and on the
  ring round the grip.
- **Decided (Ingram, 2026-10-01): players always start in a group, in the wings.** It is up to each player to pick
  up their card and move it into the scene. A scene does not place the party; it authors places for NPCs and set
  pieces, and the party's cards wait until their players bring them on.

### 11.4 Formations are poses (plates 34, 36)

| Stagecraft formation (§5.2) | Pose here (§3.3) | In the diorama |
|---|---|---|
| **Line** | Line-up | everyone facing the table in a row; the party in front |
| **Talk** | **Conversation** | the two speakers either side of a gap, turned to each other (cheating out); listeners a band further back, smaller and dimmed; the party in an arc facing them. The speaker is lit, with a glow and three small speaking bars. |
| **Gang-up** | Gang-up | the target front and centre; the crowd in an arc round them, leaning in, overlap allowed (about a third of a card), the tallest straight behind; a heavy vignette for as long as it holds; everyone else pushed to the ends and dimmed |
| **Panel** | **Panel** | officials in a shallow arc behind a long table or counter (a set piece), facing the party: a hearing, a board |
| **Split** | Standoff | two clusters across a gap |

Depth does what the flat version faked: "a row back" now really is further away, smaller, hazier and behind. The
dimming stays, so a listener still reads as a listener in a bright room. **Found while drawing plate 36:** the
target of a gang-up stands front and centre, which is exactly where the deck's orb stands, so this scene raises the
painting further (the rig's "clear deck" number is per painting and can be larger where the blocking needs it).

### 11.5 Magnets, crowds and stacks (plate 35)

- **Places on the floor.** While any card is held, the places show as small ellipses on the floor ("grid dots"), and
  the place under the held card shows its **dashed ghost**: the footprint on the floor and the card's outline
  standing there.
- **Magnets** (stagecraft §5.5) are unchanged in rule: dropping into the same band reorders, dropping from elsewhere
  pushes the run one place towards the nearest gap, a full band refuses and the card springs home. In the diorama the
  neighbour in the way is shown sliding one place over (a cyan ghost and arrow).
- **Stacks** (§5.6) are a few cards fanned in one place, dimmer behind, with a count on the front one and a label in
  small capitals beneath ("Ward Four patients ×3"). Foes stack the same way and the count drops as they fall.
  Whoever speaks steps out of the stack with a hop.

### 11.6 Puppets (plate 33, and `dio-live`)

- The physics, the verbs (hop, nod, bow, shake, turn your back) and the sync are exactly stagecraft §6. In the
  diorama the hand is a point on the floor plus a height (`unprojectFloor`), so a move is still about forty bytes:
  x, z and lift, thirty times a second at most.
- A held card lifts off its foot on its handle, its floor shadow lightens and spreads, and it leans and wobbles as
  before. It is drawn nearer the viewer than the cards standing on the floor, which is what makes it pass in front
  after a bonk. A **bonk** shows brass impact lines where the cards meet.
- "Turn your back" is the brass back the cards already have (§9). The deck is the front edge of the booth: rods
  vanish behind it, and the deck lip stops a drop landing behind it.

### 11.7 Zones (plates 31, 32)

**A zone has two parts: an outline on the painting, and places on the floor.** The table sees the outline; cards
stand on the places.

- For a **door**, **spot** or **exit**, the outline is drawn around the painted thing (a door, a window, an alley
  mouth) and the places are the strip of floor directly in front of it, at the same pitch as everywhere else. For an
  **area** (a fight's cover, a stretch of difficult ground) the outline lies on the floor in perspective and the
  places are inside it. Outlines are authored by marking points on the picture, so they are the same at any screen size.
- **Look** (stagecraft §8.2): a dashed rounded outline with a dark halo so it reads on any picture; the name in the
  display Mincho; a hint under it in small capitals ("Go in · 2 waiting", "Look closer", "Cover", "Difficult
  terrain", "Way out"). The zone a held card is over lights orange and its dashes march, and a ghost shows where
  the card will land.
- **Gates, subscenes and the camera cut** are unchanged (stagecraft §8.1, §8.4–8.5). When a door opens, the docked
  cards step towards it one after another and the camera cuts to the subscene, where they step in from the door.
- **Faint at rest, marks only when a card is held** (stagecraft §8.8, §8.10). A zone's outline is a hairline until it
  matters. Marks are small brass tape ticks lying on the floor in perspective, invisible until a card is picked up; the
  nearest free one lights and shows a translucent ghost card in the pose it would give (angle, lean, lift), and a
  dropped card glides there, turns and settles. On the flat renderer they are the same ticks drawn upright.
- **Tracks** (§8 here) are the fifth kind of zone: a chain of places in order, with a sign at each.
- **Fights.** Area zones are positions. The links between them are drawn as lines labelled ENGAGED, NEAR or FAR, with
  a key at the top of the screen; cover and difficult terrain are tags in SF2E's own terms; foes stack in their zone;
  moving to a near zone on your turn is a Stride.
- **Splitting up.** The default is stagecraft §8.5: one camera cutting between groups, with the "Elsewhere in this
  scene" tray showing who is where. The **split stage** (§8.1, plate 28) shows both groups at once.
  **Decided (Ingram, 2026-10-01): the split stage is an option that can be switched on and off,** easy to swap
  between as often as the table likes, with a clear indicator on screen whenever it is on (a "Split stage" mark by
  the stage bar for the GM, and a small tag in the corner for players). The GM's stage bar gets a **Split stage**
  toggle for it (§11.9). Whether it is on by default is not set; the toggle is the point.

### 11.8 The blueprint (plate 32)

A panel in screen space, top right, collapsible to a compass (stagecraft §9). It is not part of the painting: the room
the party is in is the diorama, and the rest of the building is on the blueprint. Fog, doors, following and where the
drawing comes from are all unchanged. The panel's size is a setting, because it shares the corner with zone labels
(plate 32 makes it smaller so "The Stair" stays readable).

### 11.9 The GM's stage bar (plates 34 to 36)

Unchanged: **Line · Talk · Gang-up · Panel · Split · Stack · Tidy · Lock**, and a count of what is stacked
(stagecraft §7). The diorama adds only what it needs, each a single press: the **split stage toggle** with its indicator (§11.7), the
**photograph** (§8.1), and the scene's **light** and **weather** settings. Everything else the GM does with a card lives on the card itself, on hover.

### 11.10 Flat mode

Plates 01 to 12 show the stage without perspective. **Decided (Ingram, 2026-10-01): keep a very basic fallback.**
It is a **flat mode**: the same data drawn upright in rows on the grid, with no tilt, light or air. It is what a player with reduced motion gets, what a window too small
for the diorama gets, and what a painting without a rig gets until it has one. Because positions are stored as foot
fractions and places, switching modes changes nothing in a scene.

### 11.11 What a scene now carries

The bridge (stagecraft §10) and the Standard (`scene-standard.md`) need only a few more fields to carry the
diorama: a **rig** per painting (horizon, floor, depth, card size, clear-deck, lights, §10), **set pieces** with their
places, the **zones** (outline points, kind, gate, hint), a **track** where there is one, and the **air**. Everything
else a scene already authors for the stage (blocking, captions, the blueprint, prepared moves) is unchanged.

## 12. Cost and safety

- **Cheap to draw:** flat cards with CSS 3D transforms (the browser's compositor does the work), three canvases for
  light and air, and particles capped per scene. To measure in Foundry, on a slower machine than Ingram's. (The costs
  of the three.js version, measured on a real graphics card and with none, are in [`renderer.md`](renderer.md) §9.)
- **The calm version:** for anyone who chose reduced motion: no idle sway, no particles, no flicker; cards still turn
  and stand in the light.
- **No flashing:** flicker is a few percent on lanterns. The welding arc in plate 20 stutters quickly by design; the
  build caps its amplitude so nothing crosses the three-flashes-a-second rule (the same check as the opening titles).
  The photograph's flash is a soft fade, not a white frame.
- **Cut-outs are redrawn** when their light changes (a flickering lantern), one canvas per cut-out: cheap, but one more
  thing to measure.

---

## 13. Build order

This slots into stage.md §12's phases (and `renderer.md` §10's phase 0b comes before all of them): **the camera and cut-outs** go with phase 2 (blocking), since poses need the
floor; **light and shadows** with phase 2 too; **life and emotes** with phase 3 (the party's cards); **tracks** with
phase 5 (zones); **air** last, one kind at a time.

---

## 14. Ingram's calls

1. **The diorama** as the one consistent way to show cards (§2)?
2. **Card size** per painting (stylised standees, §2.3), rather than life size?
3. **The popup's new name** ("their file"?), now that "card" means the person.
4. **Players choose their own demeanour** (§6)?
5. **The emote set**: anything to add, cut or redraw? Which eight on the default wheel?
6. **Reactions to the game** (§6): which ones?
7. **Tracks** for the next physical challenge Claude writes?
8. **Who sets rigs up:** Claude drafts every painting's rig, Ingram adjusts with the sliders?
9. **The deck rule** (§2.4): lift the painting clear of the deck, or ask for paintings composed with the floor a
   little higher in future art?
10. **Links between cards** (§7.1): glare, whisper, look; any others (a heart passed, a cold shoulder)?
11. **The photograph** (§8.1) as a handout filed in Papers?
12. **The split stage** (§8.1) for haunts on the same night and a party that splits up?
13. **Conditions you can see** (§6): which conditions get a pose, and should players see an enemy's?
14. **The wings** (§11.3). **DECIDED 2026-10-01:** players always start in a group, in the wings, and bring their
    own cards into the scene.
15. **Splitting up** (§11.7). **DECIDED 2026-10-01:** the split stage is an option that is easy to switch on and off,
    with an indicator whenever it is on. Still open: whether it starts on or off.
16. **Flat mode** (§11.10). **DECIDED 2026-10-01:** keep a very basic fallback. (Flat mode is the same stage drawn
    upright with no perspective, light or air, for when the 3D version is too heavy or not wanted.)

---

## 15. The plates

| Plate | Shows |
|---|---|
| 13 `dio-bar` | round the bar at the Paper Lantern: a keeper behind the counter, a back turned, a huddle, a sleeper |
| 14 `dio-table` | the card game: seated round a lamp-lit table, a huddle by the coats, the cat asleep |
| 15 `dio-bath` | the bathhouse: cards chest-deep in the water, steam, sunlight |
| 16 `emotes` | the whole emote set |
| 17 `dio-track` | the obstacle course in the gymnasium, with its readout |
| 18 `dio-crowd` | the Crew Mess, everyone emoting |
| 19 `dio-snow` | snow at the shrine gate, settling on the cards |
| 20 `dio-sparks` | the night shift: work lamps and welding sparks |
| 21 `dio-light-trio` | the same two cards under a lantern, a work lamp, and a window (`dio-light&light=…` one at a time) |
| 22 `card-anatomy` | the card taken apart |
| 23 `dio-rig` | setting a scene up |
| 24 `dio-wheel` | the emote wheel |
| 25 `dio-links` | what passes between cards: a glare, a whisper, a look (the petition at the Crew Mess) |
| 26 `dio-rain` | rain on the Met Office roof: splashes, and every card in its own reflection |
| 27 `dio-photo` | a photograph on the HQ steps; `&print=1` the print, filed in Papers |
| 28 `dio-split` | two haunts on one night: the stage splits like a manga page |
| 29 `dio-alive` | the Paper Lantern, alive: the animation's source (a whisper passed, a walk, a turn) |
| 30 `dio-conditions` | conditions you can see: prone, dying, frightened, fatigued, off-guard, stunned, hidden |
| 31 `dio-zones` | the Errand's street: dashed zones around the tea house door, the shop window and the alley; cards docked, one held and heading for the door |
| 32 `dio-fight` | the flood tunnel: a fight in zones with range links and a key, foes stacked with counts, the blueprint, the "Elsewhere" tray |
| 33 `dio-wings` | the party in the wings, one card hovered to show its keys, one in a hand and bonking |
| 34 `dio-talk` | a conversation the party is part of, with the stage bar |
| 35 `dio-arrange` | the GM arranging a crowded stage: a stack, a card in the GM's hand, magnets, places on the floor |
| 36 `dio-gangup` | a gang-up |
| 37 `dio-debut` | a first appearance, landing: floor marks, a pool of light, a name caption |
| live `dio-live` | the Paper Lantern running: drag cards, right-click for the wheel |

The animation (`29-alive.mp4` and `.gif` in the shots) is eight seconds of the Paper Lantern with nobody touching
anything: Sanzo playing, a whisper passed along the bar, Tama bringing a bowl over, Masaru turning round to see.
