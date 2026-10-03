# Stagecraft lab

The sketchbook for **Stagecraft: Puppet Show** ([`design/stagecraft/`](../README.md)): mockups for [`stage.md`](../stage.md),
[`diorama.md`](../diorama.md), [`situation-scenes.md`](../situation-scenes.md) and [`scene-standard.md`](../scene-standard.md).
**A sketchbook, not the module**: it loads the module's own stylesheets and portraits so the pictures are honest, and
nothing here runs in Foundry.

```
python tools/induction-terminal/serve.py 4191
http://localhost:4191/design/stagecraft/lab/index.html?plate=puppets   puppets (as the GM; add &user=yumiko in a second tab)
http://localhost:4191/design/stagecraft/lab/index.html?plate=dio-live  the Paper Lantern running: drag a card, right-click for emotes
http://localhost:4191/design/stagecraft/lab/index.html?plate=dio-bar&live   any diorama plate, running instead of frozen
node design/stagecraft/lab/shoot.mjs                                   every plate at 2560x1440, into shots/
node design/stagecraft/lab/shoot.mjs puppets:930:script=1             one scripted moment (extra key=value pairs pass through)
http://localhost:4191/design/stagecraft/lab/three-spike.html?live      the Stage Renderer spike (plate 38), running: drag any card, wiggle it, bang it
```

## The stage (stage.md)

| Plate | Shows |
|---|---|
| `debut` | one first appearance, frame by frame |
| `variety` | the same moment, twelve performances |
| `ensemble` | three newcomers at once (`&t=2300` for the headliner's card) |
| `minis` | the party's mini frames, player and GM keys |
| `conversation`, `gangup` | two formations |
| `arrange` | the GM arranging a crowded stage: stage bar, drag, magnets, a stack |
| `zones` | zones on The Errand's street |
| `plan` | the blueprint, and a fight in zones |
| `runner` | the Runner running a situation scene |
| `puppets` | the party's frames on rods in the canteen; `&script=1&t=930` the scripted bonk, `&anim=1` frames for the animation |
| `sockplay` | `&script=2&t=900`: a bow, a turned back, a head-shake and a hop at the Rumour Mill |
| `live`, `drag`, `puppets` | live, for the Browser pane; puppets sync between tabs with simulated lag (`&lat=70&jitter=30`) |

## The diorama (diorama.md)

| Plate | Shows |
|---|---|
| `dio-bar` (13) | round the bar at the Paper Lantern: a keeper behind the counter, a back turned, a huddle, a sleeper |
| `dio-table` (14) | the card game: seated round a lamp-lit table, a huddle by the coats, the cat asleep |
| `dio-bath` (15) | the bathhouse: chest-deep in the water, steam, sunlight |
| `emotes` (16) | the whole emote set |
| `dio-track` (17) | the obstacle course in the gymnasium, with its readout |
| `dio-crowd` (18) | the Crew Mess, everyone emoting; Petr on a stool, Tomoe behind the bar on a riser |
| `dio-snow` (19, `t=22000`) | snow at the shrine gate, building into caps on the cards |
| `dio-sparks` (20) | the night shift: work lamps, and Kaede's weld throwing sparks off her card |
| `dio-light-trio` (21) | the same two cards under three lights; `dio-light&light=lantern\|work\|window` one at a time |
| `card-anatomy` (22) | the card taken apart |
| `dio-rig` (23) | setting a scene up: horizon, floor grid, cut-out, places, lights, the deck's keep-clear |
| `dio-wheel` (24) | the emote wheel |
| `dio-links` (25) | a glare, a whisper, a look: what passes between cards |
| `dio-rain` (26) | rain on the Met Office roof, and reflections on the wet roof |
| `dio-photo` (27) | a photograph on the HQ steps; shoot `:clean=1` first, then `:print=1` for the print filed in Papers |
| `dio-split` (28) | two haunts on one night: a split stage |
| `dio-alive` (29) | the Paper Lantern alive, for the animation (render frames at `t` = 200 to 8200 ms) |
| `dio-conditions` (30) | SF2E conditions as ways of standing, each with a plaque from the rules |

## The older systems, drawn in the diorama (diorama.md §11)

Plates 01 to 12 are the stage on a flat picture ("flat mode"). These redraw the same ideas standing in the painting:

| Plate | Shows |
|---|---|
| `dio-zones` (31) | the Errand's street: dashed zones around the tea house door, the shop window and the alley; cards docked ("2 waiting"), one held and heading for the door, its ghost on the floor |
| `dio-fight` (32) | the flood tunnel: a fight in zones with range links and their key, foes stacked with counts, the blueprint, the "Elsewhere in this scene" tray |
| `dio-wings` (33) | the party in the wings (racks either side of the deck), one hovered to show its keys, one in a hand and bonking |
| `dio-talk` (34) | a conversation the party is part of: speakers lit, a listener a band back and dimmed, the stage bar |
| `dio-arrange` (35) | the GM arranging a crowded stage: a stack with a count, a card in the GM's hand, magnets, places on the floor |
| `dio-gangup` (36) | a gang-up: the crowd closing on the target, the rest dimmed at the ends, a heavy vignette |
| `dio-debut` (37) | a first appearance, landing: brass marks on the floor, a pool of light, speed lines, an iris half open, a name caption |

## The Stage Renderer (renderer.md)

One plate, a spike rather than a mockup: the Paper Lantern of plate 13 drawn with **three.js** instead of CSS, to find
out with pictures and numbers what [`renderer.md`](../renderer.md) argues. It reuses `diorama.mjs`, `puppets.mjs` and
`emotes.mjs` unchanged, so the camera, the people and the puppet physics are the CSS lab's own; only the drawing is new.

| Plate | Shows |
|---|---|
| `three-spike.html` (38) | the Paper Lantern in real 3D: lanterns as spot lights, cards as brass objects, the stick as a hinged lacquered rod with a glowing hand ring, bonks with a real flash of light and sparks, bloom, and an optional footlight mode that throws every card's shadow up the back wall |

```
three-spike.html?t=1300&poster=wiggle     a frozen moment with numbered notes (poster=wiggle|bang|foot)
three-spike.html?t=2262                   the instant of the bonk (any ms from 0 to about 4000)
three-spike.html?live                     drag any card along the floor; Space hop, N nod, B bow, X shake, T turn, F footlights
three-spike.html?bench&rw=3840            frames per second on this GPU (rw = buffer width; &post=0 &shadows=0 &msaa=0 &foot=1)
```

The scripted scene is Yumiko picked up, wiggled furiously in the open stretch of bar, wound up and sent into Tama (one
bonk, at 2.258 s, closing at 1,510 px/s). `window.__stage.setTime(ms)` redraws it deterministically, which is how the
stills, the contact sheet and the video in `shots/` (`38a` to `38d`, `38-wiggle-and-bang.mp4`) were made. three.js r186
is vendored in the gitignored `third-party/three/` (MIT; see `CREDITS.md`). Measured results are in `renderer.md` §9.

Words: a **card** is a person on the stage; the **name caption** is the label beside a first appearance. The code
still says `frame` (`bi-frame`, `npcFrame`) and `card` for the caption (`bi-debut-card`, `composeDebut`'s `card` part);
the documents use the new words.

`&t=<ms>` freezes every animation at that moment (the diorama's particles are stepped from zero to it, so a still is
exact); `&seed=<n>` draws another performance; `&force=reveal:iris,card:tag` fixes a slot. If a plate fails to load,
the error is printed on the page instead of a black screenshot. `shots/` is gitignored: the plates show Ingram's art.

The pure files are written to move into the module when the work is approved, with tests written then:
`flourish.mjs` (the debut composer), `blocking.mjs` (the stage grid, formations, magnets), `puppets.mjs` (rod
puppet physics, bonks, verbs, and the network grip buffer), `blueprint.mjs` (the blueprint drawing), `diorama.mjs`
(the camera, the deck lip, risers, poses, light, life, particles and tracks) and `emotes.mjs` (the symbols). The party
shown is the six TEST ONLY characters; card lines, poses and the Errand example are illustrative, not canon.
