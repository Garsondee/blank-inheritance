# Haunts

*A type of scene, begun 2026-09-29 (`canon/decisions/D050.md`, `D051.md`). The ten night rests at the end of Episode
One are the first haunts.*

> "Make a good foundation for a new type of scene based on a location the group often come back to." ... "we're not
> looking for a normal scene approach, we're looking for an approach where I have a menu of fun things to do to or with
> my players which encourage them to speak in character and narrate what their characters would do." (Ingram)

A **haunt** is a place the group keeps coming back to: a bar, a bathhouse, a roof, a card game. It is run as a **menu,
not a script**. Each visit is short, low in stakes, and different, because what happens is drawn from the place's own
deck and the people there remember how the group treated them last time.

## What a haunt is made of

| Part | Field | What it gives the GM |
|---|---|---|
| **The band** | `spectrum: "downtime"` | The green banner: relaxed, nothing has to happen. |
| **The place** | `haunt.everyVisit` | What is always true here, said on every arrival. |
| | `haunt.changes` | How the place can change as the city changes. |
| | `intro.position.locationRef` | Where it is on the map. The regulars' attitudes are kept per place. |
| **The regulars** | `cast` (not `walkOn`) | The people who are always here, each with a conversation map: `attitude` (where they start), `byAttitude` (how they behave at each of the five steps), `wants`, `opensWith`, `willDiscuss`, `willNotDiscuss` (with why), `coercible`, `voice`, `questions` (5 to 8 likely questions, answered in their voice) and `statblock` (the proposed level and archetype, until the NPC generator exists). |
| **The deck** | `events` | The menu. Drawn one at a time; played events never return; unseen ones go back (D050). |
| **The rest** | `rest` | For a night's rest: `hp` (quarter, half, three-quarters, full) and `buff`. |
| **The rumour sets** | `rumours` | The rumour mill only, for now: three sets an episode (D051). |
| **The beats** | `beats` | Few and short: arriving, the players' turn, the night, the rest. Most of the haunt lives in the deck. |

## The deck

Every event has a `kind`, and a haunt's deck mixes them:

| Kind | What it is | Share |
|---|---|---|
| `roll` | A skill roll that produces a result: `check`, and `outcomes` for all four degrees. | many |
| `buff` | Something good happens to them: a real SF2E benefit (temporary HP, a Hero Point, a status or circumstance bonus until the next rest). | some |
| `roleplay` | A prompt to narrate in character (`prompt`, word for word). "Tell us about your character's day." The player gets time to think before they speak. | many |
| `dilemma` | A choice with a cost either way. The best ones come to mirror how the city is changing. | some |
| `informant` | Someone met by chance has an unconsidered line of information and shares it willingly: a glimpse behind the scenes. | some |
| `plot` | More than it seems. The Runner's header alerts the GM, and the event is run like an ordinary scene. It plants a question; it does not answer one. | rare |
| `danger` | It can turn violent. The players are never warned; the Runner warns the GM. Theatre-of-the-mind fights. | rare |

An event can:

- **move the regulars** (`shifts`): each shift is a one-press button on the drawn event, optionally tied to a result
  ("the bar gets trashed on a failure: the crew chief goes down a step").
- **belong to some episodes** (`episodes`).
- **be shared across haunts** through `deckRef`, so what was seen in one is gone from the other.

## The regulars' attitudes

SF2E's five steps: hostile, unfriendly, indifferent, friendly, helpful. They are kept per place in the world setting
`hauntAttitudes`, moved by an event's buttons or by the ▲▼ beside each regular, and every move is kept with its
reason. The Runner shows each regular's `byAttitude` line for how they feel now, so the scene reads differently next
time with nobody rewriting it.

Each move is filed to `storage/haunt-attitudes.json` on the server. `npm run haunts` brings it home to
`harvest/haunts/attitudes.json`, and the session starts with one line saying who is where and how they feel. That is
the context new haunt material is written from.

## Writing a haunt

1. **Menu first.** Eight to twelve events. Mix the kinds; any given night, most of what can happen is a roll, a buff
   or a chance to speak in character.
2. **Every roll pays on all four degrees.** A critical success gives something extra; a failure still moves the night
   on; a critical failure escalates.
3. **Prompts are questions**, asked word for word, that a player answers as their character. Leave room: "Take a
   moment."
4. **Regulars have wants.** The conversation map says what they give freely, what a check gets, and what they never
   say (and how they dodge it).
5. **Plot events ask; they don't tell.** Nothing reaches the table before canon says it may (`told`).
6. **Danger is real and unannounced**, and has a way out that isn't a fight.
7. **No two events repeat an idea**, within a haunt or across haunts.

## The Runner

- **Banner.** The green Downtime band; "Haunt" beside it.
- **Alert.** A red *Danger* or amber *More than it seems* strip while such an event is on the table.
- **The rest.** Whom it covers, their HP, one press to apply.
- **The regulars.** Name, role, attitude now and its line, ▲▼.
- **Events.** Draw; each card shows its kind, text, prompt, check, outcomes, note and attitude buttons; *Played* or
  *Put it back*.
- **Rumours.** Pick a set, press the degree a player rolled, read the three statements; only the GM sees which are
  true.
- **Doors, factions, upgrades and setbacks.** See below.

## Where a haunt lives in Foundry: a real Scene (2026-10-01)

A haunt is a **Scene**, not only a brief. Ingram, 2026-10-01: *"I don't see the haunts as actual scenes. There's a gap
here, surely all haunts and all downtime locations should have their own scenes just like the scene runner uses for
everything else. How else would I have the characters be able to turn up somewhere unexpected?"* She was right: the
Runner opens a brief through the active Scene's `briefRef` flag, the Director's Palette (Ctrl+K, *Cut to: …*) cuts to
Scenes, and The City's departures land on Scenes, so until this was fixed none of the twelve could be run, jumped to or
chosen.

- Each haunt is a `kind: "place"` entry in `data/campaign/scene-set.json`, in the **Haunts** group, with `briefRef`
  (its brief), `locationRef` (its sited place, once it has one), `art` (a registered picture; the scene stager reads
  the asset registry) and a short player-facing blurb.
- The Haunts group is `numbered: false`: it is a menu of places, not a running order, so the folder does not read
  "01, 02 ...".
- Haunts are **not in the navigation bar** (`navigation: false`), so the Magic Show is not announced to the players. The
  GM reaches one with **Ctrl+K, "Cut to: The Crew Mess"**, or from the Scenes directory.
- `test/tier2-haunt-scenes.test.mjs` fails if any brief with a `haunt` block has no Scene, no registered backdrop or no
  staged webp. A new haunt is not finished until it passes.
- **Still to do:** The City has no departure that offers the haunts, so the players cannot yet pick one on the map
  (D050 says each chooses their own rest there). That is a design choice for Ingram: where it opens, and whether the
  Magic Show appears as a mystery destination.

## The attitude promise (D052)

> "One of the levers we have for storytelling in any location is attitudes going up and down on the PROMISE that if
> people hate the group then they will make their lives HARDER the next time they are in the same room together."
> (Ingram, 2026-09-29)

An attitude that only changes a line of flavour is not a promise kept. Four more parts make it real:

- **Doors** (`cast[].brief.doors`): a regular's own decision tree of what their attitude opens and closes. Each door
  is `{ kind: "opens" | "closes", at: <attitude>, text }`. An `opens` door is available while the regular is at `at`
  or better; a `closes` door is shut while they are at `at` or worse. Write concrete, playable consequences: a
  better seat or the back room on the good end; a refused service, a raised DC, a report to the office on the bad
  end. The Runner shows every door under its regular, struck through when it doesn't currently apply.
- **Factions** (`cast[].brief.faction`, a shared kebab-case id): attitudes ripple. Fall out with one regular and
  everyone who shares their faction id, in this haunt or any other, is affected too. A faction's own standing is
  kept globally (`hauntFactions`, alongside `hauntAttitudes`), and a regular is *played* at the worse of their own
  personal standing and their faction's — staying on one crew chief's good side does not undo the whole crew's
  grudge. Shifting a regular whose brief names a faction shifts the faction by the same amount automatically
  (`shiftRegularFor` in `foundry/runner-rest-deck.mjs`); most regulars have no faction at all, and that's fine.
- **Upgrades** (`haunt.upgrades`): `{ id, title, text, how, rest? }`. What the group earns by using a place well —
  `how` says how, in play, they earn it. Unlocked by hand in the Runner once it happens. A `rest` override replaces
  the scene's own `rest` block once unlocked (e.g. a fixed boiler heals half instead of a quarter).
- **Setbacks** (`haunt.setbacks`): `{ id, title, text, lasting: "temporary" | "permanent", rest? }`. A story event can
  make a place worse, for a while or for good. Triggered by hand the same way.

Both are toggles kept in the place's own state (`hauntAttitudes[place].unlocked` / `.broken`), covered by the admin
reset like everything else the Runner tracks.

## Theatre-of-the-mind fights (D052)

A `danger` event can carry a `fight` block: `{ foe, press, retreat, surrender }`. Ask the players, plainly, whether
they're pressing the attack or retreating — no warning it was coming. `retreat` says how it runs if they run;
`press` says what it takes to get the foe down and how the scene changes once that happens; `surrender` says
whether and when this foe gives up rather than die, which is allowed to shorten the fight. Nothing here is rolled
automatically; the GM narrates it same as any other theatre-of-the-mind exchange. Not every danger event needs one —
only the ones that are actually a fight rather than, say, a chase or a scare.

## Discovery (D052)

Alongside the ten named rests, a player can choose "somewhere new" instead: they don't know what they'll get or
where they'll go. `haunt.discovery: true` marks a haunt as reachable this way; `haunt.oneTime: true` marks one that
plays once rather than becoming a repeatable haunt (the first night's Magic Show, `canon/scenes/discovery--the-magic-show.json`).
Discovered places carry riskier and more powerful buffs, debuffs and encounters than the ordinary ten. A discovery
that survives its first visit and isn't one-time becomes an eleventh (twelfth, ...) ordinary haunt going forward.
The world-map wiring for offering "somewhere new" as a destination (`core/departures.mjs`'s `mystery` flag already
exists for this) is not yet built — see `canon/plan/chapter-01.md`.
