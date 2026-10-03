# The feel: the stick, the wiggle and the bang

*Drafted 2026-10-01 at Ingram's request. Part of [Stagecraft: Puppet Show](README.md). **These are requirements, not
features**: whatever draws the stage, however it is built and however weak the machine, these three things survive.
Everything here is measured from the working code (`lab/puppets.mjs`, plate 38), and
`test/stagecraft-feel.test.mjs` fails if the numbers below stop being true.*

*Words. A **card** is a person on the stage. The **stick** is the handle that appears when a card is picked up (the
code calls it a rod). The **hand** is whoever is holding a card, and the **grip** is the point on the stage where the
stick is held.*

---

## 0. In one page

> I love the sticks which appear when I pick up a Card, I love wiggling the token around furiously and I love that they
> bang into each other when colliding.

Three sensations, one model:

- **The stick.** Pick a card up and a stick comes out underneath it. It is brass at the top, lacquered wood below, with a
  ring of the holder's colour at the hand. Put the card down and it goes. (§2)
- **The wiggle.** The card follows the hand a moment late and leans away from the way the hand is going. Swing it hard
  and it leans hard; stop dead and it wobbles two or three times and settles. (§3)
- **The bang.** A card in a hand that hits another card makes it jolt and spin, once, and the two come apart. It never
  moves anyone's place; it is only a knock. (§4)

All three come from a few springs stepped at a fixed rate (`puppets.mjs`), so they are the same on every screen, the same
in every renderer and the same at any frame rate. The third dimension adds to them (§5) but never changes them. They are
tested as numbers (§6) and guaranteed on every renderer, every quality setting and every network (§7).

---

## 1. Why this file exists

Most of what Stagecraft does is a plan that can be argued with. These three are different: Ingram named them as the
things she loves, in the same message that proposed replacing the renderer. A new renderer is exactly when a feel is
lost without anyone deciding to lose it: a wobble that was tuned for one frame rate, a bonk that depended on how the
browser ordered two elements, a stick that vanishes against a dark painting. So they are written down as measurable
requirements, with the numbers, before anything is rebuilt.

`stage.md` §6 says how puppets work and what they can do; this file says what must not change.

---

## 2. The stick

**What happens.** When a card is picked up it lifts, grows to full size if it was parked in the wings, and a stick comes
out beneath it. When it is put down the stick goes back and the card settles onto its foot. A card nobody holds has no
stick on the stage; in the wings every card shows a short handle, which is what you take hold of.

**What it looks like.**

| Part | Look | Why |
|---|---|---|
| **Collar** | Brass, the card stands on it | The campaign's brass, and the join the card hinges on |
| **Grip** | Turned dark wood, tapering to the hand, with a highlight down one side | A real handle; reads on a dark painting |
| **Hand ring** | A ring at the grip in the holder's colour, glowing | Whose hand is on it. A remote holder's ring also carries their name |
| **Length** | 134 px at scale 1 in the 3D spike (150 px in the CSS lab, with its collar) | Long enough to see, short enough to keep the card in the scene |

**Rules.**

- It is fully out within 0.3 s of the pick-up and starts to appear within one drawn frame, so a pick-up never feels like
  it waited for the network.
- It must be visible against the darkest painting in the campaign. That is a test of the picture, not a taste: the
  first 3D version used plain dark wood and disappeared (the spike's first render), and was fixed with a lacquered
  surface and a glowing ring.
- It never covers the nameplate.
- A remote player's stick looks exactly like a local one.

**Where it is specified:** `stage.md` §6.1; drawn in plates 11, 12, 29, 33 and 38.

---

## 3. The furious wiggle

**What happens.** The grip chases the hand with a short delay (about 45 ms), so the card trails a little. The card leans
the way a held stick would when swung: the faster the hand speeds up or slows down, the further the top swings away from
the direction of travel. Stop, and a spring returns it upright with a few shrinking swings. It is small on purpose, so
ordinary movement is a slight wobble, and large enough that swinging it hard is plainly fun.

**The model.** Everything below is in `puppets.mjs` (`FEEL`, `stepPuppet`), stepped at 120 times a second whatever the
screen does.

| Constant | Value | What it does |
|---|---|---|
| `follow` | 42 | How hard the grip chases the hand (a critically damped spring, 1 ÷ 42 s behind) |
| `stiffness` | 150 | The spring pulling the lean back to upright |
| `damping` | 9 | How quickly a wobble dies |
| `lag` | 0.5 | How much the hand's acceleration tips the card |
| `maxLean` | 15 | The steady limit, in degrees (the hard clamp is 1.6 times that) |
| `bonkSpeed` | 120 | Closing speed below which two cards just slide past |
| `shove` | 0.35 | Two cards in two hands: how much overlap each pushes out per step |
| `maxJolt` | 70 | The furthest a bang ever knocks a card from its place, in px |
| `bumpSpin` | 0.009 | Spin per px a second of closing speed |
| `jostleK` | 110 | A knocked card's spring back to its place |
| `jostleC` | 11 | And its damping |

**What it does, measured** (a hand moving steadily for 0.4 s and stopping dead; the lean is the peak after the stop):

| Hand speed (px/s) | Peak lean | Time to settle |
|---|---|---|
| 300 | 1.1° | 0.37 s |
| 600 | 2.3° | 0.62 s |
| 1,000 | 3.8° | 0.64 s |
| 1,500 | 5.7° | 0.65 s |
| 2,500 | 9.5° | 0.89 s |
| 3,500 | 13.3° | 0.91 s |

**A furious wiggle** (a hand swinging side to side, steadily; the lean is the peak once it is up to speed):

| Swings a second | Each way (px) | Hand's top speed (px/s) | Peak lean |
|---|---|---|---|
| 1.5 | 100 | 942 | 5.9° |
| 2 | 100 | 1,257 | 9.4° |
| 3.1 | 100 | 1,948 | 8.1° |
| 4 | 80 | 2,011 | 5.3° |
| 5 | 60 | 1,885 | 3.3° |
| 3.1 | 40 | 779 | 3.3° |

It peaks near two swings a second, where the spring is in step with the hand, and falls away at a frantic rate, so the
card never flies apart however fast anyone jiggles. It cannot gain energy: it is a damped spring.

**Where it is specified:** `stage.md` §6.1 and §6.6; drawn in plates 11, 29 and 38.

---

## 4. The bang

**What happens.** A card in someone's hand meets another card: the other jolts away and spins a little, the one in the
hand is nudged back, and for a moment brass impact lines mark the spot. It happens **once per meeting**, however long the
two overlap. Slower than `bonkSpeed` the cards simply slide past each other. Two cards that nobody holds never bump.

After the first touch, a card in a hand **passes in front** of a standing card rather than bulldozing it across the stage
(found in the lab: a swing through one card pushed it on top of the next and hid it). Two cards in two hands push each
other apart gently for as long as they overlap, so two players can shove at one another.

**It is a knock, not a move.** Every jolt is cosmetic, capped at 70 px and springs back to where the card stands. Only its
own player's drop ever changes where a card stands, and that is one message. A bang cannot be used to push a card
somewhere it does not belong.

**What it does, measured** (a held card closing on a standing one at the given speed):

| Closing speed (px/s) | Knocked card's peak lean | Its peak jolt | Time to settle |
|---|---|---|---|
| 150 | 0.8° | 1.8 px | 0.22 s |
| 400 | 2.0° | 4.8 px | 0.29 s |
| 900 | 4.6° | 10.7 px | 0.55 s |
| 1,500 | 7.6° | 17.7 px | 0.60 s |
| 2,500 | 12.2° | 28.5 px | 0.74 s |

**How it is presented.** The model gives a contact: who, where and how fast. What the table sees and hears is the
renderer's and the skin's job:

- **Everywhere:** the jolt and spin; the impact lines at the contact point; a hook with the speed, so the audio system
  can play a knock that is louder for a harder hit (`stagecraft.bonk`, `module.md` §6).
- **In 3D** (§5): a real flash of light that falls on both cards, and sparks that fly and fall.

**The flash rule.** One flash lasts 0.2 s, and a limiter stops lights pulsing more than three times in a second however
many cards are banging (the same rule `design/opening-titles.md` applies to the opening, WCAG 2.3.1).

**Where it is specified:** `stage.md` §6.2; drawn in plates 11, 12, 33 and 38.

---

## 5. What the third dimension adds, and must not change

The three.js spike (plate 38) draws the same model with real objects and real light. These additions are **presentation of
the same state**: none changes a number in §3 or §4.

- **A stick that hinges.** The stick swings about the hand and the card swings a little further at the collar (the
  stick takes 55% of the lean and the hinge the other 45%), so a hard swing makes the two lean by different amounts. The
  card's own lean is still the model's.
- **A real flash and sparks on a bang.** A point of warm light at the contact, falling on both cards for 0.2 s, and forty-eight
  sparks that fly and fall for 0.8 s.
- **Passing in front is a step in depth.** The card in the hand steps forward about 85 px in depth while it overlaps
  another and eases back after, instead of changing a stacking order.
- **To try, not yet built:** a trail behind a swung card; the card bowing like paper when swung hard; a faint camera
  shake scaled by the speed of the hit; a stereo pan on the knock.

---

## 6. Pinning it down

### 6.1 Requirements

Each is testable. "Golden" means a recorded table that the code must reproduce.

| # | Requirement |
|---|---|
| K1 | The stick starts to appear within one drawn frame of the pick-up and is fully out within 0.3 s |
| K2 | A pick-up is acknowledged locally without waiting for the network |
| K3 | The grip follows the hand about 45 ms behind and rests within 0.5 px of it after 0.3 s |
| K4 | Lean for a given hand path equals the golden table (§3) to within 0.05° |
| K5 | After the hand stops, the lean is under 0.5° within 1 s for any speed up to 3,500 px/s |
| K6 | One bonk per meeting; none under 120 px/s; none when nobody holds either card |
| K7 | A jolt never exceeds 70 px and never changes where a card stands |
| K8 | The same inputs give the same trajectory on any machine and at any frame rate (a fixed step of 1/120 s) |
| K9 | A remote holder's card leans and wobbles exactly as a local one does, from the same grip stream, and shows their colour and name on the stick |
| K10 | The stick, the wiggle and the bang exist at every quality setting and in every renderer, flat included |
| K11 | In calm mode the lean is halved and there are no flashes, sparks, trails or shake; the stick and the knock remain *(Ingram's call, §8)* |

### 6.2 Golden tests

`test/stagecraft-feel.test.mjs` already pins the lab's numbers: the six stop speeds of §3, the wiggles, the five closing
speeds of §4, and the scripted scene of plate 38 (one bonk at 2.258 s closing at 1,510 px a second). It also checks that
the constants table in §3 above is the same as `FEEL` in the code. When the module has its own `core/puppets.mjs`, the
test points there and the golden tables move to a fixture file; the numbers do not change unless Ingram changes them.

---

## 7. The guarantee

The stick, the wiggle and the bang exist in **every** way Stagecraft can be drawn:

| Where | How it is kept |
|---|---|
| **three.js, high** | The spike, plate 38 |
| **three.js, low** | Post-processing, shadows and sparks go; the stick, the lean, the jolt and the impact lines stay |
| **Flat** | The CSS puppets of plates 11 and 12 are already this |
| **Calm mode** | §6.1 K11 |
| **A bad network** | Only the grip is sent, about 30 times a second. Each screen computes the lean and the bump itself and shows the remote grip 100 ms in the past, smoothed (`GripBuffer`), so a late packet never makes a card jump (`stage.md` §6.5) |
| **A slow screen** | The model steps at 1/120 s however slowly the screen draws; a slow screen skips drawing, never physics |

Any change to a renderer is checked against this table. A renderer that cannot keep the three sensations is not a
Stagecraft renderer.

---

## 8. Open

1. **Calm mode** (K11): halve the lean and drop the flashes, or turn the wiggle off completely for those who ask for
   reduced motion? WCAG 2.3.3 asks that motion triggered by interaction can be switched off unless it is essential;
   the stick and the wiggle are the point of the feature, so I have taken the gentler reading: reduced, not removed.
2. **The 3D extras of §5** that are not yet built: which does she want, and does the camera shake stay out?
3. **Sound.** The hook is specified; which sounds, and does a harder hit sound different? (`design/audio-system.md`)
