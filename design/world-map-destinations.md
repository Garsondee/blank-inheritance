# The City: where the party goes next

*Design, 2026-09-28. Status: **phases 0–3 built and deployed the same day** (build `1d9ae6cb143df302`), after Ingram
answered §13. Phase 4, the downtime board, is not built. §14 records what was built and what was found live.*

## 0. The request

Ingram, 2026-09-28:

> "Start with the world map destination system - this is a big and important system, sometimes players will get
> to choose where to go next and sometimes they won't be given a choice, sometimes players will be allowed to split
> off from the main group and sometimes the players will be forced to recombine into a group. The Scene Runner stays
> GM only, that's important, so everything I'm describing would happen on the scene call 'The City'. At the moment
> you use Journal markers but I think we need to replace that system with something else, the system you will design
> right now."

Four requirements come out of that, and every section below serves one of them:

1. **Sometimes a choice, sometimes not.** The same system handles "you go here" and "where do you want to go?".
2. **Sometimes a split, sometimes a regroup.** The party can break into groups, and the story can pull it back together.
3. **The Scene Runner stays GM-only.** Everything the players do happens on The City, the campaign map scene.
4. **The journal pins go.** Something built for choosing replaces them.

## 1. What was on The City before this

*(As found on 2026-09-28, before the build. The pins below are retired: see §14.)*

- **Fourteen pins.** Each is a Foundry Note, generated from the hub's `pins[]` list in `data/campaign/scene-set.json`
  and rebuilt at every GM login (`foundry/scene-build.mjs`, `core/generators/scene-set.mjs#hubPinPlan`). A player can
  only double-click one, and all it does is open a page in the "The City — Places" journal: a blurb, a map reference,
  and a "Go to…" scene link. Nothing about a pin knows whether the party can go there now.
- **One marker called "The Party".** A token with no Actor, moved by the GM's client along a real routed path over the
  road network, with a per-mode speed, a camera that follows it on every screen, and a trail behind it
  (`foundry/travel.mjs`, `travel-camera.mjs`, `travel-trail.mjs`). Because it has no Actor, Foundry treats every user as
  its owner, so today **any player can drag it**. Nobody has noticed because nobody has tried.
- **A split-party animator that nothing calls.** `runTravelSequenceForPositions` moves one marker per group at the same
  time, and `core/travel-trigger.mjs#travelLegsFor` already works out the legs for together→split, split→together and
  split→split. The Scene Runner only ever calls the older one-marker version.
- **Where the party is lives only in authored text.** Each scene brief states `intro.position` and `outro.position`
  (scattered / individual / converging / together / split). There is no live record of where each character actually is.
- **Players write shared state by socket, with no reply.** Downtime commitments go player → active GM over the module
  socket (`foundry/campaign-state.mjs`), fire-and-forget. Private commitments are pushed to the player once and lost if
  they reload.
- **The downtime board is half built.** The day ring, slices and offers exist (`core/day-ring.mjs`,
  `core/commitments.mjs`). The scene board's expiry half and the resolution queue do not (`design/ux-doctrine.md` §10.7).

## 2. The idea

**Every move between scenes becomes a departure, and The City is where departures happen.** When a scene ends, the map
comes up. The players see where they can go. Depending on the departure, the story either takes them somewhere, or
they each pick a place on the map by clicking it. The GM watches the picks arrive, then presses **Go** once. Each
character's own token travels to where they are going, and the GM runs the scenes that result, one group at a time.
When the story needs everyone back together, it calls a muster, and every token walks to the same place.

This is also the downtime board. `core/day-ring.mjs` records Ingram's ruling that *"downtime scheduling is part of
'theatre of the mind' just done from an overview map of the whole city."* A free afternoon is a departure where each
player picks a place, so the commit phase of `ux-doctrine.md` §3 and the map choice are the same act. This design
builds one system for both rather than two.

## 3. Words used here

| Word | Means |
|---|---|
| **Place** | A real point on the map: a `data/locations/` entry. The map shows the places the party knows about. |
| **Departure** | The moment between scenes when the party moves. Authored on the scene it leaves from. |
| **Destination** | One place the party may go in this departure, and the scene that happens there. |
| **Pick** | One player's chosen destination, before the GM presses Go. |
| **Group** | Everyone who picked the same destination. One group, one scene. |
| **Pawn** | A player character's own token on The City. One each. |
| **Muster** | A departure that brings everyone to one place. |
| **The strip** | The GM's own control bar on The City. The GM sees it; players never do. |

## 4. Four kinds of departure

Each scene's outro says which kind follows it. **A scene that says nothing gets "sent" to the next scene in the
episode's order**, which is exactly what happens today, so nothing already written breaks.

| Kind | Who decides | Split? | On the map | Example |
|---|---|---|---|---|
| **Sent** | The story | No | One destination, lit. A banner gives the reason. Pawns travel. | Intake Medicals → Assembly: the induction timetable moves them. |
| **Together** | The players, as one | No | Several destinations. Each player picks; the GM sees whether they agree, then presses Go on one. | A later call-out with two Contacts at once, answered as one unit. |
| **Free** | Each player | Yes | Several destinations. Each player picks their own. Same pick, same group. | The Long Afternoon; The Night Off. |
| **Muster** | The story | Regroups | One place, marked as a must. Every pawn walks there, from wherever it is. | Evening muster (The Override); breakfast (Zero Six Hundred). |

**Each destination can also carry these**, all taken from rules already settled in `ux-doctrine.md`:

- **Must go** (Law 21): unmistakable before anyone opens it, a different shape and colour and the word "must", never
  just a border. A must-go destination landing on a free departure bumps other picks, and says so (§3, "a surprise can
  override a commitment").
- **Costs a slice** (Law 20): shown on the marker. Decided separately from "must go".
- **Closes at** (Law 19): a moment key (`d9:evening`). The marker shows how long is left, and what missing it costs,
  before it lapses.
- **Room for** (capacity): "two excavator conversions exist, so two people can have one" (Familiarisation). A full destination
  stays on the map, marked full, rather than vanishing.
- **Who may go**: everyone by default; or only the people who made an earlier pick ("whoever went out tonight gets back
  in"); or only one named player (a personal mission).
- **Private** (§7a): seen only by the player it belongs to and the GM.
- **Clearance**: the party's rung must reach it (`design/strategy-layer.md` §3). Below it, the place is either shown
  locked with the reason, or not shown at all if the place itself is classified above what they know.

**The party's freedom grows with its rank.** The twenty-chapter outline already says how jobs come: Book I "assigned,
with the method", Book II "the method is theirs", and by Book V "they set them". In practice Episode One is nearly all
Sent, Episode Two adds Free afternoons and evenings, and later chapters add Free call-outs once the party can
"self-deploy to a Contact" (Clearance 2). This is authoring guidance, not a rule the code enforces.

### How Episodes One and Two map onto it

| Scene the party leaves | Departure | Why |
|---|---|---|
| From Up Here | none | Narration. Nobody is anywhere yet. |
| The Road In | **Muster at the Candidate Gate**, from six starting points | Six pawns walk in from the places the players described. The first time the map shows them. |
| Intake Medicals → … → Flood Tunnel Clearance | **Sent**, every time | An induction day. The institution moves them. |
| The Board (Episode Two) | Sent | It teaches the four-quarter day; the booking itself is §9, phase 4. |
| The Long Afternoon | **Free**, then **Muster** at the yard | Its menu is the destination list. The tea house needs the pass. |
| The Night Off | **Free** (stay in / over the wire), then **Muster** at breakfast | "A party that splits four-to-two is running the scene correctly." |
| Unidentified Contact → First Contact | **Sent** (a call-out) | The alert sends them. |

The school periods are rooms inside one building, not places on the map. They use the same idea at room scale, which is
outside this design (§11).

## 5. What the players see on The City

**Places replace pins.** Each place the party knows about gets a marker drawn by the module: a small emblem and its name.
A place the party has never heard of is not on their map. The map fills in over the campaign. A place classified above
their standing never appears for them at all.

**A marker shows its state at a glance:**

| State | Looks like |
|---|---|
| Known | Small and quiet. Hover for the name, click to read about it. |
| Here | Your pawn, or your group, is standing on it. |
| Open | A destination in the current departure. Bright, with its costs as small badges. |
| Must go | Unmistakable (Law 21). |
| Full, locked or closed | Still shown, with the reason in words: "full", "needs a pass", "closes tonight". |
| Picked | The portraits of whoever has picked it, around the marker. |

**Clicking a marker opens its card:** the place's name, one or two lines about it, what is on offer there, what it
costs, when it closes, and who is already going. Below that, **"I'm going here"** (or "Change my mind"). "Read more"
opens the place's page in the journal, so the reference text the pins used to open is still one click away.

**Their own pawn and everyone else's are on the map.** During a departure a banner across the top of The City says the
question ("Where does everyone go this afternoon?"), their own pick, and "waiting for the GM". Picks are visible to the
whole party as they arrive, unless a destination is private (§7a's rule).

**Players cannot drag pawns.** They choose by clicking. The GM can drag anything.

## 6. What the GM sees and does

**The strip** sits along the bottom of The City, GM-only, and follows the one-press rule
(`feedback_midsession_ui_one_press`): about eight targets, no scrolling, nothing required.

- The question, and one chip per player: undecided, or their pick.
- **Go.** One press. Picks lock, groups form, the pawns travel, the first group's scene starts.
- **Everyone to…** Click a place: the whole party goes there. Also how the GM overrules a single pick (drag that
  player's chip onto a place).
- **Add a place.** Click any known place to add it as a destination, for the option a player invents on the spot
  ("anything a player invents that is reachable in an afternoon is on the menu").
- **Hold.** Picks freeze while the table talks, then reopen.

**Undecided players at Go** follow the destination's own rule. The default is to go with the largest group. Nobody is
ever left without a place.

**A departure opens by itself** when the GM closes a scene whose outro has a Together, Free or Muster departure: the
table cuts to The City and the question goes up. A Sent departure runs straight through, as today: map, journey, next
scene. The GM can also open an improvised departure from the strip or the Director's Palette (Ctrl+K), which is also
how a call-out interrupts a quarter: a Muster opened by hand, which bumps what players had booked and says so.

## 7. After Go

1. **Every pawn travels on its own leg**, from where it is to where its owner is going, all at once. This finally wires
   the split-aware animator. Each player's camera follows their own pawn; the GM's follows everyone (already built in
   `travel-camera.mjs`).
2. **Groups become a queue.** One group, one scene, run one at a time (`ux-doctrine.md` §3, "commit, then resolve"),
   sorted must-go first, then personal missions, then everything else. The GM can reorder.
3. **The Scene Runner loads the first group's scene** and shows who is in it. Nothing about the Runner becomes
   player-facing.
4. **Closing a group's scene starts the next group's**, instead of the episode's next scene in order. The other
   players' pawns wait on the map where they went.
5. **A destination nobody picked is never run.** That is the "if everyone goes to one, skip the other" rule, and it
   falls out of the queue: a destination with no group has nothing to queue.
6. **Inside a rotation scene**, like The Long Afternoon where every destination belongs to one scene, each beat can say
   which destinations it is for. The Runner shows those beats with the names of the players there, and hides beats for
   destinations nobody chose. This replaces free-text conditions like "for players who chose the city" with something
   the Runner can act on.
7. **When the queue is empty**, the next departure follows, usually a Muster, and the day ring moves on (the automatic
   quarter change built on 2026-09-28 reads the next scene's quarter).

## 8. Data

### 8.1 Authored, on the scene the party leaves

A new `outro.departure` on the scene brief schema. `outro.transition` keeps its job, the in-fiction reason they move;
`departure` is the mechanics.

```json
"departure": {
  "kind": "free",
  "question": "Where does everyone go this afternoon?",
  "undecided": "largest-group",
  "invented": true,
  "destinations": [
    { "id": "machine-shop", "label": "The machine shop floor", "placeRef": "the-machine-shop",
      "briefRef": "episode-c1e2--the-long-afternoon", "costsSlice": true },
    { "id": "tea-house", "label": "The tea house, with a signed pass", "placeRef": "manako-tea-house",
      "briefRef": "episode-c1e2--the-long-afternoon", "needs": "the pass" }
  ],
  "then": { "kind": "muster", "placeRef": "the-yard", "briefRef": "episode-c1e2--the-override" }
}
```

*(Place ids in this example are illustrative; the real ones come from the gazetteer.)*

- `kind`: `sent`, `together`, `free` or `muster`. Absent means Sent to the next scene in order.
- Each destination: `id`, `label` (said to the players), `placeRef` (defaults to the target scene's own
  `intro.position.locationRef`), `briefRef`, and the optional `mustGo`, `costsSlice`, `closesAt`, `roomFor`, `who`,
  `private`, `clearance`, `needs`.
- `then`: what follows once every group is done, usually a muster. Without it, the next departure is read from the
  last scene the party ran.

Beats gain `forDestination`: the destination ids a beat belongs to (§7.6).

The hub's `pins[]` list retires. Its hand-set `offsetPx` values move to each location's `pinAnchor`, a field the
location schema already has and nothing yet sets.

### 8.2 Live, in the world

One world setting, `blank-inheritance.party`, written only by the active GM. Every client repaints when it changes, the
same way the campaign clock already works.

- **pawns**: for each player character, their place, their token, and their group.
- **known**: the places the party knows about. It starts with the places they have been, and grows when a scene or the
  GM adds one.
- **departure**: the open departure, if any: its destinations, the picks, and whether it is open, held or gone.
- **queue**: the groups still to run, in order.

Private picks live in the GM-only vault that private commitments already use. A player asks for their own private
state when they load, so a reload no longer loses it.

## 9. How it is built on Foundry

- **Markers are an HTML layer over the map, not Notes.** Foundry keeps its token HUD aligned to the canvas as it pans and
  zooms; the markers use the same approach. Players can click them with any tool selected, they are styled with the
  module's own stylesheet, and each client draws only what that viewer may see. That per-viewer drawing is what makes
  private destinations and unknown places possible at all: a Note is a shared document, so it can't show one player
  something the others don't see. The fallback, if HTML proves awkward, is drawn icons in the canvas's controls layer,
  the way Foundry's own door icons are clickable by players.
- **Picks travel by Foundry's query system** (`CONFIG.queries` and `User#query`, which the module has not used yet), not the fire-and-forget
  socket. The player's client asks the active GM's client, and gets an answer back. The card can then say "sent",
  then "on the list", or show why a pick was refused. Two players clicking at once are resolved on the GM's side, as
  downtime commitments already are.
- **Pawns are the player characters' own tokens on The City**, owned by their players. Owning them is what points each
  player's camera at their own journey. A `preMoveToken` hook stops players dragging them. Pawns appear when a
  character exists (the real six are made at induction), and the actor-less "The Party" marker retires, which also
  closes the drag hole in §1.
- **Travel** uses the existing route planner and animator, with one leg per pawn, all at once.
- **The world sync** retires the fourteen Notes (they are flagged as generated) once the markers ship. The journal
  pages stay.

## 10. Rules this keeps

- The Scene Runner stays GM-only. Players act only on The City.
- One press for the GM: Go, Hold and Everyone-to each finish in one press.
- Law 11: a player's map never shows a place their character hasn't learned of.
- Laws 19–21: expiry is visible before it bites; must-go and costs-a-slice are separate; must-go is unmistakable.
- Law 17: the GM confirms anything the players will see. Picks are proposals until Go.
- No silent substitution: a bumped pick is shown as bumped.
- The seam rules (`design/scene-signoff.md` Pass 4) become live facts: the next scene's party state is written from
  what actually happened, and a Muster is what makes split → together legal.

## 11. Not in this design

- **Rooms inside a scene**: Intake Medicals' waiting room and examination room, the two classrooms each school period.
  Same idea at room scale, drawn on the scene's own backdrop. Designed next, once this works.
- **Expeditions off the city map** (the Chapter 8 dig). A departure whose destination is another map scene; it fits the
  model but waits for its map.
- **Group voting shapes** (`ideas/entries/group-downtime-activity-voting.json`): pick an order, pick a subset. Together
  departures cover "pick one" now.
- **The downtime board's slices and expiry on the day ring.** Phase 4 below wires them to the map; the ring's own look is
  unchanged.

## 12. The build, in phases

Each phase ships with its tests and is deployed, so Ingram can try it on the live server before the next one starts.

| Phase | What it gives the table | Ingram can try |
|---|---|---|
| **0. Proof** | A player account clicks an HTML marker on The City at 2560×1440, and a pick reaches the GM by query and comes back acknowledged. | Two browsers: GM and a test player. |
| **1. Pawns and the live party** | One pawn per character; the live party record; Sent and Muster departures; every pawn on its own leg. Episode One runs entirely on it; The Road In ends with six pawns walking to the gate. | Close The Road In; watch six pawns converge. |
| **2. Markers replace pins** | Known places, marker states, the card, "Read more"; the Notes retire. | Browse the map as a player. |
| **3. Choices** | Together and Free departures, picks, the strip, Go, groups, the queue driving the Runner, destination-scoped beats, skipping what nobody picked. The Long Afternoon and The Night Off authored as departures. | Run The Night Off with a split. |
| **4. The downtime board** | Quarters, slices, standing activities and offers as destinations on the map; private destinations; expiry badges; the ring's ceremony when the queue empties. | Book a quarter from the map. |

## 13. Decisions for Ingram

**Answered 2026-09-28.** Her answers, in her words where she gave them, follow the list; the list is kept as asked.


1. **Do players see each other's picks before Go?** Default: yes, live, except private destinations (§7a's rule).
2. **Undecided at Go.** Default: they go with the largest group.
3. **Picks lock at Go.** Default: yes. The GM can still overrule afterwards with "Everyone to…".
4. **Unknown places are hidden.** Default: the map shows only places the party knows, and fills in.
5. **Players cannot drag pawns.** Default: click to choose only.
6. **The strip lives on The City**, not in the Scene Runner. Default: yes; the Runner shows only the current group.
7. **The Road In's start points.** Default: each player picks where they come in from (station, ferry, road) as part of
   telling their arrival, and their pawn starts there.
8. **Private personal missions**: `ux-doctrine.md` §7a says a private mission is "genuinely absent" for everyone else;
   `core/commitments.mjs` shows that the quarter is taken without saying what. One of them has to change before phase 4.

**Her answers:**

1. Yes: players see each other's picks, except private ones.
2. Largest group only as a fallback: "I'd wait for all players to decide." The board shows who has not chosen and
   how long they have been looking, and Go says how many are still choosing.
3. Picks lock at Go, "but I need a way in the scene runner to change a choice just in case someone changes their mind
   or the scene calls for it." Built as the Runner's party block: one drop-down per player.
4. Hide the places the party cannot go to yet. Options grow over the campaign (buffs, NPCs); Episodes One and Two
   slowly give more.
5. "Clicking is best. We take away normal Foundry VTT token movement by dragging deliberately from players on the
   world map, the only way to move their tokens is via our system."
6. The GM's controls live on The City. Agreed.
7. The Road In opens a dialogue: each player picks how they arrive; they are placed automatically, and the journeys
   run only once everyone has picked. The dialogue tracks who is still choosing, "so that we can see which player is
   struggling, not just how many haven't done it yet."
8. Showing a slot taken without saying what "sounds like nonsense... Use some common sense." A private choice leaves
   no trace on anyone else's screen; `core/commitments.mjs` was changed to match.

She also asked for it to look good: thumbnail previews of each scene, blurred and without colour where a place is
meant to be a surprise; attractive pins; everyone's readiness and choices visible; and a dashed line from each token to
its destination once a choice is made.

## 14. As built (2026-09-28)

**Files.** `core/departures.mjs` holds every rule (tested in `test/tier1-departures.test.mjs`).
`foundry/city-state.mjs` stores, asks and moves: the `cityState` world setting, player picks by `CONFIG.queries`
to the active GM, private picks on the GM-only vault. `foundry/city-pawns.mjs` makes pawns and blocks player moves on
the hub. `foundry/city-layer.mjs` draws the markers (inside Foundry's `#hud`), the card, the board, the arrival
dialogue and the dashed lines. The Scene Runner hands every closed scene to the City first
(`onCitySceneClosed`), shows the party block, and hides beats tagged `forDestination` when nobody went there.
Contract tests: `test/tier3-city-departures-contract.test.mjs`; authored data: `test/tier2-departures-corpus.test.mjs`.

**Authored so far (drafted):** The Road In (arrive: eight ways in -- train, ferry, bus, coast road, tram, bicycle,
foot, and teleportation, added 2026-09-28 as a deliberately unexplained eighth option, magical or not, landing near
the entrance at the Landing End rather than at the gate itself -- then the Candidate Gate), School Period Two (free:
eight places for the Long Afternoon, then the evening muster) and The Override (free: stay in or go out, then the
Long Hall). Every other scene still moves on by the episode's running order.

**The pins are gone.** `scene-set.json`'s hub `pins[]`, `hubPinPlan` and the icon-size constants were removed; the
scene build deletes any Note it made on the hub (14 on the live world). The "The City — Places" journal stays.

**Found live and fixed the same day** (each has a regression test):

- The hand-built hub had token vision and fog on, so a player with no pawn saw a black map, and one with a pawn
  would see only a circle round it. The scene build now turns both off on the hub only (a narrow exception to
  "hands off an adopted scene"), and pawns carry no sight.
- A first choice had no pawn to draw its line from: opening a departure now stands everyone without a pawn where the
  scene that opened it happened (not for an arrival).
- A muster drew no lines, since nobody picks; a gathering now draws everyone's line to the one place.
- Nearby places drew their markers on top of each other: crowded markers climb their own stems until they clear
  (`core/departures.mjs#declutter`), feet still on their places.
- Pawns were one 50-pixel square on a 12,400-pixel map: now three squares across.
- The card could sit under the console deck; it now keeps clear of the deck and its orb.
- The board and card stayed up after the table left the hub (a rename had missed `removeAll`).

**Not built yet:** phase 4 (the downtime board on the map); unlocking places over the campaign (§13.4 — the
departures offer only what each scene authors, which already hides everything else); room-scale choices inside one
place.
