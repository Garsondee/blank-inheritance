# Stagecraft: debuts, puppets, blocking, zones and the blueprint

*Drafted 2026-10-01 at Ingram's request, and revised the same day after her first look at the mockups (puppets,
§4 and §6; open skies, §11). **A plan, not a decision**: nothing here is built in the module, and §13 lists the
calls that are hers. It extends [`theatre-of-the-mind-staging.md`](../theatre-of-the-mind-staging.md)
(what the stage already does) and works with two companion documents written the same day:
[`scene-standard.md`](scene-standard.md) (what a scene must now carry to be played) and
[`situation-scenes.md`](situation-scenes.md) (how to write and run the third kind of scene). The mockups are in
[`lab/`](lab/) (§14).*

*How the documents fit. **This one is what the stage does**: first appearances, the party's cards, where cards stand,
puppets, zones, the blueprint. **[`diorama.md`](diorama.md) is how it looks**: the painting becomes a stage with a
floor, a camera, light, air and emotes, and every system below is drawn on it (its §11 says how, system by system).
**[`renderer.md`](renderer.md)** is how it is drawn (the three.js Stage Renderer), **[`feel.md`](feel.md)** is what must
never be lost (the stick, the wiggle, the bang), and **[`module.md`](module.md)** is how it becomes a module of its own.
**[`scene-standard.md`](scene-standard.md)** is what a scene must carry to be played, and
**[`situation-scenes.md`](situation-scenes.md)** is how to write the third kind of scene. [`ledger.md`](ledger.md) lists every
idea and where it lives, so none can be lost between documents. The hub is [`README.md`](README.md).*

*Words. Ingram's word for the people on the stage is **cards** ("that's what we should just be calling them"), and
this document uses it. The caption that appears beside a first appearance is the **name caption**, to keep the two
apart. "Frame" is kept for the machines and for the existing code (`.bi-frame`).*

---

## 0. In one page

Six systems, each usable on its own, in the order they should be built:

1. **The debut.** The first time the table meets someone, their card arrives with a flourish, automatically.
   Every debut is a different performance: small parts (how the card arrives, how the picture develops, how the
   nameplate lands, which name caption appears) chosen from a seed and played with jittered timing, so no two look
   alike, while each kind of arrival keeps a recognisable character. Several newcomers at once play as one short,
   ordered ensemble with one group caption, never a barrage. (§3)
2. **The party's cards, in the wings.** Every PC has a full-height card, the same as a person's, standing small
   in the wings at the sides of the stage with a handle under it, their player's colour, and at most three keys. A
   player's own card: raise a hand, say what they're doing, open their notes. A teammate's card: follow them, open
   their page. The GM's view of any PC: award a Hero Point, ask them to roll, give them the floor. (§4)
3. **Blocking.** Cards stand on a stage grid (columns × three depth rows) instead of three flex boxes, so the
   stage can show who stands near whom. Formations, one press each: a line, a conversation (two people facing each
   other, the party's arc facing them), a gang-up, a panel, a split. Magnets mean two cards never sit on top of each
   other; a crowd folds its quietest members into a stack with a count. (§5)
4. **Puppets.** Grab your card by its handle and it grows to full size and comes with your hand, like a rod
   puppet: it leans when swung, wobbles a little when it stops, bonks into other cards, and can hop, nod, bow,
   shake its head or turn its back. Every screen sees it move, smoothly, because only the hand's position is sent,
   thirty times a second; everything lively is worked out on each screen. Drop it on the stage and it lands in line;
   drop it in the wings to put it away. The GM moves anyone. (§6, §7)
5. **Zones.** Named, dashed areas drawn on the scene's picture. Drop your card in a door zone and you can go
   through it into a subscene; a look-closer zone is how you say "I'm looking at that"; in a fight, zones are
   positions with SF2E's cover and difficult terrain. The party can split up; one camera cuts between groups, and
   everyone always sees where everyone else is. (§8)
6. **The blueprint.** A small architect's drawing of the building the party is in: solid where they've been,
   dashed where they've glimpsed, absent where they haven't. Rooms are reached by moving through known doors. (§9)

**How they are drawn.** All six work on a flat picture (plates 01 to 12, kept as *flat mode*) or standing in the
painting as a diorama, with a floor, a camera, light and air (`diorama.md`, plates 13 to 37). It is the same data
either way; on the diorama the stage grid of (3) is the floor itself (`diorama.md` §11.1).

And one idea that ties them to the writing (§10): **a scene is written as stage data** (blocking, zones, subscenes,
a blueprint, name captions, prepared moves), so whatever Claude writes is what the table sees, and Ingram reads a
scene's staging as pictures before she approves it. §11 is a longer list of ways to play with all this, which
Ingram asked for: "Open skies, players love to do this sort of thing and it will give them something to do during
social scenes."

### 0.1 Every idea, and where it lives

[`ledger.md`](ledger.md) lists every idea in all of Stagecraft's documents once, with the section that specifies it
and the plates that draw it. It used to be this section; it moved on 2026-10-01 when the documents were gathered into
one folder (the hub is [`README.md`](README.md)).

---

## 1. The brief, in Ingram's words

From her request of 2026-10-01, split by system (verbatim):

> "The visual novel character frames are great but we need two things fixing. The first time a character frame
> appears for players it deserves a proper flourish animation triggering automatically, a way to handle multiple of
> them and a plan for how to make these animations procedurally less robotic and more varied using simple techniques
> to massive increase the number of different visual appearances for this moment to stop it being boring by
> repetition."

> "We need also to think very carefully about giving the GM a way to move them, to rearrange them and also how to
> organise them on screen if there starts being a lot of them."

> "I want all the PCs to have mini versions of these frames, half as tall with a few carefully chosen buttons and a
> different set for players to click on VS the GM. I'll happily let you tie those in to existing systems."

> "What happens when we have a lot of NPCs in a scene? Can we use a positioning system to make it look more like a
> conversation between two NPCs that the players are part of? Or make it look like a gang up? Maybe we should have a
> system of magnets to make them prevent overlapping? Maybe we should allow players to drag their character frames
> around at will, giving them a pleasing magnetic wiggle when picked up and when placed down they fall into a grid
> space so that visually it lines up with the other character frames."

> "Maybe we could use this system like a proxy for tokens, where we allow people to move their tokens into areas of
> the scene which we dynamically choose to label (using dashed lines and elegant text) which indicates that if they
> move their character frame here they can go to a subscene. This will help for 'theatre of the mind' fights and even
> for more complex theatre of the mind stuff where we break scenes into a set of connected rooms and allow players to
> find things by exploring and allowing them to split up to explore."

> "I imagine a sort of ultra simplified mini map using just simple graphics but elegant ones which allows players to
> see a line blueprint of the location they are in, then we allow them to see that there are places to explore within
> this and by moving their tokens we allow them to choose to move forwards. This is a big and very important feature."

The scene-requirements and third-kind parts of the same request are quoted in their own documents.

Her second message, after seeing the first mockups the same day (verbatim):

> "It also implies that we could add a lot of fun by making cards that move and wobble, that animate, jump between
> positions and do other things to bring them to life in a scene. We should let people pick their character frames
> up from a handle on the bottom and wield them in the scene as if they were puppets almost and have them bump
> against each other. Imagine the sock plays! This could be a REALLY fun unique interface that hasn't been done
> before. It has to be synced in multiplayer and it needs to be a good fast sync to work but if we can get it work
> then imagine the fun people could have. We need to restore player cards to full height to make them look good for
> this, we'll keep them off to one side and smaller unless someone grabs their handle and if they do they become full
> character frame sized and we all players to move them within the stage by holding down and dragging them around. I
> imagine them having a very slight wobble to them so that moving them rapidly would feel fun. What else could we do?
> Open skies, players love to do this sort of thing and it will give them something to do during social scenes."

It replaces the half-height mini cards this plan first proposed (§4).

---

## 2. What exists today

Built and live (`theatre-of-the-mind-staging.md` §9, §12.2):

- **Cards** (built as `templates/stage/frame.hbs` and `.bi-frame`; the code still says "frame"): a brass moulding, a 2:3 portrait dimmed until looked at,
  a bone nameplate, a lamp, up to four small keys. A portrait click opens the party notebook on that person.
- **Five arrangements** (`core/stage-layout.mjs#STAGE_LAYOUTS`): line, conversation, pair, group-left,
  group-right, laid out as three flex boxes (left, centre, right). Card size steps down by headcount.
- **Three arrival tiers**: Quiet (the card engages), Announced (plus a banner), Splash (full screen, NPC only,
  pressed by the GM). Four entrance treatments (Engage, Shutter, Alert, Signal), chosen by `core/engage.mjs`.
- **Names**: someone can be staged under what the table calls them (`called`) until their name is told; the plate
  is struck through and restamped when it is.
- **The deck**, the Scene Runner, the notebook, the session log, the City board's player-to-GM queries.

Planned and not built (`theatre-of-the-mind-staging.md` §12.3 to §12.5): channels (on a line, on a screen, a
sending), private reveals, the raised hand, time-of-day light, haunt art, per-character entrance and exit
signatures, the roll call.

**What this plan changes in that design, plainly:** §8 there said the stage is not a combat surface; zones (§8.6
here) make it one for theatre-of-the-mind fights, because Ingram asked for exactly that. §10's open questions 1 to 3
(where the stage lives, how many cards fit, whether PCs get cards) get proposed answers here: a stage grid with
free placement, a crowd rule, and mini cards for every PC.

---

## 3. The debut: a first appearance plays itself

*Mockups: plates 01 (one debut, frame by frame), 02 (twelve performances of the same moment), 03 (three newcomers
at once), and the live plate that plays a new performance every few seconds.*

### 3.1 What it is

*On the diorama floor: `diorama.md` §11.2.*

A fourth rung on the arrival ladder, between Announced and Splash, and **the only one that fires by itself**:

| Tier | Fires | Looks like |
|---|---|---|
| Quiet | GM reveals (plain click) | the card engages |
| Announced | GM reveals (shift-click) | banner + engage |
| **Debut** | **automatically, the first time the table sees this person** | **a flourish on the card and a name caption beside it** |
| Splash | GM presses ✦ (NPC only) | full screen, then lands on the card |

The staging doc's rule that "the loud one only works if it is rare" still holds, and the debut keeps it: it happens
**once per person per campaign**. After that, the person arrives with their ordinary entrance (or their signature,
§12.5 of the staging doc). If the GM splashes someone on their first appearance, the splash replaces the debut.

### 3.2 When it fires

- When a cast member becomes visible to the table and **has never been met**. "Met" is a small GM-side record
  (person key, first scene, timestamp), the same thing the notebook already acts on when it creates a person's page;
  this makes it explicit and shared by both.
- Someone staged under a `called` line debuts under that line ("The attendant"). Their name, told later, lands
  with the existing strike-and-stamp, not a second debut.
- A private reveal (planned, §12.3 of the staging doc) gives a private debut to the players who can see them, and
  "met" is then per character rather than per table. Until private reveals exist, "met" is per table.
- The admin reset clears the record and its undo restores it, like the names record. (The admin contract test
  already requires every new setting to be on `RESET_SETTINGS` or `KEPT_SETTINGS`.)

### 3.3 The parts of a debut

Each debut is assembled from parts, in this order. Times are typical; each is jittered (§3.5).

| Part | What happens | Typical time |
|---|---|---|
| **Marks** | four brass registration corners draw in where the card will stand: the eye goes there first | 0 to 0.3 s |
| **Pool** | a soft warm pool of light under the landing spot | 0.15 to 0.8 s |
| **Entry** | the card arrives: rises, drops, slides in from its side, unfolds from the floor, or swings in like a hanging sign | 0.15 to 0.85 s |
| **Reveal** | the portrait develops: venetian blinds, an iris, a printed raster, a darkroom develop, a diagonal wipe, or shutters | overlaps the entry |
| **Stamp** | the nameplate lands: a thump, a slap with a tilt, typed letter by letter, or pressed with an ink glow | as it lands |
| **Lamp** | the lamp flickers on like a valve warming up (one to three flickers, never more than three a second) | at landing |
| **Keys** | the keys pop in one after another | just after |
| **Glint** | a light sweeps across the brass at an angle | after landing |
| **Motes** | a few sparks or dust rise from the card's feet | at landing |
| **Caption** | the name caption appears beside the card, holds for about two seconds, and folds away towards the plate | 1 to 3.5 s |

A whole debut runs about three to four seconds, of which the card itself is busy for under one. Nothing blocks
input, and nothing covers the console.

### 3.4 The name caption

The caption is what makes it a *debut* rather than an entrance: the anime convention of naming a character the
first time they are on screen.

- **What it says:** what the table calls them (their name if told, otherwise the `called` line), one short
  **player-safe line** written for the purpose ("Bath attendant", "Keeper of the Paper Lantern"), and an optional
  kicker (where they are, or an affiliation the table can see, such as "Directorate").
- **What it never says:** the cast entry's `role`. That field is GM-facing and can carry secrets ("a cardsharp who
  cheats"). The caption's line is its own authored field (`cast[].caption.line`), published through the stage's
  allow-list and covered by the names leak test.
- **Four styles**, all from the campaign's existing voice: a **ribbon** (an ink band with a brass hairline and a
  chevron end), a **spine** (a file-folder spine label, name running up it), a **tag** (a typed paper luggage tag on
  a string, swinging to rest), and a **stamp** (a paper slip with a vermilion rubber stamp). The faction accent
  colours the text, never the portrait, as the splash already does.
- **It never covers a face.** The caption goes to whichever side has free space; if both sides would cover somebody
  (a card in the middle of a row), it goes above the row (plate 03 shows this for the headliner).

### 3.5 Variety without noise

The staging doc's rule 3 says a sting must mean something, and "a different flourish each time is noise wearing a
costume". Ingram now wants the opposite problem solved too: the same moment repeated thirty times is boring. Both
are satisfied by separating **what kind of arrival it is** (which parts are allowed) from **this particular
performance** (which of the allowed parts, and every number).

**Slots and modules.** Six entries × six reveals × four stamps × four captions is 576 shapes before any number moves.
Each module is small and simple; the variety comes from combining them.

**Families.** What the arrival means decides which modules may play, the way `core/engage.mjs` already picks a
treatment from the faction:

| Family | For | Allowed | Feel |
|---|---|---|---|
| ordinary | most people | everything | warm, a little playful |
| official | the Directorate | drop or unfold; iris, shutter or raster; press or thump; ribbon, stamp or spine | square, level, mechanical; no swing, no wobble |
| hostile | an unwelcome arrival | a slam (fast drop, impact, shake); wipe or shutter; slap; stamp | fast and off-balance |

A Claimant arrival keeps the staging doc's Signal treatment and is not a debut family (it is never a gentle
introduction). A character's own signature, once batch 4 gives them one, narrows the choice further for everything
after their debut.

**Seeded numbers.** Every duration, delay, angle, distance, overshoot, tilt, stagger and particle is drawn from a
seeded random generator. The seed is a hash of the person's stage alias and the moment of the debut, so **every
screen at the table plays the identical performance** (the same principle as `stingSeq`), and the seed says nothing
about who the person is.

**No repeats.** A shuffle bag: the last few entry-and-reveal pairings shown this session are avoided if any other
pairing is allowed. The avoid list travels with the stage data, so it is the same on every screen.

**The techniques that stop it looking robotic**, all cheap:

- **Springs instead of fixed curves.** Overshoot and settle (a damped oscillation, sampled into keyframes) for
  entries, the tag's swing and the drag landing. One function makes every wiggle in the system.
- **Anticipation.** The registration marks arrive before the card: the eye is told where to look.
- **Follow-through and overlap.** The plate lands a beat after the card; the keys pop one after another; the caption
  arrives after the card has settled. Nothing moves in lockstep with anything else.
- **Asymmetry and jitter.** Tempo varies by about ±10%, angles by a few degrees, delays by tens of milliseconds.
  The eye reads small irregularity as life.
- **Arrivals from somewhere.** A card landing on the left comes in from the left; one landing in the middle rises
  or drops. Direction is chosen by position, then varied.
- **Squash on impact.** A slam or a drag landing compresses for a frame and recovers.
- **Light.** A glint across the brass at a random angle; a warm pool under the feet; motes rising.
- **Sound, the same way.** A short debut sound from the audio library, picked round-robin from a few takes and
  played with a slight random change of pitch (about ±4%), the standard game-audio cure for repetition. The music
  ducks by a few decibels for a second. (This also answers the staging doc's open question 8 for debuts.)

**The calm version.** Each player's existing reduced-motion choice (the one the opening titles use) and the
browser's own reduced-motion setting give a calm debut: the card fades in, the caption fades in and out. No
movement, no flicker, no particles.

### 3.6 Several newcomers at once

Three people revealed in one update (or within half a second of each other) play as **one ensemble**:

- **Order:** left to right across the stage, then the headliner (if the scene names one) lands last.
- **A fixed budget:** the gaps shrink as the crowd grows, so four newcomers take barely longer than two. A debut
  arriving while an ensemble is playing joins its tail rather than starting a second one.
- **One caption:** one or two newcomers get a caption each. Three or more get one **group caption** ("New faces ·
  The Paper Lantern") whose names light up as each card lands; only the headliner keeps a caption of their own.
- **Never with a splash.** A splash waits for an ensemble to finish; the single-slot guard stays.

### 3.7 How it reaches every screen

The GM's client is the only writer, as for every stage change. When it publishes a cast in which someone is visible
for the first time, it stamps `debutSeq` on that member and adds them to "met". Every client sees the new `debutSeq`
in the scene flag, works out the same recipe from the same seed, and plays it. A client that loads the scene after
the debut has finished sees no debut (the same priming rule as today: opening a scene never replays arrivals). A
`composerVersion` travels with it; a client on a different version plays the ordinary engage rather than a
different performance.

### 3.8 What the GM can do about it

- Nothing, usually: it is automatic.
- **Skip** (any key, as the splash) and **replay** (a key in the Runner's people column, for a re-introduction).
- **Author it** where it matters: a scene can fix a person's family or any slot (`cast[].debut.force`, e.g. a
  shutter for someone who should arrive like official business), or mark someone `debut: false` (a crowd extra).

### 3.9 Tests

- Pure (`core/flourish.mjs`): the same seed gives the same recipe; each family only uses its allowed modules; the
  shuffle bag avoids recent pairings when it can; lamp flicker never exceeds three a second; an ensemble's span
  stays inside its budget; the calm version has no movement.
- Contract: `debutSeq` and the caption fields are on the publish allow-list; the names leak test covers the caption's
  line; the met record is on the admin reset list.
- Live: a first reveal plays on a player's screen and the GM's; a second reveal of the same person does not; a
  reload mid-scene does not replay it.

---

## 4. The party's cards, in the wings

*Mockups: plates 11 and 12 (cards in the wings and on rods), and plate 04 for the keys, which was drawn when this
section proposed half-height cards.*

**Changed the same day, at Ingram's direction:** the first draft of this section gave the party half-height "mini"
cards along the front row. Having seen them, she asked for full-height cards kept small at one side, which grow to
full size when picked up by a handle (§1, second quote). The keys and badges below are unchanged; the shape and the
home are hers.

### 4.1 The shape

*On the diorama floor: the wings, `diorama.md` §11.3.*

- **Full height, the same as every other card**, so a PC and an NPC side by side on the stage are equals.
- **A handle under it**: a short brass collar and a turned dark-wood grip, the rod of a rod puppet. It is how you
  pick the card up (§6), and it is visible whenever the card is in the wings or in a hand.
- **The player's colour** as a thin tab down the card's left edge (their Foundry user colour), and as the ring
  around the grip while they hold it, so the table can tell whose is whose at a glance.
- **Badges** for state, small and never more than two at once: a raised hand (numbered), what they're doing
  ("Searching"), where they are if not here ("In the alley").

### 4.2 Where they live

- **The wings**: two small racks at the bottom corners of the stage, either side of the deck, each holding three
  cards at half size, standing with their handles slotted in. Seat order, left to right. This is where a card is
  whenever its player isn't using it, so the party is always visible without taking the stage.
- **On the stage**, at full size, where its player last put it down (§6.4), in line with everyone else.
- **In a zone,** if they have moved there (§8).
- **In the "elsewhere" tray** if their character is in another part of this scene (§8.5), or absent from it.

### 4.3 The keys

At most three, chosen for what happens *during* theatre of the mind (doctrine Law 13: everything else lives on the
deck or in the console). Clicking the portrait itself opens the notebook on that character's page, the same rule
as NPC cards.

| Seat | Key | Does | Ties into |
|---|---|---|---|
| Player, own card | ✋ **Raise hand** | your hand goes up on every screen, numbered in order; press again to lower | the staging doc's planned raised hand (§12.3), now living here |
| | 🧭 **What I'm doing** | pick an exploration activity (Search, Scout, Avoid Notice, Investigate, Defend, Follow the Expert...): a badge on the card | SF2E exploration mode (Player Core p. 430); feeds initiative if a fight starts (§8.6) |
| | ✒ **Notes** | the notebook | the party notebook |
| Player, a teammate's card | 👣 **Follow** | Follow the Expert: you move with them between zones and rooms, and the badge says so | SF2E's Follow the Expert; zones (§8) and the blueprint (§9) |
| | ✒ **Their page** | the notebook on their page | the party notebook |
| GM, any PC | ★ **Hero Point** | +1 (shift −1); diamonds on the card show how many (max 3) | sf2e's own `heroPoints` resource |
| | 🎲 **Ask to roll** | a small skill picker; posts a check to that player | `postInlineCheck`, given a target |
| | 🎙 **Give the floor** | lights the card, lowers their hand if raised, logs it | the session log; a "moments tonight" tally in the Runner |

The tally matters: the re-read asks whether every player gets a moment (story-data-refactor §9.7). The GM sees,
quietly, who has not had the floor yet tonight. Players never see it.

### 4.4 What the card shows about the character

- **HP** as a hairline under the portrait, and conditions as one chip. The GM sees everyone's; a player sees their
  own. **Whether teammates see each other's HP is Ingram's call** (§13).
- Nothing else: the sheet is the console's job.

### 4.5 Tests

Seat-split rendering (a player's client never builds GM keys, the same constructor-time split as the deck);
hand order and lowering; Hero Point clamps at 0 and 3 and writes the sf2e resource; the floor tally counts per
session; each card's wing slot follows seat order.

### 4.6 A portrait used twice, found while building the mockups

Test character Kaneda Masaru is staged (`data/campaign/stage-demo.json`) with the exact image file the asset
registry assigned to Taka on 2026-09-21, so the two show one face. It breaks the staging doc's "assigned once, never
double-used" rule (§7 there), harmlessly while the test characters exist and before Session 0/1 removes them, but a
check belongs in the stage-assets tool: **no two staged ids may resolve to the same source image.**

---

## 5. Blocking: where cards stand

*Mockups: plates 05 (conversation), 06 (gang-up), 07 (arranging a crowded stage).*

### 5.1 From three boxes to a stage grid

*On the diorama floor the grid is the floor itself: `diorama.md` §11.1. Formations become poses: §11.4. Magnets and stacks: §11.5.*

Today's stage is three flex boxes, which can show a gap but not "who stands near whom". The proposal:

- **A stage grid**: evenly spaced columns across the stage, and **three depth rows**: the front row (the party's
  cards, and anyone face to face with them), the middle row (people), and the back row (upstage, a little smaller,
  standing in the gaps). One column pitch for everyone.
- **Card size follows the screen**, not a fixed pixel width: about 9% of the window's width, stepped down as the
  headcount grows. On Ingram's 2560-wide page the current 146 to 208 pixel cards look small; this scales them.
- **Positions are stored as grid places or as fractions of the stage**, never as pixels, so a 1920 screen and a
  2560 screen show the same arrangement.
- The five existing arrangements become five formations (§5.2) on the new grid, so nothing authored is lost.

### 5.2 Formations

A formation answers "where does everyone stand?" in one press. Each is a small pure function of who is on stage.

| Formation | Shape | For |
|---|---|---|
| **Line** | everyone in a centred row; the party in front | the default; "who is here" |
| **Talk** | two people either side of a gap, turned towards each other; listeners a row back, dimmed; the party's arc facing them | two NPCs talking, with the party part of it |
| **Gang-up** | one target front and centre; the others close round them in an arc, leaning in, allowed to overlap; anyone not in it pushed to the ends, dimmed | a confrontation, a pile-on, a crowd turning on someone (either way round: the party can gang up on an NPC) |
| **Panel** | a shallow arc of people facing the party | a hearing (the Directorate's discipline hearing, D053), a board, a counter |
| **Split** | two clusters | two groups in one picture; a stand-off |

### 5.3 A conversation the party is part of

The Talk formation turns the two speakers towards each other (a slight 3D turn of the card) and puts the party's
row in a shallow arc facing them, so the table reads as *in* the conversation rather than watching it from outside.
**Whoever is speaking lights up** and shows three small speaking bars. The Scene Runner already knows who is
speaking (the beat's NPC, or the person the GM clicks in the people column), so the light follows the script
without an extra press.

### 5.4 A gang-up

The GM picks the formation, then the target (a click on a card). The crowd forms an arc over the target, the flanks
lower and closer, the one straight behind standing tallest. Overlap is allowed here (up to about a third of a card)
because crowding is the point. A vignette darkens the edges for as long as the formation holds.

### 5.5 Magnets

"Magnets" is the rule that no two cards ever sit on top of each other:

- **On the grid**, dropping a card into an occupied place **reorders** if it came from the same row (like dragging
  a tab: everyone in between shifts one place towards the gap), or **pushes** the run of cards there one place
  towards the nearest free place if it came from elsewhere. A full row **refuses** the drop and the card springs
  home; the crowd rule (§5.6) is what makes room, never a card pushed off the stage.
- **While a card is held,** the places show as small dots on the stage (they are drawn in plate 07), and the one
  it will land in shows a dashed ghost, so everything lands in line.
- **Off the grid** (a gang-up's arc), cards gently repel until no two overlap by more than the formation allows.

Both rules are pure and tested (the lab's `blocking.mjs` already has both, exercised in Node).

### 5.6 Crowds

When more people are on stage than the rows hold, the ones who have spoken least recently **fold into a stack**:
a small fanned deck of their cards with a count ("Ward Four patients ×3"). One press fans them out again; anyone
who speaks steps out of the stack automatically. A scene can name groups in advance (`cast[].group`, e.g. "the
night crew"), so a stack has a proper label and its people stay together. Foes in a fight stack the same way
("Giant centipede ×4", §8.6), and the count drops as they fall.

### 5.7 Where the arrangement is kept

- **On the scene flag**, published, so every screen shows the same arrangement: formation, each member's place,
  stacks. (Concealed people are absent from it, as now.)
- **A scene's default blocking is authored** in the scene (`staging.formation`, `staging.positions`), so a scene
  opens arranged; the GM's live changes last for the session; one press resets to the authored blocking.

### 5.8 As built: walking, formations, moments and life (2026-10-03)

Her brief for this round: *"Sometimes we want to place people in different places for fun and RP reasons ... In many cases
the goal is to give life and animation to the position, angle and grouping of card placements on the map and to make the
scene come to life with a bit of NPC movement."* What exists now, on the diorama floor rather than the old grid:

- **Cards walk.** A card sent somewhere (`core/walks.mjs`) turns towards where it is going (cheated out, never more than
  40 degrees), steps there like a paper doll with a bob and a rock on every step, and turns to the way it should stand on
  arrival. Its **gait** says how: walk, stroll, hurry, march, sneak, scurry, hop, glide. A walk is plain numbers with a
  start time on the clock every screen shares, so every screen shows the card at the same place on the way and nothing is
  sent step by step. A screen that hears late catches up.
- **Formations on the floor** (`core/formations.mjs`): line, huddle, talk, gang-up, panel, stand-off, circle, queue and
  scatter. Each moves the scene's own people by default, or whoever the GM has shift-clicked (party included); the
  people walk to their places, nobody crossing anybody; the close ones (huddle, gang-up, queue) are allowed to overlap.
  A queue runs back into the room, or sideways along a counter when the room has no floor behind it.
- **The GM's blocking strip** (`foundry/blocking-bar.mjs`), under the chalk strip: Life, Board, the nine formations
  (press one, then click the floor where they gather or a person; a double press uses the scene's own `focus`), Tidy
  (everyone loose walks to the nearest free mark), Places (everyone moved walks back where the scene put them, and back
  to what they were doing), and a row of the scene's **moments**.
- **Moments** are a scene's authored blocking (the adventure's `stages.json`, offered through
  `api.blocking.registerMoments`): "Tama brings a round", "Nobu comes round the bench", "They break for the grate". A
  moment moves the people it names, may run a formation, may put the fight board up or take it down, and a fired Scene
  Runner trigger can play one.
- **Life** (`core/life.mjs`): a card may have a routine: wander near home, visit a few places, patrol a path, pace, or
  swarm. A routine is worked out from the shared clock and the card's own seed alone, so the whole table sees the same
  waitress go to the same table at the same moment with no messages at all. Picking a card up, or a formation, sets its
  routine aside (`still`); Places gives it back; the GM's Life switch stops everyone. A card coming back to its routine
  walks back to it rather than jumping.
- **Entrances**: a new card can walk on from the left, the right or the back, or **rise** out of the floor with a spring
  (the centipedes come up out of the water).
- **Small life**: heads turn towards a card someone is carrying, and round at whoever has just bumped into them; cards left
  standing on top of each other drift apart (the magnets of §5.5, off for a huddle); a card behind a counter is raised
  until no more than 45% of it is hidden (the diorama's riser); a regular can show a habit now and then (Sanzo humming).
- **Where it is kept** (§5.7, as built): each published card carries its place and pose, `still`, `packed`, `home`,
  `life`, `enter` and `move: { t0, gait }`. A screen walks a card when it sees a `move.t0` it has not walked yet; a place
  written only to remember a drop is never acted on. Two writes to the cast never overwrite each other (they queue).
- **The party stands in two groups at the front corners**, facing in, leaving the centre of the stage to the scene's
  people (a `gap` in the adventure's party row), and fills from the middle out.
- **Whoever has the floor** (§5.3, a first step): the GM Alt-clicks a card (or a moment, or `api.blocking.setSpeaker`) and
  a pool of soft light breathes at that card's feet while every other card on the stage turns its head towards it, until
  the GM takes the floor back. It is one field in the scene's live flags, so every screen shows it at once. (The three
  speaking bars and the Runner following the script by itself are not built.)
- **An audience** formation (two groups with the middle left open, well forward of what they watch, so it is seen between
  them), and a formation can turn everyone's back to the table (`away`) to look out over a view.
- **Regulars talk to each other**: a routine may face another person rather than a point (the two patients in Ward Four,
  the dealer and the cardsharp, Hachi and Sigrun at the hot end), and make small gestures now and then while standing (a
  nod, a bow, a shake of the head, a hop), on the same beat on every screen. The adventure names the other person by their
  key; the bridge turns it into their card on the stage, and a person not yet revealed is not talked to (nothing about them
  is sent). Someone revealed later is turned to from then on.

#### 5.8.1 Every face in view (2026-10-03, her eighth message)

*"Across the boards cards need to be roughly 50% larger. Cards which move towards the back shouldn't get small as quickly.
Huddle around the notebook results in a complete collision ... I'm not a very big fan of the 'occlusion' of things like
bars so we should make stuff like that only effect the bottom 15% of a card so that the majority stays in view. Ideally you
place them in characterful positions and angles, fully in view and in a way that helps to tell the story."*

- **Cards are half as big again** in every scene (each scene's `cardScale`, 0.9 to 0.99).
- **The back of a room keeps them readable**: a card at depth is drawn bigger than the camera alone would draw it
  (`rigspace.mjs` `depthGrow`), giving back half of what distance takes, so a card twice as far away looks about 0.7 of
  its size, not half.
- **Nothing hides more than the bottom 15% of a card.** A counter or a bar (a cut-out) raises a card behind it until no
  more than 15% is hidden (`HIDE_AT_MOST`). Between cards the same rule is measured (`core/visibility.mjs`): every
  formation is loosened, after it is arranged, just enough that no card hides more than 15% of another, and the circle is
  an arc open to the table (a whole ring hid its far side behind its near side), and the gang-up never puts anyone
  straight behind the one ganged up on.
- **And what a cut-out does hide, it fades** (her tenth message, the same day: *"Where we occlude cards let's use a nice
  fade instead of a harsh cut."*). A counter's top edge is clear and grows solid over 44 reference pixels (never more than
  two fifths of the counter's own height, so a low ledge still hides), so a card behind it melts into the counter instead
  of being sliced off: `cutoutFade` and `CUTOUT_FADE` in `core/visibility.mjs`, the same in the 3D picture (a fade mask on
  the cut-out, drawn after the cards) and the plain one.
- **The party stands in the wings**: two small groups at the front corners, turned in, each card stepping a little further
  back than the one outside it, so the whole middle of the stage is the scene's (with six cards across the front at the
  new size, the party was a wall that hid the room). A stage that keeps one side clearer says how many go left
  (`partyRow.split`). The party's place in the wings is its **home**: Places, and a moment marked `party: true`, bring them
  back to it.
- **Nobody stands behind the painting.** The 3D stage hangs the painting a long way back (`BACKDROP_DEPTH`, 12000 units)
  and never puts a card further back than a little in front of it (`rig.place`); people put at the back of a long ward
  had been drawn behind the painting and so not at all.
- **Every Episode One scene and every haunt was re-staged** round the open middle: each person where they belong in the
  story (Kiku behind her counter, Sanzo and Tama in front of it; Hana in her armchair with Obi at her elbow; the patients
  of Ward Four by their beds), turned towards whom they talk to. Four rooms that had no stage got one: the tram back, the
  canteen's long tables, and the flood tunnel's generator and machine rooms.
- **Tested for every scene**, with six in the party: nobody is hidden more than 15% by anyone, at rest, in every moment,
  at every stop of every routine (and no routine stop hides anybody either); everyone is fully on the 2560 by 1440 page
  and above the deck; nobody is too far back to be read; a card can go to every door and every thing to look at without
  being hidden by the party.
- **A scene re-staged by a deploy re-stages itself**: the GM's side keeps a stamp of how each scene places people, and
  when a deploy changes it the people already on the stage walk to their new places (the fallen stay down); a scene whose
  description changes is drawn again.
- **The deck is furniture too.** Seen live on the GM's own screen: the adventure's deck runs along the bottom, and the
  orb's collar rises out of its middle, so it hid the lower third of anyone front and centre. Stagecraft is told what a
  game's own interface covers (`api.blocking.setCover`: shapes in window pixels; the adventure reports its deck's real
  outline from the page), and every formation keeps everyone clear of it, moving a card back up the stage if it must.
  The adventure's own placements are tested against the deck laid out as it really is (`deckCover`, built on the deck's
  own `deckFit`, checked against the live measurement) on the GM's 2560 by 1271 window and a 1920-wide one: the middle of
  the stage is staged a step further back, upstage centre, where the orb hides nobody; and a scene's moments, all played
  one after another, still leave everyone in view.
- **Zones say what they are for.** Zone outlines are hidden at rest unless a player asks for them in their settings; carry
  a card near one and it lights up with its name and what it is for. Put a card down at a door or a thing to look at and,
  for a few seconds on every screen, a line over it says who went where ("Etsuko · The grill / Look closer"), and the
  `stagecraft.visit` hook tells the adventure.

The **host bench** (`tools/stagecraft/bench/host.html`) runs the module's real host and the GM's real strip against a small
stand-in for Foundry, two pages sharing scene updates as a GM and a player; `npm run bench:stagecraft`
(`host-check.mjs`) drives it with real clicks and proves: the strip is the GM's alone; a formation pressed and placed with
the mouse walks out to the identical place on both screens; a moment does the same; an Alt-click gives someone the floor on
both; Board and Life reach the player.

Tested in `module/stagecraft/test/{walks,life,formations,blocking}.test.mjs`; seen working on the bench
(`tools/stagecraft/bench/`, the real engine and renderer with the real stage entries in a plain page).

---

## 6. Puppets: cards you can hold

*Mockups: plate 11 (picked up in the canteen, a bonk, another player's puppet mid-hop), plate 12 (a sock play at the
Rumour Mill: a bow, a turned back, a head-shake, a hop), the animation of plate 11, and two live plates: `puppets`
(play with them) and `drag` (the GM's drag-and-snap for arranging, §5).*

Ingram's idea, and the most original thing in this plan: **the party's cards are rod puppets.** In a social scene,
with nothing to roll, players have something to do with their hands: walk their character over to someone, turn
away in a huff, bow to the Director, bonk a friend. It gives the table a shared, physical, silly language without a
word of rules, and it is the theatre-of-the-mind stage's own: a picture with people in front of it.

### 6.1 The feel

*On the diorama floor: `diorama.md` §11.6.*

- **Pick up:** press on the handle (or the card) and it grows from its wing size to full size and comes to your
  hand, with a deeper shadow under it.
- **Carry:** the card stands on the rod above your hand. It **leans** as you swing it, the top lagging behind the
  hand, and when you stop it **wobbles** back upright: about 2° for a gentle move, 6° for a brisk one, 13° for a hard
  fling, settled within about half a second (measured, §6.6). "A very slight wobble so that moving them rapidly
  would feel fun" is exactly these numbers, and they are three constants to tune by eye.
- **Bump:** swing into another card and both **bonk**: a jolt, a spin of a few degrees, brass impact lines and a
  soft knock. After the bonk, a card in a hand passes in front of a standing one; two cards that are both in hands
  push each other apart for as long as they overlap, so two players can shove. Every bump is cosmetic and springs
  back: **nobody can move your card but you.**
- **Put down:** drop it on the stage and it lands at the nearest free place in line (§5), with a little bounce;
  drop it in the wings and it shrinks back into its slot.
- **The booth's edge:** the deck is the front of the puppet booth. Rods disappear behind it, so a card put down on
  the stage seems to stand on the floor, and a card held low dips behind the edge like a real puppet.

### 6.2 What a puppet can do

While you hold it, one key each (the lab has all five):

| Key | Verb | What it looks like |
|---|---|---|
| Space | **Hop** | a jump with a squash on take-off and landing |
| N | **Nod** | a quick dip |
| B | **Bow** | a slow tip towards the table |
| S | **Shake** | no: a quick turn left and right, dying away |
| T | **Turn your back** | the card turns round to show its brass back, with your name on a typed label; T again to turn back |

§11 has more (a faint, a tremble, a handshake, reactions to rolls and conditions).

### 6.3 Who may hold what

- **A player holds only their own card.** The GM can hold anyone's, and every NPC's.
- **One hand at a time.** Grabbing a card someone else holds does nothing. If two people grab the same card at the
  same moment, the earlier grab wins (then the lower user id), decided the same way on every screen.
- **Hands off** (GM): a lock that stops all puppets for a serious beat (a hearing, a death, a speech), released with
  one press.
- **The NPCs** stay where the GM arranges them (§5, with the drag-and-snap of plate 07), and the GM can pick any of
  them up as a puppet too.

### 6.4 Where a puppet ends up

Only a drop changes where a card stands. The drop is one message carrying the landing place; the GM's client
writes it to the scene's stage data (players cannot write a Scene, which is also why the GM's client is the stage's
only writer today), so a reload or a late joiner sees every card where it was put.

### 6.5 The sync

"It has to be synced in multiplayer and it needs to be a good fast sync." The design:

- **The channel:** the module's own socket (`module.blank-inheritance`, already used by seven features), with
  messages named `puppet.grab`, `puppet.move`, `puppet.verb`, `puppet.release` and `puppet.lock`. Foundry's server
  relays a module's socket messages straight to the other clients without touching the database
  (`dist/server/sockets.mjs`, `handleCustomSocket`): the fastest path Foundry has.
- **Only the hand travels.** While a card is held, its holder sends where their hand is, at most thirty times a
  second and only when it moves: about forty bytes a message. Six players all waving at once is under two hundred
  tiny messages a second through the server.
- **Everything lively is worked out on each screen.** The lean, the wobble, the bumps and the landing bounce are
  computed by every client from the same hand path, with the same physics, so they agree without being sent. A verb
  is one message.
- **Smooth, not jerky:** a remote puppet is drawn a fraction of a second behind (about 100 ms), between the two
  positions either side of that moment, so late or out-of-order messages never show. The delay can follow the
  measured lag (the 95th-percentile lag plus 30 ms, between 80 and 250 ms).
- **Holding still sends nothing;** a remote puppet extrapolates for 80 ms at most, then holds.
- **A holder who disconnects** or goes silent for two seconds releases the card where it was.

**As built (2026-10-01, `module/stagecraft/scripts/core/sync.mjs`; the Foundry side is `foundry/socket.mjs` and `host.mjs`).**
It follows the design above, with these settled details:

- **One channel, `module.stagecraft`**, with four messages (`grab`, `move`, `verb`, `release`), each under 120 bytes. Foundry
  gives the listener the sender as the server vouches for it, so a message cannot claim to be someone else's.
- **Every time is the server's.** Grabs and samples are stamped with Foundry's synchronised server clock, so "the earlier
  grab wins" means the same on every screen without anyone estimating anyone else's clock. A dead heat goes to the lower
  user id. A screen that loses is told and stops carrying the card.
- **A hand that stops says so.** The receiving screens guess a little past the last sample (up to 80 ms), so a stopped hand
  sends one more sample at the same place, and a hand holding perfectly still sends a heartbeat once a second. That is what
  keeps "silent for two seconds" from catching someone who is only thinking. Without the stop sample a card overshot by
  tens of pixels until the next heartbeat; the tests found it.
- **The drop is rounded before it is used**, on the holder's screen and on the wire alike (a tenth of a pixel), so the card
  comes to rest in the bit-for-bit identical place on every screen. A live check that compared saved places found the
  flake this removes.
- **Saving where it landed.** The acting GM's screen (the lowest-id active GM, so two GMs do not both write) writes each
  drop into the scene's published cast (`at`, `mark`, `yaw`), so a reload or a late joiner sees the card where it was put.
  If no GM has the scene open, the card is where it was put for as long as the session lasts and not after.
- **Hands off** is a switch on the GM's strip, stored as `flags.stagecraft.live.handsOff`, so it needs no message and a late
  joiner has it. A player carrying a card when it goes on puts it down.
- **The cast follows the scene.** When the published cast changes, cards are added and removed; positions are never touched.

### 6.6 Measured in the lab

- **The feel** (`puppets.mjs`, stepped at 120 Hz): peak lean 2.3° at 600 px/s, 5.7° at 1500 px/s, 13.3° at
  3500 px/s; upright again 0.4 to 0.8 s after the hand stops. A swing straight through a standing card: one bonk,
  knocked 14 px, back in place. Two held cards forced together are pushed apart and press into each other.
- **Two tabs, one as the GM and one as Yumiko's player**, linked by a browser channel standing in for the socket,
  with 70 ± 30 ms of lag added: the player grabbed, swung, hopped and dropped; the GM's tab received all 33
  messages (one grab, thirty moves, one hop, one release) and put Yumiko's card in exactly the same place.
- **Smoothness under lag**, a hand doing lively figure-eights, measured against the real hand path:

  | Lag | Drawn behind | Median error | 95% | Worst |
  |---|---|---|---|---|
  | 40 ± 15 ms | 100 ms | 0.4 px | 0.7 px | 0.8 px |
  | 70 ± 30 ms | 100 ms | 0.5 px | 3.3 px | 5.1 px |
  | 120 ± 60 ms | 150 ms | 1.5 px | 8.4 px | 12.8 px |
  | 200 ± 80 ms | 250 ms | 0.9 px | 6.7 px | 11.2 px |

  On a 2560-pixel stage, a few pixels is invisible. Still to measure in a real Foundry, with real players: the
  server's own relay time, and the cost of painting eight puppets at 60 frames a second on a slower computer.

### 6.7 The GM's drag, for arranging

The GM arranging NPCs (§5) uses a plainer drag: the card lifts with a small wiggle, tilts with the hand, shows a
dashed ghost where it will land, and the magnets move whoever is in the way (plate 07, and the live `drag` plate,
verified by dispatching real pointer events: a card dropped on another's place reorders the row).

### 6.8 Tests

- Pure (`core/puppets.mjs`): the same hand path gives the same lean on every run; the lean stays inside its limit;
  a bonk fires once per contact; a standing card always returns to its place; only the holder's own card can be
  grabbed; simultaneous grabs resolve the same way from either side; the grip buffer interpolates and stops
  extrapolating after 80 ms; the sender never exceeds 30 messages a second.
- Pure (`core/stage-blocking.mjs`): `dropInto` reorder, push and refuse; landing in the nearest free place.
- Contract: the `puppet.*` messages go through the one module socket; a release is written by the GM's client only.
- Live: two real seats in the local Foundry, one holding a card, the other seeing it move; a reload keeps it where
  it was dropped.

---

## 7. The GM's stage bar

*Mockup: plate 07.*

A slim bar at the top of the GM's screen while a staged scene is up, one press per job (the mid-session rule:
nothing scrolls, everything is one press):

**Line · Talk · Gang-up · Panel · Split · Stack · Tidy · Lock**, and a pill showing how many are stacked.

- **Tidy** snaps every card to its nearest grid place and closes gaps.
- **Stack** folds the selected cards into one stack (and names it, if the GM types a name).
- **Lock** is "hands off" (§6.3): every card and puppet stops where it is, and any puppet in a player's hand is
  set down in line, until the GM unlocks.
- The Runner's people column gets two small keys per person: **speaking** (lights them) and **replay debut**.
- Keyboard: number keys for formations while the bar is focused; Escape drops a held card back where it was.

---

## 8. Zones: places in the picture

*Mockups: plates 08 (The Errand's street) and 09 (the flood tunnel fight).*

### 8.1 What a zone is

*On the diorama floor a zone is an outline on the painting plus places on the floor: `diorama.md` §11.7.*

A **zone** is a named area of the scene's picture, outlined with a dashed line and labelled in the display type.
It is not a Foundry Region and not a token area: it belongs to the stage, the way cards do. Five kinds, and more for
fun in §8.9 (the outline is faint until it matters, §8.8; the places cards rest on are **marks**, §8.10):

| Kind | Moving your card there means | Example |
|---|---|---|
| **door** | "we go through": it leads to a subscene (another picture) | The Tea House; The Alley |
| **spot** | "I'm looking at that": a point of interest with its own prepared moves | The Shop Window |
| **area** | "I'm standing over there": a position, mainly in fights | The Panels (cover); The Sludge (difficult terrain) |
| **exit** | "we leave": the scene's outro, or travel | Back to the base |
| **track** | "I'm this far along": a chain of places in order, a sign at each, for a physical challenge (`diorama.md` §8) | The gymnasium's obstacle course (plate 17) |

And a **gate** on each: **open** (move in freely), **ask** (the GM confirms; the Runner shows a request), **locked**
(shown with its reason and the check that opens it), or **hidden** (not drawn for players at all until revealed,
and absent from what their screens receive, Law 11).

### 8.2 How a zone looks

*This is how a zone looks when it matters: a card is held near it, or someone is pointing at it. The rest of the time
it is much fainter (§8.8).*

A dashed outline with rounded corners and a soft dark halo so it reads on any picture; the name in the display
Mincho; under it, a short hint in small capitals with an icon ("Go in · 2 waiting", "Look closer", "Cover",
"Difficult terrain", "Way out"). A zone being targeted by a dragged card lights orange and its dashes march.

### 8.3 Moving into a zone

Drag your card onto a zone and it **docks** there, in the zone's own small row of places (aligned to the same
column pitch, so it still lines up). On a **door**, docked cards wait ("2 waiting"); when the GM says go (or the
door is open and everyone who docked is ready), the camera cuts to the subscene with them in it. On a **spot**, the
GM's Runner opens that spot's prepared moves (`situation-scenes.md`), and the player's card shows "Looking at the
window".

### 8.4 Subscenes

A subscene is a further picture belonging to the same scene: the inside of the tea house, the alley behind it, the
generator room. Each is a real staged Foundry Scene (same builder, same camera lock), listed in the scene's data
(`staging.subscenes[]`) with its art. Several already have art waiting: The Errand's alley and tea house, the flood
tunnel's generator and machine rooms, Intake Medicals' exam room, the canteen's second view.

### 8.5 Splitting up

Ingram's table plays every conversation in front of everyone, even when only some characters are there
(`feedback_dont_prescribe_approach`). So a split party is **one camera, cutting between groups**, like a television
episode, not six private screens:

- Everyone watches the group the GM is running.
- The others appear in an **"Elsewhere in this scene"** tray (their faces and where they are), and on the blueprint.
- One press on the tray (or the blueprint) cuts the camera to that group.
- A truly private moment for one player remains the private reveal of the staging doc's batch 2, used rarely.

### 8.6 Theatre-of-the-mind fights in zones

In a fight, area zones are **positions**, and the stage is the board:

- **Range bands between zones:** in the same zone, people can be engaged; an adjacent zone is **near** (one Stride);
  further is **far** (two Strides or more). The bands are drawn as faint dashed links with a label, and a small key at the top of the screen says which line is
  which (engaged solid, near dashed, far dotted).
- **Zone tags are SF2E rules, applied as written:** cover (standard or greater), difficult terrain, hazardous
  terrain. We present them; sf2e computes them (doctrine Law 18).
- **Moving your card to a near zone on your turn spends a Stride**, and the deck's action ring marks it.
- **Initiative from what you were doing:** if a fight breaks out of exploration, each PC's activity badge suggests
  their initiative skill as SF2E has it (Avoid Notice uses Stealth; Search uses Perception; Scout gives the party +1).
- **Foes stack** (§5.6); the count falls as they do. A haunt's `danger` event with a `fight` block (press,
  retreat, surrender) runs on the same board.

### 8.7 Drawing zones

- **Authored** in the scene (`staging.zones[]`): a polygon in fractions of the background art, so it sits on the
  art at any screen size (the stage camera's cover scale is already known).
- **Drawn live by the GM** on the stage: a rectangle, an ellipse or a few clicks for a polygon, then a name and a
  kind. Live zones last for the session and can be saved into the scene as a harvest record, the same doctrine as
  scene edits and location edits.
- **A zone drawn on the wall needs a floor strip (found building it, 2026-10-01).** A zone is outlined where it is on the
  painting, but a card stands on the floor, and a back wall or a kitchen door is a place no card's feet can reach. So a
  zone may carry an optional `floor` polygon: the strip of floor in front of it where a card counts as being *at* the
  zone. A zone without one is acted on where it is drawn (a podium on the floor is its own strip). Both
  `core/zones.mjs` (`zoneArea`) and its tests know this, and the live scene uses it for the grill and the kitchen door.

### 8.8 Subtle by default

> Ideally we need to bring back visible dashed line subtle 'zones' ... but these need to be subtle to avoid the scene
> becoming too cluttered.

A zone's outline has three states, and only the last two are loud:

| State | When | What is drawn |
|---|---|---|
| **Rest** | Nothing is held near it | A hairline dash at about a fifth of full strength, in a warm ink that sits in the painting's own colours. No name |
| **Near** | A card is held within reach of it, or the pointer rests on it | Full strength dash; the name and its hint fade in |
| **Target** | A held card is over it | It lights orange, the dashes march, and a ghost shows where the card will land (§8.2) |

- **Never more than a few outlines at full strength at once**, and names never overlap: they fade by distance or stack.
- **A player's setting** for the rest state: **faint** (the default), **off**, or **always full**. The GM can show or hide
  every zone for the table with one key. A zone can also be authored **quiet**, which only means it never shows at rest
  (it is still there; it is not a *hidden* zone, which is absent from players' screens altogether, §8.1).
- **Calm mode** drops the marching and the pulsing; the strengths are the same.

### 8.9 Zones for fun

> We can also use zones for lots of fun purposes.

A zone's **kind** decides what a card moving in does. Beyond the five of §8.1, these are small and cheap, and each is a
hook the adventure can listen to (`module.md` §6). They are ideas, and which to build first is hers.

| Kind | A card in it | Example |
|---|---|---|
| **chalk** | Chalk may be used here (`chalk.md` §3) | The back wall of the Paper Lantern; a shutter in the alley |
| **podium** | Is spotlit and is the one speaking: the stage lights it, dims the rest, and the speech bar names it | The end of the bar; the stage of the canteen |
| **photo** | Is in the photograph when one is taken (`diorama.md` §8.1) | The HQ steps |
| **quiet** | Is in a whisper: what they say in chat goes only to the others in the zone, for as long as they stand there | The corner booth |
| **music** | Chooses what is playing: drop a card on the jukebox and the audio system offers a few tracks | The jukebox; the radio |
| **shelter** | Is out of the rain, the snow and the wind | The awning |
| **shot** | Triggers a camera move when a card enters: a push-in, a cut, a held shot (`renderer.md` §5.3) | The doorway at the end of the corridor |
| **trigger** | Fires a hook and nothing else, so the adventure can make it mean anything: a roll, a clue, a handout, a joke | A dartboard that asks for a Dexterity check; a coat that is a handout |

Other kinds come from whoever uses the module: a zone is `{ kind, name, shape, ... }`, and an unknown kind is a trigger.

### 8.10 Marks: resting places

> ... also places where cards can be moved to where they snap into new angles so that cards have different 'resting
> points' in a scene so that if the card is picked up we give players options of where to move them too ...

A **mark** is a place on the floor where a card likes to rest, with a way of standing there. The word is the stage
manager's: the tape marks on a theatre floor that an actor hits. A zone is an *area*; a mark is a *spot*.

**What a mark carries.**

| Field | Meaning |
|---|---|
| a point | Marked on the painting like everything else (a fraction of the picture), so it sits on the floor at any screen size |
| an angle | How the card stands: its facing, a lean, a pitch. Or **faces** a zone, a person, or a point ("facing the keeper") |
| a lift | For sitting: the card stands a little higher (a stool, a step) |
| a label | A few words: "at the bar", "the corner booth" |
| a capacity | One by default; a bench might take three |
| a group | Marks at the same table share a name, so a conversation can be dealt out round them |
| an arrival | Optionally an emote or a hook when a card settles there |

**What players see.** Nothing, until a card is picked up. Then:

1. **The free marks near it fade in** as small brass tape ticks on the floor, at most five, the nearest brightest, the far
   ones faint. Marks that are taken do not show.
2. **As the card is dragged, the nearest free mark within reach lights up** and shows a ghost of the pose the card would
   take, and its label.
3. **Let go within reach** and the card glides to the mark, turns to its angle and settles with a small bounce.
   **Let go anywhere else** and it stays where it was dropped (on the grid, §5.1). A scene can be **marks only**
   (a tidy scene, a formal one), where a card dropped away from a mark goes to the nearest free one.
4. **Pick the card up again** and its mark is free again.

That is the whole of the clutter: marks are invisible at rest, and the zones' hairlines (§8.8) are the only permanent
mark on the picture.

**Authoring.** Claude drafts marks from a scene brief ("two marks at the corner booth facing each other; three along the
bar facing the keeper"), and Ingram adjusts them by dragging on the painting in the rig editor
(`diorama.md` §10). They belong to the scene (`stage.marks[]`). A mark may belong to a zone, so that entering "the
counter" brings its marks forward.

**The GM** can put any card anywhere, marks or not, and a **Tidy** press (§7) sends every card to its nearest free mark.
The formations of §5 are made of marks too: a conversation or a gang-up deals temporary marks, and authored marks are
the permanent ones.

**From the keyboard.** Focus a card, press the pick-up key, and the arrow keys step through the free marks, each
announced by the accessible mirror ("the bar, free"); the drop key sends the card there (`renderer.md` §6.3).

### 8.11 Tests

Pure: point-in-zone, docking places, gate rules, hidden zones absent from published data (a leak test, like
names), range bands from zone adjacency; the rest, near and target states of an outline; the nearest free mark within
reach, capacity, taken marks hidden, never more than five shown, a vacated mark free again, the pose a snap gives,
**marks only** returning a stray card, and Tidy. Contract: subscene Scenes are built with the same camera lock. Live: a
player docks at a door, the GM sends them in, the elsewhere tray shows who stayed; a card picked up shows marks, snaps
to one and turns to its angle.

### 8.12 As built: the fight board (2026-10-03)

The GM's **Board** switch (or a moment, or the scene's own `board: true`) turns the positions of a fight (zones of kind
`area`) from faint hairlines into a plain board everyone can read: each washed in its own colour with a solid dashed
outline, a label standing on its floor and drawn over the cards (the position's name, its rules as SF2E tags such as
"difficult terrain" or "high ground", and "2 here"), and a dashed line between positions that are **near** each other
(one Stride). A small key at the top of every screen says what the lines mean: same position, engaged; dashed, near;
anything else, far. Which positions are near is authored (`near: [...]` on a zone) or, if no zone says, worked out from
which floors touch. The engine counts who is in each and answers `bandBetween(a, b)`. The first scene that uses it is
Flood Tunnel Clearance: the two walkways, the flood, the compactor and the panels, raised by "The nest wakes".

**Down** (for a fight's readability): the GM Ctrl-clicks a card (or `api.blocking.setDown`) and it tips over backwards
with a bump to lie on the floor, dimmed, going about nothing, until stood back up; the board counts the fallen apart ("4
here · 2 down"). In the adventure, a character at 0 HP falls by themself, and gets up when healed (the bridge watches their
actor's HP; their card carries their actor id, which their players can see anyway).

**Into position**: the GM's Position formation (press it, click a zone) spreads everyone chosen into free places in that
position, nearest first, so a fight is set up with one press per side; the flood tunnel has "Party: left walkway" and
"Party: right walkway" as moments. The board's labels hang just above head height, like signs, so they never cover a face.

**Docking** (§8.3, for positions): while the board is up, a card put down inside a position goes to the nearest free place
in it (a grid over the position's floor, a card's width apart), so a fight's positions stay readable instead of piling up.
A mark within reach still wins; with the board down a card lands where it is let go, as before.

Found building it: the shadow-catching floor sat in front of the painting and hid every zone drawn on the painting's
floor; only zones at the very back of a room ever showed. The floor now hides nothing (`world.mjs`, with a test).

---

## 9. The blueprint: where you are

*Mockup: plate 09, top right.*

### 9.1 What the players see

*On the diorama: `diorama.md` §11.8.*

A small panel, top right, collapsible to a compass: **an architect's drawing of the building they are in.**

- Teal-grey paper and cream lines (the colour of authority, D054); the party's markers in their own colours and the
  room they are in washed in life orange, with "you are here".
- **Visited** rooms in solid lines and named; **glimpsed** rooms (seen through a door) dashed, perhaps unnamed
  ("?"); **unknown** rooms not drawn at all, and not sent to a player's screen.
- Doors as gaps with a swing arc; stairs as treads; exits labelled at the edges ("Up to the yard"); a north arrow, a
  scale bar and a small title block ("Flood tunnel · lower level · sheet 1").
- The building's outline drawn faintly even where rooms are unknown, because anyone can see a building's shape.

### 9.2 What the GM sees

Every room (unknown ones faint and dotted), every door's state (open, shut, locked, hidden), NPC markers, and
keys to reveal a room, change a door, or move anyone.

### 9.3 Moving room to room

- Drag your marker (or your card into a door zone) to an **adjacent room through a known door**. Following someone
  (§4.3) moves you with them.
- A room with art is a subscene (§8.4); a room without art is described from its written entry.
- **Time:** a scene with a clock (`situation-scenes.md`) can spend time per move, visibly (Law 19).

### 9.4 Where the drawing comes from

- **The outline** from the real map: the location's building footprint (`data/locations/*.json` geometry), turned
  into metres with the existing georeferencing, so the building on the blueprint is the building on the City map.
- **The rooms** authored per scene or per location interior (`blueprint.rooms[]`, rectangles in metres, plus
  doors, stairs and exits), drafted by Claude and read by Ingram as a picture (§10).

### 9.5 Tests

Pure: fitting a plan to the panel; a player's drawing never contains an unknown room (serialise and search, as the
info popup's leak test does); adjacency through known doors; following moves the follower.

---

## 10. The bridge: from Claude's pages to the table

Ingram: *"I haven't given enough thought to how we can breach the gap between your ability to generate content and
their theatre of the mind experience."*

The gap today: a scene is mostly prose for the GM. The stage shows a picture and some faces, and everything else
(where people stand, what is in the room, where the doors go, what happens if the party tries the obvious thing) is
in the GM's head or in paragraphs. The bridge is to **write scenes as stage data**:

1. **Claude writes the staging with the scene:** default blocking, zones with names and kinds, subscenes, a
   blueprint where there is a building, a rig for the painting if it has none yet (`diorama.md` §10), a name caption line for everyone who debuts, and prepared moves for every spot
   and room (`situation-scenes.md`). `story check` validates it (`scene-standard.md`).
2. **Ingram reads the staging as pictures.** The lab's renderer (the diorama's, `dio-stage.mjs`) becomes a small tool that draws each scene's
   staging (the picture, the zones, the blocking, the blueprint, the name captions) to images in the Casebook, beside the
   text, the same way the Sign-Off's Place pass already sends a map crop. She approves what the table will see, not
   a description of it.
3. **The module renders it with no further work** at the table: the scene opens arranged, its zones drawn, its
   blueprint ready, its debuts automatic.
4. **What happened comes home.** Moves the table made that the scene had not prepared for (the GM logs them in one
   press, `situation-scenes.md` §6), zones drawn live, and arrangements saved are harvested like scene edits, and
   the next draft is written from them.

---

## 11. Open skies: more ways to play

Ingram: *"What else could we do? Open skies, players love to do this sort of thing and it will give them something
to do during social scenes."* Everything below builds on the puppets and the stage; none of it needs new rules.
Cost is rough: **S** an afternoon, **M** a day or two, **L** more.

### Things a puppet can do

| Idea | What it looks like | Why it's fun | Cost |
|---|---|---|---|
| **Lean in, step back** | the scroll wheel while holding: a little bigger (leaning in to whisper) or smaller (recoiling) | conversation body language for free | S |
| **Tremble** | hold Shift: a fine shiver | fear, cold, or trying not to laugh | S |
| **Faint** | the card tips over and lies flat on the stage until picked up | comedy, and theatre-of-the-mind collapse | S |
| **Wave** | rock side to side | hellos and goodbyes | S |
| **Handshake or high five** | two cards meeting *slowly* clasp for a moment (both lean in, a small spark); meeting fast is a bonk | a gesture between two players that needs both of them | M |
| **Hand it over** | a small paper prop (the docket, a cup of tea, a key) stuck to a card, passed by touching cards; the Papers handouts can be props | showing, not saying, who has the thing | M |

### Things that react to the game

Mechanics shown as meaning, so the table reads a character's state without a word:

| Idea | What it looks like | Cost |
|---|---|---|
| **Rolls** | a critical success makes your card jump for joy; a critical failure makes it slump for a moment | S |
| **Conditions** | Frightened trembles; Fatigued droops and sways slowly; Sickened sways; Unconscious lies flat and can't be picked up | M |
| **Hero Point** | a small sparkle and a hop when the GM awards one | S |
| **The raised hand** | your card stretches up on tiptoe and wiggles, as well as the numbered badge | S |
| **Talking** | if the table uses Foundry's own voice chat, the speaker's card bobs gently with their voice; otherwise a "talking" key | M |

### Things the GM can do with them

| Idea | What it looks like | Why it's fun | Cost |
|---|---|---|---|
| **Lend an NPC to a player** | the GM hands a player an NPC puppet for a scene ("you're the night porter in this story") | sock-play storytelling: a haunt's roleplay prompt, a rumour retold, a flashback, all performed by the table | S |
| **Curtain and curtain call** | a curtain drops across the stage for a break; at the end of the session every card lines up and bows together | a ritual that closes the evening | S |
| **Shadow play** | the light turns every card into a silhouette on a lit paper screen | flashbacks, legends, dreams, a history lesson told as theatre | M |
| **Follow-spot** | the GM (or a player during their moment) puts a spotlight on one card and dims the rest | "the floor" (§4.3) made literal | S |
| **Music sways them** | when a musician plays at a haunt, every card sways in time | the Paper Lantern's evening, felt | M |
| **The photograph** | one press takes a sepia photograph of the stage, with the date, and files it in the notebook | a scrapbook of the campaign the players keep | M |
| **Strings for the GM's people** | the GM's cards can hang from strings above instead of rods below | at a glance, who is the GM's to move | M |

### Things players can do with the world

| Idea | What it looks like | Cost |
|---|---|---|
| **Doors that open** | dropping a card on a door zone swings the door with one of Foundry's own door sounds | S |
| **Weather on puppets** | rain makes cards shiver; wind sways them; the light follows the time of day (staging doc §12.4) | M |
| **A bit of play in each haunt** | at the bathhouse the floor is water and cards bob; at the card game a character can deal; at the roof, wind | M each |

### Manners, so it stays fun

- **The calm version** for anyone who chose reduced motion: cards move, but don't lean, wobble, bump or hop.
- **Hands off** (§6.3) for the GM's serious moments.
- **No griefing:** you hold only your own; bumps spring back; a card that bonks the same one repeatedly goes quiet
  for a few seconds (no sound spam).
- **No flashing:** impact lines and sparks are soft, and nothing strobes.

---

## 12. Build order

Each phase stands alone, ships with its tests in the same commit, is checked live in the local Foundry with
screenshots, and ends with `npm run deploy`. Work on the module waits for Ingram's go-ahead (the story refactor
pause).

| Phase | What | Depends on |
|---|---|---|
| **1. The debut** | met record, `debutSeq`, the composer and its families, ensembles, captions, calm version, debut sound | nothing new |
| **2. Blocking** | the stage grid, formations, magnets, crowds and stacks, the GM's stage bar, authored blocking | 1 (shares the stage render) |
| **3. The party's cards** | full-height cards in the wings, keys by seat, raised hand, Hero Points, ask to roll, the floor and its tally, activity badges | 2 |
| **4. Puppets** | pick up by the handle, lean and wobble, bonks, the five verbs, the `puppet.*` socket sync with the grip buffer, landing in line, hands off; the GM's multi-select drag | 2, 3 |
| **5. Zones** | authored and live zones, gates, doors and subscenes, the elsewhere tray, cutting between groups; fight zones with range bands and terrain | 4 |
| **6. The blueprint** | plans from footprints plus authored rooms, fog, moving through doors, following | 5 |
| **7. The bridge** | staging fields in canon scenes, `story check` rules, stage proofs in the Casebook, the harvest of live zones and unprepared moves | runs alongside 2 to 6 |

**Before phase 1 there is a phase 0b** (`renderer.md` §10): a throwaway spike inside the local Foundry that proves the
three.js takeover of a scene, which decides what "drawn" means below. The work is also built as a module of its own
(`module.md`), so "the module" in this table is `module/stagecraft/`, not the adventure.

**The diorama** (`diorama.md`) is how these phases are drawn, not a phase of its own, and `diorama.md` §13 says where
each piece slots in: the camera, cut-outs, the deck rule and light with phase 2 (blocking needs the floor); life and
emotes with phase 3; zone outlines and tracks with phase 5; air last, one kind at a time. **Flat mode** (§11.10 there)
is what phases 1 to 6 deliver first and stays as the fallback, so the stage is playable before the diorama is drawn.

The staging doc's planned batches fit in as follows: the raised hand moves into phase 3; channels, private reveals
(batch 2) and light (batch 3) are independent and can go before or after; signatures (batch 4) build directly on
phase 1's composer, since a signature is a family narrowed to one character. §11's open-skies ideas mostly sit on
phase 4 and can be added one at a time, cheapest first (roll reactions, the curtain call, lending an NPC).

---

## 13. Ingram's calls

*Decided 2026-10-01 (`diorama.md` §14, 14 to 16): players always start in the wings and bring their own cards on;
the split stage is a switchable option with an indicator; a basic flat fallback is kept.
Her other open calls are in `diorama.md` §14 (the diorama, 16 of them, 3 now decided), `renderer.md` §11 (the
three.js Stage Renderer), `module.md` §16 (the standalone module), `feel.md` §8, `scene-standard.md` §10 and
`situation-scenes.md` §10. The list below is for the stage itself.*

1. **The debut ladder.** Automatic once per person, as §3.1 proposes? And should the debut also play for someone the
   table met before this system existed (everyone met so far), or only from now on?
2. **Variety vs. language.** Is §3.5's split right: varied debuts, but each person's *later* entrances keep their
   own recognisable signature?
3. **Caption styles.** Keep all four (ribbon, spine, tag, stamp), or fix one per faction?
4. **Teammates' HP.** On the party's cards, can players see each other's HP, or only "wounded"?
5. **Players moving freely.** Puppets whenever a staged scene is up (as she described), with the GM's "hands off"
   for serious beats? Or only when the GM opens the stage?
6. **Doors.** Default gate for a door zone: open, or ask the GM?
7. **Splitting up.** One camera cutting between groups (§8.5), as her table already plays it?
8. **Fights.** Should the stage be the board for theatre-of-the-mind fights (§8.6)? This reverses the staging doc's
   §8 ("not a token-less combat mode") for fights without a battle map.
9. **The blueprint's look.** Teal-grey architect's paper, as plate 09? Or the console's glass, or paper?
10. **Order.** Phases as §12, or puppets sooner (they need the stage grid from phase 2, nothing else)?
11. **The wobble.** The feel numbers (§6.6) are three constants; tune them by playing with the live plate? (They are now
    pinned by `feel.md` and a test, so a change is deliberate: edit the constant, the tables in `feel.md` and the test together.)
12. **Open skies.** Which of §11's ideas first?

---

## 14. The lab

`design/lab/` is a sketchbook, **not the module and not a second prototype to port**: it loads the
module's own stylesheets and portraits so the pictures are honest, and its four pure files are written to move into
`scripts/core/` when building is approved (`flourish.mjs` → `core/flourish.mjs`, `blocking.mjs` →
`core/stage-blocking.mjs`, `puppets.mjs` → `core/puppets.mjs`, `blueprint.mjs` → `core/blueprint.mjs`), with their
tests written then. The diorama adds `diorama.mjs` (the camera, poses, light, life, particles, tracks) and
`emotes.mjs` (the symbols), written the same way.

```
python tools/induction-terminal/serve.py 4191
http://localhost:4191/design/lab/index.html?plate=puppets  (pick your card up; &user=yumiko in a second tab to play together)
http://localhost:4191/design/lab/index.html?plate=live     (a new debut every few seconds)
http://localhost:4191/design/lab/index.html?plate=drag     (the GM's drag and snap)
http://localhost:4191/design/lab/index.html?plate=dio-live (the diorama running: drag a card, right-click for emotes)
node design/lab/shoot.mjs                                  (every plate, 2560x1440, into shots/)
```

Plates **01 to 12** (the flat stage): `debut`, `variety`, `ensemble`, `minis`, `conversation`, `gangup`, `arrange`,
`zones`, `plan`, `runner`, `puppets` and `sockplay` (with `&script=1` or `2` for the scripted performances), plus the
live `live`, `drag` and `puppets`. Plates **13 to 37** are the diorama and the older systems drawn in it
(`diorama.md` §15); the lab's README lists them all. `&t=<ms>` freezes every animation at that moment; `&seed=<n>` draws another performance. Screenshots land
in `shots/`, which is not committed because they show Ingram's art; every plate is deterministic, so `shoot.mjs`
rebuilds any of them exactly (checked: a re-rendered plate matched the original with no pixel differing visibly). The
party in the mockups is the six test characters (`data/characters/kids/`, TEST ONLY), and the captions' lines are
illustrative.
