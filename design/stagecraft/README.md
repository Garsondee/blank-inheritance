# Stagecraft: Puppet Show

*The whole system in one folder. Gathered here on 2026-10-01 at Ingram's request: "make sure it's all in one place and
that I can just refer to this whole system as 'Stagecraft' or the 'Stagecraft: Puppet Show'."*

**What it is.** A way to run scenes without a battle map. A scene is a painting. People are **cards** that stand in it, lit
by its lamps. The players keep their own cards in the wings, pick them up by a **stick**, move them onto the stage and
wiggle them about; a card that hits another one makes it jolt. The GM arranges the rest, and first appearances play
themselves. It is meant to be fun to watch untouched and fun to grab.

**Status (2026-10-01).** **Started, and running inside Foundry.** The module exists in
[`module/stagecraft/`](../../module/stagecraft/): it takes over a flagged scene with three.js, draws the Paper Lantern with
lights and shadows, and has been checked in the local Foundry with a real graphics card and real mouse events, as a GM
and as a real second player in another browser. The stick, the wiggle and the bang are in it, and so are zones, marks,
the box of chalk (graffiti that persists between sessions), held cards that move on everyone's screen, and a flat stage (a plain 2D canvas) for a machine that cannot draw the 3D one. **Since 2026-10-02 Episode One uses it** (`module.md` §19): the centipede fight, Kit Issue and the Canteen are puppet stages, the module switches itself on, and it is deployed to the live server. [`module.md`](module.md) §17 is the honest list.
**Since 2026-10-03 the people move** (`module.md` §20, `stage.md` §5.8 and §8.12): cards walk with steps, the GM has
formations and a scene's authored moments on a strip of their own, regulars go about their business on their own (the same
on every screen), new arrivals walk on or rise up, and a fight can put up a plain board of positions with SF2E tags,
headcounts and range bands. The bench (`tools/stagecraft/bench/`) shows any of it without Foundry.
**Later on 2026-10-03, every face in view** (`module.md` §21, `stage.md` §5.8.1, `chalk.md` §10.1): cards half as big
again, the party in the wings, nobody hidden more than 15% by anything (tested for every scene, moment and routine), and
every Episode One scene and haunt staged, 28 in all (From Up Here and The Road In need no cards). Chalk leaves its mark
and says where it may go; zones say what they are for.
**And then chalk was painted** (`chalk.md` §11, `module.md` §22): pixels instead of lines, a kit of eight tools (chalk,
magic chalk in any colour, pencil, brush, spray, smudge, fill, eraser), steadied strokes that follow a pen's pressure,
strokes seen live on every screen, and Ctrl+Z for everyone.
**An end goal, recorded and not built:** [the Draft](draft.md), cards the GM draws in action scenes for the players to pick.
The decisions that are Ingram's are collected in [§ Calls waiting](#calls-waiting-for-ingram).

---

## The documents

| Read | To find out | Written |
|---|---|---|
| **[stage.md](stage.md)** | **What the stage does.** First appearances, the party's cards in the wings, blocking, puppets, the stage bar, zones, the blueprint, how Claude's pages reach the table | 2026-10-01 |
| **[diorama.md](diorama.md)** | **How it looks.** The painting becomes a stage with a floor, a camera, light, air and emotes, and every system of `stage.md` is drawn on it | 2026-10-01 |
| **[renderer.md](renderer.md)** | **How it is drawn.** The Stage Renderer: taking over Foundry's scene rendering with three.js. What it buys, what it costs, how it is built, what was measured | 2026-10-01 |
| **[feel.md](feel.md)** | **What must never be lost.** The stick, the furious wiggle and the bang, as measurable requirements | 2026-10-01 |
| **[chalk.md](chalk.md)** | **The box of chalk.** Players paint graffiti on the scene with a kit of tools; off in serious scenes, a GM override, and it persists between sessions | 2026-10-01, painted 2026-10-03 |
| **[draft.md](draft.md)** | **The Draft, an end goal (recorded only).** A row of draft cards for the GM in action scenes: draw a series, the players pick a face-down one, the group takes the result | 2026-10-01 |
| **[module.md](module.md)** | **How it becomes a module of its own.** The boundary with the adventure, the layout, the interface, skins, packaging, and (§17) what is built | 2026-10-01 |
| [`module/stagecraft/`](../../module/stagecraft/README.md) | **The module itself**, with its own tests, build and API contract (`API.md`) | 2026-10-01 |
| [`tools/stagecraft/foundry-check.mjs`](../../tools/stagecraft/foundry-check.mjs) | **The live check**: drives the local Foundry with real mouse and key events, as a GM and as a second player | 2026-10-01 |
| [`tools/stagecraft/bench/live-chalk-check.mjs`](../../tools/stagecraft/bench/live-chalk-check.mjs) | **The live check's chalk checks, on the bench**: the same checks on the same stage, as a GM and a player, without a licensed Foundry ([chalk.md](chalk.md) §11.2) | 2026-10-03 |
| [`tools/stagecraft/weak-machine.mjs`](../../tools/stagecraft/weak-machine.mjs) | **The weak-machine measure**: the stage at every tier with no graphics card and a slowed processor (`npm run weak:stagecraft`) | 2026-10-01 |
| **[scene-standard.md](scene-standard.md)** | **What a scene must carry to be played.** Old scenes fail it and must be brought up to it | 2026-10-01 |
| **[situation-scenes.md](situation-scenes.md)** | **How to write the third kind of scene**: neither a short scripted scene nor an open-ended one, but a situation | 2026-10-01 |
| **[ledger.md](ledger.md)** | **Every idea, and where it lives.** Nothing is dropped; a test keeps it true | 2026-10-01 |
| **[lab/](lab/README.md)** | **The sketchbook.** Thirty-eight plates, run in a browser; the three.js spike is plate 38 | 2026-10-01 |
| [../theatre-of-the-mind-staging.md](../theatre-of-the-mind-staging.md) | What the stage was before Stagecraft (the HTML stage the campaign already has) | earlier |

How they fit:

```
  WRITING                     PLAYING                          DRAWING
  scene-standard.md   ───►    stage.md  (what it does)  ───►   renderer.md  (how it is drawn)
  situation-scenes.md         feel.md   (what must stay)       diorama.md   (how it looks)
                              chalk.md  (graffiti)
                                     │
                                     ▼
                  module.md  (its own module; the adventure uses it through one bridge file)
```

**New to this? Read in this order:** this page, then the one-page summary at the top of `stage.md`, `diorama.md`
and `renderer.md`, then `feel.md`. Everything else is reference.

---

## Words

These were settled with Ingram and are used in every document. A test (`test/stagecraft-docs.test.mjs`) fails if the old word
creeps back.

| Word | Means |
|---|---|
| **Card** | A person on the stage. Her word ("that's what we should just be calling them"). The code still says `frame` (`bi-frame`) because it was written first |
| **Name caption** | The label that appears beside a first appearance. (The code calls its parts a `card`; the documents use this word to keep the two apart) |
| **Stick** | The handle that appears when a card is picked up. Her word; the code calls it a rod |
| **Hand and grip** | The hand is whoever holds a card; the grip is the point on the stage where the stick is held |
| **Wings** | Where the party's cards stand, small, with a handle under each, until someone picks one up |
| **Stage, floor, stage grid** | Where cards stand. In the diorama the stage grid is the painting's floor |
| **Mark** | A resting place on the floor with a way of standing (an angle), like the tape marks on a theatre floor. Invisible until a card is picked up (`stage.md` §8.10) |
| **Chalk, the wall** | The box of chalk players draw graffiti with; the wall is the painting it is drawn on (`chalk.md`) |
| **Deck** | The strip of controls along the bottom of every player's screen; the front edge of the stage |
| **Rig** | The three numbers marked on a painting (horizon, floor, depth) that turn it into a stage |
| **Zone** | A named, dashed area on the painting: a door, a window to look at, a position in a fight |
| **Subscene** | The scene a zone leads to |
| **Standee** | A flat card that stands up, like a cardboard figure; what a card is |
| **Diorama** | A painted backdrop with stand-up figures in front of it, as in a toy theatre |
| **Stage Renderer** | The part that draws all of it; three.js in the high tiers |
| **Backend** | One way of drawing: three.js, or flat |
| **Tier** | A quality setting: high, low, flat |
| **Skin** | Everything that makes the stage look like something: the card's face and back, the stick, the emotes |
| **Bridge** | The one file through which the adventure talks to the Stagecraft module |
| **Bonk, the bang** | A card in a hand meeting another card |
| **Draft, draft card** | The GM's row of cards for action scenes, and one card in it. Her word is "cards"; they are called draft cards so they are never confused with the cards that are people (`draft.md`) |

---

## What does not change

Whatever else in these documents is argued with, these hold:

1. **The feel**: the stick, the furious wiggle, the bang (`feel.md`). Whatever draws the stage must keep them.
2. **Cards stay flat standees.** No models, no rigging. The engine changes; the idea does not.
3. **Law 11: removal, not hiding.** A person not yet revealed is absent from what a player's browser receives, not hidden
   in it (`stage.md` §10, `renderer.md` §6.5).
4. **The base works first** (`design/design-layers.md`): a scene with only a painting and a rig must work; everything
   else is an enhancement.
5. **A basic fallback exists** (her decision): the flat version.
6. **Nothing reaches the table before its reveal** (`LEDGER #34`), including anything a renderer could show.
7. **Every feature ships its test in the same commit.**

---

## Decisions so far

| Date | Decision | Whose |
|---|---|---|
| 2026-10-01 | The system is called **Stagecraft** or **Stagecraft: Puppet Show**, and its documents live in this folder | Ingram |
| 2026-10-01 | People on the stage are called **cards** | Ingram |
| 2026-10-01 | Players always start in a group, in the wings, and bring their own cards into the scene | Ingram |
| 2026-10-01 | The split stage is a switch that is easy to flip, with an indicator whenever it is on (whether it starts on or off is open) | Ingram |
| 2026-10-01 | Keep a very basic fallback (flat mode) | Ingram |
| 2026-10-01 | She would prefer Stagecraft to be built as its own separate, cleanly built module that the adventure uses through a public interface, and tested in the adventure | Ingram |
| 2026-10-01 | She proposes taking over Foundry's scene rendering with three.js where Stagecraft is active, as a key component, the **Stage Renderer** | Ingram (**a proposal**: see `renderer.md`) |
| 2026-10-01 | A box of chalk: players draw on the scene, off for serious story scenes with a GM override, and it persists between sessions | Ingram (**a proposal**: see `chalk.md`) |
| 2026-10-01 | Zones return as faint dashed lines; resting places ("marks") appear only when a card is picked up, so the scene never clutters | Ingram (see `stage.md` §8.8 to §8.10) |
| 2026-10-01 | Start producing the real module, separate from the adventure | Ingram asked if I was confident; I said yes and started (`module.md` §14) |
| 2026-10-01 | The takeover works inside the real Foundry (phase 0b of `renderer.md` §10 is done), so the three.js route stands | Evidence in `renderer.md` §10 and `module.md` §17; the adoption itself is still hers to confirm |
| 2026-10-01 | Chalk is kept in one world journal entry (a page per scene and drawer), hidden from players' Journal lists; the GM's override stays until set back | Mine, built and proved live; hers to keep or change (`chalk.md` §9) |
| 2026-10-01 | Chalk is tighter and less fuzzy, and 35% smaller by default: a solid core, slightly fuzzy outside | Ingram (`chalk.md` §5) |
| 2026-10-03 | Chalk is painted in pixels, not drawn as vector lines: a smooth art experience, magic chalk in any colour, more precise, less clunky, a range of tools, stored afresh | Ingram (`chalk.md` §11; built the same day) |
| 2026-10-01 | No need to worry about spoofing or strong security measures: a relaxed game with friends, and an attack that complicated is an accepted risk, not a concern | Ingram (`module.md` §18) |
| 2026-10-01 | Build the sensible things first, the fun features after | Ingram |
| 2026-10-01 | **The Draft** is an end goal: the GM draws a series of draft cards face up or face down in action scenes, the players pick a face-down one, and the group takes the result. Recorded only | Ingram (`draft.md`) |

The recommendations in `renderer.md` and `module.md` (a spike inside Foundry first; two backends; per-scene opt-in;
extraction later) are **mine and not yet hers**.

---

## Look at it

The lab runs in a browser. From the repository root:

```bash
python tools/induction-terminal/serve.py 4191
```

then open:

- `http://localhost:4191/design/stagecraft/lab/three-spike.html?live` : **the Stage Renderer spike, running.** Drag any card
  along the floor, wiggle it as hard as you like, bang it into another. Space hops, N nods, B bows, X shakes its head, T
  turns its back, F switches the footlights.
- `http://localhost:4191/design/stagecraft/lab/index.html?plate=dio-live` : the same room in the CSS-3D diorama.
- `http://localhost:4191/design/stagecraft/lab/index.html?plate=puppets` : the flat puppets.

Stills, a contact sheet and a three-second video of the spike are in `lab/shots/` (`38a-wiggle.png`, `38b-bang.png`,
`38c-footlights.png`, `38d-sequence.jpg`, `38-wiggle-and-bang.mp4`; the folder is gitignored because it shows her art).

Tests, from the repository root:

```bash
npm run test:stagecraft
```

(the module's own tests, then the docs, feel and boundary tests). To build the module's bundle, and to run the live check against the local Foundry (it needs Foundry running on port 30000 with the module linked in, and drives a real browser):

```bash
npm run build:stagecraft
npm run check:stagecraft
npm run weak:stagecraft
```

---

## What is next, in priority order

*Set 2026-10-04, after chalk was painted and made quick; Ingram's goal that evening: "Proceed through as much as possible.
Make the rest your priority list of work to be done." The order asks, first, whether it could hurt the first real session
with six players; then whether it saves the GM time; then whether it is only delight. Statuses are kept up to date.*

| # | What | Why | Status |
|---|---|---|---|
| 1 | **Chalk light in the world**: a byte budget and an age for history, lighter tile pictures, a tidy at the GM's login | The whole journal goes to every client that joins; fifteen strokes were 2.2 MB | **Done 2026-10-04** (`chalk.md` §11.3) |
| 2 | **How each screen is coping**: a per-player health report to the GM, and a start-up speed test that picks the tier | Settles "what do the six players play on?" at the table instead of by guessing | **Done 2026-10-04** (`renderer.md` §9.1, `module.md` §25) |
| 3 | **Ease off when nothing moves**: respect Foundry's own limit on drawing speed, and draw slower when the stage is still | Fans and battery on players' laptops over a long session | **Done 2026-10-04** (`renderer.md` §9.2, `module.md` §26); it also found and fixed a 0.6 s stall when a card is first picked up |
| 4 | **The stage at player sizes**: the kit, the box and the zones at 1366 by 768 and the like | Everything was verified on the GM's 2560 by 1271 screen | Next |
| 5 | **A real Foundry for automated checks** (a test world, or a licence for the local one) | The live check has 53 checks and nowhere to run | Needs Ingram |
| 6 | **A staging editor inside Foundry**: drag marks, homes, zones and the chalk box's spot; changes come home like her Scene Runner edits | The biggest time saver: scenes are staged by hand in `stages.json` today | Planned, large |
| 7 | **A token bridge**: SF2E data drives the cards (0 HP knocks one down, conditions as badges, the turn lights a card) | Fights run themselves a little | Planned |
| 8 | **Chalk moderation**: "who painted that?" on hover, and a button to wipe one player's layer | The store already supports the wipe | Planned, small |
| 9 | **Stage effects waiting on her call**: footlights, the Watcher's tells, the feel extras (a trail behind a swung card, bowing, camera shake) | Look and feel | Needs Ingram |
| 10 | **Staging features planned and unbuilt** (`stage.md`): channels, private reveals, the raised hand, time-of-day light, entrance and exit signatures, the roll call | Theatre of the mind, finer | Planned |
| 11 | **Chalk extras**: dust and a scratch sound, lamplight on chalk, weathering, floor chalk | Delight | Planned |
| 12 | **The accessible mirror**: keyboard and screen-reader access to the cards | Rises if any player needs it | Planned |
| 13 | **The Draft, and releasing Stagecraft as its own module** (name, id, licence) | End goals, recorded | Recorded |

---

## Calls waiting for Ingram

Each document ends with its own list; these are the ones that unblock the rest.

1. **The next build.** Held cards now move on everyone's screen (`stage.md` §6.5, "As built"). The flat fallback is built too (`renderer.md` §8.5). The adventure's bridge, the brass skin and the deploy are built (`module.md` §19). What is left is more scenes (an entry in `stages.json` each) and what the table finds when it plays.
2. **Adopt the three.js Stage Renderer** as the main renderer, with flat as the fallback (`renderer.md` §11). Phase 0b, the in-Foundry proof, is done (`renderer.md` §10).
3. **What do the six players play on?** It sets the default quality (`renderer.md` §11).
4. **Which extras first** (`renderer.md` §5.6): the footlights are a look she should see before they go near a real scene.
5. **Build the module separate from the first line; name, id and licence** (`module.md` §16).
6. **The Watcher's tells as renderer effects**, and where the reveal line is (`renderer.md` §5.5).
6b. **Chalk** (`chalk.md` §9): which scenes default to what, whether it is a zone or the whole painting, and who may rub out whose.
7. The older lists: `stage.md` §13 and `diorama.md` §14.

---

## Where it used to be

On 2026-10-01 the documents moved into this folder. Old paths in older notes:

| Was | Is |
|---|---|
| `design/stagecraft.md` | `design/stagecraft/stage.md` |
| `design/diorama.md` | `design/stagecraft/diorama.md` |
| `design/scene-requirements.md` | `design/stagecraft/scene-standard.md` |
| `design/situation-scenes.md` | `design/stagecraft/situation-scenes.md` |
| `design/mockups/stagecraft/` | `design/stagecraft/lab/` |
| `lab/stagecraft.mjs` | `lab/blocking.mjs` |
| `stagecraft.md` §0.1 (the idea table) | `ledger.md` |
