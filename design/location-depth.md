# Location Depth — how developed a place is, and what that obliges

**Status:** specification, accepted 2026-09-12. The ladder and its requirements are settled; the
prose-length thresholds are deliberately provisional and expected to move once a few hundred real
locations exist to measure against (see "Thresholds are guesses" at the end).

**Implemented by:** `tools/gazetteer/core/depth.py` and its JS twin `core/depth.mjs`, held to each
other by `test/fixtures/gazetteer-depth-cases.json`, the same way the grid pair is.

---

## The problem this solves

The gazetteer can produce locations far faster than a campaign can use them. A single marquee adopts
three hundred real buildings in one gesture, and Claude can write a line of purpose for every one of
them in a single pass. That is the point — it is the bulk imagination work the tool exists to make
possible.

It is also the danger. Two failures sit on either side of it:

1. **Under-built.** A location is declared ready to run and turns out, at the table, to be a name and
   a shrug. Nobody finds out until a group is sitting there.
2. **Over-built.** Three paragraphs of atmosphere, a named proprietor and a secret are written for a
   laundry that no player will ever enter. The cost is not the wasted hour; it is that the same hour
   was not spent on the place they *will* come back to five times.

Both are the same underlying gap: **no stated contract for how much a given location is supposed to
be.** Depth is that contract.

## What a location actually is here

Not a polygon with a paragraph. A developed location is a **bundle** that becomes a Foundry scene:

- geometry and a map pin
- lore, at the appropriate depth
- **its own artwork**, so a group returning to a place sees the place they saw before
- **its own playlist**, so arriving somewhere sounds like arriving somewhere
- **its own NPCs**, picked or built for it

Returning to places is encouraged in this campaign, which is exactly why those attachments have to be
*per location* and stable. Depth is what says which locations have earned them — a depth-0 warehouse
needs no playlist, and a depth-3 location without one is incomplete.

## The four depths

| Depth | Name | The question it answers | Typical count |
|---|---|---|---|
| 0 | `named` | What is this building? | hundreds |
| 1 | `sketch` | What is it like to pass through? | dozens |
| 2 | `scene` | Can the whole group play a scene here? | a handful per chapter |
| 3 | `standing` | What is it like to keep coming back? | a few per campaign |

### 0 — `named`

A purpose and nothing else. One line: what the building is and what it is for.

This is the bulk tier, and it is meant to be generated at scale with little ceremony. Its entire job
is that the map stops being anonymous — that a player asking "what's that one?" gets a real answer
instead of improvisation, and that Claude reading the map later knows a district is chandlers and
bootmakers rather than guessing.

A depth-0 entry is finished when it has a name, a kind and one sentence. **It is finished when it is
short.** Writing more is not generosity, it is misallocation — promote it to depth 1 if it deserves
more, or leave it alone.

### 1 — `sketch`

Enough to carry a brief moment of roleplay in passing. A few paragraphs.

What you see and hear on arrival, who is typically here, and one thing that could happen. The group
is not going to spend a session here; they are going to stop, exchange a few lines with somebody, and
move on. Everything needed for that, and nothing beyond it.

NPCs at this depth are usually *types*, not people — "a bored clerk", "the woman who runs the
stall" — written into the prose rather than given their own files.

### 2 — `scene`

Enough to run a full scene here with the whole group.

This is the first depth that costs real work, and the first that earns the scene bundle. It needs
what a scene needs: things to **do**, not just things to look at; at least one NPC substantial enough
to have their own file and be argued with; and a clear statement of what is at stake here and how it
touches the wider story. It needs its own art and its own playlist, because the group is going to be
sitting in it long enough to notice.

If a location cannot answer "what do the players actually *do* here", it is a depth-1 sketch with
ambitions, not a depth-2 scene.

### 3 — `standing`

A place the group returns to across the campaign, accumulating scenes.

Everything depth 2 has, plus the two things that only matter once a place persists:

- **History** — what happened here before the campaign, and what has happened here *during* it. This
  section grows in play. It is the reason a returning group feels continuity rather than déjà vu.
- **Consequence** — how the place changes based on what the players did. A standing location that is
  identical on the fifth visit is a backdrop, not a location.

A recurring cast rather than a single NPC, because the fifth visit needs somebody new to be doing
something while the familiar face is busy.

## The checkable contract

`core/depth.py` / `core/depth.mjs` answer one question: **does this location match what it claims to
be?** The check is deliberately two-sided.

### Required at each depth

Each depth includes everything below it.

| | 0 `named` | 1 `sketch` | 2 `scene` | 3 `standing` |
|---|---|---|---|---|
| `name` | yes | yes | yes | yes |
| `kind` | yes | yes | yes | yes |
| `lore.summary` | yes | yes | yes | yes |
| `lore.playerFacing` | — | yes | yes | yes |
| `lore.gmOnly` | — | — | yes | yes |
| `scene.hooks` | — | ≥ 1 | ≥ 1 | ≥ 1 |
| `scene.activities` | — | — | ≥ 2 | ≥ 3 |
| `npcRefs` | — | — | ≥ 1 | ≥ 2 |
| `assetRefs` (art) | — | — | ≥ 1 | ≥ 1 |
| `playlistRefs` | — | — | ≥ 1 | ≥ 1 |
| `scene.history` | — | — | — | yes |
| `scene.consequences` | — | — | — | yes |

### Ceilings, which matter just as much

A location carries a **word budget** it is not supposed to blow through. Exceeding it is not an error
in the content — the prose may be excellent — it is a signal that the location has outgrown its
declared depth and should either be promoted or trimmed.

| Depth | Summary ceiling | Total prose ceiling |
|---|---|---|
| 0 `named` | 70 words | 70 words |
| 1 `sketch` | 90 words | 250 words |
| 2 `scene` | 150 words | 900 words |
| 3 `standing` | 150 words | no ceiling |

Depth 0's ceiling was set by measurement, not taste, and is worth recording as the worked example of
how to retune the rest. It was first guessed at 40 words. Checked against the 36 entries of the first
real session — the student-housing rows, the fortress-island crossing — the distribution came out at
median 42, p75 49, p90 62, max 88, so a 40-word ceiling flagged **19 of 36**. Those entries are the
ones that *define* the depth-0 standard here, so by the rule at the bottom of this document the
ceiling was wrong, not the entries. At 70 it passes 33 of 36 and still flags the three that genuinely
outgrew the rung — The Roadgate, Transfer Hall, Trackside Casemate — which is the checker working.

Depth 3 has no ceiling on purpose: a place the group returns to for a whole campaign is allowed to
accumulate. Everything below it is capped, because everything below it is a place they will mostly
walk past.

### What the checker reports

Three lists, never a single pass/fail:

- **`missing`** — required by the declared depth and absent. The location is incomplete.
- **`overweight`** — past the depth's ceiling. The location is not *wrong*; it is mis-declared.
  Suggests promoting it.
- **`orphaned`** — present but not required at this depth, and cheap to have written by mistake: a
  playlist on a depth-0 warehouse, a consequences section on a sketch. Suggests the same promotion,
  from the other direction.

`missing` is the one that blocks. The other two are advice, and the tool should say so — a warning
that cannot be ignored becomes a warning that is always ignored.

## Why `depth` and not `tier`

`tier` is already taken, and means something else entirely: `region` / `site` / `point` — the
*geometric* scale of the shape. A district is a region whatever its narrative weight; the Transfer
Hall is a site whether it is a one-line entry or the most-visited location in the campaign.

The two are genuinely independent, and conflating them in either direction would be a real modelling
error. A region can be depth 0 (a named quarter nobody enters) and a point can be depth 3 (a doorway
the group returns to all campaign).

## How this is meant to be used

Depth is a **declaration**, set by hand, not inferred. Ingram decides a place matters; the checker
then says whether the content has caught up with that decision.

That ordering is the whole point. Inferring depth from how much text exists would make the system
descriptive — it would just tell you what you already wrote. Declaring it first makes it a
commission: *this one is going to matter, here is what it therefore owes.*

The working loop becomes:

1. Draw or adopt; batch-theme a cluster.
2. Set depth on each — most stay 0.
3. Claude writes to the declared depth, and the checker says whether it landed.
4. Anything the group turns out to care about gets its depth raised, and the checker immediately
   lists what it now owes.

Step 4 is the one that makes this worth building. A location being promoted from sketch to scene
mid-campaign produces an exact, checkable list of what to go and write — art, playlist, an NPC with a
file, two things to do — rather than a vague sense that it needs more.

## Thresholds are guesses

The required counts are structural and should hold. The **word ceilings are provisional** — they are
first estimates, set before a large enough body of real locations existed to measure. They are in one
place in the code (`DEPTHS` in `core/depth.py`, mirrored in `depth.mjs`) precisely so they can be
retuned in one edit when the corpus is big enough to argue with them.

Retune them against real content, not taste. If two thirds of honestly-written depth-1 sketches trip
the ceiling, the ceiling is wrong, not the sketches.

## What the building will carry — the footprint gate (2026-09-12)

Depth is declared, not inferred. That is still true, and it is what the rest of this document is
about. But a declaration can be wrong in a way the word counts above can never catch: the place may
be too small to hold what is being claimed for it.

The first drawing session made this concrete. Fifty-one adopted footprints ranging from **24 m² to
16,479 m²** were offered the same blank note field and the same invitation to write. One of them is a
bicycle store. Nothing in the tool said so.

`tools/gazetteer/core/shape.py` (mirrored in `shape.mjs`, held together by
`test/fixtures/gazetteer-shape-cases.json`) measures the footprint and reports a **ceiling** on the
depth ladder:

| Total floor area | Carries up to | Reads as |
|---|---|---|
| under 30 m² | `named` | a kiosk, a shed, a store, a shrine box |
| 30–200 m² | `sketch` | a shop, a house, a single hall |
| 200–1,500 m² | `scene` | a real building with several distinct spaces |
| 1,500 m² and up | `standing` | a complex — wings, floors, somewhere you can get lost |

Floor area is footprint × storeys. Storeys come from real tagging where it exists and are **counted
as one where it does not**, which is most of this sheet — the report says so every time rather than
quietly doubling a guess.

One shape fact overrides area: a plan narrower than **6 m** with an aspect ratio past **3:1** is a
wall, a jetty, a canopy or an inspection line, and is capped at `sketch` however much floor it has.
The 334 m × 4.3 m baggage inspection line has 1,430 m² of floor and nowhere inside it to stand six
people in a circle.

Two things this deliberately does not do:

- **It does not gate on the aspect ratio alone.** That was the first version and it was wrong. It
  capped a 13 m wide, 82 m long, three-storey office block at a one-line entry on a 6.3:1 ratio. What
  stops somewhere being a room is not being long, it is being *narrow*. The ratio now only ever
  describes.
- **It does not block anything.** Like `overweight` above, it is advice — a warning that cannot be
  ignored becomes a warning that is always ignored. Occasionally a shrine the size of a wardrobe
  really is the most important place on the map. The point is that this becomes a decision somebody
  makes, instead of an oversight.

Shown in the Gazetteer's inspector under the depth box, for `site` locations only. A region is a
district, not a building; running the same arithmetic over one reported "2,359,871 m² of floor" and
"hundreds of group-sized spaces", which is true, useless, and exactly the sort of confident nonsense
that teaches people to stop reading the box.
